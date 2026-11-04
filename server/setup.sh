#!/usr/bin/env bash
# Seelenstein – Einrichtung des eigenen Spielservers (netcup VPS, Debian 13)
# Stufe 1: eigener MQTT-Vermittler (Mosquitto) über sicheres WebSocket (wss://…/mqtt) hinter Caddy mit
# kostenlosem Let's-Encrypt-Zertifikat. Das Spiel nutzt ihn zusätzlich zu den öffentlichen Brokern, um
# Mitspieler zu finden und Daten weiterzuleiten, wenn die direkte Verbindung nicht klappt.
#
# Aufruf als root:  bash setup.sh [hostname]
# Ohne Angabe wird der netcup-Hostname dieses Servers genommen.
set -euo pipefail

HOST="${1:-v2202611449191550868.powersrv.de}"
echo "== Seelenstein-Server wird eingerichtet für: $HOST"

if [ "$(id -u)" -ne 0 ]; then echo "Bitte als root ausführen."; exit 1; fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y mosquitto caddy ufw fail2ban unattended-upgrades curl

# --- Firewall: nur SSH, HTTP (Zertifikat) und HTTPS -----------------------------------------------
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# --- Automatische Sicherheitsupdates, Schutz gegen Passwort-Raten bei SSH ---------------------------
dpkg-reconfigure -f noninteractive unattended-upgrades || true
systemctl enable --now fail2ban

# --- Mosquitto: nur intern (127.0.0.1:9001), WebSocket, anonym (das Spiel nutzt zufällige Themen) ---
cat > /etc/mosquitto/conf.d/seelenstein.conf <<CONF
listener 9001 127.0.0.1
protocol websockets
allow_anonymous true
max_connections 3000
message_size_limit 131072
max_queued_messages 500
CONF
systemctl enable mosquitto
systemctl restart mosquitto

# --- Caddy: HTTPS mit automatischem Zertifikat, /mqtt geht an Mosquitto -----------------------------
cat > /etc/caddy/Caddyfile <<CADDY
$HOST {
	encode gzip
	handle /health {
		respond "ok" 200
	}
	handle /mqtt* {
		reverse_proxy 127.0.0.1:9001
	}
	handle {
		respond "Seelenstein-Server" 200
	}
}
CADDY

# Hauptdomain (z. B. seelenstein.online): liefert das Spiel unter der eigenen Adresse aus. Caddy holt die Seiten
# von GitHub Pages (immer die aktuelle Version), oben im Browser steht aber seelenstein.online.
# www.… leitet auf die Hauptdomain weiter. Spielstände der alten Adresse zieht js/umzug.js mit um.
PAGES_HOST="guendogdualper-coder.github.io"
PAGES_PATH="/claude"
case "$HOST" in
  server.*)
    MAIN="${HOST#server.}"
    cat >> /etc/caddy/Caddyfile <<CADDY

$MAIN {
	encode gzip
	rewrite * $PAGES_PATH{uri}
	reverse_proxy https://$PAGES_HOST {
		# fester Host ohne :443, damit GitHub Pages die Seite sicher erkennt (seit 13.77)
		header_up Host $PAGES_HOST
		header_down Location https://$PAGES_HOST$PAGES_PATH https://$MAIN
	}
}

www.$MAIN {
	redir https://$MAIN{uri} 301
}
CADDY
    ;;
esac
systemctl enable caddy
systemctl restart caddy

echo "== Warte auf das Zertifikat …"
for i in $(seq 1 30); do
  if curl -fsS "https://$HOST/health" >/dev/null 2>&1; then
    echo "== FERTIG: https://$HOST/health antwortet. Spiel-Vermittler: wss://$HOST/mqtt"
    exit 0
  fi
  sleep 4
done
echo "== Zertifikat noch nicht da. Prüfe: journalctl -u caddy --no-pager | tail -30"
exit 1
