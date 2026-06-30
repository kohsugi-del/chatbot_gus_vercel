-- ============================================================
-- earthquake_status テーブル（地震緊急モード状態管理）
-- Supabaseダッシュボードの「SQL Editor」から実行する
-- ============================================================

CREATE TABLE IF NOT EXISTS earthquake_status (
  client_id    TEXT PRIMARY KEY,
  is_active    BOOLEAN NOT NULL DEFAULT FALSE,
  intensity    TEXT,       -- "5+", "6-", "6+", "7" など（気象庁震度表記）
  area         TEXT,       -- 最大震度観測地域
  event_id     TEXT,       -- 気象庁イベントID（重複検知用）
  detected_at  TIMESTAMP WITH TIME ZONE,
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 初期レコード（asahikawa-gas）
INSERT INTO earthquake_status (client_id, is_active)
VALUES ('asahikawa-gas', FALSE)
ON CONFLICT (client_id) DO NOTHING;
