// Klänge und Musik aus Dateien (seit 14.8): mit ElevenLabs erzeugte Aufnahmen. Liste, Prompts und Schnitt stehen
// in tools/klang-liste.json, gebaut mit tools/klang-erzeugen.py; die Lage der Laute in js/daten/klang-dateien.js.
//
// Soundeffekte (sfxFiles): je Klang eine kleine Datei snd/sfx/<id>.mp3 mit mehreren Varianten hintereinander. Gespielt
// wird ein Ausschnitt mit leicht zufälliger Höhe und Lautstärke (nie zweimal dieselbe Variante hintereinander) über
// snd.out (Ort, Entfernung, Hall, Begrenzer). Kampf, Fertigkeiten und Welt laden nach der ersten Berührung im
// Hintergrund, die Laute einer Monsterfamilie erst, wenn ein solches Monster in der Nähe ist. Dekodiert wird einmal
// beim Laden (32 kHz, spart Speicher), nie beim Treffer. Gruppen begrenzen gleichzeitige Stimmen (viele Monster
// matschen nicht).
//
// Musik (musicFiles): je Stimmung eine Datei snd/musik/<stimmung>.mp3 (Vorspiel, Schleife A–B, kurzer Nachlauf).
// Geladen wird nur die gerade gebrauchte Stimmung, die der Umgebung wird vorab geholt (nur die Bytes). Wechsel
// blenden gleichmäßig über (gleiche Leistung); die alte Datei spielt weiter, bis die neue dekodiert ist. Fehlt eine
// Datei (oder lädt sie nach kurzer Wartezeit noch), spielt die im Browser erzeugte Musik (musik.js) – nie beides.
// Die Schleifen liegen auf Taktgrenzen und sind in der Datei vorbereitet (tools/klang-erzeugen.py, docs/musik-prompts.md).
//
// Fehlt eine Datei oder lädt sie nicht (offline, ohne Speicher), bleibt alles beim erzeugten Klang – ohne Fehler.

const SFXF_RATE = 32000;
// Gruppe → [höchstens gleichzeitig, Mindestabstand in s]
const SFXF_GROUPS = { hit: [4, 0.025], hit2: [2, 0.05], imp: [4, 0.05], mob: [5, 0.06], swing: [3, 0.03], skill: [6, 0], welt: [3, 0] };

// AudioBuffer aus MP3-Bytes (alte Safari-Versionen kennen nur die Rückruf-Form)
function sndDecode(ctx, ab) {
  return new Promise((res, rej) => {
    try {
      const p = ctx.decodeAudioData(ab, res, rej);
      if (p && p.then) p.then(res, rej);
    } catch (e) {
      rej(e);
    }
  });
}

// Datei holen; 204 (vom Service Worker: offline und nicht gespeichert) gilt als fehlend. frisch: am Speicher des
// Browsers vorbei (nach einer veralteten Fassung)
function sndFetch(url, frisch) {
  if (!window.fetch) return Promise.reject(new Error('kein fetch'));
  return fetch(url, frisch ? { cache: 'reload' } : undefined)
    .then((r) => (r.ok && r.status !== 204 ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))));
}

