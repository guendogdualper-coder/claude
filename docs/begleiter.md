# Begleiter für Gruppeninhalte

Wunsch: „Es sind noch wenige Spieler online. Gruppeninhalte sollen deshalb auch allein spielbar sein: KI-Begleiter
füllen die Gruppe auf.“ Code: `js/begleiter.js` (eine Datei, alles über Wrapper), Texte für die Übersetzung:
`neue-texte-begleiter.json`.

## Kurzfassung

- Begleiter gibt es in **Dungeons** (auch über Risse), den **Endboss-Hallen** der Karten, den **Instanzen** (Lv 60
  und Lv 80, Fünfergruppe), im **Höllenthron** (bis 7) und im **Turm der Verdammten** (höchstens 4 Begleiter).
- **Nur allein:** Ist man in einer Gruppe mit echten Spielern (`game.party` mit mindestens zwei Mitgliedern) oder steht
  ein echter Spieler im selben Inhalt (länger als 3 s), gehen die Begleiter.
- Aufgefüllt wird bis zur **Gruppengröße** des Inhalts: 4 Begleiter (Dungeon, Endboss, Instanz, Turm), 6 im Höllenthron.
- Rollen **Tank, Heiler, Schaden**: automatisch passend zur eigenen Rolle (die Rolle aus dem Gruppenfinder, Vorschlag
  nach Weg) oder selbst gewählt (Zähler je Rolle; fehlende Plätze werden Schaden).
- **Stärke** etwa 80 % einer gleich ausgerüsteten Figur derselben Stufe (Leben × 0,8, Schaden gemessen ≈ 0,8).
- **Miete in Gold je Betreten**, nach Stufe gestaffelt. Begleiter bekommen **keine Beute** und keine Erfahrung.
- Sichtbar in der **Gruppenanzeige** mit Leben und Rollen-Zeichen. Wer fällt, **steht nach dem Kampf wieder auf**.
- Wo Inhalte mit der Spielerzahl wachsen, zählt ein Begleiter wie **0,7 Spieler**.

## Anheuern

| Wo | Knopf | Was passiert |
|---|---|---|
| Eingang (Dungeon, Riss, Endboss, Instanz, Höllenthron) | „Mit Begleitern betreten“ | Anheuern wird vorgemerkt, dann der normale Eintritt (`enterDungeon`/`enterRift`); drinnen kommen die Begleiter dazu und die Miete wird abgebucht |
| Drinnen am Steinkreis des Ausgangs | „Mit Begleitern auffüllen“ | sofort anheuern (z. B. nach einem Neuladen) bzw. „Begleiter entlassen“ |
| Turm (Fenster am Turm) | „Mit Begleitern beginnen“ | eigener Durchgang („nur meine Gruppe“), die Begleiter kommen in der Halle dazu |
| Gruppenfinder (J) | Abschnitt „Begleiter“: „Mit Begleitern los“, im Formular „Gruppe eröffnen“ der Knopf „Begleiter“ | führt direkt hinein (Dungeon, Endboss, Höllenthron über `enterDungeon`, Instanzen über ihr `go`, Turm: zum Turm und Durchgang beginnen) |
| Charakterfenster, Seite „Begleiter“ | Einstellungen, „Begleiter entlassen“, drinnen „Mit Begleitern auffüllen“ | laufende Begleiter mit Leben, Rollenwahl, Miet-Tabelle, Regeln, Zähler |

Der Turm der Verdammten steht dafür neu im Gruppenfinder (eigene Kategorie, `GROUP_ACTIVITIES` + `GF_CATS`); „Los“
einer echten Gruppe führt dort zum Turm.

Vorgemerktes Anheuern (`beg.want`) gilt 90 s und nur für den genannten Inhalt. Die Rollen kommen aus der Einstellung
`p.begleiter.wahl` (`'auto'` oder `{ tank, heiler, schaden }`).

**Automatisch:** Empfehlung des Inhalts (1 Tank, 1 Heiler, 3 Schaden; Höllenthron 1/2/4) ohne die eigene Rolle.
Beispiel Schaden-Figur in einem Dungeon: Tank, Heiler, 2 × Schaden; Tank-Figur: Heiler, 3 × Schaden.

