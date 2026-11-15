# تعليمات الوكلاء — Landlight

لبناء صفحة هبوط أو تعديلها: افتح [`prompts/00-start-here.md`](prompts/00-start-here.md) ونفّذ ما فيه بالترتيب.

أنت من يصمم الموقع ويكتب كل صفحة مرة واحدة في `src/views/` ونصوصها لكل لغة في `src/locales/`، ومعها `src/components/` و`src/app.css`. كل الصفحات بلا استثناء HTML ثابت (MPA / SSG) بأقل JavaScript ممكن. البنية في مجلد `.agent/`، والمكتبات المعتمدة في [`prompts/libraries.md`](prompts/libraries.md).

**الأدوات تعمل بـBun لا Node.** نسخة التطوير تشغّل صورة الإنتاج (nginx على Alpine 3.24، بلا Node ولا Bun، ولا حزمة `bun` في مستودعات Alpine)، فثبّته أول مرة في النسخة بهذا الأمر (الأمر `export` يبقى في جلسة الطرفية): `apk add --no-cache bash curl unzip libgcc libstdc++ && curl -fsSL https://bun.sh/install | bash -s bun-v1.4.0 && export PATH="$HOME/.bun/bin:$PATH"`، ثم `bun install --frozen-lockfile`.

**القاعدة الوحيدة التي لا استثناء لها:** لا تنشر شيئًا قبل أن ينتهي `bun run verify` بالسطر `VERIFY PASSED`.
