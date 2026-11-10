// Vorschau beim Verbessern einer Fertigkeit (seit 14.32): Fährt die Maus über das Plus in der Leiste oder über einen
// Knopf „Verbessern / Buch lesen / Erwecken …“ im Charakterfenster, erscheint der Vergleich alte → neue Stufe.
// Klick bzw. Antippen öffnet ihn fest mit „Bestätigen“ und „Abbrechen“; erst „Bestätigen“ (oder Enter) verbessert.
//
// Rechnung: dieselbe wie im Infofeld (skillStats in oberflaeche.js, seit 13.6 echte Zahlen aus Angriff, Waffe,
// Ausrüstung, Boni, Status, Buffs × Faktor × Fertigkeitsschaden). Verglichen werden die Zeilen von skillStats für die
// jetzige und die nächste Stufe; gezeigt werden nur Zeilen, die sich wirklich ändern, mit Zuwachs als Zahl und in
// Prozent. Mana und Abklingzeit hängen nicht an der Fertigkeitsstufe (skillMana, skillCooldown) und tauchen darum
// nicht auf. Die Vorschau rechnet zweimal je Sekunde neu (Ausrüstung gewechselt, Buff abgelaufen …).
//
// Es gibt keinen Spielserver: Das Verbessern läuft wie bisher lokal über upgradeSkill (prüft Punkte, Bücher,
// Höchststufe über skillActions). Gegen doppeltes Auslösen merkt sich der Knopf die Stufe, für die die Vorschau
// gilt – passt sie nicht mehr, wird nichts verbessert, sondern die Vorschau neu gezeigt.

const SKV = { el: null, i: -1, type: null, anchor: null, pinned: false, hideT: 0, timer: 0, html: '', busyUntil: 0, note: '' };
// Zeilen, die Schaden zeigen (für die Hervorhebung oben)
const SKV_DMG = new Set(['Schaden', 'Welle', 'Biss', 'Hieb', 'Feuerball', 'Faustschlag', 'Feueratem', 'Splitter', 'Bodenstampfer',
  'Pulse', 'Lanzen', 'Geister', 'Blitze', 'Schrei', 'Tornados', 'Zaps', 'Zum Schluss', 'Zerdrücken', 'Entladung', 'Explosion',
  'Auf dem Weg', 'Nachhall', 'Brand', 'Brand gesamt', 'Blutung', 'Felsen', 'Blitzspur', 'Seelenwelle', 'Zerspringen']);

// Zahlen in deutscher Schreibweise aus einem Wert lesen: „1.234“, „29,6 %“, „8 × 1.308“
function skvNums(v) {
  const out = [];
  String(v).replace(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g, (m) => { out.push(Number(m.replace(/\./g, '').replace(',', '.'))); return m; });
  return out;
}
function skvNum(n) {
  const a = Math.abs(n);
  if (a >= 100) return Math.round(a).toLocaleString('de-DE');
  return String(Math.round(a * 10) / 10).replace('.', ',');
}

// Ziel-Stufe einer Aktion aus skillActions (point, book, rankup)
function skillUpgradeTarget(lvl, act) {
  if (!act || act.type === 'point') return nextSkillLevel(lvl);
  if (act.type === 'book') return lvl < MAX_SKILL_LEVEL ? lvl + 1 : null;
  const r = skillRank(lvl);
  const next = SKILL_RANKS[r + 1];
  return next ? next.from : null;
}

