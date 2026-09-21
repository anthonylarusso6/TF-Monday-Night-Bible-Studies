/**
 * Writes every row of user_data to a timestamped JSON file.
 *
 * The database is reachable with a key that ships in the browser bundle, and
 * that key can delete. Until that changes, an off-site copy is the only thing
 * standing between a bad request and the whole library. Keep these files out
 * of git — they contain coach PINs.
 *
 * Usage: npm run backup
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const OUT_DIR = process.env.TF_BACKUP_DIR || join(homedir(), "tf-bible-backups");
const KEEP = 30;

function env(name) {
  const local = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const m = local.match(new RegExp(`^${name}=(.+)$`, "m"));
  return process.env[name] || (m ? m[1].trim().replace(/^"|"$/g, "") : null);
}

const url = env("NEXT_PUBLIC_SUPABASE_URL");
const key = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
if (!url || !key) {
  console.error("Missing Supabase URL or key (.env.local or environment).");
  process.exit(1);
}

const res = await fetch(`${url}/rest/v1/user_data?select=*`, { headers: { apikey: key } });
if (!res.ok) {
  console.error(`Backup failed: HTTP ${res.status} ${await res.text()}`);
  process.exit(1);
}
const rows = await res.json();

// A backup that captures an empty database would quietly replace good copies
// with nothing, so treat that as a failure unless it is explicitly expected.
if (!Array.isArray(rows) || (rows.length === 0 && !process.env.TF_ALLOW_EMPTY)) {
  console.error("Refusing to write: the database returned no rows. Set TF_ALLOW_EMPTY=1 to override.");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const file = join(OUT_DIR, `user_data-${stamp}.json`);
writeFileSync(file, JSON.stringify(rows, null, 2));

const studies = rows.find((r) => String(r.id).endsWith("__studies"));
const coaches = rows.find((r) => r.id === "_coaches");
const coachCount = coaches?.notes?.list ? JSON.parse(coaches.notes.list).length : 0;

console.log(`Saved ${file}`);
console.log(`  rows: ${rows.length}`);
console.log(`  studies: ${Array.isArray(studies?.drafts) ? studies.drafts.length : 0}`);
console.log(`  coaches: ${coachCount}`);

// Keep the folder from growing without limit.
const old = readdirSync(OUT_DIR)
  .filter((f) => f.startsWith("user_data-") && f.endsWith(".json"))
  .map((f) => ({ f, t: statSync(join(OUT_DIR, f)).mtimeMs }))
  .sort((a, b) => b.t - a.t)
  .slice(KEEP);
for (const { f } of old) unlinkSync(join(OUT_DIR, f));
if (old.length) console.log(`  pruned ${old.length} old backup(s), keeping ${KEEP}`);
