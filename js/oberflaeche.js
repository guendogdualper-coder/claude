// Oberfläche: Startbildschirm, Anzeigen (HUD), Fenster und Nachrichten.

const $ = (id) => document.getElementById(id);

// Im Querformat meldet das iPhone links und rechts denselben sicheren Rand, die Kamera-Aussparung sitzt
// aber nur auf einer Seite: Drehwinkel 90 = Oberkante links, 270 = Oberkante rechts.
function updateNotchSide() {
  const o = screen.orientation;
  const a = ((Number(o && typeof o.angle === 'number' ? o.angle : window.orientation) || 0) % 360 + 360) % 360;
  document.documentElement.dataset.notch = a === 90 ? 'l' : a === 270 ? 'r' : '';
}

const ui = {
  selectedClass: 'krieger',
  selectedPath: 0,
  cache: {},
  logTimer: null,

  init() {
    $('btnChar').addEventListener('click', () => this.toggle('panelChar'));
    $('btnHelp').addEventListener('click', () => this.toggle('panelHelp'));
    $('btnInv').addEventListener('click', () => this.toggle('panelInv'));
    $('btnHorse').addEventListener('click', () => toggleRide());
    $('btnNet').addEventListener('click', () => this.toggle('panelNet'));
    $('btnSocial').addEventListener('click', () => this.toggle('panelSocial'));
    $('btnDaily').addEventListener('click', () => this.toggle('panelDaily'));
    $('btnOpts').addEventListener('click', () => this.toggle('panelOpts'));
    $('btnStatPlus').addEventListener('click', () => this.toggle('panelChar'));
    $('btnChat').addEventListener('click', () => this.openChat());
    // Chat-Knopf in der Ecke: im Kanal schreiben, allein die Server-Auswahl öffnen
    $('chatOpen').addEventListener('click', () => {
      if (netOnline()) this.openChat();
      else {
        this.toggle('panelNet');
        this.log('Chat gibt es im Kanal: wähle Server ERFOO und einen Kanal.', 'info');
      }
    });
    // Seite der Kamera-Aussparung merken, damit die Anzeigen auf der freien Seite bis an den Rand dürfen
    updateNotchSide();
    window.addEventListener('orientationchange', updateNotchSide);
    window.addEventListener('resize', updateNotchSide);
    // Kleine Karte antippen öffnet die große Karte (seit 8.8, am PC auch Taste M);
    // das Gebietsband darunter klappt auf dem Handy Gold, Splitter, Akku, Uhr und Ping auf oder zu
    const map = document.querySelector('.hud-map');
    try { map.classList.toggle('open', localStorage.getItem('seelenstein.kartendetails') === '1'); } catch (e) {}
    map.addEventListener('click', (e) => {
      const r = $('minimap').getBoundingClientRect();
      if (e.clientX >= r.left - 4 && e.clientX <= r.right + 4 && e.clientY >= r.top - 4 && e.clientY <= r.bottom + 4) {
        openBigMap();
        return;
      }
      const open = map.classList.toggle('open');
      try { localStorage.setItem('seelenstein.kartendetails', open ? '1' : '0'); } catch (e2) {}
    });
    setupBigMap();
    this.chatHint();
    this.initBattery();
    this.initTips();
    $('chatClose').addEventListener('click', () => { $('chatBar').hidden = true; });
    for (const b of document.querySelectorAll('#chatTabs button, #chatChan button')) {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        this.setChatChan(b.dataset.c);
        if (b.closest('#chatChan')) $('chatInput').focus();
      });
    }
    $('chatBar').addEventListener('submit', (e) => {
      e.preventDefault();
      netChat($('chatInput').value);
      $('chatInput').value = '';
      $('chatBar').hidden = true;
      $('chatInput').blur();
    });
    onPress($('potHp'), () => usePotion('hp'));
    $('potHp').querySelector('.flask').src = lootIconUrl('potHp');
    $('potMp').querySelector('.flask').src = lootIconUrl('potMp');
    onPress($('potMp'), () => usePotion('mp'));
    $('btnLoot').addEventListener('click', () => this.toggle('panelLoot'));
    $('lootFeed').addEventListener('click', () => this.toggle('panelLoot'));
    $('btnRevive').addEventListener('click', () => {
      $('panelDeath').hidden = true;
      revivePlayer(false);
    });
    $('btnReviveHere').addEventListener('click', () => {
      $('panelDeath').hidden = true;
      revivePlayer(true);
    });
    document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => this.closePanels()));

    $('zoneList').innerHTML = ZONES.map((z) => `<li>${z.name} <span>· ${z.levels}</span></li>`).join('');
    $('stoneList').innerHTML = STONE_TYPES.map((t) => {
      const zone = ZONES.find((z) => (z.stones || []).some(([lv]) => lv === t.level));
      return `<li><b style="color:${t.look.glow}">■</b> Stufe ${t.level} · ${t.name} <span>· ${zone ? zone.name : ''} · ${t.drop}</span></li>`;
    }).join('');

    // Startbildschirm: Charakterauswahl (4 Plätze) und Konto
    $('btnCreateBack').addEventListener('click', () => { this.creating = false; this.showStart(); });
    accountInit();
    $('createForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('charName').value.trim();
      if (!/^[\p{L}\p{N} _-]{2,14}$/u.test(name)) {
        $('createError').textContent = 'Der Name braucht 2 bis 14 Zeichen: Buchstaben, Zahlen, Leerzeichen, - oder _.';
        $('createError').hidden = false;
        return;
      }
      const save = newCharacter(name, this.selectedClass, this.selectedPath, this.createLook || DEFAULT_LOOKS[this.selectedClass]);
      const free = listSaves().findIndex((sv) => !sv);
      if (free < 0) {
        $('createError').textContent = 'Alle vier Plätze sind belegt. Lösche zuerst einen Charakter.';
        $('createError').hidden = false;
        return;
      }
      this.creating = false;
      startGame(save, free);
      saveGame();
    });
    this.setupInstall();
    this.buildClassGrid();
    this.createLook = { ...DEFAULT_LOOKS[this.selectedClass] };
    this.renderCreateLook();
    $('btnLookSave').addEventListener('click', () => {
      const p = game.player;
      p.look = { ...this.editLook };
      saveGame();
      drawPortrait($('hudPortrait'), p);
      this.closePanels();
      ui.log('Dein neues Aussehen steht dir gut.', 'level');
    });
    $('versionText').textContent = 'Version ' + GAME_VERSION;
  },

  // Als App installieren: Android fragt selbst (beforeinstallprompt), am iPhone zeigen wir den Weg.
  // Läuft das Spiel schon als App (Home-Bildschirm), bleibt der Knopf weg.
  setupInstall() {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (standalone) return;
    $('installBox').hidden = false;
    let prompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      prompt = e;
    });
    $('btnInstall').addEventListener('click', () => {
      if (prompt) {
        prompt.prompt();
        prompt.userChoice.finally(() => { prompt = null; });
        return;
      }
      $('installHelp').hidden = !$('installHelp').hidden;
    });
  },

  // Aussehen bei der Erstellung
  renderCreateLook() {
    lookEditor($('lookEditor'), this.selectedClass, this.createLook, (look) => {
      this.createLook = look;
      this.lookTouched = true;
    }, null, this.selectedPath || 0);
  },

  // Aussehen später im Charakterfenster ändern
  openLookPanel() {
    const p = game.player;
    this.closePanels();
    this.editLook = { ...DEFAULT_LOOKS[p.classId], ...(p.look || {}) };
    lookEditor($('lookPanelEditor'), p.classId, this.editLook, (look) => { this.editLook = look; }, p.equipment, p.path || 0);
    $('panelLook').hidden = false;
  },

  showStart() {
    $('startScreen').hidden = false;
    $('hud').hidden = true;
    const saves = listSaves();
    const any = saves.some(Boolean);
    this.renderAccount();
    if (any && !this.creating) {
      $('charSelect').hidden = false;
      $('createForm').hidden = true;
      this.renderSlots(saves);
    } else {
      $('charSelect').hidden = true;
      $('createForm').hidden = false;
      $('createError').hidden = true;
      $('btnCreateBack').hidden = !any;
    }
  },

  // Vier Plätze: belegte mit Bild, Name, Klasse, Weg und Stufe; freie zum Erstellen
  renderSlots(saves) {
    const box = $('charSlots');
    const last = lastSlot();
    box.innerHTML = '';
    saves.forEach((sv, k) => {
      const card = document.createElement('div');
      card.className = 'char-slot' + (sv ? '' : ' empty') + (k === last ? ' last' : '');
      if (!sv) {
        card.innerHTML = '<button type="button" class="char-new">＋<span>Neuer Charakter</span></button>';
        card.querySelector('button').addEventListener('click', () => { this.creating = true; this.showStart(); $('charName').focus(); });
        box.append(card);
        return;
      }
      // Klasse aus einer neueren Version (seit 8.6): gesperrt, nicht spielbar und nicht löschbar
      if (sv.unknown) {
        card.classList.add('locked');
        card.innerHTML = `<div class="char-pic char-pic-unknown">?</div><div class="char-info"><strong>${escapeHtml(sv.name)}</strong>` +
          `<span>Unbekannte Klasse</span><b>Stufe ${sv.level}</b></div><button type="button" class="btn btn-ghost char-play" disabled>Neuere Version nötig</button>`;
        box.append(card);
        return;
      }
      const cv = document.createElement('canvas');
      cv.width = 96;
      cv.height = 96;
      cv.className = 'char-pic';
      drawClassPreview(cv, sv.classId, sv.path);
      const way = sv.path != null ? classPath(sv.classId, sv.path).name : '';
      const info = document.createElement('div');
      info.className = 'char-info';
      info.innerHTML = `<strong>${escapeHtml(sv.name)}</strong><span>${CLASSES[sv.classId].name}${way ? ' · ' + way : ''}</span><b>Stufe ${sv.level}</b>`;
      const play = document.createElement('button');
      play.type = 'button';
      play.className = 'btn btn-primary char-play';
      play.textContent = 'Spielen';
      // der zuletzt gespielte behält die alte Kennung „Weiterspielen“
      if (k === last || (last == null && !box.querySelector('#btnContinue'))) play.id = 'btnContinue';
      play.addEventListener('click', () => { const save = loadSave(k); if (save) startGame(save, k); });
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'char-del';
      del.title = 'Charakter löschen';
      del.textContent = '✕';
      del.addEventListener('click', () => {
        card.classList.add('confirming');
        const ask = document.createElement('div');
        ask.className = 'char-confirm';
        ask.innerHTML = `<p>${escapeHtml(sv.name)} wirklich löschen?</p><div><button type="button" class="btn btn-danger">Löschen</button><button type="button" class="btn btn-ghost">Nein</button></div>`;
        ask.querySelector('.btn-danger').addEventListener('click', () => { deleteSave(k); this.showStart(); });
        ask.querySelector('.btn-ghost').addEventListener('click', () => this.showStart());
        card.append(ask);
      });
      card.append(cv, info, play, del);
      box.append(card);
    });
  },

  // Konto: anmelden/registrieren oder Name, Speicherstand und Abmelden
  // Charaktere vom Gerät, für die im Konto gerade kein Platz frei ist
  pendingNote() {
    const pend = (readSlots().pending || []).filter((sv) => sv && !sv.deleted);
    if (!pend.length) return '';
    const who = pend.map((sv) => `${escapeHtml(sv.name)} (Stufe ${sv.level})`).join(', ');
    return `<p class="acc-pending">Im Konto sind alle vier Plätze belegt. ${who} ${pend.length > 1 ? 'warten' : 'wartet'} sicher auf diesem Gerät ` +
      'und ' + (pend.length > 1 ? 'kommen' : 'kommt') + ' automatisch dazu, sobald du einen Platz frei machst.</p>';
  },

  renderAccount() {
    const box = $('accountBox');
    if (!box) return;
    if (!cloudReady()) { box.hidden = true; return; }
    box.hidden = false;
    if (accountOn()) {
      const st = account.state === 'sync' ? '☁ gleiche ab …' : account.state === 'error' ? `⚠ ${escapeHtml(account.msg)}` : '☁ im Konto gespeichert';
      box.innerHTML = `<div class="acc-row"><span class="acc-name">👤 ${escapeHtml(account.name || '')}</span><span class="acc-state ${account.state}">${st}</span>` +
        '<button type="button" class="btn btn-ghost acc-out">Abmelden</button></div>' +
        this.pendingNote();
      box.querySelector('.acc-out').addEventListener('click', async () => {
        box.querySelector('.acc-out').disabled = true;
        await accountLogout();
        this.showStart();
      });
      return;
    }
    if (this.accBusy) return;
    box.innerHTML = '<p class="acc-hint">Mit Konto liegen deine Charaktere sicher auf dem Server – spiel auf Handy, PC oder Tablet weiter.</p>' +
      '<div class="acc-form"><input id="accName" type="text" maxlength="20" autocomplete="username" spellcheck="false" placeholder="Kontoname">' +
      '<input id="accPass" type="password" maxlength="64" autocomplete="current-password" placeholder="Passwort (mind. 6 Zeichen)">' +
      '<button type="button" class="btn btn-primary" data-acc="login">Anmelden</button><button type="button" class="btn btn-ghost" data-acc="register">Registrieren</button></div>' +
      `<p id="accMsg" class="acc-msg"${account.msg && account.state === 'off' ? '' : ' hidden'}>${escapeHtml(account.msg || '')}</p>`;
    box.querySelectorAll('[data-acc]').forEach((b) => b.addEventListener('click', async () => {
      const name = $('accName').value;
      const pass = $('accPass').value;
      const msg = $('accMsg');
      box.querySelectorAll('button').forEach((x) => { x.disabled = true; });
      msg.hidden = false;
      msg.textContent = b.dataset.acc === 'register' ? 'Konto wird angelegt …' : 'Melde an …';
      this.accBusy = true;
      try {
        await accountLogin(b.dataset.acc, name, pass);
        this.accBusy = false;
        this.creating = false;
        this.showStart();
      } catch (e) {
        this.accBusy = false;
        account.msg = e.message;
        msg.textContent = e.message;
        box.querySelectorAll('button').forEach((x) => { x.disabled = false; });
      }
    }));
  },

  buildClassGrid() {
    const grid = $('classGrid');
    grid.innerHTML = '';
    for (const id of CLASS_ORDER) {
      const c = CLASSES[id];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'class-card';
      btn.id = 'class-' + id;
      btn.dataset.classId = id;
      btn.setAttribute('aria-pressed', String(id === this.selectedClass));
      const cv = document.createElement('canvas');
      cv.width = 112;
      cv.height = 112;
      drawClassPreview(cv, id, id === this.selectedClass ? this.selectedPath : 0);
      const strong = document.createElement('strong');
      strong.textContent = c.name;
      const small = document.createElement('small');
      small.textContent = c.role;
      btn.append(cv, strong, small);
      btn.addEventListener('click', () => {
        this.selectedClass = id;
        this.selectedPath = 0;
        if (!this.lookTouched) this.createLook = { ...DEFAULT_LOOKS[id] };
        this.renderCreateLook();
        grid.querySelectorAll('.class-card').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.classId === id)));
        this.renderClassDetail();
      });
      grid.append(btn);
    }
    this.renderClassDetail();
  },

  renderClassDetail() {
    const c = CLASSES[this.selectedClass];
    $('classDetail').innerHTML = `<p>${c.description}</p><h3 class="path-head">${c.paths.length === 4 ? 'Element wählen' : 'Weg wählen'}</h3>` +
      pathChoiceHtml(c, this.selectedPath) +
      skillListHtml(c.paths[this.selectedPath].skills, null) + ultHtml(ULTIMATES[c.paths[this.selectedPath].id], null);
    drawPathSigils($('classDetail'));
    $('classDetail').querySelectorAll('[data-path]').forEach((b) => b.addEventListener('click', () => {
      this.selectedPath = Number(b.dataset.path);
      this.renderClassDetail();
      // Magier: Kristall, Hutband und Handlicht der Vorschau in der Farbe des gewählten Elements
      if (c.paths.length === 4) {
        const card = $('class-' + this.selectedClass);
        if (card) drawClassPreview(card.querySelector('canvas'), this.selectedClass, this.selectedPath);
        this.renderCreateLook();
      }
    }));
  },

  // Ältere Spielstände: Weg einmalig auswählen
  showPathChoice() {
    const p = game.player;
    const c = CLASSES[p.classId];
    let pick = p.path || 0;
    const render = () => {
      $('pathBody').innerHTML = `<p>Jede Klasse hat eigene Wege mit eigenen Fertigkeiten. Wähle deinen Weg als ${c.name}. ` +
        `Deine Fertigkeitspunkte bekommst du zurück und kannst sie neu verteilen.</p>` +
        pathChoiceHtml(c, pick) + skillListHtml(c.paths[pick].skills, null) + ultHtml(ULTIMATES[c.paths[pick].id], null) +
        `<button id="btnPathOk" class="btn btn-primary" type="button">${c.paths[pick].name} wählen</button>`;
      drawPathSigils($('pathBody'));
      $('pathBody').querySelectorAll('[data-path]').forEach((b) => b.addEventListener('click', () => {
        pick = Number(b.dataset.path);
        render();
      }));
      $('btnPathOk').addEventListener('click', () => {
        p.path = pick;
        p.needsPath = false;
        p.buffs = [];
        enforceGearRules(p);
        game.stats = playerStats(p);
        $('panelPath').hidden = true;
        this.buildSkillBar();
        ui.log(`Du folgst jetzt dem ${c.paths[pick].name}. Verteile deine Fertigkeitspunkte im Charakterfenster.`, 'level');
        saveGame();
      });
    };
    render();
    this.closePanels();
    $('pathTitle').textContent = 'Wähle deinen Weg';
    $('panelPath').hidden = false;
  },

  // Elementwechsel (seit 8.6, nur Magier): im Dorf oder Lager, nicht im Duell und erst 10 s nach dem letzten Kampf.
  // Bis Stufe 10 kostenlos, danach 500 Gold je Stufe. Die Fertigkeitsstufen liegen je Platz und bleiben.
  showElementChoice() {
    const p = game.player;
    if (p.classId !== 'magier') return;
    const c = CLASSES.magier;
    let pick = p.path || 0;
    let asking = false;
    const render = () => {
      const cost = mageElementCost(p);
      const same = pick === (p.path || 0);
      const E = MAGE_EL[MAGE_PATH_EL[pick]];
      const ok = !same && p.gold >= cost && canChangeElement(p);
      $('pathBody').innerHTML = `<p>Wähle ein neues Element. Deine Fertigkeitsstufen bleiben erhalten, die Buffs deines alten Elements enden. ` +
        `Bücher des alten Elements gehören danach zu fremden Fertigkeiten.</p>` +
        pathChoiceHtml(c, pick) + skillListHtml(c.paths[pick].skills, null) + ultHtml(ULTIMATES[c.paths[pick].id], null) +
        `<p class="el-cost">${cost ? `Kosten: ${cost.toLocaleString('de-DE')} Gold (du hast ${p.gold.toLocaleString('de-DE')})` : 'Bis Stufe 10 kostenlos.'}</p>` +
        (asking && ok
          ? `<p class="el-ask">Element zu ${E.name} wechseln für ${cost.toLocaleString('de-DE')} Gold? Deine Fertigkeitsstufen bleiben erhalten.</p>` +
            `<div class="create-row"><button id="btnElementOk" class="btn btn-primary" type="button">Wechseln</button>` +
            `<button id="btnElementNo" class="btn btn-ghost" type="button">Nein</button></div>`
          : `<button id="btnElementOk" class="btn btn-primary" type="button"${ok ? '' : ' disabled'}>${same ? 'Dein jetziges Element' : `Element zu ${E.name} wechseln`}</button>`);
      drawPathSigils($('pathBody'));
      $('pathBody').querySelectorAll('[data-path]').forEach((b) => b.addEventListener('click', () => {
        pick = Number(b.dataset.path);
        asking = false;
        render();
      }));
      if ($('btnElementNo')) $('btnElementNo').addEventListener('click', () => { asking = false; render(); });
      $('btnElementOk').addEventListener('click', () => {
        // kostet es Gold, erst nachfragen
        if (cost && !asking) { asking = true; render(); return; }
        if (changeMageElement(pick)) $('panelPath').hidden = true;
        else { asking = false; render(); }
      });
    };
    render();
    this.closePanels();
    $('pathTitle').textContent = 'Element wechseln';
    $('panelPath').hidden = false;
  },

  enterGame() {
    $('startScreen').hidden = true;
    $('hud').hidden = false;
    $('touchControls').hidden = !input.touchUi;
    $('hud').classList.toggle('touch', input.touchUi);
    $('log').innerHTML = '';
    this.cache = {};
    this.buildSkillBar();
    const c = CLASSES[game.player.classId];
    $('hudName').textContent = game.player.name;
    $('hudClass').textContent = c.name;
    $('lootFeed').innerHTML = '';
    this.lootRows = [];
    drawPortrait($('hudPortrait'), game.player);
    this.renderQuestTrack();
    this.updateHorseButton();
    this.updateNetBadge();
    this.updateDailyBadge();
    // Tagesbelohnung: beim Einloggen von selbst zeigen, wenn sie heute noch nicht abgeholt ist
    clearTimeout(this.dailyTimer);
    this.dailyTimer = setTimeout(() => {
      if (game.player && !dailyState().claimed && !this.anyPanelOpen()) this.toggle('panelDaily');
    }, 1500);
    netAutoJoin();
    const moved = game.player.gearMoved || [];
    if (moved.length) {
      this.log(`Neu in Version 3.2: Schilde trägt nur der Krieger, Zweihänder nur der Weg des Leibes. Angepasst: ${moved.map(itemName).join(', ')}.`, 'warn');
      game.player.gearMoved = [];
    }
    if (game.player.needsPath) this.showPathChoice();
  },

  buildSkillBar() {
    const p = game.player;
    if (!p) return;
    const bar = $('skillBar');
    bar.innerHTML = '';
    bar.classList.remove('swapping');
    this.swapFrom = null;
    // Die Reihenfolge der Plätze kann man per langem Drücken ändern (p.skillOrder)
    skillOrder(p).forEach((i, slot) => {
      const sk = classSkills(p)[i];
      const wrap = document.createElement('div');
      wrap.className = 'skill-wrap';
      const btn = document.createElement('button');
      btn.type = 'button';
      const rank = skillRank(p.skillLevels[i]);
      btn.className = 'slot skill kind-' + sk.kind + (rank >= 0 ? ' rank-' + SKILL_RANKS[rank].id : '');
      btn.id = 'skill' + i;
      btn.title = `${sk.name} (${slot + 1}) – ${sk.text} ${skillStats(sk, p.skillLevels[i]).map(([k, v]) => k + ' ' + v).join(', ')}. Mana: ${skillMana(sk, p)}, Abklingzeit: ${sk.cooldown} s. Lange drücken zum Tauschen.`;
      btn.innerHTML = `<span class="key">${slot + 1}</span><img class="skill-icon" src="${skillIconUrl(sk)}" alt="${sk.short}">` +
        `<span class="slvl">${p.level >= sk.unlock ? skillLevelText(p.skillLevels[i]) : ''}</span>` +
        `<span class="cd" hidden></span>` +
        (p.level < sk.unlock ? `<span class="lock">ab Lv ${sk.unlock}</span>` : '');
      this.pressSkill(btn, i);
      wrap.append(btn);
      wrap.insertAdjacentHTML('beforeend', '<span class="runring" hidden></span><span class="run" hidden></span>');
      // Plus-Knopf, wenn etwas geht: Punkt setzen (der Punkt auf 15 erweckt), Buch lesen.
      // Nur der Schritt in einen höheren Rang (kostet mehrere Bücher) läuft über das Charakterfenster.
      const acts = skillActions(p, i).filter((a) => a.ok);
      if (acts.length) {
        const act = acts.find((a) => a.type === 'point') || acts.find((a) => a.type === 'rankup' && rank < 0) || acts.find((a) => a.type === 'book');
        // „E“, wenn der Tipp erweckt (der Punkt auf Stufe 15 macht seit 8.9 sofort E1)
        const awaken = act && (act.type === 'rankup' || (act.type === 'point' && p.skillLevels[i] + 1 >= SKILL_POINT_MAX));
        const plus = document.createElement('button');
        plus.type = 'button';
        plus.className = 'plus' + (awaken ? ' awaken' : '');
        plus.title = awaken ? sk.name + ' erwecken' : sk.name + ' verbessern';
        plus.textContent = awaken ? 'E' : '+';
        plus.addEventListener('pointerdown', (e) => e.stopPropagation());
        plus.addEventListener('click', (e) => {
          e.stopPropagation();
          if (act) upgradeSkill(i, act.type);
          else this.toggle('panelChar');
        });
        wrap.append(plus);
      }
      bar.append(wrap);
    });
    // Ultimative Attacke des Weges: eigener großer Knopf, Taste 6
    const u = ultimateOf(p);
    if (u) {
      const wrap = document.createElement('div');
      wrap.className = 'skill-wrap ult-wrap';
      const locked = p.level < u.unlock;
      wrap.innerHTML = `<button type="button" id="skillUlt" class="slot skill ult${locked ? ' locked' : ''}" title="${u.name} (6) – ${u.text} ${u.stats}. Abklingzeit: 3 Minuten.">` +
        `<span class="key">6</span><img class="skill-icon" src="${skillIconUrl(u)}" alt="${u.short}">` +
        `<span class="cd" hidden></span>${locked ? `<span class="lock">ab Lv ${u.unlock}</span>` : ''}</button>`;
      const btn = wrap.firstChild;
      btn.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        useUltimate();
      });
      btn.addEventListener('click', (e) => { if (e.detail === 0) useUltimate(); });
      bar.append(wrap);
    }
    if (this.cache) this.cache.ult = null;
  },

  // Antippen löst die Fertigkeit aus, langes Drücken hebt sie an: dann auf einen anderen Platz
  // ziehen oder einen anderen Platz antippen, um die beiden zu tauschen.
  pressSkill(btn, i) {
    let timer = null;
    let lifted = false;
    btn.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      lifted = false;
      if (this.swapFrom != null) {
        timer = null;
        this.finishSwap(i);
        return;
      }
      try { btn.setPointerCapture(e.pointerId); } catch (err) { /* ältere Browser */ }
      timer = setTimeout(() => {
        timer = null;
        lifted = true;
        this.startSwap(i);
      }, SKILL_HOLD_MS);
    });
    btn.addEventListener('pointerup', (e) => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
        useSkill(i);
        return;
      }
      if (!lifted) return;
      lifted = false;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const target = el && el.closest('.slot.skill');
      if (target && target !== btn) this.finishSwap(Number(target.id.slice(5)));
    });
    btn.addEventListener('pointercancel', () => {
      clearTimeout(timer);
      timer = null;
    });
    // Tastatur (Enter/Leertaste auf dem Knopf)
    btn.addEventListener('click', (e) => { if (e.detail === 0) useSkill(i); });
  },

  startSwap(i) {
    this.swapFrom = i;
    $('skillBar').classList.add('swapping');
    $('skill' + i).parentElement.classList.add('swap-pick');
    buzz(25);
    ui.log(`${classSkills(game.player)[i].name} angehoben: auf einen anderen Platz ziehen oder tippen.`, 'info');
    // Tippen irgendwo anders bricht ab
    const cancel = (e) => {
      if (e.target.closest && e.target.closest('#skillBar .slot.skill')) return;
      document.removeEventListener('pointerdown', cancel, true);
      if (this.swapFrom != null) this.buildSkillBar();
    };
    this.swapCancel = cancel;
    setTimeout(() => document.addEventListener('pointerdown', cancel, true), 0);
  },

  finishSwap(j) {
    const p = game.player;
    const from = this.swapFrom;
    if (this.swapCancel) document.removeEventListener('pointerdown', this.swapCancel, true);
    this.swapFrom = null;
    if (from != null && j !== from) {
      const order = skillOrder(p);
      const a = order.indexOf(from);
      const b = order.indexOf(j);
      [order[a], order[b]] = [order[b], order[a]];
      p.skillOrder = order;
      saveGame();
      const sks = classSkills(p);
      ui.log(`${sks[from].name} und ${sks[j].name} haben die Plätze getauscht.`, 'info');
    }
    this.buildSkillBar();
  },

  // Schreibt nur geänderte Werte ins DOM
  set(key, value, fn) {
    if (this.cache[key] === value) return;
    this.cache[key] = value;
    fn(value);
  },

  // --- Mehrspieler ----------------------------------------------------------------------
  // Server-Auswahl: Server mit ihren Kanälen, Spielerzahl, Betreten und Verlassen
  renderNet() {
    const body = $('netBody');
    if (!body) return;
    const p = game.player;
    const online = netOnline();
    const servers = SERVERS.map((sv) => {
      const chans = Array.from({ length: sv.channels }, (_, k) => k + 1).map((ch) => {
        const mine = net.server === sv.id && net.channel === ch;
        const here = mine && online;
        const busy = mine && net.mode === 'joining';
        const n = net.probes[sv.id + ch];
        const info = here ? `${net.players.size + 1}/${NET_MAX} Spieler · du bist hier${net.mode === 'host' ? ' (deine Welt)' : ''}`
          : busy ? 'verbinde …'
            : n === 0 ? 'leer · du eröffnest ihn'
              : typeof n === 'number' ? `${n}/${NET_MAX} Spieler`
                : n === '?' ? 'online' : 'prüfe …';
        const dot = here ? 'here' : typeof n === 'number' && n > 0 ? 'busy' : 'free';
        return `<div class="channel${here ? ' here' : ''}"><span class="ch-dot ${dot}"></span>` +
          `<span class="ch-name"><strong>Kanal ${ch}</strong><small>${info}</small></span>` +
          (here ? '' : `<button type="button" class="btn btn-primary ch-btn" data-ch="${sv.id}:${ch}" ${busy ? 'disabled' : ''}>Betreten</button>`) + '</div>';
      }).join('');
      return `<section class="server-card"><h3>${sv.name} <small>${sv.note}</small></h3>${chans}</section>`;
    }).join('');
    let players = '';
    if (online) {
      const names = [`${escapeHtml(p.name)} <small>(du${net.mode === 'host' ? ', deine Welt' : ''})</small>`];
      for (const rp of net.players.values()) names.push(`${escapeHtml(rp.name)} <small>Lv ${rp.level} · ${CLASSES[rp.classId].name}</small>`);
      players = `<h3>Im Kanal</h3><ul class="net-list">${names.map((n) => `<li>${n}</li>`).join('')}</ul>` +
        '<div class="net-row"><button type="button" class="btn btn-ghost" data-net="share">Freunde einladen</button><button type="button" class="btn btn-ghost" data-net="solo">Allein spielen</button></div>';
    } else {
      players = '<div class="net-row"><button type="button" class="btn btn-ghost" data-net="solo">Allein spielen</button></div>';
    }
    body.innerHTML = '<p>Wähle einen Kanal. Alle im selben Kanal spielen in derselben Welt, jeder mit seiner eigenen Figur.</p>' +
      servers + players +
      '<p class="hint-text">Wer einen leeren Kanal betritt, führt dessen Welt für alle. Geht er, übernimmt automatisch ein anderer Spieler, der Kanal bleibt also immer offen. Erfahrung und Beute bekommt jeder, der mitkämpft oder in der Nähe ist.</p>' +
      '<p id="netMsg" class="hint-text"></p>';
    body.querySelectorAll('[data-ch]').forEach((b) => b.addEventListener('click', () => {
      const [srv, ch] = b.dataset.ch.split(':');
      netJoinChannel(srv, Number(ch));
    }));
    body.querySelectorAll('[data-net]').forEach((b) => b.addEventListener('click', async () => {
      const act = b.dataset.net;
      if (act === 'solo') {
        net.resume = null;
        if (net.mode !== 'off') netStop();
        this.closePanels();
      } else if (act === 'share') {
        const link = netLink();
        try {
          if (navigator.share) await navigator.share({ title: 'Seelenstein', text: `Komm zu mir auf ${serverName(net.server)}, Kanal ${net.channel}!`, url: link });
          else {
            await navigator.clipboard.writeText(link);
            $('netMsg').textContent = 'Link kopiert.';
          }
        } catch (e) {
          $('netMsg').textContent = `Sag deinen Freunden einfach: ${serverName(net.server)}, Kanal ${net.channel}.`;
        }
      }
    }));
  },

  // Rotes Zeichen am Geschenk-Knopf, solange die Tagesbelohnung wartet
  updateDailyBadge() {
    const b = $('dailyBadge');
    if (b && game.player) b.hidden = dailyState().claimed;
  },

  updateNetBadge() {
    const on = netOnline();
    $('btnChat').hidden = !on;
    // Kanal und Spielerzahl klein in der Statuszeile unter der Karte
    $('netBadge').hidden = true;
    $('stNet').hidden = !on;
    // „Umweg“: Daten laufen über den Broker statt direkt (typisch, wenn beide im Mobilfunk sind)
    if (on) $('stNet').textContent = `K${net.channel} · ${net.players.size + 1}/${NET_MAX}${net.hostConn && net.hostConn.via === 'relay' ? ' · Umweg' : ''}`;
    $('stNet').title = on ? `${serverName(net.server)} Kanal ${net.channel}` : '';
    $('btnNet').classList.toggle('on', on);
  },

  // EP-Leiste leuchtet kurz auf, wenn Erfahrung dazukommt
  xpPulse() {
    const bar = document.querySelector('.xp');
    if (!bar) return;
    bar.classList.remove('gain');
    void bar.offsetWidth;
    bar.classList.add('gain');
  },

  openChat() {
    if (!netOnline()) return;
    $('chatBar').hidden = false;
    $('chatInput').focus();
  },

  // Kleiner Chat unten links: die letzten Nachrichten bleiben stehen, die neueste unten.
  // Ohne Namen ist es eine Meldung des Kanals (jemand kommt oder geht).
  // c: g Global, gi Gilde, o Ort, sys Meldung. Die Reiter Global/Gilde/Ort wählen, was man sieht
  // und wohin man schreibt; unter Global stehen alle Nachrichten, Gilde und Ort mit Kennzeichen.
  chatChan: 'g',
  chatLines: [],

  chat(name, text, c, type) {
    c = c || (name ? 'g' : 'sys');
    this.chatLines.push({ name, text, c, type });
    if (this.chatLines.length > 60) this.chatLines.shift();
    if (this.chatShows(c)) this.renderChat();
    else {
      const tab = document.querySelector(`#chatTabs button[data-c="${c}"]`);
      if (tab) tab.classList.add('new');
    }
  },

  chatShows(c) {
    return this.chatChan === 'g' || c === this.chatChan;
  },

  setChatChan(c) {
    this.chatChan = c;
    for (const b of document.querySelectorAll('#chatTabs button, #chatChan button')) {
      const on = b.dataset.c === c;
      b.classList.toggle('on', on);
      b.setAttribute(b.getAttribute('role') === 'tab' ? 'aria-selected' : 'aria-pressed', on ? 'true' : 'false');
      if (on) b.classList.remove('new');
    }
    if (c === 'g') for (const b of document.querySelectorAll('#chatTabs button')) b.classList.remove('new');
    $('chatInput').placeholder = c === 'gi' ? 'Nachricht an deine Gilde …' : c === 'o' ? 'Nachricht an Spieler in der Nähe …' : 'Nachricht an alle …';
    this.renderChat();
  },

  renderChat() {
    const box = $('chatLog');
    box.textContent = '';
    const tags = { gi: 'Gilde', o: 'Ort' };
    const lines = this.chatLines.filter((l) => this.chatShows(l.c)).slice(-12);
    for (const l of lines) {
      const row = document.createElement('p');
      row.classList.add('ch-' + l.c);
      if (l.c === 'sys') row.classList.add('sys');
      if (l.type) row.classList.add('lg-' + l.type);
      if (this.chatChan === 'g' && tags[l.c]) {
        const t = document.createElement('i');
        t.textContent = '[' + tags[l.c] + '] ';
        row.append(t);
      }
      if (l.name) {
        const b = document.createElement('b');
        b.textContent = l.name + ': ';
        b.style.color = l.name === (game.player && game.player.name) ? '#ffd38a' : '';
        row.append(b);
      }
      row.append(document.createTextNode(l.text));
      box.append(row);
    }
    if (!lines.length) this.chatHint();
    box.scrollTop = box.scrollHeight;
  },

  // Hinweise an Elementen mit data-tip: mit der Maus beim Darüberfahren, auf dem Handy beim Antippen
  initTips() {
    const box = $('tipBox');
    // Direkt an die Seite hängen: im HUD läge der Hinweis immer hinter den Fenstern (Schmied, Inventar)
    document.body.appendChild(box);
    let cur = null;
    const show = (el) => {
      cur = el;
      box.textContent = el.dataset.tip;
      box.hidden = false;
      const r = el.getBoundingClientRect();
      const w = Math.min(280, window.innerWidth - 16);
      box.style.maxWidth = w + 'px';
      const bw = box.offsetWidth;
      const bh = box.offsetHeight;
      box.style.left = Math.max(8, Math.min(window.innerWidth - bw - 8, r.left + r.width / 2 - bw / 2)) + 'px';
      box.style.top = (r.top - bh - 6 > 4 ? r.top - bh - 6 : r.bottom + 6) + 'px';
    };
    const hide = () => { cur = null; box.hidden = true; };
    document.addEventListener('pointerover', (e) => {
      if (e.pointerType !== 'mouse') return;
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (el) show(el);
      else if (cur) hide();
    });
    document.addEventListener('click', (e) => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      // Antippen zeigt immer (die Maus hat ihn evtl. schon geöffnet), woanders hin tippen schließt
      if (el) show(el);
      else hide();
    }, true);
  },

  chatHint() {
    const box = $('chatLog');
    if (box.children.length) return;
    const c = this.chatChan;
    box.innerHTML = '<p class="hint">' + (c === 'gi' ? 'Gildenchat · nur deine Gilde liest mit.' : c === 'o' ? 'Ortschat · nur Spieler in deiner Nähe lesen mit.' : 'Chat · Tippe auf die Sprechblase, um zu schreiben.') + '</p>';
  },

  // Akku (wenn das Gerät ihn verrät; Safari auf dem iPhone tut das nicht)
  initBattery() {
    if (!navigator.getBattery) return;
    navigator.getBattery().then((bat) => {
      const show = () => {
        const pct = Math.round(bat.level * 100);
        $('stBattery').hidden = false;
        $('stBatText').textContent = pct + ' %';
        $('stBatFill').style.width = pct + '%';
        $('stBattery').classList.toggle('low', pct <= 20 && !bat.charging);
        $('stBattery').classList.toggle('charging', bat.charging);
      };
      show();
      bat.addEventListener('levelchange', show);
      bat.addEventListener('chargingchange', show);
    }).catch(() => {});
  },

  // Uhrzeit und Ping unter der Karte
  updateStatus() {
    const now = new Date();
    this.set('clock', now.getHours() * 60 + now.getMinutes(), () => {
      $('stClock').textContent = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    });
    // Ping: im Kanal zum Host, allein zum Spielserver (alle 10 Sekunden eine kleine Anfrage)
    if (!netOnline() && performance.now() - (this.webPingAt || -1e9) > 10000) this.measureWebPing();
    const offline = navigator.onLine === false;
    const raw = netOnline() && net.ping ? net.ping : this.webPing;
    const ms = offline ? -1 : raw ? Math.round(raw) : 0;
    const shown = offline ? 'offline' : ms ? ms + ' ms' : '– ms';
    this.set('ping', shown, () => {
      $('stPingText').textContent = shown;
      $('stPing').dataset.q = ms <= 0 ? 0 : ms < 120 ? 3 : ms < 300 ? 2 : 1;
    });
  },

  measureWebPing() {
    this.webPingAt = performance.now();
    if (navigator.onLine === false) return;
    const t0 = performance.now();
    fetch('manifest.webmanifest?ping=' + Date.now(), { method: 'HEAD', cache: 'no-store' })
      .then(() => { const rtt = performance.now() - t0; this.webPing = this.webPing ? this.webPing * 0.5 + rtt * 0.5 : rtt; })
      .catch(() => { this.webPing = 0; });
  },

  updateHorseButton() {
    const p = game.player;
    const btn = $('btnHorse');
    btn.hidden = !p || !p.horse;
    btn.classList.toggle('on', !!(p && p.riding));
    // Abzeichen mit dem Pferdetempo (seit 8.5), hervorgehoben beim Reiten
    let pct = btn.querySelector('.horse-pct');
    if (!pct) {
      pct = document.createElement('span');
      pct.className = 'horse-pct';
      btn.append(pct);
    }
    const horse = p && p.horse ? HORSES[p.horseTier || 1] || HORSES[1] : null;
    pct.hidden = !horse;
    if (horse) pct.textContent = '+' + Math.round(horse.speed * 100) + ' %';
    btn.title = horse ? `${horse.name} (+${Math.round(horse.speed * 100)} % Lauftempo)` : '';
  },

  // Lebensbalken eines Bosses oben in der Mitte, sobald man in seiner Nähe ist
  updateBossBar() {
    const p = game.player;
    const boss = game.monsters.find((m) => m.type && m.type.boss && !m.dead && dist(m, p) < 560);
    this.set('boss', boss ? boss.id + ':' + Math.ceil(boss.hp) : '', () => {
      $('bossBar').hidden = !boss;
      document.body.classList.toggle('has-boss', !!boss);
      if (!boss) return;
      $('bossName').textContent = `Lv ${boss.level} ${boss.name}`;
      $('bossFill').style.transform = `scaleX(${Math.max(0, boss.hp / boss.maxHp)})`;
      $('bossHp').textContent = `${Math.ceil(boss.hp).toLocaleString('de-DE')} / ${boss.maxHp.toLocaleString('de-DE')}`;
    });
  },

  update() {
    const p = game.player;
    const s = game.stats;
    if (!p) return;
    if ((this.frame = (this.frame || 0) + 1) % 6 === 0) this.updateBossBar();
    // Restzeit der Stallmeister-Prüfung einmal pro Sekunde
    if (questState().stable.state === 'active') this.set('qtime', Math.floor(p.playTime), () => this.renderQuestTrack());
    this.set('hp', `${Math.ceil(p.hp)}/${s.maxHp}`, (v) => {
      $('hpText').textContent = v;
      setBar('hp', p.hp / s.maxHp);
    });
    this.set('mp', `${Math.floor(p.mp)}/${s.maxMp}`, (v) => {
      $('mpText').textContent = v;
      setBar('mp', p.mp / s.maxMp);
    });
    // Bei wenig Leben pulsiert der Balken rot
    this.set('lowHp', !p.dead && p.hp / s.maxHp < 0.3, (v) => { $('hudChar').classList.toggle('low', v); });
    this.set('lvl', p.level, (v) => { $('hudLevel').textContent = v; });
    // Roter Punkt am Charakter-Knopf, solange Punkte zu verteilen sind
    this.set('points', (p.statPoints || 0) + p.skillPoints > 0, (v) => { $('btnChar').classList.toggle('has-points', v); });
    this.set('statPts', (p.statPoints || 0) > 0, (v) => { $('btnStatPlus').hidden = !v; });
    const need = xpToNext(p.level);
    this.set('xp', p.xp + '/' + need, () => {
      const pct = p.level >= MAX_LEVEL ? 100 : (p.xp / need) * 100;
      $('xpFill').style.width = pct + '%';
      $('xpText').textContent = p.level >= MAX_LEVEL ? 'Höchststufe' : `${p.xp.toLocaleString('de-DE')} / ${need.toLocaleString('de-DE')} EP (${pct.toFixed(1).replace('.', ',')} %)`;
    });
    this.set('gold', p.gold, (v) => { $('goldText').textContent = v.toLocaleString('de-DE'); });
    this.updateStatus();
    this.set('splinter', p.splinters, (v) => { $('splinterText').textContent = v; });
    this.set('potHp', potionTotal(p, 'hp'), (v) => { $('potHpCount').textContent = v; });
    this.set('potMp', potionTotal(p, 'mp'), (v) => { $('potMpCount').textContent = v; });
    // Abklingzeit der Tränke (3 s) als dunkler Kreis mit Sekunden
    for (const [kind, id] of [['hp', 'potHp'], ['mp', 'potMp']]) {
      const left = p.potCd ? p.potCd[kind] : 0;
      this.set('potcd' + kind, left > 0 ? Math.ceil(left * 10) : 0, () => {
        const el = $(id).querySelector('.cd');
        el.hidden = !(left > 0);
        el.textContent = left > 0 ? Math.ceil(left) : '';
        el.style.setProperty('--p', left / POTION_CD);
      });
    }

    const zone = zoneAt(p.x, p.y);
    this.set('zone', zone.id, () => {
      $('zoneName').textContent = zone.name;
      $('zoneLevels').textContent = zone.levels;
    });

    // Buffs als Symbole mit Restzeit; der Ring zeigt, wie viel noch übrig ist
    const buffs = p.buffs.map((b) => ({ b, left: Math.max(0, Math.ceil(b.until - game.time)) }));
    const shield = p.shield > 0 ? Math.ceil(p.shield) : 0;
    this.set('buffs', buffs.map(({ b, left }) => b.id + left).join('|') + '|' + shield, () => {
      $('buffList').innerHTML = buffs.map(({ b, left }) => {
        const sk = skillById(b.id);
        const extra = b.id === 'knochenpanzer' && shield ? `<em>${shield}</em>` : '';
        return `<div class="buff-ico${left <= 10 ? ' ending' : ''}" style="--p:${(left / b.duration).toFixed(3)}" title="${b.name}">` +
          `<img src="${sk ? skillIconUrl(sk) : ''}" alt="${b.name}">${extra}<span>${formatBuffTime(left)}</span></div>`;
      }).join('');
      $('hud').classList.toggle('has-buffs', buffs.length > 0);
    });

    // Abklingzeiten, und laufende Buffs an ihrer Fertigkeit markieren
    classSkills(p).forEach((sk, i) => {
      const running = p.buffs.find((b) => b.id === sk.id);
      const runLeft = running ? Math.ceil(running.until - game.time) : 0;
      this.set('run' + i, runLeft > 0 ? formatBuffTime(runLeft) : '', (v) => {
        const btn = $('skill' + i);
        if (!btn) return;
        btn.classList.toggle('buff-run', !!v);
        btn.parentElement.querySelector('.runring').hidden = !v;
        const el = btn.parentElement.querySelector('.run');
        el.hidden = !v;
        el.textContent = v;
      });
      const left = p.skillCd[i];
      const key = 'cd' + i;
      const shown = left > 0 ? left.toFixed(left < 1 ? 1 : 0) : '';
      this.set(key, shown, () => {
        const el = document.querySelector('#skill' + i + ' .cd');
        if (!el) return;
        el.hidden = !shown;
        el.textContent = shown;
        const btn = el.parentElement;
        // kurz aufleuchten, sobald die Fertigkeit wieder bereit ist
        if (!shown && btn.classList.contains('on-cd')) {
          btn.classList.remove('ready');
          void btn.offsetWidth;
          btn.classList.add('ready');
        }
        btn.classList.toggle('on-cd', !!shown);
        el.style.setProperty('--p', String(left / sk.cooldown));
      });
      // Die Uhr der Abklingzeit in 48 Schritten statt in jedem Bild neu setzen
      if (left > 0) {
        this.set('cdp' + i, Math.ceil(left / sk.cooldown * 48), (v) => {
          const el = document.querySelector('#skill' + i + ' .cd');
          if (el) el.style.setProperty('--p', String(v / 48));
        });
      }
      this.set('mana' + i, p.mp < skillMana(sk, p), (v) => {
        const el = $('skill' + i);
        if (el) el.classList.toggle('no-mana', v);
      });
    });

    // Abklingzeit der Ultimativen Attacke (Minuten:Sekunden)
    const ultLeft = p.ultCd > 0 ? Math.ceil(p.ultCd) : 0;
    this.set('ult', ultLeft, (v) => {
      const btn = $('skillUlt');
      if (!btn) return;
      const el = btn.querySelector('.cd');
      if (!v && btn.classList.contains('on-cd')) {
        btn.classList.remove('ready');
        void btn.offsetWidth;
        btn.classList.add('ready');
      }
      btn.classList.toggle('on-cd', !!v);
      btn.classList.toggle('charged', !v && p.level >= ULT_UNLOCK);
      el.hidden = !v;
      el.textContent = v ? formatBuffTime(v) : '';
      el.style.setProperty('--p', String(v / ULT_COOLDOWN));
    });

    // Ziel
    // Ein Boss in der Nähe steht schon im Bossbalken, dann kein zweites Zielfenster
    const tt = game.target && !game.target.dead ? game.target : null;
    const t = tt && !(tt.type && tt.type.boss && dist(tt, p) < 560) ? tt : null;
    const tKey = t ? t.id + ':' + Math.ceil(t.hp) : '';
    this.set('target', tKey, () => {
      $('targetFrame').hidden = !t;
      document.body.classList.toggle('has-target', !!t);
      if (!t) return;
      $('targetName').textContent = `Lv ${t.level} ${t.name}`;
      $('targetName').style.color = t.isStone ? lighter(t.stoneType.look.glow, 0.45) : levelColor(t.level);
      setBar('target', t.hp / t.maxHp);
      $('targetText').textContent = `${Math.ceil(t.hp).toLocaleString('de-DE')} / ${t.maxHp.toLocaleString('de-DE')}`;
    });

    this.set('talk', game.nearNpc ? game.nearNpc.id : '', (v) => {
      $('btnTalk').hidden = !v || !input.touchUi;
      if (v) $('btnTalk').textContent = NPC_TALK_LABEL[v] || 'Sprechen';
    });
  },

  // Meldungen stehen im Chat (Reiter Global) statt mitten im Bild; type färbt sie (info, level, warn)
  log(text, type = 'info') {
    this.chat('', text, 'sys', type);
  },

  // Beute unten rechts: Symbol, Name und Anzahl. Gleiche Beute kurz hintereinander wird zusammengezählt.
  lootRows: [],
  lootLog: [],

  // Seit 6.5: Beute eines besiegten Monsters liegt kurz sichtbar am Boden (Symbol, Name, Anzahl) und fliegt
  // dann zur Figur; erst dann erscheint sie in der Beuteliste. Im Gepäck ist sie sofort (nichts geht verloren).
  dropAt: null,
  loot(name, count, icon, color) {
    if (!count) return;
    if (this.dropAt) {
      groundLoot(this.dropAt, name, count, icon, color, () => this.lootNow(name, count, icon, color));
      return;
    }
    this.lootNow(name, count, icon, color);
  },

  lootNow(name, count, icon, color) {
    const now = game.time;
    const last = this.lootLog[0];
    if (last && last.name === name && now - last.time < 30) {
      last.count += count;
      last.time = now;
    } else {
      this.lootLog.unshift({ name, count, icon, color, time: now });
      if (this.lootLog.length > 40) this.lootLog.pop();
    }
    const feed = $('lootFeed');
    let row = this.lootRows.find((r) => r.name === name && performance.now() - r.at < 4000);
    if (row) {
      row.count += count;
      row.el.querySelector('b').textContent = '× ' + row.count.toLocaleString('de-DE');
      row.el.classList.remove('bump');
      void row.el.offsetWidth;
      row.el.classList.add('bump');
    } else {
      const el = document.createElement('div');
      el.className = 'loot-row';
      el.innerHTML = `<img src="${icon}" alt=""><span></span><b>× ${count.toLocaleString('de-DE')}</b>`;
      el.querySelector('span').textContent = name;
      el.querySelector('span').style.color = color || '';
      feed.append(el);
      row = { name, count, el };
      this.lootRows.push(row);
      while (feed.children.length > 5) feed.firstChild.remove();
    }
    row.at = performance.now();
    clearTimeout(row.timer);
    row.timer = setTimeout(() => {
      row.el.classList.add('out');
      setTimeout(() => row.el.remove(), 600);
      this.lootRows = this.lootRows.filter((r) => r !== row);
    }, 6000);
    this.lootUnseen = (this.lootUnseen || 0) + 1;
    $('lootBadge').hidden = false;
    $('lootBadge').textContent = this.lootUnseen > 99 ? '99+' : this.lootUnseen;
  },

  renderLoot() {
    const p = game.player;
    this.lootUnseen = 0;
    $('lootBadge').hidden = true;
    const totals = new Map();
    for (const e of this.lootLog) {
      const t = totals.get(e.name) || { ...e, count: 0 };
      t.count += e.count;
      totals.set(e.name, t);
    }
    const ago = (t) => {
      const s = Math.max(0, Math.round(game.time - t));
      return s < 60 ? `vor ${s} s` : `vor ${Math.round(s / 60)} min`;
    };
    const row = (e, right) => `<li><img src="${e.icon}" alt=""><span style="color:${e.color || ''}">${escapeHtml(e.name)}</span><b>× ${e.count.toLocaleString('de-DE')}</b><small>${right}</small></li>`;
    $('lootBody').innerHTML =
      `<div class="loot-purse">` +
      `<span><img src="${lootIconUrl('gold')}" alt=""> ${p.gold.toLocaleString('de-DE')}</span>` +
      `<span><img src="${lootIconUrl('splinter')}" alt=""> ${p.splinters}</span>` +
      `<span><img src="${scrollIconUrl()}" alt=""> ${p.scrolls}</span>` +
      `<span title="Fertigkeitsbücher in der Tasche"><img src="${lootIconUrl('book')}" alt=""> ${totalBooks(p)}</span>` +
      POTION_SIZES.flatMap((sz) => ['hp', 'mp'].map((kind) => {
        const n = p.potions[potKey(kind, sz.id)] || 0;
        return n ? `<span title="${potionInfo(kind).name} (${sz.id})"><img src="${potionIconUrl(kind, sz.id)}" alt=""> ${n}</span>` : '';
      })).join('') +
      MATERIALS.map((m) => `<span><img src="${materialIconUrl(m.id)}" alt=""> ${p.materials[m.id] || 0}</span>`).join('') +
      `</div>` +
      // Monster-Teile für den Schmied
      (Object.entries(p.upmats || {}).some(([, n]) => n > 0)
        ? `<h3>Teile für den Schmied <small>ab +6, bei Ausrüstung ab Stufe 30 schon ab +4</small></h3><div class="loot-purse mob-mats">` +
          Object.entries(p.upmats).filter(([, n]) => n > 0).map(([id, n]) =>
            `<span class="mat-chip" tabindex="0" data-tip="${mobMatTip(id)}"><img src="${mobMatIconUrl(id)}" alt=""> ${MOB_MATS[id].name} <b>${n}</b></span>`).join('') + `</div>`
        : '') +
      `<button type="button" class="btn btn-primary" id="btnOpenBag">Rucksack öffnen <small>(${p.inventory.length}/${BAG_SIZE})</small></button>` +
      (this.lootLog.length
        ? `<div class="loot-cols"><section><h3>Zuletzt aufgehoben</h3><ul class="loot-list">${this.lootLog.slice(0, 15).map((e) => row(e, ago(e.time))).join('')}</ul></section>` +
          `<section><h3>Gesamt seit dem Start</h3><ul class="loot-list">${[...totals.values()].sort((a, b) => b.count - a.count).map((e) => row(e, '')).join('')}</ul></section></div>`
        : '<p class="hint-text">Noch keine Beute. Besiege Monster und zerstöre Seelensteine, alles wird automatisch aufgehoben.</p>');
    $('btnOpenBag').addEventListener('click', () => this.toggle('panelInv'));
  },

  banner(title, sub) {
    const b = $('banner');
    b.hidden = true;
    b.innerHTML = '';
    const strong = document.createElement('strong');
    strong.textContent = title;
    const span = document.createElement('span');
    span.textContent = sub;
    b.append(strong, span);
    void b.offsetWidth; // Animation neu starten
    b.hidden = false;
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => { b.hidden = true; }, 3000);
  },

  toggle(id) {
    const el = $(id);
    const open = el.hidden;
    this.closePanels();
    if (open) {
      if (id === 'panelChar') this.renderCharPanel();
      if (id === 'panelInv') {
        gear.openInventory();
        return;
      }
      if (id === 'panelLoot') this.renderLoot();
      if (id === 'panelSocial') social.render();
      if (id === 'panelDaily') renderDaily();
      if (id === 'panelMap') bigMap.timer = 0;
      if (id === 'panelOpts') options.render();
      if (id === 'panelNet') {
        this.renderNet();
        netProbe();
      }
      el.hidden = false;
    }
  },

  // Alle Fenster schließen (auch neu hinzugekommene); nur das Fenster nach dem Tod bleibt,
  // bis man wiederbelebt wird
  closePanels() {
    // Der Handel bleibt offen, bis er abgeschlossen oder abgebrochen ist
    document.querySelectorAll('.panel').forEach((el) => { if (el.id !== 'panelDeath' && !(el.id === 'panelTrade' && game.trade)) el.hidden = true; });
  },

  anyPanelOpen() {
    return [...document.querySelectorAll('.panel')].some((el) => el.id !== 'panelDeath' && !el.hidden);
  },

  // Zeile „Element: Feuer · Wechseln“ im Charakterfenster (nur Magier)
  elementHtml(p) {
    if (p.classId !== 'magier') return '';
    const E = mageEl(p);
    const ok = canChangeElement(p);
    const cost = mageElementCost(p);
    return `<p class="el-change" style="--el:${E.main}">Element: <span class="el-name">${E.name}</span>` +
      `<button type="button" class="mini-btn" id="btnElement"${ok ? '' : ' disabled'}>Wechseln</button>` +
      `<span class="hint-text">${ok ? (cost ? `Kosten ${cost.toLocaleString('de-DE')} Gold` : 'bis Stufe 10 kostenlos') : 'Nur im Dorf oder Lager, außerhalb des Kampfes'}</span></p>`;
  },

  renderCharPanel() {
    const p = game.player;
    if (!p) return;
    const s = playerStats(p);
    const c = CLASSES[p.classId];
    const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
    const pct = (v) => Math.round(v * 100) + ' %';
    $('charBody').innerHTML =
      `<p class="char-head"><span><strong>${escapeHtml(p.name)}</strong> · ${c.name} · ${classPath(p.classId, p.path).name} · Stufe ${p.level}</span>` +
      `<button type="button" class="mini-btn" id="btnLook">✂ Aussehen ändern</button></p>` +
      this.elementHtml(p) +
      this.attrHtml(p) +
      `<dl class="stats">` +
      row('Leben', s.maxHp) + row('Mana', s.maxMp) +
      row('Angriff', s.atk) + row('Verteidigung', s.def) +
      row('Kritische Treffer', pct(s.crit)) + row('Lauftempo', speedText(p, s)) +
      row('Angriffstempo', pct(s.atkSpeed)) + row('Magiestärke', '+' + pct(s.magic || 0)) +
      row('Blocken', pct(s.block)) + row('Ausweichen', pct(s.dodge)) +
      row('Stark gegen Monster', pct(s.monsterDmg || 0)) + row('Lebensraub', pct(s.hpSteal || 0)) +
      row('Besiegte Monster', p.kills.toLocaleString('de-DE')) + row('Zerstörte Seelensteine', p.stones) +
      row('Tode', p.deaths) + row('Spielzeit', formatTime(p.playTime)) +
      `</dl>` +
      `<h3>Fertigkeiten</h3>` +
      `<p>Freie Fertigkeitspunkte: <span class="points">${p.skillPoints}</span> · Bücher für deine Fertigkeiten: <span class="points">${totalBooks(p, true)}</span></p>` +
      `<p class="hint-text">Bis Stufe 15 mit Punkten, dann mit einem Klick erwecken (E1–E10), danach geht es mit Fertigkeitsbüchern über Heroisch (H) und Legendär (L) bis Vollendet (V). Jedes Buch gehört zu einer Fertigkeit. Seelensteine lassen Bücher zu allen Fertigkeiten aller Klassen fallen, fremde verkaufst du beim Händler.</p>` +
      skillListHtml(classSkills(p), p) + ultHtml(ultimateOf(p), p);
    $('btnLook').addEventListener('click', () => this.openLookPanel());
    if ($('btnElement')) $('btnElement').addEventListener('click', () => this.showElementChoice());
    $('charBody').querySelectorAll('[data-upgrade]').forEach((b) => {
      b.addEventListener('click', () => upgradeSkill(Number(b.dataset.upgrade), b.dataset.act));
    });
    $('charBody').querySelectorAll('[data-attr]').forEach((b) => {
      b.addEventListener('click', () => {
        this.lastAttr = b.dataset.attr;
        raiseAttr(b.dataset.attr, b.dataset.n === 'max' ? MAX_ATTR : Number(b.dataset.n));
      });
    });
    this.lastAttr = null;
  },

  // Statuspunkte: leuchtende Kugel mit den freien Punkten, vier Karten mit Symbol, Wert, Fortschritt
  // bis zum Höchstwert, was der Wert gerade bringt und Knöpfe für +1, +5 und alle Punkte
  attrHtml(p) {
    const fmt = (v, d = 0) => v.toFixed(d).replace('.', ',');
    const mainId = MAIN_ATTR[p.classId];
    const effects = {
      str: (a) => [`+${a} Angriff`],
      vit: (a) => [`+${a * 6} Leben`, `+${fmt(a * 0.3, 1)} Rüstung`],
      int: (a) => [`+${a * 5} Mana`, `+${a} % Fertigkeitsschaden`],
      dex: (a) => [`+${fmt(a * 0.3, 1)} % Kritisch`, `+${fmt(a * 0.25, 2)} % Ausweichen`, `+${fmt(a * 0.5, 1)} % Tempo`]
    };
    // Hauptwert der Klasse: zuerst die Schadens- und Buff-Boni
    const base = effects[mainId];
    effects[mainId] = (a) => [`+${fmt(a * MAIN_SKILL * 100, 1)} % Fertigkeitsschaden`, `+${fmt(a * MAIN_BASIC * 100)} % Angriffsschaden`, `+${fmt(a * MAIN_BUFF * 100)} % Buff-Stärke`,
      ...base(a).filter((t) => !t.includes('Fertigkeitsschaden'))];
    const icons = {
      str: '<path d="M5 19l9-9"/><path class="f" d="M13 5l6 0 0 6-3.2-.6L9 17.2 6.8 15z"/><path d="M4 16l4 4"/>',
      vit: '<path class="f" d="M12 20s-7-4.3-8.9-8.7C1.7 8 3.6 4.5 7 4.5c1.9 0 3.3 1 5 2.8 1.7-1.8 3.1-2.8 5-2.8 3.4 0 5.3 3.5 3.9 6.8C19 15.7 12 20 12 20z"/><path d="M7 11h3l1.5-2.5L13 13l1.5-2H17"/>',
      int: '<path class="f" d="M12 2.5l5 6.5-5 12.5L7 9z"/><path d="M7 9h10M12 2.5V21.5"/>',
      dex: '<path class="f" d="M19.5 3.5c-6.5.5-11.5 5.5-13 13l2 2c7.5-1.5 12.5-6.5 13-13z"/><path d="M4 20l4.5-4.5M10 10l4 4"/>'
    };
    const pts = p.statPoints || 0;
    return `<section class="attr-panel${pts ? ' has-points' : ''}">` +
      `<div class="attr-orb"><b>${pts}</b><small>Statuspunkte</small></div>` +
      `<div class="attr-cards">` + ATTRS.map((a) => {
        const v = p.attrs[a.id] || 0;
        const can = pts > 0 && v < MAX_ATTR;
        const now = effects[a.id](v).join(' · ');
        const next = effects[a.id](1)[0];
        return `<div class="attr-card attr-${a.id}${this.lastAttr === a.id ? ' pop' : ''}">` +
          `<svg class="attr-ico" viewBox="0 0 24 24" aria-hidden="true">${icons[a.id]}</svg>` +
          `<div class="attr-main"><div class="attr-top"><strong>${a.name}${a.id === mainId ? ' <em class="attr-mainstat">Hauptwert</em>' : ''}</strong><b class="attr-val">${v}</b></div>` +
          `<div class="attr-prog"><i style="width:${(v / MAX_ATTR * 100).toFixed(1)}%"></i></div>` +
          `<small>${v ? now : a.id === mainId ? effects[a.id](1).join(' · ') + ' je Punkt' : a.text}</small>` +
          (can ? `<small class="attr-next">Nächster Punkt: ${next}</small>` : '') + `</div>` +
          `<div class="attr-btns"><button type="button" class="attr-plus" data-attr="${a.id}" data-n="1" ${can ? '' : 'disabled'} aria-label="${a.name} +1">+</button>` +
          `<button type="button" class="mini-btn" data-attr="${a.id}" data-n="5" ${can && pts >= 5 ? '' : 'disabled'}>+5</button>` +
          `<button type="button" class="mini-btn" data-attr="${a.id}" data-n="max" ${can && pts > 1 ? '' : 'disabled'}>Alle</button></div></div>`;
      }).join('') + `</div></section>`;
  },

  openNpc(npc) {
    this.closePanels();
    const p = game.player;
    $('npcTitle').textContent = npc.name;
    gear.sellArmedIndex = null;
    $('npcTitle').textContent = npc.name || 'Dorfbewohner';
    if (npc.id === 'haendler') this.renderShop();
    else if (npc.id === 'schmied') gear.openSmith($('npcBody'));
    else if (npc.id === 'waffen' || npc.id === 'ruestung') gear.openMerchant(npc.id, $('npcBody'));
    else if (npc.id === 'aeltester') this.renderElder();
    else if (npc.id === 'jaegerin') this.renderHunter();
    else if (npc.id === 'teleport') this.renderTravel();
    else if (npc.id === 'alchemist') this.renderAlchemist();
    else if (npc.id === 'stallmeister') this.renderStable();
    else if (npc.id === 'lehrmeister') this.renderTeacher();
    else if (npc.id === 'wanderer') this.renderWanderer(npc);
    else if (npc.id === 'eingang' || npc.id === 'ausgang' || npc.id === 'riss') this.renderDungeon(npc);
    else if (npc.id === 'weltentor') this.renderWorldGate(npc);
    else this.renderTalk(npc);
    $('panelNpc').hidden = false;
  },

  // Lehrmeister (seit 8.7): Fertigkeitsbücher kaufen, Status- und Fertigkeitspunkte zurücksetzen
  renderTeacher(msg) {
    const p = game.player;
    const fmt = (n) => n.toLocaleString('de-DE');
    const skills = classSkills(p);
    const statSpent = statPointsSpent(p);
    const skillBack = skillPointsBack(p);
    const stCost = resetCost(p, 'stat');
    const skCost = resetCost(p, 'skill');
    $('npcBody').innerHTML =
      `<p>„Wissen hat seinen Preis. Ich verkaufe Bücher zu deinen Fertigkeiten und helfe dir, deine Punkte neu zu verteilen.“</p>` +
      `<p>Dein Gold: <span class="price">${fmt(p.gold)}</span></p>` +
      (msg ? `<p class="${msg.ok ? 'gear-msg success' : 'form-error'}">${msg.text}</p>` : '') +
      `<h3>Fertigkeitsbücher <span class="price">je ${fmt(TEACHER.bookPrice)} Gold</span></h3>` +
      `<p class="hint">Bücher braucht man ab dem Erwecken (E2–E10, Heroisch, Legendär, Vollendet).</p><div class="shop">` +
      skills.map((sk) => `<div class="shop-item"><img class="shop-icon" src="${bookIconUrl(sk.id)}" alt="">` +
        `<strong>${sk.name}</strong><small>Fertigkeitsbuch · im Gepäck: <b>${bookCount(p, sk.id)}</b></small>` +
        `<div class="buy"><button class="mini-btn" type="button" data-book="${sk.id}" ${p.gold < TEACHER.bookPrice ? 'disabled' : ''}>Kaufen</button></div></div>`).join('') +
      `</div><h3>Punkte zurücksetzen</h3><div class="shop">` +
      `<div class="shop-item"><strong>Statuspunkte <span class="price">${fmt(stCost)} Gold</span></strong>` +
      `<small>Alle ${statSpent} verteilten Statuspunkte kommen zurück und lassen sich neu verteilen.</small>` +
      `<div class="buy"><button class="mini-btn" type="button" data-reset="stat" ${!statSpent || p.gold < stCost ? 'disabled' : ''}>Zurücksetzen</button></div></div>` +
      `<div class="shop-item"><strong>Fertigkeitspunkte <span class="price">${fmt(skCost)} Gold</span></strong>` +
      `<small>Fertigkeiten bis Stufe 15 gehen auf Stufe 1, ${skillBack} Punkte kommen zurück. Erweckte Fertigkeiten (E/H/L/V) behalten ihren Rang.</small>` +
      `<div class="buy"><button class="mini-btn" type="button" data-reset="skill" ${!skillBack || p.gold < skCost ? 'disabled' : ''}>Zurücksetzen</button></div></div>` +
      `</div><p class="hint">Das erste Zurücksetzen kostet ${fmt(TEACHER.resetBase)} Gold, jedes weitere das Doppelte (Status und Fertigkeiten getrennt).</p>`;
    const body = $('npcBody');
    body.querySelectorAll('[data-book]').forEach((b) => b.addEventListener('click', () => {
      const sk = skills.find((s) => s.id === b.dataset.book);
      const r = buyBook(sk.id);
      if (r === 'ok') {
        saveGame();
        this.renderTeacher({ ok: true, text: `Buch „${sk.name}“ gekauft.` });
      } else this.renderTeacher({ ok: false, text: r === 'bag' ? 'Deine Tasche ist voll.' : 'Dafür reicht dein Gold nicht.' });
    }));
    body.querySelectorAll('[data-reset]').forEach((b) => b.addEventListener('click', () => {
      const kind = b.dataset.reset;
      const what = kind === 'stat' ? 'Statuspunkte' : 'Fertigkeitspunkte';
      body.querySelector('.buy-confirm')?.remove();
      const ask = document.createElement('div');
      ask.className = 'buy-confirm';
      ask.innerHTML = `<p>${what} für ${fmt(resetCost(p, kind))} Gold zurücksetzen?</p>` +
        `<button class="mini-btn" type="button" data-yes>Ja</button> <button class="mini-btn" type="button" data-no>Nein</button>`;
      b.closest('.shop-item').appendChild(ask);
      ask.querySelector('[data-no]').addEventListener('click', () => ask.remove());
      ask.querySelector('[data-yes]').addEventListener('click', () => {
        const ok = kind === 'stat' ? resetStats() : resetSkills();
        if (ok) {
          if (kind === 'skill') this.buildSkillBar();
          saveGame();
        }
        this.renderTeacher(ok ? { ok: true, text: `${what} zurückgesetzt. Verteile sie im Charakterfenster neu.` } : { ok: false, text: 'Dafür reicht dein Gold nicht.' });
      });
    }));
  },

  renderShop() {
    const p = game.player;
    $('npcBody').innerHTML =
      `<p>„Tränke und Schriftrollen für unterwegs. Waffen gibt es bei Goro, Rüstungen bei Mei.“</p>` +
      `<p>Dein Gold: <span class="price" id="shopGold">${p.gold.toLocaleString('de-DE')}</span></p>` +
      `<h3>Tränke und Schriftrollen</h3><div class="shop">` +
      SHOP.map((item) => POTION_SIZES.map((sz) => {
        const key = potKey(item.id, sz.id);
        const price = item.price * sz.price;
        const low = p.level < sz.level;
        const pct = Math.round((item.id === 'hp' ? sz.heal : sz.mana) * 100);
        return `<div class="shop-item${low ? ' locked' : ''}"><img class="shop-icon potion-icon" src="${potionIconUrl(item.id, sz.id)}" alt="">` +
          `<strong>${item.name} ${sz.id} <span class="price">${price.toLocaleString('de-DE')} Gold</span></strong>` +
          `<small>${item.kind} (${sz.name}): ${pct} % ${item.id === 'hp' ? 'Leben' : 'Mana'}${low ? ` · ab Stufe ${sz.level}` : ''}. Im Gepäck: <b id="have-${key}">${p.potions[key] || 0}</b></small>` +
          `<div class="buy"><button class="mini-btn" type="button" data-buy="${key}" data-n="1" ${low ? 'disabled' : ''}>1 kaufen</button>` +
          `<button class="mini-btn" type="button" data-buy="${key}" data-n="10" ${low ? 'disabled' : ''}>10 kaufen</button></div></div>`;
      }).join('')).join('') +
      `<div class="shop-item"><img class="shop-icon" src="${scrollIconUrl()}" alt=""><strong>${BLESSING.name} <span class="price">${BLESSING.price} Gold</span></strong>` +
      `<small>${BLESSING.text} Im Gepäck: <b id="have-scroll">${p.scrolls}</b></small>` +
      `<div class="buy"><button class="mini-btn" type="button" data-scroll="1">Kaufen</button></div></div>` +
      `</div><p id="shopMsg" class="form-error" hidden></p>` + gear.sellSectionHtml();
    gear.wireSell($('npcBody'), () => this.renderShop());
    $('npcBody').querySelectorAll('[data-buy]').forEach((b) => {
      b.addEventListener('click', () => this.buy(b.dataset.buy, Number(b.dataset.n)));
    });
    $('npcBody').querySelector('[data-scroll]').addEventListener('click', () => this.buyScroll());
  },

  shopMessage(text, ok) {
    const msg = $('shopMsg');
    msg.textContent = text;
    msg.className = ok ? 'gear-msg success' : 'form-error';
    msg.hidden = false;
  },

  // key: hp, hpM, hpL, hpXL, hpXXL bzw. mp…
  buy(key, n) {
    const p = game.player;
    const kind = key.slice(0, 2);
    const size = POTION_SIZES.find((sz) => potKey(kind, sz.id) === key);
    const item = SHOP.find((s) => s.id === kind);
    if (!size || !item || p.level < size.level) return;
    const cost = item.price * size.price * n;
    if (p.gold < cost) {
      this.shopMessage(`Dir fehlen ${(cost - p.gold).toLocaleString('de-DE')} Gold für ${n} × ${item.name} ${size.id}.`);
      return;
    }
    p.gold -= cost;
    p.potions[key] = (p.potions[key] || 0) + n;
    $('shopMsg').hidden = true;
    $('shopGold').textContent = p.gold.toLocaleString('de-DE');
    $('have-' + key).textContent = p.potions[key];
    saveGame();
  },

  buyScroll() {
    const p = game.player;
    if (p.gold < BLESSING.price) {
      this.shopMessage(`Dir fehlen ${BLESSING.price - p.gold} Gold für eine ${BLESSING.name}.`);
      return;
    }
    p.gold -= BLESSING.price;
    p.scrolls++;
    $('shopGold').textContent = p.gold.toLocaleString('de-DE');
    $('have-scroll').textContent = p.scrolls;
    this.shopMessage(`${BLESSING.name} gekauft.`, true);
    saveGame();
  },

  showDeath(lostXp) {
    this.closePanels();
    $('deathText').textContent = 'Starte hier neu, um gleich weiterzukämpfen, oder sicher in der Stadt ohne Verlust.';
    $('reviveHereCost').textContent = lostXp > 0 ? `−${lostXp.toLocaleString('de-DE')} EP · halbes Leben` : 'halbes Leben';
    $('panelDeath').hidden = false;
  }
};

