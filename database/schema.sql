-- ==============================================================================
-- شركة النصبان للحراسات الأمنية - هيكل قاعدة البيانات الآمن
-- متوافق مع نظام حماية البيانات الشخصية السعودي (PDPL) ونظام العمل
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- جدول المستخدمين (الموظفين ومسؤولي الموارد البشرية)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    national_id TEXT UNIQUE NOT NULL,
    employee_id TEXT UNIQUE,
    full_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'hr', 'employee')),
    phone TEXT NOT NULL,
    email TEXT,
    iban TEXT,
    department TEXT DEFAULT 'الحراسات الأمنية',
    job_title TEXT NOT NULL,
    assigned_location TEXT DEFAULT 'المركز الرئيسي - الرياض',
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'locked')),
    failed_attempts INTEGER DEFAULT 0,
    lockout_until TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول العقود الوظيفية
CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_number TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    national_id TEXT NOT NULL,
    job_title TEXT NOT NULL,
    basic_salary REAL NOT NULL,
    housing_allowance REAL NOT NULL,
    transport_allowance REAL NOT NULL,
    other_allowances REAL DEFAULT 0,
    total_salary REAL NOT NULL,
    contract_type TEXT NOT NULL DEFAULT 'محدد المدة (سنة قابلة للتجديد)',
    contract_period TEXT DEFAULT 'سنة ميلادية تبدأ من تاريخ مباشرة العمل',
    probation_period TEXT DEFAULT '90 يوماً طبقاً لنظام العمل السعودي',
    status TEXT DEFAULT 'signed' CHECK(status IN ('draft', 'pending_signature', 'signed', 'terminated')),
    nafath_trans_id TEXT,
    nafath_verified_at TEXT,
    digital_signature_hash TEXT NOT NULL,
    signature_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    signer_ip TEXT,
    contract_terms TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول مسيرات الرواتب والمستحقات
CREATE TABLE IF NOT EXISTS pay_slips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT NOT NULL,
    month_period TEXT NOT NULL,
    basic_salary REAL NOT NULL,
    housing_allowance REAL NOT NULL,
    transport_allowance REAL NOT NULL,
    overtime_amount REAL DEFAULT 0,
    gosi_deduction REAL NOT NULL,
    penalties REAL DEFAULT 0,
    net_salary REAL NOT NULL,
    payment_status TEXT DEFAULT 'paid' CHECK(payment_status IN ('pending', 'paid', 'hold')),
    payment_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول سجلات الحضور والورديات الميدانية
CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT NOT NULL,
    date DATE NOT NULL,
    shift_name TEXT NOT NULL,
    location_name TEXT NOT NULL,
    check_in TIME,
    check_out TIME,
    status TEXT DEFAULT 'present' CHECK(status IN ('present', 'absent', 'late', 'leave')),
    notes TEXT
);

-- جدول سجل التدقيق الأمني والامتثال لنظام حماية البيانات الشخصية (PDPL Audit Log)
-- يسجل كل وصول، قراءة، تعديل، أو استعلام عن البيانات الحساسة مع الهوية والـ IP
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id INTEGER,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action_type TEXT NOT NULL, -- e.g. AUTH_LOGIN, VIEW_PII, EXPORT_REPORT, SIGN_CONTRACT, FAILED_LOGIN
    resource_accessed TEXT NOT NULL,
    details TEXT,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    severity TEXT DEFAULT 'INFO' CHECK(severity IN ('INFO', 'WARNING', 'CRITICAL')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول الجلسات الآمنة مع مكافحة هجمات CSRF
CREATE TABLE IF NOT EXISTS active_sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf_token TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT,
    expires_at INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول طلبات التوظيف والمتقدمين (بوابة إدارة الموارد البشرية وتوليد العقود)
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
    iban TEXT DEFAULT 'SA5580000679608010356897',
    status TEXT DEFAULT 'قيد الانتظار' CHECK(status IN ('قيد الانتظار', 'تمت المراجعة', 'مقبول', 'مرفوض', 'إنهاء إجراءات', 'مكتمل')),
    applicant_signature TEXT,
    created_date TEXT DEFAULT '2026/9/1',
    nafath_verified INTEGER DEFAULT 1,
    nafath_trans_id TEXT DEFAULT 'NF-99281-2026',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- الفهارس لتحسين الأداء وسرعة الاستعلام الآمن
CREATE INDEX IF NOT EXISTS idx_users_national_id ON users(national_id);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);
CREATE INDEX IF NOT EXISTS idx_contracts_national_id ON contracts(national_id);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON contracts(contract_number);
CREATE INDEX IF NOT EXISTS idx_pay_slips_employee ON pay_slips(employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_app_id ON applications(app_id);
