import { readLocationRow, mergeLocationWrite, readStudiesRow, mergeStudiesWrite, previewsFor, previewOf } from "../lib/dataAccess.ts";
import assert from "node:assert/strict";
const A = { id: "a", role: "Assistant Coach" }, B = { id: "b", role: "Volunteer" }, C = { id: "c", role: "Creator" };
const st = (id, by, extra = {}) => ({ id, title: id, date: "d", series: "", draft: false, anchor: { ref: "J 1:1", text: "t" }, sup: [], bi: "idea", bd: [{ ph: "p", pts: ["x"] }], sbd: [], qs: [{ q: "q", a: "a" }], tk: [{ ti: "T", bo: "body" }], createdBy: by, ...extra });

// location notes: journals stay private
const row = { notes: { s1: "n", _coach_journal_a: "A", _coach_journal_b: "B", _prayers: "[]" }, liked: {}, attendance: {}, drafts: [] };
assert.deepEqual(Object.keys(readLocationRow(row, A).notes).sort(), ["_coach_journal_a", "_prayers", "s1"]);
const m = mergeLocationWrite(row, { notes: { _coach_journal_b: "HACK", _coach_journal_a: "A2", s2: "x" }, liked: { z: true } }, A);
assert.equal(m.notes._coach_journal_b, "B"); assert.equal(m.notes._coach_journal_a, "A2"); assert.equal(m.notes.s1, "n"); assert.equal(m.notes.s2, "x");
// two coaches saving different likes both survive
const m2 = mergeLocationWrite({ liked: { a: true } }, { liked: { b: true } }, B);
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
console.log("data-access tests passed");
