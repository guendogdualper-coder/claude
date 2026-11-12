# Gold von Monstern (seit 14.74)

Wunsch: „Man kriegt gar kein Geld von jedem Mob. Je nachdem, wo man ist und welche Stufe man hat, sollen Mobs Gold
droppen. Nicht so viel wie in der Arena, aber genug, um ein bisschen zu farmen.“

## Ist-Zustand bis 14.73

- Jedes Monster gab schon Gold (`monsterStats().gold` = 2 × Stufe bis 4 × Stufe + 2, im Mittel **3 × Stufe + 1**,
  Stufe 50: 151). Es wurde direkt gutgeschrieben, mit einer kleinen Zahl „+151 Gold“ am Monster.
- Gemessen an den Preisen ist das kaum spürbar: Ein XXL-Lebenstrank kostet 4.800 Gold, ein XL-Trank 1.200 Gold,
  der Schmied 50 bis 32.000 Gold je Versuch, das Kriegsross 200.000 Gold und die Glutschwinge 500.000 Gold.
- Seelensteine: 10 × Monstergold × Goldart des Steins (Stufe 50: 1.510, Stein der Gier ×3).
- Bosse: feste Bossbeute 300 × Stufe, Endbosse 1.500 × Stufe, Instanzen 150 bzw. 800 × Stufe, Höllenthron 3.000 × Stufe.
- Prüfungsarena: Wellengold (200 + 20 × Stufe) × Welle. Die Monster zahlen dazu ihr altes Kill-Gold.
- Weitere Goldquellen: Nebenaufträge (45 × Stufe), Jagden, Tagesbelohnung, Verkaufen beim Händler, Auktionshaus.

## Neu: Gold je Kill (`killGoldRoll`, `js/kampf.js`)

| Teil | Wert |
|---|---|
| Grundgold | **3,5 × Monsterstufe + 20** (Stufe 10: 55, 30: 125, 50: 195, 70: 265, 80: 300) |
| Streuung | 60–140 % |
| Goldbeutel | 3 % Chance auf das Fünffache. Er liegt kurz am Boden wie andere Beute und fliegt dann zur Figur. |
| Mittel aus Streuung und Beutel | 1,12 × Grundgold |
| Zähe Arten | Wurzel aus `hpMul`, höchstens ×2. Im Gebiet ist das im Mittel etwa ×1,2. |
| Dungeon / Nacht / Endgame-Elite | ×1,25 / ×1,15 / ×1,4 |
| Bosse und Instanz-Wächter / Endbosse | ×4 / ×6. Die bisherige feste Bossbeute kommt unverändert dazu. |
| Monster aus einem Seelenstein | wie bisher ×1,2 bis ×2,1 (nach Goldart des Steins) |
| Seelenstein selbst | 12 × Grundgold × Goldart, Streuung 85–115 % (Stufe 50 im Mittel etwa 2.300 statt 1.510) |
| Monster weit unter der eigenen Stufe | bis 3 Stufen darunter voll, danach −8 % je Stufe, höchstens −90 % (10 Stufen darunter: −56 %) |
| Bonus „Mehr Gold“ (bis 25 %) | wirkt auf alles oben (`monsterGold`) |
| Kristalle, Monster mit `gold: [0, 0]` | weiter ohne Gold |

Das Gebiet zählt über die Stufe seiner Monster sowie Dungeon und Nacht. Die gemeinsamen Karten ab Stufe 50 haben
keinen eigenen Aufschlag. Sonst läge Farmen ab Stufe 50 mit dem Bonus über 40 % der Arena.

**Die Prüfungsarena bleibt unverändert.** Ihre Monster zahlen weiter das alte Kill-Gold (`m.gold`, `arenaKillReward`),
dazu das Wellengold. Sonst wäre die Arena mitgestiegen.

## Gold pro Stunde

Annahmen (Modell, kein Messlauf über eine Stunde):

- **Farmen:** 480 Kills je Stunde. Das sind 8 je Minute: allein, Monster der eigenen Stufe, ein Gruppenlager nach dem
  anderen, mit Laufwegen. Im Puppen-Farmlauf des Balance-Simulators (5 Monster immer direkt daneben) sind es 40–90 je
  Minute; dieser Wert ist also bewusst zurückhaltend.
