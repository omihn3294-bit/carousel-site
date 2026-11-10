// netlify/functions/generate.js
// دالة Netlify: تكتب نصوص المنشور وتختار لوحة الألوان والشكل المناسب.
// المفتاح يبقى على الخادم ولا يصل للمتصفح.

const MOTIFS = [
  'arch', 'split', 'editorial', 'band', 'circle', 'grid', 'wave',
  'ticket', 'offset', 'diagonal', 'halftone', 'polaroid', 'corner', 'fullbleed'
];

const MOTIF_HINT = {
  arch: 'قوس كبير (فخم/هدايا)',
  split: 'لوحة لونية جانبية (عصري/واضح)',
  editorial: 'مجلاتي بمساحات بيضاء (راقٍ)',
  band: 'شريط علوي ملوّن (بسيط/جريء)',
  circle: 'دائرة ناعمة (ودود/عناية)',
  grid: 'شبكة نقاط (تقني/شبابي)',
  wave: 'موجة سفلية (خفيف/منعش)',
  ticket: 'إطار تذكرة (عرض/خصم)',
  offset: 'إطار مائل (إبداعي)',
  diagonal: 'شريط مائل (حيوي)',
  halftone: 'نقاط متدرجة (طباعة/فني)',
  polaroid: 'صورة بولارويد (دافئ/شخصي)',
  corner: 'زوايا فقط (هادئ/فاخر)',
  fullbleed: 'صورة تملأ الشريحة (بصري/منتج)'
};

const SYSTEM_PROMPT = `أنت كاتب إعلانات عربي محترف لمنشورات إنستغرام لأصحاب المشاريع الصغيرة في الخليج.

اكتب منشور تقليب من 4 شرائح، بلغة عربية بسيطة قريبة من كلام الناس، لا فصحى متكلفة.
- استخدم فقط معلومات المستخدم. ممنوع اختراع أرقام أو أسعار أو مواصفات أو ضمانات.
- لو المعلومات قليلة، اذكر الفوائد الواضحة لنوع المنتج نفسه دون اختلاق تفاصيل.
- جمل قصيرة. لا حشو ولا عبارات مثل "أفضل منتج" أو "جودة عالية" أو "لا تفوّت الفرصة".

الشريحة 1 (الخطاف): عنوان 3 إلى 5 كلمات، سؤال يلمس مشكلة أو وعد واضح. تحته جملة واحدة ≤ 10 كلمات.
الشريحة 2 (المشكلة والحل): عنوان قصير، ونص من جملتين: موقف يعيشه الزبون ثم كيف يحله المنتج.
الشريحة 3 (الفوائد): عنوان قصير، و3 فوائد كل واحدة في سطر منفصل (افصل بـ \\n)، كل فائدة ≤ 6 كلمات وتبدأ بفعل أو نتيجة للزبون لا بمواصفة.
الشريحة 4 (الدعوة): عنوان فعل واضح مثل "اطلبه الآن"، ونص يذكر السعر أو العرض فقط إن ذكره المستخدم، وينتهي بطريقة الطلب (واتساب/رابط). لا استعجال بلا عرض فعلي.

التصميم: اختر لوحة لونية وشكلاً يناسبان روح المنتج.
- palette: لونان فقط #RRGGBB. bg خلفية هادئة (كريمي، رملي، وردي ناعم، أخضر باهت، أو كحلي/غامق)، وaccent لون تمييز منسجم غير فاقع. الكود يضبط التباين تلقائياً.
- motif: شكل الغلاف، اختر واحداً فقط من: ${MOTIFS.map(m => m + ' (' + MOTIF_HINT[m] + ')').join('، ')}.

أرجع JSON فقط بهذا الشكل:
{"palette":{"bg":"#RRGGBB","accent":"#RRGGBB"},"motif":"arch","slides":[{"title":"...","body":"..."},{"title":"...","body":"..."},{"title":"...","body":"..."},{"title":"...","body":"..."}]}`;

const HEX = /^#[0-9a-f]{6}$/i;

function reply(statusCode, obj, extra) {
  return {
    statusCode,
    headers: Object.assign({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }, extra || {}),
    body: JSON.stringify(obj)
  };
}

