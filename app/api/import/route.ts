import { NextRequest, NextResponse } from "next/server";
import { generate, parseJSON } from "@/lib/gemini";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { raw } = await req.json();

  if (!raw || !raw.trim()) {
    return NextResponse.json({ error: "Paste a study first." }, { status: 400 });
  }

  const prompt = `You are converting an existing Bible study that Anthony already wrote into structured JSON so it can be displayed in his app. This study was written for Monday night sessions with high school students at Triple F Sports in Knoxville TN.

CRITICAL RULE: You are a FORMATTER, not a writer. Do NOT rewrite, improve, shorten, expand, or reword Anthony's content. Preserve his exact wording. Your only job is to identify the structure and put his existing text into the right fields. If a sentence exists in the source, it must appear in your output essentially verbatim.

Here is the study to convert:

--- BEGIN STUDY ---
${raw}
--- END STUDY ---

Now convert it. Return ONLY valid JSON, no markdown fences, no commentary.

STRUCTURE RULES:

"sections" is the main body — walk through the study top to bottom and turn every part/heading into a section, in order. Each section has a heading "h", an optional "sub", and an ordered array of "blocks". Available block types:

- {"t":"p","tx":"a paragraph of prose"}
- {"t":"list","items":["item","item"],"ord":true}   ← ord:true only for numbered/step lists, omit for bullets
- {"t":"verse","ref":"Romans 8:1","tx":"the verse text as quoted in the study"}
- {"t":"def","term":"Genetic love","tx":"the explanation that followed the dash"}   ← for "Term — explanation" patterns
- {"t":"q","tx":"a discussion question posed to students"}
- {"t":"table","cols":["Left header","Right header"],"rows":[["left cell","right cell"]]}
- {"t":"quote","tx":"a prayer, or a line set apart for emphasis"}
- {"t":"callout","lb":"short label","tx":"the callout body"}

Pick the block type that matches what the original text actually is. A two-column comparison must become a "table". A prayer must become a "quote". Anything introduced as "Discussion:" must become a "q" (drop the "Discussion:" prefix itself). Term-dash-definition pairs must become "def" blocks, not paragraphs.

THE STANDARD FIELDS — fill these from the study's own content so it works with the app's cards, search, and PDF export:

- "title": the study's actual title, exactly as written.
- "subtitle": the descriptive line under the title, if there is one. Omit if not.
- "series": pick the ONE that fits best. Do not invent a new one:
    "Faith & Character" — trust, obedience, discipline, temptation, integrity, self-control
    "Identity & Worth" — who you are, comparison, perfectionism, shame, belovedness, value
    "Relationships" — friendships, family, dating, accountability, conflict, influence
    "Heart & Posture" — gratitude, humility, loneliness, anxiety, contentment, surrender
- "bi": the study's central thesis in 3-5 sentences, assembled from sentences Anthony actually wrote. Pull his real lines — do not compose new ones.
- "anchor": the single most central verse in the study. Use the reference and text as the study quotes it.
- "sup": the two next-most-important verses, same rule.
- "qs": every discussion/reflection question in the study, in order, as {"q":"his exact question","a":"a 1-2 sentence leader note"}. The questions must be verbatim. The "a" leader notes are the ONLY place you may write new text — keep them short, direct, and in his voice (no church jargon, no "furthermore", active voice, short punchy sentences).
- "tk": 3 takeaways as {"ti":"title","bo":"body"}. Build these from his strongest existing lines — the memorable ones he already landed. Do not invent new aphorisms.
- "sbd": [] (empty array — imported studies use sections instead)
- "bd": [] (empty array — imported studies use sections instead)

Return this exact shape:
{
  "title": "...",
  "subtitle": "...",
  "series": "...",
  "bi": "...",
  "anchor": {"ref": "...", "text": "..."},
  "sup": [{"ref": "...", "text": "..."}, {"ref": "...", "text": "..."}],
  "bd": [],
  "sbd": [],
  "qs": [{"q": "...", "a": "..."}],
  "tk": [{"ti": "...", "bo": "..."}, {"ti": "...", "bo": "..."}, {"ti": "...", "bo": "..."}],
  "sections": [
    {"h": "...", "blocks": [{"t": "p", "tx": "..."}]}
  ]
}`;

  try {
    const text = await generate(prompt);

    let studyData;
    try {
      studyData = parseJSON(text);
    } catch {
      throw new Error("Could not parse the study. Try pasting it again.");
    }

    const sections = studyData.sections as unknown[] | undefined;
    if (!studyData.title || !sections?.length) {
      throw new Error("Couldn't find a title and body in that text. Make sure you pasted the whole study.");
    }

    const study = {
      id: Date.now(),
      date: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      draft: false,
      imported: true,
      bd: [],
      sbd: [],
      ...studyData,
      series: studyData.series || "Faith & Character",
    };

    return NextResponse.json({ study });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
