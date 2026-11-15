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
| 5 Rostschlucht, 3 Donnerklamm, 12 Aschewald | Schlucht | 15.21: Blick in die Tiefe (sechs Felsstufen, Fluss am Grund), Felsfarbe je Karte; 2D als Stufen |
| 15 Nachtfrost | Eisspalten | 15.21: Tiefe aus Eisbänken; 15.24: 2D als Eisstufen |
| 13 Knochenwüste | Treibsand | 15.21: Dünenlinien, wandernde Mulden; 15.24: 2D mit Dünenkämmen und Mulden |
| 9 Feuerberg | Lava | 15.22: kleine Vulkanschlote mit Glutkrater, Rauch und Funken mitten in der Lava (3D); 15.24: 2D mit denselben Schloten und Krustenschollen |
| 16 Schattenklippen | Meer | 15.23: kantige Felsnadeln mit Brandung im offenen Wasser, Felsbrocken am Ufer (3D und 2D) |
| 6 Ödland | Abgrund (bis 15.24 Meer) | 15.25: das Wasser sah wie Himmel aus – jetzt Schlucht mit dunklen Felsstufen, Glutadern am Grund, Felsnadeln aus der Tiefe (3D und 2D) |
| 1 Kazehana, 2 Schlangental, 11 Mondfall | Teich, Fluss, See | 15.23: Schilf mit Rohrkolben, Seerosen (Mondfall: leuchtend), Steine; im Fluss Findlinge (3D und 2D) |
| 8 Totenmoor | Moor | 15.23: dürres Schilf, totes Geäst (3D und 2D) |
| 14 Blutsteppe | Blutsee | 15.23: dunkle Felszähne (3D und 2D) |
| 10 Kristallabgrund | Abgrund | 15.25: schwebende Kristallsplitter über dem ganzen Abgrund (3D bewegt, 2D gemalt) |

## Technik

- `js/kartenluecken.js`: Aufsätze auf `LIQUID3` (Flächen-Shader), `WZ_MAPS` (gebackene Kulisse je Karte, wie
  `wahrzeichen.js`) und die 2D-Zeichner `drawMagmaTile` / `drawShore`.
- `LIQUID3.<art>.pre`: eigene GLSL-Funktionen einer Fläche (Rauschen), eingefügt vor `main` (`liquidMat`).
- Wolkenmeer: drei Schichten; die tieferen werden entlang des Blickstrahls verschoben (Parallaxe), dadurch echte Tiefe
  ohne zusätzliche Dreiecke. „Niedrig“ hat eine einfache Fassung (`fragLow`).
- Dichter Wald (`formDense3`): Tannenpaare im Abstand von zwei Kacheln (Grafik „Mittel“ drei, „Niedrig“ wie vorher
  sparsam), Farbton der Karte über `tplKulWald`; Waldboden wird in `tileSample` abgedunkelt.
- Wasserflächen: `KL_WASSER[Karte]` legt fest, was eine Karte bekommt; `klWasserArt(x, y, cfg, tier)` entscheidet je
  Kachel nach Abstand zum Land (1 Ufer, 2–3 flach, darüber offen) und Kachelwert. 3D backt je Block von 24 × 24
  Kacheln eine Kulisse (`klWasser3`), 2D malt in `drawShore` in den Bodenblock. Felsnadeln meiden Wahrzeichen.
- Prüfbilder: `karten/schau.js` (je Karte eine Stelle an der Grenze zur unbegehbaren Fläche, 3D und 2D).
