# Styling

## Tailwind v4

Configuration is **CSS-first**. No `tailwind.config.js` file. Everything lives in `src/app.css`:

```css
@import "tailwindcss";
```

All Tailwind utility classes are available on every page that loads `/app.css`.

The site's colours, fonts and spacing are tokens in `@theme`, written for each site. Use logical utilities (`ms-*`, `pe-*`, `text-start`) so both directions work.

The build inlines the stylesheet into each page when it is under 50KB, so nothing blocks the first paint.

## View Transitions

Enabled in `src/app.css` with `@view-transition { navigation: auto }`, inside `prefers-reduced-motion: no-preference`. No JavaScript is involved.

To animate one element between two pages, give it the same name on both, unique within each page:

```html
<img style="view-transition-name: hero" ... />
```
