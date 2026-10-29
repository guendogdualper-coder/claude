// 3D-Welt: Bäume, Felsen, Häuser, Dorfmauer, Türme, Tore, Dorfschmuck, Brücken, Gras und Blumen.
// Je Block (16 × 16 Kacheln) wird alles zu wenigen Meshes zusammengebacken: ein beleuchtetes mit
// Umriss, eines für leuchtende Teile (Laternen, Glut, Feuer) und eines für Gras ohne Umriss.
// Dicht bebaute Blöcke bekommen diese Meshes je Viertel (siehe objectJob).
// Alle Formen sind weich abgerundet; Farben kommen aus denselben Tabellen wie im 2D-Spiel.

const WALL3_ROOF = '#3e4656';
const FROST_ROCK3 = '#3e4a5c';

function worldLitMat() {
  return mat3('worldLit', () => addFade(toonMat(), 0.45));
}
function worldGlowMat() {
  return mat3('worldGlow', () => new THREE.MeshBasicMaterial({ vertexColors: true }));
}
// Gras, Klee, Blumen und kleiner Schmuck ohne Umriss. Seit 7.9 mit Wind: eine langsame Welle zieht
// über die Wiese. Gras steht auf y ≈ 0, die Höhe darüber gibt den Ausschlag (Spitzen weit, Fuß fest),
// dazu ein kleines Flattern, damit nicht alles im Gleichschritt geht. Die Zeit setzt renderDrei.
function worldGrassMat() {
  return mat3('worldGrass', () => {
    const m = toonMat();
    m.userData.uTime = { value: 0 };
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = m.userData.uTime;
      sh.vertexShader = sh.vertexShader
        .replace('void main() {', 'uniform float uTime;\nvoid main() {')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
	vec4 wW = modelMatrix * vec4(transformed, 1.0);
	float bend = clamp(wW.y, 0.0, 0.55) * 2.5;
	bend *= bend;
	float ph = dot(wW.xz, vec2(0.38, 0.22)) - uTime * 1.1;
	float sway = sin(ph) * 0.65 + sin(ph * 2.7 + wW.x * 1.9 + wW.z * 1.3) * 0.25 + 0.3;
	transformed.xz += vec2(0.06, 0.035) * sway * bend;
	transformed.y -= 0.015 * sway * sway * bend;`);
    };
    m.customProgramCacheKey = () => 'grasswind';
    return m;
  });
}
function worldAuraMat() {
  return mat3('worldAura', () => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
}

// Matrix für ein Objekt an (x, z) mit Drehung um die Hochachse und Größe
function placeAt(x, z, rotY = 0, s = 1, y = 0) {
  _q.setFromEuler(_e.set(0, rotY, 0));
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.clone(), new THREE.Vector3(s, s, s));
}

// Abgerundeter Quader für die Welt: aus der Entfernung reicht eine gröbere Rundung als bei Figuren
const wbox = (w, h, d, r) => roundBox(w, h, d, r, r < 0.09 ? 1 : 2);
// Winzige Leisten, Zinnen und Sprossen: einfacher Quader, die Rundung wäre kleiner als ein Pixel
const tinyBox = (w, h, d) => geo3(`tb${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));

// Rundlicher Felsbrocken: Ikosaeder, mit Rauschen verbeult und glatt schattiert
// (detail 0: Kiesel mit 20 statt 80 Dreiecken, so klein sieht man keine Kanten)
function rockGeo(v, detail = 1) {
  return geo3('rock' + v + (detail ? '' : 'k'), () => {
    const g = smoothGeo(new THREE.IcosahedronGeometry(1, detail));
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
    b.add(lathe3('trunk', [[0.3, 0], [0.19, 0.14], [0.15, 0.7], [0.12, 1.3], [0, 1.34]], 8), bark, { parent: M, shade: 0.35 });
    b.add(limb3(0.6, 0.07, 0.05, 5), bark, { parent: M, p: [0.08, 1.0, 0], r: [0, 0, 2.2] });
    const blossom = style === 'blossom';
    const cols = blossom ? ['#d07896', '#e08aa6', '#f5b8cb'] : style === 'nagadschungel' ? ['#2e5a2a', '#3d7633', '#5a9a46'] : ['#2f6229', '#3d7633', '#5a9a46'];
    // Kronenkugeln: die oberen sieht man ganz, die unteren stecken halb in der Krone
    TREE_BLOBS[v].forEach(([x, y, r], k) => {
      const top = y < -36;
      b.add(top ? sphere3(1, 10, 7) : sphere3(1, 9, 6), top ? cols[2] : k % 2 ? cols[1] : cols[0], {
        parent: M, p: [x / 32 * 1.1, -y / 32 * 1.1 + 0.25, ((k * 37) % 7 - 3) * 0.09], s: (r / 32) * 1.35, shade: 0.35
      });
    });
    if (blossom) for (const [x, y, z] of [[-0.4, 1.9, 0.5], [0.3, 1.6, 0.6], [0.5, 2.2, 0.2], [-0.2, 2.4, 0.3]]) b.add(sphere3(0.07, 5, 4), '#ffffff', { parent: M, p: [x, y, z] });
  },

  pine(b, M, v, style) {
    const snowy = style === 'frost';
    b.add(lathe3('pinetrunk', [[0.18, 0], [0.13, 0.1], [0.1, 0.7], [0, 0.72]], 7), '#5a3f2a', { parent: M, shade: 0.3 });
    const tiers = 4 + (v === 2 ? 1 : 0);
    for (let k = 0; k < tiers; k++) {
      const r = (0.85 - k * (0.62 / tiers)) * (v === 1 ? 0.9 : 1);
      const y = 0.35 + k * 0.42;
      const g = lathe3(`pinetier${r.toFixed(2)}`, [[0, -0.04], [r * 0.6, -0.02], [r, 0.06], [r * 0.95, 0.14], [r * 0.45, 0.48], [r * 0.12, 0.66], [0, 0.7]], 10);
      b.add(g, snowy ? '#2a4a48' : k % 2 ? '#2a5c48' : '#245242', { parent: M, p: [0, y, 0], r: [0, k * 0.7, 0], shade: 0.4 });
      if (snowy) b.add(lathe3(`pinesnow${r.toFixed(2)}`, [[0, 0.18], [r * 0.62, 0.2], [r * 0.5, 0.32], [r * 0.2, 0.55], [0, 0.71]], 10), '#f4f8fc', { parent: M, p: [0, y, 0] });
    }
  },

  dead(b, M, v, style) {
    const bark = style === 'vulkan' || style === 'titanenkamm' ? '#2a1e1a' : style === 'moor' ? '#3a3a2a' : '#4a3527';
    const m = v === 1 ? -1 : 1;
    b.add(lathe3('deadtrunk', [[0.24, 0], [0.15, 0.12], [0.1, 0.8], [0.05, 1.35], [0, 1.4]], 7), bark, { parent: M, shade: 0.3, r: [0, 0, 0.05 * m] });
    const br = [[0.5, 0.06, 0.04, [0, 0.5, 0], [0, 0, -1.0 * m]], [0.42, 0.05, 0.03, [0, 0.75, 0], [0, 0, 0.9 * m]], [0.36, 0.04, 0.025, [0, 1.0, 0], [0.4, 0, -0.5 * m]]];
    if (v === 2) br.push([0.3, 0.04, 0.025, [0, 0.3, 0], [0, 0, 1.1]]);
    for (const [len, r1, r2, p, r] of br) b.add(limb3(len, r1, r2, 5), bark, { parent: M, p, r: [r[0] + Math.PI, r[1], r[2]] });
    if (style === 'moor') for (const [x, y] of [[0.35 * m, 0.7], [-0.3 * m, 0.95]]) b.add(limb3(0.28, 0.04, 0.02, 5), '#5a7a4a', { parent: M, p: [x, y, 0.05] });
    if (style === 'vulkan' || style === 'titanenkamm') b.add(limb3(0.4, 0.035, 0.02, 5), '#ff7a2a', { parent: M, p: [0.02, 0.85, 0.12], mat: 'glow' });
  },

  rock(b, M, v, style) {
    const [grey, top, moss] = ROCK_STYLES[style] || ROCK_STYLES.wiesen;
    // Frost: im hellen Schneelicht wirkt das 2D-Grau weiß, darum dunkler blaugrau (Schnee liegt obenauf)
    const base = style === 'frost' ? FROST_ROCK3 : grey;
    const s = [1, 0.85, 1.15][v];
    const frost = style === 'frost';
    b.add(rockGeo(v), base, { parent: M, s: [0.48 * s, 0.5 * s, 0.42 * s], p: [0, 0.12, 0], top: moss || top, topK: moss ? 0.8 : frost ? 0.3 : 0.6, shade: 0.45 });
    // Frost (seit 8.4): blaugrauer Fels mit eigener Schneehaube und Schnee am Fuß statt einer weißen Kugel
    if (frost) {
      const rg = rockGeo(v);
      if (!rg.boundingBox) rg.computeBoundingBox();
      b.add(foliageGeo(v, 2), '#c8d8ea', { parent: M, p: [0.04, 0.07 + rg.boundingBox.max.y * 0.5 * s, -0.07], s: [0.32 * s, 0.13 * s, 0.26 * s], top: '#f4f8fc', topK: 1, ao: 0.3 });
      b.add(cap3(1, Math.PI / 2, 0, Math.PI * 2, 10, 3), '#eef4fa', { parent: M, p: [0.1, -0.012, 0.12], s: [0.5 * s, 0.07, 0.4 * s], ao: 0, mat: 'detail' });
    }
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
    b.add(wbox(W - 0.2, 0.3, D - 0.35, 0.08), '#8a8478', { parent: M, p: [0, 0.15, 0], shade: 0.3 });
    b.add(wbox(wallW, wh, wallD, 0.06), '#e2d0aa', { parent: M, p: [0, 0.3 + wh / 2, 0], shade: 0.18 });
    const posts = Math.max(3, W + 1);
    for (let k = 0; k < posts; k++) {
      const x = -wallW / 2 + (wallW * k) / (posts - 1);
      for (const z of [-wallD / 2, wallD / 2]) b.add(wbox(0.14, wh + 0.05, 0.14, 0.04), timber, { parent: M, p: [x, 0.3 + wh / 2, z] });
    }
    for (const x of [-wallW / 2, wallW / 2]) b.add(wbox(0.14, wh + 0.05, 0.14, 0.04), timber, { parent: M, p: [x, 0.3 + wh / 2, 0] });
    b.add(wbox(wallW + 0.1, 0.13, wallD + 0.1, 0.04), timber, { parent: M, p: [0, 0.3 + wh - 0.02, 0] });
    b.add(wbox(wallW + 0.1, 0.1, wallD + 0.1, 0.03), timber, { parent: M, p: [0, 0.36, 0] });
    // Tür und Fenster an der Vorderseite (Süden)
    b.add(wbox(0.62, 1.05, 0.08, 0.03), '#4a2e1c', { parent: M, p: [0, 0.3 + 0.53, wallD / 2 + 0.03] });
    b.add(wbox(0.24, 0.92, 0.06, 0.02), '#6b4a2e', { parent: M, p: [-0.15, 0.3 + 0.5, wallD / 2 + 0.07] });
    b.add(wbox(0.24, 0.92, 0.06, 0.02), '#6b4a2e', { parent: M, p: [0.15, 0.3 + 0.5, wallD / 2 + 0.07] });
    for (let k = 0; k < posts - 1; k++) {
      const xa = -wallW / 2 + (wallW * k) / (posts - 1);
      const xb = -wallW / 2 + (wallW * (k + 1)) / (posts - 1);
      const mid = (xa + xb) / 2;
      if (Math.abs(mid) < 0.5) continue;
      const ww = Math.min(0.7, xb - xa - 0.28);
      b.add(tinyBox(ww, 0.45, 0.06), '#f3e2b0', { parent: M, p: [mid, 0.3 + wh * 0.62, wallD / 2 + 0.03], mat: 'glowWin' });
      for (let gx = -1; gx <= 1; gx++) b.add(tinyBox(0.025, 0.45, 0.07), '#8a6a44', { parent: M, p: [mid + gx * ww / 4, 0.3 + wh * 0.62, wallD / 2 + 0.04] });
      b.add(tinyBox(ww, 0.025, 0.07), '#8a6a44', { parent: M, p: [mid, 0.3 + wh * 0.62, wallD / 2 + 0.04] });
    }
    // Dach mit Überstand, hochgezogenen Ecken, First und Zierenden
    const ry = 0.3 + wh;
    b.add(roofGeo(W + 0.9, D + 0.8, 1.35, 0.42), h.roof, { parent: M, p: [0, ry - 0.06, 0], shade: 0.25, top: lighter(h.roof, 0.18), topK: 0.6 });
    b.add(wbox(Math.max(0.6, W - D + 0.6), 0.16, 0.2, 0.07), darker(h.roof, 0.4), { parent: M, p: [0, ry + 1.25, 0] });
    for (const sx of [-1, 1]) b.add(horn3(0.32, 0.07, 8), darker(h.roof, 0.4), { parent: M, p: [sx * Math.max(0.3, (W - D) / 2 + 0.3), ry + 1.25, 0], r: [0, 0, -sx * 0.7] });
    // Rote Laternen an den vorderen Ecken
    for (const sx of [-1, 1]) {
      const p = [sx * (W / 2 - 0.05), ry - 0.25, D / 2 - 0.05];
      b.add(limb3(0.12, 0.012, 0.012, 4), '#2a1c14', { parent: M, p: [p[0], p[1] + 0.14, p[2]] });
      b.add(sphere3(0.12, 8, 6), '#ff6a3a', { parent: M, p, s: [1, 1.25, 1], mat: 'glow' });
      b.add(tinyBox(0.18, 0.04, 0.18), '#c9a35a', { parent: M, p: [p[0], p[1] + 0.14, p[2]] });
      b.add(tinyBox(0.18, 0.04, 0.18), '#c9a35a', { parent: M, p: [p[0], p[1] - 0.14, p[2]] });
    }
  },

  // Dorfmauer je Kachel: Steinsockel, Putzwand mit Balken, kleines Ziegeldach obenauf
  wall(b, x, z, vertical) {
    const M = placeAt(x, z, vertical ? Math.PI / 2 : 0);
    b.add(wbox(1.06, 0.4, 0.62, 0.08), '#7a746a', { parent: M, p: [0, 0.2, 0], shade: 0.3 });
    b.add(wbox(1.06, 0.92, 0.42, 0.05), '#dccaa4', { parent: M, p: [0, 0.82, 0], shade: 0.15 });
    b.add(wbox(1.12, 0.16, 0.72, 0.06), WALL3_ROOF, { parent: M, p: [0, 1.32, 0], top: lighter(WALL3_ROOF, 0.15), topK: 0.5 });
  },

  bridge(b, x, z, vertical) {
    const M = placeAt(x, z, vertical ? Math.PI / 2 : 0);
    b.add(wbox(1.06, 0.12, 1.1, 0.04), '#8a6440', { parent: M, p: [0, 0.02, 0], shade: 0.3 });
    for (let k = -2; k <= 2; k++) b.add(tinyBox(0.03, 0.13, 1.08), '#5a3f26', { parent: M, p: [k * 0.21, 0.025, 0] });
    for (const sz of [-1, 1]) {
      b.add(wbox(1.06, 0.07, 0.07, 0.03), '#6b4a2e', { parent: M, p: [0, 0.42, sz * 0.52] });
      b.add(wbox(0.08, 0.42, 0.08, 0.03), '#5a3a22', { parent: M, p: [0.45, 0.22, sz * 0.52] });
    }
  }
};

// Dorfschmuck und Bauten aus game.world.props
const PROP3 = {
  well(b, M) {
    b.add(lathe3('wellring', [[0.4, 0], [0.48, 0.02], [0.5, 0.3], [0.48, 0.42], [0.42, 0.44], [0.36, 0.4], [0.36, 0.1]], 18), '#8a8276', { parent: M, shade: 0.3 });
    b.add(new THREE.CircleGeometry(0.37, 18).rotateX(-Math.PI / 2), '#3a7aa0', { parent: M, p: [0, 0.3, 0] });
    for (const sx of [-1, 1]) b.add(wbox(0.1, 1.1, 0.1, 0.03), '#5a3a22', { parent: M, p: [sx * 0.42, 0.6, 0] });
    b.add(limb3(0.95, 0.04, 0.04, 6), '#6b4a2e', { parent: M, p: [-0.47, 1.0, 0], r: [0, 0, Math.PI / 2] });
    b.add(roofGeo(1.25, 0.8, 0.42, 0.18), '#7c3a2c', { parent: M, p: [0, 1.1, 0], shade: 0.2 });
    b.add(lathe3('bucket', [[0.08, 0], [0.1, 0.16], [0, 0.17]], 10), '#6b4a2e', { parent: M, p: [0, 0.6, 0] });
  },
  lantern(b, M) {
    b.add(wbox(0.42, 0.16, 0.42, 0.05), '#8a8478', { parent: M, p: [0, 0.08, 0], shade: 0.2 });
    b.add(wbox(0.18, 0.55, 0.18, 0.05), '#9a9488', { parent: M, p: [0, 0.43, 0] });
    b.add(wbox(0.42, 0.1, 0.42, 0.04), '#8a8478', { parent: M, p: [0, 0.74, 0] });
    b.add(wbox(0.28, 0.26, 0.28, 0.05), '#ffd27a', { parent: M, p: [0, 0.92, 0], mat: 'glow' });
    b.add(roofGeo(0.62, 0.62, 0.3, 0.1), '#7a746a', { parent: M, p: [0, 1.04, 0] });
    b.add(sphere3(0.06, 8, 6), '#7a746a', { parent: M, p: [0, 1.36, 0] });
  },
  barrel(b, M) {
    b.add(lathe3('barrel', [[0, 0], [0.2, 0], [0.24, 0.12], [0.26, 0.27], [0.24, 0.42], [0.2, 0.54], [0, 0.54]], 14), '#8a5a34', { parent: M, shade: 0.25 });
    for (const y of [0.12, 0.42]) b.add(new THREE.TorusGeometry(0.245, 0.018, 4, 14).rotateX(Math.PI / 2), '#3a2a1c', { parent: M, p: [0, y, 0] });
  },
  crate(b, M) {
    b.add(wbox(0.5, 0.46, 0.5, 0.05), '#a07a4a', { parent: M, p: [0, 0.23, 0], shade: 0.25 });
    for (const y of [0.1, 0.36]) b.add(tinyBox(0.52, 0.04, 0.52), '#5a3f26', { parent: M, p: [0, y, 0] });
  },
  tower(b, M) {
    b.add(wbox(1.25, 0.45, 1.25, 0.1), '#6e685e', { parent: M, p: [0, 0.22, 0], shade: 0.3 });
    b.add(wbox(1.02, 1.5, 1.02, 0.06), '#dccaa4', { parent: M, p: [0, 1.18, 0], shade: 0.15 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(wbox(0.13, 1.52, 0.13, 0.04), '#5a3a22', { parent: M, p: [sx * 0.5, 1.18, sz * 0.5] });
    b.add(wbox(1.06, 0.1, 1.06, 0.03), '#5a3a22', { parent: M, p: [0, 1.3, 0] });
    b.add(wbox(0.32, 0.45, 0.06, 0.03), '#3a2a1c', { parent: M, p: [0, 1.1, 0.52] });
    b.add(wbox(1.45, 0.16, 1.45, 0.05), '#6b4a2e', { parent: M, p: [0, 2.0, 0] });
    for (let k = 0; k < 4; k++) {
      for (let j = -2; j <= 2; j++) {
        const a = (k * Math.PI) / 2;
        b.add(tinyBox(0.05, 0.24, 0.05), '#5a3a22', { parent: M, p: [Math.cos(a) * 0.68 - Math.sin(a) * j * 0.3, 2.2, Math.sin(a) * 0.68 + Math.cos(a) * j * 0.3] });
      }
    }
    b.add(roofGeo(1.9, 1.9, 0.85, 0.32), '#7c3a2c', { parent: M, p: [0, 2.3, 0], shade: 0.2, top: lighter('#7c3a2c', 0.15), topK: 0.6 });
    b.add(sphere3(0.09, 8, 6), '#c9a35a', { parent: M, p: [0, 3.2, 0] });
    for (const sx of [-1, 1]) b.add(sphere3(0.1, 8, 6), '#ff6a3a', { parent: M, p: [sx * 0.78, 2.05, 0.78], s: [1, 1.3, 1], mat: 'glow' });
  },
  gate(b, M) {
    for (const sx of [-1, 1]) {
      b.add(wbox(0.26, 2.45, 0.26, 0.07), '#9a2f2a', { parent: M, p: [sx * 1.88, 1.22, 0], shade: 0.25 });
      b.add(wbox(0.4, 0.2, 0.4, 0.06), '#6e685e', { parent: M, p: [sx * 1.88, 0.1, 0] });
    }
    b.add(wbox(4.4, 0.22, 0.32, 0.08), '#9a2f2a', { parent: M, p: [0, 2.5, 0] });
    b.add(wbox(4.0, 0.16, 0.24, 0.06), '#7a2420', { parent: M, p: [0, 2.15, 0] });
    b.add(roofGeo(5.2, 0.95, 0.55, 0.3), WALL3_ROOF, { parent: M, p: [0, 2.6, 0], shade: 0.2, top: lighter(WALL3_ROOF, 0.15), topK: 0.6 });
    b.add(wbox(3.3, 0.14, 0.18, 0.06), darker(WALL3_ROOF, 0.35), { parent: M, p: [0, 3.12, 0] });
    b.add(wbox(1.15, 0.45, 0.08, 0.04), '#2a1c14', { parent: M, p: [0, 2.33, 0.18] });
    b.add(wbox(1.0, 0.33, 0.06, 0.03), '#c9a35a', { parent: M, p: [0, 2.33, 0.21] });
  },
  stall(b, M, pr) {
    const roof = pr.roof || '#9a2f2a';
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(wbox(0.08, 1.25, 0.08, 0.03), '#5a3a22', { parent: M, p: [sx * 0.68, 0.62, sz * 0.32] });
    b.add(wbox(1.5, 0.45, 0.6, 0.05), '#8a6a44', { parent: M, p: [0, 0.32, 0.05], shade: 0.25 });
    const goods = ['#c8402f', '#e8c46a', '#7aa94f', '#9fd0ff', '#e0644f'];
    goods.forEach((c, k) => b.add(sphere3(0.09, 8, 6), c, { parent: M, p: [-0.5 + k * 0.25, 0.62, 0.12 + (k % 2) * 0.1] }));
    for (let k = 0; k < 6; k++) {
      b.add(tinyBox(0.29, 0.06, 0.92), k % 2 ? roof : lighter(roof, 0.45), { parent: M, p: [-0.72 + k * 0.29, 1.3, 0.05], r: [0.28, 0, 0] });
    }
  },
  anvil(b, M) {
    b.add(lathe3('stump', [[0.22, 0], [0.2, 0.25], [0, 0.26]], 12), '#6b4a2e', { parent: M, shade: 0.3 });
    b.add(wbox(0.5, 0.14, 0.2, 0.04), '#5a5e66', { parent: M, p: [0, 0.34, 0] });
    b.add(wbox(0.22, 0.12, 0.14, 0.03), '#4a4e56', { parent: M, p: [0, 0.24, 0] });
    b.add(horn3(0.22, 0.07, 8), '#5a5e66', { parent: M, p: [0.25, 0.34, 0], r: [0, 0, -Math.PI / 2] });
  },
  board(b, M) {
    for (const sx of [-1, 1]) b.add(wbox(0.09, 1.1, 0.09, 0.03), '#5a3a22', { parent: M, p: [sx * 0.45, 0.55, 0] });
    b.add(wbox(1.05, 0.66, 0.07, 0.03), '#8a6a44', { parent: M, p: [0, 0.75, 0.03] });
    b.add(roofGeo(1.3, 0.35, 0.22, 0.08), '#7c3a2c', { parent: M, p: [0, 1.1, 0] });
    for (const [x, y, c] of [[-0.3, 0.88, '#efe6cc'], [0.02, 0.86, '#f3e2b0'], [0.3, 0.9, '#efe6cc'], [-0.18, 0.6, '#f3e2b0'], [0.15, 0.62, '#efe6cc']]) {
      b.add(tinyBox(0.2, 0.24, 0.02), c, { parent: M, p: [x, y, 0.08] });
    }
  },
  portal(b, M) {
    b.add(lathe3('portalbase', [[0.62, 0], [0.62, 0.08], [0.5, 0.12], [0, 0.12]], 18), '#7a746a', { parent: M });
    b.add(new THREE.CircleGeometry(0.46, 18).rotateX(-Math.PI / 2), '#9fd0ff', { parent: M, p: [0, 0.13, 0], mat: 'glow' });
    for (const sx of [-1, 1]) b.add(wbox(0.18, 1.2, 0.18, 0.05), '#8a8478', { parent: M, p: [sx * 0.45, 0.6, 0] });
    b.add(wbox(1.2, 0.18, 0.24, 0.06), '#6e685e', { parent: M, p: [0, 1.25, 0] });
    b.add(sphere3(0.2, 12, 10), '#bfe4ff', { parent: M, p: [0, 0.78, 0], mat: 'glow' });
  },
  brazier(b, M, pr) {
    const col = pr.roof || '#ff8a4a';
    b.add(wbox(0.12, 0.5, 0.12, 0.04), '#4a4440', { parent: M, p: [0, 0.25, 0] });
    b.add(wbox(0.42, 0.08, 0.42, 0.03), '#3a3430', { parent: M, p: [0, 0.04, 0] });
    b.add(lathe3('bowl', [[0.1, 0], [0.32, 0.12], [0.36, 0.2], [0.3, 0.21], [0.1, 0.1], [0, 0.1]], 14), '#5a544c', { parent: M, p: [0, 0.5, 0] });
    b.add(horn3(0.42, 0.2, 9), col, { parent: M, p: [0, 0.58, 0], mat: 'glow' });
    b.add(horn3(0.26, 0.12, 9), '#fff2c0', { parent: M, p: [0, 0.6, 0], mat: 'glow' });
  },
  horse(b, M) {
    if (typeof horseParts3 === 'function') horseParts3(b, null, { saddle: '#8a2a1a', parent: M });
  },
  hay(b, M) {
    for (const [x, y, z] of [[-0.3, 0.17, 0], [0.3, 0.17, 0], [0, 0.5, 0]]) {
      b.add(wbox(0.55, 0.32, 0.38, 0.09), '#d8b45a', { parent: M, p: [x, y, z], shade: 0.2 });
      for (const dx of [-0.1, 0.1]) b.add(tinyBox(0.03, 0.33, 0.39), '#7a5a2a', { parent: M, p: [x + dx, y, z] });
    }
  },
  targets(b, M) {
    b.add(wbox(0.08, 0.8, 0.08, 0.03), '#5a3a22', { parent: M, p: [0, 0.4, -0.05] });
    const disc = (r, c, z) => b.add(new THREE.CylinderGeometry(r, r, 0.06, 16).rotateX(Math.PI / 2), c, { parent: M, p: [0, 0.82, z] });
    disc(0.36, '#e8d8a8', 0);
    disc(0.25, '#c8402f', 0.01);
    disc(0.12, '#e8d8a8', 0.02);
    b.add(limb3(0.3, 0.012, 0.012, 4), '#6b4a2e', { parent: M, p: [0.1, 0.92, 0.05], r: [-1.1, 0, -0.6] });
  },
  herbs(b, M) {
    b.add(wbox(0.9, 0.2, 0.4, 0.05), '#6b4a2e', { parent: M, p: [0, 0.1, 0] });
    for (let k = -2; k <= 2; k++) b.add(sphere3(0.11, 8, 6), k % 2 ? '#6a9a46' : '#8aa040', { parent: M, p: [k * 0.17, 0.26, 0], s: [1, 1.3, 1] });
  }
};

// --- Gras, Klee und Blumen (seit 7.9) -------------------------------------------------------------
// Flache Halme und Blätter mit Farbverlauf in den Ecken: am Fuß dunkel, an der Spitze hell. Die Normalen
// zeigen nach oben, so wird Gras wie der Boden beleuchtet. Halme sind von beiden Seiten sichtbar,
// Blätter und Blüten nur von oben (dorthin schaut die Kamera immer). Den Wind rechnet worldGrassMat.
function flatGeo(key, make) {
  return geo3('flat' + key, () => {
    const pos = [];
    const col = [];
    const idx = [];
    const B = {
      v(x, y, z, c) {
        pos.push(x, y, z);
        col.push(c.r, c.g, c.b);
        return pos.length / 3 - 1;
      },
      both(a, b, c) {
        idx.push(a, b, c, a, c, b);
      },
      // Dreieck mit der Vorderseite nach oben
      up(a, b, c) {
        const ny = (pos[b * 3 + 2] - pos[a * 3 + 2]) * (pos[c * 3] - pos[a * 3]) - (pos[b * 3] - pos[a * 3]) * (pos[c * 3 + 2] - pos[a * 3 + 2]);
        if (ny > 0) idx.push(a, b, c);
        else idx.push(a, c, b);
      }
    };
    make(B);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const nor = new Float32Array(pos.length);
    for (let i = 1; i < nor.length; i += 3) nor[i] = 1;
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setIndex(idx);
    return g;
  });
}

// Farbverlauf eines Halms: Fuß dunkel und kühl, Mitte in der Grasfarbe, Spitze hell und gelblich
const _gTip = new THREE.Color('#e4f0a0');
const _gFoot = new THREE.Color('#1e3a2a');
function grassShades(hex) {
  const mid = new THREE.Color(hex);
  return { foot: mid.clone().multiplyScalar(0.5).lerp(_gFoot, 0.25), mid, tip: mid.clone().lerp(_gTip, 0.32) };
}

// Ein Halm: zwei Ecken am Fuß, zwei in der Mitte, die Spitze; nach außen (Winkel a) gebogen
function blade3(B, x, z, a, h, w, lean, c) {
  const rx = Math.cos(a);
  const rz = Math.sin(a);
  const mx = x + rx * lean * 0.4;
  const mz = z + rz * lean * 0.4;
  const v0 = B.v(x + rz * w, 0, z - rx * w, c.foot);
  const v1 = B.v(x - rz * w, 0, z + rx * w, c.foot);
  const v2 = B.v(mx + rz * w * 0.7, h * 0.5, mz - rx * w * 0.7, c.mid);
  const v3 = B.v(mx - rz * w * 0.7, h * 0.5, mz + rx * w * 0.7, c.mid);
  const v4 = B.v(x + rx * lean, h, z + rz * lean, c.tip);
  B.both(v0, v1, v3);
  B.both(v0, v3, v2);
  B.both(v2, v3, v4);
}

// Büschelformen: 'short' fünf kurze Halme, 'tall' lange Halme mit kurzen dazwischen, 'clover' drei Kleeblätter
function tuftGeo(color, form) {
  return flatGeo(`tuft${color}${form}`, (B) => {
    const c = grassShades(color);
    if (form === 'clover') {
      // Herzförmige Blätter als Fächer vom Stiel aus, leicht nach außen gewölbt
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + 0.3;
        const s = B.v(Math.cos(a) * 0.015, 0.05, Math.sin(a) * 0.015, c.foot);
        const rim = [[-1.25, 0.05], [-0.6, 0.092], [0, 0.07], [0.6, 0.092], [1.25, 0.05]].map(([da, r], j) =>
          B.v(Math.cos(a + da * 0.55) * r + Math.cos(a) * 0.015, 0.08 + (j % 2) * 0.012, Math.sin(a + da * 0.55) * r + Math.sin(a) * 0.015, j % 2 ? c.tip : c.mid));
        for (let j = 0; j < 4; j++) B.up(s, rim[j], rim[j + 1]);
      }
      return;
    }
    const tall = form === 'tall';
    const n = tall ? 6 : 5;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + (k % 2) * 0.4;
      const long = tall && k % 2 === 0;
      const h = long ? 0.46 + (k % 3) * 0.05 : 0.24 + ((k * 7) % 5) * 0.035;
      blade3(B, Math.cos(a) * 0.04, Math.sin(a) * 0.04, a, h, long ? 0.026 : 0.034, h * 0.4, c);
    }
  });
}

// Blume: dünner Stiel, fünf runde Blütenblätter (je ein Fächer), gelbe Mitte
const _fStem = grassShades('#4a7a30');
const _fGold = new THREE.Color('#f0c83a');
function flowerGeo(color) {
  return flatGeo('flower' + color, (B) => {
    blade3(B, 0, 0, 0.6, 0.25, 0.012, 0.04, _fStem);
    const hx = Math.cos(0.6) * 0.04;
    const hz = Math.sin(0.6) * 0.04;
    const outer = new THREE.Color(color);
    const inner = outer.clone().multiplyScalar(0.78);
    const cv = B.v(hx, 0.245, hz, inner);
    const rim = [];
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      for (const [da, r] of [[-0.45, 0.07], [-0.2, 0.095], [0.2, 0.095], [0.45, 0.07]]) {
        rim.push(B.v(hx + Math.cos(a + da) * r, 0.272, hz + Math.sin(a + da) * r, outer));
      }
      rim.push(B.v(hx + Math.cos(a + 0.63) * 0.03, 0.252, hz + Math.sin(a + 0.63) * 0.03, inner));
    }
    for (let k = 0; k < rim.length; k++) B.up(cv, rim[k], rim[(k + 1) % rim.length]);
    const gv = B.v(hx, 0.28, hz, _fGold);
    const ring = [0, 1, 2, 3].map((k) => B.v(hx + Math.cos(k * 1.571) * 0.027, 0.262, hz + Math.sin(k * 1.571) * 0.027, inner.clone().lerp(_fGold, 0.6)));
    for (let k = 0; k < 4; k++) B.up(gv, ring[k], ring[(k + 1) % 4]);
  });
}

// Grasfarbe je Boden; auf Wegen vereinzelt trockene Büschel. Seit 8.4 auch bereifte Halme im Schnee,
// dürres Wüstengras auf Sand und totes graues Gras auf Asche, jeweils nur jede n-te Kachel (GRASS3_SPARSE)
const GRASS3 = {
  [GROUND.GRASS]: '#4f8a34', [GROUND.MEADOW]: '#62a040', [GROUND.FOREST]: '#2e5a2a', [GROUND.SWAMP]: '#4a5a34', [GROUND.PATH]: '#7a8a3e',
  [GROUND.SNOW]: '#9aa88a', [GROUND.SAND]: '#a89a5a', [GROUND.ASH]: '#6a645a'
};
const GRASS3_SPARSE = { [GROUND.SNOW]: 9, [GROUND.SAND]: 12, [GROUND.ASH]: 14 };
const CLOVER3 = '#3a8048';
const FLOWER3 = { [DECO.FLOWER_RED]: '#e04a3a', [DECO.FLOWER_YELLOW]: '#f0c83a', [DECO.FLOWER_WHITE]: '#f4f0e8' };

// Vorlagen der häufigen Objekte: einmal gebacken, danach nur noch verschoben und gedreht
const tplTree = (kind, v, style) => bakeTemplate(`${kind}:${v}:${style}`, (b) => {
  if (kind === 'blossom') WORLD3.tree(b, null, v, 'blossom');
  else WORLD3[kind](b, null, v, style);
});
const tplWall = () => bakeTemplate('wall', (b) => WORLD3.wall(b, 0, 0, false));
const tplBridge = () => bakeTemplate('bridge', (b) => WORLD3.bridge(b, 0, 0, false));
const tplTuft = (color, form) => bakeTemplate('tuft' + color + form, (b) => b.add(tuftGeo(color, form), null, { mat: 'grass' }));
const tplFlower = (color, grass) => bakeTemplate('flower' + color + grass, (b) => {
  b.add(flowerGeo(color), null, { mat: 'grass' });
  b.add(tuftGeo(grass, 'short'), null, { p: [-0.25, 0, 0.25], s: 0.8, mat: 'grass' });
});
const tplPebble = (v, style) => bakeTemplate(`pebble:${v}:${style}`, (b) => {
  const [base, top] = ROCK_STYLES[style] || ROCK_STYLES.wiesen;
  b.add(rockGeo(v, 0), base, { s: [0.1, 0.07, 0.08], p: [0, 0.03, 0], top, topK: 0.5, mat: 'grass' });
});
// Schmuck ohne Kollision (seit 6.5, neu gebaut in 8.4): Baumstumpf, umgefallener Stamm, Pilze, Knochen, Busch,
// Kristalle, toter Baum und Schneewehe. Jedes Teil in echter Größe, fest im Boden verankert (Büschel oder kleiner
// Hügel am Fuß), mit dunkler Unterseite und heller Oberseite. Dünne Teile (Zweige, Beeren, Pilzpunkte, Jahresringe)
// kommen ins Material 'detail' ohne Umriss, sonst wären sie nur schwarze Striche.

// Ast, Wurzel oder Knochen zwischen zwei Punkten a → z (seit 8.4). Nie ein gedrehtes limb3: das hängt von y = 0
// nach unten und landete so im Boden. rund: Kapsel, sonst ein schlanker Kegelstumpf (ein Drittel der Dreiecke).
const _stD = new THREE.Vector3();
const _stOne = new THREE.Vector3(1, 1, 1);
function stick3(b, a, z, r1, r2, color, o = {}) {
  _stD.set(z[0] - a[0], z[1] - a[1], z[2] - a[2]);
  const len = Math.max(0.05, +_stD.length().toFixed(2));
  const q = new THREE.Quaternion().setFromUnitVectors(_down, _stD.normalize());
  const geo = o.round ? limb3(len, r1, r2, o.seg || 6) : lathe3(`stick${len},${r1},${r2}`, [[0, -len], [r2, -len], [r1, 0], [0, 0]], o.seg || 5);
  b.add(geo, color, Object.assign({}, o, { m: new THREE.Matrix4().compose(new THREE.Vector3(a[0], a[1], a[2]), q, _stOne) }));
}
// Teil in einem gedrehten Unterkörper (Pilz, Kristall): Matrix M mal eigene Lage
const atM3 = (M, p, r, s) => M.clone().multiply(partMatrix({ p, r, s }));

// Laubwolke mit Ausbuchtungen (seit 8.4): Ikosaeder, an neun Stellen nach außen gewölbt, dazu feines Rauschen
// für den Blattrand; unten abgeflacht. Für Moospolster und Schneehauben. foliageR gibt den Radius der
// Wolke in einer Richtung (ohne Rauschen).
const FOLIAGE3 = [];
function foliageLobes(v) {
  if (!FOLIAGE3[v]) {
    const rnd = mulberry32(57 + v * 23);
    FOLIAGE3[v] = Array.from({ length: 9 }, (_, k) => {
      // sechs Ausbuchtungen rundum, drei oben
      const a = (k < 6 ? k / 6 : (k - 6) / 3 + 0.15) * Math.PI * 2 + rnd() * 0.5;
      const e = k < 6 ? 0.1 + rnd() * 0.35 : 0.75 + rnd() * 0.3;
      return [Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e), 0.32 + rnd() * 0.12];
    });
  }
  return FOLIAGE3[v];
}
function foliageR(v, x, y, z) {
  let r = 0.74;
  for (const [lx, ly, lz, a] of foliageLobes(v)) r += a * Math.pow(Math.max(0, x * lx + y * ly + z * lz), 7);
  return r;
}
function foliageGeo(v, detail = 2) {
  return geo3(`foliage${v},${detail}`, () => {
    const g = smoothGeo(new THREE.IcosahedronGeometry(1, detail));
    const pos = g.attributes.position;
    const rnd = mulberry32(91 + v * 7);
    for (let i = 0; i < pos.count; i++) {
      _v1.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
      const r = foliageR(v, _v1.x, _v1.y, _v1.z) + (rnd() - 0.5) * 0.08;
      let y = _v1.y * r;
      if (y < -0.3) y = -0.3 + (y + 0.3) * 0.25;
      pos.setXYZ(i, _v1.x * r, y, _v1.z * r);
    }
    g.computeVertexNormals();
    return g;
  });
}
// Laubbausch für Büsche (seit 8.4): kleine, leicht verbeulte Kugel mit Eckenfarben, unten dunkel, oben hell.
// Mehrere davon überlappen sich; die Umrisse zwischen ihnen zeichnen die einzelnen Bausche wie bei den Baumkronen.
function puffGeo(v, lo, hi) {
  return geo3(`puff${v},${lo},${hi}`, () => {
    const g = smoothGeo(new THREE.IcosahedronGeometry(1, 1));
    const P = g.attributes.position;
    const rnd = mulberry32(71 + v * 11);
    for (let i = 0; i < P.count; i++) {
      _v1.set(P.getX(i), P.getY(i), P.getZ(i)).normalize();
      const r = 0.94 + rnd() * 0.12;
      P.setXYZ(i, _v1.x * r, Math.max(-0.55, _v1.y * r * 0.92), _v1.z * r);
    }
    g.computeVertexNormals();
    const N = g.attributes.normal;
    const a = new THREE.Color(lo);
    const b = new THREE.Color(hi);
    const col = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) {
      const t = Math.max(0, Math.min(1, (P.getY(i) + 0.1) / 0.9)) * 0.55 + Math.max(0, N.getY(i)) * 0.4;
      _c.copy(a).lerp(b, Math.min(1, t));
      col[i * 3] = _c.r;
      col[i * 3 + 1] = _c.g;
      col[i * 3 + 2] = _c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  });
}
// Kristall (seit 8.4): sechseckiges Prisma (Radius 1, Höhe 1) und Pyramidenspitze (Höhe 0,45) ohne gemeinsame
// Ecken: jede Facette hat ihre eigene Normale und fängt das Licht. Nie durch smoothGeo schicken.
function crystalGeo(part, sides = 6) {
  return geo3(`crystal${part}${sides}`, () => {
    const pos = [];
    for (let k = 0; k < sides; k++) {
      const a0 = (k / sides) * Math.PI * 2;
      const a1 = ((k + 1) / sides) * Math.PI * 2;
      const x0 = Math.cos(a0);
      const z0 = Math.sin(a0);
      const x1 = Math.cos(a1);
      const z1 = Math.sin(a1);
      if (part === 'tip') pos.push(x0, 0, z0, 0, 0.45, 0, x1, 0, z1);
      else pos.push(x0, 0, z0, x1, 1, z1, x1, 0, z1, x0, 0, z0, x0, 1, z0, x1, 1, z1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  });
}

// Schneewehe (seit 8.4): Hügel auf einem Kreisgitter, auf der Windseite lang auslaufend, auf der anderen steil
// abgebrochen; der Rand liegt knapp unter dem Boden, damit die Wehe aus dem Schnee herauswächst. Eckenfarben:
// am Fuß bläulicher Schatten, oben auf dem Kamm reines Weiß (so hebt sie sich ohne Umriss vom Schnee ab).
function driftGeo(v, lo, hi) {
  return geo3(`drift${v},${lo},${hi}`, () => {
    const S = 16;
    const R = 4;
    const th0 = v * 2.1 + 0.4;
    const rnd = mulberry32(13 + v * 5);
    const h = (r, a) => 0.2 * Math.pow(1 - r * r, 1.3) * (1 + 0.5 * Math.cos(a - th0)) * (v === 1 ? 1 + 0.4 * Math.cos(2 * a) : 1) - 0.012 * r;
    const pos = [0, h(0, 0), 0];
    const idx = [];
    for (let j = 1; j <= R; j++) {
      const r = j / R;
      for (let k = 0; k < S; k++) {
        const a = (k / S) * Math.PI * 2;
        // Windseite: Kamm zum steilen Rand hin verschoben
        const sk = 1 - 0.22 * Math.cos(a - th0) * r;
        const n = j < R ? (rnd() - 0.5) * 0.06 : 0;
        pos.push(Math.cos(a) * r * sk * (1 + n), h(r, a), Math.sin(a) * r * sk * (1 + n));
      }
    }
    for (let k = 0; k < S; k++) idx.push(0, 1 + ((k + 1) % S), 1 + k);
    for (let j = 1; j < R; j++) {
      for (let k = 0; k < S; k++) {
        const a = 1 + (j - 1) * S + k;
        const b = 1 + (j - 1) * S + ((k + 1) % S);
        idx.push(a, b, a + S, b, b + S, a + S);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const top = Math.max(...pos.filter((_, i) => i % 3 === 1));
    const a = new THREE.Color(lo);
    const b = new THREE.Color(hi);
    const col = [];
    for (let i = 1; i < pos.length; i += 3) {
      _c.copy(a).lerp(b, Math.max(0, Math.min(1, (pos[i] / top) * 2.2 - 0.05)));
      col.push(_c.r, _c.g, _c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  });
}

// Flache Kleinteile (Normalen nach oben, nur von oben sichtbar): Scheibe, Ring, Blatt
const discGeo = (n = 12) => flatGeo('disc' + n, (B) => {
  const w = new THREE.Color('#ffffff');
  const m = B.v(0, 0, 0, w);
  const rim = Array.from({ length: n }, (_, k) => B.v(Math.cos((k / n) * Math.PI * 2), 0, Math.sin((k / n) * Math.PI * 2), w));
  for (let k = 0; k < n; k++) B.up(m, rim[k], rim[(k + 1) % n]);
});
// Weicher Schein am Boden (für 'aura', additiv): innen die Farbe, zum Rand hin schwarz, also unsichtbar
const haloGeo = (color) => flatGeo('halo' + color, (B) => {
  const m = B.v(0, 0, 0, new THREE.Color(color));
  const mid = new THREE.Color(color).multiplyScalar(0.45);
  const black = new THREE.Color(0, 0, 0);
  const ring = [];
  const rim = [];
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    ring.push(B.v(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5, mid));
    rim.push(B.v(Math.cos(a), 0, Math.sin(a), black));
  }
  for (let k = 0; k < 12; k++) {
    const k2 = (k + 1) % 12;
    B.up(m, ring[k], ring[k2]);
    B.up(ring[k], rim[k], rim[k2]);
    B.up(ring[k], rim[k2], ring[k2]);
  }
});
const ringGeo = (inner, n = 14) => flatGeo(`ring${inner},${n}`, (B) => {
  const w = new THREE.Color('#ffffff');
  const o = [];
  const i = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    o.push(B.v(Math.cos(a), 0, Math.sin(a), w));
    i.push(B.v(Math.cos(a) * inner, 0, Math.sin(a) * inner, w));
  }
  for (let k = 0; k < n; k++) {
    const k2 = (k + 1) % n;
    B.up(o[k], o[k2], i[k]);
    B.up(i[k], o[k2], i[k2]);
  }
});
// Blatt entlang +z (Länge 1): Mittelrippe hell, Rand dunkler; droop biegt die Spitze nach unten
const leafGeo = (color, w = 0.38, droop = 0) => flatGeo(`leaf${color},${w},${droop}`, (B) => {
  const c = grassShades(color);
  const rib = [];
  const left = [];
  const right = [];
  for (let k = 0; k <= 4; k++) {
    const t = k / 4;
    const y = droop * (0.5 * t - t * t);
    const half = w * Math.sin(Math.PI * Math.pow(t, 0.8)) * 0.5;
    rib.push(B.v(0, y + 0.01, t, k ? c.tip : c.foot));
    if (k > 0 && k < 4) {
      left.push(B.v(half, y - 0.01, t, c.mid));
      right.push(B.v(-half, y - 0.01, t, c.mid));
    }
  }
  for (let k = 0; k < 4; k++) {
    for (const side of [left, right]) {
      const e0 = k > 0 ? side[k - 1] : null;
      const e1 = k < 3 ? side[k] : null;
      if (e0 !== null && e1 !== null) {
        B.up(rib[k], e0, e1);
        B.up(rib[k], e1, rib[k + 1]);
      } else B.up(rib[k], e0 !== null ? e0 : e1, rib[k + 1]);
    }
  }
});

// Farben je Gebiet: erst die Grundfarben, dann was das Gebiet ändert
const DECO_BASE3 = {
  wood: '#6b4a2e', cut: '#d8b080', ring: '#a07850', bush: '#356e2c', bushTop: '#7ab84a', berry: '#d8343a', blossom: '#f4f0e8',
  moss: '#4f7a32', cap: '#c84a3a', capDot: '#f4f0e8', stem: '#efe6cc', fungus: '#d8b878', bone: '#e8e0c8', crystal: '#bfe8ff',
  crystalBase: '#5a5a62', snow: '#f8fbff', snowShade: '#a8bcd6', tuft: '#4f8a34', glow: false, capGlow: false, snowy: false
};
const DECO_COLORS = {
  wald: { bush: '#2f5a2a', bushTop: '#5a9a46', berry: '#3a3a6a', tuft: '#2e5a2a', moss: '#4a7a30' },
  nagadschungel: { wood: '#5a3f2a', bush: '#2f6a3a', bushTop: '#5aa858', blossom: '#e0703a', cap: '#e0a03a', capDot: '#fff0c0', tuft: '#3d7633', moss: '#3d7a33' },
  frost: { wood: '#5a4a3e', cut: '#c8b090', ring: '#8a6a4a', crystal: '#58b0ec', crystalBase: '#5a6a7c', snowy: true, tuft: '#8a9a78' },
  moor: { wood: '#3a3428', moss: '#5a6a2a', cap: '#7ad86a', capGlow: true, bone: '#cfc8a8', tuft: '#4a5a34' },
  orktal: { wood: '#a08a6a', cut: '#d8c8a8', bone: '#efe6cc', tuft: '#a89a5a', thorn: true },
  sandwueste: { wood: '#a08a6a', cut: '#d8c8a8', bone: '#efe6cc', tuft: '#a89a5a', thorn: true },
  oedland: { wood: '#6e5e54', bone: '#d8d4c8', crystal: '#e0404a', crystalBase: '#2a2024', glow: true, ember: '#e0404a', tuft: '#6a645a' },
  vulkan: { wood: '#2a1a14', bone: '#d8ccb4', crystal: '#ff7a2a', crystalBase: '#2a1a1a', glow: true, ember: '#ff7a2a', char: '#3a2a20', tuft: null },
  titanenkamm: { wood: '#2a1a14', bone: '#d8ccb4', crystal: '#ffb04a', crystalBase: '#2e2628', glow: true, ember: '#ffb04a', char: '#3a2a20', tuft: null },
  donnerklamm: { wood: '#4a4440', crystal: '#9fd0ff', crystalBase: '#3a3640', glow: true, tuft: '#8a8a5a' }
};
// Bodenfarbe des Gebiets für Hügel am Fuß (Sand unter dem Schädel, Schnee unter der Wehe)
function decoSoil(style) {
  const z = ZONES.find((zz) => zz.id === style);
  const g = z && GROUND[z.ground] != null ? GROUND[z.ground] : GROUND.GRASS;
  return GROUND_PALETTE[g][4];
}

// Größe je Art beim Setzen: die Vorlagen bleiben in Kachelmaß (Prüfung: nichts unter dem Boden, nichts über
// 0,6 Kacheln vom Mittelpunkt), aus der Spielkamera muss jedes Teil auf einen Blick erkennbar sein
const DECO_SIZE3 = {
  [DECO.STUMP]: 1.3, [DECO.LOG]: 1.15, [DECO.MUSHROOM]: 1.75, [DECO.BONES]: 1.35, [DECO.SHRUB]: 1.2, [DECO.CRYSTAL]: 1.3,
  [DECO.DEADTREE]: 1.3, [DECO.DRIFT]: 1.35
};
const tplDeco = (d, style, v, low) => bakeTemplate(`deco:${d}:${style}:${v}${low ? ':l' : ''}`, (b0) => {
  const c = Object.assign({}, DECO_BASE3, DECO_COLORS[style] || {});
  // niedrig: nur der Kern ohne Kleinteile, Gras und Schein (core: tragende Teile bleiben, dann als 'lit')
  const b = !low ? b0 : {
    add(g, col, o = {}) {
      if (o.mat === 'detail' || o.mat === 'grass' || o.mat === 'aura') {
        if (!o.core) return;
        o = Object.assign({}, o, { mat: 'lit' });
      }
      b0.add(g, col, o);
    }
  };
  const W = (g, col, o) => b.add(g, col, o);
  const soil = decoSoil(style);
  const bark = c.wood;
  // Büschel am Fuß und flacher Hügel in Bodenfarbe: nichts schwebt auf der glatten Bodentextur
  const tuft = (x, z, s = 1, form = 'short') => {
    if (c.tuft) b.add(tuftGeo(c.tuft, form), null, { p: [x, 0, z], r: [0, x * 9 + z * 5, 0], s, mat: 'grass' });
  };
  const mound = (x, z, sx, sy, sz, col = soil) => b.add(cap3(1, Math.PI / 2, 0, Math.PI * 2, 10, 3), col, { p: [x, -0.012, z], s: [sx, sy, sz], mat: 'detail', ao: 0 });
  const fungus = (p, ry, s) => b.add(sphere3(1, 8, 4), c.fungus, { p, r: [0, ry, 0], s: [s, s * 0.3, s * 0.75], top: lighter(c.fungus, 0.35), topK: 0.8, ao: 0.4 });
  if (d === DECO.SHRUB) {
    // Busch: fünf bis sechs Laubbausche, unten dunkel, oben hell, mit Umrissen dazwischen; Blätter zwischen den
    // Bauschen. Wiese mit roten Beeren oder weißen Blüten, Wald mit dunklen Beeren, Dschungel mit großen hängenden
    // Blättern und oranger Blüte
    const jungle = style === 'nagadschungel';
    const puffs = jungle
      ? [[0, 0.13, 0, 0.13], [0.09, 0.1, 0.06, 0.1], [-0.08, 0.1, -0.05, 0.1]]
      : [[[0, 0.2, 0, 0.19], [0.17, 0.14, 0.05, 0.15], [-0.16, 0.14, 0.07, 0.15], [0.04, 0.14, -0.16, 0.15], [-0.06, 0.13, 0.17, 0.14], [0.03, 0.34, 0.03, 0.13]],
        [[0.08, 0.2, 0.02, 0.18], [-0.13, 0.18, -0.02, 0.17], [0.0, 0.14, 0.16, 0.14], [0.02, 0.14, -0.16, 0.14], [-0.04, 0.35, 0, 0.13]],
        [[0, 0.22, 0, 0.2], [0.18, 0.15, -0.04, 0.15], [-0.15, 0.15, -0.08, 0.15], [-0.04, 0.13, 0.17, 0.14], [0.12, 0.13, 0.15, 0.12], [-0.05, 0.37, -0.02, 0.12]]][v];
    puffs.forEach(([x, y, z, r], k) => b.add(puffGeo((v + k) % 3, darker(c.bush, 0.15), k === puffs.length - 1 && !jungle ? lighter(c.bushTop, 0.1) : c.bushTop), null, { p: [x * 1.12, y * 1.12, z * 1.12], r: [0, k * 1.3, 0], s: r * 1.12, ao: 0.3 }));
    if (jungle) {
      // Dschungel: große, hängende Blätter rundum (Elefantenohr) und eine orange Blüte
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + v;
        b.add(leafGeo(k % 2 ? c.bush : darker(c.bush, 0.15), 0.55, 0.5), null, { p: [Math.cos(a) * 0.05, 0.2 + (k % 3) * 0.04, Math.sin(a) * 0.05], r: [-0.25, Math.PI / 2 - a, 0], s: 0.36 + (k % 3) * 0.04, mat: 'detail', order: 'YXZ' });
      }
      b.add(flowerGeo(c.blossom), null, { p: [0.02, 0.12, 0.03], s: 1.2, mat: 'detail' });
    } else {
      // Blätter in den Lücken zwischen den Bauschen brechen den Umriss auf
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + v * 0.5 + 0.4;
        const R = 0.26 + (k % 2) * 0.03;
        b.add(leafGeo(k % 3 ? c.bushTop : c.bush, 0.55), null, { p: [Math.cos(a) * R * 0.75, 0.16 + (k % 2) * 0.1, Math.sin(a) * R * 0.75], r: [0.25 - (k % 2) * 0.3, Math.PI / 2 - a, 0], s: 0.15, mat: 'detail', order: 'YXZ' });
      }
      const onPuff = (pf, a, e, out = 1.02) => [pf[0] + Math.cos(a) * Math.cos(e) * pf[3] * out, pf[1] + Math.sin(e) * pf[3] * 0.92 * out, pf[2] + Math.sin(a) * Math.cos(e) * pf[3] * out];
      if (v === 0) {
        // Beeren in kleinen Trauben auf den Bauschen
        for (let k = 0; k < 3; k++) {
          const pf = puffs[1 + k];
          for (let j = 0; j < 2; j++) b.add(sphere3(0.032, 5, 3), c.berry, { p: onPuff(pf, k * 1.6 + j * 0.35 + 0.5, 0.55 + j * 0.15), mat: 'detail', top: lighter(c.berry, 0.4), topK: 0.6 });
        }
      } else if (v === 1 && style !== 'wald') {
        // weiße Blüten auf der Krone
        for (let k = 0; k < 5; k++) {
          const at = onPuff(puffs[k], k * 1.9 + 0.3, 0.75, 0.98);
          b.add(flowerGeo(c.blossom), null, { p: [at[0], at[1] - 0.245 * 0.6, at[2]], r: [0, k, 0], s: 0.6, mat: 'detail' });
        }
      }
    }
    tuft(0.24, 0.2, 0.8);
    tuft(-0.26, 0.12, 0.7);
  } else if (d === DECO.STUMP) {
    // Baumstumpf: Wurzelfuß, helle Schnittfläche mit Jahresring, Wurzeln, die in den Boden laufen
    const frost = style === 'frost';
    b.add(lathe3('stump84', [[0.26, 0], [0.2, 0.05], [0.17, 0.12], [0.16, 0.24], [0.15, 0.27], [0.146, 0.272], [0, 0.272]], 12), bark, { shade: 0.4, ao: 0.3 });
    b.add(discGeo(12), c.cut, { p: [0, 0.274, 0], s: [0.146, 1, 0.146] });
    b.add(ringGeo(0.8), c.ring, { p: [0, 0.276, 0], s: [0.1, 1, 0.1], mat: 'detail' });
    b.add(discGeo(6), darker(c.ring, 0.2), { p: [0.01, 0.276, -0.01], s: [0.022, 1, 0.022], mat: 'detail' });
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + v * 0.7;
      stick3(b, [Math.cos(a) * 0.12, 0.09, Math.sin(a) * 0.12], [Math.cos(a) * 0.36, -0.02, Math.sin(a) * 0.36], 0.06, 0.022, bark, { ao: 0.35 });
    }
    if (frost) {
      // kleine Schneehaube und eine Wehe am Fuß: Holz und Wurzeln bleiben sichtbar, kein Schneeball
      b.add(foliageGeo(v, 1), c.snowShade, { p: [0.025, 0.278, -0.015], s: [0.12, 0.05, 0.11], top: c.snow, topK: 1, ao: 0.25 });
      mound(0.16, 0.1, 0.2, 0.06, 0.16, c.snow);
    } else {
      if (style === 'wald' && v === 1) b.add(foliageGeo(v, 1), c.moss, { p: [0.03, 0.28, 0.01], s: [0.12, 0.045, 0.11], top: lighter(c.moss, 0.3), topK: 0.6, mat: 'detail' });
      if (style === 'wald' && v === 2) {
        fungus([0.15, 0.13, 0.04], 0.3, 0.075);
        fungus([0.13, 0.19, -0.07], -0.4, 0.06);
      }
      if (style === 'wiesen' && v === 2) {
        // Axt steckt im Stumpf
        b.add(tinyBox(0.13, 0.09, 0.02), '#9aa0aa', { p: [-0.01, 0.29, 0], r: [0, 0, 0.3] });
        b.add(tinyBox(0.03, 0.05, 0.022), '#d8dce4', { p: [-0.07, 0.305, 0], r: [0, 0, 0.3] });
        stick3(b, [0.03, 0.32, 0], [0.24, 0.5, 0.03], 0.024, 0.024, '#8a6038', { seg: 5 });
      }
      tuft(0.22, 0.16, 0.8);
      tuft(-0.2, -0.18, 0.7, v === 1 ? 'tall' : 'short');
    }
  } else if (d === DECO.LOG) {
    // liegender Stamm ganz auf der Kachel: Schnittflächen an beiden Enden, abgebrochener Ast, Moosstreifen, Baumpilze
    const R = 0.12;
    b.add(cyl3(R, R * 0.9, 0.84, 10), bark, { p: [0, R, 0], r: [0, 0, Math.PI / 2], ao: 0.5 });
    // Enden: links (dick) Schnittfläche, rechts Schnittfläche oder hohl
    b.add(discGeo(10), c.cut, { p: [-0.422, R, 0], r: [0, 0, Math.PI / 2], s: [R * 0.94, 1, R * 0.94] });
    b.add(ringGeo(0.78), c.ring, { p: [-0.425, R, 0], r: [0, 0, Math.PI / 2], s: [R * 0.6, 1, R * 0.6], mat: 'detail' });
    if (v === 1) {
      b.add(discGeo(10), '#2a1a10', { p: [0.422, R, 0], r: [0, 0, -Math.PI / 2], s: [R * 0.72, 1, R * 0.72] });
      b.add(ringGeo(0.72), c.cut, { p: [0.423, R, 0], r: [0, 0, -Math.PI / 2], s: [R * 0.88, 1, R * 0.88], mat: 'detail' });
    } else {
      b.add(discGeo(10), c.cut, { p: [0.422, R, 0], r: [0, 0, -Math.PI / 2], s: [R * 0.85, 1, R * 0.85] });
      b.add(ringGeo(0.75), c.ring, { p: [0.425, R, 0], r: [0, 0, -Math.PI / 2], s: [R * 0.5, 1, R * 0.5], mat: 'detail' });
    }
    // abgebrochener Seitenast mit Splitterspitze
    const s0 = [0.1, R * 1.7, 0.05];
    const s1 = [0.2, 0.36, 0.13];
    stick3(b, s0, s1, 0.042, 0.03, bark, { ao: 0.3 });
    stick3(b, s1, [0.215, 0.42, 0.14], 0.028, 0.006, lighter(bark, 0.15), { seg: 4 });
    // Moosstreifen oben, Baumpilze an der Flanke
    b.add(foliageGeo(v, 1), c.moss, { p: [-0.13, R * 1.9, -0.01], s: [0.24, 0.045, 0.085], top: lighter(c.moss, 0.3), topK: 0.6, mat: 'detail' });
    if (style !== 'moor') {
      fungus([0.02, R * 0.9, R * 0.92], 0, 0.06);
      fungus([-0.06, R * 1.25, R * 0.82], 0.2, 0.045);
    }
    if (style === 'moor') {
      // hängendes Moos an der Flanke, leuchtende Pilzchen oben
      for (let k = 0; k < 3; k++) stick3(b, [-0.2 + k * 0.17, R * 1.7, R * 0.6], [-0.19 + k * 0.17, 0.02, R * 1.2], 0.026, 0.008, c.moss, { mat: 'detail', seg: 4 });
      for (let k = 0; k < 3; k++) b.add(sphere3(0.035, 6, 4), c.cap, { p: [0.05 + k * 0.08, R * 1.95, -0.03 + (k % 2) * 0.05], s: [1, 0.6, 1], mat: 'glow' });
    }
    if (style === 'nagadschungel') {
      // zwei Lianenringe mit Blättern
      for (const x of [-0.24, 0.16]) {
        b.add(torus3(R * 1.06, 0.014, Math.PI * 2, 3, 10), '#3d7a33', { p: [x, R, 0], r: [0, Math.PI / 2, 0], mat: 'detail' });
        b.add(leafGeo(c.moss, 0.5), null, { p: [x, R * 2, 0], r: [-0.3, 0.8, 0], s: 0.14, mat: 'detail', order: 'YXZ' });
      }
    }
    tuft(-0.42, 0.16, 0.8);
    tuft(0.38, -0.15, 0.7, 'tall');
  } else if (d === DECO.MUSHROOM) {
    // drei Pilze mit Stiel und gewölbtem Hut und ein kleiner Knopf; Fliegenpilz mit weißen Punkten,
    // im Moor leuchtende Hüte, im Dschungel hohe, schlanke orange Pilze
    const tall = style === 'nagadschungel';
    const stemCol = style === 'moor' ? '#6a665a' : c.stem;
    const capMat = c.capGlow ? 'glow' : 'lit';
    const stem = tall ? lathe3('mstemT', [[0.026, 0], [0.032, 0.02], [0.022, 0.15], [0.024, 0.2]], 6) : lathe3('mstem', [[0.03, 0], [0.036, 0.02], [0.026, 0.1], [0.03, 0.14]], 6);
    const cap = tall
      ? lathe3('mcapT', [[0.02, 0.185], [0.075, 0.195], [0.068, 0.24], [0.035, 0.29], [0, 0.305]], 9)
      : lathe3('mcap', [[0.02, 0.125], [0.1, 0.135], [0.096, 0.175], [0.058, 0.21], [0, 0.22]], 9);
    // Lage der Punkte auf dem Hut: Ring (Höhe, Neigung) und Mitte, knapp über der Oberfläche
    const dotRing = tall ? [0.04, 0.287, 1.0] : [0.062, 0.21, 0.75];
    const dotTop = tall ? 0.308 : 0.223;
    const set = [[0, 0, 1.3, 0], [0.15, 0.07, 0.95, 0.28], [-0.12, 0.11, 0.7, -0.24], [0.04, -0.15, 0.45, 0.1]];
    set.forEach(([x, z, s, tilt], k) => {
      const ry = v * 2.1 + k;
      const rx = Math.cos(ry) * x - Math.sin(ry) * z;
      const rz = Math.sin(ry) * x + Math.cos(ry) * z;
      const M = partMatrix({ p: [rx, 0, rz], r: [tilt * 0.5, ry, tilt], s });
      W(stem, stemCol, { m: M.clone(), shade: 0.25 });
      W(cap, c.cap, { m: M.clone(), mat: capMat, top: lighter(c.cap, 0.25), topK: 0.5, ao: 0.55 });
      // Punkte auf dem Hut (Fliegenpilz), nicht bei den kleinen Knöpfen
      if (!c.capGlow && k < 3) {
        for (let j = 0; j < (tall ? 3 : 5); j++) {
          const a = j * 2.4 + k;
          const rr = j === 0 ? 0.012 : dotRing[0];
          const y = j === 0 ? dotTop : dotRing[1];
          const tiltOut = j === 0 ? 0 : dotRing[2];
          W(discGeo(6), c.capDot, { m: atM3(M, [Math.cos(a) * rr, y, Math.sin(a) * rr], [0, -a, -tiltOut], [0.022, 1, 0.022]), mat: 'detail' });
        }
      }
    });
    if (c.capGlow) b.add(haloGeo(c.cap), null, { p: [0, 0.01, 0], s: [0.38, 1, 0.38], mat: 'aura' });
    tuft(0.2, -0.05, 0.7);
    tuft(-0.18, 0.2, 0.6);
  } else if (d === DECO.BONES) {
    const bone = c.bone;
    const end = c.char || lighter(bone, 0.2);
    const endK = c.char ? 0.45 : 0.4;
    if (v === 0) {
      // Ochsenschädel mit Hörnern, halb im Sand
      mound(0, 0.02, 0.28, 0.05, 0.24);
      b.add(sphere3(1, 8, 6), bone, { p: [0, 0.075, -0.03], s: [0.1, 0.075, 0.1], shade: 0.3, top: lighter(bone, 0.25), topK: 0.5 });
      b.add(sphere3(1, 7, 5), bone, { p: [0, 0.05, 0.09], s: [0.065, 0.05, 0.11], r: [0.15, 0, 0], shade: 0.3, top: lighter(bone, 0.25), topK: 0.5 });
      for (const sx of [-1, 1]) {
        b.add(sphere3(1, 6, 4), '#2a2018', { p: [sx * 0.058, 0.098, 0.04], s: [0.03, 0.026, 0.03], mat: 'detail' });
        b.add(sphere3(1, 5, 3), '#3a2a20', { p: [sx * 0.022, 0.065, 0.195], s: 0.012, mat: 'detail' });
        stick3(b, [sx * 0.07, 0.1, -0.05], [sx * 0.17, 0.115, -0.06], 0.034, 0.029, bone, { seg: 6 });
        coneAlong(W, horn3(1, 1, 5), [sx * 0.165, 0.115, -0.06], [sx * 0.35, 0.8, -0.25], 0.17, 0.029, bone, { top: end, topK: endK });
      }
      // ein loser Knochen daneben
      stick3(b, [-0.24, 0.03, 0.14], [-0.06, 0.03, 0.24], 0.024, 0.02, bone, { seg: 5 });
      b.add(sphere3(0.036, 5, 3), bone, { p: [-0.25, 0.032, 0.13] });
      b.add(sphere3(0.03, 5, 3), bone, { p: [-0.055, 0.03, 0.245] });
      tuft(0.22, 0.12, 0.7);
    } else if (v === 1) {
      // Brustkorb: Rippenbögen, nach hinten kleiner, Wirbelsäule obenauf, Schädel am Kopfende
      const ribs = [0.15, 0.14, 0.12, 0.095];
      ribs.forEach((r, k) => {
        const x = -0.18 + k * 0.1;
        b.add(torus3(r, 0.024, Math.PI * 0.82, 3, 9), bone, { p: [x, -0.015, 0], r: [0, Math.PI / 2, Math.PI * 0.09], ao: 0.4, top: lighter(bone, 0.2), topK: 0.5 });
      });
      stick3(b, [-0.24, ribs[0] - 0.02, 0], [0.13, ribs[3] - 0.02, 0], 0.03, 0.026, bone, { seg: 6 });
      stick3(b, [0.13, ribs[3] - 0.02, 0], [0.34, 0.025, 0.04], 0.026, 0.018, bone, { seg: 5 });
      for (let k = 0; k < 4; k++) b.add(sphere3(0.03, 5, 3), lighter(bone, 0.15), { p: [-0.18 + k * 0.1, ribs[k] + 0.005, 0], s: [0.8, 1, 1.2], mat: 'detail' });
      // Schädel liegt vorn auf der Seite
      b.add(sphere3(1, 7, 5), bone, { p: [-0.33, 0.055, 0.03], s: [0.075, 0.06, 0.07], shade: 0.3, top: lighter(bone, 0.2), topK: 0.5 });
      b.add(sphere3(1, 5, 4), bone, { p: [-0.42, 0.04, 0.06], s: [0.07, 0.04, 0.05], r: [0, -0.3, 0], shade: 0.3 });
      b.add(sphere3(1, 5, 4), '#2a2018', { p: [-0.37, 0.07, 0.085], s: 0.022, mat: 'detail' });
      mound(-0.05, 0, 0.36, 0.035, 0.2);
      tuft(0.1, 0.22, 0.7);
    } else {
      // zwei gekreuzte Röhrenknochen mit Gelenkköpfen und ein kleiner Schädel
      const bones = [[[-0.24, 0.035, -0.1], [0.18, 0.035, 0.1]], [[-0.2, 0.08, 0.13], [0.2, 0.04, -0.1]]];
      for (const [a, z] of bones) {
        stick3(b, a, z, 0.028, 0.026, bone, { seg: 6, top: lighter(bone, 0.2), topK: 0.4 });
        const dx = z[0] - a[0];
        const dz = z[2] - a[2];
        const l = Math.hypot(dx, dz);
        for (const p of [a, z]) for (const sd of [-1, 1]) b.add(sphere3(0.04, 5, 3), bone, { p: [p[0] - (dz / l) * sd * 0.03, p[1], p[2] + (dx / l) * sd * 0.03], top: end, topK: endK * 0.6 });
      }
      b.add(sphere3(1, 7, 5), bone, { p: [0.05, 0.065, -0.2], s: [0.075, 0.068, 0.08], shade: 0.3, top: lighter(bone, 0.25), topK: 0.5 });
      b.add(sphere3(1, 5, 4), bone, { p: [0.05, 0.03, -0.13], s: [0.05, 0.03, 0.04], shade: 0.3 });
      for (const sx of [-1, 1]) b.add(sphere3(1, 5, 4), '#2a2018', { p: [0.05 + sx * 0.03, 0.07, -0.135], s: 0.02, mat: 'detail' });
      mound(0, 0, 0.3, 0.035, 0.26);
      tuft(-0.22, -0.16, 0.7);
    }
  } else if (d === DECO.CRYSTAL) {
    // Kristallgruppe: ein großer, drei schräge, zwei liegende Splitter auf einem Felsfuß, facettiert mit hellen
    // Spitzen. Im Frost kräftig eisblau mit Umriss (durchscheinendes Eis verschwand auf dem Schnee und kostete zwei
    // Zeichenaufrufe je Block), in Glut- und Zaubergebieten unten dunkler Obsidian, oben leuchtend, mit Schein am Boden
    const glow = c.glow;
    const tipCol = lighter(c.crystal, 0.45);
    const gem = (p, tilt, yaw, r, h) => {
      const M = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(_e.set(0, yaw, -tilt, 'YXZ')), _stOne);
      if (glow) {
        W(crystalGeo('body'), c.crystalBase, { m: atM3(M, [0, 0, 0], null, [r, h * 0.45, r]), top: lighter(c.crystalBase, 0.2), topK: 0.6 });
        W(crystalGeo('body'), c.crystal, { m: atM3(M, [0, h * 0.45, 0], null, [r * 0.98, h * 0.55, r * 0.98]), mat: 'glow', top: lighter(c.crystal, 0.3), topK: 0.9, ao: 0.4 });
        W(crystalGeo('tip'), tipCol, { m: atM3(M, [0, h, 0], null, [r * 0.98, r * 1.6, r * 0.98]), mat: 'glow' });
      } else {
        W(crystalGeo('body'), c.crystal, { m: atM3(M, [0, 0, 0], null, [r, h, r]), shade: 0.3, top: lighter(c.crystal, 0.3), topK: 0.6 });
        W(crystalGeo('tip'), tipCol, { m: atM3(M, [0, h, 0], null, [r, r * 1.6, r]) });
      }
    };
    const rot = v * 1.3;
    gem([0, 0.02, 0], 0.12, rot, 0.09, 0.52 - v * 0.05);
    for (let k = 0; k < 3; k++) {
      const a = rot + k * 2.1 + 0.4;
      gem([Math.cos(a) * 0.09, 0.02, Math.sin(a) * 0.09], 0.5 + (k % 2) * 0.22, -a, 0.065 - k * 0.007, 0.34 - k * 0.05);
    }
    for (let k = 0; k < 2; k++) {
      const a = rot + k * 3 + 1.5;
      gem([Math.cos(a) * 0.21, 0.015, Math.sin(a) * 0.21], 1.3, -a, 0.035, 0.12);
    }
    b.add(rockGeo(v), c.crystalBase, { s: [0.2, 0.09, 0.18], p: [0, 0.01, 0], top: lighter(c.crystalBase, 0.2), topK: 0.5, shade: 0.3 });
    for (let k = 0; k < 3; k++) {
      const a = k * 2.3 + v;
      b.add(rockGeo((v + k) % 3, 0), c.crystalBase, { s: [0.06, 0.045, 0.05], p: [Math.cos(a) * 0.25, 0.015, Math.sin(a) * 0.22], r: [0, a, 0], top: lighter(c.crystalBase, 0.25), topK: 0.5 });
    }
    if (glow) b.add(haloGeo(c.crystal), null, { p: [0, 0.012, 0], s: [0.45, 1, 0.45], mat: 'aura' });
    else if (c.snowy) mound(0, 0, 0.3, 0.05, 0.26, c.snow);
    else tuft(0.22, 0.14, 0.7);
  } else if (d === DECO.DEADTREE) {
    const thorn = c.thorn && v === 2;
    if (thorn) {
      // Dornbusch: trockene Zweige strahlen aus einem dunklen Kern, mit Gabeln an den Spitzen
      const twig = darker(c.wood, 0.15);
      b.add(sphere3(1, 7, 5), darker(twig, 0.35), { p: [0, 0.1, 0], s: [0.09, 0.07, 0.09] });
      const rnd = mulberry32(5 + v);
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2 + rnd() * 0.4;
        const e = 0.15 + (k % 3) * 0.32 + rnd() * 0.15;
        const L = 0.3 + rnd() * 0.12;
        const tip = [Math.cos(a) * Math.cos(e) * L, 0.08 + Math.sin(e) * L * 0.85, Math.sin(a) * Math.cos(e) * L];
        stick3(b, [0, 0.1, 0], tip, 0.03, 0.012, twig, { mat: 'detail', core: true, seg: 4, ao: 0.3 });
        const fa = a + (k % 2 ? 0.5 : -0.5);
        stick3(b, [tip[0] * 0.6, 0.1 + (tip[1] - 0.1) * 0.6, tip[2] * 0.6], [tip[0] * 0.6 + Math.cos(fa) * 0.12, tip[1] * 0.6 + 0.1, tip[2] * 0.6 + Math.sin(fa) * 0.12], 0.016, 0.007, twig, { mat: 'detail', seg: 3 });
      }
      mound(0, 0, 0.22, 0.04, 0.2);
      tuft(0.22, 0.14, 0.8);
    } else if (v === 1) {
      // liegender, gegabelter Ast mit Stein und dürrem Laub
      const A = [-0.42, 0.05, -0.05];
      const Z = [0.4, 0.045, 0.08];
      stick3(b, A, Z, 0.055, 0.032, bark, { round: true, seg: 6, ao: 0.45 });
      const at = (t, y = 0) => [A[0] + (Z[0] - A[0]) * t, A[1] + (Z[1] - A[1]) * t + y, A[2] + (Z[2] - A[2]) * t];
      stick3(b, at(0.33), [-0.02, 0.03, -0.24], 0.034, 0.016, bark, { ao: 0.4 });
      stick3(b, at(0.62), [0.3, 0.035, 0.26], 0.03, 0.014, bark, { ao: 0.4 });
      stick3(b, at(0.8, 0.02), [0.3, 0.2, -0.06], 0.02, 0.008, bark, { mat: 'detail', seg: 4 });
      b.add(discGeo(8), lighter(bark, 0.35), { p: [A[0] - 0.012, A[1], A[2] - 0.001], r: [0, 0.16, Math.PI / 2], s: [0.05, 1, 0.05] });
      b.add(rockGeo(v), darker(soil, 0.35), { p: [0.05, 0.03, 0.16], s: [0.12, 0.08, 0.1], top: lighter(soil, 0.1), topK: 0.4, shade: 0.3 });
      for (let k = 0; k < 2; k++) b.add(leafGeo(k ? '#8a6a3a' : '#a0703a', 0.5), null, { p: [-0.2 + k * 0.3, 0.012, 0.12 - k * 0.25], r: [0, k * 2 + 0.5, 0], s: 0.12, mat: 'detail' });
      if (c.ember) stick3(b, at(0.15, 0.045), at(0.55, 0.04), 0.012, 0.012, c.ember, { mat: 'glow', seg: 4 });
      tuft(-0.3, 0.16, 0.7);
    } else {
      // abgebrochener toter Baum: Stamm mit Wurzelfuß, Splitter am Bruch, zwei kahle Äste mit Gabel
      const tallV = v === 2;
      const H = tallV ? 0.9 : 0.72;
      const lean = tallV ? 0.06 : 0;
      b.add(lathe3(`snag${H}`, [[0.17, 0], [0.12, 0.06], [0.1, 0.2], [0.08, H * 0.75], [0.065, H], [0.03, H - 0.02], [0, H - 0.03]], 8), bark, { r: [0, 0, lean], shade: 0.35, ao: 0.3 });
      const topAt = [-Math.sin(lean) * H, H, 0];
      for (let k = 0; k < 3; k++) {
        const a = k * 2.2 + v;
        coneAlong(W, horn3(1, 1, 4), [topAt[0] + Math.cos(a) * 0.04, H - 0.04, Math.sin(a) * 0.04], [Math.cos(a) * 0.3, 1, Math.sin(a) * 0.3], 0.1 + (k === 0) * 0.07, 0.035, lighter(bark, 0.12), {});
      }
      const branches = tallV
        ? [[0.62, 0.0, 0.34, 0.95], [0.48, 2.6, 0.3, 0.9], [0.32, 4.4, 0.24, 0.75]]
        : [[0.44, 0.3, 0.34, 0.92], [0.32, 3.1, 0.28, 0.78]];
      for (const [y0, a, L, up] of branches) {
        const p0 = [-Math.sin(lean) * y0, y0, 0];
        const p1 = [p0[0] + Math.cos(a) * L * 0.75, y0 + L * up * 0.75, Math.sin(a) * L * 0.75];
        stick3(b, p0, p1, 0.04, 0.022, bark, { ao: 0.3 });
        stick3(b, p1, [p1[0] + Math.cos(a + 0.5) * 0.14, p1[1] + 0.12, p1[2] + Math.sin(a + 0.5) * 0.14], 0.02, 0.008, bark, { mat: 'detail', seg: 4 });
        stick3(b, p1, [p1[0] + Math.cos(a - 0.4) * 0.12, p1[1] - 0.02, p1[2] + Math.sin(a - 0.4) * 0.12], 0.018, 0.007, bark, { mat: 'detail', seg: 4 });
        if (style === 'moor') stick3(b, [p1[0], p1[1] - 0.01, p1[2]], [p1[0] + 0.01, p1[1] - 0.2, p1[2]], 0.022, 0.006, c.moss, { mat: 'detail', seg: 4 });
      }
      for (let k = 0; k < 2; k++) {
        const a = k * 2.6 + 1 + v;
        stick3(b, [Math.cos(a) * 0.1, 0.07, Math.sin(a) * 0.1], [Math.cos(a) * 0.32, -0.02, Math.sin(a) * 0.32], 0.05, 0.018, bark, { ao: 0.3 });
      }
      // Glutader liegt auf dem Stamm (vorher zeigte sie in den Boden)
      if (c.ember) stick3(b, [0.0, 0.05, 0.128], [-Math.sin(lean) * H * 0.85, H * 0.85, 0.07], 0.016, 0.012, c.ember, { mat: 'glow', seg: 4 });
      tuft(0.2, 0.16, 0.8);
      tuft(-0.18, -0.2, 0.7, 'tall');
    }
  } else if (d === DECO.DRIFT) {
    // Schneewehe mit Steinen und trockenen Halmen (statt Schneebällen)
    b.add(driftGeo(v, c.snowShade, c.snow), null, { s: [0.48, 1, 0.3], mat: 'detail', core: true, ao: 0.2 });
    const rb = FROST_ROCK3;
    const rt = '#9aaabb';
    b.add(rockGeo(v), rb, { p: [0.18, 0.04, -0.04], s: [0.13, 0.12, 0.11], r: [0, v, 0], top: rt, topK: 0.35, shade: 0.4 });
    if (v !== 1) b.add(rockGeo((v + 1) % 3, 0), rb, { p: [-0.26, 0.02, 0.1], s: [0.07, 0.06, 0.06], top: rt, topK: 0.35, shade: 0.3 });
    tuft(-0.08, -0.16, 0.9, 'tall');
    tuft(0.34, 0.12, 0.7);
  }
});
const tplProp = (pr) => bakeTemplate(`prop:${pr.type}:${pr.roof || ''}`, (b) => PROP3[pr.type](b, null, pr));

