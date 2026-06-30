"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"
import type { MonthlyReport } from "@/lib/mock-data"

interface KeywordTrendsProps {
  report: MonthlyReport
}

export function KeywordTrends({ report }: KeywordTrendsProps) {
  const sorted = [...report.keywordTrends].sort((a, b) => b.count - a.count)

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground tracking-wide">
          注目キーワード
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          今月急上昇した単語とその背景考察
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-2.5">
          {sorted.map((kw, i) => (
            <div
              key={kw.keyword}
              className="flex items-center justify-between rounded-lg border border-border/40 px-3.5 py-2.5 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    {kw.keyword}
                  </span>
                  <Badge
                    variant="secondary"
                    className="w-fit text-[10px] px-1.5 py-0"
                  >
                    {kw.category}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {kw.count}件
                </span>
                <div
                  className={`flex items-center gap-0.5 text-xs font-medium ${
                    kw.change > 0 ? "text-accent" : "text-destructive"
                  }`}
                >
                  {kw.change > 0 ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  <span>{kw.change > 0 ? "+" : ""}{kw.change}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
