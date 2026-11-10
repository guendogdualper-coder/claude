# Auftrag 2026-11-10 · Helfer „optik“ (Aufgaben 08 und 01)

Grundlage: Stand 14.31 (Branch `claude/app-entwicklung-hhewbj`, Commit 318e47a). Getestet mit Playwright/Chromium
(headless, deviceScaleFactor 1) gegen einen eigenen Server (Port 8796) und eine unveränderte Kopie von 14.31 (Port 8896)
als „vorher“. Bilder und Messdaten liegen im Arbeitsordner
`/tmp/claude-0/-home-user-claude/28e727e5-656e-544c-9afe-3c541c335198/scratchpad/auftrag17/` bzw. `…/scratchpad/optik/`.

## 08 | Item-Icons und visuelle Lesbarkeit

Status: **teilweise umgesetzt** (gezielte Verbesserungen; Monsterteile und einzelne Waffenformen offen, siehe unten).

### Bestand (Asset-Audit)
- Es gibt keine Bilddateien für Gegenstände: alle Symbole werden zur Laufzeit per Canvas-2D gezeichnet und gebacken
  (`bakeSprite`, js/figuren.js: 40×40 Einheiten × 3 = 120 px, Licht-Verlauf und Umriss), dann als Data-URL in
  `iconCache` (js/ausruestung.js) bzw. `spriteCache` abgelegt. Zweiter Aufruf = Cache-Treffer (gemessen 0,004–0,006 ms).
- Quellen: `drawItemArt` (Ausrüstung je Platz/Klasse/Stufe, Waffen über `weaponArt`/`daggerIconArt`, seit 13.29/13.30
  je Stufe eigene Formen), `drawPotion` + `potionIconUrl` (Tränke), `scrollIconUrl` (Segensschriftrolle),
  `MATERIAL_ART` (Verstärkungen, Schriftrolle, Seelenstein, Ätherkern), `MOB_MAT_ART` (Monsterteile: 13 Grundformen ×
  Farbe), `LOOT_ICON_ART` (Gold, Splitter, Buch), `bookIconUrl` (Fertigkeitsbuch mit Fertigkeitsbild),
  `arrowIconUrl` (js/fernninja.js). Inventar, Lager, Handel, Betrachten, Schmied, Händler, Beuteanzeige und Hotbar
  nutzen dieselben Funktionen → überall dasselbe Bild (Konsistenz war schon gegeben).
- Kachel im Inventar: 56×56 px, Bild 50×50 px (Handy quer: 42 px Puppe; Handy hoch: 30 px).

### Gefundene Schwachstellen (Übersichtsbild „vorher“)
1. **Schwert und Zweihänder, Axt und Streitaxt kaum unterscheidbar**: Zweihänder/Streitaxt wurden auf 0,85
   verkleinert und waren damit gleich groß wie die Einhandwaffen. Waffen saßen außerdem unterschiedlich weit aus der
   Mitte (Axt oben links, Dolch oben, Bogen oben/unten am Rand abgeschnitten: Ausdehnung bis ±23 Einheiten im 40er-Feld).
2. **Trankgrößen**: S wurde ohne Zeichen in voller Größe gezeichnet, M mit 0,98 – **M war kleiner als S**; insgesamt kaum
   Größenunterschied, S ohne Größenzeichen.
3. **Segensschriftrolle** sah fast aus wie der „Switcher“ (gleiche waagrechte Rolle mit zwei Walzen) und hatte nur
   drei rote Striche – kein Siegel/keine Rune, schwer von der Schriftrolle (H1–H10) zu trennen.
4. **Seltenheit nur über Farbe** (Rahmenfarbe/Leuchten; nur episch/legendär zusätzlich 2 px Rand).
5. Monsterteile: viele Teile teilen Form und fast dieselbe Farbe (z. B. Hundezahn, Hyänenzahn, Wargfang, Trollhauer:
   alle „fang“ in Weißtönen; mehrere „fur“). Im Fenster „Aufwertungsteile“ steht der Name darunter – **nicht geändert**.
6. Glocke (Stufe 0–3) wirkt wie Fackel/Besen, Schamanen-Helm Stufe 0–2 wie ein Stirnband – **nicht geändert** (wären
   neue Formen in `weaponArt`, das auch die Figur in der Welt zeichnet).

