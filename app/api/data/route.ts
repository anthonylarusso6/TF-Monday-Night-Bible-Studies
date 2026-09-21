import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * Reads and writes a location's rows through the server, so the browser never
 * needs a key that can modify the database.
 *
 * Row ids are constrained to the shapes the app actually uses. Without that, a
 * crafted id could reach the coach registry and hand back PINs.
 */

export const dynamic = "force-dynamic";

const ALLOWED_ID = /^[a-z0-9-]+(__studies)?$/;

function validId(id: string): boolean {
  return ALLOWED_ID.test(id) && id !== "_coaches" && !id.startsWith("_");
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!validId(id)) {
    return NextResponse.json({ ok: false, error: "Unknown id" }, { status: 400 });
  }
  try {
    const { data, error } = await supabaseServer
      .from("user_data").select("*").eq("id", id).single();
    // PGRST116 just means the row doesn't exist yet.
    if (error && error.code !== "PGRST116") throw new Error(error.message);
    return NextResponse.json({ ok: true, row: data ?? null });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unavailable" },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 }); }

  const id = String(body.id || "");
  if (!validId(id)) {
    return NextResponse.json({ ok: false, error: "Unknown id" }, { status: 400 });
  }

  try {
    const { error } = await supabaseServer.from("user_data").upsert({
      id,
      liked: body.liked ?? {},
      notes: body.notes ?? {},
      attendance: body.attendance ?? {},
      drafts: body.drafts ?? [],
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unavailable" },
      { status: 503 }
    );
  }
}
