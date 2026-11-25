# Turm der Verdammten

Gruppen-Instanz ab Stufe 80 auf der Karte Seelenhain (Karte 17). Code: `js/turm.js` (Hallen, Ebenen, Bosse, Beute),
`js/kharzul.js` (der Wächter), `js/tribuene.js` (Ränge und Zuschauer), `js/turmfinale.js` (Anweg, Truhe des Wächters,
Turm-Schmied, Rückkehr; seit Phase 2). Alles hängt sich wie die Prüfungsarena über bestehende Funktionen ein.
Prüfskript im Arbeitsordner: `karten/turm.js`.

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
- **Anweg (Phase 2):** Wer einen Durchgang beginnt oder beitritt, reitet zuerst durch eine düstere Glutschlucht zum
  Turm: ein gepflasterter Weg zwischen Lavarinnen, Feuerbecken, Schädelpfählen mit Ketten (`turmpfahl`), Säulen,
  Knochen und toten Bäumen; links und rechts steigen Felswände an, am Ende steht der Turm (dasselbe Bauwerk wie auf
  Karte 17) mit zwei Feuerbecken am Tor. Rund 7 Sekunden (5,6 s Ritt, 1,3 s vor dem Tor), Balken oben und unten,
  Titel „Turm der Verdammten“ und „Der Weg zum Turm der Verdammten“ (auf der Glutschwinge „Auf der Glutschwinge zum
  Turm der Verdammten“). Man sitzt auf dem eigenen Pferd, auf der Glutschwinge fliegt man; wer kein Reittier hat,
  bekommt für die Strecke ein Ross geliehen (wird nicht gespeichert). „Überspringen ›“ (Knopf, Esc oder Leertaste)
  bringt sofort in die Halle. Danach sitzt man wieder so auf wie vorher. Wer nach dem Neuladen im Feld des Anwegs
  stünde, steht vor dem Turm. Rein örtlich; im Wächter-Modus (Dauerbetrieb ohne Bild) gibt es keinen Anweg.
- **Musik (seit 15.73):** Auf dem Anweg und in der Halle bis zur ersten Welle spielt die „Klage des Turms“ (traurige
  Solo-Violine, eigene Komposition, `snd/musik/turmklage.mp3`), in den Wellen die Turmmusik, beim Wächter seine eigene,
  nach dem Sieg wieder die Klage. Siehe docs/musik-prompts.md.

## Ablauf

Fünfzehn Ebenen (bis Phase 2 elf), alle in derselben achteckigen Halle mit vier Toren (Nord, Ost, Süd, West).
Zwischen zwei Ebenen liegen 5 Sekunden Pause, vor Ebene 1 sind es 6. Alle Gegner haben Stufe 80.
Wunsch dazu: „Ein Spieler hat den ganzen Turm allein in 10 Minuten geschafft – viel zu leicht.“

## Halle und Zuschauer (Umbau „Turm und Arena mit Zuschauern“)

- **Größer:** 46 × 34 Kacheln statt 38 × 30 (`TURM.hw` 23, `TURM.hh` 17; Fläche × 1,37). Alles in der Halle hängt an
  diesen Maßen und ist mitgewachsen: Säulen, Feuerbecken, Lavabecken, Seelensteine (Ring bei halbem Abstand), Eingang,
  Tore und Erscheinungsorte vor den Toren. Die Zwillingshüter stehen 6 statt 5 Kacheln neben der Mitte.
- **Kharzul:** Die Arme des Totentanzes reichen 780 statt 640 (`kharzul.js`), also wie vorher bis kurz vor die Ecken.
  Höllenfeuerwelle, Seelenbann (Umkreis 150) und Höllensprung sind unverändert; in der größeren Halle ist etwas mehr
  Platz zum Ausweichen und Auseinanderlaufen.
- **Gestaltung:** rissiger Basalt mit Aschefeldern, Glutspalten von den Wänden her (nur Schmuck, nicht in der Mitte,
  keine Falle), schwere Basaltsäulen mit Glutrissen, Eisenbändern und Kettenresten (`turmsaeule`), Knochenhaufen an den
  Wänden (`turmknochen`, sperren nichts), Feuerbecken, Banner, die vier Lavabecken in den Ecken. Keine Bodenringe,
  Runen oder Sterne (die frühere Plattenscheibe mit Aschering in der Mitte ist weg).
