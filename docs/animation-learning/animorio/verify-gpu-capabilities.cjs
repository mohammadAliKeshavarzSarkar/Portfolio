const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
const playwright = require("playwright");
const doc = fs.readFileSync(
  path.join(__dirname, "05-browser-renderer.md"),
  "utf8",
);
const extract = (language) =>
  [...doc.matchAll(new RegExp("```" + language + "\\n([\\s\\S]*?)```", "g"))]
    .map((m) => m[1])
    .join("\n");

(async () => {
  const results = [];
  for (const engine of ["chromium", "firefox"]) {
    let browser;
    const record = {
      engine,
      fallback: "not-run",
      rendering: "not-run",
      restoration: "not-run",
    };
    try {
      browser = await playwright[engine].launch({
        timeout: 20000,
        headless: true,
        ...(engine === "chromium"
          ? {
              executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
              args: ["--enable-unsafe-swiftshader"],
            }
          : {}),
      });
      record.version = browser.version();
      const context = await browser.newContext({
        reducedMotion: "no-preference",
      });
      const page = await context.newPage(),
        errors = [];
      page.on("pageerror", (error) => errors.push(String(error)));
      await page.setContent(
        `<style>${extract("css")}</style>${extract("html")}`,
      );
      await page.addScriptTag({ content: extract("js") });
      await page.evaluate(() => {
        window.root = document.querySelector(".gpu-study");
        window.renderer = mountGpuStudy(root, { getContext: () => null });
      });
      assert.equal(await page.locator("canvas").isVisible(), false);
      assert.equal(await page.locator(".gpu-study h2").isVisible(), true);
      await page.locator(".gpu-study a").focus();
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => location.hash === "#notes");
      await page.evaluate(() => renderer.destroy());
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.evaluate(() => {
        renderer = mountGpuStudy(root);
      });
      assert.equal(await page.evaluate(() => renderer.counts.builds), 0);
      assert.equal(await page.locator("canvas").isVisible(), false);
      await page.evaluate(() => renderer.destroy());
      record.fallback =
        "passed: unavailable context, readable text, native link, initial reduced motion";

      await page.emulateMedia({ reducedMotion: "no-preference" });
      const probe = await page.evaluate(() => {
        const canvas = document.querySelector("canvas"),
          gl = canvas.getContext("webgl");
        if (!gl) return { available: false };
        return {
          available: true,
          version: gl.getParameter(gl.VERSION),
          renderer: gl.getParameter(gl.RENDERER),
          maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
          contextLossExtension: Boolean(gl.getExtension("WEBGL_lose_context")),
        };
      });
      record.capabilities = probe;
      if (!probe.available) {
        await page.evaluate(() => {
          renderer = mountGpuStudy(root);
        });
        assert.equal(await page.locator("canvas").isVisible(), false);
        assert.equal(await page.locator(".gpu-study h2").isVisible(), true);
        record.rendering =
          "unavailable: actual WebGL context creation returned null; readable fallback passed";
        record.restoration = "not-run: no WebGL context";
      } else {
        const pixel = await page.evaluate(() => {
          renderer = mountGpuStudy(root);
          const gl = root.querySelector("canvas").getContext("webgl");
          const pixel = new Uint8Array(4);
          gl.readPixels(120, 60, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
          return [...pixel];
        });
        assert.equal(await page.locator("canvas").isVisible(), true);
        assert.ok(pixel[3] === 255 && pixel[2] > 100);
        record.rendering = "passed: shader initialization and actual pixel";
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.waitForFunction(
          () => document.querySelector("canvas").hidden,
        );
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await page.waitForFunction(
          () => !document.querySelector("canvas").hidden,
        );
        record.liveReducedMotion = "passed";
        if (probe.contextLossExtension) {
          await page.evaluate(() => {
            window.loss = root
              .querySelector("canvas")
              .getContext("webgl")
              .getExtension("WEBGL_lose_context");
            loss.loseContext();
          });
          await page.waitForFunction(
            () => document.querySelector("canvas").hidden,
          );
          await page.waitForTimeout(120);
          await page.evaluate(() => loss.restoreContext());
          await page.waitForFunction(
            () => !document.querySelector("canvas").hidden,
          );
          record.restoration = "passed: forced loss and resource rebuild";
        } else record.restoration = "not-run: context-loss extension absent";
      }
      await page.evaluate(() => {
        renderer.destroy();
        renderer.destroy();
      });
      const before = await page.evaluate(() => renderer.counts.builds);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => renderer.counts.builds), before);
      assert.equal(await page.locator("canvas").isVisible(), false);
      assert.deepEqual(errors, []);
      record.disposal = "passed";
      record.status = "completed";
    } catch (error) {
      record.status = "failed";
      record.error = String(error);
      process.exitCode = 1;
    } finally {
      if (browser) await browser.close();
    }
    results.push(record);
    console.log(
      `${engine}: ${record.status}; fallback=${record.fallback}; rendering=${record.rendering}`,
    );
  }
  const result = {
    recordedAt: new Date().toISOString(),
    source: "05-browser-renderer.md",
    sourceSHA256: crypto.createHash("sha256").update(doc).digest("hex"),
    scope:
      "Headless static WebGL1 and readable fallback; Chromium software WebGL enabled; Firefox default graphics settings; no mobile, WebGL2 float targets, moving renderer or performance claim",
    results,
  };
  if (process.argv.includes("--record"))
    fs.writeFileSync(
      path.join(__dirname, "gpu-cross-browser-validation.json"),
      JSON.stringify(result, null, 2) + "\n",
    );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
