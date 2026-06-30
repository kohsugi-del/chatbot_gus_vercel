"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Zap, Layers, CircleDollarSign } from "lucide-react"

export type SmartRoutingStats = {
  modelUsage: {
    haiku: number
    sonnet: number
    haikuRate: number
  }
  cacheStats: {
    hitCount: number
    hitRate: number
    savedTokens: number
  }
  costStats: {
    totalCostJpy: number
    avgCostPerChat: number
    estimatedMonthly: number
  }
}

const MONTHLY_BUDGET = 35_000

export function SmartRoutingKpiCards({ stats }: { stats: SmartRoutingStats }) {
  const { modelUsage, cacheStats, costStats } = stats

  // 月間コストのアラート色（70%→黄、80%→赤）
  const budgetRatio = costStats.estimatedMonthly / MONTHLY_BUDGET
  const costColor =
    budgetRatio >= 0.8 ? "text-red-600" :
    budgetRatio >= 0.7 ? "text-amber-600" :
    "text-foreground"
  const costBg =
    budgetRatio >= 0.8 ? "bg-red-500/5" :
    budgetRatio >= 0.7 ? "bg-amber-500/5" :
    ""

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* カード①：モデル使用比率 */}
      <Card className="border-border/60">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground tracking-wide">モデル使用比率</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {modelUsage.haikuRate.toFixed(1)}
                </span>
                <span className="text-sm font-medium text-muted-foreground">% Haiku</span>
              </div>
            </div>
            <div className="rounded-lg p-2.5 bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
          </div>
          {/* プログレスバー */}
          <div className="mt-3">
            <div className="flex h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${modelUsage.haikuRate}%` }}
              />
              <div
                className="bg-blue-500 transition-all"
                style={{ width: `${100 - modelUsage.haikuRate}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
              <span className="text-emerald-600 font-medium">Haiku {modelUsage.haiku}件</span>
              <span className="text-blue-600 font-medium">Sonnet {modelUsage.sonnet}件</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">スマートルーティングにより Sonnet 使用を最小化</p>
        </CardContent>
      </Card>

      {/* カード②：キャッシュヒット率 */}
      <Card className="border-border/60">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground tracking-wide">キャッシュヒット率</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {cacheStats.hitRate.toFixed(1)}
                </span>
                <span className="text-sm font-medium text-muted-foreground">%</span>
              </div>
            </div>
            <div className="rounded-lg p-2.5 bg-primary/10">
              <Layers className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-xs font-semibold text-emerald-600">
              今月の削減トークン数：{cacheStats.savedTokens.toLocaleString("ja-JP")} トークン
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">キャッシュヒット {cacheStats.hitCount} 回</p>
        </CardContent>
      </Card>

      {/* カード③：月間推定APIコスト */}
      <Card className={`border-border/60 ${costBg}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground tracking-wide">月間 API コスト（推定）</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold tracking-tight ${costColor}`}>
                  ¥{costStats.totalCostJpy.toLocaleString("ja-JP")}
                </span>
              </div>
            </div>
            <div className={`rounded-lg p-2.5 ${budgetRatio >= 0.8 ? "bg-red-500/10" : budgetRatio >= 0.7 ? "bg-amber-500/10" : "bg-primary/10"}`}>
              <CircleDollarSign className={`h-5 w-5 ${budgetRatio >= 0.8 ? "text-red-600" : budgetRatio >= 0.7 ? "text-amber-600" : "text-primary"}`} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className={`text-xs font-semibold ${costColor}`}>
              月末推定：¥{costStats.estimatedMonthly.toLocaleString("ja-JP")}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            1会話あたり平均 ¥{costStats.avgCostPerChat.toFixed(3)} / 予算 ¥{MONTHLY_BUDGET.toLocaleString("ja-JP")}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
