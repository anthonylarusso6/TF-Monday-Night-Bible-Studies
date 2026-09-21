import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { LOCATIONS } from "@/lib/locations";

/**
 * Reads and writes a location's rows through the server, so the browser never
 * needs a key that can modify the database.
 *
 * Row ids are constrained to the shapes the app actually uses. Without that, a
 * crafted id could reach the coach registry and hand back PINs.
 */

export const dynamic = "force-dynamic";

/**
 * Only the rows the app actually owns. A permissive pattern let an
 * unauthenticated caller create unlimited junk rows in the table, so this is a
 * whitelist built from the configured locations instead.
 */
function validId(id: string): boolean {
  return LOCATIONS.some((l) => id === l.id || id === `${l.id}__studies`);
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
