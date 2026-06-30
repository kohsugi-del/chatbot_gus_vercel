import { describe, it, expect } from "vitest";
import { calcComplexityScore, selectModel, estimateCostJpy } from "../smartRouting";

// ── calcComplexityScore ────────────────────────────────────────

describe("calcComplexityScore", () => {
  it("短い入力・少ないチャンク → 低スコア（Haiku判定）", () => {
    const chunks = [{ similarity: 0.9 }];
    const score = calcComplexityScore("料金を教えて", chunks, 1);
    expect(score).toBeLessThanOrEqual(0.4);
  });

  it("長い入力・複数チャンク・比較ワード → 高スコア（Sonnet判定）", () => {
    const chunks = [
      { similarity: 0.9, category: "料金" },
      { similarity: 0.8, category: "安全" },
      { similarity: 0.7, category: "申込" },
    ];
    const score = calcComplexityScore(
      "プロパンガスと都市ガスの違いと料金の比較を詳しく教えてください。どちらがお得ですか？",
      chunks,
      3
    );
    expect(score).toBeGreaterThan(0.7);
  });

  it("スコアは最大 1.0 を超えない", () => {
    const chunks = [
      { similarity: 0.6, category: "a" },
      { similarity: 0.6, category: "b" },
      { similarity: 0.6, category: "c" },
    ];
    const score = calcComplexityScore(
      "なぜ違いがあるのかどちらか比較して100文字以上の質問文をここに入力しています。説明してください。",
      chunks,
      5
    );
    expect(score).toBeLessThanOrEqual(1.0);
  });

  it("緊急ワード検知なし・ターン少 → 0.1〜0.3 程度", () => {
    const chunks = [{ similarity: 0.95 }, { similarity: 0.9 }];
    const score = calcComplexityScore("ガス代の支払い方法は？", chunks, 1);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(0.5);
  });
});

// ── selectModel ────────────────────────────────────────────────

describe("selectModel", () => {
  it("complexity_score > 0.7 → Sonnet", () => {
    expect(selectModel(0.8)).toBe("claude-sonnet-4-6");
    expect(selectModel(1.0)).toBe("claude-sonnet-4-6");
  });

  it("complexity_score <= 0.7 → Haiku", () => {
    expect(selectModel(0.7)).toBe("claude-haiku-4-5-20251001");
    expect(selectModel(0.0)).toBe("claude-haiku-4-5-20251001");
    expect(selectModel(0.4)).toBe("claude-haiku-4-5-20251001");
  });
});

// ── estimateCostJpy ────────────────────────────────────────────

describe("estimateCostJpy", () => {
  it("Haiku・キャッシュなし → Sonnet より安い", () => {
    const haiku  = estimateCostJpy("claude-haiku-4-5-20251001", 5000, 500, 0);
    const sonnet = estimateCostJpy("claude-sonnet-4-6",         5000, 500, 0);
    expect(haiku).toBeLessThan(sonnet);
  });

  it("キャッシュヒット時はコストが大幅に下がる（読み込みは通常の10%）", () => {
    const noCacheHaiku    = estimateCostJpy("claude-haiku-4-5-20251001", 4000, 500, 0,    0);
    const withCacheHaiku  = estimateCostJpy("claude-haiku-4-5-20251001",  400, 500, 3600, 0);
    expect(withCacheHaiku).toBeLessThan(noCacheHaiku);
  });

  it("未知モデルは Sonnet 単価にフォールバック", () => {
    const unknown = estimateCostJpy("claude-unknown", 5000, 500, 0);
    const sonnet  = estimateCostJpy("claude-sonnet-4-6", 5000, 500, 0);
    expect(unknown).toBe(sonnet);
  });

  it("全トークンゼロ → コスト 0", () => {
    expect(estimateCostJpy("claude-haiku-4-5-20251001", 0, 0, 0)).toBe(0);
  });
});
