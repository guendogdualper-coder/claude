# Auftrag: Seelenstein läuft flüssig und kühl – am Handy und am PC

Stand: Version 15.18. Dieses Dokument ist der vollständige Auftrag („Prompt“) für alle Arbeiten an der Leistung.
Es beschreibt das Ziel, wie gemessen wird, was schon umgesetzt ist und was als Nächstes kommt.

## 1. Ziel

Das Spiel bleibt flüssig, egal wie viele Monster auf die Figur zulaufen, während Fertigkeiten ausgelöst werden und
über jedem Monster Schadenszahlen aufsteigen. Das gilt in 3D und in 2D, am Handy und am PC. Das Handy wird dabei
nicht schnell heiß.

Messbare Ziele:

| Lage | Ziel |
|---|---|
| Handy, Grafik „Niedrig“ oder „Mittel“, 80 Monster, Dauerfeuer | kein Bild länger als 50 ms, höchstens 2 % der Bilder über 33 ms |
| Handy, ruhiges Laufen | gleichmäßige Bildrate ohne sichtbare Hänger |
| PC, Grafik „Ultra“, 80 Monster | 60 Bilder pro Sekunde, kein Bild über 33 ms |
| Speicher | unter 40 MB neuer Speicher pro Sekunde im Kampf (weniger Aufräumpausen) |
| Wärme am Handy | im Kampf deutlich weniger Dreiecke und Bildpunkte als vor 15.12 |

## 2. Grundsätze

1. Erst messen, dann ändern. Jede Änderung wird vorher und nachher mit derselben Szene gemessen.
2. Gespart wird an Zierde, nie am Spiel: Treffer, Schaden, Warnflächen, die Effekte der eigenen Fertigkeiten und
   alles, was man zum Spielen braucht, bleiben immer sichtbar.
3. Unter Last lieber weniger zeigen als stocken. Ein fehlender Funke fällt nicht auf, ein Hänger schon.
4. Keine neuen Objekte je Bild. Was oft gebraucht wird, kommt aus einem Vorrat und geht dorthin zurück.
5. Was sich nicht ändert, wird einmal gemalt und danach nur kopiert (Namen, Schadenszahlen, Symbole).
6. Am Handy gelten von vornherein knappere Grundwerte. Der PC behält volle Pracht, solange er sie schafft.
7. Nichts geht live, bevor die komplette Testreihe grün ist.

## 3. So wird gemessen

Werkzeug: `leistung2/mess.js` (virtuelle Uhr, fester Zufall, 80 Monster um die Figur, Fertigkeiten im Dauerfeuer).
Gemessen werden Rechenzeit je Bild (Spiel und Zeichnen getrennt), Zeichenaufrufe, Dreiecke, neuer Speicher pro
Sekunde, Aufräumpausen und ein Profil der teuersten Funktionen.

Szenen, die jedes Mal laufen:

- Magier am Handy, Grafik „Mittel“, 3D
- Krieger am Handy, Grafik „Niedrig“, 3D
- Krieger am PC, Grafik „Ultra“, 3D
- Magier am Handy, 2D

Wichtig: Gemessen wird ohne echte Grafikkarte. Die Rechenzeiten sind deshalb nur untereinander vergleichbar.
Dreiecke, Zeichenaufrufe und Speicher sind echte Größen und gelten auch auf dem Gerät.

## 4. Befund vor 15.12 (80 Monster, Dauerfeuer)

| Größe | Handy „Mittel“ | Handy „Niedrig“ |
|---|---|---|
| Dreiecke je Bild | 1,35 Millionen | 1,11 Millionen |
| Zeichenaufrufe je Bild | 595 | 442 |
| Effekte gleichzeitig (Schnitt / Spitze) | 157 / 561 | 66 / 441 |
| Neuer Speicher pro Sekunde | 116 MB | 90 MB |
| Rechenzeit je Bild (Schnitt) | 21,2 ms | 15,3 ms |

Wohin die Zeit ging (Handy „Mittel“):

