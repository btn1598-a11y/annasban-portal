/**
 * منظومة إدارة المتقدمين والتوظيف وتوليد العقود والوثائق الرسمية (11 وثيقة معتمدة)
 * شركة النصبان للحراسات الأمنية (3S Specialized Security Service)
 */

let applicationsCache = [];
let activeStatusFilter = 'الكل';
const HR_API_BASE = (typeof API_BASE !== 'undefined') ? API_BASE : ((window.location.protocol.startsWith('http')) ? '' : 'http://localhost:3000');

function getLogoSrc() {
    const img = document.querySelector('.brand-wrapper img');
    return (img && img.src) ? img.src : 'logo.jpg';
}

function switchHrSubTab(tab) {
    const btnApps = document.getElementById('btn-subtab-apps');
    const btnAudit = document.getElementById('btn-subtab-audit');
    const contentApps = document.getElementById('subtab-content-apps');
    const contentAudit = document.getElementById('subtab-content-audit');

    if (tab === 'apps') {
        if (btnApps) btnApps.className = 'btn-primary-red';
        if (btnAudit) btnAudit.className = 'btn-secondary-clean';
        if (contentApps) contentApps.style.display = 'block';
        if (contentAudit) contentAudit.style.display = 'none';
        loadApplications();
    } else {
        if (btnAudit) btnAudit.className = 'btn-primary-red';
        if (btnApps) btnApps.className = 'btn-secondary-clean';
        if (contentAudit) contentAudit.style.display = 'block';
        if (contentApps) contentApps.style.display = 'none';
        if (typeof loadLiveAuditLogs === 'function') loadLiveAuditLogs();
    }
    if (window.lucide) lucide.createIcons();
}

async function loadApplications(status, search) {
    const currentStatus = status !== undefined ? status : activeStatusFilter;
    const currentSearch = search !== undefined ? search : (document.getElementById('app_search_input')?.value || '');
    const listContainer = document.getElementById('hr_applicants_list');

    try {
        const params = new URLSearchParams();
        if (currentStatus && currentStatus !== 'الكل') params.append('status', currentStatus);
        if (currentSearch) params.append('search', currentSearch);

        const res = await fetch(`${HR_API_BASE}/api/applications?${params.toString()}`);
        if (res.ok) {
            const json = await res.json();
            const { metrics, applications } = json.data;
            applicationsCache = applications || [];

            if (metrics) {
                const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
                setTxt('stat_total', metrics.total);
                setTxt('stat_pending', metrics.pending);
                setTxt('stat_reviewed', metrics.reviewed);
                setTxt('stat_accepted', metrics.accepted);
                setTxt('stat_rejected', metrics.rejected);
                setTxt('stat_processing', metrics.processing);
                setTxt('stat_completed', metrics.completed);
            }

            renderApplicationsList();
            return;
        }
    } catch (err) {
        console.error('Error loading applications:', err);
    }

    renderApplicationsList();
}

function filterApplicationsByStatus(status, element) {
    activeStatusFilter = status;
    document.querySelectorAll('.hr-status-card').forEach(c => c.classList.remove('active'));
    if (element) element.classList.add('active');
    loadApplications(status, document.getElementById('app_search_input')?.value);
}

function handleApplicationSearch() {
    const query = document.getElementById('app_search_input')?.value.trim();
    loadApplications(activeStatusFilter, query);
}

function getStatusPillClass(status) {
    switch (status) {
        case 'قيد الانتظار': return 'pill-pending';
        case 'تمت المراجعة': return 'pill-reviewed';
        case 'مقبول': return 'pill-accepted';
        case 'مرفوض': return 'pill-rejected';
        case 'إنهاء إجراءات': return 'pill-processing';
        case 'مكتمل': return 'pill-completed';
        default: return 'pill-pending';
    }
}

