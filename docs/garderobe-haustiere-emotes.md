# Garderobe, Haustiere und Emotes

Drei Sammel- und Gemeinschaftsfunktionen, jede in einer eigenen Datei und nur über Wrapper eingehängt (keine
Änderung an bestehenden Spieldateien außer den Einträgen in `index.html` und `sw.js`):

| Datei | Inhalt |
|---|---|
| `js/garderobe.js` | Garderobe (Aussehen sammeln und übertragen) und die Seite „Sammlung“ im Charakterfenster |
| `js/haustiere.js` | zehn Haustiere: Fundorte, Folgen, 2D-Bilder, 3D-Modelle, Sammlungsseite |
| `js/emotes.js` | sechs Emotes: Chat-Befehle, Emote-Menü am Chat, 2D-Bilder, 3D-Haltungen |
| `neue-texte-sammeln.json` | neue sichtbare Texte für die Wörterbücher (kurze Texte in 14 Sprachen, lange nur Englisch) |

Ladefolge: direkt nach `js/arena-bots.js` (also nach Erfolgen und Ereignissen, vor `js/spiel.js`).

Bedienung: **Charakterfenster → Reiter „Sammlung“** mit drei Unterseiten (Garderobe, Haustiere, Emotes). Eine Schneiderin
in den Städten gibt es bewusst nicht: Die Garderobe soll überall gehen (auch unterwegs und ohne Kanal), und eine neue
Figur hätte in allen Städten beider Seiten in 2D und 3D aufgestellt werden müssen. Der Reiter „Sammlung“ trägt einen
roten Punkt für neue Haustiere; neue Aussehen zählen nur am Unterreiter „Garderobe“ (sie kommen mit fast jeder Beute).
Weil der Reiter auf Stufe 80 nicht mehr in eine Zeile passt, brechen die Reiter des Charakterfensters jetzt um
(`.char-tabs { flex-wrap: wrap }`, aus `garderobe.js`).

## 1. Garderobe

**Sammeln.** Jedes Aussehen, das die Figur einmal angelegt oder erbeutet hat, kommt in die Sammlung:
- erbeutet: alles, was über `addToBag` in die Tasche kommt (Beute, Händler, Handel, Post, Tagesbelohnung …),
- angelegt: alle 2 s ein Blick auf die Ausrüstung,
- beim ersten Start mit 15.83 einmal alles, was schon in Ausrüstung, Tasche und Lager liegt (ohne „neu“-Zähler).

Gesammelt wird nur, was die eigene Klasse tragen kann (fremde Klassenrüstungen und -waffen nicht). Stufe und Weg
zählen erst beim Übertragen.

**Was ein Aussehen ist.** Je Platz, Form und Stufe, mit der Farbe des Teils – als Schlüssel `Platz:Form:Stufe:Farbe`:

| Teil | Bedeutung |
|---|---|
| Platz | `waffe`, `ruestung`, `helm`, `schultern`, `umhang`, `schild`, `schuhe`, `guertel`, `koecher` |
| Form | Waffen: Waffenart (`sword`, `axe` …); Rüstung und Helm: Klasse; sonst leer |
| Stufe | 0–9 (Gegenstandsstufe) |
| Farbe | `u` Stufenfarbe (episch/legendär/Endboss-Teil, ab Göttlich), `v0`–`v9` Farbvariante (`gearVariant`), `z<Set>` Set (`ITEM_SETS`, auch Klassensets), `e<Prägung>-<Färbung>` Ewig-Teile mit Prägung/Färbung (endgame80.js) |

Beispiele: `ruestung:krieger:3:v4` (Drachenpanzer in Waidblau), `waffe:axe:4:u`, `ruestung:krieger:9:ewyrm-gold`.

**Übertragen.** Auf der Seite Garderobe einen Platz und ein gesammeltes Aussehen wählen: Die Figur links zeigt sofort
eine Vorschau (2D-Bild bzw. 3D-Figur über `drawDoll`), „Aussehen übernehmen“ kostet Gold, „Zurück zum Original“ ist
kostenlos. Werte, Boni, Plus, Seltenheit, Leuchten und Set-Boni bleiben die des echten Teils.

