# Tasche: Seite III und IV über TikTok/Instagram freischalten (seit 14.84)

## Wunsch
Seite I und II der Tasche (je 30 Plätze) hat jeder Charakter. Seite III und IV schaltet frei, wer Seelenstein auf
TikTok **und** Instagram folgt – dann für alle Charaktere des Kontos.

## Umsetzung
- **Datei:** `js/sozial-freischalten.js` (in `index.html` nach `kontolager.js`, in der Liste von `sw.js`).
- **Konfiguration** (ganz oben in der Datei):
  ```js
  const SOZIAL_PROFILE = {
    tiktok: 'https://www.tiktok.com/@seelenstein.online',
    instagram: 'https://www.instagram.com/seelenstein.online/'
  };
  ```
  Erlaubt sind ganze Adressen (`https://…`) oder nur der Name (`'@seelenstein.online'` bzw. `'seelenstein.online'`).
  **Ist einer der beiden Werte leer, ist die Sperre aus** (alle vier Seiten frei, keine Knöpfe – wie vor 14.84).
- **Vertrauen statt Prüfung:** Folgen lässt sich nicht prüfen. Zwei Knöpfe „Auf TikTok folgen“ / „Auf Instagram
  folgen“ öffnen das Profil in einem neuen Tab (`window.open`, als installierte Web-App öffnet das den Browser).
  Jeder Knopf wird beim Antippen gemerkt (Zeitpunkt); sind beide angetippt, sind Seite III und IV frei.
- **Wo gemerkt:** im Gerät (`localStorage` `seelenstein.sozial`) – gilt damit für alle Charakterplätze im Gerät.
  Mit Konto zusätzlich im Konto: Feld `sozial` in `/konten/<uid>` neben `blockiert` (`konto.js` cloudGet/cloudPut,
  Übernahme in `cloudExchange` über `sozialFromCloud`). Beim Abgleich gilt, was Gerät oder Konto schon kennt
  (Vereinigung je Knopf), also frei auf jedem Gerät und für jeden Charakter des Kontos. Die Firebase-Regeln für
  `konten` haben keine Feldprüfung, es ist keine Regeländerung nötig.
- **Store-Apps ohne Sperre** (App-Store-Richtlinien), `sozialStoreApp()`:
  - iPhone/iPad: `window.Capacitor.isNativePlatform()` (wie `nativ.js`), außerdem Start-URL `?quelle=ios`
  - Android (TWA, Google Play): Start-URL `?quelle=play` (`android/twa-manifest.json`) oder Referrer `android-app://`
  - Windows: Electron im User-Agent (Desktop-App/MSIX, wie `optionen.js` `IS_DESKTOP_APP`), Start-URL `?quelle=desktop`,
    oder Microsoft-Store-PWA (`konto.js` `MS_STORE_PWA`)
  - Einmal erkannt, bleibt es für die Sitzung (`sessionStorage`), auch wenn ohne `?quelle` neu geladen wird.
  - Hinweis: Wer im Browser von Hand `?quelle=play` anhängt, hat ebenfalls alle Seiten frei. Das ist bei einer
    Freischaltung auf Vertrauen bewusst hingenommen.

## Regeln für gesperrte Seiten
- Kern in `js/ausruestung.js`: `bagOpenSlots()` (60 bzw. 120), `bagSlotLocked(s)`, `bagFree(p)` (freie Plätze auf
  nutzbaren Seiten), `bagBookStack(p, id, n)` (Bücherstapel nur auf nutzbaren Seiten), `bagCapText(p)` („belegt/60“).
- Neues landet immer auf dem ersten freien Platz; `addToBag` und alle anderen Eingänge löschen ein mitgebrachtes
  `bagPos`, damit nichts auf einen gesperrten Platz fällt.
