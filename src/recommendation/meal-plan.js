import { recommend } from './recommend.js';

const PLAN_TITLES = Object.freeze({
  single: '本餐首选',
  shared_bundle: '共享菜组合',
  individual_set: '每人单独选择',
  same_cuisine_set: '同菜系不同菜',
  compromise: '折中方案'
});

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function contextSummary(context) {
  return {
    partySize: context.partySize,
    mealScene: context.mealScene ?? null,
    diningMode: context.diningMode ?? null
  };
}

function diagnostics(overrides = {}) {
  return {
    missingDinerIds: [],
    degradedFrom: null,
    reason: null,
    ...overrides
  };
}

function recommendationResult(context, candidates, options) {
  return recommend(context, candidates, {
    now: options.now,
    alternativeLimit: candidates.length,
    exploration: options.exploration,
    random: options.random
  });
}

function rankedRecommendations(result) {
  return result.primary === null
    ? []
    : [result.primary, ...result.alternatives];
}

function withoutCandidateIds(candidates, candidateIds) {
  const excluded = new Set(candidateIds);
  return candidates.filter(({ id }) => !excluded.has(id));
}

function availableCandidates(candidates, options) {
  return withoutCandidateIds(candidates, options.excludedCandidateIds ?? []);
}

function dinerProfiles(context) {
  const partySize = Number.isInteger(context.partySize) && context.partySize > 0
    ? context.partySize
    : Math.max(1, context.dinerProfiles?.length ?? 0);

  return Array.from({ length: partySize }, (_, index) => {
    const profile = context.dinerProfiles?.[index] ?? {};
    return {
      id: profile.id || `diner-${index + 1}`,
      tastePreferences: [...(profile.tastePreferences ?? [])],
      exclusions: [...(profile.exclusions ?? [])]
    };
  });
}

function unionExclusions(context, profiles = dinerProfiles(context)) {
  return unique([
    ...(context.exclusions ?? []),
    ...profiles.flatMap(({ exclusions }) => exclusions)
  ]);
}

function withDinerPreferences(context, profile, exclusions) {
  return {
    ...context,
    tastePreferences: [...profile.tastePreferences],
    tasteEvidenceScope: 'individual',
    exclusions: [...exclusions]
  };
}

function withGroupPreferences(context, profiles = dinerProfiles(context)) {
  return {
    ...context,
    tastePreferences: context.mealScene ? [] : [...(context.tastePreferences ?? [])],
    tastePreferenceGroups: profiles
      .map(({ tastePreferences }) => [...tastePreferences])
      .filter((preferences) => preferences.length > 0),
    tasteEvidenceScope: 'group',
    exclusions: unionExclusions(context, profiles)
  };
}

function servingRole(recommendation) {
  return recommendation.candidate.metadata?.servingRoles?.[0] ?? 'shared-item';
}

function selectComplementaryItems(result, partySize) {
  const ranked = rankedRecommendations(result);
  const targetCount = Math.min(ranked.length, Math.max(2, partySize));
  const selected = [];
  const selectedIds = new Set();
  const selectedRoles = new Set();

  for (const recommendation of ranked) {
    const role = servingRole(recommendation);
    if (selectedIds.has(recommendation.candidate.id) || selectedRoles.has(role)) continue;
    selected.push({ role, recommendation });
    selectedIds.add(recommendation.candidate.id);
    selectedRoles.add(role);
    if (selected.length === targetCount) return selected;
  }

  for (const recommendation of ranked) {
    if (selectedIds.has(recommendation.candidate.id)) continue;
    selected.push({ role: servingRole(recommendation), recommendation });
    selectedIds.add(recommendation.candidate.id);
    if (selected.length === targetCount) break;
  }

  return selected;
}

function recommendationsIn({ hero, items = [], dinerAssignments = [] }) {
  const byCandidateId = new Map();
  for (const recommendation of [
    hero,
    ...items.map(({ recommendation: item }) => item),
    ...dinerAssignments.map(({ recommendation }) => recommendation)
  ]) {
    if (recommendation?.candidate?.id) byCandidateId.set(recommendation.candidate.id, recommendation);
  }
  return [...byCandidateId.values()];
}

