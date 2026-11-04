# Google Play – Vorschlag für das Formular „Datensicherheit“

Stand: 4. 11. 2026, Spielversion 13.76/13.77 (mit Melden, Blockieren und Konto löschen). Die Antworten sind aus dem Code abgeleitet
und passen zur Datenschutzerklärung `datenschutz.html`. Ändert sich das Spiel (neue Server, neue Daten, Werbung, Analyse), muss das
Formular neu ausgefüllt werden.

Wo in der Play Console: **Überwachen und verbessern → Richtlinien und Programme → App-Inhalte → Datensicherheit**
(engl. *Policy and programs → App content → Data safety*). Das Formular hat 4 Schritte: Übersicht, Datenerhebung und Sicherheit,
Datentypen, Datennutzung und -verarbeitung.

---

## 1. Was der Code wirklich überträgt (Grundlage)

| Weg | Wohin | Was | Gespeichert? | Code |
|---|---|---|---|---|
| Anmeldung, Registrierung | Firebase Authentication (Google) `identitytoolkit.googleapis.com`, `securetoken.googleapis.com` | Kontoname als interne Adresse `name@spieler.seelenstein.app` (keine echte E-Mail), Passwort (nur Firebase, als Hash), Anmeldeschlüssel | ja, bei Firebase | `js/konto.js` (`accountAuth`, `accountToken`) |
| Cloud-Spielstand | Firebase Realtime Database `seelenstein-e2e0c` (europe-west1), Pfad `konten/<uid>` | bis zu 4 Charaktere (Name, Klasse, Aussehen, Stufe, Ausrüstung, Gold, Fortschritt, Freunde, Gilde), Gerätekennung (Zufallswert) je Platz, Blockierliste | ja | `js/konto.js` (`cloudPut`), `js/konto-config.js` |
| Post | Firebase `post/<uid>` | Empfänger, Absender-Charakter und -UID, Betreff, Brieftext, Gold, Gegenstände, Zeit | ja, bis zur Löschung | `js/post.js`, `js/handel-db.js` |
| Auktionshaus | Firebase `auktion/<id>` (für angemeldete Spieler lesbar) | UID, Charaktername, Gegenstand, Preis, Laufzeit, ggf. Käufer | ja, bis Verkauf oder Ablauf | `js/auktionshaus.js` |
| Namensverzeichnis | Firebase `namen/<name>` | Charaktername, Klasse, UID, Zeit | ja | `js/handel-db.js` |
| Konto-Lager | Firebase `lager/<uid>` | eingelagerte Gegenstände | ja | `js/kontolager.js` |
| Meldungen (nur mit Konto) | Firebase `meldungen/<id>` (nur der Betreiber kann sie lesen) | UID, Konto- und Charaktername der meldenden Person, gemeldeter Name, Grund, eigener Text, bis zu 10 Chatzeilen der gemeldeten Person, Server/Kanal, Version, Zeit | ja, laut Datenschutzerklärung höchstens 6 Monate | `js/spielerschutz.js` |
| Mehrspieler und Chat | direkt von Gerät zu Gerät (WebRTC), Vermittlung über MQTT: eigener Server `server.seelenstein.online`, öffentlich `broker.hivemq.com`, `broker.emqx.io`; Verbindungsaufbau über STUN/TURN (Google, Cloudflare, PeerJS, Metered, freestun) | Charaktername, Klasse, Stufe, Aussehen, Ausrüstung, Gilde, Position, Aktionen, Chatnachrichten | **nein**, nur im Arbeitsspeicher der Mitspieler bzw. des Welt-Wächters | `js/netz.js`, `js/netz-signal.js` |
| Spieldateien, Website | GitHub Pages über den eigenen Server (Caddy, netcup) | IP-Adresse, angefragte Datei (technisch bedingt) | Fehlerprotokolle des Servers, regelmäßig gelöscht | `server/setup.sh` |

**Kein** Code für Werbung, Analyse, Absturzberichte, Standort, Kontakte, Kamera, Mikrofon, Dateien oder Zahlungen. Schriften liegen seit
13.77 auf dem eigenen Webspace, es gibt also keine Verbindung zu einem Schriftanbieter. Die Android-Hülle (Trusted Web Activity) hat
Benachrichtigungen, Standort und Play Billing ausgeschaltet (`android/twa-manifest.json`).

**Ohne Konto** verlässt kein Spielstand das Gerät, alles bleibt im `localStorage`. Ins Netz gehen dann nur die Mehrspieler-Daten, und
auch die nur, wenn man einen Kanal betritt. Allein spielen geht ganz ohne Server.

