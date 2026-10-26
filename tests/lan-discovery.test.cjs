'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {startDiscovery,QUERY,PROTOCOL,DISCOVERY_PORT}=require('../lan-server/discovery.cjs');
test('Host advertises one local Wi-Fi discovery protocol without user IP entry',()=>{
 assert.equal(QUERY,'PKMSVV_DISCOVER_V1');
 assert.equal(PROTOCOL,'pkmsvv-lan-v1');
 assert.equal(DISCOVERY_PORT,37820);
 assert.throws(()=>startDiscovery({port:999999}),/port/);
});
