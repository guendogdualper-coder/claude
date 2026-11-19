## 12 | Nekromanten-Beschwörungen als Tanks

**Status: umgesetzt** (Grenzen siehe offene Punkte)

**Ursache.** Es gab keine Bedrohung. Die Zielwahl der Monster (gegner.js) folgte dem ersten Angreifer: `aggro()` setzt ein Ziel nur, wenn das Monster noch keins hat. Ein Monster, das den Nekromanten jagt, blieb bei ihm, egal wie viel die Diener zuschlugen. Diener wurden nur Ziel, wenn sie zuerst trafen oder das alte Ziel wegfiel. Dazu kam:
- Im Mehrspieler kamen Diener von Mitspielern beim Host nur als Bild an (`rp.allies`). Monster konnten sie nie angreifen.
- Treffer dieser Diener zählten beim Host als Treffer des Spielers.
- Aggressive Monster bemerkten Spieler durch Wände: Es gab nur eine Abstandsprüfung von 150 px.

**Änderung.**
- **Bedrohungstabelle je Monster** (`m.threat`, gegner.js). Sie wird nur dort geführt, wo die Monster laufen: beim Host oder im Einzelspiel. Gefüllt wird sie in `damageMonster` (kampf.js), und zwar mit dem tatsächlich abgezogenen Leben.
  - Diener erzeugen das **6-fache**, Bosse rechnen Diener nur halb so hoch (**×3**).
  - Die Bedrohung verfällt mit 0,85 je Sekunde.
  - Ungültige Einträge fallen weg: tot, Diener abgelaufen, mehr als 500 px entfernt, Spieler getarnt.
- **Zielwechsel nach Bedrohung.** Ein jagendes Monster prüft alle 0,4 s. Es wechselt nur, wenn ein Diener beteiligt ist und das neue Ziel mindestens 15 % mehr Bedrohung hat. Für einen Wechsel braucht es freie Sicht (`navSees`) oder weniger als 90 px Abstand.
  - Zwischen Spielern bleibt alles wie bisher, der erste Angreifer behält das Monster. So ändert sich der Gruppenkampf ohne Diener nicht.
  - Es gibt keinen Spott und keinen Zwang: Ein Diener hält ein Monster nur, solange er Schaden macht und lebt.
- **Neues Ziel nach Verlust** (`nextTarget`): zuerst das gültige Ziel mit der meisten Bedrohung, dann wie bisher. Neue Ziele gibt es nur mit freier Sicht. Diener von Mitspielern zählen beim Host mit.
- **Keine Aggro durch Wände.** Die Selbst-Aggro aggressiver Monster braucht jetzt eine freie Linie (`navSight`).
- **Aufräumen.**
  - `releaseAllyTargets` erzwingt sofort eine neue Bedrohungsprüfung.
  - `reviveMonster` und die Rückkehr an den Platz löschen die Tabelle.
  - Tote oder abgelaufene Diener werden ungültig (`allyPresent`).
- **Diener von Mitspielern** (netz.js):
  - Der Client schickt bei Dienertreffern den Platz mit (`dmg … al`). Der Host rechnet Bedrohung und Aggro dem Diener-Objekt `rp.allies[slot]` zu, das jetzt `owner: rp` kennt.
  - Monster des Hosts können diese Diener angreifen. Nahkampftreffer gehen als neue Nachricht `ahit` an den Herrn, dessen Gerät `damageAlly` rechnet.
  - Fernkampfgeschosse prüft wie bisher jeder Client gegen die eigenen Diener.
  - Die Zielwahl rechnet nur der Host, also sehen alle Clients denselben Zielwechsel.
  - `hostHitAt` (Beuteanteil des Hosts) wird von Treffern fremder Diener nicht mehr gesetzt.
- **PvP** ist nicht betroffen: Duell-Stellvertreter laufen nicht über `damageMonster`, Diener gegen Spieler (`allyPickTarget`) ist unverändert.

**Dateien:** js/gegner.js, js/kampf.js, js/netz.js

**Messwerte.** Mit `tank2.js` und der Seitenbibliothek aus tools/balance-sim.js:
- Nekromant Seelen, Ausrüstung std +7, volle Rotation mit Ulti.
- 30 s gegen 3 zähe Monster derselben Stufe (Leben ×30) oder einen Boss (Leben ×6).
- Alle Monster jagen am Anfang den Nekromanten.

