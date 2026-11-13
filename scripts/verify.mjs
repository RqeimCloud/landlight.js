// The gate before publishing. Nothing is published unless this ends with VERIFY PASSED.
//   npm run verify                       build, check every file, run Lighthouse locally
//   npm run verify -- https://domain     check the published site over HTTP and with Lighthouse
import { execFile, execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { gzipSync } from 'node:zlib'
import { NOT_INDEXED, RTL, indexNowKey, localeOf, locales, pageIn, routeOf, site } from './site-plugin.mjs'

const exec = promisify(execFile)
const DIST = resolve(import.meta.dirname, '../dist')
// What Lighthouse saw, one image per page and form. Rewritten on every run, never committed or deployed.
const SHOTS = resolve(import.meta.dirname, '../.verify')
const PORT = 4173
const LOCAL = `http://localhost:${PORT}`
const LIGHTHOUSE = 'lighthouse@13.6.0'
const CHROME_FLAGS = '--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage'
const RUNS = 3
// Lighthouse guides, it does not block: every category should reach GREEN, and a score under it
// is listed for the agent to fix. When no fix holds, the site may still be published, named in the report.
const GREEN = 0.9
// What every site aims for: anything under it is printed as advice.
const TARGET = { mobile: 0.99, desktop: 1 }
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
const METRICS = { LCP: 'largest-contentful-paint', CLS: 'cumulative-layout-shift', TBT: 'total-blocking-time', FCP: 'first-contentful-paint', SI: 'speed-index' }
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.xml': 'text/xml', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2' }
const COMPRESSED = /^text\/|json|svg/
const ARABIC_SCRIPT = ['ar', 'fa', 'ur']
// Advice, not limits: a page past them can still score 100, Lighthouse decides.
const INITIAL_JS = 10 * 1024
const TOTAL_JS = 120 * 1024
const FIRST_FLIGHT = 14 * 1024
// Whole-page frameworks and heavy libraries that a static landing page has lighter answers for.
const BANNED = ['react', 'react-dom', 'vue', 'svelte', '@angular/core', 'next', 'nuxt', 'jquery', 'bootstrap', 'swiper', 'moment', 'lodash', 'preact', 'solid-js', 'swup', '@barba/core', '@hotwired/turbo']
// What a site owner may ask for knowingly, listed in site.config.json "exceptions" with the reason and the cost.
// 'performance' and 'best-practices' only guide now; they stay accepted so existing sites keep building.
const EXCEPTIONS = ['performance', 'accessibility', 'best-practices', 'seo', 'cdn', 'framework', 'js-text', 'image-format', 'image-size', 'image-loading', 'legal-pages']
const ICONS = ['favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'og.png']

const isFile = path => existsSync(path) && statSync(path).isFile()
const siteFile = path => [path, `${path}.html`, join(path, 'index.html')].map(p => join(DIST, p)).find(isFile)
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, 'i'))?.[1]
const tags = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) ?? []
const meta = (html, key) => attr(tags(html, 'meta').find(t => attr(t, 'name') === key || attr(t, 'property') === key) ?? '', 'content')
const pngSize = file => { const b = readFileSync(file); return [b.readUInt32BE(16), b.readUInt32BE(20)] }

