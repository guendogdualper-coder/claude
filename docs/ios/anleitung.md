# Seelenstein im App Store (iPhone und iPad) – Schritt für Schritt

Diese Anleitung ist für den Inhaber ohne Entwicklerkenntnisse geschrieben. Du brauchst **keinen Mac**: Gebaut wird die App auf
GitHub (Workflow „iOS-App“). Du brauchst nur einen **Windows-PC mit Browser** und dein **iPhone**. Stand: 4. 11. 2026.
Apple benennt Menüpunkte gelegentlich um. Deshalb steht der englische Name jeweils in Klammern, so wie er in App Store Connect
erscheint, wenn die Sprache auf Englisch steht.

**Das Wichtigste vorab**

- Die App ist eine **Capacitor-App**: eine iOS-Hülle (Ordner `ios/`), die `https://seelenstein.online/` im Vollbild zeigt und
  echte iPhone-Funktionen dazugibt (Vibration, Erinnerung an die Tagesbelohnung, Teilen, In-App-Browser, Offline-Seite).
  Bundle-ID `de.seelenstein.spiel`, Name „Seelenstein“, nur Querformat, iPhone und iPad.
- **Spiel-Updates gehen weiter einfach über die Website live**, auch in der iPhone-App. Einen neuen App-Build brauchst du nur,
  wenn sich an der Hülle etwas ändert (Abschnitt 13).
- Kosten: **Apple Developer Program 99 US-Dollar pro Jahr** (in Deutschland 99 €, inkl. MwSt.). Ohne Verlängerung verschwindet
  die App aus dem Store.
- Zeitbedarf: Konto 1–2 Tage, erster TestFlight-Build am selben Tag, App-Prüfung meist 1–3 Tage. Rechne insgesamt mit
  **etwa einer Woche**, wenn nichts abgelehnt wird.
- **Gib niemals Passwörter, den API-Schlüssel (.p8) oder andere Geheimnisse in einen Chat ein.** Du trägst sie selbst als
  GitHub-Secrets ein (Abschnitt 5). Dort kann sie niemand mehr lesen, auch nicht der Workflow-Text.

Alle Unterlagen für den App Store liegen in diesem Ordner:

| Datei | Wofür |
|---|---|
| `anleitung.md` (diese Datei) | Ablauf von der Anmeldung bis zur Veröffentlichung |
| `app-store-eintrag.md` | Texte für den Store (Deutsch/Englisch), App-Datenschutz, Altersfreigabe, Hinweise für die Prüfung, Antwort bei Ablehnung |
| `screenshots/` | Bildschirmfotos in den Größen, die Apple verlangt |

Technik: `ios/README.md`. Workflow: `.github/workflows/ios.yml`.

---

## 0. Voraussetzungen – vor dem Einreichen erledigen

1. **seelenstein.online liefert das Spiel selbst aus** (nicht nur eine Weiterleitung auf github.io). Das ist bereits so
   (geprüft am 4. 11. 2026). Würde die Domain weiterleiten, öffnete die App das Spiel in Safari statt in der App.
2. **Die Web-Anbindung `js/nativ.js` ist live** (Vibration, Erinnerung, Freunde einladen, In-App-Browser). Ohne sie läuft die App
   auch, wirkt aber für Apple eher wie eine reine Webseite. Das ist das größte Risiko bei der Prüfung (Richtlinie 4.2,
   siehe `app-store-eintrag.md`, Abschnitt 6).
3. **Datenschutzerklärung vollständig:** In `datenschutz.html` sind `[ANSCHRIFT]` und `[E-MAIL-ADRESSE]` ersetzt, ebenso
   `KONTAKT_EMAIL` in `js/spielerschutz.js`. Apple verlangt eine erreichbare Datenschutzerklärung mit Kontakt.
   Ergänze dort einen Satz zur iPhone-App: Die lokale Erinnerung (Mitteilung) wird nur auf dem Gerät geplant, nichts geht an einen
   Server.
4. **Firebase-Regeln veröffentlicht** (wie für Google Play, `docs/konten-einrichten.md`). Sonst funktionieren Melden und
   Konto löschen nicht, und genau das prüft Apple (Richtlinie 1.2 und 5.1.1(v)).
5. **Ein Testkonto für die Prüfer** anlegen (Abschnitt 9): Kontoname und Passwort, mit einem Charakter, der schon etwas kann.

