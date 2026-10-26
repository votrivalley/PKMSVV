'use strict';
/* LAN portable bootstrap. Open /game/ DIRECTLY: loading the old landing '/'
 * immediately redirects, causing Electron loadURL to reject ERR_ABORTED (-3).
 */
const {app,BrowserWindow,Menu,dialog,ipcMain}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {startServer}=require('../lan-server/server.cjs');
const {startDiscovery}=require('../lan-server/discovery.cjs');
const {startOnAvailablePort,launchUrl}=require('./lan-startup.cjs');
const {hostURL,allowedNavigation,probeHost}=require('./lan-connection.cjs');

app.setAppUserModelId('com.votrivalley.pkmsvv.lan');
const smokeTest=process.argv.includes('--smoke-test');
app.setPath('userData',path.join(app.getPath('appData'),smokeTest?'PKMSVV-LAN-QA-'+process.pid:'PKMSVV-LAN-Beta'));
let server=null,discovery=null,win=null,quitting=false;
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
   discovery=startDiscovery({port:server.port,logger:log});
   log('Host listening port '+server.port+' at '+JSON.stringify(server.addresses));
  }catch(e){fail(e,'Khởi động LAN Host');app.quit();return;}
  try{
   win=new BrowserWindow({width:1230,height:810,minWidth:790,minHeight:540,
    backgroundColor:'#09283a',title:'Pokémon Chuyển Sinh — Co-op LAN',
    autoHideMenuBar:true,show:!smokeTest,
    webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,
     spellcheck:false,preload:path.join(__dirname,'lan-preload.cjs')}});
   Menu.setApplicationMenu(null);
   win.on('closed',()=>{win=null;app.quit();});
   log('Native Electron window loading game at LAN port '+server.port);
   win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
   const origins=new Set(['http://127.0.0.1:'+server.port]);
   let joining=false;
   ipcMain.handle('pkmsvv:lan-connect',async(event,options={})=>{
    if(!win||win.isDestroyed()||event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame||
       !allowedNavigation(event.senderFrame.url,origins))return{ok:false,error:'Không thể kết nối từ cửa sổ này.'};
    if(joining)return{ok:false,error:'Đang kết nối Host, vui lòng chờ.'};
    joining=true;
    const previous=win.webContents.getURL();
    let target,timer;
    try{
     target=hostURL(options.address,options);
     await probeHost(target);
     origins.add(target.origin);
     // Bound the entire load; an HTTP listener alone does not prove the game loads.
     await Promise.race([win.loadURL(target.href),new Promise((_,reject)=>{
      timer=setTimeout(()=>{win?.webContents.stop();reject(Error('Host tải game quá lâu. Hãy thử lại.'));},12000);
     })]);
     log('Joined LAN Host '+target.origin);
     return{ok:true};
    }catch(error){
     log('LAN join failed: '+error.message);
     if(win&&!win.isDestroyed()&&win.webContents.getURL()!==previous)
      await win.loadURL(previous).catch(e=>log('Restore page: '+e.message));
     return{ok:false,error:error.message};
    }finally{clearTimeout(timer);joining=false;}
   });
   win.webContents.on('will-navigate',(event,target)=>{
    if(!allowedNavigation(target,origins))event.preventDefault();
   });
   win.webContents.on('will-redirect',(event,target)=>{
    if(!allowedNavigation(target,origins))event.preventDefault();
   });
   win.webContents.on('render-process-gone',(_event,details)=>log('Renderer stopped: '+JSON.stringify(details)));
   win.on('unresponsive',()=>log('Game window unresponsive at '+win?.webContents.getURL()));
   win.webContents.on('did-fail-load',(_event,code,description,url,isMainFrame)=>{
    if(!isMainFrame||code===-3)return; // -3 can be deliberate navigation cancellation.
    log('Web page failed '+code+' '+description+' '+url);
   });
   // PC remains an EXE window. Never open Chrome/Edge as a fallback.
   // A slow disk may delay the game bundle, but Electron remains visible.
   const startedLoading=Date.now();
   await win.loadURL(launchUrl(server.port));
   if(win.isDestroyed())return;
   const loaded=await win.webContents.executeJavaScript(
    "document.readyState!=='loading' && !!document.querySelector('#scr-menu')",true);
   if(!loaded)throw Error('Thiếu giao diện game #scr-menu trong bộ LAN.');
   log('Game UI ready after '+(Date.now()-startedLoading)+'ms');
   if(selected.fallback){
    dialog.showMessageBox(win,{type:'info',title:'Co-op LAN đã mở bằng cổng khác',
     message:'Cổng 37816 đang bận. Host đang dùng cổng '+server.port+'.',
     detail:'Điện thoại/iPad cùng Wi-Fi truy cập http://IP-PC:'+server.port+
      '/ (xem IP tại Co-op → Hướng dẫn kết nối LAN).'});
   }
  }catch(e){if(win&&!win.isDestroyed())fail(e,'Mở giao diện game');app.quit();}
 }).catch(e=>{fail(e,'Electron startup');app.quit();});
 app.on('before-quit',()=>{
  if(quitting)return;quitting=true;
  discovery?.close();
  if(server){const s=server;server=null;s.close().catch(e=>log('Server close '+e.message));}
 });
}
