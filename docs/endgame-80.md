# Endgame ab Stufe 80

Wunsch des Spielers: „Ab Level 80 soll es erst richtig losgehen“ – viel Ausrüstung farmen, viel Gold beim Schmied
lassen, und mit dem Gold auf Stufe 80 etwas Sinnvolles anfangen („man hat Level 80 gehittet und hat irgendwie unendlich
viel Geld“).

Code: `js/endgame80.js` (neu, nach `js/turm.js` geladen), dazu kleine Eingriffe in `js/drei-figuren.js` (Prägung an die
Waffe weiterreichen), `js/daten/ratgeber-wissen.js` (fünf Einträge), `index.html` und `sw.js` (Skript einbinden).
Dropliste aller Seelensteine: `docs/seelenstein-drops.md`.
Seelenstufen, Tages- und Wochenaufträge und Weltbosse (seit 15.75): `docs/endgame-langzeit.md`.

## 1. Bestandsaufnahme Lv-80-Ausrüstung

Je Klasse und Platz gab es bisher auf Ewig (Lv 80) **einen** Namen und ein Grundmodell je Waffenart. Unterschiede kamen
nur über die Seltenheit (Farbe des Namens, Boni) und über Sets:

| Platz (je Klasse) | Namen vorher | Aussehen vorher | Namen nachher | Aussehen nachher |
|---|---:|---|---:|---|
| Waffe (je Waffenart) | 1 | 1 (Set-Waffen sehen gleich aus) | 13 | 13: Grundform + 12 Prägungen (Farbe der Waffe, eigenes Merkmal in 3D, Zeichen im Symbol) |
| Helm, Schultern, Rüstung, Umhang | 1 | 10: Grundform, 7 Set-Farben (6 Lv-80-Instanzen + Höllenthron), 2 Klassen-Sets mit eigener Form | 13 | 22: dazu 12 Prägungen mit eigener Farbe und eigener Form in 3D |
| Schuhe, Gürtel, Schild/Nebenhand, Köcher | 1 | 10 (nur Farben) | 13 | 22: dazu 12 Prägungen mit eigener Farbe und Zeichen im Symbol |

Dazu kommen 8 Färbungen beim Veredler, die jedes Ewig-Teil ohne Set annehmen kann (9 × 13 Farbkombinationen je Teil).
Krieger mit 4 Waffenarten haben damit 52 benannte Lv-80-Waffen statt 4, Magier mit einer Waffenart 13 statt 1.

## 2. Prägungen (neue Lv-80-Varianten)

Jedes **Ewig-Teil ohne Set**, das aus einer Lv-80-Quelle fällt, bekommt eine Prägung (`item.v80`). Sie bestimmt Namen,
Farben, Formen und Bonus-Schwerpunkt – **nicht** die Stärke: Grundwerte, Seltenheit, Zahl der Boni, Plus und damit das
Itemlevel sind wie bei jedem anderen Ewig-Teil. Ein Teil mit höherem Itemlevel bleibt besser, egal welche Prägung.

