import { NextResponse } from "next/server";
import { supabaseServer, usingServiceKey } from "@/lib/supabaseServer";

/**
 * Reports whether the server has its own database key and can actually use it.
 *
 * Needed before closing the database to anonymous access: if the server were
 * quietly falling back to the public key, that change would take the app down.
 * Deliberately reports only booleans and a count — never the key itself.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  let canRead = false;
  let rows = 0;
  let error: string | null = null;

  try {
    const { data, error: e } = await supabaseServer
      .from("user_data").select("id");
    if (e) throw new Error(e.message);
    canRead = true;
    rows = data?.length ?? 0;
  } catch (e) {
    error = e instanceof Error ? e.message : "unknown";
  }

  return NextResponse.json({
    usingServiceKey,
    canRead,
    rows,
    error,
    readyToLockDown: usingServiceKey && canRead,
  });
}
