# Dungeon-Aufbau (seit 13.7)

Jeder normale Dungeon hat seinen eigenen Grundriss. Er wird aus der Kennung des Dungeons gewürfelt (`dungeonPlan` in `js/welt.js`) und ist für alle Spieler gleich.

## Grundriss

- Der Block eines Dungeons ist in ein Raster aus 3 × 4 Feldern geteilt.
- Ein Weg aus 6–8 Räumen windet sich ohne Kreuzung vom Start zum Bossraum. Gültig ist nur ein Weg mit mindestens drei Kurven, sonst wird neu gewürfelt.
- Dazu kommen 1–2 Seitenräume als Sackgasse:
  - **Schatzkammer**: Truhe und Goldhaufen, bewacht von Gruppen beider Monsterarten.
  - **Schrein**: Altar mit schwebendem Kristall in der Portalfarbe, ebenfalls bewacht.
- Gänge laufen als „Z“ mit einem Knick zwischen den Räumen, nicht mehr nur gerade.

## Raumformen

| Form | Aussehen |
|---|---|
| Halle | Rechteck mit unregelmäßigen Höhlenrändern |
| Rundsaal | Ellipse |
| Kreuz | Rechteck ohne Ecken |
| Säulenhalle | Säulen im Raster (blockieren, `OBJ.PILLAR`) |

- Größere Kampfräume bekommen manchmal ein Becken: im Basalt Lava, sonst Wasser.
- Auf dem Boden liegen je Dungeon Knochen, Pilze, Kristalle oder Kiesel.

## Schmuck (3D und 2D)

- **Alle Räume**: Feuerbecken in der Portalfarbe.
- **Kampfräume**: dazu Wächterstatuen oder Banner.
- **Bossraum**: Thron, zwei Banner, zwei Statuen und ein Kreis aus Feuerbecken.
- Die Farben kommen aus der Wand- und Portalfarbe des Dungeons.

## Monster

- Jeder Kampfraum auf dem Weg bekommt eine Gruppe, große Räume zwei.
- Die Arten wechseln sich ab und mischen sich zum Boss hin.
- Die Seelensteine stehen auf etwa einem und zwei Dritteln des Wegs.

## Unverändert

Endboss-Arenen und der Höllenthron behalten ihren festen Aufbau.

## Später: jeder Besuch anders

Sobald der eigene Spielserver läuft, kann er beim Betreten einen neuen Startwert würfeln und an alle Spieler der Gruppe schicken. Heute baut jeder Spieler die Welt selbst, deshalb muss der Grundriss bei allen gleich sein.