| Prägung | Name (Beispiele) | Woher | Farben (Stoff / Metall / Leuchten) | Schwerpunkt | Merkmal in 3D |
|---|---|---|---|---|---|
| Splitter | Splitterschwert, Splitterpanzer | Seelensteine im Kristallabgrund | Nachtblau / Eisblau / Cyan | Krit. Treffer, Krit. Schaden, Ausweichen, Angriffstempo, Angriff | Kristallsplitter am Helm, an den Schultern und gekreuzt auf dem Rücken |
| Prismen | Prismenzepter, Prismenornat | Seelensteine im Kristallabgrund | Violett / Fliederweiß / Lila | Hauptwert, Mana, Abwehr gegen Magie, Krit. Schaden | schwebende Prismen über der Stirn und im Rücken, Amulett |
| Irrlicht | Irrlichtdorn, Irrlichtgewand | Seelensteine im Seelenhain | Moosgrau / Silbergrün / Blassgrün | Ausweichen, Lauftempo, Abwehr gegen Magie, Regeneration, Krit. Treffer | Irrlicht an einem Stiel über der Stirn, Lichter um Kopf und Rücken |
| Ranken | Rankensense, Rankentalar | Seelensteine im Seelenhain | Waldgrün / Holz / Hellgrün | Leben, Regeneration, Lebensraub, Gift, Vitalität | Blätterkranz mit Beeren, Ranke über der Brust, Ranken am Rücken |
| Gischt | Gischtfächer, Gischtrobe | Seelensteine an der Nebelküste | Meergrün / Schaumweiß / Hellcyan | Angriffstempo, Abwehr gegen Fernkampf, Ausweichen, Lauftempo, Regeneration | Flossenkamm, Wellenkamm mit Schaumperlen, Flossen am Rücken |
| Sturmflut | Sturmflutaxt, Sturmflutpanzer | Seelensteine an der Nebelküste | Marineblau / Messing / Blau | Angriff, Stark gegen Monster, Verteidigung, Krit. Schaden | Dreizack über der Stirn, Ankerflunken, gekreuzte Harpunen |
| Zenit | Zenitglocke, Zenitrobe | Seelensteine auf den Himmelsterrassen | Elfenbein / Gold / Hellgelb | Verteidigung, Schadensreduktion, Abwehr gegen Nahkampf, Vitalität | Goldkamm mit Scheibe, Goldplatten an den Schultern, goldene Schwingen |
| Blüten | Blütenstab, Blütenornat | Seelensteine auf den Himmelsterrassen | Rosenweiß / Altrosa / Rosa | Mehr Gold, Mehr Beute, Regeneration, Leben, Stark gegen Monster | Blütenkranz, Blüten an Schultern und Brust, Blütenzweig am Rücken |
| Bastion | Bastionsschwert, Bastionspanzer | Seelensteine und Monster in den Lv-80-Instanzen | Schiefer / Stahlgrau / Türkis | Verteidigung, Schadensreduktion, Blocken, Abwehr gegen Menschen, Leben, Stark gegen Menschen | Zinnenkamm mit Sehschlitz, Zinnenplatten, zwei Türme am Rücken |
| Fluch | Fluchdorn, Fluchgewand | Turm der Verdammten | Schwarzrot / Eisengrau / Rot | Stark gegen Dämonen und Untote, Lebensraub, Gift, Schadensreduktion, Abwehr gegen Menschen | Hörner mit Kette, Kettenkreuz mit Glut, Haken und Ketten am Rücken |
| Wyrm | Wyrmspalter, Wyrmpanzer | Endboss Aelvyr (Hort des Abgrundwyrms) | Nachtviolett / Lavendel / Violett | Angriff, Krit. Schaden, Stark gegen Tiere, Abwehr gegen Magie, Angriffstempo | zurückgebogene Hörner, Schuppen, Rückenstacheln |
| Titan | Titanenbrand, Titanenpanzer | Endbosse Tarkon und Ignar | Erdbraun / Bronze / Glutorange | Leben, Stark gegen Orks und Riesen, Abwehr gegen Nahkampf, Angriff, Hauptwert | Steinhorn mit Bronzereif, Steinschultern, zwei Menhire am Rücken |

Regeln:

- **Name:** Vorsilbe der Prägung + Art des Teils („Ewigkeitsschwert“ → „Splitterschwert“), für alle Klassen und Waffenarten.
- **Woher genau:** Gegenstände, die beim Besiegen eines Gegners in die Tasche kommen (`rewardKillInner`, `rollLoot`,
  `turmBossLoot`), bekommen die Prägung der Quelle (`e80SrcOf`): Turm → Fluch, Endboss-Halle → nach Boss, Lv-80-Instanz →
  Bastion, Dungeon → Karte seines Eingangs, sonst die Karte der Zone (Kristallabgrund, Seelenhain, Nebelküste,
  Himmelsterrassen je zwei Prägungen, zufällig). Nur Ewig-Teile ohne Set; Set-Teile behalten ihr Set-Aussehen.
  Gemessen (`t3.js`): 400 Steine je Karte → 100 % der Ewig-Teile mit Prägung, beide Prägungen je Karte etwa gleich
  oft; Feuerberg (keine Lv-80-Karte) 0 %; Instanz-Wächter (Set) 0 %.
