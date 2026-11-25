# Rissläufe und Stadt-Angriffe

Zwei neue Inhalte, beide in eigenen Dateien und nur über Wrapper eingehängt:

- `js/risslauf.js` – Rissläufe (Dungeon auf Zeit ab Stufe 80, Schlüsselstufen, Wochenregeln, Bestwerte)
- `js/stadtangriff.js` – Stadt-Angriffe (Monsterwellen vor einem Stadttor, Stadtwachen, Anführer)
- `neue-texte-riss.json` – neue sichtbare Texte für die Übersetzungen (kurze Texte in allen 14 Sprachen, lange nur
  Englisch; Schlüssel mit `{0}` statt Zahlen, zusammengesetzte Zeilen mit „ · “ getrennt)

In `index.html` und `sw.js` stehen beide Dateien direkt nach `js/arena-bots.js`. Spielstand: neues Feld `riss`
(`SAVE_FIELDS.push('riss')`). Keine Änderung an `netz.js`, `netz-signal.js`, `kampf.js`, Server oder Datenbank-Regeln.

---

## 1. Rissläufe

### Zugang

- **Rissmeisterin** (eigene Figur in 2D und 3D: violette Robe, langes helles Haar, Stab mit gespaltenem Kristall;
  Symbol über dem Kopf: ein gezackter, leuchtender Spalt) neben dem Teleporter in Kazehana (Ysmera), Mondfall (Nalvi),
  Lichtwacht/Kristallabgrund (Liraya), Seelenwacht/Seelenhain (Oriel), Leuchtwacht/Nebelküste (Merel) und
  Sonnenhof/Himmelsterrassen (Tavira).
- Ihr Fenster zeigt Schlüsselstufe, Bestwert, Bestwert der Woche, Läufe (geschafft/gesamt), die Regeln der Woche, die
  Belohnung der gewählten Stufe und den Knopf „Riss öffnen“. Wählbar ist jede Stufe von 1 bis zur eigenen.
- Mit Gruppe: Häkchen „Gruppe einladen“ (nur Mitglieder im Kanal ab Stufe 80). Sie bekommen ein kleines Fenster mit
  Countdown („Mitmachen“/„Ablehnen“) und werden beim Zusagen in den Riss gebracht – egal, wo sie gerade sind.
  Beitreten geht, bis der Rissherr erscheint. Höchstens 5 Spieler.
- Allein spielbar: ohne Gruppe startet die Uhr 5 Sekunden nach der Ankunft.

### Ablauf

1. Jeder Lauf würfelt einen **neuen Grundriss** (Startwert vom Host). Gebaut wird mit der Technik der gewürfelten
   Dungeons (`welt.js`): Raster 4 × 4 Felder zu 22 Kacheln, ein Weg aus 7–9 Räumen ohne Kreuzung mit mindestens drei
   Kurven (Start und Rissherr mindestens drei Felder auseinander), 1–2 Seitenkammern mit Elite, oft ein zweiter Weg
   (Schleife). Raumformen Halle, Rundsaal, Kreuz, Säulenhalle, Höhle; gewundene Gänge, Becken (Abgrund, Lava, Wasser),
   Bodenschmuck, unerreichbare Taschen werden zu Fels. Schmuck aus `dungeonProps` (Feuerbecken, Banner, Statuen, Thron
   im letzten Raum, Truhe und Gold in den Seitenkammern). Ausgang: Steinkreis oben links im ersten Raum.
2. **Fünf Themen** (zufällig je Lauf): Kristallriss, Leerenriss, Glutriss, Frostriss, Tiefenriss – je mit eigenem
   Boden, Wänden, Licht (3D), Schwebeteilchen, Gegnern und Rissherrn.
3. **Räume erwachen**, sobald ein Teilnehmer bis auf 14 Kacheln herankommt: 1–2 Packs zu 3–5 Monstern, mit 35 %
   Chance eine Elite (gleiche Art, größer, „Elite: …“, Leben ×3,2, Schaden ×1,25). Die Zahl der Monster richtet sich
   nach den Spielern, die gerade im Riss sind.
