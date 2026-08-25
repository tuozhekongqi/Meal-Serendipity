import { createUserContext } from '../services/context.js';
import {
  DINING_MODE,
  INSPIRATION_BUDGET_TIER,
  PARTY_SIZE_BUCKET,
  getDiningModesForScene,
  getScenesForPartySize
} from '../domain/scenarios.js';

export const FLOW_STEP = Object.freeze({
  PARTY: 'party',
  SCENE: 'scene',
  DINING: 'dining',
  PREFERENCES: 'preferences',
  RESULT: 'result'
});

const BUDGET_TIERS = new Set(Object.values(INSPIRATION_BUDGET_TIER));
const DINING_MODES = new Set(Object.values(DINING_MODE));

function normalizePartySize(value, fallback = null) {
  const partySize = Number(value);
  return Number.isInteger(partySize) && partySize >= 1 && partySize <= 50 ? partySize : fallback;
}

function partySizeBucketFor(partySize) {
  if (partySize === null) return null;
  if (partySize === 1) return PARTY_SIZE_BUCKET.ONE;
  if (partySize === 2) return PARTY_SIZE_BUCKET.TWO;
  if (partySize === 3) return PARTY_SIZE_BUCKET.THREE;
  return PARTY_SIZE_BUCKET.FOUR_PLUS;
}

function normalizeList(value, limit) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean))]
    .slice(0, limit);
}

function normalizeDraft(draft, index) {
  return {
    id: `diner-${index + 1}`,
    tastePreferences: normalizeList(draft?.tastePreferences ?? draft?.tastes, 3),
    exclusions: normalizeList(draft?.exclusions, 30)
  };
}

function createDinerDrafts(partySize, drafts = []) {
  const count = Number.isInteger(partySize) && partySize > 0 ? partySize : 0;
  return Array.from({ length: count }, (_, index) => normalizeDraft(drafts[index], index));
}

function sceneIsAvailable(mealScene, partySize) {
  return partySize !== null
    && getScenesForPartySize(partySize).some(({ value }) => value === mealScene);
}

function diningModeIsAvailable(diningMode, mealScene) {
  return DINING_MODES.has(diningMode)
    && getDiningModesForScene(mealScene).some(({ value }) => value === diningMode);
}

function editing(state, patch = {}) {
  return { ...state, ...patch, status: 'editing', result: null };
}

function validStep(step, state) {
  return getVisibleSteps(state).includes(step) ? step : state.step;
}

export function createFlowState(restoredPreferences = {}) {
  const partySize = normalizePartySize(restoredPreferences.partySize);
  const mealScene = sceneIsAvailable(restoredPreferences.mealScene, partySize)
    ? restoredPreferences.mealScene
    : null;
  const diningMode = mealScene && diningModeIsAvailable(restoredPreferences.diningMode, mealScene)
    ? restoredPreferences.diningMode
    : null;

  return {
    step: FLOW_STEP.PARTY,
    status: 'editing',
    result: null,
    locale: typeof restoredPreferences.locale === 'string' ? restoredPreferences.locale : 'zh-CN',
    location: restoredPreferences.location ?? null,
    partySize,
    partySizeBucket: partySizeBucketFor(partySize),
    mealScene,
    diningMode,
    inspirationBudgetTier: BUDGET_TIERS.has(restoredPreferences.inspirationBudgetTier)
      ? restoredPreferences.inspirationBudgetTier
      : null,
    totalBudgetCents: restoredPreferences.totalBudgetCents ?? null,
    maxDistanceMeters: restoredPreferences.maxDistanceMeters ?? null,
    maxDeliveryMinutes: restoredPreferences.maxDeliveryMinutes ?? null,
    tastePreferences: partySize === 1
      ? normalizeList(restoredPreferences.tastePreferences ?? restoredPreferences.tastes, 10)
      : [],
    exclusions: [],
    currentPriority: restoredPreferences.currentPriority ?? 'balanced',
    recentHistory: normalizeList(restoredPreferences.recentHistory, 20),
    contextTags: normalizeList(restoredPreferences.contextTags, 10),
    dinerDrafts: createDinerDrafts(partySize, restoredPreferences.dinerDrafts)
  };
}

export function getVisibleSteps(state) {
  if (state.partySize === null) return [FLOW_STEP.PARTY];
  return state.partySize === 1
    ? [FLOW_STEP.PARTY, FLOW_STEP.SCENE, FLOW_STEP.PREFERENCES]
    : [FLOW_STEP.PARTY, FLOW_STEP.SCENE, FLOW_STEP.DINING, FLOW_STEP.PREFERENCES];
}

