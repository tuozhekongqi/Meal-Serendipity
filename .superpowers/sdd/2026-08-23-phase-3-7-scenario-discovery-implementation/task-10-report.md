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
