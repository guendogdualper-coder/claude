# Turnierarena gegen Bots

Spielerwunsch: „Ich will, dass man in der PvP-Arena auch gegen Bots spielt, womit man dann auch vielleicht LP bzw.
Punkte kriegen könnte. Weil jetzt halt auf Online-Spieler zu warten, macht nicht so viel Sinn, weil es sind noch nicht
so viele Online-Spieler da.“

Code: `js/arena-bots.js` (nach `js/ereignisse.js` in `index.html`, in der Liste von `sw.js`). Die Turnierarena selbst
steht in `js/turnierarena.js` (Doku `docs/pvp-arena.md`), die gemeinsame PvP-Rechnung in `js/kampf.js`.

## Ablauf

- **Start:** Beim Turniermeister hat jede Art (Rangkampf 1v1, 2v2, 3v3 und Turmschlacht 4v4) neben „Anmelden“ einen
  Knopf **„Gegen Bots“**, der sofort einen Kampf beginnt. Wer sich anmeldet und **20 Sekunden** (`ABOT.wait`) wartet,
  ohne dass der Host genug echte Spieler zusammenbekommt, bekommt automatisch einen Kampf mit Bots als Gegnern und
  Mitspielern; das Fenster zählt die Sekunden herunter. Ohne Server (offline) zeigt das Fenster statt „braucht
  Mitspieler“ die Arten mit „Gegen Bots“.
- **Lokal:** Ein Bot-Kampf läuft ganz auf dem eigenen Gerät – auch ohne Netz. Er sucht sich eine Halle der Art, in der
  kein anderer Spieler steht und in der der Host kein Spiel führt. Man verlässt dafür die Warteschlange
  (Nachricht `pvx`), echte Spieler kommen nie hinein. Schickt der Host während des Countdowns doch noch einen echten
  Kampf, entfällt der Bot-Kampf ohne Wertung; ist der Bot-Kampf schon im Gange, meldet man sich beim Host ab.
- **Wie ein echtes Spiel:** Die eigene Figur bekommt Start, Zwischenstände und Ende als dieselben Nachrichten, die sonst
  der Host schickt (`pvpOnMatch`, `pvpOnUpdate`, `pvpOnEnd`). Countdown, Teamfarben, Anzeige, Ergebnisfenster, Fall,
  Wiedereinstieg in der Turmschlacht und Rückkehr zum Turniermeister laufen über den vorhandenen Code. Die Führung des
  Spiels (Countdown, Ende nach „letztes Team steht“, Zeit, Turm, Kills) macht `abotRun` wie sonst `pvpHostTickMatch`.
- **Verlassen:** Knopf „Verlassen“, aus der Halle laufen oder das Spiel schließen zählt im Rangkampf als Niederlage –
  gegen Bots die halbe. Ein offener Bot-Rangkampf steht als `p.pvp.open` mit `bot: 1` im Spielstand und wird beim
  nächsten Start als halbe Niederlage gerechnet.
- **Pause:** Nach jedem Bot-Kampf dauert es **10 Sekunden** (`ABOT.pause`), bis der nächste beginnen kann.

## Die Bots

- **Aussehen:** wie Spielerfiguren – zufällige Klasse (im Team möglichst verschiedene), zufälliger Weg, Geschlecht,
  Frisur, Haut-, Haar- und Augenfarbe, Bart, Größe; Ausrüstung mit Stufe und Farben wie bei Spielern. Name aus frei
  erfundenen Silben (z. B. „Lysmir“, „Thardrel“) mit „(Bot)“, darüber Stufe, Rang-Stein und Lebensbalken in der
  Teamfarbe – in 2D und 3D.
- **Stufe:** die der eigenen Figur.
- **Werte:** aus einem erzeugten Charakter dieser Stufe über `playerStats` – Statuspunkte in den Hauptwert, der Rest in
  Vitalität, Klassensegen als dauernder Buff, auf Stufe 80 die Seelenstufen wie bei der eigenen Figur.
