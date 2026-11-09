// Everything search engines and agents need that can be derived is derived here, from
// site.config.json and each page's own <title> and description, so a page cannot forget it.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

export const site = JSON.parse(readFileSync(resolve('site.config.json'), 'utf-8'))
export const locales = Object.keys(site.locales)
export const NOT_INDEXED = '404.html'
export const RTL = ['ar', 'fa', 'he', 'ur']
export const indexNowKey = createHash('sha256').update(site.url).digest('hex').slice(0, 32)

const [defaultLocale] = locales
const DIST = resolve('dist')
const VIEWS = resolve('src/views')
const PAGES = resolve('src/pages')
const LOCALES = resolve('src/locales')

// verify.mjs builds against its local server: Lighthouse fails a canonical on another domain.
const origin = (process.env.SITE_URL || site.url).replace(/\/$/, '')

// The first locale lives at the root, every other one under /<locale>/.
export const localeOf = page => (page.includes('/') && locales.includes(page.split('/')[0]) ? page.split('/')[0] : defaultLocale)
const basePage = page => (localeOf(page) === defaultLocale ? page : page.slice(localeOf(page).length + 1))
export const pageIn = (page, locale) => (locale === defaultLocale ? basePage(page) : `${locale}/${basePage(page)}`)

// contact.html → /contact, index.html → /, en/index.html → /en/. Matches nginx.conf.
export const routeOf = page => '/' + page.replace(/\.html$/, '').replace(/(^|\/)index$/, '$1')

// One design, a real page per language, as Astro's i18n does. src/views/x.html is copied to
// src/pages/x.html for the first locale and src/pages/<locale>/x.html for each other one, and
// seo() fills each copy from src/locales/<locale>.json. src/pages/ is generated: never edit it.
const flatten = (object, prefix = '') =>
  Object.entries(object).flatMap(([key, value]) => (value && typeof value === 'object' ? flatten(value, `${prefix}${key}.`) : [[prefix + key, String(value)]]))
const texts = () =>
  Object.fromEntries(locales.map(locale => {
    const file = join(LOCALES, `${locale}.json`)
    return [locale, existsSync(file) ? Object.fromEntries(flatten(JSON.parse(readFileSync(file, 'utf-8')))) : {}]
  }))

export const renderPages = () => {
  if (!existsSync(VIEWS)) throw new Error('Pages are written in src/views/; src/pages/ is generated from them.')
  const all = texts()
  if (locales.length > 1) {
    const keys = new Set(Object.values(all).flatMap(Object.keys))
    for (const locale of locales) {
      if (!existsSync(join(LOCALES, `${locale}.json`))) throw new Error(`Create src/locales/${locale}.json: every language has its own text file.`)
      const missing = [...keys].filter(key => !(key in all[locale]))
      if (missing.length) throw new Error(`src/locales/${locale}.json is missing: ${missing.join(', ')}`)
    }
  }
  const views = readdirSync(VIEWS, { recursive: true }).filter(f => f.endsWith('.html')).map(f => f.split('\\').join('/'))
  const misplaced = views.filter(view => locales.includes(view.split('/')[0]))
  if (misplaced.length) throw new Error(`A view is written once for every language, not per language folder: ${misplaced.join(', ')}`)
  rmSync(PAGES, { recursive: true, force: true })
  for (const view of views) {
    const html = readFileSync(join(VIEWS, view), 'utf-8')
    for (const locale of view === NOT_INDEXED ? [defaultLocale] : locales) {
      const target = join(PAGES, pageIn(view, locale))
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, html)
    }
  }
}

// {{t:key}} is the text of that key; inside an attribute its quotes are escaped, inside JSON-LD
// it is JSON-escaped. {{href:contact}} links to that page in the same language.
const TEXT = /\{\{t:([\w.-]+)\}\}/g
const fill = (html, locale) => {
  const text = texts()[locale]
  const value = key => {
    if (!(key in text)) throw new Error(`{{t:${key}}} is not in src/locales/${locale}.json`)
    return text[key]
  }
  return html
    .replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (_, open, json, close) => open + json.replace(TEXT, (__, key) => JSON.stringify(value(key)).slice(1, -1)) + close)
    .replace(/="[^"]*"/g, attr => attr.replace(TEXT, (_, key) => value(key).replace(/"/g, '&quot;')))
    .replace(TEXT, (_, key) => value(key))
    .replaceAll('{{lang}}', locale)
    .replaceAll('{{dir}}', RTL.includes(locale) ? 'rtl' : 'ltr')
    .replace(/\{\{href:([\w/-]+)\}\}/g, (_, name) => routeOf(pageIn(`${name}.html`, locale)))
}

