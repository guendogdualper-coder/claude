// Feuermagier neu (seit 13.39/13.40): Glutfeld, Feuertornados und ein echter 3D-Phönix.
// Gemeinsame Flammen-Grafik (seit 13.40): Flammenzungen als farbige Bilder mit hellem Kern, oranger Mitte und
// roten Spitzen, in vier Bildern als Daumenkino animiert (flackern statt roter Kleckse). Zielkreis für Glutfeld
// und Feuertornados (Zielen wie beim Blizzard: Kreis erscheint, Ort antippen oder Fertigkeit nochmal drücken).
// Ablauf je Zauber wie in magier-neu.js: SKILL_TYPES (eigener Spieler), MAGE2_REMOTE (Mitspieler: nur Bild),
// EXTRA_EFFECTS (2D) und FX3_DRAW (3D).
// Seit 14.3 „lebendiges Feuer“ für den ganzen Feuerweg: Flammenkörper mit eigenem Shader (flmFunnel, flmBall,
// flmSheet), Glutsplitter als Striche, Rauch, Asche, Brandspuren mit verästelten Glutrissen und ein geliehenes
// Punktlicht (fireLight3). Hier auch Inferno (inferno3) und der Klassensegen im Feuerweg; Feuerball, Explosion und
// Brand zeichnet magier-neu.js mit diesen Bausteinen, das Geschoss drei-fx.js, die Körperaura koerperaura.js.
// Keine Ringe, Runen oder Zeichen am Boden.

// --- Flammen-Bilder -------------------------------------------------------------------------------------
const FIRE_TEX = [];
function fireTex(f) {
  if (FIRE_TEX[f]) return FIRE_TEX[f];
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  // Grundglut unten
  const base = g.createRadialGradient(32, 112, 2, 32, 108, 30);
  base.addColorStop(0, 'rgba(255,240,190,0.9)');
  base.addColorStop(0.5, 'rgba(255,150,40,0.45)');
  base.addColorStop(1, 'rgba(255,90,20,0)');
  g.fillStyle = base;
  g.fillRect(0, 70, 64, 58);
  // Zungen: Mitte groß, zwei kleinere seitlich; Spitzen wiegen je Bild anders
  const sway = [0, 1, 0, -1][f];
  const tongue = (cx, top, w, bend, cols) => {
    const grad = g.createLinearGradient(0, 124, 0, top);
    cols.forEach(([s, col]) => grad.addColorStop(s, col));
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(cx - w, 120);
    g.bezierCurveTo(cx - w * 1.15, 92, cx - w * 0.35 + bend * 0.4, top + 36, cx + bend, top);
    g.bezierCurveTo(cx + w * 0.4 + bend * 0.5, top + 40, cx + w * 1.2, 94, cx + w, 120);
    g.quadraticCurveTo(cx, 128, cx - w, 120);
    g.fill();
  };
  const outer = [[0, '#ffe9a0'], [0.22, '#ffb23a'], [0.5, '#ff6a1a'], [0.8, '#d0280c'], [1, 'rgba(140,16,4,0)']];
  const inner = [[0, '#ffffff'], [0.3, '#fff2b0'], [0.7, '#ffc040'], [1, 'rgba(255,150,40,0)']];
  tongue(18 + sway, 46 + f * 3, 9, -6 + sway * 3, outer);
  tongue(46 + sway, 40 - f * 2, 9, 6 + sway * 3, outer);
  tongue(32, 6 + (f % 2) * 6, 17, sway * 5, outer);
  tongue(32, 44 + (f % 2) * 4, 9, sway * 3, inner);
  const t = new THREE.CanvasTexture(c);
  FIRE_TEX[f] = t;
  return t;
}
// eine flackernde Flamme: (x, yBase, z) Fußpunkt in 3D-Einheiten, w Breite, hh Höhe
function fire3(h, x, yBase, z, w, hh, t, seed, op, rot = 0) {
  if (op <= 0.01 || hh <= 0.01) return null;
  const f = Math.floor(t * 13 + seed * 3.7) & 3;
  const kind = 'fireN' + f;
  const o = fx3Take(h, kind);
  if (!o.userData.fireInit) {
    o.userData.fireInit = true;
    o.material.blending = THREE.NormalBlending;
    o.material.map = fireTex(f);
    o.material.needsUpdate = true;
  }
  const fl = 1 + 0.08 * Math.sin(t * 17 + seed * 5);
  o.position.set(x, yBase + hh * 0.5 * fl, z);
  o.scale.set(w * (1.04 - 0.08 * Math.sin(t * 13 + seed)), hh * fl, 1);
  o.material.rotation = rot;
  o.material.color.set('#ffffff');
  o.material.opacity = Math.min(1, op);
  return o;
}
// kleiner Funke (additiv)
function ember3(h, x, y, z, s, op, hot) {
  return n3Glow(h, x, y, z, s, hot ? FIRE3.core : FIRE3.hot, op);
}

