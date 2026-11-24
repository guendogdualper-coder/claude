# Langzeit-Ziele ab Stufe 80

Wunsch des Spielers: „Ich brauche noch Content ab Level 80, damit man noch Gründe hat weiter zu zocken und zu grinden.“
Dazu die Sorge: „Wenn man Seelenstufen macht, wird man nicht zu stark und kann alleine alle Bosse und Instanzen machen?“
Antwort darauf: Die Kampfwerte sind hart gedeckelt (zusammen höchstens +8 %, gegen Spieler zur Hälfte), alles andere ist
Komfort. Bossmechaniken bleiben, wie sie sind.

Umgesetzt in drei Paketen, jedes einzeln getestet und veröffentlicht:

| Paket | Version | Inhalt |
|---|---|---|
| 1 | 15.75 | Seelenstufen, Tages- und Wochenaufträge, Weltbosse (dieses Dokument) |
| 2 | 15.76 | Erfolge und Titel, Schwierigkeitsstufen für Instanzen und Turm, Pech-Schutz, Aufstieg legendärer +20-Teile, Juwelen/Sockel (Abschnitte 6–10) |
| 3 | 15.78 | Gildenstufen und Gildenboss, Grenzschlacht, PvP-Saisons, Events (Winterfest, Doppel-EP-Wochenenden), Bonus für weitere Charaktere |

Ausrüstung, Schmied, Prägungen und Veredler auf Stufe 80: `docs/endgame-80.md`.

## 1. Seelenstufen (15.75)

Code: `js/seelenstufen.js` (spät geladen, nach `js/turmfinale.js`). Spielstand: `p.seele = { lv, xp, tot, pts, resets }`.

- Ab Stufe 80 geht Erfahrung nicht mehr verloren (vorher brach `gainXp` auf Stufe 80 einfach ab). Sie füllt die
  Seelenstufen, höchstens `SEELE.max` = 100. Was vor 15.75 auf Stufe 80 als Rest in `p.xp` lag, wird einmal umgerechnet.
- Jede Seelenstufe gibt einen Punkt für zehn Seelenwerte mit je höchstens 10 Punkten.
- Erfahrung je Seelenstufe: `seeleNeed(lv) = xpToNext(80) × (0,5 + 0,03 × lv)` – die erste ≈ 5,0 Mio., die letzte
  ≈ 34,5 Mio. Seelen-EP; alle 100 zusammen ≈ 198,5 × eine Stufe 80 (≈ 1,97 Mrd.).
- Es wirken: der Startbonus (`EVENT_XP`), der Erfahrungsring (+25 %) und der Seelenwert Gelehrter.

| Wert | je Punkt | mit 10 Punkten | Art | Wirkung im Code |
|---|---|---|---|---|
| ⚔ Kraft | +0,3 % | +3 % Schaden | Kampf | `playerStats`: Angriff, Waffenschaden, Fertigkeitsschaden |
| ❤ Ausdauer | +0,3 % | +3 % Leben | Kampf | `playerStats`: maxHp |
| 🛡 Härte | +0,2 % | +2 % Abwehr | Kampf | `playerStats`: def |
| 🪙 Gier | +2 % | +20 % Gold von Monstern | Komfort | `goldFind` |
| 🍀 Glück | +1 % | +10 % Beute | Komfort | `dropFind` |
| 💠 Sammler | +2 % | +20 % Seelensplitter | Komfort | `giveSplinters` (zufällig gerundet) |
| 📖 Gelehrter | +2 % | +20 % Seelen-Erfahrung | Komfort | `seeleGain` |
| 🧪 Heilkunde | +2 % | +20 % Trankwirkung | Komfort | `potionBonus` in `usePotion` (gegen Spieler halb) |
| 🐎 Reiter | +1 % | +10 % Reittempo | Komfort | Reitanteil des Tempos (zu Fuß unverändert) |
| ⚒ Schmiedekunst | −2 % | −20 % Gold beim Schmied | Komfort | `upgradeCost` (auch Turm-Schmied) |

- **Gegen Spieler halb:** `pvpOutgoing` kürzt den eigenen Schaden von (1 + Kraft) auf (1 + Kraft/2), `pvpIncoming`
  erhöht den erlittenen Schaden entsprechend für Ausdauer + halbe Härte. Leben und Abwehr bleiben in der Anzeige gleich.
- **Neu verteilen:** 500.000 Gold, jedes weitere Mal das Doppelte, höchstens 8 Mio. (Goldsenke).
- **Anzeige:** Erfahrungsleiste auf Stufe 80 `★ 37 · x / y Seelen-EP (z %)`; Charakterfenster (C), Seite „Seele“ mit
  Kampf- und Komfortkarten und +1-Knöpfen; der Punkte-Hinweis am Charakterknopf zählt freie Seelenpunkte mit.
