// Schwierigkeit (seit 15.76, docs/endgame-langzeit.md): Ab Stufe 80 wählt jeder für sich Normal, Heroisch oder Mythisch.
// Sie gilt nur in den Lv-80-Instanzen und im Turm der Verdammten und nur für einen selbst: eigener Schaden geringer,
// erlittener Schaden höher, dafür bessere Beute beim Instanzboss und in der Truhe des Wächters. Persönlich statt für die
// Instanz, weil Instanzen offene Gebiete mit Wiederkehr sind – so braucht es keinen Abgleich übers Netz, und in einer
// Gruppe darf jeder seine eigene Stufe spielen. (Eigene Treffer zählen auch beim Host nur mit der eigenen Stufe:
// Mitspieler schicken ihren Schaden schon gerechnet, kampf.js damageMonster/netClientDamage.)
const DIFF = [
  { id: 0, name: 'Normal', farbe: '#d8dee8', dmg: 1, taken: 1, leg: 1, kerne: 0, ep: 0, juwel: 0 },
  { id: 1, name: 'Heroisch', farbe: '#7fb8ff', dmg: 0.75, taken: 1.4, leg: 1.5, kerne: 1, ep: 0.5, juwel: 0.5 },
  { id: 2, name: 'Mythisch', farbe: '#ff9a5a', dmg: 0.6, taken: 1.8, leg: 2, kerne: 2, ep: 1, juwel: 1 }
];
if (typeof SAVE_FIELDS !== 'undefined' && !SAVE_FIELDS.includes('diff')) SAVE_FIELDS.push('diff');

// Wo gilt sie? 'inst' (Lv-80-Instanz), 'turm' (Halle des Turms) oder ''
function diffZone(p) {
  p = p || game.player;
  if (!p) return '';
  const d = typeof instDefAt === 'function' ? instDefAt(p) : null;
  if (d && instMobLevel(d) >= 75) return 'inst';
  if (typeof turmSlotAt === 'function' && turmSlotAt(p.x, p.y) >= 0) return 'turm';
  return '';
}
const diffOf = (p) => DIFF[Math.max(0, Math.min(DIFF.length - 1, (p && p.diff) | 0))];
// wirksame Stufe gerade jetzt (Normal außerhalb und unter Stufe 80)
function diffNow(p) {
  p = p || game.player;
  return p && p.level >= MAX_LEVEL && diffZone(p) ? diffOf(p) : DIFF[0];
}
function diffSet(id) {
  const p = game.player;
  if (!p || p.level < MAX_LEVEL || !DIFF[id]) return false;
  p.diff = id;
  ui.log(`Schwierigkeit · ${DIFF[id].name}`, 'info');
  saveGame();
  return true;
}

// --- Wirkung ------------------------------------------------------------------------------------------------------
// eigener Schaden (auch Diener, Gift, Brand) – nicht der von Mitspielern, den der Host hier bekommt
const _diffDamageMonster = damageMonster;
damageMonster = function (m, amount, crit, source, isDot, credit) {
  if (amount > 0 && !(source && (source.remote || source.remoteAlly))) {
    const D = diffNow();
    if (D.dmg < 1) amount = Math.max(1, Math.round(amount * D.dmg));
  }
  return _diffDamageMonster(m, amount, crit, source, isDot, credit);
};
// erlittener Schaden (nicht gegen Spieler)
const _diffDamagePlayer = damagePlayer;
damagePlayer = function (amount, attacker, o = {}) {
  if (amount > 0 && !(o && o.pvp)) {
    const D = diffNow();
    if (D.taken > 1) amount = Math.round(amount * D.taken);
  }
  return _diffDamagePlayer(amount, attacker, o);
};
// Beute obendrauf (die bessere Legendär-Chance steckt in instFinalLoot/turmFinalLoot selbst)
function diffBonus(D) {
  const p = game.player;
  if (!p || !D || !D.id) return;
  if (D.kerne) {
    p.materials.aetherkern = (p.materials.aetherkern || 0) + D.kerne;
    ui.loot('Ätherkern', D.kerne, materialIconUrl('aetherkern'), MATERIAL_COLORS.aetherkern);
  }
  if (D.ep) gainXp(Math.round(xpToNext(MAX_LEVEL) * D.ep));
  if (D.juwel && typeof juwelDrop === 'function' && Math.random() < D.juwel) juwelDrop(D.id >= 2 ? 2 : 1);
  ui.log(`${D.name} · Bonusbeute`, 'level');
}
if (typeof instFinalLoot === 'function') {
  const _diffInstFinal = instFinalLoot;
  instFinalLoot = function (m, def) {
    const D = def && instMobLevel(def) >= 75 ? diffNow() : DIFF[0];
    const r = _diffInstFinal(m, def);
    diffBonus(D);
    return r;
  };
}
if (typeof turmFinalLoot === 'function') {
  const _diffTurmFinal = turmFinalLoot;
  turmFinalLoot = function (m) {
    const D = diffNow();
    const r = _diffTurmFinal(m);
    diffBonus(D);
    return r;
  };
}

