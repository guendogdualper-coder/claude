# Rang-Boni für alle Fertigkeiten (Entwurf, Stand 15.51)

Wunsch des Spielers: Jede Fertigkeit jeder Klasse (alle zwölf Wege, auch die Ultis) soll mit jedem Rang – Erwacht (E),
Heroisch (H), Legendär (L), Vollendet (V) – spürbar etwas dazubekommen: eine kleine Mechanik „on top“, eine sichtbar
erweiterte Attacke (bei V richtig prächtig) und ein Symbol, dem man den Rang ansieht.

Dieses Dokument ist **nur ein Entwurf**. Es ist nichts umgesetzt; alle Zahlen sind Startwerte, die beim Umsetzen je
Paket gemessen und nachgestellt werden (Abschnitt 3 und 6).

Inhalt:
1. Bestand – wie Ränge heute wirken, wie Symbole entstehen, was es gibt
2. Grundregeln des Entwurfs (Mechanik, Optik, Symbol, Ulti-Rang)
3. Balance – Grenzen, Begründung, Hochrechnung, PvP
4. Tabellen je Klasse und Weg (60 Fertigkeiten) und Ultis (12)
5. Hinweise zur Umsetzung (Dateien, Netz, Spielstände, Handy, Inhaltsregeln, Texte)
6. Pakete für die Umsetzung

---

## 1. Bestand

### 1.1 Fertigkeiten, Wege, Ultis

| Klasse | Wege | Fertigkeiten | Ultis | Klassensegen |
|---|---|---:|---:|---|
| Krieger | Klinge (PvE), Leib (PvP) | 10 | 2 (Klingenhimmel, Titanenzorn) | keiner |
| Ninja | Dolch (PvE), Falke (Bogen) | 10 | 2 (Schattendoppelgänger, Sturm des Schattenadlers) | Klingenschatten, Falkenblick |
| Schamane | Drache (PvE), Heilung (PvP) | 10 | 2 (Kreis der Elemente, Lichtkuppel) | Segen der Natur, Segen des Lichts |
| Nekromant | Seelen (PvE), Knochen (PvP) | 10 | 2 (Seelenernte, Sensenmann) | Blutpakt |
| Magier | Feuer, Frost, Blitz, Erde | 20 | 4 (Inferno, Eiszeit, Donnerkeile, Weltenbruch) | Arkane Erleuchtung |
| **zusammen** | 12 Wege | **60** | **12** | 6 (ohne Rang) |

Daten: `js/daten/klassen.js` (`CLASSES`, je Weg fünf Fertigkeiten), Ultis in `js/ultimativ.js` (`ULTIMATES`) und
`js/magier.js` (`MAGE_ULTS`), Klassensegen in `js/klassensegen.js`, Rangnamen je Fertigkeit in
`js/daten/rangnamen.js` (`RANK_NAMES`, z. B. Kettenblitz → Kettendonner · Blitzkaskade · Sturm der Ketten ·
Göttlicher Kettenblitz). Todesmal, Knochenkerker, Sturmgericht und Donnerkrone gibt es nur noch als Bild für
Mitspieler mit älterer Version.

### 1.2 Stufen und Ränge

`SKILL_RANKS` (`js/spieler.js`): Stufe 1–15 mit Fertigkeitspunkten; der Punkt auf 15 erweckt sofort zu E1 (intern
Stufe 18, Stufe 15–17 wird beim Laden zu E1). Normal endet also praktisch bei **Stufe 14**.

| Rang | interne Stufen | Gegenstand je Stufe | ab Charakterstufe | Farbe |
|---|---|---|---|---|
| normal | 1–14 | Fertigkeitspunkt | – | – |
| E1–E10 | 18–27 | Fertigkeitsbuch der Fertigkeit | 1 | `#9fd0ff` |
| H1–H10 | 28–37 | Schriftrolle | 35 | `#c58cff` |
| L1–L10 | 38–47 | Seelenstein (Gegenstand) | 50 | `#ffd34d` |
| V | 48 | Seelenstein (Gegenstand) | 65 | `#ff6a4a` |

`skillRank(lvl)` liefert −1 (normal) bzw. 0–3 (E–V); `skillLevelText` zeigt „12“, „E3“, „V“.

### 1.3 Was ein Rang heute an Werten bringt

`levelCurve` in `js/kampf.js`: bis Stufe 17 +6 % je Stufe, in den Rängen +4 % je Stufe, dazu beim Eintritt in einen
Rang ein Sprung (`RANK_JUMP` 0,05 / 0,12 / 0,20 / 0,30). Buffs, Heilung, Schilde, Flüche: +3 % bzw. +1,5 % je Stufe und
`BUFF_JUMP` 0,08 / 0,16 / 0,28 / 0,45. Dauer: +2 % bzw. +1 % und `DUR_JUMP` 0,05 / 0,10 / 0,15 / 0,25.

| Stufe | 14 | E1 | E10 | H1 | H10 | L1 | L10 | V |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `dmgScale` | 1,78 | 2,05 | 2,41 | 2,52 | 2,88 | 3,00 | 3,36 | 3,50 |

Dazu eigene Rangtabellen: Aura des Schwertes (`AURA_FLAT`, fester Angriff bis +600 auf V), Drachenkraft
(`DRACHENKRAFT`, 2 % bis 22 %), Segen (`segenReduction`, Schutz bis 40 %).

### 1.4 Gemessen: Schaden je Rang heute

Messung am 19.11. mit einer Kopie von `tools/balance-sim.js` im Arbeitsordner (Spielstand = Commit 15.51, nicht die
gerade bearbeiteten Dateien), Testserver auf Port 8951. Stufe 80, Ausrüstung **std** (alles +7, keine Boni), alle
fünf Fertigkeiten auf derselben Stufe, Rotation mit Buffs, Segen und Ulti. 1 Ziel = Boss-Puppe 90 s, 5 Ziele = 60 s.
Gleiche Stufe zweimal gemessen weicht um bis zu ±3 % ab.

| Weg | 1 Ziel: 14 → V (Schaden/s) | Sprung E1/14 · H1/E10 · L1/H10 · V/L10 | 5 Ziele: 14 → V | Sprung E1/14 · H1/E10 · L1/H10 · V/L10 |
|---|---|---|---|---|
| Krieger · Klinge | 4.887 → 12.870 (×2,63) | +15 · +12 · +7 · +13 % | 15.253 → 37.139 (×2,43) | +17 · +14 · −1 · +12 % |
| Krieger · Leib | 3.936 → 7.874 (×2,00) | +17 · +7 · +12 · +12 % | 11.632 → 19.171 (×1,65) | +8 · +4 · +8 · +6 % |
| Ninja · Dolch | 9.005 → 13.955 (×1,55) | +4 · +2 · +11 · +5 % | 19.888 → 28.512 (×1,43) | +9 · −4 · +5 · +1 % |
| Ninja · Falke | 7.927 → 12.795 (×1,61) | +4 · +9 · −1 · +7 % | 15.184 → 25.426 (×1,67) | +8 · −3 · +2 · +5 % |
| Schamane · Drache | 5.045 → 10.506 (×2,08) | +22 · +3 · +4 · +7 % | 21.027 → 46.160 (×2,20) | +16 · +5 · +2 · +12 % |
| Schamane · Heilung | 3.628 → 7.102 (×1,96) | +16 · +6 · +5 · +9 % | 10.777 → 24.945 (×2,31) | +21 · +6 · +7 · +8 % |
| Nekromant · Seelen | 7.368 → 20.362 (×2,76) | +35 · +6 · +12 · +22 % | 17.257 → 65.064 (×3,77) | +23 · **−22** · +2 · **+154** % |
| Nekromant · Knochen | 6.433 → 11.227 (×1,75) | +12 · +3 · +7 · −1 % | 12.543 → 21.644 (×1,73) | +13 · +2 · +6 · +6 % |
| Magier · Feuer | 6.635 → 13.297 (×2,00) | +12 · +8 · +11 · +6 % | 25.654 → 57.097 (×2,23) | +15 · +17 · +3 · +16 % |
| Magier · Frost | 5.893 → 12.626 (×2,14) | +19 · +9 · +3 · +8 % | 25.902 → 58.606 (×2,26) | +30 · +6 · +7 · +7 % |
| Magier · Blitz | 6.875 → 12.442 (×1,81) | +16 · +4 · +1 · +5 % | 21.312 → 38.722 (×1,82) | +13 · +4 · +5 · +2 % |
| Magier · Erde | 5.065 → 8.664 (×1,71) | +13 · +0 · +7 · +1 % | 18.688 → 35.594 (×1,90) | +16 · +4 · +9 · −1 % |
| **Mittel (geom.)** | **×1,97** | **+15 · +6 · +7 · +8 %** | **×2,05** | **+16 · +2 · +5 · +15 %** |

Lesart: Der Weg von 14 bis V verdoppelt heute den Schaden, aber fast nur über die vielen Einzelstufen (+4 % je
Stufe). Der Schritt **in** einen neuen Rang (H1, L1, V) bringt im Mittel nur +6–8 % – genau das, was der Spieler als
„wird nur etwas stärker“ empfindet. Auffällig: beim Nekromanten · Seelen sackt H bei 5 Zielen ab (Knochendrachen
schwächer als Knochenhunde) und V springt um +154 % (Seelenkolosse mit Splitter und Stampfer) – das gehört beim
Umsetzen geglättet (Paket 7).

### 1.5 Mechanik, die heute schon vom Rang abhängt

| Fertigkeit | heute je Rang | Stelle |
|---|---|---|
| Schattenkette | Sprünge 4 → E 5, H 6, L 6, V 7 | `rankHops`, `chainHops` (`ninja-fx.js`) |
| Falkenpfeil | ab H vier statt drei Pfeile (je 0,85) | `rankCount`, `bowSalvoSpec` (`fernninja.js`) |
| Pfeilregen | je Rang +1 Puls (0,5 s) und +4 Pfeile/s | `rankRate`, Pulse in `fernninja.js` |
| Feuertornados | Tornados 2/3 → E 4, H 5, L 6, V 7 | `tornadoCount` (`feuerfeld.js`) |
| Blizzard (Frost) | je Rang +1 Puls | `snowTicks` (`schneesturm.js`) |
| Frostnova | ab E Nachhall (zweite Front 35 %) | `novaFx` (`magier.js`) |
| Eisstrahl | Kombo gegen Verlangsamte/Eingefrorene +5/+10 % je Rang | `beamComboOf` (`eisstrahl.js`) |
| Eisgefängnis | Haltezeit +0,15 s je Rang | `holdStep` (`frostgefaengnis.js`) |
| Totenbeschwörung | Dienerart: Skelett → E Knochenhund → H Knochendrache → L großer Drache → V Seelenkoloss | `sk.tiers` (`kampf.js`, `nekro-diener.js`) |
| Totenruf | Geister 2 → E 3, H 4, L 4, V 5 | `sk.counts` (`nekro-totenruf.js`) |
| Aura, Drachenkraft, Segen | eigene Werttabellen | `AURA_FLAT`, `DRACHENKRAFT`, `segenReduction` (`kampf.js`) |

Alle anderen 49 Fertigkeiten und alle Ultis haben heute keine Rang-Mechanik.

### 1.6 Wie der Rang heute aussieht

- **Rang an jedem Effekt:** `useSkill` setzt `fxRank` (`withRank`, `js/effekte.js`); `later()`, Sprünge und Geschosse
  tragen ihn weiter. `rankLook` färbt ausgewählte Effektarten in der Rangfarbe und **vergrößert** sie um 10 % je Rang
  (Ring, Schnitt, Säule, Wirbel …) – die Trefferfläche wächst dabei nicht mit. `particles()` sprüht ab E mehr Teilchen
  und Funken in der Rangfarbe. `rankHaloPass` legt seit 15.51 einmal je Durchgang einen weichen Schein in der
  Rangfarbe unter alle Effekte mit Rang (vorher `shadowBlur` je Strich – Ruckeln in 2D).
- **Beim Wirken:** `rankCastFx` (`js/fertigkeiten.js`): in 2D Funken, ab L Leuchten, ab V Bildschirm-Aufblitzen und
  Beben; in 3D `rankCast3` (`js/rang-fx.js`): Funkenspirale (E), Funkenkränze und Arkan-Kugeln (H), Lichtsäule,
  Sonnenrad und Goldsterne über dem Kopf (L), Flammenflügel, Feuerkrone, Glutsturm, Himmelsstrahl (V). Fertigkeiten
  mit eigener Rang-Optik schalten das mit `rankSoft` leiser (Aderlass, Aura des Schwertes).
- **Bei jedem Treffer:** `rankHitFx` (aus `hitMonster`): Lichtfleck, ab H Kreuzschnitt, ab L kleine Blitze, V Glut; in
  3D `rankHit3`: Stoßring in der Luft, Splitter, Sternschnuppe, Meteor. Im Gedränge zusammengefasst
  (`RANK_FX_CROWD`, `FX3.hitCrowd`, `LOAD_SKIP.rankhit3`).
- **Eigene Rang-Optik einzelner Fertigkeiten:** Aderlass (Hülle, H Nachschnitt, L Blutnebel, V Lichtklingen-Fächer –
  nur Bild), Klingenkreuz, Aura des Schwertes (Energieklinge wächst, `zeichnen.js`/`drei-figuren.js`), Kampfrausch
  (mehr und längere Blitze an der Figur), Bogen-Ninja (Pfeile und Splitter in der Rangfarbe), Diener-Modelle.
- **Mitspieler:** `netSkillFx` schickt seit 8.5 den Rang als `rk` mit; `interaktion.js` spielt damit `rankCast3` und
  die Effekte in der Rangfarbe ab. Ultis (`netUltimateFx`) haben kein `rk`.

### 1.7 Wie die Symbole entstehen

- Keine Bilddateien: jedes Symbol wird auf einer Leinwand gezeichnet (Fläche −24…24, 128 px) und als Data-URL in
  `skillIconCache` gemerkt (Schlüssel `id:rang`). Hintergrund, Lichtkugel, Strahlen und Metallrand:
  `drawSkillIcon` (`js/symbol-kunst.js`, Thema je Element `ICON_THEME`); das Motiv aus `SKILL_ART[id]`
  (`symbole-krieger.js`, `-ninja.js`, `-schamane.js`, `-nekromant.js`, `-nekro2.js`, `-magier.js`, `-magier2.js`,
  `-magier3.js`, dazu in `fernninja.js`, `feuerfeld.js`, `flammenwoge.js`, `schneesturm.js`, `frostgefaengnis.js`),
  sonst das ältere `SKILL_ICONS[id]` (`fertigkeiten.js`).
