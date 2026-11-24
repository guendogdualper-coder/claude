// Juwelen und Sockel, Aufstieg legendärer Teile (seit 15.76, docs/endgame-langzeit.md) – beides beim Veredler.
// Sockel: Ewige Teile (Lv 80, episch oder legendär) bekommen am Veredler Sockel – die Waffe zwei, Rüstung und Helm je
// einen (höchstens vier Juwelen je Figur). Juwelen in fünf Arten und drei Stufen, drei gleiche verschmelzen zur nächsten.
// Aufstieg: ein legendäres Ewig-Teil auf +20, das voll veredelt ist, steigt bis zu dreimal auf (Grundwerte je +3 %).
// Juwelen liegen in p.juwelen = { rubin1: Anzahl, … }; am Teil item.sock (offene Sockel) und item.gems (Juwel je Sockel).
const JUWEL = {
  arten: {
    rubin: { name: 'Rubin', farbe: '#e0344a', eff: 'Schaden', per: [0.005, 0.01, 0.015] },
    saphir: { name: 'Saphir', farbe: '#3a72e8', eff: 'Leben', per: [0.005, 0.01, 0.015] },
    smaragd: { name: 'Smaragd', farbe: '#2fb86a', eff: 'Abwehr', per: [0.01, 0.02, 0.03] },
    topas: { name: 'Topas', farbe: '#f0b429', eff: 'Gold von Monstern', per: [0.04, 0.08, 0.12] },
    amethyst: { name: 'Amethyst', farbe: '#9a5ae8', eff: 'Seelensplitter', per: [0.04, 0.08, 0.12] }
  },
  stufen: ['I', 'II', 'III'],
  slots: { waffe: 2, ruestung: 1, helm: 1 },
  open: [{ gold: 1000000, kerne: 5 }, { gold: 3000000, kerne: 10 }],
  combine: [200000, 1000000], // Gold fürs Verschmelzen (I → II, II → III)
  remove: 500000
};
const AUFST = { max: 3, per: 0.03, gold: [10000000, 20000000, 40000000], kerne: [10, 15, 20], stein: [2, 3, 4] };
if (typeof SAVE_FIELDS !== 'undefined' && !SAVE_FIELDS.includes('juwelen')) SAVE_FIELDS.push('juwelen');

const JUWEL_IDS = Object.keys(JUWEL.arten).flatMap((a) => [1, 2, 3].map((g) => a + g));
const juwelArt = (id) => JUWEL.arten[String(id).replace(/\d$/, '')] || null;
const juwelGrad = (id) => Math.max(1, Math.min(3, +String(id).slice(-1) || 1));
const juwelName = (id) => (juwelArt(id) ? `${juwelArt(id).name} ${JUWEL.stufen[juwelGrad(id) - 1]}` : '');
const juwelPct = (v) => (Math.round(v * 1000) / 10).toLocaleString('de-DE') + ' %';
const juwelEffText = (id) => (juwelArt(id) ? `+${juwelPct(juwelArt(id).per[juwelGrad(id) - 1])} ${juwelArt(id).eff}` : '');
function juwelState(p) {
  p = p || game.player;
  if (!p.juwelen || typeof p.juwelen !== 'object') p.juwelen = {};
  return p.juwelen;
}
// Symbol: geschliffener Stein in der Farbe der Art, Punkte für die Stufe
const JUWEL_ICON = {};
function juwelIcon(id) {
  if (JUWEL_ICON[id]) return JUWEL_ICON[id];
  const A = juwelArt(id);
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const g = c.getContext('2d');
  const col = A ? A.farbe : '#888';
  g.translate(24, 22);
  g.fillStyle = col;
  g.strokeStyle = 'rgba(0,0,0,.55)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-14, -6); g.lineTo(-7, -14); g.lineTo(7, -14); g.lineTo(14, -6); g.lineTo(0, 16); g.closePath();
  g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.45)';
  g.beginPath(); g.moveTo(-7, -14); g.lineTo(0, -6); g.lineTo(-14, -6); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,.2)';
  g.beginPath(); g.moveTo(-14, -6); g.lineTo(14, -6); g.lineTo(0, 16); g.closePath(); g.fill();
  g.fillStyle = 'rgba(0,0,0,.18)';
  g.beginPath(); g.moveTo(0, -6); g.lineTo(14, -6); g.lineTo(0, 16); g.closePath(); g.fill();
  const n = juwelGrad(id);
  g.fillStyle = '#ffe9a0';
  for (let k = 0; k < n; k++) { g.beginPath(); g.arc((k - (n - 1) / 2) * 8, 22, 2.6, 0, Math.PI * 2); g.fill(); }
  return (JUWEL_ICON[id] = c.toDataURL());
}
function juwelAdd(id, n = 1) {
  if (!juwelArt(id) || !(n > 0)) return;
  const J = juwelState();
  J[id] = (J[id] | 0) + n;
  ui.loot(juwelName(id), n, juwelIcon(id), juwelArt(id).farbe);
}
// zufälliges Juwel; grad 2: zu 25 % Stufe II
function juwelDrop(grad = 1) {
  const arten = Object.keys(JUWEL.arten);
  const a = arten[randInt(0, arten.length - 1)];
  juwelAdd(a + (grad >= 2 && Math.random() < 0.25 ? 2 : 1), 1);
}

