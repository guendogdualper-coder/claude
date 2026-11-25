# Städte verteilt (seit 14.50)

Wunsch: Kazehana (Map 1) bleibt in der Mitte, die Städte und Lager der übrigen Maps liegen nicht mehr alle in der
Mitte, sondern je Map an einer eigenen, festen Stelle – so ist jede Map anders aufgebaut.

## Wo liegt welche Stadt?

`WORLD_MAPS[].town` in `js/daten/zonen.js`: Kacheln ab der linken oberen Ecke der Map (jede Map 360 × 220).
Vorher lag jede Stadt bei (180, 110).

| Map | Name | Stadt/Lager | Lage |
| --- | --- | --- | --- |
| 1 | Kazehana | Kazehana | Mitte (unverändert) |
| 4 | Dunkelwald | Waldlager | (110, 95) – westliches Drittel |
| 5 | Rostschlucht | Talwacht | (250, 52) – nahe dem Nordrand, rechts |
| 6 | Ödland | Aschenlager | (75, 160) – Südwest-Ecke |
| 2 | Schlangental | Oase Sahra | (72, 75) – Nordwesten |
| 7 | Frostgipfel | Frostlager | (290, 55) – Nordost-Ecke |
| 8 | Totenmoor | Moorwacht | (285, 150) – Südosten |
| 3 | Donnerklamm | Klammfeste | (140, 150) – südwestliches Drittel |
| 9 | Feuerberg | Glutlager | (175, 162) – am Südrand, Mitte |
| 10 | Kristallabgrund | Lichtwacht | (265, 70) – Nordosten |

Gewählt so, dass

- zum Felsrand (MAP_BORDER) mindestens 29 Kacheln (Lager, halbe Mauer 13) bzw. 36 (Städte, 20) Platz bleiben –
  vor jedem der vier Tore liegt Land, die Wege führen hinaus;
- die Instanz-Tore in den Ecken (`daten/instanzen.js`, je Map zwei Ecken) frei bleiben: keine Stadt liegt in einer
  belegten Ecke;
- die Dungeon-Eingänge (`entry.dir`/`entry.dist` ab der Stadt, z. B. Schlangentempel 84 Kacheln östlich,
  Titanenschmiede/Kristallkaverne 84 westlich) und das Endboss-Tor südlich der Stadt auf der Map bleiben.

Alles ist feste Zahl, kein Zufall: alle Mitspieler erzeugen dieselbe Welt. Die Wildnis wird weiter aus demselben
Startwert erzeugt; weil die Stadt woanders ausgespart wird, liegen Bäume, Felsen und Wege auf den Maps 2–10 neu.

## Was mitzieht

Fast alles rechnete schon ab `wm.cx`/`wm.cy` (seit 14.50 = Stadtlage statt Mitte):
sichere Zone (`inVillage`, `TOWN_SAFE`), Mauer und Stadtformen (`applyTownLayout`, 14.16), Stände, NPCs,
Weltentor, Teleportsteine, Spawn/Wiederbeleben (`mp.spawn`, `villageSpawn`), Reiseziele der Wegweiserin,
Gebietsringe (`mapZoneAt`: Abstand ab der Stadt), Dungeon-Eingänge, wandernde Eingänge (14.17), Wanderer,
Minikarte, große Karte, 2D und 3D (kachelbasiert).

Neu angepasst:

- `wm.reach` (zonen.js): Abstand von der Stadt zur fernsten Ecke. Monstergruppen und Seelensteine verteilen sich
  im Ring bis dorthin (`randomSpotInZone` in welt.js, `zoneRingSpot` in karte.js) – vorher halbe Diagonale. So
  bleiben die stärkeren Gruppen (von/bis nahe 1) am weitesten vom Lager weg. In der Mitte (Kazehana) ergibt
  das genau den alten Wert.
- Geschwungene Wege (13.91, `layRoads`): die Reichweite der fernen Wegziele wird ab der Stadt bis an den
  inneren Rand der Map gerechnet (`reachAt`), nicht mehr als halbe Map-Größe.
- Große Karte: Gebietsnamen stehen zuerst auf der weiteren Seite der Map und bleiben innerhalb der Map.

## Alte Spielstände

`WORLD_VERSION` 14 → 15 (welt.js). Beim Laden eines Standes aus Welt 14 (spieler.js, `makePlayer`):

- Kazehana, Dungeons, Arenen: unverändert, es geht an derselben Stelle weiter.
- Maps 2–10: Lag die Stelle in oder nahe der alten Stadt (Quadrat halbe Mauer + 10 um die alte Mitte
  `wm.oldCx/oldCy`), geht es am Spawn der neuen Stadt derselben Map weiter; sonst an derselben Stelle.
- Ist die Stelle blockiert (Baum, Fels, Wasser, Mauer), geht es seit 14.50 in die Stadt dieser Map
  (`villageSpawn(p)`), vorher immer nach Kazehana.

## Tests (Port 8795)

- `node --check` aller js/*.js, js/daten/*.js, js/sprachen/*.js, sw.js: ohne Fehler.
- Kazehana und Dungeon-Streifen: Prüfsumme aller Kacheln und NPCs von Map 1 gleich wie in 14.47.
- Erreichbarkeit je Map (Breitensuche ab Ankunft über begehbare Kacheln + Teleportsteine): alle Eingänge und NPCs
  erreichbar, 100,0 % der freien Kacheln (Rest: Mini-Taschen von 6 bzw. 18 Kacheln in der Wildnis von Map 2 und 8,
  von Bäumen/Sumpf umschlossen – wie die 9 Kacheln in Kazehana, die es schon vorher gab).
- staedte-merge/test.js (Stadtformen, sichere Zone, Teleportsteine, Spielstand auf Lava): ohne Fehler.
- Spielstand-Umzug (Welt 14): alte Mitte Map 5/2/10 → neue Stadt (sicher); Wildnis Map 5 und Kazehana bleiben;
  blockierte Stelle Map 7 → Stadt von Map 7.
- Smoke-Tests s73 (12 Charaktere), s72, s72 mit D3=1, drache-hoehe (69 OK), dungeon (24 OK): keine Seitenfehler.
- Bilder der großen Karte vorher/nachher (Maps 2, 3, 5, 7, 10): Scratchpad `staedte48/`.

## Offen

- Die Wildnis der Maps 2–10 ist neu gewürfelt (Bäume, Felsen, Wege an anderen Stellen) – gewollt, aber alte
  Gewohnheiten der Spieler passen nicht mehr.
- Mehrspieler: alle Mitspieler brauchen dieselbe Version (sonst andere Welt); wie bei jeder Weltänderung.
- Map 2/3/10: der innere Gebietsring (bis 66 Kacheln) wird am Rand etwas abgeschnitten, die Monstergruppen des
  inneren Rings stehen dadurch etwas dichter.
