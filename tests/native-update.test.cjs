'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {parseVersion,newer}=require('../desktop/update-check.cjs');
test('strict update tags prevent redirects to arbitrary sites',()=>{
 assert.deepEqual(parseVersion('v1.3.0'),[1,3,0]);
 assert.equal(parseVersion('https://attacker.test'),null);
 assert.equal(parseVersion('v1.3.0-beta'),null);
});
test('updates only when strictly newer',()=>{
 assert.equal(newer('v1.3.0','1.2.1'),true);
 assert.equal(newer('v1.2.1','1.2.1'),false);
 assert.equal(newer('v1.1.9','1.2.1'),false);
});