- **Ränge:** Rund um die Halle sieben Reihen voller Ungeheuer, seit Phase 2 wie die Familien des Spiels: Orks mit
  Hauern, spitzen Ohren und Schulterpanzer, Skelette mit Rippen und glühenden Augenhöhlen, Dämonen mit Hörnern,
  Flügeln und Schwanz, Kuttenschatten mit Kapuze und leuchtenden Augen, Bestien mit Schnauze, Ohren und Mähne (vorher
  Gehörnte, Kapuzenschatten und Knochenwichte aus Klötzchen). Oben eine Mauer mit Zinnen, Dornen und Feuerbecken, an den
  Toren Torhäuser. Die Zuschauer wippen und reißen die
  Arme hoch; sie toben, wenn eine Ebene geschafft ist (nach einem Hüter länger), ein Stein oder Tor fällt, ein Hüter
  erscheint, nach dem Sieg – und wenn alle fallen. Rein örtlich, nichts geht übers Netz (`js/tribuene.js`).
- **Dahinter:** Halle und Ränge stehen im Glutschlund: verbrannter Grund mit Lavaadern und Felsnadeln, ringsum steigen
  Felswände an.
  Der schwarze Kasten um die Halle ist in 3D aus; auch herausgezoomt und gedreht sieht man kein Ende der Karte.
- **Leistung:** In 3D ein Mesh für Ränge und Mauer, eins für Glut und zwei InstancedMesh für alle Zuschauer (nahe
  Stufe rund 270 Dreiecke, ferne rund 75; alle Spielarten stecken im selben Modell, der Shader färbt sie und lässt die
  Teile der anderen Arten wegfallen). In die Listen kommen nur Zuschauer im Blickfeld (neu verteilt, wenn die Kamera
  ein Stück weiter ist), die nächsten 120 (PC, Grafik „Hoch“; „Mittel“ 90, „Niedrig“ 40, am Handy 60 %, unter Last
  65 % bzw. 35 %) in die nahe Stufe. Bewegung im Shader, keine Schatten, kein `discard` (verdeckt ein Zuschauer die
  Figur, fällt er im Vertex-Shader weg). In 2D sind Ränge und Hintergrund in die Bodenblöcke gemalt, die Zuschauer
  kommen aus einem Bildbogen. Grafik „Mittel“ 75 %, „Niedrig“ 40 % der Zuschauer, am Handy davon 70 %.
- **Kamera am Rand (Phase 2):** Bis dahin sanken Ränge, Zuschauer und Kulisse im Streifen zwischen Figur und Kamera ab
  (wie Felswände in Dungeons). Am Rand wurden die Ränge neben der Figur halb flachgedrückt und schräg verzogen – es
  sah aus, als kippe die Kamera und zoome wie eine Lupe heran. Jetzt bleibt alles fest stehen; was die Figur verdeckt,
  wird durchsichtig gerastert (Ränge) bzw. fällt weg (Zuschauer). Im Schulterblick weicht die Kamera den Rängen nicht
  mehr aus (sie kippte an der Bande bis 69° und rückte auf 3,5 Kacheln heran); stattdessen ist alles der Ränge, was
  näher an der Kamera liegt als die Figur, weggeschnitten.

| Ebene | Name | Ziel (allein) |
|---|---|---|
| 1 | Ansturm | 14 Verdammte (Krieger, Schützen), Stärke 85 % |
| 2 | Ansturm | 16 Verdammte mit Hexern, Stärke 90 % |
| 3 | Ansturm | 18 Verdammte, darunter 2 Schlächter, Stärke 95 % |
| 4 | Der Hüter | Ossarn, der Kettenhüter (Stampfer, Kreuz, Sturmangriff, Dornen) |
| 5 | Ansturm | 20 Verdammte, 3 Schlächter und ein Hauptmann, Stärke 100 % |
| 6 | Seelensteine | vier Seelensteine zerstören; jeder ruft bei 75 %, 50 % und 25 % eine kleine Welle |
| 7 | Schlächtersturm | 18 Verdammte, davon 7 Schlächter, Stärke 105 % |
| 8 | Zwillingshüter | Ilmra, Hüterin der Glut, und Varn, Hüter der Asche, zugleich |
| 9 | Trugsteine | acht gleiche Steine, zwei sind echt; ein falscher ruft eine Strafwelle; beide echten = geschafft |
| 10 | Belagerung | 45 s standhalten: alle 1,05 s kommt ein Verdammter (15 % Schlächter), danach den Rest besiegen |
| 11 | Schlüsseljagd | Glutwichte strömen herein und lassen Schlüssel fallen; alle vier Tore öffnen |
| 12 | Die Hauptleute | 22 Verdammte, 5 Schlächter und 3 Hauptleute, Stärke 112 % |
| 13 | Die drei Hüter | Ossarn, Ilmra und Varn zugleich (je 60 % ihres Lebens) |
| 14 | Letzte Belagerung | 60 s standhalten: alle 1,3 s ein Verdammter (15 % Schlächter, 3 % Hauptleute), Stärke 110 % |
| 15 | Der Wächter | Kharzul, Wächter der Verdammten: Totentanz (75 %), wahre Gestalt (50 %), Seelenbann (ab 25 %) |

