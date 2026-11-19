'use strict';

// Klassen-Sets (seit 15.40): je Klasse ein legendäres Lv-80-Set mit eigenem Aussehen. Bisher gab es Sets nur je
// Instanz (ITEM_SETS, daten/gegenstaende.js) – sie unterschieden sich allein in der Farbe. Die Klassen-Sets haben
// dazu eigene Formen in 3D, die auf den Teilen sitzen: Helm, Schultern, Brust und Umhang tragen je ein Merkmal.
// Erste Reihe (KLASSEN_SETS, Quellen KS.quellen: Spiegelgruft, Thron der Leere, Thron der Unterwelt):
//   Krieger    Rüstung des Drachenkaisers   Obsidianhörner, Glutzacken, Drachenschwingen
//   Ninja      Gewand des Mondschattens     Mondsichel an der Stirn, Sichelklingen, Mondring im Rücken
//   Schamane   Tracht des Sturmgeists       Federkrone, Federmantel, Geisterperlen, Schwingen
//   Nekromant  Ornat des Seelenkönigs       Knochenkrone mit Seelenflamme, Schädel, Rippen, Seelenfeuer
//   Magier     Robe des Sternenwebers       Sternenkranz um den Hut, Sternbild, Sternenring im Rücken
// Zweite Reihe (seit 15.45, KLASSEN_SETS2, Quellen KS.quellen2: Gezeitengrotte, Nebelwrack, Sonnentempel, Wolkenhort
// und der Turm der Verdammten – turm.js trägt sich selbst ein):
//   Krieger    Rüstung des Sonnenlöwen       Goldkamm mit Löwenmähne, Plattenschultern, Löwenschild auf dem Rücken
//   Ninja      Gewand des Nebelfuchses       Fuchsohren und Fuchsmaske, Lamellen mit Kunai, gekreuzte Klingen
//   Schamane   Tracht des Gezeitenrufers     Muschelkrone mit Korallen, Muschelschultern, Perlen, Muschelhorn
//   Nekromant  Ornat des Laternenfürsten     Käfigkrone mit Geisterlicht, Laternen, Kette mit Schloss, Laternenstab
//   Magier     Robe der Mittagssonne         Goldene Blattkrone mit Sonnenstein, Goldblätter, Halskragen, Lichtprismen
// Woher: legendäre Teile (Ewig, Lv 80) aus den Quellen einer Reihe gehören mit KS.chance zum Set dieser Reihe für die
// Klasse, für die das Teil gemacht ist (Teile ohne Klasse: zur eigenen), sonst wie bisher zum Set der Instanz. Die
// Set-Boni zählen nur für die Klasse des Sets (setCounts); beide Reihen zählen getrennt (eigene Kennungen).
// Die Kennung steht wie bei allen Sets in item.set; Farbe, Handel, Post, Lager und Spielstand laufen über ITEM_SETS.
const KS = {
  chance: 0.7,
  quellen: new Set(['spiegelgruft', 'leerenthron', 'hoellenthron']),
  // seit 15.45: Quellen der zweiten Reihe (dazu 'turm', siehe turm.js)
  quellen2: new Set(['gezeitengrotte', 'nebelwrack', 'sonnentempel', 'wolkenhort'])
};
const KLASSEN_SETS = {
  krieger: {
    id: 'drachenkaiser', name: 'Rüstung des Drachenkaisers', color: '#ff6a2a',
    tiers: [[2, { atk: 35, def: 20 }], [4, { hp: 800, main: 12 }], [6, { basicDmg: 0.06, dmgReduce: 0.04 }]]
  },
  ninja: {
    id: 'mondschatten', name: 'Gewand des Mondschattens', color: '#8a6aff',
    tiers: [[2, { atk: 35, crit: 0.02 }], [4, { hp: 600, main: 12 }], [6, { critDmg: 0.1, atkSpeed: 0.05 }]]
  },
  schamane: {
    id: 'sturmgeist', name: 'Tracht des Sturmgeists', color: '#3fe0c8',
    tiers: [[2, { atk: 30, mp: 150 }], [4, { hp: 700, main: 12 }], [6, { skillDmg: 0.07, dmgReduce: 0.03 }]]
  },
  nekromant: {
    id: 'seelenkoenig', name: 'Ornat des Seelenkönigs', color: '#6fe88a',
    tiers: [[2, { atk: 30, hpSteal: 0.01 }], [4, { hp: 700, main: 12 }], [6, { skillDmg: 0.07, resist: 0.02 }]]
  },
  magier: {
    id: 'sternenweber', name: 'Robe des Sternenwebers', color: '#6ab8ff',
    tiers: [[2, { atk: 30, crit: 0.02 }], [4, { hp: 600, main: 12 }], [6, { skillDmg: 0.08, critDmg: 0.06 }]]
  }
};
// Zweite Reihe (seit 15.45): gleich stark wie die erste (Angriff +30–35, Leben +600–800, Hauptwert +12, zwei
// Prozentwerte), aber mit anderen Schwerpunkten
const KLASSEN_SETS2 = {
  krieger: {
    id: 'sonnenloewe', name: 'Rüstung des Sonnenlöwen', color: '#f0b840',
    tiers: [[2, { atk: 35, resMelee: 0.04 }], [4, { hp: 800, main: 12 }], [6, { skillDmg: 0.06, hpPct: 0.04 }]]
  },
  ninja: {
    id: 'nebelfuchs', name: 'Gewand des Nebelfuchses', color: '#7ad8b0',
    tiers: [[2, { atk: 35, dodge: 0.02 }], [4, { hp: 600, main: 12 }], [6, { basicDmg: 0.06, crit: 0.02 }]]
  },
  schamane: {
    id: 'gezeitenrufer', name: 'Tracht des Gezeitenrufers', color: '#3ab8e0',
    tiers: [[2, { atk: 30, regen: 0.004 }], [4, { hp: 700, main: 12 }], [6, { skillDmg: 0.06, hpPct: 0.04 }]]
  },
  nekromant: {
    id: 'laternenfuerst', name: 'Ornat des Laternenfürsten', color: '#9ad8c0',
    tiers: [[2, { atk: 30, resMagic: 0.04 }], [4, { hp: 700, main: 12 }], [6, { skillDmg: 0.06, critDmg: 0.06 }]]
  },
  magier: {
    id: 'mittagssonne', name: 'Robe der Mittagssonne', color: '#ffcf5a',
    tiers: [[2, { atk: 30, mp: 150 }], [4, { hp: 600, main: 12 }], [6, { skillDmg: 0.07, crit: 0.03 }]]
  }
};
const KS_FROM = ['Klassen-Set · legendär aus Spiegelgruft, Thron der Leere und Thron der Unterwelt', 'Klassen-Set · legendär aus den Instanzen von Nebelküste und Himmelsterrassen und dem Turm der Verdammten'];
for (const [reihe, R] of [[1, KLASSEN_SETS], [2, KLASSEN_SETS2]]) {
  for (const [cls, S] of Object.entries(R)) {
    ITEM_SETS[S.id] = { name: S.name, from: KS_FROM[reihe - 1], color: S.color, tiers: S.tiers, cls, reihe };
  }
}
const klassenSetOf = (item) => {
  const S = item && typeof item.set === 'string' ? ITEM_SETS[item.set] : null;
  return S && S.cls ? S : null;
};
// Reihe der Klassen-Sets, die in einer Instanz fällt (oder null)
const ksReihe = (id) => (KS.quellen.has(id) ? KLASSEN_SETS : KS.quellen2.has(id) ? KLASSEN_SETS2 : null);

