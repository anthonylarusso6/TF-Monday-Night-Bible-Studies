import { createClient } from "@supabase/supabase-js";
import { UserData } from "./types";

const SUPABASE_URL = "https://plmmfyseqrxalujgdibz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsbW1meXNlcXJ4YWx1amdkaWJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NzQxMDksImV4cCI6MjA5MjM1MDEwOX0.x3IaFzm26PFXwZxx7ldbUQwyFoxM4FZ43acVO6dF0_o";

export const USER_ID = "anthony-tf-mnbs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function loadUserData(): Promise<UserData> {
  const { data, error } = await supabase
    .from("user_data")
    .select("*")
    .eq("id", USER_ID)
    .single();

  if (error || !data) {
    return { liked: {}, notes: {}, attendance: {}, drafts: [] };
  }

  return {
    liked: data.liked || {},
    notes: data.notes || {},
    attendance: data.attendance || {},
    drafts: data.drafts || [],
  };
}

export async function saveUserData(userData: UserData): Promise<void> {
  await supabase.from("user_data").upsert({
    id: USER_ID,
    liked: userData.liked,
    notes: userData.notes,
    attendance: userData.attendance,
    drafts: userData.drafts,
    updated_at: new Date().toISOString(),
  });
}
