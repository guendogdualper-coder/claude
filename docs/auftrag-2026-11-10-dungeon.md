## 09 | Dungeon-Layouts, Dachausblendung und Schwierigkeit

Status: **teilweise umgesetzt** – Grundrisse, Sichtbarkeit und Endgame-Mechaniken sind umgesetzt und solo gemessen;
echte Gruppenläufe mit mehreren Clients waren hier nicht möglich (siehe offene Punkte).

### Ursache

- **Grundriss** (`js/welt.js` `buildDungeons`/`dungeonPlan`/`dungeonRoom`): Seit 13.7 würfelt jeder normale Dungeon
  einmal je Welt (fester Startwert aus `WORLD_SEED` + Dungeon-Id, nicht je Besuch) einen Weg aus 6–8 Räumen ohne
  Kreuzung plus 1–2 Sackgassen. Formen Halle/Rundsaal/Kreuz/Säulenhalle, gerade Z-Gänge, drei Kacheln breit – wirkt
  gemauert und streng linear, auch in den Höhlen.
- **Sicht**: Höhlenwände sind im 3D-Gelände 1,5 Einheiten hohe Felsblöcke (`tileSample`, `WALL3_H`). Die
  Hausdach-Logik (`v3SyncHouses`) gilt nur für Häuser; im Dungeon gab es nur den kleinen gerasterten Kreis um die
  eigene Figur (`addFade`). Liegt eine Wand zwischen Kamera und Figur (Südwände, im Schulterblick auch Seitenwände),
  verdeckt sie Figur, Monster und Boden davor – das sind die „Decken“, die die Sicht nehmen.
- **Schwierigkeit**: Messung (unten) mit dem echten Spielcode: Ein Lv-80-Spieler mit guter Ausrüstung (+15, selten,
  3 Boni) besiegt die Elite-Gruppe der Kristallkaverne in 9–19 s mit höchstens 8 % Lebensverlust, 5 von 6 Wegen
  besiegen den Dungeon-Boss Vaelith allein, ebenso den ersten Wächter der Spiegelgruft. Der reine Tank (Krieger ·
  Leib) steht 240 s beim Instanzboss und hat danach noch 97 % Leben. Grund: Bossschaden geht voll durch Verteidigung
  (78 %), „Erlittener Schaden“ (0,4) und Block/Ausweichen; ~2 %/s Regeneration gleicht alles aus. Es gab keine
  Mechanik, die eine Gruppe verlangt.

### Änderungen

**Grundriss (welt.js)** – nur die gewürfelten normalen Dungeons; Endboss-Arenen, Höllenthron und Instanzen behalten
ihre Pläne:
- Höhlen-Dungeons (Boden Höhle, Eis, Basalt, Kristall: Spinnenhöhle, Eisgrotte, Drachenhort, Totengruft,
  Titanenschmiede, Kristallkaverne) bekommen die neue Raumform `cave` (Kreis mit welligem Rand, sternförmig um die
  Mitte → immer zusammenhängend); Kampfräume meist Höhlen, Seitenräume Höhlen, Bossraum halb Höhle. Startraum bleibt
  Halle (Orientierung, Ausgang in der Ecke). Festungen/Keller/Tempel (Steinboden) behalten ihre Formen.
- Gewundene Gänge mit Nischen (Versatz bis 2 Kacheln, kehren vor dem Ende auf die Linie zurück, drei Kacheln breit),
  danach Glätten: Felskacheln mit ≥ 5 freien Nachbarn brechen weg (nur öffnen, nie schließen).
- Zweiter Weg: mit 70 % eine Schleife zwischen zwei Kampfräumen, die im Raster Nachbarn sind und ≥ 3 Räume
  auseinanderliegen (nie Start oder Boss). In dieser Welt haben 5 von 8 Dungeons eine Schleife. Keine Sperre wird
  umgangen (normale Dungeons haben keine), Monster laufen über beide Wege (A*-Wegsuche in gegner.js).
- Abgeschnittene Taschen (vom Start nicht erreichbarer Boden) werden für alle Dungeon-Blöcke zu Fels – vorher gab es
  sie in den Endboss-Arenen (48–65 Kacheln).
- Seelensteine im Dungeon auf einer freien Kachel der Raumform (`dungeonFreeTile`, gegner.js) – vorher standen bei
  manchen Grundrissen Steine im Fels.