// --- Beute -----------------------------------------------------------------------------------------------------
if (typeof setTagItem === 'function') {
  const _ksTag = setTagItem;
  // eslint-disable-next-line no-global-assign
  setTagItem = function (item, m) {
    const r = _ksTag(item, m);
    const id = typeof setIdOfMonster === 'function' ? setIdOfMonster(m) : null;
    const R = id ? ksReihe(id) : null;
    if (item && R && rarityOf(item) >= 4 && item.tier >= ITEM_TIERS.length - 1 && Math.random() < KS.chance) {
      const cls = item.cls || (game.player && game.player.classId);
      if (R[cls]) item.set = R[cls].id;
    }
    return r;
  };
}
// Set-Boni eines Klassen-Sets nur für seine Klasse
if (typeof setCounts === 'function') {
  const _ksCounts = setCounts;
  // eslint-disable-next-line no-global-assign
  setCounts = function (p) {
    const out = _ksCounts(p);
    for (const id of Object.keys(out)) {
      const S = ITEM_SETS[id];
      if (S && S.cls && p && S.cls !== p.classId) delete out[id];
    }
    return out;
  };
}
// Hinweis am Eingang der Instanzen, in denen die Klassen-Sets fallen
if (typeof setPortalHtml === 'function') {
  const _ksPortal = setPortalHtml;
  // eslint-disable-next-line no-global-assign
  setPortalHtml = function (id) {
    const html = _ksPortal(id);
    const R = ksReihe(id);
    const S = game.player && R ? R[game.player.classId] : null;
    if (!S) return html;
    return html + `<p class="set-portal"><span>Klassen-Set:</span> <b style="color:${S.color}">${S.name}</b> <span>– legendäre Teile (Lv 80) von hier gehören meist dazu. Es hat ein eigenes Aussehen und zählt nur für deine Klasse.</span></p>`;
  };
}

