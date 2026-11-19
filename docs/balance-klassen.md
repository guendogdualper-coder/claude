# Klassen-Balance: alle zwölf Wege im Vergleich

> **Stand:**
> - Gemessen im Arbeitsverzeichnis am 4. 11. 2026, auf der Grundlage von 13.69 (Commit `f750129`).
> - **Vorher** = 13.67/13.69 ohne Balance-Änderung. **Nachher** = mit den in diesem Bericht umgesetzten Werten (Abschnitt 5).
> - Alle Zahlen kommen aus dem Simulator `tools/balance-sim.js`, der mit dem **echten Spielcode** rechnet (Playwright, headless Chromium).
>
> **Nachtrag 13.87:** Die Leichtfüßigkeit gibt es seit 13.85 nicht mehr. An ihrer Stelle steht die Attacke Schattenkette; der Lebensraub kommt jetzt aus dem Klassensegen Klingenschatten. Was dieser Bericht über die Leichtfüßigkeit sagt, beschreibt den Stand 13.69. Seit 13.85 gibt es außerdem den Dolch-Nerf (Tarnung ×2, Hinterhalt ×1,5) und 2 s globale Abklingzeit für Schamane, Nekromant und Magier.
>
> **Nachtrag 13.76:** Beim Falken ersetzt der Pfeilregen (10 Pulse × 0,4 über 5 s, 50 % Bremse im Kreis) die Giftfalle. Neu gemessen: Falke Ø 93 (Stufe 10/30/50/70/80: 84/95/105/91/92), die übrigen Wege 94–102.
>
> **⚒ Ninja · Weg des Falken ist ausgenommen.** Er wird gerade noch einmal umgebaut: Mehrfachschuss, Giftfalle, Schattenschritt mit Ortswahl.
> - An ihm wurde nichts geändert.
> - Seine Zahlen zeigen den alten Stand, gemessen zwischen den neuen Werten der anderen Wege. Deshalb sinkt er relativ von 84 auf 75.
> - Nach dem Umbau mit `node tools/balance-sim.js --wege ninja.falke` neu messen (Abschnitt 9). Der Vorschlag aus Phase 1 für den Falken steht in Abschnitt 5.4.

## 1. Auf einen Blick

**Gesamtwertung vorher** (100 = Durchschnitt aller Wege; Ausrüstung +7, rechte Spalte +15; ▲ über 105, ▼ unter 95):

| Weg | St. 10 | St. 30 | St. 50 | St. 70 | St. 80 | **Ø +7** | Ø +15 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Krieger · Klinge | 116 ▲ | 113 ▲ | 107 ▲ | 114 ▲ | 108 ▲ | **112 ▲** | 117 ▲ |
| Krieger · Leib | 110 ▲ | 108 ▲ | 109 ▲ | 107 ▲ | 108 ▲ | **108 ▲** | 109 ▲ |
| Ninja · Dolch | 82 ▼ | 82 ▼ | 88 ▼ | 66 ▼ | 60 ▼ | **76 ▼** | 73 ▼ |
| Ninja · Falke ⚒ | 74 ▼ | 90 ▼ | 92 ▼ | 82 ▼ | 81 ▼ | **84 ▼** | 80 ▼ |
| Schamane · Drache | 93 ▼ | 92 ▼ | 95 | 97 | 99 | **95** | 95 |
| Schamane · Heilung | 100 | 106 ▲ | 111 ▲ | 123 ▲ | 123 ▲ | **113 ▲** | 115 ▲ |
| Nekromant · Seelen | 105 | 103 | 102 | 105 | 106 ▲ | **104** | 104 |
| Nekromant · Knochen | 101 | 99 | 97 | 93 ▼ | 89 ▼ | **96** | 96 |
| Magier · Feuer | 74 ▼ | 74 ▼ | 75 ▼ | 72 ▼ | 72 ▼ | **73 ▼** | 72 ▼ |
| Magier · Frost | 110 ▲ | 110 ▲ | 102 | 115 ▲ | 116 ▲ | **111 ▲** | 114 ▲ |
| Magier · Blitz | 113 ▲ | 106 ▲ | 104 | 92 ▼ | 93 ▼ | **101** | 109 ▲ |
| Magier · Erde | 98 | 92 ▼ | 93 ▼ | 79 ▼ | 78 ▼ | **88 ▼** | 82 ▼ |
| *Spanne ohne ⚒ (min–max)* | 74–116 | 74–113 | 75–111 | 66–123 | 60–123 | 73–113 | |

**Gesamtwertung nachher:**

| Weg | St. 10 | St. 30 | St. 50 | St. 70 | St. 80 | **Ø +7** | Ø +15 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Krieger · Klinge | 109 ▲ | 103 | 98 | 99 | 112 ▲ | **104** | 107 ▲ |
| Krieger · Leib | 101 | 101 | 101 | 98 | 98 | **100** | 100 |
| Ninja · Dolch | 91 ▼ | 93 ▼ | 94 ▼ | 101 | 99 | **96** | 98 |
| Ninja · Falke ⚒ | 66 ▼ | 79 ▼ | 81 ▼ | 73 ▼ | 73 ▼ | **75 ▼** | 72 ▼ |
| Schamane · Drache | 96 | 94 ▼ | 99 | 100 | 100 | **98** | 98 |
| Schamane · Heilung | 91 ▼ | 96 | 98 | 104 | 106 ▲ | **99** | 100 |
| Nekromant · Seelen | 105 | 101 | 101 | 102 | 101 | **102** | 96 |
| Nekromant · Knochen | 106 ▲ | 104 | 103 | 98 | 90 ▼ | **100** | 96 |
| Magier · Feuer | 99 | 95 | 99 | 95 | 94 ▼ | **96** | 92 ▼ |
| Magier · Frost | 100 | 100 | 94 ▼ | 104 | 113 ▲ | **102** | 106 ▲ |
| Magier · Blitz | 110 ▲ | 100 | 100 | 94 ▼ | 88 ▼ | **98** | 103 |
| Magier · Erde | 98 | 98 | 99 | 91 ▼ | 89 ▼ | **95** | 104 |
| *Spanne ohne ⚒ (min–max)* | 91–110 | 93–104 | 94–103 | 91–104 | 88–113 | 95–104 | |

**Endwerte nachher mit Ausrüstung +15** (blau, je Teil drei Boni):

| Weg | St. 10 | St. 30 | St. 50 | St. 70 | St. 80 | **Ø** |
|---|---:|---:|---:|---:|---:|---:|
| Krieger · Klinge | 115 ▲ | 113 ▲ | 105 | 108 ▲ | 94 ▼ | **107 ▲** |
| Krieger · Leib | 106 ▲ | 102 | 100 | 98 | 96 | **100** |
| Ninja · Dolch | 108 ▲ | 107 ▲ | 101 | 89 ▼ | 83 ▼ | **98** |
| Ninja · Falke ⚒ | 65 ▼ | 75 ▼ | 76 ▼ | 74 ▼ | 72 ▼ | **72 ▼** |
| Schamane · Drache | 88 ▼ | 90 ▼ | 92 ▼ | 112 ▲ | 108 ▲ | **98** |
| Schamane · Heilung | 92 ▼ | 96 | 100 | 105 | 107 ▲ | **100** |
| Nekromant · Seelen | 101 | 97 | 96 | 96 | 90 ▼ | **96** |
| Nekromant · Knochen | 107 ▲ | 102 | 100 | 86 ▼ | 85 ▼ | **96** |
| Magier · Feuer | 91 ▼ | 91 ▼ | 91 ▼ | 93 ▼ | 95 | **92 ▼** |
| Magier · Frost | 108 ▲ | 105 | 93 ▼ | 114 ▲ | 112 ▲ | **106 ▲** |
| Magier · Blitz | 119 ▲ | 108 ▲ | 93 ▼ | 96 | 102 | **103** |
| Magier · Erde | 98 | 109 ▲ | 107 ▲ | 107 ▲ | 99 | **104** |

**Ergebnis:**
- **Mittel über alle Stufen (+7):** Alle elf Wege außer dem Falken liegen bei **95–104**, vorher waren es 73–113.
  - Auf Stufe 30 und 50 bei 93–104.
  - Auf Stufe 70 bei 91–104.
- **Mit +15** liegen die Mittelwerte bei 92–107.
- **Am meisten gewonnen:**
  - Feuer: 73 → 96.
  - Dolch: 76 → 96.
  - Erde: 88 → 95.
- **Gekürzt:**
  - Heiler: 113 → 99.
  - Klinge: 112 → 104.
  - Leib: 108 → 100.
  - Frost: 111 → 102.
- Die Ausreißer, die übrig bleiben, stehen in Abschnitt 5.3.

### Die fünf größten Ausreißer vorher (und was dagegen getan wurde)

1. **Magier · Feuer (73):**
   - **Befund:** Keine einzige Betäubung oder Verlangsamung. Er starb gegen drei Monster der eigenen Stufe nach 3–5 s, weil der Feuerball ihn 3 s festhält.
   - **Jetzt:** Glutfeld betäubt je Puls kurz, Phönixflamme betäubt 1,5 s, der Feuerball stößt zurück, und Inferno gibt 30 s Glutmantel.
   - **Wirkung:** Feuer lebt 2,6-mal so lange und macht 21 % mehr Flächenschaden.
2. **Ninja · Dolch (76, auf Stufe 80 nur 60):**
   - **Befund:** Kritische Treffer (60 %), Angriffstempo (2,5) und Ausweichen (45 %) erreichen ab Stufe 50 ihre Obergrenzen. Die Leichtfüßigkeit verpufft dann. Fast die Hälfte seines Schadens kommt aus dem Grundangriff, der mit den Rängen nicht mitwächst.
   - **Jetzt:** Hinterhalt, Blitzangriff und Wirbelklinge sind deutlich stärker. Die Leichtfüßigkeit gibt zusätzlich Angriff und ein wenig Lebensraub; beides wächst über die Obergrenzen hinaus.
3. **Schamane · Heilung (113, auf Stufe 70/80 123):**
   - **Befund:** Lichtsturz brachte 43–53 % des Schadens. Der Falkengeist trieb Krit und Krit-Schaden mit Rang und Intelligenz bis etwa ×4. Dazu war der Heiler unsterblich und hatte die meiste Kontrolle.
   - **Jetzt:** Lichtsturz 2,1 → 1,8. Der Falkengeist gibt nur noch kritische Treffer.
   - **Wirkung:** Gesamt 99. Überleben und Kontrolle sind unverändert die besten.