4. Jedes Monster gibt **Rissenergie** (gewöhnliche 1, Elite 4). Bei **80 %** der Energie aller Räume erscheint der
   **Rissherr** mit drei Begleitern im letzten Raum. Fällt er, ist der Riss geschlossen.
5. **Zeit:** 10 Minuten (Regel „Zeitdruck“: 7,5). Jeder Tod kostet 10 Sekunden; nach 5 Sekunden steht man am Anfang des
   Risses wieder auf (kein Todesfenster, kein Verlust an Erfahrung). Ist die Zeit um, kann man den Riss noch schließen –
   das zählt als „zu spät“.
6. Nach dem Schließen bleibt der Riss 90 Sekunden offen (Ergebnisfenster, Rückweg über den Steinkreis oder ✕ in der
   Anzeige), dann bringt er alle zurück an den Ort, an dem sie aufgebrochen sind.

### Schlüsselstufe

| Ergebnis | Schlüsselstufe |
|---|---|
| in der Zeit geschafft | gelaufene Stufe + 1 (mehr als ein Drittel Restzeit: + 2), nie niedriger als vorher |
| zu spät geschafft, verlassen, abgebrochen (auch durch Neuladen, sobald die Uhr lief) | − 1, nur für den, der den Riss geöffnet hat, und nur auf seiner eigenen Stufe (nie unter 1) |
| niedrigere Stufe gewählt („Übungslauf“) | kein Abzug |
| Verbindung zum Host verloren | kein Abzug |

Nach oben ist die Stufe offen. Mitspieler steigen nach einem Lauf in der Zeit auf die Stufe des Laufs + 1/+ 2, wenn
ihre eigene niedriger ist.

### Stärke je Stufe

Leben × 0,9 · 1,08^(Stufe − 1), Schaden × 0,9 · 1,045^(Stufe − 1) (Grundwerte: gewöhnliche Monster der Stufe 80).
Rissherr: Leben von 26 gewöhnlichen Monstern der Stufe 80, Schaden 75 % seiner Vorlage (Wächter der Lv-80-Instanzen
mit allen Angriffen und Warnflächen, ohne Siegel und Vernichtung).

| Stufe | Leben | Schaden | Rissherr (allein) |
|---|---|---|---|
| 1 | × 0,90 | × 0,90 | 0,88 Mio. |
| 5 | × 1,22 | × 1,07 | 1,20 Mio. |
| 10 | × 1,80 | × 1,34 | 1,76 Mio. |
| 20 | × 3,88 | × 2,08 | 3,80 Mio. |
| 30 | × 8,39 | × 3,23 | 8,19 Mio. |
| 40 | × 18,1 | × 5,01 | 17,7 Mio. |

Je weiterem Spieler: Zahl der Monster + 35 %, ihr Leben + 25 %, Schaden + 4 %, Leben des Rissherrn + 75 %.

### Regeln der Woche

Aus der Kalenderwoche (ISO, Weltzeit; neue Woche Montag 0 Uhr UTC) gewürfelt, für alle gleich: 2 oder 3 aus acht.
Nie zusammen: „Berstende Leiber“ + „Giftspur“, „Schwarm“ + „Elitenflut“.

| Regel | Wirkung | Gerechnet von |
|---|---|---|
| Berstende Leiber | besiegte Monster platzen nach 1,3 s (rote Warnfläche, Radius 78): 12 % + 0,4 % je Stufe des Höchstlebens (höchstens 35 %) | jedes Gerät für die eigene Figur |
| Raserei | Monster unter 35 % Leben schlagen 40 % härter (rote Funken) | Host |
| Schildbann | Rissherr bei 66 % und 33 %: Schild + drei Schildwächter (Elite), unverwundbar bis sie fallen („Schild!“) | Host, Mitspieler sehen den Schild über den Zustand |
| Zeitdruck | 75 % der Zeit, Beute × 1,3 | Host (Zeit), Gerät (Beute) |
| Elitenflut | doppelte Elite-Chance, in großen Räumen oft eine Elite mehr | Host |
| Rissblitze | alle 7–10 s zwei bis drei Warnflächen (Radius 60) um die eigene Figur, nach 1,4 s Blitz: 13 % + 0,4 % je Stufe (höchstens 35 %); nicht im ersten Raum | jedes Gerät |
| Giftspur | besiegte Monster hinterlassen für 6 s eine Giftlache (Radius 56): 2,5 % je halbe Sekunde | jedes Gerät |
| Schwarm | 40 % mehr Monster, jedes mit 25 % weniger Leben | Host |

