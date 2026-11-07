# Seelenstein als Desktop-App für Windows

Stand: 6. 11. 2026. Electron 45.2.3, electron-builder 26.18.0, App-Version 1.1.0.
Alles für die App liegt im Ordner `desktop/`, gebaut wird sie von GitHub Actions (`.github/workflows/desktop.yml`).

## 1. Was ist das?

Bisher ist Seelenstein im Microsoft Store ein **PWA-Paket** von PWABuilder (siehe `docs/microsoft-store/`). Das Paket ist nur
eine Hülle, die das Spiel im Edge-Unterbau von Windows (WebView2) öffnet. Deshalb steht im Task-Manager „Microsoft Edge“, und
die App teilt sich Einstellungen und Grenzen mit Edge.

Die neue **Desktop-App** ist ein eigenes Programm, gebaut mit Electron (Chromium wird mitgeliefert):

| | PWA-Paket (bisher) | Desktop-App (neu) |
|---|---|---|
| Name im Task-Manager | Microsoft Edge | **Seelenstein**, mit eigenem Symbol |
| Braucht Edge | ja | **nein**, alles ist dabei |
| Grafikkarte | wie Edge entscheidet | **dedizierte Grafikkarte bevorzugt**, auch bei Laptops mit zwei Grafikchips |
| Grafiktreiber auf Chromes Sperrliste | WebGL evtl. langsam oder aus | **Sperrliste ignoriert**, GPU wird trotzdem genutzt |
| Fenster im Hintergrund oder verdeckt | wird gedrosselt | **läuft mit voller Leistung weiter** (Kanäle, Gruppe, Musik) |
| Bildrate | wie der Bildschirm | wie der Bildschirm (60, 120, 144, 240 Hz); im Spiel „Bildrate: Max“ wählen |
| Vollbild | immer | Fenster oder Vollbild, **F11** schaltet um, Größe und Lage werden gemerkt |
| Spiel-Updates | sofort (lädt seelenstein.online) | sofort (lädt seelenstein.online) |
| Ohne Internet | Edge-Fehlerseite | eigene Seite „Keine Verbindung“ mit **Erneut versuchen**; war das Spiel schon einmal geladen, startet es aus dem Speicher |

Die App lädt immer `https://seelenstein.online/?quelle=desktop`. **Jedes Spiel-Update kommt also sofort an**, ohne neue App.
Der Service Worker des Spiels arbeitet wie im Browser.

### Was die App technisch einstellt (`desktop/main.js`)

- Leistung: `force_high_performance_gpu`, `ignore-gpu-blocklist`, `enable-gpu-rasterization`, `enable-zero-copy`,
  `disable-renderer-backgrounding`, `disable-background-timer-throttling`, `disable-backgrounding-occluded-windows`,
  im Fenster `backgroundThrottling: false`. Die Bildrate wird nicht künstlich begrenzt; sie folgt dem Bildschirm (V-Sync).
  Darüber hinaus (z. B. 500 Bilder pro Sekunde bei 144 Hz) bringt nichts außer Hitze und Lüfterlärm.
- Sicherheit: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, kein `<webview>`. Im App-Fenster darf nur
  `seelenstein.online` (und `www.`) geöffnet werden. Berechtigungen gibt es nur für Vollbild, Zeiger fangen, Kopieren und
  „Bildschirm wach halten“.
- Links: Seiten des Spiels in neuen Fenstern (Wiki, Datenschutz, Verhaltensregeln, Konto löschen) öffnen sich als App-Fenster.
  Alles andere (fremde Seiten, E-Mail-Links) öffnet der **Standardbrowser** bzw. das Mailprogramm.
- Anmeldung: Das Konto läuft über die Firebase-REST-Schnittstelle (`js/konto.js`, `identitytoolkit.googleapis.com`,
  `securetoken.googleapis.com`). Das sind normale Datenabrufe, keine Seitenwechsel. Sie funktionieren in der App wie im Browser.
  Eine Google-Anmeldung per Popup gibt es im Spiel nicht.