4. **Krieger · Klinge (112) und Leib (108):**
   - **Klinge:** Sie war überall gut. Sie bekommt nur in ihrer Rolle (Fläche) etwas dazu und fällt über den Bezugswert in den Korridor.
   - **Leib:** Er war unsterblich und machte trotzdem durchschnittlichen Einzelzielschaden. Geistesschlag 3,4 → 2,5 und Felsenfaust 2,0 → 1,6. Tank-Werte unverändert.
5. **Magier · Erde (88, auf Stufe 70/80 unter 80):**
   - **Befund:** Der „Schutz“-Weg hatte keinen Schutz. Die Steinhaut hielt nur 12 s je Ulti.
   - **Jetzt:**
     - Die Steinhaut hält 60 s (also bis zur nächsten Ulti) und schützt mit −40 % statt −25 %.
     - Mehr Betäubung und Wucht.
     - Wirkung: Erde lebt doppelt so lange.

Dazu kommt ein Befund, der alle **Magier** betrifft:
- **Bisher:** Die Arkane Erleuchtung gab Intelligenz. Ab etwa Stufe 55 verpuffte sie an der Hauptwert-Grenze 120. Gemessen: +17 % Schaden auf Stufe 30, 0 % auf Stufe 70/80.
- **Jetzt:** Sie gibt **Elementschaden** (+4 %, je 10 Stufen +2 %) und wirkt auf jeder Stufe.

## 2. So wird gewertet

Jeder Weg wird in fünf Kategorien gemessen. Jede Messung ist ein eigener Kampf im echten Spielcode, mit vorher gewirkten Buffs und Dienern, Klassensegen und Ulti:

| Kategorie | Gewicht | Was gemessen wird |
|---|---:|---|
| **Einzelziel** | 25 % | Schaden pro Sekunde über 120 s gegen eine **Boss-Puppe** der eigenen Stufe: Boss-Regeln (keine Betäubung, kein Einfrieren), unendlich Leben, Rüstung wie ein normales Monster. Volle Rotation mit Abklingzeiten, Mana (Manatränke unter 30 %), Buffs und Ulti. Daneben gezeigt: Schnitt der ersten 30 s und **Burst** (Schaden/s in den ersten 5 s). |
| **Fläche** | 25 % | Schaden pro Sekunde über 60 s gegen einen Haufen aus **5** bzw. **10** Gegnern, die auf die Figur zulaufen. Wert = geometrisches Mittel aus beiden. |
| **Überleben** | 20 % | **Zeit bis zum Tod** gegen **3 unsterbliche Monster der eigenen Stufe** (Ork-Krieger, Angriff ×1,3 wie die Monster der Jagdgebiete). Die Figur kämpft mit ihrer Rotation, Heilung, Lebensraub, Diener, Betäubung und Verlangsamung zählen also mit. Lebenstränke gibt es keine. Das Leben wird nach jedem Bild auf 50 % zurückgesetzt, gemessen werden erlittener Schaden und Heilung je Sekunde (dtps und hps). **Zeit = Leben / max(dtps − hps, 10 % × dtps × min(1, dtps/hps))**. Wer mehr heilt, als er einsteckt, gilt als „≥“ praktisch unbegrenzt, und mehr Heilüberschuss zählt mehr. Diese Formel ersetzt in Phase 2 die feste Untergrenze von 10 %, an der Wege mit viel Selbstheilung hängen blieben, vor allem die Nekromanten mit +15. |
| **Kontrolle** | 15 % | Im Kampf gegen 5 Gegner: betäubte bzw. eingefrorene Sekunden je Gegner und Minute plus die Hälfte der gewichteten Verlangsamung (Anteil × Sekunden). |
| **Mobilität & Abstand** | 15 % | Halb **Mobilität** (Fußtempo mit Buffs plus Sprung- und Teleportweite je Sekunde Abklingzeit), halb **Reichweite** des Grundangriffs. Beide jeweils im Verhältnis zum Schnitt, auf 0,5–2 begrenzt. Diese Kategorie steht auch für die Sicherheit der Fernkämpfer: Die Spieler-KI weicht nicht aus und hält keinen Abstand. |

**Index:** 100 × Wert / geometrisches Mittel aller zwölf Wege.

**Punkte:** 100 + 50 × log₂(Index/100), begrenzt auf 0–150.
- Doppelt so gut wie der Schnitt gibt +50 Punkte, halb so gut −50.
- Mehr als doppelt so gut zählt nicht weiter.

**Gesamt:** gewichtetes Mittel der Punkte.
- **Zielkorridor:** 95–105.
- Wegen der Grenze bei 150 Punkten liegt der Schnitt aller Wege etwas unter 100, bei etwa 97–99.

**Stufen:** 10, 30, 50, 70 und 80.

**Ausrüstung**, je mit der Gegenstandsstufe der Spielerstufe:
- **+7:** Hauptwertung. Alles +7, Seltenheit Normal, keine Boni.
- **+15:** Alles +15, Seltenheit Selten (blau), je Teil drei Boni mit Mittelwert (Hauptwert, Leben und ein passender Wert).

Der **Farm-Lauf** steht nur als Zusatzspalte in den Detailtabellen: 90 s je 5 echte Monster der eigenen Stufe, neue Welle, sobald alle tot sind, mit Lebenstränken.

**Messrauschen:** Weil alle Werte relativ zum Durchschnitt sind, verschiebt jede Änderung an einem Weg auch die anderen leicht. Einzelne Zellen schwanken zwischen zwei Läufen um etwa ±3 Punkte, das Überleben allein um bis zu ±20 %.

## 3. Rollen: was jeder Weg können soll

| Weg | Rolle | soll glänzen in | darf schwächer sein in |
|---|---|---|---|
| Krieger · Klinge | Nahkampf-Fläche, robust | Fläche, Überleben | Mobilität, Abstand |
| Krieger · Leib | Tank, Kontrolle | Überleben, Kontrolle | Schaden, Mobilität |
| Ninja · Dolch | Assassine | Einzelziel, Burst, Mobilität | Kontrolle |
| Ninja · Falke ⚒ | Fernkampf-Einzelziel | Einzelziel, Abstand, Mobilität | Überleben |
| Schamane · Drache | Fläche aus der Distanz | Fläche, Burst | Überleben |
| Schamane · Heilung | Heilung und Schutz | Überleben, Kontrolle (in der Gruppe: Heilung) | Schaden |
| Nekromant · Seelen | Beschwörer | Einzelziel über Diener, Überleben (Diener fangen Schläge ab) | Kontrolle |
| Nekromant · Knochen | Entzug | Einzelziel, Überleben über Lebensraub | Fläche |
| Magier · Feuer | Fläche und Burst | Fläche, Einzelziel | Überleben |
| Magier · Frost | Kontrolle | Kontrolle, Überleben durch Kontrolle | Einzelziel |
| Magier · Blitz | Tempo und Ketten | Einzelziel, Kontrolle, Mobilität | Überleben |
| Magier · Erde | Schutz und Kontrolle | Kontrolle, Fläche, Überleben | Einzelziel |

**Punkte je Kategorie vorher** (Mittel über die fünf Stufen, +7):

| Weg | Einzelziel | Fläche | Überleben | Kontrolle | Mobilität & Abstand | **Gesamt** |
|---|---:|---:|---:|---:|---:|---:|
| Krieger · Klinge | 109 | 117 | 108 | 145 | 79 | **112** |
| Krieger · Leib | 101 | 82 | 149 | 150 | 69 | **108** |
| Ninja · Dolch | 114 | 96 | 36 | 17 | 88 | **76** |
| Ninja · Falke ⚒ | 116 | 80 | 24 | 70 | 130 | **84** |
| Schamane · Drache | 110 | 137 | 9 | 108 | 103 | **95** |
| Schamane · Heilung | 85 | 94 | 150 | 150 | 103 | **113** |
| Nekromant · Seelen | 114 | 89 | 146 | 60 | 102 | **104** |
| Nekromant · Knochen | 91 | 60 | 143 | 96 | 102 | **96** |
| Magier · Feuer | 106 | 125 | 0 | 0 | 104 | **73** |
| Magier · Frost | 72 | 117 | 123 | 150 | 107 | **111** |
| Magier · Blitz | 102 | 99 | 64 | 147 | 109 | **101** |
| Magier · Erde | 81 | 102 | 26 | 144 | 104 | **88** |

**Punkte je Kategorie nachher:**

| Weg | Einzelziel | Fläche | Überleben | Kontrolle | Mobilität & Abstand | **Gesamt** |
|---|---:|---:|---:|---:|---:|---:|
| Krieger · Klinge | 106 | 112 | 98 | 123 | 79 | **104** |
| Krieger · Leib | 86 | 72 | 146 | 137 | 69 | **100** |
| Ninja · Dolch | 132 | 111 | 103 | 9 | 88 | **96** |
| Ninja · Falke ⚒ | 110 | 72 | 13 | 48 | 130 | **75** |
| Schamane · Drache | 109 | 137 | 32 | 96 | 103 | **98** |
| Schamane · Heilung | 62 | 68 | 150 | 140 | 103 | **99** |
| Nekromant · Seelen | 118 | 96 | 138 | 38 | 102 | **102** |
| Nekromant · Knochen | 108 | 74 | 142 | 73 | 102 | **100** |
| Magier · Feuer | 105 | 133 | 17 | 121 | 104 | **96** |
| Magier · Frost | 66 | 108 | 101 | 150 | 107 | **102** |
| Magier · Blitz | 110 | 105 | 45 | 127 | 109 | **98** |
| Magier · Erde | 89 | 112 | 47 | 133 | 104 | **95** |

## 4. Ursachen der Ausreißer (vorher)

### 4.1 Magier · Feuer
- **Kontrolle 0:** Kein Zauber des Weges betäubte oder verlangsamte. Die Feuertornados ziehen Gegner nur heran.
- **Erlittener Schaden gegen drei Monster auf Stufe 50:** Feuer 803/s. Zum Vergleich mit gleichem Leben und gleicher Rüstung: Erde 367/s, Blitz 244/s, Frost 201/s. Der Unterschied kommt nur aus der Kontrolle.
- **Farmen:** 17 Tode in 90 s.

### 4.2 Ninja · Dolch
- **Obergrenzen:** Auf Stufe 70 sind Krit 60 % (`CRIT_CAP`), Tempo 2,5 und Ausweichen 45 % erreicht.
- **Warum Buffs sie so früh treffen:** Buffs wirken mit `buffScale` × `buffPower`, also Rang × Hauptwert, auf Stufe 70 etwa ×4. Deshalb prallten Leichtfüßigkeit und Klingenschatten an den Grenzen ab.
- **Grundangriff:** 44–53 % des Schadens kommen aus dem Grundangriff, und der wächst nicht mit den Fertigkeitsrängen.

