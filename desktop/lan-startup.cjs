'use strict';
/* Dependency-free port fallbacks to avoid EADDRINUSE crashing the desktop host. */
async function startOnAvailablePort(startServer,{root,host='0.0.0.0',ports=[37816,37817,37818,37819]}={}){
 if(!Array.isArray(ports)||!ports.length)throw Error('No LAN ports configured');
 let lastError;
 for(let index=0;index<ports.length;index++){
  const port=ports[index];
  try{
   const server=await startServer({root,host,port});
   return {server,fallback:index>0};
  }catch(e){
   lastError=e;
   if(e?.code!=='EADDRINUSE'&&e?.code!=='EACCES')throw e;
  }
 }
 const e=new Error('Các cổng LAN '+ports.join(', ')+' đều bận. Đóng Host cũ hoặc khởi động lại Windows.');
 e.code=lastError?.code||'EADDRINUSE';throw e;
}
function launchUrl(port){
 if(!Number.isInteger(port)||port<=0||port>65535)throw Error('LAN port invalid');
 return 'http://127.0.0.1:'+port+'/game/';
}
module.exports={startOnAvailablePort,launchUrl};