### Belohnung (nur nach dem Schließen, jedes Gerät für sich)

| Stufe | Gold | Seelensplitter | EP | Ätherkerne | Juwel-Chance |
|---|---|---|---|---|---|
| 1 | 14.500 | 8 | 60.000 | – | 3 % |
| 5 | 24.500 | 16 | 100.000 | 1 | 7 % |
| 10 | 37.000 | 26 | 150.000 | 2 | 12 % |
| 20 | 62.000 | 46 | 250.000 | 3 | 22 % (auch Stufe II) |
| 30 | 87.000 | 66 | 350.000 | 4 | 25 % |

Formeln (`RISSLAUF.lohn`): Gold 12.000 + 2.500 · Stufe, Splitter 6 + 2 · Stufe (höchstens 80), EP 50.000 + 10.000 ·
Stufe, Ätherkerne ab Stufe 4 alle 6 Stufen einer mehr (höchstens 4), Juwel 2 % + 1 % je Stufe (höchstens 25 %, ab Stufe
20 mit Chance auf Stufe II). Zu spät: halbe Belohnung, halbe Kerne, kein Juwel. Zeitdruck: × 1,3. Dazu je Monster
Erfahrung und etwas Gold (geteilt durch den Faktor der Gruppe, keine Gegenstände), der Rissherr gibt die 20-fache
Erfahrung eines Monsters.

### Anzeige

- Während des Laufs: am PC über dem Chat, am Handy als schmale Pille unter der Lebensanzeige – Thema, Stufe, Restzeit
  (unter einer Minute gelb, danach rot mit „+“), Ziel, Rissenergie bzw. Leben des Rissherrn, Regeln, Tode, Spieler,
  „Verlassen“ mit Rückfrage („Schlüsselstufe −1“).
- **Ergebnisfenster** nach dem Schließen: Riss, Stufe, Zeit / Limit, Tode, Schlüsselstufe alt → neu, Bestwert,
  Bestwert der Woche, Belohnung, „Neuer Bestwert!“, Regeln.
- **Charakterfenster**, Seite „Rissläufe“ (ab Stufe 80): Schlüsselstufe, Bestwerte, Regeln der Woche, letzte acht
  Läufe (in der Zeit / zu spät / abgebrochen), Belohnung der eigenen Stufe.
- **Bestenliste**, neuer Reiter „Rissläufe“: Spieler im eigenen Kanal (Feld `rl: [Stufe, Sekunden]` im
  Spielerzustand, geprüft: Stufe 1–9.999, Zeit ganzzahlig ≥ 0, Name mit `escapeHtml`) und die eigenen Charaktere auf dem
  Gerät, sortiert nach Stufe, dann Zeit. Klassenfilter wie in den anderen Reitern.

### Bestenliste: warum nur im Kanal

`js/bestenliste.js` schreibt nach `rangliste/<uid>_<platz>`; die Regeln in `docs/firebase-regeln.json` erlauben dort nur
die bekannten Felder (`"$other": { ".validate": false }`) und sonst keinen frei beschreibbaren Pfad. Ein Bereich
„Rissläufe“ geht deshalb nicht ohne Änderung der Datenbank-Regeln. Für eine echte, weltweite Rangliste wäre nötig:

1. In `rangliste/$id` zwei neue Felder, z. B.
   `"rl": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 999" }` und
   `"rlt": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 3600" }`,
   dazu `".indexOn": ["level", "rp", "rl"]`.
