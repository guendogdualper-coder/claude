// Fertigkeits-Effekte als echte 3D-Körper (seit Version 6.4): Schockwellen als Ring am Boden mit
// leuchtender Wand, Lichtsäulen als Zylinder, Blitze aus dem Himmel, Schnitte als gewölbte Sicheln im Raum,
// Schwünge als waagrechte Bögen um die Figur, Runenkreise am Boden, Strahlen und Ketten zwischen Figuren.
// Die 2D-Ebene über der 3D-Szene zeichnet diese Arten dann nicht mehr (FX3_TYPES).
// Ränge (E, H, L, V) bekommen eine zweite Hülle in der Rangfarbe, ab Legendär zusätzlich Runen und Funken.

const FX3_TYPES = new Set(['ring', 'pillar', 'bolt', 'slash', 'impact', 'runes', 'warn', 'aim', 'beam', 'chain', 'tornado', 'swoosh', 'lightbeam', 'ultbeam', 'ultsigil',
  'sparks3', 'shards3', 'orbs3', 'column3', 'smoke3', 'bite3', 'claw3', 'dragon3', 'meteor3', 'shield3', 'cloud3', 'hands3',
  'wave3', 'erupt3', 'crater3', 'cage3', 'reaper3']);
const FX3 = { group: null, tex: {}, pools: {}, live: new Set(), cam: { r: null, u: null, f: null }, geo: {} };

