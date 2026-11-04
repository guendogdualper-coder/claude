# Seelenstein bei Google Play veröffentlichen – Schritt für Schritt

Diese Anleitung ist für den Inhaber ohne Entwicklerkenntnisse geschrieben. Sie führt von der Anmeldung bei Google bis zur fertigen App
im Play Store und erklärt, was bei späteren Updates zu tun ist. Stand: 4. 11. 2026. Die Regeln von Google wurden an diesem Tag
nachgeprüft (Quellen am Ende). Google benennt Menüpunkte gelegentlich um. Deshalb steht der englische Name jeweils in Klammern.

**Das Wichtigste vorab**

- Die App ist eine **Trusted Web Activity (TWA)**: eine kleine Android-Hülle, die `https://seelenstein.online/` im Vollbild zeigt.
  Paketname `de.seelenstein.spiel`. Wie man das App-Bundle (`.aab`) baut, steht in `android/README.md`.
- **Spiel-Updates gehen weiter einfach über die Website live.** Ein neues App-Bundle braucht es nur, wenn sich an der Hülle etwas
  ändert (Abschnitt 10).
- Einmalige Kosten: **25 US-Dollar** Registrierungsgebühr. Danach fallen bei Google keine laufenden Kosten an.
- Zeitbedarf: Rechne mit **mindestens 3 bis 4 Wochen** bis zur öffentlichen App. Ein neues privates Konto muss zuerst
  14 Tage lang mit 12 Testern testen (Abschnitt 7).

Alle Texte und Bilder liegen in diesem Ordner:

| Datei | Wofür |
|---|---|
| `store-eintrag.md` | App-Name, Kurz- und Langbeschreibung (Deutsch und Englisch), Kategorie, Kontakt |
| `app-symbol-512.png`, `vorstellungsgrafik-1024x500*.jpg`, `screenshots/` | alle Grafiken |
| `datensicherheit.md` | Antworten für das Formular „Datensicherheit“ |
| `inhaltsbewertung.md` | Antworten für den Fragebogen zur Altersfreigabe |

---

## 0. Voraussetzungen – erst erledigen, dann einreichen

Hake diese Punkte ab, bevor du die App zur Prüfung schickst. Fehlt einer, lehnt Google die App ab oder sie zeigt eine Adressleiste.

1. **seelenstein.online liefert das Spiel selbst aus.** Die Domain darf nicht auf github.io weiterleiten. Dazu auf dem Server
   (netcup) das Server-Skript mit der Adresse `server.seelenstein.online` erneut ausführen: `bash setup.sh server.seelenstein.online`
   als root. Alternativ stellt `server/domain.sh` nur die Adresse um, ohne Systemupdates. Den genauen Befehl bekommst du gesondert.
   Prüfen: Im Browser `https://seelenstein.online/` öffnen. Das Spiel muss starten, und oben muss `seelenstein.online` stehen bleiben.
2. **Die Datei `https://seelenstein.online/.well-known/assetlinks.json` ist erreichbar.** Sie liegt im Repo unter
   `.well-known/assetlinks.json` und kommt über GitHub Pages und den eigenen Server. Ein eigenes Repository
   `guendogdualper-coder.github.io` ist **nicht** nötig. Öffnet man die Adresse im Browser, muss ein kurzer Text mit
   `de.seelenstein.spiel` erscheinen.
3. **Firebase-Regeln veröffentlichen.** Live gibt es im Moment nur die Regeln für `konten`. Melden, Post, Auktionshaus und das
   vollständige Löschen von Konten brauchen den ganzen Regelblock aus `docs/konten-einrichten.md`, Abschnitt
   „Melden, Blockieren und Konto löschen (seit 13.77)“. Derselbe Block liegt auch als Datei `docs/firebase-regeln.json` bei.
   So geht es: Firebase-Konsole → Projekt `seelenstein-e2e0c` → **Realtime Database → Regeln** → alles durch den Block ersetzen →
   **Veröffentlichen**.
