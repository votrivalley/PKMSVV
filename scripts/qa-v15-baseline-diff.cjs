'use strict';
/* Test-delta audit: compare complete existing regression suites against
 * EXACT pinned, prepared PKMSVV baseline before and after native 3DS stages.
 * A new failing test or changed test inventory is a hard failure. Existing
 * failures stay visible; this does NOT claim baseline v1.5 was all green.
 */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const phase=process.argv[2],suite=process.argv[3]||'v15';
if(!['baseline','post'].includes(phase) ||
 !['v15','controller','balance'].includes(suite))
 throw Error('Usage: node scripts/qa-v15-baseline-diff.cjs baseline|post v15|controller|balance');
const label=suite.toUpperCase();
const base=path.resolve(__dirname,'..','dist','qa-'+suite+'-baseline.json');
const run=cp.spawnSync(process.platform==='win32'?'npm.cmd':'npm',
 ['run','test:'+suite],{cwd:path.resolve(__dirname,'..'),encoding:'utf8',
 timeout:120000,maxBuffer:16*1024*1024});
const output=(run.stdout||'')+'\n'+(run.stderr||'');
if(run.error)throw run.error;
const lines=output.split(/\r?\n/);
const cases=lines.map(line=>/^(ok|not ok)\s+\d+\s+-\s+(.*)$/.exec(line))
 .filter(Boolean).map(m=>({name:m[2].trim(),pass:m[1]==='ok'}));
const totals=lines.map(line=>/^# tests (\d+)$/.exec(line)).filter(Boolean);
if(totals.length!==1||cases.length!==Number(totals[0][1])||
 new Set(cases.map(x=>x.name)).size!==cases.length)
 throw Error(suite+' TAP inventory missing/duplicate; cannot compare: '+output.slice(-1500));
const fails=cases.filter(c=>!c.pass).map(c=>c.name);
const report={tests:cases.length,passed:cases.length-fails.length,failed:fails,
 names:cases.map(c=>c.name),exit:run.status};
fs.mkdirSync(path.dirname(base),{recursive:true});
if(phase==='baseline'){
 fs.writeFileSync(base,JSON.stringify(report,null,2));
 console.log('PKMSVV_3DS_'+label+'_PINNED_BASELINE_AUDIT tests='+cases.length+
  ' existingFailures='+fails.length);
 for(const n of fails)console.log('PREEXISTING_BASELINE_FAILURE '+n);
 process.exit(0);
}
if(!fs.existsSync(base))throw Error(suite+' baseline report missing');
const original=JSON.parse(fs.readFileSync(base,'utf8'));
if(original.tests!==report.tests ||
 JSON.stringify(original.names)!==JSON.stringify(report.names))
 throw Error(suite+' test inventory changed between baseline and native patches');
const newFails=fails.filter(n=>!original.failed.includes(n));
if(newFails.length)throw Error(suite+' native-regression NEW failures: '+newFails.join(' | '));
if(original.failed.length){
 console.log('WARNING PKMSVV pin already has '+original.failed.length+
  ' pre-existing '+suite+' test failures unrelated to Stage6–10; no full suite PASS claimed');
 for(const n of original.failed)console.log('UNRESOLVED_PINNED_BASELINE_FAILURE '+n);
}
console.log('PKMSVV_3DS_'+label+'_TEST_DELTA_PASS tests='+cases.length+
 ' oldFails='+original.failed.length+' newFails='+newFails.length+
 ' nowFails='+fails.length);