function selectPartySize(state, event) {
  const partySize = normalizePartySize(event.partySize, state.partySize);
  const changedAudience = (state.partySize === 1) !== (partySize === 1);
  const dinerDrafts = createDinerDrafts(partySize, state.dinerDrafts);
  return editing(state, {
    step: FLOW_STEP.PARTY,
    partySize,
    partySizeBucket: partySizeBucketFor(partySize),
    mealScene: changedAudience ? null : state.mealScene,
    diningMode: changedAudience ? null : state.diningMode,
    tastePreferences: partySize === 1
      ? [...(dinerDrafts[0]?.tastePreferences ?? state.tastePreferences)]
      : [],
    dinerDrafts
  });
}

function selectScene(state, mealScene) {
  const selectedScene = sceneIsAvailable(mealScene, state.partySize) ? mealScene : null;
  return editing(state, {
    mealScene: selectedScene,
    diningMode: selectedScene && diningModeIsAvailable(state.diningMode, selectedScene)
      ? state.diningMode
      : null
  });
}

function selectDiningMode(state, diningMode) {
  return editing(state, {
    diningMode: state.partySize > 1 && diningModeIsAvailable(diningMode, state.mealScene)
      ? diningMode
      : null
  });
}

function updateDinerDraft(state, event) {
  const dinerId = event.dinerId ?? event.id;
  const dinerDrafts = state.dinerDrafts.map((draft) => {
    if (draft.id !== dinerId) return draft;
    return {
      ...draft,
      tastePreferences: event.tastePreferences === undefined
        ? draft.tastePreferences
        : normalizeList(event.tastePreferences, 3),
      exclusions: event.exclusions === undefined ? draft.exclusions : normalizeList(event.exclusions, 30)
    };
  });
  const patch = { dinerDrafts };
  if (state.partySize === 1 && dinerDrafts[0]?.id === dinerId) {
    if (event.tastePreferences !== undefined) {
      patch.tastePreferences = [...dinerDrafts[0].tastePreferences];
    }
    if (event.exclusions !== undefined) {
      patch.exclusions = [...dinerDrafts[0].exclusions];
    }
  }
  return editing(state, patch);
}

function moveRelative(state, direction) {
  if (state.step === FLOW_STEP.RESULT) {
    return direction < 0 ? editing(state, { step: FLOW_STEP.PREFERENCES }) : state;
  }
  const steps = getVisibleSteps(state);
  const index = Math.max(0, steps.indexOf(state.step));
  return editing(state, { step: steps[Math.max(0, Math.min(steps.length - 1, index + direction))] });
}

export function transitionFlow(state, event = {}) {
  switch (event.type) {
    case 'select_party_size':
      return selectPartySize(state, event);
    case 'select_scene':
      return selectScene(state, event.mealScene);
    case 'select_dining_mode':
      return selectDiningMode(state, event.diningMode);
    case 'set_budget':
      return editing(state, { inspirationBudgetTier: BUDGET_TIERS.has(event.value) ? event.value : null });
    case 'set_tastes':
      return editing(state, {
        tastePreferences: state.partySize === 1 ? normalizeList(event.value, 10) : []
      });
    case 'set_exclusions':
      return editing(state, { exclusions: normalizeList(event.value, 30) });
    case 'update_diner_draft':
    case 'set_diner_draft':
      return updateDinerDraft(state, event);
    case 'back':
      return moveRelative(state, -1);
    case 'next':
      return moveRelative(state, 1);
    case 'edit_step':
      return editing(state, { step: validStep(event.step, state) });
    case 'request_started':
    case 'retry':
      return { ...state, step: FLOW_STEP.RESULT, status: 'loading', result: null };
    case 'request_succeeded':
      return { ...state, step: FLOW_STEP.RESULT, status: 'success', result: event.result ?? null };
    case 'request_empty':
      return { ...state, step: FLOW_STEP.RESULT, status: 'empty', result: null };
    case 'request_failed':
      return { ...state, step: FLOW_STEP.RESULT, status: 'error', result: null };
    default:
      return state;
  }
}

export function createContextInputFromFlow(state) {
  return createUserContext({
    locale: state.locale,
    location: state.location,
    partySize: state.partySize,
    partySizeBucket: state.partySizeBucket,
    mealScene: state.mealScene,
    diningMode: state.diningMode,
    inspirationBudgetTier: state.inspirationBudgetTier,
    totalBudgetCents: state.totalBudgetCents,
    maxDistanceMeters: state.maxDistanceMeters,
    maxDeliveryMinutes: state.maxDeliveryMinutes,
    tastePreferences: state.partySize === 1 ? state.tastePreferences : [],
    exclusions: state.exclusions,
    currentPriority: state.currentPriority,
    recentHistory: state.recentHistory,
    contextTags: state.contextTags,
    dinerProfiles: state.dinerDrafts
  });
}
