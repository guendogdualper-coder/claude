# Prüfungsarena mit der Gruppe und „nicht im Kanal“ (seit 14.72)

Fehlermeldung des Spielers: „Ich war im Lichtreich und mein Kollege im Dunkelreich. Wir waren zu zweit in der Gruppe,
aber wir konnten nicht zusammen Arena machen. Ich will, dass man maximal zu dritt reingehen kann in die Arena (die mit
den Wellen). […] Und immer wenn ich ihn einlade, steht bei ihm in der Gruppe, dass er nicht im Kanal ist.“

## Stand vorher

- Gruppen-Arena gibt es seit 14.32 (zu zweit) bzw. 14.40 (bis zu dritt, Einladungsfenster mit Countdown, Skalierung
  `ARENA.group`, Belohnung je Kill für alle in der Halle) – siehe `js/herausforderung.js` und
  `docs/auftrag-2026-11-10-arena-tank.md`. Gruppe zwischen Licht und Schatten seit 14.71 (`js/seiten.js`).
- Getestet wurde das damals nur mit einem **Spieler als Host** des Kanals.

## Ursache 1: Arena ging im echten Kanal nie mit der Gruppe (Welt-Wächter)

Auf dem echten Server ist Host von Kanal 1 und 2 der **Welt-Wächter** (`js/waechter.js`, `server/waechter.sh`). Er hat
keine Figur; der Mitspieler löscht beim Begrüßen seinen Eintrag (`net.players.delete('host')` im `welcome` in
`netz.js`). Die Arena fragte den Stand des Hosts aber nur dort ab:

```js
function arenaHostCap() { … return arenaCapOf('host'); }   // net.players.get('host') → undefined → 0
```

Ergebnis 0 = „Host spielt eine ältere Version – du gehst allein“: kein Knopf „Mit Gruppe betreten“, das Gruppenfenster
lud niemanden ein („Gerade kann niemand aus deiner Gruppe mitkommen“). Das betraf **jede** Gruppe im echten Kanal,
nicht nur gemischte – mit Licht und Schatten fiel es nur zuerst auf.

Beleg (Playwright, lokaler Broker, Wächter als Host wie auf dem Server, Stand 14.71): `arenaHostCap()` = 0 bei beiden,
`arenaDefaultMates()` = `[]` (Skript `scratchpad/arena72/diagw.js`).

**Änderung:** `netz.js` merkt sich Version und Art des Hosts aus der Begrüßung (`net.hostVer`, `net.hostWaechter`).
`arenaHostCap()` nimmt bei fehlendem Host-Eintrag die Version (`arenaCapOfVer`: ab 14.40 → 3, ab 14.32 → 2). Die
Hallen führt der Wächter mit derselben Logik wie ein Spieler-Host (er rechnet die Monster ohnehin).

## Ursache 2: „nicht im Kanal“ in der Gruppe

Die Gruppe erkennt ein Mitglied über `onlinePlayer(name)` – also nur, wenn es in `net.players` steht. Gründe, warum es
dort fehlte bzw. so angezeigt wurde, obwohl es verbunden war:

1. **Volle Kanäle (mehr als `NET_SMALL` = 12 Spieler):** Seit 14.4 schickt der Host jedem nur die Spieler in seiner Nähe
   (`NET_NEAR`) und seine Gilde, alle anderen nur bei der ganzen Liste etwa alle 5 s. Unter Stufe 50 stehen Licht und
   Schatten **immer** auf verschiedenen Karten, also immer „weit weg“. Wer neu in den Kanal kam oder neu verband, hatte
   das Mitglied bis zu 5 s gar nicht, danach Ort und Leben nur alle 5 s. Besonders über den Gruppenfinder: Dessen
   Einträge kommen als Nachricht an alle (unabhängig von der Entfernung) – man kann einer Gruppe beitreten, deren
   Anführer man im Spielerzustand noch gar nicht hat.
2. **Der Reiter „Gruppe“ (und die Spielerkarte) wurden nicht neu gezeichnet**, wenn ein Mitglied in der Liste auftauchte –
   „nicht im Kanal“ blieb stehen, solange das Fenster offen war.
3. **Ersatzname:** Ältere Namen, die der Namensfilter (seit 14.65) als anstößig einstuft, zeigt das Spiel als
   „Spieler“; `onlinePlayer` suchte nur nach dem angezeigten Namen – so ein Mitglied galt dauerhaft als „nicht im Kanal“.

