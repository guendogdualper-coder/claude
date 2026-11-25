// Zuschauer aus Bildern der echten Figuren (Phase 3 der Ränge, tribuene.js).
// Wunsch: „Die Zuschauer am Rand der Arena gefallen mir immer noch nicht – sie sollen ähnlich aussehen wie die NPCs in
// der Stadt.“ Und: „Das Handy wird beim Spielen sehr schnell heiß.“
// Bis 15.52 bestanden die Zuschauer aus eigenen, sparsamen Modellen (Quader und grobe Drehkörper). Jetzt sind es die
// echten Stadtbewohner von Kazehana, im Turm echte Ungeheuer des Spiels – aber als Bilder, nicht als Modelle:
// 3D (Impostoren):
// - Jede Figur (buildNpc3 bzw. monsterBuild, drei-figuren.js; ohne Waffen, Schild und Köcher) wird einmal in drei
//   Haltungen (Arme unten, beide halb erhoben, beide oben – beidseitig gleich, damit das gespiegelte Bild der anderen
//   Seite nicht den Arm wechselt) aus acht Richtungen (alle 25,7° von vorn bis hinten, die andere Seite gespiegelt)
//   gezeichnet, in doppelter Auflösung, und auf der Grafikkarte nachgeschärft in einen Bildbogen verkleinert.
// - Aufgenommen wird aus der Höhe, aus der man die Ränge sieht: für die feste Kamera (Normal/Weit, gemessen 31–58°,
//   meist um 38°) und den Schulterblick (6–11°, dort sieht man die Gesichter fast von vorn) je ein eigener Bogen; es
//   liegt immer nur der Bogen der eingestellten Kamera auf der Grafikkarte.
// - Mit denselben Stoffen wie die echte Figur: einseitige Flächen, echte Umrisshülle. In weite Ärmel und Kapuzen sieht
//   man wie am echten Modell auf die schwarze Innenseite der Hülle (dunkle Hände und Ärmelenden bei Mönch und Alter).
// - Jedes Bild ist genau auf den Umriss der Figur in dieser Haltung und Richtung zugeschnitten (tribbBoxesJob).
// - Gespeichert wird nicht das beleuchtete Bild, sondern die Farbe der Flächen und ihre Ausrichtung (Normalen, halbe
//   Auflösung). Das Licht rechnet der Shader wie bei den echten Figuren (Himmel und Boden, Sonne mit den drei
//   Zeichentrick-Stufen, Randlicht, die vier nächsten warmen Lichter, Nebel). Umriss und Leuchtteile bleiben unbeleuchtet.
// - Alle Zuschauer sind EIN Mesh aus zur Kamera gedrehten Achtecken (ein Zeichenaufruf). Kein Überblenden zweier Bilder
//   mehr (das gab Doppelgesichter und halbdurchsichtige Geisterarme): Haltung und Richtung wechseln hart; welche
//   Richtung ein Zuschauer zeigt, legt tribbDirs3 mit etwas Spielraum fest (kein Hin- und Herspringen an der Grenze).
//   Kanten werden beim Vergrößern scharf gerechnet (wie bei Schrift aus Bildern), Hüpfen und Wiegen im Shader.
// 2D: dieselben Figuren aus ihren 2D-Zeichnungen (NPC_ART bzw. MONSTER_ART, umrandeter Zeichentrick-Stil wie in der
//   Stadt): Bewohner von vorn mit drei Armhaltungen, im Südrang von hinten (aus ihren Farben und Haaren gezeichnet),
//   Ungeheuer von der Seite. Ganz ohne WebGL, ein drawImage je sichtbarem Zuschauer.
// Wann gezeichnet wird: nur wenn man hin will (in der Nähe des Arenameisters bzw. des Turms, im Anweg, in der Halle),
// in kleinen Schritten (je Bild höchstens wenige Millisekunden und zwei Aufnahmen); fertige Figuren erscheinen sofort.
// Fertige Bögen kommen in die IndexedDB. Der Schlüssel hängt nicht an der Spielversion, sondern an den Figuren selbst:
// Nach einem Update werden die Modelle einmal gebaut und verglichen (Prüfsumme, ohne Zeichnen); nur wenn sich eine
// Figur geändert hat, entsteht der Bogen neu (der alte bleibt so lange stehen). Die Grafikqualität ändert am Handy
// nichts am Bogen. Ein Bogen, der lange nicht gebraucht wurde, wird von der Grafikkarte genommen.
// Klappt etwas nicht (kein WebGL2, Fehler), bleiben die bisherigen Zuschauer (tribuene.js).

const TRIBB = {
  // Version der Bilder (Teil des Schlüssels im Zwischenspeicher; erhöhen, wenn sich das Zeichnen hier ändert)
  ver: 7,
  // Blickhöhe der Aufnahme (Bogenmaß) je Kameraart: f = feste Kamera (Normal, Weit), s = Schulterblick
  E: { f: 0.66, s: 0.17 },
  dirs: 8,
  poses: 3,
  // Aufnahme in doppelter Auflösung, dann nachgeschärft verkleinert
  ss: 2,
  // Dicke der Umrisshülle beim Zeichnen: wie die echten Figuren (figOutline, 0,022) – dasselbe Shaderprogramm, das das
  // Spiel schon übersetzt hat; das Nachschärfen beim Verkleinern hält die Linie dunkel
  outW: 0.022,
  // Spielraum beim Wechsel der Richtung (Anteil eines 25,7°-Schritts, also ±2°): erst 0,5 + hys über die Mitte hinaus
  hys: 0.08,
  // Arena: echte Stadtbewohner (Händler, Schmied, Wache, Bauer, Kind, Alte, Mönch …), ohne Waffen, Schild und Köcher
  arena: ['haendler', 'schmied', 'bauer', 'alte', 'waffen', 'teleport', 'lager', 'moench', 'ruestung', 'kind', 'stallmeister', 'jaegerin',
    'aeltester', 'alchemist', 'lehrmeister', 'post', 'auktion', 'arena', 'pvp', 'bogenmacher', 'wache', 'ratgeber', 'wandler', 'veredler'],
  // Turm: echte Ungeheuer (Orks, Untote, Dämonen, Ghule, Hexer, Gargoyles …)
  turm: ['ork', 'untoter', 'daemon', 'ghul', 'orkhauptmann', 'knochenhauptmann', 'blutdaemon', 'knochenruferin', 'orkberserker', 'grabwaechter',
    'feuerdaemon', 'turm_hexer', 'gargoyle', 'trollkrieger', 'i_feuerimp', 'turm_krieger', 'schattendaemon', 'minotaurus'],
  // Familien der Ungeheuer (für die Verteilung: nicht zwei aus derselben Familie nebeneinander)
  fam: { ork: 'o', orkhauptmann: 'o', orkberserker: 'o', untoter: 'u', knochenhauptmann: 'u', knochenruferin: 'u', grabwaechter: 'u', ghul: 'u',
    daemon: 'd', blutdaemon: 'd', feuerdaemon: 'd', schattendaemon: 'd', i_feuerimp: 'd', turm_hexer: 'h', turm_krieger: 'h', gargoyle: 'g',
    trollkrieger: 't', minotaurus: 'm' },
  // sehr große Figuren (Riesen, Minotauren) werden auf diese Höhe verkleinert
  maxH: { arena: 1.7, turm: 1.85 },
  // Fläche aller 24 Bilder einer Figur in Einheiten² (gemessen, mit Rand und Lücken) für die Höhe des Bogens beim
  // Zeichnen; am Ende wird er auf die genutzte Höhe gekürzt
  area: { arena: 56, turm: 100 },
  // Bildpunkte je Einheit: Ungeheuer sind größer, dafür etwas gröber
  rhoK: { arena: 1, turm: 0.86 },
  // Größe in 2D gegenüber den Figuren der Stadt (die Ränge liegen eine Kachel auseinander)
  s2: { arena: 0.84, turm: 0.8 },
  // 3D: Bögen je Art und Kameraart (at3), gezeigter Bogen je Art (at), Neubau nach geänderten Figuren (nx3)
  at: {},
  at3: {},
  nx3: {},
  at2: {},
  looks: {},
  // eigener Vorrat an Grundformen je Art während eines Bauauftrags (tribbIsolated)
  vorrat: {},
  stat: { schritte: 0, ms: 0, max: 0, bau: 0, wechsel: 0 }
};

