// Infofelder (seit 10.8): Fährt die Maus über einen Gegenstand, ein Fertigkeitsbuch, eine Fertigkeit oder einen freien
// Platz, erscheint daneben ein kleines Feld mit Namen und Werten. Am Handy: Gegenstand gedrückt halten.
// Jedes Element mit data-info zeigt dessen Inhalt (fertiges HTML); gear.tile und die Leiste setzen es.

// cmp (seit 15.64): zweites Feld mit dem angelegten Teil desselben Platzes
const tipBox = { el: null, cmp: null, target: null, hold: null, swallow: false };

const escTip = (html) => String(html).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// --- Infofeld eines Ausrüstungsteils (seit 15.63) ---------------------------------------------------------------
// Klarer Aufbau wie in klassischen Online-Rollenspielen, aber mit eigenem Rahmen: Name in der Farbe der Seltenheit,
// Itemlevel, Einhand/Zweihand und Waffenart, Schaden mit Tempo und Schaden pro Sekunde, Grundwerte weiß, Boni grün,
// Bonus 6/7 orange, Klasse und benötigte Stufe (rot, wenn sie nicht passen), Set und Verkaufswert mit Münze.
// Gilt beim Drüberfahren, im Rucksack (auch am Handy), beim Betrachten anderer Spieler und im Handel.
const icNum = (n) => Math.round(n).toLocaleString('de-DE');
// Grundangriff mit dieser Waffe: Sekunden je Schlag (nur die Waffe, ohne Boni und Statuspunkte) und Faktor der Art
// (Dolche und Bögen treffen je Schlag schwächer, dafür öfter bzw. aus der Ferne – wie basicAttack in kampf.js)
function weaponSwing(item, st = itemStats(item)) {
  const basic = (item.cls !== 'magier' && typeof KIND_BASIC !== 'undefined' && KIND_BASIC[item.kind]) ||
    (CLASSES[item.cls] && CLASSES[item.cls].basic) || { cooldown: 0.8 };
  return { sec: basic.cooldown / Math.max(0.25, 1 + (st.atkSpeed || 0)), mul: basic.mul || 1 };
}
// o.worn: „Angelegt“ oben · o.slotName: Platz statt Einhand/Zweihand (Nebenhand) · o.numbered: Boni mit Nummer
// o.hint: freie Boni als kurze Zeile (Standard an) · o.extra: HTML vor dem Verkaufswert · o.sell: Verkaufswert zeigen
function itemCardHtml(item, p = game.player, o = {}) {
  const st = itemStats(item);
  const R = rarityInfo(item);
  const T = ITEM_TIERS[item.tier] || ITEM_TIERS[0];
  const weapon = item.slot === 'waffe';
  const k = weapon ? WEAPON_KINDS[item.kind] || { name: 'Waffe' } : null;
  // falsche Klasse oder falscher Weg (die Stufe hat ihre eigene Zeile)
  const clsBad = !!p && !canCompare(item, p);
  const row = (a, b, cls) => `<div class="ic-row"><span>${a}</span>${b ? `<span${cls ? ` class="${cls}"` : ''}>${b}</span>` : ''}</div>`;
  let h = (o.worn ? '<em class="ic-worn">Angelegt</em>' : '') +
    `<strong class="ic-name" style="color:${itemColor(item)}">${itemFullName(item)}</strong>` +
    `<small class="ic-rar"><b style="color:${R.color}">${R.name}</b> · <span>${T.label}</span></small>` +
    `<span class="ic-ilvl">Itemlevel ${itemIlvl(item)}</span>`;
  if (weapon) {
    h += row(o.slotName || (k.twoHanded ? 'Zweihand' : 'Einhand'), k.name);
    if (st.dmg) {
      const sw = weaponSwing(item, st);
      h += row(`${icNum(st.dmg[0])} – ${icNum(st.dmg[1])} Schaden`, `Tempo ${sw.sec.toFixed(2).replace('.', ',')}`);
      h += `<span class="ic-dps">(${icNum((((st.dmg[0] + st.dmg[1]) / 2) * sw.mul) / sw.sec)} Schaden pro Sekunde)</span>`;
    }
  } else {
    const who = item.cls ? CLASSES[item.cls].name : isQuiver(item) ? '' : 'alle Klassen';
    h += row(o.slotName || slotNameOf(item.slot), who, !item.cls ? 'ic-dim' : clsBad ? 'ic-bad' : '');
  }
  if (isQuiver(item)) h += `<small class="ic-note">${itemKindText(item)}</small>`;
  // Grundwerte (das Angriffstempo einer Waffe steckt schon im Tempo)
  const base = sortedStats(st).filter(([s]) => s !== 'dmg' && !(weapon && s === 'atkSpeed'));
  if (base.length) h += `<div class="ic-stats">${base.map(([s, v]) => `<span>${statText(s, v)}</span>`).join('')}</div>`;
  const bn = (i) => (o.numbered ? `<i class="bn">${i}</i>` : '');
  const bon = (item.bonuses || []).map((b, i) => `<span class="ic-bonus">${bn(i + 1)}<span>${bonusText(b)}</span></span>`).join('') +
    (item.specials || []).map((b, i) => `<span class="ic-special">${bn(6 + i)}<span>${bonusText(b, true)}</span></span>`).join('');
  if (bon) h += `<div class="ic-bonuses">${bon}</div>`;
  if (o.hint !== false) {
    const f = bonusFreeInfo(item);
    const m = f && MATERIALS.find((x) => x.id === f.mat);
    if (m) h += `<small class="ic-free"><span>✦ ${f.text}</span> <span>(${m.name})</span></small>`;
  }
  if (weapon && item.cls && CLASSES[item.cls]) {
    const path = k.path != null && CLASSES[item.cls].paths[k.path] ? CLASSES[item.cls].paths[k.path].name : '';
    h += `<span class="ic-class${clsBad ? ' ic-bad' : ''}"><span>Klasse: ${CLASSES[item.cls].name}</span>${path ? ` <span>(${path})</span>` : ''}</span>`;
  }
  h += `<span class="ic-req">${reqLevelHtml(item, p)}</span>`;
  if (item.legend && item.raidMat && MOB_MATS[item.raidMat]) {
    h += `<small class="ic-note">Ab +${LEGEND_MAT_START} braucht der Schmied ${MOB_MATS[item.raidMat].name} aus der Map des Endbosses.</small>`;
  }
  h += setInfoHtml(item, p) + (o.extra || '');
  if (o.sell) h += `<div class="ic-sell"><span>Verkaufswert:</span> <b>${icNum(sellValue(item))}</b><i class="ic-coin"></i></div>`;
  return `<div class="icard">${h}</div>`;
}

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
  const worn = p && Object.values(p.equipment).includes(item);
  const score = worn || !p ? 0 : compareGrade(item);
  // seit 15.63 im klaren Aufbau (itemCardHtml); Vergleich mit dem angelegten Teil und Verkaufswert (seit 13.5) unten
  const cmp = worn ? '' : (score > 0 ? `<em class="up">${compareArrows(score)} ${CMP_WORDS[score]} besser als dein angelegtes Teil</em>` : score < 0 ? `<em class="down">${compareArrows(score)} ${CMP_WORDS[-score]} schwächer als dein angelegtes Teil</em>` : '') +
    (p ? ilvlCompareHtml(item, p.equipment[equipSlotOf(item)]) : '');
  return itemCardHtml(item, p, { worn, sell: !worn, extra: cmp ? `<div class="ic-cmp">${cmp}</div>` : '' });
}