- Der Kasten „Als App installieren“ der Website wird in der App ausgeblendet.
- Tasten: **F11** oder **Alt+Enter** Vollbild an/aus, **F5** oder **Strg+R** neu laden, **Strg+Umschalt+I** Entwicklerwerkzeuge.
- Nur eine App läuft gleichzeitig. Ein zweiter Start holt das offene Fenster nach vorn.
- Stürzt die Seite ab, lädt die App sie von selbst neu.

**Am Spiel selbst wurde nichts geändert.**

## 2. App bauen (GitHub Actions)

Du brauchst keinen Windows-PC mit Entwicklerwerkzeugen. GitHub baut die App auf einem Windows-Rechner in der Cloud.

1. Auf GitHub das Repository öffnen und oben auf **Actions** klicken.
2. Links den Workflow **„Desktop-App (Windows)“** auswählen.
3. Rechts auf **Run workflow** klicken. Den Branch auswählen, auf dem `desktop/` liegt.
   Bei **Versionsnummer** entweder nichts eintragen (dann gilt die Nummer aus `desktop/package.json`, jetzt 1.1.0) oder eine
   neue Nummer wie `1.1.1`. Dann auf den grünen Knopf **Run workflow**.
4. Etwa 5 bis 10 Minuten warten, bis der Lauf einen grünen Haken hat. Auf den Lauf klicken.
5. Ganz unten unter **Artifacts** liegen zwei ZIP-Dateien:
   - **Seelenstein-Windows-Installer**: darin `Seelenstein-Setup-1.1.0.exe`
   - **Seelenstein-Microsoft-Store**: darin `Seelenstein-Store-1.1.0-x64.appx`
6. Anklicken zum Herunterladen und entpacken. Artefakte bleiben 90 Tage auf GitHub.

Alternativ baut ein Tag automatisch: Ein Tag wie `desktop-v1.1.1` hochladen, dann baut der Workflow mit Version 1.1.1.

## 3. App installieren (Installer)

1. `Seelenstein-Setup-1.1.0.exe` doppelklicken. Es braucht keine Administratorrechte. Die App wird nur für dich installiert.
2. Ist der Installer nicht signiert (Abschnitt 6), zeigt Windows „Der Computer wurde durch Windows geschützt“. Dann auf
   **Weitere Informationen** → **Trotzdem ausführen** klicken.
3. Die App startet sofort. Danach gibt es Verknüpfungen auf dem Desktop und im Startmenü.
4. Deinstallieren: Einstellungen → Apps → Seelenstein → **Deinstallieren**.

Die Daten der App (Spielstände ohne Konto, Einstellungen, Fenstergröße) liegen in `%APPDATA%\Seelenstein`.
Bei einer neuen Version einfach den neuen Installer starten. Die Daten bleiben erhalten.

**Tipp für Laptops mit zwei Grafikchips:** Die App bittet Windows schon selbst um die starke Grafikkarte. Falls nicht:
Einstellungen → System → Anzeige → **Grafik** → Seelenstein auswählen (beim Installer über „Durchsuchen“ die Datei
`%LOCALAPPDATA%\Programs\seelenstein-desktop\Seelenstein.exe`) → **Hohe Leistung**. Im Spiel unter Einstellungen
die höchste Grafikstufe und **Bildrate: Max** wählen.

## 4. Im Microsoft Store als neue Version der bestehenden App einreichen

Das Store-Paket hat dieselbe Identität wie das bisherige PWA-Paket. Die Werte stammen aus `docs/microsoft-store/`:

| Feld | Wert |
|---|---|
| Identity Name | `Meyzo.Seelenstein` |
| Publisher | `CN=73683B8E-9A0F-4DBF-9181-D80B5281EF68` |
| PublisherDisplayName | `Meyzo` |
| DisplayName | `Seelenstein` |
| Sprachen | de-DE, en-US |
| Version | 1.1.0.0 (höher als die bisherigen 1.0.1.0 und 1.0.0.0) |

Es fehlen keine Werte. Wer die Identität nachprüfen will: Partner Center → Seelenstein → **Produktverwaltung →
Produktidentität**. Weicht dort etwas ab, die Werte im Abschnitt `"appx"` von `desktop/package.json` anpassen und neu bauen.

