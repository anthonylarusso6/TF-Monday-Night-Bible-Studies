import { supabase } from "./supabase";
import { LOCATIONS } from "./locations";

const REGISTRY_ID = "_coaches";

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

const SESSION_KEY = "tf_coach_session";

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

export async function loadCoaches(): Promise<Coach[]> {
  try {
    const { data } = await supabase
      .from("user_data")
      .select("notes")
      .eq("id", REGISTRY_ID)
      .single();
    if (!data?.notes) return [];
    const notes = data.notes as Record<string, string>;
    return notes.list ? JSON.parse(notes.list) : [];
  } catch { return []; }
}

export async function saveCoaches(coaches: Coach[]): Promise<void> {
  await supabase.from("user_data").upsert({
    id: REGISTRY_ID,
    notes: { list: JSON.stringify(coaches) },
    liked: {},
    attendance: {},
    drafts: [],
    updated_at: new Date().toISOString(),
  });
}

export async function addCoach(coach: Omit<Coach, "id">): Promise<Coach> {
  const coaches = await loadCoaches();
  const newCoach: Coach = { ...coach, id: `coach_${Date.now()}` };
  await saveCoaches([...coaches, newCoach]);
  return newCoach;
}

export async function removeCoach(id: string): Promise<void> {
  const coaches = await loadCoaches();
  await saveCoaches(coaches.filter(c => c.id !== id));
}

export async function verifyPin(name: string, pin: string): Promise<Coach | null> {
  const coaches = await loadCoaches();
  return coaches.find(
    c => c.name.toLowerCase() === name.toLowerCase() && c.pin === pin
  ) || null;
}

export const ROLES = ["Head Coach", "Assistant Coach", "Volunteer"];
export { LOCATIONS };
