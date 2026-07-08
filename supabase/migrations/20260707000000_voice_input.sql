-- messages テーブルに音声入力フラグ（input_method）を追加
-- Supabase ダッシュボードの「SQL Editor」から実行するか、supabase db push で適用する
-- IF NOT EXISTS で冪等性を確保（何度実行しても安全）・DEFAULT 'text' で既存レコードへの影響ゼロ

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS input_method TEXT NOT NULL DEFAULT 'text';

COMMENT ON COLUMN messages.input_method IS '入力方式: text or voice';

-- 音声入力比率の集計クエリに使用
CREATE INDEX IF NOT EXISTS idx_messages_input_method ON messages (input_method);
