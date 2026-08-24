import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

import { DISH_IMAGE_MANIFEST } from '../src/data/dish-discovery-metadata.js';

const projectRoot = path.resolve(import.meta.dirname, '..');
const outputDirectory = path.join(projectRoot, 'dist');
const expectedTopLevel = ['404.html', 'assets', 'favicon.ico', 'favicon.svg', 'index.html'];

assert.deepEqual((await readdir(outputDirectory)).sort(), expectedTopLevel);
assert.deepEqual((await readdir(path.join(outputDirectory, 'assets'))).sort(), ['app.css', 'app.js', 'dishes']);
assert.deepEqual(
  (await readdir(path.join(outputDirectory, 'assets', 'dishes'))).sort(),
  Object.values(DISH_IMAGE_MANIFEST).sort()
);

for (const file of [
  'index.html',
  '404.html',
  'favicon.svg',
  'favicon.ico',
  'assets/app.css',
  'assets/app.js',
  ...Object.values(DISH_IMAGE_MANIFEST).map((asset) => `assets/dishes/${asset}`)
]) {
  const details = await stat(path.join(outputDirectory, file));
  assert.ok(details.size > 0, `${file} must not be empty`);
}

const indexHtml = await readFile(path.join(outputDirectory, 'index.html'), 'utf8');
assert.match(indexHtml, /\.\/assets\/app\.css/);
assert.match(indexHtml, /\.\/assets\/app\.js/);
assert.match(indexHtml, /\.\/favicon\.svg/);
assert.doesNotMatch(indexHtml, /\.\/src\//);

process.stdout.write('dist artifact contract verified\n');
