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
- Gelöschte Charaktere werden auch auf den anderen Geräten gelöscht.
- Beim Abmelden werden die Charaktere vom Gerät entfernt (sie bleiben im Konto).