| Fall | Anteil Monster-Zeit auf Dienern (alt → neu) | Treffer auf den Nekromanten (alt → neu) | Erster Wechsel (neu) | Dienertode in 30 s (alt → neu) |
|---|---|---|---|---|
| Stufe 30, 3 Monster | 0 → 0,19 | 66 → 51–53 | 0,6–5 s | 0 → 3 |
| Stufe 50, 3 Monster | 0 → 0,20 | 45 → 34 | 0,6 s | 0 → 3 |
| Stufe 70, 3 Monster | 0 → 0,40–0,48 | 72 → 30–38 | 1 s | 0 → 3 |
| Stufe 80, 3 Monster | 0 → 0,79 | 41 → 7 | 1 s | 0 → 0 |
| Boss Stufe 50 (Eiskönig) | 0 → 0 | 9 → 9 | – | 3 → 3 |
| Boss Stufe 70 (Titanenkönig) | 0 → 0,39 | 22 → 14 | 8 s | 3 → 1 |

- Auf Stufe 30 bis 70 sterben die Diener jetzt, weil sie die Schläge wirklich abfangen. Sie sind also nicht unverwundbar.
- Der Boss auf Stufe 50 tötet die Diener sofort, in alt wie neu.
- Herleitung des Faktors 6: Alle drei Diener zusammen machen 10–41 % des Schadens. Mit Faktor 3 wechselten Monster erst nach rund 10 s und hielten Stufe 30–50 nur 10 % der Zeit auf Dienern.

**Tests.**
- **tank.js (alt/neu):**
  - Pet-Tod und Ablauf der Beschwörung: Danach jagt kein Monster ein nicht vorhandenes Ziel (`stale 0`), alle wechseln im nächsten Bild auf den Nekromanten.
  - Wand: Ein aggressives Monster 98 px entfernt hinter einer Mauer aggriert in alt (`chase`) und in neu nicht (`idle`).
  - Gegenprobe ohne Wand: Das Monster aggriert.
- **duo.js (4 Browser, lokaler MQTT-Broker, Host + 3 Clients):** Monster des Hosts nehmen Diener des Mitspielers (Nekromant als Client) als Ziel. `ahit` kommt an, der Client zieht das Leben ab. Nach dem Tod des Nekromanten jagen alle Monster den anderen Teilnehmer.
- **s73:** alle 12 Klassenwege ohne Fehler.

**Offene Punkte.**
- Nicht geprüft: echte Latenz und Paketverlust (nur lokaler Broker), echtes Handy.
- Raid- und Instanzbosse (`type.raid`, `type.inst`) behalten ihre eigene Zielwahl. Sie laufen nicht über die Verfolgungslogik.
- Ältere Clients ignorieren `ahit`: Ihre Diener nehmen dann keinen Nahkampfschaden vom Host. Ältere Hosts ignorieren `al`: alte Rechnung.
- Kein neuer Spott-Skill. Er passt nicht ins bestehende Skilldesign, der Auftrag erlaubt ihn nur optional.
- Bedrohung zwischen Spielern ändert sich bewusst nicht. Das wäre eine eigene Balance-Entscheidung.

## 16 | PvE-Arena für Solo und Duo mit schnelleren Gegnerwellen

**Status: umgesetzt.** Einschränkung: Duo geht nur in einem Mehrspieler-Kanal. Ohne Kanal gibt es keinen Mitspieler.

**Ist-Zustand (Ursache).** Die Prüfungsarena (js/herausforderung.js, nicht die PvP-Turnierarena) war fest „allein“: eine Halle je Läufer (`S.owner`).
- Die Monster rechnet, wer sie führt: allein man selbst, im Kanal der Host, und zwar auch für die Hallen der Clients. Die Arena war also nicht rein lokal, aber nur für einen Spieler je Halle gebaut.
- Langsam war die Arena so:
  - erste Pause 4 s, danach 6 s Pause nach jeder Welle;
  - Schübe nach 10, 12, 14 … s, bei 2 + Welle/2 Schüben: Welle 4 brauchte 36 s, bis das letzte Monster kam;
  - beim Erscheinen 0,7 s Betäubung, der Aggro-Abgleich lief nur jede Sekunde.

**Änderung.**
- **Tempo:**
  - Schübe alle **3 s** mit etwa 4 Monstern, zu zweit 6. Es gibt nur noch einen Takt: Der nächste Schub kommt nach 3 s, sobald der vorige ganz erschienen ist.
  - Pause vor Welle 1: 3 s statt 4 s, die Ankündigung „Welle 1 · Gleich geht es los!“ bleibt. Pause zwischen Wellen: 3 s statt 6 s.
  - Erscheinen: 0,35 s statt 0,7 s, Abstand innerhalb eines Schubs 0,12 s.
