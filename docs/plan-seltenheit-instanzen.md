# Plan: Seltenheitsfarben, epische und legendäre Ausrüstung, Lv-60-Instanzen

Stand: 2. 11. 2026, Wunsch des Spielers. Wird nach den laufenden Arbeiten (Stufen Lv 70/80, Blizzard, Bogen-Ninja) umgesetzt.

## 1. Seltenheit mit Farben (wie in vielen Rollenspielen)

| Seltenheit | Farbe | Woher |
|---|---|---|
| Normal | grau | Händler, einfache Monster |
| Gewöhnlich | grün | Monster, Seelensteine |
| Selten | blau | Seelensteine, Dungeons, Bosse |
| Episch | lila | ab Lv 60: Dungeons ab Stufe 50 und die neuen Lv-60-Instanzen |
| Legendär | gold | ab Lv 80: nur in Instanzen (Lv-60-Instanzen mit Glück, Höllenthron) |

- Die Seltenheit ist eine eigene Eigenschaft des Gegenstands (`rarity`), getrennt von der Stufe (Lv 1 … 80).
- Rahmen, Name und Leuchten im Inventar, beim Händler, beim Schmied und in der Beute zeigen die Farbe.
- Die bisherigen Stufennamen „Legendär (Lv 22)“, „Mythisch“ usw. werden umbenannt, damit „Legendär“ nur noch die goldene Seltenheit meint.
- Höhere Seltenheit gibt mehr Grundwerte und mehr Boni (z. B. grün 1–2, blau 2–3, lila 3–4, gold 4–5 Boni).
- Alte Gegenstände bekommen beim Laden eine passende Seltenheit (bisherige legendäre Teile → gold oder lila, je nach Stufe).
- Die Legenden-Aura (+20) gilt dann für goldene Teile.

### Umgesetzt (13.56)

- `item.rarity` 0–4 (Normal, Gewöhnlich, Selten, Episch, Legendär). Tabellen in `js/daten/gegenstaende.js`,
  Logik in `js/seltenheit.js`, Aussehen in `css/seltenheit.css`.

| Seltenheit | Farbe | Boni beim Fund | Grundwerte | ab Gegenstandsstufe |
|---|---|---|---|---|
| Normal | grau `#a4a4a4` | 0 | ×1,00 | jede |
| Gewöhnlich | grün `#4ccf5a` | 1–2 | ×1,04 | jede |
| Selten | blau `#4a98ff` | 2–3 | ×1,08 | jede |
| Episch | lila `#b06cff` | 3–4 | ×1,14 | Göttlich (Lv 60) |
| Legendär | gold `#ffb21a` | 4–5 | ×1,22 | nur Ewig (Lv 80) |

  Der Faktor gilt für Angriff, Rüstung, Leben und Mana vor dem Plus. Mit Verstärkungen kann man wie bisher weitere
  Boni hinzufügen (bis 4, mit Seltener Verstärkung 5); die Seltenheit bleibt dabei gleich.
- Woher (`RARITY_DROPS`), Seltenheit wird danach auf das gekappt, was die Stufe erlaubt:

| Quelle | Seltenheit |
|---|---|
| Händler | grau; das teuerste Teil (Gehärtet, Lv 15) grün mit 1–2 Boni |
| normale Monster | 74 % grau, 23 % grün, 3 % blau |
| Monster aus Seelensteinen und in Dungeons | 58 % grau, 35 % grün, 7 % blau |
| Seelensteine | 62 % grün, 38 % blau |
| Dungeon-Bosse (und Wächter) | je Teil 50 % grün, 50 % blau; ab Boss-Stufe 50 je Teil 5 % episch (mind. Göttlich, Lv 60) |
| Endbosse der Maps | episch mit mind. 4 Boni; unter Lv 60 so gut, wie die Stufe erlaubt (blau) |
| Höllenthron-Wächter | episch, je Teil 2 % legendär (Ewig, Lv 80) |
| Abaddor (Zusatzteil) | episch mit 5 Boni, 12 % legendär |

- Gemessen (Testläufe): Eiskönig Hrim (Stufe 52) 4000 Teile: 47 % grün, 48 % blau, 5,5 % episch (gut 10 % je Kill
  mit zwei Teilen). Höllenthron-Wächter 2 % legendär je Teil, Abaddor 12 %.
