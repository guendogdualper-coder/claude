# Turm der Verdammten

Gruppen-Instanz ab Stufe 80 auf der Karte Seelenhain (Karte 17). Code: `js/turm.js` (eine Datei, hängt sich wie die
Prüfungsarena über bestehende Funktionen ein). Prüfskript im Arbeitsordner: `karten/turm.js`.

## Zugang

- Der Turm steht westlich des Lagers Seelenwacht direkt am Weg (22 Kacheln westlich und 8 nördlich der Lagermitte).
  Monster und Seelensteine halten 7 Kacheln Abstand.
- Das Tor öffnet ein Fenster: Beschreibung, Bedingungen, Sperre, laufende Durchgänge im Kanal
  („Lauf von X · 3/10 · Ebene 4 · offen für alle“) und die Knöpfe „Neuen Durchgang beginnen“ und „Beitreten“.
- Beim Beginnen wählt man „Nur meine Gruppe“ oder „Offen für alle (bis 10)“.
- Bedingungen: Stufe 80. Sperre 60 Minuten ab dem Betreten, nur für den Turm (`p.instLock.turm`, gilt wie bei den
  Instanzen für alle Figuren auf dem Gerät). Solange der Wächter nicht gefallen ist, darf man wieder hinein.
- Höchstens 10 Spieler je Durchgang, auch allein. Beitreten geht, bis der Kampf gegen den Wächter begonnen hat.
- Licht und Schatten spielen zusammen. Die Hallen liegen außerhalb aller Karten, dort gibt es keinen offenen Kampf.
- Vier Hallen, also bis zu vier Durchgänge gleichzeitig je Kanal.

## Ablauf

Alle Ebenen spielen in derselben achteckigen Halle mit vier Toren (Nord, Ost, Süd, West). Zwischen zwei Ebenen liegen
5 Sekunden Pause, vor Ebene 1 sind es 6. Alle Gegner haben Stufe 80.

| Ebene | Name | Ziel |
|---|---|---|
| 1–5 | Ansturm | eine Welle Verdammter töten: allein 6, 7, 8, 10 und 12 Gegner, Stärke 80 % bis 112 % |
| 6 | Der Hüter | Ossarn, der Kettenhüter (Stampfer, Kreuz, Sturmangriff, Dornen) |
| 7 | Seelensteine | vier Seelensteine zerstören; jeder ruft bei 75 %, 50 % und 25 % eine kleine Welle |
| 8 | Zwillingshüter | Ilmra, Hüterin der Glut, und Varn, Hüter der Asche, zugleich |
| 9 | Trugsteine | acht gleiche Steine, zwei sind echt; ein falscher ruft eine Strafwelle; beide echten = geschafft |
| 10 | Schlüsseljagd | Glutwichte strömen herein und lassen Schlüssel fallen; alle vier Tore öffnen |
| 11 | Der Wächter | Kharzul, Wächter der Verdammten: Totentanz (75 %), wahre Gestalt (50 %), Seelenbann (ab 25 %) |

- **Verdammte:** Krieger, Schütze, ab Ebene 2 Hexer, ab Ebene 3 Schlächter, in Ebene 5 ein Hauptmann. Sie kommen aus
  den Toren.
- **Schlüsseljagd:** allein 12 Glutwichte gleichzeitig, je weiterem Spieler 0,9 mehr (zu zehnt 20). Ein Wicht hat
  22 % des Lebens und 20 % des Angriffs eines gewöhnlichen Monsters. Ein Schlüssel fällt frühestens nach 15 und
  spätestens nach 25 Tötungen, dazwischen mit steigender Chance; je weiterem Spieler 10 % mehr Tötungen. Schlüssel
  gehören dem Durchgang. Wer mit einem Schlüssel an ein verschlossenes Tor tritt oder es antippt, öffnet es. Sind alle
  vier Tore offen, verschwinden die Wichte.