4. **Platzhalter ersetzen.** In `datenschutz.html` stehen `[NAME DES BETREIBERS]`, `[ANSCHRIFT]` und `[E-MAIL-ADRESSE]` jeweils im
   deutschen und im englischen Teil. In `js/spielerschutz.js` steht `KONTAKT_EMAIL = '[E-MAIL-ADRESSE]'`. Google verlangt eine
   Datenschutzerklärung, die den Verantwortlichen und einen Kontakt nennt.
5. **Konto-Löschseite testen:** Wegwerf-Konto im Spiel anlegen, dann auf `https://seelenstein.online/konto-loeschen.html` löschen.
   Danach darf die Anmeldung mit diesem Konto nicht mehr klappen.
6. **Verhaltensregeln (erledigt seit 13.78).** Google verlangt bei Spielen mit Chat (UGC-Richtlinie), dass Nutzer Regeln
   akzeptieren, bevor sie Inhalte erstellen. Das Spiel fragt deshalb vor dem ersten Chat, dem ersten Brief und beim Registrieren
   nach (Haken „Ich habe die Verhaltensregeln gelesen …“). Die vollständigen Regeln stehen unter
   `https://seelenstein.online/regeln.html`. Wichtig: Meldungen musst du tatsächlich bearbeiten (Firebase-Konsole →
   Realtime Database → `meldungen`, siehe docs/konten-einrichten.md).
7. **App-Bundle bauen** nach `android/README.md` (`tools/android-bauen.sh`). Ergebnis ist eine `.aab`-Datei. Den Upload-Schlüssel
   (`seelenstein-upload.keystore`) und die Passwörter an zwei sicheren Orten aufbewahren.
8. **Test-Konto für Googles Prüfer** im Spiel anlegen, zum Beispiel Kontoname `PlayPruefung` mit einem starken Passwort. Gib dem
   Konto einen Charakter mit etwas Fortschritt. Die Zugangsdaten brauchst du in Abschnitt 5.3.

---

## 1. Entwicklerkonto bei Google Play anlegen

1. Mit einem Google-Konto anmelden. Am besten nimmst du ein eigenes Konto nur für die App, nicht das private Mail-Konto.
   Du musst mindestens 18 Jahre alt sein.
2. `https://play.google.com/console/signup` öffnen.
3. **Kontotyp wählen:**
   - **Privat** (*Personal*): für eine einzelne Person. Man braucht Name, Anschrift, Telefon und E-Mail. **Nachteil:** Neue private
     Konten (angelegt nach dem 13. 11. 2023) müssen jede neue App erst **14 Tage lang mit mindestens 12 Testern** testen, bevor
     sie in den öffentlichen Store darf (Abschnitt 7).
   - **Organisation** (*Organization*): für ein Unternehmen oder einen Verein. Pflicht ist eine **D-U-N-S-Nummer** (kostenlos bei
     Dun & Bradstreet, die Vergabe kann einige Tage bis Wochen dauern). Außerdem braucht es eine Firmen-Website, eine Firmenadresse
     und eine Telefonnummer. Den 12-Tester-Test verlangt Google hier nicht. Name, Adresse, E-Mail und Telefon werden aber öffentlich
     im Store angezeigt.
   - **Empfehlung:** Ohne Firma ist **„Privat“** richtig. Den 12-Tester-Test einplanen.
4. **Angaben ausfüllen:** Entwicklername (erscheint im Store unter der App, z. B. „Seelenstein“ oder dein Name), Kontakt-E-Mail,
   Kontakt-Telefon und die öffentliche Entwickler-E-Mail. E-Mail und Telefon werden mit einem Einmalcode bestätigt.
5. **Händlerstatus** (*Trader status*, EU-Pflicht): Ohne Verkäufe und Einnahmen in der Regel „kein Händler“. Bist du unsicher, lass
   das kurz rechtlich prüfen. Als Händler zeigt Google Adresse und Telefon öffentlich an.
