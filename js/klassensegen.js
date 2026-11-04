// Klassensegen (seit 13.1): ein eigener Buff je Klasse (außer Krieger), ab Stufe 10. Man muss ihn nur aktivieren –
// er lässt sich nicht verbessern, hält 30 Minuten und wächst mit der Stufe des Charakters (alle 10 Stufen).
//   Schamane  – Segen der Natur:       alle Naturschäden (Feuer, Wasser, Blitz, Eis, Erde, Wind, Licht) +5 %, je 10 Stufen +2,5 %
//   Ninja     – Klingenschatten:        kritische Treffer +3 % (je 10 Stufen +1 %), kritischer Schaden +10 % (je 10 Stufen +5 %)
//   Ninja mit Bogen (Weg des Falken, seit 13.67) – Falkenblick: Krit +3 % (+1 %), Krit-Schaden +10 % (+5 %),
//               Angriffstempo +6 % (+2 %), Bogenreichweite +10 % (+2 %); dunkle Schwingen und Schattenaura (fernninja.js)
//   Nekromant – Blutpakt:               Omni-Vampir 2 % (je 10 Stufen +0,8 %, bis 13.67 +0,5 %): jeder Schaden heilt, auch über Zeit
//   Magier    – Arkane Erleuchtung:     seit 13.69 Elementschaden +4 % (je 10 Stufen +2 %) auf alle Fertigkeiten; bis 13.67
//               Intelligenz +6 (je 10 Stufen +2) – die verpuffte ab etwa Stufe 55 an der Hauptwert-Grenze (MAIN_ATTR_CAP 120)
// Aktivieren: eigener Knopf neben der Ultimativen Attacke oder Taste 9. Erneut aktivieren frischt die 30 Minuten auf.
// Optik: beim Aktivieren ein großer 3D-Auftritt je Klasse (segen3), solange er läuft die Körperaura der Klasse
// (seit 13.83, koerperaura.js – kräftiger als bei einem einfachen Buff).

const SEGEN_DUR = 1800;
const SEGEN_UNLOCK = 10;
const SEGEN = {
  schamane: {
    id: 'segen_natur', name: 'Segen der Natur', color: '#7ad36a', colors: ['#ff7a1a', '#2a9aff', '#7ad36a', '#fff07a'],
    effects: (lv) => ({ natureDmg: 0.05 + 0.025 * lv }),
    text: (e) => `Alle Naturschäden (Feuer, Wasser, Blitz, Eis, Erde, Wind, Licht) +${pctS(e.natureDmg)}.`
  },
  ninja: {
    id: 'segen_schatten', name: 'Klingenschatten', color: '#c84a6a', colors: ['#2a1a3a', '#c84a6a', '#ff8aa8', '#ffffff'],
    effects: (lv) => ({ crit: 0.03 + 0.01 * lv, critDmg: 0.1 + 0.05 * lv }),
    text: (e) => `Kritische Treffer +${pctS(e.crit)}, kritischer Schaden +${pctS(e.critDmg)}.`
  },
  nekromant: {
    id: 'segen_blut', name: 'Blutpakt', color: '#d82a3a', colors: ['#5a0a14', '#d82a3a', '#ff6a6a', '#2a0a10'],
    effects: (lv) => ({ omniVamp: 0.02 + 0.008 * lv }),
    text: (e) => `Omni-Vampir ${pctS(e.omniVamp)}: Jeder Schaden, den du machst (auch über Zeit), heilt dich.`
  },
  magier: {
    id: 'segen_arkan', name: 'Arkane Erleuchtung', color: '#b48cff', colors: ['#6a3ad8', '#b48cff', '#e8d8ff', '#ffffff'],
    // seit 13.69 Elementschaden (natureDmg wirkt in hitMonster auf jede Fertigkeit) statt Intelligenz
    effects: (lv) => ({ natureDmg: 0.04 + 0.02 * lv }),
    text: (e) => `Elementschaden +${pctS(e.natureDmg)}: Alle deine Zauber treffen härter.`
  }
};
// Weg der Heilung (seit 13.26): statt Naturschaden mehr Heilung
const SEGEN_LICHT = {
  id: 'segen_licht', name: 'Segen des Lichts', color: '#ffe9a0', colors: ['#fff2a0', '#9be59b', '#ffffff', '#ffd36a'],
  effects: (lv) => ({ healPower: 0.1 + 0.025 * lv }),
  text: (e) => `Alle Heilungen +${pctS(e.healPower)} (Heilung, Lichtkuppel, Regeneration und die Heilung deiner Gruppe).`
};
// Weg des Falken (seit 13.67): der Falkenblick ist kein Fertigkeits-Buff mehr, sondern der Klassensegen des Bogen-Ninjas
const SEGEN_FALKE = {
  id: 'segen_falke', name: 'Falkenblick', color: '#8a5ae0', colors: ['#120a1c', '#5a2aa8', '#b48cff', '#e8d8ff'],
  effects: (lv) => ({ crit: 0.03 + 0.01 * lv, critDmg: 0.1 + 0.05 * lv, atkSpeed: 0.06 + 0.02 * lv, bowRange: 0.1 + 0.02 * lv }),
  text: (e) => `Kritische Treffer +${pctS(e.crit)}, kritischer Schaden +${pctS(e.critDmg)}, Angriffstempo +${pctS(e.atkSpeed)}, Bogenreichweite +${pctS(e.bowRange)}. Dunkle Schwingen und eine Schattenaura umgeben dich.`
};
const SEGEN_BY_ID = Object.fromEntries(Object.values(SEGEN).concat([SEGEN_LICHT, SEGEN_FALKE]).map((d) => [d.id, d]));
function pctS(v) {
  return (Math.round(v * 1000) / 10).toLocaleString('de-DE') + ' %';
}

