# Konten einrichten (Version 7.4)

Damit man sich in Seelenstein registrieren und anmelden kann und die Charaktere auf jedem Gerät
(Handy, PC) gleich sind, braucht das Spiel einen kleinen Server zum Speichern. Dafür nimmt es ein
eigenes, kostenloses **Firebase-Projekt** (Google). Das dauert etwa 5 Minuten und braucht keine
Kreditkarte (Tarif „Spark“).

Solange das nicht eingerichtet ist, läuft alles wie bisher: Die vier Charakterplätze gibt es trotzdem,
sie liegen dann nur auf dem jeweiligen Gerät.

## 1. Projekt anlegen

1. <https://console.firebase.google.com> öffnen und mit einem Google-Konto anmelden.
2. **Projekt erstellen** → Name z. B. `seelenstein` → Google Analytics kann aus bleiben → **Projekt erstellen**.

## 2. Anmeldung mit Passwort einschalten

1. Links **Build → Authentication** → **Jetzt starten**.
2. Reiter **Anmeldemethode** → **E-Mail-Adresse/Passwort** → den ersten Schalter **aktivieren**
   (den zweiten „E-Mail-Link“ aus lassen) → **Speichern**.

Das Spiel macht aus dem Kontonamen intern eine Adresse wie `alper@spieler.seelenstein.app`. Es wird
nie eine Mail verschickt, man muss nichts bestätigen.

## 3. Datenbank anlegen

1. Links **Build → Realtime Database** → **Datenbank erstellen**.
2. Standort **Belgien (europe-west1)** → **Im gesperrten Modus starten** → **Aktivieren**.
3. Reiter **Regeln** → alles ersetzen durch:

```json
{
  "rules": {
    "konten": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

4. **Veröffentlichen**. Damit kann jedes Konto nur seine eigenen Charaktere lesen und schreiben.

## 4. Zugangsdaten holen

1. Oben links das Zahnrad → **Projekteinstellungen** → unten bei „Meine Apps“ auf **`</>` (Web)**.
2. Einen Namen eingeben (z. B. `seelenstein-web`), Hosting **nicht** anhaken → **App registrieren**.
3. Es erscheint ein Block `const firebaseConfig = { ... }`. Davon werden nur zwei Werte gebraucht:
   - `apiKey` (fängt mit `AIza` an)
   - `databaseURL` (z. B. `https://seelenstein-xxxx-default-rtdb.europe-west1.firebasedatabase.app`)

   Fehlt `databaseURL` im Block, steht die Adresse auch oben auf der Seite **Realtime Database**.

Der `apiKey` ist kein Geheimnis – er steht bei jeder Firebase-Webseite offen im Code. Geschützt wird
alles durch die Regeln aus Schritt 3.

## 5. Ins Spiel eintragen

In `js/konto-config.js` die Zeile `const CLOUD_CONFIG = null;` ersetzen durch:

```js
const CLOUD_CONFIG = {
  apiKey: 'AIza...',
  databaseURL: 'https://seelenstein-xxxx-default-rtdb.europe-west1.firebasedatabase.app'
};
```

Danach erscheint auf dem Startbildschirm das Feld **Konto** mit „Anmelden“ und „Registrieren“.

## Optional: Schlüssel absichern

In der Google Cloud Console (**APIs & Dienste → Anmeldedaten** → den „Browser key“ des Projekts)
kann man unter **Websitebeschränkungen** `https://guendogdualper-coder.github.io/*` eintragen. Dann
funktioniert der Schlüssel nur noch auf der Spielseite.

## Was gespeichert wird

- Unter `konten/<Konto-ID>`: die vier Charakterplätze (als Text), welcher zuletzt gespielt wurde,
  welches Gerät welchen Charakter zuletzt übernommen hat (zufällige Kennung) und die Zeit des letzten
  Abgleichs.
- Passwörter speichert nur Firebase selbst (verschlüsselt); das Spiel merkt sich auf dem Gerät nur
  einen Anmeldeschlüssel, damit man angemeldet bleibt.

