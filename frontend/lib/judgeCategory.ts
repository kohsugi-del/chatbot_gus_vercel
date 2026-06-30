// lib/judgeCategory.ts
// チャンク化後にClaudeでemergencyカテゴリを自動判定する。
// クライアント設定のcategoryPromptを使い、業種固有のemergency定義に対応する。

import Anthropic from "@anthropic-ai/sdk";
import { getClientConfig } from "./getClientConfig";
import type { CategoryTag } from "@/types/log";

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// categoryPromptのシステム指示（固定部分をキャッシュ対象にする）
const BASE_INSTRUCTION = `あなたはテキスト分類AIです。
指示に従って「normal」「emergency」「both」の1単語のみで回答してください。
余計な説明は不要です。`;

export async function judgeCategory(
  chunk: string,
  clientId: string
): Promise<CategoryTag[]> {
  const config = await getClientConfig(clientId);

  const response = await claude.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 10,
    // 固定部分をプロンプトキャッシュに乗せる
    system: [
      {
        type: "text",
        text: BASE_INSTRUCTION,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `${config.categoryPrompt.trim()}\n\nテキスト：${chunk.slice(0, 500)}`,
      },
    ],
  });

  const raw =
    response.content[0]?.type === "text"
      ? response.content[0].text.trim().toLowerCase()
      : "normal";

  if (raw === "both")      return ["normal", "emergency"];
  if (raw === "emergency") return ["emergency"];
  return ["normal"];
}

// 複数チャンクをまとめて判定（バッチ処理）
export async function judgeCategories(
  chunks: string[],
  clientId: string
): Promise<CategoryTag[][]> {
  return Promise.all(chunks.map((chunk) => judgeCategory(chunk, clientId)));
}