- **Obergrenze gleichzeitig lebender Monster:** allein 30, zu zweit 40 (bisher 50). Was darüber liegt, erscheint, sobald ein Monster fällt. Ein eigener Wartetakt entfällt.
- **Sofortige Aggro und Schwarm:**
  - Jedes neue Monster startet in `chase` mit einem Teilnehmer als Ziel. Gewählt wird der, den gerade weniger Monster jagen, bei Gleichstand der nähere.
  - Der Ziel-Abgleich läuft alle 0,5 s: Tote, getarnte oder fehlende Teilnehmer werden ersetzt, Diener als Tank bleiben gültig.
  - Erscheinungsorte liegen reihum am Hallenrand, nie näher als 6 Kacheln an einem Teilnehmer.
  - Monster laufen auf einem Bogen an (`m.flank`, gegner.js). Das Ziel ist seitlich versetzt, um höchstens 80 px und weniger, je näher sie kommen. Kein Teleport.
- **Duo:**
  - Der Arenameister zeigt „Zu zweit mit …“ für jedes Gruppenmitglied im Kanal. Das Mitglied bekommt eine Einladung als Toast (Nachricht `ari`) und tritt mit `arj` bei. `ard` heißt abgelehnt, nach 20 s geht die Halle allein los.
  - Geprüft wird nur beim Host (`arenaJoin`): Name genau gleich dem Eingeladenen, Halle noch nicht gestartet, höchstens 2 Teilnehmer. Der Host arbeitet Nachrichten nacheinander ab, gleichzeitige Anfragen können das Limit also nicht umgehen.
  - Der Host kann selbst Läufer oder Eingeladener sein.
  - Die Wellenstufe ist der Schnitt beider Stufen (Gruppen liegen höchstens 15 Stufen auseinander).
  - Ausfälle:
    - Tod: Der andere kämpft weiter, die Monster wechseln. Die Halle wartet nur, wenn alle tot sind.
    - Verlassen, mehr als 3 s außerhalb, Disconnect oder 180 s tot: Der Teilnehmer fällt heraus und bekommt sein Gold. Ab der nächsten Welle wird wieder für einen gerechnet.
    - Wiedereintritt in eine laufende Halle wird abgelehnt.
- **Duo-Skalierung** (`ARENA.duo`):
  - 1,5× Monster (Elite ebenso), +25 % Leben, +10 % Schaden; der Wellenmeister hat insgesamt +50 % Leben.
  - Herleitung: 1,5 × 1,25 ≈ 1,9-mal so viel Leben je Welle bei doppelt so vielen Kämpfern. Je Spieler sind das etwa 94 % der Solo-Last, die Runde wird also nicht länger.
  - +10 % Schaden, weil sich die Monster auf zwei Ziele verteilen.
- **Belohnung:**
  - Wellengold wie bisher, jeder nach eigener Stufe und je Welle nur einmal (`w <= run.cleared`).
  - EP und Gold der Monster zu zweit ×1/1,5, weil jeder jeden Kill bekommt (NET_SHARE). So bringt eine Duo-Welle jedem genau so viel wie allein. Es gibt keine Abkürzung über Duo-Läufe und keine stille Änderung der Ökonomie.
- **Anzeige und Texte:**
  - PC-Karte „Prüfungsarena zu zweit“, Handy „Warte auf Mitspieler“.
  - Gebietsname „Herausforderung · allein oder zu zweit“.
  - Alle neuen Texte stehen in js/sprachen/en.js. Namen wurden aus Sätzen herausgenommen, damit die Übersetzung greift.

**Dateien:** js/herausforderung.js, js/gegner.js (Flankieren), js/sprachen/en.js

**Messwerte vorher/nachher.**
- Aufbau: `messen.js`, gleicher Charakter (Krieger Stufe 40, unsterblich), Wellen 1–5, virtuelle Zeit (update mit 1/30 s), 3 Seeds je Fall.
- Bot: läuft zum nächsten Monster und trifft bis zu 4 Monster in 80 px.
- 1.500 Schaden/s je Ziel entspricht etwa einem mittleren Krieger der Stufe 40 laut docs/balance-klassen.md. 900 steht für einen schwachen.
- „Leerlauf“ heißt: kein Monster in Reichweite, Pausen eingeschlossen.

