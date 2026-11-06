# Prompt: Neue Boni (Gift, „Stark gegen …“, Gold und Beute) und PvP-Balancing

Arbeitsauftrag für Seelenstein (Plain-JS, globale Funktionen, three.js r128). Antworten und Texte im Spiel auf
Deutsch, englische Übersetzung in `js/sprachen/en.js` ergänzen. Nichts aus anderen Spielen nachbauen (Namen,
Symbole, Klänge): die Ideen sind allgemein üblich, die Umsetzung ist eigen.

## Ausgangslage (Stand 14.14)

- Boni stehen in `js/daten/gegenstaende.js`: `BONUS_TYPES` (Bonus 1–5), `SPECIAL_BONUS_TYPES` (Bonus 6/7 über den
  Sternenstein), `BONUS_CAPS` (Obergrenze der Summe aller angelegten Teile). Gewürfelt wird in `rollBonus()`
  (`js/ausruestung.js`), angezeigt mit `bonusText()`.
- Es gibt schon: Max. Leben/Mana, Angriff, Verteidigung, Stärke, Vitalität, Intelligenz, Geschick, Kritische
  Treffer, Angriffstempo, Lauftempo, Ausweichen, Blocken, Lebensregeneration, Stark gegen Monster,
  Schadensreduktion, Lebensraub sowie (6/7) Fertigkeitsschaden, Normaler Schaden, Max. Leben %, Erlittener Schaden.
- Monster haben eine Gestalt `shape` in `js/daten/monster.js` (beast, boar, humanoid, orc, brute, demon, ghost …).
  Daraus lässt sich die Art ableiten, ohne jedes Monster einzeln anzufassen.
- Debuffs am Monster werden seit 13.41 mit Restzeit und Schaden angezeigt (Brand, Gift, Verlangsamung, Flüche).
  Ein Gift aus dem Bonus nutzt genau diese Anzeige. Beim Spieler erscheint es in der Buff-Leiste als Debuff.
- PvP: `DUEL` in `js/interaktion.js` (`pvpMul 0.6`, ein Treffer höchstens 25 % des Lebens, krit. 35 %, nur
  bei weniger als 10 Stufen Abstand). Gleiche Formel in `js/turnierarena.js` (Ranked und 4v4).

## Teil 1: Neue Boni

Werte sind Spanne auf Gegenstandsstufe 1 → wachsen wie die übrigen Prozentwerte um 10 % je Stufe bis `max`
(je Gegenstand). `Summe` ist der neue Eintrag in `BONUS_CAPS`.

| id | Name im Spiel | Teile | Spanne | max je Teil | Summe |
|---|---|---|---|---|---|
| `poison` | Vergiftungschance | Waffe | 1–4 % | 12 % | 12 % |
| `critDmg` | Kritischer Schaden | Waffe, Köcher, Helm | 3–8 % | 15 % | 40 % |
| `vsBeast` | Stark gegen Tiere | Waffe, Helm, Gürtel, Köcher | 2–6 % | 12 % | 25 % |
| `vsHuman` | Stark gegen Menschen | Waffe, Helm, Gürtel, Köcher | 2–6 % | 12 % | 25 % |
| `vsOrc` | Stark gegen Orks und Riesen | Waffe, Helm, Gürtel, Köcher | 2–6 % | 12 % | 25 % |
| `vsUndead` | Stark gegen Untote und Geister | Waffe, Helm, Gürtel, Köcher | 2–6 % | 12 % | 25 % |
| `vsDemon` | Stark gegen Teufel und Dämonen | Waffe, Helm, Gürtel, Köcher | 2–6 % | 12 % | 25 % |
| `resHuman` | Abwehr gegen Menschen | Rüstung, Helm, Schild, Umhang, Schuhe | 2–5 % | 10 % | 30 % |
| `resMagic` | Abwehr gegen Magie | Rüstung, Helm, Schild, Umhang, Schultern | 2–5 % | 10 % | 25 % |
| `resMelee` | Abwehr gegen Nahkampf | Rüstung, Schild, Schultern, Schuhe | 2–5 % | 8 % | 20 % |
| `resRanged` | Abwehr gegen Fernkampf | Rüstung, Umhang, Schuhe, Gürtel | 2–5 % | 8 % | 20 % |
| `goldFind` | Mehr Gold | Helm, Schuhe, Gürtel, Umhang, Schultern | 2–5 % | 8 % | 25 % |
| `dropFind` | Mehr Beute | Helm, Schuhe, Gürtel, Umhang, Schultern | 2–5 % | 8 % | 25 % |

