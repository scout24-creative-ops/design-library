// Focused desktop/mobile review; requires the local server and Playwright.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE_PATH ? {executablePath: process.env.CHROMIUM_EXECUTABLE_PATH} : {}),
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {value: {
        writeText: async value => { window.copiedValue = value; },
      }});
    });
    fs.mkdirSync('browser-review', {recursive: true});
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 900});
      for (const [route, count] of [['email/buttons', 4], ['lp/buttons-links', 6]]) {
        await page.goto('http://127.0.0.1:8765/#' + route, {waitUntil: 'networkidle'});
        if (route.startsWith('lp')) {
          await page.waitForFunction(() => [...document.querySelectorAll('.ft-lp-shadow-host')].every(
            host => [...host.shadowRoot.querySelectorAll('link')].every(link => link.sheet)));
        }
        const cards = page.locator('.ft-lp-element-card');
        assert.equal(await cards.count(), count);
        assert.equal(await page.locator('.module-copy__button').count(), count);
        let previousBottom = 0;
        const copied = new Set();
        for (let i = 0; i < count; i++) {
          const card = cards.nth(i);
          const box = await card.boundingBox();
          const documentY = box.y + await page.evaluate(() => scrollY);
          assert.ok(documentY >= previousBottom, `${route} must stack at ${width}px`);
          previousBottom = documentY + box.height;
          const anchor = card.locator(route.startsWith('lp') ? '.frame-root a' : '.test-email-preview a');
          assert.equal(await anchor.count(), 1);
          const anchorBox = await anchor.boundingBox();
          const copyBox = await card.locator('.module-copy__button').boundingBox();
          assert.ok(copyBox.y + copyBox.height <= anchorBox.y, 'Copy control must clear preview');
          if (route.startsWith('email')) {
            assert.ok(anchorBox.width < box.width, 'Email buttons retain intrinsic width');
          }
          await card.locator('.module-copy__button').click();
          const value = await page.evaluate(() => window.copiedValue);
          assert.equal((value.match(/<a\b/g) || []).length, 1);
          const expected = route.startsWith('lp')
            ? await card.locator('.frame-root').evaluate(el => el.innerHTML)
            : await anchor.evaluate(el => el.outerHTML);
          assert.equal(value, expected);
          copied.add(value);
        }
        assert.equal(copied.size, count, 'Every variant has its own copy payload');
        const sizes = await page.evaluate(() => [innerWidth, document.documentElement.scrollWidth]);
        assert.ok(sizes[1] <= sizes[0] + 2, `${route} must fit at ${width}px`);
        await page.screenshot({path: `browser-review/buttons-${route.split('/')[0]}-${width}.png`, fullPage: true});
      }
    }
    await page.locator('[data-main-nav="email"]').click();
    await page.locator('[data-sidebar-item="buttons"]').click();
    await page.waitForURL('**/#email/buttons');
    assert.equal(await page.locator('[data-email-button]').count(), 4);
    assert.deepEqual(errors, []);
    console.log('Button routes, vertical layout and every copy payload passed at 1440px and 390px.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
