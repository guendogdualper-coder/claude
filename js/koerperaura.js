// Körperaura (seit 13.83): Solange auf einer Figur irgendein Buff läuft (Buff-Fertigkeit, Klassensegen, Buff der
// Ultimativen Attacke), umgibt sie eine Aura im Stil ihrer Klasse und ihres Weges. Ein Buff gibt eine ruhige Aura,
// der Klassensegen und mehrere Buffs zugleich machen sie dichter und heller. Ein- und Ausblenden geht weich.
// In 3D klebt die Aura am Körper wie eine Anime-Aura beim Aufladen: eine flüssig wabernde Flammenhülle um die ganze
// Silhouette (Kopf, Schultern, Arme, Rumpf, Beine), an das Skelett der Figur gebunden – sie läuft und dreht mit, ihre
// Zungen lecken nach oben und wehen beim Laufen nach hinten; innen heiß und hell, außen ein dunkler Saum; dazu ein
// heller Randschein auf dem Körper und Zungen, die sich von Kopf und Schultern lösen und aufsteigen (KA_FLAME,
// kaShell3D). Darüber je Stil Rauch, Funken, Asche, Splitter, Federn, Blätter, kreisende Bänder, Bogenblitze und
// Steinchen. Nichts liegt flach am Boden (keine Ringe, Runen oder Sterne), und was vor dem Gesicht wäre, blendet aus.
// Ohne 3D-Figur (und in 2D) bleibt die alte Hülle aus Flammenbildern hinter der Figur.
//   Krieger   Klinge: rot-goldene Flammen, goldene Glut · Leib: goldene Hitze mit rotem Kern
//   Ninja     Dolch: violett-schwarzer Schattenrauch, karminrotes Flackern · Falke: purpur-schwarz, dunkle Federn
//             (die Schwingen des Falkenblicks bleiben, fernninja.js)
//   Nekromant Seelen: grün-schwarzer Seelenrauch mit violetten Lichtern · Knochen: Blutrauch, rote Tropfen
//   Magier    je Element: Feuer Flammen und Glut · Frost Eisnebel und Eissplitter · Blitz Bogenblitze am Körper
//             (Gelb-Weiß mit violettem Schein wie die Blitz-Zauber) · Erde Bernsteinglut, Staub und kreisende Steinchen
//   Schamane  Drache: türkis-grüne Windbänder und Blätter · Heilung: goldweißes Licht und grüne Heilfunken
// 3D über FX3_HOOKS (Teile aus dem gemeinsamen Vorrat, keine Neuanlage je Bild), 2D über bodyAura2 (zeichnen.js).
// Mitspieler: Klasse, Weg und Buff-Kennungen kommen schon im Spielerzustand mit (netz.js: c, pt, b) – kein neues Feld.

const KA_STYLES = {
  // Krieger, Weg der Klinge: rot-goldene Flammenzungen, goldene Glut steigt auf
  klinge: {
    glow: '#ff5a1a', glowOp: 0.34,
    wisp: { n: 11, body: '#d8261a', core: '#ffc23a', bodyOp: 0.84, coreOp: 0.94, w: 0.22, h: 0.53, rise: 0.78, speed: 0.75, r: 0.3 },
    motes: { n: 12, colors: ['#ffd36a', '#ff8a2a', '#fff0b0'], size: 0.055, speed: 0.45, tex: 'disc' }
  },
  // Krieger, Weg des Leibes: goldene Hitze, die von innen rot glüht – schwerer und breiter
  leib: {
    glow: '#ffb02a', glowOp: 0.36,
    wisp: { n: 10, body: '#e07010', core: '#fff0a0', bodyOp: 0.78, coreOp: 1, w: 0.27, h: 0.48, rise: 0.7, speed: 0.6, r: 0.32 },
    motes: { n: 10, colors: ['#ffe08a', '#ff5a2a', '#ffd36a'], size: 0.06, speed: 0.38, tex: 'disc' }
  },
  // Ninja, Weg des Dolches: Schattenrauch, schwarze Schattenzungen mit karminrotem Saum
  schatten: {
    shade: '#120818', shadeOp: 0.42, glow: '#c8203a', glowOp: 0.16, shellOp: 0.85, shellCore: '#b0102e', shellCoreOp: 0.55,
    smoke: { n: 7, color: '#160a20', op: 0.5, size: 0.42, speed: 0.38 },
    wisp: { n: 9, body: '#1e0c2a', core: '#ff2a4a', bodyOp: 0.89, coreOp: 0.69, w: 0.21, h: 0.55, rise: 0.75, speed: 0.7, r: 0.3, flicker: true },
    motes: { n: 7, colors: ['#ff3a5a', '#c8203a', '#ff8aa8'], size: 0.045, speed: 0.6, tex: 'disc' }
  },
  // Ninja, Weg des Falken: purpur-schwarzer Rauch, dunkle Federn sinken und wirbeln
  falke: {
    shade: '#100818', shadeOp: 0.4, glow: '#7a3ae0', glowOp: 0.2, shellOp: 0.85, shellCore: '#6a2ad0', shellCoreOp: 0.6,
    smoke: { n: 6, color: '#140a22', op: 0.48, size: 0.4, speed: 0.36 },
    wisp: { n: 8, body: '#24103e', core: '#9a5af0', bodyOp: 0.81, coreOp: 0.75, w: 0.2, h: 0.53, rise: 0.72, speed: 0.6, r: 0.31 },
    motes: { n: 7, colors: ['#1a0e2a', '#2a1446', '#3a1a5a'], size: 0.11, speed: 0.3, tex: 'kaFeather', normal: true, sway: true },
    motes2: { n: 6, colors: ['#b48cff', '#8a5ae0'], size: 0.045, speed: 0.55, tex: 'disc' }
  },
  // Nekromant, Weg der Seelen: grün-schwarzer Seelenrauch, grüne Seelenzungen, violette Lichter
  seelen: {
    shade: '#08140c', shadeOp: 0.4, glow: '#5ad070', glowOp: 0.18,
    smoke: { n: 7, color: '#0c1a10', op: 0.5, size: 0.42, speed: 0.34 },
    wisp: { n: 9, body: '#183a20', core: '#7ae38a', bodyOp: 0.81, coreOp: 0.88, w: 0.2, h: 0.58, rise: 0.8, speed: 0.55, r: 0.3 },
    motes: { n: 8, colors: ['#b48cff', '#a7e37f', '#7a4ac8'], size: 0.05, speed: 0.4, tex: 'disc', spiral: true }
  },
  // Nekromant, Weg der Knochen: Blutrauch, dunkelrote Zungen, Blutstropfen
  blut: {
    shade: '#160406', shadeOp: 0.42, glow: '#d01a2a', glowOp: 0.2,
    smoke: { n: 7, color: '#1c0608', op: 0.5, size: 0.42, speed: 0.34 },
    wisp: { n: 9, body: '#480a12', core: '#ff2a3a', bodyOp: 0.84, coreOp: 0.75, w: 0.2, h: 0.55, rise: 0.76, speed: 0.55, r: 0.3 },
    motes: { n: 7, colors: ['#b81a2a', '#ff4a5a', '#7a0a14'], size: 0.06, speed: 0.4, tex: 'kaDrop', normal: true }
  },
  // Magier Feuer: Karmin-Flammen, weißgelber Kern, viel Glut
  feuer: {
    glow: '#ff5a1a', glowOp: 0.36,
    wisp: { n: 12, body: '#e8362a', core: '#ffb04a', bodyOp: 0.81, coreOp: 1, w: 0.21, h: 0.55, rise: 0.82, speed: 0.85, r: 0.3 },
    motes: { n: 14, colors: ['#ffd36a', '#ff8a4a', '#fff1c8'], size: 0.05, speed: 0.55, tex: 'disc' }
  },
  // Magier Frost: königsblauer Eisnebel, kalte Zungen, Eissplitter blitzen
  frost: {
    glow: '#3a7bff', glowOp: 0.34,
    mist: { n: 6, color: '#7ab8ff', op: 0.22, size: 0.5, speed: 0.3 },
    wisp: { n: 8, body: '#2a5ae0', core: '#bff6ff', bodyOp: 0.61, coreOp: 0.75, w: 0.18, h: 0.48, rise: 0.7, speed: 0.45, r: 0.31 },
    motes: { n: 10, colors: ['#eafcff', '#9ff6ff', '#bfe0ff'], size: 0.075, speed: 0.3, tex: 'kaShard', spin: true, spiral: true }
  },
  // Magier Blitz: Bogenblitze springen über den Körper (Gelb-Weiß), violetter Schein
  blitz: {
    glow: '#8a5aff', glowOp: 0.3, shell: '#4a22c0', shellCore: '#ffe94a', shellCoreOp: 0.5,
    arcs: { n: 4, color: '#ffe94a', core: '#ffffff' },
    wisp: { n: 6, body: '#5a2ad8', core: '#fff7b0', bodyOp: 0.43, coreOp: 0.62, w: 0.16, h: 0.43, rise: 0.75, speed: 1.1, r: 0.31 },
    motes: { n: 10, colors: ['#fff7b0', '#ffffff', '#ffe94a'], size: 0.04, speed: 0.9, tex: 'disc', jitter: true }
  },
  // Magier Erde: warme Bernsteinglut, Staub, kleine Steine kreisen um die Hüfte
  erde: {
    glow: '#f0a830', glowOp: 0.26, shell: '#6a4020', shellOp: 0.85, shellCore: '#e09a30', shellCoreOp: 0.38,
    smoke: { n: 5, color: '#8a6a44', op: 0.3, size: 0.4, speed: 0.25 },
    wisp: { n: 7, body: '#b0661a', core: '#ffd98a', bodyOp: 0.61, coreOp: 0.81, w: 0.2, h: 0.43, rise: 0.6, speed: 0.45, r: 0.32 },
    pebbles: { n: 6, color: '#5a4a3e', glow: '#f0a830' },
    motes: { n: 8, colors: ['#ffd98a', '#f0a830'], size: 0.045, speed: 0.35, tex: 'disc' }
  },
  // Magier ohne bekannten Weg (Mitspieler mit altem Stand): arkanes Blau-Violett
  arkan: {
    glow: '#8a9aff', glowOp: 0.3,
    wisp: { n: 8, body: '#4a5ad8', core: '#e0e6ff', bodyOp: 0.61, coreOp: 0.81, w: 0.18, h: 0.5, rise: 0.75, speed: 0.6, r: 0.3 },
    motes: { n: 8, colors: ['#e0e6ff', '#b8c4ff'], size: 0.045, speed: 0.45, tex: 'disc' }
  },
  // Schamane, Weg des Drachen: türkis-grüne Windbänder schlingen sich um den Körper, Blätter wirbeln mit
  natur: {
    glow: '#3ad8a0', glowOp: 0.26, shell: '#1a9a78', shellOp: 0.6, shellCore: '#7affd0', shellCoreOp: 0.5,
    ribbons: { n: 3, colors: ['#3ad8b0', '#9cff7a', '#5ae0ff'], w: 0.075, turns: 0.85, speed: 1.3 },
    motes: { n: 8, colors: ['#5ac84a', '#8ad860', '#3a9a4a'], size: 0.1, speed: 0.35, tex: 'kaLeaf', normal: true, spin: true, spiral: true },
    motes2: { n: 6, colors: ['#c8fff0', '#7ae3c0'], size: 0.04, speed: 0.5, tex: 'disc' }
  },
  // Schamane, Weg der Heilung: goldweißes Licht, zwei sanfte Lichtbänder, goldene und grüne Heilfunken
  licht: {
    glow: '#ffe9a0', glowOp: 0.3, shell: '#e8b840', shellOp: 0.55, shellCore: '#fff2c0', shellCoreOp: 0.42,
    ribbons: { n: 2, colors: ['#fff2a0', '#c8ffb0'], w: 0.06, turns: 0.7, speed: 0.8 },
    wisp: { n: 6, body: '#ffe9a0', core: '#ffffff', bodyOp: 0, coreOp: 0.56, w: 0.18, h: 0.48, rise: 0.8, speed: 0.4, r: 0.3 },
    motes: { n: 12, colors: ['#fff2a0', '#9be59b', '#ffffff'], size: 0.05, speed: 0.32, tex: 'disc', spiral: true }
  }
};

