import { defineConfig } from '@playwright/test';
import path from 'node:path';
const baseURL = process.env.E2E_BASE_URL || '';
const url = new URL(baseURL);
if (url.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(url.hostname) || !url.port || url.username || url.password || url.pathname !== '/') throw Error('Browser checks require an owned loopback HTTP server');
const label = process.env.E2E_LABEL || 'phase08-public-browser';
if (!/^[a-z0-9-]{1,80}$/.test(label)) throw Error('Invalid browser result label');
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1, retries: 0, timeout: process.env.E2E_DEV === 'true' ? 90000 : 45000,
  expect: { timeout: process.env.E2E_DEV === 'true' ? 30000 : 5000 },
  outputDir: path.resolve(__dirname, '../../.local-tools/playwright', label),
  reporter: [['list'], ['json', { outputFile: path.resolve(__dirname, '../../docs/test-results', label + '.json') }]],
  use: { baseURL, browserName: 'chromium', channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true,
    viewport: { width: 360, height: 800 }, reducedMotion: 'reduce', locale: 'en-IN', timezoneId: 'Asia/Kolkata',
    serviceWorkers: 'block', trace: 'retain-on-failure', screenshot: 'only-on-failure',
    launchOptions: { args: ['--disable-background-networking', '--disable-component-update', '--no-first-run'] } },
});
