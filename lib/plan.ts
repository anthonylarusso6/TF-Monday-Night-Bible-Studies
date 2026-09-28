import type { UserData } from "./types";

export type SpeakerType = "coach" | "testimony" | "guest";

export interface PlannedSession {
  date: string;
  studyId?: string | number;
  topic?: string;
  speaker?: string;
  speakerType?: SpeakerType;
  notes?: string;
}

export const SPEAKER_TYPES: {
  value: SpeakerType; label: string; icon: string; color: string; placeholder: string;
}[] = [
  { value: "coach",     label: "Coach / Leader",    icon: "🎤", color: "var(--accent)",     placeholder: "e.g. Anthony, Coach Lee..." },
  { value: "testimony", label: "Student Testimony", icon: "👤", color: "var(--series-rel)", placeholder: "Student's name" },
  { value: "guest",     label: "Guest Speaker",     icon: "✝️", color: "var(--series-iw)",  placeholder: "e.g. Pastor Johnson..." },
];

/** The season plan as stored on the location's row. */
export function loadPlan(userData: UserData): PlannedSession[] {
  try {
    const raw = (userData.notes as Record<string, string>)._plan;
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Upcoming Monday nights, starting with today when today is a Monday. */
export function getNextMondays(count: number): Date[] {
  const mondays: Date[] = [];
  const d = new Date();
  const day = d.getDay();
  const diff = day === 1 ? 0 : day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    mondays.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return mondays;
}

export function dateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** How a speaker should read in a list. */
export function speakerLabel(p: PlannedSession): string | null {
  if (!p.speaker) return null;
  if (p.speakerType === "testimony") return `${p.speaker} — Testimony`;
  if (p.speakerType === "guest") return `Guest: ${p.speaker}`;
  return p.speaker;
}
