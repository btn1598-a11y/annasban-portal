/**
 * وحدة التشفير والمصادقة وإدارة الجلسات الآمنة
 * خوارزميات قياسية (PBKDF2-SHA512, HMAC-SHA256, Timing-Safe Comparison)
 */

const crypto = require('node:crypto');

// المفتاح السري الافتراضي للنظام (يمكن تجاوزه عبر متغيرات البيئة)
const JWT_SECRET = process.env.JWT_SECRET || 'annasban_sec_key_2026_super_confidential_9938472918';
const ITERATIONS = 100000;
const KEYLEN = 64;
const DIGEST = 'sha512';

/**
 * توليد ملح (Salt) وتشفير كلمة المرور عبر PBKDF2-SHA512
 * @param {string} password
 * @returns {{hash: string, salt: string}}
 */
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex');
    return { hash, salt };
}

/**
 * التحقق من كلمة المرور مع مقارنة زمنية آمنة (Timing-Safe) لمنع هجمات التوقيت
 * @param {string} password كلمة المرور المدخلة
 * @param {string} storedHash التشفير المخزن
 * @param {string} storedSalt الملح المخزن
 * @returns {boolean}
 */
function verifyPassword(password, storedHash, storedSalt) {
    try {
        const hash = crypto.pbkdf2Sync(password, storedSalt, ITERATIONS, KEYLEN, DIGEST).toString('hex');
        const hashBuf = Buffer.from(hash, 'hex');
        const storedBuf = Buffer.from(storedHash, 'hex');
        if (hashBuf.length !== storedBuf.length) return false;
        return crypto.timingSafeEqual(hashBuf, storedBuf);
    } catch (e) {
        return false;
    }
}

/**
 * توليد رمز جلسة عشوائي آمن (Cryptographically Secure Random Token)
 * @returns {string}
 */
function generateSecureToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * إنشاء رمز JWT موقع رقمياً بـ HMAC-SHA256 بدون أي اعتماديات خارجية
 * @param {object} payload البيانات المراد تضمينها
 * @param {number} expiresInSeconds مدة الصلاحية بالثواني (الافتراضي 8 ساعات)
 * @returns {string}
 */
function signToken(payload, expiresInSeconds = 28800) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const body = {
        ...payload,
        iat: now,
        exp: now + expiresInSeconds
    };

    const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
    const b64Body = Buffer.from(JSON.stringify(body)).toString('base64url');
    const signature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${b64Header}.${b64Body}`)
        .digest('base64url');

    return `${b64Header}.${b64Body}.${signature}`;
}

/**
 * التحقق من صحة وسلامة رمز JWT وفحص تاريخ الانتهاء
 * @param {string} token
 * @returns {object|null} البيانات المفكوكة إذا كان صالحاً، أو null إذا كان غير صالح
 */
function verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [b64Header, b64Body, signature] = parts;

    // إعادة حساب التوقيع ومقارنته بشكل آمن
    const expectedSig = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${b64Header}.${b64Body}`)
        .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return null;
    }

    try {
        const payload = JSON.parse(Buffer.from(b64Body, 'base64url').toString('utf8'));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            return null; // الرمز منتهي الصلاحية
        }
        return payload;
    } catch (e) {
        return null;
    }
}

/**
 * إنشاء بصمة تشفير رقمية للعقد (SHA-256 Signature Hash) للربط الموثق مع نفاذ
 * @param {object} contractData
 * @returns {string}
 */
function generateContractHash(contractData) {
    const canonicalString = JSON.stringify(contractData, Object.keys(contractData).sort());
    return crypto.createHash('sha256').update(canonicalString).digest('hex');
}

module.exports = {
    hashPassword,
    verifyPassword,
    generateSecureToken,
    signToken,
    verifyToken,
    generateContractHash
};
