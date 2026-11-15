# تعليمات الوكلاء — Landlight

لبناء صفحة هبوط أو تعديلها: افتح [`prompts/00-start-here.md`](prompts/00-start-here.md) ونفّذ ما فيه بالترتيب.

أنت من يصمم الموقع ويكتب كل صفحة مرة واحدة في `src/views/` ونصوصها لكل لغة في `src/locales/`، ومعها `src/components/` و`src/app.css`. كل الصفحات بلا استثناء HTML ثابت (MPA / SSG) بأقل JavaScript ممكن. البنية في مجلد `.agent/`، والمكتبات المعتمدة في [`prompts/libraries.md`](prompts/libraries.md).

**الأدوات تعمل بـBun لا Node.** نسخة التطوير تشغّل صورة الإنتاج (nginx على Alpine 3.24، بلا Node ولا Bun، ولا حزمة `bun` في مستودعات Alpine)، فشغّل أول مرة في النسخة `sh scripts/setup-copy.sh` (يثبّت Bun وNode وChromium ثم `bun install`)، وأعده بعد أي إعادة تشغيل للنسخة لأن قرصها يبدأ من جديد. فحص Lighthouse يحتاج ذاكرة: على الحجم xs قد تنفد ذاكرة النسخة فتُعاد؛ اطلب من المستخدم حجم m أو أكبر للنسخة قبل `bun run verify`.

**القاعدة الوحيدة التي لا استثناء لها:** لا تنشر شيئًا قبل أن ينتهي `bun run verify` بالسطر `VERIFY PASSED`.
