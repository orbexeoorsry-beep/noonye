# مرشح نون للمدارس — محلي فقط

هذا الملف سجل المرشح الأساس `ef2f3206bd39a14c7a9e91d1fb5eac699f01298e` ونتائجه السابقة؛ المسارات والأرقام التاريخية أدناه لا تُعد نتائج جديدة. المتابعة الحالية وفصل ما أُغلق محليًا عما بقي برمجيًا أو معتمدًا على المزود موثقان في `REVIEW-FOLLOWUP.md`، وسجل التسليم الجديد يثبت commit/tree والاختبارات الفعلية.

هذا مرشح مراجعة وليس إذن نشر أو شهادة جاهزية إنتاج. لم يُنشأ staging ولم يُجر أي تشغيل أو restart أو قياس جديد على Hostinger ضمن هذا العمل المحلي. تحديث المالك الأخير عن 120/120 عملية سبب إضافي لإبقاء الاستضافة متوقفة؛ لم يصل رد دعم يثبت حل ذلك. لم تُقرأ ملفات env أو قيم أسرار ولم تُنشأ مفاتيح، ولم تستخدم بيانات طلاب أو PDFs حقيقية/مستخدمة. سمح توضيح المالك الأخير بملفات fixture PDF المولدة اصطناعيًا داخل runner؛ الرموز العشوائية المؤقتة في اختبارات الجلسات ليست مفاتيح نشر.

## هوية المرشح

- الأساس المقبول commit: `31cbf1a57808a1a28b5e4f34771e322dfa78a916`.
- شجرة الأساس: `14bf041801c61b5d6aa41ee9851d5a2e04d104bc`.
- الفرع الجديد: `rc/schools-local-hardening-20261023`.
- worktree: `/workspace/noonye-schools-rc-20261023`.
- بيئة التنفيذ المحلية: Node `v24.19.0` وnpm `11.17.0`.
- `engines.node` باقٍ `^22.13.0 || >=24.0.0`؛ لم يُختبر التنفيذ فعليًا على Node22.13 في هذه المهمة. الحد الأدنى مواءمة API واعتماديات، لا دليل تشغيل على إصدار لم يُشغّل.
- `package-lock.json` لم يُغيّر. SHA-256: `e0a85ee9d45810bc368cd8191df991a05b28b70f61adaf7d4cf432a1c117fb50`.
- الاعتماديات المثبتة بالقفل: Express4.22.3، Vite8.3.5، pdfjs-dist6.4.299، tsx4.23.15، esbuild0.25.12، TypeScript7.0.2. فُحصت engines: Vite يتطلب22.12+ على خط22 وpdfjs22.13+؛ لم تُرفع إصدارات أو تُشغّل npm audit شبكة.

ملف نتائج التسليم خارج المستودع يثبت commit/tree النهائية وhash الحزمة وdiff ونتائج الاختبارات حتى لا توضع هوية commit داخل نفسه.

## أقل تغييرات عملية

