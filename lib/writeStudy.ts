import type { Study, BreakdownPhrase, SupportingBreakdown, DiscussionQuestion, Takeaway, Verse } from "./types";

/**
 * Turns a study a coach typed or pasted, in a simple labeled layout, into a Study with the same shape the AI makes.
 * No AI involved: a written study can be printed as a student handout and posted as a social card by any coach.
 *
 * The layout (TEMPLATE below) is just labels at the start of a line. Anything that is not understood is reported in
 * `warnings` rather than dropped silently, and the study is only blocked when it has no title, no anchor verse or no
 * big idea.
 */

export const SERIES = ["Faith & Character", "Identity & Worth", "Relationships", "Heart & Posture"];

export const TEMPLATE = `Title: 
Series: Faith & Character
Verse: John 3:16 (NIV)
Verse text: 
Supporting verse: Romans 5:8 — the verse text here
Big idea: 

Break it down:
Phrase: the phrase from the verse
- first point
- second point
Say this: what you would say to the students

Supporting verse breakdown: Romans 5:8 — what it says and what it means for them

Questions:
Q: first question
A: the answer you would give
Q: second question
A: the answer

Takeaways:
1. Short title — one or two sentences that expand it
2. Short title — expansion
3. Short title — expansion`;

const LABELS = [
  "title", "series", "verse text", "verse", "supporting verse breakdown", "supporting verse", "big idea",
  "break it down", "phrase", "say this", "real-life example", "real life example", "questions", "takeaways", "q", "a",
] as const;

function labelOf(line: string): { label: string; rest: string } | null {
  const m = line.match(/^\s*([A-Za-z][A-Za-z \-]{0,30}?)\s*:\s*(.*)$/);
  if (!m) return null;
  const label = m[1].trim().toLowerCase();
  return (LABELS as readonly string[]).includes(label) ? { label, rest: m[2] } : null;
}

const splitRef = (s: string): Verse => {
  const m = s.match(/^(.+?)\s+[—–-]\s+(.+)$/);
  return m ? { ref: m[1].trim(), text: m[2].trim().replace(/^["“]|["”]$/g, "") } : { ref: s.trim(), text: "" };
};

export interface WriteResult {
  study: Study | null;
  warnings: string[];
}

export function parseWrittenStudy(raw: string, opts: { id: string; date: string; createdBy?: string }): WriteResult {
  const warnings: string[] = [];
  const lines = raw.replace(/\r/g, "").split("\n");

  let title = "", series = "", verseRef = "", verseText = "", bigIdea = "";
  const sup: Verse[] = [];
  const bd: BreakdownPhrase[] = [];
  const sbd: SupportingBreakdown[] = [];
  const qs: DiscussionQuestion[] = [];
  const tk: Takeaway[] = [];

  // What the following unlabeled lines belong to.
  let mode: "none" | "bigidea" | "versetext" | "break" | "questions" | "takeaways" | "q" | "a" | "say" | "sbd" = "none";
  let phrase: BreakdownPhrase | null = null;
  let q: DiscussionQuestion | null = null;
  let calloutLabel = "Say this to your students";

  const append = (prev: string, add: string) => (prev ? prev + " " : "") + add.trim();

  for (const line of lines) {
    if (!line.trim()) continue;
    const l = labelOf(line);
    if (l) {
      switch (l.label) {
        case "title": title = l.rest.trim(); mode = "none"; break;
        case "series": series = l.rest.trim(); mode = "none"; break;
        case "verse": verseRef = l.rest.trim(); mode = "none"; break;
        case "verse text": verseText = l.rest.trim().replace(/^["“]|["”]$/g, ""); mode = "versetext"; break;
        case "supporting verse": if (l.rest.trim()) sup.push(splitRef(l.rest)); mode = "none"; break;
        case "supporting verse breakdown": {
          const v = splitRef(l.rest);
          sbd.push({ ref: v.ref, pt: v.text });
          mode = "sbd"; break;
        }
        case "big idea": bigIdea = l.rest.trim(); mode = "bigidea"; break;
        case "break it down": mode = "break"; break;
        case "phrase": phrase = { ph: l.rest.trim(), pts: [] }; bd.push(phrase); mode = "break"; break;
        case "say this": case "real-life example": case "real life example":
          calloutLabel = l.label === "say this" ? "Say this to your students" : "Real-life example";
          if (phrase) phrase.co = { lb: calloutLabel, tx: l.rest.trim() };
          else warnings.push("A “Say this” came before any Phrase, so it was skipped.");
          mode = "say"; break;
        case "questions": mode = "questions"; break;
        case "q": q = { q: l.rest.trim(), a: "" }; qs.push(q); mode = "q"; break;
        case "a": if (q) q.a = l.rest.trim(); else warnings.push("An answer came before its question, so it was skipped."); mode = "a"; break;
        case "takeaways": mode = "takeaways"; break;
      }
      continue;
    }

    const t = line.trim();
    if (mode === "bigidea") bigIdea = append(bigIdea, t);
    else if (mode === "versetext") verseText = append(verseText, t);
    else if (mode === "break") {
      const bullet = t.match(/^[-•*]\s+(.*)$/);
      if (phrase) phrase.pts.push(bullet ? bullet[1] : t);
      else { phrase = { ph: "Key points", pts: [bullet ? bullet[1] : t] }; bd.push(phrase); }
    } else if (mode === "say" && phrase?.co) phrase.co.tx = append(phrase.co.tx, t);
    else if (mode === "sbd" && sbd.length) sbd[sbd.length - 1].pt = append(sbd[sbd.length - 1].pt, t);
    else if (mode === "q" && q) q.q = append(q.q, t);
    else if (mode === "a" && q) q.a = append(q.a, t);
    else if (mode === "takeaways") {
      const m = t.match(/^(?:\d+[.)]|[-•*])?\s*(.+?)\s+[—–]\s+(.+)$/) || t.match(/^(?:\d+[.)]|[-•*])?\s*(.+?)\s*:\s+(.+)$/);
      if (m) tk.push({ ti: m[1].trim(), bo: m[2].trim() });
      else tk.push({ ti: t.replace(/^(?:\d+[.)]|[-•*])\s*/, ""), bo: "" });
    } else warnings.push(`Not sure where this line goes, so it was left out: “${t.slice(0, 50)}${t.length > 50 ? "…" : ""}”`);
  }

  verseText = verseText.replace(/^["“]|["”]$/g, "").trim();

  const missing: string[] = [];
  if (!title) missing.push("Title");
  if (!verseRef) missing.push("Verse");
  if (!bigIdea) missing.push("Big idea");
  if (missing.length) {
    return { study: null, warnings: [`Add ${missing.join(", ")} first (each on its own line, like “Title: …”).`, ...warnings] };
  }
  if (series && !SERIES.includes(series)) warnings.push(`Series “${series}” is not one of the four, so it was left blank.`);
  if (qs.length === 0) warnings.push("No questions yet. Add lines like “Q: …” and “A: …”.");
  if (tk.length === 0) warnings.push("No takeaways yet. The social card and handout show them.");

  const study: Study = {
    id: opts.id,
    date: opts.date,
    title,
    series: SERIES.includes(series) ? series : "",
    draft: false,
    anchor: { ref: verseRef, text: verseText },
    sup,
    bi: bigIdea,
    bd,
    sbd,
    qs,
    tk,
    ...(opts.createdBy ? { createdBy: opts.createdBy } : {}),
  };
  return { study, warnings };
}
