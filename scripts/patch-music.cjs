'use strict';
/* PKMSVV v0.9.2: audio interruption recovery for Windows, Android, Switch. */
const fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'..','vendor','pokesurvivor');
function patch(file,from,to){
 const filename=path.join(dir,file);
 const raw=fs.readFileSync(filename,'utf8').replace(/\r\n/g,'\n');
 const parts=raw.split(from);
 if(parts.length!==2)throw Error('Music patch: source changed ('+file+'): '+from.slice(0,90));
 fs.writeFileSync(filename,parts.join(to),'utf8');
}
patch("js/core/audio.js","    if (ctx.state !== 'running') ctx.resume().catch(() => {});\n    if (wanted && !current && !customAudio) {\n      if (PKMSVV_CUSTOM_MUSIC[wanted]) startCustomMusic(wanted);\n      else startSong(wanted);\n    }","    // Run the approved OGG on the first user gesture, not only after an async AudioContext resume.\n" +
 "    if (wanted && PKMSVV_CUSTOM_MUSIC[wanted]) {\n" +
 "      if (!customAudio) startCustomMusic(wanted);\n" +
 "      else if (customAudio.paused) customAudio.play().catch(() => {});\n" +
 "    }\n" +
 "    if (ctx.state !== 'running') {\n      ctx.resume().then(() => ensureMusic()).catch(() => {});\n      return;\n    }\n    ensureMusic();");
patch("js/core/audio.js","    if (wanted === name) return;","    if (wanted === name) { if (name) ensureMusic(); return; }");
patch("js/core/audio.js","  // Planificador: programa con 150 ms de antelación.","  // Recover after the game loses audio focus, tab suspension or screen lock.\n  let pkmsvvResuming = false;\n  let pkmsvvMediaRetry = false;\n  function ensureMusic() {\n    if (!wanted) return;\n    if (!ctx && !init()) return;\n    if (ctx.state !== 'running') {\n      if (ctx.state === 'closed' || pkmsvvResuming) return;\n      pkmsvvResuming = true;\n      ctx.resume().then(() => {\n        pkmsvvResuming = false;\n        ensureMusic();\n      }).catch(() => { pkmsvvResuming = false; });\n      return;\n    }\n    if (customAudio) {\n      const el = customAudio;\n      if (el.paused && !pkmsvvMediaRetry) {\n        pkmsvvMediaRetry = true;\n        el.play().catch((err) => {\n          // Autoplay denied: keep custom OGG pending for the next user gesture.\n          if (customAudio === el && err && err.name !== 'NotAllowedError' && err.name !== 'AbortError') console.warn('PKMSVV: custom music retry failed:', err);\n        }).finally(() => { pkmsvvMediaRetry = false; });\n      }\n      return;\n    }\n    if (!current) {\n      if (PKMSVV_CUSTOM_MUSIC[wanted]) startCustomMusic(wanted);\n      else startSong(wanted);\n    }\n  }\n  document.addEventListener('visibilitychange', () => {\n    if (!document.hidden) ensureMusic();\n  });\n  addEventListener('focus', ensureMusic);\n  addEventListener('pageshow', ensureMusic);\n  setInterval(() => { if (!document.hidden) ensureMusic(); }, 2500);\n\n  // Planificador: programa con 150 ms de antelación.");
patch("js/core/audio.js","    const c = current, sd = 60 / c.song.bpm / 4;","    const c = current, sd = 60 / c.song.bpm / 4;\n    if (c.next < ctx.currentTime - 0.4) c.next = ctx.currentTime + 0.05;");
patch("js/core/gamepad.js","    prev = now;\n\n    let x = p.axes[0] || 0, y = p.axes[1] || 0;","    prev = now;\n    if ((hit(BT.A) || hit(BT.START) || hit(BT.B) || hit(BT.X)) && G.Audio) G.Audio.unlock();\n\n    let x = p.axes[0] || 0, y = p.axes[1] || 0;");
console.log('PKMSVV: audio recovery and backlog protection installed.');
