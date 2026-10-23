/* Pokémon Survivor / Votri Valley — Vampire Survivors-style permanent upgrades UI */
G.GlobalPowerUI = (() => {
  const $=id=>document.getElementById(id);
  const en=()=>window.PS_LOCALES && window.PS_LOCALES.lang==='en';
  const txt=(vi,english)=>en()?english:vi;
  const money=n=>Number(n||0).toLocaleString(en()?'en-US':'vi-VN');
  function draw() {
    const save=G.DB.save;
    if(!save) return;
    const box=$('pkmg-list'), levels=G.GlobalPower.clean(save.globalUpgrades);
    if(!box) return;
    const all=G.GlobalPower.LIST.reduce((sum,u)=>sum+G.GlobalPower.rank(levels,u.id),0);
    const max=G.GlobalPower.LIST.reduce((sum,u)=>sum+u.max,0);
    $('pkmg-title').textContent=txt('NÂNG CẤP TOÀN ĐỘI','TEAM POWERUPS');
    $('pkmg-subtitle').textContent=txt(
      'Tác dụng vĩnh viễn lên TẤT CẢ Pokémon, cộng dồn với nâng cấp riêng. Mua bằng PokéCoins; có thể hoàn trả 100%.',
      'Permanent bonuses for ALL Pokémon. Stack with individual upgrades. Buy with PokéCoins; full refund available.');
    $('pkmg-progress').textContent=txt('Đã mở ','Unlocked ')+all+' / '+max;
    $('pkmg-balance').textContent=money(save.coins)+' PokéCoins';
    $('pkmg-back').textContent=txt('Trở về','Back');
    box.innerHTML='';
    for(const u of G.GlobalPower.LIST) {
      const lvl=G.GlobalPower.rank(levels,u.id), full=lvl===u.max, price=G.GlobalPower.cost(u.id,lvl);
      const line=document.createElement('div');
      line.className='pkmg-card';
      const head=document.createElement('div'); head.className='pkmg-info';
      const picture=document.createElement('div'); picture.className='pkmg-icon';
      picture.innerHTML=G.Icons.html(u.icon,28);
      const info=document.createElement('div');
      const name=document.createElement('strong');
      name.textContent= en()?u.en:u.vi;
      const desc=document.createElement('div');desc.className='pkmg-desc';
      desc.textContent=en()?u.enUnit:u.viUnit;
      const rankLine=document.createElement('div');rankLine.className='pkmg-pips';
      for(let n=0;n<u.max;n++){const pip=document.createElement('i');if(n<lvl)pip.className='on';rankLine.appendChild(pip);}
      info.append(name,desc,rankLine);
      head.append(picture,info);
      const right=document.createElement('div');right.className='pkmg-buy';
      const level=document.createElement('span');
      level.textContent='Lv '+lvl+'/'+u.max;
      const btn=document.createElement('button'); btn.type='button';
      btn.className='btn small'+(full?'':' gold');btn.dataset.sfx='none';
      btn.disabled=full||save.coins<price;
      btn.textContent=full?txt('TỐI ĐA','MAX'):money(price)+' ◉';
      btn.onclick=()=>{
        if(!G.GlobalPower.purchase(G.DB.save,u.id))return;
        G.DB.commit(true);G.Audio.sfx('buy');G.UI.refreshCoins();
        G.UI.toast((en()?u.en:u.vi)+' · Lv '+(lvl+1));draw();
      };
      right.append(level,btn);
      line.append(head,right);box.appendChild(line);
    }
    const refund=G.GlobalPower.refundable(save),btn=$('pkmg-refund');
    btn.disabled=!refund;
    btn.textContent=txt('Hoàn trả toàn bộ (','Refund all (')+money(refund)+' ◉)';
    btn.onclick=()=>{
      if(!confirm(txt(
        'Hoàn trả tất cả nâng cấp toàn đội? Bạn sẽ nhận lại '+money(refund)+' PokéCoins. Nâng cấp riêng từng Pokémon không thay đổi.',
        'Refund every team powerup for '+money(refund)+' PokéCoins? Individual Pokémon upgrades will not change.'
      )))return;
      const got=G.GlobalPower.refundAll(G.DB.save);
      if(!got)return;
      G.DB.commit(true);G.Audio.sfx('buy');G.UI.refreshCoins();draw();
    };
  }
  function open(){G.UI.show('scr-global-powerups',true);draw();}
  return {open,draw};
})();