// --- Lebendiges Feuer (seit 14.3) --------------------------------------------------------------------------
// Statt flacher Flammenbilder und gerader Kegel: Flammenkörper mit eigenem Shader. Rauschen zieht als Zungen
// nach oben, die Farbe läuft vom weißgelben Kern über Orange und Rot bis in dunklen Rauch. Gemischt wird
// vormultipliert (wie die Körperaura): heiße Stellen leuchten, Rauch und Saum decken ab – auf hellem Gras bleibt
// das Feuer farbig statt weiß. Drei Formen, alle aus dem Effekt-Vorrat (je Teil einmal angelegt, nie je Bild):
//   Trichter (flmFunnel): offener Zylinder, im Vertex-Shader zu Tornado, Feuersäule, Flammenwand oder
//     Flammenmantel verformt (Radius unten/oben, Verdrehung, Spiralbänder, schlängelnde Achse)
//   Kugel (flmBall): brodelnder Feuerball, nach hinten zum Schweif gezogen, kühlt zu Rauch ab (uCool)
//   Fläche (flmSheet): Gitter, dessen Punkte der Effekt setzt – Phönix-Flügel mit Federn und Schweifbänder
// 'niedrig' und 'mittel' (Handy): einfacheres Rauschen (FLM_LOW), 'niedrig' dazu weniger Teilchen. Dazu ein echtes Licht (fireLight3): das stärkste Feuer im Bild
// leiht sich eine der vier Punktlampen der Welt – Boden, Figur und Gegner glühen mit, ohne neue Shader.
const FLM3_GLSL = `
float flH(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float flN(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(flH(i), flH(i + vec3(1.0, 0.0, 0.0)), f.x), mix(flH(i + vec3(0.0, 1.0, 0.0)), flH(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(flH(i + vec3(0.0, 0.0, 1.0)), flH(i + vec3(1.0, 0.0, 1.0)), f.x), mix(flH(i + vec3(0.0, 1.0, 1.0)), flH(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}
vec3 flCol(float h) {
  vec3 c = mix(vec3(0.06, 0.035, 0.03), vec3(0.36, 0.05, 0.02), smoothstep(0.0, 0.2, h));
  c = mix(c, vec3(0.86, 0.16, 0.03), smoothstep(0.16, 0.42, h));
  c = mix(c, vec3(1.0, 0.48, 0.08), smoothstep(0.4, 0.66, h));
  c = mix(c, vec3(1.0, 0.8, 0.36), smoothstep(0.64, 0.86, h));
  return mix(c, vec3(1.0, 0.97, 0.86), smoothstep(0.86, 1.0, h));
}
vec4 flOut(float h, float a, float dim) {
  // heiß: fast nur Licht; kühl (Rauch, Saum): deckt ab
  float occ = mix(0.88, 0.18, smoothstep(0.3, 0.9, h));
  return vec4(flCol(h) * a * dim, a * occ);
}
`;
const FLM3_FUNNEL_VS = `
uniform float uT;
uniform float uSeed;
uniform float uH;
uniform float uR0;
uniform float uR1;
uniform float uPow;
uniform float uBend;
uniform float uWob;
uniform float uTwist;
uniform float uSpin;
uniform float uAng;
varying vec2 vQ;
varying float vE;
${FLM3_GLSL}
void main() {
  float v = clamp(position.y + 0.5, 0.0, 1.0);
  float ang = atan(position.z, position.x);
  float n = flN(vec3(cos(ang) * 1.7 * uAng + uSeed, v * 3.0 - uT * 1.4, sin(ang) * 1.7 * uAng));
  float r = mix(uR0, uR1, pow(v, uPow)) * (1.0 + uWob * (n - 0.5));
  vec2 off = uBend * v * vec2(sin(v * 3.1 + uT * 2.3 + uSeed), cos(v * 2.6 + uT * 1.9 + uSeed * 1.7));
  vec3 p = vec3(cos(ang) * r + off.x, v * uH, sin(ang) * r + off.y);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vec3 vn = normalize(normalMatrix * vec3(cos(ang), 0.0, sin(ang)));
  vE = abs(dot(vn, normalize(-mv.xyz)));
  vQ = vec2(ang + v * uTwist - uT * uSpin, v);
}`;
const FLM3_FUNNEL_FS = `
uniform float uT;
uniform float uSeed;
uniform float uOp;
uniform float uRise;
uniform float uBands;
uniform float uBandK;
uniform float uHeat;
uniform float uTop;
uniform float uBase;
uniform float uFront;
uniform float uBack;
uniform float uSmoke;
uniform float uDim;
uniform float uAng;
varying vec2 vQ;
varying float vE;
${FLM3_GLSL}
void main() {
  float a = vQ.x;
  float v = vQ.y;
  // uAng: Feinheit rundum (große Wände brauchen mehr Zungen als ein schmaler Tornado)
  float ca = cos(a) * uAng;
  float sa = sin(a) * uAng;
  float n = flN(vec3(ca * 1.5 + uSeed, sa * 1.5, v * 3.6 - uT * uRise));
#ifndef FLM_LOW
  n = n * 0.6 + flN(vec3(ca * 3.4, sa * 3.4 + uSeed, v * 8.5 - uT * uRise * 1.7) + 5.1) * 0.4;
#endif
  float band = 0.5 + 0.5 * sin(a * uBands);
  float d = mix(n, band * 0.75 + n * 0.35, uBandK);
  d += (1.0 - v) * uBase - smoothstep(uTop, 1.0, v) * 0.8;
  float al = smoothstep(0.36, 0.6, d) * smoothstep(0.0, 0.08, v);
  float h = clamp((d - 0.4) * 2.4, 0.0, 1.0) * uHeat * (1.0 - 0.4 * v);
  h *= 1.0 - uSmoke * smoothstep(0.4, 1.0, v);
  al *= 0.3 + 0.7 * smoothstep(0.0, 0.45, vE);
  // vordere Wand nach uFront, Innenseite dunkler und rauchiger (gibt Tiefe, ohne helle Ringe von oben)
  if (gl_FrontFacing) al *= uFront;
  else {
    al *= uBack;
    h *= 0.72;
  }
  gl_FragColor = flOut(clamp(h, 0.0, 1.0), al * uOp, uDim);
}`;
const FLM3_BALL_VS = `
uniform float uT;
uniform float uSeed;
uniform float uWob;
uniform float uTail;
varying vec3 vP;
varying float vE;
${FLM3_GLSL}
void main() {
  vec3 nr = normalize(position);
  float n = flN(nr * 2.2 + vec3(uSeed, -uT * 2.2, uT * 0.7));
  vec3 p = nr * (1.0 + uWob * (n - 0.5));
  float back = max(0.0, -nr.z);
  p.z -= uTail * back * back * (0.6 + 0.9 * n);
  vP = nr;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vE = abs(dot(normalize(normalMatrix * nr), normalize(-mv.xyz)));
}`;
const FLM3_BALL_FS = `
uniform float uT;
uniform float uSeed;
uniform float uOp;
uniform float uHeat;
uniform float uCool;
uniform float uRise;
uniform float uDim;
varying vec3 vP;
varying float vE;
${FLM3_GLSL}
void main() {
  float n = flN(vP * 3.0 + vec3(uSeed, -uT * uRise, uT * 0.3));
#ifndef FLM_LOW
  n = n * 0.6 + flN(vP * 7.0 + vec3(1.7, -uT * uRise * 1.6, uSeed)) * 0.4;
#endif
  float h = clamp((vE * 0.9 + (n - 0.5) * 0.75 + 0.12) * uHeat - uCool, 0.0, 1.0);
  float al = smoothstep(0.02, 0.4, vE + (n - 0.5) * 0.55 - uCool * 0.15);
  gl_FragColor = flOut(h, al * uOp, uDim);
}`;
const FLM3_SHEET_VS = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FLM3_SHEET_FS = `
uniform float uT;
uniform float uSeed;
uniform float uOp;
uniform float uKind;
uniform float uHeat;
uniform float uDim;
varying vec2 vUv;
${FLM3_GLSL}
void main() {
  float x = vUv.x;
  float y = vUv.y;
  float n = flN(vec3(x * 5.0 + uSeed, y * 3.0 - uT * 3.2, uT * 0.5));
#ifndef FLM_LOW
  n = n * 0.6 + flN(vec3(x * 12.0, y * 7.0 - uT * 5.0, uSeed + 3.0)) * 0.4;
#endif
  float al;
  float h;
  if (uKind < 0.5) {
    // Flügel (x Ansatz→Spitze, y Vorderkante→Hinterkante): Federn als Spitzen an der Hinterkante, außen länger
    float u = fract(x * 6.0 + 0.5);
    float tip = 1.0 - abs(u - 0.5) * 2.0;
    float edge = 0.45 + 0.48 * pow(tip, 0.45) * (0.55 + 0.45 * x);
    float d = edge - y + (n - 0.5) * 0.28;
    al = smoothstep(0.0, 0.12, d) * smoothstep(1.0, 0.86, x + (n - 0.5) * 0.1);
    h = (1.0 - y / max(0.3, edge)) * 0.75 + (1.0 - x) * 0.3 + (n - 0.5) * 0.45;
  } else {
    // Schweif (x Körper→Ende, y quer): drei wehende Flammenbänder, nach hinten schmaler
    float s = abs(sin(y * 9.4248 + sin(x * 4.0 - uT * 5.0 + uSeed) * 0.7));
    float d = s - 0.25 * x + (n - 0.5) * 0.45;
    al = smoothstep(0.2, 0.45, d) * smoothstep(1.0, 0.65, x) * smoothstep(0.0, 0.06, x);
    h = (1.0 - x) * 0.8 * (0.5 + 0.5 * s) + (n - 0.5) * 0.4 + 0.1;
  }
  gl_FragColor = flOut(clamp(h * uHeat, 0.0, 1.0), al * uOp, uDim);
}`;
const FLM3_SX = 12;
const FLM3_SY = 4;
function flm3Mesh(form, low) {
  const U = (v) => ({ value: v });
  const uniforms = { uT: U(0), uSeed: U(0), uOp: U(1), uDim: U(1), uHeat: U(1) };
  let geo;
  let vs;
  let fs;
  if (form === 'funnel') {
    if (!FX3.geo.flmFunnel) FX3.geo.flmFunnel = new THREE.CylinderGeometry(1, 1, 1, 40, 22, true);
    geo = FX3.geo.flmFunnel;
    Object.assign(uniforms, { uH: U(1), uR0: U(1), uR1: U(1), uPow: U(1), uBend: U(0), uWob: U(0.2), uTwist: U(0), uSpin: U(0),
      uRise: U(2), uBands: U(0), uBandK: U(0), uTop: U(0.5), uFront: U(1), uBack: U(0.8), uSmoke: U(0), uBase: U(0.2), uAng: U(1) });
    vs = FLM3_FUNNEL_VS;
    fs = FLM3_FUNNEL_FS;
  } else if (form === 'ball') {
    if (!FX3.geo.flmBall) FX3.geo.flmBall = new THREE.SphereGeometry(1, 22, 16);
    geo = FX3.geo.flmBall;
    Object.assign(uniforms, { uWob: U(0.3), uTail: U(0), uCool: U(0), uRise: U(2) });
    vs = FLM3_BALL_VS;
    fs = FLM3_BALL_FS;
  } else {
    // Fläche: eigenes Gitter je Teil (die Punkte setzt der Effekt in jedem Bild)
    geo = new THREE.BufferGeometry();
    const nv = (FLM3_SX + 1) * (FLM3_SY + 1);
    const uv = new Float32Array(nv * 2);
    const idx = [];
    for (let j = 0; j <= FLM3_SY; j++) {
      for (let i = 0; i <= FLM3_SX; i++) {
        const v = j * (FLM3_SX + 1) + i;
        uv[v * 2] = i / FLM3_SX;
        uv[v * 2 + 1] = j / FLM3_SY;
        if (i < FLM3_SX && j < FLM3_SY) idx.push(v, v + 1, v + FLM3_SX + 1, v + 1, v + FLM3_SX + 2, v + FLM3_SX + 1);
      }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    Object.assign(uniforms, { uKind: U(0) });
    vs = FLM3_SHEET_VS;
    fs = FLM3_SHEET_FS;
  }
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader: vs, fragmentShader: fs, defines: low ? { FLM_LOW: 1 } : {},
    transparent: true, depthWrite: false, fog: false,
    side: form === 'ball' ? THREE.FrontSide : THREE.DoubleSide,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor
  });
  const o = new THREE.Mesh(geo, mat);
  o.frustumCulled = false;
  return o;
}
const flmDim = () => 1 - 0.3 * (V3.nightK || 0);
// einfacheres Rauschen (eine Lage statt zwei) auf Niedrig und Mittel – Mittel ist die Stufe der Handys
const flmLowSh = () => typeof opts !== 'undefined' && (opts.graphics === 'niedrig' || opts.graphics === 'mittel');
// Formvorlagen für Trichter (einmal angelegt; je Aufruf nur Ort, Maße, Deckkraft und Saat)
// pow: wie schnell der Radius nach oben wächst, twist: Verdrehung der Bänder über die Höhe, spin: Drehtempo,
// bands/bandK: Zahl und Stärke der Spiralbänder, rise: Tempo der aufsteigenden Zungen, wob: Wellen im Umriss,
// bend: Schlängeln der Achse, top: ab welcher Höhe die Spitze zerfasert, front: Deckkraft der vorderen Wand,
// smoke: wie stark die Spitze zu Rauch auskühlt
const FLM_TORN = { pow: 1.35, twist: 10, spin: 6.5, bands: 3, bandK: 0.42, rise: 2.8, wob: 0.4, bend: 0.45, heat: 1, top: 0.6, front: 0.92, back: 0.6, smoke: 0.85, base: 0.12 };
const FLM_TORN_IN = { pow: 1.2, twist: 12, spin: 9, bands: 2, bandK: 0.45, rise: 3.8, wob: 0.3, bend: 0.35, heat: 1.05, top: 0.5, front: 0.8, back: 0.4, smoke: 0.3, base: 0.12 };
const FLM_PILLAR = { pow: 1, twist: 2.5, spin: 2, bands: 2, bandK: 0.2, rise: 3.6, wob: 0.45, bend: 0.15, heat: 1.05, top: 0.42, front: 0.9, back: 0.6, smoke: 0.55, base: 0.15 };
const FLM_WALL = { pow: 1, twist: 0.4, spin: 0.1, bands: 0, bandK: 0, rise: 2.6, wob: 0.05, bend: 0, heat: 1.25, top: 0.3, front: 0.6, back: 0.85, smoke: 0.35, base: 0.22 };
const FLM_SHEATH = { pow: 1, twist: 1.2, spin: 0.8, bands: 0, bandK: 0, rise: 3.2, wob: 0.35, bend: 0.06, heat: 1.2, top: 0.5, front: 0.6, back: 0.9, smoke: 0.4, base: 0.32 };
const FLM_ERUPT = { pow: 1.2, twist: 9, spin: 5, bands: 3, bandK: 0.5, rise: 3.4, wob: 0.35, bend: 0.15, heat: 1.2, top: 0.55, front: 0.22, back: 0.9, smoke: 0.5, base: 0.2 };
// Trichter am Fußpunkt (x,y,z): Höhe H, Radius unten r0 und oben r1, Deckkraft op, Saat, Vorlage S, Zeit t
function flmFunnel(h, x, y, z, H, r0, r1, op, seed, S, t, front) {
  if (op <= 0.01 || H <= 0.02) return null;
  const low = flmLowSh();
  const o = fx3Own(h, low ? 'flmFL' : 'flmF', () => flm3Mesh('funnel', low));
  o.position.set(x, y, z);
  const u = o.material.uniforms;
  u.uT.value = t % 600;
  u.uSeed.value = seed;
  u.uH.value = H;
  u.uR0.value = r0;
  u.uR1.value = r1;
  u.uOp.value = Math.min(1, op);
  u.uDim.value = flmDim();
  u.uPow.value = S.pow;
  u.uTwist.value = S.twist;
  u.uSpin.value = S.spin;
  u.uBands.value = S.bands;
  u.uBandK.value = S.bandK;
  u.uRise.value = S.rise;
  u.uWob.value = S.wob;
  u.uBend.value = S.bend;
  u.uHeat.value = S.heat;
  u.uTop.value = S.top;
  u.uFront.value = front ?? S.front;
  u.uBack.value = S.back;
  u.uSmoke.value = S.smoke;
  u.uBase.value = S.base;
  u.uAng.value = Math.max(1, (r0 + r1) * 0.65);
  return o;
}
// Feuerkugel in (x,y,z), Halbachsen sx/sy/sz; dir (optional, Einheitsvektor): Schweif zeigt entgegen
const _flmZ = new THREE.Vector3(0, 0, 1);
function flmBall(h, x, y, z, sx, sy, sz, op, seed, t, heat = 1, cool = 0, tail = 0, dir = null, wob = 0.32, rise = 2.2) {
  if (op <= 0.01) return null;
  const low = flmLowSh();
  const o = fx3Own(h, low ? 'flmBL' : 'flmB', () => flm3Mesh('ball', low));
  o.position.set(x, y, z);
  o.scale.set(sx, sy, sz);
  if (dir) o.quaternion.setFromUnitVectors(_flmZ, dir);
  else o.quaternion.set(0, 0, 0, 1);
  const u = o.material.uniforms;
  u.uT.value = t % 600;
  u.uSeed.value = seed;
  u.uOp.value = Math.min(1, op);
  u.uDim.value = flmDim();
  u.uHeat.value = heat;
  u.uCool.value = cool;
  u.uTail.value = tail;
  u.uWob.value = wob;
  u.uRise.value = rise;
  return o;
}
// Fläche: die Punkte setzt der Aufrufer mit flmPut (i 0…FLM3_SX entlang, j 0…FLM3_SY quer), danach flmDone
function flmSheet(h, kind, op, seed, t, heat = 1) {
  const low = flmLowSh();
  const o = fx3Own(h, low ? 'flmSL' : 'flmS', () => flm3Mesh('sheet', low));
  const u = o.material.uniforms;
  u.uT.value = t % 600;
  u.uSeed.value = seed;
  u.uOp.value = Math.min(1, op);
  u.uDim.value = flmDim();
  u.uKind.value = kind;
  u.uHeat.value = heat;
  return o;
}
function flmPut(o, i, j, x, y, z) {
  const a = o.geometry.attributes.position.array;
  const v = (j * (FLM3_SX + 1) + i) * 3;
  a[v] = x;
  a[v + 1] = y;
  a[v + 2] = z;
}
function flmDone(o) {
  o.geometry.attributes.position.needsUpdate = true;
}
// Glutsplitter und aufsteigende Funken als kurze Striche in Flugrichtung (vx,vy,vz in Einheiten je s)
function flmSpark(h, x, y, z, vx, vy, vz, len, w, color, op) {
  if (op <= 0.02) return null;
  const R = FX3.cam.r;
  const Up = FX3.cam.u;
  const sx = vx * R.x + vy * R.y + vz * R.z;
  const sy = vx * Up.x + vy * Up.y + vz * Up.z;
  const sp = Math.hypot(sx, sy);
  const o = fx3MageSprite(h, 'sprite', 'disc', x, y, z, w, Math.max(w, len * Math.min(1, sp * 0.25 + 0.3)), color, op);
  o.material.rotation = Math.atan2(sy, sx) - Math.PI / 2;
  return o;
}
// Asche: dunkle Flocken, die taumelnd aufsteigen (deckend)
function flmAsh(h, x, y, z, s, op) {
  return n3Smoke(h, x, y, z, s, '#2a201c', op);
}
// Teilchenmenge nach Grafikstufe (Niedrig 0,4 … Ultra 1,25)
function flmQ() {
  const g = typeof GRAPHICS !== 'undefined' && typeof opts !== 'undefined' && GRAPHICS[opts.graphics];
  return g ? g.particles : 1;
}
const flmN = (n) => Math.max(1, Math.round(n * flmQ()));

