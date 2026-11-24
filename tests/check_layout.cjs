// Exercise every canonical module in real, independent browser viewports.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const {previewFrames} = require('./browser_helpers.cjs');
const root = path.resolve(__dirname, '..');
const context = {window:{}}; vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'content-data.js'),'utf8'), context);
const data = context.window.designLibraryData;
const rows = [];
let browser;
(async () => {
  browser = await chromium.launch({headless:true, ...(process.env.CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.CHROMIUM_EXECUTABLE_PATH} : {})});
  const page = await browser.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  for (const channel of ['lp','email']) {
    const modules = [...new Set(data.sections[channel].items.flatMap(item=>item.modules || []))];
    assert.equal(modules.length, channel === 'lp' ? 34 : 38);
    for (const mode of ['desktop']) {
      const width = data.layout[channel].referenceViewports[mode];
      await page.setViewportSize({width,height:900});
      for (const name of modules) {
        await page.goto(`http://127.0.0.1:8765/preview.html?channel=${channel}&module=${name}`,{waitUntil:'domcontentloaded'});
        await page.locator('#preview-root[data-ready="true"]').waitFor();
        const result=await page.locator('#preview-root').evaluate(root=>{
          const box=root.getBoundingClientRect(),style=getComputedStyle(root);
          return {viewport:innerWidth,width:box.width,paddingLeft:parseFloat(style.paddingLeft),paddingRight:parseFloat(style.paddingRight),
            inner:root.querySelector('.module__inner') ? (()=>{const el=root.querySelector('.module__inner'),s=getComputedStyle(el);return {width:el.getBoundingClientRect().width,left:parseFloat(s.paddingLeft),right:parseFloat(s.paddingRight)}})() : null};
        });
        assert.equal(result.viewport,width);
        const layout=data.layout[channel];
        assert.equal(result.width,Math.min(width,layout.containerMaxWidth),JSON.stringify({channel,mode,name,result}));
        if(channel==='lp') {
          const gutter=layout.paddingInline.filter(step=>width>=step.minWidth).at(-1).value;
          assert.equal(result.paddingLeft,gutter); assert.equal(result.paddingRight,gutter);
          if (name==='hero-split' || name==='hero-bleed-flex') {
            const edges=await page.locator('#preview-root').evaluate(root=>{
              const box=root.getBoundingClientRect(),style=getComputedStyle(root);
              const hero=root.querySelector('.lpb-hero--split .lpb-hero__inner,.lpb-hero--bleed:not(.lpb-hero--centered) .lpb-hero__content');
              const rect=hero.getBoundingClientRect(),heroStyle=getComputedStyle(hero);
              return {expectedLeft:box.left+parseFloat(style.paddingLeft),expectedRight:box.right-parseFloat(style.paddingRight),
                left:rect.left+parseFloat(heroStyle.paddingLeft),right:rect.right-parseFloat(heroStyle.paddingRight)};
            });
            assert.ok(Math.abs(edges.left-edges.expectedLeft)<0.1,JSON.stringify({name,mode,edges}));
            assert.ok(Math.abs(edges.right-edges.expectedRight)<0.1,JSON.stringify({name,mode,edges}));
          }
        } else {
          assert.ok(result.inner, name);
          const gutter=layout.paddingInline[mode];
          assert.equal(result.inner.width,Math.min(width,600));
          assert.equal(result.inner.left,gutter,name); assert.equal(result.inner.right,gutter,name);
        }
        rows.push({channel,mode,name,...result});
      }
    }
  }
  // Shrinking the Library window must never shrink a module or change its
  // CSS viewport. Overflow stays inside each accessible, scrollable preview.
  const desktopGeometry = new Map();
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    const checked = new Set();
    for (const channel of ['email','lp']) {
      for (const item of data.sections[channel].items.filter(item=>item.modules?.length)) {
        await page.goto(`http://127.0.0.1:8765/#${channel}/${item.id}`,{waitUntil:'domcontentloaded'});
        // A grouped section and its selected child can share the same route.
        await page.locator(`[data-sidebar-item="${item.id}"].is-active`).first().waitFor();
        assert.equal(await page.locator('[data-preview-mode],.ft-preview-toolbar').count(),0);
        const frames=await previewFrames(page);
        const handles=await page.locator('iframe[data-preview-key]').elementHandles();
        for(let i=0;i<frames.length;i++) {
          const handle=handles[i];
          await page.waitForFunction(key=>{
            const f=[...document.querySelectorAll('iframe')].find(el=>el.dataset.previewKey===key);
            return f?.dataset.contentHeight && f?.dataset.canvasWidth;
          },await handle.getAttribute('data-preview-key'));
          const geometry=await frames[i].locator('#preview-root').evaluate(root=>({
            viewport:innerWidth,width:root.getBoundingClientRect().width,
            fontSize:getComputedStyle(root).fontSize,
          }));
          assert.equal(geometry.viewport,data.layout[channel].referenceViewports.desktop);
          assert.equal(geometry.width,data.layout[channel].containerMaxWidth);
          const outer=await handle.evaluate(frame=>{
            const canvas=frame.parentElement,host=canvas.parentElement;
            const result={frameWidth:frame.getBoundingClientRect().width,
              transform:getComputedStyle(frame).transform,zoom:getComputedStyle(frame).zoom,
              expectedCanvasWidth:Number(frame.dataset.canvasWidth),
              expectedCanvasLeft:Number(frame.dataset.canvasLeft),
              frameLeft:frame.getBoundingClientRect().left-canvas.getBoundingClientRect().left,
              canvasWidth:canvas.getBoundingClientRect().width,hostWidth:host.clientWidth,
              scrollWidth:host.scrollWidth,role:host.getAttribute('role'),tabIndex:host.tabIndex};
            host.scrollLeft=host.scrollWidth;
            result.scrollLeft=host.scrollLeft;
            host.scrollLeft=0;
            return result;
          });
          assert.equal(outer.frameWidth,geometry.viewport);
          assert.equal(outer.transform,'none');
          assert.equal(outer.zoom,'1');
          assert.equal(outer.canvasWidth,outer.expectedCanvasWidth);
          assert.ok(Math.abs(outer.frameLeft+outer.expectedCanvasLeft)<0.1);
          assert.equal(outer.role,'region');
          assert.equal(outer.tabIndex,0);
          assert.ok(outer.scrollWidth>=outer.canvasWidth-1);
          assert.ok(outer.scrollLeft>=Math.max(0,outer.scrollWidth-outer.hostWidth)-1);
          const src=new URL(await handle.getAttribute('src'),'http://127.0.0.1:8765');
          const name=src.searchParams.get('module');
          const key=`${channel}/${name}`;
          checked.add(key);
          if(width===1440) desktopGeometry.set(key,geometry);
          else assert.deepEqual(geometry,desktopGeometry.get(key),key+' changed when Library shrank');
          rows.push({channel,name,libraryWidth:width,...geometry,...outer});
        }
      }
    }
    assert.equal(checked.size,72);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  }
  assert.deepEqual(errors,[]);
  fs.mkdirSync('browser-review',{recursive:true});
  fs.writeFileSync('browser-review/module-layouts.json',JSON.stringify(rows,null,2));
  console.log(`Checked ${rows.length} module checks, including all 72 modules at original size in wide and narrow Library windows.`);
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close()});
