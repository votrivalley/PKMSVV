'use strict';
G.MatchMetrics=(()=>{
 let frames=0,total=0,worst=0,dropped=0,elapsed=0,routeOps=0,started=0,bytesAtReset=0;const histogram=new Uint32Array(201);
 function reset(){frames=total=worst=dropped=elapsed=routeOps=0;histogram.fill(0);started=performance.now();bytesAtReset=G.Net?.stats?.sentBytes||0;}
 function frame(cost,delta){if(!G.Coop?.active||G.Game?.state!=='playing')return;frames++;total+=cost;worst=Math.max(worst,cost);elapsed+=delta;dropped+=Math.max(0,Math.round(delta/(1000/60))-1);histogram[Math.min(200,Math.floor(cost))]++;}
 function snapshot(){let n=0,p95=0;for(;p95<200;p95++){n+=histogram[p95];if(n>=frames*.95)break;}
  const players=G.Coop?.active?G.Coop.players().filter(Boolean):[],wallSeconds=Math.max(.001,(performance.now()-started)/1000),bytes=Math.max(0,(G.Net?.stats?.sentBytes||0)-bytesAtReset);
  return {players:players.length,bots:players.filter(p=>p.lanBot).length,
   activeNests:G.EggRush?.nests?.filter(n=>!n.taken).length||0,totalPets:G.EggRush?.pets?.length||0,
   enemies:G.EnemyMgr?.count||0,chunks:G.World?.cacheMetrics?.(),routeOps,
   frames,fps:elapsed?frames*1000/elapsed:0,meanFrameMs:frames?total/frames:0,p95FrameMs:p95,worstFrameMs:worst,dropped,
   hostOutputBytes:bytes,hostBytesPerSecond:bytes/wallSeconds,wallSeconds,eggPlacement:G.EggRush?.metrics,opening:G.Spawner?.openingMetrics};
 }
 return {reset,frame,snapshot,route(n=1){routeOps+=n;}};
})();
