// Lücken füllen (seit 15.20): Was man auf einer Karte nicht betreten kann, soll trotzdem nach etwas aussehen –
// freier Himmel unter den Himmelsinseln statt einer grauen Fläche, Felswände unter den Inselkanten, Unterholz im
// dichten Wald und so weiter. Wunsch des Spielers: die freien Flächen nutzen, aber nicht mit Dekozeug vollstellen;
// es soll zur Karte passen. Hier steht nur Gezeichnetes (3D): nichts hat eine Kollision, die Welt (Boden, Objekte,
// Wege) bleibt, wie sie ist. Aufbau wie in wahrzeichen.js (WZ_MAPS je Karte, Bake3 je Stelle, je Grafikstufe weniger).
// Keine Bodenringe, Runen oder Sterne.

// --- Frostgipfel: freier Himmel ------------------------------------------------------------------------------
// Vorher: eine einzige Wolkenfläche mit so großen, weichen Formen, dass man aus der Nähe nur einen grauen Verlauf
// sah. Jetzt drei Schichten mit echter Tiefe (sie verschieben sich gegeneinander, wenn man läuft):
//   1. ganz unten der Himmel – kräftiges Blau, nach Dunstfeldern heller,
//   2. tief darunter eine lockere Wolkendecke, kleiner und blasser (weit weg),
//   3. oben, knapp unter den Inseln, einzelne Wolkenballen mit heller Sonnenseite und blaugrauer Schattenseite;
//      sie werfen Schatten auf die Schicht darunter und türmen sich an den Felsen.
// Zwischen den Ballen sieht man hinunter ins Blaue – man steht sichtbar hoch oben im Himmel.
if (typeof LIQUID3 !== 'undefined' && LIQUID3.clouds) {
  Object.assign(LIQUID3.clouds, {
    shallow: '#ffffff', deep: '#8ea6d0', foam: '#ffffff', alpha: 1, level: -3.2,
    pre: `
        float wkH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float wkN(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(wkH(i), wkH(i + vec2(1.0, 0.0)), f.x), mix(wkH(i + vec2(0.0, 1.0)), wkH(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        float wkF(vec2 p) {
          float s = 0.5 * wkN(p);
          p = p * 2.03 + vec2(17.3, 9.1);
          s += 0.25 * wkN(p);
          p = p * 2.01 + vec2(5.7, 23.9);
          s += 0.125 * wkN(p);
          return s / 0.875;
        }`,
    frag: `
          vec3 vd = normalize(vW - cameraPosition);
          vec2 par = vd.xz / max(0.3, -vd.y);
          vec2 wind = vec2(t * 0.05, t * 0.018);
          // 1. Himmel weit unten
          vec2 p3 = p + par * 30.0;
          float hz = wkN(p3 * 0.018 + wind * 0.1);
          vec3 col = mix(vec3(0.16, 0.40, 0.80), vec3(0.46, 0.70, 0.96), hz * hz);
          // 2. ferne Wolkendecke
          vec2 p2 = (p + par * 13.0) * 0.06 + wind * 0.35;
          float n2 = wkF(p2);
          float c2 = smoothstep(0.50, 0.62, n2);
          float l2 = smoothstep(-0.03, 0.05, n2 - wkF(p2 + vec2(0.05, 0.07)));
          vec3 far = mix(vec3(0.55, 0.68, 0.90), vec3(0.90, 0.95, 1.0), l2);
          // 3. Wolkenballen oben
          vec2 p1 = p * 0.12 + wind;
          float n1 = wkF(p1) + 0.07 * wkN(p * 0.9 + wind * 3.0) + (1.0 - d) * 0.07;
          float c1 = smoothstep(0.53, 0.60, n1);
          float l1 = smoothstep(-0.035, 0.05, n1 - wkF(p1 + vec2(0.07, 0.10)) - 0.02);
          vec3 near = mix(uDeep, uShallow, l1);
          near = mix(near, uShallow, smoothstep(0.66, 0.82, n1) * 0.6);
          // Schatten der oberen Ballen auf Decke und Himmel (Sonne im Südosten)
          float sh = smoothstep(0.53, 0.60, wkF((p + par * 13.0 + vec2(2.2, 3.2)) * 0.12 + wind));
          far *= 1.0 - 0.22 * sh;
          col = mix(col, far, c2 * 0.92);
          col = mix(col, near, c1);
          col = mix(col, col * vec3(0.42, 0.50, 0.78), uNight * 0.62);
          float alpha = 1.0;`,
    fragLow: `
          vec2 wind = vec2(t * 0.05, t * 0.018);
          vec2 p1 = p * 0.12 + wind;
          float n1 = wkN(p1 * 2.0) * 0.6 + wkN(p1 * 4.1 + 7.0) * 0.4;
          float c1 = smoothstep(0.50, 0.60, n1);
          vec3 col = mix(vec3(0.24, 0.50, 0.86), mix(uDeep, uShallow, smoothstep(0.55, 0.75, n1)), c1);
          col = mix(col, col * vec3(0.42, 0.50, 0.78), uNight * 0.62);
          float alpha = 1.0;`
  });
}

