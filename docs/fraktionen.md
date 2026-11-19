# Licht und Schatten (seit 14.54)

Wunsch des Spielers: zwei Seiten, zwischen denen jeder Spieler wählt – Licht oder Schatten. Beide Seiten haben eigene
Karten und eigene Monster und können sich bis Stufe 49 nicht treffen. Ab den Karten der Stufe 50 teilen sie sich die
Welt; dort herrscht außerhalb der Städte offener Kampf zwischen den Seiten. Bestehende Charaktere wählen beim nächsten
Einloggen einmal ihre Seite.

Eigene Namen und Gestaltung: keine Fraktionen, Namen oder Optik aus anderen Spielen, keine Bodenringe, Runen oder Sterne
als Effekte, keine fremden Klänge. Musik und Klänge der neuen Karten sind die eigenen, erzeugten Stimmungen des Spiels.

## Die beiden Seiten

| | Licht | Schatten |
|---|---|---|
| Name im Spiel | Seite des Lichts (der Sonnenbund) | Seite des Schattens (der Mondbund) |
| Wappen | goldene Sonne mit zwölf Strahlen (SVG, `factionCrest`) | violetter Sichelmond vor dunkler Scheibe |
| Farbe | Gold `#ffd36a` | Violett `#a898ff` |
| Startstadt | Kazehana (Map 1) | Mondfall (Map 11) |
| Karten Stufe 1–49 | Maps 1, 4, 5, 6, 2, 7 (bisherige Welt) | Maps 11–16 (neu) |
| gemeinsam ab 50 | Totenmoor (8), Donnerklamm (3), Feuerberg (9), Kristallabgrund (10) | ebenso |

Beide Seiten sind gleich stark: Jede Schattenart hat ein Gegenstück auf der Lichtseite derselben Stufe mit denselben
Werten (Stufe, Leben, Angriff, Tempo, Reichweite, Abklingzeit). Aufträge haben dieselben Stufen und Belohnungen.

## Spielstand

- Neues Feld `faction` in `SAVE_FIELDS` (`'licht'` | `'schatten'`).
- Neue Charaktere wählen die Seite im Erstellungsfenster (Feld „Seite“ mit zwei Karten: Wappen, Name, kurzer Text). Ohne
  Wahl gibt es den Hinweis „Wähle deine Seite: Licht oder Schatten.“
- Ältere Charaktere ohne `faction` bekommen beim nächsten Start einmal ein Wahlfenster (nicht wegtippbar). Wer unter
  Stufe 50 den Schatten wählt, reist in die Schattenstadt seiner Stufe (1–9 Mondfall, 10–19 Glimmwacht, 20–29 Gebeinwacht,
  30–39 Blutwacht, 40–49 Eisnacht). Ab Stufe 50 bleibt man, wo man ist (auf einer Lichtkarte: nach Mondfall).
- Fortschritt der Hauptquest bleibt erhalten: Die Schattenreihe hat in Kapitel 1–6 genau so viele Aufträge wie die
  Lichtreihe, `p.quests.main` zeigt auf beiden Seiten auf denselben Platz. Ein laufender Auftrag behält seinen Fortschritt.
- `WORLD_VERSION` bleibt 15: Die alte Welt verschiebt sich nicht (die neuen Karten liegen in zwei neuen Reihen darunter),
  alle bisherigen Positionen bleiben gültig. Wer mit einem Spielstand auf einer Karte der anderen Seite steht, kommt in die
  eigene Stadt seiner Stufe.

## Welt

- `MAP_H` wächst um `SHADOW_H = 440` Kacheln (zwei Reihen mit je drei Karten zu 360 × 220). `WORLD_W`/`WORLD_H` und damit
  das Rauschen der alten Welt bleiben gleich. Die Schattenkarten (`wm.shadow`) bekommen eigene Rauschfelder und eigene
  Zufallszahlen (`buildWorldMaps`), die alten Karten verbrauchen ihre Zufallszahlen unverändert zuerst.
- Neue Gebiete und Dungeons werden hinten angehängt (`MAP_ZONES`, `DUNGEONS`): Die sechs neuen Endboss-Hallen verlängern
  den Dungeon-Streifen um eine Spalte, kein älterer Dungeon verschiebt sich.