- **Kharzul (seit 15.50, `js/kharzul.js`):** Die alten Seelenketten (bei 75/50/25 % unverwundbar, Kettensteine in den
  Toren) sind aus. Jede Schwelle hat jetzt eine eigene Mechanik, alles mit Warnflächen angekündigt:
  - **Erste Gestalt (100–50 %):** seine bisherigen Angriffe (Kegel, Glutregen, Sog, Kreuz, Sprung, Dornen,
    Kettenblitz), in gemischter Reihenfolge.
  - **75 % – Totentanz:** Er springt in die Mitte und rammt die Hellebarde in den Boden. Vier Arme aus Seelenfeuer
    liegen 2,4 s als Warnfläche, dann kreisen sie 9 s lang durch die Halle (0,42 rad/s, Richtung zufällig). Wer in
    einem Arm steht, nimmt alle 0,6 s Schaden (1,1 × Angriff). In den Lücken mitlaufen; Kharzul bleibt angreifbar.
  - **50 % – Entfesselte Gestalt:** 2,6 s Verwandlung (Druckwelle im Umkreis 330, wirft weg). Danach ist er 30 %
    größer, schwarz-rot mit Höllenfeuer statt Seelenfeuer (3D und 2D), läuft mit 178 statt 126, schlägt alle 1,05 s
    statt 1,7 s zu, sein Angriffstakt ist etwa doppelt so schnell und er macht 20 % mehr Schaden. Er hat nur noch vier
    neue Angriffe, kürzer angekündigt (1,0–1,1 s): **Seelenschnitt** (Bogenhieb vorn, 0,55 s später hinten),
    **Höllensprung** (drei Sprünge im Abstand von 0,7 s), **Kettensturm** (Ketten auf bis zu drei Spieler, wer
    getroffen wird, wird herangerissen und kurz festgehalten), **Höllenfeuerwelle** (vier Bänder nach außen, 0,45 s
    Abstand).
  - **25 % – Seelenbann:** Alle Spieler bekommen ein Brandmal (grüne Fläche, folgt dem Spieler). Nach 5 s explodiert
    jedes und trifft alle anderen Spieler im Umkreis 150 (2,8 × Angriff je Brandmal) – auseinanderlaufen. Allein
    harmlos. Danach kommt er immer wieder dran.
  - Alle 20 Sekunden ruft er einige Glutwichte (3, je zwei weitere Spieler einer mehr).
- **Tod:** kein Verlust. Nach 8 Sekunden steht man am Eingang der Halle mit 60 % Leben wieder auf. Sind alle zugleich
  tot oder ist niemand mehr da, beginnt die Ebene von vorn. Nach 3 Minuten ohne Spieler endet der Durchgang.
- **Verlassen:** über „Turm verlassen“ in der Anzeige; danach erscheint die Übersicht (Zeit, Ebenen, Gold, Beute).
  Nach dem Sieg bleibt die Halle noch 90 Sekunden offen.

## Werte

Grundwerte gelten für einen Spieler. Je weiterem Spieler im Durchgang (gezählt beim Beginn der Ebene):

| Was | je weiterem Spieler | zu zehnt |
|---|---|---|
| Zahl der Gegner | +40 % | × 4,6 |
| Leben der Gegner | +12 % | × 2,08 |
| Schaden der Gegner | +4 % | × 1,36 |
| Leben der Hüter und des Wächters | +85 % | × 8,65 |
| Schaden der Hüter und des Wächters | +5 % | × 1,45 |
| Leben der Seelensteine | +50 % | × 5,5 |
| Leben der Kettensteine (nur noch für ältere Hosts) | +45 % | × 5,05 |

