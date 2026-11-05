# Seelenstein im Microsoft Store veröffentlichen – Schritt für Schritt

Diese Anleitung ist für den Inhaber ohne Entwicklerkenntnisse geschrieben und wird an einem Windows-PC abgearbeitet.
Stand: 4. 11. 2026. Die Vorgaben von Microsoft und PWABuilder wurden an diesem Tag nachgeprüft (Quellen am Ende).
Partner Center ist meist auf Deutsch eingestellt. Der englische Name des Menüpunkts steht jeweils in Klammern.

**Das Wichtigste vorab**

- Seelenstein kommt als **PWA-Paket** in den Store. Das Paket ist eine kleine Windows-Hülle (MSIX), die
  `https://seelenstein.online/` mit dem Edge-Unterbau von Windows im Vollbild startet. Gebaut hat es PWABuilder, so wie Microsoft es
  für PWAs empfiehlt.
- **Spiel-Updates gehen weiter einfach über die Website live.** Ein neues Paket braucht es nur, wenn sich an der Hülle oder am
  Web-Manifest etwas ändert (Abschnitt 9).
- Der Produktname „Seelenstein“ ist in Partner Center schon reserviert (Produkttyp „MSIX- oder PWA-Spiel“, Store-ID `9PH1C6WDZMK3`).
- Die Prüfung dauert laut Microsoft **in der Regel bis zu drei Werktage**, oft weniger.

Alle Texte und Bilder liegen in diesem Ordner:

| Datei | Wofür |
|---|---|
| `store-eintrag.md` | alle Texte und Antworten: Beschreibung (DE/EN), Features, Keywords, Kategorie, Spieleinstellungen, Altersfreigabe, Hinweise für die Prüfer |
| `screenshots/pc-01.png` bis `pc-06.png` | sechs Screenshots 1920 × 1080 (PC-Ansicht) |
| `grafiken/poster-2x3-1440x2160.png` | Store-Logo „2:3 Poster art“ |
| `grafiken/boxart-1x1-1080x1080.png` | Store-Logo „1:1 Box art“ |
| `grafiken/app-kachel-300x300.png` | Store-Logo „1:1 App tile icon“ |
| `grafiken/super-hero-art-16x9-1920x1080.png` | „16:9 Super hero art“ (ohne Text) |

Die Pakete selbst liegen **nicht** im Repository. Du bekommst sie gesondert als ZIP-Datei `Seelenstein-MicrosoftStore-PWABuilder.zip`.

---

## 0. Voraussetzungen – erst erledigen, dann einreichen

1. **Platzhalter ersetzen:** `[NAME DES BETREIBERS]`, `[ANSCHRIFT]` und `[E-MAIL-ADRESSE]` in `datenschutz.html` (deutscher und
   englischer Teil) sowie `KONTAKT_EMAIL` in `js/spielerschutz.js`. Microsoft verlangt eine erreichbare Datenschutzerklärung, wenn
   ein Spiel personenbezogene Daten verarbeitet (Konto, Chat).
2. **Firebase-Regeln veröffentlichen** (Melden, Post, Auktionshaus, Konto löschen), wie in `docs/google-play/anleitung.md`,
   Abschnitt 0, Punkt 3.
3. **seelenstein.online liefert das Spiel selbst aus.** Leitet die Domain auf eine andere Adresse weiter, zeigt die Store-App oben
   eine Leiste mit URL und Seitentitel. Microsoft wertet jede Navigation außerhalb des Bereichs der PWA so.
4. **Testkonto für die Prüfer** im Spiel anlegen (z. B. Kontoname `StorePruefung`, starkes Passwort, ein Charakter mit etwas Fortschritt).
5. **Optional, aber empfohlen:** Das Paket vorher auf dem eigenen PC ausprobieren (Abschnitt 2).

## 1. Was im Paket steckt (bereits erzeugt und geprüft)

Die ZIP-Datei von PWABuilder enthält:

