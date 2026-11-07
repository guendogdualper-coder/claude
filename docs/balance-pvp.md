# PvP-Balancing (Stand 14.15, gemessen mit `tools/balance-sim.js --pvp`)

Auftrag: [prompt-boni-und-pvp-balancing.md](prompt-boni-und-pvp-balancing.md), Teil 2 „PvP ohne One-Shots“.


## Nachtrag 14.29: Dolch-Ninja im PvP gedeckelt, im PvE etwas stärker

Der Dolch-Ninja gewann auf dem Stand 14.28 **95 %** seiner Duelle (Messung `--pvp --wuerfe 2`, alle Stufen und
Ausrüstungen). Neu ist ein Ausgleich je Weg, `PATH_DMG` in `js/kampf.js`:

- **gegen Spieler** (Duell und Turnierarena, `pvpOutgoing`): Schaden des Dolch-Ninjas ×0,6 (Diener nicht betroffen),
- **gegen Monster** (`hitMonster`): ×1,1.

Ausprobiert wurden ×0,7 (Siegquote 78 %) und ×0,6 (62 %). Mit 0,6 liegt er im oberen Mittelfeld, gewinnt gegen die
Magier weiter meist, verliert aber gegen Krieger · Klinge und Ninja · Falke. Im PvE (Simulator, Stufe 50, std)
steigt sein Schaden auf einzelne Ziele von 4.069 auf 4.476 und auf fünf Ziele von 10.356 auf 11.392 (je +10 %).

Siegquote je Weg (Durchschnitt gegen alle anderen, je Paar und Stufe/Ausrüstung 2 Würfe, ±5 Punkte Streuung):

| Weg | 14.28 | 14.29 |
|---|---:|---:|
| Krieger · Klinge | 77 % | 84 % |
| Krieger · Leib | 45 % | 55 % |
| Ninja · Dolch | 95 % | 62 % |
| Ninja · Falke | 86 % | 92 % |
| Schamane · Drache | 56 % | 58 % |
| Schamane · Heilung | 39 % | 39 % |
| Nekromant · Seelen | 50 % | 50 % |
| Nekromant · Knochen | 44 % | 48 % |
| Magier · Feuer | 11 % | 15 % |
| Magier · Frost | 18 % | 20 % |
| Magier · Blitz | 55 % | 52 % |
| Magier · Erde | 23 % | 24 % |

Offen bleibt: Ninja · Falke (92 %) und Krieger · Klinge (84 %) liegen jetzt oben, Magier · Feuer/Frost/Erde und
Schamane · Heilung weiter deutlich unten. Mit `PATH_DMG` lässt sich das je Weg nachstellen.

## Wie gemessen wird

```
node tools/balance-sim.js --pvp                      # neue Rechnung, Ergebnis balance-pvp.json
node tools/balance-sim.js --pvp --alt                # Rechnung bis 14.14 (vorher)
node tools/balance-sim.js --pvp-tabellen <datei>     # Tabellen einer Messung drucken
# Optionen: --stufen 20,50,80  --ausr std,top  --wuerfe 4  --pvp-zeit 60  --worker 3  --vorschlag-datei v.json
```

- Jeder der 12 Wege gegen jeden (auch gegen sich selbst), Stufe 20, 50 und 80, Ausrüstung **std** (alles +7, keine
  Boni) und **top** (alles +20, so selten wie die Stufe erlaubt, je Teil 5 Boni: Hauptwert, Leben, der übliche Wert des
  Platzes und zwei PvP-Boni – Stark/Abwehr gegen Menschen, Abwehr gegen Magie/Nahkampf/Fernkampf, kritischer Schaden),
  je Paar 4 Würfe → 3.456 Duelle je Messung, je Paar und Stufe/Ausrüstung 4, über alles 24.
- Das Spiel kennt nur eine Figur. Deshalb in zwei Schritten, beide mit dem echten Spielcode:
  1. **Angriffsfolge:** Figur A kämpft 60 s mit ihrer Rotation (Buffs, Segen, Ulti, Diener) gegen einen
     Duell-Stellvertreter. Jeder Treffer läuft wie im Spiel über `duelHit → pvpOutgoing` und wird mit Zeitpunkt
     mitgeschrieben.
  2. **Verteidigung:** Figur B kämpft genauso, und die Treffer von A kommen zu ihren Zeitpunkten über
     `duelReceive → pvpReceiveHit → damagePlayer` bei ihr an (Rüstung, Abwehr, Polster, Deckel, Gift, Schilde,
     Ausweichen, Blocken, Heilung zu 60 %). Ihr Lebensraub läuft über die Rückmeldung, die A geschickt hätte.
  Wer später auf 1 Leben fällt, gewinnt. Dauer = Zeit bis zum ersten Fall; fällt keiner in 60 s, ist es unentschieden.
