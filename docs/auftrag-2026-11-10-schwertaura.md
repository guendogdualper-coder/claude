## Schwertaura | Wirk-Animation und ruhigere Dauer-Aura (14.61)

**Wunsch (Spieler):** Beim Aktivieren der „Aura des Schwertes“ kamen große Feuerstrahlen/Flammenflügel heraus, die
Figur wurde überstrahlt. Gewünscht: schöner animieren, weniger Feuer, Waffen je Bewaffnung hochrecken, Klingen kurz
aufleuchten lassen, am Boden ein leuchtender Kreis und eine Aura, die nach oben steigt.

**Ursache der Flammenflügel:** Beim Wirken mit Rang V (Vollendet) legt `rankCast3` (rang-fx.js) Flammenflügel,
Feuerkrone, Glutsturm, Sonnenrad und Himmelsstrahl über jede Fertigkeit; dazu kamen Lichtsäule, Lichtkranz und
Bildschirmschein aus `SKILL_FX.schwertaura.cast` und die Flammenhülle der Körperaura (KA_FLAME.klinge).

**Änderung**
- Wirk-Animation (1,5 s, Figur bleibt steuerbar; Beine laufen beim Gehen weiter): `anim: 'schwertaura'` in
  klassen.js, Pose `SKILL_POSE3.schwertaura` (drei-figuren.js):
  zwei Waffen → beide Arme schräg hoch, Klingen als V über dem Kopf; Zweihänder → beide Hände am Griff, Klinge
  senkrecht hoch; Einhand + Schild → Schwertarm hoch, Schild vor dem Körper. Waffe leuchtet in der Rangfarbe auf.
- Effekt `sacast3` (ninja-fx.js, `schwertauraCast`): Lichtblitz läuft die Klinge(n) entlang, Lichtteich am Boden
  (weiche Lichtpfütze + sanfte Schockwelle, ausdrücklich gewünscht – keine Runen, Sterne oder Zeichen), aufsteigender
  Lichtschleier und flammenartige Schleier. Ohne Rang golden, E/H/L/V in der Rangfarbe, höher und dichter je Rang.
  Teile aus dem gemeinsamen Vorrat (fx3Take), nach 1,5 s frei. 2D: Kraftpose + Lichtteich/Schleier (EXTRA_EFFECTS).
- Ersetzt: Lichtsäule, Lichtkranz und Bildschirmschein beim Wirken; Rang-Effekte für diese Fertigkeit nur leise
  (`rankSoft` → `rankCastFx(…, soft)` / `rankCast3(…, soft)`: nur die Funkenspirale, kein Schein, kein Beben).
- Dauer-Aura: KA_FLAME.klinge niedriger, enger, Deckkraft 0,8, weite Außenlage fast aus (wideOp 0,4 → 0,12);
  weniger, kleinere Zungen (KA_STYLES.klinge). Gilt für alle Buffs des Klingen-Weges. Die Lichtklinge der Schwertaura
  wächst jetzt mit dem Rang (ohne Rang 70 %, V 100 %), so bleibt E→V erkennbar.
- Mitspieler: Pose kommt über den Spielerzustand (swingKind/swingDur in netz.js), Lichtteich und Aura über die
  vorhandene Fertigkeits-Nachricht (`remoteSkillFx` → `SKILL_FX.schwertaura.remoteCast`, Rang aus `rk`).
  Ältere Clients sehen die neue Pose als normalen Schwung und weiter die Lichtsäule.

**Dateien:** js/daten/klassen.js, js/kampf.js, js/fertigkeiten.js, js/rang-fx.js, js/ninja-fx.js,
js/drei-figuren.js, js/koerperaura.js, js/interaktion.js, js/zeichnen.js

**Offene Punkte:** Aus der steilen Spielkamera wirkt „hochgereckt“ verkürzt (die Klingen zeigen zur Kamera);
Pose bei Reittier entfällt (Wirken steigt ab). Kein neuer Text, darum nichts in en.js.

## Schwertaura V | Bodenbruch beim Aktivieren (seit 14.62)

**Wunsch (Spieler):** „Auf V muss der Boden einen kreisförmigen, blauen, kurzen Aura-Kreis zeichnen und Steine
hochgehen, damit es epischer aussieht. Jede Attacke soll auf V krass aussehen.“

**Änderung (nur Rang V, E/H/L und ohne Rang unverändert):** neuer Effekt `sabruch3` (ninja-fx.js, `SA_BRUCH`),
von `schwertauraCast` zusätzlich zu `sacast3` gelegt; bleibt am Ort des Wirkens, 1,75 s:
- 0,05–0,3 s blaues Licht sammelt sich unter den Füßen; 0,3 s Aufschlag (gleichzeitig mit dem Klingenblitz):
  blauer Energiering (weiches Glühen, kräftiger Ring, heller Kern) springt auf, zwei Schockwellen laufen nach
  außen, Lichtschlag, Risse im Boden leuchten blau. Ausnahmsweise ein Bodenkreis, weil ausdrücklich gewünscht –
  reine Energie, keine Runen, Sterne oder Zeichen. Ring pulsiert bis 1,2 s und ist bei 1,6 s weg.
- 14 Brocken (Grafik „Niedrig“ 8) brechen im Kreis aus dem Boden, steigen drehend auf (verschiedene Größen),
  schweben, fallen ab etwa 1,1–1,3 s und zerbröseln; Staub beim Ausbrechen und Aufschlagen, blaue Funken aus
  den Rissen. Farbe aus dem Kartenboden (wie Sprungschlag), grau-braun gemischt; auf Wasser nur Ring/Wellen.
- Leichtes Beben (shakeScreen 3,5) im Aufschlag – nur beim eigenen Krieger und nur mit „Bildschirmwackeln“.
- Teile aus dem gemeinsamen Vorrat (`rock`: eine Geometrie; `plane`/`planeN`/`sprite`/`smoke`), jedes Bild
  zurückgegeben; nach Ablauf ist der Effekt aus `game.effects` und keine Brocken mehr sichtbar (geprüft).
- 2D: blauer Ellipsenring mit Schockwelle und sieben Brocken, die hoch- und wieder runtergehen.
- Mitspieler: über den bestehenden Weg `remoteSkillFx` → `SKILL_FX.schwertaura.remoteCast(rp, rk)` (rk 3 = V),
  ohne Beben.

**Dateien:** js/ninja-fx.js

**Andere Krieger-Fertigkeiten auf V (nur Bestandsaufnahme):** Sichelwelle, Schwertwirbel, Kampfrausch,
Sprungschlag, Felsenfaust, Erdbeben, Starker Körper, Geistesschlag, Kriegsschrei haben keine eigene V-Fassung –
auf V kommt nur der allgemeine Rang-Effekt (`rankCast3`: Flammenflügel, Feuerkrone, Glutsturm; Treffer mit
Feuernova/Glutregen). Der Angriff selbst sieht auf E/H/L/V gleich aus.