// --- Randkulisse (seit 8.4) -----------------------------------------------------------------------
// Statt Felsen in Kniehöhe vor einem Nebelkasten schließt jede Map mit einer Wand ihres Gebiets ab, in Schichten:
//   Saum  – innerste Randreihe: das Objekt des Gebiets (Baum, Tanne, Fels) etwas größer, dazu Büsche (mit Umriss)
//   Wand  – hohe Stücke (Hecke, Tannen, Klippe, Säulen) auf dem Rand und gleich dahinter, ohne Umriss ('far')
//   Ferne – große Massen auf der Böschung bis KUL3_OUT Kacheln draußen, zum Himmel hin eingefärbt
// Im Süden steht die Kamera: dort bleibt alles unter der Sichtlinie zur Figur in der letzten begehbaren
// Reihe (1,1 Einheiten je Reihe, mindestens 2,6); die Durchsicht um die Figur (addFade) bleibt.
// Wand und Ferne haben eigene, sparsame Formen (Kugeln 7 × 5, Kegel mit 6–7 Seiten, Sechskantsäulen).
// form: Bauart (KUL3_FORM), saum: [Art, Stil, Größe, jede n-te Kachel], alt: jedes n-te Wandstück anders
// (Blütenhecke), far: Farbe des Horizonts unten (drei-fx.js)
const BORDER3 = {
  wiesen: { form: 'hecke', saum: [['tree', '', 1.15], ['blossom', '', 1.15, 5]], alt: 5, far: '#3d6e3a' },
  wald: { form: 'tannen', saum: [['pine', 'wald', 1.3]], far: '#1e4034' },
  nagadschungel: { form: 'dschungel', saum: [['tree', 'nagadschungel', 1.2]], far: '#2e5a2a' },
  orktal: { form: 'sandstein', saum: [['rock', 'orktal', 2.2], ['dead', 'orktal', 1.4, 4]], far: '#a07a50' },
  oedland: { form: 'asche', saum: [['rock', 'donnerklamm', 2.1], ['dead', 'oedland', 1.5, 3]], far: '#6e5a54' },
  frost: { form: 'eis', saum: [['pine', 'frost', 1.25], ['rock', 'frost', 2.1, 3]], far: '#9fb4c8' },
  moor: { form: 'weiden', saum: [['rock', 'moor', 2.0], ['dead', 'moor', 1.5, 4]], far: '#3e5034' },
  vulkan: { form: 'basalt', saum: [['rock', 'vulkan', 2.1], ['dead', 'vulkan', 1.4, 4]], far: '#4a2a24' },
  titanenkamm: { form: 'basalt', saum: [['rock', 'titanenkamm', 2.1], ['dead', 'titanenkamm', 1.4, 4]], far: '#4a2a26' }
};
for (const id in BORDER3) BORDER3[id].id = id;
const kulStyle3 = (style) => BORDER3[style] || BORDER3.wiesen;
// Höhe der Gebietsobjekte bei Größe 1 (für die Sichtlinie im Süden)
const KUL3_HT = { tree: 3, blossom: 3, pine: 2.8, rock: 0.65, dead: 1.5 };

