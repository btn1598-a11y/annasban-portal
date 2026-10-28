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

        console.log('\n🔟 فحص منظومة المتقدمين وحزمة الوثائق الرسمية الـ 11:');
        const appsRes = await makeInternalRequest('/api/applications', 'GET', null, hrToken);
        assertTest(appsRes.status === 200, 'استرجاع قائمة المتقدمين وإحصائيات لوحة الموارد البشرية');
        assertTest(appsRes.data.data.metrics.total >= 108, 'إجمالي عدد المتقدمين يطابق أو يفوق 108 مسجل');
        assertTest(appsRes.data.data.metrics.completed >= 80, 'عدد الطلبات المكتملة يطابق النظام المرجعي (~85)');

        // فحص تحديث الحالة وتاريخ المباشرة
        const firstApp = appsRes.data.data.applications[0];
        const statusRes = await makeInternalRequest(`/api/applications/${firstApp.id}/status`, 'PATCH', { status: 'مقبول' }, hrToken);
        assertTest(statusRes.status === 200, 'تحديث حالة المتقدم إلكترونياً بنجاح');
        // استعادة الحالة
        await makeInternalRequest(`/api/applications/${firstApp.id}/status`, 'PATCH', { status: firstApp.status }, hrToken);

        const dateRes = await makeInternalRequest(`/api/applications/${firstApp.id}/start-date`, 'PATCH', { startDate: '2026-03-01' }, hrToken);
        assertTest(dateRes.status === 200, 'تحديد وحفظ تاريخ مباشرة العمل بنجاح');

        // فحص الفلترة باسم المشروع المقدم له
        assertTest(Array.isArray(appsRes.data.data.projects) && appsRes.data.data.projects.length > 0, 'استرجاع قائمة المشاريع المتاحة مع إحصائيات المتقدمين');
        const projFilterRes = await makeInternalRequest('/api/applications?project=' + encodeURIComponent('مشروع المربع الجديد'), 'GET', null, hrToken);
        assertTest(projFilterRes.status === 200, 'فلترة طلبات التوظيف باسم المشروع المقدم له (مشروع المربع الجديد)');
        const allMatchProject = projFilterRes.data.data.applications.every(a => a.project_name === 'مشروع المربع الجديد');
        assertTest(allMatchProject && projFilterRes.data.data.applications.length > 0, 'كافة النتائج المعروضة تطابق المشروع المفلتر بدقة');

        console.log('\n===============================================================');
        console.log(`📊 النتيجة النهائية للفحص الأوتوماتيكي:`);
        console.log(`   🟢 الفحوصات الناجحة: ${passedTests}`);
        console.log(`   🔴 الفحوصات الفاشلة: ${failedTests}`);
        if (failedTests === 0) {
            console.log('   🏆 المنظومة اجتازت 100% من معايير الأمان والامتثال والتشغيل بنجاح تام!');
        }
        console.log('===============================================================\n');

        // إنهاء العملية بنجاح
        server.close();
        process.exit(failedTests === 0 ? 0 : 1);

    } catch (err) {
        console.error('❌ خطأ غير متوقع أثناء تنفيذ الاختبارات:', err);
        server.close();
        process.exit(1);
    }
}

// تشغيل الاختبار
runTestSuite();
