# Phase 3.7 Scenario Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a scenario-first, image-led static food discovery flow that supports single diners and explainable multi-person meal plans without introducing live provider data or telemetry.

**Architecture:** Add stable scenario and dining-mode contracts in the domain layer, explicit discovery metadata in the static data layer, and scenario-aware scoring that preserves the existing recommendation engine's pure-function boundary. A separate pure meal-plan composer will call the existing `recommend()` function for shared, individual, same-cuisine, and compromise results; presentation and DOM modules will consume view models rather than recommendation internals.

**Tech Stack:** HTML5, CSS3, native JavaScript ES modules, Node.js built-in test runner, esbuild, Playwright, GitHub Pages static artifacts.

**Spec:** `docs/superpowers/plans/2026-08-23-phase-3-7-scenario-discovery-design.md`

## Global Constraints

- Work only on `codex/phase-3-7-scenario-discovery`, based on `origin/main`; never modify `main` or `codex/phase-6a-metrics-privacy`.
- Do not start Phase 6B or create analytics, SDKs, event endpoints, behavior uploads, or telemetry interfaces.
- Do not modify `src/providers/*`, connect a real takeaway provider, or expose real merchant, price, distance, ETA, availability, inventory, or ordering claims.
- Do not change the privacy rules: exclusions and per-diner exclusion text remain in memory only and never enter storage, URLs, provider requests, logs, or uploads.
- Do not add dependencies or modify `.github/workflows/*`.
- Keep `recommend()` deterministic and independent of DOM, browser storage, network, ambient time, and ambient randomness.
- Continue treating exclusions as hard constraints in every single- and multi-person path.
- Static candidates and images must remain visibly labeled as dish inspiration, not live merchant information.
- Design mobile-first from 320px and verify 320px, 390px, 768px, 1024px, and 1440px.
- Preserve WCAG 2.2 AA, 44×44px controls, keyboard focus, dialog behavior, reduced motion, and 200% zoom support.
- Keep the existing 90-test baseline green; never weaken or delete a passing assertion merely to accommodate the new implementation.
- Do not push, create a PR, deploy, or start Phase 6B when this plan is complete.

---

## File and Responsibility Map

### Domain and state contracts

- Create `src/domain/scenarios.js`: scenario, dining-mode, budget-tier, party-size-bucket, theme, label, and availability catalog shared by recommendation and UI.
- Modify `src/domain/models.js`: JSDoc contracts and exported enums for Phase 3.7 context, image, discovery metadata, and meal-plan results.
- Modify `src/services/context.js`: normalize new in-memory context fields while keeping `toProviderRequest()` byte-for-byte equivalent in shape.
- Create `src/presentation/flow-state.js`: pure step navigation, dependent-field invalidation, anonymous diner draft management, and condition retention.

### Static discovery data

- Create `src/data/dish-discovery-metadata.js`: audited category defaults, named overrides, image manifest, cuisine tags, roles, supported dining modes, and discovery traits.
- Modify `src/data/dishes.js`: merge discovery metadata and local `item.image` into all 175 static candidates without changing legacy fields.
- Create `assets/dishes/*`: project-local dish inspiration assets plus a neutral placeholder and a source-boundary README.

### Recommendation

- Create `src/recommendation/scenario-profiles.js`: scenario-specific score weights, desired traits, group-fit rules, and evidence codes.
- Modify `src/recommendation/score.js`: add a scenario-aware inspiration scoring path; preserve the current path for contexts without `mealScene` and for live candidates.
- Modify `src/recommendation/explain.js`: convert score evidence into honest scenario, budget, and group reasons.
- Modify `src/recommendation/recommend.js`: carry additive evidence through the existing result without changing its public call signature.
- Create `src/recommendation/meal-plan.js`: compose single, shared bundle, individual set, same-cuisine set, and compromise plans exclusively through `recommend()`.

### Presentation and UI

- Modify `src/presentation/recommendation-view-model.js`: add safe local image, scene, party, and inspiration-boundary fields to a single recommendation card.
- Create `src/presentation/meal-plan-view-model.js`: map meal-plan kinds, assignments, bundles, alternatives, reasons, constraints, and tradeoffs to render-safe data.
- Modify `src/components/inputs.js`: render the dynamic party → scene → dining mode → budget/taste flow.
- Modify `src/components/recommendation-card.js`: render the large primary image, reasons, constraints, tradeoffs, multi-person structures, alternatives, swap, and edit actions.
- Modify `src/components/feedback.js`: render accessible loading, empty, error, return, retry, and degraded-inspiration states.
- Modify `src/main.js`: orchestrate the pure flow reducer, context creation, provider call, `composeMealPlan()`, focus, swap, and condition editing.
- Modify `index.html`: update shell copy and stable semantic regions without embedding application data.

### Visual system, build, and documentation

- Modify `src/styles/tokens.css`, `base.css`, `components.css`, and `responsive.css`: scene themes, image-led discovery layout, step controls, multi-person presentation, state treatment, and five viewport bands.
- Modify `scripts/build-pages.mjs` and `scripts/check-dist.mjs`: copy and allow only approved dish assets.
- Modify build, domain, recommendation, presentation, service, and E2E tests listed per task below.
- Update `README.md`, `docs/product-brief.md`, `docs/design-system.md`, `docs/current-behavior-checklist.md`, `docs/current-modern-ui-checklist.md`, and `docs/implementation-plan.md` only after implementation behavior is verified.

## Compatibility Strategy for the Existing 90 Tests

1. Record `npm test` = 90 passed before implementation; this baseline is already established in the isolated worktree.
2. Make every new model field optional and normalized to a backward-compatible default.
3. Use the existing scoring path when `context.mealScene` is absent, so current score and recommendation fixtures retain their results.
4. Keep `toProviderRequest()` output keys unchanged and add a regression assertion that all new Phase 3.7 fields are absent.
5. Keep `imageUrl` and every legacy dish field; add `item.image` and discovery metadata rather than replacing existing fields.
6. Do not modify `src/providers/*`, `src/services/storage.js`, legacy adapters, Phase 6A fixtures, privacy schema, or analytics boundary audit.
7. Run the affected test file after each red/green cycle, `npm test` after Tasks 3, 5, 8, and 10, and the full validation suite in Task 12.
8. If an existing test fails, diagnose the compatibility regression before changing any assertion; only extend assertions where the approved contract is additive.

---

### Task 1: Lock Domain Enums and Context Normalization

**Files:**
- Create: `src/domain/scenarios.js`
- Modify: `src/domain/models.js`
- Modify: `src/services/context.js`
- Modify: `tests/services/context.test.js`
- Create: `tests/domain/scenarios.test.js`

**Interfaces:**
- Produces: `PARTY_SIZE_BUCKET`, `MEAL_SCENE`, `DINING_MODE`, `INSPIRATION_BUDGET_TIER`, `SCENE_CATALOG`, `getScenesForPartySize(partySize)`, `getDiningModesForScene(mealScene)`, and normalized Phase 3.7 fields from `createUserContext(input)`.
- Preserves: exact `toProviderRequest(userContext, meta)` request shape currently consumed by `HttpCandidateProvider`.

- [ ] **Step 1: Write failing scenario catalog tests**

```js
test('single and multi party sizes expose disjoint approved scene sets', () => {
  assert.deepEqual(getScenesForPartySize(1).map(({ value }) => value), [
    'solo_quick', 'solo_focus', 'solo_treat',
    'solo_late_night', 'solo_lighter', 'solo_save'
  ]);
  assert.deepEqual(getScenesForPartySize(3).map(({ value }) => value), [
    'group_gathering', 'group_individual', 'group_mixed_taste',
    'group_family', 'group_celebration'
  ]);
});

test('multi scenes expose all four dining modes without silently selecting one', () => {
  assert.deepEqual(getDiningModesForScene('group_individual').map(({ value }) => value), [
    'individual', 'shared', 'shared_main_personal', 'undecided'
  ]);
});
```

