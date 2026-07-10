"use client"

import { Card, CardContent } from "@/components/ui/card"
import { CircleDollarSign } from "lucide-react"

// 旭川ガス向け：具体的な金額は見せず、月間予算に対する使用率(%)のみ表示するカード
export function BudgetUsageCard({ rate }: { rate: number }) {
  const color =
    rate >= 80 ? "text-red-600" :
    rate >= 70 ? "text-amber-600" :
    "text-foreground"
  const bg =
    rate >= 80 ? "bg-red-500/5" :
    rate >= 70 ? "bg-amber-500/5" :
    ""
  const iconBg =
    rate >= 80 ? "bg-red-500/10" :
    rate >= 70 ? "bg-amber-500/10" :
    "bg-primary/10"
  const iconColor =
    rate >= 80 ? "text-red-600" :
    rate >= 70 ? "text-amber-600" :
    "text-primary"
  const barColor =
    rate >= 80 ? "bg-red-500" :
    rate >= 70 ? "bg-amber-500" :
    "bg-primary"

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className={`border-border/60 ${bg}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground tracking-wide">月間予算使用率（推定）</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold tracking-tight ${color}`}>
                  {rate.toFixed(1)}
                </span>
                <span className="text-sm font-medium text-muted-foreground">%</span>
              </div>
            </div>
            <div className={`rounded-lg p-2.5 ${iconBg}`}>
              <CircleDollarSign className={`h-5 w-5 ${iconColor}`} />
            </div>
          </div>
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full ${barColor} transition-all`}
                style={{ width: `${Math.min(rate, 100)}%` }}
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">月末時点で見込まれる予算消化率です</p>
        </CardContent>
      </Card>
    </div>
  )
}