// Karten für die Wege einer Klasse: zwei, beim Magier vier Elemente mit ihrem Dreieck in der Elementfarbe
function pathChoiceHtml(c, selected) {
  const four = c.paths.length === 4;
  return `<div class="path-grid${four ? ' four' : ''}">` + c.paths.map((pt, i) => {
    const E = four && MAGE_EL[pt.id];
    return `<button type="button" class="path-card" data-path="${i}" aria-pressed="${i === selected}"${E ? ` data-el="${pt.id}" style="--el:${E.main}"` : ''}>` +
      (E ? `<strong><canvas class="el-sigil" width="56" height="56" data-sigil="${pt.id}"></canvas>${E.name}</strong><small class="path-name">${pt.name}</small>`
        : `<strong>${pt.name}</strong>`) +
      `<small class="path-role">${pt.role}</small><span>${pt.description}</span></button>`;
  }).join('') + '</div>';
}

// Dreiecke auf den Elementkarten zeichnen (nach dem Einsetzen des HTML)
function drawPathSigils(box) {
  box.querySelectorAll('canvas[data-sigil]').forEach((cv) => {
    const E = MAGE_EL[cv.dataset.sigil];
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    const r = cv.width * 0.44;
    if (typeof drawSigil === 'function') {
      drawSigil(ctx, cv.width / 2, cv.height / 2, r, E.key, 0, E.main, 1);
      return;
    }
    // Ersatz ohne die Siegel-Zeichnung aus effekte.js: nur das Dreieck (Spitze oben △ oder unten ▽, mit Balken)
    const down = E.glyph.startsWith('down') ? -1 : 1;
    const cx = cv.width / 2;
    const cy = cv.height / 2 + r * 0.12 * down;
    const corner = (k) => [cx + Math.cos(-Math.PI / 2 * down + (k * 2 * Math.PI) / 3) * r, cy + Math.sin(-Math.PI / 2 * down + (k * 2 * Math.PI) / 3) * r];
    ctx.strokeStyle = E.main;
    ctx.fillStyle = E.main;
    ctx.lineWidth = cv.width / 18;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let k = 0; k < 3; k++) ctx[k ? 'lineTo' : 'moveTo'](...corner(k));
    ctx.closePath();
    ctx.stroke();
    if (E.glyph.endsWith('bar')) {
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.5, cy);
      ctx.lineTo(cx + r * 0.5, cy);
      ctx.stroke();
    }
  });
}

