'use strict';
/* Web-only: Merge every upload with the current Firestore revision. */
const fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'..','vendor','pokesurvivor');
function patch(p,from,to){
 const file=path.join(base,p),src=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
 if(src.split(from).length!==2)throw Error('Cloud-safe anchor changed: '+p+': '+from.slice(0,75));
 fs.writeFileSync(file,src.replace(from,to),'utf8');
}
patch('js/core/db.js',
 "    if (pushing || (G.Game && G.Game.state && G.Game.state !== 'ui')) { pullT = setTimeout(pullSoon, 20000); return; }",
 "    if (pushing || pending || (G.Game && G.Game.state && G.Game.state !== 'ui')) { pullT = setTimeout(pullSoon, 20000); return; }");
patch('js/core/db.js',
 "    const doc = { save: plain(fold(save)), updatedAt: firebase.firestore.FieldValue.serverTimestamp(), v: VERSION };\n    const wr = docRef().set(doc, { mergeFields: ['save', 'updatedAt', 'v'] });",
 [
 "    // Recovery snapshot on this browser, written BEFORE touching Cloud.",
 "    const owner = uid, snapshot = plain(fold(save));",
 "    write('pkmsvv.cloudbackup.' + owner, snapshot);",
 "    const wr = fs.runTransaction(async tx => {",
 "      const ref = fs.collection('saves').doc(owner);",
 "      const current = await tx.get(ref);",
 "      const data = current.exists ? current.data() : null;",
 "      const remote = data && data.save ? migrate(data.save) : null;",
 "      // Firestore retries if a second device commits concurrently.",
 "      const merged = plain(fold(merge(snapshot, remote)));",
 "      tx.set(ref, { save: merged, updatedAt: firebase.firestore.FieldValue.serverTimestamp(), v: VERSION },",
 "        { mergeFields: ['save', 'updatedAt', 'v'] });",
 "      return merged;",
 "    });"
 ].join('\n'));
patch('js/core/db.js',
 '    pushing = Promise.race([wr, timeout]).then(() => {\n      fails = 0;',
 [
 '    pushing = Promise.race([wr, timeout]).then(merged => {',
 '      if (uid !== owner || !save) return;',
 '      // Do not mutate gameplay state during an active run.',
 "      if (G.Game && G.Game.state && G.Game.state !== 'ui') { pending = true; }",
 '      else {',
 '        applyInPlace(merge(plain(fold(save)), merged));',
 '        write(K_CLOUD + owner, save);',
 '      }',
 '      fails = 0;'
 ].join('\n'));
console.log('PKMSVV Web: transactional merge + local save recovery snapshot');
