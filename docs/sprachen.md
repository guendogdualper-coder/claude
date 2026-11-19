# Sprachen (seit 13.9, erweitert 15.46)

## Sprache wählen

- Auf dem Titelbildschirm über „Sprache · Language“, auf dem Startbildschirm über den Globus oben rechts.
- In den Einstellungen (O) unter „Sprache · Language“.
- Ohne eigene Wahl (seit 15.46) nimmt das Spiel die erste Sprache aus den Spracheinstellungen des Geräts
  (`navigator.languages`), die es gibt. Deutsche Geräte bleiben deutsch, alle anderen ohne passende Sprache bekommen Englisch.
  „in“ (alte Kennung) zählt als Indonesisch, „zh-TW/zh-HK“ bekommen 简体中文.
- Die Namen in `LANGS` (`js/sprache.js`) stehen in der eigenen Schrift der Sprache; Titel, Startbildschirm und
  Einstellungen bauen ihre Listen daraus, neue Sprachen erscheinen dort von selbst.

## Umfang je Sprache

Stand 15.46 (Einträge im Wörterbuch; „fehlt“ laut `pruefen.js` über alle gesammelten Texte: 0 in jeder Sprache):

| Sprache | Code | Einträge | Umfang |
|---|---|---|---|
| Deutsch | de | – | Original |
| English | en | 6195 | alles: Oberfläche, Fertigkeiten mit Texten, Monster, Gebiete, Gegenstände, Quests, Instanzen, Turm, Arena, Sets, Endgame Stufe 80, Einführung, Hilfe |
| Français, Español, Italiano, Polski, Nederlands, Português, Türkçe | fr es it pl nl pt tr | 4979–4990 | Oberfläche und alle kurzen Texte bis 100 Zeichen (Namen, Knöpfe, Meldungen, Infofelder). Längere Texte erscheinen auf Englisch. |
| Bahasa Indonesia, Русский, Tiếng Việt, 简体中文, 日本語, 한국어 | id ru vi zh ja ko | 4582–4583 | wie die Zeile darüber (seit 15.46). Weniger Einträge, weil die älteren Wörterbücher noch Schlüssel früherer Versionen enthalten. |

Nicht übersetzt werden: die Versionsliste in der Hilfe, das Wissen der Ratgeberin (`.rg-list`, nur deutsch), Namen von
Spielern und Eigennamen von NPCs (Vornamen bleiben, Rollen wie „Waffenhändler“ werden übersetzt; in 简体中文/日本語/한국어
und Русский sind die Namen der Dorfbewohner umschrieben).
Meldungen, die mit einem Namen beginnen („Goro hat die Gruppe verlassen.“), übersetzt das Spiel seit 15.46 (siehe unten);
Namen mitten im Satz bleiben weiter teilweise deutsch.

## Schrift

- Chinesisch, Japanisch, Koreanisch: Systemschriften der Geräte (PingFang, Microsoft YaHei, Hiragino, Yu Gothic, Malgun
  Gothic, Noto CJK …), kein Download. Für Fenster in `css/style.css` (`:root:lang(..)` setzt `--font-body`/`--font-display`),
  für die Zeichenfläche (Namen über Köpfen, schwebende Texte, 3D-Beschriftungen) in `js/sprache.js`: der Setter von
  `ctx.font` fügt dieselben Schriften vor `sans-serif`/`serif` ein (`I18N_FONTS`).
- Vietnamesisch: Alegreya Sans und Marcellus SC haben die Zeichen mit zwei Akzenten (ế, ữ …) nicht – Fenster und
  Zeichenfläche nehmen Systemschriften (Segoe UI, Roboto, Arial …).
- `<html lang>` ist der Sprachcode (Chinesisch `zh-CN`), damit Browser die richtige Schriftform der Zeichen wählen.
  Die Knöpfe der Sprachliste tragen ihr eigenes `lang`.
- Lange Wörter (Russisch, Indonesisch, Vietnamesisch, Koreanisch) dürfen umbrechen, wenn sie sonst überlaufen würden
  (`overflow-wrap: break-word`, nicht `anywhere` – sonst zerfallen schmale Reiter wie „Гильдия“), Koreanisch bricht
  zwischen Wörtern um (`word-break: keep-all`). Russische und indonesische Feldbeschriftungen im Inventar stehen ohne Großbuchstaben.
