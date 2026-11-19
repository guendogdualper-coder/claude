# Dropliste der Seelensteine

Was jeder Seelenstein fallen lassen kann und wie oft. Die Zahlen sind direkt aus den Spieldaten gelesen (`stoneDrops` in
js/daten/monster.js, `rollLoot` und `stoneLegendary` in js/ausruestung.js, `SKILL_MAT_DROP`, `STONE_MATS`, `FORGE_CORE` in
js/daten/gegenstaende.js, `EP_RING` in js/erfahrungsring.js) und mit einer Stichprobe geprüft: je Stein 20.000 simulierte Steine mit den echten Beute-Funktionen des Spiels (Tabelle „Stichprobe“ unten).

Alle Chancen gelten **je zerstörtem Stein** und **ohne** den Bonus „Mehr Beute“. „Mehr Beute“ (bis +25 %) erhöht nur
Ausrüstung, Tränke und Monsterteile – nicht Splitter, Segensschriftrollen, Bücher, Schriftrollen, Seelensteine,
Verstärkungen, Switcher, Sternensteine, Ätherkerne, den Erfahrungsring und das legendäre Teil.

## Wann gibt es Beute? (Stufenabstand)

- Ein Stein gibt Beute, solange er **weniger als 20 Stufen** unter dir ist. Ab 20 Stufen darunter gibt
  es nur noch die (kleine) Erfahrung – kein Gold, keine Gegenstände. Das gilt auch für die Monster, die der Stein ruft.
- Faustregel: Stein der Stufe S gibt Beute bis Spielerstufe **S + 19**.

| Spielerstufe | Beute von Steinen ab Stufe | keine Beute mehr von |
|---:|---:|---|
| 20 | 5 | – |
| 30 | 15 | 5, 10 |
| 40 | 25 | 5, 10, 15, 20 |
| 50 | 35 | 5, 10, 15, 20, 25, 30 |
| 60 | 45 | 5, 10, 15, 20, 25, 30, 35, 40 |
| 70 | 55 | 5, 10, 15, 20, 25, 30, 35, 40, 45, 50 |
| 75 | 60 | 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55 |
| 80 | 65 | 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60 |

- Gold sinkt schon vorher: Steine bis 3 Stufen unter dir zahlen voll, danach 8 % weniger je Stufe (höchstens −90 %).
  Auf Stufe 80 zahlt ein Stein der Stufe 75 noch 84 %, der Stufe 70 noch 44 % seines Golds.

## Was jeder Stein immer gibt

- **Gold:** 12 × Grundgold (3,5 × Steinstufe + 20) × Goldart des Steins, Streuung 85–115 %. Goldart: Stein der Gier ×3;
  Schwärze, Fäulnis, Untergang und Abgrund ×2; alle anderen ×1.
- **Seelensplitter** und **Tränke** (Leben und Mana in der Größe der Steinstufe; Mana etwa 60 % der Lebenstränke).
- **Monsterteile** für den Schmied: 1–3 Teile der Monster des Gebiets (im Dungeon das Teil des Dungeon-Bosses).

## Ausrüstung aus Seelensteinen

- Chance auf **ein** Teil je Stein (Spalte „Ausrüstung“). Ab Stein 20 ist es Ausrüstung der nächsthöheren Gebiete
  (Steinstufe + 10), höchstens Ewig (Lv 80).
- **Seltenheit:** 62 % grün (Gewöhnlich, 1–2 Boni), 38 % blau (Selten, 2–3 Boni). Plus wie in der Spalte „Plus“.
- **Klasse:** 70 % für die eigene Klasse, sonst für eine zufällige (zum Verkaufen oder Handeln). Waffen meist für den
  eigenen Weg.
- **Legendär:** 0,01 % je Stein (1 von 10.000): ein goldenes Teil für die eigene Klasse auf der Stufe des Steins
  mit mindestens 4 Boni (besser gewürfelt) und einem goldenen Banner.
- **Prägung (neu):** Ewig-Teile (Lv 80) aus den Steinen der Lv-80-Karten tragen eine Prägung – eigener Name, eigenes
  Aussehen, eigener Bonus-Schwerpunkt (siehe docs/endgame-80.md): Kristallabgrund Splitter/Prismen, Seelenhain
  Irrlicht/Ranken, Nebelküste Gischt/Sturmflut, Himmelsterrassen Zenit/Blüten, Steine in den Lv-80-Instanzen Bastion,
  Steine im Turm der Verdammten Fluch.

