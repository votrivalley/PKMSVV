/* Generate self-contained SVG illustrations; crisp block silhouettes, no remote downloads. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
const dir=path.join(game,'assets','story');fs.mkdirSync(dir,{recursive:true});
const stars=Array.from({length:70},(_,i)=>{
 const x=(i*149+53)%640,y=(i*67+19)%208,k=i%5===0?5:2;
 return '<rect x="'+x+'" y="'+y+'" width="'+k+'" height="'+k+'" fill="'+(i%3?'#e1fcff':'#ffecab')+'" opacity="'+(.2+(i%4)*.2)+'"/>';
}).join('');
const mountains='<path d="M0 265H40V250H70V231H98V213H125V237H148V263H180V218H202V190H226V218H252V249H285V224H311V198H340V229H365V264H405V239H431V209H455V232H470V259H510V230H542V211H564V244H593V230H640V360H0Z" fill="#132d3e"/>';
const forest='<g fill="#0a3134"><path d="M0 350V280H42V258H62V218H86V260H100V284H125V350Z"/><path d="M490 350V287H530V254H554V211H582V249H598V291H640V350Z"/></g>';
const human='<g transform="translate(297 214)"><rect x="18" y="0" width="27" height="33" fill="#131f32"/><rect x="17" y="30" width="30" height="47" fill="#26394b"/><rect x="22" y="77" width="9" height="34" fill="#121c28"/><rect x="36" y="77" width="9" height="34" fill="#121c28"/><rect x="11" y="39" width="8" height="36" fill="#1a2c3a"/><rect x="45" y="39" width="8" height="36" fill="#1a2c3a"/><rect x="24" y="14" width="4" height="3" fill="#b1e1e5"/><rect x="38" y="14" width="4" height="3" fill="#b1e1e5"/></g>';
const portal='<g><rect x="268" y="74" width="106" height="191" rx="48" fill="#b8ffff" opacity=".18"/><rect x="276" y="85" width="90" height="172" rx="43" fill="#d8faff" opacity=".35"/><path d="M321 81V257M276 167H366" stroke="#f6e9a5" stroke-width="6" opacity=".8"/></g>';
const memory='<g opacity=".75"><rect x="100" y="86" width="65" height="90" fill="#4ca2b5" transform="rotate(-15 132 131)"/><rect x="155" y="114" width="40" height="75" fill="#c7dce4" transform="rotate(18 175 150)"/><rect x="453" y="87" width="72" height="103" fill="#3f9cae" transform="rotate(15 489 139)"/><rect x="493" y="193" width="47" height="56" fill="#fbdf8a" opacity=".62"/></g>';
const watcher='<g><rect x="175" y="64" width="288" height="208" rx="90" fill="#80b8c5" opacity=".13"/><rect x="203" y="100" width="105" height="26" fill="#ffeb94" opacity=".8"/><rect x="331" y="100" width="105" height="26" fill="#ffeb94" opacity=".8"/><rect x="235" y="108" width="32" height="12" fill="#193842"/><rect x="363" y="108" width="32" height="12" fill="#193842"/><rect x="304" y="141" width="26" height="5" fill="#b7eef2"/></g>';
function svg(n){
 const cols=[null,['#070d23','#183f66'],['#12243a','#52798b'],['#101433','#395c65'],['#173b48','#5cc4a2'],['#194658','#b7d9a3']][n];
 const extra=n===1?portal+human:n===2?memory+human:n===3?watcher+human:n===4?portal+forest:n===5?portal+forest:'';
 const sun=n>=4?'<rect x="260" y="84" width="116" height="116" rx="58" fill="#fff2af" opacity=".56"/>':'';
 const particles=Array.from({length:40},(_,i)=>{
  const x=(i*151+33)%640,y=(i*53+71)%300;
  return '<rect x="'+x+'" y="'+y+'" width="'+(2+(i%3)*3)+'" height="'+(2+(i%3)*3)+'" fill="'+(n>=4?'#e3f7ae':'#64c5f0')+'" opacity=".45"/>';
 }).join('');
 return '<?xml version="1.0" encoding="UTF-8"?>\n'+
 '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" shape-rendering="crispEdges">'+
 '<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="'+cols[0]+'"/><stop offset="1" stop-color="'+cols[1]+'"/></linearGradient></defs>'+
 '<rect width="640" height="360" fill="url(#sky)"/>'+stars+sun+mountains+
 '<rect x="0" y="316" width="640" height="44" fill="'+(n>=4?'#286456':'#132e36')+'"/>'+particles+extra+
 '<path d="M0 344H640" stroke="#85bdbb" stroke-width="5" opacity=".45"/></svg>';
}
for(let n=1;n<=5;n++)fs.writeFileSync(path.join(dir,'scene-'+n+'.svg'),svg(n));
console.log('PKMSVV Chapter 0: five embedded pixel-illustration SVG assets generated');
