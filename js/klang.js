// Klänge, direkt im Browser erzeugt (Web Audio), keine Tondateien nötig.
// Auf dem iPhone darf Ton erst nach einer Berührung starten; das passiert hier beim ersten Klang,
// der immer durch einen Tipp (z. B. „Verbessern“) ausgelöst wird. Der Stummschalter des iPhones
// schaltet die Klänge ebenfalls stumm.

const SFX_KEY = 'seelenstein.ton';

const sfx = {
  ctx: null,
  master: null,
  on: (() => { try { return localStorage.getItem(SFX_KEY) !== 'aus'; } catch (e) { return true; } })(),

  toggle() {
    this.on = !this.on;
    try { localStorage.setItem(SFX_KEY, this.on ? 'an' : 'aus'); } catch (e) { /* privat */ }
    if (this.on) this.saved();
    return this.on;
  },

  // Audio-Graph (seit 9.4): Klänge (master) und Musik (music) laufen über einen gemeinsamen Hall (verb) und einen
  // Begrenzer, damit viele Klänge gleichzeitig nicht verzerren. Die Musik läuft auch, wenn die Klänge aus sind.
  graph() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      const c = (this.ctx = new AC());
      const lim = c.createDynamicsCompressor();
      lim.threshold.value = -10;
      lim.knee.value = 6;
      lim.ratio.value = 8;
      lim.attack.value = 0.004;
      lim.release.value = 0.2;
      lim.connect(c.destination);
      this.out = lim;
      this.master = c.createGain();
      this.music = c.createGain();
      this.master.connect(lim);
      this.music.connect(lim);
      // Hall: abklingendes Rauschen als Raumantwort (2,4 s, links und rechts leicht verschieden)
      this.verb = c.createConvolver();
      const len = Math.floor(c.sampleRate * 2.4);
      const ir = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * (i < 200 ? i / 200 : 1);
      }
      this.verb.buffer = ir;
      this.verbOut = c.createGain();
      this.verbOut.gain.value = 0.55;
      this.verb.connect(this.verbOut);
      this.verbOut.connect(lim);
      this.applyVolume();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  applyVolume() {
    if (!this.master) return;
    const v = typeof opts !== 'undefined' ? opts.volume : 0.7;
    this.master.gain.value = 0.8 * v;
    const mv = typeof opts !== 'undefined' ? (opts.music === false ? 0 : opts.musicVol ?? 0.5) : 0.5;
    this.music.gain.value = 1.2 * v * mv;
  },

  ac() {
    if (!this.on) return null;
    return this.graph();
  },

  // Einzelner Ton mit kurzem Anschlag und Ausklingen; slide: Zielfrequenz am Ende
  tone(freq, at, dur, type = 'sine', vol = 0.2, slide) {
    const c = this.ac();
    if (!c) return;
    const t = c.currentTime + at;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  },

  // Rauschen (Zischen, Splittern, Dröhnen) durch einen Filter
  noise(at, dur, vol, freq, type = 'highpass') {
    const c = this.ac();
    if (!c) return;
    const t = c.currentTime + at;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
  },

  // Hammer auf Amboss: heller Metallklang, jeder Schlag etwas höher
  clang(i = 0) {
    const k = 1 + i * 0.06;
    this.tone(1180 * k, 0, 0.45, 'triangle', 0.16);
    this.tone(1645 * k, 0, 0.3, 'square', 0.035);
    this.tone(2480 * k, 0, 0.22, 'sine', 0.06);
    this.noise(0, 0.06, 0.25, 2500);
    this.tone(140, 0, 0.12, 'sine', 0.18, 70);
  },

  // Spannung vor dem Ergebnis
  riser() {
    this.tone(220, 0, 0.5, 'sawtooth', 0.04, 880);
    this.tone(330, 0.05, 0.45, 'triangle', 0.05, 990);
  },

  // Erfolg: aufsteigender Dreiklang mit Glitzern
  success() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * 0.09, 0.5, 'triangle', 0.16));
    this.tone(1568, 0.36, 0.7, 'sine', 0.08);
    for (let i = 0; i < 6; i++) this.tone(2000 + Math.random() * 2400, 0.36 + i * 0.06, 0.25, 'sine', 0.04);
  },

  // Fehlschlag ohne Verlust: dumpfes „Womp womp“
  fail() {
    this.tone(330, 0, 0.32, 'triangle', 0.16, 300);
    this.tone(247, 0.28, 0.55, 'triangle', 0.16, 190);
    this.noise(0, 0.25, 0.12, 600, 'lowpass');
  },

  // Zerbrochen: Splittern, klirrende Scherben, tiefes Dröhnen
  shatter() {
    this.noise(0, 0.5, 0.5, 1800);
    this.noise(0, 0.35, 0.3, 400, 'lowpass');
    this.tone(90, 0, 0.7, 'sine', 0.3, 40);
    for (let i = 0; i < 9; i++) this.tone(2200 + Math.random() * 3200, 0.03 + i * 0.045, 0.18, 'sine', 0.05);
    this.tone(196, 0.45, 0.8, 'triangle', 0.08, 98);
  },

  // Segensschriftrolle hat geschützt: weiche Glocke
  saved() {
    this.tone(880, 0, 0.6, 'sine', 0.12);
    this.tone(1320, 0.08, 0.6, 'sine', 0.08);
  }
};