| Datei | Wofür | Hochladen? |
|---|---|---|
| `Seelenstein.msixbundle` | Hauptpaket für Windows 10 ab Version 2004 (Mai 2020, Build 19041) und Windows 11. Version **1.0.1.0** | **Ja** |
| `Seelenstein.classic.appxbundle` | „Classic“-Paket für ältere Windows-10-Versionen (ab Build 16299). Version **1.0.0.0** | **Ja** |
| `Seelenstein.sideload.msix`, `install.ps1`, `utils\pwainstaller.exe` | Testpaket zum Ausprobieren auf dem eigenen PC | **Nein** |
| `readme.html` | Link zur PWABuilder-Hilfe | Nein |

Geprüft wurde die `AppxManifest.xml` in beiden Store-Paketen:

| Feld | Wert im Paket |
|---|---|
| Identity Name | `Meyzo.Seelenstein` |
| Identity Publisher | `CN=73683B8E-9A0F-4DBF-9181-D80B5281EF68` |
| PublisherDisplayName | `Meyzo` |
| DisplayName | `Seelenstein` |
| Start-Adresse | `https://seelenstein.online/` (Vollbild, Edge Stable als Unterbau) |
| Mindest-Windows | Hauptpaket 10.0.19041.0, Classic-Paket 10.0.16299.0 |
| Sprachen | DE-DE, EN-US |
| Kacheln und Symbole | 44×44 (auch 16–256 px ohne Hintergrund), 71×71, 150×150, 310×150, 310×310, Store-Logo 50×50, Startbild 620×300 – jeweils in 5 Skalierungen, erzeugt aus `icons/icon-512.png` |

**Warum 1.0.1 und 1.0.0 statt 1.0.0.0?** PWABuilder verlangt, dass das Classic-Paket eine **kleinere** Versionsnummer hat als
das Hauptpaket. Nur so nimmt Partner Center beide in einer Einreichung an. Mit Classic-Paket muss das Hauptpaket deshalb mindestens
1.0.1 haben. Die vierte Stelle bleibt 0, denn sie ist für den Store reserviert.

**Wichtig:** Die Pakete **unverändert** hochladen, also nicht entpacken, umbenennen oder neu packen. Sie sind absichtlich nicht
signiert, Microsoft signiert sie bei der Veröffentlichung selbst. Deshalb lassen sich die Store-Pakete auch nicht per Doppelklick
installieren. Zum Testen gibt es das Testpaket.

## 2. Testpaket auf dem eigenen PC ausprobieren (optional)

1. ZIP-Datei in einen eigenen Ordner entpacken (Rechtsklick → **Alle extrahieren**).
2. Rechtsklick auf `install.ps1` → **Mit PowerShell ausführen**.
3. Kommt die Meldung „Die Ausführung von Skripts ist auf diesem System deaktiviert“: Im entpackten Ordner in die Adressleiste
   des Explorers `powershell` tippen und Enter drücken. Im Fenster dann
   `powershell -ExecutionPolicy Bypass -File .\install.ps1` eingeben. Das erlaubt das Skript nur für diesen einen Aufruf.
   PWABuilder schlägt stattdessen `Set-ExecutionPolicy bypass` vor. Das schaltet den Schutz aber dauerhaft für den ganzen PC ab.
4. Das Skript installiert Seelenstein und startet es. Danach steht es im Startmenü.
5. Prüfen: Startet das Spiel im Vollbild? Erscheint keine Adressleiste? Funktionieren Anmelden, Chat und Kanäle?
6. Nach dem Test wieder deinstallieren (Startmenü → Rechtsklick auf Seelenstein → **Deinstallieren**). Sonst stehen später
   Test- und Store-Version nebeneinander im Startmenü.

Hinweis: Das Testpaket braucht Windows 10 ab Version 2004 oder Windows 11 und einen aktuellen Microsoft Edge.

## 3. Übermittlung starten

1. `https://partner.microsoft.com/dashboard` öffnen und mit dem Microsoft-Konto anmelden, mit dem der Name reserviert wurde.
2. **Apps und Spiele** (*Apps and games*) → **Seelenstein** anklicken.
3. **Übermittlung starten** (*Start your submission*).

