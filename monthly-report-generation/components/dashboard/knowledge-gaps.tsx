"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { FileText } from "lucide-react"
import type { MonthlyReport } from "@/lib/mock-data"

interface KnowledgeGapsProps {
  report: MonthlyReport
}

const priorityConfig = {
  high: { label: "高", className: "bg-destructive/15 text-destructive border-destructive/20" },
  medium: { label: "中", className: "bg-chart-4/15 text-chart-4 border-chart-4/20" },
  low: { label: "低", className: "bg-muted text-muted-foreground border-border" },
}

export function KnowledgeGaps({ report }: KnowledgeGapsProps) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold text-foreground tracking-wide">
            ナレッジ改善提案
          </CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          精度向上のために追加すべき行政資料の特定
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-3">
          {report.knowledgeGaps.map((gap) => {
            const pConfig = priorityConfig[gap.priority]
            return (
              <div
                key={gap.topic}
                className="flex flex-col gap-2 rounded-lg border border-border/40 p-3.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {gap.topic}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${pConfig.className}`}
                    >
                      {`優先度：${pConfig.label}`}
                    </Badge>
                  </div>
                  <span className="text-xs font-semibold text-foreground tabular-nums">
                    未回答率 {gap.missRate}%
                  </span>
                </div>
                <Progress value={gap.missRate} className="h-1.5" />
                <p className="text-xs text-muted-foreground">
                  推奨追加資料：{gap.suggestedDocument}
                </p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