// Flammenhülle am Körper (nur 3D): Farben von außen nach innen – edge (dunkler Saum), body, core,
// hot (weißglühend, erst auf hoher Stufe) – und rim (heller Randschein direkt auf der Figur).
// occl: wie stark der Saum den Hintergrund abdeckt (0 = rein leuchtend, 1 = deckend wie Rauch),
// rise: Höhe der Zungen, inf: Abstand vom Körper, spd: Tempo, freq: Feinheit der Zungen, op: Deckkraft (sonst 1)
const KA_FLAME = {
  klinge: { edge: '#5a0308', body: '#c80e0a', core: '#ff4a10', hot: '#ffc23a', rim: '#ff8a24', occl: 0.75, rise: 1, inf: 1, spd: 1, freq: 1 },
  leib: { edge: '#7a1404', body: '#e05a0c', core: '#ffa424', hot: '#ffd890', rim: '#ffd070', op: 0.9, occl: 0.66, rise: 0.85, inf: 1.15, spd: 0.8, freq: 0.85 },
  schatten: { edge: '#050208', body: '#1a0a24', core: '#a8102c', hot: '#ff4a64', rim: '#ff2a48', occl: 0.92, rise: 0.9, inf: 1, spd: 0.85, freq: 1.1 },
  falke: { edge: '#06040c', body: '#22104a', core: '#7a3ae0', hot: '#d0b4ff', rim: '#a874ff', occl: 0.9, rise: 0.9, inf: 1, spd: 0.75, freq: 1 },
  seelen: { edge: '#030a06', body: '#0c3418', core: '#3ad064', hot: '#c8ffd4', rim: '#9a6aff', occl: 0.88, rise: 1, inf: 1, spd: 0.7, freq: 0.95 },
  blut: { edge: '#0c0103', body: '#4a060e', core: '#d01a28', hot: '#ff8a8a', rim: '#ff3040', occl: 0.88, rise: 0.9, inf: 1, spd: 0.7, freq: 1 },
  feuer: { edge: '#7a1004', body: '#f2300e', core: '#ff8a1e', hot: '#fff0b0', rim: '#ffc24a', occl: 0.62, rise: 1.1, inf: 1, spd: 1.15, freq: 1.05 },
  frost: { edge: '#06205e', body: '#2a6aff', core: '#7ad0ff', hot: '#ffffff', rim: '#bff6ff', occl: 0.45, rise: 0.6, inf: 1.1, spd: 0.55, freq: 0.8 },
  blitz: { edge: '#1a0660', body: '#5a2ef0', core: '#b49aff', hot: '#fff7b0', rim: '#ffe94a', occl: 0.45, rise: 0.75, inf: 1, spd: 1.7, freq: 1.4 },
  erde: { edge: '#2a1808', body: '#8a5014', core: '#f0a830', hot: '#ffe0a0', rim: '#ffd98a', occl: 0.7, rise: 0.6, inf: 1.15, spd: 0.55, freq: 0.8 },
  arkan: { edge: '#10186a', body: '#4a5ad8', core: '#9aaaff', hot: '#ffffff', rim: '#e0e6ff', occl: 0.45, rise: 0.85, inf: 1, spd: 0.8, freq: 1 },
  natur: { edge: '#06402e', body: '#14a07a', core: '#4ae8b4', hot: '#e0fff0', rim: '#9cff7a', occl: 0.5, rise: 0.8, inf: 1.05, spd: 0.8, freq: 0.9 },
  licht: { edge: '#6a4a08', body: '#c89420', core: '#ffe08a', hot: '#fffbe8', rim: '#fff2c0', op: 0.75, occl: 0.5, rise: 0.8, inf: 1.05, spd: 0.6, freq: 0.85 }
};
for (const k in KA_FLAME) KA_STYLES[k].fl = KA_FLAME[k];

// Stil einer Figur aus Klasse und Weg (Mitspieler senden den Weg als pt; ohne Weg: erster Weg, Magier arkan)
function kaStyleKey(p) {
  const path = p.path;
  switch (p.classId) {
    case 'krieger': return path === 1 ? 'leib' : 'klinge';
    case 'ninja': return path === 1 ? 'falke' : 'schatten';
    case 'nekromant': return path === 1 ? 'blut' : 'seelen';
    case 'schamane': return path === 1 ? 'licht' : 'natur';
    case 'magier': return (path != null && MAGE_PATH_EL[path]) || 'arkan';
  }
  return 'klinge';
}

// Stärke 0–1 aus den laufenden Buffs: ein Buff ruhig, Klassensegen und jeder weitere Buff kräftiger.
// In den letzten 1,5 s eines Buffs klingt sein Anteil schon aus.
function kaTarget(p, now) {
  if (!p.buffs || !p.buffs.length) return 0;
  let n = 0;
  let segen = 0;
  let fade = 0;
  for (const b of p.buffs) {
    if (!(b.until > now)) continue;
    n++;
    if (b.segen || (typeof SEGEN_BY_ID !== 'undefined' && SEGEN_BY_ID[b.id])) segen = 1;
    fade = Math.max(fade, Math.min(1, (b.until - now) / 1.5));
  }
  if (!n) return 0;
  const k = Math.min(1, 0.6 + 0.16 * (n - 1) + 0.24 * segen) * fade;
  // unsichtbar (Tarnung): Mitspieler sehen nichts, die eigene Figur nur einen Hauch
  if (p === game.player ? game.stats && game.stats.invisible : p.invisible) return p === game.player ? k * 0.25 : 0;
  return k;
}

// Stufe der Figur (seit 13.84): Die Aura fängt klein an und wird alle 5 Stufen etwas kräftiger –
// Stufe 1–4 etwa 30 % der vollen Stärke, Stufe 80 etwa 85 % (voll wirkt sie nie mehr so wuchtig wie in 13.83)
function kaLevelScale(p) {
  const lv = Math.max(1, (p && (p.level || p.lvl || p.l)) | 0 || 1);
  const steps = Math.min(16, Math.floor(lv / 5));
  return 0.3 + 0.55 * (steps / 16);
}
// weich nachgeführte Stärke je Figur (einmal je Bild, egal ob 3D oder 2D fragt)
function kaPower(p) {
  const now = game.time;
  const s = p._ka || (p._ka = { k: 0, t: now });
  if (s.t === now) return s.k;
  const dt = Math.min(0.1, Math.max(0, now - s.t));
  s.t = now;
  const want = p.dead ? 0 : kaTarget(p, now);
  s.k += (want - s.k) * Math.min(1, dt * (want > s.k ? 3.2 : 2.2));
  if (s.k < 0.004 && want === 0) s.k = 0;
  return s.k;
}

// --- 3D -------------------------------------------------------------------------------------------------------

