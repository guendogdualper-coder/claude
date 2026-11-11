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
