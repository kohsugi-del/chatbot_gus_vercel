-- ハイブリッド検索: pg_trgmによるキーワード（トライグラム類似度）検索を追加
-- Supabaseダッシュボードの「SQL Editor」から実行する
-- 既存の match_documents（ベクター検索）は変更しない

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_documents_content_trgm
  ON documents USING gin (content gin_trgm_ops);

-- 注意: pg_trgm.similarity_threshold（デフォルト0.3）に依存する `%` / `<->` 演算子は
-- 使わない。短い日本語クエリ対長文チャンクのtrigram類似度は0.1台が普通で、
-- デフォルト閾値だと該当0件になってしまうため、similarity()を直接ORDER BYする。
CREATE OR REPLACE FUNCTION match_documents_keyword (
  query_text      TEXT,
  match_count     INT  DEFAULT 20,
  filter_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id                 UUID,
  content            TEXT,
  source             TEXT,
  title              TEXT,
  category           TEXT[],
  chunk_strategy     TEXT,
  keyword_similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    d.id, d.content, d.source, d.title, d.category, d.chunk_strategy,
    similarity(d.content, query_text) AS keyword_similarity
  FROM documents d
  WHERE (filter_category IS NULL OR filter_category = ANY(d.category))
  ORDER BY similarity(d.content, query_text) DESC
  LIMIT match_count;
$$;

-- ロールバック手順（問題発生時のみ）
-- DROP FUNCTION IF EXISTS match_documents_keyword(TEXT, INT, TEXT);
-- DROP INDEX IF EXISTS idx_documents_content_trgm;
-- DROP EXTENSION IF EXISTS pg_trgm;
