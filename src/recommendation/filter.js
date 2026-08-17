import {
  DEFAULT_DATA_TTL_MS,
  HARD_CONSTRAINT,
  SOURCE_MODE
} from '../domain/models.js';

const PASSED_CONSTRAINT = Object.freeze({
  EXCLUSION: 'exclusion',
  OPEN: 'open',
  AVAILABLE: 'available',
  ORDERABLE: 'orderable',
  BUDGET: 'within_budget',
  DELIVERY: 'within_eta',
  DISTANCE: 'within_distance',
  FRESH: 'fresh'
});

function isFiniteNonNegative(value) {
  return Number.isFinite(value) && value >= 0;
}

function normalizeTerm(value) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('zh-CN')
    .replace(/^(不吃|不要|忌口|忌|无)/, '');
}

function candidateSearchTerms(candidate) {
  const item = candidate?.item ?? {};
  return [
    item.name,
    ...(item.tasteTags ?? []),
    ...(item.categoryTags ?? []),
    ...(item.allergenTags ?? []),
    ...(item.ingredientTags ?? [])
  ].map(normalizeTerm).filter(Boolean);
}

function matchesExclusion(candidate, exclusions) {
  const terms = candidateSearchTerms(candidate);
  return exclusions
    .map(normalizeTerm)
    .filter(Boolean)
    .some((excluded) => terms.some((term) => term.includes(excluded) || excluded.includes(term)));
}

function hasValidBaseShape(candidate) {
  return Boolean(
    candidate
    && typeof candidate.id === 'string'
    && candidate.id.length > 0
    && candidate.item
    && typeof candidate.item.name === 'string'
    && Array.isArray(candidate.item.tasteTags)
    && Array.isArray(candidate.item.categoryTags)
    && Array.isArray(candidate.item.allergenTags)
    && Array.isArray(candidate.item.ingredientTags)
  );
}

function evaluateLiveCandidate(context, candidate, nowMs, ttlMs, reasons, passedConstraints) {
  if (!candidate.store || candidate.store.isOpen !== true) {
    reasons.push(candidate.store?.isOpen === false
      ? HARD_CONSTRAINT.CLOSED
      : HARD_CONSTRAINT.INVALID_DATA);
  } else {
    passedConstraints.push(PASSED_CONSTRAINT.OPEN);
  }

  if (candidate.item.isAvailable !== true) {
    reasons.push(candidate.item.isAvailable === false
      ? HARD_CONSTRAINT.UNAVAILABLE
      : HARD_CONSTRAINT.INVALID_DATA);
  } else {
    passedConstraints.push(PASSED_CONSTRAINT.AVAILABLE);
  }

  if (!candidate.availability || candidate.availability.isOrderable !== true) {
    reasons.push(candidate.availability?.isOrderable === false
      ? HARD_CONSTRAINT.NOT_ORDERABLE
      : HARD_CONSTRAINT.INVALID_DATA);
  } else {
    passedConstraints.push(PASSED_CONSTRAINT.ORDERABLE);
  }

  if (!candidate.pricing || !isFiniteNonNegative(candidate.pricing.totalCents)) {
    reasons.push(HARD_CONSTRAINT.INVALID_DATA);
  } else if (
    isFiniteNonNegative(context.totalBudgetCents)
    && candidate.pricing.totalCents > context.totalBudgetCents
  ) {
    reasons.push(HARD_CONSTRAINT.OVER_BUDGET);
  } else if (isFiniteNonNegative(context.totalBudgetCents)) {
    passedConstraints.push(PASSED_CONSTRAINT.BUDGET);
  }

  if (!candidate.delivery
      || !isFiniteNonNegative(candidate.delivery.etaMinutes)
      || !isFiniteNonNegative(candidate.delivery.distanceMeters)) {
    reasons.push(HARD_CONSTRAINT.INVALID_DATA);
  } else {
    if (
      isFiniteNonNegative(context.maxDeliveryMinutes)
      && candidate.delivery.etaMinutes > context.maxDeliveryMinutes
    ) {
      reasons.push(HARD_CONSTRAINT.TOO_SLOW);
    } else if (isFiniteNonNegative(context.maxDeliveryMinutes)) {
      passedConstraints.push(PASSED_CONSTRAINT.DELIVERY);
    }

    if (
      isFiniteNonNegative(context.maxDistanceMeters)
      && candidate.delivery.distanceMeters > context.maxDistanceMeters
    ) {
      reasons.push(HARD_CONSTRAINT.TOO_FAR);
    } else if (isFiniteNonNegative(context.maxDistanceMeters)) {
      passedConstraints.push(PASSED_CONSTRAINT.DISTANCE);
    }
  }

  const updatedAtMs = Date.parse(candidate.dataUpdatedAt ?? '');
  const ageMs = nowMs - updatedAtMs;
  if (!Number.isFinite(updatedAtMs) || ageMs < -60_000) {
    reasons.push(HARD_CONSTRAINT.INVALID_DATA);
  } else if (ageMs > ttlMs) {
    reasons.push(HARD_CONSTRAINT.STALE);
  } else {
    passedConstraints.push(PASSED_CONSTRAINT.FRESH);
  }
}

/**
 * Apply safety and operational constraints without reading browser state.
 * Hard constraints are never relaxed here.
 *
 * @param {import('../domain/models.js').UserContext} context
 * @param {import('../domain/models.js').Candidate[]} candidates
 * @param {Date | string | number} now
 * @param {{ttlMs?: number}} options
 */
export function filterCandidates(context, candidates, now, options = {}) {
  const accepted = [];
  const rejected = [];
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const ttlMs = options.ttlMs ?? DEFAULT_DATA_TTL_MS;

  for (const candidate of candidates) {
    const reasons = [];
    const passedConstraints = [];

    if (!hasValidBaseShape(candidate) || !Number.isFinite(nowMs)) {
      rejected.push({ candidate, reasons: [HARD_CONSTRAINT.INVALID_DATA] });
      continue;
    }

    if (matchesExclusion(candidate, context.exclusions ?? [])) {
      reasons.push(HARD_CONSTRAINT.EXCLUSION);
    } else {
      passedConstraints.push(PASSED_CONSTRAINT.EXCLUSION);
    }

    if (candidate.sourceMode === SOURCE_MODE.LIVE) {
      evaluateLiveCandidate(context, candidate, nowMs, ttlMs, reasons, passedConstraints);
    } else if (candidate.sourceMode !== SOURCE_MODE.INSPIRATION) {
      reasons.push(HARD_CONSTRAINT.INVALID_DATA);
    }

    if (reasons.length > 0) {
      rejected.push({ candidate, reasons: [...new Set(reasons)] });
    } else {
      accepted.push({ candidate, passedConstraints });
    }
  }

  return { accepted, rejected };
}

export { PASSED_CONSTRAINT };
