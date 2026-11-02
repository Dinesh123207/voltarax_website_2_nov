// Owned loopback test process only. Never imported by server.js or packaged in runtime images.
const {randomBytes,createHmac}=require('node:crypto');
if(process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:9000' || process.env.FIREBASE_PROJECT_ID!=='demo-voltarax' || !/^[a-f0-9]{64}$/.test(process.env.E2E_FIXTURE_TOKEN||'')) throw Error('Requires owned demo emulator and fixture nonce');
const frontendPort=process.env.E2E_FRONTEND_PORT||'38473';
if(!['3000','38473'].includes(frontendPort)) throw Error('Fixture frontend must use an allowed local port');
const frontendOrigin=`http://localhost:${frontendPort}`;
Object.assign(process.env,{NODE_ENV:'test',GCLOUD_PROJECT:'demo-voltarax',FIREBASE_DATABASE_URL:'',FIREBASE_SERVICE_ACCOUNT_JSON:'',FIREBASE_CLIENT_EMAIL:'',FIREBASE_PRIVATE_KEY:'',GOOGLE_APPLICATION_CREDENTIALS:'',
  JWT_SECRET:randomBytes(48).toString('hex'),OTP_SECRET:randomBytes(48).toString('hex'),EMAIL_ENABLED:'false',NOTIFICATIONS_ENABLED:'false',REDIS_URL:'',DATABASE_URL:'',CAMERA_ENABLED:'false',CAMERA_STREAM_URL:'',CAMERA_SNAPSHOT_URL:'',
  PAYMENTS_ENABLED:'true',PAYMENTS_MODE:'test',GST_ENABLED:'false',RAZORPAY_KEY_ID:'rzp_test_LocalFixture',RAZORPAY_KEY_SECRET:randomBytes(32).toString('hex'),RAZORPAY_WEBHOOK_SECRET:randomBytes(32).toString('hex'),
  CORS_ORIGINS:frontendOrigin,FRONTEND_URL:frontendOrigin,TRUST_PROXY_HOPS:'0',SOLAR_SITE_ID:'solar_site',SOLAR_DEVICE_ID:'simulator-01',DEVICE_SIMULATOR_ENABLED:'true',RELAY_CONTROL_ENABLED:'true',MAP_BOUNDARIES_REVIEWED:'false',MAP_SITE_STATE:''});
const env=process.env,base='http://127.0.0.1:38475';
let stage='firebase';
async function main(){
  const rules=await fetch('http://127.0.0.1:9000/.settings/rules.json?ns=demo-voltarax',{method:'PUT',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:require('node:fs').readFileSync(require('node:path').join(__dirname,'../../../firebase.rules.json'),'utf8')});
  if(rules.status!==200)throw Error('Owned demo rules installation failed');
  const express=require('express'),{db,app:firebase}=require('../../config/firebase');
  const messages=new Map(), otp=require('../../services/otp').createOtpService({secret:env.OTP_SECRET,send:async message=>messages.set(message.email+'|'+message.purpose,message.code),store:{transaction:async(key,update)=>{const result=await require('../../services/firebaseTransaction').transact(db.ref('authChallenges/'+key),update);return {committed:result.committed,value:result.snapshot.val()};}}});
  const verification=require('../../services/accountVerification');
  Object.assign(verification,{configured:()=>true,issue:otp.issue,verify:otp.verify});
  stage='accounts';const User=require('../../models/User');
  for(const [email,role,sites] of [['admin@local.test','admin',['solar_site']],['buyer@local.test','viewer',[]]]){
    stage='create-'+role;
    const user=await User.create({email,name:'Synthetic '+role,password:'synthetic-local-password-123',role:'viewer'});
    stage='verify-'+role;
    await User.secureUpdate(user._id,{emailVerified:true,role,siteIds:sites});
  }
  stage='registry';
  const registry=require('../../services/devices').getRegistry(), registration=await registry.create({device_id:'simulator-01',site_id:'solar_site',name:'Synthetic loopback device'},'synthetic-setup');
  await registry.update('simulator-01',{enabled:true,relayEnabled:true},'synthetic-setup');
  const remote=new Map();let sequence=0,sql,commerce,operations;
  // Avoid keeping a SQL WASM instance resident during account/relay-only checks.
  const getSql=()=>sql||(sql=require('../../db/client').open({pglite:true,migrate:true}));
  const getCommerce=async()=>commerce||(commerce=require('../../services/commerce').createCommerce((await getSql()).db,{env,createRemoteOrder:async data=>{const result={...data,id:'order_Local'+(++sequence),status:'created'};remote.set(result.id,result);return result;},fetchRemoteOrder:async id=>remote.get(id)}));
  const getOperations=async()=>operations||(operations=require('../../services/operations').createOperations((await getSql()).db));
  stage='routes';const routes={auth:require('../../routes/auth').createAuthRouter({otp:verification}),content:require('../../routes/content'),dashboard:require('../../routes/voltvision'),telemetry:require('../../routes/telemetry'),chat:require('../../routes/chat').createChatRouter({env:{}}),devices:require('../../routes/devices').createDeviceRouter({otp:verification}),
    operations:require('../../routes/operations').createOperationsRouter({operations:getOperations}),map:require('../../routes/map').createMapRouter(),
    commerce:require('../../routes/commerce').createCommerceRouter({commerce:getCommerce}),commerceWebhook:require('../../routes/commerce').createCommerceWebhook({commerce:getCommerce,env})};
  const product=require('../../app').createApp({env,logger:{info(){},error(){}},limiters:require('../../services/rateLimits').createLimiters(),routes,readiness:require('../../services/readiness').configuredReadiness({env})});
  const fixture=express.Router();fixture.use((req,res,next)=>req.get('x-e2e-fixture')===env.E2E_FIXTURE_TOKEN?next():res.sendStatus(404),express.json({limit:'4kb'}));
  const safe=fn=>async(req,res)=>{try{await fn(req,res);}catch{res.status(500).json({fixtureFailure:true});}};
  fixture.get('/status',(_req,res)=>res.json({ready:true,synthetic:true}));
  fixture.post('/otp',safe(async(req,res)=>{
    if(typeof req.body.email!=='string'||typeof req.body.purpose!=='string')return res.sendStatus(422);
    const code=messages.get(req.body.email+'|'+req.body.purpose);return code?res.json({code}):res.sendStatus(404);
  }));
  fixture.post('/telemetry',safe(async(_req,res)=>{
    const {syntheticReading,sendReading}=require('../../../../tools/device-simulator/index.cjs'),ts=Math.floor(Date.now()/1000);
    for(const stamp of [ts-60,ts])await sendReading({url:base,key:registration.key,reading:syntheticReading({ts:stamp})});
    res.json({synthetic:true});
  }));
  fixture.post('/ack',safe(async(_req,res)=>{
    const command=await require('../../services/relay').getRelayService().read('simulator-01');
    if(command?.status!=='pending')return res.sendStatus(409);
    const response=await fetch(base+'/api/devices/simulator-01/relay-ack',{method:'POST',headers:{'Content-Type':'application/json','X-Device-ID':'simulator-01','X-Device-Key':registration.key},body:JSON.stringify({command_id:command.id,ts:Math.floor(Date.now()/1000),success:true,output:command.desired,reason:'none'})});
    res.status(response.status).json(await response.json());
  }));
  fixture.post('/callback',safe(async(req,res)=>{
    if(!remote.has(req.body.gatewayOrderId))return res.sendStatus(404);
    const order=req.body.gatewayOrderId,payment='pay_'+order.slice(6);
    res.json({razorpay_order_id:order,razorpay_payment_id:payment,razorpay_signature:createHmac('sha256',env.RAZORPAY_KEY_SECRET).update(order+'|'+payment).digest('hex')});
  }));
  fixture.post('/capture',safe(async(req,res)=>{
    const order=remote.get(req.body.gatewayOrderId);if(!order)return res.sendStatus(404);
    const raw=JSON.stringify({event:'payment.captured',payload:{payment:{entity:{id:'pay_'+order.id.slice(6),order_id:order.id,amount:order.amount,currency:order.currency,status:'captured',captured:true}}}});
    const response=await fetch(base+'/api/commerce/webhook',{method:'POST',headers:{'Content-Type':'application/json','x-razorpay-event-id':'event_'+order.id,'x-razorpay-signature':createHmac('sha256',env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex')},body:raw});
    res.status(response.status).json(await response.json());
  }));
  const parent=express();parent.use('/api/__fixture',fixture);parent.use(product);
  const server=parent.listen(38475,'127.0.0.1');await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
  console.log('Owned synthetic E2E backend ready; no SMTP or gateway requests enabled');
  const close=()=>server.close(async()=>{if(sql)await (await sql).close();await firebase.delete();process.exit(0);});
  process.once('SIGTERM',close);process.once('SIGINT',close);
}
main().catch(error=>{console.error(JSON.stringify({event:'owned-fixture-startup-failed',stage,type:error.name,code:error.code||null,frames:String(error.stack||'').split('\n').slice(1,5)}));process.exit(1);});
