# Seelenstein-Wiki – Auftrag (Prompt)

Dieser Prompt beschreibt das Spieler-Wiki von Seelenstein: eine eigene, schöne Webseite neben dem Spiel, auf der vor allem Anfänger alles nachschlagen können – was es wo gibt, wo man es farmt, bei welchem NPC man was bekommt, wie eine Attacke aussieht und was sie macht.

> **Prompt:** Baue für das Browser-MMORPG „Seelenstein“ ein deutschsprachiges Spieler-Wiki im Stil großer Spiele-Wikis, aber hochwertig gestaltet wie die Patch-Übersichten (dunkles Nachtblau, Gold, die Schriften „Marcellus SC“ und „Alegreya Sans“ aus dem Spiel). Alle Inhalte kommen direkt aus den Spieldaten – nichts wird von Hand abgeschrieben, damit das Wiki bei jedem Update mit einem Befehl neu gebaut werden kann. Jeder Eintrag zeigt sein echtes Bild aus dem Spiel: Fertigkeitssymbole, Gegenstandssymbole, Materialien, Bücher, Schriftrollen, Tränke, Monster- und NPC-Figuren. Oben steht eine große Suche, die schon beim Tippen alles durchsucht (Namen, Beschreibungen, Fundorte, Gegenstände, Monster, NPCs, Karten, Fertigkeiten) und Treffer mit Bild, Kategorie und kurzer Antwort zeigt – zum Beispiel „Fertigkeitsbuch“ → „Lehrmeister in jeder Stadt · Seelensteine ab Stufe 40 lassen Fertigkeitsschriftrollen fallen“. Ein Klick öffnet die Detailseite mit allen Werten und Querverweisen (Monster → Karte → Seelenstein → Beute → Schmied). Die Seite funktioniert auf dem Handy und am PC, lädt schnell, braucht keinen Server und ist von der Startseite des Spiels und aus dem Spiel heraus (Hilfe-Menü) erreichbar.

## Inhalt (Kategorien)

1. **Erste Schritte** – Steuerung am Handy und PC (Tasten), Klassen wählen, die ersten Stufen, wohin gehen, was zuerst tun (Hauptquest, Tagesbelohnung, Lehrmeister), Tipps.
2. **Klassen und Wege** – alle Klassen mit Grundwerten, beide Wege je Klasse, jede Fertigkeit mit Symbol, Freischaltstufe, Mana, Abklingzeit, Werten und Text; Ulti je Weg; Ränge (Erwacht, Heroisch, Legendär, Vollendet) und wie man erweckt.
3. **Karten und Gebiete** – jede Map mit Stufenbereich, Stadt bzw. Lager, Weltentor, welche Monster und Seelensteine dort leben, welche Dungeons und welcher Endboss.
4. **Monster** – jedes Monster mit Bild, Stufe, Leben, Gebiet, Besonderheiten (Boss, Fernkampf), Beute und Aufwertungsmaterial.
5. **Seelensteine** – Stufen, wo sie stehen, Wellen, was sie fallen lassen (Fertigkeitsschriftrollen ab 40, Segensschriftrollen ab 35, Switcher ab 30).
6. **Dungeons und Endbosse** – Eingänge, Räume, Bosse mit Fähigkeiten, Raid-Mechaniken (Kristallschild, Vernichtung), Beute.
7. **Ausrüstung** – Plätze, Stufen der Gegenstände mit Mindeststufe, Waffenarten je Klasse, Grundwerte, Boni, Sonderboni, Obergrenzen.
8. **Schmied und Aufwertung** – +1 bis +20, sicher bis +6, Bruchgefahr, benötigte Materialien und wo man sie farmt, Segensschriftrolle.
9. **Materialien und Verbrauchsgüter** – Monster-Materialien, Aufwertungsteile, Switcher, Tränke S–XXL, Schriftrollen – jeweils mit Fundort.
10. **NPCs und Händler** – wer wo steht und was er macht: Händler, Schmied, Alchemist, Lager, Lehrmeister, Stallmeister, Dorfältester, Wanderer, Weltentor; Preise.
11. **Quests** – Hauptquestreihe Kapitel für Kapitel, Stallmeister-Mission, Wanderer-Aufgaben, Belohnungen.
12. **Systeme** – Gruppe, Gilde und Freunde, Handel, Duell, Pferde, Tagesbelohnung, Statuspunkte, Inventar und Lager, Kanäle.
13. **FAQ** – kurze Antworten auf die häufigsten Fragen („Wo bekomme ich Fertigkeitsbücher?“, „Wie werde ich ein Pferd?“, „Was bringt der Switcher?“).

## Technik

- `tools/wiki-bauen.js` startet das Spiel kopflos (Playwright), liest die Spieldaten (Klassen, Monster, Karten, Gegenstände, Quests, NPCs) und zeichnet alle Bilder mit den Zeichenfunktionen des Spiels in `wiki/bilder/`. Ergebnis: `wiki/daten.js` (ein Objekt `WIKI`).
- `wiki/index.html`, `wiki/wiki.css`, `wiki/wiki.js`: statische Seite, Suche im Browser, Kategorien, Detailseiten über den Adress-Anker (`#monster/wolf`), Querverweise, Handy-Ansicht.
- Neu bauen nach einem Update: `node tools/wiki-bauen.js` (lokaler Server auf Port 8766).
