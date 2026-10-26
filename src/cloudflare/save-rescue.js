'use strict';
(()=>{
 const root=document.getElementById('saves'),msg=document.getElementById('message');
 const fmt=k=>'ps.save.'+k;
 const isSave=s=>!!s&&typeof s==='object'&&!Array.isArray(s)&&
  s.stats&&typeof s.stats==='object'&&s.owned&&typeof s.owned==='object';
 function load(){
  const found=[];
  try{
   for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(/^ps\.save\./.test(k)||/^pkmsvv\.safe\.v1\.pkmsvv_offline\.(?:latest|previous)$/.test(k)){
     const raw=localStorage.getItem(k);
     let s=null;try{s=JSON.parse(raw);}catch(_){}
     if(isSave(s))found.push({key:k,data:s,raw});
    }
   }
  }catch(e){msg.textContent='Không thể đọc bộ nhớ trang này: '+e.message;}
  return found;
 }
 function download(s){
  const payload=JSON.stringify({format:'PKMSVV_SAVE',version:1,
    createdAt:new Date().toISOString(),source:'Votri Valley – cứu save',save:s},null,2);
  const url=URL.createObjectURL(new Blob([payload],{type:'application/json;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;
  link.download='PokemonChuyenSinh-CuuSave-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
 }
 const hostname=location.hostname;
 const canonical='pkmsvv-web.pages.dev';
 const label=document.getElementById('origin');
 label.textContent=location.origin;
 if(hostname!==canonical){
  document.getElementById('preview').hidden=false;
  document.getElementById('production').href='https://'+canonical+'/';
 }
 function render(){
  const found=load();root.textContent='';
  for(const item of found){
   const panel=document.createElement('div');panel.className='item';
   const h=document.createElement('p');h.textContent=item.key+' — '+(item.data.name||'Hồ sơ')+
    ' · Pokémon: '+Object.keys(item.data.owned).length;
   const button=document.createElement('button');button.textContent='Tải file save JSON';
   button.onclick=()=>download(item.data);
   panel.append(h,button);
   if(item.key.includes('pkmsvv.safe.')){
    const repair=document.createElement('button');repair.textContent='Khôi phục bản dự phòng này';
    repair.onclick=()=>{
     const current=localStorage.getItem(fmt('pkmsvv_offline'));
     if(current&&!confirm('Thao tác này sẽ THAY THẾ save hiện tại. Đã xuất file save trước chưa?'))return;
     try{
      if(current)localStorage.setItem('pkmsvv.safe.v1.preRestore',current);
      localStorage.setItem(fmt('pkmsvv_offline'),item.raw);
      const accounts=JSON.parse(localStorage.getItem('ps.accounts')||'{}');
      if(!accounts.pkmsvv_offline){
       accounts.pkmsvv_offline={name:item.data.name||'Người chơi',localOnly:true};
       localStorage.setItem('ps.accounts',JSON.stringify(accounts));
      }
      localStorage.setItem('ps.session',JSON.stringify('pkmsvv_offline'));
      msg.textContent='Đã phục hồi dự phòng trong website này. Mở game để kiểm tra.';
     }catch(e){msg.textContent='Không phục hồi được: '+e.message;}
    };
    panel.append(repair);
   }
   root.append(panel);
  }
  if(!found.length)msg.textContent='Không tìm thấy save trong địa chỉ này. Hãy thử trang Preview/Production cũ đã chơi hoặc nhập bản sao JSON trước đây.';
  else msg.textContent='Tìm thấy '+found.length+' phiên bản save. Hãy xuất file trước khi khôi phục hoặc cập nhật.';
 }
 document.getElementById('scan').onclick=render;
 render();
})();
