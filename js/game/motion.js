/* Bestiaire vivant (1.17) : le mouvement de chaque créature, procédural.
   Chaque espèce a son tempérament de mouvement, tiré de sa graine (allure, rebond, écrasement,
   balancement, inclinaison dans les virages, battement, respiration, regards) ; il s'applique
   selon sa façon de se déplacer (marche, saut, vol, dérive, reptation, clignement, terrier).
   Par-dessus : les gestes de ses attaques (préparation, frappe, reprise), propres à chaque forme
   (accroupie avant un bond, tournoyante pour la toupie, gonflée avant une onde, reculant à chaque
   tir d'une salve…), son réflexe, et le recul quand on la frappe.
   Motion.update(e, dt) suit l'entité ; Motion.pose(e, t) donne { dx, dy, fw, yaw, sx, sy, lift }
   (dx, dy : décalage dessiné ; fw : avancée le long de son regard ; yaw : rotation ajoutée ;
   sx, sy : étirement le long et en travers de son regard ; lift : hauteur, pour l'ombre). */
(function () {
  'use strict';
  const AN = window.AN;
  const U = AN.Util;

  const Mo = (AN.Motion = {});
  const PROF = {};
  /** Le tempérament de mouvement d'une espèce. */
  Mo.profile = function (def) {
    if (PROF[def.id]) return PROF[def.id];
    const g = new AN.RNG(AN.hash('mouvement:' + def.id));
    const heavy = U.clamp((def.r || 12) / 40, 0, 1); // les grands sont plus lourds, plus lents
    return (PROF[def.id] = {
      gait: g.float(0.75, 1.35) * (1.15 - heavy * 0.35), // allure des pas
      bob: g.float(0.03, 0.11), // rebond de la marche (part du rayon)
      squash: g.float(0.03, 0.12) * (1 - heavy * 0.4), // écrasement à chaque pas
      sway: g.float(0, 0.16), // balancement de gauche à droite
      lean: g.float(0.04, 0.22), // inclinaison dans les virages
      hop: g.float(0.35, 0.85), // hauteur d'un saut (part du rayon)
      flap: g.float(7, 15) * (1.1 - heavy * 0.4), // battement en vol
      flapAmp: g.float(0.05, 0.14),
      breath: g.float(0.015, 0.05), // respiration au repos
      breathF: g.float(0.8, 2),
      look: g.float(0.15, 0.6), // envie de regarder autour
      wind: g.float(0.7, 1.3), // ampleur de ses préparations
      jitter: g.float(0, 1) < 0.35 ? g.float(0.6, 1.5) : 0, // certaines tremblent d'impatience avant de frapper
    });
  };
  /** Suit l'entité : vitesse réelle (d'après son déplacement), virages, regards, coups reçus. */
  Mo.update = function (e, dt) {
    if (!(dt > 0) || !e.def) return;
    let m = e.mo;
    if (!m) m = e.mo = { px: e.x, py: e.y, face: e.face || 0, sp: 0, turn: 0, look: 0, lookTo: 0, lookT: Math.random() * 3, hit: 0, flash: 0, t: Math.random() * 10 };
    const P = Mo.profile(e.def);
    m.t += dt;
    const v = Math.hypot(e.x - m.px, e.y - m.py) / dt;
    m.px = e.x; m.py = e.y;
    m.sp += (Math.min(v, 900) - m.sp) * Math.min(1, dt * 8);
    const tr = U.angDiff(m.face, e.face || 0) / dt;
    m.face = e.face || 0;
    m.turn += (U.clamp(tr, -6, 6) - m.turn) * Math.min(1, dt * 6);
    // au repos, elle regarde autour d'elle
    m.lookT -= dt;
    if (m.lookT <= 0) { m.lookT = 1 + Math.random() * 3.5; m.lookTo = m.sp < 10 && !e.act && Math.random() < P.look ? (Math.random() - 0.5) * 1.4 : 0; }
    m.look += (m.lookTo - m.look) * Math.min(1, dt * 5);
    // un coup reçu : recul
    if (e.flash > 0 && m.flash <= 0) m.hit = 1;
    m.flash = e.flash || 0;
    m.hit = Math.max(0, m.hit - dt * 4);
  };
  const ease = (k) => k * k * (3 - 2 * k);
  /** La pose du moment. */
  Mo.pose = function (e, t) {
    const m = e.mo;
    const out = { dx: 0, dy: 0, fw: 0, yaw: 0, sx: 1, sy: 1, lift: 0 };
    if (!m || !e.def) return out;
    const P = Mo.profile(e.def), r = e.r || 10, mv = e.def.move;
    const run = U.clamp(m.sp / Math.max(30, (e.speed || 60) * 0.8), 0, 1.3);
    const ph = (e.anim || 0) * P.gait;
    // ---- la locomotion ----
    if (mv === 'hop') {
      const k = (ph * 0.5) % 1, air = Math.sin(k * Math.PI) * run;
      out.lift = air * P.hop * r; out.dy -= out.lift;
      const land = Math.max(0, 1 - Math.min(k, 1 - k) * 8) * run; // l'écrasement à l'atterrissage
      out.sx += air * 0.12 - land * 0.1; out.sy += -air * 0.08 + land * 0.16;
    } else if (mv === 'fly') {
      const f = Math.sin(m.t * P.flap);
      out.dy += f * r * 0.06; out.sy += f * P.flapAmp; out.sx -= f * P.flapAmp * 0.4;
      out.yaw += U.clamp(m.turn * P.lean * 0.12, -0.35, 0.35);
    } else if (mv === 'drift' || mv === 'blink') {
      out.dy += Math.sin(m.t * P.breathF * 1.3) * r * 0.1;
      out.dx += Math.cos(m.t * P.breathF * 0.9) * r * 0.05;
      out.yaw += Math.sin(m.t * 0.7) * P.sway;
      const s = Math.sin(m.t * P.breathF * 2) * P.breath * 1.5; out.sx += s; out.sy += s;
      if (mv === 'blink') { const fl = Math.sin(m.t * 23) > 0.92 ? 0.12 : 0; out.sx += fl; out.sy -= fl; }
    } else if (mv === 'slither') {
      out.yaw += Math.sin(ph * Math.PI * 1.2) * (0.12 + P.sway * 1.6) * Math.max(0.3, run);
      out.sx += Math.sin(ph * Math.PI * 2.4) * P.squash * 0.6 * run;
    } else { // marche (et terrier hors de terre)
      const step = Math.abs(Math.sin(ph * Math.PI));
      out.dy -= step * P.bob * r * Math.min(1, run);
      out.lift = step * P.bob * r * 0.4 * Math.min(1, run);
      const sq = Math.sin(ph * Math.PI * 2) * P.squash * Math.min(1, run);
      out.sx += sq; out.sy -= sq * 0.6;
      out.yaw += Math.sin(ph * Math.PI) * P.sway * 0.5 * Math.min(1, run);
      out.yaw += U.clamp(m.turn * P.lean * 0.1, -0.3, 0.3);
    }
    // la respiration, au repos
    if (run < 0.2) { const b = Math.sin(m.t * P.breathF * Math.PI) * P.breath; out.sx += b; out.sy += b; }
    // ses regards : le corps suit un peu, la tête (corps vivants, 1.18) fait le reste
    const sp = AN.Rig && AN.Rig.spec(e.def);
    out.yaw += m.look * (sp && sp.look ? 0.35 : 1);
    // ---- les gestes de l'attaque ----
    const A = e.act;
    if (A) {
      const s = A.spec, form = s.form, W = P.wind;
      if (A.phase === 'windup') {
        const k = ease(U.clamp(A.t / Math.max(0.05, s.windup), 0, 1));
        if (form === 'toupie') out.yaw += k * k * 6;
        else if (form === 'onde' || form === 'double' || form === 'cratere' || form === 'nova' || form === 'brume' || form === 'eruption') { out.sx += 0.22 * k * W; out.sy += 0.22 * k * W; } // elle se gonfle
        else if (form === 'bond' || form === 'charge' || form === 'zigzag' || form === 'retour' || form === 'roulade' || form === 'percee') { out.sx -= 0.2 * k * W; out.sy += 0.14 * k * W; out.fw -= r * 0.18 * k; } // elle se ramasse
        else if (s.fam === 'missile' || s.fam === 'bile' || form === 'faisceau' || form === 'orbe' || form === 'piliers') { out.fw -= r * 0.1 * k; out.sy += 0.06 * k; out.sx -= 0.06 * k; } // elle prend son élan
        else { out.fw -= r * 0.14 * k; out.sx -= 0.12 * k * W; } // mêlée : elle recule avant de frapper
        if (P.jitter) { out.dx += (Math.random() - 0.5) * r * 0.06 * P.jitter * k; out.dy += (Math.random() - 0.5) * r * 0.06 * P.jitter * k; }
      } else if (A.phase === 'active') {
        if (form === 'toupie') out.yaw += 6 + A.t * 14;
        else if (form === 'bond') { out.lift = (A.air || 0) * r * 1.4; out.dy -= out.lift; out.sx += 0.1; out.sy -= 0.06; }
        else if (s.fam === 'rush') { out.sx += 0.22; out.sy -= 0.12; }
        else if (form === 'salve') { const rc = Math.max(0, 1 - ((A.t % (s.gap || 0.1)) / (s.gap || 0.1)) * 2); out.fw -= r * 0.1 * rc; }
        else if (form === 'griffes') out.yaw += Math.sin(A.t * 30) * 0.25;
        else { out.fw += r * 0.22; out.sx += 0.18; out.sy -= 0.08; } // la frappe : elle s'étire en avant
      } else { // la reprise
        const k = 1 - ease(U.clamp(A.t / Math.max(0.05, s.recover), 0, 1));
        out.fw += r * 0.1 * k; out.sx += 0.06 * k;
      }
    }
    // son réflexe : un sursaut ; roulée en boule
    if (e.reflexT > 0) { const k = e.reflexT / 0.4; out.sx += 0.18 * k; out.sy += 0.18 * k; }
    if (e.shellT > 0) { out.sx *= 0.82; out.sy *= 0.82; out.yaw += m.t * 3; }
    // un coup reçu : elle recule, s'écrase
    if (m.hit > 0) { out.fw -= r * 0.12 * m.hit; out.sx -= 0.1 * m.hit; out.sy += 0.12 * m.hit; }
    // étourdie : elle chancelle
    if (e.stunT > 0) out.yaw += Math.sin(m.t * 9) * 0.25;
    out.sx = U.clamp(out.sx, 0.6, 1.5); out.sy = U.clamp(out.sy, 0.6, 1.5);
    return out;
  };
})();
