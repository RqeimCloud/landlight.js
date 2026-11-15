// Pages are complete HTML and CSS. JavaScript runs only where a page asks for it, as in Astro.
const idle = run => (window.requestIdleCallback ?? setTimeout)(run)

// The head script sets this before paint; kept here too in case a page ships without it.
document.documentElement.classList.add('js')

// <div data-island="carousel"> runs the default export of src/islands/carousel.js with that
// element, when it nears the screen. data-load="idle" runs it once the page has settled.
const islands = import.meta.glob('./islands/*.js')
const start = async element => (await islands[`./islands/${element.dataset.island}.js`]()).default(element)
const onVisible = new IntersectionObserver((entries, observer) => {
  for (const entry of entries.filter(e => e.isIntersecting)) {
    observer.unobserve(entry.target)
    start(entry.target)
  }
}, { rootMargin: '200px' })
for (const element of document.querySelectorAll('[data-island]')) {
  if (element.dataset.load === 'idle') idle(() => start(element))
  else onVisible.observe(element)
}

// Alpine, from this project's own bundle, only on pages that use it.
if (document.querySelector('[x-data]')) idle(() => import('./alpine.js'))

// WebMCP: only browsers that support it download the tools.
if (document.modelContext ?? navigator.modelContext) import('./webmcp.js')

// A link inside the mobile menu may stay on this page, so the menu closes itself.
addEventListener('click', event => event.target.closest('[popover] a')?.closest('[popover]').hidePopover())

// Light, dark, or the system: a choice is stored, no choice follows the system.
addEventListener('click', event => {
  const toggle = event.target.closest('[data-theme-toggle]')
  if (!toggle) return
  const root = document.documentElement
  const dark = root.classList.contains('dark') || (!root.classList.contains('light') && matchMedia('(prefers-color-scheme: dark)').matches)
  const next = dark ? 'light' : 'dark'
  root.classList.toggle('dark', next === 'dark')
  root.classList.toggle('light', next === 'light')
  try {
    localStorage.setItem('theme', next)
  } catch {
    // A browser that refuses storage keeps the choice for this page view only.
  }
  toggle.setAttribute('aria-pressed', String(next === 'dark'))
})

// Sections below the first screen fade in as they arrive. What the visitor already sees is
// shown at once: an element at opacity 0 breaks the largest-paint rule and fails contrast.
const reveal = () => {
  const items = document.querySelectorAll('.reveal')
  if (!items.length) return
  if (!('IntersectionObserver' in window)) {
    for (const item of items) item.classList.add('is-visible')
    return
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries.filter(e => e.isIntersecting)) {
      entry.target.classList.add('is-visible')
      observer.unobserve(entry.target)
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 })
  for (const item of items) {
    if (item.getBoundingClientRect().top < innerHeight) item.classList.add('is-visible', 'no-anim')
    else observer.observe(item)
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', reveal, { once: true })
else reveal()

if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
