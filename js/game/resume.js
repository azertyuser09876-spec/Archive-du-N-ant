/* Sauvegarde en pleine expédition (1.5).
   Toutes les quelques secondes, et quand on change de zone ou qu'on quitte la
   page, l'expédition en cours est résumée dans profile.pendingExpedition.snap :
   le monde (sa graine suffit à tout regénérer), la zone, la position et la
   vigueur, le sac, la soute, les zones conquises, et ce qui a changé dans
   chaque zone visitée (gisements, caveaux, œufs, structures, brouillard…).
   À la reprise, les zones sont regénérées puis ces changements réappliqués.
   Les créatures, elles, réapparaissent : le monde a continué sans vous.
   Depuis la 1.13 : l'état d'une nation (faveur, guerre, missions) et les mercenaires. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const Z = AN.ZoneGen;

  const R = (AN.Resume = {});
  R.VERSION = 1;
  R.EVERY = 10; // secondes entre deux points de reprise

  /* ---------- brouillard : codage par plages ---------- */
  R.rle = function (arr) {
    const out = [];
    let cur = 0, n = 0;
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i] ? 1 : 0;
      if (v === cur) n++;
      else { out.push(n); cur = v; n = 1; }
    }
    out.push(n);
    return out;
  };
  R.unrle = function (runs, len) {
    const arr = new Uint8Array(len);
    let i = 0, v = 0;
    for (const n of runs || []) { if (v) arr.fill(1, i, Math.min(len, i + n)); i += n; v ^= 1; }
    return arr;
  };

  /** Ce qui a changé dans une zone depuis sa génération. */
  R.zoneDelta = function (zone) {
    return {
      nodes: zone.nodes.filter((n) => /^[nvd]\d+$/.test(n.id)).map((n) => [n.id, n.uses, n.amount]),
      ruins: zone.ruins.filter((r) => r.used).map((r) => r.id),
      vaults: (zone.vaults || []).map((v, i) => (v.opened ? i : -1)).filter((i) => i >= 0),
      eggs: (zone.eggs || []).filter((e) => e.taken).map((e) => e.id),
      structure: zone.structure ? { id: zone.structure.id, x: zone.structure.x, y: zone.structure.y, searched: !!zone.structure.searched, taken: !!zone.structure.taken } : null,
      plates: zone.plates.filter((p) => p.beacon).map((p) => [p.x, p.y]),
      fog: zone.state && zone.state.fog ? R.rle(zone.state.fog) : null,
    };
  };

  /** Réapplique les changements à une zone fraîchement regénérée (avant son dessin). */
  R.applyZone = function (X, zone, d) {
    if (X.restore) delete X.restore[zone.index];
    const byId = new Map(zone.nodes.map((n) => [n.id, n]));
    (d.nodes || []).forEach(([id, uses, amount]) => { const n = byId.get(id); if (n) { n.uses = uses; n.amount = amount; } });
    const used = new Set(d.ruins || []);
    zone.ruins.forEach((r) => { if (used.has(r.id)) r.used = true; });
    (d.vaults || []).forEach((i) => { const v = zone.vaults[i]; if (v) { v.opened = true; v.tiles.forEach((t) => { zone.grid[t] = Z.FLOOR; }); } });
    const taken = new Set(d.eggs || []);
    (zone.eggs || []).forEach((e) => { if (taken.has(e.id)) e.taken = true; });
    if (d.structure) {
      if (zone.structure && zone.structure.id === d.structure.id) Object.assign(zone.structure, d.structure);
      else zone.structure = Object.assign({ seed: 1 }, d.structure);
    }
    (d.plates || []).forEach(([x, y]) => {
      const T = Z.T, tx = Math.floor(x / T), ty = Math.floor(y / T);
      for (let yy = ty - 2; yy <= ty + 2; yy++) for (let xx = tx - 2; xx <= tx + 2; xx++) {
        const i = yy * zone.w + xx;
        if ((xx - tx) ** 2 + (yy - ty) ** 2 <= 4.6 && zone.grid[i] === Z.FLOOR) zone.grid[i] = Z.PLATE;
      }
      zone.plates.push({ x, y, beacon: true });
    });
    if (d.fog) zone.state.fog = R.unrle(d.fog, zone.w * zone.h);
    zone.state.conquered = X.conquered.has(zone.index);
  };

  /** Copie des champs simples d'un peuple (sans les entités). */
  function civPlain(civ) {
    if (!civ) return null;
    const out = {};
    for (const k in civ) {
      const v = civ[k];
      if (v == null || typeof v !== 'object') out[k] = v;
      else if ((k === 'rallyPlate' || k === 'arkPos') && typeof v.x === 'number') out[k] = { x: v.x, y: v.y };
    }
    return out;
  }

  /** Résumé complet de l'expédition. */
  R.snapshot = function (X) {
    const zones = {};
    X.zones.forEach((z, i) => { if (z) zones[i] = R.zoneDelta(z); });
    const p = X.player;
    return {
      v: R.VERSION, saved: Date.now(),
      world: X.world, zi: X.zi, time: Math.round(X.time),
      player: { x: Math.round(p.x), y: Math.round(p.y), hp: Math.max(1, Math.round(p.hp)) },
      bag: Object.assign({}, X.bag),
      cargo: X.cargo.map((c) => Object.assign({}, c)),
      consumables: X.consumables.map((c) => ({ id: c.id, n: c.n, start: c.start })),
      loadout: X.loadout,
      conquered: [...X.conquered], heartDone: !!X.heartDone,
      stats: Object.assign({}, X.stats),
      allies: X.allies.filter((a) => !a.temp && a.uid).map((a) => ({ uid: a.uid, hp: Math.round(a.hp), downed: !!a.downed, kills: a.kills || 0 })),
      eventsDone: [...(X.eventsDone || [])],
      freed: [...(X.freed || [])],
      beaconUsed: !!X.beaconUsed,
      callUsed: !!(X.abil && X.abil.call && X.abil.call.used),
      search: X.search || null,
      civ: civPlain(X.civ),
      base: AN.Base ? AN.Base.snapshot(X) : null, // l'hexagone (1.9) : vigueur, soute déjà ramenée, gardes
      nation: AN.Nations.snapshot(X), // faveur, guerre, offres, missions (1.13)
      mercs: AN.Nations.mercsSnapshot(X), // les mercenaires engagés (1.13)
      zones,
    };
  };

  R.canSave = (X) => !!X && !X.tuto && !X.collapse && !X.ending && !X.left && !AN.Save.suspended && X.player.alive && !(X.base && (X.base.state === 'land' || X.base.state === 'lift'));

  /** Enregistre un point de reprise (si le moment s'y prête). */
  R.checkpoint = function (X) {
    if (!R.canSave(X)) return false;
    const prof = X.profile;
    prof.pendingExpedition = prof.pendingExpedition || { code: X.world.code, loadout: X.loadout, consumables: [] };
    prof.pendingExpedition.snap = R.snapshot(X);
    AN.Save.write(prof);
    X.snapT = R.EVERY;
    return true;
  };

  R.tick = function (X, dt) {
    X.snapT = (X.snapT == null ? R.EVERY : X.snapT) - dt;
    if (X.snapT <= 0) { if (!R.checkpoint(X)) X.snapT = 2; }
  };

  /** Avant la première zone : remet en place l'état général. */
  R.prepare = function (X, s) {
    X.restore = s.zones || {};
    X.conquered = new Set(s.conquered || []);
    X.heartDone = !!s.heartDone;
    X.bag = Object.assign({}, s.bag || {});
    X.cargo = (s.cargo || []).map((c) => Object.assign({}, c));
    X.stats = Object.assign(X.stats, s.stats || {});
    X.time = s.time || 0;
    X.eventsDone = new Set(s.eventsDone || []);
    X.freed = new Set(s.freed || []); // prisonniers déjà libérés : ils ne retournent pas dans leur cage
    X.beaconUsed = !!s.beaconUsed;
    X.search = s.search || null;
    if (s.nation) AN.Nations.restore(X, s.nation); // avant la première zone : ses villes savent si elles vous sont ouvertes
    if (s.base && AN.Base) AN.Base.restore(X, s.base);
    else if (X.base) { X.base.state = 'ok'; X.player.hidden = false; } // point de reprise d'avant la 1.9 : l'hexagone est déjà posé
    if (X.civ && s.civ) {
      const st = s.civ.state;
      Object.assign(X.civ, s.civ);
      // les situations en cours (rassemblement, défense d'une arche) reprennent depuis le début
      if (st === 'rally' || st === 'ark' || st === 'launch') X.civ.state = 'met';
      const aboard = X.cargo.filter((c) => c.inhabitants && c.people === X.civ.people).reduce((a, c) => a + c.inhabitants, 0);
      X.civ.n = Math.max(0, (X.world.civ ? X.world.civ.n : X.civ.n) - aboard - (X.civ.killed || 0));
    }
  };

  /** Une fois dans la zone : position, vigueur, compagnons. */
  R.after = function (X, s) {
    const p = X.player;
    if (s.player) {
      const tile = Z.tileAt(X.zone, s.player.x, s.player.y);
      if (!Z.isSolid(tile)) { p.x = s.player.x; p.y = s.player.y; AN.Physics.collide(X.zone, p); X.cam.x = p.x; X.cam.y = p.y; }
      p.hp = Math.min(p.maxHp, Math.max(1, s.player.hp));
    }
    // les prisonniers libérés avant l'interruption rejoignent la troupe
    let freedBack = 0;
    (s.freed || []).forEach((uid) => {
      if (X.allies.some((a) => a.uid === uid)) return;
      const c = AN.Profile.findCreature(X.profile, uid);
      const def = c && D.CREATURE[c.species];
      if (!def || !c.lost) return;
      const e = AN.Entities.creature(def, p.x, p.y, { team: 'ally', variant: c.variant, hueSeed: c.hueSeed, foreign: c.foreign, uid: c.uid, nickname: c.nickname, scale: 1.4, size: AN.Bonds.sizeMul(c), stage: c.stage });
      e.hp = e.maxHp * 0.6;
      e.temper = 'agressif';
      e.loyalty = c.loyalty;
      e.abilityId = D.trait(c.species).ability;
      e.keys = D.trait(c.species).keys;
      e.powerMul = AN.Bonds.powerMul(c);
      e.cdMul = AN.Bonds.cooldownMul(c);
      X.allies.push(e);
      freedBack++;
    });
    if (freedBack) AN.Abilities.setup(X);
    AN.Nations.restoreMercs(X, s.mercs); // les mercenaires reprennent leur place (1.13)
    const byUid = new Map((s.allies || []).map((a) => [a.uid, a]));
    X.allies.forEach((a, i) => {
      const sa = byUid.get(a.uid);
      if (sa) { a.hp = Math.min(a.maxHp, Math.max(1, sa.hp)); a.downed = sa.downed; a.kills = sa.kills; }
      const ang = (i / Math.max(1, X.allies.length)) * Math.PI * 2;
      a.x = p.x + Math.cos(ang) * 40; a.y = p.y + Math.sin(ang) * 40;
      a.home = { x: a.x, y: a.y };
      AN.Physics.collide(X.zone, a);
    });
    if (s.callUsed && X.abil && X.abil.call) X.abil.call.used = true;
    // X.restore reste en place : les autres zones visitées seront remises en état en y entrant
    AN.HUD.refreshConsumables(X);
    AN.HUD.refreshAbilities(X);
    AN.HUD.zoneChanged(X);
    setTimeout(() => AN.HUD.toast('Expédition reprise : ' + X.world.code + '. Les créatures ont repris leur place ; vos découvertes sont intactes.', 6), 600);
    X.snapT = 3;
  };

  /** Résumé lisible d'un point de reprise, pour la question au chargement. */
  R.describe = function (s) {
    const w = s.world;
    const unit = w.scale && w.scale !== 'region' && D.ECHELONS[w.scale] ? D.ECHELONS[w.scale].unit.toLowerCase() : 'zone';
    const bits = [];
    bits.push(s.zi >= w.zones.length ? 'au cœur' : unit + ' ' + (s.zi + 1) + ' sur ' + w.zones.length);
    const n = (s.cargo || []).length;
    if (n) bits.push(n + ' élément' + (n > 1 ? 's' : '') + ' dans la soute');
    const bag = Object.values(s.bag || {}).reduce((a, b) => a + b, 0);
    if (bag) bits.push(bag + ' ressource' + (bag > 1 ? 's' : '') + ' dans le sac');
    if ((s.conquered || []).length) bits.push(s.conquered.length + ' zone' + (s.conquered.length > 1 ? 's' : '') + ' conquise' + (s.conquered.length > 1 ? 's' : ''));
    return w.code + ', ' + w.region + ' : ' + bits.join(', ') + '.';
  };
})();
