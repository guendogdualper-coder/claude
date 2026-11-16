'use strict';

// Klassen-Sets (seit 15.40): je Klasse ein legendäres Lv-80-Set mit eigenem Aussehen. Bisher gab es Sets nur je
// Instanz (ITEM_SETS, daten/gegenstaende.js) – sie unterschieden sich allein in der Farbe. Die Klassen-Sets haben
// dazu eigene Formen in 3D, die auf den Teilen sitzen: Helm, Schultern, Brust und Umhang tragen je ein Merkmal.
//   Krieger    Rüstung des Drachenkaisers   Obsidianhörner, Glutzacken, Drachenschwingen
//   Ninja      Gewand des Mondschattens     Mondsichel an der Stirn, Sichelklingen, Mondring im Rücken
//   Schamane   Tracht des Sturmgeists       Federkrone, Federmantel, Geisterperlen, Schwingen
//   Nekromant  Ornat des Seelenkönigs       Knochenkrone mit Seelenflamme, Schädel, Rippen, Seelenfeuer
//   Magier     Robe des Sternenwebers       Sternenkranz um den Hut, Sternbild, Sternenring im Rücken
// Woher: legendäre Teile (Ewig, Lv 80) aus den Lv-80-Instanzen und dem Thron der Unterwelt gehören mit KS.chance
// zum Set der Klasse, für die das Teil gemacht ist (Teile ohne Klasse: zur eigenen), sonst wie bisher zum Set der
// Instanz. Die Set-Boni zählen nur für die Klasse des Sets (setCounts).
// Die Kennung steht wie bei allen Sets in item.set; Farbe, Handel, Post, Lager und Spielstand laufen über ITEM_SETS.
const KS = { chance: 0.7, quellen: new Set(['spiegelgruft', 'leerenthron', 'hoellenthron']) };
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
for (const [cls, S] of Object.entries(KLASSEN_SETS)) {
  ITEM_SETS[S.id] = { name: S.name, from: 'Klassen-Set · legendär aus den Lv-80-Instanzen', color: S.color, tiers: S.tiers, cls };
}
const klassenSetOf = (item) => {
  const S = item && typeof item.set === 'string' ? ITEM_SETS[item.set] : null;
  return S && S.cls ? S : null;
};

// --- Beute -----------------------------------------------------------------------------------------------------
if (typeof setTagItem === 'function') {
  const _ksTag = setTagItem;
  // eslint-disable-next-line no-global-assign
  setTagItem = function (item, m) {
    const r = _ksTag(item, m);
    const id = typeof setIdOfMonster === 'function' ? setIdOfMonster(m) : null;
    if (item && id && KS.quellen.has(id) && rarityOf(item) >= 4 && item.tier >= ITEM_TIERS.length - 1 && Math.random() < KS.chance) {
      const cls = item.cls || (game.player && game.player.classId);
      if (KLASSEN_SETS[cls]) item.set = KLASSEN_SETS[cls].id;
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
    const S = game.player ? KLASSEN_SETS[game.player.classId] : null;
    if (!KS.quellen.has(id) || !S) return html;
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

if (typeof playerConfig3 === 'function') {
  const _ksConfig = playerConfig3;
  // eslint-disable-next-line no-global-assign
  playerConfig3 = function (p) {
    const c = _ksConfig(p);
    const S = p ? KLASSEN_SETS[p.classId] : null;
    const L = p ? KS_LOOK[p.classId] : null;
    if (!S || !L || !c) return c;
    const eq = p.equipment || {};
    const hat = (sl) => !!(eq[sl] && eq[sl].set === S.id);
    const teil = { helm: hat('helm'), schultern: hat('schultern'), ruestung: hat('ruestung'), umhang: hat('umhang') };
    if (!teil.helm && !teil.schultern && !teil.ruestung && !teil.umhang) return c;
    if (teil.helm) {
      const hg = c.headgear;
      c.headgear = (A, hb, hc, hr, spin) => {
        if (hg) hg(A, hb, hc, hr, spin);
        L.helm(headFrame3(A, hb, hc, hr));
      };
    }
    const gear = c.gear;
    c.gear = (A, g) => {
      if (gear) gear(A, g);
      if (g.belly) return;
      const W = frame3(A, BH.chest, [0, 0, 0]);
      if (teil.ruestung) L.brust(W, g);
      if (teil.umhang) L.ruecken(W, g);
      if (teil.schultern) for (const [sx, ab] of [[1, BH.armL], [-1, BH.armR]]) L.schulter(frame3(A, ab, [sx * (g.shX + 0.045), g.shY + 0.075, 0]), sx);
    };
    return c;
  };
}