- Spielstände: Wer in einem Dungeon gespeichert hat und jetzt im Fels stünde, beginnt am Start desselben Dungeons
  (spieler.js, statt im Dorf). Keine Datenmodelländerung.

**Sicht (drei-kern.js)** – analog zur Hausdach-Ausblendung: `v3SyncCut` setzt je Bild Figur und Richtung zur Kamera;
der Bodenshader (`groundMat`) senkt in Dungeons, Instanzen und Arenahallen (`V3.home.dungeon`) die Felswände im
Streifen zwischen Figur und Kamera (wächst mit dem Abstand, bis hinter die Kamera) auf einen niedrigen Sockel ab, mit
weichem Rand und flacher Beleuchtung. Nur Darstellung für den eigenen Spieler: Kollision, Wegsuche, Karte und
Mitspieler bleiben unberührt. Beim Verlassen (Tod, Teleport, Ausgang) wachsen die Wände in ~0,3 s zurück. Kein
neues Objekt, keine zusätzliche Zeichnung.

**Schwierigkeit (gegner.js `ENDGAME`, netz.js)** – nur Stufe-80-Inhalte: Gegner in Dungeons/Instanzen ab Stufe 75
(Kristallkaverne, Spiegelgruft, Thron der Leere). Endboss-Arenen (Aelvyr ist schon 5-Spieler-Inhalt) und alle
niedrigeren Dungeons unverändert. XP, Gold, Beute, Respawn, Sperren und Siegel unverändert.
- Elite (keine Bosse): Leben ×2,2; **Flankieren**: jede weitere Elite am selben Ziel +15 % Schaden und −10 %
  Verteidigung (bis 3); ab drei Angreifern **bedrängt** (Regeneration halb, 2 s); Nahkämpfer: **Schmetterschlag**
  alle 9–12 s, roter Kreis 1,2 s angekündigt, 14 % Höchstleben (nur „Erlittener Schaden“ zählt) – ausweichbar;
  Fernkämpferinnen (Leerenseherin, Spiegelseele): **Heilung** eines verletzten Verbündeten (14 %, Bosse nur 3 %),
  sichtbarer Strahl 1,4 s, Betäuben unterbricht → Vorrangziel.
- Bosse/Wächter: **Zermürbung** – Nahkampftreffer in Folge auf dasselbe Ziel: je Stufe −12 % Verteidigung, +5 %
  Schaden (bis 5, verfliegt nach 5 s oder beim Zielwechsel), Anzeige „Zermürbung ×N“. **Splitterschlag** – erstmals
  nach 12 s, dann alle 18–22 s ein Kreis unter dem Ziel (3 s angekündigt, Banner): 70 % des eigenen Höchstlebens
  (× „Erlittener Schaden“, ohne Ausweichen/Block), geteilt durch die Zahl der Spieler im Kreis; steht niemand darin,
  trifft es alle in der Halle voll. Allein: 28–67 % je Schlag; zu viert 7–17 %. Kein Einschlag ohne Warnung, bei
  vollem Leben kein Tod.
- Netz: Host entscheidet wie bisher; `mhit` trägt zusätzlich `sh` (weggenommene Verteidigung, auf 0–0,9 begrenzt),
  `zs`, `bs`; neue Nachricht `share` (Splitterschlag/Schmetterschlag) – jeder Client rechnet seinen Anteil mit den
  ihm bekannten Positionen (wie die übrigen Bossangriffe). Ältere Clients ignorieren die neuen Felder bzw. `share`
  und bekommen nur den Faktor in `mul`. Werte aus Nachrichten werden begrenzt (Radius, Dauer, Anteil).

### Dateien
js/welt.js, js/gegner.js, js/netz.js, js/drei-kern.js, js/spiel.js (Regeneration bedrängt), js/spieler.js
(Rettung aus dem Fels), js/sprachen/en.js.

### Messwerte (Lv 80 allein, Ausrüstung „gut“, je 2 Läufe, KI aus tools/balance-sim.js + Ausweichen aus Warnkreisen)
Skript: `scratchpad/dungeon/mess-lv80.js` (vorher = unveränderter Stand 14.31 als Kopie, nachher = Arbeitsstand).
Szenarien in der echten Dungeon-Geometrie: kav_elite = 2 Kavernenwächter + 2 Leerenseherinnen; kav_boss = Vaelith;
inst_mini = Glimra + 2 Glasspinnen (Spiegelgruft); inst_boss = Aelthys. Höchstens 240 s, Tränke ab 40 % Leben.
Format: Zeit · Ergebnis · Leben am Ende · Lebenstränke.