// Tannenkegel (Stufen aus Kegeln mit 7 Seiten) mit kurzem Stamm
function kulPine3(b, x, z, s, tiers, col, T, top, mat) {
  b.add(lathe3('kultrunk', [[0.22, 0], [0.16, 1.2], [0, 1.25]], 5), T('#4a3424'), { p: [x, 0, z], s, mat });
  for (let k = 0; k < tiers; k++) {
    const r = 1.2 - k * (0.75 / tiers);
    const g = lathe3(`kulpine${r.toFixed(2)}`, [[0, 0], [r, 0.18], [r * 0.45, 1.15], [0, 1.75]], 7);
    b.add(g, T(col[k % 2]), { p: [x, (0.9 + k * 1.2) * s, z], s, r: [0, k * 0.9, 0], top: top && T(top), topK: 0.85, shade: 0.35, mat });
  }
}
// Sechskantsäule mit flachen Seiten (Basalt), Fuß bei y = 0
const kulCol3 = () => geo3('kulbasalt', () => {
  const g = new THREE.CylinderGeometry(1, 1, 1, 6).translate(0, 0.5, 0).toNonIndexed();
  g.computeVertexNormals();
  return g;
});
// Krone aus Kugeln: die Wand steht nah an der Kamera und bekommt rundere Kugeln als die Ferne
const kulBlob3 = (near) => (near ? sphere3(1, 8, 6) : sphere3(1, 7, 5));
// Tafelberg-Schicht: flacher Kegelstumpf mit sieben Seiten, Fuß bei y = 0
const kulMesa3 = () => geo3('kulmesa', () => {
  const g = new THREE.CylinderGeometry(0.9, 1, 1, 7).translate(0, 0.5, 0).toNonIndexed();
  g.computeVertexNormals();
  return g;
});

