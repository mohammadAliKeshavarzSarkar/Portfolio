const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const markdown = fs.readFileSync(
  path.join(__dirname, "05-rendering-and-fallbacks.md"),
  "utf8",
);
const blocks = [...markdown.matchAll(/```js\n([\s\S]*?)```/g)].map((m) => m[1]);
assert.equal(blocks.length, 2);
const context = vm.createContext({});
vm.runInContext(blocks.join("\n"), context);
const { advectRing, fieldSize, fluidBudget } = context;
const plain = (value) => JSON.parse(JSON.stringify(value));
assert.deepEqual(plain(advectRing([1, 0, 0, 0], 1, 1)), [0, 1, 0, 0]);
assert.deepEqual(plain(advectRing([1, 0, 0, 0], -1, 1)), [0, 0, 0, 1]);
assert.deepEqual(plain(advectRing([1, 0, 0, 0], 1, 0.5)), [0.5, 0.5, 0, 0]);
assert.deepEqual(plain(advectRing([1, 2, 3, 4], 4, 1)), [1, 2, 3, 4]);
assert.throws(() => advectRing([], 1, 1));
assert.throws(() => advectRing([1], 1, -1));
assert.deepEqual(plain(fieldSize(128, 0.5)), [128, 256]);
assert.throws(() => fieldSize(0, 1));
assert.throws(() => fieldSize(128, 0));
const desktop = fluidBudget(256, 512, 16 / 9, 20),
  coarse = fluidBudget(128, 384, 16 / 9, 12);
assert.equal(desktop.fieldBytes, 13045760);
assert.equal(coarse.fieldBytes, 5597184);
assert.equal(desktop.drawsWithVorticity, 28);
assert.equal(coarse.drawsWithVorticity, 20);
assert.equal(fluidBudget(256, 512, 16 / 9, 20, 10).drawsWithVorticity, 48);
assert.equal(
  fluidBudget(256, 512, 2, 20).fieldBytes * 4,
  fluidBudget(512, 1024, 2, 20).fieldBytes,
);
assert.throws(() => fluidBudget(128, 256, 1, 1.5));
console.log(
  "Rendering lesson: transport, wrapping, interpolation, field memory and draw budgets passed.",
);
