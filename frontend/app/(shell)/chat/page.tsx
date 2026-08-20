// app/chat/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import ChatContainer from "@/components/ChatContainer";
import ChatBubble from "@/components/ChatBubble";
import ChatInput from "@/components/ChatInput";
import TypingDots from "@/components/TypingDots";
import { parseCitationSegments } from "@/lib/parseCitations";

type Citation = {
  number: number;
  id: string;
  title: string;
  source: string;
  snippet?: string;
};

type Msg = {
  role: "user" | "assistant";
  content: string;
  messageId?: string;
  conversationId?: string;
  feedback?: 1 | -1;
  citations?: Citation[];
};

// ガス漏れ関連キーワード
const GAS_LEAK_KEYWORDS = ["ガス漏れ", "ガスもれ", "ガスのにおい", "ガスくさい", "ガス臭", "異臭", "くさい"];
const EMERGENCY_PHONE = "旭川市：0166-45-2800 / 江別市：011-385-7913";

// ====== 会話履歴保持（localStorage） ======
const LS_KEY = "rag_chat_messages_v1";
const LS_SESSION_KEY = "rag_chat_session_v1";

// コスト気にしない前提でも、無限に増えると遅くなるので安全上限だけ入れます（必要なら増やしてOK）
const MAX_STORE_TURNS = 200; // 保存するメッセージ数上限
const MAX_SEND_TURNS = 60; // APIに送る履歴数（/api/chat が履歴対応なら活きる）

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export default function ChatPage() {
  const [tab, setTab] = useState<"test" | "embed">("test");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");

  // UI表示用：API疎通状態
  const [apiStatus, setApiStatus] = useState<"idle" | "connected" | "error">(
    "idle"
  );

  // 自動スクロール
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // 出典チップのホバー吹き出し：スクロール領域内でも上下に見切れないよう、
  // アンカーの画面上の位置から動的に上/下どちらに開くか決めてfixed配置する
  const [citeTooltip, setCiteTooltip] = useState<{ x: number; y: number; openUp: boolean; citation: Citation } | null>(null);
  const showCiteTooltip = (e: React.MouseEvent<HTMLElement>, citation: Citation) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const openUp = rect.top > 110;
    setCiteTooltip({
      x: Math.min(rect.left, window.innerWidth - 232),
      y: openUp ? rect.top - 6 : rect.bottom + 6,
      openUp,
      citation,
    });
  };
  const hideCiteTooltip = () => setCiteTooltip(null);

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const copyMessage = async (index: number, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((cur) => (cur === index ? null : cur)), 1500);
    } catch {
      // クリップボードAPIが使えない環境では何もしない
    }
  };

  // ガス漏れキーワード検知（入力中 OR 直近のユーザーメッセージ）
  const lastUserMsg = messages.filter(m => m.role === "user").at(-1)?.content ?? "";
  const showGasAlert = GAS_LEAK_KEYWORDS.some(kw => input.includes(kw) || lastUserMsg.includes(kw));

  // 初回：localStorage から復元
  useEffect(() => {
    const saved = safeJsonParse<Msg[]>(localStorage.getItem(LS_KEY));
    if (Array.isArray(saved) && saved.length) {
      setMessages(saved);
    }
    // セッションID：既存を再利用 or 新規生成
    const savedSession = localStorage.getItem(LS_SESSION_KEY);
    if (savedSession) {
      setSessionId(savedSession);
    } else {
      const newId = crypto.randomUUID();
      setSessionId(newId);
      localStorage.setItem(LS_SESSION_KEY, newId);
    }
  }, []);

  // messages が変わるたびに保存
  useEffect(() => {
    if (!messages.length) {
      localStorage.removeItem(LS_KEY);
      return;
    }
    const trimmed = messages.slice(-MAX_STORE_TURNS);
    localStorage.setItem(LS_KEY, JSON.stringify(trimmed));
  }, [messages]);

  // messages / thinking が変わったら最下部へ
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  const sendFeedback = async (index: number, value: 1 | -1) => {
    const msg = messages[index];
    if (!msg.messageId || !msg.conversationId) return;
    setMessages((m) => m.map((x, i) => i === index ? { ...x, feedback: value } : x));
    await fetch("/api/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: msg.conversationId, message_id: msg.messageId, value }),
    }).catch(console.error);
  };

  const clearChat = () => {
    if (thinking) return;
    setMessages([]);
    setInput("");
    setApiStatus("idle");
    localStorage.removeItem(LS_KEY);
    // 「クリア」＝新しい会話の開始 → セッションIDを更新
    const newId = crypto.randomUUID();
    setSessionId(newId);
    localStorage.setItem(LS_SESSION_KEY, newId);
  };

  async function sendMessage() {
    const userMessage = input.trim();
    if (!userMessage || thinking) return;

    setInput("");
    setThinking(true);

    // setState の非同期ズレ対策：ここで「確定した履歴」を作る
    const nextMessages: Msg[] = [...messages, { role: "user", content: userMessage }];

    // UIに反映
    setMessages(nextMessages);

    try {
      const url = "/api/chat";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },

        // ✅ 会話履歴保持のために messages も一緒に送る
        // ※ 現状の /api/chat が messages を見ない場合でも害はなく、
        //   もし将来 /api/chat 側を履歴対応にしたらそのまま効くようになります。
        body: JSON.stringify({
          message: userMessage,
          top_k: 8,
          messages: nextMessages.slice(-MAX_SEND_TURNS),
          session_id: sessionId,
        }),
      });

      type ChatApiResponse = { answer?: string; message_id?: string; conversation_id?: string; citations?: Citation[]; error?: string };
      const data = await res.json().catch(() => ({})) as ChatApiResponse;

      if (!res.ok) {
        const msg = data?.error ?? `API error: ${res.status} ${res.statusText}`;
        setApiStatus("error");
        throw new Error(msg);
      }

      setApiStatus("connected");

      const botReply = data?.answer ?? "回答に失敗しました。";

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: botReply,
          messageId: data?.message_id,
          conversationId: data?.conversation_id,
          citations: data?.citations ?? [],
        },
      ]);
    } catch (e: unknown) {
      console.error(e);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `エラー: ${e instanceof Error ? e.message : String(e)}` },
      ]);
    } finally {
      setThinking(false);
    }
  }

  const apiBadge =
    apiStatus === "connected"
      ? "connected"
      : apiStatus === "error"
      ? "error"
      : "ready";

  // 出典番号 [1] を、ホバーでその抜粋だけを吹き出し表示する小さなインラインチップに変換
  const renderCitationChip = (citation: Citation | undefined, number: number, key: string) => {
    if (!citation) return null; // 対応する出典が見つからない場合は何も表示しない（安全側）
    const clickable = citation.source?.startsWith("http");
    const commonProps = {
      "aria-label": citation.title || citation.source,
      className: "inline-flex h-[15px] w-[15px] items-center justify-center rounded-full bg-sky-400 align-super text-[9px] font-extrabold text-white no-underline",
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => showCiteTooltip(e, citation),
      onMouseLeave: hideCiteTooltip,
    };
    return clickable ? (
      <a key={key} href={citation.source} target="_blank" rel="noopener noreferrer" {...commonProps}>
        {number}
      </a>
    ) : (
      <span key={key} {...commonProps}>
        {number}
      </span>
    );
  };

  const renderMessageContent = (content: string, citations?: Citation[]) => {
    if (!citations || citations.length === 0) return content;
    const byNumber = new Map(citations.map((c) => [c.number, c]));
    return parseCitationSegments(content).map((seg, si) =>
      seg.type === "text"
        ? <span key={si}>{seg.value}</span>
        : renderCitationChip(byNumber.get(seg.number), seg.number, String(si))
    );
  };

  // 埋め込みプレビュー：本番の /embed をそのままiframe表示。左メニューを含む
  // 通常レイアウトを画面全体のオーバーレイで覆うだけで、/embed 自体（ログイン不要の
  // 公開ウィジェット）には一切手を加えない。
  if (tab === "embed") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
          <button
            type="button"
            onClick={() => setTab("test")}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground hover:bg-accent"
          >
            ← テストチャットに戻る
          </button>
          <span className="text-sm font-semibold text-foreground">埋め込みプレビュー</span>
        </div>
        <iframe src="/embed" className="min-h-0 flex-1 border-0" title="埋め込みプレビュー" />
      </div>
    );
  }

  return (
    <ChatContainer>
      {/* 出典チップのホバー吹き出し：fixed配置でスクロール領域の上下端でも見切れない
          （アンカー位置からJSで計算し、上に余白が無ければ下向きに開く） */}
      {citeTooltip && (
        <div
          className="pointer-events-none fixed z-50 w-56 max-w-[calc(100vw-16px)] rounded-lg bg-slate-800 p-2 text-[11px] leading-relaxed text-white shadow-xl"
          style={{
            left: citeTooltip.x,
            top: citeTooltip.openUp ? undefined : citeTooltip.y,
            bottom: citeTooltip.openUp ? `calc(100vh - ${citeTooltip.y}px)` : undefined,
          }}
        >
          <span className="mb-0.5 block text-[10px] font-bold opacity-75">
            {citeTooltip.citation.title || citeTooltip.citation.source}
          </span>
          <span>{citeTooltip.citation.snippet || "抜粋を取得できませんでした"}</span>
        </div>
      )}

      {/* 既存コンテナの上に “カード枠” を置く */}
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs text-muted-foreground">RAG Chat</div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">チャット</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
              <button
                type="button"
                onClick={() => setTab("test")}
                className="rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground"
              >
                テストチャット
              </button>
              <button
                type="button"
                onClick={() => setTab("embed")}
                className="rounded-full px-3 py-1 text-muted-foreground hover:bg-accent"
              >
                埋め込みプレビュー
              </button>
            </div>

            <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">
              top_k: 8
            </span>
            <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">
              API: {apiBadge}
            </span>

            <button
              type="button"
              onClick={clearChat}
              disabled={thinking || messages.length === 0}
              className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground disabled:opacity-50"
              title="会話を消去"
            >
              クリア
            </button>
          </div>
        </div>

        {/* Chat panel */}
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">Conversation</div>
              <div className="text-xs text-muted-foreground">
                サイトの情報を根拠に回答します
              </div>
            </div>

            <div className="min-h-[380px] max-h-[60vh] overflow-auto rounded-2xl border border-border bg-muted p-4">
              {messages.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  例：
                  <span className="text-foreground">
                    「旭川ガスとは？」
                  </span>
                </div>
              ) : null}

              <div className="space-y-3">
                {messages.map((m, i) => {
                  return (
                  <div key={i}>
                    <ChatBubble role={m.role}>
                      {m.role === "assistant" ? renderMessageContent(m.content, m.citations) : m.content}
                    </ChatBubble>

                    {m.role === "assistant" && (
                      <div className="flex gap-2 mt-1 ml-1">
                        <button
                          onClick={() => copyMessage(i, m.content)}
                          className={`text-xs px-2 py-1 rounded-lg border transition-colors ${copiedIndex === i ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "border-border bg-card text-muted-foreground hover:bg-accent"}`}
                        >
                          {copiedIndex === i ? "✅ コピーしました" : "📋 コピー"}
                        </button>

                        {m.messageId && (
                          <>
                            <button
                              onClick={() => sendFeedback(i, 1)}
                              disabled={!!m.feedback}
                              className={`text-xs px-2 py-1 rounded-lg border transition-colors ${m.feedback === 1 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "border-border bg-card text-muted-foreground hover:bg-accent"}`}
                            >
                              👍 解決した
                            </button>
                            <button
                              onClick={() => sendFeedback(i, -1)}
                              disabled={!!m.feedback}
                              className={`text-xs px-2 py-1 rounded-lg border transition-colors ${m.feedback === -1 ? "bg-sky-50 border-sky-200 text-sky-700" : "border-border bg-card text-muted-foreground hover:bg-accent"}`}
                            >
                              👎 解決しなかった
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })}

                {thinking && (
                  <ChatBubble role="assistant">
                    <TypingDots />
                  </ChatBubble>
                )}

                <div ref={bottomRef} />
              </div>
            </div>

            {/* Input area */}
            <div className="mt-4 rounded-2xl border border-border bg-muted p-3">
              <ChatInput
                value={input}
                onChange={setInput}
                onSend={sendMessage}
                disabled={thinking}
              />

              {/* ガス漏れ緊急アラート */}
              {showGasAlert && (
                <div className="mt-3 rounded-xl border-2 border-red-500 bg-red-50 p-3 flex items-start gap-3">
                  <span className="text-2xl leading-none">⚠️</span>
                  <div>
                    <p className="text-red-700 font-bold text-sm">⚠️ ガス漏れの疑いがある場合は今すぐご連絡ください</p>
                    <p className="text-red-800 text-base font-bold tracking-wider mt-1">{EMERGENCY_PHONE}</p>
                    <p className="text-red-600 text-xs mt-1">24時間受付 ／ 火気厳禁・窓を開けて換気してください</p>
                  </div>
                </div>
              )}

              <div className="mt-2 text-xs text-muted-foreground">
                Enterで送信／Shift+Enterで改行（実装がある場合）
              </div>

              {/* デバッグ表示（必要なら有効化）
              <div className="mt-1 text-[10px] text-muted-foreground">
                保存: {messages.length} / 送信履歴: {outboundMessages.length}
              </div>
              */}
            </div>
          </div>
        </div>
      </ChatContainer>
  );
}
