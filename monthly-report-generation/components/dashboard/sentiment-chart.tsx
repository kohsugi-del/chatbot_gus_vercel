"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { generateChartData } from "@/lib/mock-data"
import type { MonthlyReport } from "@/lib/mock-data"

interface SentimentChartProps {
  report: MonthlyReport
}

export function SentimentChart({ report }: SentimentChartProps) {
  const chartData = generateChartData(report)

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground tracking-wide">
          感情分析
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          カテゴリ別の住民感情傾向（ポジティブ・ニュートラル・ネガティブ）
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData.sentiment}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="category"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "12px",
                  color: "var(--color-foreground)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
              <Bar
                dataKey="ポジティブ"
                fill="var(--color-chart-2)"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="ニュートラル"
                fill="var(--color-chart-4)"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="ネガティブ"
                fill="var(--color-chart-5)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
