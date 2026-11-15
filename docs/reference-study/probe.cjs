// Targeted, read-only interactions supplement the coarse scroll collector.
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const sites = { raha: 'https://raha-salimi.vercel.app/', glinto: 'https://glinto.co.kr/en', tom: 'https://www.tomdekoning.work/', awmedia: 'https://awmedia.marketing/' };
const key = process.argv[2], mobile = process.argv.includes('--mobile'), reduced = process.argv.includes('--reduced');
if (!sites[key]) throw Error('Choose raha, glinto, tom, or awmedia');
(async () => {
  const proxyURL = process.env.HTTPS_PROXY || process.env.https_proxy;
  const proxy = proxyURL ? { server: new URL(proxyURL).origin, bypass: process.env.NO_PROXY || '' } : undefined;
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, proxy });
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const dir = path.join(__dirname, 'evidence', `probe-${key}-${mobile ? 'mobile' : reduced ? 'reduced' : 'desktop'}-${Date.now()}`);
  await fs.mkdir(dir, { recursive: true });
  const report = { url: sites[key], mobile, reduced, transport: 'TLS-verified API fetch, not native browser network timing', steps: [], failures: [], errors: [] };
  await context.route('**/*', async route => {
    try { await route.fulfill({ response: await route.fetch({ timeout: 30000 }) }); }
    catch(e) { report.failures.push({ url: route.request().url(), error: e.message.slice(0,250) }); await route.abort().catch(()=>{}); }
  });
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  async function record(label, screenshot = true) {
    const state = await page.evaluate(() => {
      const rect = el => { const r = el.getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height }; };
      const elements = [...document.querySelectorAll('section,[data-sequence-wrap],[data-sequence-element],.navbar,[data-hscroll],.hs-track,[data-stack-card],.stack-inner,[data-scroll-progress],.navbar-link-wrapper,[data-built-device],[data-built-shot]')].map(el => {
        const s = getComputedStyle(el);
        return { tag:el.tagName,id:el.id,classes:el.className,attributes:Object.fromEntries([...el.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value])),rect:rect(el),transform:s.transform,position:s.position,top:s.top,opacity:s.opacity,clipPath:s.clipPath,progress:s.getPropertyValue('--progress'),p:s.getPropertyValue('--p') };
      });
      return { url:location.href,scrollY,height:document.documentElement.scrollHeight,htmlClasses:document.documentElement.className,intro:document.documentElement.dataset.intro,elements,
        gsap:window.gsap?.version,
        triggers:window.ScrollTrigger?.getAll().map(t=>({trigger:t.trigger?.id||t.trigger?.className,start:t.start,end:t.end,progress:t.progress,scrub:t.vars.scrub,pin:!!t.pin})),
        links:[...document.querySelectorAll('a[href]')].map(a=>({text:a.innerText.trim().slice(0,80),href:a.getAttribute('href'),class:a.className})),
        buttons:[...document.querySelectorAll('button,[role=button]')].map(a=>({text:a.innerText.trim().slice(0,60),aria:a.getAttribute('aria-label'),expanded:a.getAttribute('aria-expanded'),class:a.className})),
        carousel:document.querySelector('[data-glass-carousel]')?.getAttribute('data-glass-carousel'),
        counter:document.querySelector('[data-glass-carousel-counter]')?.textContent,
        active:document.activeElement?.outerHTML.slice(0,500),
        canvas:[...document.querySelectorAll('canvas')].map(c=>({class:c.className,width:c.width,height:c.height})),
      };
    });
    report.steps.push({label,...state});
    if(screenshot) await page.screenshot({path:path.join(dir,`${String(report.steps.length).padStart(2,'0')}-${label}.png`), timeout:60000});
    await fs.writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2));
    console.log(key,label,Math.round(state.scrollY));
  }
  async function scroll(y) { await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),y); await page.waitForTimeout(1200); }
  try {
    await page.goto(sites[key],{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForTimeout(6500);
    await record('settled-entry');
    if(!mobile){
      await page.evaluate(()=>{window.__probeFrames=[];const start=performance.now();const tick=t=>{window.__probeFrames.push({t:t-start,y:scrollY});if(t-start<1400)requestAnimationFrame(tick)};requestAnimationFrame(tick)});
      await page.mouse.move(700,400);await page.mouse.wheel(0,500);await page.waitForTimeout(1600);
      report.settledWheelFrames=await page.evaluate(()=>window.__probeFrames);await scroll(0);
    }
    if(key==='tom') {
      for (const y of [200,450,700,1000,1450,1900]) { await scroll(y); await record(`scroll-${y}`); }
      const trigger=page.locator('.nav-button.is-menu');
      if(await trigger.isVisible()) { await trigger.click(); await page.waitForTimeout(1700); await record('menu-open'); await page.keyboard.press('Escape'); await page.waitForTimeout(1400); await record('menu-escape'); }
      await page.locator('#work').scrollIntoViewIfNeeded(); await page.waitForTimeout(1500);
      await record('carousel-before');
      const c=await page.locator('[data-glass-carousel-canvas]').boundingBox();
      if(c) {
        const x=c.x+c.width*.68,y=Math.max(100,Math.min(750,c.y+c.height*.5));
        await page.mouse.move(x,y);await page.mouse.wheel(700,0);await page.waitForTimeout(2200);await record('carousel-horizontal-wheel');
        await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-360,y,{steps:12});await page.mouse.up();await page.waitForTimeout(2200);await record('carousel-drag');
      }
      await scroll(100000);await record('footer');
    } else if(key==='glinto') {
      const runway=await page.locator('.hs-runway').evaluate(el=>({top:el.getBoundingClientRect().top+scrollY,height:el.offsetHeight,view:innerHeight}));
      for(const p of [0,.25,.5,.75,1]) {await scroll(runway.top+p*(runway.height-runway.view));await record(`horizontal-${p}`);}
      const service=page.locator('#service-media');if(await service.count()){await service.scrollIntoViewIfNeeded();await record('service-media');}
      await scroll(0);await record('hero-return');
      const next=page.getByRole('button',{name:/next/i}).first();if(await next.isVisible().catch(()=>false)){await next.click();await page.waitForTimeout(1800);await record('hero-next');}
    } else if(key==='raha') {
      if(!mobile){await page.mouse.move(1200,450);await page.waitForTimeout(1200);await record('hero-pointer-right');await page.mouse.move(200,450);await page.waitForTimeout(1200);await record('hero-pointer-left');}
      const link=page.getByRole('link',{name:'Case Studies',exact:true}).first();
      if(await link.isVisible().catch(()=>false)){await link.click();await page.waitForTimeout(1600);await record('case-studies-anchor');}
      const project=page.getByRole('link',{name:'View case study',exact:true}).first();
      if(await project.count()){await project.click();await page.waitForTimeout(3000);await record('project-open');await page.goBack({waitUntil:'domcontentloaded'});await page.waitForTimeout(1500);await record('project-back');}
    } else if(key==='awmedia') {
      for(const id of ['built','work','lanes','services','process','why','faq','cta']){
        const el=page.locator('#'+id);if(await el.count()){await scroll(await el.evaluate(el=>el.getBoundingClientRect().top+scrollY)-90);await record('section-'+id);}
      }
      const summary=page.locator('details.qa summary').first();
      if(await summary.count()){await summary.click();await page.waitForTimeout(900);await record('faq-open');await summary.click();await page.waitForTimeout(700);await record('faq-close');}
      await scroll(100000);await record('footer');
    }
    if(mobile){
      await scroll(0);
      const buttons=page.locator('button[aria-label*="menu" i],button[aria-label*="navigation" i],.nav-button.is-menu').first();
      if(await buttons.isVisible().catch(()=>false)){await buttons.click();await page.waitForTimeout(1600);await record('mobile-menu-open');await page.keyboard.press('Escape');await page.waitForTimeout(1200);await record('mobile-menu-escape');}
      const client=await context.newCDPSession(page);
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:190,y:650}]});
      for(let y=620;y>=250;y-=30){await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:190,y}]});await page.waitForTimeout(25);}
      await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(1500);await record('touch-swipe');
    }
  }catch(e){report.error=e.message;console.error(e.message);process.exitCode=1;}
  finally{await fs.writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2));await browser.close();console.log('Evidence:',dir);}
})().catch(e=>{console.error(e);process.exitCode=1;});