Bis Phase 2 waren es elf Ebenen: Wellen mit 6, 7, 8, 10 und 12 Verdammten (Stärke 80 % bis 112 %), dann Hüter,
Seelensteine, Zwillinge, Trugsteine, Schlüsseljagd und Kharzul. Wellen gelten für einen Spieler; die Zahl wächst je
weiterem Spieler um 40 %, Schlächter je weiteren vier Spielern um ihre Zahl, Hauptleute ebenso (siehe Werte). Höchstens
14 + 4 je Spieler Verdammte leben zugleich (vorher 14 + 3), der Rest rückt nach. In den Belagerungen kommen sie je
weiterem Spieler 35 % dichter (Abstand 1,05 s bzw. 1,3 s ÷ (1 + 0,35 × weitere Spieler)).

- **Verdammte:** Krieger, Schütze, ab Ebene 2 Hexer, ab Ebene 3 Schlächter, ab Ebene 5 Hauptleute. Sie kommen aus
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

## Nach dem Sieg (Phase 2, `js/turmfinale.js`)

- **Truhe des Wächters:** Fällt Kharzul, liegt seine Beute nicht mehr sofort in der Tasche: In der Mitte der Halle fällt
  mit einer Lichtsäule eine Truhe herab (schwarzes Eisenholz mit Glutnähten, Hörnern an den Ecken, Schädelbeschlag).
  Antippen bzw. „Öffnen“: Der Deckel klappt auf, goldenes Licht, Funkenfontäne, die Zuschauer toben, die Beute kommt
  (siehe Beute). Jeder öffnet seine eigene Truhe (je Sperre einmal); wer die Beute dieser Sperre schon hat, findet sie
  leer. Wer nicht öffnet, bekommt die Beute beim Hinausgehen trotzdem.
- **Turm-Schmied:** 1,6 s nach dem Sieg steigt Ghorvan, der Turm-Schmied, aus einer Feuersäule (2,6 s): ein
  hünenhafter Schmiede-Dämon mit Lederschurz, Glutrissen in der dunklen Haut, gebogenen Hörnern, Schulterpanzern mit
  Dornen, glühenden Augen und einem Bart aus Glut; vor ihm ein Amboss aus schwarzem Stein mit glühendem Barren, daneben
  eine Esse. Er schlägt alle 2,6 s mit dem Hammer auf den Amboss (Funken, Klang aus der Nähe). In 3D und 2D.
  - Einmal je Durchgang und Spieler wertet er ein Teil (angelegt oder aus der Tasche) um **+1** auf.
  - Erfolgschance = Chance des Schmieds für diese Stufe **+ 20 Prozentpunkte**, höchstens 100 % (`TF.bonus`).
  - Kosten wie beim Schmied (Gold, Seelensplitter, Schmiede-Teile, ab hohen Stufen Ätherkerne), **keine
    Segensschriftrolle**. **Nichts zerbricht:** Misslingt es, bleibt das Teil, wie es ist; nur die Kosten sind weg.
  - Das Fenster zeigt beide Chancen („Erfolgschance 70 % (beim Schmied 50 %)“), danach das Ergebnis; Schmiede-Szene
    wie beim Schmied, dazu drei schnelle Hammerschläge.
- **Rückkehr mit Countdown:** Nach dem Sieg bleibt die Halle 150 Sekunden offen (`TURM.wonStay`, vorher 90). Oben in der
  Mitte steht „Der Turm bringt euch hinaus in 2:30“ mit Balken; in den letzten 10 Sekunden rot und pulsierend, dazu ein
  Hinweis. Dann bringt der Turm alle vor sein Tor (wie „Turm verlassen“, mit Übersicht). Truhe und Schmied
  verschwinden.

## Werte

Grundwerte gelten für einen Spieler. Je weiterem Spieler im Durchgang (gezählt beim Beginn der Ebene):

