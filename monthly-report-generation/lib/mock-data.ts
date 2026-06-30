// =============================================
// 自治体DX月次レポート用モックデータ
// 仕様準拠：Input Data / Output Task 1 & 2
// =============================================

// --- Input Data Types (仕様書準拠) ---

export interface DialogueLog {
  query: string
  answer: string
  category: string
  status: "resolved" | "fail" | "partial"
  timestamp: string
}

export interface HourlyAccess {
  hour: string
  count: number
}

export interface DailyDialogue {
  date: string
  count: number
  aiResolved: number
  humanEscalated: number
}

export interface KeywordTrend {
  keyword: string
  count: number
  change: number
  category: string
}

export interface SilentNeed {
  question: string
  frequency: number
  suggestedAction: string
}

export interface SentimentData {
  category: string
  positive: number
  neutral: number
  negative: number
}

export interface KnowledgeGap {
  topic: string
  missRate: number
  suggestedDocument: string
  priority: "high" | "medium" | "low"
}

export interface MunicipalityInfo {
  name: string
  department: string
  focusAreas: string[]
}

export interface PreviousMonthData {
  totalDialogues: number
  categoryBreakdown: { category: string; percentage: number }[]
}

export interface UsageStats {
  uniqueUsers: number
  hourlyAccess: HourlyAccess[]
  averageResponseTimeSec: number
  nightAndHolidayRate: number
}

export interface ScheduleConfig {
  executionDay: "last" | "25" | "28"
  executionTime: string
  recipients: Recipient[]
  autoSend: boolean
}

export interface Recipient {
  name: string
  email: string
  role: "primary" | "cc" | "admin"
}

export interface MonthlyReport {
  municipality: MunicipalityInfo
  recipientName: string
  reportMonth: string
  reportYear: number
  analysisDate: string
  totalDialogues: number
  previousMonth: PreviousMonthData
  aiResolutionRate: number
  previousAiResolutionRate: number
  usageStats: UsageStats
  humanHoursSaved: number
  costSavingsYen: number
  costPerMinute: number
  dailyDialogues: DailyDialogue[]
  keywordTrends: KeywordTrend[]
  silentNeeds: SilentNeed[]
  sentimentData: SentimentData[]
  knowledgeGaps: KnowledgeGap[]
  dialogueLogs: DialogueLog[]
  schedule: ScheduleConfig
}

// --- Data Generators ---

function generateDailyDialogues(): DailyDialogue[] {
  const days: DailyDialogue[] = []
  for (let i = 1; i <= 28; i++) {
    const date = `3/${i}`
    const base = 30 + Math.floor(Math.random() * 25)
    const count = i % 7 === 0 || i % 7 === 6 ? Math.floor(base * 0.4) : base
    const aiResolved = Math.floor(count * (0.78 + Math.random() * 0.12))
    days.push({ date, count, aiResolved, humanEscalated: count - aiResolved })
  }
  return days
}

function generateHourlyAccess(): HourlyAccess[] {
  const hours: HourlyAccess[] = []
  const pattern = [2, 1, 1, 0, 0, 1, 5, 18, 42, 55, 48, 38, 45, 52, 48, 40, 35, 28, 22, 18, 15, 10, 6, 3]
  for (let i = 0; i < 24; i++) {
    hours.push({
      hour: `${i.toString().padStart(2, "0")}:00`,
      count: pattern[i] + Math.floor(Math.random() * 8),
    })
  }
  return hours
}

function generateDialogueLogs(): DialogueLog[] {
  return [
    { query: "子育て支援の申請方法を教えてください", answer: "子育て支援課の窓口またはオンラインで申請可能です。必要書類は...", category: "福祉", status: "resolved", timestamp: "2026-03-15T10:23:00" },
    { query: "マイナンバーカードの更新手続きは？", answer: "市民課窓口にて本人確認書類をお持ちの上...", category: "行政手続", status: "resolved", timestamp: "2026-03-15T11:05:00" },
    { query: "災害時のペット同伴避難所はどこですか？", answer: "", category: "防災", status: "fail", timestamp: "2026-03-15T14:30:00" },
    { query: "夜間の小児救急対応病院を教えてください", answer: "申し訳ございません、現在情報を準備中です", category: "健康・医療", status: "partial", timestamp: "2026-03-16T22:15:00" },
    { query: "ゴミの収集日を確認したい", answer: "お住まいの地区のゴミ収集カレンダーは...", category: "生活", status: "resolved", timestamp: "2026-03-17T09:00:00" },
    { query: "外国語対応の窓口はありますか？", answer: "", category: "行政手続", status: "fail", timestamp: "2026-03-17T13:45:00" },
    { query: "転入届の提出期限は？", answer: "引っ越し後14日以内に市民課へ届け出てください", category: "届出", status: "resolved", timestamp: "2026-03-18T10:30:00" },
    { query: "空き家バンクの登録方法は？", answer: "", category: "生活", status: "fail", timestamp: "2026-03-18T16:00:00" },
    { query: "予防接種の予約をしたい", answer: "市の予約システムからオンライン予約が可能です", category: "健康・医療", status: "resolved", timestamp: "2026-03-19T11:20:00" },
    { query: "防災無線が聞こえなかった。内容を確認したい", answer: "防災情報テレホンサービス（0120-XXX-XXX）で確認可能です", category: "防災", status: "resolved", timestamp: "2026-03-20T08:10:00" },
  ]
}

