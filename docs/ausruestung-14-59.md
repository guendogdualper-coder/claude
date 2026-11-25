# Ausrüstung 14.59: Farbmix je Teil, passende Sets, detailreichere Symbole und Rüstungen, Gold ohne Überstrahlen

Wunsch des Spielers: auf die kleinen Details achten (Rüstung, wie sie sitzt, Schwerter in der Hand). Am Anfang soll nicht
jedes Teil dieselbe Farbe haben, sondern etwas durcheinander sein; erst mit höheren Stufen sollen Teile farblich
zueinander passen. Die Figur im Charakterfenster soll schöner aussehen.
Nachtrag (Screenshot Inventar, goldenes Set +20): Schuhe, Brustrüstung und Umhang im Inventar zu schlicht; das Porträt
im goldenen Set völlig überstrahlt.

## Farbvarianten je Teil (js/figuren.js)

- `GEAR_HUES`: zehn Abenteurer-Varianten aus Stoff/Leder und Metall (Leder braun/Eisen, dunkles Leder/Bronze,
  verblichenes Moosgrün, Krapprot/Messing, Waidblau/dunkles Eisen, Ocker/Kupfer, Wollgrau, Pflaume/Bronze,
  Rostbraun/Schwarzeisen, Tannengrün/Messing).
- `gearVariant(it)`: feste Nummer je Gegenstand aus `uid`, Platz, Stufe und Art (FNV-Hash) – nie Zufall beim Zeichnen.
  Gegenstände von Mitspielern bringen sie als `fv` mit.
- `gearHue(it)` / `gearCol(it, farbe, metall)`: färbt die Stufenfarbe eines Teils um.
  - Stufe 0–4 (bis Veteran, Lv 22): 62 % Variante (Metall 53 %) → jedes Teil eigen, zusammengewürfelter Look.
  - Stufe 5–6 (Meister, Himmlisch): nur 28 % → nähern sich der Stufenfarbe an.
  - Göttlich und höher, epische/legendäre Teile (`rarity ≥ 3`, `legend`): unverändert → passendes Set der Stufe.
  - Set-Teile (`item.set`): Leitfarbe der Instanz aus `ITEM_SETS[id].color` (falls vorhanden), sonst eine feste
    Setfarbe aus dem Namen (`SET_HUES`: Leitfarbe, Akzent, Metallton) – alle Teile eines Sets gleich, egal welche Stufe.
- `gearHueKey(it)` steckt im Modellschlüssel (`playerKey3`) und im Symbol-Schlüssel (`itemIconUrl`), damit jede Variante
  ein eigenes gebackenes Modell bzw. Symbol bekommt.

## 3D (js/drei-figuren.js, js/drei-ausruestung.js)

- `playerConfig3`: Rüstung (Rumpf, Robe, Platten, Beschläge), Helm/Kapuze/Hut/Stirnband, Schultern, Umhang (Stoff,
  Futter, Spangen), Gürtel, Stiefel samt Stulpen und Schild jeweils in der Variante *ihres* Teils.
  `armorLook3` bekommt dafür die Umfärbung der Rüstung, `gearShoulders3`/`gearBoots3`/`gearBelt3`/`gearCape3` den
  Metallton ihres Teils, `shield3` den Gegenstand (bemalte Bretter beim Holzschild, Metall in der Variante).
- Schulterpanzer (`pauldron3`): Die großen Krieger-Panzer waren flache Scheiben; aus der Porträtkamera (Charakterfenster,
  leicht unter Schulterhöhe) sah man durch die offene Schale hindurch nur den hellen Randring – wie ein Reif um den Kopf.
  Jetzt höher gewölbt und etwas schmaler, stärker über die Schulter geneigt, mit dunkler Unterseite, Randring und
  Nieten sitzen genau auf der Plattenkante. Kleine Panzer (andere Klassen) unverändert.
- Schwerter/Großschwerter (Stufe 0, 1, 3, 4, 6): geschliffene Schneide – heller Grat entlang beider Kanten, Kern in
  Klingenfarbe, Hohlkehle darauf. Sichel-, Obsidian- und Leuchtklingen bleiben wie sie sind.
- Stiefel (angelegt): Absatz, Riemen über dem Rist mit Schnalle, ab Gut zwei Nieten an der Stulpe.
- Brustpanzer (Krieger, Spielfiguren): Halsreif, zwei Bauchreifen vorn, Nietenreihe am unteren Rand (Maße für Mann
  und Frau aus `CUIRASS3`/`CUIRASS3_F`, die Körperverformung von 14.53 nimmt sie mit).
- Umhang: Zierborte über dem Saum (Wolle, ab Gut Metallfaden; `capeBand3`) und Stehkragen im Nacken für die Stufen ohne
  eigenen Kragen.
- Dreiecke: Krieger tief ~31 000 → ~33 000 (+6 %), andere Klassen +2–4 %.

## Gold ohne Überstrahlen (Porträt und Welt)

