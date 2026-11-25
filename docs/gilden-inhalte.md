# Gilden-Inhalte ohne Server (15.83)

Abschnitt 15 aus `docs/endgame-langzeit.md` („Noch offen: Gilden-Inhalte“). **Entscheidung:** alles ohne Server – die
Firebase-Regeln bleiben, wie sie sind. Es zählt, was die gerade eingeloggten Mitglieder beitragen bzw. voneinander
mitbekommen. Code: `js/gilden-inhalte.js` (geladen direkt nach `js/arena-bots.js`), nur Hüllen um vorhandene Funktionen
(keine Änderung an `gemeinschaft.js`, `netz.js` & Co.). Texte für die Übersetzung: `neue-texte-gilden.json`.

Drei Teile:

1. **Gildenstufen** – jedes Mitglied sammelt Gildenbeitrag, die Summe ergibt Stufe 1–10 mit kleinen Boni und Zeichen
   über dem Namen.
2. **Gildenhalle und Gildenboss** – eine Halle je Gilde, einmal in der Woche ruft ein Mitglied dort *Eidwächter Ostrun*.
3. **Grenzschlacht** – zweimal am Abend 30 Minuten Licht gegen Schatten um drei Fahnen, Bots füllen auf.

## 1. Gildenstufen

### Gildenbeitrag

Jedes Mitglied sammelt im eigenen Spielstand (`p.gx.b`, aufgeteilt nach Art in `p.gx.k`). Nur in einer Gilde, nur
Gegner höchstens 10 Stufen unter der eigenen Figur (`GX.gap`).

| Tat | Punkte | zählt bei |
|---|---|---|
| Monster (Elite +1) | 1 | `questEvent('kill')` (ohne Bosse) |
| Seelenstein | 8 | `questEvent('stone')` |
| Dungeon-Boss, Instanz-Wächter | 25 | `bossLoot`, `instLoot` |
| Instanz-Endboss, Endboss der Karte, Turm | 60 | `instFinalLoot`, `raidLoot`, `turmFinalLoot` |
| jede Quest-Abgabe (Haupt-, Neben-, Jagd-, Nachtquest …) | 15 | `giveReward` |
| Tagesauftrag / Wochenauftrag | 10 / 40 | `aufgDone` |
| Weltboss | 120 | `weltbossLoot` |
| Gildenboss (Belohnung der Woche) | 300 | `gbLoot` |
| Grenzschlacht Sieg / Niederlage | 150 / 60 | `gsReward` |

**Grenzen (gegen Schummeln, ohne Server lässt sich nichts beweisen):**

- höchstens **10.000 Punkte je Mitglied und Weltzeit-Tag** (`GX.perDay`; ein sehr fleißiger Spieler schafft etwa 5.000) –
  beim Sammeln (Zähler `p.gx.dk`/`dn`) wie beim Übernehmen fremder Werte: Zuwachs seit dem letzten bekannten Stand
  höchstens 10.000 je vergangenem Tag plus ein Viertel Tag Spielraum; insgesamt nie mehr als 10.000 je Tag seit dem
  23.11.2026 (`GX_START`);
- für die Gildenstufe zählt ein Mitglied **höchstens 130.000** (`GX.share`, ein Viertel von Stufe 10): Stufe 10 braucht
  mindestens vier fleißige Mitglieder, ein Einzelner (auch einer, der schummelt) bringt die Gilde höchstens auf Stufe 6;
- vom Anführer entfernte Mitglieder (`guild.left`, beim Austausch als `x` mitgeschickt, nur vom Anführer angenommen)
  zählen nicht mehr.

### Stufen und Belohnung

Die Stufe rechnet jedes Gerät selbst aus der Summe der Beiträge der **aktuellen Mitglieder** (Mitgliederliste der
Gilde): eigener Beitrag + zuletzt gesehene Werte der anderen.

