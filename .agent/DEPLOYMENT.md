# Deployment

Rqeim Cloud runs every site made from this template. There is no other host, CDN or bucket to set up.

## How a site goes live

1. A push to the default branch starts a build. Nothing else does: no button, no command.
2. Rqeim Cloud builds the repository's own `Dockerfile` in an isolated build machine.
3. The new version replaces the old one only after it answers on port 80. If the build fails, the current site keeps running and the build log says why.

`rqeim.template.json` has `"compose": true`. In Rqeim Cloud this means "run the repository's own files": a `compose.yaml` if there is one, otherwise the root `Dockerfile`. This template has no compose file, so the `Dockerfile` is what runs. Do not add a compose file.

## The Dockerfile

| Stage | What it does |
|---|---|
| `build` | `node` image: `npm ci`, then `npm run build`. Output in `dist/`. |
| serve | `nginx` image with one worker, `nginx.conf`, and `dist/`. Nothing else. |

Both images are pinned by digest. Keep them pinned: change the version and its digest together.

`npm run build` regenerates `src/pages/` from `src/views/` and `src/locales/`, then writes `dist/`. Neither folder is committed.

## Caching (`nginx.conf`)

- Pages, `sw.js` and everything outside `/assets/` are revalidated on every visit, so a deploy reaches visitors at once.
- `/assets/` files are named by content hash and cached for a year.
- `/page.html` and `/page/index.html` redirect to `/page`, so each page has one address.
- A missing page answers a real 404 with `404.html`.

## Images and files

Everything ships from the repository. Put originals in `media/`, run `npm run assets`, and use what it writes to `src/images/` and `src/public/`. Do not link images, fonts or scripts from another host: `npm run verify` fails on it unless the owner asked for the `cdn` exception.

## Environment variables

None. The site is static, and anything in the built files is public. Never put a key or token in the code or in a `VITE_*` variable.

## Working on a live site

In Rqeim Cloud, change a site in a copy of it, not in production:

1. Create a copy. It has its own preview address.
2. Edit, run `npm run verify`, and look at the preview.
3. With the owner's permission, publish the copy. Its commit is pushed to the default branch and deployed as above.

## Domain

The site gets a default address from Rqeim Cloud. A custom domain is added in Rqeim Cloud by the owner; nothing in this repository changes for it. Set `url` in `site.config.json` to the final address, because canonical links, the sitemap and `llms.txt` are built from it.
