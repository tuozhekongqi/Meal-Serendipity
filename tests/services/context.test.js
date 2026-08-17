import assert from 'node:assert/strict';
import test from 'node:test';

import { createUserContext, toProviderRequest } from '../../src/services/context.js';

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