// Elementwechsel des Magiers (seit 8.6): bis Stufe 10 kostenlos, danach 500 Gold je Stufe
function mageElementCost(p) {
  return p.level <= 10 ? 0 : 500 * p.level;
}
// Nur im Dorf oder Lager, nicht im Duell und erst 10 s nach dem letzten Kampf
function canChangeElement(p) {
  return p.classId === 'magier' && !p.dead && inVillage(p.x, p.y) && !game.duel && game.time - (p.lastCombat ?? -99) > 10;
}
function changeMageElement(n) {
  const p = game.player;
  const cost = mageElementCost(p);
  if (!canChangeElement(p) || n === (p.path || 0) || !MAGE_PATH_EL[n]) return false;
  if (p.gold < cost) {
    ui.log(`Dir fehlen ${(cost - p.gold).toLocaleString('de-DE')} Gold für den Elementwechsel.`, 'warn');
    return false;
  }
  p.gold -= cost;
  p.path = n;
  // Buffs der Magier-Fertigkeiten und -Ultimates enden; Abklingzeiten bleiben je Platz (kein Ausnutzen).
  // Die Mitspieler sehen das neue Element mit dem nächsten Zustand (pt).
  const mageIds = new Set(CLASSES.magier.paths.flatMap((pt) => pt.skills.map((s) => s.id)));
  p.buffs = p.buffs.filter((b) => !mageIds.has(b.id) && b.id !== 'steinhaut' && b.id !== 'donnerkrone');
  game.stats = playerStats(p);
  p.hp = Math.min(p.hp, game.stats.maxHp);
  p.mp = Math.min(p.mp, game.stats.maxMp);
  ui.buildSkillBar();
  drawPortrait($('hudPortrait'), p);
  ui.log(`Du folgst jetzt dem ${CLASSES.magier.paths[n].name}.` + (cost ? ` (−${cost.toLocaleString('de-DE')} Gold)` : ''), 'level');
  saveGame();
  return true;
}

