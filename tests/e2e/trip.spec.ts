import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
import seed from '../../src/data/itinerary.seed.json' with { type: 'json' };
import { STORAGE_KEY } from '../../src/lib/state';

async function day(page: Page, index: number) {
  await page.getByRole('navigation', { name: '여행 날짜' }).getByRole('button').nth(index).click();
}
async function changeLunch(page: Page) {
  await day(page, 1);
  const lunch = page.getByTestId('d2-lunch');
  await lunch.getByRole('button', { name: '대안 보기' }).click();
  await lunch.getByRole('button', { name: /완허춘/ }).click();
  await expect(lunch.getByRole('heading', { name: '완허춘 · 갈비 뚝배기' })).toBeVisible();
  const href = await lunch.getByRole('link', { name: /고덕지도에서 찾기/ }).getAttribute('href');
  expect(new URL(href!).searchParams.get('keyword')).toBe(seed.places.wanhechun.amapSearch);
}
async function backupPanel(page: Page) {
  await page.getByRole('button', { name: '백업과 여행 준비', exact: true }).click();
}
async function ready(page: Page) { await expect(page.getByText('오프라인 준비 완료', { exact: true })).toBeVisible({ timeout: 20000 }); }

test('WP-1: 4 days / 35 original events, safe map visibility and 375px layout', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const external: string[] = []; page.on('request', request => { if (new URL(request.url()).hostname !== '127.0.0.1') external.push(request.url()); });
  await page.goto('/');
  for (let index = 0; index < 4; index++) {
    await day(page, index);
    await expect(page.locator('.event-card:visible')).toHaveCount(seed.days[index].events.length);
    for (const event of seed.days[index].events) {
      const card = page.getByTestId(event.id);
      await expect(card.getByRole('heading', { name: event.id === 'd3-lunch' ? '구룡식당 점심 예시' : event.id === 'd1-lunch' ? '루위 · 카오위 점심' : event.title, exact: true })).toBeVisible();
      if (!event.navigationEligible || event.type === 'breakfast') await expect(card.getByRole('link')).toHaveCount(0);
      else if (event.placeId && seed.places[event.placeId as keyof typeof seed.places].zh) await expect(card.getByRole('link', { name: /고덕지도에서 찾기/ })).toHaveCount(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await expect(page.locator('a[href^="iosamap:"]')).toHaveCount(0);
  expect(errors).toEqual([]); expect(external).toEqual([]);
});

test('WP-2: alternatives, address, link, completion and notes survive a fresh page; original restores', async ({ page, context }) => {
  await page.goto('/'); await changeLunch(page);
  const card = page.getByTestId('d2-lunch');
  await expect(card).toContainText('台东八路66号');
  await card.getByText('내 메모', { exact: true }).click();
  await card.getByRole('textbox', { name: /메모/ }).fill('대기 후 완허춘으로 변경');
  const expandedHeight = (await card.boundingBox())!.height;
  await card.getByRole('button', { name: /방문 완료$/ }).click();
  await expect(card.getByRole('button', { name: /상세 펼치기/ })).toHaveAttribute('aria-expanded', 'false');
  expect((await card.boundingBox())!.height).toBeLessThan(expandedHeight);
  await expect(card.getByRole('link', { name: /고덕지도에서 찾기/ })).toBeHidden();
  await expect(page.getByRole('checkbox', { name: '실제로 카오위를 먹었어요' })).not.toBeChecked();
  await page.reload(); await expect(page.getByTestId('d2-lunch')).toContainText('완허춘 · 갈비 뚝배기');
  const next = await context.newPage(); await page.close(); await next.goto('/');
  await expect(next.getByTestId('d2-lunch').getByRole('heading')).toHaveText('완허춘 · 갈비 뚝배기');
  await expect(next.getByTestId('d2-lunch').getByRole('button', { name: /방문 완료$/ })).toHaveAttribute('aria-pressed', 'true');
  await next.getByTestId('d2-lunch').screenshot({ path: 'docs/qa/completed-card.png' });
  await next.emulateMedia({ media: 'print' });
  await expect(next.getByTestId('d2-lunch').getByText('台东八路66号', { exact: true })).toBeVisible();
  await next.emulateMedia({ media: 'screen' });
  await next.getByTestId('d2-lunch').getByRole('button', { name: /상세 펼치기/ }).click();
  await expect(next.getByTestId('d2-lunch').getByRole('link', { name: /고덕지도에서 찾기/ })).toBeVisible();
  await next.getByTestId('d2-lunch').getByText('내 메모 · 작성됨').click();
  await expect(next.getByTestId('d2-lunch').getByRole('textbox', { name: /메모/ })).toHaveValue('대기 후 완허춘으로 변경');
  await next.getByTestId('d2-lunch').getByRole('button', { name: '대안 보기' }).click();
  await next.getByTestId('d2-lunch').getByRole('button', { name: /원래 장소 · 선택하면 원복/ }).click();
  await expect(next.getByTestId('d2-lunch').getByRole('heading')).toHaveText('양꼬치 점심 예시');
  await expect(next.getByTestId('d2-lunch').getByRole('button', { name: /방문 완료$/ })).toHaveAttribute('aria-pressed', 'false');
});

test('WP-2: JSON download, reset, validated restore and invalid import preserve data', async ({ page }) => {
  await page.goto('/'); await changeLunch(page); await backupPanel(page);
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON 백업 내려받기' }).click();
  const download = await downloading;
  const contents = await readFile((await download.path())!, 'utf8');
  expect(JSON.parse(contents).selectedPlaceByEventId['d2-lunch']).toBe('wanhechun');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '원본으로 되돌리기', exact: true }).click();
  const original = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY);
  const invalid = JSON.stringify({ ...JSON.parse(contents), selectedPlaceByEventId: { 'd3-beach': 'hotel' } });
  await page.getByLabel('복원할 백업 파일').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(invalid) });
  await expect(page.getByText(/복원 실패:/)).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(original);
  page.once('dialog', dialog => dialog.accept());
  await page.getByLabel('복원할 백업 파일').setInputFiles({ name: 'valid.json', mimeType: 'application/json', buffer: Buffer.from(contents) });
  await expect(page.getByText('백업을 복원했습니다.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '닫기' }).click();
  await expect(page.getByTestId('d2-lunch').getByRole('heading')).toHaveText('완허춘 · 갈비 뚝배기');
});