const dailyDialogues = generateDailyDialogues()

export const mockReport: MonthlyReport = {
  municipality: {
    name: "さくら市",
    department: "デジタル推進課",
    focusAreas: ["移住促進", "副業推進", "子育て支援DX"],
  },
  recipientName: "田中 太郎",
  reportMonth: "3",
  reportYear: 2026,
  analysisDate: "2026/03/28",
  totalDialogues: dailyDialogues.reduce((sum, d) => sum + d.count, 0),
  previousMonth: {
    totalDialogues: 987,
    categoryBreakdown: [
      { category: "福祉", percentage: 28 },
      { category: "行政手続", percentage: 22 },
      { category: "防災", percentage: 15 },
      { category: "生活", percentage: 18 },
      { category: "健康・医療", percentage: 12 },
      { category: "その他", percentage: 5 },
    ],
  },
  aiResolutionRate: 84.2,
  previousAiResolutionRate: 81.5,
  usageStats: {
    uniqueUsers: 743,
    hourlyAccess: generateHourlyAccess(),
    averageResponseTimeSec: 2.3,
    nightAndHolidayRate: 31.5,
  },
  humanHoursSaved: 128,
  costSavingsYen: 384000,
  costPerMinute: 60,
  dailyDialogues,
  keywordTrends: [
    { keyword: "子育て支援", count: 142, change: 32, category: "福祉" },
    { keyword: "マイナンバーカード", count: 98, change: -8, category: "行政手続" },
    { keyword: "防災情報", count: 87, change: 45, category: "防災" },
    { keyword: "ゴミ収集日", count: 76, change: 5, category: "生活" },
    { keyword: "転入届", count: 65, change: 18, category: "届出" },
    { keyword: "予防接種", count: 58, change: 22, category: "健康" },
    { keyword: "公園利用", count: 43, change: 12, category: "施設" },
    { keyword: "図書館予約", count: 38, change: -3, category: "施設" },
  ],
  silentNeeds: [
    { question: "災害時のペット同伴避難所はどこですか？", frequency: 23, suggestedAction: "ペット同伴避難所リストのFAQ追加" },
    { question: "夜間の小児救急対応病院を教えてください", frequency: 18, suggestedAction: "夜間小児救急マップの作成・公開" },
    { question: "外国語対応の窓口はありますか？", frequency: 15, suggestedAction: "多言語対応窓口情報の整備" },
    { question: "空き家バンクの登録方法は？", frequency: 12, suggestedAction: "空き家バンク特設ページの作成" },
  ],
  sentimentData: [
    { category: "子育て", positive: 45, neutral: 35, negative: 20 },
    { category: "行政手続", positive: 30, neutral: 40, negative: 30 },
    { category: "防災", positive: 20, neutral: 25, negative: 55 },
    { category: "生活環境", positive: 50, neutral: 35, negative: 15 },
    { category: "健康・医療", positive: 35, neutral: 40, negative: 25 },
  ],
  knowledgeGaps: [
    { topic: "ペット防災関連", missRate: 78, suggestedDocument: "ペット防災ガイドライン（PDF）", priority: "high" },
    { topic: "夜間救急医療", missRate: 65, suggestedDocument: "夜間休日救急医療体制一覧", priority: "high" },
    { topic: "多言語窓口案内", missRate: 52, suggestedDocument: "多言語対応サービス一覧", priority: "medium" },
    { topic: "空き家対策", missRate: 45, suggestedDocument: "空き家バンク利用マニュアル", priority: "medium" },
    { topic: "公共交通時刻表", missRate: 30, suggestedDocument: "コミュニティバス時刻表（最新版）", priority: "low" },
  ],
  dialogueLogs: generateDialogueLogs(),
  schedule: {
    executionDay: "last",
    executionTime: "23:59",
    recipients: [
      { name: "田中 太郎", email: "tanaka@sakura-city.lg.jp", role: "primary" },
      { name: "山田 次郎", email: "yamada@sakura-city.lg.jp", role: "cc" },
      { name: "佐々木 部長", email: "sasaki@sakura-city.lg.jp", role: "admin" },
    ],
    autoSend: true,
  },
}