// eigene Bilder (weiß, die Farbe kommt vom Material), einmal gemalt und in FX3.tex abgelegt
function kaTex(kind) {
  if (FX3.tex[kind]) return FX3.tex[kind];
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  if (kind === 'kaWisp') {
    // Flammenzunge mit klarem Umriss: weicher Rand (dreimal kleiner übereinander), heller Kern unten
    const tongue = (k, a) => {
      g.globalAlpha = a;
      g.beginPath();
      g.moveTo(34, 2 + (1 - k) * 40);
      g.bezierCurveTo(32 + 14 * k, 34, 32 + 30 * k, 64, 32 + 26 * k, 98);
      g.bezierCurveTo(32 + 20 * k, 124, 32 - 20 * k, 124, 32 - 26 * k, 98);
      g.bezierCurveTo(32 - 30 * k, 66, 32 - 4 * k, 40, 34, 2 + (1 - k) * 40);
      g.fill();
    };
    g.fillStyle = '#ffffff';
    tongue(1, 0.35);
    tongue(0.85, 0.45);
    tongue(0.62, 0.6);
    tongue(0.36, 0.9);
    g.globalAlpha = 1;
  } else if (kind === 'kaAura' || kind === 'kaAuraM') {
    // Aura-Umriss: hohe Flammengestalt mit mehreren Zungen oben, innen fast leer – hinter der Figur bleibt so
    // ein lodernder Saum um den Körper stehen statt einer Farbfläche
    c.width = 128;
    c.height = 256;
    // kaAuraM gespiegelt: zwei Hüllen übereinander wirken so gleichmäßig (Sprites lassen sich nicht spiegeln)
    if (kind === 'kaAuraM') {
      g.translate(128, 0);
      g.scale(-1, 1);
    }
    // Ei-förmiger Körper, oben ein Kranz aus Flammenzungen, die nach außen und oben lodern
    const TONGUES = [[-172, 0.5], [-150, 0.75], [-128, 0.95], [-108, 0.8], [-90, 1], [-74, 0.7], [-55, 0.92], [-32, 0.72], [-10, 0.45]];
    const shape = () => {
      g.beginPath();
      g.ellipse(64, 152, 44, 86, 0, 0, Math.PI * 2);
      g.fill();
      for (const [deg, len] of TONGUES) {
        const an = (deg * Math.PI) / 180;
        const ox = 64 + Math.cos(an) * 40;
        const oy = 152 + Math.sin(an) * 80;
        // Richtung: halb nach außen, halb nach oben
        let dx = Math.cos(an) * 0.45;
        let dy = Math.sin(an) * 0.45 - 0.75;
        const l = Math.hypot(dx, dy);
        dx /= l;
        dy /= l;
        const L = 26 + 34 * len;
        const tx = ox + dx * L;
        const ty = oy + dy * L;
        const nx = -dy * 12;
        const ny = dx * 12;
        g.beginPath();
        g.moveTo(ox + nx, oy + ny);
        g.quadraticCurveTo(ox + nx * 0.6 + dx * L * 0.6, oy + ny * 0.6 + dy * L * 0.6, tx, ty);
        g.quadraticCurveTo(ox - nx * 0.6 + dx * L * 0.6, oy - ny * 0.6 + dy * L * 0.6, ox - nx, oy - ny);
        g.fill();
      }
    };
    g.fillStyle = '#ffffff';
    // weicher Rand: viermal, jedes Mal etwas kleiner und dichter
    for (const [k, al] of [[1, 0.22], [0.93, 0.3], [0.86, 0.4], [0.78, 0.5]]) {
      g.save();
      g.translate(64, 160);
      g.scale(k, k);
      g.translate(-64, -160);
      g.globalAlpha = al;
      shape();
      g.restore();
    }
    g.globalAlpha = 1;
    g.setTransform(1, 0, 0, 1, 0, 0);
    // innen ausdünnen
    g.globalCompositeOperation = 'destination-out';
    const rg = g.createRadialGradient(64, 160, 0, 64, 160, 40);
    rg.addColorStop(0, 'rgba(0,0,0,0.85)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 128, 256);
    g.globalCompositeOperation = 'source-over';
  } else if (kind === 'kaSmoke') {
    // Rauchballen aus mehreren weichen Flecken
    c.height = 64;
    for (const [x, y, r, a] of [[32, 34, 26, 0.55], [22, 28, 16, 0.5], [42, 26, 15, 0.5], [30, 42, 18, 0.45], [40, 40, 14, 0.4]]) {
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, `rgba(255,255,255,${a})`);
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, 64, 64);
    }
  } else if (kind === 'kaShard') {
    // Eissplitter: schmale Raute mit hellem Grat und leichtem Schein (kein Stern)
    const rg = g.createRadialGradient(32, 64, 0, 32, 64, 34);
    rg.addColorStop(0, 'rgba(255,255,255,0.45)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 64, 128);
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.beginPath();
    g.moveTo(32, 8);
    g.lineTo(44, 70);
    g.lineTo(32, 120);
    g.lineTo(22, 64);
    g.closePath();
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(32, 14);
    g.lineTo(36, 66);
    g.lineTo(32, 112);
    g.lineTo(29, 64);
    g.closePath();
    g.fill();
  } else if (kind === 'kaFeather') {
    // Feder: geschwungene Fahne mit Kiel
    g.fillStyle = 'rgba(255,255,255,0.92)';
    g.beginPath();
    g.moveTo(32, 4);
    g.bezierCurveTo(52, 26, 50, 80, 34, 112);
    g.lineTo(30, 112);
    g.bezierCurveTo(14, 82, 12, 30, 32, 4);
    g.fill();
    g.globalCompositeOperation = 'destination-out';
    g.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.moveTo(32, 30 + i * 13);
      g.lineTo(i % 2 ? 52 : 12, 20 + i * 13);
      g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#ffffff';
    g.fillRect(31, 10, 2, 114);
  } else if (kind === 'kaLeaf') {
    // Blatt mit Mittelrippe
    g.fillStyle = 'rgba(255,255,255,0.95)';
    g.beginPath();
    g.moveTo(32, 6);
    g.bezierCurveTo(60, 40, 54, 90, 32, 118);
    g.bezierCurveTo(10, 90, 4, 40, 32, 6);
    g.fill();
    g.globalCompositeOperation = 'destination-out';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(32, 14);
    g.lineTo(32, 112);
    g.stroke();
    g.globalCompositeOperation = 'source-over';
  } else if (kind === 'kaDrop') {
    // Blutstropfen: unten rund, oben spitz
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(32, 8);
    g.bezierCurveTo(40, 40, 56, 66, 54, 88);
    g.bezierCurveTo(52, 118, 12, 118, 10, 88);
    g.bezierCurveTo(8, 66, 24, 40, 32, 8);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  FX3.tex[kind] = t;
  return t;
}

// Teil aus dem Vorrat mit fester Textur und Mischart (jede Art ihr eigener Vorrat: kein Texturwechsel je Bild)
function kaTake(h, kind, tex, normal) {
  const o = fx3Take(h, kind);
  if (!o.userData.kaInit) {
    o.userData.kaInit = true;
    o.material.map = tex === 'disc' ? fx3Texture('disc') : kaTex(tex);
    if (normal) o.material.blending = THREE.NormalBlending;
    o.material.needsUpdate = true;
  }
  return o;
}
// Farben einmal anlegen, danach nur kopieren (keine Zeichenketten-Umwandlung je Bild)
const KA_COL = {};
function kaCol(hex) {
  return KA_COL[hex] || (KA_COL[hex] = new THREE.Color(hex));
}
function kaPaint(o, hex, op) {
  o.material.color.copy(kaCol(hex));
  o.material.opacity = Math.max(0, Math.min(1, op * fx3NightDim(o)));
}
function kaSprite(h, kind, tex, normal, x, y, z, sx, sy, hex, op, rot) {
  const o = kaTake(h, kind, tex, normal);
  o.position.set(x, y, z);
  o.scale.set(sx, sy, 1);
  o.material.rotation = rot || 0;
  kaPaint(o, hex, op);
  return o;
}

// kleine Zufallszahl −0,5…0,5 aus zwei ganzen Zahlen (gleich in jedem Bild)
function kaHash(a, b) {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s) - 0.5;
}

// Ort und Größe der Figur: Mitte, Fußhöhe (mit Sattel und Sprung) und Körpergröße aus dem 3D-Modell
const KA_A = { x: 0, y: 0, z: 0, H: 1.9 };
function kaAnchor(p) {
  const a = p.__k3 && typeof actors3 !== 'undefined' ? actors3.get(p.__k3) : null;
  if (a && a.group && a.group.parent && a.model) {
    KA_A.x = a.group.position.x;
    KA_A.y = a.group.position.y;
    KA_A.z = a.group.position.z;
    KA_A.H = Math.max(0.8, a.model.height * a.group.scale.x);
  } else {
    KA_A.x = p.x * U3;
    KA_A.y = 0;
    KA_A.z = feetY(p) * U3;
    KA_A.H = 1.9;
  }
  return KA_A;
}

// Blickrichtung der Kamera am Boden (für „vor dem Gesicht“)
const KA_CAM = { x: 0, z: 1 };
// Blickstrahl von der Kamera zur Körpermitte (je Figur): „dahinter“ heißt entlang dieses Strahls, sonst rutscht die
// Hülle bei Figuren am Bildrand zur Seite
const KA_BK = { x: 0, y: -0.7, z: -0.7 };
function kaBack(A) {
  const c = V3.camera.position;
  const dx = A.x - c.x;
  const dy = A.y + A.H * 0.6 - c.y;
  const dz = A.z - c.z;
  const l = Math.hypot(dx, dy, dz) || 1;
  KA_BK.x = dx / l;
  KA_BK.y = dy / l;
  KA_BK.z = dz / l;
}
// Abschwächung vor dem Gesicht: ox/oz Versatz zur Körpermitte, r Abstand, yk Höhe in Körpergrößen
function kaFace(ox, oz, r, yk) {
  if (yk < 0.5) return 1;
  const tow = -(ox * KA_CAM.x + oz * KA_CAM.z) / (r || 1);
  if (tow <= 0) return 1;
  const up = Math.min(1, (yk - 0.5) / 0.2);
  return 1 - Math.min(1, tow * 1.4) * up * 0.92;
}

const _kaA = new THREE.Vector3();
const _kaB = new THREE.Vector3();
const _kaP = new THREE.Vector3();
const _kaQ = new THREE.Vector3();