| Stufe | Beitrag der Gilde | Erfahrung | Gold von Monstern | Zeichen über dem Namen |
|---|---|---|---|---|
| 1 | 0 | – | – | Gildenname (wie bisher) |
| 2 | 3.000 | +1 % | – | – |
| 3 | 10.000 | +1 % | +2 % | **Gildenband**: Band in der Gildenfarbe hinter dem Gildennamen |
| 4 | 25.000 | +2 % | +2 % | – |
| 5 | 50.000 | +2 % | +4 % | **Wappen**: Schild mit Sparren vor dem Band |
| 6 | 90.000 | +3 % | +4 % | – |
| 7 | 150.000 | +3 % | +6 % | – |
| 8 | 240.000 | +4 % | +6 % | **Goldrand** um Band und Wappen |
| 9 | 360.000 | +4 % | +8 % | – |
| 10 | 520.000 | +5 % | +10 % | **Standarte**: Wimpel auf einer Stange über dem Band |

- Erfahrung über eine Hülle um `gainXp` (wirkt auch auf Seelen-Erfahrung), Gold über `playerStats` → `goldFind`
  (wie Gier und Topas). Keine Kampfwerte – im PvP ändert sich nichts.
- Neue Stufe: Banner und Chat-Meldung (`gxAnnounce`, einmal je Stufe; `p.gx.lv`).
- Zeichen: Hülle um `drawLabel` (zeichnen.js) → ein fertiges Bild (`labelBild`, am Spieler gemerkt) unter dem
  Namensschild – in 2D und 3D gleich. Mitspieler zeigen die Stufe, die ihr Gerät meldet (Feld `gx`).
- Anzeige im Fenster Freunde & Gilde (G), Reiter „Gilde“: Stufe mit Balken, Boni, nächste Stufe, aufklappbar
  „Beiträge der Mitglieder“ (Rang, Name, Beitrag, online/zuletzt gesehen), der eigene Beitrag nach Art, darunter
  Gildenboss und Grenzschlacht.

### Austausch ohne Server

- **Spielerzustand** (`netPlayerState`, zehnmal je Sekunde): `gx: [eigener Beitrag, Gildenstufe, Woche des letzten
  Gildenboss-Siegs]`. Ältere Versionen übergehen das Feld.
- **Liste** (`onSocial`, eigene Nachricht `k: 'gxt'`, über den Host weitergereicht): `{ g: Gilde, t: { Name: [Beitrag,
  zuletzt gesehen] }, kw, x? }` – beim ersten Sehen eines Mitglieds in der Sitzung, danach höchstens alle 90 s und nur,
  wenn sich etwas geändert hat. So erfährt man auch die Beiträge von Mitgliedern, die man nie gleichzeitig trifft.
- **Zusammenführen:** jeder Beitrag ist ein Zähler, der nur wächst – der größere Wert gewinnt (glaubhaft begrenzt,
  siehe oben). Alle Geräte kommen so ohne Server zur selben Summe.
- **Angenommen wird nur** von Mitgliedern: Absender aus der Verbindung (`net.players` über die Kennung, nie ein Name
  aus der Nachricht), sein Zustand nennt die eigene Gilde **und** sein echter Name (`realName`) steht in der eigenen
  Mitgliederliste. Einträge nur für Namen aus der Mitgliederliste, Namen 1–16 Zeichen, Zahlen endlich und ≥ 0, höchstens
  40 Einträge; den eigenen Beitrag kennt nur das eigene Gerät (Spielstand/Cloud). Blockierte Spieler (spielerschutz.js)
  werden übergangen. Alles Fremde wird mit `escapeHtml` ausgegeben, Zahlen erzwungen.

Spielstand (`SAVE_FIELDS` bekommt `gx`): `p.gx = { g, b, k, t: { Name: [Beitrag, gesehen, gestiegen] }, x, kw, bw, lv,
dk, dn, ret, ehre, ehreTot, gs: { i, n }, gsN, gsW, bossN }`. Wechselt die Gilde, beginnt der Beitrag neu (er bleibt bei
den anderen Mitgliedern der alten Gilde); `bw` (eigene Gildenboss-Belohnung der Woche) bleibt – kein Gildenhüpfen.

## 2. Gildenhalle und Gildenboss

### Gildenhalle

