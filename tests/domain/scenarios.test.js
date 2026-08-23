import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getDiningModesForScene,
  getScenesForPartySize
} from '../../src/domain/scenarios.js';

test('single and multi party sizes expose disjoint approved scene sets', () => {
  assert.deepEqual(getScenesForPartySize(1).map(({ value }) => value), [
    'solo_quick', 'solo_focus', 'solo_treat',
    'solo_late_night', 'solo_lighter', 'solo_save'
  ]);
  assert.deepEqual(getScenesForPartySize(3).map(({ value }) => value), [
    'group_gathering', 'group_individual', 'group_mixed_taste',
    'group_family', 'group_celebration'
  ]);
});

test('multi scenes expose all four dining modes without silently selecting one', () => {
  assert.deepEqual(getDiningModesForScene('group_individual').map(({ value }) => value), [
    'individual', 'shared', 'shared_main_personal', 'undecided'
  ]);
});
