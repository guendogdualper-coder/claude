# Auftrag: Seelenstein läuft flüssig und kühl – am Handy und am PC

Stand: Version 15.12. Dieses Dokument ist der vollständige Auftrag („Prompt“) für alle Arbeiten an der Leistung.
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

## 6. Als Nächstes (noch offen)

Reihenfolge nach erwartetem Gewinn:

1. Speicher: Der Kampf erzeugt weiter 80 bis 90 MB neuen Speicher pro Sekunde. Ziel unter 40 MB. Die größten
   Verursacher im Profil suchen (Effektabgleich, Partikel, Trefferberechnung) und auf Vorräte umstellen.
2. Effektabgleich: Viele kleine Effekte desselben Typs in einem Rutsch zeichnen statt einzeln.
3. Monster in der Ferne: Animation nur in jedem zweiten Bild, weit entfernt ganz ohne Knochenbewegung.
4. Schatten am Handy: bei „Mittel“ im Gedränge nur noch die eigene Figur und nahe Monster Schatten werfen lassen.
5. Auflösung am Handy: prüfen, ob „Mittel“ mit etwas geringerer Auflösung im Kampf kühler bleibt, ohne dass das
   Bild sichtbar unschärfer wird.
6. 2D-Modus: Die Messszene für 2D am Handy liefert derzeit kein Ergebnis und muss repariert werden. Danach
   dieselben Messungen wie in 3D.
7. Messung auf echten Geräten: Bildzeiten und Wärme auf einem aktuellen iPhone und einem Mittelklasse-Android.

## 7. Abnahme

Eine Leistungsänderung gilt als fertig, wenn

- die Messung vorher und nachher mit denselben Szenen vorliegt,
- kein Ziel aus Abschnitt 1 schlechter geworden ist,
- die komplette Testreihe grün ist,
- im Spiel nichts fehlt, was man zum Spielen braucht (Sichtprüfung im Gedränge mit Bildschirmfoto).
