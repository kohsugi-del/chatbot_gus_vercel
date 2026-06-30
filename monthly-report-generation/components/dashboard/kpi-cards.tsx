"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
  MessageSquare,
  BotMessageSquare,
  Clock,
  TrendingUp,
} from "lucide-react"
import type { MonthlyReport } from "@/lib/mock-data"

interface KpiCardsProps {
  report: MonthlyReport
}

export function KpiCards({ report }: KpiCardsProps) {
  const monthDiff = (
    ((report.totalDialogues - report.previousMonth.totalDialogues) /
      report.previousMonth.totalDialogues) *
    100
  ).toFixed(1)

  const rateDiff = (
    report.aiResolutionRate - report.previousAiResolutionRate
  ).toFixed(1)

  const cards = [
    {
      title: "総対話数",
      value: report.totalDialogues.toLocaleString(),
      unit: "件",
      change: `前月比 ${Number(monthDiff) > 0 ? "+" : ""}${monthDiff}%`,
      changePositive: Number(monthDiff) > 0,
      icon: MessageSquare,
    },
    {
      title: "AI解決率",
      value: report.aiResolutionRate.toString(),
      unit: "%",
      change: `前月比 ${Number(rateDiff) > 0 ? "+" : ""}${rateDiff}pt`,
      changePositive: Number(rateDiff) > 0,
      icon: BotMessageSquare,
    },
    {
      title: "有人対応削減時間",
      value: report.humanHoursSaved.toString(),
      unit: "時間",
      change: `窓口単価換算`,
      changePositive: true,
      icon: Clock,
    },
    {
      title: "経済効果",
      value: `${(report.costSavingsYen / 10000).toFixed(1)}`,
      unit: "万円",
      change: "人件費削減効果",
      changePositive: true,
      icon: TrendingUp,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-border/60">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground tracking-wide">
                  {card.title}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-foreground tracking-tight">
                    {card.value}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {card.unit}
                  </span>
                </div>
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5">
                <card.icon className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <span
                className={`text-xs font-medium ${
                  card.changePositive
                    ? "text-accent"
                    : "text-destructive"
                }`}
              >
                {card.change}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