// --- Sockel am Teil ------------------------------------------------------------------------------------------------
const juwelMax = (item) => (item && item.tier === 9 && rarityOf(item) >= 3 ? JUWEL.slots[item.slot] || 0 : 0);
const juwelOpenN = (item) => Math.min(juwelMax(item), Math.max(0, (item && item.sock) | 0));
function juwelGems(item) {
  const n = juwelOpenN(item);
  const g = Array.isArray(item.gems) ? item.gems : [];
  return Array.from({ length: n }, (_, i) => (juwelArt(g[i]) ? g[i] : null));
}
function juwelOpen(item) {
  const p = game.player;
  const n = juwelOpenN(item);
  if (n >= juwelMax(item)) return { error: 'Mehr Sockel gehen nicht.' };
  const c = JUWEL.open[n];
  if (p.gold < c.gold || (p.materials.aetherkern || 0) < c.kerne) return { error: `Ein Sockel kostet ${c.gold.toLocaleString('de-DE')} Gold und ${c.kerne} Ätherkerne.` };
  p.gold -= c.gold;
  p.materials.aetherkern -= c.kerne;
  item.sock = n + 1;
  item.gems = juwelGems(item);
  saveGame();
  return { n: n + 1 };
}
function juwelInsert(item, i, id) {
  const J = juwelState();
  const gems = juwelGems(item);
  if (i < 0 || i >= gems.length || gems[i] || !(J[id] > 0)) return { error: 'Das geht nicht.' };
  J[id]--;
  gems[i] = id;
  item.gems = gems;
  game.stats = playerStats(game.player);
  saveGame();
  return { id };
}
function juwelRemove(item, i) {
  const p = game.player;
  const gems = juwelGems(item);
  if (!gems[i]) return { error: 'Der Sockel ist leer.' };
  if (p.gold < JUWEL.remove) return { error: `Herausnehmen kostet ${JUWEL.remove.toLocaleString('de-DE')} Gold.` };
  p.gold -= JUWEL.remove;
  const id = gems[i];
  gems[i] = null;
  item.gems = gems;
  juwelState()[id] = (juwelState()[id] | 0) + 1;
  game.stats = playerStats(p);
  saveGame();
  return { id };
}
function juwelCombine(id) {
  const p = game.player;
  const J = juwelState();
  const g = juwelGrad(id);
  if (g >= 3 || (J[id] | 0) < 3) return { error: 'Dafür braucht es drei gleiche Juwelen (bis Stufe II).' };
  const gold = JUWEL.combine[g - 1];
  if (p.gold < gold) return { error: `Verschmelzen kostet ${gold.toLocaleString('de-DE')} Gold.` };
  p.gold -= gold;
  J[id] -= 3;
  const to = id.slice(0, -1) + (g + 1);
  J[to] = (J[to] | 0) + 1;
  saveGame();
  return { to };
}
// Summe der eingesetzten Juwelen (angelegte Teile)
function juwelSum(p) {
  const s = { Schaden: 0, Leben: 0, Abwehr: 0, 'Gold von Monstern': 0, Seelensplitter: 0, n: 0 };
  const eq = (p && p.equipment) || {};
  for (const sl in eq) {
    const it = eq[sl];
    // nur auf ihrem eigenen Platz (ein zweiter Dolch oder Zweihänder in der Nebenhand zählt nicht)
    if (!it || !JUWEL.slots[sl] || !juwelMax(it)) continue;
    for (const id of juwelGems(it)) {
      if (!id) continue;
      const A = juwelArt(id);
      s[A.eff] += A.per[juwelGrad(id) - 1];
      s.n++;
    }
  }
  return s;
}

