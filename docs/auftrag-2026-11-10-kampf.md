# Auftrag 2026-11-10 – Helfer „kampf“ (Aufgaben 02, 03, 10, 14)

Stand: 14.31 (Commit 318e47a). Alle Messungen mit dem echten Spielcode in Headless-Chromium (Playwright, virtuelle Uhr
1/30 s, fester Zufall), 2D für Kampfmechanik, 3D (SwiftShader) für die Kamera. „Vorher“ lief gegen eine unveränderte
Kopie von 14.31, „Nachher“ gegen diesen Stand. Testskripte liegen im Scratchpad des Hauptagenten unter
`kampf17/` (m02.js, m03.js, m10.js, m14.js, m14b.js) – sie sind nicht Teil des Repos.

Nicht möglich in dieser Umgebung: echte Geräte (PC/Handy), echtes Mehrspieler mit zwei Geräten über WebRTC (kein
Signalisierungsdienst erreichbar), FPS-Messungen auf Zielhardware. Die Mehrspieler-Wege wurden mit dem echten
Host- und Mitspieler-Code und Attrappen für die Verbindung geprüft (siehe 10).

---

## 03 | Pfeilreichweite des Fernkampfs

**Status: umgesetzt.**

### Ist-Zustand (gemessen, 14.31)
| Wert | 14.31 | Quelle |
|---|---|---|
| Reichweite Bogen-Grundangriff (Zielwahl `pickTarget`, Abstand − Monsterradius) | 400 | `KIND_BASIC.bow` (kampf.js) |
| Lebensdauer des Pfeils (Flugstrecke) | 460 (400 + 60) | `tryBasicAttack`/`basicTick` |
| Tempo | 620 px/s | dort |
| Tab-Zielwahl | bis 600 (Reichweite + 200, min. 560) | `cycleTarget` (eingabe.js) |
| Hinlaufen zum gewählten Ziel beim Angreifen | nur bis 420 Abstand | spiel.js |
| Falkenblick (Klassensegen) | +12 % … +50 % nur Grundangriff | fernninja.js `bowRangeBonus` |
| Fertigkeiten | Falkenpfeil/Pfeilregen/Splitterfalke 520, Durchschuss 680 | klassen.js |
| Schwerkraft, Höhe | keine (2,5D, Pfeile fliegen eben) | – |
| Mauern | **keine Prüfung** – Pfeile flogen durch Häuser, Mauern, Höhlenwände | `updateProjectiles` |
| Server-Prüfung | keine eigene; der Schütze rechnet den Treffer, der Host übernimmt den Schaden (`netHostDamage`) | netz.js |

Messung (stehendes Ziel, Radius 12, Abstand Mitte–Mitte D):

| D | 300 | 400 | 450 | 500 | 540 | 560 | 600 | 700 | 800 |
|---|---|---|---|---|---|---|---|---|---|
| vorher, Angriff ohne Ziel | Treffer | Treffer | Treffer | – | – | – | – | – | – |
| vorher, mit Tab gewählt | Treffer | Treffer | Treffer | **–** (gewählt, Pfeil fällt bei 455) | **–** | **–** | nicht wählbar | – | – |
| nachher, ohne Ziel | Treffer | Treffer | Treffer | Treffer | Treffer | Treffer | – | – | – |
| nachher, mit Tab gewählt | Treffer | Treffer | Treffer | Treffer | Treffer (läuft 10) | Treffer (läuft 30) | Treffer (läuft 70) | Treffer (läuft 171) | nicht wählbar |

Fliehendes Ziel (knapp in Reichweite gewählt, läuft mit 150 bzw. 250 px/s weg): vorher **0 von 2** Treffern (Pfeil
verfiel nach 455), nachher 2 von 2 (Flugstrecke 659 bzw. 836).
Mauer (Spieler 5 Kacheln vor einer Mauer, Ziel 2 Kacheln dahinter, Abstand 256): vorher **Treffer durch die Mauer**,
nachher kein Treffer (Pfeil endet nach 152 an der Mauer); Falkenpfeil und Durchbohrender Schuss ebenso 0 Treffer
(Gegenprobe ohne Mauer auf gleiche Entfernung: 4 bzw. 1 Treffer).

