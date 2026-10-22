import { supabaseServer } from "./supabaseServer";

/**
 * A running record of who did what, for the Creator's Admin screen: sign-ins, sign-ups, approvals, suspensions,
 * PIN changes, studies made, edited or removed, and every use of the AI. Newest first, the last 400 kept.
 * Server-only. A failure to write it never blocks the thing being logged.
 */

const ID = "_activity";
const KEEP = 400;

export interface ActivityEntry {
  at: string;
  coachId: string;
  name: string;
  action: string;
  detail: string;
}

async function readAll(): Promise<ActivityEntry[]> {
  const { data, error } = await supabaseServer.from("user_data").select("notes").eq("id", ID).single();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  try {
    const raw = (data?.notes as Record<string, string> | null)?.list;
    return raw ? (JSON.parse(raw) as ActivityEntry[]) : [];
  } catch {
    return [];
  }
}

export async function logActivity(e: Omit<ActivityEntry, "at">): Promise<void> {
  try {
    const list = await readAll();
    list.unshift({ ...e, at: new Date().toISOString(), detail: e.detail.slice(0, 200) });
    await supabaseServer.from("user_data").upsert({
      id: ID,
      notes: { list: JSON.stringify(list.slice(0, KEEP)) },
      liked: {}, attendance: {}, drafts: [],
      updated_at: new Date().toISOString(),
    });
  } catch {
    /* the log is a convenience, never a gate */
  }
}

export async function readActivity(limit = 100): Promise<ActivityEntry[]> {
  return (await readAll()).slice(0, limit);
}