Erlaubt ist nur, was die Figur selbst tragen dürfte (`wearProblem`: Klasse, Weg, Stufe – ein Ewig-Aussehen erst ab
Stufe 80, Zweihänder nur auf dem Weg des Leibes). Waffen bleiben in ihrer Art oder Gruppe, damit Haltung und Schläge
passen: Schwert ↔ Axt, Zweihänder ↔ Streitaxt; Dolch, Bogen, Fächer, Glocke, Stab, Sense und Zepter nur in sich.
Gesperrte Aussehen zählt die Seite unter „Noch gesperrt (Stufe oder Weg)“.

Preis (`GD.preis`): `(80 + 40 × (Stufe+1)²) × (1 + Spielerstufe/20)`, auf 10 gerundet.

| Aussehen | Spielerstufe 10 | Spielerstufe 30 | Spielerstufe 60 | Spielerstufe 80 |
|---|---|---|---|---|
| Stufe 0 (Grundausrüstung, Lv 1) | 180 | 300 | 480 | 600 |
| Stufe 2 (Gut, Lv 10) | 660 | 1.100 | 1.760 | 2.200 |
| Stufe 5 (Meister, Lv 30) | — | 3.800 | 6.080 | 7.600 |
| Stufe 7 (Göttlich, Lv 60) | — | — | 10.560 | 13.200 |
| Stufe 9 (Ewig, Lv 80) | — | — | — | 20.400 |

(— = Aussehen auf dieser Stufe noch gesperrt.)

**Spielstand.** `p.garderobe = { L: [Schlüssel …], neu, init }` (höchstens 800 Einträge, rund 20 KB). Das übertragene
Aussehen steht am Gegenstand: `item.optik = Schlüssel`. Es bleibt am Teil, auch abgelegt in der Tasche. Handel, Post,
Auktionshaus und Konto-Lager gehen über `itemClean` (Weißliste) und nehmen es nicht mit – das Teil ist dort wieder im
Original, die Sammlung bleibt.

**Sichtbar machen (Technik).** Spiellogik, Werte und Speichern sehen immer die echte Ausrüstung. Nur beim Zeichnen
liegt für die Dauer des Aufrufs eine Sicht-Ausrüstung an der Figur (`gdSicht`): je Teil mit Aussehen ein Objekt, das
mit `Object.create` vom echten Teil erbt (Plus, Seltenheit, Boni, Leuchten) und Stufe, Waffenart, Farbvariante, Set,
Prägung und Färbung des Aussehens trägt. `gearHue` liefert für diese Teile genau die Farbe des Aussehens (Marke
`__gdc`). Gemerkt je Ausrüstung, solange dieselben Teile mit demselben Aussehen anliegen.

Umgebogen (Wrapper): `drawPlayer` (2D-Welt, Charakterbild, HUD-Bild), `playerLook` (Nachbilder), `playerKey3`,
`playerConfig3`, `syncPlayer3`, `v3Portrait` (3D-Welt und Figurenbilder), `gearHue`, `addToBag`, `itemCardHtml`
(Zeile „Aussehen: …“ in der Gegenstandskarte), `netPlayerState`, `netApplyState`.

**Mitspieler.** `netPlayerState` hängt an jedes Teil mit Aussehen `eq[Platz].optik` (Schlüssel). Beim Empfang liest
`netApplyState` die Schlüssel vor dem Original (falls das den Zustand säubert), prüft sie streng (`gdLies`: nur Plätze,
Waffenarten, Klassen, Stufen, Varianten, Sets, Prägungen und Färbungen aus den eigenen Tabellen; `gdPasst`: Form passt
zum Teil) und hängt nur geprüfte Schlüssel wieder an. Beim „Betrachten“ kommt die ganze Ausrüstung mit; die Puppe zeigt
das Aussehen, die Kacheln die echten Teile.

**Erfolge** (Kategorie „Sammlung“): Modebewusst (25 Aussehen, 10 Punkte), Volle Kleiderkammer (100 Aussehen,
25 Punkte, Titel „der Gutgekleidete“).

## 2. Haustiere

Kleine Begleiter ohne Kampfwerte. Eigene Entwürfe, je ein 2D-Bild (Seitenansicht, 1–4 Bewegungsbilder, im Spiel 1,3-fach)
und ein 3D-Modell (gemeinsames Skelett mit 11 Knochen, Modellteile mit Zeichentrick-Schattierung und Umriss).