| Szenario | Weg | vorher (14.31) | nachher |
|---|---|---|---|
| kav_elite | krieger.1 | 19 s · Sieg 2/2 · 100% HP · 0.0 Tr. | 59 s · Sieg 2/2 · 100% HP · 0.0 Tr. |
| kav_elite | krieger.0 | 11 s · Sieg 2/2 · 94% HP · 0.0 Tr. | 30 s · Sieg 2/2 · 70% HP · 0.0 Tr. |
| kav_elite | schamane.1 | 10 s · Sieg 2/2 · 100% HP · 0.0 Tr. | 43 s · Sieg 2/2 · 82% HP · 1.0 Tr. |
| kav_elite | nekromant.1 | 11 s · Sieg 2/2 · 94% HP · 0.0 Tr. | 35 s · Sieg 2/2 · 100% HP · 2.0 Tr. |
| kav_elite | magier.0 | 9 s · Sieg 2/2 · 92% HP · 0.0 Tr. | 20 s · Sieg 2/2 · 44% HP · 2.5 Tr. |
| kav_elite | ninja.0 | 10 s · Sieg 2/2 · 100% HP · 0.0 Tr. | 29 s · Sieg 2/2 · 100% HP · 0.0 Tr. |
| kav_boss | krieger.1 | 194 s · Sieg 2/2 · 100% HP · 0.0 Tr. | 205 s · Sieg 1/2 · 27% HP · 18.0 Tr. |
| kav_boss | krieger.0 | 116 s · Sieg 2/2 · 50% HP · 6.5 Tr. | 38 s · Tod, Boss 65% übrig · 6.0 Tr. |
| kav_boss | schamane.1 | 180 s · Sieg 2/2 · 81% HP · 0.0 Tr. | 85 s · Tod, Boss 57% übrig · 4.5 Tr. |
| kav_boss | nekromant.1 | 122 s · Sieg 2/2 · 100% HP · 0.5 Tr. | 41 s · Tod, Boss 62% übrig · 4.0 Tr. |
| kav_boss | magier.0 | 51 s · Tod, Boss 44% übrig · 7.0 Tr. | 27 s · Tod, Boss 67% übrig · 4.0 Tr. |
| kav_boss | ninja.0 | 92 s · Sieg 2/2 · 89% HP · 0.0 Tr. | 75 s · Tod, Boss 29% übrig · 7.0 Tr. |
| inst_mini | krieger.1 | 128 s · Sieg 2/2 · 100% HP · 0.0 Tr. | 128 s · Sieg 2/2 · 56% HP · 3.5 Tr. |
| inst_mini | krieger.0 | 72 s · Sieg 2/2 · 56% HP · 1.0 Tr. | 27 s · Tod, Boss 67% übrig · 2.5 Tr. |
| inst_mini | schamane.1 | 120 s · Sieg 2/2 · 88% HP · 1.0 Tr. | 113 s · Sieg 1/2 · 50% HP · 9.0 Tr. |
| inst_mini | nekromant.1 | 71 s · Sieg 2/2 · 96% HP · 0.0 Tr. | 26 s · Tod, Boss 70% übrig · 2.5 Tr. |
| inst_mini | magier.0 | 42 s · Tod, Boss 26% übrig · 5.0 Tr. | 20 s · Tod, Boss 65% übrig · 3.5 Tr. |
| inst_mini | ninja.0 | 56 s · Sieg 2/2 · 94% HP · 0.0 Tr. | 67 s · Sieg 2/2 · 62% HP · 5.5 Tr. |
| inst_boss | krieger.1 | 240 s · Boss 54% übrig · 97% HP · 0.0 Tr. | 240 s · Boss 72% übrig · 39% HP · 14.0 Tr. |
| inst_boss | krieger.0 | 112 s · Tod, Boss 72% übrig · 12.0 Tr. | 27 s · Tod, Boss 93% übrig · 2.5 Tr. |
| inst_boss | schamane.1 | 240 s · Boss 59% übrig · 28% HP · 5.0 Tr. | 121 s · Tod, Boss 80% übrig · 15.5 Tr. |
| inst_boss | nekromant.1 | 156 s · Tod, Boss 53% übrig · 4.0 Tr. | 16 s · Tod, Boss 94% übrig · 1.0 Tr. |
| inst_boss | magier.0 | 48 s · Tod, Boss 82% übrig · 8.0 Tr. | 16 s · Tod, Boss 93% übrig · 2.5 Tr. |
| inst_boss | ninja.0 | 228 s · Tod, Boss 26% übrig · 5.0 Tr. | 18 s · Tod, Boss 92% übrig · 0.5 Tr. |