// Definition zu einem Auftritts-Schlüssel (Klasse, oder 'licht' für den Heiler-Schamanen, seit 13.26)
function segenDef(cls) {
  return cls === 'licht' ? SEGEN_LICHT : cls === 'falke' ? SEGEN_FALKE : SEGEN[cls];
}
function segenOf(p) {
  if (p && p.classId === 'schamane' && (p.path || 0) === 1) return SEGEN_LICHT;
  if (p && p.classId === 'ninja' && (p.path || 0) === 1) return SEGEN_FALKE;
  return p && SEGEN[p.classId] ? SEGEN[p.classId] : null;
}
// Stufenschritte: ab Stufe 10 alle 10 Stufen ein Schritt mehr (Stufe 10–19: 0, 20–29: 1, … 70: 6)
function segenSteps(level) {
  return Math.max(0, Math.floor((level - SEGEN_UNLOCK) / 10));
}
function segenEffects(p) {
  const d = segenOf(p);
  return d ? d.effects(segenSteps(p.level)) : null;
}

function useSegen() {
  const p = game.player;
  const d = segenOf(p);
  if (!d || p.dead) return;
  if (p.level < SEGEN_UNLOCK) {
    ui.log(`${d.name} wird ab Stufe ${SEGEN_UNLOCK} freigeschaltet.`, 'warn');
    return;
  }
  if (game.time - (p.segenAt || -99) < 2) return;
  p.segenAt = game.time;
  const effects = segenEffects(p);
  p.buffs = p.buffs.filter((b) => b.id !== d.id);
  p.buffs.push({ id: d.id, name: d.name, short: d.name.slice(0, 2).toUpperCase(), until: game.time + SEGEN_DUR, duration: SEGEN_DUR, effects, lvl: 1, segen: true });
  game.stats = playerStats(p);
  const key = d === SEGEN_LICHT ? 'licht' : d === SEGEN_FALKE ? 'falke' : p.classId;
  segenShow(p, key);
  ui.banner(d.name, d.text(effects) + ' 30 Minuten.');
  if (typeof netSkillFx === 'function') netSkillFx('_segen', 0, { c: key });
  saveGame();
}