// --- Frostgipfel: Felswände unter den Inselkanten ------------------------------------------------------------
// Vorher fiel die Schneefläche einfach schräg ab (mit dem Glitzermuster des Bodens auf der Wand). Jetzt hängt unter
// jeder Kante dunkler Schieferfels: oben ein Band mit verschneitem Sims, darunter schmalere, dunklere Zacken – die
// Insel verjüngt sich nach unten und steht sichtbar frei im Himmel. Auf „Niedrig“ nur das obere Band.
if (typeof WZ_MAPS !== 'undefined' && WZ_MAPS[7]) {
  const base7 = WZ_MAPS[7];
  WZ_MAPS[7] = (wm, T) => {
    base7(wm, T);
    const [rx, ry, rw, rh] = wm.region;
    const w = game.world;
    const isCloud = (x, y) => {
      const i = y * MAP_W + x;
      return w.ground[i] === GROUND.WOLKEN && w.deco[i] !== DECO.BRIDGE;
    };
    const B = 24;
    const flip = [Math.PI, 0, 0];
    for (let by = ry; by < ry + rh; by += B) for (let bx = rx; bx < rx + rw; bx += B) {
      let b = null;
      const cx = bx + B / 2;
      const cz = by + B / 2;
      for (let y = by; y < Math.min(by + B, ry + rh); y++) for (let x = bx; x < Math.min(bx + B, rx + rw); x++) {
        const i = y * MAP_W + x;
        if (LIQUID.has(w.ground[i]) || w.deco[i] === DECO.BRIDGE) continue;
        for (let d = 0; d < 4; d++) {
          const dx = [1, -1, 0, 0][d];
          const dy = [0, 0, 1, -1][d];
          if (!isCloud(x + dx, y + dy)) continue;
          const h = townTileHash(x * 5 + d * 3 + 1, y * 3 + d);
          if (!b) b = new Bake3();
          // Lage auf der Kante, längs der Kante leicht versetzt
          const o = ((h % 9) - 4) * 0.03;
          const ex = x + 0.5 + dx * 0.44 + (dy ? o : 0) - cx;
          const ez = y + 0.5 + dy * 0.44 + (dx ? o : 0) - cz;
          const along = 0.5 + ((h >> 3) % 5) * 0.04;
          const deep = 0.26 + ((h >> 5) % 4) * 0.035;
          const tall = 3.0 + ((h >> 7) % 6) * 0.5;
          const sx = dx ? deep : along;
          const sz = dx ? along : deep;
          // oberes Band: hängender Schieferfels, nach unten dunkler
          b.add(rockGeo(h % 6, 1), (h >> 2) % 3 ? '#4c5670' : '#59647e', { p: [ex, -0.1 - tall * 0.2, ez], r: flip, s: [sx, tall, sz], shade: 0.45 });
          // verschneiter Sims obenauf
          b.add(rockGeo((h + 1) % 6, 0), '#eef3fb', { p: [ex, -0.1, ez], s: [sx * 1.08, 0.16, sz * 1.08] });
          // darunter: schmaler, dunkler, zur Insel hin eingerückt
          if (T.tier) {
            const t2 = tall * 1.5 + 1.2;
            b.add(rockGeo((h + 3) % 6, 0), '#333c54', { p: [ex - dx * 0.22, -1.7 - t2 * 0.2, ez - dy * 0.22], r: flip, s: [sx * 0.85, t2, sz * 0.85], shade: 0.5 });
          }
        }
      }
      if (b) wzBake(wzSite(cx, cz, 70), b);
    }
  };
}

