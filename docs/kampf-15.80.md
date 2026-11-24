# Kampf in Version 15.80

Drei Änderungen auf Wunsch der Spieler:

1. Fähigkeiten können nicht mehr ausgewichen oder geblockt werden.
2. Die gemeinsame Pause zwischen zwei Fertigkeiten beträgt 1,5 s statt 2 s.
3. Der neue Ausrüstungs-Bonus **Zaubergeschwindigkeit** verkürzt die Abklingzeiten und diese Pause.

## 1. Fähigkeiten treffen immer

`damagePlayer(amount, attacker, o)` in `js/kampf.js` kennt die Angabe `o.sure`. Damit wird weder Ausweichen noch
Blocken gewürfelt. Schaden über Zeit (`o.dot`) war schon vorher nie ausweichbar.

**Immer treffen (`o.sure`):**

- Fertigkeiten anderer Spieler: Duell, offenes PvP und Turnierarena. `pvpOutgoing` schickt dafür `sk: 1` mit,
  wenn `opts.skill` gesetzt ist und es kein Grundangriff ist. `pvpReceiveHit` reicht den Wert als `sure` weiter.
- Boss-Stampfer: `gegner.js`, auch der Stampfer über das Netz in `netz.js`.
- Raid-Spezialangriffe: `gegner.js` und `hoellenthron.js`.
- „Untergang“ der Endbosse: `endboss.js`.
- Eigene Boss-Angriffe: `bossangriffe.js`, `bskHurt`.
- Instanz-Mechaniken und Gefahrenflächen: `instanzen.js`.
- Geschosse von Bossen und Raid-Bossen, also Salven: `kampf.js`, Geschoss-Treffer.

**Bleiben ausweichbar und blockbar:**

- Grundangriffe anderer Spieler
- normale Monsterschläge, auch über das Netz (`mhit`)
- normale Monstergeschosse

**Anzeige:** Im Charakterfenster unter „Werte“ haben die Zeilen Blocken und Ausweichen einen Hinweis (title,
14 Sprachen). Der Ratgeber hat die Frage „Kann man Fertigkeiten ausweichen oder sie blocken?“.

**Test:** 100 % Ausweichen bzw. Blocken, je 20 Treffer:

| Treffer | Ergebnis |
|---|---|
| normale Schläge | 0 von 20 treffen |
| `sure` | 20 von 20 |
| PvP-Fertigkeit (`sk: 1`) | 20 von 20 |
| PvP-Grundangriff | 0 von 20 |
| Boss-Fähigkeit (`bskHurt`) | 20 von 20 |
| Schaden über Zeit | 20 von 20 (unverändert) |

## 2. Gemeinsame Abklingzeit 1,5 s

`GCD_CLASS_TIME` in `js/kampf.js` ist für Schamane, Nekromant, Magier und Krieger jetzt 1,5 s. Vorher hatten die
drei Zauberer 2 s, der Krieger hatte schon 1,5 s. Unverändert bleiben:

- Frostmagier: 0,5 s (`GCD_PATH_TIME`)
- Ninja: keine gemeinsame Abklingzeit

Ulti, Klassensegen, Tränke und Grundangriff zählen weiterhin nicht. Die Zeiten im Fertigkeiten-Hinweis (`tipps.js`)
und im Ratgeber stimmen damit überein.

## 3. Bonus Zaubergeschwindigkeit (`castSpeed`)

**Wo er gewürfelt wird:** Er ist ein normaler Bonus in `BONUS_TYPES` (`js/daten/gegenstaende.js`) und kommt auf
Waffe, Helm, Schultern, Umhang und Gürtel vor.

**Spanne:** 2–4 % auf Stufe 1, höchstens 8 % je Zeile. Auf Stufe 80 werden 3,8–7,6 % gewürfelt.

**Obergrenze:** Alle angelegten Teile zusammen höchstens 25 % (`BONUS_CAPS.castSpeed`). In die Werte kommt er über
`PLAYER_BONUS_KEYS` (`js/spieler.js`) als `game.stats.castSpeed`.