- **Schwerpunkt:** Beim Würfeln (`rollBonus`) zählen die Schwerpunkt-Boni dreifach (`E80.focusMul`), auch beim
  Switcher und beim Veredler. Beim Fund ist mindestens ein Bonus aus dem Schwerpunkt (sonst wird der letzte Bonus durch
  einen Schwerpunkt-Bonus ersetzt, Wert zweimal gewürfelt; die Zahl der Boni bleibt). Gemessen bei blauen Schuhen
  (2.000 Teile): 44 % der Boni aus dem Schwerpunkt statt 24 % ohne Prägung.
- **Aussehen:** `gearHue` färbt Stoff (80 %) und Metall (62 %) in die Farben der Prägung (Figur, Symbol, Mitspieler);
  Waffen werden beim Bauen getönt (`weapon3`). Formen in 3D über `playerConfig3` (Helm, Schultern, Brust, Rücken) und
  `weapon3` (Merkmal an Waffe, Bogen/Fächer/Glocke am Griff). Im Symbol unten rechts eine runde Plakette mit dem
  Zeichen der Prägung.
- **Balance zu den Sets:** Prägungen haben keine Set-Boni. Sets bleiben für den, der Set-Boni will; Prägungen für den,
  der freie Boni mit einem Schwerpunkt will. Werte wie jedes Ewig-Teil – kein Machtzuwachs.

## 3. Schmied ab Stufe 70

Gold je Versuch = Grundbetrag × Faktor^Plus (gerundet: unter 100.000 auf 500, unter 1 Mio. auf 5.000, darüber auf
10.000; nie weniger als bisher). Chancen, Seelensplitter, Monster-Teile (ab +4) und Ätherkerne (ab +4) bleiben.
Göttlich (Lv 60) und darunter: unverändert.

- **Ewig (Lv 80):** 20.000 Gold für +0 → +1, je Plus ×1,25.
- **Abgründig (Lv 70):** 8.000 Gold für +0 → +1, je Plus ×1,22 (Übergang).

### Ewig (Lv 80)

„Erwartet“ = Summe aus Gold ÷ Chance je Schritt, also mit Segensschriftrollen (kein Bruch, jeder Fehlschlag kostet nur
den Versuch). Ohne Rolle kann das Teil zerbrechen, dann geht es von vorn los.

| Schritt | Gold neu | Gold bisher | Chance | Summe neu (je einmal) | Erwartet mit Segensschriftrolle (Summe) | Versuche (Summe) |
|---|---:|---:|---:|---:|---:|---:|
| +0 → +1 | 20.000 | 500 | 99 % | 20.000 | 20.202 | 1 |
| +1 → +2 | 25.000 | 1.200 | 97 % | 45.000 | 45.975 | 2 |
| +2 → +3 | 31.500 | 2.500 | 94 % | 76.500 | 79.486 | 3 |
| +3 → +4 | 39.000 | 4.500 | 90 % | 115.500 | 122.819 | 4 |
| +4 → +5 | 49.000 | 7.000 | 65 % | 164.500 | 198.204 | 6 |
| +5 → +6 | 61.000 | 10.000 | 55 % | 225.500 | 309.113 | 8 |
| +6 → +7 | 76.500 | 15.000 | 45 % | 302.000 | 479.113 | 10 |
| +7 → +8 | 95.500 | 22.000 | 30 % | 397.500 | 797.446 | 13 |
| +8 → +9 | 120.000 | 30.000 | 20 % | 517.500 | 1.397.446 | 18 |
| +9 → +10 | 150.000 | 40.000 | 30 % | 667.500 | 1.897.446 | 21 |
| +10 → +11 | 185.000 | 50.000 | 28 % | 852.500 | 2.558.161 | 25 |
| +11 → +12 | 235.000 | 65.000 | 26 % | 1.087.500 | 3.462.007 | 29 |
| +12 → +13 | 290.000 | 80.000 | 24 % | 1.377.500 | 4.670.340 | 33 |
| +13 → +14 | 365.000 | 100.000 | 22 % | 1.742.500 | 6.329.431 | 38 |
| +14 → +15 | 455.000 | 125.000 | 20 % | 2.197.500 | 8.604.431 | 43 |
| +15 → +16 | 570.000 | 150.000 | 18 % | 2.767.500 | 11.771.098 | 48 |
| +16 → +17 | 710.000 | 180.000 | 16 % | 3.477.500 | 16.208.598 | 54 |
| +17 → +18 | 890.000 | 220.000 | 14 % | 4.367.500 | 22.565.740 | 62 |
| +18 → +19 | 1.110.000 | 260.000 | 12 % | 5.477.500 | 31.815.740 | 70 |
| +19 → +20 | 1.390.000 | 320.000 | 10 % | 6.867.500 | 45.715.740 | 80 |

