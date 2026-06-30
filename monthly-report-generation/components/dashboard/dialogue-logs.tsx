"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquare } from "lucide-react"
import type { MonthlyReport } from "@/lib/mock-data"

interface DialogueLogsProps {
  report: MonthlyReport
}

const statusConfig = {
  resolved: { label: "解決", className: "bg-accent/15 text-accent border-accent/20" },
  fail: { label: "未解決", className: "bg-destructive/15 text-destructive border-destructive/20" },
  partial: { label: "部分解決", className: "bg-chart-4/15 text-chart-4 border-chart-4/20" },
}

export function DialogueLogs({ report }: DialogueLogsProps) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold text-foreground tracking-wide">
            対話ログ サンプル
          </CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Input Data 1: 当月の対話ログ（直近{report.dialogueLogs.length}件を表示）
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-2">
          {report.dialogueLogs.map((log, i) => {
            const status = statusConfig[log.status]
            return (
              <div
                key={i}
                className="rounded-lg border border-border/40 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                        {log.category}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${status.className}`}>
                        {status.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(log.timestamp).toLocaleString("ja-JP", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-foreground">
                      Q: {log.query}
                    </p>
                    {log.answer ? (
                      <p className="text-xs text-muted-foreground truncate">
                        A: {log.answer}
                      </p>
                    ) : (
                      <p className="text-xs text-destructive/70 italic">
                        A: （回答なし）
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