- 35 % Zeichnen der 3D-Szene (vor allem Monster: jedes Modell wird für die Umrisslinie doppelt gezeichnet)
- 28 % Abgleich der Fertigkeits- und Treffereffekte, davon allein 7 % die Rang-Trefferblitze
- 15 % Anzeige über der Szene: Namen, Lebensbalken, Schadenszahlen
- 11 % Spiellogik

Die automatische Grafikanpassung half im Kampf nicht, weil sie den Mittelwert über mehrere Sekunden betrachtet.
Ruckler im Gedränge sind kurze Spitzen, die den Mittelwert kaum bewegen.

## 5. Umgesetzt in 15.12: der Lastschutz

Neue Datei `js/lastschutz.js`. Er misst die geglättete Bildzeit und kennt drei Stufen: ruhig, voll, Gedränge.
Die Stufe steigt nach etwa einer Drittelsekunde über dem Soll und fällt nach vier ruhigen Sekunden wieder.

| Maßnahme | Wirkung |
|---|---|
| Effektbudget | Laufen schon viele Effekte, entfallen neue Zier-Effekte (Funken, Trefferblitze, Einschlagsterne). Grenze je Grafikstufe, am Handy niedriger, im Gedränge noch einmal halbiert. |
| Zahlenbudget | Sind schon sehr viele Schadenszahlen im Bild, entfallen weitere gewöhnliche. Kritische Treffer, Heilung und Hinweise kommen immer. |
| Schadenszahlen als Bild | Jede Zahl wird einmal gemalt und danach nur kopiert. Vorher zwei bis drei Schriftzüge mit breitem Rand je Zahl und Bild. |
| Einfachere Monster früher | Monster tragen das einfache Modell schon in größerer Darstellung; am Handy von vornherein, am PC unter Last. |
| Ohne Umrisslinie | Einfache Monstermodelle werden am Handy („Mittel“, „Niedrig“) und im Gedränge ohne Umrisshülle gezeichnet. Das halbiert ihre Dreiecke. |
| Namen in der Nähe | Namen und Lebensbalken gewöhnlicher Monster nur bis zu einem Abstand. Ziel, Bosse und Seelensteine immer. |
| Einfache Lebensbalken | Am Handy und unter Last zwei Rechtecke statt Pfad, Verlauf und Maske. Ziel, Bosse und Steine behalten den schönen Balken. |

Ergebnis (80 Monster, Dauerfeuer):

| Größe | Handy „Mittel“ vorher → nachher | Handy „Niedrig“ vorher → nachher |
|---|---|---|
| Dreiecke je Bild | 1,35 Mio. → 0,89 Mio. | 1,11 Mio. → 0,67 Mio. |
| Zeichenaufrufe je Bild | 595 → 520 | 442 → 363 |
| Effekte gleichzeitig (Schnitt) | 157 → 69 | 66 → 36 |
| Neuer Speicher pro Sekunde | 116 MB → 92 MB | 90 MB → 80 MB |
| Rechenzeit je Bild (Schnitt) | 21,2 ms → 17,0 ms | 15,3 ms → 15,5 ms |

Die Werte stammen aus dem ersten Messlauf nach dem Einbau von Effektbudget, Zahlenbudget, Zahlenbildern und
einfacheren Monstern. Namen in der Nähe und einfache Balken kamen danach dazu und sind in dieser Tabelle noch
nicht enthalten.

## 5a. Umgesetzt in 15.13: weniger neuer Speicher

- Kollisionsprüfung (`solidBump`): Zellenschlüssel als Zahl statt als Zeichenkette, keine innere Funktion mehr.
- Abdrängen der Verfolger: feste Liste statt einer neuen je Bild, Abstand erst im Quadrat geprüft.

Gemessen (Magier am Handy, „Mittel“, 80 Monster, 15 Sekunden): 95 MB → 87 MB neuer Speicher pro Sekunde.
Der größte verbliebene Verursacher ist die Monsterlogik selbst (rund 12 %). Im Quelltext entstehen dort keine
Listen oder Objekte mehr; der Speicher stammt vermutlich aus Kommazahlen, die an den Monstern gespeichert werden.
Das ist noch nicht belegt und wäre der nächste Untersuchungsschritt.

## 5b. Umgesetzt in 15.14: klein dargestellte Monster ohne eigenen Schatten

