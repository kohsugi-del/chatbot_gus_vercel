# スマートルーティング＋プロンプトキャッシュ 実装プロンプト
# ガス会社向け RAG チャットボット（既存実装への追加）

## 前提
- 既存の RAG チャットボット実装（Next.js / Supabase / Claude API）に追加実装する
- 統合設計書 ver1.2・DB設計書 ver1.1・スマートルーティング詳細設計書 v1.0 に基づく
- 既存コードを必ず確認してから実装を開始すること
- TypeScript で実装すること
- `claude --dangerously-skip-permissions` で実行し、確認プロンプトを省略すること

---

## Step 1：DB マイグレーション（ログカラム追加）

`conversation_logs` テーブルに以下のカラムを追加するマイグレーションファイルを作成してください。

**ファイルパス：** `supabase/migrations/YYYYMMDDHHMMSS_add_smart_routing_columns.sql`

```sql
ALTER TABLE conversation_logs
  ADD COLUMN IF NOT EXISTS model_used           TEXT,
  ADD COLUMN IF NOT EXISTS complexity_score     FLOAT,
  ADD COLUMN IF NOT EXISTS cache_hit            BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cache_read_tokens    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_cost_jpy   FLOAT;

COMMENT ON COLUMN conversation_logs.model_used         IS '使用モデル: claude-haiku-4-5 or claude-sonnet-4-6';
COMMENT ON COLUMN conversation_logs.complexity_score   IS '複雑度スコア 0.0〜1.0';
COMMENT ON COLUMN conversation_logs.cache_hit          IS 'プロンプトキャッシュがヒットしたか';
COMMENT ON COLUMN conversation_logs.cache_read_tokens  IS 'キャッシュから読み込んだトークン数';
COMMENT ON COLUMN conversation_logs.estimated_cost_jpy IS '1会話あたりの推定APIコスト（円）';
```

マイグレーション後に `supabase db push` を実行して適用してください。

---

## Step 2：complexity_score 算出ユーティリティの実装

**ファイルパス：** `lib/smartRouting.ts`

以下の仕様で実装してください。

```typescript
// 型定義
type RagChunk = {
  content: string;
  similarity: number;
  category?: string;
};

// complexity_score 算出
// 以下のシグナルを合算して 0.0〜1.0 に収める
//
// +0.2 : ユーザー入力が 100 文字以上
// +0.2 : RAG チャンクが 3 件以上
// +0.2 : 異なるカテゴリのチャンクが混在
// +0.2 : 「違い」「比較」「なぜ」「どちら」を含む
// +0.1 : 同一セッションで 3 ターン以上
// +0.1 : similarity_score < 0.75 のチャンクが含まれる
export function calcComplexityScore(
  userInput: string,
  ragChunks: RagChunk[],
  sessionTurns: number
): number

// モデル選択
// complexity_score > 0.7 → claude-sonnet-4-6
// それ以外             → claude-haiku-4-5
export function selectModel(complexityScore: number): string

// 推定コスト計算（円）
// 為替レート $1 = ¥155 で計算
// Haiku  : Input $0.80 / Output $4.00 per 1M tokens
// Sonnet : Input $3.00 / Output $15.00 per 1M tokens
// キャッシュ読み込み時は Input コストを 90% 削減
export function estimateCostJpy(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number
): number
```

実装後、各関数のユニットテストを `lib/__tests__/smartRouting.test.ts` に作成してください。
代表的なケース（Haiku判定・Sonnet判定・キャッシュあり・なし）を最低4パターン含めること。

---

## Step 3：プロンプトキャッシュ対応の Claude API 呼び出しに修正

既存の `/api/chat` ルートを確認し、Claude API 呼び出し部分を以下の仕様で修正してください。

**修正方針：**
- システムプロンプト・RAG チャンクテキストに `cache_control: { type: 'ephemeral' }` を付与する
- 会話履歴・ユーザー入力には cache_control を付与しない（毎回変化するため）
- プロンプトの順序：① システムプロンプト（キャッシュ） → ② RAG チャンク（キャッシュ） → ③ 会話履歴 → ④ ユーザー入力

```typescript
// 修正後のリクエスト構造イメージ
const response = await anthropic.messages.create({
  model: selectedModel,  // Step 2 の selectModel() で決定
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: [
        // ① システムプロンプト（キャッシュ対象）
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
        // ② RAG チャンク（キャッシュ対象）
        {
          type: 'text',
          text: ragChunksText,
          cache_control: { type: 'ephemeral' },
        },
        // ③ 会話履歴（キャッシュ対象外）
        {
          type: 'text',
          text: conversationHistory,
        },
        // ④ ユーザー入力（キャッシュ対象外）
        {
          type: 'text',
          text: userInput,
        },
      ],
    },
  ],
});
```

- `response.usage` から `cache_read_input_tokens` を取得し、キャッシュヒット判定に使用すること
  - `cache_read_input_tokens > 0` → `cache_hit = true`

---

