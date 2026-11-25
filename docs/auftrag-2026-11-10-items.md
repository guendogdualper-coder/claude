## 05 | Equipment-Drops und Lootqualität

**Status: teilweise umgesetzt** – Ist-Analyse per Simulation + begründeter Vorschlag (wie verlangt); umgesetzt nur ein
klarer Regelfehler (Dungeon-Monster). Keine neuen Drop-Raten als beschlossen eingebaut.

**Werkzeug:** `tools/beute-sim.js` (neu). Startet das echte Spiel headless, ruft die echten Beute-Funktionen
(`rollLoot`, `bossLoot`, `raidLoot`, `htGuardLoot`, `instMiniLoot`, `instFinalLoot`, `questGearItem`) mit echten Monstern
aus `createMonster`/`createStone` auf; abgefangen werden nur Tasche und Anzeige. Je Quelle/Gebiet 3000 Würfe (Steine und
Bosse ÷4, Endbosse/Instanzen/Aufträge ÷10) × 6 Klassen/Wege, rund 150 Zeilen Ergebnis. Prüft jedes Teil auf: unbekannte
Stufe/Platz/Waffenart, Waffenart passt nicht zur Klasse, Schild ≠ Krieger, Köcher ≠ Ninja, Seltenheit über
`minTier`, Plus über `MAX_DROP_PLUS`, unbekannte/doppelte Boni, Bonus auf falschem Platz, Statuswert passt nicht zur
Klasse, Mana auf Krieger/Ninja, Leben nicht auf Stufe 200/350/500/1000, Bonuswert über `max`, NaN in `itemStats`.
Aufruf: `NODE_PATH=/opt/node22/lib/node_modules node tools/beute-sim.js --url http://localhost:8792/ [--n 3000] [--ohne-rollbest]`.

**Ist-Zustand (gemessen, Auszug; volle Tabellen: Simulator erneut laufen lassen)**

| Quelle | Beispiel | Teile je 100 Siege | Seltenheit | benötigte Stufe | Plus Ø | Boni Ø | iLvl p10/p50/p90/max (neu) |
|---|---|---|---|---|---|---|---|
| normale Monster | Sonnenwiesen (Lv 4) | 1,2 | 74 % grau · 22 grün · 5 blau | 1–5 | 0,25 | 0,45 | 1/5/6/8 |
| normale Monster | Leerenschlund (Lv 79) | 1,2 | 79 · 19 · 3 | 70–80 | 0,22 | 0,36 | 70/73/83/91 |
| Monster aus Steinen | Leerenschlund Stein 80 | 4,2 | 59 · 34 · 7 | 80 | 0,23 | 0,66 | 80/83/86/92 |
| Seelenstein | Dunkelwald Stein 20 | 50 | 62 grün · 38 blau | **30** (Stufe +10) | 1,0 | 1,9 | 34/39/44/48 |
| Seelenstein | Leerenschlund Stein 80 | 70 | 62 · 38 | 80 | 1,5 | 1,9 | 86/89/93/95 |
| Dungeon-Boss | Banditenkeller (Lv 17) | 200 | 50 grün · 50 blau | **22** (Stufe +8) | 2,0 | 2,0 | 26/29/33/38 |
| Dungeon-Boss | Kristallkaverne (Lv 80) | 200 | 48 · 47 · 5 lila | 80 | 2,0 | 2,1 | 87/91/96/104 |
| Endboss (Raid) | Fenris (Lv 14) | 300 | 100 blau (Kappung) | 15 | 0 | 4,0 | 19/19/20/20 |
| Endboss (Raid) | Aelvyr (Lv 80) | 300 | 100 lila | 80 | 0 | 4,0 | 91/92/92/93 |
| Abaddor | Höllenthron | 400 | 97 lila · 3 gold | 70–80 | 0 | 4,25 | 81/82/84/97 |
| Lv-60-Instanz Boss | Gletschergruft | 107 | 94 lila · 6 gold | 60–80 | 0 | 4,0 | 70/72/82/97 |
| Lv-80-Instanz Boss | Thron der Leere | 106 | 94 lila · 6 gold | 70–80 | 0 | 4,0 | 81/82/92/97 |
| Auftrag (Haupt) | Lv 80 | 100 | 45 grün · 55 blau | 80 | 1,0 | 2,1 | 84/88/92/95 |

