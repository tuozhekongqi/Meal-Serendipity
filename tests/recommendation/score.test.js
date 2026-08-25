import assert from 'node:assert/strict';
import { test } from 'node:test';

import { rankCandidates, scoreCandidate } from '../../src/recommendation/score.js';
import { makeContext, makeLiveCandidate } from './fixtures.js';

const convenientBowl = {
  id: 'inspiration:convenient-bowl',
  sourceMode: 'inspiration',
  store: null,
  item: {
    id: 'convenient-bowl',
    name: '方便饭碗',
    description: '静态菜品灵感',
    imageUrl: null,
    tasteTags: ['咸鲜'],
    categoryTags: ['米饭'],
    allergenTags: [],
    ingredientTags: [],
    isAvailable: null
  },
  pricing: null,
  delivery: null,
  availability: null,
  orderUrl: null,
  dataUpdatedAt: null,
  metadata: {
    discoveryTraits: { convenient: 1, stable: 1, filling: 1, expressive: 0, shareable: 0, varietyFriendly: 0 },
    priceTier: 1,
    supportedDiningModes: ['individual']
  }
};

const expressivePlate = {
  id: 'inspiration:expressive-plate',
  sourceMode: 'inspiration',
  store: null,
  item: {
    id: 'expressive-plate',
    name: '精致拼盘',
    description: '静态菜品灵感',
    imageUrl: null,
    tasteTags: ['咸鲜'],
    categoryTags: ['漂亮饭'],
    allergenTags: [],
    ingredientTags: [],
    isAvailable: null
  },
  pricing: null,
  delivery: null,
  availability: null,
  orderUrl: null,
  dataUpdatedAt: null,
  metadata: {
    discoveryTraits: { convenient: 0, stable: 0, filling: 0.75, expressive: 1, shareable: 1, varietyFriendly: 1 },
    priceTier: 4,
    supportedDiningModes: ['shared']
  }
};

test('scores a primary taste match above an otherwise equal mismatch', () => {
  const matched = makeLiveCandidate({ id: 'matched', item: { tasteTags: ['咸鲜'] } });
  const missed = makeLiveCandidate({ id: 'missed', item: { tasteTags: ['甜'] } });
  const context = makeContext({ tastePreferences: ['咸鲜', '甜'] });

  const matchedScore = scoreCandidate(context, matched);
  const missedScore = scoreCandidate(context, missed);

  assert.equal(matchedScore.components.taste, 1);
  assert.equal(missedScore.components.taste, 0.7);
  assert.ok(matchedScore.score > missedScore.score);
});

test('fastest priority gives more influence to delivery speed', () => {
  const fast = makeLiveCandidate({ id: 'fast', delivery: { etaMinutes: 10 } });
  const balanced = scoreCandidate(makeContext({ currentPriority: 'balanced' }), fast);
  const fastest = scoreCandidate(makeContext({ currentPriority: 'fastest' }), fast);

  assert.equal(balanced.weights.delivery, 20);
  assert.equal(fastest.weights.delivery, 35);
  assert.ok(fastest.score > balanced.score);
});

test('ranks by score and uses candidate id as a deterministic tie breaker', () => {
  const slower = makeLiveCandidate({ id: 'candidate:slow', delivery: { etaMinutes: 30 } });
  const faster = makeLiveCandidate({ id: 'candidate:fast', delivery: { etaMinutes: 15 } });
  const tieB = makeLiveCandidate({ id: 'candidate:b' });
  const tieA = makeLiveCandidate({ id: 'candidate:a' });

  const rankedSpeed = rankCandidates(makeContext(), [slower, faster]);
  const rankedTie = rankCandidates(makeContext(), [tieB, tieA]);

  assert.deepEqual(rankedSpeed.map(({ candidate }) => candidate.id), [
    'candidate:fast',
    'candidate:slow'
  ]);
  assert.deepEqual(rankedTie.map(({ candidate }) => candidate.id), [
    'candidate:a',
    'candidate:b'
  ]);
});

test('returns identical rankings for identical input without consuming randomness', () => {
  const candidates = [
    makeLiveCandidate({ id: 'candidate:2', delivery: { etaMinutes: 24 } }),
    makeLiveCandidate({ id: 'candidate:1', delivery: { etaMinutes: 24 } })
  ];
  let randomCalls = 0;
  const random = () => {
    randomCalls += 1;
    return 0.5;
  };

  const first = rankCandidates(makeContext(), candidates, { random });
  const second = rankCandidates(makeContext(), candidates, { random });

  assert.deepEqual(first, second);
  assert.equal(randomCalls, 0);
});

test('uses an injected random source only when explicit exploration is enabled', () => {
  const candidates = [
    makeLiveCandidate({ id: 'candidate:a' }),
    makeLiveCandidate({ id: 'candidate:b' })
  ];
  const values = [0, 1];

  const ranked = rankCandidates(makeContext(), candidates, {
    exploration: 10,
    random: () => values.shift()
  });

  assert.deepEqual(ranked.map(({ candidate }) => candidate.id), [
    'candidate:b',
    'candidate:a'
  ]);
});

test('refuses exploration without an injected random source', () => {
  assert.throws(
    () => rankCandidates(makeContext(), [makeLiveCandidate()], { exploration: 1 }),
    /options\.random/
  );
});

