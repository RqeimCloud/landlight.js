# Pages (MPA Routing)

## Adding a page

Drop any `.html` file into `src/pages/`. The build scans this directory recursively — **no config changes needed**.

```
src/pages/index.html           →  /              →  dist/index.html
src/pages/contact.html         →  /contact       →  dist/contact.html
src/pages/about.html           →  /about         →  dist/about.html
src/pages/blog/post.html       →  /blog/post     →  dist/blog/post.html
src/pages/products/cat/x.html  →  /products/cat/x → dist/products/cat/x.html
```

## Page template

Every page must load the global CSS and JS using root-relative paths:

```html
<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Your Page Title</title>
    <meta name="description" content="120 to 158 characters, unique to this page." />
    <link rel="stylesheet" href="/app.css" />
  </head>
  <body class="bg-gray-50 text-gray-900 antialiased">

    <!-- Include a shared component -->
    <include src="src/components/header.html"></include>

    <!-- Your page content here (exactly one h1) -->
    <main id="main" class="max-w-6xl mx-auto px-4 py-16">
      <h1 class="text-4xl font-bold">Hello</h1>
    </main>

    <include src="src/components/footer.html"></include>

    <script type="module" src="/app.js"></script>
  </body>
</html>
```

**Rules:**
- `<title>` and the description are the only SEO tags to write; `scripts/site-plugin.mjs` generates the rest and adds the page to `sitemap.xml`.
- Every page exists in every language of `site.config.json`, as a real file with its own text.
- CSS and JS paths are always `/app.css` and `/app.js` (root-relative from `src/`).
- `<include>` paths are always relative to the **project root** (where `vite.config.js` lives). Use `src/components/...`.
- The file name (without `.html`) becomes the URL slug. `en/index.html` becomes `/en/`.