// Randschein: weiche Lichtflecken knapp hinter der Figur (der Körper verdeckt ihre Mitte, nur der Saum leuchtet);
// dunkle Stile zusätzlich ein dunkler Schleier – auch auf hellem Boden sichtbar
function kaGlow3(h, st, A, k, t, seed) {
  const { x, y, z, H } = A;
  const pulse = 0.88 + 0.12 * Math.sin(t * 2.3 + seed);
  // hinter die Figur entlang der Blickrichtung (siehe kaShell3)
  const f = KA_BK;
  const bx = x + f.x * H * 0.55;
  const by = y + f.y * H * 0.55;
  const bz = z + f.z * H * 0.55;
  if (st.shade) kaSprite(h, 'kaShade', 'kaSmoke', true, bx, by + H * 0.5, bz, H * 1.3, H * 1.4, st.shade, st.shadeOp * k);
  if (st.glow) {
    kaSprite(h, 'kaGlow', 'disc', false, bx, by + H * 0.4, bz, H * 1.1, H * 1.1, st.glow, st.glowOp * k * pulse);
    kaSprite(h, 'kaGlow', 'disc', false, bx, by + H * 0.75, bz, H * 1.2, H * 1.3, st.glow, st.glowOp * 0.85 * k * pulse);
  }
}

// Hülle: zwei große, flackernde Flammenbilder dicht hinter der Figur. Der Körper verdeckt ihre Mitte, sichtbar bleibt
// der lodernde Umriss um Schultern und Kopf – der eigentliche „Aura“-Eindruck
function kaShell3(h, st, A, k, t, seed, kk) {
  const { x, y, z, H } = A;
  const w = st.wisp;
  const body = st.shell || (w && w.bodyOp > 0 ? w.body : null);
  const core = st.shellCore || st.glow || (w && w.core);
  // entlang der Blickrichtung hinter die ganze Figur (die Kamera schaut schräg von oben: nur waagrecht nach hinten
  // läge die Hülle näher an der Kamera als Beine und Saum und färbte den Körper ein)
  const f = KA_BK;
  for (let j = 0; j < 2; j++) {
    const fl = 1 + 0.05 * Math.sin(t * (7.3 + j * 2.1) + seed) + 0.04 * Math.sin(t * 13.1 + j);
    const sw = Math.sin(t * (1.9 + j * 0.7) + j * 2 + seed) * 0.06;
    const sx = H * (j ? 1.0 : 1.15) * (2 - fl);
    const sy = H * (j ? 1.62 : 1.48) * fl * (0.86 + 0.14 * kk);
    const cy = y + sy * 0.44;
    const px = x + f.x * H * 0.6;
    const py = cy + f.y * H * 0.6;
    const pz = z + f.z * H * 0.6;
    if (body) kaSprite(h, j ? 'kaShellNM' : 'kaShellN', j ? 'kaAuraM' : 'kaAura', true, px, py, pz, sx, sy, body, (st.shellOp ?? 0.75) * k, sw);
    if (core) kaSprite(h, j ? 'kaShellAM' : 'kaShellA', j ? 'kaAuraM' : 'kaAura', false, px, py + sy * 0.02, pz, sx * 0.9, sy * 0.92, core, (st.shellCoreOp ?? 0.7) * k, -sw);
  }
}

// Flammenzungen an der Silhouette: steigen von den Füßen auf, wachsen und verlöschen. Die meisten sitzen an den
// Seiten und hinter der Figur (dort steigen sie über den Kopf), vorn lecken nur kleine Zungen an den Füßen.
function kaWisps3(h, w, A, k, t, q, seed) {
  const { x, y, z, H } = A;
  const n = Math.max(3, Math.round(w.n * q));
  const sx0 = -KA_CAM.z;
  const sz0 = KA_CAM.x;
  for (let i = 0; i < n; i++) {
    const ph = (t * w.speed * (0.85 + 0.3 * ((i * 0.37) % 1)) + i / n + seed) % 1;
    // Winkel um die Rückseite (0 = genau hinter der Figur), langsam pendelnd
    const th = (((i * 0.618034 + seed) % 1) * 2 - 1) * 2.6 + Math.sin(t * 0.6 + i * 1.3) * 0.25;
    const back = (Math.cos(th) + 1) / 2;
    const r = H * w.r * (1 + 0.15 * Math.sin(i * 1.7 + t * 1.3)) * (1 - ph * 0.2);
    const ox = (KA_CAM.x * Math.cos(th) + sx0 * Math.sin(th)) * r;
    const oz = (KA_CAM.z * Math.cos(th) + sz0 * Math.sin(th)) * r;
    const rise = w.rise * (0.35 + 0.75 * back);
    const yk = 0.02 + ph * rise;
    const life = Math.sin(ph * Math.PI);
    let op = Math.pow(life, 0.7) * k * kaFace(ox, oz, r, yk + w.h * 0.4);
    if (w.flicker) op *= 0.7 + 0.3 * Math.sin(t * 23 + i * 5);
    if (op < 0.02) continue;
    const sz = 0.6 + 0.5 * back;
    const sx = H * w.w * (1 - ph * 0.45) * sz;
    const sy = H * w.h * (0.55 + 0.55 * life) * sz;
    const py = y + H * yk + sy * 0.4;
    const rot = Math.sin(t * 2.6 + i * 1.9) * 0.22 - Math.sin(th) * 0.25;
    if (w.bodyOp > 0) kaSprite(h, 'kaWispN', 'kaWisp', true, x + ox, py, z + oz, sx, sy, w.body, Math.min(1, w.bodyOp * op), rot);
    kaSprite(h, 'kaWispA', 'kaWisp', false, x + ox, py - sy * 0.08, z + oz, sx * 0.6, sy * 0.68, w.core, Math.min(1, w.coreOp * op), rot);
  }
}

// Rauch und Nebel: weiche Ballen steigen an der Figur auf (dunkel deckend oder hell leuchtend)
function kaSmoke3(h, s, A, k, t, q, seed, glowing) {
  const { x, y, z, H } = A;
  const n = Math.max(2, Math.round(s.n * q));
  for (let i = 0; i < n; i++) {
    const ph = (t * s.speed + i / n + seed * 0.3) % 1;
    const ang = i * 2.39996 + t * 0.35;
    const r = H * (0.17 + 0.12 * ph);
    const ox = Math.cos(ang) * r;
    const oz = Math.sin(ang) * r;
    const yk = 0.04 + ph * 0.75;
    const op = s.op * Math.sin(ph * Math.PI) * k * kaFace(ox, oz, r, yk);
    if (op < 0.02) continue;
    const sz = H * s.size * (0.6 + 0.7 * ph);
    kaSprite(h, glowing ? 'kaMist' : 'kaSmokeN', 'kaSmoke', !glowing, x + ox, y + H * yk, z + oz, sz, sz, s.color, op, ang);
  }
}

// Funken, Asche, Splitter, Federn, Blätter: steigen auf (spiral: in einer Schraube um den Körper)
function kaMotes3(h, m, A, k, t, q, seed) {
  const { x, y, z, H } = A;
  const n = Math.max(2, Math.round(m.n * q));
  // Vorratsname einmal je Stil anlegen (keine neue Zeichenkette je Bild)
  const kind = m.kind || (m.kind = (m.normal ? 'kaMoteN' : 'kaMoteA') + m.tex);
  for (let i = 0; i < n; i++) {
    const sp = m.speed * (0.8 + 0.4 * ((i * 0.61) % 1));
    const ph = (t * sp + i / n + seed * 0.7) % 1;
    const ang = i * 2.39996 + t * (m.spiral ? 1.4 : 0.4) + (m.spiral ? ph * 2.5 : 0);
    const r = H * (m.spiral ? 0.24 + 0.04 * Math.sin(i + t) : 0.14 + 0.2 * ph + 0.06 * Math.sin(i * 3.1));
    let ox = Math.cos(ang) * r;
    let oz = Math.sin(ang) * r;
    if (m.sway) {
      ox += Math.sin(t * 1.7 + i * 2) * H * 0.06;
      oz += Math.cos(t * 1.3 + i) * H * 0.04;
    }
    let yk = 0.05 + ph * 1.05;
    if (m.jitter) yk += kaHash(i, Math.floor(t * 12)) * 0.05;
    let op = (ph < 0.15 ? ph / 0.15 : 1 - (ph - 0.15) / 0.85) * k * kaFace(ox, oz, r, yk);
    if (op < 0.03) continue;
    const s = H * m.size * (1 - ph * 0.35);
    const rot = m.spin || m.sway ? t * (1.2 + (i % 3) * 0.5) + i : 0;
    const asp = m.tex === 'disc' ? 1 : 2;
    kaSprite(h, kind, m.tex, m.normal, x + ox, y + H * yk, z + oz, s, s * asp, m.colors[i % m.colors.length], Math.min(1, op * 1.1), rot);
  }
}

// Windbänder: Schrauben um den Körper (Rückseite verdeckt der Körper), unten bis Brusthöhe – nie vors Gesicht
function kaRibbons3(h, rb, A, k, t, q) {
  const { x, y, z, H } = A;
  const n = q < 0.6 ? Math.min(rb.n, 2) : rb.n;
  const N = FX3_STRIP_N;
  for (let j = 0; j < n; j++) {
    const o = fx3Take(h, 'strip');
    const pos = o.geometry.attributes.position.array;
    const col = o.geometry.attributes.color.array;
    const cc = kaCol(rb.colors[j % rb.colors.length]);
    const a0 = t * rb.speed * (j % 2 ? -1 : 1) + j * 2.1;
    const yA = 0.06 + 0.1 * j + 0.05 * Math.sin(t * 1.1 + j);
    const yB = yA + 0.5;
    const op = k * fx3NightDim(o) * (0.75 + 0.25 * Math.sin(t * 2 + j));
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const a = a0 + u * rb.turns * Math.PI * 2 * (j % 2 ? -1 : 1);
      const r = H * (0.27 + 0.05 * Math.sin(u * 6 + t * 2 + j));
      const px = x + Math.cos(a) * r;
      const pz = z + Math.sin(a) * r;
      const py = y + H * (yA + (yB - yA) * u);
      const ww = H * rb.w * Math.sin(Math.PI * u);
      const br = Math.pow(Math.sin(Math.PI * u), 0.7) * op;
      for (let s = 0; s < 2; s++) {
        const v = (i * 2 + s) * 3;
        pos[v] = px;
        pos[v + 1] = py + (s ? ww : 0);
        pos[v + 2] = pz;
        const b = s ? br * 0.55 : br;
        col[v] = cc.r * b;
        col[v + 1] = cc.g * b;
        col[v + 2] = cc.b * b;
      }
    }
    o.geometry.attributes.position.needsUpdate = true;
    o.geometry.attributes.color.needsUpdate = true;
    o.material.opacity = 1;
  }
}

