/* Carte de l'Artefact : les destinations captées, disposées autour de l'Artefact.
   La distance au centre traduit le danger pour vous (1.15) : quatre anneaux, Facile
   au centre, Mortel au bord. Survol : aperçu ; clic : sélection.
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

  /** Les quatre anneaux du danger (1.15) : rayon normalisé (0..1) de leurs bords, et l'écart de niveaux qu'ils couvrent. */
  const BANDS = [
    { r0: 0.26, r1: 0.44, g0: -22, g1: -6 },
    { r0: 0.44, r1: 0.64, g0: -6, g1: 3 },
    { r0: 0.64, r1: 0.82, g0: 3, g1: 9 },
    { r0: 0.82, r1: 1, g0: 9, g1: 24 },
  ];
  WM.COLORS = ['#22808a', '#3f7d2a', '#b8641a', '#b3261e'];
  /** Rayon normalisé d'un monde, d'après son danger : l'anneau, puis l'écart à l'intérieur de l'anneau. */
  WM.radius = function (d) {
    const b = BANDS[d.rank];
    return b.r0 + (b.r1 - b.r0) * (0.15 + 0.7 * U.clamp((d.gap - b.g0) / (b.g1 - b.g0), 0, 1));
  };
  const dangerOf = (w) => AN.Danger.of(w, AN.Game.profile);
  /** Demi-axes de l'ellipse utile (la carte est plus large que haute). */
  const axes = (W, H) => ({ RX: W / 2 - 46, RY: H / 2 - 34 });

  /** Positions stables : l'angle vient de la graine, la distance du danger. */
  function layout(worlds, W, H) {
    const cx = W / 2, cy = H / 2;
    const { RX, RY } = axes(W, H);
    const cosmic = worlds.length && worlds[0].scale && worlds[0].scale !== 'region';
    const out = [];
    // les étiquettes des anneaux, en haut : les mondes s'en écartent
    const marks = BANDS.map((b) => ({ x: cx, y: cy - ((b.r0 + b.r1) / 2) * RY }));
    // chevauchement (planète et nom au-dessus) : 0 si la place est libre
    const clash = (p, size) => {
      let s = 0;
      for (const o of out) { const m = o.size + size + 24; s += Math.max(0, m - Math.abs(o.x - p.x)) * Math.max(0, m + 8 - Math.abs(o.y - p.y)); }
      for (const m of marks) s += Math.max(0, 44 + size - Math.abs(m.x - p.x)) * Math.max(0, 24 + size - Math.abs(m.y - p.y));
      return s;
    };
    worlds.forEach((w) => {
      const rng = AN.RNG.from(w.seed, 'carte');
      let a = rng.float(0, TAU);
      const danger = dangerOf(w);
      const band = BANDS[danger.rank];
      const n0 = WM.radius(danger) + rng.float(-0.02, 0.02);
      const size = 16 + w.zones.length * 4 + (cosmic ? 4 : 0);
      const at = (ang, n) => ({ x: cx + Math.cos(ang) * n * RX, y: cy + Math.sin(ang) * n * RY });
      // écarte les mondes trop proches : le long de leur anneau, puis un peu plus près ou plus loin, sans quitter l'anneau ;
      // si la carte est pleine, la place la moins encombrée
      let p = null, best = Infinity;
      for (const dn of [0, -0.06, 0.06, -0.11, 0.11, -0.16, 0.16]) {
        const n = U.clamp(n0 + dn, band.r0 + 0.02, Math.min(1.04, band.r1 - 0.02));
        for (let k = 0; k < 28; k++) {
          const q = at(a + k * 0.23, n), c = clash(q, size);
          if (c < best) { best = c; p = q; }
          if (!c) break;
        }
        if (!best) break;
      }
      out.push({ w, x: p.x, y: p.y, size, a, danger, fiche: AN.Fiche.of(w, AN.Game.profile) });
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
      // les quatre anneaux du danger (1.15), teintés, nommés en haut à gauche
      for (let i = BANDS.length - 1; i >= 0; i--) {
        const b = BANDS[i];
        ctx.fillStyle = U.rgba(WM.COLORS[i], 0.05 + i * 0.012);
        ctx.beginPath(); ctx.ellipse(cx, cy, b.r1 * RX, b.r1 * RY, 0, 0, TAU); ctx.ellipse(cx, cy, b.r0 * RX, b.r0 * RY, 0, 0, TAU); ctx.fill('evenodd');
        ctx.strokeStyle = U.rgba(WM.COLORS[i], 0.28); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(cx, cy, b.r1 * RX, b.r1 * RY, 0, 0, TAU); ctx.stroke();
      }
      ctx.font = '800 9.5px ' + AN.FONT_UI; ctx.textAlign = 'center';
      AN.Danger.GRADES.forEach((g, i) => {
        const n = (BANDS[i].r0 + BANDS[i].r1) / 2;
        const lx = cx, ly = cy - n * RY;
        const label = g.name.toUpperCase();
        const lw = ctx.measureText(label).width + 8;
        ctx.fillStyle = 'rgba(251,251,250,0.92)'; ctx.fillRect(lx - lw / 2, ly - 7, lw, 13);
        ctx.fillStyle = WM.COLORS[i]; ctx.fillText(label, lx, ly + 3);
      });
      ctx.textAlign = 'left'; ctx.font = '600 10.5px ' + AN.FONT_UI; ctx.fillStyle = U.rgba(AN.INK, 0.6);
      ctx.fillText('Plus un monde est loin de l’Artefact, plus il est dangereux pour vous.', 10, 16);
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
      // l'Artefact, dans sa forme du moment (1.14)
      AN.ArtefactArt.draw(ctx, cx, cy, t, Object.assign(AN.Story.look(AN.Game.profile), { size: 0.5, still: true, shadow: false }));
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
        // le liseré du danger
        ctx.strokeStyle = U.rgba(WM.COLORS[it.danger.rank], dim ? 0.25 : 0.85); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, r + 3, 0, TAU); ctx.stroke();
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
        // pictogrammes : peuple, caveaux (ce que la fiche en dit, 1.15)
        let ix = x - r * 0.8;
        const f = it.fiche;
        if (f.people) {
          ctx.fillStyle = '#ffffff'; ctx.strokeStyle = AN.INK; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(ix, y + r + 4); ctx.lineTo(ix + 5, y + r - 1); ctx.lineTo(ix + 10, y + r + 4); ctx.lineTo(ix + 10, y + r + 10); ctx.lineTo(ix, y + r + 10); ctx.closePath(); ctx.fill(); ctx.stroke();
          ix += 14;
        }
        (f.vaults.keys || Array(f.vaults.n).fill('?')).forEach((k) => {
          ctx.fillStyle = k === '?' ? '#9aa0a8' : D.KEYS[k].color;
          ctx.beginPath(); ctx.arc(ix + 4, y + r + 7, 3.5, 0, TAU); ctx.fill();
          ix += 10;
        });
        if (st.selected === w) { ctx.strokeStyle = AN.INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r + 13, 0, TAU); ctx.stroke(); }
        ctx.font = '600 11px ' + AN.FONT_UI; ctx.textAlign = 'center';
        ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(251,251,250,0.9)';
        ctx.strokeText(w.code, x, y - r - 10); ctx.fillStyle = dim ? U.rgba(AN.INK, 0.4) : AN.INK; ctx.fillText(w.code, x, y - r - 10);
      }
      // bulle du monde survolé
      const hv = st.items.find((it) => it.w === st.hover);
      if (hv) {
        const w = hv.w;
        const lines = [w.place ? w.placeName : w.code + ' · ' + w.region, hv.danger.name + ' · ' + (w.scale && w.scale !== 'region' ? D.ECHELONS[w.scale].name + ' · ' : '') + w.zones.length + ' zones · ' + D.BIOME[w.primary].name];
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
        lines.forEach((l, i) => { ctx.fillStyle = i === 1 ? WM.COLORS[hv.danger.rank] : i ? (i === 2 && search ? AN.CYAN : U.rgba(AN.INK, 0.75)) : AN.INK; ctx.font = (i ? '400 ' : '600 ') + '12px ' + AN.FONT_UI; ctx.fillText(l, bx + 10, by + 20 + i * 17); });
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    wrap.select = (w) => { st.selected = w; };
    return wrap;
  };
})();
