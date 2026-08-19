// app/api/sites/route.ts
// Webサイト管理（sitesテーブル）のCRUD API

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/sites
// 登録済みサイト一覧を返す
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("sites")
      .select("id, url, scope, type, status, ingested_urls, error_message")
      .order("id", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json(data ?? []);
  } catch (e: unknown) {
    const err = e as { message?: string };
    return NextResponse.json({ error: err?.message ?? String(e) }, { status: 500 });
  }
}

// POST /api/sites
// body: { url: string; scope: string; type: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { url?: string; scope?: string; type?: string };
    if (!body.url || !body.scope || !body.type) {
      return NextResponse.json({ detail: "url, scope, type is required" }, { status: 422 });
    }

    const { data, error } = await supabaseAdmin
      .from("sites")
      .insert({ url: body.url, scope: body.scope, type: body.type, status: "pending" })
      .select("id, url, scope, type, status, ingested_urls, error_message")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json(data);
  } catch (e: unknown) {
    const err = e as { message?: string };
    return NextResponse.json({ detail: err?.message ?? String(e) }, { status: 500 });
  }
}
