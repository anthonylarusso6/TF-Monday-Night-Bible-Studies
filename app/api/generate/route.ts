import { NextRequest, NextResponse } from "next/server";
import { generate, parseJSON } from "@/lib/gemini";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { topic } = await req.json();

  if (!topic) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  }

  const prompt = `You are writing a Bible study for Anthony, who leads Monday night sessions with high school students at Triple F Sports in Knoxville TN. You have read all 13 of his previous studies and must match his voice exactly. The topic is: "${topic}".

ANTHONY'S VOICE — study these patterns and replicate them exactly:

VOICE & TONE:
- Direct and second-person. He says "you" constantly. Speaks TO them, not AT them.
- Validates the struggle first, then delivers truth. He never lectures — he talks like a trusted coach.
- Short declarative sentences with real punch. No filler, no hedging, no "perhaps" or "maybe."
- Empathetic but never soft. He calls things out directly without apology.
- Sports analogies are natural to him (coaches, teammates, sharpening, iron).

SENTENCE RHYTHM (copy this exactly):
- He uses em-dashes for rhythm: "Gratitude is not a feeling you wait for — it is a decision you make."
- He uses short single-sentence punches after longer ones: "It is wisdom." / "It is a trap." / "God already does."
- Contrast pattern: "Not X — it is Y." Example: "Humility is not weakness — it is the posture that opens the door."
- Triple builds: "It challenges habits. It exposes blind spots. It forces honesty."
- He never uses passive voice. Everything is active and direct.

BIG IDEA (4-5 sentences):
- Always flips a common assumption in the first or second sentence.
- Has a clear pivot in the middle where he lands the spiritual truth.
- Ends with one short, memorable statement.
- Examples of his openers: "X is not what you think — it is Y." / "The world says X. Jesus said the opposite."
- NEVER starts with "In today's world" or "Have you ever wondered" — those are AI phrases. He just says it.

PHRASE BREAKDOWN POINTS (pts):
- 2-3 bullet points per phrase, each a complete thought.
- First point usually unpacks what the word/phrase literally means in context.
- Second and third apply it to real life in one sharp sentence each.
- He uses "—" inside bullets for rhythm: "This is not passive — God actively resists pride."

CALLOUTS (co.tx):
- "Say this to your students" = a direct statement he'd actually say out loud to the room. 2-3 sentences. Often ends with a pointed question.
- "Real-life example" = a specific scenario. A text, an argument, a game, scrolling at night. Concrete and detailed.
- Both types end with either a question or a landing statement. Never left hanging.
- Examples: "Think about the last argument you were in. Were you actually listening — or just waiting for your turn to talk?" / "You get a text that makes you furious. Your first instinct is to fire something back. Slow to speak means you let the feeling settle before you let the words fly."

SUPPORTING VERSE BREAKDOWNS (sbd.pt):
- 2-3 sentences. First sentence states what the verse means directly. Second connects to the main theme. Third lands the implication for the student.
- Often uses contrast: "X says one thing. God says another."

DISCUSSION QUESTIONS (qs):
- 6 questions. Mix of "Why", "What", "Have you ever", "How".
- Personal and specific — not abstract theology questions.
- Leader answers (a) are 2 sentences max, direct, give the leader the point without over-explaining.
- Some answers end with coaching notes like "Give them space." or "Let this land. Do not rush past it." or "This is personal."
- He never asks "What does this passage mean to you?" — too vague. He asks specific, targeted questions.

TAKEAWAYS (tk):
- 3 takeaways. Title (ti) is bold, 6-12 words, memorable and standalone.
- Body (bo) is 1-2 sentences that expand the title, not restate it.
- Often uses the "not X — Y" contrast in the title or body.
- Examples: "The pause between feeling and speaking is where your character lives." / "Real strength is surrender." / "Self-control is a fruit, not a formula."

WORDS HE USES (use these naturally):
- "That is exactly why..." / "This is not X — it is Y." / "It is who you are becoming."
- "In private" / "when nobody is watching" / "the unseen moments"
- "Conviction" / "condemnation" / "posture" / "intentional"
- "The right voices" / "the wrong ones" / "who gets closest to you"
- Sports language: "coachable" / "teammates" / "sharpening" / "in the room" / "on the field"

WHAT HE NEVER DOES (avoid these completely):
- Never uses church jargon like "walk with the Lord" or "on fire for God" or "pour into"
- Never starts sentences with "Furthermore" or "In conclusion" or "It is important to note"
- Never uses "society" or "in today's world" or "as we navigate"
- Never writes more than 3 sentences in a row without a short punchy one to break rhythm
- Never asks rhetorical questions in the big idea — he states things
- Never uses the word "utilize" or "individuals" or "facilitate"
- Never ends a callout without landing it — always closes strong

SERIES — pick the ONE that fits this topic best. Do not invent a new one:
- "Faith & Character" — trust, obedience, discipline, temptation, integrity, self-control
- "Identity & Worth" — who you are, comparison, perfectionism, shame, confidence, value
- "Relationships" — friendships, family, dating, accountability, conflict, influence
- "Heart & Posture" — gratitude, humility, loneliness, anxiety, contentment, surrender

Now write the complete study on "${topic}" and return ONLY valid JSON (no markdown, no extra text):
{
  "title": "Punchy title — specific, not generic. Should feel like something you'd see on a flyer.",
  "series": "One of the exact four series names above",
  "bi": "4-5 sentences. Flip an assumption. Direct. No fluff. End with one short punch.",
  "anchor": {"ref": "Book Chapter:Verse (Translation)", "text": "Full verse text"},
  "sup": [
    {"ref": "Book Chapter:Verse (Translation)", "text": "Full verse text"},
    {"ref": "Book Chapter:Verse (Translation)", "text": "Full verse text"}
  ],
  "bd": [
    {
      "ph": "Phrase from anchor verse...",
      "pts": ["Point one — sharp and direct", "Point two", "Point three"],
      "co": {"lb": "Say this to your students OR Real-life example", "tx": "2-3 sentences. Concrete. Ends with a question or strong statement."}
    },
    {"ph": "Next phrase...", "pts": ["Point 1", "Point 2", "Point 3"], "co": {"lb": "...", "tx": "..."}},
    {"ph": "Final phrase...", "pts": ["Point 1", "Point 2"], "co": {"lb": "...", "tx": "..."}}
  ],
  "sbd": [
    {"ref": "Supporting verse ref", "pt": "2-3 sentences. Direct. Connects to theme. Lands an implication."},
    {"ref": "Supporting verse ref", "pt": "2-3 sentences."}
  ],
  "qs": [
    {"q": "Personal, specific question?", "a": "2-sentence direct answer. Maybe ends with a coaching note."},
    {"q": "Question 2?", "a": "Answer"},
    {"q": "Question 3?", "a": "Answer"},
    {"q": "Question 4?", "a": "Answer"},
    {"q": "Question 5?", "a": "Answer"},
    {"q": "Question 6?", "a": "Answer — this one is personal, end with 'Give them space.' or similar"}
  ],
  "tk": [
    {"ti": "Memorable takeaway title — 6-12 words", "bo": "1-2 sentences. Expands the title, does not restate it."},
    {"ti": "Takeaway title", "bo": "Expansion"},
    {"ti": "Takeaway title", "bo": "Expansion"}
  ]
}`;

  try {
    const text = await generate(prompt);

    let studyData;
    try {
      studyData = parseJSON(text);
    } catch {
      throw new Error("Could not parse AI response as JSON. Please try again.");
    }

    const study = {
      id: Date.now(),
      date: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      draft: false,
      ...studyData,
      series: studyData.series || "Faith & Character",
    };

    return NextResponse.json({ study });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