- **Rang am Symbol:** `skillIconUrl(sk, r)` legt einen Schein in der Rangfarbe über das Bild und zeichnet
  `skillRankFrame` (`fertigkeiten.js`): E silberblauer Ring mit vier Steinen, H violett mit acht Nieten und Stein oben,
  L Gold mit Lorbeer und Glanzpunkten, V Flammenspitzen, glühender Doppelring und Krone. **Das Motiv selbst ändert
  sich nicht.**
- In der Leiste (`oberflaeche.js`) dazu ein farbiger Außenring je Rang (`.slot.skill.rank-E…V`, `css/style.css`)
  und die Stufenplakette („E3“) in der Rangfarbe; im Charakterfenster eine Rangzeile mit allen fünf Varianten.
- Ultis und Klassensegen haben kein Rangsymbol (`skillIconUrl(u)` ohne Rang).

---

## 2. Grundregeln des Entwurfs

### 2.1 Mechanik

- **Jeder Rang bringt etwas Eigenes**, kumulativ (H enthält E usw.). Muster: **E** eine kleine Verbesserung
  (Reichweite, Radius, ein Ziel mehr), **H** eine Zusatzwirkung (Sog, Verlangsamung, Nebenwirkung), **L** eine
  Erweiterung (Nachbeben, Rückweg, längere Kontrolle), **V** genau ein markantes **Extra** mit eigenem Namen aus
  `RANK_NAMES` (z. B. „Göttlicher Kettenblitz“).
- Wo es heute schon Rang-Mechanik gibt (1.5), bleibt sie und zählt als Bonus dieses Rangs; wo ein Rang heute leer
  ausgeht (Schattenkette L, Falkenpfeil E/L/V …), kommt etwas dazu.
- Die Rang-Sprünge `RANK_JUMP`/`BUFF_JUMP` bleiben. Reicht das Budget nicht (Abschnitt 3), wird zuerst der
  Mechanik-Wert gekürzt, als zweite Stellschraube `RANK_JUMP` für H/L/V um je 0,03.
- Nebenwirkungen auf Monster (Verlangsamen, Betäuben, Einfrieren, Hochschleudern, Sog, Furcht, Köder) folgen den
  Boss-Regeln wie heute (Bosse nicht betäubt, Verlangsamung gedämpft).

### 2.2 Optik

Gilt für 2D und 3D, sofern nicht „3D:“ oder „2D:“ davorsteht.

- **E:** Attacke in der Rangfarbe gesäumt (wie heute) und ein kleines sichtbares Zeichen der neuen Mechanik
  (der vierte Blitz, die längere Spur).
- **H:** dazu Nachbilder bzw. ein Echo der Hauptform.
- **L:** dazu goldene Kanten oder ein goldener Kern.
- **V:** dazu **ein** Signatur-Effekt je Fertigkeit in Rot-Gold-Violett (`RANK3_COLORS[3]`), z. B. Rücksprung mit
  Blitzkrone. Hat eine Fertigkeit ihre V-Signatur, läuft `rankCastFx` für sie leise (`rankSoft`), damit Flammenflügel
  und Lichtsäule die Attacke nicht zudecken – das spart zugleich Zeichenzeit.
- Bausteine: 2D nur vorhandene Effektarten (`slash`, `chain`, `bolt`, `impact`, `bladespin`, `tornado`, `particles`),
  3D nur Sprite-Bausteine (`n3Glow`, `n3Flame`, `n3Bolt`, `fx3MageSprite`) und vorhandene Modelle (Felspfeiler,
  Schattenklon, Falke, Diener). Grenzen für das Handy in 5.4.
- **Inhaltsregeln:** keine Ringe, Runen oder Sterne am Boden als Effekte (Warnflächen für verzögerte Treffer sind
  erlaubt); Wellen, Kränze und Kronen nur in der Luft oder am Körper; Risse strahlenförmig, Pfützen unregelmäßig. Nichts
  aus bestehenden Spielen nachbauen – Formen leiten sich aus dem eigenen Motiv der Fertigkeit ab.

### 2.3 Symbol

Drei Ebenen; die erste gibt es schon.

1. **Rahmen und Schein** (heute, `skillRankFrame`): bleibt.
2. **Motiv-Erweiterung je Rang (neu):** `SKILL_ART[id](ctx, IK, sk, r)` bekommt den Rang. Je Rang kommt **ein**
   Bildelement dazu, das die Mechanik zeigt (Kettenblitz: vierter, fünfter Knoten …); L färbt Kanten oder Kern gold.
3. **V-Variante (neu):** eigenes Motiv (z. B. Kette, die sich zur Schleife zurückbiegt), Hintergrund „Glutkern“
   (dunkles Rot-Violett, die zwölf Strahlen hinter dem Motiv golden mit 18 % statt 7 % Deckkraft), feine Goldkontur am
   Motiv. In der Leiste glüht ein V-Knopf beim Bereitwerden einmal auf (nur `opacity`/`transform`, keine Dauerschleife).

Lesbarkeit: am Handy ist ein Symbol 40–48 px groß. Zusätzliche Elemente mindestens 8 Einheiten der 48er-Fläche groß,
höchstens drei neue Elemente bis L, kräftiger Kontrast zum Hintergrund. Kosten: keine – jede Variante wird einmal
gezeichnet und gemerkt.

### 2.4 Rang der Ulti

Ultis haben keine eigene Stufe (Stärke über die Charakterstufe, `ultPower`). Vorschlag: **Ulti-Rang = der Rang, den
mindestens drei der fünf Wegfertigkeiten erreicht haben** (drittbester Rang). Kein neues Speicherfeld, wächst mit dem
Fortschritt, kann nicht mit einer einzigen hochgezogenen Fertigkeit erschlichen werden. Die Ulti bekommt damit Rahmen,
Motiv-Erweiterung und Rang-Boni wie jede Fertigkeit (Tabelle 4.13).

### 2.5 Klassensegen

Die sechs Klassensegen bekommen **keinen Rang**: Sie lassen sich bewusst nicht verbessern, halten 30 Minuten und wachsen
alle 10 Charakterstufen. Ein Rang-Bonus wäre dort nur eine weitere Zahl ohne neue Mechanik und käme jeder Rotation
gleichzeitig zugute.

---

## 3. Balance

### 3.1 Grenzen

Zielwert = Gewinn des **ganzen Weges** gegenüber dem heutigen Stand **auf demselben Rang** (Messung wie 1.4).

| Rang | heute: Sprung in den Rang (1 Ziel / 5 Ziele) | Ziel Rang-Boni 5 Ziele | Ziel 1 Ziel | Kontrolle (Betäubt-/Verlangsamt-Sekunden je Minute) | Überleben (Zeit bis Tod) |
|---|---|---|---|---|---|
| E | +15 % / +16 % | +3 bis +5 % | +1 bis +3 % | bis +10 % | bis +5 % |
| H | +6 % / +2 % | +6 bis +9 % | +3 bis +5 % | bis +15 % | bis +8 % |
| L | +7 % / +5 % | +9 bis +13 % | +5 bis +7 % | bis +20 % | bis +12 % |
| V | +8 % / +15 % | +13 bis +18 % | +7 bis +10 % | bis +25 % | bis +15 % |

Begründung:

- **Etwa ein Rang-Sprung obendrauf:** Der Eintritt in H/L/V bringt heute +6–8 %. Die neuen Boni sollen diesen Schritt
  ungefähr verdoppeln – spürbar, aber nicht mehr als die zehn Stufen innerhalb eines Rangs (+40 % in `dmgScale`), damit
  sich Bücher, Schriftrollen und Seelensteine weiter lohnen.
- **Fläche vor Einzelziel:** Die Bausteine (mehr Ziele, Radius, Nachbeben) sind Flächenwerkzeuge. Bosskämpfe (1 Ziel)
  sollen höchstens 10 % kürzer werden; die Bossbalance (Endgame 80, Turm, Instanzen) bleibt so tragfähig.
- **V am größten:** V ist eine einzige Stufe ab Charakterstufe 65 mit dem teuersten Gegenstand; das V-Extra ist das
  Ziel des ganzen Weges.
- **Gesamtweg 14 → V:** heute ×1,97 (1 Ziel) bzw. ×2,05 (5 Ziele), mit den Boni geschätzt etwa ×2,15 bzw. ×2,4.
- **Abklingzeit** höchstens −10 % und nur bei Bewegungs- oder Hilfsfertigkeiten (sie wirkt auf alles multiplikativ).
- **Kontrolle** höchstens +25 %: Wellen an Seelensteinen sollen nicht dauerhaft stehen.
- **Überleben:** Schilde und Notfall-Effekte höchstens einmal je Wirken bzw. alle 30–60 s.
- **Einzelne Fertigkeit:** eigener Schaden höchstens +20 % (E), +30 % (H), +40 % (L), +55 % (V) in ihrer Hauptrolle;
  große Werte nur bei Fertigkeiten mit kleinem Anteil am Weg (Sprungschlag, Eisschritt).

### 3.2 Hochrechnung des Entwurfs

Rechnung: gemessener Anteil jeder Quelle am Schaden des Weges (L10, Stufe 80, std) × geplanter Gewinn der Quelle aus
Abschnitt 4 (Ultis nicht mitgerechnet, sie haben ein eigenes Budget: V höchstens +25 % der Ulti = +1 bis +4 % Weg).
Das ist eine Schätzung; verbindlich ist die Messung nach dem Umsetzen.

| Weg | 1 Ziel E · H · L · V | 5 Ziele E · H · L · V |
|---|---|---|
| Krieger · Klinge | +2 · +3 · +4 · +9 % | +3 · +6 · +9 · +16 % |
| Krieger · Leib | +0 · +2 · +7 · +10 % | +1 · +7 · +12 · +18 % |
| Ninja · Dolch | +0 · +1 · +4 · +10 % | +2 · +4 · +6 · +14 % |
| Ninja · Falke | +0 · +0 · +3 · +8 % | +3 · +5 · +10 · +18 % |
| Schamane · Drache | +0 · +0 · +3 · +10 % | +4 · +5 · +8 · +18 % |
| Schamane · Heilung | +1 · +3 · +3 · +9 % | +4 · +5 · +5 · +13 % |
| Nekromant · Seelen | +2 · +2 · +4 · +7 % | +3 · +8 · +11 · +18 % (ohne Dienerausgleich) |
| Nekromant · Knochen | +0 · +0 · +2 · +10 % | +4 · +6 · +10 · +18 % |
| Magier · Feuer | +1 · +2 · +5 · +11 % | +4 · +5 · +10 · +18 % |
| Magier · Frost | +0 · +2 · +2 · +7 % | +2 · +7 · +10 · +19 % |
| Magier · Blitz | +0 · +0 · +1 · +4 % | +6 · +9 · +10 · +18 % |
| Magier · Erde | +0 · +0 · +0 · +9 % | +5 · +9 · +10 · +18 % |
| **Mittel** | **+0 · +1 · +3 · +9 %** | **+3 · +6 · +9 · +17 %** |

Magier · Blitz liegt bei einem Ziel absichtlich niedrig: Er ist der PvP-Weg ohne `PATH_DMG`-Ausgleich, und die
Kettenblitz-Boni sollen gegen einen einzelnen Spieler nichts verschieben. Bei E liegt er leicht über dem Korridor
(+6 % statt höchstens +5 %), weil der Kettenblitz das Vorzeige-Beispiel ist; beim Umsetzen gegebenenfalls
Zusatzsprünge auf −45 % stellen.

### 3.3 PvP

PvP-Regeln heute (`PVP_DMG`, `pvpIncoming`): Faktor 0,38 → 0,30, Rüstung doppelt, Deckel **25 % je Treffer
(kritisch 35 %) und 45 % in 1,5 s**, Heilung und Lebensraub zu 60 %, Zustände gehen nicht über das Netz (Ausnahme
`pvpStun` mit `PVP_STUN`: höchstens 1 s, dann 4 s Schutz), Ausgleich je Weg `PATH_DMG`.

Für die Rang-Boni zusätzlich:

1. **Gleiches Ziel erneut** (Rücksprung, Nachbeben, Nachschlag, Klon, zweite Hand, Federn, Male): gegen Spieler
   ×0,5. Umsetzung beim Werfer: Option `rankEcho` an `hitMonster` → `pvpOutgoing` halbiert; der Empfänger bleibt
   unverändert, alte Versionen rechnen also richtig.
2. **Neue Zustände wirken nicht auf Spieler** (Verlangsamen, Betäuben, Einfrieren, Hochschleudern, Sog, Furcht, Köder) –
   wie heute. Der Sprungschlag behält seine `pvpStun`-Regel; sein Zweitsprung betäubt nicht.
3. **Schutz** aus Rang-Boni zählt in den bestehenden Deckel `otherMax` (50 %); „Nicht sterben“ (Starker Körper V) und
   Wiederbeleben (Lichtkuppel V) wirken in Duell und Turnierarena nicht; Notheilungen zu 60 %.
4. **Kein Sonderweg:** Jeder Rang-Treffer läuft über `hitMonster` → `duelHit`/`pvpOutgoing` und damit durch alle Deckel.
   Ein V-Extra kann also nie einen Treffer über 35 % erzeugen.
5. **Abnahme** (Paket 9): `tools/balance-sim.js --pvp` mit allen Fertigkeiten auf V gegen denselben Lauf ohne Boni:
   Siegquote je Weg höchstens ±5 Punkte, kein zusätzliches Paar über 65 %, größter Treffer ≤ 35 %, Median bis zum Sieg
   auf Stufe 80 nicht unter 15 s (top) bzw. 9 s (std). Sonst `PATH_DMG` des Weges nachstellen.

---

## 4. Tabellen je Klasse und Weg

Je Zelle: **M** Mechanik, **O** Optik, **S** Symbol. Prozentwerte bei Treffern = Anteil am normalen Treffer der
Fertigkeit (gleiche Formel, also mit `dmgScale`). Alle Werte kumulativ. „(heute)“ = gibt es schon (1.5).

### 4.1 Krieger · Weg der Klinge (PvE, Fläche)

