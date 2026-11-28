/* Big Update progression QA: cosmetic mastery and permanent recruitment eggs.
 * Native result hook only; no damage/stat buffs, no alteration of support eggs.
 * Old saves are read lazily. Rewards do not forge Pokédex defeat history.
 */
(function(root){
 'use strict';
 const G=root.G;if(!G)return;
 const LEVELS=Object.freeze([0,20,60,150,350,750]),GOAL=500,CAP=6,MIN_TIME=60,MAX_POINTS=1000000;
 const TITLES=[['Tân binh','Rookie'],['Thân quen','Familiar'],['Thành thạo','Skilled'],['Tinh anh','Expert'],['Bậc thầy','Master'],['Huyền thoại','Legend']];
 const runs=new WeakMap();
 const isObj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const own=(s,k)=>Object.prototype.hasOwnProperty.call(s||{},k);
 const copy=x=>JSON.parse(JSON.stringify(x));
 const n=(v,cap=MAX_POINTS)=>Number.isFinite(Number(v))?Math.max(0,Math.min(cap,Math.floor(Number(v)))):0;
 const dexId=v=>Number.isInteger(Number(v))&&Number(v)>0&&Number(v)<=1025?Number(v):null;
 const L=(vi,en)=>G.I18n?.lang==='en'?en:vi;
 const save=()=>G.DB?.save;
 function summary(s,dex){
  const points=n(s?.pkmsvvMastery?.[dex]);let tier=0;
  for(let i=1;i<LEVELS.length;i++)if(points>=LEVELS[i])tier=i;
  return {points,tier,next:LEVELS[tier+1]??null,title:L(...TITLES[tier]),gold:tier>=4,aura:tier>=5};
 }
 function incubator(s){
  const raw=s?.pkmsvvIncubator;
  if(raw===undefined)return {serial:0,active:null,eggs:{},hatched:{}};
  if(!isObj(raw)||!Number.isSafeInteger(raw.serial)||raw.serial<0||!isObj(raw.eggs)||!isObj(raw.hatched)||
   Object.keys(raw.eggs).length>CAP)throw Error('Invalid incubator save; keep original');
  for(const [id,e] of Object.entries(raw.eggs)){
   if(!/^egg-[1-9][0-9]*$/.test(id)||!dexId(e?.dex)||!Number.isInteger(e.kills)||e.kills<0||e.kills>GOAL||own(raw.hatched,id))throw Error('Invalid egg record');
  }
  if(raw.active!==null&&!own(raw.eggs,raw.active))throw Error('Invalid active egg');
  return raw;
 }
 function competitive(){return !!(G.Coop?.active||G.Royale?.active||G.EggRush?.active||G.Arena?.active||
  G.PKMSVVArenaSolo?.active||G.PKMSVVChampionArena?.active||G.PKMSVVArenaPvp?.active||
  G.PKMSVVBerryRescue?.active||G.PKMSVVFossilExpedition?.session);}
 function begin(s,p,coop){
  const region=G.PKMSVVQuickRegion,idx=region?.selectedRegion,dex=dexId(p?.dex);
  if(!s||s!==save()||G.DB?.guest||!p||p.remote||p.lanBot||coop||competitive()||
     region?.active!==true||!Number.isInteger(idx)||idx<0||idx>9||!dex||!s.owned?.[dex])return false;
  let egg=null;try{egg=incubator(s).active;}catch(_){}
  runs.set(p,{profile:s,dex,region:idx,egg,badge:false,settled:false});return true;
 }
 function markBadge(p,boss,region){
  const r=p&&runs.get(p);
  if(!r||r.settled||p!==G.Game?.player||r.region!==region||competitive()||!boss?.dead||
    !Number.isFinite(boss.hp)||boss.hp>0||!boss.pkmsvvExploreBoss&&!boss.def?.pkmsvvExploreBoss)return false;
  r.badge=true;return true;
 }
 function eligibleDex(s,region,inc){
  const reserved=new Set(Object.values(inc.eggs).map(x=>x.dex));
  return (G.PKMSVVQuickRegion?.speciesFor?.(region)||[]).filter(id=>{
   const d=dexId(id),mon=G.DEX_BY?.[d],meta=G.SPRITE_META?.[d];
   return d&&mon&&Number(mon.rarity)>=1&&Number(mon.rarity)<=5&&meta?.a?.Idle&&meta?.a?.Walk&&
    !G.PKMSVVFossils?.isFossilDex?.(d)&&!s.owned?.[d]&&!reserved.has(d)&&
    G.PKMSVVDexDefeats?.unlocked?.(s,d)===true;
  }).sort((a,b)=>a-b);
 }
 function settle(s,p,time,coop){
  const r=p&&runs.get(p);
  if(!r||r.settled||r.profile!==s||s!==save()||G.DB?.guest||coop||p.remote||p.lanBot||
    !Number.isFinite(time)||time<MIN_TIME||competitive())return null;
  r.settled=true;
  const kills=n(p.kills,1000000),bosses=n(p.bosses,100);
  // One species per run, credited to the owned starter even if it evolves.
  const points=Math.min(120,Math.floor(Math.min(time,1800)/60)+Math.floor(kills/100)+Math.min(5,bosses)*5);
  let reward=null,progress=0;
  if(s.pkmsvvMastery===undefined||isObj(s.pkmsvvMastery))
   s.pkmsvvMastery={...(s.pkmsvvMastery||{}),[r.dex]:Math.min(MAX_POINTS,summary(s,r.dex).points+points)};
  try{
   const next=copy(incubator(s));
   if(r.egg&&next.active===r.egg&&next.eggs[r.egg]){
    const e=next.eggs[r.egg],before=e.kills;
    e.kills=Math.min(GOAL,before+kills);progress=e.kills-before;
   }
   if(r.badge&&time>=900&&Object.keys(next.eggs).length<CAP){
    const pool=eligibleDex(s,r.region,next);
    if(pool.length&&Number.isSafeInteger(next.serial+1)){
     const id='egg-'+(++next.serial),dex=pool[Math.floor(Math.random()*pool.length)];
     next.eggs[id]={dex,kills:0,region:r.region,from:'region-boss'};
     reward=id;
    }
   }
   if(reward||progress)s.pkmsvvIncubator=next;
  }catch(err){console.warn('[Big Update incubator] unchanged',err);}
  // Original native endRun owns the save commit, so no extra result commit.
  return {dex:r.dex,points,progress,reward};
 }
 function menuOnly(){return ['ui','over'].includes(G.Game?.state)&&!competitive();}
 function atomic(s,fn){
  if(!s||s!==save()||G.DB?.guest||!menuOnly()||typeof G.DB?.commit!=='function')throw Error(L('Chỉ thao tác ngoài trận trên hồ sơ chính.','Use your main profile outside a run.'));
  const draft=copy(s),before=copy(s),result=fn(draft);
  if(JSON.stringify(draft).length>(G.PKMSVVBox2?.MAX_SAVE_CHARS||1400000))throw Error('Save too large');
  try{Object.assign(s,draft);if(G.DB.commit(true)===false)throw Error('Save failed');return result;}
  catch(e){for(const k of Object.keys(s))delete s[k];Object.assign(s,before);throw e;}
 }
 function activateEgg(id,s=save()){
  return atomic(s,d=>{const i=copy(incubator(d));if(id!==null&&!own(i.eggs,id))throw Error('Unknown egg');
   if(id!==null&&i.eggs[id].kills>=GOAL)throw Error('Egg ready');i.active=id;d.pkmsvvIncubator=i;return id;});
 }
 function hatch(id,s=save()){
  return atomic(s,d=>{
   const i=copy(incubator(d)),e=i.eggs[id];
   if(!e||e.kills!==GOAL)throw Error(L('Trứng chưa sẵn sàng.','Egg is not ready.'));
   const dex=e.dex;
   if(!G.DEX_BY?.[dex]||!G.SPRITE_META?.[dex]?.a?.Idle||!G.SPRITE_META?.[dex]?.a?.Walk||
     G.PKMSVVDexDefeats?.unlocked?.(d,dex)!==true||G.PKMSVVFossils?.isFossilDex?.(dex))
    throw Error('Hatch species unavailable');
   if(!isObj(d.owned))throw Error('Invalid owned collection');
   if(d.pkmsvvBoxSchema!==undefined){
    if(!G.PKMSVVBox?.validBox?.(d)||!G.PKMSVVBox2?.makeOne)throw Error('Invalid PokéBox');
    G.PKMSVVBox2.makeOne(d,{dex,shiny:false});
    if(!G.PKMSVVBox.validBox(d))throw Error('Invalid hatch copy');
   }else if(d.owned[dex])throw Error(L('Pokémon đã có. Hãy sao lưu và chuyển PokéBox để giữ bản sao từ trứng.','Already owned; back up and migrate PokéBox to retain a hatch duplicate.'));
   d.owned[dex]=d.owned[dex]||{at:Date.now(),from:'incubator'};
   delete i.eggs[id];i.hatched[id]=dex;if(i.active===id)i.active=null;d.pkmsvvIncubator=i;
   return {id,dex,shiny:false};
  });
 }
 function applyMasteryPortrait(portrait,dex){
  if(!portrait||!save()?.owned?.[dex])return;
  const m=summary(save(),dex);
  portrait.dataset.masteryTier=String(m.tier);
  if(m.gold){portrait.style.borderColor='#e9bf54';}
  if(m.aura)portrait.style.filter='drop-shadow(0 6px 4px #07151ea8) drop-shadow(0 0 8px #e9bf54)';
 }
 function renderMastery(host,dex){
  if(!host||!save()?.owned?.[dex])return;
  const m=summary(save(),dex),el=document.createElement('section');el.className='pkmsvv-mastery-qa';el.dataset.masteryTier=String(m.tier);
  el.style.cssText='margin:9px 0;padding:12px;border:1px solid #a89661;border-radius:9px;background:#1e3445;color:#f8e8ac;overflow-wrap:anywhere';
  const h=document.createElement('h3');h.textContent=L('Tinh thông','Mastery')+' · '+m.title;h.style.cssText='margin:0 0 6px;color:#ffe28b';
  const p=document.createElement('p');p.textContent=m.next===null?m.points+' · MAX':m.points+' / '+m.next;
  const bar=document.createElement('progress');bar.max=m.next??Math.max(1,m.points);bar.value=m.points;bar.style.cssText='width:100%;accent-color:#e9bf54';bar.setAttribute('aria-label',L('Điểm tinh thông','Mastery points'));
  const note=document.createElement('p');note.textContent=L('Tích lũy khi chơi Khám phá solo. Thường và Shiny dùng chung tiến độ. Không cộng chỉ số.','Earned in solo Explore. Normal and Shiny share progress. No stat bonus.');
  const rewards=document.createElement('div');rewards.style.cssText='display:grid;gap:5px;margin-top:12px';
  const heading=document.createElement('strong');heading.textContent=L('Mốc tinh thông','Mastery milestones');rewards.append(heading);
  for(let tier=1;tier<LEVELS.length;tier++){
   const row=document.createElement('div');row.dataset.masteryReward=String(tier);row.dataset.unlocked=String(m.tier>=tier);
   row.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px;border-top:1px solid #647c8b;color:'+(m.tier>=tier?'#ffe28b':'#d9e4ed');
   const label=document.createElement('span');label.textContent=(m.tier>=tier?'✓ ':'○ ')+L(...TITLES[tier])+(tier===4?' · '+L('Khung vàng','Gold frame'):tier===5?' · '+L('Hào quang chân dung','Portrait glow'):'');
   const value=document.createElement('strong');value.textContent=String(LEVELS[tier]);row.append(label,value);rewards.append(row);
  }
  el.append(h,p,bar,note,rewards);host.append(el);
 }
 function renderIncubator(frame,fromLab){
  if(!frame)return;
  frame.querySelector('[data-recruit-egg-panel]')?.remove();
  if(!fromLab)return;
  const panel=document.createElement('section');panel.dataset.recruitEggPanel='1';panel.style.cssText='padding:14px;margin:10px 0;border:1px solid #a89661;border-radius:9px;background:#213949;color:#fff2cf;overflow-wrap:anywhere';
  const heading=document.createElement('strong');heading.textContent=L('Trứng thu phục · Máy ấp','Recruitment eggs · Incubator');panel.append(heading);
  const info=document.createElement('p');info.textContent=L('Hạ boss vùng 15 phút để nhận trứng Pokémon đã khám phá nhưng chưa sở hữu. Chọn một trứng, hạ 500 quái trong Khám phá rồi nhận Pokémon vĩnh viễn. Khác trứng hỗ trợ trong trận.','Defeat a region badge boss for a discovered but unowned Pokémon egg. Select one, defeat 500 enemies in Explore, then hatch a permanent Pokémon. Separate from run support eggs.');panel.append(info);
  const say=msg=>G.UI?.toast?.(msg,3000);
  try{
   const i=incubator(save()),entries=Object.entries(i.eggs);
   if(!entries.length){const p=document.createElement('small');p.textContent=L('Chưa có trứng thu phục.','No recruitment eggs yet.');panel.append(p);}
   for(const [id,e] of entries){
    const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap;border-top:1px solid #647c8b;padding:8px 0';
    const info=document.createElement('div');info.style.cssText='flex:1 1 150px;min-width:0';
    const label=document.createElement('strong');label.textContent=L('Trứng bí ẩn','Mystery egg')+' · '+e.kills+'/'+GOAL;
    const state=document.createElement('small');state.style.cssText='display:block;color:#f8e8ac';state.textContent=e.kills===GOAL?L('Sẵn sàng nở','Ready to hatch'):i.active===id?L('Đang ấp','Incubating'):L('Chờ ấp','Waiting');
    const bar=document.createElement('progress');bar.max=GOAL;bar.value=e.kills;bar.style.cssText='width:100%;accent-color:#e9bf54';bar.setAttribute('aria-label',L('Tiến độ ấp trứng','Egg progress'));
    info.append(label,state,bar);row.append(info);
    const btn=document.createElement('button');btn.className='btn small';btn.type='button';btn.dataset.recruitEgg=id;
    btn.textContent=e.kills===GOAL?L('Nở trứng','Hatch'):i.active===id?L('Đang ấp','Incubating'):L('Chọn ấp','Incubate');
    btn.disabled=!!G.DB?.guest||!menuOnly()||(i.active===id&&e.kills<GOAL);
    btn.onclick=()=>{try{if(e.kills===GOAL){const r=hatch(id);say(L('Đã nhận ','Received ')+(G.DEX_BY?.[r.dex]?.name||r.dex));}else activateEgg(id);renderIncubator(frame,true);}catch(err){say(String(err.message||err));}};
    row.append(btn);panel.append(row);
   }
   const count=document.createElement('small');count.textContent=entries.length+'/'+CAP+' · '+L('Đã nở: ','Hatched: ')+Object.keys(i.hatched).length;panel.append(count);
  }catch(err){const note=document.createElement('small');note.textContent=L('Dữ liệu máy ấp không hợp lệ; không ghi đè save.','Invalid incubator data; save preserved.');panel.append(note);}
  frame.append(panel);
 }
 G.PKMSVVBigUpdateQA=Object.freeze({LEVELS,GOAL,CAP,summary,incubator,begin,markBadge,settle,activateEgg,hatch,applyMasteryPortrait,renderMastery,renderIncubator});
})(typeof globalThis==='object'?globalThis:this);