- Nicht abgebildet: Laufen, Abstand und Ausweichen durch Bewegung (beide stehen), Lebenstränke (keine im Duell
  gerechnet). Betäubungen gehen im PvP ohnehin nicht über das Netz.
- Der Simulator ist nicht ganz reproduzierbar (Zustand der Seite zwischen den Läufen); zwei Messungen desselben Standes
  weichen bei den Medianen um etwa ±0,5 s ab.

## Die Rechnung (pvpIncoming in `js/kampf.js`, gemeinsam für Duell und Turnierarena)

| Schicht | Auftrag | eingestellt (PVP_DMG) | Grund |
|---|---|---|---|
| 1. PvP-Faktor nach Stufe des Angreifers | 0,6 bis Stufe 20 → 0,25 auf Stufe 80 | **0,38 bis Stufe 50 → 0,30 auf Stufe 80** | mit 0,6 dauerten Duelle auf Stufe 20 nur 7 s, auf 80 mit 0,25 aber 13–18 s; das Lebenspolster wächst schon mit der Stufe |
| 2. Rüstung doppelt | 2 × Verteidigung, alle Abzüge zusammen höchstens 60 % | **Rüstung (doppelt) höchstens 60 %, Schadensreduktion + „Erlittener Schaden“ + Abwehr gegen Menschen/Magie/Nahkampf/Fernkampf getrennt höchstens 50 %, zusammen also höchstens 80 %** | die doppelte Rüstung allein erreicht auf jeder Stufe schon 60 % (Stufe 20 std: 57–74 %, Stufe 80 top: 82–94 %). Mit einem gemeinsamen Deckel von 60 % wären Verteidigung, Schadensreduktion und die neue Abwehr gegen Menschen im PvP völlig wertlos gewesen |
| 3. Lebenspolster | Schaden ÷ (1 + 0,02 × Stufe) | wie im Auftrag | – |
| 4. Deckel | 25 % / krit. 35 % je Treffer, 45 % in 1,5 s | wie im Auftrag (Deckel abgerundet, damit nie 35,1 % herauskommen); in den 1,5 s zählt nur, was wirklich ankam | – |
| zusätzlich | – | **Ausweichen und Blocken im PvP halb** | mit Top-Ausrüstung haben fast alle 45 % Ausweichen; das halbierte jeden Treffer und machte Duelle zum Würfelspiel (Testreihe, sonst gleiche Werte: Median Stufe 50 top 33,5 s → 21,4 s, Paare über 65 % 48 → 39) |
| Heilung, Lebensraub | 60 % | wie im Auftrag; Lebensraub und Omni-Vampir wirken im PvP jetzt über die Rückmeldung des Gegners (vorher gar nicht), Diener-Treffer heilen nicht | – |
| Lebensentzug-Fertigkeiten | – | heilen von einer Schätzung des **echten** Schadens (`pvpDealtRatio`, gleitender Schnitt der Rückmeldungen) | vorher heilten sie von der Hälfte des **rohen** Schadens – auf Stufe 80 ein Vielfaches dessen, was ankam (Weg der Knochen gewann so 92 % seiner Duelle) |
| Betäubung, Einfrieren, Wurf halb + 4 s Schutz | im Auftrag | **nicht umgesetzt** | Zustände gehen im PvP nicht über das Netz (sie zählen nur als Schaden, `duelMul`); es gibt nichts, worauf die Regel wirken könnte |
| Krit im PvP | – | ×(1,8 + kritischer Schaden) statt fest ×1,8 | der neue Bonus „Kritischer Schaden“ soll auch gegen Spieler zählen |

Großer Stufenabstand (10 oder mehr) bleibt ohne Deckel: Stufe 60 haut Stufe 10 weiter mit einem Schlag um (Test: 99,6 %
des Lebens).

## Abnahme