- **Bestenliste:** Firebase erlaubt unter `rangliste/$id` keine neuen Felder (`$other: false`). Deshalb trägt das
  vorhandene Feld `xp` auf Stufe 80 die gesamte Seelen-Erfahrung (`seele.tot`); daraus wird die Seelenstufe berechnet
  (`seeleLevelOf`). Sortierung: Stufe → Seelenstufe → GS → Erfahrung. Statt „Stufe 80“ steht `★ n`.

## 2. Tages- und Wochenaufträge (15.75)

Code: `js/tagesauftraege.js`. Spielstand: `p.aufg = { tag, d, woche, w, tt, wt }`. Ab Stufe 80, ohne NPC: Fortschritt
zählt überall, die Belohnung kommt sofort (wie die Nachtjagden).

- Jeden Tag drei aus dem Vorrat, fest je Figur und Tag (FNV-Hash aus Datum, Name und Klasse – kein Neuwürfeln durch
  Neuladen). Tageswechsel wie die Tagesbelohnung (`dailyKey`), Wochenwechsel am Montag (Gerätezeit).

| Tagesauftrag (Vorrat) | Anzahl | zählt bei |
|---|---|---|
| Monster ab Stufe 75 besiegen | 150–250 | `questEvent('kill')` |
| Seelensteine ab Stufe 75 zerstören | 3–5 | `questEvent('stone')` |
| Elite-Gegner besiegen | 20–30 | Kill mit `m.elite80` |
| Den Boss einer Lv-80-Instanz besiegen | 1 | `instFinalLoot` (Instanzstufe ≥ 75) |
| Gold von Monstern sammeln | 250.000–400.000 | `monsterGold` |

| Wochenauftrag | Anzahl | zählt bei |
|---|---|---|
| Tagesaufträge erledigen | 15 | jeder fertige Tagesauftrag |
| Weltbosse besiegen | 3 | `weltbossLoot` |
| Große Bosse ab Stufe 75 (Instanz, Endboss, Turm) | 5 | `instFinalLoot`, `raidLoot`, `turmFinalLoot` |

| Belohnung | Inhalt |
|---|---|
| je Tagesauftrag | 100.000 Gold, 15 Seelensplitter, ½ Stufe 80 als Seelen-EP |
| Tagestruhe (alle drei) | 150.000 Gold, 25 Seelensplitter, 1 Ätherkern |
| je Wochenauftrag | 500.000 Gold, 40 Seelensplitter, 2 Ätherkerne, 1,5 Stufen 80 als Seelen-EP |
| Wochentruhe (alle drei) | 3 Ätherkerne, 1 Seelenstein (Gegenstand), ein Ausrüstungsteil (30 % legendär, sonst episch) |

- **Anzeige:** Questfenster (L), Nebenquests: jeder Auftrag einzeln (`SIDE_QUEST_SOURCES`); Auftragsliste rechts: eine
  Zeile „Tagesaufträge x/3“ mit dem nächsten offenen Auftrag. Meldungen in Teilen mit „ · “, damit `sprache.js` jedes
  Stück übersetzt.

## 3. Weltbosse (15.75)

Code: `js/weltboss.js`, Arten in `js/daten/weltbosse.js`. Zeitplan nur aus der Uhrzeit (`Date.now()`), so kennt ihn
jedes Gerät ohne Netz: alle 3 Stunden, zur halben Stunde (Weltzeit 0:30, 3:30 …), 4 Karten reihum – jeden Tag dieselben
Zeiten.

| Weltboss | Karte | Winterzeit (Sommer +1 h) | Aussehen | Leben (bis 3 Spieler) |
|---|---|---|---|---|
| Kristallkoloss Varnhal | Kristallabgrund (Kristallhänge) | 1:30 und 13:30 | Kristallgolem × 3 | ≈ 24,4 Mio. |
| Seelenschemen Aurun | Seelenhain | 4:30 und 16:30 | Abgrundgeist × 3,4 (Fernkampf) | ≈ 22,6 Mio. |
| Riffkönig Morvath | Nebelküste | 7:30 und 19:30 | Riffscherer × 3 | ≈ 24,4 Mio. |
| Sonnenkoloss Helyra | Himmelsterrassen | 10:30 und 22:30 | Sonnenkoloss × 3 | ≈ 25,6 Mio. |

- **Ablauf:** Ansage 5 und 1 Minute vorher (ab Stufe 75), Zeile in der Auftragsliste ab 15 Minuten vorher; antippen
  zeigt den goldenen Pfeil (`guideTarget` kennt dafür Einträge mit festem Ort `e.at`: erst zum Weltentor, auf der Karte
  zum Boss). Der Boss steht 15 Minuten an einem festen Platz im ersten Jagdgebiet der Karte, danach zieht er sich zurück.