- `WORLD_MAPS.side`: `'licht'` bzw. `'schatten'` – nur diese Seite darf die Karte betreten; ohne `side` gemeinsam.
- Neue Böden (`GROUND`): `NACHTGRAS` (blaugrünes Dämmergras), `NACHTMOOS` (violettes Moos), `SCHWARZERDE` (verkohlter
  Waldboden), `KNOCHENSAND` (bleicher Sand), `BLUTERDE` (rote Steppe), `NACHTSCHNEE` (Schnee im Mondlicht). Farben für 2D,
  3D und Karte, Bodenstruktur und Gras in `schattenwelt.js`.

### Die sechs Schattenkarten

| Map | Name | Stufe | Stadt (Lage) | Gebiete und Boden | Gegenstück |
|---|---|---|---|---|---|
| 11 | Mondfall | 1–9 | Mondfall (rechts unten, 255/140) – Stadt am Mondsee, Weltentor auf der Insel | Dämmerwiesen: Dämmergras mit violetten Moosflecken, Seen | Kazehana |
| 12 | Aschewald | 10–19 | Glimmwacht (rechts, 250/150) – Palisaden-Achteck aus Kohlholz | Aschewald: verkohlter Boden, Tannen mit Glutnestern | Dunkelwald |
| 13 | Knochenwüste | 20–29 | Gebeinwacht (links oben, 95/62) – Ringstadt um einen dunklen Schlund | Knochenwüste: bleicher Sand, graue Ascheflecken, Moortümpel, Knochenbäume | Rostschlucht |
| 14 | Blutsteppe | 30–39 | Blutwacht (rechts, 272/150) – Inselring im Glutsee mit Teleportsteinen | Blutsteppe: rote Erde, Basaltflecken, Moortümpel, schwarzrote Bäume | Ödland |
| 15 | Nachtfrost | 40–49 | Eisnacht (links, 82/150) – Terrassen am Nachthang | Nachtfrost: bläulicher Nachtschnee, zugefrorene Seen, Tannen mit Nachtreif | Frostgipfel |
| 16 | Schattenklippen | 30–50 | Nachtwacht (rechts, 262/140) – Klippenfeste in zwei Hälften über einer Moorschlucht | innen Schattenklippen (Basalt, 30–39), außen Schwarzmoor (Sumpf, 40–50) | Schlangental |

Die Städte nutzen die vorhandenen Stadtformen, aber gespiegelt (`mirrorTownLayout` in `daten/stadtformen.js`) und mit
eigenen Dachfarben, Bannern, Feuerfarben und teils anderer Flüssigkeit (Schlund statt Glutkrater, Moor statt Fluss).
Jede Stadt hat alle Stadtleute mit eigenen Namen (`MAP_PEOPLE` 11–16), eigene Wanderer (`SHADOW_WANDERERS`) und
Nachtwanderer (`SHADOW_NIGHT_WANDERERS`), Mondfall und Nachtwacht je ein begehbares Haus mit Bewohnerin bzw. Bewohner.

Stimmung (`MOOD3`): Dämmerlicht statt Mittagssonne – violetter Himmel über Mondfall, rauchiges Grau im Aschewald,
blasses Mondlicht über der Knochenwüste, blutroter Abendhimmel in der Blutsteppe, Nachtblau im Nachtfrost, grünlicher
Dunst über dem Schwarzmoor. Dazu je Gebiet Felsen, Bodenschmuck, Randkulisse und Bäume (`WORLD3.tree/pine/dead` für die
Schattenstile), Musikstimmung aus den eigenen Kompositionen.

### Dungeons, Instanzen, Endbosse

- Die Dungeons der Stufen 10–49 stehen beiden Seiten offen. Auf den Schattenkarten haben sie einen zweiten Eingang
  (`entry2`): Spinnenhöhle und Banditenkeller (Aschewald), Orkfestung (Knochenwüste), Totengruft (Blutsteppe),
  Eisgrotte (Nachtfrost), Schlangentempel (Schattenklippen) und die beiden Lv-60-Instanzen Gletschergruft und Feste des
  Nordlichts (Ecken des Nachtfrosts). Man kommt am Eingang der eigenen Seite wieder heraus (`dungeonEntranceFor`). Der
  zweite Eingang wandert nicht (die wandernden Eingänge in `dungeon-wandern.js` gelten nur für die Lichtseite).
- Endboss je Schattenkarte (eigene Halle südlich der Stadt, Werte wie das Gegenstück):
  Skarn, der Nachtwolf (Stufe 14, Mondfall) · Brakkur, der Kohlenfürst (24, Aschewald) · Gebeinfürst Vharok (34,
  Knochenwüste) · Blutfürstin Sereth (44, Blutsteppe) · Nachtriese Skadur (54, Nachtfrost) · Moormutter Veyla (55,
  Schattenklippen).
