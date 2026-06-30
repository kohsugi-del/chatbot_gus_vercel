"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { HeatmapData } from "@/lib/gas-mock-data"

interface HeatmapChartProps {
  data: HeatmapData[]
}

const DAYS = ["日", "月", "火", "水", "木", "金", "土"]
const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function HeatmapChart({ data }: HeatmapChartProps) {
  // Create a map for quick lookup
  const dataMap = new Map<string, number>()
  let maxCount = 0
  data.forEach((d) => {
    dataMap.set(`${d.dayOfWeek}-${d.hour}`, d.count)
    if (d.count > maxCount) maxCount = d.count
  })

  const getColor = (count: number) => {
    const intensity = count / maxCount
    if (intensity < 0.2) return "bg-primary/10"
    if (intensity < 0.4) return "bg-primary/25"
    if (intensity < 0.6) return "bg-primary/40"
    if (intensity < 0.8) return "bg-primary/60"
    return "bg-primary/80"
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground tracking-wide">
          アクセスヒートマップ
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          曜日・時間帯別のアクセス分布
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Hour labels */}
            <div className="flex mb-1">
              <div className="w-8" />
              {HOURS.filter((h) => h % 3 === 0).map((hour) => (
                <div
                  key={hour}
                  className="text-[10px] text-muted-foreground"
                  style={{ width: "calc((100% - 32px) / 8)" }}
                >
                  {hour}:00
                </div>
              ))}
            </div>
            {/* Grid */}
            <div className="flex flex-col gap-0.5">
              {DAYS.map((day, dayIndex) => (
                <div key={day} className="flex items-center gap-0.5">
                  <div className="w-7 text-[10px] text-muted-foreground text-right pr-1">
                    {day}
                  </div>
                  <div className="flex-1 flex gap-0.5">
                    {HOURS.map((hour) => {
                      const count = dataMap.get(`${dayIndex}-${hour}`) || 0
                      return (
                        <div
                          key={hour}
                          className={`flex-1 h-5 rounded-sm ${getColor(count)} transition-colors hover:ring-1 hover:ring-primary/50`}
                          title={`${day}曜 ${hour}:00 - ${count}件`}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            {/* Legend */}
            <div className="flex items-center justify-end gap-2 mt-3">
              <span className="text-[10px] text-muted-foreground">少</span>
              <div className="flex gap-0.5">
                <div className="w-4 h-3 rounded-sm bg-primary/10" />
                <div className="w-4 h-3 rounded-sm bg-primary/25" />
                <div className="w-4 h-3 rounded-sm bg-primary/40" />
                <div className="w-4 h-3 rounded-sm bg-primary/60" />
                <div className="w-4 h-3 rounded-sm bg-primary/80" />
              </div>
              <span className="text-[10px] text-muted-foreground">多</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
