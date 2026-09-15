import assert from 'node:assert/strict';
import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const APPROVED_DISH_ASSETS = Object.freeze([
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
]);

const projectRoot = path.resolve(import.meta.dirname, '..');
const outputDirectory = path.join(projectRoot, 'dist');
const expectedTopLevel = ['404.html', 'assets', 'favicon.ico', 'favicon.svg', 'index.html'];
const approvedDishAssetSet = new Set(APPROVED_DISH_ASSETS);

function assertLocalDishAssetReferences(file, contents) {
  const references = contents.match(/\.\/assets\/dishes\/[^\s"'`()<>]*/g) ?? [];
  for (const reference of references) {
    if (reference.includes('${')) continue;
    const pathname = reference.split(/[?#]/, 1)[0];
    const normalizedPath = path.posix.normalize(pathname);
    if (!normalizedPath.startsWith('assets/dishes/')) {
      throw new Error(`${file} references an invalid local dish asset path: ${reference}`);
    }
    const asset = normalizedPath.slice('assets/dishes/'.length);
    if (asset.includes('/') || !approvedDishAssetSet.has(asset)) {
      throw new Error(`${file} references an unapproved local dish asset: ${asset}`);
    }
  }
}

function assertSafeTextArtifact(file, contents) {
  assert.doesNotMatch(
    contents,
    /(?:\b(?:src|href)\s*=\s*["']?|\burl\(\s*["']?)(?:https?:)?\/\/[^\s"'`)<]+|(?:https?:)?\/\/[^\s"'`)<]+\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#][^\s"'`)<]*)?/i,
    `${file} must not reference remote image or resource URLs`
  );
  assert.doesNotMatch(
    contents,
    /(?:sourceMappingURL\s*=\s*)?[A-Za-z0-9_./-]+\.map(?:[?#][^\s"'`)<)]*)?(?=$|[\s"'`)<;,])/i,
    `${file} must not reference source maps`
  );
  assert.doesNotMatch(
    contents,
    /(?:^|[\s"'`(=])(?:\/|\.{1,2}\/)?(?:src|tests|docs|scripts)(?:\/|$)/m,
    `${file} must not reference repository-only paths`
  );
  assertLocalDishAssetReferences(file, contents);
}

assert.deepEqual((await readdir(outputDirectory)).sort(), expectedTopLevel);
assert.deepEqual((await readdir(path.join(outputDirectory, 'assets'))).sort(), ['app.css', 'app.js', 'dishes']);
const dishDirectory = path.join(outputDirectory, 'assets', 'dishes');
const dishEntries = await readdir(dishDirectory, { withFileTypes: true });
assert.deepEqual(
  dishEntries.map((entry) => entry.name).sort(),
  [...APPROVED_DISH_ASSETS].sort(),
  'dist/assets/dishes must contain exactly approved dish files'
);

for (const file of [
  'index.html',
  '404.html',
  'favicon.svg',
  'favicon.ico',
  'assets/app.css',
  'assets/app.js'
]) {
  const details = await lstat(path.join(outputDirectory, file));
  assert.ok(details.isFile() && !details.isSymbolicLink(), `${file} must be a regular non-symlink file`);
  assert.ok(details.size > 0, `${file} must not be empty`);
}

for (const entry of dishEntries) {
  const file = `assets/dishes/${entry.name}`;
  const details = await lstat(path.join(dishDirectory, entry.name));
  assert.ok(
    entry.isFile() && !entry.isSymbolicLink() && details.isFile() && !details.isSymbolicLink(),
    `${file} must be a regular non-symlink file`
  );
  assert.ok(details.size > 0, `${file} must not be empty`);
}

const indexHtml = await readFile(path.join(outputDirectory, 'index.html'), 'utf8');
assert.match(indexHtml, /\.\/assets\/app\.css/);
assert.match(indexHtml, /\.\/assets\/app\.js/);
assert.match(indexHtml, /\.\/favicon\.svg/);
assert.doesNotMatch(indexHtml, /\.\/src\//);

for (const file of ['index.html', '404.html', 'assets/app.css', 'assets/app.js']) {
  const contents = await readFile(path.join(outputDirectory, file), 'utf8');
  assertSafeTextArtifact(file, contents);
}

process.stdout.write('dist artifact contract verified\n');
