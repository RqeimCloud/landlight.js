# Components

## HTML Includes (`<include>`)

Reusable partials live in `src/components/`. Include them in any page:

```html
<include src="src/components/header.html"></include>
```

Paths are always relative to the **project root** (the directory containing `vite.config.js`), regardless of how deeply nested the page is.

A partial is inserted as it is (`<slot>` is not supported). Its words are `{{t:key}}` tokens, so one copy serves every language: see `PAGES.md`.

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
