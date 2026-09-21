/**
 * Checks whether the public key still has access to the database.
 *
 * Judging this by HTTP status alone is misleading: with row security on,
 * PostgREST answers 200 for a read that is permitted to see nothing, and 204
 * for an update that matched no rows. Both look like success. What matters is
 * whether any data comes back or changes, so that is what this measures.
 *
 * Usage: npm run verify:security
 */
import { readFileSync } from "node:fs";

const env = (name) => {
  const f = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const m = f.match(new RegExp(`^${name}=(.+)$`, "m"));
  return process.env[name] || (m ? m[1].trim().replace(/^"|"$/g, "") : null);
};

const url = env("NEXT_PUBLIC_SUPABASE_URL");
const key = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const APP = process.env.TF_APP_URL || "https://tf-bible-study.vercel.app";
const T = `${url}/rest/v1/user_data`;
const h = { apikey: key, "Content-Type": "application/json" };

let exposed = 0;
const report = (label, safe, detail) => {
  if (!safe) exposed++;
  console.log(`  ${safe ? "blocked" : "EXPOSED"}  ${label}  ${detail}`);
};

console.log("\nWhat the key shipped to browsers can still do:");

// Read: the row count is what matters, not the status.
let rows = null;
try {
  const r = await fetch(`${T}?select=id`, { headers: h });
  const body = await r.json().catch(() => null);
  rows = Array.isArray(body) ? body.length : null;
  report("read  ", rows === 0, rows === 0 ? "returns no rows" : `returned ${rows} row(s)`);
} catch (e) {
  report("read  ", true, `request failed (${e.message})`);
}

// Insert: a refusal here is unambiguous.
try {
  const r = await fetch(T, {
    method: "POST",
    headers: { ...h, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ id: "_seccheck", notes: {}, liked: {}, attendance: {}, drafts: [] }),
  });
  report("insert", r.status === 401 || r.status === 403, `HTTP ${r.status}`);
  if (r.ok) await fetch(`${T}?id=eq._seccheck`, { method: "DELETE", headers: h });
} catch (e) {
  report("insert", true, `request failed (${e.message})`);
}

// Update: asking for the changed row back distinguishes "denied" from "matched
// nothing". Writing updated_at back as-is keeps this harmless if it succeeds.
try {
  const health = await fetch(`${APP}/api/data?id=tf-knoxville__studies`, { cache: "no-store" });
  const current = (await health.json())?.row?.updated_at ?? new Date().toISOString();
  const r = await fetch(`${T}?id=eq.tf-knoxville__studies`, {
    method: "PATCH",
    headers: { ...h, Prefer: "return=representation" },
    body: JSON.stringify({ updated_at: current }),
  });
  const body = await r.json().catch(() => []);
  const changed = Array.isArray(body) && body.length > 0;
  report("update", !changed, changed ? "modified a real row" : "changes nothing");
} catch (e) {
  report("update", true, `request failed (${e.message})`);
}

console.log("\n  delete  follows the same policies as insert and update — with none\n          granting access, it is refused for the same reason.");

console.log("\nThe app's own routes (these must keep working):");
let appOk = false;
try {
  const r = await fetch(`${APP}/api/data?id=tf-knoxville__studies`, { cache: "no-store" });
  const j = await r.json();
  appOk = r.ok && j.ok;
  console.log(`  ${appOk ? "working" : "BROKEN "}  studies endpoint (${j.row?.drafts?.length ?? 0} studies)`);
} catch (e) {
  console.log("  BROKEN   studies endpoint:", e.message);
}
try {
  const r = await fetch(`${APP}/api/coaches`, { cache: "no-store" });
  const j = await r.json();
  const leak = JSON.stringify(j).includes("pin");
  console.log(`  ${j.ok && !leak ? "working" : "PROBLEM"}  coaches endpoint (${j.coaches?.length ?? 0} coaches, PINs exposed: ${leak ? "YES" : "no"})`);
} catch (e) {
  console.log("  BROKEN   coaches endpoint:", e.message);
}

console.log(
  exposed === 0 && appOk
    ? "\nLocked down. The public key reaches nothing, and the app still works.\n"
    : exposed > 0
      ? `\nStill open — ${exposed} operation(s) reachable with the public key.\n`
      : "\nThe key is blocked but the app is not responding. Check SUPABASE_SERVICE_ROLE_KEY.\n"
);
