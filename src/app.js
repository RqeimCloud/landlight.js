// Pages are complete HTML and CSS. JavaScript runs only where a page asks for it, as in Astro.
const idle = run => (window.requestIdleCallback ?? setTimeout)(run)

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

if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
