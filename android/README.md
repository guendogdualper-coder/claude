# Seelenstein als Android-App (Google Play)

Dieser Ordner enthält alles, was man braucht, um die Android-App **„Seelenstein“** für Google Play
neu zu bauen. Die App ist eine **Trusted Web Activity (TWA)**: eine sehr kleine Android-Hülle, die
das Spiel von **https://seelenstein.online/** im Vollbild über Chrome (bzw. den Standard-Browser des
Geräts) startet – ohne Adressleiste, mit eigenem App-Symbol und Splash-Screen.

**Wichtig:** Spiel-Updates (Version 13.x usw.) gehen wie bisher einfach über die Website live.
Ein neues App-Bundle ist nur nötig, wenn sich an der *Hülle* etwas ändert (Name, Symbol, Farben,
Paket-ID, Android-Vorgaben von Google wie ein neues `targetSdk`).

## Eckdaten

| Einstellung | Wert |
|---|---|
| Paket-ID (applicationId) | `de.seelenstein.spiel` |
| App-Name / Launcher-Name | Seelenstein / Seelenstein |
| versionCode / versionName | 1 / 1.0.0 (unabhängig von der Spielversion) |
| Start-URL | `https://seelenstein.online/?quelle=play` (Scope: ganze Domain) |
| Darstellung | Vollbild (immersive), Querformat |
| Farben | Theme `#14110D`, Hintergrund/Navigationsleiste `#12100C` (aus `manifest.webmanifest`) |
| Symbole | Splash + Legacy-Icon aus `icons/icon-512.png`, adaptives Icon aus `icons/icon-maskable-512.png` |
| Benachrichtigungen / Standort / Play Billing / Play Games | aus |
| Fallback (falls kein TWA-fähiger Browser) | Custom Tabs |
| minSdk / targetSdk / compileSdk | 24 / 36 / 36 (Bubblewrap 1.27.0, android-browser-helper 2.7.4) |

Google Play verlangt seit 31. 8. 2026 für neue Apps und Updates `targetSdk 36` – das ist erfüllt.
`minSdk 24` (Android 7.0) ist Pflicht, weil android-browser-helper 2.7.4 nichts Älteres unterstützt.

## Dateien

| Datei | Zweck |
|---|---|
| `android/twa-manifest.json` | **Die** Konfiguration der App (Bubblewrap-Format). Alle Änderungen hier machen. |
| `android/.gitignore` | Verhindert, dass Gradle-Projekt, Builds oder Schlüssel eingecheckt werden. |
| `tools/android-bauen.sh` | Baut `.aab` + Test-`.apk` nicht-interaktiv (Linux, macOS, Windows mit Git-Bash/WSL). |
| `.well-known/assetlinks.json` | Digital Asset Links: beweist Android, dass App und Website zusammengehören. |

**Niemals ins Repo:** Keystore (`*.keystore`/`*.jks`), Passwörter, das erzeugte Gradle-Projekt,
`.aab`/`.apk`. Gebaut wird immer in einem Ordner *außerhalb* des Repos.

## Paket-ID ändern (nur VOR dem ersten Upload!)

Die Paket-ID ist nach dem ersten Upload zu Google Play **für immer** festgelegt. Wer eine andere
möchte (z. B. `online.seelenstein.app`), ändert sie vorher an genau zwei Stellen:

1. `android/twa-manifest.json` → `"packageId"`
2. `.well-known/assetlinks.json` → `"package_name"`

…und baut dann neu.

## Digital Asset Links (sonst erscheint eine Adressleiste!)

Damit die App ohne Browser-Adressleiste läuft, muss Android prüfen können, dass die Domain der App
vertraut. Dafür muss diese Datei erreichbar sein:

**https://seelenstein.online/.well-known/assetlinks.json**

Sie liegt im Repo unter `.well-known/assetlinks.json`. GitHub Pages veröffentlicht den Punkt-Ordner,
weil `.nojekyll` existiert, und der Caddy-Server auf dem VPS reicht die Domain an GitHub Pages
(`/claude/…`) durch. Voraussetzung: `server/setup.sh` wurde mit der Domain-Konfiguration ausgeführt
(solange die Domain noch per 302 auf github.io umleitet, schlägt die Prüfung fehl).

Die Datei enthält zunächst den SHA-256-Fingerabdruck des **Upload-Schlüssels**:

```
EE:8E:7F:F9:ED:35:4E:30:9F:35:0B:5B:35:03:D1:02:8F:F8:DF:2D:60:4C:A1:FE:43:2C:94:B2:D3:08:9E:A8
```

Das reicht für die selbst installierte Test-APK. **Über Google Play installierte Apps sind aber mit
Googles App-Signaturschlüssel signiert (Play App Signing).** Deshalb nach dem ersten Upload:

1. Play Console → App auswählen → **Testen und veröffentlichen → App-Integrität → App-Signatur**
   (englisch: *Test and release → App integrity → App signing*).
