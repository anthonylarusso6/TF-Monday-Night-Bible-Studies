import { LOCATIONS } from "./locations";

const SESSION_KEY = "tf_coach_session";
const CACHE_KEY = "tf_coaches_cache";

/**
 * A coach as the browser sees one. There is deliberately no `pin` field: PINs
 * stay on the server and are checked there, because anything sent to the client
 * is readable by anyone using the app — which previously let a student read
 * every coach's PIN straight out of the network tab.
 */
export interface Coach {
  id: string;
  name: string;
  role: string;
  locationId: string;
}

export interface CoachSession {
  coachId: string;
  name: string;
  role: string;
  locationId: string;
}

/**
 * A registry read either succeeded or it didn't. Collapsing a failed read into
 * an empty list is what made the app claim no coaches existed whenever the
 * connection dropped — and any write after that would have overwritten the real
 * registry with a single coach, locking everyone else out. Callers must check
 * `ok` before writing.
 */
export interface RegistryResult {
  ok: boolean;
  coaches: Coach[];
  /** True when `coaches` came from the local cache rather than the server. */
  cached: boolean;
}

export class RegistryUnavailableError extends Error {
  constructor(message = "Can't reach the server right now. Try again in a moment.") {
    super(message);
    this.name = "RegistryUnavailableError";
  }
}

// ── Session ───────────────────────────────────────────────────────────────────

export function getSession(): CoachSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setSession(session: CoachSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// ── Registry (server-backed) ─────────────────────────────────────────────────

function readCache(): Coach[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

function writeCache(coaches: Coach[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(coaches)); } catch {}
}

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/coaches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) throw new RegistryUnavailableError(json.error || "Request failed.");
  return json;
}

export async function loadCoaches(): Promise<RegistryResult> {
  try {
    const res = await fetch("/api/coaches", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || `Request failed (${res.status})`);
    const coaches: Coach[] = json.coaches || [];
    // Cached so the login screen can still list who is registered with no
    // signal. Signing in still needs the server, since the PIN is checked there.
    writeCache(coaches);
    return { ok: true, coaches, cached: false };
  } catch (e) {
    console.warn("Coach registry unreachable:", e, "— using cached list");
    return { ok: false, coaches: readCache(), cached: true };
  }
}

export interface NewCoach {
  name: string;
  role: string;
  locationId: string;
  /** Sent once on creation and never returned to the browser again. */
  pin: string;
}

export async function addCoach(coach: NewCoach): Promise<Coach> {
  const { coach: created } = await post({ action: "add", ...coach });
  return created as Coach;
}

export async function updateCoach(update: {
  id: string; name?: string; role?: string; locationId?: string; pin?: string;
}): Promise<Coach[]> {
  const { coaches } = await post({ action: "update", ...update });
  writeCache(coaches as Coach[]);
  return coaches as Coach[];
}

export async function removeCoach(id: string): Promise<Coach[]> {
  const { coaches } = await post({ action: "remove", id });
  writeCache(coaches as Coach[]);
  return coaches as Coach[];
}

/**
 * Checks a PIN on the server and returns the coach when it matches.
 * Requires a connection by design — the PIN list is not on this device.
 */
export async function verifyPin(name: string, pin: string): Promise<Coach | null> {
  const { coach } = await post({ action: "verify", name, pin });
  return (coach as Coach) ?? null;
}

export const ROLES = ["Head Coach", "Assistant Coach", "Volunteer"];
export { LOCATIONS };
