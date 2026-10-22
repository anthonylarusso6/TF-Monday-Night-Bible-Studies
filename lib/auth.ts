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
  /** Plain PIN from before hashing existed. Converted to `pinHash` the next time that coach signs in. */
  pin?: string;
  /** HMAC of the PIN with the server's secret: a copy of the database alone cannot be used to read or guess PINs. */
  pinHash?: string;
  role: string;
  locationId: string;
  /** Created from the login screen and not yet approved by an admin: cannot sign in or see anything. */
  pending?: boolean;
  /** Locked out by the Creator: cannot sign in or use anything, but nothing they made is lost. */
  suspended?: boolean;
  /** Set when the Creator chose the PIN for them: they must pick their own at the next sign-in. */
  mustChangePin?: boolean;
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

export function publicCoach({ pin, pinHash, ...rest }: StoredCoach) {
  void pin; void pinHash;
  return rest;
}

/** The AI is the Creator's alone. (There is no per-coach switch: nobody else is meant to know it exists.) */
export function mayUseAI(coach: StoredCoach): boolean {
  return coach.role === "Creator";
}

/** Like requireCoach, but only for someone allowed the AI. */
export async function requireAI(req: NextRequest): Promise<AuthResult> {
  const auth = await requireCoach(req);
  if (!auth.ok) return auth;
  if (!mayUseAI(auth.coach)) return deny(403, "That is not available.");
  return auth;
}

// ── PINs ─────────────────────────────────────────────────────────────────────

/** Hash of a PIN, bound to the coach and to the server secret. Fails closed without SESSION_SECRET. */
export function hashPin(coachId: string, pin: string): string {
  const key = secret();
  if (!key) throw new Error("Server is missing SESSION_SECRET.");
  return crypto.createHmac("sha256", key).update(`pin:${coachId}:${pin}`).digest("hex");
}

/** Whether `pin` is this coach's PIN, whether it is stored hashed or (still) plain. */
export function pinMatches(coach: StoredCoach, pin: string): boolean {
  if (coach.pinHash) return sameString(coach.pinHash, hashPin(coach.id, pin));
  return !!coach.pin && sameString(coach.pin, pin);
}

/** What a sign-in token is signed with: changes whenever the PIN does. */
export function pinKey(coach: StoredCoach): string {
  return coach.pinHash ?? coach.pin ?? "";
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
  return `${payload}.${sign(payload, pinKey(coach), key)}`;
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
  if (!coach || !sameString(sig, sign(payload, pinKey(coach), key))) {
    return deny(401, "Please sign in again.");
  }
  if (coach.pending) return deny(403, "Your account is waiting for approval.");
  if (coach.suspended) return deny(401, "Your account is suspended. Ask the Creator.");
  if (opts.roles && !opts.roles.includes(coach.role)) {
    return deny(403, "You don't have access to that.");
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
