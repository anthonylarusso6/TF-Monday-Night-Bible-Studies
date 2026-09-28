import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "./supabaseServer";

/**
 * Server-side sign-in and permission checks.
 *
 * Moving database writes behind the app's own routes closed the database to
 * the public key, but the routes themselves accepted anything from anyone:
 * any visitor could read prayer requests, overwrite the library, or reset a
 * coach's PIN using an id the coach list hands out. Every route that reads or
 * changes coach data now requires proof of a signed-in coach.
 *
 * Server-only. Never import from a client component.
 */

const REGISTRY_ID = "_coaches";
const THROTTLE_ID = "_auth_throttle";

/** A year: coaches expect to stay signed in on their own phone. */
const TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000;

/** Wrong PINs allowed before that name is locked out for a while. */
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export interface StoredCoach {
  id: string;
  name: string;
  pin: string;
  role: string;
  locationId: string;
}

export const HEAD_COACH = "Head Coach";

// ── Registry ─────────────────────────────────────────────────────────────────

export async function readRegistry(): Promise<StoredCoach[]> {
  const { data, error } = await supabaseServer
    .from("user_data").select("notes").eq("id", REGISTRY_ID).single();
  // PGRST116 = no row yet, which genuinely means no coaches are registered.
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  const notes = (data?.notes ?? null) as Record<string, string> | null;
  return notes?.list ? JSON.parse(notes.list) : [];
}

export async function writeRegistry(coaches: StoredCoach[]): Promise<void> {
  const { error } = await supabaseServer.from("user_data").upsert({
    id: REGISTRY_ID,
    notes: { list: JSON.stringify(coaches) },
    liked: {}, attendance: {}, drafts: [],
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export function publicCoach({ pin, ...rest }: StoredCoach) {
  void pin;
  return rest;
}

// ── Tokens ───────────────────────────────────────────────────────────────────

function secret(): string | null {
  return process.env.SESSION_SECRET || null;
}

function sign(payload: string, pin: string, key: string): string {
  // The coach's current PIN is part of what gets signed, so changing a PIN —
  // or removing the coach — invalidates every token issued before it.
  return crypto.createHmac("sha256", key).update(`${payload}.${pin}`).digest("base64url");
}

function sameString(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function issueToken(coach: StoredCoach): string {
  const key = secret();
  if (!key) throw new Error("Server is missing SESSION_SECRET.");
  const now = Date.now();
  const payload = Buffer.from(
    JSON.stringify({ cid: coach.id, iat: now, exp: now + TOKEN_TTL_MS })
  ).toString("base64url");
  return `${payload}.${sign(payload, coach.pin, key)}`;
}

export type AuthResult =
  | { ok: true; coach: StoredCoach; registry: StoredCoach[] }
  | { ok: false; response: NextResponse };

function deny(status: number, error: string): AuthResult {
  // `auth: true` lets the client tell "sign in again" apart from other errors.
  return { ok: false, response: NextResponse.json({ ok: false, auth: true, error }, { status }) };
}

/**
 * Confirms the request carries a valid sign-in, and optionally that the coach
 * holds one of `roles`. The coach is re-read from the registry every time, so a
 * removed coach or a changed role takes effect on their next request rather
 * than when their token eventually expires.
 */
export async function requireCoach(
  req: NextRequest,
  opts: { roles?: string[] } = {},
): Promise<AuthResult> {
  const key = secret();
  if (!key) return deny(500, "Server is missing SESSION_SECRET.");

  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return deny(401, "Please sign in.");

  let claims: { cid?: string; exp?: number };
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return deny(401, "Please sign in again.");
  }
  if (!claims.cid || !claims.exp || Date.now() > claims.exp) {
    return deny(401, "Your sign-in has expired. Please sign in again.");
  }

  let registry: StoredCoach[];
  try {
    registry = await readRegistry();
  } catch {
    return { ok: false, response: NextResponse.json({ ok: false, error: "Server unavailable." }, { status: 503 }) };
  }

  const coach = registry.find((c) => c.id === claims.cid);
  if (!coach || !sameString(sig, sign(payload, coach.pin, key))) {
    return deny(401, "Please sign in again.");
  }
  if (opts.roles && !opts.roles.includes(coach.role)) {
    return deny(403, "Only a Head Coach can do that.");
  }
  return { ok: true, coach, registry };
}

// ── PIN guessing ─────────────────────────────────────────────────────────────
//
// A 4-digit PIN has 10,000 possibilities, and the coach list is public so the
// names are known. Without a limit, a script could find any coach's PIN in
// minutes. Failures are counted per name — including names that don't exist,
// so the lockout response can't be used to learn who is registered.

type Throttle = Record<string, string>;

async function readThrottle(): Promise<Throttle> {
  const { data } = await supabaseServer
    .from("user_data").select("notes").eq("id", THROTTLE_ID).single();
  return ((data?.notes ?? {}) as Throttle) || {};
}

async function writeThrottle(t: Throttle): Promise<void> {
  await supabaseServer.from("user_data").upsert({
    id: THROTTLE_ID, notes: t, liked: {}, attendance: {}, drafts: [],
    updated_at: new Date().toISOString(),
  });
}

const nameKey = (name: string) => name.trim().toLowerCase();

/** Milliseconds until this name may try again, or 0 if it isn't locked. */
export async function lockedFor(name: string): Promise<number> {
  try {
    const entry = (await readThrottle())[nameKey(name)];
    if (!entry) return 0;
    const { until } = JSON.parse(entry) as { until?: number };
    return until && until > Date.now() ? until - Date.now() : 0;
  } catch {
    return 0;
  }
}

/** Records a wrong PIN. Returns the lockout length if this one triggered it. */
export async function recordFailure(name: string): Promise<number> {
  try {
    const t = await readThrottle();
    const k = nameKey(name);
    const prev = t[k] ? JSON.parse(t[k]) as { fails?: number; until?: number } : {};
    const fails = (prev.until && prev.until > Date.now() ? 0 : prev.fails || 0) + 1;
    if (fails >= MAX_FAILURES) {
      t[k] = JSON.stringify({ fails: 0, until: Date.now() + LOCKOUT_MS });
      await writeThrottle(t);
      return LOCKOUT_MS;
    }
    t[k] = JSON.stringify({ fails });
    await writeThrottle(t);
    return 0;
  } catch {
    return 0;
  }
}

export async function clearFailures(name: string): Promise<void> {
  try {
    const t = await readThrottle();
    const k = nameKey(name);
    if (!(k in t)) return;
    delete t[k];
    await writeThrottle(t);
  } catch {
    // Not worth failing a successful sign-in over.
  }
}
