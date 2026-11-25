#!/usr/bin/env bash
# Seelenstein – nur die Adress-Einstellung von Caddy erneuern (seit 13.77), ohne Systemupdates.
# Danach liefert seelenstein.online das Spiel selbst aus (Seiten kommen von GitHub Pages), oben im Browser
# steht seelenstein.online statt guendogdualper-coder.github.io.
#
# Aufruf als root:  bash domain.sh            (Standard: seelenstein.online)
#                   bash domain.sh andere-domain.de
set -euo pipefail

MAIN="${1:-seelenstein.online}"
HOST="server.$MAIN"
PAGES_HOST="guendogdualper-coder.github.io"
PAGES_PATH="/claude"
FILE=/etc/caddy/Caddyfile

if [ "$(id -u)" -ne 0 ]; then echo "Bitte als root ausführen."; exit 1; fi
if ! command -v caddy >/dev/null 2>&1; then echo "Caddy fehlt – bitte zuerst setup.sh ausführen."; exit 1; fi

[ -f "$FILE" ] && cp "$FILE" "$FILE.vorher-$(date +%Y%m%d-%H%M%S)"

cat > "$FILE" <<CADDY
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

$MAIN {
	encode gzip
	rewrite * $PAGES_PATH{uri}
	reverse_proxy https://$PAGES_HOST {
		header_up Host $PAGES_HOST
		header_down Location https://$PAGES_HOST$PAGES_PATH https://$MAIN
	}
}

www.$MAIN {
	redir https://$MAIN{uri} 301
}
CADDY

if ! caddy validate --config "$FILE" --adapter caddyfile >/dev/null 2>&1; then
  echo "== Einstellung fehlerhaft, alte wird wiederhergestellt:"
  caddy validate --config "$FILE" --adapter caddyfile || true
  last=$(ls -t "$FILE".vorher-* 2>/dev/null | head -1)
  [ -n "$last" ] && cp "$last" "$FILE"
  exit 1
fi

systemctl reload caddy || systemctl restart caddy

echo "== Prüfe https://$MAIN …"
for i in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "https://$MAIN/manifest.webmanifest" || true)
  if [ "$code" = "200" ]; then
    echo "== FERTIG: https://$MAIN zeigt jetzt das Spiel unter der eigenen Adresse."
    exit 0
  fi
  sleep 3
done
echo "== Noch nicht erreichbar (zuletzt HTTP $code). Prüfe: journalctl -u caddy --no-pager | tail -30"
exit 1
