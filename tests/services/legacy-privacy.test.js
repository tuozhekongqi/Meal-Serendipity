import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('legacy page keeps taboo text in memory and removes historical storage keys', async () => {
  const source = await readFile(new URL('../../index.html', import.meta.url), 'utf8');

  assert.doesNotMatch(source, /lsSet\(LS_KEYS\.taboo/);
  assert.doesNotMatch(source, /Object\.assign\(state, f\)/);
  assert.match(source, /localStorage\.removeItem\(LS_KEYS\.taboo\)/);
  assert.match(source, /localStorage\.removeItem\('wt_black'\)/);
});