**Vor dem Umstieg wichtig:** Die alte Store-App speichert Spielstände **ohne Konto** im Speicher von Edge, die neue App in
ihrem eigenen Speicher. Wer mit einem **Konto** spielt, merkt nichts, denn die Charaktere liegen in der Cloud. Spieler ohne
Konto sehen ihre lokalen Charaktere in der neuen App nicht. Seit Spielversion 14.31 zeigt der Startbildschirm in der alten
Store-App deshalb Spielern ohne Konto (mit Charakteren auf dem Gerät) den Hinweis „Seelenstein wird im Microsoft Store zur
eigenen Desktop-App. Lege jetzt ein kostenloses Konto an – nur dann ziehen deine Charaktere mit.“ Am besten nach dem Update
eine Woche warten, bevor das neue Paket eingereicht wird, und den Satz zusätzlich in die Neuerungen schreiben.

So geht die Einreichung:

1. `https://partner.microsoft.com/dashboard` → **Apps und Spiele** → **Seelenstein** → **Update** (neue Übermittlung).
2. **Pakete:** die beiden alten Pakete (`Seelenstein.msixbundle` 1.0.1.0 und `Seelenstein.classic.appxbundle` 1.0.0.0)
   entfernen und `Seelenstein-Store-1.1.0-x64.appx` **unverändert** hochladen. Nicht entpacken oder umbenennen.
   Es ist absichtlich nicht signiert, denn Microsoft signiert Store-Pakete selbst.
3. **Gerätefamilien:** nur **Windows 10/11 Desktop** angehakt lassen.
4. Die Warnung zu **eingeschränkten Funktionen** (`runFullTrust`) ist normal. Begründung unter **Übermittlungsoptionen**
   eintragen: `Seelenstein is a desktop game built with Electron (Win32 app packaged as MSIX). runFullTrust is required for
   every packaged Win32 desktop app.`
5. **Store-Einträge** → „Neuerungen in dieser Version“, z. B.: „Seelenstein ist jetzt eine eigene Desktop-App: schneller,
   nutzt die Grafikkarte voll aus, Fenster oder Vollbild mit F11.“ Alle anderen Texte und Bilder bleiben.
   Unter **Eigenschaften → Systemanforderungen** kann man zusätzlich „Grafikkarte: DirectX 11“ empfehlen. Das ist freiwillig.
6. Bei den **Hinweisen zur Zertifizierung** den Satz über PWABuilder/Edge durch diesen ersetzen: `The app is an Electron
   desktop app that loads https://seelenstein.online/. Test account: …` (Testkonto wie bisher).
7. **An den Store übermitteln.** Die Prüfung dauert meist bis zu drei Werktage. Danach bekommen alle, die die App aus dem
   Store haben, das Update automatisch.

**Spätere Store-Updates** braucht es nur, wenn sich die Hülle ändert (neue Electron-Version, anderes Symbol, neue Funktionen
der App). Dann die Version erhöhen (z. B. 1.1.1), neu bauen und wie oben einreichen. **Spiel-Updates brauchen keine
Einreichung.**

**Testen vor der Einreichung:** Das unsignierte Store-Paket lässt sich nicht per Doppelklick installieren. Zum Ausprobieren
den Installer aus Abschnitt 3 nehmen. Er enthält dieselbe App.

## 5. Was du selbst tun musst

1. Den Workflow einmal starten (Abschnitt 2) und den Installer auf dem eigenen PC ausprobieren: Startet die App? Steht im
   Task-Manager „Seelenstein“? Gehen Anmelden, Chat, Kanäle und F11?
2. Im Microsoft Store einreichen (Abschnitt 4). Vorher die Spieler ohne Konto auf das Konto hinweisen.
3. **Freiwillig:** den Installer signieren (Abschnitt 6).
4. **Etwa alle 3 bis 6 Monate:** die App mit einer neueren Electron-Version neu bauen lassen. Darin stecken
   Sicherheitsupdates von Chromium. Dafür in `desktop/` `npm install --save-exact electron@latest` ausführen (oder Claude darum
   bitten), die Version in `desktop/package.json` erhöhen, neu bauen und im Store einreichen.

## 6. Signieren des Installers (freiwillig)

Ohne Signatur warnt Windows SmartScreen beim ersten Start des Installers. Die App funktioniert trotzdem. Das Store-Paket
braucht keine Signatur, die kommt von Microsoft.

