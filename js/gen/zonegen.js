/* Génération d'une zone jouable : grille de tuiles, points d'intérêt,
   ressources, groupes de créatures, ruines, décor.
   Séparée de l'affichage (voir render/terrainArt.js). */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;

  const T = 32; // taille d'une tuile en pixels du monde
  // BRIDGE_ON / BRIDGE_OFF (1.10) : les ponts de matière sombre de l'Amas, ouverts ou défaits
  const FLOOR = 0, WALL = 1, HAZARD = 2, PLATE = 3, VOID = 4, KEYWALL = 5, BUILDING = 6, ABYSS = 7, BRIDGE_ON = 8, BRIDGE_OFF = 9;
  const Z = (AN.ZoneGen = { T, FLOOR, WALL, HAZARD, PLATE, VOID, KEYWALL, BUILDING, ABYSS, BRIDGE_ON, BRIDGE_OFF });
  /** Tuiles qui bloquent le passage (le vide galactique se franchit d'un bond, voir game/cosmic.js). */
  Z.SOLID = new Uint8Array([0, 1, 0, 0, 0, 1, 1, 1, 0, 1]);
  Z.isSolid = (g) => Z.SOLID[g] === 1;

  function quantile(values, q) {
    const s = Float32Array.from(values).sort();
    return s[U.clamp(Math.floor(q * (s.length - 1)), 0, s.length - 1)];
  }

  /** @param world destination @param index 0..n-1 pour les zones, n pour le cœur */
  /**
   * Ville d'une nation (1.12) : une place au centre, ses bâtiments publics (comptoir,
   * caserne, et le palais dans la capitale), puis deux couronnes de maisons.
   */
  function buildCity(world, index, isHeart, c, R, grid, idx, T) {
    const nat = world.nation;
    const vr = AN.RNG.from(world.seed, 'quartiers' + index);
    const buildings = [];
    const put = (tx, ty, bw, bh, kind) => {
      for (let y = ty; y < ty + bh; y++) for (let x = tx; x < tx + bw; x++) if (grid[idx(x, y)] !== FLOOR) return false;
      for (let y = ty; y < ty + bh; y++) for (let x = tx; x < tx + bw; x++) grid[idx(x, y)] = BUILDING;
      buildings.push({ tx, ty, w: bw, h: bh, x: (tx + bw / 2) * T, y: (ty + bh / 2) * T, kind, variant: vr.int(0, 2), seed: vr.int(1, 1e6) });
      return true;
    };
    const base = vr.float(0, Math.PI * 2);
    const at = (a, r, bw, bh, kind) => {
      for (let k = 0; k < 6; k++) {
        const aa = a + k * 0.35 * (k % 2 ? 1 : -1);
        if (put(Math.round(c.x + Math.cos(aa) * r - bw / 2), Math.round(c.y + Math.sin(aa) * r - bh / 2), bw, bh, kind)) return true;
      }
      return false;
    };
    // la place reste libre ; autour d'elle, les bâtiments publics
    if (isHeart) at(base - Math.PI / 2, 4.2, 4, 3, 'palace');
    at(base + (isHeart ? 0.9 : 0), 4.2, 3, 2, 'market');
    at(base + (isHeart ? 2.6 : Math.PI), 4.2, 3, 2, 'hall');
    const rings = [[R - 2.6, isHeart ? 14 : 11], [R - 5.2, isHeart ? 7 : 5]];
    rings.forEach(([rr, n], ri) => {
      for (let k = 0; k < n; k++) at(base + (k / n) * Math.PI * 2 + (ri ? 0.3 : 0) + vr.float(-0.12, 0.12), rr, 2, 2, 'house');
    });
    return {
      x: c.x * T + T / 2, y: c.y * T + T / 2, r: R * T, tx: c.x, ty: c.y, people: nat.people, buildings,
      city: true, capital: isHeart, name: isHeart ? nat.capital : nat.cities[index] || nat.capital,
    };
  }

  Z.generate = function (world, index) {
    if (world.tutorial && AN.Tutorial) return AN.Tutorial.zone(world, index);
    const isHeart = index >= world.zones.length;
    const spec = isHeart ? world.heart : world.zones[index];
    const biome = D.BIOME[spec.biome];
    const mix = spec.mix ? D.BIOME[spec.mix] : null;
    const rng = AN.RNG.from(world.seed, 'zone' + index);
    const cosmic = world.scale && world.scale !== 'region';
    const n = isHeart ? (cosmic ? 74 : 64) : world.tiles + rng.int(-3, 3);
    const w = n, h = n;
    const grid = new Uint8Array(w * h);
    const bmap = new Uint8Array(w * h);
    const shade = new Float32Array(w * h);
    const idx = (x, y) => y * w + x;

    const nWall = new AN.Noise(rng.int(1, 1e9));
    const nHaz = new AN.Noise(rng.int(1, 1e9));
    const nMix = new AN.Noise(rng.int(1, 1e9));
    const nShade = new AN.Noise(rng.int(1, 1e9));
    const scale = 1 / rng.float(7, 10);
    const vals = new Float32Array(w * h), hz = new Float32Array(w * h), mx = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = idx(x, y);
        vals[i] = nWall.fbm(x * scale, y * scale, 4);
        hz[i] = nHaz.fbm(x * scale * 1.3 + 50, y * scale * 1.3, 3);
        mx[i] = nMix.fbm(x * scale * 0.6, y * scale * 0.6, 3);
        shade[i] = nShade.fbm(x * 0.18, y * 0.18, 3);
      }
    }
    const openness = isHeart ? Math.max(biome.open, 0.6) : biome.open;
    const wallFrac = U.clamp((1 - openness) * 0.6, 0.12, 0.4);
    const wt = quantile(vals, 1 - wallFrac);
    const ht = quantile(hz, 1 - (biome.hazard ? biome.hazardAmt : 0));
    const mt = quantile(mx, 0.58);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = idx(x, y);
        const border = x < 2 || y < 2 || x >= w - 2 || y >= h - 2;
        if (border || vals[i] >= wt) grid[i] = WALL;
        else if (biome.hazard && biome.hazardAmt > 0 && hz[i] >= ht) grid[i] = HAZARD;
        if (mix && mx[i] >= mt) bmap[i] = 1;
      }
    }

    // ---- Points d'intérêt, disposés autour du centre ----
    const cx = w / 2, cy = h / 2;
    const a = rng.float(0, Math.PI * 2);
    const R = w * 0.5;
    const at = (ang, rr) => ({ x: Math.round(U.clamp(cx + Math.cos(ang) * rr, 6, w - 7)), y: Math.round(U.clamp(cy + Math.sin(ang) * rr, 6, h - 7)) });
    const entry = at(a, R * 0.74);
    const arenaR = isHeart ? (cosmic ? 17 : 14) : 9;
    const arenaT = isHeart ? at(a + Math.PI, R * 0.25) : at(a + Math.PI + rng.float(-0.4, 0.4), R * 0.58);
    const plates = [at(a + Math.PI * 0.5 + rng.float(-0.2, 0.2), R * 0.7), at(a - Math.PI * 0.5 + rng.float(-0.2, 0.2), R * 0.7)];
    if (world.anomaly === 'blanc' && index === world.anomalyZone) plates.push(at(a + Math.PI * 0.2, R * 0.3));
    const gates = [];
    const last = world.zones.length - 1;
    if (isHeart) {
      gates.push({ t: at(a + 0.6, R * 0.74), to: last, kind: 'prev' });
    } else {
      if (index > 0) gates.push({ t: at(a - 0.55, R * 0.76), to: index - 1, kind: 'prev' });
      if (index < last) gates.push({ t: at(a + Math.PI * 0.72, R * 0.74), to: index + 1, kind: 'next' });
      else gates.push({ t: at(a + Math.PI * 0.72, R * 0.74), to: world.zones.length, kind: 'heart' });
    }

    const clearCircle = (p, r, val = FLOOR) => {
      for (let y = p.y - r; y <= p.y + r; y++) {
        for (let x = p.x - r; x <= p.x + r; x++) {
          if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) continue;
          if ((x - p.x) ** 2 + (y - p.y) ** 2 <= r * r + 0.5) grid[idx(x, y)] = val;
        }
      }
    };
    const carve = (from, to) => {
      let x = from.x, y = from.y;
      let guard = w * h;
      while ((x !== to.x || y !== to.y) && guard-- > 0) {
        if (rng.chance(0.72)) {
          if (Math.abs(to.x - x) > Math.abs(to.y - y) || (Math.abs(to.x - x) === Math.abs(to.y - y) && rng.chance(0.5))) x += Math.sign(to.x - x);
          else y += Math.sign(to.y - y);
        } else {
          const d = rng.int(0, 3);
          x += [1, -1, 0, 0][d];
          y += [0, 0, 1, -1][d];
        }
        x = U.clamp(x, 3, w - 4);
        y = U.clamp(y, 3, h - 4);
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const i = idx(x + ox, y + oy);
          if (grid[i] === WALL) grid[i] = FLOOR;
        }
      }
    };

    clearCircle(entry, 4);
    clearCircle(arenaT, arenaR);
    plates.forEach((p) => clearCircle(p, 4));
    gates.forEach((g) => clearCircle(g.t, 3));
    carve(entry, arenaT);
    plates.forEach((p) => carve(entry, p));
    gates.forEach((g) => carve(entry, g.t));
    carve(plates[0], arenaT);

    // ---- Village d'une civilisation : une clairière reliée à l'entrée ----
    // (1.12) dans une nation, chaque zone a sa ville, et le cœur sa capitale : une clairière plus grande
    let villageT = null;
    const civ = world.civ && world.civ.zone === index && !isHeart ? world.civ : null;
    const nat = world.nation || null;
    const VR = nat ? (isHeart ? 10 : 9) : 7;
    if (civ || nat) {
      const vr = AN.RNG.from(world.seed, (nat ? 'ville' : 'village') + index);
      const far = (x, y, p, d) => (x - p.x) ** 2 + (y - p.y) ** 2 >= d * d;
      const m = VR + 3;
      for (let tries = 0; tries < 600 && !villageT; tries++) {
        const x = vr.int(m, w - m - 1), y = vr.int(m, h - m - 1);
        if (!far(x, y, entry, VR + 8) || !far(x, y, arenaT, arenaR + VR + 2)) continue;
        if (plates.some((pp) => !far(x, y, pp, VR + 2)) || gates.some((g) => !far(x, y, g.t, VR + 1))) continue;
        villageT = { x, y };
      }
      if (!villageT) villageT = { x: Math.round(U.lerp(entry.x, arenaT.x, 0.5)), y: Math.round(U.lerp(entry.y, arenaT.y, 0.5)) };
      clearCircle(villageT, VR);
      carve(entry, villageT);
    }

    // ---- Accessibilité : tout ce qui n'est pas relié à l'entrée devient mur ----
    const seen = new Uint8Array(w * h);
    const stack = [idx(entry.x, entry.y)];
    seen[stack[0]] = 1;
    while (stack.length) {
      const i = stack.pop();
      const x = i % w, y = (i / w) | 0;
      const nb = [i - 1, i + 1, i - w, i + w];
      for (let k = 0; k < 4; k++) {
        const j = nb[k];
        if (k === 0 && x === 0) continue;
        if (k === 1 && x === w - 1) continue;
        if (j < 0 || j >= w * h || seen[j] || grid[j] === WALL) continue;
        seen[j] = 1;
        stack.push(j);
      }
    }
    for (let i = 0; i < w * h; i++) if (!seen[i] && grid[i] !== WALL) grid[i] = WALL;

    // Bâtiments du village (tuiles pleines, dessinées à part)
    let village = null;
    if (nat && villageT) village = buildCity(world, index, isHeart, villageT, VR, grid, idx, T);
    else if (civ && villageT) {
      const vr = AN.RNG.from(world.seed, 'maisons' + index);
      const people = D.PEOPLE[civ.people];
      const buildings = [];
      const nb = civ.buildings;
      const base = vr.float(0, Math.PI * 2);
      const put = (tx, ty, bw, bh, kind) => {
        for (let y = ty; y < ty + bh; y++) for (let x = tx; x < tx + bw; x++) if (grid[idx(x, y)] !== FLOOR) return false;
        for (let y = ty; y < ty + bh; y++) for (let x = tx; x < tx + bw; x++) grid[idx(x, y)] = BUILDING;
        buildings.push({ tx, ty, w: bw, h: bh, x: (tx + bw / 2) * T, y: (ty + bh / 2) * T, kind, variant: vr.int(0, 2), seed: vr.int(1, 1e6) });
        return true;
      };
      for (let k = 0; k < nb; k++) {
        const a = base + (k / nb) * Math.PI * 2 + vr.float(-0.2, 0.2);
        const rr = vr.float(4.2, 5.2);
        put(Math.round(villageT.x + Math.cos(a) * rr) - 1, Math.round(villageT.y + Math.sin(a) * rr) - 1, 2, 2, 'house');
      }
      if (civ.attitude === 'evades') {
        const a = base + Math.PI / nb;
        put(Math.round(villageT.x + Math.cos(a) * 2.5) - 1, Math.round(villageT.y + Math.sin(a) * 2.5) - 1, 3, 2, 'ark');
      }
      village = { x: villageT.x * T + T / 2, y: villageT.y * T + T / 2, r: 7 * T, tx: villageT.x, ty: villageT.y, people: people.id, buildings };
    }

    // Plaques blanches d'extraction (surface de néant)
    plates.forEach((p) => {
      for (let y = p.y - 2; y <= p.y + 2; y++) for (let x = p.x - 2; x <= p.x + 2; x++) {
        if ((x - p.x) ** 2 + (y - p.y) ** 2 <= 4.6) grid[idx(x, y)] = PLATE;
      }
    });

    const toPx = (t) => ({ x: t.x * T + T / 2, y: t.y * T + T / 2 });
    const isFloor = (x, y) => x >= 0 && y >= 0 && x < w && y < h && grid[idx(x, y)] === FLOOR;
    const farFrom = (x, y, p, d) => (x - p.x) ** 2 + (y - p.y) ** 2 >= d * d;
    const localBiome = (x, y) => (mix && bmap[idx(x, y)] ? mix : biome);

    // ---- Ressources ----
    const nodes = [];
    const rich = world.rule === 'riche' ? 1.5 : 1;
    const nodeCount = Math.round(w * h * 0.0055 * (isHeart ? 0.6 : 1));
    for (let tries = 0; tries < nodeCount * 30 && nodes.length < nodeCount; tries++) {
      const x = rng.int(3, w - 4), y = rng.int(3, h - 4);
      if (!isFloor(x, y) || !farFrom(x, y, entry, 5) || !farFrom(x, y, arenaT, arenaR + 1)) continue;
      if (villageT && !farFrom(x, y, villageT, 8)) continue;
      if (nodes.some((nd) => (nd.tx - x) ** 2 + (nd.ty - y) ** 2 < 16)) continue;
      const b = localBiome(x, y);
      const res = rng.weighted(Object.entries(b.resources));
      const rarity = D.RESOURCES[res].rarity;
      const amount = Math.max(1, Math.round((rarity === 0 ? rng.int(2, 4) : rarity === 1 ? rng.int(1, 2) : 1) * rich));
      nodes.push({ id: 'n' + nodes.length, tx: x, ty: y, ...toPx({ x, y }), res, amount, uses: rarity === 0 ? 2 : 1 });
    }

    // ---- Créatures ----
    const groups = [];
    if (!isHeart) {
      const pools = [biome, mix].filter(Boolean).map((b) => AN.WorldGen.pool(b.id));
      const groupCount = Math.round(w * h * 0.0036 * world.density);
      for (let tries = 0; tries < groupCount * 40 && groups.length < groupCount; tries++) {
        const x = rng.int(4, w - 5), y = rng.int(4, h - 5);
        if (!isFloor(x, y) || !farFrom(x, y, entry, 13) || !farFrom(x, y, arenaT, arenaR + 2)) continue;
        if (villageT && !farFrom(x, y, villageT, 13)) continue;
        if (groups.some((g) => (g.tx - x) ** 2 + (g.ty - y) ** 2 < 36)) continue;
        const b = localBiome(x, y);
        const pool = AN.WorldGen.pool(b.id);
        const usable = pool.length ? pool : pools[0];
        if (!usable || !usable.length) break;
        const sp = rng.weighted(usable.map((c) => [c, c.tier === 0 ? 6 : 1 + world.threat * 0.45]));
        const count = rng.int(sp.group[0], sp.group[1]);
        groups.push({ species: sp.id, tx: x, ty: y, ...toPx({ x, y }), count, foreign: !sp.biomes.includes(b.id) ? b.id : null });
      }
      if (world.anomaly === 'signal' && index === world.anomalyZone) {
        for (let tries = 0; tries < 400; tries++) {
          const x = rng.int(4, w - 5), y = rng.int(4, h - 5);
          if (!isFloor(x, y) || !farFrom(x, y, entry, 14)) continue;
          const pool = AN.WorldGen.pool(biome.id);
          const sp = rng.pick(pool.length ? pool : D.CREATURES.filter((c) => c.tier === 0));
          groups.push({ species: sp.id, tx: x, ty: y, ...toPx({ x, y }), count: 1, variant: 'chromatique', move: 'burrow' });
          break;
        }
      }
      if (world.anomaly === 'errant' && index === world.anomalyZone) {
        for (let tries = 0; tries < 400; tries++) {
          const x = rng.int(6, w - 7), y = rng.int(6, h - 7);
          if (!isFloor(x, y) || !farFrom(x, y, entry, 18) || !farFrom(x, y, arenaT, arenaR + 8)) continue;
          const g = AN.WorldGen.guardianFor(biome.id, rng, world.zones.map((z) => z.guardian));
          groups.push({ species: g, tx: x, ty: y, ...toPx({ x, y }), count: 1, errant: true });
          break;
        }
      }
    }

    // ---- Ruines et fragments de récit ----
    const ruins = [];
    const loreChance = (biome.ruins || 0.22) + (world.anomaly === 'echo' && index === world.anomalyZone ? 1 : 0);
    const wantCache = world.anomaly === 'cache' && index === world.anomalyZone;
    const ruinCount = (rng.chance(loreChance) ? 1 : 0) + (wantCache ? 1 : 0);
    for (let k = 0, tries = 0; k < ruinCount && tries < 600; tries++) {
      const x = rng.int(5, w - 6), y = rng.int(5, h - 6);
      if (!isFloor(x, y) || !farFrom(x, y, entry, 8) || !farFrom(x, y, arenaT, arenaR + 3)) continue;
      if (villageT && !farFrom(x, y, villageT, 9)) continue;
      const kind = wantCache && k === ruinCount - 1 ? 'cache' : 'lore';
      ruins.push({ id: 'r' + k, kind, tx: x, ty: y, ...toPx({ x, y }), lore: rng.int(0, D.LORE.length - 1), used: false });
      clearCircle({ x, y }, 1);
      k++;
    }

    // ---- Caveau scellé : une poche dans la roche, fermée par une barrière ----
    // Seul un compagnon possédant la bonne clé d'environnement peut l'ouvrir.
    const vaults = [];
    const eggs = [];
    if (spec.vault && D.KEYS[spec.vault]) {
      const solidAround = (cx, cy, r) => {
        for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
          if (x < 3 || y < 3 || x >= w - 3 || y >= h - 3) return false;
          if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.5 && grid[idx(x, y)] !== WALL) return false;
        }
        return true;
      };
      const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      let placed = null;
      for (let tries = 0; tries < 700 && !placed; tries++) {
        const cx = rng.int(6, w - 7), cy = rng.int(6, h - 7);
        if (!farFrom(cx, cy, entry, 12) || !farFrom(cx, cy, arenaT, arenaR + 5)) continue;
        if (plates.some((pp) => !farFrom(cx, cy, pp, 7)) || gates.some((g) => !farFrom(cx, cy, g.t, 7))) continue;
        if (!solidAround(cx, cy, 4)) continue;
        let best = null;
        for (const [dx, dy] of DIRS4) {
          for (let st = 5; st <= 12; st++) {
            const x = cx + dx * st, y = cy + dy * st;
            if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) break;
            const i = idx(x, y), i2 = idx(x + (dy ? 1 : 0), y + (dx ? 1 : 0));
            if (grid[i] === FLOOR && seen[i] && grid[i2] === FLOOR && seen[i2]) { if (!best || st < best.st) best = { dx, dy, st }; break; }
            if (grid[i] !== WALL || grid[i2] !== WALL) break;
          }
        }
        if (best) placed = { cx, cy, ...best };
      }
      if (placed) {
        const { cx, cy, dx, dy, st } = placed;
        const pocket = [];
        for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++) {
          if ((x - cx) ** 2 + (y - cy) ** 2 <= 9.5) { grid[idx(x, y)] = FLOOR; if ((x - cx) ** 2 + (y - cy) ** 2 <= 5) pocket.push({ x, y }); }
        }
        const ox = dy ? 1 : 0, oy = dx ? 1 : 0; // seconde file du couloir
        const barrier = [];
        for (let k = 3; k < st; k++) {
          for (const o of [0, 1]) {
            const x = cx + dx * k + ox * o, y = cy + dy * k + oy * o;
            const i = idx(x, y);
            if (k === 4 || (k === 5 && st > 6)) { grid[i] = KEYWALL; barrier.push(i); }
            else if (grid[i] === WALL) grid[i] = FLOOR;
          }
        }
        const bx = barrier.reduce((a, i) => a + (i % w), 0) / barrier.length, by = barrier.reduce((a, i) => a + Math.floor(i / w), 0) / barrier.length;
        vaults.push({ key: spec.vault, tiles: barrier, x: bx * T + T / 2, y: by * T + T / 2, cx: cx * T + T / 2, cy: cy * T + T / 2, opened: false, dir: [dx, dy] });
        // trésors du caveau
        rng.shuffle(pocket);
        const loot = Object.keys(biome.resources).sort((a, b) => D.RESOURCES[b].rarity - D.RESOURCES[a].rarity);
        const nNodes = rng.int(2, 3);
        for (let k = 0; k < nNodes && k < pocket.length; k++) {
          const t = pocket[k];
          const res = k === 0 && rng.chance(0.3) ? 'essence' : loot[Math.min(loot.length - 1, k === 0 ? 0 : rng.int(0, 1))];
          const r = D.RESOURCES[res].rarity;
          nodes.push({ id: 'v' + k, tx: t.x, ty: t.y, ...toPx(t), res, amount: r >= 2 ? 1 : r === 1 ? rng.int(2, 3) : rng.int(4, 6), uses: r >= 2 ? 1 : 2, vault: true });
        }
        const pool = AN.WorldGen.pool(biome.id);
        if (rng.chance(0.45) && pool.length && pocket[nNodes]) {
          const sp = rng.weighted(pool.map((c) => [c, c.tier === 0 ? 3 : 1]));
          const t = pocket[nNodes];
          eggs.push({ id: 'oeuf' + index, ...toPx(t), species: sp.id, variant: rng.chance(0.2) ? rng.pick(['albinos', 'chromatique']) : 'commun', hueSeed: rng.int(0, 999), taken: false });
        } else if (rng.chance(0.5) && pool.length && pocket[nNodes]) {
          const sp = rng.pick(pool.filter((c) => c.tier === 0).concat(pool).slice(0, 4));
          const t = pocket[nNodes];
          groups.push({ species: sp.id, tx: t.x, ty: t.y, ...toPx(t), count: 1, variant: rng.pick(['albinos', 'chromatique', 'geant']), temper: 'passif', vault: true });
        }
        if (rng.chance(0.3) && pocket[nNodes + 1]) {
          const t = pocket[nNodes + 1];
          ruins.push({ id: 'rv', kind: 'lore', tx: t.x, ty: t.y, ...toPx(t), lore: rng.int(0, D.LORE.length - 1), used: false });
        }
      }
    }

    // ---- Structure à découvrir et filons profonds (1.4) ----
    // Tirages séparés : le reste de la zone ne change pas.
    let structure = null;
    const sr = AN.RNG.from(world.seed, 'structure-zone' + index);
    const clear3 = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!isFloor(x + dx, y + dy)) return false; return true; };
    if (spec.structure && D.STRUCTURES && D.STRUCTURES[spec.structure]) {
      for (let tries = 0; tries < 900 && !structure; tries++) {
        const x = sr.int(5, w - 6), y = sr.int(5, h - 6);
        if (!clear3(x, y) || !farFrom(x, y, entry, 9) || !farFrom(x, y, arenaT, arenaR + 4)) continue;
        if (plates.some((pp) => !farFrom(x, y, pp, 7)) || gates.some((g) => !farFrom(x, y, g.t, 6))) continue;
        if (villageT && !farFrom(x, y, villageT, 11)) continue;
        if (nodes.some((nd) => (nd.tx - x) ** 2 + (nd.ty - y) ** 2 < 9)) continue;
        structure = { id: spec.structure, tx: x, ty: y, ...toPx({ x, y }), searched: false, taken: false, seed: sr.int(1, 1e6) };
      }
    }
    if (D.deepVeinsFor && (!world.scale || world.scale === 'region' || world.scale === 'monde')) {
      const veins = D.deepVeinsFor(biome);
      const nDeep = isHeart ? 1 : sr.int(1, 2);
      let placed = 0;
      for (let tries = 0; tries < 600 && placed < nDeep; tries++) {
        const x = sr.int(4, w - 5), y = sr.int(4, h - 5);
        if (!isFloor(x, y) || !farFrom(x, y, entry, 8) || !farFrom(x, y, arenaT, arenaR + 2)) continue;
        // contre la roche : un filon affleure
        if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => grid[idx(x + dx, y + dy)] === WALL)) continue;
        if (nodes.some((nd) => (nd.tx - x) ** 2 + (nd.ty - y) ** 2 < 16)) continue;
        if (structure && (structure.tx - x) ** 2 + (structure.ty - y) ** 2 < 16) continue;
        const res = sr.pick(veins);
        const r = D.RESOURCES[res].rarity;
        nodes.push({ id: 'd' + placed, tx: x, ty: y, ...toPx({ x, y }), res, amount: r >= 2 ? 1 : r === 1 ? 2 : 4, uses: 1, deep: true });
        placed++;
      }
    }

    // ---- Échelons cosmiques ----
    // Galaxie : le relief devient du vide entre des îles de lumière (on le franchit d'un bond).
    if (world.scale === 'galaxie' || world.scale === 'amas') {
      const keep = vaults.map((v) => ({ x: Math.floor(v.cx / T), y: Math.floor(v.cy / T) }));
      for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
        const i = idx(x, y);
        if (grid[i] !== WALL) continue;
        if (keep.some((k) => (k.x - x) ** 2 + (k.y - y) ** 2 < 49)) continue;
        grid[i] = ABYSS;
      }
    }
    // Système : les masses rocheuses les plus épaisses sont des planétoïdes qui attirent tout.
    const wells = [];
    if (world.scale === 'systeme') {
      const deep = (cx, cy, r) => {
        for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
          if (x < 0 || y < 0 || x >= w || y >= h || grid[idx(x, y)] !== WALL) return false;
        }
        return true;
      };
      const wr = AN.RNG.from(world.seed, 'puits' + index);
      for (let tries = 0; tries < 900 && wells.length < 3; tries++) {
        const x = wr.int(5, w - 6), y = wr.int(5, h - 6);
        if (!deep(x, y, 2)) continue;
        if (wells.some((q) => (q.tx - x) ** 2 + (q.ty - y) ** 2 < 400)) continue;
        if (!farFrom(x, y, arenaT, arenaR + 6)) continue;
        wells.push({ tx: x, ty: y, x: x * T + T / 2, y: y * T + T / 2, range: T * 13, g: 260 });
      }
    }

    // ---- Au-delà de la galaxie (1.10) : tirages à part, rien ne change pour les autres échelons ----
    const protect = [entry, arenaT].concat(plates, gates.map((g) => g.t), villageT ? [villageT] : []);
    const nearKey = (x, y, d) => protect.some((q) => !farFrom(x, y, q, d)) || vaults.some((v) => !farFrom(x, y, { x: Math.floor(v.cx / T), y: Math.floor(v.cy / T) }, 7));
    // Amas : des bandes de vide traversent la zone ; là où elles coupent le sol, des ponts qui se font et se défont
    const bridges = [];
    if (world.scale === 'amas') {
      const br = AN.RNG.from(world.seed, 'ponts' + index);
      const mark = new Int16Array(w * h).fill(-1);
      for (let b = 0; b < 3; b++) {
        const ox = br.int(10, w - 11), oy = br.int(10, h - 11), a = br.float(0, Math.PI);
        const nx = -Math.sin(a), ny = Math.cos(a);
        for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
          if (Math.abs((x - ox) * nx + (y - oy) * ny) > 1.6) continue;
          const i = idx(x, y);
          if ((grid[i] !== FLOOR && grid[i] !== HAZARD) || nearKey(x, y, 6)) continue;
          mark[i] = 0;
        }
      }
      // chaque morceau de bande posé sur le sol devient un pont
      for (let i = 0; i < w * h; i++) {
        if (mark[i] !== 0) continue;
        const tiles = [];
        const st = [i];
        mark[i] = bridges.length + 1;
        while (st.length) {
          const j = st.pop();
          tiles.push(j);
          const x = j % w;
          for (const k of [j - 1, j + 1, j - w, j + w]) {
            if (k < 0 || k >= w * h || mark[k] !== 0) continue;
            if ((k === j - 1 && x === 0) || (k === j + 1 && x === w - 1)) continue;
            mark[k] = bridges.length + 1;
            st.push(k);
          }
        }
        if (tiles.length < 3) { tiles.forEach((j) => { mark[j] = -1; }); continue; }
        tiles.forEach((j) => { grid[j] = BRIDGE_ON; });
        const cx = tiles.reduce((s2, j) => s2 + (j % w), 0) / tiles.length, cy = tiles.reduce((s2, j) => s2 + ((j / w) | 0), 0) / tiles.length;
        bridges.push({ tiles, x: cx * T + T / 2, y: cy * T + T / 2, on: br.float(10, 16), off: br.float(6, 10), phase: br.float(0, 20), open: true });
      }
    }
    // Toile : des filaments de lumière relient les lieux de la zone ; on y file, ailleurs on se traîne
    const filaments = [];
    if (world.scale === 'toile') {
      const fr = AN.RNG.from(world.seed, 'filaments' + index);
      const pts = protect.slice();
      for (let tries = 0; tries < 400 && pts.length < protect.length + 6; tries++) {
        const x = fr.int(6, w - 7), y = fr.int(6, h - 7);
        if (!isFloor(x, y) || pts.some((q) => !farFrom(x, y, q, 9))) continue;
        pts.push({ x, y });
      }
      // arbre couvrant le plus court, puis deux raccourcis
      const inT = [0], edges = [];
      while (inT.length < pts.length) {
        let best = null, bd = 1e9;
        for (const a of inT) for (let b2 = 0; b2 < pts.length; b2++) {
          if (inT.includes(b2)) continue;
          const d = (pts[a].x - pts[b2].x) ** 2 + (pts[a].y - pts[b2].y) ** 2;
          if (d < bd) { bd = d; best = [a, b2]; }
        }
        edges.push(best); inT.push(best[1]);
      }
      for (let k = 0; k < 2; k++) {
        const a = fr.int(0, pts.length - 1), b2 = fr.int(0, pts.length - 1);
        if (a !== b2 && !edges.some((e) => (e[0] === a && e[1] === b2) || (e[0] === b2 && e[1] === a))) edges.push([a, b2]);
      }
      edges.forEach(([a, b2]) => {
        const A = pts[a], B = pts[b2];
        const n = Math.ceil(Math.hypot(B.x - A.x, B.y - A.y) * 2);
        for (let s2 = 0; s2 <= n; s2++) {
          const x = Math.round(U.lerp(A.x, B.x, s2 / n)), y = Math.round(U.lerp(A.y, B.y, s2 / n));
          for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
            const xx = x + ox, yy = y + oy;
            if (xx < 2 || yy < 2 || xx >= w - 2 || yy >= h - 2) continue;
            if (vaults.some((v) => !farFrom(xx, yy, { x: Math.floor(v.cx / T), y: Math.floor(v.cy / T) }, 7))) continue;
            const i = idx(xx, yy);
            if (grid[i] === WALL || grid[i] === HAZARD) grid[i] = FLOOR;
          }
        }
        filaments.push({ x1: A.x * T + T / 2, y1: A.y * T + T / 2, x2: B.x * T + T / 2, y2: B.y * T + T / 2 });
      });
    }
    // Pli : des endroits où la marche s'inverse
    const inversions = [];
    if (world.scale === 'pli') {
      const ir = AN.RNG.from(world.seed, 'envers' + index);
      for (let tries = 0; tries < 500 && inversions.length < 6; tries++) {
        const x = ir.int(6, w - 7), y = ir.int(6, h - 7);
        if (!isFloor(x, y) || nearKey(x, y, 9)) continue;
        if (inversions.some((q) => (q.tx - x) ** 2 + (q.ty - y) ** 2 < 144)) continue;
        inversions.push({ tx: x, ty: y, x: x * T + T / 2, y: y * T + T / 2, r: T * ir.float(3.5, 5.5) });
      }
    }

    // ---- Décor (non bloquant) ----
    const decor = [];
    const decorCount = Math.round(w * h * 0.07);
    for (let k = 0; k < decorCount; k++) {
      const x = rng.int(2, w - 3), y = rng.int(2, h - 3);
      const g = grid[idx(x, y)];
      if (g !== FLOOR) continue;
      const b = localBiome(x, y);
      const d = rng.pick(b.decor);
      decor.push({ x: x * T + rng.float(2, T - 2), y: y * T + rng.float(2, T - 2), type: d[0], color: d[1], s: rng.float(0.7, 1.3), rot: rng.float(0, Math.PI * 2) });
    }

    const zone = {
      index, isHeart, name: spec.name, biome: biome.id, mix: mix ? mix.id : null, guardian: spec.guardian,
      w, h, T, grid, bmap, shade,
      entry: toPx(entry), entryT: entry,
      arena: { ...toPx(arenaT), r: arenaR * T, tx: arenaT.x, ty: arenaT.y },
      plates: plates.map(toPx),
      gates: gates.map((g) => ({ ...toPx(g.t), to: g.to, kind: g.kind })),
      nodes, groups, ruins, decor, vaults, eggs, village, wells, structure, bridges, filaments, inversions,
      starAngle: AN.RNG.from(world.seed, 'etoile' + index).float(0, Math.PI * 2),
    };
    return zone;
  };

  /* ---- Requêtes sur la grille ---- */
  Z.tileAt = (zone, px, py) => {
    const tx = Math.floor(px / T), ty = Math.floor(py / T);
    if (tx < 0 || ty < 0 || tx >= zone.w || ty >= zone.h) return WALL;
    return zone.grid[ty * zone.w + tx];
  };
  Z.solidT = (zone, tx, ty) => tx < 0 || ty < 0 || tx >= zone.w || ty >= zone.h || Z.SOLID[zone.grid[ty * zone.w + tx]] === 1;
  Z.biomeAt = (zone, px, py) => {
    const tx = Math.floor(px / T), ty = Math.floor(py / T);
    if (zone.mix && tx >= 0 && ty >= 0 && tx < zone.w && ty < zone.h && zone.bmap[ty * zone.w + tx]) return D.BIOME[zone.mix];
    return D.BIOME[zone.biome];
  };
  /** Ligne de vue approximative entre deux points (pas de 12 px). */
  Z.los = (zone, ax, ay, bx, by) => {
    const d = Math.hypot(bx - ax, by - ay);
    const steps = Math.ceil(d / 12);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (Z.solidT(zone, Math.floor((ax + (bx - ax) * t) / T), Math.floor((ay + (by - ay) * t) / T))) return false;
    }
    return true;
  };
})();
