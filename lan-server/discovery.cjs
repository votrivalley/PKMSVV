'use strict';
/* Simple UDP advertisement to nearby Android APKs on the SAME local Wi-Fi.
 * Host still uses the WS LAN server; this only finds its address automatically.
 */
const dgram=require('node:dgram');
const os=require('node:os');
const DISCOVERY_PORT=37820,QUERY='PKMSVV_DISCOVER_V1',PROTOCOL='pkmsvv-lan-v1';
function startDiscovery({port,name=os.hostname(),listenPort=DISCOVERY_PORT,logger=()=>{}}={}){
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid LAN host port');
 const socket=dgram.createSocket({type:'udp4',reuseAddr:false});
 let closed=false;
 socket.on('message',(raw,remote)=>{
  if(raw.toString('utf8')!==QUERY||remote.size>256)return;
  const p=remote.address.split('.').map(Number);
  const local=p.length===4&&(p[0]===10||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168));
  if(!local)return;
  const message=Buffer.from(JSON.stringify({service:PROTOCOL,name:String(name).slice(0,42),port}));
  socket.send(message,remote.port,remote.address,error=>{if(error)logger('UDP reply: '+error.message);});
 });
 socket.on('error',error=>logger('UDP discovery: '+error.message));
 socket.bind(listenPort,'0.0.0.0',()=>logger('Discovery UDP listening '+listenPort));
 return {close:()=>{if(!closed){closed=true;try{socket.close();}catch(_){}}},port:listenPort};
}
module.exports={startDiscovery,DISCOVERY_PORT,QUERY,PROTOCOL};
