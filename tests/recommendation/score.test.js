import assert from 'node:assert/strict';
import { test } from 'node:test';

import { rankCandidates, scoreCandidate } from '../../src/recommendation/score.js';
import { makeContext, makeLiveCandidate } from './fixtures.js';

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
