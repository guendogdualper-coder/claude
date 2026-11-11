# Set-Ausrüstung (seit 14.55)

Jede Lv-60-Instanz, der Höllenthron (Thron der Unterwelt, Abaddor) und die beiden Lv-80-Instanzen im Kristallabgrund
haben ein eigenes Set. Wer mehrere Teile desselben Sets anlegt, bekommt zusätzliche Boni in Stufen.

## Regeln

- **Welche Teile:** jedes **epische oder legendäre** Teil ab Göttlich (Lv 60), das in dieser Instanz fällt:
  Instanzboss (`instFinalLoot` → `instEpicItem`, `dropLegendary`), Wächter (`instMiniLoot`), im Höllenthron auch die
  Wächter Zerberos/Ifrah (`htGuardLoot`), die neuen Wächter und Abaddor (`raidLoot`, `htLoot`).
  Normale Beute (`rollLoot`), Händlerware, Endbosse der Maps und Teile unter Lv 60 tragen **nie** ein Set.
- **Kennung:** `item.set = '<id>'` (Zeichenkette, gleich der Kennung der Instanz in `DUNGEONS`), Daten in
  `ITEM_SETS` (js/daten/gegenstaende.js), Logik in js/seltenheit.js (`setTagItem`, `setCounts`, `setBonusStats`,
  `setInfoHtml`, `setCharHtml`).
- **Teile eines Sets:** die Plätze der Klasse – Waffe, Rüstung, Helm, Schultern, Umhang, Schuhe, Gürtel, bei Krieger
  und Ninja dazu Schild / Nebenhand / Köcher (7 bzw. 8 Plätze). Welche Klasse und welcher Gegenstand fallen, bleibt
  wie bisher (für die eigene Klasse, Hauptwerte passend).
- **Zählen:** nur **angelegte** Teile, die die Figur tragen kann (eine Waffe in der Nebenhand nur, wenn sie dort
  wirkt). Die Stufen zählen zusammen: bei 6 Teilen wirken die Boni für 2, 4 und 6.
- **Wirkung:** die Set-Boni werden in `playerStats` (js/spieler.js) zu den Boni der Ausrüstung gezählt, **vor** den
  Obergrenzen (`BONUS_CAPS`), können also keine Obergrenze überschreiten. `main` ist der Hauptwert der Klasse
  (Krieger Stärke, Ninja Geschick, Schamane/Nekromant/Magier Intelligenz).
- **PvP:** Leben aus Set-Boni zählt wie Leben aus Ausrüstungs-Boni nur zu 30 % (`s.bonusHp`, `PVP_DMG.lifeShare`).
  Alles andere wirkt wie gleich hohe Ausrüstungs-Boni (gleiche Obergrenzen, gleiche PvP-Faktoren `PVP_DMG`,
  `PATH_DMG`); eine eigene PvP-Dämpfung der Set-Boni gibt es nicht, weil die Werte bewusst klein sind (6 Teile ≈ drei
  zusätzliche epische Bonuszeilen, verteilt auf sechs Teile, die man dafür statt freier Wahl tragen muss).
- **Erhalten bleibt `set`** beim Schmieden (+), Verstärken, Switcher, Sternenstein, im Spielstand (lokal und Cloud),
  im Konto-Lager, im direkten Handel, in Post und Auktionshaus (`itemClean` übernimmt nur bekannte Sets, nur episch
  ab Göttlich) und im Netz (`netPlayerState` sendet `eq[slot].set` für die Set-Optik bei Mitspielern).

## Anzeige

