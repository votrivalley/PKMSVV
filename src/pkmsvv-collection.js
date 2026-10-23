/* PKMSVV v0.9 — collection stamps and assigned-Pokémon challenges. */
G.PKMSVVCollect=(()=>{
  const STAMP_SECONDS=180;
  const DAY_REWARD={coins:500,t1:2};
  const WEEK_REWARD={coins:2500,t10:1};
  const MILESTONES=[10,25,50,100,250,500];
  const milestoneCoins={10:500,25:1250,50:3000,100:7000,250:20000,500:50000};
  const safeObj=o=>o&&typeof o==='object'&&!Array.isArray(o)?o:{};
  const own=(s,d)=>!!safeObj(s.owned)[d];
  const mons=()=>G.DEX.filter(p=>!!G.SPRITE_META[p.dex]);
  const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  const week=()=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  function hash(key){let h=2166136261;for(const char of key){h=Math.imul(h^char.charCodeAt(0),16777619);}return h>>>0;}
  function ordered(s,period){
    return mons().filter(p=>own(s,p.dex)).sort((a,b)=>{
      const pa=Number(s.pused&&s.pused[a.dex])||0,pb=Number(s.pused&&s.pused[b.dex])||0;
      return pa-pb || (hash(period+':'+a.dex)-hash(period+':'+b.dex));
    });
  }
  function ensure(s){
    if(!s)return;
    s.pkmStamps=safeObj(s.pkmStamps);
    s.pkmMilestones=safeObj(s.pkmMilestones);
    s.pkmGenRewards=safeObj(s.pkmGenRewards);
    s.pkmShinyRewards=safeObj(s.pkmShinyRewards);
    const d=today(),w=week(),pool=ordered(s,d);
    if(!s.pkmDaily||s.pkmDaily.day!==d){
      s.pkmDaily={day:d,dex:pool.length?pool[0].dex:null,complete:false,claimed:false};
    }
    if(!s.pkmWeekly||s.pkmWeekly.week!==w){
      const choices=ordered(s,w).slice(0,3).map(p=>p.dex);
      s.pkmWeekly={week:w,dexes:choices,done:[],claimed:false};
    }
  }
  function gift(s,reward){
    s.coins=(Number(s.coins)||0)+(reward.coins||0);
    s.tickets=s.tickets||{t1:0,t10:0};
    s.tickets.t1=(Number(s.tickets.t1)||0)+(reward.t1||0);
    s.tickets.t10=(Number(s.tickets.t10)||0)+(reward.t10||0);
  }
  function stampsCount(s){return Object.keys(s.pkmStamps||{}).filter(id=>+id>0 && G.DEX_BY[id]).length;}
  function checkCollection(s){
    ensure(s);
    let changed=false;const list=mons(), total=list.length;
    for(const goal of [...MILESTONES.filter(n=>n<=total),total]){
      const k=String(goal);if(stampsCount(s)>=goal&&!s.pkmMilestones[k]){
        s.pkmMilestones[k]=Date.now();gift(s,{coins:goal===total?100000:milestoneCoins[goal]||0});changed=true;
      }
    }
    for(let gen=1;gen<=9;gen++){
      const pool=list.filter(p=>p.gen===gen);
      if(!pool.length)continue;
      if(!s.pkmGenRewards[gen]&&pool.every(p=>own(s,p.dex))){
        s.pkmGenRewards[gen]=Date.now();gift(s,{coins:5000,t10:1});changed=true;
      }
      const shinyPool=pool.filter(p=>G.Sprites.hasShiny(p.dex));
      if(shinyPool.length&&!s.pkmShinyRewards[gen]&&shinyPool.every(p=>!!(s.shiny&&s.shiny[p.dex]))){
        s.pkmShinyRewards[gen]=Date.now();gift(s,{coins:10000});changed=true;
      }
    }
    return changed;
  }
  function onRunEnd(s,dex,time){
    if(!s||!Number.isFinite(time)||time<STAMP_SECONDS)return false;
    ensure(s);
    if(!own(s,dex))return false;
    let changed=false;
    if(!s.pkmStamps[dex]){s.pkmStamps[dex]=Date.now();gift(s,{coins:150});changed=true;}
    if(s.pkmDaily.dex===dex&&!s.pkmDaily.complete){s.pkmDaily.complete=true;changed=true;}
    if(s.pkmWeekly.dexes.includes(dex)&&!s.pkmWeekly.done.includes(dex)){
      s.pkmWeekly.done.push(dex);changed=true;
    }
    return checkCollection(s)||changed;
  }
  function claim(s,which){
    ensure(s);
    if(which==='daily'){
      const d=s.pkmDaily;
      if(!d.complete||d.claimed)return false;
      d.claimed=true;gift(s,DAY_REWARD);return true;
    }
    if(which==='weekly'){
      const w=s.pkmWeekly;
      if(w.claimed||!w.dexes.length||w.done.length<w.dexes.length)return false;
      w.claimed=true;gift(s,WEEK_REWARD);return true;
    }
    return false;
  }
  function choose(s,dex){
    if(!own(s,dex))return false;
    s.partner=dex;s.partnerShiny=false;return true;
  }
  return {STAMP_SECONDS,DAY_REWARD,WEEK_REWARD,ensure,ordered,checkCollection,onRunEnd,claim,choose,stampsCount,today,week};
})();