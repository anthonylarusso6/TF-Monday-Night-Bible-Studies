import { createClient } from "@supabase/supabase-js";
import { UserData } from "./types";

const SUPABASE_URL = "https://plmmfyseqrxalujgdibz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbW1meXNlcXJ4YWx1amdkaWJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzQxMDksImV4cCI6MjA5MjM1MDEwOX0.x3IaFzm26PFXwZxx7ldbUQwyFoxM4FZ43acVO6dF0_o";

export const USER_ID = "anthony-tf-mnbs";
const LS_KEY = "tf_userdata_backup";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const EMPTY: UserData = { liked: {}, notes: {}, attendance: {}, drafts: [] };

function fromLS(): UserData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function toLS(data: UserData) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

export async function loadUserData(): Promise<UserData> {
  try {
    const { data, error } = await supabase
      .from("user_data")
      .select("*")
      .eq("id", USER_ID)
      .single();

    if (error) {
      // PGRST116 = no rows found — that's fine on first use
      if (error.code !== "PGRST116") {
        console.warn("Supabase load error:", error.message, "— using local backup");
      }
      return fromLS();
    }

    const result: UserData = {
      liked: data.liked || {},
      notes: data.notes || {},
      attendance: data.attendance || {},
      drafts: data.drafts || [],
    };
    toLS(result);
    return result;
  } catch (e) {
    console.warn("Supabase unreachable:", e, "— using local backup");
    return fromLS();
  }
}

export async function saveUserData(userData: UserData): Promise<void> {
  // Always save to localStorage immediately as a reliable backup
  toLS(userData);

  try {
    const { error } = await supabase.from("user_data").upsert({
      id: USER_ID,
      liked: userData.liked,
      notes: userData.notes,
      attendance: userData.attendance,
      drafts: userData.drafts,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.warn("Supabase save error:", error.message, "— saved locally only");
    }
  } catch (e) {
    console.warn("Supabase unreachable:", e, "— saved locally only");
  }
}
