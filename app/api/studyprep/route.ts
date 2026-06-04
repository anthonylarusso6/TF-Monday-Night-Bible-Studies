import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Study } from "@/lib/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  const { study }: { study: Study } = await req.json();
  if (!study) return NextResponse.json({ error: "Study required" }, { status: 400 });

  const prompt = `You are a discipleship coach helping a Triple F Sports Bible study leader personally prepare to lead a study on "${study.title}" before their Monday night session. The Big Idea is: "${study.bi}". The anchor verse is ${study.anchor.ref}: "${study.anchor.text}".

This leader needs to experience the study PERSONALLY before they lead it. Help them sit with it, let it hit them, and prepare their own heart — not just their notes.

Return ONLY valid JSON with this structure, no markdown:
{
  "openingPrayer": "A 3-4 sentence opening prayer specifically for this leader to pray before they prepare. Personal, not generic.",
  "personalReflections": [
    "Personal application question 1 — how does this specifically apply to the leader's own life right now?",
    "Personal application question 2",
    "Personal application question 3"
  ],
  "prepTips": [
    { "section": "Opening", "tip": "1-2 sentence coaching tip for how to open this specific study well" },
    { "section": "Verse Breakdown", "tip": "Tip for facilitating this section" },
    { "section": "Discussion", "tip": "Tip for facilitating the questions with this topic" },
    { "section": "Closing", "tip": "How to land this study with impact" }
  ],
  "watchFor": "2-3 sentences: what emotional or personal struggles might surface with THIS topic, and how to handle them with care",
  "closingChallenge": "One personal challenge for the leader themselves this week, tied to the study content"
}`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json\n?|\n?```/g, "").trim();
    const prep = JSON.parse(text);
    return NextResponse.json({ prep });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