| | Welle 1 | Welle 2 | Welle 3 | Welle 4 | Welle 5 (Boss) | Summe W1–5 | Leerlauf | Schubabstand | Loslaufen nach Erscheinen |
|---|---|---|---|---|---|---|---|---|---|
| 14.31, 1.500/s | 24,8 s | 40,5 s | 44,0 s | 70,1 s | 69,7 s | **249,0 s** | 42,7 s | 10,0–14,0 s | Ø 0,75 s |
| neu, 1.500/s | 22,2 s | 29,7 s | 34,4 s | 53,6 s | 63,7 s | **203,6 s (−18 %)** | 24,8 s (−42 %) | **3,00–3,04 s** | Ø 0,59 s |
| 14.31, 900/s | 29,9 s | 50,5 s | 56,6 s | 103,5 s | 97,6 s | **338,1 s** | 39,7 s | 10,0–14,0 s | Ø 0,81 s |
| neu, 900/s | 27,8 s | 38,2 s | 50,9 s | 95,5 s | 108,9 s | **321,4 s (−5 %)** | 24,7 s (−38 %) | 3,00–3,04 s | Ø 0,55 s |

- Eine Kontrollmessung mit dem Endstand ergab 207,8 s Summe und 24,1 s Leerlauf.
- Wer schwach zuschlägt, ist jetzt durch die eigene Tötungsrate begrenzt, nicht mehr durch Wartezeiten. Leben und Anzahl der Monster sind solo unverändert.
- Höchstzahl gleichzeitig lebender Monster (Seed 11, 1.500/s), Welle 1–7: alt 6/7/9/10/11/13/17, neu 10/11/13/19/17/27/28. Die Obergrenze liegt bei 30.
- Spiellogik je Bild (`update`, Desktop-CPU headless): 2D mit 30 Monstern 0,8 ms, mit 40 Monstern 1,5 ms; 3D mit 30 Monstern 3,7 ms, mit 40 Monstern 7,0 ms.
- Zeichenzeit in 3D mit Software-GL ist nicht aussagekräftig, echte Handy-FPS sind nicht gemessen.

**Tests im echten Mehrspieler** (`duo.js`, `duo2.js`: lokaler MQTT-Broker, Datenkanal über den Broker, 2–4 Browser; Wellenablauf duo.js):
1. B lädt C ein. C bekommt den Toast und nimmt über den echten Knopf an. Die Halle hat 2 Teilnehmer, Stufe 40, `arf` mit `pl: 2`.
2. Welle 1 zu zweit: 18 Monster in 3 Schüben zu 6. Abstände 3,02 s und 3,01 s, Startziele je Schub 3/3, 4/2, 3/3.
3. Alle Monster sind sofort in `chase`.
4. Dritter Spieler D aus derselben Gruppe tritt gleichzeitig bei: abgelehnt mit „Du bist für diese Halle nicht eingeladen.“. Ein zweiter Versuch nach dem Start ebenfalls.
5. C stirbt: Alle Monster jagen B, die Halle läuft weiter. C startet in der Stadt neu: C fällt heraus, B bekommt die Meldung.
6. Welle 2 mit `pl: 1` (4 je Schub, Abstand 3,05 s).
7. Wiedereintritt von C: „Der Lauf hat schon begonnen.“
8. Disconnect von B: Die Halle wird frei, ihre Monster verschwinden.
9. Welle 1 geschafft: B bekommt 1.000 Gold, einmal.
10. Host als Teilnehmer, in beide Richtungen: Host nimmt Client mit, Client lädt Host ein. Gibt der Host auf, kämpft der Client allein weiter.
11. Absage: Die Halle startet allein, der Läufer bekommt eine Meldung.

Dazu: s73 (alle 12 Klassenwege ohne Fehler), Solo-Messläufe ohne Seitenfehler.

**Offene Punkte.**
- Gruppenprüfung: Der Host kennt die Gruppen anderer Spieler nicht (Gruppen leben auf den Geräten).
  - Geprüft wird Einladung + Zustimmung + Name beim Host, dazu `inMyParty` beim Eingeladenen.
  - Ein manipulierter Client kann sich also nur mit einem zweiten zustimmenden Spieler zusammentun, nie zu dritt.
- Gemischte Versionen:
  - Ein 14.31-Host ignoriert `pn`/`arj`, der Lauf startet dann allein.
  - Ein 14.31-Client kennt `ari` nicht. Die Einladung verfällt nach 20 s, der Läufer spielt allein.
- Nicht geprüft: echte Latenz (öffentliche Broker), echtes Handy, Duo-Bosswelle im Mehrspieler.
- Die Duo-Faktoren sind aus der Tötungsrate hergeleitet und mit Bots geprüft, nicht mit echten Spielern. Sie sind über `ARENA.duo` einstellbar.
- Monster laufen weiter mit normalem Tempo, erst ab Welle 8 im Jagdmodus. Ankunft beim Spieler Ø 4–7 s. Schneller wäre eine Schwierigkeitsänderung und ist bewusst nicht umgesetzt.

