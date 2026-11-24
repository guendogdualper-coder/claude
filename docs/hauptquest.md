# Goldene Hauptquest ab Stufe 70 und „Die neun Endbosse“ (seit 15.74)

## Warum

Bis 15.73 stand nach „Heimkehr nach Kazehana“ (Stufe 70) das Finale „Die neun Endbosse“ als einziger goldener Auftrag in
der Reihe. Erst danach kamen der Epilog (ab Stufe 75) und der Kristallabgrund bis 80. Wer keine Gruppe für die Endbosse
fand, hatte ab 70 keine goldene Quest mehr.

## Die Reihe seit 15.74

| Kapitel | Älteste/r | Stufe | Aufträge |
|---|---|---|---|
| Kapitel 9 · Feuerberg (Ende) | Ember | 70 | Heimkehr nach Kazehana (Schatten: Mondfall) |
| Zwischenspiel · Willkommen daheim | Bao (Schatten: Selenor) | 70 | Grollen im Gebirge → Donnerklamm; dazu startet der Endboss-Auftrag |
| Kapitel 10 · Titanenkamm | Gunhild (Donnerklamm) | 70–73 | 20 Gargoyles · 15 Donnerriesen · 2 Steine Stufe 70 · Titanenkönig Kroth (Titanenschmiede) · 20 Donnerriesen · Reise zum Feuerberg |
| Kapitel 11 · Drachenhort | Ember (Feuerberg) | 73–74 | 20 Feuerdrachen · 2 Steine Stufe 70 · 25 Feuerdämonen · Urdrache Vharak (Drachenhort) · Reise in den Kristallabgrund (ab 74) |
| Kapitel 12 · Kristallabgrund | Aurelia | 75–80 | unverändert (vorher „Kapitel 10“), erster Text jetzt „Ember schickt dich?“ |

- Donnerklamm und Feuerberg sind gemeinsame Karten: beide Seiten spielen dieselben Kapitel 10 und 11.
- Erfahrung: Die neuen Aufträge geben zusammen gut eine Stufenspanne 70→75 (rund 110 % des Bedarfs, wie früher das
  Finale allein); mit den Kills unterwegs kommt man ohne Warten in den Kristallabgrund.
- Belohnungen wie in den Kapiteln davor: Gold nach Stufe, Fertigkeitsbücher, Sternensteine/5. Bonus, drei feste Teile
  (Waffe, Rüstung, Helm, Lv 70 +2), sonst ein Ausrüstungsteil für die eigene Klasse.

## Der Endboss-Auftrag (`ENDBOSS_QUEST`, `js/daten/quests.js`)

- Gibt der Älteste der Heimat mit, sobald man von der Heimkehr zurück ist (`q.endboss`: 0 nicht vergeben, 1 läuft,
  2 abgegeben). Er läuft neben der goldenen Reihe: Jeder Endboss der eigenen Seite zählt einmal, wann immer man ihn
  besiegt (`q.raidsDone`).
- Anzeige: eigene goldene Zeile im Auftragslog rechts, im Questfenster (L) und als Kasten „Endboss-Jagd · läuft nebenher“
  im Fenster des Heimat-Ältesten mit allen Endbossen (✔/✘). Der goldene Pfeil zeigt zum nächsten Endboss, hinter den
  Angeboten der Reihe.
- Abgabe beim Ältesten der Heimat; Belohnung wie beim alten Finale (1.000.000 Gold, 8 Bücher, Sternensteine, 5. Bonus,
  Switcher 6/7, ein Ausrüstungsteil, Erfahrung `questXp(70, 3)`).

## Alte Spielstände (`questState`, chain 2 → 3, `MAIN_CHAIN3`)

- Bis zur Heimkehr bleibt alles, wie es war.
- Wer beim Finale stand: weiter mit dem Zwischenspiel (Reise nicht angenommen), der Endboss-Auftrag läuft und behält die
  schon besiegten Endbosse. Wer schon alle neun hatte, kann ihn sofort bei Bao/Selenor abgeben.
- Wer schon weiter war (Epilog, Kristallabgrund, alles fertig): Index + 10 (`MAIN_CHAIN3.shift`), derselbe Auftrag mit
  Annahme und Fortschritt; der Endboss-Auftrag gilt als abgegeben (die Belohnung gab es ja schon).
- Ganz alte Stände (bis 11.1) springen direkt auf chain 3.

## Boss-Beute: je Boss ein Ausrüstungsteil

| Boss | bis 15.73 | seit 15.74 |
|---|---|---|
| Endboss einer Map (`raidLoot`) | 3 legendäre Teile (Waffe + 2) | 1 legendäres Teil (zu einem Drittel eine Waffe) |
| Instanzboss (`instFinalLoot`) | 1–2 epische (Fünfergruppe 2) + mit Glück 1 legendäres | 1 Teil: mit Glück legendär (6,5 %, Lv-80-Instanzen 20 %), sonst episch |
| Wächter der Instanzen, Hüter im Turm | episch mit Glück, dazu selten legendär | höchstens 1 Teil (das legendäre statt des epischen) |
| Zerberos und Ifrah (Höllenthron) | 2–3 epische + 2 Teile eines Dungeon-Bosses | 1 episches (2 % legendär) |
| Abaddor (Höllenthron) | 3 legendäre + 1 Zusatzteil | 1 legendäres Teil |
| Turm der Verdammten, Truhe des Wächters | 3 epische + 1 legendäres oder 4. episches | 1 Teil: 35 % legendär, sonst episch |
| normale Dungeon-Bosse (`bossLoot`) | 2 grüne/blaue | seit 15.77 auch nur 1 (grün/blau, selten episch) |

Schmiede-Teile, Seelensplitter, Ätherkerne, Gold und Erfahrung bleiben, wie sie waren.

## Test

`questtest/test.js` (Scratchpad der Sitzung): Reihe, alle Umrechnungsfälle (Licht und Schatten), Ablauf bei Bao/Selenor,
Zählen und Abgeben der Endbosse, Beute je Boss (je 40–60 Würfe: immer genau 1 Teil, Dungeon-Boss 2). Seit 15.77 gibt auch jeder normale Dungeon-Boss genau 1 Teil (`endtest3/test.js`: alle Dungeon-Bosse je 25 Würfe, immer 1).
