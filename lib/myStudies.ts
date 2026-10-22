import { authFetch } from "./session";
import type { Study } from "./types";

/** A coach's studies still being written: saved on the server (own row) with a copy on this phone as the fallback. */

const lsKey = (coachId: string) => `tf_building_${coachId}`;

function readLocal(coachId: string): Study[] {
  try {
    const raw = localStorage.getItem(lsKey(coachId));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

function writeLocal(coachId: string, studies: Study[]) {
  try { localStorage.setItem(lsKey(coachId), JSON.stringify(studies)); } catch {}
}

/** Newer wins by `updatedAt`, so work typed offline is not replaced by an older server copy. */
type Building = Study & { updatedAt?: number };

export async function loadMyStudies(coachId: string): Promise<{ ok: boolean; studies: Building[] }> {
  const local = readLocal(coachId) as Building[];
  try {
    const res = await authFetch("/api/mystudies", { cache: "no-store" });
    const body = await res.json();
    if (!res.ok || !body.ok) throw new Error(body.error || "failed");
    const byId = new Map<string, Building>();
    for (const s of [...(body.studies as Building[]), ...local]) {
      const prev = byId.get(String(s.id));
      if (!prev || (s.updatedAt ?? 0) > (prev.updatedAt ?? 0)) byId.set(String(s.id), s);
    }
    return { ok: true, studies: [...byId.values()] };
  } catch {
    return { ok: false, studies: local };
  }
}

export async function saveMyStudies(coachId: string, studies: Building[]): Promise<boolean> {
  writeLocal(coachId, studies);
  try {
    const res = await authFetch("/api/mystudies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studies }),
    });
    const body = await res.json().catch(() => ({}));
    return res.ok && !!body.ok;
  } catch {
    return false;
  }
}
