# Turnierarena – Spieler gegen Spieler (seit 13.86)

Die Turnierarena ist reiner Spaß mit anderen Spielern im Kanal. Anders als die Prüfungsarena (Monsterwellen für Gold,
`js/herausforderung.js`) gibt es hier weder Gold noch Beute oder Erfahrung – nur Rangpunkte.

Code: `js/turnierarena.js` (dazu kleine Haken in `kampf.js`, `gegner.js`, `eingabe.js`, `zeichnen.js`, `welt.js`,
`spieler.js`, `drei-kern.js`, `drei-fx.js`, `umgebung.js`, `karte.js`, `tag-nacht.js`).

## Der Turniermeister

- In jeder Stadt und jedem Lager steht neben dem Arenameister ein Turniermeister (eigene Person, ohne Stand,
  `TOWN_PLACES.pvp` in `welt.js`), auch in Lichtwacht (Map 10). Plakette über dem Kopf: zwei Schilde in Blau und Rot.
- Sein Fenster zeigt den eigenen Rang (Stein, Stufe, Punkte, Fortschritt), alle vier Arten mit der Zahl der Wartenden
  und je einen Knopf **Anmelden** bzw. **Abmelden**.
- Ab Stufe 10 (`PVP.minLevel`).
- Ohne Kanal (allein gespielt) erklärt das Fenster, dass die Turnierarena Mitspieler braucht, und öffnet auf Wunsch die
  Server-Auswahl.

## Arten

| Art | Halle | Spieler | Rang | Regeln |
|---|---|---|---|---|
| Rangkampf 1 gegen 1 | Sandgrube | 2 | ja | Wer fällt, scheidet aus. Das letzte Team gewinnt. |
| Rangkampf 2 gegen 2 | Frosthof | 4 | ja | wie oben |
| Rangkampf 3 gegen 3 | Glutkessel | 6 | ja | wie oben |
| Turmschlacht 4 gegen 4 | Turmwiese | 2 bis 8 | nein | Blau gegen Rot, Turm in der Mitte, Wiedereinstieg in der Basis |

### Rangkampf (1 gegen 1, 2 gegen 2, 3 gegen 3)

- Nur mit vollen Teams (2, 4 bzw. 6 Spieler). Mehr als 3 gegen 3 gibt es im Rangkampf nicht.
- 5 Sekunden Countdown, dann der Kampf. Im Countdown zählt kein Treffer.
- Wer fällt, ist für die Runde draußen: kein Wiederbeleben, man schaut zu (kein Todesfenster).
- Das Team, das zuletzt noch steht, gewinnt.
- Höchstens 5 Minuten. Ist die Zeit um, gewinnt das Team mit mehr Kämpfern, danach das mit mehr übrigem Leben (Anteil);
  sonst unentschieden (keine Punkte).

### Turmschlacht (4 gegen 4, ohne Rang)

- Zwei Teams: **Blau** (Basis im Westen) und **Rot** (Basis im Osten). Seit 13.89 ist die Wiese 99 × 55 Kacheln groß, die Basen liegen 42 Kacheln vom Turm entfernt (vorher 30).
- Anzeige am PC (seit 13.89): oben in der Mitte eine Tafel mit den Kills beider Teams, der Zeit und dem Turm; unten links eine Karte mit Teams, Turm, Wiedereinstieg (mit Fortschritt), eigenen Kills/Toden und „Verlassen“.
- Beginnt schon ab 2 Spielern (dann 1 gegen 1). Wer sich später anmeldet, kommt in das laufende Spiel und füllt das
  kleinere Team auf (höchstens 4 je Team).
- Wer fällt, steht nach 6 Sekunden in der kleinen Basis seines Teams wieder auf (2 Sekunden geschützt) und läuft zurück
  in die Mitte.
- In der Mitte steht ein Turm in einem Kreis aus Steinplatten (Halbmesser 5 Kacheln, Laternen am Rand). Er beginnt
  bei 0 %.
  - Steht **nur ein Team** im Kreis, lädt es den Turm in seiner Farbe auf (allein 60 Sekunden bis 100 %, jeder weitere
    Spieler im Kreis +25 % schneller). Gehört der Turm gerade dem anderen Team, wird erst dessen Ladung abgebaut.
  - Stehen **beide Teams** im Kreis: umkämpft, keine Änderung.
  - Steht **niemand** im Kreis: die Ladung sinkt langsam (0,5 % je Sekunde).
  - Der Kristall über dem Turm füllt sich in der Teamfarbe; die Anzeige zeigt die Prozent.
- Sieg: Turm auf 100 % **oder** zuerst 100 Kills. Nach 15 Minuten gewinnt das Team mit mehr Kills (bei Gleichstand
  das Team, dem der Turm gehört).

## Rang

Eine gemeinsame Wertung für alle Rangkämpfe (nicht je Art getrennt). Jeder Charakter beginnt mit Bronze und 0 Punkten.

