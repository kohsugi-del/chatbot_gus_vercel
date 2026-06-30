// =============================================
// ガス会社向けダッシュボード用モックデータ
// =============================================

// --- Types (Props定義準拠) ---

export interface MonthlyStats {
  totalConversations: number
  escalationRate: number
  resolvedCount: number
  emergencyKeywordCount: number
}

export interface ConversationTrend {
  month: string
  count: number
}

export interface HeatmapData {
  dayOfWeek: number
  hour: number
  count: number
}

export interface TopQuestion {
  content: string
  count: number
}

export interface TopDoc {
  title: string
  source: string
  url: string
  referenceCount: number
  lastReferencedAt: string
}

export interface UnusedDoc {
  title: string
  source: string
  url: string
  lastReferencedAt: string | null
}

export interface EmergencyKeyword {
  keyword: string
  count: number
  date: string
}

export interface ModeHistory {
  mode: string
  startedAt: string
  endedAt: string | null
}

export interface TopicDistribution {
  label: string
  value: number
}

export interface DailyEmergencyTrend {
  date: string
  count: number
}

export interface GasDashboardProps {
  clientId: string
  monthlyStats: MonthlyStats
  conversationTrend: ConversationTrend[]
  heatmapData: HeatmapData[]
  topQuestions: TopQuestion[]
  topDocs: TopDoc[]
  unusedDocs: UnusedDoc[]
  emergencyKeywords: EmergencyKeyword[]
  modeHistory: ModeHistory[]
  // Additional display data
  topicDistribution: TopicDistribution[]
  dailyEmergencyTrend: DailyEmergencyTrend[]
  reportMonth: string
  reportYear: number
}

// --- Data Generators ---

function generateHeatmapData(): HeatmapData[] {
  const data: HeatmapData[] = []
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      // Lower on weekends (day 0 = Sun, 6 = Sat)
      const isWeekend = day === 0 || day === 6
      const isBusinessHour = hour >= 9 && hour <= 18
      const base = isWeekend ? 5 : isBusinessHour ? 25 : 8
      data.push({
        dayOfWeek: day,
        hour,
        count: base + Math.floor(Math.random() * 15),
      })
    }
  }
  return data
}

function generateConversationTrend(): ConversationTrend[] {
  return [
    { month: "2025/10", count: 2340 },
    { month: "2025/11", count: 2580 },
    { month: "2025/12", count: 2890 },
    { month: "2026/01", count: 2720 },
    { month: "2026/02", count: 2950 },
    { month: "2026/03", count: 3120 },
  ]
}

function generateDailyEmergencyTrend(): DailyEmergencyTrend[] {
  const data: DailyEmergencyTrend[] = []
  for (let i = 1; i <= 28; i++) {
    data.push({
      date: `3/${i}`,
      count: Math.floor(Math.random() * 5) + (i % 7 === 0 ? 0 : 1),
    })
  }
  return data
}

function generateEmergencyKeywords(): EmergencyKeyword[] {
  const keywords = [
    { keyword: "ガス漏れ", baseCount: 12 },
    { keyword: "異臭", baseCount: 8 },
    { keyword: "一酸化炭素", baseCount: 3 },
    { keyword: "火災", baseCount: 2 },
    { keyword: "爆発", baseCount: 1 },
  ]
  const data: EmergencyKeyword[] = []
  for (let i = 1; i <= 28; i++) {
    keywords.forEach((k) => {
      if (Math.random() > 0.7) {
        data.push({
          keyword: k.keyword,
          count: Math.floor(Math.random() * 3) + 1,
          date: `2026-03-${i.toString().padStart(2, "0")}`,
        })
      }
    })
  }
  return data
}

function generateModeHistory(): ModeHistory[] {
  return [
    { mode: "緊急", startedAt: "2026-03-05T14:23:00", endedAt: "2026-03-05T16:45:00" },
    { mode: "緊急", startedAt: "2026-03-12T09:15:00", endedAt: "2026-03-12T11:30:00" },
    { mode: "緊急", startedAt: "2026-03-18T22:10:00", endedAt: "2026-03-19T01:00:00" },
  ]
}

