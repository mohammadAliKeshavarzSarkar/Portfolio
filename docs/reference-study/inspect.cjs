#!/usr/bin/env node
'use strict';

// Bounded, read-only collection of public browser evidence. No form submission.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const SITES = {
  raha: 'https://raha-salimi.vercel.app/',
  glinto: 'https://glinto.co.kr/en',
  tom: 'https://www.tomdekoning.work/',
  awmedia: 'https://awmedia.marketing/',
};
const LIMITS = { scrollSamples: 24, nodes: 120, sourceBytes: 12_000_000,
  singleSourceBytes: 2_000_000, resources: 1000 };

function proxyConfig() {
  const raw = process.env.https_proxy || process.env.HTTPS_PROXY ||
    process.env.http_proxy || process.env.HTTP_PROXY;
  if (!raw) return undefined;
  const u = new URL(raw);
  return {
    server: u.origin,
    ...(u.username ? { username: decodeURIComponent(u.username) } : {}),
    ...(u.password ? { password: decodeURIComponent(u.password) } : {}),
    bypass: process.env.no_proxy || process.env.NO_PROXY || '',
  };
}

async function snapshot(page) {
  return page.evaluate(({ nodes }) => {
    const box = el => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    const label = el => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}` +
      (typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 4).join('.') : '');
    const candidates = [...document.querySelectorAll('body *')].filter(el => {
      const s = getComputedStyle(el);
      return ['fixed', 'sticky'].includes(s.position) || s.transform !== 'none' ||
        s.clipPath !== 'none' || s.scrollSnapType !== 'none';
    });
    return {
      time: performance.now(), scrollX, scrollY,
      viewport: { width: innerWidth, height: innerHeight },
      documentHeight: document.documentElement.scrollHeight,
      title: document.title, url: location.href,
      headings: [...document.querySelectorAll('h1,h2,h3')].map(el => ({ text: el.textContent.trim(), box: box(el) })),
      nodes: candidates.slice(0, nodes).map(el => {
        const s = getComputedStyle(el);
        return { selectorHint: label(el), box: box(el), position: s.position,
          top: s.top, transform: s.transform, opacity: s.opacity, clipPath: s.clipPath,
          zIndex: s.zIndex, overflow: s.overflow, scrollSnapType: s.scrollSnapType,
          transition: s.transition, animation: s.animation };
      }),
      candidateCount: candidates.length, candidateListTruncated: candidates.length > nodes,
      scrollStyles: [document.documentElement, document.body].map(el => {
        const s = getComputedStyle(el);
        return { element: el.tagName, behavior: s.scrollBehavior, overflow: s.overflow,
          transform: s.transform, snap: s.scrollSnapType };
      }),
      fonts: [...new Set([...document.querySelectorAll('h1,h2,p,a')].map(el => getComputedStyle(el).fontFamily))],
      canvases: document.querySelectorAll('canvas').length,
      videos: [...document.querySelectorAll('video')].map(v => ({ src: v.currentSrc, autoplay: v.autoplay, muted: v.muted, readyState: v.readyState })),
      animations: document.getAnimations().map(a => ({ playState: a.playState,
        currentTime: String(a.currentTime), timing: a.effect?.getTiming(),
        target: a.effect?.target ? label(a.effect.target) : null })),
      globals: { gsap: window.gsap?.version || null, ScrollTrigger: Boolean(window.ScrollTrigger),
        Lenis: Boolean(window.Lenis), THREE: window.THREE?.REVISION || null },
    };
  }, LIMITS);
}

async function capture(browser, key, url, root, mode, selfTest) {
  const dir = path.join(root, mode);
  await fs.mkdir(path.join(dir, 'sources'), { recursive: true });
  const mobile = mode === 'mobile';
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: mobile, hasTouch: mobile,
    reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference',
    ignoreHTTPSErrors: false,
  });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
  const page = await context.newPage();
  const report = { key, url, mode, capturedAt: new Date().toISOString(), limits: LIMITS,
    sourceBytes: 0, resources: [], failures: [], errors: [], samples: [],
    status: 'started', scrollMethod: mobile ? 'programmatic; touch gestures untested' : 'wheel' };
  if (process.argv.includes('--verified-fetch') && !selfTest) {
    report.transport = 'Playwright API route.fetch with TLS verification and inherited Node CA; not native browser network timing';
    await context.route('**/*', async route => {
      try {
        const response = await route.fetch({ timeout: 30_000 });
        await route.fulfill({ response });
      } catch (error) {
        report.failures.push({ url: route.request().url(), error: error.message, layer: 'verified-fetch' });
        await route.abort().catch(() => {});
      }
    });
  }
  let sourceQueue = Promise.resolve();
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('requestfailed', r => report.failures.push({ url: r.url(), error: r.failure()?.errorText }));
  page.on('response', response => {
    const type = response.request().resourceType();
    if (report.resources.length >= LIMITS.resources) { report.resourceListTruncated = true; return; }
    const item = { url: response.url(), status: response.status(), type };
    report.resources.push(item);
    if (!['script', 'stylesheet'].includes(type)) return;
    sourceQueue = sourceQueue.then(async () => {
      if (report.sourceBytes >= LIMITS.sourceBytes) { item.omitted = 'total source budget'; return; }
      const declaredLength = Number(response.headers()['content-length']);
      if (declaredLength > LIMITS.singleSourceBytes) { item.omitted = 'single source budget'; return; }
      const body = await response.body();
      if (body.length > LIMITS.singleSourceBytes || report.sourceBytes + body.length > LIMITS.sourceBytes) {
        item.omitted = 'source budget'; return;
      }
      report.sourceBytes += body.length;
      item.sha256 = crypto.createHash('sha256').update(body).digest('hex');
      item.file = `sources/${item.sha256}.${type === 'script' ? 'js' : 'css'}`;
      // Indicators are search leads, not conclusions about runtime behavior.
      item.indicators = ['ScrollTrigger', 'gsap', 'Lenis', 'locomotive', 'three.js',
        'framer-motion', 'barba', 'scroll-snap', 'position:sticky', 'animation-timeline']
        .filter(term => body.toString().toLowerCase().includes(term.toLowerCase()));
      await fs.writeFile(path.join(dir, item.file), body);
    }).catch(e => { item.captureError = e.message; });
  });
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    report.mainStatus = response?.status();
    if (!response || !response.ok()) throw new Error(`Main document HTTP ${response?.status()}`);
    await page.waitForTimeout(selfTest ? 100 : 2500);
    await fs.writeFile(path.join(dir, 'initial.html'), await page.content());
    report.samples.push(await snapshot(page));
    await page.screenshot({ path: path.join(dir, '00-initial.png') });

    if (!mobile) {
      // Start sampling before actual wheel input. Record frames, not just endpoints.
      await page.evaluate(() => {
        window.__studyFrames = [];
        const targets = [...document.querySelectorAll('body *')].filter(el => {
          const s = getComputedStyle(el);
          return s.transform !== 'none' || ['fixed', 'sticky'].includes(s.position);
        }).slice(0, 12);
        const start = performance.now();
        const step = t => {
          window.__studyFrames.push({ t: t - start, y: scrollY, targets: targets.map(el => ({
            top: el.getBoundingClientRect().top, transform: getComputedStyle(el).transform,
          })) });
          if (t - start < 1500) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      await page.mouse.move(720, 450);
      await page.mouse.wheel(0, 550);
      await page.waitForTimeout(1700);
      report.wheelFrames = await page.evaluate(() => window.__studyFrames);
    }
    const max = selfTest ? 3 : LIMITS.scrollSamples;
    for (let i = 1; i <= max; i++) {
      const prior = await snapshot(page);
      if (mobile) await page.evaluate(() => window.scrollBy(0, innerHeight * 0.75));
      else await page.mouse.wheel(0, 675);
      await page.waitForTimeout(selfTest ? 100 : 850);
      const state = await snapshot(page);
      report.samples.push(state);
      await page.screenshot({ path: path.join(dir, `${String(i).padStart(2, '0')}-scroll.png`) });
      if (state.scrollY >= state.documentHeight - state.viewport.height - 2 &&
          Math.abs(state.scrollY - prior.scrollY) < 1) {
        report.stopReason = 'document bottom and stable scroll position'; break;
      }
    }
    report.stopReason ||= 'sample limit; full traversal not established';
    await fs.writeFile(path.join(dir, 'final.html'), await page.content());
    report.status = 'captured; manual interaction review still required';
  } catch (e) {
    report.status = 'blocked-or-failed'; report.navigationError = e.message;
  } finally {
    await sourceQueue;
    await context.tracing.stop({ path: path.join(dir, 'trace.zip') });
    await context.close();
    await sourceQueue;
    await fs.writeFile(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
  }
  console.log(`${key}/${mode}: ${report.status}`);
  return report;
}

async function main() {
  const selfTest = process.argv.includes('--self-test');
  const key = selfTest ? 'self-test' : process.argv[2];
  if (!selfTest && !SITES[key]) throw new Error('Usage: inspect.cjs raha|glinto|tom|awmedia|--self-test');
  let server;
  let url = SITES[key];
  if (selfTest) {
    server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'text/html');
      res.end(`<!doctype html><meta charset="utf-8"><title>Capture fixture</title>
        <style>body{margin:0;height:4000px}.pin{position:sticky;top:0;height:80px}
        .moving{position:fixed;top:160px;transform:translateX(0)}</style>
        <h1 class="pin">Sticky test</h1><div class="moving">Transform test</div>
        <script>addEventListener('scroll',()=>document.querySelector('.moving').style.transform=
        'translateX('+scrollY/10+'px)')</script>`);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${server.address().port}/`;
  }
  const root = path.join(__dirname, 'evidence', `${key}-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.STUDY_CHROMIUM || '/usr/bin/chromium',
      headless: true, ...(selfTest ? {} : { proxy: proxyConfig() }) });
    let failed = false;
    const selectedMode = process.argv.find(arg => arg.startsWith('--mode='))?.split('=')[1];
    for (const mode of selfTest ? ['desktop'] : selectedMode ? [selectedMode] : ['desktop', 'mobile', 'reduced-motion']) {
      const report = await capture(browser, key, url, root, mode, selfTest);
      if (selfTest) {
        assert.match(report.status, /^captured/);
        assert(report.samples.some(s => s.nodes.some(n => n.position === 'sticky')));
        assert(report.samples.at(-1).scrollY > report.samples[0].scrollY);
        assert(report.wheelFrames.length > 10);
        assert(report.wheelFrames.some(f => f.targets.some(t => t.transform !== 'none')));
        assert((await fs.stat(path.join(root, mode, 'trace.zip'))).size > 0);
        console.log('PASS: local sticky/transform observation, scroll frames, screenshots and trace');
      }
      if (report.status === 'blocked-or-failed') { failed = true; break; }
    }
    console.log(`Evidence: ${root}`);
    if (failed) process.exitCode = 1;
  } finally {
    await browser?.close();
    if (server) await new Promise(resolve => server.close(resolve));
  }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
