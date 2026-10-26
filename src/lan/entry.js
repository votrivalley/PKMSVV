'use strict';
// Direct entry: no duplicate "Vào game" page. Does not delete or overwrite saves.
(()=>{
 try{localStorage.setItem('pkmsvv.web.saveMode','local');}
 catch(e){console.warn('LAN local save selection unavailable',e);}
 location.replace('/game/');
})();