// Vorräte im Inventar (seit 11.0): Tränke und Segensschriftrollen
function supplyTipHtml(x) {
  // seit 14.51: Verstärkungen, Switcher, Sternensteine in den Vorräten
  if (x.mat) return `<strong style="color:${(typeof MATERIAL_COLORS !== 'undefined' && MATERIAL_COLORS[x.mat.id]) || '#ffd34d'}">${x.mat.name} × ${x.n}</strong><small>${x.mat.tag} · ${x.use === 'ring' ? 'antippen zum Anlegen' : x.use === 'skill' ? 'für die Fertigkeiten' : 'für den Schmied'}</small><span>${x.mat.text}</span>`;
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
// Vergleichsfeld (seit 15.64): fährt man über ein Teil in der Tasche, beim Händler oder im Auktionshaus, steht das
// angelegte Teil desselben Platzes daneben (wie in klassischen MMOs) – auf der vom Zeiger abgewandten Seite
function tipCmpEl() {
  if (!tipBox.cmp) {
    tipBox.cmp = document.createElement('div');
    tipBox.cmp.className = 'hover-tip item-tip tip-cmp';
    tipBox.cmp.hidden = true;
    document.body.append(tipBox.cmp);
  }
  return tipBox.cmp;
}
function placeTip(x, y) {
  const el = tipEl();
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const c = tipBox.cmp && !tipBox.cmp.hidden ? tipBox.cmp : null;
  const cw = c ? c.offsetWidth + 6 : 0;
  const H = Math.max(h, c ? c.offsetHeight : 0);
  // beide rechts vom Zeiger, sonst beide links davon; reicht keine Seite für beide, steht das Feld wie bisher und
  // der Vergleich auf der Seite mit Platz (oder gar nicht)
  let left = x + 16;
  let side = 1;
  if (left + w + cw > vw - 6) {
    left = x - w - 14;
    side = -1;
    if (left - cw < 6) {
      left = Math.max(6, x + 16 + w <= vw - 6 ? x + 16 : x - w - 14);
      side = left + w + cw <= vw - 6 ? 1 : left - cw >= 6 ? -1 : 0;
    }
  }
  let top = y + 14;
  if (top + H > vh - 6) top = Math.max(6, y - H - 12);
  left = Math.max(6, left);
  top = Math.max(6, top);
  el.style.left = left + 'px';
  el.style.top = top + 'px';
  if (c) {
    c.style.visibility = side ? '' : 'hidden';
    c.style.left = (side > 0 ? left + w + 6 : left - cw) + 'px';
    c.style.top = Math.max(6, Math.min(top, vh - 6 - c.offsetHeight)) + 'px';
  }
}
function showTip(target, x, y) {
  const html = target && target.dataset.info;
  if (!html) return hideTip();
  const el = tipEl();
  if (tipBox.target !== target || el.hidden) {
    el.innerHTML = html;
    // Ausrüstung (seit 15.63) im eigenen dunklen Rahmen mit silbernem Rand
    el.classList.toggle('item-tip', html.startsWith('<div class="icard"'));
    // das angelegte Teil daneben (data-cmp setzt gear.tile, seit 15.64)
    const p = game.player;
    const worn = target.dataset.cmp && p && p.equipment ? p.equipment[target.dataset.cmp] : null;
    if (worn) {
      const c = tipCmpEl();
      c.innerHTML = itemTipHtml(worn);
      c.hidden = false;
    } else if (tipBox.cmp) tipBox.cmp.hidden = true;
  }
  tipBox.target = target;
  el.hidden = false;
  placeTip(x, y);
}
function hideTip() {
  tipBox.target = null;
  if (tipBox.el) tipBox.el.hidden = true;
  if (tipBox.cmp) tipBox.cmp.hidden = true;
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
