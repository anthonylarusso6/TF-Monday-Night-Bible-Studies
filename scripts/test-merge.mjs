/**
 * Tests the merge logic that keeps a device from losing studies.
 *
 * Every device built up its own library while saves to Supabase were failing,
 * so for a while each one held the only copy of some studies. If loading ever
 * replaced local with the server's copy again, whichever device loaded second
 * would lose whatever the other didn't have. These cases pin that down.
 *
 * Run with: npm run test:merge
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const out = mkdtempSync(join(tmpdir(), "tf-merge-"));
execFileSync("./node_modules/.bin/tsc", [
  "lib/merge.ts", "lib/types.ts", "--outDir", out,
  "--module", "es2020", "--target", "es2020",
  "--moduleResolution", "bundler", "--skipLibCheck",
], { stdio: "inherit" });

const { mergeStores, mergeUserData } = await import(join(out, "merge.js"));

const study = (id) => ({
  id, title: `Study ${id}`, series: "X", date: "", draft: false,
  anchor: { ref: "", text: "" }, sup: [], bi: "", bd: [], sbd: [], qs: [], tk: [],
});
const ids = (store) => store.studies.map((s) => s.id);

let run = 0;
const test = (name, fn) => { fn(); run++; console.log(`  ok  ${name}`); };

// The situation this exists for: one device seeds the server, the other opens
// afterwards holding studies the server has never seen.
const mac = { studies: [1, 2, 3].map(study), hiddenIds: [], goal: 20 };
const phone = { studies: Array.from({ length: 12 }, (_, i) => study(10 + i)), hiddenIds: [], goal: 20 };

test("the device loading second keeps all of its own studies", () => {
  const merged = mergeStores(mac, phone);
  for (const s of phone.studies) assert.ok(merged.studies.some((m) => m.id === s.id));
});

test("and the studies already on the server survive too", () => {
  const merged = mergeStores(mac, phone);
  for (const s of mac.studies) assert.ok(merged.studies.some((m) => m.id === s.id));
  assert.equal(merged.studies.length, 15);
});

test("merging is order-independent", () => {
  assert.equal(mergeStores(phone, mac).studies.length, mergeStores(mac, phone).studies.length);
});

test("a study on both sides is not duplicated", () => {
  const a = { studies: [1, 2].map(study), hiddenIds: [], goal: 20 };
  assert.equal(mergeStores(a, a).studies.length, 2);
});

test("a delete on one device stays deleted after merging", () => {
  const deleted = { studies: [1, 2].map(study), hiddenIds: ["2"], goal: 20 };
  const plain = { studies: [1, 2].map(study), hiddenIds: [], goal: 20 };
  assert.ok(mergeStores(deleted, plain).hiddenIds.includes("2"));
  assert.equal(mergeStores(deleted, deleted).hiddenIds.length, 1);
});

test("newest-first ordering is preserved", () => {
  const merged = mergeStores(
    { studies: [study(100)], hiddenIds: [], goal: 20 },
    { studies: [study(300), study(200)], hiddenIds: [], goal: 20 },
  );
  assert.deepEqual(ids(merged), [300, 200, 100]);
});

test("an empty side never wipes the other", () => {
  const empty = { studies: [], hiddenIds: [], goal: 20 };
  assert.equal(mergeStores(empty, phone).studies.length, 12);
  assert.equal(mergeStores(phone, empty).studies.length, 12);
});

test("hand-written drafts and leader notes both survive", () => {
  const merged = mergeUserData(
    { liked: { a: true }, notes: { 1: "server note" }, attendance: { 1: 10 }, drafts: [study("d1")] },
    { liked: { b: true }, notes: { 2: "local note" }, attendance: { 2: 20 }, drafts: [study("d2")] },
  );
  assert.equal(merged.drafts.length, 2);
  assert.equal(merged.notes[1], "server note");
  assert.equal(merged.notes[2], "local note");
  assert.equal(merged.attendance[2], 20);
  assert.ok(merged.liked.a && merged.liked.b);
});

console.log(`\n${run} tests passed\n`);
