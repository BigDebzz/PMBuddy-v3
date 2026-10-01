# PM Buddy: Design System (Studio)

Chosen direction: **Studio**, built from techniques measured on Dropbox, Airtable, ClickUp, Spotify and Zoom. Warm neutrals, a friendly confident headline, and the real product shown large. Light and dark are both first-class and the person chooses (Light, Dark or Auto, remembered per device).

**All values live in `src/index.css` as CSS variables. Components must use the variables and never hardcode hex values.** The only fixed colours allowed are white text on filled buttons (`#FFFFFF`), avatar colours, and downloadable document templates.

## Tokens

| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | `#F7F5F2` | `#171412` | Page background (warm, never pure white or black) |
| `--surface` | `#FFFFFF` | `#221E1B` | Cards, inputs, windows |
| `--surface-2` | `#F2EFEA` | `#2A2521` | Subtle fills inside cards, columns, hover |
| `--surface-3` | `#E9E5DF` | `#342E29` | Tracks, skeletons, stronger fills |
| `--border` | `#E3DED7` | `rgba(255,255,255,.12)` | Default borders |
| `--border-strong` | `#CFC8BF` | `rgba(255,255,255,.22)` | Dashed zones, emphasis |
| `--text` | `#1E1919` | `#F6F2EC` | Headings and body |
| `--text-2` | `#3F3A36` | `#DDD6CD` | Secondary strong text |
| `--muted` | `#5F5852` | `#ABA39A` | Supporting text (always readable) |
| `--faint` | `#77716A` | `#857D74` | Placeholders and disabled only |
| `--accent` | `#1F57F0` | `#356FEE` | Buttons and fills. White text on it |
| `--accent-text` | `#1F57F0` | `#8DB1FF` | Links and accent text |
| `--accent-tint` / `--accent-border` | `#E9F0FE` / `#BCD3FB` | blue at 16% / 42% | Selected states, soft panels |
| `--ok-*`, `--warn-*`, `--bad-*` | green, amber, red | lightened for dark | Status only: `-text`, `-tint`, `-border`, solid |

Landing extras: `--sky-1/2/a/b/c` (the blended hero sky) and `--rainbow` (the thin four-colour line under the nav).

## Typography

- **Headings:** Schibsted Grotesk (`--font-head`), weight 600 to 800, letter spacing -0.03 to -0.04em, tight line height 1.03 to 1.15.
- **Body and UI:** Albert Sans (`--font`).
- Landing headline 34px on phones up to 62px on desktop. Section headings 28 to 46px. App screens: body 15 to 16px.
- **Nothing readable under 12px. No tiny uppercase tracked labels.** Labels are sentence case at 14px or larger, full-strength colour.

## Shape and depth

Radius: buttons are pills (999px) on the landing page and 10 to 12px in the app, cards 16px, big windows 18 to 26px. Shadows come from `--shadow-sm`, `--shadow` and `--shadow-lg`. Colour is blended, not flat: the hero sky, the horizon glow and the rainbow line are the only gradients.

## Icons

One family in `src/components/Icon.js` (24px grid, rounded stroke). **No emoji and no symbol characters** (check marks, arrows, crosses, stars) anywhere in the UI. Use `<Icon name="..." />`. The AI is also told never to use emoji (`api/claude.js`).

## Theme

`ThemeToggle` sets `data-theme` on `<html>` and stores the choice in `localStorage` (`pmb-theme`). A tiny script in `public/index.html` applies it before first paint. Dark applies when `data-theme="dark"`, or when the device prefers dark and the choice is Auto.

## Do

- Show the real product (board, list, reminders) at real size.
- Use two-tone headlines or one emphasis word instead of small labels.
- Give every status a word and an icon, never colour alone.
- Keep one primary button per view.

## Don't

- Don't hardcode hex values, `#FFFFFF` backgrounds or `#000000`.
- Don't add emoji or unicode symbols. Use `Icon`.
- Don't use grey text below 4.5:1 contrast. Use `--muted`, not `--faint`, for readable text.
- Don't put equal rounded cards in threes. Use windows, ruled grids and varied sizes.
- Don't add scroll-triggered fade-ins to content people must read.

## Drift log

Append a rule here every time the agent gets something wrong.

- Text on solid blue panels is white or `rgba(255,255,255,0.88)`, never grey.
- Cards are `--surface`; never give a card the page colour.
- No card inside a card.
- Spread the fade-in helper before layout styles so it cannot override flex or grid.
- Never re-save source files through PowerShell Get-Content and Set-Content. It corrupts symbols and adds a BOM.
- Build with `CI=true npm.cmd run build` before pushing. Warnings fail the Vercel build.
- The `PMBuddyAssistant` and other `React.createElement` files use `icon(name, size)` from `Icon.js`.