// Titles reach this file HTML-escaped; JSON and plain text want the words themselves.
const plain = text => text.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const attribute = text => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

const AI_CRAWLERS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot',
  'Google-Extended', 'Applebot', 'Applebot-Extended', 'meta-externalagent',
]

const ICONS = `<link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" type="image/png" href="/favicon-32.png" sizes="32x32">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <meta name="theme-color" content="${site.brand.theme}">
  <script type="speculationrules">{"prerender":[{"where":{"href_matches":"/*"},"eagerness":"moderate"}]}</script>`

const businessFields = () => {
  const { business } = site
  if (!business) return {}
  const { latitude, longitude } = business.geo
  return {
    address: { '@type': 'PostalAddress', ...business.address },
    geo: { '@type': 'GeoCoordinates', latitude, longitude },
    hasMap: `https://www.google.com/maps?q=${latitude},${longitude}`,
    openingHours: business.openingHours,
    priceRange: business.priceRange,
  }
}

const structuredData = (url, route, locale, title, description) => {
  const { name, description: about, og } = site.locales[locale]
  const organization = {
    '@type': site.business?.type ?? 'Organization',
    '@id': `${origin}/#organization`,
    name,
    url: `${origin}/`,
    image: `${origin}/og.png`,
    logo: { '@type': 'ImageObject', url: `${origin}/icon-512.png`, width: 512, height: 512 },
    description: about,
    email: site.email,
    telephone: site.phone,
    sameAs: site.sameAs,
    knowsLanguage: locales,
    ...businessFields(),
  }
  const website = { '@type': 'WebSite', '@id': `${origin}/#website`, url: `${origin}/`, name, inLanguage: locales, publisher: { '@id': organization['@id'] } }
  const webPage = {
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: title,
    description,
    isPartOf: { '@id': website['@id'] },
    about: { '@id': organization['@id'] },
    inLanguage: og.replace('_', '-'),
    primaryImageOfPage: { '@type': 'ImageObject', url: `${origin}/og.png` },
  }
  const breadcrumb = route !== '/' && {
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name, item: `${origin}/` },
      { '@type': 'ListItem', position: 2, name: title, item: url },
    ],
  }
  const graph = [organization, website, webPage, breadcrumb].filter(Boolean)
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')
}

const alternates = (page, pages) => {
  if (locales.length < 2) return []
  const translated = locales.filter(locale => pages.includes(pageIn(page, locale)))
  return [
    ...translated.map(locale => [locale, origin + routeOf(pageIn(page, locale))]),
    ['x-default', origin + routeOf(pageIn(page, defaultLocale))],
  ]
}

const headFor = (page, html, pages) => {
  if (page === NOT_INDEXED) return ICONS
  const route = routeOf(page)
  const url = origin + route
  const locale = localeOf(page)
  const { name, og } = site.locales[locale]
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''
  const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"/)?.[1] ?? ''
  return `<link rel="canonical" href="${url}">
  ${alternates(page, pages).map(([lang, href]) => `<link rel="alternate" hreflang="${lang}" href="${href}">`).join('\n  ')}
  <link rel="alternate" type="text/plain" href="/llms.txt" title="Site summary for AI agents">
  ${ICONS}
  <meta name="robots" content="max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${attribute(name)}">
  <meta property="og:locale" content="${og}">
  ${locales.filter(l => l !== locale).map(l => `<meta property="og:locale:alternate" content="${site.locales[l].og}">`).join('\n  ')}
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${origin}/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${structuredData(url, route, locale, plain(title), plain(description))}</script>`
}

const robots = () =>
  `${['User-agent: *\nAllow: /', ...AI_CRAWLERS.map(bot => `User-agent: ${bot}\nAllow: /`), `Sitemap: ${origin}/sitemap.xml`].join('\n\n')}\n\n# AI-readable site summary: ${origin}/llms.txt\n`