// Werte einer Fertigkeit auf einer Stufe, z. B. [['Angriff', '+29,6 %'], ['Dauer', '238 s']]
const SKILL_EFFECT_LABELS = {
  atk: 'Angriff', crit: 'Krit', atkSpeed: 'Angriffstempo', speed: 'Lauftempo', damageTaken: 'Erlittener Schaden',
  def: 'Verteidigung', dodge: 'Ausweichen', skillDmg: 'Fertigkeitsschaden', regen: 'Leben je s', reflect: 'Rückwurf', hpSteal: 'Lebensraub',
  chill: 'Kälte für Angreifer'
};
// Zahl mit Komma, eine Nachkommastelle (1,3 s)
const numDe = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
function skillPct(v) {
  const n = Math.round(v * 1000) / 10;
  return String(n).replace('.', ',') + ' %';
}
// Lauftempo im Charakterfenster (seit 8.5): Zahl, dazu der Anteil zu Fuß und der des Pferdes in Prozent
function speedText(p, s) {
  const foot = Math.round(((s.footMul || 1) - 1) * 100);
  const horse = p.horse ? HORSES[p.horseTier || 1] || HORSES[1] : null;
  return `${Math.round(s.speed)} <small class="speed-parts">· zu Fuß +${foot} %` +
    (horse ? ` · <span class="${p.riding ? 'on' : ''}">Pferd +${Math.round(horse.speed * 100)} %</span>` : '') + '</small>';
}
function skillStats(sk, lvl) {
  const out = [];
  const scale = buffScale(lvl);
  if (sk.dmg && sk.type !== 'skulls' && sk.type !== 'cage' && sk.type !== 'sigil') out.push(['Schaden', skillPct(sk.dmg * dmgScale(lvl)) + (sk.hits > 1 ? ' ×' + sk.hits : '')]);
  // Nekromant, Weg der Seelen (seit 8.5): Schädelsalve, Seelenkäfig, Mal des Seelenschnitters
  if (sk.type === 'skulls') out.push(['Schaden', sk.count + ' × ' + skillPct(sk.dmg * dmgScale(lvl))]);
  if (sk.type === 'cage') out.push(['Schrei', skillPct(sk.dmg * dmgScale(lvl)) + ' ×' + sk.pulses], ['Verlangsamt', skillPct(sk.slow.amount)]);
  if (sk.mark) out.push(['Mal', '+' + skillPct(sk.mark.vulnerable * scale) + ' (' + sk.mark.duration + ' s)']);
  if (sk.type === 'heal') out.push(['Heilung', skillPct(sk.amount * scale) + ' Leben']);
  if (sk.shield) out.push(['Schild', skillPct(sk.shield * scale) + ' Leben']);
  if (sk.type === 'summon') {
    // Diener nach Rang (seit 8.5): Skelettkrieger, ab E1 Knochenhunde
    const ti = Math.min(sk.tiers.length - 1, skillRank(lvl) + 1);
    const T = sk.tiers[ti];
    out.push([T.name + ' ×' + sk.count, skillPct(T.hp * scale) + ' Leben']);
    out.push([T.kind === 'hund' ? 'Biss' : 'Hieb', skillPct(T.atk * dmgScale(lvl)) + ' je ' + String(T.every).replace('.', ',') + ' s']);
    const extra = [T.pounce && 'Ansprung', T.slow && 'verlangsamt ' + Math.round(T.slow * 100) + ' %', T.burst && 'Seelenfeuer ' + T.burst.toFixed(1).replace('.', ',') + '×', T.alpha && 'Alpha'].filter(Boolean);
    if (extra.length) out.push(['Rang', extra.join(', ')]);
  }
  if (sk.vulnerable) out.push(['Verwundbar', '+' + skillPct(sk.vulnerable * scale)]);
  if (sk.el && sk.type !== 'buff') mageSkillStats(sk, lvl, out);
  for (const [k, v] of Object.entries(sk.effects || {})) {
    const label = (sk.labels && sk.labels[k]) || SKILL_EFFECT_LABELS[k];
    if (typeof v !== 'number' || !label) continue;
    // Kälte (Frostpanzer, seit 8.6) verlangsamt fest um diesen Anteil
    if (k === 'chill') { out.push([label, skillPct(v)]); continue; }
    // Lauftempo wächst seit 8.5 nicht mehr mit der Stufe
    out.push([label, (v < 0 ? '−' : '+') + skillPct(Math.abs(k === 'speed' || k === 'chill' ? v : v * scale))]);
  }
  if (sk.duration) out.push(['Dauer', skillDuration(sk, lvl) + ' s']);
  return out;
}

