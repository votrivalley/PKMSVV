'use strict';
const {chromium}=require('playwright'),{startServer}=require('../lan-server/server.cjs');
const path=require('node:path'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const s=await startServer({root:path.resolve('dist/lan'),host:'127.0.0.1',port:0});
 const b=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 try{
  const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:'+s.port+'/game/');await p.waitForFunction(()=>G.DB?.save);
  await p.evaluate(async()=>{
   Object.assign(G.DB.save,{partner:251,pkmsvvStorySeen:true,pkmsvvNameChosen:true});G.MenuUI.open();
   await G.Social.createRoom('royale','private');for(let i=0;i<9;i++)await G.LanBus.request('addBot');G.LobbyUI.open();
  });
  await p.click('#lobby-start');await p.waitForFunction(()=>G.Game.state==='playing');
  await p.evaluate(()=>{
   window.__rankPanel=null;window.__healthNames=0;window.__rankSprites=0;window.__insideRank=false;
   const avatarDraw=G.Sprites.Animator.prototype.draw;
   G.Sprites.Animator.prototype.draw=function(...args){if(window.__insideRank)window.__rankSprites++;return avatarDraw.apply(this,args);};
   const raw=G.I18n.rawCanvas,drawHUD=G.HUD.draw;
   G.HUD.draw=function(...args){window.__insideHUD=true;try{return drawHUD.apply(this,args);}finally{window.__insideHUD=false;}};
   G.I18n.rawCanvas=function(ctx,method,text,...args){if(window.__insideHUD&&G.Coop.mates.some(m=>m.name===text))window.__healthNames++;return raw(ctx,method,text,...args);};
   const old=G.Royale.draw;
   G.Royale.draw=function(ctx,w,h,...args){
    const rect=ctx.roundRect;ctx.roundRect=function(x,y,width,height,...r){window.__rankPanel={x,y,width,height};return rect.call(this,x,y,width,height,...r);};
    window.__insideRank=true;
    try{return old.call(this,ctx,w,h,...args);}finally{window.__insideRank=false;ctx.roundRect=rect;}
   };
  });
  fs.mkdirSync('dist/qa',{recursive:true});
  for(const viewport of [{width:538,height:669},{width:844,height:390}]){
   await p.setViewportSize(viewport);await p.waitForTimeout(1000);
   const v=await p.evaluate(()=>({bounds:G.HUD.leftBounds,panel:window.__rankPanel,healthNames:window.__healthNames,rankSprites:window.__rankSprites,mates:G.Coop.mates.filter(m=>m.connected).length,expanded:G.Royale.expanded}));
   assert.equal(v.mates,9);assert.equal(v.healthNames,0);
   assert.equal(v.expanded,false,'Survival starts with one local trainer row');
   assert.ok(v.panel.height<=55,'collapsed HUD never blocks gameplay');
   assert.ok(v.panel.y>=v.bounds.bottom+8);
   assert.ok(v.panel.y+v.panel.height<viewport.height-80,'panel above controls');
   await p.screenshot({path:'dist/qa/survival-hud-collapsed-'+viewport.width+'-1.5.30.png'});
   await p.mouse.click(v.panel.x+v.panel.width-13,v.panel.y+14);
   await p.waitForFunction(()=>G.Royale.expanded===true);
   await p.waitForTimeout(450);
   const full=await p.evaluate(()=>({panel:window.__rankPanel,rankSprites:window.__rankSprites}));
   assert.ok(full.panel.height>100);
   assert.ok(full.panel.y+full.panel.height<viewport.height-80,'expanded list avoids controls');
   assert.ok(full.rankSprites>v.rankSprites+10,'expanded list draws all ten real Pokémon sprites');
   await p.screenshot({path:'dist/qa/survival-hud-expanded-'+viewport.width+'-1.5.30.png'});
   await p.mouse.click(full.panel.x+full.panel.width-13,full.panel.y+14);
   await p.waitForFunction(()=>G.Royale.expanded===false);
   console.log('PASS collapsed and expanded 10-player HUD '+viewport.width+'x'+viewport.height+': '+JSON.stringify({collapsed:v,expanded:full}));
  }
  assert.deepEqual(errors,[]);
 }finally{await b.close();await s.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
