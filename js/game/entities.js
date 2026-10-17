/* Fabrique d'entités et physique commune (déplacements, collisions avec le relief). */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const Z = AN.ZoneGen;

  const E = (AN.Entities = {});
  let nextId = 1;

  /**
   * Crée une créature.
   * opts : { threat, variant, hueSeed, foreign, team, rule, scale, uid, nickname }
   */
  E.creature = function (def, x, y, opts = {}) {
    const v = D.VARIANT[opts.variant] || D.VARIANT.commun;
    const threat = opts.threat || 1;
    const hpMul = (opts.scale != null ? opts.scale : 1 + 0.32 * (threat - 1)) * (v.hp || 1);
    const dmgMul = (opts.scale != null ? 0.7 + opts.scale * 0.3 : 1 + 0.2 * (threat - 1)) * (v.dmg || 1) * (opts.rule === 'enragee' ? 1.25 : 1);
    let temper = def.temper;
    if (opts.rule === 'enragee' || v.angry) temper = { passif: 'craintif', craintif: 'territorial', territorial: 'agressif', agressif: 'agressif' }[temper];
    const e = {
      id: nextId++, kind: 'creature', def, tier: def.tier, team: opts.team || 'wild', isBoss: def.tier >= 2,
      x, y, vx: 0, vy: 0, dvx: 0, dvy: 0, kbx: 0, kby: 0,
      r: def.r * (v.size || 1) * (opts.size || 1), face: Math.random() * Math.PI * 2, anim: 0, seed: Math.random() * 100, stage: opts.stage || 0,
      variant: v.id, hueSeed: opts.hueSeed != null ? opts.hueSeed : Math.floor(Math.random() * 1000), foreign: opts.foreign || null,
      maxHp: Math.round(def.hp * hpMul), hp: 0, speed: def.speed * (v.speed || 1), dmgMul, armor: def.armor || 0,
      temper, move: opts.move || def.move,
      state: 'wander', stateT: 0, target: null, home: { x, y }, wanderTo: null, wanderT: Math.random() * 2,
      atkCd: Math.random() * 1.5, windup: 0, chargeT: 0, chargeHit: false, hidden: false, blinkCd: 2 + Math.random() * 3,
      slowT: 0, slowAmt: 0, stunT: 0, flash: 0, aggroT: 0, weak: false, capture: 0, captureT: 0,
      alive: true, uid: opts.uid || null, nickname: opts.nickname || null, downed: false, attackAnim: 0,
      group: opts.group != null ? opts.group : -1,
    };
    e.hp = e.maxHp;
    e.pal = AN.Art.palette(def, e.variant, e.hueSeed, e.foreign);
    // Un gardien devenu compagnon n'a pas d'attaque simple : on lui en donne une, tirée de son style.
    e.atk = def.attack || (def.tier >= 2 ? { type: 'shoot', dmg: 11, cd: 1.1, speed: 360, count: 3, spread: 0.35, size: 6, color: def.art.glow || def.art.accent, range: 340 } : null);
    if (e.move === 'burrow' && e.team === 'wild' && def.temper === 'agressif') e.hidden = true;
    return e;
  };

  /** Valeur d'une créature capturée (pour la tension du butin). */
  E.value = (speciesId, variantId) => {
    const d = D.CREATURE[speciesId];
    const v = D.VARIANT[variantId] || D.VARIANT.commun;
    return Math.round([20, 60, 260, 900, 2400, 3600, 5000, 7000][d.tier] * (v.value || 1) * (1 + d.rarity * 0.5));
  };

  /* ---------- physique ---------- */
  const P = (AN.Physics = {});

  /** Repousse un cercle hors des tuiles pleines. */
  P.collide = function (zone, e) {
    const T = zone.T;
    const r = e.r;
    const x0 = Math.floor((e.x - r) / T), x1 = Math.floor((e.x + r) / T);
    const y0 = Math.floor((e.y - r) / T), y1 = Math.floor((e.y + r) / T);
    let hit = false;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (!Z.solidT(zone, tx, ty)) continue;
        const cx = U.clamp(e.x, tx * T, tx * T + T), cy = U.clamp(e.y, ty * T, ty * T + T);
        const dx = e.x - cx, dy = e.y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 < r * r) {
          hit = true;
          if (d2 > 0.0001) {
            const d = Math.sqrt(d2);
            e.x += (dx / d) * (r - d);
            e.y += (dy / d) * (r - d);
          } else {
            // centre dans la tuile : on sort par le côté le plus proche
            const l = e.x - tx * T, rr = tx * T + T - e.x, t = e.y - ty * T, b = ty * T + T - e.y;
            const m = Math.min(l, rr, t, b);
            if (m === l) e.x = tx * T - r; else if (m === rr) e.x = tx * T + T + r; else if (m === t) e.y = ty * T - r; else e.y = ty * T + T + r;
          }
        }
      }
    }
    return hit;
  };

  /**
   * Intègre le mouvement : vitesse souhaitée (dvx, dvy), inertie, recul, ralentissements.
   * ignoreWalls pour les volants.
   */
  P.move = function (zone, e, dt, ignoreWalls) {
    const accel = e.accel || (e.kind === 'player' ? 14 : 8);
    const k = 1 - Math.exp(-accel * dt);
    e.vx += (e.dvx - e.vx) * k;
    e.vy += (e.dvy - e.vy) * k;
    const kd = Math.exp(-7 * dt);
    e.kbx *= kd; e.kby *= kd;
    const nx = e.x + (e.vx + e.kbx) * dt, ny = e.y + (e.vy + e.kby) * dt;
    const moved = Math.hypot(nx - e.x, ny - e.y);
    e.x = nx; e.y = ny;
    if (!ignoreWalls) {
      if (P.collide(zone, e)) { e.kbx *= 0.5; e.kby *= 0.5; }
    }
    const pad = zone.T * 2 + e.r;
    e.x = U.clamp(e.x, pad, zone.w * zone.T - pad);
    e.y = U.clamp(e.y, pad, zone.h * zone.T - pad);
    e.anim += moved / Math.max(4, e.r * 0.9);
    if (Math.abs(e.vx) + Math.abs(e.vy) > 8 && e.kind !== 'player' && !e.lockFace) {
      const a = Math.atan2(e.vy, e.vx);
      e.face += U.angDiff(e.face, a) * Math.min(1, dt * 10);
    }
  };

  /** Séparation simple entre créatures proches (grille spatiale). */
  P.separate = function (list) {
    const cell = 64;
    const map = new Map();
    for (const e of list) {
      if (!e.alive || e.hidden) continue;
      const key = Math.floor(e.x / cell) + ',' + Math.floor(e.y / cell);
      let arr = map.get(key);
      if (!arr) map.set(key, (arr = []));
      arr.push(e);
    }
    for (const e of list) {
      if (!e.alive || e.hidden) continue;
      const cx = Math.floor(e.x / cell), cy = Math.floor(e.y / cell);
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const arr = map.get(cx + ox + ',' + (cy + oy));
        if (!arr) continue;
        for (const o of arr) {
          if (o === e || o.id < e.id) continue;
          const dx = o.x - e.x, dy = o.y - e.y;
          const min = e.r + o.r;
          const d2 = dx * dx + dy * dy;
          if (d2 < min * min && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const push = (min - d) / 2;
            const wE = e.isBoss ? 0.1 : o.isBoss ? 0.9 : 0.5;
            e.x -= (dx / d) * push * 2 * wE;
            e.y -= (dy / d) * push * 2 * wE;
            o.x += (dx / d) * push * 2 * (1 - wE);
            o.y += (dy / d) * push * 2 * (1 - wE);
          }
        }
      }
    }
  };

  /**
   * Champ de flux : distance (en tuiles) depuis une cible, pour contourner le relief.
   * Recalculé périodiquement autour du joueur.
   */
  P.flowField = function (zone, tx, ty, maxDist = 45) {
    const w = zone.w, h = zone.h;
    const dist = new Uint16Array(w * h).fill(65535);
    const q = new Int32Array(w * h);
    let head = 0, tail = 0;
    const start = ty * w + tx;
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) return { dist, w, h };
    dist[start] = 0;
    q[tail++] = start;
    while (head < tail) {
      const i = q[head++];
      const d = dist[i];
      if (d >= maxDist) continue;
      const x = i % w, y = (i / w) | 0;
      for (let k = 0; k < 4; k++) {
        if ((k === 0 && x === 0) || (k === 1 && x === w - 1) || (k === 2 && y === 0) || (k === 3 && y === h - 1)) continue;
        const j = k === 0 ? i - 1 : k === 1 ? i + 1 : k === 2 ? i - w : i + w;
        if (dist[j] !== 65535 || Z.SOLID[zone.grid[j]] === 1) continue;
        dist[j] = d + 1;
        q[tail++] = j;
      }
    }
    return { dist, w, h };
  };
  /** Direction (unitaire) à suivre dans le champ de flux depuis (x, y). */
  P.flowDir = function (zone, field, x, y) {
    const T = zone.T;
    const tx = Math.floor(x / T), ty = Math.floor(y / T);
    const w = field.w;
    if (tx < 0 || ty < 0 || tx >= w || ty >= field.h) return null;
    let best = field.dist[ty * w + tx], bx = 0, by = 0;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      if (!ox && !oy) continue;
      const nx = tx + ox, ny = ty + oy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= field.h) continue;
      if (ox && oy && (Z.solidT(zone, tx + ox, ty) || Z.solidT(zone, tx, ty + oy))) continue;
      const d = field.dist[ny * w + nx];
      if (d < best) { best = d; bx = ox; by = oy; }
    }
    if (!bx && !by) return null;
    const tcx = (tx + bx) * T + T / 2, tcy = (ty + by) * T + T / 2;
    const l = Math.hypot(tcx - x, tcy - y) || 1;
    return { x: (tcx - x) / l, y: (tcy - y) / l };
  };
})();
