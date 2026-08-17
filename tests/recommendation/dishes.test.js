import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';

import { DISHES } from '../../src/data/dishes.js';

async function readLegacyDishes() {
  const html = await readFile(new URL('../../一餐之缘_分享版/index.html', import.meta.url), 'utf8');
  const match = html.match(/const DISHES = (\[[\s\S]*?\n\]);/);
  assert.ok(match, 'the preserved historical page should expose the legacy dish array');
  return vm.runInNewContext(`(${match[1]})`);
}

test('exports all 175 unique dishes with valid domain fields', () => {
  assert.equal(DISHES.length, 175);
  assert.equal(new Set(DISHES.map((dish) => dish.id)).size, 175);
  assert.equal(new Set(DISHES.map((dish) => dish.item.name)).size, 175);

  for (const dish of DISHES) {
    assert.match(dish.id, /^inspiration:/);
    assert.equal(dish.sourceMode, 'inspiration');
    assert.equal(dish.store, null);
    assert.ok(dish.item.name.length > 0);
    assert.ok(dish.item.tasteTags.length > 0);
    assert.ok(dish.item.categoryTags.length === 1);
    assert.ok(Number.isInteger(dish.metadata.priceTier));
    assert.ok(dish.metadata.priceTier >= 1 && dish.metadata.priceTier <= 4);
    assert.ok(dish.metadata.weatherTags.length > 0);
    assert.ok(['mainstream', 'niche'].includes(dish.metadata.popularity));
    assert.equal(dish.pricing, null);
    assert.equal(dish.delivery, null);
    assert.equal(dish.availability, null);
  }
});

test('matches every legacy dish without losing recommendation fields', async () => {
  const legacy = await readLegacyDishes();
  assert.equal(legacy.length, DISHES.length);

  for (let index = 0; index < legacy.length; index += 1) {
    const before = legacy[index];
    const after = DISHES[index];
    assert.equal(after.item.name, before.n);
    assert.deepEqual(after.item.tasteTags, Array.from(before.t));
    assert.deepEqual(after.item.categoryTags, [before.ty]);
    assert.deepEqual(after.item.ingredientTags, Array.from(before.k));
    assert.equal(after.item.description, before.d);
    assert.equal(after.metadata.priceTier, before.p);
    assert.deepEqual(after.metadata.weatherTags, Array.from(before.w));
    assert.equal(after.metadata.popularity, before.c === 1 ? 'mainstream' : 'niche');
  }
});