// --- Aussehen in 3D ------------------------------------------------------------------------------------------------
// Jede Klasse: helm(H) im Kopfrahmen (Einheit = Kopfradius, +z vorn), schulter(S, sx) im Rahmen auf der Schulter,
// brust(W, g) und ruecken(W, g) im Rahmen der Brust (Maße der Figur in g).
const KS_LOOK = {
  krieger: {
    helm(H) {
      const glut = '#ff7a2a';
      for (const sx of [-1, 1]) {
        curvedHorn3(H, [[sx * 0.62, 0.5, 0.12], [sx * 1.08, 0.92, -0.02], [sx * 1.24, 1.42, -0.26], [sx * 1.04, 1.86, -0.52]], 0.17, OBSIDIAN3, { shine: 0.7 });
        H(sphere3(0.075, 6, 4), glut, { p: [sx * 1.04, 1.86, -0.52], mat: 'glow' });
        H(torus3(0.19, 0.035, Math.PI * 2, 3, 12), GOLD3, { p: [sx * 0.68, 0.56, 0.1], r: [0.3, 0, sx * 0.9], shine: 1 });
      }
      for (let k = 0; k < 3; k++) emberSpike3(H, [0, 0.94 - k * 0.03, 0.36 - k * 0.42], [0, 1, -0.22 - k * 0.22], 0.58 - k * 0.09, 0.14);
      H(G3.gem(), '#ffb040', { p: [0, 0.4, 0.95], s: [0.1, 0.14, 0.06], mat: 'glow' });
    },
    schulter(S, sx) {
      for (let k = 0; k < 3; k++) emberSpike3(S, [sx * (0.01 + k * 0.045), 0.05, (k - 1) * 0.075], [sx * (0.45 + k * 0.3), 1, (k - 1) * 0.35], 0.21 - k * 0.03, 0.05);
      S(torus3(0.09, 0.012, Math.PI * 2, 3, 14), GOLD3, { p: [sx * 0.04, 0.02, 0], r: [Math.PI / 2, 0, 0], shine: 1 });
    },
    brust(W, g) {
      const y = g.chestY + 0.05;
      const z = torsoAt3(g, y)[1] + 0.016;
      W(G3.gem(), '#ff8a2a', { p: [0, y, z], s: [0.04, 0.058, 0.02], mat: 'glow' });
      for (const sx of [-1, 1]) {
        crescent3(W, [sx * 0.075, y + 0.01, z - 0.012], 0.055, 0.011, sx > 0 ? 0 : Math.PI, 2.3, GOLD3);
        emberSpike3(W, [sx * 0.05, y - 0.07, z - 0.02], [sx * 0.5, -1, 0.3], 0.07, 0.022);
      }
    },
    ruecken(W, g) {
      for (const sx of [-1, 1]) {
        wing3(W, [sx * 0.13, g.shY + 0.0, -0.2], sx, 5, 0.64, '#3a1a16', '#ff7a2a', { shine: 0.3 }, -0.3);
        emberSpike3(W, [sx * 0.11, g.shY + 0.0, -0.17], [sx * 0.6, 1, -0.6], 0.16, 0.035);
      }
    }
  },
  ninja: {
    helm(H) {
      const mond = '#e6e0ff';
      crescent3(H, [0, 1.02, 0.74], 0.5, 0.075, -Math.PI / 2, 2.6, mond, { mat: 'glow' });
      H(G3.gem(), '#b89cff', { p: [0, 0.56, 0.95], s: [0.07, 0.1, 0.05], mat: 'glow' });
      for (const sx of [-1, 1]) {
        limbBetween(H, [sx * 0.28, -0.05, -0.92], [sx * 0.5, -0.75, -1.28], 0.085, 0.05, '#6a4ad8', { seg: 5 });
        limbBetween(H, [sx * 0.5, -0.75, -1.28], [sx * 0.42, -1.45, -1.5], 0.05, 0.012, '#8a6aff', { seg: 5 });
      }
    },
    schulter(S, sx) {
      crescent3(S, [sx * 0.03, 0.09, 0], 0.125, 0.02, sx > 0 ? 0.75 : Math.PI - 0.75, 2.3, '#dcd6ff', { shine: 1 });
      S(G3.gem(), '#b89cff', { p: [sx * 0.03, 0.06, 0.03], s: [0.022, 0.03, 0.016], mat: 'glow' });
    },
    brust(W, g) {
      const y = g.chestY + 0.06;
      const z = torsoAt3(g, y)[1] + 0.014;
      crescent3(W, [0, y, z], 0.058, 0.013, -Math.PI / 2, 2.7, '#cdbfff', { mat: 'glow' });
      W(sphere3(0.014, 6, 4), '#ffffff', { p: [0, y + 0.012, z + 0.004], mat: 'glow' });
    },
    ruecken(W, g) {
      // hoch hinter dem Kopf, damit der Ring auch von oben über Umhang und Schultern zu sehen ist
      const at = [0, g.shY + 0.3, -0.27];
      crescent3(W, at, 0.4, 0.026, -Math.PI / 2, 3.9, '#b8a8ff', { mat: 'glow' });
      crescent3(W, at, 0.32, 0.01, -Math.PI / 2, 3.2, '#ece6ff', { mat: 'glow' });
      for (const sx of [-1, 1]) W(G3.gem(), '#b89cff', { p: [at[0] + sx * 0.37, at[1] + 0.15, at[2]], s: [0.03, 0.046, 0.02], mat: 'glow' });
    }
  },
  schamane: {
    helm(H) {
      for (const sx of [-1, 1]) wing3(H, [sx * 0.46, 0.78, -0.12], sx, 4, 0.95, '#2fbfae', '#e8fff8', {}, -0.25);
      floatGem3(H, [0, 1.28, 0.28], 0.12, '#7ffff0');
      hArc3(H, 1.04, 0.045, 0.52, 0, 2.6, GOLD3, { shine: 1 });
    },
    schulter(S, sx) {
      wing3(S, [sx * 0.02, 0.03, 0], sx, 3, 0.27, '#2fbfae', '#f4fffb', {}, -0.2);
      S(sphere3(0.026, 8, 6), '#7ffff0', { p: [sx * 0.02, 0.07, 0.05], mat: 'glow' });
    },
    brust(W, g) {
      // Kette aus Geisterperlen im Bogen über die Brust
      for (let k = -3; k <= 3; k++) {
        const y = g.chestY + 0.1 - (1 - (k * k) / 9) * 0.085;
        const [rx, rz] = torsoAt3(g, y);
        const a = k * 0.26;
        W(sphere3(k === 0 ? 0.022 : 0.013, 8, 6), k === 0 ? '#7ffff0' : '#c8fff4', { p: [Math.sin(a) * (rx + 0.012), y, Math.cos(a) * (rz + 0.012)], mat: 'glow' });
      }
    },
    ruecken(W, g) {
      for (const sx of [-1, 1]) wing3(W, [sx * 0.12, g.shY + 0.0, -0.2], sx, 5, 0.66, '#1f9f92', '#dffff6', {}, -0.3);
    }
  },
  nekromant: {
    helm(H) {
      const seele = '#7dff8a';
      for (let k = 0; k < 7; k++) {
        const a = (k - 3) * 0.46;
        coneAlong(H, G3.spike(), [Math.sin(a) * 0.86, 0.7, Math.cos(a) * 0.86], [Math.sin(a) * 0.28, 1, Math.cos(a) * 0.28], k === 3 ? 0.78 : k % 2 ? 0.42 : 0.56, 0.13, BONE3, { shade: 0.2 });
      }
      hArc3(H, 0.9, 0.06, 0.7, 0, 3.4, BONE3);
      flame3(H, [0, 1.02, -0.05], [0, 1, -0.1], 0.95, 0.3, '#3ad86a', '#d8ffe0');
      skull3(H, [0, 0.66, 0.93], 0.19, seele);
    },
    schulter(S, sx) {
      skull3(S, [sx * 0.03, 0.085, 0.02], 0.075, '#7dff8a');
      flame3(S, [sx * 0.03, 0.15, -0.02], [sx * 0.25, 1, -0.2], 0.16, 0.05, '#3ad86a', '#d8ffe0');
    },
    brust(W, g) {
      ribcage3(W, g, BONE3);
      const y = g.chestY + 0.02;
      W(G3.gem(), '#7dff8a', { p: [0, y, torsoAt3(g, y)[1] + 0.02], s: [0.03, 0.045, 0.018], mat: 'glow' });
    },
    ruecken(W, g) {
      for (let k = -2; k <= 2; k++) if (k) flame3(W, [k * 0.13, g.shY + 0.02, -0.22], [k * 0.22, 1, -0.2], 0.56 - Math.abs(k) * 0.1, 0.085, '#2fbf5a', '#d8ffe0');
    }
  },
  magier: {
    helm(H) {
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + 0.5;
        star3(H, [Math.cos(a) * 1.55, 1.05 + (k % 2) * 0.3, Math.sin(a) * 1.55], 0.17, k % 2 ? '#ffe9a8' : '#9fd8ff');
      }
      star3(H, [0, 0.5, 1.04], 0.17, '#ffe9a8');
    },
    schulter(S, sx) {
      star3(S, [sx * 0.03, 0.17, 0], 0.045, '#9fd8ff');
      crescent3(S, [sx * 0.03, 0.06, 0.02], 0.07, 0.012, -Math.PI / 2, 2.4, PLATIN3);
    },
    brust(W, g) {
      // Sternbild: fünf kleine Sterne, dünn verbunden
      const pts = [[-0.07, 0.11], [-0.025, 0.06], [0.03, 0.09], [0.065, 0.03], [0.0, -0.01]].map(([x, dy]) => {
        const y = g.chestY + dy;
        const [rx, rz] = torsoAt3(g, y);
        const a = x / Math.max(0.05, rx);
        return [Math.sin(a) * (rx + 0.014), y, Math.cos(a) * (rz + 0.014)];
      });
      for (let i = 0; i < pts.length; i++) {
        W(sphere3(i === 2 ? 0.016 : 0.011, 6, 4), i === 2 ? '#ffe9a8' : '#cfe8ff', { p: pts[i], mat: 'glow' });
        if (i) limbBetween(W, pts[i - 1], pts[i], 0.0035, 0.0035, '#9fd8ff', { seg: 4, mat: 'glow' });
      }
    },
    ruecken(W, g) {
      // hoch hinter dem Kopf, damit der Ring auch von oben zu sehen ist
      const at = [0, g.shY + 0.3, -0.27];
      W(torus3(0.4, 0.014, Math.PI * 2, 3, 28), '#9fd8ff', { p: at, mat: 'glow' });
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + Math.PI / 2;
        star3(W, [at[0] + Math.cos(a) * 0.4, at[1] + Math.sin(a) * 0.4, at[2]], k % 2 ? 0.045 : 0.065, k % 2 ? '#9fd8ff' : '#ffe9a8');
      }
    }
  }
};

