export const PARTY_SIZE_BUCKET = Object.freeze({
  ONE: '1',
  TWO: '2',
  THREE: '3',
  FOUR_PLUS: '4_plus'
});

export const MEAL_SCENE = Object.freeze({
  SOLO_QUICK: 'solo_quick',
  SOLO_FOCUS: 'solo_focus',
  SOLO_TREAT: 'solo_treat',
  SOLO_LATE_NIGHT: 'solo_late_night',
  SOLO_LIGHTER: 'solo_lighter',
  SOLO_SAVE: 'solo_save',
  GROUP_GATHERING: 'group_gathering',
  GROUP_INDIVIDUAL: 'group_individual',
  GROUP_MIXED_TASTE: 'group_mixed_taste',
  GROUP_FAMILY: 'group_family',
  GROUP_CELEBRATION: 'group_celebration'
});

export const DINING_MODE = Object.freeze({
  SHARED: 'shared',
  INDIVIDUAL: 'individual',
  SHARED_MAIN_PERSONAL: 'shared_main_personal',
  UNDECIDED: 'undecided'
});

export const INSPIRATION_BUDGET_TIER = Object.freeze({
  ECONOMY: 'economy',
  EVERYDAY: 'everyday',
  GENEROUS: 'generous',
  OPEN: 'open'
});

const DINING_MODE_CATALOG = Object.freeze({
  [DINING_MODE.SHARED]: Object.freeze({ value: DINING_MODE.SHARED, label: '一起吃共享菜' }),
  [DINING_MODE.INDIVIDUAL]: Object.freeze({ value: DINING_MODE.INDIVIDUAL, label: '每个人单独点' }),
  [DINING_MODE.SHARED_MAIN_PERSONAL]: Object.freeze({ value: DINING_MODE.SHARED_MAIN_PERSONAL, label: '主菜统一，口味各自不同' }),
  [DINING_MODE.UNDECIDED]: Object.freeze({ value: DINING_MODE.UNDECIDED, label: '还没想好' })
});

function scene(value, label, audience, suggestedDiningModes = []) {
  return Object.freeze({
    value,
    label,
    audience,
    suggestedDiningModes: Object.freeze([...suggestedDiningModes])
  });
}

export const SCENE_CATALOG = Object.freeze([
  scene(MEAL_SCENE.SOLO_QUICK, '快速解决', 'single'),
  scene(MEAL_SCENE.SOLO_FOCUS, '学习 / 工作', 'single'),
  scene(MEAL_SCENE.SOLO_TREAT, '想吃点好的', 'single'),
  scene(MEAL_SCENE.SOLO_LATE_NIGHT, '深夜加餐', 'single'),
  scene(MEAL_SCENE.SOLO_LIGHTER, '清淡一点', 'single'),
  scene(MEAL_SCENE.SOLO_SAVE, '今天想省钱', 'single'),
  scene(MEAL_SCENE.GROUP_GATHERING, '一起聚餐', 'multi', [
    DINING_MODE.SHARED,
    DINING_MODE.SHARED_MAIN_PERSONAL,
    DINING_MODE.INDIVIDUAL,
    DINING_MODE.UNDECIDED
  ]),
  scene(MEAL_SCENE.GROUP_INDIVIDUAL, '各点各的', 'multi', [
    DINING_MODE.INDIVIDUAL,
    DINING_MODE.SHARED,
    DINING_MODE.SHARED_MAIN_PERSONAL,
    DINING_MODE.UNDECIDED
  ]),
  scene(MEAL_SCENE.GROUP_MIXED_TASTE, '口味不太一样', 'multi', [
    DINING_MODE.SHARED_MAIN_PERSONAL,
    DINING_MODE.INDIVIDUAL,
    DINING_MODE.SHARED,
    DINING_MODE.UNDECIDED
  ]),
  scene(MEAL_SCENE.GROUP_FAMILY, '家庭用餐', 'multi', [
    DINING_MODE.SHARED,
    DINING_MODE.SHARED_MAIN_PERSONAL,
    DINING_MODE.UNDECIDED,
    DINING_MODE.INDIVIDUAL
  ]),
  scene(MEAL_SCENE.GROUP_CELEBRATION, '约会 / 庆祝', 'multi', [
    DINING_MODE.SHARED,
    DINING_MODE.SHARED_MAIN_PERSONAL,
    DINING_MODE.INDIVIDUAL,
    DINING_MODE.UNDECIDED
  ])
]);

export function getScenesForPartySize(partySize) {
  const audience = Number(partySize) === 1 ? 'single' : 'multi';
  return SCENE_CATALOG.filter((entry) => entry.audience === audience);
}

export function getDiningModesForScene(mealScene) {
  const selectedScene = SCENE_CATALOG.find(({ value }) => value === mealScene);
  if (!selectedScene || selectedScene.audience === 'single') return [];
  return selectedScene.suggestedDiningModes.map((value) => DINING_MODE_CATALOG[value]);
}