| Was | je weiterem Spieler | zu fünft | zu zehnt |
|---|---|---|---|
| Zahl der Gegner (Wellen) | +40 % | × 2,6 | × 4,6 |
| Schlächter und Hauptleute einer Welle | Schlächter + ¼ je Spieler, Hauptleute je 4 Spieler + 1 Satz | | |
| Leben der Verdammten | +12 % | × 1,48 | × 2,08 |
| Schaden der Verdammten | +4 % | × 1,16 | × 1,36 |
| Leben der Hüter und des Wächters | +90 % (vorher +85 %) | × 4,6 | × 9,1 |
| Schaden der Hüter und des Wächters | +6 % (vorher +5 %) | × 1,24 | × 1,54 |
| Leben der Seelensteine | +50 % | × 3 | × 5,5 |
| gleichzeitig lebende Verdammte | 14 + 4 je Spieler | 34 | 54 |
| Nachrücker in den Belagerungen | Abstand ÷ (1 + 0,35 je weiterem Spieler) | × 2,4 | × 4,15 |

| Gegner | Leben (Faktor) | Angriff (Faktor) | Leben allein | Angriff allein |
|---|---|---|---|---|
| Verdammter Krieger | 1,5 | 1,25 | 56.378 | 1.775 |
| Verdammter Schütze | 1,0 | 1,3 | 37.585 | 1.846 |
| Verdammter Hexer | 1,0 | 1,45 | 37.585 | 2.059 |
| Verdammter Schlächter | 2,6 | 1,45 | 97.721 | 2.059 |
| Verdammter Hauptmann | 4,5 | 1,6 | 169.133 | 2.272 |
| Glutwicht | 0,22 | 0,2 | 8.269 | 284 |
| Ossarn, der Kettenhüter | 34 (vorher 14) | 2,8 (vorher 2,0) | 1.277.896 | 3.976 |
| Ilmra, Hüterin der Glut | 22 (vorher 9) | 2,5 (vorher 1,8) | 826.874 | 3.550 |
| Varn, Hüter der Asche | 26 (vorher 11) | 2,6 (vorher 1,9) | 977.214 | 3.692 |
| Kharzul, Wächter der Verdammten | 80 (vorher 30) | 3,2 (vorher 2,4) | 3.006.813 | 4.544 |
| Seelenstein (Ebene 6) | halber Stein der Stufe 80 | – | 225.511 | – |
| Trugstein (Ebene 9) | 30 % eines Steins | – | 135.307 | – |

Die Werte der Verdammten gelten vor der Stärke der Ebene (85 % in Ebene 1 bis 115 % in Ebene 15, Helfer des Wächters). In Ebene 13
hat jeder der drei Hüter 60 % seines Lebens. Ein Hüter hat damit allein rund 23- bis 34-mal so viel Leben wie ein
Verdammter Krieger und schlägt 2- bis 2,6-mal so hart zu; Kharzul hat allein rund 3 Mio. Leben (zu fünft 13,8 Mio.,
zu zehnt 27,4 Mio.) und 4.544 Angriff (zu fünft 5.635, zu zehnt 6.998); seine Fertigkeiten treffen mit einem Vielfachen
davon (kharzul.js).

| Ebene | allein | zu fünft | zu zehnt |
|---|---|---|---|
| 1 | 14 Gegner | 36 | 64 |
| 2 | 16 | 42 | 74 |
| 3 | 18 (2 Schlächter) | 47 (4) | 83 (7) |
| 4 | Ossarn 1,28 Mio. | 5,88 Mio. | 11,6 Mio. |
| 5 | 20 (3 Schlächter, 1 Hauptmann) | 52 (6, 2) | 92 (10, 3) |
| 7 | 18 (7 Schlächter) | 47 (14) | 83 (23) |
| 8 | Ilmra 0,83 Mio., Varn 0,98 Mio. | 3,80 / 4,50 Mio. | 7,52 / 8,89 Mio. |
| 10 | rund 43 Nachrücker in 45 s | rund 103 | rund 178 |
| 11 | 12 Glutwichte zugleich | 16 | 20 |
| 12 | 22 (5 Schlächter, 3 Hauptleute) | 57 (10, 6) | 101 (16, 9) |
| 13 | 0,77 / 0,50 / 0,59 Mio. | 3,53 / 2,28 / 2,70 Mio. | 6,98 / 4,51 / 5,34 Mio. |
| 14 | rund 47 Nachrücker in 60 s | rund 111 | rund 192 |
| 15 | Kharzul 3,01 Mio. | 13,8 Mio. | 27,4 Mio. |

## Beute

- Je geschaffter Ebene 900 Gold × Ebene (bei 15 Ebenen zusammen 108.000) und 15.000 EP × Ebene (zusammen 1,8 Mio.);
  bis Phase 2 1.200 Gold und 20.000 EP × Ebene bei elf Ebenen (79.200 Gold, 1,32 Mio. EP).
