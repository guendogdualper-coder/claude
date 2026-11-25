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
// Rauschen für die Flächen-Shader (LIQUID3.<art>.pre): Wertrauschen und drei Oktaven davon
const KL_NOISE = `
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
        }`;
if (typeof LIQUID3 !== 'undefined' && LIQUID3.clouds) {
  Object.assign(LIQUID3.clouds, {
    shallow: '#ffffff', deep: '#8ea6d0', foam: '#ffffff', alpha: 1, level: -3.2,
    pre: KL_NOISE,
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
          // schmaler Spalt (seit 15.29, z. B. quer durch Wolkenhorst): höchstens zwei Kacheln bis zur anderen Seite.
          // Dort nur eine dünne Felswand – sonst füllten die Brocken beider Seiten den Spalt und er sah aus wie eine
          // Mauer aus Fels; die Wolken darin kommen weiter unten (klSpaltWolken)
          const eng = !isCloud(x + dx * 2, y + dy * 2) || !isCloud(x + dx * 3, y + dy * 3);
          // Lage auf der Kante, längs der Kante leicht versetzt
          const o = ((h % 9) - 4) * 0.03;
          const ex = x + 0.5 + dx * (eng ? 0.5 : 0.44) + (dy ? o : 0) - cx;
          const ez = y + 0.5 + dy * (eng ? 0.5 : 0.44) + (dx ? o : 0) - cz;
          const along = 0.5 + ((h >> 3) % 5) * 0.04;
          const deep = eng ? 0.13 : 0.26 + ((h >> 5) % 4) * 0.035;
          const tall = eng ? 3.2 : 3.0 + ((h >> 7) % 6) * 0.5;
          const sx = dx ? deep : along;
          const sz = dx ? along : deep;
          // oberes Band: hängender Schieferfels, nach unten dunkler
          b.add(rockGeo(h % 6, 1), (h >> 2) % 3 ? '#4c5670' : '#59647e', { p: [ex, -0.1 - tall * 0.2, ez], r: flip, s: [sx, tall, sz], shade: 0.45 });
          // verschneiter Sims obenauf
          b.add(rockGeo((h + 1) % 6, 0), '#eef3fb', { p: [ex, -0.1, ez], s: [sx * 1.08, 0.16, sz * 1.08] });
          // darunter: schmaler, dunkler, zur Insel hin eingerückt
          if (T.tier && !eng) {
            const t2 = tall * 1.5 + 1.2;
            b.add(rockGeo((h + 3) % 6, 0), '#333c54', { p: [ex - dx * 0.22, -1.7 - t2 * 0.2, ez - dy * 0.22], r: flip, s: [sx * 0.85, t2, sz * 0.85], shade: 0.5 });
          }
        }
      }
      // Wolken im schmalen Spalt: weiße Ballen knapp unter der Kante, über die ganze Breite – man sieht, dass der
      // Spalt offen ist und die Wolken darin stehen (vorher: mal dunkler Fels, mal eine blaue Fläche wie Wasser)
      for (let y = by; y < Math.min(by + B, ry + rh); y++) for (let x = bx; x < Math.min(bx + B, rx + rw); x++) {
        if (!isCloud(x, y)) continue;
        const quer = (dx, dy) => { for (let k = 1; k <= 2; k++) if (!isCloud(x + dx * k, y + dy * k)) return true; return false; };
        if (!((quer(1, 0) && quer(-1, 0)) || (quer(0, 1) && quer(0, -1)))) continue;
        if (!b) b = new Bake3();
        const h = townTileHash(x * 3 + 7, y * 11 + 2);
        for (let k = 0; k < 2; k++) {
          const hk = townTileHash(h + k * 29, k * 3 + 1);
          const s0 = 0.5 + ((hk >> 4) % 6) * 0.05;
          // tief im Spalt (1,5 unter der Kante): darüber sieht man die dunkle Felswand – so wirkt es wie Wolken in
          // einer Felsspalte und nicht wie Schnee; Unterseite blaugrau, Oberseite weiß
          b.add(rockGeo(hk % 6, T.tier > 1 ? 1 : 0), k ? '#c9d8ee' : '#b4c6e2', {
            p: [x + 0.5 - cx + (((hk >> 8) % 9) - 4) * 0.07, -1.75 + ((hk >> 12) % 5) * 0.08, y + 0.5 - cz + (((hk >> 16) % 9) - 4) * 0.07],
            r: [0, (hk % 63) / 10, 0], s: [s0 * 1.25, s0 * 0.8, s0], top: '#ffffff', topK: 0.75, ao: 0.1
          });
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

// --- Schluchten (Rostschlucht, Donnerklamm, Klüfte im Aschewald): echte Tiefe --------------------------------
// Vorher: eine flache dunkelbraune Fläche mit etwas Dunst. Jetzt sieht man in die Schlucht hinein: sechs Felsstufen
// liegen in wachsender Tiefe (jede wird entlang des Blickstrahls weiter verschoben – beim Laufen schieben sich die
// Terrassen gegeneinander), oben hell mit Schichtfugen und hellem Rand, nach unten dunkler und im Dunst; ganz unten
// windet sich ein schmaler Fluss. An den Wänden reichen die Stufen höher. Die Felsfarbe geht mit der Stimmung der
// Karte (Rost in der Rostschlucht, graublau in der Donnerklamm, aschgrau im Aschewald).
// Blick in die Tiefe (Schlucht, Eisspalte): Felsstufen in sechs Tiefen, unten ein Wasserlauf
const KL_TIEFE = `
          vec3 vd = normalize(vW - cameraPosition);
          vec2 par = vd.xz / max(0.3, -vd.y);
          vec3 rockHi = uShallow * 1.35;
          vec3 rockLo = uDeep;
          vec3 col = rockLo * 0.5;
          float lev = 6.0;
          for (int k = 0; k < 6; k++) {
            float fk = float(k);
            vec2 pk = p + par * (0.8 + fk * 2.6);
            float h = wkF(pk * 0.085) + (1.0 - d) * 0.12 * (1.0 - fk / 6.0);
            float thr = 0.80 - fk * 0.085;
            if (h > thr) {
              lev = fk;
              float edge = smoothstep(thr + 0.05, thr, h);
              float strata = 0.5 + 0.5 * sin(h * 70.0 + pk.x * 0.6);
              col = mix(rockHi, rockLo, fk / 5.5) * (0.82 + 0.14 * strata + 0.24 * edge);
              break;
            }
          }
          if (lev > 5.5) {
            vec2 pb = p + par * 17.0;
            float river = smoothstep(0.035, 0.012, abs(wkF(pb * 0.03 + 3.7) - 0.5));
            // am Grund Wasser – oder, wenn die Staubfarbe der Karte glutrot ist (Ödland), eine glühende Ader
            float warm = step(uFoam.b * 2.0, uFoam.r);
            vec3 rc = mix(mix(vec3(0.16, 0.30, 0.34), uSky * 0.6, 0.4), uFoam * (0.8 + 0.3 * sin(t * 0.8 + pb.x * 0.4)), warm);
            col = mix(col, rc, river);
            col += river * smoothstep(0.75, 1.0, sin(pb.x * 3.0 + pb.y * 2.0 + t * 1.5)) * 0.10;
          }
          col = mix(col, mix(uShallow, uSky, 0.25) * 0.5, lev / 6.0 * 0.3);
          vec2 dq = p * 2.6 + vec2(t * 0.25, t * 0.06);
          float dh = fract(sin(dot(floor(dq), vec2(41.3, 289.1))) * 43758.5453);
          col += uFoam * smoothstep(0.12, 0.0, length(fract(dq) - 0.5)) * step(0.9, dh) * 0.14;
          col = mix(col, col * 0.6, uNight * 0.5);
          float alpha = 1.0;`;
if (typeof LIQUID3 !== 'undefined' && LIQUID3.kluft) {
  Object.assign(LIQUID3.kluft, {
    pre: KL_NOISE,
    frag: KL_TIEFE,
    fragLow: `
          vec3 vd = normalize(vW - cameraPosition);
          vec2 par = vd.xz / max(0.3, -vd.y);
          float h1 = wkN((p + par * 1.5) * 0.17) * 0.7 + wkN((p + par * 1.5) * 0.4) * 0.3;
          float h2 = wkN((p + par * 8.0) * 0.17 + 5.0);
          vec3 col = uDeep * 0.6;
          col = mix(col, mix(uShallow, uDeep, 0.6), step(0.5, h2));
          col = mix(col, uShallow * 1.2, step(0.62, h1 + (1.0 - d) * 0.12));
          col = mix(col, col * 0.6, uNight * 0.5);
          float alpha = 1.0;`
  });
}

// Farben der Schlucht in 2D je Karte: Wand oben, Wand unten, Tiefe, Rand der Gegenseite
const KL_SCHLUCHT2 = {
  5: ['#a2623c', '#62381f', '#190d09', '#b8774a'], 3: ['#7a829e', '#444b64', '#0e1018', '#8c94b0'], 12: ['#75635a', '#42372f', '#110f0d', '#857268'],
  6: ['#7c6654', '#46372d', '#0f0a08', '#8e7662'], eis: ['#c8e0f6', '#6a9ad0', '#0a1832', '#e6f3ff']
};
// Eine Kachel Schlucht in 2D (seit 15.28): die Tiefe ist dunkel; unter einer Kante im Norden steht die Felswand, zwei
// Kacheln hoch, oben hell, nach unten ins Dunkel; an den anderen Kanten ein heller Felsrand; in der Tiefe Dunst und
// eine schmale Ader (ader: Farbe)
function klSchlucht2(ctx, x, y, px, py, pal, ader) {
  const h = tileHash(x, y);
  const T = TILE + 0.6;
  const land = (xx, yy) => { const n = groundAt(xx, yy); return n !== -1 && !LIQUID.has(n); };
  ctx.fillStyle = pal[2];
  ctx.fillRect(px, py, T, T);
  const n = land(x, y - 1) ? 1 : land(x, y - 2) ? 2 : 0;
  if (n) {
    const y0 = py - (n - 1) * TILE;
    const g = ctx.createLinearGradient(0, y0, 0, y0 + TILE * 2);
    g.addColorStop(0, pal[0]);
    g.addColorStop(0.42, pal[1]);
    g.addColorStop(1, pal[2]);
    ctx.fillStyle = g;
    ctx.fillRect(px, py, T, T);
    // senkrechte Risse
    ctx.fillStyle = 'rgba(0,0,0,0.24)';
    for (let k = 0; k < 3; k++) ctx.fillRect(px + 2 + ((h >> (k * 4)) % 28), py + ((h >> (k * 3 + 2)) % 8), 1.4, TILE * (0.45 + ((h >> (k * 5)) % 5) * 0.1));
    if (n === 1) {
      // Schichtfuge und Schatten direkt unter der Kante
      ctx.fillStyle = 'rgba(255,255,255,0.13)';
      ctx.fillRect(px, py + 6 + (h % 4), T, 1.2);
      ctx.fillStyle = 'rgba(0,0,0,0.34)';
      ctx.fillRect(px, py, T, 2.6);
    }
  }
  ctx.fillStyle = pal[3];
  if (land(x, y + 1)) ctx.fillRect(px, py + TILE - 4, T, 4.6);
  if (land(x - 1, y)) ctx.fillRect(px, py, 4, T);
  if (land(x + 1, y)) ctx.fillRect(px + TILE - 4, py, 4.6, T);
  if (!n && klLandDist(x, y, 2) > 2) {
    if (h % 5 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.ellipse(px + 16, py + 16, 15, 7, 0, 0, 6.3);
      ctx.fill();
    }
    if (ader && h % 6 === 0) {
      ctx.strokeStyle = ader;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px + 3, py + 10 + (h % 12));
      ctx.quadraticCurveTo(px + TILE / 2, py + 4 + ((h >> 4) % 20), px + TILE - 3, py + 12 + ((h >> 8) % 10));
      ctx.stroke();
    }
  }
}

// Schlucht in 2D: Felsstufen vom Rand zur Mitte dunkler (je Kachel nach dem Abstand zum Land), mit Schichtfugen;
// in der Tiefe hier und da ein Stück Fluss. Fest in den Bodenblock gemalt.
if (typeof drawShore === 'function') {
  const baseShore3 = drawShore;
  const KL_STUFE = ['#8a5434', '#6a3e26', '#4c2a1a', '#341c12'];
  // seit 15.25 je Karte: Basalt (Donnerklamm), Asche (Aschewald, Ödland – dort am Grund Glut statt Wasser)
  const KL_STUFE_KARTE = {
    3: ['#5c637e', '#454b64', '#30354a', '#1f2332'], 12: ['#5a4c44', '#443a34', '#2e2824', '#1c1816'], 6: ['#3c312b', '#2e2521', '#211a17', '#161110']
  };
  drawShore = function (ctx, x, y, px, py, g = GROUND.WATER) {
    if (g !== GROUND.KLUFT) return baseShore3(ctx, x, y, px, py, g);
    // seit 15.28: Felswand und dunkle Tiefe statt heller Stufen (klSchlucht2)
    const wmK = mapOfTile(x, y);
    klSchlucht2(ctx, x, y, px, py, (wmK && KL_SCHLUCHT2[wmK.id]) || KL_SCHLUCHT2[5], wmK && wmK.id === 6 ? 'rgba(255,120,40,0.75)' : 'rgba(110,170,180,0.5)');
  };
}

// Felsfarbe der Schlucht je Karte (hell, tief): Rost, Basaltgrau der Donnerklamm, Asche im Aschewald. Die Fläche
// selbst ist für alle Karten dieselbe (ein Material) – beim Wechsel der Karte werden nur die Farben gesetzt.
const KL_KLUFT = { m5: ['#9a5a36', '#200f0a'], m3: ['#6c7490', '#12141e'], m12: ['#6e5c52', '#161210'], m6: ['#7c6654', '#140d0a', '#ff6a1e'] };
const KL_STATE = { key: null };
if (typeof FX3_HOOKS !== 'undefined') {
  FX3_HOOKS.push({
    parts: [],
    fn() {
      const key = V3.home ? V3.home.key : '';
      if (key === KL_STATE.key) return;
      KL_STATE.key = key;
      if (typeof liquidMat !== 'function' || !LIQUID3.kluft) return;
      const c = KL_KLUFT[key] || KL_KLUFT.m5;
      const u = liquidMat('kluft').uniforms;
      u.uShallow.value.set(c[0]);
      u.uDeep.value.set(c[1]);
      u.uFoam.value.set(c[2] || LIQUID3.kluft.foam);
    }
  });
}

// --- Eisspalten (Nachtfrost): Tiefe wie in den Schluchten, aber aus Eis – helle Eisbänke oben, darunter immer
// dunkleres Blau, ganz unten Schmelzwasser. Vorher: dunkelblauer Dunst ohne Form.
if (typeof LIQUID3 !== 'undefined' && LIQUID3.eisspalte) {
  Object.assign(LIQUID3.eisspalte, { pre: KL_NOISE, frag: KL_TIEFE, shallow: '#86b4e4', deep: '#081226' });
}

// --- Treibsand (Knochenwüste): Dünenlinien statt einer verwaschenen Fläche ----------------------------------
// Vom Wind gezogene Kämme mit heller Sonnen- und dunkler Schattenseite, darüber feine Riefen; dazwischen sacken
// dunkle Mulden langsam ein und wandern. Am Rand fester, heller Sand wie bisher.
if (typeof LIQUID3 !== 'undefined' && LIQUID3.treibsand) {
  Object.assign(LIQUID3.treibsand, {
    pre: KL_NOISE,
    frag: `
          vec2 q = p * 0.16 + vec2(t * 0.006, t * 0.002);
          float n = wkF(q);
          float kamm = abs(fract(n * 5.0 + q.y * 1.4 + q.x * 0.5) - 0.5) * 2.0;
          float lit = smoothstep(0.30, 0.70, kamm);
          vec3 col = mix(uDeep * 1.05, uShallow * 1.08, 0.18 + 0.7 * lit);
          col *= 0.95 + 0.05 * sin((p.x * 0.5 + p.y) * 8.0 + n * 24.0);
          float sink = smoothstep(0.60, 0.70, wkF(p * 0.07 + vec2(t * 0.006, -t * 0.004) + 9.0));
          col = mix(col, uDeep * 0.62, sink * 0.75);
          col = mix(col, uDeep * 0.45, smoothstep(0.66, 0.70, wkF(p * 0.07 + vec2(t * 0.006, -t * 0.004) + 9.0)) * sink * 0.6);
          col = mix(col, uFoam, smoothstep(0.35, 0.0, d) * 0.45);
          col = mix(col, col * vec3(0.55, 0.58, 0.72), uNight * 0.55);
          float alpha = 1.0;`
  });
}

// --- Feuerberg: Vulkanschlote in den Lavafeldern ----------------------------------------------------------------
// Vorher ragte nur am Krater ein Kegel auf, die breiten Lavaströme waren leere Glut. Jetzt steht in den Strömen und
// Lavaseen alle paar Dutzend Kacheln ein kleiner Schlot (derselbe Bau wie der große Kegel, nur klein): dunkler
// Basaltkegel mit glühendem Krater, Rauchfahne und Funken. Immer mitten in der Lava (mit Abstand zum Ufer und zu
// Brücken), nie am großen Krater und nicht an der Stadt; auf „Niedrig“ weniger.
const KL_INFO = { vents: [], vent2: null };
// Stellen der Schlote: je Block die Lavakachel mit dem meisten Platz ringsum (nicht am Krater, nicht an der Stadt)
function klVents(wm, tier) {
  const [rx, ry, rw, rh] = wm.region;
  const w = game.world;
  const F = wzField(wm, 'liq', false);
  const C = (MAP_FORMS[9] && MAP_FORMS[9].crater) || [182, 62, 17];
  const town = wzTown(wm);
  const B = tier ? 26 : 44;
  const out = [];
  for (let by = ry + 4; by < ry + rh - 4; by += B) for (let bx = rx + 4; bx < rx + rw - 4; bx += B) {
    let best = null;
    let bd = 0;
    for (let y = by; y < Math.min(by + B, ry + rh - 4); y++) for (let x = bx; x < Math.min(bx + B, rx + rw - 4); x++) {
      const i = y * MAP_W + x;
      if (w.ground[i] !== GROUND.LAVA || w.deco[i] === DECO.BRIDGE) continue;
      const dd = F.at(x, y) + (townTileHash(x, y) % 16) / 40;
      if (dd > bd) { bd = dd; best = [x, y]; }
    }
    if (!best || bd < 2.4) continue;
    if (Math.hypot(best[0] - (rx + C[0]), best[1] - (ry + C[1])) < C[2] + 16) continue;
    if (Math.hypot(best[0] - town.cx, best[1] - town.cy) < 32) continue;
    const h = townTileHash(best[0] * 3 + 1, best[1] * 7 + 5);
    out.push([best[0], best[1], Math.min(1.5 + (h % 4) * 0.22, bd - 0.9), h]);
  }
  return out;
}
if (typeof WZ_MAPS !== 'undefined' && WZ_MAPS[9] && typeof wzVolcano === 'function') {
  const base9 = WZ_MAPS[9];
  WZ_MAPS[9] = (wm, T) => {
    base9(wm, T);
    KL_INFO.vents.length = 0;
    for (const [x, y, R, h] of klVents(wm, T.tier)) {
      wzVolcano(x + 0.5, y + 0.5, R, R * (1.0 + ((h >> 3) % 5) * 0.08), T, false);
      KL_INFO.vents.push([x, y]);
    }
  };
}

// --- Lava, Treibsand, Eisspalten in 2D ------------------------------------------------------------------------
// Lava: dunkle Krustenplatten und dieselben Schlote wie in 3D (dunkler Kegel, glühender Krater). Treibsand:
// Dünenkämme, die über die Kachelgrenzen weiterlaufen, und Mulden. Eisspalten: Eisstufen zum Rand hin heller.
// Fest in den Bodenblock gemalt; ein Schlot ist größer als eine Kachel, jede Kachel malt ihren Ausschnitt.
if (typeof drawShore === 'function') {
  const baseShore5 = drawShore;
  const KL_EIS = ['#a9cdee', '#7aa6d8', '#4d78b4', '#2c5088'];
  const ventAt = (x, y) => {
    if (!KL_INFO.vent2) {
      KL_INFO.vent2 = new Map();
      const wm = WORLD_MAPS.find((m) => m.id === 9);
      if (wm && typeof wzField === 'function') {
        for (const v of klVents(wm, 1)) {
          const r = Math.ceil(v[2]) + 1;
          for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) KL_INFO.vent2.set((v[1] + dy) * MAP_W + v[0] + dx, v);
        }
      }
    }
    return KL_INFO.vent2.get(y * MAP_W + x);
  };
  drawShore = function (ctx, x, y, px, py, g = GROUND.WATER) {
    if (g !== GROUND.LAVA && g !== GROUND.TREIBSAND && g !== GROUND.EISSPALTE) return baseShore5(ctx, x, y, px, py, g);
    const h = tileHash(x, y);
    ctx.save();
    if (g === GROUND.EISSPALTE) {
      // seit 15.28 wie die Schluchten: Eiswand unter der Kante, dunkelblaue Tiefe
      klSchlucht2(ctx, x, y, px, py, KL_SCHLUCHT2.eis, 'rgba(150,210,255,0.55)');
      ctx.restore();
      return;
    } else if (g === GROUND.TREIBSAND) {
      // zwei Kämme je Kachel; an den Kachelrändern auf fester Höhe, dazwischen geschwungen
      ctx.lineCap = 'round';
      for (let k = 0; k < 2; k++) {
        // Höhe am linken und rechten Rand aus der Kachelspalte: der Kamm läuft in der Nachbarkachel weiter
        const yL = py + 8 + k * 16 + ((tileHash(x, y * 3 + k) % 11) - 5);
        const yR = py + 8 + k * 16 + ((tileHash(x + 1, y * 3 + k) % 11) - 5);
        const bow = (yL + yR) / 2 + (((h >> (k * 5)) % 9) - 4) * 0.7;
        ctx.strokeStyle = 'rgba(70,50,24,0.22)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(px, yL + 1.6);
        ctx.quadraticCurveTo(px + TILE / 2, bow + 1.6, px + TILE + 0.6, yR + 1.6);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,236,190,0.3)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(px, yL);
        ctx.quadraticCurveTo(px + TILE / 2, bow, px + TILE + 0.6, yR);
        ctx.stroke();
      }
      if (h % 9 === 0 && klLandDist(x, y, 1) > 1) {
        // Mulde: der Sand sackt nach innen
        const cx = px + TILE / 2;
        const cy = py + TILE / 2;
        const gr = ctx.createRadialGradient(cx, cy, 1, cx, cy, 13);
        gr.addColorStop(0, 'rgba(48,32,14,0.55)');
        gr.addColorStop(0.6, 'rgba(70,50,24,0.22)');
        gr.addColorStop(1, 'rgba(70,50,24,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 13, 9.5, 0, 0, 6.3);
        ctx.fill();
      }
    } else {
      const v = ventAt(x, y);
      if (v) {
        ctx.beginPath();
        ctx.rect(px, py, TILE + 0.6, TILE + 0.6);
        ctx.clip();
        const cx = (v[0] + 0.5 - x) * TILE + px;
        const cy = (v[1] + 0.5 - y) * TILE + py;
        const R = v[2] * TILE;
        const gr = ctx.createRadialGradient(cx, cy - R * 0.12, R * 0.12, cx, cy, R);
        gr.addColorStop(0, '#5c3826');
        gr.addColorStop(0.55, '#3c2218');
        gr.addColorStop(1, '#22120c');
        ctx.fillStyle = gr;
        ctx.beginPath();
        for (let k = 0; k <= 14; k++) {
          const an = (k / 14) * 6.283;
          const rr = R * (0.9 + 0.1 * Math.sin(k * 2.7 + v[3] % 7));
          ctx.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr * 0.86);
        }
        ctx.closePath();
        ctx.fill();
        // Rinnen am Hang
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1.4;
        for (let k = 0; k < 7; k++) {
          const an = k * 0.9 + (v[3] % 10) * 0.1;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(an) * R * 0.3, cy - R * 0.1 + Math.sin(an) * R * 0.24);
          ctx.lineTo(cx + Math.cos(an) * R * 0.86, cy + Math.sin(an) * R * 0.74);
          ctx.stroke();
        }
        // Krater: dunkler Rand, Glut
        ctx.fillStyle = '#1c0e0a';
        ctx.beginPath();
        ctx.ellipse(cx, cy - R * 0.1, R * 0.3, R * 0.22, 0, 0, 6.3);
        ctx.fill();
        const gl = ctx.createRadialGradient(cx, cy - R * 0.1, 0, cx, cy - R * 0.1, R * 0.24);
        gl.addColorStop(0, '#fff0a0');
        gl.addColorStop(0.5, '#ff9a2c');
        gl.addColorStop(1, '#c8380c');
        ctx.fillStyle = gl;
        ctx.beginPath();
        ctx.ellipse(cx, cy - R * 0.1, R * 0.22, R * 0.15, 0, 0, 6.3);
        ctx.fill();
      } else if (h % 4 === 0 && klLandDist(x, y, 1) > 1) {
        // Krustenplatte: dunkle, kantige Scholle auf der Glut
        const cx = px + 8 + (h % 16);
        const cy = py + 8 + ((h >> 4) % 16);
        const r = 6 + ((h >> 8) % 5);
        ctx.fillStyle = 'rgba(52,22,12,0.62)';
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const an = k * 1.047 + (h % 10) * 0.1;
          const rr = r * (0.7 + (((h >> (k * 3)) % 7) / 7) * 0.45);
          ctx.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr * 0.75);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,190,90,0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    ctx.restore();
    return baseShore5(ctx, x, y, px, py, g);
  };
}