### 4.3 Schamane · Heilung
- **Lichtsturz:** 2,1× Schaden in 100 Radius mit 1 s Betäubung alle 4 s.
- **Falkengeist:** +7 % Krit und +15 % Krit-Schaden, auf Stufe 70 etwa ×4. Das ergab 60 % Krit und ×2,41 Krit-Schaden.
- **Schutz:** Segen und Heilung hielten ihn dauerhaft voll.

### 4.4 Krieger
- **Klinge:** Kontrolle 145 (Sprungschlag 1,6 s, Schwertwirbel 0,8 s), Schild mit 24–34 % Blocken.
- **Leib:** Erlittener Schaden an der Untergrenze 40 %, dazu Blocken und Rüstung ×1,25. Trotzdem machte er durchschnittlichen Einzelzielschaden.

### 4.5 Magier · Erde
- **Kein eigener Schutz:** Nur 12 s Steinhaut je Ulti, erst ab Stufe 30.
- **Zu kurze Betäubungen:** Steinschlag 0,4 s, Erdspitzen 0,6 s.

### 4.6 Systemische Befunde
- **Arkane Erleuchtung verpufft ab Stufe ~55:** 90 eigene Punkte + 3 × 11 Hauptwert aus Waffe, Rüstung und Helm = 123, gedeckelt bei 120 (`MAIN_ATTR_CAP`). Behoben: Der Segen gibt jetzt Elementschaden.
- **Buffs × Rang × Hauptwert bis etwa ×4:** Buffs an einer Obergrenze verlieren ihren Wert (Ninja). Buffs ohne Grenze wachsen weiter, etwa Drachenkraft oder die Aura des Schwertes. Nicht systemisch geändert, nur gezielt über die Fertigkeiten ausgeglichen.
- **Krieger ohne Klassensegen:** Als einzige Klasse. Für spätere Feinarbeit offen; die Krieger liegen auch ohne Segen im Korridor.
- **Treffer-Stopp bei Krits:** `hitStop` kostet Krit-starken Wegen etwas Echtzeit. Der Simulator misst in Echtzeit, der Effekt steckt in den Zahlen.

## 5. Umgesetzte Änderungen

### 5.1 Changelog-Liste (alt → neu)

**Krieger · Weg der Klinge**
- Sichelwelle, Klingenwelle: 1,4 → 1,6× Angriff
- Schwertwirbel: 1,7 → 1,9×

**Krieger · Weg des Leibes**
- Geistesschlag: 3,4 → 2,5×
- Felsenfaust: 2,0 → 1,6×

**Ninja · Weg des Dolches**
- Hinterhalt: 2,6 → 3,7×
- Blitzangriff: 2,4 → 3,0×, Betäubung 0,8 → 1,2 s
- Wirbelklinge: 1,6 → 2,3×
- Leichtfüßigkeit: neu dazu +8 % Angriff und 0,4 % Lebensraub. Beides wächst wie jeder Buff mit Rang und Geschick (Stufe 75: etwa +19 % Angriff, 1 % Lebensraub).

**Schamane · Weg des Drachen**
- Blitzdrache: 1,7 → 2,1×
- Drachenwirbel: 0,95 → 1,05×
- Drachenkraft: neu „Drachenschuppen“, −15 % erlittener Schaden (wächst mit Rang und Intelligenz: Stufe 30 etwa −24 %, Stufe 75 etwa −32 %)
- Donnersturm: Betäubung 1,0 → 1,5 s

**Schamane · Weg der Heilung**
- Lichtsturz: 2,1 → 1,8×
- Falkengeist: kritische Treffer 7 % → 4 %, kritischer Schaden +15 % → entfällt

**Nekromant · Weg der Seelen**
- Seelenkäfig: 0,5 → 0,7× je Schrei
- Geisterflut: 0,9 → 1,15× je Geist
- Totenbeschwörung, Angriff der Diener:
  - Skelettkrieger 0,45 → 0,5
  - Knochenhund E 0,55 → 0,62
  - Knochenhund H 0,55 → 0,66
  - Seelenhund L 0,55 → 0,70
  - Seelenhund V 0,55 → 0,74

**Nekromant · beide Wege**
- Blutpakt (Klassensegen): Omni-Vampir je 10 Stufen +0,5 % → +0,8 % (Stufe 70: 5 % → 6,8 %)

**Nekromant · Weg der Knochen**
- Lebensentzug: 1,6 → 2,2×, heilt 60 % → 75 % des Schadens
- Knochenwurf: 1,9 → 3,0×
- Blutlarve: 1,6 → 2,6×
- Totenhand, Zerdrücken: 1,8 → 2,2×
- Blutlanzen: 1,25 → 2,0× je Lanze, heilen 15 % → 20 %

**Magier · alle Elemente**
- Arkane Erleuchtung (Klassensegen): Intelligenz +6 (je 10 Stufen +2) → **Elementschaden +4 % (je 10 Stufen +2 %)**. Das ergibt Stufe 30: +8 %, Stufe 50: +12 %, Stufe 70: +16 %. Buff-Hinweis und Charakterwerte zeigen „Elementschaden“.

**Magier · Weg der Flamme**
- Glutfeld: neu, jeder Puls betäubt 0,35 s
- Feuerball: neu, stößt das Ziel zurück (80); Explosion um das Ziel 60 % → 80 %
- Phönixflamme: neu, die Explosion betäubt 1,5 s
- Feuertornados: 0,3 → 0,5× je Treffer
- Inferno (Ulti): neu, danach 30 s **Glutmantel**, −35 % erlittener Schaden, mit eigenem Glutschimmer in 2D

**Magier · Weg des Frosts**
- Blizzard: 0,45 → 0,36× je Puls
- Eisgefängnis: je Rang +0,25 s → +0,15 s Einfrieren (E 1,65 / H 1,8 / L 1,95 / V 2,1 s statt 1,75 / 2 / 2,25 / 2,5 s)

**Magier · Weg des Blitzes**
- Blitzspeer: 1,5 → 1,6×
- Kettenblitz: 1,9 → 2,6×
- Gewitterwolke: Blitze 0,95 → 1,1×, Entladung 1,8 → 2,2×
- Kugelblitz: 0,55 → 0,85× je Zap

**Magier · Weg der Erde**
- Steinschlag: 1,7 → 1,9×, Betäubung 0,4 → 0,6 s
- Felsgeschoss: 3,0 → 3,8×
- Erdspitzen: 1,7 → 2,0×, Betäubung 0,6 → 1,0 s
- Bergsturz: 3,2 → 4,4×
- Schwerkraftsiegel, Einsturz: 1,6 → 2,4×
- Steinhaut (nach Weltenbruch): 12 s → 60 s, −25 % / +25 % Verteidigung → −40 % / +40 %

**Nicht geändert:**
- Ninja · Weg des Falken ⚒, samt Falkenblick-Segen und `js/fernninja.js` (Umbau läuft).
- Grundwerte der Klassen, Waffen, Rüstungen, Monster und Formeln (Obergrenzen, `calcDamage`).

### 5.2 Geänderte Dateien

| Datei | Was |
|---|---|
| `js/daten/klassen.js` | alle Fertigkeitswerte oben, neue Felder `stun` (Glutfeld, Phönixflamme) und `knockback` (Feuerball), Fertigkeitstexte |
| `js/klassensegen.js` | Arkane Erleuchtung (Elementschaden, Text), Blutpakt |
| `js/magier.js` | Inferno mit Glutmantel (`buff` und `ultBuff`), Steinhaut 60 s, −40 %/+40 %, Ulti-Texte |
| `js/magier-symbole.js` | 2D-Schimmer für den Glutmantel |
| `js/feuerfeld.js` | Glutfeld gibt `stun` an jeden Puls weiter |
| `js/magier-neu.js` | Phönixflamme gibt `stun` an die Explosion weiter |
| `js/kampf.js` | nur Kommentar (Elementschaden über `natureDmg`) |
| `js/oberflaeche.js` | drei gezielte Zeilen: „Elementschaden“ beim Magier in den Charakterwerten und im Buff-Hinweis, „Lebensraub“ im Buff-Hinweis |
| `js/sprachen/en.js` | englische Texte für die geänderten Fertigkeiten, Inferno/Glutmantel, Steinhaut-Werte und Elementschaden |
| `tools/balance-sim.js` | `VORSCHLAG` geleert; Überlebensformel bei Heilüberschuss (Abschnitt 2); Falke als ⚒ markiert |

**Tooltips:** Die Zahlen in den Fertigkeits-Tooltips kommen aus den Daten. Neue Betäubungen erscheinen dort automatisch als „Betäubt“: Glutfeld, Phönixflamme und die neuen Werte von Erde und Drache.

### 5.3 Rohwerte: Wer ist in seiner Stärke stärker geworden?

Veränderung nachher gegen vorher (Mittel aus Stufe 30, 50 und 70, +7). „Tod nach“ größer = länger am Leben:

| Weg | Einzelziel-DPS | Fläche-DPS (5) | Tod nach | Kontrolle | Farm Kills/min |
|---|---:|---:|---:|---:|---:|
| Krieger · Klinge | +3 % | +2 % | -11 % | -0 % | +4 % |
| Krieger · Leib | -13 % | -5 % | +42 % | -0 % | +1 % |
| Ninja · Dolch | +35 % | +32 % | +202 % | +16 % | +32 % |
| Ninja · Falke ⚒ | -0 % | -2 % | +6 % | 0 % | +4 % |
| Schamane · Drache | +8 % | +8 % | +118 % | +15 % | +28 % |
| Schamane · Heilung | -23 % | -23 % | -10 % | +1 % | -19 % |
| Nekromant · Seelen | +13 % | +20 % | +15 % | -0 % | +7 % |
| Nekromant · Knochen | +40 % | +34 % | +35 % | -0 % | +26 % |
| Magier · Feuer | +6 % | +21 % | +161 % | neu: 19,3 s/min | +12 % |
| Magier · Frost | -0 % | -3 % | -38 % | -2 % | -0 % |
| Magier · Blitz | +21 % | +22 % | +9 % | -0 % | +13 % |
| Magier · Erde | +20 % | +27 % | +101 % | +16 % | +22 % |

- **In der Kernkategorie zugelegt:** Dolch (+35 % Einzelziel), Knochen (+40 % Einzelziel), Blitz (+21 %), Erde (+20 % Schaden, doppelt so lange am Leben), Feuer (Kontrolle neu, 2,6-mal so lange am Leben), Drache (Überleben ×2,2), Seelen (+13 bis +20 %).
- **Gewollt gekürzt:**
  - Leib: −13 % Einzelziel. Tank und Kontrolle bleiben die besten.
  - Heiler: −23 % Schaden. Unsterblich, Kontrolle unverändert.
  - Frost: weniger Fläche und kürzeres Einfrieren auf hohen Rängen.