## Step 4：/api/chat ルートへのスマートルーティング統合

既存の `/api/chat` ルートに Step 2・Step 3 を統合してください。

**追加する処理フロー：**

```
① 緊急ワード検知（既存ロジック）
   └ 検知あり → 電話番号を即返す（モデル呼び出しなし）

② complexity_score 算出（Step 2）
   - userInput, ragChunks, sessionTurns を渡す

③ モデル選択（Step 2）
   - complexity_score をもとに Haiku / Sonnet を決定

④ Claude API 呼び出し（Step 3）
   - キャッシュ対応済みの構造でリクエスト

⑤ レスポンスから usage を取得
   - input_tokens, output_tokens, cache_read_input_tokens

⑥ 推定コスト計算（Step 2）

⑦ ログ書き込み（既存の conversation_logs INSERT に追記）
   - model_used, complexity_score, cache_hit,
     cache_read_tokens, estimated_cost_jpy を追加
```

---

## Step 5：ダッシュボード統計 API の拡張

既存の `/api/dashboard/stats` ルートに以下の統計を追加してください。

**追加する統計項目：**

```typescript
// 追加するレスポンスフィールド
{
  // モデル使用比率
  modelUsage: {
    haiku: number,   // Haiku 使用会話数
    sonnet: number,  // Sonnet 使用会話数
    haikuRate: number, // Haiku 使用率（%）
  },
  // キャッシュ効果
  cacheStats: {
    hitCount: number,      // キャッシュヒット回数
    hitRate: number,       // キャッシュヒット率（%）
    savedTokens: number,   // 削減トークン数（累計）
  },
  // コスト
  costStats: {
    totalCostJpy: number,   // 月間推定 API コスト合計（円）
    avgCostPerChat: number, // 1 会話あたり平均コスト（円）
    estimatedMonthly: number, // 月末までの推定コスト（外挿）
  },
}
```

SQL は以下を参考に実装してください：

```sql
-- モデル使用比率
SELECT
  model_used,
  COUNT(*) as count
FROM conversation_logs
WHERE client_id = $1
  AND created_at >= date_trunc('month', NOW())
GROUP BY model_used;

-- キャッシュヒット率
SELECT
  COUNT(*) FILTER (WHERE cache_hit = true) AS hit_count,
  COUNT(*) AS total,
  SUM(cache_read_tokens) AS saved_tokens
FROM conversation_logs
WHERE client_id = $1
  AND created_at >= date_trunc('month', NOW());

-- コスト合計
SELECT
  SUM(estimated_cost_jpy) AS total_cost,
  AVG(estimated_cost_jpy) AS avg_cost
FROM conversation_logs
WHERE client_id = $1
  AND created_at >= date_trunc('month', NOW());
```

---

## Step 6：ダッシュボード UI にコスト・ルーティング情報を追加

既存のダッシュボード画面に以下の KPI カードを追加してください。

**追加する KPI カード（3枚）：**

### カード①：モデル使用比率
- タイトル：「モデル使用比率」
- 表示内容：Haiku XX% / Sonnet XX%（プログレスバー）
- 補足：「スマートルーティングにより Sonnet 使用を最小化」

### カード②：キャッシュヒット率
- タイトル：「キャッシュヒット率」
- 表示内容：XX%（大きめフォント）
- 補足：「今月の削減トークン数：XXX,XXX トークン」

### カード③：月間推定 API コスト
- タイトル：「月間 API コスト（推定）」
- 表示内容：¥XX,XXX（大きめフォント）
- 補足：「月末推定：¥XX,XXX」
- 注意：月額 35,000 円の 70% を超えたら黄色、80% を超えたら赤でハイライト

既存の KPI カードと同じデザインコンポーネントを使って実装すること。

---

## Step 7：動作確認・ログ出力

全ての実装が完了したら、以下を確認してください。

1. `npm run build` がエラーなく通ること
2. `npm test` で Step 2 のユニットテストが全パス
3. ローカルで `/api/chat` を叩き、以下をコンソールに出力するログを追加すること
   ```
   [SmartRouting] complexity_score: 0.4, model: claude-haiku-4-5
   [Cache] cache_hit: true, cache_read_tokens: 3200
   [Cost] estimated_cost_jpy: 0.38
   ```
4. Supabase の conversation_logs テーブルに新カラムが記録されていることを確認

---

## 実装上の注意事項

- `cache_control` パラメータは Claude API の Prompt Caching beta 機能。
  anthropic-beta ヘッダーが必要な場合は `anthropic-beta: prompt-caching-2024-07-31` を付与すること
- `response.usage.cache_read_input_tokens` が存在しない（undefined）場合は 0 として扱う
- complexity_score はログに記録するだけでなく、将来の A/B テスト用に必ず保存すること
- 既存の緊急ワード検知ロジック・エスカレーションロジックは一切変更しないこと
- 既存のフィードバックボタン・解決率カラムは変更しないこと
- config/clients/ のクライアント設定ファイルは変更しないこと
```
