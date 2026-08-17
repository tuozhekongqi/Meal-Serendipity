import assert from 'node:assert/strict';
import test from 'node:test';

import {
  renderEmptyState,
  renderErrorState,
  renderInitialState,
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

test('empty and provider error states expose distinct visual semantics', () => {
  const emptyRoot = rootStub();
  renderEmptyState(emptyRoot, () => {});
  assert.match(emptyRoot.innerHTML, /data-state="empty"/);
  assert.match(emptyRoot.innerHTML, /state-visual neutral/);
  assert.match(emptyRoot.innerHTML, /state-symbol[^>]*>−</);
  assert.match(emptyRoot.innerHTML, /这些条件没有合适结果/);
  assert.match(emptyRoot.innerHTML, /修改一个条件再试/);

  const errorRoot = rootStub();
  renderErrorState(errorRoot, { onRetry() {}, onReset() {} });
  assert.match(errorRoot.innerHTML, /data-state="error"/);
  assert.match(errorRoot.innerHTML, /state-visual error/);
  assert.match(errorRoot.innerHTML, /state-symbol[^>]*>!</);
});

test('loading state remains explicitly identifiable without an error treatment', () => {
  const root = rootStub();
  renderLoadingState(root);
  assert.match(root.innerHTML, /data-state="loading"/);
  assert.match(root.innerHTML, /正在筛选/);
  assert.doesNotMatch(root.innerHTML, /state-visual error/);
});

test('initial and success copy state the decision directly without generic AI phrasing', () => {
  const initialRoot = rootStub();
  renderInitialState(initialRoot);
  assert.match(initialRoot.innerHTML, /先选一个状态/);
  assert.doesNotMatch(initialRoot.innerHTML, /答案会出现在这里/);

  const resultRoot = {
    ...rootStub(),
    querySelectorAll() { return []; }
  };
  renderRecommendation(resultRoot, {
    mode: { value: 'inspiration', label: '菜品灵感' },
    primary: {
      id: 'dish:one', name: '番茄牛腩饭', description: '酸甜浓郁，配米饭。',
      storeName: null, tags: ['米饭', '咸鲜'], runway: [], metrics: [],
      reasons: [{ message: '符合你选择的口味' }], tradeoffs: [],
      action: { kind: 'copy', label: '复制菜名' }
    },
    alternatives: []
  }, { onSwap() {}, onAlternative() {}, onPrimaryAction() {} });
  assert.match(resultRoot.innerHTML, /今天吃这个。/);
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