- Gewöhnliche Gegner: Erfahrung und etwas Gold, geteilt durch den Faktor der Gegnerzahl. Glutwichte geben kein Gold.
- Echte Seelensteine (vier in Ebene 6, zwei in Ebene 9): die gewohnte Beute eines Steins der Stufe 80.
- Hüter (Ebene 4, 8 und 13), je Sperre und Hüter einmal: 3 % ein legendäres Teil, sonst 12 % ein episches (Lv 70,
  zu 35 % Lv 80) – höchstens ein Ausrüstungsteil (seit 15.74) –, 3–5 Seelensplitter, 2–3 Schmiede-Teile, Gold.
- Wächter, je Sperre einmal, seit Phase 2 in der **Truhe des Wächters**: seit 15.74 genau **ein Ausrüstungsteil** –
  zu 35 % ein legendäres (Lv 80), sonst ein episches (Lv 80, zur Hälfte eine Waffe) –, 14–20 Seelensplitter,
  5–7 Schmiede-Teile, 2–3 Ätherkerne, zur Hälfte ein Seelenstein (Gegenstand), Gold (Stufe × 1.000, wie Monstergold
  gerundet). Phase 2 bis 15.73: 3 epische und dazu ein legendäres oder viertes episches. Bis Phase 2: 2 epische,
  20 % legendär, 10–15 Splitter, 4–6 Teile, 1–2 Ätherkerne, 30 % Seelenstein.
- Dazu einmal je Durchgang der Turm-Schmied (+1 mit 20 Prozentpunkten mehr Chance, nichts zerbricht).
- Legendäre Teile aus dem Turm gehören zu 70 % zum Klassen-Set (`KS.quellen` in `js/klassensets.js`). Ein eigenes
  Set hat der Turm nicht.
- Jeder, der in der Halle steht, bekommt seine eigene Beute.

## Technik

- **Flächen:** Fuß des Turms auf Karte 17 (Kacheln x 92–100, y 535–545). Hallen im Fels östlich der Karten unter den
  Hallen der Turnierarena: seit dem Umbau vier Felder zu 150 × 120 Kacheln (x ab `WORLD_W + 14` im Abstand 150, y ab
  `DUNGEON_H + 310`), die Halle in der Mitte, drumherum Ränge und Abgrund – so sieht man keine Nachbarhalle. Bis dahin
  45 × 37 Kacheln ab `DUNGEON_H + 262` mit 4 Kacheln Abstand. Wer noch in einer alten Halle gespeichert war, steht nach
  dem Laden vor dem Turm. Sonst bleibt die Welt Kachel für Kachel gleich.
- **Lage der Hallen (`TURM.lage` = 3):** Anfragen `vtn`/`vtj` und die Zuteilung `vtg` tragen die Lage (`tl`). Ein Host
  mit neuer Lage lehnt Geräte mit alter Lage ab („Der Turm wurde umgebaut – bitte das Spiel neu laden“), ein Gerät mit
  neuer Lage geht nicht in die Halle eines alten Hosts. Sonst stünde man in verschiedenen Hallen bzw. spielte andere
  Ebenen (2: Umbau der Hallen in 15.51, 3: fünfzehn Ebenen in Phase 2).
- **Anweg:** eigenes Feld rechts neben den vier Hallen (x ab `WORLD_W + 14 + 4 × 150`, y ab `DUNGEON_H + 310`,
  150 × 120 Kacheln): Weg (5 Kacheln breit, 44 lang) und Platz vor dem Turm aus Pflaster und Basalt, alles andere Fels;
  in 3D eine eigene Gegend (Schlüssel `dw`, ohne schwarzen Kasten) mit Glutschlucht und Felswänden (über `tileSample`,
  nie unter −0,08), in 2D in die Bodenblöcke gemalt. Gesteuert nur auf dem eigenen Gerät (`run.anweg`); der Host zählt
  die Pause vor Ebene 1 erst, wenn jemand in der Halle steht. Während des Anwegs speichert das Spiel ohne das geliehene
  Ross.
- **Truhe und Schmied** sind örtliche Figuren (`game.world.npcs`, `turmtruhe`, `turmschmied`) in der Halle des eigenen
  Durchgangs; sie erscheinen beim Ereignis „Sieg“ (`vte` `win`) und verschwinden beim Verlassen. Die Beute der Truhe
  ist die bisherige Wächter-Beute (`run.truhe`, gesetzt in `turmBossLoot`); wer die Halle ohne Öffnen verlässt, bekommt
  sie in `turmStop`. Der Schmied merkt sich seinen Schlag in `run.schmied` (einmal je Durchgang).
- **Abrutschen:** Wer im Fels des eigenen Felds landet (Sprung oder Teleport über die Wand), steht sofort am Eingang.
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
