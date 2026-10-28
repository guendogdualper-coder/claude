// 3D-Welt: Bäume, Felsen, Häuser, Dorfmauer, Türme, Tore, Dorfschmuck, Brücken, Gras und Blumen.
// Je Block (16 × 16 Kacheln) wird alles zu wenigen Meshes zusammengebacken: ein beleuchtetes mit
// Umriss, eines für leuchtende Teile (Laternen, Glut, Feuer) und eines für Gras ohne Umriss.
// Alle Formen sind weich abgerundet; Farben kommen aus denselben Tabellen wie im 2D-Spiel.

const WALL3_ROOF = '#3e4656';

function worldLitMat() {
  return mat3('worldLit', () => addFade(toonMat(), 0.45));
}
function worldGlowMat() {
  return mat3('worldGlow', () => new THREE.MeshBasicMaterial({ vertexColors: true }));
}
function worldGrassMat() {
  return mat3('worldGrass', () => toonMat());
}
function worldAuraMat() {
  return mat3('worldAura', () => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
}

// Matrix für ein Objekt an (x, z) mit Drehung um die Hochachse und Größe
function placeAt(x, z, rotY = 0, s = 1, y = 0) {
  _q.setFromEuler(_e.set(0, rotY, 0));
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.clone(), new THREE.Vector3(s, s, s));
}

// Rundlicher Felsbrocken: Ikosaeder, mit Rauschen verbeult und glatt schattiert
function rockGeo(v) {
  return geo3('rock' + v, () => {
    const g = smoothGeo(new THREE.IcosahedronGeometry(1, 1));
    const pos = g.attributes.position;
    const rnd = mulberry32(31 + v * 17);
    const bumps = Array.from({ length: 7 }, () => [rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1, 0.12 + rnd() * 0.22]);
    for (let i = 0; i < pos.count; i++) {
      _v1.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
      let r = 0.92 + rnd() * 0.12;
      for (const [bx, by, bz, a] of bumps) r += a * Math.max(0, _v1.x * bx + _v1.y * by + _v1.z * bz);
      // oben etwas abgeflacht, unten im Boden
      pos.setXYZ(i, _v1.x * r, Math.max(-0.25, _v1.y > 0.55 ? 0.55 + (_v1.y - 0.55) * 0.45 : _v1.y) * r * 0.8, _v1.z * r);
    }
    g.computeVertexNormals();
    return g;
  });
}

// --- Modelle (fügen ihre Teile in eine Bake3 ein; M = Matrix des Objekts) ------------------------

