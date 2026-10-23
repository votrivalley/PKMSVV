'use strict';
// Web edition only. Do not change the established Windows/Android/Switch build.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const game = path.join(root, 'vendor', 'pokesurvivor');
const dest = path.join(root, 'dist', 'web');
function replaceOnce(file, from, to) {
  let content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  if (!content.includes(from) || content.split(from).length !== 2)
    throw new Error('Source anchor changed: ' + path.relative(root, file) + ': ' + from.slice(0, 65));
  fs.writeFileSync(file, content.replace(from, to), 'utf8');
}
function loadConfig() {
  const local = path.join(root, 'config', 'firebase.web.local.json');
  const raw = (process.env.PKMSVV_FIREBASE_CONFIG_JSON || '').trim() ||
    (fs.existsSync(local) ? fs.readFileSync(local, 'utf8') : '');
  if (!raw) {
    if (process.env.PKMSVV_WEB_PREVIEW === '1') return null;
    throw new Error('Missing own Firebase config. Set PKMSVV_FIREBASE_CONFIG_JSON or config/firebase.web.local.json; use PKMSVV_WEB_PREVIEW=1 for local-only preview.');
  }
  let parsed;
  try { parsed = JSON.parse(raw); } catch (e) { throw new Error('Firebase config must be valid JSON: ' + e.message); }
  // Reject placeholders and typos BEFORE packaging unusable online builds.
  // Never print actual apiKey in logs. Firebase Web API keys begin with AIza
  // followed by 35 base64url characters.
  if (!/^AIza[A-Za-z0-9_-]{35}$/.test(String(parsed.apiKey || ''))) {
    throw new Error('Sai Firebase apiKey: hãy copy đúng giá trị apiKey trong Firebase > Project settings > Your apps > Web app > Config. Không dùng chữ SAO_CHEP_TU_FIREBASE hoặc GIÁ_TRỊ_APIKEY_TRONG_FIREBASE.');
  }
  if (parsed.projectId !== 'pkmsvv-b84d2') {
    throw new Error('Sai Firebase projectId: chỉ sử dụng cấu hình Web App của dự án pkmsvv-b84d2.');
  }
  if (parsed.authDomain !== 'pkmsvv-b84d2.firebaseapp.com') {
    throw new Error('Sai authDomain: lấy lại toàn bộ Config từ Firebase Web App của pkmsvv-b84d2.');
  }
  if (!String(parsed.databaseURL || '').startsWith('https://pkmsvv-b84d2-default-rtdb.')) {
    throw new Error('Sai databaseURL: phải là Realtime Database của pkmsvv-b84d2.');
  }
  const allowed = ['apiKey', 'authDomain', 'projectId', 'appId', 'databaseURL', 'messagingSenderId', 'storageBucket'];
  for (const key of ['apiKey', 'authDomain', 'projectId', 'appId', 'databaseURL']) {
    if (typeof parsed[key] !== 'string' || !parsed[key].trim()) throw new Error('Firebase config missing ' + key);
  }
  if (!/^https:\/\/[a-z0-9.-]+\.firebasedatabase\.app\/?$/i.test(parsed.databaseURL) &&
      !/^https:\/\/[a-z0-9.-]+\.firebaseio\.com\/?$/i.test(parsed.databaseURL))
    throw new Error('databaseURL must be a Firebase Realtime Database HTTPS URL');
  if (/pokesurvivor-free|pokesurvivor-jpter/i.test(JSON.stringify(parsed)))
    throw new Error('Never connect Votri Valley to the original author Firebase project.');
  const allowedHosts = String(process.env.PKMSVV_ALLOWED_HOSTS || parsed.allowedHosts || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  for (const h of allowedHosts) if (!/^[a-z0-9.-]+$/.test(h) || h.startsWith('.') || h.endsWith('.'))
    throw new Error('Invalid allowed host: ' + h);
  const firebase = {};
  for (const key of allowed) if (typeof parsed[key] === 'string') firebase[key] = parsed[key];
  return { firebase, hosts: [...new Set(['localhost', '127.0.0.1', parsed.projectId.toLowerCase() + '.web.app', parsed.projectId.toLowerCase() + '.firebaseapp.com', ...allowedHosts])] };
}
const config = loadConfig();
if (!fs.existsSync(path.join(game, 'dev.html')))
  throw new Error('Fetch pinned JPTER78/pokesurvivor revision into vendor/pokesurvivor first.');
execFileSync(process.execPath, [path.join(root, 'scripts', 'prepare-game.cjs')], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [path.join(root, 'scripts', 'patch-web-multiplayer.cjs')], { cwd: root, stdio: 'inherit' });
const notesFile=path.join(game,'js','data','changelog.js');
fs.appendFileSync(notesFile,'\n'+fs.readFileSync(path.join(root,'src','pkmsvv-changelog-v13-web.js'),'utf8'),'utf8');
const uiNewsPath=path.join(game,'js','ui','news-ui.js');
let uiNews=fs.readFileSync(uiNewsPath,'utf8');
if(!uiNews.includes('Có gì mới: 1.2.1')||!uiNews.includes("What's New: 1.2.1"))throw Error('Web news version label changed');
uiNews=uiNews.replace('Có gì mới: 1.2.1','Có gì mới: 1.3').replace("What's New: 1.2.1","What's New: 1.3");
fs.writeFileSync(uiNewsPath,uiNews,'utf8');


const loginPath=path.join(game,'js','ui','login.js');
let login=fs.readFileSync(loginPath,'utf8').replace(/\r\n/g,'\n');
const noteStart=login.indexOf('  const NOTES = [');
const noteEnd=login.indexOf('  /** → true si se ha enseñado alguno. */',noteStart);
if(noteStart<0||noteEnd<0)throw Error('Notice localization source changed');
login=login.slice(0,noteStart)+String.raw`
  const NOTES = [
    { key: 'pkmsvv.web.cloud-save.vi.v2', when: cloud,
      title: ['Quan trọng: Hãy lưu tiến trình', 'Important: Save Your Progress'],
      body: ['<p>Tiến trình của bạn được giữ trên thiết bị ngay khi chơi. Để đồng bộ lên Google Cloud, hãy nhấn nút <b>Lưu</b> ở góc trên bên phải.</p><p>Hãy kiểm tra trạng thái <b>Đã lưu trên đám mây</b> trước khi đóng game hoặc chuyển sang máy khác. Nếu mất mạng, dữ liệu chưa đồng bộ sẽ chỉ nằm trên thiết bị hiện tại.</p>',
             '<p>Your progress is kept on this device as you play. Use the <b>Save</b> button at the top right to sync to Google Cloud.</p><p>Check that the game says <b>Saved to cloud</b> before closing it or switching devices. Unsynced changes remain on this device if the connection drops.</p>'] }
  ];
`+login.slice(noteEnd);
const noticeBlock="      // Otros idiomas: el aviso entero va traducido en su diccionario (por trozos sale raro); si falta, en inglés.\n      const other = G.I18n.lang !== 'es' && !en, body = $('savenote-body');\n      if (other) body.setAttribute('translate', 'no');\n      body.innerHTML = !other ? n.body[en] : G.I18n.has(n.body[0]) ? G.T(n.body[0]) : n.body[1];\n      $('savenote-ok').textContent = en ? 'Got it' : 'Entendido';";
if(!login.includes(noticeBlock))throw Error('notice body anchor');
login=login.replace(noticeBlock,
 "      const body = $('savenote-body');\n      body.setAttribute('translate','no');\n      body.innerHTML = n.body[en];\n      $('savenote-ok').textContent = en ? 'Understood' : 'Đã hiểu';");
fs.writeFileSync(loginPath,login,'utf8');

const oldHtml = fs.readFileSync(path.join(game, 'index.html'), 'utf8');
const customStyle = oldHtml.match(/<style>\s*body,button,input,select\{font-family:[\s\S]*?<\/style>/);
if (!customStyle) throw new Error('Unable to retain PKMSVV branding from offline build');
let css = customStyle[0].replace(
  /#scr-menu \[data-go="friends"\], #scr-menu \[data-go="rank"\], #btn-google, #btn-logout, #set-tabs \[data-t="acc"\], #btn-support \{ display: none !important; \}\s*/, '');
css = css.replace('</style>', '#btn-support{display:none!important}\n</style>');
const dbFile = path.join(game, 'js', 'core', 'db.js');
let db = fs.readFileSync(dbFile, 'utf8').replace(/\r\n/g, '\n');
const hostMarker = "const HOSTS = ['pokesurvivor.com', 'www.pokesurvivor.com', 'jpter78.github.io', 'localhost', '127.0.0.1'];";
if (!db.includes(hostMarker)) throw new Error('Firebase host allowlist anchor changed');
db = db.replace(hostMarker, 'const HOSTS = ' + JSON.stringify(config ? config.hosts : ['localhost', '127.0.0.1']) + ';');
// Show a useful error instead of the raw Firebase code when Google login fails.
const loginErrors = "      'auth/email-already-in-use':";
if (!db.includes(loginErrors)) throw new Error('authError mapping changed upstream');
db = db.replace(loginErrors,
  "      'auth/api-key-not-valid': 'Lỗi khóa Firebase của trang web. Quản trị viên cần sửa apiKey trong GitHub Actions Secret rồi build/triển khai lại.',\n" +
  "      'auth/invalid-api-key': 'Khóa Firebase không hợp lệ. Hãy kiểm tra cấu hình Web App.',\n" +
  "      'auth/email-already-in-use':".replaceAll('\n', '\n'));
const cloudMarker = '  async function initCloud() {\n    const cfg = G.FIREBASE_CONFIG;';
if (!db.includes(cloudMarker)) throw new Error('initCloud anchor changed');
db = db.replace(cloudMarker,
  "  async function initCloud() {\n" +
  "    try { if (localStorage.getItem('pkmsvv.web.saveMode') === 'local') { localReason = 'user'; return false; } } catch (e) { /* private storage */ }\n" +
  '    const cfg = G.FIREBASE_CONFIG;');
fs.writeFileSync(dbFile, db);
const flow = path.join(game, 'js', 'game.js');
replaceOnce(flow, 'setTimeout(() => this.afterLogin(), 0);',
  "setTimeout(() => { " +
  "  let wantsCloud = false; " +
  "  try { wantsCloud = localStorage.getItem('pkmsvv.web.saveMode') === 'cloud'; } catch (e) {} " +
  "  if (wantsCloud && G.DB.mode !== 'cloud') { " +
  "    alert('Không thể kết nối Firebase Online. Game chưa lưu lên đám mây; hãy quay về màn hình chọn chế độ hoặc báo lỗi cho quản trị viên.'); " +
  "    window.location.replace('../'); return; " +
  "  } " +
  "  if (restored || G.DB.mode === 'local') this.afterLogin(); else this.tapToStart(() => this.toLogin()); " +
  "}, 0);");
replaceOnce(flow, 'toLogin() { this.afterLogin(); },',
  "toLogin() { G.Audio.music('village'); G.LoginUI.open(); },");
fs.writeFileSync(path.join(game, 'js', 'core', 'firebase-config.js'),
  '/* Own Firebase project only; never upstream credentials. */\nG.FIREBASE_CONFIG = ' +
  JSON.stringify(config ? config.firebase : null) + ';\n');
execFileSync(process.execPath, [path.join(game, 'tools', 'build.js'), '--sin-seo', '--expose'], { cwd: game, stdio: 'inherit' });
let html = fs.readFileSync(path.join(game, 'index.html'), 'utf8');
if (!html.includes('</head>')) throw new Error('Missing HTML head in web build');
html = html.replace(/<title>[^<]*<\/title>/, '<title>Pokémon Survivor — Votri Valley Web</title>');
html = html.replace('</head>', '<meta name="robots" content="noindex,nofollow">\n' + css + '\n</head>');
html = html.replace('Web oficial: pokesurvivor.com · si alguien te pide pagar, no somos nosotros',
  'Bản web thử nghiệm Votri Valley · không chính thức · phi thương mại');
fs.writeFileSync(path.join(game, 'index.html'), html);
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(path.join(dest, 'game'), { recursive: true });
for (const dir of ['assets', 'css', 'js'])
  fs.cpSync(path.join(game, dir), path.join(dest, 'game', dir), { recursive: true });
for (const file of ['index.html', 'favicon.ico', 'manifest.webmanifest', 'version.json',
                    'LICENSE', 'LICENSE-NONCOMMERCIAL.md', 'CREDITS.md', 'NOTICE-PKMSVV.txt']) {
  const source = path.join(game, file);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(dest, 'game', file));
}
let landing = fs.readFileSync(path.join(root, 'src', 'web', 'index.html'), 'utf8');
landing = landing.replace('data-cloud-enabled="false"', 'data-cloud-enabled="' + (!!config) + '"');
fs.writeFileSync(path.join(dest, 'index.html'), landing, 'utf8');
fs.copyFileSync(path.join(root, 'src', 'web', 'entry.js'), path.join(dest, 'entry.js'));
console.log('PKMSVV WEB READY: dist/web (Google/co-op ' + (config ? 'configured' : 'DISABLED: preview') + ')');