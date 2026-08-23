import { MEAL_SCENE } from '../domain/scenarios.js';

function profile({ theme, reasonCode, traitWeights, scoreWeights, reasonThreshold = 0.75 }) {
  return Object.freeze({
    theme,
    reasonCode,
    reasonThreshold,
    traitWeights: Object.freeze({ ...traitWeights }),
    scoreWeights: Object.freeze({ ...scoreWeights })
  });
}

const SCENARIO_PROFILES = Object.freeze({
  [MEAL_SCENE.SOLO_QUICK]: profile({
    theme: 'quick',
    reasonCode: 'quick_reliable_match',
    traitWeights: { convenient: 0.65, stable: 0.2, filling: 0.15 },
    scoreWeights: { scenario: 80, budget: 20, group: 0 }
  }),
  [MEAL_SCENE.SOLO_FOCUS]: profile({
    theme: 'focus',
    reasonCode: 'focus_friendly_match',
    traitWeights: { stable: 0.45, filling: 0.3, mild: 0.25 },
    scoreWeights: { scenario: 75, budget: 25, group: 0 }
  }),
  [MEAL_SCENE.SOLO_TREAT]: profile({
    theme: 'treat',
    reasonCode: 'treat_expression_match',
    traitWeights: { expressive: 0.6, comforting: 0.25, filling: 0.15 },
    scoreWeights: { scenario: 80, budget: 20, group: 0 }
  }),
  [MEAL_SCENE.SOLO_LATE_NIGHT]: profile({
    theme: 'late_night',
    reasonCode: 'late_night_comfort_match',
    traitWeights: { lateNight: 0.65, comforting: 0.2, convenient: 0.15 },
    scoreWeights: { scenario: 80, budget: 20, group: 0 }
  }),
  [MEAL_SCENE.SOLO_LIGHTER]: profile({
    theme: 'lighter',
    reasonCode: 'lighter_scene_match',
    traitWeights: { lighter: 0.7, mild: 0.3 },
    scoreWeights: { scenario: 80, budget: 20, group: 0 }
  }),
  [MEAL_SCENE.SOLO_SAVE]: profile({
    theme: 'save',
    reasonCode: 'saving_scene_match',
    traitWeights: { convenient: 0.4, stable: 0.35, filling: 0.25 },
    scoreWeights: { scenario: 45, budget: 55, group: 0 }
  }),
  [MEAL_SCENE.GROUP_GATHERING]: profile({
    theme: 'gathering',
    reasonCode: 'shareable_match',
    traitWeights: { shareable: 0.55, varietyFriendly: 0.25, comforting: 0.2 },
    scoreWeights: { scenario: 60, budget: 10, group: 30 }
  }),
  [MEAL_SCENE.GROUP_INDIVIDUAL]: profile({
    theme: 'individual',
    reasonCode: 'individual_taste_match',
    traitWeights: { convenient: 0.45, varietyFriendly: 0.35, stable: 0.2 },
    scoreWeights: { scenario: 55, budget: 10, group: 35 }
  }),
  [MEAL_SCENE.GROUP_MIXED_TASTE]: profile({
    theme: 'mixed_taste',
    reasonCode: 'same_cuisine_variety',
    traitWeights: { varietyFriendly: 0.5, shareable: 0.25, convenient: 0.25 },
    scoreWeights: { scenario: 50, budget: 10, group: 40 }
  }),
  [MEAL_SCENE.GROUP_FAMILY]: profile({
    theme: 'family',
    reasonCode: 'family_table_match',
    traitWeights: { mild: 0.35, shareable: 0.35, comforting: 0.3 },
    scoreWeights: { scenario: 60, budget: 10, group: 30 }
  }),
  [MEAL_SCENE.GROUP_CELEBRATION]: profile({
    theme: 'celebration',
    reasonCode: 'celebration_expression_match',
    traitWeights: { expressive: 0.5, shareable: 0.35, varietyFriendly: 0.15 },
    scoreWeights: { scenario: 65, budget: 10, group: 25 },
    reasonThreshold: 0.8
  })
});

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function traitValue(traits, name) {
  const value = traits?.[name];
  return Number.isFinite(value) ? clamp01(value) : 0;
}

function weightedTraitMatch(traitWeights, traits) {
  return Object.entries(traitWeights).reduce(
    (total, [name, weight]) => total + traitValue(traits, name) * weight,
    0
  );
}

function matchedTraitNames(traitWeights, traits) {
  return Object.keys(traitWeights).filter((name) => traitValue(traits, name) >= 0.75);
}

function inspirationBudgetMatch(requestedTier, priceTier) {
  if (!Number.isInteger(priceTier) || priceTier < 1 || priceTier > 4) return 0.5;

  const matches = {
    economy: [1, 0.75, 0.25, 0],
    everyday: [0.75, 1, 0.75, 0.25],
    generous: [0.25, 0.75, 1, 0.75],
    open: [1, 1, 1, 1]
  };
  return matches[requestedTier]?.[priceTier - 1] ?? 0.5;
}

function diningModeMatch(diningMode, supportedDiningModes) {
  if (diningMode === null || diningMode === undefined) return 0.5;
  if (!Array.isArray(supportedDiningModes)) return 0;
  return supportedDiningModes.includes(diningMode) ? 1 : 0;
}

export function getScenarioProfile(mealScene) {
  return SCENARIO_PROFILES[mealScene] ?? null;
}

export function scoreScenarioEvidence(context, candidate) {
  const profile = getScenarioProfile(context.mealScene);
  if (!profile) return null;

  const traits = candidate.metadata?.discoveryTraits;
  const scenario = weightedTraitMatch(profile.traitWeights, traits);
  const budget = inspirationBudgetMatch(context.inspirationBudgetTier, candidate.metadata?.priceTier);
  const group = diningModeMatch(context.diningMode, candidate.metadata?.supportedDiningModes);

  return {
    components: { scenario, budget, group },
    evidence: {
      sceneReasonCode: scenario >= profile.reasonThreshold ? profile.reasonCode : null,
      inspirationBudgetMatched: budget >= 0.75,
      diningModeMatched: group >= 0.75,
      matchedTraits: matchedTraitNames(profile.traitWeights, traits)
    }
  };
}