// --- Email Generation (Output Task 1 準拠) ---

export function generateEmailSubject(report: MonthlyReport): string {
  return `【AI運用報告】2026年${report.reportMonth}月度 住民ニーズ分析レポート（自動配信）`
}

export function generateEmailBody(report: MonthlyReport): string {
  const monthDiff = (
    ((report.totalDialogues - report.previousMonth.totalDialogues) /
      report.previousMonth.totalDialogues) *
    100
  ).toFixed(1)
  const topKeyword = [...report.keywordTrends].sort((a, b) => b.change - a.change)[0]

  return `${report.recipientName} 様

いつもお世話になっております。
AI人材マッチングシステム運用チームです。

2026年${report.reportMonth}月度の月次運用報告をお送りいたします。

━━━━━━━━━━━━━━━━━━━━━━━━
■ 今月のサマリー
━━━━━━━━━━━━━━━━━━━━━━━━

  総対話数：${report.totalDialogues.toLocaleString()}件（前月比 ${Number(monthDiff) > 0 ? "+" : ""}${monthDiff}%）
  AI解決率：${report.aiResolutionRate}%（前月 ${report.previousAiResolutionRate}%）
  窓口削減時間：推定 ${report.humanHoursSaved}時間（経済効果：${report.costSavingsYen.toLocaleString()}円）

━━━━━━━━━━━━━━━━━━━━━━━━
■ 特筆すべき住民ニーズの変化
━━━━━━━━━━━━━━━━━━━━━━━━

  「${topKeyword.keyword}」に関する問い合わせが前月比 +${topKeyword.change}% と
  急増しております。${topKeyword.category}分野における住民関心の高まりが
  顕著であり、対応強化をご検討いただくことを推奨いたします。

━━━━━━━━━━━━━━━━━━━━━━━━

詳細は添付のPDFレポートをご確認ください。
住民インサイト分析、行政コスト削減効果（ROI）、
ナレッジ改善提案、次月運用方針をまとめております。

ご不明な点がございましたら、お気軽にお問い合わせください。

──────────────────
株式会社デジタルガバナンス・パートナーズ
DXコンサルティング事業部
担当：佐藤 花子
TEL：03-XXXX-XXXX
Email：sato@dgp-consulting.co.jp
──────────────────`
}

// --- Chart Data for PDF (Implementation Instructions 準拠) ---

export function generateChartData(report: MonthlyReport) {
  return {
    dailyDialogues: report.dailyDialogues.map((d) => ({
      date: d.date,
      total: d.count,
      AI解決: d.aiResolved,
      有人対応: d.humanEscalated,
    })),
    keywordRanking: report.keywordTrends.map((k) => ({
      keyword: k.keyword,
      件数: k.count,
      前月比: k.change,
    })),
    sentiment: report.sentimentData.map((s) => ({
      category: s.category,
      ポジティブ: s.positive,
      ニュートラル: s.neutral,
      ネガティブ: s.negative,
    })),
    hourlyAccess: report.usageStats.hourlyAccess.map((h) => ({
      hour: h.hour,
      アクセス数: h.count,
    })),
    categoryBreakdown: report.previousMonth.categoryBreakdown.map((c) => ({
      name: c.category,
      value: c.percentage,
    })),
  }
}

// ROI calculation helper
export function calculateROI(report: MonthlyReport) {
  const totalMinutesSaved = report.totalDialogues * 5
  const totalHoursSaved = totalMinutesSaved / 60
  const costSavings = totalMinutesSaved * report.costPerMinute
  return {
    totalMinutesSaved,
    totalHoursSaved: Math.round(totalHoursSaved),
    costSavings,
    formula: `${report.totalDialogues}件 x 5分 = ${totalMinutesSaved.toLocaleString()}分 (${Math.round(totalHoursSaved)}時間)`,
    costFormula: `${totalMinutesSaved.toLocaleString()}分 x ${report.costPerMinute}円/分 = ${costSavings.toLocaleString()}円`,
  }
}
