// Lieder (seit 9.8): Statt zufälliger Töne spielt jede Gegend ein eigenes, komponiertes Stück mit Melodie,
// Strophe und Refrain – im Stil fernöstlicher Volksmusik, wie man sie aus asiatischen Fantasy-MMOs kennt
// (Bambusflöte oder Erhu singen die Melodie, eine Guzheng zupft Akkordbögen, darunter weiche Streicher, Bass
// und eine leise Trommel). Alle Melodien sind eigene Kompositionen.
//
// Schreibweise: Melodie als [Stufe, Schläge]; die Stufe zählt in der Tonleiter des Liedes ab dem Grundton der
// Melodie (0 = Grundton, 5 = Oktave, negative Stufen darunter, null = Pause). Akkorde je Takt in Halbtönen über
// dem Grundton des Liedes. Form: Folge von Teilen (A, B …); jeder Teil sind 4 oder 8 Takte zu 4 Schlägen.

const SONGS = {
  // Dorf und Städte: warm, heiter, Bambusflöte; Refrain auf der Erhu
  dorf: {
    root: 62, scale: [0, 2, 4, 7, 9], bpm: 76, lead: { A: 'dizi', A2: 'dizi', B: 'erhu' }, drum: 'dorf', zheng: 0.09,
    parts: {
      A: { chords: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]],
        mel: [[3, 1.5], [4, 0.5], [5, 1], [4, 1], [3, 2], [2, 1], [1, 1], [0, 1], [1, 0.5], [2, 0.5], [3, 1], [4, 1], [3, 3], [null, 1]] },
      A2: { chords: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [0, 4, 7]],
        mel: [[3, 1.5], [4, 0.5], [5, 1], [6, 1], [7, 2], [6, 1], [5, 1], [4, 1], [3, 1], [2, 1], [1, 1], [0, 3], [null, 1]] },
      B: { chords: [[-7, -3, 0], [-5, -1, 2], [-3, 0, 4], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2], [-7, -3, 0], [-5, -1, 2]],
        mel: [[4, 1], [5, 1], [6, 2], [6, 1], [7, 0.5], [6, 0.5], [5, 2], [4, 1.5], [3, 0.5], [4, 1], [5, 1], [3, 4],
          [4, 1], [5, 1], [6, 1], [7, 1], [8, 2], [7, 1], [6, 1], [5, 1], [4, 1], [3, 1], [4, 1], [3, 2], [1, 1], [2, 1]] }
    },
    form: ['I', 'A', 'A2', 'B', 'A2']
  },
  // Wiesen und offene Gebiete: leicht und hell, schneller, Flöte
  feld: {
    root: 67, scale: [0, 2, 4, 7, 9], bpm: 84, lead: { A: 'dizi', B: 'dizi' }, drum: 'feld', zheng: 0.085,
    parts: {
      A: { chords: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2], [0, 4, 7], [-3, 0, 4], [-7, -3, 0], [0, 4, 7]],
        mel: [[2, 1], [3, 1], [4, 1], [3, 1], [2, 1.5], [1, 0.5], [0, 2], [1, 1], [2, 1], [3, 1], [5, 1], [4, 3], [null, 1],
          [5, 1], [4, 0.5], [3, 0.5], [2, 1], [3, 1], [4, 2], [2, 2], [1, 1], [2, 0.5], [1, 0.5], [0, 1], [-1, 1], [0, 3], [null, 1]] },
      B: { chords: [[-7, -3, 0], [-5, -1, 2], [-3, 0, 4], [-5, -1, 2], [-7, -3, 0], [-5, -1, 2], [-7, -3, 0], [-5, -1, 2]],
        mel: [[5, 1.5], [6, 0.5], [7, 2], [6, 1], [5, 1], [4, 2], [4, 1], [5, 1], [4, 1], [3, 1], [2, 3], [null, 1],
          [3, 1], [4, 1], [5, 1], [6, 1], [7, 2], [6, 1], [5, 1], [4, 1], [3, 1], [2, 1], [1, 1], [1, 2], [2, 1], [3, 1]] }
    },
    form: ['I', 'A', 'B', 'A']
  },
  // Wald: ruhig und etwas wehmütig, Moll, Erhu
  wald: {
    root: 57, scale: [0, 3, 5, 7, 10], bpm: 68, lead: { A: 'erhu', B: 'dizi' }, drum: null, zheng: 0.08,
    parts: {
      A: { chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [0, 3, 7], [0, 3, 7], [-4, 0, 3], [-2, 2, 5], [0, 3, 7]],
        mel: [[5, 2], [6, 1], [7, 1], [8, 3], [7, 1], [9, 1.5], [8, 0.5], [7, 1], [6, 1], [7, 3], [null, 1],
          [5, 1], [6, 1], [7, 1], [9, 1], [10, 2], [9, 1], [8, 1], [7, 1], [8, 0.5], [7, 0.5], [6, 1], [4, 1], [5, 4]] },
      B: { chords: [[-4, 0, 3], [-2, 2, 5], [-5, -2, 2], [0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2], [0, 3, 7]],
        mel: [[10, 2], [11, 2], [12, 1.5], [11, 0.5], [10, 2], [9, 1], [10, 1], [9, 1], [7, 1], [8, 4],
          [10, 1], [9, 1], [8, 1], [7, 1], [6, 2], [7, 2], [8, 2], [9, 1], [8, 1], [5, 4]] }
    },
    form: ['I', 'A', 'B', 'A']
  },
  // Moor, Ödland, Dungeons: dunkel und spärlich, tiefe Flöte (Xiao) über einem Bordun
  dunkel: {
    root: 55, scale: [0, 3, 5, 7, 10], bpm: 56, lead: { A: 'xiao', A2: 'erhu' }, drum: 'dunkel', zheng: 0.06,
    parts: {
      A: { chords: [[0, 7, 15], [0, 7, 15], [-4, 3, 8], [-5, 2, 7], [0, 7, 15], [-7, 0, 3], [-4, 3, 8], [-5, 2, 7]],
        mel: [[5, 3], [6, 1], [7, 2], [6, 2], [5, 2], [4, 2], [3, 4], [5, 2], [7, 1], [8, 1], [9, 3], [8, 1], [7, 2], [6, 1], [5, 1], [3, 4]] },
      A2: { chords: [[0, 7, 15], [0, 7, 15], [-4, 3, 8], [-5, 2, 7], [0, 7, 15], [-7, 0, 3], [-4, 3, 8], [-5, 2, 7]],
        mel: [[10, 3], [11, 1], [12, 2], [11, 2], [10, 2], [9, 2], [8, 4], [10, 2], [12, 1], [13, 1], [14, 3], [13, 1], [12, 2], [11, 1], [10, 1], [8, 4]] }
    },
    form: ['I', 'A', 'A2']
  }
};
// Schnee und Eis: Waldlied in E-Moll, langsamer, mit Glöckchen; Wüste und Feuerberg: Wiesenlied in fremder
// Tonleiter (kleine Sekunde) mit Handtrommeln
SONGS.kalt = { ...SONGS.wald, root: 64, bpm: 58, lead: { A: 'dizi', B: 'xiao' }, bells: true, zheng: 0.07 };
SONGS.heiss = { ...SONGS.feld, root: 62, scale: [0, 1, 5, 7, 8], bpm: 80, lead: { A: 'erhu', B: 'dizi' }, drum: 'heiss', minorize: true };