**Klassen je Rolle:** Tank = Krieger · Weg des Leibes, Heiler = Schamane · Weg der Heilung, Schaden = zufällig aus
den übrigen Wegen, möglichst verschiedene Klassen (ohne den Weg der Seelen: er lebt von Dienern, die Begleiter nicht
haben).

## Miete

Je Begleiter und Betreten: `(12 × Stufe + 0,4 × Stufe²) × Art`, auf 10 Gold gerundet (`BEG.rent`). Art: Dungeon 0,8,
Endboss 2, Instanz 1,5, Höllenthron 2,5, Turm 3. In Klammern: volle Gruppe (4 bzw. 6 Begleiter).

| Stufe | Dungeon | Endboss | Instanz | Höllenthron | Turm |
|---:|---:|---:|---:|---:|---:|
| 10 | 130 (520) | 320 (1.280) | 240 (960) | 400 (2.400) | 480 (1.920) |
| 20 | 320 (1.280) | 800 (3.200) | 600 (2.400) | 1.000 (6.000) | 1.200 (4.800) |
| 30 | 580 (2.320) | 1.440 (5.760) | 1.080 (4.320) | 1.800 (10.800) | 2.160 (8.640) |
| 40 | 900 (3.600) | 2.240 (8.960) | 1.680 (6.720) | 2.800 (16.800) | 3.360 (13.440) |
| 50 | 1.280 (5.120) | 3.200 (12.800) | 2.400 (9.600) | 4.000 (24.000) | 4.800 (19.200) |
| 60 | 1.730 (6.920) | 4.320 (17.280) | 3.240 (12.960) | 5.400 (32.400) | 6.480 (25.920) |
| 70 | 2.240 (8.960) | 5.600 (22.400) | 4.200 (16.800) | 7.000 (42.000) | 8.400 (33.600) |
| 80 | 2.820 (11.280) | 7.040 (28.160) | 5.280 (21.120) | 8.800 (52.800) | 10.560 (42.240) |

Einordnung (docs/gold-beute.md): Farmen bringt auf Stufe 50 etwa 127.000 Gold je Stunde, ein Dungeon-Lauf auf Stufe 50
grob 25.000 Gold (Bossbeute 300 × Stufe plus Kills); die volle Miete (5.120) ist gut ein Fünftel davon. Instanz,
Endboss, Höllenthron und Turm bringen deutlich mehr Gold; dort liegt die Miete bei etwa 10–25 % des Ertrags.

Wer den Inhalt verlässt (Ausgang, Tod mit Aufstehen in der Stadt, Teleport), hat **5 Minuten** (`BEG.keep`), um ohne
neue Miete zurückzukommen; die Begleiter warten so lange unsichtbar. Danach gehen sie. Ein neuer Inhalt beendet die
alte Miete. Gold wird nur abgebucht, wenn die Begleiter wirklich kommen; nicht genug Gold: Hinweis, kein Eintritt mit
Begleitern (der normale Eintritt bleibt).

## Aussehen und Werte

Gebaut mit der Bot-Technik der Turnierarena (`abotMake` in `js/arena-bots.js`):

- Spielerfiguren mit zufälligem Aussehen (Geschlecht, Frisur, Farben, Größe) und einem Namen aus Silben.
- Ausrüstung nach dem Vorbild der eigenen (`abotPeak`: die stärkste der letzten 10 Minuten): je Platz dasselbe Teil für
  ihre Klasse (Stufe, Plus, Seltenheit, Boni – Hauptwert bleibt Hauptwert –, Juwelen, Set).
- Statuspunkte wie ein üblicher Aufbau (alles in den Hauptwert, Rest Vitalität), Klassensegen als Dauer-Buff,
  Seelenstufen auf Stufe 80 wie die eigenen, Fertigkeitsstufe = Schnitt der eigenen fünf.
- Über dem Kopf: Name in Gruppenfarbe, Lebensbalken, darüber „KI-Begleiter · Tank“ (Zeile der Gilde).

## Stärke

