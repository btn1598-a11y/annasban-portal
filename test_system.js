/**
 * فحص واختبار المنظومة الأمنية المتكاملة لشركة النصبان للحراسات الأمنية
 * يتحقق تلقائياً من صحة الخوارزميات، التشفير، المصادقة، والامتثال لـ PDPL
 * يدعم الفحص المباشر في الذاكرة (In-Memory Engine) أو عبر الشبكة الحية
 */

const { Readable, EventEmitter } = require('node:stream');
const server = require('./server');

/**
 * محاكي طلبات HTTP داخل الذاكرة دون الحاجة لفتح منافذ شبكة
 */
function makeInternalRequest(path, method = 'GET', data = null, token = null) {
    return new Promise((resolve) => {
        const payloadStr = data ? JSON.stringify(data) : null;

        const req = new Readable({
            read() {
                if (payloadStr) {
                    this.push(payloadStr);
                }
                this.push(null);
            }
        });

        req.method = method;
        req.url = path;
        req.headers = {
            host: 'localhost:3000',
            'user-agent': 'Annasban-Automated-Security-Tester/2.0',
            'content-type': 'application/json'
        };

        if (token) {
            req.headers['authorization'] = `Bearer ${token}`;
        }
        req.socket = { remoteAddress: '127.0.0.1' };

        let resBody = '';
        const res = new EventEmitter();
        res.headers = {};
        res.statusCode = 200;

        res.setHeader = (k, v) => {
            res.headers[k.toLowerCase()] = v;
        };

        res.writeHead = (code, headers = {}) => {
            res.statusCode = code;
            for (const [k, v] of Object.entries(headers)) {
                res.headers[k.toLowerCase()] = v;
            }
        };

        res.write = (chunk) => {
            resBody += chunk;
            return true;
        };

        res.end = (chunk) => {
            if (chunk) resBody += chunk;
            let parsed = null;
            try {
                parsed = JSON.parse(resBody);
            } catch (e) {
                parsed = resBody;
            }
            resolve({
                status: res.statusCode,
                headers: res.headers,
                data: parsed
            });
        };

        // تمرير الطلب للخادم المباشر
        server.emit('request', req, res);
    });
}

