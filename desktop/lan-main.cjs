'use strict';
/* LAN portable bootstrap. Open /game/ DIRECTLY: loading the old landing '/'
 * immediately redirects, causing Electron loadURL to reject ERR_ABORTED (-3).
 */
const {app,BrowserWindow,Menu,dialog}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {startServer}=require('../lan-server/server.cjs');
const {startOnAvailablePort,launchUrl}=require('./lan-startup.cjs');

app.setAppUserModelId('com.votrivalley.pkmsvv.lan');
app.setPath('userData',path.join(app.getPath('appData'),'PKMSVV-LAN-Beta'));
let server=null,win=null,quitting=false;
const baseLog=()=>path.join(app.getPath('userData'),'lan-host-startup.log');
function log(message){
 try{fs.mkdirSync(path.dirname(baseLog()),{recursive:true});fs.appendFileSync(baseLog(),
  new Date().toISOString()+' '+message+'\n');}catch(_){}
}
function fail(err,step){
 const error=err instanceof Error?err:Error(String(err));
 const message=(step?step+'\n':'')+(error.stack||error.message);
 log(message);console.error('LAN Host startup:',message);
 dialog.showErrorBox('Không thể mở Pokémon Chuyển Sinh LAN',
  'Máy chủ Co-op chưa mở được.\n\n'+error.message+'\n\nLog: '+baseLog());
}
const lock=app.requestSingleInstanceLock();
if(!lock){
 // A running copy already owns the LAN server. Never race over port 37816.
 app.quit();
}else{
 app.on('second-instance',()=>{
  if(win&&!win.isDestroyed()){
   if(win.isMinimized())win.restore();
   win.show();win.focus();
  }
 });
 app.whenReady().then(async()=>{
  const root=app.isPackaged?
   path.join(process.resourcesPath,'lan-site'):
   path.join(__dirname,'..','dist','lan');
  if(!fs.existsSync(path.join(root,'game','index.html'))){
   fail(Error('Không tìm thấy tài nguyên trò chơi: '+root),'Kiểm tra gói cài đặt');
   app.quit();return;
  }
  let selected;
  try{
   selected=await startOnAvailablePort(startServer,{root,host:'0.0.0.0',ports:[37816,37817,37818,37819]});
   server=selected.server;
   log('Host listening port '+server.port+' at '+JSON.stringify(server.addresses));
  }catch(e){fail(e,'Khởi động LAN Host');app.quit();return;}
  try{
   win=new BrowserWindow({width:1230,height:810,minWidth:790,minHeight:540,
    backgroundColor:'#09283a',title:'Pokémon Chuyển Sinh — Co-op LAN',
    autoHideMenuBar:true,show:false,
    webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
   Menu.setApplicationMenu(null);
   win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
   win.webContents.on('will-navigate',(event,target)=>{
    if(!target.startsWith('http://127.0.0.1:'+server.port+'/'))event.preventDefault();
   });
   win.webContents.on('did-fail-load',(_event,code,description,url,isMainFrame)=>{
    if(!isMainFrame||code===-3)return; // -3 can be deliberate navigation cancellation.
    log('Web page failed '+code+' '+description+' '+url);
   });
   // LOAD DIRECTLY. Never visit '/' first and then redirect with location.replace.
   await win.loadURL(launchUrl(server.port));
   if(win.isDestroyed())return;
   const loaded=await win.webContents.executeJavaScript(
    "document.readyState!=='loading' && !!document.querySelector('#scr-menu')",true);
   if(!loaded)throw Error('Giao diện game chưa được đóng gói đúng hoặc không có #scr-menu.');
   win.show();
   win.on('closed',()=>{win=null;app.quit();});
   if(selected.fallback){
    dialog.showMessageBox(win,{type:'info',title:'Co-op LAN đã mở bằng cổng khác',
     message:'Cổng 37816 đang bận. Host đang dùng cổng '+server.port+'.',
     detail:'Điện thoại/iPad cùng Wi-Fi truy cập http://IP-PC:'+server.port+
      '/ (xem IP tại Co-op → Hướng dẫn kết nối LAN).'});
   }
  }catch(e){fail(e,'Mở giao diện game');app.quit();}
 }).catch(e=>{fail(e,'Electron startup');app.quit();});
 app.on('before-quit',()=>{
  if(quitting)return;quitting=true;
  if(server){const s=server;server=null;s.close().catch(e=>log('Server close '+e.message));}
 });
}