- **Klinge:** An ihr wurde für das Überleben nichts geändert. Ihr „Tod nach“ schwankt zwischen den Läufen.

**Was übrig bleibt:**
- **Stufe 10:**
  - Klinge und Blitz liegen bei 109/110.
  - Heiler (91) und Dolch (91) liegen darunter.
  - Ursache: Die Stärke früher Flächenfertigkeiten bzw. wenig Schaden vor dem ersten Rang. Stufe 10 ist eine kurze Phase.
- **Stufe 80:**
  - Frost liegt bei 113: Einfrieren hält mit dem L-Rang fast alles fest.
  - Klinge liegt bei 112: Aura des Schwertes mit festem Angriff auf L-Rang.
  - Blitz, Erde und Knochen liegen bei 88–90: kein Buff, der mit den Rängen wächst.
  - Nächster Hebel wäre ein Rang-Bonus für buff-lose Wege oder ein kleiner Krieger-Segen als Gegenstück.
- **+15-Ausrüstung:**
  - Feuer liegt bei 92 und auf Stufe 10–50 bei 91.
  - Dolch und Knochen liegen auf Stufe 70/80 bei 83–89.
  - Klinge 107 und Frost 106 liegen leicht darüber.
- **Falke ⚒:** Er liegt bei 75 und fällt mit dem Umbau neu an.

### 5.4 Falke ⚒: Vorschlag aus Phase 1 (nicht umgesetzt)

Gemessen am Stand von 13.67 brachte der folgende Vorschlag den Falken auf etwa 95–99 (Stufe 30/50/70: 99 / 105 / 92):
- Falkenpfeil 2,7 → 4,2×
- Pfeilhagel 0,8 → 1,5× und bremst 50 %
- Durchbohrender Schuss 2,0 → 2,8×
- Rückensprung 0,85 → 1,1× und bremst 60 %
- Schattenschritt betäubt 0,8 s
- Ulti ×1,3
- Falkenblick Krit-Schaden je 10 Stufen +7 % statt +5 %

Nach dem Umbau (Mehrfachschuss, Giftfalle, Schattenschritt mit Ortswahl) passen diese Zeilen nicht mehr eins zu eins. Der Zielwert bleibt:
- Gesamt 95–105.
- Vorn im Einzelziel und in Mobilität & Abstand.
- Fläche und Kontrolle etwa im Schnitt.
- Überleben darf niedrig sein.

Messen mit `node tools/balance-sim.js --wege ninja.falke` (alle Wege gleichzeitig messen, weil die Wertung relativ ist: einfach ohne `--wege`).

## 6. Detailtabellen vorher (+7)

Spalten: Index je Kategorie (100 = geometrisches Mittel; nicht Punkte), Gesamt in Punkten. Danach folgen die Rohwerte:
- **DPS:** Schaden pro Sekunde.
- **Tod nach:** Zeit gegen 3 Monster der eigenen Stufe.
- **Betäubt / Bremse:** Sekunden je Gegner und Minute.
- **Farm:** Kills pro Minute im 90-s-Farmlauf, in Klammern die Tode.
- **Ulti-Anteil:** Anteil der Ulti am Einzelzielschaden über 120 s.
- **Segen:** Gewinn an Einzelzielschaden durch den Klassensegen.

### Stufe 30
| Weg | Einzelziel | Fläche | Überleben | Kontrolle | Mob. | **Gesamt** | DPS Boss 120 s | DPS 30 s | Burst 5 s | Fläche 5 / 10 Ziele | Tod nach (3 Monster) | Betäubt / Bremse s/min | Farm Kills/min | Ulti-Anteil | Segen |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Krieger · Klinge | 112 | 122 | 134 | 186 | 75 | **113** | 2.784 | 2.929 | 4.530 | 8.571 / 14.472 | 35 s | 19,5 / 0,0 | 68,0 | 6 % | kein |
| Krieger · Leib | 96 | 81 | 638 | 212 | 65 | **108** | 2.374 | 2.532 | 3.123 | 6.495 / 8.407 | 168 s | 16,6 / 11,3 | 40,0 | 3 % | kein |
| Ninja · Dolch | 136 | 110 | 44 | 34 | 85 | **82** | 3.373 | 3.968 | 8.381 | 8.813 / 11.389 | 12 s | 3,6 / 0,0 | 64,7 | 11 % | +13 % |
| Ninja · Falke ⚒ | 124 | 73 | 52 | 73 | 151 | **90** | 3.069 | 3.391 | 5.690 | 5.419 / 8.290 | 14 s | 2,8 / 9,7 | 40,7 | 6 % | +15 % |
| Schamane · Drache | 107 | 153 | 27 | 112 | 104 | **92** | 2.645 | 2.782 | 5.233 | 10.223 / 18.990 | 7 s | 7,0 / 9,5 | 66,7 (3× tot) | 7 % | +9 % |
| Schamane · Heilung | 70 | 75 | 563 | 228 | 104 | **106** | 1.737 | 2.022 | 2.973 | 5.029 / 9.395 | ≥ 148 s | 16,9 / 14,0 | 36,0 | 10 % | +2 % |
| Nekromant · Seelen | 116 | 86 | 213 | 53 | 103 | **103** | 2.874 | 3.122 | 4.777 | 6.300 / 9.725 | ≥ 56 s | 0,0 / 11,2 | 57,3 | 3 % | +0 % |
| Nekromant · Knochen | 91 | 62 | 226 | 93 | 103 | **99** | 2.263 | 2.286 | 3.480 | 4.422 / 7.203 | ≥ 59 s | 8,0 / 3,5 | 33,3 | 2 % | -1 % |
| Magier · Feuer | 111 | 145 | 19 | 7 | 106 | **74** | 2.748 | 2.749 | 3.438 | 9.775 / 17.918 | 5 s | 0,0 / 0,0 | 63,3 | 2 % | +15 % |
| Magier · Frost | 70 | 127 | 128 | 313 | 111 | **110** | 1.723 | 2.165 | 3.181 | 8.915 / 15.011 | 34 s | 21,2 / 23,1 | 60,0 | 3 % | +12 % |
| Magier · Blitz | 109 | 104 | 69 | 198 | 113 | **106** | 2.709 | 2.942 | 5.515 | 7.747 / 11.699 | 18 s | 20,8 / 0,0 | 60,0 | 6 % | +10 % |
| Magier · Erde | 82 | 108 | 41 | 184 | 106 | **92** | 2.027 | 2.184 | 3.226 | 7.114 / 13.645 | 11 s | 19,3 / 0,0 | 60,0 | 3 % | +10 % |

### Stufe 50
| Weg | Einzelziel | Fläche | Überleben | Kontrolle | Mob. | **Gesamt** | DPS Boss 120 s | DPS 30 s | Burst 5 s | Fläche 5 / 10 Ziele | Tod nach (3 Monster) | Betäubt / Bremse s/min | Farm Kills/min | Ulti-Anteil | Segen |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Krieger · Klinge | 101 | 109 | 112 | 182 | 75 | **107** | 4.993 | 5.374 | 9.459 | 15.390 / 26.857 | 18 s | 19,2 / 0,0 | 50,0 | 7 % | kein |
| Krieger · Leib | 102 | 78 | 708 | 217 | 65 | **109** | 5.029 | 5.457 | 6.118 | 12.697 / 16.763 | 114 s | 16,5 / 12,7 | 26,0 | 4 % | kein |
| Ninja · Dolch | 139 | 108 | 64 | 35 | 85 | **88** | 6.866 | 7.758 | 17.109 | 17.605 / 22.938 | 10 s | 3,6 / 0,0 | 42,0 (2× tot) | 14 % | +16 % |
| Ninja · Falke ⚒ | 133 | 82 | 47 | 71 | 151 | **92** | 6.545 | 6.862 | 10.101 | 12.494 / 18.902 | 8 s | 2,8 / 9,4 | 30,0 (2× tot) | 5 % | +19 % |
| Schamane · Drache | 110 | 161 | 31 | 111 | 104 | **95** | 5.408 | 5.818 | 12.168 | 21.824 / 41.463 | 5 s | 7,0 / 9,5 | 50,7 (8× tot) | 9 % | +9 % |
| Schamane · Heilung | 78 | 89 | 420 | 228 | 104 | **111** | 3.826 | 4.127 | 7.780 | 12.252 / 22.317 | 68 s | 17,1 / 14,0 | 30,0 | 14 % | +12 % |
| Nekromant · Seelen | 111 | 83 | 219 | 55 | 103 | **102** | 5.469 | 6.000 | 9.710 | 12.367 / 19.423 | ≥ 35 s | 0,0 / 11,6 | 40,0 | 4 % | +0 % |
| Nekromant · Knochen | 87 | 59 | 253 | 93 | 103 | **97** | 4.297 | 4.525 | 7.342 | 8.552 / 13.998 | ≥ 41 s | 8,0 / 3,5 | 24,0 (4× tot) | 3 % | -2 % |
| Magier · Feuer | 113 | 146 | 21 | 7 | 106 | **75** | 5.552 | 6.013 | 8.904 | 20.170 / 36.663 | 3 s | 0,0 / 0,0 | 42,7 (14× tot) | 3 % | +12 % |
| Magier · Frost | 67 | 122 | 85 | 319 | 111 | **102** | 3.288 | 4.135 | 6.556 | 18.355 / 28.072 | 14 s | 22,6 / 22,1 | 40,0 (3× tot) | 5 % | +8 % |
| Magier · Blitz | 106 | 99 | 69 | 193 | 113 | **104** | 5.241 | 5.890 | 11.792 | 15.225 / 22.541 | 11 s | 20,3 / 0,0 | 40,0 (3× tot) | 7 % | +8 % |
| Magier · Erde | 80 | 106 | 47 | 181 | 106 | **93** | 3.970 | 4.430 | 6.739 | 14.271 / 27.337 | 8 s | 19,0 / 0,0 | 38,7 (6× tot) | 4 % | +11 % |

