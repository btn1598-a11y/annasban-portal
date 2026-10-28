# ==============================================================================
# شركة النصبان للحراسات الأمنية - حزمة الحاوية الإنتاجية الآمنة
# معزولة متعددة المراحل بمستخدم غير جذري (Non-root user) ومتوافقة مع المعايير السعودية
# ==============================================================================

FROM node:22-alpine AS base

# تثبيت الحزم الأساسية للفحص الأمني
RUN apk add --no-cache curl tzdata \
    && cp /usr/share/zoneinfo/Asia/Riyadh /etc/localtime \
    && echo "Asia/Riyadh" > /etc/timezone

WORKDIR /app

# إنشاء مستخدم ومجموعة مخصصة بدون صلاحيات جذرية لتعزيز الأمان
RUN addgroup -S -g 1001 annasban \
    && adduser -S -u 1001 -G annasban annasban

# نسخ ملفات المنظومة
COPY --chown=annasban:annasban package.json ./
COPY --chown=annasban:annasban index.html ./
COPY --chown=annasban:annasban hr_engine.js ./
COPY --chown=annasban:annasban logo.jpg ./
COPY --chown=annasban:annasban server.js ./
COPY --chown=annasban:annasban lib/ ./lib/
COPY --chown=annasban:annasban database/ ./database/
COPY --chown=annasban:annasban test_system.js ./

# إنشاء مجلد البيانات وتعيين الصلاحيات للمستخدم غير الجذري
RUN mkdir -p /app/data && chown -R annasban:annasban /app

# الانتقال للمستخدم غير الجذري
USER annasban

# متغيرات البيئة للإنتاج
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DATABASE_PATH=/app/data/annasban_security.db

# المنفذ المستمع
EXPOSE 3000

# فحص دوري لصحة الحاوية (Healthcheck)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# تشغيل الخادم
CMD ["node", "server.js"]