| Fertigkeit | E | H | L | V – Extra |
|---|---|---|---|---|
| **Aderlass**<br>4 Hiebe im Kegel, Blutung | **M** Blutung stapelt bis 7 (heute 6).<br>**O** Wunde glimmt am Gegner, sobald 7 Stapel liegen.<br>**S** vierter Bluttropfen. | **M** Kegel 140° → 160°, Reichweite 100 → 110.<br>**O** Hiebe fächern breiter, der Nachschnitt (heute) läuft über den ganzen Kegel.<br>**S** vierter, weiter gefächerter Schnitt. | **M** Letzter Hieb reißt die Wunden auf: 0,3 s Blutungsschaden aller Stapel sofort.<br>**O** kleine Blutfontäne an jedem Aufgerissenen (im Gedränge nur am Ziel).<br>**S** goldene Klingenkanten, Tropfen spritzen hoch. | **Blutfächer:** Der heute nur sichtbare Fächer aus drei roten Lichtklingen fliegt 160 weit los und durchschlägt alles auf seiner Bahn (je 10 %).<br>**O** drei Klingen mit Glutschweif in Hüfthöhe, verglühen am Ende in Funken.<br>**S** V-Motiv: drei Lichtklingen schießen über den Rand hinaus. |
| **Schwertwirbel**<br>Kreis, Betäubung | **M** Radius 100 → 110.<br>**O** Schweif reicht sichtbar weiter (heute wächst nur das Bild um 10 % je Rang – jetzt passt die Trefferfläche dazu).<br>**S** zweite, äußere Schwungsichel. | **M** Sog: Gegner bis 150 werden vor dem Treffer 25 zur Mitte gezogen.<br>**O** Staubschlieren drehen spiralförmig nach innen.<br>**S** drei Schlieren zeigen zur Mitte. | **M** Betäubung 0,8 → 1,0 s, danach 2 s −20 % Tempo.<br>**O** goldene Funkenspur an der Klinge, Getroffene taumeln mit Funkenresten.<br>**S** Klinge gold, Funkenbogen. | **Nachwirbel:** 0,4 s später kreisen zwei Geisterschwerter einmal in Brusthöhe um den Krieger (20 %, ohne Betäubung).<br>**O** 2D `bladespin` in Rot-Gold; 3D zwei halbdurchsichtige Riesenklingen mit Glutschweif.<br>**S** zwei gekreuzte Geisterschwerter hinter dem Wirbel. |
| **Kampfrausch**<br>Buff Angriffstempo | **M** Nach jedem besiegten Gegner 2 s +12 % Lauftempo (frischt auf, stapelt nicht).<br>**O** kurze Blitzspur an den Füßen.<br>**S** kleiner Blitz unter der Flamme. | **M** Jeder 8. Grundangriff entlädt einen Blitz ins Ziel (0,3× Angriff).<br>**O** Blitz fährt sichtbar aus der Schulter ins Ziel.<br>**S** Blitz zuckt aus der Flamme. | **M** Der Blitz springt auf einen zweiten Gegner (bis 120).<br>**O** goldene Kette zwischen den Zielen.<br>**S** gegabelter Blitz, Flammenkern gold. | **Gewitterleib:** jeder 6. Grundangriff, Blitz springt auf bis zu drei Gegner (0,25×); beim Wirken 5 s +10 % Lauftempo.<br>**O** solange der Buff läuft, drei kleine Blitzbögen über dem Kopf (Krone aus Blitzen), Entladungen rot-gold.<br>**S** Flammengestalt mit Blitzkrone. |
| **Sprungschlag**<br>Sprung, Betäubung (`pvpStun`) | **M** Landekreis 80 → 90.<br>**O** größere Mulde, Brocken in der Rangfarbe gesäumt.<br>**S** Mulde breiter. | **M** Landung zieht Gegner bis 130 um 25 zur Mitte; Betäubung +0,2 s (Spieler unverändert).<br>**O** Staubschwaden laufen zur Mulde zurück.<br>**S** Nachbild des Sprungbogens. | **M** Nachbeben 0,6 s nach der Landung: 20 % im Radius 110, 2 s −30 % Tempo.<br>**O** Risse laufen strahlenförmig aus der Mulde, Steine hüpfen hoch.<br>**S** goldene Risse in der Mulde. | **Zweitsprung:** 3 s lang ein zweiter Sprung ohne Mana und ohne neue Abklingzeit (30 %, ohne Betäubung).<br>**O** Knopf pulsiert im Fenster; Zweitsprung mit Glutschweif am Körper, Landung wirft glühende Brocken.<br>**S** zwei Sprungbögen, der zweite glühend. |
| **Aura des Schwertes**<br>Buff fester Angriff (Tabelle) | **M** Grundangriff-Reichweite 54 → 60 (die Energieklinge ist länger).<br>**O** die Klinge wächst (heute) – jetzt auch spürbar.<br>**S** längerer Lichtsaum an der Klinge. | **M** Jeder 6. Grundangriff spaltet: ein zweiter Gegner daneben nimmt 25 %.<br>**O** breiter Bogen in der Rangfarbe beim Spalten.<br>**S** zweite, durchscheinende Klinge. | **M** Spalten trifft zwei Gegner.<br>**O** lodernde Kanten an der Energieklinge (wie beim Klingenkreuz).<br>**S** goldene Doppelklinge. | **Lichtsichel:** jeder 6. Grundangriff schickt zusätzlich eine Lichtsichel 160 weit nach vorn (15 %, bis drei Gegner).<br>**O** Sichel in Rot-Gold fliegt in Hüfthöhe, verglüht.<br>**S** Schwert mit Sichelbogen davor. |

Dateien: `aderlass.js` (`SKILL_TYPES.flurry`, `aderlassFx`, `adlSlash3`/`adlSlash2`, `flurrySkillStats`),
`kampf.js` (`SKILL_TYPES.circle`, `leap`, `leapLand`, `applyBuff`, `tryBasicAttack` für Blitz/Spalten/Sichel),
`fertigkeiten.js` (`SKILL_FX` Wirbel/Kampfrausch/Sprung, Kampfrausch-Blitze an der Figur), `ninja-fx.js`
(`schwertauraCast`), `zeichnen.js` und `drei-figuren.js` (Energieklinge), `koerperaura.js`, `symbole-krieger.js`.

### 4.2 Krieger · Weg des Leibes (PvP, Kontrolle)

| Fertigkeit | E | H | L | V – Extra |
|---|---|---|---|---|
| **Felsenfaust**<br>Riss, Pfeiler, Betäubung | **M** Riss 120 → 135 weit.<br>**O** Riss glüht in der Rangfarbe.<br>**S** Riss reicht bis an den Rand. | **M** Der Riss trifft Gegner auf dem Weg (30 %, ohne Betäubung).<br>**O** Steinsplitter springen entlang des Risses.<br>**S** Splitter entlang des Risses. | **M** Ziel nach der Landung 2 s −30 % Tempo.<br>**O** goldene Adern im Pfeiler.<br>**S** Pfeiler mit Goldadern. | **Doppelpfeiler:** 0,4 s später bricht ein zweiter Pfeiler neben dem Ziel hervor: 35 % an anderen Gegnern im Radius 60, Rückstoß 40 (das Ziel selbst nicht).<br>**O** zweiter Pfeiler (vorhandenes Modell) dunkelrot glühend, Lavaspritzer nach oben.<br>**S** zwei Pfeiler, der zweite glühend. |
| **Erdbeben**<br>Kreis, Betäubung | **M** Radius 115 → 125.<br>**O** Staubwelle läuft weiter.<br>**S** zweite Bodenwelle. | **M** Getroffene 3 s erschüttert: +6 % erlittener Schaden.<br>**O** Gegner wanken, Staub rieselt von ihnen.<br>**S** Risse im Motiv. | **M** Nachbeben 0,7 s später: 20 %, 2 s −30 % Tempo.<br>**O** Risse strahlenförmig, Steine hüpfen.<br>**S** goldene Risse. | **Bergbeben:** 1 s nach dem Beben brechen drei Felszacken am Rand empor (Radius 50, je 30 %, kurz hochgeschleudert).<br>**O** Zacken aus dem Erdspitzen-Modell, Staubsäulen.<br>**S** drei Felszacken am Rand. |
| **Starker Körper**<br>Buff Schutz | **M** Beim Wirken Steinschild 8 % Leben für 5 s.<br>**O** Steinsplitter legen sich an Schultern und Brust.<br>**S** Steinsplitter am Schild. | **M** Letzte Bastion: einmal alle 30 s unter 35 % Leben 3 s zusätzlich −20 % Schaden (PvP im Deckel).<br>**O** Steinhaut bricht goldgrau auf.<br>**S** zweiter Splitter. | **M** Dornen: Nahkampfgegner nehmen 10 % ihres Treffers zurück (PvP ×0,5).<br>**O** Steinspitzen zucken beim Getroffenwerden aus der Schulter.<br>**S** Dornenkante am Schild. | **Unbeugsamer Leib:** einmal je Wirken hält dich ein tödlicher Treffer bei 1 Leben, danach 2 s unverwundbar (nicht in Duell und Arena).<br>**O** Figur erstarrt zu goldglühendem Stein mit leuchtenden Rissen, Funken steigen auf.<br>**S** Schild als Steinfaust mit glühenden Rissen. |
| **Geistesschlag**<br>Einzelziel, hoher Schaden | **M** Rückstoß 80 → 100, Ziel 1 s −30 % Tempo.<br>**O** Schlagwelle in der Rangfarbe.<br>**S** Schlagwelle am Hammer. | **M** Geistwelle läuft 100 hinter dem Ziel weiter (25 % an allen auf der Linie).<br>**O** blauer Faustabdruck fliegt weiter.<br>**S** Welle hinter dem Hammer. | **M** Gegner unter 30 % Leben nehmen +20 %.<br>**O** goldener Riss im Ziel bei solchen Treffern.<br>**S** goldener Riss. | **Hieb des Weltgeistes:** 0,5 s später schlägt ein Geisterarm hinter dem Krieger auf dasselbe Ziel nach (15 %, PvP ×0,5).<br>**O** halbdurchsichtiger Riesenarm aus Licht, Druckwelle in der Luft.<br>**S** riesige Geisterfaust hinter dem Motiv. |
| **Kriegsschrei**<br>Fluch: verwundbar, langsam | **M** Radius 170 → 185.<br>**O** Schallwellen größer.<br>**S** größerer Schallbogen. | **M** Gegner werden 30 zurückgestoßen (Raum schaffen).<br>**O** Druckwelle als Luftflimmern (keine Bodenringe).<br>**S** Druckbögen. | **M** Verwundbarkeit hält 2 s länger.<br>**O** Getroffene glühen länger orange.<br>**S** goldene Schallbögen. | **Ruf der Apokalypse:** Gegner fliehen 1,5 s in Furcht (keine Bosse, keine Spieler).<br>**O** rote Schallwellen aus dem Helm, Fliehende mit rot glühenden Augen.<br>**S** brüllender Helm mit roten Wellen. |

Dateien: `kampf.js` (`SKILL_TYPES.erupt`, `circle`, `strike`, `curse`, `applyBuff`, `damagePlayer` für Bastion,
Dornen, Unbeugsam), `fertigkeiten.js` (`SKILL_FX`), `drei-figuren.js` (Pfeiler, Pose), `koerperaura.js`,
`symbole-krieger.js`.

### 4.3 Ninja · Weg des Dolches (PvE)

| Fertigkeit | E | H | L | V – Extra |
|---|---|---|---|---|
| **Hinterhalt**<br>Stich, aus der Tarnung Sprung | **M** Sprungweite aus der Tarnung 220 → 250.<br>**O** Schattenspur beim Sprung in der Rangfarbe.<br>**S** längere Schattenspur. | **M** Schattenwunde: Ziel blutet 4 s (0,06× je s).<br>**O** violette Tropfen am Ziel.<br>**S** zweiter Tropfen. | **M** Nach Hinterhalt aus der Tarnung 2 s +20 % Lauftempo.<br>**O** Schattenschleier am Körper.<br>**S** goldene Klingenspitze. | **Schattendoppel:** 0,25 s später sticht ein Schattenklon von der anderen Seite zu (20 %, PvP ×0,5).<br>**O** Klon aus dem Modell der Ulti „Schattendoppelgänger“, zerfällt in Rauch.<br>**S** zwei gekreuzte Dolche, einer als Schatten. |
| **Tarnung**<br>Buff unsichtbar, nächster Angriff ×1,6 | **M** Lauftempo in der Tarnung 12 → 16 %.<br>**O** dünner Schattenschweif.<br>**S** Schattenschweif am Halbmond. | **M** Rauchwolke beim Tarnen: Gegner bis 90 sind 2 s −40 % Tempo.<br>**O** Rauch in Brusthöhe (keine Bodenmarke).<br>**S** Rauchwolke. | **M** Abklingzeit 35 → 30 s.<br>**O** Auge im Rauch golden.<br>**S** goldenes Auge. | **Nachschatten:** nach dem Angriff aus der Tarnung bleibt 2 s ein Schattendouble stehen, das Monster auf sich zieht (kein Schaden, ohne Wirkung auf Spieler).<br>**O** halbdurchsichtige Kopie mit flackerndem Rand.<br>**S** Halbmond mit doppelter Silhouette. |
| **Wirbelklinge**<br>Kreis | **M** Radius 110 → 120.<br>**O** weiterer Wirbel.<br>**S** zweite Dolchspur. | **M** Getroffene 2 s −25 % Tempo.<br>**O** violetter Schattennebel an Getroffenen.<br>**S** Nebelschweif. | **M** Am Ende zieht der Wirbel Gegner 20 zusammen.<br>**O** goldene Klingenspuren.<br>**S** goldene Dolche. | **Todeswirbel:** drei Schattendolche kreisen 1,5 s in Hüfthöhe (drei Treffer je 4 %).<br>**O** `bladespin` mit drei Klingen in Violett-Rot.<br>**S** drei Dolche kreisen um das Motiv. |
| **Blitzangriff**<br>Blink hinter das Ziel | **M** Reichweite 300 → 330.<br>**O** längerer Blitzschweif.<br>**S** längere Blitzspur. | **M** Schockwelle beim Auftauchen: Gegner bis 60 ums Ziel 20 %.<br>**O** kurzer Kranz aus Blitzbögen in der Luft.<br>**S** Funken ums Ziel. | **M** Abklingzeit 8 → 7,5 s.<br>**O** Nachbilder in Gold.<br>**S** goldene Nachbilder. | **Augenblick des Todes:** springt nach dem Treffer zu einem zweiten Gegner bis 200 (40 %, 0,6 s Taumeln).<br>**O** rot-goldener Doppelblitz, zweiter Auftritt mit Nachbild.<br>**S** zwei Blitzspuren zu zwei Dolchen. |
| **Schattenkette**<br>Sprünge von Gegner zu Gegner | **M** (heute 5 Sprünge) + Reichweite 300 → 320.<br>**O** Sprungspur in der Rangfarbe.<br>**S** vierte Schattenfigur. | **M** (heute 6 Sprünge) + Sprungweite 220 → 240.<br>**O** Nachbilder an jedem Sprungpunkt.<br>**S** Kette läuft über den Rand. | **M** (heute 6, kein Zuwachs) + Taumeln 0,6 → 0,8 s.<br>**O** goldene Schnittlinien.<br>**S** goldene Kette. | **Tausend Schatten:** (heute 7 Sprünge) + an jedem Getroffenen bleibt ein Schattenmal, alle platzen 1 s nach dem letzten Sprung (je 15 %, PvP ×0,5).<br>**O** violette Flammen über den Köpfen (nicht am Boden), platzen gleichzeitig.<br>**S** fünf Figuren mit kleinen Malen. |