- **Leben:** `playerStats` des erzeugten Charakters × `BEG.hp` = 0,8.
- **Schaden:** dieselbe Rechnung wie `hitMonster` für die eigene Figur (Stufenabstand, Stark gegen Monster und Arten,
  Weg, Grundangriff × `BASIC_MUL`, Krit, kritischer Schaden, Waffenspanne, Fertigkeiten × `dmgScale` × Fertigkeits-
  schaden, stapelnde Blutung des Aderlass, Gift aus der Ausrüstung, Lebensraub), mit den Werten des Begleiters ×
  `BEG.dmg` × `BEG.weg[Klasse:Weg]`. Die KI hat keine Ulti, keine Diener und Pausen wie ein Mensch (`ABOT.gcd`,
  `ABOT.cdSlack`); `BEG.dmg` = 0,95 gleicht das so aus, dass im Schnitt etwa 80 % herauskommen, `BEG.weg` dämpft die
  größten Abweichungen einzelner Wege.
- **Tank** trägt Schwert und Schild (mehr Leben, Abwehr und Blocken als mit Zweihänder), **Heiler** heilt mit 80 %.

### Messung

Mit der Spieler-KI des Balance-Simulators (`tools/balance-sim.js`, `pageLib`: Rotation mit Ulti, Buffs vorher, Klassen-
segen, Ausrüstung je Stufe mit Boni): erst kämpft die Figur 40 s gegen eine Boss-Puppe ihrer Stufe, dann ein Begleiter
derselben Klasse, desselben Wegs und mit der Ausrüstung dieser Figur gegen dieselbe Puppe (die Figur tut nichts, der
Begleiter steht im Startraum eines Dungeons). Verhältnis Schaden je Sekunde Begleiter : Figur.

| Weg | St. 60, +7 (ohne Weg-Faktor) | St. 80, +9 mehr Boni (erste Faktoren) | **St. 70, +7 (Einstellung)** |
|---|---:|---:|---:|
| Krieger · Klinge | 0,74 (ohne Blutung) | 0,73 (ohne Blutung) | **0,80** |
| Ninja · Dolch | 0,68 | 1,03 | **0,75** |
| Ninja · Falke | 0,84 | 0,70 | **0,71** |
| Schamane · Drache | 0,80 | 0,81 | **0,85** |
| Nekromant · Knochen | 0,90 | 0,88 | **0,81** |
| Magier · Feuer | 0,75 | 0,67 | **0,81** |
| Magier · Frost | 0,87 | 0,76 | **0,86** |
| Magier · Blitz | 0,83 | 0,82 | **0,84** |
| Magier · Erde | 0,90 | 0,87 | **0,86** |
| **Schnitt** | **0,81** | **0,81** | **0,81** |

- Leben in allen Läufen genau 0,80 der Figur (Tank-Begleiter mit Schild; in der Messung als Schaden mit Zufallswaffe 0,74).
- Die Werte je Weg streuen von Lauf zu Lauf stark (ein Kampf hängt an wenigen Krits, Tarnungsangriffen, Flächen-
  ticks). `BEG.weg` gleicht deshalb nur 70 % der Abweichung vom Mittel der Läufe aus. Nach dem Lauf auf Stufe 70 noch
  Falke 1,00 → 1,03 und Frost 0,97 → 0,95 (erwartet ≈ 0,73 und ≈ 0,84).
- Tank und Heiler machen weniger Schaden (Tank als Schaden gemessen 0,49–0,64, Heiler 0,44–0,57 eines Heil-Schamanen
  mit Ulti) – ihre Aufgabe ist Halten und Heilen; Leben 0,8 wie alle.
- Nachmessen: im Browser `pageLib()` aus `tools/balance-sim.js` laden, `SIM.single(kl, weg, L, { plus, prof, T: 40 })`
  für die Figur; dann `SIM.make(…)`, die Figur auf `game.world.dungeons[k].start` eines Dungeons stellen,
  `begHire(begContentOf(k), [{ role: 'schaden', cls: kl, path: weg }], { free: true })`, `SIM.ai.mode = 'none'`,
  `SIM.dummies(L, 1, true)`, `SIM.track = { total: 0, bySrc: {} }`, `SIM.run(40)` → `SIM.track.total / 40`.

