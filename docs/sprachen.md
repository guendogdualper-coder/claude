# Sprachen (seit 13.9)

## Sprache wählen

- Auf dem Startbildschirm über den Globus oben rechts.
- In den Einstellungen (O) unter „Sprache · Language“.
- Ohne eigene Wahl startet das Spiel auf Deutsch.

## Umfang je Sprache

| Sprache | Umfang |
|---|---|
| Deutsch | Original |
| English | Oberfläche und Inhalte: Fertigkeiten mit Texten, Monster, Gebiete, Gegenstände, Hauptquests, Hilfe |
| Français, Español, Italiano, Polski, Nederlands, Português, Türkçe | Oberfläche und kurze Inhalte (Namen von Fertigkeiten, Monstern, Gebieten, Gegenständen). Lange Texte erscheinen vorerst auf Englisch. |

Die Versionsliste in der Hilfe bleibt in allen Sprachen deutsch.

## So funktioniert es

- `js/sprache.js` lädt das Wörterbuch der gewählten Sprache (`js/sprachen/<code>.js`) noch vor den übrigen Skripten.
- Ein MutationObserver ersetzt jeden angezeigten Text, der genau einem Eintrag entspricht. Das gilt auch für `title`, `aria-label` und `placeholder`.
- Zahlen werden zu Platzhaltern: Aus „Stufe 12“ wird zum Nachschlagen „Stufe {0}“.
- Steht eine Rolle vor einem Namen („Waffenhändler Goro“), wird nur die Rolle übersetzt.
- Texte auf der Zeichenfläche laufen über `trText`. Das betrifft Namen über den Köpfen (`trName` in `zeichnen.js`) und schwebende Hinweise (`addText`).
- Elemente mit der Klasse `no-tr` werden nicht übersetzt.

## Wörterbücher erweitern

1. Neue Texte im Spiel sammeln: Spiel starten, alle Fenster öffnen und die Textknoten auslesen (Skript `sammeln.js` im Arbeitsordner).
2. Die Texte übersetzen. Platzhalter `{0}` müssen dabei erhalten bleiben.
3. Die Einträge in `js/sprachen/<code>.js` ergänzen.
