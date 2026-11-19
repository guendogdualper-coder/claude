#!/usr/bin/env bash
# Seelenstein – Welt-Wächter installieren (Stufe 2): das Spiel läuft ohne Bildschirm auf dem Server als dauerhafter
# Host je Kanal. Monster, Seelensteine und Bosse laufen weiter, auch wenn niemand online ist; niemand fliegt raus,
# wenn ein Spieler geht. Neue Spielversionen lädt der Wächter von selbst (Prüfung alle 5 Minuten).
#
# Aufruf als root:  bash waechter.sh            (Kanal 1 und 2)
#                   bash waechter.sh "1"        (nur Kanal 1)
set -euo pipefail
CHANNELS="${1:-1 2}"
URL_BASE="https://guendogdualper-coder.github.io/claude/"

if [ "$(id -u)" -ne 0 ]; then echo "Bitte als root ausführen."; exit 1; fi
export DEBIAN_FRONTEND=noninteractive
echo "== Installiere Chromium (Browser ohne Bildschirm) …"
apt-get update -y
apt-get install -y chromium fonts-dejavu-core

id seelenstein >/dev/null 2>&1 || useradd --system --create-home --home-dir /var/lib/seelenstein --shell /usr/sbin/nologin seelenstein
mkdir -p /var/lib/seelenstein && chown seelenstein:seelenstein /var/lib/seelenstein

cat > /etc/systemd/system/seelenstein-waechter@.service <<UNIT
[Unit]
Description=Seelenstein Welt-Waechter Kanal %i
After=network-online.target
Wants=network-online.target

[Service]
User=seelenstein
Environment=HOME=/var/lib/seelenstein
ExecStart=/usr/bin/chromium --headless=new --no-sandbox --disable-gpu --mute-audio --no-first-run --disable-dev-shm-usage --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --enable-logging=stderr --v=0 --user-data-dir=/var/lib/seelenstein/k%i --remote-debugging-address=127.0.0.1 --remote-debugging-port=922%i "${URL_BASE}?waechter=1&kanal=%i"
Restart=always
RestartSec=5
MemoryMax=1200M

[Install]
WantedBy=multi-user.target
UNIT

# jede Nacht um 5 Uhr frisch starten (Speicher aufräumen)
echo "0 5 * * * root systemctl restart 'seelenstein-waechter@*'" > /etc/cron.d/seelenstein-waechter

systemctl daemon-reload
for ch in $CHANNELS; do
  systemctl enable "seelenstein-waechter@$ch"
  systemctl restart "seelenstein-waechter@$ch"
done

echo "== Warte 25 Sekunden auf den Start …"
sleep 25
for ch in $CHANNELS; do
  echo "--- Kanal $ch:"
  systemctl is-active "seelenstein-waechter@$ch" || true
  journalctl -u "seelenstein-waechter@$ch" --no-pager -n 200 | grep -o '\[waechter[^"]*' | tail -3 || true
done
free -h | head -2
echo "== FERTIG: Welt-Wächter laufen. Status: systemctl status 'seelenstein-waechter@*'"
