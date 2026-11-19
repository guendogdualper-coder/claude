## Drache: Flughöhe, Steuerung und Farbe | „Man kann gar nicht mit dem Drachen ein Stück nach oben fliegen.“

**Wunsch (mit Präzisierungen):** Mit dem Drachen ein Stück über die Bäume steigen und wieder sinken – am PC mit
der Leertaste statt anzugreifen, am Handy mit zwei eigenen Knöpfen; dazu die Drachenfarbe (Blau, Rot, Schwarz,
Weiß) beim Stallmeister wählbar.

**Ursache:** Der Drache hatte nur eine feste Schwebehöhe (Rumpfmitte ≈ 2,3, `DRACHE3.hover`; 2D 52 px) und eine
feste Farbe.

**Änderung:**
- Flughöhe „tief“ (wie bisher) und „hoch“ (+2,4 Einheiten: Bauch ≈ 4,3, Rumpfmitte ≈ 4,7, Sattel ≈ 5,3; Bäume ≈ 3;
  2D +44 px). Weicher Übergang je Figur (`dragonHighK`): Steigen 1,2 s mit kräftigerem, schnellerem Flügelschlag,
  Sinken 1,0 s gleitend; eigene erzeugte Klänge.
- PC: Leertaste schaltet im Flug um (kein Angriff, Halten löst nichts aus); am Boden, zu Fuß, in Dungeon/Instanz/
  Arena/Duell greift sie an wie bisher. Zusätzlich Bild↑/Bild↓ und Menüknopf „Steigen/Sinken“.
- Handy: zwei Knöpfe „▲ Steigen“/„▼ Sinken“ (58 × 52 px) links neben dem Fertigkeitenbogen, nur im Flug sichtbar,
  der unmögliche ausgegraut, in „HUD anpassen“ als „Drachenflug“ verschiebbar; am PC ausgeblendet.
- Rücksetzen auf tief: Absteigen (auch durch Angriff/Fertigkeit), Tod, Boden-Gebiete, Teleport/Positionssprung
  > 4 Kacheln; Aufsitzen beginnt tief. Spielregeln (Kollision, Tempo, Kampf) unverändert – nur Darstellung.
- 3D: Drache samt Reiter steigt, Schatten bleibt am Boden (kleiner, blasser); Schulterblick-Kamera steigt ganz mit
  (bleibt über dem Reiter), normale Kamera zu 75 %, beide im Flug schon tief 0,9 höher (Name klebte sonst am oberen Rand), 2D-Bild zu 60 %; Name/Lebensbalken über `rideH3`, in 3D jetzt 14 px über dem Reiter
  (vorher um die ganze 2D-Reithöhe darüber, lief hoch oben aus dem Bild); Treffertexte an der Figur steigen mit.
- Netz: `fh: 1` (hoch), `dc` (Farbe, wenn nicht Rot) – ältere Versionen zeigen tief bzw. Rot.
- Farbe: Spielstand `dragonColor` (Standard/unbekannt → Rot), Auswahl mit vier Vorschaubildern beim Stallmeister
  (vor dem Kauf vormerken, danach kostenlos umfärben), 3D-Paletten `DRACHE3_FARBEN`, 2D `DRAGON2D_FARBEN`.
- Hilfe (Tastenliste, Handy-Absatz), Ratgeber (2 neue Fragen), en.js.

**Dateien:** js/spieler.js, js/drei-drache.js, js/drei-kern.js, js/zeichnen.js, js/figuren.js, js/effekte.js,
js/netz.js, js/tasten.js, js/eingabe.js, js/oberflaeche.js, js/hud-layout.js, js/quests.js, js/klang-welt.js,
js/daten/ratgeber-wissen.js, js/sprachen/en.js, index.html, css/style.css, docs/drache-entwurf.md.

**Tests:**
- Drachen-Funktionstest (Kopie von dungeon/test-drache.js, Port 8800): 69 OK, 0 Fehler, keine Seitenfehler – die 36
  bisherigen plus 33 neue (Steigen/Sinken über Leertaste, Bild↑/↓, Menüknopf; weicher Übergang; 2D höher; Tempo
  gleich; Netzfeld fh; Rücksetzen bei Teleport, Absteigen, Duell, Tod, Angriff; Leertaste im Duell/zu Fuß greift an;
  Farbe: Standard Rot, Spielstand, Vormerken vor dem Kauf, Kauf in Blau, kostenlos umfärben, Netzfeld dc, 2D in allen
  Farben).
- s73 (12 Charaktere): 12/12 ohne Fehler. s72_noshot mit D3=1: alle NPC-Fenster offen, Arena betreten, keine Fehler.
- Bilder (3D-Chromium mit SwiftShader, selbst angesehen): normale Kamera, Schulterblick, 2D je tief/hoch, Handy-
  Querformat 844×390 mit Touch-Oberfläche und HUD-Bearbeitung, vier Farben in 3D und 2D und beim Stallmeister.

**Offen:** Mausklick-Angriff und der Angriffsknopf am Handy greifen im Flug weiter an (steigen ab) – gewollt, nur
die Leertaste wurde umgewidmet. Andere Sprachen als Englisch fallen für die neuen Texte auf Englisch zurück.
