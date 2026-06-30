"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mail, Paperclip, Copy, Check, Send } from "lucide-react"
import { generateEmailSubject, generateEmailBody } from "@/lib/mock-data"
import type { MonthlyReport } from "@/lib/mock-data"

interface EmailPreviewProps {
  report: MonthlyReport
}

export function EmailPreview({ report }: EmailPreviewProps) {
  const subject = generateEmailSubject(report)
  const body = generateEmailBody(report)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const fullEmail = `件名: ${subject}\n\n${body}`
    await navigator.clipboard.writeText(fullEmail)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-semibold text-foreground">自動送付メール</h3>
          <p className="text-xs text-muted-foreground">
            Output Task 1: 自動配信メール本文のプレビュー
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "コピー済み" : "本文コピー"}
          </Button>
          <Button size="sm" className="gap-1.5 text-xs bg-primary text-primary-foreground">
            <Send className="h-3.5 w-3.5" />
            テスト送信
          </Button>
        </div>
      </div>

      {/* Recipient list */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-foreground tracking-wide">
            送付先一覧
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-1.5">
            {report.schedule.recipients.map((r) => (
              <div key={r.email} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">{r.name}</span>
                  <span className="text-xs text-muted-foreground">{r.email}</span>
                </div>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {r.role === "primary" ? "主担当" : r.role === "admin" ? "管理者" : "CC"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Email preview */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold text-foreground tracking-wide">
              メール プレビュー
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-lg border border-border/60 bg-card">
            <div className="flex flex-col gap-2.5 border-b border-border/40 p-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground min-w-[3rem]">
                  件名:
                </span>
                <span className="text-sm font-semibold text-foreground">{subject}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground min-w-[3rem]">
                  宛先:
                </span>
                <span className="text-sm text-foreground">{report.recipientName} 様</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {report.municipality.name}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground min-w-[3rem]">
                  CC:
                </span>
                <span className="text-xs text-muted-foreground">
                  {report.schedule.recipients.filter((r) => r.role !== "primary").map((r) => r.name).join("、")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground min-w-[3rem]">
                  添付:
                </span>
                <div className="flex items-center gap-1 text-sm text-accent">
                  <Paperclip className="h-3.5 w-3.5" />
                  <span className="text-xs">
                    月次レポート_2026年{report.reportMonth}月度.pdf
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed">
                {body}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
