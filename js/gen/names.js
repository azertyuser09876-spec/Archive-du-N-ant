/* Noms propres (1.11). Un monde d'un échelon cosmique reçoit un nom propre
   tiré de son code ; ce qu'on en ramène porte le même : un astre pris dans le
   « Système d'Arithal » s'appelle « Planète-tison d'Arithal », et le lieu ancré
   qu'il ouvre, « Système d'Arithal ». Rien n'est enregistré : le nom se
   recalcule toujours à l'identique à partir du code du monde. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;

  const N = (AN.Names = {});

  /** Un nom propre, toujours le même pour la même graine. */
  N.proper = function (seed) {
    const P = D.PROPER;
    for (let k = 0; k < 8; k++) {
      const h = AN.hash(String(seed) + (k ? '#' + k : '')), h2 = AN.hash(String(seed) + '·' + k);
      const s = h & 1 ? P.pv[(h >>> 1) % P.pv.length] + P.sc[h2 % P.sc.length] : P.pc[(h >>> 1) % P.pc.length] + P.sv[h2 % P.sv.length];
      // ni mot existant, ni syllabe bégayée (« Morore »)
      if (!P.avoid.includes(s) && !/(..)\1/.test(s.toLowerCase())) return s;
    }
    return 'Arithal';
  };

  /** « de Mirre », « d'Arithal » (élision devant une voyelle ou un h). */
  N.de = (name) => (/^[aeiouyhàâäéèêëîïôöùûü]/i.test(name) ? 'd’' : 'de ') + name;

  /** Nom d'un monde d'échelon cosmique : « Système d'Arithal », « Planète Nylombe ». */
  N.world = function (scale, code) {
    const E = D.ECHELONS[scale];
    const p = N.proper(code);
    if (!E || !E.placeNoun) return p;
    return E.placeApposition ? E.placeNoun + ' ' + p : E.placeNoun + ' ' + N.de(p);
  };

  /** Le nom propre d'un astre : celui du monde d'où il vient. */
  N.astreProper = (a) => N.proper(a.world && !/^(DEBUG|TRICHE)$/.test(a.world) ? a.world : a.uid);
  /** « Planète-tison d'Arithal ». */
  N.astre = function (a) {
    const A = D.ASTRES[a.biome];
    const noun = A ? A.noun || A.name : a.name || 'Astre';
    return noun + ' ' + N.de(N.astreProper(a));
  };
  /** La nature d'un astre, en toutes lettres (« planète-tison »). */
  N.astreKind = (a) => { const A = D.ASTRES[a.biome]; return A ? A.name : a.name || ''; };
})();