function renderApplicationsList() {
    const listContainer = document.getElementById('hr_applicants_list');
    if (!listContainer) return;

    if (applicationsCache.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align:center; padding:40px; color:var(--text-muted); background:var(--bg-card); border-radius:var(--radius-sm); border:1px solid var(--border-color);">
                <i data-lucide="inbox" style="width:40px; height:40px; margin-bottom:10px; opacity:0.6;"></i>
                <h4 style="font-size:16px; font-weight:800; margin-bottom:4px;">لا توجد طلبات توظيف مطابقة</h4>
                <p style="font-size:12px; margin:0;">جرّب اختيار تصنيف آخر أو مسح عبارة البحث</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    listContainer.innerHTML = applicationsCache.map(app => {
        const initial = (app.full_name || 'ع').trim().charAt(0);
        const pillClass = getStatusPillClass(app.status);
        const dateDisplay = app.created_date || '2026/9/1';

        return `
            <div class="applicant-item" id="app_item_${app.id}">
                <div class="applicant-header" onclick="toggleApplicantAccordion(${app.id})">
                    <div class="applicant-meta-right">
                        <div class="applicant-avatar">${initial}</div>
                        <div class="applicant-name-box">
                            <h4>${app.full_name}</h4>
                            <p>${app.app_id} · ${app.job_title} · ${app.phone}</p>
                        </div>
                    </div>
                    <div class="applicant-meta-left">
                        <span class="applicant-date-badge">${dateDisplay}</span>
                        <span class="applicant-status-pill ${pillClass}" id="app_pill_${app.id}">
                            ${app.status === 'قيد الانتظار' ? '⏱️ ' : (app.status === 'مكتمل' ? '✓ ' : '')}${app.status}
                        </span>
                        <i data-lucide="chevron-down" id="app_chevron_${app.id}" style="width:18px; height:18px; color:var(--text-muted); transition:transform 0.2s;"></i>
                    </div>
                </div>

                <div class="applicant-body" id="app_body_${app.id}">
                    <!-- 1. البيانات الشخصية -->
                    <div class="section-box-title">
                        <i data-lucide="user"></i> البيانات الشخصية
                    </div>
                    <div class="details-grid">
                        <div class="detail-item"><span class="label">الاسم الكامل</span><span class="val">${app.full_name}</span></div>
                        <div class="detail-item"><span class="label">الجنسية</span><span class="val">${app.nationality || 'سعودي'}</span></div>
                        <div class="detail-item"><span class="label">رقم الهوية</span><span class="val" style="font-family:monospace;">${app.national_id}</span></div>
                        <div class="detail-item"><span class="label">مكان الإصدار</span><span class="val">${app.id_issue_place || 'الرياض'}</span></div>
                        <div class="detail-item"><span class="label">تاريخ الميلاد</span><span class="val">${app.birth_date || '1999-11-01'}</span></div>
                        <div class="detail-item"><span class="label">الجنس</span><span class="val">${app.gender || 'ذكر'}</span></div>
                        <div class="detail-item"><span class="label">الحالة الاجتماعية</span><span class="val">${app.marital_status || 'أعزب'}</span></div>
                        <div class="detail-item"><span class="label">رقم الجوال</span><span class="val" style="direction:ltr; text-align:right;">${app.phone}</span></div>
                        <div class="detail-item"><span class="label">البريد الإلكتروني</span><span class="val">${app.email || '-'}</span></div>
                        <div class="detail-item"><span class="label">المدينة</span><span class="val">${app.city || 'الرياض'}</span></div>
                        <div class="detail-item"><span class="label">الحي</span><span class="val">${app.district || 'عثمر القديم'}</span></div>
                        <div class="detail-item"><span class="label">الشارع</span><span class="val">${app.street || 'الر'}</span></div>
                    </div>

                    <!-- 2. المؤهل العلمي -->
                    <div class="section-box-title">
                        <i data-lucide="graduation-cap"></i> المؤهل العلمي
                    </div>
                    <div class="details-grid">
                        <div class="detail-item"><span class="label">المؤهل</span><span class="val">${app.education_level || 'ثانوي'}</span></div>
                        <div class="detail-item"><span class="label">المؤسسة التعليمية</span><span class="val">${app.education_inst || 'ثانوية قتيبه'}</span></div>
                        <div class="detail-item"><span class="label">اسم الشهادة</span><span class="val">${app.degree_name || 'الثانوية'}</span></div>
                        <div class="detail-item"><span class="label">تاريخ الشهادة</span><span class="val">${app.degree_date || '2019-09-01'}</span></div>
                    </div>

                    <!-- 3. بيانات الوظيفة -->
                    <div class="section-box-title">
                        <i data-lucide="briefcase"></i> بيانات الوظيفة
                    </div>
                    <div class="details-grid">
                        <div class="detail-item"><span class="label">المسمى الوظيفي</span><span class="val">${app.job_title}</span></div>
                        <div class="detail-item"><span class="label">المشروع</span><span class="val">${app.project_name || 'مشروع المربع الجديد'}</span></div>
                        <div class="detail-item"><span class="label">تاريخ المباشرة</span><span class="val" id="disp_start_date_${app.id}">${app.start_date || '2026-02-20'}</span></div>
                        <div class="detail-item"><span class="label">موقع العمل</span><span class="val">${app.work_location || 'الرياض المربع الجديد'}</span></div>
                        <div class="detail-item"><span class="label">الوردية</span><span class="val">${app.shift || 'صباحي'}</span></div>
                    </div>

                    <!-- 4. الحساب البنكي -->
                    <div class="section-box-title">
                        <i data-lucide="credit-card"></i> الحساب البنكي
                    </div>
                    <div class="details-grid">
                        <div class="detail-item"><span class="label">اسم البنك</span><span class="val">${app.bank_name || 'بنك الراجحي'}</span></div>
                        <div class="detail-item"><span class="label">اسم الفرع</span><span class="val">${app.bank_branch || 'فرع الرياض'}</span></div>
                        <div class="detail-item"><span class="label">رقم الفرع</span><span class="val">${app.branch_code || '001'}</span></div>
                        <div class="detail-item"><span class="label">رقم الآيبان (IBAN)</span><span class="val" style="direction:ltr; text-align:right; font-family:monospace;">${app.iban || 'SA55 8000 0679 6080 1035 6897'}</span></div>
                    </div>

                    <!-- 5. المرفقات الحكومية -->
                    <div class="section-box-title">
                        <i data-lucide="paperclip"></i> المرفقات
                    </div>
                    <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:10px 14px; margin-bottom:18px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:7px 0; border-bottom:1px solid var(--border-color);">
                            <span style="font-size:13px; font-weight:700;">الهوية الوطنية</span>
                            <button type="button" class="access-btn" onclick="viewAttachment('الهوية الوطنية', 'national_id', ${app.id})" style="background:var(--primary); color:#fff; border-radius:4px; padding:3px 12px; font-size:11.5px; font-weight:700;">عرض</button>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:7px 0; border-bottom:1px solid var(--border-color);">
                            <span style="font-size:13px; font-weight:700;">العنوان الوطني</span>
                            <button type="button" class="access-btn" onclick="viewAttachment('العنوان الوطني (سبل SPL)', 'national_address', ${app.id})" style="background:var(--primary); color:#fff; border-radius:4px; padding:3px 12px; font-size:11.5px; font-weight:700;">عرض</button>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:7px 0; border-bottom:1px solid var(--border-color);">
                            <span style="font-size:13px; font-weight:700;">شهادة الآيبان البنكي</span>
                            <button type="button" class="access-btn" onclick="viewAttachment('شهادة الآيبان البنكي', 'iban', ${app.id})" style="background:var(--primary); color:#fff; border-radius:4px; padding:3px 12px; font-size:11.5px; font-weight:700;">عرض</button>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:7px 0; border-bottom:1px solid var(--border-color);">
                            <span style="font-size:13px; font-weight:700;">المؤهل العلمي</span>
                            <button type="button" class="access-btn" onclick="viewAttachment('المؤهل العلمي', 'education', ${app.id})" style="background:var(--primary); color:#fff; border-radius:4px; padding:3px 12px; font-size:11.5px; font-weight:700;">عرض</button>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:7px 0;">
                            <span style="font-size:13px; font-weight:700;">شهادة خلو السوابق</span>
                            <button type="button" class="access-btn" onclick="viewAttachment('شهادة خلو السوابق الجنائية (أمن)', 'criminal', ${app.id})" style="background:var(--primary); color:#fff; border-radius:4px; padding:3px 12px; font-size:11.5px; font-weight:700;">عرض</button>
                        </div>
                    </div>

                    <!-- 6. تحديث حالة الطلب -->
                    <div class="section-box-title" style="margin-top:20px;">
                        <i data-lucide="check-square"></i> تحديث حالة الطلب
                    </div>
                    <div class="status-actions-bar">
                        <button type="button" class="btn-status-action" style="background:#b45309;" onclick="updateAppStatus(${app.id}, 'قيد الانتظار')">قيد الانتظار</button>
                        <button type="button" class="btn-status-action" style="background:#1e40af;" onclick="updateAppStatus(${app.id}, 'تمت المراجعة')">تمت المراجعة</button>
                        <button type="button" class="btn-status-action" style="background:#065f46;" onclick="updateAppStatus(${app.id}, 'مقبول')">مقبول</button>
                        <button type="button" class="btn-status-action" style="background:#7f1d1d;" onclick="updateAppStatus(${app.id}, 'مرفوض')">مرفوض</button>
                        <button type="button" class="btn-status-action" style="background:#3730a3;" onclick="updateAppStatus(${app.id}, 'إنهاء إجراءات')">إنهاء إجراءات</button>
                        <button type="button" class="btn-status-action" style="background:#047857;" onclick="updateAppStatus(${app.id}, 'مكتمل')">مكتمل</button>
                    </div>

                    <!-- 7. توليد عقد العمل والوثائق الرسمية -->
                    <div class="contract-gen-box">
                        <h4 style="font-size:15px; font-weight:800; color:var(--text-heading); margin:0 0 14px 0;">
                            توليد عقد العمل والوثائق الرسمية للشركة
                        </h4>
                        
                        <div style="display:flex; align-items:center; gap:14px; margin-bottom:14px; flex-wrap:wrap;">
                            <label style="font-size:13px; font-weight:700; color:var(--text-heading); margin:0;">
                                تاريخ المباشرة: <span style="color:var(--danger); font-size:11.5px;">* مطلوب قبل التحميل</span>
                            </label>
                            <input type="date" id="start_date_${app.id}" class="form-control" value="${app.start_date || '2026-02-20'}" style="width:200px; padding:6px 10px; font-size:13.5px;" onchange="saveCommenceDate(${app.id}, this.value)">
                        </div>

                        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:12px;">
                            <button type="button" class="btn-primary-red" onclick="generateOfficialDocs(${app.id}, 'all')" style="font-size:14px; padding:9px 20px;">
                                <i data-lucide="download"></i> تحميل الحزمة كاملة (11/11)
                            </button>
                            <button type="button" class="btn-secondary-clean" onclick="toggleDocsSelector(${app.id})" style="font-size:13.5px; padding:9px 18px;">
                                <i data-lucide="settings"></i> اختيار النماذج <i data-lucide="chevron-down"></i>
                            </button>
                        </div>

                        <div id="docs_selector_${app.id}" style="display:none; margin-top:12px; border-top:1px dashed var(--border-color); padding-top:14px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                                <span style="font-size:12.5px; font-weight:700; color:var(--text-muted);">اختر النماذج المراد تضمينها في PDF:</span>
                                <div style="font-size:12px;">
                                    <a href="javascript:void(0)" onclick="toggleAllCheckboxes(${app.id}, true)" style="color:var(--primary); font-weight:700; margin-left:10px;">تحديد الكل</a>
                                    <a href="javascript:void(0)" onclick="toggleAllCheckboxes(${app.id}, false)" style="color:var(--danger); font-weight:700;">إلغاء الكل</a>
                                </div>
                            </div>
                            <div class="docs-checklist-grid">
                                <label class="doc-check-item"><input type="checkbox" class="cb-doc-${app.id}" value="commence" checked> مباشرة عمل</label>
                                <label class="doc-check-item"><input type="checkbox" class="cb-doc-${app.id}" value="checklist" checked> قائمة ملف الموظف</label>
                                <label class="doc-check-item"><input type="checkbox" class="cb-doc-${app.id}" value="app_form" checked> استمارة طلب وظيفة + الإقرار</label>
                                <label class="doc-check-item"><input type="checkbox" class="cb-doc-${app.id}" value="contract_pledge" checked> ملحق بالعقد (تعهد حارس أمن)</label>
                                <label class="doc-check-item"><input type="checkbox" class="cb-doc-${app.id}" value="security_pledge" checked> تعهد وإقرار للحراسات الأمنية</label>
                                <label class="doc-check-item"><input type="checkbox" class="cb-doc-${app.id}" value="contract" checked> عقد عمل لمهمة محددة</label>
                                <label class="doc-check-item"><input type="checkbox" class="cb-doc-${app.id}" value="bank_decl" checked> إقرار بالحساب البنكي</label>
                                <label class="doc-check-item"><input type="checkbox" class="cb-doc-${app.id}" value="site_rules" checked> تعليمات الموقع</label>
                                <label class="doc-check-item"><input type="checkbox" class="cb-doc-${app.id}" value="duties" checked> مهام وواجبات رجال الأمن</label>
                                <label class="doc-check-item"><input type="checkbox" class="cb-doc-${app.id}" value="penalties" checked> لائحة الجزاءات</label>
                                <label class="doc-check-item"><input type="checkbox" class="cb-doc-${app.id}" value="medgulf" checked> الإفصاح الطبي - ميدغلف</label>
                            </div>
                            <button type="button" class="btn-primary-red" onclick="generateOfficialDocs(${app.id}, 'selected')" style="font-size:13px; padding:7px 16px; margin-top:8px;">
                                <i data-lucide="printer"></i> معاينة وطباعة الوثائق المحددة
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

function toggleApplicantAccordion(appId) {
    const body = document.getElementById(`app_body_${appId}`);
    const chevron = document.getElementById(`app_chevron_${appId}`);
    if (!body) return;
    const isOpen = body.classList.contains('open');
    if (isOpen) {
        body.classList.remove('open');
        if (chevron) chevron.style.transform = 'rotate(0deg)';
    } else {
        body.classList.add('open');
        if (chevron) chevron.style.transform = 'rotate(180deg)';
    }
}

async function updateAppStatus(appId, newStatus) {
    try {
        const res = await fetch(`${HR_API_BASE}/api/applications/${appId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
            const pill = document.getElementById(`app_pill_${appId}`);
            if (pill) {
                pill.className = `applicant-status-pill ${getStatusPillClass(newStatus)}`;
                pill.innerText = `${newStatus === 'قيد الانتظار' ? '⏱️ ' : (newStatus === 'مكتمل' ? '✓ ' : '')}${newStatus}`;
            }
            const item = applicationsCache.find(a => a.id === appId);
            if (item) item.status = newStatus;
            loadApplications();
        }
    } catch (err) {
        console.error(err);
    }
}

async function saveCommenceDate(appId, newDate) {
    try {
        await fetch(`${HR_API_BASE}/api/applications/${appId}/start-date`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate: newDate })
        });
        const disp = document.getElementById(`disp_start_date_${appId}`);
        if (disp) disp.innerText = newDate;
        const item = applicationsCache.find(a => a.id === appId);
        if (item) item.start_date = newDate;
    } catch (err) {}
}

function toggleDocsSelector(appId) {
    const sel = document.getElementById(`docs_selector_${appId}`);
    if (!sel) return;
    sel.style.display = (sel.style.display === 'none' || !sel.style.display) ? 'block' : 'none';
}

function toggleAllCheckboxes(appId, checked) {
    document.querySelectorAll(`.cb-doc-${appId}`).forEach(cb => cb.checked = checked);
}

function closeOfficialDocsModal() {
    const m = document.getElementById('official-documents-modal');
    if (m) m.style.display = 'none';
}

function closeAttachmentModal() {
    const m = document.getElementById('attachmentModal');
    if (m) m.style.display = 'none';
}

function getDayArabicName(dateStr) {
    if (!dateStr) return 'الأحد';
    try {
        const d = new Date(dateStr);
        const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        return days[d.getDay()] || 'الأحد';
    } catch (e) {
        return 'الأحد';
    }
}

