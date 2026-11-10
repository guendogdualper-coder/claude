# Auftrag 2026-11-10 – Helfer „ui“ (Aufgaben 13, 04, 17, 15)

Stand: 14.31 + Änderungen dieses Zweigs (Kommentare „seit 14.32“). Version, sw.js-VERSION und Changelog nicht geändert
(nur die zwei neuen Dateien in die Dateiliste von sw.js und index.html eingetragen).

## 13 | Skill-Upgrades mit echter Werte-Vorschau

**Status: umgesetzt.**

- **Ursache/Bestand:** Das Plus in der Leiste verbesserte sofort (`upgradeSkill`), im Charakterfenster ebenso; ohne
  Punkt/Buch waren die Knöpfe `disabled` (keine Vorschau möglich). Das Infofeld (`skillStatsHtml`) zeigte zwar die
  nächste Stufe, aber ohne Zuwachs und ohne Bestätigung. Echte Zahlen kommen seit 13.6 aus `skillStats`
  (oberflaeche.js: Angriff, Waffe, Ausrüstung, Boni, Status, Buffs × Faktor × Fertigkeitsschaden).
- **Änderung:** neue Datei `js/fertigkeit-vorschau.js`. Darüberfahren (Maus) über das Plus bzw. einen Knopf
  „Verbessern / Buch lesen / Schriftrolle / Seelenstein / Erwecken / Heroisch …“ zeigt die Vorschau, Klick/Antippen
  öffnet sie fest mit „Abbrechen“/„Bestätigen“ (Enter bestätigt, Esc schließt, Klick daneben schließt).
  Inhalt: Stufe alt → neu (mit neuem Rangnamen), je geänderter Wert alt → neu, Zuwachs absolut und in Prozent
  (Prozentwerte als %-Punkte), Schadenszeilen zuerst. Nur Zeilen, die sich wirklich ändern; neue Zeilen „neu“,
  wegfallende „entfällt“. Grundlage ist dieselbe `skillStats`-Rechnung wie im Infofeld – kein eigener Fake-Wert.
  Mana und Abklingzeit hängen nicht an der Fertigkeitsstufe (`skillMana`, `skillCooldown`) und erscheinen darum nicht.
  Hinweis „Grundwerte … vor Verteidigung und Resistenzen, im Kampf Zufall und Krits“. Kosten und Bestand
  (Punkte, Bücher, Schriftrollen, Seelensteine), bei fehlenden Mitteln der Grund aus `skillActions` und gesperrtes
  „Bestätigen“. Im Charakterfenster sind fehlende Aktionen jetzt `aria-disabled` statt `disabled` (antippbar für die Vorschau).
- **Veraltete Vorschau:** rechnet zweimal je Sekunde neu (Ausrüstungswechsel, Buff läuft ab). „Bestätigen“ trägt die
  Stufe, für die die Vorschau galt (`data-lvl`); hat sich die Stufe inzwischen geändert, wird nicht verbessert, sondern
  „Die Werte haben sich geändert“ gezeigt. Nach dem Bestätigen 400 ms Sperre und das Fenster schließt → Doppelklick =
  genau eine Stufe.
- **Nebenbei behoben:** Totenruf (Nekromant) zeigte keine stufenabhängigen Werte; jetzt „Leben je Geist“ und „Schlag“
  (aus `spawnGhostAlly`/`allyAtk`, für ein Monster mittlerer Größe).
- **Dateien:** js/fertigkeit-vorschau.js (neu), js/oberflaeche.js (Plus, Knöpfe, Totenruf-Zeilen), css/style.css,
  index.html, sw.js (Dateiliste), js/sprachen/en.js.