// حماية بسيطة من الإفراط في الطلبات (لكل نسخة دالة)
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < 60000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 500) hits.clear();
  return list.length > 12;
}

function clean(s, max) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max);
}

function firstJson(text) {
  const t = String(text || '').replace(/```json|```/gi, '').trim();
  try { return JSON.parse(t); } catch (e) {}
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a > -1 && b > a) {
    try { return JSON.parse(t.slice(a, b + 1)); } catch (e) {}
  }
  return null;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return reply(405, { error: 'يجب أن يكون الطلب POST' }, { Allow: 'POST' });
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return reply(500, { error: 'المفتاح GROQ_API_KEY غير موجود في إعدادات Netlify' });
  }

  const ip = (event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || 'unknown');
  if (limited(ip)) {
    return reply(429, { error: 'طلبات كثيرة في وقت قصير، انتظر دقيقة وجرّب.' });
  }

  let body = {};
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : (event.body || '{}');
    body = JSON.parse(raw);
  } catch (e) {
    return reply(400, { error: 'الطلب غير صالح' });
  }

  const product = clean(body.product, 200);
  const details = clean(body.details, 800);
  const offer = clean(body.offer, 150);
  const tone = clean(body.tone, 100);
  const avoid = MOTIFS.indexOf(clean(body.avoid, 40)) > -1 ? clean(body.avoid, 40) : '';

  if (!product) {
    return reply(400, { error: 'اكتب اسم المنتج أولاً' });
  }

  const userMessage =
    `المنتج: ${product}\n` +
    (details ? `التفاصيل: ${details}\n` : '') +
    (offer ? `السعر أو العرض: ${offer}\n` : '') +
    (tone ? `الأسلوب: ${tone}\n` : '') +
    (avoid ? `لا تختر الشكل: ${avoid}\n` : '');

  // مهلة صريحة حتى لا تعلّق الدالة
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  let res, data;
  try {
    res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        temperature: 0.75,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ]
      }),
      signal: ctrl.signal
    });
    data = await res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err && err.name === 'AbortError') {
      return reply(504, { error: 'الخدمة تأخّرت، جرّب مرة ثانية.' });
    }
    return reply(502, { error: 'تعذّر الاتصال بالخدمة، جرّب بعد قليل.' });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const status = res.status;
    if (status === 429) return reply(429, { error: 'ضغط على الخدمة حالياً، انتظر لحظات وجرّب.' });
    if (status === 401 || status === 403) return reply(502, { error: 'مفتاح الخدمة غير صالح في إعدادات Netlify.' });
    const msg = (data && data.error && data.error.message) || 'خطأ من خدمة النصوص';
    return reply(502, { error: msg });
  }

  const text = data && data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : '';
  const parsed = firstJson(text);
  if (!parsed) {
    return reply(502, { error: 'رد الذكاء الاصطناعي غير مرتب، جرّب مرة ثانية.' });
  }

  const slides = Array.isArray(parsed.slides) ? parsed.slides : [];
  const norm = slides
    .map(s => ({ title: clean(s && s.title, 90), body: clean(s && s.body, 320) }))
    .filter(s => s.title && s.body)
    .slice(0, 4);

  if (norm.length < 4) {
    return reply(502, { error: 'الرد ناقص، جرّب مرة ثانية.' });
  }

  const pal = parsed.palette || {};
  const palette = {
    bg: HEX.test(String(pal.bg || '')) ? pal.bg : '#F4EFE6',
    accent: HEX.test(String(pal.accent || '')) ? pal.accent : '#8A6A45'
  };

  let motif = MOTIFS.indexOf(parsed.motif) > -1 ? parsed.motif : '';
  if (!motif) motif = MOTIFS[Math.floor(Math.random() * MOTIFS.length)];
  if (motif === avoid) motif = MOTIFS[(MOTIFS.indexOf(motif) + 1) % MOTIFS.length];

  return reply(200, {
    palette,
    motif,
    seed: Math.floor(Math.random() * 1000000),
    slides: norm
  });
};
