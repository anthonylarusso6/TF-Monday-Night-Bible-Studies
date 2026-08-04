export interface Verse {
  ref: string;
  text: string;
}

export interface BreakdownPhrase {
  ph: string;
  pts: string[];
  co?: { lb: string; tx: string };
}

export interface SupportingBreakdown {
  ref: string;
  pt: string;
}

export interface DiscussionQuestion {
  q: string;
  a: string;
}

export interface Takeaway {
  ti: string;
  bo: string;
}

// ── Imported / section-based studies ──────────────────────────────────────────
// Studies written outside the app (pasted in) keep their original part-by-part
// structure here instead of being forced into the anchor/breakdown shape.

export type SectionBlock =
  | { t: "p"; tx: string }
  | { t: "list"; items: string[]; ord?: boolean }
  | { t: "verse"; ref: string; tx: string }
  | { t: "def"; term: string; tx: string }
  | { t: "q"; tx: string }
  | { t: "table"; cols: [string, string]; rows: [string, string][] }
  | { t: "quote"; tx: string }
  | { t: "callout"; lb: string; tx: string };

export interface StudySection {
  h: string;
  sub?: string;
  blocks: SectionBlock[];
}

export interface Study {
  id: number | string;
  date: string;
  title: string;
  series: string;
  draft: boolean;
  anchor: Verse;
  sup: Verse[];
  bi: string;
  bd: BreakdownPhrase[];
  sbd: SupportingBreakdown[];
  qs: DiscussionQuestion[];
  tk: Takeaway[];
  /** Present on pasted/imported studies — renders instead of bd/sbd. */
  sections?: StudySection[];
  subtitle?: string;
  imported?: boolean;
}

export interface UserData {
  liked: Record<string, boolean>;
  notes: Record<string, string>;
  attendance: Record<string, number>;
  drafts: Study[];
}
