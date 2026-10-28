'use strict';
// v1.4: shared gameplay patch. Exact anchors, no save-schema reset.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
const patch=(p,from,to)=>{
 const file=path.join(game,p),src=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 const parts=src.split(from);
 if(parts.length!==2)throw Error('v1.4 source anchor changed: '+p+' '+from.slice(0,100));
 fs.writeFileSync(file,parts.join(to),'utf8');
};
const copy=(file,target)=>fs.copyFileSync(path.join(root,'src','v14',file),path.join(game,target));
copy('judgment.js','js/systems/judgment.js');
copy('orbs.js','js/systems/orbs.js');
copy('milestones.js','js/systems/pkmsvv-v14-milestones.js');
patch('dev.html','<script defer src="js/systems/judgment.js"></script>',
 '<script defer src="js/systems/judgment.js"></script>\n<script defer src="js/systems/orbs.js"></script>\n<script defer src="js/systems/pkmsvv-v14-milestones.js"></script>');
// Arceus as a hittable invincible target, with credit but zero HP damage.
patch('js/entities/enemy.js',
 "    hurt(amount, color = '#fff', dirX = 0, dirY = 0, knock = 0, eff = null) {\n      if (this.dead) return;",
 "    hurt(amount, color = '#fff', dirX = 0, dirY = 0, knock = 0, eff = null) {\n      if (this.dead) return;\n      if (this.arceus) {\n        const n=Math.max(1,Math.round(amount));\n        if(this.remote)G.Coop.hit(this,n,color,dirX,dirY,knock);\n        else {G.Judgment.hitArceus(n);if(G.Coop.isHost)G.Coop.hurtShown(this,n,color);}\n        this.showHurt(n,color,dirX,dirY,eff);return;\n      }");
patch('js/entities/enemy.js',
 "      if (this.remote) { G.Coop.status(this, 't', dur); return; }",
 "      if(this.arceus)return;\n      if (this.remote) { G.Coop.status(this, 't', dur); return; }");
for(const a of [
 ["      if (this.remote) { G.Coop.status(this, 's', factor); return; }",
  "      if(this.arceus)return;\n      if (this.remote) { G.Coop.status(this, 's', factor); return; }"],
 ["      if (this.remote) { G.Coop.status(this, 'b', stacks); return; }",
  "      if(this.arceus)return;\n      if (this.remote) { G.Coop.status(this, 'b', stacks); return; }"],
 ["      if (this.remote) { G.Coop.status(this, 'p', stacks); return; }",
  "      if(this.arceus)return;\n      if (this.remote) { G.Coop.status(this, 'p', stacks); return; }"],
 ["      if (o.shiny) e.makeShiny();",
  "      if (o.shiny) e.makeShiny();\n      if(o.beh==='arceus')G.Judgment.dress(e);"],
 ["      for (const e of list) if (cam.sees(e.x, e.y, 80)) out.push(e);",
  "      for (const e of list) if (!e.arceus && cam.sees(e.x, e.y, 80)) out.push(e);"]
 ])patch('js/entities/enemy.js',a[0],a[1]);
// Host records credit; Aoe can hit but auto-target favors live boss.
patch('js/systems/combat.js',
 "    dmg *= k * (crit ? critK(pl) : 1);\n    e.hurt(dmg,",
 "    dmg *= k * (crit ? critK(pl) : 1) * (e.arceus?G.Judgment.dmgK():1);\n    e.hurt(dmg,");
// Because all SVV skills autocast independently, the selected move should not
// determine who is targeted. Prioritize elite bosses, except Arceus while legend lives.
patch('js/entities/player.js',
 "    const m = this.activeMove();\n    const ranged = !!m && (m.kind === 'projectile' || m.kind === 'beam');",
 "    const m = this.activeMove();\n    const ranged = true; // v1.4: all learned skills auto-cast");
patch('js/entities/player.js',
 "    const boss = all.find(e => e.boss && !e.dead && G.U.dist(this.x, this.y, e.x, e.y) < 330);",
 "    const boss = all.filter(e=>e.boss&&!e.dead&&G.U.dist(this.x,this.y,e.x,e.y)<420)\n      .sort((a,b)=>G.U.dist2(this.x,this.y,a.x,a.y)-G.U.dist2(this.x,this.y,b.x,b.y))[0];");