- Das Finale „Die neun Endbosse“: Schatten braucht die sechs eigenen und die drei der gemeinsamen Karten (Lichkönig,
  Donnertitan, Weltendrache), Licht wie bisher seine neun.

### Monster der Schattenseite (`daten/schattenmonster.js`)

| Karte | Arten (Gegenstück) |
|---|---|
| Dämmerwiesen | Aschehund (Wilder Hund), Dämmerfuchs (Rotfuchs), Nebelwolf (Wolf), Nachthirsch (Rothirsch), Nachtleitwolf (Alpha-Wolf), Schattenkeiler (Wildschwein) |
| Aschewald | Aschenräuber (Bandit), Glutkeiler (Dornenkeiler), Rußschütze (Bandit-Schütze), Aschespinne (Waldspinne), Rußluchs (Luchs), Kohlenbär (Braunbär) |
| Knochenwüste | Beinbrecher (Ork-Krieger), Aashyäne (Tüpfelhyäne), Knochenruferin (Ork-Schamane), Bleichskorpion (Wüstenskorpion), Knochenhauptmann (Ork-Hauptmann) |
| Blutsteppe | Blutoger (Steinoger), Steppenwarg (Aschewarg), Blutdämon (Dämon), Blutmaul (Höllenhund) |
| Nachtfrost | Mitternachtswolf (Eiswolf), Nachtbär (Eisbär), Dunkelyeti (Yeti), Nachtmammut (Wollmammut), Frostgespenst (Frostgeist) |
| Schattenklippen / Schwarzmoor | Klippenviper, Klippenschakal, Nachtrassler, Schattenkobra / Moorpython, Nebelpanther, Moornaga, Moorseherin |

Aussehen: dieselbe Familie wie das Gegenstück (2D-Zeichnung und das daraus entstehende 3D-Modell), aber mit eigenen
Farben und Zubehör (`shadowArt` in `schattenwelt.js` färbt die Vorgaben der Zeichnung um und setzt Augen, Zeichnung,
Mähnen, Runenfarben). Eigene 3D-Tiere für Keiler, Glutkeiler (Glutdornen), Nachthirsch (leuchtende Geweihspitzen) und
Nachtmammut; Köpfe der Menschenartigen (Kapuzen, Masken, Knochenhelme, Hörner) in eigenen Farben; Gebietsthema der
3D-Modelle (Nacht, Asche, Knochen, Blut, Frost, Moor).

Nachts kommen auf den Schattenkarten dieselben Nachtwesen wie auf der Lichtkarte derselben Stufe dazu.

Monster-Teile: Jede Schattenart lässt ein eigenes Teil fallen (z. B. Aschezahn, Nebelpelz, Kohlenkralle, Reifkristall).
Der Schmied verlangt von jeder Seite die Teile ihrer eigenen Monster; aufgehobene Teile der anderen Seite (z. B. aus einem
gemeinsamen Dungeon oder aus dem Auktionshaus) werden beim Aufheben in die eigenen umgerechnet (`matForSide`).

### Aufträge

- Hauptquests: Kapitel 1–6 der Schattenseite (Mondfall, Aschewald, Knochenwüste, Blutsteppe, Schattenklippen,
  Nachtfrost) mit eigenen Geschichten, Gegnern und Ältesten (`SHADOW_CHAPTERS` in `daten/quests.js`); ab Kapitel 7
  (Totenmoor) gemeinsam, Heimkehr, Finale und Epilog führen nach Mondfall (`MAIN_QUESTS_SCHATTEN`, `mainQuestList()`).
- Nebenaufgaben der Wanderer und Hausbewohner, Jagden der Jägerin und Nachtjagden funktionieren auf den Schattenkarten wie
  auf jeder Karte (Monster der Karte).

## Reisen und Sperren

- Weltentor: zeigt nur die Karten der eigenen Seite und die gemeinsamen Karten (Hinweis mit Wappen oben im Fenster).
- Wegweiser: Ziele der eigenen Seite (Schatten: Dämmerwiesen, Aschewald, Knochenwüste, Blutsteppe, Nachtfrost) und die
  gemeinsamen Gebiete.
- Wer auf einer Karte der anderen Seite steht (alter Spielstand, Einladung, Gruppenteleport, Riss), wird binnen einer
  halben Sekunde in die eigene Stadt seiner Stufe gebracht (`factionLockTick`).
