import { DINING_MODE } from '../domain/scenarios.js';

const TRAIT_DEFAULTS = Object.freeze({
  convenient: 0.5,
  stable: 0.5,
  filling: 0.5,
  mild: 0.5,
  lighter: 0.5,
  shareable: 0.5,
  expressive: 0.5,
  comforting: 0.5,
  lateNight: 0.5,
  varietyFriendly: 0.5
});

export const DISH_IMAGE_MANIFEST = Object.freeze({
  'rice-bowl': 'rice-bowl.webp',
  noodles: 'noodles.webp',
  hotpot: 'hotpot.webp',
  grill: 'grill.webp',
  braised: 'braised.webp',
  'light-meal': 'light-meal.webp',
  snacks: 'snacks.webp',
  plated: 'plated.webp',
  dessert: 'dessert.webp',
  soup: 'soup.webp',
  sharing: 'sharing.webp',
  celebration: 'celebration.webp',
  placeholder: 'placeholder.svg'
});

function metadata({ cuisineTags, servingRoles, supportedDiningModes, traits, imageKey }) {
  return Object.freeze({
    ...(cuisineTags ? { cuisineTags: Object.freeze([...cuisineTags]) } : {}),
    ...(servingRoles ? { servingRoles: Object.freeze([...servingRoles]) } : {}),
    ...(supportedDiningModes ? { supportedDiningModes: Object.freeze([...supportedDiningModes]) } : {}),
    ...(traits ? { discoveryTraits: Object.freeze({ ...traits }) } : {}),
    ...(imageKey ? { imageKey } : {})
  });
}

const INDIVIDUAL_MODES = Object.freeze([
  DINING_MODE.INDIVIDUAL,
  DINING_MODE.SHARED_MAIN_PERSONAL,
  DINING_MODE.UNDECIDED
]);

const SHARED_MODES = Object.freeze([
  DINING_MODE.SHARED,
  DINING_MODE.SHARED_MAIN_PERSONAL,
  DINING_MODE.UNDECIDED
]);

const FLEXIBLE_MODES = Object.freeze([
  DINING_MODE.SHARED,
  DINING_MODE.INDIVIDUAL,
  DINING_MODE.SHARED_MAIN_PERSONAL,
  DINING_MODE.UNDECIDED
]);

const CATEGORY_DEFAULTS = Object.freeze({
  米饭: metadata({
    cuisineTags: ['家常'],
    servingRoles: ['staple'],
    supportedDiningModes: INDIVIDUAL_MODES,
    traits: { convenient: 0.9, filling: 0.9, stable: 0.8, comforting: 0.65 },
    imageKey: 'rice-bowl'
  }),
  粉面: metadata({
    cuisineTags: ['面食'],
    servingRoles: ['staple'],
    supportedDiningModes: INDIVIDUAL_MODES,
    traits: { convenient: 0.85, comforting: 0.75, filling: 0.75, stable: 0.7 },
    imageKey: 'noodles'
  }),
  锅仔: metadata({
    cuisineTags: ['锅物'],
    servingRoles: ['shared-main'],
    supportedDiningModes: SHARED_MODES,
    traits: { shareable: 0.9, comforting: 0.9, varietyFriendly: 0.8, filling: 0.8 },
    imageKey: 'hotpot'
  }),
  烧烤: metadata({
    cuisineTags: ['烧烤'],
    servingRoles: ['shared-main'],
    supportedDiningModes: SHARED_MODES,
    traits: { shareable: 0.8, expressive: 0.75, lateNight: 0.95, varietyFriendly: 0.75 },
    imageKey: 'grill'
  }),
  卤味: metadata({
    cuisineTags: ['卤味'],
    servingRoles: ['side'],
    supportedDiningModes: FLEXIBLE_MODES,
    traits: { convenient: 0.8, lateNight: 0.8, varietyFriendly: 0.7, expressive: 0.6 },
    imageKey: 'braised'
  }),
  轻食: metadata({
    cuisineTags: ['轻食'],
    servingRoles: ['individual-main'],
    supportedDiningModes: INDIVIDUAL_MODES,
    traits: { lighter: 1, mild: 0.8, convenient: 0.7, stable: 0.65 },
    imageKey: 'light-meal'
  }),
  炸物小吃: metadata({
    cuisineTags: ['小吃'],
    servingRoles: ['snack'],
    supportedDiningModes: FLEXIBLE_MODES,
    traits: { convenient: 0.85, lateNight: 0.75, shareable: 0.7, expressive: 0.7 },
    imageKey: 'snacks'
  }),
  漂亮饭: metadata({
    cuisineTags: ['精致餐'],
    servingRoles: ['individual-main'],
    supportedDiningModes: INDIVIDUAL_MODES,
    traits: { expressive: 0.9, filling: 0.75, stable: 0.7, comforting: 0.65 },
    imageKey: 'plated'
  }),
  甜品: metadata({
    cuisineTags: ['甜品'],
    servingRoles: ['dessert'],
    supportedDiningModes: FLEXIBLE_MODES,
    traits: { lighter: 0.65, expressive: 0.7, convenient: 0.7, shareable: 0.6 },
    imageKey: 'dessert'
  })
});