- [ ] **Step 2: Run the new domain test and verify it fails**

Run: `node --test tests/domain/scenarios.test.js`  
Expected: FAIL because `src/domain/scenarios.js` does not exist.

- [ ] **Step 3: Implement the immutable scenario catalog and selectors**

```js
export const PARTY_SIZE_BUCKET = Object.freeze({ ONE: '1', TWO: '2', THREE: '3', FOUR_PLUS: '4_plus' });
export const DINING_MODE = Object.freeze({
  SHARED: 'shared',
  INDIVIDUAL: 'individual',
  SHARED_MAIN_PERSONAL: 'shared_main_personal',
  UNDECIDED: 'undecided'
});

export function getScenesForPartySize(partySize) {
  const audience = Number(partySize) === 1 ? 'single' : 'multi';
  return SCENE_CATALOG.filter((scene) => scene.audience === audience);
}

export function getDiningModesForScene(mealScene) {
  const scene = SCENE_CATALOG.find(({ value }) => value === mealScene);
  if (!scene || scene.audience === 'single') return [];
  return scene.suggestedDiningModes.map((value) => DINING_MODE_CATALOG[value]);
}
```

- [ ] **Step 4: Add failing context normalization and provider-boundary tests**

```js
test('context normalizes party, scenario, dining mode, budget tier and anonymous diners', () => {
  const context = createUserContext({
    partySize: 4,
    partySizeBucket: '4_plus',
    mealScene: 'group_mixed_taste',
    diningMode: 'shared_main_personal',
    inspirationBudgetTier: 'everyday',
    dinerProfiles: [
      { id: 'diner-1', tastePreferences: ['辣'], exclusions: ['花生'] },
      { id: 'diner-2', tastePreferences: ['清淡'], exclusions: [] }
    ]
  });
  assert.equal(context.mealScene, 'group_mixed_taste');
  assert.equal(context.dinerProfiles[0].id, 'diner-1');
});

test('phase 3.7 fields never enter a provider request', () => {
  const request = toProviderRequest(createUserContext({
    mealScene: 'solo_quick',
    diningMode: null,
    inspirationBudgetTier: 'economy',
    dinerProfiles: [{ id: 'diner-1', exclusions: ['花生'] }]
  }), { requestId: 'request-3-7', requestedAt: NOW });
  const serialized = JSON.stringify(request);
  for (const forbidden of ['mealScene', 'diningMode', 'inspirationBudgetTier', 'dinerProfiles']) {
    assert.equal(serialized.includes(forbidden), false);
  }
});
```

- [ ] **Step 5: Extend JSDoc and implement bounded normalization**

Normalize valid enum values, `partySize` from 1 to 50, at most 50 anonymous diner profiles, at most three tastes per diner, and at most 30 exclusions per diner. A single-person context forces `diningMode: null`; an incompatible scene normalizes to `null` instead of guessing.

- [ ] **Step 6: Run domain, context, provider, and privacy tests**

Run: `node --test tests/domain/scenarios.test.js tests/services/context.test.js tests/providers/providers.test.js tests/privacy/phase-6a-schema-contract.test.js`  
Expected: all tests PASS; provider request snapshots contain no Phase 3.7 fields.

- [ ] **Step 7: Commit the domain contract**

```powershell
git add docs/superpowers/plans src/domain src/services/context.js tests/domain tests/services/context.test.js
git commit -m "feat: define phase 3.7 scenario contracts"
```

**Acceptance:** All approved scenes and dining modes are represented once, invalid combinations are rejected rather than guessed, and the provider request contract is unchanged.

---

### Task 2: Add Audited Discovery Metadata and Image Contracts

**Files:**
- Create: `src/data/dish-discovery-metadata.js`
- Modify: `src/data/dishes.js`
- Modify: `tests/recommendation/dishes.test.js`

**Interfaces:**
- Consumes: enums from `src/domain/scenarios.js`.
- Produces: `getDishDiscoveryMetadata(dish)`, `DISH_IMAGE_MANIFEST`, `item.image`, `metadata.cuisineTags`, `servingRoles`, `supportedDiningModes`, `discoveryTraits`, and `imageKey` for all static candidates.

- [ ] **Step 1: Extend dish tests with additive metadata assertions**

```js
test('all static dishes expose bounded discovery metadata and a local image contract', () => {
  for (const dish of DISHES) {
    assert.ok(dish.item.image === null || dish.item.image.src.startsWith('./assets/dishes/'));
    assert.ok(dish.metadata.cuisineTags.length >= 1);
    assert.ok(dish.metadata.servingRoles.length >= 1);
    assert.ok(dish.metadata.supportedDiningModes.length >= 1);
    for (const value of Object.values(dish.metadata.discoveryTraits)) {
      assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
    }
  }
});
```

- [ ] **Step 2: Run the dish test and verify the new assertions fail**

Run: `node --test tests/recommendation/dishes.test.js`  
Expected: FAIL because discovery metadata and `item.image` are absent.

- [ ] **Step 3: Implement category defaults and explicit named overrides**

```js
const CATEGORY_DEFAULTS = Object.freeze({
  米饭: metadata({ cuisineTags: ['家常'], servingRoles: ['staple'], traits: { convenient: .9, filling: .9 } }),
  粉面: metadata({ cuisineTags: ['面食'], servingRoles: ['staple'], traits: { convenient: .85, comforting: .75 } }),
  锅仔: metadata({ cuisineTags: ['锅物'], servingRoles: ['shared-main'], traits: { shareable: .9, comforting: .9 } })
});

const DISH_OVERRIDES = Object.freeze({
  芝香披萨套餐: metadata({ cuisineTags: ['西式'], servingRoles: ['shared-main'], traits: { shareable: 1, expressive: .8 } }),
  日式寿司便当: metadata({ cuisineTags: ['日式'], servingRoles: ['individual-main'], traits: { lighter: .8, expressive: .8 } })
});

export function getDishDiscoveryMetadata(dish) {
  return mergeMetadata(CATEGORY_DEFAULTS[dish.ty], DISH_OVERRIDES[dish.n]);
}
```

Implement every current category default and enough explicit cuisine overrides to support same-cuisine tests. Metadata assignment remains data-driven; recommendation code must not inspect dish names.

- [ ] **Step 4: Merge metadata into static candidates without changing legacy fields**

```js
const discovery = getDishDiscoveryMetadata(dish);
item: Object.freeze({
  ...existingItem,
  image: discovery.imageKey ? Object.freeze({
    src: `./assets/dishes/${DISH_IMAGE_MANIFEST[discovery.imageKey]}`,
    alt: `${dish.n}菜品灵感示意图`,
    kind: 'dish-inspiration'
  }) : null
}),
metadata: Object.freeze({ ...existingMetadata, ...discovery })
```

- [ ] **Step 5: Run dish, filter, legacy adapter, and provider tests**

Run: `node --test tests/recommendation/dishes.test.js tests/recommendation/filter.test.js tests/recommendation/legacy-adapter.test.js tests/providers/providers.test.js`  
Expected: PASS; 175/175 candidates remain unique and inspiration-only.

- [ ] **Step 6: Commit static discovery metadata**

```powershell
git add src/data/dish-discovery-metadata.js src/data/dishes.js tests/recommendation/dishes.test.js
git commit -m "feat: add audited dish discovery metadata"
```