// --- Zwischenspeicher (IndexedDB) -------------------------------------------------------------------------------------
const TRIBB_DB = { p: null, off: false };
function tribbDb() {
  if (TRIBB_DB.off || typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (!TRIBB_DB.p) {
    TRIBB_DB.p = new Promise((res) => {
      let rq;
      try {
        rq = indexedDB.open('seelenstein-bilder', 1);
      } catch (e) {
        TRIBB_DB.off = true;
        res(null);
        return;
      }
      rq.onupgradeneeded = () => rq.result.createObjectStore('bogen');
      rq.onsuccess = () => res(rq.result);
      rq.onerror = rq.onblocked = () => {
        TRIBB_DB.off = true;
        res(null);
      };
    });
  }
  return TRIBB_DB.p;
}
function tribbDbGet(slot) {
  return tribbDb().then((db) => db && new Promise((res) => {
    try {
      const rq = db.transaction('bogen', 'readonly').objectStore('bogen').get(slot);
      rq.onsuccess = () => res(rq.result || null);
      rq.onerror = () => res(null);
    } catch (e) {
      res(null);
    }
  }));
}
function tribbDbPut(slot, val) {
  return tribbDb().then((db) => db && new Promise((res) => {
    try {
      const tx = db.transaction('bogen', 'readwrite');
      tx.objectStore('bogen').put(val, slot);
      tx.oncomplete = () => res(true);
      tx.onerror = tx.onabort = () => res(false);
    } catch (e) {
      res(false);
    }
  }));
}
const tribbGv = () => (typeof GAME_VERSION !== 'undefined' ? GAME_VERSION : '');
// Schlüssel eines 2D-Bogens: ändert sich mit Spielversion (andere Zeichnungen), Auflösung und Figurenliste
function tribbKey(kind, mode, q) {
  return [TRIBB.ver, tribbGv(), mode, kind, q, TRIBB.dirs, TRIBB.poses, TRIBB[kind].join(',')].join('|');
}
// Schlüssel eines 3D-Bogens: ohne Spielversion (ob sich die Figuren geändert haben, sagt die Prüfsumme der Modelle)
function tribbKey3(kind, mode, rho, E) {
  return [TRIBB.ver, '3d', mode, kind, rho, E, TRIBB.dirs, TRIBB.poses, TRIBB.ss, TRIBB.outW, TRIBB[kind].join(',')].join('|');
}

// --- Figuren ---------------------------------------------------------------------------------------------------------
// Bewohner ohne Waffen, Schild und Köcher (dieselbe Figur wie in der Stadt: buildNpc3 mit npcModelDef)
function tribbNpcBuild(b, id) {
  const orig = npcModelDef;
  npcModelDef = function (x) {
    const c = orig(x);
    if (c) {
      delete c.weapon;
      delete c.shield;
      delete c.quiver;
    }
    return c;
  };
  try {
    return buildNpc3(b, id);
  } finally {
    npcModelDef = orig;
  }
}
const tribbNpc = tribbNpcBuild;
// Modell auf einmal bauen (für Prüfbilder und Vergleiche mit dem Bild; das Spiel baut in Schritten, tribbFigJob)
function tribbModel(kind, id) {
  const b = new Bake3(true);
  const info = kind === 'turm' ? monsterBuild(b, id, 0) : tribbNpcBuild(b, id);
  if (!info) return null;
  const m = Object.assign({ geos: finishGeos3(b.build(), -1) }, info);
  m.scale = m.scale || 1;
  m.key = 'tribb:' + id;
  m.gen = V3.ctxGen || 0;
  return m;
}
function tribbFree(a, m) {
  if (a) {
    if (a.group.parent) a.group.parent.remove(a.group);
    disposeActor(a);
  }
  if (m) for (const k in m.geos) m.geos[k].dispose();
}
// Haltung: 0 Arme unten, 1 beide Arme schräg hoch zur Seite (ein flaches V), 2 beide Arme oben (fast senkrecht und etwas zur Seite,
// damit sie aus der Höhe der Kamera nicht vor dem Gesicht liegen). Beide Seiten gleich: das gespiegelte Bild (andere
// Seite des Zuschauers) zeigt dieselbe Haltung
function tribbPose(a, pose) {
  resetBones(a);
  const B = a.bones;
  if (B[BH.head]) B[BH.head].rotation.x = pose ? -0.2 : -0.14;
  if (!B[BH.armL] || !B[BH.armR]) return;
  if (!pose) {
    B[BH.armL].rotation.z = 0.12;
    B[BH.armR].rotation.z = -0.12;
    return;
  }
  if (B[BH.chest]) B[BH.chest].rotation.x = -0.05;
  if (pose === 1) {
    B[BH.armL].rotation.set(-2.3, 0, 1.0);
    B[BH.armR].rotation.set(-2.3, 0, -1.0);
  } else {
    B[BH.armL].rotation.set(-2.9, 0, 0.62);
    B[BH.armR].rotation.set(-2.9, 0, -0.62);
  }
}
// Prüfsumme der Geometrie einer Figur (Lage, Farbe, Knochen der Ecken): ändert sich, sobald sich die Figur ändert.
// In Stücken von 6000 Ecken (yield 0 dazwischen)
function* tribbHashGeo(g, h) {
  const mix = (v) => {
    h[0] = Math.imul(h[0] ^ v, 16777619);
    h[1] = Math.imul(h[1] ^ (v + 0x9e3779b9), 0x85ebca6b);
  };
  if (!g) {
    mix(7);
    return;
  }
  const P = g.attributes.position.array;
  const C = g.attributes.color.array;
  const S = g.attributes.skinIndex ? g.attributes.skinIndex.array : null;
  mix(P.length);
  const n = P.length / 3;
  for (let v0 = 0; v0 < n; v0 += 6000) {
    const v1 = Math.min(n, v0 + 6000);
    for (let i = v0 * 3; i < v1 * 3; i++) mix(Math.round(P[i] * 1024) | 0);
    for (let i = v0 * 3; i + 2 < v1 * 3; i += 3) mix(C[i] | (C[i + 1] << 8) | (C[i + 2] << 16));
    if (S) for (let i = v0 * 4; i + 3 < v1 * 4; i += 4) mix(S[i] | (S[i + 1] << 8) | (S[i + 2] << 16) | (S[i + 3] << 24));
    yield 0;
  }
  mix(g.index ? g.index.count : 0);
}
const TRIBB_GEOS = ['lit', 'face', 'glow'];
// Figuren mit eigenem Vorrat an Grundformen bauen (GEO3/TPL3, drei-kern.js), je Art und Bauauftrag frisch: Der
// gemeinsame Vorrat hängt davon ab, was das Spiel vorher schon gebaut hat – manche Formen tragen nicht alle Maße im
// Schlüssel (z. B. lathe3('bracer'): die Armschienen des Schmieds bekamen die Armdicke der Figur, die als erste welche
// trug). Mit eigenem Vorrat und fester Reihenfolge ist das Ergebnis und damit die Prüfsumme immer gleich (sonst würde nach
// manchem Neustart grundlos neu gezeichnet); der Vorrat des Spiels bleibt unberührt. Aus ihm übernommen werden nur
// Grundformen, deren Schlüssel alle Maße enthält (TRIBB_GEO_OK: abgerundete Quader, Kugeln, Ringe, Zylinder, Glieder,
// Hörner) – das spart beim ersten Bau eines Auftrags den größten Teil der Arbeit.
const TRIBB_GEO_OK = /^(rb|sp|to|cy|lalimb|lahorn)[-\d.]/;
function tribbIsolated(kind, fn) {
  const V = TRIBB.vorrat;
  let own = V[kind];
  if (!own) {
    own = V[kind] = { g: new Map(), t: new Map() };
    for (const [k, v] of GEO3) if (TRIBB_GEO_OK.test(k)) own.g.set(k, v);
  }
  const sg = new Map(GEO3);
  const st = new Map(TPL3);
  GEO3.clear();
  TPL3.clear();
  for (const [k, v] of own.g) GEO3.set(k, v);
  for (const [k, v] of own.t) TPL3.set(k, v);
  try {
    return fn();
  } finally {
    own.g = new Map(GEO3);
    own.t = new Map(TPL3);
    GEO3.clear();
    TPL3.clear();
    for (const [k, v] of sg) GEO3.set(k, v);
    for (const [k, v] of st) TPL3.set(k, v);
  }
}
const TRIBB_BOX0 = [1e9, 1e9, -1e9, -1e9, 1e9, -1e9, 1e9, -1e9];
// je Bild im Bogen 12 Zahlen (drei Bildpunkte der Tabelle): Lage im Bogen (u, v, Breite, Höhe), Lage an der Figur
// (x0, y0, Breite, Höhe in Einheiten, Füße bei 0) und die schrägen Grenzen des Achtecks (x + y von/bis, x − y von/bis)
const TRIBB_RS = 12;
// Umriss einer Haltung aus jeder Richtung (Einheiten im Bild der Aufnahme, Füße bei 0): die Eckpunkte von Körper,
// Gesicht und Leuchtteilen mit den Knochen der Haltung bewegt (wie der Shader), dann gedreht und projiziert.
// Ergebnis: je Bild x0, y0, x1, y1 und die Grenzen von x + y und x − y (daraus wird das Viereck zum Achteck, das die
// leeren Ecken neben Kopf und Füßen nicht mehr zeichnet). In Stücken von 2500 Ecken (je ein Bauschritt)
function* tribbBoxesJob(A, a, geos, p, out) {
  const D = TRIBB.dirs;
  const o = p * D * 8;
  for (let i = 0; i < D; i++) out.set(TRIBB_BOX0, o + i * 8);
  const cs = new Float32Array(D);
  const sn = new Float32Array(D);
  for (let d = 0; d < D; d++) {
    const th = (-d * Math.PI) / (D - 1);
    cs[d] = Math.cos(th);
    sn[d] = Math.sin(th);
  }
  const cE = Math.cos(A.E);
  const sE = Math.sin(A.E);
  a.group.rotation.set(0, 0, 0);
  tribbPose(a, p);
  a.group.updateMatrixWorld(true);
  a.skeleton.update();
  const bm = a.skeleton.boneMatrices;
  for (const k of TRIBB_GEOS) {
    const g = geos[k];
    if (!g || !g.attributes.skinIndex) continue;
    const pos = g.attributes.position.array;
    const si = g.attributes.skinIndex.array;
    const sw = g.attributes.skinWeight.array;
    const n = pos.length / 3;
    for (let i0 = 0; i0 < n; i0 += 2500) {
      const i1 = Math.min(n, i0 + 2500);
      for (let i = i0; i < i1; i++) {
        const x = pos[i * 3];
        const y = pos[i * 3 + 1];
        const z = pos[i * 3 + 2];
        let wx = 0;
        let wy = 0;
        let wz = 0;
        for (let q = 0; q < 4; q++) {
          const w = sw[i * 4 + q] / 255;
          if (!w) continue;
          const b = si[i * 4 + q] * 16;
          wx += w * (bm[b] * x + bm[b + 4] * y + bm[b + 8] * z + bm[b + 12]);
          wy += w * (bm[b + 1] * x + bm[b + 5] * y + bm[b + 9] * z + bm[b + 13]);
          wz += w * (bm[b + 2] * x + bm[b + 6] * y + bm[b + 10] * z + bm[b + 14]);
        }
        for (let d = 0; d < D; d++) {
          const sx = wx * cs[d] + wz * sn[d];
          const sy = wy * cE - (wz * cs[d] - wx * sn[d]) * sE;
          const q = o + d * 8;
          if (sx < out[q]) out[q] = sx;
          if (sx > out[q + 2]) out[q + 2] = sx;
          if (sy < out[q + 1]) out[q + 1] = sy;
          if (sy > out[q + 3]) out[q + 3] = sy;
          const s1 = sx + sy;
          const s2 = sx - sy;
          if (s1 < out[q + 4]) out[q + 4] = s1;
          if (s1 > out[q + 5]) out[q + 5] = s1;
          if (s2 < out[q + 6]) out[q + 6] = s2;
          if (s2 > out[q + 7]) out[q + 7] = s2;
        }
      }
      yield 0;
    }
  }
}

// --- Wer sitzt wo -------------------------------------------------------------------------------------------------
// Merkmale, die aus der Ferne ins Auge fallen: weißes Haar, Glatze, Helm, Hut (Arena) bzw. die Familie (Turm), dazu die
// Farbe der Kleidung. Zwei Zuschauer mit demselben Merkmal sollen nicht nah beieinander sitzen.
function tribbLook(kind, id) {
  if (kind === 'turm') return { head: TRIBB.fam[id] || id, hue: -1 };
  const c = (typeof npcModelDef === 'function' && npcModelDef(id)) || {};
  const lum = (hex) => {
    const n = parseInt(String(hex || '#000').slice(1), 16);
    return (0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255;
  };
  const head = c.helm ? 'helm' : c.hat ? 'hut' : !c.hair || c.hair.style === 5 ? 'glatze' : lum(c.hair.color) > 0.6 ? 'weiss' : '';
  let hue = -1;
  const cl = c.robe || c.torso;
  if (cl && typeof THREE !== 'undefined') {
    const hsl = {};
    new THREE.Color(cl).getHSL(hsl);
    if (hsl.s > 0.2 && hsl.l > 0.15 && hsl.l < 0.85) hue = hsl.h;
  }
  return { head, hue };
}
// Merkmale je Art (einmal; beim Zeichnen bzw. Laden des Bogens Schritt für Schritt vorab, tribbLooksJob – das Lesen
// der 2D-Zeichnungen kostet je Figur etwas)
function tribbLooks(kind) {
  return TRIBB.looks[kind] || (TRIBB.looks[kind] = []);
}
function* tribbLooksJob(kind) {
  const L = tribbLooks(kind);
  const ids = TRIBB[kind];
  for (let v = 0; v < ids.length; v++) {
    if (L[v]) continue;
    L[v] = tribbLook(kind, ids[v]);
    yield 0;
  }
}
// Wer sitzt wo: je Platz die Figur mit der kleinsten Ähnlichkeit zu den schon gesetzten Nachbarn im Umkreis von 2,6
// Kacheln (dieselbe Figur zählt viel, dasselbe auffällige Merkmal oder ähnliche Kleiderfarbe weniger, je näher desto
// mehr), dazu ein wenig, wie oft eine Figur schon sitzt (alle kommen etwa gleich oft vor). Ergebnis je Zuschauer
// (Index in K.fans) die Nummer der Figur.
function tribbAssign(K, n) {
  const dichte = tribDichte();
  const c = K.tribbFig;
  if (c && c.dichte === dichte && c.n === n) return c.a;
  const kind = K.kind;
  const ids = TRIBB[kind] || [];
  const L = tribbLooks(kind);
  const looks = [];
  for (let v = 0; v < n; v++) looks.push(L[v] || (L[v] = tribbLook(kind, ids[v])));
  const pen = (u, w) => {
    if (u === w) return 10;
    const A = looks[u];
    const B = looks[w];
    let s = 0;
    if (A.head && A.head === B.head) s += kind === 'turm' ? 3 : 4;
    if (A.hue >= 0 && B.hue >= 0) {
      const dh = Math.abs(A.hue - B.hue);
      if (Math.min(dh, 1 - dh) < 0.05) s += 1.5;
    }
    return s;
  };
  const P = new Float32Array(n * n);
  for (let u = 0; u < n; u++) for (let w = 0; w < n; w++) P[w * n + u] = pen(u, w);
  const a = new Uint8Array(K.fans.length);
  const use = new Float32Array(n);
  const R = 2.6;
  const grid = new Map();
  const near = [];
  const score = new Float32Array(n);
  const key = (x, y) => (x + 512) * 1024 + y + 512;
  for (let j = 0; j < K.fans.length; j++) {
    const f = K.fans[j];
    if (f.keep > dichte) continue;
    near.length = 0;
    const gx = Math.floor(f.x / R);
    const gy = Math.floor(f.y / R);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const l = grid.get(key(gx + dx, gy + dy));
        if (!l) continue;
        for (let q = 0; q < l.length; q++) {
          const g = K.fans[l[q]];
          const ex = g.x - f.x;
          const ey = g.y - f.y;
          const d2 = ex * ex + ey * ey;
          if (d2 < R * R) near.push(l[q], 1 - Math.sqrt(d2) / R);
        }
      }
    }
    for (let v = 0; v < n; v++) score[v] = use[v] * 0.12 + ((f.seed * 97.3 + v * 0.618) % 1) * 0.05;
    for (let q = 0; q < near.length; q += 2) {
      const o = a[near[q]] * n;
      const k = near[q + 1];
      for (let v = 0; v < n; v++) score[v] += P[o + v] * k;
    }
    let best = 0;
    for (let v = 1; v < n; v++) if (score[v] < score[best]) best = v;
    a[j] = best;
    use[best]++;
    const kk = key(gx, gy);
    let l = grid.get(kk);
    if (!l) grid.set(kk, (l = []));
    l.push(j);
  }
  K.tribbFig = { dichte, n, a };
  return a;
}
// fehlende (noch nicht gezeichnete oder misslungene) Figuren durch die nächste fertige ersetzen
function tribbRemap(A) {
  const n = A.ids.length;
  for (let v = 0; v < n; v++) {
    A.map[v] = -1;
    for (let k = 0; k < n; k++) {
      if (A.ok[(v + k) % n]) {
        A.map[v] = (v + k) % n;
        break;
      }
    }
  }
}

// --- Wer braucht welchen Bogen bald? ---------------------------------------------------------------------------------
// 2 = in der Halle, 1 = bald (Arenameister bzw. Turmeingang in der Nähe, Anweg, Einladung), 0 = nicht
const TRIBB_T = { frame: 0, scanAt: -9, near: { arena: 0, turm: 0 } };
function tribbSoon(kind) {
  const p = game.player;
  if (!p) return 0;
  if (kind === 'arena' && game.arenaRun) return 1;
  if (kind === 'turm' && game.turmRun) return 1;
  const t = game.time || 0;
  if (t - TRIBB_T.scanAt > 1) {
    TRIBB_T.scanAt = t;
    TRIBB_T.near.arena = 0;
    TRIBB_T.near.turm = 0;
    const lvl = p.level || 0;
    const npcs = (game.world && game.world.npcs) || [];
    const R = 13 * TILE;
    for (const n of npcs) {
      const k = n.id === 'arena' ? 'arena' : n.id === 'turm' || n.id === 'turmtor' ? 'turm' : null;
      if (!k) continue;
      if (k === 'arena' && typeof ARENA !== 'undefined' && lvl < ARENA.minLevel) continue;
      if (k === 'turm' && lvl < 80) continue;
      if (Math.abs(n.x - p.x) < R && Math.abs(n.y - p.y) < R) TRIBB_T.near[k] = 1;
    }
  }
  return TRIBB_T.near[kind];
}
// Zeit je Bild für das Zeichnen der Bögen (ms) und höchstens so viele Aufnahmen (Arbeit der Grafikkarte, die die Uhr
// hier nicht sieht): in der Halle mehr, vorab weniger; unter Last und beim Wärmeschutz die Hälfte – aber nie gar nicht
function tribbBudget(need) {
  const lv = typeof LOAD !== 'undefined' ? LOAD.level : 0;
  const hot = typeof HEAT !== 'undefined' && HEAT.fps;
  const ms = need >= 2 ? 4 : 2.5;
  return lv >= 2 || hot ? ms * 0.5 : lv === 1 ? ms * 0.75 : ms;
}
const tribbGpuMax = (need) => (need >= 2 ? 2 : 1);