// --- Texturen (weiß, die Farbe kommt vom Material) ----------------------------------------------
function fx3Texture(kind) {
  if (FX3.tex[kind]) return FX3.tex[kind];
  const c = document.createElement('canvas');
  c.width = kind === 'beam' ? 8 : 128;
  c.height = kind === 'beam' ? 128 : 128;
  const g = c.getContext('2d');
  const m = 64;
  if (kind === 'ring') {
    const rg = g.createRadialGradient(m, m, 0, m, m, m);
    rg.addColorStop(0, 'rgba(255,255,255,0)');
    rg.addColorStop(0.62, 'rgba(255,255,255,0)');
    rg.addColorStop(0.82, 'rgba(255,255,255,0.35)');
    rg.addColorStop(0.92, 'rgba(255,255,255,1)');
    rg.addColorStop(0.97, 'rgba(255,255,255,0.55)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 128, 128);
  } else if (kind === 'disc') {
    const rg = g.createRadialGradient(m, m, 0, m, m, m);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 128, 128);
  } else if (kind === 'spark') {
    const rg = g.createRadialGradient(m, m, 0, m, m, 34);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      g.save();
      g.translate(m, m);
      g.rotate(i * Math.PI / 4);
      g.globalAlpha = i % 2 ? 0.5 : 1;
      g.beginPath();
      g.moveTo(-62, 0);
      g.quadraticCurveTo(0, -4, 62, 0);
      g.quadraticCurveTo(0, 4, -62, 0);
      g.fill();
      g.restore();
    }
  } else if (kind === 'rune') {
    g.strokeStyle = '#ffffff';
    g.fillStyle = '#ffffff';
    g.lineWidth = 3;
    for (const r of [60, 46, 30]) {
      g.beginPath();
      g.arc(m, m, r, 0, Math.PI * 2);
      g.stroke();
    }
    // Zeichen zwischen den Ringen
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.save();
      g.translate(m + Math.cos(a) * 53, m + Math.sin(a) * 53);
      g.rotate(a + Math.PI / 2);
      g.beginPath();
      g.moveTo(-4, 3);
      g.lineTo(0, -4);
      g.lineTo(4, 3);
      g.moveTo(0, -4);
      g.lineTo(0, 4);
      g.stroke();
      g.restore();
    }
    // Stern
    g.beginPath();
    for (let i = 0; i <= 6; i++) {
      const a = -Math.PI / 2 + (i * 2 / 6) * Math.PI * 2;
      const x = m + Math.cos(a) * 44;
      const y = m + Math.sin(a) * 44;
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
    const rg = g.createRadialGradient(m, m, 0, m, m, m);
    rg.addColorStop(0, 'rgba(255,255,255,0.25)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 128, 128);
  } else if (kind === 'star') {
    // fünfzackiger Stern mit Schein (Betäubung)
    const rg = g.createRadialGradient(m, m, 0, m, m, 62);
    rg.addColorStop(0, 'rgba(255,255,255,0.55)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#ffffff';
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
      const r = i % 2 ? 21 : 52;
      if (i) g.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r);
      else g.moveTo(m + Math.cos(a) * r, m + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
  } else if (kind === 'flame') {
    // Flammenzunge: unten hell und rund, oben spitz
    const rg = g.createRadialGradient(m, 88, 4, m, 80, 52);
    rg.addColorStop(0, 'rgba(255,255,255,1)');
    rg.addColorStop(0.5, 'rgba(255,255,255,0.65)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.beginPath();
    g.moveTo(m, 4);
    g.bezierCurveTo(m + 48, 58, m + 42, 120, m, 122);
    g.bezierCurveTo(m - 42, 120, m - 48, 58, m, 4);
    g.fill();
  } else if (kind === 'bubble') {
    // Bläschen: heller Rand, Glanzpunkt (Gift)
    g.fillStyle = 'rgba(255,255,255,0.22)';
    g.beginPath();
    g.arc(m, m, 46, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#ffffff';
    g.lineWidth = 9;
    g.beginPath();
    g.arc(m, m, 46, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(m - 17, m - 17, 10, 0, Math.PI * 2);
    g.fill();
  } else if (kind === 'shield') {
    // Schildabdruck: Rand, innerer Ring, Buckel, Nieten
    const rg = g.createRadialGradient(m, m, 0, m, m, m);
    rg.addColorStop(0, 'rgba(255,255,255,0.45)');
    rg.addColorStop(0.75, 'rgba(255,255,255,0.2)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 9;
    g.beginPath();
    g.arc(m, m, 52, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 4;
    g.beginPath();
    g.arc(m, m, 35, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(m, m, 14, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.beginPath();
      g.arc(m + Math.cos(a) * 44, m + Math.sin(a) * 44, 4, 0, Math.PI * 2);
      g.fill();
    }
  } else if (kind === 'crater') {
    // Mulde (Sprungschlag): Graustufen, die Materialfarbe bringt die Bodenfarbe; Norden (Kamera, Sonne)
    // heller Innenhang, Süden dunkle Vorderkante
    const rg = g.createRadialGradient(m, m, 0, m, m, m);
    rg.addColorStop(0, 'rgba(70,70,70,0.9)');
    rg.addColorStop(0.55, 'rgba(95,95,95,0.85)');
    rg.addColorStop(0.8, 'rgba(150,150,150,0.6)');
    rg.addColorStop(0.92, 'rgba(255,255,255,0.45)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath();
    g.ellipse(m, m - 14, 52, 30, 0, Math.PI, Math.PI * 2);
    g.ellipse(m, m - 4, 40, 16, 0, Math.PI * 2, Math.PI, true);
    g.fill();
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.beginPath();
    g.ellipse(m, m + 12, 56, 46, 0, 0, Math.PI);
    g.ellipse(m, m + 6, 48, 34, 0, Math.PI, 0, true);
    g.fill();
  } else if (kind.startsWith('msig')) {
    // Magier-Siegel (seit 8.6): großes gleichseitiges Dreieck als Silhouette, Inkreis, Kreise an den Ecken, kurze Striche
    // außen an den Seitenmitten; Spitze oben (Feuer, Blitz) oder unten (Frost, Erde), Blitz und Erde mit Balken.
    // Kein äußerer Ring, keine Glyphen – das Schamanen-Zeichen ist ein Kreis.
    const n = Number(kind.slice(4));
    const down = n === 1 || n === 3;
    const bar = n === 2 || n === 3;
    const sg = down ? -1 : 1;
    const P = [0, 1, 2].map((i) => {
      const a = -Math.PI / 2 * sg + (i * 2 * Math.PI) / 3;
      return [m + Math.cos(a) * 60, m + Math.sin(a) * 60];
    });
    const rg = g.createRadialGradient(m, m, 0, m, m, 62);
    rg.addColorStop(0, 'rgba(255,255,255,0.22)');
    rg.addColorStop(0.5, 'rgba(255,255,255,0.08)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.beginPath();
    g.moveTo(P[0][0], P[0][1]);
    g.lineTo(P[1][0], P[1][1]);
    g.lineTo(P[2][0], P[2][1]);
    g.closePath();
    g.fill();
    g.strokeStyle = '#ffffff';
    g.fillStyle = '#ffffff';
    g.lineJoin = 'round';
    g.lineWidth = 5;
    g.stroke();
    g.lineWidth = 2;
    g.beginPath();
    g.arc(m, m, 30, 0, Math.PI * 2);
    g.stroke();
    for (const [x, y] of P) {
      g.beginPath();
      g.arc(x, y, 6, 0, Math.PI * 2);
      g.fill();
    }
    // je Seite zwei kurze Striche nach außen, neben der Seitenmitte
    g.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const [ax, ay] = P[i];
      const [bx, by] = P[(i + 1) % 3];
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const ox = (mx - m) / 30;
      const oy = (my - m) / 30;
      const tx = (bx - ax) / 104;
      const ty = (by - ay) / 104;
      for (const s of [-12, 12]) {
        g.beginPath();
        g.moveTo(mx + tx * s + ox * 4, my + ty * s + oy * 4);
        g.lineTo(mx + tx * s + ox * 13, my + ty * s + oy * 13);
        g.stroke();
      }
    }
    if (bar) {
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(m - 44, m - sg * 6);
      g.lineTo(m + 44, m - sg * 6);
      g.stroke();
    }
  } else if (kind === 'mflame') {
    // scharfe Flammenzunge (seit 8.6, Magier, normal gemischt): dunkler Rand, heller Kern, gewellte Spitze
    const tongue = (w, top, bot) => {
      g.beginPath();
      g.moveTo(m + 4, top);
      g.bezierCurveTo(m + w * 0.5, top + 30, m + w * 1.1, bot - 40, m + w * 0.8, bot - 14);
      g.quadraticCurveTo(m, bot + 8, m - w * 0.8, bot - 14);
      g.bezierCurveTo(m - w * 1.1, bot - 40, m - w * 0.2, top + 40, m + 4, top);
      g.closePath();
      g.fill();
    };
    g.fillStyle = 'rgb(150,150,150)';
    tongue(40, 4, 122);
    g.fillStyle = 'rgb(215,215,215)';
    tongue(28, 34, 118);
    g.fillStyle = '#ffffff';
    tongue(16, 66, 114);
  } else if (kind === 'hexfrost') {
    // Reif (seit 8.6): Sechseck-Umriss und sechs farnartige Frostlinien von der Mitte
    const rg = g.createRadialGradient(m, m, 0, m, m, 60);
    rg.addColorStop(0, 'rgba(255,255,255,0.5)');
    rg.addColorStop(0.75, 'rgba(255,255,255,0.28)');
    rg.addColorStop(1, 'rgba(255,255,255,0.12)');
    g.fillStyle = rg;
    g.strokeStyle = '#ffffff';
    g.lineJoin = 'round';
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      if (i) g.lineTo(m + Math.cos(a) * 60, m + Math.sin(a) * 60);
      else g.moveTo(m + Math.cos(a) * 60, m + Math.sin(a) * 60);
    }
    g.closePath();
    g.fill();
    g.lineWidth = 4;
    g.stroke();
    g.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      g.beginPath();
      g.moveTo(m, m);
      g.lineTo(m + c * 52, m + sn * 52);
      for (const d of [16, 28, 40]) {
        const l = 13 - d * 0.18;
        for (const side of [-0.6, 0.6]) {
          g.moveTo(m + c * d, m + sn * d);
          g.lineTo(m + Math.cos(a + side) * (d + l) , m + Math.sin(a + side) * (d + l));
        }
      }
      g.stroke();
    }
  } else if (kind === 'mcracks') {
    // Bernsteinrisse (seit 8.6): acht gezackte Strahlen mit weichem Leuchten
    const rays = [];
    for (let i = 0; i < 8; i++) {
      const pts = [[m, m]];
      let ang = (i / 8) * Math.PI * 2 + Math.sin(i * 5.1) * 0.2;
      for (let d = 12; d <= 60; d += 12) {
        ang += Math.sin(i * 3.7 + d) * 0.32;
        pts.push([m + Math.cos(ang) * d, m + Math.sin(ang) * d]);
      }
      rays.push(pts);
    }
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const [w, al] of [[6, 0.16], [3.5, 0.35], [1.6, 1]]) {
      g.strokeStyle = `rgba(255,255,255,${al})`;
      g.lineWidth = w;
      for (const pts of rays) {
        g.beginPath();
        pts.forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.stroke();
      }
    }
    const rg = g.createRadialGradient(m, m, 0, m, m, 22);
    rg.addColorStop(0, 'rgba(255,255,255,0.6)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 128, 128);
  } else if (kind === 'beam') {
    // senkrecht: unten hell, nach oben ausblendend (oben im Bild = oben am Zylinder)
    const lg = g.createLinearGradient(0, 0, 0, 128);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.55, 'rgba(255,255,255,0.45)');
    lg.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = lg;
    g.fillRect(0, 0, 8, 128);
  }
  const t = new THREE.CanvasTexture(c);
  FX3.tex[kind] = t;
  return t;
}

function fx3Mat(map, vertexColors) {
  return new THREE.MeshBasicMaterial({
    map: map || null, color: 0xffffff, transparent: true, opacity: 1, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, vertexColors: !!vertexColors
  });
}

// --- Bausteine aus dem Vorrat -------------------------------------------------------------------
// plane: flach am Boden; wall: offener Zylinder; seg: dünner Zylinder für Blitze und Strahlen;
// strip: gebogener Streifen (Schnitte, Schwünge); sprite: Lichtfleck zur Kamera gedreht
const FX3_STRIP_N = 18;
function fx3Make(kind) {
  let o;
  if (kind.startsWith('plane')) {
    o = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fx3Mat(fx3Texture('ring')));
    // planeN…: normal gemischt – Warnkreise bleiben auch auf hellem Schnee und Eis sichtbar (seit 8.6 auch Reif und Siegel)
    if (kind.startsWith('planeN')) o.material.blending = THREE.NormalBlending;
    o.rotation.x = -Math.PI / 2;
  } else if (kind === 'wall') {
    o = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 28, 1, true), fx3Mat(fx3Texture('beam')));
  } else if (kind === 'seg' || kind === 'segTop' || kind === 'segN') {
    o = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, kind === 'segN' ? 12 : 6, 1, true), fx3Mat(null));
    // segN (seit 9.7): normal gemischt, deckt auch auf hellem Boden (Wasserstrahl)
    if (kind === 'segN') o.material.blending = THREE.NormalBlending;
  } else if (kind === 'strip') {
    const geo = new THREE.BufferGeometry();
    const n = (FX3_STRIP_N + 1) * 2;
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const idx = [];
    for (let i = 0; i < FX3_STRIP_N; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geo.setIndex(idx);
    o = new THREE.Mesh(geo, fx3Mat(null, true));
    o.frustumCulled = false;
  } else if (kind === 'cone' || kind === 'coneG') {
    // Zacken aus dem Boden: Fels/Knochen (fest) oder Kristall/Glut (leuchtend)
    const mat = kind === 'cone'
      ? new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 1 })
      : fx3Mat(null);
    o = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 5), mat);
  } else if (kind === 'rock' || kind === 'rockcol') {
    // Erdbrocken und Felspfeiler (seit 8.3): eine gemeinsame Geometrie je Art, fest und facettiert
    if (!FX3.geo.rock) {
      FX3.geo.rock = new THREE.DodecahedronGeometry(1, 0);
      const col = new THREE.CylinderGeometry(0.62, 1, 1, 6, 1).toNonIndexed();
      col.computeVertexNormals();
      FX3.geo.rockcol = col;
    }
    o = new THREE.Mesh(FX3.geo[kind], new THREE.MeshLambertMaterial({ color: 0xffffff }));
  } else if (kind === 'ice') {
    // Eisblock (seit 8.6): sechseckiges Prisma, durchscheinend, mit Deckel
    if (!FX3.geo.ice) FX3.geo.ice = new THREE.CylinderGeometry(1, 1, 1, 6, 1, false);
    o = new THREE.Mesh(FX3.geo.ice, new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x1a3fb0, transparent: true, opacity: 0.45, depthWrite: false }));
  } else if (kind === 'smoke' || kind === 'smokeTop') {
    o = new THREE.Sprite(new THREE.SpriteMaterial({ map: fx3Texture('disc'), color: 0x000000, transparent: true, depthWrite: false, fog: false }));
  } else if (kind === 'skull') {
    // Schädel der Schädelsalve (seit 8.5): Knochenkugel 0,55 lang, Kiefer am Scharnier hinten, zwei leuchtende Augen
    fx3SoulGeo();
    o = new THREE.Group();
    const head = new THREE.Mesh(FX3.geo.skull, FX3.geo.boneMat);
    head.scale.set(0.275, 0.215, 0.24);
    o.add(head);
    const hinge = new THREE.Group();
    hinge.position.set(-0.08, -0.1, 0);
    const jaw = new THREE.Mesh(FX3.geo.box, FX3.geo.boneMat);
    jaw.scale.set(0.26, 0.06, 0.24);
    jaw.position.set(0.17, -0.02, 0);
    hinge.add(jaw);
    o.add(hinge);
    // dunkle Augenhöhlen, darin die Glut (immer sichtbar, auch von schräg oben)
    const eyeMat = new THREE.SpriteMaterial({ map: fx3Texture('disc'), color: 0xa7e37f, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false });
    for (const ez of [-0.1, 0.1]) {
      const socket = new THREE.Mesh(FX3.geo.skull, FX3.geo.socketMat);
      socket.position.set(0.19, 0.08, ez);
      socket.scale.set(0.1, 0.09, 0.085);
      o.add(socket);
      const eye = new THREE.Sprite(eyeMat);
      eye.position.set(0.24, 0.1, ez);
      eye.scale.set(0.19, 0.19, 1);
      eye.renderOrder = 6;
      o.add(eye);
    }
    o.userData.hinge = hinge;
    o.userData.eyeMat = eyeMat;
  } else if (kind === 'bone' || kind === 'robe' || kind === 'hood' || kind === 'boneRing') {
    // feste Körper (seit 8.5): Rippen und Sensenstiel, Kutte und Kapuze des Schnitters, Knochenring des Käfigs
    fx3SoulGeo();
    o = new THREE.Mesh(FX3.geo[kind], new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 1 }));
  } else {
    o = new THREE.Sprite(new THREE.SpriteMaterial({ map: fx3Texture('spark'), color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  }
  o.renderOrder = 5;
  // ...Top (seit 8.5): Geist im Seelenkäfig, immer sichtbar (auch über dem gefangenen Gegner); Knochen darüber
  if (kind.endsWith('Top')) {
    o.material.depthTest = false;
    o.renderOrder = 6;
  } else if (kind === 'bone' || kind === 'boneRing') o.renderOrder = 7;
  o.castShadow = false;
  o.receiveShadow = false;
  o.userData.kind = kind;
  FX3.group.add(o);
  return o;
}

// gemeinsame Geometrie der Seelen-Fertigkeiten (Nekromant, seit 8.5): einmal anlegen, von allen Teilen geteilt
function fx3SoulGeo() {
  if (FX3.geo.skull) return;
  FX3.geo.skull = new THREE.SphereGeometry(1, 10, 8);
  FX3.geo.box = new THREE.BoxGeometry(1, 1, 1);
  FX3.geo.boneMat = new THREE.MeshLambertMaterial({ color: '#d8cfb2' });
  FX3.geo.socketMat = new THREE.MeshLambertMaterial({ color: '#16200f' });
  FX3.geo.bone = new THREE.CylinderGeometry(1, 1, 1, 6);
  FX3.geo.robe = new THREE.CylinderGeometry(0.5, 1, 1, 10);
  FX3.geo.hood = new THREE.ConeGeometry(1, 1, 10);
  FX3.geo.boneRing = new THREE.TorusGeometry(1, 0.28, 5, 12);
}

function fx3Take(h, kind) {
  const pool = FX3.pools[kind] || (FX3.pools[kind] = []);
  const o = pool.pop() || fx3Make(kind);
  o.visible = true;
  // Kegel werden seit 9.7 auch frei gedreht (Eiszapfen): immer aufrecht ausgeben
  if (kind === 'cone' || kind === 'coneG') o.rotation.set(0, 0, 0);
  h.parts.push(o);
  return o;
}

function fx3Release(h) {
  for (const o of h.parts) {
    o.visible = false;
    FX3.pools[o.userData.kind].push(o);
  }
  h.parts.length = 0;
}

// --- Hilfen --------------------------------------------------------------------------------------
const _x3fa = new THREE.Vector3();
const _x3fb = new THREE.Vector3();
const _x3fy = new THREE.Vector3(0, 1, 0);

function fx3Map(o, kind) {
  const t = kind ? fx3Texture(kind) : null;
  if (o.material.map !== t) { o.material.map = t; o.material.needsUpdate = true; }
}

function fx3Color(o, color, op) {
  o.material.color.set(color);
  o.material.opacity = Math.max(0, Math.min(1, op));
}

// flach am Boden: Mitte (Welt-Pixel), Radius (Einheiten), Höhe, Textur, Drehung
function fx3Ground(o, x, z, r, h, tex, rot = 0) {
  fx3Map(o, tex);
  o.position.set(x * U3, h, z * U3);
  o.scale.set(r, r, 1);
  o.rotation.set(-Math.PI / 2, 0, rot);
}

// Zylinder zwischen zwei Punkten (Einheiten)
function fx3Segment(o, a, b, r) {
  _x3fa.subVectors(b, a);
  const len = _x3fa.length() || 0.001;
  o.position.copy(a).addScaledVector(_x3fa, 0.5);
  o.scale.set(r, len, r);
  o.quaternion.setFromUnitVectors(_x3fy, _x3fa.divideScalar(len));
}

function fx3Wall(o, x, z, r, h, y0 = 0) {
  o.position.set(x * U3, y0 + h / 2, z * U3);
  o.scale.set(r, h, r);
  o.quaternion.identity();
}

// gebogener Streifen: Mitte c, Ebene (u, v), Radius, Breite, Winkel von a0 bis a1;
// lens: Sichel (in der Mitte am breitesten), sonst vorn breit und hell (Schweif)
const _x3stripCol = new THREE.Color();
function fx3Strip(o, c, u, v, r, w, a0, a1, color, op, lens) {
  const pos = o.geometry.attributes.position.array;
  const col = o.geometry.attributes.color.array;
  const cc = _x3stripCol.set(color);
  for (let i = 0; i <= FX3_STRIP_N; i++) {
    const t = i / FX3_STRIP_N;
    const a = a0 + (a1 - a0) * t;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const ww = lens ? w * Math.sin(Math.PI * t) : w * Math.pow(t, 0.8);
    const br = (lens ? Math.pow(Math.sin(Math.PI * t), 0.6) : 0.25 + 0.75 * t) * op;
    for (let s = 0; s < 2; s++) {
      const rr = s ? r - ww : r;
      const j = (i * 2 + s) * 3;
      pos[j] = c.x + (u.x * ca + v.x * sa) * rr;
      pos[j + 1] = c.y + (u.y * ca + v.y * sa) * rr;
      pos[j + 2] = c.z + (u.z * ca + v.z * sa) * rr;
      const b = s ? br * 0.75 : br;
      col[j] = cc.r * b;
      col[j + 1] = cc.g * b;
      col[j + 2] = cc.b * b;
    }
  }
  o.geometry.attributes.position.needsUpdate = true;
  o.geometry.attributes.color.needsUpdate = true;
  o.material.opacity = 1;
}

// Körpermitte eines Effekts in Einheiten (Schnitte und Treffer liegen auf Höhe des Körpers)
function fx3Body(e, out) {
  if (e.follow) {
    const f = e.follow;
    out.set((f.x + (e.ox || 0)) * U3, Math.max(0.25, -(e.oy || 0) * U3 * 1.4), (feetY(f) + Math.max(0, e.oy || 0)) * U3);
  } else {
    out.set(e.x * U3, 0.65, (e.y + 16) * U3);
  }
  return out;
}

// Bodenpunkt eines Effekts (Pixel) und Höhe über dem Boden (Einheiten)
function fx3Foot(e) {
  if (e.follow) return { x: e.follow.x + (e.ox || 0), z: feetY(e.follow), h: Math.max(0.04, -(e.oy || 0) * U3 * 1.2) };
  return { x: e.x, z: e.y, h: 0.04 };
}

// Farben des Drachen (dragon3): Glutdrache aus Feuer, Blitzdrache (seit 7.7) mit zuckenden Funken
const DRAGON3_PAL = {
  feuer: { tail: '#c8302a', mid: '#ff6a2a', neck: '#ffb04a', core: '#fff2c0', fin: '#ffd34d', head: '#ffe08a', jawU: '#ff8a2a', jawL: '#c8402f', horn: '#fff2c0', whisk: '#ffb04a', ember: '#ffd34d' },
  blitz: { tail: '#1a2aa8', mid: '#2a62f0', neck: '#5aa8ff', core: '#e8f6ff', fin: '#bfe4ff', head: '#a8d8ff', jawU: '#6ab8ff', jawL: '#3a5ad8', horn: '#ffffff', whisk: '#9fd0ff', ember: '#e0f4ff', zap: true }
};

// --- Je Effektart --------------------------------------------------------------------------------
const _x3c = new THREE.Vector3();
const _x3u = new THREE.Vector3();
const _x3v = new THREE.Vector3();
const _x3p = new THREE.Vector3();
const _x3q = new THREE.Vector3();

// Zufallswerte je Effekt einmal festlegen (gleiche Flugbahn in jedem Bild)
function fx3Seed(h, n, make) {
  if (!h.seed) h.seed = Array.from({ length: n }, make);
  return h.seed;
}

// Kegel vom Punkt b in Richtung d (normiert), Länge len, Dicke w
function fx3Cone(o, b, d, len, w) {
  o.position.copy(b).addScaledVector(d, len / 2);
  o.scale.set(w, Math.max(0.01, len), w);
  o.quaternion.setFromUnitVectors(_x3fy, d);
}
const _x3hb = new THREE.Vector3();
const _x3hd = new THREE.Vector3();

// Ebene am Boden mit eigenen Halbachsen (Furche, Riss): Mitte, halbe Länge, halbe Breite, Drehung
function fx3Strip2(o, x, z, hl, hw, h, tex, rot) {
  fx3Map(o, tex);
  o.position.set(x * U3, h, z * U3);
  o.scale.set(Math.max(0.001, hl), Math.max(0.001, hw), 1);
  o.rotation.set(-Math.PI / 2, 0, rot);
}
function fx3Rock(h, kind, x, y, z, sx, sy, sz, color) {
  const o = fx3Take(h, kind);
  o.position.set(x, y, z);
  o.scale.set(Math.max(0.001, sx), Math.max(0.001, sy), Math.max(0.001, sz));
  o.material.color.set(color);
  return o;
}
const _x3w1 = new THREE.Vector3();
const _x3w2 = new THREE.Vector3();
const _x3w3 = new THREE.Vector3();
const _x3w4 = new THREE.Vector3();
const _x3tile = {};
const _x3col = new THREE.Color();
const _x3mix = new THREE.Color('#6b5236');
const CRATER3_MAX = 3;

// Eiszapfen des Blizzards (seit 9.7): ein Bündel spitzer Eiskegel, Spitze voran in Fallrichtung, mit dünner,
// heller Fallspur (früher runde Leuchtkugeln) und einem kalten Schatten am Boden
const _icDir = new THREE.Vector3();
const _icUp = new THREE.Vector3(0, 1, 0);
const _icQ = new THREE.Quaternion();
const ICICLE3 = [[0, 0, 0, 1, 0.13], [0.09, 0.05, 0.12, 0.62, 0.08], [-0.08, -0.04, 0.1, 0.55, 0.07]];
function fx3Icicle(h, e, u, sz, fall) {
  fall(u, _x3c);
  fall(Math.max(0, u - 0.08), _x3p);
  _icDir.subVectors(_x3c, _x3p);
  if (_icDir.lengthSq() < 1e-6) _icDir.set(-45 * U3, -3.8, 20 * U3);
  _icDir.normalize();
  // Spitze zeigt nach unten in Fallrichtung (Kegelspitze ist +Y)
  _icQ.setFromUnitVectors(_icUp, _icDir);
  // Fallspur: zwei dünne Striche hinter dem Zapfen
  fall(Math.max(0, u - 0.3), _x3p);
  const tr = fx3Take(h, 'seg');
  fx3Segment(tr, _x3p, _x3c, 0.025 * sz);
  fx3Color(tr, '#dff4ff', 0.55);
  const tr2 = fx3Take(h, 'seg');
  fx3Segment(tr2, _x3p, _x3c, 0.07 * sz);
  fx3Color(tr2, '#6ab8ff', 0.2);
  for (const [ox, oz, back, len, wid] of ICICLE3) {
    const ice = fx3Take(h, 'cone');
    ice.quaternion.copy(_icQ);
    ice.position.copy(_x3c).addScaledVector(_icDir, -back * sz - len * sz * 0.5);
    ice.position.x += ox * sz;
    ice.position.z += oz * sz;
    ice.scale.set(wid * sz, len * sz, wid * sz);
    ice.material.color.set('#a8dcff');
    ice.material.opacity = 0.95;
    const core = fx3Take(h, 'coneG');
    core.quaternion.copy(_icQ);
    core.position.copy(ice.position);
    core.scale.set(wid * sz * 0.5, len * sz * 0.9, wid * sz * 0.5);
    fx3Color(core, '#7ac8ff', 0.8);
  }
  const sh = fx3Take(h, 'planeN');
  fx3Ground(sh, e.x, e.y, 0.2 + u * 0.35 * sz, 0.04, 'disc');
  fx3Color(sh, '#9fd8ff', 0.2 + u * 0.35);
}

const FX3_DRAW = {
  // Sichelwelle (seit 8.3): stahlweiße Klingensichel, aufrecht und 40° nach vorn gekippt, gleitet über den Boden;
  // dahinter eine Lichtschleppe und eine dunkle Schnittfurche
  wave3(h, e) {
    const t = game.time - e.start;
    const travel = e.dist / e.speed;
    const d = Math.min(e.dist, t * e.speed);
    const fade = t < travel ? 1 : Math.max(0, 1 - (t - travel) / 0.3);
    const g = 0.7 + 0.3 * Math.min(1, t / 0.08);
    const ang = Math.atan2(-e.dy, e.dx);
    const mx = e.x + e.dx * d / 2;
    const mz = e.y + e.dy * d / 2;
    if (d > 2) {
      const furrow = fx3Take(h, 'planeN');
      fx3Strip2(furrow, mx, mz, d * U3 / 2, 0.12, 0.035, 'disc', ang);
      fx3Color(furrow, '#2a2018', 0.55 * (t < travel ? 1 : Math.max(0, 1 - (t - travel) / (e.dur - travel))));
      if (fade > 0) {
        const trail = fx3Take(h, 'plane');
        fx3Strip2(trail, mx, mz, d * U3 / 2, 0.45, 0.03, 'disc', ang);
        fx3Color(trail, '#9fc8ff', 0.35 * fade);
      }
    }
    if (fade <= 0) return;
    _x3w1.set((e.x + e.dx * d) * U3, 0.3, (e.y + e.dy * d) * U3);
    _x3w2.set(-e.dy, 0, e.dx);
    _x3w3.set(e.dx * 0.64, 0.77, e.dy * 0.64).normalize();
    const half = (e.w / 2) * U3 * g * 1.4;
    const span = 2.3;
    const rr = half / Math.sin(span / 2);
    const a0 = Math.PI / 2 - span / 2;
    const a1 = Math.PI / 2 + span / 2;
    _x3w4.copy(_x3w1).addScaledVector(_x3w3, -rr * Math.cos(span / 2));
    const layer = (r, w, from, to, color, op) => fx3Strip(fx3Take(h, 'strip'), _x3w4, _x3w2, _x3w3, r, w, from, to, color, op, true);
    if (e.rank != null && e.rank >= 0) layer(rr + 0.08, 0.5, a0, a1, e.rankColor, 0.8 * fade);
    layer(rr, 0.42, a0, a1, '#9fc8ff', 0.6 * fade);
    layer(rr - 0.04, 0.26, a0, a1, e.color || '#e6eeff', fade);
    layer(rr - 0.08, 0.09, a0 + 0.12, a1 - 0.12, '#ffffff', fade);
    if (!(e.rank >= 0) && d > 12) {
      _x3w4.addScaledVector(_x3w3.set(e.dx, 0, e.dy), -0.35);
      _x3w3.set(e.dx * 0.64, 0.77, e.dy * 0.64).normalize();
      layer(rr - 0.04, 0.22, a0, a1, e.color || '#e6eeff', 0.4 * fade);
    }
  },
  // Felsenfaust (seit 8.3): Riss mit Dornen läuft zum Ziel, dort bricht ein sechseckiger Pfeiler mit Felsfaust hervor
  erupt3(h, e) {
    const t = game.time - e.start;
    const dx = e.x1 - e.x0;
    const dz = e.y1 - e.y0;
    const len = Math.hypot(dx, dz) || 1;
    const ux = dx / len;
    const uz = dz / len;
    const ang = Math.atan2(-uz, ux);
    const L = Math.min(1, t / 0.14) * len;
    const lineOp = t < 1 ? 0.7 : Math.max(0, 0.7 * (1 - (t - 1) / 0.3));
    if (L > 2) {
      const crack = fx3Take(h, 'planeN');
      fx3Strip2(crack, e.x0 + ux * L / 2, e.y0 + uz * L / 2, L * U3 / 2, 0.08, 0.036, 'disc', ang);
      fx3Color(crack, '#1e140c', lineOp);
      const glow = 0.3 * Math.max(0, 1 - t / 0.5);
      if (glow > 0) {
        const lit = fx3Take(h, 'plane');
        fx3Strip2(lit, e.x0 + ux * L / 2, e.y0 + uz * L / 2, L * U3 / 2, 0.16, 0.03, 'disc', ang);
        fx3Color(lit, '#c8a878', glow);
      }
    }
    // Dornen entlang des Risses
    const n = Math.max(2, Math.min(4, Math.round(len / 30)));
    const sink = clamp01((t - 0.8) / 0.3);
    for (let i = 0; i < n; i++) {
      const f = (i + 1) / (n + 1);
      const r = easeOutBack(clamp01((t - f * 0.14) / 0.06)) * (1 - sink);
      if (r <= 0.01) continue;
      const side = i % 2 ? 8 : -8;
      const px = e.x0 + ux * len * f - uz * side;
      const pz = e.y0 + uz * len * f + ux * side;
      const hy = (0.22 + 0.03 * i) * r;
      const o = fx3Rock(h, 'rock', px * U3, hy * 0.5, pz * U3, 0.09 * r, hy, 0.08 * r, i % 2 ? '#a8957a' : '#7a6a54');
      o.rotation.set(uz * 0.3, i * 1.3, -ux * 0.3);
    }
    // Pfeiler, Faust, Kranz
    const k = t - 0.16;
    if (k < 0) return;
    const up = k < 0.07 ? easeOutBack(k / 0.07) : 1;
    const down = clamp01((k - 0.51) / 0.45);
    const S = Math.max(0.8, Math.min(1.3, (e.r || 14) * U3 * 2.2));
    const H = 1.15 * S * up * (1 - down);
    const x = e.x1 * U3;
    const z = e.y1 * U3;
    const rot = e.rot || (e.rot = Math.random() * Math.PI);
    if (H > 0.01) {
      const wide = 0.36 * S * (1 - 0.3 * down);
      const col = fx3Rock(h, 'rockcol', x, H / 2 - 0.04, z, wide, H, wide, e.color || '#8a7a62');
      col.rotation.set(0.12 * down, rot, 0.1 * down);
      const fist = fx3Rock(h, 'rock', x, H + 0.14 * S * up, z, 0.44 * S * up, 0.34 * S * up, 0.4 * S * up, '#a8946e');
      fist.rotation.set(0.2, rot + k * 3, 0.1);
      const ku = k < 0.1 ? easeOutBack(clamp01((k - 0.03) / 0.07)) : 1;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + rot;
        const s = S * ku * (1 - down);
        if (s <= 0.01) continue;
        const w = fx3Rock(h, 'rock', x + Math.cos(a) * 0.42 * S, 0.08 * s, z + Math.sin(a) * 0.42 * S, 0.13 * s, 0.22 * s, 0.1 * s, '#6a5a46');
        w.rotation.set(Math.sin(a) * 0.7, a, -Math.cos(a) * 0.7);
      }
    }
    const bowl = fx3Take(h, 'planeN');
    fx3Ground(bowl, e.x1, e.y1, 0.6 * S, 0.035, 'crater', 0);
    fx3Color(bowl, '#8a7458', 0.9 * (1 - down));
    if (k < 0.3) {
      const gap = fx3Take(h, 'plane');
      fx3Ground(gap, e.x1, e.y1, 0.7 * S, 0.04, 'ring', 0);
      fx3Color(gap, '#ffd38a', 0.6 * Math.pow(1 - k / 0.3, 2));
    }
  },
  // Sprungschlag (seit 8.3): Mulde in Bodenfarbe, ringsum ein Wall aus Erdbrocken, die nach außen gedrückt
  // werden, und ein paar hochgedrückte Schollen – keine Explosion. Nach 2 s sinkt alles zurück.
  crater3(h, e) {
    const t = game.time - e.start;
    const R = (e.r || 50) * U3;
    if (!e.tint) {
      tileSample(Math.floor(e.x / TILE), Math.floor(e.y / TILE), _x3tile);
      e.liquid = _x3tile.h < 0;
      _x3col.setRGB(_x3tile.r || 0.4, _x3tile.g || 0.35, _x3tile.b || 0.25);
      if (_x3tile.soil === 3) _x3col.lerp(new THREE.Color('#7a7a7a'), 0.45);
      else _x3col.lerp(_x3mix, 0.45);
      e.tint = '#' + _x3col.getHexString();
      // aufgeworfene Erde: deutlich brauner als die Oberfläche (auf Fels grau)
      _x3col.lerp(_x3tile.soil === 3 ? _x3col : _x3mix, 0.6);
      e.earth = '#' + _x3col.getHexString();
      // höchstens drei Krater: ältere sinken sofort
      const live = game.effects.filter((q) => q.type === 'crater3' && q !== e && game.time - q.start < 1.3);
      if (live.length >= CRATER3_MAX) live[0].start = Math.min(live[0].start, game.time - 1.3);
    }
    if (e.liquid) {
      // ins Wasser gesprungen: nur Ringe
      const o = fx3Take(h, 'plane');
      fx3Ground(o, e.x, e.y, R * (1 + t), 0.05, 'ring', 0);
      fx3Color(o, '#cfeeff', Math.max(0, 0.8 - t * 0.5));
      return;
    }
    const rise = t < 0.07 ? 1.12 * easeOutBack(t / 0.07) : t < 0.18 ? 1.12 - 0.12 * (t - 0.07) / 0.11 : t < 1.3 ? 1 - 0.08 * (t - 0.18) / 1.12 : 0.92 * (1 - smooth01((t - 1.3) / 0.7));
    const open = 0.6 + 0.4 * easeOut(Math.min(1, t / 0.07));
    const bowlOp = t < 1.3 ? 0.95 : Math.max(0, 0.95 * (1 - (t - 1.3) / 0.7));
    const bowl = fx3Take(h, 'planeN');
    fx3Ground(bowl, e.x, e.y, R * open, 0.035, 'crater', 0);
    fx3Color(bowl, e.tint, bowlOp);
    const seam = fx3Take(h, 'planeN');
    fx3Ground(seam, e.x, e.y, R, 0.038, 'ring', 0);
    fx3Color(seam, '#1e140c', 0.4 * bowlOp);
    const low = typeof opts !== 'undefined' && opts.graphics === 'niedrig';
    const N = e.n || (e.n = low ? 8 : 12);
    const sd = fx3Seed(h, N + 12, (v, i) => ({
      a: (i / N) * Math.PI * 2 + (Math.random() - 0.5) * 0.4, d: 0.95 + Math.random() * 0.15,
      sx: 0.2 + Math.random() * 0.1, sy: 0.11 + Math.random() * 0.07, sz: 0.14 + Math.random() * 0.06,
      tilt: 0.3 + Math.random() * 0.2, tone: (Math.random() - 0.5) * 0.16, hm: 0.25 + Math.random() * 0.15, fl: 0.4 + Math.random() * 0.4
    }));
    const cx = e.x * U3;
    const cz = e.y * U3;
    const push = Math.min(1, t / 0.07);
    const r2 = Math.max(0, rise);
    _x3col.set(e.tint);
    // Wall aus Erdbrocken
    const wall = (q, ring, size, delay) => {
      const rr = R * (ring - (1 - Math.min(1, (t - delay) / 0.07)) * 0.25) * q.d;
      if (t < delay) return;
      const s = size * (0.6 + 0.4 * r2);
      const y = q.sy * size * (0.35 * r2 - (1 - r2));
      const o = fx3Rock(h, 'rock', cx + Math.cos(q.a) * rr, y, cz + Math.sin(q.a) * rr, q.sx * s, q.sy * s, q.sz * s, q.tone > 0 ? lighter(e.earth, q.tone) : darker(e.earth, -q.tone));
      o.rotation.set(Math.sin(q.a) * q.tilt, -q.a, -Math.cos(q.a) * q.tilt);
    };
    for (let i = 0; i < N; i++) wall(sd[i], 0.75 + 0.25 * push, 1, 0);
    if (!low) for (let i = 0; i < 6; i++) wall(sd[N + i], 1.3, 0.6, 0.03);
    // hochgedrückte Schollen: flacher Bogen nach außen, dann liegen bleiben und schrumpfen
    for (let i = 0; i < 6; i++) {
      const q = sd[N + 6 + i];
      const u = Math.min(1, t / 0.35);
      const dist = R * 0.85 + q.fl * u;
      const y = 4 * q.hm * u * (1 - u);
      const s = (0.05 + 0.04 * (i % 3) / 2) * (1 - clamp01((t - 0.6) / 0.6));
      if (s <= 0.002) continue;
      const o = fx3Rock(h, 'rock', cx + Math.cos(q.a + 0.3) * dist, y + s * 0.5, cz + Math.sin(q.a + 0.3) * dist, s, s * 0.8, s, darker(e.earth, 0.1));
      o.rotation.set(t * 6 * (u < 1 ? 1 : 0), q.a, t * 4 * (u < 1 ? 1 : 0));
    }
  },
  // Schildabdruck (Schildstoß): goldene Scheibe steht senkrecht vor der Figur und weitet sich
  shield3(h, e, k) {
    // zur Kamera gedreht, damit man den Abdruck von oben sieht; dazu ein Schein am Boden
    const o = fx3Take(h, 'spriteShield');
    fx3Map(o, 'shield');
    const s = (0.75 + 0.6 * easeOut(k)) * (e.size || 1);
    o.position.set(e.x * U3, 0.75, e.y * U3);
    o.scale.set(s, s, 1);
    fx3Color(o, e.color || '#ffe9a0', Math.min(1, (1 - k) * 1.6));
    const g = fx3Take(h, 'plane');
    fx3Ground(g, e.x, e.y, s * 0.9, 0.05, 'disc');
    fx3Color(g, e.color || '#ffe9a0', (1 - k) * 0.6);
  },
  // Gewitterwolke über dem Ziel (Donnersturm): dunkle Ballen, darin Wetterleuchten
  cloud3(h, e, k) {
    const sd = fx3Seed(h, 7, (v, i) => ({ a: (i / 7) * Math.PI * 2 + Math.random() * 0.5, r: i ? 0.5 + Math.random() * 0.5 : 0, s: 1 + Math.random() * 0.6, f: Math.random() * 6 }));
    const x = e.x * U3;
    const z = e.y * U3;
    const fade = k < 0.12 ? k / 0.12 : k > 0.7 ? (1 - k) / 0.3 : 1;
    const y = 4.2 + 0.3 * k;
    for (const q of sd) {
      const o = fx3Take(h, 'smoke');
      o.position.set(x + Math.cos(q.a) * q.r, y + Math.sin(q.a * 3) * 0.15, z + Math.sin(q.a) * q.r * 0.8);
      o.scale.set(q.s * 1.3, q.s * 0.85, 1);
      o.material.color.set(e.color || '#232838');
      o.material.opacity = 0.88 * fade;
    }
    for (let i = 0; i < 3; i++) {
      const q = sd[i * 2];
      const o = fx3Take(h, 'sprite');
      fx3Map(o, 'disc');
      o.position.set(x + Math.cos(q.a) * q.r * 0.6, y - 0.15, z + Math.sin(q.a) * q.r * 0.5);
      o.scale.set(1.5, 1, 1);
      fx3Color(o, '#9fd0ff', Math.max(0, Math.sin(game.time * 23 + q.f * 3)) * 0.8 * fade);
    }
  },
  // Knochenhände greifen aus dem Boden nach dem Ziel (Lähmender Fluch)
  hands3(h, e, k) {
    const f = fx3Foot(e);
    const rise = k < 0.2 ? easeOut(k / 0.2) : k > 0.8 ? (1 - k) / 0.2 : 1;
    const x = f.x * U3;
    const z = f.z * U3;
    const R = (e.r || 14) * U3 + 0.22;
    const glow = fx3Take(h, 'plane');
    fx3Ground(glow, f.x, f.z, R * 1.7, 0.04, 'disc');
    fx3Color(glow, e.color || '#7ad36a', 0.6 * rise);
    // zwei Hände vorn links und rechts (vor dem Körper, damit man sie von oben sieht)
    for (const side of [-1, 1]) {
      _x3hb.set(x + side * R * 0.85, 0, z + 0.22);
      _x3hd.set(-side * 0.3, 1, -0.15).normalize();
      const arm = fx3Take(h, 'cone');
      fx3Cone(arm, _x3hb, _x3hd, 0.48 * rise, 0.13);
      arm.material.color.set('#d8d0b8');
      arm.material.opacity = 1;
      const wx = _x3hb.x + _x3hd.x * 0.42 * rise;
      const wy = 0.42 * rise;
      const wz = _x3hb.z + _x3hd.z * 0.42 * rise;
      for (let i = 0; i < 5; i++) {
        const thumb = i === 4;
        const sz = thumb ? 0.1 : (i - 1.5) * 0.07;
        _x3hb.set(wx, wy, wz + sz);
        _x3hd.set(-side * (thumb ? 1 : 0.75), 1, thumb ? 0.6 : (i - 1.5) * 0.3).normalize();
        const fg = fx3Take(h, 'cone');
        fx3Cone(fg, _x3hb, _x3hd, (thumb ? 0.2 : i === 0 || i === 3 ? 0.26 : 0.31) * rise, 0.055);
        fg.material.color.set('#ece4cc');
        fg.material.opacity = 1;
      }
    }
  },
  // Funken im Raum: fliegen vom Körper weg, fallen mit Schwerkraft
  sparks3(h, e, k) {
    const n = e.count || 14;
    const sd = fx3Seed(h, n, () => ({ a: Math.random() * Math.PI * 2, up: 0.4 + Math.random() * (e.up || 1.2), sp: (0.6 + Math.random()) * (e.speed || 2.6), s: 0.08 + Math.random() * 0.12 }));
    const t = (game.time - e.start);
    const bx = e.x * U3;
    const bz = (e.y) * U3;
    for (const q of sd) {
      const o = fx3Take(h, 'sprite');
      const x = bx + Math.cos(q.a) * q.sp * t;
      const z = bz + Math.sin(q.a) * q.sp * t * 0.8;
      const y = (e.h || 0.7) + q.up * 3 * t - 4.5 * t * t * (e.grav != null ? e.grav : 1);
      o.position.set(x, Math.max(0.05, y), z);
      const s = q.s * (1 - k * 0.6) * (e.size || 1);
      o.scale.set(s, s, 1);
      fx3Map(o, 'spark');
      fx3Color(o, e.color, 1 - k);
    }
  },
  // Zacken brechen im Kreis aus dem Boden und versinken wieder
  shards3(h, e, k) {
    const n = e.count || 9;
    const r = (e.r || 60) * U3;
    const sd = fx3Seed(h, n, (v, i) => ({ a: (i / n) * Math.PI * 2 + Math.random() * 0.4, d: r * (0.55 + Math.random() * 0.45), hgt: 0.5 + Math.random() * 0.6, tilt: 0.2 + Math.random() * 0.3 }));
    const up = k < 0.25 ? easeOut(k / 0.25) : k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    for (const q of sd) {
      const o = fx3Take(h, e.glow ? 'coneG' : 'cone');
      const hh = q.hgt * (e.size || 1) * up;
      o.position.set(e.x * U3 + Math.cos(q.a) * q.d, hh / 2 - 0.05, e.y * U3 + Math.sin(q.a) * q.d);
      o.scale.set(0.12 * (e.size || 1), Math.max(0.01, hh), 0.12 * (e.size || 1));
      o.rotation.set(Math.sin(q.a) * q.tilt, 0, -Math.cos(q.a) * q.tilt);
      o.material.color.set(e.color);
      o.material.opacity = e.glow ? 0.9 * (1 - k * 0.5) : 1;
    }
  },
  // Drache (seit 7.1, Farben aus DRAGON3_PAL): Kopf mit Schnauze, Hörnern und Augen, dahinter ein Leib aus glühenden Gliedern
  // mit Rückenzacken; schlängelt sich im hohen Bogen vom Schamanen zum Ziel
  dragon3(h, e, k) {
    const C = DRAGON3_PAL[e.pal] || DRAGON3_PAL.feuer;
    const t = game.time - e.start;
    const u = Math.min(1, t / e.fly);
    const fade = t > e.fly ? Math.max(0, 1 - (t - e.fly) / 0.15) : 1;
    if (fade <= 0) return;
    const sz = (e.size || 1) * 1.5;
    const dx = e.tx - e.x;
    const dz = e.ty - e.y;
    const L = Math.hypot(dx, dz) || 1;
    const at = (q, out) => {
      q = Math.max(0, Math.min(1, q));
      const side = Math.sin(q * Math.PI * 3 + 0.6) * 30 * (1 - q * 0.8);
      out.set((e.x + dx * q - dz / L * side) * U3, 0.9 + Math.sin(Math.PI * q) * 1.6, (e.y + dz * q + dx / L * side) * U3);
      return out;
    };
    // Leib aus überlappenden Gliedern (Schwanz dünn und dunkelrot, zum Hals hin dick und golden)
    const N = 20;
    for (let i = N; i >= 1; i--) {
      const q = u - i * 0.026;
      if (q < 0) continue;
      at(q, _x3p);
      const f = i / N;
      const s = (0.62 - f * 0.42) * sz;
      const o = fx3Take(h, 'sprite');
      o.position.copy(_x3p);
      o.scale.set(s, s, 1);
      fx3Map(o, 'disc');
      fx3Color(o, f < 0.25 ? C.neck : f < 0.6 ? C.mid : C.tail, fade * (1 - f * 0.5));
      const core = fx3Take(h, 'sprite');
      core.position.copy(_x3p);
      core.scale.set(s * 0.42, s * 0.42, 1);
      fx3Map(core, 'disc');
      fx3Color(core, C.core, fade * (0.9 - f * 0.6));
      if (i % 3 === 0 && i < N - 2) {
        // Rückenzacken
        const fin = fx3Take(h, 'coneG');
        fin.position.set(_x3p.x, _x3p.y + s * 0.38, _x3p.z);
        fin.scale.set(0.05 * sz, s * 0.6, 0.05 * sz);
        fin.quaternion.identity();
        fin.material.color.set(C.fin);
        fin.material.opacity = fade;
      }
      if (i % 4 === 2) {
        // Glutfunken lösen sich vom Leib (beim Blitzdrachen zuckende Funken rundherum)
        const sp = fx3Take(h, 'sprite');
        const jit = C.zap ? 0.45 : 0.2;
        sp.position.set(_x3p.x + Math.sin(i * 7 + t * 20) * jit, _x3p.y - (C.zap ? Math.cos(i * 3 + t * 31) * jit : 0.2 + (t * 3 + i) % 0.6), _x3p.z + Math.cos(i * 5 + t * (C.zap ? 27 : 0)) * jit);
        sp.scale.set(C.zap ? 0.2 : 0.12, C.zap ? 0.2 : 0.12, 1);
        fx3Map(sp, 'spark');
        fx3Color(sp, C.ember, fade * (C.zap ? 0.5 + 0.5 * Math.sin(t * 50 + i) : 0.9));
      }
    }
    // Kopf: Richtung aus der Bahn
    at(u, _x3c);
    at(u - 0.03, _x3q);
    _x3u.subVectors(_x3c, _x3q);
    if (_x3u.lengthSq() < 1e-6) _x3u.set(dx, 0, dz);
    _x3u.normalize();
    _x3v.crossVectors(_x3u, _x3fy).normalize();
    const head = fx3Take(h, 'sprite');
    head.position.copy(_x3c);
    head.scale.set(0.85 * sz, 0.85 * sz, 1);
    fx3Map(head, 'disc');
    fx3Color(head, C.head, fade);
    // Oberkiefer und Unterkiefer (Maul offen)
    for (const [dy, len, col] of [[0.05, 0.55, C.jawU], [-0.09, 0.42, C.jawL]]) {
      const jaw = fx3Take(h, 'coneG');
      _x3fa.copy(_x3u).addScaledVector(_x3fy, dy * 3).normalize();
      jaw.position.copy(_x3c).addScaledVector(_x3fa, len * 0.5 * sz).addScaledVector(_x3fy, dy * sz);
      jaw.scale.set(0.15 * sz, len * sz, 0.12 * sz);
      jaw.quaternion.setFromUnitVectors(_x3fy, _x3fa);
      jaw.material.color.set(col);
      jaw.material.opacity = fade;
    }
    // Atem vor dem Maul (Feuer oder knisternder Blitz)
    const breath = fx3Take(h, 'sprite');
    breath.position.copy(_x3c).addScaledVector(_x3u, 0.75 * sz);
    breath.scale.set(0.5 * sz, 0.5 * sz, 1);
    fx3Map(breath, 'spark');
    fx3Color(breath, C.core, fade * (0.6 + 0.4 * Math.sin(t * 40)));
    for (const sd of [-1, 1]) {
      // Hörner nach hinten oben, Barteln seitlich, Augen
      _x3fa.copy(_x3u).multiplyScalar(-1).addScaledVector(_x3fy, 1.1).addScaledVector(_x3v, sd * 0.5).normalize();
      const horn = fx3Take(h, 'coneG');
      horn.position.copy(_x3c).addScaledVector(_x3v, sd * 0.14 * sz).addScaledVector(_x3fy, 0.14 * sz);
      horn.scale.set(0.06 * sz, 0.5 * sz, 0.06 * sz);
      horn.quaternion.setFromUnitVectors(_x3fy, _x3fa);
      horn.material.color.set(C.horn);
      horn.material.opacity = fade;
      _x3fa.copy(_x3u).multiplyScalar(-1).addScaledVector(_x3v, sd * 1.2).addScaledVector(_x3fy, -0.2).normalize();
      const whisker = fx3Take(h, 'coneG');
      whisker.position.copy(_x3c).addScaledVector(_x3u, 0.3 * sz).addScaledVector(_x3v, sd * 0.1 * sz);
      whisker.scale.set(0.03 * sz, 0.55 * sz, 0.03 * sz);
      whisker.quaternion.setFromUnitVectors(_x3fy, _x3fa);
      whisker.material.color.set(C.whisk);
      whisker.material.opacity = fade * 0.9;
      const eye = fx3Take(h, 'sprite');
      eye.position.copy(_x3c).addScaledVector(_x3v, sd * 0.16 * sz).addScaledVector(_x3fy, 0.1 * sz).addScaledVector(_x3u, 0.14 * sz);
      eye.scale.set(0.2 * sz, 0.2 * sz, 1);
      fx3Map(eye, 'spark');
      fx3Color(eye, '#ffffff', fade);
    }
  },
  // Feuerbrocken: fällt schräg vom Himmel, mit Glutschweif (pal 'eis': Eiszapfen mit Frostschweif, seit 7.7)
  meteor3(h, e, k) {
    const ice = e.pal === 'eis';
    const t = game.time - e.start;
    const u = Math.min(1, t / e.fall);
    if (t > e.fall + 0.05) return;
    const sz = e.size || 1;
    const fall = (q, out) => out.set((e.x + (1 - q) * 45) * U3, 0.15 + (1 - q) * 3.8, (e.y - (1 - q) * 20) * U3);
    if (ice) return fx3Icicle(h, e, u, sz, fall);
    for (let i = 5; i >= 0; i--) {
      fall(Math.max(0, u - i * 0.06), _x3p);
      const o = fx3Take(h, 'sprite');
      o.position.copy(_x3p);
      const s = (i ? 0.85 - i * 0.1 : 1.1) * sz;
      o.scale.set(s, s, 1);
      fx3Map(o, i ? 'disc' : 'spark');
      fx3Color(o, i === 0 ? (ice ? '#ffffff' : '#fff2c0') : i < 3 ? (ice ? '#bfe8ff' : '#ffb04a') : (ice ? '#6ab8ff' : '#ff5a2a'), (1 - i * 0.13) * (ice ? 0.7 : 1));
    }
    const rock = fx3Take(h, 'coneG');
    fall(u, _x3c);
    rock.position.copy(_x3c);
    if (ice) {
      // Eiszapfen: lang und spitz, Spitze voran
      rock.scale.set(0.12 * sz, 0.55 * sz, 0.12 * sz);
      rock.rotation.set(Math.PI, 0, -0.35);
      rock.material.color.set('#7ac0ff');
    } else {
      rock.scale.set(0.24 * sz, 0.3 * sz, 0.24 * sz);
      rock.rotation.set(t * 9, t * 7, 0);
      rock.material.color.set('#ff5a1a');
    }
    rock.material.opacity = 1;
    // Schatten wächst am Boden, bis der Brocken einschlägt
    const sh = fx3Take(h, 'planeN');
    fx3Ground(sh, e.x, e.y, 0.25 + u * 0.5 * sz, 0.04, 'disc');
    fx3Color(sh, ice ? '#9fd8ff' : '#ff6a2a', 0.25 + u * 0.4);
  },
  // Monsterbiss (seit 6.7): Ober- und Unterkiefer als leuchtende Bögen, die über dem Ziel zuschnappen
  bite3(h, e, k) {
    const c = fx3Body(e, _x3c);
    const { r: R, u: Up } = FX3.cam;
    const sz = 0.42 * (e.size || 1);
    const close = easeOut(Math.min(1, k * 3.5));
    const gap = sz * 0.75 * (1 - close) - sz * 0.15;
    const fade = k < 0.45 ? 1 : 1 - (k - 0.45) / 0.55;
    for (const sg of [1, -1]) {
      _x3p.copy(c).addScaledVector(Up, sg * gap);
      const mid = sg * Math.PI / 2;
      const o = fx3Take(h, 'strip');
      fx3Strip(o, _x3p, R, Up, sz, sz * 0.3, mid - 1.15, mid + 1.15, e.color, fade, true);
      const core = fx3Take(h, 'strip');
      fx3Strip(core, _x3p, R, Up, sz - sz * 0.05, sz * 0.1, mid - 1.0, mid + 1.0, '#ffffff', fade, true);
    }
  },
  // Prankenhieb: drei Krallenspuren schräg durch das Ziel, kurz nacheinander
  claw3(h, e, k) {
    const c = fx3Body(e, _x3c);
    const { r: R, u: Up, f: F } = FX3.cam;
    const sz = e.size || 1;
    const ang = e.flip ? -0.95 : 0.95;
    _x3u.copy(R).multiplyScalar(Math.cos(ang)).addScaledVector(Up, -Math.sin(ang)).normalize();
    _x3v.copy(R).multiplyScalar(Math.sin(ang)).addScaledVector(Up, Math.cos(ang)).addScaledVector(F, -0.6).normalize();
    const span = 1.1;
    for (let i = -1; i <= 1; i++) {
      const kk = clamp01((k - (i + 1) * 0.06) / 0.94);
      if (kk <= 0) continue;
      const L = 0.95 * sz * Math.min(1, kk * 5) * (i ? 0.85 : 1);
      const W = 0.1 * sz * (1 - kk * 0.6);
      const rr = Math.max(0.05, L / (2 * Math.sin(span / 2)));
      _x3q.copy(R).multiplyScalar(Math.sin(ang)).addScaledVector(Up, Math.cos(ang));
      _x3p.copy(c).addScaledVector(_x3q, i * 0.16 * sz).addScaledVector(_x3v, -rr * Math.cos(span / 2));
      const fade = 1 - kk;
      const o = fx3Take(h, 'strip');
      fx3Strip(o, _x3p, _x3u, _x3v, rr, W, Math.PI / 2 - span / 2, Math.PI / 2 + span / 2, e.color, fade, true);
      const core = fx3Take(h, 'strip');
      fx3Strip(core, _x3p, _x3u, _x3v, rr - W * 0.2, W * 0.35, Math.PI / 2 - span / 2 + 0.1, Math.PI / 2 + span / 2 - 0.1, '#ffffff', fade, true);
    }
  },
  // Lichtkugeln kreisen aufsteigend um die Figur
  orbs3(h, e, k) {
    const n = e.count || 5;
    const f = e.follow || e;
    const cx = f.x * U3;
    const cz = (e.follow ? feetY(f) : f.y) * U3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (game.time - e.start) * 5;
      const r = 0.55 * (1 - k * 0.3);
      const o = fx3Take(h, 'sprite');
      o.position.set(cx + Math.cos(a) * r, 0.3 + k * 1.6 + Math.sin(a * 2) * 0.1, cz + Math.sin(a) * r);
      o.scale.set(0.32, 0.32, 1);
      fx3Map(o, 'disc');
      fx3Color(o, e.color, 1 - k);
    }
  },
  // Säule aus Flammen, Licht oder Blut: zwei gedrehte Wände und ein heller Kern
  column3(h, e, k) {
    const f = e.follow || e;
    const x = f.x;
    const z = e.follow ? feetY(f) : f.y;
    const grow = k < 0.2 ? k / 0.2 : 1;
    const ht = (e.hgt || 2.4) * grow;
    const r = (e.r || 30) * U3 * (1 - k * 0.4);
    const outer = fx3Take(h, 'wall');
    fx3Wall(outer, x, z, r, ht);
    fx3Color(outer, e.color, (1 - k) * 0.8);
    const inner = fx3Take(h, 'wall');
    fx3Wall(inner, x, z, r * 0.55, ht * 1.15);
    fx3Color(inner, e.core || '#ffffff', (1 - k) * 0.7);
    const base = fx3Take(h, 'plane');
    fx3Ground(base, x, z, r * 2.4, 0.05, 'disc');
    fx3Color(base, e.color, (1 - k) * 0.7);
  },
  // dunkle Rauchwolken, die sich ausbreiten
  smoke3(h, e, k) {
    const n = e.count || 8;
    const f = e.follow || e;
    const cx = f.x * U3;
    const cz = (e.follow ? feetY(f) : f.y) * U3;
    const sd = fx3Seed(h, n, () => ({ a: Math.random() * Math.PI * 2, d: 0.2 + Math.random() * 0.6, y: 0.2 + Math.random() * 1.0, s: 0.5 + Math.random() * 0.5 }));
    for (const q of sd) {
      const o = fx3Take(h, 'smoke');
      const d = q.d * (0.5 + k);
      o.position.set(cx + Math.cos(q.a) * d, q.y + k * 0.4, cz + Math.sin(q.a) * d * 0.8);
      const s = q.s * (0.6 + k) * (e.size || 1);
      o.scale.set(s, s, 1);
      o.material.color.set(e.color);
      o.material.opacity = (e.op || 0.7) * (1 - k);
    }
  },

  ring(h, e, k) {
    const f = fx3Foot(e);
    const r = e.r * (e.grow ? 0.3 + 0.9 * k : 0.4 + 0.6 * k) * U3;
    const ground = fx3Take(h, 'plane');
    fx3Ground(ground, f.x, f.z, r * 1.05, f.h, 'ring');
    fx3Color(ground, e.color, (1 - k) * 0.85);
    // niedrige leuchtende Wand: die Schockwelle steht im Raum
    const wall = fx3Take(h, 'wall');
    fx3Wall(wall, f.x, f.z, r, (0.25 + (e.width || 4) * 0.035) * (1 - k * 0.7), f.h);
    fx3Color(wall, e.color, (1 - k) * 0.4);
    if (e.rank >= 0) {
      const shell = fx3Take(h, 'plane');
      fx3Ground(shell, f.x, f.z, r * 1.22, f.h + 0.01, 'ring');
      fx3Color(shell, e.rankColor, (1 - k) * 0.85);
      if (e.rank >= 2) {
        const rune = fx3Take(h, 'plane');
        fx3Ground(rune, f.x, f.z, r * 0.9, f.h + 0.02, 'rune', game.time * 2);
        fx3Color(rune, e.rankColor, (1 - k) * 0.7);
      }
      if (e.rank >= 3) {
        const wall2 = fx3Take(h, 'wall');
        fx3Wall(wall2, f.x, f.z, r * 1.08, 0.9 * (1 - k), f.h);
        fx3Color(wall2, '#ff6a2a', (1 - k) * 0.5);
      }
    }
  },
  runes(h, e, k) {
    const f = fx3Foot(e);
    const o = fx3Take(h, 'plane');
    fx3Ground(o, f.x, f.z, e.r * (0.6 + 0.4 * easeOut(k)) * U3, f.h, 'rune', k * 2);
    fx3Color(o, e.color, 1 - k);
  },
  ultsigil(h, e, k) {
    const f = fx3Foot(e);
    const a = Math.min(1, k * 6) * Math.min(1, (1 - k) * 4);
    const r = e.r * (0.85 + 0.15 * easeOut(Math.min(1, k * 4))) * U3;
    const o = fx3Take(h, 'plane');
    fx3Ground(o, f.x, f.z, r, 0.05, 'rune', (game.time - e.start) * 0.8);
    fx3Color(o, e.color, a);
    const o2 = fx3Take(h, 'plane');
    fx3Ground(o2, f.x, f.z, r * 0.62, 0.06, 'rune', -(game.time - e.start) * 1.3);
    fx3Color(o2, e.color, a * 0.8);
    const glow = fx3Take(h, 'plane');
    fx3Ground(glow, f.x, f.z, r * 1.1, 0.03, 'disc');
    fx3Color(glow, e.color, a * 0.35);
  },
  // Zielkreis beim Zielen (Blizzard): Ring mit drehenden Runen, folgt dem gewählten Punkt
  aim(h, e) {
    const f = fx3Foot(e);
    const r = e.r * U3;
    const pulse = 0.75 + 0.25 * Math.sin(game.time * 6);
    const o = fx3Take(h, 'planeN');
    fx3Ground(o, f.x, f.z, r, 0.06, 'ring', game.time * 0.6);
    fx3Color(o, e.color, 0.95 * pulse);
    const rune = fx3Take(h, 'planeN');
    fx3Ground(rune, f.x, f.z, r * 0.7, 0.05, 'rune', -game.time * 0.9);
    fx3Color(rune, e.color, 0.55);
    const fill = fx3Take(h, 'planeN');
    fx3Ground(fill, f.x, f.z, r, 0.04, 'disc');
    fx3Color(fill, e.color, 0.16);
  },
  warn(h, e, k) {
    const f = fx3Foot(e);
    const r = e.r * U3;
    const o = fx3Take(h, 'planeN');
    fx3Ground(o, f.x, f.z, r, 0.05, 'ring', game.time);
    fx3Color(o, e.color, 0.9);
    const fill = fx3Take(h, 'planeN');
    fx3Ground(fill, f.x, f.z, r * Math.max(0.05, k), 0.04, 'disc');
    fx3Color(fill, e.color, 0.5 + 0.2 * Math.sin(game.time * 20));
    if (e.inner) {
      // sicherer Bereich direkt beim Boss
      const safe = fx3Take(h, 'planeN');
      fx3Ground(safe, f.x, f.z, e.inner * U3, 0.06, 'disc');
      fx3Color(safe, '#3aff6a', 0.55);
      const edge = fx3Take(h, 'planeN');
      fx3Ground(edge, f.x, f.z, e.inner * U3 * 1.05, 0.07, 'ring');
      fx3Color(edge, '#7aff8a', 1);
    }
  },
  pillar(h, e, k) {
    const f = fx3Foot(e);
    const ht = 2.6 * easeOut(Math.min(1, k * 2));
    const r = 15 * (1 - k * 0.6) * U3 * 1.2;
    const o = fx3Take(h, 'wall');
    fx3Wall(o, f.x, f.z, r, ht);
    fx3Color(o, e.color, (1 - k) * 0.9);
    const core = fx3Take(h, 'wall');
    fx3Wall(core, f.x, f.z, r * 0.4, ht * 1.1);
    fx3Color(core, '#ffffff', (1 - k) * 0.6);
    const base = fx3Take(h, 'plane');
    fx3Ground(base, f.x, f.z, r * 2.2, 0.04, 'disc');
    fx3Color(base, e.color, (1 - k) * 0.6);
    if (e.rank >= 0) {
      const shell = fx3Take(h, 'wall');
      fx3Wall(shell, f.x, f.z, r * 1.6, ht * 0.8);
      fx3Color(shell, e.rankColor, (1 - k) * 0.5);
    }
  },
  lightbeam(h, e, k) {
    const f = fx3Foot(e);
    const grow = k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88;
    const o = fx3Take(h, 'wall');
    fx3Wall(o, f.x, f.z, 0.9 * grow + 0.05, 14);
    o.rotation.x = Math.PI; // hell oben (Licht kommt vom Himmel)
    fx3Color(o, '#ffe9a0', grow);
    const base = fx3Take(h, 'plane');
    fx3Ground(base, f.x, f.z, 2.4 * grow + 0.3, 0.04, 'disc');
    fx3Color(base, '#ffe9a0', grow * 0.8);
  },
  ultbeam(h, e, k) {
    const f = fx3Foot(e);
    const a = Math.min(1, k * 8) * (1 - k);
    const w = e.w * (1 - k * 0.5) * U3;
    const o = fx3Take(h, 'wall');
    fx3Wall(o, f.x, f.z, w / 2, 14);
    o.rotation.x = Math.PI;
    fx3Color(o, e.color, a);
    const core = fx3Take(h, 'wall');
    fx3Wall(core, f.x, f.z, w * 0.1, 14);
    core.rotation.x = Math.PI;
    fx3Color(core, '#ffffff', a * 0.8);
    const base = fx3Take(h, 'plane');
    fx3Ground(base, f.x, f.z, w * 1.6, 0.04, 'disc');
    fx3Color(base, e.color, a * 0.8);
  },
  tornado(h, e, k) {
    const f = fx3Foot(e);
    const grow = 0.6 + 0.4 * easeOut(Math.min(1, k * 3));
    for (let i = 0; i < 4; i++) {
      const o = fx3Take(h, 'plane');
      fx3Ground(o, f.x, f.z, e.r * U3 * (1 - i * 0.18) * grow, 0.2 + i * 0.45, 'ring', game.time * 10 + i * 1.7);
      fx3Color(o, e.color, (1 - k) * 0.9);
    }
    const wall = fx3Take(h, 'wall');
    fx3Wall(wall, f.x, f.z, e.r * U3 * 0.55 * grow, 1.8);
    fx3Color(wall, e.color, (1 - k) * 0.35);
  },
  bolt(h, e, k) {
    const a = 1 - k;
    const pts = e.points;
    const z = e.y * U3;
    const top = 8;
    const P = (pt, i, n) => _x3p.set(pt.x * U3, top * (1 - i / n), z + (e.zj ? e.zj[i] : 0));
    if (!e.zj) e.zj = pts.map(() => (Math.random() - 0.5) * 0.6);
    for (let i = 0; i < pts.length - 1; i++) {
      const A = P(pts[i], i, pts.length - 1).clone();
      const B = P(pts[i + 1], i + 1, pts.length - 1).clone();
      const core = fx3Take(h, 'seg');
      fx3Segment(core, A, B, 0.045);
      fx3Color(core, '#ffffff', a);
      const glow = fx3Take(h, 'seg');
      fx3Segment(glow, A, B, 0.16);
      fx3Color(glow, e.color, a * 0.55);
    }
    const flash = fx3Take(h, 'plane');
    fx3Ground(flash, e.x, e.y, 1.4, 0.04, 'disc');
    fx3Color(flash, e.color, a);
  },
  chain(h, e, k) {
    const a = 1 - k;
    // h1: Starthöhe (seit 8.6: Kugelblitz 1,0, Donnerkrone 1,9), sonst Körpermitte
    let prev = _x3q.set(e.x * U3, e.h1 != null ? e.h1 : 0.7, (e.y + 16) * U3).clone();
    for (let i = 1; i <= 6; i++) {
      const t = i / 6;
      const next = i === 6 ? _x3p.set(e.x2 * U3, 0.7, (e.y2 + 16) * U3).clone()
        : _x3p.set((e.x + (e.x2 - e.x) * t) * U3 + rand(-0.22, 0.22), (e.h1 != null ? e.h1 + (0.7 - e.h1) * t : 0.7) + rand(-0.25, 0.25), (e.y + 16 + (e.y2 - e.y) * t) * U3 + rand(-0.22, 0.22)).clone();
      const core = fx3Take(h, 'seg');
      fx3Segment(core, prev, next, 0.035);
      fx3Color(core, '#ffffff', a);
      const glow = fx3Take(h, 'seg');
      fx3Segment(glow, prev, next, 0.12);
      fx3Color(glow, e.color, a * 0.6);
      prev = next;
    }
  },
  beam(h, e, k) {
    const a = 1 - k;
    const A = fx3Body(e, new THREE.Vector3());
    const t2 = e.follow2;
    const B = t2 ? new THREE.Vector3(t2.x * U3, 0.7, feetY(t2) * U3) : new THREE.Vector3(e.x2 * U3, 0.7, (e.y2 + 16) * U3);
    let prev = A;
    for (let i = 1; i <= 6; i++) {
      const t = i / 6;
      const next = new THREE.Vector3().lerpVectors(A, B, t);
      next.y += Math.sin(Math.PI * t) * 0.7 + Math.sin(game.time * 30 + i) * 0.06;
      const core = fx3Take(h, 'seg');
      fx3Segment(core, prev, next, 0.05);
      fx3Color(core, '#ffffff', a);
      const glow = fx3Take(h, 'seg');
      fx3Segment(glow, prev, next, 0.17);
      fx3Color(glow, e.color, a * 0.6);
      prev = next;
    }
  },
  impact(h, e, k) {
    const c = fx3Body(e, _x3c);
    const s = (e.big ? 26 : 15) * easeOut(k) * U3 * 3.2 + 0.2;
    const o = fx3Take(h, 'sprite');
    o.position.copy(c);
    o.scale.set(s, s, 1);
    o.material.rotation = e.start * 7;
    fx3Map(o, 'spark');
    fx3Color(o, '#ffffff', 1 - k);
    const g = fx3Take(h, 'sprite');
    g.position.copy(c);
    g.scale.set(s * 1.4, s * 1.4, 1);
    fx3Map(g, 'disc');
    fx3Color(g, e.rank >= 0 ? e.rankColor : e.color, (1 - k) * 0.8);
  },
  slash(h, e, k) {
    const c = fx3Body(e, _x3c);
    const L = (e.len || 30) * Math.min(1, k * 5) * U3 * 1.15;
    const W = (e.w || 6) * (1 - k * 0.6) * U3 * 1.3;
    const ang = e.ang || 0;
    const { r: R, u: Up, f: F } = FX3.cam;
    // Richtung der Schnittlinie wie im Bild, die Sichel wölbt sich zur Kamera hin (räumliche Tiefe)
    _x3u.copy(R).multiplyScalar(Math.cos(ang)).addScaledVector(Up, -Math.sin(ang)).normalize();
    _x3v.copy(R).multiplyScalar(Math.sin(ang)).addScaledVector(Up, Math.cos(ang)).addScaledVector(F, -0.9).normalize();
    const span = 1.9;
    const rr = Math.max(0.05, L / (2 * Math.sin(span / 2)));
    _x3p.copy(c).addScaledVector(_x3v, -rr * Math.cos(span / 2));
    // Strip: Punkt = Mitte + (u·cos a + v·sin a)·r → Winkel um π/2 drehen, damit die Wölbung in v liegt
    const a0 = Math.PI / 2 - span / 2;
    const a1 = Math.PI / 2 + span / 2;
    const fade = 1 - k;
    if (e.rank >= 0) {
      const shell = fx3Take(h, 'strip');
      fx3Strip(shell, _x3p, _x3u, _x3v, rr + W * 0.35, W * 2.2, a0, a1, e.rankColor, fade * 0.9, true);
    }
    const o = fx3Take(h, 'strip');
    fx3Strip(o, _x3p, _x3u, _x3v, rr, W, a0, a1, e.color, fade, true);
    const core = fx3Take(h, 'strip');
    fx3Strip(core, _x3p, _x3u, _x3v, rr - W * 0.15, W * 0.35, a0 + 0.1, a1 - 0.1, '#ffffff', fade, true);
  },
  // Seelenkäfig (seit 8.5): Rune am Boden, sechs gebogene Rippen treffen sich oben in einem Knochenring, darin ein
  // blassgrüner Geist. Steigt mit Überschwingen aus dem Boden; bei jedem Schrei reißt der Geist den Mund auf und die
  // Rippen biegen sich nach außen; nach dem letzten Schrei platzen die Rippen weg (der Geist fährt als column3 auf).
  cage3(h, e) {
    const t = game.time - e.start;
    const x = e.x * U3;
    const z = e.y * U3;
    const last = e.rise + (e.pulses - 1) * e.every;
    let scream = 0;
    if (t >= e.rise) {
      const j = Math.min(e.pulses - 1, Math.floor((t - e.rise) / e.every));
      const st = t - e.rise - j * e.every;
      scream = st < 0.12 ? Math.sin((st / 0.12) * Math.PI / 2) : Math.max(0, 1 - (st - 0.12) / 0.2);
    }
    const end = clamp01((t - last) / Math.max(0.1, e.dur - last));
    // Rune und Schein am Boden
    const rune = fx3Take(h, 'planeRune');
    fx3Ground(rune, e.x, e.y, e.r * 0.35 * U3, 0.05, 'rune', t * 0.5);
    fx3Color(rune, '#7ad36a', 0.35 * Math.min(1, t / 0.2) * (1 - end) + 0.25 * scream * (1 - end));
    const glow = fx3Take(h, 'plane');
    fx3Ground(glow, e.x, e.y, 0.9, 0.04, 'disc');
    fx3Color(glow, e.color, (0.25 + 0.3 * scream) * Math.min(1, t / 0.3) * (1 - end));
    // Aufstieg mit leichtem Überschwingen
    const yo = -1.7 * (1 - easeOutBack(clamp01(t / e.rise)));
    const burst = clamp01((t - last) / 0.3);
    if (burst < 1) {
      const flex = 1 + 0.08 * scream;
      const R = 0.68;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.26;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        // platzen: nach außen wegfliegen, hoch und wieder herunter
        const out = burst * 1.1;
        const up = burst * 0.9 - burst * burst * 1.6;
        _x3s1.set(x + ca * (R * flex + out), yo + up, z + sa * (R * flex + out));
        _x3s2.set(x + ca * (R * 1.2 * flex + out * 1.3), yo + 0.75 + up, z + sa * (R * 1.2 * flex + out * 1.3));
        _x3s3.set(x + ca * (0.13 + out * 1.6), yo + 1.62 + up - burst * 0.4, z + sa * (0.13 + out * 1.6));
        const lo = fx3Take(h, 'bone');
        fx3Segment(lo, _x3s1, _x3s2, 0.085);
        fx3Color(lo, '#e8e0c8', 1 - burst);
        const hi = fx3Take(h, 'bone');
        fx3Segment(hi, _x3s2, _x3s3, 0.07);
        fx3Color(hi, '#e8e0c8', 1 - burst);
      }
      // kleiner Knochenring als Krone oben
      const crown = fx3Take(h, 'boneRing');
      crown.position.set(x, yo + 1.68 + burst * 0.6, z);
      crown.rotation.set(Math.PI / 2, 0, t);
      crown.scale.setScalar(0.18);
      fx3Color(crown, '#e8e0c8', 1 - burst);
    }
    // der gefangene Geist
    if (t < last + 0.05) {
      const { r: Rc, u: Up, f: F } = FX3.cam;
      const gy = yo + 1.0 + 0.05 * Math.sin(t * 3);
      const aura = fx3Take(h, 'spriteTop');
      fx3Map(aura, 'disc');
      aura.position.set(x, gy, z);
      aura.scale.set(1.3, 1.5, 1);
      fx3Color(aura, e.color, 0.45 + 0.4 * scream);
      const ghost = fx3Take(h, 'smokeTop');
      ghost.position.set(x, gy, z);
      ghost.scale.set(0.62 * (1 + 0.1 * scream), 0.92 * (1 + 0.15 * scream), 1);
      ghost.material.color.set('#e4fbe8');
      ghost.material.opacity = 0.8;
      for (const side of [-1, 1]) {
        const eye = fx3Take(h, 'spriteTop');
        fx3Map(eye, 'disc');
        eye.position.set(x, gy, z).addScaledVector(Rc, side * 0.09).addScaledVector(Up, 0.12).addScaledVector(F, -0.3);
        eye.scale.set(0.16, 0.16, 1);
        fx3Color(eye, e.eye || '#a7e37f', 1);
      }
      const mouth = fx3Take(h, 'smokeTop');
      mouth.position.set(x, gy, z).addScaledVector(Up, -0.07).addScaledVector(F, -0.3);
      mouth.scale.set(0.12, 0.1 * (1 + scream), 1);
      mouth.material.color.set('#0b1a0e');
      mouth.material.opacity = 0.95;
    }
  },
  // Seelenschnitter (seit 8.5): großer dunkler Schatten am Boden, violette Kapuzengestalt immer bildschirm-oben neben
  // der Figur (verdeckt sie nie), Sense mit grün leuchtender Klinge. Ein schwerer Schwung durch den Bogen vor der Figur
  // hinterlässt eine breite Sichelspur, danach zerfällt die Gestalt (Rauch und Asche kommen aus reaperFx).
  reaper3(h, e) {
    const t = game.time - e.start;
    const f = e.follow;
    if (!f) return;
    const fy = feetY(f);
    const cx = f.x * U3;
    const cz = fy * U3;
    const rx = cx;
    const rz = cz - 0.9;
    const fade = t < 0.65 ? 1 : Math.max(0, 1 - (t - 0.65) / 0.3);
    const shadow = fx3Take(h, 'planeN');
    fx3Strip2(shadow, f.x, fy - 24, 1.2, 0.85, 0.035, 'disc', 0);
    fx3Color(shadow, '#1a1224', 0.5 * Math.min(1, t / 0.12) * fade);
    // Schwung: Kopf der Sichelspur läuft von a0 nach a1
    const a0 = e.ang + e.half;
    const a1 = e.ang - e.half;
    const sw = clamp01((t - 0.35) / 0.15);
    const head = a0 + (a1 - a0) * easeOut(sw);
    const R = e.R * U3;
    if (t >= 0.35) {
      const tail = a0 + (head - a0) * clamp01((t - 0.42) / 0.35);
      const tf = t < 0.5 ? 1 : Math.max(0, 1 - (t - 0.5) / 0.3);
      if (tf > 0 && head !== tail) {
        _x3s1.set(cx, 0.5, cz);
        _x3s2.set(1, 0, 0);
        _x3s3.set(0, 0, 1);
        fx3Strip(fx3Take(h, 'strip'), _x3s1, _x3s2, _x3s3, R, 0.5, tail, head, '#a7e37f', tf, false);
        fx3Strip(fx3Take(h, 'strip'), _x3s1, _x3s2, _x3s3, R - 0.12, 0.18, tail + (head - tail) * 0.3, head, '#ffffff', tf, false);
      }
    }
    if (t < 0.1) return;
    // Gestalt: steigt auf, zerfällt am Ende (sinkt und wird durchsichtig)
    const decay = clamp01((t - 0.55) / 0.4);
    const yo = -1.5 * (1 - easeOut(clamp01((t - 0.1) / 0.25))) - 0.4 * decay;
    const op = 0.85 * (1 - decay);
    if (op <= 0.01) return;
    const robe = fx3Take(h, 'robe');
    robe.position.set(rx, yo + 0.95, rz);
    robe.scale.set(0.55, 1.9, 0.55);
    robe.rotation.set(0, 0, 0.05 * Math.sin(t * 6));
    fx3Color(robe, '#1a1224', op);
    const hood = fx3Take(h, 'hood');
    hood.position.set(rx, yo + 2.2, rz);
    hood.scale.set(0.4, 0.8, 0.4);
    hood.rotation.set(0.15, 0, 0);
    fx3Color(hood, '#2a1c3a', op);
    // Fetzen am Saum
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      const rag = fx3Take(h, 'cone');
      rag.position.set(rx + Math.cos(a) * 0.4, yo + 0.12, rz + Math.sin(a) * 0.4);
      rag.scale.set(0.11, 0.34, 0.11);
      rag.rotation.set(Math.PI + Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4 + 0.25 * Math.sin(t * 8 + i * 1.7));
      fx3Color(rag, '#1a1224', op);
    }
    // Kapuzenöffnung, Knochengesicht und zwei Augenflammen
    const { r: Rc, u: Up } = FX3.cam;
    _x3s4.set(rx, yo + 2.0, rz + 0.36);
    const hole = fx3Take(h, 'smoke');
    hole.position.copy(_x3s4).z -= 0.04;
    hole.scale.set(0.48, 0.56, 1);
    hole.material.color.set('#0a0610');
    hole.material.opacity = op;
    const face = fx3Take(h, 'smoke');
    face.position.copy(_x3s4);
    face.scale.set(0.3, 0.36, 1);
    face.material.color.set('#e8e0c8');
    face.material.opacity = Math.min(1, op * 1.15);
    for (const side of [-1, 1]) {
      const fl = 0.85 + 0.2 * Math.sin(t * 19 + side * 2);
      const eye = fx3Take(h, 'spriteFlame');
      fx3Map(eye, 'flame');
      eye.position.copy(_x3s4).addScaledVector(Rc, side * 0.065).addScaledVector(Up, 0.04).z += 0.05;
      eye.scale.set(0.16 * fl, 0.25 * fl, 1);
      fx3Color(eye, e.eye || '#a7e37f', op / 0.85);
    }
    // Sense: Stiel aus den Händen, gebogene Klinge mit weiß-grünem Kern
    _x3s5.set(rx + 0.15, yo + 1.4, rz + 0.35);
    if (t < 0.35) {
      // erhoben: Stiel schräg über dem Kopf, Klinge hängt oben nach links
      const lift = easeOut(clamp01((t - 0.1) / 0.25));
      _x3s6.set(0.55 - 0.25 * lift, 1, 0.15).normalize();
      _x3s1.copy(_x3s5).addScaledVector(_x3s6, -0.9);
      _x3s2.copy(_x3s5).addScaledVector(_x3s6, 1.7);
      const shaft = fx3Take(h, 'bone');
      fx3Segment(shaft, _x3s1, _x3s2, 0.04);
      fx3Color(shaft, '#3a2c44', op);
      _x3s3.set(1, 0, 0);
      _x3s6.set(0, 1, 0);
      _x3s1.copy(_x3s2).addScaledVector(_x3s3, -0.8);
      fx3Strip(fx3Take(h, 'strip'), _x3s1, _x3s3, _x3s6, 0.8, 0.24, 0, 1.75, '#7ad36a', op / 0.85, true);
      fx3Strip(fx3Take(h, 'strip'), _x3s1, _x3s3, _x3s6, 0.77, 0.09, 0.1, 1.65, '#e0ffd0', op / 0.85, true);
    } else {
      // im Schwung und danach: die Klinge läuft auf dem Bogen vor der Figur, der Stiel reicht von den Händen hin
      const ca = Math.cos(head);
      const sa = Math.sin(head);
      _x3s1.set(cx + ca * R * 0.62, 0.7, cz + sa * R * 0.62);
      const shaft = fx3Take(h, 'bone');
      fx3Segment(shaft, _x3s5, _x3s1, 0.045);
      fx3Color(shaft, '#3a2c44', op);
      _x3s1.set(cx, 0.62, cz);
      _x3s2.set(1, 0, 0);
      _x3s3.set(0, 0, 1);
      const dir = a1 < a0 ? 1 : -1;
      fx3Strip(fx3Take(h, 'strip'), _x3s1, _x3s2, _x3s3, R * 0.85, 0.36, head + dir * 0.38, head, '#7ad36a', op / 0.85, true);
      fx3Strip(fx3Take(h, 'strip'), _x3s1, _x3s2, _x3s3, R * 0.85 - 0.05, 0.13, head + dir * 0.34, head + dir * 0.03, '#e0ffd0', op / 0.85, true);
    }
  },
  swoosh(h, e, k) {
    const head = e.a0 + (e.a1 - e.a0) * easeOut(Math.min(1, k * 2.2));
    const tail = e.a0 + (head - e.a0) * clamp01((k - 0.12) / 0.88);
    const f = e.follow;
    if (!f) return;
    _x3c.set(f.x * U3, Math.max(0.45, -(e.oy || 0) * U3 * 1.6), feetY(f) * U3);
    _x3u.set(1, 0, 0);
    _x3v.set(0, 0, 1);
    const r = e.r * U3 * 1.25;
    const w = e.width * U3 * 1.3;
    const fade = 1 - k * 0.75;
    if (e.rank >= 0) {
      const shell = fx3Take(h, 'strip');
      fx3Strip(shell, _x3c, _x3u, _x3v, r + w * 0.3, w * 1.8, tail, head, e.rankColor, fade * 0.8, false);
    }
    const o = fx3Take(h, 'strip');
    fx3Strip(o, _x3c, _x3u, _x3v, r, w, tail, head, e.color, fade, false);
    const edge = fx3Take(h, 'strip');
    fx3Strip(edge, _x3c, _x3u, _x3v, r + 0.02, w * 0.18, tail + (head - tail) * 0.4, head, '#ffffff', 1 - k, false);
  }
};