- Sieg: **+50** Punkte (`PVP.win`)
- Niederlage: **−25** Punkte (`PVP.loss`), nie unter 0
- Unentschieden: keine Änderung
- Wer einen Rangkampf verlässt (Knopf, aus der Halle laufen, Spiel schließen), verliert ihn (−25). Wer das Spiel
  mittendrin schließt, bekommt die Niederlage beim nächsten Start angerechnet (`p.pvp.open`).
- Wechselt der Host des Kanals mitten im Spiel, endet es ohne Wertung.

| Stufe | ab Punkten |
|---|---|
| Bronze | 0 |
| Silber | 200 |
| Gold | 400 |
| Platin | 600 |
| Diamant | 800 |
| Champion | 1000 |

Der Rang steht als farbiger Stein im Fenster des Turniermeisters, im Charakterfenster (neben dem Namen und auf der
Seite „Werte“ unter „Turnierarena“) und in der Arena vor der Stufe über dem Kopf jedes Spielers. Gespeichert wird er
im Spielstand (`pvp` in `SAVE_FIELDS`) und damit auch mit dem Konto abgeglichen.

## Im Spiel

- Anzeige (am PC über dem Chat, am Handy als Pille unter der Lebensanzeige, antippen klappt sie auf): Art, Zeit, beide
  Teams mit dem Leben jedes Spielers, Punktestand und Turm (Turmschlacht), Wiedereinstieg, Verlassen.
- Namen über den Köpfen in der Teamfarbe (Blau/Rot), davor der Rang-Stein.
- Kein Eigenbeschuss: Auto-Ziel, Tab, Antippen, Flächenangriffe und Geschosse treffen nur Gegner.
- Schaden wie im Duell (echte Werte, `DUEL.pvpMul`, bei ähnlicher Stufe höchstens 35 % bzw. 50 % des Lebens je
  Treffer). Kontrollzauber zählen wie im Duell nur als Schaden.
- Die Heilung der Lichtkuppel wirkt auch auf das eigene Team. Diener kämpfen mit (wie im Duell halb so stark).
- Ein Fall in der Turnierarena kostet weder Erfahrung noch Gold und zählt nicht bei den Toden.
- In den Hallen gibt es keine Monster und keine Nacht.
- Ende: Übersicht mit Sieger, Kills und Toden je Spieler, im Rangkampf die Punkte mit Stein. „Zurück in die Stadt“
  bringt zum Turniermeister zurück (sonst nach 25 Sekunden von selbst).

## Anmelden und Teams (Host)

- Die Warteschlange und alle Spiele führt der Host des Kanals (auch der Welt-Wächter). Mitspieler schicken ihm
  Anmelden/Abmelden; er schickt allen den Stand (Wartende je Art).
- Gruppen: Wer in einer Gruppe ist, bekommt den Namen des Anführers als Gruppenzeichen mit. Gruppenmitglieder, die sich
  für dieselbe Art anmelden, landen im selben Team (größere Gruppen als ein Team werden geteilt).
- Rangkampf: Sobald zwei volle Teams möglich sind (die früh Wartenden zuerst), stellt der Host sie zusammen – nur
  Einzelne werden nach Rangpunkten gerecht verteilt –, sucht eine freie Halle der Art und schickt jedem den Start. Jeder
  geht selbst zu seinem Startplatz.
- Turmschlacht: erst in ein laufendes Spiel mit Platz, sonst ab 2 Wartenden ein neues.
- Hallen: Sandgrube ×4, Frosthof ×2, Glutkessel ×2, Turmwiese ×2 (ein Kanal hat höchstens 8 Spieler).
- Wer den Kanal verlässt oder lange außerhalb der Halle steht, ist raus.

## Nachrichten (onSocial, k: 'pv…')

| k | Richtung | Inhalt |
|---|---|---|
| pvq / pvx | Spieler → Host | anmelden (Art, Name, Klasse, Stufe, Punkte, Gruppe) / abmelden |
| pvi | Spieler → Host | Stand erfragen |
| pvs | Host → Spieler | Wartende je Art, eigene Kennung, ob man wartet |
| pvm | Host → Spieler | Start (Halle, Team, Platz, alle Spieler, Countdown) |
| pvu | Host → Spieler | Zwischenstand (Spieler, Kills, Tode, Punkte, Turm, Restzeit), zweimal je Sekunde |
| pve | Host → Spieler | Ende (Sieger, Grund, alle Spieler) |
| pvh / pvf | Spieler → Spieler | Treffer (roher Schaden) / Rückmeldung (angekommener Schaden) |
| pvd | Spieler → Host | eigener Fall (wer zuletzt traf) |
| pvl | Spieler → Host | Spiel verlassen |

## Werte zum Nachstellen (`PVP` in `turnierarena.js`)

`win` 50 · `loss` 25 · `minLevel` 10 · `countdown` 5 s · `rankedTime` 300 s · `funTime` 900 s · `funKills` 100 ·
`funMin` 2 · `respawn` 6 s · `protect` 2 s · `capTime` 60 s · `capMore` 0,25 · `capDecay` 0,5 %/s · `capR` 5 Kacheln ·
`endShow` 25 s
