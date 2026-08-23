import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FLOW_STEP,
  createContextInputFromFlow,
  createFlowState,
  getVisibleSteps,
  transitionFlow
} from '../../src/presentation/flow-state.js';

function send(state, event) {
  return transitionFlow(state, event);
}

test('single flow skips dining mode and back preserves conditions', () => {
  let state = createFlowState();
  state = send(state, { type: 'select_party_size', partySize: 1, bucket: '1' });
  state = send(state, { type: 'next' });
  state = send(state, { type: 'select_scene', mealScene: 'solo_focus' });
  state = send(state, { type: 'next' });

  assert.equal(state.step, FLOW_STEP.PREFERENCES);
  assert.deepEqual(getVisibleSteps(state), [
    FLOW_STEP.PARTY,
    FLOW_STEP.SCENE,
    FLOW_STEP.PREFERENCES
  ]);

  state = send(state, { type: 'set_budget', value: 'everyday' });
  state = send(state, { type: 'back' });

  assert.equal(state.step, FLOW_STEP.SCENE);
  assert.equal(state.inspirationBudgetTier, 'everyday');
  assert.equal(state.mealScene, 'solo_focus');
});

test('changing between single and multi clears only incompatible downstream selections', () => {
  let state = createFlowState();
  state = send(state, { type: 'select_party_size', partySize: 3, bucket: '3' });
  state = send(state, { type: 'select_scene', mealScene: 'group_mixed_taste' });
  state = send(state, { type: 'select_dining_mode', diningMode: 'shared_main_personal' });
  state = send(state, { type: 'set_budget', value: 'everyday' });
  state = send(state, { type: 'set_tastes', value: ['清淡'] });
  state = send(state, {
    type: 'update_diner_draft',
    dinerId: 'diner-1',
    tastePreferences: ['清淡'],
    exclusions: ['花生']
  });
  state = send(state, { type: 'request_succeeded', result: { kind: 'meal-plan' } });

  const changed = send(state, { type: 'select_party_size', partySize: 1, bucket: '1' });

  assert.equal(changed.mealScene, null);
  assert.equal(changed.diningMode, null);
  assert.equal(changed.inspirationBudgetTier, 'everyday');
  assert.deepEqual(changed.tastePreferences, ['清淡']);
  assert.deepEqual(changed.dinerDrafts[0].tastePreferences, ['清淡']);
  assert.deepEqual(changed.dinerDrafts[0].exclusions, ['花生']);
  assert.equal(changed.status, 'editing');
  assert.equal(changed.result, null);
  assert.equal(changed.step, FLOW_STEP.PARTY);
});

test('four-plus exact count creates stable anonymous diner slots', () => {
  const state = send(createFlowState(), {
    type: 'select_party_size', partySize: 6, bucket: '4_plus'
  });

  assert.deepEqual(state.dinerDrafts.map(({ id }) => id), [
    'diner-1', 'diner-2', 'diner-3', 'diner-4', 'diner-5', 'diner-6'
  ]);
  assert.equal(state.partySizeBucket, '4_plus');
});

test('condition edits clear stale request results while keeping the active editing step', () => {
  let state = createFlowState();
  state = send(state, { type: 'select_party_size', partySize: 2, bucket: '2' });
  state = send(state, { type: 'select_scene', mealScene: 'group_gathering' });
  state = send(state, { type: 'select_dining_mode', diningMode: 'shared' });
  state = send(state, { type: 'request_succeeded', result: { primary: 'dish:1' } });
  state = send(state, { type: 'edit_step', step: FLOW_STEP.PREFERENCES });
  state = send(state, { type: 'set_exclusions', value: ['香菜'] });

  assert.equal(state.status, 'editing');
  assert.equal(state.result, null);
  assert.equal(state.step, FLOW_STEP.PREFERENCES);
  assert.deepEqual(state.exclusions, ['香菜']);
});

test('context input normalizes anonymous drafts without mutating or persisting reducer state', () => {
  let state = createFlowState({
    totalBudgetCents: 4800,
    currentPriority: 'balanced',
    recentHistory: ['dish:prior']
  });
  state = send(state, { type: 'select_party_size', partySize: 2, bucket: '2' });
  state = send(state, { type: 'select_scene', mealScene: 'group_individual' });
  state = send(state, { type: 'select_dining_mode', diningMode: 'individual' });
  state = send(state, { type: 'set_budget', value: 'generous' });
  state = send(state, { type: 'set_tastes', value: ['辣', '辣', ' 甜 '] });
  state = send(state, { type: 'set_exclusions', value: ['花生'] });
  state = send(state, {
    type: 'update_diner_draft',
    dinerId: 'diner-2',
    tastePreferences: ['清淡', '清淡'],
    exclusions: ['葱']
  });
  const before = structuredClone(state);

  const context = createContextInputFromFlow(state);

  assert.deepEqual(state, before);
  assert.equal(context.partySize, 2);
  assert.equal(context.partySizeBucket, '2');
  assert.equal(context.mealScene, 'group_individual');
  assert.equal(context.diningMode, 'individual');
  assert.equal(context.inspirationBudgetTier, 'generous');
  assert.deepEqual(context.tastePreferences, ['辣', '甜']);
  assert.deepEqual(context.exclusions, ['花生']);
  assert.deepEqual(context.dinerProfiles, [
    { id: 'diner-1', tastePreferences: [], exclusions: [] },
    { id: 'diner-2', tastePreferences: ['清淡'], exclusions: ['葱'] }
  ]);
  assert.equal('status' in context, false);
  assert.equal('result' in context, false);
});

test('request lifecycle enters result states and back returns to retained preferences', () => {
  let state = createFlowState();
  state = send(state, { type: 'request_started' });
  assert.equal(state.status, 'loading');
  assert.equal(state.step, FLOW_STEP.RESULT);

  state = send(state, { type: 'request_failed' });
  assert.equal(state.status, 'error');
  state = send(state, { type: 'retry' });
  assert.equal(state.status, 'loading');
  state = send(state, { type: 'request_empty' });
  assert.equal(state.status, 'empty');
  state = send(state, { type: 'back' });

  assert.equal(state.status, 'editing');
  assert.equal(state.step, FLOW_STEP.PREFERENCES);
});