async function runTestSuite() {
    console.log('===============================================================');
    console.log('🧪 بدء الفحص الشامل لمنظومة شركة النصبان للحراسات الأمنية (v2.0)');
    console.log('===============================================================\n');

    let passedTests = 0;
    let failedTests = 0;

    function assertTest(condition, testName) {
        if (condition) {
            console.log(`  ✅ [نجاح]: ${testName}`);
            passedTests++;
        } else {
            console.error(`  ❌ [فشل]: ${testName}`);
            failedTests++;
        }
    }

    try {
        // 1. فحص صحة الخادم وترويسات الأمان
        console.log('1️⃣ فحص جاهزية الخادم وترويسات الحماية السيبرانية:');
        const health = await makeInternalRequest('/api/health');
        assertTest(health.status === 200, 'الخادم يستجيب بحالة HTTP 200 OK');
        assertTest(health.data.success === true, 'استجابة الـ Healthcheck بصيغة JSON سليمة');
        assertTest(health.headers['x-frame-options'] === 'SAMEORIGIN', 'ترويسة X-Frame-Options مفعّلة لمنع Clickjacking');
        assertTest(health.headers['x-content-type-options'] === 'nosniff', 'ترويسة X-Content-Type-Options: nosniff مفعّلة');
        assertTest(Boolean(health.headers['content-security-policy']), 'سياسة حماية المحتوى CSP مطبقة');

        // 2. فحص محاولة تسجيل دخول فاشلة وحماية عدم تسريب التفاصيل
        console.log('\n2️⃣ فحص حماية محاولات الدخول الخاطئة (عدم تسريب Stack Traces):');
        const badLogin = await makeInternalRequest('/api/auth/login', 'POST', {
            username: 'wrong_user',
            password: 'wrong_password'
        });
        assertTest(badLogin.status === 401, 'رفض الدخول الخاطئ بكود 401 Unauthorized بدلاً من 500');
        assertTest(badLogin.data.success === false, 'الرد بصيغة خطأ آمنة');
        assertTest(!JSON.stringify(badLogin.data).includes('/app/dist'), 'عدم تسريب أي مسارات داخلية للخادم');

        // 3. فحص تسجيل دخول مسؤول الموارد البشرية
        console.log('\n3️⃣ فحص مصادقة مسؤول الموارد البشرية (HR Manager Login):');
        const hrLogin = await makeInternalRequest('/api/auth/login', 'POST', {
            username: 'hr_manager',
            password: 'Annasban@2026'
        });
        assertTest(hrLogin.status === 200, 'تسجيل دخول الموارد البشرية بنجاح 200 OK');
        assertTest(Boolean(hrLogin.data.data.token), 'إصدار رمز JWT مشفر وموقع رقمياً');
        const hrToken = hrLogin.data.data.token;

        // 4. فحص استعلام الموارد البشرية مع Bearer Token
        console.log('\n4️⃣ فحص جلسة العمل المصرح بها وصلاحيات الإدارة:');
        const meRes = await makeInternalRequest('/api/auth/me', 'GET', null, hrToken);
        assertTest(meRes.status === 200, 'التحقق من هوية مسؤول الموارد البشرية');
        assertTest(meRes.data.data.user.role === 'hr', 'صلاحية المستخدم هي HR بدقة');

        // 5. فحص تسجيل دخول بوابة الموظف
        console.log('\n5️⃣ فحص بوابة الموظف وتدقيق الهوية الوطنية بخوارزمية Luhn:');
        const empBadNid = await makeInternalRequest('/api/auth/employee-login', 'POST', {
            nationalId: '1234567890', // هوية غير صالحة حسابياً
            password: 'any'
        });
        assertTest(empBadNid.status === 400, 'رفض الهوية غير المطابقة لمعيار Luhn');

        const empLogin = await makeInternalRequest('/api/auth/employee-login', 'POST', {
            nationalId: '1089271645',
            employeeId: 'EMP-1042',
            password: '12345678'
        });
        assertTest(empLogin.status === 200, 'تسجيل دخول الموظف الأمني بنجاح');
        const empToken = empLogin.data.data.token;

        // 6. فحص بيانات الموظف (مسير الرواتب وسجل الحضور)
        console.log('\n6️⃣ فحص مسيرات الرواتب والحضور الميداني للموظف:');
        const slips = await makeInternalRequest('/api/employees/pay-slips', 'GET', null, empToken);
        assertTest(slips.status === 200, 'استرجاع مسير الرواتب بنجاح');
        assertTest(slips.data.data.paySlips.length > 0, 'وجود مسيرات الرواتب بخصومات التأمينات والبدلات');

        const att = await makeInternalRequest('/api/employees/attendance', 'GET', null, empToken);
        assertTest(att.status === 200, 'استرجاع سجلات الحضور والورديات الميدانية');

        // 7. فحص دورة التكامل مع نفاذ الوطني (Nafath Flow)
        console.log('\n7️⃣ فحص محاكاة الربط مع تطبيق نفاذ الوطني الموحد:');
        const nafathInit = await makeInternalRequest('/api/nafath/initiate', 'POST', {
            nationalId: '1089271645'
        });
        assertTest(nafathInit.status === 200, 'بدء طلب التحقق وإصدار رمز نفاذ من رقمين');
        const { transId, verificationCode } = nafathInit.data.data;
        assertTest(/^\d{2}$/.test(verificationCode), `رمز نفاذ الصادر (${verificationCode}) يتكون من رقمين`);

        const nafathVerify = await makeInternalRequest('/api/nafath/verify', 'POST', {
            transId,
            confirmedCode: verificationCode
        });
        assertTest(nafathVerify.status === 200, 'تأكيد الهوية الرقمية عبر نفاذ بنجاح');

        // 8. فحص توقيع العقد وحساب الختم الرقمي المشفر SHA-256
        console.log('\n8️⃣ فحص التوقيع الرقمي للعقد وبصمة التشفير Cryptographic Hash:');
        const signRes = await makeInternalRequest('/api/contracts/sign', 'POST', {
            fullName: 'سعد بن ناصر الدوسري',
            nationalId: '1000000008',
            jobTitle: 'مشرف أمن وسلامة',
            basicSalary: 4500,
            housingAllowance: 1125,
            transportAllowance: 500,
            nafathTransId: transId
        });
        assertTest(signRes.status === 200, 'توقيع العقد وتوثيقه بنجاح');
        assertTest(Boolean(signRes.data.data.signatureHash), `توليد الختم الرقمي المشفر (${signRes.data.data.signatureHash.substring(0, 16)}...)`);

        // 9. فحص سجل التدقيق الأمني والامتثال لنظام حماية البيانات الشخصية (PDPL)
        console.log('\n9️⃣ فحص سجل الامتثال وتدقيق الوصول للبيانات الحساسة (PDPL Logs):');
        const auditRes = await makeInternalRequest('/api/audit/logs', 'GET', null, hrToken);
        assertTest(auditRes.status === 200, 'استعراض سجلات التدقيق الأمني للمشرف');
        assertTest(auditRes.data.data.logs.length > 0, 'توثيق كافة عمليات تسجيل الدخول والوصول للبيانات الحساسة');

        console.log('\n🔟 فحص منظومة المتقدمين وحزمة الوثائق الرسمية الـ 11 والفرز والفلترة الشاملة:');
        const appsRes = await makeInternalRequest('/api/applications', 'GET', null, hrToken);
        assertTest(appsRes.status === 200, 'استرجاع قائمة المتقدمين وإحصائيات لوحة الموارد البشرية');
        assertTest(appsRes.data.data.metrics.total >= 108, 'إجمالي عدد المتقدمين يطابق أو يفوق 108 مسجل');
        assertTest(
            appsRes.data.data.metrics.pending > 0 &&
            appsRes.data.data.metrics.reviewed > 0 &&
            appsRes.data.data.metrics.accepted > 0 &&
            appsRes.data.data.metrics.rejected > 0 &&
            appsRes.data.data.metrics.processing > 0 &&
            appsRes.data.data.metrics.completed >= 40,
            `توزيع المتقدمين غني وشامل على جميع الحالات الـ 6 (انتظار: ${appsRes.data.data.metrics.pending}، مراجعة: ${appsRes.data.data.metrics.reviewed}، مقبول: ${appsRes.data.data.metrics.accepted}، مرفوض: ${appsRes.data.data.metrics.rejected}، إجراءات: ${appsRes.data.data.metrics.processing}، مكتمل: ${appsRes.data.data.metrics.completed})`
        );

        // فحص تحديث الحالة وتاريخ المباشرة
        const firstApp = appsRes.data.data.applications[0];
        const statusRes = await makeInternalRequest(`/api/applications/${firstApp.id}/status`, 'PATCH', { status: 'مقبول' }, hrToken);
        assertTest(statusRes.status === 200, 'تحديث حالة المتقدم إلكترونياً بنجاح');
        // استعادة الحالة
        await makeInternalRequest(`/api/applications/${firstApp.id}/status`, 'PATCH', { status: firstApp.status }, hrToken);

        const dateRes = await makeInternalRequest(`/api/applications/${firstApp.id}/start-date`, 'PATCH', { startDate: '2026-03-01' }, hrToken);
        assertTest(dateRes.status === 200, 'تحديد وحفظ تاريخ مباشرة العمل بنجاح');

        // فحص الفلترة باسم المشروع المقدم له والمسمى الوظيفي والوردية والفرز الأبجدي والزمني
        assertTest(Array.isArray(appsRes.data.data.projects) && appsRes.data.data.projects.length >= 5, 'استرجاع كافة المشاريع الـ 5 المتاحة مع إحصائيات المتقدمين');
        const projFilterRes = await makeInternalRequest('/api/applications?project=' + encodeURIComponent('مشروع المربع الجديد'), 'GET', null, hrToken);
        assertTest(projFilterRes.status === 200, 'فلترة طلبات التوظيف باسم المشروع المقدم له (مشروع المربع الجديد)');
        const allMatchProject = projFilterRes.data.data.applications.every(a => a.project_name === 'مشروع المربع الجديد');
        assertTest(allMatchProject && projFilterRes.data.data.applications.length >= 15, 'كافة النتائج المعروضة تطابق المشروع المفلتر بدقة وبعدد وافر');

        const jobShiftFilterRes = await makeInternalRequest('/api/applications?job=' + encodeURIComponent('مشرف أمن') + '&shift=' + encodeURIComponent('صباحي'), 'GET', null, hrToken);
        assertTest(
            jobShiftFilterRes.status === 200 &&
            jobShiftFilterRes.data.data.applications.length > 0 &&
            jobShiftFilterRes.data.data.applications.every(a => a.job_title === 'مشرف أمن' && a.shift === 'صباحي'),
            'الفلترة المركبة حسب المسمى الوظيفي (مشرف أمن) والوردية (صباحي) تعمل بدقة 100%'
        );

        const sortNameAscRes = await makeInternalRequest('/api/applications?sort=name_asc', 'GET', null, hrToken);
        const sortedApps = sortNameAscRes.data.data.applications;
        assertTest(
            sortNameAscRes.status === 200 && sortedApps.length >= 108 &&
            String(sortedApps[0].full_name).localeCompare(String(sortedApps[sortedApps.length - 1].full_name), 'ar') <= 0,
            'الفرز الأبجدي التصاعدي (name_asc) يعمل بدقة على جميع السجلات'
        );

        const sortOldestRes = await makeInternalRequest('/api/applications?sort=oldest', 'GET', null, hrToken);
        const oldestApps = sortOldestRes.data.data.applications;
        assertTest(
            sortOldestRes.status === 200 && oldestApps[0].id < oldestApps[oldestApps.length - 1].id,
            'الفرز الزمني من الأقدم للأحدث (oldest) يعمل بدقة 100%'
        );

        // 11. فحص صلاحيات الوصول (RBAC) وعزل الصلاحيات بين الزائر والموظف والإدارة
        console.log('\n1️⃣1️⃣ فحص صلاحيات الوصول الصارمة (RBAC) وحماية نقاط النهاية الإدارية:');
        const unauthApps = await makeInternalRequest('/api/applications', 'GET');
        assertTest(unauthApps.status === 403, 'منع الوصول غير المصرح به لسجلات المتقدمين (403 Forbidden)');
        const empApps = await makeInternalRequest('/api/applications', 'GET', null, empToken);
        assertTest(empApps.status === 403, 'منع صلاحية الموظف العادي من استعراض سجلات المتقدمين (403 Forbidden)');
        const empStatusPatch = await makeInternalRequest(`/api/applications/${firstApp.id}/status`, 'PATCH', { status: 'مرفوض' }, empToken);
        assertTest(empStatusPatch.status === 403, 'منع الموظف العادي من تعديل حالات طلبات التوظيف (403 Forbidden)');
        const empAudit = await makeInternalRequest('/api/audit/logs', 'GET', null, empToken);
        assertTest(empAudit.status === 403, 'منع الموظف العادي من الاطلاع على سجل التدقيق الأمني PDPL (403 Forbidden)');
        const empContractsAll = await makeInternalRequest('/api/contracts', 'GET', null, empToken);
        assertTest(empContractsAll.status === 403, 'منع الموظف العادي من استعراض جميع عقود الشركة (403 Forbidden)');

        // 12. فحص حماية الملفات الثابتة ومنع تسريب الكود المصدري أو قاعدة البيانات
        console.log('\n1️⃣2️⃣ فحص حماية الخادم ضد تسريب الملفات المصدرية وقاعدة البيانات:');
        const leakServer = await makeInternalRequest('/server.js', 'GET');
        assertTest(leakServer.status === 404, 'حظر الوصول لملف الخادم الخلفي /server.js (404)');
        const leakDb = await makeInternalRequest('/database/db.js', 'GET');
        assertTest(leakDb.status === 404, 'حظر الوصول لملف قاعدة البيانات /database/db.js (404)');
        const leakAuth = await makeInternalRequest('/lib/auth.js', 'GET');
        assertTest(leakAuth.status === 404, 'حظر الوصول لمكتبة التشفير /lib/auth.js (404)');
        const leakPkg = await makeInternalRequest('/package.json', 'GET');
        assertTest(leakPkg.status === 404, 'حظر الوصول لملف /package.json (404)');

        // 13. فحص تكامل البيانات (Luhn NID + Mod-97 IBAN) لجميع الحسابات والـ 108 متقدمين
        console.log('\n1️⃣3️⃣ فحص تكامل وصحة البيانات القياسية لجميع الموظفين والـ 108 متقدمين:');
        const { validateSaudiNationalID, validateSaudiIBAN } = require('./lib/validation');
        const allAppsValidNid = appsRes.data.data.applications.every(a => validateSaudiNationalID(a.national_id).isValid);
        const allAppsValidIban = appsRes.data.data.applications.every(a => validateSaudiIBAN(a.iban).isValid);
        assertTest(allAppsValidNid, 'جميع أرقام الهوية الوطنية للمتقدمين (108 متقدم) صحيحة ومطابقة لخوارزمية Luhn بنسبة 100%');
        assertTest(allAppsValidIban, 'جميع أرقام الآيبان البنكية للمتقدمين (108 متقدم) صحيحة ومطابقة لمعيار ISO 7064 Mod 97-10 بنسبة 100%');

        // فحص دخول جميع الموظفين (EMP-1042, EMP-1043, EMP-1044) واسترجاع عقودهم ومسيراتهم
        const emp1043Login = await makeInternalRequest('/api/auth/employee-login', 'POST', {
            nationalId: '1054398217',
            employeeId: 'EMP-1043',
            password: '12345678',
            captchaAnswer: 7
        });
        assertTest(emp1043Login.status === 200, 'تسجيل دخول الموظف الثاني (EMP-1043) بنجاح مع التحقق من CAPTCHA');
        const emp1043Contract = await makeInternalRequest('/api/contracts/my', 'GET', null, emp1043Login.data.data.token);
        assertTest(emp1043Contract.status === 200 && emp1043Contract.data.data.contract.basic_salary >= 4000, 'عقد الموظف EMP-1043 متوافق مع الحد الأدنى للتوطين (4,000 ر.س أساسي)');

        const emp1044Login = await makeInternalRequest('/api/auth/employee-login', 'POST', {
            nationalId: '1098234121',
            employeeId: 'EMP-1044',
            password: '12345678',
            captchaAnswer: 7
        });
        assertTest(emp1044Login.status === 200, 'تسجيل دخول الموظف الثالث (EMP-1044) بنجاح');
        const emp1044Contract = await makeInternalRequest('/api/contracts/my', 'GET', null, emp1044Login.data.data.token);
        assertTest(emp1044Contract.status === 200, 'استرجاع العقد الموثق للموظف الثالث (EMP-1044) بنجاح');

        // فحص تقديم طلب توظيف متكرر بنفس الهوية (تحديث سلس بدلاً من خطأ 500)
        const dupAppRes = await makeInternalRequest('/api/applications', 'POST', {
            fullName: 'محمد عبدالله القحطاني',
            nationalId: '1089271645',
            phone: '0551234567',
            iban: 'SA0380000000608010167519',
            jobTitle: 'ضابط أمن',
            projectName: 'مشروع المربع الجديد'
        });
        assertTest(dupAppRes.status === 201 && Boolean(dupAppRes.data.data.app_id), 'معالجة تقديم طلب التوظيف وتحديث السجل المكرر بنجاح دون خطأ 500');

        // 14. فحص محرك الطباعة (4 أوضاع طباعة) وحزمة الوثائق الـ 11
        console.log('\n1️⃣4️⃣ فحص أوامر الطباعة (@media print) ومحرك الوثائق الرسمية الـ 11:');
        const fs = require('node:fs');
        const indexHtml = fs.readFileSync('./index.html', 'utf8');
        const hrEngineJs = fs.readFileSync('./hr_engine.js', 'utf8');
        assertTest(
            indexHtml.includes('printDocumentSection(\'contract\')') &&
            indexHtml.includes('printDocumentSection(\'badge\')') &&
            indexHtml.includes('printDocumentSection(\'docs\')') &&
            indexHtml.includes('printDocumentSection(\'attachment\')'),
            'تفعيل كافة أوامر الطباعة الأربعة (العقد الموحد، البطاقة الأمنية، الـ 11 وثيقة، والمرفقات الفردية)'
        );
        assertTest(
            !hrEngineJs.includes('info@3s-secrity.net') && hrEngineJs.includes('info@3s-security.net'),
            'تصحيح البريد الرسمي في تذييل كافة الوثائق المطبوعة (info@3s-security.net)'
        );
        assertTest(
            indexHtml.includes('body[data-print-mode="badge"] .main-content-area') &&
            indexHtml.includes('body[data-print-mode="badge"] #security-badge-print-container') &&
            indexHtml.includes('generateBadgePrintHtml') &&
            indexHtml.includes('prepareBadgePrint'),
            'عزل طباعة البطاقة الأمنية الرسمية حصراً وإخفاء كامل محتوى الصفحة وجداول الرواتب'
        );
        assertTest(
            hrEngineJs.includes('printApplicantSecurityBadge'),
            'إتاحة زر وخاصية طباعة البطاقة الأمنية لجميع المتقدمين في لوحة الموارد البشرية'
        );

        console.log('\n===============================================================');
        console.log(`📊 النتيجة النهائية للفحص الأوتوماتيكي:`);
        console.log(`   🟢 الفحوصات الناجحة: ${passedTests}`);
        console.log(`   🔴 الفحوصات الفاشلة: ${failedTests}`);
        if (failedTests === 0) {
            console.log('   🏆 المنظومة اجتازت 100% من معايير الأمان والامتثال والتشغيل بنجاح تام!');
        }
        console.log('===============================================================\n');

        // إنهاء العملية بنجاح
        if (server.listening) server.close();
        process.exit(failedTests === 0 ? 0 : 1);

    } catch (err) {
        console.error('❌ خطأ غير متوقع أثناء تنفيذ الاختبارات:', err);
        if (server.listening) server.close();
        process.exit(1);
    }
}

// تشغيل الاختبار
runTestSuite();