- Gezählt sind die Monsterarten draußen bis ±3 Stufen, ohne Nacht, Dungeon und Bosse. Ihr mittlerer Faktor für zähe
  Arten steht in der Tabelle.
- **Arena:** ein Lauf über 10 Wellen in etwa 14 Minuten. Grundlage ist die Bot-Messung „Welle 1–5 in 215 s“ aus
  `docs/auftrag-2026-11-10-arena-tank.md`, dazu geschätzte Wellen 6–10, Pausen und Weg. Gezählt sind Wellengold
  (55 × Schritt) und 270 Monster mit altem Kill-Gold. Der Bonus „Mehr Gold“ gilt in der Arena nicht.
- Seelensteine, Bosse, Aufträge und Verkäufe sind nicht eingerechnet. Sie kommen beim Farmen noch dazu.

| Stufe | Faktor zähe Arten | Gold je Kill Ø bis 14.73 | Gold je Kill Ø neu | Farmen/h bis 14.73 | **Farmen/h neu** | neu mit +25 % Gold | Arena/h | Anteil bis 14.73 | **Anteil neu** | mit +25 % |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 1,06 | 31 | 66 | 14.900 | **31.500** | 39.400 | 116.000 | 13 % | **27 %** | 34 % |
| 30 | 1,21 | 91 | 169 | 43.700 | **81.300** | 101.700 | 280.000 | 16 % | **29 %** | 36 % |
| 50 | 1,21 | 151 | 265 | 72.500 | **127.000** | 158.700 | 444.000 | 16 % | **29 %** | 36 % |
| 70 | 1,39 | 211 | 413 | 101.300 | **198.100** | 247.700 | 607.000 | 17 % | **33 %** | 41 % |
| 80 | 1,26 | 241 | 423 | 115.700 | **202.900** | 253.600 | 689.000 | 17 % | **29 %** | 37 % |

Wie stark das Ergebnis von der Kill-Zahl abhängt (Anteil an der Arena, ohne / mit Bonus):

| Kills je Stunde | Stufe 10 | Stufe 30 | Stufe 50 | Stufe 70 | Stufe 80 |
|---:|---:|---:|---:|---:|---:|
| 360 (6/min) | 20 / 25 % | 22 / 27 % | 21 / 27 % | 24 / 31 % | 22 / 28 % |
| 480 (8/min) | 27 / 34 % | 29 / 36 % | 29 / 36 % | 33 / 41 % | 29 / 37 % |
| 600 (10/min) | 34 / 42 % | 36 / 45 % | 36 / 45 % | 41 / 51 % | 37 / 46 % |

Was das gegen die Goldsenken heißt (Stufe 50, ohne Bonus, etwa 127.000 Gold je Stunde):

- XXL-Lebenstrank (4.800): etwa 26 Tränke je Stunde Farmen. Vorher waren es 15.
- Schmied +10 bis +14 (4.000–10.000 je Versuch): mehrere Versuche je Stunde statt einem.
- Lager (1.000) und Gilde (5.000): nach wenigen Minuten bezahlt.
- Kriegsross (200.000, ab Stufe 40, dort etwa 106.000 je Stunde): knapp 2 Stunden statt 3,5.
- Glutschwinge (500.000, ab Stufe 60, dort etwa 167.000 je Stunde): etwa 3 Stunden statt knapp 6. In der Arena sind es
  etwa 1 bis 1,5 Stunden.

Das Ergebnis: Farmen bringt jetzt spürbar Gold, etwa 1,8- bis 2-mal so viel wie bisher. Die Arena bleibt mit etwa dem
3- bis 3,5-Fachen klar vorne.

## Anzeige

- Normale Monster: Das Gold wird sofort gutgeschrieben. Am Monster erscheint eine kleine Zahl („+265 Gold“), und eine
  Münze fliegt zur Figur.
- Unten rechts sammelt die Beuteliste das Gold in einer Zeile „Gold × …“. Es gibt einen Münzklang je 0,6 s, nicht
  einen je Kill.