test('WP-3: offline app restarts twice, edits notes and alternatives, and exports without a server', async ({ page, context }) => {
  await page.goto('/'); await ready(page); await context.setOffline(true);
  await page.reload(); await ready(page); await changeLunch(page);
  await page.getByTestId('d2-lunch').getByText('내 메모', { exact: true }).click();
  await page.getByTestId('d2-lunch').getByRole('textbox', { name: /메모/ }).fill('오프라인에서 저장한 메모');
  await page.reload(); await ready(page);
  const next = await context.newPage(); await page.close(); await next.goto('/'); await ready(next);
  await expect(next.getByTestId('d2-lunch').getByRole('heading')).toHaveText('완허춘 · 갈비 뚝배기');
  await next.getByTestId('d2-lunch').getByText('내 메모 · 작성됨').click();
  await expect(next.getByTestId('d2-lunch').getByRole('textbox', { name: /메모/ })).toHaveValue('오프라인에서 저장한 메모');
  await backupPanel(next); const downloading = next.waitForEvent('download');
  await next.getByRole('button', { name: 'JSON 백업 내려받기' }).click();
  expect(JSON.parse(await readFile((await (await downloading).path())!, 'utf8')).notesByEventId['d2-lunch']).toBe('오프라인에서 저장한 메모');
});

test('WP-3: server process stopped while browser stays online, cached navigation and edits still work', async ({ page, context }) => {
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4174', '--strictPort'], { cwd: process.cwd(), stdio: 'pipe' });
  try {
    await expect.poll(async () => { try { return (await fetch('http://127.0.0.1:4174')).status; } catch { return 0; } }).toBe(200);
    await page.goto('http://127.0.0.1:4174'); await ready(page);
    const exited = once(server, 'exit'); server.kill('SIGTERM'); await exited;
    await expect(fetch('http://127.0.0.1:4174')).rejects.toThrow();
    expect(await page.evaluate(() => navigator.onLine)).toBe(true);
    await page.reload(); await ready(page); await changeLunch(page);
    const next = await context.newPage(); await page.close(); await next.goto('http://127.0.0.1:4174/'); await ready(next);
    await expect(next.getByTestId('d2-lunch').getByRole('heading')).toHaveText('완허춘 · 갈비 뚝배기');
  } finally { if (server.exitCode === null) server.kill('SIGTERM'); }
});

