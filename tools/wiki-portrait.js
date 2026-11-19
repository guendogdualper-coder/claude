// Wird vom Wiki-Bauskript in die Spielseite geladen (nicht Teil des Spiels): 3D-Bilder von Monstern, NPCs und
// Spielerfiguren mit durchsichtigem Hintergrund, gerendert wie die Figur im Inventar (v3Portrait in drei-figuren.js).
window.wikiPortrait3 = function (kind, id, size = 256, yaw = -0.5) {
  if (!V3.on || !V3.gl) return null;
  const P = (window._wikiP = window._wikiP || {});
  if (!P.scene) {
    P.scene = new THREE.Scene();
    const hemi = new THREE.HemisphereLight(0xe4f2ff, 0x5a4a3a, 0.7);
    const sun = new THREE.DirectionalLight(0xfff0d4, 0.95);
    sun.position.set(-2, 5, 6);
    const fill = new THREE.DirectionalLight(0xd8e4ff, 0.25);
    fill.position.set(4, 2, 3);
    P.scene.add(hemi, sun, sun.target, fill);
    P.cam = new THREE.PerspectiveCamera(24, 1, 0.1, 80);
  }
  let model;
  if (kind === 'monster') model = model3('wiki:m:' + id, (b) => monsterBuild(b, id, 0));
  else if (kind === 'npc') model = model3('wiki:n:' + id, (b) => buildNpc3(b, id));
  else if (kind === 'player') model = model3('wiki:p:' + id.classId + id.sex, (b) => humanoid3(b, playerConfig3(id)));
  if (!model) return null;
  const a = makeActor(model);
  P.scene.add(a.group);
  resetBones(a);
  a.group.rotation.set(0, yaw, 0);
  a.group.position.set(0, 0, 0);
  a.group.scale.setScalar(model.scale);
  a.group.updateMatrixWorld(true);
  // Maße aus der Szene (alle Teile der Figur)
  const box = new THREE.Box3().setFromObject(a.group);
  const top = box.max.y;
  // Breite quer zur Kamera und Tiefe getrennt: Vierbeiner füllen das Bild sonst zu wenig
  const half = Math.max(-box.min.x, box.max.x, 0.15);
  const deep = Math.max(-box.min.z, box.max.z, 0.15);
  const cam = P.cam;
  cam.aspect = 1;
  const t = Math.tan((cam.fov * Math.PI) / 360);
  const dist = Math.max((top * 1.08) / (2 * t), (half * 2.15) / (2 * t)) + deep * 0.55;
  const cy = top * 0.5;
  cam.position.set(0, cy + dist * 0.22, dist);
  cam.lookAt(0, cy, 0);
  cam.updateProjectionMatrix();
  const W = size;
  const rt = new THREE.WebGLRenderTarget(W, W);
  const buf = new Uint8Array(W * W * 4);
  const gl = V3.gl;
  const prevRT = gl.getRenderTarget();
  const prevColor = gl.getClearColor(new THREE.Color());
  const prevAlpha = gl.getClearAlpha();
  gl.setRenderTarget(rt);
  gl.setClearColor(0x000000, 0);
  gl.clear();
  gl.render(P.scene, cam);
  gl.readRenderTargetPixels(rt, 0, 0, W, W, buf);
  gl.setRenderTarget(prevRT);
  gl.setClearColor(prevColor, prevAlpha);
  rt.dispose();
  P.scene.remove(a.group);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = W;
  const ix = c.getContext('2d');
  const im = ix.createImageData(W, W);
  const row = W * 4;
  for (let y = 0; y < W; y++) im.data.set(buf.subarray((W - 1 - y) * row, (W - y) * row), y * row);
  ix.putImageData(im, 0, 0);
  return c.toDataURL('image/png');
};
