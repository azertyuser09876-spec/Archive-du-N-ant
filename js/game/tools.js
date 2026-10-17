/* Outils de préparation en expédition : récolte, capture, module d'extraction,
   transport. Les effets (données fx de works.js) sont réunis dans X.T au
   calcul des statistiques ; ce module fournit aussi les interactions propres
   aux outils (filons profonds, balise de rappel) et le poids effectif de la
   soute (cage de stase, traîneau). */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const Z = AN.ZoneGen;
  const FX = AN.FX;
  const TAU = Math.PI * 2;

  const To = (AN.Tools = {});

  /** Effets réunis des outils emportés. */
  To.effects = function (loadout) {
    const T = { harvest: 0, yield: 0, deep: false, weak: 0, beam: 0, range: 0, freeMinor: 0, transfer: 0, beacon: false, keepBag: 0, keepOnDeath: 0, dismantle: false, cargo: 0, bag: 0, structLight: 0, list: [] };
    D.TOOL_SLOTS.forEach((s) => {
      const id = loadout && loadout[s.id];
      const g = id && D.GEAR[id];
      if (!g || !g.fx) return;
      T.list.push(id);
      for (const k in g.fx) {
        if (typeof g.fx[k] === 'boolean') T[k] = T[k] || g.fx[k];
        else T[k] = (T[k] || 0) + g.fx[k];
      }
    });
    return T;
  };

  /** Appliqué à la fin de PlayerCtl.computeStats. */
  To.apply = function (X) {
    const T = (X.T = To.effects(X.loadout));
    X.S.bagCap += T.bag;
    X.captureThr = Math.min(0.75, X.captureThr + T.weak);
    X.beamMult *= 1 + T.beam;
    X.beamRange *= 1 + T.range;
    X.cargoCap += T.cargo;
    return T;
  };

  /** Poids d'un objet de soute, compte tenu des outils (la cage de stase porte les petites créatures). */
  To.cargoUsed = function (X) {
    let free = (X.T && X.T.freeMinor) || 0;
    let sum = 0;
    for (const c of X.cargo) {
      let w = AN.Profile.cargoWeight(c);
      if (free > 0 && c.species && !c.egg && D.CREATURE[c.species] && D.CREATURE[c.species].tier === 0) { free--; w = 0; }
      sum += w;
    }
    return sum + (X.reservedCargo || 0);
  };
  /** Place que prendrait une nouvelle créature de ce rang. */
  To.weightFor = function (X, tier) {
    if (tier === 0 && X.T && X.T.freeMinor) {
      const used = X.cargo.filter((c) => c.species && !c.egg && D.CREATURE[c.species] && D.CREATURE[c.species].tier === 0).length;
      if (used < X.T.freeMinor) return 0;
    }
    return D.TIERS[tier].weight;
  };

  /** Durée d'appui pour récolter, et unités en plus. */
  To.harvestHold = (X) => 0.85 * (1 - Math.min(0.75, (X.T && X.T.harvest) || 0));
  To.harvestBonus = function (X) {
    const y = (X.T && X.T.yield) || 0;
    return Math.floor(y) + (Math.random() < y % 1 ? 1 : 0);
  };

  /* ---------- interactions des outils ---------- */
  To.interactables = function (X, consider) {
    const p = X.player;
    // balise de rappel : poser une plaque d'extraction, loin de toute autre
    // (proposée seulement à l'arrêt, pour ne pas encombrer l'exploration)
    if (X.T && X.T.beacon && !X.beaconUsed && !X.collapse && !X.ending && Math.hypot(p.vx || 0, p.vy || 0) < 40) {
      const far = X.zone.plates.every((pl) => U.dist(pl.x, pl.y, p.x, p.y) > 520);
      const tile = Z.tileAt(X.zone, p.x, p.y);
      if (far && tile === Z.FLOOR) consider(49, 50, () => ({ kind: 'beacon', target: { id: 'balise', x: Math.round(p.x), y: Math.round(p.y) }, text: 'Poser la balise de rappel (plaque d’extraction)', hold: 1.2 }));
    }
  };

  To.interact = function (X, it) {
    if (it.kind === 'beacon') {
      X.beaconUsed = true;
      const T = Z.T;
      const tx = Math.floor(it.target.x / T), ty = Math.floor(it.target.y / T);
      const pl = { x: tx * T + T / 2, y: ty * T + T / 2, beacon: true };
      for (let y = ty - 2; y <= ty + 2; y++) for (let x = tx - 2; x <= tx + 2; x++) {
        if (x < 0 || y < 0 || x >= X.zone.w || y >= X.zone.h) continue;
        const i = y * X.zone.w + x;
        if ((x - tx) ** 2 + (y - ty) ** 2 <= 4.6 && X.zone.grid[i] === Z.FLOOR) X.zone.grid[i] = Z.PLATE;
      }
      X.zone.plates.push(pl);
      FX.ring(pl.x, pl.y, AN.CYAN, 10, 160, 0.9, 4);
      FX.burst(pl.x, pl.y, '#ffffff', 40, 220, { size: 3 });
      AN.Audio.play('portal');
      AN.HUD.toast('Balise posée : une plaque d’extraction s’ouvre ici.', 4);
      return true;
    }
    if (it.kind === 'deep_locked') {
      AN.Audio.play('ui_err');
      AN.HUD.toast('Filon profond : il faut une Foreuse résonante (Atelier, outils de récolte).', 4);
      return true;
    }
    return false;
  };

  /** Plaque de la balise (dessinée par-dessus le terrain, qui a été peint avant elle). */
  To.drawWorld = function (ctx, X, t) {
    for (const pl of X.zone.plates) {
      if (!pl.beacon) continue;
      ctx.fillStyle = '#f7f8f7';
      ctx.beginPath(); ctx.arc(pl.x, pl.y, Z.T * 2.2, 0, TAU); ctx.fill();
      ctx.strokeStyle = U.rgba(AN.CYAN, 0.8); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(pl.x, pl.y, Z.T * 2.2, 0, TAU); ctx.stroke();
    }
  };

  /** Ligne d'outils pour la préparation et les fiches. */
  To.summary = function (loadout) {
    const T = To.effects(loadout);
    return T.list.map((id) => D.GEAR[id].name);
  };
})();