### Änderungen
- `WEAPON_ICON_FIT` + `drawItemArt` (js/ausruestung.js): Ausdehnung aller Stufen je Waffenart gemessen, Symbol mittig
  gesetzt und auf eine Zielgröße je Art gebracht: Zweihänder, Streitaxt, Stab, Sense, Bogen füllen das Feld (±18,6),
  Schwert/Axt ±15,6, Dolch ±16, Zepter ±16,6, Glocke ±16,2, Fächer ±17,6. Nur das Symbol, `weaponArt` (Welt) unverändert.
  Nachmessung: alle Arten liegen jetzt innerhalb ±18,8 (kein Abschneiden mehr), Zweihänder sichtbar größer als Schwert.
- `potionIconUrl`: alle Größen S–XXL über denselben Weg, Größe stetig 0,80 → 1,08, jede Größe trägt ihr Zeichen
  (auch S). Cache-Schlüssel `pot2:` (nur im Speicher). `drawPotion` selbst unverändert (Trank-Daten-Helfer).
- `scrollIconUrl`: Segensschriftrolle neu – hochkant offene Rolle mit goldener Schutzrune (Schild mit Kreuz) und
  goldenem Siegel am blauen Band; damit eigene Silhouette gegenüber Switcher (waagrecht) und Schriftrolle (schräg, rot).
- Seltenheit ohne Farbe: `gear.tile` setzt `<span class="rar-pips">`; css/seltenheit.css zeichnet 1–4 Punkte oben
  links (gewöhnlich 1 … legendär 4), 6 px, mit dunklem Rand, `pointer-events: none`. Gilt überall, wo `gear.tile`
  benutzt wird (Inventar, Lager, Handel, Betrachten, Schmied). Im Mehrfach-Verkauf (✓-Haken oben links) ausgeblendet.
- Keine neuen Animationen, keine neuen Dateien, keine Änderung an Item-IDs oder Spielständen (nur Bildaufbau).

### Messwerte
- Übersichtsbilder in echter Inventargröße (Kachel 56 px, Bild 50 px, DPR 1), je 367 Symbole:
  - vorher: `/tmp/claude-0/-home-user-claude/28e727e5-656e-544c-9afe-3c541c335198/scratchpad/auftrag17/icons-vorher.png`
  - nachher: `/tmp/claude-0/-home-user-claude/28e727e5-656e-544c-9afe-3c541c335198/scratchpad/auftrag17/icons-nachher.png`
  - Ausschnitt nebeneinander: `/tmp/claude-0/-home-user-claude/28e727e5-656e-544c-9afe-3c541c335198/scratchpad/auftrag17/icons-vergleich-ausschnitt.png`
- Zeichenzeit je Symbol (Cache geleert, alle 367 einmal frisch, je 3 Läufe abwechselnd, Headless-Chromium, Rechner mit
  parallel laufenden anderen Tests): vorher Mittel 3,22 / 2,84 / 2,63 ms, nachher 2,50 / 3,18 / 3,08 ms
  (≈ 2,9 ms beide – Unterschied im Rauschen). Waffen Median 2,3–2,5 ms vorher wie nachher. Cache-Treffer 0,005 ms.
  Symbole werden nur bei Bedarf gezeichnet (erstes Öffnen einer Seite mit ~30 Teilen ≈ 0,1 s einmalig, wie bisher).
- Speicher: gleiche Bildgröße (96×96-PNG je Ausrüstungssymbol); neu ist nur je Trankart ein zusätzliches S-Bild.
- FPS: in Headless/SwiftShader nicht belastbar (3D ≈ 1 Bild/s, 2D 20–46 Bilder/s stark schwankend bei beiden Ständen,
  weil andere Helfer parallel rechnen). Die Änderungen fügen keine Animation und keine laufende Zeichenarbeit hinzu.

### Tests
- Übersicht vorher/nachher gerendert und angesehen; Ausdehnung der Waffen vor/nach gemessen (`optik/bbox.js`).
- Echte Fenster bei 1920×1080, 1280×720, 844×390 (Touch) gerendert: Punkte, Platznamen und Trankzeichen sichtbar,
  nichts verdeckt das Bild außer den bestehenden Overlays (+Plus oben rechts, ▲/▼ unten links).
- 3D-Ansicht: Inventar, Schmied geöffnet, Beute fallen gelassen – keine Fehler.
- Regression: s73-Kopie (alle 12 Charaktere, Fertigkeiten, Segen, Charakterfenster) ohne Fehler.

### Offen / Vorschlag
- Monsterteile mit gleicher Form und ähnlicher Farbe (Zähne, Felle) bräuchten eigene Formen je Tier – Vorschlag, nicht umgesetzt.
- Glocke Stufe 0–3 und Schamanen-Helm Stufe 0–2 sind schwach erkennbar; Änderung müsste auch die Welt-Grafik
  (`weaponArt`/Helm) anfassen – zurückgestellt.
