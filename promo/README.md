# Wateroo Werbevideo

`wateroo-promo.mp4`: 10 Sekunden, Hochformat 1080×1920, 30 fps. Ohne Stimme,
nur mit Geräuschen. Passt für Instagram Reels, TikTok, YouTube Shorts und den
WhatsApp-Status.

| Zeit | Bild | Ton |
|---|---|---|
| 0–2 s | Seda am Tisch, Handy vibriert, Benachrichtigung „Seda, time for a sip!" | Vibration, Benachrichtigungston |
| 2–5,4 s | Sie greift zum Glas und trinkt | Glas-Klirren, vier Schlucke, kleines Funkeln |
| 5,4–8,2 s | Kreis-Übergang in die App: +500 ml, das Glas füllt sich, Liebesbotschaft #1 | Whoosh, Tippen, aufsteigende Blubberblasen, Erfolgston |
| 8,2–10 s | Logo, „Your thirsty little buddy.", „Made with ♥ for Seda" | Akkord und Funkeln |

Alles ist selbst gezeichnet und selbst erzeugt: keine fremden Bilder, Videos
oder Sounds.

## Neu erzeugen

```bash
cd promo
python3 sounds.py audio.wav           # Ton (braucht numpy)
node render.js frames 30              # 300 Bilder (braucht Playwright + Chromium)
ffmpeg -framerate 30 -i frames/%04d.png -i audio.wav \
  -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k \
  -shortest -movflags +faststart wateroo-promo.mp4
```

- `scene.html`: die Animation. `render(t)` zeichnet das Bild zur Sekunde `t`.
  Texte wie die Benachrichtigung oder die Liebesbotschaft stehen direkt darin.
- `sounds.py`: die Geräusche, mit den Zeitpunkten oben in der Datei.
- `render.js`: speichert die Bilder. Mit `node render.js vorschau 30 1.2,4.0,7.9`
  werden nur einzelne Zeitpunkte zur Kontrolle erzeugt.