- **Ausrüstung:** der eigenen nachgebaut, Platz für Platz: gleiche Gegenstandsstufe, Plus, Seltenheit, Boni (Statuswerte
  auf die der Bot-Klasse umgedeutet, der Hauptwert bleibt Hauptwert), Bonus 6/7, Juwelen und Set – nur als Waffe,
  Rüstung und Helm der Bot-Klasse. Fehlt der eigenen Figur ein Teil, bekommt der Bot ein schlichtes Teil. Vorbild ist die
  stärkste Ausrüstung der letzten 10 Minuten (`ABOT.peakKeep`); wer im Kampf stärkere Teile anlegt, bekommt sofort
  stärkere Bots („Die Bots passen sich deiner Ausrüstung an.“).
- **Rang:** Angriff und Leben der Bots × Faktor nach dem eigenen Rang (`ABOT.rankMul`):

  | Rang | Bronze | Silber | Gold | Platin | Diamant | Champion |
  |---|---:|---:|---:|---:|---:|---:|
  | Faktor | 0,88 | 0,90 | 0,92 | 0,95 | 0,97 | 1,00 |

- **Fertigkeiten:** die freigeschalteten des Weges, alle auf der Stufe, die die eigenen fünf im Schnitt haben (mit
  Rang-Boni über `rankSk`). Flüche, Diener und Totenruf lassen Bots weg (Zustände wirken im PvP ohnehin nicht).
- **Tränke:** 3 Lebenstränke je Kampf (größte Größe der Stufe, im PvP zu 85 % wie bei der Figur) unter 40 % Leben.

## Schaden

Genau das Modell zwischen echten Spielern (`kampf.js`, `PVP_DMG`):

- Ein Treffer eines Bots wird wie `pvpOutgoing` gebaut (Angriff, Krit, Grundangriff, „Stark gegen Menschen“, Ausgleich
  je Weg `PATH_DMG`, Seelenstufen halb, Gift, stapelnde Blutung, Betäubung nur mit `pvpStun`) und geht über
  `pvpReceive → pvpReceiveHit` an die eigene Figur – PvP-Faktor, Rüstung, Abwehr, Lebenspolster, Deckel je Treffer und
  in 1,5 s, Schilde, Gift und Blutung wie bei einem echten Gegner. Fertigkeiten tragen `sk: 1`, damit sie ab 15.80
  (kein Ausweichen und Blocken bei Fertigkeiten) genauso sicher treffen wie die eines Spielers.
- Treffer der eigenen Figur auf einen Bot laufen wie gegen einen echten Spieler über `pvpHit → pvpSend`; statt ins Netz
  rechnet `abotMsg` sie mit `pvpIncoming` und den Werten des Bots ab und schickt dieselbe Rückmeldung (`pvpFeedback`:
  Zahl, Lebensraub, Anteil für den Lebensentzug). Grundangriffe kann der Bot wie `damagePlayer` ausweichen und blocken
  (im PvP halb), Fertigkeiten nicht (`d.sk`). Bots untereinander genauso.