// Hilfsvektoren der Seelen-Fertigkeiten (Käfig, Schnitter, Schädel)
const _x3s1 = new THREE.Vector3();
const _x3s2 = new THREE.Vector3();
const _x3s3 = new THREE.Vector3();
const _x3s4 = new THREE.Vector3();
const _x3s5 = new THREE.Vector3();
const _x3s6 = new THREE.Vector3();

// Schädelsalve (seit 8.5): brennender Schädel statt Lichtkugel, Gier = Flugrichtung, klappernder Kiefer,
// grüne Flammenschleppe und alle 0,08 s ein Rauchwölkchen (Schleppe nicht bei Grafik „Niedrig“)
const SKULL3_MAX = 6;
function fx3Skull(h, pr) {
  const t = game.time;
  const id = pr.seed || (pr.seed = 1 + Math.random() * 9);
  const y = PROJECTILE_LIFT * U3 * 1.3 + 0.05 * Math.sin(t * 9 + id);
  const o = fx3Take(h, 'skull');
  o.position.set(pr.x * U3, y, pr.y * U3);
  // Gier = Flugrichtung; der Schädel hebt das Gesicht etwas, damit man es von schräg oben sieht
  o.rotation.set(0, Math.atan2(-pr.vy, pr.vx), 0.8);
  o.userData.hinge.rotation.z = -0.4 * Math.abs(Math.sin(t * 18 + id));
  o.userData.eyeMat.color.set(pr.rank >= 0 ? SKILL_RANKS[pr.rank].color : '#a7e37f');
  const g = fx3Take(h, 'sprite');
  fx3Map(g, 'disc');
  g.position.set(pr.x * U3, y, pr.y * U3);
  g.scale.set(0.85, 0.85, 1);
  fx3Color(g, pr.color || '#a7e37f', 0.55);
  if (typeof opts !== 'undefined' && opts.graphics === 'niedrig') return;
  // Flammen zeigen auf dem Bildschirm nach hinten (Bildrichtung aus den Kameraachsen)
  const { r: R, u: Up } = FX3.cam;
  const bx = -pr.vx * R.x - pr.vy * R.z;
  const by = -pr.vx * Up.x - pr.vy * Up.z;
  const rot = Math.atan2(-bx, by);
  for (let i = 0; i < 2; i++) {
    const fl = fx3Take(h, 'spriteTrail');
    fx3Map(fl, 'flame');
    const d = i ? 0.24 : 0.4;
    const w = 0.92 + 0.12 * Math.sin(t * 23 + id + i);
    fl.position.set(pr.x * U3 - pr.vx * d, y, pr.y * U3 - pr.vy * d);
    fl.scale.set((i ? 0.26 : 0.46) * w, (i ? 0.46 : 0.85) * w, 1);
    fl.material.rotation = rot;
    fx3Color(fl, i ? '#e0ffd0' : '#a7e37f', 1);
  }
  if (t >= (pr.puffAt || 0)) {
    pr.puffAt = t + 0.08;
    addEffect({ type: 'smoke3', x: pr.x - pr.vx * 12, y: pr.y - pr.vy * 12, count: 1, color: '#14281a', size: 0.6, op: 0.35, dur: 0.5 });
  }
}

