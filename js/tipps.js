// Infofelder (seit 10.8): Fährt die Maus über einen Gegenstand, ein Fertigkeitsbuch, eine Fertigkeit oder einen freien
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
    // seit 14.1: Bücher gelten für E1–E10 (H mit Schriftrollen, L/V mit Seelensteinen)
    const info = own
      ? (idx < 0 ? 'Für deine Klasse, anderer Weg. Gilt für E1–E10.'
        : skillRank(p.skillLevels[idx]) > 0 ? `Deine Fertigkeit steht schon auf ${skillLevelText(p.skillLevels[idx])} – Bücher gelten nur für E1–E10 (weiter mit Schriftrollen und Seelensteinen).`
          : `Für deine Fertigkeit (jetzt ${skillLevelText(p.skillLevels[idx])}). Hebt sie um eine Stufe von E1 bis E10, lesbar ab dem Erwecken.`)
      : 'Gehört nicht zu deinen Fertigkeiten – verkaufen oder handeln.';
    return `<strong style="color:${own ? '#ffd34d' : '#c58cff'}">Fertigkeitsbuch: ${e.sk.name}${item.count > 1 ? ' × ' + item.count : ''}</strong>` +
      `<small>Fertigkeitsbuch · ${where}</small><span>${info}</span>`;
  }
  if (!item.slot || !ITEM_TIERS[item.tier]) return '';
  const bonuses = (item.bonuses || []).map((b) => `<li>${bonusText(b)}</li>`).join('') +
    (item.specials || []).map((b) => `<li class="special">${bonusText(b, true)}</li>`).join('');
  const worn = p && Object.values(p.equipment).includes(item);
  const score = worn || !p ? 0 : compareScore(item);
  // seit 13.56: Seltenheit in ihrer Farbe („Episch · Göttlich (Lv 60)“)
  return `<strong style="color:${itemColor(item)}">${itemFullName(item)}</strong>` + rarityLineHtml(item) +
    // seit 14.32: „Benötigte Stufe“ (zum Anlegen) getrennt vom Itemlevel in der Zeile darüber
    `<small>${itemKindText(item)} · ${reqLevelHtml(item, p)}</small>` +
    `<span>${gear.statsList(item)}</span>` + (bonuses ? `<ul>${bonuses}</ul>` : '') + bonusHintHtml(item, p, true) +
    setInfoHtml(item, p) + // seit 14.55: Set-Name, Teile und Stufen
    (item.legend && item.raidMat && MOB_MATS[item.raidMat] ? `<small>Ab +${LEGEND_MAT_START} braucht der Schmied ${MOB_MATS[item.raidMat].name} aus der Map des Endbosses.</small>` : '') +
    (worn ? '<em>Angelegt</em>' : score > 0 ? '<em class="up">▲ besser als dein angelegtes Teil</em>' : score < 0 ? '<em class="down">▼ schwächer als dein angelegtes Teil</em>' : '') +
    (worn || !p ? '' : ilvlCompareHtml(item, p.equipment[equipSlotOf(item)])) +
    // Verkaufswert (seit 13.5) direkt im Hinweis
    (worn ? '' : `<span class="tip-sell">Verkaufswert <b>${sellValue(item).toLocaleString('de-DE')} Gold</b></span>`);
}

// Vorräte im Inventar (seit 11.0): Tränke und Segensschriftrollen
function supplyTipHtml(x) {
  // seit 14.51: Verstärkungen, Switcher, Sternensteine in den Vorräten
  if (x.mat) return `<strong style="color:${(typeof MATERIAL_COLORS !== 'undefined' && MATERIAL_COLORS[x.mat.id]) || '#ffd34d'}">${x.mat.name} × ${x.n}</strong><small>${x.mat.tag} · für den Schmied</small><span>${x.mat.text}</span>`;
  if (!x.kind) return `<strong style="color:#ffd34d">${BLESSING.name} × ${x.n}</strong><small>Für den Schmied</small><span>${BLESSING.text}</span>`;
  const info = potionInfo(x.kind);
  const amt = x.kind === 'hp' ? x.sz.hp : x.sz.mp;
  return `<strong style="color:${info.color}">${info.name} ${x.sz.id} × ${x.n}</strong>` +
    `<small>${info.kind} (${x.sz.name}) · ab Stufe ${x.sz.level}</small>` +
    `<span>+${amt.toLocaleString('de-DE')} ${x.kind === 'hp' ? 'Leben' : 'Mana'} · verkaufen für ${potionSellValue(x.kind, x.sz).toLocaleString('de-DE')} Gold je Trank</span>`;
}

function skillTipHtml(sk, lvl, key) {
  const p = game.player;
  const locked = p && p.level < sk.unlock;
  const stats = skillStats(sk, lvl).map(([k, v]) => (v === '' ? k : `${k} <b>${v}</b>`)).join(' · ');
  const rn = skillRankName(sk, lvl);
  // seit 13.87: Abklingzeit aus skillCooldown (dieselbe Stelle wie useSkill), beim Gedrückthalten auch das laufende
  // Mana (skillManaPerSec) und dass die Abklingzeit erst nach dem Loslassen beginnt (stopChannel, eisstrahl.js)
  const perSec = p && sk.channel ? skillManaPerSec(sk, p) : 0;
  const mana = `${p ? skillMana(sk, p) : sk.mp} Mana` + (perSec ? ` + ${numDe(perSec)} je s` : '');
  return `<strong>${rn}${key ? ` <kbd>${key}</kbd>` : ''}</strong>` + (rn !== sk.name ? `<small class="tip-base">aus ${sk.name}</small>` : '') +
    `<small>${locked ? `ab Stufe ${sk.unlock}` : `Stufe ${skillLevelText(lvl)}`} · ${mana} · ${numDe(skillCooldown(sk))} s Abklingzeit${sk.channel ? ' ab dem Loslassen' : ''}` +
    // seit 13.85: globale Abklingzeit der Zauberer (applyGcd, kampf.js)
    `${p && typeof GCD_CLASSES !== 'undefined' && GCD_CLASSES.has(p.classId) ? ` · danach ${String(gcdTime(p)).replace('.', ',')} s für alle anderen Fertigkeiten` : ''}</small>` +
    (stats ? `<span class="tip-stats">${stats}</span>` : '') + `<span>${skillText(sk, lvl)}</span>` + scaleLine(sk, p) + numNote(p);
}
// seit 13.6: Schaden und Leben stehen als feste Zahlen mit den aktuellen Werten da
function numNote(p) {
  return p ? '<span class="tip-note">Zahlen mit deinen aktuellen Werten: Waffe, Ausrüstung, Boni, Status und Buffs (vor der Verteidigung des Gegners)</span>' : '';
}
// seit 13.4: womit die Fertigkeit stärker wird (Hauptwert der Klasse)
function scaleLine(sk, p) {
  const cls = (p && p.classId) || (CLASSES[sk.cls] ? sk.cls : null);
  const n = cls ? mainAttrName(cls) : '';
  return n ? `<span class="tip-scale">Wird stärker mit <b>${n}</b></span>` : '';
}

function ultTipHtml(u, key) {
  const p = game.player;
  return `<strong>${u.name}${key ? ` <kbd>${key}</kbd>` : ''}</strong>` +
    `<small>Ultimative Attacke · ${p && p.level < u.unlock ? `ab Stufe ${u.unlock}` : `${ULT_COOLDOWN} s Abklingzeit`}</small>` +
    `<span class="tip-stats">${ultStatsText(u)}</span><span>${u.text}</span>` + scaleLine(u, p) + numNote(p);
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
