import { readLocationRow, mergeLocationWrite, readStudiesRow, mergeStudiesWrite, previewsFor, previewOf, keyAllowed } from "../lib/dataAccess.ts";
import assert from "node:assert/strict";
const A = { id: "a", role: "Assistant Coach" }, B = { id: "b", role: "Volunteer" }, C = { id: "c", role: "Creator" };
const st = (id, by, extra = {}) => ({ id, title: id, date: "d", series: "", draft: false, anchor: { ref: "J 1:1", text: "t" }, sup: [], bi: "idea", bd: [{ ph: "p", pts: ["x"] }], sbd: [], qs: [{ q: "q", a: "a" }], tk: [{ ti: "T", bo: "body" }], createdBy: by, ...extra });

// location notes: journals stay private
const row = { notes: { s1: "n", _coach_journal_a: "A", _coach_journal_b: "B", _prayers: "[]" }, liked: {}, attendance: {}, drafts: [] };
assert.deepEqual(Object.keys(readLocationRow(row, A).notes).sort(), ["_coach_journal_a"], "no study keys without owning a study, no legacy prayers, no one else's journal");
const m = mergeLocationWrite(row, { notes: { _coach_journal_b: "HACK", _coach_journal_a: "A2", s2: "x" }, liked: { z: true } }, A);
assert.equal(m.notes._coach_journal_b, "B"); assert.equal(m.notes._coach_journal_a, "A2"); assert.equal(m.notes.s1, "n"); assert.equal(m.notes.s2, undefined, "a key for a study they do not own is ignored");
// two coaches saving different likes both survive
const m2 = mergeLocationWrite({ liked: { a: true } }, { liked: { b: true } }, B, new Set(["b"]));
assert.deepEqual(m2.liked, { a: true, b: true });

// studies
const lib = { drafts: [st("1", "a"), st("2", "b"), st("3", undefined)], notes: { hidden: "[]", goal: "20" } };
assert.deepEqual(readStudiesRow(lib, A).drafts.map(s => s.id), ["1"]);
assert.equal(readStudiesRow(lib, C).drafts.length, 3);
const pv = previewsFor(lib, A, new Set());
assert.deepEqual(pv.map(s => s.id), ["2", "3"]);
assert.deepEqual(pv[0].bd, []); assert.deepEqual(pv[0].qs, []); assert.equal(pv[0].tk[0].bo, "");
// A saving only their own list does not erase B's
const w = mergeStudiesWrite(lib, { drafts: [st("1", "a", { title: "new" }), st("9", "a")], notes: { hidden: "[]", goal: "20" } }, A);
assert.deepEqual(w.drafts.map(s => s.id).sort(), ["1", "2", "3", "9"]);
assert.equal(w.drafts.find(s => s.id === "1").title, "new");
// A cannot overwrite or hide B's study
const w2 = mergeStudiesWrite(lib, { drafts: [st("2", "a", { title: "stolen" })], notes: { hidden: JSON.stringify(["2", "1"]), goal: "20" } }, A);
assert.equal(w2.drafts.find(s => s.id === "2").title, "2");
assert.deepEqual(JSON.parse(w2.notes.hidden), ["1"]);
// a created study is stamped to the actor
assert.equal(mergeStudiesWrite(lib, { drafts: [st("8", "someoneelse")], notes: {} }, A).drafts.find(s => s.id === "8").createdBy, "a");
// prayers and per-study keys
const own = new Set(["s1"]);
const loc = { notes: { s1: "mine", s2: "theirs", _prayers_a: "A-prayers", _prayers_b: "B-prayers", _prayers: "legacy", _season_verse: "v", draft_9: "d" }, liked: { s1: true, s2: true }, attendance: { s1: 5, s2: 9 }, drafts: [] };
const asA = readLocationRow(loc, A, own);
assert.deepEqual(Object.keys(asA.notes).sort(), ["_prayers_a", "_season_verse", "draft_9", "s1"]);
assert.deepEqual(Object.keys(asA.liked), ["s1"]); assert.deepEqual(Object.keys(asA.attendance), ["s1"]);
const asC = readLocationRow(loc, C, new Set());
assert.ok(asC.notes._prayers_a && asC.notes._prayers_b && asC.notes._prayers && asC.notes.s2);
assert.ok(!keyAllowed("_prayers_a", B, own, false));
assert.ok(keyAllowed("_prayers_a", C, own, false) && !keyAllowed("_prayers_a", C, own, true), "Creator reads but does not write another coach's prayers");
const w3 = mergeLocationWrite(loc, { notes: { s2: "HACK", s1: "new", _prayers_b: "HACK", _prayers_a: "A2", _prayers: "HACK" }, attendance: { s2: 0, s1: 6 } }, A, own);
assert.equal(w3.notes.s2, "theirs"); assert.equal(w3.notes.s1, "new"); assert.equal(w3.notes._prayers_b, "B-prayers"); assert.equal(w3.notes._prayers_a, "A2"); assert.equal(w3.notes._prayers, "legacy");
assert.equal(w3.attendance.s2, 9); assert.equal(w3.attendance.s1, 6);
console.log("data-access tests passed");
