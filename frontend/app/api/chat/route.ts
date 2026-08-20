// app/api/chat/route.ts
// 埋め込み: OpenAI text-embedding-3-small
// 回答生成: AI SDK 経由（Google Gemini）
// 対象: asahikawa-gas.co.jp（クライアント設定ファイルで切替可）

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { generateText, type ModelMessage } from "ai";
import type { GoogleGenerativeAIProviderMetadata } from "@ai-sdk/google";
import { createClient } from "@supabase/supabase-js";
import {
  startConversation,
  logUserMessage,
  logAssistantMessage,
  escalateConversation,
} from "@/lib/log";
import { getClientConfig } from "@/lib/getClientConfig";
import { calcComplexityScore, estimateCostJpy, getSmartRoutingThreshold } from "@/lib/smartRouting";
import { applyAutocut } from "@/lib/autocut";
import { fuseHybridResults } from "@/lib/hybridSearch";
import { getSystemPromptTemplate, renderSystemPromptTemplate } from "@/lib/systemPrompt";
import { getEmergencyKeywords } from "@/lib/emergencyKeywords";
import { findProceduralAnswer } from "@/lib/proceduralAnswers";
import { buildModel, getModelId } from "@/lib/aiProvider";
import { decryptSecret } from "@/lib/settingsCrypto";
import type { ConversationMode, ClientConfig, ChatRequest, ChatResponse } from "@/types/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

function mustEnv(name: string): string {
  const v = env(name);
  if (!v) throw new Error(`${name} is missing`);
  return v;
}

type ClientMsg = { role: "user" | "assistant"; content: string };

// リクエストボディ（後方互換のため既存フィールドも残す）
type ChatBody = Partial<ChatRequest> & {
  question?: string;
  message?: string;
  top_k?: number;
  messages?: ClientMsg[];
};

// ---- OpenAI（埋め込みのみ）----
const openai = new OpenAI({ apiKey: mustEnv("OPENAI_API_KEY") });

// ---- Supabase（ベクター検索）----
const SUPABASE_URL = env("SUPABASE_URL") ?? env("NEXT_PUBLIC_SUPABASE_URL") ?? "";
if (!SUPABASE_URL) throw new Error("SUPABASE_URL is missing");

const SUPABASE_KEY =
  env("SUPABASE_SERVER_KEY") ??
  env("SUPABASE_SERVICE_ROLE_KEY") ??
  env("SUPABASE_ANON_KEY") ??
  env("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
  "";
if (!SUPABASE_KEY) throw new Error("SUPABASE key is missing");

console.log("[debug] SUPABASE_URL:", SUPABASE_URL);
console.log("[debug] SUPABASE_KEY prefix:", SUPABASE_KEY.slice(0, 30));

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const RPC_NAME = env("SUPABASE_MATCH_RPC") ?? "match_documents";
const KEYWORD_RPC_NAME = env("SUPABASE_KEYWORD_RPC") ?? "match_documents_keyword";
const MATCH_THRESHOLD = Number(env("SUPABASE_MATCH_THRESHOLD") ?? "0");
const GEMINI_KEY_SETTING = "gemini_api_key";

// 設定画面（/apikey）で保存されたGemini API Keyがあれば復号して返す。
// 未設定・復号失敗時はundefined（buildModel側で環境変数GEMINI_API_KEYにフォールバックする）
async function getCustomGeminiApiKey(): Promise<string | undefined> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", GEMINI_KEY_SETTING)
    .maybeSingle();
  if (!data?.value) return undefined;
  try {
    return decryptSecret(data.value);
  } catch (e) {
    console.warn("[chat] Gemini API Keyの復号に失敗、環境変数にフォールバックします:", e);
    return undefined;
  }
}

// ============================================================
// RAGコア（埋め込み・検索）
// ============================================================

async function embedQuery(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return res.data[0].embedding as unknown as number[];
}

type Retrieved = {
  id: string;
  text: string;
  source: string;
  title: string;
  similarity: number;
  category: string[];
};

