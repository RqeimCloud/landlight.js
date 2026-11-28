# Styling

## Tailwind v4

Configuration is **CSS-first**. No `tailwind.config.js`. Everything lives in `src/app.css`:

```css
@import "tailwindcss";
```

All Tailwind utilities are available on every page that loads `/app.css`. The build inlines that CSS into each page (50KB cap).

## No design is shipped

The template starts as a **neutral skeleton**: paper, ink, hairlines and one text face. The pages in `src/views/` are structure — hero, services, about, contact, legal — not a look, and nothing in them is a brand decision.

Define the system for the request in `@theme`, then replace the skeleton's classes with it. The gate is the result: contrast, accessibility, and one real page per language. Any direction that meets it is accepted; a shipped palette, typeface or component style is not a default to keep.

| Token (`src/app.css`) | Value | Use |
|---|---|---|
| `--paper` | `#ffffff` | page background |
| `--paper-deep` | `#f5f5f4` | alternating sections, footer |
| `--ink` | `#18181b` | body text |
| `--ink-soft` | `#52525b` | secondary text (4.5:1 on paper) |
| `--line` | `#e4e4e7` | hairlines, borders |
| `--font-sans` | the one text face | every page |

Every text colour must be 4.5:1 on the surface it sits on; decoration may be lighter, never words.

If the design needs a second theme (light and dark), build it as one `light-dark()` pair per token with `color-scheme` on `<html>`, and apply a stored choice in a `<head>` script before paint. It is a design decision, so it comes from the request, not from the template.

## Fonts

Self-hosted from `src/public/fonts/` (a CDN font fails `bun run verify`): IBM Plex Sans Arabic 400/600, Arabic and Latin ranges in four files. No display or mono face ships.

- Unicode-ranges keep the Arabic and Latin runs of one family in separate files: copy both when you add a weight.
- A display face taken from a design uses `font-display: optional`: the headline is the largest paint, so it is never swapped after the fact.
- `nginx.conf` caches `/fonts/` for 30 days. Replace a font under a **new file name**, or visitors keep the old one for a month.

## Components

`@layer components` in `src/app.css`, so a page reads as content:

`.shell` (page width and padding), `.skip-link`, `.eyebrow` (small label), `.btn`, `.btn-ghost`, `.card`, `.link`, `.field`. Change them once here, never per page; add the ones your design needs.

## Motion

None ships. Add what the design calls for, keep the first screen free of it, and gate every reveal on `html.js` so the content is visible without JavaScript.