function viewAttachment(title, type, appId) {
    const app = applicationsCache.find(a => a.id === appId) || {
        full_name: 'راضي غازي فهاد الشمري',
        national_id: '1127777488',
        city: 'القاعد',
        district: 'عثمر القديم',
        street: 'الر',
        phone: '0559889150',
        bank_name: 'بنك الراجحي',
        iban: 'SA55 8000 0679 6080 1035 6897',
        education_level: 'ثانوي',
        education_inst: 'ثانوية قتيبه'
    };

    const modalTitle = document.getElementById('attach_modal_title');
    const modalBody = document.getElementById('attach_modal_body');
    if (modalTitle) modalTitle.innerText = `معاينة: ${title}`;

    let html = '';
    if (type === 'national_id') {
        html = `
            <div style="background:linear-gradient(135deg, #064e3b, #047857); color:#fff; border-radius:12px; padding:20px; box-shadow:0 6px 18px rgba(0,0,0,0.2); font-family:sans-serif;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.25); padding-bottom:10px; margin-bottom:14px;">
                    <div>
                        <div style="font-size:11px; opacity:0.85;">المملكة العربية السعودية • وزارة الداخلية</div>
                        <div style="font-size:15px; font-weight:800;">الهوية الوطنية الرقمية (أبشر)</div>
                    </div>
                    <div style="width:38px; height:38px; border-radius:50%; background:rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center; font-size:18px;">🇸🇦</div>
                </div>
                <div style="display:flex; gap:16px; align-items:center;">
                    <div style="width:72px; height:88px; background:rgba(255,255,255,0.2); border-radius:8px; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:10px; color:#fff;">
                        <span style="font-size:24px;">👤</span>
                        <span>صورة معتمدة</span>
                    </div>
                    <div style="font-size:12.5px; line-height:1.7;">
                        <div>الاسم: <strong>${app.full_name}</strong></div>
                        <div>رقم الهوية: <strong style="font-family:monospace; font-size:14px;">${app.national_id}</strong></div>
                        <div>تاريخ الميلاد: <strong>${app.birth_date || '1999-11-01'}</strong></div>
                        <div>مكان الإصدار: <strong>${app.id_issue_place || 'الرياض'}</strong></div>
                    </div>
                </div>
                <div style="margin-top:14px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.2); display:flex; justify-content:space-between; align-items:center; font-size:10.5px;">
                    <span>الحالة: <strong style="color:#a7f3d0;">سارية المفعول ومطابقة بنفاذ</strong></span>
                    <span style="font-family:monospace;">||| | |||| | |||||||</span>
                </div>
            </div>
        `;
    } else if (type === 'national_address') {
        html = `
            <div style="background:#fff; color:#0f172a; border:2px solid #0284c7; border-radius:10px; padding:20px; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #0284c7; padding-bottom:8px; margin-bottom:12px;">
                    <div>
                        <strong style="color:#0284c7; font-size:15px;">إثبات العنوان الوطني الرسمي (سبل SPL)</strong>
                        <div style="font-size:11px; color:#64748b;">مؤسسة البريد السعودي</div>
                    </div>
                    <span style="background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:4px; font-weight:700; font-size:11px;">عنوان موثق</span>
                </div>
                <div style="font-size:13px; line-height:1.8;">
                    <div>المستفيد: <strong>${app.full_name}</strong></div>
                    <div>المدينة: <strong>${app.city || 'الرياض'}</strong> | الحي: <strong>${app.district || 'عثمر القديم'}</strong></div>
                    <div>الشارع: <strong>${app.street || 'الر'}</strong></div>
                    <div>رقم المبنى: <strong>7231</strong> | الرقم الإضافي: <strong>2819</strong></div>
                    <div>الرمز البريدي: <strong>12345</strong></div>
                </div>
            </div>
        `;
    } else if (type === 'iban') {
        html = `
            <div style="background:#fff; color:#0f172a; border:2px solid #059669; border-radius:10px; padding:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #059669; padding-bottom:8px; margin-bottom:12px;">
                    <div>
                        <strong style="color:#059669; font-size:15px;">شهادة تأكيد الحساب البنكي والآيبان</strong>
                        <div style="font-size:11px; color:#64748b;">${app.bank_name || 'مصرف الراجحي'}</div>
                    </div>
                    <span style="background:#dcfce7; color:#15803d; padding:3px 8px; border-radius:4px; font-weight:700; font-size:11px;">حساب نشط ومعتمد</span>
                </div>
                <div style="font-size:13px; line-height:1.9;">
                    <div>اسم صاحب الحساب: <strong>${app.full_name}</strong></div>
                    <div>رقم الهوية: <strong>${app.national_id}</strong></div>
                    <div>رقم الحساب الدولي (IBAN):</div>
                    <div style="font-family:monospace; font-size:15px; font-weight:800; background:#f1f5f9; padding:8px 12px; border-radius:6px; direction:ltr; text-align:center; color:#0f172a;">
                        ${app.iban || 'SA55 8000 0679 6080 1035 6897'}
                    </div>
                </div>
            </div>
        `;
    } else if (type === 'education') {
        html = `
            <div style="background:#fff; color:#0f172a; border:2px solid #d97706; border-radius:10px; padding:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #d97706; padding-bottom:8px; margin-bottom:12px;">
                    <div>
                        <strong style="color:#d97706; font-size:15px;">وثيقة المؤهل العلمي</strong>
                        <div style="font-size:11px; color:#64748b;">وزارة التعليم بالمملكة العربية السعودية</div>
                    </div>
                    <span style="background:#fef3c7; color:#b45309; padding:3px 8px; border-radius:4px; font-weight:700; font-size:11px;">مصدق ومعتمد</span>
                </div>
                <div style="font-size:13px; line-height:1.8;">
                    <div>اسم الطالب: <strong>${app.full_name}</strong></div>
                    <div>المؤهل: <strong>${app.education_level || 'ثانوي'}</strong> (${app.degree_name || 'الثانوية العامة'})</div>
                    <div>المؤسسة التعليمية: <strong>${app.education_inst || 'ثانوية قتيبه'}</strong></div>
                    <div>تاريخ التخرج: <strong>${app.degree_date || '2019-09-01'}</strong></div>
                    <div>التقدير العام: <strong>جيد جداً (88.4%)</strong></div>
                </div>
            </div>
        `;
    } else {
        html = `
            <div style="background:#fff; color:#0f172a; border:2px solid #4338ca; border-radius:10px; padding:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #4338ca; padding-bottom:8px; margin-bottom:12px;">
                    <div>
                        <strong style="color:#4338ca; font-size:15px;">شهادة خلو السوابق الجنائية (أمن)</strong>
                        <div style="font-size:11px; color:#64748b;">الأمن العام • الأدلة الجنائية</div>
                    </div>
                    <span style="background:#e0e7ff; color:#3730a3; padding:3px 8px; border-radius:4px; font-weight:700; font-size:11px;">سجل جنائي نظيف</span>
                </div>
                <div style="font-size:13px; line-height:1.8;">
                    <div>المواطن: <strong>${app.full_name}</strong></div>
                    <div>رقم الهوية: <strong>${app.national_id}</strong></div>
                    <div style="margin:14px 0; background:#f0fdf4; border:1px solid #86efac; color:#166534; padding:10px; border-radius:6px; font-weight:700;">
                        ✓ تشهد إدارة الأدلة الجنائية بأن صاحب الهوية أعلاه خالٍ تماماً من أي سوابق جنائية أو قيود أمنية، ومصرح له بالعمل في الحراسات الأمنية المدنية.
                    </div>
                </div>
            </div>
        `;
    }

    if (modalBody) modalBody.innerHTML = html;
    const modal = document.getElementById('attachmentModal');
    if (modal) modal.style.display = 'flex';
}

// ====================================================================
// محرك توليد حزمة الوثائق الرسمية الـ 11 (11 Official Forms Engine)
// ====================================================================

function renderDocHeader(app, ref, date) {
    return `
        <div class="official-header">
            <div style="display:flex; align-items:center; gap:12px;">
                <img src="${getLogoSrc()}" alt="3S Logo" style="height:52px; object-fit:contain;">
                <div style="font-size:11px; font-weight:800; color:#c8102e; line-height:1.2;">
                    <div>شركة النصبان للحراسات الأمنية</div>
                    <div style="font-size:9.5px; color:#475569;">3S specialized security service</div>
                </div>
            </div>
            <div style="text-align:left; font-size:11px; color:#64748b; line-height:1.4;">
                <div>الرقم المرجعي: <strong style="color:#0f172a;">${ref}</strong></div>
                <div>التاريخ: <strong style="color:#0f172a;">${date}</strong></div>
            </div>
        </div>
    `;
}

function renderDocFooter(pageNum) {
    return `
        <div class="official-footer">
            <div style="display:flex; align-items:center; gap:8px;">
                <img src="${getLogoSrc()}" alt="3S Logo" style="height:26px; object-fit:contain;">
                <span style="font-weight:700; color:#c8102e; font-size:11px;">3S</span>
            </div>
            <div style="text-align:center; flex:1; padding:0 15px; font-size:9px; color:#64748b; line-height:1.3;">
                الإدارة العامة: الرياض - حي النموذجية - س.ت: 1010138495 - ص.ب: 12734 الرياض - غرفة تجارية: 194872<br>
                هاتف: 920012225 - إدارة التشغيل: 0555977053 - خدمة العملاء: 0555737701 - info@3s-secrity.net - www.3s-security.net
            </div>
            <div style="text-align:left; font-size:10px; font-weight:700; color:#475569;">
                صفحة ${pageNum}
            </div>
        </div>
    `;
}

function renderCandidateSig(app) {
    if (app.applicant_signature) {
        return `<img src="${app.applicant_signature}" alt="توقيع المرشح" style="max-height:48px; max-width:160px; object-fit:contain;">`;
    }
    return `
        <div style="font-size:19px; font-weight:800; color:#0f2b5c; font-family:serif; letter-spacing:0.5px;">${app.full_name}</div>
        <div style="font-size:10px; color:#059669; font-weight:700;">✓ توقيع رقمي معتمد برقم الهوية</div>
    `;
}

function renderCompanyStamp() {
    return `
        <div style="position:relative; display:inline-block; text-align:center;">
            <div style="font-size:13.5px; font-weight:800; color:#1e293b; margin-bottom:4px;">عبدالرحمن الحاتم</div>
            <svg width="110" height="38" viewBox="0 0 140 45">
                <path d="M10,35 Q40,5 70,25 T130,15" fill="none" stroke="#1e293b" stroke-width="2.5" />
                <path d="M45,10 Q65,40 85,20" fill="none" stroke="#1e293b" stroke-width="2" />
            </svg>
            <div style="position:absolute; top:-12px; right:-28px; border:2px dashed #c8102e; border-radius:50%; width:54px; height:54px; display:flex; align-items:center; justify-content:center; color:#c8102e; font-size:8px; font-weight:900; transform:rotate(-15deg); line-height:1.1; background:rgba(254,242,242,0.6);">
                النصبان<br>3S<br>معتمد
            </div>
        </div>
    `;
}

