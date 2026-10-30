// Tastenbelegung und freie Plätze (seit 10.5)
// - Jede Aktion hat eine Taste; in den Einstellungen lässt sich jede Taste neu belegen (opts.keys, gilt für das Gerät).
//   Laufen bleibt auf WASD und den Pfeiltasten, Esc schließt Fenster.
// - Zwei freie Plätze unten in der Leiste (p.quick, je Figur): mit einer Aktion nach Wahl belegen – Trank, Pferd,
//   Ziel, Sprechen, Karte, Fenster. Langes Drücken (oder Rechtsklick) auf den Platz öffnet die Auswahl.

const KEY_ACTIONS = [
  { id: 'skill1', label: 'Fertigkeit 1', key: 'Digit1' },
  { id: 'skill2', label: 'Fertigkeit 2', key: 'Digit2' },
  { id: 'skill3', label: 'Fertigkeit 3', key: 'Digit3' },
  { id: 'skill4', label: 'Fertigkeit 4', key: 'Digit4' },
  { id: 'skill5', label: 'Fertigkeit 5', key: 'Digit5' },
  { id: 'ult', label: 'Ultimative Attacke', key: 'Digit6' },
  { id: 'quick1', label: 'Freier Platz 1', key: 'Digit7' },
  { id: 'quick2', label: 'Freier Platz 2', key: 'Digit8' },
  { id: 'attack', label: 'Angriff (halten = weiter)', key: 'Space' },
  { id: 'potHp', label: 'Lebenstrank', key: 'KeyQ' },
  { id: 'potMp', label: 'Manatrank', key: 'KeyE' },
  { id: 'interact', label: 'Sprechen / Aufheben', key: 'KeyF' },
  { id: 'target', label: 'Nächstes Ziel', key: 'Tab' },
  { id: 'ride', label: 'Pferd auf/ab', key: 'KeyR' },
  { id: 'char', label: 'Charakter', key: 'KeyC' },
  { id: 'inv', label: 'Inventar', key: 'KeyI' },
  { id: 'map', label: 'Große Karte', key: 'KeyM' },
  { id: 'loot', label: 'Beutel', key: 'KeyB' },
  { id: 'social', label: 'Freunde & Gilde', key: 'KeyG' },
  { id: 'daily', label: 'Tagesbelohnung', key: 'KeyT' },
  { id: 'net', label: 'Server', key: 'KeyN' },
  { id: 'help', label: 'Hilfe', key: 'KeyH' },
  { id: 'opts', label: 'Einstellungen', key: 'KeyO' },
  { id: 'chat', label: 'Chat', key: 'Enter' }
];
// Tasten, die nicht belegt werden können (Laufen und Esc)
const KEY_FIXED = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape']);