6. **25 US-Dollar** per Kreditkarte zahlen. Die Gebühr fällt einmal an.
7. **Identität bestätigen:** Google verlangt einen Ausweis (Personalausweis oder Reisepass). Name und Anschrift müssen zum
   Zahlungsprofil passen. Die Prüfung dauert meist wenige Tage. Bis dahin kann man schon vieles vorbereiten, aber nicht veröffentlichen.
   Bei unvollständigen oder falschen Angaben gibt es die Gebühr nicht zurück.
8. Gegebenenfalls verlangt Google zusätzlich, dass du in der Play-Console-App auf einem Android-Handy angemeldet bist
   (Gerätebestätigung). Dann einfach den Anweisungen folgen.

---

## 2. Die App in der Play Console anlegen

1. Play Console → **App erstellen** (*Create app*).
2. Ausfüllen:
   - App-Name: `Seelenstein – Fantasy-RPG` (oder nur `Seelenstein`, siehe `store-eintrag.md`)
   - Standardsprache: **Deutsch – de-DE**
   - App oder Spiel: **Spiel**
   - Kostenlos oder kostenpflichtig: **Kostenlos**. Achtung: Eine kostenlose App lässt sich später **nicht** kostenpflichtig machen.
3. Erklärungen bestätigen: Programmrichtlinien für Entwickler und US-Exportgesetze.
4. **App erstellen**. Danach zeigt das **Dashboard** eine Liste „App einrichten“. Diese arbeiten wir in den Abschnitten 3 bis 6 ab.

---

## 3. Erster Upload und Play App Signing (interner Test)

Der erste Upload geht am besten in den **internen Test**. Er ist sofort verfügbar, braucht keine Prüfung und erlaubt bis zu 100 Tester.

1. **Testen und veröffentlichen → Testen → Interner Test** (*Test and release → Testing → Internal testing*) → **Neuen Release erstellen**.
2. **App-Signatur:** Google fragt beim ersten Mal nach **Play App Signing**. Die Voreinstellung „Von Google generierter Schlüssel“
   **annehmen**. Google verwahrt dann den eigentlichen Signaturschlüssel, du nur den Upload-Schlüssel. Geht der Upload-Schlüssel
   verloren, kann Google ihn ersetzen (Anleitung in `android/README.md`).
3. Die `.aab`-Datei hochladen. Versionsname und Versionscode kommen aus der Datei (1 / 1.0.0).
4. Release-Name: z. B. `1.0.0`. Versionshinweise (Deutsch):
   `Erste Version von Seelenstein als App.`
5. **Tester:** Unter „Tester“ eine E-Mail-Liste anlegen (deine eigene Google-Adresse und ein paar Bekannte). Speichern.
6. **Release überprüfen → Einführung starten**. Nach einigen Minuten erscheint ein **Teilnahme-Link**. Auf dem Handy öffnen,
   „Tester werden“ tippen und die App über den Play Store installieren.

### 3.1 Fingerabdruck in `assetlinks.json` eintragen (sonst erscheint eine Adressleiste!)

Über Google Play installierte Apps tragen Googles Signatur, nicht die des Upload-Schlüssels. Damit Android die App und die Website
als zusammengehörig erkennt, kommt Googles Fingerabdruck dazu:

1. **Testen und veröffentlichen → App-Integrität → App-Signatur** (*App integrity → App signing*).
2. Unter „App-Signaturschlüssel-Zertifikat“ den **SHA-256-Zertifikatfingerabdruck** kopieren (Form `AB:CD:…`, 32 Paare).
3. In `.well-known/assetlinks.json` als **zweiten** Eintrag in `sha256_cert_fingerprints` einfügen. Den vorhandenen
   Upload-Fingerabdruck drin lassen. Genaue Anleitung mit Beispiel in `android/README.md`, Abschnitt „Digital Asset Links“.
4. Committen und pushen. Nach ein paar Minuten ist die Datei unter `https://seelenstein.online/.well-known/assetlinks.json` live.
   Ein eigenes `guendogdualper-coder.github.io`-Repository ist nicht nötig.
