# Waffen-Schein, Stiefel und Hüfte (seit 14.74)

Spielerbild: Krieger in goldener Göttlich-Rüstung mit zwei Äxten, Schwertaura an, Kamera von vorn. Drei Wünsche:

1. „Der Aura-Buff ist in der Waffe/Axt einfach so viereckig … eher wie eine Feuer-Aura ein bisschen über die Waffe hinaus,
   aber nicht so krass wie die Kampfrausch-Aura.“
2. „Die Schuhe kommen gar nicht richtig zur Geltung.“
3. „Über den Schuhen in der Taille guckt vorne und hinten etwas aus der Rüstung raus – verbuggt.“

## 1 | Waffen-Schein als Flammenhülle

**Ursache.** Das Leuchten der Waffe (Schwertaura und alle Buffs mit `weaponGlow`, Plus-Stufe ab +4, `poseWeaponGlow`
der Fertigkeits-Posen) war ein additives Grundmaterial auf einer festen Hülle aus `weapon3` (`shell(...)`): ein
abgerundeter Kasten um Klinge, Axtblatt, Bogen, Fächer, Sense, eine Kugel um Stab- und Glockenkopf. Auf der Axt wurde
daraus das helle Rechteck aus dem Spielerbild. Die Schwertaura legte zusätzlich eine „Lichtklinge“ (drei Lichtstäbe
entlang der Waffenachse, 20 % hinter dem Griff bis 40 % über die Spitze) und vier Lichtflecken entlang der Achse
darüber – bei Äxten ein Stab entlang des Stiels.

**Änderung.**
- `wglowAdder3` / `wglowGeo3` (drei-ausruestung.js): jedes Teil der Waffe kommt ein zweites Mal in die Leuchtgruppe
  `wglow`, mit Normalen, die nur von der Lage im Teil abhängen (vom Mittelpunkt nach außen, nach den Maßen des Teils
  gestreckt). Gleiche Punkte haben gleiche Normalen, darum reißt die aufgeblähte Hülle an Kanten nicht auf und wird rund.
  Die Kästen/Kugeln (`shell`) sind entfallen. Nur Spielfiguren bekommen die Hülle (`c.gear`), Händler/Wachen/Monster
  leuchten nie.
- `figWeaponGlowMat` (drei-figuren.js): eigener Shader mit Skelett. Der Vertex-Shader bläht die Hülle entlang der Normalen
  (Rauschen in der Ruhehaltung, klebt also an der Waffe), nach oben zeigende Stellen züngeln in Weltrichtung nach oben.
  Beidseitig gezeichnet: die **Rückseite** ist hinter der Waffe verdeckt und bleibt nur dort sichtbar, wo die Hülle über
  den Umriss hinausragt – der Flammensaum (außen weich, in Zungen zerrissen, außen satter, innen heller); die
  **Vorderseite** gibt nur einen leichten Schimmer auf der Waffe und blendet zum Hüllenrand aus (keine Kante). Farbe und
  Deckkraft wie bisher über `.color` / `.opacity`.
- Stärke je Anlass (`wgFlame3`): Aura-Buff 0,045 Ausdehnung / 0,075 Zungen, Plus-Stufe ruhig und eng (0,022 / 0,025,
  weniger Flackern), Fertigkeits-Posen dazwischen.
- `schwertBlade3` (ninja-fx.js): Lichtklinge und Lichtflecken entlang der Achse entfernt; die aufsteigenden Funken
  bleiben, an der Spitze ab und zu ein kleiner weicher Lichtfleck. Keine Bodenringe/Runen/Sterne.
- `warmPrograms`: die Leuchthülle der Probefigur ist sichtbar geschaltet, damit der neue Shader beim Vorwärmen übersetzt
  wird (vorher war das Waffenleuchten dort unsichtbar und wurde gar nicht vorab übersetzt).

Geprüft für Schwert, Zweihänder, Axt (zwei Äxte), Streitaxt, Dolch (zwei Dolche), Bogen, Stab/Zepter, Sense, Fächer,
Glocke (Eckpunktzählung) und im Bild für Äxte, Zweihänder, Schwerter, Dolche, Bogen, Magierstab.

**Leistung.** Die Hülle ist eine Kopie der Waffenteile (gleiche Zeichenaufrufe wie vorher: ein Mesh je Figur, nur
sichtbar, wenn die Waffe leuchtet). Eckpunkte der Leuchthülle je Spielermodell (vorher → nachher), zum Vergleich das
ganze Modell (`lit`):

| Waffe (Stufe) | wglow vorher | wglow nachher | lit |
|---|---|---|---|
| zwei Äxte (T3 / T9) | 192 | 3484 / 4782 | 22,9k / 26,7k |
| Zweihänder (T3 / T9) | 96 | 1148 / 1992 | 20,7k / 23,9k |
| zwei Schwerter (T3 / T9) | 192 | 2296 / 3984 | 21,8k / 25,4k |
| zwei Dolche (T3 / T9) | 192 | 1426 / 1624 | 17,8k / 19,8k |
| Bogen (T3 / T9) | 96 | 1364 / 1330 | 17,7k / 19,6k |
| Magierstab (T3 / T9) | 117 | 616 / 1175 | 15,6k / 18,8k |
| Sense (T3 / T9) | 96 | 1032 / 3032 | 12,8k / 17,5k |
| Fächer / Glocke (T9) | 100 / 117 | 2425 / 2053 | 18,7k |