const sfxFiles = {
  bufs: new Map(),
  state: new Map(),
  last: new Map(),
  grp: new Map(),

  has(id) {
    return typeof SFX_FILES !== 'undefined' && !!SFX_FILES[id];
  },
  ready(id) {
    return this.bufs.has(id);
  },

  decoder() {
    if (this.dec === undefined) {
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      try {
        this.dec = OAC ? new OAC(1, 1, SFXF_RATE) : null;
      } catch (e) {
        this.dec = null;
      }
    }
    return this.dec || sfx.ctx;
  },

  load(id) {
    if (!this.has(id) || this.state.has(id) || !sfx.ctx) return;
    this.state.set(id, 'laden');
    sndFetch('snd/sfx/' + id + '.mp3')
      .then((ab) => sndDecode(this.decoder(), ab))
      .then((buf) => {
        this.bufs.set(id, buf);
        this.state.set(id, 'ok');
      })
      .catch(() => {
        // nach einer Minute neu versuchen (z. B. wieder online)
        this.state.set(id, 'fehlt');
        setTimeout(() => this.state.delete(id), 60000);
      });
  },

  // Kampf, Fertigkeiten und Welt im Hintergrund laden (nacheinander, damit das Spiel nicht stockt)
  warm() {
    if (typeof SFX_FILES === 'undefined' || this.warmed) return;
    this.warmed = true;
    const ids = Object.keys(SFX_FILES).filter((id) => SFX_FILES[id].g !== 'monster');
    const next = () => {
      const id = ids.shift();
      if (!id) return;
      this.load(id);
      setTimeout(next, 60);
    };
    next();
  },

  // Laut abspielen. o: role (Ereignis), clip (feste Variante), x/y, vol, rate, vary (Höhenstreuung), rev,
  // fromPeak (so viele s vor dem lautesten Punkt beginnen), maxDur, grp (Gruppe), delay.
  // true: gespielt oder bewusst ausgelassen (Gruppe voll) – false: noch nicht geladen (dann erzeugter Klang)
  play(id, o = {}) {
    const buf = this.bufs.get(id);
    if (!buf) {
      this.load(id);
      return false;
    }
    if (!sfx.on || !sfx.ctx) return true;
    const F = SFX_FILES[id];
    const now = sfx.ctx.currentTime;
    const G = o.grp && SFXF_GROUPS[o.grp];
    let gs = null;
    if (G) {
      gs = this.grp.get(o.grp) || { n: 0, at: -9 };
      this.grp.set(o.grp, gs);
      if (gs.n >= G[0] || now - gs.at < G[1]) return true;
    }
    let list = o.clip != null ? [o.clip] : o.role && F.roles && F.roles[o.role] ? F.roles[o.role] : null;
    if (!list) list = F.clips.map((c, i) => i);
    let i = list[Math.floor(Math.random() * list.length)];
    if (list.length > 1 && i === this.last.get(id)) i = list[(list.indexOf(i) + 1) % list.length];
    this.last.set(id, i);
    const c = F.clips[i];
    if (!c) return false;
    let off = c[0];
    let dur = c[1];
    if (o.fromPeak != null && c[2] != null) {
      const skip = Math.max(0, c[2] - o.fromPeak);
      off += skip;
      dur -= skip;
    }
    let cut = false;
    if (o.maxDur && dur > o.maxDur) {
      dur = o.maxDur;
      cut = true;
    }
    const vary = o.vary == null ? 0.06 : o.vary;
    const rate = (o.rate || 1) * (1 + (Math.random() * 2 - 1) * vary);
    const vol = (o.vol == null ? 1 : o.vol) * (F.vol || 1) * (0.9 + Math.random() * 0.2);
    const src = snd.out(buf, { x: o.x, y: o.y, vol, rate, rev: o.rev, off, dur, cut, delay: o.delay });
    if (!src) return true;
    if (gs) {
      gs.n++;
      gs.at = now;
      src.addEventListener('ended', () => { gs.n = Math.max(0, gs.n - 1); });
    }
    return true;
  }
};

