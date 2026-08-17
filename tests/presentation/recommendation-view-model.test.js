import assert from 'node:assert/strict';
import test from 'node:test';

import { createRecommendationViewModel } from '../../src/presentation/recommendation-view-model.js';

function candidate({
  id = 'candidate:one',
  mode = 'inspiration',
  name = '番茄牛腩饭',
  tastes = ['咸鲜', '清淡'],
  category = '米饭',
  store = null,
  pricing = null,
  delivery = null,
  availability = null,
  orderUrl = null
} = {}) {
  return {
    id,
    sourceMode: mode,
    store,
    item: {
      id: `${id}:item`,
      name,
      description: '番茄酸甜，牛腩软烂',
      imageUrl: null,
      tasteTags: tastes,
      categoryTags: [category],
      allergenTags: [],
      ingredientTags: [],
      isAvailable: mode === 'live' ? true : null
    },
    pricing,
    delivery,
    availability,
    orderUrl,
    dataUpdatedAt: mode === 'live' ? '2026-08-17T03:00:00.000Z' : null,
    metadata: {}
  };
}

function recommendation(overrides = {}) {
  return {
    candidate: candidate(),
    score: 72,
    matchLevel: 'tradeoff',
    reasonCodes: ['taste_match', 'new_choice'],
    reasons: [
      { code: 'taste_match', message: '符合你的主要口味偏好' },
      { code: 'new_choice', message: '近期没有选择过这项' }
    ],
    tradeoffs: [{
      code: 'live_data_unavailable',
      message: '当前是菜品灵感，无法确认实时价格、距离或配送时间'
    }],
    passedConstraints: ['exclusion'],
    ...overrides
  };
}

test('inspiration presentation never exposes live merchant, metrics, or ordering actions', () => {
  const unsafeLooking = recommendation({
    candidate: candidate({
      store: { name: '不应展示的门店' },
      pricing: { totalCents: 2800 },
      delivery: { distanceMeters: 1200, etaMinutes: 28 },
      availability: { isOrderable: true },
      orderUrl: 'https://example.test/order'
    })
  });

  const view = createRecommendationViewModel({
    recommendation: unsafeLooking,
    alternatives: [],
    mode: 'inspiration',
    notices: []
  });

  assert.equal(view.mode.label, '菜品灵感');
  assert.equal(view.primary.storeName, null);
  assert.deepEqual(view.primary.metrics, []);
  assert.deepEqual(view.primary.action, { kind: 'copy', label: '复制菜名' });
  assert.deepEqual(view.primary.runway.map(({ label }) => label), ['忌口检查', '口味方向', '近期选择']);
});

test('live presentation includes only verified metrics and marks near-limit values as tradeoffs', () => {
  const live = recommendation({
    candidate: candidate({
      mode: 'live',
      store: { id: 'store:1', name: '已授权门店', rating: 4.7, ratingCount: 200, isOpen: true },
      pricing: { totalCents: 3900, isEstimate: false, unknownFeeLabels: [] },
      delivery: { distanceMeters: 1900, etaMinutes: 29 },
      availability: { isOrderable: true },
      orderUrl: 'https://provider.example.test/order'
    }),
    reasons: [{ code: 'open_now', message: '门店当前营业' }],
    reasonCodes: ['open_now'],
    tradeoffs: [
      { code: 'budget_near_limit', message: '已知总价接近你的预算上限' },
      { code: 'delivery_near_limit', message: '预计配送时间接近你的上限' }
    ],
    passedConstraints: ['exclusion', 'open', 'available', 'orderable', 'within_budget', 'within_eta', 'within_distance', 'fresh']
  });

  const view = createRecommendationViewModel({
    recommendation: live,
    alternatives: [],
    mode: 'live',
    notices: []
  });

  assert.equal(view.primary.storeName, '已授权门店');
  assert.deepEqual(view.primary.metrics, [
    { key: 'price', label: '已知总价', value: '¥39', status: 'tradeoff' },
    { key: 'eta', label: '预计送达', value: '29 分钟', status: 'tradeoff' },
    { key: 'distance', label: '距离', value: '1.9 km', status: 'passed' }
  ]);
  assert.deepEqual(view.primary.action, {
    kind: 'order',
    label: '去下单',
    url: 'https://provider.example.test/order'
  });
});

test('inspiration alternatives describe a verifiable taste or category change', () => {
  const view = createRecommendationViewModel({
    recommendation: recommendation(),
    alternatives: [
      recommendation({ candidate: candidate({ id: 'candidate:two', name: '酸辣粉', tastes: ['酸', '辣'], category: '粉面' }) }),
      recommendation({ candidate: candidate({ id: 'candidate:three', name: '扬州炒饭', tastes: ['咸鲜'], category: '米饭' }) })
    ],
    mode: 'inspiration',
    notices: []
  });

  assert.equal(view.alternatives[0].differenceLabel, '换个方向');
  assert.equal(view.alternatives[1].differenceLabel, '另一个合适选择');
});

test('inspiration alternatives claim a taste change only when tastes do not overlap', () => {
  const view = createRecommendationViewModel({
    recommendation: recommendation(),
    alternatives: [
      recommendation({ candidate: candidate({ id: 'candidate:two', name: '酸辣粉', tastes: ['酸', '辣'], category: '米饭' }) })
    ],
    mode: 'inspiration',
    notices: []
  });

  assert.equal(view.alternatives[0].differenceLabel, '换个口味');
});

test('live alternative claims require comparable verified ETA or price data', () => {
  const primary = recommendation({
    candidate: candidate({
      mode: 'live',
      pricing: { totalCents: 4000, isEstimate: false, unknownFeeLabels: [] },
      delivery: { distanceMeters: 1200, etaMinutes: 30 }
    })
  });
  const view = createRecommendationViewModel({
    recommendation: primary,
    alternatives: [
      recommendation({ candidate: candidate({
        id: 'candidate:faster', mode: 'live',
        pricing: { totalCents: 4500, isEstimate: false, unknownFeeLabels: [] },
        delivery: { distanceMeters: 1400, etaMinutes: 24 }
      }) }),
      recommendation({ candidate: candidate({
        id: 'candidate:cheaper', mode: 'live',
        pricing: { totalCents: 3200, isEstimate: false, unknownFeeLabels: [] },
        delivery: { distanceMeters: 1400, etaMinutes: 35 }
      }) })
    ],
    mode: 'live',
    notices: []
  });

  assert.equal(view.alternatives[0].differenceLabel, '更快送达');
  assert.equal(view.alternatives[1].differenceLabel, '更便宜');

  const unknown = createRecommendationViewModel({
    recommendation: recommendation({ candidate: candidate({ mode: 'live' }) }),
    alternatives: [recommendation({ candidate: candidate({ id: 'candidate:unknown', mode: 'live' }) })],
    mode: 'live',
    notices: []
  });
  assert.equal(unknown.alternatives[0].differenceLabel, '另一个合适选择');
});

test('provider notices are deduplicated and remain visible in the presentation contract', () => {
  const notice = { code: 'INSPIRATION_ONLY', message: '当前提供菜品灵感。' };
  const view = createRecommendationViewModel({
    recommendation: recommendation(),
    alternatives: [],
    mode: 'inspiration',
    notices: [notice, notice]
  });

  assert.deepEqual(view.mode.notices, [notice]);
});