- Die Stufen heißen jetzt Grundausrüstung, Solide, Gut, **Gehärtet** (Lv 15), **Veteran** (Lv 22), **Meister** (Lv 30),
  Himmlisch, Göttlich, Abgründig, Ewig.
- Anzeige: Name in der Farbe der Seltenheit (Beuteliste, Hinweis, Inventar, Händler, Schmied, Handel, Betrachten),
  Kachelrahmen mit Leuchten (Inventar, Ausrüstung, Lager, Handel, Schmied), Zeile „Episch · Göttlich (Lv 60)“.
  Die Zahl „+N“ behält ihre Plus-Farbe. Jede gefundene Ausrüstung steht als farbige Zeile im Chat (Reiter System).
  Epische Beute: lila Lichtstrahl über der Fundstelle, legendäre: goldener Strahl und goldenes Banner „Legendär!“.
- Alte Spielstände: frühere legendäre Endboss-Teile werden gold (Lv 80), lila (ab Lv 60) oder blau; sonst ab 3 Boni
  blau, mit Boni grün, ohne grau. `item.legend` bleibt als Kennzeichen der Endboss-Teile (Teile aus der Map des
  Endbosses beim Schmied ab +4).
- Die Legenden-Aura (+20) zählt nur noch goldene Teile. Ältere Mitspieler ohne `rarity` im Netz: dort zählt `legend`.
- Schnittstelle für die Instanzen: `rollRarityItem(level, rarity, cls, slot)`, `dropEpic(m, n)`, `dropLegendary(m)`,
  `rarityRoll(item, quelle, m)` mit einer neuen Quelle in `RARITY_DROPS`.

## 2. Lv-60-Instanzen

- Jede Map bekommt 2 Instanz-Eingänge, verteilt auf die Ecken:
  - Maps abwechselnd oben links und unten rechts bzw. oben rechts und unten links.
  - Auf der Karte sichtbar.
- Nur für Gruppen bis 5 Spieler.
- Voraussetzungen: Stufe 60, Gruppe.
- Aufbau wie der Höllenthron (Seelensteine, Wächter, Boss), aber deutlich schwächer als die Endbosse.
- Jede Instanz bekommt ein eigenes Thema passend zur Map, mit eigenem Boss und eigenen Fähigkeiten.
- Beute je Durchgang:
  - Mit Fünfergruppe: 2 epische Teile (lila, Lv 60–70); kleinere Gruppen eher 1.
  - Mit Glück zusätzlich 1 legendäres Teil (gold, Lv 80), z. B. 5–8 %.
  - Dazu Aufwertungsteile.
- Abklingzeit: 30 Minuten je Spieler und je Instanz (siehe Antworten unten).

### Umgesetzt (13.58)

- Daten: `js/daten/instanzen.js` (Instanzen, Gegner, Wächter, Bosse), Ablauf: `js/instanzen.js` (Grundriss, Eingänge,
  Bestückung, Sperre, Fähigkeiten, Beute, Anzeige, Gruppenfinder). Die Instanzen hängen als `DUNGEONS`-Einträge mit
  `inst60: true` hinter dem Höllenthron und nutzen dessen Weg in die Welt: Dungeon-Streifen, `enterDungeon`,
  Ausgang, Tod/Wiederbeleben im Lager der Map, der Host rechnet die Monster, Mitspieler bekommen die Angriffe über
  die Nachricht `raid` und rechnen ihren Schaden selbst.
- Ein Dungeon kann jetzt zwei Blöcke hoch sein (`def.rows`, `dungeonSlots`/`dungeonBlock` in `welt.js`); Höllenthron
  und alle acht Instanzen sind es (60 × 150 Kacheln). Der Streifen hat dadurch 9 statt 5 Spalten.
- Eingänge: je Map zwei, in den Ecken (Frostgipfel oben links + unten rechts, Totenmoor oben rechts + unten links,
  Donnerklamm wie Frostgipfel, Feuerberg wie Totenmoor), auf einer vom Lager aus erreichbaren Stelle (Breitensuche),
  Platz frei geräumt. Großes Steintor in der Farbe der Instanz, auf Minikarte und großer Karte („Instanz: …“, bei
  Sperre mit Restminuten).

