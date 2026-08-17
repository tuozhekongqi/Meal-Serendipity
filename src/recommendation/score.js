import { CURRENT_PRIORITY } from '../domain/models.js';

export const SCORE_WEIGHTS = Object.freeze({
  [CURRENT_PRIORITY.BALANCED]: Object.freeze({
    taste: 25,
    delivery: 20,
    context: 15,
    budget: 15,
    distance: 10,
    quality: 10,
    novelty: 5
  }),
  [CURRENT_PRIORITY.FASTEST]: Object.freeze({
    taste: 15,
    delivery: 35,
    context: 10,
    budget: 5,
    distance: 20,
    quality: 10,
    novelty: 5
  }),
  [CURRENT_PRIORITY.CHEAPEST]: Object.freeze({
    taste: 15,
    delivery: 10,
    context: 10,
    budget: 40,
    distance: 10,
    quality: 10,
    novelty: 5
  }),
  [CURRENT_PRIORITY.COMFORT]: Object.freeze({
    taste: 40,
    delivery: 10,
    context: 25,
    budget: 10,
    distance: 5,
    quality: 5,
    novelty: 5
  }),
  [CURRENT_PRIORITY.LIGHTER]: Object.freeze({
    taste: 25,
    delivery: 15,
    context: 35,
    budget: 10,
    distance: 5,
    quality: 5,
    novelty: 5
  }),
  [CURRENT_PRIORITY.NOVELTY]: Object.freeze({
    taste: 20,
    delivery: 15,
    context: 10,
    budget: 10,
    distance: 10,
    quality: 10,
    novelty: 25
  })
});

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function tasteComponent(context, candidate) {
  const preferences = context.tastePreferences ?? [];
  if (preferences.length === 0) return 0.5;

  const tags = new Set(candidate.item.tasteTags ?? []);
  const strengths = [1, 0.7, 0.4];
  for (let index = 0; index < preferences.length; index += 1) {
    if (tags.has(preferences[index])) return strengths[index] ?? 0.25;
  }
  return 0;
}

function inverseLimitComponent(value, limit) {
  if (!Number.isFinite(value) || !Number.isFinite(limit) || limit <= 0) return 0.5;
  return clamp01(1 - value / limit);
}

function contextComponent(context, candidate) {
  const desired = context.contextTags ?? [];
  if (desired.length === 0) return 0.5;
  const candidateTags = new Set(candidate.metadata?.contextTags ?? []);
  return desired.some((tag) => candidateTags.has(tag)) ? 1 : 0;
}

function qualityComponent(candidate) {
  if (Number.isFinite(candidate.store?.rating)) {
    return clamp01(candidate.store.rating / 5);
  }
  if (candidate.metadata?.popularity === 'mainstream') return 0.7;
  if (candidate.metadata?.popularity === 'niche') return 0.5;
  return 0.5;
}

function noveltyComponent(context, candidate) {
  const history = new Set(context.recentHistory ?? []);
  return history.has(candidate.id) || history.has(candidate.item.name) ? 0 : 1;
}

function round(value, precision = 4) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

/**
 * Score one already-eligible candidate. Components are normalized to 0..1;
 * the public score is 0..100 and contains no browser or time dependencies.
 *
 * @param {import('../domain/models.js').UserContext} context
 * @param {import('../domain/models.js').Candidate} candidate
 */
export function scoreCandidate(context, candidate) {
  const weights = SCORE_WEIGHTS[context.currentPriority] ?? SCORE_WEIGHTS.balanced;
  const components = {
    taste: tasteComponent(context, candidate),
    delivery: inverseLimitComponent(
      candidate.delivery?.etaMinutes,
      context.maxDeliveryMinutes
    ),
    context: contextComponent(context, candidate),
    budget: inverseLimitComponent(
      candidate.pricing?.totalCents,
      context.totalBudgetCents
    ),
    distance: inverseLimitComponent(
      candidate.delivery?.distanceMeters,
      context.maxDistanceMeters
    ),
    quality: qualityComponent(candidate),
    novelty: noveltyComponent(context, candidate)
  };

  const score = Object.entries(weights).reduce(
    (total, [key, weight]) => total + components[key] * weight,
    0
  );

  return {
    candidate,
    score: round(score),
    components: Object.fromEntries(
      Object.entries(components).map(([key, value]) => [key, round(value)])
    ),
    weights
  };
}

/**
 * Rank candidates deterministically. Random exploration is opt-in and must be
 * supplied by the caller so tests and default recommendations stay repeatable.
 *
 * @param {import('../domain/models.js').UserContext} context
 * @param {import('../domain/models.js').Candidate[]} candidates
 * @param {{exploration?: number, random?: () => number}} options
 */
export function rankCandidates(context, candidates, options = {}) {
  const exploration = Number.isFinite(options.exploration)
    ? Math.max(0, options.exploration)
    : 0;
  if (exploration > 0 && typeof options.random !== 'function') {
    throw new TypeError('rankCandidates requires options.random when exploration is enabled');
  }
  const random = options.random;

  return candidates
    .map((candidate) => {
      const scored = scoreCandidate(context, candidate);
      const jitter = exploration > 0 ? (random() - 0.5) * exploration : 0;
      return { ...scored, score: round(scored.score + jitter) };
    })
    .sort((left, right) => (
      right.score - left.score
      || left.candidate.id.localeCompare(right.candidate.id, 'zh-CN')
    ));
}