Dateien: `kampf.js` (`SKILL_TYPES.strike`, `circle`, `blink`, `applyBuff`, `stealthCastBegin/End`,
`breakStealth`), `ninja-fx.js` (`ninjaFx3`, `SKILL_TYPES.chainblink`, `chainHops`), `ultimativ.js`
(Klon-Bild von `schattenklone` wiederverwenden), `symbole-ninja.js`.

### 4.4 Ninja · Weg des Falken (Bogen)

| Fertigkeit | E | H | L | V – Extra |
|---|---|---|---|---|
| **Falkenpfeil**<br>Salve aus 3 Pfeilen | **M** Letzter Pfeil stößt 45 → 60 und 1 s −30 % Tempo.<br>**O** größerer Schattenstoß beim letzten Pfeil.<br>**S** vierte Feder. | **M** (heute) vier Pfeile.<br>**O** vierter Pfeil mit Schweif in der Rangfarbe.<br>**S** vier Pfeile. | **M** Letzter Pfeil durchschlägt und trifft einen Gegner dahinter (bis 120, 50 %).<br>**O** Spiralschweif dringt durch.<br>**S** Pfeil durchbohrt eine Silhouette. | **Sturm der schwarzen Federn:** jeder Pfeil lässt eine Schattenfeder stecken; nach der Salve stoßen alle zugleich nach (je 10 % eines Pfeils, PvP ×0,5).<br>**O** schwarze Federn mit rot-goldener Kante zucken auf.<br>**S** Federkranz um den Bogen. |
| **Pfeilregen**<br>Fläche, verlangsamt | **M** (heute +0,5 s) + Radius 135 → 145.<br>**O** Wolke etwas breiter.<br>**S** breitere Wolke. | **M** (heute +1 s) + Gegner bleiben nach dem Verlassen 1 s länger verlangsamt.<br>**O** Schattenreste an den Beinen.<br>**S** zweite Pfeilreihe. | **M** (heute +1,5 s) + letzter Puls doppelter Schaden (schwere Pfeile).<br>**O** dicke Pfeile mit goldener Spitze zum Schluss.<br>**S** goldene Pfeilspitzen. | **Sintflut:** (heute +2 s) + zum Ende stürzt ein Schattenfalke aus der Wolke in die Mitte (30 %, 0,5 s Taumeln).<br>**O** Falke (Modell des Splitterfalken) mit Federwirbel.<br>**S** Falke über der Wolke. |
| **Durchbohrender Schuss**<br>Linie | **M** Reichweite 680 → 720.<br>**O** längere Spirale.<br>**S** längerer Pfeil. | **M** Jeder durchschlagene Gegner verstärkt den Pfeil um 7 % (bis +35 %).<br>**O** Spirale wird mit jedem Treffer dicker.<br>**S** dreifache Spirale. | **M** Getroffene 2 s −30 % Tempo.<br>**O** goldener Pfeilkern.<br>**S** goldener Kern. | **Speer des Himmels:** am Ende spaltet sich der Pfeil in drei Splitter, die zurückfliegen (je 15 %, jeder Gegner je Splitter einmal).<br>**O** drei rot-violette Splitter im Fächer zurück.<br>**S** Pfeil, der sich in drei Spitzen teilt. |
| **Splitterfalke**<br>Einschlag, Dornen | **M** Radius 110 → 120.<br>**O** mehr Splitter (heute) und breiter.<br>**S** mehr Splitter. | **M** Dornen stehen 1 s länger.<br>**O** Dornen dunkler, länger sichtbar.<br>**S** Dornen unter dem Falken. | **M** Gesplittert: Getroffene nehmen 3 s +8 % Schaden von deinen Pfeilen.<br>**O** Glasglitzern an Getroffenen.<br>**S** goldene Splitterkanten. | **Scherbensturm:** sechs Glassplitter fliegen nach außen bis 200 (je 10 %, erster Gegner).<br>**O** schwarzes Glas mit roter Kante, kurzer Lichtblitz.<br>**S** Splitterstern in der Luft um den Falken. |
| **Schattenschritt**<br>Flucht | **M** Weite 300 → 330.<br>**O** längere violette Spur.<br>**S** längere Spur. | **M** Abklingzeit 10 → 9 s.<br>**O** Falkenschwinge an der Spur.<br>**S** Schwinge. | **M** Am Ausgangsort bleibt 2 s ein Schattenköder (zieht Monster).<br>**O** Rauchgestalt am Ausgangsort.<br>**S** Rauchgestalt. | **Zweitschritt:** 3 s lang ein zweiter Schritt ohne Mana (nur Flucht, ohne Schaden).<br>**O** Schattenschwingen am Körper beim Zweitschritt.<br>**S** zwei Spuren. |

Dateien: `fernninja.js` (`SKILL_TYPES.bshot`/`salvoFx`, `bregen` und Pulse, `bpierce`/`pierceFx`, `bsplitter`,
`bshadow`/`shadowStepFx`, `bowSkillStats`, `SKILL_ART` der Falken-Fertigkeiten).

### 4.5 Schamane · Weg des Drachen (PvE)

| Fertigkeit | E | H | L | V – Extra |
|---|---|---|---|---|
| **Blitzdrache**<br>Drache entlädt sich am Ziel | **M** Radius 100 → 110.<br>**O** Entladung breiter.<br>**S** zweiter Schweifbogen. | **M** Strom springt beim Ablaufen auf einen Nachbarn über (2 s Strom).<br>**O** dünner Funke springt über.<br>**S** Funke am Schweif. | **M** Nach der Entladung springt ein Blitz zu einem Gegner bis 160 (25 %).<br>**O** goldener Sprungblitz.<br>**S** goldene Hörner. | **Drachenkaiser:** Der Drache kehrt um und schlägt 0,5 s später ein zweites Mal ein (Radius 70, 12 %).<br>**O** Drache wendet in einer Schleife in der Luft, zweiter Einschlag rot-gold.<br>**S** Drache in Schleife mit Krone. |
| **Drachenwirbel**<br>3 Umläufe, Rückstoß, Brand | **M** Radius 170 → 180.<br>**O** Kreisbahn weiter.<br>**S** weiterer Bogen. | **M** Vor dem letzten Umlauf 30 nach innen ziehen.<br>**O** Feuerschlieren nach innen.<br>**S** Schlieren. | **M** Brand 3 → 4 s.<br>**O** goldene Flammenspitzen.<br>**S** goldener Kopf. | **Wirbel des Drachengottes:** vierter Umlauf (25 %).<br>**O** zweiter Geisterdrache in Rot-Violett läuft gegenläufig.<br>**S** zwei Drachen im Kreis. |
| **Drachenkraft**<br>Buff (Tabelle) | **M** Beim Wirken Schuppenschild 6 % Leben (5 s).<br>**O** Schuppen leuchten kurz auf.<br>**S** Schuppenrand. | **M** Jeder 10. erlittene Treffer löst einen Feuerstoß um dich aus (Radius 90, 30 %).<br>**O** Flammenstoß in Hüfthöhe.<br>**S** Flamme. | **M** Regeneration 0,3 % Leben je s.<br>**O** grünes Glimmen in den Schuppen.<br>**S** goldene Schuppen. | **Macht des Drachengottes:** alle 8 s speit ein Geisterdrache über dir Feuer auf das Ziel (Kegel 120, 30 %).<br>**O** Drachenflügel aus Licht am Rücken, Geisterkopf speit.<br>**S** Drachenkopf mit Flügeln. |
| **Blizzard** (Schamane)<br>Fläche, verlangsamt | **M** Radius 165 → 175.<br>**O** dichterer Schnee am Rand.<br>**S** zweite Schneelage. | **M** Verlangsamung 50 → 55 %, hält 0,5 s länger.<br>**O** Raureif an den Gegnern.<br>**S** Eiskristall. | **M** Letzter Puls friert 0,6 s ein.<br>**O** kurzes Einfrieren mit goldenem Glanz.<br>**S** goldener Kristall. | **Weltenfrost:** in den letzten 2 s stürzen vier Eiszapfen auf Gegner im Kreis (je 8 %).<br>**O** Zapfen fallen aus der Wolke, zerspringen in Splitter.<br>**S** Zapfen unter der Wolke. |
| **Donnersturm**<br>Blitze am Ort, Betäubung | **M** Radius 140 → 150.<br>**O** breiterer Einschlag.<br>**S** zweiter Blitz. | **M** Betäubung 1,5 → 1,8 s.<br>**O** Funken knistern länger an Getroffenen.<br>**S** Funken. | **M** Nachblitz 0,4 s später in einen Getroffenen (15 %).<br>**O** goldener Nachblitz.<br>**S** goldener Blitz. | **Götterdämmerung:** vom Einschlag springen Blitze zu bis zu drei Gegnern bis 120 außerhalb (je 25 %).<br>**O** rote Blitzarme fahren seitlich aus der Wolke.<br>**S** Wolke mit drei Blitzarmen. |

Dateien: `kampf.js` (`SKILL_TYPES.dragon`, `vortex`, `blizzard`, `blast`, `DRACHENKRAFT`, `applyBuff`),
`fertigkeiten.js` (`dragonFx`, `vortexFx`, `blizzardFx`, `SKILL_FX`), `drei-fx.js` (3D der Effekte),
`symbole-schamane.js`.

### 4.6 Schamane · Weg der Heilung (PvP, Heilung)

| Fertigkeit | E | H | L | V – Extra |
|---|---|---|---|---|
| **Lichtsturz**<br>Lichtsäule, Betäubung | **M** Radius 100 → 110.<br>**O** breitere Säule.<br>**S** breitere Säule. | **M** Geblendet: getroffene Monster treffen 3 s 15 % schwächer.<br>**O** heller Schein vor den Augen der Gegner.<br>**S** Lichtsplitter. | **M** Jeder Lichtsturz heilt 1,5 % Leben je getroffenem Gegner (höchstens 4,5 %).<br>**O** Lichtfunken fliegen zur Schamanin zurück.<br>**S** goldener Kern. | **Fall der Sonne:** 0,5 s später fällt ein zweiter, schmaler Strahl aufs Ziel (Radius 60, 8 %).<br>**O** weiß-goldener Strahl aus großer Höhe, kurzes Gegenlicht.<br>**S** Sonne über der Säule. |
| **Windfessel**<br>Fluch: langsam, verwundbar | **M** Radius 170 → 185.<br>**O** längere Windbänder.<br>**S** drittes Band. | **M** Dauer 6 → 7 s.<br>**O** Bänder glimmen länger.<br>**S** Knoten im Band. | **M** Gefesselte werden je s 10 zur Mitte gezogen.<br>**O** Bänder ziehen sichtbar nach innen.<br>**S** goldene Bänder. | **Ketten der Ewigkeit:** zum Ende zwei Windstöße (je 15 %, Rückstoß 60).<br>**O** Bänder reißen in einer Windhose in Brusthöhe.<br>**S** Windhose. |
| **Segen**<br>Buff Schutz, Regeneration, Krit | **M** Beim Wirken sofort 5 % Leben.<br>**O** Lichtregen auf die Figur.<br>**S** zweiter Lichtstrahl. | **M** Gruppenmitglieder bis 300 erhalten beim Wirken die halbe Kritchance und Regeneration.<br>**O** Lichtfaden zu jedem Mitglied.<br>**S** zwei kleine Gestalten. | **M** Entfernt beim Wirken Gift und Blutung.<br>**O** dunkle Tropfen lösen sich auf.<br>**S** goldener Heiligenschein. | **Göttlicher Segen:** einmal je Wirken unter 30 % Leben sofort 20 % Heilung (PvP ×0,6).<br>**O** Lichtflügel öffnen sich kurz.<br>**S** Flügel. |
| **Heilung**<br>Heilen + Angriff | **M** Nachheilung 4 s je 1 % Leben.<br>**O** grüne Tropfen steigen weiter auf.<br>**S** Tropfen. | **M** Gruppenmitglieder bis 300 erhalten 50 % der Heilung.<br>**O** grüner Bogen zu jedem Mitglied.<br>**S** zweite Hand. | **M** Abklingzeit 20 → 17 s.<br>**O** goldener Kern der Heilblüte.<br>**S** goldene Blüte. | **Wiedergeburt:** Überheilung wird zum Schild (bis 15 % Leben, 6 s).<br>**O** Schild aus Blütenblättern in der Luft um die Figur.<br>**S** Blüte mit Blätterkranz. |
| **Falkengeist**<br>Buff Krit | **M** Der Falke stößt alle 5 s aufs Ziel (0,25× Angriff).<br>**O** Falke stürzt sichtbar herab.<br>**S** Sturzlinie. | **M** alle 4 s.<br>**O** Federspur.<br>**S** Federn. | **M** Stoß verlangsamt 1 s um 30 %.<br>**O** goldene Schwingen.<br>**S** goldene Schwingen. | **Falke der Götter:** ein zweiter Falke, beide stoßen abwechselnd alle 4 s.<br>**O** zweiter Falke in Rot-Gold.<br>**S** zwei Falken. |

Dateien: `kampf.js` (`SKILL_TYPES.blast` mit `fx: 'licht'`, `curse`, `buff`, `heal`), `heiler-fx.js`
(`heilerLicht`, `heilerFx3`, `falke3`), `gruppe.js` (Gruppenheilung, Segen auf Mitglieder), `symbole-schamane.js`.

### 4.7 Nekromant · Weg der Seelen (PvE, Diener)