// Bauarten: hw/hf = Höhe von Wand und Ferne bei Größe 1. wand/fern bekommen T (Farbe, in der Ferne zum
// Himmel gemischt) und landen ohne Umriss im Mesh 'far'; busch steht im Saum und bekommt einen Umriss.
const KUL3_FORM = {
  // Map 1: Blütenhecke aus Kronenkugeln, jedes fünfte Stück blüht rosa
  hecke: {
    hw: 5.4, hf: 4.0,
    wand(b, v, T, alt) {
      const c = alt ? ['#c86a8a', '#e08aa6', '#f5b8cb'] : ['#2f6229', '#3d7633', '#5a9a46'];
      const top = T(alt ? '#ffdce6' : '#86c262');
      const m = v === 1 ? -1 : 1;
      [[-0.75, 1.0, 0.1, 1.05], [0.72, 1.1, -0.1, 1.1], [0.05, 2.3, 0.15, 1.15], [-0.6, 3.4, -0.1, 0.95], [0.55, 3.5, 0.1, 0.9], [v === 2 ? 0.35 : -0.1, 4.55, 0, 0.75]]
        .forEach(([x, y, z, r], k) => b.add(kulBlob3(true), T(c[Math.min(2, k >> 1)]), { p: [x * m, y, z], s: [r * 1.08, r, r * 0.92], top, topK: 0.45, shade: 0.3 }));
      if (alt) for (const [x, y, z] of [[-0.5, 3.9, 0.75], [0.6, 2.9, 0.95], [0.1, 4.95, 0.55], [-0.9, 1.8, 0.9]]) b.add(sphere3(0.13, 4, 3), T('#ffffff'), { p: [x * m, y, z] });
    },
    fern(b, v, T) {
      const c = ['#2a5a26', '#356c30', v === 2 ? '#e08aa6' : '#4e8c40'];
      [[-0.7, 1.3, 0, 1.35], [0.75, 1.5, 0.1, 1.4], [0.0, 2.75, -0.1, 1.2]]
        .forEach(([x, y, z, r], k) => b.add(kulBlob3(), T(c[k]), { p: [x, y, z], s: r, top: T(v === 2 && k === 2 ? '#f5b8cb' : '#7ab45a'), topK: 0.4, shade: 0.3 }));
    },
    busch(b, v) {
      const c = v === 0 ? ['#d07896', '#f5b8cb'] : ['#3d7633', '#5a9a46'];
      [[-0.28, 0.32, 0, 0.42], [0.26, 0.36, 0.06, 0.46], [0, 0.66, -0.04, 0.38]].forEach(([x, y, z, r], k) => b.add(kulBlob3(), c[k === 2 ? 1 : 0], { p: [x, y, z], s: r, shade: 0.3 }));
    }
  },
  // Map 4: Tannenwall aus zwei, drei Tannen hintereinander
  tannen: {
    hw: 6.3, hf: 5.8,
    wand(b, v, T) {
      const m = v === 1 ? -1 : 1;
      kulPine3(b, -0.55 * m, 0, 1, 4, ['#245242', '#2a5c48'], T, '#3e7a5e');
      kulPine3(b, 0.65 * m, 0.25, v === 2 ? 0.7 : 0.82, 4, ['#2a5c48', '#245242'], T, '#3e7a5e');
    },
    fern(b, v, T) {
      kulPine3(b, -0.4, 0, 1.15, 3, ['#1e4034', '#24493b'], T);
      kulPine3(b, 0.7, 0.3, 0.8, 3, ['#24493b', '#1e4034'], T);
    },
    busch(b) {
      kulPine3(b, 0, 0, 0.42, 2, ['#2a5c48', '#245242'], (c) => c, '#3e7a5e', 'lit');
    }
  },
  // Map 2 außen: Dschungelwand aus Laubmassen, Lianen, Fächerblättern und roten Blüten
  dschungel: {
    hw: 4.9, hf: 4.0,
    wand(b, v, T) {
      const c = ['#2e5a2a', '#3d7633', '#4a8a3c'];
      const m = v === 1 ? -1 : 1;
      [[-0.7, 1.2, 0, 1.15], [0.7, 1.4, 0.1, 1.2], [-0.2, 2.8, -0.1, 1.2], [0.5, 3.9, 0.05, 0.95]]
        .forEach(([x, y, z, r], k) => b.add(kulBlob3(true), T(c[k % 3]), { p: [x * m, y, z], s: [r * 1.1, r * 0.9, r], top: T('#6aa84e'), topK: 0.4, shade: 0.3 }));
      for (const [x, y, l] of [[-0.45, 3.4, 2.4], [0.35, 2.9, 1.8]]) b.add(limb3(l, 0.05, 0.035, 4), T('#4a7a3a'), { p: [x * m, y, 1.0] });
      b.add(sphere3(1, 6, 4), T('#5a9a46'), { p: [0.9 * m, 2.2, 0.85], s: [0.9, 0.1, 0.4], r: [0.5, 0.3 * m, 0.4 * m] });
      if (v !== 2) for (const [x, y] of [[-0.9, 1.9], [0.2, 1.3]]) b.add(sphere3(1, 5, 4), T('#e04a3a'), { p: [x * m, y, 1.1], s: 0.16 });
    },
    fern(b, v, T) {
      const c = ['#24502a', '#2e6030', '#3d7633'];
      [[-0.7, 1.3, 0, 1.35], [0.75, 1.5, 0.1, 1.4], [0.0, 2.7, -0.1, 1.2]]
        .forEach(([x, y, z, r], k) => b.add(kulBlob3(), T(c[k]), { p: [x, y, z], s: [r * 1.1, r * 0.9, r], top: T('#5a9a46'), topK: 0.4, shade: 0.3 }));
    },
    busch(b, v) {
      for (let k = 0; k < 3; k++) b.add(sphere3(1, 6, 4), k % 2 ? '#5a9a46' : '#3d7633', { p: [Math.cos(k * 2.1) * 0.25, 0.35, Math.sin(k * 2.1) * 0.25], s: [0.55, 0.08, 0.24], r: [0, -k * 2.1, 0.5] });
      if (v === 0) b.add(sphere3(1, 5, 4), '#e04a3a', { p: [0, 0.42, 0], s: 0.12 });
    }
  },
  // Map 5: Sandsteinklippe aus drei Schichten, nach oben heller
  sandstein: {
    hw: 4.8, hf: 3.8,
    wand(b, v, T) {
      // flache Schichten übereinander, abwechselnd dunkler und heller, oben die hellste mit Kante
      const m = v === 1 ? -1 : 1;
      const c = ['#8a5a32', '#b47e4a', '#a06c3c'];
      for (let k = 0; k < 3; k++) {
        b.add(rockGeo((v + k) % 3), T(c[k]), { s: [1.5 - k * 0.12, 1.65, 1.2 - k * 0.1], p: [(k % 2 ? 0.12 : -0.1) * m, k * 1.45 - 0.15, (k % 2) * 0.08], top: T(k === 2 ? '#c8945c' : '#b88550'), topK: 0.35, shade: 0.5 });
      }
    },
    fern(b, v, T) {
      // Tafelberge: Schichten in wechselnden Farben, von oben als Ringe zu sehen
      const c = ['#94643a', '#c48f58', '#a87444', '#d4a46a'];
      const stack = (x, z, r, n, k0) => {
        for (let k = 0; k < n; k++) b.add(kulMesa3(), T(c[(k + k0) % 4]), { p: [x, k * 1.05 - 0.2, z], s: [r * (1 - k * 0.2), 1.05, r * (0.9 - k * 0.18)], r: [0, k * 0.8 + v, 0], top: T('#e0b47a'), topK: 0.25, shade: 0.4 });
      };
      stack(-0.35, 0, 1.6, 3, v);
      stack(1.0, 0.4, 0.95, 2, v + 1);
    },
    busch(b, v) {
      b.add(rockGeo(v, 0), '#b08a5a', { s: [0.42, 0.5, 0.36], p: [0, 0.05, 0], top: '#d0aa7a', topK: 0.6, shade: 0.3 });
      b.add(rockGeo((v + 1) % 3, 0), '#a07a50', { s: [0.28, 0.32, 0.25], p: [0.35, 0.02, 0.15], top: '#c29a6a', topK: 0.6 });
    }
  },
  // Map 6: Aschenklippe mit Felsnadeln und Glutadern
  asche: {
    hw: 5.8, hf: 4.6,
    wand(b, v, T) {
      const m = v === 1 ? -1 : 1;
      b.add(rockGeo(v), T('#5e4c48'), { s: [1.45, 2.0, 1.15], p: [0, -0.1, 0], top: T('#7a6862'), topK: 0.5, shade: 0.35 });
      b.add(horn3(5.4, 0.85, 6), T('#6e5a56'), { p: [-0.4 * m, 0.3, -0.1], r: [0, 0, 0.08 * m], top: T('#8a766c'), topK: 0.4, shade: 0.4 });
      b.add(horn3(3.8, 0.7, 6), T('#64524e'), { p: [0.6 * m, 0.3, 0.15], r: [0.1, 0, -0.12 * m], top: T('#8a766c'), topK: 0.4, shade: 0.4 });
      if (v !== 1) b.add(limb3(2.2, 0.06, 0.03, 4), '#ff7a2a', { p: [-0.25 * m, 2.6, 0.45], r: [0.25, 0, 0.1 * m], mat: 'glow' });
    },
    fern(b, v, T) {
      b.add(rockGeo(v, 0), T('#5e4c48'), { s: [1.8, 2.4, 1.5], p: [0, -0.1, 0], top: T('#7a6862'), topK: 0.5, shade: 0.35 });
      b.add(horn3(4.4, 0.9, 6), T('#6e5a56'), { p: [0.3, 0.4, 0], r: [0, 0, -0.1], shade: 0.4 });
    },
    busch(b, v) {
      for (let k = 0; k < 3; k++) b.add(limb3(0.6 - k * 0.1, 0.04, 0.02, 4), '#4a3a34', { p: [0, 0, 0], r: [Math.PI + Math.sin(k * 2.1 + v) * 0.6, 0, Math.cos(k * 2.1 + v) * 0.6] });
      b.add(rockGeo(v, 0), '#5e4c48', { s: [0.3, 0.3, 0.26], p: [0.15, 0.02, 0.1], top: '#7a6862', topK: 0.5 });
    }
  },
  // Map 7: Eisklippe mit Schneekappe und Eiszapfen, dazwischen verschneite Tannen
  eis: {
    hw: 6.3, hf: 5.0,
    wand(b, v, T) {
      if (v === 2) {
        kulPine3(b, -0.5, 0, 1, 4, ['#2a4a48', '#2e5250'], T, '#f4f8fc');
        kulPine3(b, 0.6, 0.25, 0.78, 4, ['#2e5250', '#2a4a48'], T, '#f4f8fc');
        return;
      }
      b.add(rockGeo(v), T('#7aa6c8'), { s: [1.5, 4.2, 1.2], p: [-0.25, -0.2, 0], top: T('#f4f9fd'), topK: 0.95, shade: 0.4 });
      b.add(rockGeo((v + 1) % 3), T('#8ab8d8'), { s: [1.05, 2.8, 0.95], p: [0.75, -0.1, 0.25], top: T('#f4f9fd'), topK: 0.95, shade: 0.35 });
      for (const [x, z, l, a] of [[0.35, 0.7, 2.6, 0.25], [-0.9, 0.6, 1.8, -0.35]]) b.add(horn3(l, 0.3, 6), T('#bfe6f8'), { p: [x, 0, z], r: [0.15, 0, a] });
    },
    fern(b, v, T) {
      if (v === 2) {
        kulPine3(b, 0, 0, 1.1, 3, ['#2a4a48', '#2e5250'], T, '#f4f8fc');
        return;
      }
      b.add(rockGeo(v, 0), T('#7aa6c8'), { s: [1.9, 3.8, 1.6], p: [0, -0.2, 0], top: T('#f4f9fd'), topK: 0.95, shade: 0.4 });
      b.add(horn3(2.4, 0.35, 6), T('#bfe6f8'), { p: [0.9, 0, 0.5], r: [0.2, 0, -0.3] });
    },
    busch(b) {
      kulPine3(b, 0, 0, 0.42, 2, ['#2a4a48', '#2e5250'], (c) => c, '#f4f8fc', 'lit');
    }
  },
  // Map 8: Trauerweiden mit hängendem Moos
  weiden: {
    hw: 5.4, hf: 4.6,
    wand(b, v, T) {
      const m = v === 1 ? -1 : 1;
      b.add(lathe3('kulweide', [[0.32, 0], [0.22, 1.6], [0.16, 3.0], [0, 3.1]], 6), T('#3a3a2a'), { p: [0.1 * m, 0, 0], shade: 0.3 });
      [[-0.65, 3.4, 0, 1.1], [0.6, 3.6, 0.1, 1.15], [0.0, 4.5, -0.1, 0.95]]
        .forEach(([x, y, z, r], k) => b.add(kulBlob3(), T(k === 1 ? '#4a5a3a' : '#3a4a30'), { p: [x * m, y, z], s: [r * 1.15, r * 1.2, r], top: T('#6a7e50'), topK: 0.45, shade: 0.4 }));
      for (const [x, y, l] of [[-1.0, 2.7, 0.75], [-0.2, 2.75, 0.6], [0.8, 2.85, 0.85]]) b.add(sphere3(1, 5, 4), T('#6a8a52'), { p: [x * m, y, 0.8], s: [0.2, l, 0.16], shade: 0.4 });
    },
    fern(b, v, T) {
      b.add(lathe3('kulweide', [[0.32, 0], [0.22, 1.6], [0.16, 3.0], [0, 3.1]], 6), T('#3a3a2a'), { p: [0, 0, 0] });
      [[-0.6, 3.0, 0, 1.3], [0.65, 3.2, 0.1, 1.3]].forEach(([x, y, z, r]) => b.add(kulBlob3(), T('#3a4a30'), { p: [x, y, z], s: [r * 1.1, r * 1.15, r], top: T('#5a6e44'), topK: 0.4, shade: 0.4 }));
    },
    busch(b, v) {
      for (let k = 0; k < 4; k++) b.add(horn3(0.7 + (k % 2) * 0.25, 0.04, 4), k % 2 ? '#6a7a4a' : '#4a5a3a', { p: [Math.cos(k * 1.7 + v) * 0.18, 0, Math.sin(k * 1.7 + v) * 0.18], r: [Math.sin(k * 1.7) * 0.2, 0, Math.cos(k * 1.7) * 0.2] });
      b.add(sphere3(1, 5, 4), '#5a3a28', { p: [0.1, 0.8, 0], s: [0.05, 0.12, 0.05] });
    }
  },
  // Map 9 und Titanenkamm: Basaltsäulen in Gruppen, unten glühende Fugen
  basalt: {
    hw: 7.0, hf: 5.6,
    wand(b, v, T) {
      const m = v === 1 ? -1 : 1;
      [[-0.8, 0.1, 0.36, 5.0], [-0.25, -0.15, 0.4, 7.0], [0.3, 0.05, 0.38, 6.2], [0.85, -0.15, 0.34, 4.4], [-1.15, -0.3, 0.32, 3.0], [0.05, 0.5, 0.34, 2.6], [0.65, 0.5, 0.3, 1.8], [-0.6, 0.55, 0.3, 1.4]]
        .forEach(([x, z, r, h], k) => b.add(kulCol3(), T(k % 2 ? '#3a2c2c' : '#463434'), { p: [x * m, -0.2, z], s: [r, h * (0.88 + ((k + v) % 3) * 0.08), r], r: [0, k, 0], top: T('#6a4c44'), topK: 0.9, shade: 0.45 }));
      b.add(limb3(1.6, 0.06, 0.04, 4), '#ff7a2a', { p: [-0.8 * m, 0.1, 0.75], r: [0, 0, Math.PI / 2 * m], mat: 'glow' });
    },
    fern(b, v, T) {
      [[-0.7, 0, 0.42, 4.4], [-0.1, -0.25, 0.46, 5.6], [0.5, 0.05, 0.42, 4.8], [1.0, -0.1, 0.38, 3.2], [0.2, 0.5, 0.38, 2.4]]
        .forEach(([x, z, r, h], k) => b.add(kulCol3(), T(k % 2 ? '#3a2c2c' : '#463434'), { p: [x, -0.2, z], s: [r, h * (0.9 + ((k + v) % 3) * 0.08), r], r: [0, k, 0], top: T('#6a4c44'), topK: 0.9, shade: 0.45 }));
    },
    busch(b, v) {
      [[-0.2, 0, 0.22, 0.9], [0.18, 0.1, 0.2, 0.6], [0, -0.2, 0.18, 0.4]]
        .forEach(([x, z, r, h], k) => b.add(kulCol3(), '#463434', { p: [x, 0, z], s: [r, h + v * 0.1, r], r: [0, k, 0], top: '#6a4c44', topK: 0.9, shade: 0.4 }));
    }
  }
};