Summe +0 → +20, jeder Schritt einmal: **6,87 Mio.** (bisher 1,68 Mio.). Erwartet mit Segensschriftrollen: **45,7 Mio.**
je Teil (bisher 11,2 Mio.), dazu etwa 80 Segensschriftrollen.

### Abgründig (Lv 70)

| Schritt | Gold neu | Gold bisher | Chance | Summe neu | Erwartet (Summe) |
|---|---:|---:|---:|---:|---:|
| +0 → +1 | 8.000 | 450 | 99 % | 8.000 | 8.081 |
| +4 → +5 | 17.500 | 6.300 | 65 % | 62.000 | 74.190 |
| +9 → +10 | 48.000 | 36.000 | 30 % | 229.500 | 636.337 |
| +14 → +15 | 130.000 | 112.500 | 20 % | 681.500 | 2.610.038 |
| +19 → +20 | 350.000 | 288.000 | 10 % | 1.906.500 | 12.271.248 |

Die Anzeige im Schmiedefenster (Kostenkachel, Knopf aktiv/grau) liest `upgradeCost` – gemessen: Ewig-Helm +4 → „49.000 Gold“.

## 4. Gold je Stunde auf Stufe 80

Gemessen im Spiel (`gold.js`, Krieger Stufe 80, echte Steine mit allen Wellen, echte Monster der Karten, ohne Bonus
„Mehr Gold“):

| Quelle | Gold |
|---|---:|
| Seelenstein Stufe 80 samt Wellen (Ø 18 Monster) | 19.234 je Stein (12 Steine) |
| Seelenstein Stufe 75 samt Wellen | 9.196 je Stein (12 Steine) |
| Seelenstein Stufe 70 samt Wellen (10 Stufen unter dir: weniger Gold) | 6.496 je Stein (9 Steine) |
| Verkauf der Ausrüstung aus einem Stein beim Händler | Ø 3.351 je Stein |
| Monster auf den Lv-80-Karten | 396–464 je Kill |
| Lv-80-Instanz: Boss / je Wächter | 62.400 + 1.300 / 11.550 |
| Turm der Verdammten: Ebenen / Wächter | 79.200 / 64.000 |
| Endboss Aelvyr | 120.000 + 2.000 |

Schätzung je Stunde (Annahmen: 20–30 Stufe-80-Steine je Stunde, also 2–3 Minuten je Stein samt Wellen und Weg;
Instanzlauf etwa 15 Minuten, jede Instanz einmal je Stunde):

| Spielweise | Gold je Stunde |
|---|---:|
| Stufe-80-Steine farmen (inkl. Verkauf) | 450.000–680.000 |
| alle Steine, wie sie kommen (Stufe 70/75/80 gemischt) | etwa 400.000 |
| Lv-80-Instanzen nacheinander (≈ 150.000 je Lauf) | 450.000–600.000 |
| Prüfungsarena (Modell aus docs/gold-beute.md) | etwa 690.000 |
| mit „Mehr Gold“ +25 % | jeweils +25 % |