Bereits vorhanden und für Apple wichtig:

- **Konto löschen in der App** (Einstellungen → Konto) und als Webseite `https://seelenstein.online/konto-loeschen.html`
  (Pflicht nach Richtlinie 5.1.1(v), weil man ein Konto anlegen kann).
- **Melden und Blockieren** im Chat, **Verhaltensregeln** (`regeln.html`), die vor dem ersten Chat, Brief und beim Registrieren
  bestätigt werden müssen (Pflicht nach Richtlinie 1.2 für Inhalte von Spielern).
- **Ohne Konto spielbar.** Apple verbietet, Funktionen ohne Not hinter einer Anmeldung zu verstecken.
- **Keine Käufe, keine Werbung, kein Tracking.** Deshalb gibt es keine Fragen zu In-App-Käufen und keine Tracking-Abfrage (ATT).

---

## 1. Apple Developer Program beitreten (am iPhone, 99 USD/Jahr)

Am einfachsten geht das mit der **Apple Developer App** auf dem iPhone. Dort lässt sich der Ausweis direkt scannen.

1. Auf dem iPhone muss deine Apple-ID die **Zwei-Faktor-Authentifizierung** haben (Einstellungen → dein Name → Anmelden &
   Sicherheit). Das ist bei neueren iPhones Standard.
2. Aus dem App Store die App **„Apple Developer“** laden und öffnen.
3. Unten auf **Konto** (*Account*) tippen und mit deiner Apple-ID anmelden.
4. **Jetzt registrieren** (*Enroll Now*) → als **Einzelperson** (*Individual*) registrieren.
   - Einzelperson heißt: Im App Store steht **dein voller Name** als Anbieter (*Seller*). Eine Firma (*Organization*) bräuchte eine
     D-U-N-S-Nummer und einen Handelsregistereintrag. Das lohnt sich erst, wenn es eine Firma gibt.
5. Name, Adresse und Telefonnummer **genau wie im Personalausweis** eingeben. Dann den **Ausweis scannen**, wenn die App danach fragt.
6. Den Bedingungen zustimmen und **99 USD bzw. 99 € per In-App-Kauf** bezahlen. Das Abo verlängert sich jährlich.
7. Warten, bis die E-Mail „Welcome to the Apple Developer Program“ kommt. Das dauert meist wenige Stunden, manchmal bis zu 2 Tage.

Danach am PC einmal **https://appstoreconnect.apple.com** öffnen, anmelden und unter **Geschäftlich** (*Business*) die
Vereinbarung für **kostenlose Apps** bestätigen, falls sie angezeigt wird. Bank- und Steuerdaten brauchst du nur für kostenpflichtige
Apps oder In-App-Käufe, also nicht.

**Trader-Status (EU, Pflicht):** App Store Connect fragt nach dem **Digital Services Act**, ob du „Händler“ (*Trader*) bist.
Wer mit der App kein Geld verdient und sie nicht beruflich anbietet, wählt **kein Händler** (*not a trader*). Sonst werden Adresse,
Telefon und E-Mail im EU-Store öffentlich angezeigt. Im Zweifel: kein Geld, keine Werbung, kein Gewerbe → kein Händler. Ohne diese
Angabe erscheint die App in der EU nicht.

---

## 2. Team-ID nachsehen

1. Am PC **https://developer.apple.com/account** öffnen und anmelden.
2. Runterscrollen zu **Mitgliedschaftsdetails** (*Membership details*).
3. Dort steht die **Team-ID**: 10 Zeichen, z. B. `A1B2C3D4E5`. Aufschreiben, die brauchst du in Abschnitt 5.

---

## 3. Bundle-ID registrieren

Die Bundle-ID muss es geben, bevor man die App in App Store Connect anlegen kann.

1. **https://developer.apple.com/account/resources/identifiers/list** öffnen
   (*Certificates, Identifiers & Profiles → Identifiers*).
2. Blaues **+** → **App IDs** → *Continue* → Typ **App** → *Continue*.
3. **Description:** `Seelenstein`
   **Bundle ID:** **Explicit**, `de.seelenstein.spiel`
4. Bei *Capabilities* nichts ankreuzen. Lokale Mitteilungen brauchen keine Push-Berechtigung.
5. *Continue* → *Register*.

