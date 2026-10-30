// Hintergrundmusik (seit 9.4): ruhig und entspannt, im Browser erzeugt (keine Tondateien). Fünftonleitern
// mit leicht fernöstlichem Klang: weiche Flächen, gezupfte Töne (wie eine Zither), ab und zu eine Flöte, eine
// sanfte Trommel und viel Hall. Die Stimmung folgt der Gegend: Dorf und Lager warm und hell, Wiesen offen,
// Wald ruhig in Moll, Schnee mit Glöckchen, Wüste und Feuerberg mit Trommel, Moor und Dungeons dunkel.
// Geplant wird immer ein Stück voraus (Takt für Takt), das kostet kaum Rechenzeit.

const MIDI = (n) => 440 * Math.pow(2, (n - 69) / 12);

const MOODS = {
  dorf: { root: 50, scale: [0, 2, 4, 7, 9], bpm: 70, chords: [[[0, 4, 7], [-3, 0, 4], [5, 9, 12], [0, 4, 7]], [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [7, 11, 14]]],
    pad: 0.5, bright: 1500, pluck: 0.55, flute: 0.55, drum: 0.5, bells: 0 },
  feld: { root: 48, scale: [0, 2, 4, 7, 9], bpm: 74, chords: [[[0, 4, 7], [7, 11, 14], [-3, 0, 4], [5, 9, 12]], [[5, 9, 12], [0, 4, 7], [7, 11, 14], [0, 4, 7]]],
    pad: 0.5, bright: 1800, pluck: 0.6, flute: 0.4, drum: 0.45, bells: 0 },
  wald: { root: 45, scale: [0, 3, 5, 7, 10], bpm: 64, chords: [[[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]], [[0, 3, 7], [5, 8, 12], [3, 7, 10], [0, 3, 7]]],
    pad: 0.55, bright: 1100, pluck: 0.45, flute: 0.35, drum: 0.3, bells: 0 },
  kalt: { root: 52, scale: [0, 2, 3, 7, 10], bpm: 58, chords: [[[0, 3, 7], [3, 7, 10], [-4, 0, 3], [-2, 2, 5]]],
    pad: 0.6, bright: 1300, pluck: 0.3, flute: 0.25, drum: 0.15, bells: 0.6 },
  heiss: { root: 50, scale: [0, 1, 5, 7, 8], bpm: 78, chords: [[[0, 5, 7], [1, 5, 8], [0, 5, 7], [-2, 1, 5]]],
    pad: 0.45, bright: 1200, pluck: 0.55, flute: 0.3, drum: 0.8, bells: 0 },
  dunkel: { root: 43, scale: [0, 2, 3, 7, 8], bpm: 54, chords: [[[0, 3, 7], [-4, 0, 3], [0, 3, 7], [1, 5, 8]]],
    pad: 0.65, bright: 750, pluck: 0.22, flute: 0, drum: 0.35, bells: 0.15 }
};

