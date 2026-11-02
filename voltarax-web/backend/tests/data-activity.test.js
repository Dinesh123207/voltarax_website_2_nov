const test=require('node:test'),assert=require('node:assert/strict');
const {createActivityStore,createDataFetch,emptyPayload}=require('../../frontend/lib/data-activity.ts');
const {indianNumber,indianRupees}=require('../../frontend/lib/metrics.ts');
test('data activity reports loading/empty/error, retains real zero and isolates routes without consuming responses twice',async()=>{
  const store=createActivityStore();let resolve;const request=()=>new Promise(done=>{resolve=done;});const fetch=createDataFetch(request,()=>'/dashboard/alerts',store);
  const pending=fetch('/api/alerts');assert.equal(store.get('/dashboard/alerts').loading,true);resolve(new Response('[]',{headers:{'Content-Type':'application/json'}}));const response=await pending;
  assert.deepEqual(await response.json(),[]);assert.equal(store.get('/dashboard/alerts').empty,true);assert.equal(store.get('/dashboard/other').empty,false);
  assert.equal(emptyPayload({current_power_kw:0,daily_generation_kwh:0}),false);assert.equal(emptyPayload({records:[]}),true);assert.equal(emptyPayload({current_power_kw:null}),true);
  const failed=createDataFetch(async()=>new Response('{}',{status:503}),()=>'/dashboard/map',store);await failed('/api/map/states');assert.equal(store.get('/dashboard/map').error,true);
  const recovered=createDataFetch(async()=>new Response('{"states":[{}]}'),()=>'/dashboard/map',store);await (await recovered('/api/map/states')).json();assert.equal(store.get('/dashboard/map').error,false);
  const rejected=createDataFetch(async()=>{throw Error('network unavailable');},()=>'/account/orders',store);await assert.rejects(rejected('/api/commerce/orders'));assert.equal(store.get('/account/orders').error,true);
  const absent=createDataFetch(async()=>new Response('{}',{status:404}),()=>'/account/orders/missing',store);await absent('/api/commerce/orders/missing');assert.equal(store.get('/account/orders/missing').empty,true);
});
test('Indian numeric grouping and rupees preserve valid zero and missing values',()=>{
  assert.equal(indianNumber(1234567.89),'12,34,567.89');assert.equal(indianNumber(0),'0');assert.equal(indianNumber(null),'Unavailable');assert.equal(indianRupees(1234567.5),'₹12,34,567.50');assert.equal(indianRupees(0),'₹0.00');assert.equal(indianRupees(NaN),'Unavailable');
});
