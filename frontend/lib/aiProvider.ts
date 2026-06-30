// lib/aiProvider.ts
// AI_PROVIDER 環境変数で anthropic / google を切り替えるファクトリ
// AI_MODEL 環境変数でモデルIDを上書き可能

import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

export type AiProvider = "anthropic" | "google";

const ANTHROPIC_MODELS = {
  fast:  "claude-haiku-4-5-20251001",
  smart: "claude-sonnet-4-6",
} as const;

const GOOGLE_MODELS = {
  fast:  "gemini-2.5-flash-lite",
  smart: "gemini-2.5-flash",
} as const;

export function getProvider(): AiProvider {
  return process.env.AI_PROVIDER === "google" ? "google" : "anthropic";
}

/** 使用するモデルIDを返す（AI_MODEL 環境変数で上書き可） */
export function getModelId(tier: "fast" | "smart"): string {
  const override = process.env.AI_MODEL ?? process.env.ANTHROPIC_MODEL;
  if (override) return override;
  const provider = getProvider();
  return provider === "google" ? GOOGLE_MODELS[tier] : ANTHROPIC_MODELS[tier];
}

/** LanguageModelV1 インスタンスを返す */
export function buildModel(tier: "fast" | "smart"): LanguageModel {
  const provider = getProvider();
  const modelId = getModelId(tier);
  return provider === "google" ? google(modelId) : anthropic(modelId);
}