function mapRows(
  rows: Record<string, unknown>[],
  sourceUrlMap: Record<string, string>,
  simKey: "similarity" | "keyword_similarity"
): Retrieved[] {
  return rows
    .map((row) => {
      const text = String(
        row.content ?? row.text ?? row.chunk ?? row.body ?? ""
      ).trim();
      const rowId = String(row.id ?? "");
      // || で空文字も無視して source_url フォールバックまで到達させる
      const source = (
        String(row.source || row.url || row.source_url || row.path || "").trim() ||
        sourceUrlMap[rowId] ||
        ""
      );
      const title = String(row.title ?? source).trim();
      const similarity = Number(row[simKey] ?? row.score ?? 0);
      const category = Array.isArray(row.category) ? row.category.map(String) : [];
      return { id: rowId, text, source, title, similarity, category };
    })
    .filter((r) => r.text.length > 0);
}

// モードに応じてcategoryフィルタを切り替え、ベクター検索とキーワード（trigram）検索を
// 並列実行してハイブリッドに統合する
async function searchSupabase(
  query: string,
  topK: number,
  mode: ConversationMode
): Promise<Retrieved[]> {
  const qEmb = await embedQuery(query);

  const vectorArgs: Record<string, unknown> = {
    query_embedding: qEmb,
    match_count: topK,
  };
  if (MATCH_THRESHOLD > 0) vectorArgs.match_threshold = MATCH_THRESHOLD;

  const keywordArgs: Record<string, unknown> = {
    query_text: query,
    match_count: topK,
  };

  // emergencyモードは緊急カテゴリのドキュメントのみ検索
  if (mode === "emergency") {
    vectorArgs.filter_category = "emergency";
    keywordArgs.filter_category = "emergency";
  }

  const [vectorRes, keywordRes] = await Promise.all([
    supabase.rpc(RPC_NAME, vectorArgs),
    supabase.rpc(KEYWORD_RPC_NAME, keywordArgs),
  ]);

  if (vectorRes.error) throw new Error(`supabase.rpc(${RPC_NAME}) failed: ${vectorRes.error.message}`);

  // キーワードRPC（match_documents_keyword）はマイグレーション未適用でも
  // チャット自体が壊れないよう、失敗時はベクター検索のみにフォールバックする
  if (keywordRes.error) {
    console.warn(`[hybrid] ${KEYWORD_RPC_NAME} failed, falling back to vector-only:`, keywordRes.error.message);
  }

  const vectorRows = (vectorRes.data ?? []) as Record<string, unknown>[];
  const keywordRows = keywordRes.error ? [] : ((keywordRes.data ?? []) as Record<string, unknown>[]);

  // RPC が source_url を返さない場合、documents テーブルから補完する（両方の結果の和集合で1回）
  const ids = [
    ...new Set(
      [...vectorRows, ...keywordRows].map((r) => String(r.id ?? "")).filter(Boolean)
    ),
  ];
  let sourceUrlMap: Record<string, string> = {};
  if (ids.length > 0) {
    const { data: docData } = await supabase
      .from("documents")
      .select("id, url, source_url")
      .in("id", ids);
    sourceUrlMap = Object.fromEntries(
      (docData ?? []).map((d) => [String(d.id), String(d.url || d.source_url || "")])
    );
  }

  const vectorRetrieved = mapRows(vectorRows, sourceUrlMap, "similarity");
  const keywordRetrieved = mapRows(keywordRows, sourceUrlMap, "keyword_similarity");

  return fuseHybridResults(vectorRetrieved, keywordRetrieved).slice(0, topK);
}

// 出典ホバー表示用：チャンク本文から先頭の一部だけを抜粋する（改行・連続空白を整形）
function makeSnippet(text: string, maxChars = 220): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > maxChars ? flat.slice(0, maxChars).trim() + "…" : flat;
}

function charBigrams(s: string): Set<string> {
  const clean = s.replace(/\s+/g, "");
  const grams = new Set<string>();
  for (let i = 0; i < clean.length - 1; i++) grams.add(clean.slice(i, i + 2));
  return grams;
}