**Acceptance:** All 175 dishes retain their legacy recommendation fields, gain bounded discovery metadata, and reference only approved local image paths or `null`.

---

### Task 3: Implement Scenario Profiles and Backward-Compatible Scoring

**Files:**
- Create: `src/recommendation/scenario-profiles.js`
- Modify: `src/recommendation/score.js`
- Create: `tests/recommendation/scenario-profiles.test.js`
- Modify: `tests/recommendation/score.test.js`

**Interfaces:**
- Consumes: `mealScene`, `diningMode`, `inspirationBudgetTier`, candidate discovery metadata.
- Produces: `getScenarioProfile(mealScene)`, `scoreScenarioEvidence(context, candidate)`, and additive `evidence` on scored inspiration candidates.
- Preserves: existing `scoreCandidate()` and `rankCandidates()` signatures and legacy output ordering when `mealScene` is absent.

- [ ] **Step 1: Write profile completeness and weight tests**

```js
test('every approved scene has normalized scoring weights and a theme', () => {
  for (const scene of Object.values(MEAL_SCENE)) {
    const profile = getScenarioProfile(scene);
    assert.equal(Object.values(profile.scoreWeights).reduce((sum, value) => sum + value, 0), 100);
    assert.ok(profile.reasonCode);
    assert.ok(profile.theme);
  }
});
```

- [ ] **Step 2: Write fixed-pool tests proving scene changes the recommendation**

```js
test('quick and celebration scenes choose different candidates from the same safe pool', () => {
  const quick = rankCandidates(context({ mealScene: 'solo_quick' }), [convenientBowl, expressivePlate]);
  const celebration = rankCandidates(context({ mealScene: 'group_celebration', partySize: 2 }), [convenientBowl, expressivePlate]);
  assert.equal(quick[0].candidate.id, convenientBowl.id);
  assert.equal(celebration[0].candidate.id, expressivePlate.id);
});

test('save scene prefers matching static price tier without creating live pricing', () => {
  const ranked = rankCandidates(context({ mealScene: 'solo_save', inspirationBudgetTier: 'economy' }), [tierFour, tierOne]);
  assert.equal(ranked[0].candidate.id, tierOne.id);
  assert.equal(ranked[0].candidate.pricing, null);
});
```

- [ ] **Step 3: Run the tests and verify they fail for missing profiles**

Run: `node --test tests/recommendation/scenario-profiles.test.js tests/recommendation/score.test.js`  
Expected: FAIL because scenario scoring is not implemented.

- [ ] **Step 4: Implement explicit profiles and evidence calculation**

```js
export function scoreScenarioEvidence(context, candidate) {
  const profile = getScenarioProfile(context.mealScene);
  const scenario = weightedTraitMatch(profile.traitWeights, candidate.metadata?.discoveryTraits);
  const budget = inspirationBudgetMatch(context.inspirationBudgetTier, candidate.metadata?.priceTier);
  const group = diningModeMatch(context.diningMode, candidate.metadata?.supportedDiningModes);
  return {
    components: { scenario, budget, group },
    evidence: {
      sceneReasonCode: scenario >= profile.reasonThreshold ? profile.reasonCode : null,
      inspirationBudgetMatched: budget >= .75,
      diningModeMatched: group >= .75,
      matchedTraits: matchedTraitNames(profile.traitWeights, candidate.metadata?.discoveryTraits)
    }
  };
}
```

In `scoreCandidate()`, use the new scenario path only when `candidate.sourceMode === 'inspiration'` and `context.mealScene` resolves to a profile. Otherwise execute the current scoring body unchanged.

- [ ] **Step 5: Run the new tests and all existing scoring/recommendation tests**

Run: `node --test tests/recommendation/scenario-profiles.test.js tests/recommendation/score.test.js tests/recommendation/recommend.test.js tests/recommendation/explain.test.js`  
Expected: PASS; all pre-Phase-3.7 fixture rankings remain unchanged.

- [ ] **Step 6: Run the full 90-test regression gate**

Run: `npm test`  
Expected: at least 90 tests PASS, 0 failures; Phase 6A evaluation remains 28/28 and stable across 20 runs.

- [ ] **Step 7: Commit scenario scoring**

```powershell
git add src/recommendation/scenario-profiles.js src/recommendation/score.js tests/recommendation
git commit -m "feat: make meal scenes affect inspiration ranking"
```

**Acceptance:** Every scene has explicit weights, fixed inputs demonstrate different scene outcomes, the economy scene uses only static price tiers, and all legacy score tests still pass.

---

### Task 4: Add Evidence-Backed Scenario Reasons

**Files:**
- Modify: `src/domain/models.js`
- Modify: `src/recommendation/explain.js`
- Modify: `src/recommendation/recommend.js`
- Modify: `tests/recommendation/explain.test.js`
- Modify: `tests/recommendation/recommend.test.js`

**Interfaces:**
- Consumes: additive `scored.evidence` from Task 3.
- Produces: scenario, inspiration-budget, and dining-mode reason codes in existing `Recommendation.reasons`; retains `live_data_unavailable` for every inspiration recommendation.

- [ ] **Step 1: Write failing reason-evidence tests**

```js
test('shows a quick-scene reason only when quick evidence crosses its threshold', () => {
  const explained = explainRecommendation(quickContext, scored({
    evidence: { sceneReasonCode: 'quick_reliable_match', matchedTraits: ['convenient', 'stable'] }
  }), ['exclusion']);
  assert.ok(explained.reasonCodes.includes('quick_reliable_match'));
});

test('never turns an inspiration budget tier into a real-price claim', () => {
  const explained = explainRecommendation(saveContext, scored({
    evidence: { inspirationBudgetMatched: true }
  }), ['exclusion']);
  assert.ok(explained.reasonCodes.includes('inspiration_budget_match'));
  assert.equal(explained.reasonCodes.includes('within_budget'), false);
  assert.match(explained.reasons.find(({ code }) => code === 'inspiration_budget_match').message, /预算档/);
});
```

- [ ] **Step 2: Run explanation tests and verify failure**

Run: `node --test tests/recommendation/explain.test.js tests/recommendation/recommend.test.js`  
Expected: FAIL because the new reason codes are unknown.

- [ ] **Step 3: Add exact reason codes and safe Chinese messages**

Add `REASON_CODE` values for quick, focus, lighter, treat, late-night, saving, shareable, individual taste, same-cuisine variety, family, and celebration evidence. Messages must describe observable candidate attributes, for example：

```js
quick_reliable_match: '这类菜做选择简单，也更符合快速解决的一餐',
inspiration_budget_match: '静态菜品档位符合你选择的预算倾向',
shareable_match: '菜品结构适合多人共享和搭配'
```

Do not use “实时价格”“附近”“可下单”“保证健康” or merchant claims for inspiration reasons.

- [ ] **Step 4: Carry evidence through `recommend()` without changing its signature**

```js
function buildRecommendation(context, scored, passedConstraints) {
  return {
    ...scored,
    ...explainRecommendation(context, scored, passedConstraints)
  };
}
```

Keep the existing shape and add only `evidence`; existing consumers remain valid.

- [ ] **Step 5: Run explanation, presentation, and privacy tests**

Run: `node --test tests/recommendation/explain.test.js tests/recommendation/recommend.test.js tests/presentation/recommendation-view-model.test.js tests/privacy/phase-6a-schema-contract.test.js`  
Expected: PASS; reasons are visible data, not telemetry events.

- [ ] **Step 6: Commit explainability changes**

```powershell
git add src/domain/models.js src/recommendation/explain.js src/recommendation/recommend.js tests/recommendation
git commit -m "feat: explain scenario recommendation evidence"
```

