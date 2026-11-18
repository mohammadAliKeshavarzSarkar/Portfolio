// Execute original documentation snippets. No Animorio code or dependencies fetched.
// Numeric checks: node verify-pointer-lesson.cjs
// Browser checks: node verify-pointer-lesson.cjs --browser [--record]
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const markdown = fs.readFileSync(
  path.join(__dirname, "01-pointer-and-springs.md"),
  "utf8",
);
const extract = (language) =>
  [
    ...markdown.matchAll(
      new RegExp("```" + language + "\\n([\\s\\S]*?)```", "g"),
    ),
  ].map((match) => match[1]);
const scripts = extract("js");
assert.equal(scripts.length, 3);
const context = vm.createContext({});
vm.runInContext(scripts.join("\n"), context);
const { pointerTarget, springStep } = context;
const near = (actual, expected, tolerance = 1e-9) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${actual} differs from ${expected}`,
  );
const rect = { left: 20, top: 30, width: 200, height: 100 };
near(pointerTarget(120, 80, rect).x, 0);
near(pointerTarget(120, 80, rect).y, 0);
near(pointerTarget(220, 130, rect).x, 10);
near(pointerTarget(-100, 130, rect).x, -10);
near(pointerTarget(100, 200, rect).y, 10);
near(pointerTarget(100, 200, { ...rect, width: 0 }).y, 0);
near(pointerTarget(NaN, 200, rect).y, 0);
const initial = { x: -4, v: 13 };
for (const fps of [30, 60, 120]) {
  let state = initial;
  for (let frame = 0; frame < fps; frame++)
    state = springStep(state, 10, 1 / fps);
  const exact = springStep(initial, 10, 1);
  near(state.x, exact.x);
  near(state.v, exact.v);
}
let state = { x: 0, v: 0 },
  maximum = 0;
for (let frame = 0; frame < 240; frame++) {
  state = springStep(state, 10, 1 / 120);
  maximum = Math.max(maximum, state.x);
}
assert.ok(maximum > 10.2, "Underdamped response should overshoot");
near(state.x, 10, 1e-8);
near(state.v, 0, 1e-8);
const interrupted = springStep({ x: 0, v: 0 }, 10, 0.08);
const sameInstant = springStep(interrupted, -10, 0);
near(sameInstant.x, interrupted.x);
near(sameInstant.v, interrupted.v);
assert.ok(interrupted.v > 0);
assert.ok(
  springStep(interrupted, -10, 0.00001).v > 0,
  "A changed target must not erase velocity instantly",
);
for (const args of [
  [initial, 0, -1],
  [initial, NaN, 1],
  [initial, 0, 1, 22, 1],
  [initial, 0, 1, 0],
]) {
  assert.throws(() => springStep(...args));
}
console.log("Pointer and spring numeric checks passed.");

async function browserChecks() {
  const { chromium } = require("playwright");
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
  });
  const scenarios = [];
  try {
    for (const touch of [false, true]) {
      for (const reduced of [false, true]) {
        const errors = [];
        const browserContext = await browser.newContext({
          viewport: touch
            ? { width: 390, height: 844 }
            : { width: 1280, height: 800 },
          isMobile: touch,
          hasTouch: touch,
          reducedMotion: reduced ? "reduce" : "no-preference",
        });
        const page = await browserContext.newPage();
        page.on("pageerror", (error) => errors.push(String(error)));
        await page.setContent(
          `<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:24px;padding-top:300px;min-height:2600px}#project-notes{margin-top:1000px}${extract("css").join("\n")}</style>${extract("html").join("\n")}`,
        );
        await page.evaluate(() => {
          const nativeRequest = requestAnimationFrame.bind(window);
          const nativeCancel = cancelAnimationFrame.bind(window);
          window.activeFrames = new Set();
          window.frameCalls = 0;
          window.requestAnimationFrame = (callback) => {
            const handle = nativeRequest((now) => {
              activeFrames.delete(handle);
              frameCalls++;
              callback(now);
            });
            activeFrames.add(handle);
            return handle;
          };
          window.cancelAnimationFrame = (handle) => {
            activeFrames.delete(handle);
            nativeCancel(handle);
          };
        });
        await page.addScriptTag({ content: scripts.join("\n") });
        await page.evaluate(() => {
          window.study = mountPointerStudy(
            document.querySelector(".study-link"),
          );
        });
        await page.waitForTimeout(100); // Allow the initial ResizeObserver callback.
        const link = page.locator(".study-link");
        const originalBounds = await link.boundingBox();
        const targetX = originalBounds.x + originalBounds.width * 0.85;
        const targetY = originalBounds.y + originalBounds.height * 0.65;
        const translateX = () =>
          page
            .locator(".study-surface")
            .evaluate((el) => parseFloat(el.style.translate) || 0);
        const settled = () =>
          page.waitForFunction(() => activeFrames.size === 0);
        await page.mouse.move(targetX, targetY);
        if (!touch && !reduced) {
          await page.waitForFunction(
            () =>
              parseFloat(
                document.querySelector(".study-surface").style.translate,
              ) > 1,
          );
          await settled();
          near(await translateX(), 7, 0.1);
          const after = await link.boundingBox();
          near(after.x, originalBounds.x);
          near(after.y, originalBounds.y);
          near(after.width, originalBounds.width);
          near(after.height, originalBounds.height);
          const calls = await page.evaluate(() => frameCalls);
          await page.waitForTimeout(100);
          assert.equal(
            await page.evaluate(() => frameCalls),
            calls,
            "Settled hover must stop RAF",
          );
          await page.mouse.move(1, 1);
          await settled();
          near(await translateX(), 0);
          await page.mouse.move(targetX, targetY);
          await page.waitForFunction(() => activeFrames.size > 0);
          await page.emulateMedia({ reducedMotion: "reduce" });
          await settled();
          near(await translateX(), 0);
          await page.emulateMedia({ reducedMotion: "no-preference" });
          await page.waitForTimeout(50);
          await page.mouse.move(targetX - 2, targetY);
          await page.waitForFunction(() => activeFrames.size > 0);
          await page.evaluate(() => window.scrollBy(0, 10));
          await settled();
          near(await translateX(), 0);
          await page.evaluate(() => scrollTo(0, 0));
          await page.waitForTimeout(50);
          for (const type of [
            "pointercancel",
            "lostpointercapture",
            "pointerdown",
          ]) {
            await link.dispatchEvent("pointermove", {
              pointerType: "mouse",
              clientX: targetX,
              clientY: targetY,
              buttons: 0,
            });
            await page.waitForFunction(() => activeFrames.size > 0);
            await link.dispatchEvent(type, { pointerType: "mouse" });
            await settled();
            near(await translateX(), 0);
          }
        } else {
          await page.waitForTimeout(200);
          near(await translateX(), 0);
          assert.equal(await page.evaluate(() => activeFrames.size), 0);
        }
        // Genuine browser keyboard activation, not a synthesized click handler.
        await page.keyboard.press("Tab");
        await link.focus();
        await settled();
        near(await translateX(), 0);
        assert.equal(
          await link.evaluate((el) => el.matches(":focus-visible")),
          true,
        );
        await page.keyboard.press("Enter");
        await page.waitForFunction(() => location.hash === "#project-notes");
        await page.evaluate(() => {
          document.activeElement.blur();
          scrollTo(0, 0);
        });
        await page.waitForTimeout(100);
        let touchScroll = null;
        if (touch) {
          const bounds = await link.boundingBox();
          const client = await browserContext.newCDPSession(page);
          const x = bounds.x + bounds.width / 2,
            y = bounds.y + bounds.height / 2;
          await client.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [{ x, y }],
          });
          for (let step = 1; step <= 5; step++) {
            await client.send("Input.dispatchTouchEvent", {
              type: "touchMove",
              touchPoints: [{ x, y: y - step * 35 }],
            });
            await page.waitForTimeout(25);
          }
          await client.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
          });
          await page.waitForFunction(() => scrollY > 30);
          touchScroll = await page.evaluate(() => scrollY);
          near(await translateX(), 0);
          await client.detach();
        }
        await page.evaluate(() => {
          study.destroy();
          study.destroy();
          const hit = document.querySelector(".study-link");
          const surface = hit.querySelector(".study-surface");
          surface.style.setProperty("translate", "2px 3px", "important");
          for (let i = 0; i < 5; i++) {
            const instance = mountPointerStudy(hit);
            const rect = hit.getBoundingClientRect();
            hit.dispatchEvent(
              new PointerEvent("pointermove", {
                pointerType: "mouse",
                clientX: rect.right - 1,
                clientY: rect.top + 1,
              }),
            );
            instance.destroy();
          }
        });
        await page.waitForTimeout(100);
        assert.equal(await page.evaluate(() => activeFrames.size), 0);
        assert.equal(
          await page
            .locator(".study-surface")
            .evaluate((el) => el.style.translate),
          "2px 3px",
        );
        assert.equal(
          await page
            .locator(".study-surface")
            .evaluate((el) => el.style.getPropertyPriority("translate")),
          "important",
        );
        const calls = await page.evaluate(() => frameCalls);
        await link.dispatchEvent("pointermove", {
          pointerType: "mouse",
          clientX: targetX,
          clientY: targetY,
        });
        await page.evaluate(() => dispatchEvent(new Event("resize")));
        await page.emulateMedia({
          reducedMotion: reduced ? "no-preference" : "reduce",
        });
        await page.waitForTimeout(100);
        assert.equal(
          await page.evaluate(() => frameCalls),
          calls,
          "Destroyed controllers must not wake",
        );
        assert.equal(
          await page
            .locator(".study-surface")
            .evaluate((el) => el.style.translate),
          "2px 3px",
        );
        assert.deepEqual(errors, []);
        scenarios.push({
          touchEmulation: touch,
          initialReducedMotion: reduced,
          status: "passed",
          keyboardActivation: true,
          cleanup: true,
          touchScrollY: touchScroll,
        });
        console.log(
          `Browser checks passed: touch=${touch}, reduced=${reduced}`,
        );
        await browserContext.close();
      }
    }
    const result = {
      recordedAt: new Date().toISOString(),
      browser: browser.version(),
      node: process.version,
      lessonSHA256: crypto.createHash("sha256").update(markdown).digest("hex"),
      scriptSHA256: crypto
        .createHash("sha256")
        .update(scripts.join("\n"))
        .digest("hex"),
      scope:
        "Original documentation snippets in an in-memory fixture; no live Animorio verification or network resources.",
      numeric: "passed",
      scenarios,
      desktopNormalChecks: [
        "bounded displacement",
        "stationary hit bounds",
        "settled RAF shutdown",
        "spring return",
        "runtime motion preference",
        "scroll reset",
        "pointer cancellation",
        "lost capture",
        "pointer down reset",
      ],
      limitations: [
        "Chromium only",
        "Emulated touch, not physical hardware",
        "No screen reader audit",
        "No transformed-ancestor support",
        "SVG scalar mapping explained, not browser-rendered",
      ],
    };
    if (process.argv.includes("--record"))
      fs.writeFileSync(
        path.join(__dirname, "pointer-lesson-validation.json"),
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