// --- Zuordnung: was klingt wann ---------------------------------------------------------------------------------
// Treffer des Grundangriffs je Waffe: [Datei, Höhe]
const HIT_FILE = {
  sword: ['hieb_schwert', 1], axe: ['hieb_axt', 1.05], greatsword: ['hieb_schwert', 0.84], greataxe: ['hieb_axt', 0.88],
  dagger: ['hieb_dolch', 1], scythe: ['hieb_schwert', 0.78], bow: ['pfeil_treffer', 1],
  staff: ['magie_treffer', 0.8], rod: ['magie_treffer', 1], fan: ['magie_treffer', 1.12], bell: ['magie_treffer', 1.25]
};
// Schwung ohne Treffer je Waffe: [Datei, Höhe]
const SWING_FILE = {
  sword: ['schwung_mittel', 1], axe: ['schwung_mittel', 0.88], greatsword: ['schwung_schwer', 1], greataxe: ['schwung_schwer', 0.92],
  dagger: ['schwung_leicht', 1], scythe: ['sense', 1]
};
// Einschlag einer Fertigkeit nach Element: [Datei, Lautstärke, Höhe, höchstens s]
const IMP_FILE = {
  klinge: ['hieb_schwert', 0.55, 1.06], erde: ['erde_einschlag', 0.5, 1.12, 0.9], feuer: ['feuer_explosion', 0.42, 1.15, 0.9],
  eis: ['eis_splitter', 0.6, 1], blitz: ['blitz_einschlag', 0.38, 1.25, 0.7], schatten: ['magie_treffer', 0.5, 0.7],
  seele: ['magie_treffer', 0.5, 0.85], licht: ['magie_treffer', 0.5, 1.25], wind: ['faecher', 0.45, 1.1],
  blut: ['blut', 0.5, 1.12, 0.6], knochen: ['treffer_knochen', 0.6, 1], wasser: ['wasser', 0.4, 1.3, 0.6]
};
// Stoff des Getroffenen (leise dazu): Knochen, Stein, Rüstung (Rüstung nur bei jedem zweiten Treffer)
const MAT_FILE = { undead: 'treffer_knochen', golem: 'treffer_stein', orc: 'treffer_ruestung', human: 'treffer_ruestung' };
// Monsterfamilie → [Datei Wut (Schrei, Angriff), Datei Weh (Schmerz, Tod), Höhe]; ohne Eintrag: Aufnahme bzw. erzeugt
const MOB_FILE = {
  wolf: ['wolf_wut', 'wolf_weh', 1], hellhound: ['wolf_wut', 'wolf_weh', 0.74], bear: ['baer_wut', 'baer_weh', 1],
  boar: ['keiler_wut', 'keiler_weh', 1], cat: ['katze_wut', 'katze_weh', 1], mammoth: ['riese_wut', 'riese_weh', 0.8],
  spider: ['spinne_wut', 'spinne_weh', 1], scorpion: ['skorpion', 'skorpion', 1], snake: ['schlange_wut', 'schlange_weh', 1],
  rattle: ['schlange_wut', 'schlange_weh', 1.08], naga: ['schlange_wut', 'schlange_weh', 0.84], human: ['mensch_wut', 'mensch_weh', 1],
  undead: ['untot_wut', 'untot_weh', 1], orc: ['ork_wut', 'ork_weh', 1], brute: ['riese_wut', 'riese_weh', 1],
  golem: ['golem_wut', 'golem_weh', 1], demon: ['daemon_wut', 'daemon_weh', 1], ghost: ['geist_wut', 'geist_weh', 1],
  dragon: ['drache_wut', 'drache_weh', 1]
};
// Fertigkeit → [Datei, Höhe, Lautstärke]; ohne Eintrag nach Element (EL_FILE)
// (Klingenkreuz: hier der Schwung des ersten Hiebs; zweiter Hieb, Stoß und Zerbersten kommen aus kkSnd, klingenkreuz.js)
const SKILL_FILE = {
  // Krieger
  klingenkreuz: ['schwung_mittel', 0.95], schwertwirbel: ['wirbel', 1], kampfrausch: ['feuer_wirken', 0.8], sprungschlag: ['sprung', 1],
  schwertaura: ['licht', 0.8], felsenfaust: ['erde_einschlag', 1], erdbeben: ['beben', 1], starkerkoerper: ['erde_wirken', 0.9],
  geistesschlag: ['licht', 1.1], kriegsschrei: ['feuer_wirken', 0.7],
  // Ninja
  hinterhalt: ['klinge', 1.2], tarnung: ['schatten', 1.1, 0.5], wirbelklinge: ['wirbel', 1.2], blitzangriff: ['blitz_wirken', 1.3],
  schattenkette: ['schatten', 1.25], falkenpfeil: ['bogen_schuss', 0.9], pfeilregen: ['pfeilregen', 1], durchschuss: ['bogen_schuss', 0.82],
  splitterfalke: ['bogen_schuss', 0.7], schattenwechsel: ['schatten', 1.35],
  // Schamane
  talisman: ['blitz_wirken', 1], drachengebruell: ['feuer_wirken', 0.9], drachenkraft: ['licht', 0.9], blitzschlag: ['eissturm', 1],
  donnersturm: ['donner', 1], geisterfaust: ['licht', 1.05], windfessel: ['wind', 1], segen: ['licht', 1], heilung: ['heilung', 1],
  schutzgeist: ['heilung', 0.9],
  // Nekromant
  blutsauger: ['blut', 1], seelenkaefig: ['seele', 1], totenbeschwoerung: ['beschwoerung', 1], totenruf: ['beschwoerung', 1.12],
  geisterflut: ['seele', 0.85], lebensentzug: ['blut', 0.9], knochenwurf: ['knochen', 1], blutlarve: ['blut', 1.1],
  totenhand: ['knochen', 0.85], blutlanzen: ['blut', 0.95], schaedelsalve: ['knochen', 1.05], seelenschnitter: ['sense', 0.9],
  knochenspeer: ['knochen', 0.95], knochenpanzer: ['knochen', 0.8], blutopfer: ['blut', 0.85], dunklemacht: ['schatten', 1],
  // Magier
  glutfeld: ['feuer_wirken', 0.95], feuerball: ['feuer_wirken', 1.05], brand: ['feuer_wirken', 1.12], phoenix: ['feuer_wirken', 0.85],
  feuertornado: ['feuer_wirken', 0.78], frostnova: ['eis_wirken', 0.9], eisstrahl: ['eis_wirken', 1.15, 0.5], eisschritt: ['eis_wirken', 1.2],
  eisgefaengnis: ['eis_wirken', 0.85], schneesturm: ['eissturm', 1], blitzspeer: ['blitz_wirken', 1.05], kettenblitz: ['blitz_wirken', 1.15],
  blitzschritt: ['blitz_wirken', 1.3], gewitter: ['donner', 1.05, 0.7], kugelblitz: ['blitz_wirken', 0.85], steinschlag: ['erde_wirken', 1.05],
  steingeschoss: ['erde_wirken', 1.15], erdspitzen: ['erde_wirken', 0.95], bergsturz: ['beben', 1], schwerkraft: ['beben', 0.8]
};
const EL_FILE = {
  klinge: 'klinge', erde: 'erde_wirken', feuer: 'feuer_wirken', schatten: 'schatten', seele: 'seele', blitz: 'blitz_wirken',
  eis: 'eis_wirken', frost: 'eis_wirken', wind: 'wind', licht: 'licht', blut: 'blut', knochen: 'knochen', wasser: 'wasser',
  donner: 'donner', beben: 'beben', eissturm: 'eissturm'
};
// Grundangriff der Zauberer (Magier nach Element): [Datei, Höhe, höchstens s]
const SHOT_FILE = {
  feuer: ['feuer_wirken', 1.35, 0.7], frost: ['eis_wirken', 1.3, 0.7], blitz: ['blitz_wirken', 1.3, 0.6], erde: ['erde_wirken', 1.3, 0.7],
  arkan: ['magie_schuss', 1, 0.8], fan: ['faecher', 1, 0.5], bell: ['glocke', 1, 0.9], staff: ['magie_schuss', 0.8, 0.8]
};
// Klänge aus PLAYER_SND, die eine Datei haben: [Datei, Lautstärke-Faktor]
const PLAYER_FILE = { levelup: ['stufe', 1.6], coin: ['gold', 1.3], item: ['beute', 1.1] };