**Acceptance:** Every displayed scenario reason has score evidence, static budget wording cannot be confused with live price, and the inspiration limitation remains present.

---

### Task 5: Compose Single and Multi-Person Meal Plans Through `recommend()`

**Files:**
- Create: `src/recommendation/meal-plan.js`
- Create: `tests/recommendation/meal-plan.test.js`
- Modify: `tests/recommendation/fixtures.js`

**Interfaces:**
- Consumes: `recommend(context, candidates, options)` only; must not call `filterCandidates()` or `rankCandidates()` directly.
- Produces: `composeMealPlan(context, candidates, options)` returning:

```js
{
  kind: 'single' | 'shared_bundle' | 'individual_set' | 'same_cuisine_set' | 'compromise',
  primary: Recommendation | null,
  alternatives: Recommendation[],
  items: Array<{ role: string, recommendation: Recommendation }>,
  dinerAssignments: Array<{ dinerId: string, recommendation: Recommendation | null }>,
  contextSummary: { partySize: number, mealScene: string, diningMode: string | null },
  diagnostics: { missingDinerIds: string[], degradedFrom: string | null, reason: string | null }
}
```

- [ ] **Step 1: Write a failing single and shared-bundle test**

```js
test('shared mode returns a safe complementary bundle instead of one dish for everyone', () => {
  const plan = composeMealPlan(sharedContext, candidates, { now: NOW });
  assert.equal(plan.kind, 'shared_bundle');
  assert.ok(plan.items.length >= 2);
  assert.equal(new Set(plan.items.map(({ recommendation }) => recommendation.candidate.id)).size, plan.items.length);
  assert.ok(plan.items.every(({ recommendation }) => recommendation.passedConstraints.includes('exclusion')));
});
```

- [ ] **Step 2: Write failing individual assignment tests**

```js
test('individual mode preserves diner ownership and never defaults everyone to one dish', () => {
  const plan = composeMealPlan(individualContext, candidates, { now: NOW });
  assert.equal(plan.kind, 'individual_set');
  assert.deepEqual(plan.dinerAssignments.map(({ dinerId }) => dinerId), ['diner-1', 'diner-2', 'diner-3']);
  assert.equal(new Set(plan.dinerAssignments.map(({ recommendation }) => recommendation.candidate.id)).size, 3);
});
```

- [ ] **Step 3: Write failing same-cuisine and insufficient-pool tests**

```js
test('shared-main-personal mode assigns different dishes from one cuisine', () => {
  const plan = composeMealPlan(sameCuisineContext, candidates, { now: NOW });
  assert.equal(plan.kind, 'same_cuisine_set');
  assert.equal(new Set(plan.dinerAssignments.map(({ recommendation }) => recommendation.candidate.metadata.cuisineTags[0])).size, 1);
  assert.equal(new Set(plan.dinerAssignments.map(({ recommendation }) => recommendation.candidate.id)).size, 3);
});

test('same-cuisine shortages are explicit and never filled with duplicate dishes', () => {
  const plan = composeMealPlan(sameCuisineContext, oneSafeCandidate, { now: NOW });
  assert.equal(plan.diagnostics.degradedFrom, 'same_cuisine_set');
  assert.ok(plan.diagnostics.missingDinerIds.length > 0);
});
```

- [ ] **Step 4: Run meal-plan tests and verify module-not-found failure**

Run: `node --test tests/recommendation/meal-plan.test.js`  
Expected: FAIL because `composeMealPlan()` does not exist.

- [ ] **Step 5: Implement single and shared composition using ranked recommendations**

```js
function recommendationResult(context, candidates, options) {
  return recommend(context, candidates, {
    now: options.now,
    alternativeLimit: candidates.length,
    exploration: options.exploration,
    random: options.random
  });
}

function composeShared(context, candidates, options) {
  const result = recommendationResult(withUnionExclusions(context), candidates, options);
  return selectComplementaryRoles(result, context.partySize);
}
```

Complementary selection operates only on recommendations already returned by `recommend()`. It may inspect serving roles and IDs but must never re-accept a rejected candidate.

- [ ] **Step 6: Implement individual ownership with candidate removal**

For each anonymous diner, create a context containing that diner's tastes and exclusions, call `recommend()` against the remaining candidate array, record the selected recommendation under the same diner ID, and remove the selected candidate ID before the next call.

- [ ] **Step 7: Implement same-cuisine and explicit compromise fallback**

Use the first safe assignment's highest-ranked `cuisineTags` value as the restricted pool for subsequent diners. When that pool cannot fill all assignments, retain successful unique assignments, list missing diner IDs, set `degradedFrom: 'same_cuisine_set'`, and produce a compromise alternative from the unrestricted safe pool through a fresh `recommend()` call.

- [ ] **Step 8: Add swap-history and deterministic-output tests**

```js
test('excluded candidate ids rotate the primary without ambient randomness', () => {
  const first = composeMealPlan(context, candidates, { now: NOW });
  const next = composeMealPlan(context, candidates, {
    now: NOW,
    excludedCandidateIds: [first.primary.candidate.id]
  });
  assert.notEqual(next.primary.candidate.id, first.primary.candidate.id);
  assert.deepEqual(next, composeMealPlan(context, candidates, {
    now: NOW,
    excludedCandidateIds: [first.primary.candidate.id]
  }));
});
```

- [ ] **Step 9: Run all recommendation and Phase 6A evaluation tests**

Run: `node --test tests/recommendation/*.test.js tests/evaluation/phase-6a-evaluation.test.js`  
Expected: PASS; existing offline evaluation continues calling the unchanged `recommend()` contract and remains 28/28.

- [ ] **Step 10: Run the full regression suite**

Run: `npm test`  
Expected: at least 90 existing tests plus new tests PASS, 0 failures.

- [ ] **Step 11: Commit the meal-plan composer**

```powershell
git add src/recommendation/meal-plan.js tests/recommendation
git commit -m "feat: compose explainable multi-person meal plans"
```

**Acceptance:** Shared, individual, same-cuisine, and compromise modes return explicit structures; all selections pass the existing hard-filter path; no duplicate dish silently fills missing assignments.

---

### Task 6: Build Pure Flow State and Condition Retention

**Files:**
- Create: `src/presentation/flow-state.js`
- Create: `tests/presentation/flow-state.test.js`

**Interfaces:**
- Consumes: scenario catalog and dining-mode enums from Task 1.
- Produces: `FLOW_STEP`, `createFlowState(restoredPreferences)`, `getVisibleSteps(state)`, `transitionFlow(state, event)`, and `createContextInputFromFlow(state)`.

- [ ] **Step 1: Write failing navigation and retention tests**

```js
test('single flow skips dining mode and back preserves conditions', () => {
  let state = createFlowState();
  state = transitionFlow(state, { type: 'select_party_size', partySize: 1, bucket: '1' });
  state = transitionFlow(state, { type: 'next' });
  state = transitionFlow(state, { type: 'select_scene', mealScene: 'solo_focus' });
  state = transitionFlow(state, { type: 'next' });
  assert.equal(state.step, 'preferences');
  state = transitionFlow(state, { type: 'set_budget', value: 'everyday' });
  state = transitionFlow(state, { type: 'back' });
  assert.equal(state.step, 'scene');
  assert.equal(state.inspirationBudgetTier, 'everyday');
});
```

- [ ] **Step 2: Write failing dependency-invalidation tests**

