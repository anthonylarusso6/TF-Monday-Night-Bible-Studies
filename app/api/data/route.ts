import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { LOCATIONS } from "@/lib/locations";
import { requireCoach } from "@/lib/auth";
import { readLocationRow, readStudiesRow, mergeLocationWrite, mergeStudiesWrite, previewsFor, type Row } from "@/lib/dataAccess";

const isStudiesId = (id: string) => id.endsWith("__studies");

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
  // The location row holds prayer requests, leader notes and attendance, so
  // reading is gated as well as writing.
  const auth = await requireCoach(req);
  if (!auth.ok) return auth.response;

  const id = req.nextUrl.searchParams.get("id") || "";
  if (!validId(id)) {
    return NextResponse.json({ ok: false, error: "Unknown id" }, { status: 400 });
  }
  try {
    const { data, error } = await supabaseServer
      .from("user_data").select("*").eq("id", id).single();
    // PGRST116 just means the row doesn't exist yet.
    if (error && error.code !== "PGRST116") throw new Error(error.message);
    const row = (data ?? null) as Row | null;
    const actor = { id: auth.coach.id, role: auth.coach.role };
    if (req.nextUrl.searchParams.get("previews") === "1") {
      // Other coaches' studies, as previews only: the idea, not the breakdown, questions or handout.
      let hidden: string[] = [];
      try { hidden = row?.notes?.hidden ? JSON.parse(row.notes.hidden) : []; } catch { /* none */ }
      return NextResponse.json({ ok: true, previews: isStudiesId(id) ? previewsFor(row, actor, new Set(hidden)) : [] });
    }
    return NextResponse.json({ ok: true, row: isStudiesId(id) ? readStudiesRow(row, actor) : readLocationRow(row, actor) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unavailable" },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireCoach(req);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 }); }

  const id = String(body.id || "");
  if (!validId(id)) {
    return NextResponse.json({ ok: false, error: "Unknown id" }, { status: 400 });
  }

  try {
    // Merge into what is stored rather than replace it: two coaches saving at once both keep their changes, and a
    // coach's save can never remove or overwrite another coach's study or private journal.
    const { data: existing, error: readErr } = await supabaseServer.from("user_data").select("*").eq("id", id).single();
    if (readErr && readErr.code !== "PGRST116") throw new Error(readErr.message);
    const actor = { id: auth.coach.id, role: auth.coach.role };
    const submitted: Row = {
      liked: (body.liked ?? {}) as Row["liked"], notes: (body.notes ?? {}) as Row["notes"],
      attendance: (body.attendance ?? {}) as Row["attendance"], drafts: (body.drafts ?? []) as Row["drafts"],
    };
    const merged = isStudiesId(id)
      ? mergeStudiesWrite((existing ?? null) as Row | null, submitted, actor)
      : mergeLocationWrite((existing ?? null) as Row | null, submitted, actor);
    const { error } = await supabaseServer.from("user_data").upsert({
      id,
      liked: merged.liked ?? {},
      notes: merged.notes ?? {},
      attendance: merged.attendance ?? {},
      drafts: merged.drafts ?? [],
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
