#!/bin/sh
# sh scripts/setup-copy.sh: the tools a Rqeim development copy needs to build and verify this
# site: Bun, Node (Lighthouse runs on it), Chromium and curl. The copy runs the production
# image (nginx, no tools), and its disk starts over when the machine restarts: run this again
# then. Safe to run any number of times.
set -e
if command -v apk >/dev/null 2>&1; then
  apk add --no-cache bash curl unzip libgcc libstdc++ nodejs chromium >/dev/null
elif command -v apt-get >/dev/null 2>&1; then
  apt-get update -qq && apt-get install -y -qq curl unzip nodejs chromium >/dev/null
fi
if [ ! -x "$HOME/.bun/bin/bun" ]; then
  curl -fsSL https://bun.sh/install | bash -s bun-v1.4.0 >/dev/null
fi
# On PATH for every shell, not only this one.
ln -sf "$HOME/.bun/bin/bun" /usr/local/bin/bun
ln -sf "$HOME/.bun/bin/bun" /usr/local/bin/bunx
bun install --frozen-lockfile
echo "READY: bun $(bun -v), node $(node -v), $(command -v chromium || command -v chromium-browser)"