- **Kampf:** Stufe 80, `hpMul` 600–680 (≈ 1,7 × ein Lv-78-Endboss), `atkMul` 3,2–3,35, Stampfer, Salven und
  Verstärkung wie die Dungeon-Bosse. Leben ab dem vierten Spieler auf der Karte beim Erscheinen je +25 %. Kein
  Bodenring unter dem Boss (Wunsch: keine Ringe/Runen als Effekt).
- **Mehrspieler:** Erzeugt wird er nur vom Host des Kanals (allein: vom eigenen Spiel; auch der Welt-Wächter kann Host
  sein), einmal je Ereignis und nicht mehr in den letzten 30 Sekunden. Die Mitspieler bekommen ihn über den Zustand
  (Monster ohne Wiederkehr werden mit Art, Stufe und Leben gesendet). Ein besiegtes Ereignis merkt sich jedes Gerät
  (`localStorage` `seelenstein.weltboss`), damit ein neuer Host ihn nicht noch einmal ruft.
- **Beute** (jeder, der mitgekämpft hat, über `rewardKill` → `bossLoot`): genau ein Ausrüstungsteil der eigenen Klasse
  (25 % legendär, sonst episch, 35 % Waffe), 2–3 Ätherkerne, 25–35 Seelensplitter, 4–6 Monster-Teile, Gold = Stufe ×
  2.500, 0,6 Stufen 80 als Seelen-EP; zählt für den Wochenauftrag; `p.wbKills` zählt mit.
- **Bilder:** 3D über `look` + `lookScale` (`drei-figuren.js`), 2D über das Bild des Vorbilds (`MONSTER_ART`, in
  `weltboss.js` gesetzt, weil Karten 18/19 ihre Bilder erst nach `figuren.js` anlegen) und `mon2dScale`.
- Nicht in Jagdaufträgen (`huntOffers`), nicht in der Prüfungsarena (`arenaPool`/`arenaBossType` schließen Bosse und
  hohe `hpMul` aus).

## 4. Speichern

`SAVE_FIELDS` bekommt `seele`, `aufg` und `wbKills` (jede Datei trägt ihr Feld selbst ein). Die Cloud (`konten/$uid`)
prüft keine Felder. Die Bestenliste nutzt nur vorhandene Felder (siehe oben).

## 5. Tests (15.75)

Browser-Test (2D und 3D, Playwright): Umrechnung alter Rest-Erfahrung, Aufstieg, Erfahrungsring, Summe ≈ 200 Stufen,
elfter Punkt gesperrt, Kampfwerte +3/+3/+2 %, Komfortwerte, Sammler ≈ +20 %, Schmied −20 %, Reiter nur beritten,
PvP halbe Wirkung, Zurücksetzen (Gold, Kosten verdoppelt), Höchststufe 100, Bestenlisten-Eintrag; Tagesaufträge fest je
Tag, Neuwürfeln am neuen Tag, alle drei → Tagestruhe (450.000 Gold, 70 Splitter, 1 Ätherkern), Zählen über echte
Ereignisse (Gold, Kills ab 75, Steine), Wochentruhe mit Teil; Weltboss: Zeitplan (10/17/18/19), Ansagen 5 und 1 Minute,
Erscheinen einmal, Wegweiser (Weltentor → Boss), Beute (1 Teil, Kerne, Splitter, Gold, Seelen-EP, Wochenauftrag),
keine Zeile und kein neuer Boss nach dem Sieg, Rückzug nach 15 Minuten, kein Erscheinen in den letzten 30 Sekunden,
keine Ansage unter Stufe 75. Übersetzung Englisch geprüft (Seite „Seele“, Auftragsliste, Questfenster).

## 6. Pech-Schutz (15.76)

Code: `js/pechschutz.js`, `pechLeg(key, base)`. Spielstand: `p.pech = { key: Fehlversuche }`. Jede Quelle zählt für sich:
Lv-80-Instanzboss (`inst80`), Lv-60-Instanzboss (`inst`), Turm (`turm`), Weltboss (`weltboss`), Wochentruhe (`woche`).
Nach n Fehlversuchen steigt die Chance linear von der Grundchance bis 100 %: `base + (1 − base) · n / 8` – spätestens der
**9. Versuch ist sicher legendär**, danach beginnt der Zähler neu. Bei jedem Fehlversuch steht die nächste Chance im Chat.

## 7. Schwierigkeit (15.76)

Code: `js/schwierigkeit.js`. Spielstand: `p.diff` (0 Normal, 1 Heroisch, 2 Mythisch). Auswahl ab Stufe 80 auf der Seite
„Seele“ im Charakterfenster, am Tor jeder Lv-80-Instanz und im Fenster am Turm.