- Vier Hallen im Fels unter den Arenen (Kacheln x 1532–1848, y 1232–1267, vorher Fels; beim Zusammenführen unter die Felder der Rissläufe verschoben, die y 1012–1212 belegen), 92 Kacheln auseinander – weiter
  als Endboss-Angriffe reichen. Jede Gilde hat ihre Halle über ihren Namen (`gxHash % 4`); teilen sich zwei Gilden im
  Kanal eine Halle, gibt es trotzdem nur einen Boss je Halle, und die Belohnung bekommt die Gilde der Halle.
- Gebaut nach der Welt (Hülle um `generateWorld`, wie die Turnierarena): 37 × 27 Kacheln mit runden Ecken,
  Steinplatten, Läufer vom Tor zur Mitte, runder „Platz des Bundes“, zwei Reihen Säulen, Feuerbecken, Banner in
  Türkis/Gold, Thron der Gilde im Norden, vier Wächterstatuen, im Süden eine Nische mit Tor. Eigenes Gebiet
  „Gildenhalle“ (Name, Licht in 3D, Wände), auf der kleinen Karte als eigenes Gebiet (`mapAreaAt`).
- **Hinein:** Gildenfenster → „Zur Gildenhalle“ (nicht im Kampf, nicht tot, nicht in Turnierarena, Prüfungsarena,
  Duell oder Turm). Der Ort davor wird gemerkt (`p.gx.ret`). **Hinaus:** „Halle verlassen“ (Anzeige in der Halle oder
  Gildenfenster) oder kurz im Tor stehen. Wiederbeleben „in der Stadt“ führt zurück dorthin (`villageSpawn`). Wer nicht
  mehr in der Gilde ist, wird nach drei Sekunden hinausgebracht.
- Anzeige in der Halle (links unter dem Leben): Gilde, Stand des Gildenbosses (Kämpfer, Restzeit bzw. „diese Woche
  besiegt – neu ab Montag“), Knöpfe „Gildenboss rufen“ und „Halle verlassen“.

### Eidwächter Ostrun

Eigener Entwurf: ein uralter Wächter aus hellem Stein und Bronze, der die Eide der Gilden prüft – Topfhelm mit goldenem
Kamm und leuchtend türkisem Sehschlitz, Brustpanzer, Wappenrock in Türkis mit Goldsaum und leuchtendem Stein,
Schulterpanzer, Turmschild mit goldenem Sparren am linken Arm, lange Hellebarde, Umhang.

- **2D:** eigene Zeichnung (`gbArt2d`, Seitenansicht mit Schrittbildern, Größe über `raid.scale` 2,4).
- **3D:** eigenes Modell aus dem Baukasten der Endbosse (`gbBoss3`, bosse3d.js: Zweibeiner-Skelett, Haut-Gewichte,
  Wappenrock und Umhang als Tücher), Animation der Endbosse (Hieb, Stoß, Rundumschlag, Brüllen, Tod), Effekt-Thema
  „wappen“ (Türkis, heller Stein, Speere), ein paar aufsteigende Funken. Weltgröße 8,2.
- **Werte:** Stufe = höchste Stufe in der Halle beim Rufen (10–80), `hpMul` 95, `atkMul` 2,3 (zwischen Dungeon-Boss und
  Endboss). Allein auf Stufe 80 rund 3,6 Mio. Leben – mit dem Schaden der Wege aus `docs/balance-klassen.md` (12.000–27.000
  je Sekunde gegen Bosse) etwa 2½–5 Minuten. **Je weiterem Kämpfer** in der Halle beim Rufen +75 % Leben und +6 %
  Angriff (`GB.hpPer`, `GB.atkPer`): je Spieler bleibt die Arbeit gleich, zusammen geht es schneller. Begleiter, die
  später dazukommen, machen ihn leichter (sie zählen nicht als Kämpfer).
- **Angriffe** (Endboss-Ablauf `type.raid`, alle mit Warnflächen, keine Bodenringe): aus dem Beutel Stampfer, Meteore,
  Linie, Sprung, Sturm und seine eigenen (bossangriffe.js):

