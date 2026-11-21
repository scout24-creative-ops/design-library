// Exercise every canonical module in real, independent browser viewports.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const context = {window:{}}; vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'content-data.js'),'utf8'), context);
const data = context.window.designLibraryData;
const rows = [];
let browser;
(async () => {
  browser = await chromium.launch({headless:true});
  const page = await browser.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  for (const channel of ['lp','email']) {
    const modules = [...new Set(data.sections[channel].items.flatMap(item=>item.modules || []))];
    assert.equal(modules.length, channel === 'lp' ? 34 : 38);
    for (const mode of ['desktop','mobile']) {
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
  // Reference widths are not minimum widths: small and intermediate sizes remain fluid.
  for(const [channel,name,widths] of [['lp','steps-3col',[320,375,668,669,1000,1014]],['email','teaser-2col-vertical',[320,375,620,621]]]) {
    for(const width of widths) {
      await page.setViewportSize({width,height:900});
      await page.goto(`http://127.0.0.1:8765/preview.html?channel=${channel}&module=${name}`);
      await page.locator('#preview-root[data-ready="true"]').waitFor();
      assert.equal(await page.evaluate(()=>innerWidth),width);
      assert.ok(await page.locator('#preview-root').evaluate(el=>el.getBoundingClientRect().width<=innerWidth));
    }
  }
  assert.deepEqual(errors,[]);
  fs.mkdirSync('browser-review',{recursive:true});
  fs.writeFileSync('browser-review/module-layouts.json',JSON.stringify(rows,null,2));
  console.log(`Checked ${rows.length} canonical module/reference combinations plus responsive boundaries.`);
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close()});