- `ABOT.dmg` (1,2) gleicht aus, dass die KI keine Ulti hat und etwas langsamer reagiert als ein Mensch, `ABOT.weg`
  zusätzlich je Weg, wo der Bot im Spiegelduell gegen die Spieler-KI klar stärker oder schwächer war (Ulti, Diener und
  Heilung bringen je Weg verschieden viel). Eingestellt mit den Testläufen unten, aus allen Messungen mit 3–21 Kämpfen
  je Weg (Läufe mit `dmg` 1,2–1,25) und bewusst maßvoll – ein Kampf entscheidet sich oft an wenigen großen Treffern:

  | Weg | Faktor | Grund |
  |---|---:|---|
  | Krieger · Klinge | 1,06 | mit 1,0–1,04 gewann die Spieler-KI 17 von 21, mit 1,08–1,15 nur 2 von 7 |
  | Krieger · Leib | 0,92 | Bot gewann 5 von 7 |
  | Ninja · Falke | 0,80 | mit 0,85–1,0 gewann der Bot 12 von 13, mit 0,78 die Spieler-KI 3 von 3 (Pfeilregen und Salven treffen stehende Ziele voll; unter zwei Bogenschützen entscheidet wenig Schaden mehr viel) |
  | Schamane · Drache | 1,05 | Spieler-KI gewann 10 von 15 |
  | Schamane · Heilung | 1,15 | ohne Lichtkuppel und Ulti (mit 1,0 gewann die Spieler-KI 3 von 3, mit 1,35 nur 1 von 4) |
  | Nekromant · Seelen | 1,15 | ohne Diener (mit 1,0 gewann die Spieler-KI 3 von 3, mit 1,3 nur 1 von 4) |
  | Nekromant · Knochen | 0,78 | Bot gewann 14 von 15 (Blutlanzen und Flächen treffen stehende Ziele voll) |
  | Magier · Frost | 1,05 | Spieler-KI gewann 5 von 7 |
  | Magier · Blitz | 0,92 | mit 1,0 gewann der Bot 2 von 3, mit 0,92 nur 1 von 4 |
  | alle übrigen | 1 | |

Die Fertigkeiten der Bots sind keine Kopie des Spielcodes der eigenen Figur, sondern ein Ablauf je Art (`abotPlan`):
Zeitpunkt und Faktor je Treffer auf ein Ziel, Reichweite, Trefferkreis. Die Faktoren kommen aus den Daten der
Fertigkeit; wo die eigene Figur durch Rang-Boni mehr trifft (Nachhall, mehr Pulse, Splitter), gleicht ein gemessener
Faktor `fix` aus. Gemessen wurde jede der 60 Fertigkeiten mit dem echten Spielcode (eigene Figur wirkt auf einen
stehenden Bot, Summe der Treffer): alle Pläne liegen bei 0,8–1,15 des echten Werts.

| Art | Bedeutung | Beispiele |
|---|---|---|
| m | um den Bot herum | Aderlass, Schwertwirbel, Wirbelklinge, Drachengebrüll, Frostnova |
| s | ein Ziel in Nahkampfreichweite | Hinterhalt, Geistesschlag, Felsenfaust |
| g | Sprung/Blinzeln zum Ziel, Treffer dort | Sprungschlag, Blitzangriff, Schattenkette, Blitzschritt |
| f | Fluchtschritt, Treffer am alten Platz | Eisschritt, Schattenwechsel |
| p | Geschoss oder sofortiger Zauber auf das Ziel | Talisman, Knochenwurf, Blutlanzen, Kettenblitz, Phönix |
| z | Fläche am Ziel mit Warnkreis, trifft nur, wer drinsteht | Pfeilregen, Blitzschlag, Geisterflut, Glutfeld, Bergsturz |
| c | gehaltener Strahl | Eisstrahl, Blutsauger |
| w | Wirken, dann Geschoss | Feuerball |
| b, h | Buff, Heilung (das schwächste Teammitglied, auch die eigene Figur) | Kampfrausch, Segen, Heilung |

Das Bild jeder Fertigkeit kommt aus derselben Darstellung wie bei einem Mitspieler (`remoteSkillFx` mit den Angaben,
die die jeweilige Darstellung braucht), dazu Treffer-Funken (`vfxImpact`, `skillHitFx`) und bei Flächen ein Warnkreis
in der Teamfarbe. Neue Bodenringe, Runen oder Sterne gibt es nicht.

## KI

- **Ziel:** nah und schwach zuerst, mit etwas Zufall; alle 6–11 Sekunden prüft ein Bot, ob ein anderes Ziel besser ist
  (Ziel wechseln). Getarnte Spieler sehen Bots nicht.
