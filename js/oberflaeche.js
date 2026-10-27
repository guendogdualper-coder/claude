// Oberfläche: Startbildschirm, Anzeigen (HUD), Fenster und Nachrichten.

const $ = (id) => document.getElementById(id);

const ui = {
  selectedClass: 'krieger',
  cache: {},
  logTimer: null,

  init() {
    $('btnChar').addEventListener('click', () => this.toggle('panelChar'));
    $('btnHelp').addEventListener('click', () => this.toggle('panelHelp'));
    $('btnInv').addEventListener('click', () => this.toggle('panelInv'));
    $('potHp').addEventListener('click', () => usePotion('hp'));
    $('potMp').addEventListener('click', () => usePotion('mp'));
    $('btnRevive').addEventListener('click', () => {
      $('panelDeath').hidden = true;
      revivePlayer();
    });
    document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => this.closePanels()));

    $('zoneList').innerHTML = ZONES.map((z) => `<li>${z.name} <span>· ${z.levels}</span></li>`).join('');

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
      const save = newCharacter(name, this.selectedClass);
      startGame(save);
      saveGame();
    });
    this.buildClassGrid();
    $('versionText').textContent = 'Version ' + GAME_VERSION;
  },

  showStart() {
    $('startScreen').hidden = false;
    $('hud').hidden = true;
    const save = loadSave();
    $('confirmNew').hidden = true;
    if (save) {
      $('continueBox').hidden = false;
      $('createForm').hidden = true;
      $('btnContinue').textContent = `Weiterspielen: ${save.name} · ${CLASSES[save.classId].name} · Stufe ${save.level}`;
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
        grid.querySelectorAll('.class-card').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.classId === id)));
        this.renderClassDetail();
      });
      grid.append(btn);
    }
    this.renderClassDetail();
  },

  renderClassDetail() {
    const c = CLASSES[this.selectedClass];
    $('classDetail').innerHTML = `<p>${c.description}</p>` + skillListHtml(c, null);
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
  },

  buildSkillBar() {
    const p = game.player;
    if (!p) return;
    const c = CLASSES[p.classId];
    const bar = $('skillBar');
    bar.innerHTML = '';
    c.skills.forEach((sk, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'skill-wrap';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot skill kind-' + sk.kind;
      btn.id = 'skill' + i;
      btn.title = `${sk.name} (${i + 1}) – ${sk.text} Mana: ${sk.mp}, Abklingzeit: ${sk.cooldown} s`;
      btn.innerHTML = `<span class="key">${i + 1}</span><span class="abbr">${sk.short}</span>` +
        `<span class="slvl">${p.level >= sk.unlock ? p.skillLevels[i] : ''}</span>` +
        `<span class="cd" hidden></span>` +
        (p.level < sk.unlock ? `<span class="lock">ab Lv ${sk.unlock}</span>` : '');
      btn.addEventListener('click', () => useSkill(i));
      wrap.append(btn);
      if (p.skillPoints > 0 && p.level >= sk.unlock && p.skillLevels[i] < MAX_SKILL_LEVEL) {
        const plus = document.createElement('button');
        plus.type = 'button';
        plus.className = 'plus';
        plus.title = sk.name + ' verbessern';
        plus.textContent = '+';
        plus.addEventListener('click', (e) => {
          e.stopPropagation();
          upgradeSkill(i);
        });
        wrap.append(plus);
      }
      bar.append(wrap);
    });
  },

  // Schreibt nur geänderte Werte ins DOM
  set(key, value, fn) {
    if (this.cache[key] === value) return;
    this.cache[key] = value;
    fn(value);
  },

  update() {
    const p = game.player;
    const s = game.stats;
    if (!p) return;
    this.set('hp', `${Math.ceil(p.hp)}/${s.maxHp}`, (v) => {
      $('hpText').textContent = v;
      $('hpFill').style.transform = `scaleX(${Math.max(0, p.hp / s.maxHp)})`;
    });
    this.set('mp', `${Math.floor(p.mp)}/${s.maxMp}`, (v) => {
      $('mpText').textContent = v;
      $('mpFill').style.transform = `scaleX(${Math.max(0, p.mp / s.maxMp)})`;
    });
    this.set('lvl', p.level, (v) => { $('hudLevel').textContent = 'Lv ' + v; });
    const need = xpToNext(p.level);
    this.set('xp', p.xp + '/' + need, () => {
      const pct = p.level >= MAX_LEVEL ? 100 : (p.xp / need) * 100;
      $('xpFill').style.width = pct + '%';
      $('xpText').textContent = p.level >= MAX_LEVEL ? 'Höchststufe' : `${p.xp.toLocaleString('de-DE')} / ${need.toLocaleString('de-DE')} EP (${pct.toFixed(1).replace('.', ',')} %)`;
    });
    this.set('gold', p.gold, (v) => { $('goldText').textContent = v.toLocaleString('de-DE'); });
    this.set('splinter', p.splinters, (v) => { $('splinterText').textContent = v; });
    this.set('potHp', p.potions.hp, (v) => { $('potHpCount').textContent = v; });
    this.set('potMp', p.potions.mp, (v) => { $('potMpCount').textContent = v; });

    const zone = zoneAt(p.x, p.y);
    this.set('zone', zone.id, () => {
      $('zoneName').textContent = zone.name;
      $('zoneLevels').textContent = zone.levels;
    });

    const buffs = p.buffs.map((b) => `${b.name} ${Math.ceil(b.until - game.time)}s`)
      .concat(p.shield > 0 ? ['Schild ' + Math.ceil(p.shield)] : []);
    this.set('buffs', buffs.join('|'), () => {
      $('buffList').innerHTML = buffs.map((b) => `<span class="buff">${b}</span>`).join('');
    });

    // Abklingzeiten
    const c = CLASSES[p.classId];
    c.skills.forEach((sk, i) => {
      const left = p.skillCd[i];
      const key = 'cd' + i;
      const shown = left > 0 ? left.toFixed(left < 1 ? 1 : 0) : '';
      this.set(key, shown, () => {
        const el = document.querySelector('#skill' + i + ' .cd');
        if (!el) return;
        el.hidden = !shown;
        el.textContent = shown;
        el.parentElement.classList.toggle('on-cd', !!shown);
        el.style.setProperty('--p', String(left / sk.cooldown));
      });
      if (left > 0) {
        const el = document.querySelector('#skill' + i + ' .cd');
        if (el) el.style.setProperty('--p', String(left / sk.cooldown));
      }
      this.set('mana' + i, p.mp < sk.mp, (v) => {
        const el = $('skill' + i);
        if (el) el.classList.toggle('no-mana', v);
      });
    });

    // Ziel
    const t = game.target && !game.target.dead ? game.target : null;
    const tKey = t ? t.id + ':' + Math.ceil(t.hp) : '';
    this.set('target', tKey, () => {
      $('targetFrame').hidden = !t;
      if (!t) return;
      $('targetName').textContent = `Lv ${t.level} ${t.name}`;
      $('targetName').style.color = t.isStone ? '#d9b8ff' : levelColor(t.level);
      $('targetFill').style.transform = `scaleX(${t.hp / t.maxHp})`;
      $('targetText').textContent = `${Math.ceil(t.hp).toLocaleString('de-DE')} / ${t.maxHp.toLocaleString('de-DE')}`;
    });

    this.set('talk', game.nearNpc ? game.nearNpc.id : '', (v) => {
      $('btnTalk').hidden = !v || !input.touchUi;
      if (v) $('btnTalk').textContent = game.nearNpc.id === 'schmied' ? 'Schmieden' : 'Handeln';
    });
  },

  log(text, type = 'info') {
    const log = $('log');
    const p = document.createElement('p');
    p.className = type;
    p.textContent = text;
    log.append(p);
    while (log.children.length > 6) log.firstChild.remove();
    // ältere Nachrichten verblassen
    [...log.children].forEach((el, i) => el.classList.toggle('old', i < log.children.length - 3));
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
      el.hidden = false;
    }
  },

  closePanels() {
    ['panelChar', 'panelHelp', 'panelNpc', 'panelInv'].forEach((id) => { $(id).hidden = true; });
  },

  anyPanelOpen() {
    return !$('panelChar').hidden || !$('panelHelp').hidden || !$('panelNpc').hidden || !$('panelInv').hidden;
  },

  renderCharPanel() {
    const p = game.player;
    if (!p) return;
    const s = playerStats(p);
    const c = CLASSES[p.classId];
    const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
    const pct = (v) => Math.round(v * 100) + ' %';
    $('charBody').innerHTML =
      `<p><strong>${escapeHtml(p.name)}</strong> · ${c.name} · Stufe ${p.level}</p>` +
      `<dl class="stats">` +
      row('Leben', s.maxHp) + row('Mana', s.maxMp) +
      row('Angriff', s.atk) + row('Verteidigung', s.def) +
      row('Kritische Treffer', pct(s.crit)) + row('Lauftempo', Math.round(s.speed)) +
      row('Blocken', pct(s.block)) + row('Ausweichen', pct(s.dodge)) +
      row('Besiegte Monster', p.kills.toLocaleString('de-DE')) + row('Zerstörte Seelensteine', p.stones) +
      row('Tode', p.deaths) + row('Spielzeit', formatTime(p.playTime)) +
      `</dl>` +
      `<h3>Fertigkeiten</h3>` +
      `<p>Freie Fertigkeitspunkte: <span class="points">${p.skillPoints}</span></p>` +
      skillListHtml(c, p);
    $('charBody').querySelectorAll('[data-upgrade]').forEach((b) => {
      b.addEventListener('click', () => upgradeSkill(Number(b.dataset.upgrade)));
    });
  },

  openNpc(npc) {
    this.closePanels();
    const p = game.player;
    $('npcTitle').textContent = npc.name;
    if (npc.id === 'haendler') this.renderShop();
    else if (npc.id === 'schmied') gear.openSmith($('npcBody'));
    else gear.openMerchant(npc.id, $('npcBody'));
    $('panelNpc').hidden = false;
  },

  renderShop() {
    const p = game.player;
    $('npcBody').innerHTML =
      `<p>„Tränke und Schriftrollen für unterwegs. Waffen gibt es bei Goro, Rüstungen bei Mei.“</p>` +
      `<p>Dein Gold: <span class="price" id="shopGold">${p.gold.toLocaleString('de-DE')}</span></p>` +
      `<h3>Tränke und Schriftrollen</h3><div class="shop">` +
      SHOP.map((item) =>
        `<div class="shop-item"><span class="shop-icon potion-icon ${item.id}"></span><strong>${item.name} <span class="price">${item.price} Gold</span></strong>` +
        `<small>${item.text} Im Gepäck: <b id="have-${item.id}">${p.potions[item.id]}</b></small>` +
        `<div class="buy"><button class="mini-btn" type="button" data-buy="${item.id}" data-n="1">1 kaufen</button>` +
        `<button class="mini-btn" type="button" data-buy="${item.id}" data-n="10">10 kaufen</button></div></div>`
      ).join('') +
      `<div class="shop-item"><img class="shop-icon" src="${scrollIconUrl()}" alt=""><strong>${BLESSING.name} <span class="price">${BLESSING.price} Gold</span></strong>` +
      `<small>${BLESSING.text} Im Gepäck: <b id="have-scroll">${p.scrolls}</b></small>` +
      `<div class="buy"><button class="mini-btn" type="button" data-scroll="1">Kaufen</button></div></div>` +
      `</div><p id="shopMsg" class="form-error" hidden></p>`;
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

  buy(id, n) {
    const p = game.player;
    const item = SHOP.find((s) => s.id === id);
    const cost = item.price * n;
    if (p.gold < cost) {
      this.shopMessage(`Dir fehlen ${cost - p.gold} Gold für ${n} × ${item.name}.`);
      return;
    }
    p.gold -= cost;
    p.potions[id] += n;
    $('shopMsg').hidden = true;
    $('shopGold').textContent = p.gold.toLocaleString('de-DE');
    $('have-' + id).textContent = p.potions[id];
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

function skillListHtml(c, p) {
  return '<ul class="skill-list">' + c.skills.map((sk, i) => {
    let meta = `ab Stufe ${sk.unlock}<br>${sk.mp} Mana · ${sk.cooldown} s`;
    if (p) {
      const unlocked = p.level >= sk.unlock;
      const canUp = unlocked && p.skillPoints > 0 && p.skillLevels[i] < MAX_SKILL_LEVEL;
      meta = unlocked
        ? `Stufe ${p.skillLevels[i]}/${MAX_SKILL_LEVEL}<br><button class="mini-btn" type="button" data-upgrade="${i}" ${canUp ? '' : 'disabled'}>Verbessern</button>`
        : `ab Stufe ${sk.unlock}`;
    }
    return `<li><span class="icon kind-${sk.kind}">${sk.short}</span>` +
      `<span class="info"><strong>${i + 1}. ${sk.name}</strong><span>${sk.text}</span></span>` +
      `<span class="meta">${meta}</span></li>`;
  }).join('') + '</ul>';
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}

// Kleine Vorschau der Klasse für die Auswahlkarten
function drawClassPreview(cv, classId) {
  const ctx = cv.getContext('2d');
  ctx.setTransform(1.9, 0, 0, 1.9, cv.width / 2, cv.height / 2 + 30);
  const fake = { classId, x: 0, y: 0, r: 11, facing: { x: 0.45, y: 0.89 }, buffs: [], swing: 0, moving: false, shield: 0 };
  drawPlayer(ctx, fake);
}