// 回答本文中で[n]の直前にある一文（根拠として引用した箇所）を、文末記号ベースで抜き出す
function extractCitedSentence(answer: string, markerIndex: number): string {
  const before = answer.slice(0, markerIndex);
  const boundary = Math.max(
    before.lastIndexOf("。"),
    before.lastIndexOf("！"),
    before.lastIndexOf("？"),
    before.lastIndexOf("\n")
  );
  return before.slice(boundary + 1);
}

// 出典チャンク（1〜2500字程度と長く、複数の異なる話題を含みうる）の中から、
// 引用元の一文と文字bigramの重なりが最も大きい窓を抜粋として選ぶ。
// これにより、同じ資料が複数箇所で引用されても、箇所ごとに文脈に合った抜粋を表示できる
// （常に先頭220字だけを返すと、後半にある話題を引用した箇所では無関係な冒頭が表示されてしまうため）
function bestSnippetWindow(
  sourceText: string,
  citedSentence: string,
  windowSize = 220,
  step = 40
): string {
  const flat = sourceText.replace(/\s+/g, " ").trim();
  if (flat.length <= windowSize) return flat;

  const targetGrams = charBigrams(citedSentence);
  if (targetGrams.size === 0) return makeSnippet(sourceText, windowSize);

  let bestStart = 0;
  let bestScore = -1;
  const scoreAt = (start: number) => {
    const windowGrams = charBigrams(flat.slice(start, start + windowSize));
    let score = 0;
    for (const g of windowGrams) if (targetGrams.has(g)) score++;
    return score;
  };
  for (let start = 0; start + windowSize <= flat.length; start += step) {
    const score = scoreAt(start);
    if (score > bestScore) {
      bestScore = score;
      bestStart = start;
    }
  }
  // 末尾が候補から漏れないよう、最後の窓も明示的に評価する
  const lastStart = flat.length - windowSize;
  if (lastStart > bestStart) {
    const score = scoreAt(lastStart);
    if (score > bestScore) {
      bestScore = score;
      bestStart = lastStart;
    }
  }

  if (bestScore <= 0) return makeSnippet(sourceText, windowSize); // マッチが無ければ先頭にフォールバック

  const prefix = bestStart > 0 ? "…" : "";
  const suffix = bestStart + windowSize < flat.length ? "…" : "";
  return prefix + flat.slice(bestStart, bestStart + windowSize).trim() + suffix;
}

function lastUserFromHistory(body: ChatBody): string {
  const direct = String(body.message ?? body.question ?? "").trim();
  if (direct) return direct;
  if (Array.isArray(body.messages) && body.messages.length) {
    const lastUser = [...body.messages].reverse().find((m) => m?.role === "user");
    return String(lastUser?.content ?? "").trim();
  }
  return "";
}

function normalizeHistory(body: ChatBody, maxTurns = 60): ClientMsg[] {
  const raw = Array.isArray(body.messages) ? body.messages : [];
  return raw
    .filter((m) => m && (m.role === "user" || m.role === "assistant"))
    .map((m) => ({ role: m.role, content: String(m.content ?? "").slice(0, 4000) }))
    .filter((m) => m.content.trim().length > 0)
    .slice(-maxTurns);
}

// ============================================================
// システムプロンプト生成（クライアント設定・モード対応）
// ============================================================

function buildSystemPrompt(
  promptTemplate: string,
  categoryId: string | null,
  mode: ConversationMode,
  config: ClientConfig,
  proceduralSummary?: string
): string {
  const base = renderSystemPromptTemplate(promptTemplate, {
    clientId: config.clientId,
    phone: config.phoneNumbers.normal,
    businessHours: config.businessHours,
  });

  const categoryContext = categoryId
    ? `\nこのユーザーは「${categoryId}」に関心があります。`
    : "";

  const emergencyContext =
    mode === "emergency"
      ? `\n\n【緊急事態対応モード】
現在、緊急事態が発生している可能性があります。
避難・安全確保に関する情報を最優先で案内してください。
緊急連絡先：${config.phoneNumbers.emergency}（24時間対応）`
      : mode === "notice"
      ? `\n\n【注意報モード】
現在、注意報が発令されています。
通常の案内に加え、安全に関する情報も合わせて案内してください。`
      : "";

  // 開栓・閉栓・名義変更など定型手続きの質問は、スクレイピング資料のノイズで
  // 誤った資料が引用されやすい（例: 新規開栓をお客さま自身での操作と誤案内してしまう）ため、
  // 正確な要約を資料より優先する指示として注入する。この要約はRAGの「資料」には含めず、
  // 文中の[n]引用番号の対象にはしない（既存の引用チップ表示の仕組みと衝突させないため）
  const proceduralStr = proceduralSummary
    ? `\n\n【正確な手続き情報（資料より優先してください。引用番号[n]は付けないでください）】\n${proceduralSummary}`
    : "";

  return base + categoryContext + emergencyContext + proceduralStr;
}