Zertifikate und Provisioning-Profile musst du **nicht** anlegen. Seit 13.85 holt sich der Workflow über den API-Schlüssel
selbst ein „Apple Distribution“-Zertifikat und das App-Store-Profil „Seelenstein CI App Store“ (`ios/scripts/asc_signatur.py`)
und signiert damit. Ist die Höchstzahl an Vertriebszertifikaten erreicht, zieht er das älteste zurück. Die Cloud-Signierung
beim Export hatte das unsignierte Archiv nicht neu signiert (Upload-Fehler 90035 „Invalid Signature“).

---

## 4. App in App Store Connect anlegen

1. **https://appstoreconnect.apple.com** → **Apps** → blaues **+** → **Neue App** (*New App*).
2. Ausfüllen:
   - **Plattformen:** iOS
   - **Name:** `Seelenstein` (höchstens 30 Zeichen, muss im ganzen App Store einmalig sein. Ist er vergeben, z. B.
     `Seelenstein – Fantasy-RPG`. Der Name unter dem Symbol auf dem iPhone bleibt trotzdem „Seelenstein“.)
   - **Primäre Sprache:** Deutsch
   - **Bundle-ID:** `Seelenstein – de.seelenstein.spiel` aus der Liste wählen
   - **SKU:** `seelenstein-ios` (interne Kennung, sieht niemand)
   - **Benutzerzugriff:** Voller Zugriff
3. **Erstellen**.

---

## 5. API-Schlüssel erstellen und als GitHub-Secrets eintragen

Mit dem API-Schlüssel darf der GitHub-Workflow in deinem Namen signieren und zu TestFlight hochladen.

### 5.1 Schlüssel erstellen (App Store Connect)

1. App Store Connect → **Benutzer und Zugriff** (*Users and Access*) → Reiter **Integrationen** (*Integrations*) →
   links **App Store Connect API** → **Teamschlüssel** (*Team Keys*).
2. Beim ersten Mal **Zugriff anfordern** (*Request Access*) und bestätigen. Das geht sofort.
3. **Schlüssel generieren** (*Generate API Key*) bzw. **+**:
   - **Name:** `GitHub Actions Seelenstein`
   - **Zugriff:** **Admin**. Das ist wichtig, denn nur damit darf der Workflow Apples Cloud-Zertifikat für die App-Store-Signierung
     nutzen. Mit „App-Manager“ (*App Manager*) bricht der Export oft mit „Cloud signing permission error“ ab.
4. **Generieren**. In der Liste erscheint der Schlüssel:
   - **Schlüssel-ID** (*Key ID*), z. B. `2X9R4HXF34`, steht in der Zeile.
   - **Issuer-ID** steht **über** der Tabelle (lange Kennung mit Bindestrichen, z. B. `69a6de7e-…`). Auf „Kopieren“ klicken.
5. **API-Schlüssel herunterladen** (*Download API Key*). Du bekommst die Datei `AuthKey_2X9R4HXF34.p8`.
   **Das geht nur ein einziges Mal!** Die Datei sicher aufbewahren (z. B. in einem Passwort-Manager) und niemandem schicken.

### 5.2 Secrets in GitHub eintragen

1. Im Browser **https://github.com/guendogdualper-coder/claude** öffnen → **Settings** (Zahnrad oben rechts im Repository) →
   links **Secrets and variables** → **Actions** → grüner Knopf **New repository secret**.
2. Vier Secrets anlegen. **Name** genau so schreiben, **Secret** ist der Wert:

| Name | Wert |
|---|---|
| `APP_STORE_CONNECT_API_KEY_ID` | die Schlüssel-ID aus 5.1, z. B. `2X9R4HXF34` |
| `APP_STORE_CONNECT_ISSUER_ID` | die Issuer-ID aus 5.1 |
| `APP_STORE_CONNECT_API_KEY_P8` | den **ganzen Inhalt** der .p8-Datei: Datei mit Rechtsklick → *Öffnen mit* → **Editor** öffnen, **Strg+A**, **Strg+C**, ins Feld einfügen. Die Zeilen `-----BEGIN PRIVATE KEY-----` und `-----END PRIVATE KEY-----` gehören dazu. |
| `APPLE_TEAM_ID` | die Team-ID aus Abschnitt 2 |

3. Jeweils **Add secret**. Danach zeigt GitHub nur noch die Namen an, nie mehr die Werte. Das ist richtig so.

Ist ein Wert falsch: Secret anklicken → **Update** → neuen Wert einfügen. Wird ein Schlüssel einmal öffentlich, sperrst du ihn in
App Store Connect (**Widerrufen**, *Revoke*) und legst einen neuen an.

