const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const doc = fs.readFileSync(
  path.join(__dirname, "05-animation-ownership.md"),
  "utf8",
);
const source = [...doc.matchAll(/```js\n([\s\S]*?)```/g)]
  .map((m) => m[1])
  .join("\n");
const context = vm.createContext({});
vm.runInContext(source, context);
let next = 0;
const pending = new Map(),
  deltas = [];
const options = {
  request: (fn) => {
    pending.set(++next, fn);
    return next;
  },
  cancel: (id) => pending.delete(id),
};
function step(time) {
  const callbacks = [...pending.values()];
  pending.clear();
  callbacks.forEach((fn) => fn(time));
}
const owner = context.createFrameOwner((dt) => deltas.push(dt), options);
owner.setActive(true);
owner.setActive(true);
assert.equal(pending.size, 1);
step(1000);
assert.equal(deltas[0], 0);
step(1016);
assert.equal(deltas[1], 0.016);
step(5000);
assert.equal(deltas[2], 0.04);
owner.setActive(false);
assert.equal(pending.size, 0);
owner.setActive(true);
step(100000);
assert.equal(deltas.at(-1), 0);
owner.destroy();
owner.setActive(true);
assert.equal(pending.size, 0);
let errorCount = 0;
const failed = context.createFrameOwner(
  () => {
    throw Error("expected");
  },
  { ...options, onError: () => errorCount++ },
);
failed.setActive(true);
step(1);
assert.equal(errorCount, 1);
assert.equal(pending.size, 0);
failed.destroy();
let self;
self = context.createFrameOwner(() => self.setActive(false), options);
self.setActive(true);
step(1);
assert.equal(pending.size, 0);
self.destroy();
console.log("Frame scheduling invariants passed.");
async function browser() {
  const { chromium } = require("playwright");
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1000, height: 700 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.setContent(
      '<div id="stage" style="height:200px"><span id="marker">Motion</span></div><div style="height:2500px"></div>',
    );
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
      window.draws = 0;
      window.elapsed = 0;
      window.binding = bindFrameOwner(
        document.querySelector("#stage"),
        (dt) => {
          draws++;
          elapsed += dt;
          document.querySelector("#marker").style.transform =
            `translateX(${elapsed * 10}px)`;
        },
        () => {},
      );
    });
    await page.waitForFunction(() => draws > 3);
    await page.evaluate(() => scrollTo(0, 1000));
    await page.waitForTimeout(100);
    let count = await page.evaluate(() => draws);
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => draws), count);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForFunction((n) => draws > n, count);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(100);
    count = await page.evaluate(() => draws);
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => draws), count);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForFunction((n) => draws > n, count);
    await page.evaluate(() => binding.setContextReady(false));
    count = await page.evaluate(() => draws);
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => draws), count);
    await page.evaluate(() => binding.setContextReady(true));
    await page.waitForFunction((n) => draws > n, count);
    await page.evaluate(() => {
      binding.destroy();
      binding.destroy();
    });
    count = await page.evaluate(() => draws);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => draws), count);
    assert.deepEqual(errors, []);
    console.log(
      "Browser frame binding passed: intersection, reduced motion, readiness and disposal.",
    );
  } finally {
    await browser.close();
  }
}
if (process.argv.includes("--browser"))
  browser().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
