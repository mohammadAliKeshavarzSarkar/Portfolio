const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const url = process.env.LAB_URL || "http://127.0.0.1:4173";
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.STUDY_CHROMIUM || "/usr/bin/chromium",
    headless: true,
  });
  const outcomes = [];
  try {
    for (const mode of ["desktop", "mobile", "reduced"]) {
      const context = await browser.newContext({
        viewport:
          mode === "mobile"
            ? { width: 390, height: 844 }
            : { width: 1440, height: 900 },
        reducedMotion: mode === "reduced" ? "reduce" : "no-preference",
        isMobile: mode === "mobile",
        hasTouch: mode === "mobile",
      });
      const page = await context.newPage(),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(url);
      await page.waitForTimeout(700);
      assert(await page.locator("h1").isVisible());
      if (mode === "desktop") {
        assert(
          await page.evaluate(() =>
            document.documentElement.classList.contains("motion"),
          ),
        );
        await page.locator("#smooth").uncheck();
        const scroll = async (y) => {
          await page.evaluate((y) => window.scrollTo(0, y), y);
          await page.waitForTimeout(700);
        };
        await scroll(800);
        assert(
          Number(await page.locator("#sequence").getAttribute("data-frame")) >
            0,
        );
        assert((await page.locator("#nav").boundingBox()).y < 40);
        const geom = await page
          .locator(".horizontal")
          .evaluate((el) => ({
            top: el.getBoundingClientRect().top + scrollY,
            height: el.offsetHeight,
            view: innerHeight,
          }));
        await scroll(geom.top + (geom.height - geom.view) * 0.5);
        assert(
          await page
            .locator(".h-track")
            .evaluate(
              (el) =>
                new DOMMatrixReadOnly(getComputedStyle(el).transform).m41 <
                -100,
            ),
        );
        const second = await page
          .locator(".stack-card")
          .nth(1)
          .evaluate((el) => el.getBoundingClientRect().top + scrollY);
        await scroll(second - 120);
        assert(
          await page
            .locator(".stack-inner")
            .first()
            .evaluate(
              (el) =>
                new DOMMatrixReadOnly(getComputedStyle(el).transform).m11 <
                0.99,
            ),
        );
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.locator("#smooth").check();
        const before = await page.evaluate(() => scrollY);
        await page.mouse.wheel(0, 450);
        await page.waitForTimeout(1200);
        assert((await page.evaluate(() => scrollY)) > before + 100);
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.waitForTimeout(500);
        assert(
          !(await page.evaluate(() =>
            document.documentElement.classList.contains("motion"),
          )),
        );
        assert.equal(await page.locator("#scrub-text .char").count(), 0);
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await page.waitForTimeout(500);
        assert(
          await page.evaluate(() =>
            document.documentElement.classList.contains("motion"),
          ),
        );
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(500);
        assert(
          !(await page.evaluate(() =>
            document.documentElement.classList.contains("motion"),
          )),
        );
      } else {
        assert(
          !(await page.evaluate(() =>
            document.documentElement.classList.contains("motion"),
          )),
        );
        assert(await page.locator("#smooth").isDisabled());
        assert.equal(
          await page.locator("#sequence").getAttribute("data-frame"),
          "0",
        );
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        assert.equal(
          await page
            .locator(".stack-card")
            .first()
            .evaluate((el) => getComputedStyle(el).position),
          "static",
        );
      }
      assert.deepEqual(errors, []);
      outcomes.push({ mode, result: "passed", errors });
      await context.close();
    }
    const c = await browser.newContext({
        javaScriptEnabled: false,
        viewport: { width: 390, height: 844 },
      }),
      p = await c.newPage();
    await p.goto(url);
    assert(await p.locator("h1").isVisible());
    assert(await p.locator(".panel").last().isVisible());
    await c.close();
    outcomes.push({ mode: "no-javascript", result: "passed" });
  } finally {
    await browser.close();
  }
  await fs.writeFile(
    path.join(__dirname, "test-results.json"),
    JSON.stringify({ runAt: new Date().toISOString(), outcomes }, null, 2),
  );
  console.log(JSON.stringify(outcomes, null, 2));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