### Ursachen
1. Tab wählt bis 600, der Pfeil verfällt bei 460 und die Figur läuft erst ab 420 nicht mehr hin: Ziele zwischen etwa
   440 und 600 waren auswählbar, aber nicht treffbar („Pfeile verschwinden zu früh“).
2. Der Grundschuss reichte weniger weit als die Bogen-Fertigkeiten (400 gegen 520).
3. Ein Pfeil mit Ziel lenkt zum Ziel nach; die Flugstrecke war genau Reichweite + 60, ein weglaufendes Ziel wurde nie
   eingeholt.
4. Geschosse kannten keine Hindernisse.

### Änderung
- Bogen-Grundangriff 400 → **520** (+30 %, gleich den Fertigkeiten „bis 520 weit“; keine willkürliche Zahl, sondern die
  vorhandene Bogen-Reichweite). Mit Falkenblick weiter wie bisher (+12 … +50 % → bis 780).
- Pfeiltempo 620 → **760 px/s** (`BOW_ARROW.speed`): die Flugzeit bis zur vollen Reichweite bleibt bei ~0,76 s (vorher
  0,74 s bis 460).
- Pfeil mit Ziel darf `0,4 s × Tempo` (304) länger fliegen, um ein Ziel einzuholen, das beim Loslassen in Reichweite war
  (`BOW_ARROW.chase`). Pfeile ohne Ziel weiterhin genau Reichweite + 60. Endliche Lebensdauer bleibt (kein Leck).
- Hinlaufen zum bewusst gewählten Ziel jetzt bis zur Tab-Reichweite (`max(420, Reichweite + 200)`), also läuft die Figur
  in Reichweite und schießt, statt ins Leere zu schießen.
- Pfeile (alle Geschosse mit `style: 'arrow'`: Grundschuss, Falkenpfeil, Durchbohrender Schuss, Pfeile der Monster,
  Darstellung der Mitspieler-Pfeile) enden an Mauern, Häusern, Palisaden, Säulen, Höhlenwänden und dem Felsrand
  (`tileBlockedFlying`, dieselbe Regel wie für den fliegenden Drachen); über Bäume, Felsbrocken und Wasser fliegen sie
  weiter. Geprüft wird in Schritten ≤ 12 px (kein Überspringen dünner Mauern), mit kleinem Staubeinschlag.
  Die Schattenspirale des Durchbohrenden Schusses wird auf die freie Strecke gekürzt.
- Mitspieler-Darstellung: gleiches Tempo, Zielbezug in `netSkillFx` bis zur echten Reichweite (vorher fest 520).

Dateien: js/kampf.js, js/spiel.js, js/fernninja.js, js/interaktion.js, js/netz.js.

### Offen / Einschränkungen
- Pfeilregen und Splitterfalke (Bogenwurf von oben) prüfen bewusst keine Mauern. Zauber anderer Klassen (Feuerball,
  Schädel …) fliegen weiter durch Mauern – nicht Teil dieser Aufgabe; gleiche Regel wäre leicht übertragbar (Entscheidung).
- Tab und Auto-Ziel prüfen keine Sichtlinie: ein Ziel hinter einer Mauer bleibt wählbar, der Pfeil schlägt dann in die Mauer.
- Kein eigener Server: der Treffer wird beim Schützen gerechnet, der Host übernimmt ihn. Reichweite und Mauer sind darum
  auf dem Gerät des Schützen geprüft (wie alle anderen Treffer im Spiel); eine Prüfung beim Host wäre eine neue
  Architekturentscheidung.
- PvP: Bogen 520 gegen Zauber 230–240 vergrößert den Abstandsvorteil im Duell/Arena. Nicht neu gemessen
  (`node tools/balance-sim.js --pvp --wege ninja.falke` empfohlen).
- Latenz: der Pfeil fliegt lokal; beim Mitspieler fliegt nur die Darstellung. Keine eigene Latenzmessung möglich.