// =====================================================================================================================
// 3D
// =====================================================================================================================
// Kameraart: f = feste Kamera (Normal, Weit), s = Schulterblick
const tribbMode = () => (typeof v3Shoulder === 'function' && v3Shoulder() ? 's' : 'f');
// Bildpunkte je Einheit im Bogen. Gemessen am iPhone 13 (quer, Grafik „Niedrig“): ein Zuschauer der vorderen Reihen hat
// in der festen Kamera 47–71 Bildpunkte je Einheit, im Schulterblick 20–70. Am Handy für jede Grafikqualität gleich
// (Wechsel der Qualität zeichnet nichts neu), am PC größer
function tribbRho3(kind) {
  const pc = typeof IS_PC === 'undefined' || IS_PC;
  return Math.round((pc ? 76 : 50) * TRIBB.rhoK[kind]);
}
function tribbNew3(kind, mode) {
  const rho = tribbRho3(kind);
  const E = TRIBB.E[mode];
  const ids = TRIBB[kind];
  const nv = ids.length * TRIBB.poses * TRIBB.dirs;
  return {
    kind, mode, slot: kind + ':' + mode, ids, rho, E, gen: V3.ctxGen || 0, nv, key: tribbKey3(kind, mode, rho, E), st: 'neu',
    rects: new Float32Array(nv * TRIBB_RS), ok: new Uint8Array(ids.length), map: new Int16Array(ids.length).fill(-1), fps: new Array(ids.length).fill(''),
    fp: '', done: 0, next: 0, fails: 0, full: 0, job: null, W: 0, H: 0, yTop: 0, sky: [], rtA: null, rtN: null, texA: null, texN: null, rectTex: null,
    mat: null, ver: 0, saved: false, rb: null, usedAt: performance.now(), chk: null, gpu: 0
  };
}
// Bogen einer Art für eine Kameraart (neu, wenn sich Auflösung oder Grafikkontext geändert haben)
function tribbA3(kind, mode) {
  const slot = kind + ':' + mode;
  let A = TRIBB.at3[slot];
  if (A && (A.rho !== tribbRho3(kind) || A.gen !== (V3.ctxGen || 0))) {
    tribbDrop3(A);
    A = null;
  }
  if (!A) TRIBB.at3[slot] = A = tribbNew3(kind, mode);
  return A;
}
// alles dieses Bogens von der Grafikkarte nehmen (er kommt beim nächsten Mal aus dem Zwischenspeicher)
function tribbDrop3(A) {
  if (A.job) {
    try {
      A.job.return();
    } catch (e) { /* schon zu Ende */ }
    A.job = null;
  }
  if (TRIBB.lock === A) TRIBB.lock = null;
  for (const k of ['rtA', 'rtN']) if (A[k]) A[k].dispose();
  if (!A.rtA) {
    if (A.texA) A.texA.dispose();
    if (A.texN) A.texN.dispose();
  }
  if (A.rectTex) A.rectTex.dispose();
  if (A.mat) A.mat.dispose();
  if (A.rb) tribbReadDrop(A);
  A.rtA = A.rtN = A.texA = A.texN = A.rectTex = A.mat = null;
  A.st = 'aus-gpu';
  if (TRIB3.group && TRIB3.group.userData.fanAtlas === A) trib3FansClear(TRIB3.group);
  if (TRIBB.at3[A.slot] === A) delete TRIBB.at3[A.slot];
  if (TRIBB.nx3[A.slot] === A) delete TRIBB.nx3[A.slot];
  if (TRIBB.at[A.kind] === A) delete TRIBB.at[A.kind];
}

