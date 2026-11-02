// One shared probe at a time; an unhealthy upstream cannot multiply probe work.
function createReadiness({checks,now=Date.now,cacheMs=5000,timeoutMs=2000}){
  let pending=null,cached=null,checkedAt=-Infinity;
  return async()=>{
    if(cached!==null && now()-checkedAt<cacheMs)return cached;
    if(!pending)pending=Promise.allSettled(checks.map(check=>Promise.resolve().then(check))).then(results=>{
      cached=results.length>0 && results.every(result=>result.status==='fulfilled' && result.value===true);checkedAt=now();return cached;
    }).finally(()=>{pending=null;});
    let timer;
    try{return await Promise.race([pending,new Promise(resolve=>{timer=setTimeout(()=>{cached=false;checkedAt=now();resolve(false);},timeoutMs);})]);}
    finally{clearTimeout(timer);}
  };
}
function configuredReadiness({env=process.env,rateClient}={}){
  const checks=[async()=>{await require('../config/firebase').db.ref(`sites/${env.SOLAR_SITE_ID||'solar_site'}/latest/ts`).get();return true;}];
  if(env.DATABASE_URL)checks.push(async()=>{
    const {sql}=require('drizzle-orm');
    // LIMIT 0 checks schema/permissions without reading records.
    await (await require('../db/client').getRelational()).db.execute(sql`SELECT a.id FROM alerts a, work_orders w, esg_reports r, inspections i, commerce_plans p, commerce_orders o, commerce_invoices v LIMIT 0`);return true;
  });
  if(env.REDIS_URL)checks.push(async()=>!!rateClient && await rateClient.ping()==='PONG');
  return createReadiness({checks});
}
module.exports={createReadiness,configuredReadiness};