2. In `rankEntryOf` (bestenliste.js) `rl` und `rlt` aus `sv.riss.best`/`sv.riss.bestT` schreiben (nur wenn die Regeln
   eingespielt sind, wie bei `seite`), in `rankClean` prüfen, `RANK_TABS.riss.field = 'rl'` setzen und die Liste nach
   `rl` absteigend, bei Gleichstand `rlt` aufsteigend sortieren.
3. Plausibilität: ohne eigenen Server kann ein Spieler seinen Spielstand ändern. Echte Sicherheit bräuchte, dass der
   Welt-Wächter (Host auf dem Server) das Ergebnis bestätigt und selbst schreibt (Dienstkonto wie
   `tools/bestenliste-nachtragen.js`).

### Technik

- **Felder:** zwölf Felder zu 96 × 96 Kacheln im freien Fels östlich der Welt, unter den Hallen der Prüfungsarena:
  `x = WORLD_W + 14 + Spalte · 104`, `y = DUNGEON_H + 712 + Reihe · 104` (zwei Reihen zu sechs, bis
  y = DUNGEON_H + 920). Außerhalb aller Karten, also kein offener Kampf zwischen Spielern. Beim Erzeugen der Welt sind
  die Felder voll Fels (`generateWorld`-Wrapper).
- **Neubau zur Laufzeit:** `rlBuild` schreibt Boden, Objekte, Schmuck, Gebiet, Bauten und den Ausgang des Felds neu.
  Jeder Bau bekommt eine neue Kennung (`regionRect3` → `dr<Feld>g<Nummer>`, `mapAreaAt` → `r<Feld>g<Nummer>`): 3D
  (`V3.home`, Blöcke, Höhlentiefe), 2D (`HOME2D`, Bodenblöcke) und Karte bauen damit von selbst neu.
  Hindernis-Zwischenspeicher und NPC-Liste werden zurückgesetzt.
- **Gebiete:** je Thema eine Zone `riss_<thema>` (Name, Boden, Schwebeteilchen, Wandfarbe `wallLook`), Licht in 3D über
  `MOOD3`, Musik „dunkel“.
- **Gegner:** gewöhnliche Arten (Stufe 80 im Riss), Elite als Kopie (`riss_e_<art>`), Rissherr als Kopie eines
  Instanz-Wächters (`riss_herr_<thema>`): Bild in 2D, Färbung und Bossmodell in 3D von der Vorlage.
- **Mehrspieler:** Die Felder führt der Host (allein man selbst, im Kanal der Host bzw. der Welt-Wächter).
  Nachrichten über `onSocial`:
  - an den Host (nur beim Host, nur von Mitspielern im Kanal): `rln` neuer Riss, `rlj` beitreten, `rlx` absagen,
    `rlv` verlassen
  - vom Host (nur beim Mitspieler, nur vom Host): `rlg` los (Feld, Startwert, Stufe, Regeln), `rli` Einladung, `rlf`
    Absage (nur Kennung, der Text kommt vom eigenen Gerät), `rls` Zustand (jede Sekunde und bei Änderungen), `rlb`
    Rissherr, `rlh` Schild, `rle` Ende, `rlk` geschlossen
  - Tode zählt der Host selbst aus dem Zustand der Teilnehmer (keine Nachricht).
- **Sicherheit (Hinweis 15.83):** Alle Felder werden geprüft (`rlClean`: Typ, Bereich, `isFinite`, nur bekannte Regeln
  und Themen). Die Belohnung rechnet jedes Gerät selbst: Stufe und Regeln wie beim eigenen Start bzw. in der
  Einladung, Zeit aus der eigenen Uhr seit dem Start (der Host darf sie höchstens 3 s schneller machen), Rissherr muss
  erschienen und im eigenen Bild gefallen sein, man muss im Feld stehen. Sonst gibt es nichts.
- **Neuladen im Riss:** man steht wieder am Aufbruchsort; lief die Uhr schon, zählt der Lauf als abgebrochen.

---

## 2. Stadt-Angriffe

### Zeitplan

