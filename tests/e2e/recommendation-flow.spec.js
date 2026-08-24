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

function visibleAction(page, name) {
  return page.getByRole('button', { name, exact: true }).filter({ visible: true });
}

async function expectKeyboardFocus(locator, accessibleName) {
  await expect(locator).toBeFocused();
  await expect(locator).toHaveAccessibleName(accessibleName);
}

async function tabThroughPageHeader(page) {
  const controls = [
    [page.getByRole('link', { name: '跳到主要内容', exact: true }), '跳到主要内容'],
    [page.getByRole('link', { name: 'Meal-Serendipity 首页', exact: true }), 'Meal-Serendipity 首页'],
    [page.getByRole('button', { name: '数据说明', exact: true }), '数据说明']
  ];
  for (const [control, accessibleName] of controls) {
    await page.keyboard.press('Tab');
    await expectKeyboardFocus(control, accessibleName);
  }
}

async function completeResponsiveSingleFlow(page, scene = '想吃点好的') {
  await page.getByLabel('1 人', { exact: true }).check();
  await visibleAction(page, '下一步').click();
  await page.getByLabel(scene, { exact: true }).check();
  await visibleAction(page, '下一步').click();
  await page.getByLabel('日常预算', { exact: true }).check();
  await visibleAction(page, '生成推荐').click();
  await expect(page.locator('[data-state="success"]')).toBeVisible();
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
    if (diningMode === '一起吃共享菜') {
      const bundle = page.locator('.meal-plan-structure[data-plan-kind="shared_bundle"]');
      await expect(bundle).toBeVisible();
      await expect(bundle.locator('[data-serving-role]')).toHaveCount(2);
    }
  });
}

test('keyboard navigation moves focus to each newly rendered step', async ({ page }) => {
  const oneDiner = page.getByLabel('1 人', { exact: true });

  await expect(page.locator('body')).toBeFocused();
  await tabThroughPageHeader(page);
  await page.keyboard.press('Tab');
  await expectKeyboardFocus(oneDiner, '1 人');
  await page.keyboard.press('Space');
  await expect(oneDiner).toBeChecked();
  await expectKeyboardFocus(oneDiner, '1 人');
  await page.keyboard.press('Tab');
  await expectKeyboardFocus(desktopAction(page, '下一步'), '下一步');
  await page.keyboard.press('Enter');
  await expect(page.locator('#input-flow legend').first()).toBeFocused();

  const scene = page.getByLabel('快速解决', { exact: true });
  await page.keyboard.press('Tab');
  await expectKeyboardFocus(scene, '快速解决');
  await page.keyboard.press('Space');
  await expect(scene).toBeChecked();
  await expect(page.locator('body')).toBeFocused();
  await page.keyboard.press('Tab');
  await expectKeyboardFocus(scene, '快速解决');
  await page.keyboard.press('Tab');
  await expectKeyboardFocus(desktopAction(page, '返回'), '返回');
  await page.keyboard.press('Tab');
  await expectKeyboardFocus(desktopAction(page, '下一步'), '下一步');
  await page.keyboard.press('Shift+Tab');
  await expectKeyboardFocus(desktopAction(page, '返回'), '返回');
  await page.keyboard.press('Tab');
  await expectKeyboardFocus(desktopAction(page, '下一步'), '下一步');
  await page.keyboard.press('Enter');
  const stepHeading = page.locator('#input-flow legend').first();
  await expect(stepHeading).toBeFocused();

  const budget = page.getByLabel('尽量省一些', { exact: true });
  await page.keyboard.press('Tab');
  await expectKeyboardFocus(budget, '尽量省一些');
  await page.keyboard.press('Space');
  await expect(budget).toBeChecked();
  await expect(page.locator('body')).toBeFocused();
  await page.keyboard.press('Tab');
  await expectKeyboardFocus(budget, '尽量省一些');
  for (const taste of ['辣', '咸鲜', '清淡', '酸', '甜', '浓郁']) {
    await page.keyboard.press('Tab');
    await expectKeyboardFocus(page.getByRole('button', { name: taste, exact: true }), taste);
  }
  await page.keyboard.press('Tab');
  await expectKeyboardFocus(page.getByLabel(/需要避开的食材/), /需要避开的食材/);
  await page.keyboard.press('Tab');
  await expectKeyboardFocus(desktopAction(page, '返回'), '返回');
  await page.keyboard.press('Tab');
  await expectKeyboardFocus(desktopAction(page, '生成推荐'), '生成推荐');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-state="success"]')).toBeVisible();
  await expect(page.locator('#recommendation-title')).toBeFocused();
});

