'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),dest=path.join(root,'mobile','www');
fs.rmSync(dest,{recursive:true,force:true});fs.mkdirSync(dest,{recursive:true});
fs.writeFileSync(path.join(dest,'index.html'),
 '<!doctype html><html lang="vi"><head><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>Pokémon Chuyển Sinh LAN</title></head><body><p>Chơi LAN: nhập IP Host.</p></body></html>');
const cfgPath=path.join(root,'capacitor.config.json');
const cfg=JSON.parse(fs.readFileSync(cfgPath,'utf8'));
cfg.appId='com.votrivalley.pkmsvv.lan';
cfg.appName='Pokemon Chuyen Sinh LAN';
cfg.webDir='mobile/www';
fs.writeFileSync(cfgPath,JSON.stringify(cfg,null,2)+'\n');
console.log('LAN Android client: separate appId and isolated save sandbox');
