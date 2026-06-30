"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { FileText, Download, Printer } from "lucide-react"
import { calculateROI } from "@/lib/mock-data"
import type { MonthlyReport } from "@/lib/mock-data"

interface PdfReportPreviewProps {
  report: MonthlyReport
}

export function PdfReportPreview({ report }: PdfReportPreviewProps) {
  const [downloading, setDownloading] = useState(false)
  const monthDiff = (
    ((report.totalDialogues - report.previousMonth.totalDialogues) /
      report.previousMonth.totalDialogues) *
    100
  ).toFixed(1)
  const topKeyword = [...report.keywordTrends].sort(
    (a, b) => b.change - a.change
  )[0]
  const roi = calculateROI(report)

  const handleDownload = () => {
    setDownloading(true)
    // Generate a text-based report as downloadable file
    const reportText = generateReportText(report, roi, monthDiff, topKeyword)
    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `月次レポート_2026年${report.reportMonth}月度.txt`
    a.click()
    URL.revokeObjectURL(url)
    setTimeout(() => setDownloading(false), 1000)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-semibold text-foreground">PDFレポート構成案</h3>
          <p className="text-xs text-muted-foreground">
            Output Task 2: 自治体会議資料としてそのまま配布可能な構成
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5" />
            印刷
          </Button>
          <Button
            size="sm"
            className="gap-1.5 text-xs bg-primary text-primary-foreground"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download className="h-3.5 w-3.5" />
            {downloading ? "生成中..." : "レポート出力"}
          </Button>
        </div>
      </div>

      <Card className="border-border/60 print:border-none print:shadow-none">
        <CardHeader className="pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold text-foreground tracking-wide">
              レポート プレビュー
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-lg border border-border/60 bg-card overflow-hidden print:border-none">
            {/* Cover page */}
            <div className="bg-primary px-6 py-8 text-primary-foreground">
              <p className="text-xs font-medium tracking-widest opacity-80">
                MONTHLY REPORT
              </p>
              <h2 className="mt-2 text-lg font-bold leading-snug">
                AI人材マッチングシステム
                <br />
                月次運用報告書
              </h2>
              <div className="mt-4 flex flex-col gap-1 text-xs opacity-80">
                <span>
                  対象期間：2026年{report.reportMonth}月1日〜
                  {report.reportMonth}月28日
                </span>
                <span>発行日：{report.analysisDate}</span>
                <span>受託業者：株式会社デジタルガバナンス・パートナーズ</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 text-[10px]">
                  {report.municipality.name}
                </Badge>
                <Badge className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 text-[10px]">
                  {report.municipality.department}
                </Badge>
              </div>
            </div>

            {/* Sections */}
            <div className="flex flex-col gap-0">
              {/* Section 1: Basic Stats (表紙・基本統計) */}
              <div className="border-b border-border/40 p-5">
                <SectionHeader number={1} title="表紙・基本統計" subtitle="Basic Statistics" />
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MetricBlock
                    label="総対話数"
                    value={`${report.totalDialogues.toLocaleString()}件`}
                    sub={`前月比 ${Number(monthDiff) > 0 ? "+" : ""}${monthDiff}%`}
                  />
                  <MetricBlock
                    label="AI解決率"
                    value={`${report.aiResolutionRate}%`}
                    sub={`前月 ${report.previousAiResolutionRate}%`}
                  />
                  <MetricBlock
                    label="夜間・休日利用率"
                    value={`${report.usageStats.nightAndHolidayRate}%`}
                    sub={`ユニークユーザー ${report.usageStats.uniqueUsers}人`}
                  />
                  <MetricBlock
                    label="平均応答時間"
                    value={`${report.usageStats.averageResponseTimeSec}秒`}
                    sub="リアルタイム応答"
                  />
                </div>
                <ChartPlaceholder
                  label="日別対話件数の推移 + 前月比の利用傾向"
                  dataKey="dailyDialogues"
                  data={report.dailyDialogues}
                />
                <ChartPlaceholder
                  label="時間帯別アクセス分布"
                  dataKey="hourlyAccess"
                  data={report.usageStats.hourlyAccess}
                />
              </div>

              <PageBreak />

              {/* Section 2: Insight Analysis (インサイト分析) */}
              <div className="border-b border-border/40 p-5">
                <SectionHeader number={2} title="インサイト分析（住民の深層心理）" subtitle="Citizen Insight Analysis" />

                <div className="mt-3 flex flex-col gap-3">
                  <InsightBlock
                    title="頻出トレンド"
                    content={`テキストマイニングの結果、「${topKeyword.keyword}」が前月比 +${topKeyword.change}%で最大の急上昇。${topKeyword.category}分野への住民関心が急速に高まっている。注力施策「${report.municipality.focusAreas.join("・")}」との関連性を分析。`}
                  />
                  <InsightBlock
                    title="未解決ニーズ"
                    content={`Status "fail" / "partial" のログから${report.silentNeeds.length}件の不足情報を特定。最多は「${report.silentNeeds[0].question}」（${report.silentNeeds[0].frequency}回）。行政情報の追加が急務。`}
                  />
                  <InsightBlock
                    title="感情スコア"
                    content={`防災分野でネガティブ感情が55%と突出。住民の「不安」が高まっている一方、子育て・生活環境分野では「期待」が優勢。情報提供の強化による不安軽減が急務。`}
                  />
                </div>
                <ChartPlaceholder
                  label="カテゴリ別感情分析グラフ"
                  dataKey="sentimentData"
                  data={report.sentimentData}
                />
                <ChartPlaceholder
                  label="キーワードランキンググラフ"
                  dataKey="keywordRanking"
                  data={report.keywordTrends}
                />
              </div>

              <PageBreak />

              {/* Section 3: ROI (行政コスト削減) */}
              <div className="border-b border-border/40 p-5">
                <SectionHeader number={3} title="行政コスト削減（ROI）の可視化" subtitle="Cost Reduction & ROI" />
                <div className="mt-3 rounded-lg border border-accent/30 bg-accent/5 p-4">
                  <p className="text-xs font-semibold text-accent">代替効果の算出</p>
                  <div className="mt-2 flex flex-col gap-2">
                    <div className="rounded-md bg-card p-3">
                      <p className="text-xs text-muted-foreground">削減時間の算出式</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                        {roi.formula}
                      </p>
                    </div>
                    <div className="rounded-md bg-card p-3">
                      <p className="text-xs text-muted-foreground">人件費換算の経済効果</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                        {roi.costFormula}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <MetricBlock
                    label="削減時間"
                    value={`${roi.totalHoursSaved}時間`}
                    sub={`${roi.totalMinutesSaved.toLocaleString()}分`}
                  />
                  <MetricBlock
                    label="経済効果"
                    value={`${(roi.costSavings / 10000).toFixed(1)}万円`}
                    sub="人件費換算"
                  />
                  <MetricBlock
                    label="1件あたり削減"
                    value="5分"
                    sub={`@${report.costPerMinute}円/分`}
                  />
                </div>
              </div>

              <PageBreak />

              {/* Section 4: Improvement Seeds (改善の種) */}
              <div className="border-b border-border/40 p-5">
                <SectionHeader number={4} title="自動抽出された「改善の種」" subtitle="Auto-detected Improvements" />
                <p className="mt-2 text-xs text-muted-foreground">
                  ログから判明した「住民が使いにくいと感じている導線」や「追加すべきFAQ」を3点提案
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {report.knowledgeGaps.slice(0, 3).map((gap) => (
                    <div
                      key={gap.topic}
                      className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2.5"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground">
                          {gap.topic}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          推奨：{gap.suggestedDocument}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground tabular-nums">
                          未回答率 {gap.missRate}%
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            gap.priority === "high"
                              ? "border-destructive/30 text-destructive"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {gap.priority === "high" ? "高" : gap.priority === "medium" ? "中" : "低"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-md bg-muted/30 p-3">
                  <p className="text-xs font-medium text-foreground">
                    Webサイト改修への具体的アドバイス
                  </p>
                  <ul className="mt-1.5 flex flex-col gap-1 text-xs text-muted-foreground">
                    <li>- トップページに「防災情報」へのクイックリンクを設置</li>
                    <li>- 子育て支援ページの導線改善（3クリック以内での到達を目標）</li>
                    <li>- FAQ検索機能の精度向上（あいまい検索対応）</li>
                  </ul>
                </div>
              </div>

              <PageBreak />

              {/* Section 5: Next Month Plan */}
              <div className="p-5">
                <SectionHeader number={5} title="次月の運用方針" subtitle="Next Month Plan" />
                <div className="mt-3 flex flex-col gap-2">
                  <PlanItem
                    title="精度チューニング"
                    description="防災関連FAQの大幅拡充（ペット同伴避難所情報含む）"
                  />
                  <PlanItem
                    title="データ更新"
                    description="夜間救急医療体制一覧のナレッジベース追加（4月第1週予定）"
                  />
                  <PlanItem
                    title="多言語対応"
                    description="英語・中国語・ベトナム語の基本FAQ整備開始"
                  />
                </div>

                {/* Analysis date footer */}
                <Separator className="mt-5 mb-3" />
                <p className="text-xs text-muted-foreground text-right">
                  分析実行日：{report.analysisDate}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// --- Sub-components ---

function PageBreak() {
  return (
    <div className="flex items-center gap-2 px-5 py-1.5 bg-muted/30">
      <Separator className="flex-1" />
      <code className="text-[9px] font-mono text-muted-foreground">[PAGE_BREAK]</code>
      <Separator className="flex-1" />
    </div>
  )
}

function SectionHeader({
  number,
  title,
  subtitle,
}: {
  number: number
  title: string
  subtitle: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
        {number}
      </span>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-[10px] text-muted-foreground tracking-wider">{subtitle}</p>
      </div>
    </div>
  )
}

function MetricBlock({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="rounded-md border border-border/40 bg-muted/30 p-2.5">
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      <p className="text-sm font-bold text-foreground">{value}</p>
      <span className="text-[10px] text-muted-foreground">{sub}</span>
    </div>
  )
}

function InsightBlock({
  title,
  content,
}: {
  title: string
  content: string
}) {
  return (
    <div className="rounded-md bg-muted/30 px-3 py-2.5">
      <span className="text-xs font-semibold text-accent">{`【${title}】`}</span>
      <p className="mt-0.5 text-xs text-foreground leading-relaxed">{content}</p>
    </div>
  )
}

function ChartPlaceholder({
  label,
  dataKey,
  data,
}: {
  label: string
  dataKey: string
  data: unknown
}) {
  const jsonData = JSON.stringify(data, null, 0).slice(0, 120) + "..."
  return (
    <div className="mt-3 rounded-md border border-dashed border-border/60 bg-muted/20 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
          {`[JSON_DATA_FOR_CHART: ${dataKey}]`}
        </code>
      </div>
      <Separator className="my-2" />
      <div className="flex flex-col gap-1">
        <code className="font-mono text-[9px] text-muted-foreground break-all leading-relaxed">
          {jsonData}
        </code>
        <span className="text-[10px] text-muted-foreground">
          PDF生成時にグラフが描画されます
        </span>
      </div>
    </div>
  )
}

function PlanItem({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-muted/30 px-3 py-2.5">
      <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
      <div>
        <span className="text-xs font-semibold text-foreground">{title}</span>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

// --- Report text generator for download ---

function generateReportText(
  report: MonthlyReport,
  roi: ReturnType<typeof calculateROI>,
  monthDiff: string,
  topKeyword: { keyword: string; change: number; category: string }
) {
  return `============================================================
AI人材マッチングシステム 月次運用報告書
============================================================
対象期間：2026年${report.reportMonth}月1日〜${report.reportMonth}月28日
発行日：${report.analysisDate}
自治体：${report.municipality.name} ${report.municipality.department}
受託業者：株式会社デジタルガバナンス・パートナーズ

[PAGE_BREAK]

━━━ 1. 表紙・基本統計 ━━━

  総対話数：${report.totalDialogues.toLocaleString()}件（前月比 ${Number(monthDiff) > 0 ? "+" : ""}${monthDiff}%）
  AI解決率：${report.aiResolutionRate}%（前月 ${report.previousAiResolutionRate}%）
  夜間・休日利用率：${report.usageStats.nightAndHolidayRate}%
  ユニークユーザー：${report.usageStats.uniqueUsers}人
  平均応答時間：${report.usageStats.averageResponseTimeSec}秒

[JSON_DATA_FOR_CHART: ${JSON.stringify({ dailyDialogues: report.dailyDialogues })}]

[PAGE_BREAK]

━━━ 2. インサイト分析（住民の深層心理）━━━

【頻出トレンド】
  「${topKeyword.keyword}」が前月比 +${topKeyword.change}%で急上昇。
  ${topKeyword.category}分野への住民関心が急速に高まっている。

【未解決ニーズ】
${report.silentNeeds.map((n) => `  - ${n.question}（${n.frequency}回）→ ${n.suggestedAction}`).join("\n")}

【感情スコア】
${report.sentimentData.map((s) => `  ${s.category}: ポジティブ${s.positive}% / ニュートラル${s.neutral}% / ネガティブ${s.negative}%`).join("\n")}

[JSON_DATA_FOR_CHART: ${JSON.stringify({ sentiment: report.sentimentData })}]

[PAGE_BREAK]

━━━ 3. 行政コスト削減（ROI）の可視化 ━━━

【代替効果】
  ${roi.formula}
  ${roi.costFormula}

  削減時間合計：${roi.totalHoursSaved}時間
  経済効果：${(roi.costSavings / 10000).toFixed(1)}万円

[PAGE_BREAK]

━━━ 4. 自動抽出された「改善の種」━━━

${report.knowledgeGaps.slice(0, 3).map((g) => `  [${g.priority === "high" ? "高" : g.priority === "medium" ? "中" : "低"}] ${g.topic}（未回答率 ${g.missRate}%）\n    → ${g.suggestedDocument}`).join("\n")}

Webサイト改修への具体的アドバイス：
  - トップページに「防災情報」へのクイックリンクを設置
  - 子育て支援ページの導線改善（3クリック以内での到達を目標）
  - FAQ検索機能の精度向上（あいまい検索対応）

[PAGE_BREAK]

━━━ 5. 次月の運用方針 ━━━

  - 精度チューニング：防災関連FAQの大幅拡充（ペット同伴避難所情報含む）
  - データ更新：夜間救急医療体制一覧のナレッジベース追加（4月第1週予定）
  - 多言語対応：英語・中国語・ベトナム語の基本FAQ整備開始

============================================================
分析実行日：${report.analysisDate}
============================================================`
}