// Magier-Geschosse (seit 8.6): eigene Körper für Feuerball, Frostlanze, Kettenblitz, Steingeschoss (eigene und
// fremde) und den eigenen Grundangriff; höchstens MAGE3_MAX Körper je Bild, je höchstens fünf Teile.
// pr.body3 = game.time: das 2D-Geschoss wird in diesem Bild nicht mehr darüber gezeichnet.
const MAGE3_STYLES = new Set(['fireball', 'frostlance', 'arc', 'stone', 'mage']);
const MAGE3_MAX = 6;
const _x3mq = new THREE.Quaternion();
const _x3mq2 = new THREE.Quaternion();
const _x3mz = new THREE.Vector3(0, 0, 1);
const _x3md = new THREE.Vector3();
const _x3ma = new THREE.Vector3();
const _x3mb = new THREE.Vector3();
function fx3MageSprite(h, kind, tex, px, py, pz, sx, sy, color, op) {
  const o = fx3Take(h, kind);
  fx3Map(o, tex);
  o.position.set(px, py, pz);
  o.scale.set(sx, sy, 1);
  o.material.rotation = 0;
  fx3Color(o, color, op);
  return o;
}
function fx3MageBolt(h, pr) {
  const t = game.time;
  const id = pr.seed || (pr.seed = 1 + Math.random() * 9);
  const y = PROJECTILE_LIFT * U3 * 1.3;
  const x = pr.x * U3;
  const z = pr.y * U3;
  const E = (typeof MAGE_EL !== 'undefined' && MAGE_EL[pr.el]) || { main: pr.color || '#b8c4ff', hi: '#ffffff', core: '#ffffff', deep: '#4a5ad8' };
  const low = typeof opts !== 'undefined' && opts.graphics === 'niedrig';
  _x3md.set(pr.vx, 0, pr.vy).normalize();
  // Richtung auf dem Bildschirm (Flammen zeigen nach hinten)
  const R = FX3.cam.r;
  const Up = FX3.cam.u;
  const rot = Math.atan2(pr.vx * R.x + pr.vy * R.z, -(pr.vx * Up.x + pr.vy * Up.z));
  if (pr.style === 'fireball') {
    // weißglühender Kern, zwei Flammen nach hinten, zwei gegenläufig drehende Siegelringe quer zur Flugbahn
    fx3MageSprite(h, 'sprite', 'disc', x, y, z, 0.6, 0.6, E.core, 1);
    for (let i = 0; i < 2; i++) {
      const d = i ? 0.26 : 0.42;
      const w = 0.9 + 0.12 * Math.sin(t * 23 + id + i);
      const fl = fx3MageSprite(h, 'spriteFlame', 'flame', x - _x3md.x * d, y, z - _x3md.z * d, (i ? 0.36 : 0.55) * w, (i ? 0.7 : 1.05) * w, i ? E.hi : E.main, 1);
      fl.material.rotation = rot;
    }
    _x3mq.setFromUnitVectors(_x3mz, _x3md);
    for (let i = 0; i < 2; i++) {
      const ring = fx3Take(h, 'planeMs0');
      fx3Map(ring, 'msig0');
      ring.position.set(x + _x3md.x * (i ? -0.06 : 0.06), y, z + _x3md.z * (i ? -0.06 : 0.06));
      _x3mq2.setFromAxisAngle(_x3mz, (i ? -1 : 1) * t * 7 + id);
      ring.quaternion.multiplyQuaternions(_x3mq, _x3mq2);
      ring.scale.set(0.3, 0.3, 1);
      fx3Color(ring, i ? E.hi : E.main, 0.95);
    }
    if (!low && t >= (pr.puffAt || 0)) {
      pr.puffAt = t + 0.06;
      addEffect({ type: 'smoke3', x: pr.x - pr.vx * 10, y: pr.y - pr.vy * 10, count: 1, color: '#2a0a0a', size: 0.3, op: 0.5, dur: 0.45 });
    }
  } else if (pr.style === 'frostlance') {
    // lange Eislanze mit blauem Kern und zwei Glitzerpunkten
    _x3ma.set(x - _x3md.x * 0.42, y, z - _x3md.z * 0.42);
    const lance = fx3Take(h, 'coneG');
    fx3Cone(lance, _x3ma, _x3md, 0.85, 0.11);
    fx3Color(lance, E.core, 0.95);
    _x3mb.set(x + _x3md.x * 0.12, y, z + _x3md.z * 0.12);
    _x3ma.set(x - _x3md.x * 0.48, y, z - _x3md.z * 0.48);
    const core = fx3Take(h, 'seg');
    fx3Segment(core, _x3ma, _x3mb, 0.035);
    fx3Color(core, E.main, 1);
    for (let i = 0; i < 2; i++) {
      const tw = 0.5 + 0.5 * Math.sin(t * 25 + i * 3 + id);
      fx3MageSprite(h, 'sprite', 'spark', x - _x3md.x * (0.1 + 0.25 * i), y + 0.04, z - _x3md.z * (0.1 + 0.25 * i), 0.2 * tw + 0.05, 0.2 * tw + 0.05, '#ffffff', 0.9);
    }
  } else if (pr.style === 'arc') {
    // heller Kern, drei gezackte Bögen hinterher (jedes Bild neu)
    const s = 0.3 + 0.08 * Math.sin(t * 40);
    fx3MageSprite(h, 'sprite', 'spark', x, y, z, s, s, '#ffffff', 1);
    _x3ma.set(x, y, z);
    for (let i = 1; i <= 3; i++) {
      _x3mb.set(x - _x3md.x * 0.17 * i + (Math.random() - 0.5) * 0.14, y + (Math.random() - 0.5) * 0.12, z - _x3md.z * 0.17 * i + (Math.random() - 0.5) * 0.14);
      const sg = fx3Take(h, 'seg');
      fx3Segment(sg, _x3ma, _x3mb, 0.03);
      fx3Color(sg, i === 1 ? '#ffffff' : E.hi, 1 - i * 0.22);
      _x3ma.copy(_x3mb);
    }
  } else if (pr.style === 'stone') {
    // taumelnder Basaltbrocken mit Bernsteinkern, Staub hinterher
    const rock = fx3Take(h, 'rock');
    rock.position.set(x, y, z);
    rock.scale.set(0.24, 0.2, 0.22);
    rock.rotation.set(t * 9 + id, t * 6, t * 4);
    rock.material.color.set(E.deep);
    fx3MageSprite(h, 'sprite', 'disc', x, y, z, 0.5, 0.5, E.main, 0.9);
    if (!low && t >= (pr.puffAt || 0)) {
      pr.puffAt = t + 0.05;
      addEffect({ type: 'smoke3', x: pr.x - pr.vx * 8, y: pr.y - pr.vy * 8, count: 1, color: '#6a5a50', size: 0.3, op: 0.45, dur: 0.4 });
    }
  } else {
    // Grundangriff: Schein, Kern und eine kleine drehende Raute in der Elementfarbe
    fx3MageSprite(h, 'sprite', 'disc', x, y, z, 0.34, 0.34, pr.rank >= 0 ? SKILL_RANKS[pr.rank].color : E.main, 0.85);
    fx3MageSprite(h, 'sprite', 'spark', x, y, z, 0.16, 0.16, E.core, 1);
    for (let i = 0; i < 2; i++) {
      const c = fx3Take(h, 'coneG');
      c.position.set(x, y + (i ? -0.04 : 0.04), z);
      c.scale.set(0.05, 0.08, 0.05);
      c.rotation.set(i ? Math.PI : 0, t * 6 + id, 0);
      fx3Color(c, E.hi, 0.95);
    }
  }
  pr.body3 = t;
}