// Bogenblitze: kurze gezackte Entladungen dicht am Körper, alle 0,08 s an neuer Stelle
function kaArcs3(h, ar, A, k, t, q, seed) {
  const { x, y, z, H } = A;
  const n = q < 0.6 ? 2 : ar.n;
  const win = Math.floor(t / 0.08);
  for (let i = 0; i < n; i++) {
    // jede Entladung lebt nur in drei von vier Fenstern (Flackern); sie springt am Saum der Aura vom Körper nach außen
    if (kaHash(i + 40, win) > 0.25) continue;
    const a = (kaHash(i, win) + 0.5) * Math.PI * 2;
    const yk = 0.15 + (kaHash(i + 7, win) + 0.5) * 0.6;
    const r = H * 0.26;
    if (kaFace(Math.cos(a) * r, Math.sin(a) * r, r, yk + 0.15) < 0.5) continue;
    _kaA.set(x + Math.cos(a) * r, y + H * yk, z + Math.sin(a) * r);
    const a2 = a + kaHash(i + 3, win) * 0.8;
    _kaB.set(x + Math.cos(a2) * r * 1.9, y + H * (yk + 0.1 + kaHash(i + 9, win) * 0.25), z + Math.sin(a2) * r * 1.9);
    const segs = 4;
    _kaP.copy(_kaA);
    for (let s = 1; s <= segs; s++) {
      const u = s / segs;
      const jit = s === segs ? 0 : H * 0.09;
      _kaQ.set(_kaA.x + (_kaB.x - _kaA.x) * u + kaHash(s, win + i * 13) * jit, _kaA.y + (_kaB.y - _kaA.y) * u + kaHash(s + 5, win + i) * jit, _kaA.z + (_kaB.z - _kaA.z) * u + kaHash(s + 9, win - i) * jit);
      const o = fx3Take(h, 'seg');
      fx3Segment(o, _kaP, _kaQ, H * 0.02);
      kaPaint(o, ar.color, 0.9 * k);
      const c = fx3Take(h, 'seg');
      fx3Segment(c, _kaP, _kaQ, H * 0.008);
      kaPaint(c, ar.core, k);
      _kaP.copy(_kaQ);
    }
    kaSprite(h, 'kaGlow', 'disc', false, _kaA.x, _kaA.y, _kaA.z, H * 0.16, H * 0.16, ar.color, 0.7 * k);
  }
}

// Steinchen kreisen langsam um die Hüfte und glühen an der Unterseite bernsteinfarben
function kaPebbles3(h, pb, A, k, t, q) {
  const { x, y, z, H } = A;
  const n = Math.max(3, Math.round(pb.n * Math.min(1, q + 0.2)));
  for (let i = 0; i < n; i++) {
    const a = t * 0.7 + (i / n) * Math.PI * 2;
    const r = H * (0.3 + 0.03 * Math.sin(i * 2.3));
    const py = y + H * (0.32 + 0.12 * Math.sin(t * 1.4 + i * 1.7) + (i % 2) * 0.12);
    const s = H * (0.035 + 0.012 * (i % 3)) * (0.5 + 0.5 * k);
    const o = fx3Rock(h, 'rock', x + Math.cos(a) * r, py, z + Math.sin(a) * r, s, s * 0.85, s, pb.color);
    o.rotation.set(t * 0.9 + i, t * 1.3 + i * 2, 0);
    if (q >= 0.6) kaSprite(h, 'kaGlow', 'disc', false, o.position.x, py - s * 0.6, o.position.z, s * 4, s * 4, pb.glow, 0.55 * k);
  }
}

// --- Flammenhülle am Körper ------------------------------------------------------------------------
// Die Aura klebt an der Figur: Zu jedem Modell gibt es eine glatte Hülle aus einem Ellipsoid je Knochen (Kopf, Brust,
// Hüfte, Arme, Hände, Beine, Umhang …), gebunden an das Skelett der Figur – sie läuft, dreht und schwingt also mit.
// Ein Shader bläst sie wellig auf, zieht oben Zungen in die Höhe (immer nach Welt-oben, beim Laufen nach hinten
// geweht) und malt lodernde Flammen hinein, die nach oben ziehen: innen heiß und hell, außen ein dunkler Saum, der
// in einzelne Zungen zerfasert. Gezeichnet wird die Rückseite: der Körper verdeckt, was hinter ihm liegt, sichtbar ist
// der Flammensaum um die Silhouette. Dazu ein heller Randschein direkt auf dem Körper (das echte Modell, minimal
// aufgeblasen) und Flammenzungen, die sich von Kopf, Schultern, Armen und Beinen lösen und aufsteigen.
// Kosten: Hülle ~9000 Dreiecke je Lage, Randschein so viel wie die Figur; drei Zeichenaufrufe je Figur, Geometrie je
// Modell und Materialien je Figur nur einmal angelegt, keine Neuanlage je Bild. Mitspieler nach KA_REMOTE_MAX, Randschein
// und weite Lage nur bei der eigenen Figur und den KA_RICH nächsten. 'mittel': ohne weite Lage. 'niedrig': nur die
// Hülle mit einfacherem Rauschen.

// Wertrauschen 0–1 (billig, ohne Texturen)
const KA_NOISE = `
float kaH(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float kaN(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(kaH(i), kaH(i + vec3(1.0, 0.0, 0.0)), f.x), mix(kaH(i + vec3(0.0, 1.0, 0.0)), kaH(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(kaH(i + vec3(0.0, 0.0, 1.0)), kaH(i + vec3(1.0, 0.0, 1.0)), f.x), mix(kaH(i + vec3(0.0, 1.0, 1.0)), kaH(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}
`;
const KA_VS = `
#include <common>
#include <skinning_pars_vertex>
uniform float uT;
uniform float uInf;
uniform float uRise;
uniform float uH;
uniform float uWob;
uniform float uSeed;
uniform vec3 uVel;
varying vec3 vN;
varying vec3 vV;
varying vec3 vO;
varying float vTip;
${KA_NOISE}
void main() {
  #include <beginnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  vec3 n = normalize(objectNormal);
  vec3 q = transformed / uH;
  vO = q + vec3(uSeed, 0.0, uSeed * 0.7);
  float w = kaN(q * vec3(6.0, 3.0, 6.0) + vec3(uSeed, -uT * 2.0, uT * 0.4));
  float w2 = kaN(q * vec3(14.0, 6.0, 14.0) + vec3(3.7 + uSeed, -uT * 3.6, 1.3));
  vec3 p = transformed + n * uInf * (1.0 + uWob * ((w - 0.5) * 1.6 + (w2 - 0.5) * 1.1));
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vec3 wn = normalize(mat3(modelMatrix) * n);
  float up = smoothstep(-0.2, 0.85, wn.y);
  float hgt = clamp(q.y, 0.0, 1.2);
  float lick = up * (0.1 + w * w * w * 2.6 + w2 * 0.4) * (0.3 + 0.7 * hgt);
  wp.y += uRise * lick;
  wp.xz -= uVel.xz * (0.2 + up) * hgt;
  vTip = clamp(lick * 0.5, 0.0, 1.0) * step(0.001, uRise);
  vec4 mv = viewMatrix * wp;
  gl_Position = projectionMatrix * mv;
  vN = normalize((viewMatrix * vec4(wn, 0.0)).xyz);
  vV = -mv.xyz;
}`;
const KA_FS = `
uniform vec3 uEdge;
uniform vec3 uBody;
uniform vec3 uCore;
uniform vec3 uHot;
uniform float uT;
uniform float uOp;
uniform float uOcc;
uniform float uSpd;
uniform float uFreq;
uniform float uDim;
uniform float uLv;
uniform float uHeat;
varying vec3 vN;
varying vec3 vV;
varying vec3 vO;
varying float vTip;
${KA_NOISE}
void main() {
  float e = abs(dot(normalize(vN), normalize(vV)));
  float t = uT * uSpd;
  vec3 q = vO * uFreq;
  float foot = smoothstep(0.02, 0.22, vO.y);
#ifdef KA_RIM
  // Randschein auf dem Körper: hell an den Kanten, in Bändern flackernd, die nach oben ziehen
  float f = kaN(vec3(q.x * 7.0, q.y * 4.0 - t * 3.4, q.z * 7.0));
  float a = pow(1.0 - e, 3.0) * smoothstep(0.25, 0.8, f) * uOp * foot;
  gl_FragColor = vec4(uCore * a * uDim, 0.0);
#else
  // senkrecht gestreckte Flammenstreifen, die nach oben ziehen
  float f = kaN(vec3(q.x * 8.0, q.y * 3.2 - t * 2.6, q.z * 8.0));
#ifndef KA_LOW
  f = f * 0.6 + kaN(vec3(q.x * 17.0, q.y * 6.5 - t * 4.6, q.z * 17.0) + 4.3) * 0.4;
#endif
  // innen (nahe am Körper) dicht und heiß, außen nur noch die Spitzen des Rauschens: Zungen mit dunklem Saum
  float inner = smoothstep(0.0, 0.62, e);
  float d = inner + (f - 0.5) * 1.35 - vTip * 0.55;
  float a = smoothstep(0.06, 0.38, d) * foot * smoothstep(0.0, 0.2, e + vTip * 0.15);
  float h = clamp((d - 0.24) * 1.15, 0.0, 1.0) * uHeat;
  vec3 c = mix(uEdge, uBody, smoothstep(0.0, 0.32, h));
  c = mix(c, uCore, smoothstep(0.38, 0.75, h));
  c = mix(c, uHot, smoothstep(0.78, 1.0, h) * uLv);
  a *= uOp;
  gl_FragColor = vec4(c * a * uDim, min(1.0, a * uOcc * (1.0 - 0.45 * h)));
#endif
}`;