// Preserve existing targeting patches while ensuring that all auto-cast skills
// prioritize an in-range boss over the nearest normal enemy.
patch('js/entities/player.js',
 "      this.target = tg;\n      if (tg) this.aim = Math.atan2(tg.y - this.y, tg.x - this.x);",
 "      this.target = boss || tg;\n      if (this.target) this.aim = Math.atan2(this.target.y - this.y, this.target.x - this.x);");
// Store a personal damage record in normal Cloud/local save, no new leaderboard writes.
patch('js/core/db.js',
 "groupRuns: 0, bestGroupTime: 0 }",
 "groupRuns: 0, bestGroupTime: 0, arceusDamageBest: 0 }");
patch('js/game.js',
 "    const judge = G.Judgment.summary();\n    if (judge) G.Progress.event('judgeEnd', judge);",
 "    const judge = G.Judgment.summary();\n    if(judge && Number.isFinite(judge.dmg))save.stats.arceusDamageBest=Math.max(save.stats.arceusDamageBest||0,Math.floor(judge.dmg));\n    if (judge) G.Progress.event('judgeEnd', judge);");
// Adapt Judgment score to result UI. Public Web ranking remains disabled.
patch('js/ui/run-ui.js',
 "  function showOver(r, onBack) {",
 "  function showOver(r, onBack) {\n    if(r.judge && r.judge.dmg!=null){\n      const v=G.I18n&&G.I18n.lang==='vi';\n      G.UI.toast((v?'Sát thương Arceus: ':'Arceus damage: ')+r.judge.dmg.toLocaleString(),6000);\n    }");
patch('js/game.js',
 "    G.Judgment.reset();\n    G.Events.reset();",
 "    G.Judgment.reset();\n    G.PKMSVV14.reset();\n    G.Orbs.reset();\n    G.Events.reset();");
// Wait for standard scheduled bosses to clear before adding a midgame challenge.
patch('js/game.js',
 "    else G.Spawner.tickBanner(dt);\n    G.EnemyMgr.update(dt, all);",
 "    else G.Spawner.tickBanner(dt);\n    if(!coop || G.Coop.isHost)G.PKMSVV14.update(time,all);\n    G.Orbs.update(dt,pl);\n    G.EnemyMgr.update(dt, all);");
// Run-only items never enter Cloud Save.
patch('js/game.js',
 "    if (p.kind === 'coin') {",
 "    if(p.kind==='orb'){\n      if(mine)G.Orbs.got(pl,p.value);else G.Orbs.add(who,p.value);\n      return;\n    }\n    if (p.kind === 'coin') {");
patch('js/game.js',
 "    if (G.Input.tap('escape') || G.Input.tap('keyp')) { togglePause(); return; }\n    if (state !== 'playing' || !pl) return;",
 "    if (G.Input.tap('escape') || G.Input.tap('keyp')) { togglePause(); return; }\n    if (state !== 'playing' || !pl) return;\n    for(let i=0;i<4;i++)if(G.Input.tap('digit'+(i+5))||G.Input.tap('numpad'+(i+5)))G.Orbs.use(pl,i);\n    if(G.Input.tap('padx'))G.Orbs.useSelected(pl);\n    if(G.Input.tap('pady'))G.Orbs.next(pl);");
patch('js/game.js',
 "    item(id) { offerItem(id); },",
 "    item(id) { offerItem(id); },\n    orb(id){if(pl && state!=='over')G.Orbs.got(pl,id);},");
// A strict cap prevents late-game hordes from flooding the run with Orbs.
patch('js/entities/pickup.js',
 "  let list = [];\n  const MAX = 420;",
 "  let list = [];\n  let runOrbDrops = 0;\n  const MAX = 420;");
patch('js/entities/pickup.js',
 "  function clear() { list = []; }",
 "  function clear() { list = []; runOrbDrops = 0; }");
// Drops: max 10 per run; boss 45%, ordinary 3%; no drops during Judgment.
patch('js/entities/pickup.js',
 "    item:     { color: '#ffd23f', glow: '#c08a10', r: 9 }",
 "    orb:      { color: '#a6dfff', glow: '#4579a8', r: 9 },\n    item:     { color: '#ffd23f', glow: '#c08a10', r: 9 }");
