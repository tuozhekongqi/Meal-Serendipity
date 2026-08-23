# Task 3 Report: Scenario Profiles and Backward-Compatible Scoring

## Scope

- Added `src/recommendation/scenario-profiles.js` with immutable profiles for every approved meal scene.
- Added the inspiration-only scoring path in `src/recommendation/score.js`; candidates without a valid scene and all live candidates retain the original scoring body and output.
- Added literal, hand-checked candidate fixtures and scenario scoring tests. No provider, storage, analytics, Phase 6A, UI, asset, documentation, `explain.js`, or `recommend.js` production code was changed.

## TDD Evidence

### RED

Command:

```powershell
node --test tests/recommendation/scenario-profiles.test.js tests/recommendation/score.test.js
```

Actual result: failed as expected. The new profile test could not import the missing `src/recommendation/scenario-profiles.js`; the fixed-pool quick/celebration and economy-tier expectations also failed under legacy ranking.

### GREEN

Commands:

```powershell
node --test tests/recommendation/scenario-profiles.test.js tests/recommendation/score.test.js
node --test tests/recommendation/scenario-profiles.test.js tests/recommendation/score.test.js tests/recommendation/recommend.test.js tests/recommendation/explain.test.js
npm test
```

Actual results:

- Focused scenario and score suite: 13 passed, 0 failed.
- Scenario, score, recommendation, and explanation suite: 21 passed, 0 failed.
- Full suite: 89 passed, 0 failed.

## Coverage

- Every `MEAL_SCENE` resolves to a themed profile whose score weights sum to 100.
- The same static safe pool ranks the convenient bowl first for `solo_quick` and the expressive plate first for `group_celebration`.
- `solo_save` prefers static metadata `priceTier: 1` for the economy tier while `candidate.pricing` remains `null`.
- Scenario ranking is deterministic without exploration.
- A valid meal scene does not change live candidate scoring; an inspiration candidate without a meal scene retains the legacy component shape and has no scenario evidence.

## Verification Notes

- `git diff --check` passed.
- The supplied plan calls this a 90-test regression gate, but this worktree's actual full suite totals 89 passing tests. No existing assertion was removed or weakened.
- No executable Phase 6A 28/28 evaluation harness was present in the scoped test files, so that plan statement was not independently rerun here.
