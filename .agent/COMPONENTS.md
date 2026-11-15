# Components

## HTML Includes (`<include>`)

Reusable partials live in `src/components/`. Include them in any page:

```html
<include src="src/components/header.html"></include>
```

Paths are always relative to the **project root** (the directory containing `vite.config.js`), regardless of how deeply nested the page is.

A partial is inserted as it is (`<slot>` is not supported). Its words are `{{t:key}}` tokens, so one copy serves every language: see `PAGES.md`.

The template ships four:

| Partial | What it does | Needs |
|---|---|---|
| `header.html` | Skip link, logo, navigation, language switch, theme toggle, mobile menu | `popover` (platform), `src/app.js` |
| `footer.html` | Brand, links, legal links, email | nothing |
| `theme.html` | Applies the stored light/dark choice before paint, adds `html.js` | must sit in `<head>` of every page |
| `backdrop.html` | The gold glow, the grid and the fade every page starts with | first thing inside `<main class="relative">` |

Every page opens with the same chrome: `<main id="main" class="relative">` holds `backdrop.html`, then a `.page-shell` with `.eyebrow`, `.page-title` and `.page-lead`. The landing page keeps its larger hero, and `404` uses the same shell with `is-centered`; change the shell in `src/app.css`, never per page.

The mobile menu is a `popover` and the sticky header frosts itself with a scroll-driven CSS animation: neither needs Alpine. A page that wants state adds `x-data` and only then downloads Alpine.

## Alpine.js components

Use Alpine on any page or component that needs state; pages without `x-data` do not download it:

```html
<!-- Dropdown / toggle -->
<div x-data="{ open: false }">
  <button @click="open = !open">Toggle</button>
  <div x-show="open" x-collapse>
    Content that collapses with animation.
  </div>
</div>

<!-- Counter -->
<div x-data="{ count: 0 }">
  <button @click="count++">Clicks: <span x-text="count"></span></button>
</div>

<!-- Tabs -->
<div x-data="{ tab: 'one' }">
  <button @click="tab = 'one'" :class="{ 'font-bold': tab === 'one' }">Tab 1</button>
  <button @click="tab = 'two'" :class="{ 'font-bold': tab === 'two' }">Tab 2</button>
  <div x-show="tab === 'one'">Content one</div>
  <div x-show="tab === 'two'">Content two</div>
</div>
```

### Available Alpine plugins

- **Collapse**: `x-collapse` directive for smooth height animations.
- **Focus**: `x-trap` directive for focus trapping (modals, dialogs).

Alpine is bundled from npm by `src/alpine.js` and loads only on pages containing `x-data`. Add plugins there.

## Islands

`<div data-island="name">` runs the default export of `src/islands/name.js` with that element when it nears the screen, or at idle with `data-load="idle"`.
