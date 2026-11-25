# Sicherheit 15.84

Eine Prüfung hat in 15.82 mehrere Lücken gefunden: Code aus der Datenbank oder von Mitspielern konnte in die Seite
gelangen (XSS), ein präparierter Link meldete Spieler still in einem fremden Konto an, Mitspieler konnten fremde
Verbindungen beenden, sich als Gildenanführer ausgeben oder dem Host beliebigen Schaden melden. 15.84 behebt das im
Spiel mit kleinen, gezielten Prüfungen; am Spielgefühl ändert sich nichts. Was nur auf dem Server geht (Regeln der
Datenbank, Server-Skripte), ist vorbereitet und hier Schritt für Schritt beschrieben.

Jede Änderung im Code trägt den Kommentar „seit 15.84: …“.

## Übersicht

| Fund | Stand | Dateien |
|---|---|---|
| K1 Gespeichertes XSS über Datenbank-Schlüssel | behoben im Spiel; Regeln vorbereitet | `js/handel-db.js`, `js/post.js`, `js/auktionshaus.js`, `docs/firebase-regeln.json` |
| K2 XSS über Mehrspieler-Nachrichten (Betrachten, Version, Stufe, Handel, Turm) | behoben | `js/netz.js`, `js/interaktion.js`, `js/spiel.js`, `js/gemeinschaft.js`, `js/oberflaeche.js`, `js/ausruestung.js`, `js/turm.js`, `js/herausforderung.js` |
| H1 Umzug übernahm Konto und Spielstände ungefragt | behoben | `js/umzug.js` |
| H2 Fremde Verbindungskennung, `from: 'host'`, Hinauswurf per `hello` | im Spiel behoben; Signalisierung bleibt offen (siehe unten) | `js/netz-signal.js`, `js/netz.js` |
| H3 Absendername frei wählbar (Gilde, Freunde) | behoben | `js/gemeinschaft.js` (dazu `js/gruppe.js`, `js/gruppenfinder.js`) |
| M1 Schaden und Zustände der Mitspieler ungeprüft, PvP-Deckel an gemeldeter Stufe | begrenzt (ohne eigenen Server nicht ganz lösbar) | `js/netz.js`, `js/kampf.js` |
| M2 Stückelung, Zustandstypen, Dienerliste, Gruppenfinder, Chat-Kanal | behoben | `js/netz-signal.js`, `js/netz.js`, `js/gruppenfinder.js`, `js/oberflaeche.js` |
| M5 Service Worker speicherte jede Antwort (auch Firebase mit `?auth=`) | behoben | `sw.js` |
| M6 Keine Content-Security-Policy | eingebaut (`<meta>`), Server-Kopfzeile vorgeschlagen | `index.html` |
| Regeln der Datenbank | vorbereitet, **nicht eingespielt** | `docs/firebase-regeln.json` |
| Server: Wächter mit `--no-sandbox` und Fernsteuerung | vorbereitet, **nicht ausgerollt** | `server/waechter.sh` |
| Server: Mosquitto ohne ACL | nur beschrieben | diese Datei |

## K1 – Gespeichertes XSS über Datenbank-Schlüssel

**Vorher:** Briefe (`post/<uid>/<id>`) und Auktionen (`auktion/<id>`) wurden mit ihrem Datenbank-Schlüssel als
`data-mail="…"`, `data-buy="…"` und `data-cancel="…"` ins Fenster geschrieben. Jeder angemeldete Spieler kann Schlüssel
anlegen (Brief an jemanden, eigene Auktion) – ein Schlüssel mit `"` und HTML lief bei jedem, der Post oder Auktionshaus
öffnete.

**Jetzt:**
- `js/handel-db.js`: `handelIdOk` / `handelUidOk` – Schlüssel nur in der Form, die das Spiel selbst erzeugt
  (`handelId()`: Zeit + Zufall in Kleinbuchstaben und Ziffern, Auktionsbriefe `a<id>k/e/r`), also `[A-Za-z0-9_-]`, höchstens
  64 Zeichen; Konto-Kennungen (Firebase-uid) ebenso, höchstens 128.