Die Übersicht zeigt die Abschnitte **Preise und Verfügbarkeit**, **Eigenschaften**, **Altersfreigaben**, **Pakete**,
**Store-Einträge** und **Übermittlungsoptionen**. Jeder Abschnitt muss „Abgeschlossen“ zeigen. Die Reihenfolge ist egal.
Am besten fängst du mit **Pakete** an, denn danach kennt Partner Center die Sprachen (Deutsch, Englisch) und bietet die
passenden Store-Einträge an.

## 4. Pakete (*Packages*)

1. **Pakete** öffnen und beide Dateien gleichzeitig in das Feld ziehen (oder **Dateien durchsuchen**):
   `Seelenstein.msixbundle` **und** `Seelenstein.classic.appxbundle`.
2. Warten, bis beide geprüft sind. Es erscheinen **zwei** Pakete mit den Versionen 1.0.1.0 und 1.0.0.0.
3. **Warnung zu eingeschränkten Funktionen** (`runFullTrust`): Sie ist normal und lässt sich ignorieren. PWABuilder braucht diese
   Funktion für das Edge-PWA-Modell. Eine Begründung trägst du in Abschnitt 8 ein.
4. **Gerätefamilien** (*Device family availability*): nur **Windows 10/11 Desktop** angehakt lassen. **Holographic**, Xbox und Team
   abwählen. Das Hauptpaket erlaubt technisch auch HoloLens, getestet ist das aber nicht.
5. Die Option, Microsoft über künftige Gerätefamilien entscheiden zu lassen, nicht ankreuzen.
6. **Speichern**.

Typische Fehler und was sie bedeuten (nach PWABuilder-Hilfe):

| Meldung | Ursache |
|---|---|
| „Ungültiger Paketherausgebername“ (*Invalid package publisher name*) | Publisher im Paket passt nicht zum Konto. Er sollte passen: `CN=73683B8E-…EF68` |
| „Ungültiger Paketidentitätsname“ (*Invalid package identity name / family name*) | Package-ID passt nicht. Sie sollte passen: `Meyzo.Seelenstein` |
| „Anzeigename nicht reserviert“ | Der Name im Paket weicht von der Reservierung ab. Im Paket steht `Seelenstein` |

Taucht einer dieser Fehler doch auf, vergleiche die Werte unter **Produktverwaltung → Produktidentität** (*Product identity*) mit der
Tabelle in Abschnitt 1. Das Paket muss dann neu erzeugt werden (Anhang A).

## 5. Preise und Verfügbarkeit (*Pricing and availability*)

Werte aus `store-eintrag.md`, Abschnitt 11:

- **Märkte:** alle Märkte (Standard).
- **Sichtbarkeit:** öffentlich verfügbar.
- **Preis:** **Kostenlos**.
- **Kostenlose Testversion:** keine.
- **Veröffentlichung:** „so bald wie möglich“. Möchtest du den Zeitpunkt selbst bestimmen, wähle in Abschnitt 8 „manuell veröffentlichen“.
- **Speichern**.

## 6. Eigenschaften (*Properties*)

Werte aus `store-eintrag.md`, Abschnitte 8 bis 10:

1. **Kategorie:** Spiele → **Rollenspiel**. Zweite Kategorie optional: Action & Abenteuer.
2. **Datenschutz:** „Greift auf personenbezogene Daten zu“ → **Ja**, URL `https://seelenstein.online/datenschutz.html`.
3. **Website:** `https://seelenstein.online/`. **Supportkontakt:** deine E-Mail-Adresse.
4. **Spieleinstellungen:** Einzelspieler ja, Online-Mehrspieler kompetitiv und kooperativ ja, 2 bis 8 Spieler. Lokaler Mehrspieler,
   **plattformübergreifend (PC ↔ Xbox)**, Xbox-Dienste und **Controller: nein**. Seelenstein hat keine Gamepad-Steuerung.
