/* Carte de l'Artefact : les destinations captées, disposées autour de l'Artefact.
   La distance au centre traduit la menace. Survol : aperçu ; clic : sélection.
   Une recherche active fait briller les mondes qui contiennent la cible et
   éteint les autres. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const h = AN.h;
  const TAU = Math.PI * 2;

  const WM = (AN.WorldMap = {});

  /** Menace maximale représentée : les anneaux s'adaptent aux mondes captés. */
  const maxThreat = (worlds) => Math.max(3, ...worlds.map((w) => w.threat || 1));
  /** Rayon normalisé (0..1) d'un anneau de menace. */
  const ringN = (k, maxT) => 0.3 + 0.7 * ((k - 0.5) / maxT);
  /** Demi-axes de l'ellipse utile (la carte est plus large que haute). */
  const axes = (W, H) => ({ RX: W / 2 - 46, RY: H / 2 - 34 });

  /** Positions stables : l'angle vient de la graine, la distance de la menace. */
  function layout(worlds, W, H) {
    const cx = W / 2, cy = H / 2;
    const { RX, RY } = axes(W, H);
    const cosmic = worlds.length && worlds[0].scale && worlds[0].scale !== 'region';
    const maxT = maxThreat(worlds);
    const out = [];
    worlds.forEach((w, i) => {
      const rng = AN.RNG.from(w.seed, 'carte');
      let a = rng.float(0, TAU);
      const n = cosmic ? 0.45 + 0.45 * ((i + 0.5) / Math.max(1, worlds.length)) : ringN(w.threat, maxT) + rng.float(-0.04, 0.04);
      const size = 16 + w.zones.length * 4 + (cosmic ? 4 : 0);
      const at = (ang) => ({ x: cx + Math.cos(ang) * n * RX, y: cy + Math.sin(ang) * n * RY });
      // écarte les mondes trop proches (le long de leur anneau)
      for (let k = 0; k < 40; k++) {
        const p = at(a);
        if (!out.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < o.size + size + 30)) break;
        a += 0.23;
      }
      const p = at(a);
      out.push({ w, x: p.x, y: p.y, size, a });
    });
    return out;
  }

  /** Une planète : ses zones en secteurs, le cœur au centre. */
  WM.drawPlanet = function (ctx, w, x, y, r, t, opt = {}) {
    const n = w.zones.length;
    const rot = t * 0.15 + (w.seed % 100);
    ctx.save();
    ctx.globalAlpha = opt.alpha != null ? opt.alpha : 1;
    ctx.fillStyle = 'rgba(28,34,48,0.18)';
    ctx.beginPath(); ctx.ellipse(x + r * 0.15, y + r * 0.9, r * 0.9, r * 0.25, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < n; i++) {
      const b = D.BIOME[w.zones[i].biome];
      ctx.fillStyle = b.ground[1];
      ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, rot + (i / n) * TAU, rot + ((i + 1) / n) * TAU); ctx.closePath(); ctx.fill();
      ctx.fillStyle = U.rgba(b.wall.top, 0.55);
      const m = rot + ((i + 0.5) / n) * TAU;
      ctx.beginPath(); ctx.arc(x + Math.cos(m) * r * 0.62, y + Math.sin(m) * r * 0.62, r * 0.16, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = D.BIOME[w.heart.biome].ground[2];
    ctx.strokeStyle = AN.INK; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, r * 0.34, 0, TAU); ctx.fill(); ctx.stroke();
    // relief et lumière
    const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(0.6, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = AN.INK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    if (w.scale && w.scale !== 'region') {
      ctx.strokeStyle = U.rgba(AN.INK, 0.45); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(x, y, r * 1.5, r * 0.45, -0.35, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  };

  /**
   * Carte interactive. opts : { prof, worlds, selected, search, onSelect(w) }.
   * Renvoie un élément ; l'animation s'arrête d'elle-même quand il quitte la page.
   */
  WM.create = function (opts) {
    const cv = h('canvas', { class: 'worldmap', tabindex: '0', role: 'img', 'aria-label': 'Carte des destinations captées par l’Artefact' });
    const wrap = h('div', { class: 'worldmap-wrap' }, cv);
    const st = { hover: null, selected: opts.selected || null, items: [], W: 0, H: 0, t: 0, last: 0 };
    const search = opts.search;
    const scan = (w) => (search ? AN.Search.scanWorld(w, search) : null);

    const resize = () => {
      const W = Math.max(320, Math.floor(wrap.clientWidth || 640));
      const H = Math.round(Math.min(440, Math.max(300, W * 0.62)));
      const dpr = window.devicePixelRatio || 1;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.height = H + 'px';
      st.W = W; st.H = H; st.dpr = dpr;
      st.items = layout(opts.worlds, W, H);
    };
    const pick = (ev) => {
      const r = cv.getBoundingClientRect();
      const x = ((ev.clientX - r.left) / r.width) * st.W, y = ((ev.clientY - r.top) / r.height) * st.H;
      let best = null, bd = 1e9;
      for (const it of st.items) { const d = Math.hypot(it.x - x, it.y - y) - it.size; if (d < 14 && d < bd) { bd = d; best = it; } }
      return best;
    };
    cv.addEventListener('mousemove', (ev) => { const it = pick(ev); st.hover = it ? it.w : null; cv.style.cursor = it ? 'pointer' : 'default'; });
    cv.addEventListener('mouseleave', () => { st.hover = null; });
    cv.addEventListener('click', (ev) => {
      const it = pick(ev);
      if (!it) return;
      AN.Audio.play('ui');
      st.selected = it.w;
      if (opts.onSelect) opts.onSelect(it.w);
    });
    // clavier : flèches pour parcourir les mondes, Entrée pour choisir
    cv.addEventListener('keydown', (ev) => {
      if (!st.items.length) return;
      const i = Math.max(0, st.items.findIndex((it) => it.w === st.selected));
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') { st.selected = st.items[(i + 1) % st.items.length].w; ev.preventDefault(); }
      else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') { st.selected = st.items[(i - 1 + st.items.length) % st.items.length].w; ev.preventDefault(); }
      else return;
      AN.Audio.play('ui');
      if (opts.onSelect) opts.onSelect(st.selected);
    });

    const draw = (now) => {
      if (!cv.isConnected) { if (st.started) return; }
      else st.started = true;
      const dt = st.last ? Math.min(0.05, (now - st.last) / 1000) : 0;
      st.last = now;
      st.t += dt;
      if (!st.W || Math.abs(st.W - Math.floor(wrap.clientWidth)) > 4) resize();
      const ctx = cv.getContext('2d');
      const { W, H, t } = st;
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      ctx.fillStyle = '#fbfbfa';
      ctx.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;
      const { RX, RY } = axes(W, H);
      const cosmic = opts.worlds.length && opts.worlds[0].scale && opts.worlds[0].scale !== 'region';
      // anneaux de menace, numérotés en haut
      ctx.font = '700 10px ' + AN.FONT_UI; ctx.textAlign = 'center';
      const rings = cosmic ? [1 / 3, 2 / 3, 1] : [];
      const maxT = maxThreat(opts.worlds);
      if (!cosmic) for (let k = 1; k <= maxT; k++) rings.push(ringN(k, maxT));
      rings.forEach((n, i) => {
        ctx.strokeStyle = U.rgba(AN.INK, 0.09); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(cx, cy, n * RX, n * RY, 0, 0, TAU); ctx.stroke();
        if (cosmic) return;
        const lx = cx + Math.cos(-2.2) * n * RX, ly = cy + Math.sin(-2.2) * n * RY;
        ctx.fillStyle = '#fbfbfa'; ctx.strokeStyle = U.rgba(AN.INK, 0.3);
        ctx.beginPath(); ctx.arc(lx, ly, 7, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = U.rgba(AN.INK, 0.6); ctx.fillText(String(i + 1), lx, ly + 3.5);
      });
      if (!cosmic) { ctx.textAlign = 'left'; ctx.font = '600 10px ' + AN.FONT_UI; ctx.fillStyle = U.rgba(AN.INK, 0.5); ctx.fillText('Anneaux : menace', 10, 16); }
      // balayage du scanner (dans l'espace de l'ellipse)
      const sweep = t * 0.9;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(RX / RY, 1);
      const g = ctx.createConicGradient ? ctx.createConicGradient(sweep - 0.6, 0, 0) : null;
      if (g) {
        g.addColorStop(0, U.rgba(AN.CYAN, 0)); g.addColorStop(0.09, U.rgba(AN.CYAN, 0.12)); g.addColorStop(0.1, U.rgba(AN.CYAN, 0)); g.addColorStop(1, U.rgba(AN.CYAN, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, RY + 16, 0, TAU); ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = U.rgba(AN.CYAN, 0.35); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(sweep) * (RX + 16), cy + Math.sin(sweep) * (RY + 16)); ctx.stroke();
      // l'Artefact
      for (let i = 0; i < 3; i++) {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * (0.4 + i * 0.3) * (i % 2 ? -1 : 1));
        const s = 7 + i * 5;
        ctx.strokeStyle = i === 0 ? AN.CYAN : U.rgba(AN.INK, 0.7 - i * 0.2); ctx.lineWidth = i === 0 ? 2 : 1;
        ctx.strokeRect(-s, -s, s * 2, s * 2);
        ctx.restore();
      }
      // route vers le monde choisi
      const sel = st.items.find((it) => it.w === st.selected);
      if (sel) {
        ctx.strokeStyle = U.rgba(AN.CYAN, 0.7); ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t * 20;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(sel.x, sel.y); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
      }
      // les mondes
      for (const it of st.items) {
        const w = it.w;
        const res = scan(w);
        const dim = search && (!res || !res.total);
        const bob = Math.sin(t * 1.3 + it.a * 3) * 2;
        const x = it.x, y = it.y + bob, r = it.size * (st.hover === w ? 1.12 : 1);
        // passage du balayage : un éclat
        const da = Math.abs(U.angDiff(sweep, Math.atan2((it.y - cy) / RY, (it.x - cx) / RX)));
        if (da < 0.15 && !dim) { ctx.fillStyle = U.rgba(AN.CYAN, 0.25 * (1 - da / 0.15)); ctx.beginPath(); ctx.arc(x, y, r + 10, 0, TAU); ctx.fill(); }
        WM.drawPlanet(ctx, w, x, y, r, t, { alpha: dim ? 0.3 : 1 });
        if (w.rescue) { ctx.strokeStyle = AN.STAMP; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(x, y, r + 6, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
        if (res && res.total) {
          ctx.strokeStyle = AN.CYAN; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(x, y, r + 7 + Math.sin(t * 4) * 2, 0, TAU); ctx.stroke();
          const badge = String(res.total);
          ctx.font = '700 11px ' + AN.FONT_UI;
          const bw = ctx.measureText(badge).width + 10;
          ctx.fillStyle = AN.CYAN; ctx.fillRect(x + r * 0.7, y - r - 6, bw, 16);
          ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.fillText(badge, x + r * 0.7 + bw / 2, y - r + 6);
        }
        if (w.found) { ctx.fillStyle = AN.CYAN; ctx.beginPath(); ctx.moveTo(x - r - 10, y); ctx.lineTo(x - r - 4, y - 5); ctx.lineTo(x - r - 4, y + 5); ctx.closePath(); ctx.fill(); }
        // pictogrammes : peuple, caveaux
        let ix = x - r * 0.8;
        if (w.scan.civ && w.scan.civ !== 'Aucune') {
          ctx.fillStyle = '#ffffff'; ctx.strokeStyle = AN.INK; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(ix, y + r + 4); ctx.lineTo(ix + 5, y + r - 1); ctx.lineTo(ix + 10, y + r + 4); ctx.lineTo(ix + 10, y + r + 10); ctx.lineTo(ix, y + r + 10); ctx.closePath(); ctx.fill(); ctx.stroke();
          ix += 14;
        }
        (w.scan.vaults || []).forEach((k) => {
          ctx.fillStyle = k === '?' ? '#9aa0a8' : D.KEYS[k].color;
          ctx.beginPath(); ctx.arc(ix + 4, y + r + 7, 3.5, 0, TAU); ctx.fill();
          ix += 10;
        });
        if (st.selected === w) { ctx.strokeStyle = AN.INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r + 13, 0, TAU); ctx.stroke(); }
        ctx.font = '600 11px ' + AN.FONT_UI; ctx.textAlign = 'center';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(251,251,250,0.9)';
        ctx.strokeText(w.code, x, y - r - 10); ctx.fillStyle = dim ? U.rgba(AN.INK, 0.4) : AN.INK; ctx.fillText(w.code, x, y - r - 10);
      }
      // bulle du monde survolé
      const hv = st.items.find((it) => it.w === st.hover);
      if (hv) {
        const w = hv.w;
        const lines = [w.code + ' · ' + w.region, (w.scale && w.scale !== 'region' ? D.ECHELONS[w.scale].name + ' · ' : '') + 'menace ' + w.scan.threat + ' · ' + w.zones.length + ' zones · ' + w.scan.type];
        if (search) lines.push('Recherche : ' + AN.Search.summary(w, search));
        else if (w.rescue) lines.push('Mission de sauvetage');
        ctx.font = '600 12px ' + AN.FONT_UI;
        const bw = Math.min(W - 20, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20), bh = lines.length * 17 + 12;
        let bx = hv.x + hv.size + 14, by = hv.y - bh / 2;
        if (bx + bw > W - 6) bx = hv.x - hv.size - 14 - bw;
        by = U.clamp(by, 6, H - bh - 6);
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = AN.INK; ctx.lineWidth = 1.5;
        ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh);
        ctx.textAlign = 'left';
        lines.forEach((l, i) => { ctx.fillStyle = i ? (i === 2 && search ? AN.CYAN : U.rgba(AN.INK, 0.75)) : AN.INK; ctx.font = (i ? '400 ' : '600 ') + '12px ' + AN.FONT_UI; ctx.fillText(l, bx + 10, by + 20 + i * 17); });
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    wrap.select = (w) => { st.selected = w; };
    return wrap;
  };
})();