**Ergebnisse der Prüfung**
- **Ungültige Teile: keine** (vorher und nachher je ~273 000 geprüfte Teile). Keine nicht existierenden Item-IDs/Stufen,
  keine Waffenart der falschen Klasse, keine Boni auf unzulässigen Plätzen, keine Seltenheit über der Stufengrenze.
- Unbrauchbare Teile der eigenen Klasse: 0–2 % je Quelle, ausschließlich Waffen des **anderen Wegs** (`lootKind`: 80 %
  eigener Weg). Das ist Absicht (Wegwechsel beim Lehrmeister möglich) → nicht geändert, siehe Vorschlag 3.
- Fremde Klasse: Monster 30 %, Bosse 15 % (zum Verkaufen, Absicht). Endbosse/Instanzen 0 %.
- **Fehler gefunden und behoben:** `raritySourceOf` erkannte Dungeon-Monster nur an der Art (`type.dungeon`). Nagas im
  Schlangentempel, Titanen in der Titanenschmiede und die Monster im Höllenthron sind auch draußen unterwegs und würfelten
  deshalb wie normale Monster, obwohl der Kommentar/Plan „Monster aus Seelensteinen und in Dungeons“ sagt. Jetzt zählt
  auch `m.zone.dungeon`. Messung vorher → nachher (grau %): Schlangentempel 77,2 → 48,4, Titanenschmiede 74,1 → 62,1,
  Thron der Unterwelt 69,6 → 52,5 (Sollwert der Regel `stoneMob`: 58/35/7). Teile je 100 Kills unverändert (~1,1–1,3).
- Inkonsistenzen (nur dokumentiert): Dungeon-Bosse lassen Ausrüstung Stufe **+8** fallen (Lv-17-Boss → Lv-22-Teile, die man
  noch nicht tragen kann), Endbosse +4, Steine ab 20 sogar +10. Dungeon-Bosse geben +1…+4, Endbosse +0 – ein Lv-80-Boss-Teil
  (iLvl bis 104) kann damit über dem Endboss-Teil (iLvl 91–93) liegen. Endbosse unter Lv 60 werden auf blau gekappt,
  behalten aber 4 Boni (früheres „Endboss-Teil“).
- Überversorgung: Ein Lv-80-Seelenstein gibt 0,7 Teile (38 % blau, +1…+2); Steinfarmen ist damit die mit Abstand
  ergiebigste Quelle. Ohne Spielzeit-Daten (Kills/Std. echter Spieler) lässt sich „zu viel“ nicht belegen – offen.

**Vorschlag (NICHT umgesetzt, Zahlen nur als Beispiel zur Abstimmung)**
1. Stufenaufschlag vereinheitlichen und konfigurierbar machen (`LOOT_LEVEL_UP = { stone: 10, boss: 8, raid: 4 }`), z. B.
   Dungeon-Bosse auf +4 wie Endbosse, damit Boss-Beute sofort tragbar ist.
2. Elite-/Boss-Differenzierung über Würfelglück statt Menge: normale Monster unverändert, Dungeon-Bosse `rollBest: 2`
   (wie jetzt Endbosse/Instanzen), Endbosse zusätzlich eine kleine Plus-Chance (z. B. 10 % +1). Elites (hpMul ≥ 1,6)
   haben heute keine eigene Beute-Regel; Vorschlag: Seltenheitsgewichte wie `stoneMob` statt `mob`.
3. Endboss- und Instanzteile immer für den eigenen Weg (heute 20 % Zufallsart → ~1 % unbrauchbare lila/gold Waffen).
4. Erst echte Spielzeitdaten erheben (Teile pro Stunde je Quelle), dann über Steinraten entscheiden.

**Dateien:** `js/seltenheit.js` (raritySourceOf), `tools/beute-sim.js` (neu).
**Tests:** Simulator alt (HEAD 14.31) und neu je 3000 Würfe × 6 Klassen; Regressionslauf 12 Charaktere (s73) ohne Fehler.
Drop/Pickup/Handel/Relog: Beute-Teile sind dieselben Objekte wie vorher (keine neuen Felder), Handel prüft
`itemClean` unverändert; kein eigener Mehrspieler-Test (Beute wird ohnehin lokal gewürfelt).
**Offen:** Entscheidung über Vorschläge 1–4; echte Dropraten aus Spielerdaten.

## 06 | Itemlevel und Level-80-Endgame

**Status: umgesetzt** (Endgame-Erweiterung maßvoll; größere Ökonomie-Schritte nur als Vorschlag).