1. حراسة SQLite ترفض المجلدات `hbuilds/public_html/webroot/releases` في أي مكوّن، containment داخل app، traversal، symlink بما فيه dangling، hardlink للقاعدة أو sidecars.
2. اختيار production يتطلب جذرًا قائمًا canonical، مملوكًا لمستخدم التشغيل، وضع0700؛ القاعدة `.sqlite` ابن مباشر، والملفات القائمة0600 وغير مرتبطة. القيم الغائبة/غير المطابقة توقف البدء قبل listen.
3. وضع production خلف proxy صريح loopback فقط. حسابات المدارس تظل مغلقة افتراضيًا، وواجهة الاستماع عند تفعيلها127.0.0.1، لا0.0.0.0. أزيل تحميل dotenv التلقائي؛ إعداد التشغيل يحقنه المشغّل بدل قراءة ملفات أسرار.
4. cookie إنتاج باسم `__Host-noon_session` مع `Secure; HttpOnly; SameSite=Strict; Path=/` ودون Domain؛ local cookie القديم يبقى محليًا. دوران token عند login، إبطال السابق، انتهاء8ساعات، وlogout يبطل صف الجلسة. token مخزّن hash لا plaintext.
5. فحص raw Host وOrigin كامل مطابق؛ الكتابات تتطلب Origin؛ mutations تتطلب token CSRF مربوطًا بالجلسة ومقارنة ثابتة الزمن. cross-site Fetch Metadata مرفوض. لا CORS عام.
6. production يقبل socket peer127.0.0.1 فقط و`X-Forwarded-Proto: https` مفردًا، ويتحقق `req.secure` وX-Forwarded-Host إن وُجد. لا trust proxy=true أو عدد hops عمياء. login throttle محدود30محاولة/15دقيقة وخريطة1024 عنوان كحد أقصى؛ هو داخل الذاكرة وعملية واحدة، ليس نظام منع إساءة موزعًا.
7. snapshot تشغيلية محلية فقط، ليست API HTTP؛ `VACUUM main INTO ?` مع bind، وجهة جديدة exclusive0600، منع overwrite والsidecars السابقة، فحوص integrity/foreign_key، fsync للملف والمجلد، وإرجاع SHA-256 والحجم. لا checkpoint ولا تغيير journal mode في مصدر البيانات.

## تهيئة proxy/storage المستقبلية — ليست إعدادات منشورة

هذه أسماء إعدادات فقط، لم تُقرأ قيمها من Hostinger ولم تُكتب فيه:

- `NOON_ACCOUNTS_MODE=proxy-production`، ولا يجتمع مع `NOON_ACCOUNTS_LOCAL=1`.
- `NOON_ACCOUNTS_ORIGIN`: أصل HTTPS canonical بلا slash نهائي أو credentials.
- `NOON_ACCOUNTS_PROXY_IP=127.0.0.1`: يحتاج إثبات أن proxy الحقيقي بنفس host/network ويستبدل X-Forwarded-For/Host/Proto ولا يمرر قيم العميل. لا توسيع allowlist بلا مراجعة.
- `NOON_ACCOUNTS_STORAGE_ROOT`: دليل خاص قائم خارج البناء والwebroot، مثل `/home/u478136185/domains/<STAGING_HOST>/shared/sqlite`، وضع0700.
- `NOON_ACCOUNTS_DB`: مسار مطلق لابن مباشر مثل `<STORAGE_ROOT>/schools.sqlite`، وضع0600 عند إنشائه.

هذه مسارات مقترحة غير منشأة وغير مثبتة على Hostinger. `PORT` داخلي يختاره المشغّل. loopback لا يعزل مستخدمًا آخر على الحساب/الجهاز نفسه؛ يلزم فصل Unix UID/namespace أو ACL/firewall مثبتة إذا كانت الاستضافة المشتركة تتيح وصول التطبيقات لبعضها. لن نعتبر مجرد forwarded header إثبات TLS من عميل مباشر. تشغيل accounts دون proxy في production مرفوض. static front proxy عليه حظر DB/sidecars و.env وأي mapping لـshared؛ حارس Node لا يحمي server يتجاوز Node ويخدم الملف مباشرة.

