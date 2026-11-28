'use strict';
// Open the real local sprite viewer; validate transparent pixel data and every
// direction for every action (including explicitly declared source aliases).
// Never synthesize sprites or change gameplay flags.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
(async()=>{
 const root=path.resolve('dist/mega-recovery-preview'),registry=JSON.parse(fs.readFileSync(path.join(root,'registry.json'),'utf8'));
 assert.equal(Object.keys(registry).length,5);
 const browser=await chromium.launch({headless:true,executablePath:process.env.PKMSVV_BROWSER||'/usr/bin/google-chrome',args:['--allow-file-access-from-files']});
 const page=await browser.newPage({viewport:{width:1200,height:1020}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.goto(pathToFileURL(path.join(root,'index.html')).href,{waitUntil:'load'});
  const report=await page.evaluate(async registry=>{
   const rows=[];
   for(const f of Object.values(registry))for(const variant of ['normal','shiny'])for(const [action,m] of Object.entries(variant==='shiny'?f.meta.sa:f.meta.a)){
    const img=new Image();img.src='assets/pokemon/'+f.spriteId+(variant==='shiny'?'/s/':'/')+action+'.png';
    await img.decode();
    const cv=document.createElement('canvas');cv.width=m.w;cv.height=m.h;
    const ctx=cv.getContext('2d',{willReadFrequently:true});let occupied=0,emptyFrames=0,transparentFrames=0;
    // Local file images can taint a canvas on some Chrome builds. The runner
    // grants file access only to the trusted local viewer; nothing remote.
    for(let d=0;d<8;d++){
     let hasDirection=false;
     for(let i=0;i<m.n;i++){
      ctx.clearRect(0,0,m.w,m.h);ctx.drawImage(img,i*m.w,d*m.h,m.w,m.h,0,0,m.w,m.h);
      const data=ctx.getImageData(0,0,m.w,m.h).data;let opaque=0,transparent=0;
      for(let j=3;j<data.length;j+=4){if(data[j]>0)opaque++;else transparent++;}
      if(opaque)hasDirection=true;else emptyFrames++;
      if(transparent)transparentFrames++;
     }
     if(hasDirection)occupied++;
    }
    rows.push({key:f.key,variant,action,directions:occupied,emptyFrames,transparentFrames,frames:m.n*8,width:img.naturalWidth,height:img.naturalHeight});
   }
   return rows;
  },registry);
  fs.writeFileSync(path.join(root,'pixel-audit.json'),JSON.stringify(report,null,2));
  assert.equal(report.length,70);
  for(const row of report){assert.equal(row.directions,8,JSON.stringify(row));assert.ok(row.transparentFrames>0,JSON.stringify(row));}
  for(const action of ['Idle','Walk','Attack']){
   await page.selectOption('#act',action);
   await page.waitForFunction(()=>[...document.querySelectorAll('canvas')].length===10&&[...document.querySelectorAll('canvas')].every(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return d.some((a,i)=>i%4===3&&a>0);}),null,{timeout:15000});
   await page.screenshot({path:path.join(root,action.toLowerCase()+'-preview.png'),fullPage:true});
  }
  assert.deepEqual(errors,[]);
  console.log('MEGA_RECOVERY_PIXEL_PASS='+JSON.stringify({forms:5,variants:10,sheets:report.length,directions:report.reduce((n,r)=>n+r.directions,0)}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
