/* PKMSVV v1.4 — milestone trial boss encounters at 10 and 20 minutes.
 * Existing Judgment at 30:00 is the third milestone.
 * Only host spawns bosses; enemies synchronize through existing Co-op events.
 */
G.PKMSVV14=(()=>{
 const checkpoints=[
  {at:600,label:['Thử thách 10 phút: Đợt Tinh Anh!','10-minute challenge: Elite Wave!'],hp:7300,dmg:42,bossRarity:4},
  {at:1200,label:['Thử thách 20 phút: Huyền Thoại!','20-minute challenge: Legendary Trial!'],hp:18500,dmg:61,bossRarity:5}
 ];
 let done=new Set();
 const L=pair=>G.I18n&&G.I18n.lang==='vi'?pair[0]:pair[1];
 function reset(){done.clear();}
 function spawn(c,who,t){
  if(G.Coop.active&&!G.Coop.isHost)return false;
  const players=Array.isArray(who)?who:[who];
  const anchor=players.find(p=>p&&!p.dead)||G.Game.player;
  if(!anchor)return false;
  const pool=G.DEX.filter(p=>G.SPRITE_META[p.dex]&&p.rarity>=c.bossRarity&&(c.bossRarity<5||p.leg));
  if(!pool.length)return false;
  const mon=G.U.pick(pool);
  const angle=Math.random()*Math.PI*2,dist=400,center=G.Game.player;
  const x=anchor.x+Math.cos(angle)*dist,y=anchor.y+Math.sin(angle)*dist;
  const def={dex:mon.dex,name:mon.name,hp:c.hp,spd:Math.min(110,70+c.at/70),dmg:c.dmg,
    xp:Math.round(c.hp/10),behavior:mon.types.some(x=>['psychic','electric','ghost','fire'].includes(x))?'ranged':'charger',
    shotDmg:Math.round(c.dmg*0.55),shotCd:2,range:290};
  const e=new G.Enemy(def,x,y,{hp:1,spd:1,dmg:1},true);
  e.pkmsvvMilestone=c.at;
  G.EnemyMgr.add(e);
  G.Sprites.preload([mon.dex],5000);
  G.Spawner.say(L(c.label)+' '+mon.name,4,true);
  G.Audio.sfx('boss');
  return true;
 }
 function update(t,who){
  if(G.Rift.inArena||G.Judgment.active||G.EnemyMgr.bossAlive())return;
  for(const c of checkpoints){
    if(done.has(c.at)||t<c.at)continue;
    // Do not spawn two milestone bosses at once.
    if(spawn(c,who,t)){done.add(c.at);break;}
  }
 }
 return {checkpoints,reset,update,get completed(){return [...done];}};
})();
