// Hilfsfunktionen für die Trailer-Aufnahme (per addScriptTag ins laufende Spiel eingespritzt, ändert keinen Spielcode)
(() => {
  const T = (window.T = {});
  T.god = true;
  T.cam = null; // { yaw, pitch, dist, fov, ahead, fx, fy } – überschreibt den Schulterblick

  T.gear = (classId, path, tier = 9) => {
    const kinds = { krieger: path === 1 ? 'greatsword' : 'sword', ninja: path === 1 ? 'bow' : 'dagger', schamane: 'fan', nekromant: 'staff', magier: 'rod' };
    const mk = (slot, kind, cls) => {
      const it = makeItem(slot, tier, 20, cls || classId, kind);
      it.rarity = 4;
      return it;
    };
    const eq = {
      waffe: mk('waffe', kinds[classId]), ruestung: mk('ruestung'), helm: mk('helm'), schultern: mk('schultern'), umhang: mk('umhang'),
      schuhe: mk('schuhe'), guertel: mk('guertel'), schild: null
    };
    if (classId === 'krieger') eq.schild = path === 0 ? mk('waffe', 'sword') : null;
    if (classId === 'ninja') eq.schild = path === 1 ? mk('koecher', null, 'ninja') : mk('waffe', 'dagger');
    return eq;
  };

  T.save = (classId, path, x, y, name, extra = {}) => {
    const s = newCharacter(name, classId, path);
    Object.assign(s, {
      level: 80, xp: 0, gold: 123456, skillLevels: [48, 48, 48, 48, 48], skillPoints: 0,
      equipment: T.gear(classId, path, extra.tier ?? 9), inventory: [], statPoints: 0,
      attrs: { str: 60, vit: 60, int: 60, dex: 60 }, potions: { hp: 50, mp: 50 },
      horse: true, horseTier: 5, riding: false, dualWield: classId === 'krieger' && path === 0, titanGrip: false, dagger2: true, quiverGiven: true,
      bowPathGift: true, arrows: { [typeof ARROW_TYPES !== 'undefined' ? ARROW_TYPES.length - 1 : 0]: 99999 }, goldGift: 1, x, y, hp: null, mp: null,
      daily: { day: new Date().toISOString().slice(0, 10), claimed: true, streak: 3 }
    }, extra);
    return s;
  };

  T.start = (classId, path, x, y, name, extra) => {
    startGame(T.save(classId, path, x, y, name, extra), 0);
    T.after();
  };

  // Spieler wechseln, ohne neu zu laden
  T.swap = (classId, path, x, y, name, extra) => {
    const old = game.player;
    const s = T.save(classId, path, x, y, name, extra);
    game.player = makePlayer(s);
    game.stats = playerStats(game.player);
    game.allies = []; game.clones = []; game.projectiles = []; game.effects = []; game.particles = []; game.texts = [];
    game.target = null;
    game.player.hp = game.stats.maxHp; game.player.mp = game.stats.maxMp;
    ui.enterGame && ui.buildSkillBar();
    try { $('hudName').textContent = name; $('hudClass').textContent = CLASSES[classId].name; drawPortrait($('hudPortrait'), game.player); } catch (e) {}
    T.after();
    return old;
  };

  T.after = () => {
    try { ui.closePanels(); } catch (e) {}
    clearTimeout(ui.dailyTimer);
    const p = game.player;
    p.hp = game.stats.maxHp;
    p.mp = game.stats.maxMp;
  };

  T.tp = (x, y) => {
    const p = game.player;
    p.x = x; p.y = y;
    p.dash = null;
    input.walkTo = null;
  };

  T.face = (x, y) => {
    const p = game.player;
    const d = Math.hypot(x - p.x, y - p.y) || 1;
    p.facing = { x: (x - p.x) / d, y: (y - p.y) / d };
  };

  // Fertigkeit i (0–4) wirken, optional an einem Zielort
  T.cast = (i, x, y) => {
    const p = game.player;
    const sk = classSkills(p)[i];
    p.skillCd[i] = 0;
    p.gcdUntil = 0;
    if (p.gcd) p.gcd = 0;
    p.mp = game.stats.maxMp;
    p.lastCast = -99;
    if (x != null) T.face(x, y);
    if (sk.aim) {
      const pt = x != null ? { x, y, r: 0 } : skillAimPoint(sk);
      game.aim = { i, sk, pt, until: game.time + 5, go: true };
      useSkill(i);
      if (game.aim && game.aim.fx) game.aim.fx.dur = 0;
      if (game.aim && game.aim.rangeFx) game.aim.rangeFx.dur = 0;
      game.aim = null;
      document.body.classList.remove('aiming');
    } else useSkill(i);
    p.mp = game.stats.maxMp;
  };
  T.ult = (x, y) => {
    const p = game.player;
    p.ultCd = 0;
    if (x != null) T.face(x, y);
    useUltimate();
  };
  T.skillNames = () => classSkills(game.player).map((s, i) => i + ':' + s.name + ':' + s.type + (s.aim ? ':aim' : ''));

  T.spawn = (type, x, y, n = 1, radius = 60, level) => {
    const out = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + Math.random() * 0.5;
      const d = n === 1 ? 0 : radius * (0.5 + Math.random() * 0.5);
      const m = createMonster(type, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, { level: level || MONSTER_TYPES[type].level, respawn: false, zone: zoneAt(x, y) });
      m.trailer = true;
      game.monsters.push(m);
      out.push(m);
    }
    return out.length;
  };
  // Monster in der Nähe entfernen (für eine freie Bühne)
  T.clear = (x, y, r) => {
    game.monsters = game.monsters.filter((m) => m.trailer || Math.hypot(m.x - x, m.y - y) > r);
  };
  T.spot = (zoneId, from = 0, to = 0.3) => {
    const z = ZONES.find((q) => q.id === zoneId);
    for (let k = 0; k < 50; k++) {
      const sp = randomSpotInZone(z, from, to);
      if (!sp) continue;
      // freier Platz: im Umkreis von 4 Kacheln nichts im Weg
      let ok = true;
      for (let dy = -4; dy <= 4 && ok; dy++) for (let dx = -4; dx <= 4 && ok; dx++) if (tileBlocked(Math.floor(sp.x / TILE) + dx, Math.floor(sp.y / TILE) + dy)) ok = false;
      if (ok) return sp;
    }
    return null;
  };
  // langsame Monster (bleiben als Kreis um die Figur statt auf ihr zu stehen)
  T.slow = (k = 0.3) => {
    for (const m of game.monsters) if (m.trailer && !m.slowed) { m.type = Object.assign({}, m.type, { speed: (m.type.speed || 100) * k }); m.slowed = true; }
  };
  T.clearTrailer = () => { game.monsters = game.monsters.filter((m) => !m.trailer); };
  T.near = (x, y, r) => game.monsters.filter((m) => !m.dead && Math.hypot(m.x - x, m.y - y) < r).map((m) => m.typeId + (m.isStone ? '(stone ' + m.level + ')' : '') + '@' + Math.round(m.x) + ',' + Math.round(m.y));

  // je Bild vor dem Spieltakt
  T.tick = () => {
    if (typeof quality !== 'undefined') { quality.pauseUntil = 1e15; quality.noShadow = false; }
    const p = game.player;
    if (p && T.god) {
      if (p.dead) { p.dead = false; }
      const s = game.stats;
      if (s) { p.hp = Math.max(p.hp, s.maxHp * 0.92); p.mp = s.maxMp; }
    }
    if (T.cam && typeof SHOULDER3 !== 'undefined') {
      let c = T.cam;
      // Hochkant: etwas weiter weg und steiler, damit die Szene in die schmale Breite passt
      if (innerHeight > innerWidth) c = Object.assign({}, c, { dist: (c.dist || 10) * (T.portraitDist || 1.35), pitch: (c.pitch || 0.4) + 0.08, fov: Math.min(62, (c.fov || 48) + 6) });
      if (c.pitch != null) SHOULDER3.pitch = c.pitch;
      if (c.dist != null) SHOULDER3.dist = c.dist;
      if (c.fov != null) SHOULDER3.fov = c.fov;
      if (c.ahead != null) SHOULDER3.ahead = c.ahead;
      if (c.yaw != null) { V3.yaw = c.yaw; V3.yawGoal = c.yaw; }
    }
    if (T.onTick) T.onTick();
  };
  window.__tick = T.tick;

  // Nebel weiter weg (für Überflüge) und Anzeigen über den Köpfen abschaltbar
  T.fog = null; // { near, far } in Einheiten
  const origMood = window.v3UpdateMood;
  window.v3UpdateMood = function (dt, x, y) {
    origMood(dt, x, y);
    if (T.fog) { V3.scene.fog.near = T.fog.near; V3.scene.fog.far = T.fog.far; }
    if (T.night != null) dayNight.force = T.night;
    if (T.light) { V3.sun.intensity *= T.light; V3.hemi.intensity *= T.light; }
  };
  T.hide = { labels: false, marks: false, guide: true, status: false, texts: false };
  const wrap = (name, key) => {
    const o = window[name];
    window[name] = function () { if (T.hide[key]) return; return o.apply(this, arguments); };
  };
  wrap('drawLabel', 'labels');
  wrap('drawNpcMarks', 'marks');
  wrap('drawGuide', 'guide');
  wrap('drawMonsterStatus', 'status');
  wrap('drawTexts', 'texts');
  T.dmgScale = 0.05;
  const origDmg = window.damagePlayer;
  window.damagePlayer = function (amount, attacker) { return origDmg(T.god ? amount * T.dmgScale : amount, attacker); };
  const origDie = window.playerDie;
  window.playerDie = function () { if (T.god) { game.player.hp = game.stats.maxHp; return; } return origDie.apply(this, arguments); };
  const origUM = window.updateMonsters;
  window.updateMonsters = function (dt) {
    const saved = [];
    for (const m of game.monsters) if (m.pin && !m.dead) saved.push([m, m.x, m.y]);
    origUM(dt);
    for (const [m, x, y] of saved) { m.x = x; m.y = y; m.moving = false; m.dash = null; }
  };
  T.noLoot = true;
  const origReward = window.rewardKill;
  window.rewardKill = function (m) { if (T.noLoot) return; return origReward.apply(this, arguments); };
  T.norender = false;
  const origRender = window.render;
  window.render = function () { if (T.norender) return; return origRender.apply(this, arguments); };
  T.attack = false;
  const origTick = T.tick;
  T.tick = () => { origTick(); if (T.attack) input.attackAt = game.time; };
  window.__tick = T.tick;

  // Kamera-Brennpunkt fest auf einen Weltpunkt (statt der Figur), z. B. für Überflüge
  const origPlace = window.v3PlaceCamera;
  T.focus = null; // {x,y}
  window.v3PlaceCamera = function (fx, fy, dt) {
    if (T.focus) { fx = T.focus.x; fy = T.focus.y; }
    return origPlace(fx, fy, dt);
  };
})();