test('WP-3: readiness is revoked if an essential cache entry is missing', async ({ page }) => {
  await page.goto('/'); await ready(page);
  await page.evaluate(async () => {
    const keys = await caches.keys();
    for (const key of keys) {
      const cache = await caches.open(key);
      for (const request of await cache.keys()) if (request.url.includes('qingdao-coast.svg')) await cache.delete(request);
    }
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByText('오프라인 준비 미완료', { exact: true })).toBeVisible();
});

test('WP-2: corrupt saved data is not overwritten and quota failures are visible', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(key => localStorage.setItem(key, '{bad'), STORAGE_KEY); await page.reload();
  await expect(page.getByRole('alert')).toContainText('덮어쓰지 않았습니다');
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe('{bad');
  await expect(page.getByTestId('d1-lunch').getByRole('button', { name: /방문 완료$/ })).toBeDisabled();
  await backupPanel(page); page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '원본으로 되돌리기', exact: true }).click();
  await page.getByRole('button', { name: '닫기' }).click();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); }; });
  await changeLunch(page); await expect(page.getByRole('alert')).toContainText('기기 저장에 실패했습니다');
  await backupPanel(page); const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON 백업 내려받기' }).click();
  expect(JSON.parse(await readFile((await (await downloading).path())!, 'utf8')).selectedPlaceByEventId['d2-lunch']).toBe('wanhechun');
});

test('WP-0: lab never invents defaults; manual test candidates stay separate from itinerary', async ({ page }) => {
  await page.goto('/#map-link-lab');
  await expect(page.getByRole('heading', { name: '고덕지도 연결 실험실' })).toBeVisible();
  await expect(page.locator('a[href^="iosamap:"]')).toHaveCount(0);
  await page.getByLabel('POI ID', { exact: true }).fill('TEST_ONLY_NOT_A_PLACE');
  await page.getByLabel('확인 출처·일시').fill('자동화 직렬화 테스트용 합성 값. 실제 장소 아님.');
  await page.getByRole('checkbox', { name: /직접 확인했습니다/ }).check();
  await page.getByRole('button', { name: '테스트 후보 링크 만들기' }).click();
  const candidate = new URL((await page.getByRole('link', { name: '고덕 iOS 경로 후보 열기' }).getAttribute('href'))!);
  expect(candidate.searchParams.get('did')).toBe('TEST_ONLY_NOT_A_PLACE'); expect(candidate.searchParams.has('slat')).toBe(false);
  await page.getByLabel('이동수단', { exact: true }).selectOption('drive');
  await expect(page.locator('a[href^="iosamap:"]')).toHaveCount(0);
  await page.getByRole('link', { name: /일정으로 돌아가기/ }).click();
  await expect(page.locator('a[href^="iosamap:"]')).toHaveCount(0);
});

test('WP-3: a waiting service worker update preserves overrides, notes and the selected day', async ({ page }) => {
  let revision = 1;
  const root = resolve('dist');
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url!, 'http://127.0.0.1').pathname;
      const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!file.startsWith(root + '/')) { response.writeHead(403).end(); return; }
      const mime: Record<string, string> = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
      const bytes = await readFile(file);
      response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
      response.end(pathname === '/sw.js' ? Buffer.concat([bytes, Buffer.from(`\n// Test-only SW revision ${revision}\n`)]) : bytes);
    } catch { response.writeHead(404).end(); }
  });
  server.listen(4176, '127.0.0.1'); await once(server, 'listening');
  try {
    await page.goto('http://127.0.0.1:4176'); await ready(page); await changeLunch(page);
    await page.getByTestId('d2-lunch').getByText('내 메모', { exact: true }).click();
    await page.getByTestId('d2-lunch').getByRole('textbox', { name: /메모/ }).fill('업데이트 전 메모');
    revision = 2;
    await page.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration(); await registration!.update(); });
    await expect(page.getByRole('button', { name: '새 버전 적용' })).toBeVisible();
    await page.getByRole('button', { name: '새 버전 적용' }).click(); await page.waitForLoadState('load'); await ready(page);
    await expect(page.getByTestId('d2-lunch').getByRole('heading')).toHaveText('완허춘 · 갈비 뚝배기');
    await page.getByTestId('d2-lunch').getByText('내 메모 · 작성됨').click();
    await expect(page.getByTestId('d2-lunch').getByRole('textbox', { name: /메모/ })).toHaveValue('업데이트 전 메모');
    await expect(page.getByRole('navigation', { name: '여행 날짜' }).getByRole('button').nth(1)).toHaveAttribute('aria-pressed', 'true');
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('WP-3/4: export survives simulated site-data loss; restore works after a new installation', async ({ page, context }) => {
  await page.goto('/'); await ready(page); await changeLunch(page); await backupPanel(page);
  const downloading = page.waitForEvent('download'); await page.getByRole('button', { name: 'JSON 백업 내려받기' }).click();
  const contents = await readFile((await (await downloading).path())!, 'utf8');
  await page.evaluate(async () => {
    localStorage.clear();
    for (const key of await caches.keys()) await caches.delete(key);
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
  });
  const next = await context.newPage(); await page.close(); await next.goto('/'); await ready(next); await backupPanel(next);
  next.once('dialog', dialog => dialog.accept());
  await next.getByLabel('복원할 백업 파일').setInputFiles({ name: 'saved.json', mimeType: 'application/json', buffer: Buffer.from(contents) });
  await expect(next.getByText('백업을 복원했습니다.', { exact: true })).toBeVisible();
  await next.getByRole('button', { name: '닫기' }).click(); await day(next, 1);
  await expect(next.getByTestId('d2-lunch').getByRole('heading')).toHaveText('완허춘 · 갈비 뚝배기');
  await context.setOffline(true); await next.reload(); await ready(next);
  await expect(next.getByTestId('d2-lunch').getByRole('heading')).toHaveText('완허춘 · 갈비 뚝배기');
});