---

## 10 | XP-, Loot- und Questberechtigung

**Status: umgesetzt** (mit den unten genannten Grenzen der Architektur).

### Ist-Zustand und Ursache
- Allein: jeder Kill gibt EP, Gold/Beute und Auftragsfortschritt (`rewardKill`, kampf.js) – unverändert.
- Mehrspieler: der Kanal-Host rechnet die Monster; beim Tod schickt er `{t:'kill', id}` an alle. Jeder Mitspieler
  entschied dann selbst mit `netShares`: **eigener Treffer in den letzten 60 s ODER näher als 700 am Monster**. Der Host
  selbst ebenso. Damit bekam jeder Zuschauer, AFK-Spieler oder Vorbeilaufende im Umkreis von 700 volle EP, eigene
  Beutewürfe und Auftrags-Kills – Ursache des Fehlers.
- EP, Beute und Aufträge hängen alle an `rewardKill`; es gibt keine getrennten Wege (gut: eine Prüfung genügt).
- Gruppen (gruppe.js) teilen EP über `partyXp` an Mitglieder in 700 Umkreis (lebend) – das blieb.

### Neue Regel (eine Prüfung für alle drei Belohnungen: `netEligible`, netz.js)
1. Berechtigt ist, wer das Monster in den letzten 60 s selbst getroffen hat – auch über Diener/Beschwörungen
   (deren Treffer laufen auf dem Gerät des Besitzers bzw. mit `source = Diener` durch `damageMonster`), mit
   Gift/Brand/Blutung (die Marke setzt der auslösende Treffer, Ticks selbst markieren nicht) oder mit Betäuben/
   Verlangsamen (jede Treffermeldung zählt). Auch nach dem eigenen Tod.
2. Oder: ein Mitglied der **eigenen Gruppe** hat getroffen, und man lebt und ist näher als 700 am Monster (gleiche
   Regel wie die Gruppen-EP). Es zählt die Gruppe im Moment des Todes: Beitritt während des Kampfes zählt ab dann,
   Austritt bedeutet nur noch eigene Treffer.
3. Nur Nähe reicht nicht mehr.

Umsetzung: Der Host merkt sich je Monster die Treffer (`m.tags`: Name → Zeit, `netTag`) und schickt beim Tod die Liste
der Berechtigten mit (`{t:'kill', id, w:[Namen]}`). Mitspieler entscheiden nach dieser Liste plus ihrer Gruppe.
Monster aus einem Seelenstein markieren auch den Stein, Seelenkristalle ihren Endboss (wer Wellen/Kristalle bekämpft,
kämpft um Stein/Boss). Marken werden gelöscht beim Tod, bei der Wiederkehr (`reviveMonster`) und wenn ein Monster heil
nach Hause zurückkehrt (Reset/Evade). Doppelte Kill-Meldungen geben weiterhin nur einmal (bestehende Sperre über
`m.dead`/`predictedDead`); der eigene Treffer-Zeitstempel wird nach der Belohnung gelöscht.
Ältere Host-Version (ohne Liste): Mitspieler mit neuer Version nehmen nur noch eigene Treffer bzw. Gruppenmitglied in
der Nähe. Hinweistext im Kanalfenster angepasst (de/en).

Dateien: js/netz.js, js/kampf.js, js/gegner.js, js/oberflaeche.js, js/sprachen/en.js.