- **Bewegung:** Nahkämpfer laufen an, Fernkämpfer und Zauberer halten Abstand (Bogen etwa 380, Zauberer etwa 240) und
  gehen auf Abstand, wenn man ihnen zu nahe kommt. An Säulen, Felsen und Lava gleiten sie entlang (`moveEntity`),
  bleiben sie hängen, gehen sie kurz seitlich um das Hindernis.
- **Angriff:** Grundangriff im Takt der Waffe (wie `tryBasicAttack`), Fertigkeiten mit ihrer Abklingzeit (× 1–1,12)
  und einer kurzen Pause dazwischen (0,5–1 s, mindestens die der Klasse). Wahl: Buffs vor dem Kampf (schon im
  Countdown), Heilung unter 60 %, Sprünge auf Abstand, Fluchtschritt bei Nähe, sonst die stärkste bereite (Schaden je
  Sekunde, die der Bot dafür stehen muss).
- **Wenig Leben:** Trank unter 40 %; unter 30 % weicht ein Bot mit 40 % Wahrscheinlichkeit 1,3–2,3 Sekunden zurück
  (einmal je Tiefpunkt).
- **Flächen:** Wer mehrmals kurz hintereinander von weit her getroffen wird, geht kurz zur Seite.
- **Team:** Bot-Mitspieler greifen die Gegner an und heilen das Team (Heiler-Schamane), die Lichtkuppel der eigenen
  Figur heilt sie mit.
- **Turmschlacht:** Bots laufen zum Turm (aus der Basis durch das Tor in der Mauer) und stellen sich in den Kreis,
  kämpfen gegen Gegner in der Nähe (bis 380) und stehen nach 6 Sekunden in der eigenen Basis wieder auf (2 s geschützt).

## Punkte und Schutz vor Ausnutzen

- Ranglisten-Kämpfe gegen Bots zählen **halb**: Sieg +`PVP.win`/2 = **+25**, Niederlage −`PVP.loss`/2 = **−12**
  (abgerundet). Sichtbar im Ergebnisfenster („gegen Bots: halbe Punkte“), in der Anzeige („gegen Bots“, „Ja, gehen
  (−12 Punkte)“) und beim Turniermeister.
- Sie zählen als Rangkämpfe für die **Saison** (Kämpfe und beste Stufe, `ereignisse.js`). Für die **Erfolge**
  („Gewinne 10/100 Rangkämpfe“) zählt ein Sieg gegen Bots halb (`p.pvp.bw`, `p.pvp.bl` zählen die Bot-Kämpfe mit).
- Ein Sieg bringt nur nach einem **echten Kampf** Punkte: mindestens 12 Sekunden Kampf (`ABOT.minFight`) und selbst
  mindestens die Hälfte des Lebens eines Gegners abgezogen (`ABOT.minDealt`, auch Diener zählen). Sonst +0 mit Hinweis
  „Kein echter Kampf – dieser Sieg bringt keine Punkte.“ Niederlagen zählen immer.
- Keine Dauerschleife: 10 Sekunden Pause zwischen zwei Bot-Kämpfen; das Auffüllen braucht jedes Mal 20 Sekunden
  Wartezeit.
- Ausrüstung kurz vor dem Kampf ablegen bringt nichts (Vorbild der letzten 10 Minuten, Nachziehen im Kampf).
- Die Turmschlacht zählt wie bisher nicht für den Rang.

## Werte (`ABOT` in `js/arena-bots.js`)

