// 3D-Welt: Bäume, Felsen, Häuser, Dorfmauer, Türme, Tore, Dorfschmuck, Brücken, Gras und Blumen.
// Je Block (16 × 16 Kacheln) wird alles zu wenigen Meshes zusammengebacken: ein beleuchtetes mit
// Umriss, eines für leuchtende Teile (Laternen, Glut, Feuer) und eines für Gras ohne Umriss.
// Dicht bebaute Blöcke bekommen diese Meshes je Viertel (siehe objectJob).
// Alle Formen sind weich abgerundet; Farben kommen aus denselben Tabellen wie im 2D-Spiel.

const WALL3_ROOF = '#3e4656';

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

// Grasfarbe je Boden; auf Wegen vereinzelt trockene Büschel
const GRASS3 = {
  [GROUND.GRASS]: '#4f8a34', [GROUND.MEADOW]: '#62a040', [GROUND.FOREST]: '#2e5a2a', [GROUND.SWAMP]: '#4a5a34', [GROUND.PATH]: '#7a8a3e'
};
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
// Schmuck ohne Kollision (seit 6.5): Baumstumpf, umgefallener Stamm, Pilze, Knochen, Busch, Kristalle, toter Baum
const DECO_COLORS = {
  frost: { wood: '#7a6a5a', crystal: '#bfe8ff', glow: false, cap: '#c84a3a', bush: '#5a7a6a' },
  vulkan: { wood: '#2a1a14', crystal: '#ff7a2a', glow: true, cap: '#8a3a2a', bush: '#4a3a2a' },
  titanenkamm: { wood: '#2a1a14', crystal: '#ffb04a', glow: true, cap: '#8a3a2a', bush: '#4a3a2a' },
  oedland: { wood: '#4a3a34', crystal: '#c8303a', glow: true, cap: '#6a4a3a', bush: '#5a4a3a' },
  moor: { wood: '#3a3428', crystal: '#8fe36a', glow: true, cap: '#7ad86a', capGlow: true, bush: '#3a4a2a' },
  donnerklamm: { wood: '#4a4440', crystal: '#9fd0ff', glow: true, cap: '#8a6a4a', bush: '#5a5a4a' },
  nagadschungel: { wood: '#5a3f2a', crystal: '#7ad8c8', glow: true, cap: '#e0a03a', bush: '#2f6a3a' }
};
const tplDeco = (d, style, v) => bakeTemplate(`deco:${d}:${style}:${v}`, (b) => {
  const c = Object.assign({ wood: '#6b4a2e', crystal: '#bfe8ff', glow: false, cap: '#c84a3a', bush: '#3f7a32' }, DECO_COLORS[style] || {});
  const bark = c.wood;
  if (d === DECO.STUMP) {
    b.add(lathe3('stump', [[0.2, 0], [0.17, 0.08], [0.15, 0.22], [0, 0.23]], 10), bark, { top: '#c8a070', topK: 0.25, shade: 0.3 });
    for (let k = 0; k < 3; k++) b.add(horn3(0.22, 0.05, 4), darker(bark, 0.1), { p: [Math.cos(k * 2.1) * 0.15, 0.03, Math.sin(k * 2.1) * 0.15], r: [Math.sin(k * 2.1) * 1.4, 0, -Math.cos(k * 2.1) * 1.4] });
    if (style === 'frost') b.add(sphere3(0.15, 8, 6), '#f4fbff', { p: [0, 0.23, 0], s: [1, 0.35, 1] });
  } else if (d === DECO.LOG) {
    b.add(limb3(1.0, 0.13, 0.11, 7), bark, { p: [-0.5, 0.12, 0], r: [0, 0, -Math.PI / 2], shade: 0.3 });
    b.add(cyl3(0.12, 0.12, 0.02, 8), '#c8a070', { p: [0.5, 0.12, 0], r: [0, 0, Math.PI / 2] });
    b.add(sphere3(0.12, 8, 6), style === 'moor' ? '#5a6a2a' : '#4f7a32', { p: [-0.1, 0.22, 0.02], s: [1.4, 0.4, 0.8] });
  } else if (d === DECO.MUSHROOM) {
    for (let k = 0; k < 3; k++) {
      const s = 0.7 + (k + v) % 3 * 0.25;
      const x = [-0.12, 0.1, 0.02][k];
      const z = [0.05, -0.06, 0.14][k];
      b.add(limb3(0.12 * s, 0.025 * s, 0.03 * s, 5), '#efe6cc', { p: [x, 0, z] });
      b.add(sphere3(0.09 * s, 8, 5), c.cap, { p: [x, 0.12 * s, z], s: [1, 0.7, 1], mat: c.capGlow ? 'glow' : 'lit' });
    }
  } else if (d === DECO.BONES) {
    b.add(sphere3(0.1, 8, 6), '#e8e0c8', { p: [0, 0.08, 0], s: [1, 0.85, 1.1] });
    for (const sx of [-1, 1]) b.add(sphere3(0.025, 5, 3), '#2a2018', { p: [sx * 0.04, 0.1, 0.09] });
    for (let k = 0; k < 3; k++) b.add(limb3(0.3, 0.025, 0.025, 4), '#e0d8c0', { p: [0.15 + k * 0.05, 0.03, -0.1 + k * 0.08], r: [0, k * 0.8, Math.PI / 2] });
    b.add(torus3(0.12, 0.02, Math.PI, 4, 10), '#e0d8c0', { p: [-0.18, 0.05, -0.1], r: [0, 0.5, 0] });
  } else if (d === DECO.SHRUB) {
    for (let k = 0; k < 4; k++) b.add(sphere3(0.16 - k * 0.02, 8, 6), k % 2 ? lighter(c.bush, 0.1) : c.bush, { p: [Math.cos(k * 1.7) * 0.14, 0.13 + (k % 2) * 0.06, Math.sin(k * 1.7) * 0.14], mat: 'grass', shade: 0.3 });
    if (style === 'wiesen') for (let k = 0; k < 3; k++) b.add(sphere3(0.03, 5, 3), '#e04a3a', { p: [Math.cos(k * 2) * 0.15, 0.26, Math.sin(k * 2) * 0.15] });
  } else if (d === DECO.CRYSTAL) {
    for (let k = 0; k < 4; k++) b.add(horn3(0.28 + (k % 2) * 0.16, 0.07, 5), k % 2 ? lighter(c.crystal, 0.2) : c.crystal, { p: [Math.cos(k * 1.6) * 0.1, 0, Math.sin(k * 1.6) * 0.1], r: [Math.sin(k * 1.6) * 0.4, 0, -Math.cos(k * 1.6) * 0.4], mat: c.glow ? 'glow' : 'lit', shine: 1 });
    b.add(rockGeo(v), '#5a5a62', { s: [0.18, 0.08, 0.16], p: [0, 0.02, 0] });
  } else if (d === DECO.DEADTREE) {
    // abgebrochener toter Baum: kurzer Stamm, zwei kahle Äste, gesplitterte Spitze
    b.add(limb3(0.7, 0.11, 0.07, 6), bark, { p: [0, 0, 0], shade: 0.35 });
    b.add(horn3(0.3, 0.07, 5), darker(bark, 0.1), { p: [0, 0.68, 0], r: [0.2, 0, 0.3] });
    b.add(limb3(0.35, 0.035, 0.015, 5), bark, { p: [0.04, 0.45, 0], r: [0, 0, -0.9] });
    b.add(limb3(0.28, 0.03, 0.012, 5), bark, { p: [-0.04, 0.35, 0.02], r: [0.3, 0, 1.0] });
    if (c.glow && style !== 'moor') b.add(limb3(0.25, 0.018, 0.012, 4), c.crystal, { p: [0.02, 0.2, 0.09], mat: 'glow' });
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
        b.addTemplate(tplDeco(d, style, h % 3), placeAt(x + 0.5 + jx * 3, y + 0.5 + jz * 3, rot, sc * (d === DECO.DEADTREE ? 2 : 1.4)));
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
  for (const key of ['lit', 'glow', 'glowWin', 'grass', 'aura']) {
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
  else if (key === 'glowWin') group.add(new THREE.Mesh(geo, mat3('worldWin', () => toonMat({ emissive: 0x6a4a20 }))));
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