// Unterschied zweier Zeilenlisten von skillStats: nur geänderte Werte
function skillStatDiff(now, next) {
  const key = (list) => {
    const seen = {};
    return list.map(([k, v]) => { seen[k] = (seen[k] || 0) + 1; return { id: k + '#' + seen[k], k, v }; });
  };
  const a = key(now);
  const b = key(next);
  const old = new Map(a.map((x) => [x.id, x]));
  const rows = [];
  for (const x of b) {
    const o = old.get(x.id);
    old.delete(x.id);
    if (o && o.v === x.v) continue;
    const row = { k: x.k, from: o ? o.v : null, to: x.v, deltas: [], dmg: SKV_DMG.has(x.k) };
    if (o) {
      const na = skvNums(o.v);
      const nb = skvNums(x.v);
      if (na.length === nb.length) {
        const pct = /%/.test(x.v);
        for (let j = 0; j < na.length; j++) {
          if (na[j] === nb[j]) continue;
          const d = nb[j] - na[j];
          row.deltas.push({ abs: (d < 0 ? '−' : '+') + skvNum(d) + (pct ? ' %-Pkt.' : ''), pct: na[j] ? (d < 0 ? '−' : '+') + skvNum(d / na[j] * 100) + ' %' : '' });
        }
      }
    }
    rows.push(row);
  }
  for (const o of old.values()) rows.push({ k: o.k, from: o.v, to: null, deltas: [], dmg: false });
  // Schaden zuerst, sonst Reihenfolge wie im Infofeld
  return rows.filter((r) => r.dmg).concat(rows.filter((r) => !r.dmg));
}

// Kosten und Grund, warum es (noch) nicht geht
function skvCostHtml(p, sk, act) {
  if (!act) return '';
  let cost = '';
  if (act.type === 'point') cost = `Kosten: 1 Fertigkeitspunkt · frei: ${p.skillPoints || 0}`;
  else if (act.type === 'book') {
    const it = SKILL_ITEMS[act.item];
    cost = `Kosten: 1 ${it.name} · vorhanden: ${skillItemHave(p, act.item, sk.id)}`;
  } else {
    const next = SKILL_RANKS[skillRank(p.skillLevels[classSkills(p).indexOf(sk)]) + 1];
    if (next && next.books) {
      const it = SKILL_ITEMS[next.item];
      cost = `Kosten: ${next.books} ${next.books > 1 ? it.many : it.name} · vorhanden: ${skillItemHave(p, next.item, sk.id)}`;
    } else cost = 'Kostenlos';
  }
  return `<small class="skv-cost">${escapeHtml(cost)}</small>` + (act.skip && act.ok ? `<small class="skv-cost">${escapeHtml(act.skip)}</small>` : '') +
    (!act.ok && act.why ? `<small class="skv-why">${escapeHtml(act.why)}</small>` : '');
}