// Leuchtende Geschosse: Lichtkugel und kurzer Schweif im Raum (das gezeichnete Geschoss bleibt darüber)
function fx3Projectiles(h) {
  let skulls = 0;
  let mages = 0;
  for (const pr of game.projectiles) {
    // Schädel und Magier-Geschosse zeigen auch die Mitspieler (fremde Geschosse sonst nur gezeichnet)
    const skull = pr.style === 'skullfire';
    const mage = MAGE3_STYLES.has(pr.style) && (pr.owner === 'player' || pr.style !== 'mage');
    if ((pr.owner !== 'player' && !skull && !mage) || !v3InView(pr.x, pr.y, 40)) continue;
    if (skull && skulls < SKULL3_MAX) {
      skulls++;
      fx3Skull(h, pr);
      continue;
    }
    if (mage && mages < MAGE3_MAX) {
      mages++;
      fx3MageBolt(h, pr);
      continue;
    }
    if (pr.owner !== 'player') continue;
    const s = (pr.radius || 6) * U3 * 4;
    const o = fx3Take(h, 'sprite');
    o.position.set(pr.x * U3, PROJECTILE_LIFT * U3 * 1.3, pr.y * U3);
    o.scale.set(s, s, 1);
    fx3Map(o, 'disc');
    fx3Color(o, pr.rank >= 0 ? SKILL_RANKS[pr.rank].color : pr.color || '#ffffff', 0.9);
    const tr = pr.trail || [];
    for (let i = 0; i < tr.length; i += 2) {
      const t = tr[i];
      const q = fx3Take(h, 'sprite');
      q.position.set(t.x * U3, PROJECTILE_LIFT * U3 * 1.3, t.y * U3);
      const ss = s * (0.3 + 0.6 * (i / Math.max(1, tr.length)));
      q.scale.set(ss, ss, 1);
      fx3Map(q, 'disc');
      fx3Color(q, pr.color || '#ffffff', 0.5 * (i / Math.max(1, tr.length)));
    }
  }
}

