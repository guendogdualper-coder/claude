// Ladebild beim Betreten einer Karte (seit 15.26).
// In 3D wird beim Betreten die ganze Karte gebaut (drei-kern.js, FULL3) – das dauert am PC ein bis drei Sekunden, am
// Handy länger. So lange liegt dieses Bild über dem Spiel: ein Bild aus dem Spiel (Licht- oder Schattenseite), der
// Name der Karte und ein Balken. Solange es steht, nimmt die Figur keinen Schaden (kampf.js, damagePlayer).
const MAPLOAD = { on: false, el: null, bar: null, title: null, since: 0, timer: 0, tip: null, tipTimer: 0, tipLast: -1, tipFade: 0, stapel: [] };

// Tipps im Ladebild (seit 15.34): je Ladebild einer. Dauert das Laden länger als gut 2 Sekunden (MAPLOAD_TIPP.ab),
// wechselt der Tipp alle 4 Sekunden (MAPLOAD_TIPP.alle) mit sanftem Überblenden – wer wartet, lernt etwas (vorher alle
// fünf Sekunden hart). Die Tipps kommen aus einem gemischten Stapel: Erst wenn alle passenden einmal dran waren, wird
// neu gemischt – so kommt derselbe Tipp nicht schon zwei Ladebilder später wieder.
// art: 'pc' nur am PC, 'handy' nur mit Fingerbedienung, sonst überall. Zahlen kommen aus den Spieldaten.
// Drittes Feld (frei lassbar): Mindeststufe der Figur (Zahl) oder eine Bedingung (Funktion → true/false).
const MAPLOAD_TIPP = { ab: 2000, alle: 4000, blende: 380 };
const mlZahl = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d).toLocaleString('de-DE');
const MAPLOAD_TIPPS = [
  ['handy', () => 'Mit zwei Fingern auf dem Bild zoomst du: auseinander holt die Figur näher heran, zusammen zeigt mehr von der Karte.'],
  ['handy', () => 'Halte den Angriffsknopf gedrückt, dann greift deine Figur immer weiter an.'],
  ['handy', () => 'Tippe auf die kleine Karte oben rechts – die große Karte zeigt Auftragsziele, Seelensteine und Dungeon-Eingänge.'],
  ['pc', () => 'Mit dem Mausrad zoomst du heraus und siehst mehr von der Karte.'],
  ['pc', () => 'Rechte Maustaste halten und ziehen dreht und neigt die Kamera. Die mittlere Maustaste stellt die gewohnte Sicht wieder her.'],
  ['pc', () => 'Tab wählt das nächste Ziel, die Leertaste gedrückt halten greift es immer weiter an.'],
  ['pc', () => 'Die große Karte zeigt Auftragsziele, Seelensteine und Dungeon-Eingänge.'],
  ['', () => `Segensschriftrollen gibt es nur selten aus Seelensteinen ab Stufe ${typeof BLESSING !== 'undefined' ? BLESSING.stone : 35} – Händler verkaufen sie nicht.`],
  ['', () => 'Beim Schmied kann ein Fehlschlag den Gegenstand zerbrechen. Mit einer Segensschriftrolle sind nur die Kosten weg.'],
  ['', () => 'Fertigkeitsbücher für deine Klasse fallen aus Seelensteinen.'],
  ['', () => 'Zerstörte Seelensteine kommen nach einiger Zeit an einer anderen Stelle im selben Gebiet wieder.'],
  ['', () => `Monster, die ${typeof AGGRO_LEVEL_GAP !== 'undefined' ? AGGRO_LEVEL_GAP : 10} oder mehr Stufen unter dir sind, greifen nicht von selbst an.`],
  ['', () => 'In Städten und Lagern nimmst du keinen Schaden.'],
  ['', () => 'Die Wegweiserin in der Stadt bringt dich gegen Gold an den Rand jedes Jagdgebiets.'],
  ['', () => 'Leuchtende Teleportsteine bringen dich von Insel zu Insel – jede Karte hat ihre eigene Farbe.'],
  ['', () => `Ab Stufe ${typeof GF !== 'undefined' ? GF.level : 30} findest du über den Gruppenfinder Mitspieler für Dungeons und Endbosse.`],
  ['', () => `Das Lager kostet einmalig ${typeof STORAGE !== 'undefined' ? STORAGE.price.toLocaleString('de-DE') : '1.000'} Gold und ist in jeder Stadt dasselbe.`],
  ['', () => 'Hol dir jeden Tag die Tagesbelohnung – mit einer kurzen Werbung doppelt, am siebten Tag in Folge wartet die Heldentruhe.'],
  ['', () => 'Solange dieses Bild steht, kann deiner Figur nichts passieren.'],
  // Kampf
  ['', () => `Bis zu ${mlZahl(typeof BONUS_CAPS !== 'undefined' ? Math.round(BONUS_CAPS.castSpeed * 100) : NaN, 25)} % Zaubergeschwindigkeit von Waffe, Helm, Schultern, Umhang und Gürtel verkürzen die Abklingzeit deiner Fertigkeiten und die Pause dazwischen.`],
  ['', () => `Nach jeder Fertigkeit pausieren die übrigen kurz – bei Krieger, Schamane, Nekromant und Magier ${mlZahl(typeof GCD_TIME !== 'undefined' ? GCD_TIME : NaN, 1.5)} Sekunden. Ulti, Klassensegen und Tränke zählen nicht.`],
  ['', () => 'Ausweichen und Blocken helfen nur gegen normale Angriffe. Fertigkeiten von Spielern und Fähigkeiten der Bosse treffen immer – raus aus der Warnfläche!'],
  ['', () => 'Zeigt ein Knopf in der Fertigkeitsleiste einen Buchstaben wie „H“, ist ein Rangaufstieg möglich – antippen öffnet direkt die Fertigkeiten.'],
  ['', () => 'Halte eine Fertigkeit lange gedrückt, um sie auf einen anderen Platz der Leiste zu ziehen.'],
  ['', () => `Ab Stufe ${mlZahl(typeof SEGEN_UNLOCK !== 'undefined' ? SEGEN_UNLOCK : NaN, 10)} hat jede Klasse außer dem Krieger ihren Klassensegen – er hält 30 Minuten und wird alle 10 Stufen stärker.`],
  ['', () => 'Ruft ein Endboss Seelenkristalle, ist er unverwundbar, bis der letzte fällt – danach taumelt er und nimmt mehr Schaden.', 20],
  ['', () => 'Färbt sich der Boden blutrot, lauf in einen Lichtkreis mit grüner Säule – nur dort bist du vor der Druckwelle sicher.', 20],
  ['handy', () => 'Mit dem kleinen AUTO-Knopf links neben dem Lebenstrank greift deine Figur ein angetipptes Ziel von selbst immer weiter an.'],
  // Turnierarena
  ['', () => 'Beim Turniermeister startet „Gegen Bots“ sofort einen Kampf – 1 gegen 1, 2 gegen 2, 3 gegen 3 oder Turmschlacht, auch ohne Server.', 10],
  ['', () => `Findet die Turnierarena ${mlZahl(typeof ABOT !== 'undefined' ? ABOT.wait : NaN, 20)} Sekunden lang nicht genug Spieler, füllen Bots auf. Rangkämpfe gegen Bots zählen halb.`, 10],
  ['', () => `Eine PvP-Saison dauert ${mlZahl(typeof EV !== 'undefined' ? EV.saison.monate : NaN, 2)} Monate. Am Ende gibt es eine Belohnung nach der besten Rangstufe, die du erreicht hast.`, 10],
  // Stufe 80 und mehr
  ['', () => `Ab Stufe 80 füllt jede Erfahrung deine Seelenstufen – bis ${mlZahl(typeof SEELE !== 'undefined' ? SEELE.max : NaN, 100)}, mit ★ in der Erfahrungsleiste. Die Punkte für die Seelenwerte verteilst du im Charakterfenster.`, 60],
  ['', () => 'Seelenwerte wie Gier, Glück und Sammler bringen mehr Gold, Beute und Seelensplitter. Die drei Kampfwerte geben zusammen höchstens +8 % – gegen Spieler die Hälfte.', 75],
  ['', () => 'Ab Stufe 80 warten jeden Tag drei Tagesaufträge und jede Woche drei Wochenaufträge – die Belohnung kommt sofort, ohne Abgabe.', 65],
  ['', () => 'Schaffst du alle drei Tagesaufträge, gibt es die Tagestruhe. Alle drei Wochenaufträge bringen die Wochentruhe mit einem Ausrüstungsteil.', 75],
  ['', () => `Alle ${mlZahl(typeof WB !== 'undefined' ? WB.every / 3600e3 : NaN, 3)} Stunden erscheint ein Weltboss auf einer Lv-80-Karte. ${mlZahl(typeof WB !== 'undefined' ? WB.warn / 60e3 : NaN, 5)} Minuten vorher kommt eine Ansage, ein goldener Pfeil zeigt den Weg.`, 65],
  ['', () => 'Beim Weltboss bekommt jeder, der mitkämpft, ein Ausrüstungsteil – mit Glück ein legendäres.', 65],
  ['', () => 'Beim Veredler bekommen epische und legendäre Ewig-Teile Sockel – die Waffe zwei, Rüstung und Helm je einen. Drei gleiche Juwelen verschmelzen zur nächsten Stufe.', 75],
  ['', () => 'Jedes Juwel stärkt etwas anderes – Rubin den Schaden, Saphir das Leben, Smaragd die Abwehr, Topas das Gold und Amethyst die Seelensplitter.', 75],
  ['', () => 'Ab Stufe 80 wählst du Heroisch oder Mythisch für die Lv-80-Instanzen und den Turm – härtere Gegner, bessere Beute, und das nur für dich.', 75],
  ['', () => `Pech gehabt? Spätestens der ${mlZahl(typeof PECH !== 'undefined' ? PECH.garantie + 1 : NaN, 9)}. Versuch bei einem Instanzboss, im Turm, beim Weltboss oder in der Wochentruhe ist legendär.`, 55],
  ['', () => `Ein voll veredeltes legendäres Ewig-Teil auf +20 steigt beim Veredler bis zu ${mlZahl(typeof AUFST !== 'undefined' ? AUFST.max : NaN, 3)}-mal auf – jedes Mal +${mlZahl(typeof AUFST !== 'undefined' ? Math.round(AUFST.per * 100) : NaN, 3)} % auf die Grundwerte.`, 78],
  ['', () => 'Im Seelenhain, an der Nebelküste und auf den Himmelsterrassen stehen kaum Monster, dafür überall Seelensteine der Stufen 70 bis 80.', 75],
  ['', () => 'Im Turm der Verdammten schmiedet Ghorvan – +1 mit 20 % mehr Chance, und nichts zerbricht.', 78],
  // Ziele und Ereignisse
  ['', () => `Im Charakterfenster unter „Erfolge“ warten ${mlZahl(typeof ERFOLGE !== 'undefined' ? ERFOLGE.length : NaN, 32)} Erfolge. Manche bringen einen Titel, der über deinem Kopf steht.`],
  ['', () => 'Am ersten und dritten Wochenende jedes Monats gibt es doppelte Erfahrung – von Freitag 18 Uhr bis Sonntag 24 Uhr.'],
  ['', () => 'Zum Winterfest vom 1. Dezember bis 6. Januar lassen Monster, Bosse und Seelensteine Schneeflocken fallen – tausch sie im Charakterfenster bei den Ereignissen.'],
  ['', () => 'Hat ein anderer Charakter deines Kontos eine höhere Stufe, bekommen deine weiteren Charaktere bis zu +50 % Erfahrung.'],
  ['', () => `Ein Erfahrungsring gibt +${mlZahl(typeof EP_RING !== 'undefined' ? Math.round(EP_RING.mul * 100) : NaN, 25)} % Erfahrung. Du findest ihn in der Tasche unter „Vorräte“ und legst ihn mit „Anlegen“ an.`],
  // Ausrüstung, Schmied, Seelensteine
  ['', () => 'Ab +6 braucht der Schmied auch Teile von Monstern, etwa Hundezahn oder Wolfspelz. Seelensteine lassen sie öfter fallen als Monster.'],
  ['', () => 'In der Tasche zeigt ein grüner Pfeil ▲, dass ein Teil besser ist als dein angelegtes – ein roter ▼, dass es schlechter ist.'],
  ['', () => 'In Lichtwacht macht die Teilewandlerin Akane aus je 10 Monster-Teilen ein Teil für Ausrüstung der Stufen 60, 70 oder 80.', 55],
  ['', () => 'Folge Seelenstein auf TikTok und Instagram – dann sind Seite III und IV deiner Tasche frei, für alle deine Charaktere.', () => typeof sozialSperreAn === 'function' && sozialSperreAn() && !sozialFrei()],
  // Welt
  ['', () => 'Fragen? Ratgeberin Mira in der Stadtmitte (blaues „?“) beantwortet über 120 Fragen – auch mit Tippfehlern.'],
  ['', () => 'Das Weltentor in jeder Stadt bringt dich kostenlos auf jede Karte, deren Mindeststufe du hast.'],
  ['', () => `Ab Stufe ${mlZahl(typeof RIFT !== 'undefined' ? RIFT.minLevel : NaN, 10)} öffnen sich ab und zu Risse zu einem passenden Dungeon – jeder bleibt ${mlZahl(typeof RIFT !== 'undefined' ? Math.round(RIFT.life / 60) : NaN, 5)} Minuten offen.`],
  ['', () => 'Nachts kommen auf jeder Karte Nachtmonster dazu – Nachtwanderer vergeben dafür eigene Nachtjagden.'],
  ['', () => 'Instanzen kannst du auch allein betreten – mit einer Gruppe geht es schneller und die Bosse fallen leichter.', 40],
  ['', () => 'Auf der fliegenden Glutschwinge kannst du hoch oder tief fliegen – hoch oben geht es über Häuser, Mauern und Seelensteine hinweg.', 55],
  ['', () => 'In der Bestenliste stehen die besten Charaktere nach Stufe und nach Rangpunkten der Turnierarena – auf Stufe 80 zählt die Seelenstufe.']
];
// Wechselnde Ladebilder (seit 15.36): neben dem Bild der eigenen Hauptstadt Szenen aus dem Spiel – Städte anderer
// Karten und Endbosse. Das nächste Bild wird im Voraus geladen (mapLoadVor); ist es beim nächsten Ladebild noch nicht
// da (langsames Netz, ohne Netz), bleibt es beim Standardbild, das mit dem Spiel gespeichert ist. '' = Standardbild.
// Dazu acht Szenen in 3D „Hoch“ (tools/ladebilder.js, docs/werbung-ladebilder.md): Kristallabgrund mit den neuen
// Kristallen, Lichtwacht mit Krone, Feuerberg mit Vulkan, Kazehana mit Vogelschwarm, Turnierarena gegen Bots, Endboss
// Azaroth, Frostgipfel und der Drache im Flug. Sie ersetzen die alten Bilder vom Kristallabgrund und Feuerberg (Kristalle
// vor 15.82). Stadt und Frostgipfel gehören zur Lichtseite. Dieselben Bilder zeigt die Werbung (werbung.js, „szenen“).
const MAPLOAD_BILDER = {
  licht: ['', 'kristallabgrund', 'lichtwacht', 'feuerberg', 'stadt', 'arena', 'endboss', 'winter', 'drache', 'frost', 'oase', 'ymir', 'fenris'],
  schatten: ['', 'kristallabgrund', 'lichtwacht', 'feuerberg', 'arena', 'endboss', 'drache', 'blut', 'nachtfrost', 'skarn', 'ymir']
};
const MAPLOAD_VOR = { licht: null, schatten: null, last: { licht: '', schatten: '' } };
function mapLoadVor(seite) {
  const list = MAPLOAD_BILDER[seite] || MAPLOAD_BILDER.licht;
  let name = list[Math.floor(Math.random() * list.length)];
  if (name === MAPLOAD_VOR.last[seite]) name = list[(list.indexOf(name) + 1) % list.length];
  if (!name) { MAPLOAD_VOR[seite] = ''; return; }
  const im = new Image();
  im.onload = () => { MAPLOAD_VOR[seite] = name; };
  im.src = `bilder/lade-${name}.webp`;
}