- **Tests (Playwright, Port 8794, Skript ui17/t13.js):** Hover zeigt „Stufe 1 → 2, Schaden 140 → 148 (+8, +5,7 %),
  Welle 280 → 297“ ohne zu verbessern; Klick öffnet fest; Doppelklick auf Bestätigen → Stufe 1 → 2, Punkte 3 → 2
  (genau eine); veraltete Vorschau (Stufe dazwischen geändert) → nicht verbessert, Hinweis; ohne Punkte im
  Charakterfenster: Vorschau sichtbar, Bestätigen gesperrt, „Kein Fertigkeitspunkt frei“, Stufe unverändert;
  Stärke +40 → Vorschau rechnet neu. Alle 6 Klassen × alle Wege × Stufen 1/14/15/18/27/37/47/48 × jede Aktion
  (480 Vorschauen): kein NaN/undefined, jede nicht maximale Stufe hat mindestens eine geänderte Zahl, Stufe 48 =
  „Höchste Stufe erreicht“. Keine Seitenfehler.
- **Offen/Einschränkungen:** Es gibt keinen Spielserver – Prüfung und Durchführung laufen wie bisher lokal in
  `upgradeSkill` (Spielstand im Gerät/Konto); „Server-Reject“ und Netzwerk-Wiederholung gibt es dafür nicht.
  Mobil: das Plus verbessert nicht mehr mit einem Tipp, sondern braucht „Bestätigen“ (gewollt, ein Tipp mehr).

## 04 | Optionaler Damage-Meter

**Status: umgesetzt** (Heilung nicht erfasst, siehe offen).

- **Bestand/Ursache:** Schaden an Monstern läuft über `hitMonster` → `damageMonster` (kampf.js). Allein und beim
  Kanal-Host zieht `damageMonster` Leben ab; Mitspieler schicken Treffer an den Host (`netClientDamage` → `netHostDamage`).
  Schaden über Zeit (Gift/Brand/Blutung/Ausrüstungsgift) tickt nur beim Host (`tickDots`) und wurde dem *letzten*
  Angreifer zugerechnet (`m.lastAttacker`), nicht dem Verursacher. PvP läuft über `pvpHit`/`duelHit`, nie über `damageMonster`.
- **Messmodell:** Gezählt wird nur in `damageMonster` beim Host bzw. allein, und zwar wirklich abgezogenes Leben
  (`min(Schaden, Restleben)` → kein Überkill, keine Treffer auf versiegelte Bosse/Kristallschild, kein PvP).
  Diener zählen für den Besitzer (beim Host `src.ally`, beim Mitspieler laufen ihre Treffer ohnehin als seine).
  DoTs bekommen `by` (wer sie gesetzt hat; beim Host für Mitspieler aus der Netzmeldung) und werden diesem gutgeschrieben
  (`damageMonster(..., credit)`); ist er weg, zählt der Tick für niemanden. Jeder Tick läuft genau einmal (Host).
  Ein Mitspieler zählt seine eigenen Treffer nicht selbst: Der Host schickt ihm jede Sekunde seine bestätigte Summe
  (`{t:'dm', a, e}`), daraus entstehen Zuwächse; neue Verbindung/neuer Host = neue Kennung `e`, die Summe beginnt neu.
  Gruppe: alle 2 s schickt jeder seine bestätigten Zuwächse an die Gruppenmitglieder (`netSocial` k `dm`, mit Bereich);
  angenommen nur von Mitgliedern der eigenen Gruppe und nur im selben Bereich (Map/Dungeon).
- **Zeiträume:** „Begegnung“ endet nach 6 s ohne Schaden (die letzte bleibt stehen), „Dungeon“ (draußen „Gebiet“) seit
  Betreten des Bereichs; Bereichswechsel startet neu. DPS = Schaden / Kampfzeit (Begegnung: für alle dasselbe Fenster;
  Dungeon: Summe der Kampfzeiten). „Zurücksetzen“ leert beide.