// --- Zustände an Monstern (seit 8.0): Betäubung, Verlangsamung, Brand, Gift, Fluch -----------------
// Sterne kreisen über dem Kopf, Raureif mit Eiskristallen an den Füßen, Flammenzungen und Glut,
// grüne Bläschen, eine Rune in der Farbe des Fluchs über dem Kopf. Höchstens STATUS3_MAX Monster je Bild.
const FX3_STATUS = { parts: [] };
const STATUS3_MAX = 24;
const ICE3_MAX = 8;
function fx3Status(h) {
  const t = game.time;
  let n = 0;
  let ice = 0;
  for (const m of game.monsters) {
    // Eis taut oder bricht: Splitter und Funken (zählen zum Effekt-Budget)
    if (m.ice3 && !(m.frozen > t)) {
      m.ice3 = false;
      if (!m.dead) {
        addEffect({ type: 'sparks3', x: m.x, y: feetY(m), h: 0.6, count: 8, color: '#eafcff', speed: 2.2, up: 1, dur: 0.5 });
        addEffect({ type: 'shards3', x: m.x, y: feetY(m), r: (m.r || 14) * 1.2, count: 5, color: '#9ff6ff', glow: true, size: 0.5, dur: 0.45 });
      }
    }
    if (m.dead || m.isStone) continue;
    const frozen = m.frozen > t;
    const stun = m.stun > 0 || m.stunned || frozen;
    const slow = m.slow && m.slow.until > t;
    const burn = m.burn && m.burn.until > t;
    const poison = m.poison && m.poison.until > t;
    const curse = m.vulnerable && m.vulnerable.until > t;
    if (!(stun || slow || burn || poison || curse) || !v3InView(m.x, m.y, 60)) continue;
    if (++n > STATUS3_MAX) break;
    const fy = feetY(m);
    const x = m.x * U3;
    const z = fy * U3;
    const head = v3HeadHeight(m);
    const rr = Math.max(0.32, (m.r || 14) * U3 * 1.25);
    const ph = ((m.id | 0) % 13) * 0.5;
    // Eingefroren (Magier, seit 8.6): Eisblock statt Sternen, höchstens ICE3_MAX gleichzeitig
    const iced = frozen && ice < ICE3_MAX;
    if (iced) {
      ice++;
      m.ice3 = true;
      const g = easeOut(clamp01((t - (m.frozenT || t - 1)) / 0.12));
      const H = Math.max(0.5, head * 0.95) * g;
      const r = Math.max(0.28, (m.r || 14) * U3 * 0.9);
      const block = fx3Take(h, 'ice');
      block.position.set(x, H / 2, z);
      block.scale.set(r, Math.max(0.01, H), r);
      block.rotation.set(0, ph, 0);
      block.material.color.set('#9ff6ff');
      block.material.opacity = 0.42;
      for (let i = 0; i < 3; i++) {
        const a = ph + i * 2.094 + 0.5;
        const c = fx3Take(h, 'coneG');
        const ch = head * 0.6 * g;
        c.position.set(x + Math.cos(a) * r * 0.95, ch * 0.4, z + Math.sin(a) * r * 0.95);
        c.scale.set(0.08, Math.max(0.01, ch), 0.08);
        c.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45);
        fx3Color(c, '#eafcff', 0.9);
      }
      const fl = fx3Take(h, 'planeNHex');
      fx3Ground(fl, m.x, fy, r * 1.6 * g + 0.01, 0.045, 'hexfrost', ph);
      fx3Color(fl, '#3a7bff', 0.75);
    }
    if (stun && !iced) for (let i = 0; i < 3; i++) {
      const a = t * 5 + i * 2.094 + ph;
      const o = fx3Take(h, 'spriteStar');
      fx3Map(o, 'star');
      o.position.set(x + Math.cos(a) * 0.36, head - 0.06 + Math.sin(a * 2) * 0.04, z + Math.sin(a) * 0.26);
      o.scale.set(0.22, 0.22, 1);
      o.material.rotation = a;
      fx3Color(o, '#ffe27a', 1);
    }
    if (slow && !iced) {
      const o = fx3Take(h, 'planeFrost');
      fx3Ground(o, m.x, fy, rr * (1.05 + 0.05 * Math.sin(t * 3 + ph)), 0.05, 'ring', t * 0.3);
      fx3Color(o, '#bfe8ff', 0.9);
      for (let i = 0; i < 4; i++) {
        const a = i * 1.571 + ph;
        const c = fx3Take(h, 'coneG');
        c.position.set(x + Math.cos(a) * rr * 0.85, 0.09, z + Math.sin(a) * rr * 0.85);
        c.scale.set(0.05, 0.18, 0.05);
        c.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
        fx3Color(c, '#dff4ff', 0.9);
      }
    }
    if (burn) for (let i = 0; i < 3; i++) {
      const fl = 0.85 + 0.25 * Math.sin(t * 17 + i * 2 + ph);
      const o = fx3Take(h, 'spriteFlame');
      fx3Map(o, 'flame');
      o.position.set(x + (i - 1) * 0.16, head * (0.62 + (i === 1 ? 0.12 : 0)) + 0.08 * fl, z + 0.05);
      o.scale.set(0.2 * fl, 0.32 * fl, 1);
      fx3Color(o, i === 1 ? '#ffb04a' : '#ff6a2a', 0.95);
      const u = (t * 0.9 + i * 0.33 + ph) % 1;
      const em = fx3Take(h, 'sprite');
      fx3Map(em, 'spark');
      em.position.set(x + Math.sin(u * 9 + i) * 0.15, head * 0.5 + u * head * 0.9, z);
      em.scale.set(0.12, 0.12, 1);
      fx3Color(em, '#ffd34d', 1 - u);
    }
    if (poison) for (let i = 0; i < 3; i++) {
      const u = (t * 0.7 + i * 0.33 + ph) % 1;
      const o = fx3Take(h, 'spriteBubble');
      fx3Map(o, 'bubble');
      o.position.set(x + Math.sin(u * 7 + i * 2) * 0.14 + (i - 1) * 0.12, head * 0.2 + u * head * 0.7, z + 0.12);
      const s = 0.1 + 0.07 * u;
      o.scale.set(s, s, 1);
      fx3Color(o, '#9fe36a', 1 - u * 0.8);
    }
    if (curse) {
      const o = fx3Take(h, 'planeRune');
      fx3Ground(o, m.x, fy, 0.44, head + 0.12, 'rune', t * 1.3);
      fx3Color(o, m.vulnerable.color || '#b48cff', 0.95);
    }
  }
}