### Tests (m10.js, echter Code, Netz per Attrappe; „EP/Kills/Gold/Auftrag“ = Änderung durch den Kill)
| Fall | vorher | nachher |
|---|---|---|
| H1 Host steht daneben, Fremde tötet | 1/1/2/1 | **0/0/0/0** |
| H2 Host trifft einmal, Fremde tötet | 1/1/6/1 | 1/1/2/1 |
| H3 Diener des Hosts trifft, Fremde tötet | 1/1/2/1 | 1/1/6/1 |
| H4 Host in Gruppe mit der Töterin, nah | 1/1/6/1 | 1/1/6/1 |
| H5 Gruppe, Host 900 entfernt | 0 | 0 |
| H6 Host trifft, Monster läuft heim und heilt (Reset), dann tötet Fremde | 1/1/3/1 | **0** (Marke gelöscht) |
| H9 eigener Treffer vor 61 s | – | 0 |
| C1 Mitspieler als Zuschauer daneben, keine Gruppe | 1/1/5/1 | **0** |
| C2 selbst getroffen | 1/1/5/1 | 1/1/5/1 |
| C3 doppelte Kill-Meldung (zweite) | 0 | 0 |
| C4 Gruppe, Mitglied trifft, ich nah | 1/1/6/1 | 1/1/3/1 |
| C5 Gruppe, ich 900 weg | 0 | 0 |
| C6 Gruppe, ich tot daneben | 1/1/5/1 | **0** |
| C7 in Gruppe, aber nur ein Fremder trifft | 1/1/5/1 | **0** |
| C8 alter Host ohne Liste, nicht getroffen, nah | 1/1/2/1 | **0** |
| C9/C10 alter Host, selbst bzw. eigener Diener trifft | 1 | 1 |
Kill-Meldung des Hosts nachher z. B. `{"t":"kill","id":7233,"w":["Ich","Alice"]}`. Gold schwankt (Zufallswurf).

### Grenzen / offene Entscheidungen
- Es gibt keinen eigenen Server. Die Liste entscheidet der Host; die Belohnung schreibt sich aber jedes Gerät selbst gut
  (Spielstand liegt beim Spieler). Ein manipulierter Client kann sich weiter Belohnungen geben – das ist mit dieser
  Architektur nicht zu verhindern, nur mit einem Server, der Spielstände führt.
- Spieler mit **alter Version** im Kanal ignorieren die Liste und nehmen weiter nach Nähe.
- Kein Mindestbeitrag: ein einziger Treffer (auch 1 Schaden) berechtigt. Eine Schwelle (z. B. Anteil am Schaden) ist
  vorbereitbar (`m.tags` könnte Schaden summieren), aber eine Balance-Entscheidung.
- Heiler ohne Gruppe, die nur heilen, bekommen nichts (Heilen markiert kein Monster); in einer Gruppe über Regel 2.
- Namen identifizieren Spieler (wie die Gruppen). Zwei gleichnamige Spieler im Kanal würden sich die Marke teilen.
- Gruppe/Beute in Instanzen und Arenen laufen über denselben `rewardKill`-Weg; eigene Sonderregeln dort nicht geändert.

---

## 14 | Ausweichchance und Kampfberechnung

**Status: Analyse und Vorschlag fertig, keine Neubalance (Zustimmung nötig). Echte Fehler behoben.**

### Formel (Ist, 14.31)
- `s.dodge` = Ausrüstung (Umhang Stufe 2–10: 1–5 %, Schuhe 2–9 %, Ninja-Rüstung und -Helm 0,8 % × Stufe; Plus-Stufen
  erhöhen die Grundwerte) + Boni „Ausweichen“ (je Teil 1–3 %, max. 6 %, Summe aller Teile max. 20 %, `BONUS_CAPS.dodge`)
  + Geschick × 0,15 % (`ATTR_PT.dodge`, auch Geschick aus Ausrüstung) + Buffs (Schattenschleier, Ulti des Ninja: +30 %
  für 8 s). Obergrenze **45 %**. Keine Abhängigkeit von Stufe oder Gegnerstufe.
- Würfel: genau **ein** Wurf je Treffer in `damagePlayer` (kampf.js), nach dem Schutz nach Wiederbeleben, **vor** dem
  Blocken (Blocken nur mit Schild, max. 40 %), danach Schild-Buffs. Gift/Schaden über Zeit (`o.dot`) weicht nie aus.
- PvP (Duell, Turnierarena): Ausweichen und Blocken ×0,5 (`PVP_DMG.dodgeMul`). Monster weichen nie aus.
- Alle Schadensquellen am Spieler (Nahkampf, Geschosse, Boss-Fähigkeiten, Lachen in Instanzen, Netz-Treffer `mhit`)
  laufen durch `damagePlayer` – keine Doppelwürfe gefunden.
