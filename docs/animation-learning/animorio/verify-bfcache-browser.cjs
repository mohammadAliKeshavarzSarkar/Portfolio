const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  crypto = require("node:crypto");
const { chromium } = require("playwright");
const read = (n) => fs.readFileSync(path.join(__dirname, n), "utf8");
const extract = (s) =>
  [...s.matchAll(/```js\n([\s\S]*?)```/g)].map((m) => m[1]).join("\n");
const lesson = read("06-bfcache-lifecycle.md");
const source =
  extract(read("05-animation-ownership.md")) + "\n" + extract(lesson);
(async () => {
  const bootstrap = `${source}
 window.identity=Math.random();window.draws=0;window.deltas=[];window.shows=[];window.hides=[];window.suspends=0;window.resumes=0;window.mounts=1;
 window.owner=createFrameOwner(dt=>{draws++;deltas.push(dt);});owner.setActive(true);
 window.lifecycle=bindPageLifecycle({suspend(){suspends++;owner.setActive(false);},resume(){resumes++;owner.setActive(true);}});
 addEventListener('pagehide',e=>hides.push(e.persisted));addEventListener('pageshow',e=>shows.push(e.persisted));`;
  const server = http.createServer((req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.end(
      req.url === "/a"
        ? `<h1>Cached fixture</h1><a href="/b">Leave</a><script>${bootstrap}</script>`
        : "<h1>Other document</h1>",
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      headless: true,
      ignoreDefaultArgs: ["--disable-back-forward-cache"],
    });
    const page = await browser.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(`http://127.0.0.1:${server.address().port}/a`);
    await page.waitForFunction(() => draws > 3);
    const identity = await page.evaluate(() => identity);
    for (let i = 0; i < 2; i++) {
      const before = await page.evaluate(() => draws);
      await page.click("a");
      await page.goBack({ waitUntil: "commit" });
      await page.waitForFunction((n) => resumes === n, i + 1);
      await page.waitForFunction((n) => draws > n, before);
      assert.equal(await page.evaluate(() => identity), identity);
      const values = await page.evaluate(() => ({
        deltas,
        shows,
        hides,
        suspends,
        resumes,
        mounts,
      }));
      assert.equal(values.mounts, 1);
      assert.ok(values.hides.every(Boolean));
      assert.equal(values.shows.at(-1), true);
      // The first delta after each suspension must reset to zero.
      assert.equal(values.deltas.filter((dt) => dt === 0).length, i + 2);
    }
    await page.evaluate(() => {
      lifecycle.destroy();
      lifecycle.destroy();
      owner.destroy();
    });
    const final = await page.evaluate(() => ({ draws, resumes }));
    await page.click("a");
    await page.goBack({ waitUntil: "commit" });
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => identity), identity);
    assert.deepEqual(await page.evaluate(() => ({ draws, resumes })), final);
    assert.deepEqual(errors, []);
    const result = {
      recordedAt: new Date().toISOString(),
      browser: browser.version(),
      headless: true,
      launchChange:
        "Removed --disable-back-forward-cache from Playwright defaults",
      lessonSHA256: crypto.createHash("sha256").update(lesson).digest("hex"),
      status: "passed",
      observed: await page.evaluate(() => ({
        shows,
        hides,
        suspends,
        resumes,
        mounts,
      })),
      scope:
        "Actual persisted cross-document cache return for a standalone frame owner; no GPU/modal composition or performance claim",
    };
    if (process.argv.includes("--record"))
      fs.writeFileSync(
        path.join(__dirname, "bfcache-validation.json"),
        JSON.stringify(result, null, 2) + "\n",
      );
    console.log(
      "Actual bfcache checks passed: identity, persisted events, zero-delta resume, repeated traversal and disposal.",
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
