'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('LAN has three compact selectable modes and keeps all original room APIs',()=>{
 const js=read('src/lan/lan-compact-ui.js'),css=read('src/lan/lan-compact-ui.css'),patch=read('scripts/patch-lan.cjs');
 for(const mode of ['coop','royale','eggrush'])assert.match(js,new RegExp("'"+mode+"'"));
 for(const id of ['pkmsvv-lan-create-public','pkmsvv-lan-create-private','pkmsvv-lan-quick','pkmsvv-lan-rooms'])
  assert.match(js,new RegExp(id));
 assert.match(js,/G\.MultiplayerUI\.create\(chosen,'private'\)/);
 assert.match(js,/G\.MultiplayerUI\.quick\(chosen\)/);
 assert.match(css,/pkmsvv-mode-card\.eggrush/);
 assert.match(css,/background:linear-gradient\(140deg,#fff6e0,#fff0cc\)/);
 assert.match(css,/pkmsvv-lan-selected/);
 assert.match(patch,/lan-compact-ui\.js/);assert.match(patch,/lan-compact-ui\.css/);
});