- Mehrspieler: Der getroffene Spieler würfelt auf seinem Gerät (Leben liegt beim Spieler) – nicht der Host.

### Messung (m14.js, je Fall 4000 Treffer gegen `damagePlayer`)
| Figur | Anzeige | gemessen PvE (Gegner Stufe 5 / 80) | PvP | Gift |
|---|---|---|---|---|
| Krieger Lv10 Stufe 1 | 1 % (roh 1,4) | 1,5 / 1,3 % | 0,7 % | 0 |
| Krieger Lv80 Stufe 9, Geschick 60 | 29 % | 28,6 / 28,6 % | 14,5 % | 0 |
| Krieger Lv80 mit Schild | Ausw. 29 %, Block 31 % | Ausw. 28,9 %, **Block 22,3 %** | 14,3 / 12,8 % | 0 |
| Ninja Lv10 Stufe 1 | 4 % | 4,3 / 4,4 % | 2,1 % | 0 |
| Ninja Lv50 Stufe 5, Geschick 60 | 35 % | 34,4 / 34,2 % | 17,5 % | 0 |
| Ninja Lv80 Stufe 9 (Geschick 60 bzw. 300) | 45 % (Grenze) | 45,1 / 45,5 % | 22,2 % | 0 |
| Ninja + Schattenschleier (Lv10 / Lv50) | 34 / 45 % | 32,3 / 45,0 % | – | – |
| Magier, Nekromant Lv80 Stufe 9 | 20 % | 19–20 % | 10–11 % | 0 |
| künstlicher Abzug −50 % | vorher **„−30 %“** | 0 % | – | – |
Aufschlüsselung (m14b.js): Ninja Lv80 = 39,8 % Ausrüstung + 14,4 % Geschick (60 eigene + 36 aus Ausrüstung) = 54 % →
Grenze 45 %; Krieger Lv80 = 19,6 % Ausrüstung + 9 % Geschick. Mit Ausweich-Boni (bis +20 %) erreicht jede Klasse die 45 %.

Ergebnis: Anzeige und Messung stimmen im Rahmen der Stichprobe (±1,5 Punkte) überein; Gegnerstufe ändert nichts;
PvP halbiert wie dokumentiert; Gift weicht nie aus. Abweichungen, die man sieht: (a) Blocken wirkt nur auf nicht
ausgewichene Treffer – angezeigt 31 %, Anteil aller Treffer (1 − 0,29) × 0,31 = 22 %; (b) die Anzeige zeigte keine Grenze
und nicht den PvP-Wert; (c) negative Werte wären angezeigt worden.

### Behobene Fehler
- Ausweichen und Blocken können nicht mehr unter 0 fallen (Anzeige „−30 %“ bei Abzügen) – `Math.max(0, …)`.
- Charakterfenster → Werte: „Ausweichen 45 % / 45 % · PvP 23 %“, „Blocken 31 % / 40 % · PvP 16 %“ (Grenze und Wert gegen
  Spieler). Keine neuen Wörter (keine neuen Übersetzungen nötig).
- Obergrenze als Tabelle `DODGE_RULES.cap` (spieler.js) statt fester Zahl – Wert unverändert 0,45; damit lassen sich
  Varianten ohne Codeänderung messen (`tools/balance-sim.js --vorschlag-datei`).

Dateien: js/spieler.js, js/oberflaeche.js.

### Auffälligkeiten (nur dokumentiert, nicht geändert – Designfrage)
- Boss-Mechaniken, denen man durch Stellung ausweichen soll (Endboss-„Untergang“ außerhalb der sicheren Kreise,
  Stampfen), sowie die Gift-Lachen in Instanzen (Tick alle 0,5 s) sind ausweichbar und blockbar. Mit 45 % verfehlt jeder
  zweite Tick bzw. fast jeder zweite Boss-Schlag. Vorschlag: diese als `{ dot: true }` bzw. eigene Flagge „nicht
  ausweichbar“ führen.
