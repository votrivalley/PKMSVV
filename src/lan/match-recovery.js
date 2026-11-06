'use strict';
/* LAN/Direct-Wi-Fi Co-op terminal-state recovery.
 * Host replays only the already confirmed match end, never coins, wins,
 * Berry awards, Crown Seals, HP damage or other gameplay events.
 * Guarded by room + actual shared match seed + sender identity.
 */
G.PKMSVVMatchRecovery=(()=>{
 const KEY='pkmsvv-match-terminal-v1',REQUEST='pkmsvv-match-sync-request-v1';
 const REPEAT_MS=1800,MAX_REPEATS=8;
 let session=null,terminal=null,repeat=null,lastRequest=0;
 const room=()=>G.Social?.room;
 const uid=()=>G.Social?.uid;
 const isHost=()=>room()?.host===uid();
 const validMode=m=>['coop','royale','eggrush','berry','berryeasy'].includes(m);
 const humanGuests=()=>room()?.members?.filter(x=>!x.bot&&x.uid!==uid())||[];
 function stop(){
  if(repeat!==null)clearInterval(repeat);
  repeat=null;
 }
 function messageTo(to,data){
  if(!to||!G.LanBus?.send)return false;
  G.LanBus.send(to,data);return true;
 }
 function transmit(){
  if(!terminal||!isHost()||room()?.id!==terminal.room)return false;
  for(const member of humanGuests())messageTo(member.uid,terminal);
  return true;
 }
 function confirmedEnd(){
  if(!session||!session.host||!isHost()||!validMode(session.mode)||room()?.open!==true)return false;
  if(terminal?.room===session.room&&terminal?.seed===session.seed)return false;
  terminal={k:KEY,room:session.room,seed:session.seed,mode:session.mode,
   host:uid(),seq:1,finished:true};
  transmit();
  stop();
  let sent=0;
  repeat=setInterval(()=>{
   if(!terminal||!isHost()||room()?.id!==terminal.room||sent++>=MAX_REPEATS){
    stop();return;
   }
   transmit();
  },REPEAT_MS);
  return true;
 }
 function begin(cfg){
  stop();terminal=null;
  const r=room(),seed=cfg?.seed;
  if(!r||!validMode(cfg?.mode)||!validMode(r.mode)||
    cfg.mode!==r.mode||String(cfg.host)!==String(r.host)||
    seed===null||seed===undefined)return false;
  session={room:String(r.id),seed:String(seed),mode:cfg.mode,
   host:cfg.host===uid(),finished:false,startedWhileClosed:r.open===false};
  lastRequest=0;return true;
 }
 function reconcile(data,from){
  if(!session||session.host||session.finished||!data?.finished||
   from!==sessionHost()||data.host!==from||
   room()?.host!==from||data.room!==session.room||
   data.room!==room()?.id||data.seed!==session.seed||
   data.mode!==session.mode||!validMode(data.mode)||data.k!==KEY)return false;
  // Terminal replay can clean up the Client once only. No local endRun, quit,
  // settlement, Game reward path or Client-side victory calculation.
  session.finished=true;
  G.Social?.setPlaying?.(false);
  G.Coop?.end?.();
  G.Game?.toUI?.();
  if(room()&&room().id===session.room)room().open=true;
  if(G.LobbyUI?.open)G.LobbyUI.open();
  else G.Flow?.goMenu?.();
  return true;
 }
 const sessionHost=()=>room()?.host;
 function receive(from,data){
  if(data?.k===KEY)return reconcile(data,from);
  if(data?.k!==REQUEST||!terminal||!isHost()||from===uid()||
     from===null||!humanGuests().some(m=>m.uid===from)||
     data.room!==terminal.room||data.seed!==terminal.seed||
     data.mode!==terminal.mode)return false;
  // Host answers a request by resending terminal state, never by settling again.
  return messageTo(from,terminal);
 }
 function requestSync(reason='resume'){
  if(!session||session.host||session.finished||!room()||!G.LanBus?.send)return false;
  const at=Date.now();
  if(at-lastRequest<1300)return false;
  lastRequest=at;
  messageTo(sessionHost(),{k:REQUEST,room:session.room,seed:session.seed,
   mode:session.mode,reason:String(reason).slice(0,16)});
  return true;
 }
 function install(){
  if(!G.Coop?.begin||!G.Social?.finishMatch||!G.LanBus?.on)return false;
  const originalBegin=G.Coop.begin;
  G.Coop.begin=function(cfg,...args){
   const out=originalBegin.call(this,cfg,...args);
   begin(cfg);return out;
  };
  const originalFinish=G.Social.finishMatch;
  G.Social.finishMatch=function(...args){
   const out=originalFinish.apply(this,args);
   // Only a successful authoritative Host finish can create a terminal token.
   return Promise.resolve(out).then(result=>{
    confirmedEnd();return result;
   });
  };
  G.LanBus.on(msg=>{
   if(msg?.t==='data'&&msg.data)receive(msg.from,msg.data);
   if(['room-closed','disconnected'].includes(msg?.t)){
    stop();terminal=null;if(session)session.finished=true;
   }
  });
  G.Social?.on?.(what=>{
   const r=room();
   if(what==='room'&&session&&!session.host&&!session.finished&&session.startedWhileClosed&&
    r?.id===session.room&&r?.mode===session.mode&&r?.open===true){
    // Room's authoritative open state is also a durable recovery source.
    // It is never a substitute for a genuine finished match.
    reconcile({k:KEY,room:session.room,seed:session.seed,
     mode:session.mode,host:r.host,finished:true},r.host);
   }
  });
  document.addEventListener?.('visibilitychange',()=>{
   if(!document.hidden)requestSync('visible');
  });
  if(typeof window!=='undefined')
   window.addEventListener?.('pageshow',()=>requestSync('pageshow'));
  return true;
 }
 install();
 return {begin,receive,reconcile,requestSync,transmit,stop,
  get session(){return session?{...session}:null},
  get terminal(){return terminal?{...terminal}:null}};
})();
