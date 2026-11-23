const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const text = fs.readFileSync(
  path.join(__dirname, "04-navigation-and-reveals.md"),
  "utf8",
);
const blocks = [...text.matchAll(/```js\n([\s\S]*?)```/g)].map((m) => m[1]);
assert.equal(blocks.length, 2);
const context = vm.createContext({});
vm.runInContext(blocks.join("\n"), context);
const { revealRadius, strokeOffset, createRevealController } = context;
assert.equal(revealRadius(0, 0, 3, 4, 0), 5);
assert.equal(revealRadius(3, 4, 6, 8, 0), 5);
assert.equal(revealRadius(-3, 0, 0, 4, 0), 5);
assert.throws(() => revealRadius(0, 0, -1, 4));
assert.equal(strokeOffset(-1), 1);
assert.equal(strokeOffset(0.5), 0.5);
assert.equal(strokeOffset(2), 0);
function fixture() {
  const jobs = [],
    commits = [],
    failures = [];
  let disposals = 0;
  const controller = createRevealController({
    sample: () => 0.5,
    prepare() {},
    animate() {
      let resolve, reject;
      const finished = new Promise((a, b) => {
        resolve = a;
        reject = b;
      });
      const job = {
        finished,
        resolve,
        reject,
        canceled: false,
        cancel() {
          this.canceled = true;
        },
      };
      jobs.push(job);
      return job;
    },
    commit: (open) => commits.push(open),
    recover: (error) => failures.push(error),
    dispose: () => disposals++,
  });
  return { controller, jobs, commits, failures, disposals: () => disposals };
}
(async () => {
  const f = fixture();
  const first = f.controller.request(true);
  const second = f.controller.request(false);
  const third = f.controller.request(true);
  assert.ok(f.jobs[0].canceled && f.jobs[1].canceled);
  f.jobs[1].resolve();
  f.jobs[0].reject(new Error("obsolete"));
  await Promise.all([first, second]);
  assert.deepEqual(f.commits, []);
  assert.deepEqual(f.failures, []);
  f.jobs[2].resolve();
  await third;
  assert.deepEqual(f.commits, [true]);
  assert.equal(f.controller.state, "open");
  const failed = f.controller.request(false);
  f.jobs[3].reject(new Error("render failed"));
  await failed;
  assert.equal(f.failures.length, 1);
  assert.equal(f.controller.state, "closed");
  const pending = f.controller.request(true);
  f.controller.destroy();
  f.controller.destroy();
  f.jobs[4].resolve();
  await pending;
  assert.equal(f.disposals(), 1);
  assert.ok(f.jobs[4].canceled);
  assert.deepEqual(f.commits, [true]);
  await f.controller.request(true);
  assert.equal(f.jobs.length, 5);
  console.log(
    "Navigation lesson: geometry, interruption, stale completion/rejection, recovery and disposal passed.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