- `js/post.js`: `postClean` verwirft Briefe mit anderem Schlüssel; `data-mail` und Meldungstexte maskiert (`escapeHtml`);
  die Kennung des Empfängers aus `namen/` wird geprüft (sie wird Teil des Pfads); als angezeigter Empfängername gilt der
  Name aus `namen/` nur, wenn er zum Schlüssel passt. Vor dem Senden wird der eigene Name angemeldet, falls das beim Start
  nicht geklappt hat; gehört der Name einem anderen Konto, schickt dieser Charakter keine Briefe (passend zur neuen Regel).
- `js/auktionshaus.js`: `ahParse` verwirft Auktionen mit anderem Schlüssel oder ungültiger Verkäufer-/Käufer-Kennung;
  `data-buy`, `data-cancel` und Meldungen maskiert. Briefe des Auktionshauses tragen jetzt `ah: <Auktionskennung>` – damit
  können die Regeln prüfen, dass ein solcher Brief zu einer echten, gerade abgerechneten Auktion gehört.

**Offen bis zum Einspielen der Regeln:** Die Datenbank nimmt weiterhin beliebige Schlüssel an (der Client verwirft sie
nur). Siehe „Regeln“.

## K2 – XSS über Mehrspieler-Nachrichten

**Betrachten** (`js/interaktion.js`): Die Antwort `ir` gilt nur noch, wenn man selbst kurz vorher bei genau diesem
Mitspieler „Betrachten“ angefragt hat (`askMark`/`askTake`). Der Inhalt geht durch `inspectClean`: Klasse nur aus
`CLASSES`, Stufe 1..80, Werte als ganze Zahlen, jedes Ausrüstungsteil über die vorhandene Gegenstandsprüfung `itemClean`
(`js/handel-ware.js`, mit Juwelen und Endgame-Erweiterungen). Die Kennung des Teils bleibt erhalten, damit die
Farbvariante stimmt.

**Versionshinweis** (`js/netz.js`, `js/spiel.js`): Versionen aus dem Netz gelten nur in der Form `15.84`
(`/^\d{1,3}(\.\d{1,3}){1,3}$/`, sonst „?“). `showUpdateBar` baut den Hinweis jetzt mit `textContent` – auch der Name des
Hosts oder Mitspielers im Text kann kein HTML mehr einschleusen.

**Spielerzustand und Stufe** (`js/netz.js`): Jeder Zustand aus dem Netz geht zentral durch `netCleanState` – beim Host
für `hello`, `st` und das Wiederaufnehmen nach Funkstille, beim Mitspieler für jeden Eintrag im Zustand (`snap`). Name
Text ≤ 16, Stufe 1..80, Klasse aus `CLASSES`, Listen nur als Liste und gekappt (Buffs ≤ 40, Diener ≤ 24), Zahlen endlich
und begrenzt, Ausrüstung nur mit bekannten Feldern. Nur diese Kopie wird übernommen, als `rp.last` gemerkt und vom
Host weiterverteilt (vorher verteilte der Host den Rohzustand an alle). Felder anderer Dateien (`pg`, `ti`, `ag`, `fr`)
sind berücksichtigt; weitere Felder anderer Dateien und neuerer Versionen kommen über eine allgemeine Typ- und
Längenprüfung durch (`netExtra`, siehe „Hinweise für neue Funktionen“ unten). Zusätzlich an den
Ausgabestellen: `social.classLine` (Freunde, Gilde, Gruppe) erzwingt Zahl und bekannte Klasse, Spielerkarte und
Kanalliste zeigen `level | 0`.

**Handel** (`js/interaktion.js`, `js/ausruestung.js`): `ta` öffnet den Handel nur nach eigener Handelsanfrage an diesen
Spieler (oder wenn man selbst dessen Anfrage annimmt). Das Angebot (`tradeOfferIn`) wird wie bei der Post behandelt:
höchstens 8 Teile, jedes über `itemClean`, Gold endlich und begrenzt; die Kennungen des anderen bleiben für den Abgleich
beider Angebote erhalten und stehen maskiert in den Attributen. `gear.tile` schreibt Plus und Anzahl immer als Zahl.

**Turm** (`js/turm.js`): Nachrichten zum Durchgang gelten beim Mitspieler nur vom echten Host (Kennung `host`, die kein
Mitspieler mehr bekommen kann, siehe H2). Ebene, Spielerzahl usw. sind Zahlen; das Gold für „Ebene geschafft“ geht
höchstens bis Ebene 15. Dasselbe Muster hatte die Prüfungsarena (`js/herausforderung.js`) – dort gilt jetzt ebenfalls nur
der Host.