function actionKey(id) {
  const own = opts.keys && opts.keys[id];
  if (own !== undefined) return own;
  const a = KEY_ACTIONS.find((x) => x.id === id);
  return a ? a.key : null;
}
// Taste -> Aktion (frisch aus den Einstellungen; wird je Tastendruck nur einmal gebaut, wenn sich etwas ändert)
let _keyMapCache = null;
function keyAction(code) {
  if (!_keyMapCache) {
    _keyMapCache = new Map();
    for (const a of KEY_ACTIONS) {
      const k = actionKey(a.id);
      if (k) _keyMapCache.set(k, a.id);
    }
  }
  return _keyMapCache.get(code) || null;
}
// Anzeige einer Taste: Digit1 -> 1, KeyQ -> Q, Space -> Leertaste
function keyLabel(code) {
  if (!code) return '–';
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Numpad\d$/.test(code)) return 'Num ' + code.slice(6);
  if (/^F\d+$/.test(code)) return code;
  const names = { Space: 'Leertaste', Tab: 'Tab', Enter: 'Enter', ShiftLeft: 'Umschalt', ShiftRight: 'Umschalt rechts', Backquote: '^', Minus: 'ß', Equal: '´', BracketLeft: 'Ü', BracketRight: '+', Semicolon: 'Ö', Quote: 'Ä', Backslash: '#', Comma: ',', Period: '.', Slash: '-', IntlBackslash: '<', CapsLock: 'Feststell' };
  return names[code] || code;
}
function setActionKey(id, code) {
  const keys = { ...(opts.keys || {}) };
  // dieselbe Taste hatte vorher eine andere Aktion: die bekommt die alte Taste dieser Aktion (tauschen)
  const before = actionKey(id);
  for (const a of KEY_ACTIONS) if (a.id !== id && actionKey(a.id) === code) keys[a.id] = before;
  keys[id] = code;
  setOpt('keys', keys);
  _keyMapCache = null;
  refreshKeyLabels();
}
function resetKeys() {
  setOpt('keys', {});
  _keyMapCache = null;
  refreshKeyLabels();
}
// Tastenzeichen an Leiste und Menü nachziehen
const MENU_KEY_BTN = { char: 'btnChar', inv: 'btnInv', ride: 'btnHorse', net: 'btnNet', social: 'btnSocial', daily: 'btnDaily', help: 'btnHelp', opts: 'btnOpts' };
function refreshKeyLabels() {
  for (const [id, btn] of Object.entries(MENU_KEY_BTN)) {
    const kbd = document.querySelector(`#${btn} kbd`);
    if (kbd) kbd.textContent = keyLabel(actionKey(id));
  }
  const hp = document.querySelector('#potHp .key');
  if (hp) hp.textContent = keyLabel(actionKey('potHp'));
  const mp = document.querySelector('#potMp .key');
  if (mp) mp.textContent = keyLabel(actionKey('potMp'));
  if (game.player) {
    ui.buildSkillBar();
    renderQuickSlots();
  }
}

// Aktion ausführen (Tastatur und freie Plätze)
function runAction(id, e) {
  const p = game.player;
  const rep = e && e.repeat;
  const m = /^skill(\d)$/.exec(id);
  if (m) {
    if (p) useSkill(skillOrder(p)[Number(m[1]) - 1]);
    return;
  }
  switch (id) {
    case 'ult': useUltimate(); break;
    case 'quick1': case 'quick2': if (!rep) useQuickSlot(id === 'quick1' ? 0 : 1); break;
    case 'attack':
      // gedrückt halten greift weiter an (spiel.js fragt „Space“ ab)
      if (!rep) tapAttack();
      input.keys.add('Space');
      if (e) e.preventDefault();
      break;
    case 'potHp': usePotion('hp'); break;
    case 'potMp': usePotion('mp'); break;
    case 'interact': interact(); break;
    case 'target': if (e) e.preventDefault(); cycleTarget(); break;
    case 'ride': if (!rep) toggleRide(); break;
    case 'char': if (!rep) ui.toggle('panelChar'); break;
    case 'inv': if (!rep) ui.toggle('panelInv'); break;
    case 'map': if (!rep) openBigMap(); break;
    case 'loot': if (!rep) ui.toggle('panelLoot'); break;
    case 'social': if (!rep) ui.toggle('panelSocial'); break;
    case 'daily': if (!rep) ui.toggle('panelDaily'); break;
    case 'net': if (!rep) ui.toggle('panelNet'); break;
    case 'help': if (!rep) ui.toggle('panelHelp'); break;
    case 'opts': if (!rep) ui.toggle('panelOpts'); break;
    case 'chat': if (netOnline()) { ui.openChat(); if (e) e.preventDefault(); } break;
  }
}

// --- Freie Plätze ---------------------------------------------------------------------------------------
const QUICK_SVG = {
  target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="3" class="fill"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/></svg>',
  interact: '<svg viewBox="0 0 24 24"><path class="fill" d="M4 5h16v10H10l-5 4v-4H4z"/><path d="M8 9h8M8 12h5"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path class="fill" d="M3 6l6-2.5 6 2.5 6-2.5v14.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 3.5v14.5M15 6v14.5"/></svg>'
};
const QUICK_ACTIONS = {
  potHp: { label: 'Lebenstrank', icon: () => `<img class="flask" src="${lootIconUrl('potHp')}" alt="">`, count: (p) => potionTotal(p, 'hp') },
  potMp: { label: 'Manatrank', icon: () => `<img class="flask" src="${lootIconUrl('potMp')}" alt="">`, count: (p) => potionTotal(p, 'mp') },
  ride: { label: 'Pferd auf/ab', menu: 'btnHorse', need: (p) => !!p.horse },
  target: { label: 'Nächstes Ziel', svg: 'target' },
  interact: { label: 'Sprechen / Aufheben', svg: 'interact' },
  map: { label: 'Große Karte', svg: 'map' },
  inv: { label: 'Inventar', menu: 'btnInv' },
  char: { label: 'Charakter', menu: 'btnChar' },
  loot: { label: 'Beutel', menu: 'btnLoot' },
  daily: { label: 'Tagesbelohnung', menu: 'btnDaily' },
  social: { label: 'Freunde & Gilde', menu: 'btnSocial' }
};
const QUICK_DEFAULT = ['ride', 'map'];

