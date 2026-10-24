'use strict';
/* Pause ALL game audio when its tab/window is hidden or unfocused.
 * The village/menu song is an independent <audio> OGG: suspending WebAudio
 * alone does not silence it. Preserve its currentTime and user mute settings.
 */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'vendor','pokesurvivor','js','core','audio.js');
let source=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
function replaceOnce(from,to){
 const pieces=source.split(from);
 if(pieces.length!==2)throw Error('Background audio patch: source changed at '+from.slice(0,85));
 source=pieces.join(to);
}
replaceOnce(
 "    ctx = new AC();",
 "    ctx = new AC();\n"+
 "    // Guard against an async resume racing with a window minimize.\n"+
 "    ctx.onstatechange = () => {\n"+
 "      if (pkmsvvAudioBackground && ctx.state === 'running') ctx.suspend().catch(() => {});\n"+
 "    };");
replaceOnce(
 "  function unlock() {\n    if (!init()) return;",
 "  function unlock() {\n    if (pkmsvvAudioBackground || document.hidden) return;\n    if (!init()) return;");
// There are two el.play() sites (initial song + retry). Patch ONLY the one
// located inside startCustomMusic, never the recovery path.
{
 const songStart=source.indexOf('  function startCustomMusic(name) {');
 const songEnd=source.indexOf('  /** Cambia de tema',songStart);
 const playback='    el.play().catch((err) => {';
 const pos=source.indexOf(playback,songStart);
 if(songStart<0||songEnd<0||pos<songStart||pos>=songEnd)
  throw Error('Background audio patch: custom song playback site changed');
 source=source.slice(0,pos)+
   '    // Defer fresh music starts until the window is foregrounded.\n'+
   '    if (pkmsvvAudioBackground || document.hidden) return;\n'+
   source.slice(pos);
}
replaceOnce(
 "  function ensureMusic() {\n    if (!wanted) return;",
 "  function ensureMusic() {\n    if (pkmsvvAudioBackground || document.hidden || !wanted) return;");
replaceOnce(
 "  document.addEventListener('visibilitychange', () => {\n"+
 "    if (!document.hidden) ensureMusic();\n"+
 "  });\n"+
 "  addEventListener('focus', ensureMusic);\n"+
 "  addEventListener('pageshow', ensureMusic);\n"+
 "  setInterval(() => { if (!document.hidden) ensureMusic(); }, 2500);",
 "  // Web tab switches, Electron minimize/Alt+Tab, Android app backgrounding.\n"+
 "  // Keep mute/volume preferences unchanged and resume at the song's position.\n"+
 "  let pkmsvvAudioBackground = !!document.hidden;\n"+
 "  function pkmsvvSetAudioBackground(background) {\n"+
 "    if (pkmsvvAudioBackground === background) {\n"+
 "      if (!background) ensureMusic();\n"+
 "      return;\n"+
 "    }\n"+
 "    pkmsvvAudioBackground = background;\n"+
 "    if (background) {\n"+
 "      if (customAudio && !customAudio.paused) customAudio.pause();\n"+
 "      if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});\n"+
 "      return;\n"+
 "    }\n"+
 "    if (!ctx || ctx.state === 'running') { ensureMusic(); return; }\n"+
 "    if (ctx.state !== 'closed') ctx.resume().then(() => {\n"+
 "      if (pkmsvvAudioBackground || document.hidden) ctx.suspend().catch(() => {});\n"+
 "      else ensureMusic();\n"+
 "    }).catch(() => {});\n"+
 "  }\n"+
 "  document.addEventListener('visibilitychange', () => pkmsvvSetAudioBackground(!!document.hidden));\n"+
 "  addEventListener('blur', () => pkmsvvSetAudioBackground(true));\n"+
 "  addEventListener('focus', () => { if (!document.hidden) pkmsvvSetAudioBackground(false); });\n"+
 "  addEventListener('pagehide', () => pkmsvvSetAudioBackground(true));\n"+
 "  addEventListener('pageshow', () => { if (!document.hidden) pkmsvvSetAudioBackground(false); });\n"+
 "  document.addEventListener('pause', () => pkmsvvSetAudioBackground(true));\n"+
 "  document.addEventListener('resume', () => { if (!document.hidden) pkmsvvSetAudioBackground(false); });\n"+
 "  setInterval(() => { if (!pkmsvvAudioBackground && !document.hidden) ensureMusic(); }, 2500);");
replaceOnce(
 "    if (!ctx || !current || ctx.state !== 'running') return;",
 "    if (pkmsvvAudioBackground || document.hidden || !ctx || !current || ctx.state !== 'running') return;");
fs.writeFileSync(file,source,'utf8');
console.log('PKMSVV: background audio pauses on blur/visibility/minimize and resumes without changing mute preferences.');
