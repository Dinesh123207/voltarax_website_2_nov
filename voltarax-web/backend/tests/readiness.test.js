const test=require('node:test'),assert=require('node:assert/strict');
const {createReadiness}=require('../services/readiness');
test('readiness coalesces bounded probes, caches failures and recovers after completion',async()=>{
  let resolve,calls=0,clock=0;const probe=new Promise(done=>{resolve=done;});
  const ready=createReadiness({checks:[()=>{calls++;return probe;}],now:()=>clock,cacheMs:100,timeoutMs:15});
  assert.deepEqual(await Promise.all([ready(),ready()]),[false,false]);assert.equal(calls,1);
  clock=200;assert.equal(await ready(),false);assert.equal(calls,1);
  resolve(true);await new Promise(done=>setImmediate(done));assert.equal(await ready(),true);
  assert.equal(await createReadiness({checks:[]})(),false);
  assert.equal(await createReadiness({checks:[async()=>{throw Error('private upstream detail');}]})(),false);
});
test('readiness HTTP distinguishes liveness, returns safe 503/200 and validates input',async t=>{
  const express=require('express'),empty=()=>express.Router();let available=false;
  const app=require('../app').createApp({env:{NODE_ENV:'test'},logger:{info(){},error(){}},limiters:require('../services/rateLimits').createLimiters(),routes:{auth:empty(),content:empty(),dashboard:empty(),telemetry:empty(),chat:empty()},readiness:async()=>available});
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>server.close());const base='http://127.0.0.1:'+server.address().port;
  assert.equal((await fetch(base+'/health')).status,200);
  const failure=await fetch(base+'/ready');assert.equal(failure.status,503);assert.equal(failure.headers.get('cache-control'),'no-store');assert.equal((await failure.json()).dataQuality,'Unavailable');
  assert.equal((await fetch(base+'/api/ready?site_id=other')).status,422);
  available=true;assert.equal((await fetch(base+'/api/ready')).status,200);
});
