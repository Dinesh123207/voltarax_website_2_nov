const test=require('node:test'),assert=require('node:assert/strict');
const {readingFreshness}=require('../services/readingFreshness');
const {estimatedSavings}=require('../services/energy');
const {readingState}=require('../../frontend/lib/clock.ts');
test('reading last-updated uses the server policy, crosses expiry without a response and rejects missing/future clocks',()=>{
  const now=2000000000,policy=readingFreshness({ts:now-10},{now,env:{MAX_TELEMETRY_AGE_SECONDS:'60'}});
  assert.equal(policy.fresh,true);assert.equal(policy.max_age_seconds,60);assert.equal(readingState(policy,now*1000),'fresh');
  assert.equal(readingState(policy,(now+51)*1000),'offline');assert.equal(readingState(policy,now*1000,false),'offline');assert.equal(readingState(null,now*1000),'unavailable');
  assert.equal(readingFreshness(null,{now,env:{}}).last_seen,null);assert.equal(readingFreshness({ts:now+301},{now,env:{}}).fresh,false);
  assert.throws(()=>readingFreshness({ts:now},{now,env:{MAX_TELEMETRY_AGE_SECONDS:'invalid'}}));assert.equal(readingState({...policy,last_seen:'bad'},now*1000),'unavailable');
});
test('estimated rupees require recorded energy and an explicit finite tariff, preserving actual zero',()=>{
  assert.equal(estimatedSavings(2.5,'8'),20);assert.equal(estimatedSavings(0,'8'),0);assert.equal(estimatedSavings(2.5,'0'),0);
  for(const tariff of ['',undefined,null,'not configured','Infinity','-1'])assert.equal(estimatedSavings(2.5,tariff),null);
  assert.equal(estimatedSavings(null,'8'),null);assert.equal(estimatedSavings(NaN,'8'),null);assert.equal(estimatedSavings(1e300,'1e300'),null);
});