// Auftritt (eigener Spieler und Mitspieler)
function segenShow(p, cls) {
  const d = segenDef(cls);
  if (!d) return;
  startSwing(p, 'pose', 0.9);
  p.poseColor = cls === 'falke' ? '#3a1a6a' : d.color;
  addEffect({ type: 'segen3', follow: p, ox: 0, oy: 0, x: p.x, y: feetY(p), cls, dur: 1.6, seed: Math.random() * 10 });
  flashScreen(d.color, 0.18);
  if (typeof snd !== 'undefined') snd.player('levelup', { vol: 0.45, rev: 0.6, variants: 1 });
}

// --- Symbole (Knopf und Buff-Leiste) ---------------------------------------------------------------------
const _segenIcons = new Map();
function segenIconUrl(id) {
  const d = SEGEN_BY_ID[id];
  if (!d) return '';
  if (_segenIcons.has(id)) return _segenIcons.get(id);
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d');
  g.translate(48, 48);
  const bg = g.createRadialGradient(0, -8, 4, 0, 0, 48);
  bg.addColorStop(0, d.colors[2]);
  bg.addColorStop(0.45, d.color);
  bg.addColorStop(1, '#120a14');
  g.fillStyle = bg;
  g.beginPath();
  g.arc(0, 0, 46, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = '#ffd34d';
  g.stroke();
  g.lineWidth = 2;
  g.strokeStyle = 'rgba(255,255,255,0.5)';
  g.beginPath();
  g.arc(0, 0, 40, 0, Math.PI * 2);
  g.stroke();
  g.shadowColor = '#ffffff';
  g.shadowBlur = 10;
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#ffffff';
  if (id === 'segen_natur') {
    // Blatt mit Ader, umkreist von Flamme, Tropfen und Blitz
    g.fillStyle = '#d8ffc8';
    g.beginPath();
    g.moveTo(0, 22);
    g.quadraticCurveTo(-22, 0, 0, -24);
    g.quadraticCurveTo(22, 0, 0, 22);
    g.fill();
    g.strokeStyle = '#3a8a2a';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, 20);
    g.lineTo(0, -18);
    g.stroke();
    const dot = (x, y, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); };
    dot(-26, -18, '#ff7a1a');
    dot(26, -18, '#2a9aff');
    dot(-26, 20, '#fff07a');
    dot(26, 20, '#f0a830');
  } else if (id === 'segen_schatten') {
    // zwei gekreuzte Klingen mit rotem Glanz
    for (const s of [-1, 1]) {
      g.save();
      g.rotate(s * 0.75);
      g.fillStyle = '#f0f0ff';
      g.beginPath();
      g.moveTo(0, -30);
      g.lineTo(5, 12);
      g.lineTo(-5, 12);
      g.closePath();
      g.fill();
      g.fillStyle = '#c84a6a';
      g.fillRect(-9, 12, 18, 4);
      g.fillStyle = '#2a1a3a';
      g.fillRect(-3, 16, 6, 12);
      g.restore();
    }
  } else if (id === 'segen_falke') {
    // dunkles Falkenauge mit violetter Iris zwischen zwei schwarzen Schwingen
    g.shadowColor = '#b48cff';
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) {
      g.save();
      g.translate(s * 9, 4);
      g.rotate(s * (0.95 + i * 0.3));
      const fg = g.createLinearGradient(0, 0, 0, -30);
      fg.addColorStop(0, '#0a0610');
      fg.addColorStop(0.7, '#2a1640');
      fg.addColorStop(1, '#8a5ae0');
      g.fillStyle = fg;
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(-7, -14, 0, -30 + i * 2.5);
      g.quadraticCurveTo(7, -14, 0, 0);
      g.fill();
      g.restore();
    }
    g.shadowBlur = 12;
    g.fillStyle = '#1a0e28';
    g.beginPath();
    g.moveTo(-20, 0);
    g.quadraticCurveTo(0, -17, 20, 0);
    g.quadraticCurveTo(0, 17, -20, 0);
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = '#b48cff';
    g.stroke();
    const ir = g.createRadialGradient(0, 0, 1, 0, 0, 10);
    ir.addColorStop(0, '#f4e8ff');
    ir.addColorStop(0.45, '#a070f0');
    ir.addColorStop(1, '#2a0a50');
    g.fillStyle = ir;
    g.beginPath();
    g.arc(0, 0, 9.5, 0, Math.PI * 2);
    g.fill();
    g.shadowBlur = 0;
    g.fillStyle = '#05020a';
    g.beginPath();
    g.ellipse(0, 0, 2.2, 7.5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(-3.5, -3.5, 1.8, 0, Math.PI * 2);
    g.fill();
  } else if (id === 'segen_blut') {
    // Blutstropfen mit Herzschlag-Glanz
    g.fillStyle = '#ff4a5a';
    g.beginPath();
    g.moveTo(0, -28);
    g.quadraticCurveTo(22, 4, 0, 24);
    g.quadraticCurveTo(-22, 4, 0, -28);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.beginPath();
    g.ellipse(-6, 4, 4, 8, -0.3, 0, Math.PI * 2);
    g.fill();
  } else if (id === 'segen_licht') {
    // goldene Sonne mit grünem Heilkreuz
    g.beginPath();
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      const r = k % 2 ? 20 : 30;
      k ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    g.fillStyle = '#fff2a0';
    g.fill();
    g.fillStyle = '#3aa84a';
    g.fillRect(-5, -15, 10, 30);
    g.fillRect(-15, -5, 30, 10);
    g.fillStyle = '#c8ffb0';
    g.fillRect(-2, -12, 4, 24);
    g.fillRect(-12, -2, 24, 4);
  } else {
    // arkaner Stern mit Lichtkranz
    g.beginPath();
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 - Math.PI / 2;
      const r = k % 2 ? 10 : 28;
      k ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    g.fillStyle = '#f4ecff';
    g.fill();
  }
  const url = c.toDataURL();
  _segenIcons.set(id, url);
  return url;
}

