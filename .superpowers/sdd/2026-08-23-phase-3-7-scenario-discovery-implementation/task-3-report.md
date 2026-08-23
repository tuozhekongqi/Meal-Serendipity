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
- Full suite before Fix Round 1: 89 passed, 0 failed.

## Coverage

- Every `MEAL_SCENE` resolves to a themed profile whose score weights sum to 100.
- The same static safe pool ranks the convenient bowl first for `solo_quick` and the expressive plate first for `group_celebration`.
- `solo_save` prefers static metadata `priceTier: 1` for the economy tier while `candidate.pricing` remains `null`.
- Scenario ranking is deterministic without exploration.
- A valid meal scene does not change live candidate scoring; an inspiration candidate without a meal scene retains the legacy component shape and has no scenario evidence.

## Verification Notes

- `git diff --check` passed.
- Before Fix Round 1, the worktree's full suite totaled 89 passing tests. No existing assertion was removed or weakened.
- No executable Phase 6A 28/28 evaluation harness was present in the scoped test files, so that plan statement was not independently rerun here.

## Fix Round 1: No-Scene Legacy Ranking Characterization

Reviewer feedback identified that the no-scene compatibility coverage asserted only the component shape. Added a fixed, literal two-candidate inspiration pool using `rankCandidates(makeContext(), ...)` and hand-derived expectations:

- `inspiration:legacy-taste-match` ranks first with score `67`.
- `inspiration:legacy-taste-miss` ranks second with score `40`.

This is characterization coverage for the preserved legacy path, not a new behavior. It passed directly against the existing implementation; no RED state was fabricated and no production code changed.

Command run:

```powershell
node --test tests/recommendation/scenario-profiles.test.js tests/recommendation/score.test.js
```

Actual result: 14 passed, 0 failed.

Full regression after this characterization addition:

```powershell
npm test
```

Actual result: 90 passed, 0 failed; `git diff --check` also passed.
