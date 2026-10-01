# PM Buddy: Design System
> A friendly guide in a quiet, sunlit room: warm paper, a calm river-blue voice.

**Theme:** light, warm

PM Buddy is for people who are not project managers, so it must feel safe, clear and encouraging. Warm off-white pages, white cards with soft shadows, one river-blue accent, and plain-English labels. Colour is rationed: blue means "do this" or "you are here", and green, amber and red only ever mean status.

**All values live in `src/index.css` as CSS variables. Components must use the variables, never hardcoded hex values.**

## Tokens: Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| River Blue | `#35709A` | `--color-primary` | Primary buttons, links, active tab, focus ring |
| River Blue Deep | `#2B5F85` | `--color-primary-hover` | Hover/pressed primary, emphasis text on River Mist |
| River Mist | `#E8F1F6` | `--color-primary-tint` | Selected items, info panels, soft highlights |
| River Border | `#BCD6E5` | `--color-primary-border` | Border of River Mist panels |
| Canvas | `#FAF8F5` | `--color-canvas` | Page background |
| Surface | `#FFFFFF` | `--color-surface` | Cards, inputs, modals, dropdowns |
| Stone Border | `#E7E2DA` | `--color-border` | Default borders and dividers |
| Ink | `#2B2A28` | `--color-text` | Headings and body text |
| Muted | `#6B665F` | `--color-text-muted` | Secondary text, captions, labels |
| Faint | `#8A847B` | `--color-text-faint` | Placeholders and disabled only (fails contrast for body text) |
| Success | `#15803D` | `--color-success` | Done, healthy, on track |
| Success Tint | `#F0FDF4` | `--color-success-tint` | Success badge/panel background |
| Warning | `#D97706` | `--color-warning` | At risk, due soon |
| Warning Tint | `#FFFBEB` | `--color-warning-tint` | Warning badge/panel background |
| Danger | `#DC2626` | `--color-danger` | Overdue, blocked, errors, destructive actions |
| Danger Tint | `#FEF2F2` | `--color-danger-tint` | Danger badge/panel background |

## Tokens: Typography

**Plus Jakarta Sans** (`--font`), fallback system sans-serif. Weights 400, 500, 600, 700.

| Role | Size | Line height | Weight | Token |
|------|------|-------------|--------|-------|
| caption | 12px | 1.4 | 500 | `--text-caption` |
| body-sm | 14px | 1.5 | 400 | `--text-body-sm` |
| body | 16px | 1.6 | 400 | `--text-body` |
| heading-3 | 20px | 1.3 | 700 | `--text-h3` |
| heading-2 | 26px | 1.25 | 700 | `--text-h2` |
| heading-1 | 34px (28px under 480px) | 1.2 | 700 | `--text-h1` |

## Tokens: Spacing and Shapes

Base unit 4px. Scale: `--space-1` 4, `--space-2` 8, `--space-3` 12, `--space-4` 16, `--space-6` 24, `--space-8` 32, `--space-12` 48, `--space-16` 64.

| Element | Radius | Token |
|---------|--------|-------|
| Buttons, inputs | 10px | `--radius` |
| Cards, panels | 16px | `--radius-lg` |
| Modals, sheets | 20px | `--radius-xl` |
| Badges, tags, avatars | 999px | `--radius-full` |

| Shadow | Value | Token |
|--------|-------|-------|
| Small | `0 1px 2px rgba(43,42,40,0.06)` | `--shadow-sm` |
| Medium | `0 4px 14px rgba(43,42,40,0.08)` | `--shadow` |
| Large (modals only) | `0 12px 32px rgba(43,42,40,0.12)` | `--shadow-lg` |

Layout: content max-width 1120px, page padding 24px (16px on phones), section gap 32px, card padding 20px (16px on phones), gap between cards 16px.

## Components

- **Primary button:** background `--color-primary`, white text, 10px radius, padding 10px 18px, 14px weight 600. Hover `--color-primary-hover`. Disabled: `--color-border` background, `--color-text-faint` text.
- **Secondary button:** white surface, 1px `--color-border`, `--color-text` text, same size. Hover: `--color-canvas` background.
- **Danger button:** only for destructive actions. `--color-danger` background, white text.
- **Nav bar:** `--color-surface`, 1px bottom `--color-border`, no shadow. Active item in `--color-primary` with `--color-primary-tint` background.
- **Card:** `--color-surface`, 1px `--color-border`, 16px radius, 20px padding, `--shadow-sm`. Hover on clickable cards: `--shadow`.
- **Input:** `--color-surface`, 1px `--color-border`, 10px radius, 16px text, padding 10px 14px. Focus: 2px `--color-primary` ring. Error: `--color-danger` border and message below in 14px.
- **Badge:** fully round, 12px weight 600, padding 2px 10px. Status badges use a tint background and the matching strong colour for text.
- **Section header:** heading-2 in `--color-text`, optional one-line description in `--color-text-muted` 14px below, 4px apart.
- **Footer:** `--color-canvas`, 1px top `--color-border`, caption text in `--color-text-muted`.