test('three tabs: packing collapses, survives offline restart and backup; restaurant candidates stay honest', async ({ page, context }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/'); await ready(page);
  await page.getByRole('navigation', { name: '칭다오 노트 메뉴' }).getByRole('link', { name: '여행 준비물' }).click();
  await expect(page.getByRole('heading', { name: '여행 전, 기온과 바람을 확인하세요' })).toBeVisible();
  const group = page.getByTestId('packing-documents');
  for (const name of ['여권', '항공편·탑승 정보 확인', '숙소 중국어 이름·주소 저장', '여행자보험·긴급 연락처 확인']) await group.getByRole('checkbox', { name: new RegExp('^' + name) }).check();
  await expect(group.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  await expect(group.getByRole('checkbox', { name: /^여권/ })).toBeHidden();
  await page.screenshot({ path: 'docs/qa/packing-tab.png', fullPage: true });
  await context.setOffline(true); await page.reload();
  await expect(group.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  await group.getByRole('button').click();
  await expect(group.getByRole('checkbox', { name: /^여권/ })).toBeChecked();
  await group.getByRole('checkbox', { name: /^여권/ }).uncheck();
  await expect(group.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  await backupPanel(page);
  const downloading = page.waitForEvent('download'); await page.getByRole('button', { name: 'JSON 백업 내려받기' }).click();
  const contents = await readFile((await (await downloading).path())!, 'utf8');
  expect(JSON.parse(contents).packingCheckedIds).toEqual(['flight', 'hotel', 'insurance']);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.event-card:visible')).toHaveCount(35);
  await expect(page.locator('.collection-page')).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: '원본으로 되돌리기', exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByLabel('복원할 백업 파일').setInputFiles({ name: 'packing.json', mimeType: 'application/json', buffer: Buffer.from(contents) });
  await expect(page.getByText('백업을 복원했습니다.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '닫기' }).click();
  await expect(group.getByRole('checkbox', { name: /^항공편/ })).toBeChecked();
  await page.getByRole('navigation', { name: '칭다오 노트 메뉴' }).getByRole('link', { name: '식당 후보 10곳' }).click();
  await expect(page.locator('.restaurant-card')).toHaveCount(10);
  await expect(page.getByText('최신 리뷰로 검증한 순위는 아니에요.')).toHaveCount(0);
  await expect(page.getByRole('region', { name: '현재 일정에 담긴 식당' })).toBeVisible();
  await expect(page.getByRole('region', { name: '바꿔 볼 대안 식당' })).toBeVisible();
  const newCandidate = page.getByTestId('restaurant-haidilao');
  await expect(newCandidate).toContainText('香港中路31号银座中心6楼');
  const search = newCandidate.getByRole('link', { name: /고덕지도에서 찾기/ });
  expect(new URL((await search.getAttribute('href'))!).searchParams.get('keyword')).toBe('青岛 海底捞 银座广场店');
  await expect(search).toHaveAttribute('target', '_blank');
  await expect(page.locator('a[href^="iosamap:"]')).toHaveCount(0);
  await page.screenshot({ path: 'docs/qa/restaurants-tab.png', fullPage: true });
  await page.getByRole('navigation', { name: '식당 음식 종류' }).getByRole('button', { name: '훠궈', exact: true }).click();
  await expect(page.locator('.restaurant-card')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload(); await expect(page.locator('.restaurant-card')).toHaveCount(10);
  await page.getByRole('navigation', { name: '칭다오 노트 메뉴' }).getByRole('link', { name: '여행 일정' }).click();
  await expect(page.getByTestId('d1-lunch')).toContainText('루위 · 카오위 점심');
});

test('restaurant slot picker swaps the actual meal and map together, persists offline and leaves protected meals alone', async ({ page, context }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/'); await ready(page);
  await day(page, 1);
  const lunch = page.getByTestId('d2-lunch');
  await lunch.getByText('내 메모', { exact: true }).click();
  await lunch.getByRole('textbox', { name: /메모/ }).fill('동행자와 같이 선택한 점심');
  await lunch.getByRole('button', { name: /방문 완료$/ }).click();
  await page.getByRole('navigation', { name: '칭다오 노트 메뉴' }).getByRole('link', { name: '식당 후보 10곳' }).click();
  await expect(page.getByTestId('restaurant-kaihai')).toHaveCount(0);
  await expect(page.getByTestId('restaurant-haidilao').getByRole('button', { name: '일정에 넣기' })).toBeEnabled();
  await expect(page.getByTestId('restaurant-chunhelou')).toContainText('DAY 3 · 5/6 월 (예시) 점심');
  await expect(page.getByTestId('restaurant-luyu')).toContainText('현재 선택됨');
  await page.getByTestId('restaurant-wanhechun').getByRole('button', { name: '일정에 넣기' }).click();
  await page.getByLabel('교체할 날짜·끼니').selectOption('d2-lunch');
  const dialog = page.getByRole('dialog', { name: '이 식당을 일정에 넣기' });
  await expect(dialog).toContainText('무예슬거');
  await expect(dialog).toContainText('台东八路66号');
  await page.screenshot({ path: 'docs/qa/restaurant-slot-picker.png' });
  await dialog.getByRole('button', { name: '취소' }).click();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).selectedPlaceByEventId, STORAGE_KEY)).toEqual({});
  await page.getByTestId('restaurant-wanhechun').getByRole('button', { name: '일정에 넣기' }).click();
  await page.getByLabel('교체할 날짜·끼니').selectOption('d2-lunch');
  await dialog.getByRole('button', { name: '이 끼니 교체하기' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'DAY 2 · 5/5 일 (예시) 점심 식당을 완허춘' })).toBeVisible();
  await context.setOffline(true); await page.reload();
  await expect(page.getByTestId('restaurant-wanhechun')).toContainText('현재 선택됨');
  await page.getByRole('navigation', { name: '칭다오 노트 메뉴' }).getByRole('link', { name: '여행 일정' }).click();
  await expect(lunch.getByRole('heading')).toHaveText('완허춘 · 갈비 뚝배기');
  await expect(lunch).toContainText('台东八路66号');
  await expect(lunch.getByRole('button', { name: /방문 완료$/ })).toHaveAttribute('aria-pressed', 'false');
  await lunch.getByText('내 메모 · 작성됨').click();
  await expect(lunch.getByRole('textbox', { name: /메모/ })).toHaveValue('동행자와 같이 선택한 점심');
  const href = await lunch.getByRole('link', { name: /고덕지도에서 찾기/ }).getAttribute('href');
  expect(new URL(href!).searchParams.get('keyword')).toBe(seed.places.wanhechun.amapSearch);
  await lunch.getByRole('button', { name: '대안 보기' }).click();
  await lunch.getByRole('button', { name: /원래 장소 · 선택하면 원복/ }).click();
  await expect(lunch.getByRole('heading')).toHaveText('양꼬치 점심 예시');
});

test('AI food illustrations are precached before visiting restaurants, render offline and expand with an honest label', async ({ page, context }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/'); await ready(page);
  const cachedImages = await page.evaluate(async () => {
    const paths = new Set<string>();
    for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) {
      const path = new URL(request.url).pathname;
      if (path.startsWith('/restaurant-illustrations/')) paths.add(path);
    }
    return [...paths];
  });
  expect(cachedImages).toHaveLength(15);
  await context.setOffline(true);
  await page.getByRole('navigation', { name: '칭다오 노트 메뉴' }).getByRole('link', { name: '식당 후보 10곳' }).click();
  const cards = page.locator('.restaurant-card');
  for (let index = 0; index < 10; index++) {
    const card = cards.nth(index); const illustration = card.getByRole('img');
    await illustration.scrollIntoViewIfNeeded();
    await expect.poll(() => illustration.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth === 1254 && img.naturalHeight === 1254)).toBe(true);
    await expect(card.locator('figcaption')).toHaveText('AI 생성 음식 일러스트 · 실제 매장·메뉴 사진 아님');
  }
  const luyu = page.getByTestId('restaurant-luyu');
  await luyu.screenshot({ path: 'docs/qa/restaurant-illustration-card.png' });
  await luyu.getByRole('button', { name: '루위 음식 일러스트 크게 보기' }).click();
  const dialog = page.getByRole('dialog', { name: '루위 음식 일러스트' });
  await expect(dialog.getByRole('img')).toBeVisible();
  await expect(dialog).toContainText('실제 매장·메뉴 사진이 아닙니다.');
  await page.screenshot({ path: 'docs/qa/illustration-preview.png' });
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(page.getByTestId('restaurant-chunhelou').getByRole('img')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('reviewed restaurant groups and compact meal art stay aligned after an offline alternative change', async ({ page, context }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/'); await ready(page); await day(page, 2);
  await expect(page.getByTestId('d3-lunch').getByRole('heading')).toHaveText('구룡식당 점심 예시');
  await expect(page.getByTestId('d3-lunch').getByRole('region', { name: '식당 주메뉴' })).toContainText('오징어튀김');
  await day(page, 1);
  const lunch = page.getByTestId('d2-lunch');
  await expect(lunch.locator('.meal-summary img')).toHaveAttribute('src', '/restaurant-illustrations/muyeshige.webp');
  await expect(lunch.locator('.meal-summary')).toContainText('양꼬치');
  await lunch.screenshot({ path: 'docs/qa/meal-menu-thumbnail.png' });
  await context.setOffline(true); await changeLunch(page);
  await expect(lunch.locator('.meal-summary img')).toHaveAttribute('src', '/restaurant-illustrations/wanhechun_braised_ribs.webp');
  await expect(lunch.locator('.meal-summary')).toContainText('갈비·등뼈');
  await lunch.getByRole('button', { name: /방문 완료$/ }).click();
  await expect(lunch.locator('.meal-summary')).toBeHidden();
  await lunch.getByRole('button', { name: /상세 펼치기/ }).click();
  await expect(lunch.locator('.meal-summary')).toBeVisible();
  await page.reload();
  await lunch.getByRole('button', { name: /상세 펼치기/ }).click();
  await expect(lunch.locator('.meal-summary img')).toHaveAttribute('src', '/restaurant-illustrations/wanhechun_braised_ribs.webp');
  await page.locator('.app-tabs').getByRole('link', { name: '식당 후보 10곳' }).click();
  await expect(page.getByTestId('restaurant-group-current').getByTestId('restaurant-wanhechun')).toBeVisible();
  await expect(page.getByTestId('restaurant-group-alternatives').getByTestId('restaurant-muye')).toBeVisible();
  await expect(page.getByText('최신 리뷰로 검증한 순위는 아니에요.')).toHaveCount(0);
  await expect(page.getByTestId('restaurant-kaihai')).toHaveCount(0);
  await expect(page.getByTestId('restaurant-qianhaiyan')).toHaveCount(0);
  await expect(page.getByTestId('restaurant-coucou')).toHaveCount(0);
  const forest = page.getByTestId('restaurant-forest');
  await forest.getByRole('button', { name: '삼림해선대배당 음식 일러스트 크게 보기' }).click();
  const gallery = page.getByRole('dialog', { name: '삼림해선대배당 음식 일러스트' });
  await expect(gallery).toContainText('꽃게 도삭면');
  await gallery.getByRole('button', { name: '다음 음식 이미지' }).click();
  await expect(gallery).toContainText('게살·게황 소스와 밥');
  await expect(gallery.getByRole('img')).toHaveAttribute('src', '/restaurant-illustrations/senlin.webp');
  await page.keyboard.press('Escape');
  await page.locator('.held-restaurants>summary').click();
  const held = page.getByTestId('restaurant-meidaer');
  await expect(held).toContainText('잠정 휴업');
  await expect(held.getByRole('button', { name: '일정에 넣기' })).toHaveCount(0);
});

test('identified Haidilao branch can replace Saturday dinner with its own image, address and search', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/#restaurants');
  const haidilao = page.getByTestId('restaurant-haidilao');
  await expect(haidilao).toContainText('완샹청 밖');
  await haidilao.getByRole('button', { name: '일정에 넣기' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '이 끼니 교체하기' }).click();
  await expect(page.getByTestId('restaurant-group-current').getByTestId('restaurant-haidilao')).toBeVisible();
  await page.locator('.app-tabs').getByRole('link', { name: '여행 일정' }).click();
  const dinner = page.getByTestId('d1-dinner');
  await expect(dinner.getByRole('heading')).toContainText('하이디라오');
  await expect(dinner).toContainText('香港中路31号银座中心6楼');
  await expect(dinner.locator('.meal-summary img')).toHaveAttribute('src', '/restaurant-illustrations/haidilao_four_broth_hotpot.webp');
  const href = await dinner.getByRole('link', { name: /고덕지도에서 찾기/ }).getAttribute('href');
  expect(new URL(href!).searchParams.get('keyword')).toBe('青岛 海底捞 银座广场店');
});


test('fresh visits use the basic plan; Saturday dimsum choice persists offline without changing dinner', async ({ page, context, browser }) => {
  await page.goto('/'); await ready(page);
  const lunch = page.getByTestId('d1-lunch');
  await expect(lunch.getByRole('heading')).toHaveText('루위 · 카오위 점심');
  await expect(lunch.locator('.changed-badge')).toHaveCount(0);
  await expect(lunch.locator('.required-badge')).toHaveCount(0);
  await lunch.getByRole('button', { name: '대안 보기' }).click();
  await lunch.getByRole('button', { name: /명가딤섬/ }).click();
  await expect(lunch.getByRole('heading')).toContainText('명가');
  await expect(lunch.locator('.meal-summary img')).toHaveAttribute('src', '/restaurant-illustrations/mingjia.webp');
  const href = await lunch.getByRole('link', { name: /고덕지도에서 찾기/ }).getAttribute('href');
  expect(new URL(href!).searchParams.get('keyword')).toBe(seed.places.mingjia.amapSearch);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).selectedPlaceByEventId, STORAGE_KEY)).toEqual({ 'd1-lunch': 'mingjia' });
  await expect(page.getByTestId('d1-dinner').getByRole('heading')).toHaveText(seed.days[0].events.find(e => e.id === 'd1-dinner')!.title);
  await context.setOffline(true); await page.reload();
  await expect(lunch.getByRole('heading')).toContainText('명가');
  await lunch.getByRole('button', { name: '대안 보기' }).click();
  await lunch.getByRole('button', { name: /원래 장소 · 선택하면 원복/ }).click();
  await expect(lunch.getByRole('heading')).toHaveText('루위 · 카오위 점심');
  const fresh = await browser.newContext();
  try {
    const other = await fresh.newPage(); await other.goto('/');
    await expect(other.getByTestId('d1-lunch').getByRole('heading')).toHaveText('루위 · 카오위 점심');
    await expect(other.locator('.changed-badge')).toHaveCount(0);
  } finally { await fresh.close(); }
});

