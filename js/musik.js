// Hintergrundmusik (seit 9.4): ruhig und entspannt, im Browser erzeugt. Seit 14.5 spielen je Stimmung Musikdateien
// (snd/musik, klang-dateien.js); diese erzeugte Musik ist der Rückfall, solange eine Datei lädt oder fehlt. Fünftonleitern
// mit leicht fernöstlichem Klang: weiche Flächen, gezupfte Töne (wie eine Zither), ab und zu eine Flöte, eine
// sanfte Trommel und viel Hall. Die Stimmung folgt der Gegend: Dorf und Lager warm und hell, Wiesen offen,
// Wald ruhig in Moll, Schnee mit Glöckchen, Wüste und Feuerberg mit Trommel, Moor und Dungeons dunkel.
// Geplant wird immer ein Stück voraus (Takt für Takt), das kostet kaum Rechenzeit.
// Seit 9.5: Steht ein lebender Boss in der Nähe (Boss-Raum, Weltboss), wird die Musik dramatisch:
// harmonisches Moll, schnellerer Puls, treibender Achtelbass, große Trommeln, Bläserstöße, ein Chor und
// alle vier Takte ein anschwellendes Rauschen. Ist der Boss besiegt, klingt ein kurzer Siegesakkord aus.
// Seit 14.40: in Prüfungs- und Turnierarena eigene, schnelle Kampfmusik (arenaBar, 160 BPM, unten).

const MIDI = (n) => 440 * Math.pow(2, (n - 69) / 12);
// Musikdateien (−19 LUFS) im Verhältnis zur erzeugten Musik: im Browser gemessen (Effektivwert am Musikausgang),
// mit 0,8 liegen die Dateien 1–3 dB unter der erzeugten Musik und bleiben unter den Klängen
const MUSIC_FILE_GAIN = 0.8;

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
    pad: 0.65, bright: 750, pluck: 0.22, flute: 0, drum: 0.35, bells: 0.15 },
  // Bosskampf: A-Moll harmonisch, 100 BPM; zweite Folge mit neapolitanischem Akkord (B-Dur) für mehr Spannung
  boss: { root: 45, scale: [0, 2, 3, 5, 7, 8, 11], bpm: 100, chords: [[[0, 3, 7], [-4, 0, 3], [5, 8, 12], [7, 11, 14]], [[0, 3, 7], [1, 5, 8], [-4, 0, 3], [7, 11, 14]], [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-1, 2, 5]]],
    pad: 0.8, bright: 1700, pluck: 0, flute: 0, drum: 0, bells: 0, boss: true }
};

