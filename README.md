# Pixelschlange

Snake im Stil alter Handy-Displays, als Web-App für Handy und PC. Keine Abhängigkeiten, kein Build-Schritt.

## Spielen

- **Tastatur:** Pfeiltasten oder WASD steuern, Leertaste oder Enter startet und pausiert, Esc pausiert.
- **Handy:** Übers Spielfeld wischen oder das Steuerkreuz benutzen, die OK-Taste startet und pausiert.
- Jedes Futter macht die Schlange länger und schneller. Jedes fünfte Futter lockt einen Käfer, der Extrapunkte bringt, solange der Balken am unteren Rand läuft.
- **Mit Wänden:** Der Rand ist tödlich. **Ohne Wände:** Die Schlange kommt auf der anderen Seite wieder heraus.
- Der Rekord wird pro Spielfeld-Variante im Browser gespeichert.

## Lokal starten

```sh
python3 -m http.server 8000
```

Dann <http://localhost:8000> öffnen. Über HTTP(S) ausgeliefert lässt sich das Spiel im Browser als App installieren („Zum Startbildschirm hinzufügen“) und läuft danach auch offline.

## Dateien

| Datei | Inhalt |
| --- | --- |
| `index.html` | Seitenaufbau |
| `style.css` | Gestaltung |
| `game.js` | Spiellogik, Zeichnen, Steuerung |
| `manifest.webmanifest`, `sw.js`, `icon.svg` | Installation als App und Offline-Betrieb |
