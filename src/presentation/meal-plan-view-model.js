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
  const view = {
    missingDinerIds: Array.isArray(diagnostics.missingDinerIds)
      ? [...diagnostics.missingDinerIds]
      : [],
    degradedFrom: typeof diagnostics.degradedFrom === 'string' ? diagnostics.degradedFrom : null,
    reason: typeof diagnostics.reason === 'string' ? diagnostics.reason : null
  };
  return Number.isInteger(diagnostics.alternativeShortageCount)
    ? { ...view, alternativeShortageCount: Math.max(0, diagnostics.alternativeShortageCount) }
    : view;
}

function assignmentViews(assignments, mode, contextSummary) {
  return (assignments ?? []).map(({ dinerId, recommendation }, index) => ({
    dinerId,
    ownerLabel: `第 ${index + 1} 位`,
    card: card(recommendation, mode, contextSummary)
  }));
}

function bundleViews(items, mode, contextSummary) {
  return (items ?? []).map(({ role, recommendation }) => ({
    role,
    card: card(recommendation, mode, contextSummary)
  }));
}

function evidenceView(evidence = {}) {
  return {
    reasons: Array.isArray(evidence.reasons) ? [...evidence.reasons] : [],
    passedConstraints: Array.isArray(evidence.passedConstraints)
      ? [...evidence.passedConstraints]
      : [],
    tradeoffs: Array.isArray(evidence.tradeoffs) ? [...evidence.tradeoffs] : []
  };
}

function planSummaryView(direction) {
  if (!direction?.planKind || direction.planKind === 'single') return null;
  return {
    planId: direction.planId,
    title: direction.title,
    summary: direction.summary,
    ...evidenceView(direction.planEvidence)
  };
}

function alternativeView(direction, mode, contextSummary) {
  if (!direction?.planKind) return card(direction, mode, contextSummary);
  return {
    planId: direction.planId,
    kind: direction.planKind,
    title: direction.title,
    summary: direction.summary,
    differenceLabel: direction.differenceLabel,
    hero: card(direction.hero, mode, contextSummary),
    planSummary: planSummaryView(direction),
    bundleItems: bundleViews(direction.items, mode, contextSummary),
    assignments: assignmentViews(direction.dinerAssignments, mode, contextSummary),
    diagnostics: diagnosticsView(direction.diagnostics)
  };
}

export function createMealPlanViewModel({ plan, mode = 'inspiration', notices = [] }) {
  if (!plan || typeof plan !== 'object') {
    throw new TypeError('A meal plan is required.');
  }

  const contextSummary = plan.contextSummary ?? {};
  const primaryDirection = plan.primary ?? null;
  const primary = card(primaryDirection?.hero ?? primaryDirection, mode, contextSummary);
  const items = primaryDirection?.items ?? plan.items ?? [];
  const assignments = primaryDirection?.dinerAssignments ?? plan.dinerAssignments ?? [];

  return {
    kind: primaryDirection?.planKind ?? plan.kind,
    mode: modeView(mode, notices),
    partyLabel: partyLabel(contextSummary.partySize),
    sceneLabel: sceneLabel(contextSummary.mealScene),
    primary,
    planSummary: planSummaryView(primaryDirection),
    alternatives: (plan.alternatives ?? []).slice(0, 2).map((alternative) => (
      alternativeView(alternative, mode, contextSummary)
    )),
    bundleItems: bundleViews(items, mode, contextSummary),
    assignments: assignmentViews(assignments, mode, contextSummary),
    diagnostics: diagnosticsView(primaryDirection?.diagnostics ?? plan.diagnostics)
  };
}
