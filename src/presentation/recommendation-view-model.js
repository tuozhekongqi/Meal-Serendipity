const LIVE_TRADEOFF_BY_METRIC = Object.freeze({
  price: new Set(['budget_near_limit', 'estimated_total']),
  eta: new Set(['delivery_near_limit']),
  distance: new Set(['distance_near_limit'])
});

function uniqueNotices(notices = []) {
  const seen = new Set();
  return notices.filter((notice) => {
    const key = `${notice?.code ?? ''}:${notice?.message ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(notice?.message);
  });
}

function hasTradeoff(recommendation, codes) {
  return (recommendation.tradeoffs ?? []).some(({ code }) => codes.has(code));
}

function money(cents) {
  const value = cents / 100;
  return `¥${Number.isInteger(value) ? value : value.toFixed(2)}`;
}

function distance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const value = meters / 1000;
  return `${Number.isInteger(value) ? value : value.toFixed(1)} km`;
}

function liveMetrics(recommendation) {
  const { candidate } = recommendation;
  const metrics = [];
  if (Number.isFinite(candidate.pricing?.totalCents)) {
    metrics.push({
      key: 'price',
      label: candidate.pricing.isEstimate ? '预估总价' : '已知总价',
      value: money(candidate.pricing.totalCents),
      status: hasTradeoff(recommendation, LIVE_TRADEOFF_BY_METRIC.price) ? 'tradeoff' : 'passed'
    });
  }
  if (Number.isFinite(candidate.delivery?.etaMinutes)) {
    metrics.push({
      key: 'eta',
      label: '预计送达',
      value: `${candidate.delivery.etaMinutes} 分钟`,
      status: hasTradeoff(recommendation, LIVE_TRADEOFF_BY_METRIC.eta) ? 'tradeoff' : 'passed'
    });
  }
  if (Number.isFinite(candidate.delivery?.distanceMeters)) {
    metrics.push({
      key: 'distance',
      label: '距离',
      value: distance(candidate.delivery.distanceMeters),
      status: hasTradeoff(recommendation, LIVE_TRADEOFF_BY_METRIC.distance) ? 'tradeoff' : 'passed'
    });
  }
  return metrics;
}

function inspirationRunway(recommendation) {
  const runway = [];
  if (recommendation.passedConstraints?.includes('exclusion')) {
    runway.push({ label: '忌口检查', value: '已避开', status: 'passed' });
  }
  if (recommendation.reasonCodes?.includes('taste_match')) {
    runway.push({ label: '口味方向', value: '匹配', status: 'passed' });
  }
  if (recommendation.reasonCodes?.includes('context_match')) {
    runway.push({ label: '当前状态', value: '匹配', status: 'passed' });
  }
  if (recommendation.reasonCodes?.includes('new_choice')) {
    runway.push({ label: '近期选择', value: '不重复', status: 'passed' });
  }
  return runway;
}

function liveRunway(recommendation) {
  const labels = {
    exclusion: ['忌口检查', '已避开'],
    open: ['营业状态', '营业中'],
    available: ['菜品状态', '可售'],
    orderable: ['下单状态', '可下单'],
    within_budget: ['预算', '范围内'],
    within_eta: ['配送时间', '范围内'],
    within_distance: ['距离', '范围内'],
    fresh: ['数据状态', '有效']
  };
  return (recommendation.passedConstraints ?? [])
    .filter((constraint) => labels[constraint])
    .map((constraint) => ({
      label: labels[constraint][0],
      value: labels[constraint][1],
      status: 'passed'
    }));
}

function actionFor(mode, candidate) {
  if (mode === 'live' && candidate.availability?.isOrderable === true && candidate.orderUrl) {
    return { kind: 'order', label: '去下单', url: candidate.orderUrl };
  }
  return { kind: 'copy', label: '复制菜名' };
}

function toCard(recommendation, mode) {
  const candidate = recommendation.candidate;
  return {
    id: candidate.id,
    name: candidate.item.name,
    description: candidate.item.description,
    tags: [...new Set([
      ...(candidate.item.categoryTags ?? []),
      ...(candidate.item.tasteTags ?? [])
    ])].slice(0, 4),
    storeName: mode === 'live' ? candidate.store?.name ?? null : null,
    metrics: mode === 'live' ? liveMetrics(recommendation) : [],
    runway: mode === 'live' ? liveRunway(recommendation) : inspirationRunway(recommendation),
    reasons: [...(recommendation.reasons ?? [])],
    tradeoffs: [...(recommendation.tradeoffs ?? [])],
    action: actionFor(mode, candidate)
  };
}

function sharesAny(left = [], right = []) {
  const values = new Set(left);
  return right.some((value) => values.has(value));
}

function inspirationDifference(primary, alternative) {
  if (!sharesAny(primary.item.categoryTags, alternative.item.categoryTags)) return '换个方向';
  if (!sharesAny(primary.item.tasteTags, alternative.item.tasteTags)) return '换个口味';
  return '另一个合适选择';
}

function liveDifference(primary, alternative) {
  if (
    Number.isFinite(primary.delivery?.etaMinutes)
    && Number.isFinite(alternative.delivery?.etaMinutes)
    && alternative.delivery.etaMinutes < primary.delivery.etaMinutes
  ) return '更快送达';
  if (
    Number.isFinite(primary.pricing?.totalCents)
    && Number.isFinite(alternative.pricing?.totalCents)
    && alternative.pricing.totalCents < primary.pricing.totalCents
  ) return '更便宜';
  return '另一个合适选择';
}

export function createRecommendationViewModel({
  recommendation,
  alternatives = [],
  mode = recommendation?.candidate?.sourceMode ?? 'inspiration',
  notices = []
}) {
  if (!recommendation?.candidate?.item) {
    throw new TypeError('A recommendation with a candidate item is required.');
  }
  const safeMode = mode === 'live' ? 'live' : 'inspiration';
  const primaryCandidate = recommendation.candidate;
  return {
    mode: {
      value: safeMode,
      label: safeMode === 'live' ? '实时推荐' : '菜品灵感',
      notices: uniqueNotices(notices)
    },
    primary: toCard(recommendation, safeMode),
    alternatives: alternatives.slice(0, 2).map((alternative) => ({
      ...toCard(alternative, safeMode),
      differenceLabel: safeMode === 'live'
        ? liveDifference(primaryCandidate, alternative.candidate)
        : inspirationDifference(primaryCandidate, alternative.candidate)
    }))
  };
}
