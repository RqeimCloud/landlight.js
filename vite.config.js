import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import htmlInclude from 'vite-plugin-html-include'
import { inlineStyles, seo, writeAgentFiles } from './scripts/site-plugin.mjs'
import { readdirSync, readFileSync, writeFileSync, rmSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, relative, dirname } from 'node:path'

const walk = (dir, base = dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    const p = resolve(dir, d.name)
    return d.isDirectory() ? walk(p, base) : [relative(base, p)]
  })

const pages = walk(resolve('src/pages')).filter(f => f.endsWith('.html'))
const input = Object.fromEntries(pages.map(f => [f.replace(/\.html$/, ''), resolve('src/pages', f)]))

const rewriter = () => ({
  name: 'rewriter',
  enforce: 'pre',
  configureServer(s) {
    s.middlewares.use((r, _, n) => {
      const u = r.url
      if (!u) return n()
      const [path, qs] = u.split('?')
      const q = qs ? '?' + qs : ''
      if (path === '/' || path === '/index.html') r.url = '/pages/index.html' + q
      else if (path.endsWith('.html') && !path.startsWith('/pages/')) r.url = '/pages' + path + q
      else if (!path.includes('.') && !path.startsWith('/pages/') && !path.startsWith('/@')) r.url = '/pages' + path + '.html' + q
      n()
    })
  },
})

const flattener = () => ({
  name: 'flattener',
  apply: 'build',
  closeBundle() {
    const src = resolve('dist/pages')
    if (!existsSync(src)) return
    walk(src).forEach(f => {
      const abs = resolve(src, f)
      const dest = resolve('dist', f)
      mkdirSync(dirname(dest), { recursive: true })
      writeFileSync(dest, readFileSync(abs, 'utf-8'))
      rmSync(abs)
    })
    rmSync(src, { recursive: true })
    inlineStyles()
    writeAgentFiles()
  },
})

export default defineConfig({
  base: '/',
  root: 'src',
  appType: 'mpa',
  plugins: [tailwindcss(), htmlInclude({ root: process.cwd() }), rewriter(), flattener(), seo(pages)],
  build: { outDir: '../dist', emptyOutDir: true, assetsInlineLimit: 0, modulePreload: false, rollupOptions: { input } },
})
