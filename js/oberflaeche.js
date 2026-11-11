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
    $('btnFly').addEventListener('click', () => setFlyHigh());
    $('btnFlyUp').addEventListener('click', () => setFlyHigh(true));
    $('btnFlyDown').addEventListener('click', () => setFlyHigh(false));
    $('btnNet').addEventListener('click', () => this.toggle('panelNet'));
    $('btnSocial').addEventListener('click', () => this.toggle('panelSocial'));
    $('btnQuests').addEventListener('click', () => this.toggle('panelQuests'));
    $('btnDaily').addEventListener('click', () => this.toggle('panelDaily'));
    $('btnOpts').addEventListener('click', () => this.toggle('panelOpts'));
    this.initMenuToggle();
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
    // Am PC (seit 10.9): Eingabe unten im Chatfenster statt oben in der Mitte; offen wird der Chat groß und scrollbar
    // Am Handy (seit 12.3) genauso: offen groß, mit dem Finger nach oben scrollbar, Eingabe unten links im Fenster
    $('chatBox').classList.add(IS_PC ? 'pc' : 'mob');
    $('chatBox').append($('chatBar'));
    $('chatBar').classList.add('in-box');
    if (!IS_PC && window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => this.placeChat());
      window.visualViewport.addEventListener('scroll', () => this.placeChat());
    }
    $('chatClose').addEventListener('click', () => this.closeChat());
    $('chatInput').addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closeChat();
      }
    });
    // Mausrad im offenen Chat scrollt nur den Chat
    $('chatLog').addEventListener('wheel', (e) => { if ($('chatBox').classList.contains('open')) e.stopPropagation(); }, { passive: true });
    for (const b of document.querySelectorAll('#chatTabs button, #chatChan button')) {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        this.setChatChan(b.dataset.c);
        if (b.closest('#chatChan')) $('chatInput').focus();
      });
    }
    $('chatBar').addEventListener('submit', (e) => {
      e.preventDefault();
      const text = $('chatInput').value;
      // seit 13.77: vor der ersten Nachricht die Verhaltensregeln bestätigen (Google Play)
      if (text.trim() && netOnline() && typeof regelnOk === 'function' && !regelnOk()) {
        regelnFragen(() => { if (netOnline()) netChat(text); });
      } else if (netOnline()) netChat(text);
      $('chatInput').value = '';
      this.closeChat();
    });
    onPress($('potHp'), () => usePotion('hp'));
    $('potHp').querySelector('.flask').src = lootIconUrl('potHp');
    $('potMp').querySelector('.flask').src = lootIconUrl('potMp');
    onPress($('potMp'), () => usePotion('mp'));
    setupQuickSlots();
    // seit 13.2: Beutel-Knopf, B und Beute-Meldungen öffnen direkt den Rucksack
    $('btnLoot').addEventListener('click', () => this.toggle('panelInv'));
    $('lootFeed').addEventListener('click', () => this.toggle('panelInv'));
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
      // seit 14.1: dazu, welche Gegenstände für die Fertigkeits-Ränge der Stein geben kann
      const sk = t.level >= SKILL_MAT_DROP.seelenstein.stone ? 'Bücher, Schriftrollen, Seelensteine' : t.level >= SKILL_MAT_DROP.rolle.stone ? 'Bücher, Schriftrollen' : 'Fertigkeitsbücher';
      return `<li><b style="color:${t.look.glow}">■</b> Stufe ${t.level} · ${t.name} <span>· ${zone ? zone.name : ''} · ${t.drop} · ${sk}</span></li>`;
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
      // seit 13.80: keine beleidigenden oder reservierten Namen (spielerschutz.js)
      if (typeof nameAnstoessig === 'function' && nameAnstoessig(name)) {
        $('createError').textContent = NAME_ABGELEHNT;
        $('createError').hidden = false;
        return;
      }
      // seit 14.53: Seite wählen (Licht oder Schatten, seiten.js)
      const faction = typeof factionPicked === 'function' ? factionPicked() : 'licht';
      if (!faction) {
        $('createError').textContent = 'Wähle deine Seite: Licht oder Schatten.';
        $('createError').hidden = false;
        return;
      }
      const save = newCharacter(name, this.selectedClass, this.selectedPath, this.createLook || DEFAULT_LOOKS[this.selectedClass]);
      save.faction = faction;
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
        '<button type="button" class="btn btn-ghost acc-out">Abmelden</button>' +
        // seit 13.77: Konto löschen (Google Play), Dialog in spielerschutz.js
        (typeof openDeleteAccount === 'function' ? '<button type="button" class="btn btn-ghost acc-del">Konto löschen</button>' : '') + '</div>' +
        this.pendingNote();
      const del = box.querySelector('.acc-del');
      if (del) del.addEventListener('click', () => openDeleteAccount());
      box.querySelector('.acc-out').addEventListener('click', async () => {
        box.querySelector('.acc-out').disabled = true;
        await accountLogout();
        this.showStart();
      });
      return;
    }
    if (this.accBusy) return;
    // seit 14.31: in der alten Store-App mit Charakteren ohne Konto deutlich auf den Umzug in die Desktop-App hinweisen
    const storeMove = MS_STORE_PWA && (readSlots().slots || []).some((sv) => sv && !sv.deleted);
    box.innerHTML = (storeMove ? '<p class="acc-store">Seelenstein wird im Microsoft Store zur eigenen Desktop-App. Lege jetzt ein kostenloses Konto an – nur dann ziehen deine Charaktere mit.</p>' : '') +
      '<p class="acc-hint">Mit Konto liegen deine Charaktere sicher auf dem Server – spiel auf Handy, PC oder Tablet weiter.</p>' +
      '<div class="acc-form"><input id="accName" type="text" maxlength="20" autocomplete="username" spellcheck="false" placeholder="Kontoname">' +
      '<input id="accPass" type="password" maxlength="64" autocomplete="current-password" placeholder="Passwort (mind. 6 Zeichen)">' +
      '<button type="button" class="btn btn-primary" data-acc="login">Anmelden</button><button type="button" class="btn btn-ghost" data-acc="register">Registrieren</button></div>' +
      `<p id="accMsg" class="acc-msg"${account.msg && account.state === 'off' ? '' : ' hidden'}>${escapeHtml(account.msg || '')}</p>`;
    box.querySelectorAll('[data-acc]').forEach((b) => b.addEventListener('click', async () => {
      // seit 13.77: beim Registrieren erst die Verhaltensregeln bestätigen (Google Play)
      if (b.dataset.acc === 'register' && typeof regelnOk === 'function' && !regelnOk()) {
        regelnFragen(() => b.click());
        return;
      }
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
      // Hauptwert schon bei der Wahl der Klasse (seit 13.4)
      const main = document.createElement('small');
      main.className = 'class-main';
      main.textContent = 'Hauptwert: ' + mainAttrName(id);
      btn.append(cv, strong, small, main);
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

  // Der Elementwechsel des Magiers im Menü (showElementChoice, seit 8.6) ist seit 13.63 entfallen:
  // der Magier wechselt sein Element wie die anderen Klassen ihren Weg beim Lehrmeister (renderTeacher).

  enterGame() {
    $('startScreen').hidden = true;
    $('hud').hidden = false;
    $('touchControls').hidden = !input.touchUi;
    $('hud').classList.toggle('touch', input.touchUi);
    this.placeLootBtn();
    hudLayout.init();
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
    // liegengebliebene Zieh-Symbole (13.23) mit aufräumen
    document.querySelectorAll('.drag-ghost').forEach((g) => g.remove());
    this.swapFrom = null;
    // Anzeigen der Abklingzeiten neu setzen (die Knöpfe sind neu)
    if (this.cache) for (const k of Object.keys(this.cache)) if (/^(run|cd|cdp|mana)\d$/.test(k)) delete this.cache[k];
    // Die Reihenfolge der Plätze kann man per langem Drücken ändern (p.skillOrder); seit 10.7 auch leere Plätze
    skillOrder(p).forEach((i, slot) => {
      const wrap = document.createElement('div');
      wrap.className = 'skill-wrap';
      wrap.dataset.slot = slot;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.slot = slot;
      const keyTxt = keyLabel(actionKey(slot < 5 ? 'skill' + (slot + 1) : 'ult'));
      // Ultimative Attacke (seit 13.20 ein Platz der Leiste wie jede Fertigkeit, tauschbar per langem Drücken)
      if (i === ULT_BAR) {
        const u = ultimateOf(p);
        // ohne Ulti bleibt der Platz unsichtbar (die Plätze danach behalten ihre Stelle)
        if (!u) { wrap.hidden = true; bar.append(wrap); return; }
        const locked = p.level < u.unlock;
        wrap.classList.add('ult-wrap');
        btn.id = 'skillUlt';
        btn.className = 'slot skill ult' + (locked ? ' locked' : '');
        btn.setAttribute('aria-label', u.name);
        btn.dataset.info = ultTipHtml(u, keyTxt) + '<small class="tip-hint">Lange drücken: mit einer anderen Fertigkeit tauschen.</small>';
        btn.innerHTML = `<span class="key">${keyTxt}</span><img class="skill-icon" src="${skillIconUrl(u)}" alt="${u.short}">` +
          `<span class="cd" hidden></span>${locked ? `<span class="lock">ab LVL ${u.unlock}</span>` : ''}`;
        this.pressSkill(btn, ULT_BAR, slot);
        wrap.append(btn);
        bar.append(wrap);
        return;
      }
      if (i == null) {
        btn.className = 'slot skill empty-slot';
        btn.id = 'skillSlot' + slot;
        btn.dataset.info = `<strong>Freier Platz <kbd>${keyTxt}</kbd></strong><span>Antippen, um eine Fertigkeit hineinzulegen.</span>`;
        btn.innerHTML = `<span class="key">${keyTxt}</span><span class="quick-empty">+</span>`;
        this.pressSkill(btn, null, slot);
        wrap.append(btn);
        bar.append(wrap);
        return;
      }
      const sk = classSkills(p)[i];
      const rank = skillRank(p.skillLevels[i]);
      btn.className = 'slot skill kind-' + sk.kind + (rank >= 0 ? ' rank-' + SKILL_RANKS[rank].id : '');
      btn.id = 'skill' + i;
      // Infofeld beim Darüberfahren (seit 10.8, tipps.js) statt des schlichten Browser-Titels
      btn.dataset.info = skillTipHtml(sk, p.skillLevels[i], keyTxt) + '<small class="tip-hint">Lange drücken: tauschen, auf einen freien Platz oder aus der Leiste ziehen.</small>';
      btn.setAttribute('aria-label', skillRankName(sk, p.skillLevels[i]));
      btn.innerHTML = `<span class="key">${keyTxt}</span><img class="skill-icon" src="${skillIconUrl(sk, rank)}" alt="${sk.short}">` +
        `<span class="slvl">${p.level >= sk.unlock ? skillLevelText(p.skillLevels[i]) : ''}</span>` +
        `<span class="cd" hidden></span>` +
        (p.level < sk.unlock ? `<span class="lock">ab LVL ${sk.unlock}</span>` : '');
      this.pressSkill(btn, i, slot);
      wrap.append(btn);
      wrap.insertAdjacentHTML('beforeend', '<span class="runring" hidden></span><span class="run" hidden></span>');
      // Plus-Knopf, wenn etwas geht: Punkt setzen (der Punkt auf 15 erweckt), Buch lesen bzw. seit 14.1 auch
      // Schriftrolle oder Seelenstein nutzen. Nur der Schritt in einen höheren Rang läuft über das Charakterfenster.
      const acts = skillActions(p, i).filter((a) => a.ok);
      if (acts.length) {
        const act = acts.find((a) => a.type === 'point') || acts.find((a) => a.type === 'rankup' && rank < 0) || acts.find((a) => a.type === 'book');
        // „E“, wenn der Tipp erweckt (der Punkt auf Stufe 15 macht seit 8.9 sofort E1)
        const awaken = act && (act.type === 'rankup' || (act.type === 'point' && p.skillLevels[i] + 1 >= SKILL_POINT_MAX));
        const plus = document.createElement('button');
        plus.type = 'button';
        plus.className = 'plus' + (awaken ? ' awaken' : '');
        plus.title = awaken ? skillRankName(sk, p.skillLevels[i]) + ' erwecken' : skillRankName(sk, p.skillLevels[i]) + ' verbessern';
        plus.textContent = awaken ? 'E' : '+';
        plus.addEventListener('pointerdown', (e) => e.stopPropagation());
        // seit 14.32: erst die Vorschau (alte → neue Werte), verbessert wird mit „Bestätigen“ (fertigkeit-vorschau.js)
        if (act && typeof skillPreviewBind === 'function') skillPreviewBind(plus, i, act.type);
        else plus.addEventListener('click', (e) => {
          e.stopPropagation();
          if (act) upgradeSkill(i, act.type);
          else this.toggle('panelChar');
        });
        wrap.append(plus);
      }
      bar.append(wrap);
    });
    // Klassensegen (seit 13.1): eigener Knopf, Taste 9
    if (typeof segenButton === 'function') segenButton(bar, p);
    if (this.cache) this.cache.ult = null;
  },

  // Antippen löst die Fertigkeit aus, langes Drücken hebt sie an. Dann (seit 10.7):
  // - auf einen anderen Platz der Leiste ziehen oder ihn antippen: die beiden tauschen (auch mit einem leeren Platz),
  // - auf einen freien Platz (7/8) ziehen oder ihn antippen: die Fertigkeit wandert dorthin, ihr Platz wird frei,
  // - aus der Leiste hinausziehen und loslassen: sie wird herausgenommen, der Platz ist frei.
  // Ein leerer Platz zeigt „+“: Antippen öffnet die Auswahl der Fertigkeiten.
  pressSkill(btn, i, slot) {
    let timer = null;
    let lifted = false;
    let channeling = false;
    let ghost = null;
    // Zielen durch Ziehen (seit 14.2, Handy): Fertigkeiten mit Zielkreis vom Knopf aus in die gewünschte Richtung
    // ziehen, loslassen wirkt. Kurzes Tippen öffnet wie bisher den Kreis, langes Drücken ohne Ziehen hebt sie zum Tauschen an.
    let drag = null;
    const dropGhost = () => { if (ghost) ghost.remove(); ghost = null; };
    btn.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      lifted = false;
      drag = null;
      if (this.swapFrom != null) {
        timer = null;
        this.finishSwap(slot);
        return;
      }
      if (i == null) {
        openSlotPicker(slot);
        return;
      }
      try { btn.setPointerCapture(e.pointerId); } catch (err) { /* ältere Browser */ }
      // Eisstrahl (seit 9.6): sofort beim Drücken, solange gehalten (kein Anheben zum Tauschen)
      const sk = game.player && i !== ULT_BAR && classSkills(game.player)[i];
      if (sk && sk.channel) {
        channeling = true;
        useSkill(i);
        return;
      }
      const sx = e.clientX;
      const sy = e.clientY;
      if (sk && sk.aim && e.pointerType !== 'mouse' && !skillTouchDirect(sk)) drag = { x: sx, y: sy, on: false };
      timer = setTimeout(() => {
        if (drag && drag.on) return;
        timer = null;
        lifted = true;
        this.startSwap(slot);
        ghost = skillDragGhost(i, sx, sy);
        // Fertigkeiten mit Zielkreis: erst nach längerem ruhigem Halten anheben, vorher hat das Ziehen zum Zielen Vorrang
      }, drag ? SKILL_HOLD_AIM_MS : SKILL_HOLD_MS);
    });
    btn.addEventListener('pointermove', (e) => {
      if (drag && !lifted) {
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        if (!drag.on && Math.hypot(dx, dy) < 14) return;
        if (!drag.on) {
          drag.on = true;
          clearTimeout(timer);
          timer = null;
          // Kreis öffnen (prüft Abklingzeit, Mana, Dorf); ist er für diese Fertigkeit schon offen, nur verschieben
          if (!(game.aim && game.aim.i === i)) useSkill(i);
        }
        if (game.aim && game.aim.i === i) aimDrag(dx, dy);
        return;
      }
      if (!ghost) return;
      ghost.style.left = e.clientX + 'px';
      ghost.style.top = e.clientY + 'px';
    });
    btn.addEventListener('pointerup', (e) => {
      if (channeling) {
        channeling = false;
        releaseChannel(i);
        return;
      }
      if (drag && drag.on) {
        drag = null;
        // zurück auf den Knopf gezogen: nicht wirken, der Kreis bleibt offen
        if (game.aim && game.aim.i === i && Math.hypot(e.clientX - btn.getBoundingClientRect().left - btn.offsetWidth / 2, e.clientY - btn.getBoundingClientRect().top - btn.offsetHeight / 2) > btn.offsetWidth * 0.6) aimFire();
        return;
      }
      drag = null;
      if (timer) {
        clearTimeout(timer);
        timer = null;
        useBarEntry(i);
        return;
      }
      if (!lifted) return;
      lifted = false;
      dropGhost();
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const target = el && el.closest('#skillBar .slot.skill, #quick1, #quick2');
      // auf sich selbst losgelassen: bleibt angehoben, ein Tippen auf einen Platz tauscht
      if (target === btn) return;
      if (target && (target.id === 'quick1' || target.id === 'quick2')) {
        if (i === ULT_BAR) { this.endSwap(); this.buildSkillBar(); return; }
        this.moveToQuick(slot, target.id === 'quick1' ? 0 : 1);
        return;
      }
      if (target) {
        this.finishSwap(Number(target.dataset.slot));
        return;
      }
      // außerhalb der Leiste losgelassen: herausnehmen
      const r = $('skillBar').getBoundingClientRect();
      const out = e.clientX < r.left - 12 || e.clientX > r.right + 12 || e.clientY < r.top - 12 || e.clientY > r.bottom + 12;
      if (out && i !== ULT_BAR) this.removeFromBar(slot);
      else if (out) { this.endSwap(); this.buildSkillBar(); }
    });
    btn.addEventListener('pointercancel', () => {
      drag = null;
      if (channeling) releaseChannel(i);
      channeling = false;
      clearTimeout(timer);
      timer = null;
      dropGhost();
    });
    // Tastatur (Enter/Leertaste auf dem Knopf); ein Eisstrahl läuft dann nur kurz
    btn.addEventListener('click', (e) => {
      if (e.detail !== 0) return;
      if (i == null) { openSlotPicker(slot); return; }
      useBarEntry(i);
      if (i !== ULT_BAR) releaseChannel(i);
    });
  },

  startSwap(slot) {
    const p = game.player;
    this.swapFrom = slot;
    $('skillBar').classList.add('swapping');
    const wrap = document.querySelector(`#skillBar .skill-wrap[data-slot="${slot}"]`);
    if (wrap) wrap.classList.add('swap-pick');
    buzz(25);
    const i = skillOrder(p)[slot];
    ui.log(i === ULT_BAR ? `${barEntryName(p, i)} angehoben: auf einen anderen Platz der Leiste ziehen oder ihn antippen, um zu tauschen.`
      : `${barEntryName(p, i)} angehoben: auf einen anderen Platz oder einen freien Platz ziehen – oder aus der Leiste hinausziehen, um sie herauszunehmen.`, 'info');
    // Tippen irgendwo anders bricht ab
    const cancel = (e) => {
      if (e.target.closest && e.target.closest('#skillBar .slot.skill, #quick1, #quick2')) return;
      document.removeEventListener('pointerdown', cancel, true);
      if (this.swapFrom != null) { this.swapFrom = null; this.buildSkillBar(); }
    };
    this.swapCancel = cancel;
    setTimeout(() => document.addEventListener('pointerdown', cancel, true), 0);
  },

  endSwap() {
    if (this.swapCancel) document.removeEventListener('pointerdown', this.swapCancel, true);
    this.swapFrom = null;
  },

  // zwei Plätze der Leiste tauschen (auch mit einem leeren)
  finishSwap(to) {
    const p = game.player;
    const from = this.swapFrom;
    this.endSwap();
    if (from != null && to != null && to !== from) {
      const order = skillOrder(p);
      [order[from], order[to]] = [order[to], order[from]];
      p.skillOrder = order;
      saveGame();
      const a = barEntryName(p, order[to]);
      const b = barEntryName(p, order[from]);
      ui.log(b ? `${a} und ${b} haben die Plätze getauscht.` : `${a} liegt jetzt auf Platz ${to + 1}.`, 'info');
    }
    this.buildSkillBar();
  },

  // Fertigkeit aus der Leiste auf einen freien Platz (7/8): ihr Platz in der Leiste wird frei
  // (lag dort schon eine Fertigkeit, kommt sie zurück in die Leiste)
  moveToQuick(slot, k) {
    const p = game.player;
    this.endSwap();
    const order = skillOrder(p);
    const i = order[slot];
    if (i == null || i === ULT_BAR) return this.buildSkillBar();
    const prev = quickSkill(p, quickOf(p)[k]);
    order[slot] = prev && !order.includes(prev.i) ? prev.i : null;
    p.skillOrder = order;
    quickOf(p)[k] = 'sk:' + i;
    p.quickSet = true;
    saveGame();
    ui.log(`${classSkills(p)[i].name} liegt jetzt auf dem freien Platz ${k + 1}.`, 'info');
    this.buildSkillBar();
    renderQuickSlots();
  },

  removeFromBar(slot) {
    const p = game.player;
    this.endSwap();
    const order = skillOrder(p);
    const i = order[slot];
    if (i == null || i === ULT_BAR) return this.buildSkillBar();
    order[slot] = null;
    p.skillOrder = order;
    saveGame();
    ui.log(`${classSkills(p)[i].name} ist aus der Leiste genommen – Platz ${slot + 1} ist frei. Antippen, um ihn neu zu belegen.`, 'info');
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
      for (const rp of net.players.values()) names.push(`${escapeHtml(rp.name)} <small>LVL ${rp.level} · ${CLASSES[rp.classId].name}</small>`);
      players = `<h3>Im Kanal</h3><ul class="net-list">${names.map((n) => `<li>${n}</li>`).join('')}</ul>` +
        '<div class="net-row"><button type="button" class="btn btn-ghost" data-net="share">Freunde einladen</button><button type="button" class="btn btn-ghost" data-net="solo">Allein spielen</button></div>';
    } else {
      players = '<div class="net-row"><button type="button" class="btn btn-ghost" data-net="solo">Allein spielen</button></div>';
    }
    body.innerHTML = '<p>Wähle einen Kanal. Alle im selben Kanal spielen in derselben Welt, jeder mit seiner eigenen Figur.</p>' +
      servers + players +
      '<p class="hint-text">Wer einen leeren Kanal betritt, führt dessen Welt für alle. Geht er, übernimmt automatisch ein anderer Spieler, der Kanal bleibt also immer offen. Erfahrung, Beute und Auftragsfortschritt bekommt, wer das Monster selbst getroffen hat (auch mit Dienern), und wer mit so einem Spieler in einer Gruppe ist und in der Nähe.</p>' +
      '<p id="netMsg" class="hint-text"></p>';
    body.querySelectorAll('[data-ch]').forEach((b) => b.addEventListener('click', () => {
      const [srv, ch] = b.dataset.ch.split(':');
      net.autoJoin = false;
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
    const online = netOnline();
    $('chatBar').hidden = false;
    const inp = $('chatInput');
    inp.disabled = !online;
    if (!online) inp.placeholder = IS_PC ? 'Chat gibt es im Kanal – Server wählen (N). Esc schließt.' : 'Chat gibt es im Kanal – Server wählen.';
    else this.setChatChan(this.chatChan);
    $('chatBox').classList.add('open');
    this.chatOpen = true;
    this.renderChat(true);
    // am Handy erst lesen und scrollen; die Tastatur kommt beim Antippen des Eingabefelds
    if (online && IS_PC) inp.focus();
    this.placeChat();
  },

  closeChat() {
    $('chatBar').hidden = true;
    $('chatInput').blur();
    if (this.chatOpen) {
      this.chatOpen = false;
      $('chatBox').classList.remove('open');
      this.renderChat(true);
    }
    this.placeChat();
  },

  // Handy: offener Chat sitzt über der Tastatur (die Tastatur verdeckt sonst die Eingabe unten)
  placeChat() {
    if (IS_PC) return;
    const box = $('chatBox');
    const vv = window.visualViewport;
    if (!this.chatOpen || !vv) {
      box.style.bottom = '';
      box.style.maxHeight = '';
      return;
    }
    const kb = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
    box.style.bottom = kb > 60 ? kb + 6 + 'px' : '';
    box.style.maxHeight = kb > 60 ? Math.max(90, vv.height - 12) + 'px' : '';
    if (kb > 60) $('chatLog').scrollTop = $('chatLog').scrollHeight;
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
    if (this.chatLines.length > 200) this.chatLines.shift();
    // seit 13.77: Nachrichten blockierter Spieler nicht zeigen (bleiben für eine Meldung im Verlauf)
    if (name && typeof isBlocked === 'function' && isBlocked(name)) return;
    if (this.chatShows(c)) this.renderChat();
    else {
      const tab = document.querySelector(`#chatTabs button[data-c="${c}"]`);
      if (tab) tab.classList.add('new');
    }
  },

  // seit 13.41: Spielmeldungen (Belohnungen, Aufträge, Stufen …) stehen nur noch im Reiter System, nicht im Global-Chat
  chatShows(c) {
    if (this.chatChan === 'sys') return c === 'sys';
    if (this.chatChan === 'g') return c !== 'sys';
    return c === this.chatChan;
  },

  setChatChan(c) {
    this.chatChan = c;
    for (const b of document.querySelectorAll('#chatTabs button, #chatChan button')) {
      const on = b.dataset.c === c;
      b.classList.toggle('on', on);
      b.setAttribute(b.getAttribute('role') === 'tab' ? 'aria-selected' : 'aria-pressed', on ? 'true' : 'false');
      if (on) b.classList.remove('new');
    }
    if (c === 'g') for (const b of document.querySelectorAll('#chatTabs button')) if (b.dataset.c !== 'sys') b.classList.remove('new');
    $('chatInput').placeholder = c === 'gi' ? 'Nachricht an deine Gilde …' : c === 'o' ? 'Nachricht an Spieler in der Nähe …' : 'Nachricht an alle …';
    this.renderChat();
  },

  // Offen (PC) stehen alle Nachrichten (bis 200) im scrollbaren Verlauf; wer hochgescrollt hat, bleibt dort stehen
  renderChat(jump) {
    const box = $('chatLog');
    const atBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 12;
    box.textContent = '';
    const tags = { gi: 'Gilde', o: 'Ort' };
    const all = this.chatLines.filter((l) => this.chatShows(l.c) && !(l.name && typeof isBlocked === 'function' && isBlocked(l.name)));
    const lines = this.chatOpen ? all : all.slice(-12);
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
        // seit 13.77: Namen anderer Spieler antippen (offener Chat) → Spielerkarte, Blockieren, Melden
        if (l.name !== (game.player && game.player.name) && typeof chatNameMenu === 'function') {
          b.className = 'ch-name';
          b.addEventListener('click', () => chatNameMenu(l.name));
        }
        row.append(b);
      }
      row.append(document.createTextNode(l.text));
      box.append(row);
    }
    if (!lines.length) this.chatHint();
    if (jump || atBottom || !this.chatOpen) box.scrollTop = box.scrollHeight;
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
    box.innerHTML = '<p class="hint">' + (c === 'sys' ? 'System · Belohnungen, Aufträge, Stufenaufstiege und alle Meldungen des Spiels.' : c === 'gi' ? 'Gildenchat · nur deine Gilde liest mit.' : c === 'o' ? 'Ortschat · nur Spieler in deiner Nähe lesen mit.' : 'Chat · Tippe auf die Sprechblase, um zu schreiben.') + '</p>';
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

  // seit 14.47: Menü-Knopf am Handy – klappt die übrigen Symbole auf und zu; ein Tipp daneben oder auf ein Symbol
  // schließt wieder. Ein rotes „!“ am Knopf, solange eines der versteckten Symbole ein Abzeichen zeigt.
  initMenuToggle() {
    const nav = document.querySelector('nav.menu');
    const btn = $('btnMenu');
    if (!nav || !btn) return;
    const set = (open) => {
      nav.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      set(!nav.classList.contains('open'));
    });
    nav.addEventListener('click', (e) => {
      const b = e.target.closest('.menu-btn');
      if (b && b !== btn && nav.classList.contains('open')) set(false);
    });
    document.addEventListener('pointerdown', (e) => {
      if (nav.classList.contains('open') && !nav.contains(e.target)) set(false);
    }, true);
    const badge = $('menuBadge');
    const sync = () => {
      const any = ['questBadge', 'socialBadge', 'dailyBadge'].some((id) => $(id) && !$(id).hidden) || $('btnChar').classList.contains('has-points');
      if (badge.hidden === any) badge.hidden = !any;
    };
    new MutationObserver(sync).observe(nav, { subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
    sync();
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
      // seit 14.17 direkt hinter dem Wort „Pferd“ (vorher unter dem Knopf, dort vom nächsten Knopf verdeckt)
      const label = btn.querySelector('.menu-text');
      if (label) label.after(pct); else btn.append(pct);
    }
    const horse = p && p.horse ? HORSES[p.horseTier || 1] || HORSES[1] : null;
    pct.hidden = !horse;
    // seit 14.32: Drache am Boden (Dungeon, Instanz, Arena, Duell) läuft so schnell wie das Kriegsross
    const grounded = !!(horse && horse.fly && p.riding && p.dragonGround);
    if (horse) pct.textContent = '+' + Math.round((grounded ? HORSES[2] : horse).speed * 100) + ' %';
    // seit 14.27: mit der Glutschwinge heißt der Knopf „Drache“, der Hinweis nennt das Fliegen
    const label = btn.querySelector('.menu-text');
    const word = horse && horse.fly ? 'Drache' : 'Pferd';
    // nur bei einem Wechsel setzen (die Übersetzung tauscht den Text danach aus; kein Hin und Her)
    if (label && btn.dataset.mount !== word) {
      btn.dataset.mount = word;
      label.textContent = word;
      btn.setAttribute('aria-label', word);
    }
    btn.title = !horse ? '' : grounded ? `${horse.name} (+${Math.round(HORSES[2].speed * 100)} % Lauftempo) · läuft hier am Boden`
      : `${horse.name} (+${Math.round(horse.speed * 100)} % Lauftempo)` + (horse.fly ? ' · fliegt über Bäume, Felsen und Wasser' : '');
  },

  // seit 14.39: Knopf „Steigen“/„Sinken“ neben dem Drachen-Knopf, nur solange man auf dem Drachen fliegt.
  // Pfeil nach oben = steigen (man fliegt tief), nach unten und leuchtend = sinken (man fliegt hoch).
  // Jedes Bild aufgerufen (dragonRideTick): ändert das DOM nur bei einem Wechsel.
  updateFlyButton() {
    const btn = $('btnFly');
    if (!btn) return;
    const p = game.player;
    const show = typeof dragonFlying === 'function' && dragonFlying(p);
    const high = !!(show && p.flyHigh);
    const st = show ? (high ? 'hoch' : 'tief') : '';
    if (btn.dataset.st === st) return;
    btn.dataset.st = st;
    btn.hidden = !show;
    // Handy: zwei Knöpfe, der gerade unmögliche ist ausgegraut (in der HUD-Bearbeitung bleibt das Feld sichtbar)
    const pad = $('flyPad');
    if (pad) {
      if (!hudLayout.editing) pad.hidden = !show;
      // ausgegraut über eine Klasse statt disabled: so lässt sich das Feld in der HUD-Bearbeitung trotzdem ziehen
      for (const [id, off] of [['btnFlyUp', !show || high], ['btnFlyDown', !show || !high]]) {
        $(id).classList.toggle('off', off);
        $(id).setAttribute('aria-disabled', off ? 'true' : 'false');
      }
    }
    btn.classList.toggle('on', high);
    // deutsch setzen, die Übersetzung (sprache.js) tauscht Text, aria-label und title danach aus
    const word = high ? 'Sinken' : 'Steigen';
    const label = btn.querySelector('.menu-text');
    if (label) label.textContent = word;
    btn.setAttribute('aria-label', word);
    btn.title = high ? 'Du fliegst hoch – zum Sinken antippen' : 'Du fliegst tief – zum Steigen antippen';
  },

  // Lebensbalken eines Bosses oben in der Mitte, sobald man in seiner Nähe ist
  updateBossBar() {
    const p = game.player;
    // seit 13.70: der Wellenmeister der eigenen Arena-Halle immer, egal wie weit weg (herausforderung.js)
    const hall = typeof arenaSlotAt === 'function' ? arenaSlotAt(p.x, p.y) : -1;
    const boss = game.monsters.find((m) => m.type && m.type.boss && !m.dead && (dist(m, p) < 560 || (hall >= 0 && arenaSlotAt(m.x, m.y) === hall)));
    this.set('boss', boss ? boss.id + ':' + Math.ceil(boss.hp) : '', () => {
      $('bossBar').hidden = !boss;
      document.body.classList.toggle('has-boss', !!boss);
      if (!boss) return;
      $('bossName').textContent = `LVL ${boss.level} ${boss.name}`;
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
    // seit 14.38: Zahlen höchstens zehnmal je Sekunde schreiben (slow), die Balken weiter in jedem Bild. Im Kampf ändern
    // sich Leben und Mana in fast jedem Bild; jeder neue Text ließ den Browser Stil und Layout des HUD neu rechnen
    // (gemessen ~2 ms je Bild im Kampf gegenüber 0,2 ms beim Laufen). Der letzte Stand kommt immer an.
    const slow = game.time >= (this.slowAt || 0) || game.time < (this.slowAt || 0) - 1;
    if (slow) this.slowAt = game.time + 0.1;
    this.set('hpBar', Math.round((p.hp / s.maxHp) * 1000), () => { setBar('hp', p.hp / s.maxHp); });
    this.set('mpBar', Math.round((p.mp / s.maxMp) * 1000), () => { setBar('mp', p.mp / s.maxMp); });
    if (slow) {
      this.set('hp', `${Math.ceil(p.hp)}/${s.maxHp}`, (v) => { $('hpText').textContent = v; });
      this.set('mp', `${Math.floor(p.mp)}/${s.maxMp}`, (v) => { $('mpText').textContent = v; });
    }
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
    updateQuickCounts();
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
    // Startbonus (seit 13.10): steht vorn in der Leiste, solange er läuft (Restzeit in Tagen)
    const evDays = eventXpActive() ? Math.ceil((EVENT_XP.until - Date.now()) / 86400000) : 0;
    // Gift eines anderen Spielers (seit 14.15) als Debuff in der Leiste: „Vergiftet · 4 s · 312/s“
    const tox = p.toxin && p.toxin.until > game.time ? { left: Math.max(1, Math.ceil(p.toxin.until - game.time - 0.01)), dps: Math.round(p.toxin.dps) } : null;
    this.set('buffs', buffs.map(({ b, left }) => b.id + left).join('|') + '|' + shield + '|' + evDays + '|' + (tox ? tox.left + ':' + tox.dps : ''), () => {
      const ev = evDays ? `<div class="buff-ico buff-event" style="--p:${(evDays / 22).toFixed(3)}" data-tip="${escapeHtml(`${EVENT_XP.name}\n+${Math.round(EVENT_XP.mul * 100)} % Erfahrung für alle Charaktere\nnoch ${evDays} ${evDays === 1 ? 'Tag' : 'Tage'} (bis 22.11.), bleibt auch beim Tod`)}">` +
        `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.6 6.2 6.7.6-5.1 4.4 1.6 6.6L12 16.8l-5.8 3.5 1.6-6.6-5.1-4.4 6.7-.6z"/></svg><span>${evDays} T</span></div>` : '';
      const debuff = tox ? `<div class="buff-ico buff-debuff" style="--p:${(tox.left / TOXIN.dur).toFixed(3)}" data-tip="${escapeHtml(`Vergiftet · ${tox.left} s · ${tox.dps}/s\nGift eines anderen Spielers`)}">` +
        `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c3.6 4.6 6.2 8.3 6.2 11.4a6.2 6.2 0 0 1-12.4 0C5.8 10.8 8.4 7.1 12 2.5z"/><circle cx="9.6" cy="14.2" r="1.3"/><circle cx="13.8" cy="16.6" r="1"/></svg><span>${tox.left} s</span></div>` : '';
      $('buffList').innerHTML = ev + debuff + buffs.map(({ b, left }) => {
        const sk = skillById(b.id);
        const icon = sk ? skillIconUrl(sk) : typeof segenIconUrl === 'function' ? segenIconUrl(b.id) : '';
        const extra = b.id === 'knochenpanzer' && shield ? `<em>${shield}</em>` : '';
        return `<div class="buff-ico${left <= 10 ? ' ending' : ''}" style="--p:${(left / b.duration).toFixed(3)}" data-tip="${escapeHtml(buffTip(b))}">` +
          `<img src="${icon}" alt="${b.name}">${extra}<span>${formatBuffTime(left)}</span></div>`;
      }).join('');
      $('hud').classList.toggle('has-buffs', buffs.length > 0 || evDays > 0 || !!tox);
    });

    if (typeof segenTick === 'function') segenTick();
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
      // seit 13.85: Dauer, von der die Uhr ausgeht (globale Abklingzeit kann länger sein als die eigene)
      const cf = p.cdFull && p.cdFull[i];
      const full = Math.max(0.01, cf && cf >= left - 0.01 ? cf : Math.max(skillCooldown(sk), left));
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
        el.style.setProperty('--p', String(Math.min(1, left / full)));
      });
      // Die Uhr der Abklingzeit in 48 Schritten statt in jedem Bild neu setzen
      if (left > 0) {
        this.set('cdp' + i, Math.ceil(Math.min(1, left / full) * 48), (v) => {
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
    // seit 14.38 getrennt: Ziel (Name, Farbe) sofort, Balken in jedem Bild, die Lebenszahl höchstens zehnmal je Sekunde
    // (vorher schrieb jeder Treffer Name, Farbe, Balken und Zahl neu)
    this.set('target', t ? t.id + ':' + t.level + ':' + t.name : '', () => {
      $('targetFrame').hidden = !t;
      document.body.classList.toggle('has-target', !!t);
      this.cache.targetBar = null;
      this.cache.targetHp = null;
      if (!t) return;
      $('targetName').textContent = `LVL ${t.level} ${t.name}`;
      $('targetName').style.color = t.isStone ? lighter(t.stoneType.look.glow, 0.45) : levelColor(t.level);
    });
    if (t) {
      this.set('targetBar', Math.round((t.hp / t.maxHp) * 1000), () => { setBar('target', t.hp / t.maxHp); });
      if (slow || this.cache.targetHp == null) {
        this.set('targetHp', Math.ceil(t.hp) + '/' + t.maxHp, () => {
          $('targetText').textContent = `${Math.ceil(t.hp).toLocaleString('de-DE')} / ${t.maxHp.toLocaleString('de-DE')}`;
        });
      }
    }

    // Zustände des Ziels (seit 13.41): Brand, Gift, Blutung, Verlangsamung, Betäubung, Eis und Flüche mit Restzeit
    // und Schaden je Sekunde – wie die eigenen Buffs, nur am Ziel
    const fx = t ? targetEffects(t) : [];
    this.set('targetFx', fx.map((e) => e.key).join('|'), () => {
      $('targetFx').innerHTML = fx.map((e) => `<span class="tfx tfx-${e.kind}" title="${e.tip}"><b>${e.icon}</b>${e.label}<em>${e.time}</em></span>`).join('');
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
    // Klang (seit 9.4): Münzen für Gold, sonst ein weicher Glanz
    snd.player(/Gold/.test(name) ? 'coin' : 'item', { vol: 0.3 });
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

  // Beutel-Knopf (seit 13.2): am PC in der Aktionsleiste rechts neben den Tränken statt hinter dem Chat,
  // auf dem Handy wie bisher frei über dem Chat
  placeLootBtn() {
    const btn = $('btnLoot');
    if (!input.touchUi) {
      if (btn.parentElement !== $('quick2').parentElement) $('quick2').after(btn);
    } else if (btn.parentElement !== $('hud')) $('hud').insertBefore(btn, $('chatBox'));
  },

  clearLootBadge() {
    this.lootUnseen = 0;
    $('lootBadge').hidden = true;
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
      // seit 14.1: Schriftrollen (H) und Seelensteine als Gegenstand (L, V)
      SKILL_MATS.map((m) => `<span title="${m.id === 'seelenstein' ? 'Seelensteine (Gegenstand)' : 'Schriftrollen'} · ${m.tag}"><img src="${materialIconUrl(m.id)}" alt=""> ${p.materials[m.id] || 0}</span>`).join('') +
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

  // cls (seit 13.56): Zusatzklasse, z. B. das goldene Banner für legendäre Beute
  banner(title, sub, cls) {
    const b = $('banner');
    b.className = 'banner' + (cls ? ' ' + cls : '');
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
        this.clearLootBadge();
        gear.openInventory();
        return;
      }
      if (id === 'panelLoot') this.renderLoot();
      if (id === 'panelMats') gear.renderMats();
      if (id === 'panelSocial') social.render();
      if (id === 'panelDaily') renderDaily();
      if (id === 'panelQuests') renderQuestWindow();
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
    $('panelNpc').classList.remove('npc-wide');
  },

  anyPanelOpen() {
    return [...document.querySelectorAll('.panel')].some((el) => el.id !== 'panelDeath' && !el.hidden);
  },

  // Zeile „Element: Feuer“ im Charakterfenster (nur Magier). Seit 13.63 ohne Knopf zum Wechseln:
  // das Element wechselt man wie die anderen Klassen ihren Weg beim Lehrmeister.
  elementHtml(p) {
    if (p.classId !== 'magier') return '';
    const E = mageEl(p);
    return `<p class="el-change" style="--el:${E.main}">Element: <span class="el-name">${E.name}</span>` +
      `<span class="hint-text">Wechseln beim Lehrmeister</span></p>`;
  },

  renderCharPanel() {
    const p = game.player;
    if (!p) return;
    const s = playerStats(p);
    const c = CLASSES[p.classId];
    const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
    const pct = (v) => Math.round(v * 100) + ' %';
    // Summe der Boni mit Obergrenze (BONUS_CAPS), z. B. „8 % / 25 %“
    const capPct = (v, k) => pct(v || 0) + (BONUS_CAPS[k] ? ` <small class="cap">/ ${pct(BONUS_CAPS[k])}</small>` : '');
    // Seit 12.4 auf Seiten verteilt (kein langes Scrollen): Status, Fertigkeiten, Werte
    const tab = this.charTab || 'status';
    const dot = (n) => (n > 0 ? `<i class="tab-dot">${n}</i>` : '');
    const tabs = [['status', 'Status', dot(p.statPoints || 0)], ['skills', 'Fertigkeiten', dot(p.skillPoints || 0)], ['werte', 'Werte', '']];
    const pages = {
      status: this.elementHtml(p) + this.attrHtml(p),
      skills:
        // seit 14.1: E mit Büchern, H mit Schriftrollen, L und V mit Seelensteinen (Gegenstand)
        `<p class="sk-summary">Punkte <span class="points">${p.skillPoints}</span>` +
        `<span class="sk-item" title="Fertigkeitsbücher deiner Fertigkeiten · E1–E10"><img src="${lootIconUrl('book')}" alt=""> Bücher <span class="points">${totalBooks(p, true)}</span></span>` +
        `<span class="sk-item" title="Schriftrollen · H1–H10, nur aus Seelensteinen ab Stufe ${SKILL_MAT_DROP.rolle.stone}"><img src="${materialIconUrl('rolle')}" alt=""> Schriftrollen <span class="points">${p.materials.rolle || 0}</span></span>` +
        `<span class="sk-item" title="Seelensteine (Gegenstand) · L1–V, nur aus Seelensteinen ab Stufe ${SKILL_MAT_DROP.seelenstein.stone}"><img src="${materialIconUrl('seelenstein')}" alt=""> Seelensteine <span class="points">${p.materials.seelenstein || 0}</span></span>` +
        `<span class="hint-text">1–15 mit Punkten · E1–E10 mit Fertigkeitsbüchern · H1–H10 mit Schriftrollen · L1–L10 und V mit Seelensteinen · je Stufe und Rangaufstieg einer</span></p>` +
        skillListHtml(classSkills(p), p) + ultHtml(ultimateOf(p), p),
      werte:
        `<h3>Kampf</h3><dl class="stats">` +
        row('Leben', s.maxHp) + row('Mana', s.maxMp) +
        row('Angriff', s.atk) + (s.wMax ? row('Waffenschaden', `${s.wMin}–${s.wMax}`) : '') + row('Verteidigung', s.def) +
        row('Kritische Treffer', pct(s.crit)) + row('Angriffstempo', pct(s.atkSpeed)) +
        row('Magiestärke', '+' + pct(s.magic || 0)) + row('Lauftempo', speedText(p, s)) +
        // seit 14.32 mit Obergrenze und dem Wert gegen Spieler (dort zählt die Hälfte, PVP_DMG.dodgeMul). Blocken wird nur
        // gewürfelt, wenn der Treffer nicht schon ausgewichen ist (damagePlayer)
        row('Blocken', pct(s.block) + (s.block > 0 ? ` <small class="cap">/ ${pct(MAX_BLOCK)} · PvP ${pct(s.block * PVP_DMG.dodgeMul)}</small>` : '')) +
        row('Ausweichen', pct(s.dodge) + ` <small class="cap">/ ${pct(DODGE_RULES.cap)} · PvP ${pct(s.dodge * PVP_DMG.dodgeMul)}</small>`) +
        `</dl><h3>Boni</h3><dl class="stats">` +
        row('Stark gegen Monster', capPct(s.monsterDmg, 'monsterDmg')) + row('Lebensraub', pct(s.hpSteal || 0)) +
        (s.natureDmg ? row(p.classId === 'magier' ? 'Elementschaden' : 'Naturschaden', '+' + pct(s.natureDmg)) : '') + (s.critDmg ? row('Kritischer Schaden', '+' + pct(s.critDmg)) : '') + (s.omniVamp ? row('Omni-Vampir', pct(s.omniVamp)) : '') +
        // seit 14.15: neue Boni als Summe aller Teile mit ihrer Obergrenze (nur, was die Ausrüstung hat)
        CHAR_NEW_BONI.filter(([k]) => s[k] > 0).map(([k, label]) => row(label, capPct(s[k], k))).join('') +
        `</dl><h3>Erfolge</h3><dl class="stats">` +
        row('Besiegte Monster', p.kills.toLocaleString('de-DE')) + row('Zerstörte Seelensteine', p.stones) +
        row('Tode', p.deaths) + row('Spielzeit', formatTime(p.playTime)) +
        `</dl>`
    };
    $('charBody').innerHTML =
      `<p class="char-head"><span><strong>${escapeHtml(p.name)}</strong> · ${c.name} · ${classPath(p.classId, p.path).name} · Stufe ${p.level}</span>` +
      `<button type="button" class="mini-btn" id="btnLook">✂ Aussehen ändern</button></p>` +
      `<nav class="char-tabs" role="tablist">` +
      tabs.map(([id, label, extra]) => `<button type="button" role="tab" data-ctab="${id}" class="${id === tab ? 'on' : ''}" aria-selected="${id === tab}">${label}${extra}</button>`).join('') +
      `</nav><div class="char-page" data-page="${tab}">${pages[tab]}</div>`;
    // Fertigkeiten (seit 13.2) breit in zwei Spalten statt lang nach unten
    $('panelChar').classList.toggle('char-wide', tab === 'skills' || tab === 'status');
    $('charBody').querySelectorAll('[data-ctab]').forEach((b) => {
      b.addEventListener('click', () => {
        this.charTab = b.dataset.ctab;
        this.renderCharPanel();
        $('charBody').scrollTop = 0;
      });
    });
    $('btnLook').addEventListener('click', () => this.openLookPanel());
    if ($('charDoll') && typeof drawDoll === 'function') drawDoll($('charDoll'));
    $('charBody').querySelectorAll('[data-upgrade]').forEach((b) => {
      // seit 14.32: Vorschau mit Bestätigen, auch ohne Punkte/Bücher (dann ist „Bestätigen“ gesperrt)
      if (typeof skillPreviewBind === 'function') skillPreviewBind(b, Number(b.dataset.upgrade), b.dataset.act);
      else b.addEventListener('click', () => { if (b.getAttribute('aria-disabled') !== 'true') upgradeSkill(Number(b.dataset.upgrade), b.dataset.act); });
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
      str: (a) => [`+${Math.round(a * ATTR_PT.str)} Angriff`],
      vit: (a) => [`+${a * 6} Leben`, `+${fmt(a * 0.3, 1)} Rüstung`],
      int: (a) => [`+${a * 5} Mana`, `+${fmt(a * ATTR_PT.int * 100, 1)} % Fertigkeitsschaden`],
      dex: (a) => [`+${fmt(a * ATTR_PT.crit * 100, 1)} % Kritisch`, `+${fmt(a * ATTR_PT.dodge * 100, 1)} % Ausweichen`, `+${fmt(a * ATTR_PT.speed * 100, 1)} % Tempo`]
    };
    // Hauptwert der Klasse: zuerst die Schadens- und Buff-Boni
    const base = effects[mainId];
    effects[mainId] = (a) => [`+${fmt(a * MAIN_SKILL * 100, 1)} % Fertigkeitsschaden`, `+${fmt(a * MAIN_BASIC * 100, 1)} % Angriffsschaden`, `+${fmt(a * MAIN_BUFF * 100, 1)} % Buff-Stärke`,
      ...base(a).filter((t) => !t.includes('Fertigkeitsschaden'))];
    const icons = {
      str: '<path d="M5 19l9-9"/><path class="f" d="M13 5l6 0 0 6-3.2-.6L9 17.2 6.8 15z"/><path d="M4 16l4 4"/>',
      vit: '<path class="f" d="M12 20s-7-4.3-8.9-8.7C1.7 8 3.6 4.5 7 4.5c1.9 0 3.3 1 5 2.8 1.7-1.8 3.1-2.8 5-2.8 3.4 0 5.3 3.5 3.9 6.8C19 15.7 12 20 12 20z"/><path d="M7 11h3l1.5-2.5L13 13l1.5-2H17"/>',
      int: '<path class="f" d="M12 2.5l5 6.5-5 12.5L7 9z"/><path d="M7 9h10M12 2.5V21.5"/>',
      dex: '<path class="f" d="M19.5 3.5c-6.5.5-11.5 5.5-13 13l2 2c7.5-1.5 12.5-6.5 13-13z"/><path d="M4 20l4.5-4.5M10 10l4 4"/>'
    };
    const pts = p.statPoints || 0;
    // Tipp für Einsteiger (seit 13.4): welcher Wert die Klasse stark macht
    const mainName = mainAttrName(p.classId);
    const tip = `<p class="attr-tip"><b>Tipp für ${CLASSES[p.classId].name}:</b> Steck deine Punkte vor allem in <b>${mainName}</b> – ` +
      `damit werden alle Fertigkeiten, normalen Angriffe und Buffs stärker. Etwas <b>Vitalität</b> gibt mehr Leben.</p>`;
    return tip + `<section class="attr-panel${pts ? ' has-points' : ''}">` +
      // seit 13.22: die eigene Figur mit Ausrüstung und Waffe in der Hand (Antippen dreht), darunter die Punkte
      `<div class="attr-side"><canvas id="charDoll" class="doll char-doll" title="Antippen zum Drehen"></canvas>` +
      `<div class="attr-orb"><b>${pts}</b><small>Statuspunkte</small></div></div>` +
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
    // seit 13.63: Auktionshaus und Post haben eigene Fenster (auktionshaus.js, post.js)
    if (npc.id === 'auktion') { ahOpen(); return; }
    if (npc.id === 'post') { postOpen(); return; }
    const p = game.player;
    $('npcTitle').textContent = npc.name;
    gear.sellArmedIndex = null;
    $('npcTitle').textContent = npc.name || 'Dorfbewohner';
    if (npc.id === 'haendler') this.renderShop();
    else if (npc.id === 'schmied') gear.openSmith($('npcBody'));
    else if (npc.id === 'waffen' || npc.id === 'ruestung' || npc.id === 'bogenmacher') gear.openMerchant(npc.id, $('npcBody'));
    else if (npc.id === 'aeltester') this.renderElder(npc);
    else if (npc.id === 'jaegerin') this.renderHunter();
    else if (npc.id === 'teleport') this.renderTravel();
    else if (npc.id === 'alchemist') this.renderAlchemist();
    else if (npc.id === 'stallmeister') this.renderStable();
    else if (npc.id === 'lehrmeister') { this.teacherPath = null; this.renderTeacher(); }
    else if (npc.id === 'lager') {
      this.stPage = 0;
      this.renderStorage();
    }
    else if (npc.id === 'wanderer') this.renderWanderer(npc);
    else if (npc.id === 'nachtwanderer') this.renderNightWanderer(npc);
    else if (npc.id === 'eingang' || npc.id === 'ausgang' || npc.id === 'riss') this.renderDungeon(npc);
    else if (npc.id === 'weltentor') this.renderWorldGate(npc);
    else this.renderTalk(npc);
    this.renderNpcQuests(npc);
    $('panelNpc').hidden = false;
  },

  // Lager (seit 9.1): einmal 1.000 Gold Zugang je Charakter. Seit 13.63 gehört der Inhalt dem ganzen Konto
  // (ohne Konto allen Charakteren des Geräts) – Fenster und Ablauf in kontolager.js.
  renderStorage(msg) {
    klRender(msg);
  },

  // Lehrmeister (seit 8.7): Fertigkeitsbücher kaufen, Status- und Fertigkeitspunkte zurücksetzen.
  // Seit 14.1 verkauft er nur Bücher (E1–E10); Schriftrollen und Seelensteine gibt es nur aus Seelensteinen.
  renderTeacher(msg) {
    const p = game.player;
    const c = CLASSES[p.classId];
    const fmt = (n) => n.toLocaleString('de-DE');
    const skills = classSkills(p);
    const statSpent = statPointsSpent(p);
    const skillBack = skillPointsBack(p);
    // seit 14.1: jede Sorte ein eigener Textteil (so lassen sich die Teile einzeln übersetzen)
    const itemsHtml = (n) => ['book', 'rolle', 'seelenstein'].filter((k) => n[k] > 0)
      .map((k) => `<span class="nowrap">${n[k]} ${n[k] === 1 ? SKILL_ITEMS[k].name : SKILL_ITEMS[k].many}</span>`).join(', ');
    const itemsBack = itemsHtml(skillItemsBack(p.skillLevels));
    const stCost = resetCost(p, 'stat');
    const skCost = resetCost(p, 'skill');
    const cur = p.path || 0;
    if (this.teacherPath == null || !c.paths[this.teacherPath]) this.teacherPath = cur;
    const pick = this.teacherPath;
    const way = c.paths.length === 4 ? 'Element' : 'Weg';
    const pickName = c.paths.length === 4 ? MAGE_EL[c.paths[pick].id].name : c.paths[pick].name;
    // Magier (seit 13.63 nur hier): die Fertigkeitsstufen bleiben beim Elementwechsel, siehe changeMageElement
    const mage = p.classId === 'magier';
    $('npcBody').innerHTML =
      `<p>„Wissen hat seinen Preis. Ich verkaufe Fertigkeitsbücher zu deinen Fertigkeiten, helfe dir, deine Punkte neu zu verteilen, und zeige dir einen neuen Weg. Schriftrollen und Seelensteine habe ich nicht – die musst du den Seelensteinen draußen abringen.“</p>` +
      `<p>Dein Gold: <span class="price">${fmt(p.gold)}</span></p>` +
      (msg ? `<p class="${msg.ok ? 'gear-msg success' : 'form-error'}">${msg.text}</p>` : '') +
      `<h3>Fertigkeitsbücher <span class="price">je ${fmt(TEACHER.bookPrice)} Gold</span></h3>` +
      `<p class="hint">Ein Fertigkeitsbuch hebt eine erweckte Fertigkeit um eine Stufe (E1–E10). Für Heroisch (H1–H10) brauchst du Schriftrollen aus Seelensteinen ab Stufe ${SKILL_MAT_DROP.rolle.stone}, ` +
      `für Legendär und Vollendet (L1–V) Seelensteine als Gegenstand aus Seelensteinen ab Stufe ${SKILL_MAT_DROP.seelenstein.stone} – je Stufe und je Rangaufstieg einen.</p><div class="shop">` +
      skills.map((sk) => `<div class="shop-item"><img class="shop-icon" src="${bookIconUrl(sk.id)}" alt="">` +
        `<strong>${sk.name}</strong><small>Fertigkeitsbuch · im Gepäck: <b>${bookCount(p, sk.id)}</b></small>` +
        `<div class="buy"><button class="mini-btn" type="button" data-book="${sk.id}" ${p.gold < TEACHER.bookPrice ? 'disabled' : ''}>Kaufen</button></div></div>`).join('') +
      `</div><h3>Punkte zurücksetzen</h3><div class="shop">` +
      `<div class="shop-item"><strong>Statuspunkte <span class="price">${fmt(stCost)} Gold</span></strong>` +
      `<small>Alle ${statSpent} verteilten Statuspunkte kommen zurück und lassen sich neu verteilen.</small>` +
      `<div class="buy"><button class="mini-btn" type="button" data-reset="stat" ${!statSpent || p.gold < stCost ? 'disabled' : ''}>Zurücksetzen</button></div></div>` +
      `<div class="shop-item"><strong>Fertigkeitspunkte <span class="price">${fmt(skCost)} Gold</span></strong>` +
      `<small>Alle Fertigkeiten gehen auf Stufe 1 zurück, auch erweckte (E/H/L/V). Du bekommst alle ${p.level - 1} Fertigkeitspunkte zurück.` +
      `${itemsBack ? `<br><span>Dazu zurück:</span> ${itemsBack}` : ''}</small>` +
      `<div class="buy"><button class="mini-btn" type="button" data-reset="skill" ${!canResetSkills(p) || p.gold < skCost ? 'disabled' : ''}>Zurücksetzen</button></div></div>` +
      `</div><h3>${way} wechseln <span class="price">${fmt(skCost)} Gold</span></h3>` +
      (mage
        ? `<p class="hint">Wähle Feuer, Frost, Blitz oder Erde. Deine Fertigkeitsstufen bleiben beim Wechsel erhalten (auch E/H/L/V), die Buffs deines alten Elements enden. ` +
          `Fertigkeitsbücher in der Tasche werden zu Büchern derselben Plätze im neuen Element. Schriftrollen und Seelensteine gelten ohnehin für jede Fertigkeit.</p>`
        : `<p class="hint">Dein jetziger ${way} bleibt mit allen Stufen gespeichert (auch E/H/L/V) – wechselst du zurück, ist alles wieder da. ` +
          `Ein ${way}, den du schon gespielt hast, kommt genau so zurück; ein neuer beginnt auf Stufe 1 mit allen freien Punkten. ` +
          `Fertigkeitsbücher in der Tasche werden zu Büchern derselben Plätze im neuen ${way}. Was du im neuen ${way} nicht tragen kannst, kommt in die Tasche.</p>`) +
      pathChoiceHtml(c, pick) +
      `<div class="shop"><div class="shop-item path-switch"><strong>${pick === cur ? (mage ? 'Dein jetziges Element' : `Dein jetziger ${way}`) : `${way}: ${pickName}`}</strong>` +
      `<div class="buy"><button class="mini-btn" type="button" data-reset="path" ${pick === cur || p.gold < skCost ? 'disabled' : ''}>${pick === cur ? 'Gewählt' : 'Wechseln'}</button></div></div></div>` +
      `<p class="hint">Das erste Zurücksetzen kostet ${fmt(TEACHER.resetBase)} Gold, jedes weitere das Doppelte (Status und Fertigkeiten getrennt, der Wegwechsel zählt zu den Fertigkeiten).</p>`;
    const body = $('npcBody');
    drawPathSigils(body);
    body.querySelectorAll('[data-path]').forEach((b) => b.addEventListener('click', () => {
      this.teacherPath = Number(b.dataset.path);
      const y = body.scrollTop;
      this.renderTeacher(msg);
      body.scrollTop = y;
    }));
    body.querySelectorAll('[data-book]').forEach((b) => b.addEventListener('click', () => {
      const sk = skills.find((s) => s.id === b.dataset.book);
      const r = buyBook(sk.id);
      if (r === 'ok') {
        saveGame();
        this.renderTeacher({ ok: true, text: `Fertigkeitsbuch „${sk.name}“ gekauft.` });
      } else this.renderTeacher({ ok: false, text: r === 'bag' ? 'Deine Tasche ist voll.' : 'Dafür reicht dein Gold nicht.' });
    }));
    body.querySelectorAll('[data-reset]').forEach((b) => b.addEventListener('click', () => {
      const kind = b.dataset.reset;
      const what = kind === 'stat' ? 'Statuspunkte' : 'Fertigkeitspunkte';
      body.querySelector('.buy-confirm')?.remove();
      const ask = document.createElement('div');
      ask.className = 'buy-confirm';
      ask.innerHTML = (kind === 'path' && mage
        ? `<p><b>${pickName}</b>: für ${fmt(skCost)} Gold wechseln? Deine Fertigkeitsstufen bleiben erhalten.</p>`
        : kind === 'path'
          ? `<p>Für ${fmt(skCost)} Gold zu ${pickName} wechseln? ${p.pathSkills && p.pathSkills[pick] ? 'Deine früheren Stufen dort kommen zurück.' : 'Dort beginnen die Fertigkeiten auf Stufe 1.'} Dein jetziger ${way} bleibt gespeichert.</p>`
          : `<p>${what} für ${fmt(resetCost(p, kind === 'stat' ? 'stat' : 'skill'))} Gold zurücksetzen?</p>`) +
        `<button class="mini-btn" type="button" data-yes>Ja</button> <button class="mini-btn" type="button" data-no>Nein</button>`;
      b.closest('.shop-item').appendChild(ask);
      ask.querySelector('[data-no]').addEventListener('click', () => ask.remove());
      ask.querySelector('[data-yes]').addEventListener('click', () => {
        const res = kind === 'stat' ? resetStats() : kind === 'path' && mage ? changeMageElement(pick) : resetSkills(kind === 'path' ? pick : cur);
        if (!res) {
          this.renderTeacher({ ok: false, text: 'Dafür reicht dein Gold nicht.' });
          return;
        }
        let text = `${what} zurückgesetzt. Verteile sie im Charakterfenster neu.`;
        if (kind !== 'stat') {
          this.buildSkillBar();
          drawPortrait($('hudPortrait'), p);
          const back = res.items ? itemsHtml(res.items) : '';
          const extra = (back ? ` <span>Zurück in Tasche und Aufwertungsteilen:</span> ${back}.` : '') +
            (res.moved ? ` ${res.moved === 1 ? 'Ein Teil' : res.moved + ' Teile'} deiner Ausrüstung ${res.moved === 1 ? 'liegt' : 'liegen'} jetzt in der Tasche.` : '');
          text = kind === 'path' && mage
            ? `<b>${pickName}</b> ist jetzt dein Element – deine Fertigkeiten ${res.restored ? 'haben wieder ihre früheren Stufen aus diesem Element.' : 'behalten ihre Stufen.'}` + extra
            : kind === 'path'
            ? (res.restored
              ? `Du folgst wieder dem ${c.paths[pick].name} – deine Fertigkeiten haben ihre alten Stufen.${p.skillPoints ? ` ${p.skillPoints} freie Fertigkeitspunkte warten im Charakterfenster.` : ''}`
              : `Du folgst jetzt dem ${c.paths[pick].name}. Verteile deine ${p.level - 1} Fertigkeitspunkte im Charakterfenster.`) + ' Dein alter Weg bleibt gespeichert.' + extra
            : `Alle Fertigkeiten sind wieder auf Stufe 1. Du hast ${p.level - 1} Fertigkeitspunkte zum Verteilen.` + extra;
          if (kind === 'path') this.log(`Du folgst jetzt dem ${c.paths[pick].name}.`, 'level');
        }
        saveGame();
        this.renderTeacher({ ok: true, text });
      });
    }));
  },

  renderShop() {
    const p = game.player;
    $('npcBody').innerHTML =
      `<p>„Tränke für unterwegs. Waffen gibt es bei Goro, Rüstungen bei Mei. Segensschriftrollen? Die geben nur noch die Seelensteine ab Stufe 35 her.“</p>` +
      `<p>Dein Gold: <span class="price" id="shopGold">${p.gold.toLocaleString('de-DE')}</span></p>` +
      `<h3>Tränke</h3><div class="shop">` +
      SHOP.map((item) => POTION_SIZES.map((sz) => {
        const key = potKey(item.id, sz.id);
        const price = item.price * sz.price;
        const low = p.level < sz.level;
        const amt = item.id === 'hp' ? sz.hp : sz.mp;
        return `<div class="shop-item${low ? ' locked' : ''}"><img class="shop-icon potion-icon" src="${potionIconUrl(item.id, sz.id)}" alt="">` +
          `<strong>${item.name} ${sz.id} <span class="price">${price.toLocaleString('de-DE')} Gold</span></strong>` +
          `<small>${item.kind} (${sz.name}): +${amt.toLocaleString('de-DE')} ${item.id === 'hp' ? 'Leben' : 'Mana'}${low ? ` · ab Stufe ${sz.level}` : ''}. Im Gepäck: <b id="have-${key}">${p.potions[key] || 0}</b></small>` +
          `<div class="buy"><button class="mini-btn" type="button" data-buy="${key}" data-n="1" ${low ? 'disabled' : ''}>1 kaufen</button>` +
          `<button class="mini-btn" type="button" data-buy="${key}" data-n="10" ${low ? 'disabled' : ''}>10 kaufen</button>` +
          // seit 13.64: Tränke direkt hier zurückverkaufen (vorher nur über das Inventar)
          ((p.potions[key] || 0) > 0
            ? `<button class="mini-btn btn-sell" type="button" data-psell="${key}" data-n="1">1 verkaufen · ${potionSellValue(item.id, sz).toLocaleString('de-DE')}</button>` +
              ((p.potions[key] || 0) > 1 ? `<button class="mini-btn btn-sell" type="button" data-psell="${key}" data-n="${p.potions[key]}">Alle verkaufen · ${(potionSellValue(item.id, sz) * p.potions[key]).toLocaleString('de-DE')}</button>` : '')
            : '') +
          `</div></div>`;
      }).join('')).join('') +
      `</div><p id="shopMsg" class="form-error" hidden></p>` + gear.sellSectionHtml();
    gear.wireSell($('npcBody'), () => this.renderShop());
    $('npcBody').querySelectorAll('[data-buy]').forEach((b) => {
      b.addEventListener('click', () => this.buy(b.dataset.buy, Number(b.dataset.n)));
    });
    $('npcBody').querySelectorAll('[data-psell]').forEach((b) => {
      b.addEventListener('click', () => {
        const key = b.dataset.psell;
        const kind = key.slice(0, 2);
        const sz = POTION_SIZES.find((x) => potKey(kind, x.id) === key);
        // seit 14.32: „Alle verkaufen“ erst nach einem zweiten Druck (armConfirm, ausruestung.js)
        if (Number(b.dataset.n) > 1 && typeof armConfirm === 'function' && !armConfirm(b)) return;
        const n = sellPotions(key, Number(b.dataset.n));
        this.renderShop();
        if (n && sz) this.shopMessage(`${n} × ${potionInfo(kind).name} ${sz.id} für ${(n * potionSellValue(kind, sz)).toLocaleString('de-DE')} Gold verkauft.`, true);
      });
    });
  },

  shopMessage(text, ok) {
    const msg = $('shopMsg');
    msg.textContent = text;
    msg.className = ok ? 'gear-msg success' : 'form-error';
    msg.hidden = false;
  },

  // key: hp, hpM, hpXL, hpXXL bzw. mp… (seit 14.32 ohne L)
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

  showDeath(lostXp) {
    this.closePanels();
    $('deathText').textContent = 'Starte hier neu, um gleich weiterzukämpfen, oder sicher in der Stadt ohne Verlust.';
    $('reviveHereCost').textContent = lostXp > 0 ? `−${lostXp.toLocaleString('de-DE')} EP · halbes Leben` : 'halbes Leben';
    $('panelDeath').hidden = false;
    // seit 13.70: „Hier neu starten“ erst nach 5 Sekunden (Countdown auf dem Knopf), die Stadt geht sofort
    const btn = $('btnReviveHere');
    btn.hidden = false;
    const label = [...btn.childNodes].find((n) => n.nodeType === 3);
    const until = performance.now() + REVIVE_HERE_DELAY * 1000;
    clearInterval(this.reviveTimer);
    const tick = () => {
      const left = Math.ceil((until - performance.now()) / 1000);
      if (left > 0 && !$('panelDeath').hidden) {
        btn.disabled = true;
        if (label) label.textContent = `Hier neu starten (${left})`;
        return;
      }
      clearInterval(this.reviveTimer);
      btn.disabled = false;
      if (label) label.textContent = 'Hier neu starten';
    };
    tick();
    this.reviveTimer = setInterval(tick, 200);
  }
};
// Wartezeit (Sekunden), bis man nach einem Tod an Ort und Stelle neu starten kann (seit 13.70)
const REVIVE_HERE_DELAY = 5;

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

// Elementwechsel des Magiers (seit 8.6; seit 13.63 nur noch beim Lehrmeister, wie der Wegwechsel der anderen Klassen).
// Er kostet dasselbe wie dort (ein Fertigkeiten-Zurücksetzen: 10.000 Gold, jedes weitere das Doppelte). Wie beim
// früheren Wechsel im Menü liegen die Fertigkeitsstufen des Magiers je Platz und bleiben erhalten (auch E/H/L/V);
// Fertigkeitsbücher des alten Elements in der Tasche werden wie bei den anderen Klassen zu Büchern derselben Plätze.
// Hat das neue Element noch eigene, gespeicherte Stufen aus einem früheren Wechsel beim Lehrmeister (bis 13.62 lief der
// dort wie bei den anderen Klassen) und stecken darin mehr Punkte und Gegenstände, kommen diese zurück und die jetzigen
// werden für das alte Element gemerkt – so geht nichts verloren.
function mageSkillWorth(levels) {
  // seit 14.1: Bücher, Schriftrollen und Seelensteine zählen zusammen
  const n = skillItemsBack(levels);
  return skillPointsSpent(levels) + n.book + n.rolle + n.seelenstein;
}
function changeMageElement(n) {
  const p = game.player;
  const c = CLASSES.magier;
  const old = p.path || 0;
  if (p.classId !== 'magier' || p.dead || n === old || !c.paths[n] || !MAGE_PATH_EL[n]) return false;
  if (!payReset(p, 'skill')) return false;
  // Buffs, Diener und Strahl der Klasse enden (wie beim Wegwechsel); Abklingzeiten bleiben je Platz
  endSkillEffects(p);
  c.paths[old].skills.forEach((sk, i) => {
    const k = bookCount(p, sk.id);
    if (k) { takeBooks(p, sk.id, k); giveBooks(p, c.paths[n].skills[i].id, k); }
  });
  let restored = false;
  const st = p.pathSkills && p.pathSkills[n];
  if (st && Array.isArray(st.levels) && st.levels.length === 5 && mageSkillWorth(st.levels) > mageSkillWorth(p.skillLevels)) {
    p.pathSkills[old] = { levels: p.skillLevels.slice(), spent: skillPointsSpent(p.skillLevels) };
    p.skillLevels = st.levels.slice();
    p.skillPoints = Math.max(0, p.level - 1 - (st.spent || 0));
    clampSkillPoints(p);
    delete p.pathSkills[n];
    restored = true;
  }
  // Die Mitspieler sehen das neue Element mit dem nächsten Zustand (pt)
  p.path = n;
  const moved = enforceGearRules(p);
  game.stats = playerStats(p);
  p.hp = Math.min(p.hp, game.stats.maxHp);
  p.mp = Math.min(p.mp, game.stats.maxMp);
  return { books: 0, moved: moved.length, changed: true, restored };
}

// Werte einer Fertigkeit auf einer Stufe, z. B. [['Angriff', '+29,6 %'], ['Dauer', '238 s']]
const SKILL_EFFECT_LABELS = {
  atk: 'Angriff', atkFlat: 'Angriff', crit: 'Krit', atkSpeed: 'Angriffstempo', speed: 'Lauftempo', damageTaken: 'Erlittener Schaden',
  def: 'Verteidigung', dodge: 'Ausweichen', skillDmg: 'Fertigkeitsschaden', regen: 'Leben je s', reflect: 'Rückwurf', hpSteal: 'Lebensraub',
  chill: 'Kälte für Angreifer', critDmg: 'Kritischer Schaden', defFlat: 'Rüstung', chillDur: 'Kälte hält'
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
    (horse ? ` · <span class="${p.riding ? 'on' : ''}">${horse.fly ? 'Drache' : 'Pferd'} +${Math.round(horse.speed * 100)} %</span>` : '') + '</small>';
}
// Schaden und Leben als feste Zahlen (seit 13.6) statt Prozent: aus den aktuellen Werten der Figur, also
// Angriff mit Waffe (+ Stufe), Ausrüstungsboni, Statuspunkten und laufenden Buffs × Faktor der Fertigkeit ×
// Fertigkeitsschaden. Gezeigt wird ein normaler Treffer gegen Monster vor deren Verteidigung
// (im Kampf ±10 % Zufall, kritisch mehr). Ohne Figur (Startbildschirm) steht der Faktor da, z. B. „1,5× Angriff“.
function skillStatsBase() {
  const p = game.player;
  if (!p || !CLASSES[p.classId]) return null;
  return game.stats || playerStats(p);
}
const numText = (n) => Math.max(0, Math.round(n)).toLocaleString('de-DE');
// ein Treffer mit Faktor f (wächst mit der Fertigkeitsstufe)
function skillHitNum(f, lvl, s = skillStatsBase()) {
  if (!s) return numDe(f * dmgScale(lvl)) + '× Angriff';
  return numText(s.atk * f * dmgScale(lvl) * (s.skillDmg || 1) * (1 + (s.monsterDmg || 0)) * (1 + (s.natureDmg || 0)));
}
// Schaden über Zeit (Brand, Blutung): Angriff × Anteil je Sekunde × Fertigkeitsschaden (seit 13.87 wie hitMonster: dotK)
function skillDotNum(dps, s = skillStatsBase()) {
  return s ? numText(s.atk * dps * (s.skillDmg || 1)) : numDe(dps) + '× Angriff';
}
// Leben aus einem Anteil des höchsten Lebens (Heilung, Schild, Regeneration, Diener)
function skillHpNum(f, s = skillStatsBase()) {
  return s ? numText(s.maxHp * f) : skillPct(f);
}
// Werte ohne den eigenen Buff (damit „+Angriff“ nicht sich selbst mitzählt)
function statsWithoutBuff(sk) {
  const p = game.player;
  if (!p || !CLASSES[p.classId]) return null;
  return playerStats({ ...p, buffs: (p.buffs || []).filter((b) => b.id !== sk.id) });
}

function skillStats(sk, lvl) {
  const out = [];
  const scale = buffScale(lvl);
  const hit = (f) => skillHitNum(f, lvl);
  // Pulse statt Einzelschaden: Blizzard (msnow) und seit 13.76 der Pfeilregen (bregen, Werte in bowSkillStats)
  // seit 13.87: Treffer je Wirken auch beim Blizzard des Schamanen (sk.ticks, blizzardFx)
  const hits = sk.hits > 1 ? sk.hits : sk.type === 'blizzard' ? sk.ticks || 8 : 0;
  if (sk.dmg && sk.type !== 'skulls' && sk.type !== 'cage' && sk.type !== 'sigil' && sk.type !== 'msnow' && sk.type !== 'bregen') out.push(['Schaden', hit(sk.dmg) + (hits > 1 ? ' ×' + hits : '')]);
  // seit 13.87: Sichelwelle – die Klingenwelle trifft mit waveDmg (waveFx), stärker als der Querhieb davor
  if (sk.waveDmg) out.push(['Welle', hit(sk.waveDmg)]);
  // seit 13.87: Tarnung und Hinterhalt mit ihren Faktoren (nextHitMul, ambushMul in kampf.js)
  if (sk.nextHitMul) out.push(['Nächster Angriff', '×' + numDe(sk.nextHitMul) + ', sicher kritisch']);
  if (sk.ambushMul) {
    const tarn = typeof skillById === 'function' && skillById('tarnung');
    out.push(['Aus der Tarnung', '×' + numDe(sk.ambushMul) + (tarn && tarn.nextHitMul ? ' (mit Tarnung ×' + numDe(sk.ambushMul * tarn.nextHitMul) + ')' : '')]);
  }
  // seit 13.87: Schattenkette – Sprünge je Rang (chainHops, ninja-fx.js), weitere Schnitte am selben Gegner × repeatMul
  if (sk.type === 'chainblink') {
    const n = typeof chainHops === 'function' ? chainHops(sk, skillRank(lvl)) : sk.hops;
    out.push(['Sprünge', String(n)], ['Erneut am selben Gegner', '×' + numDe(sk.repeatMul)], ['Taumeln', numDe(sk.stun) + ' s']);
  }
  // seit 13.87: Totenruf – Geister je Rang (sk.counts, nekro-totenruf.js)
  if (sk.type === 'revive') out.push(['Geister', 'bis ' + sk.counts[Math.min(sk.counts.length - 1, skillRank(lvl) + 1)]]);
  // seit 14.32: Leben und Schlag der Geister wachsen mit der Stufe (spawnGhostAlly: buffScale, allyAtk: dmgScale) –
  // für ein Monster mittlerer Größe; große Monster werden zu stärkeren Geistern
  if (sk.type === 'revive' && sk.hp) out.push(['Leben je Geist', skillHpNum(sk.hp * scale)], ['Schlag', hit(sk.atk)]);
  // Nekromant, Weg der Seelen (seit 8.5): Schädelsalve, Seelenkäfig, Mal des Seelenschnitters
  if (sk.type === 'skulls') out.push(['Schaden', sk.count + ' × ' + hit(sk.dmg)]);
  if (sk.type === 'cage') out.push(['Schrei', hit(sk.dmg) + ' ×' + sk.pulses], ['Verlangsamt', skillPct(sk.slow.amount)]);
  if (sk.mark) out.push(['Mal', 'Ziel nimmt +' + skillPct(sk.mark.vulnerable * scale) + ' Schaden (' + sk.mark.duration + ' s)']);
  // seit 13.87 mit der Heilkraft (Segen des Lichts) wie SKILL_TYPES.heal
  if (sk.type === 'heal') { const hs = skillStatsBase(); out.push(['Heilung', '+' + skillHpNum(sk.amount * scale * ((hs && hs.healPower) || 1)) + ' Leben']); }
  if (sk.shield) out.push(['Schild', skillHpNum(sk.shield * scale) + ' Leben']);
  if (sk.type === 'summon') {
    // Diener nach Rang (seit 8.5): Skelettkrieger, ab E1 Knochenhunde, seit 13.94 ab H Knochendrachen, ab V Seelenkolosse
    const ti = Math.min(sk.tiers.length - 1, skillRank(lvl) + 1);
    const T = sk.tiers[ti];
    out.push([T.name + ' ×' + sk.count, skillHpNum(T.hp * scale) + ' Leben']);
    // seit 13.94: Drachen (Feuerball, Feueratem) und Kolosse (Faustschlag, Bodenstampfer)
    const atkName = T.kind === 'hund' ? 'Biss' : T.kind === 'drache' ? 'Feuerball' : T.kind === 'koloss' ? 'Faustschlag' : 'Hieb';
    out.push([atkName, hit(T.atk) + ' je ' + String(T.every).replace('.', ',') + ' s']);
    if (T.breath) out.push(['Feueratem', hit(T.atk * T.breath.mul) + ' im Kegel (jeder ' + T.breath.every + '. Angriff)']);
    if (T.splash) out.push(['Splitter', hit(T.atk * T.splash.mul) + ' neben dem Ziel']);
    if (T.stomp) out.push(['Bodenstampfer', hit(T.atk * T.stomp.mul) + ' rundum (jeder ' + T.stomp.every + '. Schlag)']);
    const extra = [T.pounce && 'Ansprung', T.range && 'fliegt, Fernkampf', T.slow && 'verlangsamt ' + Math.round(T.slow * 100) + ' %', T.burst && 'Seelenfeuer ' + T.burst.toFixed(1).replace('.', ',') + '×', T.alpha && 'Alpha'].filter(Boolean);
    if (extra.length) out.push(['Rang', extra.join(', ')]);
  }
  if (sk.vulnerable) out.push(['Verwundbar', 'Ziel nimmt +' + skillPct(sk.vulnerable * scale) + ' Schaden']);
  if (sk.type === 'curse' && sk.slow) out.push(['Verlangsamt', skillPct(sk.slow)]);
  if (sk.type === 'blast' && sk.stun) out.push(['Betäubung', numDe(sk.stun) + ' s'], ['Umkreis', String(sk.radius)]);
  if (sk.el && sk.type !== 'buff') mageSkillStats(sk, lvl, out);
  if (sk.nk) nekroSkillStats(sk, lvl, out);
  // Weg des Falken (seit 13.57, fernninja.js)
  if (typeof bowSkillStats === 'function') bowSkillStats(sk, lvl, out);
  const base = sk.effects && (sk.effects.atk || sk.effects.def || sk.effects.regen) ? statsWithoutBuff(sk) : null;
  for (const [k, v] of Object.entries(sk.effects || {})) {
    const label = (sk.labels && sk.labels[k]) || SKILL_EFFECT_LABELS[k];
    if (typeof v !== 'number' || !label) continue;
    // Kälte für Angreifer und feste Rüstung (allgemein; der Frostpanzer ist seit 13.64 entfernt)
    if (k === 'chill') { out.push([label, '−' + skillPct(v) + ' Tempo']); continue; }
    if (k === 'chillDur') { out.push([label, numDe(v) + ' s']); continue; }
    if (k === 'defFlat') { out.push([label, '+' + Math.round(v)]); continue; }
    // fester Angriffswert (Aura des Schwertes, seit 13.4)
    if (k === 'atkFlat') { out.push([label, '+' + (sk.id === 'schwertaura' && typeof auraFlat === 'function' ? auraFlat(lvl) : Math.round(v * scale))]); continue; }
    // seit 13.6 als Zahl: Angriff und Verteidigung aus den Werten ohne diesen Buff, Regeneration in Leben je Sekunde
    // feste Kurve (Segen, seit 13.26); seit 13.85 auch für Angriff und Rüstung
    const fixed = typeof SKILL_FIXED_EFFECTS !== 'undefined' && SKILL_FIXED_EFFECTS[sk.id] && SKILL_FIXED_EFFECTS[sk.id][k];
    if (base && (k === 'atk' || k === 'def')) { out.push([label, '+' + numText(base[k] * (fixed ? fixed(lvl) : v * scale))]); continue; }
    // Regeneration × Heilkraft (playerStats: s.regen *= s.healPower, seit 13.87 auch hier)
    if (base && k === 'regen') { out.push([label, '+' + skillHpNum(v * scale * (base.healPower || 1), base)]); continue; }
    if (fixed) { const fv = fixed(lvl); out.push([label, (fv < 0 ? '−' : '+') + skillPct(Math.abs(fv))]); continue; }
    // Lauftempo wächst seit 8.5 nicht mehr mit der Stufe
    out.push([label, (v < 0 ? '−' : '+') + skillPct(Math.abs(k === 'speed' || k === 'chill' ? v : v * scale))]);
  }
  // seit 13.87: Blizzard des Schamanen (blizzardFx) und Totenruf (Geister) halten fest sk.duration, nur Buffs, Flüche,
  // Heilung und Diener wachsen mit der Stufe (skillDuration)
  if (sk.duration) out.push(['Dauer', (sk.type === 'blizzard' || sk.type === 'revive' ? numDe(sk.duration) : skillDuration(sk, lvl)) + ' s']);
  return out;
}

// Nekromant (seit 11.7): Blutsauger, Geisterflut, Weg der Knochen
function nekroSkillStats(sk, lvl, out) {
  const dmg = (v) => skillHitNum(v, lvl);
  const s = skillStatsBase();
  // Heilung aus dem Schaden eines Treffers (ohne Figur als Anteil)
  const leech = (f, part) => (s ? '+' + skillHitNum(f * part, lvl) + ' Leben' : skillPct(part) + ' des Schadens');
  if (sk.type === 'siphon') out.push(['Treffer', '5 je Sekunde, bis ' + numDe(sk.maxDur) + ' s'], ['Lebensraub', leech(sk.dmg, sk.leech) + ' je Treffer']);
  if (sk.type === 'ghostflood') out.push(['Geister', sk.ghosts + ' × ' + dmg(sk.dmg)], ['Seelenwelle', dmg(sk.burst.dmg) + ', verlangsamt ' + skillPct(sk.burst.slow.amount)], ['Umkreis', String(sk.radius)]);
  if (sk.type === 'lifetap') out.push(['Heilung', leech(sk.dmg, sk.heal)]);
  if (sk.type === 'bonethrow') out.push(['Verlangsamt', skillPct(sk.slow.amount) + ' (' + numDe(sk.slow.duration) + ' s)']);
  if (sk.type === 'larva') out.push(['Umkreis', String(sk.radius)], ['Blutung', skillDotNum(sk.bleed.dps * sk.bleed.duration) + ' in ' + sk.bleed.duration + ' s']);
  if (sk.type === 'gravehand') out.push(['Festhalten', numDe(sk.hold) + ' s'], ['Zerdrücken', dmg(sk.crush)]);
  if (sk.type === 'bloodlances') out.push(['Lanzen', sk.count + ' × ' + dmg(sk.dmg)], ['Lebensraub', leech(sk.dmg, sk.leech) + ' je Lanze']);
}

// Magier (seit 8.6): Nova, Element-Geschoss, Elementsprung und Siegel
function mageSkillStats(sk, lvl, out) {
  const dmg = (v) => skillHitNum(v, lvl);
  // Zusatzschaden auf den Grundtreffer (Zerspringen, Entladung, Auflodern)
  const extra = (part) => '+' + dmg(sk.dmg * part);
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
  // seit 11.5: neue Feuer- und Blitzzauber
  if (sk.type === 'mbreath') out.push(['Kegel', `${sk.range} weit · ${sk.angle}°`]);
  if (sk.type === 'mtornado') {
    const n = typeof tornadoCount === 'function' ? tornadoCount(lvl) : 2;
    out.push(['Tornados', `${n} × ${dmg(sk.dmg)} je Treffer`], ['Dauer', numDe(sk.life) + ' s'], ['Feld', 'r ' + sk.radius]);
  }
  if (sk.type === 'mfield') out.push(['Pulse', `${sk.ticks} × ${dmg(sk.dmg)}`], ['Feld', 'r ' + sk.radius], ['Reichweite', String(sk.range)]);
  // seit 13.54: Blizzard (schneesturm.js) – Pulse je nach Rang, Verlangsamung wächst, zum Schluss Einfrieren
  if (sk.type === 'msnow') {
    const n = typeof snowTicks === 'function' ? snowTicks(sk, lvl) : sk.ticks;
    out.push(['Pulse', `${n} × ${dmg(sk.dmg)}`], ['Dauer', numDe(n * sk.every) + ' s'], ['Feld', 'r ' + sk.radius], ['Reichweite', String(sk.range)],
      ['Verlangsamt', `${skillPct(sk.slow.amount)} bis ${skillPct(sk.slow.max)}`], ['Zum Schluss', 'Einfrieren ' + freeze(sk.freeze)]);
  }
  if (sk.castTime) out.push(['Zauberzeit', numDe(sk.castTime) + ' s']);
  // seit 13.87 wie SKILL_TYPES.mignite: der Brand wächst mit der Fertigkeit (× Kraft der Fertigkeit, dazu wie jeder
  // Schaden über Zeit × Fertigkeitsschaden), ohne Verteidigung, Monster- und Elementschaden
  if (sk.type === 'mignite') { const ms = skillStatsBase(); out.push(['Brand gesamt', skillDotNum(sk.burn.dps * sk.burn.duration * dmgScale(lvl) * ((ms && ms.skillDmg) || 1)) + ' in ' + sk.burn.duration + ' s']); }
  if (sk.type === 'mphoenix') out.push(['Auf dem Weg', dmg(sk.dmg * sk.pathMul)], ['Explosion', `r ${sk.blast.r} · ${dmg(sk.dmg * sk.blast.mul)}`], ['Brennt das Ziel', extra(sk.combust)]);
  if (sk.type === 'mspear') out.push(['Linie', String(sk.range)], ['Aufgeladen', sk.charge + ' s']);
  if (sk.type === 'mstorm') out.push(['Blitze', `${sk.strikes} × ${dmg(sk.dmg)}`], ['Entladung', `${dmg(sk.final.dmg)} · alle im Feld`], ['Lähmt', numDe(sk.final.stun) + ' s'], ['Feld', String(sk.radius)], ['Reichweite', String(sk.range)]);
  if (sk.trail) out.push(['Blitzspur', `${sk.trail.n} × ${dmg(sk.trail.dmg)}`]);
  if (sk.type === 'mclash' || sk.type === 'mspikes' || sk.type === 'mmeteor') out.push(['Fläche', 'r ' + sk.radius], ['Reichweite', String(sk.range)]);
  if (sk.type === 'mgrav') out.push(['Felsen', `${sk.rocks} · ${sk.ticks} × ${dmg(sk.dmg)}`], ['Zum Schluss', dmg(sk.last.dmg)], ['Sog', String(sk.pull)]);
  if (sk.splash) out.push(['Splitter', `r ${sk.splash.r} · ${dmg(sk.dmg * sk.splash.mul)}`]);
  if (sk.shatter) out.push(['Zerspringen', extra(sk.shatter)]);
  if (sk.chain) out.push(['Sprünge', `${sk.chain} · erster Sprung ${dmg(sk.dmg * (sk.chainMul || 1))}`]);
  if (sk.discharge) out.push(['Entladung', extra(sk.discharge)]);
  if (sk.pierce) out.push(['Durchbohrt', '']);
  if (sk.arcs) out.push(['Ziele', `${sk.arcs}, Überschlag ${dmg(sk.dmg * (sk.jump ? sk.jump.mul : 0.5))}`]);
  if (sk.freeze && sk.type !== 'msnow') out.push(['Einfrieren', freeze(sk.freeze)]);
  const stun = sk.stun || (sk.last && sk.last.stun);
  if (stun) out.push(['Betäubt', numDe(stun) + ' s']);
  if (sk.burn && sk.type !== 'mignite') out.push(['Brand', skillDotNum(sk.burn.dps) + ' je s']);
  if (sk.slow && sk.type !== 'msnow') out.push(['Verlangsamt', `${skillPct(sk.slow.amount)} · ${numDe(sk.slow.duration)} s`]);
  if (sk.lift || (sk.last && sk.last.lift)) out.push(['Hochgeschleudert', '']);
  if (sk.ignite || (sk.last && sk.last.ignite)) out.push(['Explodieren', dmg(0.5)]);
  if (sk.type === 'nova' && skillRank(lvl) >= 0) out.push(['Nachhall', dmg(sk.dmg * 0.35)]);
  // seit 13.64: Eisgefängnis und die Kombo des Eisstrahls (frostgefaengnis.js)
  if (typeof frostSkillStats === 'function') frostSkillStats(sk, lvl, out);
}

// Ultimative Attacken (seit 13.6): „3,5× Angriff“ in den Werten wird zur Schadenszahl mit den aktuellen Werten
function ultStatsText(u) {
  const p = game.player;
  const s = skillStatsBase();
  if (!s || typeof ULT_UNLOCK === 'undefined') return u.stats;
  // wie ultPower: Fertigkeitsschaden und +2,5 % je Stufe über 30
  const pw = (s.skillDmg || 1) * (1 + 0.025 * Math.max(0, p.level - ULT_UNLOCK));
  // seit 13.87: Natur- und Elementschaden (Klassensegen) zählt nur, wo die Treffer als Fertigkeit laufen (hitMonster
  // mit opts.skill) – unter den Ultis nur der Kreis der Elemente
  const atk = s.atk * pw * (1 + (s.monsterDmg || 0)) * (u.id === 'elementkreis' ? 1 + (s.natureDmg || 0) : 1);
  // Brand je Sekunde (Inferno) wie jeder Schaden über Zeit: Angriff × Anteil × Fertigkeitsschaden, ohne Stufenbonus
  return u.stats.replace(/(\d+(?:,\d+)?)× je s/g, (m0, n) => numText(s.atk * (s.skillDmg || 1) * Number(n.replace(',', '.'))) + ' Schaden je s')
    .replace(/(\d+(?:,\d+)?)×(\s*Angriff)?/g, (m0, n) => numText(atk * Number(n.replace(',', '.'))) + ' Schaden');
}

// Aktuelle Werte, darunter die nächste Stufe mit den Zuwächsen
function skillStatsHtml(sk, lvl, compact) {
  const now = skillStats(sk, lvl);
  if (!now.length) return '';
  let html = '<span class="sk-stats">' + now.map(([k, v]) => (v === '' ? k : `${k} <b>${v}</b>`)).join(' · ') + '</span>';
  const nl = compact ? null : nextSkillLevel(lvl);
  if (nl != null) {
    const next = skillStats(sk, nl);
    html += `<span class="sk-next">${nl === SKILL_RANKS[0].from && skillRank(lvl) < 0 ? 'Nach dem Erwecken (E1)' : 'Stufe ' + skillLevelText(nl)}: ` +
      next.map(([k, v], j) => (v === '' ? k : `${k} <b${now[j] && now[j][1] !== v ? ' class="up"' : ''}>${v}</b>`)).join(' · ') + '</span>';
  }
  return html;
}

// Kurzer Text: erster Satz, höchstens etwa 70 Zeichen (der volle Text steht im Infofeld)
function shortSkillText(t) {
  const full = String(t || '');
  const m = full.match(/^.*?[.!](\s|$)/);
  let s = m ? m[0].trim() : full;
  if (s.length > 72) s = s.slice(0, s.lastIndexOf(' ', 70)).replace(/[,:;]$/, '') + ' …';
  return s;
}

// Fertigkeitenliste (seit 12.4 kompakt): Symbol im aktuellen Rang, Name, kurzer Satz, aktuelle Werte, Knöpfe;
// darunter alle Ränge als Symbole (normal 1–15, E, H, L, V) – erreichte leuchten, kommende sind abgedunkelt
function skillListHtml(skills, p) {
  return '<ul class="skill-list sk-cards">' + skills.map((sk, i) => {
    const lvl = p ? p.skillLevels[i] : 0;
    const r = p ? skillRank(lvl) : -1;
    const open = !p || p.level >= sk.unlock;
    let head = `ab Stufe ${sk.unlock}`;
    let btns = '';
    if (p && open) {
      const acts = skillActions(p, i);
      head = r < 0 ? `Stufe ${lvl}/${SKILL_POINT_MAX}` : `<b class="rank-text" style="color:${SKILL_RANKS[r].color}">${SKILL_RANKS[r].name} ${skillLevelText(lvl)}</b>`;
      // seit 14.1: Symbol des Gegenstands im Knopf, Grund bei fehlendem Gegenstand sichtbar darunter (nicht nur als Titel)
      const ico = (a) => (a.item ? `<img class="act-ico" src="${a.item === 'book' ? bookIconUrl(sk.id) : materialIconUrl(a.item)}" alt="">` : '');
      btns = acts.map((a) => `<button class="mini-btn${a.type === 'rankup' ? ' rank-btn' : ''}" type="button" data-upgrade="${i}" data-act="${a.type}" ${a.ok ? '' : 'aria-disabled="true"'} title="${escapeHtml(a.ok ? a.skip || '' : a.why)}">${ico(a)}${a.label}</button>`).join('') ||
        (r === SKILL_RANKS.length - 1 ? '<span class="hint-text">Höchste Stufe</span>' : '');
      for (const w of new Set(acts.filter((a) => !a.ok && a.why && a.type !== 'point').map((a) => a.why))) btns += `<small class="sk-why">${escapeHtml(w)}</small>`;
      const skip = acts.find((a) => a.ok && a.skip);
      if (skip) btns += `<small class="sk-why ok">${escapeHtml(skip.skip)}</small>`;
    }
    const ranks = [{ r: -1, label: '1–15', color: '#cfc4a8', min: 1 }, ...SKILL_RANKS.map((rk, k) => ({ r: k, label: rk.levels > 1 ? rk.id + '1–' + rk.levels : rk.id, color: rk.color, min: rk.minLevel, name: rk.name }))];
    const rankRow = '<span class="sk-ranks">' + ranks.map((x) => {
      const has = !p || (open && r >= x.r);
      const now = open && p && r === x.r;
      const rnm = x.r < 0 ? sk.name : (RANK_NAMES[sk.id] || [])[x.r] || sk.name;
      return `<span class="sk-rank${has ? ' has' : ''}${now ? ' now' : ''}" title="${rnm} · ${x.name || 'Normal'}${x.min > 1 ? ' · ab Stufe ' + x.min : ''}">` +
        `<img src="${skillIconUrl(sk, x.r)}" alt=""><small style="color:${x.color}">${x.label}</small></span>`;
    }).join('<i class="sk-arrow">›</i>') + '</span>';
    const rn = p && open ? skillRankName(sk, lvl) : sk.name;
    // seit 13.87: Text mit den Werten der Stufe (skillText), mit Figur dasselbe Infofeld wie in der Leiste (Mana, Abklingzeit)
    const txt = skillText(sk, lvl || 1);
    const info = p ? skillTipHtml(sk, Math.max(1, lvl)) : '<strong>' + rn + '</strong><span>' + txt + '</span>';
    return `<li${open ? '' : ' class="locked"'} data-info="${escapeHtml(info)}">` +
      `<img class="icon" src="${skillIconUrl(sk, r)}" alt="${sk.short}">` +
      `<span class="info"><strong>${i + 1}. ${rn} <em class="sk-level">${head}</em></strong>` +
      (rn !== sk.name ? `<span class="sk-base">aus ${sk.name}</span>` : '') +
      `<span class="sk-short">${shortSkillText(txt)}</span>` +
      (p ? `<span class="sk-scale">Wird stärker mit <b>${mainAttrName(p.classId)}</b></span>` : '') +
      (p && open ? skillStatsHtml(sk, lvl, true) : '') + rankRow + `</span>` +
      `<span class="meta">${btns}</span></li>`;
  }).join('') + '</ul>';
}

// Ultimative Attacke unter der Fertigkeitsliste
function ultHtml(u, p) {
  if (!u) return '';
  const meta = p && p.level >= u.unlock
    ? (p.ultCd > 0 ? `bereit in ${formatBuffTime(Math.ceil(p.ultCd))}` : '<b class="up">bereit</b>') + '<br>Taste 6'
    : `ab Stufe ${u.unlock}`;
  return `<ul class="skill-list ult-list"><li><img class="icon" src="${skillIconUrl(u)}" alt="${u.short}">` +
    `<span class="info"><strong>Ultimativ: ${u.name}</strong><span>${u.text}</span><span class="sk-stats">${ultStatsText(u)} · Abklingzeit ${ULT_COOLDOWN} s · kein Mana</span></span>` +
    `<span class="meta">${meta}</span></li></ul>`;
}

// Beschriftung des Knopfes zum Ansprechen am Handy
const NPC_TALK_LABEL = { schmied: 'Schmieden', haendler: 'Handeln', waffen: 'Handeln', ruestung: 'Handeln', bogenmacher: 'Handeln', alchemist: 'Handeln', aeltester: 'Auftrag', jaegerin: 'Jagd', teleport: 'Reisen', stallmeister: 'Auftrag', lehrmeister: 'Lernen', lager: 'Lager', wanderer: 'Auftrag', eingang: 'Betreten', riss: 'Betreten', ausgang: 'Verlassen', weltentor: 'Reisen' };

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
  let waited = false;
  const dirs = [{ x: 0, y: 1 }, { x: 1, y: 0 }, { x: 0, y: -1 }];
  const cycle = (key, list, label) => `<div class="lk-row"><span>${label}</span><button type="button" class="lk-arrow" data-cyc="${key}:-1">‹</button>` +
    `<b>${list[look[key]]}</b><button type="button" class="lk-arrow" data-cyc="${key}:1">›</button></div>`;
  const swatches = (key, colors, label) => `<div class="lk-row"><span>${label}</span><div class="lk-swatches">` +
    colors.map((c, i) => `<button type="button" class="lk-sw${look[key] === i ? ' on' : ''}" style="--c:${c}" data-sw="${key}:${i}" aria-label="${label} ${i + 1}"></button>`).join('') + `</div></div>`;
  const render = () => {
    box.innerHTML = `<div class="lk"><canvas class="lk-preview" width="180" height="210" title="Antippen zum Drehen"></canvas><div class="lk-opts">` +
      cycle('sex', LOOKS.sex, 'Geschlecht') + cycle('hair', LOOKS.hair, 'Frisur') + swatches('hc', LOOKS.hairColor, 'Haare') +
      (look.sex === 0 ? cycle('bart', LOOKS.beard, 'Bart') : '') + swatches('skin', LOOKS.skin, 'Haut') +
      cycle('eyes', LOOKS.eyes, 'Augen') + swatches('ec', LOOKS.eyeColor, 'Augenfarbe') + cycle('mark', LOOKS.mark, 'Gesicht') + cycle('helm', LOOKS.helm, 'Helm') +
      `<button type="button" class="mini-btn lk-random">🎲 Zufällig</button></div></div>`;
    const cv = box.querySelector('canvas');
    cv.addEventListener('click', () => { dir = (dir + 1) % 3; render(); });
    // 3D (seit 9.2): Vorschau mit der echten Spielfigur, damit man Frisur, Bart und Helm so sieht wie im Spiel
    const fig3 = { classId, path, equipment: equipment || starterEquipment(classId), look };
    if (typeof v3Portrait === 'function' && cv.clientWidth && v3Portrait(cv, fig3, [-0.35, -1.45, Math.PI][dir])) {
      bind();
      return;
    }
    // Fenster gerade erst geöffnet (noch ohne Größe): im nächsten Bild in 3D zeichnen
    if (V3.on && !cv.clientWidth && !waited) {
      waited = true;
      requestAnimationFrame(() => { if (box.isConnected) render(); });
    }
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
    bind();
  };
  const bind = () => {
    box.querySelectorAll('[data-cyc]').forEach((b) => b.addEventListener('click', () => {
      const [key, step] = b.dataset.cyc.split(':');
      const n = { sex: LOOKS.sex, hair: LOOKS.hair, eyes: LOOKS.eyes, mark: LOOKS.mark, bart: LOOKS.beard, helm: LOOKS.helm }[key].length;
      look[key] = ((look[key] ?? 0) + Number(step) + n) % n;
      // passende Frisur beim Wechsel des Geschlechts (danach frei wählbar)
      if (key === 'sex') look.hair = look.sex === 1 ? ([0, 3, 5, 7, 8].includes(look.hair) ? 2 : look.hair) : ([1, 2, 4, 9].includes(look.hair) ? 0 : look.hair);
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
      Object.assign(look, { sex: r(2), hair: r(LOOKS.hair.length), hc: r(LOOKS.hairColor.length), skin: r(LOOKS.skin.length), eyes: r(LOOKS.eyes.length), ec: r(LOOKS.eyeColor.length), mark: r(LOOKS.mark.length), bart: r(LOOKS.beard.length) });
      onChange({ ...look });
      render();
    });
  };
  render();
}

// Neue Boni (seit 14.15) auf der Seite „Werte“ des Charakterfensters
const CHAR_NEW_BONI = [
  ['poison', 'Vergiftungschance'], ['vsBeast', 'Stark gegen Tiere'], ['vsHuman', 'Stark gegen Menschen'],
  ['vsOrc', 'Stark gegen Orks und Riesen'], ['vsUndead', 'Stark gegen Untote und Geister'], ['vsDemon', 'Stark gegen Teufel und Dämonen'],
  ['resHuman', 'Abwehr gegen Menschen'], ['resMagic', 'Abwehr gegen Magie'], ['resMelee', 'Abwehr gegen Nahkampf'],
  ['resRanged', 'Abwehr gegen Fernkampf'], ['goldFind', 'Mehr Gold'], ['dropFind', 'Mehr Beute']
];

// Kurze Wirkungsliste eines Buffs für den Hinweis in der Buff-Leiste (seit 13.2), z. B.
// „Kampfrausch · 2:10 / Angriffstempo +30 % / Lauftempo +6 %“
const BUFF_TIP_LABELS = {
  atk: 'Angriff', def: 'Verteidigung', atkSpeed: 'Angriffstempo', speed: 'Lauftempo', dodge: 'Ausweichen',
  crit: 'Krit. Chance', critDmg: 'Krit. Schaden', damageTaken: 'Erlittener Schaden', regen: 'Leben je Sek.',
  skillDmg: 'Fertigkeitsschaden', reflect: 'Schaden zurück', chill: 'Angreifer verlangsamt', natureDmg: 'Naturschaden',
  omniVamp: 'Omni-Vampir', int: 'Intelligenz', hpSteal: 'Lebensraub',
  // seit 13.87: Falkenblick (nur der Grundangriff mit dem Bogen, bowRangeBonus) und Segen des Lichts
  bowRange: 'Reichweite Bogen-Grundangriff', healPower: 'Heilung'
};
function buffTip(b) {
  const lines = [b.name];
  const fmt = (v) => {
    const pct = Math.abs(v) * 100;
    // seit 13.87 unter 10 % mit einer Nachkommastelle (Lebensraub 1,15 % stand als „+1 %“ da)
    return (v < 0 ? '−' : '+') + (pct < 10 ? String(Math.round(pct * 10) / 10).replace('.', ',') : Math.round(pct)) + ' %';
  };
  for (const [k, v] of Object.entries(b.effects || {})) {
    // seit 13.87 mit dem echten Faktor (p.nextHitMul, bis zum ersten Angriff)
    if (k === 'invisible' && v) {
      const nm = game.player && game.player.nextHitMul > 1 ? game.player.nextHitMul : 0;
      lines.push(nm ? `Unsichtbar · nächster Angriff ×${numDe(nm)}, sicher kritisch` : 'Unsichtbar');
    }
    else if (k === 'int' && typeof v === 'number') lines.push('Intelligenz +' + Math.round(v));
    else if (k === 'atkFlat' && typeof v === 'number') lines.push('Angriff +' + Math.round(v));
    else if (k === 'defFlat' && typeof v === 'number') lines.push('Rüstung +' + Math.round(v));
    else if (k === 'chillDur') continue;
    // seit 13.69: Arkane Erleuchtung des Magiers gibt Elementschaden (gleiche Wirkung wie der Naturschaden des Schamanen)
    else if (k === 'natureDmg' && b.id === 'segen_arkan' && v) lines.push('Elementschaden ' + fmt(v));
    else if (BUFF_TIP_LABELS[k] && typeof v === 'number' && v) lines.push(BUFF_TIP_LABELS[k] + ' ' + fmt(v));
  }
  const fx = SKILL_FX[b.id];
  if (fx && fx.weaponGlow) lines.push('Leuchtende Waffe');
  if (b.id === 'knochenpanzer') lines.push('Schild fängt Schaden ab');
  return lines.join('\n');
}

// Zustände eines Monsters für das Zielfenster (seit 13.41)
function targetEffects(m) {
  const now = game.time;
  const out = [];
  const sec = (until) => Math.max(0, Math.ceil(until - now));
  const dot = (o, kind, icon, label) => {
    if (!o || o.until <= now) return;
    const d = Math.round(o.dps || 0);
    out.push({ kind, icon, label: `${label} ${d}/s`, time: `${sec(o.until)} s`, tip: `${label}: ${d} Schaden je Sekunde, noch ${sec(o.until)} s`, key: kind + d + ':' + sec(o.until) });
  };
  dot(m.burn, 'burn', '🔥', 'Brand');
  dot(m.poison, 'poison', '☠', 'Gift');
  dot(m.bleed, 'bleed', '🩸', 'Blutung');
  // Gift aus der Ausrüstung (seit 14.15): „Vergiftet · 4 s · 312/s“
  if (m.toxin && m.toxin.until > now) {
    const d = Math.round(m.toxin.dps || 0);
    out.push({ kind: 'toxin', icon: '☣', label: 'Vergiftet', time: `${sec(m.toxin.until)} s · ${d}/s`, tip: `Vergiftet: ${d} Schaden je Sekunde, noch ${sec(m.toxin.until)} s`, key: 'tox' + d + ':' + sec(m.toxin.until) });
  }
  if (m.stun > 0) out.push({ kind: 'stun', icon: '💫', label: 'Betäubt', time: `${Math.max(0.1, m.stun).toFixed(1).replace('.', ',')} s`, tip: 'Betäubt: kann sich nicht bewegen und nicht angreifen', key: 'stun' + Math.ceil(m.stun * 10) });
  if (m.frozen > now) out.push({ kind: 'frozen', icon: '❄', label: 'Eingefroren', time: `${sec(m.frozen)} s`, tip: 'Eingefroren', key: 'frz' + sec(m.frozen) });
  if (m.slow && m.slow.until > now && m.slow.mul < 1) {
    const pc = Math.round((1 - m.slow.mul) * 100);
    out.push({ kind: 'slow', icon: '🐌', label: `Langsam −${pc} %`, time: `${sec(m.slow.until)} s`, tip: `Verlangsamt um ${pc} %`, key: 'slow' + pc + ':' + sec(m.slow.until) });
  }
  if (m.vulnerable && m.vulnerable.until > now && m.vulnerable.mul > 1) {
    const pc = Math.round((m.vulnerable.mul - 1) * 100);
    out.push({ kind: 'curse', icon: '✸', label: `Fluch +${pc} % Schaden`, time: `${sec(m.vulnerable.until)} s`, tip: `Verflucht: nimmt ${pc} % mehr Schaden`, key: 'vul' + pc + ':' + sec(m.vulnerable.until) });
  }
  return out;
}
