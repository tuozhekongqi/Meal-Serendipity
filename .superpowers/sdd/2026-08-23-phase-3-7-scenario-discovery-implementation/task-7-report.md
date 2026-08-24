# Task 7 Report: Image-Safe Recommendation and Meal-Plan View Models

## Scope

- Updated `src/presentation/recommendation-view-model.js`.
- Added `src/presentation/meal-plan-view-model.js`.
- Updated `tests/presentation/recommendation-view-model.test.js`.
- Added `tests/presentation/meal-plan-view-model.test.js`.

No UI rendering/orchestration, Provider, eligibility/ranking, flow reducer,
assets, dependencies, workflows, persistence, analytics, or Phase 6A/6B files
were changed.

## RED evidence

After adding the local image, missing image, remote image, and meal-plan
structure tests, this command failed as expected:

```text
node --test tests/presentation/recommendation-view-model.test.js tests/presentation/meal-plan-view-model.test.js
```

- `meal-plan-view-model.js` was missing (`ERR_MODULE_NOT_FOUND`).
- The three recommendation image tests failed because `primary.image` was
  `undefined`.

## GREEN implementation

- The recommendation card now emits an explicit inspiration identity, a copied
  approved local dish image, party and scene labels, and ordered reasons,
  passed constraints, and tradeoffs while retaining existing legacy card fields.
- Any absent or non-conforming image resolves to a fresh neutral placeholder;
  the approved source boundary is exactly `./assets/dishes/<lowercase-key>.webp`
  or `.svg` with `kind: 'dish-inspiration'`.
- The meal-plan view model maps all five Task 5 plan kinds, preserving bundle
  roles, deterministic diner labels (`第 1 位`, `第 2 位`, ...), null assignments,
  and copied degradation diagnostics. Every populated card goes through the
  same image-safe recommendation boundary and retains its visible reasons.

## Verification

- `node --test tests/presentation/recommendation-view-model.test.js tests/presentation/meal-plan-view-model.test.js` — PASS (10/10)
- `node --test tests/presentation/*.test.js tests/providers/providers.test.js` — PASS (41/41)
- `npm test` — PASS (120/120)
- `npm run check:js` — PASS (55 JavaScript files)
- `git diff --check` — PASS

## Concerns

- Task 7 intentionally does not package or validate image assets. The deferred
  Task 2 packaging assertions (`imageKey`, manifest membership, exact source,
  and kind) remain reserved for Task 10/11.
- This task only prepares pure presentation models. Integrating the new meal
  plan model into rendering/orchestration remains within the later Task 8 scope.
