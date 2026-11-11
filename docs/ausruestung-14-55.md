# Ausrüstung 14.55: Farbmix je Teil, passende Sets, Details an Schultern und Klingen

Wunsch des Spielers: auf die kleinen Details achten (Rüstung, wie sie sitzt, Schwerter in der Hand). Am Anfang soll nicht
jedes Teil dieselbe Farbe haben, sondern etwas durcheinander sein; erst mit höheren Stufen sollen Teile farblich
zueinander passen. Die Figur im Charakterfenster soll schöner aussehen.

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
- Dreiecke: Schultern +~270 je Krieger-Figur (Unterseite), Schwert +~100. Figuren sonst unverändert.

## Symbole (js/ausruestung.js)

- `drawItemArt`/`shieldArt`: Symbole in der Farbvariante des Teils (Rüstung, Helm, Schultern, Umhang, Gürtel, Schuhe,
  Schild), damit man im Inventar sieht, was man trägt. Waffen, Köcher und hohe Stufen unverändert.

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
  (10 Waffen in der Hand), `vergleich-symbole.png` (Inventarsymbole).

## Offene Punkte

- 2D-Ansicht der Figur (figuren.js, `drawPlayer`) zeigt weiterhin die Stufenfarben; nur die Symbole sind umgefärbt.
- Göttlich/Abgrund/Ewig gemischt getragen ergeben weiterhin verschiedene Stufenfarben (je Stufe einheitlich).
- Dolche in Rückhandhaltung verschwinden in der Porträt-Pose fast hinter dem Arm.