// --- Wasser, Moor, Blutsee: Ufer und offene Fläche ------------------------------------------------------------
// Vorher: glatte Fläche bis zum Ufer. Jetzt je Karte, was dorthin gehört: im Meer Felsnadeln mit Brandung und
// Uferfelsen (Ödland, Schattenklippen), an Fluss, Teich und See Schilf mit Rohrkolben und Seerosen (Kazehana,
// Schlangental, Mondfall – dort leuchten die Blüten), im Moor dürres Schilf und totes Geäst, im Blutsee dunkle
// Felszähne. Alles steht in der Flüssigkeit (dort kann niemand laufen) und hat keine Kollision. Welche Kachel was
// trägt, entscheidet klWasserArt – dieselbe Regel für 3D und 2D.
const KL_WASSER = {
  1: { g: 'WATER', reed: ['#5e9a3e', '#6b4426'], pad: ['#4f9a4a', '#f5b8d2'], stone: '#8d8f96' },
  2: { g: 'WATER', reed: ['#4f8a34', '#5c3a20'], pad: ['#3f8a42', '#f2ecc8'], stone: '#7b7f78', boulder: 1 },
  // seit 15.25 liegt das Ödland über einem Abgrund (KLUFT): die Felsnadeln ragen aus der Tiefe
  6: { g: 'KLUFT', stack: ['#6e5a4c', '#9a8672'], tief: 1 },
  11: { g: 'WATER', reed: ['#5c62ac', '#c2b4ff'], pad: ['#3c4c8c', '#a8dcff'], glow: 1, stone: '#565a82' },
  16: { g: 'WATER', stack: ['#2c3344', '#3f5a4c'], stone: '#353c4e', foam: '#cfe0ea' },
  8: { g: 'BOG', reed: ['#7c7642', '#3c2c1c'], snag: '#3a3026' },
  14: { g: 'BLUTSEE', stack: ['#3a1216', '#641c20'], stone: '#2c0e12', foam: '#93303a' },
  // Nebelküste (karte82.js): Felsnadeln im graugrünen Meer, Steine am Ufer
  18: { g: 'WATER', stack: ['#566260', '#7a8682'], stone: '#6a7470', foam: '#e8eeea' }
};
// Abstand einer Flüssigkeitskachel zum Land in Kacheln (1 = direkt am Ufer, max + 1 = weiter draußen)
function klLandDist(x, y, max) {
  const w = game.world;
  for (let r = 1; r <= max; r++) {
    for (let k = -r; k <= r; k++) {
      for (const [dx, dy] of [[k, -r], [k, r], [-r, k], [r, k]]) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= MAP_W || yy >= MAP_H) continue;
        const i = yy * MAP_W + xx;
        if (!LIQUID.has(w.ground[i]) || w.deco[i] === DECO.BRIDGE) return r;
      }
    }
  }
  return max + 1;
}
// Was steht auf dieser Kachel? null oder { art, h }: 'schilf' | 'rose' | 'stein' | 'brocken' | 'nadel' | 'ast'
function klWasserArt(x, y, cfg, tier) {
  const w = game.world;
  const i = y * MAP_W + x;
  if (w.ground[i] !== GROUND[cfg.g] || w.deco[i] === DECO.BRIDGE || w.obj[i] !== OBJ.NONE) return null;
  const h = townTileHash(x * 7 + 3, y * 5 + 1);
  const dist = klLandDist(x, y, 3);
  if (dist === 1) {
    if (cfg.reed && h % (tier ? 3 : 6) === 0) return { art: 'schilf', h };
    if (cfg.stone && h % 7 === 1) return { art: 'stein', h };
    return null;
  }
  if (dist === 2) {
    if (cfg.pad && tier && h % 4 === 0) return { art: 'rose', h };
    if (cfg.reed && tier && h % 11 === 1) return { art: 'schilf', h };
    if (cfg.boulder && h % 17 === 2) return { art: 'brocken', h };
    if (cfg.snag && h % 9 === 3) return { art: 'ast', h };
    return null;
  }
  if (cfg.pad && tier && dist === 3 && h % 9 === 0) return { art: 'rose', h };
  if (cfg.boulder && h % 29 === 2) return { art: 'brocken', h };
  if (cfg.snag && h % 37 === 3) return { art: 'ast', h };
  if (cfg.stack && dist > 3) {
    // eine Nadel je Feld von 8 × 8 Kacheln, in zwei von drei Feldern
    const G = 8;
    const cx = Math.floor(x / G);
    const cy = Math.floor(y / G);
    const hc = townTileHash(cx * 11 + 5, cy * 13 + 7);
    if ((hc >> 8) % 3 && x === cx * G + (hc % G) && y === cy * G + ((hc >> 4) % G)) return { art: 'nadel', h: hc };
  }
  return null;
}

