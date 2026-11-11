// Grafik Plus (seit 14.11): Nachbearbeitung der 3D-Ansicht für die Grafikstufe „Plus“ (optionen.js GRAPHICS.plus).
// Die Welt wird erst in ein Bild außerhalb des Bildschirms gezeichnet und dann in einem Durchgang veredelt:
//  - Leuchten (Bloom): nur helle, satte Farben – Feuer, Magie, Laternen, Portale, Fenster; nachts stärker
//  - weiche Schulter je Pixel (helle Flammen bleiben orange statt weiß), Farbstimmung (Schatten kühl, Licht warm),
//    mehr Sättigung und Kontrast, leicht abgedunkelter Rand
//  - Tiefenunschärfe am oberen und unteren Bildrand (Blick wird zur Mitte gelenkt)
//  - am PC zusätzlich echte Schatten für die ganze Welt (Häuser, Bäume, Laternen), sonst nur für Figuren
// Braucht WebGL 2. Ohne WebGL 2 oder wenn das Gerät zu langsam ist (quality.noPost, zeichnen.js) zeichnet die Welt
// wie bei „Ultra“ direkt auf den Bildschirm. Werte in GP (zum Nachstellen in der Konsole).
const GP = { on: false, bloom: 0.5, thr: 0.965, // seit 14.12 höher: sonniges Gras (bis ~0,95) leuchtete mit
  tilt: 0.35, sat: 1.1, // seit 14.17 Randunschärfe 0,35 statt 0,6 (wirkte zusammen mit dem Nebel wie Dunst)
  contrast: 1.08, vignette: 0.28, expo: 0.98, shadows: false, msaa: false };
const _gp = { ready: false, key: '', sz: null, shadowed: -1 };

function gpSupported() {
  return !!(V3.gl && V3.gl.capabilities.isWebGL2);
}

// Grafikstufe angewendet (v3ApplyGraphics): Plus an oder aus, am PC mit Weltschatten und Kantenglättung
function gpApply() {
  const want = opts.graphics === 'plus' && !quality.noPost && gpSupported();
  if (GP.on && !want) gpWorldShadows(false);
  GP.on = want;
  GP.shadows = want && IS_PC && !quality.noShadow;
  GP.msaa = IS_PC;
  if (!GP.shadows) gpWorldShadows(false);
}