function skvHtml() {
  const p = game.player;
  if (!p || SKV.i < 0) return '';
  const sk = classSkills(p)[SKV.i];
  if (!sk) return '';
  const lvl = p.skillLevels[SKV.i];
  const acts = skillActions(p, SKV.i);
  const act = acts.find((a) => a.type === SKV.type) || null;
  const nl = p.level < sk.unlock ? null : skillUpgradeTarget(lvl, act);
  const name = skillRankName(sk, lvl);
  let html = `<strong class="skv-title">${escapeHtml(name)}</strong>`;
  if (p.level < sk.unlock) return html + `<small class="skv-why">Ab Stufe ${sk.unlock}</small>`;
  if (nl == null) return html + `<small>Stufe ${skillLevelText(lvl)}</small><small class="skv-why">Höchste Stufe erreicht</small>`;
  const newName = skillRankName(sk, nl);
  html += `<div class="skv-lvl"><span>Stufe</span> <b>${skillLevelText(lvl)}</b> <i>→</i> <b class="up">${skillLevelText(nl)}</b></div>`;
  if (newName !== name) html += `<small class="skv-rename">${escapeHtml(name)} → ${escapeHtml(newName)}</small>`;
  const rows = skillStatDiff(skillStats(sk, lvl), skillStats(sk, nl));
  if (!rows.length) html += '<small>Keine Werte ändern sich auf dieser Stufe.</small>';
  else {
    html += '<table class="skv-rows"><tbody>' + rows.map((r) => {
      const d = r.deltas.length ? r.deltas.map((x) => `<em class="up">${x.abs}</em>${x.pct ? ` <em class="up">(${x.pct})</em>` : ''}`).join(' · ') : '';
      const from = r.from == null ? '<span class="skv-new">neu</span>' : `<span>${escapeHtml(r.from || '–')}</span>`;
      const to = r.to == null ? '<span class="skv-gone">entfällt</span>' : `<b>${escapeHtml(r.to || '✓')}</b>`;
      return `<tr class="${r.dmg ? 'skv-dmg' : ''}"><th>${escapeHtml(r.k)}</th><td>${from} <i>→</i> ${to}${d ? `<br>${d}` : ''}</td></tr>`;
    }).join('') + '</tbody></table>';
  }
  html += '<small class="skv-note">Grundwerte mit deinen aktuellen Werten (Waffe, Ausrüstung, Boni, Status, Buffs) vor der Verteidigung und den Resistenzen des Gegners. Im Kampf kommen Zufall und kritische Treffer dazu.</small>';
  html += skvCostHtml(p, sk, act);
  if (SKV.note) html += `<small class="skv-why">${escapeHtml(SKV.note)}</small>`;
  if (SKV.pinned) {
    const ok = !!(act && act.ok);
    html += `<div class="skv-btns"><button type="button" class="mini-btn" data-skv="no">Abbrechen</button>` +
      `<button type="button" class="mini-btn primary" data-skv="ok" data-lvl="${lvl}" ${ok ? '' : 'disabled'}>Bestätigen</button></div>`;
  } else html += `<small class="skv-hint">${IS_PC ? 'Klicken, um zu bestätigen' : 'Antippen, um zu bestätigen'}</small>`;
  return html;
}

function skvRender() {
  if (!SKV.el) return;
  const html = skvHtml();
  if (html === SKV.html) return;
  SKV.html = html;
  SKV.el.innerHTML = html;
  skvPlace();
}

// Über dem Knopf, sonst darunter; immer ganz im Bild
function skvPlace() {
  const el = SKV.el;
  if (!el || el.hidden) return;
  let a = SKV.anchor;
  if (!a || !a.isConnected) a = SKV.anchor = skvFindAnchor();
  const r = a && a.isConnected ? a.getBoundingClientRect() : null;
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let x = r ? r.left + r.width / 2 - w / 2 : (vw - w) / 2;
  let y = r ? r.top - h - 8 : (vh - h) / 2;
  if (r && y < 8) y = r.bottom + 8;
  x = Math.max(8, Math.min(vw - w - 8, x));
  y = Math.max(8, Math.min(vh - h - 8, y));
  el.style.left = Math.round(x) + 'px';
  el.style.top = Math.round(y) + 'px';
}
// Die Leiste und das Charakterfenster werden oft neu gebaut: denselben Knopf wiederfinden
function skvFindAnchor() {
  return document.querySelector(`#charBody [data-upgrade="${SKV.i}"][data-act="${SKV.type}"]`) ||
    (document.getElementById('skill' + SKV.i) && document.getElementById('skill' + SKV.i).parentElement.querySelector('.plus')) || null;
}