const music = {
  timer: null,
  nextBar: 0,
  bar: 0,
  prog: 0,
  key: '',
  mel: 0,

  // Start nach der ersten Berührung (Browser verlangen das)
  start() {
    if (this.timer) return;
    const c = sfx.graph();
    if (!c) return;
    this.send = c.createGain();
    this.send.gain.value = 0.6;
    sfx.music.connect(this.send);
    this.send.connect(sfx.verb);
    this.nextBar = c.currentTime + 0.4;
    this.timer = setInterval(() => this.tick(), 200);
  },

  mood() {
    const p = game.player;
    if (!p || !game.running || !game.world) return 'dorf';
    const z = zoneAt(p.x, p.y);
    if (z.dungeon) return 'dunkel';
    if (z.safe) return 'dorf';
    const g = z.ground;
    if (g === 'SNOW' || g === 'ICE' || z.liquid === 'ICE') return 'kalt';
    if (g === 'SAND' || g === 'BASALT' || z.liquid === 'LAVA') return 'heiss';
    if (g === 'ASH' || g === 'SWAMP' || z.liquid === 'BOG') return 'dunkel';
    if (g === 'FOREST') return 'wald';
    return 'feld';
  },

  tick() {
    const c = sfx.ctx;
    if (!c || c.state !== 'running') return;
    // Musik aus: Zeit läuft weiter, es wird nur nichts geplant
    if (opts.music === false || !(opts.musicVol > 0) || document.hidden) {
      this.nextBar = Math.max(this.nextBar, c.currentTime + 0.3);
      return;
    }
    while (this.nextBar < c.currentTime + 1.2) {
      const k = this.mood();
      if (k !== this.key) {
        this.key = k;
        this.bar = 0;
      }
      const M = MOODS[k];
      if (this.bar % 8 === 0) this.prog = Math.floor(Math.random() * M.chords.length);
      this.scheduleBar(M, this.nextBar);
      this.nextBar += (60 / M.bpm) * 4;
      this.bar++;
    }
  },

  scheduleBar(M, t) {
    const beat = 60 / M.bpm;
    const bar = beat * 4;
    const chord = M.chords[this.prog][this.bar % 4];
    const root = M.root;
    // Fläche: Akkord über den ganzen Takt, weich überblendet
    for (const n of chord) this.pad(MIDI(root + n), t, bar + 1.4, M);
    // Bass: Grundton auf 1, Quinte auf 3
    this.bass(MIDI(root - 12 + chord[0]), t, beat * 1.6);
    if (Math.random() < 0.7) this.bass(MIDI(root - 12 + chord[0] + 7), t + beat * 2, beat * 1.4, 0.7);
    // Zupfen: Achtel mit Pausen, Töne aus Akkord und Tonleiter, oft eine Oktave höher
    const pool = chord.map((n) => root + 12 + n).concat(M.scale.map((n) => root + 24 + n));
    for (let i = 0; i < 8; i++) {
      if (Math.random() > M.pluck * (i % 2 ? 0.7 : 1)) continue;
      const n = pool[Math.floor(Math.random() * pool.length)];
      this.pluck(MIDI(n), t + i * beat * 0.5 + (Math.random() - 0.5) * 0.015, 0.2 + Math.random() * 0.08);
    }
    // Flöte: alle zwei Takte eine kurze Melodie (Schrittweise über die Tonleiter)
    if (this.bar % 2 === 0 && Math.random() < M.flute) {
      const len = 3 + Math.floor(Math.random() * 3);
      let tt = t + beat * (Math.random() < 0.5 ? 0 : 1);
      for (let i = 0; i < len; i++) {
        this.mel = Math.max(0, Math.min(9, this.mel + Math.floor(Math.random() * 3) - 1));
        const n = root + 24 + M.scale[this.mel % 5] + (this.mel >= 5 ? 12 : 0);
        const d = beat * (Math.random() < 0.6 ? 1 : 2);
        this.flute(MIDI(n), tt, d * 0.95);
        tt += d;
        if (tt > t + bar * 2 - beat) break;
      }
    }
    // Trommel: sanft auf 1 und kurz vor 3
    if (Math.random() < M.drum) {
      this.drum(t, 0.5);
      this.drum(t + beat * 2.5, 0.32);
      if (Math.random() < 0.5) this.drum(t + beat * 3, 0.25);
    }
    // Glöckchen (Schnee, Dungeon): einzelne hohe Töne mit viel Hall
    if (M.bells && Math.random() < M.bells) {
      for (let i = 0; i < 3; i++) this.bell(MIDI(root + 36 + M.scale[Math.floor(Math.random() * 5)]), t + Math.random() * bar, 0.09);
    }
  },

  // --- Instrumente (Echtzeit, wenige Knoten je Ton) ---
  pad(f, t, dur, M) {
    const c = sfx.ctx;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.06 * M.pad, t + 1.0);
    g.gain.setValueAtTime(0.06 * M.pad, t + dur - 1.2);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(M.bright * 0.6, t);
    lp.frequency.linearRampToValueAtTime(M.bright, t + dur * 0.5);
    lp.frequency.linearRampToValueAtTime(M.bright * 0.6, t + dur);
    lp.Q.value = 0.6;
    for (const det of [-7, 6]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
    lp.connect(g);
    g.connect(sfx.music);
  },

  bass(f, t, dur, k = 1) {
    const c = sfx.ctx;
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.2 * k, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    o.connect(lp);
    lp.connect(g);
    g.connect(sfx.music);
    o.start(t);
    o.stop(t + dur + 0.05);
  },

  // gezupft (FM): heller Anschlag, der schnell weicher wird – klingt nach Zither/Koto
  pluck(f, t, vol) {
    const c = sfx.ctx;
    const car = c.createOscillator();
    car.frequency.value = f;
    const mod = c.createOscillator();
    mod.frequency.value = f * 2;
    const mg = c.createGain();
    mg.gain.setValueAtTime(f * 2.2, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.35);
    mod.connect(mg);
    mg.connect(car.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 1.6);
    car.connect(g);
    g.connect(sfx.music);
    car.start(t);
    mod.start(t);
    car.stop(t + 1.7);
    mod.stop(t + 1.7);
  },

  // Flöte: Sinus mit etwas Atem und spätem Vibrato
  flute(f, t, dur) {
    const c = sfx.ctx;
    const o = c.createOscillator();
    o.frequency.value = f;
    const lfo = c.createOscillator();
    lfo.frequency.value = 5.2;
    const lg = c.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.5, dur * 0.6));
    lfo.connect(lg);
    lg.connect(o.frequency);
    const o2 = c.createOscillator();
    o2.frequency.value = f * 2;
    const g2 = c.createGain();
    g2.gain.value = 0.18;
    o2.connect(g2);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.1, t + 0.12);
    g.gain.setValueAtTime(0.1, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g2.connect(g);
    g.connect(sfx.music);
    for (const x of [o, o2, lfo]) {
      x.start(t);
      x.stop(t + dur + 0.05);
    }
  },

  drum(t, vol) {
    const c = sfx.ctx;
    const o = c.createOscillator();
    o.frequency.setValueAtTime(95, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.3);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.38 * vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0006, t + 0.45);
    o.connect(g);
    g.connect(sfx.music);
    o.start(t);
    o.stop(t + 0.5);
  },

  bell(f, t, vol) {
    const c = sfx.ctx;
    const car = c.createOscillator();
    car.frequency.value = f;
    const mod = c.createOscillator();
    mod.frequency.value = f * 3.5;
    const mg = c.createGain();
    mg.gain.setValueAtTime(f * 1.5, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.02, t + 1.2);
    mod.connect(mg);
    mg.connect(car.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0003, t + 2.2);
    car.connect(g);
    g.connect(sfx.music);
    car.start(t);
    mod.start(t);
    car.stop(t + 2.3);
    mod.stop(t + 2.3);
  }
};

// Ton und Musik starten mit der ersten Berührung bzw. Taste (iPhone und Browser verlangen das);
// im Hintergrund (andere App, Tab) pausiert alles und spart Akku
(function setupAudioStart() {
  const go = () => {
    if (!sfx.graph()) return;
    music.start();
    if (sfx.on) snd.warm();
    window.removeEventListener('pointerdown', go);
    window.removeEventListener('keydown', go);
  };
  window.addEventListener('pointerdown', go);
  window.addEventListener('keydown', go);
  document.addEventListener('visibilitychange', () => {
    if (!sfx.ctx) return;
    if (document.hidden) sfx.ctx.suspend();
    else sfx.ctx.resume();
  });
})();
