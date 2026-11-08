/* PKMSVV legendary pacing: one 15-minute trial, one 30-minute Judgment.
 * Never interrupt a Region Badge boss; regular modes keep their own rules.
 * Only the host spawns trial bosses. */
G.PKMSVV14=(()=>{
 const checkpoints=[
  {at:900,label:['Thử thách Boss 15 phút!','15-minute Boss Challenge!'],hp:44000,dmg:64,bossRarity:4,legendChance:.30}
 ];
 let done=new Set();
 const L=pair=>G.I18n&&G.I18n.lang==='vi'?pair[0]:pair[1];
 function reset(){done.clear();}
 function spawn(c,who,t){
  if(G.Coop.active&&!G.Coop.isHost)return false;
  const players=Array.isArray(who)?who:[who];
  const anchor=players.find(p=>p&&!p.dead)||G.Game.player;
  if(!anchor)return false;
  const candidates=G.DEX.filter(p=>G.SPRITE_META[p.dex]);
  const legendary=candidates.filter(p=>p.leg||Number(p.rarity)===5);
  const epic=candidates.filter(p=>Number(p.rarity)===4&&!p.leg);
  // Exact 30/70 weighted rarity roll, independent of the number of
  // sprite-backed entries in each tier. No accidental 80% legend from
  // pool sizes; fall back only if a tier is entirely unavailable.
  const wantLegend=Math.random()<(c.legendChance??1);
  const pool=wantLegend?(legendary.length?legendary:epic):
   (epic.length?epic:legendary);
  if(!pool.length)return false;
  const mon=G.U.pick(pool);
  const angle=Math.random()*Math.PI*2,dist=400,center=G.Game.player;
  const x=anchor.x+Math.cos(angle)*dist,y=anchor.y+Math.sin(angle)*dist;
  const def={dex:mon.dex,name:mon.name,hp:c.hp,spd:Math.min(110,70+c.at/70),dmg:c.dmg,
    xp:Math.round(c.hp/10),behavior:mon.types.some(x=>['psychic','electric','ghost','fire'].includes(x))?'ranged':'charger',
    shotDmg:Math.round(c.dmg*0.55),shotCd:2,range:290};
  const e=new G.Enemy(def,x,y,{hp:1,spd:1,dmg:1},true);
  e.pkmsvvMilestone=c.at; // whitelist for legend-only timing rules
  G.EnemyMgr.add(e);
  G.Sprites.preload([mon.dex],5000);
  G.Spawner.say(L(c.label)+' '+mon.name,4,true);
  G.Audio.sfx('boss');
  return true;
 }
 function update(t,who){
  // In Explore the named Region Boss is the sole minute-15 legend; in
  // regular modes the 30-minute Judgment owns the second milestone.
  if(G.PKMSVVQuickRegion?.active||G.Rift?.inArena||G.Judgment?.active||G.EnemyMgr?.bossAlive?.())return;
  for(const c of checkpoints){
    if(done.has(c.at)||t<c.at)continue;
    // Do not spawn two milestone bosses at once.
    if(spawn(c,who,t)){done.add(c.at);break;}
  }
 }
 return {checkpoints,reset,update,get completed(){return [...done];}};
})();