Zuordnung der Arten (eine Funktion `monsterKind(m)` in `js/kampf.js`, Bosse und Steine erben vom Typ):
- Tiere: `beast`, `boar` und alle Tier-Mobs (Wolf, Bär, Spinne, Skorpion, Drache).
- Menschen: `humanoid` ohne Untote (Banditen, Hexen, Ritter) **und andere Spieler** (Duell, Arena, 4v4).
- Orks und Riesen: `orc`, `brute`, Golems.
- Untote und Geister: `ghost`, Untoter Krieger, Ghul, Skelette, Seelen.
- Teufel und Dämonen: `demon`, Höllenhund, Feuerdämon, Abaddor und die Höllenthron-Minibosse.

Abwehr-Arten:
- Magie = Fertigkeiten von Magier, Schamane und Nekromant sowie Geschosse zaubernder Monster (Ork-Schamane,
  Frostgeist, Sumpfhexe …). Nahkampf und Fernkampf ergeben sich aus `ranged`.
- `resHuman` wirkt gegen menschliche Monster und gegen andere Spieler. Das ist der eigentliche PvP-Verteidigungswert.

Regeln:
- Alle „Stark gegen …“ addieren sich mit `monsterDmg` (gegen Spieler zählt nur `vsHuman`, nicht `monsterDmg`).
- Mehr Beute wirkt auf Ausrüstung, Tränke und Monsterteile, **nicht** auf Seelenstein-Gegenstände,
  Schriftrollen, Fertigkeitsbücher, Verstärkungen, Switcher und Sternensteine. Die bleiben bewusst selten.
- Mehr Gold multipliziert das Gold von Monstern und Seelensteinen, nicht Quest- oder Arenabelohnungen.
- Die neuen Arten verwässern den Würfeltopf. Darum bekommt `rollBonus` Gewichte je Bonus: Grundwerte (Leben,
  Angriff, Verteidigung, Hauptwert) Gewicht 3, alles andere 1, Gold/Beute 0,7.
- Alte Gegenstände behalten ihre Boni. Kein Migrationsschritt nötig, nur neue Würfe.

### Gift (Vergiftungschance)

- Jeder Treffer (Grundangriff und Fertigkeit, je Ziel einmal pro Treffer) löst mit `poison` Prozent Gift aus.
- Gift: 6 s, tickt jede Sekunde. Gesamtschaden = 40 % des auslösenden Treffers, auf 6 Ticks verteilt.
  Gegen Bosse, Endboss-Kristalle und Seelensteine höchstens 2 % ihres Lebens insgesamt.
- Stapelt nicht: ein neues Gift erneuert Dauer und nimmt den höheren Tickwert.
- Anzeige: grüne Schadenszahlen, Debuff-Symbol „Vergiftet · 4 s · 312/s“ über dem Monster bzw. in der
  Debuff-Leiste des Spielers. In 3D ein dezenter grüner Dunst an der Figur (kein Bodenzeichen, keine Ringe).
- PvP: Gift geht übers Netz mit (`netSocial` wie der Duelltreffer `dh`). Je Tick höchstens 1,5 % des
  Lebens des Getroffenen. Abwehr gegen Menschen wirkt darauf.

## Teil 2: PvP ohne One-Shots

Ziel: Bei ähnlicher Stufe (unter 10 Stufen Abstand) und ähnlicher Ausrüstung dauert ein 1-gegen-1 im Mittel
**10–20 Sekunden**. Kein einzelner Treffer nimmt mehr als 25 % Leben (krit. 35 %), auch nicht Ultis.
Großer Stufenabstand bleibt hart (Stufe 60 darf Stufe 10 umhauen, so gewünscht seit 13.2).