5. **Anzeigemodus:** nichts ankreuzen.
6. **Produktdeklarationen:** „Aufnehmen und Übertragen von Clips“ ankreuzen. Alles andere wie in `store-eintrag.md`, Abschnitt 10.
   **Generative KI: nein. Käufe ohne Microsoft-Commerce: nein.**
7. **Systemanforderungen:** bei **Tastatur** und **Maus** jeweils „Mindestens“ ankreuzen. Sonst nichts.
8. **Speichern**.

## 7. Altersfreigaben (*Age ratings*)

Microsoft nutzt denselben IARC-Fragebogen wie Google Play.

- **Hast du bei Google Play schon eine IARC-Bewertung bekommen?** Dann die Option zur Eingabe einer vorhandenen **IARC-Bewertungs-ID**
  wählen. Die ID steht in der E-Mail von IARC. Microsoft übernimmt dann die Freigaben.
- **Sonst:** Fragebogen ausfüllen, die Antworten stehen in `store-eintrag.md`, Abschnitt 12, ausführlich in
  `docs/google-play/inhaltsbewertung.md`. Am Ende auf **Speichern und generieren** klicken.

Erwartet werden etwa PEGI 12 und USK 12 mit dem Hinweis „Nutzer interagieren“.

## 8. Store-Einträge (*Store listings*)

Für **Deutsch** und **Englisch** je einen Eintrag ausfüllen. Die Texte stehen in `store-eintrag.md`:

1. **Beschreibung:** Abschnitt 2 (deutscher bzw. englischer Block, unverändert einfügen).
2. **Screenshots → Desktop:** `pc-01.png` bis `pc-06.png` hochladen, Reihenfolge 01 bis 06. Die Bildunterschriften stehen in
   Abschnitt 7. Die Bilder müssen in **jedem** Spracheintrag einzeln hochgeladen werden.
3. **Store-Logos:**
   - **2:3 Poster art** → `grafiken/poster-2x3-1440x2160.png` (für Spiele das Hauptbild im Store)
   - **1:1 Box art** → `grafiken/boxart-1x1-1080x1080.png`
   - **1:1 App tile icon** → `grafiken/app-kachel-300x300.png`
   - Der Haken, nur die hochgeladenen Logos zu verwenden, ist **nicht nötig**.
4. **Trailer und zusätzliche Ressourcen:** **16:9 Super hero art** → `grafiken/super-hero-art-16x9-1920x1080.png`. Ein Trailer ist
   optional und nicht erstellt.
5. **Zusätzliche Felder:** Kurzbeschreibung (Abschnitt 3), Produktfeatures (Abschnitt 4, jede Zeile in ein eigenes Feld, **ohne**
   Aufzählungszeichen), Keywords (Abschnitt 5), weitere Felder (Abschnitt 6). „Neuerungen in dieser Version“ beim ersten Mal leer lassen.
6. **Speichern**. Danach dasselbe für Englisch.

Die Bilder sind PNG, weil Partner Center Screenshots und Logos nur als PNG annimmt (je höchstens 50 MB). Alle Bilder sind echte
Spielszenen: Screenshots mit Oberfläche, die Grafiken ohne Oberfläche und Namensschilder.

## 9. Übermittlungsoptionen (*Submission options*)

1. **Veröffentlichungszeitpunkt:** „Veröffentlichen, sobald die Zertifizierung bestanden ist“ oder „manuell veröffentlichen“.
2. **Hinweise zur Zertifizierung** (*Notes for certification*): den englischen Text aus `store-eintrag.md`, Abschnitt 13, einfügen.
   Vorher die Platzhalter für Testkonto und Passwort ersetzen.
3. **Begründung für eingeschränkte Funktionen** (*Restricted capabilities*), falls nach `runFullTrust` gefragt wird:
   `Needed for the PWA hosted app model (Microsoft Edge), package created by pwabuilder.com.`
4. **Speichern**.

## 10. Einreichen