| Angriff | Grundform | Wirkung |
|---|---|---|
| Eidhieb | Sense | Bogenhieb nach vorn, kurz danach nach hinten |
| Bannersturm | Bahnen | Speere gehen in Reihen nieder – Bahn wechseln |
| Wappenregen | Muster | Schilde stürzen im Schachbrett herab (bei 30 % als große Fassung) |
| Schwursprung | Hetzjagd | zwei Sprünge auf Spieler (ab 75 % Leben), stößt weg |
| Ruf der Eidwachen | Beschwören | bei 60 %: Eidwachen brechen an markierten Stellen hervor |

- **Helfer:** Eidwachen (belebte Rüstungen, Stufe −3 bis −6). Allein keine regelmäßigen, bei jedem Phasenwechsel
  einer; mit 2–3 Kämpfern alle 20 s einer, ab 4 zwei (Hüllen um `raidMinions`/`raidRoar`, ohne Bodenring).
- **Rückzug:** nach 15 Minuten zieht er sich zurück (mit seinen Helfern, Nachricht `gone` an die Mitspieler) – der Ruf
  ist dann nicht verbraucht.

### Rufen: einmal in der Woche

- Woche = Montag 0 Uhr bis Sonntag nach **Weltzeit** (auf allen Geräten gleich, `gxWoche`).
- Rufen kann jedes Mitglied in der eigenen Halle, wenn die Gilde ihn diese Woche noch nicht besiegt hat (`p.gx.kw`,
  über Zustand und Liste an alle Mitglieder weitergegeben) und gerade keiner in der Halle steht.
- Den Boss führt wie jedes Monster der **Host** des Kanals (allein: das eigene Spiel). Ein Mitspieler schickt eine Bitte
  (`k: 'gbr'`); der Host prüft selbst nach (Gilde des Absenders, Halle seiner Gilde, er steht darin, kein Boss da, Stufe
  höchstens die höchste in der Halle) und antwortet (`k: 'gba'`, nur von `host` angenommen, mit Fehlercodes statt Text).
  Ohne Antwort nach 7 s: Hinweis (Host mit älterer Version).
- Gerufen: Banner bei allen Mitgliedern im Kanal (`k: 'gbn'`, nur von Mitgliedern) und eine Zeile in der Auftragsliste
  („Gildenboss · Gildenfenster (G) → Zur Gildenhalle“).

### Belohnung

Für jeden, der mitgekämpft hat (wie bei Endbossen über `rewardKill` → `raidLoot` → `gbLoot`) und zur Gilde der Halle
gehört – **einmal je Woche** (`p.gx.bw`):

- ein Ausrüstungsteil der eigenen Klasse: ab Stufe 75 episch (Stufe 80), zu 15 % legendär (mit Pech-Schutz `gildenboss`);
  ab 60 episch, darunter selten;
- Gold: Stufe × 2.000 (mit Gold-Bonus), Seelensplitter: 20 + 2 × Gildenstufe, ab Stufe 75 zwei Ätherkerne;
- Erfahrung: auf Stufe 80 eine halbe Stufe als Seelen-EP, darunter ein Viertel der eigenen Stufe;
- 300 Gildenbeitrag; zählt für den Wochenauftrag „große Bosse“ (ab Stufe 75).

Ein zweiter Sieg in derselben Woche (z. B. in einem anderen Kanal gerufen) bringt nur die gewöhnliche Kill-Beute.

## 3. Grenzschlacht

- **Termine:** jeden Tag 18:00 und 20:00 Uhr Weltzeit für 30 Minuten (in Deutschland 19 und 21 Uhr, im Sommer 20 und
  22 Uhr; `gsEvent` rechnet nur aus der Uhrzeit). Ab Stufe 50. Ansage 5 Minuten vorher und zu Beginn, Zeile in der
  Auftragsliste ab 15 Minuten vorher (antippen öffnet die Seite „Ereignisse“). Beitreten bis 3 Minuten vor dem Ende.