- **Anzeige/Einstellung:** Einstellungen → „Figur und Spiel“ → Abschnitt „Oberfläche“ → „Schadensanzeige (Damage-Meter)“,
  Standard aus. Fenster mit Rangfolge, Name, Schaden, DPS, Anteil, Klassenfarbe als Balken, eigene Zeile umrandet.
  Am Kopf verschiebbar (Maus und Finger, Lage gemerkt), mit dem Pfeil einklappbar (am Handy standardmäßig eingeklappt:
  nur „Schaden ### DPS“). PC: links über dem Chat; Handy: oben links neben den Gruppenrahmen, weg von Stick, Leiste und
  Angriffsknopf. Unter den Fenstern (z-index 9).
- **Dateien:** js/schadensmeter.js (neu), js/kampf.js (credit, `by`, Aufruf), js/gegner.js (tickDots), js/netz.js (`by`,
  Nachricht `dm`), js/gemeinschaft.js (k `dm`), js/optionen.js (Schalter), css/style.css, index.html, sw.js, js/sprachen/en.js.
- **Tests (zwei Browser über lokalen MQTT-Broker, Skript ui17/t04.js):** A = Host (Krieger, PC), B = Mitspieler
  (Ninja, Handy-Ansicht), Gruppe, zwei Testmonster: A schlägt und setzt Brand auf M1, B schlägt beide (B ist danach
  letzter Angreifer von M1) und vergiftet M0. Ergebnis: Lebensverlust der Monster beim Host 4.217 = Summe der Anzeige
  bei A (4.217) = Summe bei B (4.217); Begegnung = Dungeon/Gebiet; vom Host bestätigte Summe für B 2.872 = B's eigene
  Zeile. DoT-Ticks: „Alper:547“ ×4 (Brand von A, obwohl B letzter Angreifer war), „Saija:546“ ×2.
  Neu verbinden: B verlässt den Kanal und kommt wieder → +655, Host sah 655 abgezogen (kein Doppeln, kein Minus);
  nach erneutem Gruppenbeitritt sieht A die neuen Werte. Gruppe verlassen: A nimmt B's Zuwächse nicht mehr an.
  Ausschalten blendet das Fenster aus. Keine Seitenfehler.
  Allein (ui17/t04solo.js): Nekromant beschwört 3 Diener, nur die Diener schlagen (12 Treffer) → Lebensverlust 1.229 =
  Zeile des Nekromanten 1.229. Kosten: 100.000 Einträge in 32 ms (≈0,3 µs je Treffer); die Anzeige baut höchstens
  zweimal je Sekunde neu und nur bei geänderter Ausgabe.
- **Offen:** Heilung wird nicht gemessen. Überkill wird ausgeschlossen, aber nicht gesondert angezeigt. Die Werte, die ein
  Gruppenmitglied weiterreicht, stammen vom Host, laufen aber über dessen Gerät (ein veränderter Client könnte seiner
  Gruppe andere Zahlen schicken – auf das Spiel hat das keinen Einfluss). Kanal-Neustart/Hostwechsel: Begegnungen laufen
  weiter, Zuwächse gehen in der Übergabe-Sekunde ggf. verloren. Spieler in einem anderen Bereich (Instanz) zählen nicht mit.
  Geprüft nicht: echtes WebRTC (Test lief über den Relay-Weg), mehr als zwei Spieler.

## 17 | Chat im Ruhezustand transparenter

**Status: umgesetzt.**

- **Bestand:** `.chat-box` (Verlauf 0,38–0,62 Deckkraft, Rahmen 0,45), geschlossen `pointer-events: none` – nur Reiter
  und Sprechblase nehmen Klicks an; offen (`.open`) eigener dunkler Hintergrund (PC/Handy).
- **Änderung (nur CSS):** CSS-Variablen `--chat-bg-rest/-active`, `--chat-border-rest/-active`, `--chat-tab-rest/-active`,
  `--chat-fade` (0,22 s). Ruhe: Verlauf 0,08–0,2, Rahmen 0,16, Reiter dezenter, Texte mit kräftigerem Schatten.
  Aktiv (Maus über dem Chat – geht wegen `pointer-events: none` über Reiter/Sprechblase –, Tastaturfokus im Chat
  `:has(:focus-visible)`, geöffneter Chat zum Schreiben/Lesen/Scrollen am PC und Handy) wieder der bisherige Verlauf,
  weich eingeblendet über `::before` (Verläufe lassen sich nicht direkt überblenden). Hover nur bei `(hover: hover)`,
  damit am Handy kein „klebender“ Hover bleibt. `prefers-reduced-motion`: keine Überblendung. Offener Chat unverändert.
  Keine neue Klickfläche (Kasten bleibt `pointer-events: none`; geprüft: Mitte des Verlaufs trifft die Spielfläche `welt`).
- **Dateien:** css/style.css.
- **Tests (ui17/tshot.js):** PC: Ruhe → `::before` 0; Maus über Reiter → 1, Rahmen 0,45; Maus weg → 0; Tab-Fokus auf
  Reiter → 1. Handy: geöffnet = alter dunkler Hintergrund, nach Schließen wieder Ruhe (0). Bildschirmfotos hell
  (Sonnenwiesen) angesehen. Nicht geprüft: dunkles Gebiet per Foto, echtes Touch-Gerät.

## 15 | Spiel beenden auf Desktop

**Status: umgesetzt; Desktop-App muss neu gebaut werden** (für das Schließen trotz offener Nebenfenster).

- **Plattformen:** Web/PWA (Browser), Android/iOS (Wrapper in android/, ios/), Desktop = Electron (`desktop/main.js`,
  lädt `https://seelenstein.online/?quelle=desktop`, contextIsolation + Sandbox, kein preload). Erkennung im Spiel wie
  `MS_STORE_PWA` in konto.js: `Electron/` im User-Agent. Nur dort erscheint der Knopf.
- **Ablauf:** Einstellungen → „Figur und Spiel“ → „Programm“ → „⏻ Spiel beenden“ → „Spiel wirklich beenden?“ mit
  Abbrechen/Beenden → `saveGame()` → mit Konto `cloudPush()` (ohne keepalive, höchstens 10 s) → Kanal verlassen
  (`netStop`) → `window.close()`. Schlägt das Hochladen fehl oder kommt keine Antwort: kein Beenden, sondern
  „Hochladen ins Konto hat nicht geklappt“ mit Grund und „Erneut versuchen / Trotzdem beenden / Abbrechen“. Schließt sich
  das Fenster nicht, nach 2 s „Das Fenster ließ sich nicht schließen … über das X schließen“. Mehrfachklick: ein Ablauf.
- **desktop/main.js (minimal):** Schließt das Hauptfenster, beendet sich das Programm (`app.quit()`), auch wenn noch ein
  Wiki-/Datenschutz-Fenster offen ist – sonst liefe es unsichtbar weiter. Der 'close'-Handler (Fensterzustand speichern)
  verhindert nichts. **Die Desktop-App muss dafür neu gebaut/veröffentlicht werden**; ohne Neubau schließt
  `window.close()` das Hauptfenster trotzdem, nur offene Nebenfenster bleiben dann stehen.
- **Dateien:** js/optionen.js, desktop/main.js, css/style.css, js/sprachen/en.js.
- **Tests (ui17/tshot.js, Chromium mit Electron-User-Agent, window.close abgefangen):** Browser: kein Knopf; Electron-UA:
  Knopf da; Abbrechen → zurück; Beenden ohne Konto → 1× gespeichert, 1× close (Doppelklick); Fenster bleibt offen →
  Hinweis nach 2 s; Konto + Fehler → „Fehler: Netzwerk nicht erreichbar“, kein close; Konto hängt → nach 10,9 s
  Zeitlimit-Meldung; „Trotzdem beenden“ → close; Konto ok → close.
- **Nicht getestet:** echte Electron-App unter Windows (kein Electron/Windows in der Umgebung), echtes Anmelden danach.
