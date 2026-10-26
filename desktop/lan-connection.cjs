'use strict';
const http=require('node:http');
const {isIP}=require('node:net');
const {privateAddress}=require('../lan-server/server.cjs');

function hostURL(address,{role='join',mode='coop'}={}){
 const text=String(address||'').trim();
 const literal=text.match(/^(?:http:\/\/)?(\d{1,3}(?:\.\d{1,3}){3})(?::(\d{1,5}))?(?:[/?#].*)?$/i);
 if(!literal||isIP(literal[1])!==4||(literal[2]&&(+literal[2]<1024||+literal[2]>65535)))
  throw Error('Nhập IPv4 nội bộ và cổng 1024–65535, ví dụ 192.168.1.20:37816.');
 let url;
 try{url=new URL(/^http:\/\//i.test(text)?text:'http://'+text);}catch(_){throw Error('Nhập IP:cổng của Host, ví dụ 192.168.1.20:37816.');}
 if(url.protocol!=='http:'||url.username||url.password||isIP(url.hostname)!==4||!privateAddress(url.hostname)||
    (url.port&&(+url.port<1024||+url.port>65535)))throw Error('Chỉ cho phép địa chỉ IPv4 trong mạng LAN và cổng 1024–65535.');
 // A bare address uses the game's port, not HTTP port 80.
 if(!url.port)url.port='37816';
 url.pathname='/game/';url.search='';url.hash='';
 url.searchParams.set('pkmsvvRole',['host','join','ai'].includes(role)?role:'join');
 url.searchParams.set('pkmsvvMode',['coop','royale','eggrush'].includes(mode)?mode:'coop');
 return url;
}
function allowedNavigation(target,origins){
 try{const u=new URL(target);return u.protocol==='http:'&&!u.username&&!u.password&&origins.has(u.origin)&&
  (u.pathname==='/game/'||u.pathname==='/game/index.html'||u.pathname==='/lan-connect.html');}catch(_){return false;}
}
function probeHost(url,{timeout=4000}={}){
 return new Promise((resolve,reject)=>{
  let settled=false,req;
  const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(value);};
  const timer=setTimeout(()=>{finish(Error('Host không phản hồi. Kiểm tra IP, cổng, cùng Wi-Fi và tường lửa.'));req?.destroy();},timeout);
  req=http.get(new URL('/lan/health',url),res=>{
   let body='';res.setEncoding('utf8');
   res.on('data',chunk=>{body+=chunk;if(body.length>4096){finish(Error('Địa chỉ này không phải Host Pokémon.'));res.destroy();}});
   res.on('error',error=>finish(error));
   res.on('end',()=>{
    try{const data=JSON.parse(body);if(res.statusCode!==200||data.service!=='pkmsvv-lan-v1')throw Error();finish(null,data);}
    catch(_){finish(Error('Không tìm thấy Host Pokémon tại IP:cổng này. Hãy mở bản LAN mới trên máy Host.'));}
   });
  });
  req.on('error',()=>finish(Error('Không kết nối được Host. Kiểm tra IP:cổng, Wi-Fi và tường lửa.')));
 });
}
module.exports={hostURL,allowedNavigation,probeHost};