Am Handy und unter Last werfen Monster mit einfachem Modell keinen eigenen Schatten mehr; der runde
Bodenschatten bleibt. Gemessen (Magier am Handy, „Mittel“, 80 Monster): Zeichenaufrufe 523 → 443,
Dreiecke 0,88 Mio. → 0,75 Mio. je Bild.

Geprüft und verworfen: Die Vermutung aus 5a (Kommazahlen an den Monstern erzeugen den Speicher) stimmt nicht.
Die Monster behalten auch im Kampf ihre schnelle Speicherform. Woher die rund 12 % in der Monsterlogik kommen,
ist weiter offen.

## 5c. Umgesetzt in 15.15 und 15.16: Speicherquelle gefunden, Rechenzeit gesenkt

Die Quelle des Speichers in der Monsterlogik ist gefunden. Gemessen wurde je Funktion, wie viel neuer Speicher ein
Aufruf erzeugt (Funktion im laufenden Kampf mehrere hundert Mal aufrufen, Speicher davor und danach ablesen).

- `Math.hypot` (Abstand zweier Punkte) erzeugt im Browser bei jedem Aufruf rund 60 Byte Müll, weil es eine
  eingebaute Funktion ist, die Werte und Ergebnis als Objekte anlegt. Das Spiel rechnet im Kampf mehrere tausend
  Abstände je Bild. Jetzt rechnen `hyp` und `hyp3` (`js/rechnen.js`) mit Wurzel aus den Quadraten – ohne Speicher.
  Die Monsterlogik erzeugt damit je Bild 41 KB statt 75 KB, die Zielsuche 7,5 KB statt 15,7 KB.
- Die großen Spielfunktionen erreichen die höchste Optimierungsstufe des Browsers erst nach etwa einer halben
  Minute Kampf. Kurze Messläufe (15 Sekunden) zeigen deshalb mehr Speicher als das Spiel auf Dauer braucht.
  Verglichen wird ab jetzt mit 40 Sekunden.
- Zier-Teilchen: Höchstzahl vom Lastschutz (`LOAD.parts`: PC 320, Handy 260/200/140 je Grafikstufe, unter Last
  weniger); abgelaufene Teilchen werden an Ort und Stelle entfernt statt je Bild eine neue Liste zu bauen.
- Schläge der Monster und Diener am Handy und unter Last ohne weißen Kern (halb so viele Streifen).
- Kettenblitz ohne neue Punkte je Bild; Namensschild hängt am Monster (kein Schlüssel aus Text je Bild).
- 15.15: Treffer-Effekte wechseln am Handy und unter Last früher in die sparsame Fassung (`LOAD.hitCrowd`).

Gemessen (Magier am Handy, „Mittel“, 80 Monster, 40 Sekunden):

| Größe | vorher (15.14) | nachher (15.16) |
|---|---|---|
| Rechenzeit je Bild (Schnitt) | 11,3 ms | 9,5 ms |
| Bilder über 16,7 ms (von 2400) | 171 bis 182 | 81 |
| Neuer Speicher pro Sekunde | 76 bis 77 MB | 70 MB |
| Teilchen gleichzeitig (Schnitt / Spitze) | 180 / 320 | 130 / 200 |

Der verbleibende Speicher verteilt sich auf sehr viele Stellen: Jeder Aufruf an Zeichenfläche und Grafikkarte mit
Kommazahlen legt diese Zahlen kurz als Objekte an. Die Aufräumpausen kosten im Messlauf im Schnitt 0,06 ms je Bild
(längste 8,8 ms). Das Ziel „unter 40 MB“ ist nur mit weniger Zeichenaufrufen erreichbar (Punkte 2 und 3 unten).

2D am Handy: Die Messung läuft (sehr langsam, deshalb nur 2 Sekunden). Rechenzeit im Schnitt 6,6 ms je Bild,
77 MB neuer Speicher pro Sekunde. Die Rechenzeit ist dort unkritisch.

## 5d. Umgesetzt in 15.18: Bodenschatten gebündelt

