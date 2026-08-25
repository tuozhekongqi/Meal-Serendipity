import assert from 'node:assert/strict';
import test from 'node:test';

import { renderRecommendation } from '../../src/components/recommendation-card.js';

function interactiveElement(dataset = {}) {
  const listeners = new Map();
  return {
    dataset,
    addEventListener(type, handler) { listeners.set(type, handler); },
    click() { listeners.get('click')?.(); }
  };
}

function rootStub(images = [], alternativeIds = []) {
  const result = interactiveElement();
  const controls = {
    primary: interactiveElement(),
    swap: interactiveElement(),
    back: interactiveElement(),
    alternatives: alternativeIds.map((alternativeId) => (
      interactiveElement({ alternativeId })
    ))
  };
  return {
    innerHTML: '',
    controls,
    querySelector(selector) {
      if (selector === '[data-result-action="primary"]') return controls.primary;
      if (selector === '[data-result-action="swap"]') return controls.swap;
      if (selector === '[data-result-action="back"]') return controls.back;
      return result;
    },
    querySelectorAll(selector) {
      if (selector === '[data-dish-image]') return images;
      if (selector === '[data-alternative-id]') return controls.alternatives;
      return [];
    }
  };
}

function card({
  id = 'dish:primary',
  name = '番茄牛腩饭',
  reason = '咸鲜口味与本次偏好一致',
  image = './assets/dishes/tomato-beef-rice.webp'
} = {}) {
  return {
    identity: { label: '菜品灵感 · 非实时商家信息' },
    image: {
      src: image,
      alt: `${name}菜品灵感示意图`,
      kind: 'dish-inspiration'
    },
    name,
    partyLabel: '2 人用餐',
    sceneLabel: '一起聚餐',
    tags: ['米饭', '咸鲜'],
    description: '酸甜浓郁，适合配米饭。',
    reasons: [{ code: 'taste_match', message: reason }],
    passedConstraints: ['exclusion'],
    tradeoffs: [{ code: 'budget_tier', message: '灵感模式价格需在平台确认' }],
    action: { kind: 'copy', label: '复制菜名' },
    id,
    storeName: null,
    metrics: [],
    runway: [{ label: '忌口检查', value: '已避开', status: 'passed' }]
  };
}

function viewModel(overrides = {}) {
  return {
    kind: 'single',
    mode: { value: 'inspiration', label: '菜品灵感', notices: [] },
    partyLabel: '2 人用餐',
    sceneLabel: '一起聚餐',
    primary: card(),
    alternatives: [],
    bundleItems: [],
    assignments: [],
    diagnostics: { missingDinerIds: [], degradedFrom: null, reason: null },
    ...overrides
  };
}

function render(view, images = []) {
  const root = rootStub(images);
  assert.doesNotThrow(() => renderRecommendation(root, view, {
    onSwap() {},
    onBack() {},
    onAlternative() {},
    onPrimaryAction() {}
  }));
  return root.innerHTML;
}

function assertOrdered(markup, labels) {
  let previous = -1;
  for (const label of labels) {
    const next = markup.indexOf(label);
    assert.ok(next > previous, `expected ${label} after the previous result block`);
    previous = next;
  }
}

