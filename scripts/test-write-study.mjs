import { parseWrittenStudy, TEMPLATE } from "../lib/writeStudy.ts";
import assert from "node:assert/strict";
const o = { id: "x", date: "d", createdBy: "c1" };

const r = parseWrittenStudy(`Title: Slow to Anger
Series: Faith & Character
Verse: James 1:19 (NIV)
Verse text: "Everyone should be quick to listen,
slow to speak and slow to become angry."
Supporting verse: Proverbs 15:1 — A gentle answer turns away wrath.
Big idea: Anger is not the sin.
What you do with it is.

Break it down:
Phrase: slow to become angry
- It does not say never.
- It says slow.
Say this: Anger is a fire.

Supporting verse breakdown: Proverbs 15:1 — Soft words cool a room.

Questions:
Q: When did you last snap?
A: Be honest.
 Give them space.
Q: Second?
A: Yes.

Takeaways:
1. Slow is a skill — Practice the pause.
2. Not X: it is Y
`, o);
assert.ok(r.study);
const s = r.study;
assert.equal(s.title, "Slow to Anger");
assert.equal(s.series, "Faith & Character");
assert.equal(s.anchor.text, "Everyone should be quick to listen, slow to speak and slow to become angry.");
assert.deepEqual(s.sup, [{ ref: "Proverbs 15:1", text: "A gentle answer turns away wrath." }]);
assert.equal(s.bi, "Anger is not the sin. What you do with it is.");
assert.deepEqual(s.bd[0].pts, ["It does not say never.", "It says slow."]);
assert.equal(s.bd[0].co.tx, "Anger is a fire.");
assert.equal(s.sbd[0].pt, "Soft words cool a room.");
assert.equal(s.qs.length, 2);
assert.equal(s.qs[0].a, "Be honest. Give them space.");
assert.deepEqual(s.tk[0], { ti: "Slow is a skill", bo: "Practice the pause." });
assert.deepEqual(s.tk[1], { ti: "Not X", bo: "it is Y" });
assert.equal(s.createdBy, "c1");
assert.equal(s.draft, false);

const bad = parseWrittenStudy("Title: Only a title", o);
assert.equal(bad.study, null);
assert.match(bad.warnings[0], /Verse, Big idea/);

const t = parseWrittenStudy(TEMPLATE.replace("Title: ", "Title: T").replace("Big idea: ", "Big idea: B"), o);
assert.ok(t.study, "the template itself parses once the blanks are filled");
console.log("write-study tests passed");
