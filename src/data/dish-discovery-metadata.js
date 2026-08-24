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

export const DISH_IMAGE_ALTS = Object.freeze({
  'rice-bowl': '鸡肉米饭碗菜品灵感图',
  noodles: '清汤面菜品灵感图',
  hotpot: '双味火锅菜品灵感图',
  grill: '烤串拼盘菜品灵感图',
  braised: '豆制品卤味拼盘灵感图',
  'light-meal': '鸡胸牛油果谷物碗菜品灵感图',
  snacks: '酥炸小食拼盘菜品灵感图',
  plated: '牛排配蔬菜菜品灵感图',
  dessert: '莓果慕斯甜品灵感图',
  soup: '青菜云吞汤菜品灵感图',
  sharing: '炖牛肉共享餐菜品灵感图',
  celebration: '牛排庆祝餐菜品灵感图'
});

const AUDITED_DISH_IMAGE_KEYS = Object.freeze({
  照烧鸡腿饭: 'rice-bowl',
  烧烤烤串: 'grill',
  卤味拼盘: 'braised',
  卤香干: 'braised',
  低脂轻食沙拉: 'light-meal',
  牛油果鸡胸碗: 'light-meal',
  蛋白能量碗: 'light-meal',
  广式云吞汤: 'soup',
  红酒烩牛肉: 'sharing'
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
    traits: { convenient: 0.9, filling: 0.9, stable: 0.8, comforting: 0.65 }
  }),
  粉面: metadata({
    cuisineTags: ['面食'],
    servingRoles: ['staple'],
    supportedDiningModes: INDIVIDUAL_MODES,
    traits: { convenient: 0.85, comforting: 0.75, filling: 0.75, stable: 0.7 }
  }),
  锅仔: metadata({
    cuisineTags: ['锅物'],
    servingRoles: ['shared-main'],
    supportedDiningModes: SHARED_MODES,
    traits: { shareable: 0.9, comforting: 0.9, varietyFriendly: 0.8, filling: 0.8 }
  }),
  烧烤: metadata({
    cuisineTags: ['烧烤'],
    servingRoles: ['shared-main'],
    supportedDiningModes: SHARED_MODES,
    traits: { shareable: 0.8, expressive: 0.75, lateNight: 0.95, varietyFriendly: 0.75 }
  }),
  卤味: metadata({
    cuisineTags: ['卤味'],
    servingRoles: ['side'],
    supportedDiningModes: FLEXIBLE_MODES,
    traits: { convenient: 0.8, lateNight: 0.8, varietyFriendly: 0.7, expressive: 0.6 }
  }),
  轻食: metadata({
    cuisineTags: ['轻食'],
    servingRoles: ['individual-main'],
    supportedDiningModes: INDIVIDUAL_MODES,
    traits: { lighter: 1, mild: 0.8, convenient: 0.7, stable: 0.65 }
  }),
  炸物小吃: metadata({
    cuisineTags: ['小吃'],
    servingRoles: ['snack'],
    supportedDiningModes: FLEXIBLE_MODES,
    traits: { convenient: 0.85, lateNight: 0.75, shareable: 0.7, expressive: 0.7 }
  }),
  漂亮饭: metadata({
    cuisineTags: ['精致餐'],
    servingRoles: ['individual-main'],
    supportedDiningModes: INDIVIDUAL_MODES,
    traits: { expressive: 0.9, filling: 0.75, stable: 0.7, comforting: 0.65 }
  }),
  甜品: metadata({
    cuisineTags: ['甜品'],
    servingRoles: ['dessert'],
    supportedDiningModes: FLEXIBLE_MODES,
    traits: { lighter: 0.65, expressive: 0.7, convenient: 0.7, shareable: 0.6 }
  })
});

const DISH_OVERRIDES = Object.freeze({
  芝香披萨套餐: metadata({
    cuisineTags: ['西式'],
    servingRoles: ['shared-main'],
    traits: { shareable: 1, expressive: 0.8 }
  }),
  日式寿司便当: metadata({
    cuisineTags: ['日式'],
    servingRoles: ['individual-main'],
    traits: { lighter: 0.8, expressive: 0.8 }
  }),
  石锅拌饭: metadata({ cuisineTags: ['韩式'] }),
  韩式炸酱面: metadata({ cuisineTags: ['韩式'] }),
  韩式部队锅: metadata({ cuisineTags: ['韩式'] }),
  寿喜锅: metadata({ cuisineTags: ['日式'] }),
  鳗鱼饭: metadata({ cuisineTags: ['日式'] }),
  鱼香肉丝盖饭: metadata({ cuisineTags: ['川味'] }),
  麻辣香锅: metadata({ cuisineTags: ['川味'] }),
  重庆小面: metadata({ cuisineTags: ['川味'] }),
  水煮肉片饭: metadata({ cuisineTags: ['川味'] }),
  广式烧腊饭: metadata({ cuisineTags: ['粤式'] }),
  广式肠粉: metadata({ cuisineTags: ['粤式'] }),
  广式云吞汤: metadata({ cuisineTags: ['粤式'] }),
  牛排铁板饭: metadata({ cuisineTags: ['西式'] }),
  番茄肉酱意面: metadata({ cuisineTags: ['西式'] }),
  奶油蘑菇意面: metadata({ cuisineTags: ['西式'] }),
  惠灵顿牛排: metadata({ cuisineTags: ['西式'] }),
  佛跳墙: metadata({ cuisineTags: ['闽菜'] }),
  冬阴功锅: metadata({ cuisineTags: ['泰式'] }),
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
    })
  });
}

export function getDishDiscoveryMetadata(dish) {
  const merged = mergeMetadata(CATEGORY_DEFAULTS[dish.ty], DISH_OVERRIDES[dish.n]);
  const imageKey = AUDITED_DISH_IMAGE_KEYS[dish.n];
  return imageKey ? Object.freeze({ ...merged, imageKey }) : merged;
}
