'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const vi=require('../src/vi-translations.cjs');
test('Main Vietnamese screens and moves',()=>{
 assert.equal(vi.translate('Play'),'Chơi ngay');
 assert.equal(vi.translate('Settings'),'Cài đặt');
 assert.equal(vi.translate('Ember'),'Tia Lửa');
 assert.equal(vi.translate('Fire Blast'),'Đại Tự Bạo');
 assert.equal(vi.translate('Question {x} of {x}'),'Câu hỏi {x}/{x}');
});
test('Variables survive translation',()=>{
 const s=vi.translate('Defeat {x} bosses in a run');
 assert.ok(s.includes('{x}'));assert.ok(s.includes('boss'));
 assert.ok(s.includes('lượt chơi'));
});