| Gegner | Leben (Faktor) | Angriff (Faktor) | Leben allein |
|---|---|---|---|
| Verdammter Krieger | 1,5 | 1,25 | rund 56.400 |
| Verdammter Schütze | 1,0 | 1,3 | rund 37.600 |
| Verdammter Hexer | 1,0 | 1,45 | rund 37.600 |
| Verdammter Schlächter | 2,6 | 1,45 | rund 97.700 |
| Verdammter Hauptmann | 4,5 | 1,6 | rund 169.000 |
| Glutwicht | 0,22 | 0,2 | 8.269 |
| Ossarn, der Kettenhüter | 14 | 2,0 | 526.192 |
| Ilmra, Hüterin der Glut | 9 | 1,8 | 338.266 |
| Varn, Hüter der Asche | 11 | 1,9 | rund 413.400 |
| Kharzul, Wächter der Verdammten | 30 | 2,4 | 1.127.555 |
| Seelenstein (Ebene 7) | halber Stein der Stufe 80 | – | 225.511 |
| Trugstein (Ebene 9) | 30 % eines Steins | – | 135.307 |
| Kettenstein | 0,9 | – | 33.827 |

Die Werte der Verdammten gelten vor der Stärke der Ebene (Ebene 1: 80 %, Ebene 5 und später: 112 %).

## Beute

- Je geschaffter Ebene 1.200 Gold × Ebene (zusammen 79.200) und 20.000 EP × Ebene.
- Gewöhnliche Gegner: Erfahrung und etwas Gold, geteilt durch den Faktor der Gegnerzahl. Glutwichte geben kein Gold.
- Echte Seelensteine (vier in Ebene 7, zwei in Ebene 9): die gewohnte Beute eines Steins der Stufe 80.
- Hüter (Ebene 6 und 8), je Sperre einmal: 12 % ein episches Teil (Lv 70, zu 35 % Lv 80), 3 % ein legendäres,
  3–5 Seelensplitter, 2–3 Schmiede-Teile, Gold.
- Wächter, je Sperre einmal: 2 epische Teile (Lv 80), zu 20 % ein legendäres (Lv 80), 10–15 Seelensplitter,
  4–6 Schmiede-Teile, 1–2 Ätherkerne, zu 30 % ein Seelenstein (Gegenstand), Gold.
- Legendäre Teile aus dem Turm gehören zu 70 % zum Klassen-Set (`KS.quellen` in `js/klassensets.js`). Ein eigenes
  Set hat der Turm nicht.
- Jeder, der in der Halle steht, bekommt seine eigene Beute.

## Technik

- **Flächen:** Fuß des Turms auf Karte 17 (Kacheln x 92–100, y 535–545). Hallen im Fels östlich der Karten unter den
  Hallen der Turnierarena (x ab `WORLD_W + 14`, y ab `DUNGEON_H + 262`, vier Felder zu 45 × 37 Kacheln mit 4 Kacheln
  Abstand). Sonst bleibt die Welt Kachel für Kachel gleich.
- **Seelensteine der Hallen:** je Halle zwölf (acht im Saal, vier vor den Toren). Sie stehen von Anfang an in der Welt
  und liegen außerhalb ihrer Ebene tot da; der Host weckt sie.
- **Mehrspieler:** Die Hallen führt der Host (allein man selbst). Nachrichten über `onSocial`, Kennung `vt` + Buchstabe:

| Nachricht | Richtung | Inhalt |
|---|---|---|
| `vtq` / `vtl` | Spieler → Host / zurück | Liste der Durchgänge |
| `vtn` | Spieler → Host | neuer Durchgang (offen oder nur Gruppe) |
| `vtj` | Spieler → Host | beitreten |
| `vtg` / `vtx` | Host → Spieler | Halle zugeteilt / abgelehnt mit Grund |
| `vtv` | Spieler → Host | verlassen |
| `vtk` | Spieler → Host | Schlüssel an Tor benutzen |
| `vts` | Host → Teilnehmer | Zustand: Ebene, Abschnitt, Zähler, Tore, Schlüssel, Ketten, Leben der Bosse |
| `vte` | Host → Teilnehmer | Ereignis: Ebene geschafft, Stein, Schlüssel, Tor, Ketten, Rückschlag, Sieg |
| `vtz` | Host → Teilnehmer | Durchgang beendet |