### Stufe 70
| Weg | Einzelziel | Fläche | Überleben | Kontrolle | Mob. | **Gesamt** | DPS Boss 120 s | DPS 30 s | Burst 5 s | Fläche 5 / 10 Ziele | Tod nach (3 Monster) | Betäubt / Bremse s/min | Farm Kills/min | Ulti-Anteil | Segen |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Krieger · Klinge | 111 | 122 | 139 | 184 | 75 | **114** | 13.084 | 13.874 | 18.300 | 42.028 / 72.581 | 58 s | 20,0 / 0,0 | 58,7 | 3 % | kein |
| Krieger · Leib | 101 | 73 | 999+ | 237 | 65 | **107** | 11.911 | 12.607 | 12.990 | 28.858 / 38.273 | ≥ 1.061 s | 16,5 / 18,6 | 20,7 | 6 % | kein |
| Ninja · Dolch | 108 | 80 | 29 | 34 | 85 | **66** | 12.729 | 13.693 | 33.734 | 32.279 / 41.357 | 12 s | 3,7 / 0,0 | 31,3 (4× tot) | 14 % | +17 % |
| Ninja · Falke ⚒ | 131 | 83 | 25 | 68 | 151 | **82** | 15.411 | 16.590 | 27.019 | 30.088 / 47.621 | 10 s | 2,6 / 9,6 | 30,0 (5× tot) | 7 % | +24 % |
| Schamane · Drache | 124 | 194 | 19 | 108 | 104 | **97** | 14.619 | 16.240 | 33.561 | 62.973 / 122.982 | 7 s | 7,0 / 9,5 | 60,0 (5× tot) | 8 % | +16 % |
| Schamane · Heilung | 103 | 126 | 755 | 239 | 104 | **123** | 12.189 | 15.119 | 21.514 | 41.502 / 78.921 | ≥ 314 s | 17,4 / 17,2 | 36,0 | 14 % | +9 % |
| Nekromant · Seelen | 132 | 89 | 172 | 58 | 103 | **105** | 15.531 | 17.043 | 25.401 | 32.860 / 49.562 | ≥ 72 s | 0,0 / 12,6 | 53,3 | 3 % | -1 % |
| Nekromant · Knochen | 84 | 53 | 182 | 90 | 103 | **93** | 9.841 | 9.996 | 17.912 | 18.929 / 31.148 | ≥ 76 s | 8,0 / 3,5 | 24,0 (4× tot) | 3 % | -2 % |
| Magier · Feuer | 106 | 135 | 19 | 7 | 106 | **72** | 12.479 | 12.826 | 16.426 | 45.521 / 82.364 | 4 s | 0,0 / 0,0 | 43,3 (13× tot) | 3 % | -1 % |
| Magier · Frost | 65 | 125 | 538 | 327 | 110 | **115** | 7.696 | 9.656 | 15.141 | 43.249 / 74.213 | 224 s | 24,9 / 21,3 | 50,0 (1× tot) | 3 % | +2 % |
| Magier · Blitz | 95 | 90 | 39 | 187 | 113 | **92** | 11.178 | 12.396 | 24.452 | 33.315 / 50.283 | 16 s | 20,3 / 0,0 | 44,7 (6× tot) | 6 % | +1 % |
| Magier · Erde | 68 | 95 | 23 | 173 | 106 | **79** | 8.029 | 8.973 | 14.054 | 30.675 / 61.015 | 9 s | 18,8 / 0,0 | 40,0 (6× tot) | 3 % | -2 % |

### Stufe 10
| Weg | Einzelziel | Fläche | Überleben | Kontrolle | Mob. | **Gesamt** | DPS Boss 120 s | DPS 30 s | Burst 5 s | Fläche 5 / 10 Ziele | Tod nach (3 Monster) | Betäubt / Bremse s/min | Farm Kills/min | Ulti-Anteil | Segen |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Krieger · Klinge | 130 | 162 | 91 | 208 | 75 | **116** | 643 | 658 | 745 | 2.352 / 3.361 | 41 s | 18,3 / 0,0 | 82,0 | 0 % | kein |
| Krieger · Leib | 102 | 91 | 184 | 230 | 65 | **110** | 505 | 550 | 588 | 1.412 / 1.761 | 83 s | 14,4 / 11,9 | 66,7 | 0 % | kein |
| Ninja · Dolch | 131 | 113 | 58 | 16 | 85 | **82** | 647 | 699 | 940 | 1.730 / 2.225 | 26 s | 1,4 / 0,0 | 90,0 | 0 % | +2 % |
| Ninja · Falke ⚒ | 108 | 58 | 34 | 55 | 150 | **74** | 537 | 521 | 460 | 850 / 1.204 | 15 s | 0,0 / 9,6 | 50,7 | 0 % | +12 % |
| Schamane · Drache | 98 | 140 | 34 | 121 | 104 | **93** | 487 | 508 | 668 | 1.797 / 3.295 | 15 s | 5,9 / 9,5 | 114,0 | 0 % | +3 % |
| Schamane · Heilung | 63 | 58 | 508 | 248 | 104 | **100** | 314 | 340 | 490 | 758 / 1.340 | ≥ 229 s | 16,2 / 11,3 | 36,7 | 0 % | +2 % |
| Nekromant · Seelen | 116 | 84 | 331 | 63 | 103 | **105** | 573 | 605 | 704 | 1.173 / 1.792 | ≥ 149 s | 0,0 / 11,1 | 75,3 | 0 % | +1 % |
| Nekromant · Knochen | 94 | 62 | 405 | 106 | 103 | **101** | 465 | 470 | 548 | 847 / 1.355 | ≥ 182 s | 8,0 / 2,8 | 43,3 | 0 % | -2 % |
| Magier · Feuer | 106 | 151 | 23 | 8 | 106 | **74** | 527 | 548 | 734 | 1.902 / 3.604 | 10 s | 0,0 / 0,0 | 96,7 | 0 % | +18 % |
| Magier · Frost | 74 | 131 | 114 | 330 | 111 | **110** | 365 | 435 | 563 | 1.680 / 3.081 | 51 s | 18,0 / 22,1 | 96,7 | 0 % | +11 % |
| Magier · Blitz | 113 | 111 | 100 | 232 | 114 | **113** | 562 | 580 | 827 | 1.582 / 2.333 | 45 s | 20,5 / 0,0 | 86,7 | 0 % | +12 % |
| Magier · Erde | 90 | 112 | 50 | 211 | 106 | **98** | 445 | 483 | 543 | 1.432 / 2.646 | 22 s | 18,6 / 0,0 | 86,7 | 0 % | +11 % |

### Stufe 80
| Weg | Einzelziel | Fläche | Überleben | Kontrolle | Mob. | **Gesamt** | DPS Boss 120 s | DPS 30 s | Burst 5 s | Fläche 5 / 10 Ziele | Tod nach (3 Monster) | Betäubt / Bremse s/min | Farm Kills/min | Ulti-Anteil | Segen |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Krieger · Klinge | 113 | 120 | 93 | 184 | 75 | **108** | 18.603 | 18.252 | 23.191 | 58.003 / 105.074 | 60 s | 20,3 / 0,0 | 58,7 | 3 % | kein |
| Krieger · Leib | 106 | 70 | 999+ | 241 | 65 | **108** | 17.506 | 18.448 | 18.331 | 39.592 / 52.438 | ≥ 2.375 s | 16,5 / 20,1 | 20,0 | 4 % | kein |
| Ninja · Dolch | 101 | 71 | 23 | 33 | 85 | **60** | 16.597 | 20.076 | 48.631 | 40.622 / 51.901 | 14 s | 3,6 / 0,0 | 27,3 (7× tot) | 15 % | +19 % |
| Ninja · Falke ⚒ | 128 | 83 | 23 | 66 | 151 | **81** | 21.145 | 20.756 | 31.586 | 41.622 / 69.955 | 12 s | 2,8 / 8,9 | 29,3 (3× tot) | 5 % | +15 % |
| Schamane · Drache | 138 | 211 | 23 | 104 | 104 | **99** | 22.653 | 24.147 | 46.578 | 100.126 / 187.388 | 7 s | 6,7 / 9,5 | 53,3 (8× tot) | 8 % | +18 % |
| Schamane · Heilung | 98 | 139 | 827 | 242 | 104 | **123** | 16.144 | 16.726 | 31.353 | 67.453 / 119.735 | ≥ 533 s | 17,3 / 18,8 | 36,7 | 11 % | -12 % |
| Nekromant · Seelen | 134 | 89 | 178 | 59 | 103 | **106** | 22.111 | 23.546 | 34.975 | 46.468 / 71.170 | ≥ 115 s | 0,0 / 13,1 | 50,0 | 3 % | -1 % |
| Nekromant · Knochen | 83 | 54 | 134 | 89 | 103 | **89** | 13.735 | 14.012 | 23.912 | 26.909 / 44.882 | ≥ 86 s | 8,1 / 3,5 | 24,0 | 3 % | +0 % |
| Magier · Feuer | 106 | 134 | 23 | 7 | 106 | **72** | 17.425 | 18.614 | 23.517 | 65.488 / 115.694 | 6 s | 0,0 / 0,0 | 43,3 (14× tot) | 2 % | +1 % |
| Magier · Frost | 65 | 132 | 490 | 336 | 110 | **116** | 10.778 | 13.496 | 21.249 | 63.625 / 114.898 | 316 s | 26,8 / 20,7 | 54,7 (1× tot) | 3 % | -1 % |
| Magier · Blitz | 91 | 87 | 46 | 186 | 113 | **93** | 15.029 | 16.605 | 35.200 | 46.236 / 69.255 | 30 s | 20,5 / 0,0 | 43,3 (6× tot) | 6 % | +1 % |
| Magier · Erde | 67 | 92 | 23 | 178 | 106 | **78** | 11.049 | 11.911 | 19.848 | 43.368 / 82.732 | 10 s | 19,6 / 0,0 | 43,3 (5× tot) | 3 % | -0 % |

