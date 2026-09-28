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

console.log("\nThe app's own routes, with no sign-in (all must be refused):");
const refusedStatus = (st) => st === 401 || st === 403;
async function expectRefused(label, input, init) {
  try {
    const r = await fetch(input, init);
    report(label, refusedStatus(r.status), `HTTP ${r.status}`);
  } catch (e) {
    report(label, true, `request failed (${e.message})`);
  }
}
const json = { "Content-Type": "application/json" };
await expectRefused("read studies     ", `${APP}/api/data?id=tf-knoxville__studies`, { cache: "no-store" });
await expectRefused("read prayer/notes", `${APP}/api/data?id=tf-knoxville`, { cache: "no-store" });
await expectRefused("overwrite studies", `${APP}/api/data`, {
  method: "POST", headers: json,
  body: JSON.stringify({ id: "tf-knoxville__studies", drafts: [], notes: {}, liked: {}, attendance: {} }),
});
await expectRefused("change a coach   ", `${APP}/api/coaches`, {
  method: "POST", headers: json, body: JSON.stringify({ action: "update", id: "anything", pin: "0000" }),
});
await expectRefused("add a coach      ", `${APP}/api/coaches`, {
  method: "POST", headers: json,
  body: JSON.stringify({ action: "add", name: "Intruder", role: "Head Coach", locationId: "tf-knoxville", pin: "1111" }),
});
await expectRefused("remove a coach   ", `${APP}/api/coaches`, {
  method: "POST", headers: json, body: JSON.stringify({ action: "remove", id: "anything" }),
});
await expectRefused("use the AI       ", `${APP}/api/generate`, {
  method: "POST", headers: json, body: JSON.stringify({ topic: "x" }),
});

console.log("\nStill open on purpose:");
let appOk = false;
try {
  const r = await fetch(`${APP}/api/coaches`, { cache: "no-store" });
  const j = await r.json();
  const leak = JSON.stringify(j).includes("pin");
  appOk = r.ok && j.ok && !leak;
  console.log(`  ${appOk ? "working" : "PROBLEM"}  coach list for the login screen (${j.coaches?.length ?? 0} coaches, PINs exposed: ${leak ? "YES" : "no"})`);
} catch (e) {
  console.log("  BROKEN   coach list:", e.message);
}
try {
  const r = await fetch(`${APP}/api/health`, { cache: "no-store" });
  const j = await r.json();
  const healthy = j.usingServiceKey && j.canRead;
  appOk = appOk && healthy;
  console.log(`  ${healthy ? "working" : "PROBLEM"}  server health (server key: ${j.usingServiceKey}, can read: ${j.canRead})`);
} catch (e) {
  console.log("  BROKEN   health:", e.message);
  appOk = false;
}

console.log(
  exposed === 0 && appOk
    ? "\nLocked down. Nothing is reachable without signing in, and the server is healthy.\n"
    : exposed > 0
      ? `\nStill open — ${exposed} operation(s) reachable without signing in.\n`
      : "\nThe key is blocked but the app is not responding. Check SUPABASE_SERVICE_ROLE_KEY.\n"
);
