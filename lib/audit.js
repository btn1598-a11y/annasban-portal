/**
 * نظام سجل التدقيق الأمني والامتثال لنظام حماية البيانات الشخصية السعودي (PDPL Audit Engine)
 * توثيق كل عملية وصول للبيانات الحساسة لضمان المساءلة وحماية بيانات المواطنين
 */

class AuditLogger {
    /**
     * @param {import('node:sqlite').DatabaseSync} db
     */
    constructor(db) {
        this.db = db;
        this.insertStmt = db.prepare(`
            INSERT INTO audit_logs 
            (actor_id, actor_name, actor_role, action_type, resource_accessed, details, ip_address, user_agent, severity)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
    }

    /**
     * تسجيل حدث وصول أو تعديل بيانات في سجل الامتثال
     * @param {object} params
     * @param {number|null} [params.actorId]
     * @param {string} params.actorName
     * @param {string} params.actorRole
     * @param {string} params.actionType نوع العملية
     * @param {string} params.resourceAccessed المورد المستهدف
     * @param {string} [params.details]
     * @param {string} params.ipAddress
     * @param {string} [params.userAgent]
     * @param {'INFO'|'WARNING'|'CRITICAL'} [params.severity]
     */
    log({
        actorId = null,
        actorName,
        actorRole,
        actionType,
        resourceAccessed,
        details = '',
        ipAddress,
        userAgent = 'Unknown',
        severity = 'INFO'
    }) {
        try {
            this.insertStmt.run(
                actorId,
                actorName || 'نظام غير معروف',
                actorRole || 'GUEST',
                actionType,
                resourceAccessed,
                details,
                ipAddress || '127.0.0.1',
                userAgent.substring(0, 255),
                severity
            );
        } catch (err) {
            console.error('فشل في كتابة سجل التدقيق الأمني (PDPL Log Failure):', err.message);
        }
    }

    /**
     * جلب سجلات التدقيق للمشرفين والمسؤولين مع إمكانية الفلترة
     * @param {number} limit
     * @param {number} offset
     * @returns {Array<object>}
     */
    getLogs(limit = 100, offset = 0) {
        try {
            const stmt = this.db.prepare(`
                SELECT id, actor_name, actor_role, action_type, resource_accessed, details, ip_address, severity, created_at
                FROM audit_logs
                ORDER BY id DESC
                LIMIT ? OFFSET ?
            `);
            return stmt.all(limit, offset);
        } catch (err) {
            console.error('خطأ في استرجاع سجلات التدقيق:', err.message);
            return [];
        }
    }

    /**
     * إجمالي عدد سجلات التدقيق المسجلة
     * @returns {number}
     */
    getLogCount() {
        try {
            const stmt = this.db.prepare('SELECT COUNT(*) as total FROM audit_logs');
            const result = stmt.get();
            return result ? result.total : 0;
        } catch (err) {
            return 0;
        }
    }
}

module.exports = AuditLogger;
