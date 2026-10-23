'use strict';
/* PKMSVV v0.9 — pinned-source patch for all-gen Gacha, collection quests and backup UI. */
const fs=require('node:fs'),path=require('node:path');
const project=path.join(__dirname,'..'),game=path.join(project,'vendor','pokesurvivor');
function patch(file,from,to){
 const p=path.join(game,file),s=fs.readFileSync(p,'utf8'),parts=s.split(from);
 if(parts.length!==2)throw Error('Collection patch failed: '+file+' anchor: '+from.slice(0,110));
 fs.writeFileSync(p,parts.join(to),'utf8');
}
for(const [src,dst] of [
 ['src/pkmsvv-collection.js','js/data/pkmsvv-collection.js'],
 ['src/pkmsvv-collection-ui.js','js/ui/pkmsvv-collection-ui.js'],
 ['src/pkmsvv-save-ui.js','js/ui/pkmsvv-save-ui.js']
])fs.copyFileSync(path.join(project,src),path.join(game,dst));
patch('dev.html',
 '<script defer src="js/data/missions.js"></script>',
 '<script defer src="js/data/missions.js"></script>\n<script defer src="js/data/pkmsvv-collection.js"></script>');
patch('dev.html',
 '<script defer src="js/ui/goals-ui.js"></script>',
 '<script defer src="js/ui/goals-ui.js"></script>\n<script defer src="js/ui/pkmsvv-collection-ui.js"></script>\n<script defer src="js/ui/pkmsvv-save-ui.js"></script>');

// ALL GEN is the FIRST tab and DEFAULT selection. Each banner has independent pity.
patch('js/systems/gacha.js',
 '  const BANNERS = [',
 "  const BANNERS = [\n    {gen:0,name:'ALL GEN',color:['#153c4f','#39316b','#753352']},");
patch('js/systems/gacha.js',
 'function inBanner(p, gen) { return p.gen === gen && !!G.SPRITE_META[p.dex]; }',
 'function inBanner(p, gen) { return (gen === 0 || p.gen === gen) && !!G.SPRITE_META[p.dex]; }');
patch('js/ui/gacha-ui.js',
 '  let gen = 1;',
 '  let gen = 0; // ALL GEN (all nine generations) on every fresh launch');
patch('js/ui/gacha-ui.js',
 't.innerHTML = \`<b>\${b.name}</b><small>Gen \${b.gen}</small>\`;',
 't.innerHTML = \`<b>\${b.name}</b><small>\${b.gen === 0 ? "Tất cả" : "Gen "+b.gen}</small>\`;');
patch('js/ui/gacha-ui.js',
 "    const banner = G.Gacha.BANNERS[gen - 1];",
 "    const banner = G.Gacha.BANNERS.find(b => b.gen === gen);");
patch('js/ui/gacha-ui.js',
 '    const all = G.DEX.filter(p => p.gen === gen);',
 '    const all = G.DEX.filter(p => (gen === 0 || p.gen === gen) && G.SPRITE_META[p.dex]);');
patch('js/ui/gacha-ui.js',
 "    $('banner-title').textContent = banner.name + ' Misterioso';",
 "    $('banner-title').textContent = gen === 0 ? 'Gacha ALL GEN' : banner.name + ' Misterioso';");
patch('js/ui/gacha-ui.js',
 "    $('banner-desc').textContent = \`Los \${all.length} Pokémon de la generación \${gen}. ¡Los legendarios esperan!\`;",
 "    $('banner-desc').textContent = gen === 0 ? 'Quay Pokémon từ cả 9 Gen — có pity riêng cho ALL GEN.' : \`Los \${all.length} Pokémon de la generación \${gen}. ¡Los legendarios esperan!\`;");
patch('js/ui/gacha-ui.js',
 "    G.Progress.checkAch();",
 "    G.Progress.checkAch();\n    G.PKMSVVCollect.checkCollection(G.DB.save);");
patch('js/ui/gacha-ui.js',
 "    G.UI.show('scr-gacha', true);",
 "    gen=0; // default every time, switch to any specific generation via tabs\n    G.UI.show('scr-gacha', true);");

// Run-end stamp checks, after original mission progress, before commit/achievements.
patch('js/game.js',
 "    G.Progress.event('runEnd', { time, level: pl.level, coins: pl.coins, types: pl.mon.types, group: coop });",
 "    G.Progress.event('runEnd', { time, level: pl.level, coins: pl.coins, types: pl.mon.types, group: coop });\n"+
 "    G.PKMSVVCollect.onRunEnd(save,pl.dex,time);");
patch('js/ui/goals-ui.js',
 "      section('Semanales', M.weekly, true);",
 "      section('Semanales', M.weekly, true);\n      G.PKMSVVCollectUI.render(box);");
patch('js/ui/menu.js',
 "    cell.insertAdjacentHTML('beforeend', \`<b>\${own ? p.name : '???'}</b>\${G.UI.stars(p.rarity, 9)}\`);",
 "    cell.insertAdjacentHTML('beforeend', \`<b>\${own ? p.name : '???'}</b>\${G.UI.stars(p.rarity, 9)}\`);\n"+
 "    if (s.pkmStamps && s.pkmStamps[p.dex]) cell.insertAdjacentHTML('beforeend','<span class=\"pkm-stamp-icon\" title=\"Đã có Dấu Ấn\">🏅</span>');");
patch('js/ui/menu.js',
 '        <div style="color:\${G.Gacha.RARITY_COLOR[p.rarity]}">\${G.UI.stars(p.rarity, 24)} \${G.Gacha.RARITY_NAME[p.rarity]}</div>',
 '        <div style="color:\${G.Gacha.RARITY_COLOR[p.rarity]}">\${G.UI.stars(p.rarity, 24)} \${G.Gacha.RARITY_NAME[p.rarity]}</div>\n'+
 '        <p class="pkm-dex-stamp">\${s.pkmStamps && s.pkmStamps[dex] ? "🏅 Đã nhận Dấu Ấn" : own ? "🔒 Dấu Ấn: sống sót 3 phút với Pokémon này" : "🔒 Mở khóa Pokémon để nhận Dấu Ấn"}</p>');
// Save and restore are reachable from the 💾 topbar shortcut only.
// Do not insert a duplicate panel in Settings → Graphics.

fs.appendFileSync(path.join(game,'css','style.css'),String.raw`
/* PKMSVV stamp, collection challenge, and backup additions */
.pkm-collection-goals{margin:12px 0 20px}
.pkm-guide,.pkm-backup{padding:14px;margin:12px 0;border:1px solid #647d9e;border-radius:12px;background:rgba(20,37,69,.75);color:#e8edf8}
.pkm-guide h3,.pkm-backup h3{color:#ffdd7c;margin:0 0 9px}
.pkm-guide p,.pkm-backup p{line-height:1.5;margin:5px 0 10px}
.pkm-task{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;border-top:1px solid #526078;padding:8px 0}
.pkm-stamp-grid{display:flex;gap:6px;flex-wrap:wrap}
.pkm-stamp-grid span{padding:5px 8px;border-radius:9px;border:1px solid #60728d;background:#202b43;font-size:12px}
.pkm-stamp-grid .pkm-medal-on{color:#ffe18b;border-color:#bd9132;background:#4b3e26}
.pkm-dex-stamp{color:#eac777;text-align:center;font-size:12px;margin:5px 0}
.pkm-stamp-icon{font-size:14px;margin:2px}
`+'\n');
console.log('PKMSVV collection: default ALL GEN Gacha, stamps, goals, offline save UI patched');