Problem heute: Ein Charakter auf Stufe 80 haut ab 10.000 Schaden je Treffer. Der Deckel je Treffer verhindert den
One-Shot zwar, aber mit vier gedeckelten Treffern ist trotzdem jeder tot, egal wie viel Rüstung er trägt.
Verteidigung zählt im PvP kaum, weil `def / (def + 40 + 5·Stufe)` bei Stufe 80 klein bleibt.

Lösung in vier Schichten (Reihenfolge der Rechnung im Empfänger, `duelReceive` und Arena):

1. **PvP-Faktor nach Stufe** statt fest 0,6:
   `pvpMul = 0.6 − 0.35 · clamp((Stufe − 20) / 60, 0, 1)` → 0,6 bis Stufe 20, 0,25 auf Stufe 80.
2. **Rüstung zählt im PvP doppelt**: `defPvp = 2 · def`, Formel bleibt `defPvp / (defPvp + 40 + 5·(L−1))`.
   Dazu zählen Schadensreduktion, Erlittener Schaden (6/7) und **Abwehr gegen Menschen**, Magie, Nahkampf oder
   Fernkampf (je nach Angriff). Alle Abzüge zusammen höchstens 60 %.
3. **PvP-Lebenspolster**: Im PvP gilt `maxHp · (1 + 0,02 · Stufe)` als Lebenspool (Stufe 80 → 2,6-fach). Umgesetzt
   als Teiler auf den eingehenden Schaden, damit Lebensbalken, Tränke und Heilung unverändert bleiben.
4. **Deckel je Treffer** bleibt (25 % / 35 %). Zusätzlich höchstens 45 % des Lebens innerhalb von 1,5 s
   (gegen Kombos und mehrere Gegner im 4v4).

Weitere PvP-Regeln:
- Betäubung, Einfrieren und Wurf dauern im PvP halb so lang. Danach 4 s Schutz gegen die nächste Betäubung.
- Heilung und Lebensraub wirken im PvP zu 60 %.
- „Stark gegen Menschen“ wirkt gegen Spieler, „Stark gegen Monster“ nicht.

Messen statt raten:
- `tools/balance-sim.js` bekommt einen Modus `--pvp`: jede Klasse und jeder Weg gegen jede andere, Stufen 20, 50
  und 80, Standardausrüstung (`--ausr std`) und Top-Ausrüstung. Ausgabe: mittlere Zeit bis zum Sieg, größter
  Einzeltreffer in % des Lebens, Siegquote je Paar.
- Abnahme: Zeit bis zum Sieg 10–20 s (Median), kein Paar mit mehr als 65 % Siegquote, kein Treffer über 35 %.
- Danach mit zwei Testfiguren im Duell und in der Turnierarena gegenprüfen (zwei Browserfenster, gleicher Kanal).

## Lieferumfang

1. Daten: neue Einträge in `BONUS_TYPES` und `BONUS_CAPS`, Gewichte in `rollBonus`.
2. Kampf: `monsterKind()`, Schadensfaktoren in `js/kampf.js` (Treffer auf Monster) und im PvP-Pfad.
3. Gift: Auslösen, Tick, Anzeige 2D und 3D, Netz-Nachricht fürs PvP.
4. Gold und Beute: in der Beuteberechnung (Monster und Seelensteine) mit den oben genannten Ausnahmen.
5. PvP-Rechnung nach Teil 2 in `interaktion.js` **und** `turnierarena.js` (gemeinsame Funktion statt Kopie).
6. Charakterfenster: neue Werte auf der Seite „Werte“ anzeigen (Summe aller Teile, mit Obergrenze).
7. Simulator `--pvp`, Ergebnis als Tabelle in `docs/balance-pvp.md`.
8. Hilfe, Ratgeber-NPC (Suchwörter „Gift“, „Gold“, „Beute“, „PvP“), Changelog, README, Tests.
