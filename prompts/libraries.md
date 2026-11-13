# المكتبات: ماذا تستخدم ومتى

القاعدة: **المنصة أولًا**، ثم أصغر مكتبة تحل المشكلة، وتُحمَّل كجزيرة في الصفحة التي تحتاجها فقط. لا تثبّت شيئًا لا تستخدمه.

الإصدارات أدناه هي آخر ما تُحقق من وجوده في npm يوم 2026-11-09. ثبّت بـ`npm install <الاسم>` وستحصل على الأحدث.

إن كان Context7 متاحًا لك، فاقرأ منه توثيق المكتبة بإصدارها الحالي قبل أن تستعملها، خاصة Tailwind v4 وAlpine وVite، لأن ما تتذكره قد يكون لإصدار قديم.

البوابة تنصح عند تجاوز 10KB مضغوطة من JavaScript الأولي في الصفحة أو 120KB للموقع كله، لكنها تحكم بدرجة Lighthouse نفسها: 90 هدف لا شرط، و100 غاية. أي مكتبة مقبولة إن بقيت الدرجة خضراء بعد التحسين.

## 1. ما تعطيه المنصة مجانًا

| تريد | استخدم |
|---|---|
| قائمة جوال، قوائم منسدلة | `popover` مع `popovertarget` |
| أسئلة شائعة، أكورديون | `<details>` مع `name` واحد ليفتح عنصر واحد |
| نافذة منبثقة | `<dialog>` |
| سلايدر بسيط | `overflow-x: auto` مع `scroll-snap-type` |
| كشف العناصر عند التمرير | `animation-timeline: view()` |
| حركة دخول | `@starting-style` |
| انتقال بين الصفحات | `@view-transition`، مفعّل |
| تحميل مسبق للصفحات | Speculation Rules، مفعّلة |
| تحريك الارتفاع إلى `auto` | `interpolate-size: allow-keywords` |

كشف بالتمرير بلا JavaScript، ولا يخفي شيئًا في المتصفحات التي لا تدعمه:

```css
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .reveal { animation: reveal linear both; animation-timeline: view(); animation-range: entry 0% entry 35%; }
  }
}
@keyframes reveal { from { opacity: 0; translate: 0 1.5rem; } }
```

لا تضع `.reveal` على أي شيء في الشاشة الأولى.

## 2. الحركة

| المكتبة | متى | ملاحظة |
|---|---|---|
| `motion` 14.10.1 | كشف متسلسل أو حركة لا يكفيها CSS | استورد من `motion/mini` و`inView`، وليس الحزمة كاملة |
| `@formkit/auto-animate` 0.10.2 | قوائم تتغير عناصرها | سطر واحد |
| `gsap` 3.15.1 | خطوط زمنية معقدة أو مشاهد مثبتة بالتمرير | ثقيل، جزيرة فقط، وفي أقسام أسفل الشاشة الأولى |
| `lenis` 1.3.27 | تمرير ناعم، فقط إن طلبه صاحب الموقع | يضر الإحساس الأصلي على الجوال |
| `@lottiefiles/dotlottie-web` 0.82.1 | رسم Lottie جاهز من المصمم | جزيرة، وصورة ثابتة مكانه قبل التحميل |

Three.js وWebGL: جزيرة بعد الشاشة الأولى، ومعها صورة ثابتة للأجهزة الضعيفة ولتقليل الحركة. لا تستخدمه إن كانت صورة تكفي.

**ممنوع داخل الشاشة الأولى:** كل ما سبق. أكبر عنصر يظهر من HTML وCSS وحدهما.

## 3. مكونات الواجهة

**CSS فقط، بلا JavaScript، وهي الأنسب هنا:**

| المكتبة | ما هي |
|---|---|
| `daisyui` 5.7.50 | مكونات Tailwind جاهزة وثيمات، `@plugin "daisyui";` في `app.css` |
| `basecoat-css` 1.1.0 | شكل shadcn/ui بكلاس CSS، بلا React |

