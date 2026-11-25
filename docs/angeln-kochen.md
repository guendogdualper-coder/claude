# Angeln und Kochen

Neu in den Dateien `js/angeln.js` und `js/kochen.js` (beide nach `js/arena-bots.js` geladen, in `sw.js` eingetragen).
Alles hängt sich über Hüllen um vorhandene Funktionen; keine andere Datei wurde dafür geändert.

## Für Spieler in Kürze

- **Angel kaufen:** bei der **Fischerin** (in jeder Stadt und jedem Lager, daneben eine **Kochstelle**). Die einfache
  Haselrute verkauft auch die Händlerin (Reiter „Angelzeug“).
- **Angeln:** ans Wasser stellen und **K** (frei belegbar, „Angeln“ in der Tastenbelegung) oder **F** drücken, am Handy
  erscheint am Ufer der Knopf **„Angeln“** (über „Sprechen“, wenn beide da sind). „Angeln“ lässt sich auch auf einen
  freien Platz der Leiste legen.
- **Ablauf:** Wurf → Warten (die Pose zuckt manchmal nur) → **Biss**: Pose taucht ab, Spritzer, Glöckchen, am Handy
  kurzes Vibrieren → **Anschlagen** (antippen bzw. Leertaste, solange „Anschlagen!“ leuchtet) → **Drill**: gedrückt halten
  holt ein und spannt die Schnur, loslassen lässt nach. Die weiße Marke muss im grünen Bereich bleiben, bis der gelbe
  Fang-Balken voll ist. Zu straff → die Schnur reißt, zu locker → der Fisch schüttelt sich ab.
- Am Handy liegt der große Angel-Knopf genau über dem Angriffsknopf (Daumen bleibt, wo er ist), am PC unten in der Mitte.
- Laufen, Angreifen, Reiten oder ein Treffer holen die Angel sofort ein. Solange ein Fenster offen ist, beißt nichts.
- **Kochen:** an der Kochstelle oder draußen am eigenen **Lagerfeuer** (Charakterfenster → „Angeln & Kochen“ →
  „Lagerfeuer entzünden“, oder „Lagerfeuer“ auf einem freien Platz der Leiste). Gerichte wirken 30 Minuten Spielzeit,
  immer nur eines.

## Angeln (js/angeln.js)

### Angeln (Ruten)

| Stufe | Name | ab Stufe | ab Angelstufe | Preis | Wartezeit | grüner Bereich | Seltenes | Schatz | Lava |
|---|---|---|---|---|---|---|---|---|---|
| 0 | Haselrute | 1 | 1 | 250 | ×1 | +0 | ×1 | +0 % | – |
| 1 | Bambusrute | 15 | 8 | 3.000 | ×0,92 | +0,03 | ×1,1 | +0,3 % | – |
| 2 | Eschenrute mit Rolle | 35 | 22 | 30.000 | ×0,85 | +0,06 | ×1,2 | +0,6 % | – |
| 3 | Glutfaserrute | 55 | 40 | 200.000 | ×0,78 | +0,09 | ×1,35 | +1 % | ja |
| 4 | Mondsilberrute | 75 | 65 | 900.000 | ×0,7 | +0,12 | ×1,5 | +1,5 % | ja |

Man angelt immer mit der besten gekauften Angel (`p.angeln.rute`).

### Gewässer

Fischbar sind Wasser, Moor, Lava, Blutsee und zugefrorene Seen (Eisloch) – nur auf den Karten (nicht in Dungeons,
Arenen, Hallen) und nicht unter Brücken. Gezielt wird 1,6–4,2 Kacheln weit, zuerst in Blickrichtung, sonst ringsum
(die Figur dreht sich zum Wasser). Wasser gehört je nach Karte zu einem Gewässer (`AN_KARTE`):

