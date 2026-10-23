'use strict';
/* PKMSVV Vietnamese translation. Curated text overrides all glossary rules. */
const exact = require('./vi-overrides.json');
const phrases = require('./vi-phrases.json');
const words = require('./vi-words.json');
const esc = s => s.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
const phraseList = Object.entries(phrases).sort((a,b)=>b[0].length-a[0].length);
function translate(english) {
 if(typeof english !== 'string' || !english) return english;
 if(Object.prototype.hasOwnProperty.call(exact,english)) return exact[english];
 let s=english;
 for(const [en,vi] of phraseList) s=s.replace(new RegExp('(?<![\\p{L}])'+esc(en)+'(?![\\p{L}])','giu'),vi);
 s=s.replace(/(?<![\p{L}])[A-Za-z]+(?:'[A-Za-z]+)?(?![\p{L}])/gu,w=>Object.prototype.hasOwnProperty.call(words,w.toLowerCase())?words[w.toLowerCase()]:w);
 return s.replace(/ {2,}/g,' ').trim();
}
module.exports={translate,exact,phrases,words};