// Vorlagen der Randkulisse je Gebiet. Ferne: Farben zu 28 % zum Himmel des Gebiets gemischt (Luftperspektive)
const tplKul = (B, part, v, alt) => bakeTemplate(`kul:${B.id}:${part}:${v}:${alt ? 1 : 0}`, (b) => {
  const F = KUL3_FORM[B.form];
  if (part === 'busch') {
    F.busch(b, v);
    return;
  }
  const sky = new THREE.Color((MOOD3[B.id] || MOOD3.dorf).sky);
  const T = part === 'fern' ? (hex) => new THREE.Color(hex).lerp(sky, 0.28) : (hex) => hex;
  // alles ohne eigenes Material ins Mesh 'far' (ohne Umriss)
  const far = { add: (g, c, o = {}) => b.add(g, c, Object.assign({}, o, { mat: o.mat || 'far' })) };
  F[part](far, v, T, alt);
});

// Ausrichtung je Seite (0 Nord, 1 Süd, 2 West, 3 Ost): Vorderseite (lokal +z) zur Map, Richtung nach außen
const KUL3_ROT = [0, Math.PI, Math.PI / 2, -Math.PI / 2];
const KUL3_NX = [0, 0, -1, 1];
const KUL3_NZ = [-1, 1, 0, 0];
const _kulP = new THREE.Vector3();
const _kulS = new THREE.Vector3();
// wie placeAt, aber mit eigener Höhe (sy), z. B. für Stücke unter der Sichtlinie
function kulAt(x, z, rotY, s, sy, y) {
  _q.setFromEuler(_e.set(0, rotY, 0));
  return new THREE.Matrix4().compose(_kulP.set(x, y, z), _q, _kulS.set(s, s * sy, s));
}

