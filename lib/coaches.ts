import { supabase } from "./supabase";
import { LOCATIONS } from "./locations";

const REGISTRY_ID = "_coaches";
const SESSION_KEY = "tf_coach_session";
const CACHE_KEY = "tf_coaches_cache";

export interface Coach {
  id: string;
  name: string;
  pin: string; // 4-digit string
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
  constructor() {
    super("Can't reach the server right now. Try again in a moment.");
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

// ── Registry ──────────────────────────────────────────────────────────────────

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

export async function loadCoaches(): Promise<RegistryResult> {
  try {
    const { data, error } = await supabase
      .from("user_data")
      .select("notes")
      .eq("id", REGISTRY_ID)
      .single();

    // PGRST116 = no row yet, which genuinely means no coaches are registered.
    if (error && error.code !== "PGRST116") throw new Error(error.message);

    const notes = (data?.notes ?? null) as Record<string, string> | null;
    const coaches: Coach[] = notes?.list ? JSON.parse(notes.list) : [];
    writeCache(coaches);
    return { ok: true, coaches, cached: false };
  } catch (e) {
    console.warn("Coach registry unreachable:", e, "— using cached list");
    return { ok: false, coaches: readCache(), cached: true };
  }
}

async function saveCoaches(coaches: Coach[]): Promise<void> {
  const { error } = await supabase.from("user_data").upsert({
    id: REGISTRY_ID,
    notes: { list: JSON.stringify(coaches) },
    liked: {},
    attendance: {},
    drafts: [],
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  writeCache(coaches);
}

/**
 * Replaces the whole registry. Only pass a list that came from an `ok: true`
 * load — writing a cached or empty list would drop coaches.
 */
export async function replaceCoaches(coaches: Coach[]): Promise<void> {
  await saveCoaches(coaches);
}

export async function addCoach(coach: Omit<Coach, "id">): Promise<Coach> {
  const { ok, coaches } = await loadCoaches();
  if (!ok) throw new RegistryUnavailableError();
  const newCoach: Coach = { ...coach, id: `coach_${Date.now()}` };
  await saveCoaches([...coaches, newCoach]);
  return newCoach;
}

export async function removeCoach(id: string): Promise<void> {
  const { ok, coaches } = await loadCoaches();
  if (!ok) throw new RegistryUnavailableError();
  await saveCoaches(coaches.filter(c => c.id !== id));
}

/**
 * Verifies a PIN. Falls back to the cached registry when offline so a coach
 * standing in a gym with no signal can still get into the app.
 */
export async function verifyPin(name: string, pin: string): Promise<Coach | null> {
  const { coaches } = await loadCoaches();
  return coaches.find(
    c => c.name.toLowerCase() === name.toLowerCase() && c.pin === pin
  ) || null;
}

export const ROLES = ["Head Coach", "Assistant Coach", "Volunteer"];
export { LOCATIONS };