function generateOfficialDocs(appId, mode) {
    const app = applicationsCache.find(a => a.id === appId) || {
        full_name: 'راضي غازي فهاد الشمري',
        national_id: '1127777488',
        phone: '0559889150',
        city: 'القاعد',
        district: 'عثمر القديم',
        street: 'الر',
        job_title: 'ضابط أمن',
        project_name: 'مشروع المربع الجديد',
        work_location: 'الرياض المربع الجديد',
        shift: 'صباحي',
        start_date: '2026-02-20',
        bank_name: 'بنك الراجحي',
        bank_branch: 'فرع الرياض',
        branch_code: '001',
        iban: 'SA55 8000 0679 6080 1035 6897',
        app_id: 'APP-1788263667940-0IRVVG'
    };

    const dateInput = document.getElementById(`start_date_${appId}`);
    const commenceDate = (dateInput && dateInput.value) ? dateInput.value : (app.start_date || '2026-02-20');
    const dayName = getDayArabicName(commenceDate);

    // Filter selected docs
    let selectedDocs = [];
    if (mode === 'all') {
        selectedDocs = ['commence', 'checklist', 'app_form', 'contract_pledge', 'security_pledge', 'contract', 'bank_decl', 'site_rules', 'duties', 'penalties', 'medgulf'];
    } else {
        document.querySelectorAll(`.cb-doc-${appId}:checked`).forEach(cb => selectedDocs.push(cb.value));
        if (selectedDocs.length === 0) {
            alert('الرجاء اختيار نموذج واحد على الأقل للمعاينة والطباعة.');
            return;
        }
    }

    let pagesHtml = '';
    let pageCounter = 1;

    // ==========================================
    // 1. مباشرة عمل (Page 1)
    // ==========================================
    if (selectedDocs.includes('commence')) {
        pagesHtml += `
            <div class="official-page">
                ${renderDocHeader(app, app.app_id, commenceDate)}
                <div class="official-title-banner">مباشرة عمل</div>
                <table class="official-table">
                    <tr>
                        <th style="width:20%;">الاسم</th>
                        <td style="width:30%; font-weight:700;">${app.full_name}</td>
                        <th style="width:20%;">الجنسية</th>
                        <td style="width:30%;">${app.nationality || 'سعودي'}</td>
                    </tr>
                    <tr>
                        <th>رقم الهوية</th>
                        <td style="font-weight:700; font-family:monospace;">${app.national_id}</td>
                        <th>الرقم الوظيفي</th>
                        <td>${app.app_id.substring(0, 16)}</td>
                    </tr>
                    <tr>
                        <th>الوظيفة</th>
                        <td style="font-weight:700;">${app.job_title}</td>
                        <th>رقم الجوال</th>
                        <td style="direction:ltr; text-align:right;">${app.phone}</td>
                    </tr>
                    <tr>
                        <th>عنوان السكن</th>
                        <td colspan="3">${app.city} - ${app.district} - ${app.street}</td>
                    </tr>
                </table>
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px; padding:22px; margin:24px 0; font-size:14px; line-height:2.2;">
                    المذكور أعلاه باشر العمل في يوم <strong style="color:#c8102e;">${dayName}</strong> الموافق <strong style="color:#c8102e;">${commenceDate} م</strong><br>
                    في الموقع: <strong>${app.project_name} (${app.work_location})</strong> الوردية: <strong>${app.shift || 'صباحي'}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:60px; padding:0 30px;">
                    <div style="text-align:center;">
                        <div style="font-weight:800; margin-bottom:10px;">مدير الفرع / العمليات</div>
                        ${renderCompanyStamp()}
                    </div>
                    <div style="text-align:center;">
                        <div style="font-weight:800; margin-bottom:10px;">توقيع الموظف المعتمد</div>
                        <div style="font-size:13px; color:#1e293b; margin-bottom:8px;">${app.full_name}</div>
                        ${renderCandidateSig(app)}
                    </div>
                </div>
                ${renderDocFooter(pageCounter++)}
            </div>
        `;
    }

    // ==========================================
    // 2. قائمة ملف الموظف (السعودي) (Page 2)
    // ==========================================
    if (selectedDocs.includes('checklist')) {
        pagesHtml += `
            <div class="official-page">
                ${renderDocHeader(app, app.app_id, commenceDate)}
                <div class="official-title-banner">قائمة ملف الموظف (السعودي)</div>
                <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; border:1px solid #cbd5e1; padding:8px 14px; border-radius:4px; margin-bottom:14px; font-size:12.5px;">
                    <div>الحراسات الأمنية: <strong>[✓] موظف جديد</strong> &nbsp;&nbsp; [ ] موظف سابق</div>
                    <div>المشروع: <strong>${app.project_name}</strong></div>
                </div>
                <table class="official-table">
                    <tr><th>الاسم:</th><td>${app.full_name}</td><th>الإدارة:</th><td>إدارة الحراسات الأمنية المدنية</td></tr>
                    <tr><th>الوظيفة:</th><td>${app.job_title}</td><th>المدير المباشر:</th><td>سلطان بن إبراهيم المنصور</td></tr>
                </table>
                <div style="font-size:13px; font-weight:800; color:#1e293b; margin:10px 0 6px 0;">التوظيف (الإلزامي):</div>
                <table class="official-table" style="font-size:11.5px;">
                    <thead><tr style="background:#f1f5f9;"><th style="width:40px; text-align:center;">م</th><th>المستند الإلزامي المعتمد</th><th style="width:80px; text-align:center;">الحالة</th></tr></thead>
                    <tbody>
                        <tr><td style="text-align:center;">1</td><td>صورة الهوية الوطنية & بطاقة العائلة (للمتزوجين)</td><td style="text-align:center; color:#059669; font-weight:800;">✓ متوفر</td></tr>
                        <tr><td style="text-align:center;">2</td><td>العنوان الوطني الرسمي (سبل SPL)</td><td style="text-align:center; color:#059669; font-weight:800;">✓ متوفر</td></tr>
                        <tr><td style="text-align:center;">3</td><td>رقم الحساب الدولي (IBAN)</td><td style="text-align:center; color:#059669; font-weight:800;">✓ متوفر</td></tr>
                        <tr><td style="text-align:center;">4</td><td>عقد العمل الموحد المعتمد</td><td style="text-align:center; color:#059669; font-weight:800;">✓ متوفر</td></tr>
                        <tr><td style="text-align:center;">5</td><td>إستمارة طلب الوظيفة والإقرار الرسمي</td><td style="text-align:center; color:#059669; font-weight:800;">✓ متوفر</td></tr>
                        <tr><td style="text-align:center;">6</td><td>تأكيد مباشرة العمل (نموذج إشعار مباشرة)</td><td style="text-align:center; color:#059669; font-weight:800;">✓ متوفر</td></tr>
                        <tr><td style="text-align:center;">7</td><td>التعهدات والضوابط الأمنية</td><td style="text-align:center; color:#059669; font-weight:800;">✓ متوفر</td></tr>
                        <tr><td style="text-align:center;">8</td><td>صحيفة الحالة الجنائية (خلو سوابق)</td><td style="text-align:center; color:#059669; font-weight:800;">✓ متوفر</td></tr>
                        <tr><td style="text-align:center;">9</td><td>الكشف الطبي العام والإفصاح الصحي</td><td style="text-align:center; color:#059669; font-weight:800;">✓ متوفر</td></tr>
                        <tr><td style="text-align:center;">10</td><td>الصور الشخصية الرسمية (3 صور)</td><td style="text-align:center; color:#059669; font-weight:800;">✓ متوفر</td></tr>
                        <tr><td style="text-align:center;">11</td><td>التحقق من الاشتراك في التأمينات الاجتماعية (GOSI)</td><td style="text-align:center; color:#059669; font-weight:800;">✓ متوفر</td></tr>
                        <tr><td style="text-align:center;">12</td><td>التحقق من الاشتراك في التأمين الطبي التعاوني</td><td style="text-align:center; color:#059669; font-weight:800;">✓ متوفر</td></tr>
                        <tr><td style="text-align:center;">13</td><td>السيرة الذاتية المعتمدة (CV)</td><td style="text-align:center; color:#059669; font-weight:800;">✓ متوفر</td></tr>
                        <tr><td style="text-align:center;">14</td><td>صورة آخر مؤهل دراسي (${app.education_level || 'ثانوي'})</td><td style="text-align:center; color:#059669; font-weight:800;">✓ متوفر</td></tr>
                        <tr><td style="text-align:center;">15</td><td>نموذج الإفصاح الطبي لشركة التأمين</td><td style="text-align:center; color:#059669; font-weight:800;">✓ متوفر</td></tr>
                    </tbody>
                </table>
                <div style="display:flex; justify-content:space-between; margin-top:20px; font-size:12px;">
                    <div><strong>عمليات الموارد البشرية:</strong> سلطان المنصور &nbsp;&nbsp; <strong>التوقيع:</strong> <i>معتمد</i></div>
                    <div><strong>إدارة التوظيف:</strong> عبدالرحمن الحاتم &nbsp;&nbsp; <strong>التوقيع:</strong> <i>معتمد</i></div>
                </div>
                ${renderDocFooter(pageCounter++)}
            </div>
        `;
    }

    // ==========================================
    // 3. نموذج استمارة طلب وظيفة (Page 3)
    // ==========================================
    if (selectedDocs.includes('app_form')) {
        pagesHtml += `
            <div class="official-page">
                ${renderDocHeader(app, app.app_id, commenceDate)}
                <div class="official-title-banner">نموذج استمارة طلب وظيفة</div>
                <table class="official-table" style="margin-bottom:14px;">
                    <tr><th>رقم الطلب:</th><td style="font-family:monospace; font-weight:700;">${app.app_id}</td><th>الوظيفة:</th><td style="font-weight:700;">${app.job_title}</td><th>التاريخ:</th><td>${commenceDate}</td></tr>
                </table>
                <div style="font-size:13.5px; font-weight:800; color:#c8102e; margin-bottom:8px;">المعلومات الشخصية:</div>
                <table class="official-table">
                    <tr><th>الاسم كامل حسب الهوية:</th><td colspan="3" style="font-weight:700;">${app.full_name}</td></tr>
                    <tr><th>رقم الهوية الوطنية:</th><td style="font-family:monospace; font-weight:700;">${app.national_id}</td><th>تاريخ الميلاد:</th><td>${app.birth_date || '1999-11-01'} (العمر: 26)</td></tr>
                    <tr><th>الحالة الاجتماعية:</th><td>${app.marital_status || 'أعزب'}</td><th>الجنس:</th><td>${app.gender || 'ذكر'}</td></tr>
                    <tr><th>عنوان الإقامة:</th><td>${app.city} - حي ${app.district}</td><th>الشارع:</th><td>${app.street}</td></tr>
                    <tr><th>رقم الجوال:</th><td style="direction:ltr; text-align:right;">${app.phone}</td><th>البريد الإلكتروني:</th><td>${app.email || '-'}</td></tr>
                </table>
                <div style="font-size:13.5px; font-weight:800; color:#c8102e; margin:14px 0 8px 0;">المؤهلات التعليمية:</div>
                <table class="official-table">
                    <tr><th>أعلى مؤهل:</th><td>${app.education_level || 'ثانوي'}</td><th>اسم الشهادة:</th><td>${app.degree_name || 'الثانوية'}</td></tr>
                    <tr><th>الجهة التعليمية:</th><td>${app.education_inst || 'ثانوية قتيبه'}</td><th>تاريخ منح الشهادة:</th><td>${app.degree_date || '2019-09-01'}</td></tr>
                </table>
                <div style="font-size:13.5px; font-weight:800; color:#c8102e; margin:14px 0 8px 0;">آخر سنتين خبرة:</div>
                <table class="official-table">
                    <thead><tr><th>اسم المنشأة</th><th>من</th><th>إلى</th><th>المسمى الوظيفي</th></tr></thead>
                    <tbody>
                        <tr><td>شركة الحراسات المتقدمة</td><td>2022/01</td><td>2024/02</td><td>رجل أمن وسلامة</td></tr>
                    </tbody>
                </table>
                <div style="font-size:13.5px; font-weight:800; color:#c8102e; margin:14px 0 8px 0;">المعرفون:</div>
                <table class="official-table">
                    <thead><tr><th>الاسم</th><th>الهاتف</th><th>العنوان</th></tr></thead>
                    <tbody>
                        <tr><td>عايد مفلح</td><td style="direction:ltr; text-align:right;">0555944944</td><td>رفحا</td></tr>
                        <tr><td>جمال الشمري</td><td style="direction:ltr; text-align:right;">0500087597</td><td>الرياض</td></tr>
                    </tbody>
                </table>
                ${renderDocFooter(pageCounter++)}
            </div>
        `;

        // ==========================================
        // 4. إقرار من مقدم الطلب (Page 4)
        // ==========================================
        pagesHtml += `
            <div class="official-page">
                ${renderDocHeader(app, app.app_id, commenceDate)}
                <div class="official-title-banner">إقرار من مقدم الطلب</div>
                <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:28px; line-height:2.4; font-size:14.5px; color:#1e293b; margin:30px 0;">
                    أقر أنا الموقع على هذا النموذج بأن كل البيانات والمعلومات المذكورة سابقاً صحيحة ودقيقة ومدعومة بالإثباتات الرسمية النظامية.<br>
                    وفي حالة وجود أي معلومات غير صحيحة أو مضللة، سيتم رفض طلبي أو إلغاء تعييني فوراً ودون أي تقصير أو مطالبة بالتعويض.<br>
                    بالإضافة إلى ذلك أقر أني على أتم الاستعداد لمزيد من الفحص والتدريب والمقابلات التي تؤدي إلى القبول أو الرفض على الوظيفة المتقدم لها طبقاً للوائح وأنظمة شركة النصبان للحراسات الأمنية.
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:80px; padding:0 30px;">
                    <div style="font-size:14px; line-height:2;">
                        <div>الاسم: <strong>${app.full_name}</strong></div>
                        <div>رقم الهوية: <strong>${app.national_id}</strong></div>
                        <div>التاريخ: <strong>${commenceDate}</strong></div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-weight:800; margin-bottom:10px;">توقيع مقدم الطلب</div>
                        ${renderCandidateSig(app)}
                    </div>
                </div>
                ${renderDocFooter(pageCounter++)}
            </div>
        `;
    }

    // ==========================================
    // 5. ملحق بالعقد (تعهد حارس أمن) (Pages 5 & 6)
    // ==========================================
    if (selectedDocs.includes('contract_pledge')) {
        pagesHtml += `
            <div class="official-page">
                ${renderDocHeader(app, app.app_id, commenceDate)}
                <div class="official-title-banner">ملحق بالعقد (تعهد حارس أمن)</div>
                <table class="official-table" style="margin-bottom:12px;">
                    <tr><th>الاسم:</th><td>${app.full_name}</td><th>رقم الهوية:</th><td>${app.national_id}</td></tr>
                    <tr><th>المشروع:</th><td>${app.project_name}</td><th>التاريخ:</th><td>${commenceDate}</td></tr>
                </table>
                <div style="font-size:12.5px; font-weight:800; color:#1e293b; margin-bottom:8px;">أتعهد أنا الموضح بياناته أعلاه بما يلي:</div>
                <ol style="font-size:11px; line-height:1.7; padding-right:20px; color:#334155; margin:0;">
                    <li>الالتزام بالقوانين والأنظمة والتعليمات المعمول بها في الشركة، والامتثال لأوامر رؤسائي المباشرين.</li>
                    <li>الحفاظ على أمن وسلامة الممتلكات والأشخاص داخل موقع العمل، ومنع أي تصرف من شأنه تعريضهم للخطر.</li>
                    <li>مراقبة حركة الدخول والخروج من الموقع، والتأكد من صحة تصاريح الدخول، ومنع دخول أي أشخاص غير مصرح لهم.</li>
                    <li>تفتيش الأشخاص والمركبات الداخلة والخارجة من الموقع، والبحث عن أي مواد ممنوعة أو خطرة.</li>
                    <li>الإبلاغ الفوري عن أي حوادث أو مخالفات أو تصرفات مشبوهة يتم ملاحظتها.</li>
                    <li>التعامل باحترام ولباقة مع جميع الموظفين والزوار، وتقديم المساعدة لهم عند الحاجة.</li>
                    <li>الحفاظ على سرية المعلومات الخاصة بالشركة، وعدم إفشائها لأي شخص غير مصرح له.</li>
                    <li>ارتداء الزي الرسمي للشركة بشكل لائق ونظيف، والالتزام بالمظهر اللائق أثناء العمل.</li>
                    <li>الحضور إلى العمل الرسمي في الوقت المحدد، والالتزام بساعات الدوام الرسمي.</li>
                    <li>الالتزام بجميع قواعد السلامة والصحة المهنية، واستخدام معدات السلامة الشخصية بشكل صحيح.</li>
                    <li>أتعهد بأداء واجباتي بإخلاص وأمانة، وأن أبذل قصارى جهدي للمحافظة على أمن وسلامة الشركة وممتلكاتها.</li>
                    <li>عدم استخدام الجوال خلال أوقات العمل الرسمية، ما لم يكن ذلك ضرورياً لأداء واجبات العمل.</li>
                    <li>عدم أخذ أو طلب أي مبالغ مالية من الزوار أو العملاء تحت أي ظرف من الظروف.</li>
                    <li>التعامل مع جميع الزوار باحترام وتقدير، وتجنب مضايقتهم أو التعرض لهم بأي شكل من الأشكال.</li>
                    <li>الالتزام بدوام العمل الرسمي وعدم التغيب بدون إذن مسبق، وأتعهد عند غيابي عن العمل بخصم عدد أيام الغياب مضاعفة (أحد - اثنين - ثلاثاء - أربعاء) اليوم بيومين، (خميس - جمعة - سبت) اليوم بثلاثة أيام من الراتب.</li>
                    <li>الحفاظ على اليقظة والتركيز خلال ساعات العمل، وتجنب النوم في أماكن العمل نهائياً.</li>
                    <li>أداء جميع واجبات العمل بجدية وإتقان، وعدم إهمال أي مهمة موكولة إليّ.</li>
                    <li>التصرف بلباقة واحترام مع جميع الأشخاص، وتجنب التلفظ بأي ألفاظ نابية أو التصرف بسلوك غير لائق.</li>
                    <li>أتعهد بتعويض الشركة عن أي أضرار أو خسائر مباشرة أو غير مباشرة تحدث نتيجة أي تقصير أو إخفاق أو إخلال.</li>
                    <li>ألتزم بعدم التصوير الخاص بالزي الرسمي أو ما يدل على الشركة أو المشروع الذي أعمل به ونشره في مواقع التواصل.</li>
                </ol>
                ${renderDocFooter(pageCounter++)}
            </div>

            <div class="official-page">
                ${renderDocHeader(app, app.app_id, commenceDate)}
                <div class="official-title-banner">العواقب وتواقيع الالتزام</div>
                <div style="background:#fef2f2; border:1.5px solid #f87171; border-radius:6px; padding:20px; font-size:13.5px; line-height:2.2; color:#991b1b; margin:24px 0;">
                    <strong>العواقب الإدارية والنظامية:</strong><br>
                    يُمكن أن تؤدي ممارسة أي من السلوكيات المخالفة أو الإخلال بأي بند من البنود العشرين المذكورة أعلاه إلى اتخاذ إجراءات تأديبية صارمة ضدكم، بما في ذلك الإنذار الكتابي أو التوبيخ أو الفصل الفوري من العمل مع التحميل بالتعويضات النظامية طبقاً لنظام الحراسات الأمنية المدنية الخاصة ولائحة الجزاءات ونظام العمل السعودي.
                </div>
                <table class="official-table" style="margin-top:50px;">
                    <thead>
                        <tr style="background:#f1f5f9;">
                            <th style="width:33%; text-align:center;">حارس الأمن (المقر)</th>
                            <th style="width:33%; text-align:center;">مدير المشروع</th>
                            <th style="width:33%; text-align:center;">مدير الإدارة</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="height:110px;">
                            <td style="text-align:center; vertical-align:middle;">
                                <div>${app.full_name}</div>
                                <div style="font-size:11px; color:#64748b;">${commenceDate}</div>
                                ${renderCandidateSig(app)}
                            </td>
                            <td style="text-align:center; vertical-align:middle;">
                                <div>سلطان المنصور</div>
                                <div style="font-size:11px; color:#64748b;">${commenceDate}</div>
                                <i>معتمد</i>
                            </td>
                            <td style="text-align:center; vertical-align:middle;">
                                ${renderCompanyStamp()}
                            </td>
                        </tr>
                    </tbody>
                </table>
                ${renderDocFooter(pageCounter++)}
            </div>
        `;
    }

    // ==========================================
    // 6. تعهد وإقرار للحراسات الأمنية (Page 7)
    // ==========================================
    if (selectedDocs.includes('security_pledge')) {
        pagesHtml += `
            <div class="official-page">
                ${renderDocHeader(app, app.app_id, commenceDate)}
                <div class="official-title-banner">تعهد وإقرار للحراسات الأمنية</div>
                <div style="text-align:left; font-size:12px; margin-bottom:16px;">الموافق: <strong>${commenceDate} م</strong></div>
                <div style="line-height:2.4; font-size:13.5px; color:#1e293b; text-align:justify;">
                    أنا الموقع أدناه (<strong>${app.full_name}</strong>)، هوية رقم (<strong>${app.national_id}</strong>) الموظف بشركة النصبان للحراسات الأمنية بوظيفة (<strong>${app.job_title}</strong>).<br>
                    أقر بكامل أهليتي المعتبرة شرعاً ونظاماً ودون أن تشوب إرادتي أيٌ من عيوب الرضا (الغلط، التدليس، الإكراه، الاستغلال، الغبن)، بأنني على علم ودراية تامة بإجراءات العمل وفنيات العمل التي تخص مهام عملي كرجل أمن، وأتعهد بالقيام بجميع مسؤوليات عملي الوظيفية وفق الأنظمة واللوائح التنظيمية والتشغيلية المعتمدة داخل المنشأة.<br>
                    وأتعهد عند غيابي عن العمل تخصم عدد أيام الغياب مضاعفة (أحد - اثنين - ثلاثاء - أربعاء) اليوم بيومين، (خميس - جمعة - سبت) اليوم بثلاثة أيام من الراتب.<br>
                    أتعهد عند ترك العمل دون إبداء أي أسباب (استقالة فورية) يتم خصم شهر إنذار من راتبي ووقفه التأمين وذلك في حالة عدم تغطية الراتب لقيمة الخصم.<br>
                    وسأبذل عناية الشخص الحريص بتحقيق نتيجة تحقق مهامي الوظيفية الجوهرية واتباع المهام والمسؤوليات المحددة في الوصف الوظيفي الموقع من قبلي.<br>
                    كما أقر بمسؤوليتي التامة والمطلقة من الناحية النظامية عن تعويض الشركة عن أي أضرار أو خسائر تحدث نتيجة أي تقصير أو إخفاق أو إخلال.
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:60px; padding:0 30px;">
                    <div style="font-size:13px; line-height:2;">
                        <div>المقر بما فيه: <strong>${app.full_name}</strong></div>
                        <div>رقم الهوية: <strong>${app.national_id}</strong></div>
                        <div>التاريخ: <strong>${commenceDate}</strong></div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-weight:800; margin-bottom:10px;">التوقيع المعتمد</div>
                        ${renderCandidateSig(app)}
                    </div>
                </div>
                ${renderDocFooter(pageCounter++)}
            </div>
        `;
    }

    // ==========================================
    // 7. عقد عمل لمهمة محددة – سعودي (Pages 8, 9, 10, 11)
    // ==========================================
    if (selectedDocs.includes('contract')) {
        // Page 8
        pagesHtml += `
            <div class="official-page">
                ${renderDocHeader(app, app.app_id, commenceDate)}
                <div class="official-title-banner">عقد عمل لمهمة محددة – سعودي (صفحة 1 من 4)</div>
                <div style="font-size:12.5px; line-height:1.9; color:#1e293b; margin-bottom:14px;">
                    أنه في يوم <strong>${dayName}</strong> بتاريخ <strong>${commenceDate} م</strong> تم الاتفاق بين كل من:<br>
                    <strong>الطرف الأول:</strong> شركة النصبان للحراسات الأمنية (سجل تجاري 1010138495 وتاريخ 1416/05/28هـ)، وعنوانها مدينة الرياض، حي النموذجية، ص.ب 12734، هاتف 920012225، ويمثلها في إبرام هذا العقد الأستاذ/ <strong>عبدالرحمن الحاتم</strong> بموجب السجل التجاري.<br>
                    <strong>الطرف الثاني:</strong> السيد/ <strong>${app.full_name}</strong>، رقم الهوية: <strong>${app.national_id}</strong>، الحالة الاجتماعية: <strong>${app.marital_status || 'أعزب'}</strong>، العنوان الوطني: مدينة <strong>${app.city}</strong>، الحي: <strong>${app.district}</strong>، الشارع: <strong>${app.street}</strong>، جوال: <strong>${app.phone}</strong>.
                </div>
                <div style="font-size:13px; font-weight:800; color:#c8102e; margin:10px 0 4px 0;">أولاً: التمهيد</div>
                <div style="font-size:12px; line-height:1.8; color:#334155; text-align:justify;">
                    حيث أن الطرف الأول منشأة تجارية تدير نشاط الحراسات الأمنية المدنية الخاصة داخل المملكة العربية السعودية، ولكون الطرف الثاني لديه من المؤهلات والخبرات والكفاءة ما يؤهله لأداء عمل معين لمصلحة الطرف الأول وتحت إشرافه وإدارته، فقد اتفق الطرفان وهما بكامل الأهلية المعتبرة شرعاً ونظاماً على ما يلي:
                </div>
                <div style="font-size:13px; font-weight:800; color:#c8102e; margin:10px 0 4px 0;">ثانياً: نطاق العمل</div>
                <div style="font-size:12px; line-height:1.8; color:#334155;">
                    (2/1): اتفق الطرفان على أن يعمل الطرف الثاني لدى الطرف الأول بمهنة <strong>${app.job_title}</strong> في مشروع <strong>${app.project_name}</strong> ومباشرة الأعمال التي يكلف بها.<br>
                    (2/2): تحدد أيام العمل العادية بخمسة أو ستة أيام في الأسبوع وساعات العمل اليومية ثماني ساعات يتخللها ساعة راحة.
                </div>
                <div style="font-size:13px; font-weight:800; color:#c8102e; margin:10px 0 4px 0;">ثالثاً: مدة العقد</div>
                <div style="font-size:12px; line-height:1.8; color:#334155;">
                    (3/1): مدة هذا العقد سنة ميلادية تبدأ اعتباراً من تاريخ مباشرة العمل الموافق <strong>${commenceDate} م</strong> وتنتهي بنهايته ولا يتجدد إلا بموجب عقد جديد.<br>
                    (3/2): يخضع الطرف الثاني لفترة تجربة مدتها 180 يوماً تبدأ من تاريخ مباشرته للعمل، ويكون للطرفين الحق في إنهائها خلال هذه الفترة طبقاً للمادة 53 من نظام العمل.
                </div>
                ${renderDocFooter(pageCounter++)}
            </div>

            <!-- Page 9 -->
            <div class="official-page">
                ${renderDocHeader(app, app.app_id, commenceDate)}
                <div class="official-title-banner">عقد عمل لمهمة محددة – سعودي (صفحة 2 من 4)</div>
                <div style="font-size:13px; font-weight:800; color:#c8102e; margin-bottom:8px;">رابعاً: التزامات الطرف الأول والأجر الشهري</div>
                <div style="font-size:12px; line-height:1.8; color:#334155; margin-bottom:10px;">
                    (4/1): يلتزم الطرف الأول بأن يدفع للطرف الثاني عند نهاية كل شهر ميلادي الأجر والبدلات المتفق عليها وفق الجدول التالي:
                </div>
                <table class="official-table" style="text-align:center;">
                    <thead>
                        <tr style="background:#f1f5f9;">
                            <th>المسمى الوظيفي</th>
                            <th>أساسي</th>
                            <th>بدل سكن</th>
                            <th>بدل نقل</th>
                            <th>بدل إشراف</th>
                            <th>بدل إدارة</th>
                            <th style="background:#e2e8f0; font-weight:900;">إجمالي الأجر الشهري</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="font-weight:700;">${app.job_title}</td>
                            <td>2,500 ر.س</td>
                            <td>2,000 ر.س</td>
                            <td>1,500 ر.س</td>
                            <td>0 ر.س</td>
                            <td>0 ر.س</td>
                            <td style="font-weight:900; color:#c8102e; background:#fef2f2;">6,000 ريال سعودي</td>
                        </tr>
                    </tbody>
                </table>
                <div style="font-size:12px; line-height:1.9; color:#334155; margin-top:14px; text-align:justify;">
                    (4/2): يلتزم الطرف الأول بأن يدفع للطرف الثاني أجراً إضافياً عن ساعات العمل الإضافية وفق أحكام نظام العمل.<br>
                    (4/3): يستحق الطرف الثاني عن كل عام إجازة سنوية مدتها واحد وعشرون (21) يوماً مدفوعة الأجر.<br>
                    (4/4): يلتزم الطرف الأول بتوفير الرعاية الطبية والتأمين الصحي التعاوني للطرف الثاني وفقاً لنظام مجلس الضمان الصحي التعاوني.<br>
                    (4/5): يلتزم الطرف الأول بسداد اشتراكات المؤسسة العامة للتأمينات الاجتماعية (GOSI) فرع الأخطار المهنية والمعاشات.
                </div>
                ${renderDocFooter(pageCounter++)}
            </div>

            <!-- Page 10 -->
            <div class="official-page">
                ${renderDocHeader(app, app.app_id, commenceDate)}
                <div class="official-title-banner">عقد عمل لمهمة محددة – سعودي (صفحة 3 من 4)</div>
                <div style="font-size:13px; font-weight:800; color:#c8102e; margin-bottom:8px;">خامساً: التزامات الطرف الثاني (14 بنداً نظامياً)</div>
                <div style="font-size:11.5px; line-height:1.75; color:#334155; text-align:justify;">
                    (5/1): يلتزم الطرف الثاني بالمواظبة على الحضور والانصراف في الأوقات المحددة له وإنجاز العمل بأمانة وإخلاص.<br>
                    (5/2): أن يعيد لصاحب العمل كافة المواد والآلات والأدوات والمعدات الموضوعة تحت تصرفه فور طلبها.<br>
                    (5/3): يلتزم بتسليم العهد التي بيده خلال 14 يوماً من انتهاء العلاقة التعاقدية (الزي، الأجهزة اللاسلكية، بطاقات الدخول).<br>
                    (5/4): يلتزم بإجراء الفحص الطبي قبل الالتحاق بالعمل أو أثناءه للتأكد من لياقته البدنية والنفسية.<br>
                    (5/5): يوافق على تكليفه بالعمل في أي موقع أو مشروع تابع للطرف الأول وفق حاجة العمل.<br>
                    (5/6): يوافق على نقله للعمل في أي من مناطق ومشاريع الشركة بالمملكة بما تقتضيه مصلحة العمل.<br>
                    (5/7): يلتزم بأداء عمله دون ممارسة أي أعمال تجارية أو العمل لحساب الغير سواء بأجر أو بدون أجر.<br>
                    (5/8): يلتزم بعدم منافسة الطرف الأول أو العمل لدى منشأة منافسة لمدة سنتين من تاريخ انتهاء العقد.<br>
                    (5/9): يلتزم بعدم إفشاء أسرار العمل والمعلومات الخاصة بالموقع والعملاء لمدة سنتين بعد انتهاء العقد.<br>
                    (5/10): يلتزم بعدم التخبيب بين الطرف الأول وعملائه أو زملائه العاملين.<br>
                    (5/11): يلتزم باستخراج صحيفة خلو السوابق الجنائية وتقديمها للشركة دورياً.<br>
                    (5/12): الالتزام الصارم بلائحة تنظيم العمل والجزاءات المعتمدة من وزارة الموارد البشرية والتنمية الاجتماعية.
                </div>
                ${renderDocFooter(pageCounter++)}
            </div>

            <!-- Page 11 -->
            <div class="official-page">
                ${renderDocHeader(app, app.app_id, commenceDate)}
                <div class="official-title-banner">عقد عمل لمهمة محددة – سعودي (صفحة 4 من 4)</div>
                <div style="font-size:12.5px; line-height:1.8; color:#334155; text-align:justify; margin-bottom:20px;">
                    <strong>سادساً: انتهاء العقد أو فسخه:</strong> ينتهي هذا العقد بانتهاء مدته أو بانتهاء المشروع المسند إليه الطرف الثاني، ويجوز فسخه وفق المادتين 74 و 80 من نظام العمل السعودي.<br>
                    <strong>سابعاً: مكافأة نهاية الخدمة:</strong> تصرف مكافأة نهاية الخدمة وفقاً لأحكام المادتين 84 و 85 من نظام العمل.<br>
                    <strong>ثامناً: أحكام عامة:</strong> حرر هذا العقد من نسختين أصليتين بيد كل طرف نسخة للعمل بموجبها، ويخضع العقد وتفسيره لكافة الأنظمة المعمول بها في المملكة العربية السعودية.
                </div>
                <table class="official-table" style="margin-top:40px;">
                    <thead>
                        <tr style="background:#f1f5f9;">
                            <th style="width:50%; text-align:center;">الطرف الأول (شركة النصبان للحراسات الأمنية)</th>
                            <th style="width:50%; text-align:center;">الطرف الثاني (الموظف)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="height:120px;">
                            <td style="text-align:center; vertical-align:middle;">
                                <div style="font-weight:700;">ممثل الشركة: عبدالرحمن الحاتم</div>
                                ${renderCompanyStamp()}
                            </td>
                            <td style="text-align:center; vertical-align:middle;">
                                <div style="font-weight:700;">الاسم: ${app.full_name}</div>
                                <div style="font-size:11px; color:#64748b;">رقم الهوية: ${app.national_id}</div>
                                ${renderCandidateSig(app)}
                            </td>
                        </tr>
                    </tbody>
                </table>
                ${renderDocFooter(pageCounter++)}
            </div>
        `;
    }

    // ==========================================
    // 8. إقرار بالحساب البنكي (Page 12)
    // ==========================================
    if (selectedDocs.includes('bank_decl')) {
        pagesHtml += `
            <div class="official-page">
                ${renderDocHeader(app, app.app_id, commenceDate)}
                <div class="official-title-banner">إقرار بالحساب البنكي</div>
                <div style="font-size:13.5px; line-height:2; color:#1e293b; margin:20px 0;">
                    إلى سعادة/ مدير الإدارة المالية المحترم<br>
                    السلام عليكم ورحمة الله وبركاته،،،<br>
                    إشارة إلى طلبكم بضرورة كتابة إقرار بصحة رقم الحساب البنكي الخاص بي، أقر أنا الموضحة بياناته أدناه:
                </div>
                <table class="official-table">
                    <tr><th style="width:25%;">الاسم:</th><td style="font-weight:700;">${app.full_name}</td><th style="width:25%;">رقم الهوية / الإقامة:</th><td style="font-family:monospace; font-weight:700;">${app.national_id}</td></tr>
                    <tr><th>صادرة من:</th><td>${app.id_issue_place || 'الرياض'}</td><th>اسم البنك:</th><td style="font-weight:700;">${app.bank_name || 'بنك الراجحي'}</td></tr>
                    <tr><th>اسم الفرع:</th><td>${app.bank_branch || 'فرع الرياض'}</td><th>رقم الفرع:</th><td>${app.branch_code || '001'}</td></tr>
                    <tr><th>رقم الآيبان (IBAN):</th><td colspan="3" style="font-family:monospace; font-size:14px; font-weight:800; direction:ltr; text-align:center; background:#f8fafc; color:#0f172a;">${app.iban || 'SA55 8000 0679 6080 1035 6897'}</td></tr>
                </table>
                <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:20px; font-size:13.5px; line-height:2.2; margin:24px 0;">
                    بأن البيانات الموضحة أعلاه صحيحة ودقيقة، وأن إيداع رواتبي الشهرية أو أية مبالغ مالية خاصة بي في هذا الحساب، تعتبر استلاماً رسمياً ومبرئاً لذمة الشركة.
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:60px; padding:0 30px;">
                    <div style="font-size:13px; line-height:2;">
                        <div>الاسم: <strong>${app.full_name}</strong></div>
                        <div>الهوية: <strong>${app.national_id}</strong></div>
                        <div>التاريخ: <strong>${commenceDate}</strong></div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-weight:800; margin-bottom:10px;">التوقيع المعتمد</div>
                        ${renderCandidateSig(app)}
                    </div>
                </div>
                <div style="margin-top:20px; font-size:11px; color:#c8102e; font-weight:700;">
                    * ملاحظة: تم إرفاق صورة طبق الأصل من شهادة الحساب والآيبان البنكي المعتمدة.
                </div>
                ${renderDocFooter(pageCounter++)}
            </div>
        `;
    }

    // ==========================================
    // 9. تعليمات الموقع (Page 13)
    // ==========================================
    if (selectedDocs.includes('site_rules')) {
        pagesHtml += `
            <div class="official-page">
                ${renderDocHeader(app, app.app_id, commenceDate)}
                <div class="official-title-banner">تعليمات الموقع</div>
                <ul style="font-size:12.5px; line-height:2.1; padding-right:24px; color:#334155; margin:24px 0;">
                    <li>يمنع استقبال الضيوف والزوار الشخصيين داخل مكتب الأمن وغرفة المراقبة.</li>
                    <li>التأكد من إغلاق البوابات الرئيسية وعدم السماح بدخول السيارات غير المصرح لها بالدخول إلى الموقع.</li>
                    <li>التأكد من هوية الزائر وتسجيل بياناته في سجل الزيارات وإعطائه بطاقة زائر معتمدة.</li>
                    <li>عدم العبث في المعدات والأجهزة الأمنية وأجهزة الإنذار الموجودة في الموقع.</li>
                    <li>تسجيل أسماء الموظفين القادمين إلى العمل أثناء العطل الرسمية والأعياد وتدوين ذلك في السجل المخصص.</li>
                    <li>عدم السماح لأي زائر بالدخول إلى المكاتب أثناء العطل والإجازات الرسمية إلا بإذن كتابي مسبق.</li>
                    <li>التفتيش على المواقف الخاصة بالمنشأة والتأكد من خلوها بعد انتهاء الدوام، والإبلاغ الفوري عن أي سيارة مشبوهة.</li>
                    <li>القيام بجولات تفتيشية دورية حول المنشأة للتأكد من الحالة الأمنية واستتباب الأمن.</li>
                    <li>ضرورة معرفة عناوين وأرقام الجهات المختصة وأرقام الطوارئ (911 - 999 - 998).</li>
                    <li>التأكد من أن الإضاءة الأمنية وأجهزة المراقبة تعمل بكفاءة عالية في المنشأة.</li>
                    <li>التفتيش على طفايات الحريق وخراطيم الإطفاء ومخارج الطوارئ والتأكد من جاهزيتها الدائمة.</li>
                </ul>
                <div style="display:flex; justify-content:space-between; margin-top:50px; padding:0 30px;">
                    <div style="font-size:13px; line-height:2;">
                        <div>الاسم: <strong>${app.full_name}</strong></div>
                        <div>الوظيفة: <strong>${app.job_title}</strong></div>
                        <div>إدارة الحراسات الأمنية</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-weight:800; margin-bottom:10px;">توقيع رجل الأمن بالعلم والالتزام</div>
                        ${renderCandidateSig(app)}
                    </div>
                </div>
                ${renderDocFooter(pageCounter++)}
            </div>
        `;
    }

    // ==========================================
    // 10. مهام وواجبات رجال الأمن (Page 14)
    // ==========================================
    if (selectedDocs.includes('duties')) {
        pagesHtml += `
            <div class="official-page">
                ${renderDocHeader(app, app.app_id, commenceDate)}
                <div class="official-title-banner">مهام وواجبات رجال الأمن (نموذج 2)</div>
                <ul style="font-size:12px; line-height:2.0; padding-right:22px; color:#334155; margin:20px 0;">
                    <li>الحضور إلى مكان العمل مبكراً بالزي الرسمي كاملاً ونظيفاً ومكوياً.</li>
                    <li>الاهتمام بالمظهر العام والهندام واللباقة وحلاقة الذقن وقصات الشعر النظامية.</li>
                    <li>التعامل بأدب واحترام ومساعدة الآخرين في جميع الأوقات والمحافظة على هيبة الأمن.</li>
                    <li>المحافظة على سرية المعلومات الخاصة بالعمل والموقع والمنشأة وعدم إفشائها للغير.</li>
                    <li>يجب على رجل الأمن التأكد من ضمان سلامته وسلامة بيئة العمل المحيطة به.</li>
                    <li>عدم الانصراف من الموقع إلا بعد حضور البديل، وتسليمه الموقع حسب إجراءات الاستلام والتسليم المتبعة.</li>
                    <li>القيام بجولات تفقدية على المنشأة والتأكد من سلامة العهد والتجهيزات وتدوين الملاحظات في السجل.</li>
                    <li>استخدام السجلات والنماذج الأمنية وتعبئتها بحرص ودقة وفقاً للتعليمات.</li>
                    <li>التعرف على المهام والواجبات الأمنية الخاصة بالموقع والعمل على تنفيذها بدقة واقتدار.</li>
                    <li>معرفة أرقام مسؤولي الأمن والسلامة والصيانة والإداريين للتواصل عند الضرورة.</li>
                    <li>يجب على رجل الأمن التصرف بحكمة ومهنية عالية في جميع الظروف والأوقات.</li>
                    <li>عدم السماح بخروج أي أجهزة أو مواد بدون إذن رسمي موقع ومعتمد من إدارة المنشأة.</li>
                    <li>الاستجابة السريعة والفعالة لحالات الطوارئ واتخاذ الإجراءات والتدابير الوقائية المناسبة.</li>
                    <li>يمنع منعاً باتاً التدخين أو الأكل أو النوم في غرف ومقرات العمل الأمنية.</li>
                </ul>
                <div style="display:flex; justify-content:space-between; margin-top:40px; padding:0 30px;">
                    <div style="font-size:13px; line-height:2;">
                        <div>الاسم: <strong>${app.full_name}</strong></div>
                        <div>رقم الهوية: <strong>${app.national_id}</strong></div>
                        <div>التاريخ: <strong>${commenceDate}</strong></div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-weight:800; margin-bottom:10px;">التوقيع المعتمد</div>
                        ${renderCandidateSig(app)}
                    </div>
                </div>
                ${renderDocFooter(pageCounter++)}
            </div>
        `;
    }

    // ==========================================
    // 11. لائحة الجزاءات (Pages 15, 16, 17, 18)
    // ==========================================
    if (selectedDocs.includes('penalties')) {
        // Page 15
        pagesHtml += `
            <div class="official-page">
                ${renderDocHeader(app, app.app_id, commenceDate)}
                <div class="official-title-banner">لائحة الجزاءات والمخالفات المعتمدة (صفحة 1 من 4)</div>
                <div style="font-size:12.5px; font-weight:800; color:#c8102e; margin-bottom:6px;">أولاً: مخالفات تتعلق بمواعيد العمل:</div>
                <table class="official-table" style="font-size:11px;">
                    <thead><tr style="background:#f1f5f9;"><th style="width:30px;">م</th><th>نوع المخالفة</th><th>أول مرة</th><th>ثاني مرة</th><th>ثالث مرة</th><th>رابع مرة</th></tr></thead>
                    <tbody>
                        <tr><td>1</td><td>التأخر عن الحضور للعمل حتى 15 دقيقة دون إذن</td><td>إنذار كتابي</td><td>خصم 5%</td><td>خصم 10%</td><td>خصم 20%</td></tr>
                        <tr><td>2</td><td>التأخر حتى 15 دقيقة وترتب عليه تعطيل عمال آخرين</td><td>إنذار كتابي</td><td>خصم 15%</td><td>خصم 25%</td><td>خصم 50%</td></tr>
                        <tr><td>3</td><td>التأخر من 15 إلى 30 دقيقة دون عذر مقبول</td><td>خصم 10%</td><td>خصم 15%</td><td>خصم 25%</td><td>خصم 50%</td></tr>
                        <tr><td>4</td><td>التأخر من 15 إلى 30 دقيقة وترتب عليه تعطيل آخرين</td><td>خصم 25%</td><td>خصم 50%</td><td>خصم 75%</td><td>خصم يوم</td></tr>
                        <tr><td>5</td><td>التأخر من 30 إلى 60 دقيقة دون عذر مقبول</td><td>خصم 25%</td><td>خصم 50%</td><td>خصم 75%</td><td>خصم يوم</td></tr>
                        <tr><td>6</td><td>التأخر أكثر من ساعة دون عذر مقبول</td><td>إنذار كتابي</td><td>خصم يوم</td><td>خصم يومان</td><td>خصم 3 أيام</td></tr>
                        <tr><td>7</td><td>ترك العمل أو الانصراف قبل الموعد حتى 15 دقيقة</td><td>إنذار كتابي</td><td>خصم 10%</td><td>خصم 25%</td><td>خصم يوم</td></tr>
                        <tr><td>8</td><td>ترك العمل أو الانصراف بما يتجاوز 15 دقيقة</td><td>خصم 10%</td><td>خصم 25%</td><td>خصم 50%</td><td>خصم يوم</td></tr>
                        <tr><td>9</td><td>البقاء في أماكن العمل أو العودة إليها دون إذن</td><td>إنذار كتابي</td><td>خصم 10%</td><td>خصم 25%</td><td>خصم يوم</td></tr>
                    </tbody>
                </table>
                ${renderDocFooter(pageCounter++)}
            </div>

            <!-- Page 16 -->
            <div class="official-page">
                ${renderDocHeader(app, app.app_id, commenceDate)}
                <div class="official-title-banner">لائحة الجزاءات والمخالفات المعتمدة (صفحة 2 من 4)</div>
                <div style="font-size:12.5px; font-weight:800; color:#c8102e; margin-bottom:6px;">أولاً: مخالفات تتعلق بمواعيد العمل والغياب (تابع):</div>
                <table class="official-table" style="font-size:11px;">
                    <thead><tr style="background:#f1f5f9;"><th style="width:30px;">م</th><th>نوع المخالفة</th><th>أول مرة</th><th>ثاني مرة</th><th>ثالث مرة</th><th>رابع مرة</th></tr></thead>
                    <tbody>
                        <tr><td>10</td><td>الغياب دون إذن كتابي أو عذر مقبول ليوم واحد</td><td>خصم يومان</td><td>خصم 3 أيام</td><td>خصم 4 أيام</td><td>حرمان من العلاوة</td></tr>
                        <tr><td>11</td><td>الغياب المتصل من يومين إلى خمسة أيام</td><td>خصم يومان</td><td>خصم 3 أيام</td><td>خصم 4 أيام</td><td>حرمان من الترقية</td></tr>
                        <tr><td>12</td><td>الغياب المتصل من 7 إلى 10 أيام</td><td>خصم 4 أيام</td><td>خصم 5 أيام</td><td>حرمان من العلاوة</td><td>فصل مع المكافأة</td></tr>
                        <tr><td>13</td><td>الغياب المتصل من 11 إلى 14 يوماً</td><td>خصم 5 أيام</td><td>إنذار بالفصل</td><td>فصل بموجب المادة 80</td><td>-</td></tr>
                        <tr><td>14</td><td>الانقطاع عن العمل مدة تزيد عن 15 يوماً متصلة أو 30 متقطعة</td><td colspan="4" style="text-align:center; color:#991b1b; font-weight:800;">فصل من العمل دون مكافأة أو تعويض بموجب المادة 80 من نظام العمل</td></tr>
                    </tbody>
                </table>
                ${renderDocFooter(pageCounter++)}
            </div>

            <!-- Page 17 -->
            <div class="official-page">
                ${renderDocHeader(app, app.app_id, commenceDate)}
                <div class="official-title-banner">لائحة الجزاءات والمخالفات المعتمدة (صفحة 3 من 4)</div>
                <div style="font-size:12.5px; font-weight:800; color:#c8102e; margin-bottom:6px;">ثانياً: مخالفات تتعلق بتنظيم العمل والسلامة:</div>
                <table class="official-table" style="font-size:11px;">
                    <thead><tr style="background:#f1f5f9;"><th style="width:30px;">م</th><th>نوع المخالفة</th><th>أول مرة</th><th>ثاني مرة</th><th>ثالث مرة</th><th>رابع مرة</th></tr></thead>
                    <tbody>
                        <tr><td>1</td><td>التواجد في غير مكان العمل المخصص دون مبرر</td><td>خصم 10%</td><td>خصم 25%</td><td>خصم 50%</td><td>خصم يوم</td></tr>
                        <tr><td>2</td><td>استقبال الزائرين في غير أمور العمل دون إذن</td><td>إنذار كتابي</td><td>خصم 10%</td><td>خصم 15%</td><td>خصم 25%</td></tr>
                        <tr><td>3</td><td>استعمال آلات أو معدات المنشأة لأغراض شخصية</td><td>إنذار كتابي</td><td>خصم 10%</td><td>خصم 25%</td><td>خصم 50%</td></tr>
                        <tr><td>4</td><td>إهمال نظافة وصيانة الأجهزة والمعدات الأمنية</td><td>خصم 50%</td><td>خصم يوم</td><td>خصم يومان</td><td>خصم 3 أيام</td></tr>
                        <tr><td>5</td><td>النوم أثناء ساعات العمل والوردية الميدانية</td><td>إنذار كتابي</td><td>خصم 10%</td><td>خصم 25%</td><td>خصم 50%</td></tr>
                        <tr><td>6</td><td>النوم في الحالات التي تستدعي يقظة مستمرة</td><td>خصم 50%</td><td>خصم يوم</td><td>خصم يومان</td><td>خصم 3 أيام</td></tr>
                        <tr><td>7</td><td>التلاعب في إثبات الحضور والانصراف والبصمة</td><td>خصم يوم</td><td>خصم يومان</td><td>حرمان من العلاوة</td><td>فصل مع المكافأة</td></tr>
                        <tr><td>8</td><td>التدخين في الأماكن المحظورة والمعلن عنها</td><td>خصم يومان</td><td>خصم 3 أيام</td><td>خصم 5 أيام</td><td>فصل مع المكافأة</td></tr>
                    </tbody>
                </table>
                ${renderDocFooter(pageCounter++)}
            </div>

            <!-- Page 18 -->
            <div class="official-page">
                ${renderDocHeader(app, app.app_id, commenceDate)}
                <div class="official-title-banner">لائحة الجزاءات والمخالفات المعتمدة (صفحة 4 من 4)</div>
                <div style="font-size:12.5px; font-weight:800; color:#c8102e; margin-bottom:6px;">ثالثاً: مخالفات تتعلق بالسلوك والانضباط الأخلاقي:</div>
                <table class="official-table" style="font-size:11px;">
                    <thead><tr style="background:#f1f5f9;"><th style="width:30px;">م</th><th>نوع المخالفة</th><th>أول مرة</th><th>ثاني مرة</th><th>ثالث مرة</th><th>رابع مرة</th></tr></thead>
                    <tbody>
                        <tr><td>1</td><td>التشاجر مع الزملاء أو إحداث مشاغبات في العمل</td><td>خصم يوم</td><td>خصم يومان</td><td>خصم 3 أيام</td><td>خصم 5 أيام</td></tr>
                        <tr><td>2</td><td>التمارض أو ادعاء الإصابة كذباً أثناء العمل</td><td>خصم يوم</td><td>خصم يومان</td><td>خصم 3 أيام</td><td>خصم 5 أيام</td></tr>
                        <tr><td>3</td><td>رفض التفتيش الإداري والأمني عند الانصراف</td><td>خصم 25%</td><td>خصم 50%</td><td>خصم يوم</td><td>خصم يومان</td></tr>
                        <tr><td>4</td><td>الامتناع عن ارتداء الزي الرسمي المعتمد وتجهيزات السلامة</td><td>إنذار كتابي</td><td>خصم يوم</td><td>خصم يومان</td><td>خصم 5 أيام</td></tr>
                        <tr><td>5</td><td>الاعتداء على زملاء العمل بالقول أو الإشارة أو التهديد</td><td>خصم يومان</td><td>خصم 3 أيام</td><td>خصم 5 أيام</td><td>فصل مع المكافأة</td></tr>
                        <tr><td>6</td><td>الاعتداء الجسدي أو التعدي على صاحب العمل أو الرؤساء</td><td colspan="4" style="text-align:center; color:#991b1b; font-weight:800;">فصل فوري من الخدمة بموجب المادة 80 دون مكافأة أو إنذار</td></tr>
                    </tbody>
                </table>
                <div style="margin-top:30px; background:#f8fafc; border:1px solid #cbd5e1; padding:16px; border-radius:6px; font-size:12.5px; line-height:2;">
                    أقر أنا الموظف الموقع أدناه باطلاعي التام على كافة بنود لائحة الجزاءات والمخالفات المعتمدة وتعهدي بالالتزام الكامل بها.
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:40px; padding:0 30px;">
                    <div style="font-size:13px; line-height:2;">
                        <div>الاسم: <strong>${app.full_name}</strong></div>
                        <div>رقم الهوية: <strong>${app.national_id}</strong></div>
                        <div>التاريخ: <strong>${commenceDate}</strong></div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-weight:800; margin-bottom:10px;">توقيع رجل الأمن بالعلم والقبول</div>
                        ${renderCandidateSig(app)}
                    </div>
                </div>
                ${renderDocFooter(pageCounter++)}
            </div>
        `;
    }

    // ==========================================
    // 12. الإفصاح الطبي - ميدغلف (Page 19)
    // ==========================================
    if (selectedDocs.includes('medgulf')) {
        pagesHtml += `
            <div class="official-page">
                <div class="official-header" style="border-bottom:2px solid #0284c7;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="font-size:20px; font-weight:900; color:#0284c7; letter-spacing:1px;">MEDGULF ميدغلف</div>
                        <div style="font-size:10px; color:#64748b; line-height:1.2;">
                            شركة المتوسط والخليج للتأمين وإعادة التأمين التعاوني<br>
                            مرخصة من البنك المركزي السعودي ومجلس الضمان الصحي
                        </div>
                    </div>
                    <div style="text-align:left; font-size:10px; color:#64748b;">
                        <div>شهادة رقم: MLF-1460-35-35-02-20-01</div>
                        <div>Ref: A-MEDG-2-C-08-002</div>
                    </div>
                </div>
                <div class="official-title-banner" style="background:#0369a1;">نموذج إفصاح طبي للتأمين الصحي التعاوني</div>
                <table class="official-table" style="font-size:11.5px;">
                    <tr><th>اسم المنشأة:</th><td style="font-weight:700;">شركة النصبان للحراسات الأمنية</td><th>السجل التجاري:</th><td style="font-family:monospace;">1010138495</td></tr>
                    <tr><th>اسم الموظف:</th><td style="font-weight:700;">${app.full_name}</td><th>رقم الهوية:</th><td style="font-family:monospace; font-weight:700;">${app.national_id}</td></tr>
                    <tr><th>الجنسية:</th><td>${app.nationality || 'سعودي'}</td><th>الجنس:</th><td>${app.gender || 'ذكر'} (الحالة: ${app.marital_status || 'أعزب'})</td></tr>
                    <tr><th>المهنة:</th><td>${app.job_title}</td><th>رقم الجوال:</th><td style="direction:ltr; text-align:right;">${app.phone}</td></tr>
                </table>
                <div style="font-size:12px; font-weight:800; color:#0369a1; margin:8px 0 4px 0;">الاستفسارات والأسئلة الطبية النظامية:</div>
                <table class="official-table" style="font-size:11px;">
                    <thead><tr style="background:#f1f5f9;"><th>السؤال الطبي</th><th style="width:60px; text-align:center;">نعم</th><th style="width:60px; text-align:center;">لا</th></tr></thead>
                    <tbody>
                        <tr><td>هل تم تنويمك بالمستشفى خلال آخر 12 شهراً لأي عارض صحي أو جراحة؟</td><td style="text-align:center;">[ ]</td><td style="text-align:center; font-weight:800; color:#059669;">[✓]</td></tr>
                        <tr><td>هل تم تشخيصك بأي من الأمراض المزمنة (القلب، السكري، الضغط، الكبد، الأورام، الفشل الكلوي)؟</td><td style="text-align:center;">[ ]</td><td style="text-align:center; font-weight:800; color:#059669;">[✓]</td></tr>
                        <tr><td>هل تعاني من أمراض وراثية أو تشوهات خلقية أو اضطرابات في الدم أو تكسر بالدم؟</td><td style="text-align:center;">[ ]</td><td style="text-align:center; font-weight:800; color:#059669;">[✓]</td></tr>
                        <tr><td>هل تعاني من أمراض في العظام أو العمود الفقري أو الانزلاق الغضروفي (الديسك) أو المفاصل؟</td><td style="text-align:center;">[ ]</td><td style="text-align:center; font-weight:800; color:#059669;">[✓]</td></tr>
                        <tr><td>هل تم تشخيصك بأمراض في العيون (المياه البيضاء، المياه الزرقاء، الشبكية)؟</td><td style="text-align:center;">[ ]</td><td style="text-align:center; font-weight:800; color:#059669;">[✓]</td></tr>
                    </tbody>
                </table>
                <div style="font-size:11px; line-height:1.8; color:#334155; margin-top:8px; background:#f8fafc; border:1px solid #cbd5e1; padding:10px; border-radius:4px;">
                    <strong>الإقرار والتفويض:</strong> أقر أنا المؤمن له الموضح بياناته أعلاه بصحة ودقة جميع المعلومات الواردة في هذا النموذج، وأفوض شركة ميدغلف ومجلس الضمان الصحي بالاطلاع على ملفي الطبي عند الحاجة.
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:30px; padding:0 30px;">
                    <div style="text-align:center;">
                        <div style="font-weight:800; font-size:12px; margin-bottom:6px;">ختم جهة العمل (النصبان)</div>
                        ${renderCompanyStamp()}
                    </div>
                    <div style="text-align:center;">
                        <div style="font-weight:800; font-size:12px; margin-bottom:6px;">توقيع الموظف المؤمن له</div>
                        ${renderCandidateSig(app)}
                    </div>
                </div>
                ${renderDocFooter(pageCounter++)}
            </div>
        `;
    }

    const modalBody = document.getElementById('official-doc-pages-body');
    const modalTitle = document.getElementById('doc_modal_title');
    if (modalTitle) modalTitle.innerText = `حزمة الوثائق الرسمية لشركة النصبان: ${app.full_name} (${selectedDocs.length} وثيقة)`;
    if (modalBody) modalBody.innerHTML = pagesHtml;

    const modal = document.getElementById('official-documents-modal');
    if (modal) {
        modal.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