**Ursache/Ist:** Es gab nur `tier` (Gegenstandsstufe) und davon abgeleitet die benötigte Stufe (`itemLevelReq`). Die
Seltenheitszeile zeigte „(Lv 60)“ = benötigte Stufe; die tatsächliche Stärke (Seltenheit, Plus +0…+20, bis 7 Boni) war
nirgends als Zahl sichtbar. Auf Stufe 80 tragen alle „Ewig“-Teile dieselbe Anforderung, obwohl ein graues +0-Schwert 245
und ein legendäres +20 mit 7 Boni über 1000 Angriff hat.

**Datenmodell (drei getrennte Zahlen):**
- Charakterstufe `p.level` (unverändert).
- Benötigte Stufe `itemLevelReq(item)` = `ITEM_TIERS[tier].level` (unverändert, entscheidet allein über das Anlegen).
- **Itemlevel `itemIlvl(item)`** (neu, `js/ausruestung.js`, Regeln in `ILVL` in `js/daten/gegenstaende.js`). Wird NICHT
  gespeichert, sondern immer aus den gespeicherten Feldern berechnet: „so stark wie ein graues +0-Teil der Stufe X“.
  Formel: Stärke = Grundwert der Stufe × Seltenheitsfaktor (`statMul`) × (1 + 10 % je Plus) × (1 + Σ Boni), je Bonus
  3 % + 5 % × Würfelglück (0 = unteres, 1 = oberes Ende der Spanne auf der Stufe), Bonus 6/7 doppelt. Rückrechnung über
  die Kurve des Waffenschadens je Stufe (log-linear zwischen den Stufen, über 80 mit dem Zuwachs 70→80 ≈ 3 %/Stufe).
  Nie unter der benötigten Stufe. Keine zweite Stufenlogik: `tier` bleibt die einzige gespeicherte Stufe.
- Migration: keine nötig – alte Teile (auch ohne `rarity`, ohne Boni) bekommen ihren Wert beim Anzeigen berechnet,
  ihre Werte ändern sich nicht. Handel/Post/Auktionshaus/Lager übertragen dieselben Felder wie bisher.

**Gemessene Beispiele (Krieger-Schwert, im Spiel berechnet)**

| Teil | benötigte Stufe | iLvl | Angriff |
|---|---|---|---|
| Lv 1 grau +0 / +20 | 1 | 1 / 9 | 5 / 25 |
| Lv 30 blau +7, 3 mittlere Boni | 30 | 61 | 130 |
| Lv 60 grau +0 / episch 4 Boni schwach / stark | 60 | 60 / 68 / 73 | 130 / 148 / 148 |
| Lv 80 grau +0 | 80 | 80 | 245 |
| Lv 80 blau 3 Boni schwach / stark | 80 | 85 / 89 | 265 |
| Lv 80 episch 4 Boni schwach / stark | 80 | 88 / 93 | 279 |
| Lv 80 legendär 5 Boni schwach / stark | 80 | 91 / 97 | 299 |
| Lv 80 grau +7 | 80 | 97 | 469 |
| Lv 80 legendär +15, 5 starke Boni | 80 | 127 | 884 |
| Lv 80 legendär +20, 5 + 2 Sonderboni max. | 80 | 140 | 1079 |

Gleiche benötigte Stufe (80), iLvl 80 … 140 – die Zahl folgt den echten Werten (Rangfolge wie Angriff/Boni).

**iLvl je Quelle auf Stufe 80 (Simulation, Median/p90/max):** Monster 73/83/91 · Stein-Monster 83/86/92 ·
Seelenstein 89/93/95 · Dungeon-Boss 91/96/104 · Endboss 92/92/93 · Lv-80-Instanz 82/92/97 (gold bis 97) ·
Auftrag 86–88/92/95. Normale Monster liefern also keine Spitzenteile; Spitzen entstehen über Instanzen (lila/gold),
dann Plus und Boni.

**Level-80-Endgame – was es schon gab:** Plus bis +20 (Bruchrisiko, Monsterteile, Ätherkern), Boni 1–5 (Verstärkungen),
Switcher, Sternenstein (Bonus 6/7), Sternen-Switcher, Legendär nur aus Instanzen (Abaddor 12 %, Wächter 2 %, Lv-60/80-
Instanzen 6,5 % je Lauf). Das ergibt schon eine lange Leiter (iLvl 80 → ~140).
**Neu (maßvoll):** schwere Quellen würfeln jeden mitgebrachten Bonus-WERT zweimal und behalten den besseren
(`RARITY_DROPS.raid/instance/instanceBoss/instanceEpic.rollBest = 2`). Art und Zahl der Boni, Seltenheit, Stufe, Plus,
Spannen und Obergrenzen bleiben. Gemessen: Median-iLvl dieser Quellen +1 (z. B. Thron der Leere 81→82, Abaddor 81→82,
Aelvyr 91→92), Höchstwerte +0…+1. Abschaltbar je Quelle; im Simulator mit `--ohne-rollbest` vergleichbar.