- Satzzeichen am Ende („!“, „.“, „?“, „:“), die das Spiel von einem Schlüssel abtrennt, werden nach chinesischem oder
  japanischem Text in volle Breite gesetzt („胜利！“).

## So funktioniert es

- `js/sprache.js` lädt das Wörterbuch der gewählten Sprache (`js/sprachen/<code>.js`) noch vor den übrigen Skripten,
  bei allen Sprachen außer Englisch zusätzlich `en.js` als Rückfall für fehlende Einträge.
- Ein MutationObserver ersetzt jeden angezeigten Text, der einem Eintrag entspricht. Das gilt auch für `title`, `aria-label` und `placeholder`.
- Reihenfolge (seit 15.46): erst das eigene Wörterbuch mit allen Regeln unten, dann Zeilen mit „ · “ Teil für Teil im
  eigenen Wörterbuch, erst danach Englisch. So gewinnt nie ein englischer Eintrag mit Satzzeichen („Sieg!“) gegen den
  eigenen ohne („Sieg“).
- Zahlen werden zu Platzhaltern: Aus „Stufe 12“ wird zum Nachschlagen „Stufe {0}“. Ohne passenden Eintrag wird ein Wort
  vor einer Zahl allein übersetzt („Stufe 1/15“) – seit 15.46 nur, wenn hinter der Zahl kein Text mehr folgt.
- Zeichen am Rand gehören nicht zum Schlüssel: „· Lauftempo“, „(Dungeon)“, „📍 Sonnenwiesen“, „Tasche sortiert.“ finden
  „Lauftempo“, „Dungeon“, „Sonnenwiesen“, „Tasche sortiert“ (alle Zeichen, die weder Buchstabe noch Ziffer sind).
- „Name (Zusatz)“ wird in zwei Teilen übersetzt, wenn es beide Einträge gibt („Rotfuchs (Stufe 5)“ → „Red Fox (Level 5)“).
- „Bezeichnung: Text“ wird in zwei Teilen übersetzt, wenn es beide Einträge gibt („Tipp: Mit zwei Fingern …“ im
  Ladebild, „Ziel: Wilder Hund“; seit 15.46).
- Zeilen mit „ · “ werden Teil für Teil übersetzt („Dolch · Ninja · Selten · ab Stufe 15“); Teile ohne Eintrag, die
  auch Englisch nicht kennt (Ortsnamen), bleiben stehen.
- Steht eine Rolle vor einem Namen („Waffenhändler Goro“), wird nur die Rolle übersetzt – seit 15.46 nur, wenn danach
  wirklich ein Name steht (ein oder zwei großgeschriebene Wörter), damit „Keine Ausrüstung in der Tasche“ nicht zu
  „None Ausrüstung …“ wird.
- Steht ein Name vor einer Meldung („Goro hat die Gruppe verlassen.“, „Höllenhund taumelt – jetzt angreifen!“), bleibt
  der Name (Monsternamen werden übersetzt) und der Rest wird nachgeschlagen (seit 15.46). Wörter wie „Du“, „Der“, „Keine“
  gelten nicht als Name (`I18N_NOT_NAME`).
- Texte auf der Zeichenfläche laufen über `trText`. Das betrifft Namen über den Köpfen (`trName` in `zeichnen.js`) und schwebende Hinweise (`addText`).
- Elemente mit der Klasse `no-tr` werden nicht übersetzt.

## Abdeckung prüfen und Wörterbücher erweitern

Die Werkzeuge liegen in `tools/sprachen/` (Aufruf dort: `cd tools/sprachen`). Zwischenergebnisse landen in
`tools/sprachen/daten/` und `tools/sprachen/ue/` (nicht im Repo; vorher `mkdir -p daten ue`):

