// Render every real catalogue route with a deliberately small DOM adapter.
// This catches missing functions/data after merging the UIs; it is not a visual test.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
function element() {
  return {innerHTML:'', textContent:'', style:{}, dataset:{}, classList:{remove(){},add(){},toggle(){}},
    addEventListener(){},setAttribute(){},removeAttribute(){},querySelectorAll(){return []},querySelector(){return null}};
}
const ids = new Map();
const context = {
  console,
  window:{matchMedia:()=>({matches:true,addEventListener(){}}),addEventListener(){},location:{hash:''},setTimeout(){}},
  document:{getElementById(id){if (!ids.has(id)) ids.set(id,element());return ids.get(id)},
    querySelectorAll(){return []},querySelector(){return element()}},
  navigator:{},location:{hash:''},requestAnimationFrame:()=>{},setTimeout:()=>{},
};
vm.createContext(context);
for (const name of ['content-data.js','lp-module-markup.js','lp-shadow-styles.js','app.js']) {
  vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'), context, {filename:name});
}
let count=0;
for (const [section,value] of Object.entries(context.window.designLibraryData.sections)) {
  for (const item of vm.runInContext(`getSectionItems(${JSON.stringify(section)})`, context)) {
    vm.runInContext(`Object.assign(state, ${JSON.stringify({section,item:item.id})}); render();`,context);
    assert.ok(ids.get('ft-content').innerHTML.length>20, `${section}/${item.id}`);
    count++;
  }
}
assert.equal(vm.runInContext(`normalizeRoute('email','buttons').item`, context), 'buttons');
vm.runInContext(`Object.assign(state, {section:'email',item:'buttons'}); render();`, context);
assert.equal((ids.get('ft-content').innerHTML.match(/class="module-copy"/g)||[]).length, 4);
vm.runInContext(`Object.assign(state, {section:'lp',item:'buttons-links'}); render();`, context);
assert.equal((ids.get('ft-content').innerHTML.match(/class="module-copy"/g)||[]).length, 6);
assert.equal(vm.runInContext(`getLpElementVariants('buttons').length`, context), 5);
for (const [from, expected] of [
  [['lp','text-lists'], ['tokens','text-lists']],
  [['lp','colors'], ['tokens','colors']],
  [['lp','svg'], ['lp','diagrams']],
  [['foundations','text-lists'], ['tokens','text-lists']],
]) {
  const result = vm.runInContext(`normalizeRoute(...${JSON.stringify(from)})`, context);
  assert.deepEqual([result.section,result.item], expected);
}
const sections = context.window.designLibraryData.sections;
assert.deepEqual(Object.values(sections).map(section => section.label), ['E-Mail','Landing Page','Foundations']);
for (const id of ['text-lists','colors','svg']) assert.ok(!sections.lp.items.some(item => item.id === id));
assert.equal(sections.tokens.items.filter(item => item.id === 'text-lists').length, 1);
for (const section of ['home','agents','learning','missing']) {
  assert.equal(vm.runInContext(`normalizeRoute(${JSON.stringify(section)},'x').section`,context),'email');
}
// Exercise the real click binding for every variant, without a browser clipboard.
(async () => {
  for (const [section, item, expected] of [['email','buttons',4], ['lp','buttons-links',6]]) {
    vm.runInContext(`Object.assign(state, ${JSON.stringify({section,item})}); render();`, context);
    const payloads = [...ids.get('ft-content').innerHTML.matchAll(/class="module-copy" data-module="([^"]*)"/g)]
      .map(match => match[1].replace(/&quot;/g,'"').replace(/&#39;/g,"'")
        .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&'));
    assert.equal(payloads.length, expected);
    assert.equal(new Set(payloads).size, expected);
    const controls = payloads.map(value => {
      const button = {addEventListener(event, handler) { this.click = handler; }};
      return {dataset: {module: value}, classList: {add(){}, remove(){}},
        button, querySelector() { return button; }};
    });
    let copied;
    context.navigator.clipboard = {async writeText(value) { copied = value; }};
    ids.get('ft-content').querySelectorAll = selector => selector === '.module-copy' ? controls : [];
    vm.runInContext('bindModuleCopyButtons()', context);
    for (const control of controls) {
      await control.button.click();
      assert.equal(copied, control.dataset.module);
      assert.equal((copied.match(/<a\b/g)||[]).length, 1);
      assert.ok(!copied.includes('module-copy'));
    }
    ids.get('ft-content').querySelectorAll = () => [];
  }
  console.log(`${count} catalogue routes rendered; every button copies its own HTML; retired routes fall back to email.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
