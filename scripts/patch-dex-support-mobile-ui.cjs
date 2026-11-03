'use strict';
/* v1.5.85: Preserve original dex filter semantics while making options a
 * single mobile-friendly Sort/Filter popover. All three platforms share this.
 */
const fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'../vendor/pokesurvivor');
function replaceOnce(file,from,to){
 const p=path.join(base,file),old=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
 if(old.split(from).length!==2)throw Error('Dex compact source drift in '+file+': '+from.slice(0,90));
 fs.writeFileSync(p,old.replace(from,to),'utf8');
}
const dexFile='js/ui/menu.js';
replaceOnce(dexFile,
 "  const GEN_NAMES = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Teselia', 'Kalos', 'Alola', 'Galar', 'Paldea'];",
 "  const GEN_NAMES = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Paldea'];\n"+
 "  const tr=(vi,en)=>G.I18n?.lang==='en'?en:vi;\n"+
 "  const RAR_VI=['','Thường','Khá hiếm','Hiếm','Sử thi','Huyền thoại'];\n"+
 "  const RAR_EN=['','Common','Uncommon','Rare','Epic','Legendary'];");
replaceOnce(dexFile,
 "  const SORTS = [['num', 'Nº'], ['name', 'Nombre'], ['rar', 'Rareza'], ['new', 'Recién conseguidos'], ['used', 'Más usados']];",
 "  const SORTS = [['num','Số','Number'],['name','Tên','Name'],['rar','Độ hiếm','Rarity'],['new','Vừa thu thập','Recently caught'],['used','Chơi nhiều nhất','Most used']];");
replaceOnce(dexFile,
 "if (dexSel == null) { dexSel = s.partner; dexGen = G.DEX_BY[s.partner].gen; }",
 "if (dexSel == null) { dexSel = s.partner; dexGen = 0; }");
replaceOnce(dexFile,"['Todas', ...GEN_NAMES].forEach((name, g) => {",
 " [tr('Tất cả Gen','All Generations'), ...GEN_NAMES].forEach((name, g) => {");
replaceOnce(dexFile,
 "    for (const [k, label] of [['all', 'Todos'], ['own', 'Tengo'], ['miss', 'Me faltan']])",
 "    for (const [k, label] of [['all',tr('Tất cả','All')],['own',tr('Đã có','Owned')],['miss',tr('Chưa có','Missing')]])");
replaceOnce(dexFile,
 "    chip(G.Icons.html('star', 12) + ' Favoritos', dexF.fav, () => { dexF.fav = !dexF.fav; });\n",
 "");
replaceOnce(dexFile,
 "      chip(G.Icons.rarity(r, 12) + ' ' + G.Gacha.RARITY_NAME[r], dexF.rar.has(r), () => { dexF.rar.has(r) ? dexF.rar.delete(r) : dexF.rar.add(r); });",
 "      chip(G.Icons.rarity(r, 12) + ' ' + tr(RAR_VI[r],RAR_EN[r]), dexF.rar.has(r), () => { dexF.rar.has(r) ? dexF.rar.delete(r) : dexF.rar.add(r); });");
replaceOnce(dexFile,
 "    sb.innerHTML = '<span class=\"sub\">Orden:</span>';",
 "    sb.innerHTML = '<span class=\"sub\">'+tr('Thứ tự:','Sort order:')+'</span>';");
replaceOnce(dexFile,
 "    for (const [k, label] of SORTS) {",
 "    for (const [k, label, en] of SORTS) {");
replaceOnce(dexFile,
 "      c.textContent = label;",
 "      c.textContent = tr(label,en);");
replaceOnce(dexFile,
 "    ts.value = dexF.type;",
 "    ts.options[0].textContent=tr('Tất cả hệ','All types');\n"+
 "    for(const opt of ts.options)if(opt.value)opt.textContent=G.T(G.U.TYPE_NAME[opt.value]);\n"+
 "    ts.value = dexF.type;");
replaceOnce(dexFile,
 "    if (q.value !== dexF.q) q.value = dexF.q;",
 "    q.placeholder=tr('Tìm theo tên hoặc số Pokédex','Search Pokémon name or number');\n"+
 "    if (q.value !== dexF.q) q.value = dexF.q;");
