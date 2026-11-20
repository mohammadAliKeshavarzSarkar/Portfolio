// Run original Markdown examples; no Animorio implementation or network assets.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const markdown = fs.readFileSync(
  path.join(__dirname, "03-text-progress-and-state.md"),
  "utf8",
);
const extract = (language) =>
  [
    ...markdown.matchAll(
      new RegExp("```" + language + "\\n([\\s\\S]*?)```", "g"),
    ),
  ].map((m) => m[1]);
const scripts = extract("js");
assert.equal(scripts.length, 2);
const sandbox = vm.createContext({});
vm.runInContext(scripts.join("\n"), sandbox);
const {
  textProgress,
  chapterIndex,
  phraseProgress,
  decayVelocity,
  repeatCopies,
} = sandbox;
const near = (a, b, tolerance = 1e-9) =>
  assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);
assert.equal(textProgress(500, 100, 800), 0.5);
assert.equal(textProgress(1, 0, 0), 0);
assert.equal(chapterIndex(1, 3), 2);
assert.equal(chapterIndex(-1, 3), 0);
assert.equal(chapterIndex(0.5, 3), 1);
assert.throws(() => chapterIndex(0, 0));
for (let i = 0; i < 4; i++) {
  assert.equal(phraseProgress(0, i, 4), 0);
  assert.equal(phraseProgress(1, i, 4), 1);
}
near(phraseProgress(0.4, 1, 4), 0.5);
assert.throws(() => phraseProgress(0, 4, 4));
for (const fps of [30, 60, 120]) {
  let velocity = 800;
  for (let i = 0; i < fps; i++)
    velocity = decayVelocity(velocity, 1 / fps, 0.25);
  near(velocity, 50);
}
assert.equal(repeatCopies(250, 900), 5);
assert.equal(repeatCopies(250, 1400), 7);
assert.throws(() => repeatCopies(0, 900));
assert.throws(() => decayVelocity(100, -1));
console.log("Text, chapter, decay and repeat-coverage math passed.");