function gpInit() {
  if (_gp.ready) return;
  _gp.ready = true;
  const V = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const mat = (uniforms, fragmentShader) => new THREE.ShaderMaterial({ uniforms, vertexShader: V, fragmentShader, depthTest: false, depthWrite: false });
  _gp.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  _gp.scene = new THREE.Scene();
  _gp.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  _gp.quad.frustumCulled = false;
  _gp.scene.add(_gp.quad);
  _gp.sz = new THREE.Vector2();
  // helle, satte Stellen herausziehen (helles Grau und heller Boden leuchten kaum)
  _gp.bright = mat({ t: { value: null }, thr: { value: 0.9 } }, `uniform sampler2D t; uniform float thr; varying vec2 vUv;
    void main(){ vec3 c = texture2D(t, vUv).rgb; float l = max(c.r, max(c.g, c.b));
      float s = (l - min(c.r, min(c.g, c.b))) / max(l, 1e-3);
      // satte Farben ab der Schwelle (Feuer, Magie, Laternen), dazu alles, was heller als Weiß ist (sich überlagernde Effekte)
      float k = smoothstep(thr, thr + 0.05, min(l, 1.0)) * smoothstep(0.35, 0.75, s) * 1.4 + smoothstep(1.02, 1.6, l) * 0.8;
      gl_FragColor = vec4(c * k * min(1.0, 1.2 / max(l, 1.0)), 1.0); }`);
  // 9er-Gauß in zwei Richtungen (5 Lesezugriffe dank linearer Filterung)
  _gp.blur = mat({ t: { value: null }, dir: { value: new THREE.Vector2() } }, `uniform sampler2D t; uniform vec2 dir; varying vec2 vUv;
    void main(){ vec3 c = texture2D(t, vUv).rgb * 0.227027;
      c += texture2D(t, vUv + dir * 1.3846).rgb * 0.316216; c += texture2D(t, vUv - dir * 1.3846).rgb * 0.316216;
      c += texture2D(t, vUv + dir * 3.2308).rgb * 0.070270; c += texture2D(t, vUv - dir * 3.2308).rgb * 0.070270;
      gl_FragColor = vec4(c, 1.0); }`);
  _gp.comp = mat({ t: { value: null }, b1: { value: null }, b2: { value: null }, b3: { value: null }, soft: { value: null }, res: { value: new THREE.Vector2() },
    bloom: { value: 0.5 }, tilt: { value: 0.7 }, sat: { value: 1.15 }, contrast: { value: 1.08 }, vignette: { value: 0.3 }, expo: { value: 1 }, aa: { value: 1 } },
  `uniform sampler2D t, b1, b2, b3, soft; uniform vec2 res; uniform float bloom, tilt, sat, contrast, vignette, expo, aa; varying vec2 vUv;
    vec3 smoothEdge(vec2 uv){ vec2 px = 1.0 / res; vec3 m = texture2D(t, uv).rgb; if (aa < 0.5) return m;
      vec3 n = texture2D(t, uv + vec2(0.0, -px.y)).rgb, s = texture2D(t, uv + vec2(0.0, px.y)).rgb,
        e = texture2D(t, uv + vec2(px.x, 0.0)).rgb, w = texture2D(t, uv + vec2(-px.x, 0.0)).rgb;
      vec3 L = vec3(0.299, 0.587, 0.114); float ln = dot(n, L), ls = dot(s, L), le = dot(e, L), lw = dot(w, L), lm = dot(m, L);
      float r = max(max(ln, ls), max(max(le, lw), lm)) - min(min(ln, ls), min(min(le, lw), lm));
      return r < 0.08 ? m : mix(m, (n + s + e + w) * 0.25, 0.45); }
    void main(){
      vec3 c = smoothEdge(vUv);
      float edge = smoothstep(0.2, 0.62, abs(vUv.y - 0.47) * 1.65);
      c = mix(c, texture2D(soft, vUv).rgb, edge * tilt);
      vec3 bl = texture2D(b1, vUv).rgb * 0.5 + texture2D(b2, vUv).rgb * 0.8 + texture2D(b3, vUv).rgb * 1.1;
      bl = bl / (1.0 + bl * 0.8);
      c = c * expo + bl * bloom;
      float m = max(c.r, max(c.g, c.b));
      float tm = m <= 0.82 ? m : 0.82 + 0.18 * (1.0 - exp(-(m - 0.82) / 0.18));
      c *= tm / max(m, 1e-4);
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(c * vec3(0.95, 0.99, 1.06), c * vec3(1.04, 1.0, 0.95), smoothstep(0.15, 0.85, l));
      c = mix(vec3(l), c, sat);
      c = (c - 0.5) * contrast + 0.5;
      vec2 q = vUv - 0.5; c *= 1.0 - vignette * smoothstep(0.35, 0.95, dot(q, q) * 2.2);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }`);
}

function gpTarget(w, h, ms) {
  const o = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: !!ms, stencilBuffer: false };
  if (ms && GP.msaa && THREE.WebGLMultisampleRenderTarget) {
    const r = new THREE.WebGLMultisampleRenderTarget(w, h, o);
    r.samples = 4;
    return r;
  }
  return new THREE.WebGLRenderTarget(w, h, o);
}

// Bildpuffer passend zur Zeichenfläche (bei jeder Größenänderung neu)
function gpEnsure() {
  const gl = V3.gl;
  gl.getDrawingBufferSize(_gp.sz);
  const W = Math.max(8, _gp.sz.x), H = Math.max(8, _gp.sz.y);
  const k = W + 'x' + H + (GP.msaa ? 'm' : '');
  if (k === _gp.key) return;
  _gp.key = k;
  for (const n of ['main', 'half', 'h2', 'q1', 'q2', 'e1', 'e2', 's1', 's2']) if (_gp[n]) _gp[n].dispose();
  _gp.main = gpTarget(W, H, true);
  _gp.half = gpTarget(W >> 1, H >> 1); _gp.h2 = gpTarget(W >> 1, H >> 1);
  _gp.q1 = gpTarget(W >> 2, H >> 2); _gp.q2 = gpTarget(W >> 2, H >> 2);
  _gp.e1 = gpTarget(W >> 3, H >> 3); _gp.e2 = gpTarget(W >> 3, H >> 3);
  _gp.s1 = gpTarget(W >> 1, H >> 1); _gp.s2 = gpTarget(W >> 1, H >> 1);
}

