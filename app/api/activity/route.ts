import { NextRequest, NextResponse } from "next/server";
import { requireCoach } from "@/lib/auth";
import { readActivity } from "@/lib/activity";
import { MANAGER_ROLES } from "@/lib/roles";

export const dynamic = "force-dynamic";

/** The activity log: the Creator only. */
export async function GET(req: NextRequest) {
  const auth = await requireCoach(req, { roles: MANAGER_ROLES });
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ ok: true, entries: await readActivity(150) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Unavailable" }, { status: 503 });
  }
}
