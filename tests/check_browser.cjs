// Run the same maintained browser suites as CI.
const {execFileSync}=require('node:child_process');
const path=require('node:path');
for(const suite of ['check_buttons.cjs','check_optimizations.cjs','check_layout.cjs']) execFileSync(process.execPath,[path.join(__dirname,suite)],{stdio:'inherit'});
