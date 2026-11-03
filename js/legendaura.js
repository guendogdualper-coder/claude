// Legenden-Aura (seit 13.50): Wer legendäre Teile auf +20 trägt, bekommt eine Aura um die ganze Figur.
// Je mehr solcher Teile, desto kräftiger (1 Teil leicht, ab 6 Teilen volle Stärke). Die Farbe richtet sich nach der
// Stufe dieser Teile – also danach, wie die Ausrüstung aussieht:
//   Legendär (Lv 22)  Glut: kupfern-orange Funken
//   Mythisch (Lv 30)  Asche: schwarzer Rauch mit roter Glut (dunkle Rüstung → dunkle Aura)
//   Himmlisch (Lv 45) Himmel: blau-weißes Leuchten mit Lichtfunken
//   Göttlich (Lv 60)  Gold: strahlendes Gold, Lichtschimmer und Sternfunken
//   Lv 70 / Lv 80     (neue Stufen) Abgrund: violett-schwarze Leere · Ewig: weißes Sternenlicht in allen Farben
// Nichts davon liegt am Boden; alles steigt an der Figur auf. Mitspieler sehen die Aura auch (über eq.rarity/eq.legend).
// Seit 13.56 zählen Endboss-Teile (legend) sowie epische und legendäre Teile (Seltenheit 3 und 4) ab +20 –
// wer die Aura vorher hatte, behält sie. Ältere Mitspieler schicken noch keine Seltenheit: dort zählt eq.legend.

const LEGEND_AURA = {
  minPlus: 20,
  full: 6,
  themes: [
    { glow: ['#ff9a4a', '#ffd08a', '#ff6a2a'], core: '#ffb066' }, // bis Legendär
    { glow: ['#ff3a1a', '#ff7a2a'], smoke: '#120d10', core: '#5a1010', dark: true }, // Mythisch: Asche
    { glow: ['#9fd8ff', '#e8f6ff', '#6ab8ff'], core: '#bfe6ff' }, // Himmlisch
    { glow: ['#ffd34d', '#fff3b0', '#ffb32a', '#ffffff'], core: '#ffe08a', stars: true }, // Göttlich
    { glow: ['#b84aff', '#5a2aff', '#ff4ad8'], smoke: '#0c0618', core: '#3a1a6a', dark: true }, // Abgrund (Lv 70)
    { glow: ['#ffffff', '#ffd6f0', '#c8f0ff', '#fff3b0'], core: '#ffffff', stars: true, prism: true } // Ewig (Lv 80)
  ]
};

// Stärke (0 = keine) und Thema einer Ausrüstung
function legendAuraOf(eq) {
  if (!eq) return null;
  let n = 0;
  let top = -1;
  for (const it of Object.values(eq)) {
    if (!it || (it.plus || 0) < LEGEND_AURA.minPlus) continue;
    if (!it.legend && !((it.rarity || 0) >= 3)) continue;
    n++;
    top = Math.max(top, it.tier || 0);
  }
  if (!n) return null;
  const idx = top >= 9 ? 5 : top >= 8 ? 4 : top >= 7 ? 3 : top >= 6 ? 2 : top >= 5 ? 1 : 0;
  return { n, power: 0.35 + 0.65 * Math.min(1, n / LEGEND_AURA.full), theme: LEGEND_AURA.themes[idx] };
}

// Zeichnen je Bild für jede sichtbare Figur mit Aura
const FX3_LEGEND = { parts: [], fn: fx3LegendAuras };
function fx3LegendAuras(h) {
  const list = [];
  const p = game.player;
  if (p && game.running && !p.dead && !(game.stats && game.stats.invisible)) list.push([p, p.equipment]);
  for (const rp of net.players.values()) if (!rp.dead && !remoteHidden(rp)) list.push([rp, rp.equipment]);
  const low = typeof n3low === 'function' && n3low();
  const t = game.time;
  for (const [who, eq] of list) {
    if (!v3InView(who.x, who.y, 80)) continue;
    const a = legendAuraOf(eq);
    if (!a) continue;
    const x = who.x * U3;
    const z = feetY(who) * U3;
    const P = a.power;
    const T = a.theme;
    const seed = (who.x * 0.013 + who.y * 0.007) % 7;
    // weicher Körperschein
    n3Glow(h, x, 1.0, z, 1.7 + P * 1.1, T.core, (T.dark ? 0.45 : 0.32) * P * (0.85 + 0.15 * Math.sin(t * 2.2 + seed)));
    // dunkle Themen: Rauchschleier steigt an der Figur auf
    if (T.smoke) {
      const m = low ? 4 : 8;
      for (let i = 0; i < m; i++) {
        const ph = (t * 0.45 + i / m + seed) % 1;
        const ang = i * 2.399 + t * 0.6;
        const rr = 0.35 + ph * 0.35;
        n3Smoke(h, x + Math.cos(ang) * rr, 0.2 + ph * 2.0, z + Math.sin(ang) * rr * 0.8, 0.65 + ph * 0.7, T.smoke, (1 - ph) * 0.7 * P);
      }
    }
    // aufsteigende Funken in den Farben des Themas
    const n = Math.round((low ? 6 : 12) + P * (low ? 6 : 14));
    for (let i = 0; i < n; i++) {
      const ph = (t * (0.5 + (i % 3) * 0.12) + i / n + seed) % 1;
      const ang = i * 2.399 + t * (0.8 + (i % 2) * 0.4);
      const rr = 0.32 + 0.3 * Math.sin(i * 1.7 + seed);
      let col = T.glow[i % T.glow.length];
      if (T.prism) col = `hsl(${Math.round((t * 60 + i * 40) % 360)},90%,82%)`;
      n3Glow(h, x + Math.cos(ang) * rr, 0.15 + ph * 2.3, z + Math.sin(ang) * rr * 0.8, (0.13 + 0.08 * P) * (1 - ph * 0.4), col, (1 - ph) * (0.65 + 0.35 * P));
    }
    // ab vier Teilen: ein Ring aus Licht kreist in Hüfthöhe
    if (a.n >= 4) {
      const m = low ? 8 : 14;
      for (let i = 0; i < m; i++) {
        const ang = (i / m) * Math.PI * 2 + t * 1.6;
        const col = T.prism ? `hsl(${Math.round((t * 80 + i * 26) % 360)},90%,80%)` : T.glow[i % T.glow.length];
        n3Glow(h, x + Math.cos(ang) * 0.62, 0.75 + Math.sin(ang * 2 + t * 3) * 0.05, z + Math.sin(ang) * 0.5, 0.16, col, 0.55 * P);
      }
    }
    // Gold und Ewig: Sternfunken blitzen kurz auf
    if (T.stars && !low) {
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.9 + i * 0.33 + seed) % 1;
        if (ph > 0.3) continue;
        const k = ph / 0.3;
        const sx = x + Math.sin(i * 2.1 + Math.floor(t * 0.9 + i * 0.33)) * 0.55;
        const sy = 0.6 + ((i * 0.37 + Math.floor(t * 0.9)) % 1) * 1.6;
        const s = 0.35 * Math.sin(k * Math.PI);
        fx3MageSprite(h, 'sprite', 'disc', sx, sy, z, s, 0.05, '#ffffff', 0.9 * P);
        fx3MageSprite(h, 'sprite', 'disc', sx, sy, z, 0.05, s, '#ffffff', 0.9 * P);
      }
    }
  }
}
FX3_HOOKS.push(FX3_LEGEND);
