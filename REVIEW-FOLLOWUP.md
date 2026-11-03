# متابعة مراجعة نون: ما يمكن إغلاقه محليًا وما لا يمكن

هذه متابعة للمرشح `ef2f3206bd39a14c7a9e91d1fb5eac699f01298e`، شجرته `c3644acb960eb5521a48df5034f79428a75e3966`، في فرع جديد `rc/schools-local-followup-20261023` وworktree `/workspace/noonye-schools-followup-20261023`. لم تتغير أو تُحذف أي worktrees أو branches سابقة. لا Hostinger أو staging أو SSH أو production أو DNS أو Auto Deploy، ولا push أو merge أو deploy. لم تصل معلومة دعم جديدة.

## الإصلاحات المحدودة

### حماية أسلاف مجلد SQLite: إغلاق جزئي محلي

وضع0700 للدليل لا يكفي إذا أمكن لمستخدم آخر استبداله من المجلد الأب. حارس production يفحص الآن كل الأسلاف: المالك هو UID التشغيل أو root، والمجلد غير قابل لكتابة group/others إلا إذا كان sticky. يسمح ذلك بـ/tmp المعتاد مع رفض أب0777 أو0770 غير sticky، مع استمرار رفض symlink وtraversal وhardlinks وصلاحيات الملفات غير المناسبة.

الاختبار يستخدم parent اصطناعيًا يبدّل mode فقط، لا سباقًا ولا مستخدمًا آخر أو host حقيقيًا. **لا يحل هذا TOCTOU من نفس UID**، ولا ACL إضافية أو file capabilities أو root أو NFS semantics أو mount replacement؛ الدليل الخاص تحت أسلاف محمية شرط تخفيض خطر، لا عزلًا لتطبيقات تتشارك المستخدم نفسه. SQLite وHTTP static ما زالا يفتحان بالمسار، وليس openat ذريًا إلى handle ثابت. لا محاولة لاستعمال /proc/self/fd مع SQLite؛ ذلك قد يغيّر موضع sidecars ويكسر locking، فلا يُبتكر حل غير مثبت.

### قاعدة مجهولة لا تتحول تلقائيًا إلى schema1

كان فتح قاعدة user_version=0 غير فارغة قد يضيف جداول الحسابات ويضع الإصدار1 دون migration معلومة. صار السلوك:

- قاعدة0 فارغة فقط: تهيئة الجداول والإصدار داخل BEGIN IMMEDIATE/COMMIT واحد، وrollback/إغلاق عند الخطأ.
- قاعدة0 غير فارغة: رفض `unversioned_schema_requires_migration` دون تغيير schema/data/user_version.
- إصدار1: فحص قابلية قراءة الأعمدة الأساسية في schools/users/sessions، دون إعادة إنشاء الجداول أو كتابة user_version مجددًا.
- إصدار1 ناقص الشكل: رفض `unsupported_schema_shape`؛ إصدار سالب أو أكبر من1: رفض `unsupported_schema_version`.

اختبارات اصطناعية تقارن SHA-256 للملف قبل الرفض وبعده، وتفحص عدم ظهور جداول جديدة وبقاء البيانات والإصدار؛ كما تفحص إعادة فتح schema1 سليمة. يظل فتح AccountStore القائم يضبط mode0600؛ لا ندعي بقاء metadata للملف دون تغيير. فحص الأعمدة **ليس** fingerprint كاملًا للقيود أو triggers أو semantics، وليس migration من قاعدة قديمة. لا نعرف شكل قاعدة legacy المقصودة ولا ننشئ mapping أو downgrade تخمينيًا. يلزم تعريف schema قديمة وfixture اصطناعي مشتق من تعريفها، ثم migration versioned واختبار رفض/rollback/توافق مستقل.

fixture حراسة HTTP كان يحتوي جدول evidence غير معرّف الإصدار؛ صار يبدأ بمخطط AccountStore المعروف ثم يضيف marker اصطناعيًا. لم تُضعف assertions الحجب أو تُستثنَ الطلبات الأمنية.

### CSP لصفحة الحسابات في production

