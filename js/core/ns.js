/* L'Archive du Néant — espace de noms, utilitaires, aide DOM, bus d'événements.
   Tous les scripts sont "classiques" (pas de modules ES) pour que le jeu
   fonctionne aussi bien en ouvrant index.html directement qu'en ligne. */
(function () {
  'use strict';
  const AN = (window.AN = window.AN || {});
  AN.VERSION = '1.8.1';
  AN.Data = AN.Data || {};

  const U = (AN.Util = {});
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  U.dist2 = (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; };
  U.angle = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
  U.angDiff = (a, b) => {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
  U.easeOut = (t) => 1 - Math.pow(1 - t, 3);
  U.easeIn = (t) => t * t * t;
  U.easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  U.smooth = (t) => t * t * (3 - 2 * t);
  U.fmt = (n) => Math.round(n).toLocaleString('fr-FR');
  U.pct = (n) => Math.round(n * 100) + ' %';
  let uidCounter = Math.floor(Math.random() * 1e6);
  U.uid = (p = 'u') => p + (++uidCounter).toString(36) + Math.floor(Math.random() * 46656).toString(36);
  U.plural = (n, one, many) => (Math.abs(n) >= 2 ? many : one);
  U.sumValues = (obj) => Object.values(obj || {}).reduce((a, b) => a + b, 0);

  /* ---------- couleurs ---------- */
  const rgbCache = new Map();
  U.rgb = (hex) => {
    let c = rgbCache.get(hex);
    if (c) return c;
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h, 16) || 0;
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache.set(hex, c);
    return c;
  };
  U.toHex = (r, g, b) =>
    '#' + [r, g, b].map((v) => U.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  U.rgba = (hex, a) => {
    const c = U.rgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  };
  U.mix = (a, b, t) => {
    const A = U.rgb(a), B = U.rgb(b);
    return U.toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  };
  U.shade = (hex, amt) => (amt >= 0 ? U.mix(hex, '#ffffff', amt) : U.mix(hex, '#000000', -amt));
  U.rgbToHsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  };
  U.hslToHex = (h, s, l) => {
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return U.toHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
  };
  /** Décale la teinte, multiplie la saturation, ajoute de la luminosité. */
  U.tint = (hex, deg = 0, sat = 1, light = 0) => {
    const c = U.rgb(hex);
    const [h, s, l] = U.rgbToHsl(c[0], c[1], c[2]);
    return U.hslToHex(h + deg, U.clamp(s * sat, 0, 1), U.clamp(l + light, 0, 1));
  };

  /* ---------- aide DOM ---------- */
  AN.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'value') el.value = v;
        else if (k === 'checked' || k === 'disabled' || k === 'selected') el[k] = !!v;
        else el.setAttribute(k, v === true ? '' : String(v));
      }
    }
    const add = (c) => {
      if (c == null || c === false) return;
      if (Array.isArray(c)) c.forEach(add);
      else if (c instanceof Node) el.appendChild(c);
      else el.appendChild(document.createTextNode(String(c)));
    };
    kids.forEach(add);
    return el;
  };
  AN.clear = (el) => { while (el && el.firstChild) el.removeChild(el.firstChild); return el; };

  /* ---------- bus d'événements ---------- */
  AN.Bus = {
    handlers: {},
    on(evt, fn) { (this.handlers[evt] = this.handlers[evt] || []).push(fn); },
    off(evt, fn) { this.handlers[evt] = (this.handlers[evt] || []).filter((f) => f !== fn); },
    emit(evt, ...args) { (this.handlers[evt] || []).slice().forEach((f) => f(...args)); },
  };

  /* ---------- journal de débogage ---------- */
  AN.debug = /[?&]debug=1/.test(location.search);
  AN.log = (...a) => { if (AN.debug) console.log('[AN]', ...a); };
})();
