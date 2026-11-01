# Endendboss-Entwurf: Abaddor, der Höllenkaiser

Stand: Entwurf (Version 12.9). Das 3D-Modell ist gebaut (`js/teufel.js`, `abaddor3`), steht aber noch nicht in der Welt.
Kampf, Arena und Belohnungen folgen nach Freigabe dieses Entwurfs.

## 1. Idee

Der letzte und stärkste Boss des Spiels. Ein riesiger Teufel mit Dreizack, der nur von einer eingespielten Gruppe aus
**6 bis 7 Spielern** besiegt werden kann. Er prüft alles: Ausweichen, Aufteilen, Schaden auf Befehl und Durchhalten.

## 2. Aussehen (3D-Modell, fertig)

- **Größe:** etwa viermal so hoch wie ein Spieler (Modellmaßstab 3,6 × Grundgröße). Man erkennt ihn schon von Weitem.
- **Körper:** massiger roter Oberkörper mit Brust- und Bauchmuskeln und glühenden Lavaadern. In der Brust sitzt das
  **Höllenherz**, ein glühender Kristall, gefasst von Obsidianzacken. Es ist der Schwachpunkt in Mechanik 4.
- **Rüstung:**
  - Obsidian-Schulterpanzer mit Goldrand und je drei Stacheln, auf der linken Schulter ein Schädel.
  - Armschienen mit Dornen.
  - Lendenpanzer mit Schädelschnalle, Stofflatz und Seitenplatten.
- **Beine:** Bocksbeine mit schwarzem Fell, Knie nach vorn, Sprunggelenk nach hinten und gespaltene Hufe.
- **Kopf:**
  - kantiges Teufelsgesicht mit gelb glühenden Augenschlitzen, Fängen und spitzem Kinnbart
  - lange spitze Ohren
  - riesige, geschwungene Hörner
  - Flammenkrone zwischen den Hörnern und Flammenmähne am Hinterkopf
- **Flügel:** riesige Fledermausflügel mit Obsidianstreben und Knochenkrallen.
- **Schwanz:** mit glühender Spatenspitze.
- **Dreizack:** Obsidianschaft mit Goldbändern. Die Mittelzinke ist gerade, die Seitenzinken sind geschwungen. Alle drei
  haben glühende Lavakanten und Widerhaken, an der Gabel sitzt ein Höllenfeuer-Kristall.

**Zweite Form (ab 50 % Leben), wird beim Kampf gebaut:**
- Die Haut wird fast schwarz mit hellen Glutrissen.
- Die Flügel stehen in Flammen, die Hörner glühen an den Spitzen.
- Der Dreizack brennt durchgehend.
- Er wird 15 % größer, und um ihn kreist ein Glutsturm.

## 3. Zugang

- **Ort:** eine eigene Karte, der **Thron der Unterwelt**. Man erreicht sie über ein Höllenportal tief im Höllenschlund
  (Karte 6).
- **Gruppe:** mindestens 6, höchstens 7 Spieler, alle in derselben Gruppe.
- **Stufe:** alle Spieler mindestens Stufe 60.
- **Ausrüstung:** Jeder Spieler muss mindestens 6 angelegte Teile tragen, die alle mindestens Stufe-60-Ausrüstung
  sind, mit mindestens 3 Boni pro Waffe und Rüstung.
  - Das Portal prüft das beim Betreten und zeigt, wer noch nicht bereit ist und warum.
- **Versuche:** Pro Tag gibt es einen Versuch mit Beute. Danach kann man üben, bekommt aber keine Beute.

## 4. Werte

| Wert | Abaddor | zum Vergleich: Lichkönig Morrak (Raid für 5) |
|---|---|---|
| Stufe | 70 | 64 |
| Leben | etwa 5× Morrak, ausgelegt auf 6–7 gut ausgerüstete Spieler und rund 8–10 Minuten Kampf | 350 × Grundleben |
| Schaden | ein Treffer mit dem Dreizack nimmt einem Stufe-60-Spieler ohne gute Rüstung etwa 60 % Leben | – |
| Wut-Timer | nach 12 Minuten: Höllenfeuer über die ganze Arena, die Gruppe verliert | – |

Die genauen Zahlen stelle ich mit der Kampfsimulation ein, so wie bei den bisherigen Endbossen.

## 5. Phase 1 (100 % bis 50 % Leben)

### 1. Dreizackstoß (Grundangriff)
- Drei schnelle Stiche nach vorn in einem schmalen Kegel, gefolgt von einem Rundumschlag mit dem Schwanz.
- Wer vorne steht, braucht hohe Verteidigung oder einen Schild.

### 2. Vernichtungsschlag (Ausweichen!)
- Alle 40 bis 50 Sekunden hebt Abaddor den Dreizack mit beiden Händen über den Kopf. Text: **„Abaddor hebt den Dreizack!“**
- Die Arena teilt sich in **vier Viertel**. Drei Viertel glühen rot auf, eines bleibt dunkel und sicher.
- Nach 4 Sekunden rammt er den Dreizack in den Boden.
  - In den roten Vierteln brechen Höllenflammen und Erdspalten aus dem Boden.
  - Wer dort steht, verliert 90 % seines Lebens und wird hochgeschleudert.
- Man muss also rechtzeitig ins sichere Viertel laufen.

### 3. Höllenbrut (Helfer)
- Bei 85 %, 70 % und 55 % öffnet er drei Höllenrisse am Rand und ruft:
  - 4 Höllenhunde (schnell, beißen die Heiler)
  - 2 Höllenwächter (langsam, mit Schild)
