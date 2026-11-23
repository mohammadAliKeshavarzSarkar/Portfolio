const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { chromium } = require("playwright");
const read = (n) => fs.readFileSync(path.join(__dirname, n), "utf8");
const code = (n) =>
  [...read(n).matchAll(/```js\n([\s\S]*?)```/g)].map((m) => m[1]).join("\n");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
  });
  try {
    const page = await browser.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    const bootstrap = `${code("06-history-restoration.md")}\n${code("06-reload-and-recovery.md")}
 window.done=false;window.cleaned=[];window.expectedRestoration=history.scrollRestoration;
 const store=createPositionStore(sessionStorage);
 window.study=mountHistoryStudy({positionStore:store,prepare:async url=>{
   try {if(new URL(url).pathname==='/failed')throw Error('loader failed');}
   catch(error){throw Error('error page also failed');}
   return {commit(){document.querySelector('main').style.height='100px';},ready:new Promise(resolve=>setTimeout(()=>{document.querySelector('main').style.height='4000px';resolve();},80)),focus(){}};
 },onError:(error,url)=>showFinalRecovery({main:document.querySelector('main'),url:'/recovery',dispose:[()=>cleaned.push('gate'),()=>cleaned.push('menu'),()=>{study.destroy();cleaned.push('router');},()=>cleaned.push('renderer')]})});
 study.refresh().then(()=>done=true);`;
    await page.route("https://reload-study.test/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body:
          new URL(route.request().url()).pathname === "/recovery"
            ? "<h1>Native recovery</h1>"
            : `<main style="height:4000px"><h1>Readable baseline</h1></main><script>${bootstrap}</script>`,
      }),
    );
    await page.goto("https://reload-study.test/a");
    await page.waitForFunction(() => done);
    await page.evaluate(() => scrollTo(0, 700));
    await page.waitForTimeout(100);
    const key = await page.evaluate(() => history.state.animationStudyEntry);
    await page.reload();
    await page.waitForFunction(() => done && Math.abs(scrollY - 700) < 2);
    assert.equal(
      await page.evaluate(() => history.state.animationStudyEntry),
      key,
    );
    assert.equal(
      await page.evaluate(() => {
        const denied = {
          getItem() {
            throw Error("denied");
          },
          setItem() {
            throw Error("denied");
          },
        };
        const s = createPositionStore(denied);
        s.set("a", 40);
        return s.get("a");
      }),
      40,
    );
    assert.equal(
      await page.evaluate(() => {
        const s = createPositionStore({
          getItem: () => "{broken",
          setItem() {},
        });
        return s.get("bad") === undefined;
      }),
      true,
    );
    assert.equal(
      await page.evaluate(() => {
        const values = {};
        const st = {
          getItem: (k) => values[k],
          setItem: (k, v) => (values[k] = v),
        };
        const s = createPositionStore(st, "x", 2);
        s.set("a", 1);
        s.set("b", 2);
        s.set("c", 3);
        return createPositionStore(st, "x", 2).get("a") === undefined;
      }),
      true,
    );
    await page.evaluate(() => study.navigate("/failed"));
    assert.equal(
      await page.locator("h1").textContent(),
      "This page could not be prepared",
    );
    assert.equal(
      await page.locator("h1").evaluate((el) => document.activeElement === el),
      true,
    );
    assert.deepEqual(await page.evaluate(() => cleaned), [
      "gate",
      "menu",
      "router",
      "renderer",
    ]);
    assert.equal(
      await page.evaluate(() => history.scrollRestoration),
      await page.evaluate(() => expectedRestoration),
    );
    await page.locator("a").click();
    await page.waitForURL("**/recovery");
    assert.equal(await page.locator("h1").textContent(), "Native recovery");
    assert.deepEqual(errors, []);
    console.log(
      "Reload fixture passed: actual reload scroll/key restoration, storage fallback/eviction and final recovery navigation. Actual bfcache remains unverified.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