Kanal-Zuordnung je Seite gibt es nicht: Server und Kanäle (`SERVERS` in `netz.js`) sind für beide Seiten dieselben,
Licht und Schatten landen über `netAutoJoin` im selben Kanal (zuletzt genutzter oder Kanal 1). Seiten- oder
Kartenfilter beim Spielerzustand gibt es nicht (geprüft: `netSnapshotFor`, `netApplyState`, `seiten.js`).

Ehrlich: Mit zwei bzw. drei Spielern (bis 12 im Kanal) zeigte die Gruppenanzeige auch mit 14.71 lokal „andere Karte“,
nicht „nicht im Kanal“. Nachgestellt werden konnten nur die drei Fälle oben; welcher davon beim Spieler zutraf (oder ob
er die Arena-Meldung meinte), lässt sich ohne seinen Kanal nicht sicher sagen.

**Änderungen:**
- `gruppe.js`: Jedes Gerät schickt den Anführer seiner Gruppe im Spielerzustand mit (`pg`). Der Host (auch der Wächter)
  nimmt Mitglieder derselben Gruppe **immer** in den Zustand auf (`netSnapshotFor` umhüllt) – auf jeder Karte, in
  Dungeons und in der Arena. Ältere Versionen ohne `pg` bekommen es wie bisher.
- `gruppe.js`: `partyPresenceCheck()` (jede Sekunde in `partyTick`) zeichnet Freunde-&-Gilde-Fenster und Spielerkarte
  neu, wenn ein Mitglied kommt oder geht.
- `netz.js`/`gemeinschaft.js`: `rp.realName`; `onlinePlayer` findet auch über den echten Namen.

Die Gruppenanzeige zeigt Mitglieder auf anderen Karten wie bisher mit „andere Karte“ (verbunden), nur wirklich Getrennte
mit „nicht im Kanal“.

## Gruppenfunktionen über die Seiten (geprüft)

- Einladen/Annehmen, Gruppenreiter, Gruppenanzeige: ja (Test unten).
- EP-Teilung: wie bisher nur für Mitglieder in der Nähe des Monsters (`NET_SHARE`) – auf getrennten Karten unter 50
  gibt es keine gemeinsamen Monster; in Dungeons, Instanzen, Arena und auf den gemeinsamen Karten ab 50 greift sie.
- Dungeon mitnehmen (`pd`): ruft `enterDungeon(k, true)` ohne Seitenprüfung; jeder kommt am Eingang seiner Seite
  heraus (`dungeonEntranceFor`). Dungeons ohne zweiten Eingang: Ausgang auf der Karte der anderen Seite, die Seiten-
  sperre bringt einen dann in die eigene Stadt (bestehendes Verhalten aus 14.54).
- Riss teilen (`pr`): liegt auf der Karte des Finders – für die andere Seite unter 50 nicht erreichbar (unverändert).
- „Zur Gruppe teleportieren“ gibt es im Spiel nicht.

## Prüfungsarena mit der Gruppe – wie es jetzt läuft

- Der Anführer (oder jedes Mitglied) spricht mit dem Arenameister: „Mit Gruppe betreten (n)“ mit Auswahl, höchstens drei
  je Halle (du und zwei). Alternativ im Reiter „Gruppe“: „Arena mit der Gruppe betreten“. „Allein betreten“ bleibt.
- Eingeladene bekommen ein Fenster mit Countdown (25 s), egal auf welcher Karte und welcher Seite; Annehmen bringt sie
  in dieselbe Halle. Wer selbst „Arena betreten“ drückt, kommt in die wartende Halle seiner Gruppe.
- Ein Rechner rechnet die Wellen: der Host des Kanals (Spieler oder Welt-Wächter). Alle sehen dieselben Monster.
- Belohnung: Wellengold je geschaffter Welle für jeden (nach eigener Stufe), EP und Gold je Kill für jeden in der Halle
  (geteilt durch den Mengenfaktor, also je Spieler etwa so viel wie allein).
- Leben je Spieler: jeder hat drei; wer stirbt, verliert nur sein Leben und startet in der Halle neu; beim dritten Tod
  ist nur sein Lauf vorbei. Die Halle wartet, solange alle tot sind. Ergebnisfenster bekommt jeder, wenn sein Lauf
  endet (Verlassen, Aufgeben, dritter Tod, Ende der Halle).
