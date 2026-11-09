# Pages and languages (MPA + SSG)

## One view, a real page per language

Write each page once in `src/views/`. Write its words in `src/locales/<locale>.json`, one file per language of `site.config.json`. The build writes a real HTML page for each language, so nothing is translated in the browser.

```
src/views/index.html    →  /           (first locale)   and  /en/          (each other locale)
src/views/contact.html  →  /contact                      and  /en/contact
src/views/blog/post.html → /blog/post                    and  /en/blog/post
src/views/404.html      →  /404.html, first locale only
```

`src/pages/` is generated from the views on every build and is git-ignored. Never edit it, because the next build replaces it.

## Tokens

| In a view or component | Becomes |
|---|---|
| `{{t:hero.title}}` | That key's text in the page's language. Nested JSON keys are joined with dots. |
| `{{lang}}` / `{{dir}}` | `ar` / `rtl`, `en` / `ltr`… |
| `{{href:contact}}` | `/contact` on an Arabic page, `/en/contact` on an English one. Use `{{href:index}}` for home. |
| `{{locale:en}}` | This same page in English: the language switch. |

- A text value may contain HTML, such as `<strong>`.
- Inside an attribute, quotes in the value are escaped for you. Inside `<script type="application/ld+json">`, the value is JSON-escaped.
- A missing key stops the build and names the key. With more than one language, every locale file must have the same keys.
- `npm run verify` fails a page whose text is the same in two languages.

## Page template

```html
<!doctype html>
<html lang="{{lang}}" dir="{{dir}}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{t:contact.title}}</title>
    <meta name="description" content="{{t:contact.description}}" />
    <link rel="stylesheet" href="/app.css" />
  </head>
  <body>
    <include src="src/components/header.html"></include>
    <main id="main">
      <h1>{{t:contact.heading}}</h1>
    </main>
    <include src="src/components/footer.html"></include>
    <script type="module" src="/app.js"></script>
  </body>
</html>
```

**Rules:**
- `<title>` and the description are the only SEO tags to write; `scripts/site-plugin.mjs` generates the rest and adds every language's page to `sitemap.xml` with hreflang.
- CSS and JS paths are always `/app.css` and `/app.js`.
- `<include>` paths are relative to the project root: `src/components/...`. Components use the same tokens, so one header serves every language.
- A one-language site can write its text directly in the view; the tokens are then optional.