test('focus and lighter scenes change the deterministic result for the same fixed conditions', async ({ page }) => {
  const titles = [];
  for (const scene of ['学习 / 工作', '清淡一点']) {
    if (titles.length) {
      await page.evaluate(() => localStorage.clear());
      await page.reload();
    }
    await openSinglePreferences(page, scene);
    await page.getByLabel('日常预算', { exact: true }).check();
    await desktopAction(page, '生成推荐').click();
    await expect(page.locator('[data-state="success"]')).toBeVisible();
    titles.push((await page.locator('#recommendation-title').textContent()).trim());
  }

  expect(titles[0]).not.toBe(titles[1]);
});

test('single result keeps visible reasons, image hierarchy, placeholder recovery, and retained-condition return', async ({ page }) => {
  await openSinglePreferences(page);
  await page.getByLabel('日常预算', { exact: true }).check();
  await page.getByRole('group', { name: '第 1 位食客偏好' }).getByRole('button', { name: '咸鲜', exact: true }).click();

  await desktopAction(page, '生成推荐').click();
  await expect(page.locator('[data-state="success"]')).toBeVisible();
  await expect(page.getByText('菜品灵感 · 非实时商家信息', { exact: true })).toBeVisible();
  const reasonBlock = page.locator('.reason-block').filter({ has: page.getByRole('heading', { name: '为什么推荐', exact: true }) });
  await expect(reasonBlock).toBeVisible();
  await expect(reasonBlock.locator('li').first()).not.toHaveText('');
  await expect(page.getByRole('heading', { name: '已通过的约束', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '需要知道的取舍', exact: true })).toBeVisible();
  await expect(page.locator('.source-badge')).toHaveText('菜品灵感');
  await expect(page.locator('.metric-grid')).toHaveCount(0);
  await expect(page.locator('.store-name')).toHaveCount(0);

  const primaryImage = page.locator('[data-primary-dish-image]');
  const alternativeImages = page.locator('[data-alternative-dish-image]');
  await expect(primaryImage).toBeVisible();
  await expect(alternativeImages).toHaveCount(2);
  const primaryWidth = Number(await primaryImage.getAttribute('width'));
  const alternativeWidth = Number(await alternativeImages.first().getAttribute('width'));
  expect(primaryWidth).toBeGreaterThan(alternativeWidth);
  await primaryImage.evaluate((image) => {
    if (image.dataset.imageKind !== 'placeholder') image.dispatchEvent(new Event('error'));
  });
  await expect(primaryImage).toHaveAttribute('src', /assets\/dishes\/placeholder\.svg$/);
  await expect(primaryImage).toHaveAttribute('data-image-kind', 'placeholder');
  await primaryImage.dispatchEvent('error');
  await expect(primaryImage).toHaveAttribute('src', /assets\/dishes\/placeholder\.svg$/);

  const firstDish = await page.locator('#recommendation-title').textContent();
  await page.locator('.result-actions').getByRole('button', { name: '换一个' }).click();
  await expect(page.locator('#recommendation-title')).not.toHaveText(firstDish);

  await page.getByRole('button', { name: '合适', exact: true }).click();
  await expect(page.getByText('已记下：这个方向合适。本次反馈不会上传。')).toBeVisible();

  const resultBack = page.locator('#result-content').getByRole('button', { name: '返回修改条件', exact: true });
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

test('empty result keeps exclusions strict and offers both recovery paths', async ({ page }) => {
  await openSinglePreferences(page, '快速解决');
  await page.getByLabel('日常预算', { exact: true }).check();
  const exclusions = page.getByRole('group', { name: '第 1 位食客偏好' }).getByLabel(/需要避开的食材/);
  await exclusions.fill('辣、咸鲜、酸、浓郁、甜、清淡');

  await desktopAction(page, '生成推荐').click();
  const empty = page.locator('[data-state="empty"]');
  await expect(empty).toBeVisible();
  await expect(empty).toContainText('忌口和过敏原没有被放宽');
  await expect(empty.getByRole('button', { name: '修改条件', exact: true })).toBeVisible();
  await expect(empty.getByRole('button', { name: '返回上一步', exact: true })).toBeVisible();

  await empty.getByRole('button', { name: '修改条件', exact: true }).click();
  await expect(page.locator('#input-flow legend').first()).toBeFocused();
  await expect(page.getByLabel('日常预算', { exact: true })).toBeChecked();
  await expect(page.getByRole('group', { name: '第 1 位食客偏好' }).getByLabel(/需要避开的食材/)).toHaveValue('辣、咸鲜、酸、浓郁、甜、清淡');
});

test('degraded compromise result explains the boundary and exposes condition recovery', async ({ page }) => {
  await openMultiPreferences(page, '还没想好');
  await page.getByLabel('日常预算', { exact: true }).check();
  await desktopAction(page, '生成推荐').click();

  const result = page.locator('[data-state="success"][data-plan-kind="compromise"]');
  await expect(result).toBeVisible();
  await expect(result.locator('.degraded-plan')).toContainText('这次需要折中');
  await expect(result.locator('.degraded-plan')).toContainText('尚未指定多人用餐方式');
  await expect(result.getByRole('button', { name: '返回修改条件', exact: true })).toBeVisible();
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
  const close = page.getByRole('button', { name: '关闭对话框' });
  const acknowledge = dialog.getByRole('button', { name: '知道了' });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(acknowledge).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

const responsiveScenarios = [
  { width: 320, height: 900, scene: '快速解决', theme: 'quick' },
  { width: 390, height: 900, scene: '学习 / 工作', theme: 'focus' },
  { width: 768, height: 1024, scene: '清淡一点', theme: 'lighter' },
  { width: 1024, height: 900, scene: '想吃点好的', theme: 'celebration' },
  { width: 1440, height: 1000, scene: '深夜加餐', theme: 'late-night' }
];

for (const { width, height, scene, theme } of responsiveScenarios) {
  test(`image-led discovery stays proportional and overflow-free at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await completeResponsiveSingleFlow(page, scene);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);

    const primary = page.locator('[data-primary-dish-image]');
    const alternatives = page.locator('[data-alternative-dish-image]');
    await expect(primary).toBeVisible();
    await expect(alternatives).toHaveCount(2);
    await expect.poll(() => primary.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);

    const primaryBox = await primary.boundingBox();
    expect(primaryBox).not.toBeNull();
    expect(Math.abs(primaryBox.width / primaryBox.height - (4 / 3))).toBeLessThan(0.01);
    for (const alternative of await alternatives.all()) {
      await expect.poll(() => alternative.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
      const alternativeBox = await alternative.boundingBox();
      expect(alternativeBox).not.toBeNull();
      expect(Math.abs(alternativeBox.width / alternativeBox.height - (4 / 3))).toBeLessThan(0.01);
      expect(primaryBox.width).toBeGreaterThan(alternativeBox.width * 1.2);
    }

    const overflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
    if (width === 1440) {
      const app = await page.locator('.app-main').boundingBox();
      expect(app.width).toBeLessThanOrEqual(1180);
    }
  });
}

test('all six scenario themes are selected only through the root theme attribute', async ({ page }) => {
  await page.getByLabel('1 人', { exact: true }).check();
  await desktopAction(page, '下一步').click();
  for (const [scene, theme] of [
    ['快速解决', 'quick'],
    ['学习 / 工作', 'focus'],
    ['清淡一点', 'lighter'],
    ['想吃点好的', 'celebration'],
    ['深夜加餐', 'late-night'],
    ['今天想省钱', 'quick']
  ]) {
    await page.getByLabel(scene, { exact: true }).check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  }

  await desktopAction(page, '返回').click();
  await page.getByLabel('2 人', { exact: true }).check();
  await desktopAction(page, '下一步').click();
  await page.getByLabel('一起聚餐', { exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'gathering');
  await expect(page.locator('[data-theme]')).toHaveCount(1);
});

test('reduced motion keeps loading and swap free of long-running animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.getByLabel('1 人', { exact: true }).check();
  await desktopAction(page, '下一步').click();
  await page.getByLabel('快速解决', { exact: true }).check();
  await desktopAction(page, '下一步').click();
  await page.getByLabel('日常预算', { exact: true }).check();
  await page.evaluate(() => {
    globalThis.__task10LoadingAnimationDurations = null;
    const observer = new MutationObserver(() => {
      const loading = document.querySelector('[data-state="loading"]');
      if (!loading) return;
      globalThis.__task10LoadingAnimationDurations = loading.getAnimations({ subtree: true })
        .map((animation) => Number(animation.effect?.getTiming().duration) || 0);
      observer.disconnect();
    });
    observer.observe(document.querySelector('#result-content'), { childList: true, subtree: true });
  });

  await desktopAction(page, '生成推荐').click();
  await expect(page.locator('[data-state="success"]')).toBeVisible();
  expect(await page.evaluate(() => globalThis.__task10LoadingAnimationDurations)).toEqual([]);

  const title = page.locator('#recommendation-title');
  const previous = (await title.textContent()).trim();
  await visibleAction(page, '换一个').click();
  await expect(title).not.toHaveText(previous);
  const longAnimations = await page.evaluate(() => document.getAnimations()
    .map((animation) => Number(animation.effect?.getTiming().duration) || 0)
    .filter((duration) => duration > 50));
  expect(longAnimations).toEqual([]);
});

test('200 percent zoom-equivalent layout keeps controls reachable without overlap', async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 900 });
  await completeResponsiveSingleFlow(page, '想吃点好的');
  const controls = await page.locator('#mobile-actions .button:visible').evaluateAll((buttons) => buttons.map((button) => {
    const box = button.getBoundingClientRect();
    return { left: box.left, right: box.right, width: box.width, height: box.height };
  }));
  expect(controls.length).toBe(2);
  expect(controls.every(({ left, right, width, height }) => left >= 0 && right <= 720 && width > 0 && height >= 44)).toBe(true);
  expect(controls[0].right).toBeLessThanOrEqual(controls[1].left);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
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
