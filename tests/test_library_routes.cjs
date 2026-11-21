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
  for (const item of value.items) {
    vm.runInContext(`Object.assign(state, ${JSON.stringify({section,item:item.id})}); render();`,context);
    assert.ok(ids.get('ft-content').innerHTML.length>20, `${section}/${item.id}`);
    count++;
  }
}
for (const section of ['home','agents','learning','missing']) {
  assert.equal(vm.runInContext(`normalizeRoute(${JSON.stringify(section)},'x').section`,context),'email');
}
console.log(`${count} catalogue routes rendered; retired routes fall back to email.`);