| Ziel | Ergebnis |
|---|---|
| Median Zeit bis zum Sieg 10–20 s bei gleicher Stufe | **erfüllt** bis auf std Stufe 20 mit 9,9 s (Grenze; die Messungen schwanken zwischen 9,9 und 10,4 s). std 9,9 / 10,3 / 10,3 s, top 19,5 / 19,0 / 16,7 s (Stufe 20/50/80); vorher 2,1–6,2 s |
| kein Treffer über 35 % | **erfüllt**: größter Treffer 35,0 % (krit.), ohne Krit höchstens 25 % |
| kein Paar über 65 % Siegquote | **nicht erfüllt**: 42 von 66 Paaren (vorher 53). Mit allgemeinen Stellschrauben nicht erreichbar, siehe unten |

### Warum die Siegquote nicht unter 65 % kommt

Die vier Schichten wirken auf alle Klassen gleich. Sie stauchen Schaden und Dauer, ändern aber nicht, wer mehr
Schaden je Sekunde macht und wer mehr aushält. In der Simulation gewinnt bei gleichen Würfeln fast immer dieselbe Seite
(je Paar und Stufe 4 von 4 Duellen). Die Testreihe (Varianten v1–v8 im Arbeitsordner) hat Rüstungsdeckel 60/68/78/85 %,
einfache und doppelte Rüstung, PvP-Faktoren und halbes Ausweichen durchprobiert: die Zahl der Paare über 65 % lag
immer zwischen 39 und 55. Was übrig bleibt, sind Unterschiede der Klassen:

- **Ninja · Dolch** gewinnt 87 % seiner Duelle (vorher 89 %): hoher Schaden je Sekunde, 45 % Ausweichen schon mit
  std-Ausrüstung. Vorschlag: im PvP weniger Schaden aus Hinterhalt/Tarnung oder `duelMul` auf seine stärksten Fertigkeiten.
- **Magier · Feuer** (20 %), **Magier · Frost** (21 %), **Magier · Erde** (31 %), **Schamane · Heilung** (34 %) verlieren
  die meisten Duelle: wenig Leben, Schaden über Zeit und Flächen, die im 1-gegen-1 wenig bringen. Vorschlag: `duelMul`
  über 1 für ihre Einzelziel-Zauber (wie heute schon die Kontroll-Zauber des Magiers) oder ein PvP-Schild.
- **Krieger · Leib** fiel von 85 % auf 45 %: sein „−60 % erlittener Schaden“ wirkt jetzt nur noch innerhalb des
  50-%-Deckels, dafür bleibt die Rüstung. Das ist gewollt (vorher war er im Duell kaum zu besiegen).

## Ergebnisse

Vorher: Rechnung bis 14.14 (pvpMul 0,6, einfache Rüstung, nur die Deckel je Treffer). Nachher: Stand dieses Zweigs.

### Vorher und nachher je Stufe und Ausrüstung

| Ausrüstung | Stufe | Median bis Sieg vorher → nachher | 10 % / 90 % nachher | Unentschieden nachher (60 s) | größter Treffer vorher → nachher | Paare über 65 % vorher → nachher |
|---|---:|---:|---:|---:|---:|---:|
| std | 20 | 2,7 s → **9,9 s** | 6,9 / 18,5 s | 0/312 | 35,1 % → 34,9 % | 63/66 → 65/66 |
| std | 50 | 2,1 s → **10,3 s** | 6,1 / 24,9 s | 12/312 | 35,0 % → 35,0 % | 58/66 → 55/66 |
| std | 80 | 2,2 s → **10,3 s** | 6,0 / 34,6 s | 13/312 | 35,0 % → 35,0 % | 61/66 → 48/66 |
| top | 20 | 6,2 s → **19,5 s** | 13,1 / 46,2 s | 18/312 | 34,1 % → 24,4 % | 62/66 → 58/66 |
| top | 50 | 3,5 s → **19,0 s** | 11,7 / 60,0 s | 36/312 | 33,9 % → 35,0 % | 55/66 → 56/66 |
| top | 80 | 4,0 s → **16,7 s** | 11,4 / 60,0 s | 53/312 | 33,7 % → 35,0 % | 53/66 → 49/66 |

### Durchschnittliche Siegquote je Weg (gegen alle anderen, alle Stufen und Ausrüstungen)

