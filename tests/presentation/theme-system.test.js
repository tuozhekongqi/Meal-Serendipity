import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import test from 'node:test';

import { DISH_IMAGE_MANIFEST } from '../../src/data/dish-discovery-metadata.js';
import { DISHES } from '../../src/data/dishes.js';

const tokens = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8');
const components = readFileSync(new URL('../../src/styles/components.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const assetsDirectory = new URL('../../assets/dishes/', import.meta.url);
const themeColors = Object.freeze({
  quick: '#F3F4F3',
  focus: '#EEF3F6',
  lighter: '#EEF7F1',
  gathering: '#FBF4E2',
  celebration: '#F4EFF8',
  'late-night': '#263747'
});
const requiredThemeAliases = [
  '--color-page-bg',
  '--color-soft-bg',
  '--color-card-surface',
  '--color-input-surface',
  '--color-secondary-surface',
  '--color-hover-surface',
  '--color-selected-surface',
  '--color-theme-border',
  '--color-theme-border-strong',
  '--color-text-on-theme',
  '--color-theme-focus',
  '--theme-shadow-color'
];
const expectedAssetFiles = [
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

function themeBlock(name) {
  return tokens.match(new RegExp(`\\[data-theme=["']${name}["']\\]\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? '';
}

function webpDetails(buffer) {
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buffer.toString('ascii', 8, 12), 'WEBP');
  const chunks = [];
  let width = null;
  let height = null;

  for (let offset = 12; offset + 8 <= buffer.length;) {
    const type = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const payload = offset + 8;
    assert.ok(payload + size <= buffer.length, `${type} chunk exceeds file bounds`);
    chunks.push(type);

    if (type === 'VP8X') {
      width = 1 + buffer.readUIntLE(payload + 4, 3);
      height = 1 + buffer.readUIntLE(payload + 7, 3);
    } else if (type === 'VP8 ') {
      assert.equal(buffer.toString('hex', payload + 3, payload + 6), '9d012a');
      width = buffer.readUInt16LE(payload + 6) & 0x3fff;
      height = buffer.readUInt16LE(payload + 8) & 0x3fff;
    } else if (type === 'VP8L') {
      assert.equal(buffer[payload], 0x2f);
      const dimensions = buffer.readUInt32LE(payload + 1);
      width = (dimensions & 0x3fff) + 1;
      height = ((dimensions >>> 14) & 0x3fff) + 1;
    }

    offset = payload + size + (size % 2);
  }

  return { width, height, chunks };
}

test('all six scene themes implement the complete alias contract without gradients', () => {
  assert.deepEqual(
    [...tokens.matchAll(/\[data-theme=["']([^"']+)["']\]/g)].map((match) => match[1]),
    Object.keys(themeColors)
  );
  for (const [theme, color] of Object.entries(themeColors)) {
    const block = themeBlock(theme);
    assert.ok(block, `missing ${theme} selector`);
    assert.match(block, new RegExp(`--color-page-bg\\s*:\\s*${color}`, 'i'));
    for (const variable of requiredThemeAliases) assert.match(block, new RegExp(`${variable}\\s*:`));
    assert.match(block, /--background-gradient:\s*none/);
  }
  assert.doesNotMatch(tokens, /(?:linear|radial|conic)-gradient\s*\(/i);
});

test('Quick is the solid default and no public theme switcher exists', () => {
  assert.match(html, /<html[^>]*data-theme="quick"/);
  assert.match(html, /<meta name="theme-color" content="#F3F4F3">/i);
  assert.doesNotMatch(html, /theme-switcher|theme-toggle|主题切换/);
});

test('primary and secondary actions remain visible across themed surfaces', () => {
  assert.match(components, /\.button-primary\s*\{[^}]*color:\s*#fff[^}]*background:\s*var\(--color-action\)/s);
  assert.match(components, /\.button-secondary\s*\{[^}]*background:\s*var\(--color-card-surface\)/s);
  for (const theme of Object.keys(themeColors)) {
    assert.match(themeBlock(theme), /--color-theme-focus:\s*#[0-9a-f]{6}/i);
  }
});

test('loading and evidence visuals stay static and do not generate decorative checks', () => {
  assert.doesNotMatch(components, /@keyframes\s+loading/i);
  assert.doesNotMatch(components, /\.loading-bars\s+span\s*\{[^}]*animation\s*:/s);
  assert.doesNotMatch(components, /content:\s*["']✓["']/);
});

test('dish metadata resolves every item through the exact local manifest contract', () => {
  assert.deepEqual(Object.values(DISH_IMAGE_MANIFEST).sort(), expectedAssetFiles);
  for (const dish of DISHES) {
    const imageKey = dish.metadata.imageKey;
    assert.equal(typeof imageKey, 'string');
    assert.ok(imageKey.trim().length > 0, `${dish.item.name} must have a non-empty imageKey`);
    assert.ok(Object.hasOwn(DISH_IMAGE_MANIFEST, imageKey), `${dish.item.name} uses unknown imageKey ${imageKey}`);
    assert.deepEqual(dish.item.image, {
      src: `./assets/dishes/${DISH_IMAGE_MANIFEST[imageKey]}`,
      alt: `${dish.item.name}菜品灵感示意图`,
      kind: 'dish-inspiration'
    });
  }
});

test('the project-local dish asset set is exact, bounded, 4:3, and metadata-free', () => {
  const packagedAssets = readdirSync(assetsDirectory)
    .filter((file) => /\.(?:webp|svg)$/i.test(file))
    .sort();
  assert.deepEqual(packagedAssets, expectedAssetFiles);

  for (const file of expectedAssetFiles.filter((name) => name.endsWith('.webp'))) {
    const url = new URL(file, assetsDirectory);
    const size = statSync(url).size;
    assert.ok(size > 0, `${file} must not be empty`);
    assert.ok(size <= 180 * 1024, `${file} exceeds 180 KiB: ${size}`);
    const { width, height, chunks } = webpDetails(readFileSync(url));
    assert.deepEqual({ width, height }, { width: 1200, height: 900 }, `${file} must be 1200x900`);
    assert.equal(width / height, 4 / 3);
    for (const metadataChunk of ['EXIF', 'XMP ', 'ICCP', 'ANIM', 'ANMF']) {
      assert.equal(chunks.includes(metadataChunk), false, `${file} contains ${metadataChunk}`);
    }
  }

  const placeholder = readFileSync(new URL('placeholder.svg', assetsDirectory), 'utf8');
  assert.match(placeholder, /^<svg\b/);
  assert.doesNotMatch(placeholder, /<\/?(?:text|script|animate|image|foreignObject)|gradient|(?:href|src)\s*=/i);
});
