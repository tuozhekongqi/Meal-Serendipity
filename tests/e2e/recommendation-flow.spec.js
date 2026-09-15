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
    [page.getByRole('button', { name: '数据与隐私', exact: true }), '数据与隐私']
  ];
  for (const [control, accessibleName] of controls) {
    await page.keyboard.press('Tab');
    await expectKeyboardFocus(control, accessibleName);
  }
}

async function completeResponsiveSingleFlow(page, scene = '犒赏自己') {
  await page.getByLabel('1 人', { exact: true }).check();
  await visibleAction(page, '下一步').click();
  await page.getByLabel(scene, { exact: true }).check();
  await visibleAction(page, '下一步').click();
  await page.getByLabel('日常选择', { exact: true }).check();
  await visibleAction(page, '生成推荐').click();
  await expect(page.locator('[data-state="success"]')).toBeVisible();
}

async function openSinglePreferences(page, scene = '犒赏自己') {
  await page.getByLabel('1 人', { exact: true }).check();
  await desktopAction(page, '下一步').click();
  await page.getByLabel(scene, { exact: true }).check();
  await desktopAction(page, '下一步').click();
}

async function openMultiPreferences(page, diningMode) {
  await page.getByLabel('2 人', { exact: true }).check();
  await desktopAction(page, '下一步').click();
  await page.getByLabel('多人聚餐', { exact: true }).check();
  await desktopAction(page, '下一步').click();
  await page.getByLabel(diningMode, { exact: true }).check();
  await desktopAction(page, '下一步').click();
}

test('approved copy refresh stays clear and the completed flow uses the success treatment', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '人间有味是清欢' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '循味而选' })).toBeVisible();
  await expect(page.getByText('菜品参考来自项目内置清单，实际配料请在用餐前确认。', { exact: true })).toBeVisible();

  await page.getByLabel('1 人', { exact: true }).check();
  await desktopAction(page, '下一步').click();
  await page.getByLabel('快速用餐', { exact: true }).check();
  await desktopAction(page, '下一步').click();
  await page.getByLabel('日常选择', { exact: true }).check();
  await desktopAction(page, '生成推荐').click();

  await expect(page.locator('[data-state="success"]')).toBeVisible();
  await expect(page.locator('.progress-block')).toHaveAttribute('data-progress-complete', 'true');
  const completeColor = await page.locator('.progress-list li').first().evaluate((node) => getComputedStyle(node).color);
  expect(completeColor).toBe('rgb(71, 122, 98)');
  await expect(page.getByRole('heading', { name: '推荐依据', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '食用提示', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '备选菜品', exact: true })).toBeVisible();

  const copyButton = page.locator('.result-actions').getByRole('button', { name: '复制菜名', exact: true });
  const colors = await copyButton.evaluate((button) => {
    const style = getComputedStyle(button);
    return { color: style.color, background: style.backgroundColor, border: style.borderColor };
  });
  expect(colors).toEqual({
    color: 'rgb(5, 0, 0)',
    background: 'rgb(255, 255, 255)',
    border: 'rgb(10, 0, 0)'
  });
});

test('party size is the first required decision and a single diner never sees dining mode', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '人间有味是清欢' })).toBeVisible();
  await expect(page.getByText('菜品参考', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('list', { name: '用餐选择进度' })).toBeVisible();
  await expect(page.getByRole('group', { name: /用餐人数/ })).toBeVisible();
  for (const label of ['1 人', '2 人', '3 人', '4 人以上']) {
    await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    await expect(page.getByLabel(label, { exact: true })).not.toBeChecked();
  }
  await expect(desktopAction(page, '下一步')).toBeDisabled();
  await expect(page.getByRole('group', { name: /用餐方式/ })).toHaveCount(0);

  await page.getByLabel('1 人', { exact: true }).check();
  await expect(desktopAction(page, '下一步')).toBeEnabled();
  await desktopAction(page, '下一步').click();
  await expect(page.getByRole('group', { name: /用餐场景/ })).toBeVisible();
  await expect(page.getByRole('group', { name: /用餐方式/ })).toHaveCount(0);

  await page.getByLabel('学习或工作', { exact: true }).check();
  await desktopAction(page, '下一步').click();
  await expect(page.getByRole('group', { name: /预算倾向/ })).toBeVisible();
  await expect(page.getByRole('group', { name: /用餐方式/ })).toHaveCount(0);

  await desktopAction(page, '返回').click();
  await expect(page.getByLabel('学习或工作', { exact: true })).toBeChecked();
  await desktopAction(page, '返回').click();
  await expect(page.getByLabel('1 人', { exact: true })).toBeChecked();
});