[Express behind proxies](https://expressjs.com/en/guide/behind-proxies.html) يشترط مطابقة trust للطوبولوجيا الحقيقية واستبدال headers؛ وفُحص أيضًا التنفيذ المثبت `node_modules/express/lib/request.js` لأن `req.protocol` يقبل أول قيمة من قائمة، لذا المرشح يرفض القائمة كاملة.

## تصميم migration — لم تُنفذ هجرة حقيقية

لا تغيير في تعريف schema أو إصدارها. في متابعة RC، لا يقبل `AccountStore` إلا قاعدة فارغة ذات user_version=0 لتهيئتها داخل transaction، أو إصدار1 يحوي الأعمدة الأساسية المعروفة؛ يرفض قاعدة0 غير الفارغة، والإصدار السالب أو الأعلى، وشكل1 غير المتوافق قبل إنشاء جداول أو تغيير الإصدار. هذا حارس توافق أساسي وليس إثباتًا لكل constraint أو migration من قاعدة قديمة. `ClassroomStore` ما زال ينشئ جداول الفصول idempotently، ولا توجد أداة هجرة عامة كاملة أو ضمان rollback للترقيات القادمة.

قبل أي نقل حقيقي:

1. أثبت تحديدًا مسار المصدر والوجهة وصلاحياتهما دون طباعة credentials، ووقف الكاتب الخاص بالتطبيق وحده بطريقة موثقة. لا زر Stop للخطة.
2. أنشئ snapshot متسقة immutable باسم جديد، وسجل user_version وعدد الجداول/الصفوف المتوقع وintegrity_check وforeign_key_check والhash في سجل خاص دون بيانات صفوف أو أسرار.
3. استعد إلى clone جديد، وشغّل schema/code المرشح عليه فقط. أي migration لاحقة تكون SQL versioned داخل BEGIN IMMEDIATE/COMMIT مع rollback للخطأ وفحص قبل فتح traffic؛ لا DDL متفرق غير متعقب كترقية جديدة.
4. اختبر التوافق مع الكود القديم والجديد، ولا تُبدّل DB live أو تعيد تسمية ملف مفتوح. لا تنقل sessions من loopback إلى production cookie؛ الاسم الجديد يتطلب login جديدًا.
5. عند restore إنتاج حقيقي لاحقًا، احذف sessions في clone بعد النسخ وقبل اعتماده لتجنب إحياء tokens أُبطلت بعد زمن النسخة؛ لا تفعل ذلك في الأصل. المرشح لا يطبّق هذه العملية تلقائيًا.
6. rollback الكود يعيد artifact السابق المحدد وhashه، ويفضل إبقاء DB إن كان schema متوافقًا. رجوع DB منفصل يحتاج موافقة لأنه يفقد الكتابات بعد النسخة، ولا يُكتب فوق الأصل: clone جديد، إيقاف الكاتب المحدد، تحقق ثم تبديل مسار معتمد.

## backup مع WAL والكتّاب

لا `cp database.sqlite` أثناء الكتابة، ولا نسخ DB/WAL/SHM في أزمنة مختلفة. SQLite VACUUM INTO تعطي snapshot منطقية متسقة تشمل committed WAL ولا تشمل transaction غير committed في writer آخر. تبقى وجهة مستقلة، والبرنامج لا يغير المصدر أو journal mode. الاختبار يثبت حالة WAL صناعية صغيرة مع writer مفتوح، وليس benchmark أو إثبات توفر تحت ضغط.

الدالة sync وقد تحجز event loop أو تفشل بسبب transaction/lock؛ لا تضعها في مسار طلب HTTP ولا تبدأ retry loop. قبل بيانات كبيرة تحدد نافذة صيانة ومساحة وtimeout وتستخدم العملية المخصصة فقط. انقطاع الكهرباء قد يترك output غير كامل؛ لا تعتمد نسخة إلا بعد نجاح integrity/fk/fsync/hash. تنظيف الفشل يحذف فقط inode الوجهة الذي أنشأته الدالة، ولا يحذف sidecars سابقة. كل نسخ snapshot تحتوي hashes كلمات مرور وجلسات لذلك تعامل كبيانات حساسة0700/0600، مع retention ونسخة خارج failure-domain وخطة تشفير معتمدة لاحقًا؛ لا إنشاء مفاتيح بهذه المهمة.

- [Node SQLite](https://nodejs.org/docs/latest-v22.x/api/sqlite.html): prepare/run/exec متاحة منذ22.5؛ `sqlite.backup` أضيف22.16، لذلك لم يُستخدم كي لا نكسر الحد22.13.
- [SQLite VACUUM INTO](https://www.sqlite.org/lang_vacuum.html): snapshot متسقة، المصدر لا يتغير، والوجهة يجب أن تكون غير موجودة أو فارغة؛ انقطاع التنفيذ قد يفسد output.

## الأوامر والفحوص

نفذت من worktree الجديد وبـ `env -i PATH="$PATH" HOME=/home/ubuntu` لعزل قيم بيئة المهمة؛ لا تحميل .env. لم يُفتح ملف `.env.example`؛ الموجود في الجذر اسمًا فقط، ولا .env فعلي.

```sh
npm ci --offline --ignore-scripts --no-audit --no-fund
npm run lint
node_modules/.bin/tsx --test --test-concurrency=1 tests/accounts-config.test.ts tests/persistent-storage.test.ts tests/production-security.test.ts tests/sqlite-snapshot.test.ts
npm run test:schools:rc
npm test
```

أول جولة قبل الثبات فشلت بسبب import `uid` غير موجود وتصريح TypeScript، وصُححت إلى getuid مع guard وفُحصت الأنواع. الجولة المستهدفة النهائية11/11. قام مطور snapshot الفرعي بفحصه مرة2/2 قبل جولة المنسق؛ لا ندعي أن كامل المهمة تضمنت تشغيل اختبار وحيد. جولة المدارس الشاملة مصممة مرة واحدة، build واحد واختبارات تسلسلية. نتائجها الدقيقة في سجل التسليم.

النتيجة النهائية للأمر `npm run test:schools:rc`: exit0، فحص الأنواع والبناء ناجحان،35/35 اختبار node، واختبارا browser2/2؛ dashboard validation ناجح، وassistant-off ناجح بلا outbound attempts وبلا استدعاء parser؛ وفحوص واجهة المساعد بالعربية والإنجليزية ناجحة. التنبيهات غير المانعة: chunkواجهة أكبر500kB، وتنبيه pdfjs legacy عند import Node؛ لم يُستخدم PDF فعلي. بُني cache shell `noon-shell-772e8fe1f0d08ed1` مع8assets. هذا ليس اختبار موارد استضافة.

الحزمة المبنية للتسليم مادة مراجعة محلية تضم `server.js` و`dist` وmanifest/lock الأصليين والتوثيق، بلا node_modules أو env أو DB. أمر تشغيل bundle مستقبلًا هو `node server.js` بعد تثبيت الاعتماديات المقفلة في بيئة منفصلة؛ `npm start` الحالي خاص بالشجرة المصدرية لأنه يشغّل `tsx server.ts`، فلا تستخدمه مع الحزمة المبنية وحدها. لا تعتبر الحزمة ملف نشر جاهزًا لـHostinger قبل إثبات start/build command وعزل proxy/storage وطريقة stop/restart. حزمة المصدر المنفصلة تحفظ الشجرة الملتزمة للمراجعة، مع استبعاد `.env.example` دون قراءته.

**توضيح نطاق الفحوص:** استُثني اختبارا PDF/PWA أولًا من حزمة المدارس بسبب صياغة القيد السابق، ثم أوضح المالك السماح بالfixtures الاصطناعية وطلب `npm test` الرسمي كاملًا مرة واحدة. لذلك شُرع بجولة رسمية واحدة إضافية متسلسلة بعد استقرار الكود والمراجعة المستقلة؛ نتيجتها النهائية في سجل التسليم. مجموعة `test:accounts` صارت تضبط `--test-concurrency=1` صراحة؛ سلسلة npm test تنفذ باقي المجموعات بـ`&&` دون runners متوازية. الـnpm test الرسمي يعيد البناء ضمن بعض مجموعاته بحسب scripts القائمة، ولم يُعد يدويًا. اختبارات الحراسة الجديدة سبق تنفيذها في الجولة المستهدفة وحزمة المدارس؛ npm test القديم وحده لا يشملها.

**نتيجة الجولة الرسمية الواحدة:** `npm test` exit0؛ accounts16/16، path-http6/6، accounts-browser1/1، role-dashboards-browser1/1، PDF-viewer89/89، quiz-copy4/4 وai-ui-copy3/3؛ dashboard-validation وassistant-off وassistant-browser ناجحة. PWA ناجح بالعربية/الإنجليزية، manifest/installability، وcache للـstatic فقط بلا PDF/API/طلاب، وفتح fixture IndexedDB offline؛ اختبارات فشل إصدار جديد/asset غير مطابق أبقت cache القديم، والتحديث انتظر تنشيطًا طبيعيًا، وrollback إلىA أعاد shell قابلًا للعمل. هذا rollback للـPWA المحلي فقط، لا rollback عملية أو DB على Hostinger. لا تُفسّر تسميات Gemini القديمة في log كاستعمال API؛ فحوص المساعد تؤكد تعطيله وصفر outbound attempts.

المراجعة المستقلة read-only محفوظة خارج الشجرة في سجل التسليم: لا blocker للتقييم المحلي الاصطناعي، لكن مانع نشر عالٍ متعلق بثقة proxy غير المثبتة، وحدود TOCTOU ومخطط migrations والتشغيل الفعلي. لم يشغّل المراجع اختبارات موازية ولم يدخل أي استضافة. أُضيف فقط ضبط تسلسل test:accounts بعد مراجعته؛ لا تغيير في كود التشغيل بعدها.

إثبات المصدر: `tests/pwa-browser.test.mjs:73-78` يبني نص PDF صغيرًا بعلامة `SYNTHETIC PWA PDF ONLY` ويستعمل `setInputFiles({name:'Synthetic-PWA-Only.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf)})`، بلا path لملف مستخدم. `tests/pdf-viewer.test.ts:34-45,115-118` يستعمل `generateEducationalSamplePdf()` المولّدة محليًا إلى Uint8Array/ArrayBuffer وBlob، من دالة `src/services/samplePdfGenerator.ts` التي تولّد النص والرسوم والbytes بلا قراءة PDF من القرص. لا بيانات طلاب. اختبار IndexedDB في PWA يستخدم profile اصطناعيًا مؤقتًا ولا يتصل بأي host إنتاجي. HTTP الأمن اختبر loopback proxy اصطناعيًا، لا TLS خارجي فعلي ولا Hostinger.

## ما لم يُحسم قبل النشر

- رد الدعم عن هامش الموارد ووسيلة restart/stop **لتطبيق واحد فقط**؛ لم يصل.
- تأكيد المجانية في شاشة مراجعة الإنشاء قبل أي إنشاء، مع طوبولوجيا proxy وnetwork isolation ومسار دائم تغطيه backup فعليًا.
- إثبات restart واحد على staging بقاعدة صناعية ثم restore clone واختبار HTTP DB/sidecars عند الـfront server أيضًا؛ لم يُنفذ على الاستضافة.
- نموذج تهديد المستخدم نفسه: فحوص filesystem تقلل الأخطاء والروابط لكنها لا تمنع TOCTOU من مهاجم بنفس UID يستطيع تبديل directories، ولا تشفير at rest.
- جلسة8ساعات absolute بلا idle timeout/re-auth إداري، ولا MFA؛ rate limiting داخل الذاكرة. متابعة RC تمنع unsafe-inline في script-src لصفحة `/accounts` في production فقط؛ style-src ما زال يسمح به، وVite dev يحتفظ باستثناء scripts. هذه ديون محلية وليست شروط مزود، ولا ادعاء إصلاح شامل.
- DDL التهيئة القائم ليس نظام migrations إنتاجي متكامل؛ لا schema downgrade آلي.
- فحص Node22.13 التشغيلي، وفحص dependency advisories الفعلي وتفسير تنبيه Hostinger الأمني السابق؛ لا يمكن مساواة نجاح tsc باجتياز security audit.
- لا push/merge/deploy، ولا تغيير ملفات/فروع worktrees الأصلية. جميع المسارات الحقيقية المذكورة للتنفيذ هي Sandbox محلي.
