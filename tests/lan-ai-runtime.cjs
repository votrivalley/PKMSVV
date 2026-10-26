'use strict';
const {chromium}=require('playwright');
const {startServer}=require('../lan-server/server.cjs');
const assert=require('node:assert/strict'),path=require('node:path');
async function main(){
 const server=await startServer({root:path.resolve('dist/lan'),host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 try{
  for(const mode of ['coop','royale','eggrush']){
   const context=await browser.newContext();const page=await context.newPage();const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   try{
    await page.goto('http://127.0.0.1:'+server.port+'/game/');
    await page.waitForFunction(()=>G.DB?.save);
    await page.evaluate(async mode=>{
     Object.assign(G.DB.save,{partner:387,starter:387,pkmsvvStorySeen:true,pkmsvvNameChosen:true});
     G.DB.commit();G.MenuUI.open();await G.Social.createRoom(mode,'private');
     for(let i=0;i<3;i++)await G.LanBus.request('addBot',{dex:[25,1,7][i]});
     G.LobbyUI.open();
    },mode);
    await page.click('#lobby-start');await page.waitForFunction(()=>G.Game.state==='playing');
    assert.equal(await page.evaluate(()=>G.Coop.puppets().filter(p=>p.lanBot&&p.moves.length).length),3);
    // Reproduce screenshot: all AI down when the trainer opens the level-2 reward.
    await page.evaluate(()=>{
     for(const pl of G.Coop.puppets()){pl.hp=0;pl.dead=true;}
     G.Game.debugLevelUp();
    });
    await page.waitForFunction(()=>G.Game.state==='levelup');
    await page.waitForTimeout(750);await page.evaluate(()=>G.RunUI.pick(0));
    await page.waitForFunction(()=>G.Game.state!=='levelup',null,{timeout:2500});
    assert.equal(await page.evaluate(()=>G.Coop.puppets().every(p=>p.level===2)),true);
    console.log('PASS '+mode+': all three dead AI complete legal level-2 rewards without hanging');
    // Next level with a live, wounded bot; two remain fallen.
    await page.evaluate(()=>{G.Coop.puppets()[0].revive(.25);G.Game.debugLevelUp();});
    await page.waitForFunction(()=>G.Game.state==='levelup');
    await page.waitForTimeout(750);await page.evaluate(()=>G.RunUI.pick(0));
    await page.waitForFunction(()=>G.Game.state==='playing',null,{timeout:2500});
    const rules=await page.evaluate(()=>G.Coop.puppets().map(p=>({
     hp:p.hp,max:p.maxHp,moves:p.moves.map(m=>({id:m.id,lvl:m.lvl})),
     legal:[...G.Moves.poolFor(p.mon),G.baseStartOf(p.dex)],slots:p.slots.length,cap:p.maxMoves
    })));
    for(const p of rules){assert.ok(p.hp<=p.max);assert.ok(p.slots<=p.cap);for(const m of p.moves)assert.ok(p.legal.includes(m.id));}
    await page.waitForTimeout(1500);
    assert.equal(await page.evaluate(()=>G.Game.state),'playing');
    console.log('PASS '+mode+': next level resumes; learned skills and slots obey actual game offers');
    const combat=await page.evaluate(()=>{
     const pl=G.Coop.puppets()[0],host=G.Game.player;
     // Isolate real damage/cooldown mechanics from random spawns and player input.
     G.EnemyMgr.clear();G.Projectiles.clear();G.Combat.clearFields();G.Hazards.clear();
     let spot;
     for(let y=-600;y<600&&!spot;y+=48)for(let x=-600;x<600;x+=48)
      if(G.World.isFree(x,y,120)){spot={x,y};break;}
     if(!spot)throw Error('No clear combat test area');
     pl.x=spot.x;pl.y=spot.y;pl.revive(1);pl.invuln=0;
     host.x=pl.x+400;host.y=pl.y;
     const health=pl.hp;
     G.Projectiles.spawn({x:pl.x,y:pl.y,friendly:false,dmg:12,r:5});
     G.Combat.resolve(1/60,host,0);
     const hit=pl.hp<health;
     pl.invuln=0;
     G.Hazards.add({kind:'zone',x:pl.x,y:pl.y,r:25,delay:0,dmg:8,type:'normal',color:'#fff'});
     const beforeZone=pl.hp;G.Hazards.update(.01);const zone=pl.hp<beforeZone;
     const enemy=G.EnemyMgr.add(new G.Enemy({dex:19,hp:10000,spd:0,dmg:1,xp:1,behavior:'chase'},pl.x+55,pl.y,{hp:1,spd:1,dmg:1}));
     G.EnemyMgr.rebuildGrid();pl.target=enemy;pl.aim=0;
     for(const m of pl.moves)m.t=0;
     const before=enemy.hp;
     for(let i=0;i<180;i++){
      G.Combat.tick(1/60,pl,i/60);G.Projectiles.update(1/60,host,G.EnemyMgr.all());
      G.Combat.resolve(1/60,host,i/60);G.Combat.updateFields(1/60);
     }
     const dealt=enemy.hp<before;
     let pvp=true;
     if(G.EggRush.active){
      pl.invuln=0;pl.pkmsvvPvpImmune=0;const before=pl.hp;
      G.EggRush.onEvent(['er','hit',pl.uid,10,.35]);pvp=pl.hp===before;
     }
     return{hit,zone,dealt,pvp,moves:pl.moves.map(m=>({id:m.id,kind:m.kind,damage:m.dmg,cooldown:m.t})),before,after:enemy.hp};
    });
    assert.ok(combat.hit&&combat.zone&&combat.dealt&&combat.pvp,JSON.stringify(combat));
    console.log('PASS '+mode+': real PvE damage; Egg Rush ignores PvP damage');
    assert.deepEqual(errors.filter(x=>!x.includes('404')&&!x.includes('Failed to load resource')),[]);
   }finally{await context.close();}
  }
 }finally{await browser.close();await server.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
