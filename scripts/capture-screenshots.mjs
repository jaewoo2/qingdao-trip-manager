/* global process, console, window */
import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';

const port = Number(process.env.DOCS_PREVIEW_PORT ?? 4280);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid preview port');
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
await mkdir('docs/screenshots', { recursive: true });
try {
  for (const tab of ['itinerary', 'packing', 'restaurants']) {
    const context = await browser.newContext({ viewport: { width: 420, height: 1120 }, deviceScaleFactor: 1 });
    try {
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${port}/`);
      await page.getByText('오프라인 준비 완료', { exact: true }).waitFor();
      await page.locator('.app-tabs').getByRole('link', { name: tab === 'itinerary' ? '여행 일정' : tab === 'packing' ? '여행 준비물' : '식당 후보 10곳', exact: true }).click();
      if (tab === 'itinerary') {
        await page.getByRole('navigation', { name: '여행 날짜' }).getByRole('button').nth(1).click();
        // Crop decorative areas for documentation, without changing sample content.
        await page.addStyleTag({ content: '.trip-hero,.hero-quicklinks,.trip-sidebar,.daily-note,.site-footer{display:none!important}' });
      }
      if (tab === 'packing') {
        for (const input of await page.getByTestId('packing-devices').getByRole('checkbox').all()) await input.check();
        await page.addStyleTag({ content: '.weather-guide{display:none!important}' });
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `docs/screenshots/${tab}.png`, animations: 'disabled' });
      console.log(`${tab}: example app captured`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
