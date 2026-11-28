/* Run-local Wisdom. Keep the old XP curve and max three card offers. */
(function(root){
 'use strict';
 const picked=new WeakSet(),WEIGHT=2,MULTIPLIER=1.15;
 function eligible(p){
  if(!p||typeof p!=='object'||p.dead||picked.has(p)||p.statsTaken?.wisdom||!Number.isFinite(p.xpMul)||p.xpMul<=0)return false;
  if(typeof G==='undefined'||G.Arena?.active||G.Royale?.active||G.EggRush?.active||G.PKMSVVChampionArena?.active||G.PKMSVVArenaSolo?.active||G.PKMSVVArenaPvp?.active)return false;
  return G.Coop?.active?G.Social?.room?.mode==='coop':G.PKMSVVQuickRegion?.active===true;
 }
 function apply(p){
  if(!eligible(p))return false;
  picked.add(p);p.xpMul*=MULTIPLIER;p.statsTaken=p.statsTaken||{};p.statsTaken.wisdom=1;return true;
 }
 function card(p){
  if(!eligible(p))return null;
  const en=G.I18n?.lang==='en';
  return {w:WEIGHT,type:'stat',key:'stat:wisdom',icon:'book',color:'#a78bea',tag:en?'RARE · ONCE':'HIẾM · MỘT LẦN',title:en?'Wisdom':'Trí Tuệ',
   desc:en?'+15% experience for the rest of this run.':'+15% kinh nghiệm đến hết trận này.',apply};
 }
 const api={WEIGHT,MULTIPLIER,eligible,apply,card};
 if(typeof G!=='undefined')G.PKMSVVWisdomQA=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis==='object'?globalThis:this);