// --- Anzeige: Auswahl (Seite „Seele“, Tor der Lv-80-Instanzen, Turm) und Hinweis beim Betreten --------------------------
function diffPickHtml(p) {
  const cur = diffOf(p).id;
  const pct = (v) => Math.round(v * 100) + ' %';
  const line = (D) => !D.id ? 'wie bisher'
    : `dein Schaden ${pct(D.dmg - 1)} · erlittener Schaden +${pct(D.taken - 1)} · Legendär ×${String(D.leg).replace('.', ',')} · +${D.kerne} Ätherkern${D.kerne > 1 ? 'e' : ''} · +${String(D.ep).replace('.', ',')} Stufen Seelen-EP${D.juwel ? ` · ${D.juwel >= 1 ? 'ein' : 'mit Glück ein'} Juwel` : ''}`;
  return `<div class="diff-pick"><b>Schwierigkeit</b> <small>nur für dich · in Lv-80-Instanzen und im Turm</small>` +
    DIFF.map((D) => `<button type="button" data-diff="${D.id}" class="${D.id === cur ? 'on' : ''}" style="--df:${D.farbe}"><b>${D.name}</b><small>${line(D)}</small></button>`).join('') + '</div>';
}
function diffCss() {
  if (document.getElementById('diffCss')) return;
  const st = document.createElement('style');
  st.id = 'diffCss';
  st.textContent = '.diff-pick{display:flex;flex-direction:column;gap:5px;margin:8px 0;padding:8px;border-radius:10px;background:rgba(0,0,0,.25);border:1px solid rgba(255,211,77,.25)}' +
    '.diff-pick>small{color:#b9ad95;margin-left:6px}.diff-pick button{display:flex;flex-direction:column;align-items:flex-start;gap:1px;text-align:left;padding:6px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.04);color:#e8e0d0;cursor:pointer}' +
    '.diff-pick button b{color:var(--df)}.diff-pick button small{font-size:11px;color:#c8bfae}.diff-pick button.on{border-color:var(--df);background:rgba(255,255,255,.1);box-shadow:0 0 8px rgba(255,255,255,.08) inset}';
  document.head.appendChild(st);
}
function diffBind(root, after) {
  if (!root) return;
  root.querySelectorAll('[data-diff]').forEach((b) => b.addEventListener('click', () => {
    if (!diffSet(+b.dataset.diff)) return;
    root.querySelectorAll('[data-diff]').forEach((x) => x.classList.toggle('on', x === b));
    if (after) after();
  }));
}
// Seite „Seele“ im Charakterfenster: Auswahl unter den Seelenwerten
if (typeof seeleHtml === 'function') {
  const _diffSeeleHtml = seeleHtml;
  seeleHtml = function (p) {
    diffCss();
    return _diffSeeleHtml(p) + diffPickHtml(p);
  };
  const _diffSeeleBind = seeleBind;
  seeleBind = function (root) {
    _diffSeeleBind(root);
    diffBind(root);
  };
}
// Tor einer Lv-80-Instanz
if (typeof instRenderGate === 'function') {
  const _diffGate = instRenderGate;
  instRenderGate = function (body, npc, dg) {
    _diffGate(body, npc, dg);
    const p = game.player;
    if (!p || p.level < MAX_LEVEL || !dg || !dg.def || instMobLevel(dg.def) < 75) return;
    diffCss();
    const btn = body.querySelector('[data-dg]');
    if (btn) btn.insertAdjacentHTML('beforebegin', diffPickHtml(p));
    diffBind(body);
  };
}
// Fenster am Turm
if (typeof turmWindowOpen === 'function') {
  const _diffTurmWin = turmWindowOpen;
  turmWindowOpen = function (npc) {
    const r = _diffTurmWin(npc);
    const p = game.player;
    const body = $('npcBody');
    if (p && p.level >= MAX_LEVEL && body && !body.querySelector('.diff-pick')) {
      diffCss();
      const btn = body.querySelector('[data-turm="neu"]');
      if (btn) btn.insertAdjacentHTML('beforebegin', diffPickHtml(p));
      else body.insertAdjacentHTML('beforeend', diffPickHtml(p));
      diffBind(body);
    }
    return r;
  };
}
// Hinweis beim Betreten (einmal je Betreten)
let diffWasZone = '';
setInterval(() => {
  const p = game.player;
  if (!p || !game.running) return;
  const z = p.level >= MAX_LEVEL ? diffZone(p) : '';
  if (z && z !== diffWasZone) {
    const D = diffOf(p);
    if (D.id) ui.banner(D.name, 'Gegner härter · Beute besser');
  }
  diffWasZone = z;
}, 1000);
