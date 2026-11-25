# Push-Nachrichten (Benachrichtigungen) – Erinnerungen ohne Server

Seelenstein kann Spieler an die Tagesbelohnung, Doppel-EP-Wochenenden, das Ende der PvP-Saison, Weltbosse und nach einer
längeren Pause erinnern. Alles wird **auf dem Gerät** berechnet und geplant. Es gibt keinen Push-Server, keine Konten-Daten,
keine Gerätekennungen.

## 1. Kurz gesagt

| Plattform | Was geht | Was du tun musst |
|---|---|---|
| **iPhone/iPad-App** (Capacitor, `ios/`) | Echte Mitteilungen, auch wenn die App geschlossen ist | **Nichts Pflichtiges.** Das Plugin ist seit dem ersten App-Build drin, die Funktion kommt mit dem Website-Update. Ein neues App-Update ist freiwillig (Abschnitt 5.3), z. B. um die Store-Texte anzupassen. |
| **Windows-App** (Electron, `desktop/`) | Windows-Mitteilungen, solange das Programm läuft (auch minimiert) | Neue Desktop-Version bauen und im Microsoft Store einreichen (Abschnitt 6). Bis dahin fehlt die Einstellung in der Windows-App. |
| **Android-App** (TWA) und **Browser** | Nichts, die Einstellung wird dort nicht angezeigt | Nichts. Was es dafür bräuchte: Abschnitt 7. |

## 2. Was der Spieler sieht

- **Einstellung „Benachrichtigungen“**: Einstellungen (Zahnrad, Taste O) → Reiter **„Figur und Spiel“**, direkt unter
  „Oberfläche“. **Standard: aus.** Beim Einschalten fragt iOS einmal nach der Erlaubnis („Seelenstein möchte dir Mitteilungen
  senden“). **Ausschalten löscht alle geplanten Erinnerungen.** Ist sie an, zeigt der Abschnitt unter „Als Nächstes“ die
  nächsten fünf geplanten Erinnerungen mit Tag und Uhrzeit.
  In der Windows-App steht darunter: „Die Windows-App meldet sich, solange sie läuft – auch minimiert.“
- Hat jemand die Mitteilungen in den iPhone-Einstellungen verboten, bleibt der Schalter aus und es erscheint der Hinweis
  „Mitteilungen sind in den Geräte-Einstellungen ausgeschaltet: Einstellungen → Seelenstein → Mitteilungen.“
- **Einmal fragen**: Nach dem ersten Abholen der Tagesbelohnung in der App kommt einmal die Frage „Benachrichtigungen
  einschalten?“ mit „Nein, danke“ / „Ja, erinnern“. Danach nie wieder, egal wie die Antwort war.
- **Fenster „Tagesbelohnung“**: unten die Zeile „🔔 Benachrichtigungen sind an/aus“ mit „Einschalten“/„Ausschalten“.
- **Ratgeberin** (Kategorie „Einstellungen“): „Kann mich das Spiel erinnern (Benachrichtigungen)?“ – auf allen Plattformen,
  erklärt auch, warum es im Browser und in der Android-App keine gibt.

Die frühere „Erinnerung an die Tagesbelohnung“ der iPhone-App (bis jetzt in `js/nativ.js`) ist darin aufgegangen: Wer sie an
hatte, hat jetzt die Benachrichtigungen an (ohne neue Frage); wer „Nein“ gesagt hatte, wird nicht noch einmal gefragt. Die alte
geplante Mitteilung wird gelöscht.

## 3. Welche Erinnerungen wann

