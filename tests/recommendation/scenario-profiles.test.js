import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MEAL_SCENE } from '../../src/domain/scenarios.js';
import {
  getScenarioProfile,
  scoreScenarioEvidence
} from '../../src/recommendation/scenario-profiles.js';

test('every approved scene has normalized scoring weights and a theme', () => {
  for (const scene of Object.values(MEAL_SCENE)) {
    const profile = getScenarioProfile(scene);

    assert.equal(
      Object.values(profile.scoreWeights).reduce((sum, value) => sum + value, 0),
      100
    );
    assert.ok(profile.reasonCode);
    assert.ok(profile.theme);
  }
});

test('scenario evidence reports matching traits, static price tier, and dining mode', () => {
  const result = scoreScenarioEvidence({
    mealScene: 'group_celebration',
    inspirationBudgetTier: 'generous',
    diningMode: 'shared'
  }, {
    metadata: {
      discoveryTraits: { expressive: 1, shareable: 1, varietyFriendly: 0 },
      priceTier: 3,
      supportedDiningModes: ['shared']
    }
  });

  assert.deepEqual(result.components, { scenario: 0.85, budget: 1, group: 1 });
  assert.deepEqual(result.evidence, {
    sceneReasonCode: 'celebration_expression_match',
    inspirationBudgetMatched: true,
    diningModeMatched: true,
    matchedTraits: ['expressive', 'shareable']
  });
});
