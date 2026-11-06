# Prompt: Jede Stadt anders – Formen, Inseln, Brücken und Teleportsteine

Arbeitsauftrag für Seelenstein. Texte im Spiel auf Deutsch, englische Übersetzung in `js/sprachen/en.js`. Eigene
Gestaltung, keine Städte oder Karten aus anderen Spielen nachbauen.

## Wunsch

Die Städte und Lager sollen nicht mehr alle gleich aussehen (heute: Quadrat mit Mauer, vier Tore, Stände an den
Mauern, Weltentor in der Mitte). Die ersten beiden Karten (Kazehana, Dunkelwald) dürfen viereckig bleiben. Ab der
dritten Karte in Spielreihenfolge bekommt jede Stadt eine **eigene Form** und einen eigenen Aufbau.

Spielreihenfolge: Kazehana (1) → Dunkelwald (4) → Orktal (5) → Ödland (6) → Schlangental/Sahra (2) →
Frostgipfel (7) → Totenmoor (8) → Donnerklamm (3) → Feuerberg (9) → Kristallabgrund (10).

## Vorschläge je Karte (Richtwert, darf angepasst werden)

| Karte | Idee |
|---|---|
| Orktal (5) | Festungslager in **Achteckform** mit Palisaden statt Steinmauer, zwei Tore statt vier, Stände im Kreis um einen Kampfplatz |
| Ödland (6) | **Ringstadt** um einen Aschekrater, Wege wie Speichen, innen ein erhöhter Platz mit dem Weltentor |
| Schlangental (2) | **Oasenstadt um einen See**: Häuser auf dem Ufer, das Weltentor auf einer Insel in der Mitte, zwei Holzbrücken |
| Frostgipfel (7) | **Terrassen** am Hang (L-Form), Treppen zwischen den Ebenen, Schneewehen an den Mauern |
| Totenmoor (8) | **Pfahldorf**: mehrere kleine Inseln im Moor, verbunden mit Stegen, schiefe Hütten |
| Donnerklamm (3) | Klammfeste: **zwei Hälften** links und rechts einer Schlucht, eine große Brücke und ein Teleportstein-Paar |
| Feuerberg (9) | **Inselring** in einem Lavasee: fünf Inseln, nur über **Teleportsteine** verbunden (im Kreis, „Kreisel“), das Weltentor auf der mittleren |
| Kristallabgrund (10) | Schwebende **Kristallplattformen** über dem Abgrund, Lichtbrücken und Teleportsteine, Zitadelle oben |

## Regeln, die gelten müssen

- **Gleiche Welt für alle**: Die Welt wird aus dem Startwert erzeugt (`welt.js`). Außerhalb der Stadt dürfen sich
  Wasser, Bäume, Felsen und Wege nicht verschieben. Die Zufallszahlen müssen dafür so verbraucht werden wie bisher
  (siehe die Kommentare um `genCamp`, `thinDrop`, `TREE_DROP`). Die Stadtform darf also nur entscheiden, was
  *innerhalb* ihres Bereichs steht.
- **Sichere Zone** (`inVillage`) folgt der echten Form statt dem Quadrat. Kein Schaden, keine Monster darin. Monster
  laufen nicht hinein (Wegfindung, `canStand`-Prüfungen für Monster).
- **Alles erreichbar**: Von jedem Ankunftspunkt (Weltentor, Tore, Wiederbelebungspunkt) muss jeder NPC, jeder
  Stand, das Weltentor und jeder Ausgang zu Fuß, über Brücken oder über Teleportsteine erreichbar sein. Dazu einen
  Test mit Breitensuche über die Kacheln schreiben, der für jede Stadt grün sein muss.
- **Teleportsteine**: antippen oder darauf stehen bleiben (0,6 s) → kurzer, eigener Lichteffekt (kein Bodenring,
  keine Runen, keine Sterne als Effekt) und Ortswechsel zum Partnerstein. Funktioniert im Mehrspieler (die Position
  geht wie sonst übers Netz), auch zu Pferd (Pferd steigt ab oder kommt mit).
- NPCs behalten ihre Aufgaben und Namen (`TOWN_PLACES`). Nur ihre Plätze ändern sich je Stadt. Stände, Lager, Post,
  Auktionshaus, Arena, PvP-Arena, Ratgeber und Wanderer müssen weiter da sein.
- Mauern, Tore, Palisaden, Stege, Brücken und Wasser in **2D und 3D** (drei-welt.js), auf der Minikarte und der
  großen Karte richtig. Die große Karte zeigt Teleportsteine mit einem kleinen Symbol und ihre Verbindung.
- Leistung: auf dem Handy nicht langsamer als heute (gleiche Anzahl Häuser/Deko ungefähr).
- Bestehende Spielstände: Wer in einer Stadt ausloggt, deren Form sich ändert, und auf einer Wasser- oder
  Mauerkachel landen würde, wird zum Weltentor dieser Stadt gesetzt.

## Lieferumfang

1. Datenbeschreibung je Stadt (Form, Tore, Brücken, Teleportpaare, NPC-Plätze), z. B. `TOWN_LAYOUTS` in
   `js/daten/` – keine verstreuten Sonderfälle im Code.
2. Erzeugung in `welt.js`, `inVillage` und Monster-Sperre nach Form.
3. 3D-Modelle für Palisade, Steg, Brücke, Teleportstein. Bestehende Häuser, Mauern und Tore wiederverwenden.
4. Erreichbarkeitstest (Breitensuche) für alle Städte, dazu Übersichtsbilder (2D von oben) und je Stadt ein
   3D-Bild.
5. Hilfe, Ratgeber-NPC (Suchwort „Teleportstein“), Changelog, README.