replaceOnce(dexFile,
 "    $('dex-clear').onclick = () => { dexF = DEX0(); openDex(); };\n    renderGrid();",
 "    $('dex-clear').textContent=tr('Xóa lọc','Clear filters');\n"+
 "    $('dex-clear').onclick = () => { dexGen=0;dexF = DEX0();openDex(); };\n"+
 "    const fav=$('pkmsvv-dex-fav'),toggle=$('pkmsvv-dex-sort-toggle'),panel=$('pkmsvv-dex-sort-menu');\n"+
 "    fav.innerHTML=G.Icons.html('star',14)+' '+tr('Yêu thích','Favorites');\n"+
 "    fav.classList.toggle('on',dexF.fav);\n"+
 "    fav.setAttribute('aria-pressed',String(dexF.fav));\n"+
 "    fav.onclick=()=>{dexF.fav=!dexF.fav;openDex();};\n"+
 "    toggle.textContent='☷ '+tr('Sắp xếp','Sort & filter');\n"+
 "    toggle.setAttribute('aria-expanded',String(!panel.hidden));\n"+
 "    toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));};\n"+
 "    $('pkmsvv-dex-gen-label').textContent=tr('Theo thế hệ','Generation');\n"+
 "    $('pkmsvv-dex-status-label').textContent=tr('Theo loại Pokémon','Pokémon category');\n"+
 "    $('pkmsvv-dex-type-label').textContent=tr('Hệ Pokémon','Pokémon type');\n"+
 "    renderGrid();");
replaceOnce(dexFile,
 "const f = dexF, busy = f.q || f.status !== 'all' || f.shiny || f.fav || f.rar.size || f.type || f.sort !== 'num';",
 "const f = dexF, busy = dexGen!==0 || f.q || f.status !== 'all' || f.shiny || f.fav || f.rar.size || f.type || f.sort !== 'num';",);
replaceOnce(dexFile,
 "grid.innerHTML = '<p class=\"sub\" style=\"grid-column:1/-1\">Ninguno con estos filtros.</p>';",
 "grid.innerHTML = '<p class=\"sub\" style=\"grid-column:1/-1\">'+tr('Không có Pokémon phù hợp bộ lọc.','No Pokémon match your filters.')+'</p>';");
replaceOnce(dexFile,
 "      if (q) {\n",
 "      if (q) {\n"); // drift guard for original search behavior (no change)
// Keep all existing filtering and sorting functions; only replace the controls.
const original=[ 
 '    <div class="gen-tabs" id="dex-gens"></div>',
 '        <div class="dex-tools">',
 '          <input id="dex-q" type="search" placeholder="Buscar por nombre o número" autocomplete="off" spellcheck="false">',
 '          <select id="dex-type" title="Tipo"></select>',
 '          <span id="dex-count" class="sub"></span>',
 '          <button class="btn small ghost hidden" id="dex-clear" type="button">Limpiar</button>',
 '        </div>',
 '        <div class="filters" id="dex-filters"></div>',
 '        <div class="filters dex-sort" id="dex-sort"></div>'
].join('\n');
const compact=[
 '        <div class="dex-tools pkmsvv-dex-tools">',
 '          <input id="dex-q" type="search" placeholder="Tìm Pokémon theo tên hoặc số" autocomplete="off" spellcheck="false">',
 '          <button id="pkmsvv-dex-fav" class="chip" type="button" aria-pressed="false">☆ Yêu thích</button>',
 '          <button id="pkmsvv-dex-sort-toggle" class="btn small ghost" type="button" aria-controls="pkmsvv-dex-sort-menu" aria-expanded="false">☷ Sắp xếp</button>',
 '          <span id="dex-count" class="sub"></span>',
 '          <button class="btn small ghost hidden" id="dex-clear" type="button">Xóa lọc</button>',
 '        </div>',
 '        <div id="pkmsvv-dex-sort-menu" class="pkmsvv-dex-sort-menu" hidden>',
 '          <b id="pkmsvv-dex-gen-label">Theo thế hệ</b>',
 '          <div class="gen-tabs" id="dex-gens"></div>',
 '          <b id="pkmsvv-dex-status-label">Theo loại Pokémon</b>',
 '          <div class="filters" id="dex-filters"></div>',
 '          <div class="filters dex-sort" id="dex-sort"></div>',
 '          <label class="pkmsvv-dex-type-row"><span id="pkmsvv-dex-type-label">Hệ Pokémon</span><select id="dex-type" title="Hệ Pokémon"></select></label>',
 '        </div>'
].join('\n');
replaceOnce('dev.html',original,compact);
fs.appendFileSync(path.join(base,'css/style.css'),'\n'+fs.readFileSync(path.join(__dirname,'../src/pkmsvv-dex-sort-menu.css'),'utf8')+
 '\n'+fs.readFileSync(path.join(__dirname,'../src/pkmsvv-support-scroll-fix.css'),'utf8')+'\n','utf8');
console.log('PKMSVV: Pokédex generation/rarity/status/type/sort options folded into one menu; Support single-scroll modal.');
