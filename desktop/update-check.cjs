'use strict';
// Portable EXE can discover updates, but NEVER self-install or modify user saves.
// Main process performs one read-only request; the game renderer stays offline.
const repo='votrivalley/PKMSVV';
const url='https://api.github.com/repos/'+repo+'/releases/latest';
function parseVersion(v){
 const m=/^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(v||''));
 return m?m.slice(1).map(Number):null;
}
function newer(candidate,current){
 const a=parseVersion(candidate),b=parseVersion(current);
 if(!a||!b)return false;
 for(let i=0;i<3;i++)if(a[i]!==b[i])return a[i]>b[i];
 return false;
}
async function checkForNewRelease({app,mainWindow}){
 if(!app.isPackaged||!mainWindow||mainWindow.isDestroyed())return;
 try{
  const {session,dialog,shell}=require('electron');
  // Separate in-memory session: defaultSession blocks all network requests from gameplay.
  const updateSession=session.fromPartition('pkmsvv-version-check',{cache:false});
  const response=await updateSession.fetch(url,{
   headers:{Accept:'application/vnd.github+json','User-Agent':'PKMSVV-Update-Check'},
   signal:AbortSignal.timeout(6000)
  });
  if(!response.ok)return;
  const release=await response.json(),tag=String(release.tag_name||'');
  if(!newer(tag,app.getVersion()))return;
  const safeUrl='https://github.com/'+repo+'/releases/tag/'+tag;
  const result=await dialog.showMessageBox(mainWindow,{
   type:'info',buttons:['Xem bản cập nhật','Để sau'],defaultId:1,cancelId:1,
   title:'Pokémon Survivor — Có phiên bản mới',
   message:'Đã có bản '+tag+' (bạn đang dùng '+app.getVersion()+').',
   detail:'Bản PC portable không tự cài đè. Bạn có thể tải bản mới từ GitHub. Tiến trình vẫn được giữ trong thư mục dữ liệu riêng.'
  });
  if(result.response===0)await shell.openExternal(safeUrl);
 }catch(e){/* Connection errors must never stop an offline game from starting. */}
}
module.exports={parseVersion,newer,checkForNewRelease};
