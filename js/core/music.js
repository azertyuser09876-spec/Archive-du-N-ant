/* Musique générative (1.8) : composée en direct avec la Web Audio API.
   Chaque humeur (écran titre, Archive, expédition, boss, transfert, fin
   d'expédition) fixe un mode, une tonique, un tempo, une suite d'accords et le
   niveau de cinq couches : nappe, basse, arpège, cloches, percussions. Dans une
   expédition, le mode et la tonique viennent du biome, la mélodie de la graine
   du monde : chaque monde a son thème. L'intensité (créatures qui attaquent,
   gardien réveillé) ajoute des percussions et accélère l'arpège ; elle varie
   en continu, sans couper la musique. Les changements d'humeur attendent la
   mesure suivante. */
(function () {
  'use strict';
  const AN = window.AN;
  const A = AN.Audio;

  const M = (AN.Music = {
    on: false, cur: null, next: null, intensity: 0, targetI: 0, boss: 0, targetBoss: 0, progress: 0,
    step: 0, bar: 0, nextTime: 0, timer: null, duck: 1,
    level: { pad: 0, bass: 0, arp: 0, bell: 0, perc: 0 },
  });

  /* ---------- gammes ---------- */
  const MODES = {
    ionian: [0, 2, 4, 5, 7, 9, 11], lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10], aeolian: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10],
    penta: [0, 3, 5, 7, 10], wholetone: [0, 2, 4, 6, 8, 10], hijaz: [0, 1, 4, 5, 7, 8, 10],
  };
  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
  /** Note d'un degré de la gamme (degré peut dépasser l'octave). */
  function noteOf(st, degree, octave) {
    const sc = st.scale;
    const n = sc.length;
    const o = Math.floor(degree / n);
    const d = ((degree % n) + n) % n;
    return st.root + sc[d] + 12 * (o + octave);
  }

  /** Humeur d'un biome, d'après ses étiquettes. */
  function biomeMood(biomeId) {
    const B = AN.Data && AN.Data.BIOME[biomeId];
    const t = (B && B.tags) || [];
    const has = (...k) => k.some((x) => t.includes(x));
    if (has('plasma', 'gaz', 'lune', 'etoile')) return { mode: 'wholetone', root: 41, bpm: 58, bright: 0.55, arp: 0.35, bell: 0.55, echo: 0.45 };
    if (has('vide')) return { mode: 'phrygian', root: 40, bpm: 54, bright: 0.25, arp: 0.15, bell: 0.4, echo: 0.5 };
    if (has('volcanique', 'chaud', 'cendre')) return { mode: 'hijaz', root: 45, bpm: 78, bright: 0.5, arp: 0.45, bell: 0.15, echo: 0.2 };
    if (has('froid')) return { mode: 'dorian', root: 50, bpm: 62, bright: 0.6, arp: 0.25, bell: 0.6, echo: 0.4 };
    if (has('eau', 'humide')) return { mode: 'lydian', root: 47, bpm: 68, bright: 0.55, arp: 0.55, bell: 0.3, echo: 0.35 };
    if (has('electrique', 'artificiel', 'metal')) return { mode: 'penta', root: 46, bpm: 84, bright: 0.65, arp: 0.6, bell: 0.2, echo: 0.25 };
    if (has('sombre', 'acide')) return { mode: 'aeolian', root: 43, bpm: 64, bright: 0.3, arp: 0.3, bell: 0.3, echo: 0.35 };
    if (has('lumiere')) return { mode: 'lydian', root: 52, bpm: 70, bright: 0.75, arp: 0.4, bell: 0.5, echo: 0.3 };
    if (has('vie', 'organique')) return { mode: 'mixolydian', root: 48, bpm: 72, bright: 0.55, arp: 0.5, bell: 0.3, echo: 0.25 };
    if (has('mineral', 'sec')) return { mode: 'dorian', root: 45, bpm: 66, bright: 0.45, arp: 0.35, bell: 0.35, echo: 0.3 };
    return { mode: 'dorian', root: 48, bpm: 68, bright: 0.5, arp: 0.35, bell: 0.35, echo: 0.3 };
  }

  /** Construit l'état musical d'une humeur. */
  function build(name, o = {}) {
    const rng = AN.RNG.from(o.seed || 7, 'musique:' + name);
    let st;
    if (name === 'title') st = { mode: 'lydian', root: 50, bpm: 56, bright: 0.45, layers: { pad: 0.7, bass: 0.2, arp: 0, bell: 0.45, perc: 0 }, echo: 0.45 };
    else if (name === 'archive') {
      const rk = o.rank || 0;
      st = { mode: rk >= 6 ? 'lydian' : 'ionian', root: 48, bpm: 62 + rk, bright: 0.4 + rk * 0.03, layers: { pad: 0.6, bass: 0.3, arp: Math.min(0.45, 0.08 + rk * 0.05), bell: 0.4, perc: 0 }, echo: 0.35 + (rk >= 6 ? 0.15 : 0) };
    } else if (name === 'expedition') {
      const b = biomeMood(o.biome);
      const cosmic = o.scale && o.scale !== 'region';
      st = { mode: b.mode, root: b.root - (cosmic ? 5 : 0), bpm: b.bpm * (cosmic ? 0.85 : 1), bright: b.bright, layers: { pad: 0.55, bass: 0.3, arp: b.arp, bell: b.bell, perc: 0.04 }, echo: b.echo + (cosmic ? 0.2 : 0) };
    } else if (name === 'collapse') st = { mode: 'aeolian', root: 45, bpm: 96, bright: 0.6, layers: { pad: 0.65, bass: 0.55, arp: 0.7, bell: 0.2, perc: 0.55 }, echo: 0.3, riser: true };
    else if (name === 'finale') {
      const good = o.outcome === 'extrait';
      st = good ? { mode: 'lydian', root: 50, bpm: 64, bright: 0.65, layers: { pad: 0.9, bass: 0.5, arp: 0.5, bell: 0.7, perc: 0.15 }, echo: 0.5 }
        : { mode: 'phrygian', root: 45, bpm: 52, bright: 0.3, layers: { pad: 0.75, bass: 0.45, arp: 0.15, bell: 0.35, perc: 0 }, echo: 0.5 };
    } else st = { mode: 'dorian', root: 48, bpm: 64, bright: 0.4, layers: { pad: 0.5, bass: 0.25, arp: 0.2, bell: 0.3, perc: 0 }, echo: 0.3 };
    st.name = name;
    st.scale = MODES[st.mode];
    // suite d'accords : quatre mesures, ancrée sur la tonique ; tirée de la graine
    const n = st.scale.length;
    const pool = n >= 7 ? [[0, 5, 3, 4], [0, 3, 5, 4], [0, 4, 5, 3], [0, 6, 5, 4], [0, 2, 3, 4], [0, 5, 6, 4]] : [[0, 2, 3, 1], [0, 3, 1, 2], [0, 1, 3, 2]];
    st.prog = name === 'collapse' ? [0, 0, 5, 4] : name === 'finale' ? [0, 3, 4, 0] : rng.pick(pool);
    st.motif = Array.from({ length: 8 }, () => rng.int(-2, 4));
    st.rng = rng;
    st.seed = o.seed || 7;
    return st;
  }

  /* ---------- instruments ---------- */
  function voice(type, f, t0, dur, vol, opts = {}) {
    const c = A.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (opts.detune) o.detune.setValueAtTime(opts.detune, t0);
    if (opts.glide) o.frequency.exponentialRampToValueAtTime(opts.glide, t0 + dur);
    const g = c.createGain();
    const a = opts.attack || 0.01, r = opts.release || dur * 0.6;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + a);
    g.gain.setValueAtTime(Math.max(0.0002, vol), t0 + Math.max(a, dur - r));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = o;
    if (opts.lp) {
      const fl = c.createBiquadFilter();
      fl.type = 'lowpass'; fl.frequency.setValueAtTime(opts.lp, t0); fl.Q.value = opts.q || 0.7;
      if (opts.lp2) fl.frequency.exponentialRampToValueAtTime(opts.lp2, t0 + dur);
      node.connect(fl); node = fl;
    }
    node.connect(g);
    g.connect(opts.out || M.bus);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }
  function noiseHit(t0, dur, vol, f, type = 'bandpass', q = 1, f2) {
    const c = A.ctx;
    const s = c.createBufferSource();
    s.buffer = A.noiseBuf;
    const fl = c.createBiquadFilter();
    fl.type = type; fl.frequency.setValueAtTime(f, t0); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.01, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(fl); fl.connect(g); g.connect(M.bus);
    s.start(t0, Math.random());
    s.stop(t0 + dur + 0.05);
  }
  const INST = {
    pad(f, t0, dur, vol, st) {
      const lp = 500 + st.bright * 1400 + M.intensity * 900;
      voice('sawtooth', f, t0, dur, vol * 0.45, { attack: Math.min(1.2, dur * 0.3), release: Math.min(1.6, dur * 0.45), lp, lp2: lp * 0.7, detune: -7 });
      voice('triangle', f, t0, dur, vol * 0.6, { attack: Math.min(1, dur * 0.25), release: Math.min(1.6, dur * 0.45), detune: 6 });
    },
    bass(f, t0, dur, vol) {
      voice('triangle', f, t0, dur, vol, { attack: 0.02, release: dur * 0.5, lp: 520 });
      voice('sine', f / 2, t0, dur, vol * 0.7, { attack: 0.02, release: dur * 0.5 });
    },
    arp(f, t0, vol, st) { voice('triangle', f, t0, 0.32, vol, { attack: 0.004, release: 0.28, lp: 1800 + st.bright * 2500 }); },
    bell(f, t0, vol) {
      voice('sine', f, t0, 1.8, vol, { attack: 0.004, release: 1.7 });
      voice('sine', f * 2.756, t0, 0.9, vol * 0.35, { attack: 0.002, release: 0.85 });
      voice('sine', f * 5.4, t0, 0.4, vol * 0.12, { attack: 0.002, release: 0.38 });
    },
    kick(t0, vol) { voice('sine', 130, t0, 0.28, vol, { attack: 0.003, release: 0.26, glide: 38 }); },
    hat(t0, vol) { noiseHit(t0, 0.05, vol, 8000, 'highpass', 0.7); },
    rim(t0, vol) { noiseHit(t0, 0.12, vol, 1900, 'bandpass', 2); voice('triangle', 190, t0, 0.08, vol * 0.5, { attack: 0.002, release: 0.07 }); },
    riser(t0, dur, vol) { noiseHit(t0, dur, vol, 300, 'bandpass', 3, 5200); },
  };

  /* ---------- branchement ---------- */
  M.init = function () {
    if (M.bus || !A.ensure()) return !!M.bus;
    const c = A.ctx;
    M.out = c.createGain();
    M.out.gain.value = 0;
    M.out.connect(A.master);
    M.bus = c.createGain();
    M.bus.gain.value = 1;
    M.bus.connect(M.out);
    // écho doux : donne de l'espace sans réverbération coûteuse
    M.delay = c.createDelay(1.5);
    M.delay.delayTime.value = 0.36;
    M.fb = c.createGain(); M.fb.gain.value = 0.3;
    M.dfl = c.createBiquadFilter(); M.dfl.type = 'lowpass'; M.dfl.frequency.value = 2400;
    M.send = c.createGain(); M.send.gain.value = 0.3;
    M.bus.connect(M.send); M.send.connect(M.delay); M.delay.connect(M.dfl); M.dfl.connect(M.fb); M.fb.connect(M.delay); M.dfl.connect(M.out);
    M.applyVolume();
    return true;
  };
  M.applyVolume = function () {
    if (!M.out) return;
    const v = A.muted ? 0 : (A.music == null ? 0.55 : A.music) * 0.42 * M.duck;
    M.out.gain.setTargetAtTime(v, A.ctx.currentTime, 0.4);
  };

  /** Change d'humeur (à la mesure suivante). opts : { seed, biome, scale, rank, outcome } */
  M.mood = function (name, opts = {}) {
    if (!M.init()) { M.pending = [name, opts]; return; }
    const key = name + ':' + (opts.seed || '') + ':' + (opts.biome || '') + ':' + (opts.rank || '') + ':' + (opts.outcome || '');
    if (M.key === key) return;
    M.key = key;
    const st = build(name, opts);
    if (!M.cur) { M.cur = st; M.start(); }
    else M.next = st;
    if (name !== 'expedition') { M.targetI = 0; M.targetBoss = 0; }
    if (name === 'collapse') M.progress = 0;
  };
  M.setIntensity = (v) => { M.targetI = Math.max(0, Math.min(1, v)); };
  M.setBoss = (on) => { M.targetBoss = on ? 1 : 0; };
  M.setProgress = (v) => { M.progress = Math.max(0, Math.min(1, v)); };
  M.setDuck = (on) => { M.duck = on ? 0.45 : 1; M.applyVolume(); };
  M.stop = function () { M.key = null; M.next = null; M.cur = null; if (M.timer) clearInterval(M.timer); M.timer = null; };

  M.start = function () {
    if (M.timer) return;
    M.nextTime = A.ctx.currentTime + 0.1;
    M.step = 0; M.bar = 0;
    M.timer = setInterval(tick, 50);
  };

  /** Coup de timbale et accord tenu : moments forts (fin d'expédition). */
  M.hit = function (strong = 1) {
    if (!M.init() || !M.cur) return;
    const t0 = A.ctx.currentTime + 0.02, st = M.cur;
    INST.kick(t0, 0.5 * strong);
    noiseHit(t0, 1.4 * strong, 0.08 * strong, 220, 'lowpass', 0.5);
    [0, 2, 4].forEach((d) => INST.pad(hz(noteOf(st, st.prog[M.bar % 4] + d, 0)), t0, 3.2, 0.12 * strong, st));
    INST.bell(hz(noteOf(st, st.prog[M.bar % 4] + 4, 2)), t0 + 0.05, 0.08 * strong);
  };

  function tick() {
    if (!A.ctx || !M.cur) return;
    if (A.ctx.state !== 'running') { M.nextTime = A.ctx.currentTime + 0.1; return; }
    // l'intensité suit sa cible sans à-coups
    M.intensity += (M.targetI - M.intensity) * 0.06;
    M.boss += (M.targetBoss - M.boss) * 0.05;
    const ahead = A.ctx.currentTime + 0.22;
    if (M.nextTime < A.ctx.currentTime - 0.5) M.nextTime = A.ctx.currentTime + 0.05; // l'onglet dormait
    while (M.nextTime < ahead) { schedule(M.nextTime); advance(); }
  }

  function stepDur() {
    const st = M.cur;
    let bpm = st.bpm * (1 + M.intensity * 0.18 + M.boss * 0.25);
    if (st.riser) bpm = 90 + M.progress * 60;
    return 60 / bpm / 4; // une double croche
  }
  function advance() {
    M.nextTime += stepDur();
    M.step++;
    if (M.step >= 16) {
      M.step = 0; M.bar++;
      if (M.next) { M.cur = M.next; M.next = null; M.bar = 0; }
    }
  }

  function schedule(t) {
    const st = M.cur;
    const s = M.step;
    const rng = st.rng;
    const I = M.intensity, Bo = M.boss;
    // niveaux des couches : humeur, intensité, gardien
    const L = M.level;
    const tgt = {
      pad: st.layers.pad * (1 - Bo * 0.3),
      bass: Math.min(1, st.layers.bass + I * 0.35 + Bo * 0.4),
      arp: Math.min(1, st.layers.arp + I * 0.3 + Bo * 0.2),
      bell: st.layers.bell * (1 - I * 0.5),
      perc: Math.min(1, st.layers.perc + I * 0.65 + Bo * 0.7),
    };
    for (const k in L) L[k] += (tgt[k] - L[k]) * 0.12;
    const chord = st.prog[M.bar % st.prog.length] - (Bo > 0.5 && M.bar % 2 ? 1 : 0);
    const barDur = stepDur() * 16;
    // nappe : l'accord tenu toute la mesure
    if (s === 0 && L.pad > 0.02) {
      [0, 2, 4].forEach((d, i) => INST.pad(hz(noteOf(st, chord + d, i === 0 ? 0 : 0)), t, barDur * 1.04, 0.075 * L.pad, st));
      if (st.riser) INST.riser(t, barDur, 0.03 + M.progress * 0.08);
    }
    // basse : tonique de l'accord, plus serrée quand ça s'agite
    const bassEvery = I + Bo > 0.6 ? 2 : I + Bo > 0.25 ? 4 : 8;
    if (L.bass > 0.03 && s % bassEvery === 0) INST.bass(hz(noteOf(st, chord, -1)), t, stepDur() * bassEvery * 0.95, 0.16 * L.bass);
    // arpège : notes de l'accord, en croches ou doubles croches
    const arpEvery = I + Bo > 0.55 ? 1 : 2;
    if (L.arp > 0.04 && s % arpEvery === 0 && rng.next() < 0.55 + L.arp * 0.4) {
      const k = (s / arpEvery) % 4;
      const deg = chord + [0, 2, 4, 7][k] + (rng.next() < 0.15 ? 2 : 0);
      INST.arp(hz(noteOf(st, deg, 1)), t, 0.055 * L.arp, st);
    }
    // cloches : un motif propre au monde, joué par bribes
    if (L.bell > 0.04 && s % 4 === 0 && rng.next() < 0.3 + L.bell * 0.25) {
      const m = st.motif[(M.bar * 4 + s / 4) % st.motif.length];
      INST.bell(hz(noteOf(st, chord + m, 2)), t, 0.045 * L.bell);
    }
    // percussions
    if (L.perc > 0.05) {
      if (s % 8 === 0) INST.kick(t, 0.22 * L.perc);
      if (s % 2 === 0 && L.perc > 0.3) INST.hat(t, 0.025 * L.perc);
      if (s % 8 === 4 && L.perc > 0.45) INST.rim(t, 0.06 * L.perc);
      if (L.perc > 0.75 && s % 16 === 14) INST.kick(t, 0.16 * L.perc);
    }
    // l'écho s'ouvre ou se ferme selon l'humeur
    if (s === 0 && M.send) M.send.gain.setTargetAtTime(st.echo, t, 1.2);
  }

  /** Tonique (Hz, octave grave) d'une expédition : le bourdon du monde s'accorde sur la musique. */
  M.rootHz = function (biome, scale) {
    const b = biomeMood(biome);
    return hz(b.root - (scale && scale !== 'region' ? 5 : 0) - 12);
  };
  // pour les tests : composition sans son
  M.MODES = MODES;
  M.compose = build;
  M.biomeMood = biomeMood;
})();