**Richtwert: etwa 500.000 Gold je Stunde.**

Was das für die Ziele heißt (bei 500.000 Gold je Stunde, nur Gold gerechnet):

| Ziel | Gold | Stunden |
|---|---:|---:|
| ein Ewig-Teil auf +10 | 1,9 Mio. | ≈ 4 |
| ein Ewig-Teil auf +15 | 8,6 Mio. | ≈ 17 |
| ein Ewig-Teil auf +20 | 45,7 Mio. | ≈ 91 |
| volle Ausrüstung (8 Teile) auf +15 | 69 Mio. | ≈ 140 |
| volle Ausrüstung auf +20 | 366 Mio. | ≈ 730 |
| ein Teil voll veredelt (Stufe 5) | 7,75 Mio. | ≈ 16 |
| volle Ausrüstung voll veredelt | 62 Mio. | ≈ 124 |

Ein starkes Teil ist also ein Ziel für ein paar Abende, volle Ausrüstung auf +15 ein Ziel für Wochen, alles auf +20 und
voll veredelt ein Ziel für sehr lange. Zusätzlich bremsen Segensschriftrollen (etwa 43 für +15, 80 für +20 je Teil;
ein Stufe-80-Stein gibt zu 25 % eine) und Ätherkerne.

## 5. Der Veredler (Goldsenken)

Ein neuer NPC neben dem Schmied in **Kazehana** (Veredler Hiroshi), **Mondfall** (Veredlerin Yoru), **Lichtwacht**
(Kristallabgrund, Veredlerin Sayaka) und den Lv-80-Lagern **Seelenwacht** (Seelenhain, Veredler Tsukimi),
**Leuchtwacht** (Nebelküste, Veredlerin Nami) und **Sonnenhof** (Himmelsterrassen, Veredler Asahi). Feinschmied in
dunkelblauem Gewand mit Lederschürze und Lupe, über dem Kopf ein geschliffener Edelstein. Fenster: links die Ausrüstung
ab Stufe 60 (angelegt und Tasche), rechts das gewählte Teil mit drei Reitern. Auf schmalen Bildschirmen (unter 720 px)
stehen beide Bereiche untereinander; alle Knöpfe sind mindestens 40 px hoch.

Was es schon gab und worauf es aufbaut: Switcher (alle Boni 1–5 neu), Sternen-Switcher (6/7 neu), Verstärkungen und
Sternensteine (Boni hinzufügen), Ätherkerne (Schmied ab +4), Teilewandlerin, Glutschwinge 500.000 Gold.

### a) Bonus neu würfeln (Teile ab Stufe 60)

- Einen **gewählten** Bonus (1–7) neu: „Art und Wert neu“ oder „Nur den Wert neu“ (die Art bleibt, gut zum Ausreizen).
- Kosten: **ein Switcher** (Bonus 6/7: ein Sternen-Switcher) und Gold = 40.000 × Stufenfaktor × 1,5^n, n = bisherige
  Neuwürfe an **diesem** Teil (`item.rr`); Bonus 6/7 doppelt. Stufenfaktor: Ewig 1, Abgründig 0,4, Göttlich 0,15.

| Neuwurf am Teil | 1. | 2. | 3. | 4. | 5. | 6. | 8. | 10. | Summe 10 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Ewig | 40.000 | 60.000 | 90.000 | 135.000 | 205.000 | 305.000 | 685.000 | 1.540.000 | 4,54 Mio. |
| Abgründig | 16.000 | 24.000 | 36.000 | 54.000 | 81.000 | 120.000 | 275.000 | 615.000 | 1,81 Mio. |
| Göttlich | 6.000 | 9.000 | 13.500 | 20.500 | 30.500 | 45.500 | 105.000 | 230.000 | 0,68 Mio. |

- Gefällt der neue Bonus nicht, holt „Alten Bonus zurückholen“ ihn sofort zurück (die Kosten bleiben weg). So ist jeder
  Wurf ein Versuch ohne Risiko, aber mit steigendem Preis.