const sitemap = pages => {
  const urls = pages.filter(page => page !== NOT_INDEXED).map(page => {
    const links = alternates(page, pages).map(([lang, href]) => `\n    <xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`).join('')
    return `  <url>\n    <loc>${origin}${routeOf(page)}</loc>${links}\n  </url>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`
}

const manifest = () => {
  const { name, description } = site.locales[defaultLocale]
  return JSON.stringify({
    name,
    short_name: name.slice(0, 12),
    description,
    lang: defaultLocale,
    dir: RTL.includes(defaultLocale) ? 'rtl' : 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: site.brand.theme,
    background_color: site.brand.background,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  })
}

// Pages are always asked of the network first, so a deploy reaches the next navigation; the
// copy is only for offline. Only /assets/ is served from cache: its names change with content.
// The cache name changes with the build and activation deletes every older one.
const serviceWorker = build => `const CACHE = 'site-${build}'
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key)
  await self.clients.claim()
})()))
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== location.origin) return
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(caches.open(CACHE).then(async cache => {
      const hit = await cache.match(request)
      if (hit) return hit
      const response = await fetch(request)
      if (response.ok) await cache.put(request, response.clone())
      return response
    }))
  } else if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(async response => {
      if (response.ok) await (await caches.open(CACHE)).put(request, response.clone())
      return response
    }).catch(async () => (await caches.match(request)) ?? Response.error()))
  }
})
`

const pageText = html =>
  html.slice(html.indexOf('<main'), html.indexOf('</main>'))
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<h([1-3])\b[^>]*>/gi, (_, level) => `\n${'#'.repeat(Number(level) + 1)} `)
    .replace(/<[^>]+>/g, '\n')
    .split('\n').map(line => plain(line.trim())).filter(Boolean).join('\n')

// As Astro does: a small stylesheet goes inside the page, so nothing blocks the first paint.
const INLINE_CSS_LIMIT = 50 * 1024
export const inlineStyles = () => {
  const inlined = new Set()
  for (const page of readdirSync(DIST, { recursive: true }).filter(f => f.endsWith('.html'))) {
    const html = readFileSync(join(DIST, page), 'utf-8').replace(/<link\b[^>]*rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/g, (tag, href) => {
      const file = join(DIST, href)
      if (statSync(file).size > INLINE_CSS_LIMIT) return tag
      inlined.add(file)
      return `<style>${readFileSync(file, 'utf-8')}</style>`
    })
    writeFileSync(join(DIST, page), html)
  }
  for (const file of inlined) rmSync(file)
}

// What agents read, written once the pages exist so it cannot disagree with them.
export const writeAgentFiles = () => {
  const pages = readdirSync(DIST, { recursive: true }).filter(f => f.endsWith('.html') && f !== NOT_INDEXED).sort()
  const { name, description } = site.locales[defaultLocale]
  const read = page => readFileSync(join(DIST, page), 'utf-8')
  const summary = `# ${name}\n\n> ${description} Contact: ${site.email}, ${site.phone}.\n\n`
  const entries = locale => pages.filter(page => localeOf(page) === locale).map(page => {
    const html = read(page)
    return `- [${plain(html.match(/<title>([^<]*)/)[1])}](${origin}${routeOf(page)}): ${plain(html.match(/name="description"\s+content="([^"]*)/)[1])}`
  })
  const lists = locales.map(locale => `## Pages (${locale})\n${entries(locale).join('\n')}`).join('\n\n')
  writeFileSync(join(DIST, 'llms.txt'), `${summary}${lists}\n\n## More\n- [All page text](${origin}/llms-full.txt): every page as plain text.\n`)
  const sections = pages.map(page => `## ${origin}${routeOf(page)}\n\n${pageText(read(page))}`)
  writeFileSync(join(DIST, 'llms-full.txt'), `${summary}${sections.join('\n\n')}\n`)
}

export const seo = pages => ({
  name: 'seo',
  transformIndexHtml: {
    order: 'post',
    handler(html, ctx) {
      const page = relative(PAGES, ctx.filename)
      html = fill(html, localeOf(page))
      return html
        .replace(/\{\{locale:([a-z-]+)\}\}/g, (tag, locale) => (locales.includes(locale) ? routeOf(page === NOT_INDEXED ? pageIn('index.html', locale) : pageIn(page, locale)) : tag))
        .replace('</head>', () => `  ${headFor(page, html, pages)}\n</head>`)
    },
  },
  generateBundle(_, bundle) {
    const build = createHash('sha256').update(Object.keys(bundle).sort().join()).digest('hex').slice(0, 12)
    const files = {
      'robots.txt': robots(),
      'sitemap.xml': sitemap(pages),
      'site.webmanifest': manifest(),
      'sw.js': serviceWorker(build),
      [`${indexNowKey}.txt`]: indexNowKey,
    }
    for (const [fileName, source] of Object.entries(files)) this.emitFile({ type: 'asset', fileName, source })
  },
})
