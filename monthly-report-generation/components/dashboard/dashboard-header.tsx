"use client"

import { Badge } from "@/components/ui/badge"
import { Building2, Calendar } from "lucide-react"
import type { MonthlyReport } from "@/lib/mock-data"

interface DashboardHeaderProps {
  report: MonthlyReport
}

export function DashboardHeader({ report }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight text-balance">
              自治体DX月次成果報告
            </h1>
            <p className="text-xs text-muted-foreground">
              AI人材マッチングシステム運用ダッシュボード
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1 text-xs">
          <Building2 className="h-3 w-3" />
          {report.municipality.name}
        </Badge>
        <Badge variant="outline" className="gap-1 text-xs">
          <Calendar className="h-3 w-3" />
          {report.reportYear}年{report.reportMonth}月度
        </Badge>
      </div>
    </header>
  )
}
