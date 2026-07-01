-- messages テーブルにスマートルーティング・プロンプトキャッシュ統計カラムを追加
-- Supabase ダッシュボードの「SQL Editor」から実行するか、supabase db push で適用する

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS model_used         TEXT,
  ADD COLUMN IF NOT EXISTS complexity_score   FLOAT,
  ADD COLUMN IF NOT EXISTS cache_hit          BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cache_read_tokens  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_cost_jpy FLOAT;

COMMENT ON COLUMN messages.model_used         IS '使用モデル: gemini-2.5-flash-lite or gemini-2.5-flash';
COMMENT ON COLUMN messages.complexity_score   IS '複雑度スコア 0.0〜1.0';
COMMENT ON COLUMN messages.cache_hit          IS 'プロンプトキャッシュがヒットしたか';
COMMENT ON COLUMN messages.cache_read_tokens  IS 'キャッシュから読み込んだトークン数';
COMMENT ON COLUMN messages.estimated_cost_jpy IS '1会話あたりの推定APIコスト（円）';

-- ダッシュボード集計用インデックス
CREATE INDEX IF NOT EXISTS idx_messages_model_used ON messages (model_used);
CREATE INDEX IF NOT EXISTS idx_messages_cache_hit  ON messages (cache_hit);
