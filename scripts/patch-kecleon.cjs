'use strict';
/* Noncommercial selective port of JPTER78's October 2026 Kecleon gameplay.
 * Votri Valley's pinned upstream base, save economy and existing modes stay intact.
 */
const fs=require('node:fs'),path=require('node:path');
const project=path.join(__dirname,'..'),base=path.join(project,'vendor','pokesurvivor');
function patch(file,from,to){
 const p=path.join(base,file),src=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'),parts=src.split(from);
 if(parts.length!==2)throw Error('Kecleon patch anchor missing/duplicate: '+file+': '+from.slice(0,100));
 fs.writeFileSync(p,parts.join(to),'utf8');
}
function inject(file,anchor,text){patch(file,anchor,anchor+'\n'+text)}
for(const [src,dst] of [
 ['data/natures.js','js/data/natures.js'],
 ['data/abilities.js','js/data/abilities.js'],
 ['data/tms.js','js/data/tms.js'],
 ['data/shop.js','js/data/shop.js'],
 ['data/ability-fx.js','js/data/ability-fx.js'],
 ['systems/mons.js','js/systems/mons.js']]){
 fs.copyFileSync(path.join(project,'src/kecleon/upstream',src),path.join(base,dst));
}
fs.copyFileSync(path.join(project,'src/kecleon/pkmsvv-kecleon-ui.js'),path.join(base,'js/ui/pkmsvv-kecleon-ui.js'));
fs.copyFileSync(path.join(project,'src/kecleon/pkmsvv-ability-text.js'),path.join(base,'js/data/pkmsvv-ability-text.js'));
fs.copyFileSync(path.join(project,'src/kecleon/pkmsvv-kecleon-scene.js'),path.join(base,'js/ui/pkmsvv-kecleon-scene.js'));
// Reuse authentic pixel-art icons from the 2026-10-20 shop contribution.
const iconDefs=fs.readFileSync(path.join(project,'src/kecleon/pkmsvv-kecleon-icon-defs.txt'),'utf8');
patch('js/ui/icons.js','  const UI = {','  const UI = {\n'+iconDefs);
// VI never displays Spanish names; use Pokémon's international Ability names.
patch('js/systems/mons.js',
 "const LANG_I = { es: 0, en: 1,",
 "const LANG_I = { vi: 1, es: 0, en: 1,");
patch('dev.html','<script defer src="js/data/moves.js"></script>',
 '<script defer src="js/data/moves.js"></script>\n'+
 '<script defer src="js/data/natures.js"></script>\n'+
 '<script defer src="js/data/abilities.js"></script>\n'+
 '<script defer src="js/data/tms.js"></script>');
patch('dev.html','<script defer src="js/data/items.js"></script>',
 '<script defer src="js/data/items.js"></script>\n<script defer src="js/data/shop.js"></script>');
patch('dev.html','<script defer src="js/systems/stats.js"></script>',
 '<script defer src="js/systems/stats.js"></script>\n<script defer src="js/systems/mons.js"></script>\n<script defer src="js/data/ability-fx.js"></script>');
patch('dev.html','<script defer src="js/data/ability-fx.js"></script>',
  '<script defer src="js/data/ability-fx.js"></script>\n<script defer src="js/data/pkmsvv-ability-text.js"></script>');
patch('dev.html','<script defer src="js/ui/menu.js"></script>',
 '<script defer src="js/ui/menu.js"></script>\n<script defer src="js/ui/pkmsvv-kecleon-scene.js"></script>\n<script defer src="js/ui/pkmsvv-kecleon-ui.js"></script>');
// Bilingual UI and separate Bag. Do not import original online/co-op shop UI.
patch('dev.html',
 '<button class="menu-item" data-go="gacha">Gacha<small>9 regiones · Pokémon y shinies</small></button>',
 '<button class="menu-item" data-go="gacha">Gacha<small>9 regiones · Pokémon y shinies</small></button>\n'+
 '        <button class="menu-item" data-go="shop" translate="no">Kecleon shop<small>Mint · Capsule · TM</small></button>\n'+
 '        <button class="menu-item" data-go="bag" translate="no">Túi đồ<small>Vật phẩm · TM</small></button>');
