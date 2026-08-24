import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
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

assert.deepEqual((await readdir(outputDirectory)).sort(), expectedTopLevel);
assert.deepEqual((await readdir(path.join(outputDirectory, 'assets'))).sort(), ['app.css', 'app.js', 'dishes']);
assert.deepEqual(
  (await readdir(path.join(outputDirectory, 'assets', 'dishes'))).sort(),
  [...APPROVED_DISH_ASSETS].sort()
);

for (const file of [
  'index.html',
  '404.html',
  'favicon.svg',
  'favicon.ico',
  'assets/app.css',
  'assets/app.js',
  ...APPROVED_DISH_ASSETS.map((asset) => `assets/dishes/${asset}`)
]) {
  const details = await stat(path.join(outputDirectory, file));
  assert.ok(details.size > 0, `${file} must not be empty`);
}

const indexHtml = await readFile(path.join(outputDirectory, 'index.html'), 'utf8');
assert.match(indexHtml, /\.\/assets\/app\.css/);
assert.match(indexHtml, /\.\/assets\/app\.js/);
assert.match(indexHtml, /\.\/favicon\.svg/);
assert.doesNotMatch(indexHtml, /\.\/src\//);

for (const file of ['index.html', '404.html', 'assets/app.css', 'assets/app.js']) {
  const contents = await readFile(path.join(outputDirectory, file), 'utf8');
  assert.doesNotMatch(contents, /https?:\/\//i, `${file} must not reference remote resources`);
  assert.doesNotMatch(contents, /sourceMappingURL=|\.map(?:["')\s]|$)/im, `${file} must not reference source maps`);
  assert.doesNotMatch(
    contents,
    /(?:^|["'`(])(?:\.{1,2}\/)?(?:src|tests|docs|scripts)\//m,
    `${file} must not reference repository-only paths`
  );
}

process.stdout.write('dist artifact contract verified\n');