| Gewässer | Boden / Karten | Stufe (Preise) |
|---|---|---|
| Seen und Bäche | Wasser auf Karten 1, 4, 11, 12, 10 | 8 |
| Oasen und Dschungelflüsse | Wasser auf Karten 2, 3, 5, 6, 9, 13 | 35 |
| Moore und Schattenwasser | Moor überall, Wasser auf Karten 8, 14, 16 | 50 |
| Blutsee | Blutsee (Karte 14) | 35 |
| Eislöcher | Eis (Frostgipfel, Nachtfrost, Eisnacht) | 45 |
| Lava | Lava (Feuerberg, Aschewald) – nur Glutfaser-/Mondsilberrute | 65 |
| Seelenhain | Wasser Karte 17 | 80 |
| Meer der Nebelküste | Wasser Karte 18 | 80 |
| Himmelsterrassen | Wasser Karte 19 | 80 |

(Gezählt beim Bau der Welt: z. B. Sonnenwiesen 2.556 Wasserkacheln, Totenmoor 57.142 Moor, Feuerberg 9.552 Lava,
Nachtfrost 1.410 Eis, Nebelküste 16.047 Meer. Rostschlucht, Ödland und Donnerklamm haben nur Schluchten, der
Kristallabgrund nur Abgrund – dort gibt es nichts zu angeln.)

### Fische

55 Arten, je Gewässer 5–7, in den Seltenheiten der Ausrüstung (Normal, Gewöhnlich, Selten, Episch, Legendär; gleiche
Farben). Jede Art hat ein eigenes, gezeichnetes Symbol (Form: normal, hoch, lang, Wels, Aal, Schwertfisch, Hai,
Laternenfisch; Muster: Streifen, Punkte, Flecken, Glanz, Leuchten, Adern …) und ein Gewicht für den Rekord.
Nur nachts: Mondwels, Nordlichtlachs; nachts doppelt so oft: Irrlichtbarsch.

Würfeln (`anWuerfeln`):

1. Schatz: 1,2 % + 0,015 % je Angelstufe + Bonus der Angel (Perle bzw. in Lava/Blutsee Feueropal 42 %, Flaschenpost
   38 %, Schatzkästchen 20 %).
2. Plunder: 8 % − 0,06 % je Angelstufe, mindestens 2 % (Alter Stiefel, Zerrissenes Netz; in Lava Schlackebrocken).
3. Sonst ein Fisch des Gewässers: Gewicht der Seltenheit 62 / 26 / 9 / 2,6 / 0,55, gleich verteilt auf die Arten dieser
   Seltenheit; ab Gewöhnlich mal (1 + Angelstufe/100 · k) mit k = 0,6 / 1,2 / 1,8 / 2,5 und mal „Seltenes“ der Angel.
   Selten ab Angelstufe 3, Episch ab 12, Legendär je Art ab 20–70 (`min`).

Gemessen (20.000 Würfe, See, Angelstufe 40, Mondsilberrute): siehe Testergebnis im Bericht.

Preise beim Händler: (Gewässerstufe · 1,6 + 6) · 1 / 2,5 / 6 / 15 / 40 je Seltenheit
(Seen: 19 bis 755 Gold, Meer: 134 bis 5.360 Gold). Perle 600, Feueropal 2.500, Plunder 2–4 Gold.
Flaschenpost: Gewässerstufe · 10–25 Gold und eine Zeile Text; Schatzkästchen: Gewässerstufe · 30–60 Gold,
1–3 Seelensplitter, ab Gewässerstufe 35 zu 6 % eine Segensschriftrolle.

### Ablauf und Drill (`anTick`, `anDrillTick`)

- Wurf 0,62 s, danach Warten 5–13 s · Wartezeit der Angel · (1 − 0,15 · Angelstufe/100). Ein offenes Fenster hält die
  Zeit an.