| Weg | vorher | nachher |
|---|---:|---:|
| Krieger · Klinge | 62 % | 62 % |
| Krieger · Leib | 85 % | 45 % |
| Ninja · Dolch | 89 % | 87 % |
| Ninja · Falke | 52 % | 53 % |
| Schamane · Drache | 36 % | 62 % |
| Schamane · Heilung | 34 % | 34 % |
| Nekromant · Seelen | 69 % | 59 % |
| Nekromant · Knochen | 44 % | 66 % |
| Magier · Feuer | 19 % | 20 % |
| Magier · Frost | 30 % | 21 % |
| Magier · Blitz | 65 % | 60 % |
| Magier · Erde | 16 % | 31 % |

Paare über 65 % (über alle Stufen und Ausrüstungen): vorher 53/66, nachher 42/66.

### Siegquoten nachher (Zeile gewinnt gegen Spalte, alle Stufen und Ausrüstungen, je Paar 24 Duelle)

| Weg (Zeile gewinnt gegen Spalte) | Kr Klinge | Kr Leib | Ni Dolch | Ni Falke | Sch Drache | Sch Heilung | Nek Seelen | Nek Knochen | Mag Feuer | Mag Frost | Mag Blitz | Mag Erde | Ø |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Krieger · Klinge | – | **67** | 8 | 54 | 54 | 65 | 54 | 42 | **100** | **100** | 58 | **79** | 62 |
| Krieger · Leib | 33 | – | 0 | **73** | 29 | 58 | 42 | 13 | **67** | **71** | 58 | 50 | 45 |
| Ninja · Dolch | **92** | **100** | – | **83** | **75** | **90** | **75** | **75** | **100** | **100** | **88** | **83** | 87 |
| Ninja · Falke | 46 | 27 | 17 | – | 52 | 58 | 54 | 46 | **79** | **83** | 42 | **83** | 53 |
| Schamane · Drache | 46 | **71** | 25 | 48 | – | **83** | 54 | 33 | **92** | **83** | 58 | **83** | 62 |
| Schamane · Heilung | 35 | 42 | 10 | 42 | 17 | – | 19 | 17 | 63 | **69** | 25 | 35 | 34 |
| Nekromant · Seelen | 46 | 58 | 25 | 46 | 46 | **81** | – | 44 | **92** | **88** | 35 | **83** | 59 |
| Nekromant · Knochen | 58 | **88** | 25 | 54 | **67** | **83** | 56 | – | **79** | **83** | 50 | **79** | 66 |
| Magier · Feuer | 0 | 33 | 0 | 21 | 8 | 38 | 8 | 21 | – | 46 | 17 | 33 | 20 |
| Magier · Frost | 0 | 29 | 0 | 17 | 17 | 31 | 13 | 17 | 54 | – | 4 | 54 | 21 |
| Magier · Blitz | 42 | 42 | 13 | 58 | 42 | **75** | 65 | 50 | **83** | **96** | – | **96** | 60 |
| Magier · Erde | 21 | 50 | 17 | 17 | 17 | 65 | 17 | 21 | **67** | 46 | 4 | – | 31 |

### Siegquoten vorher (Rechnung bis 14.14)

| Weg (Zeile gewinnt gegen Spalte) | Kr Klinge | Kr Leib | Ni Dolch | Ni Falke | Sch Drache | Sch Heilung | Nek Seelen | Nek Knochen | Mag Feuer | Mag Frost | Mag Blitz | Mag Erde | Ø |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Krieger · Klinge | – | 15 | 21 | **71** | **71** | **73** | 58 | 58 | **92** | **88** | 44 | **96** | 62 |
| Krieger · Leib | **85** | – | **73** | **92** | **92** | **85** | **69** | 46 | **100** | **100** | **100** | **92** | 85 |
| Ninja · Dolch | **79** | 27 | – | **96** | **96** | **83** | **100** | **96** | **100** | **100** | **100** | **100** | 89 |
| Ninja · Falke | 29 | 8 | 4 | – | **75** | **67** | 17 | **83** | **88** | **83** | 33 | **79** | 52 |
| Schamane · Drache | 29 | 8 | 4 | 25 | – | 52 | 8 | 38 | **83** | 65 | 8 | **79** | 36 |
| Schamane · Heilung | 27 | 15 | 17 | 33 | 48 | – | 4 | 27 | **71** | 58 | 17 | 54 | 34 |
| Nekromant · Seelen | 42 | 31 | 0 | **83** | **92** | **96** | – | **83** | **92** | **100** | 48 | **96** | 69 |
| Nekromant · Knochen | 42 | 54 | 4 | 17 | 63 | **73** | 17 | – | 54 | 46 | 17 | **94** | 44 |
| Magier · Feuer | 8 | 0 | 0 | 13 | 17 | 29 | 8 | 46 | – | 33 | 4 | 54 | 19 |
| Magier · Frost | 13 | 0 | 0 | 17 | 35 | 42 | 0 | 54 | **67** | – | 13 | **85** | 30 |
| Magier · Blitz | 56 | 0 | 0 | **67** | **92** | **83** | 52 | **83** | **96** | **88** | – | **100** | 65 |
| Magier · Erde | 4 | 8 | 0 | 21 | 21 | 46 | 4 | 6 | 46 | 15 | 0 | – | 16 |