5. Prüfen mit
   `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://seelenstein.online&relation=delegate_permission/common.handle_all_urls`.
   Beide Fingerabdrücke müssen in der Antwort stehen.
6. Auf dem Handy die App aus dem internen Test öffnen. Sie muss **ohne Adressleiste** im Vollbild und quer starten. Steht oben noch
   eine Leiste: Chrome-Daten löschen oder die App neu installieren und den Fingerabdruck vergleichen.

Kurz durchtesten: Charakter erstellen, kämpfen, Kanal betreten, Chat, Konto anlegen, Spieler melden und blockieren, Konto löschen.

---

## 4. Store-Eintrag

1. **Wachsen → Store-Präsenz → Haupteintrag im Play Store** (*Main store listing*).
2. Texte aus `store-eintrag.md` einfügen: App-Name, Kurzbeschreibung, vollständige Beschreibung.
3. Grafiken hochladen:
   - App-Symbol: `app-symbol-512.png`
   - Vorstellungsgrafik: `vorstellungsgrafik-1024x500.jpg`
   - Smartphone-Screenshots: `screenshots/telefon-01.jpg` bis `-08.jpg` in dieser Reihenfolge
   - Tablet 7 Zoll: `screenshots/tablet7-01.jpg` bis `-04.jpg`
   - Tablet 10 Zoll: `screenshots/tablet10-01.jpg` bis `-04.jpg`
   - Chromebook: optional, die 10-Zoll-Bilder passen auch dort
4. **Übersetzungen verwalten → Eigene Übersetzung hinzufügen → Englisch (en-US).** Die englischen Texte aus `store-eintrag.md` einfügen
   und `vorstellungsgrafik-1024x500-en.jpg` als englische Vorstellungsgrafik hochladen. Die Screenshots werden übernommen, ihre
   Oberfläche ist deutsch. Wer englische Screenshots möchte, kann sie mit der Sprache „English“ im Spiel nachaufnehmen.
5. **Store-Einstellungen** (*Store settings*): Kategorie **Spiel → Rollenspiel**, Tags (Vorschläge in `store-eintrag.md`),
   Kontakt-E-Mail `[E-MAIL-ADRESSE]`, Website `https://seelenstein.online/`.

---

## 5. App-Inhalte (Pflichtangaben)

**Überwachen und verbessern → Richtlinien und Programme → App-Inhalte** (*Policy and programs → App content*). Jeder Punkt muss
ausgefüllt sein, bevor ein Release in den geschlossenen oder öffentlichen Test gehen kann.

### 5.1 Datenschutzerklärung
`https://seelenstein.online/datenschutz.html` (nach Voraussetzung 4).

### 5.2 Werbung
**„Nein, meine App enthält keine Werbung.“** Das Spiel hat keine Werbung.

### 5.3 App-Zugriff (*App access*)
Das Spiel geht ohne Konto. Post, Auktionshaus, Konto-Lager und das Melden brauchen aber ein Konto. Damit Google alles prüfen kann:
- Wählen: **„Alle oder einige Funktionen sind eingeschränkt“** → **Anleitung hinzufügen**:
  - Name: `Test-Konto`
  - Nutzername: `PlayPruefung` (aus Voraussetzung 8), Passwort: `[PASSWORT]`
  - Hinweis (Englisch, für die Prüfer):
    `The game can be played without an account (tap "Abenteuer beginnen" / "Begin Adventure" after choosing a class). An account is only needed for mail, auction house, shared storage and reporting players. Log in on the start screen under "Konto" / "Account" with the credentials above. Account deletion: Settings → Account → Delete account, or https://seelenstein.online/konto-loeschen.html`
- Das Test-Konto nicht löschen und das Passwort nicht ändern, solange die App im Store ist.

### 5.4 Altersfreigabe
Fragebogen nach `inhaltsbewertung.md` ausfüllen. Erwartet wird etwa PEGI 12 bzw. USK 12 mit dem Hinweis „Nutzer interagieren“.

