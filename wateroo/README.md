# Wateroo 💧

*Your thirsty little buddy.* Eine Trink-Erinnerungs-App für iPhone und Android,
gebaut mit Flutter.

- **Glas, das sich füllt:** Jeder Drink (+150 / +250 / +500 ml) füllt das Glas
  bis zum Tagesziel. „Undo" nimmt den letzten Drink zurück.
- **Erinnerungen:** jede Stunde oder alle 15–120 Minuten, nur in den aktiven
  Stunden (z. B. 8–22 Uhr). Optional Pause, sobald das Glas voll ist.
- **Erfolgserlebnis:** XP für jeden Schluck, +50 XP für das volle Glas, Level
  von „Tiny Drop" bis „Wateroo Legend", Tagesserien und 6 Abzeichen.
- **Onboarding** in 4 Schritten: Willkommen, Tagesziel, Erinnerungen, Fertig.

## Für Seda

Diese Wateroo-Version ist persönlich für Seda gemacht: Begrüßung mit ihrem
Namen, persönliche Erinnerungen und 10 Liebesbotschaften. An jedem Tag, an dem
ihr Glas voll wird, schaltet sich die nächste frei. Gesammelt stehen sie unter
Rewards → „Notes for Seda".

Name und Texte stehen alle in **`lib/personal.dart`** und lassen sich dort
ändern.

## Starten

Voraussetzung: [Flutter](https://docs.flutter.dev/get-started/install) 3.50 oder neuer.

```bash
cd wateroo
flutter pub get
flutter run            # auf angeschlossenem Handy oder Emulator
flutter test           # alle Tests
```

Für das iPhone brauchst du einen Mac mit Xcode, für Android das Android SDK
(z. B. über Android Studio).

## Aufbau

| Ordner | Inhalt |
|---|---|
| `lib/logic/` | Reine Logik ohne UI: Level, Serien, Abzeichen, Erinnerungszeiten |
| `lib/state/app_state.dart` | App-Zustand und Speicherung auf dem Gerät |
| `lib/services/notification_service.dart` | Plant die Erinnerungen als lokale Benachrichtigungen |
| `lib/personal.dart` | Name und Liebesbotschaften für Seda |
| `lib/ui/` | Theme, das animierte Glas und die Screens |
| `test/` | Tests für Logik, Zustand und den kompletten Ablauf |

## Wie die Erinnerungen funktionieren

Wateroo plant die Benachrichtigungen für heute und die nächsten zwei Tage
(höchstens 60, weil iOS nicht mehr gleichzeitig erlaubt). Bei jedem Öffnen der
App wird neu geplant. Wer die App drei Tage lang nicht öffnet, bekommt danach
keine Erinnerungen mehr, bis er sie wieder öffnet.

Alle Daten bleiben auf dem Gerät. Es gibt kein Konto und keinen Server.

## Noch offen

- Homescreen-Widgets (brauchen nativen Code: WidgetKit für iOS, App Widget für Android)
- Echtes App-Icon und Startbildschirm im Wateroo-Design
- Bundle-ID `com.wateroo.wateroo` vor der Veröffentlichung auf die eigene ändern

## Web-Version

`flutter build web --wasm` baut die schnelle WebAssembly-Version (skwasm).
Browser ohne WebAssembly-GC bekommen automatisch die JavaScript-Version.

Schriften: Inter und Space Grotesk, beide unter der SIL Open Font License
(`assets/fonts/OFL-*.txt`). Für schnelleres Zeichnen sind nur die genutzten
Stärken als feste Varianten eingebunden (erzeugt mit fontTools
`varLib.instancer`).
