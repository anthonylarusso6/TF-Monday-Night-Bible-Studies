import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireCoach } from "@/lib/auth";
import { LOCATIONS } from "@/lib/locations";
import { readVersions } from "@/lib/versions";

export const dynamic = "force-dynamic";

/**
 * The saved earlier versions of one study. Only the coach who made it, or the Creator, can list or read them.
 * GET /api/versions?location=<id>&studyId=<id>
 */
export async function GET(req: NextRequest) {
  const auth = await requireCoach(req);
  if (!auth.ok) return auth.response;
  const location = req.nextUrl.searchParams.get("location") || "";
  const studyId = req.nextUrl.searchParams.get("studyId") || "";
  if (!LOCATIONS.some((l) => l.id === location) || !studyId || (auth.coach.role !== "Creator" && !(auth.coach.locationIds ?? [auth.coach.locationId]).includes(location))) {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
  try {
    const { data } = await supabaseServer.from("user_data").select("drafts").eq("id", `${location}__studies`).single();
    const study = ((data?.drafts ?? []) as { id: string | number; createdBy?: string }[]).find((s) => String(s.id) === studyId);
    const mine = !!study && (auth.coach.role === "Creator" || study.createdBy === auth.coach.id);
    if (!mine) return NextResponse.json({ ok: true, versions: [] });
    const versions = (await readVersions(location)).filter((v) => v.studyId === studyId);
    return NextResponse.json({ ok: true, versions });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Unavailable" }, { status: 503 });
  }
}
