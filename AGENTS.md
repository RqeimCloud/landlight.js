# تعليمات الوكلاء — Landlight

لبناء صفحة هبوط أو تعديلها: افتح [`prompts/00-start-here.md`](prompts/00-start-here.md) ونفّذ ما فيه بالترتيب.

أنت من يصمم الموقع ويكتب صفحاته في `src/pages/` و`src/components/` و`src/app.css`. كل الصفحات بلا استثناء HTML ثابت (MPA / SSG) بأقل JavaScript ممكن. البنية في مجلد `.agent/`، والمكتبات المعتمدة في [`prompts/libraries.md`](prompts/libraries.md).

**القاعدة الوحيدة التي لا استثناء لها:** لا تنشر شيئًا قبل أن ينتهي `npm run verify` بالسطر `VERIFY PASSED`.