Wer signieren will, braucht ein **Code-Signing-Zertifikat** (gekauft bei einer Zertifizierungsstelle, als `.pfx`-Datei)
und legt auf GitHub zwei Secrets an: Repository → **Settings** → **Secrets and variables** → **Actions** →
**New repository secret**:

| Secret | Inhalt |
|---|---|
| `WINDOWS_ZERTIFIKAT_PFX` | die `.pfx`-Datei, base64-kodiert. PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("zertifikat.pfx")) \| Set-Clipboard`, dann einfügen |
| `WINDOWS_ZERTIFIKAT_PASSWORT` | das Passwort der `.pfx`-Datei |

Zertifikat und Passwort **nie** ins Repository und nie in einen Chat geben. Fehlen die Secrets, baut der Workflow einfach
unsigniert. Viele neue Zertifikate liegen nur noch auf einem Hardware-Token oder in der Cloud, etwa bei Azure Trusted Signing.
Dafür müsste der Workflow angepasst werden.

## 7. Dateien

| Datei | Wofür |
|---|---|
| `desktop/package.json` | Name, Version, Electron-Version, Bau-Einstellungen (Installer, Store-Identität) |
| `desktop/main.js` | die App: Fenster, Leistungsschalter, Link- und Sicherheitsregeln, Offline-Seite |
| `desktop/offline/offline.html` | Seite „Keine Verbindung“ (mit Schriften und Symbol, braucht kein Internet) |
| `desktop/build/icon.ico`, `icon.png` | Programmsymbol, erzeugt aus `icons/icon-512.png` |
| `desktop/build/appx/` | Kacheln und Logos für das Store-Paket in 4 Skalierungen (100–200 %) und Taskleisten-Größen |
| `desktop/build/symbole-erzeugen.sh` | erzeugt alle Symbole neu, wenn sich `icons/icon-512.png` ändert (braucht ImageMagick) |
| `.github/workflows/desktop.yml` | baut Installer und Store-Paket auf Windows |

Zum Ausprobieren auf dem eigenen Rechner (mit Node.js): in `desktop/` `npm install` und dann `npm start`.
Mit der Umgebungsvariable `SEELENSTEIN_URL=http://localhost:8000/` lädt die App eine lokale Testversion des Spiels.

## 8. Und das Handy?

Die Handy-Apps nutzen die Grafikleistung des Geräts schon voll. Das Spiel läuft dort in der Browser-Engine des Systems,
und die zeichnet WebGL immer auf der Grafikeinheit des Handys.

- **Android** (`android/`) ist eine **Trusted Web Activity** (Bubblewrap), keine Capacitor-App. Das Spiel läuft in Chrome
  bzw. dem Standardbrowser des Geräts. Hardwarebeschleunigung schaltet Android für Apps ab Android 4.0 von selbst ein
  (`android:hardwareAccelerated` ist standardmäßig `true`, die App braucht mindestens Android 7). Gezeichnet wird ohnehin
  in Chrome, das immer die GPU nutzt. In `android/twa-manifest.json` gibt es dafür keinen Schalter, und es ist auch keiner nötig.
  Was man einstellen kann:
  - im Spiel **Bildrate: Max** (90 oder 120 Bilder auf Handys mit schnellem Bildschirm, standardmäßig 30 zum Akkusparen)
    und eine passende Grafikstufe,
  - am Handy den **Energiesparmodus** ausschalten. Er begrenzt Chrome oft auf 30 oder 60 Bilder,
  - bei manchen Herstellern unter Einstellungen → Anzeige die Bildwiederholrate auf **hoch/120 Hz** stellen.
- **iPhone/iPad** (`ios/`) ist eine **Capacitor-App** mit dem WKWebView von iOS, ebenfalls mit Grafikbeschleunigung.
  iOS lässt Webseiten meist mit 60 Bildern pro Sekunde laufen, auch auf 120-Hz-Displays. Der Info.plist-Schlüssel
  `CADisableMinimumFrameDurationOnPhone` erlaubt nativen Apps 120 Hz. Ob WKWebView das für das Spiel nutzt, hängt von der
  iOS-Version ab. Deshalb wurde er nicht gesetzt.
