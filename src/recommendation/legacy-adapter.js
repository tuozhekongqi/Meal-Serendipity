function legacyBanned(dish, tabooList) {
  return tabooList.some((taboo) => {
    if (taboo.includes('辣') && !taboo.includes('微') && dish.t.includes('辣')) return true;
    if (taboo.includes('香菜') && (dish.k ?? []).includes('香菜')) return true;
    if ((dish.k ?? []).some((keyword) => keyword.includes(taboo) || taboo.includes(keyword))) {
      return true;
    }
    return dish.n.includes(taboo);
  });
}

/**
 * Phase 1 compatibility filter. It reproduces the current page contract while
 * keeping that logic outside DOM, storage and event handlers.
 */
export function filterLegacyDishes(dishes, { person, tabooList = [], history = [] }) {
  const priorities = person?.tastes ?? {};
  const selectedTypes = Object.keys(person?.types ?? {}).filter(
    (type) => person.types[type] > 0
  );
  let pool = dishes.filter((dish) => {
    if (legacyBanned(dish, tabooList)) return false;
    const tasteMatches = priorities[1]
      ? dish.t.includes(priorities[1])
      : priorities[2]
        ? dish.t.includes(priorities[2])
        : priorities[3]
          ? dish.t.includes(priorities[3])
          : true;
    const typeMatches = selectedTypes.length === 0 || selectedTypes.includes(dish.ty);
    return tasteMatches && typeMatches;
  });

  if (history.length > 0 && pool.length > 5) {
    const fresh = pool.filter((dish) => !history.includes(dish.n));
    if (fresh.length >= 3) pool = fresh;
  }

  return pool;
}

function legacySceneBonus(dish, context) {
  const effects = context.scene?.fx;
  if (!effects) return 0;
  let score = 0;
  if (effects.t && dish.t.some((taste) => effects.t.includes(taste))) score += 10;
  if (effects.ty && effects.ty.includes(dish.ty)) score += 10;
  if (effects.pUp && Math.abs(dish.p - Number(context.state.budget)) === 1) score += 10;
  if (effects.cheap && dish.p <= 2) score += 8;
  if (effects.pop && dish.c === 1) score += 6;
  if (effects.share && dish.p >= 2) score += 6;
  if (effects.nice && dish.p >= 3) score += 12;
  return score;
}

export function scoreLegacyDish(dish, context, avoid = []) {
  const priorities = context.person?.tastes ?? {};
  const selectedTypes = Object.keys(context.person?.types ?? {}).filter(
    (type) => context.person.types[type] > 0
  );
  let score = 0;

  if (priorities[1] && dish.t.includes(priorities[1])) score += 45;
  else if (priorities[2] && dish.t.includes(priorities[2])) score += 28;
  else if (priorities[3] && dish.t.includes(priorities[3])) score += 12;
  else score -= 8;

  if (selectedTypes.length && selectedTypes.includes(dish.ty)) score += 30;
  else if (selectedTypes.length) score -= 10;

  if (dish.p === Number(context.state.budget)) score += 26;
  else if (Math.abs(dish.p - Number(context.state.budget)) === 1) score += 10;

  if (dish.w.includes(context.weatherMap)) score += 18;
  if (context.state.weather === '潮湿' && dish.t.includes('清淡')) score += 6;
  score += legacySceneBonus(dish, context);
  if (context.isGroup) score += 4;
  if (avoid.includes(dish)) score -= 25;

  return score;
}

export function rankLegacyDishes(dishes, context, avoid = [], kind = 'top') {
  let ranked = dishes
    .map((dish, index) => ({
      d: dish,
      s: scoreLegacyDish(dish, context, avoid),
      index
    }))
    .sort((left, right) => right.s - left.s || left.index - right.index);

  if (kind === 'safe') {
    ranked = ranked.filter(({ d }) => d.c === 1).concat(ranked.filter(({ d }) => d.c === 0));
  }
  if (kind === 'niche') {
    ranked = ranked.filter(({ d }) => d.c === 0).concat(ranked.filter(({ d }) => d.c === 1));
  }

  return ranked.map(({ d, s }) => ({ d, s }));
}

export function explainLegacyDish(dish, kind, context) {
  const reasons = [];
  const priorities = context.person?.tastes ?? {};
  if (priorities[1] && dish.t.includes(priorities[1])) {
    reasons.push(`正中主味「${priorities[1]}」`);
  } else if (priorities[2] && dish.t.includes(priorities[2])) {
    reasons.push(`合次选「${priorities[2]}」`);
  } else if (priorities[3] && dish.t.includes(priorities[3])) {
    reasons.push(`兼得「${priorities[3]}」`);
  }

  const typeName = context.typeNames?.[dish.ty];
  if (typeName) reasons.push(`主食正是「${typeName}」`);
  if (dish.p === Number(context.state.budget)) reasons.push('价格正好在预算内');
  else if (Math.abs(dish.p - Number(context.state.budget)) === 1) reasons.push('价格在预算附近');
  if (context.scene) reasons.push(`正合「${context.scene.name}」`);
  if (dish.w.includes(context.weatherMap) && context.weatherTip) reasons.push(context.weatherTip);
  if (context.state.weather === '潮湿' && dish.t.includes('清淡素净')) {
    reasons.push('清淡去湿正合适');
  }
  if (context.isGroup) reasons.push('人多份量足，适合分享');
  if (kind === 'safe' && dish.c === 1) reasons.push('大众口碑稳，踩雷率低');
  if (kind === 'niche' && dish.c === 0) reasons.push('小众新鲜，换换口味');
  return reasons.length > 0 ? reasons.join(' · ') : '大众好评，盲点基本不亏';
}

export function createLegacyRecommendationApi() {
  return Object.freeze({
    filterLegacyDishes,
    scoreLegacyDish,
    rankLegacyDishes,
    explainLegacyDish
  });
}