## Erste Karte (Stufe 5–15)

| Stein | Stufe | Wo | Beute bis Spielerstufe | Schwerpunkt | Gold Ø | Splitter | Tränke (Leben) |
|---|---:|---|---:|---|---:|---:|---:|
| Stein der Trauer | 5 | Sonnenwiesen (Kazehana); Dämmerwiesen (Mondfall) | 24 | viele Tränke | 450 | 2–4 | 2–4 (S) |
| Stein der Wut | 10 | Sonnenwiesen (Kazehana); Dämmerwiesen (Mondfall); Dungeons: Banditenkeller | 29 | oft Waffen | 660 | 2–4 | 0–1 (M) |
| Stein der Gier | 15 | Dunkelwald (Dunkelwald); Aschewald (Aschewald); Dungeons: Banditenkeller | 34 | dreimal so viel Gold | 2.610 | 2–5 | 0–1 (M) |


Ausrüstung:

| Stein | Ausrüstung je Stein | Gegenstandsstufe | Plus | Plätze | grün / blau (Stichprobe) | legendär |
|---|---:|---|---|---|---|---:|
| Stein der Trauer | 35 % | Solide (Lv 5) | +0–2 | alle | 63 % / 37 % | 0,01 % |
| Stein der Wut | 50 % | Gut (Lv 10) | +0–2 | Waffe | 63 % / 37 % | 0,01 % |
| Stein der Gier | 35 % | Gehärtet (Lv 15) | +0–2 | alle | 62 % / 38 % | 0,01 % |

Materialien (Chance je Stein, in Klammern die Anzahl):

| Stein | Verstärkung | Switcher | Seltene Verstärkung | Sternenstein | Sternen-Switcher | Segensschriftrolle |
|---|---|---|---|---|---|---|
| Stein der Trauer | 12 % | 2,0 % | 0,50 % | 0,30 % | – | – (erst ab Stein 35) |
| Stein der Wut | 12 % | 2,0 % | 0,50 % | 0,30 % | – | – (erst ab Stein 35) |
| Stein der Gier | 12 % | 2,0 % | 0,50 % | 0,30 % | – | – (erst ab Stein 35) |

Fertigkeiten und Besonderes:

| Stein | Fertigkeitsbuch | Schriftrolle (H) | Seelenstein-Gegenstand (L/V) | Ätherkern | Erfahrungsring |
|---|---:|---:|---:|---:|---:|
| Stein der Trauer | 18 % | – | – | – | – |
| Stein der Wut | 18 % | – | – | – | – |
| Stein der Gier | 18 % | – | – | – | – |

## Stufe 20–30

| Stein | Stufe | Wo | Beute bis Spielerstufe | Schwerpunkt | Gold Ø | Splitter | Tränke (Leben) |
|---|---:|---|---:|---|---:|---:|---:|
| Stein der Dornen | 20 | Dunkelwald (Dunkelwald); Aschewald (Aschewald); Dungeons: Spinnenhöhle | 39 | oft Rüstungsteile | 1.080 | 3–5 | 0–1 (M) |
| Stein der Schwärze | 25 | Rostschlucht (Rostschlucht); Knochenwüste (Knochenwüste) | 44 | Tränke und viel Gold | 2.580 | 3–6 | 2–3 (XL) |
| Stein der Asche | 30 | Rostschlucht (Rostschlucht); Sandschlangenwüste (Schlangental); Knochenwüste (Knochenwüste); Schattenklippen (Schattenklippen); Dungeons: Orkfestung | 49 | viele Verstärkungen | 1.500 | 3–6 | 0–1 (XL) |


Ausrüstung:

| Stein | Ausrüstung je Stein | Gegenstandsstufe | Plus | Plätze | grün / blau (Stichprobe) | legendär |
|---|---:|---|---|---|---|---:|
| Stein der Dornen | 50 % | Meister (Lv 30) | +0–2 | Rüstung, Helm, Schultern, Umhang, Schild, Schuhe, Gürtel | 62 % / 38 % | 0,01 % |
| Stein der Schwärze | 35 % | Meister (Lv 30) | +0–2 | alle | 62 % / 38 % | 0,01 % |
| Stein der Asche | 35 % | Meister (Lv 30) | +0–2 | alle | 62 % / 38 % | 0,01 % |