Testskripte (nicht im Repo): /tmp/claude-0/-home-user-claude/28e727e5-656e-544c-9afe-3c541c335198/scratchpad/arena-tank/ (messen.js, serie.sh, tank.js, tank2.js, duo.js, duo2.js, perf.js; Ergebnisse *.json)

## 14.43: Arena zu dritt, Ursache des Allein-Betretens, Musik

**Status: umgesetzt.** Gemeinsam geht nur im Mehrspieler-Kanal. Ohne Kanal gibt es keine Mitspieler.

**Ursache des Allein-Betretens.** Nachgestellt mit 14.39 im echten Mehrspieler (`repro.js`: lokaler Broker, H ist Host und nicht in der Gruppe, A und B bilden die Gruppe über die echte Einladung):
1. **Hauptknopf war „allein“.** Beim Arenameister war der erste, hervorgehobene Knopf „Allein betreten“, „Zu zweit mit …“ nur ein Nebenknopf. Drücken beide Mitglieder den Hauptknopf, landen sie in getrennten Hallen (gemessen: Saija Halle 0, Alper Halle 1).
2. **Selbst drücken statt Einladung annehmen** gab eine eigene Halle. Lädt A ein und B geht selbst zum Meister, bekommt B eine Solo-Halle. A wartet 20 s und kämpft dann ebenfalls allein (gemessen).
3. **Die Einladung war nur ein Toast für 20 s.** Am Handy und mitten im Kampf ist er leicht zu übersehen. Danach startete die Halle still allein.
4. **„Arena betreten“ trotz Gruppe.** Fand das Fenster kein Mitglied, stand dort nur „Arena betreten“, also allein. Gründe: Das Mitglied ist nicht im Kanal oder hat eine ältere Version, oder das Fenster wurde vor dem Gruppenbeitritt geöffnet. Das Fenster wurde nie neu gezeichnet.
5. **Versionen.** Ein Host mit einer Version vor 14.32 (auch ein unbeteiligter dritter Spieler) ignoriert die Einladung. Ein Gerät vor 14.32 kennt `ari` nicht. In beiden Fällen ging es ohne Hinweis allein weiter.
6. **Im Gruppenfenster gab es keinen Arena-Eintrag.**
7. **„Keiner ist Host“ war nicht die Ursache.** Der Ablauf über einen unbeteiligten Host funktionierte auch in 14.39. Gefunden wurde aber eine Lücke bei der Belohnung: Kills zählten nach der Gruppenregel (selbst getroffen oder näher als 700 px). In der großen Halle gingen so Kills verloren, obwohl die Belohnung je Kill durch die Spielerzahl geteilt wird.

**Änderung (js/herausforderung.js, js/gruppe.js, js/musik.js, js/sprachen/en.js).**
- **Arenameister:**
  - In einer Gruppe heißt der Hauptknopf jetzt **„Mit Gruppe betreten (n)“**, daneben steht „Allein betreten“. Ohne Gruppe steht dort wie bisher „Arena betreten“.
  - Darüber steht die Liste der Mitglieder mit Kästchen. Vorausgewählt sind die zwei nächsten, die mitkommen können, Geräte mit neuem Stand zuerst. Wer nicht kann, steht mit Grund daneben: nicht im Kanal, ältere Version, unter Stufe 5, schon in der Arena, tot.
  - Bei mehr als drei Mitgliedern wählt man aus, höchstens zwei. Der Hinweis lautet „Mehr passen nicht in eine Halle“.
  - Das Fenster zeichnet sich neu, sobald sich Gruppe, Kanal oder Lauf ändern (Prüfung jede Sekunde).
- **Gruppenfenster** (Reiter Gruppe): Neuer Knopf **„Arena mit der Gruppe betreten“**. Er lädt die zwei nächsten Mitglieder ein.
- **Einladung:** Statt des Toasts erscheint ein **Fenster mit Annehmen/Ablehnen und 25-s-Countdown**. Es nennt alle Teilnehmer.
  - Wird die Einladung zurückgezogen, schließt sich das Fenster mit Meldung (neue Nachricht `arc`). Das passiert, wenn der Läufer aufgibt, die Halle frei wird oder der Countdown beim Host abläuft.
  - Ältere Geräte (14.32–14.39) bekommen wie bisher den Toast und können zu zweit beitreten.