| Map | Ecke | Instanz | Thema | Räume* | Wächter (Stufe 60 → 63) | Instanzboss (64) |
|---|---|---|---|---|---|---|
| Frostgipfel | oben links | Gletschergruft | Eis | 24 | Skadi, Ilva, Torbjörn, Hrimfang | Frostkönigin Hjelda |
| Frostgipfel | unten rechts | Feste des Nordlichts | Eis/Nordlicht | 24 | Bjarki, Aurra, Sturmhorn, Jarl Hrimgar | Winterfürst Kaldor |
| Totenmoor | oben rechts | Versunkene Moorkrypta | Gift | 24 | Fenrik, Hexe Morgrah, Moorschlund, Ertrunkener Ritter | Moormutter Vethra |
| Totenmoor | unten links | Knochenkathedrale | Tod | 24 | Kantor der Gebeine, Varis, Knochenkoloss, Bischof Mortheim | Totenfürst Azrakel |
| Donnerklamm | oben links | Donnerschmiede | Sturm | 24 | Raik, Kyra, Grumm, Thorak | Donnerschmied Volund |
| Donnerklamm | unten rechts | Sturmhorst | Sturm | 27 | Ssyla, Grom, Ugrak, Brontes | Sturmkönigin Tempestra |
| Feuerberg | oben rechts | Glutkessel | Feuer | 23 | Sahir, Schlackenfaust, Ilyra, Ignaroth | Magmafürst Pyrrhos |
| Feuerberg | unten links | Aschenzitadelle | Feuer | 29 | Kael, Ishra, Vorr, Barak | Aschenkaiser Vulkhar |

  *mit Halle und zwei Seitenräumen (Schatzkammer, Schrein); vorher hatte der Höllenthron 6, ein Endboss 2 Räume.
- Grundriss (`instPlan`): unter der Halle ein Raster aus 4 × 8 Feldern, der Weg windet sich von unten nach oben
  (je Reihe 2–4 Felder), mindestens 24 Felder. Wächterräume liegen gleichmäßig verteilt, oft über zwei Felder. Jeder
  Kampfraum hat 1–2 Gruppen (Stufe 60–61), zwei Seelensteine (60, 62), jeder Wächter zwei Begleiter.
- Wächter: Leben ×24/34/46/60, Angriff ×1,7–2,15; Instanzboss Stufe 64, Leben ×105 (≈ 2,3 Mio., Endbosse der Maps
  5–8 Mio.), Angriff ×2,35. Der Boss ist versiegelt (Kuppel, kein Schaden), bis alle vier Wächter gefallen sind.
- Fähigkeiten (`instBossTick`, Host): Wechsel aus den Endboss-Angriffen (Stampfer, Meteore, Linie, Tankschlag, Sprung,
  Sturm; Schaden ×0,6) und eigenen je Thema: Kegel, Dornen unter allen, Hagel/Glut/Blitze, Kreuz (gerade/schräg im
  Wechsel), Sog (zieht heran, dann Stampfer), Giftlachen (Schaden über Zeit), Kettenblitz (zusammen stehen = mehrfach
  getroffen), Ring (nur nah sicher), Kern (nur weit weg sicher), Geschossring, Brut. Aufladen im Thema (Eiskugeln,
  Giftnebel, Gewitterwolke, Flammensäule), Aura aus kreisenden Funken. Bei 60 % Wutschrei mit Helfern, unter 30 %
  Raserei (+15 % Angriff). Instanzboss ab 50 %: Ult (Ewiger Winter, Fäulnisflut, Totenmesse, Himmelszorn,
  Weltenbrand) – nur 2–3 grüne Lichtkreise sind sicher, alle 40 s. Keine Runen am Boden, nur Warnkreise.
- Zugang: Gruppe aus 2–5 Spielern, alle ab Stufe 60. Allein: „nur als Gruppe (2–5 Spieler) betretbar“.
- Sperre: `p.instLock[id] = { until, mb, done }` im Spielstand, 30 Minuten ab dem Betreten, je Instanz. Solange der
  Boss nicht gefallen ist, darf man in seinen Durchgang zurück (z. B. nach dem Tod); Wächterbeute (`mb`) und
  Bossbeute (`done`) gibt es je Sperre einmal. Restzeit am Tor, im Gruppenfinder und an der Karte.
