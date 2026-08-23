import assert from 'node:assert/strict';
import { test } from 'node:test';

import { composeMealPlan } from '../../src/recommendation/meal-plan.js';
import {
  makeContext,
  makeInspirationCandidate,
  makeMealPlanCandidates,
  NOW
} from './fixtures.js';

const dinerProfiles = [
  { id: 'diner-1', tastePreferences: ['辣'], exclusions: [] },
  { id: 'diner-2', tastePreferences: ['清淡'], exclusions: [] },
  { id: 'diner-3', tastePreferences: ['咸鲜'], exclusions: [] }
];

test('single mode returns the literal top-ranked recommendation and context summary', () => {
  const plan = composeMealPlan(
    makeContext({ mealScene: 'solo_quick', diningMode: null }),
    makeMealPlanCandidates(),
    { now: NOW }
  );

  assert.equal(plan.kind, 'single');
  assert.equal(plan.primary.candidate.id, 'inspiration:spicy-hotpot');
  assert.deepEqual(plan.contextSummary, {
    partySize: 1,
    mealScene: 'solo_quick',
    diningMode: null
  });
  assert.deepEqual(plan.items, []);
  assert.deepEqual(plan.dinerAssignments, []);
});

test('shared mode uses diner exclusion union and returns a literal complementary safe bundle', () => {
  const context = makeContext({
    partySize: 3,
    tastePreferences: ['辣', '清淡', '咸鲜'],
    mealScene: null,
    diningMode: 'shared',
    dinerProfiles: [
      dinerProfiles[0],
      { ...dinerProfiles[1], exclusions: ['花生'] },
      dinerProfiles[2]
    ]
  });

  const plan = composeMealPlan(context, makeMealPlanCandidates(), { now: NOW });

  assert.equal(plan.kind, 'shared_bundle');
  assert.deepEqual(plan.items.map(({ role, recommendation }) => ({
    role,
    id: recommendation.candidate.id
  })), [
    { role: 'shared-main', id: 'inspiration:spicy-hotpot' },
    { role: 'individual-main', id: 'inspiration:mild-tofu' },
    { role: 'staple', id: 'inspiration:savory-rice' }
  ]);
  assert.ok(plan.items.every(({ recommendation }) => (
    recommendation.passedConstraints.includes('exclusion')
  )));
  assert.equal(
    plan.items.some(({ recommendation }) => recommendation.candidate.id === 'inspiration:peanut-noodles'),
    false
  );
});

test('shared mode never selects a duplicate candidate id through a different serving role', () => {
  const context = makeContext({
    partySize: 3,
    tastePreferences: ['辣', '咸鲜'],
    mealScene: null,
    diningMode: 'shared',
    dinerProfiles
  });
  const allCandidates = makeMealPlanCandidates();
  const duplicateRole = makeInspirationCandidate({
    id: 'inspiration:spicy-hotpot',
    item: {
      id: 'spicy-hotpot-copy',
      name: '川味香辣锅副本'
    },
    metadata: { servingRoles: ['side'] }
  });

  const plan = composeMealPlan(
    context,
    [allCandidates[0], duplicateRole, allCandidates[2]],
    { now: NOW }
  );

  assert.deepEqual(plan.items.map(({ recommendation }) => recommendation.candidate.id), [
    'inspiration:spicy-hotpot',
    'inspiration:savory-rice'
  ]);
  assert.equal(
    new Set(plan.items.map(({ recommendation }) => recommendation.candidate.id)).size,
    plan.items.length
  );
});

test('individual mode preserves diner ownership and removes candidates between literal assignments', () => {
  const context = makeContext({
    partySize: 3,
    tastePreferences: [],
    mealScene: null,
    diningMode: 'individual',
    dinerProfiles: [
      { ...dinerProfiles[0], exclusions: ['花生'] },
      dinerProfiles[1],
      dinerProfiles[2]
    ]
  });

  const plan = composeMealPlan(context, makeMealPlanCandidates(), { now: NOW });

  assert.equal(plan.kind, 'individual_set');
  assert.deepEqual(plan.dinerAssignments.map(({ dinerId, recommendation }) => ({
    dinerId,
    id: recommendation?.candidate.id ?? null
  })), [
    { dinerId: 'diner-1', id: 'inspiration:spicy-hotpot' },
    { dinerId: 'diner-2', id: 'inspiration:peanut-noodles' },
    { dinerId: 'diner-3', id: 'inspiration:savory-rice' }
  ]);
});

