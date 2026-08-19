// app/api/sites/[id]/route.ts
// Webサイト管理: 個別サイトの削除

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await supabaseAdmin.from("sites").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ status: "deleted" });
  } catch (e: unknown) {
    const err = e as { message?: string };
    return NextResponse.json({ error: err?.message ?? String(e) }, { status: 500 });
  }
}
