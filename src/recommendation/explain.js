import { REASON_CODE, SOURCE_MODE } from '../domain/models.js';

const REASON_MESSAGES = Object.freeze({
  [REASON_CODE.TASTE_MATCH]: '符合你的主要口味偏好',
  [REASON_CODE.WITHIN_BUDGET]: '已知总价在预算内',
  [REASON_CODE.FAST_DELIVERY]: '预计配送时间明显低于上限',
  [REASON_CODE.NEARBY]: '配送距离明显低于上限',
  [REASON_CODE.OPEN_NOW]: '门店当前营业',
  [REASON_CODE.AVAILABLE]: '菜品当前可售并可下单',
  [REASON_CODE.FRESH_DATA]: '实时数据仍在有效期内',
  [REASON_CODE.QUALITY]: '商家质量信息较好',
  [REASON_CODE.NEW_CHOICE]: '近期没有选择过这项',
  [REASON_CODE.CONTEXT_MATCH]: '符合你当前选择的用餐状态',
  [REASON_CODE.QUICK_RELIABLE_MATCH]: '这类菜做选择简单，也更符合快速解决的一餐',
  [REASON_CODE.FOCUS_FRIENDLY_MATCH]: '菜品口味相对平稳，也有适合专注时段的饱腹感',
  [REASON_CODE.TREAT_EXPRESSION_MATCH]: '菜品呈现更有表达感，适合给自己一点犒赏',
  [REASON_CODE.LATE_NIGHT_COMFORT_MATCH]: '菜品具备夜间和舒适口感的特点，选择也更省心',
  [REASON_CODE.LIGHTER_SCENE_MATCH]: '菜品标注偏清淡，搭配更轻盈',
  [REASON_CODE.SAVING_SCENE_MATCH]: '菜品结构更简单实在，符合节省一餐的选择倾向',
  [REASON_CODE.SHAREABLE_MATCH]: '菜品结构适合多人共享和搭配',
  [REASON_CODE.INDIVIDUAL_TASTE_MATCH]: '菜品方便按个人口味分别选择',
  [REASON_CODE.SAME_CUISINE_VARIETY]: '同一菜系下有多种菜品搭配方式',
  [REASON_CODE.FAMILY_TABLE_MATCH]: '菜品口味相对温和，也便于全家共享搭配',
  [REASON_CODE.CELEBRATION_EXPRESSION_MATCH]: '菜品呈现与组合更有仪式感，适合庆祝时搭配',
  [REASON_CODE.INSPIRATION_BUDGET_MATCH]: '静态菜品预算档符合你选择的预算倾向',
  [REASON_CODE.DINING_MODE_MATCH]: '菜品提供的用餐形式符合你选择的点餐方式'
});

const SCENARIO_REASON_CODES = new Set([
  REASON_CODE.QUICK_RELIABLE_MATCH,
  REASON_CODE.FOCUS_FRIENDLY_MATCH,
  REASON_CODE.TREAT_EXPRESSION_MATCH,
  REASON_CODE.LATE_NIGHT_COMFORT_MATCH,
  REASON_CODE.LIGHTER_SCENE_MATCH,
  REASON_CODE.SAVING_SCENE_MATCH,
  REASON_CODE.SHAREABLE_MATCH,
  REASON_CODE.INDIVIDUAL_TASTE_MATCH,
  REASON_CODE.SAME_CUISINE_VARIETY,
  REASON_CODE.FAMILY_TABLE_MATCH,
  REASON_CODE.CELEBRATION_EXPRESSION_MATCH
]);

const TRADEOFF_MESSAGES = Object.freeze({
  live_data_unavailable: '当前是菜品灵感，无法确认实时价格、距离或配送时间',
  delivery_near_limit: '预计配送时间接近你的上限',
  distance_near_limit: '配送距离接近你的上限',
  budget_near_limit: '已知总价接近你的预算上限',
  estimated_total: '总价仍包含估算或未知费用',
  taste_tradeoff: '与主要口味偏好的匹配较弱'
});