- Nur der Ninja liegt ohne Ausweich-Boni an der Grenze; alle anderen 16–23 % (Balance-Simulator, Ausrüstung „gut“).

### Vorschlag (parametrisiert, NICHT umgesetzt)
Gemessen mit `tools/balance-sim.js --kurz --ohne-farm --stufen 30,50,80 --ausr gut` und
`--vorschlag-datei` mit `[{"set":"DODGE_RULES.cap","v":0.40}]` bzw. `0.35` (alle 12 Wege):
| Variante | Ninja Lv50 EHP | Ninja Lv80 EHP | andere Klassen |
|---|---|---|---|
| Ist: Grenze 45 % | 30 344 | 52 676 | unverändert (unter der Grenze) |
| A: Grenze 40 % | 27 815 (−8,3 %) | 48 287 (−8,3 %) | unverändert |
| B: Grenze 35 % | 25 675 (−15,4 %) | 44 572 (−15,4 %) | unverändert |
Gesamtwertung (Schaden) bleibt in allen Varianten im Rahmen des Rauschens (±3 Punkte); die Überlebenszeit („Tod“) im
Kurzlauf schwankt zu stark für Aussagen. Weitere sinnvolle Varianten (Parameter vorhanden bzw. klein nachzurüsten):
- C: `PVP_DMG.dodgeMul` 0,5 → 0,4 (nur PvP; messen mit `--pvp`).
- D: weiche Grenze (über 30 % zählt jeder Punkt halb) – braucht eine Zeile in `playerStats`.
- E: Ausweichen nicht gegen Boss-Mechaniken (siehe oben).
Es gibt **keinen bestätigten Zielwert** – eine Entscheidung des Nutzers ist nötig, bevor eine Variante übernommen wird.

---

## 02 | Schulterkamera und Kamerafehler

**Status: teilweise umgesetzt** (Verdecken/Durchstoßen und Touch behoben; „Springen“ nur als Randfall gefunden; keine
echten Geräte).

### Aufbau (drei-kern.js, eingabe.js)
Schulterblick = `opts.camera === 'schulter'` im 3D-Modus: Kamera 9,5 × Zoom (Mausrad 0,6–1,8) hinter der Figur, feste
Neigung 0,5 rad (29°), Blickpunkt 1 Einheit über dem Boden, Sichtwinkel 45°. Drehen per Ziehen (rechte Maustaste bzw.
Finger auf dem Bild) setzt `V3.yawGoal`, die Kamera dreht weich nach. Der Brennpunkt folgt der Figur weich, bei Sprüngen
über 6 Kacheln sofort. Laufen ist kamerabezogen (`moveVector`), Angriffe und Fertigkeiten richten sich am Ziel aus, nicht
an der Kamera – die Kamera beeinflusst also weder Schussrichtung noch Treffer (Treffer rechnet die Spiellogik in der
Ebene). Gegen Verdecken gab es nur das gerasterte Durchsichtsloch um die Figur (`V3.fadeScreen`, wie in der normalen
Kamera). Eine Kollision der Kamera gab es nicht.

### Reproduziert (m02.js, 3D, 1280×720; „verdeckt“ = Anteil der 40 Messpunkte auf der Linie Blickpunkt→Kamera unter der
Oberkante eines Hindernisses)
| Fall | vorher | nachher |
|---|---|---|
| Figur steht nördlich an einem Haus, Kamera im Süden | 14/40 verdeckt, Figur hinter dem Dach (Bild k02_vorher_haus) | 5/40 (nur Dachtraufe direkt über der Figur, gerastert), Kopf sichtbar, Neigung 69° |
| rückwärts an die Hauswand gelaufen | 15/40 | 7/40 |
| Höhlenwand direkt hinter der Figur (Kristallkaverne) | untere Körperhälfte vom Fels verdeckt | Figur frei, nur Füße am Fels, Neigung 54° |
| Drehen per rechter Maustaste (24 Bilder) | gleichmäßig, max. 0,80 Einheiten/Bild | gleichmäßig, max. 0,67 (Rückkehr der Neigung weich) |
| vom Haus weglaufen | – | Neigung kehrt weich zurück, max. 0,23 Einheiten/Bild relativ zur Figur |
| Bodenpunkt am oberen Bildrand (Zielen/Laufziel) | 42 Kacheln voraus | 26 Kacheln voraus (steilere Kamera), nie hinter der Figur |
| Zwei Finger (Handy 844×390): zweiter Finger kommt dazu und geht | zweiter Finger übernimmt, Drehung des ersten danach verloren (yaw −0,80) | zweiter Finger ignoriert, erster dreht weiter (−0,64) |
| normale Kamera an derselben Stelle | (1721,5 / 12,516 / 17,472) | identisch |

