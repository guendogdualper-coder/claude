#!/usr/bin/env bash
# Seelenstein – Android-App-Bundle (.aab) + Test-APK nicht-interaktiv bauen (Trusted Web Activity).
#
# Grundlage ist android/twa-manifest.json. Bubblewrap erzeugt daraus ein Gradle-Projekt
# AUSSERHALB des Repos (ANDROID_ARBEITSVERZEICHNIS) und baut/signiert dort.
#
# Voraussetzungen (siehe android/README.md):
#   - Node.js 18+ (für Bubblewrap), bash
#   - ~/.bubblewrap/config.json mit "jdkPath" (JDK 17!) und "androidSdkPath"
#     (einmal "npx @bubblewrap/cli doctor" bzw. ein beliebiger Bubblewrap-Befehl richtet das ein)
#
# Pflicht-Umgebungsvariablen:
#   SEELENSTEIN_KEYSTORE            Pfad zur Upload-Keystore-Datei (z. B. ~/geheim/seelenstein-upload.keystore)
#   SEELENSTEIN_KEYSTORE_PASSWORT   Passwort des Keystores
# Optional:
#   SEELENSTEIN_KEY_PASSWORT        Passwort des Schlüssels (Standard: gleich dem Keystore-Passwort)
#   SEELENSTEIN_KEY_ALIAS           Alias (Standard: seelenstein)
#   ANDROID_ARBEITSVERZEICHNIS      Bauordner (Standard: ~/seelenstein-android-build) – NIE im Repo!
#   BUBBLEWRAP                      Bubblewrap-Aufruf (Standard: "npx -y @bubblewrap/cli@1.27.0")
#
# Beispiel:
#   SEELENSTEIN_KEYSTORE=~/geheim/seelenstein-upload.keystore \
#   SEELENSTEIN_KEYSTORE_PASSWORT='…' bash tools/android-bauen.sh
#
# Ergebnis: $ANDROID_ARBEITSVERZEICHNIS/ausgabe/seelenstein-<versionName>-<versionCode>.aab (+ .apk)
#
# Hinweis: Icons und Web-Manifest werden beim Bauen aus DIESEM Repo über einen kurzlebigen
# lokalen Webserver (127.0.0.1) geladen. So hängt der Bau nicht davon ab, ob die Domain
# schon erreichbar ist. In der App wird trotzdem die echte Manifest-URL eingetragen.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TWA_MANIFEST="$REPO/android/twa-manifest.json"
ARBEIT="${ANDROID_ARBEITSVERZEICHNIS:-$HOME/seelenstein-android-build}"
BUBBLEWRAP="${BUBBLEWRAP:-npx -y @bubblewrap/cli@1.27.0}"
ALIAS="${SEELENSTEIN_KEY_ALIAS:-seelenstein}"

: "${SEELENSTEIN_KEYSTORE:?SEELENSTEIN_KEYSTORE (Pfad zum Upload-Keystore) fehlt}"
: "${SEELENSTEIN_KEYSTORE_PASSWORT:?SEELENSTEIN_KEYSTORE_PASSWORT fehlt}"
KEYSTORE="$(cd "$(dirname "$SEELENSTEIN_KEYSTORE")" && pwd)/$(basename "$SEELENSTEIN_KEYSTORE")"
[ -f "$KEYSTORE" ] || { echo "Keystore nicht gefunden: $KEYSTORE" >&2; exit 1; }