function addReason(reasons, code) {
  reasons.push({ code, message: REASON_MESSAGES[code] });
}

function addTradeoff(tradeoffs, code) {
  tradeoffs.push({ code, message: TRADEOFF_MESSAGES[code] });
}

function isNearLimit(value, limit) {
  return Number.isFinite(value)
    && Number.isFinite(limit)
    && limit > 0
    && value > limit * 0.8;
}

/**
 * Convert actual score contributions and passed hard constraints into user-safe
 * reasons. A field is never described as satisfied unless filtering proved it.
 *
 * @param {import('../domain/models.js').UserContext} context
 * @param {import('../domain/models.js').ScoredCandidate & {weights?: Record<string, number>}} scored
 * @param {string[]} passedConstraints
 */
export function explainRecommendation(context, scored, passedConstraints) {
  const { candidate, components } = scored;
  const evidence = scored.evidence;
  const passed = new Set(passedConstraints);
  const reasons = [];
  const tradeoffs = [];

  if (components.taste >= 0.7) addReason(reasons, REASON_CODE.TASTE_MATCH);
  if (components.context === 1) addReason(reasons, REASON_CODE.CONTEXT_MATCH);
  if (components.quality >= 0.8) addReason(reasons, REASON_CODE.QUALITY);
  if (components.novelty === 1) addReason(reasons, REASON_CODE.NEW_CHOICE);

  if (SCENARIO_REASON_CODES.has(evidence?.sceneReasonCode)) {
    addReason(reasons, evidence.sceneReasonCode);
  }
  if (evidence?.inspirationBudgetMatched === true) {
    addReason(reasons, REASON_CODE.INSPIRATION_BUDGET_MATCH);
  }
  if (evidence?.diningModeMatched === true) {
    addReason(reasons, REASON_CODE.DINING_MODE_MATCH);
  }

  if (passed.has('within_budget') && candidate.sourceMode !== SOURCE_MODE.INSPIRATION) {
    addReason(reasons, REASON_CODE.WITHIN_BUDGET);
  }
  if (passed.has('open')) addReason(reasons, REASON_CODE.OPEN_NOW);
  if (passed.has('available') && passed.has('orderable')) {
    addReason(reasons, REASON_CODE.AVAILABLE);
  }
  if (passed.has('fresh')) addReason(reasons, REASON_CODE.FRESH_DATA);

  if (passed.has('within_eta')) {
    if (isNearLimit(candidate.delivery?.etaMinutes, context.maxDeliveryMinutes)) {
      addTradeoff(tradeoffs, 'delivery_near_limit');
    } else {
      addReason(reasons, REASON_CODE.FAST_DELIVERY);
    }
  }

  if (passed.has('within_distance')) {
    if (isNearLimit(candidate.delivery?.distanceMeters, context.maxDistanceMeters)) {
      addTradeoff(tradeoffs, 'distance_near_limit');
    } else {
      addReason(reasons, REASON_CODE.NEARBY);
    }
  }

  if (passed.has('within_budget') && isNearLimit(
    candidate.pricing?.totalCents,
    context.totalBudgetCents
  )) {
    addTradeoff(tradeoffs, 'budget_near_limit');
  }

  if (candidate.pricing?.isEstimate || candidate.pricing?.unknownFeeLabels?.length > 0) {
    addTradeoff(tradeoffs, 'estimated_total');
  }

  if ((context.tastePreferences ?? []).length > 0 && components.taste < 0.4) {
    addTradeoff(tradeoffs, 'taste_tradeoff');
  }

  if (candidate.sourceMode === SOURCE_MODE.INSPIRATION) {
    addTradeoff(tradeoffs, 'live_data_unavailable');
  }

  const matchLevel = tradeoffs.length > 0
    ? 'tradeoff'
    : scored.score >= 75
      ? 'very_good'
      : scored.score >= 55
        ? 'good'
        : 'tradeoff';

  return {
    matchLevel,
    reasonCodes: reasons.map(({ code }) => code),
    reasons,
    tradeoffs,
    passedConstraints: [...passedConstraints]
  };
}
