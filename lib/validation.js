/**
 * مكتبة التحقق والتدقيق الصارم للبيانات المدخلة
 * مطابقة للأنظمة والمعايير السعودية (الهوية الوطنية، الجوال، الآيبان)
 */

/**
 * التحقق من الهوية الوطنية السعودية (أو هوية المقيم) باستخدام خوارزمية لُهن (Luhn Algorithm)
 * @param {string} id رقم الهوية الوطنية المكون من 10 أرقام
 * @returns {{isValid: boolean, message: string, type?: 'citizen' | 'resident'}}
 */
function validateSaudiNationalID(id) {
    if (!id || typeof id !== 'string') {
        return { isValid: false, message: 'رقم الهوية مطلوب' };
    }

    const cleanId = id.trim().replace(/\s+/g, '');

    if (!/^\d{10}$/.test(cleanId)) {
        return { isValid: false, message: 'يجب أن يتكون رقم الهوية من 10 أرقام فقط' };
    }

    const firstDigit = cleanId[0];
    if (firstDigit !== '1' && firstDigit !== '2') {
        return { isValid: false, message: 'الهوية يجب أن تبدأ بالرقم 1 (مواطن) أو 2 (مقيم)' };
    }

    let sum = 0;
    for (let i = 0; i < 10; i++) {
        let num = parseInt(cleanId[i], 10);
        if (i % 2 === 0) {
            num *= 2;
            if (num > 9) num -= 9;
        }
        sum += num;
    }

    if (sum % 10 !== 0) {
        return { isValid: false, message: 'رقم الهوية غير صحيح (فشل التدقيق الحسابي Luhn)' };
    }

    return {
        isValid: true,
        message: 'رقم الهوية صحيح',
        type: firstDigit === '1' ? 'citizen' : 'resident'
    };
}

/**
 * التحقق من رقم الجوال السعودي
 * يدعم صيغ: 05xxxxxxxx, 5xxxxxxxx, +9665xxxxxxxx, 009665xxxxxxxx
 * @param {string} phone
 * @returns {{isValid: boolean, formatted?: string, message: string}}
 */
function validateSaudiMobile(phone) {
    if (!phone || typeof phone !== 'string') {
        return { isValid: false, message: 'رقم الجوال مطلوب' };
    }

    let clean = phone.trim().replace(/[\s\-\(\)]/g, '');

    if (clean.startsWith('+966')) clean = clean.substring(4);
    else if (clean.startsWith('00966')) clean = clean.substring(5);
    else if (clean.startsWith('966')) clean = clean.substring(3);

    if (clean.startsWith('5') && clean.length === 9) {
        clean = '0' + clean;
    }

    if (!/^05\d{8}$/.test(clean)) {
        return { isValid: false, message: 'رقم الجوال غير صحيح، يجب أن يبدأ بـ 05 ويتكون من 10 أرقام' };
    }

    return {
        isValid: true,
        formatted: clean,
        message: 'رقم الجوال صحيح'
    };
}

/**
 * التحقق من رقم الحساب البنكي الدولي السعودي (IBAN) طبقاً للمعيار الدولي ISO 7064 Mod 97-10
 * @param {string} iban
 * @returns {{isValid: boolean, formatted?: string, message: string}}
 */
function validateSaudiIBAN(iban) {
    if (!iban || typeof iban !== 'string') {
        return { isValid: false, message: 'رقم الآيبان مطلوب' };
    }

    const clean = iban.trim().toUpperCase().replace(/\s+/g, '');

    if (!clean.startsWith('SA')) {
        return { isValid: false, message: 'الآيبان السعودي يجب أن يبدأ بحرفي SA' };
    }

    if (clean.length !== 24) {
        return { isValid: false, message: `طول الآيبان غير صحيح (${clean.length} حرف، والمطلوب 24 حرفاً)` };
    }

    if (!/^SA\d{22}$/.test(clean)) {
        return { isValid: false, message: 'الآيبان يجب أن يحتوي على رمز SA يليه 22 رقماً' };
    }

    // خوارزمية Mod 97-10: نقل أول 4 خانات للآخر وتحويل الأحرف لأرقام (A=10, S=28)
    const rearranged = clean.slice(4) + clean.slice(0, 4);
    let numericStr = '';
    for (let char of rearranged) {
        const code = char.charCodeAt(0);
        if (code >= 65 && code <= 90) {
            numericStr += (code - 55).toString();
        } else {
            numericStr += char;
        }
    }

    // حساب باقي القسمة على 97 باستخدام سلاسل الأرقام لتجنب تجاوز حد الأرقام في JS
    let remainder = 0;
    for (let i = 0; i < numericStr.length; i += 7) {
        const chunk = remainder.toString() + numericStr.substring(i, i + 7);
        remainder = parseInt(chunk, 10) % 97;
    }

    if (remainder !== 1) {
        return { isValid: false, message: 'رمز التحقق في رقم الآيبان غير صالح (فشل اختبار ISO 7064)' };
    }

    return {
        isValid: true,
        formatted: clean,
        message: 'رقم الآيبان البنكي صحيح ومعتمد'
    };
}

/**
 * تنظيف النصوص والحماية من ثغرات XSS وحقن التعليمات
 * @param {string} text
 * @returns {string}
 */
function sanitizeInput(text) {
    if (typeof text !== 'string') return text;
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

module.exports = {
    validateSaudiNationalID,
    validateSaudiMobile,
    validateSaudiIBAN,
    sanitizeInput
};
