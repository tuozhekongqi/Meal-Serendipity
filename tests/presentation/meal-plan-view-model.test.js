import assert from 'node:assert/strict';
import test from 'node:test';

import { createMealPlanViewModel } from '../../src/presentation/meal-plan-view-model.js';

function recommendation({
  id = 'inspiration:one',
  name = '番茄牛腩饭',
  image = null
} = {}) {
  return {
    candidate: {
      id,
      sourceMode: 'inspiration',
      item: {
        id: `${id}:item`,
        name,
        description: '一份静态菜品灵感',
        image,
        tasteTags: ['咸鲜'],
        categoryTags: ['米饭']
      },
      metadata: {}
    },
    reasonCodes: ['taste_match'],
    reasons: [{ code: 'taste_match', message: '符合主要口味偏好' }],
    passedConstraints: ['exclusion'],
    tradeoffs: []
  };
}

function plan(kind, overrides = {}) {
  return {
    kind,
    primary: null,
    alternatives: [],
    items: [],
    dinerAssignments: [],
    contextSummary: {
      partySize: 2,
      mealScene: 'group_individual',
      diningMode: 'individual'
    },
    diagnostics: {
      missingDinerIds: [],
      degradedFrom: null,
      reason: null
    },
    ...overrides
  };
}

test('maps all meal-plan kinds to render-safe cards while retaining truthful diagnostics', () => {
  const safe = recommendation({
    image: {
      src: './assets/dishes/noodles.webp',
      alt: '番茄牛腩饭菜品灵感示意图',
      kind: 'dish-inspiration'
    }
  });
  const unsafe = recommendation({
    id: 'inspiration:two',
    name: '清香豆腐',
    image: { src: '../outside.svg', alt: '不安全路径', kind: 'dish-inspiration' }
  });
  const sameCuisineSafe = recommendation({
    id: 'inspiration:teriyaki-chicken-rice',
    name: '照烧鸡腿饭',
    image: {
      src: './assets/dishes/rice-bowl.webp',
      alt: '鸡肉米饭碗菜品灵感图',
      kind: 'dish-inspiration'
    }
  });
  const cases = [
    plan('single', { primary: safe }),
    plan('shared_bundle', { items: [{ role: 'shared-main', recommendation: safe }] }),
    plan('individual_set', {
      dinerAssignments: [
        { dinerId: 'diner-1', recommendation: safe },
        { dinerId: 'diner-2', recommendation: unsafe }
      ]
    }),
    plan('same_cuisine_set', {
      dinerAssignments: [
        { dinerId: 'diner-1', recommendation: sameCuisineSafe },
        { dinerId: 'diner-2', recommendation: unsafe }
      ]
    }),
    plan('compromise', {
      primary: safe,
      alternatives: [unsafe],
      dinerAssignments: [{ dinerId: 'diner-2', recommendation: null }],
      diagnostics: {
        missingDinerIds: ['diner-2'],
        degradedFrom: 'same_cuisine_set',
        reason: 'insufficient_same_cuisine_candidates'
      }
    })
  ];

  for (const input of cases) {
    const view = createMealPlanViewModel({ plan: input, mode: 'inspiration', notices: [] });
    assert.equal(view.kind, input.kind);
    assert.equal(view.partyLabel, '2 人用餐');
    assert.equal(view.sceneLabel, '各点各的');
    assert.equal(view.mode.label, '菜品灵感');
  }

  const single = createMealPlanViewModel({ plan: cases[0], mode: 'inspiration', notices: [] });
  assert.deepEqual(single.primary.reasons, [
    { code: 'taste_match', message: '符合主要口味偏好' }
  ]);
  assert.deepEqual(single.primary.image, {
    src: './assets/dishes/noodles.webp',
    alt: '番茄牛腩饭菜品灵感示意图',
    kind: 'dish-inspiration'
  });

  const individual = createMealPlanViewModel({ plan: cases[2], mode: 'inspiration', notices: [] });
  assert.deepEqual(individual.assignments.map(({ dinerId, ownerLabel }) => ({ dinerId, ownerLabel })), [
    { dinerId: 'diner-1', ownerLabel: '第 1 位' },
    { dinerId: 'diner-2', ownerLabel: '第 2 位' }
  ]);
  assert.ok(individual.assignments.every(({ card }) => card.reasons.length > 0));
  assert.equal(individual.assignments[1].card.image.kind, 'placeholder');

  const sameCuisine = createMealPlanViewModel({ plan: cases[3], mode: 'inspiration', notices: [] });
  assert.deepEqual(sameCuisine.assignments.map(({ card }) => card.reasons[0].message), [
    '符合主要口味偏好',
    '符合主要口味偏好'
  ]);
  assert.deepEqual(sameCuisine.assignments.map(({ card }) => card.image), [
    {
      src: './assets/dishes/rice-bowl.webp',
      alt: '鸡肉米饭碗菜品灵感图',
      kind: 'dish-inspiration'
    },
    {
      src: './assets/dishes/placeholder.svg',
      alt: '菜品灵感占位图',
      kind: 'placeholder'
    }
  ]);

  const bundle = createMealPlanViewModel({ plan: cases[1], mode: 'inspiration', notices: [] });
  assert.deepEqual(bundle.bundleItems.map(({ role }) => role), ['shared-main']);
  assert.equal(bundle.bundleItems[0].card.reasons[0].message, '符合主要口味偏好');

  const compromise = createMealPlanViewModel({ plan: cases[4], mode: 'inspiration', notices: [] });
  assert.deepEqual(compromise.diagnostics, {
    missingDinerIds: ['diner-2'],
    degradedFrom: 'same_cuisine_set',
    reason: 'insufficient_same_cuisine_candidates'
  });
  assert.equal(compromise.alternatives[0].image.kind, 'placeholder');
  assert.equal(compromise.assignments[0].card, null);
});