// Laterne: Boden- und Deckplatte, vier Stäbe, dazwischen das Geisterlicht (sichtbar von allen Seiten), oben ein Dach
function ksLaterne3(W, at, s) {
  const [x, y, z] = at;
  const iron = '#2a2e2a';
  W(roundBox(s, s * 0.12, s, s * 0.04), iron, { p: [x, y - s * 0.55, z], shine: 0.6 });
  W(roundBox(s, s * 0.12, s, s * 0.04), iron, { p: [x, y + s * 0.55, z], shine: 0.6 });
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) W(roundBox(s * 0.1, s * 1.1, s * 0.1, s * 0.03), iron, { p: [x + dx * s * 0.45, y, z + dz * s * 0.45] });
  W(ball(8), '#f0ffc8', { p: [x, y, z], s: [s * 0.36, s * 0.46, s * 0.36], mat: 'glow' });
  W(G3.spike(), iron, { p: [x, y + s * 0.6, z], s: [s * 0.6, s * 0.5, s * 0.6] });
}

// --- Aussehen der zweiten Reihe (seit 15.45) -------------------------------------------------------------------------
// Gleiche Rahmen wie KS_LOOK. Bewusst ohne Ringe und Sterne: Kämme, Ohren, Muscheln, Käfige, Blätter und Klingen.
const KS_LOOK2 = {
  krieger: {
    helm(H) {
      // goldener Kamm aus Platten von der Stirn bis in den Nacken, dahinter eine Mähne aus roten Federn
      for (let k = 0; k < 7; k++) {
        const t = 0.95 - k * 0.36;
        const r = 1.02 + 0.06 * Math.sin((k / 6) * Math.PI);
        H(roundBox(0.1, 0.34 + 0.1 * Math.sin((k / 6) * Math.PI), 0.3, 0.04), k % 2 ? '#f6d27a' : GOLD3, { p: [0, Math.cos(t) * r, Math.sin(t) * r], r: [t, 0, 0], shine: 1 });
      }
      for (let k = 0; k < 5; k++) H(G3.feather(), k % 2 ? '#e0583a' : '#b83a24', { p: [(k - 2) * 0.09, 0.62, -0.92], r: [-2.35 - Math.abs(k - 2) * 0.08, 0, (k - 2) * 0.22], s: 0.95 - Math.abs(k - 2) * 0.08, top: '#ffb06a', topK: 0.5 });
      // Wangenschutz und Löwenstirn
      for (const sx of [-1, 1]) H(roundBox(0.12, 0.42, 0.36, 0.05), GOLD3, { p: [sx * 0.86, -0.15, 0.32], r: [0, sx * 0.5, sx * 0.1], shine: 1 });
      H(G3.disc(), '#f6d27a', { p: [0, 0.52, 0.93], s: [0.19, 0.19, 1], r: [-0.45, 0, 0], shine: 1 });
      H(G3.gem(), '#ff7a3a', { p: [0, 0.52, 1.0], s: [0.07, 0.09, 0.05], mat: 'glow' });
    },
    schulter(S, sx) {
      // drei goldene Lamellen übereinander, darauf ein Büschel Löwenmähne
      for (let k = 0; k < 3; k++) S(roundBox(0.2 - k * 0.02, 0.045, 0.21, 0.02), k % 2 ? '#f6d27a' : GOLD3, { p: [sx * (0.03 + k * 0.025), 0.1 - k * 0.045, 0], r: [0, 0, sx * (0.32 + k * 0.18)], shine: 1 });
      for (let k = 0; k < 4; k++) coneAlong(S, G3.spike(), [sx * (0.0 + k * 0.012), 0.12, (k - 1.5) * 0.045], [sx * 0.5, 1, (k - 1.5) * 0.3], 0.12, 0.05, k % 2 ? '#c8582a' : '#a8401e');
    },
    brust(W, g) {
      // Wappenschild mit Löwenstein und zwei Bändern
      const y = g.chestY + 0.04;
      const z = torsoAt3(g, y)[1] + 0.018;
      W(roundBox(0.11, 0.13, 0.02, 0.03), GOLD3, { p: [0, y, z], shine: 1 });
      W(roundBox(0.085, 0.105, 0.02, 0.025), '#8a2a1a', { p: [0, y, z + 0.006] });
      W(G3.gem(), '#ffb040', { p: [0, y, z + 0.016], s: [0.026, 0.034, 0.014], mat: 'glow' });
      for (const sx of [-1, 1]) W(roundBox(0.012, 0.16, 0.01, 0.005), '#f6d27a', { p: [sx * 0.07, y + 0.02, z - 0.008], r: [0, 0, sx * 0.5], shine: 1 });
    },
    ruecken(W, g) {
      // großer Rundschild auf dem Rücken: Goldscheibe, darauf das rote Feld und ein Löwenbuckel (hinter dem Umhang)
      const at = [0.02, g.shY - 0.08, -0.33];
      W(G3.disc(), GOLD3, { p: at, s: [0.3, 0.3, 0.7], r: [0.12, 0, 0.2], shine: 1 });
      W(G3.disc(), '#8a2a1a', { p: [at[0], at[1], at[2] - 0.016], s: [0.25, 0.25, 0.5], r: [0.12, 0, 0.2] });
      W(ball(10), GOLD3, { p: [at[0], at[1] - 0.004, at[2] - 0.04], s: [0.075, 0.075, 0.045], shine: 1 });
      W(G3.gem(), '#ffb040', { p: [at[0], at[1] - 0.006, at[2] - 0.08], s: [0.026, 0.034, 0.02], mat: 'glow' });
    }
  },
  ninja: {
    helm(H) {
      // Fuchsohren und eine Fuchsmaske schräg an der Stirn
      for (const sx of [-1, 1]) {
        coneAlong(H, G3.spike(), [sx * 0.5, 0.78, 0.0], [sx * 0.38, 1, -0.05], 0.62, 0.34, '#e8e4d8', { top: '#3a3430', topK: 0.55 });
        coneAlong(H, G3.spike(), [sx * 0.5, 0.82, 0.07], [sx * 0.38, 1, -0.05], 0.42, 0.18, '#7ad8b0', { mat: 'glow' });
      }
      const M = (geo, c, o) => H(geo, c, Object.assign({}, o, { p: [o.p[0] + 0.45, o.p[1] + 0.55, o.p[2] + 0.62] }));
      M(ball(10), '#f2eee4', { p: [0, 0, 0], s: [0.32, 0.36, 0.2], r: [0, 0.6, 0.35], shade: 0.2 });
      M(G3.spike(), '#f2eee4', { p: [0.05, -0.1, 0.18], r: [1.3, 0.5, 0], s: [0.12, 0.3, 0.12] });
      for (const sx of [-1, 1]) M(roundBox(0.08, 0.025, 0.02, 0.01), '#d83a3a', { p: [sx * 0.11 + 0.04, 0.08, 0.17], r: [0, 0.6, sx * 0.4] });
      M(sphere3(0.035, 6, 4), '#7ad8b0', { p: [0.04, 0.2, 0.17], mat: 'glow' });
    },
    schulter(S, sx) {
      // Lamellen aus dunklem Lack mit grünen Säumen, darunter ein Kunai
      for (let k = 0; k < 3; k++) S(roundBox(0.15, 0.035, 0.16, 0.015), k % 2 ? '#2e4a42' : '#22342e', { p: [sx * (0.02 + k * 0.02), 0.08 - k * 0.04, 0], r: [0, 0, sx * (0.4 + k * 0.15)], top: '#7ad8b0', topK: 0.25, shine: 0.6 });
      coneAlong(S, G3.gem(), [sx * 0.1, -0.03, 0.06], [sx * 0.2, -1, 0.1], 0.13, 0.03, '#c8e8dc', { shine: 1 });
    },
    brust(W, g) {
      // zwei gekreuzte Gurte mit Jadescheibe
      const y = g.chestY + 0.03;
      const z = torsoAt3(g, y)[1] + 0.014;
      for (const sx of [-1, 1]) W(roundBox(0.022, 0.3, 0.012, 0.006), '#2e2a26', { p: [0, y, z], r: [0, 0, sx * 0.62] });
      W(G3.disc(), '#7ad8b0', { p: [0, y, z + 0.01], s: [0.034, 0.034, 0.3], mat: 'glow' });
      W(G3.disc(), '#22342e', { p: [0, y, z + 0.006], s: [0.046, 0.046, 0.25] });
    },
    ruecken(W, g) {
      // zwei gekreuzte Klingen auf dem Rücken, Griffe über den Schultern
      for (const sx of [-1, 1]) {
        const a = [sx * 0.27, g.shY + 0.22, -0.27];
        const b = [-sx * 0.24, g.shY - 0.4, -0.26];
        const m = [a[0] + (b[0] - a[0]) * 0.25, a[1] + (b[1] - a[1]) * 0.25, a[2] + (b[2] - a[2]) * 0.25];
        limbBetween(W, a, m, 0.018, 0.018, '#2e2a26', { seg: 5 });
        limbBetween(W, m, b, 0.014, 0.004, '#d8e8e4', { seg: 4, shine: 1 });
        W(G3.disc(), '#7ad8b0', { p: m, s: [0.035, 0.035, 0.4], r: [Math.PI / 2, 0, sx * 0.55], shine: 1 });
      }
    }
  },
  schamane: {
    helm(H) {
      // Krone aus Muscheln und Perlen, seitlich wachsen Korallen wie ein Geweih
      for (let k = 0; k < 5; k++) {
        const a = (k - 2) * 0.42;
        const p = [Math.sin(a) * 0.9, 0.72 + (k === 2 ? 0.08 : 0), Math.cos(a) * 0.9];
        H(G3.scale(), k % 2 ? '#f4e8e0' : '#ffd8c8', { p, s: [0.24, 0.24, 0.2], r: [-1.1, a, 0], shine: 0.8, top: '#ffffff', topK: 0.4 });
        H(sphere3(0.07, 8, 6), '#f4f8ff', { p: [p[0] * 1.05, p[1] - 0.12, p[2] * 1.05], shine: 1 });
      }
      for (const sx of [-1, 1]) {
        const c = '#ff8a7a';
        limbBetween(H, [sx * 0.62, 0.62, -0.1], [sx * 0.95, 1.2, -0.2], 0.07, 0.05, c, { seg: 5 });
        limbBetween(H, [sx * 0.95, 1.2, -0.2], [sx * 1.0, 1.6, -0.35], 0.05, 0.025, c, { seg: 5 });
        limbBetween(H, [sx * 0.85, 1.05, -0.17], [sx * 1.25, 1.35, -0.1], 0.04, 0.02, c, { seg: 5 });
        H(sphere3(0.06, 6, 4), '#3ab8e0', { p: [sx * 1.0, 1.6, -0.35], mat: 'glow' });
      }
    },
    schulter(S, sx) {
      // große Jakobsmuschel mit Perle
      S(G3.scale(), '#ffd8c8', { p: [sx * 0.03, 0.08, 0], s: [0.15, 0.17, 0.14], r: [0, 0, sx * 0.45], shine: 0.8, top: '#fff4ee', topK: 0.5 });
      for (let k = -2; k <= 2; k++) S(roundBox(0.012, 0.012, 0.15, 0.005), '#e8b8a8', { p: [sx * (0.03 + k * 0.022), 0.13 - Math.abs(k) * 0.008, 0], r: [0, 0, sx * 0.45 + k * 0.2] });
      S(sphere3(0.028, 8, 6), '#bfeeff', { p: [sx * 0.03, 0.08, 0.07], mat: 'glow' });
    },
    brust(W, g) {
      // Anhänger aus Perlen und einer Muschel
      for (let k = -3; k <= 3; k++) {
        const y = g.chestY + 0.1 - (1 - (k * k) / 9) * 0.09;
        const [rx, rz] = torsoAt3(g, y);
        const a = k * 0.25;
        W(sphere3(0.011, 6, 4), '#f4f8ff', { p: [Math.sin(a) * (rx + 0.012), y, Math.cos(a) * (rz + 0.012)], shine: 1 });
      }
      const y = g.chestY + 0.0;
      const z = torsoAt3(g, y)[1] + 0.02;
      W(G3.scale(), '#ffd8c8', { p: [0, y, z], s: [0.04, 0.045, 0.035], r: [-1.3, 0, 0], shine: 0.8 });
      W(sphere3(0.014, 8, 6), '#3ab8e0', { p: [0, y + 0.005, z + 0.02], mat: 'glow' });
    },
    ruecken(W, g) {
      // gewundenes Muschelhorn quer über dem Rücken, dazu Tang von den Schultern
      curvedHorn3(W, [[-0.22, g.shY - 0.28, -0.24], [-0.05, g.shY - 0.12, -0.27], [0.1, g.shY + 0.03, -0.27], [0.2, g.shY + 0.16, -0.25], [0.24, g.shY + 0.26, -0.22]], 0.075, '#f2e4d4', { shine: 0.7 });
      W(sphere3(0.05, 8, 6), '#3ab8e0', { p: [-0.23, g.shY - 0.29, -0.24], mat: 'glow' });
      for (const sx of [-1, 0, 1]) {
        const x = sx * 0.12;
        limbBetween(W, [x, g.shY + 0.02, -0.21], [x + 0.03, g.shY - 0.25, -0.24], 0.016, 0.012, '#2e8a6a', { seg: 4 });
        limbBetween(W, [x + 0.03, g.shY - 0.25, -0.24], [x - 0.02, g.shY - 0.5, -0.25], 0.012, 0.004, '#3aa07a', { seg: 4 });
      }
    }
  },
  nekromant: {
    helm(H) {
      // Krone als eiserner Laternenkäfig hoch über dem Kopf, darin schwebt ein Geisterlicht
      const iron = '#3a3e3a';
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        limbBetween(H, [Math.sin(a) * 0.62, 1.1, Math.cos(a) * 0.62], [Math.sin(a) * 0.52, 1.8, Math.cos(a) * 0.52], 0.045, 0.035, iron, { seg: 4, shine: 0.6 });
        limbBetween(H, [Math.sin(a) * 0.52, 1.8, Math.cos(a) * 0.52], [0, 2.25, 0], 0.035, 0.028, iron, { seg: 4, shine: 0.6 });
      }
      H(G3.spike(), iron, { p: [0, 2.22, 0], s: [0.1, 0.4, 0.1], shine: 0.6 });
      H(sphere3(0.3, 10, 8), '#f0ffd8', { p: [0, 1.6, 0], mat: 'glow' });
      H(sphere3(0.42, 10, 8), '#9ad8c0', { p: [0, 1.6, 0], mat: 'glow', s: [1, 1.1, 1] });
      for (const sx of [-1, 1]) H(roundBox(0.1, 0.5, 0.04, 0.02), '#24302a', { p: [sx * 0.6, 0.35, -0.72], r: [0.4, sx * 0.5, 0] });
    },
    schulter(S, sx) {
      // kleine Laterne an einer Kette
      ksLaterne3(S, [sx * 0.06, 0.08, 0.03], 0.09);
    },
    brust(W, g) {
      // schwere Kette quer über die Brust mit einem Schloss
      for (let k = 0; k < 7; k++) {
        const t = k / 6;
        const x = -0.1 + t * 0.2;
        const y = g.chestY + 0.11 - t * 0.14;
        const z = torsoAt3(g, y)[1] + 0.012;
        W(torus3(0.016, 0.005, Math.PI * 2, 3, 8), '#5a5e5a', { p: [x, y, z], r: [0, k % 2 ? Math.PI / 2 : 0, 0.8], shine: 0.7 });
      }
      const y = g.chestY + 0.0;
      const z = torsoAt3(g, y)[1] + 0.02;
      W(roundBox(0.045, 0.04, 0.016, 0.01), '#3a3e3a', { p: [0.0, y, z], shine: 0.7 });
      W(sphere3(0.01, 6, 4), '#c8ffe0', { p: [0, y, z + 0.01], mat: 'glow' });
    },
    ruecken(W, g) {
      // Laternenstab am Rücken, oben ein Haken über die Schulter, daran hängt die Geisterlaterne; zerschlissene Bahnen
      curvedHorn3(W, [[0.16, g.shY - 0.36, -0.27], [0.18, g.shY + 0.15, -0.29], [0.2, g.shY + 0.6, -0.26], [0.26, g.shY + 0.78, -0.16], [0.3, g.shY + 0.78, -0.04]], 0.03, '#2a2622', { shine: 0.4 });
      const L = [0.3, g.shY + 0.6, -0.04];
      W(roundBox(0.008, 0.08, 0.008, 0.004), '#3a3e3a', { p: [L[0], L[1] + 0.14, L[2]] });
      ksLaterne3(W, L, 0.15);
      for (let k = -2; k <= 2; k++) W(roundBox(0.05, 0.3 - Math.abs(k) * 0.05, 0.008, 0.004), k % 2 ? '#24302a' : '#1a221e', { p: [k * 0.055, g.shY - 0.16, -0.25], r: [0.08, 0, k * 0.06] });
    }
  },
  magier: {
    helm(H) {
      // Krone aus goldenen Blättern über der Stirn, in der Mitte ein Sonnenstein
      for (let k = 0; k < 7; k++) {
        const a = (k - 3) * 0.26;
        H(G3.feather(), k % 2 ? '#f6d27a' : GOLD3, { p: [Math.sin(a) * 0.86, 0.66, Math.cos(a) * 0.86], r: [-0.25, a, -a * 0.6], s: 0.95 - Math.abs(k - 3) * 0.13, top: '#fff2c0', topK: 0.5, shine: 1 });
      }
      H(G3.gem(), '#ff9a2a', { p: [0, 0.82, 0.98], s: [0.14, 0.2, 0.09], mat: 'glow' });
      H(G3.gem(), '#fff2c0', { p: [0, 0.82, 1.03], s: [0.06, 0.09, 0.05], mat: 'glow' });
    },
    schulter(S, sx) {
      // goldene Blätter, die sich nach oben wölben, mit einem Bernstein
      for (let k = 0; k < 3; k++) S(G3.scale(), k === 1 ? '#f6d27a' : GOLD3, { p: [sx * (0.02 + k * 0.02), 0.09 - k * 0.025, (k - 1) * 0.05], s: [0.1, 0.12, 0.08], r: [0, 0, sx * (0.5 + k * 0.2)], shine: 1 });
      S(G3.gem(), '#ff9a2a', { p: [sx * 0.04, 0.1, 0.06], s: [0.022, 0.03, 0.016], mat: 'glow' });
    },
    brust(W, g) {
      // breiter Halskragen aus Goldplättchen mit drei Steinen
      for (let k = -4; k <= 4; k++) {
        const y = g.chestY + 0.12 - (1 - (k * k) / 16) * 0.06;
        const [rx, rz] = torsoAt3(g, y);
        const a = k * 0.2;
        W(roundBox(0.03, 0.05, 0.008, 0.008), k % 2 ? '#f6d27a' : GOLD3, { p: [Math.sin(a) * (rx + 0.012), y, Math.cos(a) * (rz + 0.012)], r: [0, a, 0], shine: 1 });
      }
      for (const k of [-2, 0, 2]) {
        const y = g.chestY + 0.12 - (1 - (k * k) / 16) * 0.06 - 0.03;
        const [rx, rz] = torsoAt3(g, y);
        W(G3.gem(), k ? '#3ab8e0' : '#ff9a2a', { p: [Math.sin(k * 0.2) * (rx + 0.022), y, Math.cos(k * 0.2) * (rz + 0.022)], s: [0.014, 0.02, 0.01], mat: 'glow' });
      }
    },
    ruecken(W, g) {
      // Lichtprismen wachsen aus dem oberen Rücken, verschieden hoch, wie gebündeltes Mittagslicht
      const P = [[-0.2, 0.26, 0.42], [-0.1, 0.4, 0.62], [0, 0.48, 0.76], [0.1, 0.38, 0.58], [0.2, 0.24, 0.4]];
      for (const [x, dy, len] of P) {
        coneAlong(W, G3.gem(), [x, g.shY + dy - len * 0.35, -0.3], [x * 0.7, 1, -0.2], len * 0.55, 0.065, '#ffe9a8', { mat: 'glow' });
        coneAlong(W, G3.gem(), [x, g.shY + dy - len * 0.35, -0.32], [x * 0.7, 1, -0.2], len * 0.35, 0.03, '#ffffff', { mat: 'glow' });
      }
      W(G3.gem(), '#ff9a2a', { p: [0, g.shY + 0.02, -0.27], s: [0.04, 0.05, 0.03], mat: 'glow' });
    }
  }
};