---

## 2. Schritt „Datenerhebung und Sicherheit“

| Frage (Play Console) | Antwort | Begründung |
|---|---|---|
| Werden durch Ihre App erforderliche Nutzerdatentypen erhoben oder geteilt? | **Ja** | Konto, Cloud-Spielstand, Post, Auktionshaus, Meldungen |
| Werden alle erhobenen Nutzerdaten bei der Übertragung verschlüsselt? | **Ja** | Firebase nur über HTTPS, MQTT nur über `wss://`, WebRTC immer mit DTLS verschlüsselt, Website über HTTPS |
| Welche Methoden zur Kontoerstellung unterstützt Ihre App? | **Nutzername und Passwort** | Kontoname (3–20 Zeichen) und Passwort, keine E-Mail, kein Google-Login |
| Link zum Löschen des Kontos | `https://seelenstein.online/konto-loeschen.html` | Seite löscht Konto und alle Kontodaten nach Anmeldung (`js/konto-loeschen.js`) |
| Können Nutzer das Löschen einiger oder aller Daten beantragen, ohne ihr Konto zu löschen? | **Ja** (empfohlen) | Charaktere lassen sich im Spiel löschen (auch in der Cloud), Briefe im Postfach löschen, Blockierliste bearbeiten. Weitere Wünsche per E-Mail an `kontakt@seelenstein.online`. Als Link kann die Datenschutzerklärung dienen (`…/datenschutz.html`, Abschnitt 8 und 9). |

Hinweis zu „Konto löschen“: Google verlangt, dass die Seite ohne Neuinstallation der App erreichbar ist, den App-Namen nennt, die
Schritte erklärt und sagt, welche Daten gelöscht oder aufbewahrt werden. Das deckt `konto-loeschen.html` ab. Vorher prüfen, dass die
Seite unter `seelenstein.online` erreichbar ist und dass die Firebase-Regeln aus `docs/konten-einrichten.md` veröffentlicht sind,
sonst schlägt das Löschen von Post und Auktionen fehl.

---

## 3. Schritt „Datentypen“ – was ankreuzen

Angekreuzt werden nur Datentypen, die das Gerät verlassen **und** gespeichert oder dauerhaft verarbeitet werden. Der Mehrspieler-Chat
wird nur „flüchtig“ (nur im Arbeitsspeicher) verarbeitet. Google nimmt solche Daten aus der Anzeige im Store aus. Trotzdem ist der Typ
„Andere In-App-Nachrichten“ wegen Post und Meldungen anzukreuzen.

| Kategorie | Datentyp (DE / EN) | Ankreuzen? | Was genau |
|---|---|---|---|
| Personenbezogene Daten | **Name** / *Name* | **Ja** | Google zählt Spitznamen dazu: Kontoname und Charaktername |
| Personenbezogene Daten | **Nutzer-IDs** / *User IDs* | **Ja** | Firebase-Konto-ID (uid), Kontoname |
| Personenbezogene Daten | E-Mail-Adresse | Nein | Die interne Adresse wird aus dem Kontonamen gebildet, es wird keine echte E-Mail erhoben |
| Personenbezogene Daten | Adresse, Telefon, sonstige | Nein | |
| Nachrichten | **Andere In-App-Nachrichten** / *Other in-app messages* | **Ja** | Post (Betreff, Text), Chatauszüge in Meldungen |
| Nachrichten | E-Mails, SMS/MMS | Nein | |
| App-Aktivitäten | **Sonstige Aktionen** / *Other actions* („z. B. Gameplay“) | **Ja** | Spielstand und Fortschritt im Konto |
| App-Aktivitäten | **Sonstige von Nutzern erstellte Inhalte** / *Other user-generated content* | **Ja** | Angebote im Auktionshaus, Text in Meldungen, Aussehen der Figur |
| App-Aktivitäten | App-Interaktionen, Suchverlauf, installierte Apps | Nein | keine Nutzungsanalyse |
| Geräte- oder andere IDs | **Geräte- oder andere IDs** / *Device or other IDs* | **Ja** (vorsichtshalber) | zufällige Gerätekennung `seelenstein.geraet`, mit Konto in der Cloud gespeichert |
| Standort | ungefährer/genauer Standort | Nein | Die IP-Adresse wird nicht zur Standortbestimmung genutzt |
| Finanzdaten, Gesundheit, Fotos/Videos, Audio, Dateien, Kalender, Kontakte, Web-Browsing | – | Nein | |
| App-Informationen und -Leistung (Absturzprotokolle, Diagnose) | – | Nein | Es gibt keinen Absturz- oder Analysedienst |

