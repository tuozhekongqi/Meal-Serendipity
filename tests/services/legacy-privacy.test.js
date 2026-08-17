import assert from 'node:assert/strict';
import test from 'node:test';

import { clearLegacySensitiveStorage } from '../../src/services/legacy-storage.js';

test('modern page removes historical taboo and blacklist values without touching unrelated storage', () => {
  const values = new Map([
    ['wt_taboo', '花生'],
    ['wt_black', '["香菜"]'],
    ['unrelated', 'keep']
  ]);
  const storage = { removeItem(key) { values.delete(key); } };

  const result = clearLegacySensitiveStorage(storage);

  assert.deepEqual(result, { ok: true, removed: ['wt_taboo', 'wt_black'] });
  assert.equal(values.has('wt_taboo'), false);
  assert.equal(values.has('wt_black'), false);
  assert.equal(values.get('unrelated'), 'keep');
});
test('legacy cleanup contains unavailable storage instead of crashing startup', () => {
  const result = clearLegacySensitiveStorage({
    removeItem() { throw new Error('blocked'); }
  });

  assert.deepEqual(result, { ok: false, removed: [], reason: 'storage_unavailable' });
});
