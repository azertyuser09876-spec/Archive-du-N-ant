/* Manette (1.6) : jeu complet et navigation dans les menus.
   Disposition « standard » (Xbox, PlayStation, la plupart des manettes USB) :
   stick gauche se déplacer, stick droit viser, gâchette droite tirer,
   bouton RB frapper, gâchette gauche capturer, A interagir, B esquiver,
   X capacité, Y monture, LB appel, Vue sac, Menu pause, croix consommables,
   clic du stick gauche urgence, clic du stick droit agencer l'Archive.
   Dans un menu : croix ou stick gauche pour se déplacer, A valider, B retour,
   LB / RB changer d'onglet, stick droit faire défiler. */
(function () {
  'use strict';
  const AN = window.AN;
  const I = AN.Input;
  const U = AN.Util;

  const Pad = (AN.Pad = { connected: false, prev: [], repeatT: 0, lastDir: null, name: '' });
  const DEAD = 0.22;

  // bouton → code logique (jeu)
  const MAP = { 0: 'KeyE', 1: 'Space', 2: 'KeyQ', 3: 'KeyR', 4: 'KeyG', 6: 'KeyF', 8: 'Tab', 10: 'KeyX', 11: 'KeyV', 12: 'Digit1', 15: 'Digit2', 13: 'Digit3', 14: 'Digit4' };
  Pad.LABELS = { KeyE: 'A', Space: 'B', KeyQ: 'X', KeyR: 'Y', KeyG: 'LB', KeyF: 'LT', Tab: 'Vue', KeyX: 'L3', KeyV: 'R3', Digit1: '↑', Digit2: '→', Digit3: '↓', Digit4: '←', Escape: 'Menu', Mouse0: 'RT', Mouse2: 'RB' };

  window.addEventListener('gamepadconnected', (e) => {
    Pad.connected = true;
    Pad.name = e.gamepad.id;
    AN.HUD && AN.HUD.toast && AN.HUD.toast('Manette connectée. Stick gauche : bouger, stick droit : viser, gâchette droite : tirer. Menu : pause.', 6);
  });
  window.addEventListener('gamepaddisconnected', () => { Pad.connected = !!Pad.get(); });

  Pad.get = function () {
    const list = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const g of list) if (g && g.connected) return g;
    return null;
  };
  const dz = (v) => (Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD));
  const pressedBtn = (g, i) => { const b = g.buttons[i]; return !!b && (b.pressed || b.value > 0.4); };

  /** À appeler à chaque image, avant la mise à jour de la scène. */
  Pad.poll = function (dt) {
    const g = Pad.get();
    if (!g) { if (Pad.active) Pad.release(); return; }
    const now = g.buttons.map((b, i) => pressedBtn(g, i));
    const was = Pad.prev;
    const down = (i) => now[i] && !was[i];
    const up = (i) => !now[i] && was[i];
    const lx = dz(g.axes[0] || 0), ly = dz(g.axes[1] || 0), rx = dz(g.axes[2] || 0), ry = dz(g.axes[3] || 0);
    const any = now.some(Boolean) || lx || ly || rx || ry;
    if (any) { I.lastDevice = 'manette'; Pad.active = true; }
    if (!Pad.active) { Pad.prev = now; return; }

    if (AN.UI && AN.UI.isOpen()) {
      Pad.menu(g, now, was, lx, ly, rx, ry, dt);
      // le jeu ne reçoit plus rien
      I.vAxis = null;
      Object.values(MAP).forEach((c) => { if (I.keys[c] && Pad.held && Pad.held[c]) I.release(c); });
      Pad.held = {};
      if (I.mouse.down[0] && Pad.fire) { I.mouseRelease(0); Pad.fire = false; }
      if (I.mouse.down[2] && Pad.melee) { I.mouseRelease(2); Pad.melee = false; }
      Pad.prev = now;
      return;
    }
    // déplacement
    I.vAxis = lx || ly ? { x: lx, y: ly } : null;
    const arc = AN.Archive && AN.Archive.state && AN.Archive.state() && AN.Game.scene && AN.Game.scene.name === 'archive';
    const mapMode = arc && AN.Archive.state().mapMode;
    // visée : le stick droit oriente un curseur virtuel autour du personnage
    if (mapMode) {
      // agencement : le stick droit déplace un curseur libre, le stick gauche fait glisser la vue ;
      // A = clic, B = clic droit (lâcher), Y tourner, gâchette gauche forme, LB ranger, X défaire
      I.mouse.x = U.clamp(I.mouse.x + rx * 700 * dt, 0, AN.Game.cam.W);
      I.mouse.y = U.clamp(I.mouse.y + ry * 700 * dt, 0, AN.Game.cam.H);
      I.cursorVisible = true;
    } else {
      I.cursorVisible = false;
      if (rx || ry) { const l = Math.hypot(rx, ry); I.aimDir = { x: rx / l, y: ry / l }; }
      else if (now[6] && AN.X) { const t = Pad.assist('capture'); if (t) I.aimDir = t; }
      else if (now[5] && AN.X) { const t = Pad.assist('melee'); if (t) I.aimDir = t; }
      else if (!I.aimDir && (lx || ly)) I.aimDir = { x: lx, y: ly };
      else if (lx || ly) { if (!Pad.aimHold) { const l = Math.hypot(lx, ly); I.aimDir = { x: lx / l, y: ly / l }; } }
      Pad.aimHold = !!(rx || ry);
      I.virtualCursor();
    }
    // Archive : stick droit vertical = zoom
    if (arc && !mapMode && ry) I.wheel += ry * dt * 7;

    // boutons
    Pad.held = Pad.held || {};
    for (const k in MAP) {
      const i = Number(k);
      let code = MAP[i];
      if (mapMode && i === 0) continue; // A sert de clic en agencement
      if (mapMode && i === 3) code = 'KeyR'; // Y : tourner
      if (down(i)) { I.press(code); Pad.held[code] = true; }
      else if (up(i)) { I.release(code); Pad.held[code] = false; }
    }
    if (mapMode) {
      if (down(0)) I.mousePress(0); else if (up(0)) I.mouseRelease(0);
      if (down(1)) I.mousePress(2); else if (up(1)) I.mouseRelease(2);
    }
    // tir (RT) et frappe (RB)
    if (!mapMode) {
      if (now[7] && !Pad.fire) { I.mousePress(0); Pad.fire = true; } else if (!now[7] && Pad.fire) { I.mouseRelease(0); Pad.fire = false; }
      if (now[5] && !Pad.melee) { I.mousePress(2); Pad.melee = true; } else if (!now[5] && Pad.melee) { I.mouseRelease(2); Pad.melee = false; }
    }
    if (down(9)) { I.press('Escape'); setTimeout(() => I.release('Escape'), 0); }
    Pad.prev = now;
  };

  /** Lâche tout (manette débranchée). */
  Pad.release = function () {
    Pad.active = false;
    I.vAxis = null;
    for (const c in Pad.held || {}) if (Pad.held[c]) I.release(c);
    Pad.held = {};
    if (Pad.fire) { I.mouseRelease(0); Pad.fire = false; }
    if (Pad.melee) { I.mouseRelease(2); Pad.melee = false; }
  };

  /** Aide à la visée : direction de la créature la plus pertinente. */
  Pad.assist = function (kind) {
    const X = AN.X;
    if (!X) return null;
    const p = X.player;
    let best = null, bd = kind === 'capture' ? (X.beamRange || 180) + 60 : 160;
    for (const e of X.creatures) {
      if (!e.alive || e.hidden || e.team !== 'wild') continue;
      if (kind === 'capture' && !AN.Capture.eligible(X, e)) continue;
      const d = U.dist(e.x, e.y, p.x, p.y) - e.r;
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) return null;
    const a = Math.atan2(best.y - p.y, best.x - p.x);
    return { x: Math.cos(a), y: Math.sin(a) };
  };

  /* ---------- menus ---------- */
  function focusables() {
    const stack = AN.UI.stack;
    const top = stack.length ? stack[stack.length - 1].wrap : document;
    return [...top.querySelectorAll('button, select, input, [tabindex]:not([tabindex="-1"]), a[href], canvas.worldmap')]
      .filter((el) => !el.disabled && !el.hidden && el.type !== 'file' && el.offsetParent !== null && el.getBoundingClientRect().width > 0);
  }
  function setFocus(el) {
    document.querySelectorAll('.pad-focus').forEach((x) => x.classList.remove('pad-focus'));
    if (!el) return;
    el.classList.add('pad-focus');
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  /** Élément le plus proche dans une direction (navigation spatiale). */
  Pad.move = function (dx, dy) {
    const list = focusables();
    if (!list.length) return;
    let cur = document.activeElement;
    if (!list.includes(cur)) { setFocus(list[0]); return; }
    const r0 = cur.getBoundingClientRect();
    const cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
    let best = null, bs = 1e9;
    for (const el of list) {
      if (el === cur) continue;
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const vx = x - cx, vy = y - cy;
      const along = vx * dx + vy * dy;
      if (along <= 4) continue;
      const across = Math.abs(vx * dy - vy * dx);
      const score = along + across * 2.2;
      if (score < bs) { bs = score; best = el; }
    }
    if (best) { setFocus(best); AN.Audio.play('ui', { gap: 0.05 }); }
  };
  function activate(el) {
    if (!el) return;
    if (el.tagName === 'SELECT') { el.selectedIndex = (el.selectedIndex + 1) % el.options.length; el.dispatchEvent(new Event('change', { bubbles: true })); return; }
    if (el.tagName === 'INPUT' && el.type === 'range') return;
    el.click();
  }
  function nudge(el, dir) {
    if (!el) return false;
    if (el.tagName === 'INPUT' && el.type === 'range') {
      const step = Number(el.step) || 0.05;
      el.value = U.clamp(Number(el.value) + dir * step * 2, Number(el.min), Number(el.max));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    if (el.tagName === 'SELECT') {
      el.selectedIndex = U.clamp(el.selectedIndex + dir, 0, el.options.length - 1);
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }
  function switchTab(dir) {
    const stack = AN.UI.stack;
    const top = stack.length ? stack[stack.length - 1].wrap : document;
    const tabs = [...top.querySelectorAll('.tabs .tab, .pause-tabs .seg, .view-toggle .seg, .echelons .echelon:not([disabled])')];
    const groups = new Map();
    tabs.forEach((t) => { const k = t.parentElement; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(t); });
    const first = groups.values().next().value;
    if (!first) return;
    const i = first.findIndex((t) => t.classList.contains('on'));
    const next = first[(i + dir + first.length) % first.length];
    if (next) { next.click(); setTimeout(() => setFocus(focusables()[0]), 30); }
  }
  Pad.menu = function (g, now, was, lx, ly, rx, ry, dt) {
    const down = (i) => now[i] && !was[i];
    let dir = null;
    if (now[12] || ly < -0.6) dir = [0, -1];
    else if (now[13] || ly > 0.6) dir = [0, 1];
    else if (now[14] || lx < -0.6) dir = [-1, 0];
    else if (now[15] || lx > 0.6) dir = [1, 0];
    Pad.repeatT -= dt;
    const key = dir ? dir.join() : null;
    if (dir && (key !== Pad.lastDir || Pad.repeatT <= 0)) {
      const el = document.activeElement;
      // gauche / droite règlent les curseurs et les listes
      if (!(dir[0] && nudge(el, dir[0]))) Pad.move(dir[0], dir[1]);
      Pad.repeatT = key !== Pad.lastDir ? 0.38 : 0.11;
    }
    Pad.lastDir = key;
    if (down(0)) activate(document.activeElement && document.activeElement !== document.body ? document.activeElement : focusables()[0]);
    if (down(1) || down(9)) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }));
    if (down(4)) switchTab(-1);
    if (down(5)) switchTab(1);
    if (ry) {
      const stack = AN.UI.stack;
      const top = stack.length ? stack[stack.length - 1].wrap : null;
      const sc = top && (top.querySelector('.tab-content') || top.querySelector('.panel'));
      if (sc) sc.scrollTop += ry * 900 * dt;
    }
    if (!document.querySelector('.pad-focus') || !document.querySelector('.pad-focus').isConnected) { const f = focusables(); if (f.length) setFocus(f.find((x) => x.hasAttribute('autofocus')) || f[0]); }
  };

  /** Vibration courte (dégâts, capture). */
  Pad.rumble = function (strength = 0.5, ms = 140) {
    if (!Pad.active || !(AN.Prefs && AN.Prefs.data.pad.vibrate)) return;
    const g = Pad.get();
    const act = g && g.vibrationActuator;
    if (act && act.playEffect) act.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength * 0.6 }).catch(() => {});
  };
})();