- **Wer selbst drückt, landet bei seiner Gruppe:** Ist der Spieler in eine wartende Halle eingeladen, tritt er beim Host dieser Halle bei, statt eine eigene zu bekommen.
  - Das gilt auch, wenn zwei Mitglieder fast gleichzeitig drücken: Der Host arbeitet nacheinander ab. Die erste Anfrage reserviert die Halle, die zweite tritt bei.
  - Das gilt auch für Anfragen von 14.32–14.39-Geräten.
- **Start:** Die Halle startet, sobald alle Eingeladenen zugesagt haben (oder abgelehnt) und in der Halle stehen. Spätestens nach 25 s startet sie mit denen, die zugesagt haben.
  - Die Anzeige des Läufers zeigt „Warte auf Saija, Corin · noch 18 s“. Jede Zu- und Absage steht mit Namen im Protokoll („Corin · hat abgelehnt“).
  - Alle in der Halle bekommen den Stand als neue Nachricht `ark`.
- **Höchstens 3 je Halle, geprüft beim Host** (`arenaJoin`, `ARENA.maxPlayers`). Der Host arbeitet Nachrichten nacheinander ab, gleichzeitige Anfragen können das Limit also nicht umgehen. Bedingungen für einen Beitritt:
  - Der Name steht auf der Einladung.
  - Der Name ist nicht schon in der Halle.
  - Die Halle wartet noch auf den Start.
  - Es sind höchstens 3 Spieler.
  - Der Läufer steht in der mitgeschickten Gruppenliste des Beitretenden (`pm`).
  - Teilnehmer ohne Verbindung werden vor der Prüfung entfernt. So blockiert ein Neuverbinden keinen Platz.
  - Zu dritt nur, wenn alle Geräte den neuen Stand haben (neues Feld `ag: 3` im Spielerzustand). Ein 14.39-Gerät hätte zu dritt die Belohnung falsch geteilt.
  - Wer schon in einer Halle steht, wird nicht eingeladen. Der Anfragende bekommt dann „Saija · ist schon in der Arena“.
- **Belohnung:** Wer in der Halle seines Laufs steht, bekommt jeden Kill dieser Halle (Hülle um `netEligible`).
  - EP und Gold je Monster ×1/n (n = Monsterfaktor der Tabelle). Zu dritt bringt jedes Monster also die Hälfte, insgesamt so viel wie allein.
  - Der Wellenmeister kommt in jeder Bosswelle genau einmal und bringt deshalb jedem die volle Belohnung. Vorher wurde auch er zu zweit geteilt.
  - Wellengold wie bisher: je Spieler nach eigener Stufe, je Welle nur einmal.
- **Wartezeit:** Antwort des Hosts auf „Arena betreten“ höchstens 12 statt 8 s. Über den Broker kam sie im Test mit fünf Browsern einmal später.

**Skalierung (`ARENA.group`, ersetzt `ARENA.duo`; `ARENA.duo` bleibt als Verweis auf Zeile 2):**

| Spieler | Monster | Leben | Schaden | Wellenmeister (Leben gesamt) | Schub | höchstens gleichzeitig | Leben je Welle je Spieler | EP/Gold je Monster |
|---|---|---|---|---|---|---|---|---|
| 1 | ×1 | ×1 | ×1 | ×1 | 4 | 30 | 100 % | ×1 |
| 2 | ×1,5 | ×1,25 | ×1,1 | ×1,25 × 1,2 = 1,5 | 6 | 40 | 94 % | ×1/1,5 |
| 3 | ×2 | ×1,4 | ×1,2 | ×1,4 × 1,6 = 2,24 | 8 | 48 | 93 % | ×1/2 |

Herleitung der Werte:
- Leben je Welle zu dritt: 2 × 1,4 = 2,8 bei dreifacher Kampfkraft, nach derselben Logik wie beim Duo (1,875 für zwei).
- Schaden +20 %, weil sich die Monster auf drei Ziele verteilen. Die Zielwahl nimmt den Teilnehmer, den gerade die wenigsten jagen.
- Der Wellenmeister ist ein einzelnes Ziel, das alle zugleich treffen. Er bekommt so je Spieler etwa 75 % der Solo-Last, wie zu zweit (1,5 / 2).
- Elite skaliert mit der Monsterzahl.

**Messwerte** (`mess3.js`: virtuelle Zeit, eine Seite als Host mit nachgebildeten Mitspielern, alle Krieger Stufe 40, unsterblich, je Bot 1.500 Schaden/s auf bis zu 4 Monster in 80 px; Wellen 1–5; Seeds 11/22/33; Endstand):