// Magier (seit 8.6): Nova, Element-Geschoss, Elementsprung und Siegel
function mageSkillStats(sk, lvl, out) {
  const dmg = (v) => skillPct(v * dmgScale(lvl));
  const freeze = (v) => numDe(typeof mageDur === 'function' ? mageDur(v, lvl) : v * levelCurve(lvl, 0.02, 0.01, DUR_JUMP)) + ' s';
  if (sk.type === 'nova') out.push(['Umkreis', String(sk.radius)]);
  if (sk.type === 'shift') {
    out.push(['Weite', String(sk.distance)]);
    out.push(sk.at === 'line' ? ['Treffer auf der Strecke', ''] : [sk.at === 'end' ? 'Explosion am Ziel' : 'Explosion am Start', 'r ' + sk.radius]);
  }
  if (sk.type === 'sigil') {
    out.push(['Verzögerung', numDe(sk.delay) + ' s']);
    if (sk.zaps) out.push(['Zaps', `${sk.ticks} × ${sk.zaps} Ziele · ${dmg(sk.dmg)}`]);
    else if (sk.ticks > 1) out.push(['Pulse', `${sk.ticks} × ${dmg(sk.dmg)}`]);
    else out.push(['Schaden', dmg(sk.dmg)]);
    if (sk.last && sk.last.dmg) out.push(['Zum Schluss', dmg(sk.last.dmg)]);
    if (sk.pull) out.push(['Sog', String(sk.pull)]);
    if (sk.linger) out.push(['Eisfeld', numDe(sk.linger) + ' s']);
  }
  if (sk.splash) out.push(['Splitter', `r ${sk.splash.r} · ${skillPct(sk.splash.mul)}`]);
  if (sk.shatter) out.push(['Zerspringen', '+' + skillPct(sk.shatter)]);
  if (sk.chain) out.push(['Sprünge', `${sk.chain} · −${skillPct(1 - (sk.chainMul || 1))} je Sprung`]);
  if (sk.discharge) out.push(['Entladung', '+' + skillPct(sk.discharge)]);
  if (sk.pierce) out.push(['Durchbohrt', '']);
  if (sk.arcs) out.push(['Ziele', `${sk.arcs}, Überschlag ${skillPct(sk.jump ? sk.jump.mul : 0.5)}`]);
  if (sk.freeze) out.push(['Einfrieren', freeze(sk.freeze)]);
  const stun = sk.stun || (sk.last && sk.last.stun);
  if (stun) out.push(['Betäubt', numDe(stun) + ' s']);
  if (sk.burn) out.push(['Brand', skillPct(sk.burn.dps) + ' je s']);
  if (sk.slow) out.push(['Verlangsamt', `${skillPct(sk.slow.amount)} · ${numDe(sk.slow.duration)} s`]);
  if (sk.lift || (sk.last && sk.last.lift)) out.push(['Hochgeschleudert', '']);
  if (sk.ignite || (sk.last && sk.last.ignite)) out.push(['Explodieren', skillPct(0.5)]);
  if (sk.type === 'nova' && skillRank(lvl) >= 0) out.push(['Nachhall', skillPct(0.35)]);
}

