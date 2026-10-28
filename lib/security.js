/**
 * وحدة الحماية والأمان السيبراني المتقدمة
 * تتضمن Rate Limiting، ترويسات الأمان الصارمة، ومنع تسريب المسارات والأخطاء
 */

// جدول تتبع محاولات الطلبات لكل IP للحماية من هجمات التخمين والقوة العمياء (Brute Force)
const ipRateLimits = new Map();

/**
 * فحص معدل الطلبات للـ IP المحدد
 * @param {string} ip عنوان الـ IP
 * @param {string} actionType نوع العملية (مثل 'login' أو 'api')
 * @param {number} maxAttempts الحد الأقصى للمحاولات المسموح بها في النافذة
 * @param {number} windowMs نافذة الوقت بالمللي ثانية (مثلاً 15 دقيقة)
 * @returns {{allowed: boolean, remaining: number, retryAfterSeconds?: number}}
 */
function checkRateLimit(ip, actionType = 'default', maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    const key = `${ip}:${actionType}`;
    const now = Date.now();
    let record = ipRateLimits.get(key);

    if (!record) {
        record = { count: 1, resetTime: now + windowMs };
        ipRateLimits.set(key, record);
        return { allowed: true, remaining: maxAttempts - 1 };
    }

    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
        return { allowed: true, remaining: maxAttempts - 1 };
    }

    record.count++;

    if (record.count > maxAttempts) {
        const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
        return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds
        };
    }

    return {
        allowed: true,
        remaining: maxAttempts - record.count
    };
}

/**
 * تنظيف السجلات المنتهية بشكل دوري لتجنب تسريب الذاكرة
 */
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of ipRateLimits.entries()) {
        if (now > record.resetTime) {
            ipRateLimits.delete(key);
        }
    }
}, 5 * 60 * 1000).unref();

/**
 * تطبيق ترويسات الأمان القياسية (Security Headers) على الاستجابة
 * @param {import('node:http').ServerResponse} res
 */
function applySecurityHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com https://unpkg.com; img-src 'self' data: https: blob:; script-src 'self' 'unsafe-inline' https://unpkg.com;"
    );
}

/**
 * إرسال استجابة خطأ آمنة خالية تماماً من تفاصيل الخادم أو مسارات الملفات (No Stack Traces)
 * @param {import('node:http').ServerResponse} res
 * @param {number} statusCode
 * @param {string} clientMessage
 * @param {string} [errorCode]
 */
function sendSafeError(res, statusCode, clientMessage, errorCode = 'ERR_SECURITY_VIOLATION') {
    applySecurityHeaders(res);
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
        JSON.stringify({
            success: false,
            error: {
                code: errorCode,
                message: clientMessage,
                timestamp: new Date().toISOString()
            }
        })
    );
}

/**
 * إرسال استجابة نجاح بتنسيق موحد
 * @param {import('node:http').ServerResponse} res
 * @param {any} data
 * @param {number} statusCode
 */
function sendSuccess(res, data, statusCode = 200) {
    applySecurityHeaders(res);
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
        JSON.stringify({
            success: true,
            data,
            timestamp: new Date().toISOString()
        })
    );
}

module.exports = {
    checkRateLimit,
    applySecurityHeaders,
    sendSafeError,
    sendSuccess
};
