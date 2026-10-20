/* Les peuples installés dans l'Archive : humeur, demandes, offrandes,
   sabotages, grèves, départs, et ce qu'ils apportent quand ils vont bien. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;

  const S = (AN.Settlements = {});

  const list = (p) => (p.settlements = p.settlements || []);
  const tmapOf = (p) => new Map(p.territories.map((t) => [t.uid, t]));

  /** Facteur d'humeur appliqué aux bonus (0,3 à 1,2). */
  S.moodFactor = (st) => U.clamp(st.mood / 70, 0.3, 1.2);

  /** Voisins (territoires adjacents) d'un territoire. */
  function neighbourHomes(p, home) {
    const t = p.territories.find((x) => x.uid === home);
    if (!t) return [];
    return AN.Shapes.neighbors(p, t).map((o) => o.uid);
  }
  function conflictsWith(p, st) {
    const near = new Set(neighbourHomes(p, st.home).concat([st.home]));
    return list(p).filter((o) => o !== st && o.home && near.has(o.home) && D.CIV_CONFLICTS.some(([a, b]) => (a === st.people && b === o.people) || (b === st.people && a === o.people)));
  }

  S.moodTarget = function (p, st) {
    const P = D.PEOPLE[st.people];
    let t = st.forced ? 25 : st.attitude === 'devots' ? 85 : 62;
    const home = st.home ? p.territories.find((x) => x.uid === st.home) : null;
    if (!home) t -= 18;
    else if (P.biomes.includes(home.biome)) t += 12;
    else t -= 10;
    if (conflictsWith(p, st).length) t -= 15;
    if (!st.village) t -= 8;
    if (AN.Structures) t += AN.Structures.powers(p).mood; // temple (1.9)
    return U.clamp(t, 0, 100);
  };
  S.moodWhy = function (p, st) {
    const P = D.PEOPLE[st.people];
    const out = [];
    const home = st.home ? p.territories.find((x) => x.uid === st.home) : null;
    if (st.forced) out.push('Ils n’ont pas choisi de venir.');
    if (!home) out.push('Le Néant ne leur offre rien : ils voudraient une terre.');
    else if (P.biomes.includes(home.biome)) out.push('Ils reconnaissent ce paysage.');
    else out.push('Ce paysage leur est étranger.');
    const c = conflictsWith(p, st);
    if (c.length) out.push('Ils ne supportent pas leurs voisins, ' + c.map((o) => D.PEOPLE[o.people].name).join(' et ') + '.');
    if (!st.village) out.push('Ils vivent dans des abris de fortune.');
    if (st.request) out.push('Ils attendent une réponse à leur demande.');
    return out;
  };

  /* ---------- ce qu'ils apportent ---------- */
  S.effects = function (p, st) {
    const P = D.PEOPLE[st.people];
    const home = st.home ? p.territories.find((x) => x.uid === st.home) : null;
    const mf = S.moodFactor(st);
    const out = [];
    const work = Math.round(Math.min(40, st.n * 4) * mf * (st.village ? 1 : 0.6));
    out.push({ kind: 'work', text: 'Travailleurs : +' + work + ' % de production' + (home ? ' dans ' + D.BIOME[home.biome].name : ''), active: !!home && st.mood >= 25, why: !home ? 'Installez-les dans un territoire.' : 'Leur humeur est trop basse.' });
    out.push({ kind: P.bonus.kind, text: P.bonus.desc, active: st.mood >= 45, why: 'Il faut qu’ils soient au moins paisibles.' });
    if (st.attitude === 'devots') out.push({ kind: 'shrine', text: 'Leur autel : +5 % de production partout', active: !!st.shrine && st.mood >= 50, why: st.shrine ? 'Leur ferveur faiblit.' : 'Ils n’ont pas encore bâti leur autel.' });
    return out;
  };

  /** Bonus cumulés de tous les peuples, pour profile.js et production.js. */
  S.powers = function (p) {
    const pw = { craft: 0, upgrade: 0, cargo: 0, capture: 0, hp: 0, loyalty: 0, prodAll: 0, prodBy: {}, strike: {} };
    const now = Date.now();
    list(p).forEach((st) => {
      const P = D.PEOPLE[st.people];
      const mf = S.moodFactor(st);
      if (st.home && st.mood >= 25) pw.prodBy[st.home] = (pw.prodBy[st.home] || 0) + Math.min(0.4, st.n * 0.04) * mf * (st.village ? 1 : 0.6);
      if (st.mood >= 45) {
        const b = P.bonus;
        if (b.kind === 'prod' && st.home) pw.prodBy[st.home] = (pw.prodBy[st.home] || 0) + b.value;
        else if (b.kind in pw && typeof pw[b.kind] === 'number') pw[b.kind] += b.value;
      }
      if (st.shrine && st.mood >= 50) pw.prodAll += 0.05;
    });
    p.territories.forEach((t) => { if (t.strikeUntil && t.strikeUntil > now) pw.strike[t.uid] = true; });
    (p.structures || []).forEach((s) => { if (s.kind === 'arche') pw.cargo += 2; });
    pw.craft = Math.min(0.25, pw.craft);
    pw.upgrade = Math.min(0.25, pw.upgrade);
    return pw;
  };

  /* ---------- gestes du joueur ---------- */
  S.giftCost = (st) => ({ [D.PEOPLE[st.people].likes]: 4 + Math.ceil(st.n / 4) });
  S.gift = function (p, st) {
    const cost = S.giftCost(st);
    if (!AN.Profile.pay(p, cost)) return false;
    st.mood = Math.min(100, st.mood + 12);
    AN.Bonds.log(p, D.PEOPLE[st.people].Name + ' acceptent vos présents.', 'civ');
    return true;
  };
  S.answer = function (p, st, yes) {
    const r = st.request;
    if (!r) return false;
    if (yes) {
      if (!AN.Profile.pay(p, r.cost)) return false;
      st.mood = Math.min(100, st.mood + 15);
      AN.Bonds.log(p, D.PEOPLE[st.people].Name + ' vous remercient.', 'civ');
    } else {
      st.mood = Math.max(0, st.mood - 8);
      AN.Bonds.log(p, D.PEOPLE[st.people].Name + ' n’oublieront pas votre refus.', 'civ');
    }
    st.request = null;
    return true;
  };
  S.release = function (p, st) {
    p.settlements = list(p).filter((x) => x !== st);
    AN.Bonds.log(p, D.PEOPLE[st.people].Name + ' sont partis dans le Néant. Personne ne sait où il mène.', 'civ');
  };

  /* ---------- le temps qui passe ---------- */
  /** Renvoie les événements marquants (textes) pour l'interface. */
  S.tick = function (p, minutes) {
    const ev = [];
    const now = Date.now();
    list(p).slice().forEach((st) => {
      const P = D.PEOPLE[st.people];
      const name = P.Name;
      const target = S.moodTarget(p, st);
      st.mood = U.clamp(st.mood + (target - st.mood) * Math.min(1, minutes * 0.012), 0, 100);
      if (st.request) {
        st.request.left -= minutes;
        if (st.request.left <= 0) {
          st.request = null;
          st.mood = Math.max(0, st.mood - 10);
          AN.Bonds.log(p, name + ' ont attendu en vain une réponse.', 'civ');
        }
      }
      // savoir confié par les peuples qui connaissent l'Archive
      if (P.bonus.kind === 'lore' && st.mood >= 45 && !st.knowledge) {
        st.knowledge = true;
        p.civLore = p.civLore || [];
        const i = D.CIV_KNOWLEDGE.findIndex((_, k) => !p.civLore.includes(k));
        if (i >= 0) { p.civLore.push(i); ev.push(name + ' vous confient ce qu’ils savent. (Journal)'); AN.Bonds.log(p, name + ' : « ' + D.CIV_KNOWLEDGE[i] + ' »', 'civ'); }
      }
      st.nextEvent = (st.nextEvent == null ? 10 : st.nextEvent) - minutes;
      if (st.nextEvent > 0) return;
      st.nextEvent = 9 + Math.random() * 8;
      const home = st.home ? p.territories.find((x) => x.uid === st.home) : null;
      const hidden = st.infiltrators > 0 || (st.attitude === 'voleurs' && !st.forced);
      // infiltrés et voleurs
      if (hidden && Math.random() < 0.55) {
        const scout = p.collection.some((c) => !c.lost && (c.home || null) === (st.home || null) && D.CREATURE[c.species].roles.includes('eclaireur'));
        if (scout) {
          const k = Math.max(1, st.infiltrators || Math.ceil(st.n / 3));
          st.n = Math.max(1, st.n - k);
          st.infiltrators = 0;
          st.revealed = true;
          const stash = { [P.likes]: 4 + k * 2 };
          for (const r in stash) AN.Profile.add(p, r, stash[r]);
          const t = 'Vos éclaireurs ont démasqué ' + k + ' saboteur' + (k > 1 ? 's' : '') + ' parmi ' + P.name + '. Ils ont été chassés, et leur butin rendu.';
          ev.push(t); AN.Bonds.log(p, t, 'civ');
          if (st.attitude === 'voleurs') st.attitude = 'suppliants';
        } else {
          const keys = Object.keys(p.stock).filter((r) => p.stock[r] >= 5);
          if (keys.length) {
            const r = keys[Math.floor(Math.random() * keys.length)];
            const n = Math.max(1, Math.floor(p.stock[r] * (0.08 + Math.random() * 0.1)));
            AN.Profile.add(p, r, -n);
            st.thefts = (st.thefts || 0) + 1;
            if (st.thefts >= 2) st.revealed = true;
            const t = n + ' ' + D.RESOURCES[r].name + ' ont disparu de la réserve.' + (st.revealed ? ' On a vu ' + P.name + ' rôder autour.' : '');
            ev.push(t); AN.Bonds.log(p, t, 'civ');
          }
        }
        return;
      }
      // contraints malheureux : grève, puis fuite
      if (st.forced && st.mood < 22) {
        if (st.mood < 8 && Math.random() < 0.5) {
          p.settlements = list(p).filter((x) => x !== st);
          const t = name + ' se sont enfuis dans le Néant. Il n’en reste aucune trace.';
          ev.push(t); AN.Bonds.log(p, t, 'civ');
          return;
        }
        if (home) {
          home.strikeUntil = now + 20 * 60000;
          const t = name + ' refusent de travailler. La production de ' + D.BIOME[home.biome].name + ' est divisée par deux.';
          ev.push(t); AN.Bonds.log(p, t, 'civ');
          if (st.attitude === 'iconoclastes') neighbourHomes(p, st.home).forEach((u) => { const o = p.territories.find((x) => x.uid === u); if (o) o.strikeUntil = now + 10 * 60000; });
          return;
        }
      }
      // autel des dévots
      if (st.attitude === 'devots' && !st.shrine && st.mood >= 60) {
        st.shrine = true;
        const t = name + ' ont bâti un autel à votre image.';
        ev.push(t); AN.Bonds.log(p, t, 'civ');
        return;
      }
      // offrande
      if (st.mood >= 70 && Math.random() < 0.5) {
        const gift = { [P.likes]: 3 + Math.floor(Math.random() * 4) };
        for (const r in gift) AN.Profile.add(p, r, gift[r]);
        const t = D.CIV_GIFTS[Math.floor(Math.random() * D.CIV_GIFTS.length)].replace('{peuple}', name).replace('{gift}', gift[P.likes] + ' ' + D.RESOURCES[P.likes].name);
        ev.push(t); AN.Bonds.log(p, t, 'civ');
        return;
      }
      // demande
      if (!st.request) {
        const commons = Object.keys(D.RESOURCES).filter((r) => D.RESOURCES[r].rarity === 0);
        const res = Math.random() < 0.6 ? P.likes : commons[Math.floor(Math.random() * commons.length)];
        const n = 4 + Math.ceil(st.n / 3);
        const tpl = D.CIV_REQUESTS[0];
        const reason = tpl.reasons[Math.floor(Math.random() * tpl.reasons.length)];
        st.request = { cost: { [res]: n }, left: 25, text: tpl.text.replace('{peuple}', name).replace('{n}', n).replace('{res}', D.RESOURCES[res].name).replace('{raison}', reason) };
        ev.push(name + ' ont une demande. Allez leur parler.');
      }
    });
    return ev;
  };

  /* ---------- disposition dans l'Archive ---------- */
  /** Positions des bâtiments et des habitants de chaque village. */
  S.layout = function (p) {
    const H = AN.Hex;
    const out = [];
    const tmap = tmapOf(p);
    const inNeant = list(p).filter((st) => !st.home || !tmap.get(st.home));
    list(p).forEach((st, i) => {
      const t = st.home ? tmap.get(st.home) : null;
      let cx, cy, R;
      if (t) { const c = AN.Shapes.centers(t)[AN.hash(st.uid) % AN.Shapes.cellsOf(t).length]; cx = c.x; cy = c.y; R = H.R * 0.45; }
      else {
        const k = inNeant.indexOf(st);
        const a = -Math.PI / 2 + (k / Math.max(1, inNeant.length)) * Math.PI * 2 + 0.6;
        cx = Math.cos(a) * 330; cy = Math.sin(a) * 330; R = 110;
      }
      // plusieurs peuples dans le même territoire : on les décale
      const same = out.filter((o) => o.home === (st.home || null) && st.home);
      if (same.length) { cx += Math.cos(same.length * 2.1) * H.R * 0.3; cy += Math.sin(same.length * 2.1) * H.R * 0.3; R *= 0.7; }
      const nb = st.village ? Math.min(6, 3 + Math.floor(st.n / 6)) : 2;
      const rng = AN.RNG.from(AN.hash(st.uid), 'disposition');
      const base = rng.float(0, Math.PI * 2);
      const buildings = [];
      for (let k = 0; k < nb; k++) {
        const a = base + (k / nb) * Math.PI * 2;
        buildings.push({ x: cx + Math.cos(a) * R * 0.75, y: cy + Math.sin(a) * R * 0.75, variant: rng.int(0, 2), seed: rng.int(1, 1e6), tent: !st.village });
      }
      out.push({ st, home: st.home || null, x: cx, y: cy, r: R, buildings });
    });
    return out;
  };

  /** Petite tente de fortune, pour les peuples arrivés sans leur village. */
  S.drawTent = function (ctx, x, y, s, P) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(s * 0.06, s * 0.14, s * 0.42, s * 0.24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = U.mix(P.body.cloth, '#d8cdb5', 0.5); ctx.strokeStyle = AN.INK; ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.beginPath(); ctx.moveTo(0, -s * 0.38); ctx.lineTo(s * 0.4, s * 0.25); ctx.lineTo(-s * 0.4, s * 0.25); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -s * 0.38); ctx.lineTo(0, s * 0.25); ctx.stroke();
    ctx.restore();
  };
})();
