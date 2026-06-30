"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { AlertTriangle } from "lucide-react"
import type { GasDashboardProps } from "@/lib/gas-mock-data"
import { aggregateEmergencyByKeyword } from "@/lib/gas-mock-data"

interface EmergencyKeywordsProps {
  data: GasDashboardProps
}

export function EmergencyKeywords({ data }: EmergencyKeywordsProps) {
  const aggregated = aggregateEmergencyByKeyword(data.emergencyKeywords)
  const totalCount = data.monthlyStats.emergencyKeywordCount

  return (
    <div className="flex flex-col gap-4">
      {/* Summary Card */}
      <Card className="border-border/60 bg-destructive/5">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground tracking-wide">
                今月の緊急ワード検知件数
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-destructive tracking-tight">
                  {totalCount.toLocaleString()}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  件
                </span>
              </div>
            </div>
            <div className="rounded-lg bg-destructive/10 p-2.5">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keyword Breakdown */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground tracking-wide">
            ワード別内訳
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {aggregated.map((item) => (
              <Badge
                key={item.keyword}
                variant="secondary"
                className="gap-1.5 px-3 py-1.5"
              >
                <span className="text-xs">{item.keyword}</span>
                <span className="font-bold text-destructive">{item.total}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Daily Trend Chart */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground tracking-wide">
            日別推移
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            2026年{data.reportMonth}月の緊急ワード検知件数
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.dailyEmergencyTrend}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  axisLine={{ stroke: "var(--color-border)" }}
                  tickLine={false}
                  interval={3}
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
                  formatter={(value: number) => [`${value}件`, "検知件数"]}
                />
                <Bar
                  dataKey="count"
                  fill="var(--color-destructive)"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