if (typeof WZ_MAPS !== 'undefined' && typeof Bake3 !== 'undefined') {
  const halm = () => geo3('klhalm', () => new THREE.ConeGeometry(0.035, 1, 4).translate(0, 0.5, 0));
  const kolben = () => geo3('klkolben', () => new THREE.CylinderGeometry(0.05, 0.05, 0.22, 5));
  const blatt = () => geo3('klblatt', () => new THREE.CylinderGeometry(1, 1, 0.02, 8, 1, false, 0.5, 5.6));
  const ast = () => geo3('klast', () => new THREE.CylinderGeometry(0.025, 0.07, 1, 5).translate(0, 0.5, 0));
  // Felsnadel: kantige, nach oben schmalere Säule mit schiefer, gebrochener Spitze (flach schattiert, drei Formen)
  const nadel = (v) => geo3('klnadel' + v, () => {
    const g = new THREE.CylinderGeometry(0.36, 1, 1, 7, 4).translate(0, 0.5, 0);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i);
      const y = P.getY(i);
      const z = P.getZ(i);
      const rr = Math.sqrt(x * x + z * z);
      const j = (n) => Math.sin(x * 12.9 + y * 78.2 + z * 37.7 + v * 5.3 + n * 2.1);
      const k = rr < 0.01 ? 0 : 1; // Mitte der Deckel bleibt in der Achse
      P.setXYZ(i, x + k * j(1) * 0.11 + y * y * 0.16 * Math.sin(v * 2.4), y + (y > 0.01 ? j(2) * 0.06 : 0) + (y > 0.99 ? (rr < 0.01 ? 0.12 : j(4) * 0.1) : 0), z + k * j(3) * 0.11 + y * y * 0.16 * Math.cos(v * 2.4));
    }
    const ng = g.toNonIndexed();
    ng.computeVertexNormals();
    return ng;
  });
  const klWasser3 = (wm, T) => {
    const cfg = KL_WASSER[wm.id];
    // Höhe der Fläche: Wasser −0,14; die Schlucht liegt tiefer
    const LV = cfg.tief && LIQUID3.kluft ? LIQUID3.kluft.level : -0.14;
    const [rx, ry, rw, rh] = wm.region;
    const town = wzTown(wm);
    // Stellen der Wahrzeichen (Leuchtturm, Wrack …): dort keine Felsnadeln
    const taken = WZ.sites.map((s) => [s.position.x, s.position.z]);
    KL_INFO.vents.length = 0;
    const B = 24;
    for (let by = ry + 1; by < ry + rh - 1; by += B) for (let bx = rx + 1; bx < rx + rw - 1; bx += B) {
      let b = null;
      const cx = bx + B / 2;
      const cz = by + B / 2;
      for (let y = by; y < Math.min(by + B, ry + rh - 1); y++) for (let x = bx; x < Math.min(bx + B, rx + rw - 1); x++) {
        if (Math.max(Math.abs(x - town.cx), Math.abs(y - town.cy)) < town.H + 2) continue;
        const a = klWasserArt(x, y, cfg, T.tier);
        if (!a) continue;
        const h = a.h;
        const ox = x + 0.5 - cx;
        const oz = y + 0.5 - cz;
        const f = (n, m) => ((h >>> n) % m) / m; // 0 … 1 aus dem Kachelwert
        if (a.art === 'nadel') {
          let frei = true;
          for (const [sx, sz] of taken) if (Math.abs(sx - x) < 9 && Math.abs(sz - y) < 9) { frei = false; break; }
          if (!frei) continue;
          KL_INFO.vents.push([x, y]);
        }
        if (!b) b = new Bake3();
        if (a.art === 'schilf') {
          const n = 4 + (h % 3);
          for (let k = 0; k < n; k++) {
            const hk = townTileHash(h + k * 31, k * 7 + 1);
            const px = ox + ((hk % 100) / 100 - 0.5) * 0.7;
            const pz = oz + (((hk >> 7) % 100) / 100 - 0.5) * 0.7;
            const hh = 0.6 + ((hk >> 14) % 10) * 0.055;
            const rot = [(((hk >> 3) % 9) - 4) * 0.035, 0, (((hk >> 11) % 9) - 4) * 0.035];
            b.add(halm(), cfg.reed[0], { p: [px, LV - 0.08, pz], r: rot, s: [1, hh, 1], shade: 0.3 });
            if (k < 2) b.add(kolben(), cfg.reed[1], { p: [px + rot[2] * -hh * 0.8, LV - 0.08 + hh * 0.8, pz + rot[0] * hh * 0.8], r: rot, mat: cfg.glow ? 'glow' : 'lit' });
          }
        } else if (a.art === 'rose') {
          const n = 1 + (h % 3);
          for (let k = 0; k < n; k++) {
            const hk = townTileHash(h + k * 17, k * 5 + 2);
            const px = ox + ((hk % 100) / 100 - 0.5) * 0.75;
            const pz = oz + (((hk >> 7) % 100) / 100 - 0.5) * 0.75;
            const s = 0.15 + ((hk >> 14) % 6) * 0.022;
            b.add(blatt(), cfg.pad[0], { p: [px, LV + 0.012, pz], r: [0, (hk % 63) / 10, 0], s: [s, 1, s] });
            if (k === 0 && h % 3 === 0) b.add(rockGeo(1, 0), cfg.pad[1], { p: [px, LV + 0.05, pz], s: [0.07, 0.09, 0.07], mat: cfg.glow ? 'glow' : 'lit' });
          }
        } else if (a.art === 'stein') {
          const s = 0.2 + f(4, 8) * 0.2;
          b.add(rockGeo(h % 6, 0), cfg.stone, { p: [ox + (f(8, 9) - 0.5) * 0.5, LV - 0.02, oz + (f(12, 9) - 0.5) * 0.5], r: [0, f(2, 63) * 6.3, 0], s: [s * 1.2, s * 1.1, s], shade: 0.3 });
        } else if (a.art === 'brocken') {
          const s = 0.42 + f(4, 8) * 0.3;
          b.add(rockGeo(h % 6, 1), cfg.stone, { p: [ox, LV - 0.02, oz], r: [0, f(2, 63) * 6.3, 0], s: [s * 1.25, s * 0.9, s], shade: 0.3 });
          if (cfg.pad) b.add(rockGeo((h + 2) % 6, 0), cfg.reed[0], { p: [ox, LV + s * 0.36, oz], s: [s * 0.8, 0.05, s * 0.6] });
        } else if (a.art === 'ast') {
          const hh = 0.9 + f(4, 8) * 0.8;
          const rot = [(f(8, 9) - 0.5) * 0.7, f(2, 63) * 6.3, (f(12, 9) - 0.5) * 0.7];
          b.add(ast(), cfg.snag, { p: [ox, LV - 0.1, oz], r: rot, s: [1.3, hh, 1.3] });
          b.add(ast(), cfg.snag, { p: [ox + rot[2] * -0.4 * hh, LV - 0.1 + hh * 0.55, oz + rot[0] * 0.4 * hh], r: [rot[0] + 0.9, rot[1], rot[2] - 0.6], s: [0.8, hh * 0.45, 0.8] });
        } else if (a.art === 'nadel') {
          const R = (0.62 + f(4, 8) * 0.4) * (cfg.tief ? 1.25 : 1);
          // in der Schlucht reicht die Nadel vom Grund (LV) bis über die Kante
          const H = cfg.tief ? -LV + 1.3 + f(9, 8) * 2.4 : 2.3 + f(9, 8) * 2.2;
          const ry0 = f(2, 63) * 6.3;
          // Hauptsäule und ein bis zwei angelehnte, niedrigere daneben
          b.add(nadel(h % 3), cfg.stack[0], { p: [ox, LV - 0.25, oz], r: [0, ry0, 0], s: [R, H, R], top: cfg.stack[1], topK: 0.6, shade: 0.45 });
          const m = 1 + ((h >> 6) % 2);
          for (let k = 0; k < m; k++) {
            const an = ry0 + 1.2 + k * 2.6;
            const r1 = R * (0.62 - k * 0.12);
            b.add(nadel((h + 1 + k) % 3), cfg.stack[0], { p: [ox + Math.cos(an) * R * 0.85, LV - 0.25, oz + Math.sin(an) * R * 0.85], r: [0, an + 0.8, 0], s: [r1, H * (0.62 - k * 0.18), r1], top: cfg.stack[1], topK: 0.6, shade: 0.45 });
          }
          if (T.tier) {
            const n = 2 + (h % 3);
            for (let k = 0; k < n; k++) {
              const hk = townTileHash(h + k * 41, k * 3 + 9);
              const an = ry0 + k * 2.2 + (hk % 10) * 0.1;
              const dd = R + 0.25 + ((hk >> 5) % 6) * 0.13;
              const r2 = 0.28 + ((hk >> 9) % 6) * 0.06;
              b.add(rockGeo(hk % 6, 0), cfg.stack[0], { p: [ox + Math.cos(an) * dd, LV - 0.15, oz + Math.sin(an) * dd], r: [0, an, 0], s: [r2, r2 * (1.6 + ((hk >> 13) % 5) * 0.5), r2 * 0.9], top: cfg.stack[1], topK: 0.4, shade: 0.4 });
            }
            // Brandung: flache helle Schaumflecken am Fuß, unregelmäßig verteilt
            for (let k = 0; k < (cfg.foam ? 5 : 0); k++) {
              const hk = townTileHash(h + k * 13, k * 11 + 4);
              const an = k * 1.3 + (hk % 10) * 0.08;
              const dd = R * 0.95 + ((hk >> 5) % 6) * 0.1;
              b.add(rockGeo(hk % 6, 0), cfg.foam, { p: [ox + Math.cos(an) * dd, LV + 0.01, oz + Math.sin(an) * dd], r: [0, an + 1.57, 0], s: [0.34 + ((hk >> 9) % 5) * 0.06, 0.02, 0.15], ao: 0 });
            }
          }
        }
      }
      if (b) wzBake(wzSite(cx, cz, 72), b);
    }
  };
  for (const id in KL_WASSER) {
    const base = WZ_MAPS[id];
    WZ_MAPS[id] = (wm, T) => {
      if (base) base(wm, T);
      klWasser3(wm, T);
    };
  }
}

