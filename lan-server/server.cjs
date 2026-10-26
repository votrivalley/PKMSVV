'use strict';
/* Local-network room/signalling + game-frame router. No account, Firebase or cloud saves. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {randomBytes} = require('node:crypto');
const {WebSocketServer,WebSocket} = require('ws');
const QRCode=require('qrcode');

const MAX_ROOM=10, MAX_PACKET=256*1024;
const MIMES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
 '.json':'application/json; charset=utf-8','.png':'image/png','.webp':'image/webp','.gif':'image/gif',
 '.svg':'image/svg+xml','.ico':'image/x-icon','.ogg':'audio/ogg','.mp3':'audio/mpeg','.woff2':'font/woff2'};
const privateAddress=addr=>{
 const ip=String(addr||'').replace(/^::ffff:/,'');
 if(ip==='::1'||ip==='127.0.0.1'||ip.startsWith('127.'))return true;
 if(/^10\.\d+\.\d+\.\d+$/.test(ip)||/^192\.168\.\d+\.\d+$/.test(ip))return true;
 const m=ip.match(/^172\.(\d+)\.\d+\.\d+$/);
 return !!m&&+m[1]>=16&&+m[1]<=31;
};
function lanAddresses(){
 const ips=[];
 for(const group of Object.values(os.networkInterfaces()))for(const entry of (group||[]))
  if(entry.family==='IPv4'&&!entry.internal&&privateAddress(entry.address))ips.push(entry.address);
 return [...new Set(ips)];
}
const NAME_RE=/^[\p{L}\p{N} _.-]{1,24}$/u;
function startServer({root,port=37816,host='0.0.0.0'}={}){
 if(!root||!fs.statSync(root).isDirectory())throw Error('LAN site folder missing');
 const rootAbs=fs.realpathSync(root);
 const rooms=new Map(),connections=new Map();
 const send=(ws,obj)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(obj));};
 const broadcast=(room,obj)=>{for(const uid of room.members.keys()){const c=connections.get(uid);if(c)send(c.ws,obj);}};
 const snapshot=room=>({id:room.id,mode:room.mode,host:room.host,open:room.open,
  visibility:room.visibility,members:[...room.members.values()]});
 function disconnect(c){
  connections.delete(c.uid);
  const r=rooms.get(c.room);
  if(!r)return;
  if(r.host===c.uid){
   broadcast(r,{t:'room-closed',id:r.id,reason:'host-left'});
   rooms.delete(r.id);
   for(const uid of r.members.keys()){const peer=connections.get(uid);if(peer)peer.room=null;}
  }else{
   r.members.delete(c.uid);
   broadcast(r,{t:'room',room:snapshot(r)});
  }
  c.room=null;
 }
 const safeFile=async(req,res)=>{
  if(!privateAddress(req.socket.remoteAddress)){res.writeHead(403);res.end('Not RFC1918 address '+req.socket.remoteAddress);return;}
  if(new URL(req.url,'http://localhost').pathname==='/lan/health'){
   const body=JSON.stringify({service:'pkmsvv-lan-v1'});
   res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
    'Access-Control-Allow-Origin':'*','Content-Length':Buffer.byteLength(body)});
   res.end(req.method==='HEAD'?'':body);return;
  }
  if(new URL(req.url,'http://localhost').pathname==='/lan/qr.png'){
   // Local QR lets iPhone/iPad join without typing any IP.
   const port=httpServer.address()?.port||37816,ip=lanAddresses()[0]||'127.0.0.1';
   const url='http://'+ip+':'+port+'/game/';
   const png=await QRCode.toBuffer(url,{type:'png',width:256,margin:2,errorCorrectionLevel:'M'});
   res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'no-store','Content-Length':png.length,
    'X-Content-Type-Options':'nosniff'});
   res.end(req.method==='HEAD'?'':png);return;
  }
  if(new URL(req.url,'http://localhost').pathname==='/lan/info'){
   const body=JSON.stringify({port:httpServer.address()?.port||37816,addresses:lanAddresses()});
   res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Content-Length':Buffer.byteLength(body)});
   res.end(req.method==='HEAD'?'':body);return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch(_){res.writeHead(400);res.end();return;}
  if(pathname.includes('\0')||pathname.includes('\\')){res.writeHead(400);res.end();return;}
  const relative=pathname.endsWith('/')?pathname+'index.html':pathname;
  const filename=path.resolve(rootAbs,'.'+relative);
  const relPath=path.relative(rootAbs,filename);
  if(relPath==='..'||relPath.startsWith('..'+path.sep)||path.isAbsolute(relPath)){res.writeHead(403);res.end('Invalid path');return;}
  let stat;
  try{stat=await fs.promises.stat(filename)}catch(_){res.writeHead(404);res.end('Not found');return;}
  if(!stat.isFile()){res.writeHead(404);res.end();return;}
  const real=fs.realpathSync(filename);
  const finalRel=path.relative(rootAbs,real);
  if(finalRel==='..'||finalRel.startsWith('..'+path.sep)||path.isAbsolute(finalRel)){res.writeHead(403);res.end('Invalid canonical path');return;}
  res.writeHead(200,{'Content-Type':MIMES[path.extname(filename).toLowerCase()]||'application/octet-stream',
   'Content-Length':stat.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
   'Content-Security-Policy':"default-src 'self' data: blob:; connect-src 'self' ws:; img-src 'self' data: blob:; media-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'","Referrer-Policy":"no-referrer"});
  if(req.method==='HEAD'){res.end();return;}
  fs.createReadStream(filename).pipe(res);
 };
 const httpServer=http.createServer((req,res)=>{safeFile(req,res).catch(()=>{if(!res.headersSent)res.writeHead(500);res.end();});});
 const wss=new WebSocketServer({noServer:true,maxPayload:MAX_PACKET,perMessageDeflate:false});
 httpServer.on('upgrade',(req,socket,head)=>{
  const origin=req.headers.origin||'';
  const remote=req.socket.remoteAddress;
  const requestHost=req.headers.host||'';
  if(!privateAddress(remote)||!/^\/lan\/ws$/.test(req.url||'')||
     !origin||!requestHost||origin!==('http://'+requestHost)){
   socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;
  }
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
 });
 wss.on('connection',ws=>{
  const c={ws,uid:'lan-'+randomBytes(10).toString('hex'),name:'Trainer',room:null,
   member:{dex:25,shiny:false},count:0,limitAt:Date.now()};
  connections.set(c.uid,c);
  send(ws,{t:'welcome',uid:c.uid});
  ws.on('message',(buf,isBinary)=>{
   if(isBinary||buf.length>MAX_PACKET){ws.close(1009,'Invalid message');return;}
   const now=Date.now();if(now-c.limitAt>1000){c.limitAt=now;c.count=0;}
   if(++c.count>220){ws.close(1008,'Rate limit');return;}
   let m;try{m=JSON.parse(String(buf));}catch(_){return;}
   if(!m||typeof m!=='object')return;
   if(m.t==='data'){
    const r=rooms.get(c.room);
    if(!r||typeof m.to!=='string'||!r.members.has(m.to)||!connections.has(m.to))return;
    if(r.host!==c.uid && m.to!==r.host)return; // star topology, host relays.
    if(JSON.stringify(m.data||null).length>160000)return;
    send(connections.get(m.to).ws,{t:'data',from:c.uid,data:m.data});return;
   }
   if(m.t!=='req'||!Number.isInteger(m.rid))return;
   const reply=(result,error)=>send(ws,{t:'response',rid:m.rid,ok:!error,result:result||null,error:error||null});
   const room=()=>rooms.get(c.room);
   if(m.action==='hello'){
    const name=String(m.name||'').trim();
    if(NAME_RE.test(name))c.name=name;
    reply({uid:c.uid,name:c.name});return;
   }
   if(m.action==='list'){
    reply([...rooms.values()].filter(x=>x.open&&x.visibility==='public')
     .map(x=>({id:x.id,mode:x.mode,host:x.host,size:x.members.size,name:x.members.get(x.host)?.name||'Host'})));return;
   }
   if(m.action==='create'){
    if(c.room){reply(null,'Đã ở trong phòng khác.');return;}
    const mode=['coop','royale','eggrush'].includes(m.mode)?m.mode:'coop';
    const id=randomBytes(12).toString('base64url');
    const r={id,host:c.uid,mode,visibility:m.visibility==='public'?'public':'private',open:true,members:new Map()};
    c.member={dex:Number.isInteger(m.dex)&&m.dex>0?m.dex:25,shiny:m.shiny===true};
    r.members.set(c.uid,{uid:c.uid,name:c.name,...c.member});
    rooms.set(id,r);c.room=id;reply(snapshot(r));broadcast(r,{t:'room',room:snapshot(r)});return;
   }
   if(m.action==='join'){
    if(c.room){reply(null,'Đã ở trong phòng khác.');return;}
    const id=String(m.id||''),r=rooms.get(id);
    if(!r||!r.open){reply(null,'Không tìm thấy phòng đang chờ.');return;}
    const max=r.mode==='royale'?10:4;
    if(r.members.size>=max){reply(null,'Phòng đã đủ người.');return;}
    c.member={dex:Number.isInteger(m.dex)&&m.dex>0?m.dex:25,shiny:m.shiny===true};
    c.room=id;r.members.set(c.uid,{uid:c.uid,name:c.name,...c.member});
    reply(snapshot(r));broadcast(r,{t:'room',room:snapshot(r)});return;
   }
   const r=room();
   if(m.action==='leave'){if(r)disconnect(c);reply(true);return;}
   if(!r){reply(null,'Chưa tham gia phòng.');return;}
   if(m.action==='addBot'){
    if(r.host!==c.uid){reply(null,'Chỉ Host được thêm AI.');return;}
    if(!r.open){reply(null,'Phòng đã bắt đầu, không thêm AI.');return;}
    const max=r.mode==='royale'?10:4;
    if(r.members.size>=max){reply(null,'Phòng đã đủ '+max+' người và AI.');return;}
    const picks=[25,1,4,7,133,447,175],dex=picks.includes(m.dex)?m.dex:picks[Math.floor(Math.random()*picks.length)];
    const bot={uid:'ai-'+randomBytes(8).toString('hex'),name:'AI · '+({25:'Pikachu',1:'Bulbasaur',4:'Charmander',7:'Squirtle',133:'Eevee',447:'Riolu',175:'Togepi'}[dex]),dex,shiny:false,bot:true};
    r.members.set(bot.uid,bot);reply(snapshot(r));broadcast(r,{t:'room',room:snapshot(r)});return;
   }
   if(m.action==='removeBot'){
    if(r.host!==c.uid){reply(null,'Chỉ Host được xóa AI.');return;}
    const bot=r.members.get(String(m.uid||''));
    if(!bot||bot.bot!==true){reply(null,'Không tìm thấy AI trong phòng.');return;}
    r.members.delete(bot.uid);reply(snapshot(r));broadcast(r,{t:'room',room:snapshot(r)});return;
   }
   if(m.action==='update'){
    c.member={dex:Number.isInteger(m.dex)&&m.dex>0?m.dex:25,shiny:m.shiny===true};
    r.members.set(c.uid,{uid:c.uid,name:c.name,...c.member});reply(true);
    broadcast(r,{t:'room',room:snapshot(r)});return;
   }
   if(m.action==='open'){
    if(r.host!==c.uid){reply(null,'Chỉ Host được mở/khóa phòng.');return;}
    r.open=!!m.open;reply(true);broadcast(r,{t:'room',room:snapshot(r)});return;
   }
   reply(null,'Unknown request');
  });
  ws.on('close',()=>disconnect(c));
  ws.on('error',()=>{});
 });
 return new Promise((resolve,reject)=>{
  httpServer.once('error',reject);
  httpServer.listen(port,host,()=>{
   httpServer.removeListener('error',reject);
   resolve({httpServer,wss,port:httpServer.address().port,addresses:lanAddresses(),
    close:()=>new Promise(done=>{for(const c of connections.values())c.ws.terminate();wss.close(()=>httpServer.close(done));})});
  });
 });
}
module.exports={startServer,privateAddress,lanAddresses};