## KI

Je Bild (`begBotTick`), Entscheidungen alle 0,2–0,4 s (`begThink`):

- **Kampf** heißt: Monster bis 560 px um die eigene Figur, die die Figur, einen Begleiter oder einen eigenen Diener
  angreifen, die ein Begleiter gerade getroffen hat oder die das Ziel der Figur sind, während sie kämpft
  (Seelensteine nur, wenn die Figur sie angreift). Begleiter ziehen so nie selbst neue Gruppen, Flächen treffen nur
  Monster im Kampf.
- **Tank:** nimmt zuerst Monster, die jemand anderen angreifen (die nächsten zuerst, sein bisheriges bevorzugt, Bosse
  etwas lieber). Aller Schaden der Begleiter zählt als Bedrohung für ihn (Diener-Bedrohung × 6, Bosse × 3) – die
  Monster wechseln nach wenigen Zehntelsekunden zu ihm. Buff „Starker Körper“, Betäubungen.
- **Heiler:** Gruppenheilung (alle 11 s, wenn mindestens zwei unter 70 % sind: 14 % des Höchstlebens), Heilwelle (alle
  2,4 s auf den Schwächsten unter 85 %: 9 %), dazu die Fertigkeit „Heilung“ bei unter 55 % – alles × 0,8 × Heilkraft.
  Sonst kämpft er mit (Lichtsturz, Grundangriff).
- **Schaden:** Ziel der eigenen Figur, sonst das des Tanks, sonst das nächste Monster der Figur. Steht ein
  Kristallschild (Endboss), zerschlagen sie zuerst die Kristalle.
- **Fertigkeiten** aus den Plänen der Bots (`abotPlan`: um sich, Einzelziel, Sprung, Fluchtschritt, Geschoss, Fläche,
  Strahl, Wirken, Buff, Heilung), Bild wie bei einem Mitspieler (`remoteSkillFx`), Abklingzeiten mit Pause wie ein Mensch.
- **Tränke:** 3 je Kampf (größte Größe der Stufe) unter 40 % Leben; außerhalb des Kampfes nach 4 s Ruhe 2 % Leben je
  Sekunde und die Tränke wieder voll.
- **Folgen:** jeder hält seinen Platz hinter der Figur (Richtung der letzten Bewegung), schneller, wenn er zurückliegt.
  Mehr als 520 px weg für 6 s oder mehr als 900 px: sie stehen wieder neben der Figur (Lichtsäule).
- **Wege:** `navMove` der Monster (gerade bei freier Sicht, sonst A* um Mauern, seitliches Ausweichen beim Festhängen)
  auf einem eigenen Körper; Fernkampf und Zauber nur mit freier Sicht (`navSight`).
- **Ausweichen** (`begAvoid`, vor allem anderen): Warnflächen werden beim Ankündigen gemerkt (Reaktion 0,15–0,45 s).
  Steht ein Begleiter drin, läuft er zum nächsten sicheren Platz (Ringe um ihn, Rand großer Kreise, sichere Kreise,
  das sichere Viertel des Viertelschlags), in gerader Linie erreichbar; Strahl und Wirken brechen ab. Lichtkreise
  (Vernichtung, Instanz-Ult) und geteilte Splitterschläge: hinein statt hinaus. Seelenbann (Kharzul): Abstand zur Figur.
  Lachen der Instanzen und liegende Flächen der Bosse meiden sie. Aus Sicherheit laufen sie nie in eine aktive
  Gefahrenfläche hinein (der Schritt unterbleibt, sie warten am Rand) – auch nicht, um ihr Ziel zu erreichen.

## Monster und Begleiter

- Für die Monster ist jeder Begleiter ein Diener-Stellvertreter (`b.mx` mit `ally`): `allyPresent` (gültig, solange er
  lebt und die Miete läuft), `nextTarget` (ohne andere Ziele der nächste Begleiter), `releaseAllyTargets` (stirbt ein
  eigener Diener, bleiben Begleiter Ziel), Bedrohung über `damageMonster`/`addThreat`.