// dasselbe in 2D, fest in den Bodenblock gemalt (bleibt innerhalb der Kachel)
if (typeof drawShore === 'function') {
  const baseShore4 = drawShore;
  drawShore = function (ctx, x, y, px, py, g = GROUND.WATER) {
    baseShore4(ctx, x, y, px, py, g);
    const wm = mapOfTile(x, y);
    const cfg = wm && KL_WASSER[wm.id];
    if (!cfg || g !== GROUND[cfg.g]) return;
    if (Math.max(Math.abs(x - wm.cx), Math.abs(y - wm.cy)) < townLayoutHalf(wm.id) + 2) return;
    const a = klWasserArt(x, y, cfg, 1);
    if (!a) return;
    const h = a.h;
    const mx = px + TILE / 2;
    const my = py + TILE / 2;
    ctx.save();
    ctx.lineCap = 'round';
    if (a.art === 'schilf') {
      const n = 5 + (h % 3);
      for (let k = 0; k < n; k++) {
        const hk = townTileHash(h + k * 31, k * 7 + 1);
        const bx = px + 5 + (hk % 22);
        const by = py + 14 + ((hk >> 7) % 14);
        const hh = 9 + ((hk >> 14) % 7);
        const lean = (((hk >> 3) % 7) - 3) * 0.8;
        ctx.strokeStyle = cfg.glow ? cfg.reed[1] : cfg.reed[0];
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + lean * 0.4, by - hh * 0.6, bx + lean, by - hh);
        ctx.stroke();
        if (k < 2) {
          ctx.strokeStyle = cfg.reed[1];
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(bx + lean * 0.8, by - hh * 0.8);
          ctx.lineTo(bx + lean, by - hh - 1);
          ctx.stroke();
        }
      }
    } else if (a.art === 'rose') {
      const n = 1 + (h % 3);
      for (let k = 0; k < n; k++) {
        const hk = townTileHash(h + k * 17, k * 5 + 2);
        const cx = px + 6 + (hk % 20);
        const cy = py + 6 + ((hk >> 7) % 20);
        const r = 3.4 + ((hk >> 14) % 3) * 0.7;
        const an = (hk % 63) / 10;
        ctx.fillStyle = cfg.pad[0];
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.ellipse(cx, cy, r, r * 0.72, 0, an, an + 5.6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.22)';
        ctx.lineWidth = 0.7;
        ctx.stroke();
        if (k === 0 && h % 3 === 0) {
          ctx.fillStyle = cfg.pad[1];
          ctx.beginPath();
          ctx.arc(cx, cy - 0.5, 1.7, 0, 6.3);
          ctx.fill();
        }
      }
    } else if (a.art === 'ast') {
      ctx.strokeStyle = cfg.snag;
      ctx.lineWidth = 2.2;
      const lean = ((h >> 8) % 9) - 4;
      ctx.beginPath();
      ctx.moveTo(mx, my + 8);
      ctx.lineTo(mx + lean, my - 9);
      ctx.moveTo(mx + lean * 0.5, my - 1);
      ctx.lineTo(mx + lean * 0.5 + (lean >= 0 ? 6 : -6), my - 6);
      ctx.stroke();
    } else {
      // Stein, Brocken, Felsnadel: dunkler Fuß, Körper, helle Kuppe; Nadel mit Brandung
      const r = a.art === 'stein' ? 4 + ((h >> 4) % 3) : a.art === 'brocken' ? 8 + ((h >> 4) % 3) : 10 + ((h >> 4) % 4);
      const col = a.art === 'nadel' ? cfg.stack[0] : cfg.stone;
      const cx = a.art === 'stein' ? px + 8 + ((h >> 8) % 16) : mx;
      const cy = a.art === 'stein' ? py + 8 + ((h >> 12) % 16) : my + (a.art === 'nadel' ? 3 : 1);
      if (a.art === 'nadel' && cfg.foam) {
        ctx.fillStyle = cfg.foam;
        ctx.globalAlpha = 0.7;
        for (let k = 0; k < 5; k++) {
          const an = k * 1.3 + (h % 10) * 0.08;
          ctx.beginPath();
          ctx.ellipse(cx + Math.cos(an) * r * 1.05, cy + 2 + Math.sin(an) * r * 0.55, 3.6, 1.5, an, 0, 6.3);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + r * 0.35, r, r * 0.5, 0, 0, 6.3);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      if (a.art === 'nadel') {
        ctx.moveTo(cx - r, cy + 3);
        ctx.lineTo(cx - r * 0.55, cy - r * 0.9);
        ctx.lineTo(cx - r * 0.1, cy - r * 1.35);
        ctx.lineTo(cx + r * 0.5, cy - r * 0.8);
        ctx.lineTo(cx + r, cy + 3);
        ctx.closePath();
      } else {
        ctx.ellipse(cx, cy, r, r * 0.72, 0, 0, 6.3);
      }
      ctx.fill();
      ctx.fillStyle = a.art === 'nadel' ? cfg.stack[1] : 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      if (a.art === 'nadel') {
        ctx.moveTo(cx - r * 0.55, cy - r * 0.9);
        ctx.lineTo(cx - r * 0.1, cy - r * 1.35);
        ctx.lineTo(cx + r * 0.5, cy - r * 0.8);
        ctx.lineTo(cx - r * 0.05, cy - r * 0.55);
        ctx.closePath();
      } else {
        ctx.ellipse(cx - r * 0.2, cy - r * 0.25, r * 0.55, r * 0.3, 0, 0, 6.3);
      }
      ctx.fill();
    }
    ctx.restore();
  };
}

