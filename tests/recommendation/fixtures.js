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

export function makeInspirationCandidate(overrides = {}) {
  const candidate = {
    id: 'inspiration:spicy-hotpot',
    sourceMode: 'inspiration',
    store: null,
    item: {
      id: 'spicy-hotpot',
      name: '川味香辣锅',
      description: '静态菜品灵感',
      imageUrl: null,
      tasteTags: ['辣'],
      categoryTags: ['锅仔'],
      allergenTags: [],
      ingredientTags: ['牛肉'],
      isAvailable: null
    },
    pricing: null,
    delivery: null,
    availability: null,
    orderUrl: null,
    dataUpdatedAt: null,
    metadata: {
      cuisineTags: ['川味'],
      servingRoles: ['shared-main'],
      supportedDiningModes: ['shared', 'individual', 'shared_main_personal', 'undecided'],
      discoveryTraits: { convenient: 1, stable: 1, filling: 1 },
      priceTier: 1,
      popularity: 'mainstream'
    }
  };

  return {
    ...candidate,
    ...overrides,
    item: { ...candidate.item, ...overrides.item },
    metadata: { ...candidate.metadata, ...overrides.metadata }
  };
}

export function makeMealPlanCandidates() {
  return [
    makeInspirationCandidate(),
    makeInspirationCandidate({
      id: 'inspiration:mild-tofu',
      item: {
        id: 'mild-tofu',
        name: '清香豆腐',
        tasteTags: ['清淡'],
        categoryTags: ['漂亮饭'],
        ingredientTags: ['豆腐']
      },
      metadata: {
        cuisineTags: ['川味'],
        servingRoles: ['individual-main'],
        discoveryTraits: { convenient: 0.7, stable: 0.6, filling: 0.5 },
        popularity: 'niche'
      }
    }),
    makeInspirationCandidate({
      id: 'inspiration:savory-rice',
      item: {
        id: 'savory-rice',
        name: '咸鲜什锦饭',
        tasteTags: ['咸鲜'],
        categoryTags: ['米饭'],
        ingredientTags: ['米饭']
      },
      metadata: {
        cuisineTags: ['川味'],
        servingRoles: ['staple'],
        discoveryTraits: { convenient: 0.6, stable: 0.8, filling: 0.8 },
        popularity: 'mainstream'
      }
    }),
    makeInspirationCandidate({
      id: 'inspiration:peanut-noodles',
      item: {
        id: 'peanut-noodles',
        name: '清香花生拌面',
        tasteTags: ['清淡'],
        categoryTags: ['粉面'],
        allergenTags: ['花生'],
        ingredientTags: ['面条']
      },
      metadata: {
        cuisineTags: ['川味'],
        servingRoles: ['side'],
        discoveryTraits: { convenient: 0.8, stable: 0.6, filling: 0.5 },
        popularity: 'mainstream'
      }
    }),
    makeInspirationCandidate({
      id: 'inspiration:western-pasta',
      item: {
        id: 'western-pasta',
        name: '番茄肉酱意面',
        tasteTags: ['酸甜'],
        categoryTags: ['粉面'],
        ingredientTags: ['番茄']
      },
      metadata: {
        cuisineTags: ['西式'],
        servingRoles: ['individual-main'],
        discoveryTraits: { convenient: 0.5, stable: 0.6, filling: 0.7 },
        popularity: 'niche'
      }
    }),
    makeInspirationCandidate({
      id: 'inspiration:sweet-dessert',
      item: {
        id: 'sweet-dessert',
        name: '桂花甜品',
        tasteTags: ['甜'],
        categoryTags: ['甜品'],
        ingredientTags: ['桂花']
      },
      metadata: {
        cuisineTags: ['甜品'],
        servingRoles: ['dessert'],
        discoveryTraits: { convenient: 0.6, stable: 0.4, filling: 0.2 },
        popularity: 'niche'
      }
    })
  ];
}
