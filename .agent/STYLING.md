# Styling

## Tailwind v4

Configuration is **CSS-first**. No `tailwind.config.js`. Everything lives in `src/app.css`:

```css
@import "tailwindcss";
```

All Tailwind utilities are available on every page that loads `/app.css`. The build inlines that CSS into each page (50KB cap).

## The design: deep night and champagne gold

The template ships one finished design so a new site starts from something real. Light is paper (`#faf6ee`) and ink, dark is the deep night; the gold stays gold in both.

| Token (`src/app.css`) | Light | Dark | Use |
|---|---|---|---|
| `--paper` | `#faf6ee` | `#0a0a0b` | page background |
| `--paper-deep` | `#f3ecdd` | `#111113` | alternating sections, footer |
| `--surface` / `--surface-up` | near-white | `#151517` | cards |
| `--ink` / `--ink-soft` | `#1a1712` / `#403a2f` | `#f3ede1` / `#c2bbad` | body text |
| `--muted` | `#6b6353` | `#8b8579` | secondary text (4.5:1 and up) |
| `--line` / `--line-strong` | warm grey | warm grey | hairlines, borders |
| `--gold` | `#b3893f` | `#c9a96b` | fills, borders, icons |
| `--gold-ink` | `#7d5f26` | `#c9a96b` | **gold as text** — the only gold that passes contrast |
| `--glow` | `179 137 63` | `201 169 107` | rgb triplet for `rgb(var(--glow) / .16)` |

**Gold is never body text.** On paper, `--gold` is a 3.4:1 colour: use `text-gold-ink` for words and `--gold` for fills, borders and decoration only.

### Light and dark without duplication

Every token is one `light-dark()` pair, and `color-scheme` on `<html>` picks the side:

```css
:root {
  color-scheme: light dark;
  --paper: light-dark(#faf6ee, #0a0a0b);
}
html.light { color-scheme: light; }
html.dark { color-scheme: dark; }
```

- No class → the visitor's system decides.
- `src/components/theme.html` runs in `<head>`, adds `js`, and applies a stored choice **before paint** (no flash). Change theme handling there, never with a second script.
- The toggle in the header writes `theme` to `localStorage` and toggles `light`/`dark` on `<html>`; `src/app.js` owns that click.
- Write `bg-paper`, `text-ink`, `border-line`, `text-gold-ink`. `dark:` is available and follows the class **or** the system preference, but the tokens are preferable: they also work with JavaScript off.
- Decoration lives in CSS classes (`.glow-hero`, `.glow-side`, `.glow-panel`, `.hero-grid`, `.fade-to-paper`), not in `rgb(...)` inside a class attribute, so both themes get their own strength.

## Fonts

Self-hosted from `src/public/fonts/` (a font from a CDN fails `bun run verify`): IBM Plex Sans Arabic 400/600 for text, Amiri 700 for Arabic display, Cormorant Garamond 600 for English display, IBM Plex Mono 400 for the small technical labels. `--face-sans`, `--face-display` and `--face-mono` are the stacks; `html[lang="en"]` swaps the display face.

- The two display faces use `font-display: optional`: the headline is the largest paint, so it is never swapped after the fact.
- Droid-style unicode-ranges keep the Arabic and Latin runs of one family in separate files: copy both when you change a weight.
- `nginx.conf` caches `/fonts/` for 30 days. Replace a font under a **new file name**, or visitors keep the old one for a month.

## Components

`@layer components` in `src/app.css`, so a page reads as content:

`.eyebrow` (small label with gold rules), `.text-gold-grad` (gold sheen on one word), `.btn-gold`, `.btn-ghost`, `.card-lux` (gradient hairline border), `.icon-ring`, `.ornament` (rule, diamond, rule), `.code-chip`, `.field`, `.label`, `.nav-link`, `.site-header`, `.site-menu`, `.skip-link`, `.reveal`.

Arabic gets `letter-spacing: 0` and no uppercase in `.eyebrow` automatically.

## Motion

- `@view-transition { navigation: auto }` crossfades same-origin navigations (0.45s).
- `.reveal` fades a section in when it arrives. Gated on `html.js`, so without JavaScript the content is simply visible, and `src/app.js` shows anything already on screen with **no** animation: an element at `opacity: 0` breaks the largest-paint rule and fails contrast.
- The sticky header takes its background from a scroll-driven CSS animation where the browser supports `animation-timeline`, and is solid otherwise. No JavaScript.
- Everything decorative sits inside `@media (prefers-reduced-motion: reduce)` guards: no reveal, no sheen, no header animation, no hover lift.
