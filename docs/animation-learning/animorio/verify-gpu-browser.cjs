const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { chromium } = require("playwright");
const doc = fs.readFileSync(
  path.join(__dirname, "05-browser-renderer.md"),
  "utf8",
);
const blocks = (l) =>
  [...doc.matchAll(new RegExp("```" + l + "\\n([\\s\\S]*?)```", "g"))]
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
    await page.setContent(`<style>${blocks("css")}</style>${blocks("html")}`);
    await page.addScriptTag({ content: blocks("js") });
    await page.evaluate(() => {
      window.root = document.querySelector(".gpu-study");
      window.renderer = mountGpuStudy(root, { getContext: () => null });
    });
    assert.equal(await page.locator("canvas").isVisible(), false);
    assert.equal(await page.locator(".gpu-study h2").isVisible(), true);
    await page.evaluate(() => renderer.destroy());
    // Supply an actual context but force a failed shader compile query.
    await page.evaluate(() => {
      renderer = mountGpuStudy(root, {
        getContext: (canvas) => {
          const gl = canvas.getContext("webgl");
          const get = gl.getShaderParameter.bind(gl);
          gl.getShaderParameter = () => false;
          window.restore = () => (gl.getShaderParameter = get);
          return gl;
        },
      });
    });
    assert.equal(await page.locator("canvas").isVisible(), false);
    await page.evaluate(() => {
      renderer.destroy();
      restore();
      renderer = mountGpuStudy(root);
    });
    assert.equal(await page.locator("canvas").isVisible(), true);
    const pixel = await page.evaluate(() => {
      renderer.destroy();
      renderer = mountGpuStudy(root);
      const gl = document.querySelector("canvas").getContext("webgl");
      const p = new Uint8Array(4);
      gl.readPixels(120, 60, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p);
      return [...p];
    });
    assert.ok(pixel[3] === 255 && pixel[2] > 100);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => document.querySelector("canvas").hidden);
    const before = await page.evaluate(() => renderer.counts.builds);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForFunction(() => !document.querySelector("canvas").hidden);
    assert.equal(await page.evaluate(() => renderer.counts.builds), before + 1);
    await page.evaluate(() => {
      window.loss = document
        .querySelector("canvas")
        .getContext("webgl")
        .getExtension("WEBGL_lose_context");
      if (!loss) throw Error("Context-loss extension unavailable");
      loss.loseContext();
    });
    await page.waitForFunction(() => document.querySelector("canvas").hidden);
    await page.waitForTimeout(100);
    await page.evaluate(() => loss.restoreContext());
    await page.waitForFunction(() => !document.querySelector("canvas").hidden);
    await page.evaluate(() => {
      renderer.destroy();
      renderer.destroy();
    });
    const builds = await page.evaluate(() => renderer.counts.builds);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => renderer.counts.builds), builds);
    assert.equal(await page.locator("canvas").isVisible(), false);
    assert.deepEqual(errors, []);
    console.log(
      "GPU browser exercise passed: unavailable context, compile failure, rendered pixel, reduced motion, context restoration and disposal.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
