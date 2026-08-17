import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';

import {
  createLegacyRecommendationApi,
  explainLegacyDish,
  filterLegacyDishes,
  rankLegacyDishes,
  scoreLegacyDish
} from '../../src/recommendation/legacy-adapter.js';

async function readLegacyDishes() {
  const html = await readFile(new URL('../../一餐之缘_分享版/index.html', import.meta.url), 'utf8');
  const match = html.match(/const DISHES = (\[[\s\S]*?\n\]);/);
  assert.ok(match);
  return vm.runInNewContext(`(${match[1]})`);
}

function makeLegacyContext() {
  return {
    person: {
      tastes: { 1: '辣', 2: '咸鲜' },
      types: { 米饭: 1 }
    },
    state: {
      budget: '2',
      weather: '晴'
    },
    scene: {
      name: '犒劳自己',
      fx: { t: ['辣', '浓郁', '甜'], pUp: 1 }
    },
    isGroup: false,
    weatherMap: '晴',
    weatherTip: '风和日丽，正好下馆子',
    typeNames: { 米饭: '米饭类' }
  };
}

test('legacy adapter reproduces the fixed phase 0 three-plan sample', async () => {
  const dishes = await readLegacyDishes();
  const context = makeLegacyContext();
  const pool = filterLegacyDishes(dishes, {
    person: context.person,
    tabooList: ['花生'],
    history: []
  });

  const top = rankLegacyDishes(pool, context, [], 'top')[0];
  const safe = rankLegacyDishes(pool, context, [top.d], 'safe')[0];
  const niche = rankLegacyDishes(pool, context, [top.d, safe.d], 'niche')[0];

  assert.deepEqual([top.d.n, safe.d.n, niche.d.n], [
    '黄焖鸡米饭',
    '鱼香肉丝盖饭',
    '香辣猪蹄饭'
  ]);
  assert.deepEqual([top.s, safe.s, niche.s], [129, 129, 129]);
  assert.equal(
    explainLegacyDish(top.d, 'top', context),
    '正中主味「辣」 · 主食正是「米饭类」 · 价格正好在预算内 · 正合「犒劳自己」 · 风和日丽，正好下馆子'
  );
});

test('legacy adapter keeps taboo, primary taste, type, and history filtering behavior', async () => {
  const dishes = await readLegacyDishes();
  const context = makeLegacyContext();
  const pool = filterLegacyDishes(dishes, {
    person: context.person,
    tabooList: ['花生'],
    history: ['黄焖鸡米饭']
  });

  assert.ok(pool.length > 5);
  assert.equal(pool.some((dish) => dish.n === '黄焖鸡米饭'), false);
  assert.equal(pool.some((dish) => dish.n.includes('花生') || dish.k.includes('花生')), false);
  assert.ok(pool.every((dish) => dish.t.includes('辣')));
  assert.ok(pool.every((dish) => dish.ty === '米饭'));
});

test('legacy scoring is pure and stable for the same dish and context', async () => {
  const dishes = await readLegacyDishes();
  const dish = dishes.find(({ n }) => n === '黄焖鸡米饭');
  const context = makeLegacyContext();

  const first = scoreLegacyDish(dish, context, []);
  const second = scoreLegacyDish(dish, context, []);

  assert.equal(first, 129);
  assert.equal(second, first);
});

test('browser API exposes the tested pure adapter behavior without ambient state', async () => {
  const dishes = await readLegacyDishes();
  const dish = dishes.find(({ n }) => n === '黄焖鸡米饭');
  const api = createLegacyRecommendationApi();

  assert.equal(api.scoreLegacyDish(dish, makeLegacyContext(), []), 129);
  assert.equal(
    api.explainLegacyDish(dish, 'top', makeLegacyContext()),
    '正中主味「辣」 · 主食正是「米饭类」 · 价格正好在预算内 · 正合「犒劳自己」 · 风和日丽，正好下馆子'
  );
});