const section=String.raw`
<!-- ====== Votri Valley: Kecleon shop + Bag (offline, bilingual) ====== -->
<section id="scr-kecleon" class="scr dim hidden" translate="no">
 <div class="box wide pkmk-box">
  <div class="pkmk-stall" id="pkmk-stall" hidden>
   <canvas class="pkmk-scene" id="pkmk-scene"></canvas>
   <div class="pkmk-sign" id="pkmk-sign"></div>
   <div class="pkmk-bubble hide" id="pkmk-bubble"></div>
  </div>
  <div class="pkmk-inner">
  <div class="row between"><h2 id="pkmk-heading">Cửa hàng Kecleon</h2>
   <button class="btn small ghost" id="pkmk-back">Trở về</button></div>
  <div class="row wrap pkmk-tabs">
   <button class="btn small" id="pkmk-tab-shop">Cửa hàng</button>
   <button class="btn small" id="pkmk-tab-bag">Túi đồ</button>
   <b id="pkmk-balance"></b>
  </div>
  <div id="pkmk-owner"></div><div id="pkmk-list"></div>
  </div>
 </div>
</section>
`;
patch('dev.html','<!-- ====== Gacha ====== -->',section+'\n<!-- ====== Gacha ====== -->');
patch('js/ui/ui.js',"'scr-global-powerups', 'scr-gacha',",
 "'scr-global-powerups', 'scr-kecleon', 'scr-gacha',");
patch('js/game.js',"'scr-global-powerups', 'scr-gacha',",
 "'scr-global-powerups', 'scr-kecleon', 'scr-gacha',");
// Upstream menu binds all main menu [data-go] in one place.
patch('js/ui/menu.js',"global: 'star', gacha:","global: 'star', shop: 'shop', bag: 'bag', gacha:");
patch('js/ui/menu.js',"else if (go === 'global') G.GlobalPowerUI.open();",
 "else if (go === 'global') G.GlobalPowerUI.open();\n        else if (go === 'shop' || go === 'bag') G.KecleonUI.open(go);");
const badge=String.raw`
const shopBtn=document.querySelector('#scr-menu [data-go="shop"]'),
      bagBtn=document.querySelector('#scr-menu [data-go="bag"]');
if(shopBtn)shopBtn.innerHTML='<span class="mi-ico">'+G.Icons.html('shop',26)+'</span><span class="pkmsvv-menu-copy"><span class="pkmsvv-menu-label">'+
  (G.I18n.lang==='vi'?'Kecleon shop':'Kecleon Shop')+'</span><small>'+
  (G.I18n.lang==='vi'?'Bạc hà · Đặc tính · TM':'Mints · Abilities · TMs')+'</small></span>';
if(bagBtn)bagBtn.innerHTML='<span class="mi-ico">'+G.Icons.html('bag',26)+'</span><span class="pkmsvv-menu-copy"><span class="pkmsvv-menu-label">'+
  (G.I18n.lang==='vi'?'Túi đồ':'Bag')+'</span><small>'+
  (G.I18n.lang==='vi'?'Vật phẩm & TM':'Items & TMs')+'</small></span>';
`;
patch('js/ui/menu.js',
 "    const shinies = Object.keys(s.shiny || {}).length;",
badge+"\n    const shinies = Object.keys(s.shiny || {}).length;");
patch('js/ui/menu.js',
 "G.UI.sprite($('dex-big'), dex, { lively: own, spin: own, silhouette: !own, scale: 3, hero: true, shiny: own && viewShiny });",
 "G.UI.sprite($('dex-big'), dex, { lively: own, spin: own, silhouette: !own, scale: 3, hero: true, shiny: own && viewShiny });\n    G.KecleonUI.attachDex(dex,box);");
// Saved progress: new fields are optional and zero-initialized on legacy saves.
patch('js/core/db.js',
 "      tickets: { t1: 0, t10: 0 },",
 "      bag: {}, tms: {}, ptm: {}, pnat: {}, pabil: {},\n      tickets: { t1: 0, t10: 0 },");