2. Dort den **SHA-256-Zertifikatfingerabdruck des App-Signaturschlüssels** kopieren
   (Google zeigt dort meist auch gleich eine fertige `assetlinks.json` an).
3. In `.well-known/assetlinks.json` als **zweiten** Eintrag in `sha256_cert_fingerprints` ergänzen –
   den Upload-Fingerabdruck drin lassen:

```json
"sha256_cert_fingerprints": [
  "EE:8E:7F:F9:ED:35:4E:30:9F:35:0B:5B:35:03:D1:02:8F:F8:DF:2D:60:4C:A1:FE:43:2C:94:B2:D3:08:9E:A8",
  "AA:BB:…  ← Fingerabdruck des App-Signaturschlüssels aus der Play Console"
]
```

4. Committen, pushen, ein paar Minuten warten. Prüfen mit:
   `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://seelenstein.online&relation=delegate_permission/common.handle_all_urls`
   – beide Fingerabdrücke müssen in der Antwort auftauchen.

Die App selbst muss dafür **nicht** neu gebaut werden. Erscheint in der App trotzdem eine
Adressleiste, stimmt fast immer ein Fingerabdruck oder die Erreichbarkeit der Datei nicht
(Chrome merkt sich das Ergebnis eine Weile: App-Daten von Chrome leeren oder App neu installieren).

## Upload-Schlüssel (Keystore) – sehr wichtig

- Datei `seelenstein-upload.keystore`, Alias `seelenstein`, Passwörter in `ZUGANGSDATEN.txt`.
  Beides wurde dem Inhaber privat übergeben und gehört **nicht** ins Repo.
- An mindestens **zwei getrennten sicheren Orten** aufbewahren (z. B. Passwort-Manager +
  verschlüsselter USB-Stick). Ohne Schlüssel kann man keine neue App-Version hochladen.
- Dank Play App Signing ist ein Verlust **reparierbar**: Google besitzt den eigentlichen
  App-Signaturschlüssel, wir nur den Upload-Schlüssel.

### Schlüssel verloren oder kompromittiert → Upload-Schlüssel zurücksetzen

1. Neuen Keystore erzeugen (JDK nötig, `keytool` liegt im `bin`-Ordner des JDK):
   ```
   keytool -genkeypair -v -storetype PKCS12 -keystore seelenstein-upload-neu.keystore -alias seelenstein -keyalg RSA -keysize 2048 -validity 10950 -dname "CN=Seelenstein, O=Seelenstein, C=DE"
   ```
2. Zertifikat exportieren:
   ```
   keytool -export -rfc -keystore seelenstein-upload-neu.keystore -alias seelenstein -file upload_certificate.pem
   ```
3. Play Console → **App-Integrität → App-Signatur → „Upload-Schlüssel zurücksetzen“**
   (*Request upload key reset*), Grund angeben, `upload_certificate.pem` hochladen.
   Google schaltet den neuen Schlüssel nach einer Wartezeit (meist ~48 Stunden) frei.
4. SHA-256 des neuen Schlüssels (`keytool -list -v -keystore seelenstein-upload-neu.keystore`)
   in `.well-known/assetlinks.json` gegen den alten Upload-Fingerabdruck austauschen.
   Der Fingerabdruck des App-Signaturschlüssels bleibt unverändert.

## Neue Version bauen

Vorher in `android/twa-manifest.json`:

- `"appVersionCode"` **um 1 erhöhen** (Pflicht – Google Play nimmt jeden versionCode nur einmal an),
- `"appVersion"` anpassen (Anzeige-Version, z. B. `1.0.1`).

`bubblewrap update` ohne `--skipVersionUpgrade` erhöht den versionCode auch automatisch – im Repo
trotzdem den neuen Wert festhalten, damit der nächste Bau nicht wieder bei einer alten Nummer startet.

### Weg A: Skript (empfohlen; Linux, macOS, Windows mit Git-Bash oder WSL)

Einmalig: Node.js (LTS) installieren und Bubblewrap einrichten lassen:

```
npx @bubblewrap/cli doctor
```

Bubblewrap fragt beim ersten Mal, ob es **JDK 17** und das **Android-SDK** selbst herunterladen soll
→ beide Male mit *Ja* antworten (es legt `~/.bubblewrap/config.json` an). Dann:

```
SEELENSTEIN_KEYSTORE=/sicherer/ort/seelenstein-upload.keystore \
SEELENSTEIN_KEYSTORE_PASSWORT='…' \
bash tools/android-bauen.sh
```

Ergebnis in `~/seelenstein-android-build/ausgabe/`:
`seelenstein-<version>-<code>.aab` (für Google Play) und `.apk` (zum direkten Testen).
Das Skript lädt Symbole und Web-Manifest aus dem Repo über einen kurzlebigen lokalen Webserver
(funktioniert also auch, wenn die Domain gerade nicht erreichbar ist), trägt in der App die echte
Manifest-URL ein und bricht ab, wenn das `targetSdk` unter 35 liegt.

### Weg B: Bubblewrap von Hand (Windows, macOS, Linux)

