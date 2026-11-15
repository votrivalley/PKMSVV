/* PKMSVV: in-run Pokemon evolution; noncommercial offline addon.
 * Rules generated from PokeAPI species/evolution tables.
 * Source game: JPTER78/pokesurvivor (PolyForm Noncommercial).
 */
G.PKMSVVEvo = (() => {
  const RULES = (G.PKMSVV_EVOLUTION_DATA && G.PKMSVV_EVOLUTION_DATA.rules) || [];
  const BY_FROM = new Map();
  for (const r of RULES) {
    if (!BY_FROM.has(r.from)) BY_FROM.set(r.from, []);
    BY_FROM.get(r.from).push(r);
  }
  const HP_FACTOR = __PKMSVV_HP_FACTOR__;
  const BIOMES = ['Rừng', 'Hang pha lê', 'Núi lửa'];
  const DAY_SPAN = 240; // 4 minutes day, 4 minutes night, repeated within a run
  // Eevee: one optional, level-preserving conversion of a non-evolved Normal attack.
  // The rest of the existing moves, skills, buffs and run levels are untouched.
  const EEVEE_STONES = {
    'water-stone':'Đá Nước', 'thunder-stone':'Đá Sét',
    'fire-stone':'Đá Lửa', 'leaf-stone':'Đá Lá', 'ice-stone':'Đá Băng'
  };
  const EEVEE_SIGNATURE = {
    134:'water-gun', 135:'thunder-shock', 136:'ember',
    196:'confusion', 197:'bite', 470:'vine-whip',
    471:'ice-beam', 700:'fairy-wind'
  };
  const isSupported = r => !!r && !!G.DEX_BY[r.to] && !!G.SPRITE_META[r.to] && r.special !== 'shedinja';

  const S = id => (G.DEX_BY[id] && G.DEX_BY[id].name) || ('#' + id);
  const nice = s => (s || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const daytime = t => Math.floor(t / DAY_SPAN) % 2 === 0 ? 'day' : 'night';
  const locationBiome = r => (r.location ? r.location.length : r.to) % 3;

  function reset(pl) {
    pl.pkmEvoShards = 0;
    pl.pkmEvoBossSeen = pl.bosses;
    pl.pkmEvoSteps = 0;
    pl.pkmEvoCasts = 0;
    pl.pkmEvoByMove = {};
    pl.pkmEvoByType = {};
    pl.pkmEvoDamage = 0;
    pl.pkmEvoLastX = pl.x; pl.pkmEvoLastY = pl.y;
    pl.pkmEvoSkipLevel = -1;
    pl.pkmEvoHistory = [];
    pl.pkmEvoFromMon = null;
    pl.pkmEvoSwapChoices = null;
    pl.pkmEvoLiveLevelSeen = 0;
  }
  function onCast(pl, m) {
    if (!m || pl.remote) return;
    pl.pkmEvoCasts = (pl.pkmEvoCasts || 0) + 1;
    pl.pkmEvoByMove = pl.pkmEvoByMove || {};
    pl.pkmEvoByType = pl.pkmEvoByType || {};
    pl.pkmEvoByMove[m.id] = (pl.pkmEvoByMove[m.id] || 0) + 1;
    pl.pkmEvoByType[m.type] = (pl.pkmEvoByType[m.type] || 0) + 1;
  }
  function onHurt(pl, d) { if (!pl.remote) pl.pkmEvoDamage = (pl.pkmEvoDamage || 0) + Math.max(0, d); }
  function tick(pl, t) {
    if (!pl || pl.dead) return;
    const x = pl.x, y = pl.y;
    if (Number.isFinite(pl.pkmEvoLastX) && Number.isFinite(pl.pkmEvoLastY)) {
      const dist = Math.hypot(x - pl.pkmEvoLastX, y - pl.pkmEvoLastY);
      if (dist < 80) pl.pkmEvoSteps += dist / 24;
    }
    pl.pkmEvoLastX = x; pl.pkmEvoLastY = y;
    if (pl.bosses > pl.pkmEvoBossSeen) {
      const n = pl.bosses - pl.pkmEvoBossSeen;
      pl.pkmEvoShards += n;
      G.Spawner.say('PKMSVV: +' + n + ' Mảnh Tiến Hóa! Mở khóa đá và trao đổi.', 3, true);
    }
    pl.pkmEvoBossSeen = pl.bosses;
  }
  function friendship(pl, t) {
    return Math.min(255, Math.floor(70 + (pl.level - 1) * 5 + t / 8));
  }
  function isItemEvolution(r) {
    return r.trigger === '2' || r.trigger === '3' || !!r.item || !!r.held;
  }
  function requirement(r) {
    const a = [];
    if (r.level) a.push('Lv. ' + r.level);
    if (r.item) a.push((EEVEE_STONES[r.item] || 'vật phẩm ' + nice(r.item)) + ' (1 Mảnh)');
    if (r.trigger === '2') a.push('Dây Liên Kết (1 Mảnh)');
    if (r.held) a.push('vật phẩm ' + nice(r.held) + ' (1 Mảnh)');
    if (r.friendship) a.push('Thân thiết ' + r.friendship);
    if (r.beauty || r.affection) a.push('gắn bó đặc biệt');
    if (r.time) a.push(r.time === 'night' ? 'ban đêm' : r.time === 'day' ? 'ban ngày' : r.time);
    if (r.knownType) a.push('chiêu hệ ' + nice(r.knownType) + ' hoặc 30 đòn nếu không học được');
    if (r.knownMove) a.push('học ' + nice(r.knownMove) + ' / 20 đòn thay thế');
    if (r.usedMove) a.push('dùng ' + nice(r.usedMove) + ' ' + (r.moveCount || 20) + ' lần / đòn thay thế');
    if (r.steps) a.push('di chuyển ' + r.steps + ' bước');
    if (r.damage) a.push('chịu ' + r.damage + ' sát thương');
    if (r.location) a.push('địa hình ' + BIOMES[locationBiome(r)] + ' (quy đổi)');
    if (r.rock) a.push('Hang pha lê');
    if (r.rain) a.push('đang mưa');
    if (r.flip) a.push('đảo chiều PC');
    if (r.multiplayer) a.push('thắng ít nhất 1 boss (thay multiplayer)');
    if (r.trigger === '15') a.push('thắng 3 boss (thay thử thách Kingambit)');
    if (r.candy) a.push('thắng 4 boss (thay ' + r.candy + ' Kẹo Meltan)');
    if (r.coins) a.push('tiêu ' + r.coins + ' Pokécoins (thay xu Gimmighoul)');
    if (r.party || r.partyType || r.tradeSpecies) a.push('thắng boss (thay đồng đội)');
    if (r.expression || r.nature || r.gender || r.stat != null) a.push('chọn nhánh/biến thể (quy đổi)');
    if (r.trigger === '5') a.push('xoay tại chỗ (quy đổi)');
    if (!a.length) a.push('thử thách đặc biệt: thắng 1 boss');
    return a.join(' · ');
  }
  function eligible(pl, t, r) {
    if (!pl || !r || pl.dex !== r.from || !G.DEX_BY[r.to] || !G.SPRITE_META[r.to] || r.special === 'shedinja') return false;
    if (r.level && pl.level < r.level) return false;
    if (isItemEvolution(r) && (pl.pkmEvoShards || 0) < 1) return false;
    if (r.friendship && friendship(pl, t) < r.friendship) return false;
    if ((r.beauty || r.affection) && friendship(pl, t) < 185) return false;
    if (r.time && r.time !== daytime(t) && !(r.time === 'dusk' && Math.floor(t) % DAY_SPAN < 30 && daytime(t) === 'night')) return false;
    if (r.knownType && !pl.moves.some(m => m.type === r.knownType)) {
      // Some Pokedex evolutions require a move type the source game cannot teach.
      // Only those impossible pools have a reproducible 30-cast solo alternative.
      const pool = G.Moves.poolFor ? G.Moves.poolFor(pl.mon) : [];
      const exists = pool.some(id => G.Moves.BY_ID[id] && G.Moves.BY_ID[id].type === r.knownType);
      if (exists || (pl.pkmEvoCasts || 0) < 30) return false;
    }
    if (r.knownMove && !(pl.hasMove && pl.hasMove(r.knownMove)) && (pl.pkmEvoCasts || 0) < 20) return false;
    if (r.usedMove) {
      const actual = G.Moves.BY_ID[r.usedMove];
      const count = actual ? ((pl.pkmEvoByMove || {})[r.usedMove] || 0) : (pl.pkmEvoCasts || 0);
      if (count < (r.moveCount || 20)) return false;
    }
    if (r.steps && (pl.pkmEvoSteps || 0) < r.steps) return false;
    if (r.damage && (pl.pkmEvoDamage || 0) < r.damage) return false;
    if (r.rain && (!G.Weather.current || G.Weather.current.kind !== 'rain')) return false;
    if (r.rock && G.World.biome % 3 !== 1) return false;
    if (r.location && G.World.biome % 3 !== locationBiome(r)) return false;
    if (r.multiplayer && (pl.bosses || 0) < 1) return false;
    if (r.trigger === '15' && (pl.bosses || 0) < 3) return false;
    if (r.candy && (pl.bosses || 0) < 4) return false;
    if (r.coins && (!G.DB || !G.DB.save || (G.DB.save.coins || 0) < r.coins)) return false;
    if ((r.party || r.partyType || r.tradeSpecies) && (pl.bosses || 0) < 1) return false;
    if (r.trigger === '5' && (pl.bosses || 0) < 1) return false;
    if (!r.level && !isItemEvolution(r) && !r.friendship && !r.beauty && !r.affection &&
        !r.knownMove && !r.knownType && !r.usedMove && !r.steps && !r.damage &&
        !r.rain && !r.rock && !r.location && !r.multiplayer && !r.party &&
        !r.partyType && !r.tradeSpecies && !r.candy && !r.coins && r.trigger !== '5' && (pl.bosses || 0) < 1) return false;
    return true;
  }
  function conversionCandidate(pl, toDex) {
    const signature = EEVEE_SIGNATURE[toDex], def = G.Moves && G.Moves.BY_ID && G.Moves.BY_ID[signature];
    if (!signature || !def || !pl.moves || pl.moves.some(m => m.id === signature)) return null;
    const sources = pl.moves.filter(m => m.type === 'normal' && m.kind !== 'buff' && !m.evolved);
    if (!sources.length) return null;
    // Transform the most-invested non-evolved Normal attack, keeping every other move.
    sources.sort((a,b) => (b.lvl||1) - (a.lvl||1));
    return {from:sources[0],to:signature};
  }
  function convertNormal(pl,toDex) {
    const choice = conversionCandidate(pl,toDex);
    if (!choice || !G.Moves.instance) return null;
    const old = choice.from, def=G.Moves.BY_ID[choice.to];
    const max = Math.max(1, def.maxLvl || 1);
    const level = Math.max(1,Math.min(max,old.lvl||1));
    const upgraded = G.Moves.instance(choice.to,level);
    // After Eevee transforms a move, keep its account-wide area/duration buffs.
    if(G.GlobalPower && G.GlobalPower.applyMove) G.GlobalPower.applyMove(upgraded,pl);
    upgraded.since = old.since;
    upgraded.t = old.cd > 0 && upgraded.cd > 0
      ? Math.max(0,Math.min(upgraded.cd,(old.t||0)/old.cd*upgraded.cd)) : 0;
    const idx=pl.moves.indexOf(old);
    if(idx<0) return null;
    pl.moves[idx]=upgraded;
    // Preserve the ORIGINAL slot/bond group instead of adding a new slot.
    for(const group of pl.slots||[]) {
      const n=group.indexOf(old);
      if(n!==-1)group[n]=upgraded;
    }
    if(pl.bind && pl.bind[old.id] != null && pl.bind[upgraded.id] == null) {
      pl.bind[upgraded.id]=pl.bind[old.id];
    }
    return {from:old.id,to:upgraded.id,lvl:upgraded.lvl};
  }
  // All evolutions may optionally exchange exactly ONE move for a move in
  // the evolved species' natural pool. Preserve the old move's upgrade level,
  // slot, cooldown proportion and existing global upgrades. No save mutation.
  function skillSwapOptions(pl){
    if(!pl?.mon||!Array.isArray(pl.moves)||typeof G.Moves?.poolFor!=='function')return [];
    const learned=new Set(pl.moves.map(m=>m.id));
    const ownTypes=new Set(pl.mon?.types||[]);
    const pool=G.Moves.poolFor(pl.mon)||[];
    return [...new Set(pool.map(x=>typeof x==='string'?x:x?.id).filter(Boolean))]
      .filter(id=>!learned.has(id)&&G.Moves?.BY_ID?.[id])
      .sort((a,b)=>Number(ownTypes.has(G.Moves.BY_ID[b].type))-Number(ownTypes.has(G.Moves.BY_ID[a].type))||
        a.localeCompare(b));
  }
  // One fixed random three-card draw per evolution; newly learned species-only
  // moves are drawn first. Never reroll by switching which old skill is selected.
  function skillSwapChoices(pl,random=Math.random){
    if(!pl?.pkmEvoSwapAvailable)return [];
    if(Array.isArray(pl.pkmEvoSwapChoices))return pl.pkmEvoSwapChoices.slice();
    const options=skillSwapOptions(pl);
    const oldPool=new Set((G.Moves?.poolFor?.(pl.pkmEvoFromMon)||[])
      .map(x=>typeof x==='string'?x:x?.id).filter(Boolean));
    const exclusive=options.filter(id=>!oldPool.has(id));
    const regular=options.filter(id=>oldPool.has(id));
    const shuffled=a=>{
      const b=a.slice();
      for(let i=b.length-1;i>0;i--){
        const roll=Number(random());
        const j=Math.max(0,Math.min(i,Math.floor((Number.isFinite(roll)?roll:0)* (i+1))));
        [b[i],b[j]]=[b[j],b[i]];
      }
      return b;
    };
    const chosen=shuffled(exclusive).slice(0,3);
    chosen.push(...shuffled(regular).slice(0,3-chosen.length));
    pl.pkmEvoSwapChoices=chosen;
    return chosen.slice();
  }
  function swapSkill(pl,fromId,toId){
    if(!pl||!pl.pkmEvoSwapAvailable||!Array.isArray(pl.moves)||!(Array.isArray(pl.pkmEvoSwapChoices)?pl.pkmEvoSwapChoices:skillSwapOptions(pl)).includes(toId)||typeof G.Moves?.instance!=='function')return false;
    const idx=pl.moves.findIndex(m=>m.id===fromId);
    if(idx<0)return false;
    const old=pl.moves[idx],def=G.Moves.BY_ID[toId];
    const rank=Math.max(1,Math.min(Number(def.maxLvl)||1,Number(old.lvl)||1));
    const next=G.Moves.instance(toId,rank);
    if(!next)return false;
    if(G.GlobalPower?.applyMove)G.GlobalPower.applyMove(next,pl);
    next.since=old.since;
    next.t=Number(old.cd)>0&&Number(next.cd)>0?
      Math.max(0,Math.min(next.cd,(Number(old.t)||0)/old.cd*next.cd)):0;
    pl.moves[idx]=next;
    for(const group of pl.slots||[]){
      const at=group.indexOf(old);if(at>=0)group[at]=next;
    }
    if(pl.bind&&pl.bind[fromId]!==undefined&&pl.bind[toId]===undefined)
      pl.bind[toId]=pl.bind[fromId];
    pl.pkmEvoSwapAvailable=false;
    pl.pkmEvoSwapChoices=null;
    return {from:fromId,to:toId,lvl:rank};
  }
  function liveChoiceMode(){
    return !!(G.Royale?.active||G.EggRush?.active||G.PKMSVVArenaSolo?.active||
      G.PKMSVVChampionArena?.active||G.PKMSVVArenaPvp?.active);
  }
  function showSkillSwap(pl,done){
    const options=skillSwapChoices(pl);
    if(!options.length||!pl.moves?.length){pl.pkmEvoSwapAvailable=false;done?.();return;}
    const modal=document.createElement('div');
    modal.className='scr pkmsvv-evo pkmsvv-evo-skill pkmsvv-evo-live';
    modal.setAttribute('role','region');
    modal.setAttribute('aria-label',G.I18n?.lang==='en'?
      'Live evolution move selection':'Đổi kỹ năng tiến hóa trong trận');
    const panel=document.createElement('div');panel.className='pkmsvv-evo-panel';
    modal.appendChild(panel);
    const title=document.createElement('h2');
    title.textContent=G.I18n?.lang==='en'?'✨ EVOLUTION · MOVE SWAP':'✨ TIẾN HÓA · ĐỔI KỸ NĂNG';
    const desc=document.createElement('p');desc.className='pkmsvv-evo-live-note';
    desc.textContent=G.I18n?.lang==='en'?
      'Choose a current move while still moving. D-pad / arrows to select, A / Enter to confirm.':
      'Vừa di chuyển vừa chọn chiêu đang có. D-pad / phím mũi tên để chọn, A / Enter xác nhận.';
    const cards=document.createElement('div');cards.className='pkmsvv-evo-live-cards';
    panel.append(title,desc,cards);
    let finished=false;
    const finish=()=>{if(finished)return;finished=true;modal.remove();done?.();};
    const skip=document.createElement('button');skip.type='button';
    skip.className='pkmsvv-evo-skip';
    skip.setAttribute('data-back','');
    skip.textContent=G.I18n?.lang==='en'?'Keep current moves':'Giữ nguyên kỹ năng';
    skip.onclick=finish;
    panel.append(skip);
    const name=id=>{
      const d=G.Moves?.BY_ID?.[id],raw=d?.name;
      return typeof G.T==='function'&&raw?String(G.T(raw,'move')):Array.isArray(raw)?
        String(raw[G.I18n?.lang==='en'?1:0]||raw[0]):String(raw||id);
    };
    const focusFirst=()=>{
      if(G.PKMSVVModalNavQA?.first){
        if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>G.PKMSVVModalNavQA.first(modal));
        else G.PKMSVVModalNavQA.first(modal);
      }else cards.querySelector('button')?.focus?.({preventScroll:true});
    };
    function drawChoices(entries,onChoose,stage){
      cards.replaceChildren();
      cards.dataset.stage=stage;
      for(const [i,[id,level]] of entries.entries()){
        const btn=document.createElement('button');btn.type='button';
        btn.className='pkmsvv-evo-option pkmsvv-evo-live-card';
        btn.setAttribute('data-evo-choice',String(i+1));
        const label=document.createElement('span');label.className='pkmsvv-evo-live-label';
        label.textContent=name(id)+(level?' · Lv. '+level:'');
        const number=document.createElement('kbd');number.textContent=String(i+1);
        const icon=document.createElement('span');icon.className='pkmsvv-evo-live-icon';
        if(typeof G.Icons?.html==='function'){
          const html=G.Icons.html('move:'+id,32);
          if(typeof html==='string')icon.innerHTML=html;
        }
        btn.append(number,icon,label);
        btn.onclick=()=>onChoose(id);
        cards.append(btn);
      }
      focusFirst();
    }
    drawChoices(pl.moves.map(m=>[m.id,m.lvl||1]),oldId=>{
      desc.textContent=(G.I18n?.lang==='en'?'Replace ':'Thay ')+name(oldId)+
        (G.I18n?.lang==='en'?' with one of these 3 evolved moves:':' bằng 1 trong 3 kỹ năng tiến hóa:');
      drawChoices(options.map(id=>[id,null]),newId=>{
        const receipt=swapSkill(pl,oldId,newId);
        if(receipt){
          const history=pl.pkmEvoHistory?.at(-1);
          if(history)history.skillSwap=receipt;
          finish();
        }
      },'replacement');
    },'current');
    document.body.appendChild(modal);
    focusFirst();
  }

  function evolve(pl, r, options = {}) {
    if (!pl || !r || pl.dex !== r.from || !G.DEX_BY[r.to] || !G.SPRITE_META[r.to]) return false;
    const before = pl.mon, after = G.DEX_BY[r.to];
    const eeveeChoice = pl.dex === 133 && options.convertNormal !== false;
    if (isItemEvolution(r)) {
      if (!pl.pkmEvoShards) return false;
      pl.pkmEvoShards--;
    }
    if (r.coins) {
      if (!G.DB || !G.DB.save || G.DB.save.coins < r.coins) return false;
      G.DB.save.coins -= r.coins;
      G.DB.commit();
    }
    const fraction = pl.maxHp > 0 ? pl.hp / pl.maxHp : 1;
    pl.mon = after; pl.dex = after.dex;
    pl.baseAtk = after.atk; pl.baseSpd = after.spd;
    pl.maxHp = Math.max(1, Math.round(pl.maxHp + (after.hp - before.hp) * HP_FACTOR));
    pl.hp = Math.max(1, Math.min(pl.maxHp, fraction * pl.maxHp));
    pl.scale = G.Sprites.playerScale(after.dex);
    pl.r = G.Sprites.playerRadius(after.dex);
    pl.bodyH = G.Sprites.bodyHeight(after.dex, pl.scale);
    const dir = pl.anim.dir;
    pl.anim = new G.Sprites.Animator(after.dex, pl.scale, pl.shiny && G.Sprites.hasShiny(after.dex));
    pl.anim.dir = dir;
    pl.shiny = pl.shiny && G.Sprites.hasShiny(after.dex);
    const converted=eeveeChoice?convertNormal(pl,after.dex):null;
    // Evolution must NEVER shrink earned 3–8 permanent Skill Awakening slots.
    // Accounts that already unlocked 8 slots retain them after any form change.
    // PvP uses its independent equalized fixed three-move duel loadout.
    if(!G.PKMSVVArenaPvp?.active){
      const capacity=Number(G.PKMSVVSkillTrack?.progress?.(G.DB?.save,pl.kills)?.count);
      if(Number.isFinite(capacity)&&capacity>=3&&capacity<=8)
        pl.maxMoves=Math.max(Number(pl.maxMoves)||3,capacity);
    }
    pl.pkmEvoHistory.push({ from: r.from, to: r.to, at: pl.level, converted:converted||null });
    pl.pkmEvoFromMon=before;
    pl.pkmEvoSwapChoices=null;
    pl.pkmEvoSwapAvailable=true;
    pl.pkmEvoSkipLevel = -1;
    G.Sprites.preload([after.dex], 8000, pl.shiny);
    G.FX.ring(pl.x, pl.y, 8, 130, '#ffe082', 0.9, 6);
    G.FX.burst(pl.x, pl.y - pl.bodyH / 2, '#e1b9ff', 44, 270);
    G.Audio.sfx('legend');
    G.Spawner.say('PKMSVV: ' + before.name + ' tiến hóa thành ' + after.name + '!' +
      (converted ? ' ' + converted.from + ' → ' + converted.to + ' Lv.' + converted.lvl : ''), 4, true);
    return true;
  }
  function choiceRoutes(pl,t) {
    const available=(BY_FROM.get(pl.dex)||[]).filter(isSupported);
    // Eevee is the only Pokémon whose unmet branches are shown as LOCKED;
    // preserve the existing single-route behavior for all other Pokémon.
    const list=pl.dex===133?available:available.filter(r=>eligible(pl,t,r));
    return list.map(rule=>({rule,unlocked:eligible(pl,t,rule)}));
  }
  function pendingReason(pl,t,r) {
    if(eligible(pl,t,r))return '';
    const missing=[];
    if(isItemEvolution(r) && (pl.pkmEvoShards||0)<1) missing.push('Cần 1 Mảnh Tiến Hóa (hạ boss)');
    const points=friendship(pl,t);
    if(r.friendship && points<r.friendship)missing.push('Thân thiết '+points+'/'+r.friendship);
    if(r.time && r.time!==daytime(t))missing.push('Cần '+(r.time==='day'?'ban ngày (0–4, 8–12 phút)':'ban đêm (4–8, 12–16 phút)'));
    if(r.knownType && !pl.moves.some(m=>m.type===r.knownType)) {
      const pool=G.Moves.poolFor?G.Moves.poolFor(pl.mon):[];
      const possible=pool.some(id=>G.Moves.BY_ID[id] && G.Moves.BY_ID[id].type===r.knownType);
      missing.push(possible?'Cần chiêu hệ '+nice(r.knownType):'Cần dùng chiêu '+(pl.pkmEvoCasts||0)+'/30 lần');
    }
    return missing.length?missing.join(' · '):requirement(r);
  }
  function show(pl, choices, t, done) {
    const modal = document.createElement('div');
    modal.className = 'scr pkmsvv-evo'+(liveChoiceMode()?' pkmsvv-evo-live':''); // D-pad selects while the movement stick stays live
    const panel = document.createElement('div');
    panel.className = 'pkmsvv-evo-panel';
    modal.appendChild(panel);
    const head = document.createElement('h2');
    head.textContent = '✨ TIẾN HÓA POKÉMON';
    const sub = document.createElement('p');
    sub.textContent = S(pl.dex) + ' · Lv. ' + pl.level + ' · ' + (pl.pkmEvoShards || 0) + ' Mảnh Tiến Hóa';
    panel.appendChild(head); panel.appendChild(sub);
    const hint = document.createElement('p');
    hint.textContent = pl.dex===133
      ? 'Eevee có 8 nhánh. Nhánh tối màu chưa đạt điều kiện; nhánh sáng có thể chọn ngay.'
      : 'Chọn dạng tiến hóa. Các chiêu thức, cấp và nâng cấp trận này được giữ lại.';
    panel.appendChild(hint);
    // One common skill-swap screen follows ALL successful evolutions, including Eevee.
    function exit() { modal.remove(); done(); }
    for (const {rule:r,unlocked} of choices) {
      const b = document.createElement('button');
      b.className = 'pkmsvv-evo-option';
      b.disabled=!unlocked;
      b.textContent=(unlocked?'✓ ':'🔒 ')+S(pl.dex)+' → '+S(r.to)+' · '+
        (unlocked?requirement(r):pendingReason(pl,t,r));
      if(unlocked) b.addEventListener('click', () => {
        if(evolve(pl,r,{convertNormal:false})){
          modal.remove();showSkillSwap(pl,done);
        }
      });
      panel.appendChild(b);
    }
    const skip = document.createElement('button');
    skip.className = 'pkmsvv-evo-skip';
    skip.setAttribute('data-back', ''); // B button skips evolution safely
    skip.textContent = 'Giữ nguyên dạng hiện tại (hỏi lại ở cấp sau)';
    skip.addEventListener('click', () => { pl.pkmEvoSkipLevel = pl.level; exit(); });
    panel.appendChild(skip);
    document.body.appendChild(modal);
    if (G.Pad && G.Pad.name && G.Pad.focusFirst) G.Pad.focusFirst();
  }
  function tryOpen(pl, t, done) {
    // Native single-player Game.update immediately sets state='choice' when
    // this hook returns true. In Arena that freezes time and can strand the
    // personal skill-upgrade queue at three learned moves. Only the floating
    // REAL-TIME picker below may open Arena evolution.
    if(liveChoiceMode())return false;
    if (!pl || pl.dead || pl.pkmEvoSkipLevel === pl.level) return false;
    const options=choiceRoutes(pl,t);
    if(!options.some(o=>o.unlocked))return false;
    show(pl,options,t,done);
    return true;
  }
  function tryLiveCompetitive(pl,t){
    if(!liveChoiceMode()||!pl||pl.dead||G.Game?.state!=='playing'||!Number.isFinite(pl.level))return false;
    if(pl.pkmEvoLiveLevelSeen===pl.level||document.querySelector?.('.pkmsvv-evo'))return false;
    if(G.UI?.isOpen?.('scr-levelup')||G.UI?.isOpen?.('scr-item')||G.UI?.isOpen?.('scr-bond'))return false;
    if(!Array.isArray(pl.pkmEvoHistory))reset(pl);
    if(pl.pkmEvoSkipLevel===pl.level)return false;
    const options=choiceRoutes(pl,t);
    if(!options.some(o=>o.unlocked))return false;
    // Do not change Game.state, pause, pendingLevels or any Move slots.
    pl.pkmEvoLiveLevelSeen=pl.level;
    show(pl,options,t,()=>{});
    return true;
  }
  return { reset, tick, onCast, onHurt, eligible, evolve, requirement, friendship, tryOpen,
    routes: BY_FROM, choiceRoutes, pendingReason, conversionCandidate, convertNormal,
    skillSwapOptions, skillSwapChoices, swapSkill, showSkillSwap,liveChoiceMode,tryLiveCompetitive };
})();
