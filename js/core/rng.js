/* Générateur pseudo-aléatoire déterministe à graine + bruit de valeur 2D.
   Toute la génération procédurale passe par ici : une même graine
   produit toujours le même monde. */
(function () {
  'use strict';
  const AN = window.AN;

  /** Hachage 32 bits d'une chaîne (variante de cyrb53). */
  AN.hash = function (str) {
    str = String(str);
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h1 ^ (h2 >>> 1)) >>> 0;
  };

  class RNG {
    constructor(seed) {
      this.s = seed >>> 0 || 0x9e3779b9;
    }
    /** mulberry32 : flottant dans [0, 1[ */
    next() {
      let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    float(a = 0, b = 1) { return a + (b - a) * this.next(); }
    /** entier dans [a, b] inclus */
    int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
    chance(p) { return this.next() < p; }
    /** entries : [[valeur, poids], ...] */
    weighted(entries) {
      let total = 0;
      for (const e of entries) total += Math.max(0, e[1]);
      if (total <= 0) return entries.length ? entries[0][0] : undefined;
      let r = this.next() * total;
      for (const e of entries) {
        r -= Math.max(0, e[1]);
        if (r < 0) return e[0];
      }
      return entries[entries.length - 1][0];
    }
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      }
      return arr;
    }
    /** Nouveau générateur dérivé d'une graine et d'une étiquette (indépendant de l'état courant). */
    static from(seed, label) {
      return new RNG(AN.hash(String(seed) + '|' + label));
    }
  }
  AN.RNG = RNG;

  /** Bruit de valeur lissé, déterministe. get() renvoie une valeur dans [0, 1]. */
  class Noise {
    constructor(seed) {
      this.seed = seed >>> 0;
    }
    lattice(ix, iy) {
      let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(this.seed, 2246822519)) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    }
    get(x, y) {
      const ix = Math.floor(x), iy = Math.floor(y);
      const fx = x - ix, fy = y - iy;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const a = this.lattice(ix, iy), b = this.lattice(ix + 1, iy);
      const c = this.lattice(ix, iy + 1), d = this.lattice(ix + 1, iy + 1);
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }
    fbm(x, y, octaves = 4) {
      let v = 0, amp = 0.5, f = 1, norm = 0;
      for (let i = 0; i < octaves; i++) {
        v += amp * this.get(x * f + i * 17.31, y * f + i * 9.17);
        norm += amp;
        amp *= 0.5;
        f *= 2;
      }
      return v / norm;
    }
  }
  AN.Noise = Noise;
})();