test('single result keeps the image-led hierarchy, visible evidence, recovery actions, and two alternatives', () => {
  const markup = render(viewModel({
    alternatives: [
      card({ id: 'dish:alternative-a', name: '清汤牛肉面', reason: '更偏清淡口味' }),
      card({ id: 'dish:alternative-b', name: '香菇鸡肉饭', reason: '同样通过忌口检查' }),
      card({ id: 'dish:alternative-c', name: '不应出现的第三项' })
    ]
  }));

  assertOrdered(markup, [
    '菜品灵感 · 非实时商家信息',
    '2 人用餐 · 一起聚餐',
    'data-primary-dish-image',
    'id="recommendation-title" tabindex="-1">番茄牛腩饭',
    '为什么推荐',
    '咸鲜口味与本次偏好一致',
    '已通过的约束',
    '需要知道的取舍',
    '换一个',
    '返回修改条件',
    '如果想换'
  ]);
  assert.match(markup, /<img[^>]*src="\.\/assets\/dishes\/tomato-beef-rice\.webp"[^>]*alt="番茄牛腩饭菜品灵感示意图"[^>]*width="\d+"[^>]*height="\d+"[^>]*loading="eager"[^>]*decoding="async"[^>]*data-image-kind="dish-inspiration"[^>]*data-primary-dish-image/);
  assert.equal((markup.match(/data-alternative-id=/g) ?? []).length, 2);
  assert.equal((markup.match(/data-alternative-dish-image/g) ?? []).length, 2);
  assert.match(markup, /清汤牛肉面/);
  assert.match(markup, /更偏清淡口味/);
  assert.match(markup, /香菇鸡肉饭/);
  assert.match(markup, /同样通过忌口检查/);
  assert.doesNotMatch(markup, /不应出现的第三项/);
  assert.doesNotMatch(markup, /商家名称|实时价格|距离|ETA|库存|可下单/);
});

test('primary copy and safe alternatives are real controls with their advertised callbacks', () => {
  const primary = card();
  const root = rootStub([], ['plan:alternative']);
  let primaryAction = null;
  let selectedAlternativeId = null;

  renderRecommendation(root, viewModel({
    primary,
    alternatives: [{
      planId: 'plan:alternative',
      title: '另一组安全搭配',
      summary: '完整替代方案',
      hero: card({ id: 'dish:alternative' })
    }]
  }), {
    onPrimaryAction(value) { primaryAction = value; },
    onAlternative(value) { selectedAlternativeId = value; }
  });

  assert.match(root.innerHTML, /data-result-action="primary"[^>]*>复制菜名</);
  assert.match(root.innerHTML, /data-alternative-id="plan:alternative"[^]*选为当前方案/);
  root.controls.primary.click();
  root.controls.alternatives[0].click();
  assert.equal(primaryAction, primary);
  assert.equal(selectedAlternativeId, 'plan:alternative');
});

test('shared bundle exposes each serving role and each item reason', () => {
  const markup = render(viewModel({
    kind: 'shared_bundle',
    bundleItems: [
      { role: 'shared-main', card: card({ id: 'dish:shared', name: '砂锅炖菜', reason: '适合作为共享主菜' }) },
      { role: 'side', card: card({ id: 'dish:side', name: '清炒时蔬', reason: '补充清爽配菜' }) }
    ]
  }));

  assert.match(markup, /共享菜组合/);
  assert.match(markup, /共享主菜/);
  assert.match(markup, /适合作为共享主菜/);
  assert.match(markup, /配菜/);
  assert.match(markup, /补充清爽配菜/);
});

test('individual set preserves every diner owner heading and its own reasons', () => {
  const markup = render(viewModel({
    kind: 'individual_set',
    primary: null,
    assignments: [
      { dinerId: 'diner-1', ownerLabel: '第 1 位', card: card({ id: 'dish:one', name: '鸡丝凉面', reason: '第 1 位偏好清淡' }) },
      { dinerId: 'diner-2', ownerLabel: '第 2 位', card: card({ id: 'dish:two', name: '麻婆豆腐饭', reason: '第 2 位偏好辣味' }) }
    ]
  }));

  assert.match(markup, /分人安排/);
  assert.match(markup, /第 1 位/);
  assert.match(markup, /第 1 位偏好清淡/);
  assert.match(markup, /第 2 位/);
  assert.match(markup, /第 2 位偏好辣味/);
});