`script-src` صار `'self'` فقط لطلبات HTML إلى `/accounts` و`/accounts/` في production؛ لا unsafe-inline ولا unsafe-eval. سياسة dev فقط تبقي unsafe-inline بسبب preamble من Vite. style-src ما زال يسمح unsafe-inline لأساليب React/Motion؛ لم تُخترع nonce ثابتة ولا تُغيّر dynamic styles.

اختبار السياسة يفحص الترويسات، واختبار الحسابات القائم في Chromium يثبت تحميل bundle والواجهة من self، ثم يضيف script inline اصطناعيًا ويتحقق من عدم تنفيذه. **هذا لا يطبق CSP على كل shell أو SPA navigation من `/`**، فلا نعلن إغلاق CSP للتطبيق كاملًا. إغلاق styles أو توحيد السياسة لكل المسارات يحتاج مراجعة UI أوسع؛ ليس provider-dependent، ولم يُنفذ كتغيير جانبي.

## تصحيح التوثيق وميزانية الفحوص

`README-ACCOUNTS.md` لم يعد يعمم نتائج Node22 التاريخية على هذا RC؛ المتاح لهذه المتابعة Node24.19.0 وnpm11.17.0 فقط. لم يُغيّر engines أو dependencies أو lockfile أو start. غياب اختبار22.13 **دين تحقق محلي** لا عائق لا يستطيع حله إلا المزود. أما إصدار runtime الفعلي على Hostinger فهو تحقق تشغيل منفصل يعتمد على بيئته. ملاحظة أولية بأن package.json لا يحوي engines كانت غير صحيحة؛ فُحص الملف الفعلي وثبت وجودها في الأسطر6–8، فلم ننشئ patch وهمية لها.

التغيير الوحيد في npm scripts هو تجميع build داخل `npm test` الرسمي في بدايته مرة واحدة، ثم استدعاء اختباري path-http وassistant-off مباشرةً بدل alias يعيد البناء. كل مجموعات الحزمة الرسمية محفوظة بنفس ملفاتها، وباقي aliases المستقلة لم تتغير. هذا يحقق طلب build واحد دون تعديل أمر بناء أو نشر أو start. ملفات accounts الرسمية متسلسلة بـ--test-concurrency=1، وباقي المجموعات بـ&&.

الخطة التنفيذية لهذه المتابعة: تثبيت القفل offline بلا scripts؛ lint مرة واحدة؛ target runner واحد يجمع اختبارات الأمن/schema/storage/CSP؛ ثم `npm test` رسمي واحد شامل PDF/PWA بعد ثبات الكود. لا full suite إضافية ولا stress أو polling تشغيلي على مزود. سجل التسليم، لا هذا الملف، يثبت exit codes والنتائج الفعلية بعد تنفيذها.

PDF المسموح اصطناعي فقط: `tests/pwa-browser.test.mjs:73-78` يبني نص fixture ثم يمرر `buffer:Buffer.from(pdf)` إلى file input بلا path مستخدم. اختبار pdf-viewer يستخدم مولد Uint8Array المحلي `generateEducationalSamplePdf`، لا ملفًا حقيقيًا. لا قراءة env حقيقية أو أسرار أو بيانات طلاب؛ أي .env في fixture HTTP ملف اصطناعي مؤقت صنعه الاختبار نفسه، وليس بيئة خادم.

## بنود محلية بقيت مفتوحة عمدًا