- Rückkehr: jeder an den Ort, an dem er losging (eigene Seite).

### Skalierung (geändert seit 14.72)

| Spieler | Monster (n) | Leben je Monster | Leben der Welle gesamt | je weiterem Spieler | Schaden | Wellenmeister gesamt |
|---|---|---|---|---|---|---|
| 1 | 1 | 1 | 1 | – | 1 | 1 |
| 2 | 1,5 | 1,2 (vorher 1,25) | 1,8 (vorher 1,875) | +80 % | 1,1 | 1,5 |
| 3 | 2 | 1,3 (vorher 1,4) | 2,6 (vorher 2,8) | +80 % | 1,2 | 2,21 (vorher 2,24) |

Wunsch: +60–80 % je weiterem Spieler. Vorher waren es +87,5 % bzw. +90 %; gemessen hatte der frühere Auftrag damit je
Spieler 94 %/93 % der Solo-Last. Jetzt 90 %/87 % – die Gruppe ist etwas schneller als allein, aber nicht trivial.
Belohnung je Kill bleibt `1 / n` (unverändert, Wellengold für jeden voll).

## Dateien

- `js/herausforderung.js` – `arenaHostCap`/`arenaCapOfVer`, `ARENA.group`
- `js/netz.js` – `net.hostVer`, `net.hostWaechter`, `rp.realName`
- `js/gruppe.js` – `pg` im Spielerzustand, Gruppe im Zustand des Hosts, `partyPresenceCheck`
- `js/gemeinschaft.js` – `onlinePlayer` mit `realName`
- `js/daten/ratgeber-wissen.js` – Antworten zur Arena mit Gruppe (stand noch „Nein“), neue Frage „Können Licht und
  Schatten zusammen spielen?“; `js/sprachen/en.js`

## Tests

Playwright, echtes Netz über einen lokalen MQTT-Broker (`window.SIG_RELAYS_OVERRIDE`, `SIG_NO_RTC`, wie die
PvP-Mehrspielertests), eigene Browser-Kontexte je Spieler; Skripte in `scratchpad/arena72/`.

- `arena.js MODE=waechter N=3` – Welt-Wächter als Host (`?waechter=1&kanal=1`, wie der Server), Lumo (Licht, 30,
  Karte 6), Nyxa (Schatten, 31, Karte 14), Sora (Schatten, 29, Karte 13): Einladen → alle drei sehen die anderen
  „andere Karte“ (nicht „nicht im Kanal“), Gruppenreiter ohne „nicht im Kanal“ → Arenameister zeigt „Mit Gruppe
  betreten (3)“ → beide Einladungsfenster → alle in Halle 0 → dieselben Monster-ids bei allen, Welle für 3 gerechnet
  (24 Monster = `arenaWave(…, 3).n`) → Welle 1 geschafft: Wellengold 800/820/780 (nach Stufe), EP und 24 Kills bei
  jedem → Tod von Nyxa kostet nur ihr ein Leben (2), die anderen behalten 3, Neustart in der Halle → alle geben auf:
  Ergebnisfenster bei jedem, jeder zurück auf seiner Karte. 29/29 OK, keine Seiten- und Wächterfehler.
- `arena.js MODE=spieler N=2` – Lumo (Licht) ist Host, Nyxa (Schatten): 22/22 OK (18 Monster für zwei, Wellengold
  800/820). Im Test lief die Spielzeit beim Host nur mit 0,2-facher Geschwindigkeit (Software-Grafik); Nyxa bekam
  17 von 18 Kills gutgeschrieben (ein Monster starb beim Host, bevor ihr Gerät es kannte – Testartefakt durch das
  sofortige Töten).
- Vorher (Stand 14.71, `diagw.js`): beim Wächter-Host `arenaHostCap()` = 0, `arenaDefaultMates()` = `[]`.
- `crowd.js` – Wächter + 12 weitere Spieler (über `NET_SMALL`), Licht und Schatten auf verschiedenen Karten, B tritt
  neu bei und nimmt die Einladung an; A läuft hin und her. Neue Positionen von A bei B in 10 s: **2** (14.71) → **18**
  (14.72). „nicht im Kanal“ trat in diesem Ablauf in beiden Ständen nicht auf (0 von 40 Proben).

