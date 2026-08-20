// lib/scenarios.ts
// シナリオエンジン: 型定義 + シナリオデータ

export type ScenarioNodeType = "choice" | "message" | "end";

export type ScenarioChoice = {
  label: string;
  nextNodeId: string;
};

export type FormUrl = {
  label: string;
  url: string;
};

export type ScenarioNode = {
  id: string;
  type: ScenarioNodeType;
  content: string;
  /** RAG呼び出し時に渡す文脈テキスト */
  context: string;
  /** type="choice" のとき表示する選択肢 */
  choices?: ScenarioChoice[];
  /** type="message" のとき「次へ」で進むノードID */
  nextNodeId?: string;
  /** ノードに関連するフォームURL（📋ボタンとして表示） */
  formUrls?: FormUrl[];
};

export type Scenario = {
  id: string;
  name: string;
  entryNodeId: string;
  nodes: Record<string, ScenarioNode>;
  /** 自由入力チャットでこのシナリオを検出するためのキーワード（最長一致を優先） */
  keywords?: string[];
  /**
   * 自由入力チャット（RAG）向けの正確な要約回答。
   * スクレイピングした申込フォームページはノイズが多く、RAGがそこから誤った
   * 回答（例: 本来スタッフ立ち合いが必要な「開栓」を、お客さま自身での
   * バルブ操作と誤って案内してしまう）を生成することがあるため、
   * シナリオボタンで案内している正確な内容をそのままシステムプロンプトに
   * 注入し、テストチャット・埋め込みプレビューのどちらでも同じ正しい回答に
   * 揃える。
   */
  summary?: string;
};

// ──────────────────────────────────────────────
// カテゴリID → シナリオIDリスト のマッピング
// ──────────────────────────────────────────────
export const CATEGORY_SCENARIOS: Record<string, string[]> = {
  "手続き・契約": ["kaisen", "hissen", "meigi"],
};

// ──────────────────────────────────────────────
// 自由入力チャット向け: キーワードから該当シナリオを検索
// ★ 複数のシナリオのキーワードが同時にマッチする場合、最も長い（＝より具体的な）
// ものを優先する（route.tsの緊急ワード・トピック判定と同じ考え方）
// ──────────────────────────────────────────────
export function findScenarioByKeyword(query: string): Scenario | null {
  let best: Scenario | null = null;
  let bestLen = 0;
  for (const scenario of Object.values(SCENARIOS)) {
    for (const kw of scenario.keywords ?? []) {
      if (kw.length > bestLen && query.includes(kw)) {
        best = scenario;
        bestLen = kw.length;
      }
    }
  }
  return best;
}