// Passt der Tipp gerade? (Bedienung, Stufe der Figur, eigene Bedingung)
function mapLoadTippPasst(t) {
  const [art, , wenn] = t;
  const pc = typeof IS_PC !== 'undefined' && IS_PC;
  if (art && (art === 'pc') !== pc) return false;
  if (typeof wenn === 'number') {
    const p = typeof game !== 'undefined' ? game.player : null;
    return !p || (p.level | 0) >= wenn;
  }
  if (typeof wenn === 'function') {
    try { return !!wenn(); } catch (e) { return false; }
  }
  return true;
}
// Nächster Tipp aus dem gemischten Stapel (Index in MAPLOAD_TIPPS); nie zweimal hintereinander derselbe
function mapLoadTippNaechster() {
  for (let runde = 0; runde < 2; runde++) {
    if (!MAPLOAD.stapel.length) {
      const neu = MAPLOAD_TIPPS.map((_, i) => i);
      for (let i = neu.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [neu[i], neu[j]] = [neu[j], neu[i]];
      }
      if (neu.length > 1 && neu[neu.length - 1] === MAPLOAD.tipLast) [neu[0], neu[neu.length - 1]] = [neu[neu.length - 1], neu[0]];
      MAPLOAD.stapel = neu;
    }
    while (MAPLOAD.stapel.length) {
      const i = MAPLOAD.stapel.pop();
      if (i !== MAPLOAD.tipLast && mapLoadTippPasst(MAPLOAD_TIPPS[i])) return i;
    }
  }
  return -1;
}
// Tipp zeigen; sanft = altes Wort ausblenden, neues einblenden (beim Wechsel während des Ladens)
function mapLoadTipp(sanft) {
  if (!MAPLOAD.tip) return;
  const i = mapLoadTippNaechster();
  if (i < 0) return;
  MAPLOAD.tipLast = i;
  let text = '';
  try { text = MAPLOAD_TIPPS[i][1](); } catch (e) { text = ''; }
  const el = MAPLOAD.tip;
  clearTimeout(MAPLOAD.tipFade);
  if (!sanft) {
    el.classList.remove('weg');
    el.textContent = text ? 'Tipp: ' + text : '';
    return;
  }
  el.classList.add('weg');
  MAPLOAD.tipFade = setTimeout(() => {
    el.textContent = text ? 'Tipp: ' + text : '';
    el.classList.remove('weg');
  }, MAPLOAD_TIPP.blende);
}
// Wechsel während des Ladens: erst nach gut 2 Sekunden Laden, dann alle 4 Sekunden
function mapLoadTippUhr() {
  if (!MAPLOAD.on || performance.now() - MAPLOAD.since < MAPLOAD_TIPP.ab) return;
  mapLoadTipp(true);
}