test('multi-person result renders a plan hero, plan evidence, assignment constraints, tradeoffs, and plan alternatives', () => {
  const primary = card({ id: 'dish:hero', name: '香辣主图菜' });
  const assignment = card({ id: 'dish:assignment', name: '清香豆腐' });
  const alternativeHero = card({ id: 'dish:alternative-plan', name: '另一组主图菜' });
  const markup = render(viewModel({
    kind: 'individual_set',
    primary,
    planSummary: {
      title: '每个人单独点',
      summary: '已按两位食客分别安排。',
      reasons: [{ code: 'assignment_complete', message: '两份菜品都保留了对应食客。' }],
      passedConstraints: ['exclusion'],
      tradeoffs: [{ code: 'plan_taste_gap', message: '仍有一位未命中已选口味。' }]
    },
    assignments: [
      { dinerId: 'diner-1', ownerLabel: '第 1 位', card: assignment }
    ],
    alternatives: [{
      planId: 'plan:alternative',
      kind: 'individual_set',
      title: '另一组逐人搭配',
      summary: '两份不同的安全菜品。',
      differenceLabel: '换一组菜品',
      hero: alternativeHero,
      assignments: [],
      bundleItems: []
    }]
  }));

  assertOrdered(markup, [
    '每个人单独点',
    'data-primary-dish-image',
    '两份菜品都保留了对应食客',
    '已通过的约束',
    '仍有一位未命中已选口味',
    '第 1 位',
    '另一组逐人搭配',
    '选为当前方案'
  ]);
  assert.ok((markup.match(/忌口与过敏原已避开/g) ?? []).length >= 2);
  assert.ok((markup.match(/灵感模式价格需在平台确认/g) ?? []).length >= 1);
  assert.match(markup, /data-alternative-id="plan:alternative"/);
  assert.equal((markup.match(/data-primary-dish-image/g) ?? []).length, 1);
});

test('same-cuisine set keeps its plan identity, diner ownership, and reasons', () => {
  const markup = render(viewModel({
    kind: 'same_cuisine_set',
    primary: null,
    assignments: [
      { dinerId: 'diner-1', ownerLabel: '第 1 位', card: card({ id: 'dish:one', name: '牛肉面', reason: '同属西北风味' }) },
      { dinerId: 'diner-2', ownerLabel: '第 2 位', card: card({ id: 'dish:two', name: '羊肉泡馍', reason: '保留第 2 位的浓郁偏好' }) }
    ]
  }));

  assert.match(markup, /同菜系不同菜/);
  assert.match(markup, /第 1 位[^]*同属西北风味/);
  assert.match(markup, /第 2 位[^]*保留第 2 位的浓郁偏好/);
});

test('degraded compromise names the incomplete promise and missing diner while exposing condition editing', () => {
  const markup = render(viewModel({
    kind: 'compromise',
    primary: null,
    assignments: [
      { dinerId: 'diner-1', ownerLabel: '第 1 位', card: card({ id: 'dish:one', reason: '第 1 位有安全候选' }) },
      { dinerId: 'diner-2', ownerLabel: '第 2 位', card: null }
    ],
    diagnostics: {
      missingDinerIds: ['diner-2'],
      degradedFrom: 'same_cuisine_set',
      reason: 'insufficient_same_cuisine_candidates'
    }
  }));

  assert.match(markup, /需要折中/);
  assert.match(markup, /未能完成“同菜系不同菜”的安排/);
  assert.match(markup, /第 2 位/);
  assert.match(markup, /暂时没有符合全部条件的菜品/);
  assert.match(markup, /同菜系的安全候选不足/);
  assert.match(markup, /返回修改条件/);
});

test('dish image error falls back to the placeholder once without retaining an error listener', () => {
  let errorHandler = null;
  let listenerRemoved = 0;
  const image = {
    src: './assets/dishes/tomato-beef-rice.webp',
    dataset: { imageKind: 'dish-inspiration' },
    addEventListener(type, handler) {
      if (type === 'error') errorHandler = handler;
    },
    removeEventListener(type, handler) {
      if (type === 'error' && handler === errorHandler) {
        errorHandler = null;
        listenerRemoved += 1;
      }
    }
  };

  render(viewModel(), [image]);
  assert.equal(typeof errorHandler, 'function');
  const firstHandler = errorHandler;
  firstHandler();
  assert.equal(image.src, './assets/dishes/placeholder.svg');
  assert.equal(image.dataset.imageKind, 'placeholder');
  assert.equal(errorHandler, null);
  assert.equal(listenerRemoved, 1);
  firstHandler();
  assert.equal(listenerRemoved, 1);
  assert.equal(image.src, './assets/dishes/placeholder.svg');
});
