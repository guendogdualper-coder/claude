// Körperaura (seit 13.83): Solange auf einer Figur irgendein Buff läuft (Buff-Fertigkeit, Klassensegen, Buff der
// Ultimativen Attacke), umgibt sie eine Aura im Stil ihrer Klasse und ihres Weges. Ein Buff gibt eine ruhige Aura,
// der Klassensegen und mehrere Buffs zugleich machen sie dichter und heller. Ein- und Ausblenden geht weich.
// Alles ist räumlich an der Figur: eine lodernde Hülle aus Flammenzungen dicht hinter dem Körper (entlang des
// Blickstrahls dahinter gesetzt – der Körper verdeckt ihre Mitte, sichtbar bleibt der Saum um Schultern und Kopf),
// aufsteigende Zungen und Rauch an der Silhouette, Funken, Asche, Splitter, Federn, Blätter, kreisende Bänder,
// Bogenblitze und Steinchen. Nichts liegt flach am Boden (keine Ringe, Runen oder Sterne),
// und was vor dem Gesicht wäre, blendet aus.
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

// Zeichen einzelner Buffs obendrauf: Kampfrausch knistert rot (früher die flachen 2D-Blitze)
const KA_ACCENT = {
  kampfrausch: { arcs: { n: 2, color: '#ff4a1a', core: '#fff0d0' } }
};
// alle Lagen eines Stils
// k: Stärke 0–1 (Dichte); die Deckkraft erreicht schon bei einem einzelnen Buff fast den vollen Wert
function kaDraw3(h, p, st, kk, t, q) {
  const A = kaAnchor(p);
  kaBack(A);
  const k = Math.min(1, kk * 1.7);
  q *= 0.75 + 0.25 * kk;
  const seed = ((p.x * 0.013 + p.y * 0.007) % 1 + 1) % 1;
  kaGlow3(h, st, A, k, t, seed * 6);
  kaShell3(h, st, A, k, t, seed * 6, kk);
  if (st.smoke) kaSmoke3(h, st.smoke, A, k, t, q, seed, false);
  if (st.mist) kaSmoke3(h, st.mist, A, k, t, q, seed, true);
  if (st.wisp) kaWisps3(h, st.wisp, A, k, t, q, seed);
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
const _kaList = [];
const _kaByDist = (a, b) => a._kaD - b._kaD;
function kaFrame(h) {
  const t = game.time;
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
  for (const p of list) {
    const k = kaPower(p);
    if (k <= 0.01 || p.blinkHide > t) continue;
    if (p === me && !v3InView(p.x, p.y, 60)) continue;
    const st = KA_STYLES[kaStyleKey(p)];
    if (st) kaDraw3(h, p, st, k, t, q);
  }
}
const FX3_KA = { parts: [], fn: kaFrame };
FX3_HOOKS.push(FX3_KA);

// --- 2D (ohne 3D): getönter Schein, aufsteigende Zungen und Funken um die Figur -------------------------------
// layer 'back' hinter der Figur (Schein, Rauch, hintere Zungen), 'front' davor (Funken unterhalb des Gesichts)
function bodyAura2(ctx, p, fy, ride, layer) {
  if (typeof V3 !== 'undefined' && V3.on) return;
  const k = kaPower(p);
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