function mapLoadEl() {
  if (MAPLOAD.el) return MAPLOAD.el;
  const st = document.createElement('style');
  st.textContent = `
#kartenLaden { position: fixed; inset: 0; z-index: 2000; background: #0b0d14 center / cover no-repeat; display: flex; flex-direction: column;
  justify-content: flex-end; align-items: center; opacity: 0; transition: opacity 0.35s ease; pointer-events: auto; }
#kartenLaden.an { opacity: 1; }
#kartenLaden::before { content: ''; position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(8, 9, 14, 0.25) 0%, rgba(8, 9, 14, 0) 35%, rgba(8, 9, 14, 0.88) 100%); }
#kartenLaden .kl-kasten { position: relative; width: min(560px, 82vw); margin-bottom: max(7vh, 28px); text-align: center; color: #f3e6c4; font-family: inherit; }
#kartenLaden .kl-titel { font-size: clamp(22px, 4.2vw, 38px); letter-spacing: 0.06em; text-shadow: 0 2px 10px #000, 0 0 2px #000; margin-bottom: 4px; }
#kartenLaden .kl-text { font-size: clamp(12px, 1.8vw, 15px); color: #d8c9a2; text-shadow: 0 1px 4px #000; margin-bottom: 12px; }
#kartenLaden .kl-tipp { min-height: 4.2em; margin-top: 12px; font-size: clamp(12px, 1.9vw, 15px); line-height: 1.4; color: #f3e6c4; text-shadow: 0 1px 4px #000, 0 0 2px #000;
  transition: opacity 0.38s ease, transform 0.38s ease; }
#kartenLaden .kl-tipp.weg { opacity: 0; transform: translateY(4px); }
#kartenLaden .kl-leiste { height: 10px; border-radius: 6px; background: rgba(0, 0, 0, 0.55); box-shadow: inset 0 0 0 1px rgba(201, 163, 90, 0.55); overflow: hidden; }
#kartenLaden .kl-balken { height: 100%; width: 0; border-radius: 6px; background: linear-gradient(90deg, #b8862c, #f0cf6a); transition: width 0.18s linear; }`;
  document.head.append(st);
  const el = document.createElement('div');
  el.id = 'kartenLaden';
  el.hidden = true;
  el.innerHTML = '<div class="kl-kasten"><div class="kl-titel"></div><div class="kl-text">Die Karte wird geladen …</div><div class="kl-leiste"><div class="kl-balken"></div></div><div class="kl-tipp"></div></div>';
  document.body.append(el);
  MAPLOAD.el = el;
  MAPLOAD.bar = el.querySelector('.kl-balken');
  MAPLOAD.title = el.querySelector('.kl-titel');
  MAPLOAD.tip = el.querySelector('.kl-tipp');
  return el;
}
// key: 'm<Karte>' (V3.home.key)
function mapLoadShow(key) {
  const el = mapLoadEl();
  const id = key && key[0] === 'm' ? +key.slice(1) : 0;
  const wm = typeof WORLD_MAPS !== 'undefined' ? WORLD_MAPS.find((m) => m.id === id) : null;
  MAPLOAD.title.textContent = wm ? wm.name : '';
  // Bild der eigenen Seite (auf den gemeinsamen Karten sieht jede Seite ihres)
  const seite = wm && wm.side === 'schatten' ? 'schatten' : wm && wm.side === 'licht' ? 'licht' : typeof myFaction === 'function' ? myFaction() : 'licht';
  // zwei Größen (seit 15.27): 1920 × 1080 fürs Handy, 3840 × 2160 für große Bildschirme
  const gross = Math.max(screen.width, screen.height) * (window.devicePixelRatio || 1) > 2000;
  const sk = seite === 'schatten' ? 'schatten' : 'licht';
  const bild = MAPLOAD_VOR[sk];
  el.style.backgroundImage = bild ? `url(bilder/lade-${bild}.webp)` : `url(bilder/lade-${sk}${gross ? '-4k' : ''}.webp)`;
  MAPLOAD_VOR.last[sk] = bild || '';
  MAPLOAD_VOR[sk] = null;
  // das Bild fürs nächste Mal holen, sobald die Karte steht (nicht während des Ladens)
  setTimeout(() => mapLoadVor(sk), 4000);
  MAPLOAD.bar.style.width = '0';
  mapLoadTipp(false);
  clearInterval(MAPLOAD.tipTimer);
  MAPLOAD.tipTimer = setInterval(mapLoadTippUhr, MAPLOAD_TIPP.alle);
  clearTimeout(MAPLOAD.timer);
  el.hidden = false;
  void el.offsetWidth;
  el.classList.add('an');
  MAPLOAD.on = true;
  MAPLOAD.since = performance.now();
}
function mapLoadProgress(f) {
  if (MAPLOAD.bar) MAPLOAD.bar.style.width = Math.round(f * 100) + '%';
}
function mapLoadHide() {
  const el = MAPLOAD.el;
  if (!el || !MAPLOAD.on) return;
  MAPLOAD.bar.style.width = '100%';
  // mindestens eine halbe Sekunde stehen lassen (sonst blitzt es nur auf), dann ausblenden
  const rest = Math.max(0, 500 - (performance.now() - MAPLOAD.since));
  clearTimeout(MAPLOAD.timer);
  MAPLOAD.timer = setTimeout(() => {
    MAPLOAD.on = false;
    clearInterval(MAPLOAD.tipTimer);
    clearTimeout(MAPLOAD.tipFade);
    el.classList.remove('an');
    MAPLOAD.timer = setTimeout(() => { el.hidden = true; }, 380);
  }, rest);
}