**UI:** Seltenheitszeile „Episch · Göttlich · [Itemlevel 91]“ (goldenes Kästchen) statt „(Lv 60)“; darunter
„… · Benötigte Stufe 60“ (rot, wenn die Figur zu niedrig ist). Infofeld und Inventar-Detail zeigen zusätzlich
„Itemlevel 87 · angelegt 70 (+17)“ im Vergleich, Schmied über dieselbe Zeile (iLvl steigt sichtbar mit dem Plus),
Auktionshaus-Zeile „… · ab Stufe 80 · Itemlevel 92“. Englisch in `js/sprachen/en.js`.

**Dateien:** `js/daten/gegenstaende.js` (ILVL, rollBest), `js/ausruestung.js` (bonusRollQuality, ilvlFromStrength,
itemIlvl, reqLevelHtml, ilvlCompareHtml, Vergleich, Inventar-Detail), `js/seltenheit.js` (rarityLineHtml, applyRarity
best, rarityRoll, rollRarityItem), `js/tipps.js`, `js/auktionshaus.js`, `css/seltenheit.css`, `js/sprachen/en.js`.
**Tests (ausgeführt):** Stichproben Lv 1–80 inkl. legendär/+20 (Tabelle oben), altes Teil ohne `rarity` (iLvl 76, keine
Änderung der Werte), Buch → 0, Tooltip/Vergleich-Text, Bildschirmfotos Inventar PC 1280×800 und Handy 800×400,
Simulator (keine ungültigen Teile), 12 Charaktere (s73) ohne Fehler.
**Nicht getestet:** Handel zwischen zwei echten Clients (Felder unverändert, daher geringes Risiko).
**Vorschläge (nicht umgesetzt):** Inventar-Sortierung nach iLvl; Filter/Sortierung „Itemlevel“ im Auktionshaus;
Lv-80-Seelensteine mit `rollBest: 2` (würde das Steinfarmen weiter aufwerten – erst Spielzeitdaten).

## 07 | Heil-, Mana- und Drachenblut-Tränke

**Status: umgesetzt.** Drachenblut ist der rote Lebenstrank, Mondtau der blaue Manatrank – zwei Farben, je 5 Größen.

**Ist (vorher, `POTION_SIZES` in js/daten/zonen.js):** S 95/60 ab 1 · M 180/115 ab 10 · L 340/210 ab 25 · XL 540/320 ab 40 ·
XXL 1600/470 ab 55; Preise ×1/5/20/80/320 (Leben 15 G, Mana 20 G Grundpreis), Abklingzeit 3 s je Sorte (`POTION_CD`),
keine Stapelgrenze (Zähler in `p.potions`), keine Stufenprüfung beim Trinken, im PvP volle Wirkung (nicht unter
`pvpHealMul`). Verwendung: Händlerin, Beute (`potionSizeFor`), Aufträge, Tagesbelohnung, Post/Auktionshaus (Ware
`trank`), Inventar-Vorräte, Q/E (keine Hotbar-Belegung mit Größen).

**Welche Größe entfällt: L.** Jede der Zwischengrößen M, L, XL ist 15 Stufen lang „die aktuelle Größe“ (Beute, Aufträge,
Laden). L lag am dichtesten an ihrer Nachbargröße (XL heilte nur das 1,6-Fache; M→L 1,9, S→M 1,9, XL→XXL 3,0) – sie ist
am ehesten überflüssig, und die Umwandlung L→XL ist der kleinste Sprung (am wenigsten „Geschenk“/Inflation).
Wegfall von M bzw. XL hätte die Lücke 3,6- bzw. 4,7-fach gemacht.

**Max. Leben gemessen (Durchschnitt der 5 Klassen, Ausrüstung der Stufe +7, Statuspunkte ⅔ Hauptwert/⅓ Vitalität):**
Lv 1: 156 · 10: 641 · 25: 1373 · 40: 2062 · 55: 2919 · 70: 4811 · 80: 6191 (mit +15/blau/Leben 350 je Teil: ~9 600–13 100).
Mana Zauberer: Lv 10: 465 · 25: 959 · 40: 1429 · 55: 1995 · 80: 3931.