| البند | ما بقي ولماذا لم نوسّع التغيير |
|---|---|
| idle timeout / MFA / re-auth | لا تُضاف بلا سياسة مصادقة وتجربة مستخدم ومسار استرداد؛ الجلسة الحالية8ساعات absolute. يمكن تصميمها محليًا، وليست شرط مزود. |
| rate-limit داخل الذاكرة | محدود30محاولة/15دقيقة و1024عنوان؛ يعاد عند restart ولا يُشارك بين عمليات. نقل الحالة إلىDB أو نظام آخر تغيير معماري/سياسي يحتاج فحوص transaction/expiry، لا خدمة مدفوعة مفترضة. |
| migrations قديمة | تعريف المخطط القديم وfixture اصطناعي غير متاحين؛ رفض التخمين أُغلق، لا migration نفسها. |
| CSP المتبقية | styles وshell الأخرى وتوجيه SPA لم تُشدّد؛ اختبار الصفحة الواحدة ليس ضمان التطبيق كله. |
| Node22.13 وadvisories | تنفيذ matrix وفحص advisories جديدان لم يُنجزا بهذه المتابعة؛ لم نغيّر dependencies دون ضرورة. |
| retention / RPO / RTO | اختيار مدد الاحتفاظ والفقد المقبول ومدة الاستعادة قرار مالك/تشغيل؛ لا حذف أو أتمتة أو سياسة مدد مخترعة. |
| restore آمن وظيفيًا | snapshot/clone/integrity المحلية مثبتة ضمن الاختبارات؛ إبطال sessions عند restore وتبديل مسارDB الحقيقي ما زالا إجراءين موثقين لا command إنتاج مجرّبة. |

## قائمة provider-dependent الدقيقة

1. **الموارد:** هامش تشغيل آمن بعد تحديث المالك120/120، وحدود العملية/الذاكرة؛ لم نقسها أو نختبرها ثانيةً.
2. **التحكم بتطبيق واحد:** طريقة stop/restart/health وإشارة SIGTERM لتطبيق مستقل دون إيقاف الخطة أو noon الحي. يلزم إثبات إجراء، لا اسم زر عام.
3. **طوبولوجيا البروكسي:** peer الحقيقي وعلاقة namespace/loopback، ومن يستبدل X-Forwarded-For/Host/Proto، وضمان منع وصول عميل مباشر إلى Node. لم تتغير trust settings لتناسب تخمينًا.
4. **عزل shared host:** UID/GID لكل app، ACL/network/mount boundaries وإمكان وصول تطبيق آخر لملفات أو socket نون. الاختبار المحلي لا يثبت عزله على Hostinger.
5. **التخزين الدائم:** مسار canonical مطلق منفصل خارج webroot/hbuilds/releases، owner/mode والأسلاف، وبقاء الملف وsidecars بعد restart/redeploy/rollback؛ ضمان عدم تقديمه مباشرة من front server. لا مسار دائم مثبت على Hostinger بهذه المهمة.
6. **backup/restore التشغيلي:** هل تشمل خدمة النسخ مجلد shared خارج build؟ هل النسخة متسقة مع WAL والكتّاب؟ الجدولة/التواريخ/retention المطبقة والموقع خارج failure-domain وصلاحيات الوصول، والقدرة على restore إلى clone جديد دون overwrite. التوثيق المحلي لا يجيب عن هذه الأسئلة.
7. **runtime الفعلي:** Node/npm المثبتان وطريقة تشغيل artifact وتمرير الإعدادات بأمان لدى المضيف؛ اختبار Node22.13 محليًا مستقل عن هذا الشرط.
8. **المجانية والعزل عند الإنشاء:** إثبات شاشة المراجعة أن app/هوست staging ضمن الاشتراك بلا upgrade/رسوم، دون DNS أو Auto Deploy أو ربط قاعدة الإنتاج. لم تُفتح الشاشة أو يُنشأ شيء بهذه المتابعة.

لا بند من هذه البنود أُغلق بمجرد كتابة دليل محلي. لا توجد بيانات دعم جديدة أو موافقة لإعادة فتح الاستضافة.

## طلب إعادة المراجعة المستقلة

المطلوب للمراجع على commit النهائي المذكور في سجل التسليم: مقارنة الفرق بالأساس ef2f320، وفحص الأسلاف وsticky ownership، ورفض schema غير معروفة/rollback دون تغيير المحتوى، وCSP script/style ومسارات shell، وتحقق أن تجميع build لم يحذف مجموعة اختبار. راجع logs أولًا؛ لا تعِد اختبارًا أو تشغّل runner موازيًا دون تفويض جديد. عند السماح بإعادة التنفيذ لاحقًا: بيئة loopback جديدة وDB/Buffer اصطناعيان، وتشغيل target ثم الرسمي تسلسليًا مع تسجيل Node/npm/commit/tree. تبقى اختبارات provider مستبعدة إلى أن يثبت هامش الموارد والعزل ويأذن المالك صراحةً.