// Aktuelle Werte, darunter die nächste Stufe mit den Zuwächsen
function skillStatsHtml(sk, lvl) {
  const now = skillStats(sk, lvl);
  if (!now.length) return '';
  let html = '<span class="sk-stats">' + now.map(([k, v]) => (v === '' ? k : `${k} <b>${v}</b>`)).join(' · ') + '</span>';
  const nl = nextSkillLevel(lvl);
  if (nl != null) {
    const next = skillStats(sk, nl);
    html += `<span class="sk-next">${nl === SKILL_RANKS[0].from && skillRank(lvl) < 0 ? 'Nach dem Erwecken (E1)' : 'Stufe ' + skillLevelText(nl)}: ` +
      next.map(([k, v], j) => (v === '' ? k : `${k} <b${now[j] && now[j][1] !== v ? ' class="up"' : ''}>${v}</b>`)).join(' · ') + '</span>';
  }
  return html;
}

function skillListHtml(skills, p) {
  return '<ul class="skill-list">' + skills.map((sk, i) => {
    let meta = `ab Stufe ${sk.unlock}<br>${p ? skillMana(sk, p) : sk.mp} Mana · ${sk.cooldown} s`;
    if (p) {
      const lvl = p.skillLevels[i];
      const r = skillRank(lvl);
      const acts = skillActions(p, i);
      const title = r < 0 ? `Stufe ${lvl}/${SKILL_POINT_MAX}` : `<b class="rank-text" style="color:${SKILL_RANKS[r].color}">${SKILL_RANKS[r].name} ${skillLevelText(lvl)}</b>`;
      meta = p.level >= sk.unlock
        ? title + '<br>' + (acts.map((a) => `<button class="mini-btn${a.type === 'rankup' ? ' rank-btn' : ''}" type="button" data-upgrade="${i}" data-act="${a.type}" ${a.ok ? '' : 'disabled'} title="${a.ok ? '' : a.why}">${a.label}</button>`).join('') || (r === SKILL_RANKS.length - 1 ? 'Höchste Stufe' : ''))
        : `ab Stufe ${sk.unlock}`;
    }
    return `<li><img class="icon" src="${skillIconUrl(sk)}" alt="${sk.short}">` +
      `<span class="info"><strong>${i + 1}. ${sk.name}</strong><span>${sk.text}</span>${p && p.level >= sk.unlock ? skillStatsHtml(sk, p.skillLevels[i]) : ''}</span>` +
      `<span class="meta">${meta}</span></li>`;
  }).join('') + '</ul>';
}