function quickOf(p) {
  if (!Array.isArray(p.quick) || p.quick.length !== 2) p.quick = QUICK_DEFAULT.slice();
  return p.quick;
}
function quickIconHtml(id) {
  const q = QUICK_ACTIONS[id];
  if (!q) return '<span class="quick-empty">+</span>';
  if (q.icon) return q.icon();
  const svg = q.svg ? QUICK_SVG[q.svg] : (document.querySelector(`#${q.menu} svg`) || { outerHTML: '' }).outerHTML;
  return `<span class="quick-svg">${svg}</span>`;
}
function useQuickSlot(k) {
  const p = game.player;
  if (!p) return;
  const id = quickOf(p)[k];
  if (!id) {
    openQuickPicker(k);
    return;
  }
  if (id === 'ride' && !p.horse) {
    ui.log('Du hast noch kein Pferd. Der Stallmeister hilft dir ab Stufe 30.', 'warn');
    return;
  }
  runAction(id);
}
function renderQuickSlots() {
  const p = game.player;
  if (!p) return;
  quickOf(p).forEach((id, k) => {
    const btn = $('quick' + (k + 1));
    if (!btn) return;
    const q = QUICK_ACTIONS[id];
    btn.classList.toggle('empty', !q);
    btn.classList.toggle('off', !!(q && q.need && !q.need(p)));
    btn.title = `${q ? q.label : 'Freier Platz'} (${keyLabel(actionKey('quick' + (k + 1)))}) – lange drücken oder Rechtsklick zum Belegen`;
    btn.innerHTML = `<span class="key">${keyLabel(actionKey('quick' + (k + 1)))}</span>${quickIconHtml(id)}` +
      (q && q.count ? `<span class="count">${q.count(p)}</span>` : '');
  });
}
// Anzahl der Tränke auf den freien Plätzen mitzählen (aus ui.update)
function updateQuickCounts() {
  const p = game.player;
  if (!p) return;
  quickOf(p).forEach((id, k) => {
    const q = QUICK_ACTIONS[id];
    if (!q || !q.count) return;
    const el = document.querySelector(`#quick${k + 1} .count`);
    const v = String(q.count(p));
    if (el && el.textContent !== v) el.textContent = v;
  });
}
function setQuickSlot(k, id) {
  const p = game.player;
  quickOf(p)[k] = id || null;
  renderQuickSlots();
  saveGame();
}
// Auswahl über dem Platz: alle Aktionen als Knöpfe, „Leer“ räumt den Platz
function openQuickPicker(k) {
  closeQuickPicker();
  const p = game.player;
  const box = document.createElement('div');
  box.className = 'quick-pick';
  box.id = 'quickPick';
  box.innerHTML = `<strong>Freier Platz ${k + 1}</strong><div class="quick-pick-grid">` +
    Object.entries(QUICK_ACTIONS).map(([id, q]) => `<button type="button" data-q="${id}" class="${quickOf(p)[k] === id ? 'on' : ''}">${quickIconHtml(id)}<span>${q.label}</span></button>`).join('') +
    `<button type="button" data-q=""><span class="quick-empty">×</span><span>Leer</span></button></div>`;
  box.addEventListener('pointerdown', (e) => e.stopPropagation());
  box.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    setQuickSlot(k, b.dataset.q);
    closeQuickPicker();
  }));
  $('hud').append(box);
  setTimeout(() => document.addEventListener('pointerdown', closeQuickPicker, { once: true }), 0);
}
function closeQuickPicker() {
  const b = $('quickPick');
  if (b) b.remove();
}
// Antippen löst aus, langes Drücken (0,5 s) oder Rechtsklick öffnet die Auswahl
function wireQuickSlot(btn, k) {
  let timer = null;
  let long = false;
  btn.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    openQuickPicker(k);
  });
  btn.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    long = false;
    timer = setTimeout(() => {
      long = true;
      if (opts.vibrate && navigator.vibrate) navigator.vibrate(20);
      openQuickPicker(k);
    }, SKILL_HOLD_MS);
  });
  const up = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!long) useQuickSlot(k);
    long = true;
  };
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointercancel', () => { if (timer) clearTimeout(timer); timer = null; long = true; });
  btn.addEventListener('click', (e) => { if (e.detail === 0) useQuickSlot(k); });
}
function setupQuickSlots() {
  wireQuickSlot($('quick1'), 0);
  wireQuickSlot($('quick2'), 1);
}