// ──────────────────────────────────────────────
// シナリオデータ
// ──────────────────────────────────────────────
export const SCENARIOS: Record<string, Scenario> = {

  // ── 開栓（ガス使用開始）────────────────────
  kaisen: {
    id: "kaisen",
    name: "開栓（ガスの使用開始）",
    entryNodeId: "area",
    keywords: ["開栓", "ガスの使用開始", "使用開始の申し込み", "ガスを使い始め", "新規契約"],
    summary:
      "ガスの開栓（新規のご使用開始）は、安全確認のため必ず旭川ガスのスタッフが訪問して行います。お客さまご自身でガス栓・メーターガス栓を開けることはできません。\n\n" +
      "・工事希望日の1週間前までにお申し込みください（旭川市内・江別地区とも）\n" +
      "・工事当日はお客さまの立ち合いが必要です（約30分程度）\n" +
      "・ご用意いただくもの：本人確認書類（運転免許証・健康保険証など）、お客様番号（旭川ガスからのご案内書類に記載）\n\n" +
      "お申し込みフォーム：\n" +
      "・旭川地区：https://asahikawa-gas.co.jp/?page_id=590\n" +
      "・江別地区：https://asahikawa-gas.co.jp/?page_id=665\n\n" +
      "注意：地震などでガスメーターが自動的に止まった場合に行う「復帰操作（ガスが出ないときの対処）」は、この新規開栓の手続きとは別物です。質問がその趣旨と判断できる場合は、開栓の案内ではなく復帰操作の案内を優先してください。",
    nodes: {
      area: {
        id: "area",
        type: "choice",
        content: "開栓（ガスの使用開始）のご案内です。\nお引越し先の地域をお選びください。",
        context: "開栓手続き（ガス使用開始の申し込み）",
        choices: [
          { label: "旭川市内", nextNodeId: "asahikawa" },
          { label: "江別地区", nextNodeId: "ebetsu" },
        ],
      },
      asahikawa: {
        id: "asahikawa",
        type: "message",
        content:
          "旭川市内の開栓手続きについてご案内します。\n\n・ご希望の工事日の1週間前までにお申し込みください\n・工事当日は立ち合いが必要です（約30分）",
        context: "開栓手続き - 旭川市内エリア（工事日程・立ち合い案内）",
        nextNodeId: "asahikawa_docs",
      },
      asahikawa_docs: {
        id: "asahikawa_docs",
        type: "end",
        content:
          "【ご準備いただくもの】\n・本人確認書類（運転免許証・健康保険証など）\n・お客様番号（旭川ガスからのご案内書類に記載）\n\n書類が揃いましたら、以下のフォームからお申し込みいただけます。",
        context: "開栓手続き - 旭川市内 - 必要書類の確認",
        formUrls: [
          { label: "開栓お申し込みフォーム（旭川地区）", url: "https://asahikawa-gas.co.jp/?page_id=590" },
        ],
      },
      ebetsu: {
        id: "ebetsu",
        type: "end",
        content:
          "江別地区の開栓は、以下のフォームからお申し込みいただけます。\n\n・ご希望の工事日の1週間前までにお申し込みください\n・工事当日は立ち合いが必要です（約30分）",
        context: "開栓手続き - 江別地区エリア（工事日程・立ち合い案内）",
        formUrls: [
          { label: "開栓お申し込みフォーム（江別地区）", url: "https://asahikawa-gas.co.jp/?page_id=665" },
        ],
      },
    },
  },

  // ── 閉栓（ガス使用停止）────────────────────
  hissen: {
    id: "hissen",
    name: "閉栓（ガスの使用停止）",
    entryNodeId: "reason",
    keywords: ["閉栓", "ガスの使用停止", "使用停止の申し込み", "ガスを止め", "解約"],
    summary:
      "ガスの閉栓（ご使用停止）は、以下のフォームからお申し込みいただけます。\n\n" +
      "・引越しによる閉栓：ご使用停止希望日の3日前までにお申し込みください。メーターの閉栓作業は立ち合い不要です\n" +
      "・その他の理由による閉栓：ご使用停止希望日の3日前までにお申し込みください\n\n" +
      "お申し込みフォーム：\n" +
      "・旭川地区：https://asahikawa-gas.co.jp/?page_id=589\n" +
      "・江別地区：https://asahikawa-gas.co.jp/?page_id=679",
    nodes: {
      reason: {
        id: "reason",
        type: "choice",
        content: "閉栓（ガスの使用停止）のご案内です。\nご用件をお選びください。",
        context: "閉栓手続き（ガス使用停止の申し込み）",
        choices: [
          { label: "引越しによる閉栓", nextNodeId: "moving_area" },
          { label: "その他の理由による閉栓", nextNodeId: "other_area" },
        ],
      },
      moving_area: {
        id: "moving_area",
        type: "choice",
        content: "引越しのため閉栓されるのですね。\n現在のご住所の地域をお選びください。",
        context: "閉栓手続き - 引越しによるガス使用停止",
        choices: [
          { label: "旭川市内", nextNodeId: "moving_asahikawa" },
          { label: "江別地区", nextNodeId: "moving_ebetsu" },
        ],
      },
      moving_asahikawa: {
        id: "moving_asahikawa",
        type: "end",
        content:
          "旭川市内の閉栓は、以下のフォームからお申し込みいただけます。\n\n・ご使用停止希望日の3日前までにお申し込みください\n・メーターの閉栓作業は立ち合い不要です",
        context: "閉栓手続き - 引越し - 旭川市内（申込期限）",
        formUrls: [
          { label: "閉栓お申し込みフォーム（旭川地区）", url: "https://asahikawa-gas.co.jp/?page_id=589" },
        ],
      },
      moving_ebetsu: {
        id: "moving_ebetsu",
        type: "end",
        content:
          "江別地区の閉栓は、以下のフォームからお申し込みいただけます。\n\n・ご使用停止希望日の3日前までにお申し込みください\n・メーターの閉栓作業は立ち合い不要です",
        context: "閉栓手続き - 引越し - 江別地区（申込期限）",
        formUrls: [
          { label: "閉栓お申し込みフォーム（江別地区）", url: "https://asahikawa-gas.co.jp/?page_id=679" },
        ],
      },
      other_area: {
        id: "other_area",
        type: "choice",
        content: "現在のご住所の地域をお選びください。",
        context: "閉栓手続き - その他の理由",
        choices: [
          { label: "旭川市内", nextNodeId: "other_asahikawa" },
          { label: "江別地区", nextNodeId: "other_ebetsu" },
        ],
      },
      other_asahikawa: {
        id: "other_asahikawa",
        type: "end",
        content:
          "旭川市内の閉栓は、以下のフォームからお申し込みいただけます。\n\n・ご使用停止希望日の3日前までにお申し込みください",
        context: "閉栓手続き - その他の理由 - 旭川市内（申込期限）",
        formUrls: [
          { label: "閉栓お申し込みフォーム（旭川地区）", url: "https://asahikawa-gas.co.jp/?page_id=589" },
        ],
      },
      other_ebetsu: {
        id: "other_ebetsu",
        type: "end",
        content:
          "江別地区の閉栓は、以下のフォームからお申し込みいただけます。\n\n・ご使用停止希望日の3日前までにお申し込みください",
        context: "閉栓手続き - その他の理由 - 江別地区（申込期限）",
        formUrls: [
          { label: "閉栓お申し込みフォーム（江別地区）", url: "https://asahikawa-gas.co.jp/?page_id=679" },
        ],
      },
    },
  },

  // ── 名義変更 ────────────────────────────────
  meigi: {
    id: "meigi",
    name: "名義変更",
    entryNodeId: "intro",
    keywords: ["名義変更", "契約者変更"],
    summary:
      "名義変更のお手続きには、旧名義人・新名義人の両方の情報が必要になります。\n\n" +
      "ご準備いただくもの：\n" +
      "・旧名義人の本人確認書類\n" +
      "・新名義人の本人確認書類\n" +
      "・印鑑（双方）\n\n" +
      "書類が揃いましたら、以下のフォームからお申し込みいただけます。\n" +
      "・お申し込みフォーム：https://asahikawa-gas.co.jp/?page_id=210",
    nodes: {
      intro: {
        id: "intro",
        type: "message",
        content:
          "名義変更のご案内です。\n\n旧名義人・新名義人の両方の情報が必要になります。",
        context: "名義変更手続き（ガス契約の名義変更）",
        nextNodeId: "docs",
      },
      docs: {
        id: "docs",
        type: "message",
        content:
          "【ご準備いただくもの】\n・旧名義人の本人確認書類\n・新名義人の本人確認書類\n・印鑑（双方）",
        context: "名義変更手続き - 必要書類の確認",
        nextNodeId: "contact",
      },
      contact: {
        id: "contact",
        type: "end",
        content:
          "書類が揃いましたら、以下のフォームからお申し込みいただけます。",
        context: "名義変更手続き - お申し込み方法",
        formUrls: [
          { label: "名義変更お申し込みフォーム", url: "https://asahikawa-gas.co.jp/?page_id=210" },
        ],
      },
    },
  },
};
