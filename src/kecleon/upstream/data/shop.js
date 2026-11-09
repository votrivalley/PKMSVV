/* ============ shop.js — Tienda Kecleon y Mochila ============
 * (20-10-2026, del PR #236 de TheAdro7, adaptado: sin niveles ni caramelos.)
 *
 * Se compra con Pokémonedas y lo comprado va a la Mochila:
 *   save.bag[id]     Menta, Cápsula Habilidad y Cápsula Habilidad Oculta
 *   save.tms[move]   MT sin usar (cada una se gasta al enseñarla: G.Mons.teach)
 * Las dos van en la libreta de las monedas (core/db.js): lo gastado en un
 * aparato no reaparece al fusionar con otro.
 *
 * MT a la venta: 8 cada día, iguales para todos (semilla: la fecha en España).
 * Si ninguna sirve a tu compañero, la última se cambia por una que sí aprenda.
 */
G.Shop=(()=>{
  const ITEMS = {
    mint: { name: 'Menta', icon: 'mint', price: 1500,
            desc: 'Rerolls a Pokémon Nature randomly.' },
    cap:  { name: 'Cápsula Habilidad', icon: 'capsule', price: 1500,
            desc: 'Random Ability reroll, with a 5% chance for Hidden when available.' },
    caph: { name: 'Cápsula Habilidad Oculta', icon: 'capsuleh', price: 10000, hidden: true, unavailableInShop: true,
            desc: 'Event-only random Ability reroll: 15% chance for Hidden, 3× a regular Capsule.' }
  };
  // Hidden Capsules are rare/event-only: never on the regular Shop shelf,
  // but usable in Bag and PokéBox. Preserve existing JSON inventory.
  const ORDER = ['mint', 'cap', 'caph'];
  const DAILY = 8;

  const save = () => G.DB.save;

  // ---------------- Mochila ----------------

  const count = id => { const s = save(); return (s && s.bag && s.bag[id]) || 0; };
  function take(id) {
     const s = save();
    if (!count(id)) return false;
    if (--s.bag[id] <= 0) delete s.bag[id];
    return true;
  }
  const tmCount = id => { const s = save(); return (s && s.tms && s.tms[id]) || 0; };
  function takeTm(id) {
    const s = save();
    if (!tmCount(id)) return false;
    if (--s.tms[id] <= 0) delete s.tms[id];
    return true;
  }

  // ---------------- MT del día ----------------

  /** Fecha de hoy en España (todos ven la misma tienda el mismo día). */
  function today() {
    const p = {};
    for (const x of new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())) p[x.type] = x.value;
    return p.year + p.month + p.day;
  }
  function rng(seed) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  /** Las 8 MT a la venta hoy. */
  function dailyTms() {
    const all = Object.keys(G.TM_MOVES).sort(), r = rng('kecleon:' + today());
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    const list = all.slice(0, DAILY);
    const s = save(), dex = s && s.partner;
    if (dex && !list.some(id => G.Mons.canLearn(dex, id))) {
      const mine = G.Mons.learnable(dex).sort();
      if (mine.length) list[DAILY - 1] = mine[Math.floor(rng('kecleon:' + today() + ':' + dex)() * mine.length)];
    }
    return list;
  }
  const tmPrice = id => G.TM_PRICE[id] || 400;

  // Hidden Capsules remain event-only (no ordinary Shop or enemy drops).
  // Existing/special-event Hidden Capsules remain usable and sellable.
  const DROP_RATE=Object.freeze({mint:.008,cap:.008});
  function enemyMultiplier(enemy){
    const rarity=Number(enemy?.rarity??enemy?.mon?.rarity??G.DEX_BY?.[enemy?.dex]?.rarity??0);
    return enemy?.legendary||enemy?.isLegendary||rarity>=5||enemy?.boss?4:
      (enemy?.elite||enemy?.isElite||enemy?.kind==='elite'?2:1);
  }
  function dropFromEnemy(enemy,random=Math.random){
    const s=save();
    if(!s||G.DB?.guest||!enemy||enemy._pkmsvvShopDropCounted||
      enemy.remote||enemy.arceus||enemy.isCompanion||
      enemy.pkmsvvChampionSupport||enemy._pkmsvvBossSupport||
      G.Game?.state!=='playing'||G.PKMSVVArenaSolo?.active||
      G.PKMSVVChampionArena?.active||G.PKMSVVArenaPvp?.active||
      G.Royale?.active||G.EggRush?.active)return [];
    enemy._pkmsvvShopDropCounted=true;
    const multiplier=enemyMultiplier(enemy),found=[];
    for(const [key,base] of Object.entries(DROP_RATE)){
      if(Number(random())<base*multiplier&&Number(s.bag?.[key]||0)<999)found.push(key);
    }
    if(!found.length)return [];
    const previous=JSON.stringify(s.bag||{});
    s.bag=s.bag||{};
    for(const key of found)s.bag[key]=(s.bag[key]||0)+1;
    try{
      if(G.DB.commit(true)===false)throw Error('Cannot save dropped items');
      return found;
    }catch(_){
      s.bag=JSON.parse(previous);
      enemy._pkmsvvShopDropCounted=false;
      return [];
    }
  }

  // ---------------- comprar ----------------

  /** Compra un objeto ('mint'...) o una MT ('tm:flamethrower'). → { ok, error? } */
  function buy(key) {
    const s = save();
    if (!s) return { ok: false };
    const tm = key.startsWith('tm:') ? key.slice(3) : null;
    if (tm && !dailyTms().includes(tm)) return { ok: false, error: 'Esa MT ya no está a la venta.' };
    if (!tm && (!ITEMS[key] || ITEMS[key].unavailableInShop)) return { ok: false };
    const price = tm ? tmPrice(tm) : ITEMS[key].price;
    if (s.coins < price) return { ok: false, error: 'No tienes Pokémonedas suficientes.' };
    s.coins -= price;
    if (tm) { s.tms = s.tms || {}; s.tms[tm] = Math.min(999, (s.tms[tm] || 0) + 1); }
    else { s.bag = s.bag || {}; s.bag[key] = Math.min(999, (s.bag[key] || 0) + 1); }
    G.DB.commit();
    return { ok: true };
  }

  // Selling is an atomic Bag operation, including TM copies. The Hidden
  // Capsule cannot be purchased but an existing/dropped copy is sellable.
  function sell(key) {
    const s=save(),tm=typeof key==='string'&&key.startsWith('tm:')?key.slice(3):null;
    if(!s||G.DB.guest||(!tm&&!ITEMS[key])||
      (tm&&!G.Moves?.BY_ID?.[tm]))return {ok:false};
    const store=tm?s.tms:s.bag,id=tm||key;
    if(!store||!Number.isSafeInteger(store[id])||store[id]<1)return {ok:false};
    const refund=Math.floor((tm?tmPrice(tm):ITEMS[key].price)/2);
    if(!Number.isSafeInteger(s.coins)||s.coins<0||!Number.isSafeInteger(s.coins+refund))
      return {ok:false};
    const previous={coins:s.coins,count:store[id]};
    store[id]--;
    if(!store[id])delete store[id];
    s.coins+=refund;
    try{
      if(G.DB.commit(true)===false)throw Error('Save commit failed');
      return {ok:true,key,refund,coins:s.coins};
    }catch(_){
      s.coins=previous.coins;store[id]=previous.count;
      return {ok:false};
    }
  }
  return { ITEMS, ORDER, DROP_RATE, enemyMultiplier, dropFromEnemy, count, take, tmCount, takeTm, dailyTms, tmPrice, buy, sell, today };
})();
