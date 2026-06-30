"""
earthquake_monitor.py
気象庁防災情報APIを5分ごとにポーリングし、震度5強以上を検知したら
Supabaseのearthquake_statusテーブルのis_activeフラグをONにする。
震度情報が消えたら自動でOFFに戻す。

GitHub Actionsから5分ごとに呼び出される想定。
"""

import os
import sys
import requests
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(override=True)

JMA_API_URL = "https://www.jma.go.jp/bosai/quake/data/list.json"

# 震度5強以上（気象庁の震度表記）
INTENSITY_THRESHOLD = {"5+", "6-", "6+", "7"}

# 過去何分以内のイベントを対象にするか
CHECK_WINDOW_MINUTES = 30

CLIENT_ID = os.getenv("CLIENT_ID", "asahikawa-gas")


def get_supabase():
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL") or ""
    key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_ANON_KEY")
        or ""
    )
    if not url or not key:
        print("[earthquake_monitor] SUPABASE_URL or key is missing", file=sys.stderr)
        sys.exit(1)
    return create_client(url, key)


def fetch_jma_quakes() -> list:
    """気象庁APIから最新の地震リストを取得"""
    try:
        resp = requests.get(
            JMA_API_URL,
            timeout=15,
            headers={"User-Agent": "chatbot-emergency-monitor/1.0"},
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"[earthquake_monitor] JMA API fetch failed: {e}", file=sys.stderr)
        return []


def find_active_emergency(events: list) -> dict | None:
    """
    震度5強以上かつ過去30分以内のイベントを探す。
    見つかった場合はイベント情報dictを返す。なければNone。
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=CHECK_WINDOW_MINUTES)

    for event in events:
        maxi = event.get("maxi", "")
        if maxi not in INTENSITY_THRESHOLD:
            continue

        at_str = event.get("at", "")
        try:
            at = datetime.fromisoformat(at_str)
        except Exception:
            continue

        at_utc = at.astimezone(timezone.utc)
        if at_utc < cutoff:
            continue

        return {
            "event_id": event.get("eid") or at_str,
            "intensity": maxi,
            "area": event.get("anm", "不明"),
            "detected_at": at.isoformat(),
        }

    return None


def update_earthquake_status(supabase, is_active: bool, event_info: dict | None):
    """ingest_state テーブルの site_id=-1 レコードで地震ステータスを管理
    status='emergency' → 緊急モード ON
    last_url=震度, last_error=地域名
    """
    data = {
        "site_id": -1,
        "status": "emergency" if is_active else "normal",
        "last_url": event_info["intensity"] if event_info else None,
        "last_error": event_info["area"] if event_info else None,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    result = (
        supabase.table("ingest_state")
        .upsert(data, on_conflict="site_id")
        .execute()
    )

    status_label = "ACTIVE" if is_active else "normal"
    print(
        f"[earthquake_monitor] {status_label} | "
        f"intensity={data.get('last_url')} | area={data.get('last_error')}"
    )
    return result


def main():
    print(f"[earthquake_monitor] start | client={CLIENT_ID}")

    supabase = get_supabase()
    events = fetch_jma_quakes()

    if not events:
        print("[earthquake_monitor] no events fetched, skipping DB update")
        return

    event_info = find_active_emergency(events)
    is_active = event_info is not None

    update_earthquake_status(supabase, is_active, event_info)

    if is_active:
        print(
            f"[earthquake_monitor] EMERGENCY: 震度{event_info['intensity']} "
            f"/ {event_info['area']} / {event_info['detected_at']}"
        )
    else:
        print("[earthquake_monitor] no emergency in the last 30 minutes")


if __name__ == "__main__":
    main()
