// Read-only follow-up: interaction assertions, not a visual-quality score.
const { chromium } = require("playwright");
const fs = require("node:fs/promises");
const path = require("node:path");
const urls = {
  raha: "https://raha-salimi.vercel.app/",
  glinto: "https://glinto.co.kr/en",
  tom: "https://www.tomdekoning.work/",
  awmedia: "https://awmedia.marketing/",
};
const site = process.argv[2];
if (!urls[site]) throw Error("Choose raha, glinto, tom, awmedia");
const mobile = site === "raha" || process.argv.includes("--mobile");
const reduced = process.argv.includes("--reduced");
const report = {
  site,
  url: urls[site],
  started: new Date().toISOString(),
  mobile,
  reduced,
  transport: "TLS-verified API route.fetch; not native browser network timing",
  checks: [],
  states: [],
  pageErrors: [],
  requestFailures: [],
};
const check = (name, pass, detail) =>
  report.checks.push({ name, pass: !!pass, detail });
(async () => {
  const proxyURL = process.env.HTTPS_PROXY || process.env.https_proxy;
  const browser = await chromium.launch({
    executablePath: process.env.STUDY_CHROMIUM || "/usr/bin/chromium",
    headless: true,
    proxy: proxyURL
      ? { server: new URL(proxyURL).origin, bypass: process.env.NO_PROXY || "" }
      : undefined,
  });
  try {
    const context = await browser.newContext({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 },
      isMobile: mobile,
      hasTouch: mobile,
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    await context.route("**/*", async (route) => {
      try {
        await route.fulfill({
          response: await route.fetch({ timeout: 30000 }),
        });
      } catch (e) {
        report.requestFailures.push({
          url: route.request().url(),
          error: e.message.slice(0, 180),
        });
        await route.abort().catch(() => {});
      }
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", (e) => report.pageErrors.push(e.message));
    const settle = (ms) => page.waitForTimeout(ms || 1200);
    async function state(label) {
      const value = await page.evaluate(() => {
        const get = (selector) =>
          [...document.querySelectorAll(selector)].map((el) => {
            const s = getComputedStyle(el),
              r = el.getBoundingClientRect();
            return {
              tag: el.tagName,
              class: el.className,
              text: el.textContent.trim().slice(0, 90),
              expanded: el.getAttribute("aria-expanded"),
              inert: el.inert,
              hidden: el.getAttribute("aria-hidden"),
              open: el.open,
              transform: s.transform,
              display: s.display,
              opacity: s.opacity,
              height: r.height,
              width: r.width,
              x: r.x,
              y: r.y,
              data: { ...el.dataset },
            };
          });
        return {
          url: location.href,
          y: scrollY,
          html: document.documentElement.className,
          overflow: getComputedStyle(document.documentElement).overflow,
          theme: document.documentElement.dataset.theme,
          intro: document.documentElement.dataset.intro || null,
          introSeen: sessionStorage.getItem("intro-seen"),
          active: document.activeElement?.outerHTML.slice(0, 300),
          menu: get(
            "button[aria-expanded],.nav-button.is-menu,.navbar-link-wrapper",
          ),
          skills: get(".mobile-skills-belt"),
          header: get(".site-header-wrap,#nav"),
          slides: get("[data-slide],.hero-slide"),
          track: get(".hs-track"),
          gallery: get("[data-glass-carousel]"),
          items: get("[data-glass-carousel-item]"),
          faq: get("details.qa"),
          videos: [...document.querySelectorAll("video")].map((v) => ({
            paused: v.paused,
            readyState: v.readyState,
            error: v.error?.code || null,
          })),
        };
      });
      report.states.push({ label, ...value });
      return value;
    }
    await page.goto(urls[site], {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await settle(8500);
    await state("entry");
    if (site === "raha") {
      const menu = page.locator('button[aria-label*="menu" i]').first();
      await menu.click();
      await settle();
      check(
        "menu expanded",
        (await menu.getAttribute("aria-expanded")) === "true",
      );
      const opened = await state("menu-open");
      check("menu locks document overflow", opened.overflow === "hidden");
      await page.keyboard.press("Escape");
      await settle();
      check(
        "Escape closes and returns focus",
        await menu.evaluate(
          (el) =>
            el.getAttribute("aria-expanded") === "false" &&
            document.activeElement === el,
        ),
      );
      const belt = page.locator(".mobile-skills-belt").first();
      // The belt moves continuously; scroll its stable region, not the belt.
      await page
        .locator(".mobile-skills")
        .first()
        .evaluate((el) =>
          el.scrollIntoView({ block: "center", behavior: "instant" }),
        );
      await settle();
      const transform = () =>
        belt.evaluate((el) => getComputedStyle(el).transform);
      const before = await transform();
      await settle(1100);
      const after = await transform();
      check(
        reduced
          ? "reduced motion stops automatic belt"
          : "automatic skills belt moves",
        reduced ? before === after : before !== after,
        { before, after },
      );
      await page.locator(".mobile-skills").first().focus();
      await page.keyboard.press("ArrowRight");
      await settle(80);
      const keyed = await transform();
      check("ArrowRight moves skills belt", keyed !== after, { after, keyed });
      await state("skills-keyboard");
      const project = page
        .getByRole("link", { name: "View case study", exact: true })
        .first();
      await project.scrollIntoViewIfNeeded();
      await project.click();
      // Sample while navigation is deliberately delayed by the site's transition.
      await settle(100);
      const overlay = await page.evaluate(() =>
        [...document.querySelectorAll("div")].some(
          (el) =>
            getComputedStyle(el).position === "fixed" &&
            getComputedStyle(el).zIndex === "9999",
        ),
      );
      check("route cover exists after activation", overlay);
      await page.waitForURL("**/bazargam", { timeout: 30000 });
      await settle(1700);
      check(
        "case-study route reached",
        new URL(page.url()).pathname === "/bazargam",
      );
      await state("project-open");
    }
    if (site === "glinto") {
      check(
        "intro releases document",
        await page.evaluate(() => !document.documentElement.dataset.intro),
      );
      const theme = page.locator(".theme-toggle:visible").first();
      const before = await page.evaluate(
        () => document.documentElement.dataset.theme,
      );
      await theme.click();
      await settle(400);
      const after = await page.evaluate(
        () => document.documentElement.dataset.theme,
      );
      check("theme switches", before !== after, { before, after });
      await page.reload({ waitUntil: "domcontentloaded" });
      await settle(3000);
      check(
        "theme persists through reload",
        (await page.evaluate(() => document.documentElement.dataset.theme)) ===
          after,
      );
      check(
        "intro session flag exists",
        await page.evaluate(() => sessionStorage.getItem("intro-seen") === "1"),
      );
      await state("revisit");
      const runway = await page
        .locator(".hs-runway")
        .evaluate((el) => ({
          top: el.getBoundingClientRect().top + scrollY,
          distance: el.offsetHeight - innerHeight,
        }));
      for (const p of [0, 1, 0]) {
        await page.evaluate(
          (y) => window.scrollTo({ top: y, behavior: "instant" }),
          runway.top + runway.distance * p,
        );
        await settle();
        await state("runway-" + p);
      }
      const tracks = report.states
        .filter((s) => s.label.startsWith("runway-"))
        .map((s) => s.track[0]?.transform);
      check(
        "horizontal track changes then returns",
        tracks[0] !== tracks[1] && tracks[0] === tracks[2],
        tracks,
      );
    }
    if (site === "tom") {
      const menu = page.locator(".nav-button.is-menu");
      await menu.click();
      await settle(1800);
      const open = await state("menu-open");
      check(
        "menu expanded and links interactive",
        (await menu.getAttribute("aria-expanded")) === "true" &&
          open.menu.some(
            (e) => String(e.class).includes("navbar-link-wrapper") && !e.inert,
          ),
      );
      await page.keyboard.press("Escape");
      // Wait for an observable endpoint, not wall time: busy headless rendering
      // can make GSAP's lag-smoothed clock advance slower than a fixed sleep.
      await page
        .waitForFunction(
          () =>
            getComputedStyle(document.querySelector(".navbar-link-wrapper"))
              .display === "none",
          {},
          { timeout: 12000 },
        )
        .catch(() => {});
      const closed = await state("menu-escape");
      check(
        "closed menu inert and hidden",
        closed.menu.some(
          (e) =>
            String(e.class).includes("navbar-link-wrapper") &&
            e.inert &&
            e.display === "none",
        ),
      );
      check(
        "Escape restores trigger focus",
        await menu.evaluate((el) => document.activeElement === el),
      );
      await page.locator("#work").scrollIntoViewIfNeeded();
      await settle(2500);
      const work = await state("gallery");
      check(
        reduced
          ? "reduced gallery retains DOM items"
          : "canvas gallery initializes",
        reduced
          ? work.items.length > 0 &&
              work.gallery[0]?.data.glassCarousel !== "canvas"
          : work.gallery[0]?.data.glassCarousel === "canvas",
      );
      if (!reduced) {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await settle(1600);
        const fallback = await state("runtime-reduced");
        check(
          "runtime reduced motion restores visible DOM items",
          fallback.gallery[0]?.data.glassCarousel !== "canvas" &&
            fallback.items.some(
              (e) => e.display !== "none" && e.width > 0 && e.height > 0,
            ),
        );
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await settle(2200);
        const restored = await state("runtime-normal");
        check(
          "runtime normal motion rebuilds canvas",
          restored.gallery[0]?.data.glassCarousel === "canvas",
        );
      }
    }
    if (site === "awmedia") {
      const summary = page.locator("details.qa summary").first();
      await summary.scrollIntoViewIfNeeded();
      await settle();
      await summary.focus();
      await page.keyboard.press("Enter");
      await settle(1000);
      check(
        "FAQ opens from keyboard",
        await summary.evaluate((el) => el.parentElement.open),
      );
      await state("faq-open");
      await page.keyboard.press("Enter");
      await settle(800);
      check(
        "FAQ closes from keyboard",
        await summary.evaluate((el) => !el.parentElement.open),
      );
      await summary.click();
      await settle(120);
      await summary.click();
      await settle(1000);
      await state("faq-interrupted");
      check(
        "interrupted FAQ returns closed",
        await summary.evaluate((el) => !el.parentElement.open),
      );
      check(
        "FAQ releases fixed body height",
        await summary.evaluate(
          (el) =>
            el.parentElement.querySelector(".qa-body")?.style.height === "",
        ),
      );
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" }),
      );
      await settle();
      if (mobile) {
        const menu = page.locator('button[aria-label*="menu" i]').first();
        await menu.click();
        await settle();
        check(
          "mobile menu opens",
          (await menu.getAttribute("aria-expanded")) === "true",
        );
        await state("menu-open");
        await page.keyboard.press("Escape");
        await settle();
        check(
          "Escape closes mobile menu",
          (await menu.getAttribute("aria-expanded")) === "false",
        );
      }
    }
    await state("final");
    const dir = path.join(__dirname, "evidence", "audit");
    await fs.mkdir(dir, { recursive: true });
    await page.screenshot({
      path: path.join(
        dir,
        `${site}-${mobile ? "mobile" : "desktop"}-${reduced ? "reduced" : "normal"}.png`,
      ),
    });
  } catch (e) {
    report.error = e.message;
    process.exitCode = 1;
  } finally {
    await browser.close();
    report.finished = new Date().toISOString();
    report.requestFailures.forEach((f) => {
      f.phase = /context disposed|browser has been closed/i.test(f.error)
        ? "teardown cancellation"
        : "during audit";
    });
    const dir = path.join(__dirname, "audit-results");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(
        dir,
        `${site}-${mobile ? "mobile" : "desktop"}-${reduced ? "reduced" : "normal"}.json`,
      ),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(
      JSON.stringify(
        {
          site,
          checks: report.checks,
          error: report.error,
          pageErrors: report.pageErrors,
          requestFailures: report.requestFailures.length,
        },
        null,
        2,
      ),
    );
    if (report.checks.some((c) => !c.pass)) process.exitCode = 1;
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
