# Task 10 Report: Local Food Assets and Scenario Discovery Visuals

## Status

Implementation complete on baseline `56fc9a05963e1aa0c956b3ed535edbd10d090fd6`.

## Design plan — pass 1

- Subject / audience / job: a quiet food-decision assistant for diners with decision fatigue; the page has one job—turn a few current conditions into one immediately understandable dish direction.
- Palette: Quick stone `#F3F4F3`, Focus mist `#EEF3F6`, Lighter leaf `#EEF7F1`, Gathering broth `#FBF4E2`, Celebration lilac `#F4EFF8`, Late-night slate `#263747`. White card and input surfaces, graphite text, and thin scene-tinted borders keep the active scene subordinate to the food.
- Type: the existing system serif stack remains the restrained display role for the page title and dish names; the existing system sans stack carries controls and prose; the existing mono stack is reserved for progress, source, and compact evidence labels. No remote font or new dependency.
- Layout: mobile is a single reading rail with a full-width 4:3 primary image and compact 4:3 alternatives; tablet keeps one result column and lets alternatives form two columns; desktop pairs a bounded condition column with a wider discovery column.

```text
mobile                     desktop
┌──────────────┐           ┌───────────┬─────────────────────┐
│ conditions   │           │ conditions│  primary image 4:3  │
│              │           │           ├─────────────────────┤
├──────────────┤           │           │ dish / evidence     │
│ primary 4:3  │           │           ├──────────┬──────────┤
├──────────────┤           │           │ alt 4:3  │ alt 4:3  │
│ dish / why   │           └───────────┴──────────┴──────────┘
├──────┬───────┤
│ alt  │ alt   │
└──────┴───────┘
```

- Signature: an editorial “serving window”—the large food photograph is the result’s opening surface, followed by a thin-lined evidence runway and visibly quieter alternatives. The image hierarchy, not decoration, is the memorable element.

## Design plan — template check

The initial gathering cream could drift toward a generic warm editorial template. The revision confines that color to the explicitly requested gathering scene, removes every gradient, keeps the existing system type roles instead of adding a fashionable display face, and spends visual emphasis only on the food crop. Numbered decorative scene markers, generated checkmarks, oversized symbols, thick cards, and ornamental shadows are removed. Late-night is the one deliberate contrast risk: the fixed slate scene surrounds white discovery surfaces while preserving the same calm image/evidence structure and accessible theme-specific text/focus aliases.

## TDD evidence

### RED — theme and asset contract

Command:

```powershell
node --test tests/presentation/theme-system.test.js tests/presentation/recommendation-view-model.test.js tests/presentation/meal-plan-view-model.test.js
```

Result: 15 tests, 11 passed and 4 failed. The four expected failures proved that the old five-theme system was still present, the root still defaulted to `mint`, theme-specific focus aliases were absent, and `assets/dishes/` did not exist. The candidate manifest/image test already passed for all 175 dishes, proving the strengthened Task 2 boundary exercises the shipped metadata rather than a mock.

The deferred visual/build contracts were then introduced separately:

- Static loading / no generated-check test failed against `@keyframes loading`, the animated skeleton declaration, and CSS-generated checkmarks.
- Build packaging test failed with `ENOENT` for the absent emitted `dist/assets/dishes` directory.
- The first 320px browser run failed because a 1px transparent radio left its label intercepting pointer input. The production fix makes the native radio cover the full visible card hit area while the label reflects `:checked` and `:focus-visible`; the test was not forced past the failure.
- The next 320px run failed the rendered 4:3 assertion because explicit image height attributes were still controlling layout. Correct 4:3 intrinsic dimensions plus `height: auto` made the browser-rendered contract pass.

### GREEN

- Focused theme/view-model gate: 16 passed, 0 failed.
- Static loading/evidence contract: passed; loading bars have no keyframes or animation, and reasons use quiet colored rules rather than generated checks.
- Asset/build allowlist contract: passed; only the 13 manifest image files are emitted under `dist/assets/dishes`, not the source README.
- New browser gates: 8 passed, covering all five widths, all six root themes, reduced motion, and 200% zoom-equivalent behavior.

## Asset provenance and processing

