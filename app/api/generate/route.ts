import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  const { topic, series } = await req.json();

  if (!topic) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  }

  const prompt = `You are a Bible study writer for a Monday night high school group led by Anthony at Triple F Sports in Knoxville TN. Build a complete Bible study on the topic: "${topic}". The tone should be conversational, direct, and feel like Anthony wrote it — not AI generated. Students are high schoolers so use real-life examples they relate to.

Return ONLY valid JSON with this exact structure, no markdown, no extra text:
{
  "title": "Study title that is punchy and specific",
  "bi": "Big Idea — 4-5 sentences. Flip a common assumption. Be direct. No fluff.",
  "anchor": {"ref": "Book Chapter:Verse (Translation)", "text": "Full verse text"},
  "sup": [
    {"ref": "Book Chapter:Verse (Translation)", "text": "Full verse text"},
    {"ref": "Book Chapter:Verse (Translation)", "text": "Full verse text"}
  ],
  "bd": [
    {
      "ph": "Phrase from anchor verse...",
      "pts": ["Point 1 — direct and clear", "Point 2", "Point 3"],
      "co": {"lb": "Say this to your students OR Real-life example", "tx": "2-3 sentence callout that sounds like Anthony talking to teens"}
    },
    {"ph": "Next phrase...", "pts": ["Point 1", "Point 2", "Point 3"], "co": {"lb": "...", "tx": "..."}},
    {"ph": "Final phrase...", "pts": ["Point 1", "Point 2"], "co": {"lb": "...", "tx": "..."}}
  ],
  "sbd": [
    {"ref": "First supporting verse reference", "pt": "2-3 sentence breakdown connecting to main theme"},
    {"ref": "Second supporting verse reference", "pt": "2-3 sentence breakdown"}
  ],
  "qs": [
    {"q": "Discussion question 1?", "a": "Leader answer — 2 sentences, direct"},
    {"q": "Question 2?", "a": "Leader answer"},
    {"q": "Question 3?", "a": "Leader answer"},
    {"q": "Question 4?", "a": "Leader answer"},
    {"q": "Question 5?", "a": "Leader answer"},
    {"q": "Question 6?", "a": "Leader answer"}
  ],
  "tk": [
    {"ti": "Takeaway title — bold and memorable", "bo": "1-2 sentence explanation"},
    {"ti": "Takeaway title", "bo": "Explanation"},
    {"ti": "Takeaway title", "bo": "Explanation"}
  ]
}`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let studyData;
    try {
      const clean = text.replace(/```json\n?|\n?```/g, "").trim();
      studyData = JSON.parse(clean);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        studyData = JSON.parse(match[0]);
      } else {
        throw new Error("Could not parse JSON from response");
      }
    }

    const study = {
      id: Date.now(),
      date: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      series: series || "Faith & Character",
      draft: false,
      ...studyData,
    };

    return NextResponse.json({ study });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