- Hinweis (Inventar, Lager, Handel, Auktionshaus, Post – alle über `itemTipHtml`), Detailansicht im Inventar,
  Betrachten eines Mitspielers, Handelsdetail: Kasten mit Set-Name (Farbe `SET_COLOR` #3fe0a8), „angelegt/Plätze“,
  Liste der Plätze (angelegte hell mit ✓), Stufen (aktive grün, inaktive grau).
- Schmied: Zeile „Set: Name“ unter der Seltenheit.
- Beute: zusätzliche Chatzeile „Set-Teil: Name (n/m angelegt)“ in Set-Farbe.
- Charakterfenster, Seite „Werte“: Abschnitt „Set-Boni“ mit allen Sets, von denen mindestens 2 Teile angelegt sind.
- Eingang der Instanz: Hinweis, welches Set es dort gibt.

## Sets und Boni

Stufe 60 (acht Instanzen, Teile Lv 60–70):

| Instanz | Set | 2 Teile | 4 Teile | 6 Teile |
|---|---|---|---|---|
| Gletschergruft | Raureifgewand der Frostkönigin | Angriff +20, Abwehr gegen Magie +3 % | Leben +400, Hauptwert +6 | Krit. Schaden +8 %, Krit. Treffer +2 % |
| Feste des Nordlichts | Wehr des Winterfürsten | Verteidigung +15, Leben +300 | Angriff +20, Hauptwert +6 | Schadensreduktion +3 %, Max. Leben +3 % |
| Versunkene Moorkrypta | Moorgeflecht der Moormutter | Angriff +20, Vergiftungschance +2 % | Leben +400, Hauptwert +6 | Fertigkeitsschaden +4 %, Lebensraub +1 % |
| Knochenkathedrale | Knochenornat des Totenfürsten | Angriff +20, Stark gegen Untote +4 % | Leben +400, Hauptwert +6 | Fertigkeitsschaden +3 %, Erlittener Schaden −2 % |
| Donnerschmiede | Blitzharnisch des Donnerschmieds | Angriff +20, Angriffstempo +3 % | Verteidigung +15, Leben +400 | Hauptwert +8, Krit. Schaden +6 % |
| Sturmhorst | Sturmfedern der Sturmkönigin | Angriff +20, Lauftempo +2 % | Leben +400, Hauptwert +6 | Angriffstempo +5 %, Ausweichen +2 % |
| Glutkessel | Glutpanzer des Magmafürsten | Angriff +20, Abwehr gegen Nahkampf +3 % | Leben +400, Hauptwert +6 | Normaler Schaden +4 %, Krit. Schaden +4 % |
| Aschenzitadelle | Aschenkrone des Aschenkaisers | Angriff +20, Krit. Treffer +1 % | Leben +400, Hauptwert +6 | Fertigkeitsschaden +3 %, Krit. Schaden +5 % |

Höllenthron (Thron der Unterwelt, Wächter Lv 64–69, Abaddor Lv 72; etwa ×1,2):

| Instanz | Set | 2 Teile | 4 Teile | 6 Teile |
|---|---|---|---|---|
| Thron der Unterwelt | Höllenornat des Abaddor | Angriff +25, Stark gegen Teufel und Dämonen +4 % | Leben +500, Hauptwert +7 | Fertigkeitsschaden +4 %, Schadensreduktion +3 % |

Stufe 80 (Kristallabgrund, Teile Lv 70–80; etwa ×1,5):

| Instanz | Set | 2 Teile | 4 Teile | 6 Teile |
|---|---|---|---|---|
| Spiegelgruft | Spiegelglas der Herrin Aelthys | Angriff +30, Abwehr gegen Magie +4 % | Leben +600, Hauptwert +9 | Fertigkeitsschaden +5 %, Krit. Treffer +2 % |
| Thron der Leere | Leerenpanzer des Nihilor | Angriff +30, Lebensraub +1 % | Leben +600, Hauptwert +9 | Krit. Schaden +8 %, Schadensreduktion +3 % |

## Einordnung der Werte

- Eine epische Bonuszeile auf Lv 60 bringt etwa Angriff +10–48, Leben 200–1000, 2–6 % bei Prozent-Boni.
- 6 Teile eines Lv-60-Sets ≈ Angriff +20 (+3 aus dem Hauptwert bei Stärke), Leben +400, zwei kleine Prozentwerte –
  zusammen etwa drei zusätzliche Bonuszeilen. Gemessen (Krieger Lv 70, Gletschergruft): 2 Teile Angriff +20; 4 Teile
  Angriff +23, Leben +400; 6 Teile dazu Krit. Treffer +2 %, Krit. Schaden +8 %.
- Ein Spieler mit Lv-70-Gesamtwerten von rund 700 Angriff und 5000 Leben gewinnt damit etwa 3 % Angriff und 8 %
  Leben (im PvP davon 30 %).

## Erweitern

Neues Set: Eintrag in `ITEM_SETS` mit der Kennung der Instanz (`DUNGEONS[].id`), Name, `from`, `color`, `tiers`.
Neue Bonus-Schlüssel müssen in `playerStats` ausgewertet werden (alle aus `BONUS_TYPES`, `SPECIAL_BONUS_TYPES` und
`main` sind es schon). Texte zusätzlich in js/sprachen/en.js.
