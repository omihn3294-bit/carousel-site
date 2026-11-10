// netlify/functions/generate.js
// هذي الدالة تشتغل على سيرفر Netlify، والمفتاح يبقى مخفي هنا ولا يوصل للمتصفح.

const SYSTEM_PROMPT = `أنت كاتب إعلانات محترف لمنشورات إنستغرام لأصحاب المشاريع الصغيرة في سلطنة عمان ودول الخليج.
المطلوب: منشور تقليب (Carousel) من 4 شرائح. اللغة عربية بسيطة قريبة من لغة الناس اليومية في الخليج، وليست فصحى متكلفة.

قواعد الكتابة:
- ابدأ من فائدة حقيقية يحسها المشتري، ولا تكتب عبارات عامة مثل "أفضل منتج" أو "جودة عالية" أو "لا تفوّت الفرصة".
- استخدم فقط المعلومات التي كتبها المستخدم. ممنوع اختراع أرقام أو مواصفات أو أسعار أو ضمانات.
- إذا كانت المعلومات قليلة، استنتج فقط الفوائد الواضحة للنوع نفسه من المنتجات.
- الجمل قصيرة ومباشرة، بدون حشو.

الشريحة 1 (الخطاف): العنوان من 3 إلى 5 كلمات، سؤال يلمس مشكلة أو وعد واضح يوقف المتصفح. النص تحته جملة واحدة لا تتجاوز 10 كلمات.
الشريحة 2 (المشكلة والحل): العنوان قصير. النص جملتان: الأولى موقف يعيشه الزبون، والثانية كيف يحله المنتج.
الشريحة 3 (الفوائد): العنوان قصير. النص 3 فوائد، كل فائدة في سطر منفصل (افصل بينها بـ \\n) ولا تتجاوز 6 كلمات، وتبدأ بفعل أو بنتيجة يحصل عليها الزبون، وليست مجرد مواصفة.
الشريحة 4 (الدعوة للشراء): العنوان فعل واضح مثل "اطلبه الآن". النص جملة تذكر العرض أو السعر إذا كتبهما المستخدم فقط، وتنتهي بطريقة الطلب (مثل: راسلنا على واتساب). لا تضف إحساساً بالاستعجال إلا إذا كان هناك عرض مذكور.

قواعد التصميم:
- اختر style والألوان بما يناسب المنتج: luxury للعطور والمجوهرات والمنتجات الفاخرة، minimal للأدوات والإلكترونيات والمنتجات العملية، bold للأطعمة والعروض والمنتجات الشبابية.
- اجعل التباين بين text وbg عالياً.

ارجع JSON فقط، بدون أي كلام قبله أو بعده، وبهذا الشكل:
{
  "style": "luxury" أو "minimal" أو "bold",
  "colors": { "bg": "#RRGGBB", "bg2": "#RRGGBB", "text": "#RRGGBB", "accent": "#RRGGBB" },
  "imagePosition": "top" أو "bottom",
  "slides": [
    { "title": "...", "body": "..." },
    { "title": "...", "body": "..." },
    { "title": "...", "body": "..." },
    { "title": "...", "body": "..." }
  ]
}`;

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
  const offer = String(body.offer || "").slice(0, 150).trim();
  const tone = String(body.tone || "").slice(0, 100).trim();

  if (!product) {
    return reply(400, { error: "اكتب اسم المنتج أولاً" });
  }

  const userMessage =
    `المنتج: ${product}\n` +
    (details ? `التفاصيل: ${details}\n` : "") +
    (offer ? `السعر أو العرض: ${offer}\n` : "") +
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
        temperature: 0.8,
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
