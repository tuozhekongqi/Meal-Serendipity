import { recommend } from './recommend.js';

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

function basePlan(kind, context, overrides = {}) {
  return {
    kind,
    primary: null,
    alternatives: [],
    items: [],
    dinerAssignments: [],
    contextSummary: contextSummary(context),
    diagnostics: diagnostics(),
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
    exclusions: [...exclusions]
  };
}

function withUnionExclusions(context, profiles = dinerProfiles(context)) {
  return {
    ...context,
    exclusions: unionExclusions(context, profiles)
  };
}

function composeSingle(context, candidates, options) {
  const result = recommendationResult(context, candidates, options);
  return basePlan('single', context, {
    primary: result.primary,
    alternatives: result.alternatives,
    diagnostics: diagnostics({
      reason: result.primary === null ? 'no_eligible_candidates' : null
    })
  });
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

function composeShared(context, candidates, options) {
  const result = recommendationResult(withUnionExclusions(context), candidates, options);
  const items = selectComplementaryItems(result, context.partySize);
  const hasBundle = items.length >= Math.min(2, context.partySize);

  return basePlan(hasBundle ? 'shared_bundle' : 'compromise', context, {
    primary: result.primary,
    alternatives: result.alternatives,
    items,
    diagnostics: diagnostics(hasBundle ? {} : {
      degradedFrom: 'shared_bundle',
      reason: 'insufficient_shared_candidates'
    })
  });
}

function composeIndividual(context, candidates, options) {
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

  return basePlan(complete ? 'individual_set' : 'compromise', context, {
    dinerAssignments: assignments,
    diagnostics: diagnostics(complete ? {} : {
      missingDinerIds,
      degradedFrom: 'individual_set',
      reason: 'insufficient_unique_candidates'
    })
  });
}

function firstCuisineRecommendation(result) {
  return rankedRecommendations(result).find(({ candidate }) => (
    typeof candidate.metadata?.cuisineTags?.[0] === 'string'
    && candidate.metadata.cuisineTags[0].length > 0
  )) ?? null;
}

function composeSameCuisine(context, candidates, options) {
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
    return basePlan('same_cuisine_set', context, { dinerAssignments: assignments });
  }

  const compromise = recommendationResult(
    withUnionExclusions(context, profiles),
    remaining,
    options
  );

  return basePlan('compromise', context, {
    primary: compromise.primary,
    alternatives: compromise.alternatives,
    dinerAssignments: assignments,
    diagnostics: diagnostics({
      missingDinerIds,
      degradedFrom: 'same_cuisine_set',
      reason: cuisineTag === null
        ? 'missing_cuisine_tag'
        : 'insufficient_same_cuisine_candidates'
    })
  });
}

function composeUndecided(context, candidates, options) {
  const result = recommendationResult(withUnionExclusions(context), candidates, options);
  return basePlan('compromise', context, {
    primary: result.primary,
    alternatives: result.alternatives,
    diagnostics: diagnostics({ reason: 'dining_mode_undecided' })
  });
}

/**
 * Compose one or more meal recommendations while leaving filtering, ranking,
 * and explanations exclusively to recommend().
 *
 * @param {import('../domain/models.js').UserContext} context
 * @param {import('../domain/models.js').Candidate[]} candidates
 * @param {{now?: Date | string | number, exploration?: number, random?: () => number, excludedCandidateIds?: string[]}} options
 */
export function composeMealPlan(context, candidates, options = {}) {
  const available = availableCandidates(candidates, options);
  if (context.partySize === 1) return composeSingle(context, available, options);
  if (context.diningMode === 'shared') return composeShared(context, available, options);
  if (context.diningMode === 'individual') return composeIndividual(context, available, options);
  if (context.diningMode === 'shared_main_personal') {
    return composeSameCuisine(context, available, options);
  }
  return composeUndecided(context, available, options);
}
