# Vorrats-Symbole 14.60: Steine, Switcher, Rollen und Tränke im Stil der Ausrüstung

Wunsch des Spielers (Screenshot Inventar „Vorräte“): Switcher und Steine passen nicht mehr zu den detailreichen
Ausrüstungssymbolen von 14.59 – auch der Rest der Vorräte soll schöner aussehen.

## Änderung (neue Datei js/symbole-vorrat.js, angebunden in js/ausruestung.js)

- Bausteine: `vsGem` (geschliffener Stein: Tafel, je Kante drei Kronenfacetten nach Lichtrichtung schattiert,
  Facettenkanten, Lichtkante oben links, inneres Glühen), `vsStarGem` (Stern mit zehn Facetten und Kern),
  `vsProng`/`vsBezel` (Krappen und Fassung), `vsGlowStroke` (leuchtende Glyphe, unabhängig von der Backauflösung),
  `vsSparkle`, `vsParchment`, `vsRoll`, `vsRodKnob`, `vsSeal`, `vsRibbon`, `vsCrescent`.
- Verstärkung: Saphir im Fünfeckschliff, Silberfassung mit fünf Krappen, leuchtendes Plus in der Tafel.
- Seltene Verstärkung: Amethyst, Goldfassung mit Perlfiligran und drei Begleitsteinen, glühender Kern mit Ring.
- Switcher: offene Pergamentrolle zwischen zwei Rollen mit Holzstäben und Endknäufen, grüne Zierlinien, zwei
  gebogene, grün leuchtende Wechselpfeile, grünes Band mit Wachssiegel.
- Sternenstein: goldener Edelstein-Stern mit Facetten, Grat, leuchtendem Kern und Glitzerfunken.
- Sternen-Switcher: Obsidianscheibe mit Goldrand und Runenpunkten, Sternstein darin, zwei leuchtende Pfeile.
- Segensschriftrolle: Pergament mit Goldrand, Wappen (blauer Schild, goldenes Kreuz), Rollen mit Holzstab und
  Knäufen, blaue Bänder, goldenes Siegel.
- Schriftrolle (H1–H10): Zylinder mit Verlauf, Spiralende, rotes Band, Siegel mit Stern.
- Seelensplitter: facettierter Kristallsplitter mit Begleitsplitter und Glühen.
- Tränke: Glasflasche mit Reflexen, Flüssigkeit mit Meniskus, Bläschen (Leben) bzw. Sternenfunken (Mana), Etikett
  mit Herz bzw. Mondsichel; Leben mit Korken und tropfendem Wachssiegel, Mana mit Silberkragen und Mondsichel.
  Form je Größe (`sz.art`): S schlankes Fläschchen, M runder Kolben, XL Birnenflasche mit Goldband, XXL Karaffe mit
  Goldfuß, Goldband mit Steinen und Goldring am Hals. Cache-Schlüssel `pot3:`.
- Monsterteile (Aufwertungsteile): alle 13 Grundformen mit Verlauf, Maserung, Kanten und Glanz (`VS_MOB_ART`,
  Rückfall auf die alten Formen).
- Unverändert: Seelenstein, Ätherkern, Fertigkeitsbücher, Pfeilbündel (schon detailreich).

## Schärfe und Leistung

- `materialIconUrl`, `lootIconUrl`, `mobMatIconUrl` und `bookIconUrl` backen jetzt wie `materialIconHiUrl` in
  `ICON_HI` (vorher 3-fach). Alles bleibt gebacken und im `iconCache`; nichts wird pro Bild gezeichnet.
- Backzeit je Symbol einmalig ~10–12 ms (vorher 2–16 ms).

## Tests

- `node --check` aller js/*.js, js/daten/*.js, js/sprachen/*.js, sw.js.
- s73 (12 Charaktere, keine Seitenfehler), s72 und s72_noshot mit D3=1 (keine Seitenfehler).
- Kontaktbogen vorher/nachher und Inventar-Screenshots (Desktop und Handy, 3-fach) sowie Aufwertungsfenster.
