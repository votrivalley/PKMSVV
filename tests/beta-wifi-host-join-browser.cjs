'use strict';
// Real Chromium regression: old /ai/game/ Cloudflare URL was an empty screen.
// Verify host + join from two independent browser profiles using manual WiFi WebRTC.
const {chromium}=require('playwright'),path=require('node:path');
const assert=require('node:assert/strict');
const {startServer}=require('../lan-server/server.cjs');
(async()=>{
 const remote=String(process.env.PKMSVV_WIFI_REMOTE_URL||'').replace(/\/$/,'');
 const server=remote?null:await startServer({root:path.resolve(__dirname,'../dist/lan'),host:'127.0.0.1',port:0});
 const browser=await chromium.launch({headless:true,...(process.env.PKMSVV_BROWSER?{executablePath:process.env.PKMSVV_BROWSER}:{})});
 const host=await browser.newPage({viewport:{width:1100,height:740}}),guest=await browser.newPage({viewport:{width:1100,height:740}});
 const errs=[];
 for(const [role,p] of [['host',host],['join',guest]])p.on('pageerror',e=>errs.push(role+': '+String(e)));
 const base=remote||('http://127.0.0.1:'+server.port);
 const mode=process.env.PKMSVV_WIFI_TEST_MODE==='fossil_lab'?'fossil_lab':'coop';
 async function prepare(p){
  await p.goto(base+'/game/',{waitUntil:'domcontentloaded',timeout:45000});
  await p.waitForFunction(()=>!!window.G?.DB?.save,{timeout:35000});
  await p.evaluate(()=>{
   Object.assign(G.DB.save,{partner:25,partnerShiny:false,pkmsvvStorySeen:true,pkmsvvNameChosen:true});
   G.DB.commit?.();
  });
 }
 try{
  await prepare(host);
  await prepare(guest);
  await host.goto(base+'/ai/game/?pkmsvvWifi=1&pkmsvvRole=host&pkmsvvMode='+mode,{waitUntil:'domcontentloaded',timeout:45000});
  await host.waitForTimeout(1400);
  console.log('COOP_WEBRTC_HOST_BOOT_PROBE='+JSON.stringify(await host.evaluate(()=>({
   href:location.href,ready:document.readyState,wifi:window.PKMSVV_WIFI,
   standalone:window.PKMSVV_STANDALONE_AI,mode:window.PKMSVV_LOCAL_UI_MODE,
   hasGame:!!window.G,hasBus:!!window.G?.LanBus,hasSocial:!!window.G?.Social,
   room:window.G?.Social?.room||null,
   activeGuide:window.G?.PKMSVVPippiGuide?.current?.kind||null,
   status:document.body?.innerText?.slice(-700)
  }))));
  console.log('COOP_WEBRTC_PAGE_ERRORS='+JSON.stringify(errs));
  await host.evaluate(m=>window.__expectedWifiRoomMode=m,mode);
  await host.waitForFunction(()=>window.PKMSVV_WIFI===true&&G.Social?.room?.mode===window.__expectedWifiRoomMode&&G.Social.room?.isHost,{timeout:35000});
  const hostStatus=await host.evaluate(()=>({ready:!!G.LanBus?.invitation,wifi:window.PKMSVV_WIFI,
   mode:G.Social.room?.mode,members:G.Social.room?.members?.length,
   documentHasGame:!!document.querySelector('#scr-menu'),base:document.querySelector('base')?.href}));
  assert.deepEqual({wifi:hostStatus.wifi,mode:hostStatus.mode,documentHasGame:hostStatus.documentHasGame},
   {wifi:true,mode,documentHasGame:true});
  console.log('COOP_WEBRTC_REAL_HOST_PASS='+JSON.stringify(hostStatus));
  await guest.goto(base+'/ai/game/?pkmsvvWifi=1&pkmsvvRole=join&pkmsvvMode='+mode,{waitUntil:'domcontentloaded',timeout:45000});
  await guest.waitForFunction(()=>window.PKMSVV_WIFI===true&&!!G.LanBus?.answer&&!!window.PKMSVVWifiUI?.join,{timeout:35000});
  await guest.waitForFunction(()=>!!document.querySelector('.pkmsvv-wifi-panel')||!!document.querySelector('#pkmsvv-unified-coop'),{timeout:18000});
  assert.equal(await guest.evaluate(()=>!!document.querySelector('#scr-menu')),true,'Co-op Join must never load an empty page');
  console.log('COOP_WEBRTC_REAL_JOIN_PAGE_PASS');
  // This is not simulated remote gameplay. Exchange real WebRTC SDP between two
  // Chromium pages, following exactly the user's Host / Join manual code path.
  const invitation=await host.evaluate(()=>G.LanBus.invitation());
  assert.match(invitation,/^PKMWIFI1\./);
  const answer=await guest.evaluate(v=>G.LanBus.answer(v),invitation);
  assert.match(answer,/^PKMWIFI1\./);
  await host.evaluate(v=>G.LanBus.accept(v),answer);
  const result=await guest.evaluate(async()=>G.Social.joinRoom(G.LanBus.pendingRoom));
  assert.ok(result?.ok,'Join must return real LAN room success: '+JSON.stringify(result));
  await host.waitForFunction(()=>G.Social?.room?.members?.length>=2,{timeout:12000});
  const room=await host.evaluate(()=>({id:G.Social.room.id,mode:G.Social.room.mode,members:G.Social.room.members.map(m=>m.uid)}));
  assert.equal(room.members.length,2);
  assert.equal(room.mode,mode,'Wi-Fi room mode must never silently fall back to Survival');
  const guestRoom=await guest.evaluate(()=>G.Social.room?.mode);
  assert.equal(guestRoom,mode,'Guest must receive exactly the Host-selected game mode');
  assert.deepEqual(errs,[],'No uncaught host/join runtime errors');
  console.log('COOP_WEBRTC_TWO_REAL_PAGES_JOIN_PASS='+JSON.stringify({room,guestRoom,errors:errs}));
 }finally{await browser.close();await server?.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
