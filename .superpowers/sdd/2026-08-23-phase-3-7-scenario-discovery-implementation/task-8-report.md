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

---

## Fix Round 1 (2026-08-24)

### Status

Complete. This round addresses every independent-review finding without changing Provider/request contracts, recommendation logic, the flow reducer, assets, dependencies/workflows, persistence contracts, analytics, or Phase 6A/6B behavior. The stale `马上推荐` workaround and the obsolete concern immediately above are now resolved by the artifact-contract change described below.

### Files and Scope

- `src/main.js`: gates every success/empty/error transition on both the active request identity and its non-aborted signal; wires retained-condition returns; restores step focus after back/next/edit; removes the historical privacy-copy shortcut.
- `src/components/inputs.js`: makes the newly rendered step legend/heading programmatically focusable. No visual styling was added.
- `src/components/feedback.js`: adds consistent `返回` actions to loading, empty, and error states while retaining error retry. This is outside the original five-file allowance because these state controls are owned by the feedback component; keeping them in `main.js` would duplicate component markup.
- `src/presentation/request-lifecycle.js`: adds the smallest pure lifecycle boundary for guarded state commits. This is outside the original five-file allowance so the ordinary-error-after-abort race can be tested without a production test hook or Provider mutation.
- `tests/presentation/request-lifecycle.test.js`: covers edit-during-request, ordinary late failure, stale older request, and the current-request commit boundary with real `AbortController` signals.
- `tests/presentation/feedback-state.test.js`: exercises actual component click wiring for loading/empty/error returns and retry.
- `tests/e2e/recommendation-flow.spec.js`: adds keyboard focus behavior, all four dining modes generating real results, privacy copy removal, and swap rotation through exhaustion without repeats or exclusion relaxation.
- `tests/build/build-pages.test.js`: replaces the stale phrase-presence assertion with current build-artifact invariants: non-empty JavaScript, valid JavaScript syntax, and no unresolved relative module imports. This review-authorized scope expansion tests the emitted artifact rather than grepping source copy.

### RED Evidence

1. `node --test tests/presentation/request-lifecycle.test.js tests/presentation/flow-state.test.js` initially failed with `ERR_MODULE_NOT_FOUND` for the not-yet-created lifecycle boundary.
2. `node --test tests/presentation/feedback-state.test.js tests/presentation/request-lifecycle.test.js` failed because loading had no return action and empty still exposed only the historical edit action; error also lacked a retained-condition return callback.
3. After adding the keyboard tests, the focused Playwright run failed 2/2 because each replaced step left focus on `BODY` instead of its legend/heading.
4. The data-dialog browser test failed while the privacy dialog still contained `马上推荐`, demonstrating the obsolete build-test workaround was user-visible.
5. Mutation sensitivity was checked by temporarily composing swaps with `excludedCandidateIds: []`. The swap E2E failed while the primary remained `豆豉鲮鱼饭`, proving the final test detects exclusion relaxation; the production option was then restored and the test passed.

### GREEN Behavior

- `commitIfCurrentRequest()` checks `request.signal.aborted === false` and `activeRequest === request` immediately before every success/empty/error state commit. An aborted request that rejects with a normal error cannot overwrite editing or a newer request.
- Loading, empty, and error surfaces all provide `返回` to retained preferences. Loading return flows through `edit_step`, which aborts and clears the active request. Error keeps `重试` alongside `返回`.
- Back, next, and edit render the destination before focusing its programmatically focusable legend/heading. Mouse behavior and visual styling are unchanged.
- Each supported dining mode reaches an actual composed success result through the shipped static Provider path.
- Swap keeps one session-only exclusion set, never repeats a displayed primary, reaches `暂时没有更多安全候选`, and preserves the last result when exhausted.
- The built JavaScript contract no longer depends on historical UI text, and the privacy dialog no longer mentions the removed shortcut.

### Verification

- `node --test tests/presentation/request-lifecycle.test.js tests/presentation/feedback-state.test.js tests/presentation/flow-state.test.js` — PASS (14/14).
- `node --test tests/build/build-pages.test.js` — PASS (1/1).
- `node --test tests/presentation/flow-state.test.js tests/presentation/request-lifecycle.test.js tests/services/storage.test.js tests/services/context.test.js tests/providers/providers.test.js` — PASS (37/37).
- `npm run build` — PASS.
- `npx playwright test tests/e2e/recommendation-flow.spec.js` — PASS (12/12).
- `npm test` — PASS (123/123).
- `npm run check:js` — PASS (57 JavaScript files).
- `git diff --check` — PASS (Git emitted only line-ending notices).
- Browser/static-server cleanup — PASS; no process whose command line referenced this worktree or Playwright remained after verification.

### Concerns

- The static production Provider has no natural error mode suitable for deterministic browser injection. The race is therefore covered at the pure request-lifecycle boundary with real abort signals, while feedback actions are covered at the real component event boundary; no production test hook was added.
- Task 9 still owns result visual reconstruction, and Task 10 still owns progress/radio-card styling. This fix round deliberately does not change CSS.
