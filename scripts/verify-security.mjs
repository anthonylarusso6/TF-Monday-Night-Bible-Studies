/**
 * Checks whether the public key still has access to the database.
 *
 * Run after locking the table down. Before the lockdown everything here is
 * expected to be reachable; afterwards every direct attempt should be refused
 * while the app itself keeps working through its own server routes.
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

const blocked = (s) => s === 401 || s === 403 || s === 404;
let locked = 0, open = 0;

const check = (label, status) => {
  const good = blocked(status);
  good ? locked++ : open++;
  console.log(`  ${good ? "refused " : "ALLOWED "} ${label} (HTTP ${status})`);
};

console.log("\nDirect access with the key that ships in the browser:");
check("read  ", (await fetch(`${T}?select=id`, { headers: h })).status);
check("insert", (await fetch(T, {
  method: "POST", headers: { ...h, Prefer: "resolution=merge-duplicates" },
  body: JSON.stringify({ id: "_seccheck", notes: {}, liked: {}, attendance: {}, drafts: [] }),
})).status);
check("update", (await fetch(`${T}?id=eq._seccheck`, {
  method: "PATCH", headers: h, body: JSON.stringify({ notes: { x: "1" } }),
})).status);
check("delete", (await fetch(`${T}?id=eq._seccheck`, { method: "DELETE", headers: h })).status);

console.log("\nThe app's own routes (these must keep working):");
let appOk = false;
try {
  const r = await fetch(`${APP}/api/data?id=tf-knoxville__studies`, { cache: "no-store" });
  const j = await r.json();
  appOk = r.ok && j.ok;
  console.log(`  ${appOk ? "working " : "BROKEN  "} studies endpoint (${j.row?.drafts?.length ?? 0} studies)`);
} catch (e) {
  console.log("  BROKEN   studies endpoint:", e.message);
}
try {
  const r = await fetch(`${APP}/api/coaches`, { cache: "no-store" });
  const j = await r.json();
  const leak = JSON.stringify(j).includes("pin");
  console.log(`  ${j.ok && !leak ? "working " : "PROBLEM "} coaches endpoint (${j.coaches?.length ?? 0} coaches, PINs exposed: ${leak ? "YES" : "no"})`);
} catch (e) {
  console.log("  BROKEN   coaches endpoint:", e.message);
}

console.log(
  open === 0 && appOk
    ? "\nLocked down: the public key has no access and the app still works.\n"
    : open > 0
      ? `\nNot locked down yet — ${open} of 4 operations still allowed with the public key.\n`
      : "\nThe public key is blocked, but the app is not responding. Check SUPABASE_SERVICE_ROLE_KEY is set and redeployed.\n"
);