// Ultimative Attacke unter der Fertigkeitsliste
function ultHtml(u, p) {
  if (!u) return '';
  const meta = p && p.level >= u.unlock
    ? (p.ultCd > 0 ? `bereit in ${formatBuffTime(Math.ceil(p.ultCd))}` : '<b class="up">bereit</b>') + '<br>Taste 6'
    : `ab Stufe ${u.unlock}`;
  return `<ul class="skill-list ult-list"><li><img class="icon" src="${skillIconUrl(u)}" alt="${u.short}">` +
    `<span class="info"><strong>Ultimativ: ${u.name}</strong><span>${u.text}</span><span class="sk-stats">${u.stats} · Abklingzeit 3 Minuten · kein Mana</span></span>` +
    `<span class="meta">${meta}</span></li></ul>`;
}

// Beschriftung des Knopfes zum Ansprechen am Handy
const NPC_TALK_LABEL = { schmied: 'Schmieden', haendler: 'Handeln', waffen: 'Handeln', ruestung: 'Handeln', alchemist: 'Handeln', aeltester: 'Auftrag', jaegerin: 'Jagd', teleport: 'Reisen', stallmeister: 'Auftrag', lehrmeister: 'Lernen', wanderer: 'Auftrag', eingang: 'Betreten', riss: 'Betreten', ausgang: 'Verlassen', weltentor: 'Reisen' };

