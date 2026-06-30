"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, ArrowRight } from "lucide-react"
import type { MonthlyReport } from "@/lib/mock-data"

interface SilentNeedsProps {
  report: MonthlyReport
}

export function SilentNeeds({ report }: SilentNeedsProps) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-accent" />
          <CardTitle className="text-sm font-semibold text-foreground tracking-wide">
            サイレント・ニーズ
          </CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          AIが回答不能だった質問から導き出される住民の潜在ニーズ
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-3">
          {report.silentNeeds.map((need) => (
            <div
              key={need.question}
              className="rounded-lg border border-border/40 bg-muted/30 p-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    {`「${need.question}」`}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>問い合わせ回数：{need.frequency}回</span>
                  </div>
                </div>
              </div>
              <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-accent">
                <ArrowRight className="h-3 w-3" />
                <span>提案：{need.suggestedAction}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