- Der Plus-Wert oben rechts liegt weiterhin auf der Spitze schräger Waffen (bestehendes Layout).
- Farbsehschwäche nicht mit einem Simulator geprüft; die Punkte machen die Seltenheit aber unabhängig von der Farbe lesbar.

## 01 | Inventar, Menüs und UI

Status: **teilweise umgesetzt** (gemessene Fehler behoben; keine Neugestaltung, kein neues Framework).

### Bestandsaufnahme
- Fenster sind `.panel`-Elemente in index.html (panelInv, panelChar, panelMats, panelNpc für Händler/Lager/Schmied/
  Lehrmeister, panelQuests, panelOpts, panelMap, panelSocial für Freunde/Gilde/Gruppe, panelTrade, panelAuktion,
  panelPost u. a.). `ui.toggle`/`ui.closePanels` (js/oberflaeche.js) zeigen immer nur ein Fenster (außer laufendem
  Handel und Todesfenster) – überlappende Fenster entstehen dadurch nicht.
- Gemeinsame Bausteine: `gear.tile` (Kachel, Seltenheit, Plus, Vergleichspfeil, Hinweis über `data-info`),
  `tipps.js` (Hinweisfeld: Maus folgt, Finger: halten), `gear.bindDrag` (Ziehen per Maus, Finger: 260 ms halten),
  `gear.wireSell`/`sellArmed` (Rückfrage „Wirklich verkaufen?“), `.mini-btn`, `.bag-tab`.
- Welt-Eingaben hängen nur an der Spielfläche (`renderer.canvas`, js/eingabe.js); Fenster liegen darüber.
- Handy hoch (Touch, Hochformat) zeigt absichtlich den Hinweis „Gerät drehen“ über allem (`.rotate-hint`) –
  Fenster sind dort nicht bedienbar, das Spiel ist für Querformat gebaut. Schmales Desktop-Fenster 390×844 ohne Touch
  wurde zusätzlich geprüft.

### Messung (optik/ui.js, getBoundingClientRect, scrollWidth>clientWidth, elementFromPoint-Raster, Ziele <32 px Touch/<24 px PC)
Fenster: Inventar, Inventar mit gewähltem Teil, Charakter, Aufwertungsteile, Händlerin, Waffenhändler, Lager, Schmied,
Questlog, Einstellungen, große Karte, Gruppe/Freunde, Inventar mit offenem Chat; je 1920×1080, 1280×720, 844×390
(Touch), 390×844 (Touch) und 390×844 (ohne Touch). Volle Tasche (118/120), lange Namen, alle Trankgrößen.

Befund vorher:
- Kein Fenster ragt aus dem Bild; kein HUD-Teil verdeckt ein Fenster (Raster ohne Treffer außerhalb des Fensters).
- Klick-Durchgriff: je Fenster 10 Klicks/Taps auf freie Stellen → Figur bewegt sich nicht, Ziel wechselt nicht
  (PC und Touch); × schließt ohne Weltaktion. **Kein Fehler gefunden** (negativer Test, bleibt so).
- Abgeschnitten/überlaufend: Platzname „NEBENHAND“ 54 > 52 px (PC) bzw. 48 > 42 px (Handy quer), lag über dem Bild.
- **Detail nach Antippen unsichtbar**: Handy quer – Knöpfe (Anlegen/Verkaufen) lagen bei y = 515–577 px, Fenster endet
  bei 382 px; man musste erraten, dass man scrollen muss. Bei 1280×720 knapp sichtbar.
- **Finger halten in der Tasche**: Ziehen (260 ms) und Hinweisfeld (450 ms) erscheinen gleichzeitig, und das
  Hinweisfeld bleibt beim Ziehen über den Ablagezielen stehen.
- **Fehlende Bestätigung**: „Alle verkaufen“/„10 verkaufen“ bei Tränken (Inventar und Händlerin) verkauften sofort
  (gemessen: 50 Tränke nach einem Klick weg). Schmieden ohne Segensschriftrolle (Zerbrechen möglich) ohne Rückfrage.
- Zu kleine Ziele (Touch): Taschen-Reiter I–IV 34×26, Gruppen-Reiter 26 px hoch, „Sortieren“ 23 px, Händler-Knöpfe 28 px,
  Charakter „+5“/„Alle“ 36×22, Attribut-„+“ 30 px, Haken Segensschriftrolle 13×13 (auch PC).