## Do's and Don'ts

### Do
- Use CSS variables for every colour, radius, shadow and font size.
- Use `--color-primary` for the single most important action on each screen.
- Use plain English labels ("What could go wrong", not "Risk register").
- Show status with colour **and** a word or icon, never colour alone.
- Keep body text at 16px and secondary text at 14px minimum. Nothing readable below 12px.
- Give every tap target at least 44px of height on phones.
- Show empty states with a friendly sentence and one clear next action.

### Don't
- Don't hardcode hex values in components.
- Don't use `#8A847B` (Faint) for text people need to read.
- Don't use red, amber or green for decoration. They only mean status.
- Don't use black buttons or the old purple.
- Don't put more than one primary button in the same view.
- Don't use shadows larger than `--shadow` on cards, or `--shadow-lg` anywhere except modals.
- Don't use corner radii outside the token list.
- Don't use jargon such as RACI, RAID, methodology, stakeholder matrix.

## Surfaces and Elevation

1. **Canvas** (`--color-canvas`): page background.
2. **Surface** (`--color-surface`): cards and inputs, with `--shadow-sm`.
3. **Raised** (hover cards, dropdowns): `--shadow`.
4. **Modal** (`--color-surface` over a 40% ink overlay): `--shadow-lg`.

Only these may have shadows. Flat elements (nav, footer, badges) have none.

## Layout

Single centred column, max 1120px. Dashboard and project views use a card grid: 1 column on phones, 2 on tablets, 3 on desktop, 16px gaps. Page title top-left, primary action top-right. Everything is left-aligned except hero and empty-state content, which is centred.

## Agent Quick Reference

- text `#2B2A28`, muted `#6B665F`
- background `#FAF8F5`, card `#FFFFFF`
- border `#E7E2DA`
- accent / primary action `#35709A` (hover `#2B5F85`)

Example prompts:
1. "Build a project card: surface white, 1px border, 16px radius, 20px padding, shadow-sm. Title heading-3, status badge top-right, next milestone in muted 14px, progress bar in primary."
2. "Build a primary button and a secondary button side by side, using tokens only."
3. "Build an empty state for a project with no tasks: centred friendly sentence, one primary button 'Add your first task'."

## Quick Start

```css
:root {
  --color-primary: #35709A;
  --color-primary-hover: #2B5F85;
  --color-primary-tint: #E8F1F6;
  --color-primary-border: #BCD6E5;
  --color-canvas: #FAF8F5;
  --color-surface: #FFFFFF;
  --color-border: #E7E2DA;
  --color-text: #2B2A28;
  --color-text-muted: #6B665F;
  --color-text-faint: #8A847B;
  --color-success: #15803D;
  --color-success-tint: #F0FDF4;
  --color-warning: #D97706;
  --color-warning-tint: #FFFBEB;
  --color-danger: #DC2626;
  --color-danger-tint: #FEF2F2;

  --font: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --text-caption: 12px; --text-body-sm: 14px; --text-body: 16px;
  --text-h3: 20px; --text-h2: 26px; --text-h1: 34px;

  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px;

  --radius: 10px; --radius-lg: 16px; --radius-xl: 20px; --radius-full: 999px;

  --shadow-sm: 0 1px 2px rgba(43,42,40,0.06);
  --shadow: 0 4px 14px rgba(43,42,40,0.08);
  --shadow-lg: 0 12px 32px rgba(43,42,40,0.12);
}
```

## Drift log
Append a new rule here every time the agent gets something wrong, so it cannot happen again.

- **Text on River Blue panels** is white or `rgba(255,255,255,0.88)`. Never grey, and never the same blue as the panel.
- **Prefer light panels** (`--color-primary-tint` with a `--color-primary-border` border and dark text) over solid blue panels. Solid blue is for buttons, the landing page bands and the assistant header.
- **Cards are white** (`--color-surface`) on the warm canvas. Never give a card the canvas colour.
- **No card inside a card.** Tab content sits directly on the canvas, and each section is its own card.
- **Shadows use the warm ink colour** `rgba(43,42,40, ...)`, never pure black.
- **The font must be loaded** in `public/index.html`. A font name in CSS alone does nothing.
- **Build with `CI=true npm.cmd run build`** before pushing. Warnings fail the Vercel build.
