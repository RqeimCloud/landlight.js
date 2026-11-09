// npm run indexnow: tell search engines that use IndexNow what changed. Run after publishing.
import { indexNowKey, site } from './site-plugin.mjs'

const sitemap = await (await fetch(`${site.url}/sitemap.xml`)).text()
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(site.url).host, key: indexNowKey, keyLocation: `${site.url}/${indexNowKey}.txt`, urlList }),
})
console.log(`IndexNow answered ${response.status} for ${urlList.length} URLs`)
if (!response.ok) process.exit(1)