**نسخ ولصق HTML مع Tailwind:** HyperUI، وPines UI (مكونات Alpine)، وPenguin UI (Alpine)، وFlowbite (نسخ HTML فقط). لا تضاف كاعتماديات. انسخ ما تحتاج، ثم حوّل `ml-`/`mr-` إلى `ms-`/`me-`، وعدّل الشكل ليطابق نظام تصميمك. أي مكون منسوخ بلا تعديل يعيد الشكل الآلي.

**Web Components، تعمل في HTML عادي:**

| المكتبة | متى | ملاحظة |
|---|---|---|
| `lite-youtube-embed` 0.3.4 | فيديو YouTube | يوفر نحو 500KB حتى يضغط الزائر تشغيل |
| `@github/relative-time-element` 5.3.1 | «قبل ساعتين» بحسب لغة الصفحة | صغير |
| `lit` 3.3.3 | عنصر مخصص تكتبه بنفسك | نحو 5KB، جزيرة |
| `@awesome.me/webawesome` 3.14.0 | مكتبة كاملة، إن احتجت مكونًا معقدًا غير متوفر | استورد المكون الواحد فقط، لا الحزمة، وراجع وزن الجزيرة |

`@shoelace-style/shoelace` 2.20.1 هو الجيل السابق لـWeb Awesome، فلا تبدأ به.

## 4. أدوات متفرقة

| تريد | استخدم | لا تستخدم |
|---|---|---|
| سلايدر متقدم | `embla-carousel` 8.6.0 | Swiper (البوابة ترفضه) |
| تكبير الصور | `medium-zoom` 1.1.2 | مكتبات Lightbox الثقيلة |
| أيقونات | `lucide-static` 1.70.0: انسخ SVG داخل HTML | خط أيقونات، أو Font Awesome كامل |
| Alpine: عند الظهور | `@alpinejs/intersect` 3.17.5 | |
| Alpine: تموضع قوائم | `@alpinejs/anchor` 3.17.5 | |
| خط عربي خفيف | `@fontsource/tajawal` 5.3.0، نحو 9KB للوزن | Google Fonts |
| خط عربي بطابع رسمي | `@fontsource/ibm-plex-sans-arabic` 5.3.0، نحو 43KB للوزن | |
| خط لاتيني | `@fontsource-variable/inter` 5.3.0 | |

إضافات Alpine تُسجَّل في `src/alpine.js`، وهو الملف الوحيد الذي يُسمح بتعديله في هذا الجانب.

## أدوات الصور والقياس

| الأداة | لماذا |
|---|---|
| `sharp` 0.35.5 | تحويل كل الصور إلى WebP بأعلى ضغط (`effort: 6`)، يعمل داخل `npm run assets` |
| `svgo` 4.1.0 | تحسين كل SVG، يعمل داخل `npm run assets` |
| Lighthouse 13.6.0 | البوابة نفسها، داخل `npm run verify` |
| PageSpeed Insights | بعد النشر: يعرض بيانات الزوار الحقيقيين حين يكثرون |
| `unlighthouse` 0.19.1 | اختياري: يفحص الموقع الحي كله دفعة واحدة، `npx unlighthouse --site https://الدومين` |

## ما ترفضه البوابة

`react` و`react-dom` و`preact` و`vue` و`svelte` و`solid-js` و`@angular/core` و`next` و`nuxt` و`jquery` و`bootstrap` و`swiper` و`moment` و`lodash` و`swup` و`@barba/core` و`@hotwired/turbo`، وأي سكربت أو خط من CDN. للتواريخ استخدم `Intl`، وللقوائم وظائف JavaScript الأصلية. إن طلب صاحب الموقع إحداها صراحةً فهي ممكنة باستثناء `framework` أو `cdn` بعد أن يعرف أثرها.
