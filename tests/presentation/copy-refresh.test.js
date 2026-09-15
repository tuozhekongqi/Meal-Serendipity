import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { renderInputFlow } from '../../src/components/inputs.js';
import { FLOW_STEP, createFlowState } from '../../src/presentation/flow-state.js';

function inertRoot() {
  return {
    innerHTML: '',
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
}

test('page framing uses poetic headings while the supporting copy explains the task', async () => {
  const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');

  assert.match(html, />人间有味是清欢</);
  assert.match(html, />循味而选</);
  assert.match(html, /从人数与场景出发，再按预算与口味收拢选择。/);
  assert.match(html, />数据与隐私</);
  assert.doesNotMatch(html, /今天吃什么？|这次怎么吃？/);
});

test('completed input flow keeps only a green-ready progress state without redundant result copy', () => {
  const root = inertRoot();
  const state = {
    ...createFlowState(),
    step: FLOW_STEP.RESULT,
    partySize: 1,
    partySizeBucket: 'one',
    mealScene: 'solo_quick',
    inspirationBudgetTier: 'everyday',
    dinerDrafts: [{ id: 'diner-1', tastePreferences: [], exclusions: [] }]
  };

  renderInputFlow({
    root,
    desktopActions: inertRoot(),
    mobileActions: inertRoot(),
    state,
    onEvent() {},
    onAction() {}
  });

  assert.match(root.innerHTML, /data-progress-complete="true"/);
  assert.match(root.innerHTML, /aria-label="用餐选择进度"/);
  assert.doesNotMatch(root.innerHTML, /条件已确认|可以在结果中换一个/);
});
