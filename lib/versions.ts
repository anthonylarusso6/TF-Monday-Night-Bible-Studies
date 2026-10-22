import { supabaseServer } from "./supabaseServer";
import type { Study } from "./types";

/**
 * Earlier versions of a study, so an edit can be undone. When a study is saved with changes, the version it replaced is
 * kept (the last 10 per study, 300 overall) in one row per location. Server-only.
 */

export interface Version {
  vid: string;
  studyId: string;
  at: string;
  by: string;
  byName: string;
  study: Study;
}

const PER_STUDY = 10;
const TOTAL = 300;
const rowId = (locationId: string) => `${locationId}__versions`;

export async function readVersions(locationId: string): Promise<Version[]> {
  const { data, error } = await supabaseServer.from("user_data").select("drafts").eq("id", rowId(locationId)).single();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return ((data?.drafts ?? []) as Version[]);
}

/** Compare the stored studies with what was just saved; keep the old copy of every study that changed. */
export async function recordVersions(
  locationId: string,
  before: Study[],
  after: Study[],
  actor: { id: string; name: string },
): Promise<void> {
  try {
    const norm = (s: Study) => JSON.stringify({ ...s, createdBy: undefined });
    const now = new Map(after.map((s) => [String(s.id), s]));
    const changed: Study[] = [];
    for (const old of before) {
      const cur = now.get(String(old.id));
      if (cur && norm(cur) !== norm(old)) changed.push(old);
    }
    if (!changed.length) return;
    let list = await readVersions(locationId);
    const at = new Date().toISOString();
    for (const old of changed) {
      list.unshift({ vid: `${Date.now()}_${old.id}`, studyId: String(old.id), at, by: actor.id, byName: actor.name, study: old });
    }
    // Keep the newest PER_STUDY of each study, then the newest TOTAL overall.
    const seen = new Map<string, number>();
    list = list.filter((v) => {
      const n = (seen.get(v.studyId) ?? 0) + 1;
      seen.set(v.studyId, n);
      return n <= PER_STUDY;
    }).slice(0, TOTAL);
    await supabaseServer.from("user_data").upsert({
      id: rowId(locationId), notes: {}, liked: {}, attendance: {}, drafts: list, updated_at: at,
    });
  } catch {
    /* history is a safety net, never a gate on saving */
  }
}