patch('js/core/db.js',
 "    s.tickets.t1 = n(s.tickets.t1);",
 String.raw`    for(const key of ['bag','tms']) {
      if(!isObj(s[key]))s[key]={};
      for(const id of Object.keys(s[key])){
        s[key][id]=Math.min(999,n(s[key][id]));
        if(!s[key][id]||(key==='bag'?!G.Shop.ITEMS[id]:!G.Moves.BY_ID[id]))delete s[key][id];
      }
    }
    if(!isObj(s.ptm))s.ptm={};
    for(const d of Object.keys(s.ptm)){
      if(!G.DEX_BY[d]){delete s.ptm[d];continue;}
      s.ptm[d]=Array.isArray(s.ptm[d])?
        [...new Set(s.ptm[d].filter(id=>G.Moves.BY_ID[id]))]:[];
    }
    for(const key of ['pnat','pabil']){
      if(!isObj(s[key]))s[key]={};
      for(const d of Object.keys(s[key])){
        const v=s[key][d];
        if(!G.DEX_BY[d]||!Array.isArray(v)||
          !(key==='pnat'?G.NATURE_BY[v[0]]:Number.isInteger(v[0])&&v[0]>=0&&v[0]<=2)){
            delete s[key][d];continue;
        }
        s[key][d]=[v[0],n(v[1])];
      }
    }
    s.tickets.t1 = n(s.tickets.t1);`);
patch('js/core/db.js',
 "    r.pupgDone = r.pupgDone || older.pupgDone;",
 String.raw`    // Inventory is consumable: newer snapshot wins even if empty.
    // Merging old keys would resurrect spent Mint, Capsule and TMs.
    for(const key of ['bag','tms'])
      if(!isObj(r[key]))r[key]=isObj(older[key])?{...older[key]}:{};
    r.ptm=r.ptm||{};
    for(const d of Object.keys(older.ptm||{}))r.ptm[d]=
      [...new Set((r.ptm[d]||[]).concat(older.ptm[d]||[]))];
    for(const key of ['pnat','pabil']){
      r[key]=r[key]||{};
      for(const d of Object.keys(older[key]||{}))
        if(!r[key][d]||+older[key][d][1]>+r[key][d][1])r[key][d]=older[key][d];
    }
    r.pupgDone = r.pupgDone || older.pupgDone;`);
// Learned TM attacks are included in level-up offers and start-move choices.
patch('js/data/moves.js',
 "  function poolFor(mon) {\n    const ids = new Set(POOL.normal);\n    for (const t of mon.types) for (const id of (POOL[t] || [])) ids.add(id);\n    return [...ids];\n  }",
 String.raw`  function poolFor(mon,natural=false) {
    const ids=new Set(POOL.normal);
    for(const t of mon.types)for(const id of POOL[t]||[])ids.add(id);
    if(!natural && G.Mons && G.Mons.taught)
      for(const id of G.Mons.taught(mon.dex))if(BY_ID[id])ids.add(id);
    return [...ids];
  }`);
// Apply Nature to stats at run start, then set Ability on the player instance.
patch('js/game.js',"const mon = G.DEX_BY[save.partner];",
 "const mon = G.Mons.monFor(save.partner);");
patch('js/game.js',
 "    G.PKMSVVEvo.reset(pl);",
 "    G.PKMSVVEvo.reset(pl);\n    pl.setAbility(G.Mons.abilityOf(mon.dex).id);");
// Optional hooks keep all existing damage, move balance, revival and terrain code.
patch('js/entities/player.js',
 "    this.statsTaken = {};",
 "    this.statsTaken = {};\n    this.abil = null; this.abilId=''; this.sturdyAt=-999;");
patch('js/entities/player.js',
 "  /** Segundos que hay que estar junto a un compañero caído para levantarlo. */",
 String.raw`  setAbility(id){
    this.abilId=id||'';
    this.abil=G.AbilityFX.of(id,this.mon);
    if(this.abil.cdMul)this.cdMul*=this.abil.cdMul;
    if(this.abil.start)this.abil.start(this);
  }
  /** Segundos que hay que estar junto a un compañero caído para levantarlo. */`);