const WORLD3 = {
  tree(b, M, v, style) {
    const bark = '#6b4a2e';
    b.add(lathe3('trunk', [[0.3, 0], [0.19, 0.14], [0.15, 0.7], [0.12, 1.3], [0, 1.34]], 9), bark, { parent: M, shade: 0.35 });
    b.add(limb3(0.6, 0.07, 0.05, 6), bark, { parent: M, p: [0.08, 1.0, 0], r: [0, 0, 2.2] });
    const blossom = style === 'blossom';
    const cols = blossom ? ['#d07896', '#e08aa6', '#f5b8cb'] : style === 'nagadschungel' ? ['#2e5a2a', '#3d7633', '#5a9a46'] : ['#2f6229', '#3d7633', '#5a9a46'];
    TREE_BLOBS[v].forEach(([x, y, r], k) => {
      const top = y < -36;
      b.add(sphere3(1, 10, 7), top ? cols[2] : k % 2 ? cols[1] : cols[0], {
        parent: M, p: [x / 32 * 1.1, -y / 32 * 1.1 + 0.25, ((k * 37) % 7 - 3) * 0.09], s: (r / 32) * 1.35, shade: 0.35
      });
    });
    if (blossom) for (const [x, y, z] of [[-0.4, 1.9, 0.5], [0.3, 1.6, 0.6], [0.5, 2.2, 0.2], [-0.2, 2.4, 0.3]]) b.add(sphere3(0.07, 6, 4), '#ffffff', { parent: M, p: [x, y, z] });
  },

  pine(b, M, v, style) {
    const snowy = style === 'frost';
    b.add(lathe3('pinetrunk', [[0.18, 0], [0.13, 0.1], [0.1, 0.7], [0, 0.72]], 8), '#5a3f2a', { parent: M, shade: 0.3 });
    const tiers = 4 + (v === 2 ? 1 : 0);
    for (let k = 0; k < tiers; k++) {
      const r = (0.85 - k * (0.62 / tiers)) * (v === 1 ? 0.9 : 1);
      const y = 0.35 + k * 0.42;
      const g = lathe3(`pinetier${r.toFixed(2)}`, [[0, -0.04], [r * 0.6, -0.02], [r, 0.06], [r * 0.95, 0.14], [r * 0.45, 0.48], [r * 0.12, 0.66], [0, 0.7]], 11);
      b.add(g, snowy ? '#2a4a48' : k % 2 ? '#2a5c48' : '#245242', { parent: M, p: [0, y, 0], r: [0, k * 0.7, 0], shade: 0.4 });
      if (snowy) b.add(lathe3(`pinesnow${r.toFixed(2)}`, [[0, 0.18], [r * 0.62, 0.2], [r * 0.5, 0.32], [r * 0.2, 0.55], [0, 0.71]], 11), '#f4f8fc', { parent: M, p: [0, y, 0] });
    }
  },

  dead(b, M, v, style) {
    const bark = style === 'vulkan' || style === 'titanenkamm' ? '#2a1e1a' : style === 'moor' ? '#3a3a2a' : '#4a3527';
    const m = v === 1 ? -1 : 1;
    b.add(lathe3('deadtrunk', [[0.24, 0], [0.15, 0.12], [0.1, 0.8], [0.05, 1.35], [0, 1.4]], 8), bark, { parent: M, shade: 0.3, r: [0, 0, 0.05 * m] });
    const br = [[0.5, 0.06, 0.04, [0, 0.5, 0], [0, 0, -1.0 * m]], [0.42, 0.05, 0.03, [0, 0.75, 0], [0, 0, 0.9 * m]], [0.36, 0.04, 0.025, [0, 1.0, 0], [0.4, 0, -0.5 * m]]];
    if (v === 2) br.push([0.3, 0.04, 0.025, [0, 0.3, 0], [0, 0, 1.1]]);
    for (const [len, r1, r2, p, r] of br) b.add(limb3(len, r1, r2, 6), bark, { parent: M, p, r: [r[0] + Math.PI, r[1], r[2]] });
    if (style === 'moor') for (const [x, y] of [[0.35 * m, 0.7], [-0.3 * m, 0.95]]) b.add(limb3(0.28, 0.04, 0.02, 5), '#5a7a4a', { parent: M, p: [x, y, 0.05] });
    if (style === 'vulkan' || style === 'titanenkamm') b.add(limb3(0.4, 0.035, 0.02, 5), '#ff7a2a', { parent: M, p: [0.02, 0.85, 0.12], mat: 'glow' });
  },

  rock(b, M, v, style) {
    const [base, top, moss] = ROCK_STYLES[style] || ROCK_STYLES.wiesen;
    const s = [1, 0.85, 1.15][v];
    b.add(rockGeo(v), base, { parent: M, s: [0.48 * s, 0.5 * s, 0.42 * s], p: [0, 0.12, 0], top: moss || top, topK: moss ? 0.8 : 0.6, shade: 0.45 });
    if (v === 2) b.add(rockGeo(1), base, { parent: M, s: [0.22, 0.24, 0.2], p: [0.45, 0.06, 0.15], top, topK: 0.45 });
    if (style === 'vulkan' || style === 'titanenkamm') b.add(limb3(0.3, 0.025, 0.02, 5), '#ff7a2a', { parent: M, p: [-0.15, 0.42, 0.25], r: [0.3, 0, 1.2], mat: 'glow' });
  },

  // Haus: Steinsockel, helle Putzwände mit dunklen Balken, Papierfenster, geschwungenes Ziegeldach
  house(b, h) {
    const W = h.w;
    const D = h.h;
    const M = placeAt(h.x + W / 2, h.y + D / 2);
    const wallW = W - 0.5;
    const wallD = D - 0.7;
    const wh = 1.55;
    const timber = '#5a3a22';
    b.add(roundBox(W - 0.2, 0.3, D - 0.35, 0.08), '#8a8478', { parent: M, p: [0, 0.15, 0], shade: 0.3 });
    b.add(roundBox(wallW, wh, wallD, 0.06), '#e2d0aa', { parent: M, p: [0, 0.3 + wh / 2, 0], shade: 0.18 });
    const posts = Math.max(3, W + 1);
    for (let k = 0; k < posts; k++) {
      const x = -wallW / 2 + (wallW * k) / (posts - 1);
      for (const z of [-wallD / 2, wallD / 2]) b.add(roundBox(0.14, wh + 0.05, 0.14, 0.04), timber, { parent: M, p: [x, 0.3 + wh / 2, z] });
    }
    for (const x of [-wallW / 2, wallW / 2]) b.add(roundBox(0.14, wh + 0.05, 0.14, 0.04), timber, { parent: M, p: [x, 0.3 + wh / 2, 0] });
    b.add(roundBox(wallW + 0.1, 0.13, wallD + 0.1, 0.04), timber, { parent: M, p: [0, 0.3 + wh - 0.02, 0] });
    b.add(roundBox(wallW + 0.1, 0.1, wallD + 0.1, 0.03), timber, { parent: M, p: [0, 0.36, 0] });
    // Tür und Fenster an der Vorderseite (Süden)
    b.add(roundBox(0.62, 1.05, 0.08, 0.03), '#4a2e1c', { parent: M, p: [0, 0.3 + 0.53, wallD / 2 + 0.03] });
    b.add(roundBox(0.24, 0.92, 0.06, 0.02), '#6b4a2e', { parent: M, p: [-0.15, 0.3 + 0.5, wallD / 2 + 0.07] });
    b.add(roundBox(0.24, 0.92, 0.06, 0.02), '#6b4a2e', { parent: M, p: [0.15, 0.3 + 0.5, wallD / 2 + 0.07] });
    for (let k = 0; k < posts - 1; k++) {
      const xa = -wallW / 2 + (wallW * k) / (posts - 1);
      const xb = -wallW / 2 + (wallW * (k + 1)) / (posts - 1);
      const mid = (xa + xb) / 2;
      if (Math.abs(mid) < 0.5) continue;
      const ww = Math.min(0.7, xb - xa - 0.28);
      b.add(roundBox(ww, 0.45, 0.06, 0.02), '#f3e2b0', { parent: M, p: [mid, 0.3 + wh * 0.62, wallD / 2 + 0.03], mat: 'glowWin' });
      for (let gx = -1; gx <= 1; gx++) b.add(roundBox(0.025, 0.45, 0.07, 0.01), '#8a6a44', { parent: M, p: [mid + gx * ww / 4, 0.3 + wh * 0.62, wallD / 2 + 0.04] });
      b.add(roundBox(ww, 0.025, 0.07, 0.01), '#8a6a44', { parent: M, p: [mid, 0.3 + wh * 0.62, wallD / 2 + 0.04] });
    }
    // Dach mit Überstand, hochgezogenen Ecken, First und Zierenden
    const ry = 0.3 + wh;
    b.add(roofGeo(W + 0.9, D + 0.8, 1.35, 0.42), h.roof, { parent: M, p: [0, ry - 0.06, 0], shade: 0.25, top: lighter(h.roof, 0.18), topK: 0.6 });
    b.add(roundBox(Math.max(0.6, W - D + 0.6), 0.16, 0.2, 0.07), darker(h.roof, 0.4), { parent: M, p: [0, ry + 1.25, 0] });
    for (const sx of [-1, 1]) b.add(horn3(0.32, 0.07, 8), darker(h.roof, 0.4), { parent: M, p: [sx * Math.max(0.3, (W - D) / 2 + 0.3), ry + 1.25, 0], r: [0, 0, -sx * 0.7] });
    // Rote Laternen an den vorderen Ecken
    for (const sx of [-1, 1]) {
      const p = [sx * (W / 2 - 0.05), ry - 0.25, D / 2 - 0.05];
      b.add(limb3(0.12, 0.012, 0.012, 4), '#2a1c14', { parent: M, p: [p[0], p[1] + 0.14, p[2]] });
      b.add(sphere3(0.12, 10, 8), '#ff6a3a', { parent: M, p, s: [1, 1.25, 1], mat: 'glow' });
      b.add(roundBox(0.18, 0.04, 0.18, 0.015), '#c9a35a', { parent: M, p: [p[0], p[1] + 0.14, p[2]] });
      b.add(roundBox(0.18, 0.04, 0.18, 0.015), '#c9a35a', { parent: M, p: [p[0], p[1] - 0.14, p[2]] });
    }
  },

  // Dorfmauer je Kachel: Steinsockel, Putzwand mit Balken, kleines Ziegeldach obenauf
  wall(b, x, z, vertical) {
    const M = placeAt(x, z, vertical ? Math.PI / 2 : 0);
    b.add(roundBox(1.06, 0.4, 0.62, 0.08), '#7a746a', { parent: M, p: [0, 0.2, 0], shade: 0.3 });
    b.add(roundBox(1.06, 0.92, 0.42, 0.05), '#dccaa4', { parent: M, p: [0, 0.82, 0], shade: 0.15 });
    b.add(roundBox(1.12, 0.16, 0.72, 0.06), WALL3_ROOF, { parent: M, p: [0, 1.32, 0], top: lighter(WALL3_ROOF, 0.15), topK: 0.5 });
  },

  bridge(b, x, z, vertical) {
    const M = placeAt(x, z, vertical ? Math.PI / 2 : 0);
    b.add(roundBox(1.06, 0.12, 1.1, 0.04), '#8a6440', { parent: M, p: [0, 0.02, 0], shade: 0.3 });
    for (let k = -2; k <= 2; k++) b.add(roundBox(0.03, 0.13, 1.08, 0.01), '#5a3f26', { parent: M, p: [k * 0.21, 0.025, 0] });
    for (const sz of [-1, 1]) {
      b.add(roundBox(1.06, 0.07, 0.07, 0.03), '#6b4a2e', { parent: M, p: [0, 0.42, sz * 0.52] });
      b.add(roundBox(0.08, 0.42, 0.08, 0.03), '#5a3a22', { parent: M, p: [0.45, 0.22, sz * 0.52] });
    }
  }
};

