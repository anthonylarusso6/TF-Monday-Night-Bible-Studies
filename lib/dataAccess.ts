import type { Study } from "./types";

/**
 * Who may read and write what in the shared rows, decided on the server so a coach's browser never receives data it
 * should not show, and one coach's save cannot erase another's.
 *
 * Studies row: a coach gets their own studies in full; everyone else's arrive only as previews. The Creator gets all.
 * Location row: the Creator and coaches share likes, notes, attendance and prayers, but a coach's private journal and
 * profile (keys `_coach_journal_<id>` / `_coach_profile_<id>`) are only ever sent to that coach.
 * Writes merge into what is stored instead of replacing it, so two coaches saving at the same moment both keep their
 * changes.
 *
 * Pure functions, tested in scripts/test-data-access.mjs.
 */

export interface Actor { id: string; role: string }
export interface Row {
  id?: string;
  liked?: Record<string, boolean>;
  notes?: Record<string, string>;
  attendance?: Record<string, number>;
  drafts?: Study[];
  [k: string]: unknown;
}

const isCreator = (a: Actor) => a.role === "Creator";
const PRIVATE_PREFIXES = ["_coach_journal_", "_coach_profile_"];

/** The coach a private key belongs to, or null for an ordinary key. */
function privateOwner(key: string): string | null {
  for (const p of PRIVATE_PREFIXES) if (key.startsWith(p)) return key.slice(p.length);
  return null;
}

// ── Location row (liked / notes / attendance / drafts) ───────────────────────

export function readLocationRow(row: Row | null, actor: Actor): Row | null {
  if (!row) return row;
  const notes: Record<string, string> = {};
  for (const [k, v] of Object.entries(row.notes ?? {})) {
    const owner = privateOwner(k);
    if (owner === null || owner === actor.id) notes[k] = v;
  }
  return { ...row, notes };
}

export function mergeLocationWrite(existing: Row | null, submitted: Row, actor: Actor): Row {
  const old = existing ?? {};
  const notes: Record<string, string> = { ...(old.notes ?? {}) };
  for (const [k, v] of Object.entries(submitted.notes ?? {})) {
    const owner = privateOwner(k);
    // Someone else's journal is never written from here, whatever the browser sent.
    if (owner !== null && owner !== actor.id) continue;
    notes[k] = v;
  }
  const byId = new Map<string, Study>();
  for (const d of [...(old.drafts ?? []), ...(submitted.drafts ?? [])]) byId.set(String(d.id), d);
  return {
    liked: { ...(old.liked ?? {}), ...(submitted.liked ?? {}) },
    notes,
    attendance: { ...(old.attendance ?? {}), ...(submitted.attendance ?? {}) },
    drafts: [...byId.values()],
  };
}

// ── Studies row (the shared library) ─────────────────────────────────────────

const owns = (s: Study, a: Actor) => isCreator(a) || s.createdBy === a.id;

/** What an other-coach study shows: the idea, never the breakdown, questions or handout. */
export function previewOf(s: Study): Study {
  return {
    id: s.id, date: s.date, title: s.title, series: s.series, draft: false,
    anchor: s.anchor, sup: [], bi: s.bi, bd: [], sbd: [], qs: [],
    tk: (s.tk ?? []).map((t) => ({ ti: t.ti, bo: "" })),
    createdBy: s.createdBy,
  };
}

export function readStudiesRow(row: Row | null, actor: Actor): Row | null {
  if (!row || isCreator(actor)) return row;
  return { ...row, drafts: (row.drafts ?? []).filter((s) => s.createdBy === actor.id) };
}

export function previewsFor(row: Row | null, actor: Actor, hidden: Set<string>): Study[] {
  if (!row || isCreator(actor)) return [];
  return (row.drafts ?? [])
    .filter((s) => !s.draft && s.createdBy !== actor.id && !hidden.has(String(s.id)))
    .map(previewOf);
}

export function mergeStudiesWrite(existing: Row | null, submitted: Row, actor: Actor): Row {
  const old = existing ?? {};
  const byId = new Map<string, Study>();
  for (const s of old.drafts ?? []) byId.set(String(s.id), s);
  for (const s of submitted.drafts ?? []) {
    const prev = byId.get(String(s.id));
    // A new study is accepted as the actor's own; an existing one can only be replaced by its owner.
    if (!prev) byId.set(String(s.id), isCreator(actor) ? s : { ...s, createdBy: actor.id });
    else if (owns(prev, actor)) byId.set(String(s.id), isCreator(actor) ? s : { ...s, createdBy: prev.createdBy ?? actor.id });
  }

  const parse = (n?: Record<string, string>): string[] => {
    try { return n?.hidden ? JSON.parse(n.hidden) : []; } catch { return []; }
  };
  const oldHidden = parse(old.notes);
  const subHidden = parse(submitted.notes);
  // Anyone can add to the hidden list for their own studies; they cannot hide (delete) another coach's.
  const allowed = new Set([...byId.values()].filter((s) => owns(s, actor)).map((s) => String(s.id)));
  const hidden = new Set(oldHidden);
  for (const h of subHidden) if (allowed.has(h) || isCreator(actor) || !byId.has(h)) hidden.add(h);

  return {
    drafts: [...byId.values()],
    notes: { hidden: JSON.stringify([...hidden]), goal: submitted.notes?.goal ?? old.notes?.goal ?? "20" },
    liked: {}, attendance: {},
  };
}
