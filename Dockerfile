# Build: runs in Rqeim's build Job, never inside the site's machine.
FROM node:24.22.1-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Serve: all the machine runs is nginx with one worker and the built files.
FROM nginx:1.31.7-alpine@sha256:892bb2152464f0c5d8972593a5f5afaf8054552580b699d95f8ff4af08c2d33d
RUN sed -i 's/^worker_processes .*/worker_processes 1;/' /etc/nginx/nginx.conf \
 && rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/site.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
