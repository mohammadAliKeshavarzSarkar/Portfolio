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
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1000, height: 700 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    const doc = read("05-browser-renderer.md");
    await page.setContent(
      `<style>${blocks(doc, "css")}</style>${blocks(doc, "html")}<div style="height:3000px"></div>`,
    );
    await page.addScriptTag({
      content:
        blocks(read("05-animation-ownership.md"), "js") +
        "\n" +
        blocks(doc, "js"),
    });
    await page.evaluate(() => {
      window.renderer = mountGpuStudy(document.querySelector(".gpu-study"), {
        animate: true,
      });
    });
    await page.waitForFunction(() => renderer.counts.draws > 5);
    // Sample the actual uniform in the renderer-owned program used by the most recent draw.
    const sample = () =>
      page.evaluate(() => {
        const gl = document.querySelector("canvas").getContext("webgl");
        const p = gl.getParameter(gl.CURRENT_PROGRAM);
        return gl.getUniform(p, gl.getUniformLocation(p, "shade"));
      });
    const first = await sample();
    await page.waitForTimeout(120);
    assert.notEqual(await sample(), first);
    await page.evaluate(() => scrollTo(0, 1500));
    await page.waitForTimeout(120);
    let draws = await page.evaluate(() => renderer.counts.draws);
    await page.waitForTimeout(120);
    assert.equal(await page.evaluate(() => renderer.counts.draws), draws);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForFunction((n) => renderer.counts.draws > n, draws);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => document.querySelector("canvas").hidden);
    draws = await page.evaluate(() => renderer.counts.draws);
    await page.waitForTimeout(120);
    assert.equal(await page.evaluate(() => renderer.counts.draws), draws);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForFunction((n) => renderer.counts.draws > n + 2, draws);
    await page.evaluate(() => {
      window.loss = document
        .querySelector("canvas")
        .getContext("webgl")
        .getExtension("WEBGL_lose_context");
      loss.loseContext();
    });
    await page.waitForFunction(() => document.querySelector("canvas").hidden);
    draws = await page.evaluate(() => renderer.counts.draws);
    await page.waitForTimeout(120);
    assert.equal(await page.evaluate(() => renderer.counts.draws), draws);
    await page.evaluate(() => loss.restoreContext());
    await page.waitForFunction((n) => renderer.counts.draws > n + 2, draws);
    await page.evaluate(() => {
      renderer.destroy();
      renderer.destroy();
    });
    draws = await page.evaluate(() => renderer.counts.draws);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForTimeout(120);
    assert.equal(await page.evaluate(() => renderer.counts.draws), draws);
    assert.equal(await page.locator(".gpu-study h2").isVisible(), true);
    assert.equal(await page.locator("canvas").isVisible(), false);
    assert.deepEqual(errors, []);
    console.log(
      "Integrated GPU motion passed: changing shader uniform, offscreen/reduced-motion pause, context restoration and disposal.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
