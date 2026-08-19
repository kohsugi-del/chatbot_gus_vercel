// =============================================
// ガス会社向けダッシュボード用の型定義
// =============================================

export interface MonthlyStats {
  totalConversations: number
  resolvedCount: number
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

export interface TopicDistribution {
  label: string
  value: number
}

export interface GasDashboardProps {
  clientId: string
  monthlyStats: MonthlyStats
  conversationTrend: ConversationTrend[]
  heatmapData: HeatmapData[]
  topQuestions: TopQuestion[]
  topDocs: TopDoc[]
  unusedDocs: UnusedDoc[]
  topicDistribution: TopicDistribution[]
  reportMonth: string
  reportYear: number
}