// Randkulisse einer Kachel am oder hinter dem Rand der Map H. false: Kachel liegt im begehbaren Teil.
function kulisse3(b, H, x, y, lowGfx) {
  const dOut = homeOut3(H, x, y);
  if (dOut > KUL3_OUT) return true;
  const dIn = dOut ? 0 : homeIn3(H, x, y);
  if (!dOut && dIn >= MAP_BORDER) return false;
  // Seite und Reihe r ab dem begehbaren Teil (1 = Saum, 2–4 Rand, ab 5 draußen)
  let side;
  if (dOut) {
    const ox = Math.max(H.x0 - x, x - (H.x1 - 1), 0);
    const oy = Math.max(H.y0 - y, y - (H.y1 - 1), 0);
    side = ox > oy ? (x < H.x0 ? 2 : 3) : y < H.y0 ? 0 : 1;
  } else side = dIn === y - H.y0 ? 0 : dIn === H.y1 - 1 - y ? 1 : dIn === x - H.x0 ? 2 : 3;
  const r = dOut ? MAP_BORDER + dOut : MAP_BORDER - dIn;
  const along = side < 2 ? x : y;
  const B = H.B;
  const h = tileHash(x, y);
  const v = h % 3;
  // Im Süden unter der Sichtlinie der Kamera zur Figur in der letzten begehbaren Reihe (r = Reihen ab dort,
  // höchstens 1,1 je Reihe) und flacher als die Kamera selbst, sonst füllen die nahen Stücke das halbe Bild;
  // der Saum direkt vor der Figur bleibt hüfthoch
  const cap = side !== 1 ? 99 : r === 1 ? 1.2 : Math.max(2.6, 0.75 * r);
  const jx = ((h >> 5) % 5 - 2) * 0.06;
  const jz = ((h >> 9) % 5 - 2) * 0.06;
  const nx = KUL3_NX[side];
  const nz = KUL3_NZ[side];
  // eine Kachel weiter entlang des Randes (Stücke über zwei Kacheln)
  const ax = side < 2 ? 0.5 : 0;
  const az = side < 2 ? 0 : 0.5;
  if (r === 1) {
    // Saum: Gebietsobjekt auf jeder Kachel (Bäume und Tannen auf jeder zweiten), dahinter versetzt ein Busch.
    // Im Süden nur, was niedrig bleibt (Felsen), sonst ein größerer Busch an seiner Stelle
    const alt = B.saum[1];
    const [kind, st, size] = alt && (h >> 6) % alt[3] === 0 ? alt : B.saum[0];
    const s = size * (0.92 + ((h >> 12) % 16) / 100);
    const rb = ((h >> 4) % 628) / 100;
    // etwas nach außen gerückt, damit nichts in die begehbare Reihe ragt
    const sx = x + 0.5 + jx + nx * 0.3;
    const sz = y + 0.5 + jz + nz * 0.3;
    if (kind === 'rock' || (s * KUL3_HT[kind] <= cap * 1.4 && !(KUL3_HT[kind] > 2 && along & 1))) b.addTemplate(tplTree(kind, v, st), placeAt(sx, sz, ((h >> 3) % 628) / 100, Math.min(s, cap / KUL3_HT[kind])));
    else b.addTemplate(tplKul(B, 'busch', (v + 1) % 3), placeAt(sx, sz, rb + 1, 1.25 + ((h >> 15) % 4) * 0.06));
    b.addTemplate(tplKul(B, 'busch', v), placeAt(x + 0.5 + ax + nx * 0.35, y + 0.5 + az + nz * 0.35, rb, 1.1 + ((h >> 15) % 4) * 0.12));
    return true;
  }
  // Wand: auf dem Rand (r = 3) und gleich dahinter (r = 6) je ein Stück über zwei Kacheln, versetzt;
  // Ferne: ab r = 8 je eine Masse über 2 × 2 Kacheln (niedrige Grafik: nur die erste Reihe)
  let part = null;
  if ((r === 3 && !(along & 1)) || (r === 6 && along & 1)) part = 'wand';
  else if ((r === 8 || r === 10 || r === 12) && (along & 1) === ((r >> 1) & 1) && !(lowGfx && r > 8)) part = 'fern';
  if (!part) return true;
  const F = KUL3_FORM[B.form];
  const far = part === 'fern';
  const s = (far ? 1.2 : side === 1 ? 1.0 : 1.15) * (0.9 + ((h >> 12) % 20) / 100);
  const out = far ? 0.5 : 0;
  const gy = dOut ? bermH3(dOut + out) - 0.3 : -0.1;
  const sy = Math.max(0.3, Math.min(1, (cap - gy) / ((far ? F.hf : F.hw) * s)));
  const alt = B.alt && (h >> 4) % B.alt === 0;
  const rot = KUL3_ROT[side] + (((h >> 7) % 9) - 4) * 0.06;
  b.addTemplate(tplKul(B, part, v, alt), kulAt(x + 0.5 + ax + nx * out + jx, y + 0.5 + az + nz * out + jz, rot, s, sy, gy));
  return true;
}