if (typeof playerConfig3 === 'function') {
  const _ksConfig = playerConfig3;
  // eslint-disable-next-line no-global-assign
  playerConfig3 = function (p) {
    const c = _ksConfig(p);
    if (!p || !c || !KLASSEN_SETS[p.classId]) return c;
    const eq = p.equipment || {};
    // je Platz das Aussehen der Reihe, zu der das angelegte Teil gehört (beide Reihen lassen sich mischen)
    const look = (sl) => {
      const set = eq[sl] && eq[sl].set;
      if (!set) return null;
      if (set === KLASSEN_SETS[p.classId].id) return KS_LOOK[p.classId];
      if (KLASSEN_SETS2[p.classId] && set === KLASSEN_SETS2[p.classId].id) return KS_LOOK2[p.classId] || null;
      return null;
    };
    const teil = { helm: look('helm'), schultern: look('schultern'), ruestung: look('ruestung'), umhang: look('umhang') };
    if (!teil.helm && !teil.schultern && !teil.ruestung && !teil.umhang) return c;
    if (teil.helm) {
      const hg = c.headgear;
      c.headgear = (A, hb, hc, hr, spin) => {
        if (hg) hg(A, hb, hc, hr, spin);
        teil.helm.helm(headFrame3(A, hb, hc, hr));
      };
    }
    const gear = c.gear;
    c.gear = (A, g) => {
      if (gear) gear(A, g);
      if (g.belly) return;
      const W = frame3(A, BH.chest, [0, 0, 0]);
      if (teil.ruestung) teil.ruestung.brust(W, g);
      if (teil.umhang) teil.umhang.ruecken(W, g);
      if (teil.schultern) for (const [sx, ab] of [[1, BH.armL], [-1, BH.armR]]) teil.schultern.schulter(frame3(A, ab, [sx * (g.shX + 0.045), g.shY + 0.075, 0]), sx);
    };
    return c;
  };
}