- Wiederbeleben: in der Stadt der Karte, in der man ist; nie in einer Stadt der anderen Seite (Dungeon mit zweitem
  Eingang: Stadt dieser Karte, sonst die Heimat der eigenen Stufe).
- Große Karte und Minikarte zeigen immer die Karte, auf der man steht – also automatisch die richtigen.

## Gemeinsame Karten ab Stufe 50 – offener Kampf

- Auf Totenmoor, Donnerklamm, Feuerberg und Kristallabgrund dürfen sich Spieler der beiden Seiten angreifen, wenn beide
  mindestens Stufe 50 sind und beide draußen stehen (nicht in Städten und Lagern; Dungeons, Instanzen und Arenen liegen
  außerhalb der Karten und zählen nicht).
- Technik wie in der Turnierarena: Gegner stehen als Stellvertreter in der Zielliste (`pvpFoes`), Auto-Ziel, Tab,
  Flächenangriffe, Geschosse und Diener treffen sie. Treffer gehen über den Kanal direkt an den Getroffenen (`'oh'`), der
  sie mit seinen eigenen Werten abrechnet (`pvpReceiveHit` mit `PVP_DMG` aus `kampf.js`: PvP-Faktor, Rüstung, Deckel je
  Treffer und in 1,5 s, Gift) und den Schaden zurückmeldet (`'of'`, Lebensraub zu 60 %). Beide prüfen die Regeln (Seite,
  Stufe, gemeinsame Karte, nicht in der Stadt) unabhängig voneinander.
- Solange man im offenen Kampf ist (12 s nach dem letzten Treffer), gelten Tränke, Heilung und Gift wie im PvP.
- Wer fällt, fällt wirklich (normaler Tod: Wiederbeleben in der Stadt kostenlos, an Ort und Stelle mit Erfahrungsverlust);
  der Sieger bekommt einen Hinweis („Sieg!“).
- Namensschilder: Spieler der anderen Seite rot (Name und Lebensbalken), eigene Seite wie bisher. Minikarte: andere Seite
  als roter Punkt.

## Gemeinschaft

- Gruppe, Handel, Gilde und Gruppenfinder nur innerhalb der eigenen Seite: Eigene Anfragen an die andere Seite gehen gar
  nicht erst hinaus (Hinweis im Chat), Anfragen der anderen Seite werden automatisch abgelehnt.
- Post: Beim Anmelden des Namens wird die Seite mitgeschrieben (`namen/<name>.s`, `l` oder `s`); Briefe an einen
  Charakter der anderen Seite werden abgelehnt. Namen ohne Eintrag (noch nicht wieder eingeloggt) bleiben erreichbar.
- Chat: Global bleibt gemeinsam (Entscheidung: die Welt ist ein Kanal, Absprachen und Begegnungen ab Stufe 50 sollen
  möglich sein; Gruppe und Gilde sind ohnehin je Seite getrennt). Duelle und Freundschaften bleiben über die Seiten
  hinweg möglich (beides freiwillig).
- Auktionshaus: gemeinsam (neutraler Markt); Teile der anderen Seite werden beim Abholen umgerechnet.
- Bestenliste: Wappen der Seite vor dem Namen (neues Feld `seite` in `rangliste/<uid>_<platz>`; die Regeln in
  `docs/firebase-regeln.json` kennen es jetzt). Solange die eingespielten Regeln das Feld noch ablehnen, schreibt das Spiel
  ohne Seite weiter (einmal gemerkt). Die Online-Liste zeigt die Seite aus dem Netz.

## Netz

- Spielerzustand: kurzes Feld `fr: 's'` für Schatten; ohne Feld (Licht oder ältere Version) gilt Licht.
- Neue Nachrichten zwischen Spielern (über den Host weitergereicht wie Duelle): `oh` Treffer im offenen Kampf, `of`
  Rückmeldung, `ok` besiegt. Ältere Versionen kennen sie nicht und ignorieren sie (sie haben ohnehin keine Seite und gelten
  als Licht).
- Die Monster aller Karten rechnet wie bisher der Kanal-Host.

## Dateien

