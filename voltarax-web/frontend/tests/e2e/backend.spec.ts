import {test,expect} from '@playwright/test';
import type {Page,APIRequestContext} from '@playwright/test';
const token=process.env.E2E_FIXTURE_TOKEN || '', password='synthetic-local-password-123';
const headers={'x-voltarax-request':'1'};
async function control(request:APIRequestContext,path:string,data:unknown={}){
  const response=await request.post('/api/__fixture/'+path,{headers:{'x-e2e-fixture':token},data});
  expect(response.status()).toBe(200);return response.json();
}
async function login(page:Page,email:string){
  await page.goto('/login');await page.getByLabel('Email address',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);
  const response=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/auth/login');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();expect((await response).status()).toBe(200);await expect(page).toHaveURL(/\/dashboard$/);
}
test.beforeEach(async({context,baseURL})=>{
  expect(token).toMatch(/^[a-f0-9]{64}$/);
  await context.route('**/*',route=>route.request().url().startsWith(baseURL!+'/')?route.continue():route.abort());
});
test('@backend registration OTP, real cookie login, site revocation, role access and Hindi switch',async({page,playwright,baseURL})=>{
  test.setTimeout(90000);
  const email='registration@local.test';
  await page.goto('/login');await page.getByRole('button',{name:'Create a viewer account'}).click();
  await page.getByLabel('Name',{exact:true}).fill('Synthetic Registration');await page.getByLabel('Email address',{exact:true}).fill(email);await page.getByLabel('Password (12–72 characters)',{exact:true}).fill(password);
  const registration=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/auth/register');
  await page.getByRole('button',{name:'Create account',exact:true}).click();expect((await registration).status()).toBe(202);await expect(page.getByRole('heading',{name:'Verify your email'})).toBeVisible();
  const delivered=await control(page.request,'otp',{email,purpose:'registration'});
  await page.getByLabel('Six-digit verification code').fill(delivered.code);
  const verification=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/auth/otp/verify');
  await page.getByRole('button',{name:'Verify email',exact:true}).click();expect((await verification).status()).toBe(200);await expect(page).toHaveURL(/\/dashboard$/);
  const initial=await (await page.request.get('/api/auth/me')).json();expect(initial.user.role).toBe('viewer');expect(initial.siteAccess).toBe(false);expect(initial.user.password).toBeUndefined();
  expect((await page.request.get('/api/dashboard')).status()).toBe(403);expect((await page.request.get('/api/users')).status()).toBe(403);
  await expect(page.getByText('Site data is Unavailable.',{exact:false})).toBeVisible();
  const admin=await playwright.request.newContext({baseURL,extraHTTPHeaders:headers});
  try{
    expect((await admin.post('/api/auth/login',{data:{email:'admin@local.test',password}})).status()).toBe(200);
    expect((await admin.post('/api/auth/sensitive/request',{data:{action:'user-access',target:initial.user._id}})).status()).toBe(202);
    const confirmation=await control(admin,'otp',{email:'admin@local.test',purpose:`sensitive:${(await (await admin.get('/api/auth/me')).json()).user._id}:user-access:${initial.user._id}`});
    expect((await admin.patch('/api/auth/users/'+initial.user._id+'/access',{data:{role:'operator',siteIds:['solar_site'],isActive:true,code:confirmation.code}})).status()).toBe(200);
  }finally{await admin.dispose();}
  expect((await page.request.get('/api/auth/me')).status()).toBe(401);
  await control(page.request,'telemetry');await login(page,email);
  const current=await (await page.request.get('/api/auth/me')).json();expect(current.user.role).toBe('operator');expect(current.siteAccess).toBe(true);
  expect((await page.request.get('/api/users')).status()).toBe(403);expect((await page.request.get('/api/relay')).status()).toBe(200);
  const data=await (await page.request.get('/api/dashboard')).json();expect(data.simulated).toBe(true);expect(data.quality.current_power_kw).toBe('Estimated');
  await expect(page.getByText('Estimated',{exact:true}).first()).toBeVisible();
  await page.getByRole('combobox',{name:'Language'}).selectOption('hi');await expect(page).toHaveURL(/\/hi\/dashboard$/);await expect(page.locator('html')).toHaveAttribute('lang','hi');
  await expect(page.locator('main')).toContainText('अनुमानित');
});
test('@backend administrator relay request and simulated acknowledgement keep physical feedback unavailable',async({page})=>{
  test.setTimeout(90000);await login(page,'admin@local.test');await page.goto('/dashboard/relay');
  await expect(page.getByRole('heading',{name:'Physical relay state',exact:false})).toBeVisible();
  await page.getByLabel('Requested output',{exact:true}).selectOption('off');
  const requested=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/auth/sensitive/request');
  await page.getByRole('button',{name:'Email command confirmation code'}).click();expect((await requested).status()).toBe(202);
  await expect(page.getByRole('status').filter({hasText:'Verification code requested.'})).toBeVisible();
  const user=(await (await page.request.get('/api/auth/me')).json()).user;
  const code=await control(page.request,'otp',{email:user.email,purpose:`sensitive:${user._id}:relay-command:simulator-01-off`});
  await page.getByLabel('Six-digit code',{exact:true}).fill(code.code);await page.getByRole('checkbox').check();
  const commandResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/relay/command'&&response.request().method()==='POST');
  await page.getByRole('button',{name:'Send command',exact:true}).click();expect((await (await commandResponse).json()).command.status).toBe('pending');
  const acknowledgement=await control(page.request,'ack');expect(acknowledgement.command.status).toBe('applied');
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  const latest=page.locator('.stat-card').filter({has:page.getByRole('heading',{name:'Latest command',exact:false})});
  await expect(latest).toContainText('applied');await expect(latest).toContainText('GPIO acknowledgement: OFF');
  const physical=page.locator('.stat-card').filter({has:page.getByRole('heading',{name:'Physical relay state',exact:false})});await expect(physical).toContainText('contact feedback missing');expect(await physical.getByText('Unavailable',{exact:false}).count()).toBeGreaterThan(3);
  const state=await (await page.request.get('/api/relay')).json();expect(state.load_on).toBeNull();expect(state.physical_state).toBeNull();
});
test('@backend test checkout uses actual SQL/signatures, callback stays pending and capture creates one invoice',async({page,playwright,baseURL})=>{
  test.setTimeout(90000);
  const admin=await playwright.request.newContext({baseURL,extraHTTPHeaders:headers});let plan:any;
  try{
    expect((await admin.post('/api/auth/login',{data:{email:'admin@local.test',password}})).status()).toBe(200);
    const response=await admin.post('/api/commerce/admin/plans',{data:{name:'Synthetic browser plan',description:'Local fixture only; no product or real price',pricePaise:null,active:true}});expect(response.status()).toBe(201);plan=await response.json();
    await login(page,'buyer@local.test');await page.goto('/pricing');await expect(page.getByRole('button',{name:'Checkout blocked: price unset'})).toBeDisabled();
    const updated=await admin.patch('/api/commerce/admin/plans/'+plan.id,{data:{name:plan.name,description:plan.description,pricePaise:12345,active:true,version:plan.version}});expect(updated.status()).toBe(200);
  }finally{await admin.dispose();}
  await page.reload();await page.getByRole('button',{name:'Review test order'}).click();await expect(page).toHaveURL(/\/account\/orders\/[a-f0-9-]+$/);
  const id=new URL(page.url()).pathname.split('/').at(-1)!, before=await (await page.request.get('/api/commerce/orders/'+id)).json();expect(before.order.status).toBe('pending');expect(before.invoice).toBeNull();
  // Only the third-party widget is replaced. Every product API call is real.
  await page.evaluate(nonce=>{
    window.Razorpay=class{
      constructor(private options:any){}
      on(){}
      open(){void fetch('/api/__fixture/callback',{method:'POST',headers:{'Content-Type':'application/json','x-e2e-fixture':nonce},body:JSON.stringify({gatewayOrderId:this.options.order_id})}).then(response=>response.json()).then(value=>this.options.handler(value));}
    } as any;
  },token);
  const verified=page.waitForResponse(response=>new URL(response.url()).pathname.endsWith('/verify'));
  await page.getByRole('button',{name:/Continue test checkout/}).click();expect((await verified).status()).toBe(200);
  const pending=await (await page.request.get('/api/commerce/orders/'+id)).json();expect(pending.order.status).toBe('pending');expect(pending.order.callbackVerifiedAt).toBeTruthy();expect(pending.invoice).toBeNull();
  expect((await page.request.get('/api/commerce/orders/'+id+'/invoice.pdf')).status()).toBe(404);
  await control(page.request,'capture',{gatewayOrderId:before.order.gatewayOrderId});expect((await control(page.request,'capture',{gatewayOrderId:before.order.gatewayOrderId})).duplicate).toBe(true);
  await page.getByRole('button',{name:'Refresh status'}).click();await expect(page.getByRole('link',{name:'Download test invoice PDF'})).toBeVisible();
  const after=await (await page.request.get('/api/commerce/orders/'+id)).json();expect(after.order.status).toBe('paid');expect(after.payment.amountPaise).toBe(12345);expect(after.invoice.sha256).toMatch(/^[a-f0-9]{64}$/);
  const invoice=await page.request.get('/api/commerce/orders/'+id+'/invoice.pdf');expect(invoice.status()).toBe(200);expect((await invoice.body()).subarray(0,5).toString()).toBe('%PDF-');
  expect((await page.request.get('/api/commerce/admin/orders')).status()).toBe(403);
});