### 5.5 Zielgruppe und Inhalte (*Target audience and content*)
- **Empfehlung: Altersgruppen „16–17“ und „18 und älter“** auswählen. Möglich wäre auch zusätzlich „13–15“. **Keine** Gruppe unter
  13 wählen.
- Warum? Sobald eine Altersgruppe unter 13 dabei ist, gilt die **Familienrichtlinie** (*Families policy*). Sie bringt strenge
  Vorgaben mit, z. B. zusätzliche Sicherheitshinweise vor dem Chat mit Kindern. Außerdem verbietet Google ab dem 26. 8. 2026
  Apps mit anonymem Chat, die sich an Kinder richten. Seelenstein hat einen offenen Text-Chat, also passt das nicht.
- 16+ passt am besten zur Datenschutzerklärung (Abschnitt 10). Danach richtet sich das Spiel nicht an Kinder unter 13, und unter
  16 Jahren sind Konto und Chat nur mit Zustimmung der Eltern erlaubt (DSGVO, Deutschland). Wer 13–15 dazunimmt, sollte diese
  Elternzustimmung ernst nehmen.
- Frage „Könnte Ihr Store-Eintrag unbeabsichtigt Kinder ansprechen?“: **Nein.** Die Figuren sind zwar niedlich gezeichnet, aber
  Screenshots und Text zeigen ein Kampf-Rollenspiel mit Chat. Google kann trotzdem nachfragen. Dann sachlich antworten, dass sich
  das Spiel an Jugendliche und Erwachsene richtet.

### 5.6 Datensicherheit
Formular nach `datensicherheit.md` ausfüllen, einschließlich des Links zum Löschen des Kontos:
`https://seelenstein.online/konto-loeschen.html`.

### 5.7 Weitere Erklärungen – alle mit „Nein“

| Punkt | Antwort |
|---|---|
| Behörden-App (*Government apps*) | Nein |
| Finanzfunktionen (*Financial features*) | „Meine App bietet keine Finanzfunktionen“ |
| Gesundheit (*Health*) | keine Gesundheitsfunktionen |
| Nachrichten-App (*News apps*) | Nein |
| Werbe-ID (*Advertising ID*) | **Nein**, die App verwendet keine Werbe-ID. Die Android-Hülle von Bubblewrap fordert die Berechtigung `AD_ID` nicht an. Prüfe trotzdem nach dem Upload unter „App-Bundle-Explorer → Berechtigungen“, dass sie fehlt. |
| COVID-19-Kontaktverfolgung (falls noch angezeigt) | Nein |

---

## 6. Länder und Preise

**Testen und veröffentlichen → Produktion → Länder/Regionen** (*Countries/regions*).
- Empfehlung: **alle Länder** (das Spiel ist deutsch und englisch). Vorsichtiger ist ein Start nur mit **Deutschland, Österreich,
  Schweiz** und weiteren EU-Ländern.
- Die App ist kostenlos, es gibt keine Preise. Ohne Käufe braucht es auch kein Händlerkonto.

---

## 7. Geschlossener Test (Pflicht für private Konten)

Ein neues **privates** Konto braucht vor dem öffentlichen Start einen geschlossenen Test mit **mindestens 12 Testern**. Diese
müssen **14 Tage am Stück** eingetragen sein. Wer vorher austritt, zählt nicht. Organisationskonten überspringen diesen Abschnitt.

1. **Testen und veröffentlichen → Testen → Geschlossener Test** (*Closed testing*) → Track „Closed testing – Alpha“ → **Tester**:
   eine E-Mail-Liste oder Google Group mit **mindestens 15 Personen** anlegen. Ein Puffer schadet nicht, falls jemand abspringt.
2. **Neuen Release erstellen**: dieselbe `.aab` aus der App-Bundle-Bibliothek übernehmen (oder neu hochladen) → **Zur Überprüfung senden**.
   Der geschlossene Test wird von Google geprüft, meist in wenigen Tagen.
