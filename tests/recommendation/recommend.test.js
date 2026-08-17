import assert from 'node:assert/strict';
import { test } from 'node:test';

import { recommend } from '../../src/recommendation/recommend.js';
import { makeContext, makeLiveCandidate, NOW } from './fixtures.js';

test('returns the highest ranked candidate with structured reasons and alternatives', () => {
  const slow = makeLiveCandidate({ id: 'candidate:slow', delivery: { etaMinutes: 30 } });
  const fast = makeLiveCandidate({ id: 'candidate:fast', delivery: { etaMinutes: 15 } });

  const result = recommend(makeContext(), [slow, fast], { now: NOW });

  assert.equal(result.primary.candidate.id, 'candidate:fast');
  assert.deepEqual(result.alternatives.map(({ candidate }) => candidate.id), ['candidate:slow']);
  assert.ok(result.primary.reasonCodes.includes('taste_match'));
  assert.ok(result.primary.reasonCodes.includes('within_budget'));
  assert.equal(result.rejected.length, 0);
  assert.equal(result.diagnostics.eligibleCount, 2);
});

test('signals an inspiration fallback when no live candidate survives hard filters', () => {
  const overBudget = makeLiveCandidate({ pricing: { totalCents: 3001 } });

  const result = recommend(makeContext(), [overBudget], { now: NOW });

  assert.equal(result.primary, null);
  assert.deepEqual(result.alternatives, []);
  assert.deepEqual(result.rejected[0].reasons, ['over_budget']);
  assert.deepEqual(result.diagnostics.fallback, {
    required: true,
    targetMode: 'inspiration',
    reason: 'no_eligible_candidates'
  });
});

test('never relaxes exclusions when producing the no-candidate fallback signal', () => {
  const excluded = makeLiveCandidate({ item: { allergenTags: ['花生'] } });

  const result = recommend(
    makeContext({ exclusions: ['花生'] }),
    [excluded],
    { now: NOW }
  );

  assert.equal(result.primary, null);
  assert.deepEqual(result.rejected[0].reasons, ['exclusion']);
  assert.equal(result.diagnostics.rejectedByReason.exclusion, 1);
});

test('returns a deeply equal result for the same input and time', () => {
  const context = makeContext();
  const candidates = [
    makeLiveCandidate({ id: 'candidate:b' }),
    makeLiveCandidate({ id: 'candidate:a' })
  ];

  const first = recommend(context, candidates, { now: NOW });
  const second = recommend(context, candidates, { now: NOW });

  assert.deepEqual(first, second);
  assert.equal(first.primary.candidate.id, 'candidate:a');
});

test('requires the caller to inject the current time', () => {
  assert.throws(
    () => recommend(makeContext(), [makeLiveCandidate()]),
    /options\.now/
  );
});
