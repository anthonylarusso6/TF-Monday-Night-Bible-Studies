import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireCoach } from "@/lib/auth";

/**
 * A coach's studies still being written. One private row per coach, keyed by the signed-in coach (never by anything
 * the browser sends), so two coaches writing at once can't overwrite each other and nobody can read someone else's
 * work in progress. Finished studies move to the shared library through the normal save.
 */

export const dynamic = "force-dynamic";

const rowId = (coachId: string) => `_build_${coachId}`;
const MAX_BYTES = 400_000;

export async function GET(req: NextRequest) {
  const auth = await requireCoach(req);
  if (!auth.ok) return auth.response;
  try {
    const { data, error } = await supabaseServer.from("user_data").select("drafts").eq("id", rowId(auth.coach.id)).single();
    if (error && error.code !== "PGRST116") throw new Error(error.message);
    return NextResponse.json({ ok: true, studies: data?.drafts ?? [] });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Unavailable" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireCoach(req);
  if (!auth.ok) return auth.response;

  let body: { studies?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 }); }
  if (!Array.isArray(body.studies)) return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  if (JSON.stringify(body.studies).length > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "That is too much to save at once." }, { status: 413 });
  }

  try {
    const { error } = await supabaseServer.from("user_data").upsert({
      id: rowId(auth.coach.id),
      liked: {}, notes: {}, attendance: {},
      drafts: body.studies,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Unavailable" }, { status: 503 });
  }
}
