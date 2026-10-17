/* Recherche ciblée : le joueur désigne une ressource ou une créature, et
   l'Artefact indique précisément quels mondes la contiennent, dans quelles
   zones et en quelle quantité. Sans recherche active, les informations des
   destinations restent celles, approximatives, du scanner.
   Le décompte est exact : il repose sur la génération déterministe des zones. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const Z = AN.ZoneGen;
  const TAU = Math.PI * 2;

  const Se = (AN.Search = {});
  const cache = new Map();

  Se.label = (t) => (!t ? '' : t.kind === 'res' ? D.RESOURCES[t.id].name : D.CREATURE[t.id].name);
  Se.get = (prof) => prof.search || null;
  Se.set = function (prof, kind, id) {
    prof.search = kind && id ? { kind, id } : null;
    AN.Save.write(prof);
  };
  Se.same = (a, b) => !!a && !!b && a.kind === b.kind && a.id === b.id;

  /** Ce que l'on peut chercher : toutes les ressources, et les créatures déjà observées. */
  Se.options = function (prof) {
    const res = Object.keys(D.RESOURCES).sort((a, b) => D.RESOURCES[a].name.localeCompare(D.RESOURCES[b].name, 'fr'));
    const crea = D.CREATURES.filter((c) => prof.bestiary[c.id]).sort((a, b) => a.name.localeCompare(b.name, 'fr')).map((c) => c.id);
    return { res, crea };
  };

  /** Décompte exact dans un monde : { total, zones: [{ zi, name, count, guardian, vault }] }. */
  Se.scanWorld = function (world, target) {
    if (!target) return null;
    const key = world.seed + '|' + (world.scale || 'region') + '|' + target.kind + ':' + target.id;
    if (cache.has(key)) return cache.get(key);
    const out = { total: 0, zones: [] };
    const n = world.zones.length;
    for (let zi = 0; zi <= n; zi++) {
      const spec = zi < n ? world.zones[zi] : world.heart;
      // filtre rapide avant de générer la zone
      const biomes = [spec.biome, spec.mix].filter(Boolean).map((b) => D.BIOME[b]);
      const deepOk = (b) => !!D.deepVeinsFor && (!world.scale || world.scale === 'region' || world.scale === 'monde') && D.deepVeinsFor(b).includes(target.id);
      if (target.kind === 'res' && !biomes.some((b) => b.resources[target.id] || deepOk(b)) && !(target.id === 'essence' && spec.vault)) continue;
      const odd = world.anomalyZone === zi && (world.anomaly === 'errant' || world.anomaly === 'signal');
      if (target.kind === 'creature' && !odd && spec.guardian !== target.id && !biomes.some((b) => AN.WorldGen.pool(b.id).some((c) => c.id === target.id))) continue;
      const zone = Z.generate(world, zi);
      let count = 0, vault = 0, deep = 0, guardian = false;
      if (target.kind === 'res') {
        zone.nodes.forEach((nd) => { if (nd.res === target.id) { const q = nd.amount * nd.uses; count += q; if (nd.vault) vault += q; if (nd.deep) deep += q; } });
      } else {
        zone.groups.forEach((g) => { if (g.species === target.id) { count += g.count; if (g.vault) vault += g.count; } });
        (zone.eggs || []).forEach((e) => { if (e.species === target.id) { count++; vault++; } });
        if (spec.guardian === target.id) { count++; guardian = true; }
      }
      if (count > 0) out.zones.push({ zi, name: spec.name, count, vault, deep, guardian, heart: zi === n });
      out.total += count;
    }
    cache.set(key, out);
    return out;
  };

  /** Texte court pour une destination. */
  Se.summary = function (world, target) {
    const r = Se.scanWorld(world, target);
    if (!r || !r.total) return 'Absent de ce monde.';
    const what = target.kind === 'res' ? r.total + ' unité' + (r.total > 1 ? 's' : '') + ' de ' + D.RESOURCES[target.id].name : r.total + ' ' + D.CREATURE[target.id].name;
    const where = r.zones.map((z) => (z.heart ? 'cœur' : 'zone ' + (z.zi + 1)) + (z.guardian ? ' (gardien)' : '') + (z.vault ? ' (dont ' + z.vault + ' en caveau scellé)' : '') + (z.deep ? ' (dont ' + z.deep + ' en filon profond)' : '')).join(', ');
    return what + ' : ' + where + '.';
  };

  /** Échelons où la cible peut se trouver, dans l'ordre. */
  Se.scalesFor = function (target) {
    if (target.kind === 'creature') {
      const c = D.CREATURE[target.id];
      if (c.scale === 'monde') return ['monde'];
      if (c.scale) return [c.scale];
      return c.tier === 3 ? ['region', 'monde'] : ['region', 'monde'];
    }
    const sc = new Set();
    D.BIOMES.forEach((b) => { if (b.resources[target.id]) { if (!b.scale) { sc.add('region'); sc.add('monde'); } else sc.add(b.scale); } });
    if (target.id === 'essence' || target.id === 'noyau') sc.add('region');
    return D.ECHELON_ORDER.filter((s) => sc.has(s));
  };

  Se.SWEEP_COST = { etincelle: 5, verre: 3 };
  /** Coût réel (l'observatoire le réduit). */
  Se.sweepCost = (prof) => AN.Profile.scaledCost(Se.SWEEP_COST, 1 - Math.min(0.6, AN.Profile.powers(prof).sweep || 0));

  /**
   * Balayage ciblé : l'Artefact cherche un monde qui contient la cible et l'ajoute aux destinations.
   * Renvoie { world } ou { error }.
   */
  Se.sweep = function (prof, target, scale) {
    const P = AN.Profile;
    const rank = P.rank(prof).index;
    const scales = Se.scalesFor(target).filter((s) => rank >= D.ECHELONS[s].rank);
    if (!scales.length) {
      const need = Se.scalesFor(target)[0];
      return { error: 'L’Artefact ne capte pas encore les ' + (need ? D.ECHELONS[need].plural.toLowerCase() : 'mondes') + ' où l’on trouve ' + Se.label(target) + '.' };
    }
    const sc = scales.includes(scale) ? scale : scales[0];
    const cost = Se.sweepCost(prof);
    if (!P.pay(prof, cost)) return { error: 'Un balayage ciblé coûte ' + Object.entries(cost).map(([k, n]) => n + ' ' + D.RESOURCES[k].name).join(' et ') + '.' };
    prof.sweeps = (prof.sweeps || 0) + 1;
    const cap = D.RANKS[rank].threat;
    const reliab = P.scanner(prof).reliab;
    for (let k = 0; k < 400; k++) {
      const seed = AN.hash(prof.seed + ':quete:' + target.kind + target.id + ':' + prof.sweeps + ':' + k);
      const r = AN.RNG.from(seed, 'menace');
      const threat = sc === 'region' ? r.int(Math.max(1, cap - 2), cap) : 7;
      const w = AN.WorldGen.destination(seed, { scale: sc, threat, reliability: reliab, rep: AN.Civ.reputation(prof) });
      const res = Se.scanWorld(w, target);
      if (res && res.total > 0) {
        w.found = { kind: target.kind, id: target.id };
        if (sc === 'region') { prof.destinations = P.destinations(prof).filter((x) => !x.found).concat([]); prof.destinations.unshift(w); }
        else { const L = P.destinations(prof, sc).filter((x) => !x.found); L.unshift(w); prof.destByScale[sc] = L; }
        AN.Save.write(prof);
        return { world: w, scale: sc };
      }
    }
    return { error: 'Aucun monde accessible ne contient ' + Se.label(target) + ' pour l’instant.' };
  };

  /* ======================= En expédition ======================= */
  /** Positions des cibles dans la zone courante. */
  Se.targets = function (X) {
    const t = X.search;
    if (!t) return [];
    const out = [];
    if (t.kind === 'res') X.zone.nodes.forEach((n) => { if (n.res === t.id && n.uses > 0) out.push({ x: n.x, y: n.y }); });
    else {
      X.creatures.forEach((e) => { if (e.alive && e.def.id === t.id && !e.hidden) out.push({ x: e.x, y: e.y, e }); });
      (X.zone.eggs || []).forEach((e) => { if (!e.taken && e.species === t.id) out.push({ x: e.x, y: e.y }); });
    }
    return out;
  };

  Se.onEnterZone = function (X) {
    if (!X.search) return;
    const list = Se.targets(X);
    const lab = Se.label(X.search);
    if (list.length) AN.HUD.toast('Recherche : ' + (X.search.kind === 'res' ? list.length + ' gisement' + (list.length > 1 ? 's' : '') + ' de ' + lab : list.length + ' ' + lab) + ' dans cette zone. La flèche bleue vous guide.', 5);
    else {
      const r = Se.scanWorld(X.world, X.search);
      const others = r ? r.zones.filter((z) => z.zi !== X.zi) : [];
      const name = (z) => (z.heart ? X.echelon.heart.toLowerCase() : X.echelon.unit.toLowerCase() + ' ' + (z.zi + 1)) + ' (' + z.name + ')';
      AN.HUD.toast('Recherche : rien ici.' + (others.length ? ' Cherchez plutôt : ' + others.map(name).join(', ') + '.' : ''), 6);
    }
  };

  /** Marques sur la mini-carte (k : échelle de la mini-carte). */
  Se.drawMinimap = function (ctx, X, k, t) {
    if (!X.search) return;
    ctx.strokeStyle = AN.CYAN; ctx.lineWidth = 1.5;
    for (const q of Se.targets(X)) {
      ctx.beginPath(); ctx.arc(q.x * k, q.y * k, 3 + Math.sin(t * 5) * 1, 0, TAU); ctx.stroke();
    }
  };

  /** Flèche au bord de l'écran vers la cible la plus proche. */
  Se.drawCompass = function (ctx, X, t) {
    if (!X.search) return;
    const p = X.player;
    let best = null, bd = 1e12;
    for (const q of Se.targets(X)) { const d = U.dist(q.x, q.y, p.x, p.y); if (d < bd) { bd = d; best = q; } }
    if (!best) return;
    const cam = X.cam;
    const s = cam.worldToScreen(best.x, best.y);
    const W = cam.W, H = cam.H;
    const inside = s.x > 30 && s.y > 30 && s.x < W - 30 && s.y < H - 30;
    ctx.save();
    if (inside) {
      ctx.strokeStyle = AN.CYAN; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.x, s.y, 22 + Math.sin(t * 5) * 3, 0, TAU); ctx.stroke();
    } else {
      // la flèche tourne autour du personnage : elle ne se cache jamais sous l'interface
      const ps = cam.worldToScreen(p.x, p.y);
      const a = Math.atan2(s.y - ps.y, s.x - ps.x);
      const r = 74 + Math.sin(t * 4) * 4;
      const x = ps.x + Math.cos(a) * r, y = ps.y + Math.sin(a) * r;
      ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = AN.CYAN; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-7, -9); ctx.lineTo(-2, 0); ctx.lineTo(-7, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.rotate(-a);
      ctx.font = '600 11px ' + AN.FONT_UI; ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      const txt = Se.label(X.search) + ' · ' + Math.round(bd / Z.T) + ' m';
      const ty = Math.sin(a) > 0.3 ? 24 : -16;
      ctx.strokeText(txt, 0, ty); ctx.fillStyle = AN.INK; ctx.fillText(txt, 0, ty);
    }
    ctx.restore();
  };
})();
