// Infofelder (seit 10.8): Fährt die Maus über einen Gegenstand, eine Schriftrolle, eine Fertigkeit oder einen freien
// Platz, erscheint daneben ein kleines Feld mit Namen und Werten. Am Handy: Gegenstand gedrückt halten.
// Jedes Element mit data-info zeigt dessen Inhalt (fertiges HTML); gear.tile und die Leiste setzen es.

const tipBox = { el: null, target: null, hold: null, swallow: false };

const escTip = (html) => String(html).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// --- Inhalte -------------------------------------------------------------------------------------------
function itemTipHtml(item) {
  if (!item) return '';
  const p = game.player;
  if (isBook(item)) {
    const e = skillEntry(item.book);
    if (!e) return '';
    const own = p && ownBook(p, item.book);
    const idx = p ? classSkills(p).findIndex((sk) => sk.id === item.book) : -1;
    const where = `${CLASSES[e.cls].name} · ${CLASSES[e.cls].paths[e.path].name}`;
    const info = own
      ? (idx >= 0 ? `Für deine Fertigkeit (jetzt ${skillLevelText(p.skillLevels[idx])}). Lesbar ab dem Erwecken (E1).` : 'Für deine Klasse, anderer Weg.')
      : 'Gehört nicht zu deinen Fertigkeiten – verkaufen oder handeln.';
    return `<strong style="color:${own ? '#ffd34d' : '#c58cff'}">Schriftrolle: ${e.sk.name}${item.count > 1 ? ' × ' + item.count : ''}</strong>` +
      `<small>Fertigkeitsschriftrolle · ${where}</small><span>${info}</span>`;
  }
  if (!item.slot || !ITEM_TIERS[item.tier]) return '';
  const bonuses = (item.bonuses || []).map((b) => `<li>${bonusText(b)}</li>`).join('') +
    (item.specials || []).map((b) => `<li class="special">${bonusText(b, true)}</li>`).join('');
  const worn = p && Object.values(p.equipment).includes(item);
  const score = worn || !p ? 0 : compareScore(item);
  return `<strong style="color:${itemColor(item)}">${itemFullName(item)}</strong>` +
    `<small>${itemKindText(item)} · ${ITEM_TIERS[item.tier].label} · ab Stufe ${ITEM_TIERS[item.tier].level}</small>` +
    `<span>${gear.statsList(item)}</span>` + (bonuses ? `<ul>${bonuses}</ul>` : '') +
    (worn ? '<em>Angelegt</em>' : score > 0 ? '<em class="up">▲ besser als dein angelegtes Teil</em>' : score < 0 ? '<em class="down">▼ schwächer als dein angelegtes Teil</em>' : '');
}

function skillTipHtml(sk, lvl, key) {
  const p = game.player;
  const locked = p && p.level < sk.unlock;
  const stats = skillStats(sk, lvl).map(([k, v]) => (v === '' ? k : `${k} <b>${v}</b>`)).join(' · ');
  return `<strong>${sk.name}${key ? ` <kbd>${key}</kbd>` : ''}</strong>` +
    `<small>${locked ? `ab Stufe ${sk.unlock}` : `Stufe ${skillLevelText(lvl)}`} · ${p ? skillMana(sk, p) : sk.mp} Mana · ${sk.cooldown} s Abklingzeit</small>` +
    (stats ? `<span class="tip-stats">${stats}</span>` : '') + `<span>${sk.text}</span>`;
}

function ultTipHtml(u, key) {
  const p = game.player;
  return `<strong>${u.name}${key ? ` <kbd>${key}</kbd>` : ''}</strong>` +
    `<small>Ultimative Attacke · ${p && p.level < u.unlock ? `ab Stufe ${u.unlock}` : '3 Min. Abklingzeit'}</small>` +
    `<span class="tip-stats">${u.stats}</span><span>${u.text}</span>`;
}

// --- Anzeige -------------------------------------------------------------------------------------------
function tipEl() {
  if (!tipBox.el) {
    tipBox.el = document.createElement('div');
    tipBox.el.className = 'hover-tip';
    tipBox.el.hidden = true;
    document.body.append(tipBox.el);
  }
  return tipBox.el;
}
function placeTip(x, y) {
  const el = tipEl();
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = x + 16;
  let top = y + 14;
  if (left + w > vw - 6) left = x - w - 14;
  if (top + h > vh - 6) top = Math.max(6, y - h - 12);
  el.style.left = Math.max(6, left) + 'px';
  el.style.top = Math.max(6, top) + 'px';
}
function showTip(target, x, y) {
  const html = target && target.dataset.info;
  if (!html) return hideTip();
  const el = tipEl();
  if (tipBox.target !== target || el.hidden) el.innerHTML = html;
  tipBox.target = target;
  el.hidden = false;
  placeTip(x, y);
}
function hideTip() {
  tipBox.target = null;
  if (tipBox.el) tipBox.el.hidden = true;
}

function setupTips() {
  // Maus: Feld folgt dem Zeiger, verschwindet beim Verlassen oder Klicken
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const t = e.target.closest && e.target.closest('[data-info]');
    if (t) showTip(t, e.clientX, e.clientY);
    else if (tipBox.target) hideTip();
  });
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' && tipBox.target && !tipBox.el.hidden) placeTip(e.clientX, e.clientY);
  }, { passive: true });
  // Finger: Gegenstand gedrückt halten zeigt das Feld (ohne ihn zu verschieben oder zu verkaufen)
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') { hideTip(); return; }
    if (tipBox.target) hideTip();
    const t = e.target.closest && e.target.closest('.item-tile[data-info]');
    if (!t) return;
    const x = e.clientX;
    const y = e.clientY;
    clearTimeout(tipBox.hold);
    tipBox.hold = setTimeout(() => {
      tipBox.swallow = true;
      showTip(t, x, y - 40);
      if (opts.vibrate && navigator.vibrate) navigator.vibrate(15);
    }, 450);
  }, true);
  const stop = () => clearTimeout(tipBox.hold);
  document.addEventListener('pointerup', stop, true);
  document.addEventListener('pointercancel', stop, true);
  document.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse' && Math.abs(e.movementX) + Math.abs(e.movementY) > 6) stop(); }, true);
  // nach dem Halten den Klick schlucken, damit der Gegenstand nicht bewegt wird
  document.addEventListener('click', (e) => {
    if (!tipBox.swallow) return;
    tipBox.swallow = false;
    e.stopPropagation();
    e.preventDefault();
  }, true);
}

setupTips();
