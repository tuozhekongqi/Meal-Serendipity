import { SCENE_CATALOG } from '../domain/scenarios.js';
import { createRecommendationViewModel } from './recommendation-view-model.js';

function modeView(mode, notices = []) {
  const safeMode = mode === 'live' ? 'live' : 'inspiration';
  const seen = new Set();
  return {
    value: safeMode,
    label: safeMode === 'live' ? '实时推荐' : '菜品灵感',
    notices: notices.filter((notice) => {
      const key = `${notice?.code ?? ''}:${notice?.message ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return Boolean(notice?.message);
    })
  };
}

function partyLabel(partySize) {
  return Number.isInteger(partySize) && partySize > 0 ? `${partySize} 人用餐` : null;
}

function sceneLabel(mealScene) {
  return SCENE_CATALOG.find(({ value }) => value === mealScene)?.label ?? null;
}

function card(recommendation, mode, contextSummary) {
  if (recommendation === null || recommendation === undefined) return null;
  return createRecommendationViewModel({
    recommendation,
    mode,
    notices: [],
    partySize: contextSummary.partySize,
    mealScene: contextSummary.mealScene
  }).primary;
}

function diagnosticsView(diagnostics = {}) {
  return {
    missingDinerIds: Array.isArray(diagnostics.missingDinerIds)
      ? [...diagnostics.missingDinerIds]
      : [],
    degradedFrom: typeof diagnostics.degradedFrom === 'string' ? diagnostics.degradedFrom : null,
    reason: typeof diagnostics.reason === 'string' ? diagnostics.reason : null
  };
}

export function createMealPlanViewModel({ plan, mode = 'inspiration', notices = [] }) {
  if (!plan || typeof plan !== 'object') {
    throw new TypeError('A meal plan is required.');
  }

  const contextSummary = plan.contextSummary ?? {};
  const primary = card(plan.primary, mode, contextSummary);
  const alternatives = (plan.alternatives ?? []).slice(0, 2).map((alternative) => card(
    alternative,
    mode,
    contextSummary
  ));

  return {
    kind: plan.kind,
    mode: modeView(mode, notices),
    partyLabel: partyLabel(contextSummary.partySize),
    sceneLabel: sceneLabel(contextSummary.mealScene),
    primary,
    alternatives,
    bundleItems: (plan.items ?? []).map(({ role, recommendation }) => ({
      role,
      card: card(recommendation, mode, contextSummary)
    })),
    assignments: (plan.dinerAssignments ?? []).map(({ dinerId, recommendation }, index) => ({
      dinerId,
      ownerLabel: `第 ${index + 1} 位`,
      card: card(recommendation, mode, contextSummary)
    })),
    diagnostics: diagnosticsView(plan.diagnostics)
  };
}