| Wert | Bedeutung | Stand |
|---|---|---:|
| `wait` | Sekunden in der Warteschlange bis zum Auffüllen | 20 |
| `pause` | Sekunden zwischen zwei Bot-Kämpfen | 10 |
| `minFight`, `minDealt` | echter Kampf: Sekunden, Anteil Leben eines Gegners | 12, 0,5 |
| `rankMul` | Angriff und Leben nach eigenem Rang | 0,88 … 1 |
| `dmg`, `weg` | Ausgleich der KI auf den Schaden, zusätzlich je Weg | 1,2, 0,78–1,15 |
| `think`, `gcd`, `cdSlack` | Bedenkzeit, Pause nach Fertigkeiten, Streuung der Abklingzeit | 0,2–0,4 s, 0,5–1 s, 1–1,12 |
| `potions`, `potAt` | Tränke je Kampf, ab Anteil Leben | 3, 0,4 |
| `retreatAt`, `retreatChance`, `retreatFor` | Zurückweichen | 0,3, 0,4, 1,3–2,3 s |
| `switchEvery` | Ziel prüfen alle … Sekunden | 6–11 |
| `peakKeep`, `adaptGs` | Vorbild-Ausrüstung, Nachziehen ab … Ausrüstungslevel mehr | 600 s, 2 |

## Haken in den vorhandenen Code (alle in `js/arena-bots.js`)

`pvpTick` (eigener Ablauf im Bot-Kampf, Host-Pflichten laufen weiter), `pvpSend` (an Bots), `pvpToHost` (Fall und
Verlassen), `pvpOnMatch` (echter Kampf im Countdown), `pvpLeave` (halbe Niederlage), `pvpUpdateFoes` (Gegnerliste aus
den Bots), `pvpLife`, `pvpHud`, `pvpSummary`, `pvpRenderMaster`, `pvpQueue`, `remotePlayerAt` (Bots anklicken),
`healParty` (Lichtkuppel heilt Bot-Mitspieler), `allyScore` (Diener greifen Bots auch offline an), `collectScene`
(2D), `drawOverlay3`/`v3Monsters` (Namen und Balken in 3D), `V3.extra` (3D-Figuren), `ERFOLG_BY_ID.pvp1/pvp2`.
`kampf.js` bleibt unverändert.

## Tests

Mit Playwright und Chromium (Testskripte im Arbeitsordner, nicht im Spiel). Figur auf Stufe 80, Ausrüstung der Stufe
blau +10 mit drei Boni, Fertigkeiten auf Stufe 42, 3 Lebenstränke; die Spielzeit läuft in Schritten von 0,05 s.

- **Fertigkeiten:** jede der 60 Fertigkeiten aller 12 Wege mit dem echten Spielcode gemessen (die eigene Figur wirkt
  sie auf einen stehenden Bot, Summe der Treffer) und mit dem Plan des Bots verglichen; mit den `fix`-Faktoren liegen
  alle bei 0,8–1,15 des echten Werts.
- **Siegquote 1v1:** Spiegelduelle gegen gleich starke Bots (Rang Champion, Faktor 1; gleiche Klasse, gleicher Weg,
  gleich nachgebaute Ausrüstung, beide 3 Tränke). Die Spieler-KI des Tests wirkt Buffs zuerst, dann die stärkste bereite
  Fertigkeit, die Ulti und Tränke unter 40 % und greift sonst an; sie weicht nicht aus und nutzt kein Gelände. Frühere
  Fassungen der Bot-KI (Pläne noch ungenau, Rückzug zu oft) lagen bei `dmg` 1,0 bei 67–90 % für die Spieler-KI.

  | Einstellung | Wege | Kämpfe | Siege der Spieler-KI |
  |---|---|---:|---:|
  | `dmg` 1,0 / 1,1 / 1,2 | 5 | je 15 | 80 / 73 / 73 % |
  | `dmg` 1,2 / 1,35, Bot-KI verbessert (Nahkampf bleibt dran, Rückzug seltener) | 5 | je 15 | 67 / 33 % |
  | `dmg` 1,25 | 5 | 40 | 50 % |
  | `dmg` 1,25 | alle 12 | 36 | 61 % |
  | `dmg` 1,25 und erste Weg-Faktoren, zwei Läufe | alle 12 | je 24 | 54 / 29 % |
  | **`dmg` 1,2 und Weg-Faktoren (Endlauf)** | alle 12, je 3 | 36 | **61 %** (22) |
  | Klinge 1,04 / Falke 0,85 | 2 | 12 | 5 von 6 / 0 von 6 |
  | **Klinge 1,06 / Falke 0,80 (Endwerte)** | 2 | 12 | 4 von 6 / 3 von 6 |

  **Ergebnis mit den Endwerten: etwa 62 %** (26 von 42: der Endlauf ohne die zwei danach geänderten Wege, 19 von 30,
  und deren Nachprüfung, 7 von 12) – im Ziel von 50–65 %. Bei rund 40 Kämpfen ist das auf etwa ±15 Prozentpunkte
  genau; zwei Läufe mit gleichen Einstellungen lagen bei 54 % und 29 %.