**Zusätzlich:** Die Duell-Zusage `da` startet ein Duell nur noch nach eigener Duellanfrage an diesen Spieler. Der Name
in Einladungen und Meldungen kommt aus der Verbindung, nicht aus der Nachricht.

## H1 – Umzug (`js/umzug.js`)

**Zweck (bleibt):** Wer die alte Adresse `guendogdualper-coder.github.io/claude` öffnet, wird auf
`https://seelenstein.online` gebracht; die Spielstände reisen im `#umzug=`-Teil der Adresse mit.

**Vorher:** Die neue Seite übernahm bei jedem Laden ohne Rückfrage alles aus `#umzug=` – auch `seelenstein.konto`
(Anmeldung samt Schlüsseln) und `seelenstein.geraet`. Ein präparierter Link meldete jeden still im Konto des Angreifers an
(der eigene Fortschritt landete dort) und überschrieb gleichnamige Charaktere.

**Jetzt:**
- `seelenstein.konto` und `seelenstein.geraet` reisen nicht mehr mit und werden nie übernommen. Nach dem Umzug meldet man
  sich auf der neuen Adresse einmal neu an.
- Die Daten bleiben nur im Speicher der Seite; es erscheint die Rückfrage **„Spielstände von einem anderen Gerät
  übernehmen?“** mit den Namen und Stufen der Charaktere. „Nicht übernehmen“ verwirft alles.
- „Übernehmen“: Charaktere nur auf freie Plätze; gleichnamige vorhandene Charaktere bleiben unberührt. Jeder Spielstand
  wird wie beim Retten geprüft und repariert (`rettenReparieren`, `js/retten.js`), der Name muss der Regel beim Erstellen
  entsprechen, Freundes- und Gildenlisten werden gekappt und geprüft. Einstellungen nur, wo es auf dem Gerät noch keine
  gibt. Danach lädt das Spiel neu.

## H2 – Verbindungskennung und `hello`

**Vorher:** Der Host übernahm die Kennung einer Verbindung aus dem Angebot (`d.from`). Wer die Kennung eines anderen
schickte, beendete dessen Verbindung; mit `from: 'host'` wären weitergereichte Nachrichten als Nachrichten des Hosts
erschienen (Turnierarena, Prüfungsarena, Turm). Ein `hello` mit fremdem Namen warf den Spieler mit diesem Namen hinaus.
`sigFresh` hielt eine Host-Meldung ohne Zeit (`at`) für immer frisch.

**Jetzt (`js/netz-signal.js`):** Der Host vergibt die Kennung selbst (`c` + 12 Zufallszeichen). `d.from` ist nur noch das
Postfach für die Antwort und muss die Form eigener Kennungen haben; die Kennung des Notwegs (`d.r`) ebenso – Zeichen wie
`+`, `#` oder `/` hätten als MQTT-Thema fremde Postfächer oder alle Notwege abonniert. `sigFresh` verlangt eine gültige
Zeit (höchstens 45 s alt, Uhren bis 10 Minuten voraus werden toleriert).

**Jetzt (`js/netz.js`):** `netAccept` nimmt keine Verbindung mit der Kennung `host` an (Schutz auch für den
PeerJS-Notweg). Ein `hello` (und das Wiederaufnehmen per `st`) mit einem Namen, den eine noch sprechende Verbindung
oder der Host selbst trägt, wird abgelehnt (`{ t: 'full', dup: 1 }`); nur eine Verbindung, die seit 3 s schweigt (App
war zu, neu eingeloggt), wird als Geist ersetzt. Der neue Client versucht es bei `dup` bis zu dreimal nach 5 s erneut
(ältere Clients zeigen „Kanal voll“). Der Name einer Verbindung bleibt der aus dem `hello`. Weitergereichte Nachrichten
tragen die Kennung des Absenders aus der Verbindung und seinen Namen (`fn`), nie `host`.

**Offen (nur mit Server lösbar):** Die Vermittlung läuft über öffentliche MQTT-Broker ohne Anmeldung. Wer die Themen
kennt, kann Angebote mitlesen, Nachrichten in einen Notweg einspeisen, Kanäle mit falschen Host-Meldungen eine Weile
„besetzt“ halten oder sich im `hello` als Welt-Wächter (`w: 1`) ausgeben, worauf ein Spieler-Host den Kanal übergibt.
Abhilfe bräuchte eine Anmeldung am eigenen Broker und vom Server bestätigte Host-Meldungen.