// Lied in Takte zerlegen: je Takt Akkord und Melodietöne [Beginn in Schlägen, Stufe, Dauer]
function compileSong(S) {
  const bars = [];
  // Vorspiel: zwei Takte nur Guzheng und Fläche
  const intro = S.parts.A.chords.slice(0, 2);
  const parts = { ...S.parts, I: { chords: intro, mel: [[null, 8]] } };
  for (const name of S.form) {
    const P = parts[name];
    const nb = P.chords.length;
    const notes = Array.from({ length: nb }, () => []);
    let t = 0;
    for (const [deg, dur] of P.mel) {
      const b = Math.floor(t / 4);
      if (deg != null && b < nb) notes[b].push([t - b * 4, deg, dur]);
      t += dur;
    }
    for (let i = 0; i < nb; i++) {
      let ch = P.chords[i];
      // fremde Tonleiter: große Terzen werden klein (passt zur kleinen Sekunde)
      if (S.minorize) ch = ch.map((n) => (((n % 12) + 12) % 12 === 4 ? n - 1 : n));
      bars.push({ chord: ch, notes: notes[i], part: name, lead: (S.lead && S.lead[name]) || 'dizi' });
    }
  }
  return bars;
}
for (const [k, S] of Object.entries(SONGS)) {
  S.bars = compileSong(S);
  if (MOODS[k]) MOODS[k].bpm = S.bpm;
}
// Stufe → MIDI-Note
function songNote(S, deg) {
  const n = S.scale.length;
  const o = Math.floor(deg / n);
  return S.root + o * 12 + S.scale[((deg % n) + n) % n];
}

