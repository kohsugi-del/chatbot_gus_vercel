"use client"

import { Card, CardContent } from "@/components/ui/card"
import { MessageSquare, BotMessageSquare } from "lucide-react"
import type { GasDashboardProps } from "@/lib/gas-mock-data"

interface GasKpiCardsProps {
  data: GasDashboardProps
}

export function GasKpiCards({ data }: GasKpiCardsProps) {
  const stats = data.monthlyStats
  const prevMonth = data.conversationTrend[data.conversationTrend.length - 2]
  const monthDiff = prevMonth
    ? (((stats.totalConversations - prevMonth.count) / prevMonth.count) * 100).toFixed(1)
    : "0"

  const cards = [
    {
      title: "総対話数",
      value: stats.totalConversations.toLocaleString('ja-JP'),
      unit: "件",
      change: `前月比 ${Number(monthDiff) > 0 ? "+" : ""}${monthDiff}%`,
      changePositive: Number(monthDiff) >= 0,
      icon: MessageSquare,
    },
    {
      title: "AI解決件数",
      value: stats.resolvedCount.toLocaleString('ja-JP'),
      unit: "件",
      change: `解決率 ${((stats.resolvedCount / stats.totalConversations) * 100).toFixed(1)}%`,
      changePositive: true,
      icon: BotMessageSquare,
    },
  ]

  return (
    <>
      {cards.map((card) => (
        <Card key={card.title} className="border-border/60">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-muted-foreground tracking-wide">{card.title}</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold tracking-tight text-foreground">
                    {card.value}
                  </span>
                  <span className="text-base font-medium text-muted-foreground">{card.unit}</span>
                </div>
              </div>
              <div className="rounded-lg p-3 bg-primary/10">
                <card.icon className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5">
              <span className={`text-sm font-semibold ${card.changePositive ? "text-emerald-600" : "text-slate-500"}`}>
                {card.change}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  )
}