3. Nach der Freigabe den **Teilnahme-Link** an die Tester schicken. Jeder muss
   - mit **seinem** Google-Konto (dem auf der Liste) den Link öffnen und **„Tester werden“** tippen,
   - die App aus dem Play Store **installieren** und
   - **14 Tage lang dabeibleiben** und die App ab und zu öffnen und spielen.
4. Die Uhr läuft erst, wenn der Release live ist **und** 12 Tester beigetreten sind. Zwischendurch nichts pausieren oder anhalten.
5. Nach 14 Tagen: **Dashboard → Produktionszugriff beantragen** (*Apply for production*). Google fragt in drei Teilen
   - zum Test: Wie hast du Tester gefunden? Haben sie alle Funktionen genutzt? Welches Feedback gab es?
   - zur App: Zielgruppe, was die App macht, wie sie sich von anderen unterscheidet,
   - zur Bereitschaft: Was hast du nach dem Feedback verbessert, warum ist die App jetzt bereit?

   **Antworten ehrlich und konkret** formulieren (z. B. „12 Tester aus Familie und Freundeskreis haben Einzelspiel, Mehrspieler-Kanäle,
   Chat, Konto und Konto-Löschung getestet; gemeldete Fehler X und Y wurden in Version 13.7x behoben“). Floskeln führen eher zur Ablehnung.
6. Die Prüfung dauert laut Google **meist bis zu 7 Tage**. Bei einer Ablehnung nennt Google den Grund. Dann den Test verlängern und
   erneut beantragen.

Tipp: Feedback der Tester (Play Console → Testen → Feedback, oder einfach per Nachricht) aufschreiben. Das hilft bei den Fragen in Schritt 5.

---

## 8. Veröffentlichung (Produktion)

1. **Testen und veröffentlichen → Produktion → Neuen Release erstellen** → die getestete `.aab` aus der Bibliothek hinzufügen.
2. Versionshinweise (Deutsch und Englisch), z. B.
   - DE: `Seelenstein jetzt als App: Fantasy-Rollenspiel mit fünf Klassen, Seelensteinen, Dungeons und Mehrspieler.`
   - EN: `Seelenstein is now available as an app: a fantasy RPG with five classes, Soulstones, dungeons and multiplayer.`
3. Optional: **gestaffelte Einführung** (*Staged rollout*), z. B. mit 20 % beginnen.
4. **Release überprüfen → Zur Überprüfung senden.** Die erste Prüfung kann einige Tage dauern. Danach ist die App im Store unter
   `https://play.google.com/store/apps/details?id=de.seelenstein.spiel` zu finden.
5. Nach der Freigabe: **Verwaltete Veröffentlichung** (*Managed publishing*) aus lassen, dann geht künftig alles direkt nach der Prüfung live.

---

## 9. Nach dem Start: laufende Pflichten

- **Meldungen bearbeiten.** Gemeldete Spieler landen in der Firebase-Konsole unter `meldungen`. Google verlangt, dass du gegen
  Verstöße vorgehst (Verwarnung, Konto sperren über Firebase Authentication → Nutzer → deaktivieren). Laut Datenschutzerklärung
  werden Meldungen spätestens nach 6 Monaten gelöscht. Das bitte auch wirklich tun.
- **Löschanfragen per E-Mail** innerhalb eines Monats beantworten (DSGVO).
- **Bewertungen beantworten** (*Ratings and reviews*). Das ist freiwillig, kommt aber gut an.
- **Mails von Google lesen.** Richtlinienänderungen, neue Pflichtangaben oder eine Erinnerung an den Ziel-API-Level kommen per Mail
  und erscheinen im **Posteingang** der Play Console. Fristen ernst nehmen, sonst wird die App ausgeblendet.

---

## 10. Updates

### 10.1 Normale Spiel-Updates (fast immer)
Neue Versionen des Spiels (13.78, 13.79, …) gehen **wie bisher** über GitHub Pages bzw. seelenstein.online live. `VERSION` in `sw.js`
erhöhen, damit installierte Apps die neuen Dateien laden. In der Play Console ist **nichts** zu tun, die App zeigt automatisch das
aktuelle Spiel.