test('dining mode is required for six diners and exposes all four compatible modes', async ({ page }) => {
  await page.getByLabel('4 人以上', { exact: true }).check();
  const exactCount = page.getByLabel('实际用餐人数', { exact: true });
  await expect(exactCount).toBeVisible();
  await expect(page.getByText('请输入 4 至 50 人。', { exact: true })).toBeVisible();
  await exactCount.fill('');
  await expect(desktopAction(page, '下一步')).toBeDisabled();
  await exactCount.fill('6');
  await expect(desktopAction(page, '下一步')).toBeEnabled();
  await desktopAction(page, '下一步').click();

  await page.getByLabel('多人聚餐', { exact: true }).check();
  await desktopAction(page, '下一步').click();

  const next = desktopAction(page, '下一步');
  await expect(next).toBeDisabled();
  for (const label of ['共享菜品', '每人单独选择', '同一菜系，分别选菜', '暂未决定']) {
    const option = page.getByLabel(label, { exact: true });
    await expect(option).toBeVisible();
    await option.check();
    await expect(option).toBeChecked();
    await expect(next).toBeEnabled();
  }
  await next.click();

  await expect(page.locator('[data-diner-region]')).toHaveCount(6);
  await expect(page.getByRole('group', { name: '第 6 位用餐者' })).toBeVisible();
  await expect(page.getByLabel(/姓名|称呼/)).toHaveCount(0);
  await expect(page.locator('input[name*="name" i]')).toHaveCount(0);

  await desktopAction(page, '返回').click();
  await expect(page.getByLabel('暂未决定', { exact: true })).toBeChecked();
  await desktopAction(page, '返回').click();
  await expect(page.getByLabel('多人聚餐', { exact: true })).toBeChecked();
  await desktopAction(page, '返回').click();
  await expect(page.getByLabel('4 人以上', { exact: true })).toBeChecked();
  await expect(exactCount).toHaveValue('6');
});

for (const diningMode of ['共享菜品', '每人单独选择', '同一菜系，分别选菜', '暂未决定']) {
  test(`dining mode ${diningMode} composes a real two-diner result`, async ({ page }) => {
    await openMultiPreferences(page, diningMode);
    await page.getByLabel('日常选择', { exact: true }).check();
    await page.getByRole('group', { name: '第 1 位用餐者' }).getByRole('button', { name: '辣', exact: true }).click();
    await page.getByRole('group', { name: '第 2 位用餐者' }).getByRole('button', { name: '清淡', exact: true }).click();
    await desktopAction(page, '生成推荐').click();

    const result = page.locator('[data-state="success"]');
    await expect(result).toBeVisible();
    await expect(result.locator('#recommendation-title')).toBeVisible();
    await expect(result.locator('.plan-primary')).toBeVisible();
    await expect(result.locator('[data-primary-dish-image]')).toHaveCount(1);
    await expect(result.locator('.plan-evidence').getByRole('heading', { name: '推荐依据', exact: true })).toBeVisible();
    await expect(result.locator('.plan-evidence').getByRole('heading', { name: '食用提示', exact: true })).toBeVisible();
    await expect(result.locator('[data-alternative-id]')).toHaveCount(2);
    await expect(result.locator('.result-identity')).toHaveText('菜品参考');
    if (diningMode === '共享菜品') {
      const bundle = result.locator('.meal-plan-structure[data-plan-kind="shared_bundle"]');
      await expect(bundle).toBeVisible();
      await expect(bundle.locator('[data-serving-role]')).toHaveCount(2);
      await expect(bundle.locator('.supporting-constraints')).toHaveCount(2);
      await expect(bundle.locator('.supporting-tradeoffs')).toHaveCount(0);
    } else if (diningMode === '每人单独选择') {
      await expect(result).toHaveAttribute('data-plan-kind', 'individual_set');
      await expect(result.locator('[data-diner-assignment]')).toHaveCount(2);
      await expect(result.locator('.supporting-constraints')).toHaveCount(2);
      await expect(result.locator('.supporting-tradeoffs')).toHaveCount(0);
    } else if (diningMode === '同一菜系，分别选菜') {
      await expect(result).toHaveAttribute('data-plan-kind', 'same_cuisine_set');
      await expect(result.locator('[data-diner-assignment]')).toHaveCount(2);
      await expect(result.locator('.supporting-constraints')).toHaveCount(2);
      await expect(result.locator('.supporting-tradeoffs')).toHaveCount(0);
    } else {
      await expect(result).toHaveAttribute('data-plan-kind', 'compromise');
      await expect(result.locator('[data-alternative-id]').filter({ hasText: '共享菜组合' })).toHaveCount(1);
      await expect(result.locator('[data-alternative-id]').filter({ hasText: '每人单独选择' })).toHaveCount(1);
    }
  });
}