// --- Musik aus Dateien ------------------------------------------------------------------------------------------
const musicFiles = {
  bytes: new Map(),
  bufs: new Map(),
  fail: new Set(),
  pos: new Map(),
  alt: new Map(),
  cur: null,

  has(k) {
    return typeof MUSIC_FILES !== 'undefined' && !!MUSIC_FILES[k] && !this.fail.has(k);
  },

  // nur die Bytes holen (Vorladen der Nachbargegenden). Die Größe muss zu MUSIC_FILES passen: Der Service Worker
  // liefert Musik zuerst aus seinem Speicher und holt eine neue Fassung erst im Hintergrund – nach einem Update käme
  // sonst einmal die alte Datei mit den neuen Schleifenpunkten (falsche Naht). Dann kurz warten und neu holen.
  fetch(k) {
    if (!this.has(k)) return null;
    let p = this.bytes.get(k);
    if (!p) {
      const M = MUSIC_FILES[k];
      const n = this.alt.get(k) || 0;
      p = sndFetch('snd/musik/' + k + '.mp3', n > 0)
        .then((ab) => {
          if (M.bytes && ab.byteLength !== M.bytes) throw new Error('veraltet');
          return ab;
        })
        .catch((err) => {
          this.bytes.delete(k);
          this.fail.add(k);
          const alt = err && err.message === 'veraltet';
          if (alt) this.alt.set(k, n + 1);
          // veraltet: nach 8 s bzw. 30 s neu (der Worker hat die neue Fassung dann meist), sonst nach 2 Minuten
          setTimeout(() => this.fail.delete(k), alt && n < 2 ? (n ? 30000 : 8000) : 120000);
          return null;
        });
      this.bytes.set(k, p);
    }
    return p;
  },

  // dekodieren (Kopie der Bytes, die bleiben für später im Speicher)
  decode(k) {
    if (this.bufs.has(k)) return Promise.resolve(this.bufs.get(k));
    if (this.decoding && this.decoding.k === k) return this.decoding.p;
    const p = Promise.resolve(this.fetch(k)).then((ab) => {
      if (!ab || !sfx.ctx) return null;
      return sndDecode(sfx.ctx, ab.slice(0)).then((buf) => {
        this.bufs.set(k, buf);
        this.trim(k);
        return buf;
      }, () => {
        this.fail.add(k);
        return null;
      });
    });
    this.decoding = { k, p };
    p.then(() => { if (this.decoding && this.decoding.p === p) this.decoding = null; });
    return p;
  },

  // dekodierte Stücke sind groß (ein Stück ≈ 20–30 MB): auf dem Handy nur das laufende und das nächste behalten
  trim(keep) {
    const max = typeof IS_PC !== 'undefined' && IS_PC ? 3 : 2;
    for (const k of [...this.bufs.keys()]) {
      if (this.bufs.size <= max) break;
      if (k !== keep && (!this.cur || this.cur.k !== k)) this.bufs.delete(k);
    }
  },

  // läuft für diese Stimmung schon eine Datei?
  playing(k) {
    return !!(this.cur && this.cur.k === k);
  },

  // Soll die erzeugte Musik schweigen? Ja, solange irgendeine Datei läuft (auch die alte, während die neue noch
  // dekodiert wird) und kurz (MUSIC_FILE_WAIT), solange die gewünschte Datei noch lädt – dann setzt sie direkt ein.
  busy(k, now) {
    if (this.cur) return true;
    return !!(this.pending && this.wantK === k && now - (this.pendingAt || 0) < MUSIC_FILE_WAIT);
  },

  // Stimmung k gewünscht: Datei starten (sobald dekodiert); fade Überblendzeit in s
  want(k, fade = 2.5) {
    if (this.wantK === k && (this.playing(k) || this.pending)) return;
    this.wantK = k;
    if (!this.has(k)) {
      this.pending = false;
      this.stop(fade);
      return;
    }
    // zurück zur Stimmung, deren Datei noch läuft (die neue war noch nicht fertig): einfach weiterspielen
    if (this.playing(k)) {
      this.pending = false;
      return;
    }
    this.pending = true;
    this.pendingAt = sfx.ctx ? sfx.ctx.currentTime : 0;
    this.decode(k).then((buf) => {
      if (this.wantK !== k) return;
      this.pending = false;
      if (!buf || !music.allowed()) {
        this.stop(fade);
        return;
      }
      this.start(k, buf, fade);
    });
  },

  start(k, buf, fade) {
    const c = sfx.ctx;
    if (!c || !music.fileBus) return;
    const M = MUSIC_FILES[k];
    if (this.cur && this.cur.k === k) return;
    const t = c.currentTime + 0.05;
    const dur = Math.max(0.1, fade);
    // alte Datei fällt (Kosinus), neue steigt (Sinus) – gleichzeitig, gleiche Leistung
    this.stop(dur, true, t);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    // Schleifenpunkte aus der Datei. Entfernt der Browser die Kodierverzögerung der MP3 nicht (Safari), verschiebt
    // sich der Inhalt um einige Hundertstel – um A und B herum steht in der Datei dasselbe, die Naht bleibt sauber.
    src.loopStart = M.loop[0];
    src.loopEnd = Math.min(buf.duration - 0.01, M.loop[1]);
    const g = c.createGain();
    g.gain.value = 0;
    sfx.fade(g.gain, t, dur, 1, 0);
    src.connect(g);
    g.connect(music.fileBus);
    // zurück in eine Gegend: dort weiter, wo das Stück aufgehört hat (innerhalb der Schleife), sonst von vorn
    let off = this.pos.get(k) || 0;
    if (off >= src.loopEnd) off = src.loopStart;
    src.start(t, off);
    this.cur = { k, src, g, t0: t - off, M, a: src.loopStart, b: src.loopEnd };
    music.procFade(0, dur);
  },

  stop(fade = 2, keepProc, at) {
    const c = sfx.ctx;
    const o = this.cur;
    this.cur = null;
    if (!o || !c) return;
    const t = at || c.currentTime;
    // Stelle merken (innerhalb der Schleife)
    let p = t - o.t0;
    if (p > o.b) p = o.a + ((p - o.a) % (o.b - o.a));
    this.pos.set(o.k, p);
    const dur = Math.max(0.1, fade);
    sfx.fade(o.g.gain, t, dur, 0);
    try {
      o.src.stop(t + dur + 0.1);
    } catch (e) { /* schon gestoppt */ }
    if (!keepProc) music.procFade(1, dur);
  },

  // Musik aus (Option) oder Tab im Hintergrund: Datei anhalten, erzeugte Musik übernimmt beim Wiedereinschalten
  off() {
    this.wantK = null;
    this.pending = false;
    this.stop(0.4);
  },

  // Nachbargegenden vorab holen (nur Bytes), Boss, wenn einer nahe ist
  prefetch(p) {
    if (!p || typeof music === 'undefined' || !game.running || !game.world) return;
    const seen = new Set();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const k = music.moodAt(p.x + Math.cos(a) * 1400, p.y + Math.sin(a) * 1400);
      if (k) seen.add(k);
    }
    if (game.monsters.some((m) => !m.dead && m.type && (m.type.boss || m.type.raid) && (m.x - p.x) ** 2 + (m.y - p.y) ** 2 < 1700 * 1700)) seen.add('boss');
    for (const k of seen) if (this.has(k)) this.fetch(k);
  }
};
