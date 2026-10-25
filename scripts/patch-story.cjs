'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),game=path.join(root,'vendor','pokesurvivor');
function patch(rel,from,to){
 const file=path.join(game,rel),text=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 if(text.split(from).length!==2)throw Error('Story anchor drift '+rel+': '+from.slice(0,85));
 fs.writeFileSync(file,text.replace(from,to),'utf8');
}
execFileSync(process.execPath,[path.join(root,'scripts','generate-story-art.cjs')],{cwd:root,stdio:'inherit'});
// Preserve BOTH approved prologue illustrations and add a third background
// reserved for the starter Pokémon reveal. No shared map/UI sprite changes.
// The SVGs are legacy fallbacks, and missing reveal.webp falls back to gate.webp.
for(const name of ['eyes','gate','reveal']){
 const source=path.join(root,'src','story-art',name+'.webp');
 const dest=path.join(game,'assets','story',name+'.webp');
 if(fs.existsSync(source))fs.copyFileSync(source,dest);
 else if(name==='reveal')throw new Error('Chapter 0: REQUIRED new illustration src/story-art/reveal.webp is missing. Upload the approved third image to GitHub first; build will then package eyes, gate and reveal together.');
 else console.warn('Chapter 0 art missing: src/story-art/'+name+'.webp (will show the basic fallback until uploaded)');
}
// Chapter 1 gets its own visual beats (do not reuse Chapter 0 eyes/gate).
// Chapter 2 and Chapter 3 also have dedicated cutscene artworks.
// Missing optional WebP files use the in-game gate.webp fallback until uploaded.
for(const name of [
 'chapter1-echo','chapter1-fragments',
 'chapter2-orbs','chapter2-shadow',
 'chapter3-nest','chapter3-hatch'
]){
 const source=path.join(root,'src','story-art',name+'.webp');
 const dest=path.join(game,'assets','story',name+'.webp');
 if(fs.existsSync(source))fs.copyFileSync(source,dest);
 else console.warn('Story image pending: src/story-art/'+name+'.webp (falls back to gate.webp)');
}
fs.copyFileSync(path.join(root,'src','pkmsvv-story.js'),path.join(game,'js','ui','pkmsvv-story.js'));
patch('dev.html','<script defer src="js/ui/test.js"></script>',
 '<script defer src="js/ui/test.js"></script>\n<script defer src="js/ui/pkmsvv-story.js"></script>');
const page=[
 '<section id="scr-pkmsvv-story" class="scr dim hidden" aria-label="Pokémon Sống Sót Chapter 0">',
 ' <div class="pkmsvv-story-screen">',
 '  <div id="pkmsvv-story-frame" class="pkmsvv-story-frame">',
 '   <img id="pkmsvv-story-image" src="assets/story/eyes.webp" alt="Cinematic pixel-art awakening" decoding="async">',
 '   <canvas id="pkmsvv-story-mon" class="hidden" width="180" height="170" aria-hidden="true"></canvas>',
 '   <span class="pkmsvv-story-chapter" id="pkmsvv-story-chapter">CHƯƠNG 0 · THỨC TỈNH</span>',
 '  </div>',
 '  <div class="pkmsvv-story-dialog">',
 '   <div id="pkmsvv-story-speaker">???</div><p id="pkmsvv-story-line" aria-live="off"></p>',
 '   <form id="pkmsvv-story-name-form" class="pkmsvv-story-name-form hidden" autocomplete="off">',
 '    <label id="pkmsvv-story-name-label" for="pkmsvv-story-name-input">Biệt danh của bạn</label>',
 '    <div class="pkmsvv-story-name-row"><input id="pkmsvv-story-name-input" class="field" type="text" name="nickname" maxlength="16" autocapitalize="off" autocomplete="off" spellcheck="false" required>',
 '     <button class="btn gold" id="pkmsvv-story-name-save" type="submit">Đây là tên tôi!</button></div>',
 '    <p id="pkmsvv-story-name-error" role="alert" aria-live="polite"></p>',
 '   </form>',
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
patch('js/core/db.js',
 '      pkmsvvStorySeen: false, // skip first-time prologue for existing characters',
 '      pkmsvvStorySeen: false, // skip first-time prologue for existing characters\n      pkmsvvNameChosen: false, // player nickname chosen in Chapter 0');
patch('js/core/db.js',
 '    r.pkmsvvStorySeen = !!(r.pkmsvvStorySeen || older.pkmsvvStorySeen);',
 '    r.pkmsvvStorySeen = !!(r.pkmsvvStorySeen || older.pkmsvvStorySeen);\n    r.pkmsvvNameChosen = !!(r.pkmsvvNameChosen || older.pkmsvvNameChosen);');
// Local profile keys stay unchanged; only the visible player nickname is restored from their save.
patch('js/core/db.js',
 '    save = fold(loadLocal(k, name));',
 '    save = fold(loadLocal(k, name));\n    if(save.pkmsvvNameChosen && save.name) user = save.name;');
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
 '<button class="menu-item" data-go="settings">Ajustes<small>Sonido, gráficos, controles y cuenta</small></button>',
 '<button class="menu-item" data-go="settings">Ajustes<small>Sonido, gráficos, controles y cuenta</small></button>\n'+
 '        <button class="menu-item" data-go="memories"><span id="pkmsvv-memory-title">Ký Ức</span><small id="pkmsvv-memory-sub">Xem lại Chương 0 · Thức tỉnh</small></button>');
patch('js/ui/menu.js',"upgrades: 'up',","upgrades: 'up', memories: 'book',");
patch('js/ui/menu.js',
 '    const s = G.DB.save;\n    const mon = G.DEX_BY[s.partner];',
 "    const s = G.DB.save;\n    const memo = document.getElementById('pkmsvv-memory-title');\n"+
 "    // Match the final menu DOM order even after translation and other menu plugins.\n    const settingsItem=document.querySelector('#scr-menu .menu-list [data-go=\"settings\"]');\n    const memoriesItem=document.querySelector('#scr-menu .menu-list [data-go=\"memories\"]');\n    if(settingsItem&&memoriesItem&&settingsItem.nextElementSibling!==memoriesItem)settingsItem.after(memoriesItem);\n"+
 "    if(memo){memo.textContent=G.I18n.lang==='en'?'Memories':'Ký Ức';document.getElementById('pkmsvv-memory-sub').textContent=G.I18n.lang==='en'?'Replay Chapter 0 · Awakening':'Xem lại Chương 0 · Thức tỉnh';}\n"+
 '    const mon = G.DEX_BY[s.partner];');
patch('js/ui/menu.js',"else if (go === 'upgrades') G.PKMSVVUpgradeChooser.open();",
 "else if (go === 'upgrades') G.PKMSVVUpgradeChooser.open();\n        else if (go === 'memories') G.PKMSVVStory.replay();");
fs.appendFileSync(path.join(game,'css','style.css'),'\n'+fs.readFileSync(path.join(root,'src','pkmsvv-story.css'),'utf8')+'\n','utf8');
console.log('PKMSVV Chapter 0: pixel scenes + replay + personality quiz / choice reveal integrated');