- Biss: 1,25 s + 0,08 s je Angelstufe der Rute zum Anschlagen.
- Drill: Spannung T (0–1) steigt beim Halten um 0,85/s, fällt beim Loslassen um 0,72/s; der Fisch zieht in Stößen
  (0,16 + 0,05 · Seltenheit, alle 1,6 − 0,18 · Seltenheit s, mal 0,6–1,5). Der grüne Bereich (Breite 0,34 − 0,035 ·
  Seltenheit + 0,025 · Angelstufe der Rute + 0,0012 · Angelstufe, 0,15–0,52) wandert langsam hin und her. Im grünen
  Bereich füllt sich der Fang um (0,3 + 0,025 · Rute + 0,001 · Angelstufe) / (1 + 0,3 · Seltenheit) je s, außerhalb
  leert er sich um 0,1 + 0,02 · Seltenheit. Start bei 18 %.
- Schnur reißt nach 0,55 s am Anschlag, der Fisch entkommt nach 1,6 s ganz locker (oder wenn der Fang leer ist), nach
  25 s ist er zu stark.

### Angelstufe

Angelstufe = 1 + ⌊√(Erfahrung / 0,7)⌋, höchstens 100 (Stufe 10: 57 EP, 50: 1.681 EP, 100: 6.861 EP).
Erfahrung je Fang: 3 / 5 / 9 / 16 / 30 nach Seltenheit, eine neue Art +15, Plunder 1, Schatz 6.

### Anzeige

- Kontextknopf „Angeln“ (Handy: Stil wie „Sprechen“, eine Reihe höher, wenn beide da sind; PC: kleiner Hinweis mit der
  Taste über der Leiste), viermal je Sekunde geprüft.
- Während des Angelns: Kasten mit Text, Spannungsleiste (rot – grün – rot, weiße Marke) und Fang-Balken; großer
  runder Knopf über dem Angriffsknopf (Handy) bzw. breiter Knopf unten in der Mitte (PC). Leertaste, Angeln-Taste
  und F gehören dann dem Angeln (Erfassung vor der Spielsteuerung).

### 2D und 3D

- **2D:** `drawPlayer` zeichnet die Figur ohne Waffe und Nebenhand, die Angel selbst als Bild in der Hand (hinter der
  Figur beim Blick nach oben), dazu Schnur und Pose. In der schrägen Pixel-Sicht wird jede Figur aufrecht mit eigenem
  Maßstab gezeichnet, der Boden verzerrt: der Punkt der Pose wird über den Bildschirm in die Zeichenfläche der Figur
  zurückgerechnet (`anBodenPunkt`). Eisloch als dunkle Ellipse. Spritzer als Teilchen (Wasser, Moor, Blut, Eis, Glut).
- Im Drill zieht der Fisch die Schnur hin und her und kommt mit dem Fang näher, der Endpunkt bleibt aber auf dem
  Boden der Pose (`anDrillPunkt`, sonst weniger nah); unter dem Eis bleibt die Schnur im Loch (2D und 3D).
- **3D:** Beim Angeln wird die Figur mit der Angel statt der Waffe gebaut (`playerKey3`/`playerConfig3` mit
  „|angel“; Waffe `angel` in `weapon3`, `WEAPON_HOLD`/`WEAPON_LEN3`). Beim ersten Mal je Ausrüstung kostet das einen
  Modellbau, danach kommt die Figur aus dem Vorrat. Haltung je Phase nach `syncPlayer3` (Arme, Brust). Schnur aus
  wenigen Stäben (5 auf „Niedrig“, sonst 9), Pose aus zwei Kugeln, Spritzer als Tropfen (`FX3_HOOKS`), alle Teile aus
  dem gemeinsamen Effekt-Vorrat. Höhe der Oberfläche wie die Flüssigkeiten (`LIQUID3[…].level`).
- Die Fischerin hält in 2D und 3D eine Angel (`angelr`: aufrecht).

### Netz

Zustand `an` = `[Phase 1–6, Pose x, Pose y, Rute 0–4, Wurf-Nr., Spannung 0–100, Fang 0–100, Boden]`, nur während des
Angelns. Angenommen werden nur bekannte Phasen, Ruten und Böden; die Pose muss in der Welt und höchstens 7 Kacheln von
der Figur liegen, sonst wird der Zustand verworfen (`anNetIn`). Mitspieler sehen Angel, Schnur, Pose, Spritzer und
Drill in 2D und 3D.