```js
test('changing between single and multi clears only incompatible downstream selections', () => {
  const changed = transitionFlow(existingMultiState, {
    type: 'select_party_size', partySize: 1, bucket: '1'
  });
  assert.equal(changed.mealScene, null);
  assert.equal(changed.diningMode, null);
  assert.equal(changed.inspirationBudgetTier, 'everyday');
  assert.deepEqual(changed.dinerDrafts[0].tastePreferences, ['清淡']);
  assert.equal(changed.status, 'editing');
  assert.equal(changed.result, null);
});
```

- [ ] **Step 3: Write failing 4+ anonymous diner tests**

```js
test('four-plus exact count creates stable anonymous diner slots', () => {
  const state = transitionFlow(createFlowState(), {
    type: 'select_party_size', partySize: 6, bucket: '4_plus'
  });
  assert.deepEqual(state.dinerDrafts.map(({ id }) => id), [
    'diner-1', 'diner-2', 'diner-3', 'diner-4', 'diner-5', 'diner-6'
  ]);
});
```

- [ ] **Step 4: Run the tests and verify failure**

Run: `node --test tests/presentation/flow-state.test.js`  
Expected: FAIL because the reducer is missing.

- [ ] **Step 5: Implement explicit reducer events and visible-step calculation**

```js
export const FLOW_STEP = Object.freeze({
  PARTY: 'party', SCENE: 'scene', DINING: 'dining', PREFERENCES: 'preferences', RESULT: 'result'
});

export function getVisibleSteps(state) {
  return state.partySize === 1
    ? [FLOW_STEP.PARTY, FLOW_STEP.SCENE, FLOW_STEP.PREFERENCES]
    : [FLOW_STEP.PARTY, FLOW_STEP.SCENE, FLOW_STEP.DINING, FLOW_STEP.PREFERENCES];
}

export function transitionFlow(state, event) {
  switch (event.type) {
    case 'select_party_size': return selectPartySize(state, event);
    case 'select_scene': return selectScene(state, event.mealScene);
    case 'select_dining_mode': return edit(state, { diningMode: event.diningMode });
    case 'back': return moveRelative(state, -1);
    case 'next': return moveRelative(state, 1);
    case 'edit_step': return edit(state, { step: event.step });
    case 'request_started': return { ...state, status: 'loading' };
    case 'request_succeeded': return { ...state, status: 'success', result: event.result };
    case 'request_empty': return { ...state, status: 'empty', result: null };
    case 'request_failed': return { ...state, status: 'error', result: null };
    default: return state;
  }
}
```

All edit events must preserve compatible values and clear stale results. Exclusion strings remain only inside the in-memory reducer state.

- [ ] **Step 6: Run flow-state and context tests**

Run: `node --test tests/presentation/flow-state.test.js tests/services/context.test.js`  
Expected: PASS; `createContextInputFromFlow()` creates normalized anonymous profiles but does not persist them.

- [ ] **Step 7: Commit flow state**

```powershell
git add src/presentation/flow-state.js tests/presentation/flow-state.test.js
git commit -m "feat: preserve scenario flow state across navigation"
```

**Acceptance:** Single and multi flows have correct step order, every step supports back navigation, compatible conditions survive edits, and stale results are invalidated after any condition change.

---

### Task 7: Create Image-Safe Recommendation and Meal-Plan View Models

**Files:**
- Modify: `src/presentation/recommendation-view-model.js`
- Create: `src/presentation/meal-plan-view-model.js`
- Modify: `tests/presentation/recommendation-view-model.test.js`
- Create: `tests/presentation/meal-plan-view-model.test.js`

**Interfaces:**
- Consumes: recommendation or meal-plan output, scenario catalog, and local image contract.
- Produces: `createRecommendationViewModel(input)` with `primary.image`, `partyLabel`, `sceneLabel`, and explicit inspiration badge; `createMealPlanViewModel({ plan, mode, notices })` with render-safe bundle and assignment arrays.

- [ ] **Step 1: Write failing local-image and placeholder tests**

```js
test('uses only approved local dish images and falls back when missing', () => {
  const withImage = createRecommendationViewModel({ recommendation: recommendationWithLocalImage });
  assert.equal(withImage.primary.image.src, './assets/dishes/rice-bowl.webp');
  const missing = createRecommendationViewModel({ recommendation: recommendationWithoutImage });
  assert.deepEqual(missing.primary.image, {
    src: './assets/dishes/placeholder.svg',
    alt: '菜品灵感占位图',
    kind: 'placeholder'
  });
});

test('rejects remote inspiration image URLs at the presentation boundary', () => {
  const view = createRecommendationViewModel({ recommendation: recommendationWithRemoteImage });
  assert.equal(view.primary.image.kind, 'placeholder');
});
```

- [ ] **Step 2: Write failing result-structure tests for all meal-plan kinds**

```js
test('individual view keeps assignment labels and puts reasons beside each result', () => {
  const view = createMealPlanViewModel({ plan: individualPlan, mode: 'inspiration', notices: [] });
  assert.equal(view.kind, 'individual_set');
  assert.deepEqual(view.assignments.map(({ ownerLabel }) => ownerLabel), ['第 1 位', '第 2 位']);
  assert.ok(view.assignments.every(({ card }) => card.reasons.length > 0));
});
```

- [ ] **Step 3: Run presentation tests and verify failure**

Run: `node --test tests/presentation/recommendation-view-model.test.js tests/presentation/meal-plan-view-model.test.js`  
Expected: FAIL for missing image and meal-plan fields.

- [ ] **Step 4: Add a strict local-image resolver**

```js
const PLACEHOLDER_IMAGE = Object.freeze({
  src: './assets/dishes/placeholder.svg',
  alt: '菜品灵感占位图',
  kind: 'placeholder'
});

function safeInspirationImage(image) {
  return image?.kind === 'dish-inspiration'
    && /^\.\/assets\/dishes\/[a-z0-9-]+\.(?:webp|svg)$/.test(image.src)
      ? { ...image }
      : { ...PLACEHOLDER_IMAGE };
}
```

- [ ] **Step 5: Map reasons to the required result-page positions**

The primary card view model must expose these blocks in this order:

```js
{
  identity: { label: '菜品灵感 · 非实时商家信息' },
  image,
  name,
  partyLabel,
  sceneLabel,
  tags,
  description,
  reasons,             // directly below description/tags
  passedConstraints,  // immediately after reasons
  tradeoffs,           // immediately after passed constraints
  action
}
```

Multi-person bundle and assignment items reuse this card structure at a smaller visual level; they must not move all reasons into a hidden dialog or tooltip.

- [ ] **Step 6: Run presentation and inspiration-boundary tests**

Run: `node --test tests/presentation/*.test.js tests/providers/providers.test.js`  
Expected: PASS; inspiration presentation still exposes no merchant, live metric, remote image, or ordering action.

- [ ] **Step 7: Commit view models**

```powershell
git add src/presentation tests/presentation
git commit -m "feat: present image-safe scenario meal plans"
```

**Acceptance:** Missing and unsafe images become the neutral placeholder, recommendation reasons remain visibly positioned in the primary result, and every multi-person result preserves ownership or bundle role.

---

### Task 8: Implement the Dynamic Input Flow and Application Orchestration

**Files:**
- Modify: `index.html`
- Modify: `src/main.js`
- Modify: `src/components/inputs.js`
- Modify: `tests/presentation/feedback-state.test.js`
- Modify: `tests/e2e/recommendation-flow.spec.js`

**Interfaces:**
- Consumes: flow reducer, scenario catalog, `createUserContext()`, existing candidate provider, `composeMealPlan()`, and meal-plan view model.
- Produces: fully navigable party/scene/dining/preferences flow with retained conditions and no direct recommendation math in the DOM layer.

- [ ] **Step 1: Replace old E2E entry assertions with failing party-first assertions while preserving privacy checks**