test('selecting a suitable plan alternative promotes the complete direction locally', async ({ page }) => {
  await openMultiPreferences(page, '每人单独选择');
  await page.getByLabel('日常选择', { exact: true }).check();
  await desktopAction(page, '生成推荐').click();

  const result = page.locator('[data-state="success"]');
  const primaryHero = result.locator('.plan-primary .recommendation-title-row h4');
  const oldPrimaryName = (await primaryHero.textContent()).trim();
  const selected = result.locator('[data-alternative-id]').first();
  const selectedPlanId = await selected.getAttribute('data-alternative-id');
  const selectedHeroName = await selected.locator('[data-alternative-hero-name]').getAttribute('data-alternative-hero-name');

  await selected.click();

  await expect(result.locator('.plan-primary .recommendation-title-row h4')).toHaveText(selectedHeroName);
  await expect(result.locator('#recommendation-title')).toBeFocused();
  await expect(result.locator(`[data-alternative-id="${selectedPlanId}"]`)).toHaveCount(0);
  await expect(result.locator('[data-diner-assignment]')).toHaveCount(2);
  await expect(result.locator('[data-alternative-hero-name]').first()).toHaveAttribute(
    'data-alternative-hero-name',
    oldPrimaryName
  );
});

test('keyboard selections retain logical focus for non-default party size and multiple diner tastes', async ({ page }) => {
  await expect(page.locator('body')).toBeFocused();
  await tabThroughPageHeader(page);
  await page.keyboard.press('Tab');
  await expectKeyboardFocus(page.getByLabel('1 人', { exact: true }), '1 人');

  const threeDiners = page.getByLabel('3 人', { exact: true });
  await threeDiners.focus();
  await page.keyboard.press('Space');
  await expect(threeDiners).toBeChecked();
  await expectKeyboardFocus(threeDiners, '3 人');
  await page.keyboard.press('Tab');
  await expectKeyboardFocus(desktopAction(page, '下一步'), '下一步');
  await page.keyboard.press('Enter');
  await expect(page.locator('#input-flow legend').first()).toBeFocused();

  const scene = page.getByLabel('口味各异', { exact: true });
  await scene.focus();
  await page.keyboard.press('Space');
  await expect(scene).toBeChecked();
  await expectKeyboardFocus(scene, '口味各异');
  await page.keyboard.press('Tab');
  await expectKeyboardFocus(desktopAction(page, '返回'), '返回');
  await page.keyboard.press('Tab');
  await expectKeyboardFocus(desktopAction(page, '下一步'), '下一步');
  await page.keyboard.press('Enter');
  await expect(page.locator('#input-flow legend').first()).toBeFocused();

  const diningMode = page.getByLabel('每人单独选择', { exact: true });
  await diningMode.focus();
  await page.keyboard.press('Space');
  await expect(diningMode).toBeChecked();
  await expectKeyboardFocus(diningMode, '每人单独选择');
  await desktopAction(page, '下一步').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#input-flow legend').first()).toBeFocused();

  const budget = page.getByLabel('节省预算', { exact: true });
  await budget.focus();
  await page.keyboard.press('Space');
  await expect(budget).toBeChecked();
  await expectKeyboardFocus(budget, '节省预算');

  const dinerOne = page.getByRole('group', { name: '第 1 位用餐者' });
  const dinerTwo = page.getByRole('group', { name: '第 2 位用餐者' });
  for (const [region, taste] of [[dinerOne, '辣'], [dinerOne, '甜'], [dinerTwo, '清淡']]) {
    const chip = region.getByRole('button', { name: taste, exact: true });
    await chip.focus();
    await page.keyboard.press('Space');
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expectKeyboardFocus(chip, taste);
    await expect(page.locator('body')).not.toBeFocused();
  }

  await desktopAction(page, '生成推荐').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-state="success"]')).toBeVisible();
  await expect(page.locator('#recommendation-title')).toBeFocused();

  await page.getByRole('button', { name: '修改条件', exact: true }).first().click();
  await expect(page.locator('#input-flow legend').first()).toBeFocused();
});

test('focus and lighter scenes change the deterministic result for the same fixed conditions', async ({ page }) => {
  const titles = [];
  for (const scene of ['学习或工作', '偏好清淡']) {
    if (titles.length) {
      await page.evaluate(() => localStorage.clear());
      await page.reload();
    }
    await openSinglePreferences(page, scene);
    await page.getByLabel('日常选择', { exact: true }).check();
    await desktopAction(page, '生成推荐').click();
    await expect(page.locator('[data-state="success"]')).toBeVisible();
    titles.push((await page.locator('#recommendation-title').textContent()).trim());
  }

  expect(titles[0]).not.toBe(titles[1]);
});