case "$(cd "$ARBEIT" 2>/dev/null && pwd || echo "$ARBEIT")/" in
  "$REPO"/*) echo "ANDROID_ARBEITSVERZEICHNIS darf nicht im Repo liegen." >&2; exit 1 ;;
esac

PROJEKT="$ARBEIT/projekt"
AUSGABE="$ARBEIT/ausgabe"
mkdir -p "$PROJEKT" "$AUSGABE"

# --- 1. Kurzlebiger lokaler Webserver für Icons + Manifest aus dem Repo ---------------------
PORT_DATEI="$(mktemp)"
node -e '
const http = require("http"), fs = require("fs"), path = require("path");
const wurzel = process.argv[1], portDatei = process.argv[2];
const typen = { ".png": "image/png", ".webmanifest": "application/manifest+json", ".json": "application/json" };
const s = http.createServer((req, res) => {
  const p = path.normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^(\.\.[\/\\])+/, "");
  const datei = path.join(wurzel, p);
  if (!datei.startsWith(wurzel) || !fs.existsSync(datei) || !fs.statSync(datei).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": typen[path.extname(datei)] || "application/octet-stream" });
  fs.createReadStream(datei).pipe(res);
});
s.listen(0, "127.0.0.1", () => fs.writeFileSync(portDatei, String(s.address().port)));
' "$REPO" "$PORT_DATEI" &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true; rm -f "$PORT_DATEI"' EXIT
for _ in $(seq 1 50); do [ -s "$PORT_DATEI" ] && break; sleep 0.1; done
PORT="$(cat "$PORT_DATEI")"
LOKAL="http://127.0.0.1:$PORT"

# --- 2. Bau-Kopie des twa-manifest.json (lokale Quellen, Keystore-Pfad) ---------------------
ECHTE_MANIFEST_URL="$(node -e 'const m=require(process.argv[1]); process.stdout.write(m.webManifestUrl||"")' "$TWA_MANIFEST")"
node -e '
const fs = require("fs");
const [quelle, ziel, lokal, keystore, alias] = process.argv.slice(1);
const m = JSON.parse(fs.readFileSync(quelle, "utf8"));
const nachLokal = (url) => url && (lokal + "/" + url.replace(/^https?:\/\/[^/]+\/(claude\/)?/, ""));
m.iconUrl = nachLokal(m.iconUrl);
m.maskableIconUrl = nachLokal(m.maskableIconUrl);
if (m.monochromeIconUrl) m.monochromeIconUrl = nachLokal(m.monochromeIconUrl);
if (m.webManifestUrl) m.webManifestUrl = nachLokal(m.webManifestUrl);
m.signingKey = { path: keystore, alias };
fs.writeFileSync(ziel, JSON.stringify(m, null, 2) + "\n");
' "$TWA_MANIFEST" "$PROJEKT/twa-manifest.json" "$LOKAL" "$KEYSTORE" "$ALIAS"

cd "$PROJEKT"

# --- 3. Gradle-Projekt erzeugen ------------------------------------------------------------
$BUBBLEWRAP update --skipVersionUpgrade --manifest="$PROJEKT/twa-manifest.json" </dev/null

# In der App soll die echte Manifest-URL stehen, nicht die lokale Bau-Adresse.
if [ -n "$ECHTE_MANIFEST_URL" ]; then
  sed -i.bak "s#resValue \"string\", \"webManifestUrl\", '[^']*'#resValue \"string\", \"webManifestUrl\", '$ECHTE_MANIFEST_URL'#" app/build.gradle
  rm -f app/build.gradle.bak
fi
if grep -q "127.0.0.1" app/build.gradle app/src/main/AndroidManifest.xml; then
  echo "FEHLER: lokale Bau-Adresse ist im Projekt gelandet." >&2; exit 1
fi

# Google Play verlangt ein aktuelles targetSdk (2026: mindestens 35).
TARGET_SDK="$(grep -Eo 'targetSdkVersion [0-9]+' app/build.gradle | grep -Eo '[0-9]+')"
if [ "${TARGET_SDK:-0}" -lt 35 ]; then
  echo "FEHLER: targetSdkVersion $TARGET_SDK ist zu alt für Google Play (mind. 35). Bubblewrap aktualisieren." >&2
  exit 1
fi

# --- 4. Bauen + signieren ------------------------------------------------------------------
BUBBLEWRAP_KEYSTORE_PASSWORD="$SEELENSTEIN_KEYSTORE_PASSWORT" \
BUBBLEWRAP_KEY_PASSWORD="${SEELENSTEIN_KEY_PASSWORT:-$SEELENSTEIN_KEYSTORE_PASSWORT}" \
  $BUBBLEWRAP build --skipPwaValidation --manifest="$PROJEKT/twa-manifest.json" \
    --signingKeyPath="$KEYSTORE" --signingKeyAlias="$ALIAS" </dev/null

VERSION_NAME="$(node -e 'process.stdout.write(require(process.argv[1]).appVersion)' "$TWA_MANIFEST")"
VERSION_CODE="$(node -e 'process.stdout.write(String(require(process.argv[1]).appVersionCode))' "$TWA_MANIFEST")"
NAME="seelenstein-$VERSION_NAME-$VERSION_CODE"
cp app-release-bundle.aab "$AUSGABE/$NAME.aab"
cp app-release-signed.apk "$AUSGABE/$NAME.apk"

echo
echo "Fertig (targetSdk $TARGET_SDK):"
echo "  Play-Upload:  $AUSGABE/$NAME.aab"
echo "  Test-APK:     $AUSGABE/$NAME.apk"