---

## 6. App bauen und zu TestFlight hochladen

1. GitHub → Reiter **Actions** → links **iOS-App** → rechts **Run workflow**.
2. **Branch:** `claude/app-entwicklung-hhewbj` (Standard). **Versionsnummer:** `1.0.0` beim ersten Mal. Den Haken „Nach
   erfolgreichem Bau zu TestFlight hochladen“ gesetzt lassen. Die anderen Felder leer bzw. aus lassen.
3. **Run workflow**. Nach etwa 15–25 Minuten:
   - **Bauen (Simulator, ohne Signatur)**: grün = die App kompiliert. Unten bei *Artifacts* liegt `ios-simulator-…` mit einem
     Bildschirmfoto aus dem Simulator und dem Protokoll.
   - **App-Store-Build → TestFlight**: grün = hochgeladen. Die **Buildnummer** ist die Laufnummer des Workflows.
4. In App Store Connect → deine App → **TestFlight**: Der Build erscheint nach 5–30 Minuten, erst mit „Wird verarbeitet“
   (*Processing*). Du bekommst eine E-Mail, wenn er fertig ist.
5. Die Frage zur **Exportkonformität** (Verschlüsselung) kommt nicht. Die App erklärt in `Info.plist`, dass sie nur die
   Standard-Verschlüsselung von iOS nutzt (HTTPS).

**Wenn der TestFlight-Job rot ist:** Klick auf den Job → den roten Schritt aufklappen → die letzten Zeilen lesen. Unter
*Artifacts* liegen die Protokolle (`ios-testflight-…`). Häufige Ursachen:

| Meldung | Lösung |
|---|---|
| `Invalid Signature` (90035) | Trat mit der alten Cloud-Signierung auf; seit 13.85 signiert der Workflow selbst. Kommt er wieder, Protokoll des Schritts „Vertriebszertifikat und Profil holen“ ansehen. |
| `Cloud signing permission error` / `No signing certificate "iOS Distribution" found` | Der API-Schlüssel hat nicht die Rolle **Admin** → neuen Schlüssel mit Admin anlegen, Secrets aktualisieren. |
| `No App record was found` / `bundle id … not found` | Abschnitt 3 und 4 fehlen oder die Bundle-ID ist anders geschrieben. |
| `The bundle version must be higher than the previously uploaded version` | Einfach noch einmal starten. Die Laufnummer zählt hoch. |
| `Authentication credentials are missing or invalid` / `401` | Schlüssel-ID, Issuer-ID oder .p8-Inhalt falsch. Secrets prüfen. |
| Job bleibt lange „Queued“ und endet mit `The job was not acquired by Runner of type hosted` | Kein Fehler im Projekt: GitHub hatte gerade keine freien Mac-Rechner („capacity constraints“). Später im Lauf oben rechts **Re-run jobs → Re-run failed jobs** klicken. |
| `A required agreement is missing or has expired` | In App Store Connect unter **Geschäftlich** (*Business*) die neuen Vereinbarungen bestätigen (nur der Kontoinhaber). |
| Beim Export Fehler zur Signatur des Archivs | Workflow noch einmal starten und dabei **„Archiv schon beim Bauen signieren“** anhaken. Dafür muss dein iPhone als Gerät registriert sein: developer.apple.com → *Devices* → **+** → UDID eintragen. Die UDID zeigt z. B. die Seite *udid.tech* in Safari an. |

Der Simulator-Job läuft außerdem automatisch bei jeder Änderung im Ordner `ios/`. Ohne Secrets wird der TestFlight-Teil
übersprungen, mit dem Hinweis „TestFlight übersprungen“. Das ist kein Fehler.

---

## 7. TestFlight: selbst testen und Freunde einladen

### 7.1 Interne Tester (sofort, ohne Prüfung)

Interne Tester sind Mitglieder deines App-Store-Connect-Teams, also zuerst nur du. Es gehen bis zu 100 Personen, aber jede braucht
einen Zugang zu App Store Connect.

1. App Store Connect → App → **TestFlight** → links bei *Interne Tests* (*Internal Testing*) auf **+** → Gruppe `Intern` anlegen.
2. **Tester hinzufügen** → dich selbst auswählen. Den Build zur Gruppe hinzufügen (Häkchen „Automatische Verteilung“ an lassen).
3. Auf dem iPhone die App **TestFlight** aus dem App Store laden. In der Einladungs-E-Mail auf **„View in TestFlight“** tippen →
   **Installieren**.

