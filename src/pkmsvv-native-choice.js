'use strict';
/* Existing local saves are never read, reset, imported or uploaded here. */
(() => {
 const $=id=>document.getElementById(id);
 const openOnline=async()=>{
  try {
   if(window.PKMSVVNative&&typeof window.PKMSVVNative.openOnline==='function')
    return await window.PKMSVVNative.openOnline();
   const plug=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.PKMSVVScreen;
   if(plug&&typeof plug.openOnline==='function')return await plug.openOnline();
   throw Error('Native external browser is not available');
  } catch(e) {
   const msg='Không mở được Web Online. Bạn có thể mở https://pkmsvv-b84d2.web.app/ trong trình duyệt.';
   if(window.G&&G.UI&&G.UI.toast)G.UI.toast(msg,8000);
   else alert(msg);
   console.warn('PKMSVV online mode launcher',e);
  }
 };
 const offline=()=>{
  $('pkmsvv-native-choice').classList.add('hidden');
  try{sessionStorage.setItem('pkmsvv.native.choice.seen','1');}catch(e){}
 };
 const init=()=>{
  $('pkmsvv-native-offline').addEventListener('click',offline);
  $('pkmsvv-native-google').addEventListener('click',openOnline);
  $('pkmsvv-native-cloud-menu').addEventListener('click',openOnline);
  try{if(sessionStorage.getItem('pkmsvv.native.choice.seen')==='1')offline();}catch(e){}
  if(!$('pkmsvv-native-choice').classList.contains('hidden'))$('pkmsvv-native-offline').focus();
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
