import { defineConfig, devices } from '@playwright/test';

// Chromium covers every scenario; other engines repeat browser-dependent risks.
// Use full mode for engine-wide investigations and browser version upgrades.
const browserGrep = process.env.COMM_RELAY_E2E_MATRIX === 'full' ? undefined : /@browser/;

export default defineConfig({
  testDir: './web/e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure', locale: 'en-GB', timezoneId: 'UTC' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', grep: browserGrep, grepInvert: /@visual/, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', grep: browserGrep, grepInvert: /@visual/, use: { ...devices['Desktop Safari'] } },
  ],
});
