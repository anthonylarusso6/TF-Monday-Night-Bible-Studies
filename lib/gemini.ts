import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsonrepair } from "jsonrepair";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.0-flash";

function isOverloaded(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b(429|500|502|503|504)\b/.test(msg) || /overload|high demand|unavailable/i.test(msg);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs a prompt through Gemini, retrying transient overload errors with
 * backoff and falling back to the previous flash model if 2.5 stays busy.
 */
export async function generate(prompt: string): Promise<string> {
  const attempts: { model: string; waitMs: number }[] = [
    { model: MODEL, waitMs: 0 },
    { model: MODEL, waitMs: 1200 },
    { model: MODEL, waitMs: 3500 },
    { model: FALLBACK_MODEL, waitMs: 800 },
    { model: FALLBACK_MODEL, waitMs: 2500 },
  ];

  let lastErr: unknown;
  for (const { model, waitMs } of attempts) {
    if (waitMs) await sleep(waitMs);
    try {
      const m = genAI.getGenerativeModel({ model });
      const result = await m.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      lastErr = err;
      if (!isOverloaded(err)) throw err;
    }
  }

  throw new Error(
    isOverloaded(lastErr)
      ? "Gemini is busy right now. Wait a few seconds and try again."
      : lastErr instanceof Error ? lastErr.message : "Generation failed"
  );
}

/** Pulls a JSON object out of a model response, repairing common malformations. */
export function parseJSON(text: string): Record<string, unknown> {
  const clean = text.replace(/```json\n?|\n?```/g, "").trim();
  const extracted = clean.match(/\{[\s\S]*\}/)?.[0] ?? clean;
  return JSON.parse(jsonrepair(extracted));
}