1. In der Übersicht prüfen, dass alle Abschnitte „Abgeschlossen“ zeigen.
2. **An den Store übermitteln** (*Submit to the Store*).
3. Der Status wechselt über „Vorverarbeitung“ und „Zertifizierung“ zu „Veröffentlichung“. Die Prüfung dauert laut Microsoft meist
   **bis zu drei Werktage**. PWABuilder und Microsofts Edge-Doku nennen für PWAs oft **24 bis 48 Stunden**. Nach bestandener
   Prüfung ist der Eintrag in etwa **15 Minuten** sichtbar.
4. Wird die Einreichung abgelehnt, steht im Zertifizierungsbericht der Grund. Häufige Gründe sind eine fehlende oder unvollständige
   Datenschutzerklärung, Texte, die nicht zum Spiel passen, oder ein fehlender Testzugang. Beheben und erneut einreichen.

Store-Link nach der Veröffentlichung: `https://apps.microsoft.com/detail/9PH1C6WDZMK3`.
Für die Website kann man danach unter `https://developer.microsoft.com/en-us/microsoft-store/badges/` ein offizielles Store-Abzeichen erzeugen.

## 11. Updates

**Normale Spiel-Updates (neue Version auf der Website):** nichts im Partner Center tun. Die Store-App lädt das Spiel jedes Mal von
`https://seelenstein.online/`. Der Service Worker bringt die neue Version wie im Browser.

**Neues Paket nötig**, wenn sich am Web-Manifest oder an der Hülle etwas ändert:
- App-Name, Symbol oder Farben im Manifest
- neue Manifest-Einträge wie `shortcuts`, `share_target`, `protocol_handlers`, `file_handlers`
- andere Start-Adresse oder Domain
- PWABuilder bietet eine neue Paketversion an, die nötig wird

So geht das Update:
1. Neues Paket erzeugen (Anhang A) und dabei die Version **erhöhen**: Hauptpaket z. B. `1.0.2`, Classic `1.0.1`. Die Versionen
   müssen jeweils größer sein als die bisher veröffentlichten, und das Classic-Paket bleibt kleiner als das Hauptpaket.
2. Partner Center → Seelenstein → **Update** (neue Übermittlung).
3. Unter **Pakete** die alten Pakete entfernen und die neuen hochladen. Unter **Store-Einträge** „Neuerungen in dieser Version“ ausfüllen.
4. Einreichen. Es folgt wieder die Prüfung.

**Store-Texte oder Bilder ändern** geht ebenfalls über eine neue Übermittlung, dann aber ohne neues Paket.

**Altersfreigabe:** Kommen In-App-Käufe, Werbung, Sprach-Chat oder deutlich härtere Inhalte dazu, muss der IARC-Fragebogen
neu ausgefüllt werden (Altersfreigaben → **Bearbeiten**). Das gilt auch dann, wenn nur die Website aktualisiert wird.

---

## Anhang A: Paket selbst neu erzeugen auf pwabuilder.com

Das jetzige Paket wurde am 4. 11. 2026 mit dem Paketdienst von PWABuilder erzeugt. Dabei wurden dieselben Optionen genutzt wie auf
der Website. So geht es im Browser:

1. `https://www.pwabuilder.com/` öffnen, `https://seelenstein.online/` eingeben → **Start**.
2. Die Auswertung abwarten. Seelenstein erfüllt alle Pflichtpunkte. Die Hinweise auf Screenshots, Shortcuts usw. sind Empfehlungen.
3. **Package For Stores** → bei **Windows** auf **Generate Package**.
4. Felder ausfüllen:

| Feld | Wert |
|---|---|
| Package ID | `Meyzo.Seelenstein` |
| Publisher display name | `Meyzo` |
| Publisher ID | `CN=73683B8E-9A0F-4DBF-9181-D80B5281EF68` |
| App name | `Seelenstein` |
| App version | `1.0.1` (bei Updates höher, siehe Abschnitt 11) |
| Classic package version | `1.0.0` (immer kleiner als App version) |
| URL | `https://seelenstein.online/` |
| Language | `de-de` und zusätzlich `en-us` (unter „All settings“ / Sprachauswahl) |
| Icon URL | `https://seelenstein.online/icons/icon-512.png` (Standard) |