// --- Aufstieg ------------------------------------------------------------------------------------------------------
const aufstOf = (item) => (item && item.tier === 9 && rarityOf(item) >= 4 ? Math.max(0, Math.min(AUFST.max, item.asc | 0)) : 0);
function aufstReady(item) {
  return {
    leg: !!item && item.tier === 9 && rarityOf(item) >= 4,
    plus: !!item && item.plus >= MAX_PLUS,
    ved: !!item && typeof e80Ved === 'function' && e80Ved(item) >= E80.ved.max
  };
}
function aufstUp(item) {
  const p = game.player;
  const r = aufstReady(item);
  const a = aufstOf(item);
  if (!r.leg || !r.plus || !r.ved) return { error: 'Nur legendäre Ewig-Teile auf +20, die voll veredelt sind.' };
  if (a >= AUFST.max) return { error: 'Höchster Aufstieg erreicht.' };
  const c = { gold: AUFST.gold[a], kerne: AUFST.kerne[a], stein: AUFST.stein[a] };
  if (p.gold < c.gold || (p.materials.aetherkern || 0) < c.kerne || (p.materials.seelenstein || 0) < c.stein) return { error: 'Dafür reicht es noch nicht.' };
  p.gold -= c.gold;
  p.materials.aetherkern -= c.kerne;
  p.materials.seelenstein -= c.stein;
  item.asc = a + 1;
  game.stats = playerStats(p);
  saveGame();
  return { to: a + 1 };
}
const aufstStars = (a) => '✦'.repeat(a) + '✧'.repeat(Math.max(0, AUFST.max - a));

// --- Wirkung -----------------------------------------------------------------------------------------------------------
const _juwelRarityStatMul = rarityStatMul;
rarityStatMul = function (item) {
  const r = _juwelRarityStatMul(item);
  const a = aufstOf(item);
  return a ? r * (1 + AUFST.per * a) : r;
};
const _juwelPlayerStats = playerStats;
playerStats = function (p) {
  const s = _juwelPlayerStats(p);
  if (!p || !p.equipment) return s;
  const J = juwelSum(p);
  if (!J.n) return s;
  if (J.Schaden > 0) {
    const k = 1 + J.Schaden;
    s.atk = Math.round(s.atk * k);
    if (s.wMax) {
      s.wMin = Math.round(s.wMin * k);
      s.wMax = Math.round(s.wMax * k);
      s.wAvg = Math.round((s.wAvg || 0) * k);
    }
    s.skillPower = Math.round((s.skillPower || s.atk * (s.skillDmg || 1)) * k);
  }
  if (J.Leben > 0) s.maxHp = Math.round(s.maxHp * (1 + J.Leben));
  if (J.Abwehr > 0) s.def = Math.round(s.def * (1 + J.Abwehr));
  s.goldFind = (s.goldFind || 0) + J['Gold von Monstern'];
  s.juwelSplit = J.Seelensplitter;
  return s;
};
const _juwelGiveSplinters = giveSplinters;
giveSplinters = function (n) {
  const f = (game.stats && game.stats.juwelSplit) || 0;
  if (f > 0 && n > 0) {
    const x = n * (1 + f);
    n = Math.floor(x) + (Math.random() < x - Math.floor(x) ? 1 : 0);
  }
  return _juwelGiveSplinters(n);
};
// Zeile im Hinweis (unter der Seltenheit): Aufstieg und Sockel
function juwelLineHtml(item) {
  const parts = [];
  const a = aufstOf(item);
  if (a) parts.push(`<span class="jw-asc">Aufgestiegen <b>${aufstStars(a)}</b> (Grundwerte +${Math.round(AUFST.per * a * 100)} %)</span>`);
  if (juwelOpenN(item)) {
    parts.push('<span class="jw-sock">' + juwelGems(item).map((id) => (id ? `<b style="color:${juwelArt(id).farbe}">◆ ${juwelName(id)}</b> <span>${juwelEffText(id)}</span>` : '<span class="jw-empty">◇ leerer Sockel</span>')).join(' · ') + '</span>');
  }
  return parts.length ? `<small class="e80-line jw-line">${parts.join('<br>')}</small>` : '';
}
const _juwelRarityLine = rarityLineHtml;
rarityLineHtml = function (item) {
  return _juwelRarityLine(item) + juwelLineHtml(item);
};
// Handel, Post, Auktionshaus, Lager: Sockel und Aufstieg bleiben (nur gültige Werte)
if (typeof itemClean === 'function') {
  const _juwelClean = itemClean;
  itemClean = function (raw) {
    const it = _juwelClean(raw);
    if (!it || it.book != null || !raw) return it;
    const max = juwelMax(it);
    if (max && Number.isInteger(raw.sock) && raw.sock > 0) {
      it.sock = Math.min(max, raw.sock);
      if (Array.isArray(raw.gems)) it.gems = Array.from({ length: it.sock }, (_, i) => (JUWEL_IDS.includes(raw.gems[i]) ? raw.gems[i] : null));
    }
    if (Number.isInteger(raw.asc) && raw.asc > 0 && it.tier === 9 && it.rarity >= 4 && it.plus >= MAX_PLUS) it.asc = Math.min(AUFST.max, raw.asc);
    return it;
  };
}

