// Read-only browser review against a locally served generated Library.
const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
let browser;
const deadline=setTimeout(()=>{console.error("Browser review deadline exceeded");process.exit(1)},180000);
deadline.unref();
(async()=>{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(20000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  fs.mkdirSync('browser-review',{recursive:true});
  const routes=['email/logo','email/teaser','email/loft','lp/heros','lp/process','lp/tables','lp/accordion','tokens/colors'];
  const results=[];
  for(const route of routes){
    await page.goto('http://127.0.0.1:8765/#'+route,{waitUntil:'networkidle'});
    await page.locator('#ft-content').waitFor();
    if(route.startsWith('lp/')){
      await page.waitForFunction(()=>Array.from(document.querySelectorAll('.ft-lp-shadow-host')).every(host=>Array.from(host.shadowRoot.querySelectorAll('link[rel=stylesheet]')).every(link=>link.sheet)),{},{timeout:20000});
    }
    await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,2000))]));
    assert.equal(await page.locator('[data-main-nav]').count(),3);
    const content=route.startsWith('lp/') ? page.locator('.frame-root').first() : page.locator('#ft-content');
    if(route==='email/logo'){
      const image=await page.locator('.test-email-preview img').first().evaluate(el=>({width:el.naturalWidth,height:el.naturalHeight}));
      assert.ok(image.width>0 && image.height>0,JSON.stringify(image));
    }else{
      const headings=await content.innerText();assert.ok(headings.length>5,route);
    }
    if(route==='lp/accordion'){
      const trigger=page.locator('.accordion__trigger').first();await trigger.click();
      assert.equal(await trigger.getAttribute('aria-expanded'),'true');
    }
    if(route==='lp/heros'){
      const diagnostics=await page.locator('.lpb-hero a.lpb-button').first().evaluate(el=>({
        color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor,
        brand:getComputedStyle(el).getPropertyValue('--color-background-brand'),classes:el.className,
        links:Array.from(el.getRootNode().querySelectorAll('link')).map(x=>({href:x.href,loaded:!!x.sheet})),
        viewport:innerWidth,body:document.documentElement.scrollWidth
      }));
      fs.writeFileSync('browser-review/layout.json',JSON.stringify(diagnostics,null,2));
      assert.ok(diagnostics.body<=diagnostics.viewport+2,JSON.stringify(diagnostics));
    }
    if(route==='lp/process'){
      assert.equal(await page.locator('.lpb-steps__item').count(),7);
      const styles=await page.locator('.lpb-steps__item').first().evaluate(el=>({display:getComputedStyle(el).display,font:getComputedStyle(el).fontSize}));
      assert.ok(parseFloat(styles.font)>=14,JSON.stringify(styles));
    }
    await page.screenshot({path:'browser-review/'+route.replace('/','-')+'.png',fullPage:true});
    results.push({route,ok:true});
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:8765/#lp/process',{waitUntil:'networkidle'});
  const sizes=await page.evaluate(()=>({viewport:innerWidth,body:document.documentElement.scrollWidth}));
  assert.ok(sizes.body<=sizes.viewport+2,JSON.stringify(sizes));
  await page.screenshot({path:'browser-review/mobile-lp-process.png',fullPage:true});
  assert.deepEqual(errors,[]);
  fs.writeFileSync('browser-review/result.json',JSON.stringify({routes:results,mobile:sizes,pageErrors:errors},null,2));
  await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1});
