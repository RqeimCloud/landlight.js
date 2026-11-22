# Build: runs in Rqeim's build Job, never inside the site's machine.
FROM oven/bun:1.4.0-alpine@sha256:07235578f79ef8c6f97d94aee7938e76f5cdba5f21ae5dbfdd3d3d38058437eb AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Development: a Rqeim Cloud copy in «dev» mode builds this stage only (`--target dev`) and mounts
# its live files over /app, so an edit shows in the copy's address within seconds. Rebuilt only
# when this file or the package files change. A production build never runs it.
FROM deps AS dev
ENV __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=.rqeim.dev
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
CMD ["bun", "run", "dev", "--host", "0.0.0.0", "--port", "80", "--strictPort"]

FROM deps AS build
COPY . .
RUN bun run build

# Serve: all the machine runs is nginx with one worker and the built files.
FROM nginx:1.31.7-alpine@sha256:892bb2152464f0c5d8972593a5f5afaf8054552580b699d95f8ff4af08c2d33d
RUN sed -i 's/^worker_processes .*/worker_processes 1;/' /etc/nginx/nginx.conf \
 && rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/site.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
# Rqeim Cloud swaps a deploy in only once the new site answers here: no downtime.
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