### Ursachen und Änderungen
1. **Verdecken/Durchstoßen**: keine Kollisionsprüfung. Neu `v3ShoulderPitch`: jedes Bild werden die Kacheln zwischen
   Figur und Kamera (Mitte und ±0,35 seitlich) geprüft; liegt ein festes Hindernis (Haus 3,4, Säule 2,6, Mauer/Palisade/
   Höhlenwand/Felsrand 1,8 Einheiten – Höhe des Hausdachs im 3D gemessen: bis 3,3) unter der Sichtlinie, hebt sich die
   Kamera, bis die Linie über die Kante geht (höchstens 69°, normale Kamera 49°). Steiler werden schnell
   (k = 14/s), zurück langsam (2,5/s), damit nichts springt. Der Abstand bleibt, die Kamera rückt also nicht in die Figur.
   Bäume bleiben außen vor (schmal; Raster).
2. **Figur unter Dachtraufen**: Das Durchsichtsloch richtete sich nur nach der Bildhöhe der Figur und wurde bei steiler
   Kamera winzig. Im Schulterblick jetzt mindestens 1,3 Kacheln seitlich der Figur groß.
3. **Bodenpunkt über dem Horizont**: `v3ScreenToWorld` teilte durch die Strahl-Neigung; zeigte der Strahl waagerecht
   oder nach oben, lag der Punkt hinter der Kamera. Mit den Standardwerten nicht erreichbar (oberer Rand 6° unter dem
   Horizont), aber bei anderen Seitenverhältnissen/Werten möglich. Jetzt im Schulterblick höchstens 60 Kacheln
   voraus; normale Kamera unverändert.
4. **Touch mit zwei Fingern**: ein zweiter Finger überschrieb das laufende Drehen. Jetzt bleibt der erste Finger
   zuständig.

Dateien: js/drei-kern.js, js/eingabe.js.

### Geprüft / nicht geprüft
- Geprüft (Headless, SwiftShader): Stillstand, Laufen rückwärts an eine Wand, Weglaufen, Drehen mit Maus, Zielen
  (Bodenpunkt), Dungeon-Gang, Hausnähe, Handy-Querformat 844×390 (Touch-Ereignisse), normale Kamera unverändert.
- Nicht eigens geprüft: Sprint/Reiten, Sprung-Fertigkeiten, Tod/Wiederbeleben, Gebietswechsel (Brennpunkt springt dort
  wie bisher sofort, die Neigung wird beim Verlassen des Schulterblicks zurückgesetzt), echte Geräte, Cursor-Lock (das
  Spiel nutzt keinen Pointer-Lock), FPS. Die Prüfung kostet je Bild etwa 120 Kachel-Abfragen (vernachlässigbar).
- „Springen beim Zielen/Drehen“ ließ sich mit Maus und Tastatur nicht reproduzieren (Kamerabewegung je Bild gleichmäßig);
  gefunden wurden nur der Zwei-Finger-Fall und der Horizont-Randfall. Falls der Nutzer einen konkreten Ablauf kennt,
  bitte nachreichen (Rückfrage).
- Schwäche des Ansatzes: Steht die Figur direkt unter einer Dachtraufe, bleibt das Dach im Bild (gerastert wie in der
  normalen Kamera). Alternative wäre eine heranrückende Kamera (Federarm) – bewusst nicht gewählt, weil sie bei Wänden
  direkt hinter der Figur in die Figur fährt.
