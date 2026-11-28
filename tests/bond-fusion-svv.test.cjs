'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../src/pkmsvv-bond-fusion.js'),'utf8');
function fixture(){
 const p={moves:[],slots:[],dmgDealt:0,bonds:2},enemies=[],saved={coins:55};
 const G={Game:{state:'playing',st:{time:1},player:p},PKMSVVQuickRegion:{active:true},DB:{save:saved},Coop:{active:false},LevelUp:{offer:()=>[{type:'up'},{type:'up'},{type:'up'}]},EnemyMgr:{all:()=>enemies},FX:{ring(){},burst(){}}};
 vm.runInNewContext(src,{G});const api=G.PKMSVVFusionPilot;
 const move=(id,type,cat='special',lvl=3)=>({id,type,cat,lvl,def:{maxLvl:3}});
 const enemy=(x=0)=>({x,y:0,hp:1000,hurt(d){this.hp-=d;if(this.hp<=0)this.dead=true;},applySlow(){},applyStun(){}});
 const set=(...m)=>{p.moves=m;p.slots=m.map(x=>[x]);};
 return {p,G,api,move,enemy,enemies,set,saved};
}
test('MAX+MAX guaranteed card keeps skills, slots, Bonds and save, one resonance',()=>{
 const h=fixture(),a=h.move('flamethrower','fire'),b=h.move('gust','flying','special',2);h.set(a,b);assert.equal(h.api.options(h.p),null);b.lvl=3;
 const cards=h.G.LevelUp.offer(h.p);assert.equal(cards.length,3);assert.equal(cards[2].type,'fusion');assert.equal(cards[2].apply(h.p),true);assert.equal(h.p.moves[0],a);assert.equal(h.p.moves[1],b);assert.equal(h.p.slots.length,2);assert.equal(h.p.bonds,2);assert.equal(h.saved.coins,55);assert.equal(h.api.activate(h.p,'fire-wind'),false);
});
test('five groups react to actual native hit amounts, distinct marks and bounded targets',()=>{
 const pairs=[['fire-wind','flamethrower','fire','gust','flying'],['water-electric','surf','water','thunderbolt','electric'],['ice-physical','ice-beam','ice','tackle','normal'],['poison-grass','toxic','poison','razor-leaf','grass'],['ghost-psychic','shadow-ball','ghost','psychic','psychic']];
 for(const [id,a,ta,b,tb] of pairs){const h=fixture(),m=h.move(a,ta),n=h.move(b,tb,'physical');h.set(m,n);assert.equal(h.api.activate(h.p,id),true,id);const e=h.enemy();h.enemies.push(e,...Array.from({length:9},(_,i)=>h.enemy(i+1)));assert.equal(h.api.afterHit(h.p,e,m,100),0);if(id==='poison-grass')e.dead=true;const count=h.api.afterHit(h.p,e,n,100);assert.ok(count>0&&count<=5,id);assert.ok(h.enemies[1].hp<1000,id);assert.equal(h.api.afterHit(h.p,e,n,100),0);}
});
test('reject unlearned attacks, expired marks, other owner, co-op, non-MAX and cooldown',()=>{
 const h=fixture(),a=h.move('surf','water'),b=h.move('thunderbolt','electric');h.set(a,b);h.api.activate(h.p,'water-electric');const e=h.enemy(),other=h.enemy(20);h.enemies.push(e,other);h.api.afterHit(h.p,e,a,100);h.G.Game.st.time=7;assert.equal(h.api.afterHit(h.p,e,b,100),0);h.api.afterHit(h.p,e,a,100);assert.equal(h.api.afterHit(h.p,e,b,100,{}),0);assert.equal(h.api.afterHit(h.p,e,h.move('unknown','electric'),100),0);assert.ok(h.api.afterHit(h.p,e,b,100)>0);h.api.afterHit(h.p,e,a,100);assert.equal(h.api.afterHit(h.p,e,b,100),0);h.G.Game.st.time=11;h.G.Coop.active=true;assert.equal(h.api.afterHit(h.p,e,b,100),0);h.G.Coop.active=false;b.lvl=2;assert.equal(h.api.afterHit(h.p,e,b,100),0);h.api.reset(h.p);assert.equal(h.p._pkmsvvFusionUsed,undefined);
});
test('native source has both direct and projectile hooks, guide uses text',()=>{const prep=fs.readFileSync(path.join(__dirname,'../scripts/prepare-game.cjs'),'utf8');assert.match(prep,/PKMSVVFusionPilot\?\.afterHit\?\.\(pl,e,m,dmg\)/);assert.match(prep,/PKMSVVFusionPilot\?\.afterHit\?\.\(pl,e,p.src,p.dmg\*k/);assert.doesNotMatch(src,/assets\/fusion-icons/);assert.match(src,/icon:'move:'\+source.id/);});

test('real categories: special Fighting is not physical; non-damaging moves and duplicate IDs are excluded',()=>{const h=fixture();const ice=h.move('blizzard','ice');const sword=h.move('secret-sword','fighting','special');h.set(ice,sword);assert.equal(h.api.options(h.p),null);const crunch=h.move('crunch','dark','physical');h.set(ice,crunch);assert.equal(h.api.options(h.p).recipes[0].id,'ice-physical');const support=h.move('rain-dance','water');support.dmg=0;h.set(support,h.move('thunderbolt','electric'));assert.equal(h.api.options(h.p),null);h.set({...ice,id:'same',cat:'physical'},{...ice,id:'same',cat:'physical'});assert.equal(h.api.options(h.p),null);});
test('boss damage capped, foreign/friendly enemies excluded, original skills unchanged',()=>{const h=fixture(),a=h.move('surf','water'),b=h.move('thunderbolt','electric');h.set(a,b);h.api.activate(h.p,'water-electric');const e=h.enemy(),boss=h.enemy(10),ally=h.enemy(20);boss.boss=true;ally.friendly=true;h.enemies.push(e,boss,ally);h.api.afterHit(h.p,e,a,100);assert.equal(h.api.afterHit(h.p,e,b,100),1);assert.equal(boss.hp,1000-27.5);assert.equal(ally.hp,1000);assert.equal(h.p.moves.length,2);});

test('positive placeholder damage on weather, shields and status moves cannot unlock a reaction',()=>{const h=fixture(),electric=h.move('thunderbolt','electric');for(const m of [{...h.move('rain-dance','water'),dmg:10,kind:'weather'},{...h.move('fake-water','water'),dmg:10,cat:'status'},{...h.move('fake-shield','water'),dmg:10,kind:'guard'}]){h.set(m,electric);assert.equal(h.api.options(h.p),null);}h.set(h.move('surf','water'),electric);assert.ok(h.api.options(h.p));});

test('Fusion 2.0 adapts only allied ring alpha, without reducing real reaction damage or radius',()=>{
 const h=fixture(),a=h.move('surf','water'),b=h.move('thunderbolt','electric');
 h.set(a,b);h.api.activate(h.p,'water-electric');const e=h.enemy(),other=h.enemy(20);h.enemies.push(e,other);
 let ring;h.G.FX.ring=(...args)=>ring=args;h.G.PKMSVVHordePerformance={allyAlpha:()=>.34};
 h.api.afterHit(h.p,e,a,100);assert.equal(h.api.afterHit(h.p,e,b,100),1);
 assert.equal(other.hp,945);assert.equal(ring[3],180);assert.equal(ring[4],'rgba(255,225,99,0.34)');
 h.G.Game.st.time=5;h.G.PKMSVVHordePerformance.allyAlpha=()=>1;
 h.api.afterHit(h.p,e,a,100);h.api.afterHit(h.p,e,b,100);assert.equal(other.hp,890);assert.equal(ring[4],'#ffe163');
});
