"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Clock, ExternalLink } from "lucide-react"
import type { TopDoc, UnusedDoc, TopQuestion } from "@/lib/gas-mock-data"

interface TopQuestionsListProps {
  questions: TopQuestion[]
}

export function TopQuestionsList({ questions }: TopQuestionsListProps) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground tracking-wide">
          よくある質問 TOP8
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-2">
          {questions.slice(0, 8).map((q, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground w-5">
                  {index + 1}.
                </span>
                <span className="text-sm text-foreground line-clamp-1">
                  {q.content}
                </span>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                {q.count.toLocaleString()}件
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface TopDocsListProps {
  docs: TopDoc[]
}

export function TopDocsList({ docs }: TopDocsListProps) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold text-foreground tracking-wide">
            よく参照されるドキュメント
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-2">
          {docs.map((doc, index) => (
            <a
              key={index}
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-md border border-border/40 bg-card px-3 py-2 transition-colors hover:bg-muted/50"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  {doc.title}
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {doc.source}
                </span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <Badge variant="outline" className="text-xs">
                  {doc.referenceCount.toLocaleString()}回参照
                </Badge>
              </div>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface UnusedDocsListProps {
  docs: UnusedDoc[]
}

export function UnusedDocsList({ docs }: UnusedDocsListProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "参照なし"
    const d = new Date(dateStr)
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold text-foreground tracking-wide">
            未使用ドキュメント
          </CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          長期間参照されていないドキュメント
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {docs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            未使用ドキュメントはありません
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {docs.map((doc, index) => (
              <a
                key={index}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/50"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-foreground flex items-center gap-1.5">
                    {doc.title}
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {doc.source}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  最終参照: {formatDate(doc.lastReferencedAt)}
                </span>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