| Tier | Bewegung | Fundort |
|---|---|---|
| Igelchen | läuft | Erfolg „Erste Schritte“ (Stufe 10) |
| Eulenküken | hüpft, Flügelchen | Erfolg „Jäger“ (1.000 Monster) |
| Laternenkäfer | fliegt, leuchtender Hinterleib | Erfolg „Steinbrecher“ (50 Seelensteine) |
| Fuchsjunges | läuft | Dungeon-Bosse, 2 % |
| Glutsalamander | läuft, glühende Flecken | Endbosse, 5 % |
| Kristallgeist | schwebt, kreisende Splitter | Weltbosse, 8 % |
| Schneehase | hüpft | Winterfest: 150 Schneeflocken gesammelt (`p.ev.flTot`) |
| Mondmotte | fliegt | Tagesbelohnung: 7 Tage in Folge |
| Pilzling | watschelt | Tagesbelohnung: 14 Tage in Folge |
| Wolkenschaf | schwebt | Erfolg „Tierfreund“ (5 Haustiere) |

Bosse zählen nur, wenn sie höchstens 10 Stufen unter der eigenen Figur sind (wie die Schneeflocken). Je Kill höchstens
ein Tier, nur Arten, die man noch nicht hat. Erfolge und Winterfest werden alle 3 s nachgesehen, die Serie beim Abholen
der Tagesbelohnung (`claimDaily`). Neue Erfolge: Tierfreund (5 Tiere, 15 Punkte), Tierflüsterer (alle 10, 40 Punkte,
Titel „Tierflüsterer“). Das erste Tier wird gleich gerufen.

**Folgen.** Jede Figur (eigene und Mitspieler) hat höchstens ein Tier, das jedes Gerät selbst bewegt (`hstTick`, jedes
Bild über `netUpdate`): beim Laufen schräg hinter der Figur, in Ruhe schnuppert es alle 2,5–6 s an einer anderen Stelle
um sie herum und schaut zur Figur. Höchstens 430 Pixel/s (auf dem Pferd 1,8-fach), ab 560 Pixel Abstand springt es nach.
Versteckt, wenn die Figur tot, unsichtbar, hoch auf dem Drachen oder in einer anderen Halle ist.

**Zeichnen.** 2D: in die sortierte Szenenliste eingefügt (`collectScene`, nach der Fußlinie) und über `drawSceneEntity`
gezeichnet – auch in der schrägen Pixelsicht; Bilder über `getSprite` (im Pixel-Stil hart gerastert). 3D: im selben
Durchgang wie die Spielerfiguren (`syncPlayer3`), Modelle über `model3`/`actorFor` (gemeinsame Geometrie, Pool); kein
echter Schatten, nur der weiche Bodenschatten. Gebaut in 2,5-facher Größe und klein gezeigt (dünnerer Umriss), in 3D
1,5-mal so groß wie die 2D-Maße. Von Mitspielern zeigt das Spiel die 8 nächsten Tiere, bei Grafik „Niedrig“ die 3 nächsten.

**Netz.** `netPlayerState` sendet `pe` (Kennung des gerufenen Tiers). Beim Empfang zählt nur eine Kennung aus der eigenen
Liste (Objekt ohne Prototyp, `hasOwnProperty`).

**Spielstand.** `p.haustiere = { own: { id: Zeitpunkt }, aktiv: id | '', neu: [ids] }`.

## 3. Emotes

| Emote | Befehle | Dauer |
|---|---|---|
| Winken | /winken, /wink, /hallo, /hi, /wave | 2,6 s |
| Sitzen | /sitzen, /setzen, /sit | bis man sich bewegt |
| Tanzen | /tanzen, /tanz, /dance | bis man sich bewegt |
| Jubeln | /jubeln, /jubel, /cheer | 2,6 s |
| Verbeugen | /verbeugen, /verbeugung, /bow | 2,3 s |
| Lachen | /lachen, /lol, /haha, /laugh (mit Sprechblase „Haha!“) | 2,6 s |

