'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
function patch(rel,from,to){
 const file=path.join(game,rel),text=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 if(text.split(from).length!==2)throw Error('Story anchor drift '+rel+': '+from.slice(0,85));
 fs.writeFileSync(file,text.replace(from,to),'utf8');
}
execFileSync(process.execPath,[path.join(root,'scripts','generate-story-art.cjs')],{cwd:root,stdio:'inherit'});
fs.copyFileSync(path.join(root,'src','pkmsvv-story.js'),path.join(game,'js','ui','pkmsvv-story.js'));
patch('dev.html','<script defer src="js/ui/test.js"></script>',
 '<script defer src="js/ui/test.js"></script>\n<script defer src="js/ui/pkmsvv-story.js"></script>');
const page=[
 '<section id="scr-pkmsvv-story" class="scr dim hidden" aria-label="Pokémon Sống Sót Chapter 0">',
 ' <div class="pkmsvv-story-screen">',
 '  <div id="pkmsvv-story-frame" class="pkmsvv-story-frame">',
 '   <img id="pkmsvv-story-image" src="assets/story/scene-1.svg" alt="Pixel art illustration">',
 '   <canvas id="pkmsvv-story-mon" class="hidden" width="180" height="170" aria-hidden="true"></canvas>',
 '   <span class="pkmsvv-story-chapter" id="pkmsvv-story-chapter">CHƯƠNG 0 · THỨC TỈNH</span>',
 '  </div>',
 '  <div class="pkmsvv-story-dialog">',
 '   <div id="pkmsvv-story-speaker">???</div><p id="pkmsvv-story-line" aria-live="off"></p>',
 '   <div class="pkmsvv-story-controls"><span id="pkmsvv-story-count">1 / 8</span>',
 '    <button id="pkmsvv-story-skip" type="button" class="btn ghost">Bỏ qua</button>',
 '    <button id="pkmsvv-story-next" type="button" class="btn gold">Tiếp ▶</button>',
 '   </div>',
 '  </div>',
 ' </div>',
 '</section>'
].join('\n');
patch('dev.html','<!-- ====== Test de personalidad ====== -->',page+'\n<!-- ====== Test de personalidad ====== -->');
patch('js/ui/ui.js',"'scr-login', 'scr-test', 'scr-result'",
 "'scr-login', 'scr-pkmsvv-story', 'scr-test', 'scr-result'");
patch('js/core/db.js',
 '      pkmsvvSkillMarks: {},   // permanently unlocked shared skill slots',
 '      pkmsvvSkillMarks: {},   // permanently unlocked shared skill slots\n      pkmsvvStorySeen: false, // skip first-time prologue for existing characters');
patch('js/core/db.js',
 '    r.pkmsvvSkillMarks = G.PKMSVVSkillTrack ? G.PKMSVVSkillTrack.merge(r.pkmsvvSkillMarks,older.pkmsvvSkillMarks)',
 '    r.pkmsvvStorySeen = !!(r.pkmsvvStorySeen || older.pkmsvvStorySeen);\n'+
 '    r.pkmsvvSkillMarks = G.PKMSVVSkillTrack ? G.PKMSVVSkillTrack.merge(r.pkmsvvSkillMarks,older.pkmsvvSkillMarks)');
patch('js/game.js','    G.LoginUI.init(); G.TestUI.init(); G.MenuUI.init();',
 '    G.LoginUI.init(); G.TestUI.init(); G.PKMSVVStory.init(); G.MenuUI.init();');
patch('js/game.js',
 '    if (!G.DB.save.partner) G.TestUI.start();',
 '    if (!G.DB.save.partner) {\n'+
 '      if(G.DB.save.pkmsvvStorySeen)G.TestUI.start();\n'+
 '      else G.PKMSVVStory.prologue(()=>G.TestUI.start());\n'+
 '    }');
patch('js/ui/test.js',
 '    G.Flow.goMenu();',
 '    G.PKMSVVStory.reveal(dex,()=>G.Flow.goMenu());');
patch('dev.html',
 '<button class="menu-item" data-go="upgrades">Mejoras<small>Haz más fuerte cada run</small></button>',
 '<button class="menu-item" data-go="upgrades">Mejoras<small>Haz más fuerte cada run</small></button>\n'+
 '        <button class="menu-item" data-go="memories"><span id="pkmsvv-memory-title">Ký Ức</span><small id="pkmsvv-memory-sub">Xem lại Chương 0 · Thức tỉnh</small></button>');
patch('js/ui/menu.js',"upgrades: 'up',","upgrades: 'up', memories: 'book',");
patch('js/ui/menu.js',
 '    const s = G.DB.save;\n    const mon = G.DEX_BY[s.partner];',
 "    const s = G.DB.save;\n    const memo = document.getElementById('pkmsvv-memory-title');\n"+
 "    if(memo){memo.textContent=G.I18n.lang==='en'?'Memories':'Ký Ức';document.getElementById('pkmsvv-memory-sub').textContent=G.I18n.lang==='en'?'Replay Chapter 0 · Awakening':'Xem lại Chương 0 · Thức tỉnh';}\n"+
 '    const mon = G.DEX_BY[s.partner];');
patch('js/ui/menu.js',"else if (go === 'upgrades') G.PKMSVVUpgradeChooser.open();",
 "else if (go === 'upgrades') G.PKMSVVUpgradeChooser.open();\n        else if (go === 'memories') G.PKMSVVStory.replay();");
fs.appendFileSync(path.join(game,'css','style.css'),'\n'+fs.readFileSync(path.join(root,'src','pkmsvv-story.css'),'utf8')+'\n','utf8');
console.log('PKMSVV Chapter 0: pixel scenes + replay + personality quiz / choice reveal integrated');