export const mockGasDashboard: GasDashboardProps = {
  clientId: "gas-company-001",
  reportMonth: "3",
  reportYear: 2026,
  monthlyStats: {
    totalConversations: 3120,
    escalationRate: 8.5,
    resolvedCount: 2855,
    emergencyKeywordCount: 26,
  },
  conversationTrend: generateConversationTrend(),
  heatmapData: generateHeatmapData(),
  topQuestions: [
    { content: "ガスの開栓手続きについて教えてください", count: 245 },
    { content: "ガス料金の支払い方法を変更したい", count: 198 },
    { content: "引っ越しの際のガス閉栓手続きは？", count: 167 },
    { content: "ガス給湯器のエラーコードE-110の対処法", count: 134 },
    { content: "ガス漏れ警報器が鳴った場合の対応", count: 112 },
    { content: "ガス機器の点検予約をしたい", count: 98 },
    { content: "業務用ガス契約への変更方法", count: 87 },
    { content: "ガスコンロの火がつかない", count: 76 },
  ],
  topDocs: [
    { title: "ガス開栓・閉栓手続きガイド", source: "manual", url: "https://example.com/docs/kaisen-heisen-guide.pdf", referenceCount: 412, lastReferencedAt: "2026-03-28T15:30:00" },
    { title: "ガス料金のお支払い方法", source: "faq", url: "https://example.com/faq/payment-methods", referenceCount: 356, lastReferencedAt: "2026-03-28T14:22:00" },
    { title: "ガス機器エラーコード一覧", source: "manual", url: "https://example.com/docs/error-codes.pdf", referenceCount: 287, lastReferencedAt: "2026-03-28T16:45:00" },
    { title: "緊急時の対応マニュアル", source: "manual", url: "https://example.com/docs/emergency-manual.pdf", referenceCount: 234, lastReferencedAt: "2026-03-28T12:10:00" },
    { title: "業務用ガス契約のご案内", source: "brochure", url: "https://example.com/docs/business-contract.pdf", referenceCount: 156, lastReferencedAt: "2026-03-27T11:00:00" },
  ],
  unusedDocs: [
    { title: "旧型ガスメーター取扱説明書", source: "manual", url: "https://example.com/docs/old-meter-manual.pdf", lastReferencedAt: "2025-08-15T10:00:00" },
    { title: "2020年度料金改定のお知らせ", source: "notice", url: "https://example.com/news/2020-price-change", lastReferencedAt: "2024-12-01T09:00:00" },
    { title: "廃止サービスに関するFAQ", source: "faq", url: "https://example.com/faq/discontinued-services", lastReferencedAt: null },
  ],
  emergencyKeywords: generateEmergencyKeywords(),
  modeHistory: generateModeHistory(),
  topicDistribution: [
    { label: "ご家庭のお客様", value: 32 },
    { label: "業務用のお客様", value: 18 },
    { label: "ガスの開栓・閉栓", value: 22 },
    { label: "ガス機器", value: 15 },
    { label: "会社・採用", value: 5 },
    { label: "その他", value: 8 },
  ],
  dailyEmergencyTrend: generateDailyEmergencyTrend(),
}

// --- Helper Functions ---

export function calculateEscalationCount(stats: MonthlyStats): number {
  return Math.round(stats.totalConversations * (stats.escalationRate / 100))
}

export function aggregateEmergencyByKeyword(keywords: EmergencyKeyword[]): { keyword: string; total: number }[] {
  const map = new Map<string, number>()
  keywords.forEach((k) => {
    map.set(k.keyword, (map.get(k.keyword) || 0) + k.count)
  })
  return Array.from(map.entries())
    .map(([keyword, total]) => ({ keyword, total }))
    .sort((a, b) => b.total - a.total)
}

export function calculateModeDuration(history: ModeHistory): string {
  if (!history.endedAt) return "継続中"
  const start = new Date(history.startedAt).getTime()
  const end = new Date(history.endedAt).getTime()
  const diffMs = end - start
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}時間${minutes}分`
}

export function formatDateTime(isoString: string): string {
  const d = new Date(isoString)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
}
