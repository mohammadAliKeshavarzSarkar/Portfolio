// Validate the original JavaScript teaching blocks, not third-party demo code.
// Run: node docs/animation-learning/animorio/verify-notes.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const markdown = fs.readFileSync(
  path.join(__dirname, "FOUNDATIONS.md"),
  "utf8",
);
const blocks = [...markdown.matchAll(/```js\n([\s\S]*?)```/g)].map((m) => m[1]);
assert.equal(blocks.length, 5);
const context = vm.createContext({ AbortController, AggregateError });
vm.runInContext(blocks.join("\n"), context);
const {
  pointerFromCenter,
  progressAt,
  chapterAt,
  damp,
  coverRadius,
  wrapOffset,
  createScope,
} = context;
assert.equal(
  pointerFromCenter(40, 60, { left: 20, top: 30, width: 40, height: 60 }).x,
  0,
);
assert.equal(
  pointerFromCenter(40, 60, { left: 20, top: 30, width: 40, height: 60 }).y,
  0,
);
assert.equal(progressAt(400, 100, 700), 0.5);
assert.equal(progressAt(-100, 100, 700), 0);
assert.equal(progressAt(900, 100, 700), 1);
assert.equal(progressAt(1, 1, 1), 0);
assert.equal(progressAt(NaN, 1, 2), 0);
assert.equal(chapterAt(1, 4), 3);
assert.equal(chapterAt(-1, 4), 0);
assert.equal(chapterAt(0.5, 4), 2);
assert.throws(() => chapterAt(0, 0));
assert.throws(() => chapterAt(NaN, 4));
for (const fps of [30, 60, 120]) {
  let value = 0;
  for (let frame = 0; frame < fps; frame++)
    value = damp(value, 100, 1 / fps, 0.25);
  assert.ok(Math.abs(value - 93.75) < 1e-10);
}
assert.equal(damp(5, 10, 0, 1), 5);
assert.throws(() => damp(0, 1, -1, 1));
assert.equal(coverRadius(0, 0, 3, 4), 5);
assert.equal(coverRadius(3, 4, 6, 8), 5);
assert.equal(coverRadius(-3, 0, 0, 4), 5);
assert.equal(wrapOffset(0, 100), 0);
assert.equal(wrapOffset(-250, 100), -50);
assert.equal(wrapOffset(250, 100), -50);
assert.equal(wrapOffset(-200, 100), 0);
assert.throws(() => wrapOffset(2, 0));

const scope = createScope();
const target = new EventTarget();
let events = 0;
const cleanupOrder = [];
scope.listen(target, "check", () => events++);
scope.own(() => cleanupOrder.push(1));
scope.own(() => cleanupOrder.push(2));
target.dispatchEvent(new Event("check"));
scope.dispose();
scope.dispose();
target.dispatchEvent(new Event("check"));
assert.equal(events, 1);
assert.deepEqual(cleanupOrder, [2, 1]);
scope.own(() => cleanupOrder.push(3));
assert.deepEqual(cleanupOrder, [2, 1, 3]);
assert.throws(() => scope.listen(target, "check", () => {}));
const failingScope = createScope();
let completed = false;
failingScope.own(() => {
  completed = true;
});
failingScope.own(() => {
  throw new Error("expected failure");
});
assert.throws(() => failingScope.dispose(), AggregateError);
assert.equal(completed, true);
console.log("Original documentation code: all assertions passed.");