`/emote` bzw. `/emotes` öffnet das Menü. Die Befehle werden schon beim Absenden abgefangen (kein Chat, keine Rückfrage
zu den Chat-Regeln); `netChat` ist zusätzlich umgebogen. **Emote-Menü:** runder Knopf mit Gesicht rechts im Chatkasten
unter dem Schreib-Knopf; das Menü öffnet sich über dem Chat, Tippen außerhalb schließt es. Dieselben Emotes stehen auch
auf der Seite „Emotes“ der Sammlung.

Laufen, Angreifen (auch Fertigkeiten), Sprünge, Wirbel, Aufsitzen und Sterben brechen ab (`emTick`, jedes Bild). Auf dem
Reittier geht kein Emote.

**2D.** Die Figur schaut für die Geste zum Betrachter (Verbeugung: von der Seite), Waffe und Schild sind weggesteckt,
beim Sitzen und Verbeugen auch der Umhang. Neue Bilder im Laufzyklus (`WALK`, figuren.js): ein oder zwei Arme hoch mit
Schwung (Umbiegen von `hArms`), Sitzhaltung mit verschränkten Beinen vor dem Oberkörper (`hLegs`/`gearBoots`), dazu für
Jubeln, Tanzen und Lachen die fröhlichen Augen. Die Verbeugung ist ein eigenes Bild aus der Seitenansicht: Beine stehen,
der Oberkörper neigt sich ab der Hüfte (zwei Stufen). Hüpfer über `p.leap` (der Schatten bleibt am Boden), Wiegen,
Spiegeln und Lachen-Zittern über die Zeichenfläche. Alles nur während `drawPlayer`; danach liegt der echte Zustand wieder an.

**3D.** Nach der normalen Bewegung (`syncPlayer3`) setzt `emPose3` die Knochen: Winken (linker Arm, Hand schwingt),
Sitzen (Hüfte am Boden, Knie angezogen, Arme um die Knie, Umhang liegt hinten), Tanzen (Hüfte wiegt, Arme im Wechsel,
Knie heben, Figur dreht sich langsam), Jubeln (beide Arme hoch, Hüpfer), Verbeugen (Oberkörper nach vorn, rechte Hand
an die Brust), Lachen (zurückgelehnt, schüttelnd). Weich hinein (0,25 s) und bei kurzen Gesten weich heraus (0,3 s).

**Netz.** `netPlayerState` sendet `em = [Nummer in EMOTES, Zähler]`, solange die Geste läuft; ein neuer Zähler startet
sie beim Empfänger neu. Beim Empfang gilt nur `[ganze Zahl 0–5, ganze Zahl]`, sonst wird die Geste beendet.

## 4. Für die Netz-Säuberung (15.83)

Wer `netApplyState` bzw. den Zustand zentral säubert: Die neuen Felder sind `pe` (Text), `em` (zwei Zahlen) und
`eq[Platz].optik` (Text). Meine Wrapper lesen sie vor dem Original und prüfen sie selbst streng; damit sie ankommen,
dürfen sie nur nicht schon vor `netApplyState` (an der Aufrufstelle) entfernt werden. Beim Betrachten (`ir`) kommt
`optik` an den Teilen mit; wird es dort weggesäubert, zeigt nur die Puppe das Original.

## 5. Tests

Playwright (Chromium, SwiftShader), Charakter `newCharacter(…, 'krieger', 0)`, Stufe 80, in 2D (Pixel und fein) und 3D:
Sammeln über `addToBag` und Ausrüstung, Übertragen mit Preis, gesperrte Aussehen (Weg/Stufe), Vorschau, Kauf und
Original über die Seite, Haustiere aus allen Fundorten (Serie 7, Bosse mit erzwungenem Zufall, zu niedriger Boss,
Winterfest, Erfolge), Rufen/Wegschicken, Emotes über Menü, Formular und `netChat`, Abbruch beim Laufen, Mitspieler
aus dem eigenen Zustand (Aussehen, Tier, Geste sichtbar) und mit Fremdwerten (`constructor`, `__proto__`, unbekanntes
Set, falsche Waffenart, falsche Emote-Nummer – alles verworfen), Spielstand (Felder drin, Hilfsfelder nicht),
Ratgeber-Einträge, Gegenstandskarte. Keine `pageerror`.