### Vorrat, Verkauf, Handel

- `p.fang = { id: Anzahl }` für alles aus dem Wasser und der Küche (Fische, Plunder, Perle, Feueropal, Zutaten,
  Gerichte). Kennungen nur aus `FANG` (unbekannte fallen beim Lesen weg).
- Tasche → „Vorräte“: je Art eine Kachel (Rahmen in der Seltenheitsfarbe), Antippen zeigt Wert, Rekord, „Essen“
  (Gerichte) und Verkaufen (1 / 10 / Alle, nur bei einem Händler). Auch im Mehrfachverkauf auswählbar.
- Die Fischerin zählt als Händler (`TRADERS`) und hat einen Reiter „Verkaufen“ mit „Alle Fische und Plunder verkaufen“.
- **Post und Auktionshaus:** Ware `{ t: 'fang', id, n }`. Prüfung `fangWareClean`: Kennung aus `FANG`, Art aus der
  festen Liste (Schätze, die sofort geöffnet werden, sind keine Ware), Anzahl ganzzahlig 1–9.999; alles andere wird
  verworfen. Eingehängt in `wareClean`, `wareSupplies`, `wareHave`, `wareTake`, `wareGive`, `wareName`, `wareColor`,
  `wareIcon`, `wareTip`, `wareInfo`; im Auktionshaus Unterart „Fische und Küche“ unter Verbrauchsgüter.
- Der direkte Handel (Handelsfenster) bleibt wie bei Tränken und Material auf Ausrüstung, Bücher und Gold beschränkt.

### Prüfungen (Daten aus fremder Quelle)

- **Waren:** `fangWareClean(raw)` ist die Prüffunktion für alle neuen Arten (Fische, Plunder, Perle, Feueropal,
  Zutaten, Gerichte): einfaches Objekt, `t === 'fang'`, Kennung als eigener Schlüssel in `FANG` (feste Liste, kein
  `__proto__`), Art aus `FANG_ARTEN` außer `schatz`, Anzahl ganzzahlig 1–9.999. `wareClean` ruft sie für `t: 'fang'`
  auf; `wareTake`/`wareGive` prüfen noch einmal. Unbekanntes ergibt `null` und wird verworfen.
- **Spielstand:** `anState`, `fangVorrat`, `kochState` nehmen nur bekannte Kennungen und ganze Zahlen in festen
  Grenzen (`anInt`); Angel nur 0–4, Mahlzeit nur aus `KOCH_BY_ID`.
- **Netz:** `anNetIn` (Angel) nimmt nur Phasen 1–6, Ruten 0–4, Böden aus `AN_NETZ_BODEN`, endliche Zahlen in der
  Welt, höchstens 7 Kacheln von der Figur; `kochNetIn` (Lagerfeuer) nur Zahlen in der Welt, höchstens 40 Kacheln.
  Mahlzeiten gehen nicht über das Netz.
- **Anzeige:** Namen über `anEsc` (escapeHtml), Zahlen über `anDe`/`anInt`; Kennungen in `data-…` stammen nur aus
  den eigenen Tabellen.
- `netz.js`, `interaktion.js`, `post.js` und `auktionshaus.js` sind unverändert (alles über Hüllen).

### Fischerin

In jeder Stadt und jedem Lager (19 Stück) beim freien Platz bzw. neben der Händlerin, daneben ihre Kochstelle; feste
Zahlen (`anPlatz`, `rgFreeAt`), alle Mitspieler sehen beide an derselben Stelle. Fenster mit Reitern: Angelruten,
Zutaten, Verkaufen.

## Kochen (js/kochen.js)

### Rezepte

