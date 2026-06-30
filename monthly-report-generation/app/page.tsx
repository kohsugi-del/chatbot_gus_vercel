"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building2, Download } from "lucide-react"
import { mockGasDashboard } from "@/lib/gas-mock-data"
import { GasKpiCards } from "@/components/gas-dashboard/gas-kpi-cards"
import { PhoneEscalationCard } from "@/components/gas-dashboard/phone-escalation-card"
import { ConversationTrendChart } from "@/components/gas-dashboard/conversation-trend-chart"
import { HeatmapChart } from "@/components/gas-dashboard/heatmap-chart"
import { EmergencyKeywords } from "@/components/gas-dashboard/emergency-keywords"
import { TopicDistributionChart } from "@/components/gas-dashboard/distribution-charts"
import { TopQuestionsList, TopDocsList, UnusedDocsList } from "@/components/gas-dashboard/docs-lists"
import { SavingsWidget } from "@/components/gas-dashboard/savings-widget"
import { ModeHistoryList } from "@/components/gas-dashboard/mode-history"

// Available years/months for selection
const YEARS = [2024, 2025, 2026]
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export default function GasDashboardPage() {
  const data = mockGasDashboard
  const [selectedYear, setSelectedYear] = useState(data.reportYear)
  const [selectedMonth, setSelectedMonth] = useState(parseInt(data.reportMonth))

  const handleCsvDownload = () => {
    // Generate CSV content from dashboard data
    const csvRows = [
      ["項目", "値"],
      ["対象年月", `${selectedYear}年${selectedMonth}月`],
      ["総会話数", data.monthlyStats.totalConversations],
      ["AI解決率", `${data.monthlyStats.aiResolutionRate}%`],
      ["解決件数", data.monthlyStats.resolvedCount],
      ["平均応答時間", `${data.monthlyStats.avgResponseTime}秒`],
      ["ユニークユーザー数", data.monthlyStats.uniqueUsers],
      ["電話誘導率", `${data.phoneEscalation.rate}%`],
      ["電話誘導件数", data.phoneEscalation.count],
      ["緊急ワード検知件数", data.emergencyKeywords.reduce((sum, k) => sum + k.count, 0)],
      [""],
      ["トピック分布"],
      ...data.topicDistribution.map((t) => [t.label, `${t.value}%`]),
      [""],
      ["緊急ワード別件数"],
      ...data.emergencyKeywords.map((k) => [k.keyword, k.count]),
      [""],
      ["よくある質問TOP5"],
      ...data.topQuestions.map((q, i) => [`${i + 1}. ${q.question}`, q.count]),
      [""],
      ["参照ドキュメントTOP5"],
      ...data.topDocs.map((d, i) => [`${i + 1}. ${d.title}`, d.refCount]),
      [""],
      ["未使用ドキュメント"],
      ...data.unusedDocs.map((d) => [d.title, `未使用日数: ${d.unusedDays}日`]),
    ]
    const csvContent = csvRows.map((row) => row.join(",")).join("\n")
    const bom = "\uFEFF"
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ガス会社AIチャット_${selectedYear}年${selectedMonth}月度.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              AIチャットボット運用ダッシュボード
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              ガス会社向け月次レポート
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1 text-xs">
              <Building2 className="h-3 w-3" />
              ガス会社
            </Badge>
            {/* Year/Month Selector */}
            <div className="flex items-center gap-1">
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="h-7 w-[80px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger className="h-7 w-[70px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m} value={m.toString()}>
                      {m}月
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* CSV Download Button */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={handleCsvDownload}
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="mt-6 flex flex-col gap-5">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="sm:col-span-3">
              <GasKpiCards data={data} />
            </div>
            <div>
              <PhoneEscalationCard data={data} />
            </div>
          </div>

          {/* Charts Row 1: Trend + Heatmap */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ConversationTrendChart data={data.conversationTrend} />
            <HeatmapChart data={data.heatmapData} />
          </div>

          {/* Emergency Keywords Section */}
          <EmergencyKeywords data={data} />

          {/* Topic Distribution */}
          <TopicDistributionChart data={data.topicDistribution} />

          {/* Questions and Docs */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <TopQuestionsList questions={data.topQuestions} />
            <TopDocsList docs={data.topDocs} />
          </div>

          {/* Unused Docs */}
          <UnusedDocsList docs={data.unusedDocs} />

          {/* Savings Widget */}
          <SavingsWidget resolvedCount={data.monthlyStats.resolvedCount} />

          {/* Mode History */}
          <ModeHistoryList history={data.modeHistory} />
        </div>

        {/* Footer */}
        <footer className="mt-8 border-t border-border/40 pt-4 pb-6">
          <p className="text-center text-xs text-muted-foreground">
            {`${data.reportYear}年${data.reportMonth}月度 月次運用レポート | ガス会社AIチャットボット | CONFIDENTIAL`}
          </p>
        </footer>
      </div>
    </div>
  )
}