| Art | Wann | Text (Deutsch; in der Spielsprache gesendet) |
|---|---|---|
| Tagesbelohnung | **Abgeholt:** am nächsten Tag zur selben Uhrzeit, zu der zuletzt gespielt wurde. **Noch nicht abgeholt:** drei Stunden später, spätestens 21 Uhr (sonst am nächsten Tag) | „Tagesbelohnung“ · „Deine Tagesbelohnung ist wieder bereit!“ (Tag 7: „… – heute wartet die Heldentruhe!“; noch offen: „Deine heutige Tagesbelohnung wartet noch auf dich!“) |
| Doppel-EP-Wochenende | Beginn des nächsten Wochenendes, Freitag 18 Uhr (aus `js/ereignisse.js`, `EV.ep`) | „Doppel-EP-Wochenende!“ · „Doppelte Erfahrung bis Sonntag 24 Uhr“ |
| Saisonende | 3 Tage vor dem Ende der PvP-Saison (`evSaison`, Ende 0 Uhr Weltzeit → bei uns 9 Uhr morgens). Nur für Figuren mit mindestens einem Rangkampf | „Die PvP-Saison endet in drei Tagen“ · „Jetzt noch Rangkämpfe bestreiten – am Saisonende zählt deine beste Rangstufe.“ |
| Weltboss | Ab Stufe 75 (`WB.minLevel`): 10 Minuten vor dem nächsten Weltboss am Abend (Meldung ab 17 Uhr). Der Zeitplan ist fest (alle 3 Stunden, `js/weltboss.js`), darum ohne Server berechenbar | „Weltboss in 10 Min.“ · Name des Bosses · Karte |
| Pause | 3 Tage nach dem letzten Spielen, zur selben Uhrzeit | „Lange nicht gesehen!“ · „Deine Abenteuer und deine Tagesbelohnung warten auf dich.“ |

**Regeln**

- **Nie nachts:** erlaubt ist 9:00–21:59 Uhr (Uhr des Geräts). Fällt etwas vor 9 Uhr, kommt es um 9 Uhr; fällt es auf 22 Uhr
  oder später, kommt es um 21 Uhr desselben Tages (so bleibt die Tageserinnerung am richtigen Tag).
- **Höchstens zwei am Tag**, dazwischen **mindestens zwei Stunden**. Erinnerungen, die heute schon gekommen sind, zählen mit.
- Bei Konflikten gewinnt die wichtigere: Saisonende → Doppel-EP → Tagesbelohnung → Pause → Weltboss. Die anderen weichen um
  zwei oder vier Stunden aus (der Weltboss auf einen früheren Weltboss desselben Tages, ab 12 Uhr) oder entfallen.
- **Nicht, während gespielt wird:** Auf dem iPhone werden fällige Mitteilungen bei offener App nicht eingeblendet
  (`foreground: false`), in der Windows-App nicht, solange das Spielfenster vorn ist.
- Es ist immer nur **eine** Erinnerung je Art geplant. Wer gar nicht mehr spielt, bekommt also höchstens die nächste
  Tageserinnerung, die eine „Pause“-Erinnerung und die nächsten Ereignisse – kein tägliches Nachbohren.
- Mitteilungen auf dem iPhone kommen **ohne Ton** (wie die bisherige Erinnerung).

**Neu geplant wird** bei jedem Spielstart, beim Abholen der Tagesbelohnung, beim Ein- und Ausschalten, bei der Rückkehr in die
App, wenn eine Figur Stufe 75 oder ihren ersten Rangkampf erreicht, und alle 10 Minuten, solange gespielt wird. In der
Windows-App nur, solange das Fenster vorn ist – sonst würden „morgen zur selben Uhrzeit“ und „drei Tage Pause“ weiterwandern,
während die App minimiert läuft. Beim Spielstart werden alte, schon zugestellte Mitteilungen aus der Mitteilungszentrale
entfernt.

## 4. Technik

| Datei | Inhalt |
|---|---|
| `js/benachrichtigung.js` | Einstellung, Frage, Zeile im Fenster „Tagesbelohnung“, Ratgeber-Eintrag, Planung (`planen(jetzt, spieler, vorher)` ist reine Rechnung) und Übergabe an iOS bzw. Windows. Im Browser macht die Datei nur den Ratgeber-Eintrag. |
| `js/nativ.js` | Die alte Tageserinnerung ist entfernt (Haptik beim Abholen bleibt). |
| `desktop/preload.js` | Brücke `window.seelensteinDesktop.benachrichtigungen` (`unterstuetzt`, `planen`, `loeschen`) – nur im Hauptfenster. |
| `desktop/meldungen.js` | Zeitgeber im Hauptprozess, prüft jede Liste (höchstens 12 Einträge, Texte bis 300 Zeichen, nur Zukunft bis 60 Tage). |
| `desktop/main.js` | Lädt `preload.js` ins Hauptfenster, nimmt Aufträge nur vom Spiel auf der eigenen Domain an. |
| `neue-texte-push.json` | Alle neuen sichtbaren Texte in 14 Sprachen (für die Wörterbücher `js/sprachen/`). |

- **Erkennung:** iPhone-App = `Capacitor.isNativePlatform()` und Plugin `LocalNotifications` vorhanden; Windows-App =
  `window.seelensteinDesktop.benachrichtigungen` vorhanden. Sonst gilt „Browser“: keine Einstellung, nichts geplant.
