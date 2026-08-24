# Task 9 Report: Scenario Result Rendering and Recovery States

## Status

Implementation complete on baseline `4562e5ebb7897ebee956ef211ec4db3d3d8ded54`.

Task 9 now renders the complete Task 7 meal-plan view model as accessible, image-led result markup for single, shared bundle, individual assignment, same-cuisine, compromise, and degraded plans. Loading, empty, and error states retain non-destructive recovery. The browser console-clean gate remains pending Task 10 because this task was explicitly forbidden from creating or packaging the not-yet-present `assets/dishes/*` files.

## Scope and Files

- `src/components/recommendation-card.js`: unified result renderer, semantic multi-person structures, visible reasons/constraints/tradeoffs, two smaller alternatives, image attributes, and guarded one-time placeholder recovery.
- `src/components/feedback.js`: loading busy semantics, strict-exclusion empty copy with two recovery actions, and retained-condition error copy.
- `src/main.js`: full meal-plan view-model wiring and result/empty recovery actions while preserving reducer dispatch, request guards, cancellation, and focus restoration.
- `tests/presentation/recommendation-card.test.js`: focused real-renderer markup and image-event tests.
- `tests/presentation/feedback-state.test.js`: real feedback component action wiring and state semantics.
- `tests/e2e/recommendation-flow.spec.js`: visible reason/image hierarchy, placeholder DOM recovery, empty result recovery, compromise diagnostics, and updated retained-condition return assertions.

No Provider/request contract, recommendation algorithm, flow reducer, persistence, analytics, dependency/workflow, asset, CSS, Phase 6A, or Phase 6B file changed.

## RED Evidence

After adding the presentation behavior tests and before production changes:

```text
node --test tests/presentation/*.test.js
```

failed as expected with 25 passing and 9 failing tests. The failures specifically showed:

- loading had no `aria-busy="true"`;
- empty/error copy and recovery actions were incomplete;
- the inspiration identity, primary image hierarchy, required evidence headings, return action, and image-led alternatives were absent;
- individual/same-cuisine/compromise plans could not be rendered when `primary` was null;
- shared roles, ownership, degradation diagnostics, and per-card reasons were absent;
- no image error listener performed one-time placeholder recovery.

The updated identity test was also run against the old renderer and failed because only the historical `今天吃这个。` copy was present.

## GREEN Implementation

- Result order is identity and scene summary, primary image, dish/context/tags/description, visible `为什么推荐`, `已通过的约束`, `需要知道的取舍`, multi-person structure, `换一个` / `返回修改条件`, then at most two smaller image-led alternatives.
- Every image consumes only the Task 7 `src`, `alt`, and `kind`, and includes explicit dimensions, loading, decoding, image-kind, and hierarchy hooks.
- A non-placeholder image error removes its own listener before changing the DOM to `./assets/dishes/placeholder.svg` and `data-image-kind="placeholder"`; repeated invocation is guarded and leaves no retry loop or logging code.
- Shared plans expose serving-role labels and every item reason. Individual and same-cuisine plans expose deterministic diner headings and per-assignment reasons.
- Compromise/degraded plans identify the uncompleted plan promise, missing diner assignment when present, and diagnostic reason, with condition editing always available.
- Inspiration identity remains `菜品灵感 · 非实时商家信息`; the renderer does not add merchant, price, distance, ETA, stock, availability, or ordering claims.
- Loading keeps the Task 8 cancel/back path; empty confirms exclusions were not relaxed and offers `修改条件` plus `返回上一步`; error retains `重试` plus `返回` and never relies on reset.

## Verification

- `node --test tests/presentation/*.test.js` — PASS (34/34).
- `npm run build` — PASS.
- `npm test` — PASS (130/130).
- `npm run check:js` — PASS (58 JavaScript files).
- `npx playwright test tests/e2e/recommendation-flow.spec.js --grep "empty result"` — PASS (1/1), including retained conditions and returned focus.
- `npx playwright test tests/e2e/recommendation-flow.spec.js --grep "result|placeholder|empty|error"` — 1/7 PASS, 6/7 FAIL only at the shared `afterEach` console-clean assertion. All six failures contain only 404 console messages for absent Task 10 dish/placeholder assets; each test body reached its semantic assertions first. No assertion failed for result identity, visible reasons, image hierarchy, placeholder DOM, multi-person result, compromise diagnosis, or recovery behavior.
- Component fallback test — PASS: handler removed exactly once, DOM changed to the required placeholder, a second invocation did not retry or remove again.
- `git diff --check` — run after report creation before commit.

## Self-Review

- The renderer consumes the existing Task 7 card and meal-plan fields without changing their contracts.
- No source-string inspection substitutes for component behavior; tests call the renderer and invoke its real event listeners.
- Static Provider error is not manufactured. Error retry/back is exercised through the real feedback component as required.
- Task 8 request identity/signal guards and reducer flow remain untouched. Success/empty/error return actions still dispatch through the existing edit/back boundaries, preserving cancellation and focus behavior.
- Image fallback has no `console` calls, inline retry handler, external URL, query flag, mock endpoint, or test hook.

## Concerns

- `assets/dishes/*.webp` and `assets/dishes/placeholder.svg` do not exist in this baseline and the build does not package them. Result browsers therefore emit 404 console errors before/while the Task 9 fallback changes the DOM. Per the Task 9/10 boundary ruling, this task did not create assets, alter the build, route-fulfill resources, add a test hook, clear the console-error array, or weaken the console gate. Task 10 must create/package the approved image manifest and placeholder, then rerun the focused and full E2E suites to close the console-clean gate.
- Final styling and any change to the existing loading-bar motion remain Task 10 scope; Task 9 supplies the static skeleton DOM and preserves the repository's existing reduced-motion rule.