## H3 – Gilde und Freunde (`js/gemeinschaft.js`)

- Absender ist immer der Name aus der Verbindung (`netSenderName` in `js/netz.js`: Zustand der Figur, sonst der Stempel
  `fn` des Hosts). Ohne bekannten Absender gilt keine dieser Nachrichten.
- `gk` (Rauswurf) nur vom echten Anführer; `gl` (Austritt) entfernt nur den Absender selbst, einen neuen Anführer
  bestimmt nur der bisherige und nur unter den Mitgliedern.
- `gs` (Mitgliederliste) nur von bekannten Mitgliedern; die Liste wird geprüft (Namen ohne HTML-Zeichen, Klasse, Stufe)
  und gekappt, die Gilde wächst höchstens auf 30 Mitglieder.
- `gi` (Einladung) nur vom Anführer selbst, Gildenname wie beim Gründen geprüft; `ga` (Beitritt) und `fa`
  (Freundschaft angenommen) nur auf eine eigene offene Einladung bzw. Anfrage an diesen Spieler.
- Automatik: Wer nur den Gildennamen im Zustand trägt, kommt nicht mehr von selbst in die Mitgliederliste und bekommt sie
  auch nicht. Damit neue Mitglieder trotzdem gleich überall erscheinen, schickt der Anführer nach einem Beitritt die
  neue Liste an alle Mitglieder im Kanal.
- Freundesliste höchstens 200, offene Anfragen höchstens 30.
- Zusätzlich (gleiches Muster): Gruppe (`js/gruppe.js`) und Gruppenfinder (`js/gruppenfinder.js`) nehmen den Absender
  ebenfalls aus der Verbindung (nur ohne bekannte Verbindung – Host einer älteren Version – wie bisher aus der Nachricht).

## M1 – Treffer der Mitspieler

**`js/netz.js` (`netHostDamage`):**
- Nur Monster in Reichweite des Spielers (1600 Pixel um seinen gemeldeten Ort).
- Schaden je Treffer und Schaden über Zeit je Sekunde höchstens `2000 × (120 + 27 × Stufe)` (Stufe 80: 4,56 Mio.).
  Gemessen: der stärkste Angriff mit bester Ausrüstung auf Stufe 80 liegt bei etwa 1.100 (mit Waffenspanne gut 1.700);
  Fertigkeit, Rang, Fertigkeitsstärke, Krit, Tarnung und Boni zusammen bleiben unter dem Faktor 500. Die Grenze lässt also
  das Doppelte bis Vierfache jedes ehrlichen Treffers zu und liegt weit unter dem Leben der großen Bosse (bis 27,6 Mio.).
- Betäubung und Einfrieren höchstens 4 s (vorgeschlagen waren 3 s; die Ulti betäubt ehrlich 3,5 s), Rückstoß höchstens
  900 (ehrlich bis 600), Verwundbarkeit ×1..×4 und höchstens 30 s, Verlangsamung nicht unter ×0,05 und höchstens 30 s,
  Frostschwächung ×0,4..×1 (vorher ließ ein Wert über 1 ein Monster mit vielfacher Kraft zuschlagen), Gift, Brand und
  Blutung höchstens 30 s.
- „Tödlich“ (`k`) gilt nur, wenn nach dem Treffer höchstens ein Viertel des Lebens übrig wäre (der Zeitversatz, für den
  `k` gedacht ist, bleibt abgedeckt; auch das Nachschicken mit dem Lebensstand des Hosts).

**`js/kampf.js`:** `pvpIncoming` klemmt die gemeldete Stufe auf 1..80 und den Schaden auf eine endliche Zahl;
`pvpReceiveHit` (Duell, Turnierarena, offener Kampf) nimmt die bekannte Stufe des Gegners aus dem Netzzustand.

**Grenzen:** Ohne eigenen Server kann der Host nicht beweisen, dass ein Treffer wirklich geschlagen wurde. Ein Betrüger
kann weiterhin mehr Treffer schicken, als er schlägt; die Grenzen verhindern absurde Werte und das Töten mit einer
einzigen Nachricht.

## M2 – Robustheit