async function browserChecks() {
  const { chromium } = require("playwright");
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
  });
  const scenarios = [];
  const fixture = `<meta name="viewport" content="width=device-width,initial-scale=1"><style>html{scroll-behavior:auto}body{margin:24px;padding-top:120px;padding-bottom:1000px}${extract("css").join("\n")}</style>${extract("html").join("\n")}`;
  try {
    for (const mobile of [false, true])
      for (const reduced of [false, true]) {
        const errors = [];
        const ctx = await browser.newContext({
          viewport: mobile
            ? { width: 390, height: 844 }
            : { width: 1280, height: 900 },
          isMobile: mobile,
          hasTouch: mobile,
          reducedMotion: reduced ? "reduce" : "no-preference",
        });
        const page = await ctx.newPage();
        page.on("pageerror", (e) => errors.push(String(e)));
        await page.setContent(fixture);
        const text = await page.locator(".phrase-stage").textContent();
        const transcript = await page
          .locator(".chapter-transcript")
          .textContent();
        await page.evaluate(() => {
          const request = requestAnimationFrame.bind(window),
            cancel = cancelAnimationFrame.bind(window),
            animate = Element.prototype.animate;
          window.pendingFrames = new Set();
          window.frameCalls = 0;
          window.animationCalls = 0;
          window.requestAnimationFrame = (callback) => {
            const id = request((time) => {
              pendingFrames.delete(id);
              frameCalls++;
              callback(time);
            });
            pendingFrames.add(id);
            return id;
          };
          window.cancelAnimationFrame = (id) => {
            pendingFrames.delete(id);
            cancel(id);
          };
          Element.prototype.animate = function (...args) {
            animationCalls++;
            return animate.apply(this, args);
          };
        });
        await page.addScriptTag({ content: scripts.join("\n") });
        await page.evaluate(() => {
          window.study = mountTextStudy(document.querySelector(".text-study"));
        });
        const settle = async () => {
          await page.waitForTimeout(80);
          await page.waitForFunction(() => pendingFrames.size === 0);
        };
        const go = async (progress) => {
          await page.evaluate((p) => {
            const run = document.querySelector(".chapter-run"),
              preview = document.querySelector(".chapter-preview");
            const start =
              run.getBoundingClientRect().top +
              scrollY -
              parseFloat(getComputedStyle(preview).top);
            const travel =
              run.getBoundingClientRect().height -
              preview.getBoundingClientRect().height;
            scrollTo(0, start + p * travel);
          }, progress);
          await settle();
        };
        await settle();
        assert.equal(
          await page.locator(".chapter-run").evaluate((el) => el.hidden),
          reduced,
        );
        if (!reduced) {
          await go(0);
          assert.equal(
            await page.locator(".text-study").getAttribute("data-active"),
            "0",
          );
          near(
            await page
              .locator("[data-phrase]")
              .first()
              .evaluate((el) =>
                parseFloat(el.style.getPropertyValue("--fill")),
              ),
            0,
            0.1,
          ); // Document scrolling rounds subpixel starts.
          await go(0.4);
          assert.equal(
            await page.locator('nav a[aria-current="step"]').textContent(),
            "Experiment",
          );
          const calls = await page.evaluate(() => animationCalls);
          assert.ok(calls >= 3);
          await go(0.48);
          assert.equal(
            await page.evaluate(() => animationCalls),
            calls,
            "Same chapter must not restart",
          );
          await go(0.9);
          await go(0.05); // Reverse twice before 320 ms transitions finish.
          assert.equal(
            await page.locator(".text-study").getAttribute("data-active"),
            "0",
          );
          await page.waitForTimeout(400);
          const opacity = await page
            .locator(".chapter-preview > span")
            .evaluateAll((elements) =>
              elements.map((el) => Number(getComputedStyle(el).opacity)),
            );
          assert.deepEqual(opacity, [1, 0, 0]);
          assert.equal(
            await page.evaluate(() => document.getAnimations().length),
            0,
          );
          await go(1);
          await page.waitForTimeout(400);
          assert.equal(
            await page.locator(".text-study").getAttribute("data-active"),
            "2",
          );
          const fills = await page
            .locator("[data-phrase]")
            .evaluateAll((elements) =>
              elements.map((el) =>
                parseFloat(el.style.getPropertyValue("--fill")),
              ),
            );
          assert.ok(fills.every((value) => value > 99.8));
          const stageRect = await page.locator(".phrase-stage").boundingBox();
          assert.ok(
            stageRect.y >= -1 && stageRect.y < 2,
            "Readable phrase stage stays at viewport top",
          );
          await go(0.4);
          await page.emulateMedia({ reducedMotion: "reduce" });
          await settle();
          assert.equal(
            await page.locator(".chapter-run").evaluate((el) => el.hidden),
            true,
          );
          assert.equal(
            await page.evaluate(() => document.getAnimations().length),
            0,
          );
          await page.emulateMedia({ reducedMotion: "no-preference" });
          await settle();
          assert.equal(
            await page.locator(".chapter-run").evaluate((el) => el.hidden),
            false,
          );
          await page.setViewportSize({
            width: mobile ? 390 : 1000,
            height: 320,
          });
          await settle();
          assert.equal(
            await page.locator(".chapter-run").evaluate((el) => el.hidden),
            true,
          );
          await page.setViewportSize({
            width: mobile ? 390 : 1000,
            height: 900,
          });
          await settle();
          assert.equal(
            await page.locator(".chapter-run").evaluate((el) => el.hidden),
            false,
          );
        } else {
          assert.equal(await page.evaluate(() => animationCalls), 0);
          assert.ok(
            (
              await page
                .locator("[data-phrase]")
                .evaluateAll((elements) =>
                  elements.map((el) => el.style.getPropertyValue("--fill")),
                )
            ).every((value) => value === "100%"),
          );
        }
        assert.equal(await page.locator(".phrase-stage").textContent(), text);
        assert.equal(
          await page.locator(".chapter-transcript").textContent(),
          transcript,
        );
        const selection = await page.locator(".phrase-stage").evaluate((el) => {
          const range = document.createRange();
          range.selectNodeContents(el);
          const selection = getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          return range.toString();
        });
        assert.equal(selection, text);
        assert.equal(
          await page.locator('[lang="fa"]').getAttribute("dir"),
          "rtl",
        );
        assert.equal(
          await page.locator('[lang="fa"] [data-phrase]').count(),
          1,
        );
        for (const id of [
          "chapter-question",
          "chapter-experiment",
          "chapter-result",
        ]) {
          await page.locator(`a[href="#${id}"]`).focus();
          await page.keyboard.press("Enter");
          await page.waitForFunction((id) => location.hash === "#" + id, id);
          assert.equal(await page.locator("#" + id).isVisible(), true);
        }
        await settle();
        await page.waitForTimeout(400);
        const idle = await page.evaluate(() => frameCalls);
        await page.waitForTimeout(100);
        assert.equal(await page.evaluate(() => frameCalls), idle);
        assert.equal(await page.locator("nav a[aria-current]").count(), 0);
        if (!reduced) {
          await go(0.05);
          await page.waitForTimeout(400);
          await go(0.5);
          assert.ok(
            (await page.evaluate(() => document.getAnimations().length)) > 0,
          );
        }
        // Dispose during a pending update, then remount repeatedly.
        await page.evaluate(() => {
          study.refresh();
          study.destroy();
          study.destroy();
          for (let i = 0; i < 3; i++) {
            const s = mountTextStudy(document.querySelector(".text-study"));
            s.destroy();
          }
        });
        await settle();
        assert.equal(await page.locator(".chapter-preview > span").count(), 0);
        assert.equal(
          await page.evaluate(() => document.getAnimations().length),
          0,
        );
        assert.equal(
          await page.locator(".text-study").getAttribute("data-active"),
          null,
        );
        assert.equal(
          await page.locator(".chapter-run").evaluate((el) => el.hidden),
          true,
        );
        const disposed = await page.evaluate(() => frameCalls);
        await page.evaluate(() => {
          dispatchEvent(new Event("resize"));
          scrollTo(0, 0);
        });
        await page.emulateMedia({
          reducedMotion: reduced ? "no-preference" : "reduce",
        });
        await settle();
        assert.equal(await page.evaluate(() => frameCalls), disposed);
        assert.equal(await page.locator(".phrase-stage").textContent(), text);
        assert.deepEqual(errors, []);
        scenarios.push({
          mobileEmulation: mobile,
          initialReducedMotion: reduced,
          status: "passed",
          nativeChapterLinks: true,
          preservedTextAndSelection: true,
          disposal: true,
        });
        console.log(
          `Text browser checks passed: mobile=${mobile}, reduced=${reduced}`,
        );
        await ctx.close();
      }
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.setContent(fixture);
    assert.equal(
      await page.locator(".chapter-run").evaluate((el) => el.hidden),
      true,
    );
    assert.equal(await page.locator(".chapter-transcript article").count(), 3);
    await page.locator('a[href="#chapter-result"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForURL("**#chapter-result");
    await ctx.close();
    const result = {
      recordedAt: new Date().toISOString(),
      browser: browser.version(),
      node: process.version,
      lessonSHA256: crypto.createHash("sha256").update(markdown).digest("hex"),
      numeric: "passed",
      scenarios,
      noJavaScript:
        "All transcript chapters available; native final-chapter link passed",
      normalMotionChecks: [
        "same-index no restart",
        "rapid threshold skips and reverse",
        "completion without further scroll",
        "final phrase emphasis",
        "sticky readable phrases",
        "runtime reduced-motion cancellation",
        "short-viewport fallback",
      ],
      limitations: [
        "Chromium only; emulated mobile",
        "No screen reader or Persian visual shaping audit",
        "No variable-font or rendering-cost benchmark",
        "Marquee math tested, not a full marquee component",
      ],
    };
    if (process.argv.includes("--record"))
      fs.writeFileSync(
        path.join(__dirname, "text-lesson-validation.json"),
        JSON.stringify(result, null, 2) + "\n",
      );
  } finally {
    await browser.close();
  }
}
if (process.argv.includes("--browser"))
  browserChecks().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