function sharedPassedConstraints(recommendations) {
  if (recommendations.length === 0) return [];
  const remaining = new Set(recommendations[0].passedConstraints ?? []);
  for (const recommendation of recommendations.slice(1)) {
    const passed = new Set(recommendation.passedConstraints ?? []);
    for (const constraint of remaining) {
      if (!passed.has(constraint)) remaining.delete(constraint);
    }
  }
  return [...remaining];
}

function uniqueMessages(values) {
  const seen = new Set();
  return values.filter(({ code, message }) => {
    const key = `${code ?? ''}:${message ?? ''}`;
    if (!message || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function tasteCoverage(context, recommendations, dinerAssignments) {
  const profiles = dinerProfiles(context)
    .filter(({ tastePreferences }) => tastePreferences.length > 0);
  const preferenceDinerCount = profiles.length;
  if (preferenceDinerCount === 0) return null;

  const matches = (recommendation, preferences) => {
    const tasteTags = new Set(recommendation?.candidate?.item?.tasteTags ?? []);
    return preferences.some((preference) => tasteTags.has(preference));
  };
  const assignmentsByDiner = new Map(
    dinerAssignments.map(({ dinerId, recommendation }) => [dinerId, recommendation])
  );
  const matchedDinerCount = profiles.filter((profile) => (
    dinerAssignments.length > 0
      ? matches(assignmentsByDiner.get(profile.id), profile.tastePreferences)
      : recommendations.some((recommendation) => matches(recommendation, profile.tastePreferences))
  )).length;
  return {
    matchedDinerCount,
    preferenceDinerCount
  };
}

function structuralReason(planKind, items, dinerAssignments) {
  if (planKind === 'shared_bundle') {
    return {
      code: 'shared_structure_complete',
      message: `由 ${items.length} 道不同类型的菜品组成，便于共享搭配`
    };
  }
  if (planKind === 'individual_set') {
    return {
      code: 'individual_assignment_complete',
      message: `已为 ${dinerAssignments.length} 位用餐者分别安排不同菜品`
    };
  }
  if (planKind === 'same_cuisine_set') {
    const cuisine = dinerAssignments.find(({ recommendation }) => recommendation)
      ?.recommendation?.candidate?.metadata?.cuisineTags?.[0];
    return {
      code: 'same_cuisine_structure_complete',
      message: cuisine
        ? `菜品均标注为“${cuisine}”菜系，且没有重复`
        : '菜品均保留对应的用餐者，且没有重复'
    };
  }
  if (planKind === 'compromise') {
    return {
      code: 'compromise_direction',
      message: '当前条件下无法完成原定组合，先提供可调整的折中方案'
    };
  }
  return { code: 'single_direction', message: '这是当前条件下的首选菜品' };
}

function buildPlanEvidence(context, planKind, hero, items, dinerAssignments) {
  const recommendations = recommendationsIn({ hero, items, dinerAssignments });
  const reasons = [structuralReason(planKind, items, dinerAssignments)];
  const tradeoffs = uniqueMessages(recommendations.flatMap(({ tradeoffs: values = [] }) => values));
  const coverage = tasteCoverage(context, recommendations, dinerAssignments);

  if (coverage?.matchedDinerCount > 0) {
    reasons.push({
      code: 'plan_taste_coverage',
      message: `方案中的菜品已命中 ${coverage.matchedDinerCount}/${coverage.preferenceDinerCount} 位已填写的口味`
    });
  }
  if (coverage && coverage.matchedDinerCount < coverage.preferenceDinerCount) {
    tradeoffs.unshift({
      code: 'plan_taste_gap',
      message: `仍有 ${coverage.preferenceDinerCount - coverage.matchedDinerCount} 位已填写的口味未在方案中命中`
    });
  }

  return {
    reasons,
    passedConstraints: sharedPassedConstraints(recommendations),
    tradeoffs: uniqueMessages(tradeoffs)
  };
}

function directionSummary(planKind, context, items, dinerAssignments, directionDiagnostics) {
  if (planKind === 'single') return '一道符合当前条件的首选菜品。';
  if (planKind === 'shared_bundle') return `${items.length} 道互补菜品，作为 ${context.partySize} 人共享的搭配方向。`;
  if (planKind === 'individual_set') return `${dinerAssignments.length} 份不重复菜品，每份都保留对应用餐者。`;
  if (planKind === 'same_cuisine_set') {
    const cuisine = dinerAssignments.find(({ recommendation }) => recommendation)
      ?.recommendation?.candidate?.metadata?.cuisineTags?.[0];
    return `${cuisine ? `${cuisine}方向，` : ''}${dinerAssignments.length} 份不同菜品按用餐者分配。`;
  }
  if (directionDiagnostics.reason === 'dining_mode_undecided') {
    return '先提供一个共同的折中菜品，也可以切换到共享或每人一份。';
  }
  return '符合条件的菜品不足以完成原定组合，已保留可用部分并标出缺口。';
}

function directionId(planKind, hero, items, dinerAssignments) {
  const ids = recommendationsIn({ hero, items, dinerAssignments })
    .map(({ candidate }) => candidate.id);
  return `plan:${planKind}:${ids.join('+')}`;
}

function createDirection(context, {
  planKind,
  hero,
  items = [],
  dinerAssignments = [],
  directionDiagnostics = diagnostics(),
  title = PLAN_TITLES[planKind],
  differenceLabel = null
}) {
  if (!hero) return null;
  return {
    ...hero,
    planId: directionId(planKind, hero, items, dinerAssignments),
    planKind,
    title,
    summary: directionSummary(planKind, context, items, dinerAssignments, directionDiagnostics),
    differenceLabel,
    hero,
    items,
    dinerAssignments,
    planEvidence: buildPlanEvidence(context, planKind, hero, items, dinerAssignments),
    diagnostics: directionDiagnostics
  };
}

function candidateIdsInDirection(direction) {
  return recommendationsIn(direction).map(({ candidate }) => candidate.id);
}

function composeSingleDirections(context, candidates, options) {
  const result = recommendationResult(context, candidates, options);
  return rankedRecommendations(result).slice(0, 3).map((recommendation) => createDirection(context, {
    planKind: 'single',
    hero: recommendation,
    title: recommendation.candidate.item.name,
    differenceLabel: '备选菜品'
  }));
}

function composeSharedDirection(context, candidates, options) {
  const profiles = dinerProfiles(context);
  const result = recommendationResult(withGroupPreferences(context, profiles), candidates, options);
  const items = selectComplementaryItems(result, context.partySize);
  const hasEnoughItems = items.length >= Math.min(2, context.partySize);
  const hasComplementaryRoles = new Set(items.map(({ role }) => role)).size === items.length;
  const hasBundle = hasEnoughItems && hasComplementaryRoles;
  const directionDiagnostics = diagnostics(hasBundle ? {} : {
    degradedFrom: 'shared_bundle',
    reason: hasEnoughItems
      ? 'insufficient_complementary_roles'
      : 'insufficient_shared_candidates'
  });
  return createDirection(context, {
    planKind: hasBundle ? 'shared_bundle' : 'compromise',
    hero: items[0]?.recommendation ?? result.primary,
    items,
    directionDiagnostics,
    differenceLabel: '另一组共享搭配'
  });
}

function composeIndividualDirection(context, candidates, options) {
  const profiles = dinerProfiles(context);
  let remaining = candidates;
  const assignments = [];

  for (const profile of profiles) {
    const dinerContext = withDinerPreferences(
      context,
      profile,
      unique([...(context.exclusions ?? []), ...profile.exclusions])
    );
    const result = recommendationResult(dinerContext, remaining, options);
    assignments.push({ dinerId: profile.id, recommendation: result.primary });
    if (result.primary !== null) {
      remaining = withoutCandidateIds(remaining, [result.primary.candidate.id]);
    }
  }

  const missingDinerIds = assignments
    .filter(({ recommendation }) => recommendation === null)
    .map(({ dinerId }) => dinerId);
  const complete = missingDinerIds.length === 0;
  const directionDiagnostics = diagnostics(complete ? {} : {
    missingDinerIds,
    degradedFrom: 'individual_set',
    reason: 'insufficient_unique_candidates'
  });
  return createDirection(context, {
    planKind: complete ? 'individual_set' : 'compromise',
    hero: assignments.find(({ recommendation }) => recommendation)?.recommendation ?? null,
    dinerAssignments: assignments,
    directionDiagnostics,
    differenceLabel: '另一组每人一份'
  });
}

function firstCuisineRecommendation(result) {
  return rankedRecommendations(result).find(({ candidate }) => (
    typeof candidate.metadata?.cuisineTags?.[0] === 'string'
    && candidate.metadata.cuisineTags[0].length > 0
  )) ?? null;
}

function composeSameCuisineDirection(context, candidates, options) {
  const profiles = dinerProfiles(context);
  const exclusions = unionExclusions(context, profiles);
  let remaining = candidates;
  let cuisineTag = null;
  const assignments = [];

  for (const profile of profiles) {
    const dinerContext = withDinerPreferences(context, profile, exclusions);
    const pool = cuisineTag === null
      ? remaining
      : remaining.filter(({ metadata }) => metadata?.cuisineTags?.[0] === cuisineTag);
    const result = recommendationResult(dinerContext, pool, options);
    const recommendation = cuisineTag === null
      ? firstCuisineRecommendation(result)
      : result.primary;

    assignments.push({ dinerId: profile.id, recommendation });
    if (recommendation !== null) {
      cuisineTag ??= recommendation.candidate.metadata.cuisineTags[0];
      remaining = withoutCandidateIds(remaining, [recommendation.candidate.id]);
    }
  }

  const missingDinerIds = assignments
    .filter(({ recommendation }) => recommendation === null)
    .map(({ dinerId }) => dinerId);
  if (missingDinerIds.length === 0) {
    return createDirection(context, {
      planKind: 'same_cuisine_set',
      hero: assignments[0].recommendation,
      dinerAssignments: assignments,
      differenceLabel: '换一组同菜系菜品'
    });
  }

  const compromise = recommendationResult(withGroupPreferences(context, profiles), remaining, options);
  return createDirection(context, {
    planKind: 'compromise',
    hero: compromise.primary
      ?? assignments.find(({ recommendation }) => recommendation)?.recommendation
      ?? null,
    dinerAssignments: assignments,
    directionDiagnostics: diagnostics({
      missingDinerIds,
      degradedFrom: 'same_cuisine_set',
      reason: cuisineTag === null
        ? 'missing_cuisine_tag'
        : 'insufficient_same_cuisine_candidates'
    }),
    differenceLabel: '改用可完成的折中方案'
  });
}

function composeCompromiseDirection(context, candidates, options) {
  const profiles = dinerProfiles(context);
  const result = recommendationResult(withGroupPreferences(context, profiles), candidates, options);
  return createDirection(context, {
    planKind: 'compromise',
    hero: result.primary,
    directionDiagnostics: diagnostics({ reason: 'dining_mode_undecided' })
  });
}

function composeDisjointDirections(context, candidates, options, composer) {
  const directions = [];
  let remaining = candidates;
  for (let index = 0; index < 3; index += 1) {
    const direction = composer(context, remaining, options);
    if (!direction) break;
    directions.push(direction);
    const usedIds = candidateIdsInDirection(direction);
    if (usedIds.length === 0) break;
    remaining = withoutCandidateIds(remaining, usedIds);
  }
  return directions;
}

function planFromDirections(context, requestedKind, directions) {
  const rawPrimary = directions[0] ?? null;
  const alternatives = directions.slice(1, 3);
  let planDiagnostics = rawPrimary?.diagnostics ?? diagnostics({
    reason: 'no_eligible_candidates'
  });
  if (rawPrimary && alternatives.length < 2) {
    planDiagnostics = {
      ...planDiagnostics,
      alternativeShortageCount: 2 - alternatives.length
    };
  }
  const primary = rawPrimary ? { ...rawPrimary, diagnostics: planDiagnostics } : null;

  return {
    kind: primary?.planKind ?? requestedKind,
    primary,
    alternatives,
    items: primary?.items ?? [],
    dinerAssignments: primary?.dinerAssignments ?? [],
    contextSummary: contextSummary(context),
    diagnostics: planDiagnostics
  };
}

/**
 * Return every literal candidate represented by the primary direction and its
 * alternatives, preserving display order and removing duplicates.
 *
 * @param {ReturnType<typeof composeMealPlan>} plan
 */
export function mealPlanCandidateIds(plan) {
  return unique(
    [plan.primary, ...(plan.alternatives ?? [])]
      .filter(Boolean)
      .flatMap(candidateIdsInDirection)
  );
}

/**
 * Promote one already-composed safe alternative locally. No scoring or
 * candidate filtering is repeated; the complete direction moves as a unit.
 *
 * @param {ReturnType<typeof composeMealPlan>} plan
 * @param {string} planId
 */
export function promoteMealPlanAlternative(plan, planId) {
  const selectedIndex = plan.alternatives?.findIndex(({ planId: id }) => id === planId) ?? -1;
  if (selectedIndex < 0) return plan;

  const selected = plan.alternatives[selectedIndex];
  const remaining = plan.alternatives.filter((_, index) => index !== selectedIndex);
  const alternatives = [plan.primary, ...remaining].filter(Boolean).slice(0, 2);
  const {
    alternativeShortageCount: _ignoredShortage,
    ...baseDiagnostics
  } = selected.diagnostics ?? diagnostics();
  const planDiagnostics = alternatives.length < 2
    ? { ...baseDiagnostics, alternativeShortageCount: 2 - alternatives.length }
    : baseDiagnostics;
  const primary = { ...selected, diagnostics: planDiagnostics };

  return {
    ...plan,
    kind: primary.planKind,
    primary,
    alternatives,
    items: primary.items ?? [],
    dinerAssignments: primary.dinerAssignments ?? [],
    diagnostics: planDiagnostics
  };
}

/**
 * Compose one primary meal-plan direction and up to two complete plan-level
 * alternatives. Filtering, scoring, and explanations remain inside recommend().
 *
 * @param {import('../domain/models.js').UserContext} context
 * @param {import('../domain/models.js').Candidate[]} candidates
 * @param {{now?: Date | string | number, exploration?: number, random?: () => number, excludedCandidateIds?: string[]}} options
 */
export function composeMealPlan(context, candidates, options = {}) {
  const available = availableCandidates(candidates, options);
  if (context.partySize === 1) {
    return planFromDirections(context, 'single', composeSingleDirections(context, available, options));
  }
  if (context.diningMode === 'shared') {
    return planFromDirections(
      context,
      'shared_bundle',
      composeDisjointDirections(context, available, options, composeSharedDirection)
    );
  }
  if (context.diningMode === 'individual') {
    return planFromDirections(
      context,
      'individual_set',
      composeDisjointDirections(context, available, options, composeIndividualDirection)
    );
  }
  if (context.diningMode === 'shared_main_personal') {
    return planFromDirections(
      context,
      'same_cuisine_set',
      composeDisjointDirections(context, available, options, composeSameCuisineDirection)
    );
  }

  const primary = composeCompromiseDirection(context, available, options);
  let remaining = primary
    ? withoutCandidateIds(available, candidateIdsInDirection(primary))
    : available;
  const shared = composeSharedDirection(context, remaining, options);
  if (shared) remaining = withoutCandidateIds(remaining, candidateIdsInDirection(shared));
  const individual = composeIndividualDirection(context, remaining, options);
  const alternatives = [shared, individual].filter(Boolean);
  return planFromDirections(context, 'compromise', [primary, ...alternatives]);
}