### Woher der Einzelziel-Schaden kam (vorher, +7)
| Weg | Stufe 50 | Stufe 70 |
|---|---|---|
| Krieger · Klinge | Grundangriff 49 %, Sichelwelle 29 %, Schwertwirbel 10 %, Ulti 7 %, Sprungschlag 5 % | Grundangriff 47 %, Sichelwelle 33 %, Schwertwirbel 12 %, Sprungschlag 4 % |
| Krieger · Leib | Grundangriff 42 %, Geistesschlag 26 %, Felsenfaust 22 %, Erdbeben 7 %, Ulti 4 % | Grundangriff 31 %, Geistesschlag 29 %, Felsenfaust 27 %, Erdbeben 8 %, Ulti 6 % |
| Ninja · Dolch | Grundangriff 50 %, Hinterhalt 19 %, Ulti 14 %, Blitzangriff 9 %, Wirbelklinge 8 % | Grundangriff 44 %, Hinterhalt 23 %, Ulti 14 %, Blitzangriff 11 %, Wirbelklinge 8 % |
| Ninja · Falke ⚒ | Grundangriff 42 %, Falkenpfeil 29 %, Pfeilhagel 12 %, Durchbohrender Schuss 6 %, Ulti 5 %, Rückensprung 4 % | Grundangriff 33 %, Falkenpfeil 30 %, Pfeilhagel 13 %, Durchbohrender Schuss 11 %, Ulti 7 %, Rückensprung 4 % |
| Schamane · Drache | Blitzdrache 26 %, Grundangriff 21 %, Drachenwirbel 19 %, Donnersturm 10 %, Blizzard 10 %, Ulti 9 %, Schaden über Zeit 6 % | Blitzdrache 30 %, Drachenwirbel 22 %, Grundangriff 14 %, Donnersturm 12 %, Blizzard 11 %, Ulti 8 %, Schaden über Zeit 4 % |
| Schamane · Heilung | Grundangriff 45 %, Lichtsturz 41 %, Ulti 14 % | Lichtsturz 53 %, Grundangriff 33 %, Ulti 14 % |
| Nekromant · Seelen | Diener 34 %, Blutsauger 22 %, Geisterflut 20 %, Grundangriff 11 %, Seelenkäfig 8 %, Ulti 4 % | Diener 47 %, Blutsauger 20 %, Geisterflut 18 %, Seelenkäfig 7 %, Grundangriff 6 % |
| Nekromant · Knochen | Blutlanzen 26 %, Grundangriff 19 %, Knochenwurf 18 %, Lebensentzug 14 %, Blutlarve 8 %, Totenhand 8 %, Schaden über Zeit 4 % | Blutlanzen 29 %, Knochenwurf 18 %, Lebensentzug 16 %, Grundangriff 13 %, Blutlarve 10 %, Totenhand 8 % |
| Magier · Feuer | Feuerball 50 %, Schaden über Zeit 16 %, Phönixflamme 11 %, Glutfeld 11 %, Feuertornados 6 % | Feuerball 50 %, Schaden über Zeit 14 %, Phönixflamme 11 %, Feuertornados 10 %, Glutfeld 10 % |
| Magier · Frost | Eisstrahl 38 %, Grundangriff 18 %, Blizzard 15 %, Frostnova 11 %, Eisgefängnis 10 %, Ulti 5 % | Eisstrahl 40 %, Blizzard 19 %, Frostnova 14 %, Grundangriff 11 %, Eisgefängnis 10 % |
| Magier · Blitz | Kettenblitz 25 %, Grundangriff 18 %, Gewitterwolke 18 %, Blitzspeer 13 %, Blitzschritt 10 %, Kugelblitz 9 %, Ulti 7 % | Kettenblitz 28 %, Gewitterwolke 20 %, Grundangriff 12 %, Blitzspeer 12 %, Blitzschritt 11 %, Kugelblitz 10 %, Ulti 6 % |
| Magier · Erde | Felsgeschoss 26 %, Grundangriff 23 %, Steinschlag 15 %, Schwerkraftsiegel 12 %, Bergsturz 10 %, Erdspitzen 10 %, Ulti 4 % | Felsgeschoss 29 %, Steinschlag 17 %, Grundangriff 16 %, Schwerkraftsiegel 14 %, Bergsturz 11 %, Erdspitzen 9 % |

### Werte der Testfiguren (vorher, +7, mit Buffs und Segen)
| Weg | Stufe | Leben | Angriff | Rüstung | Krit | Krit-Schaden | Tempo | Fertigk.-Schaden | Ausweichen | Blocken | erl. Schaden | Lauftempo | Reichweite | Sprünge |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Krieger · Klinge | 30 | 1.896 | 379 | 244 | 13 % | ×1,80 | 1,69 | ×2,35 | 15 % | 24 % | 100 % | 145 | 54 | Sprungschlag 190/8 s |
| Krieger · Leib | 30 | 1.896 | 318 | 391 | 5 % | ×1,80 | 1,09 | ×2,45 | 15 % | 24 % | 40 % | 137 | 54 | – |
| Ninja · Dolch | 30 | 1.628 | 266 | 176 | 56 % | ×2,00 | 1,97 | ×2,57 | 45 % | 0 % | 100 % | 165 | 46 | Blitzangriff 300/8 s |
| Ninja · Falke ⚒ | 30 | 1.628 | 307 | 176 | 51 % | ×2,00 | 1,35 | ×2,47 | 45 % | 0 % | 100 % | 148 | 520 | Rückensprung 140/10 s, Schattenschritt 300/10 s |
| Schamane · Drache | 30 | 1.491 | 293 | 155 | 6 % | ×1,80 | 1,09 | ×3,28 | 15 % | 0 % | 100 % | 137 | 230 | – |
| Schamane · Heilung | 30 | 1.491 | 225 | 155 | 36 % | ×2,09 | 1,09 | ×3,10 | 15 % | 0 % | 89 % | 137 | 230 | – |
| Nekromant · Seelen | 30 | 1.525 | 231 | 158 | 5 % | ×1,80 | 1,09 | ×3,07 | 15 % | 0 % | 100 % | 135 | 230 | – |
| Nekromant · Knochen | 30 | 1.525 | 231 | 158 | 5 % | ×1,80 | 1,09 | ×3,07 | 15 % | 0 % | 100 % | 135 | 230 | – |
| Magier · Feuer | 30 | 1.457 | 235 | 151 | 6 % | ×1,80 | 1,09 | ×3,37 | 15 % | 0 % | 100 % | 135 | 240 | – |
| Magier · Frost | 30 | 1.457 | 235 | 151 | 6 % | ×1,80 | 1,09 | ×3,37 | 15 % | 0 % | 100 % | 135 | 240 | Eisschritt 160/10 s |
| Magier · Blitz | 30 | 1.457 | 235 | 151 | 6 % | ×1,80 | 1,09 | ×3,37 | 15 % | 0 % | 100 % | 135 | 240 | Blitzschritt 200/8 s |
| Magier · Erde | 30 | 1.457 | 235 | 151 | 6 % | ×1,80 | 1,09 | ×3,37 | 15 % | 0 % | 100 % | 135 | 240 | – |
| Krieger · Klinge | 70 | 5.228 | 1.194 | 656 | 21 % | ×1,80 | 2,35 | ×2,77 | 22 % | 34 % | 100 % | 147 | 54 | Sprungschlag 190/8 s |
| Krieger · Leib | 70 | 5.228 | 749 | 1.456 | 5 % | ×1,80 | 1,13 | ×2,99 | 22 % | 34 % | 40 % | 139 | 54 | – |
| Ninja · Dolch | 70 | 4.598 | 664 | 472 | 60 % | ×2,20 | 2,50 | ×3,06 | 45 % | 0 % | 100 % | 167 | 46 | Blitzangriff 300/8 s |
| Ninja · Falke ⚒ | 70 | 4.598 | 779 | 472 | 60 % | ×2,20 | 1,61 | ×2,97 | 45 % | 0 % | 100 % | 150 | 595 | Rückensprung 140/10 s, Schattenschritt 300/10 s |
| Schamane · Drache | 70 | 4.259 | 915 | 424 | 6 % | ×1,80 | 1,13 | ×4,28 | 22 % | 0 % | 100 % | 139 | 230 | – |
| Schamane · Heilung | 70 | 4.259 | 568 | 424 | 60 % | ×2,41 | 1,13 | ×3,91 | 22 % | 0 % | 73 % | 139 | 230 | – |
| Nekromant · Seelen | 70 | 4.333 | 591 | 431 | 5 % | ×1,80 | 1,13 | ×3,87 | 22 % | 0 % | 100 % | 137 | 230 | – |
| Nekromant · Knochen | 70 | 4.333 | 591 | 431 | 5 % | ×1,80 | 1,13 | ×3,87 | 22 % | 0 % | 100 % | 137 | 230 | – |
| Magier · Feuer | 70 | 4.185 | 599 | 406 | 6 % | ×1,80 | 1,13 | ×3,90 | 22 % | 0 % | 100 % | 137 | 240 | – |
| Magier · Frost | 70 | 4.185 | 599 | 406 | 6 % | ×1,80 | 1,13 | ×3,90 | 22 % | 0 % | 100 % | 137 | 240 | Eisschritt 160/10 s |
| Magier · Blitz | 70 | 4.185 | 599 | 406 | 6 % | ×1,80 | 1,13 | ×3,90 | 22 % | 0 % | 100 % | 137 | 240 | Blitzschritt 200/8 s |
| Magier · Erde | 70 | 4.185 | 599 | 406 | 6 % | ×1,80 | 1,13 | ×3,90 | 22 % | 0 % | 100 % | 137 | 240 | – |

### Gesamtwertung vorher mit +15
| Weg | St. 10 | St. 30 | St. 50 | St. 70 | St. 80 | **Ø** |
|---|---:|---:|---:|---:|---:|---:|
| Krieger · Klinge | 125 ▲ | 117 ▲ | 114 ▲ | 115 ▲ | 112 ▲ | **117 ▲** |
| Krieger · Leib | 112 ▲ | 111 ▲ | 109 ▲ | 108 ▲ | 107 ▲ | **109 ▲** |
| Ninja · Dolch | 93 ▼ | 75 ▼ | 74 ▼ | 63 ▼ | 60 ▼ | **73 ▼** |
| Ninja · Falke ⚒ | 71 ▼ | 82 ▼ | 84 ▼ | 81 ▼ | 80 ▼ | **80 ▼** |
| Schamane · Drache | 89 ▼ | 90 ▼ | 95 | 98 | 100 | **95** |
| Schamane · Heilung | 102 | 110 ▲ | 115 ▲ | 123 ▲ | 125 ▲ | **115 ▲** |
| Nekromant · Seelen | 104 | 103 | 102 | 108 ▲ | 101 | **104** |
| Nekromant · Knochen | 102 | 99 | 99 | 95 | 86 ▼ | **96** |
| Magier · Feuer | 73 ▼ | 72 ▼ | 70 ▼ | 72 ▼ | 74 ▼ | **72 ▼** |
| Magier · Frost | 115 ▲ | 114 ▲ | 112 ▲ | 114 ▲ | 117 ▲ | **114 ▲** |
| Magier · Blitz | 117 ▲ | 111 ▲ | 106 ▲ | 103 | 111 ▲ | **109 ▲** |
| Magier · Erde | 87 ▼ | 84 ▼ | 82 ▼ | 80 ▼ | 78 ▼ | **82 ▼** |

## 7. Detailtabellen nachher (+7)

