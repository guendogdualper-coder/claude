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
    // Handy: Karte antippen klappt Gold, Splitter, Akku, Uhr und Ping auf oder zu
    const map = document.querySelector('.hud-map');
    try { map.classList.toggle('open', localStorage.getItem('seelenstein.kartendetails') === '1'); } catch (e) {}
    map.addEventListener('click', () => {
      const open = map.classList.toggle('open');
      try { localStorage.setItem('seelenstein.kartendetails', open ? '1' : '0'); } catch (e) {}
    });
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
      revivePlayer();
    });
    document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => this.closePanels()));

    $('zoneList').innerHTML = ZONES.map((z) => `<li>${z.name} <span>· ${z.levels}</span></li>`).join('');
    $('stoneList').innerHTML = STONE_TYPES.map((t) => {
      const zone = ZONES.find((z) => (z.stones || []).some(([lv]) => lv === t.level));
      return `<li><b style="color:${t.look.glow}">■</b> Stufe ${t.level} · ${t.name} <span>· ${zone ? zone.name : ''} · ${t.drop}</span></li>`;
    }).join('');

    // Startbildschirm
    $('btnContinue').addEventListener('click', () => {
      const save = loadSave();
      if (save) startGame(save);
    });
    $('btnNewChar').addEventListener('click', () => { $('confirmNew').hidden = false; });
    $('btnCancelNew').addEventListener('click', () => { $('confirmNew').hidden = true; });
    $('btnConfirmNew').addEventListener('click', () => {
      deleteSave();
      this.showStart();
    });
    $('createForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('charName').value.trim();
      if (!/^[\p{L}\p{N} _-]{2,14}$/u.test(name)) {
        $('createError').textContent = 'Der Name braucht 2 bis 14 Zeichen: Buchstaben, Zahlen, Leerzeichen, - oder _.';
        $('createError').hidden = false;
        return;
      }
      const save = newCharacter(name, this.selectedClass, this.selectedPath, this.createLook || DEFAULT_LOOKS[this.selectedClass]);
      startGame(save);
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
    });
  },

  // Aussehen später im Charakterfenster ändern
  openLookPanel() {
    const p = game.player;
    this.closePanels();
    this.editLook = { ...DEFAULT_LOOKS[p.classId], ...(p.look || {}) };
    lookEditor($('lookPanelEditor'), p.classId, this.editLook, (look) => { this.editLook = look; }, p.equipment);
    $('panelLook').hidden = false;
  },

  showStart() {
    $('startScreen').hidden = false;
    $('hud').hidden = true;
    const save = loadSave();
    $('confirmNew').hidden = true;
    if (save) {
      $('continueBox').hidden = false;
      $('createForm').hidden = true;
      const way = save.path != null ? ' · ' + classPath(save.classId, save.path).name : '';
      $('btnContinue').textContent = `Weiterspielen: ${save.name} · ${CLASSES[save.classId].name}${way} · Stufe ${save.level}`;
    } else {
      $('continueBox').hidden = true;
      $('createForm').hidden = false;
      $('createError').hidden = true;
    }
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
      drawClassPreview(cv, id);
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
    $('classDetail').innerHTML = `<p>${c.description}</p>` + pathChoiceHtml(c, this.selectedPath) +
      skillListHtml(c.paths[this.selectedPath].skills, null) + ultHtml(ULTIMATES[c.paths[this.selectedPath].id], null);
    $('classDetail').querySelectorAll('[data-path]').forEach((b) => b.addEventListener('click', () => {
      this.selectedPath = Number(b.dataset.path);
      this.renderClassDetail();
    }));
  },

  // Ältere Spielstände: Weg einmalig auswählen
  showPathChoice() {
    const p = game.player;
    const c = CLASSES[p.classId];
    let pick = p.path || 0;
    const render = () => {
      $('pathBody').innerHTML = `<p>Jede Klasse hat jetzt zwei Wege mit eigenen Fertigkeiten. Wähle deinen Weg als ${c.name}. ` +
        `Deine Fertigkeitspunkte bekommst du zurück und kannst sie neu verteilen.</p>` +
        pathChoiceHtml(c, pick) + skillListHtml(c.paths[pick].skills, null) + ultHtml(ULTIMATES[c.paths[pick].id], null) +
        `<button id="btnPathOk" class="btn btn-primary" type="button">${c.paths[pick].name} wählen</button>`;
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
      btn.title = `${sk.name} (${slot + 1}) – ${sk.text} ${skillStats(sk, p.skillLevels[i]).map(([k, v]) => k + ' ' + v).join(', ')}. Mana: ${sk.mp}, Abklingzeit: ${sk.cooldown} s. Lange drücken zum Tauschen.`;
      btn.innerHTML = `<span class="key">${slot + 1}</span><img class="skill-icon" src="${skillIconUrl(sk)}" alt="${sk.short}">` +
        `<span class="slvl">${p.level >= sk.unlock ? skillLevelText(p.skillLevels[i]) : ''}</span>` +
        `<span class="cd" hidden></span>` +
        (p.level < sk.unlock ? `<span class="lock">ab Lv ${sk.unlock}</span>` : '');
      this.pressSkill(btn, i);
      wrap.append(btn);
      wrap.insertAdjacentHTML('beforeend', '<span class="runring" hidden></span><span class="run" hidden></span>');
      // Plus-Knopf, wenn etwas geht: Punkt setzen, auf 17 direkt erwecken, Buch lesen.
      // Nur der Schritt in einen höheren Rang (kostet mehrere Bücher) läuft über das Charakterfenster.
      const acts = skillActions(p, i).filter((a) => a.ok);
      if (acts.length) {
        const act = acts.find((a) => a.type === 'point') || acts.find((a) => a.type === 'rankup' && rank < 0) || acts.find((a) => a.type === 'book');
        const awaken = act && act.type === 'rankup';
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

  updateNetBadge() {
    const on = netOnline();
    $('btnChat').hidden = !on;
    // Kanal und Spielerzahl klein in der Statuszeile unter der Karte
    $('netBadge').hidden = true;
    $('stNet').hidden = !on;
    if (on) $('stNet').textContent = `K${net.channel} · ${net.players.size + 1}/${NET_MAX}`;
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

  chat(name, text, c) {
    c = c || (name ? 'g' : 'sys');
    this.chatLines.push({ name, text, c });
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
    $('btnHorse').hidden = !p || !p.horse;
    $('btnHorse').classList.toggle('on', !!(p && p.riding));
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
      this.set('mana' + i, p.mp < sk.mp, (v) => {
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

  log(text, type = 'info') {
    const log = $('log');
    const p = document.createElement('p');
    p.className = type;
    p.textContent = text;
    log.append(p);
    while (log.children.length > 6) log.firstChild.remove();
    // Nachrichten verschwinden nach einer Weile von selbst
    setTimeout(() => p.remove(), 12000);
    // ältere Nachrichten verblassen
    [...log.children].forEach((el, i) => el.classList.toggle('old', i < log.children.length - 3));
  },

  // Beute unten rechts: Symbol, Name und Anzahl. Gleiche Beute kurz hintereinander wird zusammengezählt.
  lootRows: [],
  lootLog: [],

  loot(name, count, icon, color) {
    if (!count) return;
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
      this.attrHtml(p) +
      `<dl class="stats">` +
      row('Leben', s.maxHp) + row('Mana', s.maxMp) +
      row('Angriff', s.atk) + row('Verteidigung', s.def) +
      row('Kritische Treffer', pct(s.crit)) + row('Lauftempo', Math.round(s.speed)) +
      row('Angriffstempo', pct(s.atkSpeed)) + row('Magiestärke', '+' + pct(s.magic || 0)) +
      row('Blocken', pct(s.block)) + row('Ausweichen', pct(s.dodge)) +
      row('Stark gegen Monster', pct(s.monsterDmg || 0)) + row('Lebensraub', pct(s.hpSteal || 0)) +
      row('Besiegte Monster', p.kills.toLocaleString('de-DE')) + row('Zerstörte Seelensteine', p.stones) +
      row('Tode', p.deaths) + row('Spielzeit', formatTime(p.playTime)) +
      `</dl>` +
      `<h3>Fertigkeiten</h3>` +
      `<p>Freie Fertigkeitspunkte: <span class="points">${p.skillPoints}</span> · Bücher für deine Fertigkeiten: <span class="points">${totalBooks(p, true)}</span></p>` +
      `<p class="hint-text">Bis Stufe 17 mit Punkten. Ab Stufe 15 kannst du eine Fertigkeit erwecken (E1–E10), danach geht es mit Büchern über Heroisch (H) und Legendär (L) bis Vollendet (V). Jedes Buch gehört zu einer Fertigkeit. Seelensteine lassen Bücher zu allen Fertigkeiten aller Klassen fallen, fremde verkaufst du beim Händler.</p>` +
      skillListHtml(classSkills(p), p) + ultHtml(ultimateOf(p), p);
    $('btnLook').addEventListener('click', () => this.openLookPanel());
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
    const effects = {
      str: (a) => [`+${a} Angriff`],
      vit: (a) => [`+${a * 6} Leben`, `+${fmt(a * 0.3, 1)} Rüstung`],
      int: (a) => [`+${a * 5} Mana`, `+${a} % Fertigkeitsschaden`],
      dex: (a) => [`+${fmt(a * 0.3, 1)} % Kritisch`, `+${fmt(a * 0.25, 2)} % Ausweichen`, `+${fmt(a * 0.5, 1)} % Tempo`]
    };
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
          `<div class="attr-main"><div class="attr-top"><strong>${a.name}</strong><b class="attr-val">${v}</b></div>` +
          `<div class="attr-prog"><i style="width:${(v / MAX_ATTR * 100).toFixed(1)}%"></i></div>` +
          `<small>${v ? now : a.text}</small>` +
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
    else if (npc.id === 'eingang' || npc.id === 'ausgang' || npc.id === 'riss') this.renderDungeon(npc);
    else if (npc.id === 'weltentor') this.renderWorldGate(npc);
    else this.renderTalk(npc);
    $('panelNpc').hidden = false;
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
    $('deathText').textContent = lostXp > 0
      ? `Du verlierst ${lostXp.toLocaleString('de-DE')} Erfahrungspunkte.`
      : 'Du hast keine Erfahrung verloren.';
    $('panelDeath').hidden = false;
  }
};

// Zwei Karten für die Wege einer Klasse
function pathChoiceHtml(c, selected) {
  return '<div class="path-grid">' + c.paths.map((pt, i) =>
    `<button type="button" class="path-card" data-path="${i}" aria-pressed="${i === selected}">` +
    `<strong>${pt.name}</strong><small class="path-role">${pt.role}</small><span>${pt.description}</span></button>`
  ).join('') + '</div>';
}

// Werte einer Fertigkeit auf einer Stufe, z. B. [['Angriff', '+29,6 %'], ['Dauer', '238 s']]
const SKILL_EFFECT_LABELS = {
  atk: 'Angriff', crit: 'Krit', atkSpeed: 'Angriffstempo', speed: 'Lauftempo', damageTaken: 'Erlittener Schaden',
  def: 'Verteidigung', dodge: 'Ausweichen', skillDmg: 'Fertigkeitsschaden', regen: 'Leben je s', reflect: 'Rückwurf', hpSteal: 'Lebensraub'
};
function skillPct(v) {
  const n = Math.round(v * 1000) / 10;
  return String(n).replace('.', ',') + ' %';
}
function skillStats(sk, lvl) {
  const out = [];
  const scale = buffScale(lvl);
  if (sk.dmg) out.push(['Schaden', skillPct(sk.dmg * dmgScale(lvl)) + (sk.hits > 1 ? ' ×' + sk.hits : '')]);
  if (sk.type === 'heal') out.push(['Heilung', skillPct(sk.amount * scale) + ' Leben']);
  if (sk.shield) out.push(['Schild', skillPct(sk.shield * scale) + ' Leben']);
  if (sk.type === 'summon') {
    out.push(['Skelette', sk.count + ' × ' + skillPct(sk.hp * scale) + ' Leben']);
    out.push(['Skelett-Angriff', skillPct(sk.atk * dmgScale(lvl))]);
  }
  if (sk.vulnerable) out.push(['Verwundbar', '+' + skillPct(sk.vulnerable * scale)]);
  for (const [k, v] of Object.entries(sk.effects || {})) {
    if (typeof v !== 'number' || !SKILL_EFFECT_LABELS[k]) continue;
    out.push([SKILL_EFFECT_LABELS[k], (v < 0 ? '−' : '+') + skillPct(Math.abs(v * scale))]);
  }
  if (sk.duration) out.push(['Dauer', skillDuration(sk, lvl) + ' s']);
  return out;
}

// Aktuelle Werte, darunter die nächste Stufe mit den Zuwächsen
function skillStatsHtml(sk, lvl) {
  const now = skillStats(sk, lvl);
  if (!now.length) return '';
  let html = '<span class="sk-stats">' + now.map(([k, v]) => `${k} <b>${v}</b>`).join(' · ') + '</span>';
  if (lvl < MAX_SKILL_LEVEL) {
    const next = skillStats(sk, lvl + 1);
    html += `<span class="sk-next">Stufe ${skillLevelText(lvl + 1)}: ` +
      next.map(([k, v], j) => `${k} <b${now[j] && now[j][1] !== v ? ' class="up"' : ''}>${v}</b>`).join(' · ') + '</span>';
  }
  return html;
}

function skillListHtml(skills, p) {
  return '<ul class="skill-list">' + skills.map((sk, i) => {
    let meta = `ab Stufe ${sk.unlock}<br>${sk.mp} Mana · ${sk.cooldown} s`;
    if (p) {
      const lvl = p.skillLevels[i];
      const r = skillRank(lvl);
      const acts = skillActions(p, i);
      const title = r < 0 ? `Stufe ${lvl}/${SKILL_BASE_MAX}` : `<b class="rank-text" style="color:${SKILL_RANKS[r].color}">${SKILL_RANKS[r].name} ${skillLevelText(lvl)}</b>`;
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
const NPC_TALK_LABEL = { schmied: 'Schmieden', haendler: 'Handeln', waffen: 'Handeln', ruestung: 'Handeln', alchemist: 'Handeln', aeltester: 'Auftrag', jaegerin: 'Jagd', teleport: 'Reisen', stallmeister: 'Auftrag', eingang: 'Betreten', riss: 'Betreten', ausgang: 'Verlassen', weltentor: 'Reisen' };

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
  return skillIndex.get(id);
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
  drawPlayer(ctx, { classId: p.classId, x: 0, y: 0, r: 11, facing: { x: 0, y: 1 }, buffs: [], swing: 0, moving: false, shield: 0, equipment: p.equipment || null, look: p.look || null });
}

// Kleine Vorschau der Klasse für die Auswahlkarten
function drawClassPreview(cv, classId) {
  const ctx = cv.getContext('2d');
  ctx.setTransform(1.9, 0, 0, 1.9, cv.width / 2, cv.height / 2 + 30);
  const fake = { classId, x: 0, y: 0, r: 11, facing: { x: 0.45, y: 0.89 }, buffs: [], swing: 0, moving: false, shield: 0 };
  drawPlayer(ctx, fake);
}

// Editor für das Aussehen: Vorschau (dreht sich beim Antippen) und Auswahl für Frisur, Haarfarbe,
// Haut, Augenform, Augenfarbe und Gesichtszeichen. onChange bekommt jedes Mal das neue Aussehen.
function lookEditor(box, classId, start, onChange, equipment = null) {
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
    const fig = { classId, x: 0, y: 0, r: 11, facing: dirs[dir], buffs: [], swing: 0, moving: false, shield: 0, equipment: equipment || starterEquipment(classId), look };
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
