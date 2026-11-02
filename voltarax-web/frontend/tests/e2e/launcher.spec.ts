import { expect, test } from '@playwright/test';

test('@launcher browser signs in to the isolated demo and loads its dashboard', async ({ page }) => {
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/login');
  await page.getByLabel('Email address', { exact: true }).fill('admin@local.test');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-local-password-123');
  const login = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/login');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  expect((await login).status()).toBe(200);
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 120000 });
  await expect(page.getByRole('heading', { name: 'Solar Intelligence Dashboard' })).toBeVisible();
  const user = await page.request.get('/api/auth/me');
  expect(user.status()).toBe(200);
  expect((await user.json()).user.role).toBe('admin');
  expect(errors).toEqual([]);
});