// --- Frostgipfel in 2D: freier Himmel ------------------------------------------------------------------------
// Vorher: eine hellgraue Fläche mit je einer flachen Ellipse, die Kante ein dunkler Strich. Jetzt: Himmelblau, tief
// unten kleine blasse Wolken (fest, in den Bodenblock gemalt), darüber bauschige weiße Wolken mit blaugrauer
// Unterseite, die sich leicht bewegen (über offenem Himmel größer); unter jeder Kante nach Süden eine Felswand aus
// Schiefer mit verschneitem Sims, die nach unten im Blau ausläuft.
if (typeof GROUND_PALETTE !== 'undefined' && typeof GROUND_SHADES !== 'undefined') {
  const a = '#3d79c9';
  const b = '#6ba5e6';
  GROUND_SHADES[GROUND.WOLKEN] = [a, b];
  GROUND_PALETTE[GROUND.WOLKEN] = Array.from({ length: 8 }, (_, i) => mixColor(a, b, i / 7));
}
// Wolkenballen aus drei Kreisen und einem flachen Boden; s: Größe, col: Oberseite, under: Unterseite (oder null)
function klPuff(ctx, cx, cy, s, col, under) {
  const shape = (oy) => {
    ctx.beginPath();
    ctx.arc(cx - 7 * s, cy + oy, 5.5 * s, 0, Math.PI * 2);
    ctx.arc(cx + 0.5 * s, cy - 3.5 * s + oy, 7.5 * s, 0, Math.PI * 2);
    ctx.arc(cx + 8 * s, cy + oy, 5 * s, 0, Math.PI * 2);
    ctx.ellipse(cx, cy + 2.5 * s + oy, 13 * s, 4.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  if (under) {
    ctx.fillStyle = under;
    shape(2.4 * s);
  }
  ctx.fillStyle = col;
  shape(0);
}
if (typeof drawMagmaTile === 'function') {
  const baseMagma2 = drawMagmaTile;
  drawMagmaTile = function (ctx, g, x, y, px, py, h, t) {
    if (g !== GROUND.WOLKEN) return baseMagma2(ctx, g, x, y, px, py, h, t);
    const kind = h % 8;
    if (kind > 2) return;
    // über offenem Himmel (ringsum nur Wolken) dürfen die Ballen größer sein und über die Kachel hinausreichen
    let open = true;
    for (let dy = -1; dy <= 1 && open; dy++) for (let dx = -1; dx <= 1; dx++) if (groundAt(x + dx, y + dy) !== GROUND.WOLKEN) { open = false; break; }
    const s = open ? 1.05 + ((h >> 5) % 5) * 0.14 : 0.72;
    const ox = Math.sin(t * 0.12 + (h % 61)) * (open ? 7 : 2.5);
    const oy = Math.cos(t * 0.09 + (h % 47)) * (open ? 2 : 1);
    klPuff(ctx, px + TILE / 2 + ox, py + TILE / 2 + 2 + oy, s, '#ffffff', 'rgba(150,176,222,0.95)');
  };
}
if (typeof drawShore === 'function') {
  const baseShore2 = drawShore;
  drawShore = function (ctx, x, y, px, py, g = GROUND.WATER) {
    if (g !== GROUND.WOLKEN) return baseShore2(ctx, x, y, px, py, g);
    const h = tileHash(x, y);
    // ferne Wolken tief unten: klein, blass, fest
    if ((h >> 3) % 5 < 2) klPuff(ctx, px + 6 + (h % 20), py + 8 + ((h >> 7) % 16), 0.42 + ((h >> 9) % 3) * 0.08, 'rgba(206,224,248,0.6)', null);
    const land = (dx, dy) => {
      const n = groundAt(x + dx, y + dy);
      return n !== -1 && !LIQUID.has(n);
    };
    // Felswand unter einer Kante nach Süden (das Land liegt nördlich dieser Kachel)
    if (land(0, -1)) {
      const H = 15;
      const gr = ctx.createLinearGradient(0, py, 0, py + H + 7);
      gr.addColorStop(0, '#59647e');
      gr.addColorStop(0.55, '#3b4560');
      gr.addColorStop(0.8, 'rgba(48,58,84,0.75)');
      gr.addColorStop(1, 'rgba(48,58,84,0)');
      ctx.fillStyle = gr;
      // unten gezackt: drei Felszähne je Kachel
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + TILE + 0.6, py);
      const n = 3;
      for (let k = n; k >= 0; k--) {
        const xx = px + (TILE * k) / n;
        const dz = H + ((h >> (k * 3)) % 7);
        ctx.lineTo(xx + (k < n ? TILE / n / 2 : 0), py + dz + (k < n ? 5 : 0));
        ctx.lineTo(xx, py + dz - 3);
      }
      ctx.closePath();
      ctx.fill();
      // Schichtfugen und Risse
      ctx.fillStyle = 'rgba(20,26,44,0.35)';
      ctx.fillRect(px + 3 + (h % 9), py + 5, 1.5, 8);
      ctx.fillRect(px + 17 + ((h >> 4) % 9), py + 4, 1.5, 10);
      ctx.fillStyle = 'rgba(150,166,200,0.35)';
      ctx.fillRect(px, py + 6 + ((h >> 6) % 3), TILE + 0.6, 1);
      // verschneiter Sims
      ctx.fillStyle = '#f2f6fc';
      ctx.fillRect(px, py, TILE + 0.6, 3);
      ctx.fillStyle = 'rgba(170,190,224,0.9)';
      ctx.fillRect(px, py + 3, TILE + 0.6, 1);
    }
    // übrige Kanten: schmaler Felsrand mit Schneelinie
    ctx.fillStyle = '#46516c';
    if (land(0, 1)) ctx.fillRect(px, py + TILE - 3, TILE + 0.6, 3.6);
    if (land(-1, 0)) ctx.fillRect(px, py, 3.5, TILE + 0.6);
    if (land(1, 0)) ctx.fillRect(px + TILE - 3, py, 3.6, TILE + 0.6);
    ctx.fillStyle = '#eef3fb';
    if (land(0, 1)) ctx.fillRect(px, py + TILE - 1, TILE + 0.6, 1.6);
    if (land(-1, 0)) ctx.fillRect(px, py, 1.4, TILE + 0.6);
    if (land(1, 0)) ctx.fillRect(px + TILE - 1, py, 1.6, TILE + 0.6);
  };
}