```js
test('party size drives single and multi scenes and back preserves choices', async ({ page }) => {
  await expect(page.getByRole('group', { name: /用餐人数/ })).toBeVisible();
  await page.getByRole('button', { name: '2 人' }).click();
  await page.getByRole('button', { name: '下一步' }).click();
  await expect(page.getByRole('button', { name: /一起聚餐/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /快速解决/ })).toHaveCount(0);
  await page.getByRole('button', { name: /一起聚餐/ }).click();
  await page.getByRole('button', { name: '下一步' }).click();
  await page.getByRole('button', { name: '返回' }).click();
  await expect(page.getByRole('button', { name: /一起聚餐/ })).toHaveAttribute('aria-pressed', 'true');
});
```

- [ ] **Step 2: Add failing E2E assertions for all four dining modes and 4+ exact count**

Assert that single diners never see the dining-mode step, multi-person diners cannot advance without selecting a mode, and selecting six diners creates six anonymous preference regions without any name field.

- [ ] **Step 3: Run the focused E2E tests and verify failure against the old UI**

Run: `npm run build; npx playwright test tests/e2e/recommendation-flow.spec.js --grep "party size|dining mode"`  
Expected: FAIL because the current app starts with four abstract state cards.

- [ ] **Step 4: Implement step renderers using the shared domain catalog**

```js
function partyStep(state) {
  return fieldset('用餐人数', partySizeButtons(state.partySizeBucket), {
    help: '选择 4 人以上后再填写具体人数。',
    extra: state.partySizeBucket === '4_plus' ? exactPartySizeInput(state.partySize) : ''
  });
}

function sceneStep(state) {
  return fieldset('使用场景', sceneButtons(getScenesForPartySize(state.partySize), state.mealScene));
}

function diningStep(state) {
  return fieldset('多人用餐方式', diningModeButtons(
    getDiningModesForScene(state.mealScene),
    state.diningMode
  ));
}

function preferencesStep(state) {
  return [
    budgetTierField(state.inspirationBudgetTier),
    ...state.dinerDrafts.map((diner, index) => dinerPreferenceField(diner, index))
  ].join('');
}
```

Use `fieldset` and `legend`, `aria-pressed` or native radio semantics, explicit help text, and a named progress list. Do not duplicate scene definitions inside `inputs.js`.

- [ ] **Step 5: Refactor `main.js` around the pure reducer**

```js
let state = createFlowState(restored.ok ? restored.value : null);

function dispatch(event) {
  state = transitionFlow(state, event);
  renderApplication();
}

async function requestRecommendation() {
  dispatch({ type: 'request_started' });
  const context = createUserContext(createContextInputFromFlow(state));
  const response = await provider.getCandidates(context, { signal });
  const plan = composeMealPlan(context, response.candidates, { now: new Date() });
  dispatch(plan.primary
    ? { type: 'request_succeeded', result: { plan, response } }
    : { type: 'request_empty' });
}
```

The only use of current time remains the explicit `now` passed from orchestration. No flow field is added to the provider request. Storage continues using the existing safe allowlist; exclusions and diner drafts are never passed to `storage.save()`.

- [ ] **Step 6: Implement edit and swap events**

- `edit_step` returns to party, scene, dining, or preferences without clearing compatible values.
- `swap` reruns `composeMealPlan()` with session-only `excludedCandidateIds`.
- Changing any condition clears the old plan and rotation history.
- Exhausted safe candidates display “暂时没有更多安全候选” without relaxing exclusions.

- [ ] **Step 7: Run unit, E2E, storage, provider, and full regression tests**

Run:

```powershell
node --test tests/presentation/flow-state.test.js tests/services/storage.test.js tests/services/context.test.js tests/providers/providers.test.js
npm run build
npx playwright test tests/e2e/recommendation-flow.spec.js --grep "party size|dining mode"
npm test
```

Expected: all commands PASS; the existing privacy/storage assertions remain unchanged; total Node tests are greater than 90 with 0 failures.

- [ ] **Step 8: Commit the scenario-first flow**

```powershell
git add index.html src/main.js src/components/inputs.js tests/presentation/feedback-state.test.js tests/e2e/recommendation-flow.spec.js
git commit -m "feat: add scenario-first recommendation flow"
```

**Acceptance:** The visible flow matches the approved order, scene options dynamically follow party size, multi-person dining mode is required, back navigation preserves state, and the app still calls the existing provider boundary only for static candidates.

---

### Task 9: Render Discovery Results, Reasons, Alternatives, and Recovery States

**Files:**
- Modify: `src/components/recommendation-card.js`
- Modify: `src/components/feedback.js`
- Modify: `src/main.js`
- Modify: `tests/presentation/feedback-state.test.js`
- Modify: `tests/e2e/recommendation-flow.spec.js`

**Interfaces:**
- Consumes: `createMealPlanViewModel()` from Task 7 and flow events from Task 6.
- Produces: accessible single, shared bundle, individual assignment, same-cuisine, compromise, empty, error, loading, and degraded result DOM.

- [ ] **Step 1: Write failing component markup tests for primary discovery hierarchy**

```js
test('primary discovery result keeps reasons visible between tags and constraints', () => {
  renderMealPlan(root, viewModel, handlers);
  const html = root.innerHTML;
  assert.ok(html.indexOf('为什么推荐') < html.indexOf('已通过的约束'));
  assert.ok(html.indexOf('已通过的约束') < html.indexOf('需要知道的取舍'));
  assert.match(html, /菜品灵感 · 非实时商家信息/);
  assert.match(html, /<img[^>]+data-primary-dish-image/);
});
```

- [ ] **Step 2: Write failing markup tests for shared, individual, and same-cuisine structures**

Assert the DOM contains a “共享菜组合” list with roles, “第 N 位” assignment headings, or “同菜系不同菜” heading according to `viewModel.kind`, and exactly two alternative controls when two alternatives are available.

- [ ] **Step 3: Write failing empty, error, and degradation recovery tests**

```js
test('empty and error states preserve return paths', () => {
  renderEmptyState(emptyRoot, { onEdit() {}, onBack() {} });
  assert.match(emptyRoot.innerHTML, /修改条件/);
  assert.match(emptyRoot.innerHTML, /返回上一步/);
  renderErrorState(errorRoot, { onRetry() {}, onBack() {} });
  assert.match(errorRoot.innerHTML, /重试/);
  assert.match(errorRoot.innerHTML, />返回</);
  assert.doesNotMatch(errorRoot.innerHTML, /重置本次条件/);
});
```

- [ ] **Step 4: Implement a shared safe image renderer with runtime fallback**

Render `src`, `alt`, `width`, `height`, `loading`, and `decoding` attributes from the view model. Attach an `error` handler that replaces the failed source with `./assets/dishes/placeholder.svg`, updates `data-image-kind="placeholder"`, and avoids retry loops.

- [ ] **Step 5: Implement the exact result order**

1. Inspiration identity and scene summary.
2. Large primary image.
3. Dish name, party, scene, taste tags, and description.
4. “为什么推荐” with visible reason text.
5. “已通过的约束”.
6. “需要知道的取舍”.
7. Multi-person bundle or assignments when applicable.
8. Primary actions: “换一个” and “返回修改条件”.
9. Two smaller image-led alternatives.

- [ ] **Step 6: Implement loading, empty, error, and degraded states**

- Loading: static skeleton bars, `aria-busy="true"`, and no over-animation.
- Empty: state that exclusions were not relaxed; show edit and back actions.
- Error: retain conditions; show retry and back actions.
- Degraded multi plan: show which assignment or same-cuisine promise could not be completed and offer condition editing.
- Inspiration fallback: keep the mode notice and identity visible; never mix live metrics into a static card.

