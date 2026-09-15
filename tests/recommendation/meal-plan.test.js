import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  composeMealPlan,
  mealPlanCandidateIds,
  promoteMealPlanAlternative
} from '../../src/recommendation/meal-plan.js';
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
    makeContext({ mealScene: 'solo_quick', diningMode: null, tastePreferences: ['辣'] }),
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

test('shared plan taste coverage is derived across all selected dishes and diners', () => {
  const plan = composeMealPlan(makeContext({
    partySize: 2,
    tastePreferences: [],
    mealScene: 'group_gathering',
    diningMode: 'shared',
    inspirationBudgetTier: 'everyday',
    dinerProfiles: dinerProfiles.slice(0, 2)
  }), makeMealPlanCandidates().slice(0, 2), { now: NOW });

  assert.ok(plan.primary.planEvidence.reasons.some(({ code, message }) => (
    code === 'plan_taste_coverage' && message.includes('2/2')
  )));
  assert.equal(
    plan.primary.planEvidence.tradeoffs.some(({ code }) => code === 'plan_taste_gap'),
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

test('shared mode degrades honestly when three safe candidates have only one serving role', () => {
  const context = makeContext({
    partySize: 3,
    tastePreferences: ['辣', '清淡', '咸鲜'],
    mealScene: null,
    diningMode: 'shared',
    dinerProfiles
  });
  const candidates = makeMealPlanCandidates().slice(0, 3).map((candidate) => ({
    ...candidate,
    metadata: { ...candidate.metadata, servingRoles: ['shared-main'] }
  }));

  const plan = composeMealPlan(context, candidates, { now: NOW });

  assert.equal(plan.kind, 'compromise');
  assert.deepEqual(plan.items.map(({ role, recommendation }) => ({
    role,
    id: recommendation.candidate.id
  })), [
    { role: 'shared-main', id: 'inspiration:spicy-hotpot' },
    { role: 'shared-main', id: 'inspiration:mild-tofu' },
    { role: 'shared-main', id: 'inspiration:savory-rice' }
  ]);
  assert.deepEqual(plan.diagnostics, {
    missingDinerIds: [],
    degradedFrom: 'shared_bundle',
    reason: 'insufficient_complementary_roles',
    alternativeShortageCount: 2
  });
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

test('individual real-scene assignments change when diners exchange taste preferences', () => {
  const spicy = makeInspirationCandidate({
    id: 'inspiration:a-spicy',
    item: { id: 'a-spicy', name: '香辣饭', tasteTags: ['辣'] },
    metadata: {
      servingRoles: ['individual-main'],
      supportedDiningModes: ['individual'],
      discoveryTraits: { convenient: 1, varietyFriendly: 1, stable: 1 }
    }
  });
  const sweet = makeInspirationCandidate({
    id: 'inspiration:b-sweet',
    item: { id: 'b-sweet', name: '甜香饭', tasteTags: ['甜'] },
    metadata: {
      servingRoles: ['individual-main'],
      supportedDiningModes: ['individual'],
      discoveryTraits: { convenient: 1, varietyFriendly: 1, stable: 1 }
    }
  });
  const contextFor = (firstTaste, secondTaste) => makeContext({
    partySize: 2,
    mealScene: 'group_individual',
    diningMode: 'individual',
    inspirationBudgetTier: 'everyday',
    tastePreferences: [],
    dinerProfiles: [
      { id: 'diner-1', tastePreferences: [firstTaste], exclusions: [] },
      { id: 'diner-2', tastePreferences: [secondTaste], exclusions: [] }
    ]
  });

  const sweetThenSpicy = composeMealPlan(contextFor('甜', '辣'), [spicy, sweet], { now: NOW });
  const spicyThenSweet = composeMealPlan(contextFor('辣', '甜'), [spicy, sweet], { now: NOW });

  assert.deepEqual(
    sweetThenSpicy.dinerAssignments.map(({ recommendation }) => recommendation.candidate.id),
    ['inspiration:b-sweet', 'inspiration:a-spicy']
  );
  assert.deepEqual(
    spicyThenSweet.dinerAssignments.map(({ recommendation }) => recommendation.candidate.id),
    ['inspiration:a-spicy', 'inspiration:b-sweet']
  );
  assert.ok(sweetThenSpicy.dinerAssignments.every(({ recommendation }) => (
    recommendation.components.taste === 1
      && recommendation.reasonCodes.includes('individual_taste_match')
  )));
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
    reason: 'insufficient_same_cuisine_candidates',
    alternativeShortageCount: 2
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
    reason: 'insufficient_unique_candidates',
    alternativeShortageCount: 2
  });
});

function directionCandidateIds(direction) {
  return [
    direction.hero?.candidate.id,
    ...(direction.items ?? []).map(({ recommendation }) => recommendation?.candidate.id),
    ...(direction.dinerAssignments ?? []).map(({ recommendation }) => recommendation?.candidate.id)
  ].filter(Boolean);
}

test('individual mode returns a labelled primary plan and two disjoint plan alternatives when supply permits', () => {
  const context = makeContext({
    partySize: 2,
    mealScene: 'group_individual',
    diningMode: 'individual',
    inspirationBudgetTier: 'everyday',
    tastePreferences: [],
    dinerProfiles: dinerProfiles.slice(0, 2)
  });

  const plan = composeMealPlan(context, makeMealPlanCandidates(), { now: NOW });

  assert.equal(plan.primary.planKind, 'individual_set');
  assert.equal(plan.primary.title, '每人单独选择');
  assert.equal(plan.primary.summary, '2 份不重复菜品，每份都保留对应用餐者。');
  assert.equal(plan.primary.hero.candidate.id, plan.primary.candidate.id);
  assert.equal(plan.primary.dinerAssignments.length, 2);
  assert.ok(plan.primary.planEvidence.reasons.length > 0);
  assert.ok(plan.primary.planEvidence.passedConstraints.includes('exclusion'));
  assert.equal(plan.alternatives.length, 2);
  assert.ok(plan.alternatives.every((alternative) => (
    alternative.planKind === 'individual_set'
      && alternative.dinerAssignments.length === 2
      && alternative.hero?.candidate?.item
  )));

  const directionSets = [plan.primary, ...plan.alternatives].map((direction) => (
    new Set(directionCandidateIds(direction))
  ));
  for (let left = 0; left < directionSets.length; left += 1) {
    for (let right = left + 1; right < directionSets.length; right += 1) {
      assert.equal([...directionSets[left]].some((id) => directionSets[right].has(id)), false);
    }
  }
});

test('same-cuisine mode returns full plan alternatives rather than raw dish alternatives', () => {
  const candidates = makeMealPlanCandidates().map((candidate, index) => ({
    ...candidate,
    id: `inspiration:cuisine-${index + 1}`,
    item: { ...candidate.item, id: `cuisine-${index + 1}`, name: `菜系菜 ${index + 1}` },
    metadata: { ...candidate.metadata, cuisineTags: ['家常'] }
  }));
  const plan = composeMealPlan(makeContext({
    partySize: 2,
    mealScene: 'group_mixed_taste',
    diningMode: 'shared_main_personal',
    inspirationBudgetTier: 'everyday',
    tastePreferences: [],
    dinerProfiles: dinerProfiles.slice(0, 2)
  }), candidates, { now: NOW });

  assert.equal(plan.primary.planKind, 'same_cuisine_set');
  assert.equal(plan.primary.title, '同菜系不同菜');
  assert.equal(plan.primary.dinerAssignments.length, 2);
  assert.equal(plan.alternatives.length, 2);
  assert.ok(plan.alternatives.every((alternative) => (
    alternative.planKind === 'same_cuisine_set'
      && alternative.dinerAssignments.length === 2
      && new Set(alternative.dinerAssignments.map(({ recommendation }) => (
        recommendation.candidate.metadata.cuisineTags[0]
      ))).size === 1
  )));
});

test('plan alternative shortages are explicit and never filled with duplicate directions', () => {
  const candidates = makeMealPlanCandidates().slice(0, 2);
  const plan = composeMealPlan(makeContext({
    partySize: 2,
    mealScene: 'group_individual',
    diningMode: 'individual',
    inspirationBudgetTier: 'everyday',
    tastePreferences: [],
    dinerProfiles: dinerProfiles.slice(0, 2)
  }), candidates, { now: NOW });

  assert.equal(plan.primary.planKind, 'individual_set');
  assert.deepEqual(plan.alternatives, []);
  assert.equal(plan.diagnostics.alternativeShortageCount, 2);
  assert.equal(new Set(directionCandidateIds(plan.primary)).size, 2);
});

test('undecided mode offers actual shared and individual plan directions', () => {
  const plan = composeMealPlan(makeContext({
    partySize: 2,
    mealScene: 'group_mixed_taste',
    diningMode: 'undecided',
    inspirationBudgetTier: 'everyday',
    tastePreferences: [],
    dinerProfiles: dinerProfiles.slice(0, 2)
  }), makeMealPlanCandidates(), { now: NOW });

  assert.equal(plan.primary.planKind, 'compromise');
  assert.deepEqual(plan.alternatives.map(({ planKind }) => planKind), [
    'shared_bundle',
    'individual_set'
  ]);
  assert.equal(plan.alternatives[0].items.length, 2);
  assert.equal(plan.alternatives[1].dinerAssignments.length, 2);
  assert.ok(plan.alternatives.every(({ hero }) => hero?.candidate?.item));

  const directionSets = [plan.primary, ...plan.alternatives].map((direction) => (
    new Set(directionCandidateIds(direction))
  ));
  for (let left = 0; left < directionSets.length; left += 1) {
    for (let right = left + 1; right < directionSets.length; right += 1) {
      assert.equal([...directionSets[left]].some((id) => directionSets[right].has(id)), false);
    }
  }
});

test('undecided shortages do not fabricate duplicate plan alternatives', () => {
  const plan = composeMealPlan(makeContext({
    partySize: 2,
    mealScene: 'group_mixed_taste',
    diningMode: 'undecided',
    inspirationBudgetTier: 'everyday',
    tastePreferences: [],
    dinerProfiles: dinerProfiles.slice(0, 2)
  }), makeMealPlanCandidates().slice(0, 1), { now: NOW });

  assert.equal(plan.primary.planKind, 'compromise');
  assert.deepEqual(plan.alternatives, []);
  assert.equal(plan.diagnostics.alternativeShortageCount, 2);
});

test('promoting an alternative rotates complete plan directions without mutation', () => {
  const plan = composeMealPlan(makeContext({
    partySize: 2,
    mealScene: 'group_individual',
    diningMode: 'individual',
    inspirationBudgetTier: 'everyday',
    tastePreferences: [],
    dinerProfiles: dinerProfiles.slice(0, 2)
  }), makeMealPlanCandidates(), { now: NOW });
  const originalPrimaryId = plan.primary.planId;
  const selected = plan.alternatives[0];

  const promoted = promoteMealPlanAlternative(plan, selected.planId);

  assert.notEqual(promoted, plan);
  assert.equal(plan.primary.planId, originalPrimaryId);
  assert.equal(promoted.primary.planId, selected.planId);
  assert.equal(promoted.alternatives[0].planId, originalPrimaryId);
  assert.deepEqual(promoted.dinerAssignments, promoted.primary.dinerAssignments);
  assert.deepEqual(promoted.items, promoted.primary.items);
  assert.equal(promoted.kind, promoted.primary.planKind);
  assert.deepEqual(promoted.diagnostics, promoted.primary.diagnostics);
});

test('mealPlanCandidateIds returns every unique candidate represented by complete directions', () => {
  const plan = composeMealPlan(makeContext({
    partySize: 2,
    mealScene: 'group_mixed_taste',
    diningMode: 'undecided',
    inspirationBudgetTier: 'everyday',
    tastePreferences: [],
    dinerProfiles: dinerProfiles.slice(0, 2)
  }), makeMealPlanCandidates(), { now: NOW });
  const expected = [...new Set(
    [plan.primary, ...plan.alternatives].flatMap(directionCandidateIds)
  )];

  assert.deepEqual(mealPlanCandidateIds(plan), expected);
});

test('composeMealPlan keeps time injection mandatory through recommend', () => {
  assert.throws(
    () => composeMealPlan(makeContext(), makeMealPlanCandidates()),
    /options\.now/
  );
});