| Fertigkeit | E | H | L | V – Extra |
|---|---|---|---|---|
| **Blutsauger**<br>Kanal, Lebensraub | **M** Reichweite 300 → 320, Kanal bis 9 s.<br>**O** längerer Blutstrang.<br>**S** längerer Strang. | **M** Strahl springt auf einen zweiten Gegner bis 120 (35 %, ohne Lebensraub).<br>**O** zweiter, dünner Strang.<br>**S** gegabelter Strang. | **M** Lebensraub 35 → 40 %.<br>**O** goldene Tropfen im Strang.<br>**S** goldene Tropfen. | **Herr des Blutes:** Heilung über volles Leben fließt an deine Diener (der schwächste zuerst).<br>**O** rote Fäden von der Figur zu den Dienern.<br>**S** Herz mit Fäden. |
| **Seelenkäfig**<br>Pulse, Sog | **M** Radius 125 → 135.<br>**O** höhere Gitterstäbe.<br>**S** weiterer Stab. | **M** Sog 30 → 40.<br>**O** Seelen ziehen nach innen.<br>**S** Seelenschlieren. | **M** 6 statt 5 Pulse.<br>**O** goldene Stabspitzen.<br>**S** goldene Spitzen. | **Gefängnis der Ewigkeit:** zum Ende zerbricht der Käfig: Seelensplitter 40 % an allen darin, 1 s Furcht.<br>**O** Stäbe bersten nach außen, grüne Splitter.<br>**S** gesprengter Käfig. |
| **Totenbeschwörung**<br>Diener nach Rang (heute) | **M** (heute Knochenhunde) + Diener erscheinen mit 2 s Unverwundbarkeit.<br>**O** grüner Schimmer beim Erscheinen.<br>**S** Hund statt Skelett im Motiv. | **M** (heute Knochendrachen) + Diener folgen 15 % schneller.<br>**O** Seelenspur hinter den Dienern.<br>**S** Drache im Motiv. | **M** (heute große Drachen) + Diener heilen sich je Treffer um 1 % ihres Lebens.<br>**O** goldene Augen.<br>**S** goldene Augen. | **Armee der Unterwelt:** (heute Seelenkolosse) + die Kolosse brechen mit einem Stampfer aus dem Boden (60 % im Radius 90, verlangsamt).<br>**O** Kolosse mit Seelenflammen auf den Schultern.<br>**S** Koloss mit Flammen. |
| **Totenruf**<br>Geister aus Gräbern (Anzahl heute) | **M** (heute 3 Geister) + Geister erscheinen 0,3 s schneller.<br>**O** Gräber leuchten.<br>**S** dritter Geist. | **M** (heute 4) + Geisterschläge verlangsamen 1 s um 15 %.<br>**O** Nebelschweif.<br>**S** vierter Geist. | **M** (heute 4, kein Zuwachs) + Geister platzen beim Verschwinden (30 %, Radius 60).<br>**O** grüner Seelenblitz beim Platzen.<br>**S** goldene Geisteraugen. | **Tag der Toten:** (heute 5) + ein Geist trägt ein Banner: solange er lebt, +10 % Angriffstempo für alle Diener.<br>**O** Geist mit zerfetztem Banner.<br>**S** Banner. |
| **Geisterflut**<br>Geister stürzen auf einen Ort | **M** 8 → 9 Geister.<br>**O** ein Geist mehr.<br>**S** dritter Geist. | **M** Radius 150 → 160.<br>**O** breitere Flut.<br>**S** breitere Welle. | **M** Platzen verlangsamt 35 → 45 % für 3 s.<br>**O** goldener Kern beim Platzen.<br>**S** goldener Kern. | **Sintflut der Seelen:** eine zweite Welle aus vier Geistern (je 40 %).<br>**O** zweite Welle in Rot-Violett mit Schreien.<br>**S** zwei Wellen. |

Ausgleich vor den Boni: heute fällt H bei 5 Zielen um 22 % gegenüber E10, V springt um +154 % (1.4). Ziel: H nicht
schwächer als E10, V höchstens +30 % über L10 (Werte in `sk.tiers`).

Dateien: `nekro-neu.js` (`SKILL_TYPES.siphon`, `ghostflood`/`floodFx`), `oberflaeche.js` (`nekroSkillStats`), `kampf.js`
(`SKILL_TYPES.cage`, `summon`), `fertigkeiten.js` (`cageFx`), `gegner.js` und `nekro-diener.js` (Diener),
`nekro-totenruf.js` (`SKILL_TYPES.revive`, `spawnGhostAlly`), `symbole-nekromant.js`, `symbole-nekro2.js`.

### 4.8 Nekromant · Weg der Knochen (PvP, Lebensraub)

| Fertigkeit | E | H | L | V – Extra |
|---|---|---|---|---|
| **Lebensentzug**<br>Einzelziel, heilt | **M** Reichweite 300 → 330.<br>**O** längerer Strang.<br>**S** längerer Strang. | **M** Springt auf einen weiteren Gegner bis 150 (35 %, ohne Heilung).<br>**O** zweiter Strang.<br>**S** gegabelter Strang. | **M** Heilung über volles Leben wird 5 s Schild (höchstens 10 %).<br>**O** roter Schimmer um die Figur.<br>**S** goldene Tropfen. | **Kuss des Todes:** ein Seelenstrang bleibt 2 s am Ziel und entzieht dreimal je 7 % (heilt mit, PvP ×0,5).<br>**O** pulsierender Strang mit Totenkopf-Leuchten am Ziel.<br>**S** Totenkopf am Strang. |
| **Knochenwurf**<br>Linie, verlangsamt | **M** Breite 24 → 30.<br>**O** größerer Knochen.<br>**S** größerer Knochen. | **M** Verlangsamung 40 → 50 %.<br>**O** Knochenstaub an Getroffenen.<br>**S** Staub. | **M** Kehrt als Bumerang zurück (20 %).<br>**O** Knochen dreht sich zurück.<br>**S** Bogen zurück. | **Knochen des Titanen:** auf dem Rückweg zersplittert er in drei Splitter (je 12 %).<br>**O** Splitter mit grüner Glut.<br>**S** drei Splitter. |
| **Blutlarve**<br>Hüpft, platzt, Blutung | **M** Radius 110 → 120.<br>**O** größere Blutwolke.<br>**S** zweite Larve klein. | **M** Blutung 4 → 4,5 s.<br>**O** längere Tropfspur.<br>**S** Tropfen. | **M** Hüpft nach dem Platzen zu einem neuen Gegner (25 %).<br>**O** kleinere Larve springt weiter.<br>**S** goldene Larve. | **Seuche des Blutes:** Gegner, die mit Blutung sterben, platzen (30 %, Radius 70, neue Blutung).<br>**O** Blutfontäne in Rot-Violett.<br>**S** platzende Larve mit Fontäne. |
| **Totenhand**<br>Greift, hält, zerquetscht | **M** Radius 75 → 85.<br>**O** größere Hand.<br>**S** größere Hand. | **M** Haltezeit 1,6 → 1,9 s.<br>**O** Knochenfinger glimmen.<br>**S** glimmende Finger. | **M** Nach dem Zerquetschen 2 s −40 % Tempo.<br>**O** goldene Fingerknochen.<br>**S** goldene Knochen. | **Griff des Todes:** eine zweite Hand greift 0,5 s später bis 120 daneben (20 %; ohne anderen Gegner dasselbe Ziel mit 15 %, PvP ×0,5).<br>**O** zweite, dunkelrote Hand.<br>**S** zwei Hände. |
| **Blutlanzen**<br>6 Lanzen, Lebensraub | **M** Reichweite 280 → 300.<br>**O** längere Lanzen.<br>**S** siebte Lanze angedeutet. | **M** Lanzen verlangsamen 1 s um 20 %.<br>**O** Blut tropft von den Lanzen.<br>**S** Tropfen. | **M** Lebensraub 20 → 25 %.<br>**O** goldene Spitzen.<br>**S** goldene Spitzen. | **Blutgericht:** die Lanzen stecken 1 s und platzen dann gemeinsam (je 5 % im Radius 50).<br>**O** Lanzen glühen nach und platzen in Blutfunken.<br>**S** platzende Lanzen. |

Dateien: `nekro-neu.js` (`SKILL_TYPES.lifetap`/`tapFx`, `bonethrow`/`boneFx`, `larva`/`larvaFx`,
`gravehand`/`handFx`, `bloodlances`/`lanceFx`), `symbole-nekro2.js`.

### 4.9 Magier · Weg der Flamme (Feuer)

| Fertigkeit | E | H | L | V – Extra |
|---|---|---|---|---|
| **Glutfeld**<br>Feld mit Pulsen, Brand | **M** Radius 95 → 105.<br>**O** breiteres Feld.<br>**S** breitere Glut. | **M** Glutsog: je Puls 10 zur Mitte.<br>**O** Funken ziehen nach innen.<br>**S** Funkenschlieren. | **M** Brand 3 → 4 s.<br>**O** goldene Flammenspitzen.<br>**S** goldene Flammen. | **Pforte zur Hölle:** zum Schluss bricht eine Feuersäule aus der Mitte (30 %, Radius 70, kurz hochgeschleudert).<br>**O** Säule in Rot-Gold mit Glutregen.<br>**S** Feuersäule. |
| **Feuerball**<br>Zauberzeit 3 s, Splash | **M** Zauberzeit 3 → 2,8 s.<br>**O** Kugel wächst schneller.<br>**S** größere Kugel. | **M** Splash 115 → 125.<br>**O** breitere Explosion.<br>**S** Flammenkranz. | **M** Glutlache 2 s unter dem Ziel (dreimal 3 %, unregelmäßige Form).<br>**O** Lache mit goldenem Rand.<br>**S** goldener Kern. | **Sternenfeuer:** zerbirst in drei kleine Feuerkugeln, die zu anderen Gegnern bis 200 fliegen (je 10 %).<br>**O** drei Kugeln mit Schweif.<br>**S** Kugel mit drei Trabanten. |
| **Flammenwoge**<br>Welle, Rückstoß, Brand | **M** Länge 300 → 330.<br>**O** längere Woge.<br>**S** längere Woge. | **M** Rückstoß 42 → 60, 1 s −30 % Tempo.<br>**O** höherer Wellenkamm.<br>**S** Kamm. | **M** Brand 4 → 5 s.<br>**O** goldener Kamm.<br>**S** goldener Kamm. | **Weltenbrandung:** eine zweite Woge folgt 0,4 s später (20 %).<br>**O** zweite Woge in Rot-Violett.<br>**S** zwei Wogen. |
| **Phönixflamme**<br>Pfad, Einschlag, Betäubung | **M** Pfadbreite 42 → 48.<br>**O** breitere Spur.<br>**S** breitere Schwingen. | **M** Brand +1 s.<br>**O** Federglut.<br>**S** Federn. | **M** Der Phönix fliegt nach dem Einschlag 150 zurück (Pfadschaden erneut, 30 %).<br>**O** Rückflug mit goldenem Schweif.<br>**S** goldener Schweif. | **Phönix der Wiedergeburt:** stirbt ein Gegner im Feuer, steigt ein kleiner Phönix auf und stößt auf den nächsten Gegner (60 %, einmal je Wirken).<br>**O** kleiner weiß-goldener Phönix.<br>**S** zweiter, kleiner Phönix. |
| **Feuertornados**<br>Tornados im Feld (Anzahl heute) | **M** (heute 4 Tornados).<br>**O** Tornados in der Rangfarbe gesäumt.<br>**S** zweiter Tornado. | **M** (heute 5) + Tornados ziehen etwas stärker an.<br>**O** Glutspur hinter den Tornados.<br>**S** dritter Tornado. | **M** (heute 6) + Getroffene brennen 1 s länger.<br>**O** goldene Spitzen.<br>**S** goldene Spitzen. | **Weltenbrand:** (heute 7) + zum Ende verschmelzen alle Tornados in der Mitte zu einem Feuerwirbel (einmal 60 % eines Tornadotreffers an allen im Feld).<br>**O** großer Wirbel, Glut fliegt nach oben.<br>**S** ein großer Wirbel. |

Dateien: `feuerfeld.js` (`SKILL_TYPES.mfield`/`fieldFx`, `mtornado`/`tornadoFx`, `tornadoCount`, `SKILL_ART`),
`magier-neu.js` (`SKILL_TYPES.mcast`, `mphoenix`/`phoenixFx`), `flammenwoge.js` (`mwave`/`waveFx`),
`symbole-magier.js`, `symbole-magier3.js`.

### 4.10 Magier · Weg des Frosts

| Fertigkeit | E | H | L | V – Extra |
|---|---|---|---|---|
| **Frostnova**<br>Nova, einfrieren | **M** (heute Nachhall 35 %).<br>**O** zweite Front in der Rangfarbe.<br>**S** zweiter Kristallkranz. | **M** Radius 130 → 140.<br>**O** breitere Front.<br>**S** Eiszacken. | **M** Nachhall verlangsamt 2 s um 40 %.<br>**O** Raureif an Getroffenen.<br>**S** goldener Kern. | **Absoluter Nullpunkt:** Eingefrorene zerspringen beim Auftauen (25 % an Gegnern bis 50 daneben).<br>**O** Eis platzt in blau-weißen Scherben, Kältedampf.<br>**S** zersprungener Kristall. |
| **Eisstrahl**<br>Kanal, Kombo (heute) | **M** Reichweite 300 → 320.<br>**O** längerer Strahl.<br>**S** längerer Strahl. | **M** Kältestau: nach 3 s Kanal +5 % Schaden; Breite 26 → 32.<br>**O** Strahl wird dicker.<br>**S** dickerer Strahl. | **M** Am Kanalende springt ein Eissplitter auf einen Gegner bis 100 (30 %).<br>**O** goldener Kern im Strahl.<br>**S** goldener Kern. | **Atem des Winters:** jeder 5. Tick schießt einen Splitter auf einen weiteren Gegner bis 120 (40 %, verlangsamt); ohne weiteren Gegner trifft er das Ziel (20 %).<br>**O** Splitter zweigen vom Strahl ab, Eisnebel.<br>**S** Strahl mit Seitenzweig. |
| **Eisschritt**<br>Flucht, einfrieren | **M** Weite 160 → 175.<br>**O** längere Eisspur.<br>**S** längere Spur. | **M** Abklingzeit 10 → 9 s.<br>**O** Kristalle an der Spur.<br>**S** Kristalle. | **M** Eisabbild am Ausgangsort 2 s (zieht Monster).<br>**O** gläserne Kopie der Figur.<br>**S** Abbild. | **Geist des Eises:** das Abbild zerspringt (60 % im Radius 90, 0,6 s einfrieren).<br>**O** Abbild birst in Scherben.<br>**S** zerberstendes Abbild. |
| **Eisgefängnis**<br>Einschließen (Haltezeit heute) | **M** (heute +0,15 s) + Radius 115 → 125.<br>**O** größere Kristallwand.<br>**S** höhere Kristalle. | **M** Splitter beim Aufbrechen treffen bis 40 außerhalb.<br>**O** Splitter fliegen weiter.<br>**S** Splitter. | **M** Bosse 50 → 60 % verlangsamt.<br>**O** goldene Kristallspitzen.<br>**S** goldene Spitzen. | **Ewige Starre:** fünf Eissplitter fliegen nach außen (je 20 %, verlangsamen).<br>**O** Splitter in Blau-Violett.<br>**S** Splitter um den Kristall. |
| **Blizzard** (Frost)<br>Pulse (heute je Rang +1) | **M** (heute) + Radius 150 → 160.<br>**O** breiterer Sturm.<br>**S** breitere Wolke. | **M** Kälte baut sich schneller auf (0,07 → 0,09 je Puls).<br>**O** dichterer Schnee.<br>**S** mehr Flocken. | **M** Einfrieren 0,8 → 1,0 s.<br>**O** goldene Flocken.<br>**S** goldene Flocken. | **Ewiger Winter:** zum Schluss stürzt ein großer Eiszapfen in die Mitte (50 %, Radius 70, 1 s einfrieren).<br>**O** Zapfen aus der Wolke, Kältewelle in der Luft.<br>**S** Zapfen unter der Wolke. |

