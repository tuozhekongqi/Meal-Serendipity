import assert from 'node:assert/strict';
import { test } from 'node:test';

import { explainRecommendation } from '../../src/recommendation/explain.js';
import { scoreCandidate } from '../../src/recommendation/score.js';
import { makeContext, makeLiveCandidate } from './fixtures.js';

test('generates reason codes only from satisfied constraints and score contributions', () => {
  const context = makeContext({ tastePreferences: ['咸鲜'] });
  const candidate = makeLiveCandidate();
  const scored = scoreCandidate(context, candidate);
  const explanation = explainRecommendation(context, scored, [
    'exclusion',
    'open',
    'available',
    'orderable',
    'within_budget',
    'within_eta',
    'within_distance',
    'fresh'
  ]);

  assert.ok(explanation.reasonCodes.includes('taste_match'));
  assert.ok(explanation.reasonCodes.includes('within_budget'));
  assert.ok(explanation.reasonCodes.includes('fast_delivery'));
  assert.ok(explanation.reasonCodes.includes('nearby'));
  assert.ok(explanation.reasonCodes.includes('open_now'));
  assert.ok(explanation.reasonCodes.includes('available'));
  assert.ok(explanation.reasonCodes.includes('fresh_data'));
  assert.ok(explanation.reasons.every(({ code, message }) => (
    explanation.reasonCodes.includes(code) && message.length > 0
  )));
});

test('does not claim unknown live fields as satisfied for inspiration candidates', () => {
  const context = makeContext();
  const candidate = {
    ...makeLiveCandidate(),
    id: 'inspiration:鸡肉盖饭',
    sourceMode: 'inspiration',
    store: null,
    pricing: null,
    delivery: null,
    availability: null,
    dataUpdatedAt: null,
    item: { ...makeLiveCandidate().item, isAvailable: null }
  };
  const scored = scoreCandidate(context, candidate);
  const explanation = explainRecommendation(context, scored, ['exclusion']);

  assert.equal(explanation.reasonCodes.includes('within_budget'), false);
  assert.equal(explanation.reasonCodes.includes('fast_delivery'), false);
  assert.equal(explanation.reasonCodes.includes('nearby'), false);
  assert.ok(explanation.tradeoffs.some(({ code }) => code === 'live_data_unavailable'));
  assert.equal(explanation.matchLevel, 'tradeoff');
});

test('describes a near-limit delivery time as a tradeoff rather than a speed reason', () => {
  const context = makeContext({ maxDeliveryMinutes: 35 });
  const candidate = makeLiveCandidate({ delivery: { etaMinutes: 34 } });
  const scored = scoreCandidate(context, candidate);
  const explanation = explainRecommendation(context, scored, ['within_eta']);

  assert.equal(explanation.reasonCodes.includes('fast_delivery'), false);
  assert.ok(explanation.tradeoffs.some(({ code }) => code === 'delivery_near_limit'));
});
