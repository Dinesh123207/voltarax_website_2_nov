import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const label=process.env.E2E_LABEL||'phase11-browser';
const fixture={_id:'synthetic-admin',name:'Synthetic Admin',email:'admin@local.test',role:'admin',siteIds:['solar_site'],isActive:true,emailVerified:true};
const assistant=require('../../../backend/services/chatAssistant').createChatAssistant({env:{}});
const baseline=Date.parse('2026-11-02T18:29:30.000Z');
const freshness={last_seen:new Date(baseline).toISOString(),valid_until:new Date(baseline+120000).toISOString(),fresh:true,max_age_seconds:120};
const write=(name:string,value:unknown)=>fs.writeFileSync(path.resolve('../../docs/test-results',`${label}-${name}.json`),JSON.stringify(value,null,2)+'\n');
const shot=(name:string)=>path.resolve('../../docs/test-results',`${label}-${name}.png`);
async function axe(page:Page,name:string){
  const file=process.env.AXE_SCRIPT||path.resolve('../../.local-tools/a11y/node_modules/axe-core/axe.min.js');
  expect(fs.existsSync(file),'Install the isolated reviewed axe-core test tool').toBe(true);
  await page.addScriptTag({path:file});
  const result=await page.evaluate(async()=>{const tool=(window as any).axe;const report=await tool.run(document,{resultTypes:['violations','incomplete']});return {version:tool.version,violations:report.violations,incomplete:report.incomplete};});
  write('axe-'+name,{path:new URL(page.url()).pathname,viewport:{width:360,height:800},...result,scope:'Automated axe checks in a synthetic owned browser; no WCAG/Lighthouse/legal certification'});
  expect(result.version).toBe('4.14.0');expect.soft(result.violations,'Measured axe violations; inspect the saved report').toEqual([]);
}
function emptyBody(url:string):unknown{
  if(url==='/api/dashboard')return {current_power_kw:null,daily_generation_kwh:null,daily_savings_inr:null,telemetry_fresh:false,freshness:{last_seen:null,valid_until:null,fresh:false},simulated:true};
  if(url==='/api/map/boundaries')return {available:false,reason:'Synthetic unavailable boundary'};
  if(url==='/api/map/states')return {states:[],stateAssignment:null,assignmentMatched:false};
  if(url==='/api/devices')return {devices:[]};
  if(url==='/api/users')return {data:[]};
  if(url.startsWith('/api/commerce/'))return {plans:[],orders:[],checkout_enabled:false,message:'Synthetic empty test catalog'};
  if(url==='/api/coating')return {areas:[],rules:[],trends:[],trendPeriodDays:30,note:'Synthetic missing observations',truncated:false};
  if(url==='/api/camera/status')return {snapshotConfigured:false,streamConfigured:false,online:null};
  if(url==='/api/forecast')return {estimated_current_power_kw:null,valid_until:null,dataQuality:'Unavailable',reason:'Synthetic missing input'};
  if(url==='/api/ai/status')return {pipeline:null,drift:null};
  if(url==='/api/carbon')return {today_kwh:null,grid_saved_inr:null,today_co2_kg:null,month_co2_kg:null,year_co2_kg:null,trees_equivalent:null,coverage_seconds:{}};
  if(url==='/api/relay')return {command:null,enabled:false};
  return [];
}
test.beforeEach(async({context,page,baseURL})=>{
  const errors:string[]=[],external:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/hydration|did not match|server rendered/i.test(message.text()))errors.push(message.text());});
  context.on('request',request=>{if(!request.url().startsWith(baseURL!+'/')&&!/^(blob:|data:)/.test(request.url()))external.push(new URL(request.url()).origin);});
  await context.route('**/*',route=>route.request().url().startsWith(baseURL!+'/')?route.continue():route.abort());
  await page.route('**/health',route=>route.fulfill({status:200,contentType:'application/json',body:'{"testMode":true}'}));
  await page.route('**/api/**',async route=>{const url=new URL(route.request().url());const body=url.pathname==='/api/auth/me'?{user:fixture,siteAccess:true}:url.pathname==='/api/telemetry/latest'?{latest:null,freshness}:url.pathname==='/api/chat'?await assistant.answer(route.request().postDataJSON()):emptyBody(url.pathname);await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});});
  (page as any).__phase11={errors,external};
});
test.afterEach(async({page})=>{expect((page as any).__phase11.errors).toEqual([]);expect((page as any).__phase11.external).toEqual([]);});
test('@phase11 original media is lazy, captioned, controllable and absent under reduced motion',async({page})=>{
  await page.goto('/');await expect(page.locator('[data-flow-variant="hero"] svg')).toBeVisible();expect(await page.locator('video').count()).toBe(0);
  await page.locator('[data-flow-variant="explainer"]').scrollIntoViewIfNeeded();expect(await page.locator('video').count()).toBe(0);
  await axe(page,'home-en-reduced');
  await page.emulateMedia({reducedMotion:'no-preference'});
  const figure=page.locator('[data-flow-variant="explainer"]'),video=figure.locator('video');await expect(video).toBeVisible();
  expect(await video.evaluate((node:HTMLVideoElement)=>node.muted)).toBe(true);await expect(video).toHaveAttribute('loop','');await expect(video).toHaveAttribute('preload','none');await expect(video.locator('track')).toHaveAttribute('kind','captions');
  await expect.poll(()=>video.evaluate((node:HTMLVideoElement)=>node.readyState)).toBeGreaterThanOrEqual(2);
  await figure.getByRole('button',{name:'Pause animation'}).click();await expect(figure).toHaveAttribute('data-motion','paused');expect(await video.evaluate((node:HTMLVideoElement)=>node.paused)).toBe(true);
  await figure.getByRole('button',{name:'Resume animation'}).click();await expect(figure).toHaveAttribute('data-motion','running');
  await page.screenshot({path:shot('explainer-360')});
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/hi');await expect(page.locator('video')).toHaveCount(0);await axe(page,'home-hi-reduced');
});
test('@phase11 savings-first grouping and last-updated expire offline without hydration or hidden ticks',async({page})=>{
  await page.clock.install({time:new Date(baseline)});
  await page.route('**/api/dashboard',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({current_power_kw:1.234,daily_generation_kwh:12345.67,daily_savings_inr:1234567.5,telemetry_fresh:true,freshness,simulated:true})}));
  await page.goto('/dashboard');await expect(page.locator('[data-metric]').first()).toContainText('Estimated Savings Today');await expect(page.locator('[data-metric]').nth(1)).toContainText('Recorded Energy Today');
  await expect(page.locator('[data-metric]').first()).toContainText('₹12,34,567.50');await expect(page.locator('[data-metric]').nth(1)).toContainText('12,345.67');
  await expect(page.locator('[data-reading-state]')).toHaveAttribute('data-reading-state','fresh');await expect(page.locator('header time')).toContainText('IST');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:shot('savings-clock-360')});await axe(page,'dashboard-savings');
  await page.clock.fastForward(121000);await expect(page.locator('[data-reading-state]')).toHaveAttribute('data-reading-state','offline');await expect(page.locator('[data-reading-state]')).toContainText('Offline - last updated');await expect(page.locator('[data-metric="Current Power"]')).toContainText('Unavailable');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  const frozen=await page.locator('header time').textContent();await page.clock.fastForward(60000);expect(await page.locator('header time').textContent()).toBe(frozen);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('header time')).not.toHaveText(frozen!);
});
test('@phase11 data screens expose loading empty offline error states at 360px with measured axe results',async({page,context})=>{
  test.setTimeout(240000);
  const screens=['/dashboard','/dashboard/panels','/dashboard/forecast','/dashboard/map','/dashboard/alerts','/dashboard/work-orders','/dashboard/cv','/dashboard/bfci','/dashboard/carbon','/dashboard/users','/dashboard/devices','/dashboard/relay','/dashboard/commerce','/account/orders','/pricing'];
  const measurements:unknown[]=[];let phase='loading',release:(()=>void)[]=[];
  await page.route('**/api/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/api/auth/me')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({user:fixture,siteAccess:true})});
    if(url.pathname==='/api/telemetry/latest')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({latest:null,freshness})});
    if(phase==='loading')await new Promise<void>(resolve=>release.push(resolve));
    return route.fulfill({status:phase==='error'?503:200,contentType:'application/json',body:JSON.stringify(phase==='error'?{success:false,message:'Synthetic service unavailable'}:emptyBody(url.pathname))});
  });
  for(const screen of screens){
    phase='loading';release=[];await page.goto(screen,{waitUntil:'domcontentloaded'});await expect(page.locator('[data-screen-state="loading"]').first()).toBeVisible();
    phase='empty';release.splice(0).forEach(resolve=>resolve());await expect(page.locator('[data-screen-state="empty"]').first()).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'360px overflow at '+screen).toBe(true);
    await axe(page,screen.replaceAll('/','-').slice(1)+'-empty');
    await context.setOffline(true);await expect(page.locator('[data-screen-state="offline"]').first()).toBeVisible();await context.setOffline(false);
    phase='error';await page.reload({waitUntil:'domcontentloaded'});await expect(page.locator('[data-screen-state="error"]').first()).toBeVisible();
    measurements.push({screen,loading:true,empty:true,offline:true,error:true,viewport:360});
  }
  write('screen-state-matrix',{measurements,synthetic:true,scope:'List/metric data screens; record details use their same shared boundary plus not-found/error states. Account/security forms retain session/validation controls.'});
});
