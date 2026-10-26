'use strict';
const {app,BrowserWindow,Menu}=require('electron');
const path=require('node:path');
const {startServer}=require('../lan-server/server.cjs');
app.setAppUserModelId('com.votrivalley.pkmsvv.lan');
app.setPath('userData',path.join(app.getPath('appData'),'PKMSVV-LAN-Beta'));
let server,win;
app.whenReady().then(async()=>{
 try{server=await startServer({root:path.join(__dirname,'..','dist','lan'),port:37816});}
 catch(e){console.error('LAN host:',e);app.quit();return;}
 win=new BrowserWindow({width:1230,height:810,minWidth:790,minHeight:540,backgroundColor:'#09283a',
  title:'Pokémon Chuyển Sinh — Chơi qua LAN',autoHideMenuBar:true,
  webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
 Menu.setApplicationMenu(null);
 await win.loadURL('http://127.0.0.1:'+server.port+'/');
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',(event,target)=>{
  if(!target.startsWith('http://127.0.0.1:'+server.port+'/'))event.preventDefault();
 });
 win.on('closed',()=>app.quit());
 console.log('Host LAN:',server.addresses.map(ip=>'http://'+ip+':'+server.port).join(', '));
}).catch(e=>{console.error(e);app.quit();});
app.on('before-quit',()=>{if(server){const s=server;server=null;s.close().catch(()=>{});}});