// Kachel-Zahl gut verrühren: tileHash allein hat in den unteren Bits ein Gittermuster
function mixHash(h) {
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
}

// Ein Block mit allen Objekten, als Bauauftrag in Zeitscheiben (siehe v3UpdateChunks).
// Gesammelt wird je Viertel (8 × 8 Kacheln). Steckt in einem Block viel (Dorf, dichter Wald), bekommt jedes
// Viertel eigene Meshes: Die Sichtprüfung geht je Mesh, so fällt weg, was knapp außerhalb des Bildes liegt,
// statt mit dem ganzen Block gezeichnet zu werden. Sonst bleibt es bei einem Mesh je Block.
const QUARTER3 = CHUNK3 / 2;
// ab so vielen Dreiecken einer Art im Block lohnt der zusätzliche Zeichenaufruf je Viertel
const SPLIT3 = 20000;
function* objectJob(cx, cy) {
  const w = game.world;
  const bakes = [0, 1, 2, 3].map(() => new Bake3(false));
  const lowGfx = opts.graphics === 'niedrig';
  const x0 = cx * CHUNK3;
  const y0 = cy * CHUNK3;
  // Map, in der man steht (seit 8.4): Rand und alles dahinter wird zur Randkulisse, auch jenseits der Weltgrenze
  const H = V3.home && !V3.home.dungeon ? V3.home : null;
  const x1 = H ? x0 + CHUNK3 : Math.min(MAP_W, x0 + CHUNK3);
  const y1 = H ? y0 + CHUNK3 : Math.min(MAP_H, y0 + CHUNK3);
  const bakeAt = (x, y) => bakes[(y - y0 >= QUARTER3 ? 2 : 0) + (x - x0 >= QUARTER3 ? 1 : 0)];
  if (!towerTiles) towerTiles = new Set(w.props.filter((pr) => pr.type === 'tower').map((pr) => Math.floor(pr.y / TILE - 1) * MAP_W + Math.floor(pr.x / TILE)));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const b = bakeAt(x, y);
      if (H && kulisse3(b, H, x, y, lowGfx)) continue;
      const i = y * MAP_W + x;
      const o = w.obj[i];
      const h = tileHash(x, y);
      const style = ZONES[w.zoneIdx[i]].id;
      const jx = ((h >> 5) % 5 - 2) * 0.05;
      const jz = ((h >> 9) % 5 - 2) * 0.05;
      const rot = ((h >> 3) % 628) / 100;
      const sc = 0.9 + ((h >> 12) % 20) / 100;
      if (o === OBJ.WALL) {
        const vertical = wallVertical(w, i);
        if (!towerTiles.has(i)) b.addTemplate(tplWall(), placeAt(x + 0.5, y + 0.5, vertical ? Math.PI / 2 : 0));
        continue;
      }
      const kind = OBJ_KIND[o];
      if (kind) {
        const st = kind === 'rock' || kind === 'dead' || kind === 'pine' ? style : kind === 'tree' && style === 'nagadschungel' ? style : '';
        b.addTemplate(tplTree(kind, h % 3, st), placeAt(x + 0.5 + jx, y + 0.55 + jz, rot, sc));
        continue;
      }
      if (o) continue;
      const g = w.ground[i];
      const d = w.deco[i];
      if (d === DECO.BRIDGE) {
        // Der Weg läuft waagerecht, wenn links oder rechts Weg oder Brücke liegt
        const way = (tx, ty) => groundAt(tx, ty) === GROUND.PATH || (w.deco[ty * MAP_W + tx] === DECO.BRIDGE);
        const horiz = way(x - 1, y) || way(x + 1, y);
        b.addTemplate(tplBridge(), placeAt(x + 0.5, y + 0.5, horiz ? 0 : Math.PI / 2));
        continue;
      }
      if (d >= DECO.STUMP) {
        // seit 8.4 richtig modelliert und je Art auf Spielgröße gebracht (DECO_SIZE3) statt pauschal vergrößert
        b.addTemplate(tplDeco(d, style, h % 3, lowGfx), placeAt(x + 0.5 + jx * 3, y + 0.5 + jz * 3, rot, sc * DECO_SIZE3[d]));
        continue;
      }
      if (lowGfx) continue;
      if (FLOWER3[d]) {
        b.addTemplate(tplFlower(FLOWER3[d], GRASS3[g] || '#4f8a34'), placeAt(x + 0.5 + jx * 3, y + 0.5 + jz * 3, rot, 1));
        continue;
      }
      if (d === DECO.PEBBLE) {
        b.addTemplate(tplPebble(h % 3, style), placeAt(x + 0.5 + jx * 4, y + 0.5 + jz * 4, rot, 1));
        continue;
      }
      // Gras (seit 7.9): auf Wiese und Grasland fast jede Kachel, manchmal hohe Halme und Klee; im Wald und
      // Sumpf wie bisher jede vierte Kachel, auf Wegen nur hier und da ein kleines trockenes Büschel
      const grass = GRASS3[g];
      if (!grass) continue;
      const m = mixHash(h);
      const at = (k, s, r, form, col = grass) => {
        const ox = ((m >> (k * 6)) & 7) / 7 - 0.5;
        const oz = ((m >> (k * 6 + 3)) & 7) / 7 - 0.5;
        b.addTemplate(tplTuft(col, form), placeAt(x + 0.5 + ox * 0.8, y + 0.5 + oz * 0.8, r, s));
      };
      if (g === GROUND.GRASS || g === GROUND.MEADOW) {
        if (((m >>> 24) & 15) < 2) continue;
        at(0, 0.8 + ((h >> 14) % 6) / 10, rot, (m >>> 28) % 6 === 0 ? 'tall' : 'short');
        if (d === DECO.TUFT || m & 0x40000) at(1, 0.65 + ((m >>> 22) & 3) * 0.1, rot + 2.1, 'short');
        if (((m >>> 19) & 7) === 0) at(2, 0.9 + ((m >>> 22) & 3) * 0.1, rot + 1, 'clover', CLOVER3);
      } else if (g === GROUND.PATH) {
        if ((m >>> 26) % 9 === 0) at(0, 0.55 + ((m >>> 22) & 3) * 0.08, rot, 'short');
      } else if (GRASS3_SPARSE[g]) {
        if ((m >>> 26) % GRASS3_SPARSE[g] === 0 || (d === DECO.TUFT && (m >>> 26) % 4 === 1)) at(0, 0.6 + ((m >>> 22) & 3) * 0.1, rot, (m >>> 22) % 3 === 0 ? 'tall' : 'short');
      } else if (d === DECO.TUFT || (m >>> 26) % 4 === 0) {
        at(0, 0.8 + ((h >> 14) % 6) / 10, rot, (m >>> 22) % 5 === 0 ? 'tall' : 'short');
        if (d === DECO.TUFT) at(1, 0.7, rot + 1, 'short');
      }
    }
    if (y % 4 === 3) yield;
  }
  for (const h of w.houses) {
    const hx = h.x + h.w / 2;
    const hy = h.y + h.h / 2;
    if (hx >= x0 && hx < x1 && hy >= y0 && hy < y1 && !(H && homeOut3(H, Math.floor(hx), Math.floor(hy)))) {
      WORLD3.house(bakeAt(Math.floor(hx), Math.floor(hy)), h);
      yield;
    }
  }
  for (const pr of w.props) {
    const px = pr.x * U3;
    const py = pr.y * U3;
    if (px < x0 || px >= x1 || py < y0 || py >= y1) continue;
    if (!PROP3[pr.type] || (H && homeOut3(H, Math.floor(px), Math.floor(py)))) continue;
    const back = pr.type === 'tower' || pr.type === 'gate' ? 0.5 : pr.type === 'stall' ? 0.45 : 0.25;
    bakeAt(Math.floor(px), Math.floor(py)).addTemplate(tplProp(pr), placeAt(px, py - back));
  }
  const group = new THREE.Group();
  for (const key of ['lit', 'detail', 'glow', 'glowWin', 'grass', 'aura']) {
    const lists = bakes.map((b) => b.lists[key] || []);
    const total = lists.reduce((n, l) => n + partTris3(l), 0);
    if (!total) continue;
    for (const list of total > SPLIT3 ? lists : [lists.flat()]) {
      if (!list.length) continue;
      yield;
      worldMesh(group, key, mergeParts(list, false), lowGfx);
    }
  }
  // Randkulisse (seit 8.4): Wand und Ferne in einem eigenen Mesh ohne Umriss
  const farList = bakes.flatMap((b) => b.lists.far || []);
  if (farList.length) {
    yield;
    worldMesh(group, 'far', mergeParts(farList, false), lowGfx);
  }
  return group;
}

