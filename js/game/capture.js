/* Rayon de capture : on affaiblit une créature, puis on maintient le rayon
   pendant qu'elle se débat. Les gardiens se capturent une fois épuisés. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const Z = AN.ZoneGen;
  const FX = AN.FX;
  const TAU = Math.PI * 2;

  const Cap = (AN.Capture = {});

  Cap.eligible = (X, e) => {
    if (e.reflection) return true; // un reflet du Relieur (1.10) : le rayon le déchire
    if (e.herd || (e.def && e.def.echo)) return false;
    if (e.def && e.def.npc && !X.civ) return false; // on ne capture pas les gens d'une nation (1.12)
    return e.boss ? e.boss.exhausted && AN.Cosmic.formReady(X, e) : e.weak && !e.core;
  };

  function findTarget(X, p) {
    const range = X.beamRange;
    let best = null, bs = 1e9;
    for (const e of X.creatures) {
      if (!e.alive || e.team !== 'wild' || e.hidden) continue;
      const d = U.dist(p.x, p.y, e.x, e.y) - e.r;
      if (d > range) continue;
      const a = Math.atan2(e.y - p.y, e.x - p.x);
      const da = Math.abs(U.angDiff(p.aim, a));
      const tol = Math.max(0.18, Math.atan2(e.r + 14, Math.max(1, d)));
      if (da > tol + 0.12) continue;
      const score = da * 300 + d * 0.3 - (Cap.eligible(X, e) ? 120 : 0);
      if (score < bs) { bs = score; best = e; }
    }
    return best;
  }

  Cap.interrupt = function (X) {
    if (X.beam && X.beam.target) {
      X.beam.target.capture = Math.max(0, X.beam.target.capture - 0.1);
      X.beam.lockT = 0.45;
      FX.text(X.player.x, X.player.y - 26, 'rayon interrompu', AN.STAMP, { size: 11 });
    }
  };

  Cap.update = function (X, dt) {
    const p = X.player;
    const want = p.alive && AN.Input.down('KeyF') && !p.dashT;
    // Les créatures non visées perdent leur progression.
    for (const e of X.creatures) {
      if (e.capture > 0 && (!X.beam || X.beam.target !== e)) e.capture = Math.max(0, e.capture - dt * (e.boss && e.boss.form && e.boss.form.kind === 'synchronisation' ? 0.05 : 0.3));
    }
    if (!want) {
      if (X.beam) { X.beam.sound && X.beam.sound.stop(); X.beam = null; }
      return;
    }
    if (!X.beam) X.beam = { target: null, t: 0, lockT: 0, sound: AN.Audio.loop('beam'), msgT: 0 };
    const beam = X.beam;
    beam.t += dt;
    beam.msgT -= dt;
    if (beam.lockT > 0) { beam.lockT -= dt; beam.target = null; beam.sound.set(0); return; }
    let tg = beam.target;
    if (tg && (!tg.alive || tg.hidden || U.dist(p.x, p.y, tg.x, tg.y) - tg.r > X.beamRange * 1.2 || Math.abs(U.angDiff(p.aim, Math.atan2(tg.y - p.y, tg.x - p.x))) > 0.9)) tg = null;
    if (!tg) tg = findTarget(X, p);
    beam.target = tg;
    if (!tg) { beam.sound.set(0); return; }
    if (!Z.los(X.zone, p.x, p.y, tg.x, tg.y)) { beam.sound.set(0); return; }

    const weight = tg.def.npc ? AN.Civ.captureWeight(X) : AN.Tools ? AN.Tools.weightFor(X, tg.def.tier) : D.TIERS[tg.def.tier].weight;
    if (!Cap.eligible(X, tg)) {
      if (beam.msgT <= 0) {
        beam.msgT = 1.6;
        FX.text(tg.x, tg.y - tg.r - 12, tg.core ? 'détruisez ce noyau' : tg.def.npc && !X.civ ? 'on ne capture pas les gens d’une nation' : tg.herd ? 'repoussez-la dans son orbite' : tg.def.echo ? 'un écho ne se capture pas' : tg.boss ? (tg.boss.exhausted ? AN.Cosmic.formHint(X, tg) : 'pas encore épuisé') : 'trop vigoureuse : affaiblissez-la', AN.INK, { size: 11 });
      }
      beam.sound.set(0.05);
      return;
    }
    if (X.cargoUsed() + weight > X.cargoCap) {
      if (beam.msgT <= 0) {
        beam.msgT = 2;
        AN.HUD.toast('Soute pleine : ' + D.TIERS[tg.def.tier].name.toLowerCase() + ' = ' + weight + ' place' + (weight > 1 ? 's' : '') + '. Libérez de la place (Tab) ou améliorez la soute.');
        AN.Audio.play('capture_fail', { gap: 1 });
      }
      beam.sound.set(0.1);
      return;
    }
    const v = D.VARIANT[tg.variant] || D.VARIANT.commun;
    const tierDiv = [1, 1.7, 3.2, 5, 6, 7, 8, 9, 10, 11, 12][tg.def.tier] || 12;
    const boost = X.abil && X.abil.buffs.capBoost > 0 ? 2 : 1;
    const rate = (boost / 2.4) * X.beamMult * (1 + X.powers.capture) * (1 + X.captureHelpers * 0.25) / tierDiv / tg.def.resist / (v.id === 'chromatique' ? 1.3 : 1);
    tg.capture = U.clamp(tg.capture + rate * AN.Cosmic.captureMul(X, tg) * dt, 0, 1);
    tg.captureT = 0.2;
    tg.aggroT = Math.max(tg.aggroT, 1);
    beam.sound.set(tg.capture);
    if (tg.reflection) { if (tg.capture > 0.25) AN.Cosmic.tearReflection(X, tg); return; }
    if (Math.random() < dt * 20) FX.add({ kind: 'dot', x: tg.x + (Math.random() - 0.5) * tg.r * 2, y: tg.y + (Math.random() - 0.5) * tg.r * 2, color: AN.CYAN, life: 0.4, size: 2.5, glow: true, vx: (p.x - tg.x) * 0.8, vy: (p.y - tg.y) * 0.8, drag: 0 });
    if (tg.capture >= 1) Cap.complete(X, tg);
  };

  Cap.complete = function (X, e) {
    const p = X.player;
    if (e.def.npc) {
      e.alive = false;
      for (let i = 0; i < 14; i++) FX.stream(e.x + (Math.random() - 0.5) * 16, e.y + (Math.random() - 0.5) * 16, p.x, p.y, i % 2 ? e.pal.body : AN.CYAN, { life: 0.5, size: 3 });
      AN.Civ.captured(X, e);
      if (X.beam) X.beam.target = null;
      return;
    }
    e.alive = false;
    e.captured = true;
    X.cargo.push({ species: e.def.id, variant: e.variant, hueSeed: e.hueSeed, foreign: e.foreign, zone: X.zi, guardianOf: e.boss && !e.boss.errant ? e.boss.zoneIndex : null });
    for (let i = 0; i < 24 + e.r; i++) FX.stream(e.x + (Math.random() - 0.5) * e.r * 2, e.y + (Math.random() - 0.5) * e.r * 2, p.x, p.y, i % 2 ? e.pal.body : AN.CYAN, { life: 0.5 + Math.random() * 0.4, size: 3 });
    FX.ring(e.x, e.y, AN.CYAN, e.r * 2, 2, 0.5, 3);
    AN.Audio.play('capture_ok');
    X.stats.captures++;
    AN.Profile.markSeen(X.profile, e.def.id);
    const name = e.def.name + (D.VARIANT[e.variant].name ? ' ' + D.VARIANT[e.variant].name : '');
    FX.text(e.x, e.y - e.r - 10, 'capturé', AN.CYAN, { size: 14, bold: true, life: 1.4 });
    AN.HUD.toast(name + ' rejoint la soute (' + X.cargoUsed() + ' / ' + X.cargoCap + ').');
    if (X.beam) { X.beam.target = null; }
    if (e.boss) AN.Boss.defeated(X, e, 'capturé');
    if (!X.profile.flags.firstCapture) {
      X.profile.flags.firstCapture = 1;
      setTimeout(() => AN.HUD.toast('Rien n’est acquis avant l’extraction. Rejoignez une plaque blanche et appuyez sur ' + AN.Input.label('KeyE') + '.', 7), 1500);
    }
  };

  Cap.draw = function (ctx, X, t) {
    const beam = X.beam;
    const p = X.player;
    if (!beam || !p.alive) return;
    const tg = beam.target;
    const ex = tg ? tg.x : p.x + Math.cos(p.aim) * X.beamRange;
    const ey = tg ? tg.y : p.y + Math.sin(p.aim) * X.beamRange;
    const ok = tg && Cap.eligible(X, tg);
    const len = U.dist(p.x, p.y, ex, ey);
    const a = Math.atan2(ey - p.y, ex - p.x);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(a);
    ctx.globalAlpha = tg ? 0.95 : 0.35;
    ctx.strokeStyle = U.rgba(AN.CYAN, 0.25);
    ctx.lineWidth = ok ? 14 : 6;
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(len, 0); ctx.stroke();
    ctx.strokeStyle = AN.CYAN;
    ctx.lineWidth = 2;
    for (let s = 0; s < 2; s++) {
      ctx.beginPath();
      for (let x = 14; x <= len; x += 6) {
        const y = Math.sin(x * 0.08 - t * 18 + s * Math.PI) * (ok ? 6 : 3) * Math.min(1, x / 40);
        x === 14 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    if (tg) {
      ctx.strokeStyle = ok ? AN.CYAN : U.rgba(AN.INK, 0.5);
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r + 9, -Math.PI / 2, -Math.PI / 2 + TAU * tg.capture); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r + 9, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
  };
})();