**Was du in TestFlight prüfen solltest (Checkliste):**

- Start: dunkler Startbildschirm mit Symbol, dann das Spiel im Querformat ohne Statusleiste. Kein weißes Aufblitzen.
- Spielen, kämpfen, ein Charakter mit Konto: anmelden, nach dem Neustart der App ist alles noch da.
- Ton und Musik nach dem ersten Tippen. Home-Taste bzw. Wischen nach oben → Ton aus. Zurück → Ton wieder an.
- Mehrspieler: Kanal betreten, mit einem Freund im selben Kanal chatten (WebRTC muss gehen).
- Vibration beim Schmieden und bei harten Treffern (Einstellungen → Vibration an). Braucht `js/nativ.js`.
- Tagesbelohnung abholen → Frage nach der Erinnerung → „Ja“ → iOS fragt nach Mitteilungen → erlauben.
- Startbildschirm: „Freunde einladen“ öffnet das Teilen-Menü. „Datenschutz“ öffnet sich in einem Fenster in der App.
- **Flugmodus an** → App ganz schließen und neu öffnen: Nach dem ersten Laden startet das Spiel trotzdem (allein spielen). Beim
  allerersten Start ohne Netz kommt die Seite „Keine Verbindung“, und nach dem Ausschalten des Flugmodus lädt das Spiel von selbst.
- iPad (falls vorhanden): Querformat, keine abgeschnittenen Knöpfe.

### 7.2 Externe Tester (Freunde mit iPhone)

Externe Tester brauchen kein Konto bei dir, nur die TestFlight-App. Bis zu 10.000 Personen. **Der erste Build für externe Tester
muss eine kurze Beta-Prüfung bei Apple bestehen** (meist unter 24 Stunden). Spätere Builds derselben Version gehen meist ohne
erneute Prüfung durch.

1. TestFlight → **Testinformationen** (*Test Information*) ausfüllen:
   - **Beta-App-Beschreibung:** „Seelenstein ist ein 3D-Fantasy-Rollenspiel. Bitte teste Start, Kampf, Mehrspieler-Chat und die
     Tagesbelohnung.“
   - **Feedback-E-Mail:** deine Adresse
   - **Anmeldeinformationen für die Beta-App-Prüfung** (*Beta App Review Information*): Kontoname und Passwort des Testkontos
     (Abschnitt 9), dazu Kontaktname, Telefon und E-Mail.
2. Links bei *Externe Tests* (*External Testing*) **+** → Gruppe `Freunde` anlegen → Build hinzufügen → **Zur Prüfung senden**.
3. Nach der Freigabe gibt es zwei Wege:
   - **Öffentlicher Link** (*Public Link*): in der Gruppe **Öffentlichen Link aktivieren** → Link kopieren und z. B. per WhatsApp
     an Freunde schicken. Wer ihn auf dem iPhone öffnet, kommt über die TestFlight-App zur App. Die Zahl der Tester lässt sich
     begrenzen.
   - **Per E-Mail:** **Tester hinzufügen** → E-Mail-Adressen eintragen. Jeder bekommt eine Einladung.
4. TestFlight-Builds laufen **90 Tage**. Danach einen neuen Build hochladen (Workflow erneut starten).

---

## 8. App-Store-Eintrag ausfüllen

App Store Connect → App → links unter **iOS-App** die Version **1.0 Bereitet zur Einreichung vor** (*Prepare for Submission*).
Die Texte stehen fertig in **`app-store-eintrag.md`**. Dort steht für jedes Feld, wohin es gehört:

1. **Vorschaubilder und Bildschirmfotos** (*Previews and Screenshots*): Für **iPhone 6,3″** (Pflicht), **iPhone 6,9″**
   (freiwillig) und **iPad 13″** (Pflicht) die Dateien aus `screenshots/` hochladen (Abschnitt 11). Andere Größen rechnet Apple
   selbst herunter.