- Ursache: Gold (#e8c46a, #fff2b0), Platin und weiße Roben lagen so hell, dass Himmels- plus Sonnenlicht (Toon-Material)
  über 1 kam – alles wurde gelbweiß ausgefressen, Formen verschwanden.
- `tameCol3`/`tameAdder3` (drei-figuren.js): Für Spielfiguren (`c.tame`) wird jede beleuchtete Farbe über 0,7 je Kanal
  weich gestaucht (Farbton bleibt, Gold etwas satter). Leuchtteile (glow/wglow/aura), Gesicht, Haut und Haare bleiben.
  Wirkt im Porträt und in der Welt.
- Göttlicher Krieger: weinroter Waffenrock unter dem Gold (vorher Gold unter Gold), damit die Platten Kontrast haben.
- Porträtlicht leicht zurückgenommen (Himmel 0,62 → 0,56, Sonne 0,88 → 0,80).

## Symbole (js/ausruestung.js, Zeichnungen in js/figuren.js)

- `drawItemArt`/`shieldArt`: Symbole in der Farbvariante des Teils (Rüstung, Helm, Schultern, Umhang, Gürtel, Schuhe,
  Schild), damit man im Inventar sieht, was man trägt. Waffen, Köcher und hohe Stufen unverändert.
- Neu gezeichnet mit Verläufen, Kanten, Nähten und Beschlägen (`bootIcon2D`, `chestIcon2D`, `capeIcon2D`, `beltIcon2D`,
  `helmIcon2D`):
  - Schuhe: zwei echte Stiefel schräg von der Seite – Schaft, Stulpe, Sohle mit Absatz und Rahmennaht, Riemen mit
    Schnalle; ab Gut Schnürung, Zehenkappe und Nieten, ab Drache Schienbeinplatte; Stufenmerkmal (Krallen, Kristall,
    Obsidiandorn mit Glut, Flügel, Sonnenscheibe, Leerensplitter, Stern).
  - Rüstung (Krieger): Harnisch mit Halsausschnitt und Armöffnungen, Mittelgrat, Brustwölbung, Metallrand mit Nieten,
    Gürtel, drei Beintaschen über dem Waffenrock; Leder mit Schnürung und Flicken, Kettenhemd mit Ringen, ab Gut
    Platte; Wappen je Stufe.
  - Umhang: fallendes Tuch mit Faltenbahnen, umgeschlagener Kante mit Futter, Saumborte und Saumform je Stufe (Fetzen,
    Wellen, Fangspitzen), Kragen (Kapuze, Fell, Hermelin, Splitter, Strahlen), Spangen mit Kordel, Rückenwappen.
  - Gürtel und Helm im selben Stil (Naht, Schnalle mit Dorn, Tasche; Glocke mit Glanz, Stirnreif mit Nieten, Nasal).
- Symbole werden in `ICON_HI` gebacken und als 144-Pixel-Bild gespeichert (vorher 96) – am Handy scharf.

## Netz (js/netz.js)

- `netPlayerState`: zusätzlich `eq[platz].fv` (Farbvariante, 0–9). Stufe, Seltenheit und `set` (vom Set-Helfer) kommen
  schon mit; damit rechnet der Mitspieler dieselbe Farbe. Ältere Versionen ohne `fv` sehen eine feste Variante aus
  Platz und Stufe.

## Tests

- `node --check` aller js/*.js, js/daten/*.js, js/sprachen/*.js, sw.js.
- Smoke-Tests: s73 (12 Charaktere, keine Seitenfehler), s72, s72_noshot (D3=1), Drachenhöhe td (69 OK, keine Seitenfehler).
- Netz-Prüfung: `fv` im eq, Schlüssel und Farbe beim „Mitspieler“ gleich der eigenen; Set-Teil → Setschlüssel,
  Göttlich → keine Umfärbung.
- Bilder (Scratchpad `ausruestung55/`): `vergleich-niedrig.png` (alle Klassen Mann/Frau, Lv 5 und Lv 10–15),
  `vergleich-hoch.png` (Göttlich episch, unverändert passend), `vergleich-set.png` (Set-Teile), `vergleich-waffen.png`
  (10 Waffen in der Hand), `vergleich-symbole.png` (Inventarsymbole mit Farbvarianten),
  `vergleich-symbole-stufen.png` (Schuhe, Rüstung, Umhang, Gürtel, Helm, Schultern Stufe 0–9),
  `vergleich-gold-portraet.png` (alle Klassen im goldenen Göttlich-Set +20).

## Offene Punkte

- 2D-Ansicht der Figur (figuren.js, `drawPlayer`) zeigt weiterhin die Stufenfarben; nur die Symbole sind umgefärbt.
- Göttlich/Abgrund/Ewig gemischt getragen ergeben weiterhin verschiedene Stufenfarben (je Stufe einheitlich).
- Dolche in Rückhandhaltung verschwinden in der Porträt-Pose fast hinter dem Arm.
- Ninja-, Robenklassen- und Magierrüstung haben noch ihre bisherigen (einfacheren) Symbole; neu gezeichnet ist der
  Krieger-Harnisch.
- Die weißen Göttlich-Roben (Magier) wirken trotz Dämpfung sehr hell – gewollt weiß, aber jetzt mit Schattierung.