Materialien (Chance je Stein, in Klammern die Anzahl):

| Stein | Verstärkung | Switcher | Seltene Verstärkung | Sternenstein | Sternen-Switcher | Segensschriftrolle |
|---|---|---|---|---|---|---|
| Stein der Dornen | 18 % | 8,0 % | 3,0 % | 2,0 % | – | – (erst ab Stein 35) |
| Stein der Schwärze | 20 % | 9,5 % | 3,8 % | 2,6 % | – | – (erst ab Stein 35) |
| Stein der Asche | 84 % (2× 60 %, je 1–2) | 84 % (2× 60 %, je 1) | 4,5 % | 3,3 % | 4,0 % | – (erst ab Stein 35) |

Fertigkeiten und Besonderes:

| Stein | Fertigkeitsbuch | Schriftrolle (H) | Seelenstein-Gegenstand (L/V) | Ätherkern | Erfahrungsring |
|---|---:|---:|---:|---:|---:|
| Stein der Dornen | 18 % | – | – | – | – |
| Stein der Schwärze | 18 % | – | – | – | – |
| Stein der Asche | 18 % | – | – | – | – |

## Stufe 35–50

| Stein | Stufe | Wo | Beute bis Spielerstufe | Schwerpunkt | Gold Ø | Splitter | Tränke (Leben) |
|---|---:|---|---:|---|---:|---:|---:|
| Stein der Glut | 35 | Ödland (Ödland); Sandschlangenwüste (Schlangental); Blutsteppe (Blutsteppe); Schattenklippen (Schattenklippen) | 54 | viele Seelensplitter | 1.710 | 8–14 | 0–1 (XL) |
| Stein der Schatten | 40 | Ödland (Ödland); Nagadschungel (Schlangental); Blutsteppe (Blutsteppe); Schwarzmoor (Schattenklippen); Dungeons: Totengruft | 59 | viele Switcher | 1.920 | 4–7 | 0–1 (XL) |
| Stein des Frostes | 45 | Frostgipfel (Frostgipfel); Nagadschungel (Schlangental); Nachtfrost (Nachtfrost); Schwarzmoor (Schattenklippen); Dungeons: Eisgrotte, Schlangentempel | 64 | Seltene Verstärkungen | 2.130 | 4–8 | 0–1 (XL) |
| Stein der Stille | 50 | Frostgipfel (Frostgipfel); Nagadschungel (Schlangental); Nachtfrost (Nachtfrost); Schwarzmoor (Schattenklippen); Dungeons: Eisgrotte, Schlangentempel | 69 | Sternensteine | 2.340 | 5–8 | 0–1 (XL) |


Ausrüstung:

| Stein | Ausrüstung je Stein | Gegenstandsstufe | Plus | Plätze | grün / blau (Stichprobe) | legendär |
|---|---:|---|---|---|---|---:|
| Stein der Glut | 35 % | Himmlisch (Lv 45) | +0–2 | alle | 61 % / 39 % | 0,01 % |
| Stein der Schatten | 35 % | Himmlisch (Lv 45) | +0–2 | alle | 62 % / 38 % | 0,01 % |
| Stein des Frostes | 35 % | Himmlisch (Lv 45) | +0–2 | alle | 61 % / 39 % | 0,01 % |
| Stein der Stille | 35 % | Göttlich (Lv 60) | +0–2 | alle | 62 % / 38 % | 0,01 % |

Materialien (Chance je Stein, in Klammern die Anzahl):

| Stein | Verstärkung | Switcher | Seltene Verstärkung | Sternenstein | Sternen-Switcher | Segensschriftrolle |
|---|---|---|---|---|---|---|
| Stein der Glut | 75 % (2× 50 %, je 1) | 84 % (2× 60 %, je 1) | 5,2 % | 4,0 % | 4,8 % | 10 % |
| Stein der Schatten | 75 % (2× 50 %, je 1–2) | 84 % (2× 60 %, je 1–2) | 6,0 % | 4,6 % | 5,6 % | 11 % |
| Stein des Frostes | 75 % (2× 50 %, je 1–2) | 84 % (2× 60 %, je 1) | 14 % (1–2) | 5,3 % | 6,4 % | 12 % |
| Stein der Stille | 75 % (2× 50 %, je 1–2) | 84 % (2× 60 %, je 1) | 7,5 % | 12 % (1–2) | 7,2 % | 13 % |

Fertigkeiten und Besonderes:

| Stein | Fertigkeitsbuch | Schriftrolle (H) | Seelenstein-Gegenstand (L/V) | Ätherkern | Erfahrungsring |
|---|---:|---:|---:|---:|---:|
| Stein der Glut | 18 % | – | – | – | – |
| Stein der Schatten | 18 % | 22 % | – | 4,0 % | 3,0 % |
| Stein des Frostes | 18 % | 24 % | 3,5 % | 4,5 % | 3,0 % |
| Stein der Stille | 18 % | 27 % | 10 % | 5,0 % | 3,0 % |

## Stufe 55–70

| Stein | Stufe | Wo | Beute bis Spielerstufe | Schwerpunkt | Gold Ø | Splitter | Tränke (Leben) |
|---|---:|---|---:|---|---:|---:|---:|
| Stein der Fäulnis | 55 | Totenmoor (Totenmoor); Donnerklamm (Donnerklamm) | 74 | Tränke und viel Gold | 5.100 | 5–9 | 2–3 (XXL) |
| Stein der Pein | 60 | Totenmoor (Totenmoor); Donnerklamm (Donnerklamm); Dungeons: Titanenschmiede, Gletschergruft, Feste des Nordlichts, Versunkene Moorkrypta, Knochenkathedrale, Donnerschmiede, Sturmhorst, Glutkessel, Aschenzitadelle | 79 | Ausrüstung mit +1 bis +2 | 2.760 | 5–9 | 0–1 (XXL) |
| Stein der Flamme | 65 | Feuerberg (Feuerberg); Titanenkamm (Donnerklamm); Dungeons: Drachenhort, Titanenschmiede, Thron der Unterwelt | 84 | Waffen, 5. Bonus und Sternensteine | 2.970 | 6–10 | 0–1 (XXL) |
| Stein des Untergangs | 70 | Feuerberg (Feuerberg); Titanenkamm (Donnerklamm); Seelenhain (Seelenhain); Nebelküste (Nebelküste); Himmelsterrassen (Himmelsterrassen); Dungeons: Drachenhort | 89 | von allem mehr | 6.360 | 6–10 | 1–3 (XXL) |


Ausrüstung:

| Stein | Ausrüstung je Stein | Gegenstandsstufe | Plus | Plätze | grün / blau (Stichprobe) | legendär |
|---|---:|---|---|---|---|---:|
| Stein der Fäulnis | 35 % | Göttlich (Lv 60) | +0–2 | alle | 63 % / 37 % | 0,01 % |
| Stein der Pein | 60 % | Abgründig (Lv 70) | +1–2 | alle | 63 % / 37 % | 0,01 % |
| Stein der Flamme | 50 % | Abgründig (Lv 70) | +0–2 | Waffe | 63 % / 37 % | 0,01 % |
| Stein des Untergangs | 70 % | Ewig (Lv 80) | +1–2 | alle | 63 % / 37 % | 0,01 % |

Materialien (Chance je Stein, in Klammern die Anzahl):

| Stein | Verstärkung | Switcher | Seltene Verstärkung | Sternenstein | Sternen-Switcher | Segensschriftrolle |
|---|---|---|---|---|---|---|
| Stein der Fäulnis | 75 % (2× 50 %, je 1–2) | 84 % (2× 60 %, je 1) | 8,2 % | 6,6 % | 8,0 % | 14 % |
| Stein der Pein | 75 % (2× 50 %, je 1–2) | 84 % (2× 60 %, je 1) | 9,0 % | 7,2 % | 8,8 % | 15 % |
| Stein der Flamme | 75 % (2× 50 %, je 1–2) | 84 % (2× 60 %, je 1) | 15 % (1–2) | 12 % (1–2) | 9,6 % | 16 % |
| Stein des Untergangs | 84 % (2× 60 %, je 1–3) | 84 % (2× 60 %, je 1–2) | 16 % (1–2) | 13 % (1–2) | 10 % | 25 % |

Fertigkeiten und Besonderes:

| Stein | Fertigkeitsbuch | Schriftrolle (H) | Seelenstein-Gegenstand (L/V) | Ätherkern | Erfahrungsring |
|---|---:|---:|---:|---:|---:|
| Stein der Fäulnis | 18 % | 30 % | 10 % | 5,5 % | 3,0 % |
| Stein der Pein | 18 % | 32 % | 10 % | 6,0 % | 3,0 % |
| Stein der Flamme | 18 % | 34 % | 10 % | 6,5 % | 3,0 % |
| Stein des Untergangs | 18 % | 37 % | 10 % | 7,0 % | 3,0 % |