// --- Kristallabgrund: schwebende Kristalle ---------------------------------------------------------------------
// Über dem Abgrund treiben Kristalle, die langsam auf und ab schweben. Nur über dem Abgrund, mit Abstand zu den
// Plattformen, ohne Kollision. klKristallAt entscheidet je Kachel (dieselbe Regel für 3D und 2D): eine Stelle je Feld
// von 4 × 4 Kacheln, in vier von fünf Feldern.
// Seit 15.80 schöner (Wunsch des Spielers: „zu eckig und so kegelförmig“): zwei von drei Stellen sind eine schwebende
// Kristalldruse – um einen kleinen dunklen Kern wachsen facettierte Kristalle nach allen Seiten (einer groß nach oben,
// ein Kranz schräg nach außen, zwei nach unten, kleine Splitter dazwischen), lose Splitter treiben daneben; die übrigen
// ein einzelner doppelendiger Kristall mit Begleitern. Kristalle mit Farbverlauf, Glanzkanten und Licht von innen
// (wzCrystal, kristall3).
function klKristallAt(x, y) {
  const w = game.world;
  const i = y * MAP_W + x;
  if (w.ground[i] !== GROUND.ABGRUND || w.deco[i] === DECO.BRIDGE || w.obj[i] !== OBJ.NONE) return 0;
  const G = 4;
  const cx = Math.floor(x / G);
  const cy = Math.floor(y / G);
  const hc = townTileHash(cx * 17 + 3, cy * 23 + 11);
  if ((hc >> 8) % 5 > 3 || x !== cx * G + (hc % G) || y !== cy * G + ((hc >> 4) % G)) return 0;
  return klLandDist(x, y, 1) > 1 ? hc || 1 : 0;
}
// Bauform einer Stelle: 0/1 Kristalldruse, 2 einzelner Kristall
const klKristallForm = (h) => (h >>> 20) % 3;
if (typeof WZ_MAPS !== 'undefined' && WZ_MAPS[10] && typeof wzCrystal === 'function') {
  const base10 = WZ_MAPS[10];
  const FARBE = ['#a8d4ff', '#c4b4ff', '#9a88f0', '#b4e6ff'];
  const FELS = ['#3a3268', '#463c78', '#30285a'];
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _o = new THREE.Vector3();
  // Kristall mit dem Fuß bei root, geneigt um tilt (Euler), Körperlänge len: Mitte für wzCrystal ausrechnen
  const gemAt = (b, col, root, tilt, r, len, o = {}) => {
    _q.setFromEuler(_e.set(tilt[0], tilt[1], tilt[2]));
    _o.set(0, len / 2, 0).applyQuaternion(_q);
    wzCrystal(b, col, Object.assign({ p: [root[0] + _o.x, root[1] + _o.y, root[2] + _o.z], q: _q.clone(), r, len, flat: true }, o));
  };
  WZ_MAPS[10] = (wm, T) => {
    base10(wm, T);
    const [rx, ry, rw, rh] = wm.region;
    const taken = WZ.sites.map((s) => [s.position.x, s.position.z]);
    const B = 24;
    for (let by = ry + 2; by < ry + rh - 2; by += B) for (let bx = rx + 2; bx < rx + rw - 2; bx += B) {
      const cx = bx + B / 2;
      const cz = by + B / 2;
      const bb = [null, null];
      let n = 0;
      for (let y = by; y < Math.min(by + B, ry + rh - 2); y++) for (let x = bx; x < Math.min(bx + B, rx + rw - 2); x++) {
        const h = klKristallAt(x, y);
        if (!h) continue;
        let frei = true;
        for (const [sx, sz] of taken) if (Math.abs(sx - x) < 5 && Math.abs(sz - y) < 5) { frei = false; break; }
        if (!frei) continue;
        // auf „Niedrig“ nur jede zweite Stelle
        if (!T.tier && (h >> 12) % 2) continue;
        const k = n++ % 2;
        const b = bb[k] || (bb[k] = new Bake3());
        const f = (s, m) => ((h >>> s) % m) / m;
        const ox = x + 0.5 - cx;
        const oz = y + 0.5 - cz;
        const yy = 0.7 + f(3, 16) * 2.4;
        const col = FARBE[h % 4];
        const col2 = FARBE[(h + 1 + (h >> 6) % 3) % 4];
        const yaw = f(2, 63) * 6.3;
        if (klKristallForm(h) < 2) {
          // Kristalldruse: um einen kleinen dunklen Kern wachsen Kristalle nach allen Seiten – ein großer nach oben,
          // ein Kranz schräg nach außen, zwei nach unten, dazu kleine Splitter
          // Kern ungeleuchtet dunkel, aber im selben Mesh wie die Kristalle ('glow'): ein Zeichenaufruf je Gruppe
          const core = 0.2 + f(7, 8) * 0.08;
          b.add(rockGeo(h % 6, 0), FELS[h % 3], { p: [ox, yy, oz], r: [f(5, 9) * 3, yaw, 0.4], s: [core, core * 0.9, core], shade: 0.45, top: '#5a4c8a', topK: 0.6, mat: 'glow' });
          const big = 0.25 + f(11, 8) * 0.15;
          const C = [ox, yy, oz];
          // nur der große Kristall in der vollen Form (Grafik ab „Hoch“), alle anderen einfach (lod 1) – im Bild sind sie klein
          const lodM = T.tier > 1 ? 0 : 1;
          gemAt(b, col, C, [(f(5, 9) - 0.5) * 0.3, yaw, (f(9, 9) - 0.5) * 0.3], big, big * (3.4 + f(13, 6) * 1.6), { tipK: 0.9, lod: lodM });
          const m = T.tier ? 4 + (h % 2) : 3;
          for (let j = 0; j < m; j++) {
            const an = yaw + 0.6 + j * (6.28 / m) + f(15 + j, 5) * 0.4;
            const tl = 0.75 + f(17 + j, 6) * 0.45;
            const rr = big * (0.55 + f(19 + j, 5) * 0.2);
            gemAt(b, j % 2 ? col : col2, C, [Math.sin(an) * tl, an, -Math.cos(an) * tl], rr, rr * (2.6 + f(21 + j, 5) * 1.4), { lod: 1 });
          }
          // nach unten (die Druse schwebt frei)
          for (let j = 0; j < (T.tier ? 2 : 1); j++) {
            const an = yaw + 2 + j * 3.1;
            const tl = 2.3 + j * 0.25;
            const rr = big * (0.5 + j * 0.08);
            gemAt(b, col2, C, [Math.sin(an) * tl, an, -Math.cos(an) * tl], rr, rr * 2.4, { lod: 1 });
          }
          // kleine Splitter zwischen den großen
          if (T.tier > 1) {
            for (let j = 0; j < 3; j++) {
              const an = yaw + 0.2 + j * 2.1;
              gemAt(b, j % 2 ? col2 : col, C, [Math.sin(an) * 1.25, an, -Math.cos(an) * 1.25], 0.07, 0.24 + j * 0.05, { lod: 1 });
            }
          }
          // lose Splitter schweben daneben
          const loose = T.tier ? 1 + (T.tier > 1 ? h % 2 : 0) : 0;
          for (let j = 0; j < loose; j++) {
            const hj = townTileHash(h + j * 37, j * 5 + 3);
            const an = yaw + 2.4 + j * 2.5 + (hj % 10) * 0.1;
            const dd = 0.95 + ((hj >> 4) % 6) * 0.1;
            wzCrystal(b, j ? col : col2, {
              p: [ox + Math.cos(an) * dd, yy + 0.2 + (((hj >> 8) % 7) - 3) * 0.18, oz + Math.sin(an) * dd], r: 0.08 + ((hj >> 12) % 4) * 0.025, len: 0.32 + ((hj >> 16) % 5) * 0.1,
              tilt: [(((hj >> 3) % 9) - 4) * 0.2, an, (((hj >> 7) % 9) - 4) * 0.2]
            });
          }
        } else {
          // einzelner Kristall, doppelendig, mit zwei, drei Begleitern
          const r = 0.26 + f(7, 8) * 0.24;
          const len = r * (3.4 + f(11, 8) * 2);
          wzCrystal(b, col, { p: [ox, yy, oz], r, len, tilt: [(f(5, 9) - 0.5) * 0.9, yaw, (f(9, 9) - 0.5) * 0.9], lod: T.tier > 1 ? 0 : 1 });
          const m = T.tier ? 2 + (h % 2) : 1;
          for (let j = 0; j < m; j++) {
            const hj = townTileHash(h + j * 37, j * 5 + 3);
            const an = j * 2.2 + (hj % 10) * 0.2;
            const dd = 0.55 + ((hj >> 4) % 8) * 0.1;
            wzCrystal(b, j ? col : col2, {
              p: [ox + Math.cos(an) * (dd + 0.2), yy + (((hj >> 8) % 9) - 4) * 0.2, oz + Math.sin(an) * (dd + 0.2)], r: 0.1 + ((hj >> 12) % 5) * 0.03, len: 0.45 + ((hj >> 16) % 6) * 0.12,
              tilt: [(((hj >> 3) % 9) - 4) * 0.2, an, (((hj >> 7) % 9) - 4) * 0.2]
            });
          }
        }
        if (n % 3 === 1) wzGlow(b, ox, yy + 0.4, oz, 2.4, '#8a70ff', 0.32);
      }
      if (!n) continue;
      const site = wzSite(cx, cz, 78);
      for (let k = 0; k < 2; k++) {
        if (!bb[k]) continue;
        const ph = (townTileHash(bx + k * 7, by) % 63) / 10;
        const sp = 0.4 + k * 0.17;
        wzAnim(site, bb[k], (o, t) => { o.position.y = Math.sin(t * sp + ph) * 0.22; });
      }
    }
  };
}
if (typeof drawShore === 'function') {
  const baseShore6 = drawShore;
  const FARBE2 = ['#a8d4ff', '#c4b4ff', '#9a88f0', '#b4e6ff'];
  // seit 15.80 wie in 3D: zwei von drei Stellen eine schwebende Kristalldruse, sonst ein doppelendiger Kristall mit
  // Begleitern; gemalt mit kristall2d (Facetten, Verlauf, Glanzkante; umgebung.js)
  drawShore = function (ctx, x, y, px, py, g = GROUND.WATER) {
    baseShore6(ctx, x, y, px, py, g);
    if (g !== GROUND.ABGRUND) return;
    const h = klKristallAt(x, y);
    if (!h) return;
    const f = (s, m) => ((h >>> s) % m) / m;
    const cx = px + TILE / 2;
    const P = kristallPal2(FARBE2[h % 4]);
    const P2 = kristallPal2(FARBE2[(h + 1 + (h >> 6) % 3) % 4]);
    // Schein und Schatten tief darunter: das Stück schwebt
    const gr = ctx.createRadialGradient(cx, py + 18, 1, cx, py + 18, 16);
    gr.addColorStop(0, 'rgba(160,130,255,0.5)');
    gr.addColorStop(1, 'rgba(150,120,255,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(px, py + 2, TILE, TILE - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(cx + 3, py + 30, 7, 2.2, 0, 0, 6.3);
    ctx.fill();
    if (klKristallForm(h) < 2) {
      // Kristalldruse: um einen dunklen Kern Kristalle nach allen Seiten (unten zuerst, der große nach oben zuletzt)
      // in der oberen Reihe eines Bodenblocks kleiner (sonst oben abgeschnitten)
      const cy = py + 22;
      const H = y % CHUNK === 0 ? 16 : 19 + f(11, 8) * 7;
      kristall2d(ctx, cx - 1, cy + 1, 7, 3.4, Math.PI - 0.45, P2);
      kristall2d(ctx, cx + 1, cy + 1, 6, 3, Math.PI + 0.5, P);
      ctx.fillStyle = '#1e1838';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 4.2, 3, 0, 0, 6.3);
      ctx.fill();
      kristall2d(ctx, cx - 2, cy, H * 0.55, 3.6, -1.15, P);
      kristall2d(ctx, cx + 2, cy, H * 0.5, 3.4, 1.2, P2);
      kristall2d(ctx, cx - 1.5, cy - 0.5, H * 0.7, 4, -0.55, P2);
      kristall2d(ctx, cx + 1.5, cy - 0.5, H * 0.62, 3.8, 0.6, P);
      kristall2d(ctx, cx + (f(5, 9) - 0.5) * 2, cy - 1, H, 5, (f(9, 9) - 0.5) * 0.3, P);
    } else {
      // doppelendiger Kristall, schräg, mit Begleitern
      const len = 15 + f(11, 8) * 6;
      const t = (f(5, 9) - 0.5) * 0.9;
      kristall2d(ctx, cx - Math.sin(t) * 2, py + 24 + len * 0.1, len, 5 + f(7, 8) * 2, t, P, true);
      const m = 2 + (h % 2);
      for (let j = 0; j < m; j++) {
        const hj = townTileHash(h + j * 37, j * 5 + 3);
        const an = j * 2.2 + (hj % 10) * 0.2;
        kristall2d(ctx, cx + Math.cos(an) * (8 + ((hj >> 4) % 3)), py + 21 + Math.sin(an) * 4, 6 + ((hj >> 12) % 3), 2.6, an * 0.3 - 0.4, j % 2 ? P : P2, true);
      }
    }
  };
}

