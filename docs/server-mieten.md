# Eigener Spielserver für Seelenstein – Anbieter und Kosten

Stand: 01.11.2026. Viele Anbieter haben 2026 die Preise erhöht, teils zweimal (April und Juni). „Brutto“ heißt hier inklusive 19 % MwSt.; Angaben, die nicht direkt auf der Anbieterseite geprüft werden konnten, sind gekennzeichnet.

## Warum überhaupt ein Server?

Heute findet Seelenstein Mitspieler über öffentliche MQTT-Broker (HiveMQ/EMQX) und verbindet sie per WebRTC. Fällt die direkte Verbindung aus, läuft der Verkehr über den Broker (seit 13.2 auch mitten im Spiel, statt die Verbindung zu beenden). Ein Spieler ist jeweils der Host. Verlässt er das Spiel, übernimmt ein anderer.

Ein eigener Server mit WebSocket (`wss://` über Port 443) ändert das grundlegend:

- Kein Spieler ist mehr Host, also fliegt niemand mehr raus, wenn der Host geht.
- Es braucht keine öffentlichen Broker und kein TURN mehr.
- Die Verbindung klappt auch im iPhone-Mobilfunknetz zuverlässig.
- Die Welt läuft durchgehend weiter, z. B. die Boss-Wiederkehr.

## 1. Eigener VPS (Deutschland/EU)

| Anbieter / Tarif | vCPU / RAM / SSD | Traffic | Preis pro Monat |
|---|---|---|---|
| Hetzner CX23 | 2 / 4 GB / 40 GB | 20 TB | 5,99 € netto (≈ 7,13 € brutto), zeitweise nicht bestellbar |
| Hetzner CPX12 | 2 / 2 GB / 40 GB | 20 TB | 11,99 € netto (≈ 14,27 € brutto) |
| Hetzner CPX22 | 2 / 4 GB / 80 GB | 20 TB | 19,99 € netto |
| netcup VPS 500 G12.5 | 2 / 4 GB / 64 GB | inklusive | ca. 9,50 € brutto (12 Monate Laufzeit) |
| IONOS VPS S+ / M+ | 1 / 2 GB bzw. 2 / 4 GB | unbegrenzt | 5 € bzw. 12 € (erste 3 Monate günstiger, 10 € Einrichtung) |
| Strato VPS S | 1 / 2 GB / 60 GB | – | ca. 4 € (nicht selbst geprüft) |
| Contabo Cloud VPS 10 | ca. 4 / 8 GB | – | ca. 4,40–5,50 € (nicht geprüft) |
| OVH VPS-1 | – | – | ca. 9,35 € brutto (nicht geprüft) |
| DigitalOcean Frankfurt | 1 / 1 GB | 1 TB | 6 $ zzgl. Steuer |

## 2. Plattformen ohne eigenen Server-Betrieb

- **Fly.io:** 1-GB-Maschine in Frankfurt ca. 7,73 $. Realistisch 8–15 $ pro Monat.
- **Railway:** Hobby-Plan 5 $ inklusive 5 $ Nutzung. Realistisch 5–15 $ pro Monat.
- **Render:** Starter 7 $ pro Monat. Die Gratis-Stufe schläft ein und taugt daher nicht als Spielserver.
- **Cloudflare Durable Objects:** ab 5 $. Bei etwa 50 aktiven Spielern grob 15–35 $. Dafür müsste der Server für Cloudflare umgebaut werden.
- **Managed TURN** (falls WebRTC bleiben soll):
  - Cloudflare: 0,05 $/GB
  - Twilio: 0,40 $/GB
  - Metered: 99 $ für 150 GB
- **Managed MQTT:** HiveMQ oder EMQX dediziert ab ca. 230–250 $ im Monat. Für dieses Spiel zu teuer.

## 3. Empfehlung

Ein einzelner **VPS in Deutschland mit einem Node.js-WebSocket-Server**:

- Server-Bibliotheken: `ws` oder uWebSockets.js.
- Davor Caddy oder nginx mit kostenlosem Let's-Encrypt-Zertifikat.
- Die Spieldateien bleiben kostenlos auf GitHub Pages. Nur der Spielserver läuft unter z. B. `api.deinedomain.de`.

**Größe und Traffic:**

- 10–200 Spieler schafft ein Rechner mit 2 vCPU und 2–4 GB RAM locker.
- Pro Spieler fallen grob 5 KB/s an. Selbst 200 Spieler rund um die Uhr bleiben unter 3 TB im Monat.

**Konkrete Wahl:**

- netcup VPS 500 (ca. 9,50 €) oder Hetzner CX23 (ca. 7 €, falls bestellbar)
- dazu eine .de-Domain für ca. 5 € pro Jahr

**Gesamtkosten:** etwa **8–15 € pro Monat**.

Ohne Server-Betreuung geht es mit Fly.io oder Railway für etwa 10–15 $ im Monat.

**Umbau im Spiel:**

- Die Monster- und Weltlogik des Hosts zieht auf den Server.
- Clients schicken nur noch ihre Eingaben und Treffer.
- Die heutige Netzschicht (netz.js) bleibt als Fallback erhalten.

## Quellen (abgerufen am 01.11.2026)

- https://www.hetzner.com/cloud/cost-optimized/
- https://www.hetzner.com/cloud/regular-performance/
- https://www.netcup.com/de/server/vps
- https://www.ionos.de/server/vps
- https://www.strato.de/server/guenstige-vserver/
- https://www.digitalocean.com/pricing/droplets
- https://docs.fly.io/about/pricing
- https://railway.com/pricing
- https://developers.cloudflare.com/durable-objects/platform/pricing/
- https://developers.cloudflare.com/realtime/turn/
- https://www.twilio.com/en-us/stun-turn/pricing
- https://www.metered.ca/stun-turn
- https://www.hivemq.com/pricing/
- https://www.emqx.com/en/pricing
- https://www.inwx.de/en/de-domain