// Zeichner-Zustand sichern und wiederherstellen (Ziel, Löschfarbe, Schatten, automatisches Löschen)
function tribbGlSave(gl) {
  const s = { rt: gl.getRenderTarget(), cc: gl.getClearColor(new THREE.Color()), ca: gl.getClearAlpha(), ac: gl.autoClear, sh: gl.shadowMap.enabled };
  gl.shadowMap.enabled = false;
  gl.autoClear = false;
  return s;
}
function tribbGlRestore(gl, s) {
  gl.setRenderTarget(s.rt);
  gl.setClearColor(s.cc, s.ca);
  gl.autoClear = s.ac;
  gl.shadowMap.enabled = s.sh;
}
// Aufnahme-Werkzeug (einmal): Szene, Kamera, Stoffe für Farbe und Normalen, Verkleinern
const TRIBB_DS_VS = `
uniform vec4 uSrc;
varying vec2 vUv;
void main() {
	vUv = mix(uSrc.xy, uSrc.zw, uv);
	gl_Position = vec4(position.xy, 0.0, 1.0);
}`;
// uQ 0: 1:1 kopieren, 1: 4 × 4 Bildpunkte mitteln (Normalen, vier Abgriffe), 2: 2 × 2 mitteln und gegen die 4 × 4
// nachschärfen (Farbe; vorab multipliziertes Alpha, Farbe nie über Alpha)
const TRIBB_DS_FS = `
uniform sampler2D tSrc;
uniform vec2 uTx;
uniform float uQ;
varying vec2 vUv;
void main() {
	vec4 b = texture2D(tSrc, vUv);
	if (uQ < 0.5) {
		gl_FragColor = b;
		return;
	}
	vec4 w = 0.25 * (texture2D(tSrc, vUv - uTx) + texture2D(tSrc, vUv + uTx) + texture2D(tSrc, vUv + vec2(uTx.x, -uTx.y)) + texture2D(tSrc, vUv + vec2(-uTx.x, uTx.y)));
	if (uQ < 1.5) {
		gl_FragColor = w;
		return;
	}
	vec4 s = clamp(b + 0.6 * (b - w), 0.0, 1.0);
	gl_FragColor = vec4(min(s.rgb, vec3(s.a)), s.a);
}`;
function tribbKit() {
  if (TRIBB.kit) return TRIBB.kit;
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-0.5, 0.5, 1, 0, 0.5, 40);
  // wie die echten Figuren einseitig (MeshToonMaterial): in offene Formen (weite Ärmel, Kapuzen) sieht man auf die
  // schwarze Innenseite der Umrisshülle
  const alb = new THREE.MeshBasicMaterial({ vertexColors: true, skinning: true });
  // im Normalen-Bild schreiben Umriss und Leuchtteile (0, 0, 0, 0) = „unbeleuchtet“
  const albZ = new THREE.MeshBasicMaterial({ vertexColors: true, skinning: true, opacity: 0 });
  const nrm = new THREE.MeshNormalMaterial({ skinning: true });
  const out = outlineMat(TRIBB.outW, true);
  const outZ = outlineMat(TRIBB.outW, true);
  outZ.color.setRGB(0, 0, 0);
  outZ.opacity = 0;
  const ds = new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: null }, uSrc: { value: new THREE.Vector4() }, uTx: { value: new THREE.Vector2() }, uQ: { value: 0 } },
    vertexShader: TRIBB_DS_VS, fragmentShader: TRIBB_DS_FS, depthTest: false, depthWrite: false, blending: THREE.NoBlending
  });
  const dsScene = new THREE.Scene();
  const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ds);
  q.frustumCulled = false;
  dsScene.add(q);
  TRIBB.kit = { scene, cam, alb, albZ, nrm, out, outZ, ds, dsScene, strip: null, stripN: null, warm: 0 };
  return TRIBB.kit;
}
function tribbCamE(kit, E) {
  const cam = kit.cam;
  if (cam.userData.E === E) return;
  cam.userData.E = E;
  cam.position.set(0, Math.sin(E) * 12, Math.cos(E) * 12);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld(true);
}
// Stoffe für die beiden Aufnahmen: Farbe (Körper, Gesicht und Leuchtteile mit ihren Eckfarben, Umrisshülle schwarz) und
// Normalen (Körper und Gesicht; Umrisshülle und Leuchtteile schreiben „unbeleuchtet“, verdecken aber wie im Farbbild)
function tribbPass(a, pass, kit) {
  for (const k in a.meshes) {
    const o = a.meshes[k];
    if (k === 'lit' || k === 'face') o.material = pass ? kit.nrm : kit.alb;
    else if (k === 'outline') o.material = pass ? kit.outZ : kit.out;
    else if (k === 'glow') o.material = pass ? kit.albZ : kit.alb;
    else {
      o.visible = false;
      continue;
    }
    o.visible = true;
  }
  // angehängte Teile (Schein, Funken): nur im Farbbild
  if (a.tribbExtra) for (const o of a.tribbExtra) o.visible = !pass;
  if (a.blob) a.blob.visible = false;
}
// Shader der Aufnahmen vorab übersetzen, je Schritt einen Durchgang (Farbe, Normalen, Verkleinern)
function tribbWarm(kit, a, gl) {
  if (kit.warm < 2) {
    tribbPass(a, kit.warm, kit);
    kit.scene.add(a.group);
    try {
      gl.compile(kit.scene, kit.cam);
    } finally {
      kit.scene.remove(a.group);
    }
  } else gl.compile(kit.dsScene, kit.cam);
  kit.warm++;
}
// Zwischenbilder für die doppelte Auflösung (Farbe und Normalen), wachsen bei Bedarf
function tribbStrip(kit, w, h) {
  const s = kit.strip;
  if (s && s.width >= w && s.height >= h) return;
  const W = Math.ceil(Math.max(w, s ? s.width : 0) / 64) * 64;
  const H = Math.ceil(Math.max(h, s ? s.height : 0) / 64) * 64;
  if (s) {
    s.dispose();
    kit.stripN.dispose();
  }
  const opt = { depthBuffer: true, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
  kit.strip = new THREE.WebGLRenderTarget(W, H, opt);
  kit.stripN = new THREE.WebGLRenderTarget(W, H, opt);
  kit.strip.texture.generateMipmaps = false;
  kit.stripN.texture.generateMipmaps = false;
}
// leere Bilder für Farbe (volle Auflösung) und Normalen (halbe) auf der Grafikkarte anlegen
function tribbAllocRT(A, gl, W, H) {
  const opt = { depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
  A.rtA = new THREE.WebGLRenderTarget(W, H, opt);
  A.rtN = new THREE.WebGLRenderTarget(W / 2, H / 2, opt);
  A.rtA.texture.generateMipmaps = false;
  A.rtN.texture.generateMipmaps = false;
  A.texA = A.rtA.texture;
  A.texN = A.rtN.texture;
  A.W = W;
  A.H = H;
  const S = tribbGlSave(gl);
  try {
    gl.setClearColor(0x000000, 0);
    for (const rt of [A.rtA, A.rtN]) {
      rt.scissorTest = false;
      rt.viewport.set(0, 0, rt.width, rt.height);
      gl.setRenderTarget(rt);
      gl.clear(true, false, false);
    }
  } finally {
    tribbGlRestore(gl, S);
  }
}
// Bogen zum Zeichnen anlegen, Höhe nach der gemessenen Fläche je Figur
function tribbAlloc3(A, gl) {
  const max = gl.capabilities.maxTextureSize;
  const W = A.rho > 72 && max >= 4096 ? 4096 : 2048;
  let H = Math.ceil((TRIBB.area[A.kind] * A.ids.length * A.rho * A.rho * 1.2) / W / 16) * 16;
  H = Math.min(max, Math.max(256, H));
  tribbAllocRT(A, gl, W, H);
  A.yTop = 0;
  A.sky = [];
  A.rectTex = new THREE.DataTexture(A.rects, A.nv * 3, 1, THREE.RGBAFormat, THREE.FloatType);
  A.rectTex.needsUpdate = true;
}
// Platz im Bogen für einen Block (die acht Richtungen einer Haltung nebeneinander): Skyline-Packen (der Block kommt an
// die tiefste Stelle der oberen Kante, an der er passt) – die Bögen sind so nur wenig größer als die Bilder selbst
function tribbPack(A, w, h) {
  const S = A.sky.length ? A.sky : (A.sky = [{ x: 0, y: 0, w: A.W }]);
  let best = -1;
  let bestY = Infinity;
  for (let i = 0; i < S.length; i++) {
    if (S[i].x + w > A.W) break;
    let y = 0;
    let rest = w;
    for (let j = i; j < S.length && rest > 0; j++) {
      y = Math.max(y, S[j].y);
      rest -= S[j].w;
    }
    if (y < bestY) {
      bestY = y;
      best = i;
    }
  }
  if (best < 0 || bestY + h > A.H) return null;
  const x = S[best].x;
  const seg = { x, y: bestY + h + 4, w: w + 4 };
  const end = x + seg.w;
  const out = S.slice(0, best);
  out.push(seg);
  for (let j = best; j < S.length; j++) {
    const a = S[j];
    const ae = a.x + a.w;
    if (ae <= end) continue;
    if (a.x < end) out.push({ x: end, y: a.y, w: ae - end });
    else out.push(a);
  }
  A.sky = [];
  for (const a of out) {
    const l = A.sky[A.sky.length - 1];
    if (l && l.y === a.y && l.x + l.w === a.x) l.w += a.w;
    else if (a.w > 0) A.sky.push(a);
  }
  A.yTop = Math.max(A.yTop, bestY + h);
  return { x, y: bestY };
}
// Rechtecke einer Figur festlegen: Umriss + Rand (Umrisslinie, Weichzeichnen), auf gerade Bildpunkte gerundet (die
// Normalen haben halbe Auflösung); Rechtecke im Bogen (u, v, Breite, Höhe) und in Einheiten (x, y, Breite, Höhe)
function tribbPlace(A, v, box, sc) {
  const P = TRIBB.poses;
  const D = TRIBB.dirs;
  for (let tries = 0; tries < 2; tries++) {
    const rho = A.rho * (tries ? 0.7 : 1);
    const mg = (TRIBB.outW + 0.008) * sc + 1.5 / rho;
    // schräg reicht derselbe Rand um bis zu √2 weiter
    const mg2 = mg * Math.SQRT2;
    const blocks = [];
    for (let p = 0; p < P; p++) {
      const views = [];
      let ox = 0;
      let bh = 2;
      for (let d = 0; d < D; d++) {
        const i = (p * D + d) * 8;
        const x0 = box[i] - mg;
        const y0 = box[i + 1] - mg;
        const pw = Math.max(2, Math.ceil(((box[i + 2] + mg - x0) * rho) / 2) * 2);
        const ph = Math.max(2, Math.ceil(((box[i + 3] + mg - y0) * rho) / 2) * 2);
        const dg = [box[i + 4] - mg2, box[i + 5] + mg2, box[i + 6] - mg2, box[i + 7] + mg2];
        views.push({ ox, pw, ph, x0, y0, w: pw / rho, h: ph / rho, dg });
        ox += pw + 4;
        bh = Math.max(bh, ph);
      }
      blocks.push({ w: ox - 4, h: bh, views });
    }
    const at = [];
    const sky0 = A.sky.map((s) => Object.assign({}, s));
    const top0 = A.yTop;
    for (let p = 0; p < P; p++) {
      const r = tribbPack(A, blocks[p].w, blocks[p].h);
      if (!r) break;
      at.push(r);
    }
    if (at.length < P) {
      A.sky = sky0;
      A.yTop = top0;
      continue;
    }
    for (let p = 0; p < P; p++) {
      const b = blocks[p];
      b.x = at[p].x;
      b.y = at[p].y;
      for (let d = 0; d < D; d++) {
        const vw = b.views[d];
        const o = ((v * P + p) * D + d) * TRIBB_RS;
        A.rects.set([(b.x + vw.ox) / A.W, b.y / A.H, vw.pw / A.W, vw.ph / A.H, vw.x0, vw.y0, vw.w, vw.h, ...vw.dg], o);
      }
    }
    return blocks;
  }
  return null;
}
// Bild in den Bogen verkleinern (Farbe 2:1 nachgeschärft, Normalen 4:1)
function tribbDown(gl, kit, src, sw, sh, dst, x, y, w, h, q) {
  const u = kit.ds.uniforms;
  u.tSrc.value = src.texture;
  u.uSrc.value.set(0, 0, sw / src.width, sh / src.height);
  u.uTx.value.set(1 / src.width, 1 / src.height);
  u.uQ.value = q;
  dst.viewport.set(x, y, w, h);
  dst.scissor.set(x, y, w, h);
  dst.scissorTest = true;
  gl.setRenderTarget(dst);
  gl.render(kit.dsScene, kit.cam);
  dst.scissorTest = false;
}
// Figur zum Zeichnen: eigenes Skelett, Größe (sehr große Figuren verkleinert), keine Schatten
function tribbActor(A, m) {
  const a = makeActor(m);
  if (a.blob) a.blob.visible = false;
  const own = new Set(Object.values(a.meshes));
  a.tribbExtra = [];
  a.group.traverse((o) => {
    if (o === a.blob || own.has(o)) return;
    if (o.isMesh || o.isSprite || o.isPoints || o.isLine) a.tribbExtra.push(o);
  });
  for (const k in a.meshes) {
    const o = a.meshes[k];
    o.frustumCulled = false;
    o.castShadow = false;
    o.receiveShadow = false;
  }
  const bb = m.geos.lit && m.geos.lit.boundingBox;
  const hgt = bb ? bb.max.y * m.scale : 1.3;
  const maxH = TRIBB.maxH[A.kind];
  a.sc = m.scale * (hgt > maxH ? maxH / hgt : 1);
  a.group.scale.setScalar(a.sc);
  return a;
}
// eine Richtung einer Haltung aufnehmen (Farbe und Normalen in doppelter Auflösung ins Zwischenbild)
function tribbView(A, a, blk, d) {
  const gl = V3.gl;
  const kit = tribbKit();
  const ss = TRIBB.ss;
  tribbStrip(kit, blk.w * ss, blk.h * ss);
  tribbCamE(kit, A.E);
  const S = tribbGlSave(gl);
  const cam = kit.cam;
  try {
    gl.setClearColor(0x000000, 0);
    kit.scene.add(a.group);
    const vw = blk.views[d];
    a.group.rotation.set(0, (-d * Math.PI) / (TRIBB.dirs - 1), 0);
    a.group.updateMatrixWorld(true);
    cam.left = vw.x0;
    cam.right = vw.x0 + vw.w;
    cam.bottom = vw.y0;
    cam.top = vw.y0 + vw.h;
    cam.updateProjectionMatrix();
    for (let pass = 0; pass < 2; pass++) {
      const rt = pass ? kit.stripN : kit.strip;
      tribbPass(a, pass, kit);
      if (d === 0) {
        rt.scissorTest = false;
        rt.viewport.set(0, 0, rt.width, rt.height);
        gl.setRenderTarget(rt);
        gl.clear(true, true, false);
      }
      rt.viewport.set(vw.ox * ss, 0, vw.pw * ss, vw.ph * ss);
      rt.scissor.copy(rt.viewport);
      rt.scissorTest = true;
      gl.setRenderTarget(rt);
      gl.clear(false, true, false);
      gl.render(kit.scene, cam);
      rt.scissorTest = false;
    }
  } finally {
    kit.scene.remove(a.group);
    tribbGlRestore(gl, S);
  }
}
// fertige Haltung (alle Richtungen) aus dem Zwischenbild in den Bogen
function tribbDownBlock(A, blk) {
  const gl = V3.gl;
  const kit = tribbKit();
  const ss = TRIBB.ss;
  const S = tribbGlSave(gl);
  try {
    tribbDown(gl, kit, kit.strip, blk.w * ss, blk.h * ss, A.rtA, blk.x, blk.y, blk.w, blk.h, 2);
    tribbDown(gl, kit, kit.stripN, blk.w * ss, blk.h * ss, A.rtN, blk.x / 2, blk.y / 2, blk.w / 2, blk.h / 2, 1);
  } finally {
    tribbGlRestore(gl, S);
  }
}
// Bau einer Figur in kleinen Schritten (yield 0 = Rechenschritt, yield 1 = Aufnahme der Grafikkarte):
// Modell aus seinen Teilen, Teile zusammenführen (in Stücken von 2 ms), Prüfsumme; dann (nicht beim bloßen Prüfen)
// Figur mit Skelett, Umrisse je Haltung, Platz im Bogen und die Aufnahmen je Richtung
function* tribbFigJob(A, v, onlyHash) {
  const id = A.ids[v];
  let geos = null;
  let a = null;
  try {
    const t0 = performance.now();
    const b = new Bake3(true);
    const info = tribbIsolated(A.kind, () => (A.kind === 'turm' ? monsterBuild(b, id, 0) : tribbNpcBuild(b, id)));
    if (!info) throw new Error('kein Modell');
    // nur Körper, Gesicht und Leuchtteile (kein Schattenmodell)
    for (const k in b.lists) if (!TRIBB_GEOS.includes(k)) delete b.lists[k];
    TRIBB.stat.bau = performance.now() - t0;
    yield 0;
    geos = {};
    for (const k of TRIBB_GEOS) {
      const L = b.lists[k];
      if (!L || !L.length) continue;
      geos[k] = yield* tribbMergeJob(L);
      yield 0;
    }
    if (!geos.lit) throw new Error('kein Körper');
    const h = [0x811c9dc5, 0x2545f491];
    for (const k of TRIBB_GEOS) yield* tribbHashGeo(geos[k], h);
    A.fps[v] = (h[0] >>> 0).toString(36) + '.' + (h[1] >>> 0).toString(36);
    if (onlyHash) return;
    const m = Object.assign({ geos }, info);
    m.scale = m.scale || 1;
    m.key = 'tribb:' + id;
    m.gen = V3.ctxGen || 0;
    a = tribbActor(A, m);
    yield 0;
    const gl = V3.gl;
    const kit = tribbKit();
    while (kit.warm < 3) {
      tribbWarm(kit, a, gl);
      yield 1;
    }
    const box = new Float32Array(TRIBB.poses * TRIBB.dirs * 8);
    for (let p = 0; p < TRIBB.poses; p++) yield* tribbBoxesJob(A, a, geos, p, box);
    const blocks = tribbPlace(A, v, box, a.sc);
    if (!blocks) {
      // kein Platz mehr im Bogen: diese Figur fehlt (ihre Zuschauer bekommen eine andere), kein Fehler
      A.full++;
      return;
    }
    yield 0;
    for (let p = 0; p < TRIBB.poses; p++) {
      tribbPose(a, p);
      for (let d = 0; d < TRIBB.dirs; d++) {
        tribbView(A, a, blocks[p], d);
        yield 1;
      }
      tribbDownBlock(A, blocks[p]);
      yield 1;
    }
    A.ok[v] = 1;
    A.done++;
    tribbRemap(A);
    A.rectTex.needsUpdate = true;
    A.ver++;
  } finally {
    if (a) {
      if (a.group.parent) a.group.parent.remove(a.group);
      disposeActor(a);
    }
    if (geos) for (const k in geos) geos[k].dispose();
  }
}
const tribbFp = (A) => A.fps.join(',');
// Teile einer Figur zu einer Geometrie zusammenführen – dasselbe wie mergePartsSteps/mergeFinish (drei-kern.js), nur das
// Umrechnen der Normalen, Farben und Gewichte in Stücken von 4000 Ecken (sonst bis 15 ms am Stück bei großen Figuren)
function* tribbMergeJob(list) {
  const r = yield* mergeRawSteps(list, true, 2);
  yield 0;
  const nv = r.n;
  const nor = new Int8Array(nv * 3);
  const col = new Uint8Array(nv * 3);
  const sw = new Uint8Array(nv * 4);
  const sh = r.anyShine ? new Uint8Array(nv) : null;
  for (let v0 = 0; v0 < nv; v0 += 4000) {
    const v1 = Math.min(nv, v0 + 4000);
    for (let i = v0 * 3; i < v1 * 3; i++) {
      nor[i] = Math.round(Math.max(-1, Math.min(1, r.nor[i])) * 127);
      col[i] = Math.round(Math.max(0, Math.min(1, r.col[i])) * 255);
    }
    for (let i = v0 * 4; i < v1 * 4; i++) sw[i] = Math.round(r.sw[i] * 255);
    if (sh) for (let i = v0; i < v1; i++) sh[i] = Math.round(Math.min(1, r.shine[i]) * 255);
    yield 0;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(r.pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3, true));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
  if (sh) out.setAttribute('shine', new THREE.BufferAttribute(sh, 1, true));
  out.setAttribute('skinIndex', new THREE.BufferAttribute(r.si, 4));
  out.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4, true));
  out.setIndex(new THREE.BufferAttribute(nv > 65535 ? r.idx : Uint16Array.from(r.idx), 1));
  out.computeBoundingSphere();
  out.computeBoundingBox();
  for (const k in out.attributes) out.attributes[k].onUpload(freeArray);
  out.index.onUpload(freeArray);
  return out;
}
// ganzer Bogen: Figur für Figur (misslungene fehlen, ihre Plätze bekommen eine andere), dann Abschluss
function* tribbBakeJob(A) {
  const gl = V3.gl;
  if (!A.next) TRIBB.vorrat[A.kind] = null;
  yield* tribbLooksJob(A.kind);
  if (!A.rtA) {
    tribbAlloc3(A, gl);
    yield 1;
  }
  while (A.next < A.ids.length) {
    const v = A.next;
    try {
      yield* tribbFigJob(A, v, false);
    } catch (err) {
      console.warn('Zuschauerbilder (' + A.ids[v] + '):', err);
      A.fps[v] = 'x';
      if (++A.fails > A.ids.length / 3) {
        A.st = 'aus';
        return;
      }
    }
    A.next = v + 1;
  }
  if (!A.done) {
    A.st = 'aus';
    return;
  }
  const S = tribbGlSave(gl);
  try {
    tribbShrink3(A, gl);
    tribbMips(gl, A.rtA);
    tribbMips(gl, A.rtN);
  } finally {
    tribbGlRestore(gl, S);
  }
  A.fp = tribbFp(A);
  A.st = 'fertig';
  A.ver++;
  TRIBB.vorrat[A.kind] = null;
  // die Hilfsflächen der Aufnahme werden nicht mehr gebraucht
  const kit = TRIBB.kit;
  if (kit && kit.strip) {
    kit.strip.dispose();
    kit.stripN.dispose();
    kit.strip = kit.stripN = null;
  }
  tribbRead3(A);
}
// Verkleinerungsstufen (Mipmaps) erst am Ende, einmal je Bogen; bis dahin ohne (sonst wäre das Bild unvollständig)
function tribbMips(gl, rt) {
  const g = gl.getContext();
  const tp = gl.properties.get(rt.texture);
  if (!tp.__webglTexture) return;
  gl.state.bindTexture(g.TEXTURE_2D, tp.__webglTexture);
  g.generateMipmap(g.TEXTURE_2D);
  g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR_MIPMAP_LINEAR);
  rt.texture.minFilter = THREE.LinearMipmapLinearFilter;
}
// Bogen auf die genutzte Höhe kürzen (die Höhe beim Zeichnen ist geschätzt und reichlich): umkopieren auf der
// Grafikkarte, die v-Werte der Rechtecke anpassen
function tribbShrink3(A, gl) {
  const H2 = Math.max(16, Math.ceil(A.yTop / 16) * 16);
  if (H2 >= A.H) return;
  const kit = tribbKit();
  const opt = { depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
  const copy = (src, w, h) => {
    const dst = new THREE.WebGLRenderTarget(w, h, opt);
    dst.texture.generateMipmaps = false;
    const u = kit.ds.uniforms;
    u.tSrc.value = src.texture;
    u.uSrc.value.set(0, 0, 1, h / src.height);
    u.uQ.value = 0;
    dst.scissorTest = false;
    dst.viewport.set(0, 0, w, h);
    gl.setRenderTarget(dst);
    gl.render(kit.dsScene, kit.cam);
    src.dispose();
    return dst;
  };
  A.rtA = copy(A.rtA, A.W, H2);
  A.rtN = copy(A.rtN, A.W / 2, H2 / 2);
  A.texA = A.rtA.texture;
  A.texN = A.rtN.texture;
  const k = A.H / H2;
  for (let i = 0; i < A.nv; i++) {
    A.rects[i * TRIBB_RS + 1] *= k;
    A.rects[i * TRIBB_RS + 3] *= k;
  }
  A.rectTex.needsUpdate = true;
  A.H = H2;
}
// Für den Zwischenspeicher einmal zurücklesen – ohne Warten: in einen Puffer der Grafikkarte, abgeholt erst, wenn sie
// fertig ist (Fence; das Spiel hält dafür nicht an)
function tribbRead3(A) {
  const gl = V3.gl;
  const g = gl.getContext();
  if (!gl.capabilities.isWebGL2 || typeof g.fenceSync !== 'function' || TRIBB_DB.off || typeof indexedDB === 'undefined') return;
  const S = tribbGlSave(gl);
  const jobs = [];
  try {
    for (const rt of [A.rtA, A.rtN]) {
      rt.scissorTest = false;
      rt.viewport.set(0, 0, rt.width, rt.height);
      gl.setRenderTarget(rt);
      const n = rt.width * rt.height * 4;
      const buf = g.createBuffer();
      g.bindBuffer(g.PIXEL_PACK_BUFFER, buf);
      g.bufferData(g.PIXEL_PACK_BUFFER, n, g.STREAM_READ);
      g.readPixels(0, 0, rt.width, rt.height, g.RGBA, g.UNSIGNED_BYTE, 0);
      g.bindBuffer(g.PIXEL_PACK_BUFFER, null);
      jobs.push({ buf, n });
    }
  } catch (e) {
    g.bindBuffer(g.PIXEL_PACK_BUFFER, null);
    for (const j of jobs) g.deleteBuffer(j.buf);
    return;
  } finally {
    tribbGlRestore(gl, S);
  }
  const sync = g.fenceSync(g.SYNC_GPU_COMMANDS_COMPLETE, 0);
  g.flush();
  A.rb = { sync, jobs, g, t0: performance.now() };
}
function tribbReadDrop(A) {
  const R = A.rb;
  A.rb = null;
  if (!R) return;
  try {
    for (const j of R.jobs) R.g.deleteBuffer(j.buf);
    R.g.deleteSync(R.sync);
  } catch (e) { /* Kontext weg */ }
}
// abholen, sobald die Grafikkarte fertig ist – in Stücken von 1 MB je Bild (kein langer Halt beim Kopieren)
function tribbReadPoll(A) {
  const R = A.rb;
  const g = R.g;
  if (g !== V3.gl.getContext() || g.isContextLost()) {
    A.rb = null;
    return;
  }
  if (!R.ready) {
    if (g.getSyncParameter(R.sync, g.SYNC_STATUS) !== g.SIGNALED) {
      if (performance.now() - R.t0 > 30000) tribbReadDrop(A);
      return;
    }
    R.ready = true;
    R.j = 0;
    R.off = 0;
    R.out = R.jobs.map((j) => new Uint8Array(j.n));
  }
  const CH = 1 << 20;
  const j = R.jobs[R.j];
  const len = Math.min(CH, j.n - R.off);
  try {
    g.bindBuffer(g.PIXEL_PACK_BUFFER, j.buf);
    g.getBufferSubData(g.PIXEL_PACK_BUFFER, R.off, R.out[R.j], R.off, len);
  } catch (e) {
    g.bindBuffer(g.PIXEL_PACK_BUFFER, null);
    tribbReadDrop(A);
    return;
  }
  g.bindBuffer(g.PIXEL_PACK_BUFFER, null);
  R.off += len;
  if (R.off < j.n) return;
  R.j++;
  R.off = 0;
  if (R.j < R.jobs.length) return;
  const out = R.out;
  tribbReadDrop(A);
  const rec = { key: A.key, fp: A.fp, W: A.W, H: A.H, a: out[0].buffer, n: out[1].buffer, rects: A.rects.slice().buffer, ok: Array.from(A.ok) };
  tribbDbPut('3d:' + A.slot, rec).then((ok) => {
    A.saved = !!ok;
    if (ok) tribbDbPut('3d:' + A.slot + ':key', { key: A.key, fp: A.fp, gv: tribbGv() });
  });
}
// Bogen aus dem Zwischenspeicher: leere Bilder anlegen, dann je Schritt 1 MB hochladen (kein langer Halt beim
// Betreten), am Ende die Verkleinerungsstufen auf der Grafikkarte
function* tribbLoadJob(A, rec) {
  const gl = V3.gl;
  const g = gl.getContext();
  yield* tribbLooksJob(A.kind);
  tribbAllocRT(A, gl, rec.W, rec.H);
  yield 1;
  const parts = [[A.rtA, new Uint8Array(rec.a)], [A.rtN, new Uint8Array(rec.n)]];
  for (const [rt, data] of parts) {
    const w = rt.width;
    const rows = Math.max(1, Math.floor((1 << 20) / (w * 4)));
    for (let y = 0; y < rt.height; y += rows) {
      const r = Math.min(rows, rt.height - y);
      const tp = gl.properties.get(rt.texture);
      if (!tp.__webglTexture) throw new Error('Bild fehlt');
      gl.state.bindTexture(g.TEXTURE_2D, tp.__webglTexture);
      g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, false);
      g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      g.pixelStorei(g.UNPACK_ALIGNMENT, 4);
      g.texSubImage2D(g.TEXTURE_2D, 0, 0, y, w, r, g.RGBA, g.UNSIGNED_BYTE, data.subarray(y * w * 4, (y + r) * w * 4));
      yield 1;
    }
  }
  tribbMips(gl, A.rtA);
  tribbMips(gl, A.rtN);
  A.rects.set(new Float32Array(rec.rects));
  A.rectTex = new THREE.DataTexture(A.rects, A.nv * 3, 1, THREE.RGBAFormat, THREE.FloatType);
  A.rectTex.needsUpdate = true;
  A.ok.set(rec.ok);
  A.done = A.ok.reduce((s, x) => s + x, 0);
  A.next = A.ids.length;
  A.fp = rec.fp || '';
  tribbRemap(A);
  A.st = 'fertig';
  A.saved = true;
  A.ver++;
}
// Nach einem Update: die Figuren einmal bauen und ihre Prüfsummen mit denen des gespeicherten Bogens vergleichen (nur
// Rechnen, kein Zeichnen). Gleich: der Bogen gilt für diese Spielversion. Anders: ein neuer Bogen entsteht, der alte
// bleibt bis dahin stehen.
function* tribbCheckJob(A) {
  const T = { ids: A.ids, kind: A.kind, fps: new Array(A.ids.length).fill('') };
  TRIBB.vorrat[A.kind] = null;
  for (let v = 0; v < A.ids.length; v++) {
    try {
      yield* tribbFigJob(T, v, true);
    } catch (e) {
      T.fps[v] = 'x';
    }
  }
  const fp = T.fps.join(',');
  TRIBB.vorrat[A.kind] = null;
  if (fp === A.fp) {
    tribbDbPut('3d:' + A.slot + ':key', { key: A.key, fp, gv: tribbGv() });
    A.chk = 'ok';
  } else {
    A.chk = 'neu';
    if (!TRIBB.nx3[A.slot]) {
      const R = tribbNew3(A.kind, A.mode);
      R.st = 'bau';
      TRIBB.nx3[A.slot] = R;
    }
  }
}
// ein Bauschritt (für Messungen einzeln aufrufbar): true = es geht weiter, sonst 0 (fertig/aus) bzw. 1 (Aufnahme)
function tribbStep3(A) {
  const r = A.job.next();
  if (r.done) {
    A.job = null;
    if (TRIBB.lock === A) TRIBB.lock = null;
    return false;
  }
  return r.value === 1 ? 1 : true;
}
// so viele Schritte, wie die Zeit dieses Bildes erlaubt (höchstens gpuMax Aufnahmen)
function tribbRun(A, need) {
  const gl = V3.gl;
  if (!gl || V3.lost || !gl.capabilities.isWebGL2 || !gl.capabilities.floatVertexTextures) {
    A.st = 'aus';
    return;
  }
  // die Zwischenbilder gehören immer nur einem Bogen: ein anderer wartet. Kommt der andere nicht weiter (man ist
  // weggegangen), beginnt er seine angefangene Figur später neu
  const L = TRIBB.lock;
  if (L && L !== A && L.job) {
    if (performance.now() - (L.stepAt || 0) < 1500) return;
    if (L.st === 'bau') {
      try {
        L.job.return();
      } catch (e) { /* zu Ende */ }
      L.job = null;
    }
  }
  if (!A.job) return;
  TRIBB.lock = A;
  A.stepAt = performance.now();
  const ms = tribbBudget(need);
  const gpuMax = tribbGpuMax(need);
  const t0 = performance.now();
  let n = 0;
  let gpu = 0;
  try {
    for (;;) {
      const r = tribbStep3(A);
      n++;
      if (!r) break;
      if (r === 1 && ++gpu >= gpuMax) break;
      if (performance.now() - t0 >= ms) break;
    }
  } catch (err) {
    console.warn('Zuschauerbilder:', err);
    A.job = null;
    if (TRIBB.lock === A) TRIBB.lock = null;
    if (A.st === 'lade') {
      // Laden misslungen: neu zeichnen
      for (const k of ['rtA', 'rtN']) if (A[k]) A[k].dispose();
      A.rtA = A.rtN = A.texA = A.texN = null;
      A.st = 'bau';
    } else if (A.st === 'bau') A.st = 'aus';
    else if (A.chk === 'läuft') A.chk = 'ok';
  }
  const dt = performance.now() - t0;
  const T = TRIBB.stat;
  T.schritte += n;
  T.ms += dt;
  if (dt > T.max) T.max = dt;
}
// Bogen einer Art bereitstellen: Zwischenspeicher fragen, sonst Schritt für Schritt zeichnen (need wie tribbSoon)
function tribbTick3(kind, mode, need) {
  const A = tribbA3(kind, mode);
  if (A.st === 'neu') {
    A.st = 'frage';
    tribbDbGet('3d:' + A.slot + ':key').then((k) => {
      if (TRIBB.at3[A.slot] !== A || A.st !== 'frage') return;
      if (k && k.key === A.key) {
        A.st = 'da';
        A.fp = k.fp || '';
        A.chk = k.gv === tribbGv() ? 'ok' : 'offen';
      } else A.st = 'bau';
    }, () => {
      if (A.st === 'frage') A.st = 'bau';
    });
  } else if (A.st === 'da' && need >= 2) {
    A.st = 'suche';
    tribbDbGet('3d:' + A.slot).then((rec) => {
      if (TRIBB.at3[A.slot] !== A || A.st !== 'suche') return;
      if (rec && rec.key === A.key && rec.a && rec.n && rec.a.byteLength === rec.W * rec.H * 4 && rec.n.byteLength === rec.W * rec.H) {
        A.st = 'lade';
        A.job = tribbLoadJob(A, rec);
      } else A.st = 'bau';
    }, () => {
      if (A.st === 'suche') A.st = 'bau';
    });
  }
  if (A.st === 'bau' && !A.job) A.job = tribbBakeJob(A);
  if (A.st === 'fertig' && A.chk === 'offen' && !A.job && !TRIBB.lock) {
    A.chk = 'läuft';
    A.job = tribbCheckJob(A);
  }
  if (A.job && (need >= 2 || !(TRIBB_T.frame & 1))) tribbRun(A, need);
  if (A.rb) tribbReadPoll(A);
  // geänderte Figuren: neuer Bogen, der den alten ersetzt, sobald er fertig ist
  const R = TRIBB.nx3[A.slot];
  if (R) {
    if (R.st === 'bau' && !R.job) R.job = tribbBakeJob(R);
    if (R.job && !A.job && (need >= 2 || !(TRIBB_T.frame & 1))) tribbRun(R, need);
    if (R.rb) tribbReadPoll(R);
    if (R.st === 'fertig') {
      delete TRIBB.nx3[A.slot];
      const shown = TRIBB.at[kind] === A;
      tribbDrop3(A);
      TRIBB.at3[R.slot] = R;
      if (shown) TRIBB.at[kind] = R;
      R.usedAt = performance.now();
      return R;
    }
    if (R.st === 'aus') delete TRIBB.nx3[A.slot];
  }
  return A;
}
const tribbUsable = (X) => !!(X && X.done > 0 && X.texA && X.rectTex && (X.st === 'bau' || X.st === 'fertig'));
// für trib3Frame: Bogen mit mindestens einer fertigen Figur, false (noch nicht) oder null (geht nicht). Der Bogen der
// eingestellten Kamera ersetzt einen fertigen der anderen erst, wenn er selbst fertig ist
function tribbFans3(kind) {
  if (typeof THREE === 'undefined' || typeof buildNpc3 !== 'function' || typeof Bake3 === 'undefined' || typeof mergeRawSteps !== 'function' || !V3.gl) return null;
  TRIBB_T.frame++;
  const now = performance.now();
  const A = tribbTick3(kind, tribbMode(), 2);
  A.usedAt = now;
  const S = TRIBB.at[kind];
  if (S !== A && tribbUsable(A) && (A.st === 'fertig' || !tribbUsable(S) || S.st !== 'fertig')) TRIBB.at[kind] = A;
  const X = TRIBB.at[kind];
  // nicht mehr gebrauchte Bögen (andere Kameraart) nach 2 Minuten von der Grafikkarte nehmen
  for (const k in TRIBB.at3) {
    const B = TRIBB.at3[k];
    if (B !== X && B !== A && B.st === 'fertig' && B.saved && !B.rb && !B.job && now - B.usedAt > 120000) tribbDrop3(B);
  }
  if (tribbUsable(X)) {
    X.usedAt = now;
    return X;
  }
  return A.st === 'aus' ? null : false;
}
// außerhalb der Hallen (aus trib3Frame): vorab zeichnen, wenn man bald hin will. Fertige Bögen, die im Zwischenspeicher
// liegen, von der Grafikkarte nehmen: nach einem Besuch nach 2 Minuten (wer gleich wieder hineingeht, muss nichts neu
// hochladen), vorab gezeichnete gleich
function tribbIdle3() {
  TRIBB_T.frame++;
  if (typeof game === 'undefined' || !game.running || !game.player || V3.lost || document.hidden) return;
  if (typeof FULL3 !== 'undefined' && FULL3.loading) {
    tribbPrewarm();
    return;
  }
  // sonst gleich nach dem Vorwärmen der Effekte (drei-fx.js, kurz nach dem Start)
  if (!TRIBB.warmed && V3.fxWarm) tribbPrewarm();
  const now = performance.now();
  const mode = tribbMode();
  for (const kind of ['arena', 'turm']) {
    const need = tribbSoon(kind);
    if (need) tribbTick3(kind, mode, need);
  }
  for (const k in TRIBB.at3) {
    const B = TRIBB.at3[k];
    if (B.st === 'fertig' && B.saved && !B.rb && !B.job && !TRIBB.nx3[k] && now - B.usedAt > (B.shownOnce ? 120000 : 0) && !(tribbSoon(B.kind) && B.mode === mode)) tribbDrop3(B);
  }
}