## Stufe 75–80 (Kristallabgrund, Seelenhain, Nebelküste, Himmelsterrassen)

| Stein | Stufe | Wo | Beute bis Spielerstufe | Schwerpunkt | Gold Ø | Splitter | Tränke (Leben) |
|---|---:|---|---:|---|---:|---:|---:|
| Stein der Leere | 75 | Kristallhänge (Kristallabgrund); Leerenschlund (Kristallabgrund); Seelenhain (Seelenhain); Nebelküste (Nebelküste); Himmelsterrassen (Himmelsterrassen); Dungeons: Spiegelgruft, Thron der Leere, Kristallkaverne, Gezeitengrotte, Nebelwrack, Sonnentempel, Wolkenhort | 94 | Ausrüstung mit +1 bis +2 | 3.390 | 6–11 | 0–1 (XXL) |
| Stein des Abgrunds | 80 | Leerenschlund (Kristallabgrund); Seelenhain (Seelenhain); Nebelküste (Nebelküste); Himmelsterrassen (Himmelsterrassen); Dungeons: Spiegelgruft, Thron der Leere, Kristallkaverne, Gezeitengrotte, Nebelwrack, Sonnentempel, Wolkenhort | 99 | von allem mehr | 7.200 | 7–11 | 1–3 (XXL) |


Gold samt der Monster aus den Wellen (Ø 18 je Stein), gemessen mit einem Krieger der Stufe 80: Stein der Stufe 80 etwa
19.200, Stufe 75 etwa 9.200, Stufe 70 etwa 6.500 (10 Stufen unter dir, weniger Gold). Dazu etwa 3.400 Gold, wenn man die
Ausrüstung aus dem Stein beim Händler verkauft. Mehr dazu: docs/endgame-80.md.

Ausrüstung:

| Stein | Ausrüstung je Stein | Gegenstandsstufe | Plus | Plätze | grün / blau (Stichprobe) | legendär |
|---|---:|---|---|---|---|---:|
| Stein der Leere | 60 % | Ewig (Lv 80) | +1–2 | alle | 62 % / 38 % | 0,01 % |
| Stein des Abgrunds | 70 % | Ewig (Lv 80) | +1–2 | alle | 62 % / 38 % | 0,01 % |

Materialien (Chance je Stein, in Klammern die Anzahl):

| Stein | Verstärkung | Switcher | Seltene Verstärkung | Sternenstein | Sternen-Switcher | Segensschriftrolle |
|---|---|---|---|---|---|---|
| Stein der Leere | 75 % (2× 50 %, je 1–2) | 84 % (2× 60 %, je 1) | 11 % | 9,2 % | 11 % | 18 % |
| Stein des Abgrunds | 84 % (2× 60 %, je 1–4) | 84 % (2× 60 %, je 1–2) | 18 % (1–2) | 15 % (1–2) | 12 % | 25 % |

Fertigkeiten und Besonderes:

| Stein | Fertigkeitsbuch | Schriftrolle (H) | Seelenstein-Gegenstand (L/V) | Ätherkern | Erfahrungsring |
|---|---:|---:|---:|---:|---:|
| Stein der Leere | 18 % | 40 % | 10 % | 7,5 % | 3,0 % |
| Stein des Abgrunds | 18 % | 42 % | 10 % | 8,0 % | 3,0 % |

## Monster, die ein Stein ruft

- Gold wie normale Monster, dazu ×1,2 bis ×2,1 nach der Goldart des Steins.
- Seelensplitter 10 % (normale Monster 3 %), Tränke 1,5- bis 2-mal so oft wie draußen, eigenes Monsterteil 3,5 %.
- Ausrüstung mit 6 % der Chance ihres Steins (also 2–4 %), Seltenheit 58 % grau, 35 % grün, 7 % blau.
- Keine Verstärkungen, Switcher, Sternensteine, Bücher oder Schriftrollen – die gibt nur der Stein selbst.

## Kurz: Lv-80-Instanzen, Turm und Endbosse

Lv-80-Instanzen (je Instanz eine Sperre von 60 Minuten nach dem Boss; Wächter-Beute je Sperre einmal):

