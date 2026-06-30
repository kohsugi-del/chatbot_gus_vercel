"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Flame, Send, Phone, AlertTriangle, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

// Types
export type GasChatbotProps = {
  clientName: string
  phoneNumber: string
  emergencyPhone: string
  businessHours: string
  onSendMessage: (message: string, categoryId: string | null) => Promise<string>
  onFeedback: (value: 1 | -1, messageId: string) => void
}

type Message = {
  id: string
  role: "user" | "bot"
  content: string
  isEmergency?: boolean
}

type Category = {
  id: string
  label: string
  description: string
  fullWidth?: boolean
}

const CATEGORIES: Category[] = [
  { id: "home", label: "ご家庭のお客様", description: "料金・契約・引越しなど" },
  { id: "business", label: "業務用のお客様", description: "業務用契約・設備など" },
  { id: "start-stop", label: "ガスの開栓・閉栓", description: "開始・停止・引越し時の手続き" },
  { id: "equipment", label: "ガス機器", description: "機器の使い方・点検・修理" },
  { id: "company", label: "会社・採用", description: "会社概要・採用情報・IR", fullWidth: true },
]

const EMERGENCY_WORDS = ["ガス漏れ", "異臭", "一酸化炭素", "爆発", "火災"]

function checkEmergency(text: string): boolean {
  return EMERGENCY_WORDS.some((word) => text.includes(word))
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

export function GasChatbot({
  clientName,
  phoneNumber,
  emergencyPhone,
  businessHours,
  onSendMessage,
  onFeedback,
}: GasChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState<string | null>(null)
  const [feedbackResult, setFeedbackResult] = useState<"solved" | "unsolved" | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleCategorySelect = useCallback(
    async (categoryId: string) => {
      setSelectedCategory(categoryId)
      const category = CATEGORIES.find((c) => c.id === categoryId)
      if (!category) return

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: `${category.label}について`,
      }
      setMessages([userMessage])
      setIsLoading(true)

      try {
        const response = await onSendMessage(`${category.label}について`, categoryId)
        const botMessage: Message = {
          id: generateId(),
          role: "bot",
          content: response,
        }
        setMessages((prev) => [...prev, botMessage])
      } catch {
        const errorMessage: Message = {
          id: generateId(),
          role: "bot",
          content: "申し訳ございません。エラーが発生しました。しばらくしてから再度お試しください。",
        }
        setMessages((prev) => [...prev, errorMessage])
      } finally {
        setIsLoading(false)
      }
    },
    [onSendMessage]
  )

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return

    const isEmergency = checkEmergency(inputValue)
    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: inputValue,
      isEmergency,
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)
    setFeedbackGiven(null)
    setFeedbackResult(null)

    try {
      const response = await onSendMessage(inputValue, selectedCategory)
      const botMessage: Message = {
        id: generateId(),
        role: "bot",
        content: response,
        isEmergency,
      }
      setMessages((prev) => [...prev, botMessage])
    } catch {
      const errorMessage: Message = {
        id: generateId(),
        role: "bot",
        content: "申し訳ございません。エラーが発生しました。しばらくしてから再度お試しください。",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [inputValue, isLoading, onSendMessage, selectedCategory])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFeedback = (value: 1 | -1, messageId: string) => {
    setFeedbackGiven(messageId)
    setFeedbackResult(value === 1 ? "solved" : "unsolved")
    onFeedback(value, messageId)
  }

  const lastBotMessage = messages.filter((m) => m.role === "bot").pop()
  const isFirstView = messages.length === 0

  return (
    <Card className="flex h-[80vh] max-h-[700px] w-full max-w-md flex-col overflow-hidden border-border/60 shadow-lg">
      {/* Header */}
      <CardHeader className="flex-shrink-0 border-b border-border/40 bg-primary px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
            <Flame className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-primary-foreground">
              {clientName} お客さまサポート
            </span>
            <span className="text-[10px] text-primary-foreground/70">
              受付時間: {businessHours}
            </span>
          </div>
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {/* First View */}
          {isFirstView && (
            <div className="flex flex-col gap-4">
              {/* Welcome message */}
              <div className="flex gap-2">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Flame className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="rounded-lg rounded-tl-none bg-card border border-border/40 px-3 py-2 text-sm text-foreground shadow-sm">
                  ご用件のカテゴリをお選びください。
                  <br />
                  そのままご質問いただくこともできます。
                </div>
              </div>

              {/* Category cards */}
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id)}
                    className={cn(
                      "flex flex-col gap-1 rounded-lg border border-border/60 bg-card p-3 text-left transition-colors hover:bg-muted/50 hover:border-primary/40",
                      category.fullWidth && "col-span-2"
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">
                      {category.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {category.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat View */}
          {!isFirstView && (
            <div className="flex flex-col gap-3">
              {/* Selected category badge */}
              {selectedCategory && (
                <div className="flex justify-center">
                  <Badge variant="secondary" className="text-[10px]">
                    {CATEGORIES.find((c) => c.id === selectedCategory)?.label}
                  </Badge>
                </div>
              )}

              {/* Messages */}
              {messages.map((message, index) => (
                <div key={message.id}>
                  {/* Emergency alert */}
                  {message.isEmergency && message.role === "user" && (
                    <div className="mb-3 rounded-lg bg-destructive/10 border border-destructive/30 p-3">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-semibold">
                          緊急の場合はすぐにお電話ください
                        </span>
                      </div>
                      <a
                        href={`tel:${emergencyPhone}`}
                        className="mt-2 flex items-center justify-center gap-2 rounded-md bg-destructive py-2 text-destructive-foreground transition-colors hover:bg-destructive/90"
                      >
                        <Phone className="h-4 w-4" />
                        <span className="text-lg font-bold">{emergencyPhone}</span>
                      </a>
                      <p className="mt-1 text-center text-[10px] text-destructive/80">
                        24時間対応
                      </p>
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={cn(
                      "flex gap-2",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "bot" && (
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Flame className="h-3.5 w-3.5 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm",
                        message.role === "user"
                          ? "rounded-tr-none bg-primary text-primary-foreground"
                          : "rounded-tl-none bg-card border border-border/40 text-foreground"
                      )}
                    >
                      {message.content}
                    </div>
                  </div>

                  {/* Feedback buttons (only on last bot message) */}
                  {message.role === "bot" &&
                    lastBotMessage?.id === message.id &&
                    !isLoading &&
                    index === messages.length - 1 && (
                      <div className="mt-2 ml-9">
                        {feedbackGiven === message.id ? (
                          <p className="text-xs text-muted-foreground">
                            {feedbackResult === "solved"
                              ? "お役に立てて良かったです"
                              : "ご不便をおかけして申し訳ございません。お電話でもご相談いただけます。"}
                          </p>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <p className="text-[11px] text-muted-foreground">
                              この回答は参考になりましたか？
                            </p>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 text-xs"
                                onClick={() => handleFeedback(1, message.id)}
                              >
                                <Check className="h-3 w-3" />
                                解決した
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 text-xs"
                                onClick={() => handleFeedback(-1, message.id)}
                              >
                                <X className="h-3 w-3" />
                                解決しなかった
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Phone CTA when unsolved */}
                        {feedbackResult === "unsolved" && (
                          <a
                            href={`tel:${phoneNumber}`}
                            className="mt-2 flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm text-primary transition-colors hover:bg-primary/10"
                          >
                            <Phone className="h-4 w-4" />
                            <span>電話で相談する: {phoneNumber}</span>
                          </a>
                        )}
                      </div>
                    )}
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-2">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Flame className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="rounded-lg rounded-tl-none bg-card border border-border/40 px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input area */}
        <div className="flex-shrink-0 border-t border-border/40 bg-card p-3">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ご質問を入力してください..."
              className="flex-1 text-sm"
              disabled={isLoading}
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="h-9 w-9"
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">送信</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