function skillPreviewOpen(i, type, anchor, pinned) {
  if (!SKV.el) {
    const el = document.createElement('div');
    el.id = 'skillPreview';
    el.className = 'skill-preview';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Vorschau der nächsten Stufe');
    el.hidden = true;
    document.body.append(el);
    el.addEventListener('pointerenter', () => clearTimeout(SKV.hideT));
    el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !SKV.pinned) skillPreviewHideSoon(); });
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const b = e.target.closest('[data-skv]');
      if (!b) return;
      if (b.dataset.skv === 'no') skillPreviewClose();
      else skillPreviewConfirm(b);
    });
    SKV.el = el;
    // Klick daneben schließt eine fest geöffnete Vorschau
    document.addEventListener('pointerdown', (e) => {
      if (!SKV.el || SKV.el.hidden) return;
      if (SKV.el.contains(e.target) || (SKV.anchor && SKV.anchor.contains(e.target))) return;
      skillPreviewClose();
    }, true);
    document.addEventListener('keydown', (e) => {
      if (!SKV.el || SKV.el.hidden || !SKV.pinned) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); skillPreviewClose(); }
      else if (e.key === 'Enter' && !(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) {
        const b = SKV.el.querySelector('[data-skv="ok"]');
        if (b && !b.disabled) { e.preventDefault(); e.stopPropagation(); skillPreviewConfirm(b); }
      }
    }, true);
    window.addEventListener('resize', skvPlace);
  }
  clearTimeout(SKV.hideT);
  // dieselbe Vorschau schon fest offen: Klick auf das Plus schließt sie wieder
  if (pinned && SKV.pinned && !SKV.el.hidden && SKV.i === i && SKV.type === type) {
    skillPreviewClose();
    return;
  }
  if (SKV.pinned && !pinned && !SKV.el.hidden) return; // eine feste Vorschau nicht durch Darüberfahren ersetzen
  if (SKV.i !== i || SKV.type !== type) SKV.note = '';
  SKV.i = i;
  SKV.type = type;
  SKV.anchor = anchor;
  SKV.pinned = !!pinned;
  SKV.html = '';
  SKV.el.classList.toggle('pinned', SKV.pinned);
  SKV.el.hidden = false;
  document.body.classList.add('skv-open');
  skvRender();
  clearInterval(SKV.timer);
  SKV.timer = setInterval(skvRender, 500);
  if (SKV.pinned) {
    const ok = SKV.el.querySelector('[data-skv="ok"]');
    if (ok && !ok.disabled && IS_PC) ok.focus({ preventScroll: true });
  }
}

function skillPreviewHideSoon() {
  clearTimeout(SKV.hideT);
  SKV.hideT = setTimeout(() => { if (!SKV.pinned) skillPreviewClose(); }, 180);
}

function skillPreviewClose() {
  clearTimeout(SKV.hideT);
  clearInterval(SKV.timer);
  SKV.timer = 0;
  SKV.pinned = false;
  SKV.note = '';
  SKV.html = '';
  if (SKV.el) SKV.el.hidden = true;
  document.body.classList.remove('skv-open');
}

// Bestätigen: nur, wenn die Stufe noch die der Vorschau ist (kein zweites Verbessern durch Doppelklick)
function skillPreviewConfirm(btn) {
  const p = game.player;
  if (!p || SKV.i < 0 || performance.now() < SKV.busyUntil) return;
  const i = SKV.i;
  const lvl = p.skillLevels[i];
  if (Number(btn.dataset.lvl) !== lvl) {
    SKV.note = 'Die Werte haben sich geändert – bitte die neue Vorschau prüfen.';
    SKV.html = '';
    skvRender();
    return;
  }
  SKV.busyUntil = performance.now() + 400;
  btn.disabled = true;
  upgradeSkill(i, SKV.type);
  if (p.skillLevels[i] === lvl) {
    // nicht verbessert (Punkt/Buch fehlt inzwischen): Grund zeigen
    SKV.note = 'Nicht verbessert – die Voraussetzungen fehlen.';
    SKV.html = '';
    skvRender();
    return;
  }
  skillPreviewClose();
}

// Plus in der Leiste und Knöpfe im Charakterfenster: Darüberfahren zeigt, Klick/Antippen öffnet fest
function skillPreviewBind(el, i, type) {
  el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') skillPreviewOpen(i, type, el, false); });
  el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !SKV.pinned) skillPreviewHideSoon(); });
  el.addEventListener('focus', () => { if (el.matches(':focus-visible')) skillPreviewOpen(i, type, el, false); });
  el.addEventListener('blur', () => { if (!SKV.pinned) skillPreviewHideSoon(); });
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    skillPreviewOpen(i, type, el, true);
  });
}