patch('js/entities/pickup.js',
 "      if (plain) return;\n      push(orb('heal'",
 "      if (plain) return;\n      if(runOrbDrops<10&&Math.random()<0.45){runOrbDrops++;push(orb('orb',x+25,y-10,G.Orbs.roll()));}\n      push(orb('heal'");
patch('js/entities/pickup.js',
 "    if (Math.random() < TICKET_RATE) push(orb('ticket', x + G.U.rand(-6, 6), y, 1));",
 "    if (Math.random() < TICKET_RATE) push(orb('ticket', x + G.U.rand(-6, 6), y, 1));\n    if(runOrbDrops<10&&Math.random()<0.06){runOrbDrops++;push(orb('orb',x,y,G.Orbs.roll()));}");
patch('js/entities/pickup.js',
 "        G.Icons.draw(ctx, p.kind === 'item' ? p.value : ICON[p.kind], p.x - sz / 2, y - sz / 2 - 1, sz);",
 "        if(p.kind==='orb'){\n          ctx.fillStyle=(G.Orbs.BY[p.value]||{}).col||'#a6dfff';\n          ctx.beginPath();ctx.arc(p.x,y,10,0,6.2832);ctx.fill();\n          ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillStyle='#172536';ctx.fillText('✦',p.x,y+5);\n          continue;\n        }\n        G.Icons.draw(ctx, p.kind === 'item' ? p.value : ICON[p.kind], p.x - sz / 2, y - sz / 2 - 1, sz);");
// Orb HUD: four touch slots directly above skills on a wide enough screen.
patch('js/ui/hud.js',
 "    // ---------- vínculo guardado (aún no hay dos movimientos sueltos) ----------",
 "    // v1.4: Mystery Dungeon Orbs are run-only items, mapped to keys 5–8.\n    if (G.Orbs && pl && G.Game.state==='playing'){\n      const bs=38,gap=5,ox=Math.max(6,Math.min(w-4*bs-3*gap-6,w/2-(4*bs+3*gap)/2)),oy=Math.max(6,sy-45);\n      const inv=pl.orbs||[];\n      for(let i=0;i<4;i++){\n        const x=ox+i*(bs+gap),slot=inv[i],data=slot&&G.Orbs.BY[slot.id];\n        roundRect(ctx,x,oy,bs,bs,8);ctx.fillStyle=data?'rgba(38,57,82,.94)':'rgba(7,18,32,.75)';ctx.fill();\n        ctx.lineWidth=1;ctx.strokeStyle=data?data.col:'#53657c';ctx.stroke();\n        ctx.fillStyle=data?data.col:'#8f9fb2';ctx.font=F(700,15);ctx.textAlign='center';\n        ctx.fillText(data?'✦':'·',x+bs/2,oy+20);\n        ctx.font=F(700,9);ctx.fillText(String(i+5),x+8,oy+10);\n        if(slot){ctx.textAlign='right';ctx.fillText('×'+slot.n,x+bs-3,oy+bs-4);}\n        if(slot&&G.Orbs.cd<=0)G.Touch.addButton(x,oy,bs,bs,()=>G.Orbs.use(pl,i),4);\n      }\n    }\n    // ---------- vínculo guardado (aún no hay dos movimientos sueltos) ----------");
// Coop: server-authoritative foe effects and team buffs. Guest reports orb
// consumption; host checks the guest actually holds that Orb.
patch('js/net/coop.js',
 "        case 'lp': picked(from); break;",
 "        case 'ou':{\n          if(typeof ev[1]==='string'&&G.Orbs.onMateUse(m.pl,ev[1],ev[2],ev[3],ev[4]))emit(['ob',ev[1],ev[2],ev[3],ev[4]],from);\n          break;\n        }\n        case 'lp': picked(from); break;");
patch('js/net/coop.js',
 "      case 'ed': G.EnemyMgr.removeRemote(ev[1], true); break;",
 "      case 'ob': if(typeof ev[1]==='string')G.Orbs.nearBuff(ev[1],ev[2],ev[3]); break;\n      case 'ed': G.EnemyMgr.removeRemote(ev[1], true); break;");
patch('js/net/coop.js',
 "    if (p.kind === 'magnet') emit(['mag']);",
 "    if (p.kind === 'magnet') emit(['mag']);\n    if(p.kind==='orb'&&who!==local){const mate=mates.get(who.uid);if(mate)mate.q.push(['orb',p.value]);}");