test('shared-main-personal mode assigns literal unique dishes from the first safe cuisine', () => {
  const context = makeContext({
    partySize: 3,
    tastePreferences: [],
    mealScene: null,
    diningMode: 'shared_main_personal',
    dinerProfiles
  });

  const plan = composeMealPlan(context, makeMealPlanCandidates(), { now: NOW });

  assert.equal(plan.kind, 'same_cuisine_set');
  assert.deepEqual(plan.dinerAssignments.map(({ dinerId, recommendation }) => ({
    dinerId,
    id: recommendation?.candidate.id ?? null,
    cuisine: recommendation?.candidate.metadata.cuisineTags[0] ?? null
  })), [
    { dinerId: 'diner-1', id: 'inspiration:spicy-hotpot', cuisine: '川味' },
    { dinerId: 'diner-2', id: 'inspiration:peanut-noodles', cuisine: '川味' },
    { dinerId: 'diner-3', id: 'inspiration:savory-rice', cuisine: '川味' }
  ]);
});

test('same-cuisine shortages degrade explicitly and never fill diners with duplicate dishes', () => {
  const context = makeContext({
    partySize: 3,
    tastePreferences: [],
    mealScene: null,
    diningMode: 'shared_main_personal',
    dinerProfiles
  });
  const candidates = [makeMealPlanCandidates()[0]];

  const plan = composeMealPlan(context, candidates, { now: NOW });

  assert.equal(plan.kind, 'compromise');
  assert.deepEqual(plan.dinerAssignments.map(({ dinerId, recommendation }) => ({
    dinerId,
    id: recommendation?.candidate.id ?? null
  })), [
    { dinerId: 'diner-1', id: 'inspiration:spicy-hotpot' },
    { dinerId: 'diner-2', id: null },
    { dinerId: 'diner-3', id: null }
  ]);
  assert.deepEqual(plan.diagnostics, {
    missingDinerIds: ['diner-2', 'diner-3'],
    degradedFrom: 'same_cuisine_set',
    reason: 'insufficient_same_cuisine_candidates'
  });
});

test('excluded candidate ids rotate the literal primary without ambient randomness', () => {
  const context = makeContext({
    tastePreferences: ['辣'],
    mealScene: null,
    diningMode: null
  });
  const candidates = makeMealPlanCandidates();
  const first = composeMealPlan(context, candidates, { now: NOW });
  const options = {
    now: NOW,
    excludedCandidateIds: ['inspiration:spicy-hotpot']
  };

  const next = composeMealPlan(context, candidates, options);

  assert.equal(first.primary.candidate.id, 'inspiration:spicy-hotpot');
  assert.equal(next.primary.candidate.id, 'inspiration:peanut-noodles');
  assert.deepEqual(next, composeMealPlan(context, candidates, options));
});

test('explicit exploration forwards the injected random source to recommend', () => {
  const values = [0, 1, 0, 0, 0, 0];
  let randomCalls = 0;

  const plan = composeMealPlan(
    makeContext({
      tastePreferences: ['辣'],
      mealScene: null,
      diningMode: null
    }),
    makeMealPlanCandidates(),
    {
      now: NOW,
      exploration: 100,
      random: () => {
        randomCalls += 1;
        return values.shift();
      }
    }
  );

  assert.equal(plan.primary.candidate.id, 'inspiration:mild-tofu');
  assert.equal(randomCalls, 6);
});

test('undecided mode recommends a literal compromise through the diner exclusion union', () => {
  const context = makeContext({
    partySize: 3,
    tastePreferences: ['辣'],
    mealScene: null,
    diningMode: 'undecided',
    dinerProfiles: [
      dinerProfiles[0],
      dinerProfiles[1],
      { ...dinerProfiles[2], exclusions: ['牛肉'] }
    ]
  });

  const plan = composeMealPlan(context, makeMealPlanCandidates(), { now: NOW });

  assert.equal(plan.kind, 'compromise');
  assert.equal(plan.primary.candidate.id, 'inspiration:peanut-noodles');
  assert.ok(plan.primary.passedConstraints.includes('exclusion'));
  assert.deepEqual(plan.diagnostics, {
    missingDinerIds: [],
    degradedFrom: null,
    reason: 'dining_mode_undecided'
  });
});