| Stufe | eigener Schaden | erlittener Schaden | Legendär-Chance | dazu beim Boss / in der Truhe |
|---|---|---|---|---|
| Normal | 100 % | 100 % | ×1 | – |
| Heroisch | 75 % | 140 % | ×1,5 | +1 Ätherkern, +½ Stufe Seelen-EP, 50 % ein Juwel |
| Mythisch | 60 % | 180 % | ×2 | +2 Ätherkerne, +1 Stufe Seelen-EP, ein Juwel (mit Glück Stufe II) |

**Persönlich, nicht je Instanz:** Instanzen sind offene Gebiete mit Wiederkehr, die sich alle im Kanal teilen; eine Stufe für
die Instanz bräuchte einen Abgleich übers Netz und träfe alle, die gerade drin sind. So gilt die Stufe nur für einen
selbst – in derselben Gruppe darf jeder seine eigene spielen. Sie wirkt nur in Lv-80-Instanzen (`instDefAt`,
Instanzstufe ≥ 75) und in den Hallen des Turms (`turmSlotAt`). Eigener Schaden wird in `damageMonster` gekürzt (eigene
Treffer, Diener, Gift – nicht die Treffer der Mitspieler, die der Host bekommt: die kommen schon gerechnet an),
erlittener Schaden in `damagePlayer` erhöht (nicht gegen Spieler). Die höhere Legendär-Chance geht über den Pech-Schutz.

## 8. Juwelen und Sockel (15.76)

Code: `js/juwelen.js`, am Veredler (Seite „Sockel“). Ewige Teile (Lv 80, episch oder legendär): Waffe zwei Sockel,
Rüstung und Helm je einer – höchstens vier Juwelen je Figur (die Nebenhand zählt nicht). Sockel öffnen: 1 Mio. Gold +
5 Ätherkerne (zweiter Waffensockel 3 Mio. + 10). Einsetzen kostet nichts, Herausnehmen 500.000 Gold (das Juwel bleibt).

| Juwel | Stufe I | Stufe II | Stufe III |
|---|---|---|---|
| Rubin | +0,5 % Schaden | +1 % | +1,5 % |
| Saphir | +0,5 % Leben | +1 % | +1,5 % |
| Smaragd | +1 % Abwehr | +2 % | +3 % |
| Topas | +4 % Gold von Monstern | +8 % | +12 % |
| Amethyst | +4 % Seelensplitter | +8 % | +12 % |

Drei gleiche verschmelzen zur nächsten Stufe (200.000 bzw. 1 Mio. Gold). Quellen: jeder Weltboss (eins, zu 25 % Stufe
II), Tagestruhe (eins), Wochentruhe (zwei, eins davon Stufe II), Truhe des Turms (30 %), Seelensteine ab Stufe 75 (3 %),
Heroisch/Mythisch (siehe oben). Höchstens +6 % Schaden über vier Rubine III. Spielstand: `p.juwelen`; am Teil `item.sock`
und `item.gems` (bleiben bei Handel, Post, Auktionshaus und Lager, `itemClean`).

## 9. Aufstieg (15.76)

Am Veredler (Seite „Aufstieg“): legendäre Ewig-Teile auf +20, die voll veredelt sind (5 von 5), steigen bis zu dreimal
auf – Grundwerte je +3 % (wie die Veredelung über `rarityStatMul`). Kosten: 10 / 20 / 40 Mio. Gold, 10 / 15 / 20
Ätherkerne, 2 / 3 / 4 Seelensteine (Gegenstand). Gelingt immer. Am Teil `item.asc`, im Hinweis „Aufgestiegen ✦✦✧“.

## 10. Erfolge und Titel (15.76)

Code: `js/erfolge.js`. 32 Erfolge in fünf Bereichen (Abenteuer, Kampf, Endgame, Ausrüstung), 5–100 Punkte, 19 davon mit
Titel. Die Werte kommen aus dem Spielstand (Stufe, Gold, Kills, Seelensteine, Rangkämpfe, Endbosse, Weltbosse,
Seelenstufe, Ausrüstung, Juwelen, Aufstieg) oder aus eigenen Zählern (`p.erf.z`: Turm, Lv-80-Instanzbosse, Mythisch,
Tagesaufträge). Geprüft alle 3 Sekunden; mehrere auf einmal (alte Spielstände) gibt es als ein Banner.

- **Titel:** im Charakterfenster (Seite „Erfolge“) wählbar, steht im Kopf des Fensters und über der Figur vor der Gilde –
  auch bei den Mitspielern (Zustand `ti` mit der Kennung des Erfolgs, `netPlayerState`/`netApplyState`; ältere Versionen
  ignorieren das Feld). Der Titel wird übersetzt (`trText`).
- **Seiten im Charakterfenster:** neue Seiten kommen über `CHAR_TABS_EXTRA` dazu (`oberflaeche.js`).
