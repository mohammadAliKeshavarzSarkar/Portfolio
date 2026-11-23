const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http"),
  crypto = require("node:crypto");
const { chromium } = require("playwright");
const read = (name) => fs.readFileSync(path.join(__dirname, name), "utf8");
const extract = (text, language = "js") =>
  [...text.matchAll(new RegExp("```" + language + "\\n([\\s\\S]*?)```", "g"))]
    .map((match) => match[1])
    .join("\n");
const lesson = read("06-composed-bfcache.md");
const source = [
  "04-navigation-and-reveals.md",
  "04-browser-adapter.md",
  "05-animation-ownership.md",
  "05-browser-renderer.md",
  "06-bfcache-lifecycle.md",
  "06-composed-bfcache.md",
]
  .map((name) => extract(read(name)))
  .join("\n");
const menuDoc = read("04-browser-adapter.md");
const gpuDoc = read("05-browser-renderer.md");

(async () => {
  const bootstrap = `${source}
window.identity=Math.random();window.mounts=1;window.shows=[];window.hides=[];
window.renderer=mountGpuStudy(document.querySelector('.gpu-study'),{animate:true});
window.menu=mountMenuLesson(makeScrollLock(document.documentElement));
window.shell=bindCachedShell({renderer,menu});
addEventListener('pagehide',event=>hides.push(event.persisted));
addEventListener('pageshow',event=>shows.push(event.persisted));`;
  const pageA = `<style>body{min-height:1500px}${extract(menuDoc, "css")}${extract(gpuDoc, "css")}</style>
${extract(menuDoc, "html")}<main>${extract(gpuDoc, "html")}<a id="leave" href="/b">Leave document</a></main>
<script>${bootstrap}</script>`;
  const server = http.createServer((request, response) => {
    response.setHeader("Content-Type", "text/html");
    response.end(request.url === "/a" ? pageA : "<h1>Other document</h1>");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      headless: true,
      args: ["--enable-unsafe-swiftshader"],
      ignoreDefaultArgs: ["--disable-back-forward-cache"],
    });
    const page = await browser.newPage(),
      errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.goto(`http://127.0.0.1:${server.address().port}/a`);
    await page.waitForFunction(() => renderer.counts.draws > 4);
    const identity = await page.evaluate(() => identity);

    await page.evaluate(() => shell.openMenu());
    await page.waitForFunction(() => menu.state === "open");
    let draws = await page.evaluate(() => renderer.counts.draws);
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => renderer.counts.draws), draws);

    // Rebuilding context must retain the modal pause reason.
    await page.evaluate(() => {
      window.loss = document
        .querySelector("canvas")
        .getContext("webgl")
        .getExtension("WEBGL_lose_context");
      loss.loseContext();
    });
    await page.waitForFunction(() => document.querySelector("canvas").hidden);
    await page.evaluate(() => loss.restoreContext());
    await page.waitForFunction(() => !document.querySelector("canvas").hidden);
    draws = await page.evaluate(() => renderer.counts.draws);
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => renderer.counts.draws), draws);

    await page.goto(`http://127.0.0.1:${server.address().port}/b`);
    await page.goBack({ waitUntil: "commit" });
    await page.waitForFunction(() => shows.at(-1) === true);
    assert.equal(await page.evaluate(() => identity), identity);
    assert.equal(await page.evaluate(() => mounts), 1);
    assert.equal(
      await page.locator("#menu").evaluate((element) => element.open),
      true,
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.style.overflow),
      "hidden",
    );
    draws = await page.evaluate(() => renderer.counts.draws);
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => renderer.counts.draws), draws);
    await page.evaluate(() => shell.closeMenu());
    await page.waitForFunction(() => menu.state === "closed");
    await page.waitForFunction((value) => renderer.counts.draws > value, draws);
    assert.equal(
      await page.evaluate(() => document.documentElement.style.overflow),
      "",
    );

    // A second traversal with the menu closed resumes without a remount.
    draws = await page.evaluate(() => renderer.counts.draws);
    await page.click("#leave");
    await page.goBack({ waitUntil: "commit" });
    await page.waitForFunction(() => shows.filter(Boolean).length === 2);
    await page.waitForFunction((value) => renderer.counts.draws > value, draws);
    assert.equal(await page.evaluate(() => identity), identity);
    assert.equal(await page.evaluate(() => mounts), 1);
    assert.ok((await page.evaluate(() => hides)).every(Boolean));

    await page.evaluate(() => shell.destroy());
    const final = await page.evaluate(() => renderer.counts.draws);
    await page.click("#leave");
    await page.goBack({ waitUntil: "commit" });
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => identity), identity);
    assert.equal(await page.evaluate(() => renderer.counts.draws), final);
    assert.deepEqual(errors, []);

    const result = {
      recordedAt: new Date().toISOString(),
      browser: browser.version(),
      renderer: "software WebGL via --enable-unsafe-swiftshader",
      launchChange:
        "Removed --disable-back-forward-cache from Playwright defaults",
      lessonSHA256: crypto.createHash("sha256").update(lesson).digest("hex"),
      status: "passed",
      observed: await page.evaluate(() => ({ shows, hides, mounts })),
      scope:
        "Persisted Chromium return for composed native dialog, scroll lock, moving WebGL renderer and independent modal/page pause handles",
    };
    if (process.argv.includes("--record"))
      fs.writeFileSync(
        path.join(__dirname, "composed-bfcache-validation.json"),
        JSON.stringify(result, null, 2) + "\n",
      );
    console.log(
      "Composed bfcache passed: modal and page pauses, context rebuild, persisted return, resume and disposal.",
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
