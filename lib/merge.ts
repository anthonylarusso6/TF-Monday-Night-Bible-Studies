import type { Study, UserData, StudyStore } from "./types";

/**
 * Combines a server library with whatever this device is holding. Neither side
 * loses an entry.
 *
 * Replacing local with the server's copy is only safe when the server is the
 * complete record. It isn't here: every device accumulated studies locally
 * while saves were failing, so each holds studies no other device has and the
 * server has no backup. A straight overwrite would delete whichever set loaded
 * second, permanently. Union instead, and let deletes stay deleted by unioning
 * hiddenIds too.
 */
export function mergeStores(server: StudyStore, local: StudyStore): StudyStore {
  const byId = new Map<string, Study>();
  // Server first so it wins an id collision; local-only studies still survive.
  for (const study of [...server.studies, ...local.studies]) {
    const key = String(study.id);
    if (!byId.has(key)) byId.set(key, study);
  }
  // Ids are creation timestamps, so this keeps newest-first ordering.
  const rank = (st: Study) => { const n = Number(st.id); return Number.isFinite(n) ? n : 0; };
  const studies = [...byId.values()].sort((a, b) => rank(b) - rank(a));

  return {
    studies,
    hiddenIds: [...new Set([...server.hiddenIds, ...local.hiddenIds])],
    goal: server.goal || local.goal,
  };
}

/** Same union, for the per-session row. Drafts are written by hand — never drop one. */
export function mergeUserData(server: UserData, local: UserData): UserData {
  const byId = new Map<string, Study>();
  for (const draft of [...(server.drafts || []), ...(local.drafts || [])]) {
    const key = String(draft.id);
    if (!byId.has(key)) byId.set(key, draft);
  }
  return {
    // Local keys fill gaps the server doesn't have; the server wins conflicts.
    liked: { ...local.liked, ...server.liked },
    notes: { ...local.notes, ...server.notes },
    attendance: { ...local.attendance, ...server.attendance },
    drafts: [...byId.values()],
  };
}