| Gericht | ab Kochstufe | Zutaten | Wirkung (30 Minuten) |
|---|---|---|---|
| Fischspieß | 1 | 1 Fisch | Lebensregeneration +0,2 % |
| Kräuterfisch | 8 | 1 Fisch, 1 Kräuterbund | Lebensregeneration +0,3 %, Erfahrung +3 % |
| Fischsuppe | 18 | 2 Fische, Meersalz, Kräuterbund | Mana +6 %, Lebensregeneration +0,2 % |
| Räucherfisch im Fladenbrot | 28 | 1 Moorfisch, Fladenbrot | Leben +3 %, Verteidigung +3 % |
| Wildfischtopf | 38 | 1 Fisch, Wildfleisch, Kräuterbund | Leben +4 %, Lebensregeneration +0,3 % |
| Frostminzfilet | 45 | 1 Eisfisch, Frostminze | Mana +8 %, Erfahrung +3 % |
| Glutpfeffer-Aal | 55 | 1 Lavafisch, Glutpfeffer | Verteidigung +5 %, Lebensregeneration +0,3 % |
| Meeresplatte | 65 | 2 Meeresfische, Butter, Meersalz | Erfahrung +4 %, Mana +6 % |
| Festmahl des Anglers | 78 | 1 seltener Fisch, Wildfleisch, Butter, Fladenbrot | Erfahrung +5 %, Lebensregeneration +0,4 %, Verteidigung +3 % |

- „Fisch“ = jeder Fisch bis Selten; der Topf nimmt zuerst die häufigsten und billigsten. Epische und legendäre Fische
  nimmt er nie von selbst. „Seltener Fisch“ = Seltenheit Selten.
- Lebensregeneration ist ein Anteil des Lebens je Sekunde (wie der Bonus der Ausrüstung, dort 0,1–0,3 % je Zeile); sie
  läuft durch dieselben Regeln (`REGEN_RULES`: in Ruhe ×0,35, im Kampf ×0,1, Obergrenzen bleiben). Leben aus einem
  Gericht zählt im PvP wie Leben aus Ausrüstung (`bonusHp`). Erfahrung wirkt auch auf die Seelen-Erfahrung (Stufe 80).
- Immer nur eine Mahlzeit: eine neue ersetzt die alte (im Kochfenster mit Rückfrage). Die Zeit läuft nur im Spiel
  (wie beim Erfahrungsring). Symbol mit Restzeit vorn in der Buff-Leiste (Hinweis Zeile für Zeile übersetzt). Beim
  Essen steigen ein paar warme Funken und etwas Dampf über der Figur auf (keine Ringe am Boden).
- Verkaufswert eines Gerichts: 25 + 9 · Kochstufe des Rezepts.

### Zutaten

| Zutat | Herkunft | Preis | Verkauf |
|---|---|---|---|
| Kräuterbund, Meersalz, Fladenbrot, Butter | Fischerin | 40 / 30 / 60 / 80 | 10 / 7 / 15 / 20 |
| Wildfleisch | Tiere (Gestalt Vierbeiner, Keiler), 5 % je Kill | – | 25 |
| Frostminze | Monster im Frostgipfel, Nachtfrost, Eisgrotte, Gletschergruft, 5 % | – | 60 |
| Glutpfeffer | Monster am Feuerberg, im Titanenkamm, Aschewald, Drachenhort und Feuermonster, 5 % | – | 90 |

Keine Bosse, Seelensteine, Instanz- oder Weltbosse (`rollLoot`-Hülle).

### Kochstufe

Kochstufe = 1 + ⌊√(Erfahrung / 0,35)⌋, höchstens 100 (Stufe 100: 3.431 EP). Je Gericht 4 + ⌊Rezeptstufe / 8⌋ EP,
nur 1 EP, wenn die Kochstufe 25 über dem Rezept liegt; das erste Mal je Rezept +10.

### Kochstellen und Lagerfeuer

