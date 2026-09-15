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
 * @property {'1' | '2' | '3' | '4_plus'} partySizeBucket
 * @property {'solo_quick' | 'solo_focus' | 'solo_treat' | 'solo_late_night' | 'solo_lighter' | 'solo_save' | 'group_gathering' | 'group_individual' | 'group_mixed_taste' | 'group_family' | 'group_celebration' | null} mealScene
 * @property {'shared' | 'individual' | 'shared_main_personal' | 'undecided' | null} diningMode
 * @property {'economy' | 'everyday' | 'generous' | 'open' | null} inspirationBudgetTier
 * @property {{id: string, tastePreferences: string[], exclusions: string[]}[]} dinerProfiles
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
 * @property {string | null} orderUrl
 * @property {string | null} dataUpdatedAt
 * @property {Record<string, unknown>} metadata
 */

/**
 * @typedef {Object} ScoredCandidate
 * @property {Candidate} candidate
 * @property {number} score
 * @property {Record<string, number>} components
 * @property {{sceneReasonCode: string | null, inspirationBudgetMatched: boolean, diningModeMatched: boolean, matchedTraits: string[], taste?: {scope: 'single' | 'individual' | 'group', matchedPreferences: string[], unmatchedPreferences: string[], matchedDinerCount: number, preferenceDinerCount: number}} | undefined} [evidence]
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
 * @property {ScoredCandidate['evidence']} [evidence]
 */

/**
 * @typedef {Object} PlanEvidence
 * @property {{code: string, message: string}[]} reasons
 * @property {string[]} passedConstraints
 * @property {{code: string, message: string}[]} tradeoffs
 */

/**
 * A complete selectable direction. `hero` is also spread onto the direction
 * for compatibility with existing Recommendation consumers.
 * @typedef {Recommendation & Object} MealPlanDirection
 * @property {string} planId
 * @property {'single' | 'shared_bundle' | 'individual_set' | 'same_cuisine_set' | 'compromise'} planKind
 * @property {string} title
 * @property {string} summary
 * @property {string | null} differenceLabel
 * @property {Recommendation} hero
 * @property {{role: string, recommendation: Recommendation}[]} items
 * @property {{dinerId: string, recommendation: Recommendation | null}[]} dinerAssignments
 * @property {PlanEvidence} planEvidence
 * @property {{missingDinerIds: string[], degradedFrom: string | null, reason: string | null, alternativeShortageCount?: number}} diagnostics
 */

/**
 * @typedef {Object} MealPlan
 * @property {'single' | 'shared_bundle' | 'individual_set' | 'same_cuisine_set' | 'compromise'} kind
 * @property {MealPlanDirection | null} primary
 * @property {MealPlanDirection[]} alternatives
 * @property {MealPlanDirection['items']} items
 * @property {MealPlanDirection['dinerAssignments']} dinerAssignments
 * @property {{partySize: number, mealScene: string | null, diningMode: string | null}} contextSummary
 * @property {MealPlanDirection['diagnostics']} diagnostics
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
  CONTEXT_MATCH: 'context_match',
  QUICK_RELIABLE_MATCH: 'quick_reliable_match',
  FOCUS_FRIENDLY_MATCH: 'focus_friendly_match',
  TREAT_EXPRESSION_MATCH: 'treat_expression_match',
  LATE_NIGHT_COMFORT_MATCH: 'late_night_comfort_match',
  LIGHTER_SCENE_MATCH: 'lighter_scene_match',
  SAVING_SCENE_MATCH: 'saving_scene_match',
  SHAREABLE_MATCH: 'shareable_match',
  INDIVIDUAL_CHOICE_MATCH: 'individual_choice_match',
  INDIVIDUAL_TASTE_MATCH: 'individual_taste_match',
  GROUP_TASTE_COVERAGE: 'group_taste_coverage',
  SAME_CUISINE_VARIETY: 'same_cuisine_variety',
  FAMILY_TABLE_MATCH: 'family_table_match',
  CELEBRATION_EXPRESSION_MATCH: 'celebration_expression_match',
  INSPIRATION_BUDGET_MATCH: 'inspiration_budget_match',
  DINING_MODE_MATCH: 'dining_mode_match'
});
