/* Conseils et visite guidée (1.15).
   - AN.Tips.show(id) : la première fois qu'un système apparaît, un conseil (une seule
     fois par partie), rangé ensuite dans le Guide de la console ;
   - AN.Tips.update(X, dt) : en expédition, repère ces premières fois (caveau en vue,
     village, nation, sac plein, vigueur basse, structure, événement, autre échelle…) ;
   - UI.startTour() : la visite de la console, page par page, à la première ouverture. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const h = AN.h;
  const UI = AN.UI;

  const Tp = (AN.Tips = {});
  const flags = (p) => (p.flags.tips = p.flags.tips || {});
  Tp.seen = (p, id) => !!(p && p.flags && p.flags.tips && p.flags.tips[id]);
  let queue = [], showing = false;

  /** Montre un conseil (s'il n'a jamais été vu), après un délai éventuel (ms). */
  Tp.show = function (id, delay = 0) {
    const p = AN.Game.profile;
    const t = D.TIPS.find((x) => x.id === id);
    if (!p || !t || Tp.seen(p, id) || queue.includes(t)) return false;
    flags(p)[id] = 1;
    AN.Save.write(p);
    setTimeout(() => { queue.push(t); next(); }, delay);
    return true;
  };
  /** Marque un conseil comme vu sans le montrer (il est rangé dans le Guide). */
  Tp.mark = (p, id) => { flags(p)[id] = 1; };
  function next() {
    if (showing || !queue.length) return;
    const box = document.getElementById('toasts');
    if (!box) { queue = []; return; }
    const t = queue.shift();
    showing = true;
    const el = h('div', { class: 'toast tip', role: 'status' },
      h('small', { class: 'tip-kicker' }, 'Conseil · ' + t.where),
      h('b', null, t.title),
      h('p', null, t.text),
      h('small', { class: 'tip-foot' }, 'Retrouvez-le dans le Guide (console, chapitre Savoir).'));
    const done = () => { if (!el.isConnected) return; el.classList.add('out'); setTimeout(() => { el.remove(); showing = false; next(); }, 400); };
    el.addEventListener('click', done);
    box.appendChild(el);
    setTimeout(done, 12000);
    AN.Audio.play('ui');
  }

  /* ---------- en expédition : les premières fois ---------- */
  Tp.start = function (X) {
    X.tipT = 3;
    const p = X.profile;
    if (X.tuto) return;
    if (X.allies.some((a) => a.abilityId)) Tp.show('companions', 6000);
    if (X.allies.some((a) => (D.trait(a.def.id) || {}).mount)) Tp.show('mount', 14000);
    if (X.abil && X.abil.call) Tp.show('call', 22000);
    if (X.nation) Tp.show('nation', 9000);
    if (X.echelon && X.echelon.id !== 'region') Tp.show('echelon', 11000);
    if (p.expeditions >= 1) Tp.show('bag', 30000);
  };
  Tp.update = function (X, dt) {
    if (X.tuto || X.ending) return;
    X.tipT = (X.tipT || 0) - dt;
    if (X.tipT > 0) return;
    X.tipT = 0.5;
    const p = X.player, z = X.zone;
    const near = (x, y, r) => Math.abs(x - p.x) < r && Math.abs(y - p.y) < r && U.dist(x, y, p.x, p.y) < r;
    if ((z.vaults || []).some((v) => !v.opened && near(v.x, v.y, 380))) Tp.show('vault');
    if (z.village && !z.village.city && near(z.village.x, z.village.y, 520)) Tp.show('village');
    if (z.structure && !z.structure.taken && near(z.structure.x, z.structure.y, 360)) Tp.show('structure');
    if (X.event) Tp.show('event', 1500);
    if (z.colMap && !X.colShow) { Tp.show('colmap', 400); Tp.show('climb', 800); } // sur un colosse-carte (1.16.3)
    if (X.creatures.some((c) => c.act && c.team === 'wild' && near(c.x, c.y, 420))) Tp.show('gestes', 300); // une créature prépare son geste (1.17)
    if (X.creatures.some((c) => c.col && c.alive && U.dist(c.col.x, c.col.y, p.x, p.y) < c.col.L * 1.6)) Tp.show('colossus'); // un colosse en vue (1.16)
    if (X.bagFree && X.bagFree() <= 0) Tp.show('bag');
    if (X.conquered.size >= 1) Tp.show('extract', 2500);
    if (p.alive && p.hp < p.maxHp * 0.3) Tp.show('emergency');
  };

  /* ---------- la visite de la console ---------- */
  let tour = null;
  /** Démarre la visite (force : même si elle a déjà été faite). */
  UI.startTour = function (force) {
    const prof = AN.Game.profile;
    if (!prof || !D.TOUR || (!force && Tp.seen(prof, 'tour'))) return;
    tour = { i: 0 };
    if (UI.consoleShow) UI.consoleShow(D.TOUR[0].tab);
  };
  function endTour() {
    const prof = AN.Game.profile;
    tour = null;
    document.querySelectorAll('.tour-bubble').forEach((b) => b.remove());
    document.querySelectorAll('.tour-focus').forEach((e) => e.classList.remove('tour-focus'));
    if (prof) { Tp.mark(prof, 'tour'); Tp.mark(prof, 'console'); Tp.mark(prof, 'danger'); AN.Save.write(prof); }
  }
  /** Appelé après chaque page de la console : place la bulle de l'étape en cours. */
  UI.tourStep = function (el) {
    el.querySelectorAll('.tour-bubble').forEach((b) => b.remove());
    el.querySelectorAll('.tour-focus').forEach((e) => e.classList.remove('tour-focus'));
    if (!tour) return;
    const st = D.TOUR[tour.i];
    if (!st) { endTour(); return; }
    const cur = el.querySelector('.reg-tabs .tab.on');
    const want = st.tab;
    if (!el.querySelector('.page') || (cur && !cur.textContent.length)) return;
    // vous êtes allé ailleurs : la visite s'arrête là (elle reste dans le Guide)
    if (UI.consoleTab && UI.consoleTab() !== want) { endTour(); return; }
    const focus = st.anchor ? el.querySelector(st.anchor) : null;
    if (focus) { focus.classList.add('tour-focus'); focus.scrollIntoView({ block: 'center' }); }
    const last = tour.i >= D.TOUR.length - 1;
    const bubble = h('div', { class: 'tour-bubble', role: 'dialog', 'aria-label': 'Visite de la console' },
      h('small', null, 'Visite · ' + (tour.i + 1) + ' sur ' + D.TOUR.length),
      h('p', null, st.text),
      h('div', { class: 'actions' },
        UI.btn('Passer la visite', () => { endTour(); AN.Audio.play('ui'); }, 'ghost small'),
        UI.btn(last ? 'Terminer' : 'Suivant', () => { tour.i++; AN.Audio.play('ui_ok'); if (tour.i >= D.TOUR.length) endTour(); else UI.consoleShow(D.TOUR[tour.i].tab); }, 'primary small', { autofocus: true })));
    (el.querySelector('.reg-right') || el).appendChild(bubble);
  };
})();