const music = {
  timer: null,
  nextBar: 0,
  bar: 0,
  prog: 0,
  key: '',
  mel: 0,

  // Start nach der ersten Berührung (Browser verlangen das).
  // Seit 14.5 drei Wege zur Musiklautstärke (sfx.music): proc (erzeugte Musik, mit Hall; wird leise, sobald eine
  // Musikdatei läuft), fileBus (Musikdateien aus snd/musik, ohne zusätzlichen Hall) und fx (Bossschlag, Siegesakkord)
  start() {
    if (this.timer) return;
    const c = sfx.graph();
    if (!c) return;
    this.proc = c.createGain();
    this.proc.connect(sfx.music);
    this.send = c.createGain();
    this.send.gain.value = 0.6;
    this.proc.connect(this.send);
    this.send.connect(sfx.verb);
    this.fx = c.createGain();
    this.fx.connect(sfx.music);
    this.fx.connect(this.send);
    this.fileBus = c.createGain();
    this.fileBus.gain.value = MUSIC_FILE_GAIN;
    this.fileBus.connect(sfx.music);
    this.out = this.proc;
    this.nextBar = c.currentTime + 0.4;
    this.timer = setInterval(() => this.tick(), 200);
  },

  // erzeugte Musik ein- oder ausblenden (v 0…1, Dauer in s)
  procFade(v, dur) {
    const c = sfx.ctx;
    if (!c || !this.proc) return;
    const g = this.proc.gain;
    g.cancelScheduledValues(c.currentTime);
    g.setValueAtTime(g.value, c.currentTime);
    g.setTargetAtTime(v, c.currentTime, Math.max(0.05, dur / 3));
  },

  // Musik erlaubt (Option an, Lautstärke > 0, Spiel sichtbar)?
  allowed() {
    return opts.music !== false && opts.musicVol > 0 && !document.hidden;
  },

  // lebender Boss in Reichweite? (Boss-Räume und Weltbosse)
  bossNear(p, r) {
    for (const m of game.monsters) {
      if (m.dead || !m.type || !(m.type.boss || m.type.raid)) continue;
      if ((m.x - p.x) ** 2 + (m.y - p.y) ** 2 < r * r) {
        this.bossRef = m;
        return true;
      }
    }
    return false;
  },

  mood() {
    const p = game.player;
    if (!p || !game.running || !game.world) return 'dorf';
    // Boss: ab 650 px, bleibt bis 950 px (kein Hin und Her am Rand); stirbt er, endet es sofort
    const now = game.time;
    // seit 14.40: in der Arena eigene Kampfmusik (auch beim Wellenmeister, er macht sie nur intensiver)
    if (this.inArena(p)) return 'arena';
    if (this.bossNear(p, this.key === 'boss' ? 950 : 650)) {
      this.bossSeen = now;
      return 'boss';
    }
    if (this.key === 'boss' && this.bossRef && !this.bossRef.dead && now - (this.bossSeen || 0) < 4) return 'boss';
    return this.moodAt(p.x, p.y);
  },

  // Stimmung der Gegend an einem Ort (ohne Boss)
  moodAt(x, y) {
    const z = zoneAt(x, y);
    if (!z) return 'feld';
    if (z.dungeon) return 'dunkel';
    if (z.safe) return 'dorf';
    const g = z.ground;
    if (g === 'SNOW' || g === 'ICE' || g === 'KRISTALL' || z.liquid === 'ICE') return 'kalt';
    if (g === 'SAND' || g === 'BASALT' || z.liquid === 'LAVA') return 'heiss';
    if (g === 'ASH' || g === 'SWAMP' || z.liquid === 'BOG') return 'dunkel';
    if (g === 'FOREST') return 'wald';
    return 'feld';
  },

  tick() {
    const c = sfx.ctx;
    if (!c || c.state !== 'running') return;
    // Musik aus: Zeit läuft weiter, es wird nur nichts geplant (laufende Musikdatei blendet aus)
    if (!this.allowed()) {
      if (typeof musicFiles !== 'undefined') musicFiles.off();
      this.nextBar = Math.max(this.nextBar, c.currentTime + 0.3);
      return;
    }
    const files = typeof musicFiles !== 'undefined' ? musicFiles : null;
    // alle 5 s die Musik der Nachbargegenden vorab holen (nur die Bytes)
    if (files && c.currentTime - (this.preAt || -99) > 5) {
      this.preAt = c.currentTime;
      files.prefetch(game.player);
    }
    while (this.nextBar < c.currentTime + 1.2) {
      const k = this.mood();
      if (k !== this.key) {
        // Einstieg in den Bosskampf mit Schlag und Rauschen, Ende nach Sieg mit Siegesakkord (über fx, auch zur Datei)
        this.out = this.fx;
        if (k === 'boss') this.impact(this.nextBar, 1);
        else if (k === 'arena') this.arenaLv = -1; // Einstieg mit Schlag (arenaBar)
        else if (this.key === 'boss' && this.bossRef && this.bossRef.dead) this.victory(this.nextBar);
        this.out = this.proc;
        // Musikdatei der neuen Stimmung (Boss schnell, sonst weich überblendet)
        // seit 14.40 Arena: Musikdatei der Gegend in 1,5 s aus, erzeugte Arenamusik ein (und beim Verlassen zurück)
        if (files) files.want(k, k === 'boss' || this.key === 'boss' ? 0.9 : k === 'arena' || this.key === 'arena' ? 1.5 : 2.5);
        this.key = k;
        this.bar = 0;
      } else if (files && !files.playing(k)) files.want(k, 2.5);
      const M = MOODS[k];
      if (this.bar % 8 === 0) this.prog = Math.floor(Math.random() * M.chords.length);
      // läuft die Datei, plant die erzeugte Musik nichts (der Takt zählt aber weiter)
      if (!files || !files.playing(k)) this.scheduleBar(M, this.nextBar);
      this.nextBar += (60 / M.bpm) * 4;
      this.bar++;
    }
  },

  scheduleBar(M, t) {
    if (M.boss) return this.bossBar(M, t);
    if (M.arena) return this.arenaBar(M, t);
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

  // Bosskampf: ein Takt
  bossBar(M, t) {
    const beat = 60 / M.bpm;
    const bar = beat * 4;
    const i = this.bar % 4;
    const chord = M.chords[this.prog][i];
    const root = M.root;
    // Fläche, hell und breit, dazu eine Oktave tiefer
    for (const n of chord) this.pad(MIDI(root + 12 + n), t, bar + 0.8, M);
    this.pad(MIDI(root + chord[0]), t, bar + 0.8, M);
    // treibender Achtelbass (Ostinato): Grundton, Oktave, Quinte
    const pat = [0, 0, 12, 0, 0, 7, 12, 0];
    for (let k = 0; k < 8; k++) this.ost(MIDI(root - 12 + chord[0] + pat[k]), t + k * beat * 0.5, beat * 0.42, k % 4 === 0 ? 1 : 0.7);
    // große Trommeln: 1, 2-und, 3 und vor dem nächsten Takt; im vierten Takt ein Wirbel
    this.taiko(t, 1);
    this.taiko(t + beat * 1.5, 0.6);
    this.taiko(t + beat * 2, 0.85);
    if (i === 3) for (let k = 0; k < 6; k++) this.taiko(t + beat * 2.5 + k * beat * 0.25, 0.4 + k * 0.1, 1.15);
    else this.taiko(t + beat * 3.5, 0.5, 1.1);
    // Bläserstoß auf der Eins, im zweiten Takt zusätzlich auf der Drei
    this.brass(chord.map((n) => MIDI(root + 12 + n)), t, beat * 0.9, 1);
    if (i === 1) this.brass(chord.map((n) => MIDI(root + 12 + n)), t + beat * 2, beat * 0.6, 0.75);
    // Chor auf jedem zweiten Takt: oberster Akkordton
    if (i % 2 === 0) this.choir(MIDI(root + 24 + chord[2]), t, bar * 2 + 0.3);
    // in der zweiten Hälfte der Folge: schnelle Harfe (Sechzehntel-Arpeggio) für mehr Spannung
    if (this.bar % 8 >= 4) {
      const arp = [0, 1, 2, 1, 0, 1, 2, 1].map((k) => root + 24 + chord[k]);
      for (let k = 0; k < 16; k++) this.pluck(MIDI(arp[k % 8] + (k >= 8 ? 12 : 0)), t + k * beat * 0.25, 0.1);
    }
    // alle vier Takte: anschwellendes Rauschen in den nächsten Takt
    if (i === 3) this.swell(t + beat, bar - beat);
  },

  // Achtelbass: Sägezahn durch Tiefpass, kurzer Anschlag
  ost(f, t, dur, k) {
    const c = sfx.ctx;
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(260, t + dur);
    lp.Q.value = 2;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.13 * k, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(lp);
    lp.connect(g);
    g.connect(music.out);
    o.start(t);
    o.stop(t + dur + 0.05);
  },

  // große Trommel: tiefer Ton mit Fellschlag (Rauschen)
  taiko(t, vol, pitch = 1) {
    const c = sfx.ctx;
    const o = c.createOscillator();
    o.frequency.setValueAtTime(80 * pitch, t);
    o.frequency.exponentialRampToValueAtTime(40 * pitch, t + 0.35);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.55 * vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.6);
    o.connect(g);
    g.connect(music.out);
    o.start(t);
    o.stop(t + 0.65);
    const n = c.createBufferSource();
    n.buffer = this.noise(c);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 260 * pitch;
    bp.Q.value = 0.9;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.linearRampToValueAtTime(0.35 * vol, t + 0.003);
    ng.gain.exponentialRampToValueAtTime(0.0008, t + 0.14);
    n.connect(bp);
    bp.connect(ng);
    ng.connect(music.out);
    n.start(t, Math.random());
    n.stop(t + 0.16);
  },

  // Bläserstoß: Akkord aus Sägezähnen, der Filter öffnet und schließt schnell (Horn/Posaune)
  brass(fs, t, dur, vol) {
    const c = sfx.ctx;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(300, t);
    lp.frequency.linearRampToValueAtTime(2400, t + 0.05);
    lp.frequency.exponentialRampToValueAtTime(500, t + dur);
    lp.Q.value = 1.2;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.07 * vol, t + 0.03);
    g.gain.setValueAtTime(0.06 * vol, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur + 0.15);
    for (const f of fs) {
      for (const det of [-9, 8]) {
        const o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = det;
        o.connect(lp);
        o.start(t);
        o.stop(t + dur + 0.2);
      }
    }
    lp.connect(g);
    g.connect(music.out);
  },

  // Chor „Aah“: zwei verstimmte Sägezähne durch drei Formantfilter, langsames Vibrato
  choir(f, t, dur) {
    const c = sfx.ctx;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.11, t + 0.8);
    g.gain.setValueAtTime(0.11, t + dur - 0.9);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const lfo = c.createOscillator();
    lfo.frequency.value = 5;
    const lg = c.createGain();
    lg.gain.value = f * 0.008;
    lfo.connect(lg);
    const mix = c.createGain();
    for (const det of [-12, 0, 11]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = det;
      lg.connect(o.frequency);
      o.connect(mix);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
    for (const [ff, q, a] of [[750, 6, 1], [1150, 7, 0.55], [2700, 9, 0.25]]) {
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = ff;
      bp.Q.value = q;
      const fg = c.createGain();
      fg.gain.value = a;
      mix.connect(bp);
      bp.connect(fg);
      fg.connect(g);
    }
    g.connect(music.out);
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
  },

  // anschwellendes Rauschen (Filter öffnet sich), endet mit dem nächsten Takt
  swell(t, dur) {
    const c = sfx.ctx;
    const n = c.createBufferSource();
    n.buffer = this.noise(c);
    n.loop = true;
    const hp = c.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.setValueAtTime(400, t);
    hp.frequency.exponentialRampToValueAtTime(5000, t + dur);
    hp.Q.value = 0.8;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + dur);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.06);
    n.connect(hp);
    hp.connect(g);
    g.connect(music.out);
    n.start(t);
    n.stop(t + dur + 0.1);
  },

  // Einstieg in den Bosskampf: tiefer Schlag mit Becken
  impact(t, vol) {
    this.taiko(t, vol * 1.2, 0.8);
    this.taiko(t + 0.01, vol, 1.3);
    const c = sfx.ctx;
    const n = c.createBufferSource();
    n.buffer = this.noise(c);
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3500;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.1 * vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 1.8);
    n.connect(hp);
    hp.connect(g);
    g.connect(music.out);
    n.start(t);
    n.stop(t + 1.9);
  },

  // Boss besiegt: A-Dur-Akkord (statt Moll) mit aufsteigenden Glocken
  victory(t) {
    const M = { pad: 0.9, bright: 1600 };
    for (const n of [45, 52, 57, 61, 64]) this.pad(MIDI(n), t, 4.5, M);
    [69, 73, 76, 81].forEach((n, k) => this.bell(MIDI(n + 12), t + k * 0.16, 0.12));
    this.taiko(t, 0.8);
  },

  noise(c) {
    if (!this.noiseBuf || this.noiseBuf.sampleRate !== c.sampleRate) {
      const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = b;
    }
    return this.noiseBuf;
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
    g.connect(music.out);
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
    g.connect(music.out);
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
    g.connect(music.out);
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
    g.connect(music.out);
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
    g.connect(music.out);
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
    g.connect(music.out);
    car.start(t);
    mod.start(t);
    car.stop(t + 2.3);
    mod.stop(t + 2.3);
  }
};