test('mobile album uses three square columns and opens accessible detail, gallery and meal picker offline', async ({ page, context }) => {
  await page.goto('/'); await ready(page);
  await page.locator('.app-tabs').getByRole('link', { name: '식당 후보 10곳' }).click();
  for (const width of [320, 375, 430]) {
    await page.setViewportSize({ width, height: 812 });
    const tiles = page.getByTestId('restaurant-group-current').locator('.restaurant-tile');
    const boxes = await Promise.all([0, 1, 2, 3].map(index => tiles.nth(index).boundingBox()));
    expect(Math.abs(boxes[0]!.y - boxes[2]!.y)).toBeLessThan(2);
    expect(boxes[3]!.y).toBeGreaterThan(boxes[0]!.y + boxes[0]!.height);
    expect(Math.abs(boxes[0]!.height - boxes[0]!.width)).toBeLessThan(2);
    expect(boxes[0]!.width).toBeGreaterThan(80);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: 'docs/qa/mobile-restaurant-album.png', fullPage: true });
  await context.setOffline(true);
  const tile = page.getByTestId('restaurant-forest').getByRole('button', { name: /상세 보기/ });
  await tile.click();
  const detail = page.getByRole('dialog', { name: '삼림해선대배당 상세', exact: true });
  await expect(detail).toContainText('市北区丹阳路68号');
  await detail.getByRole('button', { name: /음식 일러스트 크게 보기/ }).click();
  const gallery = page.getByRole('dialog', { name: '삼림해선대배당 음식 일러스트', exact: true });
  await gallery.getByRole('button', { name: '다음 음식 이미지' }).click();
  await expect(gallery.getByRole('img')).toHaveAttribute('src', '/restaurant-illustrations/senlin.webp');
  await gallery.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(detail).toBeVisible();
  await detail.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(tile).toBeFocused();
  await page.getByRole('navigation', { name: '식당 일정별 보기' }).getByRole('button', { name: '1일차', exact: true }).click();
  await expect(page.getByTestId('restaurant-forest')).toHaveCount(0);
  await page.getByTestId('restaurant-mingjia').getByRole('button', { name: /상세 보기/ }).click();
  await page.getByRole('dialog', { name: '명가딤섬 상세', exact: true }).getByRole('button', { name: '일정에 넣기' }).click();
  await expect(page.getByLabel('교체할 날짜·끼니')).toHaveValue('d1-lunch');
  await page.getByRole('dialog', { name: '이 식당을 일정에 넣기' }).getByRole('button', { name: '이 끼니 교체하기' }).click();
  await expect(page.getByTestId('restaurant-group-current').getByTestId('restaurant-mingjia')).toBeVisible();
  await page.locator('.held-restaurants:not(.past-restaurants)>summary').click();
  await page.getByTestId('restaurant-meidaer').getByRole('button', { name: /상세 보기/ }).click();
  const held = page.getByRole('dialog', { name: '메이다얼 상세', exact: true });
  await expect(held).toContainText('이전 예시 일정의 점심 후보');
  await expect(held.getByRole('button', { name: '일정에 넣기' })).toHaveCount(0);
  await held.getByRole('button', { name: '닫기', exact: true }).click();
  await page.reload();
  await page.locator('.app-tabs').getByRole('link', { name: '여행 일정' }).click();
  await expect(page.getByTestId('d1-lunch').getByRole('heading')).toContainText('명가');
});