// ============================================================
// AI SDKメッセージ構築
// ============================================================

function buildAiMessages(opts: {
  question: string;
  history: ClientMsg[];
  contexts: { text: string; source: string }[];
}): ModelMessage[] {
  const { question, history, contexts } = opts;

  // 資料に [1] [2] ... の番号を振り、回答本文中で文末に番号を引用させる
  // （NotebookLM風のインライン出典表示のため。フロント側はこの番号をパースしてチップ化する）
  const ragContext = contexts.length > 0
    ? contexts.map((c, i) => `[${i + 1}] source: ${c.source}\n${c.text}`.trim()).join("\n\n")
    : "(資料なし)";

  const citationInstruction = contexts.length > 0
    ? `\n\n# 出典の示し方（重要・必ず守ってください）\n上記の資料の内容を回答に使ったときは、その情報の根拠となった一文の末尾（句点「。」の直前）に [1] のように資料番号を付けてください。複数の資料を参照した一文には [1][2] のように連続して付けてください。資料を使っていない一般的な挨拶・案内文には付けないでください。番号は上記の資料に実在する番号だけを使い、存在しない番号や資料が無いのに番号を付けることはしないでください。\n特に重要: 番号は必ず「その一文の内容が実際に書かれている資料」の番号にしてください。番号が近い・なんとなく関連しそうという理由だけで推測して付けるのは禁止です。どの資料番号が正しいか自信が持てない場合は、番号を付けずに文章だけを書いてください（誤った番号を付けるより、番号なしの方が良いです）。`
    : "";

  const historyMessages: ModelMessage[] = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const lastUserMessage: ModelMessage = {
    role: "user",
    content: `# 資料\n${ragContext}${citationInstruction}\n\n# 今回の質問\n${question}\n\n# 回答（日本語）\n`,
  };

  return [...historyMessages, lastUserMessage];
}

