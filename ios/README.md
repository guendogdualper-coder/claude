# Seelenstein als iPhone/iPad-App (App Store)

Dieser Ordner enthält die iOS-App **„Seelenstein“** – eine **Capacitor-App** (Capacitor 8), die das Spiel live von
**https://seelenstein.online/** lädt. Gebaut wird sie **ausschließlich auf GitHub Actions** (macOS-Runner), ein Mac ist nicht nötig.
Schritt-für-Schritt-Anleitung für Apple-Konto, TestFlight und App Store: **[`docs/ios/anleitung.md`](../docs/ios/anleitung.md)**.

**Wichtig:** Spiel-Updates (Version 13.x usw.) gehen wie bisher über die Website live – auch in der iPhone-App, ohne neue
Prüfung durch Apple. Ein neuer App-Build ist nur nötig, wenn sich an der *Hülle* etwas ändert (Name, Symbol, Plugins,
Einstellungen hier im Ordner, neue Xcode-Vorgaben von Apple).

## Eckdaten

| Einstellung | Wert |
|---|---|
| Bundle-ID | `de.seelenstein.spiel` (gleich wie die Android-App) |
| Name auf dem Home-Bildschirm | Seelenstein |
| Geräte | iPhone und iPad, **nur Querformat**, Vollbild (Statusleiste aus, Home-Leiste blendet sich aus) |
| Mindest-iOS | 15.0 (Vorgabe von Capacitor 8) |
| Start-URL | `https://seelenstein.online/?quelle=ios` |
| Ohne Internet | eingebaute Seite „Keine Verbindung – erneut versuchen“ (`www/offline.html`, Deutsch/Englisch) |
| Navigation | nur `seelenstein.online` bleibt in der App; Links auf andere Seiten öffnen Safari |
| Service Worker | an (über *App-Bound Domains*): einmal geladen, startet das Spiel auch offline (allein spielen) |
| Native Funktionen | Vibration (Haptik), Erinnerung an die Tagesbelohnung (lokale Mitteilung, freiwillig), Teilen („Freunde einladen“), In-App-Browser, Pause von Ton und Musik im Hintergrund, Bildschirm bleibt an |
| Buildnummer | automatisch = Laufnummer des GitHub-Workflows |
| Version | 1.0.0 (beim Start des Workflows änderbar) |

## Wie die App funktioniert

1. Beim Start zeigt iOS den dunklen Startbildschirm mit dem Symbol (`LaunchScreen.storyboard` + `Splash`-Bild).
2. Das WebView (WKWebView) lädt `https://seelenstein.online/?quelle=ios`. Capacitor spritzt dabei seine Brücke in die
   Seite ein: `window.Capacitor.isNativePlatform()` ist dann `true`, und die Plugins sind direkt als
   `Capacitor.Plugins.Haptics`, `Capacitor.Plugins.LocalNotifications` usw. aufrufbar – ohne npm-Pakete im Spiel.
3. Das Spiel selbst erkennt die App in `js/nativ.js` (Web-Seite, nicht in diesem Ordner) und schaltet dort Haptik,
   Erinnerung, Teilen-Knopf usw. ein. In normalen Browsern macht `js/nativ.js` nichts.
4. Kann die Seite nicht geladen werden, zeigt die App `www/offline.html`. Die prüft alle paar Sekunden, ob der Server
   wieder erreichbar ist, und lädt dann das Spiel.

## Dateien

| Datei | Zweck |
|---|---|
| `capacitor.config.json` | **Die** Konfiguration: Bundle-ID, Start-URL, erlaubte Domains, Startbildschirm, WebView-Einstellungen |
| `package.json`, `package-lock.json` | Capacitor-Versionen (fest), für `npm ci` im Workflow |
| `www/` | Dateien, die IN der App liegen: `offline.html` (Keine Verbindung), `index.html` (Platzhalter), Symbol, Schriften |
| `App/App.xcodeproj` | Xcode-Projekt (Ziel „App“, Schema „App“) |
| `App/App/Info.plist` | Name, Querformat, Vollbild, *App-Bound Domains*, Verschlüsselungs-Angabe (keine eigene Verschlüsselung) |
| `App/App/SeelensteinViewController.swift` | WebView-Feinheiten: kein Gummiband, Ton ohne Tippen, Home-Leiste aus, Bildschirm bleibt an |
| `App/App/SceneDelegate.swift`, `AppDelegate.swift` | Start der App (aus der Capacitor-Vorlage) |
| `App/App/PrivacyInfo.xcprivacy` | Datenschutz-Manifest (kein Tracking; passt zu „App-Datenschutz“ in App Store Connect) |
| `App/App/Assets.xcassets` | App-Symbol 1024 × 1024 (ohne Alphakanal) und Startbild |
| `App/CapApp-SPM/Package.swift` | Swift-Pakete (Capacitor + Plugins) – wird von `npx cap sync ios` neu geschrieben |
| `../.github/workflows/ios.yml` | Bauen auf GitHub (Simulator-Test immer, TestFlight-Upload wenn die Secrets gesetzt sind) |
| `../tools/ios-bilder.js` | Erzeugt App-Symbol, Startbild und `www/symbol.png` neu aus `icons/icon-512.png` |

**Nie ins Repo:** `node_modules/`, der API-Schlüssel (`*.p8`), Zertifikate, `.ipa`. Die `.gitignore` hier verhindert das.
Die Zugangsdaten für Apple liegen nur als **GitHub-Secrets** im Repository (siehe Anleitung).

## Häufige Änderungen

- **Neue Version für den App Store:** Workflow „iOS-App“ von Hand starten (Actions → iOS-App → *Run workflow*) und bei
  „Versionsnummer“ z. B. `1.0.1` eintragen. Die Buildnummer zählt von selbst hoch.
- **Neues Symbol:** `icons/icon-512.png` (oder besser ein neues `icons/icon-1024.png`) ersetzen, dann im Repo-Hauptordner
  `node tools/ios-bilder.js` ausführen und die geänderten Bilder einchecken.
- **Andere Domain:** `server.url` und `server.allowNavigation` in `capacitor.config.json` **und** `WKAppBoundDomains` in
  `App/App/Info.plist` ändern, außerdem die Adresse in `www/offline.html`.
- **Service Worker / App-Bound Domains abschalten** (falls die App einmal nur eine leere Seite zeigt):
  in `capacitor.config.json` `"limitsNavigationsToAppBoundDomains": false` setzen und in `Info.plist` den Block
  `WKAppBoundDomains` löschen. Dann startet das Spiel ohne Internet nicht mehr, alles andere bleibt gleich.
- **Capacitor aktualisieren:** Versionen in `package.json` erhöhen, `npm install`, `npx cap sync ios`, alles einchecken.
  Große Sprünge (z. B. Capacitor 9) vorher in der offiziellen Upgrade-Anleitung nachlesen.

## Lokal ausprobieren (nur mit Mac)

```bash
cd ios
npm ci
npx cap sync ios
npx cap open ios      # öffnet Xcode; dort Simulator wählen und ▶ drücken
```

Ohne Mac reicht der GitHub-Workflow: Er baut für den Simulator, startet die App dort einmal und legt ein Bildschirmfoto
und das Protokoll als Artefakt ab (Actions → Lauf öffnen → unten „Artifacts“).