const playerFile=path.join(base,'js/entities/player.js');
let player=fs.readFileSync(playerFile,'utf8');
const start=player.indexOf('  get spd() {'),end=player.indexOf('  get reduction()',start);
if(start<0||end<=start)throw Error('Missing player speed block');
player=player.slice(0,start)+String.raw`  get spd() {
    const ab=this.abil||{},stuck=this.slowT>0&&!ab.steady;
    const s=this.baseSpd*this.spdMul*(1+this.buffs.spd.n*this.buffs.spd.amount)*
      (stuck?0.5:1)*(ab.speed?ab.speed(this):1);
    const w=G.Weather.speedFor(this.mon.types);
    const slow=this.inLiquid&&!ab.steady?(G.World.liquidEffect(this.mon.types).slow||1):1;
    return G.Judgment&&G.Judgment.active?G.Judgment.capSpd(s*slow*w):s*slow*w;
  }
`+player.slice(end);fs.writeFileSync(playerFile,player);
patch('js/entities/player.js',
 "    if (!pure) amount *= G.Stats.taken(this.mon, cat);",
 String.raw`    const ab=this.abil,cls=cat==='physical'?'p':cat==='special'?'s':'';
    if(ab&&!pure){
      if(type&&ab.absorb===type){this.invuln=.3;this.heal(this.maxHp*.03);return;}
      if(ab.dodge&&Math.random()<ab.dodge(this,type,cls)){this.invuln=.3;return;}
      if(ab.inMul)amount*=ab.inMul(this,type,cls);
    }
    if (!pure) amount *= G.Stats.taken(this.mon, cat);`);
patch('js/entities/player.js',
 "    if (this.hp <= 0) {\n      this.hp = 0; this.dead = true;",
 String.raw`    if(this.hp<=0&&ab&&ab.sturdy&&performance.now()-this.sturdyAt>90000){
      this.sturdyAt=performance.now();this.hp=1;this.invuln=1.2;
    }
    if(ab&&ab.hurt&&this.hp>0)ab.hurt(this,type,cls);
    if (this.hp <= 0) {
      this.hp = 0; this.dead = true;`);
patch('js/entities/player.js',"  heal(amount) {\n",
 "  heal(amount) {\n    if(this.abil&&this.abil.healMul)amount*=this.abil.healMul;\n");
patch('js/entities/player.js',
 "    if (this.regen > 0) this.hp = Math.min(this.maxHp, this.hp + this.regen * dt);",
 String.raw`    if (this.regen > 0) this.hp = Math.min(this.maxHp, this.hp + this.regen * dt);
    if(this.abil&&this.abil.tick)this.abil.tick(this,dt);
    if(this.abil&&this.abil.summon&&(!G.Coop.active||G.Coop.isHost)&&
       (this.sumT=(this.sumT||0)-dt)<=0){
       this.sumT=180;if(!G.Weather.current)G.Weather.debugStart(this.abil.summon,60);
    }`);
patch('js/entities/player.js',
 "    this.inLiquid = G.World.isLiquid(this.x, this.y);",
 "    this.inLiquid = !(this.abil&&this.abil.levitate)&&G.World.isLiquid(this.x, this.y);");
patch('js/entities/player.js',"      if (le.dmg) {",
 "      if (le.dmg && !(this.abil&&this.abil.lavaProof)) {");
// Combat: damage multipliers from Ability (regular hit and projectile); status traits.
patch('js/systems/combat.js',
 "  const isCrit = pl => !ghost && pl.critChance > 0 && Math.random() < pl.critChance;",
 String.raw`  const isCrit = pl => !ghost && pl.critChance > 0 && Math.random() < pl.critChance;
  const abilityK=(pl,m,e)=>pl.abil&&pl.abil.out&&m?pl.abil.out(pl,m,e):1;
  const critK=pl=>pl.abil&&pl.abil.critMul||CRIT_MUL;
  const statusK=pl=>!pl.abil?1:pl.abil.sheer?0:pl.abil.serene?2:1;`);
patch('js/systems/combat.js',
 "const k = typeK(m.type, e) * G.Stats.taken(e.mon, m.cat);",
 "const k = typeK(m.type, e) * G.Stats.taken(e.mon, m.cat) * abilityK(pl,m,e);");
patch('js/systems/combat.js',
 "dmg *= k * (crit ? CRIT_MUL : 1);",
 "dmg *= k * (crit ? critK(pl) : 1);");
patch('js/systems/combat.js',
 "    if (!ghost) pl.onDealt(dmg);",
 "    if (!ghost) { pl.onDealt(dmg); if(pl.abil&&pl.abil.hit)pl.abil.hit(pl,e,m); }");
