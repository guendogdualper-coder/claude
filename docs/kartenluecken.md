# Lücken auf den Karten füllen

Wunsch: Flächen, die man nicht betreten kann, sollen nach etwas aussehen und zur Karte passen – auf der Licht- und
auf der Schattenseite, in 3D und in 2D. Kein Dekozeug auf begehbarem Boden; nichts Neues hat eine Kollision, die Welt
(Boden, Objekte, Wege) bleibt unverändert.

## Stand

| Karte | Fläche | Stand |
|---|---|---|
| 7 Frostgipfel | Wolkenmeer, Inselkanten | 15.20: freier Himmel (Blau, Wolkendecke tief unten, Wolkenballen oben, gegeneinander verschoben), Felswände mit Schneesims; 2D ebenso |
| 4 Dunkelwald | Waldinneres | 15.20: geschlossener Tannenwald, dunkler Waldboden (3D; 2D war schon geschlossen) |
| 12 Aschewald | Waldinneres | 15.20: wie Dunkelwald, Tannen verkohlt |
| 5 Rostschlucht, 3 Donnerklamm | Schlucht | offen: Tiefe (Schichtwände, Felsnadeln, Dunst) |
| 9 Feuerberg | Lava | offen: Vulkankegel, Schlote, Lavafälle in den Strömen |
| 6 Ödland, 16 Schattenklippen, 2 Schlangental, 11 Mondfall | Meer, Fluss, Seen | offen: Klippen, Felsen im Wasser, Schilf |
| 8 Totenmoor, 13 Knochenwüste, 14 Blutsteppe, 15 Nachtfrost, 10 Kristallabgrund | Moor, Treibsand, Blutsee, Spalten, Abgrund | offen: prüfen |
| 1 Kazehana | – | offen: prüfen |

## Technik

- `js/kartenluecken.js`: Aufsätze auf `LIQUID3` (Flächen-Shader), `WZ_MAPS` (gebackene Kulisse je Karte, wie
  `wahrzeichen.js`) und die 2D-Zeichner `drawMagmaTile` / `drawShore`.
- `LIQUID3.<art>.pre`: eigene GLSL-Funktionen einer Fläche (Rauschen), eingefügt vor `main` (`liquidMat`).
- Wolkenmeer: drei Schichten; die tieferen werden entlang des Blickstrahls verschoben (Parallaxe), dadurch echte Tiefe
  ohne zusätzliche Dreiecke. „Niedrig“ hat eine einfache Fassung (`fragLow`).
- Dichter Wald (`formDense3`): Tannenpaare im Abstand von zwei Kacheln (Grafik „Mittel“ drei, „Niedrig“ wie vorher
  sparsam), Farbton der Karte über `tplKulWald`; Waldboden wird in `tileSample` abgedunkelt.
- Prüfbilder: `karten/schau.js` (je Karte eine Stelle an der Grenze zur unbegehbaren Fläche, 3D und 2D).