// Dorfschmuck und Bauten aus game.world.props
const PROP3 = {
  well(b, M) {
    b.add(lathe3('wellring', [[0.4, 0], [0.48, 0.02], [0.5, 0.3], [0.48, 0.42], [0.42, 0.44], [0.36, 0.4], [0.36, 0.1]], 18), '#8a8276', { parent: M, shade: 0.3 });
    b.add(new THREE.CircleGeometry(0.37, 18).rotateX(-Math.PI / 2), '#3a7aa0', { parent: M, p: [0, 0.3, 0] });
    for (const sx of [-1, 1]) b.add(roundBox(0.1, 1.1, 0.1, 0.03), '#5a3a22', { parent: M, p: [sx * 0.42, 0.6, 0] });
    b.add(limb3(0.95, 0.04, 0.04, 6), '#6b4a2e', { parent: M, p: [-0.47, 1.0, 0], r: [0, 0, Math.PI / 2] });
    b.add(roofGeo(1.25, 0.8, 0.42, 0.18), '#7c3a2c', { parent: M, p: [0, 1.1, 0], shade: 0.2 });
    b.add(lathe3('bucket', [[0.08, 0], [0.1, 0.16], [0, 0.17]], 10), '#6b4a2e', { parent: M, p: [0, 0.6, 0] });
  },
  lantern(b, M) {
    b.add(roundBox(0.42, 0.16, 0.42, 0.05), '#8a8478', { parent: M, p: [0, 0.08, 0], shade: 0.2 });
    b.add(roundBox(0.18, 0.55, 0.18, 0.05), '#9a9488', { parent: M, p: [0, 0.43, 0] });
    b.add(roundBox(0.42, 0.1, 0.42, 0.04), '#8a8478', { parent: M, p: [0, 0.74, 0] });
    b.add(roundBox(0.28, 0.26, 0.28, 0.05), '#ffd27a', { parent: M, p: [0, 0.92, 0], mat: 'glow' });
    b.add(roofGeo(0.62, 0.62, 0.3, 0.1), '#7a746a', { parent: M, p: [0, 1.04, 0] });
    b.add(sphere3(0.06, 8, 6), '#7a746a', { parent: M, p: [0, 1.36, 0] });
  },
  barrel(b, M) {
    b.add(lathe3('barrel', [[0, 0], [0.2, 0], [0.24, 0.12], [0.26, 0.27], [0.24, 0.42], [0.2, 0.54], [0, 0.54]], 14), '#8a5a34', { parent: M, shade: 0.25 });
    for (const y of [0.12, 0.42]) b.add(new THREE.TorusGeometry(0.245, 0.018, 5, 18).rotateX(Math.PI / 2), '#3a2a1c', { parent: M, p: [0, y, 0] });
  },
  crate(b, M) {
    b.add(roundBox(0.5, 0.46, 0.5, 0.05), '#a07a4a', { parent: M, p: [0, 0.23, 0], shade: 0.25 });
    for (const y of [0.1, 0.36]) b.add(roundBox(0.52, 0.04, 0.52, 0.015), '#5a3f26', { parent: M, p: [0, y, 0] });
  },
  tower(b, M) {
    b.add(roundBox(1.25, 0.45, 1.25, 0.1), '#6e685e', { parent: M, p: [0, 0.22, 0], shade: 0.3 });
    b.add(roundBox(1.02, 1.5, 1.02, 0.06), '#dccaa4', { parent: M, p: [0, 1.18, 0], shade: 0.15 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(roundBox(0.13, 1.52, 0.13, 0.04), '#5a3a22', { parent: M, p: [sx * 0.5, 1.18, sz * 0.5] });
    b.add(roundBox(1.06, 0.1, 1.06, 0.03), '#5a3a22', { parent: M, p: [0, 1.3, 0] });
    b.add(roundBox(0.32, 0.45, 0.06, 0.03), '#3a2a1c', { parent: M, p: [0, 1.1, 0.52] });
    b.add(roundBox(1.45, 0.16, 1.45, 0.05), '#6b4a2e', { parent: M, p: [0, 2.0, 0] });
    for (let k = 0; k < 4; k++) {
      for (let j = -2; j <= 2; j++) {
        const a = (k * Math.PI) / 2;
        b.add(roundBox(0.05, 0.24, 0.05, 0.02), '#5a3a22', { parent: M, p: [Math.cos(a) * 0.68 - Math.sin(a) * j * 0.3, 2.2, Math.sin(a) * 0.68 + Math.cos(a) * j * 0.3] });
      }
    }
    b.add(roofGeo(1.9, 1.9, 0.85, 0.32), '#7c3a2c', { parent: M, p: [0, 2.3, 0], shade: 0.2, top: lighter('#7c3a2c', 0.15), topK: 0.6 });
    b.add(sphere3(0.09, 8, 6), '#c9a35a', { parent: M, p: [0, 3.2, 0] });
    for (const sx of [-1, 1]) b.add(sphere3(0.1, 10, 8), '#ff6a3a', { parent: M, p: [sx * 0.78, 2.05, 0.78], s: [1, 1.3, 1], mat: 'glow' });
  },
  gate(b, M) {
    for (const sx of [-1, 1]) {
      b.add(roundBox(0.26, 2.45, 0.26, 0.07), '#9a2f2a', { parent: M, p: [sx * 1.88, 1.22, 0], shade: 0.25 });
      b.add(roundBox(0.4, 0.2, 0.4, 0.06), '#6e685e', { parent: M, p: [sx * 1.88, 0.1, 0] });
    }
    b.add(roundBox(4.4, 0.22, 0.32, 0.08), '#9a2f2a', { parent: M, p: [0, 2.5, 0] });
    b.add(roundBox(4.0, 0.16, 0.24, 0.06), '#7a2420', { parent: M, p: [0, 2.15, 0] });
    b.add(roofGeo(5.2, 0.95, 0.55, 0.3), WALL3_ROOF, { parent: M, p: [0, 2.6, 0], shade: 0.2, top: lighter(WALL3_ROOF, 0.15), topK: 0.6 });
    b.add(roundBox(3.3, 0.14, 0.18, 0.06), darker(WALL3_ROOF, 0.35), { parent: M, p: [0, 3.12, 0] });
    b.add(roundBox(1.15, 0.45, 0.08, 0.04), '#2a1c14', { parent: M, p: [0, 2.33, 0.18] });
    b.add(roundBox(1.0, 0.33, 0.06, 0.03), '#c9a35a', { parent: M, p: [0, 2.33, 0.21] });
  },
  stall(b, M, pr) {
    const roof = pr.roof || '#9a2f2a';
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(roundBox(0.08, 1.25, 0.08, 0.03), '#5a3a22', { parent: M, p: [sx * 0.68, 0.62, sz * 0.32] });
    b.add(roundBox(1.5, 0.45, 0.6, 0.05), '#8a6a44', { parent: M, p: [0, 0.32, 0.05], shade: 0.25 });
    const goods = ['#c8402f', '#e8c46a', '#7aa94f', '#9fd0ff', '#e0644f'];
    goods.forEach((c, k) => b.add(sphere3(0.09, 10, 8), c, { parent: M, p: [-0.5 + k * 0.25, 0.62, 0.12 + (k % 2) * 0.1] }));
    for (let k = 0; k < 6; k++) {
      b.add(roundBox(0.29, 0.06, 0.92, 0.025), k % 2 ? roof : lighter(roof, 0.45), { parent: M, p: [-0.72 + k * 0.29, 1.3, 0.05], r: [0.28, 0, 0] });
    }
  },
  anvil(b, M) {
    b.add(lathe3('stump', [[0.22, 0], [0.2, 0.25], [0, 0.26]], 12), '#6b4a2e', { parent: M, shade: 0.3 });
    b.add(roundBox(0.5, 0.14, 0.2, 0.04), '#5a5e66', { parent: M, p: [0, 0.34, 0] });
    b.add(roundBox(0.22, 0.12, 0.14, 0.03), '#4a4e56', { parent: M, p: [0, 0.24, 0] });
    b.add(horn3(0.22, 0.07, 8), '#5a5e66', { parent: M, p: [0.25, 0.34, 0], r: [0, 0, -Math.PI / 2] });
  },
  board(b, M) {
    for (const sx of [-1, 1]) b.add(roundBox(0.09, 1.1, 0.09, 0.03), '#5a3a22', { parent: M, p: [sx * 0.45, 0.55, 0] });
    b.add(roundBox(1.05, 0.66, 0.07, 0.03), '#8a6a44', { parent: M, p: [0, 0.75, 0.03] });
    b.add(roofGeo(1.3, 0.35, 0.22, 0.08), '#7c3a2c', { parent: M, p: [0, 1.1, 0] });
    for (const [x, y, c] of [[-0.3, 0.88, '#efe6cc'], [0.02, 0.86, '#f3e2b0'], [0.3, 0.9, '#efe6cc'], [-0.18, 0.6, '#f3e2b0'], [0.15, 0.62, '#efe6cc']]) {
      b.add(roundBox(0.2, 0.24, 0.02, 0.008), c, { parent: M, p: [x, y, 0.08] });
    }
  },
  portal(b, M) {
    b.add(lathe3('portalbase', [[0.62, 0], [0.62, 0.08], [0.5, 0.12], [0, 0.12]], 18), '#7a746a', { parent: M });
    b.add(new THREE.CircleGeometry(0.46, 18).rotateX(-Math.PI / 2), '#9fd0ff', { parent: M, p: [0, 0.13, 0], mat: 'glow' });
    for (const sx of [-1, 1]) b.add(roundBox(0.18, 1.2, 0.18, 0.05), '#8a8478', { parent: M, p: [sx * 0.45, 0.6, 0] });
    b.add(roundBox(1.2, 0.18, 0.24, 0.06), '#6e685e', { parent: M, p: [0, 1.25, 0] });
    b.add(sphere3(0.2, 12, 10), '#bfe4ff', { parent: M, p: [0, 0.78, 0], mat: 'glow' });
  },
  brazier(b, M, pr) {
    const col = pr.roof || '#ff8a4a';
    b.add(roundBox(0.12, 0.5, 0.12, 0.04), '#4a4440', { parent: M, p: [0, 0.25, 0] });
    b.add(roundBox(0.42, 0.08, 0.42, 0.03), '#3a3430', { parent: M, p: [0, 0.04, 0] });
    b.add(lathe3('bowl', [[0.1, 0], [0.32, 0.12], [0.36, 0.2], [0.3, 0.21], [0.1, 0.1], [0, 0.1]], 14), '#5a544c', { parent: M, p: [0, 0.5, 0] });
    b.add(horn3(0.42, 0.2, 9), col, { parent: M, p: [0, 0.58, 0], mat: 'glow' });
    b.add(horn3(0.26, 0.12, 9), '#fff2c0', { parent: M, p: [0, 0.6, 0], mat: 'glow' });
  },
  horse(b, M) {
    if (typeof horseParts3 === 'function') horseParts3(b, null, { saddle: '#8a2a1a', parent: M });
  },
  hay(b, M) {
    for (const [x, y, z] of [[-0.3, 0.17, 0], [0.3, 0.17, 0], [0, 0.5, 0]]) {
      b.add(roundBox(0.55, 0.32, 0.38, 0.09), '#d8b45a', { parent: M, p: [x, y, z], shade: 0.2 });
      for (const dx of [-0.1, 0.1]) b.add(roundBox(0.03, 0.33, 0.39, 0.01), '#7a5a2a', { parent: M, p: [x + dx, y, z] });
    }
  },
  targets(b, M) {
    b.add(roundBox(0.08, 0.8, 0.08, 0.03), '#5a3a22', { parent: M, p: [0, 0.4, -0.05] });
    const disc = (r, c, z) => b.add(new THREE.CylinderGeometry(r, r, 0.06, 20).rotateX(Math.PI / 2), c, { parent: M, p: [0, 0.82, z] });
    disc(0.36, '#e8d8a8', 0);
    disc(0.25, '#c8402f', 0.01);
    disc(0.12, '#e8d8a8', 0.02);
    b.add(limb3(0.3, 0.012, 0.012, 4), '#6b4a2e', { parent: M, p: [0.1, 0.92, 0.05], r: [-1.1, 0, -0.6] });
  },
  herbs(b, M) {
    b.add(roundBox(0.9, 0.2, 0.4, 0.05), '#6b4a2e', { parent: M, p: [0, 0.1, 0] });
    for (let k = -2; k <= 2; k++) b.add(sphere3(0.11, 8, 6), k % 2 ? '#6a9a46' : '#8aa040', { parent: M, p: [k * 0.17, 0.26, 0], s: [1, 1.3, 1] });
  }
};

// Grasbüschel: drei weiche Halme
function tuft3(b, x, z, color, s, rot) {
  const M = placeAt(x, z, rot, s);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    b.add(lathe3('blade', [[0.04, 0], [0.024, 0.17], [0, 0.32]], 3), k === 1 ? lighter(color, 0.12) : color, { parent: M, p: [Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05], r: [Math.sin(a) * 0.35, 0, Math.cos(a) * 0.35], mat: 'grass', shade: 0.4 });
  }
}

const GRASS3 = {
  [GROUND.GRASS]: '#4f8a34', [GROUND.MEADOW]: '#62a040', [GROUND.FOREST]: '#2e5a2a', [GROUND.SWAMP]: '#4a5a34'
};
const FLOWER3 = { [DECO.FLOWER_RED]: '#e04a3a', [DECO.FLOWER_YELLOW]: '#f0c83a', [DECO.FLOWER_WHITE]: '#f4f0e8' };

// Ein Block mit allen Objekten
function buildObjectChunk(cx, cy) {
  const w = game.world;
  const b = new Bake3(false);
  const lowGfx = opts.graphics === 'niedrig';
  const x0 = cx * CHUNK3;
  const y0 = cy * CHUNK3;
  const x1 = Math.min(MAP_W, x0 + CHUNK3);
  const y1 = Math.min(MAP_H, y0 + CHUNK3);
  if (!towerTiles) towerTiles = new Set(w.props.filter((pr) => pr.type === 'tower').map((pr) => Math.floor(pr.y / TILE - 1) * MAP_W + Math.floor(pr.x / TILE)));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = y * MAP_W + x;
      const o = w.obj[i];
      const h = tileHash(x, y);
      const style = ZONES[w.zoneIdx[i]].id;
      const jx = ((h >> 5) % 5 - 2) * 0.05;
      const jz = ((h >> 9) % 5 - 2) * 0.05;
      const rot = ((h >> 3) % 628) / 100;
      const sc = 0.9 + ((h >> 12) % 20) / 100;
      if (o === OBJ.WALL) {
        if (!towerTiles.has(i)) WORLD3.wall(b, x + 0.5, y + 0.5, Math.abs(x - CENTER_X) === VILLAGE_HALF && Math.abs(y - CENTER_Y) !== VILLAGE_HALF);
        continue;
      }
      const kind = OBJ_KIND[o];
      if (kind) {
        const M = placeAt(x + 0.5 + jx, y + 0.55 + jz, rot, sc);
        if (kind === 'blossom') WORLD3.tree(b, M, h % 3, 'blossom');
        else WORLD3[kind](b, M, h % 3, style);
        continue;
      }
      if (o) continue;
      const g = w.ground[i];
      const d = w.deco[i];
      if (d === DECO.BRIDGE) {
        // Der Weg läuft waagerecht, wenn links oder rechts Weg oder Brücke liegt
        const way = (tx, ty) => groundAt(tx, ty) === GROUND.PATH || (w.deco[ty * MAP_W + tx] === DECO.BRIDGE);
        const horiz = way(x - 1, y) || way(x + 1, y);
        WORLD3.bridge(b, x + 0.5, y + 0.5, !horiz);
        continue;
      }
      if (FLOWER3[d] && !lowGfx) {
        const M = placeAt(x + 0.5 + jx * 3, y + 0.5 + jz * 3, rot, 1);
        b.add(limb3(0.22, 0.015, 0.015, 4), '#4a7a30', { parent: M, p: [0, 0.22, 0], mat: 'grass' });
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          b.add(sphere3(0.045, 6, 4), FLOWER3[d], { parent: M, p: [Math.cos(a) * 0.05, 0.24, Math.sin(a) * 0.05], mat: 'grass' });
        }
        b.add(sphere3(0.035, 6, 4), '#f0c83a', { parent: M, p: [0, 0.25, 0], mat: 'grass' });
        tuft3(b, x + 0.25, y + 0.75, GRASS3[g] || '#4f8a34', 0.8, rot);
        continue;
      }
      if (d === DECO.PEBBLE && !lowGfx) {
        const style2 = ZONES[w.zoneIdx[i]].id;
        const [base, top] = ROCK_STYLES[style2] || ROCK_STYLES.wiesen;
        b.add(rockGeo(h % 3), base, { parent: placeAt(x + 0.5 + jx * 4, y + 0.5 + jz * 4, rot, 1), s: [0.1, 0.07, 0.08], p: [0, 0.03, 0], top, topK: 0.5, mat: 'grass' });
        continue;
      }
      const grass = GRASS3[g];
      if (lowGfx) continue;
      if (grass && (d === DECO.TUFT || h % 4 === 0) && !LIQUID.has(g)) {
        tuft3(b, x + 0.5 + jx * 4, y + 0.5 + jz * 4, grass, 0.8 + ((h >> 14) % 6) / 10, rot);
        if (d === DECO.TUFT) tuft3(b, x + 0.2 + jz * 3, y + 0.3 + jx * 3, grass, 0.7, rot + 1);
      }
    }
  }
  for (const h of w.houses) {
    const hx = h.x + h.w / 2;
    const hy = h.y + h.h / 2;
    if (hx >= x0 && hx < x1 && hy >= y0 && hy < y1) WORLD3.house(b, h);
  }
  for (const pr of w.props) {
    const px = pr.x * U3;
    const py = pr.y * U3;
    if (px < x0 || px >= x1 || py < y0 || py >= y1) continue;
    const art = PROP3[pr.type];
    if (!art) continue;
    const back = pr.type === 'tower' || pr.type === 'gate' ? 0.5 : pr.type === 'stall' ? 0.45 : 0.25;
    art(b, placeAt(px, py - back), pr);
  }
  const parts = b.build();
  const group = new THREE.Group();
  if (parts.lit) {
    const m = new THREE.Mesh(parts.lit, worldLitMat());
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    if (!lowGfx) group.add(new THREE.Mesh(parts.lit, mat3('worldOutline', () => outlineMat(0.022, false))));
  }
  if (parts.glow) group.add(new THREE.Mesh(parts.glow, worldGlowMat()));
  if (parts.glowWin) group.add(new THREE.Mesh(parts.glowWin, mat3('worldWin', () => toonMat({ emissive: 0x6a4a20 }))));
  if (parts.grass) {
    const m = new THREE.Mesh(parts.grass, worldGrassMat());
    m.receiveShadow = true;
    group.add(m);
  }
  if (parts.aura) group.add(new THREE.Mesh(parts.aura, worldAuraMat()));
  return group;
}

// Lichtquellen der Welt (einmal gesammelt): Laternen, Feuerbecken, Tore, Portale
function v3CollectLights() {
  if (lightSpots3.length || !game.world) return;
  const w = game.world;
  for (const pr of w.props) {
    const x = pr.x * U3;
    const z = pr.y * U3 - 0.25;
    if (pr.type === 'lantern') lightSpots3.push({ x, y: 1.0, z, color: '#ffb860', power: 1.1, range: 6.5, flicker: 2 });
    if (pr.type === 'brazier') lightSpots3.push({ x, y: 1.1, z, color: pr.roof || '#ff8a4a', power: 1.8, range: 9, flicker: 9 });
  }
  for (const n of w.npcs) {
    if (n.id === 'weltentor') lightSpots3.push({ x: n.x * U3, y: 1.2, z: n.y * U3, color: '#7ab8ff', power: 1.4, range: 7 });
    if (n.id === 'eingang' || n.id === 'ausgang') lightSpots3.push({ x: n.x * U3, y: 1.0, z: n.y * U3, color: DUNGEONS[n.dungeon].portal, power: 1.4, range: 7 });
  }
}
