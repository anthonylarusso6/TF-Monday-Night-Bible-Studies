import { Study, UserData } from "./types";
import { DEFAULT_LOCATION } from "./locations";
import type { StudyStore } from "./types";
import { mergeStores, mergeUserData } from "./merge";

// Re-exported so callers keep importing the type from here.
export type { StudyStore };

/**
 * All database access goes through this app's own API routes. The browser gets
 * no key of its own, so the database can refuse anonymous requests outright.
 * A failed call falls back to this device's copy exactly as before.
 */
/** Shape of a user_data row as the API returns it. */
interface DataRow {
  id: string;
  liked?: Record<string, boolean>;
  notes?: Record<string, string>;
  attendance?: Record<string, number>;
  drafts?: Study[];
  updated_at?: string;
}

async function apiGet(id: string): Promise<DataRow | null> {
  const res = await fetch(`/api/data?id=${encodeURIComponent(id)}`, { cache: "no-store" });
  const body = await res.json();
  if (!res.ok || !body.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return (body.row as DataRow | null) ?? null;
}

async function apiPut(row: Record<string, unknown>): Promise<void> {
  const res = await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(row),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.ok) throw new Error(body.error || `Request failed (${res.status})`);
}

const EMPTY: UserData = { liked: {}, notes: {}, attendance: {}, drafts: [] };


const EMPTY_STORE: StudyStore = { studies: [], hiddenIds: [], goal: 20 };

/** True when a device holds session state worth uploading to an empty server. */
function hasSessionState(d: UserData): boolean {
  return Boolean(
    d.drafts?.length ||
    Object.keys(d.liked || {}).length ||
    Object.keys(d.notes || {}).length ||
    Object.keys(d.attendance || {}).length
  );
}

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
    const data = await apiGet(locationId);

    if (!data) {
      // No row yet. Anything this device built up while the server was
      // unreachable is the only copy, so push it rather than leaving it
      // stranded in localStorage where the other device can never see it.
      const local = readLS(lsKey(locationId), EMPTY);
      if (hasSessionState(local)) await saveUserData(local, locationId);
      return local;
    }

    // Legacy rows kept the study library under notes._g. Drop it here so it
    // never round-trips back into the small row; loadStudies() migrates it.
    const notes = { ...(data.notes || {}) } as Record<string, string>;
    delete notes._g;

    const server: UserData = {
      liked: data.liked || {},
      notes,
      attendance: data.attendance || {},
      drafts: data.drafts || [],
    };
    const merged = mergeUserData(server, readLS(lsKey(locationId), EMPTY));
    writeLS(lsKey(locationId), merged);

    if (merged.drafts.length > server.drafts.length) {
      await saveUserData(merged, locationId);
    }
    return merged;
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
    await apiPut({
      id: locationId,
      liked: userData.liked,
      notes: userData.notes,
      attendance: userData.attendance,
      drafts: userData.drafts,
    });
    return true;
  } catch (e) {
    console.warn("Supabase unreachable:", e, "— saved locally only");
    return false;
  }
}

// ── Study library + shared settings ──────────────────────────────────────────

export async function loadStudies(locationId = DEFAULT_LOCATION.id): Promise<StudyStore> {
  try {
    const data = await apiGet(studiesId(locationId));

    if (data) {
      const meta = (data.notes || {}) as Record<string, string>;
      const server: StudyStore = {
        studies: data.drafts || [],
        hiddenIds: meta.hidden ? JSON.parse(meta.hidden) : [],
        goal: meta.goal ? parseInt(meta.goal) || 20 : 20,
      };
      const merged = mergeStores(server, localStore(locationId));
      writeLS(lsStoreKey(locationId), merged);

      // This device had studies or deletes the server didn't. Push them so the
      // other devices receive them and a server-side copy finally exists.
      if (
        merged.studies.length > server.studies.length ||
        merged.hiddenIds.length > server.hiddenIds.length
      ) {
        const ok = await saveStudies(merged, locationId);
        if (ok) {
          console.info(
            `Merged ${merged.studies.length - server.studies.length} local studies into the server copy.`
          );
        }
      }
      return merged;
    }
    // No studies row yet — migrate from the legacy notes._g blob if present.
    const migrated = await migrateLegacyStudies(locationId);
    if (migrated) return migrated;

    // Nothing on the server at all. A library that only ever saved locally is
    // the one copy in existence, so upload it before anything can overwrite it.
    const local = localStore(locationId);
    if (local.studies.length) {
      const ok = await saveStudies(local, locationId);
      if (ok) console.info(`Seeded ${local.studies.length} studies from this device.`);
    }
    return local;
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
    const data = await apiGet(locationId);
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
    await apiPut({
      id: studiesId(locationId),
      drafts: store.studies,
      notes: { hidden: JSON.stringify(store.hiddenIds), goal: String(store.goal) },
      liked: {},
      attendance: {},
    });
    return true;
  } catch (e) {
    console.warn("Supabase unreachable:", e, "— saved locally only");
    return false;
  }
}
