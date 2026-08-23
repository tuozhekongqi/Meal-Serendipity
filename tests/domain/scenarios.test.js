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

test('every multi scene exposes all four dining modes in its approved order without silently selecting one', () => {
  assert.deepEqual(getScenesForPartySize(3).map(({ value }) => ({
    scene: value,
    diningModes: getDiningModesForScene(value).map(({ value: mode }) => mode)
  })), [
    {
      scene: 'group_gathering',
      diningModes: ['shared', 'shared_main_personal', 'individual', 'undecided']
    },
    {
      scene: 'group_individual',
      diningModes: ['individual', 'shared', 'shared_main_personal', 'undecided']
    },
    {
      scene: 'group_mixed_taste',
      diningModes: ['shared_main_personal', 'individual', 'shared', 'undecided']
    },
    {
      scene: 'group_family',
      diningModes: ['shared', 'shared_main_personal', 'undecided', 'individual']
    },
    {
      scene: 'group_celebration',
      diningModes: ['shared', 'shared_main_personal', 'individual', 'undecided']
    }
  ]);
});