// Dreiecke einer Teile-Liste aus Bake3 (Vorlagen und einzelne Formen)
const partTris3 = (list) => list.reduce((n, it) => n + (it.tpl ? it.tpl.idx.length : it.geo.index ? it.geo.index.count : it.geo.attributes.position.count) / 3, 0);

// Mesh(es) einer Art mit dem passenden Material in die Gruppe des Blocks
function worldMesh(group, key, geo, lowGfx) {
  // Randkulisse: beleuchtet und mit Durchsicht um die Figur, aber ohne Umriss und ohne Schattenempfang
  if (key === 'far') {
    group.add(new THREE.Mesh(geo, worldLitMat()));
    return;
  }
  if (key === 'lit') {
    // Schatten der Welt sind in den Boden gebacken; hier nur empfangen (z. B. von Figuren)
    const m = new THREE.Mesh(geo, worldLitMat());
    m.receiveShadow = true;
    group.add(m);
    if (!lowGfx) group.add(new THREE.Mesh(geo, mat3('worldOutline', () => outlineMat(0.022, false))));
  } else if (key === 'glow') group.add(new THREE.Mesh(geo, worldGlowMat()));
  else if (key === 'detail') {
    // Kleinteile des Schmucks (seit 8.4): wie 'lit', aber ohne Umriss und ohne Wind
    const m = new THREE.Mesh(geo, worldLitMat());
    m.receiveShadow = true;
    group.add(m);
  } else if (key === 'glowWin') group.add(new THREE.Mesh(geo, mat3('worldWin', () => toonMat({ emissive: 0x6a4a20 }))));
  else if (key === 'grass') {
    const m = new THREE.Mesh(geo, worldGrassMat());
    m.receiveShadow = true;
    group.add(m);
  } else group.add(new THREE.Mesh(geo, worldAuraMat()));
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
    // Dungeon-Tor: Licht vor dem Wirbel (beleuchtet Podest und Stufen, ohne die Steine weiß zu waschen)
    if (n.id === 'eingang') lightSpots3.push({ x: n.x * U3, y: 1.3, z: n.y * U3 + 1.4, color: DUNGEONS[n.dungeon].portal, power: 1.0, range: 7 });
    if (n.id === 'ausgang') lightSpots3.push({ x: n.x * U3, y: 1.0, z: n.y * U3, color: DUNGEONS[n.dungeon].portal, power: 1.4, range: 7 });
  }
}
