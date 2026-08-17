# Background Theme System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five low-saturation CSS background themes with solid Mint as the default while preserving the existing editorial UI and all recommendation boundaries.

**Architecture:** `tokens.css` defines one stable theme-variable interface and five `[data-theme]` implementations. Existing component aliases map onto that interface, so presentation styles consume themed surfaces without JavaScript or domain changes. A text-based contract test guards selector completeness, the default theme, solid backgrounds, button hierarchy, and the absence of a public switcher.

**Tech Stack:** HTML5, CSS custom properties, native JavaScript ES modules, Node.js built-in test runner, Playwright CLI.

## Global Constraints

- Work only on `codex/project-docs-foundation`; do not modify or merge `main`.
- Do not enter Phase 4 or change recommendation, Provider, storage, location, privacy, deployment, or data behavior.
- Do not add a public theme switcher, background image, external resource, remote font, or dependency.
- Default theme is `mint` with solid `#EEF8F1`; no active gradient or decorative glow.
- Primary buttons use `#202020` with white text; no red, coral, orange, or blue filled primary action.
- Focus remains a 3px `#6B4A2F` ring.
- A page activates exactly one theme using the root `data-theme` attribute.

---

### Task 1: Theme contract test

**Files:**
- Create: `tests/presentation/theme-system.test.js`
- Read: `src/styles/tokens.css`
- Read: `src/styles/components.css`
- Read: `index.html`

**Interfaces:**
- Consumes: CSS selector text and the root HTML theme attribute.
- Produces: a regression contract for all five themes and approved button hierarchy.

