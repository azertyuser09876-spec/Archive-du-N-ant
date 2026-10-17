/* Préférences de l'appareil (1.5), communes à toutes les parties :
   dernier emplacement de partie utilisé, touches reconfigurées, options
   d'accessibilité, réglages tactiles. Rangées à part des sauvegardes. */
(function () {
  'use strict';
  const AN = window.AN;

  const Pr = (AN.Prefs = {
    KEY: 'archive-du-neant/prefs',
    data: null,
    DEFAULTS: {
      lastSlot: 1,
      keys: {}, // action logique (code par défaut) → touche physique
      ui: { scale: 1, palette: 'standard', reduceFx: false, autoPause: true, bigText: false },
      touch: { mode: 'auto', size: 1, left: false },
      pad: { vibrate: true },
    },
  });

  function merge(target, src) {
    for (const k in src) {
      if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) target[k] = merge(target[k] && typeof target[k] === 'object' ? target[k] : {}, src[k]);
      else if (target[k] === undefined) target[k] = src[k];
    }
    return target;
  }

  Pr.load = function () {
    let d = null;
    try { d = JSON.parse(window.localStorage.getItem(Pr.KEY) || 'null'); } catch (e) { d = null; }
    Pr.data = merge(d && typeof d === 'object' ? d : {}, JSON.parse(JSON.stringify(Pr.DEFAULTS)));
    return Pr.data;
  };
  Pr.save = function () {
    try { window.localStorage.setItem(Pr.KEY, JSON.stringify(Pr.data)); } catch (e) { /* navigation privée : préférences en mémoire seulement */ }
  };
  Pr.set = function (section, key, value) {
    Pr.data[section][key] = value;
    Pr.save();
    if (section === 'ui') Pr.applyUI();
  };

  /* ---------- accessibilité ---------- */
  Pr.PALETTES = {
    standard: { cyan: '#2346c8', stamp: '#b3261e', name: 'Standard' },
    // rouge et vert se confondent pour beaucoup : le danger passe à l'orange vif, le bleu fonce
    daltonien: { cyan: '#1d4fb8', stamp: '#e66100', name: 'Daltonisme (rouge-vert)' },
    contraste: { cyan: '#0033cc', stamp: '#c00000', name: 'Contraste élevé' },
  };
  Pr.applyUI = function () {
    const u = Pr.data.ui;
    const root = document.documentElement;
    root.style.setProperty('--ui-zoom', String(u.scale || 1));
    const pal = Pr.PALETTES[u.palette] || Pr.PALETTES.standard;
    root.style.setProperty('--cyan', pal.cyan);
    root.style.setProperty('--stamp', pal.stamp);
    root.classList.toggle('contrast', u.palette === 'contraste');
    root.classList.toggle('reduce-fx', !!u.reduceFx);
    root.classList.toggle('big-text', !!u.bigText);
    if (AN.CYAN) { AN.CYAN = pal.cyan; AN.STAMP = pal.stamp; }
    if (AN.Icons && AN.Icons.cache) AN.Icons.cache.clear();
  };
  /** Effets réduits : moins de particules, pas de flash ni de tremblement. */
  Pr.reduceFx = () => !!(Pr.data && Pr.data.ui.reduceFx);

  Pr.load();
})();
