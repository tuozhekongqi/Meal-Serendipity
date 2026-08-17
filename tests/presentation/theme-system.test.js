import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const tokens = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8');
const components = readFileSync(new URL('../../src/styles/components.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const themes = ['neutral', 'mint', 'cream', 'fog', 'air'];
const required = [
  '--color-page-bg',
  '--color-soft-bg',
  '--color-card-surface',
  '--color-input-surface',
  '--color-secondary-surface',
  '--color-hover-surface',
  '--color-selected-surface',
  '--color-theme-border',
  '--color-theme-border-strong',
  '--theme-shadow-color',
  '--background-gradient'
];

function themeBlock(name) {
  return tokens.match(new RegExp(`\\[data-theme=["']${name}["']\\]\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? '';
}

test('all five themes implement the complete surface contract', () => {
  for (const theme of themes) {
    const block = themeBlock(theme);
    assert.ok(block, `missing ${theme} selector`);
    for (const variable of required) assert.match(block, new RegExp(`${variable}\\s*:`));
    assert.match(block, /--background-gradient:\s*none/);
    assert.match(block, /--theme-shadow-color:\s*rgba\(23,\s*23,\s*23,/);
  }
});

test('Mint is the solid default and no public theme switcher exists', () => {
  assert.match(html, /<html[^>]*data-theme="mint"/);
  assert.match(themeBlock('mint'), /--color-page-bg:\s*#eef8f1/i);
  assert.doesNotMatch(html, /theme-switcher|theme-toggle|主题切换/);
});

test('primary and secondary actions remain visible across themed surfaces', () => {
  assert.match(components, /\.button-primary\s*\{[^}]*color:\s*#fff[^}]*background:\s*var\(--color-action\)/s);
  assert.match(components, /\.button-secondary\s*\{[^}]*background:\s*var\(--color-card-surface\)/s);
  assert.match(tokens, /--color-focus:\s*#6b4a2f/i);
});