- Erreicht ein Helfer den Boss, opfert er sich und heilt Abaddor um 3 %. Die Gruppe muss die Helfer also abfangen.

### 4. Siegel der Unterwelt (zerstören, damit er wieder Schaden nimmt)
- Bei 75 % und bei 55 % fliegt Abaddor in die Mitte und wird von einer roten Schutzkuppel umhüllt. **Er nimmt keinen
  Schaden.**
- An den vier Rändern der Arena wachsen **vier Höllensiegel** aus dem Boden: schwarze Obelisken mit glühender Rune. Von
  jedem Siegel führt eine Feuerkette zur Kuppel.
- Die Gruppe muss sich aufteilen und **alle vier Siegel in 40 Sekunden zerstören**. Jedes Siegel hat eigenes Leben,
  und solange es steht, ruft es kleine Feuerwellen.
- Danach zerbricht die Kuppel:
  - Abaddor ist 8 Sekunden lang betäubt.
  - Sein **Höllenherz liegt offen**, und er nimmt in dieser Zeit 50 % mehr Schaden.
- Steht nach 40 Sekunden noch ein Siegel, explodiert pro Siegel eine Höllenfeuer-Welle über die ganze Arena.

### 5. Glutregen (Verteilen)
- Unter drei zufälligen Spielern erscheinen leuchtende Kreise am Boden. Nach 2 Sekunden fällt dort ein Lavabrocken.
- Wer im Kreis steht, wenn er einschlägt, nimmt Schaden. Stehen mehrere zusammen, trifft es alle.

## 6. Übergang bei 50 %: Entfesselung

- Er brüllt, wird schwarz-glühend und größer, und seine Flügel fangen Feuer.
- Alle Spieler werden zurückgestoßen.
- Ab jetzt gilt **Zweite Form**: 25 % mehr Schaden und 25 % schnellere Angriffe.

## 7. Phase 2 (50 % bis 0 %)

### 1. Höllensturm (Dashes)
- Er markiert nacheinander drei Spieler mit einer roten Linie am Boden. Nach je 1,2 Sekunden stürmt er die Linie entlang.
- Wer getroffen wird, wird umgeworfen.
- Auf seiner Bahn bleibt 6 Sekunden lang ein Feuerstreifen liegen.

### 2. Vernichtungsschlag II
Wie in Phase 1, aber er wechselt zwischen zwei Mustern:
- **Ring:** außen brennt alles, in der Mitte unter ihm ist es sicher. Man muss zu ihm hin.
- **Kern:** die Mitte brennt, man muss weit weg.
Unter 25 % schlägt er zweimal hintereinander zu, mit wechselndem Muster.

### 3. Dreizackwurf
- Er schleudert den Dreizack auf die Position eines Spielers. Dort steckt er 6 Sekunden im Boden, zieht Spieler in der
  Nähe langsam an und brennt.
- Ohne Dreizack kämpft er mit den Klauen weiter: schneller, aber mit kürzerer Reichweite.

### 4. Seelenkette
- Zwei zufällige Spieler werden mit einer glühenden Kette verbunden.
- Entfernen sie sich mehr als eine kurze Strecke voneinander, nehmen beide Schaden.
- Nach 10 Sekunden reißt die Kette.

### 5. Weitere Wellen
- Höllenbrut bei 40 % und 20 %, dann auch mit 2 Höllenrittern.
- Siegel der Unterwelt noch einmal bei 30 %.

### 6. Letzte Glut (unter 10 %)
- Vom Rand her steigt Lava, und die Arena wird immer kleiner.
- Jetzt zählt nur noch Schaden.

## 8. Belohnung

- **Höllenkaiser-Ausrüstung** (Stufe 65): ein neues Set mit eigenem Aussehen, eingefärbt in Schwarz, Rot und Gold.
  Es hat einen Setbonus und besonders hohe Boni.
- **Abaddors Dreizack:** eine neue Waffe, selten. Für Krieger ist es ein Speer, für alle anderen ein Zauberstab.
- Viele Seelensteine, Segensschriftrollen, Switcher und Aufwertungsteile.
- **Titel** „Teufelsbezwinger“ unter dem Namen.
- Sehr selten: ein **Höllenross** als Reittier mit brennender Mähne.

## 9. Umsetzung (Technik)

- **Modell:** `abaddor3` in `js/teufel.js`. Das Skelett kommt aus humanoid3, deshalb funktionieren Laufen, Ausholen und
  Schlagen.
- **Kampf:** baut auf den bestehenden Endbossen auf (Phasen, Schildkristall, Vernichtungs-Ulti, Helfer in `endboss.js`).
  Neu dazu kommen:
  - Viertel- und Ringmuster am Boden
  - Siegel mit Feuerketten
  - Dashes mit Linienwarnung
  - Dreizackwurf
  - Seelenkette
  - schrumpfende Arena
- **Mehrspieler:** Wie bei den anderen Bossen rechnet der Host den Kampf. Warnungen und Muster gehen an alle.
- **Bodenmarkierungen:** nur Kreise, Viertel, Ringe und Linien, die genau zeigen, wo Schaden kommt. Keine Dreiecke,
  keine Runensterne.

## 10. Offene Fragen an dich

1. Passt der Name „Abaddor, der Höllenkaiser“ oder hast du einen eigenen?
2. Soll die Arena eine eigene Karte sein (mein Vorschlag) oder ein Bereich im Höllenschlund?
3. Wie streng soll die Ausrüstungsprüfung sein? Vorschlag: 6 Teile mit mindestens Stufe 60 und 3 Boni auf Waffe und
   Rüstung.
4. Ein Versuch mit Beute pro Tag oder pro Woche?
