-- sites テーブル（Webサイト管理: 登録済みサイト一覧）
-- chatbot_backend（FastAPI, DATABASE_URL経由でこのSupabase Postgresに直結）が
-- 既に読み書きしている実データテーブル。created_at列だけがまだ存在しないため追加する。
-- Supabase ダッシュボードの「SQL Editor」から実行するか、supabase db push で適用する

CREATE TABLE IF NOT EXISTS sites (
  id             SERIAL PRIMARY KEY,
  url            TEXT NOT NULL,
  scope          TEXT NOT NULL,
  type           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending',
  ingested_urls  INTEGER,
  error_message  TEXT
);

ALTER TABLE sites ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_sites_created_at ON sites (created_at);

-- ロールバック手順（問題発生時のみ実行）
-- DROP TABLE IF EXISTS sites CASCADE;