- [ ] **Step 7: Add image-fallback and reason-position E2E assertions**

Use Playwright to confirm the primary image is larger than each alternative image, replace one image source with a missing local URL and verify the placeholder loads, and assert that visible reasons are not hidden in a dialog.

- [ ] **Step 8: Run component, presentation, build, and focused E2E tests**

Run:

```powershell
node --test tests/presentation/*.test.js
npm run build
npx playwright test tests/e2e/recommendation-flow.spec.js --grep "result|placeholder|empty|error"
```

Expected: PASS; no console error is introduced by intentional placeholder recovery.

- [ ] **Step 9: Commit result and state rendering**

```powershell
git add src/components/recommendation-card.js src/components/feedback.js src/main.js tests/presentation tests/e2e/recommendation-flow.spec.js
git commit -m "feat: render scenario discovery meal plans"
```

**Acceptance:** Reasons occupy a stable visible location, images have safe fallback behavior, multi-person result kinds are distinguishable, and empty/error/degraded states preserve user recovery paths.

---

### Task 10: Add Local Food Assets, Scene Themes, and Responsive Discovery Layout

**Files:**
- Create: `assets/dishes/README.md`
- Create: `assets/dishes/rice-bowl.webp`
- Create: `assets/dishes/noodles.webp`
- Create: `assets/dishes/hotpot.webp`
- Create: `assets/dishes/grill.webp`
- Create: `assets/dishes/braised.webp`
- Create: `assets/dishes/light-meal.webp`
- Create: `assets/dishes/snacks.webp`
- Create: `assets/dishes/plated.webp`
- Create: `assets/dishes/dessert.webp`
- Create: `assets/dishes/soup.webp`
- Create: `assets/dishes/sharing.webp`
- Create: `assets/dishes/celebration.webp`
- Create: `assets/dishes/placeholder.svg`
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/base.css`
- Modify: `src/styles/components.css`
- Modify: `src/styles/responsive.css`
- Modify: `tests/presentation/theme-system.test.js`
- Modify: `tests/e2e/recommendation-flow.spec.js`

**Interfaces:**
- Consumes: `data-theme` values from the scenario catalog and image filenames from `DISH_IMAGE_MANIFEST`.
- Produces: one active scene theme, a large 4:3 primary image, smaller 4:3 alternatives, low-shadow open layout, and five responsive viewport behaviors.

- [ ] **Step 1: Write failing theme-contract tests**

```js
test('every scene theme defines the complete surface and contrast contract', () => {
  for (const theme of ['quick', 'focus', 'lighter', 'gathering', 'celebration', 'late-night']) {
    const block = cssBlockFor(`[data-theme="${theme}"]`, tokensCss);
    for (const token of REQUIRED_THEME_TOKENS) assert.match(block, new RegExp(`--${token}:`));
  }
});

test('scene themes do not enable gradients', () => {
  assert.doesNotMatch(tokensCss, /\[data-theme="(?:quick|focus|lighter|gathering|celebration|late-night)"\][\s\S]*?--background-gradient:\s*linear-gradient/);
});
```

- [ ] **Step 2: Create project-local image assets and record their boundary**

Create original, project-owned food inspiration images without merchant logos, packaging, menu prices, platform UI, people, or location metadata. Optimize each WebP to the agreed resource budget and record in `assets/dishes/README.md`:

```text
These files are project-local dish inspiration illustrations/images.
They do not depict or represent a merchant, live product, inventory, or orderable listing.
No external URL may be substituted for these files in inspiration mode.
```

The placeholder must be a neutral SVG with no emoji, merchant mark, or claim.

- [ ] **Step 3: Implement six complete scene themes**

Define quick `#F3F4F3`, focus `#EEF3F6`, lighter `#EEF7F1`, gathering `#FBF4E2`, celebration `#F4EFF8`, and late-night `#263747` environment tokens. Each theme defines page, soft, card, input, secondary, hover, selected, border, strong border, text-on-theme, focus, and shadow variables. Only the root `data-theme` changes; components consume aliases.

- [ ] **Step 4: Implement the image-led layout without heavy cards**

- Primary image: `aspect-ratio: 4 / 3`, full available width, restrained radius, no large shadow.
- Alternative image: same ratio, smaller dimensions.
- Desktop ≥1024px: condition summary column plus image/content discovery column.
- 768px: single result column with two-column alternatives where space permits.
- 320px and 390px: single column, no horizontal scrolling, compact anonymous diner controls.
- 1440px: bounded content width and deliberate whitespace rather than stretched cards.

- [ ] **Step 5: Remove decorative checks and excessive symbols from the touched UI**

Replace scene-card generated checkmarks and result reason checkmarks with text hierarchy, a restrained border, and semantic headings. Keep status meaning available in text and do not replace the removed marks with emoji or arrows.

- [ ] **Step 6: Add viewport and reduced-motion E2E assertions**

For each width `[320, 390, 768, 1024, 1440]`, set the viewport, complete a scenario flow, and assert:

```js
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
expect(overflow).toBeLessThanOrEqual(0);
await expect(page.locator('[data-primary-dish-image]')).toHaveCSS('aspect-ratio', '4 / 3');
```

At reduced motion, verify loading and swap transitions do not run long animations. At 200% zoom-equivalent viewport, confirm controls remain reachable and text does not overlap.

- [ ] **Step 7: Run theme, presentation, and full Node regression tests**

Run:

```powershell
node --test tests/presentation/theme-system.test.js tests/presentation/recommendation-view-model.test.js tests/presentation/meal-plan-view-model.test.js
npm test
```

Expected: all tests PASS; existing 90 tests are included and no theme assertion is weakened.

- [ ] **Step 8: Commit visual assets and styles**

```powershell
git add assets/dishes src/styles tests/presentation/theme-system.test.js tests/e2e/recommendation-flow.spec.js
git commit -m "feat: add local food discovery visual system"
```

**Acceptance:** Images are local and non-merchant, missing images remain safe, exactly one low-saturation scene theme is active, primary imagery dominates alternatives, and all five widths remain usable without heavy card or gradient treatment.

---

### Task 11: Extend the Pages Artifact Contract for Dish Assets

**Files:**
- Modify: `scripts/build-pages.mjs`
- Modify: `scripts/check-dist.mjs`
- Modify: `tests/build/build-pages.test.js`

**Interfaces:**
- Consumes: approved files under `assets/dishes/`.
- Produces: `dist/assets/dishes/` containing only `.webp` and the approved `placeholder.svg`; repository-only README remains excluded.

- [ ] **Step 1: Write a failing build artifact test**

```js
test('build copies only approved local dish images', async () => {
  const dishAssets = (await readdir(path.join(outputDirectory, 'assets', 'dishes'))).sort();
  assert.deepEqual(dishAssets, APPROVED_DISH_ASSETS);
  assert.equal(dishAssets.includes('README.md'), false);
  for (const file of dishAssets) assert.ok((await stat(path.join(outputDirectory, 'assets', 'dishes', file))).size > 0);
});
```

- [ ] **Step 2: Run the build test and verify failure**

Run: `node --test tests/build/build-pages.test.js`  
Expected: FAIL because the current build emits only `app.css` and `app.js` under `assets`.

- [ ] **Step 3: Add an explicit asset allowlist and deterministic copy**

```js
const DISH_ASSET_FILES = Object.freeze([
  'braised.webp', 'celebration.webp', 'dessert.webp', 'grill.webp',
  'hotpot.webp', 'light-meal.webp', 'noodles.webp', 'placeholder.svg',
  'plated.webp', 'rice-bowl.webp', 'sharing.webp', 'snacks.webp', 'soup.webp'
]);
```