---

## 4. Schritt „Datennutzung und -verarbeitung“ – je Datentyp

Für jeden angekreuzten Typ fragt die Console dasselbe. Vorschlag:

| Datentyp | Erhoben | Geteilt | Flüchtig verarbeitet? | Erforderlich oder optional? | Zwecke |
|---|---|---|---|---|---|
| Name | Ja | Nein | Nein | **Optional** (nur mit Konto) | App-Funktionen, Kontoverwaltung |
| Nutzer-IDs | Ja | Nein | Nein | **Optional** | App-Funktionen, Kontoverwaltung, Betrugsprävention/Sicherheit/Compliance (Meldungen) |
| Andere In-App-Nachrichten | Ja | Nein | Nein | **Optional** | App-Funktionen (Post), Betrugsprävention/Sicherheit/Compliance (Meldungen) |
| Sonstige Aktionen (Gameplay) | Ja | Nein | Nein | **Optional** | App-Funktionen, Kontoverwaltung |
| Sonstige von Nutzern erstellte Inhalte | Ja | Nein | Nein | **Optional** | App-Funktionen, Betrugsprävention/Sicherheit/Compliance |
| Geräte- oder andere IDs | Ja | Nein | Nein | **Optional** | App-Funktionen (welches Gerät einen Charakter gerade spielt) |

**Warum „optional“?** Google erlaubt „optional“ nur, wenn alle Nutzer die Erhebung überspringen können. Das ist hier der Fall:
Man kann ohne Konto spielen, auch im Mehrspieler. Konto, Post, Auktionshaus und Melden sind freiwillig. Spielt man ohne Konto,
wird nichts davon gespeichert.

**Warum „nicht geteilt“?**
- Firebase (Google) speichert die Daten **im Auftrag** des Betreibers. Google wertet das als Dienstleister und nicht als Teilen.
- Dass der Charaktername, Chatnachrichten oder Briefe bei **anderen Spielern** ankommen, löst der Nutzer selbst aus (Kanal betreten,
  Nachricht senden). Google nimmt solche vom Nutzer veranlassten Übertragungen ausdrücklich aus.
- MQTT-Broker und TURN-Server leiten nur verschlüsselt weiter und speichern nichts. Sie zählen als technische Übermittlung.
- **Entscheidung für den Inhaber:** Bei den öffentlichen Brokern (HiveMQ, EMQX) und TURN-Servern gibt es keinen Auftragsvertrag. Wer
  ganz auf Nummer sicher gehen will, schaltet sie in `js/netz-signal.js` ab und nutzt nur den eigenen Server. Sonst bleibt es bei
  „nicht geteilt“ mit der Begründung oben. Die Datenschutzerklärung nennt die Broker bereits offen (Abschnitt 5).

**Sonstige Angaben im Formular:**
- „Unabhängige Sicherheitsüberprüfung“ (*Independent security review*): **Nein**.
- „Richtlinie für Familien eingehalten“: Das Feld erscheint nur, wenn die Zielgruppe Kinder enthält. Empfehlung ist, keine Kinder als
  Zielgruppe zu wählen (siehe `anleitung.md`).

---

## 5. Vorschau: so etwa sieht es danach im Store aus

- **Keine Daten an Dritte weitergegeben**
- **Erhobene Daten (optional):** Personenbezogene Daten (Name, Nutzer-IDs), Nachrichten (andere In-App-Nachrichten),
  App-Aktivitäten (sonstige Aktionen, sonstige von Nutzern erstellte Inhalte), Geräte- oder andere IDs
- **Daten werden verschlüsselt übertragen**
- **Du kannst das Löschen der Daten beantragen**

---

## 6. Vor dem Absenden prüfen

1. `datenschutz.html` ist unter `https://seelenstein.online/datenschutz.html` erreichbar, und alle Platzhalter (`[NAME DES BETREIBERS]`,
   `[ANSCHRIFT]`, `[E-MAIL-ADRESSE]`) sind ersetzt.
2. `https://seelenstein.online/konto-loeschen.html` lädt, und eine Testlöschung mit einem Wegwerf-Konto klappt.
3. Die Firebase-Regeln aus `docs/konten-einrichten.md`, Abschnitt „Melden, Blockieren und Konto löschen (seit 13.77)“, sind veröffentlicht.
   Live gibt es derzeit nur die Regeln für `konten`.
4. Formular und Datenschutzerklärung stimmen überein: Google prüft beides gegeneinander.