// Shaderprogramme der Zuschauer einmal je Sitzung vorab übersetzen, wenn die Figur in die Arena darf – hinter dem
// Ladebild (Kartenwechsel, FULL3.loading) oder gleich nach dem Vorwärmen der Effekte kurz nach dem Start: die vier der
// Aufnahme (Farbe, Normalen, Umriss, Verkleinern) und das des Zuschauer-Meshes. Sonst übersetzt sie der Treiber beim
// ersten Bau bzw. beim ersten Bild in der Halle (je Programm ein Ruck)
function tribbPrewarm() {
  if (TRIBB.warmed || typeof THREE === 'undefined' || !V3.gl || !V3.gl.capabilities.isWebGL2 || !V3.gl.capabilities.floatVertexTextures) return;
  const p = game.player;
  if (!p || typeof ARENA === 'undefined' || (p.level || 0) < ARENA.minLevel) return;
  TRIBB.warmed = true;
  const gl = V3.gl;
  const tmp = [];
  try {
    const kit = tribbKit();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.1, 0, 0, 0, 0.1, 0], 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1, 1, 1, 1, 1, 1, 1], 3));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(12).fill(0), 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
    tmp.push(geo);
    const bone = new THREE.Bone();
    const sk = new THREE.Skeleton([bone]);
    const grp = new THREE.Group();
    grp.add(bone);
    for (const m of [kit.alb, kit.nrm, kit.out]) {
      const o = new THREE.SkinnedMesh(geo, m);
      o.bind(sk);
      o.frustumCulled = false;
      grp.add(o);
    }
    kit.scene.add(grp);
    try {
      gl.compile(kit.scene, kit.cam);
      gl.compile(kit.dsScene, kit.cam);
    } finally {
      kit.scene.remove(grp);
      sk.dispose();
    }
    kit.warm = 3;
    // Zuschauer-Mesh mit einem leeren Bogen (1 × 1)
    const tex = () => {
      const t = new THREE.DataTexture(new Uint8Array(4), 1, 1, THREE.RGBAFormat);
      t.needsUpdate = true;
      tmp.push(t);
      return t;
    };
    const ids = TRIBB.arena;
    const nv = ids.length * TRIBB.poses * TRIBB.dirs;
    const rt = new THREE.DataTexture(new Float32Array(nv * 3 * 4), nv * 3, 1, THREE.RGBAFormat, THREE.FloatType);
    rt.needsUpdate = true;
    tmp.push(rt);
    const D = { texA: tex(), texN: tex(), rectTex: rt, W: 1, H: 1, nv, E: TRIBB.E.f, mat: null };
    const K = { fans: [], kind: 'arena' };
    const mesh = tribbMesh3(K, Object.assign(D, { ids, map: new Int16Array(ids.length), ver: 0 }));
    mesh.visible = true;
    tmp.push(mesh.geometry, D.mat);
    const sc = new THREE.Scene();
    sc.fog = V3.scene.fog;
    sc.add(mesh);
    gl.compile(sc, V3.camera);
  } catch (err) {
    console.warn('Zuschauer vorwärmen:', err);
  } finally {
    for (const o of tmp) if (o && o.dispose) o.dispose();
  }
}