Dateien: `magier.js` (`SKILL_TYPES.nova`/`novaFx`, `shift`/`shiftFx`), `eisstrahl.js` (`SKILL_TYPES.beam`,
`beamComboOf`), `frostgefaengnis.js` (`mprison`/`prisonFx`), `schneesturm.js` (`msnow`/`snowFx`, `snowTicks`),
`symbole-magier.js`.

### 4.11 Magier · Weg des Blitzes (PvP)

| Fertigkeit | E | H | L | V – Extra |
|---|---|---|---|---|
| **Blitzspeer**<br>Linie, lädt auf | **M** Breite 34 → 40.<br>**O** breiterer Speer.<br>**S** breiterer Speer. | **M** Ladung hält 5 → 6 s.<br>**O** Funken an Aufgeladenen länger.<br>**S** Funken. | **M** Doppelte Ladung: die nächste Entladung durch den Kettenblitz +15 %.<br>**O** goldene Funken an Aufgeladenen.<br>**S** goldene Spitze. | **Himmelsspeer:** am Ende der Bahn schlägt ein Himmelsblitz ein (Radius 70, 30 %).<br>**O** senkrechter Blitz in Rot-Gold.<br>**S** Speer mit Blitz von oben. |
| **Kettenblitz**<br>heute bis 3 Ziele (Ziel + 2 Sprünge, je −20 %) | **M** 4 Ziele (3 Sprünge), Sprungweite 180 → 200; Zusatzsprünge −40 % je Sprung.<br>**O** vierter Blitz mit Saum in der Rangfarbe.<br>**S** vierter Knoten. | **M** 5 Ziele.<br>**O** die Kette glüht 0,3 s nach (Lichtlinie zwischen den Zielen).<br>**S** fünfter Knoten, Kette läuft über den Rand. | **M** 6 Ziele; Lähmung 0,2 → 0,3 s.<br>**O** goldene Kernlinie, an jedem Ziel eine kleine Verzweigung.<br>**S** goldene Knoten mit Verzweigungen. | **Göttlicher Kettenblitz:** 6 Ziele + **Rücksprung**: vom letzten Ziel springt der Blitz zu bis zu zwei bereits getroffenen Gegnern zurück (je 25 %, ohne erneute Entladung).<br>**O** Rücksprung in Rot-Gold, über dem letzten Ziel 0,3 s eine Krone aus drei Blitzbögen, Zepter-Kristall glüht.<br>**S** Kette biegt sich zur Schleife zurück, Blitzkrone. |
| **Blitzschritt**<br>Sprung, Himmelsblitz-Spur | **M** Weite 200 → 220.<br>**O** längere Spur.<br>**S** längere Spur. | **M** Spur mit 6 statt 5 Himmelsblitzen.<br>**O** ein Blitz mehr.<br>**S** zweiter Blitz. | **M** Abklingzeit 8 → 7,5 s.<br>**O** goldene Spur.<br>**S** goldene Spur. | **Lichtgeschwindigkeit:** am Ziel entlädt sich ein Kugelblitz (Radius 80, 30 %).<br>**O** Kugel platzt in Rot-Violett.<br>**S** Kugel am Ende der Spur. |
| **Gewitterwolke**<br>6 Blitze + Finale | **M** Radius 165 → 175.<br>**O** breitere Wolke.<br>**S** breitere Wolke. | **M** Beim Finale springt ein Nebenblitz in einen anderen Gegner (30 % des Finales).<br>**O** Nebenblitz.<br>**S** zweiter Blitz. | **M** Finale betäubt 1,5 → 1,8 s.<br>**O** goldener Finalblitz.<br>**S** goldener Blitz. | **Weltengewitter:** die Wolke folgt 2 s dem nächsten Gegner und schlägt zweimal nach (je 30 % eines Blitzes).<br>**O** Wolke zieht sichtbar weiter, rote Blitze.<br>**S** Wolke mit Bewegungsstrichen. |
| **Kugelblitz**<br>Pulse mit Entladungen | **M** Radius 150 → 160.<br>**O** größere Kugel.<br>**S** größere Kugel. | **M** Letzte Entladung betäubt 0,8 → 1,0 s.<br>**O** helleres Finale.<br>**S** Funken. | **M** Entladungen verlangsamen 1 s um 20 %.<br>**O** goldener Kern.<br>**S** goldener Kern. | **Sonnensturm:** am Ende zerplatzt die Kugel in vier Blitze nach außen (je 20 %), der Kern trifft das Ziel (70 % einer Entladung).<br>**O** vier Blitze, kurzes Aufleuchten.<br>**S** Kugel mit vier Strahlen. |

Hinweis Kettenblitz: Dass er sich heute wie „1–2 Ziele“ anfühlt, liegt an der kurzen Sprungweite (180). Darum gibt es
ab E zuerst mehr Weite. Den Normalzustand (3 Ziele) zu senken, wäre eine Schwächung für alle unter E und ist nicht
vorgesehen.

Dateien: `magier-neu.js` (`SKILL_TYPES.mspear`/`spearFx`, `chainCast`/`chainStrike`/`chainNext`/`chainRemote`,
`CHAIN_R`, `mstorm`/`stormFx`), `magier.js` (`shift`/`shiftFx`, `sigil`/`sigilFx`, `boltHitMul`),
`symbole-magier2.js` (`kettenblitz`, `kugelblitz`, `blitzschritt`), `symbole-magier3.js` (`blitzspeer`, `gewitter`).

### 4.12 Magier · Weg der Erde

| Fertigkeit | E | H | L | V – Extra |
|---|---|---|---|---|
| **Steinschlag**<br>Einschlag, hochschleudern | **M** Radius 90 → 100.<br>**O** größerer Einschlag.<br>**S** größerer Brocken. | **M** Drei Steinsplitter springen zu Gegnern bis 120 (je 10 %).<br>**O** Splitter fliegen ab.<br>**S** Splitter. | **M** Betäubung 0,6 → 0,8 s.<br>**O** goldene Adern im Stein.<br>**S** goldene Adern. | **Weltenschlag:** 0,5 s später ein zweiter Einschlag (Radius 60, 20 %).<br>**O** zweiter, glühender Brocken.<br>**S** zwei Brocken. |
| **Felsgeschoss**<br>Geschoss, Splash, Rückstoß | **M** Splash 80 → 90.<br>**O** breitere Staubwolke.<br>**S** größerer Fels. | **M** Rollt nach dem Einschlag 120 weiter (20 %).<br>**O** rollender Fels mit Staubspur.<br>**S** Bewegungsstriche. | **M** Prall: Zurückgestoßene treffen Gegner hinter sich (15 %).<br>**O** goldene Risse im Fels.<br>**S** goldene Risse. | **Sternenfels:** zerplatzt in vier Brocken im Fächer hinter dem Ziel (je 12 %).<br>**O** glühende Brocken mit Schweif.<br>**S** Fels, der in vier Teile springt. |
| **Erdspitzen**<br>Spitzen am Ort | **M** Radius 115 → 125.<br>**O** mehr Spitzen.<br>**S** vierte Spitze. | **M** Zweite Welle am Rand 0,4 s später (20 %).<br>**O** äußere Spitzen.<br>**S** äußere Spitzen. | **M** Hochschleudern 18 → 24.<br>**O** goldene Spitzen.<br>**S** goldene Spitzen. | **Zähne des Weltenbergs:** die Spitzen bleiben 2 s stehen; wer hineinläuft, nimmt 15 % und wird verlangsamt.<br>**O** Spitzen glühen von innen rot.<br>**S** glühende Spitzen. |
| **Bergsturz**<br>Meteor, Betäubung | **M** Radius 125 → 135.<br>**O** größerer Einschlag.<br>**S** größerer Fels. | **M** Drei Felsbrocken rollen nach außen (je 15 %).<br>**O** rollende Brocken.<br>**S** Brocken. | **M** Betäubung 1 → 1,2 s.<br>**O** goldener Glutkern.<br>**S** goldener Kern. | **Weltenfall:** zwei kleinere Brocken fallen 0,4 s später versetzt (je 20 %, Radius 70).<br>**O** zwei glühende Brocken mit Rauchschweif.<br>**S** drei fallende Brocken. |
| **Schwerkraftsiegel**<br>Sog, Pulse, Finale | **M** Radius 150 → 160.<br>**O** mehr kreisende Steine.<br>**S** weiterer Stein. | **M** Sog 70 → 85.<br>**O** Steine kreisen schneller.<br>**S** Bewegungslinien. | **M** Danach 2 s −30 % Tempo.<br>**O** goldene Steine.<br>**S** goldene Steine. | **Schwarzes Loch:** zum Ende kollabiert die Mitte: 0,8 s alle bis 100 festgehalten + 30 %.<br>**O** dunkle Kugel in der Luft mit violettem Saum, Steine stürzen hinein.<br>**S** dunkle Kugel mit Saum. |

Dateien: `magier-neu.js` (`SKILL_TYPES.mclash`/`clashFx`, `mspikes`/`spikesFx`, `mmeteor`/`meteorFx`,
`mgrav`/`gravFx`), `magier.js` (`SKILL_TYPES.mbolt` mit `style: 'stone'`), `symbole-magier2.js`,
`symbole-magier3.js`.

### 4.13 Ultis (Rang nach 2.4)

| Ulti (Weg) | E | H | L | V – Extra |
|---|---|---|---|---|
| **Klingenhimmel** (Klinge) | **M** 11 statt 10 Schwerter.<br>**O/S** ein Schwert mehr. | **M** 12 Schwerter.<br>**O/S** Nachbilder an den Schwertern. | **M** Explosion Radius +15 %.<br>**O/S** goldene Klingen. | **Königsklinge:** ein riesiges Schwert fällt in die Mitte (2×, Betäubung +0,5 s).<br>**O** rot-goldene Riesenklinge.<br>**S** großes Schwert in der Mitte. |
| **Titanenzorn** (Leib) | **M** Radius +10 %.<br>**O/S** breiterer Erdriss. | **M** Titanenhaut 12 → 15 s.<br>**O/S** Steinhaut. | **M** Drei Erdrisse laufen nach außen (je 1×).<br>**O/S** goldene Risse. | **Titanenschritt:** 6 s lang löst jeder Schritt ein kleines Beben aus (Radius 60, 0,3×, höchstens alle 0,5 s).<br>**O** Staubstöße an den Füßen.<br>**S** Fußabdruck mit Rissen. |
| **Schattendoppelgänger** (Dolch) | **M** 7 statt 6 Doppelgänger.<br>**O/S** ein Klon mehr. | **M** Doppelgänger betäuben 0,3 s.<br>**O/S** Nachbilder. | **M** Kreuzschnitt-Umkreis +20.<br>**O/S** goldener Kreuzschnitt. | **Schattenheer:** die Doppelgänger bleiben 3 s und schlagen weiter (je 0,4× je s, PvP ×0,5).<br>**O** Klone mit roten Augen.<br>**S** Klonreihe. |
| **Sturm des Schattenadlers** (Falke) | **M** Einschlag Radius +10 %.<br>**O/S** größere Druckwelle. | **M** Adler durchschlägt das erste Ziel und fliegt 150 weiter (1×).<br>**O/S** Federspur. | **M** Schattenfedern verlangsamen 2 s.<br>**O/S** goldene Federn. | **Adlerschwarm:** vier kleine Adler lösen sich beim Einschlag und stoßen auf vier Gegner (je 1×).<br>**O** vier Adler in Rot-Violett.<br>**S** Adler mit vier Begleitern. |
| **Kreis der Elemente** (Drache) | **M** Sog +20 %.<br>**O/S** Elemente schneller. | **M** 8 statt 7 Sog-Treffer.<br>**O/S** längere Schweife. | **M** Explosion Radius +10 %.<br>**O/S** goldener Kern. | **Elementarkern:** der Kern bleibt 2 s in der Luft und schießt je Element einen Strahl auf einen Gegner (4 × 0,8×).<br>**O** vier farbige Strahlen.<br>**S** Kern mit vier Strahlen. |
| **Lichtkuppel** (Heilung) | **M** Dauer 6 → 7 s (zwei Lichtschläge mehr).<br>**O/S** hellere Kuppel. | **M** Heilung je Schlag 3,5 → 4 %.<br>**O/S** grüne Lichtfunken. | **M** Gruppe in der Kuppel zusätzlich −10 % Schaden.<br>**O/S** goldene Kuppelrippen. | **Himmelstor:** gefallene Gruppenmitglieder unter der Kuppel stehen beim Zerbersten mit 20 % Leben auf (nicht in Duell und Arena).<br>**O** Lichtsäule über jedem Aufstehenden.<br>**S** Kuppel mit Tor. |
| **Seelenernte** (Seelen) | **M** Radius +10 %.<br>**O/S** breiterer Strudel. | **M** Heilung je Seele 3 → 4 %.<br>**O/S** hellere Seelen. | **M** Diener bleiben 5 s länger.<br>**O/S** goldene Seelen. | **Seelensturm:** die geernteten Seelen fliegen weiter und treffen bis zu fünf Gegner außerhalb (je 1×).<br>**O** Seelen als grün-rote Schweife.<br>**S** Strudel mit ausfliegenden Seelen. |
| **Sensenmann** (Knochen) | **M** Mähbogen +10°.<br>**O/S** längere Sense. | **M** Erster Hieb verlangsamt 10 % stärker.<br>**O/S** Nebel an der Klinge. | **M** Seelenheilung 4 → 5 % je Gegner.<br>**O/S** goldene Klinge. | **Schnitter der Welten:** ein dritter Hieb (2×, doppelt unter 25 % Leben).<br>**O** Sense hinterlässt einen roten Lichtbogen.<br>**S** zwei Sensenbögen. |
| **Inferno** (Feuer) | **M** Brand +1 s.<br>**O/S** dichtere Glut. | **M** Wellen ziehen 20 nach innen.<br>**O/S** Glutschlieren. | **M** Glutmantel 30 → 40 s.<br>**O/S** goldener Mantel. | **Sonnenherz:** eine vierte Welle aus weißem Feuer (Radius 340, 1,5×).<br>**O** weiß-goldene Welle in Brusthöhe.<br>**S** weißer Kern. |
| **Eiszeit** (Frost) | **M** Radius 260 → 280.<br>**O/S** breiterer Gletscher. | **M** Einfrieren 2 → 2,3 s.<br>**O/S** dickere Kristalle. | **M** Zerspringen verlangsamt 3 s um 50 %.<br>**O/S** goldene Kristallspitzen. | **Gletscherherz:** nach dem Zerspringen fallen sechs Eiszapfen auf Gegner (je 1×).<br>**O** Zapfen aus der Höhe.<br>**S** Zapfen über dem Kristall. |
| **Donnerkeile** (Blitz) | **M** 5 statt 4 Keile.<br>**O/S** ein Keil mehr. | **M** Betäubung +0,3 s.<br>**O/S** Funkenkranz an den Keilen. | **M** Keile ziehen Blitzketten zu Gegnern bis 60 neben der Bahn (0,5×).<br>**O/S** goldene Keile. | **Göttergericht:** jeder Keil explodiert am Ende der Bahn (Radius 80, 1×).<br>**O** Explosion in Rot-Gold.<br>**S** Keile mit Explosionsspitzen. |
| **Weltenbruch** (Erde) | **M** Radius +10 %.<br>**O/S** größere Monolithen. | **M** Einsturz betäubt +0,5 s.<br>**O/S** Staubsäulen. | **M** Steinhaut wirft 10 % Nahkampfschaden zurück (PvP ×0,5).<br>**O/S** goldene Adern. | **Weltenkern:** acht Felsbrocken umkreisen dich 6 s und fangen je einen Treffer ab (PvP höchstens drei).<br>**O** kreisende Brocken in Brusthöhe mit Glutkern.<br>**S** Kern mit kreisenden Brocken. |

