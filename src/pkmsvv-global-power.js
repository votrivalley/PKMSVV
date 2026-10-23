/* Pokémon Survivor / Votri Valley — permanent account-wide powerups.
 * Separate from each Pokemon's save.pupg; bought with the same PokéCoins.
 * An old save without globalUpgrades always starts at level zero.
 */
G.GlobalPower = (() => {
  const LIST = [
    {id:'power',    icon:'fist',   vi:'Sức mạnh Toàn Đội',en:'Team Power',          viUnit:'+12% sát thương / cấp', enUnit:'+12% damage / rank',max:10,base:100,grow:1.32},
    {id:'rapid',    icon:'clock',  vi:'Tăng tốc Kỹ Năng', en:'Skill Haste',          viUnit:'-5% hồi chiêu / cấp', enUnit:'-5% cooldown / rank',max:8,base:140,grow:1.36},
    {id:'vital',    icon:'heart',  vi:'Sinh lực',          en:'Vitality',             viUnit:'+25 HP / cấp',enUnit:'+25 HP / rank',max:8,base:80,grow:1.33},
    {id:'guard',    icon:'shield', vi:'Giáp Toàn Đội',     en:'Team Defense',         viUnit:'-4% sát thương nhận / cấp', enUnit:'-4% incoming damage / rank',max:8,base:120,grow:1.39},
    {id:'healing',  icon:'sprout', vi:'Hồi phục',          en:'Regeneration',         viUnit:'+0,5 HP/giây / cấp',enUnit:'+0.5 HP/sec / rank',max:7,base:100,grow:1.40},
    {id:'swift',    icon:'boot',   vi:'Nhanh nhẹn',        en:'Movement Speed',       viUnit:'+5% tốc chạy / cấp',enUnit:'+5% movement speed / rank',max:6,base:100,grow:1.36},
    {id:'reach',    icon:'magnet', vi:'Hút kinh nghiệm',   en:'Pickup Radius',       viUnit:'+15% bán kính nhặt / cấp',enUnit:'+15% pickup radius / rank',max:6,base:70,grow:1.34},
    {id:'area',     icon:'star',   vi:'Vùng Kỹ Năng',      en:'Skill Area',          viUnit:'+10% phạm vi / cấp (tối đa +50%)',enUnit:'+10% skill area / rank (max +50%)',max:5,base:180,grow:1.48},
    {id:'duration', icon:'clock',  vi:'Thời Lượng Kỹ Năng',en:'Skill Duration',      viUnit:'+10% thời gian hiệu lực / cấp (tối đa +50%)',enUnit:'+10% effect duration / rank (max +50%)',max:5,base:160,grow:1.48},
    {id:'learning', icon:'book',  vi:'Ham học hỏi',       en:'Experience',           viUnit:'+10% EXP / cấp',enUnit:'+10% XP / rank',max:8,base:90,grow:1.38},
    {id:'fortune',  icon:'coin',   vi:'Tích lũy',          en:'Gold Bonus',           viUnit:'+12% PokéCoins / cấp',enUnit:'+12% PokéCoins / rank',max:8,base:110,grow:1.46},
    {id:'crit',     icon:'star',   vi:'Đòn chí mạng',      en:'Critical Chance',      viUnit:'+4% tỷ lệ chí mạng / cấp',enUnit:'+4% critical chance / rank',max:6,base:140,grow:1.40},
    {id:'opening',  icon:'cards',  vi:'Khởi đầu áp đảo',   en:'Strong Start',          viUnit:'Bắt đầu với 2 chiêu thay vì 1',enUnit:'Start every run with 2 moves',max:1,base:250,grow:1.00},
    {id:'reroll',   icon:'up',     vi:'Đổi thẻ',           en:'Extra Rerolls',        viUnit:'+1 đổi thẻ lên cấp / trận',enUnit:'+1 level-up reroll / run',max:3,base:180,grow:1.85},
    {id:'revive',   icon:'heart',  vi:'Hồi Sinh Huyền Thoại',en:'Legendary Revival',     viUnit:'Mua 1 lần, tự hồi sinh 1 lần mỗi trận (60% HP, miễn thương 3 giây)',enUnit:'Buy once; revive once per run (60% HP, 3s invulnerability)',max:1,base:50000,grow:1.00}
  ];
  const BY = Object.fromEntries(LIST.map(u => [u.id,u]));
  const rank = (levels,id) => {
    const n = Number(levels && levels[id]);
    return Math.max(0,Math.min(BY[id].max,Number.isFinite(n) ? Math.floor(n) : 0));
  };
  function clean(levels) {
    const result = {};
    for (const u of LIST) {
      const n=rank(levels,u.id);
      if (n) result[u.id]=n;
    }
    return result;
  }
  // v0.8.2: Triple all team upgrade prices except the one-time 50,000-coin revive.
  const PRICE_MULTIPLIER=3;
  function originalCost(id, level) {
    const u=BY[id];
    if(!u) return 0;
    const lv=Math.max(0,Math.min(u.max,Math.floor(Number(level)||0)));
    if(lv>=u.max) return 0;
    return Math.round(u.base*Math.pow(u.grow,lv)/10)*10;
  }
  function cost(id,level) {
    return originalCost(id,level)*(id==='revive'?1:PRICE_MULTIPLIER);
  }
  // Track what was ACTUALLY paid instead of refunding old purchases at the new prices.
  function legacyLedger(levels) {
    const out={};
    for(const u of LIST) {
      let paid=0;
      for(let lv=0;lv<rank(levels,u.id);lv++) paid+=originalCost(u.id,lv);
      if(paid) out[u.id]=paid;
    }
    return out;
  }
  function cleanLedger(ledger,levels) {
    const out={};
    for(const u of LIST) {
      const lv=rank(levels,u.id);
      const maximum=Array.from({length:lv},(_,i)=>cost(u.id,i)).reduce((a,b)=>a+b,0);
      const n=Number(ledger && ledger[u.id]);
      if(lv && Number.isFinite(n) && n>0) out[u.id]=Math.min(maximum,Math.floor(n));
    }
    return out;
  }
  function spent(levels,ledger) {
    // Missing ledger means an old save from v0.8.1; its purchases had old prices.
    const amounts=cleanLedger(ledger===undefined?legacyLedger(levels):ledger,levels);
    return Object.values(amounts).reduce((a,b)=>a+b,0);
  }
  function refundable(save) {
    return save?spent(save.globalUpgrades,save.globalSpent):0;
  }
  function purchase(save,id) {
    if(!save || !BY[id]) return false;
    const levels=clean(save.globalUpgrades), n=rank(levels,id);
    if(n>=BY[id].max) return false;
    const price=cost(id,n);
    if(!Number.isFinite(save.coins)||save.coins<price) return false;
    const ledger=cleanLedger(save.globalSpent===undefined?legacyLedger(levels):save.globalSpent,levels);
    save.coins-=price;
    levels[id]=n+1;
    ledger[id]=(ledger[id]||0)+price;
    save.globalUpgrades=levels;
    save.globalSpent=ledger;
    return true;
  }
  function refundAll(save) {
    if(!save) return 0;
    const amount=refundable(save);
    if(!amount) return 0;
    save.coins=Math.min(Number.MAX_SAFE_INTEGER,Math.max(0,Number(save.coins)||0)+amount);
    save.globalUpgrades={};
    save.globalSpent={};
    return amount;
  }
  function merge(a,b) {
    const out={};
    for(const u of LIST) {
      const n=Math.max(rank(a,u.id),rank(b,u.id));
      if(n) out[u.id]=n;
    }
    return out;
  }
  function combine(per={},levels={}) {
    const L=id=>rank(levels,id);
    return {
      ...per,
      hp:(per.hp||0)+25*L('vital'),
      atkMul:(per.atkMul||1)*(1+0.12*L('power')),
      spdMul:(per.spdMul||1)*(1+0.05*L('swift')),
      cdMul:(per.cdMul||1)*(1-0.05*L('rapid')),
      dmgReduce:Math.min(0.65,(per.dmgReduce||0)+0.04*L('guard')),
      regen:(per.regen||0)+0.5*L('healing'),
      magnetMul:(per.magnetMul||1)*(1+0.15*L('reach')),
      areaMul:(per.areaMul||1)*(1+0.10*L('area')),
      durationMul:(per.durationMul||1)*(1+0.10*L('duration')),
      xpMul:(per.xpMul||1)*(1+0.10*L('learning')),
      coinMul:(per.coinMul||1)*(1+0.12*L('fortune')),
      crit:Math.min(0.75,(per.crit||0)+0.04*L('crit')),
      startMoves:Math.min(2,Math.max(per.startMoves||1,1+L('opening'))),
      revives:L('revive'),
      rerolls:(per.rerolls||0)+L('reroll')
    };
  }
  /** Scale a move ONCE on creation, preserving all later move level-ups.
   *  Does not mutate G.Moves.BY_ID definitions and does not affect pickup range.
   *  Duration controls field/buff life and projectile lifetime; area controls
   *  hitboxes, beam widths, splash radius and orbit radius.
   */
  function applyMove(move,pl) {
    if(!move || !pl || move.pkmGlobalScaled)return move;
    const area=Number(pl.areaMul)||1;
    const duration=Number(pl.durationMul)||1;
    if(!Number.isFinite(area)||!Number.isFinite(duration)||area<=0||duration<=0)return move;
    if(area!==1) for(const prop of ['radius','size','width','range']){
      if(Number.isFinite(move[prop])&&move[prop]>0)move[prop]*=area;
    }
    if(duration!==1) for(const prop of ['dur','life']){
      if(Number.isFinite(move[prop])&&move[prop]>0)move[prop]*=duration;
    }
    move.pkmGlobalScaled=true;
    return move;
  }
  /** A paid permanent unlock provides one automatic revival per run.
   *  Does not trigger if Focus Sash already saved the fatal blow.
   */
  function tryRevive(pl) {
    if(!pl || pl.dead || pl.hp>0 || !(pl.extraRevives>0)) return false;
    pl.extraRevives--;
    pl.revive(0.6); // reset dead state, animation and HP; existing mechanic
    pl.invuln=Math.max(pl.invuln,3);
    return true;
  }
  return {LIST,BY,rank,clean,cost,originalCost,PRICE_MULTIPLIER,legacyLedger,cleanLedger,spent,refundable,purchase,refundAll,merge,combine,applyMove,tryRevive};
})();
