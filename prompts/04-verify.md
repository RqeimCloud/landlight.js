# 4. البوابة: كل شيء أخضر قبل النشر

## التجهيز

يلزم Node 22.19 فأعلى، وشبكة، وChrome أو Chromium:

```bash
node -v
which chromium chromium-browser google-chrome || (apk add --no-cache chromium || (apt-get update && apt-get install -y chromium))
npm ci
```

إن لم يُعثر على المتصفح فاضبط مساره: `export CHROME_PATH=/usr/bin/chromium`.

## التشغيل

```bash
npm run verify
```

يبني الموقع، ويفحص كل ملف، ثم يشغّل Lighthouse ثلاث مرات لكل صفحة على الجوال وثلاثًا على المكتب ويأخذ الوسيط. يستغرق نحو دقيقة ونصف لكل صفحة، فانتظره ولا تقطعه.

## معنى الأخضر

| المقياس | الشرط |
|---|---|
| Performance | أخضر (90 فأعلى) لكل صفحة ولغة على الجوال والمكتب. **الهدف 100** (99 على الجوال) |
| Accessibility وBest Practices وSEO | 100 |
| LCP | أخضر (جوال: حتى 2.5 ثانية) |
| CLS | أخضر (حتى 0.1) |
| TBT | أخضر (جوال: حتى 200ms) |
| FCP | أخضر (جوال: حتى 1.8 ثانية) |
| Speed Index | أخضر (جوال: حتى 3.4 ثانية) |
| الفحص الثابت | عنوان ووصف وروابط وصور وأيقونات وكل صفحة بكل لغة وعناصر الوصول و`robots` و`sitemap` و`llms.txt` و`site.webmanifest` و`sw.js` و404 حقيقية |
| الصور | WebP أو SVG فقط، ما عدا الأيقونات وصورة المشاركة |
| المصدر | لا CDN، ولا إطار SPA |

**الأخضر شرط النشر، و100 هو الهدف.** أسطر `advice:` لا تُفشل البوابة، لكنها عملك التالي: سرعة دون 100، أو JavaScript أولي فوق 10KB، أو مجموع فوق 120KB، أو صفحة فوق 14KB مضغوطة. حسّن حسب جدول الإصلاح حتى تختفي، أو حتى يكون الباقي ثمنًا لميزة طلبها صاحب الموقع، فتذكرها في التقرير مع الدرجة.

**انظر إلى ما رآه Lighthouse.** بعد كل تشغيل يحفظ الأمر صورة كاملة لكل صفحة في `.verify/`، باسم مثل `contact-mobile.jpg`: الجوال بعرض 412px والمكتب بعرض 1350px. افتحها كلها وابحث عن نص مقصوص، أو عنصر يخرج من الشاشة، أو قسم مكسور. المجلد يُمسح مع كل تشغيل، ولا يُرفع إلى الريبو ولا يُنشر.

أسطر `allowed by request:` استثناءات طلبها صاحب الموقع (انظر `00-start-here.md`)، وتُذكر كلها في التقرير.

## حلقة الإصلاح

1. اقرأ قائمة `VERIFY FAILED` وأسطر `fix:` كاملة.
2. أصلح **كل** ما فيها حسب الجدول أدناه.
3. أعد `npm run verify` من البداية، ولا تكتفِ بإعادة الجزء الذي فشل.
4. كرر حتى ترى `VERIFY PASSED`. بعد 5 محاولات دون تقدم توقف وأرسل آخر ناتج لصاحب الطلب.

| ما تراه | الإصلاح |
|---|---|
| `largest-contentful-paint` أو `lcp-discovery-insight` | أكبر عنصر بلا حركة دخول ولا `opacity: 0` ولا `loading="lazy"`، والصورة `<img>` بـ`fetchpriority="high"` لا خلفية CSS |
| `render-blocking-insight` | CSS مدمج تلقائيًا إن كان أقل من 50KB: احذف ما لا يلزم من `app.css` والخطوط |
| `cumulative-layout-shift` أو `cls-culprits-insight` | `width` و`height` لكل صورة، و`aspect-ratio` للوسائط، ومساحة محجوزة لكل ما يظهر لاحقًا، ولا تضف عناصر فوق المحتوى بعد التحميل |
| `total-blocking-time` أو `bootup-time` | انقل الكود إلى جزيرة، أو استبدله بما تعطيه المنصة |
| `font-display-insight` | `font-display: swap` لكل `@font-face` |
| `third-parties-insight` | حمّل الطرف الثالث عند الطلب فقط |
| `image-delivery-insight` أو `image-size-responsive` | ضع أصلًا بعرض 1600px في `media/` وأعد `npm run assets`، واضبط `sizes` على عرض الصورة الفعلي |
| `dom-size-insight` | بسّط البنية وأزل الأغلفة الزائدة |
| `remove ...` | استبدل المكتبة حسب `libraries.md`، أو سجّل استثناء `framework` إن طلبها صاحب الموقع |
| `every image is webp` أو `must be webp` | ضع الأصل في `media/` وشغّل `npm run assets` واستخدم الوسم المطبوع |
| `never loaded from a CDN` أو `fonts are served` | ثبّت من npm أو انسخ الخط إلى `src/public/fonts/` |
| `no island file` | أنشئ الملف بالاسم نفسه في `src/islands/` |
| `color-contrast` | غيّر اللون في `@theme` حتى 4.5:1، ولا تخفف الفحص |
| `heading-order` | لا تقفز من `h2` إلى `h4` |
| `target-size` | 44px ومسافة بين عناصر اللمس |
| `link-in-text-block` | خط سفلي للروابط وسط النص |
| `errors-in-console` | افتح الصفحة وأصلح الخطأ؛ غالبًا مسار ملف أو جزيرة |
| `image-alt` | أكمل `alt` |
| `link-text` | اكتب نص رابط يصف وجهته، لا «اضغط هنا» |
| `skip link` أو `<main id="main">` | أضف رابط التخطي في الهيدر وأعط `<main>` هذا المعرّف |
| `is not in src/locales/...` أو `is missing:` | أضف المفتاح الناقص إلى ملف تلك اللغة بصياغتها |
| `has the same text as` | نص مكتوب مباشرة في `src/views/`: حوّله إلى `{{t:مفتاح}}` واكتب نصه لكل لغة |
| `Pages are written in src/views/` أو `not per language folder` | الصفحات في `src/views/` مرة واحدة، لا في `src/pages/` ولا في مجلد لغة |
| `is not written in` | اكتب نصوص الصفحة بلغة ملفها |
| `almost no text in the HTML` | اكتب المحتوى في HTML نفسه |
| `image over 250KB` أو مقاس أيقونة | أعد `npm run assets` |
| `template content not replaced` | صمّم الصفحة واحذف `data-placeholder` |
| `is still` | أكمل `site.config.json` |

## اكتمال هذه الخطوة

آخر سطر في الناتج هو `VERIFY PASSED: every check is green.` واحتفظ بجدول الدرجات للتقرير.

**لا تنشر من مجلد `dist` الناتج عن الفحص**؛ روابطه تشير إلى `localhost`. النشر يبني من جديد بالدومين الحقيقي.