// Licht: das stärkste Feuer des Bildes leiht sich eine der vier Punktlampen (v3UpdateLights setzt sie jedes Bild
// neu, danach überschreibt FX3_HOOKS die schwächste). Keine neue Lampe: die Zahl der Lichter bleibt, kein neuer Shader.
const FLM3_L = { p: 0, x: 0, y: 0, z: 0, d: 8 };
function fireLight3(x, y, z, power, dist = 8) {
  if (!(power > FLM3_L.p)) return;
  FLM3_L.p = power;
  FLM3_L.x = x;
  FLM3_L.y = y;
  FLM3_L.z = z;
  FLM3_L.d = dist;
}
// (koerperaura.js hängt den Haken ans Ende, damit auch das Licht der Feuer-Aura im selben Bild gilt)
const FLM3_HOOK = { parts: [], fn() {
  const L = FLM3_L;
  if (L.p > 0.02 && V3.points && V3.points.length) {
    let best = V3.points[0];
    for (const l of V3.points) if (l.intensity < best.intensity) best = l;
    const fl = 0.86 + 0.1 * Math.sin(V3.time * 23) + 0.06 * Math.sin(V3.time * 37 + 1.3);
    // hoch über dem Feuer und mit begrenzter Reichweite: die Stufen der Toon-Beleuchtung fallen so außerhalb des
    // Lichtkegels – sonst zeichnete das Licht helle Ringe auf den Boden
    best.position.set(L.x, Math.max(L.y, 3.4), L.z);
    best.color.setRGB(1, 0.5, 0.2);
    best.distance = Math.min(L.d, 9.5);
    // am Tag nur ein warmer Hauch (sonst überstrahlt es das Gras gelb), nachts deutlich
    const nk = V3.nightK || 0;
    best.intensity = Math.min(1.1, L.p) * fl * (0.38 + 0.5 * nk);
  }
  L.p = 0;
} };
FX3_HOOKS.push(FLM3_HOOK);

// Brandspur am Boden (statt des flachen Ovals): unregelmäßige verkohlte Fläche mit glimmenden Adern
function flmBurnTex() {
  if (FX3.tex.fBurn) return FX3.tex.fBurn;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * 38;
    const x = 64 + Math.cos(a) * d;
    const y = 64 + Math.sin(a) * d;
    const r = 10 + rnd() * 22;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, 'rgba(255,255,255,0.5)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 128, 128);
  }
  // nach außen ausdünnen
  g.globalCompositeOperation = 'destination-in';
  const rg = g.createRadialGradient(64, 64, 20, 64, 64, 63);
  rg.addColorStop(0, 'rgba(0,0,0,1)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  FX3.tex.fBurn = t;
  return t;
}
// Glutrisse: verästelte Risse kreuz und quer über die Fläche (nicht strahlenförmig aus der Mitte), weich ausgeblendet
function flmCrackTex() {
  if (FX3.tex.fCracks) return FX3.tex.fCracks;
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  let s = 11;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const lines = [];
  const crack = (x, y, a, len, depth) => {
    const pts = [[x, y]];
    for (let d = 0; d < len; d += 9) {
      a += (rnd() - 0.5) * 0.9;
      x += Math.cos(a) * 9;
      y += Math.sin(a) * 9;
      pts.push([x, y]);
      if (depth < 2 && rnd() < 0.18) crack(x, y, a + (rnd() < 0.5 ? 1 : -1) * (0.6 + rnd() * 0.6), len * 0.45, depth + 1);
    }
    lines.push([pts, depth]);
  };
  for (let i = 0; i < 30; i++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * 190;
    crack(256 + Math.cos(a) * d, 256 + Math.sin(a) * d, rnd() * Math.PI * 2, 60 + rnd() * 110, 0);
  }
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const [w, al] of [[10, 0.12], [5, 0.35], [2.2, 1]]) {
    g.strokeStyle = `rgba(255,255,255,${al})`;
    for (const [pts, depth] of lines) {
      g.lineWidth = w * (depth ? 0.65 : 1);
      g.beginPath();
      pts.forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
    }
  }
  g.globalCompositeOperation = 'destination-in';
  const rg = g.createRadialGradient(256, 256, 120, 256, 256, 255);
  rg.addColorStop(0, 'rgba(0,0,0,1)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c);
  FX3.tex.fCracks = t;
  return t;
}
// verbrannter Boden: dunkle Brandfläche und glimmende Risse, die erkalten (glow 1 → 0)
function flmScorch(h, xPx, zPx, r, op, glow, rot) {
  flmBurnTex();
  mGround(h, 'planeNBurn', 'fBurn', xPx, zPx, r, 0.11, rot, '#1a0806', 0.85 * op, true);
  if (glow > 0.02) flmCracks(h, xPx, zPx, r * 0.9, glow * op, rot * 1.7, '#ff7a24');
}
function flmCracks(h, xPx, zPx, r, op, rot, color) {
  flmCrackTex();
  return mGround(h, 'planeFCrk', 'fCracks', xPx, zPx, r, 0.125, rot, color, op);
}

