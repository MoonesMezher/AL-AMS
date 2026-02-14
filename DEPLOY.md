# دليل النشر (Deployment Guide)

## النشر على Host واحد

هذا المشروع مصمم ليعمل كـ **مشروع واحد** على **host واحد**. الـ Frontend والـ Backend يعملان من نفس الخادم.

## الملفات المهمة

- `server.js` - الخادم الرئيسي (Express)
- `index.html` - الواجهة الأمامية
- `data.json` - قاعدة البيانات (يتم إنشاؤها تلقائياً)
- `package.json` - التبعيات

## خطوات النشر

### 1. على خادم محلي أو VPS

```bash
# نسخ الملفات إلى الخادم
scp -r * user@your-server:/path/to/app

# على الخادم
cd /path/to/app
npm install
npm start
```

### 2. استخدام PM2 (موصى به للإنتاج)

```bash
# تثبيت PM2
npm install -g pm2

# تشغيل التطبيق
pm2 start server.js --name accounting-app

# حفظ الإعدادات
pm2 save
pm2 startup
```

### 3. استخدام Nginx كـ Reverse Proxy (اختياري)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. استخدام Environment Variables

يمكنك تغيير المنفذ باستخدام متغير البيئة:

```bash
PORT=8080 npm start
```

أو في ملف `.env`:
```
PORT=8080
```

## النشر على خدمات الاستضافة

### Heroku

1. إنشاء `Procfile`:
```
web: node server.js
```

2. نشر:
```bash
heroku create your-app-name
git push heroku main
```

### Railway

1. رفع المشروع إلى GitHub
2. ربط المشروع في Railway
3. Railway سيكتشف `package.json` تلقائياً

### Render

1. ربط GitHub repository
2. اختيار Node.js
3. Build Command: `npm install`
4. Start Command: `npm start`

### DigitalOcean App Platform

1. ربط GitHub repository
2. اختيار Node.js
3. سيتم اكتشاف الإعدادات تلقائياً

## ملاحظات مهمة

1. **البيانات**: ملف `data.json` سيتم إنشاؤه تلقائياً عند أول تشغيل
2. **النسخ الاحتياطي**: احرص على نسخ `data.json` بانتظام
3. **المنفذ**: افتراضي 3000، يمكن تغييره عبر `PORT` environment variable
4. **CORS**: تم تفعيل CORS للسماح بالطلبات من أي مصدر

## التحقق من النشر

بعد النشر، افتح المتصفح واذهب إلى:
- `http://your-domain.com` أو
- `http://your-server-ip:3000`

يجب أن ترى صفحة تسجيل الدخول.

## استكشاف الأخطاء

### الخادم لا يعمل
- تحقق من أن Node.js مثبت
- تحقق من المنفذ غير مستخدم
- راجع logs: `pm2 logs accounting-app`

### البيانات لا تُحفظ
- تحقق من صلاحيات الكتابة في المجلد
- تأكد من وجود `data.json`

### API لا يعمل
- تأكد من أن جميع routes تبدأ بـ `/api`
- تحقق من console المتصفح للأخطاء