Ergebnis: Elite-Gruppen brauchen allein 2,3–4,3× so lange und kosten Schadensklassen 30–56 % Leben bzw. Tränke
(vorher ≤ 8 %). Dungeon-Boss und Wächter: vorher 5/6 Wege allein, jetzt nur noch der reine Tank (mit 18 bzw.
3,5 Tränken) und vereinzelt Heiler/Ninja; der Instanzboss ist allein nicht mehr zu halten (Tank 39 % Leben und
14 Tränke nach 240 s statt 97 % ohne Trank). Zum Vergleich ohne Ausweichen (Elite, `DODGE=0`): Tank 64 s/99 %,
Schamane 63 s/98 %, Magier 24 s/55 % Leben (vorher 18 s/100 %, 10 s/100 %, 9 s/92 %).

Gruppen: nicht mit echten Clients gemessen. Rechnung aus denselben Werten: zu viert trägt jeder vom Splitterschlag
17,5 % (× „Erlittener Schaden“) je ~20 s, Zermürbung trifft nur den Tank (Tank allein ~2,4 %/s gegen Vaelith, mit
Heiler gut zu halten), Flankieren/Bedrängt fallen weg, wenn sich die Elite auf mehrere verteilt; vier Spieler
machen etwa den vierfachen Schaden → Elite-Gruppe ~10–15 s, Vaelith ~50–60 s.

Leistung: Bildzeit 3D im Dungeon (Headless/SwiftShader, Grafik mittel, je 90 Bilder in drei Räumen) vorher
3,2–9,3 ms, nachher 3,2–6,9 ms – im Rauschen, kein messbarer Unterschied (Absenken kostet ein paar Rechenschritte
je Geländeecke). Auf echten Mobilgeräten nicht gemessen.

### Tests (ausgeführt)
- Grundrisse (`test-grundriss.js`, alle 30 Dungeon-Blöcke): vom Start erreichbar sind alle Räume, Boss, Ausgänge;
  0 unerreichbare Bodenkacheln (vorher 48–65 in 7 Endboss-Arenen); alle Monster/Steine der normalen Dungeons auf
  freiem Boden. Bilder vorher/nachher: `grundrisse-vorher.png`, `grundrisse-nachher.png`.
- Sicht: 3D-Bilder Normal- und Schulterkamera an einer Südwand und im Gang, vorher/nachher (`sicht-v-*`,
  `sicht-n-*`): Figur vorher halb verdeckt, nachher frei; Wände seitlich/hinten bleiben stehen.
- Mechaniken (`test-mechanik.js`, 24/24 OK): Elite nur im Dungeon ab Stufe 75 (draußen/Arena/niedrige Dungeons
  nicht), XP unverändert, Raid-Boss und niedrige Bosse ausgenommen, Zermürbungsstufen/Rücksetzen, Flankieren,
  Heilung/Unterbrechen/Boss-Heilung 3 %, Splitterschlag allein 70 %, zu zweit 35 %, zu viert 17,5 %, außerhalb 0,
  niemand im Kreis 70 %, Takt 12 s / 18–22 s.
- 3D-Lauf mit Splitterschlag, Schmetterschlag und Heilstrahl ohne Seitenfehler (`boss-splitter.jpg`,
  `elite-schmetter.jpg`); s73-Kopie: alle 12 Wege ohne Fehler.
- Negativ: Elite-Typ außerhalb eines Dungeons wird nicht verändert; Nachrichtenwerte werden begrenzt.