- Geprüfte Eingänge: Beute (`rollLoot`, Endboss, Höllenthron, Quest-Belohnung, Seltenheit – alle über `addToBag`),
  Händler (`buyGear`), Lehrmeister-Buch (`addBookItem`), Alchemist-Buch (`quests.js`), Lager des Geräts (`takeItem`),
  Konto-Lager (`klTake`), Post/Auktionshaus (`wareRoom`/`wareGive`), Handel zwischen Spielern (`interaktion.js`:
  Platz nur auf Seite I/II, Hergegebenes zählt nur, wenn es auf Seite I/II lag), Bogen-Geschenk (`fernninja.js`),
  Ablegen (`unequip`, Rechtsklick, Ziehen aufs Raster).
- Ist Seite I+II voll, kommen die vorhandenen Meldungen („Deine Tasche ist voll …“, „Kein Platz im Inventar.“,
  „Dein Inventar ist voll. … ist verloren.“).
- Was schon auf III/IV liegt (alte Spielstände): Seite lässt sich öffnen, Teile ansehen, anlegen, verkaufen
  (auch „Mehrere verkaufen“), einlagern und auf einen freien Platz von Seite I/II ziehen. Abgelehnt wird: etwas auf
  III/IV ziehen (Platz oder Reiter) und ein Tausch, der ein Teil von I/II nach III/IV schieben würde.
- Anlegen von III/IV: Das abgelegte alte Teil kommt auf einen freien Platz von Seite I/II; ist dort keiner frei,
  übernimmt es den Platz des angelegten Teils (Anzahl auf III/IV bleibt gleich, sonst ginge Anlegen gar nicht).
- „Sortieren“ räumt von vorn ein; liegen mehr als 60 Teile in der Tasche, bleibt der Rest auf III/IV (nie mehr als
  vorher dort lagen).
- Erzwungene Wege (Ausrüstungsregeln `enforceGearRules`, Rückgabe nach fehlgeschlagener Post/Auktion, Umwandeln alter
  Spielstände) legen weiterhin ohne Prüfung zurück – dort darf nichts verloren gehen.

## Oberfläche
- Reiter III/IV mit kleinem Schloss; auf der gesperrten Seite ein Kasten über dem Raster: „Seite III und IV sind noch
  gesperrt.“ + „Folge uns auf TikTok und Instagram und schalte Seite III und IV frei – für alle deine Charaktere.“
  und die beiden Knöpfe mit selbst gezeichneten Zeichen in Markenfarbe (SVG im Code, keine Logo-Dateien). Angetippte
  Knöpfe bekommen ein grünes ✓. Freie Plätze der gesperrten Seite sind schraffiert mit Schloss und kein Ablageziel.
- Nach beiden Knöpfen: Meldung im Chat „Danke fürs Folgen! …“, die Tasche wird neu gezeichnet.
- Ratgeber: „Warum sind Seite III und IV meiner Tasche gesperrt?“ (Kategorie Ausrüstung, Antwort je nach Zustand).
- Texte deutsch + `js/sprachen/en.js`.

## Tests (Playwright, eigener Port 8794)
Skript: `…/scratchpad/sozial84/test.js`, Screenshots ebendort.
- neuer Charakter: Seite III/IV gesperrt, Hinweis, Zähler 0/60, keine Ablageplätze
- Seite I+II voll: Beute, Buch, Post-Ware, Händler („Deine Tasche ist voll …“), Lager → voll
- alter Stand mit Teilen auf III/IV: sichtbar, auf III/IV ziehen/Tausch abgelehnt, nach I ziehen geht, Anlegen von IV geht
- TikTok-Knopf: richtiges Profil geöffnet, noch gesperrt; Instagram-Knopf: frei; zweiter Charakter im selben Gerät frei
- Konto-Abgleich (`sozialFromCloud`) übernimmt die Freischaltung
- Store-Apps: `?quelle=play` (auch nach Neuladen ohne Parameter), Electron-User-Agent, Capacitor → alles frei
- leere Konfiguration: 120 Plätze, kein Kasten, Zähler 120/120
- Englisch auf dem Handy übersetzt