patch('js/net/coop.js',
 "  function shinyCaught(e) { emit(['sh', e.dex]); }",
 "  function orbUsed(id,x,y,z){\n    if(!active)return;\n    if(host)emit(['ob',id,x,y,z]);\n    else outEv.push(['ou',id,x,y,z]);\n  }\n  function shinyCaught(e) { emit(['sh', e.dex]); }");
patch('js/net/coop.js',
 "    propBroken, collected, shinyCaught, levelStart, localPicked, over, holdStart, holdEnd,",
 "    propBroken, collected, shinyCaught, orbUsed, levelStart, localPicked, over, holdStart, holdEnd,");
patch('js/net/coop.js',
 "      case 'jd': case 'jk': G.Judgment.onEvent(ev); break;",
 "      case 'jd': case 'jk': case 'jb': G.Judgment.onEvent(ev); break;");
patch('js/entities/enemy.js',
 "      if (o.shiny) e.makeShiny();\n      if(o.beh==='arceus')G.Judgment.dress(e);",
 "      if (o.shiny) e.makeShiny();\n      if(o.beh==='arceus')G.Judgment.dress(e);");
// Gacha: 10x10 guarantees, plus regional Shiny Charm derived from owned Dex.
patch('js/systems/gacha.js',
 "    if (n === 10 && use === 't10') return t.t10 >= 1 ? { t1: 0, t10: 1 } : null;",
 "    if (n === 10 && use === 't10') return t.t10 >= 1 ? { t1: 0, t10: 1 } : null;\n    if(n===100&&use==='t10')return t.t10>=10?{t1:0,t10:10}:null;");
patch('js/systems/gacha.js',
 "  function pull(save, n, gen = 1, use = 't1') {\n    const cost = costOf(save, n, use);",
 "  function pull(save, n, gen = 1, use = 't1') {\n    if(n===100){\n      if(!costOf(save,100,use))return null;\n      const all=[];\n      for(let j=0;j<10;j++)all.push(...pull(save,10,gen,use));\n      return all;\n    }\n    const cost = costOf(save, n, use);");
// Read the configured Gacha probability instead of locking the Charm to an old 1/90 rate.
const shinySource=fs.readFileSync(path.join(game,'js','systems','gacha.js'),'utf8').replace(/\r\n/g,'\n');
const shinyLine=shinySource.match(/^  const SHINY_RATE = [^\n]+;$/m)?.[0];
if(!shinyLine)throw Error('v1.4 Gacha rate declaration missing');
patch('js/systems/gacha.js',
 shinyLine,
 shinyLine+"\n  // Shiny Charm: complete one region INCLUDING its legendaries. ALL GEN has no single regional charm.\n  const hasCharm=(save,gen)=>gen>=1&&gen<=9&&G.DEX.filter(p=>p.gen===gen&&G.SPRITE_META[p.dex]).every(p=>!!(save.owned&&save.owned[p.dex]));\n  const shinyRate=(save,gen)=>SHINY_RATE*(hasCharm(save,gen)?2:1);");
patch('js/systems/gacha.js',
 "    const out = [];\n    for (let i = 0; i < n; i++) {",
 "    const out = [];\n    const batchRate=shinyRate(save,gen);\n    for (let i = 0; i < n; i++) {");
patch('js/systems/gacha.js',
 "Math.random() < SHINY_RATE);",
 "Math.random() < batchRate);");
patch('js/systems/gacha.js',
 "    pool, featured, pull }",
 "    pool, featured, pull,hasCharm,shinyRate }");
patch('js/data/moves.js',
 "      cd: 1.4, dmg: 34, count: 2, radius: 54, knock: 80 },",
 "      cd: 1.4, dmg: 24, count: 2, radius: 48, knock: 70 },");
// Gacha UI: additional 100-pull buttons; 100 results saved before animation.
patch('dev.html',
 '          <button id="pull-10b" class="btn gold grow" data-sfx="none">Tirar ×10 · <span id="cost-10b"></span></button>',
 '          <button id="pull-10b" class="btn gold grow" data-sfx="none">Tirar ×10 · <span id="cost-10b"></span></button>\n          <button id="pull-100" class="btn gold grow" data-sfx="none">Gacha ×100 · 🎟️ 100</button>\n          <button id="pull-100b" class="btn gold grow" data-sfx="none">Gacha ×100 · 🎟️×10 10</button>');
