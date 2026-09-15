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

test('shows a quick-scene reason only when scored evidence supplies its code', () => {
  const candidate = {
    ...makeLiveCandidate(),
    sourceMode: 'inspiration',
    store: null,
    pricing: null,
    delivery: null,
    availability: null
  };
  const scored = {
    candidate,
    score: 80,
    components: { taste: 0.5, context: 0.5, quality: 0.5, novelty: 0.5 },
    evidence: {
      sceneReasonCode: 'quick_reliable_match',
      inspirationBudgetMatched: false,
      diningModeMatched: false,
      matchedTraits: ['convenient', 'stable']
    }
  };

  const explanation = explainRecommendation(makeContext(), scored, ['exclusion']);

  assert.ok(explanation.reasonCodes.includes('quick_reliable_match'));
  assert.match(
    explanation.reasons.find(({ code }) => code === 'quick_reliable_match').message,
    /准备和搭配相对直接/
  );
  assert.ok(explanation.tradeoffs.some(({ code }) => code === 'live_data_unavailable'));
});

test('does not infer scenario or dining reasons from missing or false evidence', () => {
  const candidate = makeLiveCandidate();
  const withoutEvidence = explainRecommendation(
    makeContext(),
    { candidate, score: 80, components: { taste: 0.5, context: 0.5, quality: 0.5, novelty: 0.5 } },
    ['exclusion']
  );
  const falseEvidence = explainRecommendation(
    makeContext(),
    {
      candidate,
      score: 80,
      components: { taste: 0.5, context: 0.5, quality: 0.5, novelty: 0.5 },
      evidence: {
        sceneReasonCode: null,
        inspirationBudgetMatched: false,
        diningModeMatched: false,
        matchedTraits: []
      }
    },
    ['exclusion']
  );

  for (const explanation of [withoutEvidence, falseEvidence]) {
    assert.equal(explanation.reasonCodes.includes('quick_reliable_match'), false);
    assert.equal(explanation.reasonCodes.includes('inspiration_budget_match'), false);
    assert.equal(explanation.reasonCodes.includes('dining_mode_match'), false);
  }
});

test('uses a static budget-tier reason without claiming a live price', () => {
  const candidate = {
    ...makeLiveCandidate(),
    sourceMode: 'inspiration',
    pricing: null,
    delivery: null,
    availability: null,
    store: null
  };
  const explanation = explainRecommendation(
    makeContext(),
    {
      candidate,
      score: 80,
      components: { taste: 0.5, context: 0.5, quality: 0.5, novelty: 0.5 },
      evidence: {
        sceneReasonCode: 'within_budget',
        inspirationBudgetMatched: true
      }
    },
    ['exclusion']
  );

  assert.ok(explanation.reasonCodes.includes('inspiration_budget_match'));
  assert.equal(explanation.reasonCodes.includes('within_budget'), false);
  const message = explanation.reasons.find(({ code }) => code === 'inspiration_budget_match').message;
  assert.match(message, /菜品档位/);
  assert.doesNotMatch(message, /实时价格|附近|可下单|保证健康/);
});

test('individual taste reasons require a real preference match instead of generic scene traits', () => {
  const candidate = {
    ...makeLiveCandidate(),
    sourceMode: 'inspiration',
    store: null,
    pricing: null,
    delivery: null,
    availability: null,
    item: { ...makeLiveCandidate().item, tasteTags: ['甜'] }
  };
  const context = makeContext({ partySize: 2, tastePreferences: ['辣'] });
  const unmatched = explainRecommendation(context, {
    candidate,
    score: 70,
    components: { taste: 0, scenario: 1, budget: 1, group: 1 },
    evidence: {
      sceneReasonCode: 'individual_taste_match',
      inspirationBudgetMatched: true,
      diningModeMatched: true,
      matchedTraits: ['convenient'],
      taste: {
        scope: 'individual',
        matchedPreferences: [],
        unmatchedPreferences: ['辣'],
        matchedDinerCount: 0,
        preferenceDinerCount: 1
      }
    }
  }, ['exclusion']);

  assert.equal(unmatched.reasonCodes.includes('individual_taste_match'), false);
  assert.ok(unmatched.tradeoffs.some(({ code }) => code === 'taste_tradeoff'));

  const matched = explainRecommendation(context, {
    candidate: { ...candidate, item: { ...candidate.item, tasteTags: ['辣'] } },
    score: 90,
    components: { taste: 1, scenario: 1, budget: 1, group: 1 },
    evidence: {
      sceneReasonCode: 'individual_choice_match',
      inspirationBudgetMatched: true,
      diningModeMatched: true,
      matchedTraits: ['convenient'],
      taste: {
        scope: 'individual',
        matchedPreferences: ['辣'],
        unmatchedPreferences: [],
        matchedDinerCount: 1,
        preferenceDinerCount: 1
      }
    }
  }, ['exclusion']);

  assert.ok(matched.reasonCodes.includes('individual_taste_match'));
  assert.match(
    matched.reasons.find(({ code }) => code === 'individual_taste_match').message,
    /这位用餐者/
  );
});
