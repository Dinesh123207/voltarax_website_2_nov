import {test,expect} from '@playwright/test';
const actor={_id:'synthetic-map-viewer',name:'Synthetic viewer',role:'viewer',emailVerified:true};
test.beforeEach(async({context,page,baseURL})=>{
  await context.route('**/*',route=>route.request().url().startsWith(baseURL!+'/')?route.continue():route.abort());
  await page.route('**/api/auth/me',route=>route.fulfill({json:{user:actor,siteAccess:true}}));
  await page.route('**/health',route=>route.fulfill({json:{testMode:true}}));
});
test('@public @map Hindi missing-data state never invents an India outline',async({page})=>{
  await page.route('**/api/map/boundaries',route=>route.fulfill({json:{available:false,dataQuality:'Unavailable'}}));
  await page.route('**/api/map/states',route=>route.fulfill({json:{states:[],stateAssignment:null,assignmentMatched:false}}));
  await page.goto('/hi/dashboard/map');
  await expect(page.getByRole('heading',{name:'मानचित्र डेटा उपलब्ध नहीं है'})).toBeVisible();
  await expect(page.locator('.leaflet-container')).toHaveCount(0);
  await expect(page.getByText('राज्य संबंधी मान अनुपलब्ध हैं। किसी राज्य से संबंध का अनुमान नहीं लगाया गया है।')).toBeVisible();
});
test('@public @map client-only vector map joins recorded zero and safe text with table alternative',async({page})=>{
  const name='Synthetic <img src=x onerror=alert(1)>', state={name,key:'synthetic',site_count:1,registered_devices:0,recorded_kwh:0,covered_seconds:60,period_seconds:3600,simulated:true,quality:{site_count:'Calculated',registered_devices:'Calculated',recorded_kwh:'Estimated'}};
  // Arbitrary schema square is a test fixture, not an India boundary or deployment.
  await page.route('**/api/map/boundaries',route=>route.fulfill({json:{available:true,attribution:'Synthetic schema fixture only; no geographic accuracy claim',geojson:{type:'FeatureCollection',features:[{type:'Feature',properties:{name,key:'synthetic'},geometry:{type:'Polygon',coordinates:[[[1,1],[2,1],[2,2],[1,1]]]}}]}}}));
  await page.route('**/api/map/states',route=>route.fulfill({json:{states:[state],stateAssignment:name,assignmentMatched:true}}));
  await page.goto('/dashboard/map');
  await expect(page.locator('.leaflet-interactive')).toHaveCount(1);
  await expect(page.getByRole('table')).toContainText('0.000000 kWh');
  await expect(page.getByRole('rowheader',{name})).toBeVisible();
  const shape=page.locator('.leaflet-interactive'), bounds=await shape.boundingBox(); expect(bounds).not.toBeNull();
  await shape.hover({position:{x:bounds!.width*.8,y:bounds!.height*.8}});
  await expect(page.locator('.leaflet-tooltip')).toContainText(name);
  await expect(page.locator('.leaflet-tooltip img')).toHaveCount(0);
  await expect(page.getByRole('region',{name:'State boundary map. Equivalent values are in the table below.'})).toBeVisible();
  await page.goto('/dashboard/users');await expect(page.locator('.leaflet-container')).toHaveCount(0);
});
