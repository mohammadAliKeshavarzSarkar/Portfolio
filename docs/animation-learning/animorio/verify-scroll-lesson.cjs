// Execute original Markdown examples without serving a website or fetching assets.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const markdown = fs.readFileSync(
  path.join(__dirname, "02-sticky-and-scroll-progress.md"),
  "utf8",
);
const blocks = (language) =>
  [
    ...markdown.matchAll(
      new RegExp("```" + language + "\\n([\\s\\S]*?)```", "g"),
    ),
  ].map((m) => m[1]);
const scripts = blocks("js");
assert.equal(scripts.length, 2);
const context = vm.createContext({});
vm.runInContext(scripts.join("\n"), context);
const { scrollProgress, galleryTravel, coveredCard } = context;
assert.equal(scrollProgress(150, 100, 100), 0.5);
assert.equal(scrollProgress(-1, 100, 100), 0);
assert.equal(scrollProgress(999, 100, 100), 1);
assert.equal(scrollProgress(100, 100, 0), 0);
assert.equal(scrollProgress(NaN, 100, 100), 0);
assert.equal(galleryTravel(1800, 900, 1600).alignEnd, 900);
assert.equal(galleryTravel(1800, 900, 1600).centerLast, 1150);
assert.equal(galleryTravel(300, 900, 150).alignEnd, 0);
assert.throws(() => galleryTravel(100, 0, 50));
assert.equal(coveredCard(1000, 200, 800, 40).scale, 1);
assert.equal(coveredCard(1000, 960, 800, 40).scale, 0.94);
assert.equal(coveredCard(1000, 580, 800, 40).shade, 0.1);
console.log("Scroll geometry numeric checks passed.");

