import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

import { DISH_IMAGE_MANIFEST } from '../../src/data/dish-discovery-metadata.js';

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(import.meta.dirname, '..', '..');

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

test('build emits a self-contained Pages artifact without repository-only directories', async (t) => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'meal-serendipity-build-'));
  const outputDirectory = path.join(temporaryRoot, 'dist');
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));

  await execFileAsync(process.execPath, [
    path.join(projectRoot, 'scripts', 'build-pages.mjs'),
    `--out-dir=${outputDirectory}`
  ], { cwd: projectRoot });

  const topLevel = (await readdir(outputDirectory)).sort();
  assert.deepEqual(topLevel, ['404.html', 'assets', 'favicon.ico', 'favicon.svg', 'index.html']);

  for (const repositoryOnlyPath of ['src', 'tests', 'docs', '.github', 'scripts']) {
    assert.equal(await exists(path.join(outputDirectory, repositoryOnlyPath)), false);
  }

  const indexHtml = await readFile(path.join(outputDirectory, 'index.html'), 'utf8');
  assert.match(indexHtml, /href="\.\/assets\/app\.css"/);
  assert.match(indexHtml, /src="\.\/assets\/app\.js"/);
  assert.match(indexHtml, /href="\.\/favicon\.svg"/);
  assert.doesNotMatch(indexHtml, /src\/|data:image\/svg\+xml/);

  const javascriptPath = path.join(outputDirectory, 'assets', 'app.js');
  assert.ok((await stat(javascriptPath)).size > 0);
  await execFileAsync(process.execPath, ['--check', javascriptPath]);
  const javascript = await readFile(javascriptPath, 'utf8');
  assert.doesNotMatch(javascript, /from\s+["']\.\//);

  const css = await readFile(path.join(outputDirectory, 'assets', 'app.css'), 'utf8');
  assert.match(css, /--color-bg/);

  const expectedDishAssets = Object.values(DISH_IMAGE_MANIFEST).sort();
  assert.deepEqual(
    (await readdir(path.join(outputDirectory, 'assets', 'dishes'))).sort(),
    expectedDishAssets
  );
  for (const file of expectedDishAssets) {
    assert.ok((await stat(path.join(outputDirectory, 'assets', 'dishes', file))).size > 0);
  }
});
