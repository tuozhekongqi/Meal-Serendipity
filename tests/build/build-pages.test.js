import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

import { DISH_IMAGE_MANIFEST } from '../../src/data/dish-discovery-metadata.js';

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(import.meta.dirname, '..', '..');
const approvedDishAssets = [
  'braised.webp',
  'celebration.webp',
  'dessert.webp',
  'grill.webp',
  'hotpot.webp',
  'light-meal.webp',
  'noodles.webp',
  'placeholder.svg',
  'plated.webp',
  'rice-bowl.webp',
  'sharing.webp',
  'snacks.webp',
  'soup.webp'
];

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function createRuntimeManifestDriftFixture(t) {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'meal-serendipity-artifact-contract-'));
  const temporaryDirectory = path.resolve(tmpdir());
  assert.equal(path.dirname(temporaryRoot), temporaryDirectory);
  assert.match(path.basename(temporaryRoot), /^meal-serendipity-artifact-contract-/);
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));

  await Promise.all([
    cp(path.join(projectRoot, 'assets'), path.join(temporaryRoot, 'assets'), { recursive: true }),
    cp(path.join(projectRoot, 'src'), path.join(temporaryRoot, 'src'), { recursive: true }),
    cp(path.join(projectRoot, 'scripts', 'build-pages.mjs'), path.join(temporaryRoot, 'scripts', 'build-pages.mjs')),
    cp(path.join(projectRoot, 'scripts', 'check-dist.mjs'), path.join(temporaryRoot, 'scripts', 'check-dist.mjs')),
    cp(path.join(projectRoot, 'index.html'), path.join(temporaryRoot, 'index.html')),
    cp(path.join(projectRoot, '404.html'), path.join(temporaryRoot, '404.html')),
    cp(path.join(projectRoot, 'favicon.svg'), path.join(temporaryRoot, 'favicon.svg'))
  ]);
  await symlink(
    path.join(projectRoot, 'node_modules'),
    path.join(temporaryRoot, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir'
  );

  const metadataPath = path.join(temporaryRoot, 'src', 'data', 'dish-discovery-metadata.js');
  const metadata = await readFile(metadataPath, 'utf8');
  const driftedMetadata = metadata.replace("placeholder: 'placeholder.svg'", "placeholder: 'README.md'");
  assert.notEqual(driftedMetadata, metadata);
  await writeFile(metadataPath, driftedMetadata);

  return {
    outputDirectory: path.join(temporaryRoot, 'dist'),
    temporaryRoot
  };
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

test('build keeps runtime manifest changes from authorizing repository-only dish files', async (t) => {
  const { outputDirectory, temporaryRoot } = await createRuntimeManifestDriftFixture(t);

  await execFileAsync(process.execPath, [
    path.join(temporaryRoot, 'scripts', 'build-pages.mjs'),
    `--out-dir=${outputDirectory}`
  ], { cwd: temporaryRoot });

  assert.deepEqual(
    (await readdir(path.join(outputDirectory, 'assets', 'dishes'))).sort(),
    approvedDishAssets
  );
});

test('build clearly rejects a missing approved dish source file', async (t) => {
  const { outputDirectory, temporaryRoot } = await createRuntimeManifestDriftFixture(t);
  await rm(path.join(temporaryRoot, 'assets', 'dishes', 'placeholder.svg'));

  await assert.rejects(
    () => execFileAsync(process.execPath, [
      path.join(temporaryRoot, 'scripts', 'build-pages.mjs'),
      `--out-dir=${outputDirectory}`
    ], { cwd: temporaryRoot }),
    /Approved dish source file is missing: assets\/dishes\/placeholder\.svg/
  );
});

test('checker rejects a repository-only dish file even when the runtime manifest authorizes it', async (t) => {
  const { outputDirectory, temporaryRoot } = await createRuntimeManifestDriftFixture(t);

  await execFileAsync(process.execPath, [
    path.join(temporaryRoot, 'scripts', 'build-pages.mjs'),
    `--out-dir=${outputDirectory}`
  ], { cwd: temporaryRoot });
  await rm(path.join(outputDirectory, 'assets', 'dishes', 'placeholder.svg'), { force: true });
  await writeFile(path.join(outputDirectory, 'assets', 'dishes', 'README.md'), 'repository-only fixture');

  await assert.rejects(
    () => execFileAsync(process.execPath, [path.join(temporaryRoot, 'scripts', 'check-dist.mjs')], { cwd: temporaryRoot }),
    /Command failed/
  );
});

test('checker rejects a remote image URL in bundled JavaScript', async (t) => {
  const { outputDirectory, temporaryRoot } = await createRuntimeManifestDriftFixture(t);

  await execFileAsync(process.execPath, [
    path.join(temporaryRoot, 'scripts', 'build-pages.mjs'),
    `--out-dir=${outputDirectory}`
  ], { cwd: temporaryRoot });
  await writeFile(path.join(outputDirectory, 'assets', 'app.js'), 'const dishImage = "https://images.example.test/dish.webp";');

  await assert.rejects(
    () => execFileAsync(process.execPath, [path.join(temporaryRoot, 'scripts', 'check-dist.mjs')], { cwd: temporaryRoot }),
    /Command failed/
  );
});
