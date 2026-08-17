/**
 * @typedef {'live' | 'inspiration'} SourceMode
 */

/**
 * @typedef {'balanced' | 'fastest' | 'cheapest' | 'comfort' | 'lighter' | 'novelty'} CurrentPriority
 */

/**
 * @typedef {Object} UserContext
 * @property {number | null} totalBudgetCents
 * @property {number | null} maxDeliveryMinutes
 * @property {number | null} maxDistanceMeters
 * @property {number} partySize
 * @property {string[]} tastePreferences
 * @property {string[]} exclusions
 * @property {CurrentPriority} currentPriority
 * @property {string[]} recentHistory
 * @property {string[]} contextTags
 */

/**
 * @typedef {Object} Candidate
 * @property {string} id
 * @property {SourceMode} sourceMode
 * @property {{id: string, name: string, rating: number | null, ratingCount: number | null, isOpen: boolean | null} | null} store
 * @property {{id: string, name: string, description: string, imageUrl: string | null, tasteTags: string[], categoryTags: string[], allergenTags: string[], ingredientTags: string[], isAvailable: boolean | null}} item
 * @property {{totalCents: number, isEstimate?: boolean, unknownFeeLabels?: string[]} | null} pricing
 * @property {{distanceMeters: number, etaMinutes: number} | null} delivery
 * @property {{isOrderable: boolean, reason?: string | null} | null} availability
 * @property {string | null} dataUpdatedAt
 * @property {Record<string, unknown>} metadata
 */

/**
 * @typedef {Object} ScoredCandidate
 * @property {Candidate} candidate
 * @property {number} score
 * @property {Record<string, number>} components
 */

/**
 * @typedef {Object} Recommendation
 * @property {Candidate} candidate
 * @property {number} score
 * @property {'very_good' | 'good' | 'tradeoff'} matchLevel
 * @property {string[]} reasonCodes
 * @property {{code: string, message: string}[]} reasons
 * @property {{code: string, message: string}[]} tradeoffs
 * @property {string[]} passedConstraints
 */

export const SOURCE_MODE = Object.freeze({
  LIVE: 'live',
  INSPIRATION: 'inspiration'
});

export const CURRENT_PRIORITY = Object.freeze({
  BALANCED: 'balanced',
  FASTEST: 'fastest',
  CHEAPEST: 'cheapest',
  COMFORT: 'comfort',
  LIGHTER: 'lighter',
  NOVELTY: 'novelty'
});

export const DEFAULT_DATA_TTL_MS = 5 * 60 * 1000;

export const HARD_CONSTRAINT = Object.freeze({
  EXCLUSION: 'exclusion',
  OVER_BUDGET: 'over_budget',
  CLOSED: 'closed',
  UNAVAILABLE: 'unavailable',
  NOT_ORDERABLE: 'not_orderable',
  TOO_FAR: 'too_far',
  TOO_SLOW: 'too_slow',
  STALE: 'stale',
  INVALID_DATA: 'invalid_data'
});

export const REASON_CODE = Object.freeze({
  TASTE_MATCH: 'taste_match',
  WITHIN_BUDGET: 'within_budget',
  FAST_DELIVERY: 'fast_delivery',
  NEARBY: 'nearby',
  OPEN_NOW: 'open_now',
  AVAILABLE: 'available',
  FRESH_DATA: 'fresh_data',
  QUALITY: 'quality',
  NEW_CHOICE: 'new_choice',
  CONTEXT_MATCH: 'context_match'
});