1. Node.js (LTS) installieren, dann `npm i -g @bubblewrap/cli`.
2. Einen leeren Ordner **außerhalb** des Repos anlegen, z. B. `C:\seelenstein-android` bzw.
   `~/seelenstein-android`.
3. `android/twa-manifest.json` und den Keystore `seelenstein-upload.keystore` hineinkopieren
   (`"signingKey" → "path"` zeigt auf `./seelenstein-upload.keystore`).
4. Im Ordner: `bubblewrap update --skipVersionUpgrade`
   (beim ersten Mal JDK 17 + Android-SDK installieren lassen, Lizenzen bestätigen).
   Die Datei `https://seelenstein.online/manifest.webmanifest` muss dafür erreichbar sein
   (Fehler „Unexpected token '<' … is not valid JSON“ = Domain liefert noch HTML/Umleitung → Weg A nehmen).
5. `bubblewrap build` – Passwörter eingeben (oder vorher die Umgebungsvariablen
   `BUBBLEWRAP_KEYSTORE_PASSWORD` und `BUBBLEWRAP_KEY_PASSWORD` setzen; bei diesem Keystore sind
   beide Passwörter gleich).
6. Ergebnis: `app-release-bundle.aab` (Google Play) und `app-release-signed.apk` (Test).
   Fragt `bubblewrap build`, ob das Projekt aktualisiert werden soll, mit *Ja* antworten.

### Weg C: PWABuilder (am einfachsten, im Browser)

1. https://www.pwabuilder.com öffnen, `https://seelenstein.online/` eingeben, *Start*.
2. *Package for stores* → **Android** → *Generate Package* → **Google Play**, *Options* öffnen.
3. Werte aus der Tabelle oben eintragen: Package ID `de.seelenstein.spiel`, App name/Launcher name
   `Seelenstein`, App version `1.0.0`, App version code `1`, Host `seelenstein.online`,
   Start URL `/?quelle=play`, Display mode **Fullscreen**, Notification delegation **aus**,
   Location delegation **aus**, Google Play billing **aus**, Fallback **Custom Tabs**.
4. **Signing key: „Use mine“** wählen und den vorhandenen Keystore mit Alias `seelenstein` und den
   Passwörtern hochladen. *Nicht* „New“ wählen – sonst entsteht ein anderer Upload-Schlüssel, der
   nicht zu Google Play und zur `assetlinks.json` passt.
5. Das heruntergeladene ZIP enthält `.aab`, `.apk` und eine `assetlinks.json` (diese nicht blind
   übernehmen – unsere Datei im Repo ist bereits richtig).

PWABuilder nutzt intern ebenfalls Bubblewrap; das Ergebnis ist gleichwertig. Querformat übernimmt
es aus dem Web-Manifest (`"orientation": "landscape"`).

## Testen

- **Test-APK** auf einem Android-Gerät installieren (USB-Debugging: `adb install seelenstein-…apk`
  oder Datei aufs Handy kopieren und öffnen). Erwartung: Splash in Dunkelbraun mit Symbol, dann das
  Spiel im Vollbild-Querformat **ohne Adressleiste**. Mit Adressleiste → siehe Asset Links oben.
- Bundle prüfen (optional, mit [bundletool](https://github.com/google/bundletool/releases)):
  `java -jar bundletool-all.jar validate --bundle=seelenstein-1.0.0-1.aab`
- Für Google Play zuerst einen **internen Test** in der Play Console anlegen und das `.aab` dort
  hochladen; beim ersten Upload Play App Signing akzeptieren (Standard) und danach den
  App-Signatur-Fingerabdruck in `assetlinks.json` ergänzen.

## Hinweise und bekannte Punkte

- **Spielstände:** Die App nutzt den Speicher von Chrome für `seelenstein.online`. Wer schon in
  Chrome auf `seelenstein.online` gespielt hat, findet seinen Stand in der App wieder. Stände der
  alten Adresse `guendogdualper-coder.github.io/claude/` zieht `js/umzug.js` wie im Browser um.
- `?quelle=play` an der Start-URL erlaubt der Website zu erkennen, dass sie aus der Play-App
  gestartet wurde (z. B. für Play-Richtlinien). Der Service Worker ignoriert den Parameter beim
  Offline-Cache (`ignoreSearch`).
- **Monochromes Icon** (Android 13 „Themed Icons“) ist nicht gesetzt, weil es kein passendes
  einfarbiges Motiv mit Transparenz gibt. Nachrüsten: PNG (weiße Silhouette auf transparentem
  Grund, 512×512) unter `icons/` ablegen, in `twa-manifest.json` als `"monochromeIconUrl"`
  eintragen und neu bauen.
- Bubblewrap legt beim Bauen eine `store_icon.png` (512×512) im Bauordner ab – kann als
  Play-Store-Symbol verwendet werden.
- Gradle-Fehler „429 Too Many Requests“ von `repo.maven.apache.org` bedeuten ein Rate-Limit von
  Maven Central (z. B. in Firmennetzen/Cloud-Umgebungen) – später erneut versuchen.