- [x] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const tokens = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8');
const components = readFileSync(new URL('../../src/styles/components.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const themes = ['neutral', 'mint', 'cream', 'fog', 'air'];
const required = [
  '--color-page-bg', '--color-soft-bg', '--color-card-surface',
  '--color-input-surface', '--color-secondary-surface', '--color-hover-surface',
  '--color-selected-surface', '--color-theme-border',
  '--color-theme-border-strong', '--theme-shadow-color', '--background-gradient'
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
```

- [x] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/presentation/theme-system.test.js`

Expected: FAIL because the five theme selectors and `data-theme="mint"` do not yet exist and the current primary button is white.

- [x] **Step 3: Commit the failing contract when the worktree permits an isolated commit**

An isolated test commit was intentionally skipped because the presentation source files are pre-existing untracked Phase 3 work; staging them would mix phases.

```powershell
git add -- tests/presentation/theme-system.test.js
git commit -m "test: define background theme contract"
```

If pre-existing uncommitted Phase 3 files make an isolated commit unsafe, keep the tested diff uncommitted and report that constraint instead of staging unrelated files.

---

### Task 2: Theme tokens and default activation

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `index.html`
- Test: `tests/presentation/theme-system.test.js`

**Interfaces:**
- Consumes: the required variable names from Task 1.
- Produces: five complete `[data-theme]` blocks and compatibility aliases used by existing presentation CSS.

- [x] **Step 1: Add shared semantic tokens and five complete theme selectors**

Keep text, action, focus, success, warning, and error tokens shared. Add the exact five page/soft/card/secondary colors from the approved specification, theme-aware border values, white input surfaces, hover/selected surfaces, shadow colors, and `--background-gradient: none` in each block.

- [x] **Step 2: Map existing aliases to theme variables**

```css
--color-bg: var(--color-page-bg);
--color-surface: var(--color-card-surface);
--color-surface-raised: var(--color-hover-surface);
--color-surface-selected: var(--color-selected-surface);
--color-border: var(--color-theme-border);
--color-border-strong: var(--color-theme-border-strong);
```

Keep inactive optional Mint and Cream gradient recipes in named documentation variables only; do not feed them into the body background.

- [x] **Step 3: Activate Mint at the root**

Change the opening element to:

```html
<html lang="zh-CN" data-theme="mint">
```

Set `<meta name="theme-color">` to `#EEF8F1`. Do not add controls or JavaScript.

- [x] **Step 4: Run the focused contract**

Run: `node --test tests/presentation/theme-system.test.js`

Expected: the selector/default tests pass; the component surface test may remain red until Task 3.

---

### Task 3: Surface and control mapping

**Files:**
- Modify: `src/styles/base.css`
- Modify: `src/styles/components.css`
- Modify: `src/styles/responsive.css`
- Modify: `docs/design-system.md`
- Test: `tests/presentation/theme-system.test.js`

**Interfaces:**
- Consumes: theme variables from Task 2.
- Produces: themed page, header, two main work regions, controls, states, mobile bar, and dialog.

- [x] **Step 1: Apply the page and structural surfaces**

Use `--color-page-bg` for `html` and `body`, `--color-card-surface` for the header and two main work regions, and `--color-soft-bg` only where a quiet secondary layer is needed. Add one-pixel borders and `--shadow-surface`; avoid decorative gradients and glows.

- [x] **Step 2: Apply component surfaces**

Map scene cards, choices, fields, state visuals, dialog, and mobile bar to card/input/hover/selected variables. Internal result sections remain line-based rather than becoming nested floating cards.

- [x] **Step 3: Restore the approved graphite primary hierarchy**

```css
.button-primary {
  color:#fff;
  border-color:var(--color-action);
  background:var(--color-action);
}
.button-primary:hover {
  border-color:var(--color-action-hover);
  background:var(--color-action-hover);
}
.button-secondary {
  color:var(--color-text);
  border-color:var(--color-theme-border-strong);
  background:var(--color-card-surface);
}
```

- [x] **Step 4: Document the five themes and superseding button decision**

Update `docs/design-system.md` with the default Mint decision, selector contract, all five theme values, solid-background rule, and graphite-primary hierarchy. Remove wording that says primary buttons are white.

- [x] **Step 5: Run focused and full tests**

Run:

```powershell
node --test tests/presentation/theme-system.test.js
npm test
git diff --check
```

Expected: all tests pass and `git diff --check` exits zero.

---

### Task 4: Browser and theme matrix verification

**Files:**
- No production files unless a failing browser check is first reproduced.
- Temporary screenshots: visualization workspace only; delete after review.

**Interfaces:**
- Consumes: finished CSS theme contract.
- Produces: visual and behavioral evidence without repository artifacts.

- [x] **Step 1: Verify prerequisites and open the preview**

Confirm `npx --version`, verify `http://127.0.0.1:4173/` returns 200, and open it through the Playwright CLI wrapper/session.

- [x] **Step 2: Check all themes and widths**

For each of `neutral`, `mint`, `cream`, `fog`, and `air`, set the root `data-theme` attribute in the browser and inspect 320, 390, 768, 1024, and 1440 pixels. Record page/card/input/button computed colors, button borders, body overflow, and screenshots for visual review.

- [x] **Step 3: Exercise complete behavior**

Use snapshots and current refs to exercise initial, quick recommendation, precise filtering, three candidates, swap, loading, empty, error, degraded Provider notice, and dialog. Confirm the inspiration truth notice still excludes real price, distance, ETA, merchant, and availability claims.

- [x] **Step 4: Verify accessibility and resources**

Confirm 3px focus outline, dialog trap and focus restoration, minimum control heights, readable text, zero console errors/warnings, all static requests returning 200, no remote resources, and zero horizontal overflow.

- [x] **Step 5: Re-run completion gates and clean artifacts**

Run fresh `npm test`, `git diff --check`, theme-token scans, and `git status --short`. Close the browser session, remove temporary screenshots/session artifacts from the visualization workspace, keep the preview server available, and stop before Phase 4.

## Plan Self-review

- Every approved theme, variable, button rule, default, surface, state, breakpoint, and truth boundary maps to a task.
- No public switcher, JavaScript theme state, gradient activation, remote resource, domain change, or Phase 4 work is included.
- `data-theme`, variable names, test names, and file paths are consistent across tasks.
- No placeholders or ambiguous future implementation steps remain.