Aus der Uhr (Weltzeit), für alle gleich: Angriffe um **0:40, 2:40, 5:40, 7:40, 10:40, 12:40, 15:40, 17:40, 20:40,
22:40** (UTC; in Deutschland eine bzw. zwei Stunden später) – alle fünf Stunden zwei, also abwechselnd zwei und drei
Stunden Abstand. Angegriffen wird auf **jeder Karte, auf der gerade jemand spielt**, die Stadt bzw. das Lager dieser
Karte. Welches Tor, rechnet jedes Gerät aus Nummer des Angriffs und Karte gleich aus (nur Tore mit Weg nach draußen und
begehbarem Platz davor).

- **5 Minuten vorher:** Meldung im Chat (Reiter „Global“) und Banner: „Stadt-Angriff in 5 Minuten – sammelt euch vor
  dem Tor · Stadt · Tor“.
- **1 Minute vorher:** Erinnerung im Chat.
- **Beginn:** Banner „Angriff auf die Stadt!“, Chat, die Stadtwachen treten vor das Tor.

### Ablauf

- **3–5 Wellen** (aus der Nummer des Angriffs), Monster je Welle allein 6 + 2 · Welle (8, 10, 12, 14, 16), die zweite
  Hälfte 6 s später. Sie erscheinen 12–22 Kacheln vor dem Tor auf dem Weg und ziehen zum Platz vor dem Tor; Spieler bis
  14 Kacheln entfernt greifen sie an. Erste Welle nach 8 s, Pause 10 s; eine Welle dauert höchstens 100 s, dann kommt
  die nächste trotzdem.
- **Anführer:** ein Dungeon-Boss nahe der Stufe (ohne Endbosse, Instanzen, Weltbosse) mit Leben von 12 Monstern und
  130 % Schaden, dazu 4 Begleiter. Fällt er, ist die Stadt gerettet. Er gibt Erfahrung und etwas Gold, aber keine Beute
  eines Dungeon-Bosses und kehrt nicht wieder.
- **Stadtwachen:** vier Wachen (Figur der Torwache) vor dem Tor, zwei vorn, zwei dahinter. Sie greifen Angreifer bis
  6 Kacheln um ihren Platz an (je Schlag 6 % des Lebens, beim Anführer 1 %, alle 1,2 s) und kehren dann zurück. Monster
  greifen sie nicht an. Beim Host rechnen sie auch, wenn seine eigene Figur woanders ist; auf den anderen Geräten
  stehen sie zum Ansehen (eigene Bewegung, kein Schaden).
- **Torfestigkeit:** 100. Wer vor dem Tor (4 Kacheln) steht und nicht gerade einen Spieler jagt, schlägt zu: alle 4 s
  1 (Anführer 3). Fällt das Tor, ziehen die Angreifer ab.
- **Ende ohne Sieg:** Tor gefallen, 15 Minuten vorbei oder 90 Sekunden lang niemand an der Stadt.
- Die Stadt selbst bleibt sicher: Monster kommen nicht hinein (`canStand`), drinnen gibt es keinen Schaden
  (`damagePlayer`), Spieler in der Stadt werden nicht gejagt.

### Stärke

- Stufe: Schnitt der Spieler bis 80 Kacheln um die Stadtmitte, begrenzt auf die Stufen der Karte (z. B. Kazehana 1–9,
  Kristallabgrund 75–80).
- Arten: die angriffslustigen Monster der Karte nahe dieser Stufe (sonst die nächstliegenden der Welt).
- Leben und Schaden 90 % gewöhnlicher Monster; je weiterem Spieler (bei jedem Wellenbeginn gezählt): Zahl + 50 %, Leben
  + 15 %, Schaden + 3 %, Leben des Anführers + 60 %; höchstens 36 Angreifer zugleich.

### Belohnung (jedes Gerät für sich, aus dem, was es selbst gesehen hat)

- **Beitrag:** eigener Schaden an den Angreifern (auch durch Diener) im Verhältnis zum Leben aller gesehenen Angreifer
  und der Zahl der Spieler vor dem Tor (× 1,3, weil die Wachen mithelfen); wer nur heilt oder hilft, bekommt bis 0,6
  nach der Zeit vor dem Tor. Faktor 0,25 bis 1,6; ohne Schaden und unter 30 s vor dem Tor nichts.
