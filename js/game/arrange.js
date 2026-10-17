/* Agencement de l'Archive (1.7).
   - Un territoire qui arrive choisit sa forme : il pousse case par case dans
     les creux de l'Archive (ses cases préférées sont celles qui touchent déjà
     quelque chose), un peu attiré par ses partenaires de synergie.
   - Un territoire déplacé peut garder sa forme ou prendre celle de sa nouvelle
     place (forme adaptée).
   - Le rangement automatique cherche la disposition qui rapporte le plus de
     synergies, évite les voisinages néfastes et garde l'Archive compacte.
   Logique pure : le module lit le profil et rend des dispositions
   { uid: { q, r, cells } } ; l'Archive les applique et les dessine.
   L'Archive n'a pas à être ronde : un champ de bruit propre à chaque partie
   lui donne des avancées et des baies, à la manière d'une côte. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const H = AN.Hex;

  const Ag = (AN.Arrange = {});

  /** Poids des critères (valeurs de production par minute, à peu près). */
  Ag.W = {
    perim: 0.025, // chaque côté de l'Archive laissé contre le vide (compacité, trous)
    tperim: 0.07, // chaque côté d'un territoire, quand les formes changent (formes ramassées)
    forge: 1.2, // une synergie de Forge (−10 % à l'Atelier) ; deux au plus comptent
    conflict: 1.5, // deux peuples ennemis installés côte à côte
  };
  /** Réglages de la croissance des formes (arrivée, rangement). */
  Ag.TUNE = {
    arrival: { wOwn: 1.25, wOcc: 0.5, wPartner: 0.45, wNoise: 0.35, wDist: 0.05, jitter: 0.08, synW: 0.5, perimW: 0.1, tperimW: 0.14, noiseW: 0.3, distW: 0.06 },
    grow: { wOwn: 1.2, wOcc: 0.5, wPartner: 1.0, wNoise: 0.45, wDist: 0.1, jitter: 0.04, synW: 1, perimW: 0.06, tperimW: 0.09, noiseW: 0.2, distW: 0.07 },
  };
  const BASE_DEFAULT = { fragment: 0.6, territoire: 2, coeur: 4, continent: 3, cratere: 5 };
  const baseOf = (quality) => ((AN.Production && AN.Production.BASE) || BASE_DEFAULT)[quality] || 1;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  /* ---------- grille : une case = un entier ---------- */
  const OFF = 1024, SPAN = 2048;
  const key = (q, r) => (q + OFF) * SPAN + (r + OFF);
  const kq = (k) => Math.floor(k / SPAN) - OFF;
  const kr = (k) => (k % SPAN) - OFF;
  const NB = H.DIRS.map(([dq, dr]) => dq * SPAN + dr);
  const CENTER = key(0, 0);
  const hexLen = (q, r) => (Math.abs(q) + Math.abs(q + r) + Math.abs(r)) / 2;
  const ring = (k) => hexLen(kq(k), kr(k));
  const kdist = (a, b) => hexLen(kq(a) - kq(b), kr(a) - kr(b));
  Ag.key = key;

  /** Bruit propre à la partie : les directions où l'Archive aime s'avancer. */
  function noiseField(seed) {
    const N = new AN.Noise(AN.hash('agencement:' + seed));
    const cache = new Map();
    return (k) => {
      let v = cache.get(k);
      if (v === undefined) {
        const q = kq(k), r = kr(k);
        v = (N.fbm((Math.sqrt(3) * (q + r / 2)) / 3.4, (1.5 * r) / 3.4, 2) - 0.5) * 2;
        cache.set(k, v);
      }
      return v;
    };
  }

  /* ---------- ce que vaut un voisinage ---------- */
  function peopleByTerritory(p) {
    const m = new Map();
    (p.settlements || []).forEach((st) => {
      if (!st.home) return;
      if (!m.has(st.home)) m.set(st.home, []);
      m.get(st.home).push(st.people);
    });
    return m;
  }
  function itemOf(t, pm) {
    const B = D.BIOME[t.biome];
    return { t, uid: t.uid, n: AN.Shapes.cellsOf(t).length, base: baseOf(t.quality), tags: B ? B.tags : [], people: (pm && pm.get(t.uid)) || [] };
  }
  /** Valeur d'un voisinage : synergies (pondérées par la production des deux), Forge, peuples ennemis. */
  function pairValue(a, b) {
    let v = 0, forge = 0;
    for (const s of D.SYNERGIES) {
      if ((a.tags.includes(s.a) && b.tags.includes(s.b)) || (a.tags.includes(s.b) && b.tags.includes(s.a))) {
        if (s.mult) v += s.mult * (a.base + b.base);
        if (s.effect === 'craft') forge++;
      }
    }
    if (a.people.length && b.people.length && D.CIV_CONFLICTS) {
      for (const x of a.people) for (const y of b.people) {
        if (D.CIV_CONFLICTS.some(([c, d]) => (c === x && d === y) || (c === y && d === x))) v -= Ag.W.conflict;
      }
    }
    return { v, forge };
  }
  Ag.pairValue = pairValue;

  function model(p, extra) {
    const pm = peopleByTerritory(p);
    const items = p.territories.map((t) => itemOf(t, pm));
    if (extra) items.push(extra);
    const n = items.length;
    const V = new Float32Array(n * n), F = new Uint8Array(n * n);
    const pot = new Float32Array(n);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const pv = pairValue(items[i], items[j]);
      V[i * n + j] = V[j * n + i] = pv.v;
      F[i * n + j] = F[j * n + i] = pv.forge;
      if (pv.v > 0) { pot[i] += pv.v; pot[j] += pv.v; }
      if (pv.forge) { pot[i] += Ag.W.forge * 0.5; pot[j] += Ag.W.forge * 0.5; }
    }
    return { items, n, pot, v: (i, j) => V[i * n + j], f: (i, j) => F[i * n + j] };
  }

  /* ---------- état d'une disposition ---------- */
  function emptyState() { return { occ: new Map([[CENTER, -1]]), cells: [] }; }
  function stateFrom(p, M) {
    const st = emptyState();
    M.items.forEach((it, i) => {
      if (!it.t) return;
      put(st, i, AN.Shapes.abs(it.t).map((c) => key(c.q, c.r)));
    });
    return st;
  }
  function cloneState(st) { return { occ: new Map(st.occ), cells: st.cells.map((c) => (c ? c.slice() : c)) }; }
  function put(st, i, keys) { st.cells[i] = keys; for (const k of keys) st.occ.set(k, i); }
  function take(st, i) { const keys = st.cells[i]; if (keys) for (const k of keys) if (st.occ.get(k) === i) st.occ.delete(k); st.cells[i] = null; return keys; }

  /** Valeur d'une disposition : synergies, Forge, compacité. */
  function evaluate(st, M, reshape) {
    const n = M.n;
    const seen = new Uint8Array(n * n);
    let syn = 0, forge = 0, perim = 0, tper = 0, pos = 0, neg = 0;
    for (let i = 0; i < st.cells.length; i++) {
      const cs = st.cells[i];
      if (!cs) continue;
      for (const k of cs) for (let d = 0; d < 6; d++) {
        const o = st.occ.get(k + NB[d]);
        if (o === i) continue;
        tper++;
        if (o === undefined) { perim++; continue; }
        if (o < 0 || o < i) continue;
        const pk = i * n + o;
        if (seen[pk]) continue;
        seen[pk] = 1;
        const v = M.v(i, o);
        syn += v; forge += M.f(i, o);
        if (v > 0) pos++; else if (v < 0) neg++;
      }
    }
    const total = syn + Ag.W.forge * Math.min(2, forge) - Ag.W.perim * perim - (reshape ? Ag.W.tperim * tper : 0);
    return { syn, forge, perim, tper, pos, neg, total };
  }

  /** Nombre de cases reliées à l'Artefact (par des cases occupées). */
  function reach(st) {
    const seen = new Set([CENTER]);
    const stack = [CENTER];
    while (stack.length) {
      const k = stack.pop();
      for (const d of NB) { const nk = k + d; if (!seen.has(nk) && st.occ.has(nk)) { seen.add(nk); stack.push(nk); } }
    }
    return seen.size - 1;
  }
  const totalCells = (st) => st.cells.reduce((s, c) => s + (c ? c.length : 0), 0);
  const connected = (st) => reach(st) === totalCells(st);

  /** Cases libres au contact de l'Archive (dans l'ordre d'insertion : déterministe). */
  function frontier(st, allowed) {
    const out = new Set();
    for (const k of st.occ.keys()) for (const d of NB) {
      const nk = k + d;
      if (!st.occ.has(nk) && (!allowed || allowed.has(nk))) out.add(nk);
    }
    return [...out];
  }

  /** Ce que rapporte une forme posée à cet endroit (dans l'état actuel, sans elle). */
  function delta(st, M, i, keys, forgeNow) {
    const own = new Set(keys);
    const touched = new Set();
    let cOcc = 0, eFree = 0, center = false, internal = 0;
    for (const k of keys) for (const d of NB) {
      const nk = k + d;
      if (own.has(nk)) { internal++; continue; }
      const o = st.occ.get(nk);
      if (o === undefined) eFree++;
      else { cOcc++; if (o >= 0) touched.add(o); else center = true; }
    }
    let syn = 0, forge = 0;
    for (const j of touched) { syn += M.v(i, j); forge += M.f(i, j); }
    const fm = Ag.W.forge * (Math.min(2, forgeNow + forge) - Math.min(2, forgeNow));
    return { syn, forge, fm, dP: eFree - cOcc, tper: keys.length * 6 - internal, touches: touched.size > 0 || center, touched };
  }

  /** Bruit moyen et éloignement moyen d'une forme (pour départager). */
  function looks(keys, noise) {
    let nz = 0, rg = 0;
    for (const k of keys) { nz += noise(k); rg += ring(k); }
    return { noise: nz / keys.length, ring: rg / keys.length };
  }

  /* ---------- croissance d'une forme ---------- */
  /**
   * Fait pousser n cases à partir de start, dans les cases libres.
   * o : { allowed, wOwn, wOcc, wPartner, wNoise, wDist, from, wFrom, jitter, rng, noise, forgeNow }
   */
  function grow(st, M, i, n, start, o) {
    if (start === CENTER || st.occ.has(start) || (o.allowed && !o.allowed.has(start))) return null;
    const shape = [start];
    const inS = new Set(shape);
    const touched = new Set();
    const touch = (k) => { for (const d of NB) { const x = st.occ.get(k + d); if (x !== undefined && x >= 0 && x !== i) touched.add(x); } };
    const cand = new Set();
    const addC = (k) => {
      for (const d of NB) {
        const nk = k + d;
        if (!inS.has(nk) && nk !== CENTER && !st.occ.has(nk) && (!o.allowed || o.allowed.has(nk))) cand.add(nk);
      }
    };
    touch(start);
    addC(start);
    const fm = (o.forgeNow || 0) < 2 ? Ag.W.forge : 0;
    while (shape.length < n) {
      let best = -1, bs = -Infinity;
      for (const c of cand) {
        let own = 0, occN = 0, part = 0, j0 = -2, j1 = -2;
        for (let d = 0; d < 6; d++) {
          const nk = c + NB[d];
          if (inS.has(nk)) { own++; continue; }
          const x = st.occ.get(nk);
          if (x === undefined) continue;
          occN++;
          if (x >= 0 && x !== i && !touched.has(x) && x !== j0 && x !== j1) {
            part += M.v(i, x) + (M.f(i, x) ? fm : 0);
            if (j0 === -2) j0 = x; else j1 = x;
          }
        }
        let sc = own * o.wOwn + occN * o.wOcc + part * o.wPartner;
        if (o.wNoise) sc += o.noise(c) * o.wNoise;
        if (o.wDist) sc -= ring(c) * o.wDist;
        if (o.from != null) sc -= kdist(c, o.from) * o.wFrom;
        if (o.jitter) sc += o.rng.next() * o.jitter;
        if (sc > bs) { bs = sc; best = c; }
      }
      if (best < 0) return null;
      shape.push(best);
      inS.add(best);
      cand.delete(best);
      touch(best);
      addC(best);
    }
    return shape;
  }

  /** Note rapide d'une case de départ. */
  function startScore(st, M, i, k, o) {
    let occN = 0, part = 0;
    const seenJ = [];
    for (const d of NB) {
      const x = st.occ.get(k + d);
      if (x === undefined) continue;
      occN++;
      if (x >= 0 && !seenJ.includes(x)) { seenJ.push(x); part += M.v(i, x); }
    }
    return occN * 0.6 + part * (o.synW == null ? 1 : o.synW) + (o.noise(k) * (o.wNoise || 0)) - ring(k) * (o.wDist || 0);
  }

  /** Meilleure forme qui pousse depuis l'une des K meilleures cases de départ. */
  function bestGrown(st, M, i, n, o, K) {
    const F = frontier(st, o.allowed).filter((k) => k !== CENTER);
    const scored = F.map((k) => ({ k, s: startScore(st, M, i, k, o) }));
    scored.sort((a, b) => b.s - a.s || a.k - b.k);
    let best = null;
    const lim = Math.min(scored.length, K);
    for (let s = 0; s < lim; s++) {
      const keys = grow(st, M, i, n, scored[s].k, o);
      if (!keys) continue;
      const dl = delta(st, M, i, keys, o.forgeNow || 0);
      if (!dl.touches) continue;
      const lk = looks(keys, o.noise);
      const sc = (dl.syn + dl.fm) * (o.synW == null ? 1 : o.synW) - o.perimW * dl.dP - o.tperimW * dl.tper + o.noiseW * lk.noise - o.distW * lk.ring;
      if (!best || sc > best.score + 1e-9) best = { score: sc, keys, dl };
    }
    return best;
  }

  /* ---------- formes fixes : rotations ---------- */
  function signature(rel) {
    let b = rel[0];
    for (const c of rel) if (c[0] < b[0] || (c[0] === b[0] && c[1] < b[1])) b = c;
    return rel.map(([q, r]) => [q - b[0], r - b[1]]).sort((x, y) => x[0] - y[0] || x[1] - y[1]).join(';');
  }
  function rotationsOf(rel) {
    const out = [];
    const sigs = new Set();
    let cur = rel;
    for (let r = 0; r < 6; r++) {
      const sig = signature(cur);
      if (!sigs.has(sig)) { sigs.add(sig); out.push(cur); }
      cur = AN.Shapes.rotate(cur);
    }
    return out;
  }
  Ag.rotationsOf = rotationsOf;

  function bestFixed(st, M, i, rots, forgeNow, ctx) {
    const F = frontier(st);
    let best = null;
    for (let ri = 0; ri < rots.length; ri++) {
      const relK = rots[ri].map(([q, r]) => q * SPAN + r);
      const tried = new Set();
      for (const f of F) for (const rk of relK) {
        const anchor = f - rk;
        if (tried.has(anchor)) continue;
        tried.add(anchor);
        const keys = new Array(relK.length);
        let ok = true;
        for (let c = 0; c < relK.length; c++) {
          const k = anchor + relK[c];
          if (k === CENTER || st.occ.has(k)) { ok = false; break; }
          keys[c] = k;
        }
        if (!ok) continue;
        const dl = delta(st, M, i, keys, forgeNow);
        if (!dl.touches) continue;
        const gain = dl.syn + dl.fm - Ag.W.perim * dl.dP;
        const lk = looks(keys, ctx.noise);
        const sc = gain - ctx.perimW * dl.dP + ctx.noiseW * lk.noise - ctx.distW * lk.ring;
        if (!best || sc > best.score + 1e-9) best = { score: sc, gain, keys, dl };
      }
    }
    return best;
  }

  /* ---------- rangement : construction gloutonne ---------- */
  function greedyFixed(M, ctx) {
    const st = emptyState();
    const order = M.items.map((_, i) => i).sort((a, b) => M.items[b].n - M.items[a].n || M.pot[b] - M.pot[a] || a - b);
    let forge = 0;
    for (const i of order) {
      const b = bestFixed(st, M, i, ctx.rots[i], forge, ctx);
      if (!b) return null;
      put(st, i, b.keys);
      forge += b.dl.forge;
    }
    return st;
  }

  function greedyReshape(M, ctx) {
    const st = emptyState();
    const left = new Set(M.items.map((_, i) => i));
    const placed = [];
    let forge = 0;
    while (left.size) {
      let pick = -1, ps = -Infinity;
      for (const i of left) {
        let s = 0;
        for (const j of placed) { const v = M.v(i, j); if (v > 0) s += v; if (M.f(i, j) && forge < 2) s += Ag.W.forge; }
        const it = M.items[i];
        const sc = s * 2 + M.pot[i] * 0.5 + it.n * 0.04 - (it.n === 1 && !s ? 1 : 0);
        if (sc > ps) { ps = sc; pick = i; }
      }
      const o = Object.assign({}, ctx.growW, { rng: ctx.rng, noise: ctx.noise, forgeNow: forge });
      const b = bestGrown(st, M, pick, M.items[pick].n, o, 8);
      if (!b) return null;
      put(st, pick, b.keys);
      forge += b.dl.forge;
      placed.push(pick);
      left.delete(pick);
    }
    return st;
  }

  /* ---------- rangement : améliorations locales ---------- */
  /** Échange deux territoires dont les cases peuvent s'échanger. */
  function swapPass(st, M, ctx, deadline) {
    let improved = false;
    let cur = evaluate(st, M, ctx.reshape).total;
    const groups = new Map();
    M.items.forEach((it, i) => {
      const g = ctx.reshape ? 'n' + it.n : ctx.canon[i];
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(i);
    });
    for (const list of groups.values()) {
      for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
        if (now() > deadline) return improved;
        const i = list[a], j = list[b];
        if (M.items[i].tags === M.items[j].tags && !M.items[i].people.length && !M.items[j].people.length) continue;
        const ci = st.cells[i], cj = st.cells[j];
        put(st, i, cj); put(st, j, ci);
        const v = evaluate(st, M, ctx.reshape).total;
        if (v > cur + 1e-6) { cur = v; improved = true; }
        else { put(st, i, ci); put(st, j, cj); }
      }
    }
    return improved;
  }

  /** Retire un territoire et le repose ailleurs s'il y gagne. */
  function relocatePass(st, M, ctx, deadline) {
    let improved = false;
    const order = M.items.map((_, i) => i);
    ctx.rng.shuffle(order);
    for (const i of order) {
      if (now() > deadline) return improved;
      const before = evaluate(st, M, ctx.reshape);
      const old = take(st, i);
      if (!connected(st)) { put(st, i, old); continue; }
      const forgeNow = evaluate(st, M, ctx.reshape).forge;
      let cand = null;
      if (ctx.reshape) {
        const o = Object.assign({}, ctx.growW, { rng: ctx.rng, noise: ctx.noise, forgeNow });
        const b = bestGrown(st, M, i, M.items[i].n, o, 6);
        cand = b && b.keys;
      } else {
        const b = bestFixed(st, M, i, ctx.rots[i], forgeNow, ctx);
        cand = b && b.keys;
      }
      if (cand) {
        put(st, i, cand);
        if (evaluate(st, M, ctx.reshape).total > before.total + 1e-6) { improved = true; continue; }
        take(st, i);
      }
      put(st, i, old);
    }
    return improved;
  }

  /** Formes adaptées : redécoupe la place de deux voisins autrement. */
  function repartitionPass(st, M, ctx, deadline) {
    let improved = false;
    const pairs = [];
    const seen = new Set();
    st.cells.forEach((cs, i) => {
      if (!cs) return;
      for (const k of cs) for (const d of NB) {
        const j = st.occ.get(k + d);
        if (j === undefined || j < 0 || j === i) continue;
        const pk = Math.min(i, j) * M.n + Math.max(i, j);
        if (!seen.has(pk)) { seen.add(pk); pairs.push([i, j]); }
      }
    });
    ctx.rng.shuffle(pairs);
    let cur = evaluate(st, M, true).total;
    for (const [i, j] of pairs) {
      if (now() > deadline) return improved;
      const ci = st.cells[i], cj = st.cells[j];
      const U = new Set(ci.concat(cj));
      take(st, i); take(st, j);
      let best = null;
      for (let attempt = 0; attempt < 6; attempt++) {
        const [a, b] = attempt % 2 ? [j, i] : [i, j];
        const list = [...U];
        const start = list[ctx.rng.int(0, list.length - 1)];
        const o = Object.assign({}, ctx.growW, { allowed: U, rng: ctx.rng, noise: ctx.noise, forgeNow: 0, wDist: 0, jitter: 0.25 });
        const ka = grow(st, M, a, M.items[a].n, start, o);
        if (!ka) continue;
        const inA = new Set(ka);
        const kb = list.filter((k) => !inA.has(k));
        if (!kb.length || !compact(kb)) continue;
        put(st, a, ka); put(st, b, kb);
        const v = evaluate(st, M, true).total;
        if (v > cur + 1e-6 && (!best || v > best.v)) best = { v, a, ka, b, kb };
        take(st, a); take(st, b);
      }
      if (best) { put(st, best.a, best.ka); put(st, best.b, best.kb); cur = best.v; improved = true; }
      else { put(st, i, ci); put(st, j, cj); }
    }
    return improved;
  }
  /** Des cases forment-elles un seul morceau ? */
  function compact(keys) {
    const set = new Set(keys);
    const seen = new Set([keys[0]]);
    const stack = [keys[0]];
    while (stack.length) {
      const k = stack.pop();
      for (const d of NB) { const nk = k + d; if (set.has(nk) && !seen.has(nk)) { seen.add(nk); stack.push(nk); } }
    }
    return seen.size === set.size;
  }

  function improve(st, M, ctx, deadline) {
    for (let pass = 0; pass < ctx.passes; pass++) {
      if (now() > deadline) break;
      let imp = swapPass(st, M, ctx, deadline);
      imp = relocatePass(st, M, ctx, deadline) || imp;
      if (ctx.reshape) imp = repartitionPass(st, M, ctx, deadline) || imp;
      if (!imp) break;
    }
    return st;
  }

  /* ---------- conversions ---------- */
  function toPlacement(keys) {
    const q0 = kq(keys[0]), r0 = kr(keys[0]);
    return { q: q0, r: r0, cells: keys.map((k) => [kq(k) - q0, kr(k) - r0]) };
  }

  /* =================== API =================== */

  /**
   * Place un territoire qui arrive : sa forme pousse dans les creux de
   * l'Archive. Rend { q, r, cells }.
   */
  Ag.arrival = function (p, quality, biome, seed) {
    const n = AN.Shapes.sizeOf(quality);
    const extra = { t: null, uid: null, n, base: baseOf(quality), tags: D.BIOME[biome] ? D.BIOME[biome].tags : [], people: [] };
    const M = model(p, extra);
    const i = M.n - 1;
    const st = stateFrom(p, M);
    const forgeNow = evaluate(st, M, false).forge;
    const o = Object.assign({}, Ag.TUNE.arrival, { rng: AN.RNG.from(seed || 1, 'arrivee'), noise: noiseField(p.seed || 1), forgeNow });
    const b = bestGrown(st, M, i, n, o, n === 1 ? Infinity : 14);
    if (!b) {
      const cells = AN.Shapes.blob(n, seed || 1);
      const h = AN.Shapes.place(p, cells);
      return { q: h.q, r: h.r, cells };
    }
    return toPlacement(b.keys);
  };

  /**
   * Forme adaptée : le territoire t pousse depuis la case (q, r) dans la place
   * libre (ses propres cases comptent comme libres). variant change le dessin.
   * Rend { q, r, cells } ou null s'il n'y a pas la place.
   */
  Ag.moldAt = function (p, t, q, r, variant = 0) {
    const M = model(p);
    const i = p.territories.indexOf(t);
    if (i < 0) return null;
    const st = stateFrom(p, M);
    take(st, i);
    const start = key(q, r);
    if (start === CENTER || st.occ.has(start)) return null;
    const forgeNow = evaluate(st, M, false).forge;
    const o = {
      wOwn: 1, wOcc: 0.55, wPartner: 0.35, wNoise: variant ? 0.7 : 0.25, wDist: 0,
      from: start, wFrom: variant ? 0.3 : 0.5, jitter: variant ? 0.35 : 0.02,
      rng: AN.RNG.from(AN.hash(t.uid + ':' + variant), 'moule'), noise: noiseField(AN.hash(t.uid) + variant * 7919), forgeNow,
    };
    const keys = grow(st, M, i, M.items[i].n, start, o);
    return keys ? toPlacement(keys) : null;
  };

  /**
   * Rangement automatique. opts : { reshape, budget (ms), passes }.
   * Rend { layout, before, after } sans rien modifier ; Ag.apply l'applique.
   */
  Ag.auto = function (p, opts = {}) {
    const reshape = !!opts.reshape;
    const M = model(p);
    if (!M.n) return null;
    const t0 = now();
    const budget = opts.budget || 1600;
    const ctx = {
      reshape, passes: opts.passes || 6,
      rng: AN.RNG.from(p.seed || 1, 'rangement:' + M.n),
      noise: noiseField(p.seed || 1),
      perimW: 0.03, noiseW: 0.12, distW: 0.02,
      growW: Ag.TUNE.grow,
    };
    if (!reshape) {
      ctx.rots = M.items.map((it) => rotationsOf(AN.Shapes.cellsOf(it.t)));
      ctx.canon = M.items.map((it, i) => ctx.rots[i].map(signature).sort()[0]);
    }
    const starts = [];
    const g = reshape ? greedyReshape(M, ctx) : greedyFixed(M, ctx);
    if (g) starts.push(g);
    const cur = stateFrom(p, M);
    if (connected(cur) && cur.cells.filter(Boolean).length === M.n) starts.push(cloneState(cur));
    let best = null;
    starts.forEach((st, s) => {
      const deadline = t0 + budget * ((s + 1) / starts.length);
      improve(st, M, ctx, deadline);
      const v = evaluate(st, M, reshape);
      if (!best || v.total > best.v.total + 1e-9) best = { st, v };
    });
    if (!best) return null;
    const layout = {};
    M.items.forEach((it, i) => { layout[it.uid] = toPlacement(best.st.cells[i]); });
    return { layout, before: Ag.summary(p), after: Ag.summary(p, layout), ms: Math.round(now() - t0) };
  };

  /** Applique une disposition. */
  Ag.apply = function (p, layout) {
    p.territories.forEach((t) => {
      const L = layout[t.uid];
      if (L) { t.q = L.q; t.r = L.r; t.cells = L.cells.map((c) => c.slice()); }
    });
  };

  /** Photographie des positions et des formes (pour annuler). */
  Ag.snapshot = (p) => p.territories.map((t) => ({ uid: t.uid, q: t.q, r: t.r, cells: AN.Shapes.cellsOf(t).map((c) => c.slice()) }));
  Ag.restore = function (p, snap) {
    const m = new Map(snap.map((s) => [s.uid, s]));
    if (snap.length !== p.territories.length || p.territories.some((t) => !m.has(t.uid))) return false;
    p.territories.forEach((t) => { const s = m.get(t.uid); t.q = s.q; t.r = s.r; t.cells = s.cells.map((c) => c.slice()); });
    return true;
  };

  /**
   * Bilan d'une disposition (l'actuelle, ou layout) : synergies positives et
   * négatives, part de production gagnée, Forge, peuples ennemis côte à côte.
   */
  Ag.summary = function (p, layout) {
    const prof = layout
      ? { territories: p.territories.map((t) => (layout[t.uid] ? Object.assign({}, t, layout[t.uid]) : t)), settlements: p.settlements }
      : p;
    const syns = AN.Profile.synergies(prof);
    let pos = 0, neg = 0, forge = 0;
    const by = new Map();
    syns.forEach((s) => {
      if (s.syn.mult > 0 || s.syn.effect) pos++; else neg++;
      if (s.syn.effect === 'craft') forge++;
      [s.a, s.b].forEach((t) => by.set(t.uid, (by.get(t.uid) || 0) + (s.syn.mult || 0)));
    });
    let tot = 0, gain = 0;
    prof.territories.forEach((t) => { const b = baseOf(t.quality); tot += b; gain += b * (by.get(t.uid) || 0); });
    // peuples ennemis côte à côte
    const pm = peopleByTerritory(p);
    let conflicts = 0;
    if (pm.size && D.CIV_CONFLICTS) {
      const occ = AN.Shapes.occupancy(prof);
      const done = new Set();
      prof.territories.forEach((t) => {
        const a = pm.get(t.uid);
        if (!a) return;
        AN.Shapes.abs(t).forEach((c) => H.neighbors(c.q, c.r).forEach((nb) => {
          const o = occ.get(H.key(nb.q, nb.r));
          if (!o || o.uid === t.uid) return;
          const pk = [t.uid, o.uid].sort().join('|');
          if (done.has(pk)) return;
          done.add(pk);
          const b = pm.get(o.uid);
          if (b && a.some((x) => b.some((y) => D.CIV_CONFLICTS.some(([c1, d1]) => (c1 === x && d1 === y) || (c1 === y && d1 === x))))) conflicts++;
        }));
      });
    }
    // trous : cases libres entièrement entourées
    const occ = AN.Shapes.occupancy(prof);
    occ.set(H.key(0, 0), true);
    let holes = 0;
    const seenHole = new Set();
    prof.territories.forEach((t) => AN.Shapes.abs(t).forEach((c) => H.neighbors(c.q, c.r).forEach((nb) => {
      const k = H.key(nb.q, nb.r);
      if (occ.has(k) || seenHole.has(k)) return;
      seenHole.add(k);
      if (H.neighbors(nb.q, nb.r).every((x) => occ.has(H.key(x.q, x.r)))) holes++;
    })));
    return { pos, neg, forge: Math.min(2, forge), prod: tot ? gain / tot : 0, count: syns.length, conflicts, holes };
  };

  /** Synergies possibles entre deux territoires (d'après leurs biomes). */
  Ag.between = function (a, b) {
    const A = D.BIOME[a.biome], B = D.BIOME[b.biome];
    if (!A || !B) return [];
    return D.SYNERGIES.filter((s) => (A.tags.includes(s.a) && B.tags.includes(s.b)) || (A.tags.includes(s.b) && B.tags.includes(s.a)));
  };

  /** Pour les tests et le débogage. */
  Ag._internal = { model, stateFrom, evaluate, connected, grow, frontier, key, kq, kr };
})();
