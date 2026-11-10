// netlify/functions/generate.js
// هذي الدالة تشتغل على سيرفر Netlify، والمفتاح يبقى مخفي هنا ولا يوصل للمتصفح.

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

function reply(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(obj),
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return reply(405, { error: "يجب أن يكون الطلب POST" });
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return reply(500, { error: "المفتاح GROQ_API_KEY غير موجود في إعدادات Netlify" });
  }

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return reply(400, { error: "الطلب غير صالح" });
  }

  const product = String(body.product || "").slice(0, 200).trim();
  const details = String(body.details || "").slice(0, 800).trim();
  const tone = String(body.tone || "").slice(0, 100).trim();

  if (!product) {
    return reply(400, { error: "اكتب اسم المنتج أولاً" });
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
        // لو الموديل تغيّر اسمه، غيّره من إعدادات Netlify (GROQ_MODEL) بدون تعديل الكود
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
      return reply(502, { error: msg });
    }

    const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch (e) {
      return reply(502, { error: "رد الذكاء الاصطناعي غير مرتب، جرّب مرة ثانية" });
    }

    if (!Array.isArray(parsed.slides) || parsed.slides.length < 4) {
      return reply(502, { error: "الرد ناقص، جرّب مرة ثانية" });
    }

    return reply(200, parsed);
  } catch (err) {
    return reply(500, { error: "تعذّر الاتصال بالخدمة، جرّب بعد قليل" });
  }
};