- Neubeginn: War eine Instanz 8 Minuten leer, lebt beim nächsten Betreten alles wieder (Host).
- Beute (`instLoot`): Instanzboss 2 epische Teile in der Fünfergruppe, zu viert 1 (30 % 2), sonst 1 – Göttlich
  (65 %) oder Abgründig (35 %); 6,5 % ein legendäres (Ewig, Lv 80); 2 Verstärkungen, Switcher, Seltene Verstärkung,
  50 % Sternenstein, 4–6 Schmiede-Teile, Gold. Wächter: 6/8/10/12 % ein episches Teil, Verstärkung, 50 % Switcher,
  2–3 Schmiede-Teile. Gemessen (je 400 Läufe): 5er 2,0 Teile, 4er 1,32, 2er/3er 1,0; legendär 5,8–7,7 %.
- Gruppenfinder: Kategorie „Instanzen (Lv 60)“ mit acht Einträgen (5 Spieler, 1 Tank, 1 Heiler, 3 Schaden), „Los“
  bringt jeden direkt hinein (fehlt etwas, zum Eingang; gesperrt: bleibt, wo er ist).
- Höllenthron: zwei Blöcke hoch, 26 Räume (mit Halle und zwei Seitenräumen, vorher 6), sechs Seelensteine (64–69), sechs Wächter in
  steigender Stärke: Gorvoth (64), Lilith (65), Zerberos (66), Molgrath (67), Ifrah (68), Belzarek (69); die vier
  neuen mit den Instanz-Fähigkeiten (Feuer) und 15 % Chance auf ein episches Teil. Abaddor (72) bleibt unverändert
  der stärkste und erwacht erst nach allen Steinen und Wächtern.

## 3. Dungeons ab Stufe 50

- Bosse der Dungeons ab Stufe 50 lassen mit kleiner Chance ein episches Teil fallen (lila, Lv 60).
- Umgesetzt (13.56): 5 % je Teil, zwei Teile je Boss (Eiskönig Hrim, Naga-Königin Sseth, Titanenkönig Kroth,
  Urdrache Vharak).

## Antworten des Spielers (2. 11. 2026)

- Instanzen nur auf den Maps ab Stufe 40 (je 2 Eingänge in den Ecken).
- Nur als Gruppe betretbar.
- Wiederholbar alle 30 Minuten – je Spieler und je Instanz: Die Instanz merkt sich, wer drin war; andere Instanzen
  sind für ihn sofort frei.
- Instanzen mit viel mehr Räumen (nicht wie beim Endboss), in jedem Raum Gegner, dazwischen mehrere kleinere Bosse,
  die immer stärker werden, mit eigenen Animationen und Attacken; am Ende der Instanzboss.
- Auch der Höllenthron (Endboss) bekommt viel mehr Räume mit mehr kleineren Bossen, die immer stärker werden.

## 4. Gruppenfinder (Dungeon-Browser), ab Stufe 30

- Kleines Fenster/Knopf unten rechts, erst ab Stufe 30 sichtbar.
- Liste der Instanzen (und Dungeons): man meldet sich mit einer Rolle an – Tank, Heiler oder Schaden.
- Zeigt offene Gruppen und wer drin ist (Name, Klasse, Stufe, Rolle); beitreten oder eigene Gruppe eröffnen.
- Empfohlen: 1 Tank, 1 Heiler, 3 Schaden – aber nicht Pflicht, auch 5 × Schaden geht.
- Rollen-Vorschlag je Klasse und Weg (z. B. Krieger des Leibes = Tank, Schamane des Wassers/Lichts = Heiler),
  frei änderbar.
- Ist die Gruppe voll (oder der Leiter startet), kommt eine Bereitschaftsabfrage; dann Teleport zum Instanz-Eingang
  bzw. direkt hinein.
- Ablauf über den bestehenden Gruppen- und Netzcode (Einladung, Gruppenanzeige) im Kanal.
