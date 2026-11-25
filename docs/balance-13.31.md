# Balance-Prüfung (13.31)

> Umgesetzt in Version 13.31: Variante B (Monsterangriff linear, kleinerer Lebenszuwachs, levelBonus 0,2/0,04, Dolch 0,5, Geschick-Tempo 0,003, Lichtsturz 2,1, Windfessel 0,15), dazu Tankschlag ×5 und Schaden über Zeit mit Fertigkeitsstärke. Gegentest am echten Code: Tode gegen 1 Monster gleicher Stufe auf Stufe 50–70 von 54/108 auf 2/108; Kill-Dauer ab Stufe 50 rund 6 s statt 9–11 s; gegen 3 Monster gleichzeitig weiterhin 54/108 (ohne Tränke, ohne Ausweichen).


Stand des Codes: Commit `c39c836` (13.28). Es wurde **nichts im Repo geändert**; alle Vorschläge wurden nur im Browser per Laufzeit-Überschreibung getestet.

## Kurzfazit

1. **Bis etwa Stufe 30 passt die Balance.** Ein Monster gleicher Stufe braucht 1–4 s, keine Klasse stirbt gegen 1 Monster, und gegen 3 Monster sterben nur Stoffträger gelegentlich.
2. **Ab etwa Stufe 35 kippt es, ab 50 ist es kaputt.** Der Angriff der Monster wächst quadratisch (`monsterPower`, `extra²·0,002` und dazu ×1,4), das Leben der Spieler aber nur linear. Ein normales Monster gleicher Stufe (Angriffsfaktor 1) tötet einen Magier mit typischer Ausrüstung auf Stufe 20 in 8,4 Treffern, auf Stufe 50 in 3,1 und auf Stufe 70 in 2,0. Ein Krieger hält auf Stufe 70 noch 3,3 Treffer aus. Die Zonen-Monster haben dort meist Angriffsfaktor 1,3–1,4. In der Simulation sterben auf Stufe 70 **29 von 36** Läufen schon gegen **ein einziges** Monster gleicher Stufe (ohne Tränke), gegen 3 Monster sind es 36 von 36.
3. **Das Leben der Monster wächst ebenfalls zu stark.** Die durchschnittliche Zeit für ein Monster gleicher Stufe steigt von 2,7 s (Stufe 20) auf etwa 10 s (Stufe 50–70). Bei zähen Monstern liegen der Krieger (Leib), der Frost-Magier und der Heiler-Schamane auf Stufe 60–70 über 30 s.
4. **Seelenstein-Fall (Stufe 70 gegen Steine der Stufe 50): nur teilweise behoben.** Mit dem neuen `levelBonus` (Untergrenze 0,3) überleben Krieger, Ninja und Nekromant sicher. **Feuer-Magier und Drachen-Schamane sterben ohne Tränke weiterhin** (3 von 16 Läufen tot: Drachen-Schamane 2 von 2, Feuer-Magier 1 von 2). Mit Tränken überleben alle, Magier fallen aber auf 40–50 % Leben. Steine der eigenen Stufe sind ab Stufe 40 allein praktisch nicht zu schaffen (14–16 von 16 tot).
5. **Klassen:** Der **Ninja** macht +40 bis +80 % mehr Schaden als der Schnitt und hat dabei dank 45 % Ausweichen etwa so viel effektives Leben wie der Krieger der Klinge. Der **Heiler-Schamane** liegt bei −45 bis −50 %, der **Frost-Magier** bei −31 bis −41 % (dafür kaum zu treffen). Als Tank taugt nur der **Krieger des Leibes**: Er erreicht die Grenze für erlittenen Schaden (0,4) und hat 3- bis 4,5-mal so viel effektives Leben wie der Schnitt. Der Krieger der Klinge kommt nur auf 118–130 % des Schnitts.
6. **Bosse:** Dungeon-Bosse ab Gruftkönig (Stufe 45) schafft allein nur der Krieger des Leibes, und zwar mit 17–80 Tränken. Bei den Endbossen trifft der **Tankschlag** (×7) von Stufe 34 bis 44 härter, als der Tank Leben hat. Der Tank stirbt dann also trotz Heiler.
7. **Weitere Befunde:**
   - Schaden über Zeit (Brand, Gift, Blutung) wächst weder mit der Fertigkeitsstufe noch mit dem Fertigkeitsschaden.
   - Tränke heilen stabil 25–35 % des Lebens. Gegen den Schaden auf hohen Stufen sind sie trotzdem bedeutungslos: Ein XXL-Trank heilt 800, ein Treffer eines Gargoyles auf Stufe 70 nimmt einem Magier etwa 2.100.

Die Vorschläge 1 bis 3 unten (flachere Monsterkurve und schwächere niedrigstufige Monster) senken die Todesrate gegen 1 Monster gleicher Stufe auf Stufe 50–70 von 54 von 108 auf 0 von 108 Läufen. Bis Stufe 15 ändert sich nichts, bis Stufe 20 kaum etwas. Der Fall „Stufe 70 gegen Stein 50“ ist damit gelöst: 0 von 16 tot, im Schnitt bleiben 95 % Leben.

## Methode: was gemessen und was geschätzt ist