- **3v3:** Spieler-KI mit zwei Bot-Mitspielern gegen drei Bots (Champion), je eine eigene Klasse: 4 von 6 gewonnen; die
  Bot-Mitspieler machen Kills (bis 3 je Kampf).
- **Abläufe** (alle wie erwartet, keine Fehler auf der Seite):
  - 1v1: Bot erscheint im Countdown, kämpft mit Grundangriffen und Fertigkeiten, das Spiel endet, das Ergebnisfenster
    zeigt „gegen Bots: halbe Punkte“.
  - 3v3: Mitspieler-Bots greifen die Gegner an (68 Treffer der zwei Mitspieler, 155 der drei Gegner in 26 s), das
    Ergebnis zeigt Kills, Tode und Punkte aller sechs; Niederlage 520 → 508.
  - Turmschlacht: 7 Bots laufen aus der Basis zum Turm (Abstand 1330 → bis 59), laden ihn (bis 53 %), fallen 9 Mal und
    stehen 8 Mal in der Basis wieder auf.
  - Verlassen eines Rangkampfs: 300 → 288, Niederlage und Bot-Niederlage gezählt, die Rückfrage zeigt „Ja, gehen
    (−12 Punkte)“ und „gegen Bots“; ein neuer Bot-Kampf gleich danach wird abgelehnt („Nächster Kampf gegen Bots in
    10 s“), nach 10,5 s geht er.
  - Neuladen mit offenem Bot-Rangkampf: 400 → 388 mit der vorhandenen Meldung.
  - Sieg ohne echten Kampf (Bot nach wenigen Sekunden besiegt): +0, kein Sieg gezählt, Hinweis im Ergebnisfenster.
  - Sieg nach echtem Kampf (16 s, 9299 von 11913 Leben abgezogen): 700 → 725, Sieg und Bot-Sieg gezählt.
  - Erfolge: 10 Siege, davon 4 gegen Bots, zählen als 8.
  - Turniermeister ohne Server: Hinweis und „Gegen Bots“ bei 1v1, 2v2, 3v3 und Turmschlacht; der Knopf startet den
    Kampf.
  - Auffüllen als Host ohne Mitspieler: das Fenster zählt „Bots füllen in 20 s auf“ … „15 s“, nach 21 s läuft ein
    Bot-Kampf 2v2 mit 4 Figuren, die Warteschlange ist leer.
  - Ratgeber: die Frage „Kann ich in der Turnierarena gegen Bots kämpfen?“ ist da und nennt die Werte.
  - 2D und 3D (Bilder): Bots als Spielerfiguren mit „(Bot)“, Stufe, Rang-Stein und Lebensbalken in der Teamfarbe,
    Fertigkeiten mit ihren Bildern.
- **Grenzen:** Bot-Kämpfe laufen nur auf dem eigenen Gerät – eine Gruppe wird nicht mitgenommen, in 2v2 und 3v3 sind
  alle anderen Bots. Bots haben keine Ulti, keine Diener und keine Lichtkuppel (über `weg` ausgeglichen). Die Siegquote
  ist mit einer Test-KI gemessen, nicht mit Menschen: wer ausweicht und Flächen meidet, gewinnt öfter.