// ============================================================
// POST /api/chat
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatBody;

    const q = lastUserFromHistory(body);
    if (!q) {
      return NextResponse.json(
        { error: "message (or question) is required" },
        { status: 400 }
      );
    }

    const topK = Math.max(1, Math.min(Number(body.top_k ?? 20), 60));
    const clientId = body.client_id ?? env("NEXT_PUBLIC_CLIENT_ID") ?? "asahikawa-gas";
    const mode: ConversationMode = body.mode ?? "normal";
    const sessionId = body.session_id ?? crypto.randomUUID();

    // ── クライアント設定取得 ──────────────────────────────────
    const config = await getClientConfig(clientId);

    // ── 1) RAG検索（モードによってカテゴリフィルタを切替）────
    const rawRetrieved = await searchSupabase(q, topK, mode);
    // 外れ値除外（オートカット）: 類似度スコアの大きなギャップでノイズの多い末尾チャンクを打ち切る
    const retrieved = applyAutocut(rawRetrieved);
    if (retrieved.length !== rawRetrieved.length) {
      console.log(
        `[Autocut] ${rawRetrieved.length} → ${retrieved.length} chunks (top1 sim=${rawRetrieved[0]?.similarity.toFixed(3)})`
      );
    }

    // ── 2) 会話履歴 ──────────────────────────────────────────
    const history = normalizeHistory(body, 60);
    const sessionTurns = Math.floor(history.length / 2) + 1;

    // ── 3) エスカレーション判定（設定画面で上書き可能なキーワードを使用）──
    const emergencyKeywords = await getEmergencyKeywords(config.emergencyKeywords);
    // ★ 複数の緊急ワードが同時にマッチする場合、最も長い（＝より具体的な）ものを優先する。
    // 短い一般的なキーワードが無関係な文脈でも一致してしまう誤判定を減らすため
    const matchedKeyword =
      emergencyKeywords
        .filter((kw) => q.includes(kw))
        .sort((a, b) => b.length - a.length)[0] ?? null;
    const confidenceScore = retrieved.length > 0 ? retrieved[0].similarity : 0;
    const isLowConfidence = confidenceScore < 0.5 && retrieved.length > 0;

    // ── カテゴリ自動判定 ──────────────────────────────────────
    // 緊急キーワードにマッチ → キーワード名をそのままカテゴリに（例: "ガス漏れ"）
    // それ以外 → topicKeywords でトピック分類（例: "料金・請求"）
    // どれにも該当しない → "その他"
    // ★ topicKeywordsも同様に、最も長い（＝より具体的な）キーワードでマッチした
    // トピックを優先する（例: "機器"より"ガス機器"の方が優先される）
    let autoCategory: string;
    if (matchedKeyword) {
      autoCategory = matchedKeyword;
    } else {
      let bestTopicLabel: string | null = null;
      let bestMatchLen = 0;
      for (const t of config.topicKeywords) {
        for (const kw of t.keywords) {
          if (kw.length > bestMatchLen && q.includes(kw)) {
            bestTopicLabel = t.label;
            bestMatchLen = kw.length;
          }
        }
      }
      autoCategory = bestTopicLabel ?? "その他";
    }
    // クライアントからのcategory_idが文字化け（不正なバイト列がU+FFFDに置換された状態）の場合は
    // ダッシュボードに文字化けカテゴリが表示されないよう、自動判定側にフォールバックする
    const isCorrupted = typeof body.category_id === "string" && body.category_id.includes("�");
    const categoryId = !isCorrupted && body.category_id ? body.category_id : autoCategory;

    // ── 4) システムプロンプト生成 ─────────────────────────────
    const promptTemplate = await getSystemPromptTemplate();
    // 自由入力の質問が「開栓」「閉栓」「名義変更」などの定型手続きに該当する場合、
    // 正確な要約をシステムプロンプトに注入する
    const matchedProcedural = findProceduralAnswer(q);
    const systemPrompt = buildSystemPrompt(promptTemplate, categoryId, mode, config, matchedProcedural?.summary);

    // ── 5) スマートルーティング ───────────────────────────────
    const complexityScore = calcComplexityScore(q, retrieved, sessionTurns);
    const routingThreshold = await getSmartRoutingThreshold();
    const tier = complexityScore > routingThreshold ? "smart" : "fast";
    const customApiKey = await getCustomGeminiApiKey();
    const model = buildModel(tier, customApiKey);
    const modelId = getModelId(tier);

    // ── 6) 回答生成（AI SDK・Gemini）──────────────────────────
    const aiMessages = buildAiMessages({
      question: q,
      history,
      contexts: retrieved.map((r) => ({ text: r.text, source: r.source })),
    });

    const startMs = Date.now();
    const { text: rawAnswer, usage, providerMetadata } = await generateText({
      model,
      system: systemPrompt,
      messages: aiMessages,
      maxOutputTokens: 2048,
      // Gemini 2.5系はThinkingモデルのためbudget=0で無効化（textを正常取得するため）
      providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
    });
    const responseMs = Date.now() - startMs;

    // ── コスト推計 ─────────────────────────────────────────────
    // Gemini の暗黙キャッシュ利用状況（Google側で自動キャッシュされた場合のみ値が入る）
    const googleMetadata = providerMetadata?.google as GoogleGenerativeAIProviderMetadata | undefined;
    const cacheReadTokens = googleMetadata?.usageMetadata?.cachedContentTokenCount ?? 0;
    const cacheHit = cacheReadTokens > 0;
    const estimatedCostJpy = estimateCostJpy(
      modelId,
      usage.inputTokens ?? 0,
      usage.outputTokens ?? 0,
      cacheReadTokens,
    );

    console.log(`[SmartRouting] complexity_score: ${complexityScore.toFixed(2)}, model: ${modelId}`);
    console.log(`[Cost] estimated_cost_jpy: ${estimatedCostJpy}`);
    console.log(`[DEBUG] rawAnswer length: ${rawAnswer.length}, preview: "${rawAnswer.slice(0, 100)}"`);

    // 資料番号は1〜retrieved.lengthのみ有効。モデルが存在しない番号を幻覚した場合はマーカーごと除去する
    const maxCitationNumber = retrieved.length;
    const answer = rawAnswer
      .replace(/\[#\d+\]/g, "")
      .replace(/\[(\d+)\]/g, (full, numStr: string) => {
        const n = Number(numStr);
        return n >= 1 && n <= maxCitationNumber ? full : "";
      })
      .replace(/[^\S\n]{2,}/g, " ") // 改行以外の連続空白（スペース・タブ）だけを1個に整形
      .replace(/\n{3,}/g, "\n\n")   // 3行以上の空行は2行までに圧縮
      .trim();

    // 回答本文で実際に引用された箇所ごとに出典を返す（インライン表示用）。
    // 同じ資料番号が複数箇所で引用されることがあるため、資料番号でまとめず出現順（occurrence）で1件ずつ作る。
    // これにより、資料本文が長く複数の話題を含む場合でも、引用箇所ごとに文脈に合った抜粋を表示できる
    const citations = Array.from(answer.matchAll(/\[(\d+)\]/g))
      .map((m, occurrence) => {
        const n = Number(m[1]);
        const r = retrieved[n - 1];
        if (!r) return null;
        const citedSentence = extractCitedSentence(answer, m.index ?? 0);
        return {
          occurrence,
          number: n,
          id: r.id,
          title: r.title,
          source: r.source,
          snippet: bestSnippetWindow(r.text, citedSentence),
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    // ── 7) ログ書き込み ───────────────────────────────────────
    let conversationId = body.conversation_id ?? null;
    let messageId = "";

    try {
      if (!conversationId) {
        conversationId = await startConversation({
          sessionId,
          clientId,
          categoryId,
          mode,
        });
      }

      await logUserMessage({ conversationId, content: q, inputMethod: body.input_method ?? "text" });

      if (matchedKeyword) {
        await escalateConversation({ conversationId, escalateType: "keyword" });
      }

      messageId = await logAssistantMessage({
        conversationId,
        content: answer,
        confidenceScore,
        keywordMatched: matchedKeyword,
        retrievedDocIds: rawRetrieved.map((r) => r.id).filter(Boolean),
        retrievedDocTitles: rawRetrieved.map((r) => r.title),
        retrievedDocSources: rawRetrieved.map((r) => r.source),
        responseMs,
        unresolved: isLowConfidence && !matchedKeyword,
        modelUsed: modelId,
        complexityScore,
        cacheHit,
        cacheReadTokens,
        estimatedCostJpy,
      });
    } catch (logErr) {
      console.error("[log] failed:", logErr);
    }

    // ── 8) レスポンス ─────────────────────────────────────────
    const response: ChatResponse = {
      message_id: messageId,
      conversation_id: conversationId ?? "",
      answer,
      confidence_score: confidenceScore,
      // 回答本文中の [1][2]... に対応する出典（インライン表示用。文中で実際に引用された分のみ）
      citations,
      escalated: !!matchedKeyword,
      keyword_matched: matchedKeyword,
      response_ms: responseMs,
    };

    return NextResponse.json({
      ...response,
      form_urls: config.formUrls ?? [],
      // デバッグ用メタ情報
      meta: {
        top_k: topK,
        rpc: RPC_NAME,
        hits: retrieved.length,
        raw_hits: rawRetrieved.length,
        mode,
        client_id: clientId,
        provider: "google",
        model: modelId,
        complexity_score: complexityScore,
        cache_hit: cacheHit,
        cache_read_tokens: cacheReadTokens,
        estimated_cost_jpy: estimatedCostJpy,
      },
    });
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string };
    const msg = `${err?.name ?? "Error"}: ${err?.message ?? String(e)}`;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