| Skript | Aufgabe |
|---|---|
| `sammeln.js [port]` | startet das Spiel (Playwright, `python3 -m http.server <port>` im Repo), spielt alle Klassen und Wege, öffnet alle Fenster und Reiter, spricht alle NPCs an, rendert Infofelder von Gegenständen und Fertigkeiten und liest alle Datentabellen → `daten/laufzeit.json`, `daten/daten.json` (dauert 5–8 Minuten) |
| `statisch.js` | sucht deutsche Zeichenketten in `js/` und `index.html` (Meldungen, die selten erscheinen), auch den Rest von „${name} hat …“ → `daten/statisch.json` |
| `vorlagen.js` | Vorlagen mit Zahlen („… ab Stufe ${GF.level} …“, Ladebild-Tipps): Zahl-Ausdrücke werden zu „7“ → `daten/vorlagen.json` |
| `nachtrag-bauen.js <txt…>` | macht aus Textlisten anderer Helfer (`neue-texte-*.txt`) `daten/nachtrag.json` (ohne Überschriften, Erklärzeilen und Ratgeber-Abschnitte) |
| `pruefen.js` | schlägt jeden gesammelten Text mit derselben Logik wie das Spiel (`trOne` aus `sprache.js`) im eigenen Wörterbuch nach → Bericht je Sprache, `daten/fehlt-<code>.json`; liest `laufzeit`, `daten`, `statisch`, `vorlagen`, `nachtrag`, `alt` |
| `block.js <code> [von] [anzahl] [--kurz\|--lang]` | Arbeitsliste einer Sprache: `id <TAB> deutsch <TAB> englisch` |
| `master.js <codes> [von] [anzahl]` | gemeinsame Arbeitsliste mehrerer Sprachen (Vereinigung der fehlenden Schlüssel, ohne Muster-Einträge) |
| `einfuegen.js <code> <datei…>` | schreibt Übersetzungen (`id <TAB> Text` oder `+Schlüssel <TAB> Text`) ins Wörterbuch, prüft die Platzhalter; `=` heißt „nie übersetzen“ (→ `ignorieren.txt`), `==` heißt „in dieser Sprache gleich“ |
| `spalten.js <datei>` | mehrsprachige Datei (`#spalten fr es …`, je Zeile `id <TAB> fr <TAB> es …`, `-` = nichts) aufteilen und einfügen |
| `muster.js <code>` | zusammengesetzte Einträge aus Mustern („Fertigkeit: X“, „Endboss: X“, „X besiegen“ …, `muster-texte.js`) und den schon übersetzten Namen → `ue/<code>-muster.tsv` |
| `e80.js` | Namen der zwölf Prägungen der Stufe-80-Ausrüstung („Splitterschwert“) aus den „Ewigkeits…“-Einträgen aller Sprachen → `ue/<code>-e80.tsv` |
| `alt-check.js <code>` / `altlauf.js <code>` | Schlüssel, die die älteren Sprachen haben und die eine neue Sprache (noch) nicht übersetzt |
| `trtest.js <code> "Text" …` | einen Text so übersetzen wie das Spiel (eigenes Wörterbuch zuerst, dann Englisch) |
| `ladetest.js <port> [codes…]` | lädt jede Sprache einmal (ohne Bilder): Seitenfehler, `html lang`, Schrift in Fenstern und auf der Zeichenfläche |
| `bilder.js <port> <b> <h> <tag> <codes…>` | Bilder je Sprache: Titel, Sprachliste, Startbildschirm, HUD, Inventar, Charakter, Schmied, Einstellungen |

Ablauf für neue Texte:

1. `node statisch.js`, `node vorlagen.js` und `node sammeln.js 8821` (Server auf Port 8821), danach `node pruefen.js`.
2. Englisch zuerst: `node block.js en 0 300`, Übersetzungen in eine Datei schreiben, `node einfuegen.js en datei.tsv`.
3. Danach alle anderen Sprachen gemeinsam: `node master.js fr,zh 0 200` (zeigt Deutsch und Englisch), eine Datei mit
   `#spalten fr es it pl nl pt tr id ru vi zh ja ko` schreiben, `node spalten.js datei.tsv`. Danach je Sprache
   `node muster.js <code>` und `node einfuegen.js <code> ue/<code>-muster.tsv` für die zusammengesetzten Einträge.
4. `node pruefen.js` muss für jede Sprache „fehlt: 0“ melden; jede Datei mit `node --check` prüfen.

Nachtrag aus einer Textliste (z. B. neue Texte eines Updates): entweder die Listen der Helfer mit
`node nachtrag-bauen.js ../neue-texte-*.txt` umwandeln oder selbst ein JSON-Array nach `daten/nachtrag.json` legen
(eine Zeile je Text, Zahlen dürfen drinstehen, sie werden zu `{0}`; Platzhalter `{0}` vorher durch Beispielzahlen
ersetzen). Dann ab Schritt 2 wie oben – `pruefen.js` liest `nachtrag.json` mit. Neue Gegenstandsnamen der Stufe 80:
`node e80.js` und je Sprache `node einfuegen.js <code> ue/<code>-e80.tsv`.
