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
  return { firebase, hosts: [...new Set(['localhost', '127.0.0.1', ...allowedHosts])] };
}
const config = loadConfig();
if (!fs.existsSync(path.join(game, 'dev.html')))
  throw new Error('Fetch pinned JPTER78/pokesurvivor revision into vendor/pokesurvivor first.');
execFileSync(process.execPath, [path.join(root, 'scripts', 'prepare-game.cjs')], { cwd: root, stdio: 'inherit' });
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
const cloudMarker = '  async function initCloud() {\n    const cfg = G.FIREBASE_CONFIG;';
if (!db.includes(cloudMarker)) throw new Error('initCloud anchor changed');
db = db.replace(cloudMarker,
  "  async function initCloud() {\n" +
  "    try { if (localStorage.getItem('pkmsvv.web.saveMode') === 'local') { localReason = 'user'; return false; } } catch (e) { /* private storage */ }\n" +
  '    const cfg = G.FIREBASE_CONFIG;');
fs.writeFileSync(dbFile, db);
const flow = path.join(game, 'js', 'game.js');
replaceOnce(flow, 'setTimeout(() => this.afterLogin(), 0);',
  "setTimeout(() => { if (restored || G.DB.mode === 'local') this.afterLogin(); else this.tapToStart(() => this.toLogin()); }, 0);");
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