function checkPage(page, html, seen, fail) {
  const say = (message, id) => fail(`${page}: ${message}`, id)
  if (!attr(tags(html, 'html')[0] ?? '', 'lang')) say('<html> has no lang')
  const htmlTag = tags(html, 'html')[0] ?? ''
  const locale = localeOf(page)
  if (page !== NOT_INDEXED && attr(htmlTag, 'lang') !== locale) say(`<html lang> must be "${locale}", it is "${attr(htmlTag, 'lang')}"`)
  if (page !== NOT_INDEXED && attr(htmlTag, 'dir') !== (RTL.includes(locale) ? 'rtl' : 'ltr')) say(`<html dir> is wrong for ${locale}`)
  if (html.includes('{{locale:')) say('language link names a locale that is not in site.config.json')
  if (/fonts\.(googleapis|gstatic)\.com/.test(html)) say('fonts are served from this project: see prompts/02-design.md', 'cdn')
  const htmlSize = gzipSync(html).length
  if (htmlSize > FIRST_FLIGHT) warn(`${page} is ${Math.round(htmlSize / 1024)}KB compressed with its styles: under 14KB it arrives in the first round trip`)
  let initialJs = 0
  for (const script of tags(html, 'script')) {
    const src = attr(script, 'src')
    if (src && !src.startsWith('/')) say(`scripts are bundled from this project, never loaded from a CDN: ${src}`, 'cdn')
    else if (src && isFile(join(DIST, src))) initialJs += gzipSync(readFileSync(join(DIST, src))).length
  }
  if (initialJs > INITIAL_JS) warn(`${page} loads ${Math.round(initialJs / 1024)}KB of JavaScript up front: an island would load it later`)
  for (const link of tags(html, 'link')) if (attr(link, 'rel') === 'stylesheet' && !attr(link, 'href')?.startsWith('/')) say(`stylesheets and fonts are bundled from this project: ${attr(link, 'href')}`, 'cdn')
  for (const [, island] of html.matchAll(/data-island="([^"]+)"/g)) if (!isFile(resolve(`src/islands/${island}.js`))) say(`no island file: src/islands/${island}.js`)
  if (/data-i18n|i18next|x-text="\$?t\(/.test(html)) say('text is swapped by JavaScript: every language must be a real page with its text in the HTML', 'js-text')
  if (/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\D|$)/.test(meta(html, 'viewport') ?? '')) say('viewport must allow zooming', 'accessibility')
  if (attr(tags(html, 'main')[0] ?? '', 'id') !== 'main' || !html.includes('href="#main"')) say('needs <main id="main"> and a skip link to #main', 'accessibility')
  if (tags(html, '[a-z]+').some(t => Number(attr(t, 'tabindex')) > 0)) say('positive tabindex breaks keyboard order', 'accessibility')
  for (const [button, inner] of html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)) {
    if (!attr(button, 'aria-label') && !inner.replace(/<[^>]+>/g, '').trim()) say(`button without a name: ${button.slice(0, 80)}`, 'accessibility')
  }
  const fields = [...tags(html, 'input').filter(t => !/type="(hidden|submit|button)"/.test(t)), ...tags(html, 'select'), ...tags(html, 'textarea')]
  for (const field of fields) if (!attr(field, 'aria-label') && !html.includes(`for="${attr(field, 'id')}"`)) say(`field without a label: ${field.slice(0, 80)}`, 'accessibility')
  for (const frame of tags(html, 'iframe')) if (!attr(frame, 'title') || attr(frame, 'loading') !== 'lazy') say('iframe needs title and loading="lazy"', 'accessibility')
  if (tags(html, 'h1').length !== 1) say(`needs exactly one <h1>, found ${tags(html, 'h1').length}`, 'seo')

  for (const a of tags(html, 'a')) {
    const href = attr(a, 'href')
    if (href === undefined || href === '#' || href === '') say(`dead link: ${a}`)
    else if (href.endsWith('.html')) say(`link ends in .html, use the clean URL: ${href}`)
    else if (href.startsWith('#') && !html.includes(`id="${href.slice(1)}"`)) say(`link to a missing section: ${href}`)
    else if (href.startsWith('/') && !href.startsWith('//')) {
      const path = href.split(/[?#]/)[0]
      if (!siteFile(path)) say(`broken link: ${href}`)
      const first = path.split('/')[1]
      const target = locales.includes(first) ? first : locales[0]
      if (page !== NOT_INDEXED && !extname(path) && !attr(a, 'hreflang') && target !== locale) say(`${locale} page links to the ${target} version: ${href}`)
    }
  }

  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'))
  tags(main, 'img').forEach((img, index) => {
    const lazy = attr(img, 'loading') === 'lazy'
    if (index === 0 && lazy) say(`first image in <main> is the likely LCP, remove loading="lazy": ${attr(img, 'src')}`, 'image-loading')
    if (index > 0 && !lazy) say(`add loading="lazy": ${attr(img, 'src')}`, 'image-loading')
  })
  for (const img of tags(html, 'img')) {
    const src = attr(img, 'src') ?? ''
    if (attr(img, 'alt') === undefined) say(`image without alt: ${src}`, 'accessibility')
    if (!attr(img, 'width') || !attr(img, 'height')) say(`image without width and height: ${src}`)
    if (!/\.(webp|svg)(\?|$)/i.test(src)) say(`image must be webp or svg: put the original in media/ and run npm run assets: ${src}`, 'image-format')
    if (src.startsWith('/') && !isFile(join(DIST, src))) say(`missing image: ${src}`)
    else if (src.startsWith('/') && statSync(join(DIST, src)).size > 250 * 1024) say(`image over 250KB: ${src}`, 'image-size')
  }

  if (page === NOT_INDEXED) return
  const letters = main.replace(/<[^>]+>/g, ' ').match(/\p{L}/gu) ?? []
  if (letters.length < 30) say('<main> has almost no text in the HTML: write the content in the page, JavaScript must not create it', 'js-text')
  const arabic = letters.filter(l => /\p{Script=Arabic}/u.test(l)).length / (letters.length || 1)
  if (ARABIC_SCRIPT.includes(locale) ? arabic < 0.5 : arabic > 0.5) say(`the text in <main> is not written in ${locale}`)
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''
  const description = meta(html, 'description') ?? ''
  if (!title || title.length > 60) say(`<title> must be 1-60 characters, it is ${title.length}`, 'seo')
  if (description.length < 120 || description.length > 158) say(`description must be 120-158 characters, it is ${description.length}`, 'seo')
  for (const value of [title, description]) {
    if (seen.has(value)) say(`duplicate of ${seen.get(value)}: "${value}"`, 'seo')
    seen.set(value, page)
  }
  for (const key of ['viewport', 'og:title', 'og:description', 'og:image', 'og:url', 'twitter:card']) if (!meta(html, key)) say(`missing meta ${key}`)
  if (!tags(html, 'link').some(l => attr(l, 'rel') === 'canonical')) say('missing canonical')
  for (const legal of ['privacy', 'terms']) if (!html.includes(`href="${routeOf(pageIn(`${legal}.html`, locale))}"`)) say(`footer has no link to ${legal}`, 'legal-pages')
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  if (!blocks.length) say('no structured data')
  for (const [, json] of blocks) { try { JSON.parse(json) } catch { say('structured data is not valid JSON') } }
}

function checkFiles(pages, fail) {
  // Each language is generated from the same view, so the same words twice mean untranslated text.
  const words = page => readFileSync(join(DIST, page), 'utf-8').split('<main')[1]?.split('</main>')[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  for (const page of pages.filter(p => p !== NOT_INDEXED && localeOf(p) === locales[0])) {
    for (const language of locales.slice(1)) {
      if (words(page) === words(pageIn(page, language))) fail(`${pageIn(page, language)} has the same text as ${page}: write every word as {{t:key}} in src/views/ with its text in src/locales/`)
    }
  }
  const assets = readdirSync(DIST, { recursive: true }).filter(f => f.endsWith('.js') && f !== 'sw.js')
  const total = assets.reduce((sum, f) => sum + gzipSync(readFileSync(join(DIST, f))).length, 0)
  if (total > TOTAL_JS) warn(`the site ships ${Math.round(total / 1024)}KB of JavaScript in all: check prompts/libraries.md for a lighter choice`)
  const { dependencies, devDependencies } = JSON.parse(readFileSync(resolve('package.json'), 'utf-8'))
  for (const name of BANNED) if (dependencies?.[name] || devDependencies?.[name]) fail(`remove ${name}: see prompts/libraries.md for the lighter choice`, 'framework')
  if (assets.some(f => /navigator\.languages?\b/.test(readFileSync(join(DIST, f), 'utf-8')))) fail('JavaScript reads the browser language: never redirect or swap text by language', 'js-text')
  const raster = readdirSync(DIST, { recursive: true }).filter(f => /\.(jpe?g|png|gif|bmp|tiff?|avif)$/i.test(f) && !ICONS.includes(f))
  for (const file of raster) fail(`${file}: every image is webp: put the original in media/ and run npm run assets`, 'image-format')
  const absent = ['favicon.ico', ...ICONS, 'robots.txt', 'sitemap.xml', 'llms.txt', 'llms-full.txt', 'site.webmanifest', 'sw.js', `${indexNowKey}.txt`, NOT_INDEXED].filter(file => !isFile(join(DIST, file)))
  if (absent.length) return fail(`missing from the site: ${absent.join(', ')}`)
  for (const [file, w, h] of [['og.png', 1200, 630], ['apple-touch-icon.png', 180, 180], ['favicon-32.png', 32, 32], ['icon-192.png', 192, 192], ['icon-512.png', 512, 512], ['icon-maskable-512.png', 512, 512]]) {
    const [width, height] = pngSize(join(DIST, file))
    if (width !== w || height !== h) fail(`${file} must be ${w}x${h}, it is ${width}x${height}`)
  }
  const routes = pages.filter(p => p !== NOT_INDEXED).map(p => `${LOCAL}${routeOf(p)}`).sort()
  const locs = [...readFileSync(join(DIST, 'sitemap.xml'), 'utf-8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).sort()
  if (routes.join() !== locs.join()) fail(`sitemap.xml does not list exactly the public pages: ${locs.join(', ')}`)

  const llms = readFileSync(join(DIST, 'llms.txt'), 'utf-8')
  if (Buffer.byteLength(llms) > 10 * 1024) fail('llms.txt is over 10KB')
  if (!llms.startsWith('# ') || !/\n> /.test(llms)) fail('llms.txt must start with "# Name" followed by a "> summary" line')
  const own = [...llms.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map(m => new URL(m[1])).filter(u => u.origin === LOCAL)
  if (!own.length) fail('llms.txt links to no page of this site')
  for (const u of own) if (!siteFile(u.pathname)) fail(`llms.txt links to a missing page: ${u.pathname}`)
}

function placeholders(pages) {
  const found = []
  if (new URL(site.url).hostname === 'example.com') found.push('site.config.json: "url" is still example.com')
  if (/example\.com/.test(site.email)) found.push('site.config.json: "email" is still example.com')
  for (const [locale, { name }] of Object.entries(site.locales)) if (name === 'Landlight') found.push(`site.config.json: the ${locale} name is still Landlight`)
  for (const file of [...pages, 'llms.txt']) {
    const text = readFileSync(join(DIST, file), 'utf-8')
    if (/data-placeholder|example\.com/.test(text)) found.push(`${file}: template content not replaced (data-placeholder or example.com)`)
  }
  return found
}

const serve = () => new Promise(done => {
  const server = createServer((req, res) => {
    const file = siteFile(decodeURIComponent(new URL(req.url, LOCAL).pathname))
    const shown = file ?? join(DIST, NOT_INDEXED)
    const type = MIME[extname(shown)] ?? 'application/octet-stream'
    const body = readFileSync(shown)
    const gzip = COMPRESSED.test(type)
    res.writeHead(file ? 200 : 404, { 'content-type': type, ...(gzip && { 'content-encoding': 'gzip' }) })
    res.end(gzip ? gzipSync(body) : body)
  }).listen(PORT, () => done(server))
})

async function checkHttp(base, fail) {
  for (const path of ['/robots.txt', '/sitemap.xml', '/llms.txt', '/llms-full.txt', '/favicon.ico', '/og.png', '/site.webmanifest', '/sw.js', `/${indexNowKey}.txt`]) {
    const response = await fetch(base + path, { redirect: 'manual' })
    if (response.status !== 200) fail(`${path} answers ${response.status}`)
  }
  if (!(await fetch(`${base}/llms.txt`)).headers.get('content-type')?.startsWith('text/plain')) fail('llms.txt is not served as text/plain')
  if (base !== LOCAL && !/no-cache|max-age=0/.test((await fetch(`${base}/sw.js`)).headers.get('cache-control') ?? '')) fail('sw.js must be revalidated on every request, or updates will not reach visitors')
  const missing = await fetch(`${base}/this-page-does-not-exist`)
  if (missing.status !== 404) fail(`a missing page answers ${missing.status}, it must be 404`)
  else if (!/<h1/i.test(await missing.text())) fail('a missing page does not show the 404 page')
  const sitemap = await (await fetch(`${base}/sitemap.xml`)).text()
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
  if (!urls.length) fail('sitemap.xml lists no pages')
  for (const url of urls) {
    if (!url.startsWith(base)) { fail(`sitemap.xml lists another site: ${url}`); continue }
    const html = await (await fetch(url)).text()
    const canonical = attr(tags(html, 'link').find(l => attr(l, 'rel') === 'canonical') ?? '', 'href')
    if (canonical !== url) fail(`${url}: canonical is ${canonical}`)
  }
  return urls
}

async function lighthouse(url, desktop) {
  const args = ['--yes', LIGHTHOUSE, url, '--quiet', '--output=json', '--output-path=stdout', `--only-categories=${CATEGORIES.join(',')}`, `--chrome-flags=${CHROME_FLAGS}`, ...(desktop ? ['--preset=desktop'] : [])]
  const reports = []
  for (let i = 0; i < RUNS; i++) reports.push(JSON.parse((await exec('npx', args, { maxBuffer: 512 * 1024 * 1024 })).stdout))
  const score = lhr => lhr.categories.performance.score ?? -1
  return reports.sort((a, b) => score(a) - score(b))[Math.floor(RUNS / 2)]
}

// The full page as Lighthouse rendered it (412px wide on mobile, 1350px on desktop), so the
// agent can look for clipped text, overflow or a broken layout without a browser of its own.
function saveShot(url, form, lhr) {
  const data = lhr.audits['full-page-screenshot']?.details?.screenshot?.data ?? lhr.audits['final-screenshot']?.details?.data
  const match = /^data:image\/(\w+);base64,(.+)$/.exec(data ?? '')
  if (!match) return
  const name = new URL(url).pathname.replace(/^\/|\/$/g, '').replace(/\//g, '-') || 'home'
  mkdirSync(SHOTS, { recursive: true })
  writeFileSync(join(SHOTS, `${name}-${form}.${match[1] === 'jpeg' ? 'jpg' : match[1]}`), Buffer.from(match[2], 'base64'))
}

function report(url, form, lhr, fail) {
  saveShot(url, form, lhr)
  const scores = CATEGORIES.map(c => [c, lhr.categories[c].score])
  const metrics = Object.entries(METRICS).map(([name, id]) => [name, lhr.audits[id]])
  console.log(`${form.padEnd(7)} ${scores.map(([c, s]) => `${c}=${s === null ? '?' : Math.round(s * 100)}`).join(' ')} | ${metrics.map(([n, a]) => `${n}=${a.displayValue ?? '?'}`).join(' ')}  ${url}`)
  const speed = lhr.categories.performance.score
  if (speed !== null && speed >= GREEN && speed < TARGET[form]) warn(`${form} ${url}: speed is ${Math.round(speed * 100)}, the aim is ${Math.round(TARGET[form] * 100)}: see the fix table in prompts/04-verify.md`)
  if (lhr.runtimeError) return fail(`${form} ${url}: Lighthouse error: ${lhr.runtimeError.message}`)
  const low = scores.filter(([, s]) => s === null || s < GREEN)
  if (!low.length) return
  for (const [c, s] of low) under.push(`${form} ${url}: ${c} is ${s === null ? 'unknown' : Math.round(s * 100)}, the aim is ${Math.round(GREEN * 100)}`)
  const failing = CATEGORIES.flatMap(c => lhr.categories[c].auditRefs.map(r => [c, lhr.audits[r.id]])).filter(([c, a]) => a.score !== null && a.score < (c === 'performance' ? GREEN : 1) && a.scoreDisplayMode !== 'informative').map(([, a]) => a)
  for (const audit of new Map(failing.map(a => [a.id, a])).values()) console.log(`    fix: ${audit.id} - ${audit.title}${audit.displayValue ? ` (${audit.displayValue})` : ''}`)
}

function finish(problems, extra = []) {
  const all = [...problems, ...extra]
  for (const note of [...new Set(advice)]) console.log(`advice: ${note}`)
  for (const note of allowed) console.log(`allowed by request: ${note}`)
  for (const note of under) console.log(`under 90: ${note}`)
  if (!all.length && under.length) { console.log(`\nVERIFY PASSED with ${under.length} Lighthouse score(s) under 90: fix them with prompts/04-verify.md first; publish without a fix only when none holds, and name each one in your report.`); process.exit(0) }
  if (!all.length && allowed.length) { console.log(`\nVERIFY PASSED with ${allowed.length} result(s) the site owner asked for: put each one in your report.`); process.exit(0) }
  if (!all.length) { console.log('\nVERIFY PASSED: every check is green.'); process.exit(0) }
  console.log(`\nVERIFY FAILED: ${all.length} problem(s). Do not publish.`)
  for (const problem of all) console.log(`  - ${problem}`)
  process.exit(1)
}

const problems = []
const allowed = []
const advice = []
const under = []
const exceptions = site.exceptions ?? {}
const fail = (message, id) => (exceptions[id] ? allowed.push(`${message} [${id}: ${exceptions[id]}]`) : problems.push(message))
const warn = message => advice.push(message)
for (const id of Object.keys(exceptions)) if (!EXCEPTIONS.includes(id)) fail(`site.config.json: "${id}" cannot be excepted, only: ${EXCEPTIONS.join(', ')}`)
const live = process.argv[2]?.replace(/\/$/, '')
rmSync(SHOTS, { recursive: true, force: true })
let server
let unreplaced = []

if (!live) {
  try {
    execFileSync('npx', ['vite', 'build'], { stdio: 'inherit', env: { ...process.env, SITE_URL: LOCAL } })
  } catch {
    finish(['the build failed: fix the errors printed above'])
  }
  const pages = readdirSync(DIST, { recursive: true }).filter(f => f.endsWith('.html')).sort()
  const seen = new Map()
  for (const page of pages) checkPage(page, readFileSync(join(DIST, page), 'utf-8'), seen, fail)
  checkFiles(pages, fail)
  unreplaced = placeholders(pages)
  if (problems.length) finish(problems, unreplaced)
  server = await serve()
}

try {
  const urls = await checkHttp(live ?? LOCAL, fail)
  for (const url of urls) {
    report(url, 'mobile', await lighthouse(url, false), fail)
    report(url, 'desktop', await lighthouse(url, true), fail)
  }
} catch (error) {
  fail(`could not run the checks: ${String(error.stderr || error.message).trim().slice(-600)}`)
  console.log('Lighthouse needs Node 22.19+, network access for npx, and Chrome or Chromium (set CHROME_PATH if it is not found).')
}
server?.close()
finish(problems, unreplaced)
