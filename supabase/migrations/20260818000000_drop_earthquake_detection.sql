-- ============================================================
-- 地震検知機能の削除に伴うクリーンアップ
-- Supabaseダッシュボードの「SQL Editor」から実行する
-- ============================================================

-- earthquake_status テーブルは 20260603000000_earthquake_status.sql で作成されたが、
-- 実装は代わりに ingest_state.site_id=-1 を使っており一度も参照されていないデッドコードのため削除
DROP TABLE IF EXISTS earthquake_status;

-- 地震検知（Vercel Cron）が ingest_state テーブルの site_id=-1 を
-- 緊急モード状態の保存に使っていたセンチネル行を削除
DELETE FROM ingest_state WHERE site_id = -1;