async function checkBrowser() {
  const { chromium } = require("playwright");
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
  });
  const scenarios = [];
  const near = (a, b, tolerance = 2) =>
    assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);
  const fixture = `<meta name="viewport" content="width=device-width,initial-scale=1"><style>html{scroll-behavior:auto}body{margin:24px;padding-top:100px;padding-bottom:1000px}${blocks("css").join("\n")}</style>${blocks("html").join("\n")}`;
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
        page.on("pageerror", (error) => errors.push(String(error)));
        await page.setContent(fixture);
        await page.evaluate(() => {
          const request = requestAnimationFrame.bind(window),
            cancel = cancelAnimationFrame.bind(window);
          window.framesPending = new Set();
          window.frameCount = 0;
          window.requestAnimationFrame = (callback) => {
            const id = request((time) => {
              framesPending.delete(id);
              frameCount++;
              callback(time);
            });
            framesPending.add(id);
            return id;
          };
          window.cancelAnimationFrame = (id) => {
            framesPending.delete(id);
            cancel(id);
          };
        });
        await page.addScriptTag({ content: scripts.join("\n") });
        await page.evaluate(() => {
          window.lesson = mountScrollLesson(
            document.querySelector(".lesson-gallery"),
          );
        });
        const settle = async () => {
          await page.waitForTimeout(100);
          await page.waitForFunction(() => framesPending.size === 0);
        };
        const geometry = () =>
          page.evaluate(() => {
            const root = document.querySelector(".lesson-gallery"),
              stage = root.querySelector(".gallery-stage"),
              viewport = root.querySelector(".gallery-window"),
              track = root.querySelector(".gallery-track");
            return {
              linked: root.classList.contains("is-linked"),
              start: root.getBoundingClientRect().top + scrollY - 16,
              stageTop: stage.getBoundingClientRect().top,
              travel: track.scrollWidth - viewport.clientWidth,
              x: parseFloat(track.style.translate) || 0,
              nativeX: viewport.scrollLeft,
              lastRight: track.lastElementChild.getBoundingClientRect().right,
              viewportRight: viewport.getBoundingClientRect().right,
              y: scrollY,
            };
          });
        await settle();
        assert.equal((await geometry()).linked, !mobile && !reduced);
        const cardPositions = await page.evaluate(() =>
          [...document.querySelectorAll(".lesson-card")].map(
            (el) => getComputedStyle(el).position,
          ),
        );
        assert.ok(
          cardPositions.every(
            (value) => value === (!mobile && !reduced ? "sticky" : "static"),
          ),
        );
        if (!mobile && !reduced) {
          const anchorY = await page
            .locator(".card-anchor")
            .nth(1)
            .evaluate((el) => el.getBoundingClientRect().top + scrollY);
          await page.evaluate((y) => scrollTo(0, y - 50), anchorY);
          await settle();
          near(
            await page
              .locator(".lesson-card")
              .first()
              .evaluate((el) => el.getBoundingClientRect().top),
            24,
          );
          await page.evaluate(() => scrollTo(0, 0));
          await settle();
          assert.ok(
            await page
              .locator(".lesson-card")
              .first()
              .evaluate((el) => el.getBoundingClientRect().top > 24),
          );
          let g = await geometry();
          for (const p of [0, 0.5, 1, 0.25, 0]) {
            await page.evaluate(({ y }) => scrollTo(0, y), {
              y: g.start + g.travel * p,
            });
            await settle();
            const actual = await geometry();
            near(actual.x, -g.travel * p);
            near(actual.stageTop, 16);
            if (p === 1) near(actual.lastRight, actual.viewportRight);
          }
          await page.setViewportSize({ width: 1000, height: 900 });
          await settle();
          g = await geometry();
          assert.ok(g.linked);
          assert.ok(g.travel > 0);
          await page.evaluate((y) => scrollTo(0, y), g.start + g.travel);
          await settle();
          near((await geometry()).lastRight, (await geometry()).viewportRight);
          await page.emulateMedia({ reducedMotion: "reduce" });
          await settle();
          assert.equal((await geometry()).linked, false);
          await page.emulateMedia({ reducedMotion: "no-preference" });
          await settle();
          assert.equal((await geometry()).linked, true);
          await page
            .locator(".lesson-gallery")
            .evaluate((el) => (el.hidden = true));
          await settle();
          assert.equal((await geometry()).linked, false);
          await page
            .locator(".lesson-gallery")
            .evaluate((el) => (el.hidden = false));
          await settle();
          assert.equal((await geometry()).linked, true);
          // Too-tall content and a track that fits must disable linked scrolling.
          await page
            .locator(".gallery-track figure")
            .first()
            .evaluate((el) => (el.style.minHeight = "1200px"));
          await settle();
          assert.equal((await geometry()).linked, false);
          await page
            .locator(".gallery-track figure")
            .first()
            .evaluate((el) => el.style.removeProperty("min-height"));
          await settle();
          assert.equal((await geometry()).linked, true);
          await page
            .locator(".gallery-track figure")
            .evaluateAll((items) =>
              items.forEach((el) => (el.style.flexBasis = "40px")),
            );
          await settle();
          assert.equal((await geometry()).linked, false);
          near((await geometry()).travel, 0);
          await page
            .locator(".gallery-track figure")
            .evaluateAll((items) =>
              items.forEach((el) => el.style.removeProperty("flex-basis")),
            );
          await settle();
          assert.equal((await geometry()).linked, true);
          // A changed upstream block shifts cached document geometry via body resize.
          const oldStart = (await geometry()).start;
          await page.evaluate(() => {
            const spacer = document.createElement("div");
            spacer.style.height = "120px";
            document.querySelector(".lesson-gallery").before(spacer);
          });
          await settle();
          near((await geometry()).start, oldStart + 120);
        }
        const viewport = page.locator(".gallery-window");
        await viewport.focus();
        await page.keyboard.press("End");
        await settle();
        let g = await geometry();
        near(g.lastRight, g.viewportRight);
        await page.keyboard.press("Home");
        await settle();
        g = await geometry();
        near(g.linked ? -g.x : g.nativeX, 0);
        await page.keyboard.press("ArrowRight");
        await settle();
        g = await geometry();
        assert.ok((g.linked ? -g.x : g.nativeX) > 0);
        await page.keyboard.press("ArrowLeft");
        await settle();
        g = await geometry();
        near(g.linked ? -g.x : g.nativeX, 0);
        await page.locator('[data-step="1"]').click();
        await settle();
        g = await geometry();
        assert.ok((g.linked ? -g.x : g.nativeX) > 0);
        assert.equal(
          await page
            .locator('[data-step="1"]')
            .evaluate((el) => document.activeElement === el),
          true,
        );
        const idleCount = await page.evaluate(() => frameCount);
        await page.waitForTimeout(150);
        assert.equal(
          await page.evaluate(() => frameCount),
          idleCount,
          "No idle animation loop",
        );
        await page.evaluate(() => {
          lesson.refresh();
          lesson.destroy();
          lesson.destroy();
          const root = document.querySelector(".lesson-gallery");
          for (let i = 0; i < 3; i++) {
            const instance = mountScrollLesson(root);
            instance.refresh();
            instance.destroy();
          }
        });
        await settle();
        assert.equal((await geometry()).linked, false);
        assert.equal(
          await page.locator(".gallery-controls").evaluate((el) => el.hidden),
          true,
        );
        const disposedCount = await page.evaluate(() => frameCount);
        await page.evaluate(() => {
          dispatchEvent(new Event("resize"));
          scrollTo(0, 0);
        });
        await page.emulateMedia({
          reducedMotion: reduced ? "no-preference" : "reduce",
        });
        await settle();
        assert.equal(
          await page.evaluate(() => frameCount),
          disposedCount,
          "Disposed listeners must not schedule frames",
        );
        assert.deepEqual(errors, []);
        scenarios.push({
          mobileEmulation: mobile,
          initialReducedMotion: reduced,
          status: "passed",
          keyboardEndpoints: true,
          reverseNavigation: true,
          idleAndDisposal: true,
        });
        console.log(
          `Scroll browser checks passed: mobile=${mobile}, reduced=${reduced}`,
        );
        await ctx.close();
      }
    const baseline = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 1000, height: 800 },
    });
    const page = await baseline.newPage();
    await page.setContent(fixture);
    const viewport = page.locator(".gallery-window");
    await viewport.focus();
    const initialX = await viewport.evaluate((el) => el.scrollLeft);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(300);
    assert.ok((await viewport.evaluate((el) => el.scrollLeft)) > initialX);
    assert.equal(await page.locator(".gallery-track figure").count(), 4);
    assert.equal(
      await page.locator(".gallery-controls").evaluate((el) => el.hidden),
      true,
    );
    await baseline.close();
    const result = {
      recordedAt: new Date().toISOString(),
      browser: browser.version(),
      node: process.version,
      lessonSHA256: crypto.createHash("sha256").update(markdown).digest("hex"),
      numeric: "passed",
      scenarios,
      noJavaScript: "Native keyboard horizontal scrolling passed",
      desktopNormalAdditionalChecks: [
        "CSS card sticky and reverse release",
        "gallery start/middle/end/reverse positions",
        "final edge alignment",
        "resize remeasurement",
        "runtime reduced motion",
        "hidden/revealed viewport",
        "tall-content fallback",
        "zero-travel fallback",
        "upstream layout shift",
      ],
      limitations: [
        "Chromium only",
        "Mobile emulation, no real touch hardware",
        "No screen reader or performance audit",
        "Card decoration helper tested numerically; no decorated card controller",
      ],
    };
    if (process.argv.includes("--record"))
      fs.writeFileSync(
        path.join(__dirname, "scroll-lesson-validation.json"),
        JSON.stringify(result, null, 2) + "\n",
      );
    console.log("No-JavaScript baseline passed.");
  } finally {
    await browser.close();
  }
}
if (process.argv.includes("--browser"))
  checkBrowser().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