// --- Glutfeld --------------------------------------------------------------------------------------------
SKILL_TYPES.mfield = function (sk, pw) {
  const p = game.player;
  const pt = skillAimPoint(sk);
  faceTowards(pt.x, pt.y);
  lockPlayer(p, 0.3);
  input.walkTo = null;
  const x = Math.round(pt.x);
  const y = Math.round(pt.y);
  fieldFx(p, x, y, sk, true, pw);
  return { tx: x, ty: y };
};
function fieldDur(sk) {
  return sk.delay + sk.ticks * sk.every + 0.6;
}
function fieldFx(owner, x, y, sk, local, pw) {
  addEffect({ type: 'mfield3', x, y, R: sk.radius, delay: sk.delay, every: sk.every, ticks: sk.ticks, seed: Math.floor(Math.random() * 1000), dur: fieldDur(sk) });
  if (!local) return;
  for (let k = 0; k < sk.ticks; k++) {
    later(sk.delay + k * sk.every, () => {
      const last = k === sk.ticks - 1;
      for (const m of enemiesInCircle(x, y, sk.radius)) {
        // seit 13.69 betäubt jeder Puls kurz (sk.stun): Flammensäulen werfen die Gegner aus dem Tritt
        hitMonster(m, sk.dmg * pw, { skill: sk.id, burn: last ? sk.burn : null, stun: sk.stun, vfxColor: '#ff8a4a' });
      }
      if (k === 0 && owner === game.player) shakeScreen(2.5);
    });
  }
}
MAGE2_REMOTE.mfield = (rp, sk, d) => fieldFx(rp, d.tx ?? rp.x, d.ty ?? rp.y, sk, false, 0);

// Wo und wann die Feuersäulen aus dem Boden schlagen: je Puls drei bis vier Stellen im Kreis
function fieldBursts(e) {
  if (e._bursts) return e._bursts;
  const out = [];
  for (let k = 0; k < e.ticks; k++) {
    const n = 3 + ((k + e.seed) % 2);
    for (let i = 0; i < n; i++) {
      const s = e.seed + k * 7 + i;
      const a = n2h(s, 1) * Math.PI * 2;
      const d = Math.sqrt(n2h(s, 2)) * e.R * 0.78;
      out.push({ at: e.delay + k * e.every + n2h(s, 3) * e.every * 0.6, x: e.x + Math.cos(a) * d, y: e.y + Math.sin(a) * d, big: n2h(s, 4), s });
    }
  }
  e._bursts = out;
  return out;
}

// --- 2D (seit 14.3): dieselben Flammenbilder wie in 3D statt glatter Kreise -----------------------------------
// eine lodernde Flamme mit Fußpunkt (x,y), Breite w, Höhe hh
function flame2d(ctx, x, y, w, hh, t, seed, a, rot = 0) {
  if (a <= 0.02 || hh <= 1) return;
  const f = Math.floor(t * 13 + seed * 3.7) & 3;
  const img = fireTex(f).image;
  const fl = 1 + 0.08 * Math.sin(t * 17 + seed * 5);
  ctx.globalAlpha = Math.min(1, a);
  if (rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.drawImage(img, -w / 2, -hh * fl, w, hh * fl);
    ctx.restore();
  } else ctx.drawImage(img, x - w / 2, y - hh * fl, w, hh * fl);
}
// Glut als kleiner Strich, Rauch als dunkler weicher Fleck
function spark2d(ctx, x, y, len, col, a) {
  if (a <= 0.02) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + len * 0.15, y - len);
  ctx.stroke();
}
function smoke2d(ctx, x, y, r, a) {
  if (a <= 0.02) return;
  ctx.globalAlpha = 1;
  glow2(ctx, x, y, r, '#2a1e1a', a);
}
EXTRA_EFFECTS.mfield3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start;
  const on = clamp01(t / Math.max(0.05, e.delay));
  const out = clamp01((e.dur - t) / 0.5);
  const vis = on * out;
  ctx.save();
  // verkohlter Boden in Flecken (kein glatter Kreis)
  for (let i = 0; i < 7; i++) {
    const a = n2h(i, e.seed) * Math.PI * 2;
    const d = Math.sqrt(n2h(i, e.seed + 1)) * e.R * 0.6;
    glow2(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, e.R * 0.5, '#1a0806', 0.45 * vis);
  }
  ctx.globalCompositeOperation = 'lighter';
  glow2(ctx, x, y - 10, e.R * 0.8, '#ff5a1a', 0.25 * vis);
  ctx.globalCompositeOperation = 'source-over';
  // Flammen am Rand und Feuersäulen
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + e.seed;
    const r = e.R * (0.82 + 0.15 * n2h(i, 5));
    flame2d(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, 12, (16 + 10 * n2h(i, 6)) * vis, t, i, 0.9 * vis);
  }
  for (const b of fieldBursts(e)) {
    const age = t - b.at;
    if (age < 0 || age > 0.9) continue;
    const u = age / 0.9;
    const rise = u < 0.2 ? easeOut(u / 0.2) : 1 - ((u - 0.2) / 0.8) * 0.6;
    const bx = x + (b.x - e.x);
    const by = y + (b.y - e.y) * 0.6;
    flame2d(ctx, bx, by, 22 + 10 * b.big, (50 + 30 * b.big) * rise, t, b.s, 1 - Math.max(0, u - 0.6) / 0.4);
    if (u > 0.4) smoke2d(ctx, bx, by - 60 * rise - u * 30, 12 + u * 14, 0.4 * (1 - u));
  }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 10; i++) {
    const ph = (t * 0.9 + n2h(i, 8)) % 1;
    const a = n2h(i, 9) * Math.PI * 2;
    const d = Math.sqrt(n2h(i, 10)) * e.R * 0.9;
    spark2d(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6 - ph * 70, 5, i % 2 ? '#ffd36a' : '#fff1c8', (1 - ph) * vis);
  }
  ctx.restore();
};

FX3_TYPES.add('mfield3');
// seit 14.3: kein heller Ring mehr am Rand. Der Boden verkohlt unregelmäßig und reißt glühend auf, am Rand lodert
// ein Flammenvorhang mit ungleich hohen Zungen (vorn durchscheinend), Feuersäulen schlagen gedreht aus der Erde
// und sprühen Glutsplitter, Rauch und Asche steigen auf, und das Feuer wirft echtes Licht auf Boden und Gegner.
FX3_DRAW.mfield3 = function (h, e) {
  const t = game.time - e.start;
  const low = n3low();
  const on = clamp01(t / Math.max(0.05, e.delay));
  const out = clamp01((e.dur - t) / 0.55);
  const vis = on * out;
  const R = e.R * U3;
  const cx = e.x * U3;
  const cz = e.y * U3;
  // verbrannter Boden und Glutrisse (wachsen beim Aufreißen, erkalten am Ende)
  const grow = 0.35 + 0.65 * easeOut(on);
  flmScorch(h, e.x, e.y, R * 1.12 * grow, vis, 0, e.seed * 0.37);
  flmCracks(h, e.x, e.y, R * 1.05 * grow, 0.95 * vis, e.seed * 0.1, '#ff7a24');
  flmCracks(h, e.x, e.y, R * 0.7 * grow, 0.75 * vis, -e.seed * 0.07 + 1.3, '#ffd27a');
  if (vis <= 0.01) return;
  // Glutflammen lodern verstreut aus den Rissen (ungleich hoch, nie im Kreis aufgereiht)
  const nf = low ? 4 : flmN(7);
  for (let i = 0; i < nf; i++) {
    const a = n2h(i, e.seed + 31) * Math.PI * 2;
    const d = (0.25 + 0.7 * Math.sqrt(n2h(i, e.seed + 32))) * R;
    const fl = 0.75 + 0.25 * Math.sin(t * (5 + i) + i * 2) + 0.15 * Math.sin(t * 11.3 + i);
    const H = (0.55 + 0.7 * n2h(i, e.seed + 33)) * fl * vis;
    flmFunnel(h, cx + Math.cos(a) * d, 0, cz + Math.sin(a) * d, H, 0.22 + 0.1 * n2h(i, 34), 0.08, 0.95 * vis, i * 1.37 + e.seed, FLM_PILLAR, t);
  }
  // Feuersäulen: schießen gedreht hoch, lodern und sinken zu Rauch zusammen
  let heat = 0;
  for (const b of fieldBursts(e)) {
    const age = t - b.at;
    if (age < 0 || age > 0.95) continue;
    const u = age / 0.95;
    const rise = u < 0.18 ? easeOut(u / 0.18) : 1 - ((u - 0.18) / 0.82) * 0.6;
    const H = (1.9 + 1.2 * b.big) * rise;
    const x = b.x * U3;
    const z = b.y * U3;
    const op = 1 - Math.max(0, u - 0.55) / 0.45;
    const rb = 0.3 + 0.16 * b.big;
    flmFunnel(h, x, 0, z, H, rb, rb * 0.35, op, b.s * 0.71, FLM_PILLAR, t);
    heat += op * (u < 0.3 ? 1.4 : 0.7);
    if (u < 0.2) n3Glow(h, x, 0.25, z, 1.2 + b.big, FIRE3.hot, 0.7 * (1 - u / 0.2));
    // Glutsplitter fliegen aus der Säule
    const sp = low ? 2 : flmN(6);
    for (let j = 0; j < sp; j++) {
      const ja = n2h(j, b.s) * Math.PI * 2;
      const vh = 1.2 + 1.6 * n2h(j, b.s + 3);
      const vy = 3.2 + 2.4 * n2h(j, b.s + 5);
      const tt = age;
      const px = x + Math.cos(ja) * vh * tt;
      const pz = z + Math.sin(ja) * vh * tt;
      const py = 0.4 + vy * tt - 4.5 * tt * tt;
      if (py < 0.05) continue;
      flmSpark(h, px, py, pz, Math.cos(ja) * vh, vy - 9 * tt, Math.sin(ja) * vh, 0.32, 0.07, j % 2 ? FIRE3.hot : FIRE3.core, 1 - u);
    }
    // Rauchstoß, wenn die Säule zusammensinkt
    if (!low && u > 0.4) {
      const k = (u - 0.4) / 0.6;
      n3Smoke(h, x + Math.sin(b.s) * 0.2, H + 0.3 + k * 1.2, z, 0.8 + k * 1.1, '#2a1c18', 0.42 * (1 - k));
    }
  }
  // Glut steigt über dem ganzen Feld auf (Striche, die leicht taumeln), dazu Asche und dünne Rauchschwaden
  const em = low ? 6 : flmN(18);
  for (let i = 0; i < em; i++) {
    const ph = (t * (0.7 + 0.4 * n2h(i, 7)) + n2h(i, 8)) % 1;
    const a = n2h(i, 9) * Math.PI * 2;
    const d = Math.sqrt(n2h(i, 10)) * R * 0.9;
    const sw = Math.sin(t * 3 + i) * 0.25;
    flmSpark(h, cx + Math.cos(a) * d + sw * ph, 0.15 + ph * 2.6, cz + Math.sin(a) * d, Math.cos(t * 3 + i) * 0.7, 2.2, 0, 0.16, 0.06, i % 3 ? FIRE3.hot : FIRE3.core, (ph < 0.1 ? ph * 10 : 1 - ph) * vis);
  }
  if (!low) {
    const ash = flmN(6);
    for (let i = 0; i < ash; i++) {
      const ph = (t * 0.35 + n2h(i, 21)) % 1;
      const a = n2h(i, 22) * Math.PI * 2;
      const d = Math.sqrt(n2h(i, 23)) * R * 0.8;
      flmAsh(h, cx + Math.cos(a) * d + Math.sin(t * 2 + i) * 0.2, 0.6 + ph * 3, cz + Math.sin(a) * d, 0.07, 0.8 * Math.sin(ph * Math.PI) * vis);
    }
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.3 + i / 3) % 1;
      const a = e.seed + i * 2.1;
      n3Smoke(h, cx + Math.cos(a) * R * 0.45, 0.8 + ph * 2.4, cz + Math.sin(a) * R * 0.4, 1.3 + ph * 1.4, '#2e2420', 0.22 * Math.sin(ph * Math.PI) * vis);
    }
  }
  fireLight3(cx, 2.2, cz, (0.7 + Math.min(0.6, heat * 0.3)) * vis, R * 2.6);
};

