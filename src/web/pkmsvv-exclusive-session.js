/* Web Online: one active login session per Google account.
 * The latest browser claims sessions/{uid} in Firestore and revokes the older
 * browser through an active server snapshot listener. This is not Firebase
 * Authentication's account-wide token revocation: only this game is kicked.
 */
G.PKMSVVSession=(()=>{
 let token='', unsub=null, blocked=false, busy=false;
 const rand=()=>{
   const a=new Uint8Array(24);
   crypto.getRandomValues(a);
   return Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');
 };
 function stop(){
   if(unsub){unsub();unsub=null;}
   token=''; blocked=false; busy=false;
 }
 function active(){return !!token && !blocked;}
 function drawKick(){
   if(document.getElementById('pkmsvv-session-kick'))return;
   const layer=document.createElement('section');
   layer.id='pkmsvv-session-kick';
   layer.style.cssText='position:fixed;z-index:2147483647;inset:0;background:#071626ed;color:#fff;display:grid;place-items:center;padding:20px;font-family:system-ui,sans-serif';
   const box=document.createElement('div');
   box.style.cssText='max-width:460px;width:100%;padding:28px;background:#19354b;border:2px solid #e1bf61;border-radius:16px;text-align:center;box-sizing:border-box';
   const head=document.createElement('h2');
   head.textContent='Tài khoản được đăng nhập nơi khác';
   const p=document.createElement('p');
   p.textContent='Phiên chơi trên thiết bị này đã kết thúc. Tiến trình chưa đồng bộ vẫn được giữ trong bộ nhớ thiết bị này, không ghi đè lên máy mới. Hãy mở lại game để đăng nhập.';
   const btn=document.createElement('button');
   btn.type='button';btn.textContent='Về màn hình đăng nhập';
   btn.style.cssText='padding:12px 20px;border-radius:9px;background:#e1bf61;color:#14263b;font-weight:bold;border:0;cursor:pointer';
   btn.onclick=()=>window.location.replace('/');
   box.append(head,p,btn);layer.append(box);document.body.append(layer);
 }
 async function revoke(auth){
   if(blocked)return;
   blocked=true;
   // Never let a displaced client push, even if endRun/quit commits locally.
   try{
     if(G.Game && G.Game.state!=='ui' && G.Game.state!=='over')G.Game.quit();
   }catch(e){console.warn('[Session] quit:',e);}
   try{if(G.DB.save)G.DB.commit(true);}catch(e){}
   drawKick();
   try{if(G.Net && G.Net.open_)G.Net.close();}catch(e){}
   try{if(G.Social && G.Social.room)await G.Social.leaveRoom();}catch(e){}
   try{await auth.signOut();}catch(e){}
 }
 async function claim(db,uid,auth){
   stop();
   if(!db||!uid)throw Error('Không thể kiểm tra phiên đăng nhập khi Firebase ngoại tuyến.');
   const owner=uid,ref=db.collection('sessions').doc(owner),key=rand();
   busy=true;
   // Server-side write is required; cache-only sessions must not enter Online.
   await ref.set({token:key,at:firebase.firestore.FieldValue.serverTimestamp()});
   token=key;busy=false;
   unsub=ref.onSnapshot({includeMetadataChanges:true},snap=>{
     if(blocked || !snap.exists || (snap.metadata && snap.metadata.fromCache))return;
     const v=snap.data();
     if(v && v.token && v.token!==key)revoke(auth);
   },e=>{
     console.warn('[Session] listener failed:',e.code||e.message);
     // Fail-closed for Cloud play; local mode remains independently available.
     revoke(auth);
   });
   return key;
 }
 return {claim,stop,active,get token(){return active()?token:'';},get blocked(){return blocked;}};
})();