- **Nahkampf** (`monsterAttack`): wie gegen die eigene Figur – Stufenabstand, Flankieren und Zermürbung der Endgame-
  Monster, Ausweichen, Blocken, „Erlittener Schaden“ und Abwehr gegen die Angriffsart. Fernkämpfer schießen wie immer.
- **Geschosse** (`updateProjectiles`): Monster-Geschosse treffen auch Begleiter (Bosse immer).
- **Flächen:** `raidResolve` (Endbosse, Instanzen samt Ult, Kette, Sog, Ring, Kern; Höllenthron-Viertelschlag;
  Vernichtung), `bskLand` (eigene Boss-Angriffe), `endgameShareResolve` (Splitterschlag geteilt, Schmetterschlag),
  Stampfer der Dungeon-Bosse (`updateBoss`), Lachen (`INST_HAZ`) und liegende Flächen (`BSK_FIELDS`) – jeweils mit
  derselben Regel und demselben Faktor wie für die eigene Figur.
- **Endbosse:** Begleiter stehen in `raidPlayers` (Meteore auf jeden, Sprung und Sturm auch auf sie, Brut wählt auch sie).
- **Turm:** Begleiter in der Halle zählen als Kämpfer (`turmFighters`): neue Verdammte nehmen zuerst den Tank, und die
  Ebene beginnt erst von vorn, wenn auch sie liegen. **Höllenthron:** Begleiter zählen zur Gruppengröße 6–7 (`htChecks`).

## Skalierung (0,7 je Begleiter)

- **Turm:** `S.begEff = Spieler + 0,7 × Begleiter` (höchstens 10). Zahl der Gegner, Steine, Schlüssel, Belagerung mit
  der gerundeten Zahl (`S.players`); Leben und Schaden der Gegner und Hüter genau mit `S.begEff` (`turmTune`).
  Beispiel allein mit 4 Begleitern: 3,8 → Wellen wie für 4 Spieler, Leben der Verdammten × 1,336 statt × 1,36.
  Im Kanal meldet das Gerät dem Host die Zahl seiner Begleiter (`bg` beim Betreten, `vtb` bei Änderungen, geprüft 0–4).
- **Endbosse:** Seelenkristalle (3 + Spieler über 2) und Lichtkreise der Vernichtung (2 bzw. 3) zählen Begleiter mit
  je 0,7 (`raidSummonCrystals`, `raidDoom` mit `beg.countMode`).
- Dungeons, Instanzen und Höllenthron wachsen nicht mit der Spielerzahl; die Beute bleibt wie allein
  (`instGroupSize` zählt nur echte Mitglieder).

## Tod und Wiederaufstehen

Ein Begleiter fällt bei 0 Leben (Funken, „Gefallen“, Meldung im Chat), Monster suchen sich ein neues Ziel. Sobald
5 s lang kein Kampf war (kein Monster im Kampf, kein Treffer, die Figur lebt), stehen alle Gefallenen mit halbem
Leben neben der Figur wieder auf. Fällt die eigene Figur, kämpfen die Begleiter weiter; steht sie in der Stadt auf,
warten sie (5 Minuten, siehe Miete).

## Mehrspieler (Kanal)

Spieler treten seit 14.4 automatisch Kanal 1 bei; dort führt der Host (meist der Welt-Wächter) die Monster. Damit die
Begleiter auch dann Ziele sind:

- Das Gerät schreibt seine Begleiter als **Diener-Plätze ab 60** in die Liste `al` des eigenen Zustands (Feld 7 =
  Rolle `t`/`h`/`s`). Der Host baut daraus wie bei Dienern Stellvertreter; seine Monster greifen sie an und schicken
  den Treffer als `ahit` zurück. Jede Version ab 14.32 versteht das, auch ohne diese Datei.
- Treffer der Begleiter gehen als Treffer des **Tanks** (Platz `al`) zum Host, so landet die Bedrohung bei ihm; ohne
  Tank als eigene Treffer. Belohnung und Beteiligung bleiben bei der eigenen Figur.
- Flächen der Bosse kommen wie immer über `raid`/`share`/`warn`/`slam` und werden für die Begleiter auf dem eigenen
  Gerät gerechnet.