test('quick and celebration scenes choose different inspiration candidates from the same safe pool', () => {
  const quick = rankCandidates(
    makeContext({ mealScene: 'solo_quick', inspirationBudgetTier: 'economy' }),
    [convenientBowl, expressivePlate]
  );
  const celebration = rankCandidates(
    makeContext({
      mealScene: 'group_celebration',
      partySize: 2,
      inspirationBudgetTier: 'generous',
      diningMode: 'shared'
    }),
    [convenientBowl, expressivePlate]
  );

  assert.equal(quick[0].candidate.id, 'inspiration:convenient-bowl');
  assert.equal(celebration[0].candidate.id, 'inspiration:expressive-plate');
});

test('changing taste changes a real-scene ranking without erasing the shared scene signal', () => {
  const spicy = {
    ...convenientBowl,
    id: 'inspiration:z-spicy-bowl',
    item: { ...convenientBowl.item, id: 'z-spicy-bowl', tasteTags: ['辣'] }
  };
  const sweet = {
    ...convenientBowl,
    id: 'inspiration:a-sweet-bowl',
    item: { ...convenientBowl.item, id: 'a-sweet-bowl', tasteTags: ['甜'] }
  };
  const base = {
    mealScene: 'solo_quick',
    inspirationBudgetTier: 'economy'
  };

  const spicyFirst = rankCandidates(
    makeContext({ ...base, tastePreferences: ['辣'] }),
    [sweet, spicy]
  );
  const sweetFirst = rankCandidates(
    makeContext({ ...base, tastePreferences: ['甜'] }),
    [sweet, spicy]
  );

  assert.equal(spicyFirst[0].candidate.id, 'inspiration:z-spicy-bowl');
  assert.equal(sweetFirst[0].candidate.id, 'inspiration:a-sweet-bowl');
  assert.equal(spicyFirst[0].components.taste, 1);
  assert.equal(spicyFirst[1].components.taste, 0);
  assert.equal(spicyFirst[0].components.scenario, spicyFirst[1].components.scenario);
});

test('save scene prefers matching static price tier without creating live pricing', () => {
  const tierFour = { ...expressivePlate, id: 'inspiration:tier-four', metadata: { ...expressivePlate.metadata, priceTier: 4 } };
  const tierOne = { ...convenientBowl, id: 'inspiration:tier-one', metadata: { ...convenientBowl.metadata, priceTier: 1 } };

  const ranked = rankCandidates(
    makeContext({ mealScene: 'solo_save', inspirationBudgetTier: 'economy' }),
    [tierFour, tierOne]
  );

  assert.equal(ranked[0].candidate.id, 'inspiration:tier-one');
  assert.equal(ranked[0].candidate.pricing, null);
});

test('scenario ranking is deterministic without exploration', () => {
  const context = makeContext({ mealScene: 'solo_quick', inspirationBudgetTier: 'economy' });
  const first = rankCandidates(context, [expressivePlate, convenientBowl]);
  const second = rankCandidates(context, [expressivePlate, convenientBowl]);

  assert.deepEqual(first, second);
});

test('a valid meal scene leaves live candidate scoring unchanged', () => {
  const live = makeLiveCandidate({ id: 'live:unchanged' });
  const legacy = scoreCandidate(makeContext(), live);
  const withScene = scoreCandidate(makeContext({ mealScene: 'solo_quick' }), live);

  assert.deepEqual(withScene, legacy);
});

test('an inspiration candidate without a meal scene keeps the legacy score shape', () => {
  const scored = scoreCandidate(makeContext(), convenientBowl);

  assert.equal(scored.evidence, undefined);
  assert.deepEqual(Object.keys(scored.components), [
    'taste', 'delivery', 'context', 'budget', 'distance', 'quality', 'novelty'
  ]);
});

test('an inspiration pool without a meal scene preserves legacy score order and values', () => {
  const legacyTasteMatch = {
    id: 'inspiration:legacy-taste-match',
    sourceMode: 'inspiration',
    store: null,
    item: {
      id: 'legacy-taste-match',
      name: '咸鲜盖饭',
      description: '静态菜品灵感',
      imageUrl: null,
      tasteTags: ['咸鲜'],
      categoryTags: ['米饭'],
      allergenTags: [],
      ingredientTags: [],
      isAvailable: null
    },
    pricing: null,
    delivery: null,
    availability: null,
    orderUrl: null,
    dataUpdatedAt: null,
    metadata: {
      discoveryTraits: {},
      priceTier: 1,
      supportedDiningModes: ['individual'],
      popularity: 'mainstream'
    }
  };
  const legacyTasteMiss = {
    id: 'inspiration:legacy-taste-miss',
    sourceMode: 'inspiration',
    store: null,
    item: {
      id: 'legacy-taste-miss',
      name: '甜味拼盘',
      description: '静态菜品灵感',
      imageUrl: null,
      tasteTags: ['甜'],
      categoryTags: ['甜品'],
      allergenTags: [],
      ingredientTags: [],
      isAvailable: null
    },
    pricing: null,
    delivery: null,
    availability: null,
    orderUrl: null,
    dataUpdatedAt: null,
    metadata: {
      discoveryTraits: {},
      priceTier: 4,
      supportedDiningModes: ['shared'],
      popularity: 'niche'
    }
  };

  const ranked = rankCandidates(makeContext(), [legacyTasteMiss, legacyTasteMatch]);

  assert.deepEqual(ranked.map(({ candidate, score }) => ({ id: candidate.id, score })), [
    { id: 'inspiration:legacy-taste-match', score: 67 },
    { id: 'inspiration:legacy-taste-miss', score: 40 }
  ]);
});
