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

function desktopAction(page, name) {
  return page.locator('#desktop-actions').getByRole('button', { name, exact: true });
}

async function openSinglePreferences(page, scene = '想吃点好的') {
  await page.getByLabel('1 人', { exact: true }).check();
  await desktopAction(page, '下一步').click();
  await page.getByLabel(scene, { exact: true }).check();
  await desktopAction(page, '下一步').click();
}

async function openMultiPreferences(page, diningMode) {
  await page.getByLabel('2 人', { exact: true }).check();
  await desktopAction(page, '下一步').click();
  await page.getByLabel('一起聚餐', { exact: true }).check();
  await desktopAction(page, '下一步').click();
  await page.getByLabel(diningMode, { exact: true }).check();
  await desktopAction(page, '下一步').click();
}

test('party size is the first required decision and a single diner never sees dining mode', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '今天吃什么？' })).toBeVisible();
  await expect(page.getByText('当前是菜品灵感', { exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: '推荐流程进度' })).toBeVisible();
  await expect(page.getByRole('group', { name: /用餐人数/ })).toBeVisible();
  for (const label of ['1 人', '2 人', '3 人', '4 人以上']) {
    await expect(page.getByLabel(label, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('group', { name: /用餐方式/ })).toHaveCount(0);

  await page.getByLabel('1 人', { exact: true }).check();
  await desktopAction(page, '下一步').click();
  await expect(page.getByRole('group', { name: /用餐场景/ })).toBeVisible();
  await expect(page.getByRole('group', { name: /用餐方式/ })).toHaveCount(0);

  await page.getByLabel('学习 / 工作', { exact: true }).check();
  await desktopAction(page, '下一步').click();
  await expect(page.getByRole('group', { name: /预算档位/ })).toBeVisible();
  await expect(page.getByRole('group', { name: /用餐方式/ })).toHaveCount(0);

  await desktopAction(page, '返回').click();
  await expect(page.getByLabel('学习 / 工作', { exact: true })).toBeChecked();
  await desktopAction(page, '返回').click();
  await expect(page.getByLabel('1 人', { exact: true })).toBeChecked();
});

test('dining mode is required for six diners and exposes all four compatible modes', async ({ page }) => {
  await page.getByLabel('4 人以上', { exact: true }).check();
  const exactCount = page.getByLabel('准确用餐人数', { exact: true });
  await expect(exactCount).toBeVisible();
  await expect(page.getByText('请输入 4 至 50 人的准确人数。', { exact: true })).toBeVisible();
  await exactCount.fill('');
  await expect(desktopAction(page, '下一步')).toBeDisabled();
  await exactCount.fill('6');
  await expect(desktopAction(page, '下一步')).toBeEnabled();
  await desktopAction(page, '下一步').click();

  await page.getByLabel('一起聚餐', { exact: true }).check();
  await desktopAction(page, '下一步').click();

  const next = desktopAction(page, '下一步');
  await expect(next).toBeDisabled();
  for (const label of ['一起吃共享菜', '每个人单独点', '主菜统一，口味各自不同', '还没想好']) {
    const option = page.getByLabel(label, { exact: true });
    await expect(option).toBeVisible();
    await option.check();
    await expect(option).toBeChecked();
    await expect(next).toBeEnabled();
  }
  await next.click();

  await expect(page.locator('[data-diner-region]')).toHaveCount(6);
  await expect(page.getByRole('group', { name: '第 6 位食客偏好' })).toBeVisible();
  await expect(page.getByLabel(/姓名|称呼/)).toHaveCount(0);
  await expect(page.locator('input[name*="name" i]')).toHaveCount(0);

  await desktopAction(page, '返回').click();
  await expect(page.getByLabel('还没想好', { exact: true })).toBeChecked();
  await desktopAction(page, '返回').click();
  await expect(page.getByLabel('一起聚餐', { exact: true })).toBeChecked();
  await desktopAction(page, '返回').click();
  await expect(page.getByLabel('4 人以上', { exact: true })).toBeChecked();
  await expect(exactCount).toHaveValue('6');
});

for (const diningMode of ['一起吃共享菜', '每个人单独点', '主菜统一，口味各自不同', '还没想好']) {
  test(`dining mode ${diningMode} composes a real two-diner result`, async ({ page }) => {
    await openMultiPreferences(page, diningMode);
    await page.getByLabel('日常预算', { exact: true }).check();
    await desktopAction(page, '生成推荐').click();

    await expect(page.locator('[data-state="success"]')).toBeVisible();
    await expect(page.locator('#recommendation-title')).toBeVisible();
    await expect(page.locator('.source-badge')).toHaveText('菜品灵感');
  });
}