test('same-cuisine mode applies every diner exclusion before choosing its explicit cuisine', () => {
  const context = makeContext({
    partySize: 3,
    tastePreferences: [],
    mealScene: null,
    diningMode: 'shared_main_personal',
    dinerProfiles: [
      dinerProfiles[0],
      dinerProfiles[1],
      { ...dinerProfiles[2], exclusions: ['牛肉'] }
    ]
  });

  const plan = composeMealPlan(context, makeMealPlanCandidates(), { now: NOW });

  assert.deepEqual(plan.dinerAssignments.map(({ recommendation }) => (
    recommendation?.candidate.id ?? null
  )), [
    'inspiration:peanut-noodles',
    'inspiration:mild-tofu',
    'inspiration:savory-rice'
  ]);
  assert.ok(plan.dinerAssignments.every(({ recommendation }) => (
    recommendation.passedConstraints.includes('exclusion')
  )));
});

test('same-cuisine mode restricts every assignment to the selected primary cuisine tag', () => {
  const context = makeContext({
    partySize: 3,
    tastePreferences: [],
    mealScene: null,
    diningMode: 'shared_main_personal',
    dinerProfiles
  });
  const allCandidates = makeMealPlanCandidates();
  const secondarySichuan = makeInspirationCandidate({
    id: 'inspiration:secondary-sichuan',
    item: {
      id: 'secondary-sichuan',
      name: '川味西式融合面',
      tasteTags: ['清淡'],
      categoryTags: ['粉面'],
      ingredientTags: ['面条']
    },
    metadata: {
      cuisineTags: ['西式', '川味'],
      servingRoles: ['individual-main'],
      popularity: 'mainstream'
    }
  });
  const candidates = [allCandidates[0], allCandidates[1], allCandidates[2], secondarySichuan];

  const plan = composeMealPlan(context, candidates, { now: NOW });

  assert.equal(plan.kind, 'same_cuisine_set');
  assert.deepEqual(plan.dinerAssignments.map(({ recommendation }) => ({
    id: recommendation.candidate.id,
    cuisine: recommendation.candidate.metadata.cuisineTags[0]
  })), [
    { id: 'inspiration:spicy-hotpot', cuisine: '川味' },
    { id: 'inspiration:mild-tofu', cuisine: '川味' },
    { id: 'inspiration:savory-rice', cuisine: '川味' }
  ]);
});

test('same-cuisine degradation offers one unrestricted unique compromise recommendation', () => {
  const context = makeContext({
    partySize: 3,
    tastePreferences: [],
    mealScene: null,
    diningMode: 'shared_main_personal',
    dinerProfiles
  });
  const allCandidates = makeMealPlanCandidates();
  const candidates = [allCandidates[0], allCandidates[4]];

  const plan = composeMealPlan(context, candidates, { now: NOW });

  assert.equal(plan.kind, 'compromise');
  assert.equal(plan.primary.candidate.id, 'inspiration:western-pasta');
  assert.deepEqual(plan.dinerAssignments.map(({ recommendation }) => (
    recommendation?.candidate.id ?? null
  )), ['inspiration:spicy-hotpot', null, null]);
  assert.equal(
    plan.primary.candidate.id === plan.dinerAssignments[0].recommendation.candidate.id,
    false
  );
});

test('individual shortages preserve null ownership instead of silently duplicating dishes', () => {
  const context = makeContext({
    partySize: 3,
    tastePreferences: [],
    mealScene: null,
    diningMode: 'individual',
    dinerProfiles
  });
  const candidates = makeMealPlanCandidates().filter(({ id }) => (
    ['inspiration:spicy-hotpot', 'inspiration:peanut-noodles'].includes(id)
  ));

  const plan = composeMealPlan(context, candidates, { now: NOW });

  assert.equal(plan.kind, 'compromise');
  assert.deepEqual(plan.dinerAssignments.map(({ dinerId, recommendation }) => ({
    dinerId,
    id: recommendation?.candidate.id ?? null
  })), [
    { dinerId: 'diner-1', id: 'inspiration:spicy-hotpot' },
    { dinerId: 'diner-2', id: 'inspiration:peanut-noodles' },
    { dinerId: 'diner-3', id: null }
  ]);
  assert.deepEqual(plan.diagnostics, {
    missingDinerIds: ['diner-3'],
    degradedFrom: 'individual_set',
    reason: 'insufficient_unique_candidates'
  });
});

test('composeMealPlan keeps time injection mandatory through recommend', () => {
  assert.throws(
    () => composeMealPlan(makeContext(), makeMealPlanCandidates()),
    /options\.now/
  );
});