// --- 3D: ein Mesh für alle Zuschauer -------------------------------------------------------------------------------
const TRIBB_VS = `
attribute vec4 aP;
attribute vec4 aV;
attribute float aD;
uniform sampler2D uRects;
uniform float uRectK;
uniform vec2 uPD;
uniform float uTime;
uniform float uHype;
uniform vec4 uSee;
uniform vec2 uClip;
uniform float uCosE;
uniform float uE;
uniform float uKeep;
uniform vec4 uPL[4];
uniform vec3 uPC[4];
varying vec2 vUv;
varying float vFlip;
varying vec2 vRot;
varying vec3 vPC;
varying vec3 vPD;
varying float vFog;
varying float vTint;
vec4 tribRect(float view, float k) {
	return texture2D(uRects, vec2((view * 3.0 + k + 0.5) * uRectK, 0.5));
}
// Ecke id (0 … 7, gegen den Uhrzeigersinn ab unten links) des Achtecks: Rechteck lo … hi, schräg abgeschnitten bei
// x + y = g.x … g.y und x − y = g.z … g.w; reicht ein Schnitt nicht ins Rechteck, fallen zwei Ecken zusammen
vec2 tribOct(float id, vec2 lo, vec2 hi, vec4 g) {
	if (id < 0.5) return vec2(clamp(g.x - lo.y, lo.x, hi.x), lo.y);
	if (id < 1.5) return vec2(clamp(g.w + lo.y, lo.x, hi.x), lo.y);
	if (id < 2.5) return vec2(hi.x, clamp(hi.x - g.w, lo.y, hi.y));
	if (id < 3.5) return vec2(hi.x, clamp(g.y - hi.x, lo.y, hi.y));
	if (id < 4.5) return vec2(clamp(g.y - hi.y, lo.x, hi.x), hi.y);
	if (id < 5.5) return vec2(clamp(g.z + hi.y, lo.x, hi.x), hi.y);
	if (id < 6.5) return vec2(lo.x, clamp(lo.x - g.z, lo.y, hi.y));
	return vec2(lo.x, clamp(g.x - lo.x, lo.y, hi.y));
}
void main() {
	float seed = aV.z;
	float tPh = seed * 6.2832;
	float tRate = 2.4 + fract(seed * 7.13) * 1.8;
	float tMine = clamp(uHype * (0.55 + fract(seed * 3.71) * 0.9), 0.0, 1.0);
	float tCyc = uTime * 0.25 + seed * 7.0;
	float tU = fract(tCyc);
	float tIdle = step(0.86, fract(seed * 11.3 + floor(tCyc) * 0.618)) * 0.45 * smoothstep(0.0, 0.2, tU) * (1.0 - smoothstep(0.8, 1.0, tU));
	float tEx = max(tMine, tIdle);
	float tUp = clamp(tEx * 1.4 - 0.25 + 0.35 * sin(uTime * tRate * 0.5 + tPh * 1.7), 0.0, 1.0);
	float tS = max(0.0, sin(uTime * tRate + tPh));
	float hop = tS * tS * (0.03 + 0.42 * tEx);
	vec4 wc = modelMatrix * vec4(aP.xyz, 1.0);
	// unter Last (Lastschutz) und beim Wärmeschutz nur ein Teil der Zuschauer (uKeep); Figur fehlt (noch): weg
	float vis = step(fract(seed * 5.31), uKeep) * step(0.0, aV.x);
	vec3 mid = wc.xyz + vec3(0.0, 0.6, 0.0);
	if (uClip.x > 0.5) {
		if (-(viewMatrix * vec4(mid, 1.0)).z < uClip.y) vis = 0.0;
	} else if (uSee.w > 0.5) {
		vec3 tD = cameraPosition - uSee.xyz;
		float tT = dot(mid - uSee.xyz, tD) / dot(tD, tD);
		if (tT > 0.0 && tT < 1.0 && length(mid - uSee.xyz - tD * tT) < 1.15) vis = 0.0;
	}
	// Haltung wie in 2D (tribMove): 0 Arme unten, 1 halb, 2 oben – ohne Überblenden
	float nP = uPD.x;
	float nD = uPD.y;
	float pz = min(tUp > 0.66 ? 2.0 : (tUp > 0.3 ? 1.0 : 0.0), nP - 1.0);
	// Richtung und Spiegelung legt tribbDirs3 je Zuschauer fest (aD = Richtung + 16, wenn gespiegelt)
	float flip = step(15.5, aD);
	float dd = clamp(aD - 16.0 * flip, 0.0, nD - 1.0);
	float view = max(aV.x, 0.0) * nP * nD + pz * nD + dd;
	vec4 uv = tribRect(view, 0.0);
	vec4 xy = tribRect(view, 1.0);
	vec4 dg = tribRect(view, 2.0);
	// Achteck um das Bild (Einheiten, Füße bei 0): nur dort, wo die Figur sein kann
	vec2 q = tribOct(position.x, xy.xy, xy.xy + xy.zw, dg);
	vec2 l = (q - xy.xy) / max(xy.zw, vec2(1e-4));
	vUv = uv.xy + l * uv.zw;
	vFlip = flip;
	// Höhe wie eine echte Figur aus diesem Blickwinkel (gestaucht oder gestreckt gegenüber der Aufnahme); die Normalen
	// um den Unterschied der Blickhöhe drehen
	vec2 toC = cameraPosition.xz - wc.xz;
	float sc = aV.y * vis;
	float cosA = clamp(length(toC) / max(0.001, length(cameraPosition - wc.xyz)), 0.0, 1.0);
	float k = clamp(cosA / uCosE, 0.8, 1.25);
	float dl = acos(cosA) - uE;
	vRot = vec2(cos(dl), sin(dl));
	float sway = sin(uTime * tRate * 0.31 + tPh * 2.3) * (0.015 + 0.04 * tEx);
	vec4 mv = viewMatrix * vec4(wc.xyz + vec3(0.0, hop * aV.y, 0.0), 1.0);
	mv.x += ((flip > 0.5 ? -q.x : q.x) + sway * q.y) * sc;
	mv.y += q.y * sc * k;
	// etwas zur Kamera gerückt: die Stufe dahinter schneidet nicht in die Figur
	mv.z += 0.3 * sc;
	vFog = -mv.z;
	vTint = aV.w;
	// die vier nächsten warmen Lichter (Feuerbecken), wie bei den echten Figuren mit Abfall nach der Entfernung
	vec3 pc = vec3(0.0);
	vec3 pd = vec3(0.0);
	for (int i = 0; i < 4; i++) {
		if (uPL[i].w > 0.0) {
			vec3 L = uPL[i].xyz - mid;
			float dist = length(L);
			float at = clamp(1.0 - dist / uPL[i].w, 0.0, 1.0);
			vec3 c = uPC[i] * at * at;
			pc += c;
			pd += L / max(dist, 0.001) * (c.r + c.g + c.b);
		}
	}
	vPC = pc;
	vec3 pv = (viewMatrix * vec4(pd, 0.0)).xyz;
	vPD = dot(pv, pv) > 1e-10 ? normalize(pv) : vec3(0.0, 0.0, 1.0);
	gl_Position = projectionMatrix * mv;
}`;
// Licht wie MeshToonMaterial + addRimShine (drei-kern.js): Himmel/Boden nach der Normalen, Sonne und warme Lichter mit
// den drei Zeichentrick-Stufen (toonRamp), Randlicht; Umriss und Leuchtteile (keine Normale) unbeleuchtet.
// Vergrößert (mehr Bildschirm- als Bildpunkte) wird die Kante schärfer gerechnet: Übergang über einen Bildschirmpunkt
// statt über einen vergrößerten Bildpunkt
const TRIBB_FS = `
uniform sampler2D uAlb;
uniform sampler2D uNrm;
uniform vec2 uTexS;
uniform vec3 uSky;
uniform vec3 uGround;
uniform vec3 uUp;
uniform vec3 uSunC;
uniform vec3 uSunD;
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;
varying vec2 vUv;
varying float vFlip;
varying vec2 vRot;
varying vec3 vPC;
varying vec3 vPD;
varying float vFog;
varying float vTint;
vec3 tribRamp(float d) {
	float t = d * 0.5 + 0.5;
	return mix(mix(vec3(0.5, 0.5, 0.66), vec3(0.8, 0.79, 0.88), clamp((t - 0.3) / 0.08, 0.0, 1.0)), vec3(1.0), clamp((t - 0.58) / 0.08, 0.0, 1.0));
}
void main() {
	// k: Bildschirmpunkte je Bildpunkt (vergrößert > 1). Deckung aus dem weich gefilterten Bild, an der Kante auf einen
	// Bildschirmpunkt zusammengezogen; die Farbe vergrößert „scharf bilinear“ (zwischen zwei Bildpunkten nur über einen
	// Bildschirmpunkt überblendet) – Umrisslinie, Augen und Brauen bleiben klar wie an der echten Figur
	vec2 tx = fwidth(vUv) * uTexS;
	float k = clamp(1.0 / max(max(tx.x, tx.y), 1e-3), 1.0, 4.0);
	vec4 c = texture2D(uAlb, vUv, -0.4);
	if (c.a < 0.04) discard;
	float a = clamp((c.a - 0.5) * k + 0.5, 0.0, 1.0);
	if (a < 0.02) discard;
	vec4 cs = c;
	if (k > 1.05) {
		vec2 p = vUv * uTexS;
		vec4 s = texture2D(uAlb, (floor(p) + 0.5 + clamp((fract(p) - 0.5) * k, -0.5, 0.5)) / uTexS);
		if (s.a > 0.1) cs = s;
	}
	vec4 n = texture2D(uNrm, vUv, -0.4);
	vec3 N = n.a > 0.01 ? normalize(n.rgb / n.a * 2.0 - 1.0) : vec3(0.0, 0.0, 1.0);
	if (vFlip > 0.5) N.x = -N.x;
	N = vec3(N.x, N.y * vRot.x - N.z * vRot.y, N.y * vRot.y + N.z * vRot.x);
	float lit = clamp(n.a / c.a, 0.0, 1.0);
	vec3 alb = cs.rgb / cs.a;
	vec3 L = mix(uGround, uSky, dot(N, uUp) * 0.5 + 0.5) + uSunC * tribRamp(dot(N, uSunD)) + vPC * tribRamp(dot(N, vPD));
	float rim = smoothstep(0.55, 0.92, 1.0 - clamp(N.z, 0.0, 1.0));
	vec3 rimC = rim * mix(vec3(0.22, 0.24, 0.42), vec3(0.95, 0.78, 0.55), clamp(dot(N, uSunD) * 0.5 + 0.5, 0.0, 1.0)) * 0.42 * (0.4 + 0.6 * alb);
	vec3 col = mix(alb, alb * L + rimC, lit) * vTint;
	#ifdef USE_FOG
	col = mix(col, fogColor, smoothstep(fogNear, fogFar, vFog));
	#endif
	gl_FragColor = vec4(col * a, a);
}`;
// gemeinsame Werte aller Zuschauer-Materialien (je Bild aus dem Licht der Welt, tribbFrame3)
function tribbLU() {
  if (!TRIBB.LU) {
    TRIBB.LU = {
      keep: { value: 1 }, sky: { value: new THREE.Color(1, 1, 1) }, ground: { value: new THREE.Color(0.3, 0.3, 0.3) }, up: { value: new THREE.Vector3(0, 1, 0) },
      sunC: { value: new THREE.Color(0.8, 0.8, 0.8) }, sunD: { value: new THREE.Vector3(0, 0, 1) },
      pl: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) }, pc: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) }
    };
  }
  return TRIBB.LU;
}
function tribbMat3(A) {
  if (A.mat && A.mat.uniforms.uAlb.value === A.texA && A.mat.uniforms.uRects.value === A.rectTex) {
    A.mat.uniforms.uTexS.value.set(A.W, A.H);
    return A.mat;
  }
  if (A.mat) A.mat.dispose();
  const U = tribbLU();
  A.mat = new THREE.ShaderMaterial({
    uniforms: Object.assign(THREE.UniformsUtils.clone(THREE.UniformsLib.fog), {
      uAlb: { value: A.texA }, uNrm: { value: A.texN }, uTexS: { value: new THREE.Vector2(A.W, A.H) }, uRects: { value: A.rectTex }, uRectK: { value: 1 / (A.nv * 3) },
      uPD: { value: new THREE.Vector2(TRIBB.poses, TRIBB.dirs) }, uTime: TRIB3.uTime, uHype: TRIB3.uHype, uSee: TRIB3.uSee,
      uClip: TRIB3.uClip, uCosE: { value: Math.cos(A.E) }, uE: { value: A.E }, uKeep: U.keep, uPL: U.pl, uPC: U.pc,
      uSky: U.sky, uGround: U.ground, uUp: U.up, uSunC: U.sunC, uSunD: U.sunD
    }),
    vertexShader: TRIBB_VS,
    fragmentShader: TRIBB_FS,
    extensions: { derivatives: true },
    fog: true,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor
  });
  return A.mat;
}
// Zuschauer einer Halle als ein Mesh; die hinteren Reihen zuerst (halbdurchsichtige Kanten liegen richtig über denen
// dahinter). Je Zuschauer: Platz und Blickrichtung (aP), Figur, Größe, Zufall, Helligkeit (aV), Richtung des Bildes (aD)
function tribbMesh3(K, A) {
  const dichte = tribDichte();
  const idx = [];
  for (let j = 0; j < K.fans.length; j++) if (K.fans[j].keep <= dichte) idx.push(j);
  idx.sort((a, b) => K.fans[b].row - K.fans[a].row || K.fans[a].seed - K.fans[b].seed);
  const figs = tribbAssign(K, A.ids.length);
  const n = idx.length;
  const geo = new THREE.InstancedBufferGeometry();
  // Achteck: Ecke 0 … 7 (die Lage rechnet der Shader aus dem Bild), Fächer aus sechs Dreiecken
  geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 0, 4, 0, 0, 5, 0, 0, 6, 0, 0, 7, 0, 0], 3));
  geo.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6, 0, 6, 7]);
  const P = new Float32Array(Math.max(1, n) * 4);
  const Vv = new Float32Array(Math.max(1, n) * 4);
  const Dd = new Float32Array(Math.max(1, n));
  const fr = (x) => x - Math.floor(x);
  for (let i = 0; i < n; i++) {
    const f = K.fans[idx[i]];
    P.set([f.x, f.h, f.y, Math.atan2(-f.nx, -f.ny)], i * 4);
    Vv.set([A.map[figs[idx[i]]], 0.93 + 0.14 * fr(f.seed * 53.3), f.seed, 0.92 + 0.14 * fr(f.seed * 29.7)], i * 4);
  }
  geo.setAttribute('aP', new THREE.InstancedBufferAttribute(P, 4));
  geo.setAttribute('aV', new THREE.InstancedBufferAttribute(Vv, 4));
  geo.setAttribute('aD', new THREE.InstancedBufferAttribute(Dd, 1));
  geo.instanceCount = n;
  const mesh = new THREE.Mesh(geo, tribbMat3(A));
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.visible = n > 0;
  mesh.name = 'tribZuschauer';
  mesh.userData = { bild: true, idx, figs, ver: A.ver, n, dirAt: null, fresh: true };
  return mesh;
}
// weitere Figuren sind fertig: Zuordnung der Zuschauer erneuern (nur eine Zahl je Zuschauer)
function tribbRemap3(mesh, A) {
  const u = mesh.userData;
  const at = mesh.geometry.attributes.aV;
  for (let i = 0; i < u.idx.length; i++) at.array[i * 4] = A.map[u.figs[u.idx[i]]];
  at.needsUpdate = true;
  u.ver = A.ver;
}
// Richtung des Bildes je Zuschauer (0 von vorn … dirs − 1 von hinten, +16 = gespiegelt für die andere Seite): erst
// wechseln, wenn der Blickwinkel ein Stück (hys) über die Mitte zwischen zwei Aufnahmen hinaus ist – so springt ein
// Zuschauer nicht hin und her, wenn die Kamera an einer Grenze wackelt. Nur nach einer Bewegung der Kamera.
function tribbDirs3(mesh) {
  const u = mesh.userData;
  const cp = V3.camera.position;
  const g = mesh.parent;
  if (!g) return;
  if (!u.fresh && u.cx === cp.x && u.cz === cp.z && u.gx === g.position.x && u.gz === g.position.z) return;
  u.cx = cp.x;
  u.cz = cp.z;
  u.gx = g.position.x;
  u.gz = g.position.z;
  const at = mesh.geometry.attributes.aD;
  const D = at.array;
  const P = mesh.geometry.attributes.aP.array;
  const nD = TRIBB.dirs;
  const step = Math.PI / (nD - 1);
  const lim = 0.5 + TRIBB.hys;
  const TAU = Math.PI * 2;
  let ch = 0;
  for (let i = 0; i < u.n; i++) {
    let rel = Math.atan2(cp.x - (g.position.x + P[i * 4]), cp.z - (g.position.z + P[i * 4 + 2])) - P[i * 4 + 3];
    rel -= Math.round(rel / TAU) * TAU;
    const dc = Math.abs(rel) / step;
    const old = D[i];
    let d = old >= 16 ? old - 16 : old;
    if (u.fresh || Math.abs(dc - d) > lim) d = Math.min(nD - 1, Math.round(dc));
    const val = d + (d > 0 && d < nD - 1 && rel < 0 ? 16 : 0);
    if (val !== old) {
      D[i] = val;
      ch++;
    }
  }
  if (!u.fresh) TRIBB.stat.wechsel += ch;
  u.fresh = false;
  if (ch) at.needsUpdate = true;
}
// Je Bild (trib3Frame): Licht der Welt in den Raum der Kamera, warme Lichter, Anteil der Zuschauer
// (Lastschutz Stufe 1: drei Viertel, Stufe 2 oder Wärmeschutz mit weniger Bildern: die Hälfte), Richtungen
function tribbFrame3(mesh, A) {
  const U = tribbLU();
  const lv = typeof LOAD !== 'undefined' ? LOAD.level : 0;
  const hot = typeof HEAT !== 'undefined' && HEAT.fps;
  U.keep.value = lv >= 2 || hot ? 0.5 : lv === 1 ? 0.75 : 1;
  A.shownOnce = true;
  if (mesh.material !== tribbMat3(A)) mesh.material = A.mat;
  if (mesh.userData.ver !== A.ver) tribbRemap3(mesh, A);
  const cam = V3.camera;
  cam.updateMatrixWorld();
  tribbDirs3(mesh);
  const vm = cam.matrixWorldInverse;
  const h = V3.hemi;
  const s = V3.sun;
  if (h) {
    U.sky.value.copy(h.color).multiplyScalar(h.intensity);
    U.ground.value.copy(h.groundColor).multiplyScalar(h.intensity);
    U.up.value.set(0, 1, 0).transformDirection(vm);
  }
  if (s) {
    U.sunC.value.copy(s.color).multiplyScalar(s.intensity);
    U.sunD.value.subVectors(s.position, s.target.position).normalize().transformDirection(vm);
  }
  const pts = V3.points || [];
  for (let i = 0; i < 4; i++) {
    const l = pts[i];
    const pl = U.pl.value[i];
    if (l && l.visible !== false && l.intensity > 0.002) {
      pl.set(l.position.x, l.position.y, l.position.z, l.distance || 5);
      U.pc.value[i].set(l.color.r * l.intensity, l.color.g * l.intensity, l.color.b * l.intensity);
    } else pl.w = 0;
  }
}