test('keyboard navigation moves focus to each newly rendered step', async ({ page }) => {
  const oneDiner = page.getByLabel('1 人', { exact: true });
  await oneDiner.focus();
  await page.keyboard.press('Space');
  await desktopAction(page, '下一步').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#input-flow legend').first()).toBeFocused();

  const scene = page.getByLabel('快速解决', { exact: true });
  await scene.focus();
  await page.keyboard.press('Space');
  await desktopAction(page, '下一步').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#input-flow legend').first()).toBeFocused();

  await desktopAction(page, '返回').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#input-flow legend').first()).toBeFocused();
});

test('completed single flow returns one explained static inspiration and supports swap and feedback', async ({ page }) => {
  await openSinglePreferences(page);
  await page.getByLabel('日常预算', { exact: true }).check();
  await page.getByRole('group', { name: '第 1 位食客偏好' }).getByRole('button', { name: '咸鲜', exact: true }).click();

  await desktopAction(page, '生成推荐').click();
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

  const resultBack = page.locator('#result-content').getByRole('button', { name: '返回', exact: true });
  for (let step = 0; step < 8 && !(await resultBack.evaluate((button) => button === document.activeElement)); step += 1) {
    await page.keyboard.press('Shift+Tab');
  }
  await expect(resultBack).toBeFocused();
  await page.keyboard.press('Enter');

  const preferencesHeading = page.locator('#input-flow legend').first();
  await expect(preferencesHeading).toBeFocused();
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
  await expect(page.getByLabel('日常预算', { exact: true })).toBeChecked();
  await expect(page.getByRole('group', { name: '第 1 位食客偏好' }).getByRole('button', { name: '咸鲜', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('swap rotation never repeats a shown primary and never relaxes exhausted exclusions', async ({ page }) => {
  test.setTimeout(60_000);
  await openSinglePreferences(page, '快速解决');
  await page.getByLabel('预算灵活', { exact: true }).check();
  await desktopAction(page, '生成推荐').click();
  await expect(page.locator('[data-state="success"]')).toBeVisible();

  const title = page.locator('#recommendation-title');
  const swap = page.locator('.result-actions').getByRole('button', { name: '换一个', exact: true });
  const exhaustedMessage = '暂时没有更多安全候选';
  const seen = new Set();
  let exhausted = false;

  for (let attempt = 0; attempt < 200; attempt += 1) {
    const before = (await title.textContent()).trim();
    expect(seen.has(before), `primary repeated before exhaustion: ${before}`).toBe(false);
    seen.add(before);
    await swap.click();
    await page.waitForFunction(({ previous, message }) => {
      const nextTitle = document.querySelector('#recommendation-title')?.textContent?.trim();
      const toast = document.querySelector('#toast-region')?.textContent?.trim();
      return nextTitle !== previous || toast === message;
    }, { previous: before, message: exhaustedMessage }, { timeout: 5_000 });
    if ((await page.locator('#toast-region').textContent()).trim() === exhaustedMessage) {
      exhausted = true;
      break;
    }
  }

  expect(exhausted).toBe(true);
  expect(seen.size).toBeGreaterThan(1);
  const finalPrimary = (await title.textContent()).trim();
  await swap.click();
  await expect(page.getByText(exhaustedMessage, { exact: true })).toBeVisible();
  await expect(title).toHaveText(finalPrimary);
});

test('flow restores only non-sensitive preferences', async ({ page }) => {
  await openSinglePreferences(page, '清淡一点');
  await page.getByLabel('日常预算', { exact: true }).check();
  const diner = page.getByRole('group', { name: '第 1 位食客偏好' });
  await diner.getByRole('button', { name: '辣', exact: true }).click();
  await diner.getByLabel(/需要避开的食材/).fill('花生');
  await desktopAction(page, '生成推荐').click();
  await expect(page.locator('[data-state="success"]')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('meal-serendipity:preferences'))).not.toContain('花生');

  await page.reload();
  await expect(page.getByLabel('1 人', { exact: true })).toBeChecked();
  await desktopAction(page, '下一步').click();
  await page.getByLabel('清淡一点', { exact: true }).check();
  await desktopAction(page, '下一步').click();
  const restoredDiner = page.getByRole('group', { name: '第 1 位食客偏好' });
  await expect(restoredDiner.getByRole('button', { name: '辣', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(restoredDiner.getByLabel(/需要避开的食材/)).toHaveValue('');
});

test('data dialog traps focus, closes with Escape, and returns focus to its trigger', async ({ page }) => {
  const trigger = page.getByRole('button', { name: '数据说明' });
  await trigger.focus();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '数据与隐私说明' });
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toContainText('马上推荐');
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