- **Erfahrung** = 15 gewöhnliche Monster der Stufe × Faktor, **Gold** = (40 · Monstergold + 200 · Stufe) × Faktor;
  ab Stufe 40 **Ätherkern** mit 6 % × Faktor, ab Stufe 75 (und Figur ab 75) **Juwel** mit 2 % × Faktor.
  Beispiel Stufe 80, Faktor 1: rund 107.000 EP und 25.600 Gold.
- Ohne Sieg (Tor gefallen, zu lange): × 0,4. Beim Mitspieler zählt der Sieg nur, wenn er den Anführer selbst gesehen
  hat und der in seinem Bild nicht mehr lebt.
- Dazu wie immer Erfahrung und Beute für jedes Monster, das man selbst trifft. Kills nur durch die Wachen geben nichts.

### Anzeige

- Oben in der Mitte (am Handy unten über der Leiste): „Angriff auf die Stadt · Stadt · Tor“, Welle x von y bzw.
  Anführer, Torfestigkeit oder Leben des Anführers, Zahl der Angreifer, eigener Anteil am Schaden.
- Ergebnisfenster mit Stadt, Tor, Stufe, eigenem Schaden, Faktor und Belohnung.

### Technik

- **Mehrspieler:** Der Host (allein man selbst) führt die Angriffe (`angTickHost`) und meldet den Stand an alle Spieler
  auf der Karte: `ags` Zustand (alle 2 s und bei Änderungen), `agl` Anführer, `agw` Welle geschafft, `age` Ende. Nur
  beim Mitspieler und nur vom Host angenommen, alle Felder geprüft (`angClean`; die Stufe wird auf die Stufen der Karte
  begrenzt). Das Tor kommt nie aus der Nachricht, sondern aus der eigenen Rechnung.
- **Ältere Hosts:** Kommt 40 s nach dem Beginn nichts, steht bei Spielern an der Stadt im System-Chat ein Hinweis.
- **Zum Testen:** `ANGRIFF.testShift` verschiebt die Uhr (ms), z. B. so, dass der nächste Angriff in wenigen Sekunden
  beginnt: `ANGRIFF.testShift = angStartOf(angIndexAt(Date.now()) + 1) - Date.now() - 5000`.

---

## Prüfung

- `node --check` für `js/risslauf.js` und `js/stadtangriff.js`.
- Playwright (Chromium, 2D und 3D, ohne `pageerror`): Riss allein vom Start bis zum Ende (Räume, Rissenergie, Rissherr,
  Belohnung, Schlüsselstufe 5 → 7), Verlassen über den Steinkreis (Abzug), Fenster der Rissmeisterin, Charakterseite,
  Bestenliste mit fremdem Eintrag (Name mit `<i>` wird als Text gezeigt, ungültiger Bestwert verworfen).
- Netz nachgestellt (ohne echte Verbindung): Host nimmt Anfrage eines Mitspielers an (Regeln gesäubert), lehnt einen
  nicht eingeladenen Beitritt ab, ignoriert ein gefälschtes Ende und Anfragen Unbekannter, zählt den Tod des Mitspielers
  selbst, schickt Zustand, Rissherr und Ende. Mitspieler: falsche Stufe vom Host abgelehnt, Nachrichten von Nicht-Hosts
  ignoriert, Ende ohne Rissherrn ohne Belohnung, Ende mit Rissherr mit Belohnung (Zeit an der eigenen Uhr geprüft).
- Stadt-Angriff allein auf dem Kristallabgrund: Ansage, vier Wellen, Anführer, Sieg, Belohnung, Wachen danach weg; Wachen
  kämpfen beim Host auch ohne eigene Figur am Tor; Ende, wenn niemand mehr an der Stadt ist; Mitspieler mit gefälschter
  Meldung (ignoriert) und Siegmeldung ohne gesehenen Anführer (nur × 0,4).
- Übersetzung (Englisch): Fenster, Anzeige, Chat- und Bannerzeilen mit den Einträgen aus `neue-texte-riss.json`.
