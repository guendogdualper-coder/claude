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
