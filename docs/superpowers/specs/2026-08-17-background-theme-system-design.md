# Phase 3.6 Background Theme System Design

## Decision

Meal-Serendipity will use a low-saturation, single-theme background system. The default theme is `mint`, rendered as a solid `#EEF8F1` page background. No gradient is active by default. A page may activate only one theme through the `data-theme` attribute on the root `html` element.

This work remains within Phase 3.6. It does not add a public theme switcher, change recommendation behavior, alter Provider contracts, request new data, or enter Phase 4.

## Goals

- Give the page more atmosphere than pure white without returning to saturated or AI-template styling.
- Keep cards, controls, text, states, and dialogs legible in all five themes.
- Make a future theme switcher a small attribute change rather than a component rewrite.
- Preserve the existing editorial layout, three-role typography, responsive behavior, truth boundaries, and accessibility semantics.

## Theme Architecture

`tokens.css` owns all theme definitions. Shared typography, spacing, radii, semantic status colors, and focus colors remain in `:root`. Theme-specific surface values live in these selectors:

```css
[data-theme="neutral"] {}
[data-theme="mint"] {}
[data-theme="cream"] {}
[data-theme="fog"] {}
[data-theme="air"] {}
```

`index.html` sets `data-theme="mint"` on `<html>`. No JavaScript theme state, persistence, switcher, or URL parameter is introduced.

Every theme defines:

- `--color-page-bg`
- `--color-soft-bg`
- `--color-card-surface`
- `--color-input-surface`
- `--color-secondary-surface`
- `--color-hover-surface`
- `--color-selected-surface`
- `--color-theme-border`
- `--color-theme-border-strong`
- `--theme-shadow-color`
- `--background-gradient`

Existing component aliases such as `--color-bg`, `--color-surface`, `--color-surface-raised`, `--color-surface-selected`, `--color-border`, and `--color-border-strong` map to the new theme variables. This limits the change to presentation code and keeps component responsibilities stable.

## Theme Values

| Theme | Page | Soft | Card | Secondary | Border | Strong border |
|---|---|---|---|---|---|---|
| Neutral | `#FFFFFF` | `#F8F8F7` | `#FFFFFF` | `#F2F2F0` | `#E3E3E0` | `#C9C9C5` |
| Mint | `#EEF8F1` | `#F6FBF7` | `#FFFFFF` | `#E5F1E8` | `#D7E7DB` | `#B8CDBD` |
| Cream | `#FFF8E9` | `#FFFCF5` | `#FFFFFF` | `#F8EFD9` | `#E8DDC5` | `#CFC1A3` |
| Fog | `#F4F5F5` | `#FAFAFA` | `#FFFFFF` | `#EDEEEE` | `#DDDFDF` | `#C2C5C5` |
| Air | `#F2F7FA` | `#FAFCFD` | `#FFFFFF` | `#E7F0F4` | `#D9E5EA` | `#BACDD6` |

Input surfaces use white with slight transparency where supported and fall back to white. Hover surfaces sit between the soft and secondary surfaces. Selected surfaces use the theme's secondary surface plus a graphite border.

`--background-gradient` is `none` in every active theme. The approved Mint implementation is solid. The two optional gradient recipes may be documented as inactive future tokens, but they are not applied to the page in this phase.

## Surface Assignment

- Page body: `--color-page-bg`.
- Header: slightly translucent `--color-card-surface`, with a theme border and no decorative blur glow.
- Hero: no card; it stays directly on the page background.
- Decision and result regions: white card surfaces with a thin theme border. They retain the editorial reading order and do not become repeated floating template cards.
- Scene choices: card surface; selected choices use the selected surface and graphite border.
- Inputs and selects: input surface with the strong theme border.
- Mobile action bar: nearly opaque card surface with a top border.
- Dialog: card surface; the backdrop remains neutral black transparency.
- Empty/loading/success regions: card surface without celebratory color.
- Error and degraded states: retain small semantic red or warning treatments; they do not recolor the entire page.

Neutral uses visible borders and a very small theme-aware shadow on the two main content regions so white cards do not disappear into the white page. Other themes rely primarily on background contrast and borders. Shadows use `--theme-shadow-color` and remain subtle.

## Buttons and Controls

The latest approved button hierarchy supersedes the preceding white-primary experiment:

- Primary: `#202020` background, white text, graphite border.
- Primary hover: `#000000` background.
- Secondary: white or slightly translucent white, graphite text, strong theme border.
- Selected: theme selected surface plus graphite border.
- Disabled: theme secondary surface and tertiary text.
- Focus: existing 3px `#6B4A2F` outline with 3px offset.

No theme may introduce a red, coral, orange, or blue filled primary button. Air remains a low-saturation background theme, not a blue action theme.

## Accessibility and Contrast

- Primary text remains `#171717`; secondary text remains `#666666`.
- The page never relies on background color alone to communicate status or selection.
- White buttons keep a visible border in every theme.
- Focus, pressed state, disabled state, and error state remain visually distinct.
- Theme testing covers keyboard navigation, dialogs, long Chinese copy, mixed Latin/numeric metadata, and the existing minimum control heights.

## Testing Strategy

### Automated contract

A presentation/theme test reads `tokens.css`, `components.css`, and `index.html` and verifies:

- all five selectors exist;
- the required variables exist in every theme;
- `data-theme="mint"` is the default;
- Mint uses the approved solid page background;
- active gradients are `none`;
- primary buttons are graphite with white text;
- no public theme switcher is added.

The existing recommendation and Provider test suite remains unchanged and must continue to pass.

### Browser matrix

For each theme, inspect initial, quick recommendation, and key control contrast at 320, 390, 768, 1024, and 1440 pixels. Across the complete set, also exercise precise filtering, three candidates, swap, loading, empty, error, degraded Provider notice, dialog, focus restoration, console output, static resource loading, and horizontal overflow.

## Risks and Rollback

- Risk: too many surfaces could reintroduce a card-template feel. Mitigation: only the two main work regions receive card surfaces; internal content stays line-based.
- Risk: Cream could drift toward the rejected warm-cream default. Mitigation: it is optional, never default, and keeps the same neutral typography and graphite actions.
- Risk: Air could resemble a blue AI tool. Mitigation: no blue actions, no active gradient, and no blue semantic accents.
- Risk: translucent surfaces may lose contrast. Mitigation: every translucent surface has an opaque white fallback and explicit border.

Rollback is limited to `tokens.css`, presentation surface rules in the style sheets, the root `data-theme` attribute, and the theme contract test. No data or domain migration is involved.

## Self-review

- No placeholders or unfinished requirements remain.
- Default Mint is explicitly solid; optional gradients are inactive.
- The latest graphite-primary requirement is explicit and supersedes the prior white-primary experiment.
- Theme selection is CSS-only and does not imply a public switcher.
- Recommendation, Provider, storage, privacy, deployment, and Phase 4 are out of scope.