- Kochstelle: steinerner Herd mit Feuerloch, Kamin und eisernem Topf (2D als Bild mit Flammen, Funken und Dampf;
  3D als feste Figur, Flammen und Dampf über `FX3_HOOKS`). Interagieren wie mit Leuten („Kochen“).
- Lagerfeuer: ein paar Feldsteine, gekreuzte Scheite, ein Spieß mit Fisch, Flammen und Rauch. Brennt 3 Minuten eine
  knappe Kachel vor der Figur, nicht in Städten, nicht auf Wasser oder Eis. Nur eines je Spieler; Mitspieler sehen es
  (Zustand `lf = [x, y]`, geprüft: in der Welt, höchstens 40 Kacheln von der Figur) und können daran kochen.

## Erfolge (Kategorie „Angeln & Kochen“)

Petri Heil (1 Fisch, 5 Punkte), Geduldiger Angler (100, 15), Meisterangler (1.000, 40, Titel), Fischkundler (25 Arten,
25, Titel), Legendärer Fang (ein legendärer Fisch, 30, Titel „Legendenfänger“), Schatztaucher (10 Schätze, 15),
Erfahrener Angler (Angelstufe 50, 20), Herr der Gewässer (Angelstufe 100, 50, Titel), Erstes Gericht (5), Feldkoch
(100 Gerichte, 15), Feinschmecker (jedes Rezept, 25, Titel), Küchenmeister (Kochstufe 100, 40, Titel), Am Lagerfeuer
(10 Lagerfeuer, 10).

## Ratgeber

Neue Kategorie „Angeln & Kochen“ mit zehn Einträgen (Ablauf, Angeln kaufen, Gewässer, Angelstufe, Fische verwenden,
Schätze, Kochen, Gerichte, Zutaten, Lagerfeuer).

## Spielstand

`SAVE_FIELDS`: `angeln` (`rute`, `xp`, `n`, `arten`, `rek`, `schatz`, `plunder`), `fang` (Vorrat), `koch` (`xp`, `n`,
`rez`, `feuer`, `mahl`, `mahlT`).

## Eingehängte Funktionen (Hüllen)

`updateEffects`, `runAction`, `interact`, `drawPlayer`, `drawNpc`, `weapon3`, `playerKey3`, `playerConfig3`,
`syncPlayer3`, `syncNpc3`, `netPlayerState`, `netApplyState`, `generateWorld`, `playerStats`, `gainXp`, `rollLoot`,
`npcTabsHtml`, `ui.openNpc`, `ui.renderShop`, `ui.update`, `gear.supplyList`, `gear.supplyTile`,
`gear.renderSupplyDetail`, `gear.multiSupValue`, `gear.multiSupCount`, `gear.multiAction`, `gear.renderInventory`,
die Waren-Funktionen (siehe oben) und `ahSubline`. Ergänzt: `KEY_ACTIONS` (angeln, K), `QUICK_ACTIONS`/`QUICK_SVG`
(angeln, lagerfeuer), `TRADERS`, `NPC_ART`, `NPC3`, `NPC_FORM`, `NPC_ICONS`, `NPC_TALK_LABEL`, `NPC_LINES`,
`WEAPON_HOLD`, `WEAPON_LEN3`, `ERFOLGE`/`ERFOLG_BY_ID`, `CHAR_TABS_EXTRA`, `RATGEBER_KATEGORIEN`, `RATGEBER_WISSEN`,
`AH_CATS` (Unterart), `FX3_HOOKS`.

## Leistung

- Kontextprüfung viermal je Sekunde (höchstens 96 Kachelabfragen), Anzeige nur bei Änderung neu geschrieben.
- Symbole und Bilder einmal gemalt und gemerkt; 3D-Teile aus dem gemeinsamen Vorrat, auf „Niedrig“ weniger.
- Kochstellen: Funken/Dampf in 2D höchstens alle 0,35 s und nicht auf „Niedrig“; in 3D zwei Flammen und drei
  Rauchflecken je sichtbarer Kochstelle (auf „Niedrig“ eine Flamme, kein Rauch).