5. **Download Package**. Die ZIP-Datei enthält die beiden Store-Pakete und das Testpaket.

Die tatsächlich verwendeten Optionen liegen als JSON beim Inhaber (`pwabuilder-optionen.json`). Erzeugt wurde das Paket über
denselben Dienst, den auch die Website aufruft (`https://pwabuilder-windows-docker.azurewebsites.net/msix/generatezip`).

## Anhang B: Bilder

| Datei | Inhalt |
|---|---|
| `pc-01.png` | Krieger (Weg der Klinge, Stufe 46) wirkt die Ultimative Attacke „Klingenhimmel“ gegen Eiswölfe am Frostgipfel |
| `pc-02.png` | Magier (Weg des Frosts) gegen die Spinnenkönigin im Dungeon Spinnenhöhle, mit Boss-Balken |
| `pc-03.png` | Magier (Weg des Feuers) mit Phönixflamme gegen Lavagolems am Feuerberg |
| `pc-04.png` | Stadt Kazehana mit Händlerständen, Häusern, Weltentor und Bewohnern |
| `pc-05.png` | Charakterfenster, Reiter Fertigkeiten, mit Rängen (Legendär, Heroisch) |
| `pc-06.png` | Große Karte des Dunkelwalds mit Weltentor, Waldlager, Dungeons und Endboss |
| `poster-2x3-1440x2160.png` | Spielszene Feuerberg (Phönixflamme zwischen Lavagolems) mit Spielsymbol und Titel „Seelenstein“ im oberen Drittel |
| `boxart-1x1-1080x1080.png` | Dieselbe Szene quadratisch, Titel oben |
| `super-hero-art-16x9-1920x1080.png` | Dieselbe Szene ohne Text, ohne Oberfläche, Figur in der Bildmitte |
| `app-kachel-300x300.png` | Spielsymbol `icons/icon-512.png`, verkleinert |

Aufgenommen wurden die Bilder im laufenden Spiel (Version 13.78, Grafik „Hoch“) mit Playwright im Desktop-Layout:
1600 × 900 CSS-Pixel, Faktor 1,2, ergibt 1920 × 1080. Die Szenen sind gestellt (hohe Stufen, Monster herangeholt). Bei den
Grafiken ist die Oberfläche ausgeblendet. Für Titel und Rahmen wurde die Spielschrift Marcellus SC verwendet. Auf den Store-Grafiken
gibt es keine Runenkreise am Boden, und die Titel stehen in den oberen zwei Dritteln, wie Microsoft es verlangt.

## Quellen (abgerufen am 4. 11. 2026)

- Microsoft Learn – Publish a PWA to the Microsoft Store: https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps/how-to/microsoft-store
- Microsoft Learn – App screenshots, images, and trailers for MSIX app: https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/screenshots-and-images
- Microsoft Learn – Add and edit Store listing info for MSIX app: https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/add-and-edit-store-listing-info
- Microsoft Learn – Add additional information (Keywords): https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/add-additional-information
- Microsoft Learn – Enter app properties for MSIX app: https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/enter-app-properties
- Microsoft Learn – Product declarations for MSIX app: https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/product-declarations
- Microsoft Learn – System requirements for MSIX app: https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/system-requirements
- Microsoft Learn – Age ratings for MSIX app: https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/age-ratings
- Microsoft Learn – App certification process for MSIX app: https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-certification-process
- PWABuilder-Doku, Windows: https://docs.pwabuilder.com/#/builder/windows
- PWABuilder-Quellcode (Windows-Paketdienst, Versionsregeln, Classic-Paket, Paketfehler): https://github.com/pwa-builder/PWABuilder (Ordner `apps/pwabuilder-microsoft-store`, `apps/blog/src/docs/windows`)