### Änderungen
- js/ausruestung.js
  - `armConfirm(btn, ask)`: zweistufige Bestätigung im Stil der vorhandenen „Wirklich …?“-Knöpfe (rot, 4 s gültig).
  - Tränke im Inventar: „10 verkaufen“/„Alle verkaufen“ erst nach zweitem Druck.
  - Schmied (`forge`): kann das Teil zerbrechen (keine Segensschriftrolle gewählt) und ist es angelegt, ab Selten oder
    ab +4, fragt der Knopf einmal nach („Wirklich? Ohne Segensschriftrolle kann es zerbrechen!“). Billige Teile ohne
    Rückfrage wie bisher, damit das häufige Schmieden nicht ausgebremst wird.
  - `gear.revealDetail()`: nach Antippen eines Teils/Vorrats rollt das Fenster nur bei Bedarf zum Detail
    (`scrollIntoView({block:'nearest'})`); `openInventory` startet wieder oben.
  - `bindDrag`: Hinweisfeld wird ausgeblendet, sobald der Finger/die Maus beim Ziehen > 10 px bewegt wird.
- js/oberflaeche.js (`renderShop`, eine Zeile): „Alle verkaufen“ bei der Händlerin über `armConfirm`.
- css/style.css (eigener Block nach `.item-tile.selected`): Platznamen enger, nicht umbrechend, auf dunklem Verlauf;
  Handy quer 7,5 px; Haken Segensschriftrolle 18 px (Touch 22 px, die ganze Zeile ist ohnehin klickbar); roter
  Schmiede-Knopf beim Nachfragen; `@media (pointer: coarse)`: Reiter, `.mini-btn` und Attribut-„+“ in Fenstern ≥ 32 px.
- js/sprachen/en.js: „Wirklich verkaufen?“ (fehlte bisher) und die neue Schmied-Rückfrage.

### Messwerte nachher
- Abgeschnittene/überlaufende Texte: 25 → 5 Funde (verbleibend nur „Status 158“ im Charakterfenster = absichtlich
  überstehende rote Zahl am Reiter, kein Fehler).
- Zu kleine Ziele: 32 → 22 Funde; Touch-Ansicht nur noch Einstellungen (30–31 px, Einstellungsmenü wird parallel von
  einem anderen Helfer umgebaut – bewusst nicht angefasst) und Haken 22 px in einer klickbaren Zeile. Am PC (Maus)
  bleiben „Sortieren“ 23 px und „+5/Alle“ 22 px (Mausbedienung, unverändert).
- Detail nach Antippen (844×390): sichtbar bei y = 192–262 (Fenster bis 382) statt außerhalb.
- Halten 700 ms auf einem Teil (Touch): Hinweis erscheint; beim Ziehen um 60 px verschwindet er (vorher blieb er);
  Inhalt der Tasche danach unverändert (gleiche UIDs, keine Doppelung/kein Verlust).
- Bestätigungen: Händlerin „Alle verkaufen“ 1. Druck 50 → 50, 2. Druck → 0 (vorher 1. Druck → 0). Schmied +4 Selten:
  1. Druck schmiedet nicht (Knopf rot mit Rückfrage), 2. Druck schmiedet (vorher sofort, Teil konnte zerbrechen).
- Screenshots je Fenster/Größe vorher/nachher: `/tmp/claude-0/-home-user-claude/28e727e5-656e-544c-9afe-3c541c335198/scratchpad/optik/shots/`
  (`vorher-*.png`, `nachher-*.png`, Berichte `vorher-report.json`, `nachher-report.json`).

### Tests
- optik/ui.js (5 Größen × 13 Fensterzustände), optik/klick.js (Klick-Durchgriff, ×, Detail, Halten/Ziehen,
  Bestätigungen) jeweils gegen 14.31 und gegen den neuen Stand; s73-Kopie (12 Charaktere) ohne Fehler;
  `node --check` auf alle geänderten js-Dateien.
- Nicht getestet: echte Handys/Tablets, Browser-Zoom/Systemskalierung, Server-Reconnect während offener Fenster
  (Inventaraktionen laufen lokal über die bestehende Itemlogik, nichts daran wurde geändert), zwei Clients.

### Offen
- Handy hoch: bewusst nur der Drehhinweis (kein Hochformat-Layout) – Entscheidung des Projekts, nicht geändert.
- Einstellungsknöpfe 30–31 px auf Touch (paralleler Umbau des Einstellungsmenüs).
- Bei sehr niedrigen Querformaten (390 px Höhe) muss im Inventar weiterhin gescrollt werden (Tasche + Vorräte + Detail);
  ein eigenes Kompakt-Layout wäre eine Neugestaltung und wurde nicht gemacht.