// --- Einstellungen: Tastenbelegung ------------------------------------------------------------------------
let keyCapture = null;
function keyOptionsHtml() {
  const p = game.player;
  const quick = p ? quickOf(p) : QUICK_DEFAULT;
  const sel = (k) => `<select data-qsel="${k}" aria-label="Freier Platz ${k + 1}"><option value="">Leer</option>` +
    Object.entries(QUICK_ACTIONS).map(([id, q]) => `<option value="${id}"${quick[k] === id ? ' selected' : ''}>${q.label}</option>`).join('') + '</select>';
  return `<section class="opt-group"><h3>Freie Plätze</h3>` +
    `<p class="hint-text">Zwei Plätze unten in der Leiste belegst du selbst – Trank, Pferd, Ziel, Sprechen, Karte oder ein Fenster. Im Spiel: Platz lange drücken (am PC Rechtsklick).</p>` +
    (p ? `<div class="opt-row"><div class="opt-text"><strong>Platz 1</strong></div>${sel(0)}</div><div class="opt-row"><div class="opt-text"><strong>Platz 2</strong></div>${sel(1)}</div>` : '') +
    `</section><section class="opt-group"><h3>Tastenbelegung</h3>` +
    `<p class="hint-text">Für Tastatur: Aktion antippen, dann die neue Taste drücken (Esc bricht ab). Ist die Taste schon belegt, tauschen die beiden. Laufen bleibt auf WASD und den Pfeiltasten.</p>` +
    `<div class="key-grid">${KEY_ACTIONS.map((a) => `<button type="button" class="key-row${keyCapture === a.id ? ' wait' : ''}" data-key="${a.id}"><span>${a.label}</span><kbd>${keyCapture === a.id ? 'Taste drücken …' : keyLabel(actionKey(a.id))}</kbd></button>`).join('')}</div>` +
    `<div class="opt-btns"><button type="button" class="btn btn-ghost" id="keysReset">Standard wiederherstellen</button></div></section>`;
}
function wireKeyOptions(body, rerender) {
  body.querySelectorAll('[data-qsel]').forEach((s) => s.addEventListener('change', () => setQuickSlot(Number(s.dataset.qsel), s.value)));
  body.querySelectorAll('[data-key]').forEach((b) => b.addEventListener('click', () => {
    keyCapture = keyCapture === b.dataset.key ? null : b.dataset.key;
    rerender();
  }));
  const r = $('keysReset');
  if (r) r.addEventListener('click', () => { keyCapture = null; resetKeys(); rerender(); });
}
// Nächste Taste für die gewählte Aktion abfangen (vor dem Spiel, siehe eingabe.js)
function captureKey(e) {
  if (!keyCapture) return false;
  e.preventDefault();
  e.stopPropagation();
  if (e.code !== 'Escape') {
    if (KEY_FIXED.has(e.code)) {
      ui.log(`${keyLabel(e.code)} ist zum Laufen da und kann nicht belegt werden.`, 'warn');
    } else setActionKey(keyCapture, e.code);
  }
  keyCapture = null;
  options.render();
  return true;
}