- `js/netz-signal.js`: Stücke langer Nachrichten nur mit `n` 1..64, `i` 0..n−1, `s` Text bis 15.000 Zeichen; höchstens
  4 unfertige Nachrichten zugleich (die älteste fällt weg), zusammen höchstens 960 KB. Die größte echte Nachricht (die
  ganze Welt für den Welt-Wächter) hat rund 547 KB = 37 Stücke.
- `js/netz.js`: Typen werden vor dem Speichern geprüft (`netCleanState`); vorher warf `b` ohne Liste nach dem Speichern bei
  allen Mitspielern bei jedem Zustand. Dienerliste ≤ 24 Einträge, nur Listen; Monster- und Spielerlisten im Zustand nur als
  Listen.
- `js/gruppenfinder.js`: `sz` auf die Gruppengröße der Aktivität geklemmt (Höllenthron 7, sonst 5), Stufen und Einträge
  geprüft.
- `js/oberflaeche.js` / `js/netz.js`: Chat-Kanal nur `g`, `gi`, `o` (und `sys` im eigenen Spiel), Text aus dem Netz
  höchstens 120 Zeichen; der Host gibt nur die geprüfte Nachricht weiter (`netChatClean`).

## M5 – Service Worker (`sw.js`)

- Fremde Adressen (Firebase mit `?auth=…`, Werbung, Broker) gehen am Service Worker vorbei und landen nicht mehr im
  Speicher des Geräts.
- Gespeichert werden nur vollständige eigene Antworten (`res.ok && res.type === 'basic'`).
- Abfrageteile wählen im Spiel keine andere Datei (geprüft: `js/spiel.js?v=Zeit` ist nur die Versionsprüfung,
  `?quelle=…`, `?server=…&kanal=…` betreffen nur die Seite, `manifest.webmanifest?ping=` ist ein `HEAD`,
  `?umzug=` geht an die neue Adresse). Darum: Seitenaufrufe liegen unter ihrer Adresse ohne Abfrage; Dateien mit Abfrage
  (die Versionsprüfung) kommen gar nicht in den Speicher – sonst könnte offline eine neuere `spiel.js` mit älteren
  Dateien gemischt werden. Gesucht wird wie bisher mit `ignoreSearch`, offline startet das Spiel weiter.
- Beim nächsten Erhöhen von `VERSION` (neue Version) werden die alten Speicher samt eventuell gespeicherter
  Firebase-Antworten gelöscht.

## M6 – Content-Security-Policy

**Eingebaut** als `<meta http-equiv="Content-Security-Policy">` ganz oben in `index.html`:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self';
media-src 'self' blob:; connect-src 'self' https://*.firebasedatabase.app https://*.firebaseio.com
https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://seelenstein.online
wss://server.seelenstein.online wss://broker.hivemq.com:8884 wss://broker.emqx.io:8084; worker-src 'self';
manifest-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'
```

Das Spiel hat keine Inline-Skripte, keine `onclick="…"`-Attribute und kein `eval`; Skripte kommen nur vom eigenen
Server. Inline-**Stile** bleiben erlaubt (das Spiel setzt sehr viele). Getestet ohne eine einzige „Refused to …“-Meldung
und ohne Seitenfehler: Titel und Start, Spielen in 2D und 3D (Grundangriff, Fertigkeiten), Inventar (Symbole als
`data:`-Bilder), Konto-Anmeldung (Firebase Auth), Bestenliste (Firebase-Datenbank), Mehrspieler-Aufbau (alle drei
Broker), eigene Werbepause (Video), Service Worker. Gegenprobe: ein eingeschleustes `onerror="…"`, ein Inline-Skript und
Verbindungen zu fremden Adressen werden blockiert.

**Zu beachten:**
- Wer das Werbenetz einschaltet (`WERBUNG.h5Kunde` in `js/werbung.js`), muss die Richtlinie erweitern, sonst blockiert sie
  die Werbung – nach Googles Vorgaben mindestens `script-src` um `https://pagead2.googlesyndication.com
  https://*.googlesyndication.com https://*.google.com https://*.gstatic.com https://*.adtrafficquality.google`,
  `frame-src` um `https://*.doubleclick.net https://*.googlesyndication.com https://*.google.com`, `img-src` um `https:`
  und `connect-src` um `https://*.google.com https://*.doubleclick.net https://*.googlesyndication.com
  https://*.adtrafficquality.google`. Danach mit eingeschalteter Testwerbung (`h5Test: true`) prüfen.
