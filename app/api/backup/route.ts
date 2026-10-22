import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireCoach } from "@/lib/auth";

/**
 * Daily backup. Copies every row of the app's table (studies, notes, the coach list, versions) into one dated row,
 * `_backup_YYYY-MM-DD`, and keeps the last 14. Vercel Cron calls it once a day; the Creator can also call it by hand.
 * Nothing is returned but counts. Restoring is a manual job (copy a backup's rows back), by design.
 */
export const dynamic = "force-dynamic";
const KEEP = 14;
const PREFIX = "_backup_";

export async function GET(req: NextRequest) {
  const fromCron = (req.headers.get("user-agent") || "").includes("vercel-cron");
  if (!fromCron) {
    const auth = await requireCoach(req, { roles: ["Creator"] });
    if (!auth.ok) return auth.response;
  }
  try {
    const { data, error } = await supabaseServer.from("user_data").select("*");
    if (error) throw new Error(error.message);
    const rows = (data ?? []).filter((r) => !String(r.id).startsWith(PREFIX));
    const day = new Date().toISOString().slice(0, 10);
    const { error: w } = await supabaseServer.from("user_data").upsert({
      id: `${PREFIX}${day}`,
      notes: { rows: String(rows.length), at: new Date().toISOString() },
      liked: {}, attendance: {},
      drafts: rows,
      updated_at: new Date().toISOString(),
    });
    if (w) throw new Error(w.message);

    const old = (data ?? []).map((r) => String(r.id)).filter((id) => id.startsWith(PREFIX)).sort().reverse().slice(KEEP - 1);
    for (const id of old.filter((id) => id !== `${PREFIX}${day}`)) await supabaseServer.from("user_data").delete().eq("id", id);
    return NextResponse.json({ ok: true, day, rows: rows.length, pruned: old.length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Backup failed" }, { status: 503 });
  }
}
