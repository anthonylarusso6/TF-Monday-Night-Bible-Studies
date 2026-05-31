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
}

export interface UserData {
  liked: Record<string, boolean>;
  notes: Record<string, string>;
  attendance: Record<string, number>;
  drafts: Study[];
}