patch('js/ui/gacha-ui.js',
 "    $('pull-10b').onclick = () => pull(10, 't10');",
 "    $('pull-10b').onclick = () => pull(10, 't10');\n    $('pull-100').onclick=()=>pull(100,'t1');\n    $('pull-100b').onclick=()=>pull(100,'t10');");
patch('js/ui/gacha-ui.js',
 "    $('pull-10b').disabled = !G.Gacha.costOf(s, 10, 't10');",
 "    $('pull-10b').disabled = !G.Gacha.costOf(s, 10, 't10');\n    $('pull-100').disabled=!G.Gacha.costOf(s,100,'t1');\n    $('pull-100b').disabled=!G.Gacha.costOf(s,100,'t10');\n    const vi=G.I18n&&G.I18n.lang==='vi';\n    const charm=G.Gacha.hasCharm(s,gen);\n    $('pull-100').textContent=(vi?'Gacha ×100 · 100 vé':'Gacha ×100 · 100 tickets');\n    $('pull-100b').textContent=(vi?'Gacha ×100 · 10 vé ×10':'Gacha ×100 · 10 ×10 tickets');\n    const info=$('pkmsvv-v14-charm');\n    if(info)info.textContent=gen===0?(vi?'Shiny Charm: chọn từng Gen để nhận thưởng':'Shiny Charm: choose a region to activate'):\n      (charm?(vi?'✨ Shiny Charm đã mở khóa · tỷ lệ Shiny tăng gấp đôi!':'✨ Shiny Charm unlocked · double Shiny chance!'):\n       (vi?'🔒 Shiny Charm: sưu tập đủ toàn bộ Pokémon Gen '+gen+' (kể cả huyền thoại).':'🔒 Shiny Charm: collect every Gen '+gen+' Pokémon (including legends).'));\n    if(info)info.textContent+=' · '+(G.Gacha.shinyRate(s,gen)*100).toFixed(1).replace('.',vi?',':'.')+'%';");
patch('dev.html',
 '          <p class="sub" id="gacha-owned" style="margin:0"></p>',
 '          <p class="sub" id="gacha-owned" style="margin:0"></p>\n          <p class="sub" id="pkmsvv-v14-charm"></p>');
patch('js/ui/gacha-ui.js',
 "    await G.Slots.play(slot, res);",
 "    // ×100: ten ten-pull batches, each summarized by its highest-ranked pull.\n    const rank=r=>(r.shiny?100:0)+r.rarity*10+(r.isNew?1:0);\n    const bestOfTen=(items)=>items.reduce((a,b)=>rank(b)>rank(a)?b:a);\n    const spins=n===100?Array.from({length:10},(_,k)=>bestOfTen(res.slice(k*10,k*10+10))):res;\n    await G.Slots.play(slot, spins);");
patch('js/ui/gacha-ui.js',
 "    for (const r of res) {",
 "    if(n===100){\n      const news=res.filter(r=>r.isNew).length,shiny=res.filter(r=>r.shiny).length;\n      const refunds=res.reduce((sum,r)=>sum+r.refund,0);\n      const sum=document.createElement('div');sum.className='pkmsvv-v14-pullsum';\n      const vi=G.I18n&&G.I18n.lang==='vi';\n      sum.textContent=vi?('Đã quay 100 lượt · Pokémon mới: '+news+' · Shiny: '+shiny+' · Hoàn xu: '+refunds+' · Hiển thị 20 lượt nổi bật.'):\n        ('100 pulls completed · New: '+news+' · Shiny: '+shiny+' · Refund coins: '+refunds+' · Showing 20 highlights.');\n      out.appendChild(sum);\n    }\n    const shown=n===100?res.slice().sort((a,b)=>rank(b)-rank(a)).slice(0,20):res;\n    for (const r of shown) {");
fs.appendFileSync(path.join(game,'css','style.css'),
 '\n.pkmsvv-v14-pullsum{padding:12px;border:1px solid #c49a44;border-radius:10px;background:#302b40;color:#ffdf91;font-weight:700;grid-column:1/-1;text-align:center;margin:8px 0}\n','utf8');
console.log('PKMSVV v1.4: Judgment Plates/damage, 10/20/30 milestones, Orb tools, autolock, shiny charms and Gacha x100 installed.');
