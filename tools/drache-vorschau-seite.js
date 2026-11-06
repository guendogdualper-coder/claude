// Wird von tools/drache-vorschau.js in die laufende Spielseite geladen (nicht Teil des Spiels).
// Zeichnet den Drachen-Entwurf (js/drei-drache.js) in einer eigenen kleinen Bühne (eigener WebGL-Renderer,
// doppelte Auflösung und verkleinert = glatte Kanten) und setzt ihn für das Spielbild in die echte 3D-Welt.
window.DV = (function () {
  const W = 1280, H = 720, SS = 2;
  let R = null, scene = null, cam = null, sun = null;
  const actors = [];

  function init() {
    if (R) return;
    const c = document.createElement('canvas');
    c.width = W * SS;
    c.height = H * SS;
    R = new THREE.WebGLRenderer({ canvas: c, antialias: true, preserveDrawingBuffer: true });
    R.setSize(W * SS, H * SS, false);
    R.shadowMap.enabled = true;
    R.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#dfe9ef');
    scene.fog = new THREE.Fog('#dfe9ef', 26, 70);
    cam = new THREE.PerspectiveCamera(30, W / H, 0.3, 200);
    scene.add(new THREE.HemisphereLight(0xe4f2ff, 0x5a6a40, 0.62));
    sun = new THREE.DirectionalLight(0xfff0d4, 0.92);
    sun.position.set(-6, 16, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9; sc.near = 1; sc.far = 60;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.02;
    scene.add(sun, sun.target);
    const fill = new THREE.DirectionalLight(0xd8e4ff, 0.22);
    fill.position.set(6, 4, -5);
    scene.add(fill);
    const gg = new THREE.PlaneGeometry(240, 240);
    gg.rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(gg, new THREE.MeshLambertMaterial({ color: 0x93a77f }));
    ground.receiveShadow = true;
    scene.add(ground);
  }

  function clear() {
    init();
    for (const a of actors) scene.remove(a.group);
    actors.length = 0;
  }

  function put(model) {
    const a = makeActor(model);
    a.group.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
    scene.add(a.group);
    actors.push(a);
    return a;
  }

  const dragonModel = () => model3('vorschau:drache', (b) => dragonMount3(b, {}));
  let heroCache = null;
  const hero = () => heroCache || (heroCache = newCharacter('Held', 'krieger', 0));
  const riderModel = () => model3('vorschau:reiter', (b) => humanoid3(b, playerConfig3(hero())));
  const horseModel = () => model3('vorschau:ross', (b) => Object.assign(horseParts3(b, null, { saddle: CLASSES.krieger.trim, tier: 2 }), { blob: 0.7, scale: 1.3 }));

  // Drache an Stelle x, z mit Blickrichtung yaw (0 = nach +z) und Haltung o (siehe dragonMountPose3)
  function dragon(x, z, yaw, t, o) {
    const a = put(dragonModel());
    resetBones(a);
    a.group.position.set(x, 0, z);
    a.group.rotation.y = yaw;
    const r = dragonMountPose3(a, t, o || {});
    // Schatten am Boden wird mit der Höhe kleiner (wie im Spiel beim Sprung)
    a.blob.scale.setScalar(a.model.blob * (1 - 0.35 * Math.min(1, r.lift / 2.5)));
    a.group.updateMatrixWorld(true);
    return a;
  }

  // Reiter im Sattel: Hüfte auf den Sattelpunkt, Beine gespreizt um den Rumpf, Hände am Haltegriff
  function riderOn(d) {
    const r = put(riderModel());
    resetBones(r);
    const s = dragonSeat3(d);
    const k = r.model.scale;
    r.group.rotation.set(s.pitch, d.group.rotation.y, s.roll, 'YXZ');
    r.group.position.copy(s.pos);
    r.group.position.y += -r.model.hipY * k + 0.03;
    const B = r.bones;
    B[BH.legL].rotation.set(-0.95, 0, 1.12);
    B[BH.legR].rotation.set(-0.95, 0, -1.12);
    B[BH.armL].rotation.set(-0.75, 0, -0.25);
    B[BH.armR].rotation.set(-0.75, 0, 0.25);
    B[BH.chest].rotation.x = 0.1;
    r.blob.visible = false;
    r.group.updateMatrixWorld(true);
    return r;
  }

  function standing(x, z, yaw) {
    const r = put(riderModel());
    resetBones(r);
    r.group.position.set(x, 0, z);
    r.group.rotation.y = yaw;
    r.group.updateMatrixWorld(true);
    return r;
  }

  // Kriegsross wie im Spiel (Stand), optional mit Reiter
  function horse(x, z, yaw, withRider) {
    const h = put(horseModel());
    resetBones(h);
    h.group.position.set(x, 0, z);
    h.group.rotation.y = yaw;
    horseGait3(h, 1.0, 0, false, 2);
    h.group.updateMatrixWorld(true);
    if (withRider) {
      const r = put(riderModel());
      resetBones(r);
      const k = r.model.scale;
      r.group.position.set(x, h.model.seat * h.model.scale - r.model.hipY * k + 0.04, z);
      r.group.rotation.y = yaw;
      r.bones[BH.legL].rotation.set(-1.2, 0, 0.5);
      r.bones[BH.legR].rotation.set(-1.2, 0, -0.5);
      r.blob.visible = false;
      r.group.updateMatrixWorld(true);
    }
    return h;
  }

  // Bild: Kamera bei pos, Blick auf look; label unten links
  function shot(pos, look, o = {}) {
    init();
    cam.fov = o.fov || 30;
    cam.aspect = W / H;
    cam.updateProjectionMatrix();
    cam.position.set(...pos);
    cam.lookAt(...look);
    sun.target.position.set(look[0], 0, look[2]);
    sun.position.set(look[0] - 6, 16, look[2] + 9);
    R.render(scene, cam);
    const out = document.createElement('canvas');
    out.width = W;
    out.height = H;
    const x = out.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(R.domElement, 0, 0, W, H);
    if (o.label) caption(x, o.label, o.sub);
    return out.toDataURL('image/png');
  }

  function caption(x, label, sub) {
    x.font = '600 26px system-ui, sans-serif';
    const w = Math.max(x.measureText(label).width, sub ? (x.font = '18px system-ui, sans-serif', x.measureText(sub).width) : 0);
    x.fillStyle = 'rgba(20,16,14,0.62)';
    x.fillRect(18, H - (sub ? 84 : 58), w + 32, sub ? 66 : 40);
    x.fillStyle = '#fff';
    x.font = '600 26px system-ui, sans-serif';
    x.fillText(label, 34, H - (sub ? 48 : 28));
    if (sub) {
      x.font = '18px system-ui, sans-serif';
      x.fillStyle = '#f0dcc0';
      x.fillText(sub, 34, H - 26);
    }
  }

  // Kontaktbogen aus fertigen Bildern [{ url, label }]
  async function sheet(items, cols, title) {
    const tw = 640, th = 360, pad = 14, head = 70, lab = 30;
    const rows = Math.ceil(items.length / cols);
    const c = document.createElement('canvas');
    c.width = cols * tw + (cols + 1) * pad;
    c.height = head + rows * (th + lab + pad) + pad;
    const x = c.getContext('2d');
    x.fillStyle = '#211a17';
    x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#f3dcae';
    x.font = '600 34px system-ui, sans-serif';
    x.fillText(title, pad + 4, 46);
    for (let i = 0; i < items.length; i++) {
      const img = new Image();
      img.src = items[i].url;
      await img.decode();
      const cx = pad + (i % cols) * (tw + pad);
      const cy = head + Math.floor(i / cols) * (th + lab + pad);
      x.imageSmoothingQuality = 'high';
      x.drawImage(img, cx, cy, tw, th);
      x.fillStyle = '#e8e0d8';
      x.font = '20px system-ui, sans-serif';
      x.fillText(items[i].label, cx + 2, cy + th + 22);
    }
    return c.toDataURL('image/png');
  }

  // Reihe von Bildern nebeneinander (z. B. Flügelschlag), je Bild ein Ausschnitt
  async function strip(urls, labels, crop, cols) {
    const [sx, sy, sw, sh] = crop;
    const tw = Math.round(sw * 0.5), th = Math.round(sh * 0.5), pad = 8, lab = 26;
    const rows = Math.ceil(urls.length / cols);
    const c = document.createElement('canvas');
    c.width = cols * tw + (cols + 1) * pad;
    c.height = rows * (th + lab + pad) + pad;
    const x = c.getContext('2d');
    x.fillStyle = '#211a17';
    x.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < urls.length; i++) {
      const img = new Image();
      img.src = urls[i];
      await img.decode();
      const cx = pad + (i % cols) * (tw + pad);
      const cy = pad + Math.floor(i / cols) * (th + lab + pad);
      x.drawImage(img, sx, sy, sw, sh, cx, cy, tw, th);
      x.fillStyle = '#e8e0d8';
      x.font = '18px system-ui, sans-serif';
      x.fillText(labels[i], cx + 4, cy + th + 19);
    }
    return c.toDataURL('image/png');
  }

  // --- Spielbild: den Drachen in die echte 3D-Welt setzen, den Spieler darauf ---------------------------
  const G = { on: false, d: null, t0: 0, last: 0 };
  // Platz mit vielen Bäumen in der Nähe (ohne Mauer, Haus und Wasser) auf der aktuellen Karte, weg vom Felsrand
  // mapId: Karte (z. B. 4 = Dunkelwald); ohne Angabe die Karte, auf der der Spieler steht
  function findForest(mapId) {
    const w = game.world;
    const p = game.player;
    const wm = mapId ? WORLD_MAPS.find((m) => m.id === mapId) : mapOfTile(Math.floor(p.x / TILE), Math.floor(p.y / TILE));
    const [rx, ry, rw, rh] = wm.region;
    const M = 16;
    let best = null;
    for (let ty = ry + M; ty < ry + rh - M; ty += 2) {
      for (let tx = rx + M; tx < rx + rw - M; tx += 2) {
        const o = w.obj[ty * MAP_W + tx];
        if (o !== OBJ.NONE && o !== OBJ.TREE && o !== OBJ.ROCK) continue;
        let n = 0, bad = 0;
        for (let dy = -5; dy <= 5; dy++) for (let dx = -6; dx <= 6; dx++) {
          const q = w.obj[(ty + dy) * MAP_W + tx + dx];
          if (q === OBJ.TREE || q === OBJ.PINE || q === OBJ.BLOSSOM) n += Math.abs(dx) < 4 && Math.abs(dy) < 3 ? 2 : 1;
          if (q === OBJ.HOUSE || q === OBJ.WALL || q === OBJ.CAVEWALL || q === OBJ.PILLAR) bad++;
          if (LIQUID.has(w.ground[(ty + dy) * MAP_W + tx + dx])) bad += 0.3;
        }
        if (bad) continue;
        if (!best || n > best.n) best = { tx, ty, n };
      }
    }
    return best;
  }

  function gameStart(tx, ty, yaw) {
    const p = game.player;
    p.x = (tx + 0.5) * TILE;
    p.y = (ty + 0.5) * TILE;
    p.facing = { x: Math.sin(yaw), y: Math.cos(yaw) };
    p.riding = false;
    G.yaw = yaw;
    if (G.on) return;
    G.on = true;
    G.t0 = performance.now();
    const orig = window.v3SyncActors;
    window.v3SyncActors = function (dt) {
      orig(dt);
      try { gameTick(); } catch (e) { console.log('[drache] ' + e.message); }
    };
  }

  function gameTick() {
    const pa = actors3.get(entityKey(game.player));
    if (!pa) return;
    if (!G.d) {
      // eigenes Modell für den Spiel-Renderer: das Spiel gibt die Rohdaten nach dem Hochladen frei (freeArray),
      // ein Modell, das schon die Vorschau-Bühne gezeichnet hat, ließe sich dort nicht mehr hochladen
      G.d = makeActor(model3('vorschau:drache:spiel', (b) => dragonMount3(b, {})));
      V3.actors.add(G.d.group);
    }
    const d = G.d;
    const t = G.fixedT != null ? G.fixedT : (performance.now() - G.t0) / 1000;
    resetBones(d);
    d.group.position.set(pa.group.position.x, 0, pa.group.position.z);
    d.group.rotation.y = G.yaw;
    pa.heading = G.yaw;
    const r = dragonMountPose3(d, t, { air: G.air == null ? 1 : G.air, ph: G.ph != null ? G.ph : (t * DRACHE3.hzHover) % 1, moving: !!G.moving });
    d.blob.scale.setScalar(d.model.blob * (1 - 0.35 * Math.min(1, r.lift / 2.5)));
    const s = dragonSeat3(d);
    const k = pa.model.scale;
    pa.group.position.y = s.pos.y - pa.model.hipY * k + 0.03;
    pa.group.position.x = s.pos.x;
    pa.group.position.z = s.pos.z;
    pa.group.rotation.set(s.pitch, G.yaw, s.roll, 'YXZ');
    const B = pa.bones;
    B[BH.legL].rotation.set(-0.95, 0, 1.12);
    B[BH.legR].rotation.set(-0.95, 0, -1.12);
    B[BH.armL].rotation.set(-0.75, 0, -0.25);
    B[BH.armR].rotation.set(-0.75, 0, 0.25);
    if (pa.blob) pa.blob.visible = false;
  }

  return { init, clear, dragon, riderOn, standing, horse, shot, sheet, strip, findForest, gameStart, G };
})();
