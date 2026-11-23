// Klänge, direkt im Browser erzeugt (Web Audio); seit 14.8 kommen die meisten aus Dateien (klang-dateien.js).
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

  // Audio-Graph (seit 9.4): Klänge (master) laufen über einen gemeinsamen Hall (verb) und einen Begrenzer, damit viele
  // Klänge gleichzeitig nicht verzerren. Die Musik läuft auch, wenn die Klänge aus sind.
  // Musik hat einen eigenen, sanften Begrenzer (mlim) neben dem der Klänge: Vorher lief sie mit durch den schnellen
  // Begrenzer der Klänge (Verhältnis 8, 0,2 s), und jeder laute Treffer drückte die Musik für einen Moment um einige dB –
  // im Kampf pumpte und hackte sie dadurch im Takt der Schläge. mlim greift nur bei hoher Musiklautstärke an den
  // lautesten Stellen (ab −6 dBFS, 4:1), die Klänge ändern ihn nicht.
  graph() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      // Puffergröße: am Handy „playback“ (größerer Puffer, Klänge kommen ein paar Hundertstel später, dafür reißt der
      // Ton unter Last nicht ab – sonst hackt die Musik), am PC „balanced“. Ältere Browser kennen die Option nicht.
      let c;
      try {
        c = new AC({ latencyHint: typeof IS_PC !== 'undefined' && IS_PC ? 'balanced' : 'playback' });
      } catch (e) {
        c = new AC();
      }
      this.ctx = c;
      const lim = c.createDynamicsCompressor();
      lim.threshold.value = -10;
      lim.knee.value = 6;
      lim.ratio.value = 8;
      lim.attack.value = 0.004;
      lim.release.value = 0.2;
      lim.connect(c.destination);
      this.out = lim;
      const mlim = c.createDynamicsCompressor();
      mlim.threshold.value = -6;
      mlim.knee.value = 6;
      mlim.ratio.value = 4;
      mlim.attack.value = 0.01;
      mlim.release.value = 0.35;
      mlim.connect(c.destination);
      this.master = c.createGain();
      this.music = c.createGain();
      this.master.connect(lim);
      this.music.connect(mlim);
      // Hall: am PC abklingendes Rauschen als Raumantwort (Faltung, links und rechts leicht verschieden, 1,6 s).
      // Am Handy seit 15.71 ein leichter Hall aus zwei Echo-Schleifen (Verzögerung, Tiefpass, Rückkopplung): Die Faltung
      // läuft ständig, ihr langer Nachhall wird in einem Hintergrund-Faden gerechnet – unter Last (Bildaufbau) kam der am
      // iPhone nicht nach, und der ganze Ton stotterte.
      this.verbOut = c.createGain();
      this.verbOut.connect(lim);
      if (typeof IS_PC !== 'undefined' && IS_PC) {
        this.verb = c.createConvolver();
        const len = Math.floor(c.sampleRate * 1.6);
        const ir = c.createBuffer(2, len, c.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
          const d = ir.getChannelData(ch);
          for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * (i < 200 ? i / 200 : 1);
        }
        this.verb.buffer = ir;
        this.verb.connect(this.verbOut);
        this.verbOut.gain.value = 0.55;
      } else {
        this.verb = c.createGain();
        this.verbOut.gain.value = 0.42;
        for (const [dt, fb, lp] of [[0.047, 0.5, 2600], [0.071, 0.44, 2100]]) {
          const d = c.createDelay(0.2);
          d.delayTime.value = dt;
          const f = c.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.value = lp;
          const g = c.createGain();
          g.gain.value = fb;
          this.verb.connect(d);
          d.connect(f);
          f.connect(g);
          g.connect(d);
          f.connect(this.verbOut);
        }
      }
      this.applyVolume(true);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  // Lautstärke aus den Optionen; weich nachgeführt (30 ms), damit der Regler beim Ziehen nicht knackt
  applyVolume(sofort) {
    if (!this.master) return;
    const v = typeof opts !== 'undefined' ? opts.volume : 0.7;
    const mv = typeof opts !== 'undefined' ? (opts.music === false ? 0 : opts.musicVol ?? 0.5) : 0.5;
    const t = this.ctx.currentTime;
    for (const [g, val] of [[this.master.gain, 0.8 * v], [this.music.gain, 1.2 * v * mv]]) {
      g.cancelScheduledValues(t);
      if (sofort) {
        g.value = val;
        continue;
      }
      g.setValueAtTime(g.value, t);
      g.setTargetAtTime(val, t, 0.03);
    }
  },

  // Gleichmäßige Überblendung (gleiche Leistung) eines Lautstärke-Parameters: ab Zeit t in dur s von from (ohne
  // Angabe: der aktuelle Wert) nach to, ansteigend als Sinus-, fallend als Kosinusbogen (aus 12 geraden Stücken,
  // das können alle Browser gleich). Zwei gleichzeitige Blenden (alt fällt, neu steigt) halten so die Gesamtleistung
  // konstant – kein Loch und kein Buckel in der Mitte. Eine laufende Blende wird an der aktuellen Stelle übernommen.
  fade(param, t, dur, to, from) {
    const c = this.ctx;
    if (!c) return;
    const now = c.currentTime;
    const v0 = from == null ? param.value : from;
    if (param.cancelAndHoldAtTime && from == null) param.cancelAndHoldAtTime(now);
    else {
      // ohne cancelAndHoldAtTime (Firefox): ab jetzt den aktuellen Wert halten, sonst springt er auf den Anfang
      // des gerade abgebrochenen Stücks zurück
      param.cancelScheduledValues(now);
      param.setValueAtTime(v0, now);
    }
    param.setValueAtTime(v0, Math.max(now, t));
    const n = 12;
    for (let i = 1; i <= n; i++) {
      const x = (i / n) * (Math.PI / 2);
      const v = to >= v0 ? v0 + (to - v0) * Math.sin(x) : to + (v0 - to) * Math.cos(x);
      param.linearRampToValueAtTime(Math.max(0, v), Math.max(now, t) + (dur * i) / n);
    }
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
    // seit 14.8: echter Amboss (Datei), jeder Schlag etwas höher; ohne Datei der erzeugte Klang
    if (typeof sfxFiles !== 'undefined' && this.on && sfxFiles.play('amboss', { clip: i % 3, rate: 1 + i * 0.03, vary: 0.01, vol: 0.75, rev: 0.25 })) return;
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
    if (typeof sfxFiles !== 'undefined' && this.on && sfxFiles.play('schmied_erfolg', { vol: 0.85, vary: 0, rev: 0.3 })) return;
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
    if (typeof sfxFiles !== 'undefined' && this.on && sfxFiles.play('schmied_bruch', { vol: 0.9, vary: 0, rev: 0.3 })) return;
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
