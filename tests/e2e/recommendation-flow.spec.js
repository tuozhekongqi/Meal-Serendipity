import { expect, test } from '@playwright/test';

const runtimeProblems = new WeakMap();

test.beforeEach(async ({ page }) => {
  const problems = [];
  runtimeProblems.set(page, problems);
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) problems.push(`console ${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  page.on('requestfailed', (request) => problems.push(`request failed: ${request.url()} (${request.failure()?.errorText})`));
  await page.goto('./');
});

test.afterEach(async ({ page }) => {
  expect(runtimeProblems.get(page), 'browser console and resource loading must stay clean').toEqual([]);
});

test('quick recommendation returns one explained static inspiration and supports swap and feedback', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '今天吃什么？' })).toBeVisible();
  await expect(page.getByText('当前是菜品灵感', { exact: true })).toBeVisible();

  await page.locator('#desktop-actions').getByRole('button', { name: '马上推荐' }).click();
  await expect(page.locator('[data-state="success"]')).toBeVisible();
  await expect(page.getByText('今天吃这个。')).toBeVisible();
  await expect(page.getByRole('heading', { name: '为什么是它' })).toBeVisible();
  await expect(page.locator('.source-badge')).toHaveText('菜品灵感');
  await expect(page.locator('.metric-grid')).toHaveCount(0);
  await expect(page.locator('.store-name')).toHaveCount(0);

  const firstDish = await page.locator('#recommendation-title').textContent();
  await page.locator('.result-actions').getByRole('button', { name: '换一个' }).click();
  await expect(page.locator('#recommendation-title')).not.toHaveText(firstDish);

  await page.getByRole('button', { name: '合适', exact: true }).click();
  await expect(page.getByText('已记下：这个方向合适。本次反馈不会上传。')).toBeVisible();
});

test('precise flow shows real three-step progress and restores only non-sensitive preferences', async ({ page }) => {
  await page.locator('#desktop-actions').getByRole('button', { name: '精准筛选' }).click();
  await expect(page.getByText('第 2 步，共 3 步')).toBeVisible();

  await page.getByRole('button', { name: '辣', exact: true }).click();
  await page.getByLabel(/不吃或需要避开的食材/).fill('花生');
  await page.getByLabel(/用餐人数/).selectOption('2');
  await page.locator('#desktop-actions').getByRole('button', { name: '下一步' }).click();

  await expect(page.getByText('第 3 步，共 3 步')).toBeVisible();
  await expect(page.getByText('已填写，仅本次使用')).toBeVisible();
  await page.locator('#desktop-actions').getByRole('button', { name: '生成推荐' }).click();
  await expect(page.locator('[data-state="success"]')).toBeVisible();

  await page.reload();
  await page.locator('#desktop-actions').getByRole('button', { name: '精准筛选' }).click();
  await expect(page.getByRole('button', { name: '辣', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel(/用餐人数/)).toHaveValue('2');
  await expect(page.getByLabel(/不吃或需要避开的食材/)).toHaveValue('');
});

test('data dialog traps focus, closes with Escape, and returns focus to its trigger', async ({ page }) => {
  const trigger = page.getByRole('button', { name: '数据说明' });
  await trigger.focus();
  await trigger.click();
  await expect(page.getByRole('dialog', { name: '数据与隐私说明' })).toBeVisible();
  await expect(page.getByRole('button', { name: '关闭对话框' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('favicon endpoints and the custom 404 page are available', async ({ request, page }) => {
  const svg = await request.get('./favicon.svg');
  expect(svg.status()).toBe(200);
  expect(svg.headers()['content-type']).toContain('image/svg+xml');

  const ico = await request.get('./favicon.ico');
  expect(ico.status()).toBe(200);

  await page.goto('./nested/missing-page');
  await expect(page.getByRole('heading', { name: '这里没有这一页。' })).toBeVisible();
  await expect(page.getByRole('link', { name: '返回首页' })).toHaveAttribute('href', '/Meal-Serendipity/');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/Meal-Serendipity/favicon.svg');
  const problems = runtimeProblems.get(page);
  expect(problems).toEqual(['console error: Failed to load resource: the server responded with a status of 404 (Not Found)']);
  problems.length = 0;
});