## Wie der Abgleich funktioniert

- Beim Start (angemeldet) und nach dem Anmelden holt das Spiel die Charaktere vom Konto.
- Beim Spielen wird höchstens alle 15 Sekunden hochgeladen, dazu sofort, wenn die App in den
  Hintergrund geht oder man „Charakter wechseln“ drückt.
- Wer einen Charakter startet, übernimmt ihn für sein Gerät. Ist derselbe Charakter auf einem anderen
  Gerät noch offen, merkt das Gerät es beim nächsten Abgleich (spätestens beim Zurückkehren in die App),
  speichert nicht mehr und lädt den neueren Stand. Ein vergessenes, offenes Spiel überschreibt also keinen
  neueren Fortschritt.
- Erste Anmeldung auf einem Gerät: Alle Charaktere, die schon auf dem Gerät sind, kommen mit ins Konto –
  auf freie Plätze, ohne einen Charakter im Konto zu überschreiben. Gleicher Name und gleiche Klasse gelten
  als derselbe Charakter (der weitere Stand bleibt). Ist kein Platz frei, wartet der Charakter auf dem Gerät
  und kommt dazu, sobald einer frei wird.
- Gelöschte Charaktere werden auch auf den anderen Geräten gelöscht.
- Beim Abmelden werden die Charaktere vom Gerät entfernt (sie bleiben im Konto).

## Post, Auktionshaus und Konto-Lager (seit 13.63)

Briefe, Auktionen und das gemeinsame Lager eines Kontos liegen ebenfalls in der Realtime Database. Damit das
funktioniert, müssen die **Regeln** erweitert werden (sonst meldet das Spiel „Der Server hat abgelehnt …“):

1. Firebase-Konsole → **Build → Realtime Database** → Reiter **Regeln**.
2. Alles ersetzen durch den folgenden Block (die bisherige Regel für `konten` ist darin enthalten) → **Veröffentlichen**.

```json
{
  "rules": {
    "konten": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "lager": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid",
        ".validate": "!newData.exists() || (newData.child('items').isString() && newData.child('items').val().length <= 400000)"
      }
    },
    "namen": {
      ".read": "auth != null",
      "$name": {
        ".write": "auth != null && (!data.exists() || data.child('uid').val() === auth.uid) && (!newData.exists() || newData.child('uid').val() === auth.uid)",
        ".validate": "!newData.exists() || (newData.child('uid').isString() && newData.child('name').isString() && newData.child('name').val().length <= 14)"
      }
    },
    "post": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid",
        "$id": {
          ".write": "auth != null && !data.exists() && newData.child('vonUid').val() === auth.uid",
          ".validate": "newData.hasChildren(['an', 'von', 'vonUid', 'at']) && newData.child('text').isString() && newData.child('text').val().length <= 500 && newData.child('betreff').isString() && newData.child('betreff').val().length <= 40 && newData.child('gold').isNumber() && newData.child('gold').val() >= 0 && (!newData.child('ware').exists() || (newData.child('ware').isString() && newData.child('ware').val().length <= 20000))"
        }
      }
    },
    "auktion": {
      ".read": "auth != null",
      "$id": {
        ".write": "auth != null && ((!data.exists() && newData.child('uid').val() === auth.uid && newData.child('at').val() <= now + 60000 && newData.child('ende').val() <= now + 172860000 && !newData.child('kaeufer').exists()) || (data.exists() && !newData.exists() && data.child('kaeufer').exists() && (data.child('kaeufer/uid').val() === auth.uid || (data.child('uid').val() === auth.uid && data.child('kaeufer/at').val() < now - 3600000))) || (data.exists() && newData.exists() && !data.child('kaeufer').exists() && newData.child('kaeufer/uid').val() === auth.uid && newData.child('uid').val() === data.child('uid').val() && newData.child('von').val() === data.child('von').val() && newData.child('ware').val() === data.child('ware').val() && newData.child('preis').val() === data.child('preis').val() && newData.child('ende').val() === data.child('ende').val()))",
        ".validate": "newData.hasChildren(['uid', 'von', 'ware', 'preis', 'at', 'ende']) && newData.child('ware').isString() && newData.child('ware').val().length <= 5000 && newData.child('preis').isNumber() && newData.child('preis').val() >= 1 && newData.child('preis').val() <= 999999999 && newData.child('ende').val() <= newData.child('at').val() + 172800000",
        "kaeufer": {
          ".validate": "newData.hasChildren(['uid', 'art', 'at']) && ((newData.child('art').val() === 'kauf' && now < data.parent().child('ende').val() && data.parent().child('uid').val() !== auth.uid) || (newData.child('art').val() === 'abbruch' && data.parent().child('uid').val() === auth.uid) || (newData.child('art').val() === 'ablauf' && now >= data.parent().child('ende').val()))"
        }
      }
    }
  }
}
```