Die runden Bodenschatten der Monster zeichnet ein einziges Sammelteil (`v3BlobBatch`), vorher je Monster ein
eigener Zeichenaufruf. Gemessen (Magier am Handy, „Mittel“, 80 Monster): Zeichenaufrufe 443 → 364 je Bild.
Gefallene Monster haben keinen Schatten mehr.

## 6. Als Nächstes (noch offen)

Reihenfolge nach erwartetem Gewinn:

1. Speicher: Der Kampf erzeugt weiter 80 bis 90 MB neuen Speicher pro Sekunde. Ziel unter 40 MB. Die größten
   Verursacher im Profil suchen (Effektabgleich, Partikel, Trefferberechnung) und auf Vorräte umstellen.
2. Effektabgleich: Viele kleine Effekte desselben Typs in einem Rutsch zeichnen statt einzeln.
3. Monster in der Ferne: Animation nur in jedem zweiten Bild, weit entfernt ganz ohne Knochenbewegung.
4. Schatten am Handy: bei „Mittel“ im Gedränge nur noch die eigene Figur und nahe Monster Schatten werfen lassen.
5. Auflösung am Handy: prüfen, ob „Mittel“ mit etwas geringerer Auflösung im Kampf kühler bleibt, ohne dass das
   Bild sichtbar unschärfer wird.
6. Teilchen in 3D: je Teilchen wird heute die Lage zweimal umgerechnet und die Zeichenfläche neu ausgerichtet.
   Einmal je Teilchen genügt.
7. Messung auf echten Geräten: Bildzeiten und Wärme auf einem aktuellen iPhone und einem Mittelklasse-Android.

## 7. Abnahme

Eine Leistungsänderung gilt als fertig, wenn

- die Messung vorher und nachher mit denselben Szenen vorliegt,
- kein Ziel aus Abschnitt 1 schlechter geworden ist,
- die komplette Testreihe grün ist,
- im Spiel nichts fehlt, was man zum Spielen braucht (Sichtprüfung im Gedränge mit Bildschirmfoto).

## 5e. Ganze Karte vorladen (15.26)

Wunsch: Die Karte soll komplett geladen sein, wenn man sie betritt – beim schnellen Reiten sah man, wie die Welt am
Bildrand nachlädt.

Messung (ganze Karte 360 × 220 Kacheln, 400–425 Blöcke, Bauzeit am PC):

| Karte | Grafik | Bauzeit | Geometrie |
|---|---|---|---|
| Ödland | Hoch | 1,1 s | 63 MB |
| Dunkelwald | Hoch | 2,5 s | 253 MB |
| Dunkelwald | Mittel | 1,7 s | 134 MB |
| Dunkelwald | Niedrig | 1,5 s | 84 MB |
| Kazehana | Mittel | 1,5 s | 178 MB |

Umsetzung (`FULL3`, `js/drei-kern.js`):

- Beim Betreten einer Karte werden hinter dem Ladebild (`js/kartenladen.js`) alle Blöcke gebaut, nächste zuerst;
  hinter dem Ladebild 80 ms je Bild, gezeichnet wird nur jedes vierte Bild.
- Gebaute Blöcke bleiben im Speicher. In der Szene hängen nur die Blöcke um die Sichtfläche (`chunkKept3`), der Rest
  kostet beim Zeichnen nichts.
- Speicherbudget: PC 360 MB; Handy 48 MB (bis 3 GB Arbeitsspeicher), 70 MB (4 GB), 95 MB (unbekannt, z. B. iPhone),
  130 MB (ab 8 GB). Ist es voll, bleiben die nächsten Blöcke; im Hintergrund wird der fernste gegen einen näheren
  getauscht, wenn der mindestens drei Blöcke näher liegt (3,5 ms je Bild, unter Last 1,5 ms).
- Dungeon: die Karte wird beiseitegelegt (`FULL3.stash`) und beim Verlassen ohne Ladebild wieder eingehängt.
- Solange das Ladebild steht, nimmt die Figur keinen Schaden (`damagePlayer`).

Geprüft: Ritt mit 28 Kacheln je Sekunde über 150 Bilder – kein fehlender Block im Bild; Dungeon hinein und heraus –
Karte sofort wieder da.