- Eine andere Firebase-Datenbank als `*.firebasedatabase.app` / `*.firebaseio.com` oder ein anderer eigener Broker
  muss in `connect-src` ergänzt werden.
- Der PeerJS-Notweg (`js/peerjs.min.js`, nur wenn `js/netz-signal.js` fehlt) bräuchte `0.peerjs.com` – er ist nicht
  eingetragen, weil er im Betrieb nicht genutzt wird.

**Vorschlag für den Server (Caddy):** `frame-ancestors` wirkt nur als HTTP-Kopfzeile. Im Block der Hauptdomain
(`server/setup.sh`, `$MAIN { … }`) ergänzen:

```
	header {
		Content-Security-Policy "<Richtlinie von oben>; frame-ancestors 'self'"
		X-Content-Type-Options "nosniff"
		Referrer-Policy "strict-origin-when-cross-origin"
	}
```

Dann `systemctl reload caddy` und im Browser (Entwicklerwerkzeuge → Konsole) prüfen, dass keine „Refused to …“-Meldung
erscheint. Doppelt (Kopfzeile und `<meta>`) schadet nicht; es gelten beide.

## Regeln der Datenbank (`docs/firebase-regeln.json`) – vorbereitet, nicht eingespielt

**Was neu ist:**
- `post/<uid>/<id>` und `auktion/<id>`: Schlüssel nur `[A-Za-z0-9_-]`, höchstens 64 Zeichen (K1).
- Briefe an andere: `von` ist nicht mehr frei wählbar – `vonKey` muss `von` in Kleinbuchstaben sein, und
  `namen/<vonKey>` muss dem schreibenden Konto gehören.
- Briefe des Auktionshauses (`sys: 'ah'`) an andere nur im Zuge einer echten Abrechnung: mit `ah: <Auktion>`, Schlüssel
  `a<Auktion>k|e|r`, die Auktion hat einen Käufer, wird im selben Schreibvorgang gelöscht, und der Schreibende ist der
  Übernehmende (oder der Verkäufer nach einer Stunde). Empfänger, Gold (`e` = Kaufpreis, sonst 0) und Ware (die der
  Auktion) müssen passen. `sys` hat nur den Wert `ah`.
- `namen/<schlüssel>`: der Name muss zum Schlüssel passen (Name in Kleinbuchstaben = Schlüssel), 2–14 Zeichen, ohne
  `<`, `>`, `&`, `"`.

**Damit der heutige Client weiter funktioniert, wurde er angepasst:** Briefe des Auktionshauses tragen `ah`; vor dem
Senden eines Briefs meldet das Spiel den eigenen Namen an (falls nötig). Einzige Verhaltensänderung: Ein Charakter, dessen
Name schon von einem anderen Konto angemeldet ist, kann keine Briefe mehr schicken (das wäre genau das Schreiben unter
fremdem Namen); das Spiel sagt das im Postfenster.

**Reihenfolge:** Erst 15.84 ausliefern, dann die Regeln einspielen. Läuft irgendwo noch eine ältere Version, lehnt der Server dessen
Abrechnungen im Auktionshaus ab, bis das Spiel neu geladen wurde (die Update-Leiste erscheint von selbst); offene
Abrechnungen holt 15.84 danach automatisch nach (beim Öffnen des Auktionshauses). Es geht nichts verloren.

**Schritt für Schritt (Firebase-Konsole):**
1. <https://console.firebase.google.com> öffnen und das Seelenstein-Projekt wählen.
2. Links **Build → Realtime Database**, oben den Reiter **Regeln**.
3. Zur Sicherheit den bisherigen Inhalt komplett kopieren und aufheben (Rückweg).
4. Alles im Editor markieren und durch den vollständigen Inhalt von `docs/firebase-regeln.json` ersetzen.
5. Optional vorher im **Regel-Playground** (Simulator, Knopf „Rules Playground“) prüfen, z. B.: angemeldet als Konto A,
   Schreiben nach `post/<uid B>/abc123` mit `{ "an": "B", "von": "A-Name", "vonKey": "a-name", "vonUid": "<uid A>",
   "at": 1, "betreff": "", "text": "x", "gold": 0 }` – erlaubt, wenn `namen/a-name` dem Konto A gehört, sonst abgelehnt.
   Der Playground prüft nur einen Pfad je Versuch; die Abrechnung im Auktionshaus (mehrere Pfade auf einmal) prüft man
   am besten echt (Schritt 7).
