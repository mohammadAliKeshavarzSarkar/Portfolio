const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { chromium } = require("playwright");
const read = (n) => fs.readFileSync(path.join(__dirname, n), "utf8");
const blocks = (s, l) =>
  [...s.matchAll(new RegExp("```" + l + "\\n([\\s\\S]*?)```", "g"))]
    .map((m) => m[1])
    .join("\n");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
  });
  try {
    const doc = read("04-browser-adapter.md"),
      base = read("04-navigation-and-reveals.md");
    for (const reduced of [false, true]) {
      const ctx = await browser.newContext({
          reducedMotion: reduced ? "reduce" : "no-preference",
        }),
        page = await ctx.newPage(),
        errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.setContent(
        `<style>body{min-height:2000px}${blocks(doc, "css")}</style>${blocks(doc, "html")}`,
      );
      await page.addScriptTag({
        content: blocks(base, "js") + "\n" + blocks(doc, "js"),
      });
      await page.evaluate(() => {
        window.lock = makeScrollLock(document.documentElement);
        window.menu = mountMenuLesson(lock);
      });
      await page.locator("#open-menu").focus();
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => menu.state === "open");
      assert.equal(
        await page
          .locator("#close-menu")
          .evaluate((el) => el === document.activeElement),
        true,
      );
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press("Tab");
        assert.equal(
          await page.evaluate(
            () =>
              document.activeElement === document.body ||
              document.querySelector("#menu").contains(document.activeElement),
          ),
          true,
        );
      }
      assert.equal(
        await page
          .locator("path")
          .evaluate((el) => getComputedStyle(el).strokeDashoffset),
        "0px",
      );
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => menu.state === "closed");
      assert.equal(
        await page
          .locator("#open-menu")
          .evaluate((el) => el === document.activeElement),
        true,
      );
      assert.equal(
        await page.evaluate(() => document.documentElement.style.overflow),
        "",
      );
      await page.evaluate(() => {
        menu.request(true);
        menu.request(false);
        menu.request(true);
      });
      await page.waitForFunction(() => menu.state === "open");
      await page.waitForTimeout(250);
      assert.equal(await page.locator("#menu").evaluate((el) => el.open), true);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.waitForFunction(() => menu.state === "open");
      await page.evaluate(() => {
        window.other = lock();
        menu.request(false);
      });
      await page.waitForFunction(() => menu.state === "closed");
      assert.equal(
        await page.evaluate(() => document.documentElement.style.overflow),
        "hidden",
      );
      await page.evaluate(() => other());
      assert.equal(
        await page.evaluate(() => document.documentElement.style.overflow),
        "",
      );
      await page.evaluate(() => {
        menu.request(true);
        menu.destroy();
        menu.destroy();
      });
      await page.waitForTimeout(250);
      assert.equal(
        await page.locator("#menu").evaluate((el) => el.open),
        false,
      );
      assert.equal(
        await page.evaluate(() => document.getAnimations().length),
        0,
      );
      assert.equal(
        await page.evaluate(() => document.documentElement.style.overflow),
        "",
      );
      assert.deepEqual(errors, []);
      console.log(
        `Modal, SVG, interruption and cleanup passed; reduced=${reduced}`,
      );
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