## Leben-Bonus ab 14.21 (Stufen 200/350/500/1000, nicht mehr auf Waffe und Köcher)

Dieser Zweig steht auf 14.14; der neue Leben-Bonus ist hier nicht enthalten. Der Simulator ist darauf vorbereitet: Boni,
die ein Platz nicht tragen kann, lässt das Profil weg, und bei festen Stufen (`steps`) nimmt es den Mittelwert der Stufen.
Nachgestellt mit `--vorschlag-datei` (hp nur auf Rüstung, Helm, Schultern, Umhang, Schild, Schuhe, Gürtel, Stufen
200/350/500/1000, Mittelwert 512 je Teil – unabhängig von der Gegenstandsstufe, also eher zu viel für Stufe 20):

| Ausrüstung | Stufe 20 | Stufe 50 | Stufe 80 |
|---|---:|---:|---:|
| std (ohne Boni, unverändert) | 10,0 s | 10,3 s | 10,9 s |
| top heute | 19,5 s | 19,0 s | 16,7 s |
| top mit Leben wie 14.21 | 46,5 s | 26,8 s | 18,3 s |

Auf Stufe 80 passt es weiter. Auf Stufe 20 und 50 wird ein Duell mit Top-Ausrüstung deutlich länger, weil dort 512 Leben
je Teil das Leben mehr als verdoppeln. Wie stark das im Spiel ausfällt, hängt davon ab, welche Stufen 14.21 auf
niedrigen Gegenstandsstufen würfelt. Nach dem Zusammenführen mit `node tools/balance-sim.js --pvp` neu messen; wenn
Stufe 20/50 mit Top-Ausrüstung über 20 s liegen, ist die einfachste Stellschraube `PVP_DMG.mulLow` (Faktor bis Stufe 50)
oder ein Lebenspolster, das nur das Grundleben der Stufe zählt.

## Neue Boni (Teil 1, zur Übersicht)

Spanne auf Gegenstandsstufe 1, wächst um 10 % je Gegenstandsstufe bis „max je Teil“; „Summe“ ist der Deckel aller
angelegten Teile (`BONUS_CAPS`). Gewichte beim Würfeln: Leben, Angriff, Verteidigung und der Hauptwert der Klasse 3,
Gold und Beute 0,7, alles andere 1.

| Bonus | Teile | Spanne | max je Teil | Summe |
|---|---|---|---|---|
| Vergiftungschance | Waffe | 1–4 % | 12 % | 12 % |
| Kritischer Schaden | Waffe, Köcher, Helm | 3–8 % | 15 % | 40 % |
| Stark gegen Tiere / Menschen / Orks und Riesen / Untote und Geister / Teufel und Dämonen | Waffe, Helm, Gürtel, Köcher | 2–6 % | 12 % | je 25 % |
| Abwehr gegen Menschen | Rüstung, Helm, Schild, Umhang, Schuhe | 2–5 % | 10 % | 30 % |
| Abwehr gegen Magie | Rüstung, Helm, Schild, Umhang, Schultern | 2–5 % | 10 % | 25 % |
| Abwehr gegen Nahkampf | Rüstung, Schild, Schultern, Schuhe | 2–5 % | 8 % | 20 % |
| Abwehr gegen Fernkampf | Rüstung, Umhang, Schuhe, Gürtel | 2–5 % | 8 % | 20 % |
| Mehr Gold / Mehr Beute | Helm, Schuhe, Gürtel, Umhang, Schultern | 2–5 % | 8 % | je 25 % |

Mit +10 % je Stufe erreicht ein Gegenstand der höchsten Stufe (×1,9) bei Gift 7,6 %, bei „Stark gegen …“ 11,4 % und bei
der Abwehr gegen Menschen/Magie 9,5 % – die Höchstwerte je Teil aus dem Auftrag werden also (wie bei den alten Boni)
nicht ganz erreicht.