**Vorher/Nachher**

| Größe | ab Stufe | Leben vorher → nachher | Mana vorher → nachher | Preis | Anteil max. Leben am Bandanfang (vorher → nachher) |
|---|---|---|---|---|---|
| S | 1 | 95 → **120** (+26 %) | 60 → **75** (+25 %) | 15 / 20 G | 61 % → 77 % |
| M | 10 | 180 → **225** (+25 %) | 115 → **145** (+26 %) | 75 / 100 G | 28 % → 35 % |
| L | 25 | 340 → *entfällt* | 210 → *entfällt* | – | – |
| XL | 40 → **25** | 540 → **620** (+15 %; gegenüber L +82 %) | 320 → **380** (+19 %; gegenüber L +81 %) | 1 200 / 1 600 G | Lv 25: 25 % (L) → 45 %; Lv 40: 26 % → 30 % |
| XXL | 55 | 1600 → **1850** (+16 %) | 470 → **600** (+28 %) | 4 800 / 6 400 G | 55 % → 63 %; Lv 80: 26 % → 30 % |

Bester Trank je Stufenband: 1–9 +26 %, 10–24 +25 %, 25–39 +82 % (Folge des Wegfalls von L), 40–54 +15 %, 55–80 +16 %
(Mana +25/+26/+81/+19/+28 %). Größere Tränke bleiben je Leben teurer (0,13 / 0,33 / 1,9 / 2,6 G je Lebenspunkt), kleine
Tränke entwerten große nicht. Abklingzeit 3 s, Stapel, Schlüssel (`hp`, `hpM`, `hpXL`, `hpXXL` …) unverändert.

**PvP:** `PVP_DMG.potion = 0.85` (kampf.js) – im Duell und in der Turnierarena wirken Tränke zu 85 %, so bleibt die
Heilung im PvP etwa beim alten Stand (gemessen: S 102, M 191, XL 527, XXL 1573 Leben; vorher 95/180/540/1600) und die
PvP-Messung aus 14.30 bleibt gültig. Die allgemeine 60-%-Regel (`PVP_DMG.heal`) galt für Tränke nie; sie darauf
anzuwenden wäre eine PvP-Abschwächung (XXL 1110) – bewusst nicht gemacht, Entscheidung offen.

**Migration (verlustfrei, nie schlechter):** `POTION_MERGED = { L: 'XL' }`, je L-Trank genau ein XL-Trank.
`migratePotions(p)` beim Laden jedes Spielstands (lokal und Cloud, spieler.js); `potAlias` in `warePot`, `wareClean`
und `wareGive` (handel-ware.js) – alte Briefe und Auktionsangebote mit `hpL`/`mpL` kommen als XL an. Hilfe
(index.html), Ratgeber und Wiki-Bild angepasst.

**Tests (ausgeführt, js/spieler.js `usePotion` im echten Spiel, Magier Lv 80):** jede Größe bei 1 %/50 %/97 % Balken
(Heilung = Wert bzw. bis zum Maximum, nie darüber, 1 Trank verbraucht); Spam 5× → 1 verbraucht, Abklingzeit 3 s; voller
Balken → 0 verbraucht; tot → 0 verbraucht; automatische Größe (100 fehlend → S, 600 → XL); PvP-Wirkung je Größe;
Speichern + Neuladen eines Spielstands mit `hpL: 40, mpL: 25, hpXL: 3` → `hpXL: 43, mpXL: 25`, Summen gleich (53/28);
alte Post-Ware `{trank, mpL, 5}` → +5 `mpXL`. Shop/Beute über `POTION_SIZES`/`potionSizeFor` (Lv 24 → M, 25 → XL, 55 → XXL).
**Nicht getestet:** zwei echte Clients mit Post/Auktion über Firebase (kein Zugang in der Testumgebung).
**Offen:** XL kostet ab Stufe 25 weiter 1 200 G (vorher L 300 G) – wer billig heilen will, nimmt M. Vorschlag zur
Entscheidung: XL-Preisfaktor 80 → 50 (dann sinkt aber der Verkaufswert vorhandener XL von 480 auf 300 G, deshalb nicht
umgesetzt). Wiki muss neu gebaut werden (tools/wiki-bauen.js), damit die L-Seiten verschwinden.
