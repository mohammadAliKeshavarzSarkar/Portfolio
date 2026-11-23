const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const playwright = require("playwright");
const read = (name) => fs.readFileSync(path.join(__dirname, name), "utf8");
const extract = (text, language) =>
  [...text.matchAll(new RegExp("```" + language + "\\n([\\s\\S]*?)```", "g"))]
    .map((m) => m[1])
    .join("\n");
const files = [
  "04-navigation-and-reveals.md",
  "04-browser-adapter.md",
  "02-sticky-and-scroll-progress.md",
];
const documents = files.map(read);

(async () => {
  const results = [];
  for (const engine of ["chromium", "firefox", "webkit"]) {
    let browser;
    try {
      browser = await playwright[engine].launch({
        timeout: 20000,
        headless: true,
        ...(engine === "chromium"
          ? { executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium" }
          : {}),
      });
    } catch (error) {
      results.push({
        engine,
        status: "unavailable",
        reason: String(error).slice(0, 2500),
      });
      console.log(`${engine}: unavailable`);
      continue;
    }
    try {
      for (const reduced of [false, true]) {
        const context = await browser.newContext({
          viewport: { width: 1280, height: 900 },
          reducedMotion: reduced ? "reduce" : "no-preference",
        });
        const page = await context.newPage(),
          errors = [];
        page.on("pageerror", (error) => errors.push(String(error)));
        const record = {
          engine,
          version: browser.version(),
          reducedMotion: reduced,
          status: "passed",
          errors,
        };
        try {
          await page.setContent(
            `<style>body{min-height:2000px}${extract(documents[1], "css")}</style>${extract(documents[1], "html")}`,
          );
          await page.addScriptTag({
            content:
              extract(documents[0], "js") + "\n" + extract(documents[1], "js"),
          });
          await page.evaluate(() => {
            window.menu = mountMenuLesson(
              makeScrollLock(document.documentElement),
            );
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
          for (let i = 0; i < 4; i++) {
            await page.keyboard.press("Tab");
            assert.equal(
              await page.evaluate(
                () =>
                  document.activeElement === document.body ||
                  document
                    .querySelector("#menu")
                    .contains(document.activeElement),
              ),
              true,
            );
          }
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
          await page.evaluate(async () => {
            await Promise.all([
              menu.request(true),
              menu.request(false),
              menu.request(true),
            ]);
          });
          await page.waitForFunction(() => menu.state === "open");
          await page.evaluate(() => menu.destroy());
          assert.equal(
            await page.locator("#menu").evaluate((el) => el.open),
            false,
          );
          assert.equal(
            await page.evaluate(() => document.documentElement.style.overflow),
            "",
          );
          record.modal =
            "keyboard, focus, Escape, interruption and disposal passed";

          await page.setContent(
            `<style>body{margin:24px;padding-top:100px;padding-bottom:1000px}${extract(documents[2], "css")}</style>${extract(documents[2], "html")}`,
          );
          await page.addScriptTag({ content: extract(documents[2], "js") });
          await page.evaluate(() => {
            window.gallery = mountScrollLesson(
              document.querySelector(".lesson-gallery"),
            );
          });
          await page.waitForTimeout(150);
          assert.equal(
            await page
              .locator(".lesson-gallery")
              .evaluate((el) => el.classList.contains("is-linked")),
            !reduced,
          );
          await page.locator(".gallery-window").focus();
          await page.keyboard.press("End");
          await page.waitForFunction(() => {
            const viewport = document.querySelector(".gallery-window"),
              last = document.querySelector(".gallery-track").lastElementChild;
            return (
              Math.abs(
                viewport.getBoundingClientRect().right -
                  last.getBoundingClientRect().right,
              ) < 2
            );
          });
          await page.keyboard.press("Home");
          await page.waitForFunction(() => {
            const viewport = document.querySelector(".gallery-window"),
              track = document.querySelector(".gallery-track");
            return (
              Math.abs(viewport.scrollLeft) < 2 &&
              Math.abs(parseFloat(track.style.translate) || 0) < 2
            );
          });
          await page.emulateMedia({ reducedMotion: "reduce" });
          await page.waitForFunction(
            () =>
              !document
                .querySelector(".lesson-gallery")
                .classList.contains("is-linked"),
          );
          assert.equal(
            await page
              .locator(".gallery-window")
              .evaluate((el) => getComputedStyle(el).overflowX),
            "auto",
          );
          await page.evaluate(() => gallery.destroy());
          assert.equal(
            await page.locator(".gallery-controls").evaluate((el) => el.hidden),
            true,
          );
          record.gallery =
            "endpoint, reverse, native overflow, preference and disposal passed";
          assert.deepEqual(errors, []);
        } catch (error) {
          record.status = "failed";
          record.failure = String(error);
          process.exitCode = 1;
        }
        results.push(record);
        console.log(`${engine}, reduced=${reduced}: ${record.status}`);
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }
  const output = {
    recordedAt: new Date().toISOString(),
    scope:
      "Desktop 1280x900 original modal and gallery fixtures; no GPU, bfcache, screen-reader or real-device validation",
    sources: files.map((file, i) => ({
      file,
      sha256: crypto.createHash("sha256").update(documents[i]).digest("hex"),
    })),
    results,
  };
  if (process.argv.includes("--record"))
    fs.writeFileSync(
      path.join(__dirname, "cross-browser-validation.json"),
      JSON.stringify(output, null, 2) + "\n",
    );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