// Hülle eines Modells: je Knochen ein Ellipsoid um seine Teile. Die Maße kommen beim Bau des Modells aus den
// Eckpunkten (danach gibt drei-kern.js die Daten frei), sonst aus dem Skelett mit Chibi-Maßen.
const KA_BONE_MIN = 24;
function kaFitModel(m) {
  if (!m || m.kaEll !== undefined) return;
  m.kaEll = null;
  const g = m.geos && m.geos.lit;
  if (!g || !m.rig || m.rig.length < 10 || !g.attributes.skinIndex) return;
  const P = g.attributes.position.array;
  const S = g.attributes.skinIndex.array;
  if (!P || !S) return;
  const nb = m.rig.length;
  const box = new Float32Array(nb * 7);
  for (let b = 0; b < nb; b++) {
    box[b * 7] = box[b * 7 + 1] = box[b * 7 + 2] = 1e9;
    box[b * 7 + 3] = box[b * 7 + 4] = box[b * 7 + 5] = -1e9;
  }
  for (let i = 0, n = P.length / 3; i < n; i++) {
    const b = S[i * 4];
    if (b >= nb) continue;
    const o = b * 7;
    for (let a = 0; a < 3; a++) {
      const v = P[i * 3 + a];
      if (v < box[o + a]) box[o + a] = v;
      if (v > box[o + 3 + a]) box[o + 3 + a] = v;
    }
    box[o + 6]++;
  }
  const E = [];
  for (let b = 1; b < nb; b++) {
    const o = b * 7;
    if (box[o + 6] < KA_BONE_MIN) continue;
    // Hände: Waffen und Stäbe hängen am Handknochen – nur eine kleine Kugel um die Hand
    if (b === BH.handL || b === BH.handR) {
      const r = m.rig[b].pos;
      E.push({ b, c: [r[0], r[1] - 0.04, r[2] + 0.01], s: [0.075, 0.08, 0.075] });
      continue;
    }
    const c = [0, 0, 0];
    const s = [0, 0, 0];
    for (let a = 0; a < 3; a++) {
      c[a] = (box[o + a] + box[o + 3 + a]) / 2;
      s[a] = Math.max(0.05, (box[o + 3 + a] - box[o + a]) / 2);
    }
    E.push({ b, c, s });
  }
  if (E.length >= 4) m.kaEll = E;
}
// Ersatz ohne Eckpunkte: Maße aus dem Skelett und der Modellhöhe
function kaRigEll(m) {
  const top = m.height || 1.44;
  const R = (b) => m.rig[b].pos;
  const E = [
    { b: BH.hips, c: [0, 0.38, 0], s: [0.26, 0.17, 0.22] },
    { b: BH.chest, c: [0, 0.73, 0], s: [0.22, 0.25, 0.19] },
    { b: BH.head, c: [0, (0.86 + top) / 2, -0.03], s: [0.3, (top - 0.86) / 2, 0.31] }
  ];
  for (const [arm, hand, leg] of [[BH.armL, BH.handL, BH.legL], [BH.armR, BH.handR, BH.legR]]) {
    const ar = R(arm);
    E.push({ b: arm, c: [ar[0] * 0.92, ar[1] - 0.15, 0], s: [0.09, 0.22, 0.09] });
    const hr = R(hand);
    E.push({ b: hand, c: [hr[0], hr[1] - 0.04, hr[2] + 0.01], s: [0.075, 0.08, 0.075] });
    const lr = R(leg);
    E.push({ b: leg, c: [lr[0] * 0.9, lr[1] / 2, 0.03], s: [0.11, lr[1] / 2, 0.14] });
  }
  return E;
}
// Maße beim Bau jedes Modells mitnehmen (nur ein Durchlauf über die Eckpunkte, bevor sie freigegeben werden)
if (typeof model3 === 'function') {
  const kaModel3 = model3;
  // eslint-disable-next-line no-global-assign
  model3 = function (key, build) {
    const m = kaModel3(key, build);
    if (m && m.kaEll === undefined) kaFitModel(m);
    return m;
  };
}

// Hüllgeometrie eines Modells (einmal, liegt bei den Modellteilen und wird mit ihnen freigegeben)
function kaShellGeo(m) {
  if (m.geos.kaShell) return m.geos.kaShell;
  const E = m.kaEll || (m.kaEll = kaRigEll(m));
  const base = new THREE.SphereGeometry(1, 28, 18);
  const bp = base.attributes.position.array;
  const bi = base.index.array;
  const nv = bp.length / 3;
  const pos = new Float32Array(E.length * nv * 3);
  const nor = new Float32Array(E.length * nv * 3);
  const si = new Uint16Array(E.length * nv * 4);
  const sw = new Float32Array(E.length * nv * 4);
  const idx = new Uint16Array(E.length * bi.length);
  E.forEach((e, j) => {
    for (let i = 0; i < nv; i++) {
      const v = j * nv + i;
      let nx = bp[i * 3] / e.s[0];
      let ny = bp[i * 3 + 1] / e.s[1];
      let nz = bp[i * 3 + 2] / e.s[2];
      const l = Math.hypot(nx, ny, nz) || 1;
      pos[v * 3] = e.c[0] + bp[i * 3] * e.s[0];
      pos[v * 3 + 1] = e.c[1] + bp[i * 3 + 1] * e.s[1];
      pos[v * 3 + 2] = e.c[2] + bp[i * 3 + 2] * e.s[2];
      nor[v * 3] = nx / l;
      nor[v * 3 + 1] = ny / l;
      nor[v * 3 + 2] = nz / l;
      si[v * 4] = e.b;
      sw[v * 4] = 1;
    }
    for (let i = 0; i < bi.length; i++) idx[j * bi.length + i] = bi[i] + j * nv;
  });
  base.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  // Platz für die Zungen über dem Kopf
  g.boundingSphere.radius *= 1.7;
  g.shared = true;
  m.geos.kaShell = g;
  // Startpunkte der aufsteigenden Zungen: Kopf und Schultern öfter, Hände und Füße seltener
  const pick = [];
  E.forEach((e, j) => {
    const w = e.b === BH.head ? 6 : e.b === BH.armL || e.b === BH.armR || e.b === BH.chest ? 4 : e.b === BH.handL || e.b === BH.handR ? 1 : 2;
    for (let i = 0; i < w; i++) pick.push(j);
  });
  m.kaPick = pick;
  return g;
}

function kaShellMat(rim, low) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uT: { value: 0 }, uInf: { value: 0.03 }, uRise: { value: 0 }, uH: { value: 1.44 }, uWob: { value: 0.5 }, uSeed: { value: 0 },
      uVel: { value: new THREE.Vector3() }, uEdge: { value: new THREE.Color() }, uBody: { value: new THREE.Color() },
      uCore: { value: new THREE.Color() }, uHot: { value: new THREE.Color() }, uOp: { value: 0 }, uOcc: { value: 0.5 },
      uSpd: { value: 1 }, uFreq: { value: 1 }, uDim: { value: 1 }, uLv: { value: 0 }, uHeat: { value: 1 }
    },
    vertexShader: KA_VS,
    fragmentShader: KA_FS,
    defines: rim ? { KA_RIM: 1 } : low ? { KA_LOW: 1 } : {},
    skinning: true,
    transparent: true,
    depthWrite: false,
    side: rim ? THREE.FrontSide : THREE.BackSide,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor
  });
  m.userData.low = !!low;
  return m;
}

// Figuren mit Hülle; was in diesem Bild nicht gezeichnet wird, wird ausgeblendet
const KA_HOLDERS = new Set();
let kaFrameNo = 0;
function kaActor(p) {
  const a = p.__k3 && typeof actors3 !== 'undefined' ? actors3.get(p.__k3) : null;
  return a && a.group && a.group.parent && a.model && a.model.rig && a.model.rig.length >= 10 && a.meshes && a.meshes.lit && a.skeleton ? a : null;
}
function kaShellOf(a) {
  // auch eine Figur aus dem Pool, die ihre Hülle schon hat, wieder beobachten (sonst bliebe sie nach dem Buff sichtbar)
  KA_HOLDERS.add(a);
  if (a.kaS) return a.kaS;
  const geo = kaShellGeo(a.model);
  // Reihenfolge bei gleichem Abstand: außen, innen, Randschein (nach Anlage); sonst wie alle Effekte nach Abstand
  const mk = (key, g, mat) => {
    a.mats[key] = mat;
    const me = new THREE.SkinnedMesh(g, mat);
    // gleiche Bindung wie das Modell (ohne bind() neu zu rechnen: das würde das Skelett umstellen)
    me.bind(a.skeleton, a.meshes.lit.bindMatrix);
    me.visible = false;
    a.group.add(me);
    return me;
  };
  const S = (a.kaS = { f: 0, px: 0, pz: 0, vx: 0, vz: 0, tv: -1, low: false });
  // außen die weite, dunklere Lage, darin die Hauptlage, auf dem Körper der Randschein
  S.outer2 = mk('kaOuter2', geo, kaShellMat(false, false));
  S.outer = mk('kaOuter', geo, kaShellMat(false, false));
  S.rim = mk('kaRim', a.model.geos.lit, kaShellMat(true, false));
  S.outer2.material.uniforms.uSeed.value = 3.1;
  return S;
}
function kaSetLow(S, low) {
  if (S.low === low) return;
  S.low = low;
  for (const me of [S.outer, S.outer2]) {
    me.material.defines = low ? { KA_LOW: 1 } : {};
    me.material.needsUpdate = true;
  }
}
// Shader der Hülle beim Vorwärmen der Effekte gleich mit übersetzen (v3WarmFx, drei-fx.js): unsichtbar mitzeichnen,
// bis das Vorwärmen gelaufen ist – sonst ruckelt der erste Buff
function kaWarm(p, gfx) {
  const a = kaActor(p);
  if (!a) return;
  const S = kaShellOf(a);
  S.f = kaFrameNo;
  kaSetLow(S, gfx === 'niedrig');
  for (const me of [S.outer, S.rim]) {
    me.material.uniforms.uOp.value = 0;
    me.visible = me !== S.rim || gfx !== 'niedrig';
  }
}
function kaSetColors(u, fl) {
  u.uEdge.value.copy(kaCol(fl.edge));
  u.uBody.value.copy(kaCol(fl.body));
  u.uCore.value.copy(kaCol(fl.core));
  u.uHot.value.copy(kaCol(fl.hot));
  u.uSpd.value = fl.spd;
  u.uFreq.value = fl.freq;
}