6. **Veröffentlichen** drücken.
7. Prüfen im Spiel (mit zwei Konten): Brief mit Anhang schicken und abholen; im Auktionshaus etwas einstellen, mit dem
   anderen Konto kaufen (Ware und Erlös kommen per Post), ein Angebot abbrechen. Kommt „Der Server hat abgelehnt …“,
   die Regeln aus Schritt 3 wieder einsetzen und Bescheid geben.

**Was danach anders ist:** Präparierte Schlüssel lassen sich nicht mehr anlegen; Briefe kommen nur noch unter dem eigenen,
angemeldeten Namen an; „Briefe des Auktionshauses“ lassen sich nicht mehr fälschen (auch kein Gold über erfundene
Verkäufe); Einträge in `namen/` passen immer zu ihrem Schlüssel.

**Bleibt offen:** Gold in normalen Briefen wird nicht gegen das Gold des Absenders geprüft (das liegt als Text im Konto und
ist für Regeln nicht lesbar) – wie bisher ist die Spielwirtschaft letztlich clientseitig. Optional (nicht eingebaut, weil
nicht gefordert): dieselbe Namensprüfung für `von` beim Einstellen von Auktionen.

## Server (vorbereitet, nicht ausgerollt)

### `server/waechter.sh`
- Die Fernsteuerung (`--remote-debugging-address/-port`) ist entfernt. Sie wurde von nichts genutzt (kein Skript, keine
  Anleitung), erlaubte aber jedem Programm auf dem Server, den Wächter – den Host aller Kanäle – fernzusteuern.
- `--no-sandbox` steht nur noch dort, wo die Sandbox von Chromium nicht startet: Das Skript probiert sie beim Einrichten
  als Benutzer `seelenstein` aus (Debian 13 erlaubt die nötigen Benutzer-Namensräume) und meldet es, wenn es ohne gehen
  muss.

Ausrollen: auf dem Server als root `bash waechter.sh` (bzw. `bash waechter.sh "1"`) erneut ausführen – das schreibt die
Unit neu und startet die Wächter neu. Prüfen: `systemctl status 'seelenstein-waechter@*'` (läuft), `ps aux | grep
remote-debugging` (keine Treffer), `journalctl -u seelenstein-waechter@1 -n 50` (kein „No usable sandbox“).

### Mosquitto (`server/setup.sh`) – Vorschlag, nicht umgesetzt
Heute darf jeder anonym jedes Thema lesen und schreiben (auch `#`, also alles). Eine ACL kann das auf die Themen des
Spiels beschränken:

```
# /etc/mosquitto/seelenstein.acl – anonyme Clients nur mit den Themen des Spiels
topic readwrite seelenstein8/ch/+/in
topic readwrite seelenstein8/ch/+/host
topic readwrite seelenstein8/p/+
topic readwrite seelenstein8/+/h
topic readwrite seelenstein8/+/j
```

und in `/etc/mosquitto/conf.d/seelenstein.conf` die Zeile `acl_file /etc/mosquitto/seelenstein.acl` ergänzen, dann
`systemctl restart mosquitto`. Vorher mit `mosquitto_sub`/`mosquitto_pub` (über `wss://…/mqtt`) prüfen, dass ein
Kanalbeitritt weiter klappt, und danach im Spiel zwei Geräte in denselben Kanal bringen.

Grenzen: Die ACL verhindert das Abhören von `#` und fremden Themen außerhalb des Spiels, aber nicht das Abonnieren
mit `+` innerhalb der Spielthemen (Mosquitto prüft Abos gegen das Muster). Außerdem laufen dieselben Nachrichten
parallel über die öffentlichen Broker (HiveMQ, EMQX), die man nicht einschränken kann. Wirklich schützen würde nur eine
Anmeldung am eigenen Broker mit Themen je Gerät – das wäre ein größerer Umbau.

## Hinweise für neue Funktionen (Netz)

Die Säuberung arbeitet über Typen und Längen, nicht über eine Liste erlaubter Nachrichten. Was neue Funktionen wissen
müssen:

- **Felder im Spielerzustand** (`netPlayerState` / `netApplyState`): Ohne Anmeldung kommen Felder mit kurzem Schlüssel
  (1–6 Zeichen, Buchstabe zuerst) durch, wenn ihr Wert einfach ist – endliche Zahl, Wahrheitswert, Text bis 64 Zeichen
  ohne `<` und `>`, flache Liste mit bis zu 8 solchen Werten oder flaches Objekt mit bis zu 8 Schlüsseln und solchen
  Werten; höchstens 16 solcher Felder. So reisen schon heute z. B. Haustier `pe` (Kennung), Geste `em`
  (`[Nummer, Zähler]`), Risslauf `rl` (`[Stufe, Sekunden]`) und Gilden-Inhalte `gx` (`[Beitrag, Stufe, Woche]`)
  unverändert mit. Tiefer geschachtelte Werte fallen weg – wer so etwas braucht, trägt das Feld mit eigener Prüfung in
  `netCleanState` (`js/netz.js`) ein.
- **Diener-Liste** `al`: Einträge `[x, y, Stufe, Bits, Platz, Geist-Art, …]`, Platz 0–999; ab Stelle 7 bleiben bis zu
  vier einfache Werte erhalten (z. B. die Rolle `t/h/s` der Begleiter auf den Plätzen ab 60). Lücken werden mit 0
  gefüllt, damit beim Empfänger kein `null` ankommt.
- **Felder an Ausrüstungsteilen im Zustand** (`eq[Platz]`): ebenso bis zu 6 einfache Zusatzfelder je Teil (Text bis
  90 Zeichen ohne `<` `>`), z. B. das Aussehen der Garderobe `eq[Platz].optik`.
- **Die Werte selbst prüft jede Datei gegen ihre eigenen Tabellen** (wie Garderobe, Haustiere, Gesten und Risslauf es
  tun) und zeigt fremde Texte nur mit `escapeHtml` oder `textContent`.
- **Betrachten** (`ir`): Teile laufen über `itemClean`; zusätzlich bleibt `optik` (Text wie `Platz:Form:Stufe:Farbe`) für
  die Puppe erhalten. Weitere Felder bräuchten einen Eintrag in `inspectClean` (`js/interaktion.js`).
- **Soziale Nachrichten** (`onSocial`, `k: '…'`): Keine Anmeldung nötig – neue Arten hängen sich wie bisher mit einem
  eigenen Wrapper um `onSocial` ein (z. B. Rissläufe `rl…`, Stadt-Angriffe `ag…`, Gilden-Inhalte `gxt`, `gbr`, `gba`,
  `gbn`). Die strengeren Prüfungen in `js/gemeinschaft.js` gelten nur für genau `fr`, `fa`, `gi`, `ga`, `gs`, `gk` und
  `gl`; alle anderen Arten laufen unverändert durch. Den Absender nimmt man aus der
  Verbindung: `netSenderName(pid)` (nicht `d.n`). Nachrichten, die nur der Host schicken darf, prüft man auf
  `pid === 'host'` – diese Kennung bekommt seit 15.84 kein Mitspieler mehr.
- **Eigene Nachrichtentypen** (`t: '…'` direkt zwischen Host und Mitspieler) werden nicht verworfen; der Host reicht
  `rel` unverändert weiter (mit Absender `from` und Namen `fn` aus der Verbindung).

## Tests (für Entwickler)

Geprüft mit Chromium/Playwright gegen den Arbeitsstand: präparierte Nachrichten und Daten mit
`<img src=x onerror=…>` direkt an die Empfangsfunktionen (Post, Auktionshaus, Betrachten, Handel, Version, Zustand,
Gilde, Freunde, Chat, Gruppenfinder, Turm, Arena, Stückelung, Host-`hello`, Treffer, PvP, Umzug, Service Worker) – kein
Code lief, nichts warf. Positivtests: Post lesen, Auktion kaufen/abbrechen (Fenster), Handel mit Anfrage und Abschluss,
Betrachten mit Anfrage, Gilde einladen/annehmen/austreten, Freundschaft, Mehrspieler-Zustand, normale Treffer und
Zustände, PvP-Treffer, Umzug mit Rückfrage, Service Worker offline-Treffer. Dazu ein Ende-zu-Ende-Test mit Host und
Mitspieler in zwei Seiten (Vermittlung über einen nachgebauten Broker) und ein Rauchtest des ganzen Spiels in 2D und 3D
mit der CSP. Die Regeln wurden mit einem kleinen Nachbau der Regelauswertung für alle Abläufe von Post und Auktionshaus
geprüft – im echten Firebase bitte Schritt 7 oben machen.