| | W1 | W2 | W3 | W4 | W5 (Boss) | Summe W1–5 (Ø) | Einzelläufe | EP je Spieler | Monstergold je Spieler | Monster W1–5 |
|---|---|---|---|---|---|---|---|---|---|---|
| allein | 20,3 s | 28,2 s | 36,3 s | 62,1 s | 68,3 s | **215,3 s** | 215,7/210,8/219,3 | 183.230 | 10.318 | 12/16/20/24/18 |
| zu zweit | 19,8 s | 28,1 s | 38,7 s | 57,0 s | 61,4 s | **205,0 s (−5 %)** | 214,5/208,8/191,7 | 178.021 (−3 %) | 9.844 (−5 %) | 18/24/30/36/26 |
| zu dritt | 19,0 s | 26,7 s | 34,2 s | 55,9 s | 59,7 s | **195,4 s (−9 %)** | 197,0/193,3/195,9 | 176.066 (−4 %) | 9.832 (−5 %) | 24/32/40/48/35 |

- Die Rundendauer bleibt ähnlich, Gruppen sind 5–9 % schneller. Das liegt im Rahmen der Streuung zwischen den Seeds (bis 10 %). Etwas schneller ist bewusst in Ordnung, weil sich echte Spieler zu dritt mehr im Weg stehen als Bots.
- EP und Gold je Spieler liegen 3–5 % unter allein. Grund: Die Verstärkung des Wellenmeisters wird geteilt, kommt aber nicht öfter.
- Vor der Korrektur der Wellenmeister-Belohnung waren es zu dritt −9 % EP (Messreihe `m_neu_*`).
- Nicht gemessen: andere Klassen und Stufen sowie echte Spieler.

**Musik (js/musik.js, `MOODS.arena`, `music.arenaBar`).**
- Eigene, im Browser erzeugte Kampfmusik nur in der eigenen Halle der Prüfungsarena und in der Turnierarena (`pvpInside`). Keine Datei, keine fremde Melodie.
- **Harmonik:** D-Moll, 160 BPM. Drei Akkordfolgen mit A-Dur als Dominante (harmonisches Moll), neapolitanischem Es-Dur und g-Moll.
- **Spiel:**
  - Sechzehntel-Ostinato im Bass (Grundton, Oktave, Quinte, Terz).
  - Bassdrum auf jedem Schlag plus Synkope, Snare auf 2 und 4, Hi-Hats.
  - Synkopierte Bläser-Stöße, im zweiten Teil jeder Folge ein hohes Sechzehntel-Arpeggio.
  - Alle 4 Takte ein Snare-Wirbel und ein Rauschen in den nächsten Takt.
- **Drei Stufen:**
  - Warten/Pause: ohne Bassdrum und Snare, Bass in Achteln.
  - Kampf.
  - Bosswelle (jede 5.): Sechzehntel-Hats, Bläser auf jeder Synkope, große Trommeln, Chor.
  - Jeder Stufenanstieg beginnt mit einem Schlag.
- **Übergänge:** Beim Betreten blendet die Gebietsmusik (Datei) in 1,5 s aus und die Arenamusik ein, beim Verlassen umgekehrt. Ohne Datei wechselt sie am Taktanfang.
- **Lautstärke:** Läuft über `sfx.music`. Musik aus oder Lautstärke 0 heißt still (geprüft).
- **Pegel am Musikbus** (Effektivwert, Lautstärke 0,5; `musik.js` im Testordner):

  | Stelle | Pegel |
  |---|---|
  | Stadt (erzeugt) | 0,019 |
  | Arena Warten | 0,011 |
  | Arena Kampf | 0,035 |
  | Arena Bosswelle | 0,050 |
  | Bossmusik (Vergleich) | 0,042 |

- **Planung:** ein Takt in 3,7 ms (Desktop, headless), alle 1,5 s.