- **Beitreten:** Charakter (C) → Ereignisse, beim Turniermeister oder im Gildenfenster.
- **Ablauf:** der Bot-Kampf der Turnierarena (`abotStart('f4')`, arena-bots.js) auf der Turmwiese – ganz auf dem
  eigenen Gerät; echte Spieler kommen wie dort nie hinein. Die eigene Seite (Licht oder Schatten) gegen die andere, je
  vier Kämpfer, Bots füllen auf (Klassen gemischt, Stärke wie die eigene Figur). Für die Dauer der Schlacht heißen die
  Teams „Licht“/„Schatten“ (Farben aus den Seiten) und die Art „Grenzschlacht“ (`PVP_TEAM`, `PVP_MODES.f4` werden danach
  zurückgestellt).
- **Fahnen:** Nordfahne (15 Kacheln nördlich der Mitte), Fahnenturm (der Turm in der Mitte, sein Kristall zeigt den
  Stand) und Südfahne, Halbmesser 4 bzw. 5 Kacheln. Steht nur eine Seite an einer Fahne, holt sie sie (allein 10 s von
  neutral auf voll, jeder weitere +25 %); stehen beide da, passiert nichts; steht keiner da, geht sie langsam auf den
  Stand des Besitzers zurück. Die andere Seite muss eine Fahne erst auf neutral und dann zu sich ziehen.
- **Punkte:** jede eigene Fahne einen je Sekunde, jeder Kill zwei. **Sieg** bei 600 Punkten, sonst nach 10 Minuten mehr
  Punkte (bei Gleichstand mehr Fahnen). Gefallene steigen nach 6 s in der Basis wieder ein.
- **Bots:** ohne nahen Gegner (380 px) laufen sie zur nächsten Fahne, die ihrer Seite nicht gehört, sonst verteidigen sie
  eine eigene, an der Gegner stehen (Hülle um `abotIdle`).
- **Anzeige:** eigene Karte (PC) bzw. Pille (Handy) mit Zeit, Punkten beider Seiten und den drei Fahnen (Füllstand in der
  Farbe der erobernden Seite, blinkt umkämpft), am PC oben die Anzeigetafel. Fahnen im Bild: 2D Stange und Tuch in der
  Farbe des Besitzers mit Erobern-Balken, 3D zwei kleine Modelle; ringsum je sechs Grenzsteine (kein Bodenring).
- **Ergebnisfenster:** Sieg/Niederlage, Punkte beider Seiten, Belohnung und die **Rangliste der Schlacht** (alle Spieler
  und Bots: Fahnen, Kills, Tode, Punkte = Kills × 10 + Fahnen × 25).
- **Belohnung** (nur nach einem echten Kampf: mindestens 60 s und selbst Schaden gemacht; höchstens dreimal je Termin):

| | Ehre | Seelensplitter | Gold | Gildenbeitrag |
|---|---|---|---|---|
| Sieg | 30 | 25 | Stufe × 600 | 150 |
| Niederlage / Unentschieden | 12 | 10 | Stufe × 250 | 60 |

- **Ehrentausch** (Seite „Ereignisse“): 20 Ehre → 30 Seelensplitter, 40 → Erfahrungsring, 60 → 2 Ätherkerne (ab 75),
  120 → Juwel Stufe I (ab 75).
- Die Turmschlacht-Zähler (`p.pvp.fn`/`fw`) bleiben unberührt, Rangpunkte gibt es keine.

## 4. Erfolge, Ratgeberin

- Erfolge (Bereich „Gilde“): Bund der Treue (Gildenstufe 5), Banner des Bundes (Gildenstufe 10, Titel „Bannerträger“),
  Eid bestanden (5 Gildenbosse, Titel „Eidhüter“), Grenzwacht (25 gewonnene Grenzschlachten, Titel „Grenzwächter“).
- Ratgeberin: fünf Einträge (Gildenstufen, unterschiedliche Stufe, Gildenboss, Grenzschlacht, Ehre) über
  `RATGEBER_WISSEN.push`.

## 5. Leistung

- Gildenstufe zwischengespeichert (neu nach Änderung oder alle 5 s), Mitgliederliste höchstens alle 2 s neu, Spielstand
  einmal geprüft; der Zustand der Mitspieler (zehnmal je Sekunde) kostet nur einen Vergleich.
