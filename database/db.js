/**
 * تهيئة وإدارة قاعدة البيانات الآمنة (SQLite Native via node:sqlite)
 * مع المعالجة التلقائية للبنية وتغذية البيانات الأولية (Seeding)
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const { hashPassword, generateContractHash } = require('../lib/auth');
const { validateSaudiNationalID, validateSaudiIBAN } = require('../lib/validation');

function makeValidNid(prefix9) {
    const s = String(prefix9).replace(/\D/g, '').padEnd(9, '0').slice(0, 9);
    const first = (s[0] === '1' || s[0] === '2') ? s[0] : '1';
    const base9 = first + s.slice(1);
    for (let d = 0; d <= 9; d++) {
        const candidate = base9 + d;
        if (validateSaudiNationalID(candidate).isValid) return candidate;
    }
    return '1089271645';
}

function makeValidIban(bankCode = '80', account18 = '000679608010356897') {
    const b = String(bankCode).replace(/\D/g, '').padStart(2, '0').slice(0, 2);
    const acc = String(account18).replace(/\D/g, '').padStart(18, '0').slice(-18);
    for (let chk = 2; chk <= 98; chk++) {
        const c = String(chk).padStart(2, '0');
        const raw = 'SA' + c + b + acc;
        if (validateSaudiIBAN(raw).isValid) {
            return raw.replace(/(.{4})(?=.)/g, '$1 ');
        }
    }
    return 'SA03 8000 0000 6080 1016 7519';
}

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
    seedApplicationsData(dbInstance);
    repairDataIntegrity(dbInstance);

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

    // 2. إدخال المستخدمين (بهويات وطنية وآيبان مطابقة 100% لخوارزميات Luhn و ISO 7064)
    const insertUser = db.prepare(`
        INSERT INTO users (username, national_id, employee_id, full_name, password_hash, salt, role, phone, email, iban, department, job_title, assigned_location)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
        'hr_manager',
        '1011223342',
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
        '1022334450',
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
        '1054398217',
        '1054398217',
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
        '1098234121',
        '1098234121',
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
        nid: '1054398217',
        job: 'ضابط أمن وحراسة',
        basic: 4000,
        housing: 1000,
        transport: 500,
        total: 5500
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

    const contract3Data = {
        number: 'ANS-2026-CT-1044',
        name: 'مشعل بن فهد العتيبي',
        nid: '1098234121',
        job: 'مشغل كاميرات ومراقبة مركزية',
        basic: 5000,
        housing: 1250,
        transport: 600,
        total: 6850
    };
    const c3Hash = generateContractHash(contract3Data);

    insertContract.run(
        contract3Data.number,
        emp3Res.lastInsertRowid,
        contract3Data.name,
        contract3Data.nid,
        contract3Data.job,
        contract3Data.basic,
        contract3Data.housing,
        contract3Data.transport,
        contract3Data.total,
        'signed',
        'NF-99520-2026',
        '2026-02-10 11:05:00',
        c3Hash,
        'عقد عمل موحد لإدارة غرفة العمليات المركزية والمراقبة الأمنية.'
    );

    // 4. إدخال مسيرات الرواتب
    const insertPaySlip = db.prepare(`
        INSERT INTO pay_slips (employee_id, month_period, basic_salary, housing_allowance, transport_allowance, overtime_amount, gosi_deduction, penalties, net_salary, payment_status, payment_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertPaySlip.run('EMP-1042', 'سبتمبر 2026', 4500, 1125, 500, 450, 548.44, 0, 6026.56, 'paid', '2026-09-27');
    insertPaySlip.run('EMP-1042', 'أغسطس 2026', 4500, 1125, 500, 0, 548.44, 0, 5576.56, 'paid', '2026-08-27');
    insertPaySlip.run('EMP-1043', 'سبتمبر 2026', 4000, 1000, 500, 300, 487.50, 0, 5312.50, 'paid', '2026-09-27');
    insertPaySlip.run('EMP-1043', 'أغسطس 2026', 4000, 1000, 500, 0, 487.50, 0, 5012.50, 'paid', '2026-08-27');
    insertPaySlip.run('EMP-1044', 'سبتمبر 2026', 5000, 1250, 600, 500, 609.38, 0, 6740.62, 'paid', '2026-09-27');
    insertPaySlip.run('EMP-1044', 'أغسطس 2026', 5000, 1250, 600, 0, 609.38, 0, 6240.62, 'paid', '2026-08-27');

    // 5. إدخال سجلات الحضور الميداني
    const insertAttendance = db.prepare(`
        INSERT INTO attendance (employee_id, date, shift_name, location_name, check_in, check_out, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertAttendance.run('EMP-1042', '2026-10-27', 'الوردية الصباحية (07:00 - 15:00)', 'مجمع وزارة الداخلية', '06:55:00', '15:05:00', 'present', 'مباشرة في الموعد ومسح أمني منتظم');
    insertAttendance.run('EMP-1042', '2026-10-26', 'الوردية الصباحية (07:00 - 15:00)', 'مجمع وزارة الداخلية', '06:58:00', '15:00:00', 'present', 'تسليم الوردية للمشرف المناوب');
    insertAttendance.run('EMP-1043', '2026-10-27', 'الوردية المسائية (15:00 - 23:00)', 'KAFD - البوابة رقم 4', '14:50:00', '23:05:00', 'present', 'حضور منتظم وتفقد بوابات الدخول');
    insertAttendance.run('EMP-1043', '2026-10-26', 'الوردية المسائية (15:00 - 23:00)', 'KAFD - البوابة رقم 4', '14:55:00', '23:02:00', 'present', 'تأمين البوابة الشمالية');
    insertAttendance.run('EMP-1044', '2026-10-27', 'الوردية الليلية (23:00 - 07:00)', 'برج النصبان - غرفة العمليات', '22:50:00', '07:05:00', 'present', 'متابعة كاميرات المراقبة المركزية');
    insertAttendance.run('EMP-1044', '2026-10-26', 'الوردية الليلية (23:00 - 07:00)', 'برج النصبان - غرفة العمليات', '22:54:00', '07:01:00', 'present', 'تقرير مناوبة سليم بدون ملاحظات');

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

function seedApplicationsData(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            app_id TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            nationality TEXT DEFAULT 'سعودي',
            national_id TEXT UNIQUE NOT NULL,
            id_issue_place TEXT DEFAULT 'حائل',
            birth_date TEXT DEFAULT '1999-11-01',
            gender TEXT DEFAULT 'ذكر',
            marital_status TEXT DEFAULT 'أعزب',
            phone TEXT NOT NULL,
            email TEXT,
            city TEXT DEFAULT 'القاعد',
            district TEXT DEFAULT 'عثمر القديم',
            street TEXT DEFAULT 'الر',
            education_level TEXT DEFAULT 'ثانوي',
            education_inst TEXT DEFAULT 'ثانوية قتيبه',
            degree_name TEXT DEFAULT 'الثانوية',
            degree_date TEXT DEFAULT '2019-09-01',
            job_title TEXT NOT NULL DEFAULT 'ضابط أمن',
            project_name TEXT NOT NULL DEFAULT 'مشروع المربع الجديد',
            work_location TEXT DEFAULT 'الرياض المربع الجديد',
            shift TEXT DEFAULT 'صباحي',
            start_date TEXT DEFAULT '2026-02-20',
            bank_name TEXT DEFAULT 'بنك الراجحي',
            bank_branch TEXT DEFAULT 'فرع الرياض',
            branch_code TEXT DEFAULT '001',
            iban TEXT DEFAULT 'SA55 8000 0679 6080 1035 6897',
            status TEXT DEFAULT 'قيد الانتظار' CHECK(status IN ('قيد الانتظار', 'تمت المراجعة', 'مقبول', 'مرفوض', 'إنهاء إجراءات', 'مكتمل')),
            applicant_signature TEXT,
            created_date TEXT DEFAULT '2026/9/1',
            nafath_verified INTEGER DEFAULT 1,
            nafath_trans_id TEXT DEFAULT 'NF-99281-2026',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    const count = db.prepare('SELECT COUNT(*) as count FROM applications').get().count;
    if (count > 0) return;

    console.log('⚡ جاري بذر بيانات المتقدمين لشركة النصبان للحراسات الأمنية (108 متقدم)...');

    const insertApp = db.prepare(`
        INSERT INTO applications (
            app_id, full_name, nationality, national_id, id_issue_place, birth_date, gender, marital_status,
            phone, email, city, district, street, education_level, education_inst, degree_name, degree_date,
            job_title, project_name, work_location, shift, start_date, bank_name, bank_branch, branch_code,
            iban, status, created_date, nafath_verified, nafath_trans_id
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?
        )
    `);

    // المرشحون الرئيسيون المذكورون بالصور والنماذج
    const featured = [
        {
            app_id: 'APP-1789559996878-SJRTB9',
            full_name: 'عبدالله',
            nationality: 'سعودي',
            national_id: '1099887766',
            id_issue_place: 'الرياض',
            birth_date: '1996-05-14',
            gender: 'ذكر',
            marital_status: 'أعزب',
            phone: '0557444127',
            email: 'abdullah.subaie@gmail.com',
            city: 'الرياض',
            district: 'النرجس',
            street: 'طريق الأمير فيصل',
            education_level: 'دبلوم',
            education_inst: 'الكلية التقنية بالرياض',
            degree_name: 'دبلوم إدارة أمن وسلامة',
            degree_date: '2020-06-15',
            job_title: 'مشرف أمن',
            project_name: 'مشروع مجمع وزارة الداخلية',
            work_location: 'الرياض - الملز',
            shift: 'صباحي',
            start_date: '2026-09-16',
            bank_name: 'البنك الأهلي السعودي',
            bank_branch: 'فرع الملز',
            branch_code: '012',
            iban: 'SA44 1000 0001 2345 6789 0123',
            status: 'قيد الانتظار',
            created_date: '2026/9/16'
        },
        {
            app_id: 'APP-1788285838920-BCU3HJ',
            full_name: 'عبدالرحيم امين بخش سلطان',
            nationality: 'سعودي',
            national_id: '1088776655',
            id_issue_place: 'مكة المكرمة',
            birth_date: '1998-03-22',
            gender: 'ذكر',
            marital_status: 'أعزب',
            phone: '0576308118',
            email: 'abdulrahim.bakhsh@gmail.com',
            city: 'الرياض',
            district: 'السليمانية',
            street: 'شارع الضباب',
            education_level: 'ثانوي',
            education_inst: 'ثانوية الملك عبدالعزيز',
            degree_name: 'الثانوية العامة',
            degree_date: '2018-05-20',
            job_title: 'ضابط أمن',
            project_name: 'مشروع المربع الجديد',
            work_location: 'الرياض المربع الجديد',
            shift: 'مسائي',
            start_date: '2026-09-01',
            bank_name: 'مصرف الراجحي',
            bank_branch: 'فرع العليا',
            branch_code: '005',
            iban: 'SA12 8000 0234 5678 9012 3456',
            status: 'قيد الانتظار',
            created_date: '2026/9/1'
        },
        {
            app_id: 'APP-1788263667940-0IRVVG',
            full_name: 'راضي غازي فهاد الشمري',
            nationality: 'سعودي',
            national_id: '1127777488',
            id_issue_place: 'حائل',
            birth_date: '1999-11-01',
            gender: 'ذكر',
            marital_status: 'أعزب',
            phone: '0559889150',
            email: 'radialshammaryf.16@gmail.com',
            city: 'القاعد',
            district: 'عثمر القديم',
            street: 'الر',
            education_level: 'ثانوي',
            education_inst: 'ثانوية قتيبه',
            degree_name: 'الثانوية',
            degree_date: '2019-09-01',
            job_title: 'ضابط أمن',
            project_name: 'مشروع المربع الجديد',
            work_location: 'الرياض المربع الجديد',
            shift: 'صباحي',
            start_date: '2026-02-20',
            bank_name: 'بنك الراجحي',
            bank_branch: 'فرع الرياض',
            branch_code: '001',
            iban: 'SA55 8000 0679 6080 1035 6897',
            status: 'مكتمل',
            created_date: '2026/9/1'
        },
        {
            app_id: 'APP-1788255779763-PTN0GD',
            full_name: 'وليد ميز خضر العقيدي',
            nationality: 'سعودي',
            national_id: '1077665544',
            id_issue_place: 'الدمام',
            birth_date: '1994-08-10',
            gender: 'ذكر',
            marital_status: 'متزوج',
            phone: '0551445880',
            email: 'waleed.oqaidi@gmail.com',
            city: 'الرياض',
            district: 'العقيق',
            street: 'شارع التحلية',
            education_level: 'بكالوريوس',
            education_inst: 'جامعة الإمام محمد بن سعود',
            degree_name: 'بكالوريوس إدارة أعمال',
            degree_date: '2017-06-10',
            job_title: 'مدير مشروع أمن',
            project_name: 'مشروع مركز الملك عبدالله المالي (KAFD)',
            work_location: 'الرياض KAFD',
            shift: 'صباحي',
            start_date: '2026-09-01',
            bank_name: 'بنك الرياض',
            bank_branch: 'فرع الصحافة',
            branch_code: '022',
            iban: 'SA67 2000 0345 6789 0123 4567',
            status: 'مكتمل',
            created_date: '2026/9/1'
        },
        {
            app_id: 'APP-1788251613500-9YN063',
            full_name: 'شباب خلف ديلم الشاهر الشمري',
            nationality: 'سعودي',
            national_id: '1066554433',
            id_issue_place: 'حائل',
            birth_date: '1997-12-05',
            gender: 'ذكر',
            marital_status: 'أعزب',
            phone: '0559897547',
            email: 'shabab.shammari@gmail.com',
            city: 'الرياض',
            district: 'الرمال',
            street: 'شارع النجاح',
            education_level: 'ثانوي',
            education_inst: 'ثانوية حائل العامة',
            degree_name: 'الثانوية العامة',
            degree_date: '2018-05-18',
            job_title: 'ضابط أمن',
            project_name: 'مشروع هيئة السوق المالية',
            work_location: 'الرياض - العليا',
            shift: 'مسائي',
            start_date: '2026-09-01',
            bank_name: 'مصرف الإنماء',
            bank_branch: 'فرع الرمال',
            branch_code: '015',
            iban: 'SA89 5000 0456 7890 1234 5678',
            status: 'مكتمل',
            created_date: '2026/9/1'
        },
        {
            app_id: 'APP-1788241100222-REV001',
            full_name: 'تركي بن فهد الدوسري',
            nationality: 'سعودي',
            national_id: '1055443322',
            id_issue_place: 'الرياض',
            birth_date: '2000-01-19',
            gender: 'ذكر',
            marital_status: 'أعزب',
            phone: '0543219876',
            email: 'turki.dossary@gmail.com',
            city: 'الرياض',
            district: 'السويدي',
            street: 'شارع عائشة بنت أبي بكر',
            education_level: 'ثانوي',
            education_inst: 'ثانوية السويدي',
            degree_name: 'الثانوية العامة',
            degree_date: '2021-06-12',
            job_title: 'ضابط أمن',
            project_name: 'مشروع المربع الجديد',
            work_location: 'الرياض المربع الجديد',
            shift: 'صباحي',
            start_date: '2026-09-10',
            bank_name: 'مصرف الراجحي',
            bank_branch: 'فرع السويدي',
            branch_code: '008',
            iban: 'SA45 8000 0567 8901 2345 6789',
            status: 'تمت المراجعة',
            created_date: '2026/9/12'
        },
        {
            app_id: 'APP-1788249988776-REJ001',
            full_name: 'خالد بن ناصر الشهراني',
            nationality: 'سعودي',
            national_id: '1044332211',
            id_issue_place: 'خميس مشيط',
            birth_date: '1995-04-10',
            gender: 'ذكر',
            marital_status: 'متزوج',
            phone: '0567891234',
            email: 'khalid.shahrani@gmail.com',
            city: 'الرياض',
            district: 'المونسية',
            street: 'شارع الشيخ حسن بن حسين',
            education_level: 'كفاءة متوسطة',
            education_inst: 'متوسطة الإمام البخاري',
            degree_name: 'شهادة الكفاءة المتوسطة',
            degree_date: '2015-05-10',
            job_title: 'حارس أمن',
            project_name: 'مشروع المربع الجديد',
            work_location: 'الرياض المربع الجديد',
            shift: 'مسائي',
            start_date: '2026-09-01',
            bank_name: 'البنك العربي الوطني',
            bank_branch: 'فرع المونسية',
            branch_code: '031',
            iban: 'SA23 4000 0678 9012 3456 7890',
            status: 'مرفوض',
            created_date: '2026/8/28'
        },
        {
            app_id: 'APP-1788247766554-REJ002',
            full_name: 'ماجد بن سعود الحربي',
            nationality: 'سعودي',
            national_id: '1033221100',
            id_issue_place: 'المدينة المنورة',
            birth_date: '1993-07-25',
            gender: 'ذكر',
            marital_status: 'أعزب',
            phone: '0533344556',
            email: 'majed.harbi@gmail.com',
            city: 'الرياض',
            district: 'اليرموك',
            street: 'شارع الصحابة',
            education_level: 'ثانوي',
            education_inst: 'ثانوية أحد',
            degree_name: 'الثانوية العامة',
            degree_date: '2014-06-01',
            job_title: 'ضابط أمن',
            project_name: 'مشروع برج النصبان',
            work_location: 'الرياض - طريق الملك فهد',
            shift: 'صباحي',
            start_date: '2026-09-01',
            bank_name: 'بنك البلاد',
            bank_branch: 'فرع اليرموك',
            branch_code: '018',
            iban: 'SA34 1500 0789 0123 4567 8901',
            status: 'مرفوض',
            created_date: '2026/8/25'
        }
    ];

    for (const f of featured) {
        const validNid = makeValidNid(f.national_id.slice(0, 9));
        const bbanClean = f.iban.replace(/\s+/g, '').slice(4);
        const validIban = makeValidIban(bbanClean.slice(0, 2), bbanClean.slice(2));
        insertApp.run(
            f.app_id, f.full_name, f.nationality, validNid, f.id_issue_place, f.birth_date, f.gender, f.marital_status,
            f.phone, f.email, f.city, f.district, f.street, f.education_level, f.education_inst, f.degree_name, f.degree_date,
            f.job_title, f.project_name, f.work_location, f.shift, f.start_date, f.bank_name, f.bank_branch, f.branch_code,
            validIban, f.status, f.created_date, 1, 'NF-VERIFIED-2026'
        );
    }

    // إكمال المتقدمين ليصل المجموع بدقة إلى 108 متقدمين موزعين على كافة الحالات الـ 6 وكافة المشاريع الـ 5 والمسميات والورديات
    // التوزيع الإجمالي لـ 108 متقدمين:
    // قيد الانتظار: 18 | تمت المراجعة: 12 | مقبول: 14 | مرفوض: 8 | إنهاء إجراءات: 11 | مكتمل: 45
    const firstNames = [
        'سلطان', 'عبدالعزيز', 'فيصل', 'ماجد', 'نواف', 'ياسر', 'بدر', 'أحمد', 'عمر', 'منصور',
        'راشد', 'مشعل', 'بندر', 'ثامر', 'سامي', 'زياد', 'عادل', 'فارس', 'سلمان', 'طلال',
        'نايف', 'مهند', 'سعود', 'عبدالرحمن', 'إبراهيم', 'صالح', 'حمود', 'مقرن', 'متعب', 'سعد'
    ];
    const fatherNames = [
        'بن محمد', 'بن عبدالله', 'بن فهد', 'بن سعد', 'بن ناصر', 'بن خالد', 'بن سعيد', 'بن مسفر',
        'بن صالح', 'بن عثمان', 'بن حسن', 'بن سليمان', 'بن حمد', 'بن زيد', 'بن راشد', 'بن مبارك'
    ];
    const grandNames = [
        'بن عبدالعزيز', 'بن إبراهيم', 'بن منصور', 'بن سلطان', 'بن علي', 'بن عبدالرحمن', 'بن عوض', 'بن خلف',
        'بن سالم', 'بن فيصل', 'بن عائض', 'بن حمود'
    ];
    const familyNames = [
        'العتيبي', 'القحطاني', 'الدوسري', 'الشهري', 'الغامدي', 'الزهراني', 'المالكي', 'العنزي',
        'الشمري', 'المطيري', 'السبيعي', 'الحربي', 'الخالدي', 'البقمي', 'الرشيدي', 'اليامي',
        'الشهراني', 'العصيمي', 'السهلي', 'القرني'
    ];
    const projectsPool = [
        { name: 'مشروع مجمع وزارة الداخلية', loc: 'الرياض - الملز' },
        { name: 'مشروع المربع الجديد', loc: 'الرياض المربع الجديد' },
        { name: 'مشروع مركز الملك عبدالله المالي (KAFD)', loc: 'الرياض KAFD' },
        { name: 'مشروع هيئة السوق المالية', loc: 'الرياض - العليا' },
        { name: 'مشروع برج النصبان', loc: 'الرياض - طريق الملك فهد' }
    ];
    const jobsPool = ['ضابط أمن', 'مشرف أمن', 'مدير مشروع أمن', 'حارس أمن', 'مشغل غرفة عمليات'];
    const shiftsPool = ['صباحي', 'مسائي', 'ليلي'];
    const citiesPool = [
        { city: 'الرياض', dist: 'الياسمين', st: 'طريق الثمامة' },
        { city: 'الرياض', dist: 'الصحافة', st: 'طريق الملك فهد' },
        { city: 'الرياض', dist: 'النرجس', st: 'طريق أبو بكر الصديق' },
        { city: 'الرياض', dist: 'الملز', st: 'شارع صلاح الدين' },
        { city: 'الخرج', dist: 'الخالدية', st: 'طريق الملك عبدالله' },
        { city: 'الدمام', dist: 'الشاطئ', st: 'طريق الخليج' },
        { city: 'جدة', dist: 'الروضة', st: 'شارع صاري' },
        { city: 'القصيم', dist: 'الصفراء', st: 'طريق الملك عبدالعزيز' },
        { city: 'حائل', dist: 'صديان', st: 'طريق المدينة' },
        { city: 'أبها', dist: 'المنسك', st: 'طريق الملك فيصل' }
    ];
    const eduPool = [
        { level: 'ثانوي', inst: 'ثانوية الملك فهد النموذجية', deg: 'الثانوية العامة', date: '2019-06-01' },
        { level: 'دبلوم', inst: 'الكلية التقنية بالرياض', deg: 'دبلوم أمن وسلامة منشآت', date: '2021-05-20' },
        { level: 'بكالوريوس', inst: 'جامعة الإمام محمد بن سعود', deg: 'بكالوريوس علوم إدارية وأمنية', date: '2020-06-15' },
        { level: 'كفاءة متوسطة', inst: 'معهد التدريب الأمني المعتمد', deg: 'شهادة التأهيل الأمني الميداني', date: '2018-04-10' }
    ];
    const banksPool = [
        { name: 'مصرف الراجحي', branch: 'فرع العليا', code: '80' },
        { name: 'البنك الأهلي السعودي', branch: 'فرع الملز', code: '10' },
        { name: 'مصرف الإنماء', branch: 'فرع التخصصي', code: '55' },
        { name: 'بنك الرياض', branch: 'فرع الصحافة', code: '20' },
        { name: 'بنك البلاد', branch: 'فرع اليرموك', code: '15' }
    ];

    // توزيع الحالات لـ 100 متقدم إضافي (مع الـ 8 الرئيسيين ليصبح الإجمالي 108):
    // Featured (8): 2 قيد الانتظار, 1 تمت المراجعة, 0 مقبول, 2 مرفوض, 0 إنهاء إجراءات, 3 مكتمل
    // Additional (100): 16 قيد الانتظار, 11 تمت المراجعة, 14 مقبول, 6 مرفوض, 11 إنهاء إجراءات, 42 مكتمل
    const statusSchedule = [
        ...Array(16).fill('قيد الانتظار'),
        ...Array(11).fill('تمت المراجعة'),
        ...Array(14).fill('مقبول'),
        ...Array(6).fill('مرفوض'),
        ...Array(11).fill('إنهاء إجراءات'),
        ...Array(42).fill('مكتمل')
    ];

    for (let i = 1; i <= 100; i++) {
        const st = statusSchedule[i - 1];
        const fn = firstNames[(i * 3) % firstNames.length];
        const fa = fatherNames[(i * 5) % fatherNames.length];
        const gr = grandNames[(i * 7) % grandNames.length];
        const fam = familyNames[(i * 11) % familyNames.length];
        const fullName = `${fn} ${fa} ${gr} ${fam}`;

        const proj = projectsPool[i % projectsPool.length];
        const job = jobsPool[i % jobsPool.length];
        const shift = shiftsPool[i % shiftsPool.length];
        const locInfo = citiesPool[i % citiesPool.length];
        const edu = eduPool[i % eduPool.length];
        const bank = banksPool[i % banksPool.length];

        const idNum = makeValidNid(`10${String(3100000 + i * 137).slice(-7)}`);
        const validIban = makeValidIban(bank.code, `0006796080${String(10000000 + i * 97).slice(-8)}`);
        const month = (i % 3) + 8; // 8, 9, 10
        const day = (i % 27) + 1;
        const createdDate = `2026/${month}/${day}`;
        const startDate = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const birthYear = 1988 + (i % 15);
        const birthDate = `${birthYear}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 25) + 1).padStart(2, '0')}`;

        insertApp.run(
            `APP-2026${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}-${String(1000 + i)}`,
            fullName,
            'سعودي',
            idNum,
            locInfo.city,
            birthDate,
            'ذكر',
            (i % 2 === 0) ? 'متزوج' : 'أعزب',
            `05${(i % 2 === 0) ? '5' : '0'}${String(1000000 + i * 431).slice(-7)}`,
            `applicant.${1000 + i}@annasban.com.sa`,
            locInfo.city,
            locInfo.dist,
            locInfo.st,
            edu.level,
            edu.inst,
            edu.deg,
            edu.date,
            job,
            proj.name,
            proj.loc,
            shift,
            startDate,
            bank.name,
            bank.branch,
            String(10 + (i % 40)).padStart(3, '0'),
            validIban,
            st,
            createdDate,
            1,
            `NF-2026-${1000 + i}`
        );
    }

    console.log('✅ تم بذر 108 متقدمين بنجاح تام موزعين على كافة الحالات الـ 6 والمشاريع الـ 5.');
}

function repairDataIntegrity(db) {
    try {
        // 1. تصحيح أرقام الهوية الوطنية في جدول المستخدمين لتتوافق مع خوارزمية Luhn
        const userFixes = [
            { emp: 'ADM-001', nid: makeValidNid('101122334'), updateUsername: false },
            { emp: 'ADM-000', nid: makeValidNid('102233445'), updateUsername: false },
            { emp: 'EMP-1042', nid: '1089271645', updateUsername: true },
            { emp: 'EMP-1043', nid: makeValidNid('105439821'), updateUsername: true },
            { emp: 'EMP-1044', nid: makeValidNid('109823412'), updateUsername: true }
        ];
        const updateUserNid = db.prepare('UPDATE users SET national_id = ? WHERE employee_id = ?');
        const updateEmpNidAndUser = db.prepare('UPDATE users SET national_id = ?, username = ? WHERE employee_id = ?');
        for (const u of userFixes) {
            if (u.updateUsername) {
                updateEmpNidAndUser.run(u.nid, u.nid, u.emp);
            } else {
                updateUserNid.run(u.nid, u.emp);
            }
        }

        // 2. تصحيح راتب وعقد EMP-1043 وإضافة عقد ومسير وحضور EMP-1044 إن لم تكن موجودة
        const emp1043User = db.prepare("SELECT id FROM users WHERE employee_id = 'EMP-1043'").get();
        if (emp1043User) {
            db.prepare(`
                UPDATE contracts
                SET national_id = ?, basic_salary = 4000, housing_allowance = 1000, transport_allowance = 500, total_salary = 5500
                WHERE user_id = ? OR contract_number = 'ANS-2026-CT-1043'
            `).run(makeValidNid('105439821'), emp1043User.id);
        }

        const emp1044User = db.prepare("SELECT id, full_name, national_id, job_title FROM users WHERE employee_id = 'EMP-1044'").get();
        if (emp1044User) {
            const emp1044Contract = db.prepare('SELECT id FROM contracts WHERE user_id = ?').get(emp1044User.id);
            if (!emp1044Contract) {
                const c3Data = {
                    number: 'ANS-2026-CT-1044',
                    name: emp1044User.full_name,
                    nid: emp1044User.national_id,
                    job: emp1044User.job_title,
                    basic: 5000,
                    housing: 1250,
                    transport: 600,
                    total: 6850
                };
                const c3Hash = generateContractHash(c3Data);
                db.prepare(`
                    INSERT INTO contracts (contract_number, user_id, employee_name, national_id, job_title, basic_salary, housing_allowance, transport_allowance, total_salary, status, nafath_trans_id, nafath_verified_at, digital_signature_hash, contract_terms)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'signed', 'NF-99520-2026', '2026-02-10 11:05:00', ?, ?)
                `).run(
                    c3Data.number,
                    emp1044User.id,
                    c3Data.name,
                    c3Data.nid,
                    c3Data.job,
                    c3Data.basic,
                    c3Data.housing,
                    c3Data.transport,
                    c3Data.total,
                    c3Hash,
                    'عقد عمل موحد لإدارة غرفة العمليات المركزية والمراقبة الأمنية.'
                );
            }
        }

        // تحديث مسيرات الرواتب لـ EMP-1043 وإضافة مسيرات غنية (6 أشهر) وحضور متنوع لجميع الموظفين لتجربة الفرز
        db.prepare(`
            UPDATE pay_slips
            SET basic_salary = 4000, housing_allowance = 1000, gosi_deduction = 487.50,
                net_salary = CASE WHEN overtime_amount > 0 THEN 5312.50 ELSE 5012.50 END
            WHERE employee_id = 'EMP-1043' AND basic_salary < 4000
        `).run();

        const slipCount1042 = db.prepare("SELECT COUNT(*) as c FROM pay_slips WHERE employee_id = 'EMP-1042'").get().c;
        if (slipCount1042 < 5) {
            const insertPaySlip = db.prepare(`
                INSERT INTO pay_slips (employee_id, month_period, basic_salary, housing_allowance, transport_allowance, overtime_amount, gosi_deduction, penalties, net_salary, payment_status, payment_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            insertPaySlip.run('EMP-1042', 'أكتوبر 2026', 4500, 1125, 500, 600, 548.44, 0, 6176.56, 'paid', '2026-10-27');
            insertPaySlip.run('EMP-1042', 'يوليو 2026', 4500, 1125, 500, 250, 548.44, 0, 5826.56, 'paid', '2026-07-27');
            insertPaySlip.run('EMP-1042', 'يونيو 2026', 4500, 1125, 500, 0, 548.44, 0, 5576.56, 'paid', '2026-06-27');
            insertPaySlip.run('EMP-1042', 'مايو 2026', 4500, 1125, 500, 500, 548.44, 0, 6076.56, 'paid', '2026-05-27');

            insertPaySlip.run('EMP-1043', 'أكتوبر 2026', 4000, 1000, 500, 450, 487.50, 0, 5462.50, 'paid', '2026-10-27');
            insertPaySlip.run('EMP-1043', 'يوليو 2026', 4000, 1000, 500, 200, 487.50, 0, 5212.50, 'paid', '2026-07-27');
            insertPaySlip.run('EMP-1043', 'يونيو 2026', 4000, 1000, 500, 0, 487.50, 0, 5012.50, 'paid', '2026-06-27');

            insertPaySlip.run('EMP-1044', 'أكتوبر 2026', 5000, 1250, 600, 750, 609.38, 0, 6990.62, 'paid', '2026-10-27');
            insertPaySlip.run('EMP-1044', 'يوليو 2026', 5000, 1250, 600, 250, 609.38, 0, 6490.62, 'paid', '2026-07-27');
            insertPaySlip.run('EMP-1044', 'يونيو 2026', 5000, 1250, 600, 0, 609.38, 0, 6240.62, 'paid', '2026-06-27');
        }

        const attCount1042 = db.prepare("SELECT COUNT(*) as c FROM attendance WHERE employee_id = 'EMP-1042'").get().c;
        if (attCount1042 < 5) {
            const insertAtt = db.prepare(`
                INSERT INTO attendance (employee_id, date, shift_name, location_name, check_in, check_out, status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            insertAtt.run('EMP-1042', '2026-10-28', 'الوردية الصباحية (07:00 - 15:00)', 'مجمع وزارة الداخلية - البوابة 1', '06:52:00', '15:03:00', 'present', 'اشراف ميداني كامل');
            insertAtt.run('EMP-1042', '2026-10-25', 'الوردية المسائية (15:00 - 23:00)', 'مشروع المربع الجديد - مساندة', '14:55:00', '23:04:00', 'present', 'تغطية وردية مساندة إضافية');
            insertAtt.run('EMP-1042', '2026-10-24', 'الوردية الليلية (23:00 - 07:00)', 'مركز الملك عبدالله المالي (KAFD)', '22:50:00', '07:02:00', 'present', 'دورية تفتيش ليلية');
            insertAtt.run('EMP-1042', '2026-10-23', 'الوردية الصباحية (07:00 - 15:00)', 'مجمع وزارة الداخلية', '06:57:00', '15:01:00', 'present', 'انضباط تام');

            insertAtt.run('EMP-1043', '2026-10-28', 'الوردية الصباحية (07:00 - 15:00)', 'مركز KAFD - البوابة الشرقية', '06:54:00', '15:02:00', 'present', 'حضور منتظم');
            insertAtt.run('EMP-1043', '2026-10-25', 'الوردية الليلية (23:00 - 07:00)', 'مشروع المربع الجديد', '22:56:00', '07:01:00', 'present', 'مناوبة ليلية');

            insertAtt.run('EMP-1044', '2026-10-28', 'الوردية الصباحية (07:00 - 15:00)', 'برج النصبان - غرفة التحكم', '06:50:00', '15:00:00', 'present', 'مراقبة كاميرات CCTV');
            insertAtt.run('EMP-1044', '2026-10-25', 'الوردية المسائية (15:00 - 23:00)', 'هيئة السوق المالية', '14:52:00', '23:05:00', 'present', 'فحص أنظمة الإنذار');
        }

        // إضافة سجلات تدقيق أمني (PDPL Audit) متنوعة لتجربة الفرز في لوحة الرقابة
        const auditCount = db.prepare('SELECT COUNT(*) as c FROM audit_logs').get().c;
        if (auditCount < 10) {
            const insAudit = db.prepare(`
                INSERT INTO audit_logs (actor_name, actor_role, action_type, resource_accessed, details, ip_address, severity)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            insAudit.run('سلطان بن إبراهيم المنصور', 'hr', 'AUTH_LOGIN_SUCCESS', 'HR_PORTAL', 'تسجيل دخول ناجح للوحة إدارة الموارد البشرية', '10.20.1.14', 'INFO');
            insAudit.run('فهد بن عبد العزيز النصبان', 'admin', 'EXPORT_EMPLOYEE_DIRECTORY', 'EMPLOYEE_PII_TABLE', 'تصدير واستعراض دليل موظفي الحراسات الأمنية المعتمدين', '10.20.1.5', 'INFO');
            insAudit.run('راضي غازي فهاد الشمري', 'APPLICANT', 'NAFATH_VERIFIED_SUCCESS', 'NAFATH_ID_VERIFY', 'توثيق الهوية الوطنية عبر تطبيق نفاذ الوطني برقم معاملة NF-99281', '172.16.42.88', 'INFO');
            insAudit.run('عبد الرحمن بن خالد المطيري', 'employee', 'CONTRACT_SIGNED_PDPL', 'CONTRACT_ANS-2026-CT-1042', 'توقيع العقد الوظيفي الموحد رقمياً وتوليد ختم SHA-256', '172.16.42.19', 'INFO');
            insAudit.run('GUEST_UNKNOWN', 'ANONYMOUS', 'FAILED_LOGIN', 'HR_PORTAL', 'محاولة دخول فاشلة باسم مستخدم غير مصرح به', '185.93.12.44', 'WARNING');
            insAudit.run('سلطان بن إبراهيم المنصور', 'hr', 'UPDATE_APPLICATION_STATUS', 'APP-1788263667940-0IRVVG', 'تحديث حالة طلب التوظيف إلى مكتمل واعتماد المباشرة', '10.20.1.14', 'INFO');
            insAudit.run('ANTIGRAVITY_WAF', 'SYSTEM', 'BRUTE_FORCE_BLOCKED', '/api/auth/login', 'حظر عنوان IP مؤقتاً بعد 5 محاولات دخول خاطئة متتالية', '192.168.99.201', 'CRITICAL');
            insAudit.run('فيصل بن سعد القحطاني', 'employee', 'VIEW_PAYROLL', 'PAY_SLIP_EMP-1043', 'استعلام الموظف عن مسيرات الرواتب وحماية الأجور WPS', '172.16.10.51', 'INFO');
            insAudit.run('سلطان بن إبراهيم المنصور', 'hr', 'SET_COMMENCEMENT_DATE', 'APP-1788255779763-PTN0GD', 'تحديد تاريخ مباشرة العمل الميداني في مشروع KAFD', '10.20.1.14', 'INFO');
        }

        // 3. التحقق من تنوع حالات ومشاريع المتقدمين (إذا كانت الحالات مقبول أو إنهاء إجراءات = 0 أو الأسماء غير رباعية يتم تحديثها فوراً)
        const acceptedCount = db.prepare("SELECT COUNT(*) as c FROM applications WHERE status = 'مقبول'").get().c;
        const processingCount = db.prepare("SELECT COUNT(*) as c FROM applications WHERE status = 'إنهاء إجراءات'").get().c;
        const genericNamesCount = db.prepare("SELECT COUNT(*) as c FROM applications WHERE full_name LIKE 'حارس أمن معتمد%' OR full_name LIKE 'مرشح أمني%'").get().c;
        if (acceptedCount === 0 || processingCount === 0 || genericNamesCount > 0) {
            db.exec('DELETE FROM applications');
            seedApplicationsData(db);
        }

        // 4. تصحيح أرقام الهوية والآيبان في جدول المتقدمين (applications) مع ضمان عدم التكرار
        const apps = db.prepare('SELECT id, national_id, iban FROM applications ORDER BY id ASC').all();
        const existingNids = new Set(apps.map(x => x.national_id));
        const usedNids = new Set();
        const updateApp = db.prepare('UPDATE applications SET national_id = ?, iban = ? WHERE id = ?');
        for (const a of apps) {
            existingNids.delete(a.national_id);
            let prefix9 = String(a.national_id || '').replace(/\D/g, '').slice(0, 9);
            let validNid = a.national_id === '1127777488' ? '1127777488' : makeValidNid(prefix9);
            let saltIdx = 0;
            while (usedNids.has(validNid) || existingNids.has(validNid)) {
                saltIdx++;
                validNid = makeValidNid(`119${String(100000 + a.id * 10 + saltIdx).slice(-6)}`);
            }
            usedNids.add(validNid);

            const cleanIban = String(a.iban || '').replace(/\s+/g, '');
            let validIban = a.iban;
            if (cleanIban.length === 24) {
                const bankCode = cleanIban.slice(4, 6);
                const acct = cleanIban.slice(6);
                validIban = makeValidIban(bankCode, acct);
            } else {
                validIban = makeValidIban('80', `0006796080${String(10000000 + a.id).slice(-8)}`);
            }
            if (validNid !== a.national_id || validIban !== a.iban) {
                updateApp.run(validNid, validIban, a.id);
            }
        }
    } catch (err) {
        console.warn('⚠️ تنبيه أثناء فحص تكامل البيانات:', err.message);
    }
}

module.exports = {
    getDatabase,
    DB_PATH,
    makeValidNid,
    makeValidIban
};