// --- Woher kommen Juwelen? Weltboss, Truhen der Aufträge, Turm, Lv-80-Seelensteine -------------------------------------
if (typeof weltbossLoot === 'function') {
  const _juwelWb = weltbossLoot;
  weltbossLoot = function (m) {
    const r = _juwelWb(m);
    juwelDrop(2);
    return r;
  };
}
if (typeof aufgGive === 'function') {
  const _juwelAufgGive = aufgGive;
  aufgGive = function (r) {
    const parts = _juwelAufgGive(r);
    if (typeof AUFG_LOHN !== 'undefined' && r === AUFG_LOHN.tagTruhe) { juwelDrop(1); parts.push('ein Juwel'); }
    if (typeof AUFG_LOHN !== 'undefined' && r === AUFG_LOHN.wocheTruhe) { juwelDrop(1); juwelAdd(Object.keys(JUWEL.arten)[randInt(0, 4)] + 2, 1); parts.push('zwei Juwelen'); }
    return parts;
  };
}
if (typeof turmFinalLoot === 'function') {
  const _juwelTurm = turmFinalLoot;
  turmFinalLoot = function (m) {
    const r = _juwelTurm(m);
    if (Math.random() < 0.3) juwelDrop(1);
    return r;
  };
}
const _juwelQuestEvent = questEvent;
questEvent = function (kind, m) {
  _juwelQuestEvent(kind, m);
  if (kind === 'stone' && m && m.level >= 75 && game.player && game.player.level >= MAX_LEVEL && Math.random() < 0.03) juwelDrop(1);
};