| Instanz | Karte | Set |
|---|---|---|
| Spiegelgruft | Kristallabgrund | Spiegelglas der Herrin Aelthys |
| Thron der Leere | Kristallabgrund | Leerenpanzer des Nihilor |
| Gezeitengrotte | Nebelküste | Perlmutt der Gezeitenherrin |
| Nebelwrack | Nebelküste | Nebelmantel des Geisterkapitäns |
| Sonnentempel | Himmelsterrassen | Sonnenpanzer des Sonnenwächters |
| Wolkenhort | Himmelsterrassen | Sturmschwingen des Sturmdrachen |

- **Wächter:** 6,0 %–12 % ein episches Teil (Lv 70, mit 35 % Lv 80), 3,0 % ein legendäres
  Teil (Lv 80), 3–5 Seelensplitter, 2–3 Schmiede-Teile, Gold 150 × Stufe.
- **Boss:** 1 episches Teil (Gruppe ab 4: bis 2), mit 20 % zusätzlich ein legendäres (Lv 80), 10–15 Seelensplitter,
  4–6 Schmiede-Teile, Gold 800 × Stufe (Stufe 78: etwa 62.400), Ätherkern 55 % (1–2), Erfahrungsring 40 %.
- Alle epischen und legendären Teile gehören zum **Set der Instanz**; legendäre Teile aus Spiegelgruft und Thron der
  Leere zu 70 % zum **Klassen-Set** der ersten Reihe, aus den vier Instanzen von Nebelküste und
  Himmelsterrassen zur zweiten Reihe (docs/sets.md).
- Seelensteine und Monster in den Lv-80-Instanzen: Beute wie oben; Ewig-Teile davon mit der Prägung **Bastion**.

Turm der Verdammten (Seelenhain, ab Stufe 80, Sperre 60 Minuten, docs/turm.md):

- Je geschaffter Ebene 1.200 Gold × Ebene (11 Ebenen zusammen 79.200), gewöhnliche Gegner etwas Gold.
- **Hüter:** 12 % ein episches Teil (Lv 70, mit 35 % Lv 80), 3,0 % legendär, Splitter, Schmiede-Teile, Gold.
- **Wächter:** 2 epische Teile (Lv 80), 20 % legendär (meist Klassen-Set der zweiten Reihe), 10–15 Splitter,
  4–6 Schmiede-Teile, 1–2 Ätherkerne, 30 % Seelenstein-Gegenstand, Gold 800 × Stufe.
- Echte Seelensteine in den Hallen geben ihre gewohnte Beute. Ewig-Teile aus dem Turm ohne Set tragen die Prägung **Fluch**.

Endbosse ab Stufe 76:

| Endboss | Halle | Karte | Stufe | Prägung der Ewig-Teile |
|---|---|---|---:|---|
| Weltendrache Ignar | Hort des Weltendrachen | Feuerberg | 76 | Titan |
| Donnertitan Tarkon | Gipfel des Donnertitans | Donnerklamm | 78 | Titan |
| Aelvyr, Wyrm des Abgrunds | Hort des Abgrundwyrms | Kristallabgrund | 80 | Wyrm |

- Drei Teile für die eigene Klasse (eine Waffe, zwei andere) auf Ewig (Lv 80), episch mit mindestens 4 Boni (auf Ewig
  bleibt Gold den Instanzen vorbehalten), 8–12 Teile der Endboss-Map, 15–25 Seelensplitter, Gold 1.500 × Stufe, dazu
  das Kill-Gold ×6. Ätherkerne 2–3, Erfahrungsring 60 %.

## Stichprobe

Je Stein 20.000 Steine mit den echten Beute-Funktionen (`rewardKillInner`, Spielerstufe = Steinstufe, ohne „Mehr Beute“).
Links das Modell aus den Daten, rechts der gemessene Anteil der Steine, die das Material gaben. Bei 20.000 Steinen liegt die
Streuung bei etwa ±0,7 Prozentpunkten (bei 10 %: ±0,4, bei 1 %: ±0,15).

