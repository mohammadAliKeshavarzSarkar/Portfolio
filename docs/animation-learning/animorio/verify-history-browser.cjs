const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const playwright = require("playwright");
const markdown = fs.readFileSync(
  path.join(__dirname, "06-history-restoration.md"),
  "utf8",
);
const code = [...markdown.matchAll(/```js\n([\s\S]*?)```/g)]
  .map((m) => m[1])
  .join("\n");
(async () => {
  const engine = process.env.BROWSER_ENGINE || "chromium";
  if (!["chromium", "firefox", "webkit"].includes(engine))
    throw new Error("Unknown browser engine");
  const browser = await playwright[engine].launch({
    ...(engine === "chromium"
      ? { executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium" }
      : {}),
    headless: true,
    timeout: 20000,
  });
  console.log(`Engine: ${engine} ${browser.version()}`);
  try {
    const page = await browser.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.route("https://history-study.test/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<main><h1 tabindex="-1">/a</h1><div style="height:4000px"></div></main>',
      }),
    );
    await page.goto("https://history-study.test/a");
    await page.addScriptTag({ content: code });
    await page.evaluate(() => {
      window.commitCount = 0;
      window.failures = [];
      window.study = mountHistoryStudy({
        onError: (e) => failures.push(String(e)),
        prepare: async (url) => {
          const name = new URL(url).pathname;
          if (name === "/slow") await new Promise((r) => setTimeout(r, 180));
          const main = document.createElement("main");
          main.innerHTML = `<h1 tabindex="-1">${name}</h1><div style="height:10px"></div>`;
          let ready;
          return {
            commit() {
              commitCount++;
              document.querySelector("main").replaceWith(main);
              ready = new Promise((r) =>
                setTimeout(() => {
                  main.lastElementChild.style.height = "4000px";
                  r();
                }, 60),
              );
            },
            get ready() {
              return ready;
            },
            focus() {
              main.firstElementChild.focus({ preventScroll: true });
            },
          };
        },
      });
    });
    await page.evaluate(() => study.refresh());
    async function scroll(y) {
      await page.evaluate((y) => scrollTo(0, y), y);
      await page.waitForTimeout(60);
    }
    async function expect(name, y) {
      await page.waitForFunction(
        ({ name, y }) =>
          document.querySelector("h1").textContent === name &&
          Math.abs(scrollY - y) < 2,
        { name, y },
      );
    }
    await scroll(600);
    await page.evaluate(() => study.navigate("/b"));
    await expect("/b", 0);
    await scroll(900);
    await page.evaluate(() => study.navigate("/a"));
    await expect("/a", 0);
    await scroll(1200);
    await page.goBack();
    await expect("/b", 900);
    await page.goBack();
    await expect("/a", 600);
    await page.goForward();
    await expect("/b", 900);
    await page.goForward();
    await expect("/a", 1200);
    await page.evaluate(async () => {
      const slow = study.navigate("/slow");
      const fast = study.navigate("/fast");
      await Promise.all([slow, fast]);
    });
    await expect("/fast", 0);
    assert.equal(
      await page.locator("h1").evaluate((el) => el === document.activeElement),
      true,
    );
    await page.evaluate(async () => {
      const pending = study.navigate("/slow");
      study.destroy();
      await pending;
    });
    assert.equal(await page.locator("h1").textContent(), "/fast");
    assert.equal(await page.evaluate(() => history.scrollRestoration), "auto");
    const commits = await page.evaluate(() => commitCount);
    await page.evaluate(() => study.navigate("/after-disposal"));
    assert.equal(await page.evaluate(() => commitCount), commits);
    assert.deepEqual(await page.evaluate(() => failures), []);
    assert.deepEqual(errors, []);
    console.log(
      "History fixture passed: back/forward, repeated routes, delayed layout, latest navigation, focus and disposal.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
