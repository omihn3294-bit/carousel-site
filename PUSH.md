# رفع المشروع على GitHub

> ملاحظة: هذا المجلد جاهز للرفع كما هو. لا تحتاج أي build.

---

## الطريقة ١ — من المتصفح (بدون تثبيت أي شيء)

1. افتح <https://github.com/new>.
2. اسم المستودع مثلًا: `carousel-site` — اختر **Public** أو **Private** — ثم **Create repository**.
3. في صفحة المستودع اضغط **Add file → Upload files**.
4. اسحب هذه الملفات/المجلدات كما هي:
   - `index.html`
   - `engine.js`
   - `netlify.toml`
   - `README.md`
   - مجلد `netlify` كاملًا (بداخله `functions/generate.js`)
5. اضغط **Commit changes**.

انتهى — المشروع صار على GitHub.

---

## الطريقة ٢ — بالأوامر (لو Git مثبّت على جهازك)

```bash
cd المسار/إلى/مجلد/المشروع
git init
git add .
git commit -m "v2: محرك تصميم جديد + إصلاحات API"
git branch -M main
git remote add origin https://github.com/USERNAME/carousel-site.git
git push -u origin main
```

> استبدل `USERNAME` باسم حسابك. أول `push` سيطلب تسجيل الدخول (Personal Access Token أو نافذة المتصفح).

---

## الطريقة ٣ — GitHub CLI

```bash
gh auth login          # سجّل دخولك أنت
gh repo create carousel-site --public --source=. --remote=origin --push
```

---

## ربط Netlify بـ GitHub (نشر تلقائي عند كل تحديث)

1. Netlify → **Add new site → Import an existing project**.
2. اختر **GitHub** ثم المستودع.
3. الإعدادات:
   - **Build command**: اتركه فارغًا
   - **Publish directory**: `.`
   - **Functions directory**: `netlify/functions` (يقرأها من `netlify.toml` تلقائيًا)
4. **Add environment variable**:
   - `GROQ_API_KEY` = مفتاحك من <https://console.groq.com/keys>
5. **Deploy site**.

بعد ذلك أي `git push` يعيد النشر تلقائيًا.

---

## تحديثات لاحقة

```bash
git add .
git commit -m "وصف التعديل"
git push
```

---

## تنبيه أمني

- **لا تشارك مفتاح GitHub (Token) مع أي شخص أو أداة.**
- `GROQ_API_KEY` يبقى في Netlify فقط، ولا يوضع أبدًا داخل ملفات المستودع.
- إذا كان المستودع Public، تأكد أن ملفاتك لا تحتوي أي مفاتيح.
