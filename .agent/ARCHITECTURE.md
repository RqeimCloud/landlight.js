# Architecture

## Directory layout

```
/
├── src/                    # Vite root, built to dist/
│   ├── app.css             # Global styles (Tailwind v4 + view transitions)
│   ├── app.js              # Starts islands and Alpine only where a page uses them
│   ├── alpine.js           # Alpine from npm (plugins: Collapse, Focus)
│   ├── webmcp.js           # WebMCP tools, loaded only by browsers that support it
│   ├── public/             # Served as-is from the site root (icons, og.png, llms.txt)
│   ├── images/             # Generated from media/ by npm run assets
│   ├── islands/            # JavaScript that runs only where a page asks for it
│   ├── components/         # Header, footer and other partials, one copy for every language
│   ├── views/              # Each page written once, with {{t:key}} for its words
│   ├── locales/            # <locale>.json: the words of every page in that language
│   └── pages/              # Generated from views, one real page per language; git-ignored
├── site.config.json        # The site's facts: URL, brand, languages, business
├── media/                  # Original logo and photos
├── scripts/assets.mjs      # media/ → icons and responsive webp images
├── scripts/site-plugin.mjs # Generates canonical, Open Graph, JSON-LD, robots.txt, sitemap.xml
├── scripts/verify.mjs      # Pre-publish gate: file checks + Lighthouse
├── prompts/                # Step-by-step instructions for building a page
├── vite.config.js          # Bundler config (MPA, Tailwind, includes, view transitions)
├── Dockerfile              # How Rqeim Cloud builds and serves the site (see DEPLOYMENT.md)
├── nginx.conf              # Caching, redirects and 404 for the built site
├── rqeim.template.json     # How Rqeim Cloud lists and runs this template
├── package.json            # Dependencies and scripts
└── .agent/                 # This folder — project documentation for agents/tools
```

## Key decisions

- **Vite `root: 'src'`** — keeps source files in `src/`, output goes to `dist/`.
- **`appType: 'mpa'`** — multi-page mode. Every generated `src/pages/**.html` is an entry point.
- **`base: '/'`** — all asset paths are root-relative (`/app.css`, `/app.js`), works at any nesting depth.
- **No legacy Tailwind config** — Tailwind v4 is `@import "tailwindcss"` in `app.css`, processed by `@tailwindcss/vite`.
- **HTML includes resolve from project root** — `<include src="src/components/header.html">` always works.
- **i18n by static generation** — `renderPages()` in `scripts/site-plugin.mjs` copies each view per language and `seo()` fills it, so every language is a real indexed page. See `PAGES.md`.
- **MPA, static, minimal JS** — every page is complete HTML and CSS; `src/app.js` starts islands only where asked.
- **View Transitions are CSS only** — `@view-transition` in `app.css`; speculation rules prerender links.
- **Offline without stale updates** — `sw.js` asks the network first for pages and only serves hashed `/assets/` from cache.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server on `localhost:5173` |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run assets` | `media/` → icons and responsive WebP images |
| `npm run verify` | The gate: must end in `VERIFY PASSED` before publishing |

## Deviations

- انحراف: لا تحسين بلا قياس — تضمين CSS (سقف 50KB) وعتبة الأداء (أخضر شرطًا، 99/100 هدفًا) وأرقام النصائح (JavaScript 10KB و120KB، وHTML 14KB) بلا رقم قبل/بعد لأن التشغيل المحلي لا يُجرى إلا بطلب صريح — يزيله أول `npm run verify` وتثبيت الأرقام المقاسة.
