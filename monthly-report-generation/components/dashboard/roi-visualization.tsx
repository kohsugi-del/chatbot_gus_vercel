"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calculator } from "lucide-react"
import { calculateROI } from "@/lib/mock-data"
import type { MonthlyReport } from "@/lib/mock-data"

interface RoiVisualizationProps {
  report: MonthlyReport
}

export function RoiVisualization({ report }: RoiVisualizationProps) {
  const roi = calculateROI(report)

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-accent" />
          <CardTitle className="text-sm font-semibold text-foreground tracking-wide">
            行政コスト削減（ROI）
          </CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          対話件数 x 5分 = 削減時間、人件費換算での経済効果
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-3">
          {/* Formula display */}
          <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
            <p className="text-[10px] font-medium text-accent tracking-wider">
              代替効果の算出
            </p>
            <div className="mt-2 flex flex-col gap-2">
              <div className="flex items-center gap-2 rounded-md bg-card p-2.5">
                <span className="text-[10px] text-muted-foreground min-w-[4rem]">
                  削減時間
                </span>
                <span className="font-mono text-xs font-semibold text-foreground">
                  {roi.formula}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-card p-2.5">
                <span className="text-[10px] text-muted-foreground min-w-[4rem]">
                  経済効果
                </span>
                <span className="font-mono text-xs font-semibold text-foreground">
                  {roi.costFormula}
                </span>
              </div>
            </div>
          </div>

          {/* Summary metrics */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md border border-border/40 bg-muted/30 p-2.5 text-center">
              <span className="text-[10px] text-muted-foreground">削減時間</span>
              <p className="text-base font-bold text-foreground">{roi.totalHoursSaved}<span className="text-xs font-normal text-muted-foreground">時間</span></p>
            </div>
            <div className="rounded-md border border-border/40 bg-muted/30 p-2.5 text-center">
              <span className="text-[10px] text-muted-foreground">経済効果</span>
              <p className="text-base font-bold text-accent">{(roi.costSavings / 10000).toFixed(1)}<span className="text-xs font-normal text-muted-foreground">万円</span></p>
            </div>
            <div className="rounded-md border border-border/40 bg-muted/30 p-2.5 text-center">
              <span className="text-[10px] text-muted-foreground">1件あたり</span>
              <p className="text-base font-bold text-foreground">5<span className="text-xs font-normal text-muted-foreground">分削減</span></p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
