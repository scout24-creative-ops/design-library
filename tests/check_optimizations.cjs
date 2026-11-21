// Real browser checks for the navigation, shared foundations and LP repairs.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE_PATH ? {executablePath: process.env.CHROMIUM_EXECUTABLE_PATH} : {}),
  });
  const page = await browser.newPage();
  const errors = [];
  const diagnostics = [];
  page.on('pageerror', error => errors.push(error.message));
  fs.mkdirSync('browser-review', {recursive: true});
  try {
    for (const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      for (const route of ['email/buttons','email/tables','lp/benefits','lp/accordion','lp/callouts','lp/tables','lp/sticky-footer','tokens/text-lists']) {
        console.log(`Review ${route} at ${width}px`);
        await page.goto('http://127.0.0.1:8765/#' + route, {waitUntil:'domcontentloaded'});
        await page.locator('#ft-content > section').waitFor();
        await page.waitForFunction(() => [...document.querySelectorAll('.ft-lp-shadow-host')].every(
          host => host.shadowRoot && [...host.shadowRoot.querySelectorAll('link')].every(link => link.sheet)));
        await page.evaluate(() => document.fonts.ready);
        // Hash navigation changes color through a short CSS transition.
        await page.waitForFunction(() => {
          const active=document.querySelector('[data-main-nav][aria-current="page"]');
          return active && getComputedStyle(active).color==='rgb(51, 51, 51)' && Number(getComputedStyle(active).fontWeight)===700;
        });
        assert.deepEqual(await page.locator('[data-main-nav]').allTextContents(), ['E-Mail','Landing Page','Foundations']);
        const nav = await page.locator('[data-main-nav]').evaluateAll(links => links.map(link => ({
          active:link.getAttribute('aria-current') === 'page',
          color:getComputedStyle(link).color,weight:getComputedStyle(link).fontWeight,
        })));
        assert.equal(nav.filter(link => link.active).length,1);
        assert.ok(nav.filter(link => link.active).every(link => link.color === 'rgb(51, 51, 51)' && Number(link.weight) === 700),JSON.stringify({route,width,nav}));
        assert.ok(nav.filter(link => !link.active).every(link => link.color === 'rgb(103, 103, 103)' && Number(link.weight) === 400),JSON.stringify({route,width,nav}));
        const copies = await page.locator('.test-module-row, .ft-lp-element-card').evaluateAll(rows => rows.flatMap(row => {
          const copy = row.querySelector(':scope > .module-copy');
          const frame = row.querySelector(':scope > .test-module-frame');
          if (!copy || !frame) return [];
          const c=copy.getBoundingClientRect(), f=frame.getBoundingClientRect();
          return [{bottom:c.bottom, top:f.top, gap:f.top-c.bottom, left:c.left, frameLeft:f.left}];
        }));
        assert.ok(copies.every(copy => copy.bottom <= copy.top && copy.gap <= 17), `${route}: copy stays just above preview`);
        if (route === 'email/buttons') assert.ok(copies.every(copy => Math.abs(copy.left-copy.frameLeft)<2));
        if (route.startsWith('lp/')) {
          const sidebar=await page.locator('[data-sidebar-item]').evaluateAll(links => links.map(link=>link.dataset.sidebarItem));
          for (const removed of ['colors','svg','text-lists']) assert.ok(!sidebar.includes(removed));
        }
        if (route === 'lp/benefits') {
          assert.equal(await page.locator('.lpb-icon--48').count(),7);
          const icons=await page.locator('.lpb-icon--48').evaluateAll(icons=>icons.map(icon=>({
            content:getComputedStyle(icon,'::before').content,
            family:getComputedStyle(icon,'::before').fontFamily,
            size:getComputedStyle(icon).fontSize,
            width:icon.getBoundingClientRect().width,
            height:icon.getBoundingClientRect().height,
          })));
          assert.ok(icons.every(icon=>icon.content !== 'none' && icon.content !== 'normal' && icon.size==='48px' && icon.width>=47 && icon.height>=47),JSON.stringify(icons));
          const fonts=await page.evaluate(()=>[...document.fonts].map(font=>({family:font.family,status:font.status})));
          assert.ok(fonts.some(font=>/s24/i.test(font.family) && font.status==='loaded'),JSON.stringify(fonts));
          diagnostics.push({route,width,icons,fonts});
        }
        if (route === 'lp/accordion') {
          const triggers=page.locator('.accordion__trigger');
          assert.equal(await triggers.count(),5);
          for (const trigger of await triggers.all()) {
            await trigger.click();
            assert.equal(await trigger.getAttribute('aria-expanded'),'true');
            assert.equal(await trigger.evaluate(trigger=>{
              const panel=trigger.getRootNode().getElementById(trigger.getAttribute('aria-controls'));
              return panel?.getAttribute('aria-labelledby')===trigger.id;
            }),true);
            await trigger.click();
            assert.equal(await trigger.getAttribute('aria-expanded'),'false');
          }
        }
        if (route === 'lp/tables') {
          const styles=await page.locator('.lpb-product-comparison__plan-identities').evaluate(el=>getComputedStyle(el).display);
          assert.equal(styles,'grid');
          assert.equal(await page.locator('.lpb-product-comparison__table').first().evaluate(el=>getComputedStyle(el).borderCollapse),'collapse');
          const summary=page.locator('.lpb-product-comparison__group-summary').last();
          await summary.click();
          assert.equal(await summary.evaluate(el=>el.parentElement.open),true);
          if (width===390) assert.equal(await page.locator('.lpb-product-comparison__scroller').evaluate(el=>el.scrollWidth>el.clientWidth),true);
        }
        if (route === 'lp/sticky-footer') {
          const footer=page.locator('.lpb-sticky-footer');
          assert.equal(await footer.isVisible(),true);
          const position=await footer.evaluate(el=>({position:getComputedStyle(el).position,transform:getComputedStyle(el).transform}));
          assert.deepEqual(position,{position:'relative',transform:'none'});
          assert.ok((await footer.boundingBox()).height>50);
        }
        if (route === 'tokens/text-lists') {
          assert.equal(await page.locator('[data-main-nav="tokens"]').getAttribute('aria-current'),'page');
          assert.equal(await page.locator('.ft-lp-element-card').count(),8);
        }
        const sizes=await page.evaluate(()=>[innerWidth,document.documentElement.scrollWidth]);
        assert.ok(sizes[1]<=sizes[0]+2,`${route} overflows at ${width}: ${sizes}`);
        await page.screenshot({path:`browser-review/${route.replace('/','-')}-${width}.png`,fullPage:true});
      }
    }
    assert.deepEqual(errors,[]);
    console.log('Navigation, copy placement, icons, accordion, tables, footer and foundations pass at 1440px and 390px.');
  } catch (error) {
    await page.screenshot({path:'browser-review/failure.png',fullPage:true}).catch(()=>{});
    throw error;
  } finally {
    fs.writeFileSync('browser-review/diagnostics.json',JSON.stringify({diagnostics,errors},null,2));
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1});
