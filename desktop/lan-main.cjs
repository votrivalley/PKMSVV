'use strict';
const {app,BrowserWindow,Menu,dialog}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {startServer}=require('../lan-server/server.cjs');

app.setAppUserModelId('com.votrivalley.pkmsvv.lan');
app.setPath('userData',path.join(app.getPath('appData'),'PKMSVV-LAN-Beta'));
let server,win;
const baseLog=()=>path.join(app.getPath('userData'),'lan-host-startup.log');
function fail(err,step){
 const error=err instanceof Error?err:Error(String(err));
 const message=(step?step+'\n':'')+(error.stack||error.message);
 try{fs.mkdirSync(path.dirname(baseLog()),{recursive:true});fs.appendFileSync(baseLog(),
  new Date().toISOString()+'\n'+message+'\n\n');}catch(_){}
 console.error('LAN Host startup:',message);
 dialog.showErrorBox('Không thể mở Pokémon Chuyển Sinh LAN',
  'LAN Host chưa khởi động được.\n\n'+(error.code==='EADDRINUSE'?
    'Cổng 37816 đang được ứng dụng khác sử dụng. Hãy đóng bản Host cũ.\n\n':'')+
  error.message+'\n\nLog: '+baseLog());
}
app.whenReady().then(async()=>{
 const root=app.isPackaged?
  path.join(process.resourcesPath,'lan-site'):
  path.join(__dirname,'..','dist','lan');
 if(!fs.existsSync(path.join(root,'game','index.html'))){
  fail(Error('Thiếu bộ game LAN trong gói cài đặt: '+root),'Kiểm tra tài nguyên');
  app.quit();return;
 }
 try{server=await startServer({root,port:37816});}
 catch(e){fail(e,'Khởi động máy chủ LAN');app.quit();return;}
 try{
  win=new BrowserWindow({width:1230,height:810,minWidth:790,minHeight:540,backgroundColor:'#09283a',
   title:'Pokémon Chuyển Sinh — Co-op LAN',autoHideMenuBar:true,show:false,
   webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  Menu.setApplicationMenu(null);
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,target)=>{
   if(!target.startsWith('http://127.0.0.1:'+server.port+'/'))event.preventDefault();
  });
  await win.loadURL('http://127.0.0.1:'+server.port+'/');
  win.show();
  win.on('closed',()=>app.quit());
  console.log('Host LAN:',server.addresses.map(ip=>'http://'+ip+':'+server.port).join(', '));
 }catch(e){fail(e,'Mở giao diện LAN');app.quit();}
}).catch(e=>{fail(e,'Electron startup');app.quit();});
app.on('before-quit',()=>{
 if(server){const s=server;server=null;s.close().catch(()=>{});}
});