All twelve 1448×1086 source PNGs came from the Codex built-in image generation storage mapped in the Task 10 brief. The final prompt family was: **original editorial food photography, no merchant, text, people, or branding**. They had already passed the main controller's contact-sheet visual inspection. This task did not regenerate, edit, move, or delete those originals.

Pillow 12.3.0 center-fitted each source to 1200×900 without stretching, converted to RGB, and encoded metadata-free lossy WebP with method 6. Encoding began at quality 82 and stepped down only until the 180 KiB limit was met; no file went below 76. Tests parsed the RIFF/WebP dimensions and rejected EXIF, XMP, ICCP, ANIM, and ANMF chunks.

| File | Built-in generated source | Dimensions | Quality | Bytes | Metadata chunks |
| --- | --- | --- | ---: | ---: | --- |
| `rice-bowl.webp` | `exec-ca82e8fc-b76e-4513-89b9-c51733ffe13b.png` | 1200×900 | 82 | 157494 | none |
| `noodles.webp` | `exec-b626a96f-b3c1-4a1f-8344-50495630b24a.png` | 1200×900 | 82 | 98028 | none |
| `hotpot.webp` | `exec-e352f8aa-345f-4850-a7a5-88a967010b8f.png` | 1200×900 | 76 | 181936 | none |
| `grill.webp` | `exec-2d7bade1-a05d-41b9-ab28-5790b41cb348.png` | 1200×900 | 79 | 183276 | none |
| `braised.webp` | `exec-f6851fd1-706e-4496-b015-f8721d3fae1e.png` | 1200×900 | 82 | 160426 | none |
| `light-meal.webp` | `exec-43c7c138-fa82-4919-8949-10a1bc9d671b.png` | 1200×900 | 82 | 159978 | none |
| `snacks.webp` | `exec-fcc88549-9ad8-4467-ac64-d935a89712cf.png` | 1200×900 | 82 | 152968 | none |
| `plated.webp` | `exec-49665900-493f-4531-ade2-b3318dff1d38.png` | 1200×900 | 82 | 118490 | none |
| `dessert.webp` | `exec-f5db6642-1607-47e7-bd91-7d6d0c597c8f.png` | 1200×900 | 82 | 83306 | none |
| `soup.webp` | `exec-3d9f9131-4537-45d7-bd7e-03ca18542f57.png` | 1200×900 | 82 | 85484 | none |
| `sharing.webp` | `exec-ff7c17a3-71ac-437c-92e8-47205c92fc23.png` | 1200×900 | 81 | 181914 | none |
| `celebration.webp` | `exec-d11a9876-8cf7-4a28-aafd-6aa395fff2af.png` | 1200×900 | 82 | 130656 | none |

`assets/dishes/README.md` records the same provenance and merchant/live-listing boundary. `placeholder.svg` is a neutral, local, non-animated fallback with no text claim, merchant mark, script, gradient, image, or external reference.

## Implementation

- Replaced the old five generic themes with exactly `quick`, `focus`, `lighter`, `gathering`, `celebration`, and `late-night`, each explicitly defining page/soft/card/input/secondary/hover/selected/border/strong-border/text-on-theme/focus/shadow aliases and `--background-gradient: none`.
- `src/main.js` changes only the root `data-theme` based on the selected approved scene. Components read aliases and no public theme preference or switcher was added.
- Closed the Task 8 minor with a real progress list and clear native-radio card `checked`/`focus-visible` states, including full-card pointer targets.
- Closed the Task 9 visual minor with static loading bars and removed decorative reason/selection checks.
- Primary and alternative images use exact 4:3 intrinsic/rendered dimensions. The primary bleeds across the result surface; alternatives remain visibly smaller, row-shaped on phones and two columns from tablet width.
- Mobile stays single-column; 768px remains a single result column with two alternatives; 1024px+ uses condition/discovery columns; 1440px stays bounded to 1180px.
- The build and dist checker consume the exact existing manifest so every browser-visible image is packaged and missing-image fallback stays console-clean.
- No Provider/request contract, recommendation algorithm, reducer, dependency, workflow, persistence, analytics/telemetry, Phase 6A, or Phase 6B behavior changed.

## Verification

