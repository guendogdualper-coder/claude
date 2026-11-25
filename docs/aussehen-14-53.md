# Aussehen 14.53: Körperbau nach Geschlecht und wählbare Körpergröße

Wunsch des Spielers: Frauen sahen nicht wie Frauen aus (keine Kurven), Männer wirkten ebenfalls weiblich; die Größe der
Figur soll bei der Erstellung einstellbar sein.

## 3D (js/drei-figuren.js, js/drei-ausruestung.js, js/drei-kern.js)

- **Körperform als Verformung beim Backen** (`bodyWarp3`, `Bake3`-Teile mit `it.warp`): Alle Teile an Brust- und
  Hüftknochen – Rumpf *und* alles, was darauf sitzt (Harnisch, Lamellen, Mantel, Gürtel, Rock, Rüstungsmerkmale jeder
  Stufe) – werden nach dem Platzieren gemeinsam verformt. Dadurch passt jede Rüstungsstufe ohne Durchstechen, weil alle
  Schichten gleich mitgehen. Kostet keine zusätzlichen Dreiecke, nur einmal Rechenzeit beim Backen.
  - Frauen: Taille eingezogen, Hüfte breiter und runder, Brust nach vorn.
  - Männer: Brustkorb breiter (V-Form), Hüfte schmaler.
- **Grundkörper**: eigene Rumpfumrisse `TORSO3_F`/`TORSO3_M` (Figuren ohne Geschlecht behalten `TORSO3_N` = bisheriger
  Umriss); Harnisch der Frauen tailliert (`CUIRASS3_F`); Brust runder und etwas tiefer (`bustAt3`), Teile vorn heben sich
  darüber (`torsoAt3`).
- Frauen: Schultern 10 % schmaler, Arme 14 % schlanker, schlanker Hals, rundere Oberschenkel, kleinere Hände,
  weicheres Kinn (`jaw 0.94`), Rock und Gürtel über den Hüften weiter, Schulterstücke 10 % kleiner (Stachelkamm bleibt).
- Männer: Schultern 10 % breiter, Arme 12 % kräftiger, Hals 30 % kräftiger, Hüfte schmaler, größere Hände,
  Kieferwinkel (`squareJaw`), kräftigere Brauen.
- Gilt nur für Spielerfiguren (`female`/`male` setzt nur `playerConfig3`); Bewohner und Monster bleiben unverändert.

## Körpergröße

- Neues Feld `look.gr` (Prozent, 90–110, Standard 100). Alte Spielstände ohne Wert = 100 %. `lookSize`/`lookSizePct`
  (js/figuren.js) begrenzen jeden Wert – auch den von Mitspielern über das Netzfeld `lk` (wird unverändert mitgeschickt).
- 3D: `figScale = 1.14 × Größe`. Pferd, Drache (Sitzhöhe über `model.scale`) und Namensschild (`v3HeadHeight`) folgen
  automatisch. Jede Größe ist ein eigenes gebackenes Modell (Schlüssel enthält das Aussehen).
- 2D: `drawPlayer` skaliert Figur und Waffe von den Füßen bzw. vom Sattel aus; Name darüber rückt mit.
- Kollision, Trefferflächen, Reichweiten: unverändert (nur Aussehen).
- Regler „Größe“ im Aussehen-Editor (`lookEditor`, js/oberflaeche.js) – also bei der Erstellung und bei „Aussehen
  ändern“. Das Modell wird beim Loslassen neu gebaut, die Zahl läuft beim Ziehen mit.
- Vorschau (`v3Portrait`): Bildausschnitt nach der Figur in Normalgröße plus Rand für 110 %, damit man 90 %/110 %
  in der Vorschau sieht (dadurch alle Porträts etwa 6 % kleiner als vorher).

## 2D (js/figuren.js)

- `hBodySex2D`: Spielerinnen mit Sanduhr-Rumpf (Schultern schmal, Taille, Hüfte) und angedeuteter Brust, Spieler mit
  V-förmigem Rumpf und angedeuteter Brustmuskulatur; Arme entsprechend weiter außen bzw. innen.
  Nur Spielerfiguren (`FIG_SEX2D` gilt während `characterSprite`).

## Tests und Bilder

- `node --check` aller js/*.js, js/daten/*.js, js/sprachen/*.js, sw.js.
- Smoke-Tests s73 (12 Charaktere), s72, s72_noshot (D3=1), Drachenhöhe td (69 OK) ohne Seitenfehler.
- Eigene Prüfung: Regler 90–110, Rückgabe an Erstellung und „Aussehen ändern“, `lk` kommt beim Mitspieler an
  (108 % → 108 %), Begrenzung (500 → 110 %, Text → 100 %), Modellmaßstab 1,026 / 1,14 / 1,254.
- Dreiecke je Figur +0,5–1,5 % (Kieferwinkel, Brust mit 12 statt 10 Segmenten).
- Vergleichsbilder (vorher/nachher, 3D nah, 2D) im Scratchpad unter `aussehen53/`.

## Offene Punkte

- In sehr schwerer Rüstung mit großen Schulterstücken bleibt der Unterschied aus der Spielkamera dezent.
- 2D: Rüstungsdetails einzelner Klassen liegen fest über dem Rumpf; dort wirkt nur der Umriss.