Create `dist/assets/dishes`, copy only these names, and fail the build if an approved source file is missing. Do not recursively copy arbitrary files.

- [ ] **Step 4: Update the production artifact checker**

Require `assets` to contain `app.css`, `app.js`, and `dishes`; require the exact dish allowlist; reject unknown files, remote-image URLs in bundled JavaScript/HTML, source maps, docs, tests, and repository paths.

- [ ] **Step 5: Run build, artifact, and workflow contract tests**

Run:

```powershell
node --test tests/build/*.test.js
npm run build
npm run check:dist
```

Expected: PASS; `dist/` contains only the current top-level contract plus the approved dish images.

- [ ] **Step 6: Commit deterministic asset packaging**

```powershell
git add scripts/build-pages.mjs scripts/check-dist.mjs tests/build/build-pages.test.js
git commit -m "build: package approved local dish images"
```

**Acceptance:** GitHub Pages remains a self-contained `dist/` artifact, no external image is required at runtime, and no unapproved file can enter the dish asset directory.

---

### Task 12: Complete End-to-End Coverage, Documentation, and Final Verification

**Files:**
- Modify: `tests/e2e/recommendation-flow.spec.js`
- Modify: `README.md`
- Modify: `docs/product-brief.md`
- Modify: `docs/design-system.md`
- Modify: `docs/current-behavior-checklist.md`
- Modify: `docs/current-modern-ui-checklist.md`
- Modify: `docs/implementation-plan.md`

**Interfaces:**
- Consumes: all Phase 3.7 behavior and test evidence.
- Produces: complete acceptance coverage and accurate current-state documentation without changing Phase 6A or Phase 6B status.

- [ ] **Step 1: Complete E2E scenarios for the approved flow**

Add explicit browser tests for:

1. Single quick scene.
2. Single focus and lighter scenes produce a different primary from a controlled fixed context.
3. Two-person shared bundle.
4. Three-person individual assignments with distinct dishes.
5. Same-cuisine different-dish assignments.
6. Back navigation and condition retention.
7. Swap produces a different primary while preserving conditions.
8. Missing image fallback.
9. Visible reasons, passed constraints, tradeoffs, and inspiration identity.
10. Empty result edit/back recovery.
11. Error retry/back recovery.
12. Data dialog focus trap, Escape, and focus return.
13. Keyboard-only completion of the main flow.
14. Five required viewport widths and reduced motion.

Use deterministic static candidates or pure component state setup already exposed by production modules; do not add production-only query-string test hooks or network endpoints.

- [ ] **Step 2: Run the complete E2E suite**

Run: `npm run build; npm run test:e2e`  
Expected: all Chromium tests PASS with no unexpected console warnings, page errors, request failures, or horizontal overflow.

- [ ] **Step 3: Update product and design documentation to verified behavior**

- `product-brief.md`: scenario-first flow and multi-person ownership.
- `design-system.md`: meal-discovery imagery, six scene themes, result hierarchy, image boundary, and state rules.
- behavior checklists: exact implemented steps, statuses, viewport evidence, and remaining limitations.
- `implementation-plan.md`: mark Phase 3.7 implemented only when all gates pass; keep Phase 6B “未开始”.
- `README.md`: update current experience and `dist/assets/dishes/` artifact contents; continue stating no backend, live provider, or telemetry.

- [ ] **Step 4: Run the full JavaScript, unit, build, artifact, and E2E gates**

Run:

```powershell
npm run check:js
npm test
npm run build
npm run check:dist
npm run test:e2e
git diff --check
```

Expected:

- syntax check PASS;
- all original 90 tests plus all Phase 3.7 tests PASS, 0 failures;
- Phase 6A remains 28/28 with 20-run stability;
- build and artifact allowlist PASS;
- all E2E tests PASS;
- `git diff --check` emits no output.

- [ ] **Step 5: Perform read-only boundary scans**

Run:

```powershell
node scripts/audit-phase-6a-boundaries.mjs
git diff --name-only origin/main...HEAD
git status --short --branch
```

Expected:

- no analytics runtime, SDK, telemetry endpoint, upload primitive, or new external network call;
- no files under `src/providers/`, `docs/phase-6a-*`, or `.github/workflows/` changed;
- no `dist/`, Playwright output, temporary images, or secrets staged;
- working tree contains only intentional Phase 3.7 changes before the final commit.

- [ ] **Step 6: Commit verified documentation and acceptance coverage**

```powershell
git add tests/e2e/recommendation-flow.spec.js README.md docs/product-brief.md docs/design-system.md docs/current-behavior-checklist.md docs/current-modern-ui-checklist.md docs/implementation-plan.md
git commit -m "test: verify phase 3.7 scenario discovery"
```

- [ ] **Step 7: Verify the final clean branch without pushing**

Run:

```powershell
git status --short --branch
git log --oneline --decorate -12
git diff --check origin/main...HEAD
```

Expected: clean worktree on `codex/phase-3-7-scenario-discovery`, local commits only, no push, no PR, no deployment, and Phase 6B still unstarted.

**Acceptance:** Every requested Phase 3.7 behavior has automated or browser evidence, the original 90-test baseline remains green, documentation states only verified capabilities, and the branch is ready for user review without any external publication.

---

## Requirement Coverage Map

| Required planning detail | Implementing tasks and evidence |
| --- | --- |
| 1. Party size, scene, and dining-mode data model | Tasks 1 and 6: immutable enums, normalized context, anonymous diner profiles, and flow reducer tests |
| 2. Scene-to-recommendation mapping | Tasks 3 and 4: explicit profiles, fixed-pool ranking differences, and evidence-backed reasons |
| 3. Shared, individual, and same-cuisine result structures | Task 5: exact `MealPlan` contract, unique assignments, bundle roles, and explicit shortage degradation |
| 4. Image field, source boundary, and placeholder | Tasks 2, 7, 10, and 11: additive model field, strict local resolver, project-owned assets, and artifact allowlist |
| 5. Recommendation reason location | Tasks 7 and 9: view-model order and DOM assertions placing reasons before constraints and tradeoffs |
| 6. Back, retention, and flow state | Tasks 6 and 8: pure state transitions, compatible-value retention, result invalidation, focus, and edit links |
| 7. Empty, error, and degraded states | Task 9: edit/back, retry/back, and explicit multi-plan shortage behavior |
| 8. Component and file order | File map plus Tasks 1–12, ordered domain → data → score → plan → state → presentation → UI → visual → build → verification |
| 9. Per-task tests and acceptance | Every task contains a red/green test cycle, exact commands, expected outcomes, and an `Acceptance` gate |
| 10. Existing 90/90 regression safety | Compatibility Strategy plus full `npm test` checkpoints in Tasks 3, 5, 8, 10, and 12 |

---

## Final Delivery Report Template

When implementation is complete, pause and report:

1. Branch, base SHA, and local commit list.
2. Added and modified files grouped by domain, recommendation, UI, assets, tests, and docs.
3. Implemented party, scene, dining-mode, and multi-person result contracts.
4. Number and provenance boundary of local dish images; placeholder behavior.
5. Scenario-difference and multi-person test evidence.
6. Original 90-test regression result and total new Node test count.
7. Build, artifact, E2E, responsive, keyboard, dialog, reduced-motion, and `git diff --check` results.
8. Provider, privacy, analytics, network-upload, and Phase 6B boundary audit.
9. Known limitations, especially static price tiers, absence of real merchant data, and any manual mobile-network smoke test still pending.
10. Confirmation that nothing was pushed, no PR was created, nothing was deployed, and the worktree is clean.