// --- Knopf neben der Ultimativen Attacke ------------------------------------------------------------------
function segenButton(bar, p) {
  const d = segenOf(p);
  if (!d) return;
  const wrap = document.createElement('div');
  wrap.className = 'skill-wrap segen-wrap';
  const locked = p.level < SEGEN_UNLOCK;
  const tip = `<b>${d.name}</b><br>Klassensegen · 30 Minuten · nur aktivieren<br>${d.text(d.effects(segenSteps(Math.max(p.level, SEGEN_UNLOCK))))}<br><i>Wird alle 10 Stufen stärker.</i>`;
  wrap.innerHTML = `<button type="button" id="skillSegen" class="slot skill segen${locked ? ' locked' : ''}" aria-label="${d.name}" data-info="${escTip(tip)}">` +
    `<span class="key">${keyLabel(actionKey('segen'))}</span><img class="skill-icon" src="${segenIconUrl(d.id)}" alt="${d.name}">` +
    `<span class="segen-left" hidden></span>${locked ? `<span class="lock">ab LVL ${SEGEN_UNLOCK}</span>` : ''}</button>`;
  const btn = wrap.firstChild;
  btn.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    useSegen();
  });
  btn.addEventListener('click', (e) => { if (e.detail === 0) useSegen(); });
  bar.append(wrap);
}
// je Bild: Restzeit am Knopf, Leuchten, wenn er nicht läuft
function segenTick() {
  const p = game.player;
  const btn = document.getElementById('skillSegen');
  if (!p || !btn) return;
  const d = segenOf(p);
  // Segen eines anderen Weges (nach dem Wechsel zwischen Dolch und Bogen, seit 13.67) fällt weg – samt Aura
  if (d && p.buffs.some((x) => x.segen && x.id !== d.id)) {
    p.buffs = p.buffs.filter((x) => !x.segen || x.id === d.id);
    game.stats = playerStats(p);
  }
  const b = d && p.buffs.find((x) => x.id === d.id);
  const left = b ? Math.max(0, Math.ceil(b.until - game.time)) : 0;
  const txt = left ? (left >= 60 ? Math.ceil(left / 60) + 'm' : left + 's') : '';
  if (btn.dataset.left !== txt) {
    btn.dataset.left = txt;
    const el = btn.querySelector('.segen-left');
    el.hidden = !txt;
    el.textContent = txt;
    btn.classList.toggle('segen-off', !txt && p.level >= SEGEN_UNLOCK);
  }
}

