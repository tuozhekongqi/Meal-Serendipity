import { SOURCE_MODE } from '../domain/models.js';
import { explainRecommendation } from './explain.js';
import { filterCandidates } from './filter.js';
import { rankCandidates } from './score.js';

function countRejectedReasons(rejected) {
  const counts = {};
  for (const { reasons } of rejected) {
    for (const reason of reasons) counts[reason] = (counts[reason] ?? 0) + 1;
  }
  return counts;
}

function buildRecommendation(context, scored, passedConstraints) {
  return {
    ...scored,
    ...explainRecommendation(context, scored, passedConstraints)
  };
}

/**
 * Filter, rank and explain candidates without reading DOM, storage, network,
 * system time or ambient randomness.
 *
 * @param {import('../domain/models.js').UserContext} context
 * @param {import('../domain/models.js').Candidate[]} candidates
 * @param {{now?: Date | string | number, alternativeLimit?: number, ttlMs?: number, exploration?: number, random?: () => number}} options
 */
export function recommend(context, candidates, options = {}) {
  if (options.now === undefined || options.now === null) {
    throw new TypeError('recommend requires options.now to keep time deterministic');
  }

  const filtered = filterCandidates(context, candidates, options.now, {
    ttlMs: options.ttlMs
  });
  const constraintsByCandidate = new Map(
    filtered.accepted.map(({ candidate, passedConstraints }) => [candidate, passedConstraints])
  );
  const ranked = rankCandidates(
    context,
    filtered.accepted.map(({ candidate }) => candidate),
    { exploration: options.exploration, random: options.random }
  );
  const enriched = ranked.map((scored) => buildRecommendation(
    context,
    scored,
    constraintsByCandidate.get(scored.candidate) ?? []
  ));
  const alternativeLimit = Number.isInteger(options.alternativeLimit)
    ? Math.max(0, options.alternativeLimit)
    : 2;
  const hasLiveInput = candidates.some(({ sourceMode }) => sourceMode === SOURCE_MODE.LIVE);

  return {
    primary: enriched[0] ?? null,
    alternatives: enriched.slice(1, alternativeLimit + 1),
    rejected: filtered.rejected,
    diagnostics: {
      inputCount: candidates.length,
      eligibleCount: enriched.length,
      rejectedCount: filtered.rejected.length,
      rejectedByReason: countRejectedReasons(filtered.rejected),
      fallback: enriched.length === 0
        ? {
            required: true,
            targetMode: hasLiveInput ? SOURCE_MODE.INSPIRATION : null,
            reason: 'no_eligible_candidates'
          }
        : null
    }
  };
}
