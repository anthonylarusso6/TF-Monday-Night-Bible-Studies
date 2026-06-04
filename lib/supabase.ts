import { createClient } from "@supabase/supabase-js";
import { UserData } from "./types";
import { DEFAULT_LOCATION } from "./locations";

const SUPABASE_URL = "https://plmmfyseqrxalujgdibz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbW1meXNlcXJ4YWx1amdkaWJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzQxMDksImV4cCI6MjA5MjM1MDEwOX0.x3IaFzm26PFXwZxx7ldbUQwyFoxM4FZ43acVO6dF0_o";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const EMPTY: UserData = { liked: {}, notes: {}, attendance: {}, drafts: [] };

function lsKey(locationId: string) { return `tf_userdata_${locationId}`; }

function fromLS(locationId: string): UserData {
  try {
    const raw = localStorage.getItem(lsKey(locationId));
    return raw ? JSON.parse(raw) : EMPTY;
  } catch { return EMPTY; }
}

function toLS(data: UserData, locationId: string) {
  try { localStorage.setItem(lsKey(locationId), JSON.stringify(data)); } catch {}
}

export async function loadUserData(locationId = DEFAULT_LOCATION.id): Promise<UserData> {
  try {
    const { data, error } = await supabase
      .from("user_data")
      .select("*")
      .eq("id", locationId)
      .single();

    if (error) {
      if (error.code !== "PGRST116") {
        console.warn("Supabase load error:", error.message, "— using local backup");
      }
      return fromLS(locationId);
    }

    const result: UserData = {
      liked: data.liked || {},
      notes: data.notes || {},
      attendance: data.attendance || {},
      drafts: data.drafts || [],
    };
    toLS(result, locationId);
    return result;
  } catch (e) {
    console.warn("Supabase unreachable:", e, "— using local backup");
    return fromLS(locationId);
  }
}

export async function saveUserData(userData: UserData, locationId = DEFAULT_LOCATION.id): Promise<void> {
  toLS(userData, locationId);
  try {
    const { error } = await supabase.from("user_data").upsert({
      id: locationId,
      liked: userData.liked,
      notes: userData.notes,
      attendance: userData.attendance,
      drafts: userData.drafts,
      updated_at: new Date().toISOString(),
    });
    if (error) console.warn("Supabase save error:", error.message, "— saved locally only");
  } catch (e) {
    console.warn("Supabase unreachable:", e, "— saved locally only");
  }
}
