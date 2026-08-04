import { createClient } from "@supabase/supabase-js";
import { Study, UserData } from "./types";
import { DEFAULT_LOCATION } from "./locations";

const SUPABASE_URL = "https://plmmfyseqrxalujgdibz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbW1meXNlcXJ4YWx1amdkaWJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzQxMDksImV4cCI6MjA5MjM1MDEwOX0.x3IaFzm26PFXwZxx7ldbUQwyFoxM4FZ43acVO6dF0_o";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const EMPTY: UserData = { liked: {}, notes: {}, attendance: {}, drafts: [] };

/**
 * Studies live in their own row, separate from the per-session state above.
 * Liking a study or saving a note used to rewrite every study on every tap —
 * ~13KB per imported study, growing with the library. Splitting them means a
 * like costs about a kilobyte no matter how many studies exist, and the
 * library is only written when it actually changes.
 */
export interface StudyStore {
  studies: Study[];
  /** Studies the coach removed. Shared so a delete on one device sticks on the others. */
  hiddenIds: string[];
  /** Attendance target — shared so both devices show the same goal. */
  goal: number;
}

const EMPTY_STORE: StudyStore = { studies: [], hiddenIds: [], goal: 20 };

function studiesId(locationId: string) { return `${locationId}__studies`; }
function lsKey(locationId: string) { return `tf_userdata_${locationId}`; }
function lsStoreKey(locationId: string) { return `tf_studies_${locationId}`; }

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function writeLS(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/**
 * Offline fallback for the library. Prefers the current key, but falls back to
 * the pre-split layout (studies inside `tf_userdata_*` as notes._g, with hidden
 * ids and goal in their own device-local keys). Without that second step a
 * coach who opens the app offline before ever syncing would see an empty
 * library even though their studies are safe on the server.
 */
function localStore(locationId: string): StudyStore {
  const current = readLS<StudyStore | null>(lsStoreKey(locationId), null);
  if (current?.studies?.length) return current;

  const legacy = readLS<UserData | null>(lsKey(locationId), null);
  const blob = (legacy?.notes as Record<string, string> | undefined)?._g;
  if (!blob) return current ?? EMPTY_STORE;

  try {
    const studies: Study[] = JSON.parse(blob);
    if (!studies.length) return current ?? EMPTY_STORE;
    return {
      studies,
      hiddenIds: readLS<string[]>("tf_hidden", []),
      goal: parseInt(localStorage.getItem("tf_goal") || "20") || 20,
    };
  } catch {
    return current ?? EMPTY_STORE;
  }
}

// ── Per-session state: likes, leader notes, attendance, drafts ────────────────

export async function loadUserData(locationId = DEFAULT_LOCATION.id): Promise<UserData> {
  try {
    const { data, error } = await supabase
      .from("user_data").select("*").eq("id", locationId).single();

    if (error) {
      if (error.code !== "PGRST116") {
        console.warn("Supabase load error:", error.message, "— using local backup");
      }
      return readLS(lsKey(locationId), EMPTY);
    }

    // Legacy rows kept the study library under notes._g. Drop it here so it
    // never round-trips back into the small row; loadStudies() migrates it.
    const notes = { ...(data.notes || {}) } as Record<string, string>;
    delete notes._g;

    const result: UserData = {
      liked: data.liked || {},
      notes,
      attendance: data.attendance || {},
      drafts: data.drafts || [],
    };
    writeLS(lsKey(locationId), result);
    return result;
  } catch (e) {
    console.warn("Supabase unreachable:", e, "— using local backup");
    return readLS(lsKey(locationId), EMPTY);
  }
}

export async function saveUserData(
  userData: UserData,
  locationId = DEFAULT_LOCATION.id
): Promise<boolean> {
  writeLS(lsKey(locationId), userData);
  try {
    const { error } = await supabase.from("user_data").upsert({
      id: locationId,
      liked: userData.liked,
      notes: userData.notes,
      attendance: userData.attendance,
      drafts: userData.drafts,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn("Supabase save error:", error.message, "— saved locally only");
      return false;
    }
    return true;
  } catch (e) {
    console.warn("Supabase unreachable:", e, "— saved locally only");
    return false;
  }
}

// ── Study library + shared settings ──────────────────────────────────────────

export async function loadStudies(locationId = DEFAULT_LOCATION.id): Promise<StudyStore> {
  try {
    const { data, error } = await supabase
      .from("user_data").select("*").eq("id", studiesId(locationId)).single();

    if (!error && data) {
      const meta = (data.notes || {}) as Record<string, string>;
      const store: StudyStore = {
        studies: data.drafts || [],
        hiddenIds: meta.hidden ? JSON.parse(meta.hidden) : [],
        goal: meta.goal ? parseInt(meta.goal) || 20 : 20,
      };
      writeLS(lsStoreKey(locationId), store);
      return store;
    }
    if (error && error.code !== "PGRST116") {
      console.warn("Supabase studies load error:", error.message);
      return localStore(locationId);
    }

    // No studies row yet — migrate from the legacy notes._g blob if present.
    const migrated = await migrateLegacyStudies(locationId);
    if (migrated) return migrated;

    return localStore(locationId);
  } catch (e) {
    console.warn("Supabase unreachable:", e, "— using local backup");
    return localStore(locationId);
  }
}

/**
 * One-time move of a location's library out of the old `notes._g` string into
 * its own row. Runs when the studies row is missing; safe to call repeatedly.
 */
async function migrateLegacyStudies(locationId: string): Promise<StudyStore | null> {
  try {
    const { data } = await supabase
      .from("user_data").select("notes").eq("id", locationId).single();
    const legacy = (data?.notes as Record<string, string> | undefined)?._g;
    if (!legacy) return null;

    const studies: Study[] = JSON.parse(legacy);
    if (!studies.length) return null;

    // hiddenIds/goal were device-local before this change; seed from localStorage
    // so the coach doing the migration doesn't see deleted studies reappear.
    const store: StudyStore = {
      studies,
      hiddenIds: readLS<string[]>("tf_hidden", []),
      goal: parseInt(localStorage.getItem("tf_goal") || "20") || 20,
    };
    await saveStudies(store, locationId);
    console.info(`Migrated ${studies.length} studies to their own row.`);
    return store;
  } catch {
    return null;
  }
}

export async function saveStudies(
  store: StudyStore,
  locationId = DEFAULT_LOCATION.id
): Promise<boolean> {
  writeLS(lsStoreKey(locationId), store);
  try {
    const { error } = await supabase.from("user_data").upsert({
      id: studiesId(locationId),
      drafts: store.studies,
      notes: { hidden: JSON.stringify(store.hiddenIds), goal: String(store.goal) },
      liked: {},
      attendance: {},
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn("Supabase studies save error:", error.message, "— saved locally only");
      return false;
    }
    return true;
  } catch (e) {
    console.warn("Supabase unreachable:", e, "— saved locally only");
    return false;
  }
}