**Aber:** Ändert ein Update etwas an Daten, Chat, Käufen, Werbung oder der Härte der Inhalte, müssen **Datensicherheit**
(`datensicherheit.md`) bzw. **Altersfreigabe** (`inhaltsbewertung.md`) in der Play Console angepasst werden. Neue Server oder
Dienste gehören auch in `datenschutz.html`.

### 10.2 Neues App-Bundle nötig (selten)
Nur wenn sich die **Hülle** ändert:
- App-Name, Symbol, Farben oder Startadresse,
- neue Vorgabe von Google zum **Ziel-API-Level** (*targetSdk*). Die Vorgabe steigt jedes Jahr, die Frist ist üblicherweise der
  31. August. Seit dem 31. 8. 2026 brauchen neue Apps und Updates **Android 16 (API-Level 36)**. Die App ist mit targetSdk 36 gebaut
  und erfüllt das. Etwa im Sommer 2027 kommt voraussichtlich API-Level 37, Google kündigt das per Mail an.

So geht es: In `android/twa-manifest.json` `appVersionCode` um 1 erhöhen und `appVersion` anpassen (z. B. 1.0.1), neu bauen
(`android/README.md`), dann **Produktion → Neuen Release erstellen** → `.aab` hochladen → Versionshinweise → zur Überprüfung senden.
Der Signaturschlüssel bleibt gleich, `assetlinks.json` muss **nicht** geändert werden.

### 10.3 Notfall: App zeigt plötzlich eine Adressleiste
Fast immer ist `https://seelenstein.online/.well-known/assetlinks.json` nicht erreichbar (Server, Domain oder Weiterleitung geändert)
oder ein Fingerabdruck fehlt. Siehe Abschnitt 3.1 und `android/README.md`.

---

## Quellen (geprüft am 4. 11. 2026)

- Testanforderungen für neue private Konten (12 Tester, 14 Tage am Stück, Prüfung meist bis 7 Tage):
  https://support.google.com/googleplay/android-developer/answer/14151465
- Angaben für das Entwicklerkonto (privat/Organisation, D-U-N-S, Bestätigung der Identität):
  https://support.google.com/googleplay/android-developer/answer/13628312
- Registrierung, Gebühr 25 US-Dollar, Mindestalter 18: https://support.google.com/googleplay/android-developer/answer/6112435
- Ziel-API-Level (API 36 für neue Apps und Updates ab 31. 8. 2026): https://support.google.com/googleplay/android-developer/answer/11926878
  und https://developer.android.com/google/play/requirements/target-sdk
- Kontolöschung (Pflicht bei Konten in der App, Web-Link im Formular Datensicherheit):
  https://support.google.com/googleplay/android-developer/answer/13327111
- Formular Datensicherheit (Datentypen, Ausnahmen, optional/erforderlich): https://support.google.com/googleplay/android-developer/answer/10787469
- Richtlinie zu nutzergenerierten Inhalten (Nutzungsbedingungen, Melden, Blockieren, Moderation):
  https://support.google.com/googleplay/android-developer/answer/9876937 und https://support.google.com/googleplay/android-developer/answer/12923286
- Zielgruppe, Familienrichtlinie: https://support.google.com/googleplay/android-developer/answer/9867159 und
  https://support.google.com/googleplay/android-developer/answer/9893335
- Altersfreigabe (IARC-Fragebogen): https://support.google.com/googleplay/android-developer/answer/9898843 und
  https://support.google.com/googleplay/android-developer/answer/188189
- Grafiken (Symbol, Vorstellungsgrafik, Screenshots): https://support.google.com/googleplay/android-developer/answer/9866151 und
  https://support.google.com/googleplay/android-developer/answer/1078870
- Trusted Web Activity, App-Signatur und `assetlinks.json`:
  https://developer.chrome.com/docs/android/trusted-web-activity/android-for-web-devs
