"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CATEGORY_SCENARIOS,
  SCENARIOS,
  type ScenarioChoice,
} from "@/lib/scenarios";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import type { InputMethod } from "@/types/log";
import { parseCitationSegments } from "@/lib/parseCitations";

type Citation = {
  number: number;
  id: string;
  title: string;
  source: string;
  snippet?: string;
};

type FormUrl = {
  label: string;
  url: string;
};

type Msg = {
  role: "user" | "assistant";
  content: string;
  messageId?: string;
  conversationId?: string;
  feedback?: 1 | -1;
  citations?: Citation[];
  formUrls?: FormUrl[];
  noFeedback?: boolean;
};

type ChatApiResponse = {
  answer?: string;
  message_id?: string;
  conversation_id?: string;
  citations?: Citation[];
  form_urls?: FormUrl[];
  error?: string;
};

// ガス漏れ関連キーワード
const GAS_LEAK_KEYWORDS = ["ガス漏れ", "ガスもれ", "ガスのにおい", "ガスくさい", "ガス臭", "異臭", "くさい"];

type Props = {
  /** 最初から開いた状態にしたい場合 true（iframe内で常時表示など） */
  defaultOpen?: boolean;
  /** タイトル表示 */
  title?: string;
};

export default function ChatWidget({
  defaultOpen = false,
  title = "旭川ガス　個人サポート",
}: Props) {
  // ===== Theme（ロボット色味に合わせた）=====
  const THEME = {
    // ロボット外枠系のシアン（少しだけ幅を持たせる）
    brand1: "#2EC5F4",
    brand2: "#38BDF8",
    // ロボットの顔面（濃いネイビー）
    ink: "#1F2933",
    // 背景
    bg: "#FFFFFF",
    // 罫線
    line: "rgba(0,0,0,0.10)",
    // 影
    shadow: "0 18px 40px rgba(0,0,0,0.22)",
    // ユーザー吹き出し背景（ブランド）
    userGrad: "linear-gradient(135deg, #2EC5F4, #38BDF8)",
    // Bot吹き出し背景（薄いブランド）
    botBg: "rgba(46,197,244,0.08)",
    // Bot吹き出し枠
    botBorder: "rgba(46,197,244,0.25)",
  } as const;

  const THEME_PHONE = "0166-23-4151（旭川市・平日 9:00〜17:00）\n011-382-4211（江別地区・平日 9:00〜17:00）";

  const CATEGORIES = [
    { icon: "🏠", label: "ご家庭のお客様",   id: "家庭用",     fullWidth: false },
    { icon: "🏢", label: "業務用のお客様",   id: "業務用",     fullWidth: false },
    { icon: "⚙️", label: "ガスの開栓・閉栓", id: "手続き・契約", fullWidth: false },
    { icon: "🔧", label: "ガス機器",         id: "ガス機器",   fullWidth: false },
    { icon: "👥", label: "会社・採用",       id: "会社・採用", fullWidth: true  },
  ];

  const TERMS = [
    "本サービスは、生成AIを活用しており、旭川ガスが用意した情報に基づき、生成AIが自動で質問にお答えするサービスです。ガスのご利用・お手続き・料金・安全に関する情報の確認や調べ物のサポートとして、適切にご利用ください。",
    "質問によっては誤った回答が表示される場合がございます。回答の際に参考情報のリンク先が表示される場合は、あわせてご確認いただき、正確な情報かどうかをご判断ください。",
    "本サービスは生成AIを活用した機能のため、13歳未満のご利用はお控えください。また、18歳未満の方は保護者の許可を得てご利用ください。",
    "本サービスにおいて入力されたデータの内容は回答用の学習データとしては利用いたしません。入力した情報が他の利用者への回答に利用されることはありませんのでご安心ください。ただし、個人情報（氏名、住所、電話番号、お客様番号など）は入力しないでください。",
    "サービスの改善や回答精度の向上のため、Cookieを利用しています。お使いのブラウザの設定によっては、正常に表示・利用できない場合があります。",
    "入力された質問や回答に関するフィードバックは、適宜分析を行い、回答精度の向上を図っていきますので、ご理解とご協力をお願いします。",
  ];

  // 設定画面（チャットアイコン設定）で変更されたアイコン・タイトルを取得（未設定時はデフォルトのまま）
  const [iconUrl, setIconUrl] = useState("/asahikawagus_chatoboto.png");
  const [widgetTitle, setWidgetTitle] = useState(title);
  useEffect(() => {
    fetch("/api/chat-config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.iconUrl) setIconUrl(data.iconUrl);
        if (data.title) setWidgetTitle(data.title);
      })
      .catch(() => {});
  }, []);

  const [open, setOpen] = useState(defaultOpen);
  const [agreed, setAgreed] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [formUrls, setFormUrls] = useState<FormUrl[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  // 出典チップのホバー吹き出し：スクロール領域内でも上下に見切れないよう、
  // アンカーの画面上の位置から動的に上/下どちらに開くか決めてfixed配置する
  const [citeTooltip, setCiteTooltip] = useState<{ x: number; y: number; openUp: boolean; citation: Citation } | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const showCiteTooltip = (e: React.MouseEvent<HTMLElement>, citation: Citation) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const openUp = rect.top > 110; // 上に十分な余白があれば上向き、なければ下向き
    setCiteTooltip({
      x: Math.min(rect.left, window.innerWidth - 228),
      y: openUp ? rect.top - 6 : rect.bottom + 6,
      openUp,
      citation,
    });
  };
  const hideCiteTooltip = () => setCiteTooltip(null);

  const copyMessage = async (index: number, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((cur) => (cur === index ? null : cur)), 1500);
    } catch {
      // クリップボードAPIが使えない環境では何もしない
    }
  };

  // ── シナリオエンジン ──────────────────────────
  const [scenarioSelectorCategory, setScenarioSelectorCategory] = useState<string | null>(null);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);

  const activeScenario = activeScenarioId ? (SCENARIOS[activeScenarioId] ?? null) : null;
  const currentNode = activeScenario && currentNodeId ? (activeScenario.nodes[currentNodeId] ?? null) : null;

  // ガス漏れキーワード検知（入力中 OR 直近のユーザーメッセージ）
  const lastUserMsg = messages.filter(m => m.role === "user").at(-1)?.content ?? "";
  const showGasAlert = agreed && GAS_LEAK_KEYWORDS.some(kw => input.includes(kw) || lastUserMsg.includes(kw));

  // open時/更新時に最下部へ
  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages, thinking]);

  // ── シナリオ操作 ──────────────────────────────
  const startScenario = (scenarioId: string) => {
    const s = SCENARIOS[scenarioId];
    if (!s) return;
    const firstNode = s.nodes[s.entryNodeId];
    setActiveScenarioId(scenarioId);
    setCurrentNodeId(s.entryNodeId);
    setScenarioSelectorCategory(null);
    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        content: firstNode.content,
        noFeedback: true,
        formUrls: firstNode.formUrls,
      },
    ]);
  };

  const advanceScenario = (choice: ScenarioChoice) => {
    if (!activeScenario) return;
    const nextNode = activeScenario.nodes[choice.nextNodeId];
    if (!nextNode) return;
    setCurrentNodeId(choice.nextNodeId);
    setMessages((m) => [
      ...m,
      { role: "user", content: choice.label, noFeedback: true },
      {
        role: "assistant",
        content: nextNode.content,
        noFeedback: true,
        formUrls: nextNode.formUrls,
      },
    ]);
    if (nextNode.type === "end") {
      setActiveScenarioId(null);
      setCurrentNodeId(null);
    }
  };

  const advanceToNextNode = (nextNodeId: string) => {
    if (!activeScenario) return;
    const nextNode = activeScenario.nodes[nextNodeId];
    if (!nextNode) return;
    setCurrentNodeId(nextNodeId);
    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        content: nextNode.content,
        noFeedback: true,
        formUrls: nextNode.formUrls,
      },
    ]);
    if (nextNode.type === "end") {
      setActiveScenarioId(null);
      setCurrentNodeId(null);
    }
  };

  const exitScenarioToFreeChat = () => {
    setActiveScenarioId(null);
    setCurrentNodeId(null);
    setScenarioSelectorCategory(null);
    setMessages((m) => [
      ...m,
      { role: "assistant", content: "ご質問をテキストで入力してください。", noFeedback: true },
    ]);
  };

  const backToScenarioSelector = () => {
    setActiveScenarioId(null);
    setCurrentNodeId(null);
    if (categoryId && CATEGORY_SCENARIOS[categoryId]) {
      setScenarioSelectorCategory(categoryId);
    }
  };

  const sendFeedback = async (index: number, value: 1 | -1) => {
    const msg = messages[index];
    setMessages((m) => m.map((x, i) => i === index ? { ...x, feedback: value } : x));

    // APIログはmessageIdがある場合のみ
    if (msg.messageId && msg.conversationId) {
      await fetch("/api/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: msg.conversationId, message_id: msg.messageId, value }),
      }).catch(console.error);
    }

    if (value !== -1) return;

    const newCount = unresolvedCount + 1;
    setUnresolvedCount(newCount);

    // 2回目：フォームURLをボタンで案内
    if (newCount === 2 && formUrls.length > 0) {
      setMessages((m) => [...m, {
        role: "assistant",
        content: "お役に立てず申し訳ありません。こちらのフォームからもお手続きいただけます。",
        formUrls,
      }]);
    }

    // 3回目以上：電話番号を案内（以降はフィードバック不要）
    if (newCount >= 3) {
      setMessages((m) => [...m, {
        role: "assistant",
        content: `引き続きご不便をおかけして申し訳ありません。\nお電話でお問い合わせください。\n\n${THEME_PHONE}`,
        noFeedback: true,
      }]);
    }
  };

  const selectCategory = async (cat: typeof CATEGORIES[number]) => {
    setCategoryId(cat.id);
    const userMsg = `【${cat.label}】について質問します`;

    // シナリオが定義されているカテゴリはシナリオ選択画面へ
    if (CATEGORY_SCENARIOS[cat.id]?.length) {
      setMessages([{ role: "user", content: userMsg }]);
      setScenarioSelectorCategory(cat.id);
      setActiveScenarioId(null);
      setCurrentNodeId(null);
      return;
    }

    const nextMessages: Msg[] = [{ role: "user", content: userMsg }];
    setMessages(nextMessages);
    setThinking(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          top_k: 8,
          messages: nextMessages,
          session_id: sessionId,
          category_id: cat.id,
          mode: "normal",
        }),
      });
      const data = await res.json().catch(() => ({})) as ChatApiResponse;
      const answer = data?.answer ?? "ご質問をどうぞ。";
      if (data?.form_urls?.length) setFormUrls(data.form_urls);
      setMessages((m) => [...m, {
        role: "assistant", content: String(answer),
        messageId: data?.message_id, conversationId: data?.conversation_id,
        citations: data?.citations ?? [],
      }]);
    } catch (e: unknown) {
      setMessages((m) => [...m, { role: "assistant", content: `エラー：${e instanceof Error ? e.message : String(e)}` }]);
    } finally {
      setThinking(false);
    }
  };

  const send = async (overrideQ?: string, inputMethod: InputMethod = "text") => {
    const q = (overrideQ ?? input).trim();
    if (!q || thinking) return;

    // シナリオ選択画面中にテキスト入力 → フリーチャットへ切り替え
    if (scenarioSelectorCategory) {
      setScenarioSelectorCategory(null);
    }

    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setThinking(true);

    // 送信時点のシナリオ文脈を確定（state 更新前のクロージャ値を使用）
    const scenarioCtx = currentNode?.context ?? undefined;

    try {
      const nextMessages: Msg[] = [...messages, { role: "user", content: q }];

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: q,
          top_k: 8,
          messages: nextMessages,
          session_id: sessionId,
          category_id: categoryId,
          mode: "normal",
          scenario_context: scenarioCtx,
          input_method: inputMethod,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`API error: ${res.status}\n${text}`);
      }

      const data = await res.json().catch(() => ({})) as ChatApiResponse;
      const answer = data?.answer ?? "回答に失敗しました。";
      if (data?.form_urls?.length) setFormUrls(data.form_urls);

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: String(answer),
          messageId: data?.message_id,
          conversationId: data?.conversation_id,
          citations: data?.citations ?? [],
        },
      ]);
    } catch (e: unknown) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `エラー：${e instanceof Error ? e.message : String(e)}` },
      ]);
    } finally {
      setThinking(false);
    }
  };

  // 音声認識完了時：認識テキストで即送信する
  const handleTranscribed = useCallback((text: string, method: InputMethod) => {
    void send(text, method);
  }, [send]);

  // ===== 共通スタイル（必要に応じて調整）=====
  const Z = 999999;

  const widgetBox: React.CSSProperties = {
    position: "fixed",
    right: 16,
    bottom: 16,
    width: 420,
    height: 620,
    maxWidth: "100vw",
    maxHeight: "100vh",
    borderRadius: 18,
    border: `1px solid ${THEME.line}`,
    background: THEME.bg,
    boxShadow: THEME.shadow,
    overflow: "hidden",
    zIndex: Z,
    display: "flex",
    flexDirection: "column",
    transition: "all 300ms ease",
  };

  const header: React.CSSProperties = {
    height: 54,
    padding: "0 12px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
    color: "#fff",
    background: `linear-gradient(135deg, ${THEME.brand1}, ${THEME.brand2})`,
    borderBottom: `1px solid rgba(255,255,255,0.25)`,
  };

  const headerTitle: React.CSSProperties = {
    fontWeight: 800,
    fontSize: 14,
    letterSpacing: "0.02em",
    textShadow: "0 1px 0 rgba(0,0,0,0.10)",
  };

  const headerBtn: React.CSSProperties = {
    fontSize: 12,
    padding: "6px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.55)",
    background: "rgba(255,255,255,0.14)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  };

  const body: React.CSSProperties = {
    flex: 1,
    padding: 12,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    // うっすら背景
    background:
      "radial-gradient(1000px 400px at 100% 0%, rgba(46,197,244,0.12), transparent 60%), #fff",
  };

  const inputBar: React.CSSProperties = {
    padding: 10,
    borderTop: `1px solid ${THEME.line}`,
    display: "flex",
    gap: 8,
    flexShrink: 0,
    background: "#fff",
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    height: 40,
    padding: "0 12px",
    borderRadius: 14,
    border: `1px solid rgba(46,197,244,0.40)`,
    outline: "none",
    fontSize: 14,
    color: THEME.ink,
    boxShadow: "inset 0 1px 0 rgba(0,0,0,0.03)",
  };

  const sendBtn = (disabled: boolean): React.CSSProperties => ({
    height: 40,
    padding: "0 14px",
    borderRadius: 14,
    border: "0",
    background: disabled
      ? "rgba(46,197,244,0.45)"
      : `linear-gradient(135deg, ${THEME.brand1}, ${THEME.brand2})`,
    color: "#fff",
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    boxShadow: disabled ? "none" : "0 10px 22px rgba(46,197,244,0.35)",
  });

  const bubbleBase: React.CSSProperties = {
    maxWidth: "88%",
    padding: "10px 12px",
    borderRadius: 16,
    fontSize: 13,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  };

  const userBubble: React.CSSProperties = {
    ...bubbleBase,
    alignSelf: "flex-end",
    color: "#fff",
    background: THEME.userGrad,
    boxShadow: "0 10px 22px rgba(46,197,244,0.25)",
  };

  const botBubble: React.CSSProperties = {
    ...bubbleBase,
    alignSelf: "flex-start",
    color: THEME.ink,
    background: THEME.botBg,
    border: `1px solid ${THEME.botBorder}`,
  };

  // =========================
  // ロボットボタン（閉じている状態）
  // 「白背景＋水色の円枠＋中央に画像」デザイン
  // =========================
  const fabBtn: React.CSSProperties = {
    position: "fixed",
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "#ffffff",
    border: `3px solid ${THEME.brand1}`,
    boxShadow: "0 12px 30px rgba(46,197,244,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: Z,
    padding: 0,
  };

  // 画像の「■感」を減らすための保険（角を丸く）。
  // imgはobjectFit:"cover"で円を隙間なく埋める（正方形以外の画像でも中央基準で切り抜かれる）
  const fabImgWrap: React.CSSProperties = {
    width: 56,
    height: 56,
    borderRadius: 9999,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  // 出典番号 [1] を、ホバーでその抜粋だけを吹き出し表示する小さなインラインチップに変換
  const renderCitationChip = (citation: Citation | undefined, number: number, key: string) => {
    if (!citation) return null; // 対応する出典が見つからない場合は何も表示しない（安全側）
    const clickable = citation.source?.startsWith("http");
    const ChipTag = clickable ? "a" : "span";
    return (
      <ChipTag
        key={key}
        {...(clickable ? { href: citation.source, target: "_blank", rel: "noopener noreferrer" } : {})}
        aria-label={citation.title || citation.source}
        onMouseEnter={(e: React.MouseEvent<HTMLElement>) => showCiteTooltip(e, citation)}
        onMouseLeave={hideCiteTooltip}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 15,
          height: 15,
          borderRadius: "50%",
          background: "rgba(46,197,244,0.55)",
          color: "#fff",
          fontSize: 9,
          fontWeight: 800,
          textDecoration: "none",
          cursor: clickable ? "pointer" : "default",
          verticalAlign: "super",
          margin: "0 1px",
        }}
      >
        {number}
      </ChipTag>
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

  return (
    <>
      {/* 出典チップのホバー吹き出し：fixed配置でスクロール領域の上下端でも見切れない
          （アンカー位置からJSで計算し、上に余白が無ければ下向きに開く） */}
      {citeTooltip && (
        <div
          style={{
            position: "fixed",
            left: citeTooltip.x,
            top: citeTooltip.openUp ? undefined : citeTooltip.y,
            bottom: citeTooltip.openUp ? `calc(100vh - ${citeTooltip.y}px)` : undefined,
            width: 260,
            maxWidth: "calc(100vw - 16px)",
            background: THEME.ink,
            color: "#fff",
            fontSize: 14,
            lineHeight: 1.6,
            padding: "10px 12px",
            borderRadius: 10,
            boxShadow: "0 10px 26px rgba(0,0,0,0.30)",
            zIndex: Z + 1,
            whiteSpace: "normal",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 12, opacity: 0.75, marginBottom: 3 }}>
            {citeTooltip.citation.title || citeTooltip.citation.source}
          </div>
          <div>{citeTooltip.citation.snippet || "抜粋を取得できませんでした"}</div>
        </div>
      )}

      {/* 右下のロボットボタン */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="チャットを開く"
          style={fabBtn}
          onMouseEnter={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.transform = "translateY(-1px)";
            btn.style.boxShadow = "0 14px 34px rgba(46,197,244,0.40)";
            btn.style.transition = "all 120ms ease";
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.transform = "translateY(0)";
            btn.style.boxShadow = "0 12px 30px rgba(46,197,244,0.35)";
          }}
        >
          <span style={fabImgWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element -- 設定画面でアップロードされた任意ドメインの画像を扱うため */}
            <img
              src={iconUrl}
              alt="robot"
              width={56}
              height={56}
              style={{ objectFit: "cover" }}
            />
          </span>
        </button>
      )}

      {/* チャットパネル */}
      {open && (
        <div style={widgetBox}>
          {/* ヘッダー */}
          <div style={header}>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- 設定画面でアップロードされた任意ドメインの画像を扱うため */}
              <img
                src={iconUrl}
                alt="robot"
                width={26}
                height={26}
                style={{ objectFit: "cover" }}
              />
            </span>

            <div style={headerTitle}>{widgetTitle}</div>

            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => { setMessages([]); setCategoryId(null); setUnresolvedCount(0); setFormUrls([]); }}
                style={headerBtn}
                title="会話をリセット"
              >
                リセット
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={headerBtn}
                title="閉じる"
              >
                閉じる
              </button>
            </div>
          </div>

          {/* 同意画面 */}
          {!agreed && (
            <div style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              padding: "16px 14px 12px",
              gap: 12,
              background: "#fff",
            }}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: THEME.ink,
                borderBottom: `2px solid ${THEME.brand1}`,
                paddingBottom: 8,
              }}>
                【ご利用上の注意事項】
              </div>
              <p style={{ fontSize: 16, color: THEME.ink, margin: 0, lineHeight: 1.6 }}>
                ご利用の前に、以下の注意事項を必ずお読みください。
              </p>
              <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                {TERMS.map((t, i) => (
                  <li key={i} style={{ fontSize: 16, color: THEME.ink, lineHeight: 1.7 }}>
                    {t}
                  </li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() => setAgreed(true)}
                style={{
                  marginTop: 4,
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: "none",
                  background: `linear-gradient(135deg, ${THEME.brand1}, ${THEME.brand2})`,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 8px 20px rgba(46,197,244,0.35)",
                  letterSpacing: "0.02em",
                }}
              >
                上記に同意して質問する
              </button>
            </div>
          )}

          {/* ガス漏れ緊急アラート */}
          {showGasAlert && (
            <div style={{
              background: "#dc2626",
              color: "#fff",
              padding: "10px 14px",
              fontSize: 12,
              lineHeight: 1.6,
              flexShrink: 0,
              borderBottom: "1px solid rgba(255,255,255,0.2)",
            }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>
                ⚠️ ガス漏れの疑いがある場合は今すぐご連絡ください
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: "0.03em" }}>
                旭川市：0166-45-2800 / 江別市：011-385-7913
              </div>
              <div style={{ marginTop: 4 }}>24時間受付 ／ 火気厳禁・窓を開けて換気してください</div>
            </div>
          )}

          {/* チャット本体（同意後のみ表示） */}
          <div ref={listRef} style={{ ...body, display: agreed ? "flex" : "none" }}>
            {messages.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* ウェルカムメッセージ */}
                <div style={{ ...botBubble, alignSelf: "flex-start" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                    ● 応答中
                  </div>
                  <div style={{ fontSize: 13 }}>
                    ご用件のカテゴリをお選びください。<br />
                    そのままご質問いただくこともできます。
                  </div>
                </div>

                {/* カテゴリボタン */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => selectCategory(cat)}
                      style={{
                        gridColumn: cat.fullWidth ? "1 / -1" : undefined,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: `1px solid ${THEME.botBorder}`,
                        background: THEME.botBg,
                        color: THEME.ink,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "background 120ms",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = `rgba(46,197,244,0.18)`;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.background = THEME.botBg;
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div key={i}>
                  <div style={isUser ? userBubble : botBubble}>
                    {isUser ? m.content : renderMessageContent(m.content, m.citations)}
                  </div>

                  {/* エスカレーション：フォームURLボタン */}
                  {!isUser && m.formUrls && m.formUrls.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8, marginLeft: 2 }}>
                      {m.formUrls.map((fu, fi) => (
                        <a
                          key={fi}
                          href={fu.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 12,
                            padding: "7px 12px",
                            borderRadius: 10,
                            border: "1px solid rgba(245,158,11,0.50)",
                            background: "rgba(245,158,11,0.08)",
                            color: "#92400e",
                            textDecoration: "none",
                            fontWeight: 700,
                          }}
                        >
                          📋 {fu.label} ↗
                        </a>
                      ))}
                    </div>
                  )}

                  {!isUser && (
                    <div style={{ display: "flex", gap: 6, marginTop: 4, marginLeft: 2 }}>
                      <button
                        onClick={() => copyMessage(i, m.content)}
                        style={{
                          fontSize: 11, padding: "3px 8px", borderRadius: 8, border: "1px solid",
                          borderColor: copiedIndex === i ? "rgba(16,185,129,0.5)" : "rgba(0,0,0,0.15)",
                          background: copiedIndex === i ? "rgba(16,185,129,0.15)" : "rgba(0,0,0,0.04)",
                          color: copiedIndex === i ? "#059669" : "#6b7280",
                          cursor: "pointer",
                        }}
                      >
                        {copiedIndex === i ? "✅ コピーしました" : "📋 コピー"}
                      </button>

                      {!m.noFeedback && (
                        <>
                          <button
                            onClick={() => sendFeedback(i, 1)}
                            disabled={!!m.feedback}
                            style={{
                              fontSize: 11, padding: "3px 8px", borderRadius: 8, border: "1px solid",
                              borderColor: m.feedback === 1 ? "rgba(16,185,129,0.5)" : "rgba(0,0,0,0.15)",
                              background: m.feedback === 1 ? "rgba(16,185,129,0.15)" : "rgba(0,0,0,0.04)",
                              color: m.feedback === 1 ? "#059669" : "#6b7280",
                              cursor: m.feedback ? "default" : "pointer",
                            }}
                          >
                            👍 解決した
                          </button>
                          <button
                            onClick={() => sendFeedback(i, -1)}
                            disabled={!!m.feedback}
                            style={{
                              fontSize: 11, padding: "3px 8px", borderRadius: 8, border: "1px solid",
                              borderColor: m.feedback === -1 ? "rgba(59,130,246,0.5)" : "rgba(0,0,0,0.15)",
                              background: m.feedback === -1 ? "rgba(59,130,246,0.15)" : "rgba(0,0,0,0.04)",
                              color: m.feedback === -1 ? "#2563eb" : "#6b7280",
                              cursor: m.feedback ? "default" : "pointer",
                            }}
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

            {/* ── シナリオ選択画面 ── */}
            {agreed && scenarioSelectorCategory && CATEGORY_SCENARIOS[scenarioSelectorCategory] && !thinking && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ ...botBubble, alignSelf: "flex-start" }}>
                  ご用件をお選びください。
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignSelf: "flex-start", width: "88%" }}>
                  {CATEGORY_SCENARIOS[scenarioSelectorCategory].map((sid) => {
                    const s = SCENARIOS[sid];
                    if (!s) return null;
                    return (
                      <button
                        key={sid}
                        type="button"
                        onClick={() => startScenario(sid)}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "10px 12px", borderRadius: 12,
                          border: `1px solid ${THEME.botBorder}`,
                          background: THEME.botBg, color: THEME.ink,
                          fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left",
                        }}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={exitScenarioToFreeChat}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 12px", borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.12)",
                      background: "rgba(0,0,0,0.03)", color: "#6b7280",
                      fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left",
                    }}
                  >
                    その他のご質問
                  </button>
                </div>
              </div>
            )}

            {/* ── シナリオ選択肢ボタン（choice ノード） ── */}
            {agreed && !scenarioSelectorCategory && currentNode?.type === "choice" && currentNode.choices && !thinking && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignSelf: "flex-start", width: "88%" }}>
                {currentNode.choices.map((choice) => (
                  <button
                    key={choice.nextNodeId}
                    type="button"
                    onClick={() => advanceScenario(choice)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "10px 12px", borderRadius: 12,
                      border: `1px solid ${THEME.botBorder}`,
                      background: THEME.botBg, color: THEME.ink,
                      fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left",
                    }}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            )}

            {/* ── 次のステップへボタン（message ノード） ── */}
            {agreed && currentNode?.type === "message" && currentNode.nextNodeId && !thinking && (
              <div style={{ alignSelf: "flex-start" }}>
                <button
                  type="button"
                  onClick={() => advanceToNextNode(currentNode.nextNodeId!)}
                  style={{
                    padding: "10px 16px", borderRadius: 12,
                    border: `1px solid ${THEME.botBorder}`,
                    background: `linear-gradient(135deg, ${THEME.brand1}, ${THEME.brand2})`,
                    color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                    boxShadow: "0 6px 16px rgba(46,197,244,0.30)",
                  }}
                >
                  次のステップへ →
                </button>
              </div>
            )}

            {/* ── 「← 別の手続きを選ぶ」はシナリオアクティブ中は常時表示 ── */}
            {agreed && activeScenario && !scenarioSelectorCategory && !thinking && (
              <div style={{ alignSelf: "flex-start" }}>
                <button
                  type="button"
                  onClick={backToScenarioSelector}
                  style={{
                    display: "flex", alignItems: "center",
                    padding: "8px 12px", borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.12)",
                    background: "rgba(0,0,0,0.03)", color: "#6b7280",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  ← 別の手続きを選ぶ
                </button>
              </div>
            )}

            {thinking && (
              <div
                style={{
                  ...botBubble,
                  opacity: 0.75,
                }}
              >
                返信中…
              </div>
            )}
          </div>

          {/* 入力（同意後のみ） */}
          <div style={{ ...inputBar, display: agreed ? "flex" : "none" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder={currentNode ? "このステップについてご質問できます" : "ご質問をどうぞ"}
              style={inputStyle}
            />
            <VoiceInputButton onTranscribed={handleTranscribed} disabled={thinking} idleBg="rgba(46,197,244,0.12)" />
            <button
              type="button"
              onClick={() => send()}
              disabled={thinking || !input.trim()}
              style={sendBtn(thinking || !input.trim())}
            >
              送信
            </button>
          </div>
        </div>
      )}
    </>
  );
}
