export const NOW = new Date('2026-08-17T03:00:00.000Z');

export function makeContext(overrides = {}) {
  return {
    totalBudgetCents: 3000,
    maxDeliveryMinutes: 35,
    maxDistanceMeters: 3000,
    partySize: 1,
    tastePreferences: ['咸鲜'],
    exclusions: [],
    currentPriority: 'balanced',
    recentHistory: [],
    contextTags: [],
    ...overrides
  };
}

export function makeLiveCandidate(overrides = {}) {
  const candidate = {
    id: 'live:store-1:item-1',
    sourceMode: 'live',
    store: {
      id: 'store-1',
      name: '一号门店',
      rating: 4.6,
      ratingCount: 300,
      isOpen: true
    },
    item: {
      id: 'item-1',
      name: '鸡肉盖饭',
      description: '一人份',
      imageUrl: null,
      tasteTags: ['咸鲜'],
      categoryTags: ['米饭'],
      allergenTags: [],
      ingredientTags: ['鸡肉'],
      isAvailable: true
    },
    pricing: {
      totalCents: 2600,
      isEstimate: false,
      unknownFeeLabels: []
    },
    delivery: {
      distanceMeters: 1800,
      etaMinutes: 28
    },
    availability: {
      isOrderable: true,
      reason: null
    },
    dataUpdatedAt: '2026-08-17T02:58:00.000Z',
    metadata: {}
  };

  return {
    ...candidate,
    ...overrides,
    store: overrides.store === null ? null : { ...candidate.store, ...overrides.store },
    item: { ...candidate.item, ...overrides.item },
    pricing: overrides.pricing === null ? null : { ...candidate.pricing, ...overrides.pricing },
    delivery: overrides.delivery === null ? null : { ...candidate.delivery, ...overrides.delivery },
    availability: overrides.availability === null
      ? null
      : { ...candidate.availability, ...overrides.availability },
    metadata: { ...candidate.metadata, ...overrides.metadata }
  };
}
