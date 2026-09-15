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
  [DINING_MODE.SHARED]: Object.freeze({ value: DINING_MODE.SHARED, label: '共享菜品' }),
  [DINING_MODE.INDIVIDUAL]: Object.freeze({ value: DINING_MODE.INDIVIDUAL, label: '每人单独选择' }),
  [DINING_MODE.SHARED_MAIN_PERSONAL]: Object.freeze({ value: DINING_MODE.SHARED_MAIN_PERSONAL, label: '同一菜系，分别选菜' }),
  [DINING_MODE.UNDECIDED]: Object.freeze({ value: DINING_MODE.UNDECIDED, label: '暂未决定' })
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
  scene(MEAL_SCENE.SOLO_QUICK, '快速用餐', 'single'),
  scene(MEAL_SCENE.SOLO_FOCUS, '学习或工作', 'single'),
  scene(MEAL_SCENE.SOLO_TREAT, '犒赏自己', 'single'),
  scene(MEAL_SCENE.SOLO_LATE_NIGHT, '深夜加餐', 'single'),
  scene(MEAL_SCENE.SOLO_LIGHTER, '偏好清淡', 'single'),
  scene(MEAL_SCENE.SOLO_SAVE, '节省预算', 'single'),
  scene(MEAL_SCENE.GROUP_GATHERING, '多人聚餐', 'multi', [
    DINING_MODE.SHARED,
    DINING_MODE.SHARED_MAIN_PERSONAL,
    DINING_MODE.INDIVIDUAL,
    DINING_MODE.UNDECIDED
  ]),
  scene(MEAL_SCENE.GROUP_INDIVIDUAL, '分别点餐', 'multi', [
    DINING_MODE.INDIVIDUAL,
    DINING_MODE.SHARED,
    DINING_MODE.SHARED_MAIN_PERSONAL,
    DINING_MODE.UNDECIDED
  ]),
  scene(MEAL_SCENE.GROUP_MIXED_TASTE, '口味各异', 'multi', [
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
  scene(MEAL_SCENE.GROUP_CELEBRATION, '约会或庆祝', 'multi', [
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