// --- Schluchten als echte Abgründe (seit 15.28) -----------------------------------------------------------------
// Bis 15.27 lag die Fläche der Schlucht nur 1,25 unter dem Rand und zeigte helle Felsstufen aus Rauschen – von oben
// sah das aus wie braune Flecken oder Höhenlinien, nicht wie ein Abgrund. Jetzt wie beim Frostgipfel:
// - der Boden fällt an der Kante 5,2 tief ab (LIQUID3_DEPTH), die Fläche liegt bei −4,2;
// - unter jeder Kante hängen echte Felswände (gebackene Brocken, oben hell, nach unten dunkel, darunter eine zweite,
//   eingerückte Reihe) – man sieht die Wand der gegenüberliegenden Seite;
// - die Fläche in der Tiefe ist dunkel: Geröll am Wandfuß, ganz unten eine schmale Ader (Wasser, im Ödland Glut),
//   darüber ziehen zwei dünne Dunstschichten. Keine hellen Stufen mehr.
// Gilt für Rostschlucht, Donnerklamm, Aschewald, Ödland (KLUFT) und Nachtfrost (EISSPALTE).
const KL_SCHLUND = `
          vec3 vd = normalize(vW - cameraPosition);
          vec2 par = vd.xz / max(0.3, -vd.y);
          vec2 pg = p + par * 2.5;
          float n = wkF(pg * 0.16);
          vec3 col = mix(uDeep * 0.5, uShallow * 0.34, smoothstep(0.42, 0.82, n) * 0.7);
          col = mix(col, uShallow * 0.5, (1.0 - smoothstep(0.0, 0.3, d)) * 0.55);
          vec2 pb = p + par * 6.0;
          float river = smoothstep(0.028, 0.008, abs(wkF(pb * 0.035 + 3.7) - 0.5)) * smoothstep(0.2, 0.55, d);
          float warm = step(uFoam.b * 2.0, uFoam.r);
          vec3 rc = mix(mix(vec3(0.20, 0.38, 0.44), uSky * 0.7, 0.35), uFoam * (0.85 + 0.3 * sin(t * 0.8 + pb.x * 0.4)), warm);
          col = mix(col, rc, river);
          col += rc * warm * smoothstep(0.07, 0.0, abs(wkF(pb * 0.035 + 3.7) - 0.5)) * 0.08 * smoothstep(0.2, 0.55, d);
          float m1 = wkF((p - par * 1.0) * 0.07 + vec2(t * 0.012, t * 0.006));
          float m2 = wkF((p - par * 2.2) * 0.045 - vec2(t * 0.008, -t * 0.005) + 7.3);
          float mist = smoothstep(0.52, 0.86, m1) * 0.2 + smoothstep(0.56, 0.9, m2) * 0.16;
          col = mix(col, mix(uShallow, uSky, 0.4) * 0.7, mist * smoothstep(0.1, 0.5, d));
          col *= mix(1.0, 0.7, smoothstep(0.3, 1.0, d));
          col = mix(col, col * 0.6, uNight * 0.5);
          float alpha = 1.0;`;
