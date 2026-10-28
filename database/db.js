/**
 * تهيئة وإدارة قاعدة البيانات الآمنة (SQLite Native via node:sqlite)
 * مع المعالجة التلقائية للبنية وتغذية البيانات الأولية (Seeding)
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const { hashPassword, generateContractHash } = require('../lib/auth');

function getValidDbPath() {
    if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;
    const defaultLocal = path.join(__dirname, 'annasban_security.db');
    try {
        // اختبار إمكانية الكتابة في المجلد المحلي
        const testFile = path.join(__dirname, '.db_test');
        fs.writeFileSync(testFile, '1');
        fs.unlinkSync(testFile);
        return defaultLocal;
    } catch (e) {
        // في حال بيئة الحماية (Sandbox) على نظام macOS يتم التخزين في /tmp بسلاسة
        return '/tmp/annasban_security.db';
    }
}

const DB_PATH = getValidDbPath();

let dbInstance = null;

function getDatabase() {
    if (dbInstance) return dbInstance;

    dbInstance = new DatabaseSync(DB_PATH);

    // تفعيل مفاتيح الربط الخارجي وتحسين الأداء
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');

    // قراءة وتنفيذ مخطط قاعدة البيانات
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        dbInstance.exec(schemaSql);
    }

    // التحقق من وجود المستخدمين الأوليين، وإذا لم يتوفروا يتم زرع البيانات
    seedInitialData(dbInstance);

    return dbInstance;
}

function seedInitialData(db) {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (userCount > 0) return; // تم بذر البيانات مسبقاً

    console.log('⚡ جاري تهيئة البيانات الأولية الآمنة لشركة النصبان للحراسات الأمنية...');

    // 1. حساب تشفير كلمات المرور
    const hrPass = hashPassword('Annasban@2026');
    const adminPass = hashPassword('AnnasbanAdmin#2026');
    const emp1Pass = hashPassword('12345678');
    const emp2Pass = hashPassword('12345678');
    const emp3Pass = hashPassword('12345678');

    // 2. إدخال المستخدمين
    const insertUser = db.prepare(`
        INSERT INTO users (username, national_id, employee_id, full_name, password_hash, salt, role, phone, email, iban, department, job_title, assigned_location)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
        'hr_manager',
        '1011223344',
        'ADM-001',
        'سلطان بن إبراهيم المنصور',
        hrPass.hash,
        hrPass.salt,
        'hr',
        '0505123456',
        'hr@annasban.com.sa',
        'SA0380000000608010167519',
        'الموارد البشرية والعمليات',
        'مدير الموارد البشرية والامتثال',
        'الإدارة العامة - الرياض'
    );

    insertUser.run(
        'admin',
        '1022334455',
        'ADM-000',
        'فهد بن عبد العزيز النصبان',
        adminPass.hash,
        adminPass.salt,
        'admin',
        '0555987654',
        'management@annasban.com.sa',
        'SA0380000000608010167519',
        'الإدارة التنفيذية',
        'المدير العام التنفيذي',
        'الإدارة العامة - الرياض'
    );

    const emp1Res = insertUser.run(
        '1089271645',
        '1089271645',
        'EMP-1042',
        'عبد الرحمن بن خالد المطيري',
        emp1Pass.hash,
        emp1Pass.salt,
        'employee',
        '0551234567',
        'a.almutairi@annasban.com.sa',
        'SA0380000000608010167519',
        'الحراسات الميدانية',
        'مشرف أمن وسلامة ميداني',
        'مشروع مجمع وزارة الداخلية - الرياض'
    );

    const emp2Res = insertUser.run(
        '1054398210',
        '1054398210',
        'EMP-1043',
        'فيصل بن سعد القحطاني',
        emp2Pass.hash,
        emp2Pass.salt,
        'employee',
        '0549876543',
        'f.alqahtani@annasban.com.sa',
        'SA0380000000608010167519',
        'الحراسات الميدانية',
        'ضابط أمن وحراسة',
        'مركز الملك عبد الله المالي (KAFD)'
    );

    const emp3Res = insertUser.run(
        '1098234125',
        '1098234125',
        'EMP-1044',
        'مشعل بن فهد العتيبي',
        emp3Pass.hash,
        emp3Pass.salt,
        'employee',
        '0563456789',
        'm.alotaibi@annasban.com.sa',
        'SA0380000000608010167519',
        'غرفة العمليات المركزية',
        'مشغل كاميرات ومراقبة مركزية',
        'برج النصبان - المركز الأمني'
    );

    // 3. إدخال عقود وظيفية رسمية
    const insertContract = db.prepare(`
        INSERT INTO contracts (contract_number, user_id, employee_name, national_id, job_title, basic_salary, housing_allowance, transport_allowance, total_salary, status, nafath_trans_id, nafath_verified_at, digital_signature_hash, contract_terms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const contract1Data = {
        number: 'ANS-2026-CT-1042',
        name: 'عبد الرحمن بن خالد المطيري',
        nid: '1089271645',
        job: 'مشرف أمن وسلامة ميداني',
        basic: 4500,
        housing: 1125,
        transport: 500,
        total: 6125
    };
    const c1Hash = generateContractHash(contract1Data);

    insertContract.run(
        contract1Data.number,
        emp1Res.lastInsertRowid,
        contract1Data.name,
        contract1Data.nid,
        contract1Data.job,
        contract1Data.basic,
        contract1Data.housing,
        contract1Data.transport,
        contract1Data.total,
        'signed',
        'NF-99281-2026',
        '2026-01-15 10:24:19',
        c1Hash,
        'عقد عمل موحد معتمد طبقاً للمادة 51 من نظام العمل ولائحته التنفيذية وتوثيق منصة قوى والربط مع نفاذ الوطني.'
    );

    const contract2Data = {
        number: 'ANS-2026-CT-1043',
        name: 'فيصل بن سعد القحطاني',
        nid: '1054398210',
        job: 'ضابط أمن وحراسة',
        basic: 3800,
        housing: 950,
        transport: 500,
        total: 5250
    };
    const c2Hash = generateContractHash(contract2Data);

    insertContract.run(
        contract2Data.number,
        emp2Res.lastInsertRowid,
        contract2Data.name,
        contract2Data.nid,
        contract2Data.job,
        contract2Data.basic,
        contract2Data.housing,
        contract2Data.transport,
        contract2Data.total,
        'signed',
        'NF-99410-2026',
        '2026-02-01 09:12:44',
        c2Hash,
        'عقد عمل موحد لحراسة المنشآت الحيوية مع الالتزام بأنظمة الحراسات الأمنية المدنية الخاصة.'
    );

    // 4. إدخال مسيرات الرواتب
    const insertPaySlip = db.prepare(`
        INSERT INTO pay_slips (employee_id, month_period, basic_salary, housing_allowance, transport_allowance, overtime_amount, gosi_deduction, penalties, net_salary, payment_status, payment_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertPaySlip.run('EMP-1042', 'سبتمبر 2026', 4500, 1125, 500, 450, 548.44, 0, 6026.56, 'paid', '2026-09-27');
    insertPaySlip.run('EMP-1042', 'أغسطس 2026', 4500, 1125, 500, 0, 548.44, 0, 5576.56, 'paid', '2026-08-27');
    insertPaySlip.run('EMP-1043', 'سبتمبر 2026', 3800, 950, 500, 300, 463.13, 0, 5086.87, 'paid', '2026-09-27');

    // 5. إدخال سجلات الحضور الميداني
    const insertAttendance = db.prepare(`
        INSERT INTO attendance (employee_id, date, shift_name, location_name, check_in, check_out, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertAttendance.run('EMP-1042', '2026-10-27', 'الوردية الصباحية (07:00 - 15:00)', 'مجمع وزارة الداخلية', '06:55:00', '15:05:00', 'present', 'مباشرة في الموعد ومسح أمني منتظم');
    insertAttendance.run('EMP-1042', '2026-10-26', 'الوردية الصباحية (07:00 - 15:00)', 'مجمع وزارة الداخلية', '06:58:00', '15:00:00', 'present', 'تسليم الوردية للمشرف المناوب');
    insertAttendance.run('EMP-1043', '2026-10-27', 'الوردية المسائية (15:00 - 23:00)', 'KAFD - البوابة رقم 4', '14:50:00', '23:05:00', 'present', 'حضور منتظم وتفقد بوابات الدخول');

    // 6. تسجيل حدث أولي في سجل التدقيق الأمني (PDPL Audit Log)
    const insertAudit = db.prepare(`
        INSERT INTO audit_logs (actor_name, actor_role, action_type, resource_accessed, details, ip_address, severity)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertAudit.run(
        'System Initialization',
        'SYSTEM',
        'SYSTEM_STARTUP',
        'DATABASE_CORE',
        'تم تشغيل المنظومة بنجاح وتفعيل آليات الامتثال لنظام حماية البيانات الشخصية السعودي والتشفير المعتمد',
        '127.0.0.1',
        'INFO'
    );

    console.log('✅ تم تجهيز قاعدة البيانات والجداول والسجلات الأولية بنجاح تام.');
}

module.exports = {
    getDatabase,
    DB_PATH
};