- Bei Prägungen würfelt der Schwerpunkt öfter.

### b) Veredeln (nur Ewig, Stufe 1–5)

- Jede Stufe +4 % Grundwerte (Angriff, Rüstung, Leben, Mana – wirkt wie die Seltenheit vor dem Plus, also auch auf den
  Zuwachs je Plus). Gelingt immer, nichts geht kaputt. Das Itemlevel steigt mit (gemessen: Ewig-Schwert legendär +10,
  Itemlevel 110 → 116 bei Stufe 5, also etwa +6; Angriff 455 → 547).
- Anzeige: „Veredelt ◆◆◆◇◇ (Grundwerte +12 %)“ unter der Seltenheit.

| Stufe | Gold | Ätherkerne | Seelensplitter |
|---:|---:|---:|---:|
| 1 | 250.000 | 1 | 40 |
| 2 | 500.000 | 2 | 80 |
| 3 | 1.000.000 | 3 | 120 |
| 4 | 2.000.000 | 4 | 160 |
| 5 | 4.000.000 | 5 | 240 |
| zusammen | 7.750.000 | 15 | 640 |

Zum Vergleich: Stufe 5 (+20 % Grundwerte) entspricht etwa zwei Plus-Stufen – spürbar, aber kleiner als ein Plus von
+15 auf +20. PvP-Balance: dieselbe Größenordnung wie die Seltenheit (Episch → Legendär +7 %).

### c) Färben (nur Ewig ohne Set)

- 8 Farben (Nachtschwarz, Blutrot, Smaragd, Saphir, Gold, Schneeweiß, Amethyst, Kupfer) oder „Ursprünglich“,
  **100.000 Gold** je Färbung. Nur Aussehen: Figur, Symbol (mit Vorschau im Fenster) und Mitspieler.

## 6. Speichern, Handel, Mehrspieler

- Neue Felder am Gegenstand: `v80` (Prägung), `ved` (Veredelung 1–5), `dye` (Farbe), `rr` (Zahl der Neuwürfe). Alte
  Teile ohne diese Felder bleiben unverändert (Name „Ewigkeits…“, Stufenfarben, alte Werte).
- Spielstand: die Gegenstände werden ganz gespeichert (gemessen: nach Neuwurf, Veredeln und Färben stehen
  `v80/ved/dye/rr` im Spielstand).
- Handel, Post, Auktionshaus, Konto-Lager: `itemClean` übernimmt die Felder nur gültig (bekannte Prägung/Farbe, nur Ewig
  ohne Set, `ved` 1–5).
- Mitspieler: `netPlayerState` schickt `eq[platz].v80`, `.dye`, `.ved` mit; die Figur des Mitspielers wird damit gleich
  gebaut (gemessen: gleicher Modellschlüssel `playerKey3`). Betrachten schickt die ganze Ausrüstung, Name, Prägung,
  Veredelung und Färbung erscheinen in der Detailansicht. Ältere Versionen sehen Ewig-Grundteile.

## 7. Texte und Ratgeber

- Ratgeber (`js/daten/ratgeber-wissen.js`): „Wie funktioniert der Schmied?“ ergänzt; neu „Was kostet der Schmied für
  Stufe-80-Ausrüstung?“, „Was mache ich auf Stufe 80 mit meinem Gold?“, „Was macht der Veredler?“, „Was sind
  Prägungen bei Stufe-80-Ausrüstung?“ (Zahlen werden aus den Spieldaten gelesen).
- Alle neuen deutschen Anzeigetexte stehen gesammelt in der Liste für die Übersetzung (`neue-texte-endgame.txt`).

## 8. Werte zum Nachstellen

Alles in `E80` (js/endgame80.js): `smith` (Grundbetrag, Faktor je Stufe), `reroll` (Grundbetrag, Faktor, Stufenfaktoren),
`ved` (Gold, Ätherkerne, Splitter je Stufe, Anteil je Stufe), `dye.gold`, `focusMul`, `pools` (Quellen der Prägungen);
Prägungen in `E80_FAM`, Farben in `E80_DYES`.