2. **Werbetext, Beschreibung, Schlüsselwörter, Support-URL, Marketing-URL** aus `app-store-eintrag.md`.
3. **Build**: Auf **+** bei *Build* klicken und den TestFlight-Build wählen.
4. **Allgemeine App-Informationen** (*App Information*, links): Untertitel, **Kategorie** Spiele → Rollenspiel (zweite Kategorie:
   Spiele → Action), **Altersfreigabe** (Fragebogen, Abschnitt 4 in `app-store-eintrag.md`), Inhaltsrechte: „Nein, enthält keine
   Inhalte Dritter“, außer du nutzt fremde Grafiken oder Musik mit Lizenz, dann „Ja“.
5. **Preise und Verfügbarkeit** (*Pricing and Availability*): Preis **0 (kostenlos)**, Länder: alle. iPhone- und iPad-Apps auf
   Macs mit Apple-Chip: **aus** (die Steuerung ist für Touch gebaut).
6. **App-Datenschutz** (*App Privacy*): Datenschutz-URL `https://seelenstein.online/datenschutz.html` und die Angaben aus
   `app-store-eintrag.md`, Abschnitt 3 → **Veröffentlichen**.
7. **App-Prüfung** (*App Review Information*): Testkonto, Kontakt und **Notizen** aus `app-store-eintrag.md`, Abschnitt 5.
8. **Versionsfreigabe** (*Version Release*): „Diese Version manuell freigeben“, dann entscheidest du nach der Freigabe selbst,
   wann sie erscheint.

---

## 9. Testkonto für die Prüfer

Apple testet mit einem eigenen iPhone/iPad. Das Spiel geht ohne Konto, aber Post, Auktionshaus, Melden und Konto löschen brauchen
eins. Deshalb:

1. Im Spiel ein Konto anlegen, z. B. Kontoname `AppleReview` und ein langes Zufallspasswort.
2. Einen Charakter erstellen und ein paar Stufen spielen, damit die Prüfer schnell etwas sehen.
3. Kontoname und Passwort **nur in App Store Connect** eintragen (*Anmeldung erforderlich* ankreuzen → Benutzername/Passwort).
   **Nicht in einen Chat schreiben.**
4. Das Konto nach der Prüfung **nicht löschen**. Apple braucht es auch bei jedem Update.

Hinweis: Das Konto anzulegen ist für die Prüfer „Konto erstellen“. Sie probieren oft auch **Konto löschen** aus. Danach musst du
das Testkonto neu anlegen und die Daten in App Store Connect anpassen.

---

## 10. Zur Prüfung einreichen

1. Alles aus Abschnitt 8 ausgefüllt? Oben rechts **Zur Prüfung hinzufügen** (*Add for Review*) → **An App Review senden**.
2. Status „Warten auf Prüfung“ (*Waiting for Review*) → „In Prüfung“ (*In Review*) → „Bereit zur Veröffentlichung“ bzw.
   „Abgelehnt“ (*Rejected*). Du bekommst jeweils eine E-Mail. Meist dauert es 1–2 Tage.
3. Nach der Freigabe: **Diese Version veröffentlichen**. Nach wenigen Stunden ist die App im App Store zu finden.

---

## 11. Bildschirmfotos (Screenshots)

Apple verlangt (Stand November 2026, *Screenshot specifications* in der App-Store-Connect-Hilfe):

| Gerät in App Store Connect | Pflicht? | Größe quer (Pixel) | Dateien |
|---|---|---|---|
| **iPhone 6,3″** (*iPhone with Dynamic Island, medium display*) | **Pflicht** | **2622 × 1206** | `screenshots/iphone63-01.jpg` … `-07.jpg` |
| **iPhone 6,9″** (*iPhone with Dynamic Island, large display*) | freiwillig, sieht auf großen iPhones schärfer aus | **2868 × 1320** | `screenshots/iphone69-01.jpg` … `-07.jpg` |
| **iPad 13″** (*iPad 13-inch display*) | **Pflicht** (die App läuft auch auf dem iPad) | **2752 × 2064** | `screenshots/ipad13-01.jpg` … `-07.jpg` |

Die übrigen Größen (6,5″, 5,5″, ältere iPads) rechnet App Store Connect selbst herunter. 1 bis 10 Bilder je Gerät, JPEG oder PNG,
ohne Transparenz. Lade sie in der Reihenfolge der Nummern hoch:

1. Krieger mit der Ultimativen Attacke „Klingenhimmel“ gegen Lavagolems am Feuerberg
2. Nekromant mit Knochenhunden am Seelenstein „Stein der Gier“ im Dunkelwald
3. Frost-Magierin gegen die Spinnenkönigin in der Spinnenhöhle (Boss-Balken)
4. Schamanin gegen Steinoger im Ödland
5. Bogen-Ninja bei Nacht im Totenmoor gegen Untote
6. Stadt Vlotho mit Händlern
7. Inventar mit Ausrüstung und Seltenheitsfarben

