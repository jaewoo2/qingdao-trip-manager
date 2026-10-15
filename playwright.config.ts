import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1, timeout: 40000,
  expect: { timeout: 10000 }, reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4273', viewport: { width: 375, height: 812 },
    launchOptions: { executablePath, args: ['--no-sandbox'] },
    trace: 'retain-on-failure', screenshot: 'only-on-failure',
  },
  webServer: { command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4273 --strictPort', url: 'http://127.0.0.1:4273', reuseExistingServer: false, timeout: 60000 },
});