- Mit dieser Datei auf dem Host: Begleiter der Mitspieler zählen in `raidPlayers` und `turmFighters`, die
  Turm-Skalierung kennt ihre Zahl.
- Andere Geräte zeichnen diese Diener-Plätze nicht als Skelett (2D-Szene, `syncAlly3`, kein Zerfallen). Andere Spieler
  sehen die Begleiter in dieser Fassung nicht – es gibt sie ohnehin nur, solange kein echter Spieler im Inhalt ist.
- **Prüfungen fremder Daten:** `ahit` (nur vom Host, Platz ganze Zahl 60–69, Angriff 0–10⁹, Stufe 1–300),
  `warn`/`slam` (Ort, Radius bis 800, Zahlen endlich), Kreise der Boss-Angriffe (höchstens 64, endlich, Radius bis
  3.000), Flächen der eigenen Boss-Angriffe (höchstens 24, nur endliche Zahlen; vorher schon `bskClean`), Turm-Zähler
  (ganze Zahl 0–4, nur für den Absender selbst, Absender aus der Verbindung), Rolle in `al` (nur `t`/`h`/`s`). Namen
  der Begleiter entstehen auf dem eigenen Gerät und werden mit `escapeHtml` ausgegeben.
- Schadensanzeige: je Begleiter eine eigene Zeile; im Kanal ohne Tank rechnet der Host den Schaden der eigenen Figur zu
  (dann keine eigene Zeile).

## Anzeige und Leistung

- 2D: Figuren über `collectScene` (wie Mitspieler, `drawPlayer`), Name und Balken über `drawLabel` (Farbe über
  `pvpLabelInfo`). 3D: Figuren über `V3.extra` (`syncPlayer3`, geteilte Modelle wie bei Mitspielern), Schilder während
  `drawOverlay3`. Die Bots der Turnierarena haben Vorrang (`abot.run`).
- Gruppenanzeige: Begleiter stehen unter der eigenen Gruppe (`partyExtraNames`, `partyMember`), mit Leben, Rollen-Zeichen
  und Aufblitzen bei Schaden; Antippen öffnet die Seite „Begleiter“. Beim Anheuern und Entlassen wird sie sofort neu
  aufgebaut (`partyHud(true)`, sonst bestimmt sie die Mitstreiter nur alle 0,5 s Spielzeit).
- Leistung: keine neuen Modelle oder Texturen; je Bild eine Liste der Monster im Kampf (einmal für alle), Wegsuche mit
  dem Budget der Monster (eine Suche je Bild dazu), sichere Plätze höchstens viermal je Sekunde je Begleiter. Grafik
  „niedrig“: höchstens ein Fertigkeitsbild der Begleiter je 0,25 s, weniger Funken, keine Zahlen über ihren Köpfen.

## Spielstand

`p.begleiter = { wahl: 'auto' | { tank, heiler, schaden }, mal: wie oft angeheuert, gold: Miete insgesamt }`
(`SAVE_FIELDS`). Die Begleiter selbst werden nicht gespeichert; nach dem Neuladen drinnen am Ausgang neu auffüllen.

## Umhüllte Funktionen

`updateAllies` (Takt), `allyPresent`, `releaseAllyTargets`, `nextTarget`, `monsterAttack`, `damageAlly`,
`updateProjectiles`, `raidTelegraph`, `raidResolve`, `raidPlayers`, `raidSummonCrystals`, `raidDoom`, `bskShow`,
`bskLand`, `endgamePlayersNear`, `endgameShareShow`, `endgameShareResolve`, `updateBoss`, `netPlayerState`,
`netClientDamage`, `netOnClientData`, `netRemoteAllies`, `allyCrumble`, `syncAlly3`, `turmFighters`,
`turmPickTarget`, `turmStartLevel`, `turmTune`, `turmToHost`, `turmSocial`, `turmWindowOpen`, `htChecks`,
`collectScene`, `drawOverlay3`, `v3Monsters`, `pvpLabelInfo`, `partyExtraNames`, `partyMember`, `partyHudBuild`,
`gfRender`, `ui.renderDungeon`, `healParty` (Heilung der Figur für die Gruppe heilt Begleiter mit), `dmeterHost`
(Schaden über Zeit der Begleiter in ihre Zeile), beim Bau kurz `abotWeapon` (Tank mit Schwert und Schild). Dazu
`CHAR_TABS_EXTRA` (Seite „Begleiter“), `RATGEBER_WISSEN` (drei Einträge), `GROUP_ACTIVITIES`/`GF_CATS` (Turm).
Nicht geändert: `js/netz.js`, `js/interaktion.js`, `js/gemeinschaft.js`, `js/netz-signal.js` und alle anderen
Dateien außer dem Eintrag in `index.html` und `sw.js`.

