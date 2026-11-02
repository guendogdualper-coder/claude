# Eigenen Spielserver einrichten (netcup VPS)

Server: `v2202611449191550868.powersrv.de` (IPv4 159.195.68.235), Debian 13.

**Stufe 1 (jetzt):** Ein eigener MQTT-Vermittler (Mosquitto) läuft über `wss://v2202611449191550868.powersrv.de/mqtt` mit kostenlosem Let's-Encrypt-Zertifikat (Caddy). Das Spiel nutzt ihn zusätzlich zu den öffentlichen Brokern (HiveMQ, EMQX). Das macht Kanäle und Weiterleitung zuverlässiger, auch im Mobilfunknetz.

**Stufe 2 (später):** Die Welt- und Monsterlogik zieht vom Host-Spieler auf den Server. Dann fliegt niemand mehr raus, wenn der Host geht.

## Schritte (einmalig, ca. 5 Minuten)

1. **Mit dem Server verbinden.** Am Handy z. B. mit der App *Termius*: neuer Host, Adresse `159.195.68.235`, Benutzer `root`, Passwort aus der netcup-Mail. Am PC im Terminal: `ssh root@159.195.68.235`.
2. **Passwort sofort ändern**, weil das alte in Screenshots/Chats zu sehen war:
   ```
   passwd
   ```
   Das neue Passwort nirgends teilen, auch nicht im Chat.
3. **Einrichtung starten** (ein Befehl, lädt das Skript aus dem Spiel-Repository):
   ```
   curl -fsSL https://raw.githubusercontent.com/guendogdualper-coder/claude/claude/app-entwicklung-hhewbj/server/setup.sh | bash
   ```
   Am Ende steht `FERTIG: https://…/health antwortet`.
4. Kurz Bescheid geben. Dann wird der Vermittler im Spiel eingetragen und von außen geprüft.

## Was das Skript macht

- System aktualisieren, automatische Sicherheitsupdates
- Firewall (ufw): nur 22 (SSH), 80 und 443
- fail2ban gegen Passwort-Raten bei SSH
- Mosquitto nur intern auf 127.0.0.1:9001 (WebSocket)
- Caddy als HTTPS-Tür davor: `/mqtt` → Mosquitto, `/health` → „ok“

## Prüfen

- Im Browser: `https://v2202611449191550868.powersrv.de/health` → „ok“
- Auf dem Server: `systemctl status mosquitto caddy`