// --- Arenamusik (seit 14.40) ---------------------------------------------------------------------------------------
// Nur in der Prüfungsarena (herausforderung.js) und der Turnierarena (turnierarena.js): eigene, hektische Kampfmusik,
// hier im Browser erzeugt (keine Datei, keine fremde Melodie). D-Moll mit harmonischem Moll (A-Dur als Dominante) und
// neapolitanischem Es-Dur, 160 BPM: treibender Sechzehntelbass als Ostinato, Bassdrum auf jedem Schlag, Snare auf 2
// und 4, Hi-Hats, synkopierte Bläser-Stöße, im zweiten Teil jeder Folge ein hohes Sechzehntel-Arpeggio, alle vier Takte
// Snare-Wirbel und Rauschen in den nächsten Takt. Drei Stufen: 0 Pause/Warten (ohne Schlagzeug-Wucht), 1 Kampf,
// 2 Bosswelle (jede 5. Welle: große Trommeln, Chor, doppelte Hats, Bläser auf jeder Synkope).
Object.assign(MOODS, {
  arena: { root: 50, scale: [0, 2, 3, 5, 7, 8, 11], bpm: 160, arena: true, pad: 0.45, bright: 1500, pluck: 0, flute: 0, drum: 0, bells: 0,
    chords: [[[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]], [[0, 3, 7], [1, 5, 8], [0, 3, 7], [-5, -1, 2]], [[0, 3, 7], [-7, -4, 0], [-4, 0, 3], [-5, -1, 2]]] }
});
Object.assign(music, {
  // Stufe der Arenamusik aus dem Lauf: 0 Pause/Warten, 1 Kampf, 2 Bosswelle (Turnierarena: immer Kampf)
  arenaLevel() {
    const run = game.arenaRun;
    if (!run || run.slot < 0) return 1;
    if (run.phase !== 'fight') return 0;
    return run.wave % 5 === 0 ? 2 : 1;
  },
  // in der eigenen Halle der Prüfungsarena oder in einer Halle der Turnierarena?
  inArena(p) {
    const run = game.arenaRun;
    if (run && run.slot >= 0 && typeof arenaSlotAt === 'function' && arenaSlotAt(p.x, p.y) === run.slot) return true;
    return typeof pvpInside === 'function' && pvpInside(p);
  },
  arenaBar(M, t) {
    const beat = 60 / M.bpm;
    const s16 = beat / 4;
    const i = this.bar % 4;
    const chord = M.chords[this.prog][i];
    const root = M.root;
    const lv = this.arenaLevel();
    // eine Stufe höher: Einstieg mit Schlag (Welle beginnt, Bosswelle)
    if (lv > (this.arenaLv ?? lv)) this.impact(t, lv === 2 ? 1 : 0.55);
    this.arenaLv = lv;
    // Fläche, leise und dunkel (hält die Harmonie, lässt Platz für den Bass)
    for (const n of chord) this.pad(MIDI(root + n), t, beat * 4 + 0.3, M);
    // Ostinato: Sechzehntelbass (Grundton, Oktave, Quinte, kleine Terz), in der Pause nur Achtel
    const pat = [0, 0, 12, 0, 0, 12, 0, 7, 0, 0, 12, 0, 3, 0, 7, 12];
    for (let k = 0; k < 16; k++) {
      if (lv === 0 && k % 2) continue;
      this.ost(MIDI(root - 12 + chord[0] + pat[k]), t + k * s16, s16 * (lv === 0 ? 1.7 : 0.9), (k % 4 === 0 ? 1 : 0.62) * (lv === 0 ? 0.7 : 1));
    }
    // Schlagzeug
    for (let b = 0; b < 4; b++) {
      if (lv > 0) this.kick(t + b * beat, b === 0 ? 1 : 0.85);
      if (lv > 0 && (b === 1 || b === 3) && !(i === 3 && b === 3)) this.snare(t + b * beat, 0.8);
      // Hi-Hats: Achtel (betont auf „und“), in der Bosswelle Sechzehntel
      for (let h = 0; h < (lv === 2 ? 4 : 2); h++) {
        const off = h * (lv === 2 ? s16 : beat / 2);
        this.hat(t + b * beat + off, (lv === 2 ? h % 2 : h) ? 0.9 : 0.5, false);
      }
    }
    if (lv > 0) {
      // Synkope vor dem nächsten Takt
      this.kick(t + beat * 3 + s16 * 2, 0.6);
      // vierter Takt: Snare-Wirbel in den nächsten Takt (Sechzehntel, lauter werdend)
      if (i === 3) for (let k = 0; k < 6; k++) this.snare(t + beat * 2.5 + k * s16, 0.35 + k * 0.11);
      // offene Hi-Hat am Ende jedes zweiten Takts
      if (i % 2 === 1) this.hat(t + beat * 3.5, 0.8, true);
      // Bläser-Stöße auf Synkopen (1, „2-e“, „3-und“), im Boss auf jeder; zweiter und vierter Takt antworten
      const hits = lv === 2 ? [0, 3, 6, 10, 13] : i % 2 ? [0, 6, 10] : [0, 3, 10];
      const fs = chord.map((n) => MIDI(root + 12 + n));
      for (const h of hits) this.brass(fs, t + h * s16, s16 * 1.6, h === 0 ? 0.9 : 0.6);
    }
    // Spannung: in der zweiten Hälfte der Folge (und immer in der Bosswelle) ein hohes Sechzehntel-Arpeggio
    if (lv > 0 && (this.bar % 8 >= 4 || lv === 2)) {
      const arp = [0, 1, 2, 1, 2, 0, 1, 2].map((k) => root + 24 + chord[k]);
      for (let k = 0; k < 16; k++) this.pluck(MIDI(arp[k % 8] + (k >= 8 && i % 2 ? 12 : 0)), t + k * s16, 0.075);
    }
    // Bosswelle: große Trommeln auf 1 und 3, Chor jeden zweiten Takt
    if (lv === 2) {
      this.taiko(t, 0.8);
      this.taiko(t + beat * 2, 0.6);
      if (i % 2 === 0) this.choir(MIDI(root + 12 + chord[2]), t, beat * 8 + 0.2);
    }
    // alle vier Takte: anschwellendes Rauschen in den nächsten Takt (in der Pause leiser)
    if (i === 3) this.swell(t + beat * (lv ? 1 : 2), beat * (lv ? 3 : 2));
  },
  // Bassdrum: kurzer Sinus, der schnell nach unten fällt, mit Klick
  kick(t, vol) {
    const c = sfx.ctx;
    const o = c.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.11);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.42 * vol, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.28);
    o.connect(g);
    g.connect(music.out);
    o.start(t);
    o.stop(t + 0.3);
  },
  // Snare: Rauschen durch Bandpass plus kurzer Ton
  snare(t, vol) {
    const c = sfx.ctx;
    const n = c.createBufferSource();
    n.buffer = this.noise(c);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2200;
    bp.Q.value = 0.7;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.2 * vol, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.16);
    n.connect(bp);
    bp.connect(g);
    g.connect(music.out);
    n.start(t, Math.random());
    n.stop(t + 0.18);
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(230, t);
    o.frequency.exponentialRampToValueAtTime(160, t + 0.06);
    const og = c.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.linearRampToValueAtTime(0.12 * vol, t + 0.002);
    og.gain.exponentialRampToValueAtTime(0.0008, t + 0.09);
    o.connect(og);
    og.connect(music.out);
    o.start(t);
    o.stop(t + 0.1);
  },
  // Hi-Hat: helles Rauschen (Hochpass), geschlossen kurz, offen länger
  hat(t, vol, open) {
    const c = sfx.ctx;
    const n = c.createBufferSource();
    n.buffer = this.noise(c);
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = c.createGain();
    const len = open ? 0.22 : 0.04;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.055 * vol, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0006, t + len);
    n.connect(hp);
    hp.connect(g);
    g.connect(music.out);
    n.start(t, Math.random());
    n.stop(t + len + 0.02);
  }
});

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