| Stein | Ausrüstung | Segensschriftrolle | Verstärkung | Switcher | Sternenstein | Buch | Schriftrolle | Seelenstein | Ätherkern | Ring | Gold Ø |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 5 | 35 % / 35 % | – | 12 % / 12 % | 2,0 % / 2,0 % | 0,30 % / 0,29 % | 18 % / 18 % | – | – | – | – | 450 / 450 |
| 10 | 50 % / 50 % | – | 12 % / 12 % | 2,0 % / 1,9 % | 0,30 % / 0,34 % | 18 % / 18 % | – | – | – | – | 660 / 660 |
| 15 | 35 % / 35 % | – | 12 % / 12 % | 2,0 % / 2,0 % | 0,30 % / 0,32 % | 18 % / 18 % | – | – | – | – | 2.610 / 2.609 |
| 20 | 50 % / 50 % | – | 18 % / 18 % | 8,0 % / 8,1 % | 2,0 % / 1,8 % | 18 % / 18 % | – | – | – | – | 1.080 / 1.080 |
| 25 | 35 % / 35 % | – | 20 % / 20 % | 9,5 % / 9,7 % | 2,6 % / 2,8 % | 18 % / 18 % | – | – | – | – | 2.580 / 2.580 |
| 30 | 35 % / 35 % | – | 84 % / 84 % | 84 % / 84 % | 3,3 % / 3,4 % | 18 % / 18 % | – | – | – | – | 1.500 / 1.501 |
| 35 | 35 % / 35 % | 10 % / 9,9 % | 75 % / 75 % | 84 % / 84 % | 3,9 % / 4,0 % | 18 % / 18 % | – | – | – | – | 1.710 / 1.710 |
| 40 | 35 % / 35 % | 11 % / 11 % | 75 % / 75 % | 84 % / 84 % | 4,6 % / 4,6 % | 18 % / 18 % | 22 % / 21 % | – | 4,0 % / 4,3 % | 3,0 % / 3,0 % | 1.920 / 1.919 |
| 45 | 35 % / 34 % | 12 % / 12 % | 75 % / 75 % | 84 % / 84 % | 5,2 % / 5,2 % | 18 % / 18 % | 24 % / 25 % | 3,5 % / 3,5 % | 4,5 % / 4,3 % | 3,0 % / 3,0 % | 2.130 / 2.130 |
| 50 | 35 % / 34 % | 13 % / 13 % | 75 % / 75 % | 84 % / 84 % | 12 % / 11 % | 18 % / 18 % | 27 % / 27 % | 10 % / 9,8 % | 5,0 % / 5,1 % | 3,0 % / 2,8 % | 2.340 / 2.338 |
| 55 | 35 % / 35 % | 14 % / 14 % | 75 % / 75 % | 84 % / 84 % | 6,6 % / 6,2 % | 18 % / 17 % | 30 % / 30 % | 10 % / 9,8 % | 5,5 % / 5,4 % | 3,0 % / 2,9 % | 5.100 / 5.093 |
| 60 | 60 % / 60 % | 15 % / 15 % | 75 % / 75 % | 84 % / 84 % | 7,2 % / 7,2 % | 18 % / 18 % | 32 % / 32 % | 10 % / 10 % | 6,0 % / 5,9 % | 3,0 % / 3,0 % | 2.760 / 2.760 |
| 65 | 50 % / 50 % | 16 % / 16 % | 75 % / 75 % | 84 % / 84 % | 12 % / 12 % | 18 % / 18 % | 34 % / 34 % | 10 % / 9,8 % | 6,5 % / 6,5 % | 3,0 % / 2,9 % | 2.970 / 2.968 |
| 70 | 70 % / 70 % | 25 % / 25 % | 84 % / 84 % | 84 % / 84 % | 13 % / 13 % | 18 % / 18 % | 37 % / 37 % | 10 % / 10 % | 7,0 % / 6,6 % | 3,0 % / 2,8 % | 6.360 / 6.360 |
| 75 | 60 % / 60 % | 18 % / 18 % | 75 % / 76 % | 84 % / 84 % | 9,2 % / 8,8 % | 18 % / 18 % | 40 % / 40 % | 10 % / 10 % | 7,5 % / 7,4 % | 3,0 % / 2,9 % | 3.390 / 3.388 |
| 80 | 70 % / 70 % | 25 % / 25 % | 84 % / 84 % | 84 % / 84 % | 15 % / 14 % | 18 % / 18 % | 42 % / 42 % | 10 % / 9,9 % | 8,0 % / 7,9 % | 3,0 % / 2,9 % | 7.200 / 7.200 |

Legendär: 30 Funde in 320.000 Steinen (erwartet 32).

Erzeugt im Browser aus den geladenen Spieldaten (Playwright-Testskript, Stand Endgame-80-Update); bei Änderungen an den
Chancen neu messen.
