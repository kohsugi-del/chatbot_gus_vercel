"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Settings,
  Upload,
  Clock,
  Users,
  Building2,
  Database,
  Plus,
  X,
  Check,
  AlertCircle,
} from "lucide-react"
import type { MonthlyReport, Recipient } from "@/lib/mock-data"

interface SettingsPanelProps {
  report: MonthlyReport
}

export function SettingsPanel({ report }: SettingsPanelProps) {
  const [municipalityName, setMunicipalityName] = useState(report.municipality.name)
  const [department, setDepartment] = useState(report.municipality.department)
  const [focusAreas, setFocusAreas] = useState(report.municipality.focusAreas.join("、"))
  const [executionDay, setExecutionDay] = useState(report.schedule.executionDay)
  const [executionTime, setExecutionTime] = useState(report.schedule.executionTime)
  const [autoSend, setAutoSend] = useState(report.schedule.autoSend)
  const [recipients, setRecipients] = useState<Recipient[]>(report.schedule.recipients)
  const [jsonInput, setJsonInput] = useState("")
  const [jsonStatus, setJsonStatus] = useState<"idle" | "valid" | "invalid">("idle")
  const [saved, setSaved] = useState(false)

  const handleJsonValidation = () => {
    try {
      const parsed = JSON.parse(jsonInput)
      if (Array.isArray(parsed) && parsed.length > 0) {
        setJsonStatus("valid")
      } else {
        setJsonStatus("invalid")
      }
    } catch {
      setJsonStatus("invalid")
    }
  }

  const handleAddRecipient = () => {
    setRecipients([...recipients, { name: "", email: "", role: "cc" }])
  }

  const handleRemoveRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index))
  }

  const handleRecipientChange = (index: number, field: keyof Recipient, value: string) => {
    const updated = [...recipients]
    updated[index] = { ...updated[index], [field]: value }
    setRecipients(updated)
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Municipality Settings */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold text-foreground tracking-wide">
              自治体基本情報
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Input Data 4: 自治体名、担当部署名、注力施策
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="municipality" className="text-xs text-foreground">自治体名</Label>
                <Input
                  id="municipality"
                  value={municipalityName}
                  onChange={(e) => setMunicipalityName(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="department" className="text-xs text-foreground">担当部署名</Label>
                <Input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="focus" className="text-xs text-foreground">
                注力施策（読点区切り）
              </Label>
              <Input
                id="focus"
                value={focusAreas}
                onChange={(e) => setFocusAreas(e.target.value)}
                placeholder="例: 移住促進、副業推進、子育て支援DX"
                className="text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* JSON Data Input */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold text-foreground tracking-wide">
              対話ログ インポート
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Input Data 1: 当月対話ログ [Query, Answer, Category, Status, Timestamp] のJSON配列
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-3">
            <Textarea
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value)
                setJsonStatus("idle")
              }}
              placeholder={`[
  {
    "query": "子育て支援の申請方法を教えてください",
    "answer": "子育て支援課の窓口またはオンラインで...",
    "category": "福祉",
    "status": "resolved",
    "timestamp": "2026-03-15T10:23:00"
  },
  ...
]`}
              className="font-mono text-xs min-h-[160px]"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {jsonStatus === "valid" && (
                  <Badge variant="outline" className="gap-1 text-[10px] border-accent/30 text-accent">
                    <Check className="h-3 w-3" /> JSON形式: 有効
                  </Badge>
                )}
                {jsonStatus === "invalid" && (
                  <Badge variant="outline" className="gap-1 text-[10px] border-destructive/30 text-destructive">
                    <AlertCircle className="h-3 w-3" /> JSON形式: 不正
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleJsonValidation}>
                  <Check className="h-3.5 w-3.5" />
                  バリデーション
                </Button>
                <Button size="sm" className="gap-1.5 text-xs bg-primary text-primary-foreground">
                  <Upload className="h-3.5 w-3.5" />
                  インポート
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              現在のモックデータ：{report.dialogueLogs.length}件の対話ログがロード済み
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Config */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold text-foreground tracking-wide">
              自動実行スケジュール
            </CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            毎月の自動バッチ処理の実行タイミング設定
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-foreground">実行日</Label>
                <Select value={executionDay} onValueChange={setExecutionDay}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last">毎月最終日</SelectItem>
                    <SelectItem value="25">毎月25日</SelectItem>
                    <SelectItem value="28">毎月28日</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="execTime" className="text-xs text-foreground">実行時刻（JST）</Label>
                <Input
                  id="execTime"
                  type="time"
                  value={executionTime}
                  onChange={(e) => setExecutionTime(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-foreground">自動送信</Label>
                <div className="flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2">
                  <Switch checked={autoSend} onCheckedChange={setAutoSend} />
                  <span className="text-xs text-foreground">
                    {autoSend ? "有効" : "無効"}
                  </span>
                </div>
              </div>
            </div>
            <div className="rounded-md bg-muted/40 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                次回実行予定：2026年{Number(report.reportMonth) + 1}月
                {executionDay === "last" ? "最終日" : `${executionDay}日`} {executionTime}（JST）
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recipients */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold text-foreground tracking-wide">
                送付先管理
              </CardTitle>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleAddRecipient}>
              <Plus className="h-3.5 w-3.5" />
              追加
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            自治体担当者および関連部署。管理者も閲覧可能
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-2">
            {recipients.map((r, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/20 p-2.5">
                <Input
                  value={r.name}
                  onChange={(e) => handleRecipientChange(i, "name", e.target.value)}
                  placeholder="名前"
                  className="text-xs h-8 flex-1"
                />
                <Input
                  value={r.email}
                  onChange={(e) => handleRecipientChange(i, "email", e.target.value)}
                  placeholder="email@example.lg.jp"
                  className="text-xs h-8 flex-[2]"
                />
                <Select
                  value={r.role}
                  onValueChange={(v) => handleRecipientChange(i, "role", v)}
                >
                  <SelectTrigger className="text-xs h-8 w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">主担当</SelectItem>
                    <SelectItem value="cc">CC</SelectItem>
                    <SelectItem value="admin">管理者</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleRemoveRecipient(i)}
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="sr-only">削除</span>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <Separator />
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" className="text-xs">
          リセット
        </Button>
        <Button
          size="sm"
          className="gap-1.5 text-xs bg-primary text-primary-foreground"
          onClick={handleSave}
        >
          {saved ? <Check className="h-3.5 w-3.5" /> : <Settings className="h-3.5 w-3.5" />}
          {saved ? "保存しました" : "設定を保存"}
        </Button>
      </div>
    </div>
  )
}