**Gemessen** wurde mit der echten Spiel-Engine in Playwright (headless Chromium, http://localhost:8766). Die Simulation ruft `update(1/30)` in einer Schleife auf, ohne Rendering, mit festem Zufallsgenerator, also reproduzierbar. Alle Formeln des Spiels laufen dabei unverändert: `calcDamage`, `hitMonster`, `levelBonus`/`levelPenalty`, die Monster-KI mit Ausholen und Abklingzeit, Betäubungen, Diener, Schaden über Zeit, Buffs, Klassensegen, Lebensraub, Ausweichen und Blocken.

Eine einfache Spieler-KI übernimmt das Kämpfen. Sie hält den Grundangriff gedrückt und nutzt die Fertigkeiten nach Abklingzeit, die lange zuerst. Buffs wirkt sie, wenn sie fehlen, die Heilung unter 60 % Leben. Die Tarnung kommt direkt vor dem Hinterhalt. Kanal- und Zauberzeit-Fertigkeiten (Blutsauger, Eisstrahl, Feuerball) dienen als Füller. Manatränke trinkt sie unter 30 %, Lebenstränke nur in den Läufen „mit Tränken“ (unter 50 %).

**Annahmen zur Figur** (nicht gemessen, sondern gesetzt):
- **Ausrüstung:**
  - Die höchste erlaubte Gegenstandsstufe in allen 8 Plätzen.
  - Plus nach Stufe: L<10 +1, 10–19 +3, 20–29 +4, 30–44 +5, 45–59 +6, ab 60 +7.
  - **Keine Zusatzboni.**
  - Waffen: Krieger mit Schwert und Schild, Ninja mit zwei Dolchen, Schamane mit Fächer, Nekromant mit Stab, Magier mit Zepter.
- **Werte:** Alle Statuspunkte (L−1) gehen in den Hauptwert.
- **Fertigkeiten:**
  - Punkte gleichmäßig verteilt, Angriffe zuerst, bei 15 → E1.
  - Ab Stufe 40 +1 Stufe je 3 Spielerstufen über Schriftrollen, bis höchstens E10.
  - Ab Stufe 55 H1.
- **Klassensegen** ab Stufe 10 aktiv.
- **Ultimative Attacke** nur in Bosskämpfen.

**Gegenprobe mit besserer Ausrüstung** (+9 bzw. +15 und je 3 Zufallsboni pro Teil, `results_sens.json`): Auf Stufe 70 stirbt der Feuer-Magier selbst mit +15 noch in 2 von 3 Läufen gegen **ein** Gargoyle. Mit 3 Monstern sterben Ninja, Nekromant, Heiler-Schamane und Magier mit +9 wie mit +15 alle (3 von 3). Der Hauptbefund hängt also nicht an der Annahme zur Ausrüstung.

**Geschätzt bzw. nur berechnet:** Endboss-Schaden (Formel, keine Simulation), Dauer bis zum Stufenaufstieg (Kills × (gemessene Zeit pro Kill + 4 s Laufen und Plündern)) sowie die Vorschläge 7 und 8.

**Grenzen:**
- Die KI weicht nicht aus. Sie verlässt keine roten Bodenkreise und hält keinen Abstand. Für Fernkämpfer und Bosskämpfe ist die Simulation daher **pessimistisch**: Boss-Stampfer und Meteore sind angekündigt und lassen sich ausweichen. Nahkämpfer verlieren dagegen etwas Zeit durch Rückstoß und Hinlaufen.
- Gruppenspiel, PvP und das Duell wurden nicht betrachtet.
- Die Nachtmonster sind nur in den Daten geprüft. Sie haben Angriffsfaktor 1,1–1,45, also dasselbe Muster.
- Drei Läufe pro Fall sind wenig. Einzelne Zellen schwanken, die Trends sind aber über alle 12 Wege eindeutig.

## Befunde im Detail

### 1. Monster gegen Spieler gleicher Stufe (Kernproblem)

| Stufe | Monster-Angriff (Faktor 1) | Magier: Leben / Treffer bis Tod | Krieger: Leben / Treffer bis Tod | Monster-Leben (Faktor 1) | Ø Zeit pro Kill (12 Wege, simuliert) |
|---|---|---|---|---|---|
| 10 | 40 | 453 / 17,4 | 611 / 28,1 | 491 | 1,1 s |
| 20 | 137 | 754 / 8,4 | 1.023 / 13,7 | 1.744 | 2,7 s |
| 30 | 371 | 1.357 / 6,2 | 1.780 / 10,3 | 4.973 | 3,6 s |
| 40 | 697 | 1.527 / 3,5 | 2.040 / 5,8 | 10.705 | 7,7 s |
| 50 | 1.181 | 2.155 / 3,1 | 2.814 / 5,1 | 20.245 | 10,7 s |
| 60 | 1.855 | 2.968 / 3,0 | 3.817 / 4,9 | 34.713 | 9,7 s* |
| 70 | 2.754 | 3.138 / 2,0 | 4.077 / 3,3 | 55.255 | 9,0 s* |

\* Ab Stufe 60 enden viele Kämpfe mit dem Tod des Spielers. Die Dauer ist dort also zu kurz und zu günstig gemessen.

**Ursache** in `js/daten/monster.js:189–190`. Der Angriffsfaktor steigt von 6,1 (Stufe 30) auf 19,5 (Stufe 70), also ×3,2, und das zusätzlich zum linearen Grundangriff. Spielerleben und Rüstung legen im selben Bereich nur etwa ×2,3 zu. Der lineare Grundwert `3 + 2·(L−1)` allein würde mit dem Spieler mitwachsen: Bei einem konstanten Faktor ab Stufe 30 bliebe der Magier bei etwa 6 Treffern bis zum Tod. Genauso wächst das Monsterleben: Faktor 6,45 bei Stufe 30, 28,5 bei Stufe 70.

**Todesrate über alle 12 Wege × 3 Läufe, ohne Tränke** (`results_base.json`):

| Stufe | 1 Monster | 1 zähes Monster | 3 Monster | 3 Monster mit +5 Stufen |
|---|---|---|---|---|
| 20 | 0/36 | 0/36 | 1/36 | 36/36 |
| 30 | 0/36 | 0/36 | 10/36 | 36/36 |
| 40 | 3/36 | 6/36 | 35/36 | 36/36 |
| 50 | 7/36 | 20/36 | 34/36 | 36/36 |
| 60 | 18/36 | 11/36 | 35/36 | 36/36 |
| 70 | 29/36 | 25/36 | 36/36 | 36/36 |

Drei Monster mit **+5 Stufen** sind auf **jeder** Stufe tödlich, schon ab Stufe 20. Das liegt an `levelBonus` (+35 % Monsterschaden) zusammen mit `levelPenalty` (−40 % eigener Schaden). Das ist so gewollt, aber eine Stufenlücke von 5 macht damit effektiv den 2,25-fachen Unterschied.

**Kämpfe über 30 s** (zähes Monster gleicher Stufe, mit Fertigkeiten):
- Krieger Leib: Stufe 60 27 s, Stufe 70 36 s.
- Magier Frost: Stufe 60 34 s, Stufe 70 41 s.
- Schamane Heilung: Stufe 60 35 s.

**Ein- bis Zwei-Schlag-Tode:**
- Dungeon-Bosse ab Stufe 52 töten Stoffträger in 1–2 Schlägen.
- Titanenkönig (Stufe 70): 4.681 Angriff, der Stampfer macht ×2,2.
- Endboss-Meteore (×3) töten DD und Heiler ab Ursus (Stufe 24) mit einem Treffer. Sie sind angekündigt und lassen sich ausweichen.

### 2. Seelensteine (`results_stones.json`, `results_sb.json`)

Je Fall 8 Wege × 2 Läufe. Angegeben ist die Zahl der Toten.

| Fall | ohne Tränke (heute) | mit Tränken < 50 % (heute) | ohne Tränke (Vorschlag B) | mit Tränken (Vorschlag B) |
|---|---|---|---|---|
| Stufe 30 gegen Stein 30 | 13/16 | 2/16 | 12/16 | 1/16 |
| Stufe 50 gegen Stein 50 | 16/16 | 14/16 | 14/16 | 5/16 |
| Stufe 70 gegen Stein 70 | 16/16 | 14/16 | 14/16 | 13/16 |
| **Stufe 70 gegen Stein 50** | **3/16** (Drachen-Schamane 2/2, Feuer-Magier 1/2), Ø min. Leben 60 % | 0/16, Magier bis 40 % | **0/16, Ø min. Leben 95 %** | 0/16, 96 % |
| Stufe 70 gegen Stein 60 | 14/16 | 12/16 | 7/16 | 0/16 |
| Stufe 60 gegen Stein 50 | 13/16 | 6/16 | 2/16 | 0/16 |

Der Fix in `levelBonus` (Untergrenze 0,3) **hilft, reicht für Stoffträger aber nicht**. Steine der Stufe 50 rufen in den Frostgipfeln Yetis, Mammuts und Frostgeister (Angriffsfaktor 1,3–1,4). Mit dem heutigen Angriffsfaktor 11,7 auf Stufe 50 treffen sie auch mit ×0,3 noch so hart, dass 4–6 gleichzeitige Monster einen Magier mit 3.138 Leben in wenigen Sekunden töten. Steine der eigenen Stufe sind allein (ab Stufe 40) Gruppeninhalt. Nur der Krieger des Leibes schafft sie, braucht aber 150–300 s.

### 3. Dungeon-Bosse (Spieler auf Bossstufe, mit Tränken und Ultimativer Attacke; `bosses.txt`)

| Boss (Stufe, Leben) | Allein besiegt (heute) | Vorschlag B |
|---|---|---|
| Banditenfürst (17, 22 k) | alle 8 Wege, 24–72 s | unverändert |
| Spinnenkönigin (25, 66 k) | 5 von 8 (Drachen-Schamane, Feuer- und Blitz-Magier sterben auf Stufe 25; mit Stufe 30 schaffen es alle), 42–132 s | – |
| Kriegsherr (36, 192 k) | nur Krieger Leib (Krieger Klinge 0–1 von 2) | beide Krieger, Nekro, Heiler-Schamane; Ninja und Drachen-Schamane 1 von 2; Magier nicht |
| Gruftkönig (45, 373 k) | nur Krieger Leib, mit 17 Tränken | Krieger beide, Ninja, Heiler, Nekro (1 von 2) |
| Eiskönig / Naga-Königin (52, 590–613 k) | nur Krieger Leib, mit 32–41 Tränken | Krieger Leib, Krieger Klinge (1 von 2) |
| Titanenkönig (70, 1,66 Mio.) | Krieger Leib nur knapp (1 von 4 Läufen in 400 s, sonst 14–17 % Restleben), 65–86 Tränke | nur Krieger Leib, 181 s |
| Urdrache (72, 1,81 Mio., Spieler 70) | niemand | – |

Weil die KI nicht ausweicht, sind die Werte für Fernkämpfer zu schlecht. Der Trend ist trotzdem klar: Ab Stufe 36 sind die Dungeon-Bosse für alle außer dem Leib-Krieger nicht allein zu schaffen.

### 4. Endbosse (nur berechnet, `results_raid.json`)

Schaden eines Treffers gegen einen Spieler der Bossstufe, mit aktiven Buffs:

| Boss | Tank (Leib) Leben | Tankschlag ×7 heute → Vorschlag B | Magier Leben | Meteor ×3 heute → B |
|---|---|---|---|---|
| Fenris (14) | 715 | 471 → 471 | 521 | 431 → 431 |
| Ursus (24) | 1.294 | 1.143 → 970 | 973 | 1.253 → 1.064 |
| Gorbag (34) | 1.884 | **2.202** → 1.552 | 1.425 | 2.794 → 1.969 |
| Azaroth (44) | 2.144 | **3.899** → **2.313** | 1.595 | 5.553 → 3.294 |
| Ymir (54) | 2.918 | **4.785** → 2.428 | 2.223 | 8.478 → 4.302 |
| Morrak (64) | 3.921 | **6.457** → 2.849 | 3.036 | 12.305 → 5.429 |
| Ignar (76) | 4.077 | **14.881** → **5.657** | 3.138 | 30.185 → 11.474 |

Der Tankschlag soll laut Kommentar heilbar sein („Heiler gefragt“). Heute tötet er den Tank ab Gorbag aus vollem Leben. Mit Vorschlag B und `buster: 5` (= B-Werte × 5/7) überlebt der Tank den Tankschlag bei allen Endbossen außer Tarkon (Stufe 78 gegen Spieler 70: 4.723 gegen 4.077 Leben). Ignar ist mit 4.041 sehr knapp.

### 5. Klassen und Wege

Die vollständigen Tabellen stehen im Anhang A2–A5.
- **Ninja (beide Wege), Schaden:** +40 bis +83 % über dem Schnitt.
  - Herkunft: 65–68 % des Schadens kommen aus dem Grundangriff.
  - Dolche haben eine Abklingzeit von 0,36 s mit Faktor 0,66, also 1,83 Angriffsfaktor pro Sekunde (Schwert etwa 1,35).
  - Geschick verdreifacht den Nutzen: Bonus als Hauptwert, dazu +0,5 % Angriffstempo, +0,3 % kritische Treffer und +0,25 % Ausweichen je Punkt.
  - Ergebnis auf Stufe 50: Angriffstempo 1,97, kritische Treffer am Limit von 60 %.
- **Ninja, Überleben:** Er erreicht schon ab Stufe 30 die Ausweichgrenze von 45 %. Sein effektives Leben liegt bei 85–117 % des Schnitts, fast wie beim Krieger der Klinge (118–130 %), obwohl er doppelt so viel Schaden macht.
- **Schamane Heilung:** −45 bis −50 % Schaden auf jeder Stufe. Er stirbt auf Stufe 40–70 schon gegen 1 Monster gleicher Stufe (siehe A4). Lichtsturz bringt nur 31 % seines Schadens, die restlichen 69 % kommen aus dem Grundangriff.
- **Magier Frost:** −31 bis −41 %, wird aber fast nie getroffen (Einfrieren). Als Kontrollweg vertretbar, braucht aber auf Stufe 60–70 über 30 s pro zähem Monster.
- **Krieger:** Der Weg des Leibes ist der echte Tank. Er hat das 3- bis 4,5-fache effektive Leben des Schnitts und überlebt als Einziger fast alles. Der Weg der Klinge („hält am meisten aus“) ist nur leicht über dem Schnitt und stirbt ab Stufe 40 gegen 3 Monster genauso wie die Stoffträger.
- **Nekromant der Seelen:** Auf Stufe 70 +40 %, weil die Diener mitwachsen. Sonst +7 bis +26 %, unauffällig.
- **Schaden über Zeit:**
  - Auch Brand, Gift und Blutung sind auffällig.
  - In `js/kampf.js:162–165` steht `dps: s.atk * opts.burn.dps`, ohne Fertigkeitsstufe und ohne Fertigkeitsschaden. Treffer wachsen dagegen auf Stufe 50 mit etwa Faktor 4 (Stufe × Fertigkeitsschaden 2,1).
  - Folge: „Brand“ des Feuer-Magiers liefert nur 2 % seines Schadens.

### 6. Tränke

Größe und Heilung im Verhältnis zum Leben sind stimmig. Jede neue Größe heilt beim Freischalten etwa 35 % des Magier-Lebens und fällt bis zur nächsten Größe auf etwa 25 % (Anhang A1). Das Problem ist nicht der Trank, sondern der eingehende Schaden: Mit 3 s Abklingzeit heilt ein XXL-Trank auf Stufe 70 rund 270 Leben pro Sekunde, ein Monster gleicher Stufe macht gegen einen Magier aber über 1.000 Schaden pro Sekunde. Mit Vorschlag B reichen die Tränke wieder (siehe Steintabelle, Spalte „mit Tränken“). Eine eigene Änderung an den Tränken ist nicht nötig.

### 7. Erfahrung und Dauer bis zum Stufenaufstieg (Schätzung)

Kills pro Stufe mit Monstern gleicher Stufe (EP-Faktor 1,1, ohne Startbonus): Stufe 10 80, Stufe 30 310, Stufe 50 633, Stufe 69 1.013. Die Zeit pro Kill ist der Schnitt der 12 Wege (simuliert) plus 4 s geschätztem Laufen und Plündern; Erholung nach einem Tod ist nicht eingerechnet.

| Stufe | EP bis zur nächsten Stufe | Kills | Stunden für diese Stufe heute | Summe bis hier heute | Vorschlag B | Summe B |
|---|---|---|---|---|---|---|
| 10 | 28.120 | 80 | 0,11 | 0,6 | 0,11 | 0,6 |
| 20 | 179.359 | 182 | 0,34 | 2,8 | 0,33 | 2,7 |
| 30 | 560.569 | 310 | 0,65 | 7,8 | 0,57 | 7,3 |
| 40 | 1.283.534 | 461 | 1,5 | 18,6 | 1,17 | 16,1 |
| 50 | 2.463.558 | 633 | 2,6 | 39,3 | 1,8 | 31 |
| 60 | 4.218.697 | 825 | 3,2 | 68,3 | 2,2 | 51,3 |
| 69 | 6.389.458 | 1.013 | 3,4 | **≈ 98 h** bis 70 | 2,9 | **≈ 75 h** |

Den Wert „heute“ halte ich ab Stufe 50 für deutlich zu optimistisch, weil Tode und Rückwege nicht eingerechnet sind. Vorschlag B macht das Leveln ab Stufe 40 um etwa 25–30 % schneller. Wer den Grind halten will, kann `xpToNext` ab Stufe 40 entsprechend anheben (`js/spieler.js:119`). Das sollte aber erst nach der Kurvenänderung neu vermessen werden.

## Vorschläge (nicht angewendet)

Die Zeilennummern beziehen sich auf Commit `c39c836`. Vorschläge 1–6 wurden zusammen in der Simulation getestet, als **Variante A** (milder) und **Variante B** (empfohlen). 7 und 8 sind nur berechnet bzw. begründet.

| # | Datei:Zeile | alt | neu (B, empfohlen) | (A, milder) | Warum |
|---|---|---|---|---|---|
| 1 | `js/daten/monster.js:190` (`monsterPower`, atk) | `atk: (1 + ramp * 1.4 + extra * 0.1 + extra * extra * 0.002) * (1 + 0.4 * tough)` | `atk: (1 + ramp * 1.4 + extra * 0.06) * (1 + 0.4 * tough)` | `extra * 0.08`, ohne quadratischen Teil | Kein quadratisches Wachstum mehr. Angriffsfaktor auf Stufe 70: 19,5 → 8,0 (A: 9,5), auf Stufe 50 11,7 → 6,3, auf Stufe 30 6,1 → 4,6. Bis Stufe 15 unverändert. |
| 2 | `js/daten/monster.js:189` (`monsterPower`, hp) | `… + extra * extra * 0.005) * (1 + 0.2 * tough)` | `… + extra * extra * 0.001) * (1 + 0.2 * tough)` | `0.0015` | Monsterleben auf Stufe 70 −51 % (A −45 %), Stufe 50 −38 %, Stufe 30 −17 %, Stufe 20 −3 %. Seelensteine (`STONE.hpMul`) und Bosse werden automatisch mit kleiner. |
| 3 | `js/kampf.js:59` (`levelBonus`) | `return Math.max(0.3, 1 + 0.035 * diff);` | `return Math.max(0.2, 1 + 0.04 * diff);` | gleich | Monster 20 Stufen unter dir machen nur noch 20 % statt 30 % Schaden (10 Stufen: 60 % statt 65 %). Das sichert den Seelenstein-Fall ab. |
| 4 | `js/kampf.js:517` (`KIND_BASIC.dagger`) | `mul: 0.66` | `mul: 0.5` | gleich | Der Ninja-Grundangriff ist 2,5- bis 4-mal so stark wie bei anderen Klassen. Er bringt 65–68 % des Ninja-Schadens. |
| 5 | `js/spieler.js:378` | `s.atkSpeed += (a.dex \|\| 0) * 0.005;` | `s.atkSpeed += (a.dex \|\| 0) * 0.003;` | gleich | Geschick zählt dreifach (Hauptwert, Tempo, kritische Treffer und Ausweichen). Nebenwirkung: gilt für jeden mit Geschick, also auch im PvP. |
| 6a | `js/daten/klassen.js:228` (Lichtsturz) | `dmg: 1.5` | `dmg: 2.1` | gleich | Der Heiler-Schamane hat heute −45 bis −50 % Schaden. |
| 6b | `js/daten/klassen.js:233` (Windfessel) | `vulnerable: 0.08` | `vulnerable: 0.15` | gleich | wie 6a; die Kontrolle bekommt mehr Wert |
| 7 | `js/gegner.js:220` (`RAID_MUL`) | `buster: 7` | `buster: 5` | – | *Nur berechnet.* Der Tankschlag tötet heute einen vollen Leib-Tank auf Stufe 34–76. Mit B und 5 überlebt er ihn überall außer bei Tarkon. |
| 8 | `js/kampf.js:162, 163, 165` (Gift, Brand, Blutung) | `dps: s.atk * opts.burn.dps` (je Art) | `dps: s.atk * opts.burn.dps * (s.skillDmg \|\| 1)` (je Art; für Treffer der Diener `opts.ally` weglassen) | – | *Nicht simuliert.* Schaden über Zeit wächst heute weder mit der Fertigkeitsstufe noch mit dem Fertigkeitsschaden; Brand bringt dem Feuer-Magier nur 2 %. |
| (9) | `js/daten/klassen.js:419` (Eisstrahl) | `dmg: 0.34` | `dmg: 0.4` | – | *Optional, nicht simuliert.* Der Frost-Magier braucht auf Stufe 60–70 über 30 s pro zähem Monster. Wegen seiner Kontrolle aber nur ein kleiner Schritt. |

### Gemessene Wirkung von A und B (12 Wege × 3 Läufe, ohne Tränke; `results_prop.json`, `results_prop2.json`)

Todesrate heute → A → B:

| Stufe | 1 Monster | 1 zähes Monster | 3 Monster | Ø Zeit pro Kill (1 Monster) |
|---|---|---|---|---|
| 20 | 0 → 0 → 0 | 0 → 0 → 0 | 1 → 0 → 0 | 2,7 → 2,4 → 2,5 s |
| 30 | 0 → 0 → 0 | 0 → 0 → 0 | 10 → 6 → 2 | 3,4 → 2,7 → 2,6 s |
| 40 | 3 → 0 → 0 | 6 → 2 → 3 | 35 → 19 → 14 | 7,6 → 5,5 → 5,1 s |
| 50 | 7 → 0 → 0 | 20 → 3 → 2 | 34 → 14 → 13 | 10,6 → 6,9 → 6,1 s |
| 60 | 18 → 1 → 0 | 11 → 2 → 0 | 35 → 21 → 22 | 9,7 → 6,6 → 5,7 s |
| 70 | 29 → 3 → 0 | 25 → 3 → 3 | 36 → 30 → 23 | 9,0 → 6,9 → 6,3 s |

Schaden relativ zum Schnitt aller 12 Wege (1 Ziel), heute → B:
- **Ninja Dolch:** 1,69 / 1,76 / 1,67 → **1,41 / 1,56 / 1,38** (Stufe 30 / 50 / 70).
- **Ninja Schatten:** 1,59 / 1,41 / 1,34 → 1,32 / 1,17 / 1,08.
- **Schamane Heilung:** 0,54 / 0,54 / 0,57 → **0,64 / 0,69 / 0,83**.
- Alle anderen Wege verschieben sich um höchstens ±10 Prozentpunkte, vor allem weil der Schnitt mit dem Ninja sinkt.

Der **Ninja Dolch bleibt** auch nach 4+5 **der stärkste Weg**. Wer weiter angleichen will, kann den Grundwert für kritische Treffer des Ninjas senken (`js/daten/klassen.js`, Ninja `base.crit: 0.12` → `0.08`) oder die Tarnung (`nextHitMul: 3`) prüfen. Beides habe ich nicht vermessen.

Weiterhin offen, auch mit B:
- 3 Monster gleicher Stufe bleiben ab Stufe 40 für Stoffträger ohne Ausweichen und ohne Tränke tödlich (13–23 von 36). Mit Ausweichen per Hand und Tränken dürfte das passen; die Simulation weicht nicht aus.
- Dungeon-Bosse ab Stufe 52 sind weiterhin nur für den Leib-Krieger allein machbar. Das ist vertretbar, wenn sie als Gruppeninhalt gedacht sind.
- Seelensteine der eigenen Stufe bleiben ab Stufe 50 Gruppeninhalt.

### Was ich *nicht* ändern würde
- **Bis Stufe 30:** Monsterwerte, Tränke und `xpFactor` sind stimmig.
- **Krieger des Leibes:** Er ist absichtlich der Tank. Starker Körper erreicht ab Stufe 60 die Untergrenze für erlittenen Schaden (0,4; auf Stufe 50 schon 0,42); die Wirkung von Buffstufen darüber hinaus verpufft (kosmetisch).
- **+5-Stufen-Strafe** (`levelBonus`/`levelPenalty`): Sie ist hart, aber ein klares Signal. Erst nach A/B erneut ansehen.

## Dateien

Alles liegt in `/tmp/claude-0/-home-user-claude/28e727e5-656e-544c-9afe-3c541c335198/scratchpad/balance/`:
- **Skripte:**
  - `simlib.js`: Simulation, Spieler-KI und Vorschlags-Overrides.
  - `run.js`, `analytic.js`, `stones.js`, `bosses.js`, `sens.js`, `verify.js`, `sb_verify.js`, `raid.js`, `xp.js`, `tables.js`.
- **Rohdaten:**
  - `results_classes.json`, `results_base.json`, `results_prop.json`, `results_prop2.json`.
  - `results_stones.json`, `results_sb.json`, `results_bosses.json`/`bosses.txt`.
  - `results_raid.json`, `results_sens.json`, `analytic.json`, `xp.json`.

## Anhang (heutiger Stand, simuliert)

### A1. Monster (atkMul/hpMul 1) gegen Spieler gleicher Stufe (typische Ausrüstung, ohne Buffs)

| Stufe | Monster-HP | Monster-Angriff | Mon.-Def | Krieger HP / Def | Treffer bis Tod Krieger | Magier HP / Def | Treffer bis Tod Magier | Trank (Größe, HP) | Trank in % Magier-HP |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 40 | 3 | 1 | 160 / 30 | 91.1 | 110 / 20 | 53.7 | S 95 | 86 % |
| 5 | 179 | 15 | 5 | 370 / 41 | 40.5 | 270 / 25 | 24.9 | S 95 | 35 % |
| 10 | 491 | 40 | 10 | 611 / 75 | 28.1 | 453 / 49 | 17.4 | M 180 | 40 % |
| 15 | 957 | 74 | 15 | 866 / 103 | 22.1 | 646 / 65 | 13.6 | M 180 | 28 % |
| 20 | 1.744 | 137 | 25 | 1023 / 118 | 13.7 | 754 / 75 | 8.4 | M 180 | 24 % |
| 25 | 3.016 | 233 | 38 | 1320 / 160 | 11.1 | 990 / 99 | 6.7 | L 340 | 34 % |
| 30 | 4.973 | 371 | 53 | 1780 / 222 | 10.3 | 1357 / 137 | 6.2 | L 340 | 25 % |
| 35 | 7.432 | 517 | 70 | 1910 / 230 | 7.6 | 1442 / 142 | 4.6 | L 340 | 24 % |
| 40 | 10.705 | 697 | 90 | 2040 / 238 | 5.8 | 1527 / 147 | 3.5 | XL 540 | 35 % |
| 45 | 14.930 | 917 | 113 | 2684 / 337 | 6.6 | 2070 / 206 | 4 | XL 540 | 26 % |
| 50 | 20.245 | 1.181 | 138 | 2814 / 345 | 5.1 | 2155 / 211 | 3.1 | XL 540 | 25 % |
| 55 | 26.792 | 1.492 | 165 | 2944 / 353 | 4.1 | 2240 / 216 | 2.5 | XXL 800 | 36 % |
| 60 | 34.713 | 1.855 | 195 | 3817 / 489 | 4.9 | 2968 / 306 | 3 | XXL 800 | 27 % |
| 65 | 44.153 | 2.274 | 228 | 3947 / 497 | 4 | 3053 / 310 | 2.4 | XXL 800 | 26 % |
| 70 | 55.255 | 2.754 | 263 | 4077 / 505 | 3.3 | 3138 / 315 | 2 | XXL 800 | 26 % |

### A2. Schaden pro Sekunde gegen 1 Ziel gleicher Stufe (Rotation aus Fertigkeiten + Grundangriff, 60 s, simuliert) und Abweichung vom Schnitt

| Weg | L5 | L10 | L15 | L20 | L30 | L40 | L50 | L60 | L70 |
|---|---|---|---|---|---|---|---|---|---|
| Krieger Klinge | **236 (+68 %)** | **441 (+38 %)** | 620 (+22 %) | 779 (+20 %) | 1318 (+3 %) | 1633 (−2 %) | 2422 (+1 %) | 3295 (−6 %) | 4446 (−12 %) |
| Krieger Leib | 106 (−25 %) | 304 (−5 %) | 476 (−6 %) | 598 (−8 %) | 1122 (−13 %) | 1579 (−6 %) | 2210 (−8 %) | 3110 (−12 %) | 4454 (−12 %) |
| Ninja Dolch | **226 (+61 %)** | **495 (+55 %)** | **863 (+70 %)** | **1110 (+71 %)** | **2023 (+58 %)** | **3028 (+81 %)** | **4388 (+83 %)** | **6286 (+79 %)** | **8637 (+70 %)** |
| Ninja Schatten | **221 (+57 %)** | **459 (+43 %)** | **778 (+53 %)** | **949 (+47 %)** | **2049 (+60 %)** | **2467 (+48 %)** | **3377 (+41 %)** | **5177 (+47 %)** | 6401 (+26 %) |
| Schamane Drache | 133 (−5 %) | 291 (−9 %) | 476 (−6 %) | 609 (−6 %) | 1292 (+1 %) | 1652 (−1 %) | 2518 (+5 %) | 3839 (+9 %) | 5784 (+14 %) |
| Schamane Heilung | **85 (−39 %)** | **177 (−45 %)** | **281 (−45 %)** | **347 (−46 %)** | **677 (−47 %)** | **870 (−48 %)** | **1209 (−50 %)** | **1933 (−45 %)** | **2746 (−46 %)** |
| Nekro Seelen | 150 (+7 %) | 342 (+7 %) | 598 (+17 %) | 774 (+20 %) | 1614 (+26 %) | 2030 (+21 %) | 2609 (+9 %) | 3912 (+11 %) | **7092 (+40 %)** |
| Nekro Knochen | 111 (−21 %) | 282 (−12 %) | 429 (−16 %) | 536 (−17 %) | 1134 (−12 %) | 1409 (−16 %) | 2006 (−16 %) | 3015 (−14 %) | 4082 (−20 %) |
| Magier Feuer | 99 (−30 %) | 230 (−28 %) | 358 (−30 %) | 489 (−24 %) | 996 (−22 %) | 1291 (−23 %) | 1978 (−17 %) | 2888 (−18 %) | 4419 (−13 %) |
| Magier Frost | **86 (−39 %)** | **195 (−39 %)** | **300 (−41 %)** | **385 (−41 %)** | **777 (−39 %)** | **1019 (−39 %)** | **1513 (−37 %)** | **2233 (−36 %)** | **3514 (−31 %)** |
| Magier Blitz | 126 (−10 %) | 350 (+9 %) | 510 (+0 %) | 662 (+2 %) | 1318 (+3 %) | 1738 (+4 %) | 2538 (+6 %) | 3667 (+4 %) | 5347 (+5 %) |
| Magier Erde | 108 (−24 %) | 271 (−15 %) | 417 (−18 %) | 531 (−18 %) | 1076 (−16 %) | 1350 (−19 %) | 1972 (−18 %) | 2848 (−19 %) | 4023 (−21 %) |
| *Schnitt* | 141 | 320 | 509 | 648 | 1283 | 1672 | 2395 | 3517 | 5079 |

### A3. Nur Grundangriff (DPS, 1 Ziel)

| Weg | L5 | L10 | L15 | L20 | L30 | L40 | L50 | L60 | L70 |
|---|---|---|---|---|---|---|---|---|---|
| Krieger Klinge | 80 | 172 | 232 | 293 | 509 | 603 | 868 | 1077 | 1183 |
| Krieger Leib | 81 | 161 | 229 | 295 | 512 | 645 | 891 | 1075 | 1204 |
| Ninja Dolch | 168 | 312 | 475 | 566 | 1215 | 1489 | 2330 | 3801 | 4047 |
| Ninja Schatten | 163 | 304 | 496 | 598 | 1210 | 1603 | 2189 | 3641 | 3939 |
| Schamane Drache | 59 | 98 | 159 | 181 | 343 | 425 | 556 | 723 | 773 |
| Schamane Heilung | 59 | 99 | 153 | 189 | 354 | 410 | 541 | 718 | 813 |
| Nekro Seelen | 58 | 112 | 161 | 186 | 353 | 427 | 580 | 740 | 819 |
| Nekro Knochen | 59 | 112 | 160 | 191 | 368 | 412 | 574 | 720 | 832 |
| Magier Feuer | 65 | 116 | 183 | 220 | 398 | 462 | 625 | 823 | 930 |
| Magier Frost | 60 | 116 | 175 | 210 | 397 | 473 | 615 | 950 | 957 |
| Magier Blitz | 61 | 119 | 167 | 210 | 375 | 461 | 629 | 865 | 929 |
| Magier Erde | 59 | 121 | 181 | 211 | 410 | 483 | 645 | 887 | 952 |

### A4. Kampf: 1 normales Zonen-Monster gleicher Stufe
Zelle: Kampfdauer · niedrigstes eigenes Leben (ohne Tränke). **† n/3** = in n von 3 Läufen gestorben.

| Weg | L5 | L10 | L15 | L20 | L30 | L40 | L50 | L60 | L70 |
|---|---|---|---|---|---|---|---|---|---|
| Krieger Klinge | 0.9 s · 100 % | 0.7 s · 100 % | 1.1 s · 100 % | 2.9 s · 100 % | 3.5 s · 86 % | 7.4 s · 69 % | 10.6 s · 61 % | 11.8 s · 32 % | **† 2/3** (11 s) |
| Krieger Leib | 1.3 s · 100 % | 2.4 s · 100 % | 1.9 s · 100 % | 4.3 s · 96 % | 5.1 s · 93 % | 8.2 s · 87 % | 14.3 s · 89 % | 14.4 s · 89 % | 18.4 s · 85 % |
| Ninja Dolch | 0.8 s · 100 % | 0.1 s · 100 % | 0.1 s · 100 % | 0.7 s · 100 % | 0.9 s · 100 % | 3.6 s · 79 % | 4.9 s · 74 % | **† 2/3** (5 s) | **† 2/3** (5 s) |
| Ninja Schatten | 0.2 s · 100 % | 0.3 s · 100 % | 0.3 s · 100 % | 0.8 s · 100 % | 1.3 s · 100 % | 4.0 s · 85 % | 5.8 s · 68 % | 6.7 s · 38 % | **† 3/3** (4 s) |
| Schamane Drache | 0.4 s · 100 % | 0.4 s · 100 % | 0.4 s · 100 % | 1.6 s · 100 % | 2.7 s · 100 % | 6.7 s · 68 % | 9.3 s · 22 % | **† 3/3** (9 s) | **† 3/3** (7 s) |
| Schamane Heilung | 2.0 s · 100 % | 2.5 s · 100 % | 4.2 s · 93 % | 6.2 s · 94 % | 7.9 s · 69 % | **† 1/3** (14 s) | **† 2/3** (17 s) | **† 3/3** (8 s) | **† 3/3** (9 s) |
| Nekro Seelen | 1.3 s · 100 % | 1.1 s · 100 % | 1.2 s · 100 % | 1.7 s · 100 % | 1.9 s · 94 % | 6.0 s · 44 % | 10.0 s · 30 % | **† 3/3** (7 s) | **† 3/3** (3 s) |
| Nekro Knochen | 1.0 s · 100 % | 1.1 s · 100 % | 1.2 s · 100 % | 1.9 s · 100 % | 2.1 s · 100 % | 9.3 s · 33 % | 11.1 s · 32 % | **† 2/3** (9 s) | **† 3/3** (6 s) |
| Magier Feuer | 3.7 s · 93 % | 1.0 s · 100 % | 2.0 s · 93 % | 4.4 s · 77 % | 6.1 s · 41 % | **† 3/3** (7 s) | **† 3/3** (7 s) | **† 3/3** (5 s) | **† 3/3** (3 s) |
| Magier Frost | 3.0 s · 100 % | 1.2 s · 100 % | 2.3 s · 100 % | 5.1 s · 100 % | 6.7 s · 100 % | 13.1 s · 50 % | 16.9 s · 67 % | 17.5 s · 30 % | **† 3/3** (10 s) |
| Magier Blitz | 0.3 s · 100 % | 1.0 s · 100 % | 1.3 s · 100 % | 1.5 s · 100 % | 2.0 s · 100 % | 5.6 s · 100 % | 9.7 s · 51 % | 10.4 s · 56 % | **† 1/3** (11 s) |
| Magier Erde | 0.9 s · 100 % | 1.1 s · 100 % | 1.4 s · 100 % | 1.8 s · 100 % | 2.7 s · 100 % | 8.6 s · 57 % | **† 2/3** (11 s) | **† 3/3** (13 s) | **† 3/3** (7 s) |

### A4. Kampf: 1 zähes Zonen-Monster (Bär/Oger/Golem/Titan-Typ) gleicher Stufe
Zelle: Kampfdauer · niedrigstes eigenes Leben (ohne Tränke). **† n/3** = in n von 3 Läufen gestorben.

| Weg | L5 | L10 | L15 | L20 | L30 | L40 | L50 | L60 | L70 |
|---|---|---|---|---|---|---|---|---|---|
| Krieger Klinge | 1.5 s · 98 % | 1.1 s · 100 % | 2.6 s · 100 % | 4.0 s · 94 % | 7.0 s · 84 % | 12.9 s · 59 % | 15.5 s · 21 % | 24.0 s · 50 % | **† 3/3** (27 s) |
| Krieger Leib | 2.3 s · 100 % | 3.8 s · 98 % | 4.8 s · 98 % | 7.1 s · 93 % | 9.5 s · 95 % | 17.5 s · 89 % | 19.0 s · 88 % | 27.3 s · 89 % | 35.9 s · 86 % |
| Ninja Dolch | 1.4 s · 98 % | 0.3 s · 100 % | 0.6 s · 100 % | 1.5 s · 100 % | 3.3 s · 95 % | 6.5 s · 45 % | **† 2/3** (7 s) | **† 1/3** (10 s) | **† 2/3** (10 s) |
| Ninja Schatten | 0.2 s · 100 % | 0.3 s · 100 % | 0.8 s · 100 % | 1.7 s · 100 % | 3.8 s · 94 % | 7.9 s · 34 % | 9.1 s · 38 % | **† 1/3** (16 s) | 20.9 s · 30 % |
| Schamane Drache | 0.7 s · 100 % | 0.5 s · 100 % | 1.7 s · 100 % | 3.5 s · 100 % | 6.7 s · 94 % | 12.7 s · 24 % | **† 3/3** (10 s) | **† 3/3** (18 s) | **† 3/3** (10 s) |
| Schamane Heilung | 3.1 s · 100 % | 4.0 s · 100 % | 6.2 s · 97 % | 8.4 s · 73 % | 14.4 s · 62 % | **† 2/3** (25 s) | **† 3/3** (15 s) | **† 2/3** (35 s) | **† 3/3** (22 s) |
| Nekro Seelen | 1.9 s · 100 % | 1.3 s · 100 % | 1.7 s · 100 % | 3.2 s · 83 % | 5.4 s · 73 % | 11.9 s · 51 % | **† 2/3** (11 s) | 20.0 s · 28 % | **† 2/3** (13 s) |
| Nekro Knochen | 2.0 s · 95 % | 1.3 s · 100 % | 1.9 s · 100 % | 4.9 s · 86 % | 8.9 s · 71 % | 14.9 s · 36 % | **† 1/3** (15 s) | **† 1/3** (19 s) | **† 3/3** (21 s) |
| Magier Feuer | 3.7 s · 91 % | 4.1 s · 88 % | 4.4 s · 89 % | 6.4 s · 52 % | 10.6 s · 26 % | **† 3/3** (6 s) | **† 3/3** (8 s) | **† 3/3** (7 s) | **† 3/3** (6 s) |
| Magier Frost | 4.2 s · 100 % | 2.8 s · 100 % | 5.4 s · 100 % | 8.4 s · 88 % | 13.2 s · 86 % | 20.8 s · 55 % | 23.5 s · 28 % | 34.3 s · 100 % | 41.1 s · 100 % |
| Magier Blitz | 0.6 s · 100 % | 1.3 s · 100 % | 1.7 s · 100 % | 2.6 s · 100 % | 5.3 s · 100 % | 13.1 s · 42 % | **† 2/3** (13 s) | **† 1/3** (20 s) | 27.8 s · 77 % |
| Magier Erde | 1.3 s · 100 % | 1.5 s · 100 % | 2.0 s · 100 % | 5.0 s · 85 % | 7.9 s · 94 % | 15.8 s · 37 % | **† 3/3** (10 s) | **† 3/3** (18 s) | **† 3/3** (9 s) |

### A4. Kampf: 3 normale Zonen-Monster gleicher Stufe
Zelle: Kampfdauer · niedrigstes eigenes Leben (ohne Tränke). **† n/3** = in n von 3 Läufen gestorben.

| Weg | L5 | L10 | L15 | L20 | L30 | L40 | L50 | L60 | L70 |
|---|---|---|---|---|---|---|---|---|---|
| Krieger Klinge | 1.8 s · 99 % | 1.1 s · 100 % | 1.8 s · 100 % | 5.1 s · 90 % | 7.5 s · 60 % | **† 3/3** (6 s) | **† 2/3** (13 s) | **† 3/3** (9 s) | **† 3/3** (5 s) |
| Krieger Leib | 5.0 s · 96 % | 5.3 s · 95 % | 7.1 s · 88 % | 11.7 s · 78 % | 15.0 s · 67 % | **† 1/3** (26 s) | 35.6 s · 44 % | **† 1/3** (34 s) | **† 3/3** (13 s) |
| Ninja Dolch | 3.2 s · 93 % | 1.3 s · 97 % | 2.2 s · 94 % | 5.1 s · 69 % | 7.0 s · 51 % | **† 3/3** (4 s) | **† 3/3** (5 s) | **† 3/3** (3 s) | **† 3/3** (1 s) |
| Ninja Schatten | 1.0 s · 99 % | 1.5 s · 99 % | 3.1 s · 94 % | 5.7 s · 85 % | 7.3 s · 51 % | **† 3/3** (4 s) | **† 3/3** (4 s) | **† 3/3** (3 s) | **† 3/3** (2 s) |
| Schamane Drache | 0.5 s · 100 % | 0.4 s · 100 % | 0.4 s · 100 % | 2.3 s · 100 % | 3.5 s · 100 % | **† 3/3** (6 s) | **† 3/3** (6 s) | **† 3/3** (6 s) | **† 3/3** (5 s) |
| Schamane Heilung | 4.3 s · 96 % | 5.3 s · 95 % | 8.1 s · 69 % | 15.2 s · 45 % | **† 3/3** (8 s) | **† 3/3** (6 s) | **† 3/3** (8 s) | **† 3/3** (4 s) | **† 3/3** (5 s) |
| Nekro Seelen | 3.1 s · 96 % | 1.4 s · 100 % | 1.5 s · 92 % | 3.7 s · 82 % | 4.7 s · 62 % | **† 3/3** (3 s) | **† 3/3** (3 s) | **† 3/3** (3 s) | **† 3/3** (3 s) |
| Nekro Knochen | 4.2 s · 89 % | 2.0 s · 100 % | 3.7 s · 93 % | 9.4 s · 43 % | **† 1/3** (9 s) | **† 3/3** (5 s) | **† 3/3** (5 s) | **† 3/3** (4 s) | **† 3/3** (3 s) |
| Magier Feuer | 3.7 s · 77 % | 1.9 s · 100 % | 2.9 s · 82 % | **† 1/3** (7 s) | **† 3/3** (4 s) | **† 3/3** (2 s) | **† 3/3** (3 s) | **† 3/3** (2 s) | **† 3/3** (2 s) |
| Magier Frost | 2.6 s · 100 % | 1.8 s · 100 % | 3.0 s · 100 % | 7.0 s · 100 % | 7.5 s · 69 % | **† 3/3** (9 s) | **† 3/3** (10 s) | **† 3/3** (7 s) | **† 3/3** (8 s) |
| Magier Blitz | 0.7 s · 100 % | 1.2 s · 100 % | 1.6 s · 100 % | 2.7 s · 100 % | 3.2 s · 100 % | **† 3/3** (7 s) | **† 3/3** (11 s) | **† 3/3** (6 s) | **† 3/3** (6 s) |
| Magier Erde | 0.9 s · 100 % | 1.3 s · 100 % | 1.4 s · 100 % | 2.9 s · 100 % | 6.0 s · 73 % | **† 3/3** (6 s) | **† 3/3** (6 s) | **† 3/3** (5 s) | **† 3/3** (5 s) |

### A4. Kampf: 3 normale Zonen-Monster 5 Stufen höher
Zelle: Kampfdauer · niedrigstes eigenes Leben (ohne Tränke). **† n/3** = in n von 3 Läufen gestorben.

| Weg | L5 | L10 | L15 | L20 | L30 | L40 | L50 | L60 | L70 |
|---|---|---|---|---|---|---|---|---|---|
| Krieger Klinge | 8.5 s · 25 % | 7.2 s · 57 % | 10.5 s · 28 % | **† 3/3** (10 s) | **† 3/3** (5 s) | **† 3/3** (5 s) | **† 3/3** (7 s) | **† 3/3** (6 s) | **† 3/3** (4 s) |
| Krieger Leib | **† 3/3** (14 s) | 17.7 s · 35 % | **† 3/3** (15 s) | **† 3/3** (11 s) | **† 3/3** (17 s) | **† 3/3** (9 s) | **† 3/3** (12 s) | **† 3/3** (7 s) | **† 3/3** (6 s) |
| Ninja Dolch | **† 3/3** (5 s) | 8.1 s · 18 % | **† 3/3** (6 s) | **† 3/3** (4 s) | **† 3/3** (3 s) | **† 3/3** (3 s) | **† 3/3** (2 s) | **† 3/3** (2 s) | **† 3/3** (2 s) |
| Ninja Schatten | **† 3/3** (8 s) | 9.0 s · 27 % | **† 2/3** (10 s) | **† 3/3** (7 s) | **† 3/3** (4 s) | **† 3/3** (4 s) | **† 3/3** (5 s) | **† 3/3** (3 s) | **† 3/3** (2 s) |
| Schamane Drache | **† 3/3** (5 s) | 6.7 s · 72 % | **† 1/3** (8 s) | **† 3/3** (7 s) | **† 3/3** (6 s) | **† 3/3** (5 s) | **† 3/3** (6 s) | **† 3/3** (5 s) | **† 3/3** (4 s) |
| Schamane Heilung | **† 3/3** (11 s) | **† 3/3** (11 s) | **† 3/3** (7 s) | **† 3/3** (9 s) | **† 3/3** (4 s) | **† 3/3** (4 s) | **† 3/3** (7 s) | **† 3/3** (4 s) | **† 3/3** (4 s) |
| Nekro Seelen | **† 3/3** (5 s) | 7.6 s · 11 % | **† 3/3** (4 s) | **† 3/3** (3 s) | **† 3/3** (3 s) | **† 3/3** (2 s) | **† 3/3** (3 s) | **† 3/3** (3 s) | **† 3/3** (1 s) |
| Nekro Knochen | **† 3/3** (5 s) | **† 3/3** (6 s) | **† 3/3** (5 s) | **† 3/3** (5 s) | **† 3/3** (4 s) | **† 3/3** (3 s) | **† 3/3** (4 s) | **† 3/3** (3 s) | **† 3/3** (3 s) |
| Magier Feuer | **† 3/3** (4 s) | **† 3/3** (4 s) | **† 3/3** (3 s) | **† 3/3** (3 s) | **† 3/3** (2 s) | **† 3/3** (2 s) | **† 3/3** (3 s) | **† 3/3** (2 s) | **† 3/3** (1 s) |
| Magier Frost | **† 3/3** (9 s) | 10.3 s · 30 % | **† 3/3** (8 s) | **† 3/3** (9 s) | **† 3/3** (8 s) | **† 3/3** (7 s) | **† 3/3** (12 s) | **† 3/3** (7 s) | **† 3/3** (7 s) |
| Magier Blitz | **† 3/3** (5 s) | 6.4 s · 95 % | 10.4 s · 5 % | **† 3/3** (9 s) | **† 3/3** (7 s) | **† 3/3** (6 s) | **† 3/3** (6 s) | **† 3/3** (6 s) | **† 3/3** (6 s) |
| Magier Erde | **† 3/3** (6 s) | 8.3 s · 23 % | **† 3/3** (7 s) | **† 3/3** (6 s) | **† 3/3** (5 s) | **† 3/3** (5 s) | **† 3/3** (4 s) | **† 3/3** (5 s) | **† 3/3** (4 s) |

### A4. Kampf: 1 normales Monster, nur Grundangriff
Zelle: Kampfdauer · niedrigstes eigenes Leben (ohne Tränke). **† n/3** = in n von 3 Läufen gestorben.

| Weg | L5 | L10 | L15 | L20 | L30 | L40 | L50 | L60 | L70 |
|---|---|---|---|---|---|---|---|---|---|
| Krieger Klinge | 2.3 s · 98 % | 3.6 s · 96 % | 4.3 s · 92 % | 8.6 s · 69 % | 10.3 s · 48 % | **† 3/3** (13 s) | **† 3/3** (16 s) | **† 3/3** (9 s) | **† 3/3** (8 s) |
| Krieger Leib | 2.0 s · 99 % | 3.4 s · 96 % | 4.6 s · 90 % | 8.3 s · 78 % | 10.6 s · 63 % | **† 3/3** (15 s) | **† 3/3** (17 s) | **† 3/3** (9 s) | **† 3/3** (7 s) |
| Ninja Dolch | 1.4 s · 98 % | 1.7 s · 95 % | 2.4 s · 92 % | 4.0 s · 82 % | 4.7 s · 60 % | **† 2/3** (8 s) | **† 2/3** (11 s) | **† 3/3** (6 s) | **† 3/3** (4 s) |
| Ninja Schatten | 1.5 s · 97 % | 1.9 s · 96 % | 2.5 s · 94 % | 4.2 s · 80 % | 4.7 s · 82 % | **† 1/3** (8 s) | **† 3/3** (11 s) | **† 3/3** (8 s) | **† 3/3** (5 s) |
| Schamane Drache | 2.7 s · 96 % | 4.4 s · 87 % | 6.8 s · 72 % | 11.3 s · 29 % | **† 3/3** (11 s) | **† 3/3** (6 s) | **† 3/3** (6 s) | **† 3/3** (4 s) | **† 3/3** (3 s) |
| Schamane Heilung | 3.0 s · 96 % | 4.7 s · 84 % | 6.8 s · 73 % | 11.6 s · 35 % | **† 2/3** (11 s) | **† 3/3** (8 s) | **† 3/3** (7 s) | **† 3/3** (6 s) | **† 3/3** (3 s) |
| Nekro Seelen | 3.1 s · 96 % | 4.8 s · 89 % | 6.3 s · 77 % | 12.0 s · 40 % | **† 3/3** (13 s) | **† 3/3** (7 s) | **† 3/3** (6 s) | **† 3/3** (6 s) | **† 3/3** (3 s) |
| Nekro Knochen | 3.1 s · 96 % | 4.2 s · 90 % | 6.3 s · 78 % | 12.0 s · 41 % | **† 3/3** (11 s) | **† 3/3** (9 s) | **† 3/3** (6 s) | **† 3/3** (5 s) | **† 3/3** (4 s) |
| Magier Feuer | 2.7 s · 96 % | 3.8 s · 90 % | 6.5 s · 76 % | 10.4 s · 41 % | **† 3/3** (10 s) | **† 3/3** (6 s) | **† 3/3** (9 s) | **† 3/3** (4 s) | **† 3/3** (4 s) |
| Magier Frost | 3.0 s · 96 % | 4.1 s · 90 % | 6.2 s · 74 % | 10.7 s · 43 % | **† 2/3** (10 s) | **† 3/3** (5 s) | **† 3/3** (8 s) | **† 3/3** (6 s) | **† 3/3** (4 s) |
| Magier Blitz | 2.7 s · 96 % | 3.8 s · 90 % | 6.2 s · 75 % | 9.8 s · 40 % | **† 3/3** (10 s) | **† 3/3** (6 s) | **† 3/3** (7 s) | **† 3/3** (4 s) | **† 3/3** (4 s) |
| Magier Erde | 3.0 s · 96 % | 3.8 s · 89 % | 6.5 s · 77 % | 10.1 s · 35 % | **† 2/3** (11 s) | **† 3/3** (6 s) | **† 3/3** (7 s) | **† 3/3** (5 s) | **† 3/3** (3 s) |

### A5. Überlebensfähigkeit (Buffs aktiv): effektives Leben gegen einen Angreifer gleicher Stufe
EHP = HP / ((1 − Rüstungsminderung) · Schadensfaktor · (1 − Ausweichen) · (1 − Blocken)); Schnitt = 100.

| Weg | L30 | L50 | L70 |
|---|---|---|---|
| Krieger Klinge | 5.731 (130) | 10.049 (123) | 17.061 (118) |
| Krieger Leib | 13.164 (298) | 31.605 (386) | 64.792 (449) |
| Ninja Dolch | 5.154 (117) | 8.135 (99) | 12.311 (85) |
| Ninja Schatten | 5.154 (117) | 8.135 (99) | 12.311 (85) |
| Schamane Drache | 2.834 (64) | 4.686 (57) | 7.421 (51) |
| Schamane Heilung | 3.184 (72) | 5.386 (66) | 9.894 (69) |
| Nekro Seelen | 2.930 (66) | 4.848 (59) | 7.667 (53) |
| Nekro Knochen | 2.930 (66) | 4.848 (59) | 7.667 (53) |
| Magier Feuer | 2.731 (62) | 4.508 (55) | 7.168 (50) |
| Magier Frost | 3.805 (86) | 6.934 (85) | 12.521 (87) |
| Magier Blitz | 2.731 (62) | 4.508 (55) | 7.168 (50) |
| Magier Erde | 2.731 (62) | 4.508 (55) | 7.168 (50) |