const KL_SCHLUND_LOW = `
          vec3 col = mix(uShallow * 0.45, uDeep * 0.5, smoothstep(0.0, 0.5, d));
          col = mix(col, col * 0.6, uNight * 0.5);
          float alpha = 1.0;`;
if (typeof LIQUID3 !== 'undefined' && LIQUID3.kluft) {
  Object.assign(LIQUID3.kluft, { pre: KL_NOISE, frag: KL_SCHLUND, fragLow: KL_SCHLUND_LOW, level: -4.2 });
  LIQUID3_DEPTH[GROUND.KLUFT] = 5.2;
  if (LIQUID3.eisspalte) {
    Object.assign(LIQUID3.eisspalte, { pre: KL_NOISE, frag: KL_SCHLUND, fragLow: KL_SCHLUND_LOW, level: -4.0, foam: '#bfe4ff' });
    LIQUID3_DEPTH[GROUND.EISSPALTE] = 5.0;
  }
}
// Felsfarben der Wände je Karte: oben, zweite Reihe, Sims (heller Rand obenauf)
const KL_WAND = {
  5: ['#9a5c3a', '#5c3222', '#b0714a'], 3: ['#6a7290', '#3c4258', '#8089a6'], 12: ['#6a5a50', '#3c322c', '#7e6c62'],
  6: ['#76614f', '#40332a', '#8a7460'], 15: ['#9cc0e6', '#4a74b0', '#e4f1ff']
};
if (typeof WZ_MAPS !== 'undefined' && typeof Bake3 !== 'undefined') {
  const klWaende3 = (wm, T, farbe, G) => {
    const [rx, ry, rw, rh] = wm.region;
    const w = game.world;
    const isVoid = (x, y) => {
      if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false;
      const i = y * MAP_W + x;
      return w.ground[i] === G && w.deco[i] !== DECO.BRIDGE;
    };
    const B = 24;
    const flip = [Math.PI, 0, 0];
    for (let by = ry; by < ry + rh; by += B) for (let bx = rx; bx < rx + rw; bx += B) {
      let b = null;
      const cx = bx + B / 2;
      const cz = by + B / 2;
      for (let y = by; y < Math.min(by + B, ry + rh); y++) for (let x = bx; x < Math.min(bx + B, rx + rw); x++) {
        const i = y * MAP_W + x;
        if (LIQUID.has(w.ground[i]) && w.deco[i] !== DECO.BRIDGE) continue;
        for (let d = 0; d < 4; d++) {
          const dx = [1, -1, 0, 0][d];
          const dy = [0, 0, 1, -1][d];
          if (!isVoid(x + dx, y + dy)) continue;
          const h = townTileHash(x * 5 + d * 3 + 1, y * 3 + d);
          if (!b) b = new Bake3();
          const o = ((h % 9) - 4) * 0.03;
          const ex = x + 0.5 + dx * 0.46 + (dy ? o : 0) - cx;
          const ez = y + 0.5 + dy * 0.46 + (dx ? o : 0) - cz;
          const along = 0.52 + ((h >> 3) % 5) * 0.04;
          const deep = 0.3 + ((h >> 5) % 4) * 0.04;
          const tall = 3.4 + ((h >> 7) % 6) * 0.5;
          const sx = dx ? deep : along;
          const sz = dx ? along : deep;
          // obere Wand: hängender Fels, nach unten dunkler
          b.add(rockGeo(h % 6, T.tier > 1 ? 1 : 0), (h >> 2) % 3 ? farbe[0] : farbe[2], { p: [ex, -0.06 - tall * 0.2, ez], r: flip, s: [sx, tall, sz], shade: 0.55 });
          // heller Sims an der Kante
          b.add(rockGeo((h + 1) % 6, 0), farbe[2], { p: [ex, -0.05, ez], s: [sx * 1.05, 0.12, sz * 1.05] });
          // zweite Reihe: tiefer, dunkler, zur Wand eingerückt
          if (T.tier) {
            const t2 = tall * 1.5 + 1.6;
            b.add(rockGeo((h + 3) % 6, 0), farbe[1], { p: [ex - dx * 0.2, -1.9 - t2 * 0.2, ez - dy * 0.2], r: flip, s: [sx * 0.9, t2, sz * 0.9], shade: 0.6 });
          }
        }
      }
      if (b) wzBake(wzSite(cx, cz, 72), b);
    }
  };
  for (const id of [5, 3, 12, 6, 15]) {
    const base = WZ_MAPS[id];
    const G = id === 15 ? 'EISSPALTE' : 'KLUFT';
    WZ_MAPS[id] = (wm, T) => {
      if (base) base(wm, T);
      klWaende3(wm, T, KL_WAND[id], GROUND[G]);
    };
  }
}