const DISH_OVERRIDES = Object.freeze({
  芝香披萨套餐: metadata({
    cuisineTags: ['西式'],
    servingRoles: ['shared-main'],
    traits: { shareable: 1, expressive: 0.8 },
    imageKey: 'sharing'
  }),
  日式寿司便当: metadata({
    cuisineTags: ['日式'],
    servingRoles: ['individual-main'],
    traits: { lighter: 0.8, expressive: 0.8 }
  }),
  石锅拌饭: metadata({ cuisineTags: ['韩式'] }),
  韩式炸酱面: metadata({ cuisineTags: ['韩式'] }),
  韩式部队锅: metadata({ cuisineTags: ['韩式'], imageKey: 'sharing' }),
  寿喜锅: metadata({ cuisineTags: ['日式'], imageKey: 'sharing' }),
  鳗鱼饭: metadata({ cuisineTags: ['日式'] }),
  鱼香肉丝盖饭: metadata({ cuisineTags: ['川味'] }),
  麻辣香锅: metadata({ cuisineTags: ['川味'], imageKey: 'sharing' }),
  重庆小面: metadata({ cuisineTags: ['川味'] }),
  水煮肉片饭: metadata({ cuisineTags: ['川味'] }),
  广式烧腊饭: metadata({ cuisineTags: ['粤式'] }),
  广式肠粉: metadata({ cuisineTags: ['粤式'] }),
  广式云吞汤: metadata({ cuisineTags: ['粤式'], imageKey: 'soup' }),
  牛排铁板饭: metadata({ cuisineTags: ['西式'], imageKey: 'celebration' }),
  番茄肉酱意面: metadata({ cuisineTags: ['西式'] }),
  奶油蘑菇意面: metadata({ cuisineTags: ['西式'] }),
  惠灵顿牛排: metadata({ cuisineTags: ['西式'], imageKey: 'celebration' }),
  佛跳墙: metadata({ cuisineTags: ['闽菜'], imageKey: 'celebration' }),
  冬阴功锅: metadata({ cuisineTags: ['泰式'], imageKey: 'soup' }),
  台式卤肉饭: metadata({ cuisineTags: ['台式'] }),
  盐酥鸡: metadata({ cuisineTags: ['台式'] })
});

function mergeMetadata(categoryMetadata, dishMetadata) {
  return Object.freeze({
    cuisineTags: dishMetadata?.cuisineTags ?? categoryMetadata.cuisineTags,
    servingRoles: dishMetadata?.servingRoles ?? categoryMetadata.servingRoles,
    supportedDiningModes: dishMetadata?.supportedDiningModes ?? categoryMetadata.supportedDiningModes,
    discoveryTraits: Object.freeze({
      ...TRAIT_DEFAULTS,
      ...categoryMetadata.discoveryTraits,
      ...dishMetadata?.discoveryTraits
    }),
    imageKey: dishMetadata?.imageKey ?? categoryMetadata.imageKey
  });
}

export function getDishDiscoveryMetadata(dish) {
  return mergeMetadata(CATEGORY_DEFAULTS[dish.ty], DISH_OVERRIDES[dish.n]);
}