**Wirkung:** `castSpeedMul()` in `js/kampf.js` liefert 1 − Zaubergeschwindigkeit. Damit werden multipliziert:

- die Abklingzeit der fünf Fertigkeiten (`skillCooldown`). Das gilt auch für das Infofeld und die Uhr in der
  Leiste, die zeigen also schon den verkürzten Wert.
- die gemeinsame Abklingzeit (`gcdTime`) der eigenen Figur

Ulti und Klassensegen werden nicht verkürzt.

**Anzeige:**

- Charakterfenster, Seite „Werte“, unter Boni: „Zaubergeschwindigkeit x % / 25 %“ (`CHAR_NEW_BONI`)
- Vergleichsliste der Ausrüstung (`ausruestung.js`)
- Wiki: die Boni-Tabelle wird aus `BONUS_TYPES` erzeugt
- Ratgeber: „Was bewirkt Zaubergeschwindigkeit?“
- Übersetzung des Namens in 14 Sprachen; die Zeile „Name +{0} %“ übersetzt sich darüber mit

**Test:** Magier Stufe 80:

| Fall | Ergebnis |
|---|---|
| ohne Bonus | gemeinsame Abklingzeit 1,5 s, Abklingzeiten 6 / 2 / 7 / 14 / 12 s |
| vier Teile mit je 8 % | Summe 32 %, gedeckelt auf 25 % |
| mit 25 % | gemeinsame Abklingzeit 1,13 s, Abklingzeiten 4,5 / 1,5 / 5,25 / 10,5 / 9 s |
| 3000 gewürfelte Helm-Boni | 92× Zaubergeschwindigkeit (3,1 %), Werte 3,8–7,6 % |

## Balance-Messung

Gemessen mit `node tools/balance-sim.js --ohne-farm --stufen 80 --ausr gut`, je ein langer Lauf vorher (15.79) und
nachher. Die Gesamtwertung ist relativ: 100 ist der Durchschnitt aller Wege.

| Weg | vorher | nachher |
|---|---:|---:|
| Krieger · Klinge | 89 | 86 |
| Krieger · Leib | 92 | 88 |
| Ninja · Dolch | 100 | 98 |
| Ninja · Falke | 83 | 79 |
| Schamane · Drache | 83 | 84 |
| Schamane · Heilung | 86 | 90 |
| Nekromant · Seelen | 99 | 96 |
| Nekromant · Knochen | 98 | 103 |
| Magier · Feuer | 97 | 105 |
| Magier · Frost | 115 | 111 |
| Magier · Blitz | 97 | 105 |
| Magier · Erde | 96 | 100 |

**Ergebnis:**

- Die Zauberer mit gemeinsamer Abklingzeit gewinnen 1 bis 8 Punkte, Nekromant · Seelen ausgenommen (99 → 96).
- Krieger und Ninja liegen dadurch relativ 2 bis 4 Punkte tiefer. Ihre eigenen Werte haben sich nicht geändert,
  beim Krieger war die gemeinsame Abklingzeit schon vorher 1,5 s.
- Frost bleibt bei 0,5 s gemeinsamer Abklingzeit und rutscht relativ ab.
- Die Spanne ist 79–111 statt 83–115. Kein Weg reißt aus.

**Vorsicht beim Lesen:** Einzelne Messwerte (Einzelziel, 5 Ziele) schwanken zwischen zwei Läufen stark. Der
Dolch-Ninja ohne jede Änderung zeigte −8 % bzw. −16 %. Deshalb wird nur die Gesamtwertung verglichen.

Die Zaubergeschwindigkeit ist darin nur zufällig enthalten: Die Ausrüstung „gut“ würfelt sie wie jeden anderen
Bonus. Volle 25 % verkürzen die Abklingzeiten um ein Viertel. Ein Zauberer, dessen Schaden an den Abklingzeiten
hängt, macht dann bis zu einem Drittel mehr Schaden mit Fertigkeiten. Dafür fehlen ihm auf vier bis fünf Teilen
andere Boni.