// --- Veredler: Seiten „Aufstieg“ und „Sockel“ (endgame80.js, E80_EXTRA_TABS) -----------------------------------------------
const jwUi = { sel: null };
function juwelCss() {
  if (document.getElementById('juwelCss')) return;
  const st = document.createElement('style');
  st.id = 'juwelCss';
  st.textContent = '.e80-tabs{flex-wrap:wrap}.jw-line .jw-asc b{color:#ffd96a;letter-spacing:1px}.jw-line .jw-empty{color:#9a9080}.jw-sockets{display:flex;flex-direction:column;gap:6px;margin:8px 0}' +
    '.jw-sock-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 8px;border-radius:8px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}' +
    '.jw-sock-row img{width:28px;height:28px}.jw-sock-row .jw-txt{flex:1;min-width:140px}.jw-bag{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}' +
    '.jw-gem{display:flex;align-items:center;gap:4px;padding:3px 7px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.25);color:#e8e0d0;cursor:pointer;font-size:12px}' +
    '.jw-gem img{width:22px;height:22px}.jw-gem.on{border-color:#ffd34d;background:rgba(255,211,77,.12)}.jw-gem:disabled{opacity:.45;cursor:default}.jw-req li.ok{color:#8fe39a}.jw-req li.no{color:#ff9a8a}';
  document.head.appendChild(st);
}
function juwelBagHtml(cls, act) {
  const J = juwelState();
  const have = JUWEL_IDS.filter((id) => J[id] > 0);
  if (!have.length) return '<p class="hint-text">Du hast noch keine Juwelen. Sie kommen von Weltbossen, aus den Truhen der Tages- und Wochenaufträge, aus dem Turm und selten aus Seelensteinen ab Stufe 75.</p>';
  return `<div class="jw-bag">${have.map((id) => `<button type="button" class="jw-gem ${cls(id)}" ${act(id)}><img src="${juwelIcon(id)}" alt=""><b style="color:${juwelArt(id).farbe}">${juwelName(id)}</b> × ${J[id]}</button>`).join('')}</div>`;
}
if (typeof document !== 'undefined' && document.head) juwelCss();
const E80_EXTRA_TABS = [
  {
    id: 'aufstieg', name: 'Aufstieg',
    ok: (item) => item.tier === 9 && rarityOf(item) >= 4,
    html(item, p) {
      juwelCss();
      const r = aufstReady(item);
      const a = aufstOf(item);
      const li = (ok, t) => `<li class="${ok ? 'ok' : 'no'}">${ok ? '✔' : '✘'} ${t}</li>`;
      let h = `<div class="e80-steps" style="color:#ffd96a;font-size:20px">${aufstStars(a)}</div>` +
        `<p class="hint-text">Ein legendäres Ewig-Teil kann bis zu ${AUFST.max}-mal aufsteigen: Grundwerte je +${Math.round(AUFST.per * 100)} %. Gelingt immer.</p>` +
        `<ul class="jw-req">${li(r.plus, 'aufgewertet auf +' + MAX_PLUS)}${li(r.ved, 'voll veredelt (' + E80.ved.max + ' von ' + E80.ved.max + ')')}</ul>`;
      if (a >= AUFST.max) return h + `<p>Höchster Aufstieg: Grundwerte +${Math.round(AUFST.per * a * 100)} %.</p>`;
      const c = { gold: AUFST.gold[a], kerne: AUFST.kerne[a], stein: AUFST.stein[a] };
      const cores = p.materials.aetherkern || 0;
      const steine = p.materials.seelenstein || 0;
      const ok = r.plus && r.ved && p.gold >= c.gold && cores >= c.kerne && steine >= c.stein;
      h += `<div class="smith-costs">${e80Chip(lootIconUrl('gold'), e80Fmt(c.gold) + ' Gold', 'du hast ' + e80Fmt(p.gold), p.gold >= c.gold)}` +
        `${e80Chip(materialIconUrl('aetherkern'), c.kerne + ' × Ätherkern', 'du hast ' + cores, cores >= c.kerne)}` +
        `${e80Chip(materialIconUrl('seelenstein'), c.stein + ' × Seelenstein (Gegenstand)', 'du hast ' + steine, steine >= c.stein)}</div>` +
        `<div class="e80-row"><button type="button" class="btn btn-primary" data-jw="aufst" ${ok ? '' : 'disabled'}>Aufstieg ${a + 1}</button></div>`;
      return h;
    },
    bind(body, item) {
      const b = body.querySelector('[data-jw="aufst"]');
      if (b) b.addEventListener('click', () => {
        const r = aufstUp(item);
        e80Ui.msg = r.error || `Aufgestiegen! ${itemName(item)} ${aufstStars(r.to)}`;
        e80Ui.msgCls = r.error ? 'warn' : '';
        if (!r.error) { try { sfx.success(); } catch (e) { /* ohne Ton */ } }
        e80Render();
      });
    }
  },
  {
    id: 'sockel', name: 'Sockel',
    ok: (item) => juwelMax(item) > 0,
    html(item, p) {
      juwelCss();
      const gems = juwelGems(item);
      const max = juwelMax(item);
      let h = `<p class="hint-text">Waffen tragen bis zu zwei Juwelen, Rüstung und Helm je eines (Ewig, episch oder legendär). Einsetzen kostet nichts, Herausnehmen ${e80Fmt(JUWEL.remove)} Gold – das Juwel bleibt dir.</p><div class="jw-sockets">`;
      gems.forEach((id, i) => {
        h += `<div class="jw-sock-row">${id ? `<img src="${juwelIcon(id)}" alt=""><span class="jw-txt"><b style="color:${juwelArt(id).farbe}">${juwelName(id)}</b> · ${juwelEffText(id)}</span><button type="button" class="mini-btn" data-jwout="${i}">Herausnehmen</button>`
          : `<span class="jw-txt">◇ Sockel ${i + 1}: leer</span><button type="button" class="mini-btn" data-jwin="${i}" ${jwUi.sel && juwelState()[jwUi.sel] > 0 ? '' : 'disabled'}>${jwUi.sel ? juwelName(jwUi.sel) + ' einsetzen' : 'erst ein Juwel wählen'}</button>`}</div>`;
      });
      h += '</div>';
      if (gems.length < max) {
        const c = JUWEL.open[gems.length];
        const cores = p.materials.aetherkern || 0;
        h += `<div class="smith-costs">${e80Chip(lootIconUrl('gold'), e80Fmt(c.gold) + ' Gold', 'du hast ' + e80Fmt(p.gold), p.gold >= c.gold)}${e80Chip(materialIconUrl('aetherkern'), c.kerne + ' × Ätherkern', 'du hast ' + cores, cores >= c.kerne)}</div>` +
          `<div class="e80-row"><button type="button" class="btn btn-primary" data-jw="open" ${p.gold >= c.gold && cores >= c.kerne ? '' : 'disabled'}>Sockel ${gems.length + 1} öffnen</button></div>`;
      }
      const J = juwelState();
      h += '<h4>Deine Juwelen</h4>' + juwelBagHtml((id) => (id === jwUi.sel ? 'on' : ''), (id) => `data-jwsel="${id}"`);
      const merge = JUWEL_IDS.filter((id) => juwelGrad(id) < 3 && (J[id] | 0) >= 3);
      if (merge.length) h += `<h4>Verschmelzen (3 → 1 höher)</h4><div class="jw-bag">${merge.map((id) => `<button type="button" class="jw-gem" data-jwmerge="${id}"><img src="${juwelIcon(id)}" alt="">3 × ${juwelName(id)} → ${juwelName(id.slice(0, -1) + (juwelGrad(id) + 1))} · ${e80Fmt(JUWEL.combine[juwelGrad(id) - 1])} Gold</button>`).join('')}</div>`;
      return h;
    },
    bind(body, item) {
      const done = (r, ok) => {
        e80Ui.msg = r.error || ok;
        e80Ui.msgCls = r.error ? 'warn' : '';
        if (!r.error) { try { sfx.success(); } catch (e) { /* ohne Ton */ } }
        e80Render();
      };
      const ob = body.querySelector('[data-jw="open"]');
      if (ob) ob.addEventListener('click', () => { const r = juwelOpen(item); done(r, `Sockel ${r.n} ist offen.`); });
      body.querySelectorAll('[data-jwsel]').forEach((b) => b.addEventListener('click', () => { jwUi.sel = b.dataset.jwsel; e80Render(); }));
      body.querySelectorAll('[data-jwin]').forEach((b) => b.addEventListener('click', () => {
        const r = juwelInsert(item, +b.dataset.jwin, jwUi.sel);
        if (!r.error && !(juwelState()[jwUi.sel] > 0)) jwUi.sel = null;
        done(r, `${juwelName(r.id)} eingesetzt.`);
      }));
      body.querySelectorAll('[data-jwout]').forEach((b) => b.addEventListener('click', () => { const r = juwelRemove(item, +b.dataset.jwout); done(r, `${juwelName(r.id)} herausgenommen.`); }));
      body.querySelectorAll('[data-jwmerge]').forEach((b) => b.addEventListener('click', () => { const r = juwelCombine(b.dataset.jwmerge); done(r, `Verschmolzen: ${juwelName(r.to)}.`); }));
    }
  }
];