```text
node --test tests/presentation/theme-system.test.js tests/presentation/recommendation-view-model.test.js tests/presentation/meal-plan-view-model.test.js
  PASS — 16/16

npm test
  PASS — 133/133

npm run build
  PASS — generated dist with exact local dish asset allowlist

npm run check:dist
  PASS — dist artifact contract verified

npx playwright test tests/e2e/recommendation-flow.spec.js
  PASS — 22/22

npx playwright test tests/e2e/recommendation-flow.spec.js --grep "result|placeholder|empty|error"
  PASS — 7/7, shared console/resource gate clean

npm run check:js
  PASS — 58 JavaScript files

git diff --check
  PASS — only Git line-ending notices
```

Browser-specific evidence:

- 320, 390, 768, 1024, and 1440 each completed a real single-diner scenario and had `scrollWidth === clientWidth`.
- Every primary and alternative image loaded locally, rendered at 4:3, and the primary width exceeded each alternative by more than 1.2×.
- All six themes were reached through the root attribute only.
- With `prefers-reduced-motion: reduce`, the observed loading subtree had zero animations and swap left no animation longer than 50ms.
- A 720px CSS viewport (1440px at 200% zoom equivalent) kept both result controls at least 44px high, horizontally reachable, non-overlapping, and overflow-free.
- Full E2E `afterEach` recorded no console warning/error, page error, or failed request. The expected custom-404 resource message remains locally isolated and explicitly cleared by its existing test.

## Screenshots

- Mobile 390px result: `.superpowers/sdd/2026-08-23-phase-3-7-scenario-discovery-implementation/task-10-screenshots/mobile-390-result.png`
- Desktop 1440px two-column result: `.superpowers/sdd/2026-08-23-phase-3-7-scenario-discovery-implementation/task-10-screenshots/desktop-1440-result.png`

Both were generated from the built artifact with reduced motion and no browser console/resource problems, then visually inspected. Screenshot-only CSS hid fixed navigation/action elements (and disabled sticky positioning in the tall desktop element capture) to avoid Playwright full-page stitching artifacts; production verification did not use those overrides. Screenshots remain ignored/uncommitted task-workspace evidence.

## Concerns

No unresolved implementation concern. `src/main.js`, the build scripts, and their build contract test are the smallest necessary scope expansion beyond the nominal style/asset file list: root-only scenario theme selection and packaged console-clean local images cannot be delivered from CSS/source assets alone. The exact manifest prevents recursive or external asset copying. Rollback is the Task 10 commit on baseline `56fc9a0`.

## Independent review fix — round 1

### RED

The review was reproduced against commit `a7eb2a8`: category-level `imageKey` defaults assigned a concrete asset to all 175 dishes, including visibly incompatible fish, soup-rice, oden, cold-noodle, and konjac dishes; image alt text then described each generic asset as if it were the named dish. The late-night focus color also failed the requested 3:1 non-text contrast on white and selected surfaces, and `#7f8580` small muted text failed 4.5:1 on white.

Focused command:

```powershell
node --test tests/presentation/theme-system.test.js tests/presentation/recommendation-view-model.test.js tests/presentation/meal-plan-view-model.test.js
```

Result: 19 tests, 15 passed and 4 failed for the four intended behaviors: focus contrast, muted-text contrast, audited-only image assignment, and representative mismatch fallback. A separate focused alt test failed with actual `照烧鸡腿饭菜品灵感示意图` versus the asset-truthful expected `鸡肉米饭碗菜品灵感图`. Production code was unchanged before these failures were observed.

### Audited mapping rule and implementation

Category metadata no longer supplies an `imageKey`, and the former dish overrides no longer bypass the audit. A single explicit dish-name allowlist is now the only way static catalog data receives a concrete image. An assignment is admitted only when the visible food form and the dish name remain semantically compatible to an ordinary user; cuisine/category resemblance alone is insufficient. Unlisted dishes expose no `item.image` and no metadata `imageKey`, so the existing presentation boundary supplies the neutral local placeholder.

The 12 independently asserted mappings are:

- `照烧鸡腿饭 → rice-bowl`
- `小火锅`, `老北京涮羊肉 → hotpot`
- `烧烤烤串 → grill`
- `卤味拼盘`, `卤香干 → braised`
- `低脂轻食沙拉`, `牛油果鸡胸碗`, `藜麦蔬菜碗`, `蛋白能量碗 → light-meal`
- `广式云吞汤 → soup`
- `红酒烩牛肉 → sharing`

