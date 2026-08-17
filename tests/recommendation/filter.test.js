import assert from 'node:assert/strict';
import { test } from 'node:test';

import { filterCandidates } from '../../src/recommendation/filter.js';
import { makeContext, makeLiveCandidate, NOW } from './fixtures.js';

test('rejects live candidates over the total budget and accepts the boundary', () => {
  const exact = makeLiveCandidate({ id: 'exact', pricing: { totalCents: 3000 } });
  const over = makeLiveCandidate({ id: 'over', pricing: { totalCents: 3001 } });

  const result = filterCandidates(makeContext(), [over, exact], NOW);

  assert.deepEqual(result.accepted.map(({ candidate }) => candidate.id), ['exact']);
  assert.deepEqual(result.rejected[0].reasons, ['over_budget']);
  assert.ok(result.accepted[0].passedConstraints.includes('within_budget'));
});

test('rejects a candidate when an exclusion matches an allergen, ingredient, or name', () => {
  const allergen = makeLiveCandidate({
    id: 'allergen',
    item: { allergenTags: ['花生'] }
  });
  const ingredient = makeLiveCandidate({
    id: 'ingredient',
    item: { ingredientTags: ['香菜'] }
  });
  const named = makeLiveCandidate({
    id: 'named',
    item: { name: '香辣花生拌面' }
  });

  const result = filterCandidates(
    makeContext({ exclusions: ['花生', '香菜'] }),
    [allergen, ingredient, named],
    NOW
  );

  assert.equal(result.accepted.length, 0);
  assert.deepEqual(result.rejected.map(({ reasons }) => reasons), [
    ['exclusion'],
    ['exclusion'],
    ['exclusion']
  ]);
});

test('rejects closed, unavailable, and non-orderable live candidates', () => {
  const closed = makeLiveCandidate({ id: 'closed', store: { isOpen: false } });
  const unavailable = makeLiveCandidate({ id: 'unavailable', item: { isAvailable: false } });
  const blocked = makeLiveCandidate({ id: 'blocked', availability: { isOrderable: false } });

  const result = filterCandidates(makeContext(), [closed, unavailable, blocked], NOW);

  assert.deepEqual(result.rejected.map(({ reasons }) => reasons), [
    ['closed'],
    ['unavailable'],
    ['not_orderable']
  ]);
});

test('rejects delivery time and distance beyond their inclusive limits', () => {
  const exact = makeLiveCandidate({
    id: 'exact',
    delivery: { etaMinutes: 35, distanceMeters: 3000 }
  });
  const slow = makeLiveCandidate({ id: 'slow', delivery: { etaMinutes: 36 } });
  const far = makeLiveCandidate({ id: 'far', delivery: { distanceMeters: 3001 } });

  const result = filterCandidates(makeContext(), [slow, far, exact], NOW);

  assert.deepEqual(result.accepted.map(({ candidate }) => candidate.id), ['exact']);
  assert.deepEqual(result.rejected.map(({ reasons }) => reasons), [
    ['too_slow'],
    ['too_far']
  ]);
});

test('rejects live data older than the five minute TTL', () => {
  const freshBoundary = makeLiveCandidate({
    id: 'fresh-boundary',
    dataUpdatedAt: '2026-08-17T02:55:00.000Z'
  });
  const stale = makeLiveCandidate({
    id: 'stale',
    dataUpdatedAt: '2026-08-17T02:54:59.999Z'
  });

  const result = filterCandidates(makeContext(), [stale, freshBoundary], NOW);

  assert.deepEqual(result.accepted.map(({ candidate }) => candidate.id), ['fresh-boundary']);
  assert.deepEqual(result.rejected[0].reasons, ['stale']);
});

test('keeps inspiration candidates without claiming unknown live constraints passed', () => {
  const inspiration = {
    id: 'inspiration:粥',
    sourceMode: 'inspiration',
    store: null,
    item: {
      id: '粥',
      name: '粥',
      description: '',
      imageUrl: null,
      tasteTags: ['清淡'],
      categoryTags: ['粉面'],
      allergenTags: [],
      ingredientTags: [],
      isAvailable: null
    },
    pricing: null,
    delivery: null,
    availability: null,
    dataUpdatedAt: null,
    metadata: {}
  };

  const result = filterCandidates(makeContext(), [inspiration], NOW);

  assert.equal(result.accepted.length, 1);
  assert.deepEqual(result.accepted[0].passedConstraints, ['exclusion']);
});