Budget je Ulti: V höchstens +25 % ihres eigenen Schadens (Anteil der Ulti am Weg 2–16 % → höchstens +1 bis +4 %).
Dateien: `ultimativ.js` (`ULT_RUN`, `ultimateOf`, `useUltimate`), `magier.js` (Inferno, Eiszeit, Weltenbruch),
`donnerkeile.js`, `elementkreis.js`, `fernninja.js` (`himmelsfalke`), `seelenernte.js`, `nekro-neu.js`
(`sensenmann`, `reaperShow`), `heiler-fx.js` (`heilerKuppel*`), Symbole in den `symbole-*.js`.

---

## 5. Hinweise zur Umsetzung

### 5.1 Gemeinsamer Unterbau

- **Daten:** je Fertigkeit ein Feld `rb` in `js/daten/klassen.js` (bei Ultis in `ULTIMATES`/`MAGE_ULTS`), z. B.
  `rb: { E: { chain: 3, chainR: 200 }, H: { chain: 4 }, L: { chain: 5, stun: 0.3 }, V: { chain: 5, back: 2, backMul: 0.25 } }`.
  Kein neues Skript nötig – sonst müssten `index.html` und die Dateiliste in `sw.js` mit.
- **Helfer** in `js/kampf.js`: `rankBonus(sk, lvl)` (bzw. `rankBonusR(sk, rk)` für Mitspieler) legt die Werte bis zum
  aktuellen Rang zusammen; `useSkill` gibt `lvl` heute schon an `SKILL_TYPES[...]` weiter. Ulti: `ultRank(p)` nach 2.4.
- **Radien:** Wo ein Rang den Trefferradius vergrößert, zeigt der Effekt den echten Radius; `rankLook` darf dort nicht
  zusätzlich um 10 % je Rang vergrößern (sonst wirkt die Fläche größer, als sie trifft).
- **PvP:** Option `rankEcho` an `hitMonster` → `pvpOutgoing` halbiert (3.3).
- **Anzeige:** `skillStats` (`oberflaeche.js`) bekommt eine Zeile „Rang-Bonus“ je Rang, die Rangzeile im
  Charakterfenster einen Text je Rang im Infofeld; die Vorschau beim Verbessern (`fertigkeit-vorschau.js`) zeigt beim
  Aufstieg in einen Rang den neuen Bonus (`SKV_DMG` um neue Schadenszeilen ergänzen).
- **Symbole:** `drawSkillIcon(ctx, sk, r)` gibt `r` an `SKILL_ART[id](ctx, IK, sk, r)` weiter; V-Hintergrund in
  `drawSkillIcon` (`symbol-kunst.js`); Ulti-Knopf `skillIconUrl(u, ultRank(p))`; einmaliges Aufglühen für
  `.slot.skill.rank-V` beim Bereitwerden in `css/style.css`.
- **Texte und Sprachen:** neue Sätze in `js/sprachen/*.js` (Verfahren in `docs/sprachen.md`), Ratgeber
  (`js/daten/ratgeber-wissen.js`), README-Abschnitt „Fertigkeitsränge“, Wiki neu bauen (`tools/wiki-bauen.js`).
- **Nach jedem Paket** `VERSION` in `sw.js` erhöhen (das macht, wer das Paket umsetzt).

### 5.2 Netz (Mitspieler sehen die Optik)

- `netSkillFx` schickt den Rang heute schon als `rk`. Mitspieler leiten alle Rang-Extras daraus ab (wie
  `lvlFromRank` in `magier.js`); dafür bekommen die Fernwiedergaben (`MAGE2_REMOTE`, `chainRemote`, `aderlassRemote`,
  `interaktion.js`, `ninjaFx3`/`heilerFx3` mit `remote`) den Rang mit.
- Extras mit Zufallszielen (Rücksprung, Splitter, Federn) leiten die Ziele wie `chainRemote` aus den Monstern am Ort
  ab; reicht das nicht, eine kurze Zielliste mitschicken (wie `ts` bei `novaArcs`).
- Zeitversetzte Zweitauslöser (Zweitsprung, Zweitschritt) schicken eine eigene `fx`-Nachricht.
- `netUltimateFx` bekommt `rk` (`{ t: 'ult', u, x, y, rk }`).
- Ältere Versionen ignorieren unbekannte Felder und zeigen das heutige Bild; kein Protokollwechsel. Den Schaden rechnet
  wie heute nur der Werfer, am Host ändert sich nichts.

### 5.3 Spielstände

Keine Änderung: Der Rang kommt aus `p.skillLevels` (`skillRank`), der Ulti-Rang wird abgeleitet. `SAVE_FIELDS`,
`skillCostVer` und Bücher bleiben. Eine Einstellung wie „Rang-Effekte sparsam“ gehört, falls gewünscht, in die
Optionen (`opts`, localStorage), nicht in den Spielstand.

### 5.4 Leistung am Handy

Das Handy wird schnell warm; 15.51 hat gerade das Ruckeln durch Rang-Effekte behoben. Darum für alle neuen Effekte:

- keine neuen Lichtquellen, kein `shadowBlur`, kein `ctx.filter`, keine Leinwand je Bild; der Rang-Schein kommt wie
  heute aus `rankHaloPass`;
- je Wirken höchstens **ein** zusätzlicher Effekt-Eintrag für die V-Signatur, je getroffenem Gegner höchstens einer
  (über `rankFxLoad` zusammengefasst); reine Zier-Effekte in `LOAD_SKIP` (`lastschutz.js`), damit sie im Gedränge
  entfallen;
- 3D-Budget: V-Signatur höchstens 40 Sprites je Bild, je Treffer höchstens 12; bei `n3low()`, `FX3.hitCrowd` oder
  `LOAD.level ≥ 1` halbiert; V-Extras dauern höchstens 2 s;
- Teilchen nur über `particles()` (Obergrenze `LOAD.parts`);
- Mitspieler-Extras nur in Sichtweite; bei `LOAD.level 2` nur die eigenen V-Signaturen voll;
- V-Signatur ersetzt das laute `rankCastFx` (`rankSoft`, 2.2) – unterm Strich soll V nicht teurer werden als heute;
- Symbole kosten nichts zur Laufzeit (einmal gezeichnet, gemerkt), das V-Aufglühen am Knopf läuft einmal und nur über
  `opacity`/`transform`;
- Abnahme je Paket mit `tools/leistung-test.js` (Handy-Profil, V-Rotation, viele Monster): Bildzeit höchstens +5 %
  gegenüber vorher.

### 5.5 Inhaltsregeln

Keine Ringe, Runen oder Sterne am Boden als Effekte (Warnflächen sind erlaubt). Neue Formen liegen in der Luft oder am
Körper (Kronen, Bögen, Wellen in Brusthöhe), am Boden nur strahlenförmige Risse und unregelmäßige Lachen. Die
vorhandenen Ringe einzelner Fertigkeiten werden nicht erweitert. Nichts aus bestehenden Spielen nachbauen; Namen und
Formen kommen aus `RANK_NAMES` und dem eigenen Motiv.

### 5.6 Messen

- PvE: `tools/balance-sim.js` bekommt eine Option `--rang 14,18,28,38,48` (alle fünf Fertigkeiten auf dieser Stufe,
  `opt.skillLevels` gibt es in `S.make` schon). Abnahme je Weg: Zielwerte aus 3.1, gemessen gegen denselben Lauf ohne
  Boni. Achtung: Stufe 15 wird beim Laden zu E1 – für „normal“ 14 nehmen. Der Simulator muss an eigenem Server mit
  `--url` auf Port 8951–8959 laufen (er öffnet sonst einen zufälligen Port).
- PvP: `--pvp` mit `--rang 48` gegen `--rang 42` (heute L5 auf Stufe 80), Abnahme nach 3.3.
- Leistung: 5.4.
- Mitspieler: zwei Fenster am Testserver, beide Ränge gegenseitig sichtbar, ältere Version (Commit 15.51) als
  Gegenprobe.

---

## 6. Pakete

Jedes Paket für sich spielbar, nacheinander umsetzbar; Abnahme jeweils Messung (5.6), Leistung (5.4) und Mitspieler.

| Paket | Inhalt | Wichtigste Dateien |
|---|---|---|
| **0 Unterbau** | `rb`-Feld und `rankBonus`, `ultRank`, `rankEcho` im PvP, `rk` für Ultis, Anzeige in Infofeld/Vorschau/Rangzeile, Symbol mit Rang-Parameter und V-Hintergrund, V-Aufglühen in der Leiste, `--rang` im Simulator. Noch keine Fertigkeit ändert sich. | `kampf.js`, `ultimativ.js`, `netz.js`, `oberflaeche.js`, `fertigkeit-vorschau.js`, `symbol-kunst.js`, `fertigkeiten.js`, `css/style.css`, `tools/balance-sim.js` |
| **1 Magier · Blitz und Feuer** | 10 Fertigkeiten, Kettenblitz als Vorzeige-Beispiel zuerst | `magier-neu.js`, `magier.js`, `feuerfeld.js`, `flammenwoge.js`, `symbole-magier*.js` |
| **2 Magier · Frost und Erde** | 10 Fertigkeiten, vorhandene Frost-Rangmechanik einbinden | `magier.js`, `magier-neu.js`, `eisstrahl.js`, `frostgefaengnis.js`, `schneesturm.js`, `symbole-magier*.js` |
| **3 Krieger** | Klinge und Leib (10), Grundangriff-Erweiterungen (Blitz, Spalten, Sichel) | `aderlass.js`, `kampf.js`, `fertigkeiten.js`, `ninja-fx.js`, `zeichnen.js`, `drei-figuren.js`, `symbole-krieger.js` |
| **4 Ninja** | Dolch und Falke (10) | `kampf.js`, `ninja-fx.js`, `fernninja.js`, `symbole-ninja.js` |
| **5 Schamane** | Drache und Heilung (10), Gruppen-Boni | `kampf.js`, `fertigkeiten.js`, `heiler-fx.js`, `gruppe.js`, `symbole-schamane.js` |
| **6 Nekromant** | Seelen und Knochen (10); vorher Dienerstufen glätten (H nicht unter E10, V höchstens +30 % über L10) | `nekro-neu.js`, `nekro-diener.js`, `nekro-totenruf.js`, `gegner.js`, `kampf.js`, `symbole-nekro*.js` |
| **7 Ultis** | alle 12 mit Ulti-Rang | `ultimativ.js`, `magier.js`, `donnerkeile.js`, `elementkreis.js`, `fernninja.js`, `seelenernte.js`, `nekro-neu.js`, `heiler-fx.js` |
| **8 Abnahme** | PvE- und PvP-Gesamtmessung aller Wege, `PATH_DMG` nachstellen, Leistung am Handy, Übersetzungen, Ratgeber, Wiki, README | `kampf.js` (`PATH_DMG`), `js/sprachen/*.js`, `docs/balance-pvp.md`, `docs/balance-klassen.md` |

Reihenfolge-Begründung: Paket 0 macht alles Spätere klein und prüfbar; der Blitzmagier zuerst, weil sein Kettenblitz
das Beispiel des Spielers ist und der Weg PvP-kritisch ist (frühe PvP-Messung); der Nekromant zuletzt unter den
Klassen, weil dort erst die vorhandenen Dienerstufen geglättet werden müssen.

---

## 7. Stand der Umsetzung

### Paket 0 (Unterbau) – umgesetzt

- **Daten:** `rb: [E, H, L, V]` je Fertigkeit in `js/daten/klassen.js`; jeder Eintrag enthält Werte, die ab diesem Rang
  gelten (kumulativ, verschachtelte Werte wie `burn`, `splash` und `trail` werden zusammengeführt), und `t` = Anzeigetext.
- **Hilfen** (`js/spieler.js`): `rankSk(sk, lvl)` bzw. `rankSkR(sk, rang)` liefert die Fertigkeit mit den Werten des
  Rangs (Kopie mit `base` = Original, zwischengespeichert; ohne `rb` das Original). Dazu `rankBonusLines` und
  `rankBonusText` für die Anzeige. `RANK_BONUS.off` schaltet alle Rang-Boni aus (für Messungen).
- **Wirken** (`js/kampf.js`): `useSkill` übergibt `rankSk(...)` an `SKILL_TYPES`; `skillCooldown` kennt Rang-Abklingzeiten;
  der Zielkreis zeigt die Rang-Fläche; der Abbruch des Feuerballs vergleicht das Original.
