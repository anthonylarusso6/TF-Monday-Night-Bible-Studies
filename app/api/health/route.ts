import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, usingServiceKey } from "@/lib/supabaseServer";

/**
 * Reports whether the server has its own database key and can actually use it.
 * Deliberately reports only booleans, a count and timestamps — never the key.
 *
 * Also the daily keep-alive. Free Supabase projects pause after about a week
 * without activity. Vercel's cron calls this once a day; on those calls it
 * writes a heartbeat row, which is unambiguous database activity and leaves a
 * record of the last run — Vercel's own logs on this plan don't last long
 * enough to show whether the cron is actually firing.
 */
export const dynamic = "force-dynamic";

const HEARTBEAT_ID = "_heartbeat";

export async function GET(req: NextRequest) {
  let canRead = false;
  let rows = 0;
  let error: string | null = null;
  let lastKeepAlive: string | null = null;

  const fromCron = (req.headers.get("user-agent") || "").includes("vercel-cron");

  try {
    if (fromCron) {
      const { error: w } = await supabaseServer.from("user_data").upsert({
        id: HEARTBEAT_ID,
        notes: { last: new Date().toISOString(), by: "vercel-cron" },
        liked: {}, attendance: {}, drafts: [],
        updated_at: new Date().toISOString(),
      });
      if (w) throw new Error(w.message);
    }

    const { data, error: e } = await supabaseServer.from("user_data").select("id");
    if (e) throw new Error(e.message);
    canRead = true;
    rows = (data ?? []).filter((r) => r.id !== HEARTBEAT_ID).length;

    // Only the heartbeat row's contents — never the library or the registry.
    const { data: hb } = await supabaseServer
      .from("user_data").select("notes").eq("id", HEARTBEAT_ID).maybeSingle();
    lastKeepAlive = (hb?.notes as Record<string, string> | undefined)?.last ?? null;
  } catch (e) {
    error = e instanceof Error ? e.message : "unknown";
  }

  return NextResponse.json({
    usingServiceKey,
    canRead,
    rows,
    error,
    readyToLockDown: usingServiceKey && canRead,
    lastKeepAlive,
  });
}
