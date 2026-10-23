'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const home=path.join(__dirname,'..');
const game=path.join(home,'vendor','pokesurvivor');
const file=p=>fs.readFileSync(path.join(game,p),'utf8');
test('Vietnamese defaults but English can be selected and saved',()=>{
 const s=file('js/core/locales.js');
 assert.match(s,/\['vi', 'Tiếng Việt', 'vi-VN'\]/);
 assert.match(s,/\['en', 'English', 'en-GB'\]/);
 assert.match(s,/const lang = normalize\(saved\) \|\| 'vi'/);
});
test('move names (including evolution names) retain the official English naming',()=>{
 const dict=file('js/data/pkmsvv-move-names.js');
 const match=/^G\.I18n\.add\((.+),"vi","move"\);\s*$/s.exec(dict);
 assert.ok(match,'Cannot parse official English move dictionary');
 const moves=JSON.parse(match[1]);
 assert.ok(Object.keys(moves).length>=190,'Expected over 190 original/evolution move names');
 assert.equal(moves['Ascuas'],'Ember');
 assert.equal(moves['Danza Espada'],'Swords Dance');
 const vi=file('js/data/lang-vi.js');
 assert.match(vi,/"Ascuas":"Ember"/);
});
test('owner-approved bilingual v1.1 changelog replaces the old empty placeholder',()=>{
 const notes=file('js/data/changelog.js');
 assert.match(notes,/G\.CHANGELOG\s*=\s*\[\{/);
 assert.match(notes,/Pokémon Survivor – Votri Valley v1\.1/);
 assert.match(notes,/15 Nâng cấp Toàn Đội/);
 assert.match(notes,/15 Team Powerups/);
 assert.match(notes,/Đồng hành/);
 assert.match(notes,/Choose Partner/);
});
test('dash attacks are manual and the four dash moves never auto-fire',()=>{
 const s=file('js/systems/combat.js');
 assert.match(s,/m\.kind === 'dash'\) \{ m\.t = Math\.max\(0/);
 assert.match(s,/function manualDash\(pl\)/);
 assert.match(s,/G\.Game\.state !== 'playing'/);
 assert.match(s,/pl\.cast\(m\)/);
 assert.match(file('js/game.js'),/G\.Input\.tap\('keyf'\).*manualDash\(pl\)/);
 const pad=file('js/core/gamepad.js');
 assert.match(pad,/hit\(BT\.X\).*virtual\('keyf'\)/);
 assert.doesNotMatch(pad,/if \(hit\(BT\.LB\).*G\.Input\.virtual\('keyq'\)/);
});
test('evolution selection can be navigated and accepted with controller',()=>{
 const evo=file('js/systems/pkmsvv-evolution.js'),pad=file('js/core/gamepad.js');
 assert.match(evo,/className = 'scr pkmsvv-evo'/);
 assert.match(evo,/skip\.setAttribute\('data-back', ''\)/);
 assert.match(evo,/G\.Pad\.focusFirst\(\)/);
 assert.match(pad,/focusFirst\(\) \{/);
});
test('manual dash touch button and controller hints replace old attack cycling',()=>{
 const hud=file('js/ui/hud.js'),settings=file('js/ui/settings-ui.js');
 assert.match(hud,/G\.Touch\.addButton\(x,\s*y,\s*size,\s*size,\s*\(\)\s*=>\s*G\.Combat\.manualDash\(pl\)/);
 assert.match(settings,/activar movimiento especial/);
 assert.doesNotMatch(settings,/ataque anterior \/ siguiente/);
 assert.match(settings,/X \(Xbox\) \/ □ \(PlayStation\)/);
 assert.match(settings,/<kbd>F<\/kbd>/);
});

test('Votri Valley derivative credit is visible on boot and main menu',()=>{
 const html=file('index.html');
 assert.match(html,/Việt hóa và Mod điều chỉnh bởi Votri Valley/);
 assert.match(html,/class="splash" translate="no">Việt hóa và Mod điều chỉnh bởi Votri Valley/);
 assert.doesNotMatch(html,/class="pkmsvv-attribution"/);
 assert.match(html,/class="pkmsvv-boot-credit"/);
 assert.match(html,/PokéSurvivor/);
 assert.match(html,/SpriteCollab/);
});