test('single result keeps visible reasons, image hierarchy, placeholder recovery, and retained-condition return', async ({ page }) => {
  await openSinglePreferences(page);
  await page.getByLabel('日常选择', { exact: true }).check();
  await page.getByRole('group', { name: '第 1 位用餐者' }).getByRole('button', { name: '咸鲜', exact: true }).click();

  await desktopAction(page, '生成推荐').click();
  await expect(page.locator('[data-state="success"]')).toBeVisible();
  await expect(page.getByText('菜品参考', { exact: true }).last()).toBeVisible();
  const reasonBlock = page.locator('.reason-block').filter({ has: page.getByRole('heading', { name: '推荐依据', exact: true }) });
  await expect(reasonBlock).toBeVisible();
  await expect(reasonBlock.locator('li').first()).not.toHaveText('');
  await expect(page.getByRole('heading', { name: '食用提示', exact: true })).toBeVisible();
  await expect(page.locator('.source-badge')).toHaveCount(0);
  await expect(page.locator('.metric-grid')).toHaveCount(0);
  await expect(page.locator('.store-name')).toHaveCount(0);

  const copyName = (await page.locator('#recommendation-title').textContent()).trim();
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        async writeText(value) {
          document.documentElement.dataset.copiedDishName = value;
        }
      }
    });
  });
  await page.locator('.result-actions').getByRole('button', { name: '复制菜名', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-copied-dish-name', copyName);

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
  await expect(primaryImage).toHaveAttribute('alt', '暂无对应菜品图片');
  await primaryImage.dispatchEvent('error');
  await expect(primaryImage).toHaveAttribute('src', /assets\/dishes\/placeholder\.svg$/);

  const firstDish = await page.locator('#recommendation-title').textContent();
  await page.locator('.result-actions').getByRole('button', { name: '换一个' }).click();
  await expect(page.locator('#recommendation-title')).not.toHaveText(firstDish);

  await page.getByRole('button', { name: '合适', exact: true }).click();
  await expect(page.getByText('已记下：这个方向合适。本次反馈不会上传。')).toBeVisible();

  const resultBack = page.locator('#result-content').getByRole('button', { name: '修改条件', exact: true });
  for (let step = 0; step < 8 && !(await resultBack.evaluate((button) => button === document.activeElement)); step += 1) {
    await page.keyboard.press('Shift+Tab');
  }
  await expect(resultBack).toBeFocused();
  await page.keyboard.press('Enter');

  const preferencesHeading = page.locator('#input-flow legend').first();
  await expect(preferencesHeading).toBeFocused();
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
  await expect(page.getByLabel('日常选择', { exact: true })).toBeChecked();
  await expect(page.getByRole('group', { name: '第 1 位用餐者' }).getByRole('button', { name: '咸鲜', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('empty result keeps exclusions strict and offers both recovery paths', async ({ page }) => {
  await openSinglePreferences(page, '快速用餐');
  await page.getByLabel('日常选择', { exact: true }).check();
  const exclusions = page.getByRole('group', { name: '第 1 位用餐者' }).getByLabel(/忌口或过敏食材/);
  await exclusions.fill('辣、咸鲜、酸、浓郁、甜、清淡');

  await desktopAction(page, '生成推荐').click();
  const empty = page.locator('[data-state="empty"]');
  await expect(empty).toBeVisible();
  await expect(empty).toContainText('已保留所有忌口条件');
  await expect(empty.getByRole('button', { name: '修改条件', exact: true })).toBeVisible();
  await expect(empty.getByRole('button', { name: '返回上一步', exact: true })).toBeVisible();

  await empty.getByRole('button', { name: '修改条件', exact: true }).click();
  await expect(page.locator('#input-flow legend').first()).toBeFocused();
  await expect(page.getByLabel('日常选择', { exact: true })).toBeChecked();
  await expect(page.getByRole('group', { name: '第 1 位用餐者' }).getByLabel(/忌口或过敏食材/)).toHaveValue('辣、咸鲜、酸、浓郁、甜、清淡');
});

test('degraded compromise result explains the boundary and exposes condition recovery', async ({ page }) => {
  await openMultiPreferences(page, '暂未决定');
  await page.getByLabel('日常选择', { exact: true }).check();
  await desktopAction(page, '生成推荐').click();

  const result = page.locator('[data-state="success"][data-plan-kind="compromise"]');
  await expect(result).toBeVisible();
  await expect(result.locator('.degraded-plan')).toContainText('折中方案');
  await expect(result.locator('.degraded-plan')).toContainText('尚未选择多人用餐方式');
  await expect(result.getByRole('button', { name: '修改条件', exact: true })).toBeVisible();
});

test('swap rotation never repeats a shown primary and never relaxes exhausted exclusions', async ({ page }) => {
  test.setTimeout(60_000);
  await openSinglePreferences(page, '快速用餐');
  await page.getByLabel('暂不限制', { exact: true }).check();
  await desktopAction(page, '生成推荐').click();
  await expect(page.locator('[data-state="success"]')).toBeVisible();

  const title = page.locator('#recommendation-title');
  const swap = page.locator('.result-actions').getByRole('button', { name: '换一个', exact: true });
  const exhaustedMessage = '暂时没有更多符合条件的菜品';
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
  await openSinglePreferences(page, '偏好清淡');
  await page.getByLabel('日常选择', { exact: true }).check();
  const diner = page.getByRole('group', { name: '第 1 位用餐者' });
  await diner.getByRole('button', { name: '辣', exact: true }).click();
  await diner.getByLabel(/忌口或过敏食材/).fill('花生');
  await desktopAction(page, '生成推荐').click();
  await expect(page.locator('[data-state="success"]')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('meal-serendipity:preferences'))).not.toContain('花生');

  await page.reload();
  await expect(page.getByLabel('1 人', { exact: true })).toBeChecked();
  await desktopAction(page, '下一步').click();
  await page.getByLabel('偏好清淡', { exact: true }).check();
  await desktopAction(page, '下一步').click();
  const restoredDiner = page.getByRole('group', { name: '第 1 位用餐者' });
  await expect(restoredDiner.getByRole('button', { name: '辣', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(restoredDiner.getByLabel(/忌口或过敏食材/)).toHaveValue('');
});

test('data dialog traps focus, closes with Escape, and returns focus to its trigger', async ({ page }) => {
  const trigger = page.getByRole('button', { name: '数据与隐私' });
  await trigger.focus();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '数据与隐私' });
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toContainText('马上推荐');
  await expect(dialog).toContainText('多人偏好只用于本次推荐，不会保存或上传');
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
  { width: 320, height: 900, scene: '快速用餐', theme: 'quick' },
  { width: 390, height: 900, scene: '学习或工作', theme: 'focus' },
  { width: 768, height: 1024, scene: '偏好清淡', theme: 'lighter' },
  { width: 1024, height: 900, scene: '犒赏自己', theme: 'celebration' },
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
    ['快速用餐', 'quick'],
    ['学习或工作', 'focus'],
    ['偏好清淡', 'lighter'],
    ['犒赏自己', 'celebration'],
    ['深夜加餐', 'late-night'],
    ['节省预算', 'quick']
  ]) {
    await page.getByLabel(scene, { exact: true }).check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  }

  await desktopAction(page, '返回').click();
  await page.getByLabel('2 人', { exact: true }).check();
  await desktopAction(page, '下一步').click();
  await page.getByLabel('多人聚餐', { exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'gathering');
  await expect(page.locator('[data-theme]')).toHaveCount(1);
});

test('reduced motion keeps loading and swap free of long-running animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.getByLabel('1 人', { exact: true }).check();
  await desktopAction(page, '下一步').click();
  await page.getByLabel('快速用餐', { exact: true }).check();
  await desktopAction(page, '下一步').click();
  await page.getByLabel('日常选择', { exact: true }).check();
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
  await completeResponsiveSingleFlow(page, '犒赏自己');
  const controls = await page.locator('#mobile-actions .button:visible').evaluateAll((buttons) => buttons.map((button) => {
    const box = button.getBoundingClientRect();
    return {
      left: box.left,
      right: box.right,
      top: box.top,
      bottom: box.bottom,
      width: box.width,
      height: box.height
    };
  }));
  expect(controls.length).toBe(3);
  expect(controls.every(({ left, right, width, height }) => left >= 0 && right <= 720 && width > 0 && height >= 44)).toBe(true);
  for (let left = 0; left < controls.length; left += 1) {
    for (let right = left + 1; right < controls.length; right += 1) {
      const horizontalOverlap = controls[left].left < controls[right].right
        && controls[right].left < controls[left].right;
      const verticalOverlap = controls[left].top < controls[right].bottom
        && controls[right].top < controls[left].bottom;
      expect(horizontalOverlap && verticalOverlap).toBe(false);
    }
  }
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