Shaderkosten: ein Rauschen je Eckpunkt, zwei je Bildpunkt – nur auf der Waffe und nur während sie leuchtet.

## 2 | Stiefel

**Ursache.** Angelegte Stiefel waren ein schmaler Schaft (bis 0,2 hoch, so dick wie das Bein) und ein kurzer Kasten als
Fuß (vorn bei legR·2,05). Der Rock der Krieger/Ninja reicht bis 0,23 über den Boden und ist vorn ~0,25 tief, die Robe
(Magier, Schamane, Nekromant) bis 0,02 über den Boden mit 0,27 Tiefe: Die Füße lagen fast ganz darunter. Beim Krieger
in Göttlich hingen außerdem drei Lagen Beintaschen bis 0,075 über den Boden.

**Änderung** (`humanoid3`, nur angelegte Stiefel, `bootNew`):
- Schaft leicht ausgestellt, breite umgeschlagene Stulpe (unter Beinschienen nur ein schmaler Rand, sonst stach sie
  durch die Schiene), Fuß länger (Spitze legR·2,7) mit runder Kappe, dicke Sohle mit Absatz, Riemen mit Schnalle,
  ab Stufe 2 Nieten an der Stulpe.
- Krieger (Plattenstil) ab Stufe 1: Ristplatte und Knöchelschalen aus Metall.
- Roben: Fuß noch länger (Spitze legR·3,3) mit spitzer, leicht aufgebogener Schuhspitze – schaut unter dem Saum hervor
  (vorher unsichtbar).
- `gearBoots3`: Stufenmerkmale richten sich nach Ferse/Spitze (`g.footZ0/footZ1`): Eisenkappe (Stufe 2), Krallen (3),
  leuchtende Sohlenkante (5, 8, 9) über die ganze neue Länge, Tentakelsporn (8) an der Ferse. Sonne (7) und Stern (9)
  der Beinschiene sitzen unten am Schienbein statt am Knie (dort steckten sie hinter Beintaschen/Rock und nur die
  Strahlen stachen heraus).
- Göttlich-Rüstung (Krieger): die zwei zusätzlichen Lagen Beintaschen enger gestaffelt (0,045 statt 0,075), die untere
  verdeckt die Stiefel nicht mehr.

## 3 | Durchstechende Teile an der Hüfte

**Ursache.** Die beiden „Stoffbahnen“ des Rocks (Krieger, Ninja; `roundBox 0,17 × 0,22` bei hipY − 0,17, z = ±0,21,
mit der Unterkante nach innen gekippt) lagen oben im Rock (der vorn ~0,25 tief ist) und hingen unten 0,11 unter dem
Rocksaum heraus – vorn zwischen den Beintaschen und hinten unter dem Umhang bis auf die Stiefel. Genau das dunkelrote
Stück im Spielerbild. Dazu am Krieger: Dorn am Knie (`greaveSpike`) und Sonne/Stern der Göttlich/Ewig-Schiene, die
unter den Beintaschen hervorstachen.

**Änderung.**
- Stoffbahnen kürzer (0,14), außen auf dem Rock mit dessen Neigung, Unterkante am Rocksaum; unter Beintaschen
  (Krieger, auch Federtaschen) entfallen sie ganz – dort lagen sie sonst vor den Platten.
- Kniedorn nicht unter Beintaschen; Sonne/Stern der Schiene unten am Schienbein (siehe 2).
- Geprüft (Bilder vorn/hinten, vorher/nachher): Krieger Stufe 0–7 (Mann; Stufen 0–5 noch mit einer Zwischenfassung der
  Stoffbahnen, Endstand in Stufe 6, 7, 9 und den Collage-Bildern), Stufe 4 (Frau, Zweihänder), Ninja Stufe 2 und 8
  (Frau, Dolch), Magier Stufe 1 und 7 (Mann); dazu die Collage-Sätze vorn/hinten/seitlich. Gürteltaschen, Köcher, Umhang, Schärpenenden der Ninja und Tentakel
  (Stufe 8) liegen wie gewollt außen und stechen nicht durch.

## Tests

- Vorher/Nachher im echten Spiel (eigene Server: Stand 14.73 auf 8874, Arbeitsstand auf 8875, Playwright, SwiftShader,
  deviceScaleFactor 1, Schulterkamera nah, Körperaura für die Nahaufnahmen ausgeblendet, damit der Waffen-Schein
  sichtbar bleibt). Collage: `scratchpad/aura74/collage.jpg`.
- `node --check` auf drei-figuren.js, drei-ausruestung.js, ninja-fx.js.
- s73-Kopie gegen den Arbeitsstand (Port 8875): 12 Charaktere, alle Fertigkeiten und Klassensegen ohne Fehler (2D wie
  die Vorlage); dazu eine 3D-Fassung derselben Kopie (Grafik „plus“, SwiftShader, Shader-/WebGL-Fehler mitgezählt).
- Eckpunktzählung aller Waffenarten (Tabelle oben) direkt aus `humanoid3`/`model3` im Spiel.

## Offen

- 2D-Ansicht unverändert (dort ist das Waffenleuchten weiterhin ein Schein um die gezeichnete Waffe).
- Die Beinschienen der Krieger (ab Stufe 2, Halbschalen aus `cap3`) stehen unter den Beintaschen als helle, gebogene
  Kanten hervor; das ist ihre bisherige Form und wurde nicht umgebaut.
- Beim Laufen schwingen die Beine weiter durch Rock und Robe (Rock hängt am Hüftknochen) – nicht Teil dieses Auftrags.