// Hülle einer Figur in diesem Bild einstellen. kk: Buff-Stärke 0–1, L: Stufe 0 (Stufe 1–4) bis 1 (Stufe 80+)
function kaShell3D(a, st, kk, L, t, low, rimOn, wide, A) {
  const S = kaShellOf(a);
  const fl = st.fl;
  S.f = kaFrameNo;
  kaSetLow(S, low);
  // Bewegung der Figur (für Zungen, die beim Laufen nach hinten wehen), weich nachgeführt
  const gp = a.group.position;
  if (S.tv >= 0 && t > S.tv) {
    const dt = Math.min(0.1, t - S.tv);
    const kv = Math.min(1, dt * 6);
    S.vx += (Math.max(-12, Math.min(12, (gp.x - S.px) / dt)) - S.vx) * kv;
    S.vz += (Math.max(-12, Math.min(12, (gp.z - S.pz) / dt)) - S.vz) * kv;
  } else if (S.tv < 0 || t < S.tv) {
    S.vx = 0;
    S.vz = 0;
  }
  // Sprünge (Teleport, Blinzeln): nicht als Bewegung werten
  if (Math.abs(gp.x - S.px) + Math.abs(gp.z - S.pz) > 3) {
    S.vx = 0;
    S.vz = 0;
  }
  S.px = gp.x;
  S.pz = gp.z;
  S.tv = t;
  const H = A.H;
  const mh = a.model.height || 1.44;
  // Zeit für den Shader klein halten (Genauigkeit am Handy); der Sprung alle 10 Minuten fällt im Flackern nicht auf
  const ts = t % 600;
  const dim = 1 - 0.3 * (V3.nightK || 0);
  const op = Math.min(1, kk * 1.6) * (fl.op || 1);
  const trail = 0.045 + 0.035 * L;
  // Hauptlage: auf niedriger Stufe ein dünnes Flackern dicht am Körper, ab Stufe 30–50 deutliche Flammen, ab 80 hoch lodernd
  const u = S.outer.material.uniforms;
  kaSetColors(u, fl);
  u.uT.value = ts;
  u.uH.value = mh;
  u.uInf.value = mh * (0.022 + 0.056 * L) * fl.inf;
  u.uRise.value = H * (0.035 + 0.2 * Math.pow(L, 1.3)) * fl.rise;
  u.uWob.value = 0.5 + 0.45 * L;
  u.uOp.value = op * (0.72 + 0.28 * L);
  u.uOcc.value = fl.occl;
  u.uDim.value = dim;
  u.uLv.value = 0.35 + 0.65 * L;
  u.uVel.value.set(S.vx * trail, 0, S.vz * trail);
  S.outer.visible = u.uOp.value > 0.01;
  // weite Lage: erst ab mittlerer Stufe, langsamer, dunkler und durchscheinender – gibt der Aura Tiefe
  const w2 = wide ? Math.max(0, Math.min(1, (L - 0.3) / 0.45)) : 0;
  const u2 = S.outer2.material.uniforms;
  if (w2 > 0.01) {
    kaSetColors(u2, fl);
    u2.uSpd.value = fl.spd * 0.72;
    u2.uFreq.value = fl.freq * 0.8;
    u2.uT.value = ts;
    u2.uH.value = mh;
    u2.uInf.value = u.uInf.value * 1.5 + mh * 0.025 * fl.inf;
    u2.uRise.value = u.uRise.value * 1.5;
    u2.uWob.value = 0.7;
    u2.uOp.value = op * 0.5 * w2;
    u2.uOcc.value = fl.occl * 0.8;
    u2.uDim.value = dim;
    u2.uLv.value = 0;
    u2.uHeat.value = 0.62;
    u2.uVel.value.set(S.vx * trail * 1.5, 0, S.vz * trail * 1.5);
    S.outer2.visible = true;
  } else S.outer2.visible = false;
  // Randschein auf dem Körper
  const ur = S.rim.material.uniforms;
  if (rimOn) {
    ur.uCore.value.copy(kaCol(fl.rim));
    ur.uSpd.value = fl.spd;
    ur.uFreq.value = fl.freq;
    ur.uT.value = ts;
    ur.uH.value = mh;
    ur.uInf.value = mh * 0.009;
    ur.uRise.value = 0;
    ur.uWob.value = 0.3;
    ur.uOp.value = op * (0.5 + 0.25 * L);
    ur.uDim.value = dim;
    ur.uVel.value.set(0, 0, 0);
    S.rim.visible = true;
  } else S.rim.visible = false;
}
function kaHideIdle() {
  for (const a of KA_HOLDERS) {
    const S = a.kaS;
    if (S.f === kaFrameNo) continue;
    S.outer.visible = false;
    S.outer2.visible = false;
    S.rim.visible = false;
    // Figur verschwunden (Pool oder freigegeben): nicht mehr festhalten
    if (!a.group.parent) KA_HOLDERS.delete(a);
  }
}

// Zungen lösen sich vom Körper: Startpunkt auf der Hülle eines Knochens (Kopf und Schultern am häufigsten), steigen
// auf, werden schmal und verlöschen. Sie folgen der Figur, solange sie leben.
const _kaM = new THREE.Matrix4();
const _kaV = new THREE.Vector3();
function kaBodyWisps3(h, w, a, A, k, L, t, q, seed) {
  const m = a.model;
  const E = m.kaEll;
  const pick = m.kaPick;
  if (!E || !pick) return;
  const { x, y, z, H } = A;
  const n = Math.max(2, Math.round(w.n * q * (0.4 + 0.75 * L)));
  const inf = (m.height || 1.44) * (0.02 + 0.06 * L);
  const big = 0.55 + 0.6 * L;
  for (let i = 0; i < n; i++) {
    const sp = w.speed * 1.25 * (0.8 + 0.4 * ((i * 0.37) % 1));
    const u = t * sp + i / n + seed;
    const ph = u % 1;
    const cyc = Math.floor(u);
    const e = E[pick[Math.floor((kaHash(i, cyc) + 0.5) * pick.length) % pick.length]];
    // Richtung auf der Hülle: eher seitlich und nach oben
    let dx = kaHash(i + 11, cyc) * 2;
    let dy = 0.35 + (kaHash(i + 17, cyc) + 0.5) * 0.65;
    let dz = kaHash(i + 23, cyc) * 2;
    const dl = Math.hypot(dx, dy, dz) || 1;
    dx /= dl;
    dy /= dl;
    dz /= dl;
    _kaV.set(e.c[0] + dx * (e.s[0] + inf), e.c[1] + dy * (e.s[1] + inf), e.c[2] + dz * (e.s[2] + inf));
    _kaM.multiplyMatrices(a.bones[e.b].matrixWorld, a.skeleton.boneInverses[e.b]);
    _kaV.applyMatrix4(_kaM);
    const life = Math.sin(ph * Math.PI);
    const ox = _kaV.x - x;
    const oz = _kaV.z - z;
    const yk = (_kaV.y - y) / H + ph * w.rise * (0.25 + 0.3 * L);
    let op = Math.pow(life, 0.8) * k * kaFace(ox, oz, Math.hypot(ox, oz), yk + 0.05);
    if (w.flicker) op *= 0.7 + 0.3 * Math.sin(t * 23 + i * 5);
    if (op < 0.02) continue;
    const sx = H * w.w * 0.75 * (1 - ph * 0.5) * big;
    const sy = H * w.h * 0.8 * (0.5 + 0.6 * life) * big;
    const sway = Math.sin(t * 3.1 + i * 1.7) * H * 0.03 * ph;
    const py = y + H * yk + sy * 0.35;
    const rot = Math.sin(t * 2.6 + i * 1.9) * 0.25;
    if (w.bodyOp > 0) kaSprite(h, 'kaWispN', 'kaWisp', true, x + ox + sway, py, z + oz, sx, sy, w.body, Math.min(1, w.bodyOp * op * 0.55), rot);
    kaSprite(h, 'kaWispA', 'kaWisp', false, x + ox + sway, py - sy * 0.08, z + oz, sx * 0.62, sy * 0.7, w.core, Math.min(1, w.coreOp * op), rot);
  }
}

