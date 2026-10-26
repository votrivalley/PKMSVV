'use strict';
/* Windows browser LAN host: same complete game and WS room service,
 * no Electron dependency. Requires locally installed Node.js.
 * Launch from PKMSVV-LAN-PC-Browser-Host/START-HOST.cmd.
 */
const path=require('node:path');
const fs=require('node:fs');
const {spawn}=require('node:child_process');
const {startServer}=require('../lan-server/server.cjs');
const {startDiscovery}=require('../lan-server/discovery.cjs');
const {startOnAvailablePort}=require('./lan-startup.cjs');
const args=process.argv.slice(2);
const value=flag=>args.find(x=>x.startsWith(flag+'='))?.slice(flag.length+1);
const root=path.resolve(value('--site')||path.join(__dirname,'..','site'));
const single=value('--port');
const ports=single!==undefined?[Number(single)]:[37816,37817,37818,37819];
const skipBrowser=args.includes('--no-browser')||process.env.PKMSVV_HOST_NO_BROWSER==='1';
function getAddresses(server){
 return server.addresses?.length?server.addresses:['127.0.0.1'];
}
async function main(){
 if(!ports.every(p=>Number.isInteger(p)&&p>=0&&p<=65535))
  throw Error('Cổng LAN phải là số từ 0 đến 65535.');
 const index=path.join(root,'game','index.html');
 if(!fs.existsSync(index))throw Error('Thiếu game/index.html trong thư mục '+root);
 const {server,fallback}=await startOnAvailablePort(startServer,{root,host:'0.0.0.0',ports});
 const discovery=startDiscovery({port:server.port,logger:console.log});
 const webUrl='http://127.0.0.1:'+server.port+'/game/';
 const reachable=getAddresses(server).map(ip=>'http://'+ip+':'+server.port+'/game/');
 console.log('========== POKÉMON CHUYỂN SINH — HOST LAN ==========');
 console.log('Máy Host chơi ngay: '+webUrl);
 console.log('Bạn bè cùng Wi-Fi dùng một trong các địa chỉ:');
 for(const url of reachable)console.log('  '+url);
 if(fallback)console.log('Cổng 37816 bận; đang sử dụng cổng '+server.port);
 console.log('Giữ cửa sổ này mở khi chơi. Bấm Ctrl+C để tắt Host.');
 if(!skipBrowser&&process.platform==='win32'){
  try{
   const child=spawn('explorer.exe',[webUrl],{detached:true,stdio:'ignore'});
   child.on('error',error=>console.error('Không tự mở trình duyệt: '+error.message));
   child.unref();
  }catch(e){console.error('Hãy tự mở '+webUrl+' ('+e.message+')');}
 }
 async function stop(){
  console.log('Đang đóng LAN Host...');
  discovery.close();
  try{await server.close();}catch(_){}
  process.exit(0);
 }
 process.once('SIGINT',stop);process.once('SIGTERM',stop);
 return server;
}
if(require.main===module)main().catch(e=>{
 console.error('KHÔNG KHỞI ĐỘNG ĐƯỢC LAN HOST: '+(e.stack||e.message));
 process.exitCode=1;
});
module.exports={main,getAddresses};