### Stufe 30
| Weg | Einzelziel | Fläche | Überleben | Kontrolle | Mob. | **Gesamt** | DPS Boss 120 s | DPS 30 s | Burst 5 s | Fläche 5 / 10 Ziele | Tod nach (3 Monster) | Betäubt / Bremse s/min | Farm Kills/min | Ulti-Anteil | Segen |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Krieger · Klinge | 111 | 117 | 91 | 134 | 75 | **103** | 2.892 | 3.030 | 4.661 | 8.777 / 15.112 | 33 s | 19,2 / 0,0 | 74,0 | 6 % | kein |
| Krieger · Leib | 84 | 72 | 826 | 157 | 65 | **101** | 2.199 | 2.258 | 2.599 | 6.153 / 8.129 | 301 s | 16,7 / 11,2 | 40,7 | 5 % | kein |
| Ninja · Dolch | 164 | 130 | 71 | 29 | 85 | **93** | 4.277 | 5.073 | 9.984 | 11.203 / 14.578 | 26 s | 4,1 / 0,0 | 76,0 | 9 % | +10 % |
| Ninja · Falke ⚒ | 118 | 67 | 38 | 54 | 151 | **79** | 3.096 | 3.391 | 5.690 | 5.400 / 8.073 | 14 s | 2,8 / 9,7 | 40,7 | 6 % | +15 % |
| Schamane · Drache | 108 | 154 | 34 | 97 | 104 | **94** | 2.833 | 2.929 | 4.913 | 11.038 / 20.803 | 12 s | 9,6 / 8,4 | 90,0 | 6 % | +6 % |
| Schamane · Heilung | 56 | 57 | 439 | 172 | 104 | **96** | 1.465 | 1.659 | 2.840 | 4.157 / 7.491 | ≥ 160 s | 17,7 / 13,7 | 30,7 | 9 % | -1 % |
| Nekromant · Seelen | 122 | 95 | 172 | 39 | 103 | **101** | 3.185 | 3.480 | 5.327 | 7.498 / 11.772 | ≥ 63 s | 0,0 / 11,2 | 56,7 | 3 % | -0 % |
| Nekromant · Knochen | 118 | 75 | 235 | 68 | 103 | **104** | 3.095 | 3.071 | 4.632 | 5.801 / 9.414 | ≥ 86 s | 8,0 / 3,5 | 42,7 | 2 % | +0 % |
| Magier · Feuer | 102 | 154 | 32 | 131 | 106 | **95** | 2.655 | 2.753 | 3.992 | 11.291 / 20.461 | 12 s | 18,7 / 0,0 | 68,0 | 2 % | +6 % |
| Magier · Frost | 62 | 110 | 90 | 229 | 111 | **100** | 1.616 | 2.028 | 3.161 | 8.410 / 14.109 | 33 s | 21,0 / 23,3 | 60,0 | 3 % | +8 % |
| Magier · Blitz | 117 | 109 | 50 | 145 | 113 | **100** | 3.047 | 3.322 | 6.024 | 8.836 / 13.084 | 18 s | 20,6 / 0,0 | 64,7 | 5 % | +4 % |
| Magier · Erde | 86 | 120 | 58 | 157 | 106 | **98** | 2.261 | 2.477 | 3.631 | 8.743 / 16.102 | 21 s | 22,4 / 0,0 | 66,0 | 2 % | +5 % |

### Stufe 50
| Weg | Einzelziel | Fläche | Überleben | Kontrolle | Mob. | **Gesamt** | DPS Boss 120 s | DPS 30 s | Burst 5 s | Fläche 5 / 10 Ziele | Tod nach (3 Monster) | Betäubt / Bremse s/min | Farm Kills/min | Ulti-Anteil | Segen |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Krieger · Klinge | 98 | 104 | 84 | 133 | 75 | **98** | 5.082 | 5.521 | 9.334 | 15.748 / 28.133 | 18 s | 19,1 / 0,0 | 50,0 | 4 % | kein |
| Krieger · Leib | 84 | 70 | 999+ | 159 | 65 | **101** | 4.345 | 5.013 | 6.672 | 12.116 / 16.591 | 259 s | 16,4 / 12,7 | 26,0 | 5 % | kein |
| Ninja · Dolch | 168 | 127 | 73 | 30 | 85 | **94** | 8.726 | 9.073 | 17.490 | 22.415 / 29.240 | 16 s | 4,3 / 0,0 | 54,0 | 9 % | +12 % |
| Ninja · Falke ⚒ | 124 | 75 | 35 | 53 | 151 | **81** | 6.445 | 6.609 | 9.233 | 12.286 / 18.664 | 8 s | 2,9 / 9,3 | 33,3 (1× tot) | 5 % | +13 % |
| Schamane · Drache | 110 | 161 | 46 | 93 | 104 | **99** | 5.737 | 6.056 | 12.399 | 23.518 / 44.775 | 10 s | 9,3 / 8,2 | 54,7 (5× tot) | 8 % | +3 % |
| Schamane · Heilung | 58 | 65 | 239 | 168 | 104 | **98** | 3.024 | 3.500 | 6.441 | 9.469 / 17.994 | 52 s | 17,2 / 13,8 | 22,7 (6× tot) | 13 % | -2 % |
| Nekromant · Seelen | 117 | 92 | 191 | 40 | 103 | **101** | 6.092 | 6.660 | 10.891 | 14.841 / 23.134 | ≥ 41 s | 0,0 / 11,6 | 46,7 | 4 % | -1 % |
| Nekromant · Knochen | 115 | 71 | 243 | 68 | 103 | **103** | 5.976 | 6.347 | 10.892 | 11.418 / 18.182 | ≥ 53 s | 8,0 / 3,5 | 30,0 (3× tot) | 3 % | +0 % |
| Magier · Feuer | 107 | 157 | 38 | 136 | 106 | **99** | 5.555 | 5.982 | 8.659 | 23.214 / 43.101 | 8 s | 19,4 / 0,0 | 50,0 (4× tot) | 3 % | +7 % |
| Magier · Frost | 62 | 109 | 60 | 235 | 111 | **94** | 3.205 | 4.099 | 6.243 | 17.964 / 27.145 | 13 s | 22,6 / 22,0 | 40,0 (3× tot) | 4 % | +10 % |
| Magier · Blitz | 120 | 106 | 51 | 142 | 113 | **100** | 6.226 | 6.842 | 13.113 | 17.981 / 25.380 | 11 s | 20,3 / 0,0 | 48,7 (3× tot) | 5 % | +10 % |
| Magier · Erde | 87 | 117 | 65 | 153 | 106 | **99** | 4.521 | 4.964 | 7.763 | 16.889 / 33.217 | 14 s | 21,9 / 0,0 | 48,7 | 3 % | +9 % |

### Stufe 70
| Weg | Einzelziel | Fläche | Überleben | Kontrolle | Mob. | **Gesamt** | DPS Boss 120 s | DPS 30 s | Burst 5 s | Fläche 5 / 10 Ziele | Tod nach (3 Monster) | Betäubt / Bremse s/min | Farm Kills/min | Ulti-Anteil | Segen |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Krieger · Klinge | 103 | 110 | 79 | 138 | 75 | **99** | 13.531 | 13.751 | 20.398 | 42.304 / 76.165 | 43 s | 20,3 / 0,0 | 60,0 | 4 % | kein |
| Krieger · Leib | 75 | 61 | 999+ | 175 | 65 | **98** | 9.945 | 11.254 | 11.857 | 27.049 / 36.825 | ≥ 744 s | 16,5 / 18,6 | 20,7 | 4 % | kein |
| Ninja · Dolch | 148 | 105 | 183 | 29 | 85 | **101** | 19.472 | 22.837 | 46.987 | 46.305 / 62.656 | ≥ 99 s | 4,3 / 0,0 | 48,0 | 12 % | +16 % |
| Ninja · Falke ⚒ | 117 | 70 | 23 | 50 | 151 | **73** | 15.386 | 15.771 | 27.157 | 28.671 / 45.315 | 12 s | 2,6 / 9,7 | 30,0 (4× tot) | 6 % | +19 % |
| Schamane · Drache | 122 | 187 | 38 | 90 | 104 | **100** | 16.122 | 17.778 | 41.201 | 69.117 / 133.529 | 21 s | 9,1 / 8,3 | 86,7 | 8 % | +17 % |
| Schamane · Heilung | 63 | 79 | 514 | 177 | 104 | **104** | 8.332 | 10.812 | 19.795 | 30.016 / 54.604 | ≥ 277 s | 17,6 / 17,2 | 30,0 (1× tot) | 15 % | +1 % |
| Nekromant · Seelen | 137 | 95 | 156 | 42 | 103 | **102** | 18.039 | 19.756 | 29.606 | 39.457 / 60.878 | ≥ 84 s | 0,0 / 12,5 | 56,7 | 3 % | -1 % |
| Nekromant · Knochen | 107 | 63 | 188 | 66 | 103 | **98** | 14.130 | 14.497 | 21.567 | 25.830 / 41.119 | ≥ 101 s | 8,0 / 3,5 | 30,0 | 2 % | +3 % |
| Magier · Feuer | 115 | 161 | 23 | 135 | 106 | **95** | 15.229 | 15.983 | 18.716 | 60.776 / 112.786 | 12 s | 19,9 / 0,0 | 48,0 (6× tot) | 2 % | +13 % |
| Magier · Frost | 63 | 114 | 109 | 231 | 110 | **104** | 8.309 | 10.568 | 15.487 | 42.768 / 80.667 | 59 s | 23,3 / 21,6 | 49,3 (4× tot) | 3 % | +14 % |
| Magier · Blitz | 112 | 107 | 39 | 138 | 113 | **94** | 14.764 | 16.356 | 30.617 | 44.912 / 67.279 | 21 s | 20,3 / 0,0 | 49,3 (3× tot) | 5 % | +14 % |
| Magier · Erde | 82 | 116 | 40 | 150 | 106 | **91** | 10.856 | 12.061 | 18.416 | 43.010 / 83.445 | 22 s | 22,2 / 0,0 | 52,7 | 3 % | +14 % |