- Goldbeutel: Der Beutel liegt mit Namen und Betrag kurz am Boden und fliegt dann zur Figur. Das ist die bestehende
  Beute-am-Boden-Mechanik (`ui.loot` → `groundLoot`).
- Seelensteine wie bisher: „Gold“ in der Beute am Boden.
- Kein Eintrag im Systemchat.

## Mehrspieler

- Es gelten die bestehenden Kill-Regeln: Gold bekommt nur, wer beim Kill berechtigt ist (`netEligible`: selbst
  getroffen, oder ein Gruppenmitglied hat getroffen und man steht in der Nähe).
- Jeder rechnet sein Gold selbst (`rewardKill`). Der Host rechnet nur sein eigenes, also verdoppelt sich nichts.
- **Gruppe** (`partyGold`, `js/gruppe.js`): Anders als die EP wird das Gold geteilt. Die Mitglieder in der Nähe
  (dieselbe Regel wie bei `partyXp`) bekommen zusammen das Gold des Monsters plus 10 % je weiterem Mitglied. Im Modus
  „gleich“ bekommt jeder denselben Anteil, im Modus „Stufe“ richtet er sich nach der Stufe.
  - Beispiel: Zu zweit bekommt jeder 55 % des Kills.
  - Je Kopf und Stunde bringt eine Gruppe damit etwa so viel wie allein, plus ein kleiner Bonus fürs Zusammenspielen.
- Feste Bossbeute (Gold aus `bossLoot`, `raidLoot` und Instanzen) bekommt weiter jeder voll, wie bisher.

## Dateien

- `js/kampf.js`: `KILL_GOLD`, `killGoldBase`, `killGoldGap`, `killGoldType`, `killGoldRoll`, `killGoldShow`; dazu
  `rewardKillInner`
- `js/gruppe.js`: `partyGold`
- `js/herausforderung.js`: Kommentar und Text, dass Arena-Monster weniger Gold geben als draußen
- `js/daten/ratgeber-wissen.js`: „Wie komme ich an Gold?“ und „Gibt es in der Prüfungsarena Beute?“
- `js/sprachen/en.js`: geänderter Arena-Hinweis. „Goldbeutel“ und „+{0} Gold“ waren schon übersetzt.

## Tests

- `node --check` auf alle geänderten Dateien.
- Spieltest im Browser: Krieger auf Stufe 50, echte Monster mit `killMonster`, `gainXp` stumm, damit die Stufe
  gleich bleibt.

| Prüfung | Ergebnis |
|---|---|
| Einzelner Kill | Gold kommt an, „+142 Gold“ am Monster, Zeile „Gold × 142“ in der Beuteliste |
| 2.000 Kills, Frostgeist, hpMul 0,9, Stufe 50 | Ø 205, kleinster 111, größter 1.281 (Modell: 207) |
| Monster Stufe 40 bei Spielerstufe 50 | Ø 78 |
| Monster Stufe 30 bei Spielerstufe 50 | Ø 13 |
| Bonus „Mehr Gold“ 25 % | Ø 261 (+27 %, innerhalb der Streuung); `monsterGold(100)` = 125 |
| Gruppe zu zweit, gleiche Stufe | Ø 116 (55 %); `partyGold(1000)` = 550 in beiden Modi |
| Seelenstein Stufe 50 | Ø 2.313 je Stein (50 Steine) |
| Monster mit `gold: [0, 0]` | 0 |
| Goldbeutel | 905 Gold. Er lag als „Goldbeutel × 905“ am Boden und kam danach in die Beuteliste. |

## Offen

- Die Kills je Stunde draußen und die Dauer eines Arena-Laufs sind Annahmen, nicht über eine echte Spielstunde
  gemessen. Bei sehr schnellem Farmen (10 Kills je Minute) und vollem Bonus liegt Farmen bei etwa 45 % der Arena.
  Wenn das zu viel ist: `KILL_GOLD.per` senken.
- Kein Mehrspieler-Test mit zwei echten Browsern gelaufen. Die Kill-Regeln (`netEligible`, Host und Client) sind
  unverändert; die Teilung ist nur einzeln geprüft.