// Fertigkeit zu einer Buff-Kennung (über alle Klassen und Wege)
let skillIndex = null;
function skillById(id) {
  if (!skillIndex) {
    skillIndex = new Map();
    for (const c of Object.values(CLASSES)) for (const pt of c.paths) for (const sk of pt.skills) skillIndex.set(sk.id, sk);
    // Buffs der Ultimativen Attacken zeigen das Symbol ihrer Attacke
    for (const u of Object.values(ULTIMATES)) {
      skillIndex.set(u.id, u);
      if (u.buff) skillIndex.set(u.buff.id, u);
    }
  }
  // alte IDs (z. B. Seelenpfeil von 8.4-Mitspielern) zeigen die Fertigkeit, die sie ersetzt hat
  return skillIndex.get(id) || (SKILL_RENAMED[id] ? skillById(SKILL_RENAMED[id]) : undefined);
}

// 2:45 bzw. 9s
function formatBuffTime(t) {
  return t >= 60 ? `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` : `${t}s`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}

// Lebens-, Mana- und Zielbalken
function setBar(id, frac) {
  $(id + 'Fill').style.transform = `scaleX(${Math.max(0, Math.min(1, frac))})`;
}

// Kopf der eigenen Figur im runden Rahmen oben links
function drawPortrait(cv, p) {
  const ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  const g = ctx.createRadialGradient(cv.width / 2, cv.height * 0.4, 4, cv.width / 2, cv.height / 2, cv.width / 2);
  g.addColorStop(0, CLASSES[p.classId].color);
  g.addColorStop(1, '#120c08');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(2.6, 0, 0, 2.6, cv.width / 2, cv.height + 20);
  drawPlayer(ctx, { classId: p.classId, path: p.path, x: 0, y: 0, r: 11, facing: { x: 0, y: 1 }, buffs: [], swing: 0, moving: false, shield: 0, equipment: p.equipment || null, look: p.look || null });
}

// Kleine Vorschau der Klasse für die Auswahlkarten; path färbt beim Magier Kristall, Hutband und Handlicht (seit 8.6)
function drawClassPreview(cv, classId, path = 0) {
  const ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.setTransform(1.9, 0, 0, 1.9, cv.width / 2, cv.height / 2 + 30);
  const fake = { classId, path, x: 0, y: 0, r: 11, facing: { x: 0.45, y: 0.89 }, buffs: [], swing: 0, moving: false, shield: 0 };
  drawPlayer(ctx, fake);
}

// Editor für das Aussehen: Vorschau (dreht sich beim Antippen) und Auswahl für Frisur, Haarfarbe,
// Haut, Augenform, Augenfarbe und Gesichtszeichen. onChange bekommt jedes Mal das neue Aussehen.
// path: Weg der Figur (beim Magier das Element, seit 8.6)
function lookEditor(box, classId, start, onChange, equipment = null, path = 0) {
  const look = { ...DEFAULT_LOOKS[classId], ...(start || {}) };
  let dir = 0;
  const dirs = [{ x: 0, y: 1 }, { x: 1, y: 0 }, { x: 0, y: -1 }];
  const cycle = (key, list, label) => `<div class="lk-row"><span>${label}</span><button type="button" class="lk-arrow" data-cyc="${key}:-1">‹</button>` +
    `<b>${list[look[key]]}</b><button type="button" class="lk-arrow" data-cyc="${key}:1">›</button></div>`;
  const swatches = (key, colors, label) => `<div class="lk-row"><span>${label}</span><div class="lk-swatches">` +
    colors.map((c, i) => `<button type="button" class="lk-sw${look[key] === i ? ' on' : ''}" style="--c:${c}" data-sw="${key}:${i}" aria-label="${label} ${i + 1}"></button>`).join('') + `</div></div>`;
  const render = () => {
    box.innerHTML = `<div class="lk"><canvas class="lk-preview" width="180" height="210" title="Antippen zum Drehen"></canvas><div class="lk-opts">` +
      cycle('sex', LOOKS.sex, 'Geschlecht') + cycle('hair', LOOKS.hair, 'Frisur') + swatches('hc', LOOKS.hairColor, 'Haare') + swatches('skin', LOOKS.skin, 'Haut') +
      cycle('eyes', LOOKS.eyes, 'Augen') + swatches('ec', LOOKS.eyeColor, 'Augenfarbe') + cycle('mark', LOOKS.mark, 'Gesicht') +
      `<button type="button" class="mini-btn lk-random">🎲 Zufällig</button></div></div>`;
    const cv = box.querySelector('canvas');
    const ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    const g = ctx.createRadialGradient(90, 130, 10, 90, 120, 110);
    g.addColorStop(0, `rgba(${hexRgb(CLASSES[classId].trim)},0.4)`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(3.3, 0, 0, 3.3, 90, 200);
    // ohne eigene Ausrüstung: Grundausrüstung ohne Helm, damit man die Haare sieht
    const fig = { classId, path, x: 0, y: 0, r: 11, facing: dirs[dir], buffs: [], swing: 0, moving: false, shield: 0, equipment: equipment || starterEquipment(classId), look };
    ctx.translate(0, -feetY(fig));
    drawPlayer(ctx, fig);
    cv.addEventListener('click', () => { dir = (dir + 1) % 3; render(); });
    box.querySelectorAll('[data-cyc]').forEach((b) => b.addEventListener('click', () => {
      const [key, step] = b.dataset.cyc.split(':');
      const n = { sex: LOOKS.sex, hair: LOOKS.hair, eyes: LOOKS.eyes, mark: LOOKS.mark }[key].length;
      look[key] = (look[key] + Number(step) + n) % n;
      // passende Frisur beim Wechsel des Geschlechts (danach frei wählbar)
      if (key === 'sex') look.hair = look.sex === 1 ? (look.hair === 0 || look.hair === 3 || look.hair === 5 ? 2 : look.hair) : (look.hair === 1 || look.hair === 2 || look.hair === 4 ? 0 : look.hair);
      onChange({ ...look });
      render();
    }));
    box.querySelectorAll('[data-sw]').forEach((b) => b.addEventListener('click', () => {
      const [key, i] = b.dataset.sw.split(':');
      look[key] = Number(i);
      onChange({ ...look });
      render();
    }));
    box.querySelector('.lk-random').addEventListener('click', () => {
      const r = (n) => Math.floor(Math.random() * n);
      Object.assign(look, { sex: r(2), hair: r(LOOKS.hair.length), hc: r(LOOKS.hairColor.length), skin: r(LOOKS.skin.length), eyes: r(LOOKS.eyes.length), ec: r(LOOKS.eyeColor.length), mark: r(LOOKS.mark.length) });
      onChange({ ...look });
      render();
    });
  };
  render();
}