- **PvP:** `RANK_PVP_ECHO = 0,5` in `pvpOutgoing` für Treffer mit `rankEcho`, also für Rang-Extras, die dasselbe Ziel
  erneut treffen.
- **Anzeige:** Werte im Infofeld und in der Vorschau mit den Rang-Werten, je erreichtem Rang eine Zeile „Rang E/H/L/V“
  (`skillStats`, `js/oberflaeche.js`; die Vorschau zeigt beim Aufstieg die neue Zeile), Rang-Text im Infofeld der
  Rangzeile im Charakterfenster.
- **Mitspieler** (`js/interaktion.js`): Die Fernwiedergabe nutzt `rankSkR(sk, rk)` und spielt die Magier-Zauber im Rang
  des Mitspielers ab. Der Feuerball schickt beim Loslassen den Rang mit (`rk`).
- **Symbole** (`js/symbol-kunst.js`): `drawSkillIcon(ctx, sk, r)` mit Rang-Ebene `SKILL_ART_RANK[id]` über dem Motiv und
  V-Hintergrund „Glutkern“; in der Leiste springt ein V-Knopf beim Bereitwerden einmal kurz auf (`css/style.css`, nur
  `transform`).
- **Messung** (`tools/balance-sim.js`): `--rang <stufe>`, `--ohne-rangboni`, `--seed <n>`, `--port <n>`; die Seite wartet
  nur noch auf das Dokument (`domcontentloaded`).
- **Noch nicht:** Ulti-Rang (Paket 7).

### Paket 1 (Magier Blitz und Feuer) – umgesetzt, Werte nach Messung

Abweichungen vom Entwurf in 4.9/4.11 (nach der Messung nachgestellt):

| Fertigkeit | Entwurf | umgesetzt |
|---|---|---|
| Feuerball E/H | E Zauberzeit 2,8 s, H Explosion 125 | E Explosion 125, H Explosion trifft ringsum mit 90 statt 80 % (die kürzere Zauberzeit verschob die Rotation: +8 % bei 1 Ziel, −7 % Kontrolle) |
| Feuerball L/V | Glutlache 3 × 3 %, Sternenfeuer je 10 % | Glutlache 3 × 2 %, Sternenfeuer je 15 % |
| Glutfeld V | Feuersäule 30 %, Umkreis 70 | 50 %, Umkreis 80 |
| Phönixflamme L | Rückflug 30 % der Spur | 20 % |
| Flammenwoge V | zweite Woge 20 % | 25 % |
| Feuertornados | E–L heute schon +1 Tornado | dazu H stärkerer Sog, L Brand 4 s, V Verschmelzen mit 120 % eines Tornadotreffers |
| Gewitterwolke H | Nebenblitz 30 % | 50 % der Entladung |
| Kugelblitz V | Kern 70 % | 100 % einer Entladung |

Messung (Stufe 80, Ausrüstung std, alle Fertigkeiten auf dem Rang, Mittel aus 6 Würfen, Gewinn gegenüber demselben Stand
ohne Rang-Boni, ± Standardfehler):

| Weg | Rang | 1 Ziel | 5 Ziele | 10 Ziele | Kontrolle | Überleben |
|---|---|---|---|---|---|---|
| Feuer | E1 | +1,6 % (±1,1) | −0,9 % (±0,5) | +1,1 % | +0,2 % | ±0 % |
| Feuer | H1 | +1,2 % (±1,1) | +2,9 % (±1,4) | +4,1 % | +3,6 % | +9 % |
| Feuer | L1 | +4,5 % (±1,5) | +4,4 % (±1,0) | +8,2 % | +3,7 % | +3 % |
| Feuer | V | +9,6 % (±1,6) | +11,4 % (±1,9) | +16,9 % | +5,7 % | +10 % |
| Blitz | E1 | +1,4 % (±0,4) | +2,3 % (±0,6) | +1,9 % | +0,5 % | −8 % |
| Blitz | H1 | +3,5 % (±1,0) | +4,3 % (±0,6) | +2,7 % | +3,7 % | ±0 % |
| Blitz | L1 | +3,3 % (±0,9) | +8,6 % (±1,3) | +7,4 % | +4,8 % | −5 % |
| Blitz | V | +7,9 % (±1,2) | +12,3 % (±0,6) | +11,1 % | +5,2 % | −5 % |

Alles liegt an oder unter den Obergrenzen aus 3.1. Bei 5 Zielen liegen E und H unter dem Korridor, weil die fünf Puppen
im Simulator dicht stehen und größere Radien dort nichts bringen; im Spiel mit verteilten Gruppen wirken sie. Der Wert
„Überleben“ streut stark (Zeit bis zum Tod gegen drei Monster).

PvP (`--pvp`, Stufe 80, std und top, 6 Würfe, alle Wege auf V, mit gegen ohne Rang-Boni):

- Siegquote Blitz 44 → 50 %, Feuer 88 → 80 %. Unveränderte Wege streuen in denselben Läufen um bis zu 7 Punkte (Frost
  65 → 72 %).
- Paare über 65 %: 54 → 52; größter Treffer 35,0 % in beiden Läufen.
- Schaden gegen Spieler je Sekunde: Blitz +4 %, Feuer +3 %; die unveränderten Wege Krieger · Klinge und Ninja · Dolch
  streuen dabei um −6 % bzw. −2 %.
- Mit allen Fertigkeiten auf V ist das PvP schon ohne Rang-Boni sehr ungleich (Feuer 88 %, Leib 8 %). Das ist ein Thema
  für `PATH_DMG` in Paket 8, nicht für die Rang-Boni.

### Paket 2 (Magier Frost und Erde) – umgesetzt, Werte nach Messung

Werte je Rang (E · H · L · V). „(heute)“ heißt: Diesen Teil des Bonus gab es schon vorher (1.5).

| Fertigkeit | E | H | L | V |
|---|---|---|---|---|
| Frostnova | Nachhall 35 % (heute) | +10 % Schaden (nicht gegen Spieler) | Nachhall 45 % | Absoluter Nullpunkt: Eingefrorene zerspringen beim Auftauen (20 % bis 55 daneben) |
| Eisstrahl | Reichweite 320 | Breite 32, Kältestau nach 3 s +5 % | Kältestau nach 2 s +8 % (beides nicht gegen Spieler) | Atem des Winters: jeder 5. Treffer ein Eissplitter in einen weiteren Gegner (30 %, sonst ins Ziel 20 %) |
| Eisschritt | Weite 175 | Eisfigur zerspringt nach 0,4 s | Eisfigur +20 % (nicht gegen Spieler) | Geist des Eises: sechs Splitter zu Gegnern bis 140 (je 30 %) |
| Eisgefängnis | Feld 125 (+0,15 s je Rang heute) | Zersplittern trifft bis 40 außerhalb (50 %) | Bosse 60 % verlangsamt | Ewige Starre: fünf Eissplitter nach außen (je 20 %) |
| Blizzard (Frost) | Feld 160 (+1 Puls je Rang heute) | Kälte baut sich schneller auf | Pulse +10 % (nicht gegen Spieler) | Ewiger Winter: Eiszapfen in der Mitte (50 %, Umkreis 70, 0,5 s eingefroren) |
| Steinschlag | Umkreis 100 | drei Steinsplitter (je 15 %) | Betäubung 0,8 s | Weltenschlag: zweiter Einschlag (20 %, Umkreis 60) |
| Felsgeschoss | Splitter-Umkreis 90 | rollt 120 weiter (20 %) | Splitter 70 statt 60 % | Sternenfels: vier Brocken im Fächer (je 12 %) |
| Erdspitzen | Umkreis 125 | zweite Welle am Rand (20 %) | schleudert höher | Zähne des Weltenbergs: zwei Nachstöße (je 10 %, verlangsamen) |
| Bergsturz | Umkreis 135 | drei rollende Brocken (je 15 %) | Betäubung 1,2 s | Weltenfall: zwei kleinere Brocken neben dem Ziel (je 20 %, Umkreis 70) |
| Schwerkraftsiegel | Umkreis 160 | Sog 85 | danach 2 s −30 % Tempo | Schwarzes Loch: alle bis 100 sind 0,8 s gefangen (30 % des Einsturzes) |

Nach der Messung geändert:
- **Eisschritt H** gab erst kürzere Abklingzeit, dann 60 % Verlangsamung. Die kürzere Abklingzeit ließ die KI öfter springen und den Eisstrahl abbrechen (−5 % bei 1 Ziel).
- **Eisstrahl L, Eisschritt L, Schneesturm L und Frostnova H** waren Kontrolle (75 % Verlangsamung, längeres Einfrieren, Umkreis 140). Zusammen hielten sie drei Monster dauerhaft fest: erlittener Schaden 0, Überleben unbegrenzt. Jetzt sind es Schadensboni.
- **Felsgeschoss L** war Betäubung 1,4 s.
- **Splitter und rollende Brocken** starten ohne eigenes Ziel 30 neben der Mitte, und die zwei Weltenfall-Brocken fallen 105 neben dem Ziel. Vorher trafen sie das Hauptziel jedes Mal mit, Erde lag bei 1 Ziel auf V bei +32 %.
- **PvP:** Reine Schadensboni des Frosts wirken gegen Spieler nicht. Der Kältestau wird bei Spielern übersprungen, sonst hebt `duelMul` in den Rang-Daten den Mehrschaden auf. Ohne diesen Ausgleich stieg Frost im PvP von 69 auf 81 %.
- Neu im Code: `rankShards` (Splitter für Frost und Erde, `magier.js`), Effektart `mhole3` (Schwarzes Loch, in der Luft), Eisstrahl-Splitter als Netzmeldung `bm: 3` für Mitspieler.

Messung (wie bei Paket 1: 6 Würfe, Stufe 80, std; Gewinn gegen ohne Rang-Boni):

| Weg | Rang | 1 Ziel | 5 Ziele | Kontrolle | Überleben |
|---|---|---|---|---|---|
| Frost | E1 | −0,8 % | −0,2 % | −0,3 % | −4 % |
| Frost | H1 | +1,5 % | +0,6 % | −3,6 % | −6 % |
| Frost | L1 | +7,7 % | +3,8 % | −4,1 % | +16 % |
| Frost | V | +10,0 % | +13,0 % | +1,7 % | +1 % |
| Erde | E1 | −0,9 % | −2,1 % | ±0 % | −1 % |
| Erde | H1 | +2,9 % | +2,0 % | +1,3 % | −5 % |
| Erde | L1 | +3,1 % | +4,7 % | +13,9 % | +16 % |
| Erde | V | +9,8 % | +15,0 % | +19,2 % | +17 % |

E bringt im Simulator nichts messbar, weil die Boni dort Radius und Weite sind und die Puppen dicht stehen.

PvP (6 Würfe, alle Wege auf V, alle vier Magier-Wege mit Rang-Boni gegen ohne):
- Siegquote Feuer 79 → 81 %, Frost 69 → 68 %, Blitz 39 → 45 %, Erde 48 → 52 %.
- Unveränderte Wege schwanken in denselben Läufen um bis zu 10 Punkte (Krieger · Klinge 69 → 59 %).
- Paare über 65 %: 55 → 49; größter Treffer 35,0 %.
- Schaden gegen Spieler je Sekunde: Feuer +1 %, Frost +4 %, Blitz +2 %, Erde +5 %.

## 8. Rang-Optik in 2D (seit 15.71)

**Seit 15.79 (Spieler-Rückmeldung):** Beim Wirken erscheint an der Figur kein Rang-Effekt mehr – weder in 2D noch in 3D,
weder bei dir noch bei Mitspielern. Funkenspirale, Kränze, Goldsäule, Flammenflügel, Feuerkrone und Glutsturm wirkten
wie ein Buff am Charakter. `rankCastFx` läuft nur noch beim Erwecken und beim Rangaufstieg (`spieler.js`). Der Rang
zeigt sich an der Attacke selbst: Effekte in der Rangfarbe und größer (`rankLook`), mehr Funken und bei V viel Glut
(`particles` in `effekte.js`), kräftigere Treffer (`rankHitFx`; V in 2D mit größeren Flammenzungen und mehr Glutregen,
in 3D größerer Meteor und weiterer Flammenkranz). Der Blitzspeer zeigt seinen Rang jetzt auch in 3D (Schein auf der
Bahn, ab H Nebenblitze, bei V Flammen und Glut entlang der Bahn, `mspearRank3` in `magier-neu.js`); in 2D ist die
V-Bahn breiter und glüht länger nach. Die Tabelle unten beschreibt den alten Stand der Wirk-Effekte.

Spieler-Rückmeldung: In 2D sah eine Attacke auf V kaum anders aus als auf E. In 3D zeigten Wirken und Treffer den Rang
schon (rang-fx.js), in 2D stiegen nur ein paar Funken auf. Jetzt in 2D wie in 3D (js/rang2d.js), aufrecht an der Figur,
nichts am Boden, keine Sterne und Runen:

| Rang | beim Wirken (`rankcast2`) | beim Treffer (`rankhit2`, zusätzlich zu Funken, Einschlag, Schnitten, Blitzen) |
|---|---|---|
| E | Funkenspirale in Blau-Weiß, Funkenkranz um die Brust | – |
| H | dazu zwei gegenläufige Kränze (Brust, Kopf) mit Schweif | – |
| L | dazu goldene Lichtsäule über dem Kopf, Lichtstreifen seitlich am Körper, Lichtblitz, kreisende Goldlichter | goldener Lichtstoß, aufsteigende Lichter |
| V | dazu **Flammenflügel** (Bogen von der Schulter, sechs Flammenfedern je Seite), **Feuerkrone** über dem Kopf, Glutsturm | dazu Flammenzungen nach außen, Glutregen |

- Die Figur bleibt sichtbar: kein großer Schein über dem Körper, die Flügel liegen neben ihr.
- Auch bei Mitspielern sichtbar (vorher in 2D gar nicht): interaktion.js ruft `rankCastFx(…, remote = true)` – gleiches
  Bild, aber kein Bildschirmblitz und kein Beben beim Zuschauer.
- Blitzspeer (Blitzmagier, Attacke 1) je Rang auch an der Attacke selbst (`mspear3`, Feld `rk`): E dickerer Blitz mit mehr
  Ästen und Schein in der Rangfarbe, H zwei violette Nebenblitze, L goldene Bahn, V Himmelsspeer in Rot-Gold mit
  Glutschleppe und Flammen an der Spitze (dazu wie bisher der Himmelsblitz am Ende).