test('day completion archives only finished-day restaurants, persists offline, and can be reversed or checked individually', async ({ page, context }) => {
  await page.goto('/'); await ready(page);
  const allDone = page.getByRole('checkbox', { name: '1일차 일정 모두 완료', exact: true });
  await allDone.check();
  for (const event of seed.days[0].events) await expect(page.getByTestId(event.id).getByRole('button', { name: /방문 완료$/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('checkbox', { name: '실제로 카오위를 먹었어요' })).not.toBeChecked();
  await context.setOffline(true); await page.reload(); await expect(allDone).toBeChecked();
  await page.locator('.app-tabs').getByRole('link', { name: '식당 후보 10곳' }).click();
  await expect(page.getByTestId('restaurant-haidilao')).toHaveCount(0);
  await expect(page.getByTestId('restaurant-pingjie')).toHaveCount(0);
  await expect(page.getByTestId('restaurant-luyu')).toBeVisible();
  await expect(page.getByTestId('restaurant-mingjia')).toBeVisible();
  const archive = page.getByTestId('past-day-0');
  await expect(archive).not.toHaveAttribute('open', '');
  await archive.locator(':scope > summary').click();
  await expect(archive.getByTestId('restaurant-past-0-haidilao')).toBeVisible();
  await expect(archive.getByTestId('restaurant-past-0-pingjie')).toContainText('선택 식당');
  await page.getByRole('navigation', { name: '식당 일정별 보기' }).getByRole('button', { name: '1일차 ✓', exact: true }).click();
  await expect(page.getByTestId('restaurant-group-current').locator('.restaurant-card')).toHaveCount(0);
  await page.screenshot({ path: 'docs/qa/past-restaurants.png', fullPage: true });
  await page.locator('.app-tabs').getByRole('link', { name: '여행 일정' }).click();
  await allDone.uncheck();
  for (const event of seed.days[0].events) await page.getByTestId(event.id).getByRole('button', { name: /방문 완료$/ }).click();
  await expect(allDone).toBeChecked();
  await page.getByTestId('d1-lunch').getByRole('button', { name: /방문 완료$/ }).click();
  await expect(allDone).not.toBeChecked();
  await page.locator('.app-tabs').getByRole('link', { name: '식당 후보 10곳' }).click();
  await expect(page.getByTestId('past-day-0')).toHaveCount(0);
  await expect(page.getByTestId('restaurant-haidilao')).toBeVisible();
});