Was die Regeln sicherstellen:

- `konten/<uid>` und `lager/<uid>`: nur das eigene Konto liest und schreibt.
- `namen/<name>`: Jeder Charaktername gehört dem ersten Konto, das ihn anmeldet (zum Adressieren von Briefen).
  Lesen dürfen alle angemeldeten Spieler.
- `post/<uid>`: Nur der Empfänger liest, ändert (gelesen, abgeholt) und löscht seine Briefe. Andere dürfen dort nur
  **neue** Briefe anlegen, und nur mit ihrer eigenen Konto-Kennung als Absender.
- `auktion/<id>`: Alle angemeldeten Spieler sehen die Angebote. Einstellen nur im eigenen Namen (höchstens 48 Stunden).
  Ein Angebot kann genau einmal „übernommen“ werden (Kauf vor Ablauf, Abbruch nur durch den Verkäufer, Ablauf erst
  nach dem Ende) – ein zweiter Käufer wird vom Server abgewiesen, auch wenn sein Spiel den ETag-Abgleich nicht hätte.
  Löschen darf nur, wer übernommen hat (bzw. nach einer Stunde der Verkäufer, falls die Abrechnung hängt).

### So funktioniert es im Spiel

- **Post** (Postmeisterin in jeder Stadt und jedem Lager): Briefe an einen Charakternamen mit Text, Gold und bis zu
  sechs Sachen. Porto 10 Gold. Gold und Sachen werden erst gespeichert abgezogen, wenn der Server den Brief bestätigt
  hat; sonst bekommt man alles zurück. Abholen schreibt den Brief bedingt (ETag) ohne Anhänge zurück – so kann
  niemand Anhänge doppelt abholen, auch nicht auf zwei Geräten gleichzeitig.
- **Auktionshaus** (Auktionator in jeder Stadt und jedem Lager): Sofortkauf mit 12, 24 oder 48 Stunden Laufzeit,
  Einstellgebühr 1/2/3 % (mindestens 5 Gold), höchstens 20 Angebote je Konto. Gekauftes kommt per Post zum Käufer,
  der Erlös per Post zum Verkäufer; abgebrochene und abgelaufene Angebote kommen per Post zurück.
- **Konto-Lager**: Zugang kauft jeder Charakter einzeln (1.000 Gold), der Inhalt gehört dem ganzen Konto. Ohne Konto
  gehört er allen Charakterplätzen auf dem Gerät. Alte Lager einzelner Charaktere wandern beim nächsten Spielen
  automatisch ins gemeinsame Lager (nichts geht verloren; passt es nicht, gibt es zusätzliche Seiten zum Herausnehmen).
- Ohne Konto zeigen Post und Auktionshaus nur den Hinweis „nur mit Konto“.

### Grenzen

Die ganze Spiellogik läuft im Browser. Die Regeln verhindern doppelte Käufe, fremde Briefkästen und das Überschreiben
fremder Angebote, aber nicht, dass jemand mit einem manipulierten Spiel Gold oder Gegenstände „aus dem Nichts“ in einen
Brief oder ein Angebot schreibt (das gilt genauso für die Spielstände selbst). Echter Betrugsschutz bräuchte einen
eigenen Server, der Gold und Gegenstände verwaltet.