- **Nummern:** Tagesbelohnung 9101, Doppel-EP 9102, Saisonende 9103, Weltboss 9104, Pause 9106; die alte Erinnerung aus
  `js/nativ.js` hatte 7001 und wird mit gelöscht. Eine neue Planung ersetzt Einträge mit derselben Nummer und löscht nur
  Nummern, die nicht mehr vorkommen (iOS löscht im Hintergrund – nie dieselbe Nummer löschen und gleich neu planen).
- **Gespeichert** (nur dieses Gerät): `localStorage["seelenstein.benachrichtigungen"] = { an, gefragt, geplant }`
  (`geplant` = Zeiten des letzten Plans, damit heute schon gesendete bei „zwei am Tag“ mitzählen). Übernommen wird beim ersten
  Start einmal `localStorage["seelenstein.nativ"].erinnerung`.
- **Texte:** nur aus festen Vorlagen (`TX` in der Datei) und festen Spieldaten (Name und Karte des Weltbosses), nie aus
  Spielernamen, Chat oder anderen Netzdaten. Übersetzt beim Planen mit `trText`, also in der gewählten Spielsprache
  (Sprachwechsel lädt das Spiel neu und plant neu). Mitteilungen sind reiner Text (iOS und Windows zeigen kein HTML).
- **Datenschutz:** Es verlässt nichts das Gerät. In App Store Connect („App-Datenschutz“) und bei Google Play ändert sich
  nichts. Empfohlen (freiwillig) ist ein Satz in `datenschutz.html`, z. B.: „Benachrichtigungen (iPhone- und Windows-App,
  freiwillig): Erinnerungen werden nur auf deinem Gerät berechnet und geplant; dabei werden keine Daten an uns oder Dritte
  übertragen.“

## 5. iPhone/iPad

### 5.1 Stand des iOS-Projekts (geprüft am 25. 11. 2026)

- Plugin **`@capacitor/local-notifications` 8.3.1** – die neueste 8er-Version, passend zu Capacitor 8.6.0 (`@capacitor/core`
  ≥ 8.0.0). Es steht seit dem ersten App-Build (4. 11. 2026) in `ios/package.json`, `ios/package-lock.json` und
  `ios/App/CapApp-SPM/Package.swift` (Swift Package Manager, keine CocoaPods). Am Ordner `ios/` musste deshalb **nichts**
  geändert werden.
- `.github/workflows/ios.yml` macht in beiden Jobs `npm ci` → `npx cap sync ios` (schreibt `Package.swift` und die
  Plugin-Liste neu) → `xcodebuild -resolvePackageDependencies`. Ein `cap sync` von Hand ist nicht nötig.
- `capacitor.config.json` hat `"handleApplicationNotifications": true` (Capacitor leitet die Mitteilungen ans Plugin weiter).
- **Info.plist:** Kein Eintrag nötig. iOS kennt für Mitteilungen keinen eigenen Berechtigungstext; den Dialog zeigt iOS selbst
  in der Gerätesprache (Deutsch, Englisch …). Unter *Capabilities* nichts ankreuzen: Lokale Mitteilungen brauchen keine
  Push-Berechtigung (APNs).
- Plugin-Feinheiten (aus dem Quelltext 8.3.1): Zeiten gehen als echtes `Date` an das Plugin; eine Zeit in der Vergangenheit
  würde **sofort** zugestellt – darum plant das Spiel nur mindestens zwei Minuten in die Zukunft. Ohne `sound` ist die
  Mitteilung still. `foreground: false` (ältere Fassungen: `silent: true`) blendet sie bei offener App nicht ein.
- Freiwillig beim **nächsten** App-Build (wenn ohnehin einer gemacht wird): in `ios/capacitor.config.json` unter `plugins`
  `"LocalNotifications": { "presentationOptions": [] }` ergänzen. Das Plugin merkt sich `foreground: false` nur im Speicher;
  nach einem Neustart der App gilt es erst wieder, wenn das Spiel neu geplant hat (beim Spielstart). Mit dem Eintrag blendet
  iOS auch in den Sekunden davor nichts über der offenen App ein. Jetzt nicht geändert, weil jede Änderung in `ios/` den
  Workflow „iOS-App“ mit TestFlight-Upload startet.

### 5.2 Brauche ich ein neues App-Update?