// --- Seelenkrone (seit 8.5, Dunkle Macht) ------------------------------------------------------------
// Fünf grüne Flammen steigen spiralförmig von den Füßen auf und kreisen danach als Krone über dem Kopf (fest fünf in
// allen Rängen, Spitzen in der Rangfarbe). Beim Laufen alle 0,12 s ein violett-grünes Rauchwölkchen an den Füßen.
// Für den eigenen Spieler und Mitspieler mit dem Buff im Zustand (b); nicht bei Grafik „Niedrig“.
const FX3_CROWN = { parts: [] };
const CROWN3_PUFFS = Array.from({ length: 16 }, () => ({ x: 0, z: 0, t: -9, c: 0 }));
let crown3Next = 0;
const _crown3List = [];
function fx3Crown(h) {
  if (typeof opts !== 'undefined' && opts.graphics === 'niedrig') return;
  const now = game.time;
  const list = _crown3List;
  list.length = 0;
  if (game.player && game.running && !game.player.dead) list.push(game.player);
  for (const rp of net.players.values()) if (!rp.dead && !remoteHidden(rp)) list.push(rp);
  for (const p of list) {
    let b = null;
    for (const q of p.buffs || []) if (q.id === 'dunklemacht' && q.until > now) { b = q; break; }
    if (!b) {
      p.crownAt = null;
      continue;
    }
    if (p.crownAt == null) p.crownAt = now;
    if (!v3InView(p.x, p.y, 60)) continue;
    const fy = feetY(p);
    if (p.moving && now >= (p.crownPuffAt || 0)) {
      p.crownPuffAt = now + 0.12;
      const q = CROWN3_PUFFS[crown3Next++ % CROWN3_PUFFS.length];
      q.x = p.x + (Math.random() - 0.5) * 10;
      q.z = fy;
      q.t = now;
      q.c = crown3Next & 1;
    }
    const x = p.x * U3;
    const z = fy * U3;
    const k = easeOut(clamp01((now - p.crownAt) / 0.8));
    const r = 0.5 - 0.12 * k;
    // etwas über dem Kopf (viel höher läge die Krone unter dem Namensschild)
    const y = 0.1 + (v3HeadHeight(p) + 0.14) * k;
    const spin = now * 1.2 + (1 - k) * 7;
    const rank = skillRank(b.lvl || 1);
    const tip = rank >= 0 ? SKILL_RANKS[rank].color : '#e0ffd0';
    for (let i = 0; i < 5; i++) {
      const a = spin + i * 1.2566;
      const fl = 0.85 + 0.2 * Math.sin(now * 15 + i * 2.1);
      const px = x + Math.cos(a) * r;
      const pz = z + Math.sin(a) * r;
      const py = y + 0.03 * Math.sin(now * 4 + i);
      // dunkelvioletter Schein dahinter: grüne Flammen bleiben auch auf hellem Gras sichtbar
      const back = fx3Take(h, 'smoke');
      back.position.set(px, py + 0.04, pz);
      back.scale.set(0.36, 0.44, 1);
      back.material.color.set('#2a1440');
      back.material.opacity = 0.6;
      const o = fx3Take(h, 'spriteFlame');
      fx3Map(o, 'flame');
      o.position.set(px, py, pz);
      o.scale.set(0.26 * fl, 0.46 * fl, 1);
      fx3Color(o, i % 2 ? '#7ad36a' : '#a7e37f', 1);
      const s = fx3Take(h, 'sprite');
      fx3Map(s, 'disc');
      s.position.set(px, py + 0.2 * fl, pz);
      s.scale.set(0.14, 0.14, 1);
      fx3Color(s, tip, 0.9);
    }
  }
  for (const q of CROWN3_PUFFS) {
    const age = now - q.t;
    if (age < 0 || age >= 0.6) continue;
    const o = fx3Take(h, 'smoke');
    o.position.set(q.x * U3, 0.12 + age * 0.5, q.z * U3);
    const s = 0.3 + age * 0.8;
    o.scale.set(s, s, 1);
    o.material.color.set(q.c ? '#5a2a9a' : '#2a6a3a');
    o.material.opacity = 0.6 * (1 - age / 0.6);
  }
}