- `js/daten/schattenmonster.js` – Monster und Endbosse der Schattenseite
- `js/daten/zonen.js` – Karten 11–16, Gebiete, zweite Eingänge, Endboss-Hallen, `side` der Lichtkarten
- `js/daten/stadtformen.js` – gespiegelte Stadtformen 11–16
- `js/daten/quests.js` – Hauptquests der Schattenseite, Wanderer
- `js/daten/nachtmonster.js` – Nachtgruppen und Nachtwanderer der Schattenkarten
- `js/welt.js` – Kartengröße, Böden, Erzeugung der Schattenkarten, Leute, zweite Eingänge
- `js/schattenwelt.js` – Aussehen: Böden, Stimmung, Bäume, Felsen, Rand, Monster
- `js/seiten.js` – Seitenwahl, Reisen, Sperre, offener Kampf, Gemeinschaft, Netz
- kleine Anpassungen: `spieler.js` (SAVE_FIELDS), `oberflaeche.js` (Erstellung, Wappen in der Charakterauswahl),
  `quests.js`/`questfenster.js` (Questreihe und Endbosse je Seite), `post.js`, `bestenliste.js`, `handel-ware.js` (Teile
  je Seite), `karte.js` (Minikarte), `zeichnen.js` (Namen), `tag-nacht.js`, `gruppenfinder.js`, `instanzen.js`,
  `drei-welt.js` (dichtes Gras und Laubbäume je Gebiet als Liste), `index.html`, `css/style.css`, `sw.js` (neue Dateien in
  der Liste, Version unverändert), `js/sprachen/en.js`, `docs/firebase-regeln.json` (Feld `seite` der Bestenliste)

## Zahlen und Tests

- Monster je Karte (Seelensteine/Monster): Mondfall 25/489 (Kazehana 25/496), Aschewald 35/440 (Dunkelwald 35/443),
  Knochenwüste 35/510 (Rostschlucht 35/491), Blutsteppe 35/426 (Ödland 35/436), Nachtfrost 35/486 (Frostgipfel 35/474),
  Schattenklippen 70/796 (Schlangental 70/795). Insgesamt rund 10.500 Monster und Steine (vorher rund 7.150); ruhende Monster
  ohne Spieler in der Nähe kosten wie bisher kaum Rechenzeit. Die Welt entsteht in rund 1,5 s (Chromium, Testrechner).
- Karte 1800 × 1320 Kacheln (vorher 1740 × 880).
- Tests (Playwright, Arbeitsordner `fraktionen53`): Erreichbarkeit aller 16 Karten ab der Ankunft (100 %, alle Leute,
  Eingänge und Tore erreichbar), alle 14 Stadtformen (sichere Fläche, Monster bleiben draußen, 32 Teleportsteine zu Fuß
  und zu Pferd), Seitenwahl (Formular, Wahlfenster, Spielstand), Reiseziele je Seite, Sperre der fremden Karten,
  zweite Dungeon-Eingänge und Wiederbeleben, offener Kampf (nur andere Seite, nur ab 50, nie in der Stadt, Treffer
  hinaus und herein, Einladungen gesperrt), Netzfeld, Endbosse, Hauptquest-Übernahme.

## Offen / Ideen

- Ankunftsorte je Seite auf den gemeinsamen Karten (eigene Vorposten): Zurzeit kommen beide Seiten in derselben Stadt an,
  in der niemand angreifen kann. Wer „am Anfang nicht treffen“ auch auf den gemeinsamen Karten will, bräuchte je Karte ein
  zweites Lager – das ändert Kacheln auf bestehenden Karten und ist darum nicht Teil dieses Schritts.
- Die zweiten Dungeon-Eingänge wandern nicht mit.
- Übersetzung: Englisch vollständig für die neuen Texte, die übrigen Sprachen zeigen die neuen langen Texte auf Englisch
  bzw. Deutsch (wie bei anderen neuen Inhalten).

## Seit 14.71: Gruppe und Handel über die Seiten hinweg

Wunsch des Spielers: Licht und Schatten sollen trotzdem zusammen spielen können. Seitdem gilt:
- Gruppeneinladung, Handel und Gruppenfinder funktionieren auch mit Spielern der anderen Seite (`FACTION_INVITES` leer,
  `gfJoinBlock` ohne Seitenprüfung). Damit können gemischte Gruppen zusammen Dungeons und Instanzen gehen; jeder kommt
  am Eingang seiner eigenen Seite wieder heraus.
- Offener Kampf ab Stufe 50 auf den gemeinsamen Karten bleibt – außer zwischen Mitgliedern derselben Gruppe
  (`openPvpAllowed` prüft `inMyParty`, auf beiden Seiten, also auch beim Empfänger der Treffer).
- Unverändert: Gilden und Post nur innerhalb der eigenen Seite; Karten unter Stufe 50 bleiben getrennt.