This leaves 163 of 175 dishes intentionally unassigned. All twelve generated WebP assets remain project-local and packaged, but assets without a safe catalog match are not forced into use. Every concrete asset now has an asset-truthful alt descriptor such as `鸡肉米饭碗菜品灵感图`, `双味火锅菜品灵感图`, or `青菜云吞汤菜品灵感图`; alt construction never interpolates the recommended dish name.

The six fixed mismatch fixtures are `清蒸鲈鱼套餐`, `山药排骨汤饭`, `鲍汁捞饭`, `关东煮`, `魔芋凉皮`, and `荞麦冷面`. Each now reaches `菜品灵感占位图`, rather than `plated.webp` or `light-meal.webp`.

For accessibility, late-night focus changed to `#B67600`; its contrast is 3.24:1 on the fixed page, 3.76:1 on white cards, and 3.07:1 on the selected surface. Small tertiary text changed to `#5F645F`; the numerical contract checks all card/input/secondary/hover/selected theme surfaces, with a minimum of 4.60:1.

### GREEN and revised visual evidence

```text
focused theme/view-model/meal-plan tests  PASS — 20/20
npm test                                 PASS — 137/137
npm run build                            PASS
npm run check:dist                       PASS
npm run check:js                         PASS — 58 JavaScript files
full recommendation-flow E2E             PASS — 22/22
Task 9 result|placeholder|empty|error     PASS — 7/7
git diff --check                         PASS — line-ending notices only
```

The full E2E rerun reconfirmed 320/390/768/1024/1440 overflow and image ratios, all six themes, console cleanliness, reduced motion, and the 200% zoom-equivalent gate. Revised screenshots were captured from the built artifact and inspected at original resolution. The mobile and desktop review flows deliberately reproduce the previous `清蒸鲈鱼套餐` / `山药排骨汤饭` conflict; all shown dishes now use the neutral placeholder, with no concrete-photo/name mismatch. The final mobile capture has no fixed-action overlay. The CLI browser reported zero console warnings or errors, and the capture browser plus local server were closed afterward.

## Independent review fix — round 2

The remaining review found three still-too-broad assignments: the split red/clear hotpot image did not truthfully depict either generic `小火锅` or copper-pot `老北京涮羊肉`, and the chicken-topped light-meal image did not truthfully depict a vegetable-only `藜麦蔬菜碗`.

### RED / GREEN

The literal audited expectation removed those three names and the placeholder regression added all three before production changed. Focused RED produced two intended failures: the exact audited-only list reported the three unexpected concrete images, and the mismatch test observed `小火锅` still resolving to `hotpot.webp`. After deleting only the three allowlist entries, the focused theme/mapping/view-model/meal-plan suite passed 20/20.

The final explicit allowlist contains 9 mappings:

- `照烧鸡腿饭 → rice-bowl`
- `烧烤烤串 → grill`
- `卤味拼盘`, `卤香干 → braised`
- `低脂轻食沙拉`, `牛油果鸡胸碗`, `蛋白能量碗 → light-meal`
- `广式云吞汤 → soup`
- `红酒烩牛肉 → sharing`

Each remaining mapping was rechecked against the actual asset: the visible primary subject directly matches the named chicken rice bowl, skewers, braised assortment/tofu, chicken-avocado light meal, wonton soup, or beef stew. No borderline mapping was retained for asset usage. The other 166 dishes now expose no concrete image and reach the neutral placeholder through the existing presentation boundary.

Verification:

```text
focused theme/mapping/view-model/meal-plan tests  PASS — 20/20
npm run build                                  PASS
npm run check:dist                             PASS
npm run check:js                               PASS — 58 JavaScript files
single-result placeholder E2E smoke            PASS — 1/1
git diff --check                               PASS — line-ending notices only
```

The existing 390px and 1440px screenshots do not exercise any of the three removed assignments; their reproduced fish/soup-rice placeholder evidence and layout are unchanged, so they were not recaptured in round 2. No five-width rerun was needed because this round changes only three static data allowlist entries, not rendering, styles, assets, or responsive behavior.
