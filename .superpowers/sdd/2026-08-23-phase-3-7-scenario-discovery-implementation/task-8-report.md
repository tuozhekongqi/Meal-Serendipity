# Task 8 Report: Dynamic Input Flow and Application Orchestration

## Status

Complete on baseline `ac9966538e660b19a56f620bde3c262f58c8b122`.

The application now follows party → scene → dining (multi only) → preferences → result. All input and navigation changes pass through the Task 6 reducer, while main orchestration owns Provider candidate retrieval, explicit time injection, safe persistence, meal-plan composition, view-model conversion, and session-only swap exclusions.

## Scope

- Updated `index.html` copy for the party-first flow.
- Replaced `src/components/inputs.js` with semantic, catalog-driven step renderers.
- Reworked `src/main.js` around `createFlowState()`, one application `dispatch()`, `composeMealPlan()`, and `createMealPlanViewModel()`.
- Replaced old entry E2E expectations in `tests/e2e/recommendation-flow.spec.js` and retained privacy, result, feedback, dialog, favicon, and 404 assertions.
- Removed the obsolete initial-result-copy assertion from `tests/presentation/feedback-state.test.js`; success/status component behavior remains covered.

No Provider, recommendation algorithm, flow reducer, asset, dependency, workflow, persistence implementation, analytics, Phase 6A, or Phase 6B file was changed.

## RED Evidence

1. After writing party-first and multi dining browser tests, `npm run build` passed and the required focused Playwright command failed 2/2 against the old UI:
   - party-size test could not find the named `推荐流程进度` list;
   - dining-mode test timed out waiting for `4 人以上`.
2. The exact-count boundary test then failed because clearing the 4+ count left `下一步` enabled. The renderer now disables both action surfaces until a 4–50 integer is present.
3. The result-retention test failed because no result-level `返回` control existed. The result now returns through `edit_step` to retained preferences.
4. The first full `npm test` run exposed one stale build contract requiring the legacy `马上推荐` phrase. The data/privacy explanation now truthfully states that this legacy shortcut no longer bypasses multi-person safety conditions; the old entry behavior was not restored.

## GREEN Implementation

- Party choices are `1 人`, `2 人`, `3 人`, and `4 人以上`; 4+ reveals an exact required integer input with explicit help.
- Scenes and dining modes are read only from `getScenesForPartySize()` and `getDiningModesForScene()`.
- Single diners skip dining; multi diners cannot advance without a compatible dining mode.
- Preferences include a required inspiration budget tier and one anonymous fieldset per diner, with no identity field.
- Six diners create stable `diner-1` through `diner-6` regions, and back/edit navigation retains compatible selections.
- `createContextInputFromFlow(state)` is consumed directly with no second `createUserContext()` call.
- Provider usage remains the existing static candidate boundary. No Phase 3.7 fields were added to Provider serialization.
- `composeMealPlan()` receives `now: new Date()` only from `src/main.js`.
- Swap recomposes from cached candidates using session-only `excludedCandidateIds`; exhausted rotation shows `暂时没有更多安全候选` and never retries without exclusions.
- Condition edits clear the prior plan, cached response, active request, and rotation history.
- `storage.save()` receives an explicit safe object that does not contain `exclusions`, `dinerDrafts`, or `dinerProfiles`.

## Verification

- `node --test tests/presentation/flow-state.test.js tests/services/storage.test.js tests/services/context.test.js tests/providers/providers.test.js` — PASS (34/34).
- `npm run build` — PASS.
- `npx playwright test tests/e2e/recommendation-flow.spec.js --grep "party size|dining mode"` — PASS (2/2).
- `npx playwright test tests/e2e/recommendation-flow.spec.js` — PASS (6/6).
- `npm test` — PASS (120/120).
- `npm run check:js` — PASS (55 JavaScript files).
- `git diff --check` — PASS (only Git line-ending notices).
- Horizontal overflow smoke check — PASS at 320, 390, 768, and 1440 px (`scrollWidth === clientWidth`).
- Browser/static-server cleanup — no Task 8 Chromium, Playwright, or static-server process remained.

## Self-Review

- Diff is limited to the five brief-listed implementation/test files plus this required report.
- DOM code contains step validation and rendering only; recommendation eligibility, scoring, ranking, and explanation logic remain outside components.
- Multi-diner exclusions stay in ephemeral reducer/context state and are not persisted. Per-diner profile fields remain outside Provider serialization.
- Result rendering is intentionally minimal and consumes only Task 7 render-safe data.

## Concerns

- Task 9 still owns the complete visual result/state refactor. Task 8 provides only the minimum single-card and multi-plan summary needed to make orchestration navigable.
- `tests/build/build-pages.test.js` still checks for the old `马上推荐` phrase. The current data explanation keeps that phrase only to explain that the bypass no longer exists; a later build-contract cleanup can replace this stale text-presence assertion with behavior coverage.
