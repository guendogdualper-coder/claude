# Seelenstein

Ein Rollenspiel im Browser nach dem Vorbild klassischer Grind-MMORPGs: Klasse wählen, Monster farmen, Seelensteine zerstören, Stufe um Stufe stärker werden.

## Starten

```sh
python3 -m http.server 8000
```

Dann <http://localhost:8000> öffnen. Es gibt keine Abhängigkeiten und keinen Build-Schritt. Der Spielstand wird im Browser gespeichert.

## Als App aufs Handy

Seelenstein ist eine installierbare Web-App (PWA). Auf einem Webserver mit HTTPS (z. B. GitHub Pages) lässt es sich auf den Startbildschirm legen und startet dann im Vollbild, mit eigenem Icon und auch ohne Internet.

- **Android (Chrome):** Seite öffnen, Menü ⋮, „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.
- **iPhone (Safari):** Seite öffnen, Teilen-Knopf, „Zum Home-Bildschirm“.

Nach einer Änderung an den Spieldateien in `sw.js` die `VERSION` erhöhen, damit installierte Apps die neuen Dateien laden.

## Was schon drin ist

- **4 Klassen mit je 2 Wegen**: Krieger, Ninja, Schamane, Nekromant. Bei der Erstellung wählst du einen Weg für Monster in Massen (PvE) oder für Zweikämpfe (PvP), jeder mit fünf eigenen Fertigkeiten, also 40 insgesamt. Buffs wie Aura des Schwertes oder Starker Körper halten zwei bis drei Minuten
- **Welt bis Stufe 70**: Dorf mit Mauer, Türmen und Toren, darum sieben Gebiete (Sonnenwiesen, Dunkelwald, Orktal, Ödland, Frostgipfel, Totenmoor, Feuerberg) mit eigenem Boden, Gewässern (Sumpf, Lava, Eis) und Stimmung (Schnee, Glühwürmchen, Asche, Funken). Monster erscheinen erst ein Stück vor der Mauer
- **24 Monsterarten**: passive und aggressive, Nah- und Fernkämpfer, Spinnen, Skorpione, Geister, Golems und Drachen, Gruppen helfen sich gegenseitig
- **14 Seelensteine** von Stufe 5 bis 70 in Fünferschritten, jeder mit eigenem Namen, Aussehen und eigener Beute (z. B. Stein der Gier: viel Gold, Stein der Stille: Sternensteine). Sie rufen beim Angreifen Monsterwellen herbei und geben viel Erfahrung, Gold, Tränke und Seelensplitter
- **Aufträge**: 20 Aufträge des Dorfältesten von Stufe 1 bis 70 mit Erfahrung, Gold, Ausrüstung und Materialien, dazu wiederholbare Jagden bei der Jägerin
- **Dorfbewohner**: Wegweiserin (Reisen in jedes Gebiet), Alchemist (Materialien), Wachen an den Toren und Leute, die umherlaufen
- **Schwierigkeit**: Monster werden ab Stufe 2 schrittweise zäher und stärker, ab Stufe 15 mit jeder Stufe weiter. Monster über der eigenen Stufe nehmen 8 % weniger Schaden je Stufe (bis −75 %) und treffen 7 % härter (bis +80 %), höhere Gebiete brauchen also gute Ausrüstung. Ab Stufe 10 braucht jede Stufe 40 % mehr Erfahrung
- **Map 2 und Map 3** über das Weltentor in Vlotho: Schlangental (Stufe 30–50, Sandschlangenwüste mit Sandvipern, Klapperschlangen und Königskobras, Nagadschungel mit Riesenpythons, Naga-Kriegern und Naga-Priesterinnen) und Donnerklamm (Stufe 50–75, Trollkrieger, Harpyien, Minotauren, Steintitanen, Gargoyles, Donnerriesen), je mit sicherem Lager, Weltentor zurück und eigenen Seelensteinen
- **Tränke S bis XXL** (35 % bis 100 %), automatisch passende Größe beim Trinken, größere Tränke als Beute in höheren Gebieten
- **Vergleich mit der angelegten Ausrüstung**: Pfeile ▲/▼ auf den Kacheln, einzelne Werte grün/rot im Inventar, beim Schmied und bei den Händlern; der Schmied zeigt die Figur mit der angelegten Ausrüstung und die Tasche getrennt
- **Seelensteine in Dungeons**: je zwei Steine pro Dungeon, kommen nach 25–40 s wieder
- **Server und Kanäle (online)**: Beim Start Server-Auswahl wie bei Metin2, Server ERFOO (Testserver) mit Kanal 1 und Kanal 2, bis zu 8 Spieler pro Kanal, jeder mit seiner eigenen Figur. Kein eigener Rechner nötig: Die Geräte verbinden sich direkt per WebRTC (PeerJS mit öffentlichem Vermittlungs- und Relay-Server). Wer einen leeren Kanal betritt, führt dessen Welt (Host); geht er oder legt die App in den Hintergrund, übernimmt automatisch ein anderer Spieler, der Kanal ist also immer erreichbar. Der Host führt Monster, Steine und Bosse; Mitspieler schicken Position und Treffer und bekommen zehnmal pro Sekunde den Stand in ihrer Nähe. Erfahrung und Beute für jeden, der mitkämpft oder in der Nähe ist. Mitspieler mit Namen, Lebensbalken und grünem Punkt auf der Minikarte, Chat mit Sprechblasen, Einladungslink `?server=erfoo&kanal=1`
- **Missionen**: Hauptmissionen golden, Nebenmissionen grün (Ausrufezeichen über Personen, Auftragsliste, Minikarte)
- **Stallmeister Jun** (ab Stufe 30): Hauptmission mit Zeitlimit, 120 Monster ab Stufe 25 in 20 Minuten; Belohnung ein eigenes Pferd (60 % schneller, Taste R oder Pferdeknopf, man steigt beim Angreifen ab)
- **Dungeons mit Bossen**: Spinnenhöhle (ab 18), Orkfestung (ab 28), Eisgrotte (ab 45), Drachenhort (ab 63) in einem eigenen Kartenstreifen, Eingänge neben den Wegen und auf der Minikarte. Je drei Räume mit eigenen Monstern und ein Boss (Spinnenkönigin, Kriegsherr Gor'thak, Eiskönig Hrim, Urdrache Vharak) mit angekündigtem Stampfer, Geschoss-Salven und Verstärkung; Bossbalken oben, Beute: zwei Teile +3 bis +6, Bücher, Schmiede-Teile, Materialien, Gold; Boss kommt nach 10 Minuten wieder
- **Freier Angriff**: Angriff und Fertigkeiten gehen auch ohne Gegner in der Nähe, in Blickrichtung (Vorbereitung für PvP)
- **Fortschritt**: Erfahrung, Stufen bis 99, Fertigkeitspunkte (Fertigkeiten bis Stufe 20), 3 Statuspunkte pro Stufe für Stärke, Vitalität, Intelligenz und Geschick, Erfahrungsverlust beim Tod
- **Händler im Dorf**: Waffenhändler Goro (Waffen je Klasse), Rüstungshändlerin Mei (Rüstung, Helm, Schild, Schuhe, Gürtel), jeweils ab Lv 1, 5, 10 und 15; Händlerin Ayla für Tränke und Segensschriftrollen
- **Ausrüstung je Klasse**: Waffe, Rüstung und Helm gehören immer zu einer Klasse, Schild, Schuhe und Gürtel kann jeder tragen. Zwei Waffenarten je Klasse mit eigenem Schaden und Tempo: Schwert oder Zweihänder, Dolche oder Bogen (Fernkampf), Fächer oder Glocke, Stab oder Sense; Fächer, Glocken, Stäbe und Sensen geben Magiestärke für Fertigkeiten. Jede Stufe sieht anders aus, auch an der Figur (Rüstungsfarbe, Brustplatte, Hörner, Flügelhelm, Kronen)
- **Ausrüstung**: acht Plätze in acht Stufen (ab Lv 1, 5, 10, 15, 22, 30, 45, 60). Ab Lv 30 gibt es sie nur in den hohen Gebieten oder von Seelensteinen ab Stufe 20 Die Grundausrüstung (Lv 1) gibt nur Rüstung bzw. Angriff, ab Lv 5 kommen eigene Effekte dazu: Rüstung, Vitalität, Intelligenz, Blocken, Ausweichen, Lauftempo, Regeneration, kritische Treffer. ab Lv 22 nur als Beute, Tasche mit vier Seiten zu je 20 Plätzen
- **Schmied**: verbessert Ausrüstung von +0 bis +20 mit Gold und Seelensplittern. Ab +6 (bei Ausrüstung ab Lv 30 schon ab +4) braucht er zusätzlich Teile von Monstern, die sie selten fallen lassen: Hundezahn, Wolfspelz, Banditenabzeichen bis zur Drachenschuppe. Bis +6 kostet ein Fehlschlag nur das Material, ab +7 kann der Gegenstand zerbrechen. Die Segensschriftrolle schützt davor. Bessere Waffen ändern ihre Farbe, ab +4 leuchten sie
- **Inventar** mit Figur, die Waffe und Schild trägt; leere Ausrüstungsplätze zeigen ein blasses Symbol
- **Verkaufen** nur bei einem Händler (auch Schmied und Alchemist): „Mehrere verkaufen“ in der Tasche, Sachen antippen oder mit „Ganze Seite“ bzw. „Nicht nutzbar“ automatisch auswählen und auf einmal verkaufen
- **Boni**: Seelensteine lassen Materialien fallen, die automatisch aufgehoben werden. „Verstärkung“ fügt Ausrüstung die Boni 1 bis 4 hinzu, „Seltene Verstärkung“ den 5. Bonus, der Switcher würfelt die Boni neu, der Sternenstein gibt die besonderen Boni 6 und 7 (Fertigkeitsschaden, Grundangriffe, Leben in Prozent, Widerstand). Dazu fällt Ausrüstung bis +2
- **Stufenaufstieg** mit Lichtsäule, Ringen und aufleuchtender Figur
- Gezeichnete Figuren im Chibi-Stil mit Umriss und Schattierung, Laufanimation und Waffenschwung; Monster mit Mähnen, Reißzähnen, Flügeln, Umhängen und Runen, die im Stand atmen
- Kampfeffekte: Dreier-Kombo, Schwungspuren, Funken, große Schadenszahlen, Bildschirmwackeln und kurzes Einfrieren bei kritischen Treffern
- Fertigkeiten mit gemalten Symbolen und eigenen Effekten je Klasse (Feuer und Gold, Schatten, Türkis und Blitz, Seelengrün), Bodenspuren und Auren aktiver Buffs
- Querformat mit kompaktem Handy-Layout: alles in den Ecken, Fertigkeiten im engen Bogen um den Angriffsknopf (mit Ring, Stufenplakette, Abklingzeit als Zeiger und Aufleuchten, sobald sie bereit sind), Menü als Symbolknöpfe, im Hochformat erscheint ein Hinweis zum Drehen
- **Beute**: alles Aufgehobene erscheint unten rechts mit Symbol und Anzahl; der Beute-Knopf (Taste B) öffnet ein Fenster mit allem, was du aufgehoben hast, und den Weg in den Rucksack
- **Buffs** als Symbole unter den Balken, mit Ring und Restzeit; jeder Buff ist auch an der Figur zu erkennen (Blitze beim Kampfrausch, goldener Kreis bei der Aura des Schwertes, Heiligenschein beim Segen und so weiter)
- **Fertigkeitsränge**: Stufe 1–17 mit Punkten, ab Stufe 15 Erwecken (E1–E10), danach mit Fertigkeitsbüchern Heroisch (H1–H10), Legendär (L1–L10) und Vollendet (V). Jede Stufe erhöht Schaden, Buff-Werte und Buff-Dauer, das Charakterfenster zeigt die Werte jetzt und für die nächste Stufe. Jeder Rang gibt einen zusätzlichen Sprung und sieht wuchtiger aus. Auf Stufe 17 erweckt ein Tipp auf das blaue „E“ die Fertigkeit direkt zu E1
- **Fertigkeitsbücher je Fertigkeit**: Jeder Seelenstein kann Bücher zu allen 40 Fertigkeiten aller Klassen fallen lassen, gestapelt in der Tasche. Für Lesen und Rangaufstieg zählen nur Bücher der jeweiligen Fertigkeit, fremde verkauft man
- **Fertigkeiten tauschen**: lange auf eine Fertigkeit drücken, dann auf einen anderen Platz ziehen oder tippen; die Tasten 1–5 folgen den Plätzen
- **Laufende Buffs** sind an ihrer Fertigkeit markiert: ein Lichtring läuft um den Knopf, darüber steht die Restzeit
- **Buffs je Rang**: Kampfrausch zeigt bis Stufe 17 nur einzelne kurze Blitze, mit jedem Rang mehr und längere; die Aura des Schwertes legt eine leuchtende Energieklinge um das Schwert, die mit jedem Rang wächst
- **Tränke**: Drachenblut (Leben, bauchige Flasche mit Wachssiegel) und Mondtau (Mana, Kristallflasche mit Mondsichel), mit eigenem Effekt beim Trinken
- **Schild oder Zweihand**: Zweihänder, Bogen und Sense brauchen beide Hände; Blocken gibt es nur mit Schild. Schilde trägt nur der Krieger, Zweihänder nur der Weg des Leibes
- **Beidhändig** (Krieger, Weg der Klinge, ab Stufe 30, bei Goro für 20.000 Gold): zweites Schwert in der Nebenhand, 30 % seines Angriffs, +5 % Tempo, Boni zur Hälfte, kein Blocken
- **Ultimative Attacken** ab Stufe 30, eine je Weg, 3 Minuten Abklingzeit, goldener Knopf und Taste 6: Klingenhimmel (Geisterschwerter fallen vom Himmel), Titanenzorn (Sprung mit Erdriss und Titanenhaut), Schattentanz (Sprünge zu bis zu 8 Gegnern), Todesmal (Hinrichtung eines Ziels), Drachensturm (Meteorregen), Himmelssegen (Heilung, Schutz und Lichtsäulen), Seelenernte (Seelenstrudel, der Gegner zusammenzieht), Knochenkerker (drei Ringe aus Knochenspießen mit Lebensraub). Mitspieler sehen sie auch
- **Acht Ausrüstungsplätze**: dazu Schultern und Umhang. Jedes Teil ist an der Figur zu sehen: Stiefel, Gürtel mit Schnalle, Schulterpanzer (ab Drache mit Dornen, ab Himmel mit Federn), der Umhang weht beim Laufen und trägt ab Drache ein Wappen
- **Mehrspieler 3.8**: Angriffe der Mitspieler sind sichtbar (Schwünge, alle Fertigkeitsarten, Pfeile, Zauber, Blitze, Gift, Beschwörungen), Schadenszahlen anderer Spieler erscheinen hellblau-weiß; Zoomen per Doppeltippen oder zwei Fingern ist gesperrt; „Als App installieren“ auf dem Startbildschirm (Android fragt direkt, iPhone mit Anleitung)
- **Anzeige 3.9**: Über jedem Monster stehen immer Stufe (in der Stufenfarbe) und Name; Bossbalken, Zielfenster und Spielerkarte stapeln sich oben in der Mitte unter der Knopfleiste und überdecken weder den Figurenkasten noch die Menüknöpfe (auch auf kleinen iPhones); ist der Boss das Ziel, zeigt nur der Bossbalken sein Leben
- **3D 4.0**: Die ganze Welt in echtem 3D (three.js, liegt dem Spiel bei und funktioniert offline): weiche Bodenübergänge, Wasser/Lava/Moor mit Wellen und Ufer-Schaum, Höhlenwände als Felsen, Bäume, Felsen, Häuser mit geschwungenen Dächern, Mauer, Türme, Tore, Dorfschmuck, Gras und Blumen; alle Figuren mit Skelett-Animation (Laufen, Schlagen, Zaubern, Pose, Wirbel, Reiten, Treffer), Spieler mit Aussehen und sichtbarer Ausrüstung je Stufe, leuchtende Waffen ab +4, alle Monster (Farben direkt aus den 2D-Zeichnungen), Bewohner, Seelensteine, Portale; abgerundete Kanten, dünne Umrisse, weiche Zeichentrick-Schattierung, Schatten, Stimmung je Gebiet, Durchsicht hinter Objekten; Namen, Zahlen und Effekte bleiben als scharfe 2D-Ebene darüber; Umschalter 3D/2D in den Einstellungen; Stilvorgabe als Gesamt-Prompt in `docs/bild-prompts.md`
- **4.6 Duelle**: größerer Duellkreis (Radius 400 statt 340), in 3D eine rote Lichtwand mit laufenden Streifen, die beim Countdown aus dem Boden wächst, Säulen mit glühenden Spitzen, rot getönter Boden; in 2D ein aufsteigender Lichtrand; Schaden im Duell gedämpft (Faktor 0,24 statt 0,6) und pro Treffer auf 8 % (kritisch 12 %) des Lebens begrenzt, Duelle bis 3,5 Minuten
- **4.7 Schulterblick und PC-Grafik**: neue Kameraeinstellung „Schulterblick“ (tiefe Kamera hinter der Figur, Blick weit nach vorn, drehbar per Wischen oder Maus, Laufrichtung kamerabezogen, Mausrad-Zoom, runder Sichtbereich beim Nachladen der Welt); Geräteerkennung PC/Handy, am PC automatisch Grafikstufe „Ultra“ (volle Auflösung, 2048er-Schatten, größerer Schattenbereich, schärfere Bodentexturen, mehr Sichtweite); Prompt-Sammlung für alle Bilder des Spiels
- **4.8 Schlanke Handy-Anzeige**: Figur, Karte (52 px), Menüknöpfe, Chat, Beutel, Tränke und Fertigkeiten kleiner; Angriffsknopf tiefer in der Ecke mit engem Fertigkeitsbogen; dünne Erfahrungsleiste ohne Text; Gold, Splitter, Akku, Uhr und Ping nur nach Antippen der Karte (Zustand wird gemerkt)
- **4.9 Bis an den Rand**: Seite der Kamera-Aussparung über den Drehwinkel erkannt (`html[data-notch]`), auf der freien Seite kein sicherer Rand mehr; Ecken-Anzeigen (Karte, Figur, Chat, Beutel, Angriff mit Fertigkeitsbogen) rücken in den sicheren Rand hinein, Meldungen in der Bildmitte halten Abstand; Online-, Kanal- und Begrüßungsmeldungen im Chat statt im Bild
- **5.0 Meldungen im Chat**: `ui.log` schreibt in den Chat (Kanal-Meldung mit Farbe je Art: level golden, warn rötlich) statt in die Meldungsspalte im Bild; doppelte Freundes- und Gildenmeldungen entfernt; EP über der Figur bleibt
- **5.1 Tarnung und Neustart**: Tarnung bricht beim ersten Angriff nicht mehr ab, sondern läuft danach noch 8 s (mit der Fertigkeitsstufe länger); beim Tod Auswahl „Hier neu starten“ (halbes Leben/Mana, 3 s Schutz, 3 % EP zur nächsten Stufe) oder „In der Stadt neu starten“ (voll, ohne EP-Verlust)
- **5.2 Tarnung statt Giftpfeil**: Weg des Dolches bekommt Tarnung (30 s, Stufe 3, 35 s Abklingzeit) statt Giftpfeil; Tarnung endet in beiden Wegen mit dem nächsten Angriff (dreifacher, sicher kritischer Treffer), ein beim Tarnen laufender Schlag zählt 0,6 s lang nicht; alte Giftpfeil-Bücher werden beim Laden zu Tarnungs-Büchern
- **5.3 Hauptwert je Klasse**: `MAIN_ATTR` (Krieger STR, Ninja DEX, Schamane/Nekromant INT) gibt je Punkt +1,5 % Fertigkeitsschaden, +1 % Grundangriffsschaden und +1 % Buff-Stärke (`buffPower` fließt in `buffScale`: Buffs, Heilung, Schilde, Skelett-Leben, Fluch); bei INT als Hauptwert ersetzt das den allgemeinen INT-Fertigkeitsschaden; Hauptwert im Statusfenster markiert
- **5.4 Gruppen und PC-Steuerung**: neues `js/gruppe.js` – Gruppen bis 8 Spieler im Kanal (Einladung über Spielerkarte oder Reiter „Gruppe“, Nachrichten pi/pa/pn/ps/pl über `netSocial`, Anführer verwaltet und übergibt beim Gehen, wer 10 s fehlt, fällt heraus); EP-Verteilung für Mitglieder in der Nähe: gleich (+10 % je weiterem Mitglied) oder nach Stufe (gleiche Summe, anteilig zur Stufe); Gruppenliste mit Leben unter der Lebensanzeige; am PC größere Lebensanzeige und Dauerangriff mit gehaltener Leertaste
- **5.5 PC-Anzeige**: Gruppenliste am PC größer und unter der Lebensanzeige (keine Überlappung mit dem Manabalken), eigener Name größer; Auftragsliste am PC rechts unter der Karte, breiter und mit größerer Schrift
- **5.6 Maus und Vollbild**: Maussteuerung am PC (Linksklick Monster = Angriff, gehalten Dauerangriff; Linksklick Boden = hinlaufen mit Markierung, gehalten folgen; Rechtsklick = auswählen bzw. im Schulterblick Kamera drehen), Kontextmenü im Spiel unterdrückt; `selectAt` meldet, was getroffen wurde; Einstellung „Vollbild“ über die Fullscreen-API (wo verfügbar)
- **5.7 Gruppe sichtbar, Balance**: Gruppenmitglieder mit großem grünem Namen und breitem Lebensbalken (2D und 3D), auf der Minikarte groß, grün, mit Leuchtring bzw. Randpfeil (auf der kleinen Handy-Karte vergrößert); PC-Minikarte 196 px mit 200er-Leinwand; `monsterPower` ab Stufe 15 mit +6 % Leben, +3 % Angriff, +4 % Rüstung je Stufe; `xpToNext` × (1 + 0,06 × (Stufe − 1)); `STONE_LOOT_GAP` = 15: zu niedrige Seelensteine und ihre Wellen geben nur noch Erfahrung
- **5.8 Gruppen-Dungeons und härtere Monster**: beim Betreten eines Dungeons oder Risses Einladung `pd` an alle Gruppenmitglieder, Annehmen teleportiert an den Dungeon-Start (ohne Stufengrenze); `monsterPower` ab Stufe 15: Leben +8 %, Angriff +10 %, Rüstung +5 % je Stufe, Anlauf bis 15 beim Angriff ×2,4; `xpToNext` × (1 + 0,1 × (Stufe − 1)); Steine geben 6× statt 10× Erfahrung, Monster-Erfahrung höchstens ×8 über `hpMul`, Bonus für stärkere Monster höchstens +25 %; Lebensraub höchstens 3 % des Lebens je Treffer
- **5.9 Boni und Balance**: Prozent-Boni wachsen nur 10 % je Gegenstandsstufe statt 35 % und haben `max` je Gegenstand (Stark gegen Monster 10 %), `BONUS_CAPS` begrenzt die Summe aller Teile; Statuswert-Boni [1, 4] mit 15 % je Stufe; alte Gegenstände werden beim Laden gekürzt (`itemsVersion` 3, `clampItemBonuses`); Hauptwert-Bonus 1,2 % je Punkt, höchstens 120 Punkte; `dmgScale` 6 %/4 % je Fertigkeitsstufe; Monsterleben-Anlauf ×2,6 und +11 % je Stufe ab 15; Seelensteine ×12 Leben; Ausweichen max. 45 %, Schadensminderung max. 60 %
- **6.0 Sofortiger Tod im Kanal**: Mitspieler halten Monster nicht mehr bei 1 HP fest; ein tödlicher Treffer markiert das Monster sofort als tot (`predictedDead`, Schnappschüsse lassen es 1,5 s nicht wieder aufstehen) und schickt `k: 1` an den Host, der den Kill auch bei bis zu 8 % Restleben anerkennt; Belohnung weiter über die Kill-Nachricht des Hosts
- **6.1 Stärkere Monster, Versionsprüfung, hellere Dungeons**: `monsterPower` mit quadratischem Anteil (Leben 0,005·x², Angriff 0,002·x² ab Stufe 15), `RANK_JUMP` kleiner, `CRIT_CAP` 60 %, `BASIC_MUL` 1,4; Seelensteine draußen 10–15 min, in Dungeons 5–8 min weg, Host erkennt tödliche Treffer auf Steine bis 15 % Restleben; Spielversion in hello/welcome (`netVersionCheck`) und Update-Leiste mit Prüfung alle 5 min; Risse werden mit der Gruppe geteilt (`pr`) und bleiben in der Gruppe offen; Dungeon-Licht `MOOD3.dungeon` heller, Dungeon-Färbung auf 40 %
- **6.2 Eigene Maps und Balancing**: jedes Gebiet eine eigene Map mit Region (`WORLD_MAPS`, Maps 1 und 4–9 im oberen 300 × 300-Bereich, Maps 2/3 darunter), Lager mit Weltentor und Händlerin (`camp`), 4 Kacheln Felsrand (`MAP_BORDER`), keine Weltportale draußen, Dungeon-Eingänge in den Maps ihrer Gebiete, `WORLD_VERSION` 6; Ausrüstung erst ab `itemLevelReq` (Stufe der Gegenstandsstufe); Monster zwischen Stufe 15 und 30 zusätzlich bis +20 % Leben und +40 % Angriff; Kampf-Simulation (Stufe 40 gegen 40/50/60, normal/gut/max) als Maßstab
- **6.3 Ninja-Umbau und volle Lager**: Weg des Dolches mit Hinterhalt (`ambushMul` 2, `ambushRange` 220: aus der Tarnung Sprung hinter das Ziel, mit `nextHitMul` zusammen 6×) und Blitzangriff (neuer Fertigkeitstyp `blink`, gemeinsame Hilfsfunktion `blinkBehind`); Ultimative Attacke Schattendoppelgänger (`schattenklone`) mit `game.clones` (durchscheinende Spielerkopien in 2D und 3D, auch beim Mitspieler sichtbar); alte Bücher werden in `loadSave` umbenannt; alle neun Leute aus Vlotho in jedem Lager (`CAMP_SPOTS`) und jeder Stadt (`TOWN_SPOTS`) mit eigenen Namen je Map (`MAP_PEOPLE`), `game.nearNpc` nimmt die nächste Person
- **6.4 Große Maps, 3D-Effekte, Ränge**: alle Maps 300 × 120 wie Vlotho (Raster rechts von Vlotho, `WORLD_W` 900, `WORLD_H` 480, Dungeon-Streifen östlich, freie Flächen Fels, `WORLD_VERSION` 7 mit Umzug ins Lager derselben Map), Monstergruppen der Maps 4–9 ×1,3; neue Datei `js/drei-fx.js`: Ringe, Säulen, Blitze, Ketten, Strahlen, Schnitte (gewölbte Sicheln), Schwünge, Runen und Geschoss-Glühen als 3D-Körper aus einem Vorrat (`FX3_TYPES` zeichnet die 2D-Ebene nicht mehr); Rang-Aussehen über `fxRank`/`withRank` (Rangfarbe, Größe, Funken, stärkere `rankCastFx`/`rankHitFx`); Netz: Host nimmt tödliche Treffer der Mitspieler immer an, Mitspieler schickt einmal nach; Monster kommen erst wieder, wenn kein Spieler an ihrem Platz ist (30–45 s); Schmied: Hinweis-Box am `body`, nur das nötige Teil, Segensschriftrolle merkt sich den Haken (`scrollPref`)
- **6.5 Endbosse, Monster-Schmuck, Wanderer**: 9 Endboss-Arenen als Dungeons mit `raid` (`RAID_DEFS` in zonen.js, Monsterarten mit `raid: { art, scale, map }`, `RAID_ROOMS` mit runder Halle), Boss-KI `updateRaidBoss` (Stampfer, Meteor, Linie, Tank-Schlag, Nova mit sicherem Innenkreis, Wutschrei/Helfer bei 70/35 %, Netz: `raid`/`roar`, Schaden rechnet jeder Spieler selbst), `raidLoot` (3 legendäre Teile `item.legend`); Monster-Schmuck `monsterFlair3` mit Gebietsthemen (`MON3_THEMES`), Monster 15 % größer, leuchtende Teile pulsieren; Mauern um Lager/Städte (`isWallTile` mit Mitte und Halbbreite, `wallVertical`); Wanderer-NPCs (`WANDERERS`, `sideState`, Sammeln mit `SIDE_DROP`); Bodenbeute (`ui.dropAt`, `groundLoot`, Effekt `grounditem`); Bäume/Felsen ×0,3, Deko `STUMP`…`DEADTREE` je Gebiet (`ZONE_DECO`); neue Modelle für Riss und Dungeon-/Endboss-Tor; Riss ohne falschen Lebensbalken; PC-Chat größer
- **6.6 Tränke, Endbosse, Element-Effekte, Rand**: `POTION_CD` 3 s je Sorte (`p.potCd`, Anzeige auf dem Knopf); Trank-Drops von Monstern ~1/5, Seelensteine weniger Tränke; Endbosse `hpMul` ×2, Tempo ×1,35, neue Angriffe `leap`/`charge` (Boss bewegt sich mit `m.dash`), Helfer alle 20 s (`raidMinions`, `m.raidAdd` mit Beute), Raserei unter 20 %; 3D-Elemente je Fertigkeit (`SKILL_ELEMENT`, `ELEMENT3`, neue FX3-Arten `sparks3`, `shards3`, `orbs3`, `column3`, `smoke3`); Nebel-Kasten um die aktuelle Map/Halle (`v3SyncBounds`)
- **6.7 Monster neu, sichtbare Angriffe, neue Tiere**: Monster holen aus (`m.windup`, `windupTime`, Netz-Flag 64) und treffen erst danach (Ausweichen möglich); Angriffsarten je Monster (`ATTACK_STYLE`/`attackStyle`) mit 3D-Posen (`creatureAttackPose`) und Treffer-Effekten (`monsterStrikeFx`, neue FX3-Arten `bite3`, `claw3`); eigene Modelle in `js/drei-tiere.js` (`boar3`, `mammoth3`, `deer3`, `MON3_BUILD`), Kiefer-Glied für alle Vierbeiner, schlanke Hunde/Wölfe (`lean`), Katzen (`cat`, `tufts`, `stub`, `longTail`), Monsteraugen und Buckel für Brocken; 13 neue Tiere mit Monster-Teilen; Prompt-Katalog `docs/monster-prompts.md`
- **6.8 Kanäle ohne PeerJS-Server, mehr Monster**: eigener Verbindungsaufbau `js/netz-signal.js` (`SigPeer` als `window.Peer`): Kanal-Thema bei ntfy.sh für Übernehmen (`claim`/`taken`), Lebenszeichen des Hosts (`host` mit Spielerzahl alle 20 s und bei Wechseln, `bye` beim Verlassen), Angebot/Antwort mit allen ICE-Kandidaten in einer Nachricht, danach WebRTC-Datenkanal (JSON, lange Nachrichten in Stücken); Kanal-Auswahl liest nur die Lebenszeichen (`sigChannelInfo`); `MOB_DENSITY` 0,95, `WORLD_SCALE_STONES` 2,6, mehr Gruppen auf Map 2 und 3
- **6.9 Tagesbelohnung, Schamane, Halten am Handy**: `js/tagesbelohnung.js` (`DAILY_DAYS`, `dailyState`, `claimDaily`, `renderDaily`, Spielstand-Feld `daily` mit `last`/`streak`, Fenster `panelDaily`, Knopf `btnDaily`, Taste T, Abzeichen); Schamane Weg des Drachen: `talisman` → Glutlotus (`blast` mit `fx: 'lotus'`, `lotusFx`), `drachengebruell` → Drachenwirbel (neuer Typ `vortex`, `vortexFx`), auch für Mitspieler sichtbar (`remoteSkillFx`); Angriffsknopf `input.touchAttack` wie Leertaste
- **7.0 Mehrspieler im Mobilfunk**: `js/netz-signal.js` neu: Vermittlung über MQTT-Broker (HiveMQ, EMQX; `SigMqtt`, `SigBus` sendet an alle, entdoppelt je Empfänger), Host-Eintrag als gespeicherte Meldung mit „letztem Willen“ (`seelenstein8/ch/<kanal>/host`), Übernehmen mit `claim`/`taken` (kleinere Nummer gewinnt), Angebot/Antwort über `…/in` bzw. `seelenstein8/p/<id>`; Spieldaten zuerst per WebRTC, nach 5 s ohne Kanal über die Broker (`SigConn.startRelay`, `via: 'relay'`, laufende Nummern gegen Doppeltes); Anzeige „Umweg“ unter der Karte; ntfy.sh entfällt (Tageslimit)
- **7.1 Feuer-Schamane**: `talisman` → Glutdrache (neuer Typ `dragon`, `dragonFx`, FX3-Art `dragon3`: Kopf aus Kiefern, Hörnern, Barteln und Augen, Leib aus 20 Gliedern mit Zacken und Funken auf einer Bogenbahn), `blitzschlag` → Feuerhagel (`blast` mit `fx: 'hail'`, `hailFx`, FX3-Art `meteor3`, 10 Brocken, je Einschlag `splash` 55); Glutlotus entfällt
- **4.5**: Angriff nur per Antippen (kein Dauerangriff beim Gedrückthalten, kurzer Puffer und Hinlaufen zum Ziel pro Tipp); Welt vergrößert: Map 1 300 × 300 Kacheln (vorher 200 × 200), Map 2 und 3 je 200 × 200 mit eigener Stadt (Oase Sahra, Klammfeste: Händler, Waffen, Rüstung, Schmied, Alchemist, Weltentor, Häuser, Brunnen, Marktstände); Stufenringe von der Stadt nach außen neu verteilt, mehr Monstergruppen und Seelensteine für die größere Fläche; Weltportale oben links und unten rechts jeder Map führen in die Stadt einer anderen Map; Prompt in `docs/bild-prompts.md` (Version 4.5)
- **4.4**: Männlich und weiblich für alle Klassen (Aussehen-Editor, 2D und 3D: Wimpern, Lippen, Zopf unter Kapuze/Helm, schmalere Taille; Männer breiter, kräftige Brauen, ohne Wangenröte); Auftragsliste rechts mit Ziel, Fortschritt und Fundort (Gebiet · Map), einklappbar; Schmied zeigt alle Monster-Teile, Hinweis beim Antippen/Darüberfahren mit Monster, Stufe und Map, auch im Beutel
- **4.3**: Seelensteine als glühende Eier in einer Krallen-Wiege (3D und 2D), Risse bei 75/50/25 % Leben, Wellen nach jeweils 10–15 % Schaden mit Monstern auf Stufe des Steins (höchstens 9), die beim Zerbrechen des Steins mitsterben (mit Beute, angelehnt an die Steinsorte); rund halb so viele Monster in der Welt; kein Angriff von selbst ab 10 Stufen Unterschied; Klassen-Look: Krieger mit Plattenharnisch, schweren Schultern, Beintaschen, Beinschienen, Fell; neue Waffen Axt (Einhand, mit Schild) und Streitaxt (Zweihand, Weg des Leibes); Ninja nur Stoff und Leder, Schamane Stoffumhang, Nekromant Schädel-Schultern; Prompts in `docs/bild-prompts.md` (Version 4.3)
- **4.2**: Schadenszahlen kleiner und rechts oben versetzt (Figur und Gegner bleiben sichtbar, Meldungen wie „Zu wenig Mana“ und Stufenaufstieg weiter mittig); Chat-Kanäle Global, Gilde und Ort als Reiter im Chat und in der Eingabe, Gildenchat nur für Mitglieder, Ortschat im Umkreis, roter Punkt bei neuen Nachrichten
- **3D 4.1 – Leistung und Qualität**: Figuren-Pool (Figuren, Skelette und Materialien werden wiederverwendet, kein Speicherleck mehr bei vielen Kills), Gefallene übernehmen die Figur des Monsters, alle Shader werden beim Start vorab übersetzt, Modelle für Monster in der Nähe werden vorab gebaut, Figuren außerhalb des Bildes werden nicht gezeichnet; Sparformat für Eckdaten (8-Bit-Normalen, -Farben und -Knochen), Arbeitsspeicher-Kopien werden nach dem Hochladen freigegeben, Vorlagen für wiederkehrende Objekte, Landschaft wird in kleinen Zeitscheiben nachgeladen (nach einem Sprung sofort), Weltschatten fest eingebacken – gemessen: Grafikspeicher 24 → 15 MB, JS-Heap 47 → 21 MB. Figuren neu: Gesichter mit Iris, Pupille, Glanzpunkten und Lidstrich (ohne Umriss), Haare aus Strähnen, geschichtete Kleidung, Lamellenpanzer, Helme und Kapuzen je Klasse, Waffen mit Hohlkehle und Edelstein; Monster mit Schnauze, Fell, Gelenken, Spinnen mit Augenkranz, Skorpione mit Panzerplatten, Schlangen als biegsamer Schlauch, Naga, Geister, Golems aus Felsbrocken; farbige Toon-Schatten, Randlicht und Glanz; Prompt in `docs/bild-prompts.md` (Version 4.1)
- **Einstellungen 3.7** (Zahnrad, Taste O): Klänge an/aus und Lautstärke, Grafik Hoch/Mittel/Niedrig (Auflösung, Schlagschatten, Wolkenschatten, Partikel), Kamera Nah/Normal/Weit, Bildschirmwackeln, Schadenszahlen, Namen der Bewohner, Vibration; Aussehen ändern, Server, Hilfe, zum Startbildschirm; im Browser gespeichert
- **Figur 3.7**: Augen mit Weiß, farbiger Iris, Pupille, Glanzpunkten und Lidstrich; Ohren, Nase, Hals, Schatten unter dem Kinn, Mittelnaht, Ellbogenfalte, Hände mit Daumen, Hosen mit Naht und Kniefalte, Stiefel mit Sohle und Schnürung; Krieger mit Schlitzen im Panzerrock und Nieten, Ninja mit Tabi, Schamanin mit gesticktem Saum, Nekromant mit Rune und Flicken, Roben mit Falten
- **Schmied 3.6**: bis +6 geht nichts kaputt (Fehlschlag kostet nur das Material), ab +7 kann der Gegenstand zerbrechen; Schmiede-Szene über den ganzen Bildschirm mit drei Hammerschlägen, Funken, Glühen und Spannung, dann Goldstrahlen und „+X“, Rauch, blauer Schutzschein oder zerspringende Hälften; Klänge aus Web Audio für Hammer, Erfolg, Fehlschlag, Schutz und Bruch, „Ton an/aus“ beim Schmied
- **Stadt Vlotho**: die Stadt in der Mitte von Map 1 heißt jetzt Vlotho
- **Aussehen 3.5**: bei der Erstellung 6 Frisuren, 8 Haarfarben, 7 Hauttöne, 4 Augenformen, 6 Augenfarben und 4 Gesichtszeichen (Sommersprossen, Narbe, Kriegsbemalung), drehbare Vorschau, „Zufällig“; später im Charakterfenster änderbar; Mitspieler sehen es
- **Ping**: das Funkzeichen unter der Karte misst immer echt (allein zum Spielserver, im Kanal zum Host) und zeigt Millisekunden oder „offline“
- **Neue Symbole**: Rucksack für das Inventar, Beutesack mit Goldmünzen für die Beute
- **HUD 3.4**: Lebensanzeige ohne dunkles Fenster, kleiner und schlanker; Karte weiter rechts; Kanal und Spielerzahl klein in der Statuszeile; Menüknöpfe als lackierte Münzen mit Messingring und neuen Symbolen
- **EP 3.4**: EP-Leiste mit Messingrahmen, Zehntel-Markierungen, Glanz und Aufleuchten; bei jedem Kill und jeder Belohnung erscheint „+… EP“ groß über der Figur, violette Funken fliegen vom Monster zur Figur
- **Statuspunkte 3.4**: leuchtende Punktekugel, vier farbige Karten mit Symbol, Wert, Fortschritt bis 90, aktuellem Nutzen und +, +5, Alle; Plus am Porträt, solange Punkte frei sind
- **Mitspieler antippen**: Karte oben mit Duell, Freundschaftsanfrage, Gildeneinladung, Handeln und Betrachten; Anfragen erscheinen beim anderen mit Annehmen/Ablehnen
- **Duell**: 3 Sekunden Countdown, roter Kreis, alle Angriffe und Fertigkeiten treffen den Gegner (60 % Schaden, eigene Verteidigung zählt), bei 1 Leben ist das Duell verloren, niemand stirbt
- **Handel**: bis zu 8 Gegenstände und Gold je Seite, jede Änderung hebt die Bestätigungen auf, getauscht wird erst bei beidseitiger Bestätigung desselben Angebots
- **Betrachten**: Ausrüstung mit Figur, Boni und Werten des anderen, Vergleich mit der eigenen
- **Figur 3.3**: Kraftpose beim Buffen (Arme hoch, kleiner Sprung, aufsteigende Lichtringe), kurzes Zucken und rotes Aufblitzen bei Treffern, Staubwölkchen beim Laufen, Spielfiguren in höherer Auflösung, Mund und Augenbrauen
- **HUD 3.3**: kleiner Chat unten links (immer sichtbar, Sprechblase zum Schreiben), Beute-Beutel darüber statt neben den Tränken, Gold als Münzstapel im Kopf des Inventars, unter der Karte Uhrzeit, Ping und Akku (wo der Browser ihn verrät)
- **8 Dungeons**: neu Banditenkeller (ab 10), Totengruft (ab 38), Schlangentempel (ab 44, Map 2) und Titanenschmiede (ab 60, Map 3) mit eigenen Bossen (Banditenfürst Raku, Gruftkönig Morvan, Naga-Königin Sseth, Titanenkönig Kroth)
- **Dungeon-Risse**: ab Stufe 10 öffnet sich alle paar Minuten in der Nähe ein Riss, 5 Minuten offen, führt in einen zufälligen Dungeon der eigenen Stufe
- **Freunde & Gilde** (Taste G): Freundschaftsanfragen an Spieler im Kanal, Freundesliste mit Online-Anzeige; ab Stufe 40 Gilde gründen für 5.000 Gold, Spieler einladen, Mitglieder entfernen, verlassen oder auflösen; Gildenname mit eigener Farbe über den Köpfen
- **Grafik 3.2**: Schlagschatten aller Figuren nach unten rechts, Licht von oben links mit hellem Saum an jeder Figur, Atmen im Stand, Vorlehnen beim Laufen
- **Glitzern ab +8**: starke Ausrüstung funkelt an der Figur und im Inventar
- **Lebensbalken** mit rundem Bild der Figur, schrägem Messingrahmen, Herz und Tropfen, flüssiger Füllung mit wanderndem Glanz; bei wenig Leben schlägt das Herz. Lebensraub erscheint als grüne Zahl
- **Attacken**: Schwertwirbel und Wirbelklinge lassen die eigene Waffe als leuchtende Riesenklinge um die Figur kreisen, Schwünge haben spitz zulaufende Leuchtschweife und eine Geisterklinge
- **Grafik**: weiche Schatten, ziehende Wolkenschatten, warmes Licht von oben links und dunklere Bildränder
- Umgebung im ostasiatischen Stil: Laubbäume, Kirschbäume, Tannen, tote Bäume und Felsen je Zone, Häuser mit geschwungenen Dächern und Laternen, Steinlaternen und Brunnen im Dorf, weiche Bodenübergänge, Ufer mit Gischt. Figuren können hinter Bäume und Dächer laufen, die dann durchsichtig werden
- Steuerung per Tastatur oder Touch: schwebender Steuerknüppel auf der ganzen linken Hälfte, Knöpfe lösen beim Aufsetzen aus, damit Angriff, Tränke und Fertigkeiten gleichzeitig gehen

## Steuerung

| Taste | Aktion |
| --- | --- |
| WASD / Pfeile | Laufen |
| Leertaste halten | Angreifen, läuft automatisch zum nächsten Monster |
| 1–5 | Fertigkeiten |
| 6 | Ultimative Attacke (ab Stufe 30) |
| G | Freunde & Gilde |
| Q / E | Drachenblut (Leben) / Mondtau (Mana) |
| Tab, Mausklick | Ziel wählen |
| I | Inventar |
| B | Beute |
| F | Mit Händlern oder dem Schmied sprechen |
| C / H / Esc | Charakter, Hilfe, Fenster schließen |

## Aufbau des Codes

Die Skripte werden in dieser Reihenfolge geladen und teilen sich ihre Variablen.

| Datei | Inhalt |
| --- | --- |
| `js/daten/klassen.js` | Klassen, Grundwerte, zwei Wege mit je fünf Fertigkeiten |
| `js/daten/monster.js` | Monsterarten, die 14 Seelensteine und ihre Beute |
| `js/daten/zonen.js` | Zonen mit Stufenbereichen und Monstergruppen, Waren der Händlerin |
| `js/daten/quests.js` | Aufträge des Dorfältesten, Waren des Alchemisten, Gespräche |
| `js/daten/gegenstaende.js` | Ausrüstungsplätze, Gegenstandsstufen, Namen, Werte und Effekte, Boni, Materialien, Händler, Schmied-Tabelle |
| `js/welt.js` | Karte erzeugen, Kollision, Zonen abfragen |
| `js/spieler.js` | Figur, Werte, Erfahrung, Tränke, Speichern |
| `js/kampf.js` | Schadensformel, Angriffe, alle Fertigkeitsarten, Geschosse, Effekte |
| `js/gegner.js` | Monster-KI, Respawn, Seelenstein-Wellen, Skelette |
| `js/netz.js` | Mehrspieler: Server und Kanäle, Übernahme des Kanals, Abgleich von Spielern und Monstern, Chat |
| `js/peerjs.min.js` | PeerJS (MIT-Lizenz) für die Verbindung, wird erst beim Mehrspieler geladen |
| `js/ausruestung.js` | Gegenstände, Beute, Inventar, Händler, Schmied, Symbole und die zugehörigen Fenster |
| `js/figuren.js` | Aussehen aller Figuren und Monster: Klassen in drei Blickrichtungen mit Laufanimation, Waffen, Händler, Skelette |
| `js/effekte.js` | Partikel, Schwungspuren, Treffer, Schadenszahlen, Geschosse, Bildschirmwackeln |
| `js/fertigkeiten.js` | Symbole der Fertigkeiten, Effekte je Fertigkeit, Auren aktiver Buffs |
| `js/optionen.js` | Einstellungen: Ton, Grafikstufe, Kamera, Wackeln, Vibration, Zahlen, Namen |
| `js/klang.js` | Klänge (Web Audio): Hammer, Erfolg, Fehlschlag, Schutz, Bruch |
| `js/ultimativ.js` | Ultimative Attacken ab Stufe 30: Ablauf, Symbole und Effekte |
| `js/gemeinschaft.js` | Freunde und Gilden: Anfragen über den Host, Fenster, Gildenwappen |
| `js/interaktion.js` | Mitspieler antippen: Spielerkarte, Betrachten, Handel, Duell |
| `js/umgebung.js` | Boden (vorgezeichnet in Blöcken), Bäume, Felsen, Häuser, Dorfschmuck und Tiefensortierung |
| `js/zeichnen.js` | Grafik auf dem Canvas und Minikarte |
| `js/oberflaeche.js` | Startbildschirm, Anzeigen, Fenster |
| `js/quests.js` | Aufträge, Jagden, Reisen, Alchemist, umherlaufende Dorfbewohner |
| `js/eingabe.js` | Tastatur, Maus, Touch |
| `js/spiel.js` | Spielzustand und Hauptschleife |
| `manifest.webmanifest`, `sw.js`, `icons/` | Installation als App, Offline-Betrieb, App-Icons |

Neue Monster, Zonen oder Fertigkeiten lassen sich meist allein in den Dateien unter `js/daten/` ergänzen.

Prompts für Bildgeneratoren, mit denen sich Figuren und Monster im Stil des Spiels erzeugen lassen, stehen in [`docs/bild-prompts.md`](docs/bild-prompts.md).

## Nächste Etappen

1. Bossmonster
2. Mehrspieler und echte Zweikämpfe für die PvP-Wege: Server mit Node.js und WebSockets, andere Spieler sehen, Chat, Gruppen
3. Accounts und Speichern auf dem Server
