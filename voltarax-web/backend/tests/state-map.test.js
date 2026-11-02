const test=require('node:test'), assert=require('node:assert/strict');
const {createStateMap}=require('../services/stateMap');
const now=Date.parse('2026-11-02T01:30:00Z'), end=now/1000;
const env={SOLAR_SITE_ID:'a',MAP_SITE_STATE:'State A'};
const setup=overrides=>createStateMap({env,now:()=>now,readBoundaries:async()=>({available:true,states:[{key:'state a',name:'State A'},{key:'state b',name:'State B'}]}),readDevices:async()=>[{site_id:'a'},{site_id:'b'}],readHistory:async(site,start,to)=>{assert.equal(site,'a');assert.equal(to,end);return [{ts:end-60,power_mw:1000000},{ts:end,power_mw:0}];},...overrides});
test('state map joins only authorized configured-site counts and recorded IST energy, never zero-fills other states',async()=>{
  const data=await setup()(); const [a,b]=data.states;
  assert.equal(a.registered_devices,1);assert.equal(a.site_count,1);assert.equal(a.recorded_kwh,1/60); assert.equal(a.covered_seconds,60);
  assert.equal(b.recorded_kwh,null); assert.equal(b.registered_devices,null);assert.equal(b.site_count,null); assert.equal(b.quality.recorded_kwh,'Unavailable');
  assert.equal(data.period.start,Date.parse('2026-11-01T18:30:00Z')/1000);assert.equal(data.assignmentMatched,true);
});
test('state map preserves recorded zero; truncated/errors/unmapped/synthetic readings are disclosed',async()=>{
  const zero=await setup({readHistory:async()=>[{ts:end-60,power_mw:0,simulated:true},{ts:end,power_mw:0}],readDevices:async()=>Array.from({length:201},()=>({site_id:'a'}))})();
  assert.equal(zero.states[0].recorded_kwh,0);assert.equal(zero.states[0].quality.recorded_kwh,'Estimated');assert.equal(zero.states[0].registered_devices,null);
  const failed=await setup({readDevices:async()=>{throw Error('offline');},readHistory:async()=>{throw Error('offline');}})();assert.equal(failed.states[0].recorded_kwh,null);assert.equal(failed.states[0].registered_devices,null);
  const missing=await setup({readBoundaries:async()=>({available:false})})();assert.equal(missing.assignmentMatched,false);assert.equal(missing.states.length,1);
  const unmapped=await setup({env:{...env,MAP_SITE_STATE:''}})();assert.equal(unmapped.states[0].site_count,null);
  const annotated=require('../services/dataQuality').annotate({geojson:{features:[{geometry:{coordinates:[[1,2]]}}]}});
  assert.deepEqual(Object.keys(annotated.quality),['geojson']);
});