**Nein.** Das Spiel selbst (auch `js/benachrichtigung.js`) kommt von `seelenstein.online`. Sobald die Website die neue
Spielversion ausliefert, haben alle iPhone-Spieler die Einstellung – in der schon installierten App, ohne Prüfung durch Apple.

Ein neues App-Update lohnt sich nur, wenn du die **Store-Texte** anpassen willst (Beschreibung und „Neuerungen“ lassen sich nur
mit einer neuen Version ändern; der Werbetext jederzeit) oder ohnehin etwas an der Hülle änderst.

### 5.3 Neues iOS-Update ausliefern – Schritt für Schritt (freiwillig)

Voraussetzung: Die Änderungen liegen auf dem Zweig `claude/app-entwicklung-hhewbj`, die Website ist aktuell, und die vier
Secrets für TestFlight sind in GitHub eingetragen (`docs/ios/anleitung.md`, Abschnitt 5). **Gib Schlüssel und Passwörter nie
in einen Chat ein** – sie gehören nur in GitHub-Secrets bzw. App Store Connect.

1. **Workflow starten:** GitHub → **Actions** → links **„iOS-App“** → rechts **Run workflow**.
   - Branch: `claude/app-entwicklung-hhewbj`
   - Versionsnummer: höher als die letzte im App Store, z. B. **`1.0.1`** (die Buildnummer zählt von selbst hoch)
   - Haken „Nach erfolgreichem Bau zu TestFlight hochladen“ gesetzt lassen, Xcode-Feld leer lassen → **Run workflow**.
2. **Warten (15–25 Minuten):** Beide Jobs müssen grün werden – „Bauen (Simulator, ohne Signatur)“ und
   „App-Store-Build → TestFlight“. Ist der zweite übersprungen oder rot: `docs/ios/anleitung.md`, Abschnitt 6 (Tabelle der
   Fehlermeldungen).
3. **TestFlight:** App Store Connect → **Apps** → Seelenstein → **TestFlight**. Nach 5–30 Minuten ist der Build fertig
   verarbeitet. Auf dem eigenen iPhone über die App **TestFlight** installieren und Abschnitt 8 durchgehen.
4. **Neue Version anlegen:** App Store Connect → Seelenstein → links neben „iOS-App“ auf **+** → Versionsnummer genau wie im
   Workflow (z. B. `1.0.1`).
