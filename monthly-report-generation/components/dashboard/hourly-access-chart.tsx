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
} from "recharts"
import { generateChartData } from "@/lib/mock-data"
import type { MonthlyReport } from "@/lib/mock-data"

interface HourlyAccessChartProps {
  report: MonthlyReport
}

export function HourlyAccessChart({ report }: HourlyAccessChartProps) {
  const chartData = generateChartData(report)

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground tracking-wide">
          時間帯別アクセス分布
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          24時間のアクセスパターン（夜間・休日利用率：{report.usageStats.nightAndHolidayRate}%）
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData.hourlyAccess}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
                interval={2}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
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
              <Bar
                dataKey="アクセス数"
                fill="var(--color-chart-2)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