### Stufe 10
| Weg | Einzelziel | Fläche | Überleben | Kontrolle | Mob. | **Gesamt** | DPS Boss 120 s | DPS 30 s | Burst 5 s | Fläche 5 / 10 Ziele | Tod nach (3 Monster) | Betäubt / Bremse s/min | Farm Kills/min | Ulti-Anteil | Segen |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Krieger · Klinge | 129 | 158 | 72 | 149 | 75 | **109** | 669 | 682 | 780 | 2.400 / 3.529 | 39 s | 18,3 / 0,0 | 76,0 | 0 % | kein |
| Krieger · Leib | 90 | 82 | 150 | 166 | 65 | **101** | 467 | 490 | 526 | 1.341 / 1.688 | 81 s | 14,4 / 11,9 | 73,3 | 0 % | kein |
| Ninja · Dolch | 159 | 129 | 69 | 16 | 85 | **91** | 830 | 852 | 1.028 | 2.066 / 2.715 | 37 s | 1,9 / 0,0 | 93,3 | 0 % | +5 % |
| Ninja · Falke ⚒ | 104 | 55 | 29 | 39 | 150 | **66** | 542 | 521 | 460 | 848 / 1.207 | 15 s | 0,0 / 9,6 | 50,7 | 0 % | +12 % |
| Schamane · Drache | 102 | 147 | 44 | 102 | 104 | **96** | 529 | 564 | 713 | 1.986 / 3.681 | 24 s | 8,3 / 8,4 | 125,3 | 0 % | +4 % |
| Schamane · Heilung | 53 | 45 | 419 | 177 | 104 | **91** | 277 | 304 | 403 | 645 / 1.086 | ≥ 225 s | 16,1 / 11,2 | 36,7 | 0 % | +4 % |
| Nekromant · Seelen | 122 | 95 | 283 | 45 | 103 | **105** | 637 | 674 | 812 | 1.405 / 2.194 | ≥ 152 s | 0,0 / 11,1 | 96,7 | 0 % | +1 % |
| Nekromant · Knochen | 122 | 77 | 586 | 77 | 103 | **106** | 635 | 636 | 765 | 1.122 / 1.798 | ≥ 315 s | 8,0 / 2,8 | 53,3 | 0 % | +1 % |
| Magier · Feuer | 95 | 156 | 40 | 149 | 106 | **99** | 492 | 513 | 706 | 2.099 / 3.905 | 22 s | 18,3 / 0,0 | 103,3 | 0 % | +8 % |
| Magier · Frost | 63 | 107 | 92 | 233 | 111 | **100** | 331 | 404 | 497 | 1.471 / 2.618 | 49 s | 17,2 / 22,7 | 90,0 | 0 % | +5 % |
| Magier · Blitz | 118 | 110 | 90 | 165 | 114 | **110** | 617 | 631 | 925 | 1.713 / 2.397 | 48 s | 20,2 / 0,0 | 98,7 | 0 % | +2 % |
| Magier · Erde | 91 | 121 | 46 | 181 | 106 | **98** | 475 | 521 | 603 | 1.627 / 3.036 | 25 s | 22,2 / 0,0 | 96,7 | 0 % | +2 % |

### Stufe 80
| Weg | Einzelziel | Fläche | Überleben | Kontrolle | Mob. | **Gesamt** | DPS Boss 120 s | DPS 30 s | Burst 5 s | Fläche 5 / 10 Ziele | Tod nach (3 Monster) | Betäubt / Bremse s/min | Farm Kills/min | Ulti-Anteil | Segen |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Krieger · Klinge | 104 | 109 | 232 | 136 | 75 | **112** | 19.550 | 19.803 | 24.054 | 60.594 / 109.602 | 222 s | 20,3 / 0,0 | 62,7 | 3 % | kein |
| Krieger · Leib | 78 | 59 | 999+ | 177 | 65 | **98** | 14.730 | 15.903 | 17.938 | 36.962 / 52.259 | ≥ 1.681 s | 16,3 / 20,3 | 18,0 | 4 % | kein |
| Ninja · Dolch | 138 | 96 | 186 | 29 | 85 | **99** | 26.101 | 28.486 | 62.735 | 61.493 / 83.722 | ≥ 178 s | 4,3 / 0,0 | 43,3 | 13 % | +21 % |
| Ninja · Falke ⚒ | 111 | 74 | 14 | 49 | 151 | **73** | 21.007 | 20.965 | 33.239 | 43.689 / 69.776 | 10 s | 2,9 / 8,9 | 29,3 (6× tot) | 5 % | +20 % |
| Schamane · Drache | 128 | 196 | 34 | 89 | 104 | **100** | 24.107 | 26.391 | 46.441 | 105.058 / 204.073 | 33 s | 9,3 / 8,2 | 96,7 | 7 % | +20 % |
| Schamane · Heilung | 67 | 84 | 617 | 178 | 104 | **106** | 12.562 | 11.980 | 21.680 | 45.197 / 86.815 | ≥ 591 s | 17,1 / 18,8 | 26,7 | 14 % | -7 % |
| Nekromant · Seelen | 143 | 94 | 138 | 43 | 103 | **101** | 26.922 | 28.978 | 41.903 | 56.753 / 86.559 | ≥ 132 s | 0,0 / 13,0 | 56,7 | 2 % | +0 % |
| Nekromant · Knochen | 101 | 61 | 125 | 66 | 103 | **90** | 19.026 | 19.658 | 31.717 | 36.503 / 57.523 | ≥ 120 s | 8,0 / 3,5 | 30,0 (1× tot) | 3 % | -2 % |
| Magier · Feuer | 116 | 160 | 15 | 123 | 106 | **94** | 21.960 | 23.176 | 35.382 | 85.571 / 166.979 | 14 s | 18,4 / 0,0 | 56,7 (3× tot) | 2 % | +15 % |
| Magier · Frost | 63 | 122 | 194 | 244 | 110 | **113** | 11.869 | 15.086 | 22.543 | 71.350 / 116.614 | 186 s | 26,0 / 21,0 | 53,3 (1× tot) | 3 % | +15 % |
| Magier · Blitz | 112 | 105 | 25 | 139 | 113 | **88** | 21.137 | 22.470 | 42.871 | 64.708 / 95.813 | 24 s | 20,7 / 0,0 | 52,7 (1× tot) | 4 % | +16 % |
| Magier · Erde | 81 | 115 | 37 | 152 | 106 | **89** | 15.254 | 16.127 | 25.584 | 61.454 / 120.136 | 35 s | 22,7 / 0,0 | 53,3 | 2 % | +16 % |

## 8. Methode, Annahmen, Grenzen

**Echter Spielcode:**
- Der Simulator lädt das Spiel (2D-Ansicht) und baut je Weg, Stufe und Ausrüstung eine Figur mit `newCharacter`/`startGame`.
- Danach läuft die Zeit mit `update(1/30)` ohne Bild.
- Treffer, Krits, Rüstung, Stufenunterschied, Buffs (`applyBuff`, `buffScale`), Klassensegen (`useSegen`), Diener, Ulti (`useUltimate`), Schaden über Zeit, Lebensraub, Omni-Vampir, Ausweichen, Blocken und Mana kommen unverändert aus dem Spiel.
- Abgeschaltet sind nur Anzeige, Speichern und Welt-Ereignisse.
- Der Zufall ist fest (reproduzierbar).
- Gemessen wird in Echtzeit: Treffer-Stopps bei Krits kosten Zeit wie im Spiel.

**Figur:**
- **Ausrüstung:**
  - Krieger: Schwert und Schild.
  - Ninja Dolch: zwei Dolche.
  - Ninja Falke: Bogen und Köcher, beste erlaubte Pfeile.
  - Schamane: Fächer, Nekromant: Stab, Magier: Zepter.
- **Statuspunkte:** 2 je Stufe, zuerst in den Hauptwert bis 90, der Rest in Vitalität.
- **Fertigkeiten:**
  - Bis Stufe 69: L−1 Punkte reihum auf alle freigeschalteten Fertigkeiten. Bei 15 wird erweckt (E1).
  - Stufe 70: alle H5.
  - Stufe 80: alle L5.

**Spieler-KI:**
- Hält den Grundangriff.
- Fertigkeiten nach Abklingzeit, die mit der langen Abklingzeit zuerst; Kanäle und Zauberzeit als Füller.
- Ortszauber zielen auf das aktuelle Ziel.
- Buffs, wenn sie fehlen. Heilung unter 60 % Leben. Tarnung nur, wenn der Hinterhalt bereit ist.
- Diener neu rufen, wenn keine mehr da sind.
- Ulti, sobald bereit. Manatrank unter 30 %.

**Grenzen:**
- Die KI weicht nicht aus und hält keinen Abstand. Fernkämpfer sind im Überleben deshalb pessimistisch gemessen; das gleicht die Kategorie Mobilität & Abstand teilweise aus.
- Totenruf braucht Gräber: In den Puppen-Messungen bleibt er ungenutzt, im Farm-Lauf wird er benutzt.
- Gruppenspiel (Heilung für andere), PvP und Bosse mit eigenen Angriffen sind nicht bewertet.

**Laufzeitänderungen zum Ausprobieren** (`VORSCHLAG` bzw. `--vorschlag-datei`):
- **Datenwerte:** `set`.
- **Ulti-Faktor:** `ult`.
- **Klassensegen:** `segen`.
- **Neuer Buff nach einer Ulti:** `ultbuff`.
- **Neue Trefferwirkung einer Fertigkeit:** `inject`. Steht für ein neues Datenfeld, das im Code erst weitergegeben werden muss.

**Prüfung der Umsetzung:**
- `node --check` auf allen geänderten Dateien.
- Spieltest je Klasse und Weg auf Stufe 30 und 75, in 2D und 3D: alle fünf Fertigkeiten, Ulti, Segen, Fertigkeits-Tooltips, Buff-Hinweise und Charakterfenster. Dabei gab es keine Seiten- und keine Konsolenfehler.
- Glutfeld betäubt nachweislich je Puls (gemessen 0,32 s), die Phönixflamme 1,5 s.
- Glutmantel, Steinhaut (60 s, −40 %), Elementschaden, Drachenschuppen und Leichtfüßigkeit (Angriff, Lebensraub) erscheinen mit den richtigen Werten in den Buffs.

## 9. Simulator erneut laufen lassen

Voraussetzung: Node mit Playwright. Falls Chromium fehlt: `npx playwright install chromium`.

Der Simulator startet seinen eigenen kleinen Webserver auf das Repo.

```bash
cd /home/user/claude
# alle 12 Wege × Stufe 10/30/50/70/80 × Ausrüstung +7/+15 (etwa 3–6 Minuten mit 3 Seiten)
node tools/balance-sim.js --out /tmp/balance-ergebnis.json
# nur +7 auf den Hauptstufen, schneller
node tools/balance-sim.js --stufen 30,50,70 --ausr std --ohne-farm
# eigene Werte ausprobieren (JSON-Liste im Format von VORSCHLAG)
node tools/balance-sim.js --vorschlag-datei meine-werte.json --stufen 30,50,70 --ausr std
# Tabellen aus einer gespeicherten Messung drucken
node tools/balance-sim.js --tabellen /tmp/balance-ergebnis.json
```

Wege-Kennungen:
- `krieger.klinge`, `krieger.leib`
- `ninja.dolch`, `ninja.falke`
- `schamane.drache`, `schamane.heilung`
- `nekromant.seelen`, `nekromant.knochen`
- `magier.feuer`, `magier.frost`, `magier.blitz`, `magier.erde`

`--wege` misst nur die genannten Wege. Die Wertung ist dann aber nur relativ zu diesen, für Gesamtwerte deshalb immer alle Wege messen.

Weitere Optionen:
- `--worker <n>`: parallele Browserseiten.
- `--kurz`: kürzere Läufe.
- `--url <http://…/>`: statt des eigenen Servers.

Gewichte (`WEIGHTS`), Ausrüstung (`GEARS`) und Stufen (`LEVELS`) stehen oben im Skript.