5. **„Neuerungen in dieser Version“** (*What's New*) eintragen:
   - Deutsch: „Neu: Benachrichtigungen. Auf Wunsch erinnert dich Seelenstein an deine Tagesbelohnung, an Doppel-EP-Wochenenden,
     das Ende der PvP-Saison und an Weltbosse – höchstens zweimal am Tag und nie nachts. Einschalten unter Einstellungen →
     Figur und Spiel.“
   - Englisch: „New: notifications. If you like, Seelenstein reminds you about your daily reward, double XP weekends, the end
     of the PvP season and world bosses – at most twice a day and never at night. Turn them on in Settings → Character and
     Game.“
6. **Beschreibung (freiwillig):** In `docs/ios/app-store-eintrag.md` steht unter „FÜR IPHONE UND IPAD GEMACHT“ die Zeile
   „Auf Wunsch eine Erinnerung an deine Tagesbelohnung, damit deine Reihe nicht abreißt“. Ersetzen durch „Auf Wunsch
   Benachrichtigungen: Tagesbelohnung, Doppel-EP-Wochenenden, Saisonende und Weltbosse – höchstens zweimal am Tag“
   (Englisch: „Optional notifications: daily reward, double XP weekends, season end and world bosses – at most twice a day“).
7. **Build wählen:** Im Abschnitt **Build** auf **+** → den neuen TestFlight-Build auswählen.
8. **Hinweise für die Prüfung** (*App Review Information → Notes*): die Zeile zur Erinnerung ersetzen durch:
   „Optional local notifications (opt-in, off by default; Settings > Character and Game > Notifications, or asked once after
   the first daily reward claim): daily reward, double XP weekend start, PvP season end, world boss and a single reminder
   after three days of inactivity. At most two per day, never between 22:00 and 09:00, not while the app is open. Scheduled
   on the device only with the LocalNotifications plugin; no push server, no data leaves the device.“
9. **App-Datenschutz:** nichts ändern.
10. Oben rechts **Zur Prüfung hinzufügen** (*Add for Review*) → **An App Review senden**. Die Prüfung dauert meist 1–2 Tage.
11. Nach der Freigabe (bei „manuell freigeben“): **Diese Version veröffentlichen**.

Hinweis: Jede Änderung im Ordner `ios/`, die auf den Zweig hochgeladen wird, startet den Workflow „iOS-App“ von selbst (mit
TestFlight-Upload, wenn die Secrets gesetzt sind). Diese Funktion ändert `ios/` nicht.

## 6. Windows (Electron)

Die Windows-App lädt das Spiel ebenfalls von der Website, braucht für Mitteilungen aber die neue Brücke
(`desktop/preload.js`, `desktop/meldungen.js`, Änderungen in `desktop/main.js` und `desktop/package.json`). Ohne neue
Desktop-Version fehlt die Einstellung dort einfach (nichts geht kaputt).

So funktioniert es: Das Spiel schickt seinen Plan (Nummer, Zeit, Titel, Text – schon übersetzt) an den Hauptprozess. Dort
laufen Zeitgeber, auch wenn das Fenster minimiert oder verdeckt ist. Ist das Spielfenster vorn, wird eine fällige Meldung still
verworfen. Ein Klick auf die Meldung holt das Fenster nach vorn. **Wird das Programm geschlossen, kommen keine Meldungen mehr**
(es gibt kein Symbol im Infobereich, das weiterläuft). Windows ordnet die Meldungen über die App-ID
`online.seelenstein.desktop` (Installer) bzw. das Store-Paket der App zu; abschalten lassen sie sich zusätzlich unter
Windows-Einstellungen → System → Benachrichtigungen.

**Ausliefern** (Einzelheiten in `docs/desktop-app.md`, Abschnitte 2 und 4):

1. GitHub → **Actions** → **„Desktop-App (Windows)“** → **Run workflow** → Versionsnummer höher als die letzte
   Store-Einreichung, z. B. **`1.2.0`** (in `desktop/package.json` steht noch 1.1.0). Hinweis: Der Workflow läuft außerdem von
   selbst, sobald Änderungen in `desktop/` auf den Zweig hochgeladen werden – er baut nur und lädt nichts in den Store.
2. Unter *Artifacts* den Installer laden und auf dem PC testen: Einstellungen → Figur und Spiel → Benachrichtigungen ein →
   die Liste „Als Nächstes“ zeigt die Zeiten → Spiel minimieren und eine Erinnerung abwarten (z. B. mit einer Figur ab Stufe 75
   die Weltboss-Erinnerung am Abend).
3. Partner Center → Seelenstein → **Update** → Paket durch `Seelenstein-Store-1.2.0-x64.appx` ersetzen → „Neuerungen“, z. B.:
   „Neu: Erinnerungen als Windows-Mitteilung (Einstellungen → Figur und Spiel → Benachrichtigungen), solange die App läuft.“
   → **An den Store übermitteln**.

## 7. Android-App (TWA) und Browser

Hier wird **nichts** geplant und die Einstellung **nicht angezeigt**. Der Grund: Eine Webseite kann ohne Server nichts melden,
wenn sie geschlossen ist. Zeitgeber laufen nur in einer offenen Seite, und die einzige Browser-Schnittstelle für geplante
lokale Mitteilungen (*Notification Triggers*) war ein Versuch in Chrome und wurde eingestellt. Eine Lösung „nur solange der Tab
offen ist“ wäre halbgar und wurde bewusst nicht gebaut.

Was es bräuchte (**Web Push**):

1. **Schlüsselpaar (VAPID):** Der öffentliche Schlüssel steht im Spiel, der private bleibt **nur auf dem Server** (Geheimnis,
   nie ins Repository).
2. **Anmelden im Spiel:** `Notification.requestPermission()` und `registration.pushManager.subscribe({ userVisibleOnly: true,
   applicationServerKey })`. Das Ergebnis (Endpunkt-Adresse und Schlüssel des Geräts) geht an den Server.
3. **Server-Dienst** (z. B. auf `server.seelenstein.online`): speichert je Gerät den Endpunkt und den Plan (am einfachsten
   genau die Liste, die `planen()` hier schon berechnet, mit fertigen Texten in der Spielsprache) und schickt zur richtigen Zeit
   verschlüsselte Push-Nachrichten (z. B. mit der Bibliothek `web-push`). Abgelaufene Endpunkte (Antwort 404/410) löschen.
   Alternative: Firebase Cloud Messaging – braucht aber ebenfalls einen Absender auf einem Server (Cloud Functions mit
   Blaze-Tarif und Dienstkonto-Schlüssel).
4. **Service Worker (`sw.js`):** Ereignis `push` → `self.registration.showNotification(...)`, Ereignis `notificationclick` →
   Spiel öffnen bzw. nach vorn holen.
5. **Android-App (TWA):** in `android/twa-manifest.json` `"enableNotifications": true` setzen (heute `false`), die App neu bauen
   (Bubblewrap, `tools/android-bauen.sh`) und bei Google Play einreichen. Ab Android 13 fragt das System nach der Erlaubnis.
   In der Play Console die **Datensicherheit** anpassen.
6. **Datenschutzerklärung** ergänzen: Der Push-Endpunkt ist eine Kennung des Geräts und liegt dann auf dem Server.
7. Hinweis: Safari auf dem iPhone kann Web Push nur für Web-Apps auf dem Home-Bildschirm (ab iOS 16.4). Die iPhone-App
   braucht das nicht, sie nutzt die lokalen Mitteilungen.

## 8. Prüfen auf dem Gerät (TestFlight oder installierte App)

1. Einstellungen → **Figur und Spiel** → **Benachrichtigungen** einschalten → iOS fragt → **Erlauben**. Der Schalter ist grün,
   unter „Als Nächstes“ stehen die Zeiten (alle zwischen 9 und 22 Uhr, höchstens zwei am Tag).
2. **Schnelltest:** Mit einer Figur ab Stufe 75 am Nachmittag oder Abend einschalten, die Zeit der Weltboss-Erinnerung in der
   Liste ablesen, App schließen. Zehn Minuten vor dem Weltboss kommt „Weltboss in 10 Min.“. (Die Uhr des iPhones vorzustellen
   hilft nicht: iOS zählt die Wartezeit, nicht die Uhrzeit.)
3. Am nächsten Tag kommt die Erinnerung an die Tagesbelohnung etwa zu der Uhrzeit, zu der du gespielt hast.
4. Bei offener App erscheint keine Mitteilung. Beim nächsten Spielstart sind alte Mitteilungen aus der Mitteilungszentrale weg.
5. **Ausschalten** → Liste weg, es kommt nichts mehr. In den iPhone-Einstellungen → Seelenstein → Mitteilungen aus → im Spiel
   erscheint der Hinweis dazu.
6. Spielsprache z. B. auf Englisch → die Mitteilungen kommen auf Englisch (sobald die Texte aus `neue-texte-push.json` in den
   Wörterbüchern stehen; bis dahin auf Deutsch bzw. mit den schon vorhandenen Einträgen).

## 9. Wie es getestet wurde (25. 11. 2026)

- Playwright mit **vorgetäuschter iOS-Brücke** (Capacitor + LocalNotifications als Attrappe, Zeitzone Europe/Berlin):
  Standard aus, Einschalten fragt nach der Erlaubnis, Plan mit echten `Date`-Zeiten, nur 9–22 Uhr, höchstens zwei am Tag,
  zwei Stunden Abstand, `foreground: false`; Abholen plant die Tagesbelohnung für morgen; Ausschalten löscht alle Nummern
  (auch 7001); einmalige Frage nach dem Abholen; verweigerte Erlaubnis; Übernahme der alten Erinnerung; Texte auf Englisch.
- Feste Planungsfälle (z. B. Mittwoch 25. 11. 2026, 20:30 Uhr, Stufe 80, Tagesbelohnung abgeholt: Tagesbelohnung Do 20:30,
  Weltboss Do 16:20 (weicht wegen des Abstands aus), Saisonende Sa 28. 11. 9:00, Pause Sa 20:30, Doppel-EP Fr 4. 12. 18:00)
  und 1 500 zufällige Zeitpunkte über ein Jahr: keine Verletzung der Regeln.
- **Vorgetäuschte Windows-Brücke:** Einstellung mit Windows-Hinweis, `planen` mit Zahlen-Zeiten, Ausschalten ruft `loeschen`.
  `desktop/meldungen.js` zusätzlich in Node mit falschen Zeitgebern (Annahme/Ablehnung von Einträgen, Meldung nur bei
  minimiertem Fenster, Klick holt das Fenster, 30 Tage Wartezeit gestückelt).
- **Normaler Browser** (`?quelle=play`): keine Einstellung, keine Zeile, keine Frage, keine Seitenfehler.
- Nicht getestet (geht nur auf echten Geräten): die Zustellung durch iOS selbst und Windows-Mitteilungen in der gebauten App.