- Zeichen über dem Namen: ein Bild je Gilde/Stufe/Titel, am Spieler gemerkt – ein `drawImage` mehr je Spieler.
- Boss: ein Modell (wie alle Endbosse einmal gebaut, LOD über `lodSeg3`); Fahnen in 3D: geteilte Formen, 16 Teile.
- Hallen: nur Kacheln und Requisiten der Welt, nichts läuft, solange niemand darin ist.

## 6. Tests (Playwright, 2D und 3D, Handy-Ansicht)

Gildenstufe aus Beiträgen (3.300 → Stufe 2; drei Mitglieder mit je 130.000 → Stufe 9, vier → Stufe 10), Tagesgrenze
10.000, Grenze seit Start (Beitrag über der Grenze wächst nicht weiter), Übernahme nur von
Mitgliedern (Fremder mit gleichem Gildennamen abgewiesen, unbekannte Namen/zu lange Namen/NaN/Werte aus der Zukunft
übergangen, Zuwachs begrenzt: 5.000 → 50.000 wird 7.500), Entfernte nur vom Anführer, eigener Wert nicht von außen;
Erfahrung +5 %, Gold +10 % auf Stufe 10 (+8 % auf Stufe 9); Zeichen über dem Namen (Stufe 10) in 2D und 3D;
Gildenfenster.
Halle: Bau (961 Bodenkacheln, Gebiet), Hinein/Hinaus, Anzeige, Boss rufen allein (Stufe 80, 3,57 Mio. Leben), Angriffe
mit Warnflächen, 3D-Modell, Host-Bitte (Fremder abgewiesen, Mitglied ruft, kein zweiter Boss), Antwort nur vom Host,
Ansage nur von Mitgliedern, alle fünf Angriffe nacheinander, Eidwache, Sieg über den normalen Tod des Monsters
(`damageMonster` → `raidLoot`), Beute (Teil, 176.000 Gold mit +10 %, 40 Splitter, 2 Kerne, +300), kein Wiederkommen
und kein zweites Mal in der Woche. Grenzschlacht: Termin 18:02 (läuft), Beitritt, Teams Licht/Schatten, sieben Bots, Fahnen werden erobert,
Ende bei 600 Punkten nach rund 4½ Minuten, Rangliste, ohne eigenen Schaden keine Belohnung, Sieg/Niederlage/viertes
Mal ohne Belohnung (Sieg: 30 Ehre, 48.000 Gold, +150), Teams danach zurückgestellt, Ehrentausch, Seite Ereignisse.
Englisch mit `neue-texte-gilden.json` in der Handy-Ansicht (3D): Gildenfenster, Schlacht-Anzeige und Ergebnisfenster
übersetzt. Keine `pageerror` (2D, 3D, Handy). (Unter starker Last
melden `weltboss.js`, `schwierigkeit.js` und `erfolge.js` beim Laden „game is not defined“, wenn `spiel.js` spät kommt –
schon in 15.82 so, nicht aus dieser Datei.)

## 7. Grenzen

- Ohne Server sieht jedes Gerät die Stufe aus dem, was es kennt; wer seine Mitglieder nie (auch nicht über Dritte) trifft,
  sieht eine niedrigere Stufe. Geschönte Werte lassen sich nicht verhindern, nur begrenzen (siehe oben); der Anführer
  kann ein Mitglied entfernen, dann zählt sein Beitrag nicht mehr.
- „Einmal in der Woche“ gilt je Gilde nach dem, was die Geräte wissen – zwei Mitglieder in verschiedenen Kanälen
  können ihn in derselben Woche beide rufen; die Belohnung gibt es trotzdem nur einmal je Charakter.
- Die Grenzschlacht ist (wie „Gegen Bots“) ein Kampf auf dem eigenen Gerät; eine gemeinsame Schlacht echter Spieler
  bräuchte Bots beim Host.
- Die Hallen belegen Kacheln x 1532–1848, y 1232–1267 im Fels; wer dort später etwas baut, muss ausweichen.
