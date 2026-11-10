/* ============================================================
   Carousel Design Engine — v2
   يرسم 4 شرائح (1080×1080) بأربعة أنماط تركيبية مختلفة،
   مع 14 شكلاً هندسياً للغلاف.
   ============================================================ */
(function (global) {
  'use strict';

  const SIZE = 1080;
  const FONT = "'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif";
  const HEX = /^#[0-9a-f]{6}$/i;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const AR = '٠١٢٣٤٥٦٧٨٩';
  const arNum = (n) => String(n).replace(/\d/g, (d) => AR[+d]);

  /* ---------------- colors ---------------- */

  function rgb(h) {
    const n = parseInt(h.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function hex(c) {
    const f = (v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
    return '#' + f(c.r) + f(c.g) + f(c.b);
  }
  function rgba(h, a) {
    const c = rgb(h);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  }
  function mix(a, b, t) {
    const A = rgb(a), B = rgb(b);
    return hex({ r: A.r + (B.r - A.r) * t, g: A.g + (B.g - A.g) * t, b: A.b + (B.b - A.b) * t });
  }
  function rgb2hsl(c) {
    const r = c.r / 255, g = c.g / 255, b = c.b / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return [h, s, l];
  }
  function hsl2hex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return hex({ r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 });
  }
  function lum(h) {
    const c = rgb(h);
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function contrast(a, b) {
    const A = Math.max(lum(a), lum(b)), B = Math.min(lum(a), lum(b));
    return (A + 0.05) / (B + 0.05);
  }

  // يهذّب أي لونين يقترحهما الموديل إلى لوحة هادئة ومقروءة
  function makePalette(input) {
    const bgIn = input && HEX.test(String(input.bg || '')) ? input.bg : '#F4EFE6';
    const acIn = input && HEX.test(String(input.accent || '')) ? input.accent : '#8A6A45';
    const b = rgb2hsl(rgb(bgIn));
    const h = b[0];
    const dark = b[2] < 0.45;
    const s = Math.min(b[1], dark ? 0.26 : 0.18);
    const l = dark ? clamp(b[2], 0.13, 0.21) : clamp(b[2], 0.91, 0.955);
    const bg = hsl2hex(h, s, l);
    const bg2 = hsl2hex(h, s * 0.92, dark ? l + 0.05 : l - 0.055);

    const a = rgb2hsl(rgb(acIn));
    const as = clamp(a[1], 0.26, 0.52);
    const al = dark ? clamp(a[2], 0.62, 0.78) : clamp(a[2], 0.28, 0.40);
    const accent = hsl2hex(a[0], as, al);
    const onAccent = contrast(accent, '#FFFFFF') >= 4.2 ? '#FFFFFF' : hsl2hex(a[0], 0.22, 0.10);

    return {
      dark: dark,
      bg: bg,
      bg2: bg2,
      ink: dark ? hsl2hex(h, 0.06, 0.965) : hsl2hex(h, 0.18, 0.14),
      inkSoft: dark ? hsl2hex(h, 0.05, 0.80) : hsl2hex(h, 0.10, 0.34),
      accent: accent,
      onAccent: onAccent,
      panel: dark ? mix(bg, '#FFFFFF', 0.07) : mix('#FFFFFF', bg, 0.10),
      line: dark ? 'rgba(255,255,255,0.16)' : rgba(hex(hsl2hex(h, 0.2, 0.2)), 0.14),
      accentSoft: rgba(accent, dark ? 0.14 : 0.085),
      accentWash: rgba(accent, dark ? 0.22 : 0.14),
      accentLine: rgba(accent, 0.40),
      glow: rgba(accent, dark ? 0.12 : 0.06),
      shadow: dark ? 'rgba(0,0,0,0.45)' : 'rgba(60,45,30,0.16)'
    };
  }

  /* ---------------- primitives ---------------- */

  function rr(ctx, x, y, w, h, r) {
    const rad = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }
  function archPath(ctx, x, y, w, h, rTop, rBottom) {
    const r = rBottom;
    ctx.beginPath();
    ctx.moveTo(x, y + rTop);
    ctx.arc(x + w / 2, y + rTop, w / 2, Math.PI, 0);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.closePath();
  }
  function cover(ctx, img, x, y, w, h) {
    const s = Math.max(w / img.width, h / img.height);
    const sw = w / s, sh = h / s;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
  }
  function contain(ctx, img, x, y, w, h) {
    const s = Math.min(w / img.width, h / img.height);
    const iw = img.width * s, ih = img.height * s;
    ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  }
  function shadowed(ctx, color, blur, dy, fn) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetY = dy;
    fn();
    ctx.restore();
  }
  function background(ctx, p, fx, fy, fr) {
    const g = ctx.createLinearGradient(0, 0, 0, SIZE);
    g.addColorStop(0, p.bg);
    g.addColorStop(1, p.bg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SIZE, SIZE);
    if (fr) {
      const rg = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
      rg.addColorStop(0, p.glow);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, SIZE, SIZE);
    }
  }

  // بطاقة صورة: خلفية ضبابية من الصورة نفسها + الصورة كاملة بدون قص
  function photoCard(ctx, img, x, y, w, h, r, p, opt) {
    opt = opt || {};
    const pad = opt.pad == null ? 20 : opt.pad;
    shadowed(ctx, p.shadow, 42, 16, function () {
      rr(ctx, x, y, w, h, r);
      ctx.fillStyle = opt.panel || p.panel;
      ctx.fill();
    });
    if (!img) {
      rr(ctx, x, y, w, h, r);
      ctx.strokeStyle = p.accentLine;
      ctx.lineWidth = 2;
      ctx.stroke();
      return;
    }

    const boxAR = w / h;
    const imgAR = img.width / img.height;
    const mismatch = Math.max(boxAR / imgAR, imgAR / boxAR);
    const fill = opt.mode || (mismatch > 1.95 ? 'contain' : 'cover');

    ctx.save();
    rr(ctx, x, y, w, h, r);
    ctx.clip();

    if (fill === 'cover') {
      cover(ctx, img, x, y, w, h);
    } else {
      // خلفية ضبابية تملأ البطاقة
      if ('filter' in ctx) ctx.filter = 'blur(30px) saturate(1.05)';
      cover(ctx, img, x - w * 0.08, y - h * 0.08, w * 1.16, h * 1.16);
      if ('filter' in ctx) ctx.filter = 'none';
      ctx.fillStyle = p.dark ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.30)';
      ctx.fillRect(x, y, w, h);
      contain(ctx, img, x + pad, y + pad, w - pad * 2, h - pad * 2);
    }
    ctx.restore();

    rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r);
    ctx.strokeStyle = opt.ring || 'rgba(0,0,0,0.07)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // شريط صورة عريض: صورة أفقية تملأ الشريط،
  // وصورة رأسية تُعرض كبطاقة عائمة على خلفية ضبابية من الصورة نفسها
  function photoBand(ctx, img, y, h, p) {
    const w = SIZE;
    const ar = img.width / img.height;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y, w, h);
    ctx.clip();

    if (ar >= 1.0) {
      cover(ctx, img, 0, y, w, h);
      ctx.restore();
      return;
    }

    if ('filter' in ctx) ctx.filter = 'blur(46px) saturate(1.05)';
    cover(ctx, img, -70, y - 70, w + 140, h + 140);
    if ('filter' in ctx) ctx.filter = 'none';
    ctx.fillStyle = p.dark ? 'rgba(0,0,0,0.24)' : 'rgba(255,255,255,0.26)';
    ctx.fillRect(0, y, w, h);

    const availH = h - 36;
    let ih = availH, iw = ih * ar;
    if (iw > w - 220) { iw = w - 220; ih = iw / ar; }
    const ix = (w - iw) / 2, iy = y + (h - ih) / 2;
    shadowed(ctx, 'rgba(0,0,0,0.28)', 34, 12, function () {
      rr(ctx, ix, iy, iw, ih, 14);
      ctx.fillStyle = p.panel;
      ctx.fill();
    });
    rr(ctx, ix, iy, iw, ih, 14);
    ctx.save();
    ctx.clip();
    ctx.drawImage(img, ix, iy, iw, ih);
    ctx.restore();
    ctx.restore();
  }

  function photoShape(ctx, img, shape, x, y, w, h, p) {    ctx.save();
    shape();
    ctx.fillStyle = p.panel;
    ctx.fill();
    ctx.restore();
    if (!img) return;
    ctx.save();
    shape();
    ctx.clip();
    cover(ctx, img, x, y, w, h);
    ctx.restore();
  }
  function circlePhoto(ctx, img, cx, cy, r, p) {
    photoShape(ctx, img, function () {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }, cx - r, cy - r, r * 2, r * 2, p);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /* ---------------- text ---------------- */

  function setFont(ctx, size, weight) {
    ctx.font = (weight || 400) + ' ' + size + 'px ' + FONT;
  }
  function wrapText(ctx, text, maxW) {
    const words = String(text == null ? '' : text).split(/\s+/).filter(Boolean);
    const out = [];
    let line = '';
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const test = line ? line + ' ' + w : w;
      if (line && ctx.measureText(test).width > maxW) {
        out.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
    return out.length ? out : [''];
  }
  // توزيع الأسطر بشكل متوازن: نجرّب عدة عروض ونختار الأقل تفاوتاً
  // مع عقوبة لأي سطر بكلمة واحدة (يتيمة)
  function wrapBalanced(ctx, text, maxW) {
    const base = wrapText(ctx, text, maxW);
    if (base.length < 2) return base;
    const score = function (lines) {
      const widths = lines.map(function (l) { return ctx.measureText(l).width; });
      const spread = Math.max.apply(null, widths) - Math.min.apply(null, widths);
      const ones = lines.filter(function (l) { return l.trim().split(' ').length === 1; }).length;
      return spread + ones * 420 + (widths[widths.length - 1] < maxW * 0.3 ? 200 : 0);
    };
    let best = base, bestScore = score(base);
    for (let f = 0.98; f >= 0.72; f -= 0.02) {
      const cand = wrapText(ctx, text, maxW * f);
      if (cand.length !== base.length) continue;
      const s = score(cand);
      if (s < bestScore) { best = cand; bestScore = s; }
    }
    return best;
  }
  function fitBlock(ctx, text, o) {
    const max = o.max || 88;
    const min = o.min || 34;
    const lh = o.lh || 1.3;
    const weight = o.weight || 800;
    const maxW = o.maxW || o.w || SIZE;
    let size = max;
    let lines;
    setFont(ctx, size, weight);
    lines = wrapBalanced(ctx, text, maxW);
    while (size > min && lines.length * size * lh > o.maxH) {
      size -= 2;
      setFont(ctx, size, weight);
      lines = wrapBalanced(ctx, text, maxW);
    }
    return { size: size, lines: lines, lh: size * lh, height: lines.length * size * lh, weight: weight };
  }
  function drawFit(ctx, f, x, y, color, align, alpha) {
    ctx.save();
    ctx.direction = 'rtl';
    ctx.textAlign = align || 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color;
    if (alpha != null) ctx.globalAlpha = alpha;
    setFont(ctx, f.size, f.weight);
    let base = y + f.size * 0.84;
    for (let i = 0; i < f.lines.length; i++) {
      ctx.fillText(f.lines[i], x, base);
      base += f.lh;
    }
    ctx.restore();
    return y + f.height;
  }
  function drawBlock(ctx, text, o) {
    if (!text) return o.y;
    const f = fitBlock(ctx, text, o);
    return drawFit(ctx, f, o.x, o.y, o.color || '#000', o.align, o.alpha);
  }
  function eyebrow(ctx, text, x, y, color, align, size, alpha) {
    ctx.save();
    ctx.direction = 'rtl';
    ctx.textAlign = align || 'right';
    ctx.textBaseline = 'alphabetic';
    setFont(ctx, size || 26, 500);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha == null ? 0.8 : alpha;
    ctx.fillText(text, x, y);
    ctx.restore();
  }
  function rule(ctx, x, y, w, h, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  // كتلة عنوان + نص، متمركزة عمودياً داخل المنطقة
  function textGroup(ctx, p, s, zone, opt) {
    opt = opt || {};
    const align = zone.align || 'right';
    const zoneH = zone.bottom - zone.top;
    const gap = opt.gap || 34;
    const bw = opt.bw || Math.min(zone.w, 760);
    const mk = (titleH) => fitBlock(ctx, s.title, {
      w: zone.w, maxH: titleH, max: opt.tmax || 82, min: opt.tmin || 38,
      weight: 700, lh: opt.tlh || 1.24
    });
    const mkBody = (h) => fitBlock(ctx, s.body, {
      w: bw, maxH: h, max: 40, min: 26, weight: 400, lh: 1.62
    });

    let tf = mk(zoneH);
    let bf = mkBody(280);
    if (tf.height + gap + bf.height > zoneH) {
      bf = mkBody(Math.max(60, zoneH * 0.42));
      tf = mk(Math.max(70, zoneH - bf.height - gap));
    }
    const total = Math.min(zoneH, tf.height + gap + bf.height);
    let y = zone.top + Math.max(0, (zoneH - total) / 2);

    drawFit(ctx, tf, zone.x, y, opt.titleColor || p.ink, align);
    y += tf.height;

    if (opt.rule) {
      const rx = align === 'right' ? zone.x - 92 : align === 'center' ? zone.x - 46 : zone.x;
      rule(ctx, rx, y + 12, 92, 5, opt.ruleColor || p.accent);
    }
    y += gap;

    drawFit(ctx, bf, opt.bodyX != null ? opt.bodyX : zone.x, y, opt.bodyColor || p.inkSoft, align, opt.bodyAlpha);
    return y + bf.height;
  }

  /* ---------------- footer ---------------- */

  function footer(ctx, p, i, color) {
    const ink = color || p.ink;
    const pad = 96;
    const gap = 10;
    const w = (SIZE - pad * 2 - gap * 3) / 4;
    for (let k = 0; k < 4; k++) {
      ctx.save();
      ctx.globalAlpha = k === i ? 0.95 : 0.22;
      ctx.fillStyle = ink;
      rr(ctx, pad + k * (w + gap), SIZE - 42, w, 6, 3);
      ctx.fill();
      ctx.restore();
    }
    eyebrow(ctx, arNum(i + 1) + ' / ' + arNum(4), pad, SIZE - 64, ink, 'left', 21, 0.55);
  }

  /* ============================================================
     الشريحة 1 — الغلاف
     ============================================================ */

  const HERO = {};

  HERO.arch = function (ctx, p, s, img) {
    background(ctx, p, 540, 340, 600);
    const x = 200, y = 72, w = 680, h = 500;
    ctx.save();
    archPath(ctx, x, y, w, h, 340, 36);
    ctx.fillStyle = p.accentSoft;
    ctx.fill();
    ctx.strokeStyle = p.accentLine;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    if (img) {
      ctx.save();
      archPath(ctx, x + 16, y + 16, w - 32, h - 32, 324, 26);
      ctx.clip();
      cover(ctx, img, x + 16, y + 16, w - 32, h - 32);
      ctx.restore();
    } else {
      ctx.save();
      ctx.strokeStyle = rgba(p.accent, 0.2);
      ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(540, y + h - 20, 170 + k * 44, Math.PI, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    textGroup(ctx, p, s, { x: 540, top: 640, bottom: 980, w: 860, align: 'center' }, { tmax: 78, tmin: 44, bw: 720, gap: 26, rule: 1 });
  };

  HERO.split = function (ctx, p, s, img) {
    background(ctx, p, 220, 860, 700);
    const pw = 376;
    ctx.fillStyle = p.accent;
    ctx.fillRect(SIZE - pw, 0, pw, SIZE);

    ctx.save();
    ctx.strokeStyle = rgba(p.onAccent, 0.15);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(SIZE - pw / 2, 110, 250, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(SIZE - pw / 2, 110, 310, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    photoCard(ctx, img, SIZE - pw + 36, 96, pw - 72, 440, 22, p, { pad: 16, ring: rgba(p.onAccent, 0.4) });
    eyebrow(ctx, arNum(1) + ' / ' + arNum(4), SIZE - pw / 2, 582, p.onAccent, 'center', 21, 0.7);

    textGroup(ctx, p, s, { x: 620, top: 190, bottom: 900, w: 550, align: 'right' }, { tmax: 74, tmin: 40, bw: 500, gap: 32, rule: 1 });
  };

  HERO.editorial = function (ctx, p, s, img) {
    background(ctx, p, 140, 860, 720);
    const wide = img && img.width / img.height > 1.25;

    if (img && wide) {
      photoBand(ctx, img, 690, 390, p);
      rule(ctx, 0, 688, SIZE, 2, p.accent);
    } else if (img) {
      photoCard(ctx, img, 96, 690, 350, 330, 22, p, { pad: 16 });
    } else {
      ctx.save();
      ctx.fillStyle = p.accentSoft;
      ctx.fillRect(0, 690, SIZE, 390);
      ctx.strokeStyle = rgba(p.accent, 0.2);
      ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.arc(540, 1080, 180 + k * 70, Math.PI, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    eyebrow(ctx, arNum(1) + ' / ' + arNum(4), 1018, 128, p.accent, 'right', 22, 1);
    rule(ctx, 1018 - 86, 150, 86, 4, p.accent);
    textGroup(ctx, p, s, { x: 986, top: 196, bottom: 640, w: 850, align: 'right' }, { tmax: 86, tmin: 46, bw: 720, gap: 34, rule: 1 });
  };

  HERO.band = function (ctx, p, s, img) {
    background(ctx, p, 540, 900, 620);
    ctx.fillStyle = p.accent;
    ctx.fillRect(0, 0, SIZE, 178);
    eyebrow(ctx, arNum(1) + ' / ' + arNum(4), 96, 104, p.onAccent, 'right', 22, 0.75);
    rule(ctx, 96, 128, 96, 4, p.onAccent, 0.55);

    textGroup(ctx, p, s, { x: 540, top: 232, bottom: 545, w: 880, align: 'center' }, { tmax: 82, tmin: 44, bw: 740, gap: 26 });
    if (img) photoCard(ctx, img, 300, 566, 480, 400, 26, p, { pad: 18 });
  };

  HERO.circle = function (ctx, p, s, img) {
    background(ctx, p, 540, 360, 620);
    ctx.save();
    ctx.beginPath();
    ctx.arc(540, 372, 318, 0, Math.PI * 2);
    ctx.fillStyle = p.accentSoft;
    ctx.fill();
    ctx.strokeStyle = p.accentLine;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    if (img) circlePhoto(ctx, img, 540, 372, 286, p);

    textGroup(ctx, p, s, { x: 540, top: 726, bottom: 980, w: 880, align: 'center' }, { tmax: 74, tmin: 42, bw: 740, gap: 24, rule: 1 });
  };

  HERO.grid = function (ctx, p, s, img) {
    background(ctx, p, 820, 220, 680);
    ctx.save();
    ctx.fillStyle = p.accent;
    ctx.globalAlpha = 0.32;
    for (let c = 0; c < 6; c++) {
      for (let r = 0; r < 6; r++) {
        ctx.beginPath();
        ctx.arc(100 + c * 52, 92 + r * 52, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    photoCard(ctx, img, 606, 604, 360, 360, 26, p, { pad: 18 });
    textGroup(ctx, p, s, { x: 986, top: 300, bottom: 596, w: 720, align: 'right' }, { tmax: 72, tmin: 42, bw: 640, gap: 24, rule: 1 });
  };

  HERO.wave = function (ctx, p, s, img) {
    background(ctx, p, 540, 900, 700);
    if (img) photoCard(ctx, img, 300, 84, 480, 336, 24, p, { pad: 16 });

    const base = 800;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, base + 50);
    ctx.bezierCurveTo(300, base - 50, 760, base + 70, SIZE, base + 4);
    ctx.lineTo(SIZE, SIZE);
    ctx.lineTo(0, SIZE);
    ctx.closePath();
    ctx.fillStyle = p.accentSoft;
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, base + 50);
    ctx.bezierCurveTo(300, base - 50, 760, base + 70, SIZE, base + 4);
    ctx.strokeStyle = p.accentLine;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    const top = img ? 452 : 300;
    textGroup(ctx, p, s, { x: 540, top: top, bottom: 762, w: 840, align: 'center' }, { tmax: 74, tmin: 42, bw: 700, gap: 24, rule: 1, titleH: 200 });
  };

  HERO.ticket = function (ctx, p, s, img) {
    background(ctx, p, 540, 540, 800);
    const x = 56, y = 56, w = SIZE - 112, h = SIZE - 112;
    shadowed(ctx, p.shadow, 40, 16, function () {
      rr(ctx, x, y, w, h, 38);
      ctx.fillStyle = p.panel;
      ctx.fill();
    });
    rr(ctx, x, y, w, h, 38);
    ctx.strokeStyle = p.line;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.fillStyle = p.bg2;
    ctx.beginPath(); ctx.arc(x, 540, 30, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w, 540, 30, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    eyebrow(ctx, arNum(1) + ' / ' + arNum(4), 540, 158, p.accent, 'center', 22, 1);
    textGroup(ctx, p, s, { x: 540, top: 215, bottom: 660, w: 800, align: 'center' }, { tmax: 84, tmin: 46, bw: 700, gap: 30, rule: 1 });

    ctx.save();
    ctx.setLineDash([10, 12]);
    ctx.strokeStyle = rgba(p.ink, 0.16);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 44, 706);
    ctx.lineTo(x + w - 44, 706);
    ctx.stroke();
    ctx.restore();

    if (img) circlePhoto(ctx, img, 540, 846, 92, p);
  };

  HERO.offset = function (ctx, p, s, img) {
    background(ctx, p, 300, 320, 700);
    ctx.save();
    ctx.translate(330, 360);
    ctx.rotate(-0.05);
    ctx.strokeStyle = p.accentLine;
    ctx.lineWidth = 3;
    rr(ctx, -188, -212, 470, 500, 26);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(330, 360);
    ctx.rotate(-0.05);
    photoCard(ctx, img, -235, -250, 470, 500, 26, p, { pad: 18 });
    ctx.restore();

    textGroup(ctx, p, s, { x: 986, top: 600, bottom: 940, w: 730, align: 'right' }, { tmax: 74, tmin: 42, bw: 640, gap: 26 });
    eyebrow(ctx, arNum(1), 986, 150, p.accent, 'right', 26, 1);
    rule(ctx, 986 - 86, 170, 86, 4, p.accent);
  };

  HERO.diagonal = function (ctx, p, s, img) {
    background(ctx, p, 900, 880, 640);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 846);
    ctx.lineTo(SIZE, 452);
    ctx.lineTo(SIZE, 700);
    ctx.lineTo(0, SIZE - 132);
    ctx.closePath();
    ctx.fillStyle = p.accentSoft;
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 846);
    ctx.lineTo(SIZE, 452);
    ctx.strokeStyle = p.accentLine;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    photoCard(ctx, img, 92, 96, 420, 440, 26, p, { pad: 18 });
    textGroup(ctx, p, s, { x: 986, top: 600, bottom: 972, w: 780, align: 'right' }, { tmax: 78, tmin: 44, bw: 660, gap: 24 });
    eyebrow(ctx, arNum(1) + ' / ' + arNum(4), 986, 132, p.accent, 'right', 22, 1);
  };

  HERO.halftone = function (ctx, p, s, img) {
    background(ctx, p, 860, 860, 700);
    ctx.save();
    ctx.fillStyle = p.accent;
    for (let r = 40; r < 660; r += 26) {
      const n = Math.max(3, Math.round(r / 16));
      for (let k = 0; k < n; k++) {
        const a = (k / (n - 1)) * (Math.PI / 2);
        ctx.globalAlpha = 0.42 * (1 - r / 780);
        ctx.beginPath();
        ctx.arc(8 + Math.cos(a) * r, 8 + Math.sin(a) * r, 4.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    photoCard(ctx, img, 588, 596, 392, 392, 26, p, { pad: 18 });
    textGroup(ctx, p, s, { x: 986, top: 200, bottom: 540, w: 740, align: 'right' }, { tmax: 76, tmin: 42, bw: 660, gap: 26, rule: 1 });
    eyebrow(ctx, arNum(1), 986, 130, p.accent, 'right', 24, 1);
  };

  HERO.polaroid = function (ctx, p, s, img) {
    background(ctx, p, 300, 320, 700);
    ctx.save();
    ctx.translate(332, 368);
    ctx.rotate(-0.055);
    shadowed(ctx, p.shadow, 46, 18, function () {
      rr(ctx, -230, -266, 460, 532, 6);
      ctx.fillStyle = p.panel;
      ctx.fill();
    });
    if (img) {
      ctx.save();
      rr(ctx, -208, -244, 416, 416, 3);
      ctx.clip();
      cover(ctx, img, -208, -244, 416, 416);
      ctx.restore();
    } else {
      rr(ctx, -208, -244, 416, 416, 3);
      ctx.fillStyle = p.accentSoft;
      ctx.fill();
    }
    rule(ctx, -208, 206, 132, 4, p.accent, 0.5);
    ctx.restore();

    textGroup(ctx, p, s, { x: 986, top: 400, bottom: 950, w: 690, align: 'right' }, { tmax: 76, tmin: 42, bw: 620, gap: 28 });
    eyebrow(ctx, arNum(1) + ' / ' + arNum(4), 986, 132, p.accent, 'right', 22, 1);
    rule(ctx, 986 - 86, 154, 86, 4, p.accent);
  };

  HERO.corner = function (ctx, p, s, img) {
    background(ctx, p, 540, 520, 780);
    ctx.save();
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.55;
    const m = 58, arm = 92;
    [[m, m, 1, 1], [SIZE - m, m, -1, 1], [m, SIZE - m, 1, -1], [SIZE - m, SIZE - m, -1, -1]].forEach(function (c) {
      ctx.beginPath();
      ctx.moveTo(c[0], c[1] + arm * c[3]);
      ctx.lineTo(c[0], c[1]);
      ctx.lineTo(c[0] + arm * c[2], c[1]);
      ctx.stroke();
    });
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(540, 250, 46, 0, Math.PI * 2);
    ctx.strokeStyle = p.accentLine;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(540, 250, 6, 0, Math.PI * 2);
    ctx.fillStyle = p.accent;
    ctx.fill();
    ctx.restore();

    if (img) circlePhoto(ctx, img, 540, 248, 116, p);

    textGroup(ctx, p, s, { x: 540, top: 400, bottom: 840, w: 800, align: 'center' }, { tmax: 84, tmin: 46, bw: 700, gap: 32, rule: 1 });
  };

  // صورة كاملة مع تدرّج غامق أسفلها
  HERO.fullbleed = function (ctx, p, s, img) {
    if (img) {
      cover(ctx, img, 0, 0, SIZE, SIZE);
    } else {
      background(ctx, p, 540, 400, 700);
      ctx.fillStyle = p.accentSoft;
      ctx.fillRect(0, 0, SIZE, SIZE);
    }
    const g = ctx.createLinearGradient(0, 300, 0, SIZE);
    g.addColorStop(0, 'rgba(10,10,10,0)');
    g.addColorStop(0.5, 'rgba(10,10,10,0.52)');
    g.addColorStop(1, 'rgba(10,10,10,0.93)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SIZE, SIZE);

    textGroup(ctx, p, s, { x: 540, top: 640, bottom: 950, w: 900, align: 'center' }, {
      tmax: 84, tmin: 46, bw: 760, gap: 24, rule: 1,
      titleColor: '#FFFFFF', bodyColor: 'rgba(255,255,255,0.86)', ruleColor: '#FFFFFF'
    });
    eyebrow(ctx, arNum(1) + ' / ' + arNum(4), 540, 110, '#FFFFFF', 'center', 22, 0.75);
  };

  const MOTIFS = ['arch', 'split', 'editorial', 'band', 'circle', 'grid', 'wave', 'ticket', 'offset', 'diagonal', 'halftone', 'polaroid', 'corner', 'fullbleed'];

  /* ============================================================
     الشريحة 2 — الشرح
     ============================================================ */

  function explain(ctx, p, s, img, seed) {
    background(ctx, p, 980, 920, 640);
    const wide = img && img.width / img.height > 1.25;
    let top;

    if (img && wide) {
      photoBand(ctx, img, 0, 424, p);
      const f = ctx.createLinearGradient(0, 300, 0, 424);
      f.addColorStop(0, 'rgba(0,0,0,0)');
      f.addColorStop(1, 'rgba(0,0,0,0.18)');
      ctx.fillStyle = f;
      ctx.fillRect(0, 300, SIZE, 124);
      top = 480;
    } else if (img) {
      photoCard(ctx, img, 94, 682, 340, 340, 24, p, { pad: 16 });
      top = 150;
    } else {
      ctx.fillStyle = p.accentSoft;
      ctx.fillRect(0, 0, SIZE, 340);
      ctx.save();
      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      setFont(ctx, 170, 800);
      ctx.fillStyle = p.accent;
      ctx.globalAlpha = 0.3;
      ctx.fillText('٢', 540, 190);
      ctx.restore();
      top = 400;
    }

    eyebrow(ctx, arNum(2) + ' / ' + arNum(4), 984, top, p.accent, 'right', 22, 1);
    rule(ctx, 96, top + 22, SIZE - 192, 1.5, p.line);

    const tf = fitBlock(ctx, s.title, { w: 860, maxH: 200, max: 72, min: 40, weight: 700, lh: 1.22 });
    let y = drawFit(ctx, tf, 984, top + 56, p.ink, 'right');
    rule(ctx, 984 - 96, y + 16, 96, 5, p.accent);
    y += 48;

    const paras = String(s.body || '').split('\n').map(function (t) { return t.trim(); }).filter(Boolean).slice(0, 2);
    paras.forEach(function (t, k) {
      y = drawBlock(ctx, t, { x: 984, y: y, w: 800, maxH: 110, max: 38, min: 26, weight: 400, color: k === 0 ? p.ink : p.inkSoft, align: 'right', lh: 1.6 }) + 14;
    });
  }

  /* ============================================================
     الشريحة 3 — الفوائد
     ============================================================ */

  function list(ctx, p, s, img, seed) {
    background(ctx, p, 900, 160, 560);
    eyebrow(ctx, arNum(3) + ' / ' + arNum(4), 984, 128, p.accent, 'right', 22, 1);

    const tf = fitBlock(ctx, s.title, { w: 820, maxH: 120, max: 58, min: 38, weight: 700, lh: 1.2 });
    const ty = drawFit(ctx, tf, 984, 172, p.ink, 'right');
    rule(ctx, 984 - 96, ty + 22, 96, 5, p.accent);

    let items = String(s.body || '').split('\n').map(function (t) { return t.replace(/^[-•✓\s]+/, '').trim(); }).filter(Boolean).slice(0, 4);
    if (!items.length) items = ['—'];

    const top = 392, bottom = 956;
    const n = items.length;
    const rowH = (bottom - top) / n;

    items.forEach(function (it, k) {
      const cy = top + k * rowH + rowH / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(932, cy, 31, 0, Math.PI * 2);
      ctx.fillStyle = p.accent;
      ctx.fill();
      ctx.fillStyle = p.onAccent;
      ctx.direction = 'rtl';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      setFont(ctx, 27, 700);
      ctx.fillText(arNum(k + 1), 932, cy + 2);
      ctx.restore();

      const f = fitBlock(ctx, it, { w: 700, maxH: 110, max: 42, min: 28, weight: 500, lh: 1.4 });
      drawFit(ctx, f, 866, cy - f.height / 2, p.ink, 'right');

      if (k < n - 1) rule(ctx, 96, top + (k + 1) * rowH, 836, 1.5, p.ink, 0.10);
    });
  }

  /* ============================================================
     الشريحة 4 — الدعوة
     ============================================================ */

  function cta(ctx, p, s, img, seed) {
    const paneled = seed % 2 === 1;
    background(ctx, p, 540, 500, 780);

    if (paneled) {
      const x = 62, y = 80, w = SIZE - 124, h = 840;
      shadowed(ctx, p.shadow, 50, 20, function () {
        rr(ctx, x, y, w, h, 42);
        ctx.fillStyle = p.accent;
        ctx.fill();
      });
      ctx.save();
      ctx.strokeStyle = rgba(p.onAccent, 0.16);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + w - 30, y + 30, 190, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + w - 30, y + 30, 250, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      if (img) circlePhoto(ctx, img, 540, 250, 96, p);
      const tf = fitBlock(ctx, s.title, { w: 780, maxH: 200, max: 82, min: 48, weight: 700, lh: 1.22 });
      let yy = drawFit(ctx, tf, 540, 380, p.onAccent, 'center');
      rule(ctx, 540 - 42, yy + 24, 84, 5, p.onAccent, 0.55);
      const bf = fitBlock(ctx, s.body, { w: 700, maxH: 150, max: 40, min: 28, weight: 400, lh: 1.6 });
      drawFit(ctx, bf, 540, yy + 60, p.onAccent, 'center', 0.9);
      return 'ink';
    }

    ctx.fillStyle = p.accent;
    ctx.fillRect(0, 0, SIZE, SIZE);
    const g = ctx.createLinearGradient(0, 0, 0, SIZE);
    g.addColorStop(0, 'rgba(255,255,255,0.06)');
    g.addColorStop(0.55, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.14)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SIZE, SIZE);

    ctx.save();
    ctx.strokeStyle = rgba(p.onAccent, 0.15);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(1010, 60, 300, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(1010, 60, 384, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = rgba(p.onAccent, 0.28);
    ctx.lineWidth = 2;
    rr(ctx, 44, 44, SIZE - 88, SIZE - 88, 6);
    ctx.stroke();
    ctx.restore();

    if (img) circlePhoto(ctx, img, 540, 250, 108, p);
    eyebrow(ctx, arNum(4) + ' / ' + arNum(4), 540, 148, p.onAccent, 'center', 22, 0.85);

    const tf = fitBlock(ctx, s.title, { w: 800, maxH: 240, max: 88, min: 50, weight: 700, lh: 1.22 });
    let yy = drawFit(ctx, tf, 540, 404, p.onAccent, 'center');
    rule(ctx, 540 - 44, yy + 26, 88, 5, p.onAccent, 0.5);
    const bf = fitBlock(ctx, s.body, { w: 720, maxH: 170, max: 40, min: 28, weight: 400, lh: 1.62 });
    drawFit(ctx, bf, 540, yy + 64, p.onAccent, 'center', 0.9);
    return 'onAccent';
  }

  /* ---------------- API ---------------- */

  function drawSlide(ctx, o) {
    const p = o.p;
    const motif = HERO[o.motif] ? o.motif : 'arch';
    let footColor = p.ink;
    ctx.save();
    ctx.clearRect(0, 0, SIZE, SIZE);
    if (o.index === 0) {
      HERO[motif](ctx, p, o.slide, o.img);
    } else if (o.index === 1) {
      explain(ctx, p, o.slide, o.img, o.seed || 0);
    } else if (o.index === 2) {
      list(ctx, p, o.slide, o.img, o.seed || 0);
    } else {
      footColor = cta(ctx, p, o.slide, o.img, o.seed || 0) || p.ink;
      footColor = footColor === 'onAccent' ? p.onAccent : p.ink;
    }
    ctx.restore();
    footer(ctx, p, o.index, footColor);
  }

  function pickMotif(exclude, seed) {
    const pool = MOTIFS.filter(function (m) { return m !== exclude; });
    const s = Math.abs(seed || Date.now());
    return pool[s % pool.length];
  }

  global.CarouselEngine = {
    SIZE: SIZE,
    FONT: FONT,
    MOTIFS: MOTIFS,
    palette: makePalette,
    drawSlide: drawSlide,
    pickMotif: pickMotif,
    arNum: arNum
  };
})(typeof window !== 'undefined' ? window : globalThis);