**Tests im echten Mehrspieler** (lokaler MQTT-Broker ws://localhost:18803, Spiel auf :8802, Gruppen über die echte Einladung gebildet):
- **`gruppe3.js`** (5 Browser): H ist Host und nicht in der Gruppe, Gruppe A/B/C/D.
  1. A sieht „Mit Gruppe betreten (3)“ und „Allein betreten“. Saija und Corin sind vorausgewählt, Dario steht weiter weg und bleibt draußen.
  2. B und C bekommen das Fenster mit Countdown, D nicht. A zeigt „Warte auf Saija, Corin · noch 25 s“.
  3. B nimmt an, dann versuchen C und D gleichzeitig beizutreten. D wird abgelehnt („Du bist für diese Halle nicht eingeladen.“), die Halle hat 3 Teilnehmer.
  4. D drückt selbst „Mit Gruppe betreten“. Er bekommt eine eigene Halle, Alper und Saija werden als „ist schon in der Arena“ ausgelassen.
  5. Welle 1 zu dritt: `arf` mit `pl: 3`, 24 Monster in 3 Schüben (Abstand 3,02 und 3,03 s). Jeder hat 24 Kills, 5.721 EP und 1.000 Wellengold, einmal.
  6. Tod von C: Die Halle läuft weiter. C startet in der Stadt neu und fällt heraus. A bekommt „Corin · hat die Arena verlassen – ihr kämpft weiter (ab der nächsten Welle für 2)“.
  7. Disconnect von B: Er fällt heraus, A kämpft allein weiter.
  8. A verlässt die Arena: 1.000 Gold ausgezahlt, einmal. Die Halle wird frei.
- **`gruppe3b.js`:**
  1. Der Host ist Teilnehmer. A und B drücken gleichzeitig „Mit Gruppe betreten“: Es entsteht eine Halle, A tritt der von B bei. H nimmt über das Fenster an, die Halle hat 3 Teilnehmer.
  2. Der Host gibt auf: A und B kämpfen weiter, die nächste Welle wird für 2 gerechnet.
  3. Knopf im Gruppenfenster: B lehnt ab, H antwortet nicht. A startet nach 24,8 s allein und bekommt Meldungen mit Namen.
  4. Ein 14.39-Gerät (O, eigene Kopie auf :8806) in der Gruppe:
     - Beim Meister steht „nur zu zweit (ältere Version)“.
     - O bekommt den alten Toast und tritt bei.
     - Ein Dritter wird abgelehnt mit „Zu dritt geht es erst, wenn alle die neue Version spielen – bitte neu laden.“
- **`gruppe3c.js`:**
  - A gibt vor dem Start auf: Die Fenster bei H und B schließen sich („Die Einladung in die Prüfungsarena gilt nicht mehr.“).
  - Ist ein 14.39-Gerät näher, wählt der Meister trotzdem die neuen Geräte vor.
- **`repro.js`** gegen 14.39 (Ursache, siehe oben).
- **Keine Seitenfehler** in allen Läufen.
- **Regression:**
  - s73-Kopie: 12/12 Klassenwege ohne Fehler.
  - s72 in 2D: Arenameister und „Arena betreten“ funktionieren, Halle mit Monstern.
  - s72_noshot mit D3=1: ohne Fehler, Halle betreten. Nach 6 s gab es noch keine Monster, ebenso mit 14.39 (Software-GL ist langsam).
  - `musik.js`: Wechsel dorf → arena → dorf, alle Stufen ohne Fehler.

**Bildschirmfotos:** inv_handy.png (Einladung, Handy quer), meister_pc.png (Gruppenauswahl am PC) im Testordner.

**Offene Punkte.**
- **Gruppenprüfung:** Der Host kennt die Gruppen weiterhin nur aus dem, was die Geräte mitschicken (`pm`). Geprüft werden Einladung, Zustimmung, Name und gegenseitige Gruppenliste. Ein manipulierter Client kommt so höchstens mit zwei zustimmenden Spielern zusammen, nie zu viert.
- **Host vor 14.32:** Ein solcher Host (auch ein unbeteiligter) ignoriert Gruppenanfragen. Der Meister erkennt das am Feld `ag` bzw. an der Version und sagt es („Der Host des Kanals spielt eine ältere Version …“). Beheben kann es nur das Neuladen beim Host.
- **Nicht geprüft:** echte Latenz (öffentliche Broker), echtes Handy, Bosswelle zu dritt im Mehrspieler (nur mit Bots in virtueller Zeit), Wiedereintritt nach echtem Verbindungsabbruch mitten im Lauf. Der Wiedereintritt wird bewusst abgelehnt, „Der Lauf hat schon begonnen.“.
- **Gleichstand Countdown/Host:** Läuft der Countdown im Fenster ab, meldet das Fenster „abgelehnt“, meist kurz bevor der Host „kommt nicht“ meldet. Im Protokoll steht dann „hat abgelehnt“ statt „hat nicht rechtzeitig angenommen“.
- **Arenamusik:** nur im Browser erzeugt, keine Datei. Wenn gewünscht, kann später eine eigene Aufnahme als `snd/musik/arena.mp3` (MUSIC_FILES) folgen.

Testskripte (nicht im Repo): /tmp/claude-0/-home-user-claude/28e727e5-656e-544c-9afe-3c541c335198/scratchpad/arena3/ (repro.js, gruppe3.js, gruppe3b.js, gruppe3c.js, lib.js, mess3.js, serie.sh, musik.js, bild.js; Ergebnisse m_*.json, g3*.out)
