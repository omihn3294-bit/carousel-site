// api/generate.js
// هذي الدالة تشتغل على سيرفر Vercel، والمفتاح يبقى مخفي هنا ولا يوصل للمتصفح.

const SYSTEM_PROMPT = `أنت كاتب إعلانات ومصمم منشورات لإنستغرام للمتاجر الصغيرة في سلطنة عمان.
المطلوب: منشور تقليب (Carousel) من 4 شرائح بالعربية الواضحة، قصير ومقنع.
ارجع JSON فقط، بدون أي كلام قبله أو بعده، وبهذا الشكل بالضبط:
{
  "style": "luxury" أو "minimal" أو "bold",
  "colors": {
    "bg": "#RRGGBB لون الخلفية الأول",
    "bg2": "#RRGGBB لون الخلفية الثاني للتدرج",
    "text": "#RRGGBB لون النص، يجب أن يظهر بوضوح فوق الخلفية",
    "accent": "#RRGGBB لون التمييز"
  },
  "imagePosition": "top" أو "bottom",
  "slides": [
    { "title": "عنوان جذاب لا يتجاوز 6 كلمات", "body": "جملة قصيرة تشد الانتباه" },
    { "title": "المشكلة والحل", "body": "جملتان قصيرتان: المشكلة ثم الحل" },
    { "title": "لماذا هذا المنتج", "body": "3 مميزات قصيرة، كل ميزة في سطر منفصل (افصل بينها بـ \\n)" },
    { "title": "دعوة للشراء", "body": "جملة قصيرة تدفع للطلب الآن" }
  ]
}
قواعد التصميم:
- اختر style والألوان بما يناسب المنتج والمناسبة (فخم للعطور والذهب، بسيط للأدوات، جريء وملوّن للأطعمة والعروض).
- اجعل التباين بين text وbg عالياً.
- لا تخترع أسعاراً أو معلومات غير مذكورة.`;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "يجب أن يكون الطلب POST" });
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "المفتاح GROQ_API_KEY غير موجود في إعدادات Vercel" });
  }

  const body = req.body || {};
  const product = String(body.product || "").slice(0, 200).trim();
  const details = String(body.details || "").slice(0, 800).trim();
  const tone = String(body.tone || "").slice(0, 100).trim();

  if (!product) {
    return res.status(400).json({ error: "اكتب اسم المنتج أولاً" });
  }

  const userMessage =
    `المنتج: ${product}\n` +
    (details ? `التفاصيل: ${details}\n` : "") +
    (tone ? `الأسلوب المطلوب: ${tone}\n` : "");

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        // لو الموديل تغيّر اسمه، غيّره من إعدادات Vercel (GROQ_MODEL) بدون تعديل الكود
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      const msg = (data && data.error && data.error.message) || "خطأ من Groq";
      return res.status(502).json({ error: msg });
    }

    const text = data.choices?.[0]?.message?.content || "";
    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch (e) {
      return res.status(502).json({ error: "رد الذكاء الاصطناعي غير مرتب، جرّب مرة ثانية" });
    }

    if (!Array.isArray(parsed.slides) || parsed.slides.length < 4) {
      return res.status(502).json({ error: "الرد ناقص، جرّب مرة ثانية" });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: "تعذّر الاتصال بالخدمة، جرّب بعد قليل" });
  }
};