// Weltschatten: alle Gegenstände der Welt werfen Schatten, der Boden fängt sie auf
function gpWorldShadows(on) {
  if (!V3.objects) return;
  // seit 14.38 nach dem Bau-Zähler (drei-kern.js v3UpdateChunks) statt nach der Anzahl der Blöcke: wurde im selben
  // Bild ein Block verworfen und ein neuer fertig, blieb die Anzahl gleich und der neue Block warf nie Schatten
  // (ganze Häuserzeilen ohne Schatten, bis man weit genug weg und wieder zurück lief)
  const n = on ? (V3.chunkGen || 0) * 4096 + V3.objects.children.length : -1;
  if (n === _gp.shadowed) return;
  _gp.shadowed = n;
  // seit 14.38 ohne die Umriss-Hüllen (Rückseiten): ihr Schatten deckt sich mit dem des Körpers, sie verdoppelten nur
  // die Arbeit im Schattendurchgang – der deckt jetzt das ganze Bild ab (v3FitSun)
  V3.objects.traverse((o) => { if (o.isMesh) o.castShadow = on && o.material.side !== THREE.BackSide; });
  if (on) V3.terrain.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
}

function gpPass(mat, target) {
  _gp.quad.material = mat;
  V3.gl.setRenderTarget(target);
  V3.gl.render(_gp.scene, _gp.cam);
}
function gpBlur(src, tmp, w, h, spread) {
  const b = _gp.blur.uniforms;
  b.t.value = src.texture; b.dir.value.set(spread / w, 0); gpPass(_gp.blur, tmp);
  b.t.value = tmp.texture; b.dir.value.set(0, spread / h); gpPass(_gp.blur, src);
}
function gpCopy(src, dst) {
  const b = _gp.blur.uniforms;
  b.t.value = src.texture; b.dir.value.set(0, 0); gpPass(_gp.blur, dst);
}

// Die Welt zeichnen (statt V3.gl.render in drei-kern.js); false = Plus ist aus, normal zeichnen
function gpRender() {
  if (!GP.on) return false;
  gpInit();
  gpEnsure();
  if (GP.shadows) gpWorldShadows(true);
  const gl = V3.gl;
  const W = _gp.sz.x, H = _gp.sz.y;
  gl.setRenderTarget(_gp.main);
  gl.clear();
  gl.render(V3.scene, V3.camera);
  const nk = V3.nightK || 0;
  _gp.bright.uniforms.t.value = _gp.main.texture;
  _gp.bright.uniforms.thr.value = GP.thr - 0.42 * nk;
  gpPass(_gp.bright, _gp.half);
  gpBlur(_gp.half, _gp.h2, W >> 1, H >> 1, 1.0);
  gpCopy(_gp.half, _gp.q1);
  gpBlur(_gp.q1, _gp.q2, W >> 2, H >> 2, 1.4);
  gpCopy(_gp.q1, _gp.e1);
  gpBlur(_gp.e1, _gp.e2, W >> 3, H >> 3, 1.8);
  if (GP.tilt > 0) {
    gpCopy(_gp.main, _gp.s1);
    gpBlur(_gp.s1, _gp.s2, W >> 1, H >> 1, 1.6);
    gpBlur(_gp.s1, _gp.s2, W >> 1, H >> 1, 2.4);
  }
  const u = _gp.comp.uniforms;
  u.t.value = _gp.main.texture; u.b1.value = _gp.half.texture; u.b2.value = _gp.q1.texture; u.b3.value = _gp.e1.texture; u.soft.value = _gp.s1.texture;
  u.res.value.set(W, H); u.bloom.value = GP.bloom * (1 + 1.2 * nk); u.tilt.value = GP.tilt; u.sat.value = GP.sat; u.contrast.value = GP.contrast;
  u.vignette.value = GP.vignette; u.expo.value = GP.expo; u.aa.value = GP.msaa ? 0 : 1;
  gpPass(_gp.comp, null);
  return true;
}
