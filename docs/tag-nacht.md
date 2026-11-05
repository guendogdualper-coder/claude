# Tag und Nacht (seit 13.8)

## Ablauf

- **Zyklus**: 40 Minuten, ausgerichtet an der echten Uhrzeit (UTC). Dadurch sehen alle Spieler im Kanal dieselbe Tageszeit.
  - 25 Minuten Tag
  - 3 Minuten Abenddämmerung
  - 9 Minuten Nacht
  - 3 Minuten Morgendämmerung
- **Anzeige**: Unter der Karte zeigt ein Symbol Sonne oder Mond. Der Hinweis darauf nennt die Minuten bis zum Wechsel.
- **Wo**: auf allen Maps. In Dungeons gibt es keine Nacht.

## Nachts

### Licht

- **3D**: Himmel, Nebel und Licht werden bläulich und dunkler, die Sonne wird zu Mondlicht. Feuerbecken und Laternen stechen dadurch hervor.
- **2D**: Eine dunkelblaue Färbung liegt über dem Bild.

### Nachtmonster

Auf jeder Map kommen Nachtmonster dazu (`js/daten/nachtmonster.js`). Bei Tagesanbruch ziehen sie sich zurück, sobald kein Spieler sie sieht.

| Map | Gebiet | Nachtmonster |
|---|---|---|
| 1 | Sonnenwiesen | Schattenwolf (7), Irrlicht (8) |
| 4 | Dunkelwald | Nachtluchs (16), Mondspinne (17) |
| 5 | Orktal | Grabhyäne (25), Nachtskorpion (27) |
| 6 | Ödland | Schattendämon (37), Aschegeist (38) |
| 7 | Frostgipfel | Frostschatten (46), Nordlichtgeist (47) |
| 8 | Totenmoor | Knochenwolf (56), Moorgeist (57) |
| 9 | Feuerberg | Schattenkatze (66), Glutgeist (67) |
| 2 | Sandwüste | Mondkobra (36) |
| 2 | Nagadschungel | Dschungelgeist (46) |
| 3 | Donnerklamm | Sturmgeist (56) |
| 3 | Titanenkamm | Schattengargoyle (70) |
| 10 | Kristallhänge | Leerenwolf (77) |
| 10 | Leerenschlund | Sternenschemen (79), Leerenwolf (77) |

### NPCs

- Die Wanderer des Tages schlafen.
- Auf jeder Map ist dafür ein **Nachtwanderer** unterwegs.
- In Kazehana schlafen das Kind und der Bauer. Die **Nachtwächterin Yuki** und ein Laternenanzünder sind unterwegs.

### Nachtjagden

- Nachtwanderer vergeben Nachtjagden: 12 Nachtmonster ihrer Map besiegen.
- Belohnung: Gold, EP und eine Verstärkung. Sie kommt sofort, sobald die Jagd erfüllt ist, auch wenn es inzwischen Tag ist.
- Nachtjagden sind Nebenquests und lassen sich im Questfenster (L) abbrechen.

## Mehrspieler

- Die Nachtmonster rechnet der Host.
- Mitspieler bekommen neue Monster über den Zustand des Hosts.
- Entfernte Monster meldet der Host mit der Nachricht `gone`.

## Geister in 3D

Die Geister sind neu gebaut (`ghost3`): Taille und Schultern, spitze Kapuze, Glockenärmel mit Krallen, zerfetzter Saum und Nebelschweif. Vorher waren sie eine runde Säule.
