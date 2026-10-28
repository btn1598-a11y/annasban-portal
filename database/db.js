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
    seedApplicationsData(dbInstance);

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
        insertApp.run(
            f.app_id, f.full_name, f.nationality, f.national_id, f.id_issue_place, f.birth_date, f.gender, f.marital_status,
            f.phone, f.email, f.city, f.district, f.street, f.education_level, f.education_inst, f.degree_name, f.degree_date,
            f.job_title, f.project_name, f.work_location, f.shift, f.start_date, f.bank_name, f.bank_branch, f.branch_code,
            f.iban, f.status, f.created_date, 1, 'NF-VERIFIED-2026'
        );
    }

    // إكمال المتقدمين ليصل المجموع بدقة إلى 108 (20 انتظار، 85 مكتمل، 1 مراجعة، 2 مرفوض، 0 مقبول، 0 إجراءات)
    for (let i = 1; i <= 18; i++) {
        const idNum = `118800${String(1000 + i).padStart(4, '0')}`;
        insertApp.run(
            `APP-178955${String(100000 + i)}-P${i}`,
            `مرشح أمني متقدم ${i}`,
            'سعودي',
            idNum,
            'الرياض',
            '1998-05-10',
            'ذكر',
            'أعزب',
            `0550${String(100000 + i).slice(-6)}`,
            `candidate.p${i}@annasban.com.sa`,
            'الرياض',
            'الصحافة',
            'شارع العليا',
            'ثانوي',
            'ثانوية الرياض العامة',
            'الثانوية العامة',
            '2018-05-20',
            'ضابط أمن',
            'مشروع المربع الجديد',
            'الرياض المربع الجديد',
            'صباحي',
            '2026-09-01',
            'مصرف الراجحي',
            'فرع الرياض',
            '001',
            `SA55 8000 0679 6080 ${String(10000000 + i).slice(-8)}`,
            'قيد الانتظار',
            '2026/9/15',
            1,
            'NF-AUTO-VERIFIED'
        );
    }

    for (let i = 1; i <= 82; i++) {
        const idNum = `117700${String(2000 + i).padStart(4, '0')}`;
        insertApp.run(
            `APP-178826${String(100000 + i)}-C${i}`,
            `حارس أمن معتمد ${i}`,
            'سعودي',
            idNum,
            'الرياض',
            '1997-02-15',
            'ذكر',
            'متزوج',
            `0540${String(200000 + i).slice(-6)}`,
            `certified.guard${i}@annasban.com.sa`,
            'الرياض',
            'الياسمين',
            'طريق الثمامة',
            'ثانوي',
            'ثانوية الأندلس',
            'الثانوية العامة',
            '2017-06-01',
            'ضابط أمن',
            'مشروع مجمع وزارة الداخلية',
            'الرياض - الملز',
            'صباحي',
            '2026-02-20',
            'مصرف الراجحي',
            'فرع الرياض',
            '001',
            `SA55 8000 0679 6080 ${String(20000000 + i).slice(-8)}`,
            'مكتمل',
            '2026/9/1',
            1,
            'NF-AUTO-VERIFIED'
        );
    }

    console.log('✅ تم بذر 108 متقدمين بنجاح تام وفقاً للنسب والمقاييس المحددة.');
}

module.exports = {
    getDatabase,
    DB_PATH
};