// Zeichen einzelner Buffs obendrauf: Kampfrausch knistert rot (früher die flachen 2D-Blitze)
const KA_ACCENT = {
  kampfrausch: { arcs: { n: 2, color: '#ff4a1a', core: '#fff0d0' } }
};
// alle Lagen eines Stils
// k: Stärke 0–1 (Dichte); die Deckkraft erreicht schon bei einem einzelnen Buff fast den vollen Wert
function kaDraw3(h, p, st, kk, t, q, gfx, rich) {
  const A = kaAnchor(p);
  kaBack(A);
  // seit 13.84: Deckkraft und Teilchenzahl wachsen mit der Stufe (kaLevelScale)
  const lv = kaLevelScale(p);
  const L = (lv - 0.3) / 0.55;
  const k = Math.min(1, kk * 1.7) * lv;
  q *= (0.75 + 0.25 * kk) * (0.45 + 0.55 * lv);
  const seed = ((p.x * 0.013 + p.y * 0.007) % 1 + 1) % 1;
  const a = st.fl ? kaActor(p) : null;
  if (a) {
    // Flammenhülle am Körper statt Lichtbildern hinter der Figur
    a.group.updateMatrixWorld(true);
    kaShell3D(a, st, kk, L, t + seed * 7, gfx === 'niedrig', rich && gfx !== 'niedrig', rich && (gfx === 'hoch' || gfx === 'ultra'), A);
    if (st.wisp) kaBodyWisps3(h, st.wisp, a, A, Math.min(1, kk * 1.7) * (0.55 + 0.45 * L), L, t, q, seed);
  } else {
    kaGlow3(h, st, A, k, t, seed * 6);
    kaShell3(h, st, A, k, t, seed * 6, kk * lv);
    if (st.wisp) kaWisps3(h, st.wisp, A, k, t, q, seed);
  }
  if (st.smoke) kaSmoke3(h, st.smoke, A, k * (a ? 0.7 : 1), t, q, seed, false);
  if (st.mist) kaSmoke3(h, st.mist, A, k, t, q, seed, true);
  if (st.ribbons) kaRibbons3(h, st.ribbons, A, k, t, q);
  if (st.arcs) kaArcs3(h, st.arcs, A, k, t, q, seed);
  if (st.pebbles) kaPebbles3(h, st.pebbles, A, k, t, q);
  if (st.motes) kaMotes3(h, st.motes, A, k, t, q, seed);
  if (st.motes2) kaMotes3(h, st.motes2, A, k, t, q, seed + 0.5);
  for (const b of p.buffs) {
    const ac = KA_ACCENT[b.id];
    if (ac && b.until > t && ac.arcs) kaArcs3(h, ac.arcs, A, k, t + 0.37, q, seed);
  }
}

// Mitspieler: höchstens so viele Auren zugleich (die nächsten zuerst), damit volle Städte flüssig bleiben
const KA_REMOTE_MAX = { niedrig: 2, mittel: 4, hoch: 8, ultra: 10 };
const KA_RICH = 3;
const _kaList = [];
const _kaByDist = (a, b) => a._kaD - b._kaD;
function kaFrame(h) {
  const t = game.time;
  kaFrameNo++;
  const g = typeof GRAPHICS !== 'undefined' && GRAPHICS[opts.graphics];
  const q = g ? Math.min(1.15, g.particles) : 1;
  const f = FX3.cam.f;
  if (f) {
    const l = Math.hypot(f.x, f.z) || 1;
    KA_CAM.x = f.x / l;
    KA_CAM.z = f.z / l;
  }
  const me = game.player;
  const list = _kaList;
  list.length = 0;
  for (const rp of net.players.values()) {
    if (rp.dead || remoteHidden(rp) || !rp.buffs || (!rp.buffs.length && !(rp._ka && rp._ka.k > 0))) continue;
    if (!v3InView(rp.x, rp.y, 60)) continue;
    rp._kaD = me ? Math.abs(rp.x - me.x) + Math.abs(rp.y - me.y) : 0;
    list.push(rp);
  }
  if (list.length > 1) list.sort(_kaByDist);
  const max = KA_REMOTE_MAX[opts.graphics] ?? 6;
  if (list.length > max) list.length = max;
  if (me && game.running && !me.dead) list.push(me);
  if (!V3.fxWarm && me && game.running) kaWarm(me, opts.graphics);
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    const k = kaPower(p);
    if (k <= 0.01 || p.blinkHide > t) continue;
    if (p === me && !v3InView(p.x, p.y, 60)) continue;
    const st = KA_STYLES[kaStyleKey(p)];
    // Randschein und weite Lage nur an der eigenen Figur und den nächsten Mitspielern (KA_RICH), die übrigen nur die Hülle
    if (st) kaDraw3(h, p, st, k, t, q, opts.graphics, p === me || i < KA_RICH);
  }
  kaHideIdle();
}
const FX3_KA = { parts: [], fn: kaFrame };
FX3_HOOKS.push(FX3_KA);

// --- 2D (ohne 3D): getönter Schein, aufsteigende Zungen und Funken um die Figur -------------------------------
// layer 'back' hinter der Figur (Schein, Rauch, hintere Zungen), 'front' davor (Funken unterhalb des Gesichts)
function bodyAura2(ctx, p, fy, ride, layer) {
  if (typeof V3 !== 'undefined' && V3.on) return;
  const k = kaPower(p) * kaLevelScale(p); // seit 13.84 mit der Stufe
  if (k <= 0.01) return;
  const st = KA_STYLES[kaStyleKey(p)];
  if (!st) return;
  const t = game.time;
  const by = fy - ride;
  const H = 40;
  const low = typeof opts !== 'undefined' && opts.graphics === 'niedrig';
  ctx.save();
  if (layer === 'back') {
    if (st.shade) glow(ctx, p.x, by - H * 0.45, H * 0.75, st.shade, st.shadeOp * 1.3 * k);
    if (st.glow) {
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, p.x, by - H * 0.45, H * 0.72, st.glow, st.glowOp * 1.2 * k * (0.88 + 0.12 * Math.sin(t * 2.3)));
      ctx.globalCompositeOperation = 'source-over';
    }
    const sm = st.smoke || st.mist;
    if (sm) {
      const n = low ? 3 : 5;
      for (let i = 0; i < n; i++) {
        const ph = (t * sm.speed + i / n) % 1;
        const x = p.x + Math.sin(i * 2.4 + t * 0.6) * 11;
        glow(ctx, x, by - 4 - ph * H * 0.8, 8 + ph * 8, sm.color, sm.op * 1.4 * Math.sin(ph * Math.PI) * k);
      }
    }
  }
  // Hülle wie in 3D: ein Kranz lodernder Flammenzungen hinter der Figur (Seiten und über dem Kopf)
  const w = st.wisp;
  const body = st.shell || (w && w.bodyOp > 0 ? w.body : null);
  const core = st.shellCore || st.glow || (w && w.core);
  if (layer === 'back' && (body || core)) {
    const n = low ? 7 : 11;
    const cy = by - H * 0.5;
    for (let pass = 0; pass < 2; pass++) {
      if (pass === 0 && !body) continue;
      if (pass === 1) ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = pass ? core : body;
      for (let i = 0; i < n; i++) {
        // von links unten über den Kopf nach rechts unten
        const an = Math.PI * (1.08 + (0.84 * i) / (n - 1)) + Math.sin(t * 1.7 + i) * 0.04;
        const ox = p.x + Math.cos(an) * 13;
        const oy = cy + Math.sin(an) * 22;
        let dx = Math.cos(an) * 0.5;
        let dy = Math.sin(an) * 0.5 - 0.7;
        const l = Math.hypot(dx, dy);
        dx /= l;
        dy /= l;
        const L = (11 + 9 * Math.abs(Math.sin(i * 1.9 + t * (5 + (i % 3))))) * (pass ? 0.7 : 1) * (0.85 + 0.15 * k);
        const wd = pass ? 3.4 : 5.5;
        const nx = -dy * wd;
        const ny = dx * wd;
        ctx.globalAlpha = Math.min(1, k * (pass ? (st.shellCoreOp ?? 0.7) : (st.shellOp ?? 0.75) * 0.85));
        ctx.beginPath();
        ctx.moveTo(ox + nx, oy + ny);
        ctx.quadraticCurveTo(ox + nx * 0.5 + dx * L * 0.6, oy + ny * 0.5 + dy * L * 0.6, ox + dx * L, oy + dy * L);
        ctx.quadraticCurveTo(ox - nx * 0.5 + dx * L * 0.6, oy - ny * 0.5 + dy * L * 0.6, ox - nx, oy - ny);
        ctx.closePath();
        ctx.fill();
      }
      // Körper der Hülle: ein weicher Fleck in der Mitte verbindet die Zungen
      if (pass === 0) glow(ctx, p.x, cy, 24, body, 0.6 * k);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  if (layer === 'front') {
    // Funken, Splitter, Federn als kleine Punkte; oben (am Gesicht) blenden sie aus
    const m = st.motes;
    if (m) {
      const n = low ? 4 : 8;
      if (!m.normal) ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i++) {
        const ph = (t * m.speed + i / n) % 1;
        const ang = i * 2.39996 + t * 1.2;
        const x = p.x + Math.cos(ang) * (8 + ph * 8);
        const y = by - 2 - ph * H * 1.05;
        const face = y < by - H * 0.6 && Math.abs(x - p.x) < 9 ? 0.2 : 1;
        if (m.normal) {
          ctx.globalAlpha = (1 - ph) * k * face;
          ctx.fillStyle = m.colors[i % m.colors.length];
          ctx.beginPath();
          ctx.ellipse(x, y, 1.4, 2.6, ang, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        } else glow(ctx, x, y, 2.6, m.colors[i % m.colors.length], (1 - ph) * k * face);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // Blitz: kurze Bögen an der Seite
    if (st.arcs && Math.floor(t / 0.08) % 3) {
      const win = Math.floor(t / 0.08);
      ctx.strokeStyle = st.arcs.color;
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = k;
      ctx.globalCompositeOperation = 'lighter';
      const side = kaHash(1, win) > 0 ? 1 : -1;
      let x = p.x + side * 9;
      let y = by - 10 - (kaHash(2, win) + 0.5) * 14;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        x += side * 2 + kaHash(s, win) * 4;
        y -= 3 + kaHash(s + 4, win) * 3;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Windbänder: zwei Bögen um die Hüfte
    if (st.ribbons) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 2;
      for (let j = 0; j < st.ribbons.n; j++) {
        const a0 = t * st.ribbons.speed + j * 2.1;
        ctx.strokeStyle = st.ribbons.colors[j % st.ribbons.colors.length];
        ctx.globalAlpha = 0.6 * k;
        ctx.beginPath();
        ctx.ellipse(p.x, by - 10 - j * 7, 14, 5, 0, a0 % (Math.PI * 2), (a0 % (Math.PI * 2)) + 1.6);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}