// --- Feuertornados (seit 13.40, statt Flammenkreis) ----------------------------------------------------
// Im gewählten Kreis wirbeln Feuertornados umher, ziehen Gegner leicht an und treffen alles, was sie berühren.
// Zahl der Tornados wächst mit der Fertigkeit: Stufe 1–7: 2, 8–15: 3, E: 4, H: 5, L: 6, V: 7.
function tornadoCount(lvl) {
  const r = typeof skillRank === 'function' ? skillRank(lvl) : -1;
  if (r >= 0) return 4 + r;
  return lvl >= 8 ? 3 : 2;
}
// Weg eines Tornados (für Treffer und Bild gleich): Schleifen im Feld, nie über den Rand
function tornadoPos(e, i, t) {
  const a0 = n2h(e.seed + i, 1) * Math.PI * 2;
  const w = 0.7 + n2h(e.seed + i, 2) * 0.6;
  const r = e.R * (0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * w * 1.3 + i * 2.1)));
  const a = a0 + t * w * (i % 2 ? 1 : -1);
  return { x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r };
}
SKILL_TYPES.mtornado = function (sk, pw, lvl) {
  const p = game.player;
  const pt = skillAimPoint(sk);
  faceTowards(pt.x, pt.y);
  lockPlayer(p, 0.35);
  input.walkTo = null;
  const x = Math.round(pt.x);
  const y = Math.round(pt.y);
  const n = tornadoCount(lvl);
  const seed = Math.floor(Math.random() * 1000);
  tornadoFx(p, x, y, sk, n, seed, true, pw);
  return { tx: x, ty: y, n, sd: seed };
};
function tornadoFx(owner, x, y, sk, n, seed, local, pw) {
  const e = addEffect({ type: 'mtornado3', x, y, R: sk.radius, n, seed, delay: sk.delay, life: sk.life, dur: sk.delay + sk.life + 0.6 });
  if (owner === game.player) shakeScreen(2);
  if (!local) return;
  const ticks = Math.round(sk.life / sk.every);
  for (let k = 0; k < ticks; k++) {
    later(sk.delay + k * sk.every, () => {
      const tt = k * sk.every;
      const last = k === ticks - 1;
      for (let i = 0; i < n; i++) {
        const c = tornadoPos(e, i, tt);
        for (const m of enemiesInCircle(c.x, c.y, sk.hitR)) {
          hitMonster(m, sk.dmg * pw, { skill: sk.id, burn: last || k % 3 === 2 ? sk.burn : null, vfxColor: '#ffb04a' });
          // leichter Sog zur Mitte des Tornados (nicht bei Steinen und Bossen)
          if (!m.isStone && !(m.type && (m.type.boss || m.type.raid))) {
            m.x += (c.x - m.x) * 0.18;
            m.y += (c.y - m.y) * 0.18;
          }
        }
      }
    });
  }
}
MAGE2_REMOTE.mtornado = (rp, sk, d) => tornadoFx(rp, d.tx ?? rp.x, d.ty ?? rp.y, sk, d.n || 2, d.sd || 1, false, 0);

