# Phase 5 Testing and GitHub Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic production builds, browser-flow coverage, pull-request CI, and an opt-in GitHub Actions Pages deployment that publishes only `dist/`.

**Architecture:** Keep the existing browser application and recommendation/provider contracts unchanged. A small Node build script bundles the existing ES modules and CSS into a clean `dist/`, while Playwright exercises that built output under the repository subpath. CI validates every pull request; the Pages workflow deploys only after checks and build succeed, and the repository setting remains legacy until the owner manually switches it.

**Tech Stack:** Node.js 22, Node test runner, esbuild, Playwright, GitHub Actions, GitHub Pages

## Global Constraints

- Do not modify recommendation domain logic.
- Do not modify Provider, location, storage, or privacy contracts.
- Do not connect a real delivery platform.
- Do not modify or push `main` directly.
- Preserve the current `main` root deployment until the owner manually selects GitHub Actions.
- Production output contains only the runtime site, favicon, and custom 404 page.

---

### Task 1: Production build contract

**Files:**
- Create: `tests/build/build-pages.test.js`
- Create: `scripts/build-pages.mjs`
- Create: `scripts/check-dist.mjs`
- Create: `scripts/check-js.mjs`
- Modify: `package.json`
- Create: `package-lock.json`

**Interfaces:**
- Consumes: root `index.html`, `src/main.js`, and `src/styles/*.css`.
- Produces: `npm run check:js`, `npm run build`, `npm run check:dist`, and a clean `dist/` with `index.html`, `404.html`, favicon files, and bundled `assets/`.

- [ ] **Step 1: Write a failing build-contract test**

  Run the build against a temporary output directory and assert that runtime entry files exist, HTML references the repository-safe bundled assets, and repository-only paths (`tests`, `docs`, `src`, `.github`) are absent.

- [ ] **Step 2: Run the build-contract test and verify it fails because the build script is missing**

  Run: `node --test tests/build/build-pages.test.js`

- [ ] **Step 3: Implement the minimal deterministic build and artifact validator**

  Bundle JavaScript with esbuild, concatenate the four approved CSS layers, rewrite the HTML asset references, copy the custom 404 and favicon, generate a fallback `favicon.ico`, and validate a strict production allowlist.

- [ ] **Step 4: Run the build-contract and existing unit tests**

  Run: `node --test tests/build/build-pages.test.js` and `npm test`.

### Task 2: Built-site end-to-end coverage

**Files:**
- Create: `tests/e2e/recommendation-flow.spec.js`
- Create: `playwright.config.js`
- Create: `scripts/serve-static.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `dist/` and the `/Meal-Serendipity/` deployment subpath.
- Produces: `npm run test:e2e`, covering initial state, quick recommendation, precise three-step flow, swap, feedback, dialog keyboard behavior, refresh restoration, console cleanliness, and failed resources.

- [ ] **Step 1: Write the browser-flow tests before the server/config exists**

- [ ] **Step 2: Run the E2E command and verify the expected configuration/server failure**

- [ ] **Step 3: Add the minimal static server and Playwright configuration**

- [ ] **Step 4: Build and run Chromium E2E against the generated site**

  Run: `npm run build` followed by `npm run test:e2e`.

### Task 3: Site identity and custom 404

**Files:**
- Create: `favicon.svg`
- Create: `404.html`
- Modify: `index.html`
- Test: `tests/build/build-pages.test.js`

**Interfaces:**
- Consumes: the approved neutral/Mint visual tokens.
- Produces: an explicit SVG favicon reference, generated ICO fallback, and a standalone custom 404 consistent with the current visual system.

- [ ] **Step 1: Extend the failing build test for favicon references and the custom 404**

- [ ] **Step 2: Verify failure for the missing files/reference**

- [ ] **Step 3: Add the minimal accessible SVG favicon and standalone 404 page**

- [ ] **Step 4: Rebuild and verify both direct HTTP responses and browser rendering**

### Task 4: Pull-request CI and guarded Pages deployment

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/pages.yml`

**Interfaces:**
- Consumes: locked npm dependencies and all package validation scripts.
- Produces: PR checks and a `main`/manual Pages workflow that uploads only `dist/`; deployment depends on a successful validation/build job.

- [ ] **Step 1: Add CI for JavaScript syntax, unit tests, build validation, and Chromium E2E**

- [ ] **Step 2: Add Pages build/deploy jobs with least-privilege permissions and non-cancelling deployment concurrency**

- [ ] **Step 3: Parse both workflow files locally and inspect triggers, permissions, dependencies, and artifact path**

### Task 5: Documentation and final verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Produces: exact local commands, current-vs-future deployment state, manual switch instructions, rollback steps, and production artifact contents.

- [ ] **Step 1: Update README without claiming the repository setting has already changed**

- [ ] **Step 2: Run `npm run check:js`, `npm test`, `npm run build`, `npm run check:dist`, and `npm run test:e2e` fresh**

- [ ] **Step 3: Inspect `dist/`, favicon, custom 404, workflows, Git diff, and online continuity assumptions**

- [ ] **Step 4: Stop after Phase 5; do not start Phase 6**