Alle Bilder stammen aus dem laufenden Spiel (Version 13.78, 3D, Grafik „Hoch“), aufgenommen mit Playwright in genau der
Bildschirmgröße des jeweiligen Geräts (iPhone: 956 × 440 bzw. 874 × 402 Punkte × 3, iPad: 1376 × 1032 Punkte × 2). Die Szenen sind
gestellt (hohe Stufen, Monster herangeholt), es ist aber nichts hineinmontiert. Apple verbietet Bilder, die mehr zeigen, als das
Spiel kann. Auf dem iPad wirkt die Oberfläche kleiner, weil das Spiel dort wie auf einem großen Bildschirm dargestellt wird.

---

## 12. Wenn Apple ablehnt

1. Die E-Mail führt ins **Resolution Center** (App Store Connect → App → *App Review* → Nachricht). Dort steht die Richtlinie,
   z. B. „Guideline 4.2 – Design – Minimum Functionality“, oft mit Bildschirmfoto.
2. **Ruhig und sachlich antworten** (auf Englisch). Vorlagen für die häufigsten Fälle stehen in `app-store-eintrag.md`,
   Abschnitt 6. Man kann auf die Nachricht antworten, ohne einen neuen Build hochzuladen.
3. Verlangt Apple eine Änderung an der App: Bescheid geben. Die Änderung wird gemacht, dann Workflow neu starten (gleiche
   Versionsnummer ist in Ordnung, die Buildnummer steigt), neuen Build in der Version auswählen und erneut einreichen.
4. Bei Ablehnung nach Richtlinie 4.2 hilft oft ein **Telefonat** mit App Review: In der Antwort „Request a call“ wählen.
   Zusätzlich gibt es den **Einspruch** beim *App Review Board* (Formular „Contact Us → App Review → Appeal“).

---

## 13. Später: Updates

- **Spielinhalte, Fehlerbehebungen, neue Klassen usw.:** wie immer über die Website. Die App lädt beim nächsten Start die neue
  Version. **Kein** App-Update nötig.
- **Neuer App-Build nötig bei:** Änderungen in `ios/` (Name, Symbol, Plugins, Domains), neuer Capacitor-Version, oder wenn Apple
  eine neue Xcode-Version verlangt (meist jedes Frühjahr: dann gilt das SDK des Vorjahres, z. B. ab etwa April 2027 Xcode 27).
  Dann: Workflow starten mit neuer Versionsnummer (z. B. `1.0.1`), in App Store Connect neue Version anlegen (**+ Version**),
  „Neuerungen in dieser Version“ ausfüllen, Build wählen, einreichen.
- **Mitgliedschaft jährlich verlängern** (Apple Developer App → Konto). Sonst verschwindet die App aus dem Store.
- Apple ändert regelmäßig Fragebögen (Altersfreigabe, Datenschutz). Wenn App Store Connect rot markiert „Aktion erforderlich“,
  die neuen Fragen beantworten, sonst sind keine Updates möglich.

---

## Quellen (geprüft am 4. 11. 2026)

- Apple: SDK-Mindestanforderungen (Xcode 26 / iOS 26 SDK seit 28. 4. 2026) – https://developer.apple.com/news/upcoming-requirements/
- Apple: Screenshot-Größen – https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
- Apple: App Review Guidelines (4.2 Minimum Functionality, 1.2 User-Generated Content, 5.1.1 Datenschutz/Konto löschen) –
  https://developer.apple.com/app-store/review/guidelines/
- Apple: Altersfreigaben (neue Stufen 13+, 16+, 18+; Fragen zu Social-Media-Funktionen ab September 2026) –
  https://developer.apple.com/news/?id=ks775ehf und https://developer.apple.com/news?id=tlur8uvi
- Capacitor 8 (Xcode 26, iOS 15, Swift Package Manager) – https://capacitorjs.com/docs/getting-started/environment-setup
- Cloud-Signierung mit API-Schlüssel braucht die Rolle Admin bzw. Zugriff auf Cloud-verwaltete Zertifikate –
  https://zenn.dev/yorifuji/scraps/8718061a2b484a