// 2D (seit 14.89 neu): ein echter Wirbeltrichter statt einzelner schräger Flammenketten. Der Körper ist ein Stapel
// glühender Scheiben (unten eng, oben weit, die Achse schwingt), darüber laufen drei Glutbänder als Schraube um den
// Trichter (hinten dunkler, vorn hell), am Fuß lodern Flammen, oben quellen Rauch und Funken heraus.
EXTRA_EFFECTS.mtornado3 = (ctx, e, k, x, y) => {
  const t = game.time - e.start - e.delay;
  if (t < 0 || t > e.life) return;
  const vis = easeOut(clamp01(t / 0.45)) * clamp01((e.life - t) / 0.55);
  const H = 118 * vis;
  const SL = 16;
  ctx.save();
  for (let i = 0; i < e.n; i++) {
    const c = tornadoPos(e, i, t);
    const bx = x + (c.x - e.x);
    const by = y + (c.y - e.y) * 0.7;
    const ph = i * 1.7;
    // Achse und Breite je Höhe v (0 = Boden, 1 = oben)
    const ax = (v) => bx + Math.sin(t * 3.1 + v * 3.4 + ph) * 9 * v;
    const rw = (v) => (6 + 30 * Math.pow(v, 1.35)) * vis;
    // Schatten und Glut am Boden
    glow2(ctx, bx, by + 2, 26 * vis, '#1a0806', 0.4 * vis);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, bx, by - 4, 30 * vis, '#ff5a1a', 0.45 * vis);
    // Körper: Scheiben von unten nach oben, rot außen, gelb im Kern
    for (let j = 0; j <= SL; j++) {
      const v = j / SL;
      const cx = ax(v);
      const cy = by - v * H;
      const r = rw(v);
      glow(ctx, cx, cy, r * 1.2, v < 0.35 ? '#ff8a2a' : '#e8361a', (0.3 + 0.15 * (1 - v)) * vis);
      glow(ctx, cx, cy, r * 0.45, '#ffe08a', 0.16 * (1 - v * 0.7) * vis);
    }
    // drei Glutbänder als Schraube um den Trichter (normal gemischt, sonst werden sie weiß)
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    for (let b = 0; b < 3; b++) {
      for (let j = 0; j < 22; j++) {
        const v0 = j / 22;
        const v1 = (j + 1) / 22;
        const a0 = -t * 9 + v0 * 9 + b * 2.09 + ph;
        const a1 = -t * 9 + v1 * 9 + b * 2.09 + ph;
        const front = Math.sin((a0 + a1) / 2);
        ctx.globalAlpha = (front > 0 ? 0.85 : 0.35) * vis * (1 - v0 * 0.3);
        ctx.strokeStyle = front > 0 ? (b === 0 ? '#ffc85a' : '#ff8a2a') : '#b8300e';
        ctx.lineWidth = (front > 0 ? 3.2 : 2) * (0.6 + v0 * 0.7);
        ctx.beginPath();
        ctx.moveTo(ax(v0) + Math.cos(a0) * rw(v0), by - v0 * H + Math.sin(a0) * rw(v0) * 0.28);
        ctx.lineTo(ax(v1) + Math.cos(a1) * rw(v1), by - v1 * H + Math.sin(a1) * rw(v1) * 0.28);
        ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';
    ctx.globalCompositeOperation = 'source-over';
    // Flammen am Fuß, nach außen geneigt
    for (let j = 0; j < 5; j++) {
      const a = -t * 6 + j * 1.26 + ph;
      flame2d(ctx, bx + Math.cos(a) * 12 * vis, by + Math.sin(a) * 4, 16, 30 * vis, t, j + i * 5, 0.9 * vis, Math.cos(a) * 0.35);
    }
    // Rauch und Funken oben heraus
    smoke2d(ctx, ax(1) + Math.sin(t * 1.3 + i) * 10, by - H - 8 - ((t * 0.6) % 1) * 18, 24 * vis, 0.35 * vis);
    ctx.globalCompositeOperation = 'lighter';
    for (let j = 0; j < 6; j++) {
      const q = (t * 0.9 + n2h(j, i)) % 1;
      const a = -t * 9 + q * 9 + j * 1.05;
      spark2d(ctx, ax(q) + Math.cos(a) * rw(q) * 1.1, by - q * H - 6, 5, j % 2 ? '#ffd36a' : '#fff1c8', (1 - q) * vis);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
};

// eigene Körper aus dem Effekt-Vorrat (wie fx3Take, aber mit eigener Form)
function fx3Own(h, kind, make) {
  const pool = FX3.pools[kind] || (FX3.pools[kind] = []);
  let o = pool.pop();
  if (!o) {
    o = make();
    o.userData.kind = kind;
    o.renderOrder = 5;
    FX3.group.add(o);
  }
  o.visible = true;
  h.parts.push(o);
  return o;
}

// Feuertornado (seit 14.3 statt zweier gerader Kegel): eine echte Feuerhose. Der Trichter ist unten eng und weitet
// sich nach oben, die Achse schlängelt sich, Flammenbänder laufen als Schraube um ihn herum und drehen mit; oben
// kühlt er zu Rauch aus. Darin ein heißerer, schneller drehender Kern. Am Fuß wirbelt Staub und Rauch im Kreis,
// Glut wird die Schraube hinaufgerissen und oben herausgeschleudert. Nichts am Boden außer etwas Brandspur.
FX3_TYPES.add('mtornado3');
FX3_DRAW.mtornado3 = function (h, e) {
  const T = game.time - e.start;
  const low = n3low();
  const out = clamp01((e.dur - T) / 0.6);
  const t = T - e.delay;
  // Brandspur, wo die Tornados wüten (unregelmäßig, kein Kreis)
  flmScorch(h, e.x, e.y, e.R * U3 * 1.05, 0.6 * out * clamp01(T / 0.8), 0, e.seed * 0.29);
  // beim Wirken: Hitze sammelt sich, Funken wirbeln zur Mitte
  if (T < e.delay + 0.3) {
    const k = clamp01(T / Math.max(0.05, e.delay));
    for (let j = 0; j < (low ? 5 : 12); j++) {
      const a = j * 0.52 + T * 7;
      const r = e.R * U3 * (1 - k) * (0.6 + 0.4 * n2h(j, 3));
      flmSpark(h, e.x * U3 + Math.cos(a) * r, 0.3 + k * 0.8, e.y * U3 + Math.sin(a) * r, -Math.sin(a) * 3, 1, Math.cos(a) * 3, 0.25, 0.07, FIRE3.hot, 0.9);
    }
  }
  if (t < 0) return;
  const grow = easeOut(clamp01(t / 0.5));
  const fade = clamp01((e.life - t) / 0.55);
  const vis = grow * fade;
  let lx = 0;
  let lz = 0;
  for (let i = 0; i < e.n; i++) {
    const c = tornadoPos(e, i, t);
    const x = c.x * U3;
    const z = c.y * U3;
    lx += x;
    lz += z;
    const H = (3.9 + 0.4 * n2h(i, e.seed)) * grow;
    const top = 0.95 * grow;
    const sd = e.seed * 0.1 + i * 1.7;
    // außen: Feuerhose mit Spiralbändern, die oben zu Rauch wird; innen: heißer Kern
    flmFunnel(h, x, 0, z, H, 0.24, top, 0.95 * fade, sd, FLM_TORN, t + i * 0.37);
    if (!low) flmFunnel(h, x, 0, z, H * 0.8, 0.1, top * 0.45, 0.85 * fade, sd + 3.3, FLM_TORN_IN, t + i * 0.21);
    n3Glow(h, x, 0.35, z, 0.9 * vis, FIRE3.hot, 0.35 * vis);
    // Staub und Rauch wirbeln am Fuß im Kreis (in der Luft, nicht am Boden)
    const db = low ? 2 : flmN(4);
    for (let j = 0; j < db; j++) {
      const a = t * 5.5 + (j / db) * Math.PI * 2 + i;
      const rr = 0.55 + 0.25 * Math.sin(t * 3 + j);
      n3Smoke(h, x + Math.cos(a) * rr, 0.22 + 0.1 * j, z + Math.sin(a) * rr, 0.7 + 0.2 * Math.sin(t * 4 + j), j % 2 ? '#4a3626' : '#2e2420', 0.4 * vis);
    }
    // Glut wird die Schraube hinaufgerissen (gleiche Drehung wie die Bänder) und oben herausgeschleudert
    const sp = low ? 4 : flmN(11);
    for (let j = 0; j < sp; j++) {
      const ph = (t * (0.65 + 0.3 * n2h(j, i + 4)) + n2h(j, i)) % 1;
      const v = Math.min(1, ph * 1.15);
      const a = -t * 6.5 - v * 7.5 + j * 2.4;
      const rr = (0.24 + (top - 0.24) * Math.pow(v, 1.35)) * 1.1 + (ph > 0.87 ? (ph - 0.87) * 6 : 0);
      const tx = -Math.sin(a);
      const tz = Math.cos(a);
      flmSpark(h, x + Math.cos(a) * rr, v * H, z + Math.sin(a) * rr, tx * -4, 2.4, tz * -4, 0.24, 0.07, j % 3 ? FIRE3.hot : FIRE3.core, 0.95 * (1 - ph * 0.7) * vis);
    }
    // Flammenzungen lecken außen am Trichter (laufen mit der Schraube nach oben)
    if (!low) {
      for (let j = 0; j < 3; j++) {
        const v = 0.15 + ((t * 0.5 + j / 3) % 1) * 0.6;
        const a = -t * 6.5 - v * 10 + j * 2.1 + i;
        const rr = (0.24 + (top - 0.24) * Math.pow(v, 1.35)) * 1.05;
        fire3(h, x + Math.cos(a) * rr, v * H - 0.15, z + Math.sin(a) * rr, 0.45 * grow, 0.8 * grow, t + j * 0.4, i * 7 + j, 0.85 * fade, Math.cos(a) * 0.5);
      }
    }
    // Rauch quillt oben heraus und treibt ab
    if (!low) {
      for (let j = 0; j < 2; j++) {
        const ph = (t * 0.45 + i * 0.3 + j * 0.5) % 1;
        n3Smoke(h, x + Math.sin(t + j * 3 + i) * 0.4, H + 0.1 + ph * 1.4, z + Math.cos(t * 0.7 + j) * 0.3, 1.1 + ph * 1.3, '#2a2220', 0.38 * (1 - ph) * vis);
      }
      flmAsh(h, x + Math.sin(t * 4 + i) * top, H * 0.7 + Math.sin(t * 2 + i) * 0.4, z + Math.cos(t * 4 + i) * top, 0.07, 0.7 * vis);
    }
  }
  if (e.n) fireLight3(lx / e.n, 2.6, lz / e.n, 1.1 * vis, e.R * U3 * 2.4);
};

// --- Phönixflamme in 3D (seit 13.40, seit 14.3 aus lebendigem Feuer) ---------------------------------------
// Ein Feuervogel mit klarem Umriss: zwei breite Flügel aus Flammenfedern (Fläche mit Federspitzen an der
// Hinterkante), die in einer Welle von der Schulter zur Spitze schlagen und nach hinten gefegt sind, ein brodelnder
// Leib, ein heller Kopf mit Schnabel und Federkamm, ein Schweif aus drei wehenden Flammenbändern. Hinter ihm eine
// Spur aus Flammen, Glut und Rauch. Am Ziel stürzt er herab und steigt als Feuersilhouette mit hochgerissenen
// Flügeln aus der Explosion (mburst3) auf. Nichts am Boden.
const _phF = new THREE.Vector3();
const _phB = new THREE.Vector3();
const _phS = new THREE.Vector3();
const _phU = new THREE.Vector3();
const _phD = new THREE.Vector3();
const _phP = new THREE.Vector3();
const _phQ = new THREE.Vector3();
// Flügel: Ansatz (rx,ry,rz), Seite s (±1), Spannweite span, Schlagwinkel je Stelle ang(x), Tiefe chord
function phxWing(h, rx, ry, rz, s, span, chord, t, flapT, amp, base, sweep, op, seed) {
  const o = flmSheet(h, 0, op, seed, t, 1.05);
  _phP.set(rx, ry, rz);
  const seg = span / FLM3_SX;
  for (let i = 0; i <= FLM3_SX; i++) {
    const x = i / FLM3_SX;
    if (i > 0) {
      // Welle von der Schulter zur Spitze: die Spitze schlägt nach
      const ang = base + amp * Math.sin(flapT - x * 1.5);
      _phD.copy(_phS).multiplyScalar(s * Math.cos(ang)).addScaledVector(_phU, Math.sin(ang)).addScaledVector(_phB, sweep * (0.15 + 0.7 * x)).normalize();
      _phP.addScaledVector(_phD, seg);
    }
    const c = chord * (1 - 0.5 * x) + 0.12;
    for (let j = 0; j <= FLM3_SY; j++) {
      const y = j / FLM3_SY;
      // Vorderkante etwas vor der Knochenlinie, leicht gewölbt
      const along = -0.12 * c + y * c * 1.7;
      const camber = Math.sin(y * Math.PI) * 0.08 * c;
      flmPut(o, i, j, _phP.x + _phB.x * along + _phU.x * camber, _phP.y + _phB.y * along + _phU.y * camber, _phP.z + _phB.z * along + _phU.z * camber);
    }
  }
  flmDone(o);
  return o;
}
// Schweif: vom Rücken nach hinten, fächert auf und weht
function phxTail(h, x, y, z, len, t, op, seed) {
  const o = flmSheet(h, 1, op, seed, t, 1.05);
  for (let i = 0; i <= FLM3_SX; i++) {
    const v = i / FLM3_SX;
    const sway = Math.sin(t * 6 - v * 3) * 0.3 * v;
    const w = 0.22 + 0.55 * v;
    const cx = x + _phB.x * (0.3 + v * len) + _phS.x * sway;
    const cy = y + _phB.y * (0.3 + v * len) - 0.15 * v + Math.sin(t * 4 - v * 2) * 0.12 * v;
    const cz = z + _phB.z * (0.3 + v * len) + _phS.z * sway;
    for (let j = 0; j <= FLM3_SY; j++) {
      const q = (j / FLM3_SY - 0.5) * 2 * w;
      flmPut(o, i, j, cx + _phS.x * q, cy, cz + _phS.z * q);
    }
  }
  flmDone(o);
  return o;
}

FX3_DRAW.mphoenix3 = function (h, e) {
  const t = game.time - e.start;
  const low = n3low();
  const x0 = e.x0 * U3;
  const z0 = e.y0 * U3;
  const x1 = e.x1 * U3;
  const z1 = e.y1 * U3;
  const dx = x1 - x0;
  const dz = z1 - z0;
  const L = Math.hypot(dx, dz) || 1;
  const fx = dx / L;
  const fz = dz / L;
  // Bahn: steigt aus dem Zepter auf, gleitet hoch und stürzt am Ende herab
  const yAt = (v) => 1.0 + Math.sin(Math.min(1, v) * Math.PI * 0.8) * 1.7 - Math.pow(Math.max(0, v - 0.72) / 0.28, 2) * 1.9;
  const u = Math.min(1, t / e.fly);
  _phS.set(-fz, 0, fx);
  if (t <= e.fly + 0.05) {
    const x = x0 + dx * u;
    const z = z0 + dz * u;
    const y = yAt(u);
    const dive = u > 0.72 ? (u - 0.72) / 0.28 : 0;
    _phF.set(fx, -0.9 * dive, fz).normalize();
    _phB.copy(_phF).negate();
    _phU.crossVectors(_phS, _phF).normalize();
    const grow = clamp01(t / 0.16);
    const span = 2.5 * grow;
    // Flügelschlag: kräftig nach unten, beim Sturz angelegt
    const flapT = t * 10.5;
    const amp = dive ? 0.3 : 0.48;
    const base = dive ? -0.15 : -0.06;
    for (const s of [-1, 1]) {
      phxWing(h, x + _phS.x * s * 0.16, y + 0.05, z + _phS.z * s * 0.16, s, span, 0.95 * grow, t, flapT, amp, base, 0.45 + dive * 0.4, 1, s * 3.1);
    }
    phxTail(h, x, y, z, 1.9 * grow, t, 0.95, 7.7);
    // Leib (brodelnd, nach hinten gezogen), Kopf mit Schnabel und Kamm
    flmBall(h, x, y, z, 0.32 * grow, 0.3 * grow, 0.6 * grow, 1, 2.1, t, 1.12, 0, 0.5, _phF, 0.3, 3);
    const hx = x + _phF.x * 0.62 + _phU.x * 0.16;
    const hy = y + _phF.y * 0.62 + _phU.y * 0.16;
    const hz = z + _phF.z * 0.62 + _phU.z * 0.16;
    flmBall(h, hx, hy, hz, 0.2 * grow, 0.2 * grow, 0.24 * grow, 1, 5.3, t, 1.4, 0, 0.3, _phF, 0.2, 3);
    _phD.set(hx + _phF.x * 0.16, hy + _phF.y * 0.16, hz + _phF.z * 0.16);
    const beak = fx3Take(h, 'coneG');
    fx3Cone(beak, _phD, _phF, 0.22 * grow, 0.06);
    fx3Color(beak, '#fff3c0', 1);
    for (let k = 0; k < 3; k++) {
      const kx = hx - _phF.x * (0.06 + 0.1 * k);
      const kz = hz - _phF.z * (0.06 + 0.1 * k);
      fire3(h, kx, hy + 0.08, kz, 0.16, 0.36 - k * 0.06, t + k * 0.3, 30 + k, 0.95, Math.atan2(fz, fx) * 0.2 - 0.3);
    }
    n3Glow(h, x, y, z, 3.2 * grow, FIRE3.main, 0.28);
    fireLight3(x, y, z, 2, 9);
    // Spur: Flammen, Glut und Rauch entlang der Bahn
    const trail = low ? 5 : flmN(10);
    for (let i = 1; i <= trail; i++) {
      const v = u - i * 0.035;
      if (v <= 0) break;
      const k = 1 - i / (trail + 1);
      const px = x0 + dx * v;
      const pz = z0 + dz * v;
      const py = yAt(v);
      fire3(h, px + Math.sin(t * 7 + i) * 0.15, py - 0.35, pz, 0.45 * k + 0.12, 0.75 * k + 0.2, t + i * 0.2, i, 0.75 * k);
      flmSpark(h, px + Math.sin(t * 9 + i * 2) * 0.35, py + 0.1 + (1 - k) * 0.6, pz + Math.cos(t * 7 + i) * 0.3, 0, 1.8, 0, 0.2, 0.06, i % 3 ? FIRE3.hot : FIRE3.core, k);
      if (!low && i % 3 === 2) n3Smoke(h, px, py + 0.3 + (1 - k) * 0.8, pz, 0.6 + (1 - k) * 0.9, '#2a201c', 0.35 * k);
    }
    // Start: Feuerstoß aus dem Zepter
    if (t < 0.25) {
      const k = 1 - t / 0.25;
      n3Glow(h, x0, 1, z0, 1.6 * k + 0.4, FIRE3.hot, 0.8 * k);
      for (let i = 0; i < (low ? 4 : 8); i++) {
        const a = i * 0.785;
        flmSpark(h, x0 + Math.cos(a) * 0.5 * (1 - k), 1 + Math.sin(a) * 0.4 * (1 - k), z0 + Math.sin(a) * 0.5 * (1 - k), Math.cos(a) * 3, Math.sin(a) * 2, Math.sin(a) * 3, 0.3, 0.07, FIRE3.core, k);
      }
    }
  } else {
    // Einschlag: der Vogel steigt als Feuersilhouette mit hochgerissenen Flügeln aus der Explosion und vergeht
    const v = (t - e.fly) / 0.9;
    if (v > 1) return;
    const k = 1 - v;
    const y = 0.5 + easeOut(v) * 2.2;
    // Flügel in der Bildebene (zur Kamera), Federn hängen nach unten
    _phS.set(FX3.cam.r.x, 0, FX3.cam.r.z).normalize();
    _phU.set(0, 1, 0);
    _phB.set(0, -1, 0);
    for (const s of [-1, 1]) {
      phxWing(h, x1 + _phS.x * s * 0.2, y, z1 + _phS.z * s * 0.2, s, 2.3 + v * 1.6, 1.0, t, 1.2 + v * 2, 0.15, 0.95 - v * 0.3, 0.2, k, s * 3.1);
    }
    flmBall(h, x1, y + 0.2, z1, 0.4 * k + 0.1, 0.7 * k + 0.1, 0.4 * k + 0.1, k, 2.1, t, 1.4, v * 0.6, 0, null, 0.3, 3);
    flmFunnel(h, x1, 0, z1, 3.4 * (1 - v * 0.4), 0.7, 0.25, k, 4.4, FLM_PILLAR, t);
    const sp = low ? 6 : flmN(16);
    for (let i = 0; i < sp; i++) {
      const a = n2h(i, 4) * Math.PI * 2;
      const vh = 2 + 3 * n2h(i, 5);
      const vy = 3 + 3.5 * n2h(i, 6);
      const tt = t - e.fly;
      const py = 0.6 + vy * tt - 4.5 * tt * tt;
      if (py < 0.05) continue;
      flmSpark(h, x1 + Math.cos(a) * vh * tt, py, z1 + Math.sin(a) * vh * tt, Math.cos(a) * vh, vy - 9 * tt, Math.sin(a) * vh, 0.35, 0.08, i % 3 ? FIRE3.hot : FIRE3.core, k);
    }
    fireLight3(x1, 1.2, z1, 2.2 * k, 10);
  }
};

// --- Inferno (Ultimative Attacke des Feuerwegs, seit 14.3 eigene 3D-Optik) -------------------------------------
// Um die Figur bricht eine Feuerhose aus (vorn fast durchsichtig: der Magier bleibt zu sehen), dann rollen drei
// Flammenwände im Takt der Treffer (novaFront wie die Wellen in magier.js) nach außen. Über ihnen wälzt sich Rauch,
// an der Front fliegt Glut, hinter ihr reißt der Boden glühend auf und verkohlt. Licht über dem ganzen Feld.
FX3_TYPES.add('inferno3');
EXTRA_EFFECTS.inferno3 = () => {};
FX3_DRAW.inferno3 = function (h, e) {
  const t = game.time - e.start;
  const low = n3low();
  const x = e.x * U3;
  const z = e.y * U3;
  const end = clamp01((e.dur - t) / 1.2);
  // Brandspur wächst mit der weitesten Welle mit und erkaltet
  let reach = 0.6;
  INFERNO_WAVES.forEach(([R, grow], k) => {
    const tt = t - k * 0.45;
    if (tt > 0) reach = Math.max(reach, R * U3 * novaFront(tt, grow));
  });
  flmScorch(h, e.x, e.y, reach * 1.02, 0.7 * end, 0, e.seed);
  flmCracks(h, e.x, e.y, reach * 0.95, 0.32 * end * clamp01(1.6 - t / 2.6), e.seed * 1.7, '#ff7a24');
  // Ausbruch um die Figur
  if (t < 1.25) {
    const k = t / 1.25;
    const rise = easeOut(Math.min(1, t / 0.22));
    flmFunnel(h, x, 0, z, 4 * rise * (1 - 0.25 * k), 0.6, 1.35 + 0.4 * k, Math.pow(1 - k, 0.7), e.seed, FLM_ERUPT, t);
    if (t < 0.15) n3Glow(h, x, 1, z, 3 + t * 20, FIRE3.core, 0.8 * (1 - t / 0.15));
    const sp = low ? 6 : flmN(16);
    for (let i = 0; i < sp; i++) {
      const ph = (t * 1.1 + n2h(i, 3)) % 1;
      const a = -t * 5 - ph * 8 + i * 2.4;
      const rr = 0.65 + ph * 1.1;
      flmSpark(h, x + Math.cos(a) * rr, ph * 4, z + Math.sin(a) * rr, Math.sin(a) * 4, 3, -Math.cos(a) * 4, 0.3, 0.08, i % 3 ? FIRE3.hot : FIRE3.core, (1 - ph) * (1 - k));
    }
  }
  // drei Flammenwände
  INFERNO_WAVES.forEach(([Rp, grow], k) => {
    const tt = t - k * 0.45;
    if (tt < 0 || tt > grow + 0.6) return;
    const R = Rp * U3;
    const rf = R * novaFront(tt, grow);
    const run = clamp01(tt / grow);
    const fade = tt < grow ? 1 : clamp01(1 - (tt - grow) / 0.6);
    const H = (2.7 - 1.1 * run) * (0.35 + 0.65 * fade) * Math.min(1, tt / 0.08);
    flmFunnel(h, x, 0, z, H, rf * 0.94, rf * 1.06, fade, e.seed + k * 3.7, FLM_WALL, t, 0.8);
    // Rauch wälzt sich über der Front
    const sm = low ? 6 : flmN(14 + k * 4);
    for (let i = 0; i < sm; i++) {
      const a = (i / sm) * Math.PI * 2 + k * 0.7 + n2h(i, k) * 0.3;
      const ph = (tt * 1.4 + n2h(i, 9)) % 1;
      const rr = rf * (0.96 - ph * 0.08);
      n3Smoke(h, x + Math.cos(a) * rr, H * 0.85 + 0.3 + ph * 1.5, z + Math.sin(a) * rr, 1.3 + run * 1.1 + ph * 0.8, i % 3 ? '#2a221e' : '#5a2a16', 0.62 * fade * Math.sin(Math.max(0.2, ph) * Math.PI));
    }
    // Glut fliegt an der Front nach außen
    const sp = low ? 5 : flmN(12 + k * 4);
    for (let i = 0; i < sp; i++) {
      const a = n2h(i, 20 + k) * Math.PI * 2;
      const ph = (tt * 1.8 + n2h(i, 30 + k)) % 1;
      const rr = rf + ph * 0.9;
      flmSpark(h, x + Math.cos(a) * rr, 0.3 + ph * (1.6 + H), z + Math.sin(a) * rr, Math.cos(a) * 3, 3, Math.sin(a) * 3, 0.3, 0.075, i % 3 ? FIRE3.hot : FIRE3.core, (1 - ph) * fade);
    }
  });
  if (!low) {
    for (let i = 0; i < flmN(8); i++) {
      const ph = (t * 0.3 + n2h(i, 41)) % 1;
      const a = n2h(i, 42) * Math.PI * 2;
      const d = Math.sqrt(n2h(i, 43)) * reach;
      flmAsh(h, x + Math.cos(a) * d, 0.5 + ph * 3.5, z + Math.sin(a) * d, 0.08, 0.8 * Math.sin(ph * Math.PI) * end);
    }
  }
  fireLight3(x, 2.6, z, 1.3 * end, 12);
};

// Klassensegen des Feuermagiers (Arkane Erleuchtung, seit 14.3 im Feuerweg in Flammen): eine Feuerspirale windet
// sich an der Figur hinauf (vorn durchsichtig), Glut wird nach oben gerissen – ohne Ring am Boden
function segenFeuer3(h, e, k, x, z, t) {
  const fade = k < 0.12 ? k / 0.12 : 1 - Math.max(0, (k - 0.55) / 0.45);
  const low = n3low();
  flmFunnel(h, x, 0, z, 3.2 * easeOut(Math.min(1, k * 4)), 0.5, 0.95, fade, e.seed, FLM_ERUPT, t, 0.15);
  if (t < 0.25) n3Glow(h, x, 1, z, 1.5 + t * 8, FIRE3.core, 0.7 * (1 - t / 0.25));
  for (let i = 0; i < (low ? 6 : flmN(14)); i++) {
    const ph = (t * 1.2 + i / 14) % 1;
    const a = -t * 6 - ph * 7 + i * 2.4;
    const rr = 0.55 + ph * 0.5;
    flmSpark(h, x + Math.cos(a) * rr, 0.1 + ph * 3.2, z + Math.sin(a) * rr, Math.sin(a) * 3, 3, -Math.cos(a) * 3, 0.28, 0.07, i % 3 ? FIRE3.hot : '#e8d8ff', fade * (1 - ph));
  }
  fireLight3(x, 1.2, z, 1.8 * fade, 8);
}

// Vorwärmen (v3WarmFx): je Form und Stufe ein Teil zeichnen, damit die Shader beim Start übersetzt werden
FX3_TYPES.add('flm3warm');
EXTRA_EFFECTS.flm3warm = () => {};
FX3_DRAW.flm3warm = function (h, e) {
  const p = game.player;
  if (!p || e.x == null) return;
  const x = p.x * U3;
  const z = feetY(p) * U3;
  flmFunnel(h, x, -50, z, 0.1, 0.01, 0.01, 0.02, 0, FLM_WALL, 0);
  flmBall(h, x, -50, z, 0.01, 0.01, 0.01, 0.02, 0, 0);
  const o = flmSheet(h, 0, 0.02, 0, 0);
  for (let j = 0; j <= FLM3_SY; j++) for (let i = 0; i <= FLM3_SX; i++) flmPut(o, i, j, x + i * 0.001, -50, z + j * 0.001);
  flmDone(o);
};

// --- Symbole -----------------------------------------------------------------------------------------------
// Glutfeld: aufgerissener Boden in Schrägsicht, glühende Risse, drei Feuersäulen
SKILL_ART.glutfeld = function (ctx, IK) {
  IK.light(ctx, 0, 8, 24, '#ff5a1a', 0.6);
  IK.glow(ctx, '#ff6a1a', 10, () => IK.fill(ctx, (c) => c.ellipse(0, 12, 21, 9, 0, 0, Math.PI * 2),
    IK.rad(ctx, 0, 12, 1, 21, [[0, '#fff1c8'], [0.35, '#ff8a4a'], [0.75, '#c81a0a'], [1, '#3a0a06']]), 0.9));
  ctx.save();
  ctx.strokeStyle = '#2a0806';
  ctx.lineWidth = 1.4;
  ctx.lineCap = 'round';
  for (const pts of [[[-16, 12], [-8, 10], [-3, 13], [4, 11]], [[3, 15], [9, 13], [17, 14]], [[-6, 16], [-1, 18], [6, 17]], [[0, 7], [-2, 10], [1, 12]]]) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  ctx.restore();
  IK.flame(ctx, -10, 12, 22, -0.08, IKN.fire, -0.4);
  IK.flame(ctx, 10, 13, 22, 0.08, IKN.fire, 0.4);
  IK.flame(ctx, 0, 11, 34, 0, IKN.hot);
  IK.flame(ctx, -4, 12, 18, -0.15, IKN.hot, -0.3);
  IK.flame(ctx, 5, 12, 16, 0.2, IKN.hot, 0.3);
  IK.sparkles(ctx, 10, '#ffd8a0', 53, 18, 0, -6, 1.3);
};

// Feuertornados: zwei Feuertrichter mit Spiralbändern, Glut am Boden, Funken
SKILL_ART.feuertornado = function (ctx, IK) {
  IK.light(ctx, 0, 0, 24, '#ff5a1a', 0.55);
  IK.glow(ctx, '#ff6a1a', 8, () => IK.fill(ctx, (c) => c.ellipse(0, 19, 21, 5, 0, 0, Math.PI * 2),
    IK.rad(ctx, 0, 19, 1, 21, [[0, '#fff1c8'], [0.5, '#ff8a4a'], [1, 'rgba(160,20,6,0)']]), 0.9));
  const funnel = (cx, s, lean) => {
    const top = -19 * s;
    const bot = 18;
    const wT = 13 * s;
    const wB = 2.2 * s;
    // Körper des Trichters
    const g = ctx.createLinearGradient(cx - wT, 0, cx + wT, 0);
    g.addColorStop(0, '#8a1a06');
    g.addColorStop(0.35, '#ff7a1a');
    g.addColorStop(0.55, '#ffd36a');
    g.addColorStop(1, '#a8200a');
    ctx.save();
    ctx.shadowColor = '#ff8a2a';
    ctx.shadowBlur = 8;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - wB, bot);
    ctx.quadraticCurveTo(cx - wB * 2 + lean, (top + bot) * 0.5 + 6, cx - wT + lean * 2, top);
    ctx.quadraticCurveTo(cx + lean * 2, top - 4 * s, cx + wT + lean * 2, top);
    ctx.quadraticCurveTo(cx + wB * 2 + lean, (top + bot) * 0.5 + 6, cx + wB, bot);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Spiralbänder: helle Bögen quer über den Trichter
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const v = (i + 0.5) / 6;
      const y = bot + (top - bot) * v;
      const w = wB + (wT - wB) * v;
      ctx.strokeStyle = i % 2 ? '#fff1c8' : '#ffb04a';
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = (2.2 - v) * s;
      ctx.beginPath();
      ctx.ellipse(cx + lean * 2 * v, y, w * 0.95, w * 0.28, -0.12, 0.15, Math.PI - 0.4);
      ctx.stroke();
    }
    ctx.restore();
    IK.flame(ctx, cx, bot + 1, 10 * s, 0, IKN.hot);
  };
  funnel(-9, 0.8, -1);
  funnel(7, 1, 1);
  IK.sparkles(ctx, 12, '#ffd8a0', 71, 20, 0, -6, 1.3);
};

// Phönixflamme (seit 13.40 neu): Feuervogel von vorn mit hoch geschwungenen Flügeln aus Federn, Kopf mit Kamm,
// langer Flammenschweif nach unten
SKILL_ART.phoenix = function (ctx, IK) {
  IK.light(ctx, 0, -2, 24, '#ff6a1a', 0.65);
  for (const [x, h, a] of [[-4, 16, Math.PI - 0.4], [4, 16, Math.PI + 0.4], [0, 22, Math.PI]]) IK.flame(ctx, x, 6, h, a, IKN.fire, a);
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.scale(sd, 1);
    const g = ctx.createLinearGradient(2, 0, 23, -16);
    g.addColorStop(0, '#fff6d0');
    g.addColorStop(0.45, '#ffb23a');
    g.addColorStop(1, '#d0280c');
    ctx.fillStyle = g;
    ctx.shadowColor = '#ff8a2a';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(3, 0);
    ctx.quadraticCurveTo(12, -8, 23, -20);
    // Federenden zurück zum Körper
    const pts = [[22, -12], [20, -6], [17, -1], [13, 2], [8, 4]];
    let px = 23;
    let py = -20;
    for (const [nx, ny] of pts) {
      ctx.quadraticCurveTo((px + nx) / 2 + 3, (py + ny) / 2 + 3, nx, ny);
      px = nx;
      py = ny;
    }
    ctx.lineTo(3, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,30,6,0.6)';
    ctx.lineWidth = 0.8;
    for (const [nx, ny] of pts) {
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.quadraticCurveTo((5 + nx) / 2, (ny - 6) / 2, nx, ny);
      ctx.stroke();
    }
    ctx.restore();
  }
  IK.glow(ctx, '#ffd36a', 9, () => IK.fill(ctx, (c) => { c.ellipse(0, -1, 4, 7.5, 0, 0, Math.PI * 2); }, IK.rad(ctx, 0, -3, 0.5, 8, [[0, '#ffffff'], [0.4, '#fff1c8'], [0.8, '#ff8a4a'], [1, '#e8362a']]), 0.85));
  IK.flame(ctx, 0, -8, 10, 0, IKN.hot);
  IK.fill(ctx, (c) => { c.moveTo(-1.6, -12); c.lineTo(0, -15.5); c.lineTo(1.6, -12); c.closePath(); }, '#fff6d8', 0.6);
  IK.sparkles(ctx, 8, '#ffe0b0', 41, 20, 0, 0, 1.2);
};