patch('js/systems/combat.js',
 "    if (m.burn) e.applyBurn(m.burn);\n    if (m.poison) e.applyPoison(m.poison);\n    if (m.slow) e.applySlow(m.slow);",
 String.raw`    if(m.burn&&statusK(pl))e.applyBurn(m.burn*statusK(pl));
    if(m.poison&&statusK(pl))e.applyPoison(m.poison*statusK(pl));
    if(m.slow&&statusK(pl))e.applySlow(m.slow*statusK(pl));`);
patch('js/systems/combat.js',
 "const k = (p.mtype ? typeK(p.mtype, e) : 1) * G.Stats.taken(e.mon, p.mcat) * (crit ? CRIT_MUL : 1);",
 "const k = (p.mtype ? typeK(p.mtype, e) : 1) * G.Stats.taken(e.mon, p.mcat) * (crit ? critK(pl) : 1) * abilityK(pl,p.src,e);");
patch('js/systems/combat.js',
 "        pl.onDealt(p.dmg * k);",
 "        pl.onDealt(p.dmg * k);\n        if(pl.abil&&pl.abil.hit)pl.abil.hit(pl,e,p.src);");
patch('js/systems/combat.js',
 "        if (p.burn) e.applyBurn(p.burn);\n        if (p.poison) e.applyPoison(p.poison);\n        if (p.slow) e.applySlow(p.slow);",
 String.raw`        if(p.burn&&statusK(pl))e.applyBurn(p.burn*statusK(pl));
        if(p.poison&&statusK(pl))e.applyPoison(p.poison*statusK(pl));
        if(p.slow&&statusK(pl))e.applySlow(p.slow*statusK(pl));`);
patch('js/systems/combat.js',
 "      pl.hurt(e.dmg, e.atkType, false, e.cat);",
 "      pl.hurt(e.dmg, e.atkType, false, e.cat);\n      if(pl.abil&&pl.abil.contact&&!pl.dead&&!e.dead)pl.abil.contact(pl,e);");
// Shiny/partner UI works independently. Keep approved v1.1 What's New file unchanged.
fs.appendFileSync(path.join(base,'css/style.css'),
  fs.readFileSync(path.join(project,'src/kecleon/pkmsvv-kecleon-theme.css'),'utf8')+'\n');
fs.appendFileSync(path.join(base,'css/style.css'),String.raw`
.pkmk-box{max-width:min(850px,96vw);max-height:91vh;overflow-y:auto;padding:18px}
.pkmk-tabs{gap:9px;align-items:center;margin:12px 0}
#pkmk-balance{margin-left:auto;color:#ffdb69}
.pkmk-partner{background:#192c50;border:1px solid #5673a0;border-radius:9px;padding:10px;margin:12px 0}
.pkmk-partner .field{margin:4px 9px;min-width:150px;max-width:100%}
.pkmk-partner small{display:block;color:#d5e7ff;line-height:1.65}
.pkmk-row{display:flex;align-items:center;gap:12px;border:1px solid #45638f;background:#182a4c;border-radius:9px;padding:10px;margin:7px 0}
.pkmk-icon{font-size:25px;flex:none}.pkmk-row-copy{flex:1;min-width:120px}
.pkmk-row-copy b{display:block}.pkmk-row-copy small{display:block;line-height:1.55;color:#c3d6f4}
.pkmk-row-tail{display:flex;align-items:center;flex-wrap:wrap;justify-content:end;gap:6px}
.pkmk-row-tail .btn{min-height:42px}
.pkmk-choices{display:flex;flex-wrap:wrap;gap:7px;margin:8px 0 12px;padding:10px;border:1px solid #52698c;border-radius:9px}
.pkmk-choices .btn{min-height:42px;white-space:normal}
.pkmk-choices small{display:block;color:#cfe0fc}
.pkmk-dex{padding:10px;border:1px solid #5273a1;border-radius:9px;margin:12px 0;background:#192b48}
.pkmk-dex p{margin:7px 0;line-height:1.45}
@media(max-width:630px){.pkmk-row{flex-wrap:wrap}.pkmk-row-tail{width:100%;justify-content:flex-start}.pkmk-box{padding:12px}}
`+'\n');
fs.appendFileSync(path.join(base,'css','style.css'),
 '\n.pkmk-ability-benefit{color:#bfe7ff;line-height:1.45;white-space:normal;overflow-wrap:anywhere}\n');
console.log('PKMSVV: 2026-10-21 Kecleon systems ported with offline save and bilingual UI');
