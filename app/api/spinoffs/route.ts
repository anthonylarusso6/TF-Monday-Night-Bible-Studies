import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  const { topic } = await req.json();
  if (!topic) return NextResponse.json({ error: "Topic required" }, { status: 400 });

  const prompt = `You are helping Anthony, a Bible study leader for high school athletes at Triple F Sports in Knoxville TN. He wants to teach on the broad topic: "${topic}".

Give him 6 specific, punchy study angles he could take on this topic. Each should feel like a standalone Monday night study — not just a synonym for the original topic, but a specific, fresh angle that would land with high school athletes.

Return ONLY valid JSON — an array of 6 objects, no markdown:
[
  { "title": "Specific punchy title (6-10 words)", "hook": "One sentence — what makes this angle unique or compelling for teens" },
  ...6 total
]`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json\n?|\n?```/g, "").trim();
    const spinoffs = JSON.parse(text);
    return NextResponse.json({ spinoffs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
