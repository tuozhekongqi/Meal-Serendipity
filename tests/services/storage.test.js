import assert from 'node:assert/strict';
import test from 'node:test';

import { createPreferenceStorage } from '../../src/services/storage.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    values
  };
}

test('storage persists only non-sensitive preferences and coarse area', () => {
  const backend = memoryStorage();
  const storage = createPreferenceStorage({ storage: backend, now: () => new Date('2026-08-17T03:00:00Z') });
  const result = storage.save({
    totalBudgetCents: 3500,
    tastePreferences: ['辣'],
    exclusions: ['花生原文'],
    location: { latitude: 31.2, longitude: 121.4, accuracyMeters: 20, areaLabel: '上海市黄浦区', source: 'browser' }
  });
  const raw = [...backend.values.values()][0];

  assert.equal(result.ok, true);
  assert.equal(raw.includes('31.2'), false);
  assert.equal(raw.includes('121.4'), false);
  assert.equal(raw.includes('花生原文'), false);
  assert.equal(raw.includes('上海市黄浦区'), true);
});

test('storage unavailability never escapes as an exception', () => {
  const throwing = {
    getItem() { throw new Error('disabled'); },
    setItem() { throw new Error('disabled'); },
    removeItem() { throw new Error('disabled'); }
  };
  const storage = createPreferenceStorage({ storage: throwing });

  assert.deepEqual(storage.load(), { ok: false, value: null, reason: 'storage_unavailable' });
  assert.deepEqual(storage.save({}), { ok: false, reason: 'storage_unavailable' });
  assert.deepEqual(storage.clear(), { ok: false, reason: 'storage_unavailable' });
});

test('storage reports unavailable when no storage object exists', () => {
  const storage = createPreferenceStorage({ storage: null });

  assert.deepEqual(storage.load(), { ok: false, value: null, reason: 'storage_unavailable' });
  assert.deepEqual(storage.save({}), { ok: false, reason: 'storage_unavailable' });
  assert.deepEqual(storage.clear(), { ok: false, reason: 'storage_unavailable' });
});

test('storage safely ignores corrupt and unsupported versions', () => {
  const corrupt = memoryStorage();
  corrupt.setItem('meal-serendipity:preferences', '{bad json');
  assert.equal(createPreferenceStorage({ storage: corrupt }).load().reason, 'corrupt_data');

  const newer = memoryStorage();
  newer.setItem('meal-serendipity:preferences', JSON.stringify({ version: 99, preferences: {} }));
  assert.equal(createPreferenceStorage({ storage: newer }).load().reason, 'unsupported_version');
});

test('storage migrates a version zero preference payload without sensitive fields', () => {
  const backend = memoryStorage();
  backend.setItem('meal-serendipity:preferences', JSON.stringify({
    version: 0,
    budgetCents: 4200,
    tastes: ['清淡'],
    exclusions: ['不要保存'],
    latitude: 31.2
  }));
  const result = createPreferenceStorage({ storage: backend }).load();

  assert.equal(result.ok, true);
  assert.equal(result.migrated, true);
  assert.equal(result.value.totalBudgetCents, 4200);
  assert.deepEqual(result.value.tastePreferences, ['清淡']);
  assert.equal(JSON.stringify(result).includes('不要保存'), false);
  assert.equal(JSON.stringify(result).includes('31.2'), false);
});
