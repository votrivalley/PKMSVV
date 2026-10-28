'use strict';
/* v1.5.37 — spectator camera for eliminated Survival Royale trainers.
 * Strictly visual/local: no revive, invulnerability, teleport, PvP,
 * authoritative world mutation, or new networking packets.
 */
G.PKMSVVSpectator=(()=>{
 let selected=null,root=null,label=null,countEl=null,visible=false;
 const L=(vi,en)=>G.I18n?.lang==='vi'?vi:en;
 const eligible=()=>!!(G.Royale?.active&&G.Coop?.active&&G.Game?.player?.dead&&
  ['playing','held'].includes(G.Game.state));
 const players=()=>{
  if(!eligible())return [];
  const uid=G.Game.player.uid;
  return (G.Coop.players?.()||[]).filter(p=>p?.uid&&p.uid!==uid&&!p.dead&&
   Number.isFinite(p.x)&&Number.isFinite(p.y));
 };
 const displayName=p=>{
  const m=G.Coop.members?.find?.(x=>x.uid===p.uid);
  return String(m?.name||p.name||L('Huấn luyện viên','Trainer')).slice(0,40);
 };
 function target(){
  const all=players();
  if(!all.length){selected=null;return null;}
  let found=all.find(p=>p.uid===selected);
  if(!found){found=all[0];selected=found.uid;}
  return found;
 }
 function step(dir){
  const all=players();
  if(!all.length){selected=null;render();return null;}
  const at=all.findIndex(p=>p.uid===selected);
  const next=at<0?0:(at+dir+all.length)%all.length;
  selected=all[next].uid;render();return all[next];
 }
 function build(){
  if(root||typeof document==='undefined'||!document.body)return;
  const css=document.createElement('style');css.id='pkmsvv-spectator-style';
  css.textContent=[
   '#pkmsvv-spectator{position:fixed;z-index:210;bottom:max(17px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);',
   'display:flex;align-items:center;gap:9px;max-width:calc(100vw - 20px);min-width:min(292px,calc(100vw - 20px));',
   'box-sizing:border-box;border:1px solid #98e4dd;border-radius:13px;padding:7px 9px;',
   'background:rgba(7,30,45,.91);box-shadow:0 3px 16px #020e18ab;color:#e7fffc;',
   'font:700 13px/1.25 sans-serif;pointer-events:auto}',
   '#pkmsvv-spectator[hidden]{display:none!important}',
   '#pkmsvv-spectator button{display:grid;place-items:center;flex:0 0 41px;width:41px;height:39px;',
   'border:1px solid #8bdfd4;border-radius:9px;background:#234f5d;color:#fff;',
   'font:700 21px sans-serif;cursor:pointer;touch-action:manipulation}',
   '#pkmsvv-spectator button:focus-visible{outline:2px solid #ffde77;outline-offset:2px}',
   '#pkmsvv-spectator .pkmsvv-spectate-info{flex:1;min-width:0;text-align:center;overflow:hidden}',
   '#pkmsvv-spectator .pkmsvv-spectate-name{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
   '#pkmsvv-spectator .pkmsvv-spectate-small{display:block;color:#b1dfe0;font-size:10px;font-weight:500}',
   '@media(max-height:480px){#pkmsvv-spectator{bottom:max(6px,env(safe-area-inset-bottom));padding:4px 7px}',
   '#pkmsvv-spectator button{height:32px;flex-basis:34px;width:34px}}'
  ].join('');
  document.head?.appendChild(css);
  root=document.createElement('aside');root.id='pkmsvv-spectator';
  root.setAttribute('aria-label',L('Theo dõi người sống sót','Spectate survivors'));
  root.hidden=true;
  const prev=document.createElement('button');prev.type='button';prev.textContent='‹';
  prev.setAttribute('aria-label',L('Người chơi trước','Previous player'));
  prev.onclick=()=>step(-1);
  const info=document.createElement('div');info.className='pkmsvv-spectate-info';
  label=document.createElement('strong');label.className='pkmsvv-spectate-name';
  countEl=document.createElement('small');countEl.className='pkmsvv-spectate-small';
  info.append(label,countEl);
  const next=document.createElement('button');next.type='button';next.textContent='›';
  next.setAttribute('aria-label',L('Người chơi tiếp','Next player'));
  next.onclick=()=>step(1);
  root.append(prev,info,next);document.body.appendChild(root);
 }
 function render(){
  const p=target();
  if(!p){if(root)root.hidden=true;visible=false;return;}
  build();if(!root)return;
  root.hidden=false;visible=true;
  const all=players();
  label.textContent=L('Đang xem: ','Spectating: ')+displayName(p);
  countEl.textContent=L('◀ ▶ đổi góc nhìn · ','◀ ▶ switch view · ')+
   (all.findIndex(x=>x.uid===p.uid)+1)+'/'+all.length;
 }
 function tick(){
  if(!eligible()){selected=null;if(root)root.hidden=true;visible=false;return;}
  // Death can come from Combat, the red boundary or a Host net snapshot,
  // even while the skill picker is open. It must never block a spectator.
  if(G.UI?.isOpen?.('scr-levelup'))G.RunUI?.closeLevelUp?.();
  for(const id of ['scr-item','scr-bond'])if(G.UI?.isOpen?.(id))G.UI.hide(id);
  render();
 }
 function cameraTarget(){
  if(!eligible())return null;
  const p=target();return p?{x:p.x,y:p.y,uid:p.uid}:null;
 }
 function keydown(e){
  if(!eligible()||!['ArrowLeft','ArrowRight'].includes(e.key))return;
  if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
  step(e.key==='ArrowLeft'?-1:1);
  e.preventDefault();e.stopPropagation();
 }
 if(typeof window!=='undefined')window.addEventListener('keydown',keydown,true);
 function reset(){selected=null;if(root)root.hidden=true;visible=false;}
 return {tick,cameraTarget,step,target,reset,get selected(){return selected;},get visible(){return visible;}};
})();
