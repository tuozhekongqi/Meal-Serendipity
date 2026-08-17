import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'line',
  outputDir: 'output/playwright/test-results',
  use: {
    baseURL: 'http://127.0.0.1:4174/Meal-Serendipity/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: {
    command: 'node scripts/serve-static.mjs --root=dist --base-path=/Meal-Serendipity/ --port=4174',
    url: 'http://127.0.0.1:4174/Meal-Serendipity/',
    reuseExistingServer: false,
    timeout: 15_000
  }
});