// --- Buff-Auren als Körper (seit 8.6): SKILL_FX[id].aura3(h, p, b, t) für den eigenen Spieler und Mitspieler ---------
const FX3_AURA = { parts: [] };
const _aura3List = [];
function fx3BuffAuras(h) {
  const now = game.time;
  const list = _aura3List;
  list.length = 0;
  if (game.player && game.running && !game.player.dead) list.push(game.player);
  for (const rp of net.players.values()) if (!rp.dead && !remoteHidden(rp)) list.push(rp);
  for (const p of list) {
    if (!p.buffs || !p.buffs.length || p.blinkHide > now || !v3InView(p.x, p.y, 60)) continue;
    for (const b of p.buffs) {
      const fx = SKILL_FX[b.id];
      if (fx && fx.aura3 && b.until > now) fx.aura3(h, p, b, now);
    }
  }
}

const FX3_PROJ = { parts: [] };
function v3SyncFx() {
  if (!FX3.group) {
    FX3.group = new THREE.Group();
    FX3.cam.r = new THREE.Vector3();
    FX3.cam.u = new THREE.Vector3();
    FX3.cam.f = new THREE.Vector3();
    V3.scene.add(FX3.group);
  }
  const m = V3.camera.matrixWorld.elements;
  FX3.cam.r.set(m[0], m[1], m[2]).normalize();
  FX3.cam.u.set(m[4], m[5], m[6]).normalize();
  FX3.cam.f.set(-m[8], -m[9], -m[10]).normalize();
  // Alles vom letzten Bild zurück in den Vorrat, dann neu verteilen (Effekte leben nur Sekundenbruchteile)
  for (const h of FX3.live) fx3Release(h);
  FX3.live.clear();
  fx3Release(FX3_PROJ);
  fx3Release(FX3_STATUS);
  fx3Release(FX3_CROWN);
  fx3Release(FX3_AURA);
  for (const e of game.effects) {
    if (!FX3_TYPES.has(e.type)) continue;
    const o = effectOrigin(e);
    if (!v3InView(o.x, o.y, 160)) continue;
    const k = Math.min(1, (game.time - e.start) / e.dur);
    const h = e.__fx3 || (e.__fx3 = { parts: [] });
    FX3_DRAW[e.type](h, e, k);
    FX3.live.add(h);
  }
  fx3Projectiles(FX3_PROJ);
  fx3Status(FX3_STATUS);
  fx3Crown(FX3_CROWN);
  fx3BuffAuras(FX3_AURA);
}

// --- Rand der aktuellen Map (seit 6.6) -----------------------------------------------------------
// Um die Dungeon-Halle, in der man steht, liegt ein Kasten aus Nebel: hohe Wände im Norden, Osten und
// Westen, eine niedrige im Süden (dort steht die Kamera), darüber Deckel. So sieht man die Nachbarhalle nicht.
// Maps (seit 8.4): Den Rand schließt die Randkulisse ab (drei-welt.js), dahinter steht nur noch ein Horizont:
// ein Ring aus vier Wänden KUL3_FAR Kacheln hinter dem Rand, unten in der Farbe der Ferne mit einem flachen
// Bergkamm, nach oben in den Himmel verlaufend. Ein Mesh, ein Zeichenaufruf, je Bild nur zwei Farben kopiert.
const BOUNDS3 = { key: '', walls: null, mat: null, horizon: null };
const HORIZON3_H = 16;
function horizonMat3() {
  return mat3('horizon', () => new THREE.ShaderMaterial({
    uniforms: { uBottom: { value: new THREE.Color() }, uTop: { value: new THREE.Color() } },
    vertexShader: `varying float vH;
varying float vU;
void main() {
	vH = position.y;
	vU = position.x + position.z;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `uniform vec3 uBottom;
uniform vec3 uTop;
varying float vH;
varying float vU;
void main() {
	float ridge = 7.0 + 2.2 * sin(vU * 0.11) + 1.4 * sin(vU * 0.27 + 1.3) + 0.6 * sin(vU * 0.71);
	vec3 hill = mix(uBottom, uTop, 0.3 * clamp(1.0 - vH / ridge, 0.0, 1.0));
	gl_FragColor = vec4(mix(hill, uTop, smoothstep(ridge - 0.25, ridge + 0.25, vH)), 1.0);
}`,
    side: THREE.DoubleSide,
    fog: false
  }));
}
// Horizont-Ring um das Rechteck x0..x1 × z0..z1 (Positionen nur beim Wechsel der Map neu)
function placeHorizon3(x0, z0, x1, z1) {
  if (!BOUNDS3.horizon) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * 3), 3));
    const idx = [];
    for (let k = 0; k < 4; k++) idx.push(k * 4, k * 4 + 1, k * 4 + 2, k * 4 + 2, k * 4 + 1, k * 4 + 3);
    g.setIndex(idx);
    BOUNDS3.horizon = new THREE.Mesh(g, horizonMat3());
    BOUNDS3.horizon.material.uniforms.uTop.value.copy(V3.scene.fog.color);
    BOUNDS3.horizon.material.uniforms.uBottom.value.copy(V3.scene.fog.color);
    BOUNDS3.horizon.renderOrder = -1;
    V3.scene.add(BOUNDS3.horizon);
  }
  const g = BOUNDS3.horizon.geometry;
  const pos = g.attributes.position;
  const corners = [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]];
  for (let k = 0; k < 4; k++) {
    const [ax, az] = corners[k];
    const [bx, bz] = corners[k + 1];
    pos.setXYZ(k * 4, ax, -3, az);
    pos.setXYZ(k * 4 + 1, bx, -3, bz);
    pos.setXYZ(k * 4 + 2, ax, HORIZON3_H, az);
    pos.setXYZ(k * 4 + 3, bx, HORIZON3_H, bz);
  }
  pos.needsUpdate = true;
  g.computeBoundingSphere();
}
function regionRect3(x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  const wm = mapOfTile(tx, ty);
  if (wm) return { r: wm.region, inset: MAP_BORDER - 1, key: 'm' + wm.id };
  if (tx >= WORLD_W && ty < DUNGEON_H) {
    const col = Math.floor((tx - WORLD_W) / DUNGEON_COL);
    const row = Math.floor(ty / DUNGEON_BLOCK);
    return { r: [WORLD_W + col * DUNGEON_COL, row * DUNGEON_BLOCK, DUNGEON_COL, DUNGEON_BLOCK], inset: 1, key: 'd' + col + ':' + row };
  }
  return null;
}
function v3SyncBounds() {
  const p = game.player;
  if (!p || !game.running) return;
  if (!BOUNDS3.walls) {
    BOUNDS3.mat = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false, side: THREE.FrontSide });
    const lidMat = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false, side: THREE.DoubleSide });
    BOUNDS3.lidMat = lidMat;
    BOUNDS3.walls = [];
    for (let k = 0; k < 8; k++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), k < 4 ? BOUNDS3.mat : lidMat);
      m.renderOrder = -1;
      V3.scene.add(m);
      BOUNDS3.walls.push(m);
    }
  }
  // Nebelfarbe übernehmen (wechselt mit dem Gebiet)
  BOUNDS3.mat.color.copy(V3.scene.fog.color);
  BOUNDS3.lidMat.color.copy(V3.scene.fog.color);
  const home = V3.home;
  if (BOUNDS3.horizon && home && home.B) {
    const u = BOUNDS3.horizon.material.uniforms;
    u.uTop.value.copy(V3.scene.fog.color);
    u.uBottom.value.copy(home.B.farC || (home.B.farC = new THREE.Color(home.B.far))).lerp(V3.scene.fog.color, 0.4);
  }
  const rr = regionRect3(p.x, p.y);
  const key = rr ? rr.key : '';
  if (key === BOUNDS3.key) return;
  BOUNDS3.key = key;
  // Map: Horizont statt Nebelkasten
  const box = !!rr && key[0] === 'd';
  for (const w of BOUNDS3.walls) w.visible = box;
  if (rr && !box) {
    const [rx, ry, rw, rh] = rr.r;
    placeHorizon3(rx - KUL3_FAR, ry - KUL3_FAR, rx + rw + KUL3_FAR, ry + rh + KUL3_FAR);
  }
  if (BOUNDS3.horizon) BOUNDS3.horizon.visible = !!rr && !box;
  if (!box) return;
  const [rx, ry, rw, rh] = rr.r;
  const x0 = rx + rr.inset;
  const x1 = rx + rw - rr.inset;
  const z0 = ry + rr.inset;
  const z1 = ry + rh - rr.inset;
  const H = 9;
  const HS = 1.4;
  const FAR = 260;
  const [wn, ws, ww, we, ln, ls, lw, le] = BOUNDS3.walls;
  // Wände: Vorderseite zeigt nach innen (von außen unsichtbar)
  wn.scale.set(x1 - x0 + 2, H + 1, 1); wn.position.set((x0 + x1) / 2, H / 2 - 0.5, z0); wn.rotation.set(0, 0, 0);
  ws.scale.set(x1 - x0 + 2, HS + 1, 1); ws.position.set((x0 + x1) / 2, HS / 2 - 0.5, z1); ws.rotation.set(0, Math.PI, 0);
  ww.scale.set(z1 - z0, H + 1, 1); ww.position.set(x0, H / 2 - 0.5, (z0 + z1) / 2); ww.rotation.set(0, Math.PI / 2, 0);
  we.scale.set(z1 - z0, H + 1, 1); we.position.set(x1, H / 2 - 0.5, (z0 + z1) / 2); we.rotation.set(0, -Math.PI / 2, 0);
  // Deckel über allem außerhalb
  const lid = (m, cx, cz, sx, sz, h) => { m.scale.set(sx, sz, 1); m.position.set(cx, h, cz); m.rotation.set(-Math.PI / 2, 0, 0); };
  lid(ln, (x0 + x1) / 2, z0 - FAR / 2, x1 - x0 + FAR * 2, FAR, H);
  lid(ls, (x0 + x1) / 2, z1 + FAR / 2, x1 - x0 + FAR * 2, FAR, HS);
  lid(lw, x0 - FAR / 2, (z0 + z1) / 2, FAR, z1 - z0, H);
  lid(le, x1 + FAR / 2, (z0 + z1) / 2, FAR, z1 - z0, H);
}
