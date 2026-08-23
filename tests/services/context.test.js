import assert from 'node:assert/strict';
import test from 'node:test';

import { createUserContext, toProviderRequest } from '../../src/services/context.js';

const NOW = '2026-08-17T03:00:00.000Z';

test('context normalizes bounded preference arrays and numeric constraints', () => {
  const result = createUserContext({
    partySize: '2',
    totalBudgetCents: '5000',
    tastes: ['辣', '辣', ' 甜 '],
    exclusions: ['花生', '花生'],
    currentPriority: 'fastest'
  });

  assert.equal(result.partySize, 2);
  assert.equal(result.totalBudgetCents, 5000);
  assert.deepEqual(result.tastePreferences, ['辣', '甜']);
  assert.deepEqual(result.exclusions, ['花生']);
});

test('provider request contains only the contract fields', () => {
  const userContext = createUserContext({
    partySize: 1,
    totalBudgetCents: 3500,
    location: { latitude: 31, longitude: 121, accuracyMeters: 100, areaLabel: '上海', consentGrantedAt: '2026-08-17T00:00:00Z' },
    exclusions: ['花生'],
    tastes: ['辣'],
    extraPrivateField: 'must-not-leak'
  });
  const request = toProviderRequest(userContext, {
    requestId: 'request-1',
    requestedAt: '2026-08-17T03:00:00.000Z'
  });

  assert.equal(request.requestId, 'request-1');
  assert.equal(JSON.stringify(request).includes('must-not-leak'), false);
  assert.deepEqual(request.constraints.exclusions, ['花生']);
});

test('context keeps manual locations coarse instead of coercing null coordinates to zero', () => {
  const result = createUserContext({
    location: {
      latitude: null,
      longitude: null,
      accuracyMeters: null,
      areaLabel: '上海市黄浦区',
      source: 'manual'
    }
  });

  assert.equal(result.location.latitude, null);
  assert.equal(result.location.longitude, null);
  assert.equal(result.location.accuracyMeters, null);
});

test('context normalizes party, scenario, dining mode, budget tier and anonymous diners', () => {
  const context = createUserContext({
    partySize: 4,
    partySizeBucket: '4_plus',
    mealScene: 'group_mixed_taste',
    diningMode: 'shared_main_personal',
    inspirationBudgetTier: 'everyday',
    dinerProfiles: [
      { id: 'diner-1', tastePreferences: ['辣'], exclusions: ['花生'] },
      { id: 'diner-2', tastePreferences: ['清淡'], exclusions: [] }
    ]
  });

  assert.equal(context.partySizeBucket, '4_plus');
  assert.equal(context.mealScene, 'group_mixed_taste');
  assert.equal(context.diningMode, 'shared_main_personal');
  assert.equal(context.inspirationBudgetTier, 'everyday');
  assert.equal(context.dinerProfiles[0].id, 'diner-1');
  assert.deepEqual(context.dinerProfiles[0].tastePreferences, ['辣']);
});

test('context rejects incompatible scenarios and bounds anonymous diner preferences', () => {
  const context = createUserContext({
    partySize: 1,
    partySizeBucket: '4_plus',
    mealScene: 'group_gathering',
    diningMode: 'shared',
    inspirationBudgetTier: 'unapproved',
    dinerProfiles: Array.from({ length: 51 }, (_, index) => ({
      id: `person-${index + 1}`,
      tastePreferences: ['辣', '甜', '酸', '咸'],
      exclusions: Array.from({ length: 31 }, (_, exclusion) => `忌口-${exclusion}`)
    }))
  });

  assert.equal(context.partySizeBucket, '1');
  assert.equal(context.mealScene, null);
  assert.equal(context.diningMode, null);
  assert.equal(context.inspirationBudgetTier, null);
  assert.equal(context.dinerProfiles.length, 50);
  assert.equal(context.dinerProfiles[0].id, 'diner-1');
  assert.deepEqual(context.dinerProfiles[0].tastePreferences, ['辣', '甜', '酸']);
  assert.equal(context.dinerProfiles[0].exclusions.length, 30);
});

test('phase 3.7 fields never enter a provider request', () => {
  const request = toProviderRequest(createUserContext({
    mealScene: 'solo_quick',
    diningMode: null,
    inspirationBudgetTier: 'economy',
    dinerProfiles: [{ id: 'diner-1', exclusions: ['花生'] }]
  }), { requestId: 'request-3-7', requestedAt: NOW });
  const serialized = JSON.stringify(request);

  for (const forbidden of ['mealScene', 'diningMode', 'inspirationBudgetTier', 'dinerProfiles']) {
    assert.equal(serialized.includes(forbidden), false);
  }
});