### Offene Punkte
- Kein echter Mehrspieler-Test (zwei Clients, Reconnect) – PeerJS-Vermittlung ist hier nicht erreichbar. Die
  Netzwege sind nur als Funktionen geprüft (Splitterschlag mit eingetragenen Mitspielerpositionen).
- Der reine Tank (Krieger · Leib, ~2 %/s Regeneration, Rüstung 78 %, „Erlittener Schaden“ 0,4) hält eine
  Elite-Gruppe weiter allein (dauert aber 3× so lange). Ihn dort mehr zu fordern, ginge nur über seine Klassenwerte
  (Regeneration) – Vorschlag für die Klassenbalance, hier nicht geändert.
- Instanzen und Höllenthron behalten ihre Grundrisse (Schlange mit Wächtern); Höhlenformen/Schleifen nur in den
  normalen Dungeons. Die vorhandene Zufallsverteilung der Instanz-Rudel (`spotNear`) setzt selten ein Monster an
  eine Wand (auch vorher so).
- Grundrisse sind je Welt fest (nicht je Besuch), wie seit 13.7.

## 11 | Drachen-Reittiere im Dungeon

Status: **umgesetzt** (ohne Mehrspieler-Test mit zwei echten Clients).

### Ursache
Seit 14.27 setzt `toggleRide`/`dragonRideTick` (spieler.js) dort, wo `dragonSkyOk` falsch ist (Dungeon, Instanz,
Arena, Turnierarena, Duell), `rideTierNow = 2`: Man ritt das Kriegsross, der Drache war nicht zu sehen.
Fliegen selbst war schon blockiert: außerhalb der Karten ist jede gesperrte Kachel auch im Flug fest
(`tileBlockedFlying` → `rockSolid`), Wände/Wasser/Lava im Dungeon ließen sich nie überfliegen.

### Änderungen
- spieler.js: neuer Zustand `p.dragonGround` (nicht gespeichert, jedes Bild vor dem Laufen neu bestimmt): Drache
  bleibt Reittier (`rideTierOf` = 3), `flying = false`, normale Kollision wie zu Fuß, Tempo = Kriegsross (+90 % statt
  +110 %) wegen der engen Gänge – nichts wird schneller als in 14.31. Beim Verlassen fliegt er wieder, wo es erlaubt
  ist; Tod, Absteigen, Reittierwechsel setzen den Zustand zurück.
- quests.js `moveThrough`: Zustand sofort beim Teleport (Dungeon-Eingang, Ausgang, Riss, Gruppenruf) – kein Bild
  fliegend im Dungeon; `landSafely` wie bisher.
- netz.js: sendet `r: 3` und neu `rg: 1` am Boden; Mitspieler zeigen den Drachen am Boden. Ältere Clients sehen ihn
  dort fliegend (nur Darstellung).
- drei-drache.js: Bodenmodus „stehen“ (Flügel angelegt) mit neuem Diagonalgang beim Laufen (Beine, Rumpf, Schwanz),
  Abheben/Landen beim Wechsel wie bisher. zeichnen.js (2D): am Boden tiefer, ohne Schweben, ruhige Flügel.
- oberflaeche.js: Knopf zeigt am Boden +90 % und „läuft hier am Boden“; Ratgeber-Text angepasst; en.js ergänzt.

### Tests (ausgeführt)
`scratchpad/dungeon/test-drache.js` (angepasste Kopie von test-drache-neu.js, Port 8793): 36/36 OK – die 29 alten
Prüfungen (zwei geändert: „Kriegsross“ → „Drache am Boden“ im Dungeon und Duell) plus: Wand im Dungeon hält den
Drachen auf, Eintritt über den Eingang landet sofort, Ausgang fliegt wieder (+110 %), Netzzustand im Dungeon
`r=3, rg=1` und beim Mitspieler `dragonGround`, draußen kein `rg`, nach Tod kein Bodenmodus, 2D-Zeichnen am Boden.
3D-Bilder: `drache-boden-steht-a.jpg`, `drache-boden-laeuft-*.jpg` (Kristallkaverne, Spinnenhöhle).

### Offene Punkte
- Kein Server, der Positionen prüft (gibt es im Spiel nicht); die Flugsperre ist clientseitig, aber in Dungeons
  ist fliegende und laufende Kollision ohnehin gleich.
- Nur ein Drache („Glutschwinge“) existiert; mobil nicht auf echtem Gerät getestet.