Object.assign(music, {
  // ein Takt eines Liedes
  songBar(S, t) {
    const beat = 60 / S.bpm;
    const bar = beat * 4;
    const B = S.bars[this.bar % S.bars.length];
    const root = S.root - 12;
    const ch = B.chord;
    // Streicherfläche (leise) und Bass
    for (const n of ch) this.pad(MIDI(root + n), t, bar + 1, { pad: 0.42, bright: 1300 });
    this.bass(MIDI(root - 12 + ch[0]), t, beat * 1.8, 0.85);
    this.bass(MIDI(root - 12 + ch[0] + 7), t + beat * 2, beat * 1.6, 0.6);
    // Guzheng: Akkordbogen in Achteln (auf und ab), am Taktende ein kleiner Lauf
    const tones = ch.map((n) => root + 12 + n).concat(ch.map((n) => root + 24 + n)).sort((a, b) => a - b);
    const pat = B.part === 'I' ? [0, 1, 2, 3, 4, 3, 2, 1] : [0, 2, 1, 3, 2, 4, 3, 5];
    for (let i = 0; i < 8; i++) {
      const n = tones[Math.min(tones.length - 1, pat[i])];
      this.zheng(n, t + i * beat * 0.5 + (Math.random() - 0.5) * 0.012, S.zheng * (i % 2 ? 0.75 : 1));
    }
    // Melodie
    for (const [at, deg, dur] of B.notes) this.lead(B.lead, MIDI(songNote(S, deg)), t + at * beat, dur * beat, deg);
    // Trommel
    if (S.drum === 'dorf') {
      this.drum(t, 0.45);
      this.wood(t + beat * 1.5, 0.5);
      this.drum(t + beat * 2, 0.3);
      this.wood(t + beat * 3.5, 0.4);
    } else if (S.drum === 'feld') {
      this.drum(t, 0.35);
      this.wood(t + beat, 0.3);
      this.wood(t + beat * 3, 0.3);
    } else if (S.drum === 'heiss') {
      this.drum(t, 0.55);
      this.drum(t + beat * 0.75, 0.3);
      this.drum(t + beat * 1.5, 0.4);
      this.drum(t + beat * 2.5, 0.35);
      this.wood(t + beat * 3, 0.35);
    } else if (S.drum === 'dunkel' && this.bar % 2 === 0) {
      this.drum(t, 0.6);
    }
    if (S.bells && Math.random() < 0.6) this.bell(MIDI(S.root + 24 + S.scale[Math.floor(Math.random() * 5)]), t + Math.random() * bar, 0.07);
  },

  // Melodieinstrument: dizi (Bambusflöte), erhu (gestrichen), xiao (tiefe, hauchige Flöte)
  lead(kind, f, t, dur, deg) {
    if (kind === 'erhu') return this.erhu(f, t, dur);
    return this.dizi(f, t, dur, kind === 'xiao');
  },

  // Bambusflöte: Grundton mit Obertönen, Atemgeräusch, Vorschlag von oben bei längeren Tönen, spätes Vibrato
  dizi(f, t, dur, xiao) {
    const c = sfx.ctx;
    const vol = xiao ? 0.09 : 0.075;
    const o = c.createOscillator();
    o.frequency.setValueAtTime(f, t);
    // Vorschlag (kurzer Ton eine Stufe höher) – typische Verzierung
    if (!xiao && dur > 0.6 && Math.random() < 0.4) {
      o.frequency.setValueAtTime(f * 1.12, t);
      o.frequency.setValueAtTime(f, t + 0.06);
    }
    const lfo = c.createOscillator();
    lfo.frequency.value = xiao ? 4.5 : 5.4;
    const lg = c.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.setValueAtTime(0, t + Math.min(0.35, dur * 0.4));
    lg.gain.linearRampToValueAtTime(f * (xiao ? 0.01 : 0.014), t + Math.min(0.8, dur * 0.8));
    lfo.connect(lg);
    lg.connect(o.frequency);
    const o2 = c.createOscillator();
    o2.frequency.value = f * 2;
    lg.connect(o2.frequency);
    const g2 = c.createGain();
    g2.gain.value = xiao ? 0.08 : 0.22;
    o2.connect(g2);
    const g = c.createGain();
    const a = xiao ? 0.12 : 0.05;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.setValueAtTime(vol * 0.92, t + Math.max(a, dur - 0.12));
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05);
    o.connect(g);
    g2.connect(g);
    // Atem: Rauschen um den zweiten Oberton
    const n = c.createBufferSource();
    n.buffer = this.noise(c);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f * (xiao ? 1.5 : 2.5);
    bp.Q.value = 2;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.linearRampToValueAtTime(vol * (xiao ? 0.8 : 0.35), t + 0.03);
    ng.gain.linearRampToValueAtTime(vol * (xiao ? 0.35 : 0.08), t + 0.15);
    ng.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05);
    n.connect(bp);
    bp.connect(ng);
    ng.connect(sfx.music);
    g.connect(sfx.music);
    for (const x of [o, o2, lfo]) {
      x.start(t);
      x.stop(t + dur + 0.1);
    }
    n.start(t, Math.random());
    n.stop(t + dur + 0.1);
  },

  // Erhu: gestrichene Saite – Sägezahn durch Körperresonanzen, Gleiten in den Ton, ausdrucksvolles Vibrato
  erhu(f, t, dur) {
    const c = sfx.ctx;
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f * 0.94, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.09);
    const lfo = c.createOscillator();
    lfo.frequency.value = 5.8;
    const lg = c.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(f * 0.018, t + Math.min(0.6, dur * 0.6));
    lfo.connect(lg);
    lg.connect(o.frequency);
    const sum = c.createGain();
    for (const [ff, q, a] of [[800, 2.2, 1], [1500, 3, 0.6], [2900, 4, 0.25]]) {
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = ff;
      bp.Q.value = q;
      const bg = c.createGain();
      bg.gain.value = a;
      o.connect(bp);
      bp.connect(bg);
      bg.connect(sum);
    }
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3800;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.11, t + 0.09);
    g.gain.linearRampToValueAtTime(0.095, t + Math.max(0.1, dur * 0.5));
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.08);
    sum.connect(lp);
    lp.connect(g);
    g.connect(sfx.music);
    for (const x of [o, lfo]) {
      x.start(t);
      x.stop(t + dur + 0.12);
    }
  },

  // Guzheng: gezupfte Saite (Karplus-Strong), je Ton einmal berechnet und dann nur abgespielt
  zheng(midi, t, vol) {
    const c = sfx.ctx;
    const buf = this.zhengBuf(c, midi);
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(g);
    g.connect(sfx.music);
    src.start(t);
  },
  zhengBuf(c, midi) {
    if (!this.zhengCache || this.zhengCache.rate !== c.sampleRate) this.zhengCache = { rate: c.sampleRate, m: new Map() };
    const hit = this.zhengCache.m.get(midi);
    if (hit) return hit;
    const sr = c.sampleRate;
    const f = MIDI(midi);
    const len = Math.floor(sr * 2.2);
    const buf = c.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const N = Math.max(2, Math.round(sr / f));
    // Anschlag: Rauschen, leicht geglättet (weicher Finger statt harter Plektron)
    const line = new Float32Array(N);
    let prev = 0;
    for (let i = 0; i < N; i++) {
      prev = prev * 0.45 + (Math.random() * 2 - 1) * 0.55;
      line[i] = prev;
    }
    const loss = Math.pow(0.5, 1 / (f * 1.6));
    let idx = 0;
    let last = 0;
    for (let i = 0; i < len; i++) {
      const cur = line[idx];
      const nxt = line[(idx + 1) % N];
      const v = (cur + nxt) * 0.5 * loss;
      line[idx] = v;
      // leichter Hochpass gegen Gleichanteil, kurzer Anschlagsglanz
      d[i] = v - last * 0.995 + (i < sr * 0.004 ? (Math.random() * 2 - 1) * 0.15 * (1 - i / (sr * 0.004)) : 0);
      last = v;
      idx = (idx + 1) % N;
    }
    const fo = Math.floor(sr * 0.3);
    for (let i = 0; i < fo; i++) d[len - fo + i] *= 1 - i / fo;
    this.zhengCache.m.set(midi, buf);
    return buf;
  },

  // Holzblock
  wood(t, vol) {
    const c = sfx.ctx;
    const o = c.createOscillator();
    o.frequency.setValueAtTime(1150, t);
    o.frequency.exponentialRampToValueAtTime(900, t + 0.05);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.12 * vol, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.09);
    o.connect(g);
    g.connect(sfx.music);
    o.start(t);
    o.stop(t + 0.1);
  }
});

// Gegenden mit Lied spielen es Takt für Takt; der Bosskampf bleibt bei seinem eigenen Ablauf
const _musicBarOld = music.scheduleBar;
music.scheduleBar = function (M, t) {
  const S = SONGS[this.key];
  if (S && !M.boss) return this.songBar(S, t);
  return _musicBarOld.call(this, M, t);
};
