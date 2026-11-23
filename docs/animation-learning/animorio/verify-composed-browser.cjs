const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { chromium } = require("playwright");
const read = (n) => fs.readFileSync(path.join(__dirname, n), "utf8");
const extract = (s, l) =>
  [...s.matchAll(new RegExp("```" + l + "\\n([\\s\\S]*?)```", "g"))]
    .map((m) => m[1])
    .join("\n");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    const modal = read("04-browser-adapter.md"),
      gpu = read("05-browser-renderer.md");
    const body = `<style>${extract(modal, "css")}${extract(gpu, "css")}main{min-height:2500px}</style>${extract(modal, "html")}<main><h1 tabindex="-1">/a</h1>${extract(gpu, "html")}</main>`;
    await page.route("https://composed-study.test/**", (route) =>
      route.fulfill({ contentType: "text/html", body }),
    );
    await page.goto("https://composed-study.test/a");
    const files = [
      "04-navigation-and-reveals.md",
      "04-browser-adapter.md",
      "05-animation-ownership.md",
      "05-browser-renderer.md",
      "06-history-restoration.md",
    ];
    await page.addScriptTag({
      content: files.map((n) => extract(read(n), "js")).join("\n"),
    });
    await page.evaluate(() => {
      window.lock = makeScrollLock(document.documentElement);
      window.menu = mountMenuLesson(lock);
      window.renderer = mountGpuStudy(document.querySelector(".gpu-study"), {
        animate: true,
      });
      window.oldRenderers = [];
      window.failures = [];
      window.routes = mountHistoryStudy({
        onError: (e) => failures.push(String(e)),
        prepare: async (url) => {
          renderer.setPaused(true);
          await menu.request(false);
          if (new URL(url).pathname === "/slow")
            await new Promise((resolve) => setTimeout(resolve, 180));
          const main = document.createElement("main");
          const h = document.createElement("h1");
          h.tabIndex = -1;
          h.textContent = new URL(url).pathname;
          const stage = document.querySelector(".gpu-study").cloneNode(true);
          stage.querySelector("canvas").hidden = true;
          main.append(h, stage);
          return {
            commit() {
              renderer.destroy();
              oldRenderers.push(renderer);
              document.querySelector("main").replaceWith(main);
              renderer = mountGpuStudy(main.querySelector(".gpu-study"), {
                animate: true,
              });
            },
            ready: Promise.resolve(),
            focus() {
              h.focus({ preventScroll: true });
            },
          };
        },
      });
    });
    await page.waitForFunction(() => renderer.counts.draws > 4);
    // The shell owns the pause; dialog owns its own modal/lock lifecycle.
    await page.evaluate(async () => {
      renderer.setPaused(true);
      await menu.request(true);
    });
    let n = await page.evaluate(() => renderer.counts.draws);
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => renderer.counts.draws), n);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(80);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForTimeout(100);
    n = await page.evaluate(() => renderer.counts.draws);
    await page.waitForTimeout(100);
    assert.equal(
      await page.evaluate(() => renderer.counts.draws),
      n,
      "Rebuilding behind modal must preserve shell pause",
    );
    await page.evaluate(async () => {
      await menu.request(false);
      renderer.setPaused(false);
    });
    await page.waitForFunction((n) => renderer.counts.draws > n + 2, n);
    await page.evaluate(async () => {
      await menu.request(false);
      await routes.navigate("/b");
    });
    await page.waitForFunction(() => renderer.counts.draws > 4);
    assert.equal(await page.locator("main h1").textContent(), "/b");
    const old = await page.evaluate(() =>
      oldRenderers.map((r) => r.counts.draws),
    );
    await page.waitForTimeout(100);
    assert.deepEqual(
      await page.evaluate(() => oldRenderers.map((r) => r.counts.draws)),
      old,
    );
    await page.goBack();
    await page.waitForFunction(
      () => document.querySelector("main h1").textContent === "/a",
    );
    await page.waitForFunction(() => renderer.counts.draws > 3);
    // Route generation is acquired before preparation closes the modal.
    await page.evaluate(async () => {
      renderer.setPaused(true);
      await menu.request(true);
    });
    await page.evaluate(async () => {
      const slow = routes.navigate("/slow");
      const latest = routes.navigate("/latest");
      await Promise.all([slow, latest]);
    });
    assert.equal(await page.locator("main h1").textContent(), "/latest");
    assert.equal(await page.locator("#menu").evaluate((el) => el.open), false);
    assert.equal(
      await page.evaluate(() => document.documentElement.style.overflow),
      "",
    );
    assert.equal(
      await page
        .locator("main h1")
        .evaluate((el) => el === document.activeElement),
      true,
    );
    // Back while modal is open uses the same preparation barrier.
    await page.evaluate(async () => {
      renderer.setPaused(true);
      await menu.request(true);
    });
    await page.goBack();
    await page.waitForFunction(
      () => document.querySelector("main h1").textContent === "/slow",
    );
    assert.equal(await page.locator("#menu").evaluate((el) => el.open), false);
    assert.equal(
      await page.evaluate(() => document.documentElement.style.overflow),
      "",
    );
    await page.evaluate(() => {
      renderer.setPaused(true);
      menu.request(true);
      menu.destroy();
      routes.destroy();
      renderer.destroy();
    });
    const final = await page.evaluate(() => renderer.counts.draws);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => renderer.counts.draws), final);
    assert.equal(
      await page.evaluate(() => document.documentElement.style.overflow),
      "",
    );
    assert.equal(await page.locator("#menu").evaluate((el) => el.open), false);
    assert.equal(await page.evaluate(() => history.scrollRestoration), "auto");
    assert.deepEqual(await page.evaluate(() => failures), []);
    assert.deepEqual(errors, []);
    console.log(
      "Composed fixture passed: modal pause, preference rebuild, route GPU teardown, history and final cleanup.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