// --- 3D: Auftritt beim Aktivieren ----------------------------------------------------------------------------
FX3_TYPES.add('segen3');
const _sg3a = new THREE.Vector3();
const _sg3b = new THREE.Vector3();
const _sg3v = new THREE.Vector3(0, 0, 1);
FX3_DRAW.segen3 = function (h, e) {
  const t = game.time - e.start;
  const k = t / e.dur;
  if (k >= 1) return;
  const d = segenDef(e.cls);
  if (!d) return;
  // Falkenblick (seit 13.67): eigener, dunkler Auftritt (fernninja.js)
  if (e.cls === 'falke' && typeof bowSegen3 === 'function') {
    bowSegen3(h, e, k);
    return;
  }
  const o = e.follow && !e.follow.dead ? e.follow : null;
  const x = (o ? o.x : e.x) * U3;
  const z = (o ? feetY(o) : e.y) * U3;
  const low = n3low();
  const fade = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.55) / 0.45);
  const C = d.colors;
  // Lichtsäule und Blitz zu Beginn
  fx3MageSprite(h, 'sprite', 'disc', x, 1.6, z, 0.7, 4.2, d.color, 0.45 * fade);
  fx3MageSprite(h, 'sprite', 'disc', x, 1.6, z, 0.25, 4.4, '#ffffff', 0.5 * fade);
  if (t < 0.3) n3Glow(h, x, 0.9, z, 1.4 + t * 6, '#ffffff', (1 - t / 0.3) * 0.8);
  // Druckwelle am Boden (nur ein heller Ring, keine Zeichen)
  if (t < 0.7) {
    const w = fx3Take(h, 'plane');
    fx3Ground(w, x / U3, z / U3, 0.4 + t * 3.2, 0.04, 'ring');
    fx3Color(w, d.color, 0.8 * (1 - t / 0.7));
  }
  const n = low ? 10 : 22;
  if (e.cls === 'schamane') {
    // vier Elementströme winden sich als Spirale an der Figur hinauf und treffen sich über dem Kopf
    for (let s = 0; s < 4; s++) {
      for (let j = 0; j < n / 2; j++) {
        const q = j / (n / 2);
        const ph = Math.min(1, k * 1.6) - q * 0.5;
        if (ph < 0) continue;
        const a = s * Math.PI / 2 + ph * 7 + t * 2;
        const rr = 0.9 * (1 - ph * 0.8);
        const y = 0.1 + ph * 2.0;
        if (s === 0) n3Flame(h, x + Math.cos(a) * rr, y, z + Math.sin(a) * rr, 0.28 * (1 - q), 0.5 * (1 - q), '#ff6a1a', 0.9 * fade, 0, true);
        else if (s === 1) {
          const b = fx3Take(h, 'ball');
          b.position.set(x + Math.cos(a) * rr, y, z + Math.sin(a) * rr);
          b.scale.setScalar(0.08 * (1 - q * 0.5));
          fx3Color(b, '#2a86f0', 0.9 * fade);
        } else n3Glow(h, x + Math.cos(a) * rr, y, z + Math.sin(a) * rr, 0.22 * (1 - q * 0.5), C[s], 0.9 * fade);
      }
    }
    // Blätter fallen herab
    for (let j = 0; j < (low ? 4 : 10); j++) {
      const ph = (t * 0.8 + j / 10) % 1;
      const a = j * 2.4 + t;
      const b = fx3Take(h, 'ball');
      b.position.set(x + Math.cos(a) * (0.5 + ph * 0.4), 2.4 - ph * 2.2, z + Math.sin(a) * (0.5 + ph * 0.4));
      b.scale.set(0.09, 0.03, 0.06);
      fx3Color(b, j % 2 ? '#5aa83a' : '#8ad35a', fade);
    }
  } else if (e.cls === 'ninja') {
    // Schattenklingen schießen von außen auf die Figur zu, dunkler Rauch platzt nach außen
    for (let j = 0; j < (low ? 4 : 8); j++) {
      const a = j * Math.PI / 4 + e.seed;
      const q = Math.min(1, k * 2);
      const r0 = 2.2 * (1 - q) + 0.35;
      _sg3a.set(x + Math.cos(a) * r0, 1.0 + Math.sin(j) * 0.2, z + Math.sin(a) * r0);
      _sg3b.set(x + Math.cos(a) * (r0 + 0.6), 1.0 + Math.sin(j) * 0.2, z + Math.sin(a) * (r0 + 0.6));
      const s = fx3Take(h, 'seg');
      fx3Segment(s, _sg3a, _sg3b, 0.035);
      fx3Color(s, '#f0f0ff', fade);
      const g = fx3Take(h, 'seg');
      fx3Segment(g, _sg3a, _sg3b, 0.09);
      fx3Color(g, '#c84a6a', 0.6 * fade);
    }
    for (let j = 0; j < (low ? 5 : 12); j++) {
      const a = j * 0.52 + e.seed;
      const q = Math.min(1, t / 0.9);
      n3Smoke(h, x + Math.cos(a) * q * 1.6, 0.3 + q * 0.5, z + Math.sin(a) * q * 1.2, 0.6 + q * 0.8, '#1a1022', 0.7 * (1 - q));
    }
    // rote Schnitte im Kreuz
    if (t > 0.35 && t < 0.9) {
      const q = (t - 0.35) / 0.55;
      for (const s of [-1, 1]) {
        _sg3a.set(x - 0.7 * s, 1.6, z - 0.1);
        _sg3b.set(x + 0.7 * s, 0.4, z - 0.1);
        const c = fx3Take(h, 'seg');
        fx3Segment(c, _sg3a, _sg3b, 0.05);
        fx3Color(c, '#ff8aa8', 1 - q);
      }
    }
  } else if (e.cls === 'nekromant') {
    // Blutstrudel: Tropfen ziehen von einem Kreis am Boden spiralförmig zur Brust, Herzschlag-Glühen
    for (let j = 0; j < n; j++) {
      const q = (k * 1.5 + j / n) % 1;
      const a = j * 2.399 + q * 5;
      const rr = 1.5 * (1 - q);
      const b = fx3Take(h, 'ball');
      b.position.set(x + Math.cos(a) * rr, 0.1 + q * 0.9, z + Math.sin(a) * rr);
      b.scale.set(0.04, 0.09, 0.04);
      fx3Color(b, j % 3 ? '#b81a2a' : '#ff4a5a', 0.95 * fade);
    }
    const beat = Math.max(0, Math.sin(t * 9)) ** 4;
    n3Glow(h, x, 1.0, z + 0.1, 0.8 + beat * 0.9, '#ff2a3a', (0.4 + beat * 0.5) * fade);
    for (let j = 0; j < (low ? 4 : 8); j++) n3Smoke(h, x + Math.cos(j * 0.8) * 0.8, 0.2, z + Math.sin(j * 0.8) * 0.8, 0.9, '#3a0a10', 0.5 * fade);
  } else if (e.cls === 'licht') {
    // Heiler-Schamane (seit 13.26): goldene Lichtstrahlen fallen schräg herab, grüne Heilfunken steigen auf
    for (let j = 0; j < (low ? 4 : 8); j++) {
      const a = (j / (low ? 4 : 8)) * Math.PI * 2 + t * 0.6;
      const q = (k * 1.6 + j * 0.13) % 1;
      _sg3a.set(x + Math.cos(a) * 1.4, 3.4 - q * 0.6, z + Math.sin(a) * 1.4);
      _sg3b.set(x + Math.cos(a) * 0.35, 0.3, z + Math.sin(a) * 0.35);
      const s = fx3Take(h, 'seg');
      fx3Segment(s, _sg3a, _sg3b, 0.035);
      fx3Color(s, j % 2 ? '#fff2a0' : '#ffffff', 0.6 * fade * (1 - q * 0.5));
    }
    for (let j = 0; j < (low ? 5 : 10); j++) {
      const q = (t * 0.9 + j / 10) % 1;
      const a = j * 2.399 + t;
      n3Glow(h, x + Math.cos(a) * 0.7, 0.2 + q * 2.2, z + Math.sin(a) * 0.7, 0.13, '#9be59b', fade * (1 - q));
    }
  } else {
    // aufsteigende Lichtringe von den Füßen zum Kopf, darüber ein Sternenkranz
    _sg3b.set(1, 0, 0);
    for (let j = 0; j < 4; j++) {
      const q = (k * 1.4 + j * 0.25) % 1;
      _sg3a.set(x, 0.1 + q * 2.0, z);
      const s = fx3Take(h, 'strip');
      fx3Strip(s, _sg3a, _sg3b, _sg3v, 0.7 - q * 0.3, 0.12, 0, Math.PI * 2, j % 2 ? '#b48cff' : '#e8d8ff', 1.2 * fade * (1 - q), true);
    }
    for (let j = 0; j < 6; j++) {
      const a = j * Math.PI / 3 + t * 2;
      const sx = x + Math.cos(a) * 0.45;
      const sz = z + Math.sin(a) * 0.45;
      fx3MageSprite(h, 'sprite', 'disc', sx, 2.2, sz, 0.3, 0.06, '#ffffff', fade);
      fx3MageSprite(h, 'sprite', 'disc', sx, 2.2, sz, 0.06, 0.3, '#ffffff', fade);
      n3Glow(h, sx, 2.2, sz, 0.22, '#b48cff', fade);
    }
  }
  // Funken in den Klassenfarben steigen auf
  for (let j = 0; j < n; j++) {
    const q = (t * 1.2 + j / n) % 1;
    const a = j * 2.399 + t * 3;
    n3Glow(h, x + Math.cos(a) * 0.6, 0.2 + q * 2.4, z + Math.sin(a) * 0.6, 0.1 * (1 - q * 0.5), C[j % C.length], fade * (1 - q));
  }
};
EXTRA_EFFECTS.segen3 = (ctx, e, k, x, y) => {
  const d = segenDef(e.cls);
  if (!d) return;
  const t = game.time - e.start;
  const fade = 1 - k;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.5 * fade;
  const g = ctx.createLinearGradient(x, y, x, y - 110);
  g.addColorStop(0, d.color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 16, y - 110, 32, 110);
  ctx.globalAlpha = fade;
  for (let j = 0; j < 16; j++) {
    const q = (t * 1.2 + j / 16) % 1;
    const a = j * 2.399 + t * 3;
    ctx.fillStyle = d.colors[j % d.colors.length];
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * 18, y - q * 80, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = d.color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, y, 10 + t * 80, (10 + t * 80) * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
};

// --- Aura, solange der Segen läuft --------------------------------------------------------------------------
// seit 13.83 zeigt die Körperaura (koerperaura.js) jeden laufenden Buff im Stil von Klasse und Weg – der Segen macht
// sie dichter und heller. Die eigenen Segen-Auren (Kranz mit Sternen, gekreuzte Dolche, Blutstropfen, Elementlichter)
// und die kreisenden 2D-Lichter sind entfallen, damit nicht zwei Auren übereinander liegen. Die Schwingen des
// Falkenblicks bleiben (fernninja.js).
for (const d of Object.values(SEGEN).concat([SEGEN_LICHT])) {
  SKILL_FX[d.id] = Object.assign(SKILL_FX[d.id] || {}, { color: d.color });
}
