import assert from 'node:assert/strict';
import test from 'node:test';

import {
  renderEmptyState,
  renderErrorState,
  renderLoadingState,
  renderStatusActions
} from '../../src/components/feedback.js';
import { renderModeNotice, renderRecommendation } from '../../src/components/recommendation-card.js';

function rootStub() {
  return {
    className: '',
    innerHTML: '',
    querySelector() { return null; }
  };
}

function interactiveRoot() {
  const handlers = new Map();
  return {
    ...rootStub(),
    querySelector(selector) {
      return {
        addEventListener(type, handler) {
          if (type === 'click') handlers.set(selector, handler);
        }
      };
    },
    click(selector) {
      handlers.get(selector)?.();
    }
  };
}

test('empty state says exclusions stayed strict and wires both condition recovery paths', () => {
  let emptyEdits = 0;
  let emptyBacks = 0;
  const emptyRoot = interactiveRoot();
  renderEmptyState(emptyRoot, {
    onEdit() { emptyEdits += 1; },
    onBack() { emptyBacks += 1; }
  });
  assert.match(emptyRoot.innerHTML, /data-state="empty"/);
  assert.match(emptyRoot.innerHTML, /state-visual neutral/);
  assert.match(emptyRoot.innerHTML, /state-symbol[^>]*>−</);
  assert.match(emptyRoot.innerHTML, /这些条件没有合适结果/);
  assert.match(emptyRoot.innerHTML, /忌口和过敏原没有被放宽/);
  assert.match(emptyRoot.innerHTML, /data-state-action="edit"[^>]*>修改条件</);
  assert.match(emptyRoot.innerHTML, /data-state-action="back"[^>]*>返回上一步</);
  emptyRoot.click('[data-state-action="edit"]');
  emptyRoot.click('[data-state-action="back"]');
  assert.equal(emptyEdits, 1);
  assert.equal(emptyBacks, 1);
});

test('error state retains conditions and wires retry plus return through the real component', () => {
  let retries = 0;
  let errorBacks = 0;
  const errorRoot = interactiveRoot();
  renderErrorState(errorRoot, {
    onRetry() { retries += 1; },
    onBack() { errorBacks += 1; }
  });
  assert.match(errorRoot.innerHTML, /data-state="error"/);
  assert.match(errorRoot.innerHTML, /state-visual error/);
  assert.match(errorRoot.innerHTML, /state-symbol[^>]*>!</);
  assert.match(errorRoot.innerHTML, /本次条件仍会保留/);
  assert.match(errorRoot.innerHTML, /data-state-action="retry"[^>]*>重试</);
  assert.match(errorRoot.innerHTML, /data-state-action="back"[^>]*>返回</);
  assert.doesNotMatch(errorRoot.innerHTML, /重置本次条件/);
  errorRoot.click('[data-state-action="retry"]');
  errorRoot.click('[data-state-action="back"]');
  assert.equal(retries, 1);
  assert.equal(errorBacks, 1);
});

test('loading state exposes busy semantics, static skeleton bars, and the retained cancel return', () => {
  let backs = 0;
  const root = interactiveRoot();
  renderLoadingState(root, () => { backs += 1; });
  assert.match(root.innerHTML, /data-state="loading"/);
  assert.match(root.innerHTML, /aria-busy="true"/);
  assert.match(root.innerHTML, /loading-bars/);
  assert.match(root.innerHTML, /正在筛选/);
  assert.doesNotMatch(root.innerHTML, /state-visual error/);
  assert.match(root.innerHTML, /data-state-action="back"[^>]*>返回</);
  root.click('[data-state-action="back"]');
  assert.equal(backs, 1);
});

test('success copy states the decision directly without generic AI phrasing', () => {
  const resultRoot = {
    ...rootStub(),
    querySelectorAll() { return []; }
  };
  renderRecommendation(resultRoot, {
    mode: { value: 'inspiration', label: '菜品灵感' },
    kind: 'single',
    partyLabel: '1 人用餐',
    sceneLabel: '想吃点好的',
    primary: {
      identity: { label: '菜品灵感 · 非实时商家信息' },
      image: { src: './assets/dishes/placeholder.svg', alt: '菜品灵感占位图', kind: 'placeholder' },
      id: 'dish:one', name: '番茄牛腩饭', description: '酸甜浓郁，配米饭。',
      storeName: null, tags: ['米饭', '咸鲜'], runway: [], metrics: [],
      reasons: [{ message: '符合你选择的口味' }], passedConstraints: ['exclusion'], tradeoffs: [],
      action: { kind: 'copy', label: '复制菜名' }
    },
    alternatives: [], bundleItems: [], assignments: [],
    diagnostics: { missingDinerIds: [], degradedFrom: null, reason: null }
  }, { onSwap() {}, onAlternative() {}, onPrimaryAction() {} });
  assert.match(resultRoot.innerHTML, /菜品灵感 · 非实时商家信息/);
  assert.doesNotMatch(resultRoot.innerHTML, /food-spark|为你|智能推荐|AI/);
});

test('mobile status actions cannot retain stale result controls', () => {
  const root = rootStub();
  renderStatusActions(root, 'loading');
  assert.match(root.innerHTML, /正在推荐/);
  assert.match(root.innerHTML, /disabled/);
  assert.doesNotMatch(root.innerHTML, /复制菜名|换一个/);

  renderStatusActions(root, 'error');
  assert.equal(root.innerHTML, '');
  renderStatusActions(root, 'empty');
  assert.equal(root.innerHTML, '');
});

test('provider fallback is clearly labeled as static inspiration', () => {
  const root = rootStub();
  renderModeNotice(root, {
    value: 'inspiration',
    notices: [{ code: 'LIVE_PROVIDER_FAILED', message: '实时数据暂时不可用。' }]
  });

  assert.match(root.className, /degraded/);
  assert.match(root.innerHTML, /当前为静态灵感/);
  assert.match(root.innerHTML, /实时数据暂时不可用/);
});