// =====================================================================================================================
// 2D
// =====================================================================================================================
// Auflösung der 2D-Bilder (Bildpunkte je Einheit der Zeichnungen) nach Zoom und Pixeldichte der Zeichenfläche
function tribb2S() {
  const z = (renderer.zoom || 1) * (renderer.dpr || 1);
  return Math.max(1, Math.min(3, Math.ceil(z * 0.9 * 4) / 4));
}
// Bewohner, deren Zeichnung hinter dem Rücken Stab, Speer oder Köcher hat (wie in 3D ohne)
const TRIBB2_NOBEHIND = new Set(['aeltester', 'jaegerin', 'wache', 'bogenmacher', 'lehrmeister']);
// Zeichnung eines Bewohners von vorn mit erhobenen Armen: dieselbe Zeichnung wie in der Stadt (NPC_ART), nur Arme
// (Laufbild der Kraftpose, halb oder ganz erhoben) und ohne Gegenstände in der Hand
function tribb2Front(ctx, id, pose) {
  const w0 = WALK[0];
  const va = window.villagerArt;
  const hw = window.heldWeapon;
  const sa = window.shieldArt;
  const ha = window.hArms;
  const skip = TRIBB2_NOBEHIND.has(id);
  if (pose) WALK[0] = { l: 0, r: 0, bob: pose === 1 ? -0.6 : -1.2, arm: 0, raise: true };
  window.villagerArt = (c, o) => va(c, Object.assign({}, o, { extra: null, behind: skip ? null : o.behind }));
  window.heldWeapon = () => {};
  window.shieldArt = () => {};
  if (pose === 1) {
    window.hArms = function (c, dir, w, o) {
      const r = c.rotate;
      c.rotate = (x) => r.call(c, x * 0.68);
      try {
        return ha(c, dir, w, o);
      } finally {
        delete c.rotate;
      }
    };
  }
  try {
    NPC_ART[id](ctx);
  } finally {
    WALK[0] = w0;
    window.villagerArt = va;
    window.heldWeapon = hw;
    window.shieldArt = sa;
    window.hArms = ha;
  }
}
// Von hinten (Südrang, der Blick geht zur Arena): Beine, Körper, Arme und Kopf von hinten in den Farben der Figur
// (npcModelDef), Haare nach Frisur und Farbe, Hüte, Helme und Haarbänder aus der Zeichnung von vorn (nur der Teil
// über der Stirn, Bärte und Gesicht nicht)
function tribb2Back(ctx, id, pose) {
  const c = npcModelDef(id) || {};
  const form = (typeof NPC_FORM !== 'undefined' && NPC_FORM[id]) || {};
  const rec = captureArt(NPC_ART[id]);
  const call = rec.calls.find((x) => x.fn === 'villagerArt');
  const vo = call ? call.o : null;
  const torso = c.torso || c.robe || '#7a5a3a';
  const o = {
    skin: c.skin || '#e0b896', torso, sleeve: c.sleeve || torso, pants: c.pants || darker(torso, 0.3), boots: c.boots || '#2a1e16',
    robe: c.robe, wideSleeves: c.wideSleeves, cuff: c.cuff, gloves: c.gloves, wide: vo ? vo.wide : (form.bulk || 1) > 1.08 ? 1.12 : undefined
  };
  const w = pose ? { l: 0, r: 0, bob: pose === 1 ? -0.6 : -1.2, arm: 0, raise: true } : WALK[0];
  const sc = vo && vo.scale ? vo.scale : 1;
  ctx.save();
  if (sc !== 1) ctx.scale(sc, sc);
  hLegs(ctx, 'up', w, o);
  const half = hBody(ctx, 'up', w, o);
  if (c.belt) box(ctx, -half, -12.5 + w.bob, half * 2, 2.6, 1, c.belt);
  const ha = window.hArms;
  if (pose === 1) {
    const r = ctx.rotate;
    ctx.rotate = (x) => r.call(ctx, x * 0.68);
    try {
      ha(ctx, 'up', w, o);
    } finally {
      delete ctx.rotate;
    }
  } else ha(ctx, 'up', w, o);
  // Umhang und langes Haar liegen von hinten vorn
  if (vo && vo.behind && !TRIBB2_NOBEHIND.has(id)) vo.behind(ctx);
  const { cx, cy } = hHead(ctx, 'up', w, o);
  const hair = c.hair;
  if (hair && hair.style !== 5) {
    const col = hair.color;
    if (hair.style === 1 || hair.style === 2) box(ctx, cx - 10, cy - 2, 20, hair.style === 2 ? 17 : 12, 5, col);
    oval(ctx, cx, cy - 0.6, 11.3, 10.6, col);
    if (hair.style === 4) box(ctx, cx - 2.2, cy + 2, 4.4, 11, 2, col);
    stroke(ctx, darker(col, 0.25), 0.6, [[cx - 4, cy - 7], [cx - 2, cy + 4]]);
    stroke(ctx, darker(col, 0.25), 0.6, [[cx + 4, cy - 7], [cx + 2, cy + 4]]);
  }
  if (vo && vo.head) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - 40, cy - 60, 80, 56);
    ctx.clip();
    vo.head(ctx, cx, cy);
    ctx.restore();
  } else if (c.band) box(ctx, cx - 11.2, cy - 6.5, 22.4, 3, 1.2, c.band);
  ctx.restore();
}
// Bild einer Figur (Arena: 0–2 von vorn mit Armhaltung 0–2, 3–5 von hinten; Turm: Laufbild 0, 1, 3 von der Seite),
// mit Umriss wie die Figuren des Spiels (bakeSprite) und auf den Umriss zugeschnitten
function tribb2Sprite(kind, id, s, S) {
  let bounds;
  let draw;
  if (kind === 'turm') {
    const art = MONSTER_ART[id];
    if (!art) return null;
    const fit = Math.min(1, 46 / art.h);
    const k = Math.max(1, art.h / 30);
    bounds = { x: -36 * k * fit, y: (-art.h - 14) * fit, w: 72 * k * fit, h: (art.h + 20) * fit };
    const frame = [0, 1, 3][s];
    draw = (ctx) => {
      ctx.scale(fit, fit);
      art.draw(ctx, frame);
    };
  } else {
    if (!NPC_ART[id]) return null;
    bounds = { x: -27, y: -70, w: 54, h: 74 };
    draw = (ctx) => (s >= 3 ? tribb2Back(ctx, id, s - 3) : tribb2Front(ctx, id, s));
  }
  const sp = bakeSprite(bounds, draw, S, true);
  const cv = sp.img;
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
  let x0 = cv.width;
  let y0 = cv.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < cv.height; y++) {
    const o = y * cv.width * 4;
    for (let x = 0; x < cv.width; x++) {
      if (d[o + x * 4 + 3] < 6) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;
  return { cv, sx: x0, sy: y0, sw: x1 - x0 + 1, sh: y1 - y0 + 1, ox: bounds.x + x0 / S, oy: bounds.y + y0 / S };
}
function tribbA2(kind) {
  const S = tribb2S();
  let B = TRIBB.at2[kind];
  if (B && B.S !== S && B.st !== 'bau') {
    tribbDrop2(B);
    B = null;
  }
  if (!B) {
    const ids = TRIBB[kind];
    const per = kind === 'turm' ? 3 : 6;
    B = {
      kind, ids, S, per, key: tribbKey(kind, '2d', S), st: 'neu', rects: new Float32Array(ids.length * per * 8), ok: new Uint8Array(ids.length),
      map: new Int16Array(ids.length).fill(-1), done: 0, next: 0, sub: 0, fails: 0, cv: null, cx: null, img: null, W: S > 2 ? 2048 : 1024, x: 0, y: 0, rowH: 0,
      ver: 0, saved: false, usedAt: -1e9
    };
    TRIBB.at2[kind] = B;
  }
  return B;
}
function tribbDrop2(B) {
  if (B.img && B.img.close) B.img.close();
  B.img = B.cv = B.cx = null;
  B.st = 'weg';
  if (TRIBB.at2[B.kind] === B) delete TRIBB.at2[B.kind];
}
// ein Bild in den Bogen (Regale; der Bogen liegt im Arbeitsspeicher und wächst bei Bedarf)
function tribbStep2(B) {
  if (!B.cv) {
    B.cv = document.createElement('canvas');
    B.cv.width = B.W;
    B.cv.height = 256;
    B.cx = B.cv.getContext('2d', { willReadFrequently: true });
    B.img = B.cv;
  }
  const v = B.next;
  const s = B.sub;
  let spr = null;
  try {
    spr = tribb2Sprite(B.kind, B.ids[v], s, B.S);
  } catch (e) {
    console.warn('Zuschauerbilder 2D (' + B.ids[v] + '):', e);
  }
  const o = (v * B.per + s) * 8;
  if (spr) {
    if (B.x + spr.sw > B.W) {
      B.x = 0;
      B.y += B.rowH + 2;
      B.rowH = 0;
    }
    if (B.y + spr.sh + 2 > B.cv.height) {
      const nc = document.createElement('canvas');
      nc.width = B.W;
      nc.height = Math.min(8192, Math.max(B.cv.height * 2, B.y + spr.sh + 2));
      const nx = nc.getContext('2d', { willReadFrequently: true });
      nx.drawImage(B.cv, 0, 0);
      B.cv = B.img = nc;
      B.cx = nx;
    }
    B.cx.drawImage(spr.cv, spr.sx, spr.sy, spr.sw, spr.sh, B.x, B.y, spr.sw, spr.sh);
    B.rects.set([B.x, B.y, spr.sw, spr.sh, spr.ox, spr.oy, 1 / B.S, 1], o);
    B.x += spr.sw + 2;
    B.rowH = Math.max(B.rowH, spr.sh);
  } else B.fails++;
  if (++B.sub < B.per) return;
  B.sub = 0;
  let all = 1;
  for (let k = 0; k < B.per; k++) if (!B.rects[(v * B.per + k) * 8 + 7]) all = 0;
  B.ok[v] = all;
  if (all) B.done++;
  B.next++;
  tribbRemap(B);
  B.ver++;
  if (B.next >= B.ids.length) tribbFinish2(B);
}
// fertig: als ImageBitmap (schnell zu zeichnen) und in den Zwischenspeicher
function tribbFinish2(B) {
  B.st = B.done ? 'fertig' : 'aus';
  if (!B.done) return;
  const H = B.y + B.rowH + 2;
  let id = null;
  try {
    id = B.cx.getImageData(0, 0, B.W, H);
  } catch (e) { /* bleibt das Canvas */ }
  if (!id) return;
  if (typeof createImageBitmap === 'function') {
    createImageBitmap(id).then((bm) => {
      if (TRIBB.at2[B.kind] !== B) return;
      B.img = bm;
      B.cv = B.cx = null;
    }, () => {});
  }
  tribbDbPut('2d:' + B.kind, { key: B.key, W: B.W, H, px: id.data.buffer, rects: B.rects.slice().buffer, ok: Array.from(B.ok) }).then((ok) => {
    B.saved = !!ok;
    if (ok) tribbDbPut('2d:' + B.kind + ':key', B.key);
  });
}
function tribbLoad2(B, rec) {
  if (!rec || rec.key !== B.key || !rec.px || rec.px.byteLength !== rec.W * rec.H * 4 || typeof createImageBitmap !== 'function') return false;
  B.st = 'lade';
  const id = new ImageData(new Uint8ClampedArray(rec.px), rec.W, rec.H);
  createImageBitmap(id).then((bm) => {
    if (TRIBB.at2[B.kind] !== B) return;
    B.img = bm;
    B.rects.set(new Float32Array(rec.rects));
    B.ok.set(rec.ok);
    B.done = B.ok.reduce((s, x) => s + x, 0);
    B.next = B.ids.length;
    tribbRemap(B);
    B.st = 'fertig';
    B.saved = true;
    B.ver++;
  }, () => {
    B.st = 'bau';
  });
  return true;
}
function tribbTick2(kind, need) {
  const B = tribbA2(kind);
  if (B.st === 'neu' && need < 2) {
    B.st = 'frage';
    tribbDbGet('2d:' + kind + ':key').then((k) => {
      if (TRIBB.at2[kind] === B && B.st === 'frage') B.st = k === B.key ? 'da' : 'bau';
    }, () => {
      if (B.st === 'frage') B.st = 'bau';
    });
  } else if ((B.st === 'neu' || B.st === 'da') && need >= 2) {
    B.st = 'suche';
    tribbDbGet('2d:' + kind).then((rec) => {
      if (TRIBB.at2[kind] !== B || B.st !== 'suche') return;
      if (!tribbLoad2(B, rec)) B.st = 'bau';
    }, () => {
      if (B.st === 'suche') B.st = 'bau';
    });
  } else if (B.st === 'bau' && (need >= 2 || !(TRIBB_T.frame & 1))) {
    const ms = tribbBudget(need);
    const t0 = performance.now();
    let n = 0;
    do {
      tribbStep2(B);
      n++;
    } while (B.st === 'bau' && performance.now() - t0 < ms);
    const dt = performance.now() - t0;
    const T = TRIBB.stat;
    T.schritte += n;
    T.ms += dt;
    if (dt > T.max) T.max = dt;
  }
  return B;
}
// für trib2Draw: Bogen mit mindestens einer fertigen Figur, false (noch nicht) oder null (geht nicht)
function tribbFans2(kind) {
  if (typeof NPC_ART === 'undefined' || typeof bakeSprite !== 'function') return null;
  const B = tribbTick2(kind, 2);
  B.usedAt = performance.now();
  if (B.st === 'aus') return null;
  return B.done > 0 && B.img ? B : false;
}
// außerhalb der Hallen (2D): vorab zeichnen, wenn man bald hin will; gespeicherte Bögen freigeben wie in 3D
function tribbIdle2() {
  TRIBB_T.frame++;
  if (document.hidden) return;
  for (const kind of ['arena', 'turm']) {
    const need = tribbSoon(kind);
    const B0 = TRIBB.at2[kind];
    if (B0 && B0.st === 'fertig' && B0.saved && performance.now() - B0.usedAt > 120000) tribbDrop2(B0);
    else if (need) tribbTick2(kind, need);
    else {
      const B = TRIBB.at2[kind];
      if (B && B.st === 'fertig' && B.saved && performance.now() - B.usedAt > 120000) tribbDrop2(B);
    }
  }
}
// einen Zuschauer zeichnen. Bewohner: von vorn (Arme nach up), im Südrang von hinten; je Zuschauer fest nach links
// oder rechts gewandt wie die Bewohner der Stadt. Ungeheuer von der Seite, zur Hallenmitte gewandt.
const tribbFr = (x) => x - Math.floor(x);
function tribb2Fan(ctx, B, figs, j, f, V, hop, up, t) {
  const fig = B.map[figs[j]];
  if (fig < 0) return;
  const fr = tribbFr;
  let s;
  let flip;
  if (B.kind === 'turm') {
    s = up > 0.66 ? (Math.floor(t * 3 + f.seed * 7) & 1) + 1 : up > 0.3 ? 1 : 0;
    flip = f.nx > 0.35 || (Math.abs(f.nx) <= 0.35 && f.x > 0);
  } else {
    const back = f.ny > 0.35;
    s = (back ? 3 : 0) + (up > 0.66 ? 2 : up > 0.3 ? 1 : 0);
    flip = !back && fr(f.seed * 17.3) < 0.5;
  }
  const r = B.rects;
  const o = (fig * B.per + s) * 8;
  if (!r[o + 7]) return;
  const sc = TRIBB.s2[B.kind] * (0.94 + 0.12 * fr(f.seed * 53.3));
  const k = sc * r[o + 6];
  const px = (V.cx + f.x) * TILE;
  const py = (V.cy + f.y) * TILE + 3 - hop * TILE * 0.9;
  const dw = r[o + 2] * k;
  const dh = r[o + 3] * k;
  const dx = px + r[o + 4] * sc;
  const dy = py + r[o + 5] * sc;
  if (flip) {
    ctx.scale(-1, 1);
    ctx.drawImage(B.img, r[o], r[o + 1], r[o + 2], r[o + 3], dx - 2 * px, dy, dw, dh);
    ctx.scale(-1, 1);
  } else ctx.drawImage(B.img, r[o], r[o + 1], r[o + 2], r[o + 3], dx, dy, dw, dh);
}
