import { test, expect } from '@playwright/test';
import path from 'node:path';
const fixture = { _id: 'synthetic-admin', name: 'Synthetic Admin', email: 'admin@local.test', role: 'admin', siteIds: ['synthetic-site'], isActive: true, emailVerified: true };
test.beforeEach(async ({ context, page, baseURL }) => {
  const remote: string[] = [], errors: string[] = [];
  context.on('request', request => { if (!request.url().startsWith(baseURL! + '/') && !/^(data:|blob:)/.test(request.url())) remote.push(new URL(request.url()).origin); });
  await context.route('**/*', route => route.request().url().startsWith(baseURL! + '/') ? route.continue() : route.abort());
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    const body = url.pathname === '/api/auth/me' ? { user: fixture, siteAccess: true } : url.pathname === '/api/users' ? { data: [fixture] } : url.pathname === '/api/dashboard' ? { telemetry_fresh: false, simulated: true } : { success: true, message: 'Your inquiry has been recorded for review.' };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.route('**/health', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ testMode: true }) }));
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /hydration|did not match|server rendered/i.test(message.text())) errors.push(message.text()); });
  (page as any).__localAudit = { remote, errors };
});
test.afterEach(async ({ page }) => {
  const audit = (page as any).__localAudit;
  expect(audit.remote, 'No page request may reach an external service').toEqual([]);
  expect(audit.errors, 'No browser exception or hydration error').toEqual([]);
});
test('@public 360px language switch, native cursor, keyboard skip and navigation', async ({ page }, testInfo) => {
  await page.goto('/'); await expect(page.getByRole('heading', { level: 1 })).toContainText('Intelligence for clean energy.');
  await page.keyboard.press('Tab'); await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('#main-content')).toBeFocused();
  expect(await page.locator('body').evaluate(node => getComputedStyle(node).cursor)).not.toBe('none');
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation', exact: true })).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Open navigation', exact: true })).toBeFocused();
  await page.getByRole('combobox', { name: 'Language' }).selectOption('hi');
  await expect(page).toHaveURL(/\/hi#main-content$/); await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('स्वच्छ ऊर्जा के लिए बुद्धिमान तकनीक।');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const contrasts = await page.locator('.text-slate-500, .text-slate-600, .text-green-700, .text-emerald-700').evaluateAll(nodes => {
    const luminance = (color: string) => { const rgb = (color.match(/[\d.]+/g) || []).slice(0, 3).map(value => Number(value) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4); return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722; };
    const background = luminance(getComputedStyle(document.body).backgroundColor);
    return nodes.filter(node => node.getClientRects().length && node.textContent?.trim()).map(node => { const foreground = luminance(getComputedStyle(node).color); return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05); });
  });
  expect(contrasts.length).toBeGreaterThan(0); expect(Math.min(...contrasts)).toBeGreaterThanOrEqual(4.5);
  await testInfo.attach('muted-text-contrast-against-page-background', { body: JSON.stringify({ samples: contrasts.length, minimum: Math.min(...contrasts), limitation: 'Solid page background; not a full WCAG or image/gradient audit' }), contentType: 'application/json' });
  await page.screenshot({ path: path.resolve('../../docs/test-results/phase08-home-hi-360.png') });
});
test('@public clock crosses IST midnight, pauses on visibility event and has stable reduced-motion text', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-02T18:29:49.000Z') });
  await page.clock.pauseAt(new Date('2026-11-02T18:29:59.000Z'));
  await page.goto('/');
  const clock = page.locator('time[data-quality="Calculated"]');
  await expect(clock).toContainText('02/11/2026'); await expect(clock).toContainText('23:59:59');
  await page.clock.fastForward(1000); await expect(clock).toContainText('03/11/2026'); await expect(clock).toContainText('00:00:00');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  const frozen = await clock.textContent(); await page.clock.fastForward(5000); expect(await clock.textContent()).toBe(frozen);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(clock).toContainText('00:00:05');
  await expect(clock).toHaveAttribute('aria-live', 'off');
  await expect(page.locator('.renewable-hero')).toContainText('Site telemetry.');
});
test('@public prepared assistant preserves entered Hindi text and returns keyboard focus', async ({ page }) => {
  await page.goto('/hi'); const trigger = page.getByRole('button', { name: 'सहायक खोलें', exact: true }); await trigger.click();
  const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'कृत्रिम बुद्धिमत्ता क्या कर सकती है?', exact: true }).click();
  await expect(dialog.getByRole('log')).toContainText('स्वचालित दृश्य वर्गीकरण');
  const original = 'निजी परीक्षण नोट — Keep original {count}';
  await dialog.getByRole('textbox', { name: 'आपका प्रश्न' }).fill(original); await dialog.getByRole('button', { name: 'भेजें', exact: true }).click();
  await expect(dialog.getByRole('log')).toContainText(original);
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
});
test('@public Hindi draft metadata, form labels and synthetic submission only', async ({ page }) => {
  const response = await page.goto('/hi/privacy'); expect(response?.headers()['x-robots-tag']).toContain('noindex');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('गोपनीयता का मसौदा');
  await expect(page.locator('main')).toContainText('सार्वजनिक उपयोग के लिए स्वीकृत नहीं');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/contact');
  const unnamed = await page.locator('main input, main select, main textarea').evaluateAll(nodes => nodes.filter(node => {
    const control = node as HTMLInputElement; return control.type !== 'hidden' && !control.disabled && !(control.labels?.length || control.getAttribute('aria-label') || control.getAttribute('aria-labelledby'));
  }).map(node => (node as HTMLInputElement).name));
  expect(unnamed).toEqual([]);
  await page.screenshot({ path: path.resolve('../../docs/test-results/phase08-contact-360.png'), fullPage: true });
  await page.locator('#contact-name').fill('Synthetic Person'); await page.locator('#contact-email').fill('synthetic@local.test');
  await page.locator('#contact-subject').fill('Synthetic browser check'); await page.locator('#contact-message').fill('Synthetic input only; no message is delivered.');
  const posted = page.waitForRequest(request => new URL(request.url()).pathname === '/api/contact' && request.method() === 'POST');
  await page.locator('form button[type="submit"]').click();
  expect((await posted).postDataJSON()).toMatchObject({ type: 'general', website: '', name: 'Synthetic Person' });
  // The browser route above intercepts the API call; no inquiry is persisted.
});
test('@public Hindi role labels retain API values and closed mobile sidebar stays hidden', async ({ page }) => {
  await page.goto('/hi/dashboard/users');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('उपयोगकर्ता प्रबंधन');
  await expect(page.getByRole('navigation', { name: 'डैशबोर्ड नेविगेशन' })).not.toBeVisible();
  const select = page.locator('#access-role'); await select.selectOption('operator');
  await expect(select).toHaveValue('operator'); await expect(select.locator('option:checked')).toHaveText('संचालक');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: path.resolve('../../docs/test-results/phase08-users-hi-360.png'), fullPage: true });
});