## Tests

`node --check` für `js/begleiter.js` und `sw.js`. Playwright (Chromium, ohne Kanal), Spielzeit teils mit `update()`
vorgespult; in allen Läufen **keine `pageerror`** (2D und 3D):

1. **Rauchtest 2D und 3D** (Eisgrotte, Stufe 50, Magier): „Mit Begleitern betreten“-Weg (`begArm` + `enterDungeon`),
   4 Begleiter (Tank, Heiler, 2 × Schaden), Miete 5.120 Gold abgebucht. An einer Gruppe: alle Monster im Kampf
   wechseln zum Tank, er verliert Leben, die Begleiter stehen mit eigenen Zeilen in der Schadensanzeige.
2. **Mechanik** (Titanenschmiede, Stufe 60): Aggro 2 von 2 Monstern beim Tank (nach 4 s und 12 s); Heiler bringt die
   Figur in 4 s von 30 % auf 45–48 %; Meteor unter jedem Begleiter: 0 von 4 noch drin, kein Schaden, ein festgehaltener
   wird getroffen; Monster-Geschoss trifft; Gefallener steht nach 5 s Ruhe wieder auf; Netz: `al` mit Plätzen 60–63
   und Rollen, `ahit` zieht dem Tank Leben ab, kaputte `ahit` (Platz/Angriff/Stufe falsch) werden verworfen; Fenster:
   Ausgang, Charakterfenster (4 Zeilen), Gruppenfinder (41 Aktivitäten samt Turm), Gruppenanzeige (4 Zeilen mit
   Rollen-Zeichen); echte Gruppe → Begleiter gehen; Höllenthron: Gruppe ❌ ohne, ✅ mit „1 + 6 Begleiter“; Turm: Anweg
   6,5 s, 4 Begleiter in der Halle, Ebene 1 mit 3,8 Spielern (31 statt 14 Verdammte, Leben × 1,336 wie erwartet).
3. **Weitere Pfade** (Endboss-Halle, Stufe 70): `raidPlayers` 5, gewichtet 4; Stampfer eines Dungeon-Bosses:
   Warnfläche gemerkt, von 4 im Kreis werden 0–1 getroffen (Ausholen 1,1 s, Reaktion 0,15–0,45 s: wer mitten in
   einer Fertigkeit steckt oder weit innen steht, schafft es nicht immer); eigener Boss-Angriff
   (Axtwirbel): ausgewichen ohne Schaden, festgehalten ein Treffer über `bskLand`; Netz: Treffer eines Schaden-
   Begleiters geht als `dmg` mit `al: 60` (Tank) hinaus; `healParty` heilt Begleiter (+15 %).
4. **Stärke:** siehe Messung oben.
5. **Bilder** (3D, Grafik „mittel“): Drachenhort auf Stufe 64 mit 4 Begleitern im Kampf (Schilder, Gruppenanzeige mit
   Rollen-Zeichen); danach entlassen (Gruppenanzeige sofort leer) und das Fenster am Eingang einer Instanz mit dem
   Abschnitt „Begleiter“ (Miete Stufe 64: 3.610 je Begleiter, 14.440 für vier).

## Grenzen dieser Fassung

- Nur allein; andere Spieler sehen die Begleiter nicht.
- Keine Ulti, keine Diener, keine Flüche (wie die Bots der Turnierarena); Zustände wie Einfrieren durch Bosse treffen
  sie nicht.
- Nach dem Neuladen sind die Begleiter weg (drinnen am Ausgang neu auffüllen, kostet erneut).
