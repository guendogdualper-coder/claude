# Musik-Prompts für Seelenstein

Prompts für KI-Musikgeneratoren (ElevenLabs Music, Suno) – je Stimmung ein Stück, das im Spiel endlos schleift.
Die Prompts sind auf Englisch, weil die Generatoren damit verlässlicher arbeiten. Alle Stücke sind rein instrumental,
eigene Kompositionen im Stil fernöstlich gefärbter Fantasy-Musik; sie sollen keine Musik oder Melodie eines anderen
Spiels oder Films nachahmen. In die Prompts gehören darum auch keine Namen bekannter Spiele, Filme oder Komponisten.

## Warum die Vorgaben zum Schleifen?

Das Spiel spielt jede Datei mit einer Schleife A–B (`tools/klang-erzeugen.py` sucht A und B und bereitet die Naht in
der Datei vor). Sauber klappt das nur, wenn:

- **das Tempo konstant ist** (kein Ritardando, kein Rubato, keine Taktartwechsel). Dann liegen A und B auf Taktgrenzen
  und der Rhythmus läuft über die Naht weiter. Die alten Stücke „feld“ und „dunkel“ hatten keinen festen Puls – dort
  kann das Werkzeug nur nach gleich klingenden Stellen suchen.
- **ein Puls hörbar ist**, auch in ruhigen Stücken (leise Trommel, gezupftes Ostinato in Achteln).
- **Dichte und Lautstärke gleich bleiben** (keine großen Steigerungen, keine Breaks) – sonst springt der Pegel an der Naht.
- **nichts ausgeblendet wird** – das Stück endet auf einem gehaltenen Tonika-Akkord (das Ende wird ohnehin abgeschnitten,
  aber ein ausgeblendeter letzter Teil kostet nutzbare Länge).
- die Länge **2–3 Minuten** beträgt: je länger der gleichmäßige Mittelteil, desto länger die Schleife.
- Tempo **60, 80, 100, 120, 140 oder 160 BPM** im 4/4-Takt: In den bisherigen ElevenLabs-Stücken wiederholte sich das
  Material oft in Abschnitten von 12 s; bei diesen Tempi sind das ganze Takte. Der Boss (145 BPM) wiederholt sich in
  Abschnitten zu 29 Schlägen – das passt in kein 4/4-Raster, seine Schleife zählt darum in Schlägen.

Gemeinsamer Schluss jedes Prompts (in den Prompts unten schon enthalten): konstantes Tempo, durchgehender Puls, kurzes
Vorspiel, 8-Takt-Phrasen, gleichmäßige Dichte, keine Ausblendung, Ende auf der Tonika, instrumental.

## Dorf und Städte (`dorf`) – 80 BPM, D-Dur
```
Calm, warm and welcoming fantasy village theme for an online role-playing game, gently East Asian in flavour. A guzheng plays flowing arpeggios in steady eighth notes, a soft breathy bamboo flute (dizi) carries a simple, singable melody in the D major pentatonic scale, a warm string pad holds the harmony, a round soft bass plays on beats one and three, a small hand drum and a quiet wooden block keep a gentle, even groove, light wind chimes add sparkle now and then. Peaceful, cosy and sunny, like a lantern-lit market square in the afternoon. Key: D major. Tempo: exactly 80 BPM in 4/4. Length: 2 minutes 30 seconds. Loop-friendly: strict constant tempo from the first to the last bar, no tempo changes, no ritardando, no rubato, no time-signature changes, no pauses or breaks; a steady, clearly audible pulse on every beat throughout; very short intro of at most two bars, then the main theme; clear 8-bar phrases; keep the arrangement density and loudness even from start to end, no big build-ups and no drops; no fade-out – the final bar ends cleanly on a sustained D major tonic chord on the downbeat. Instrumental only, no vocals, no lyrics, no spoken words.
```

## Wiesen und offenes Land (`feld`) – 100 BPM, G-Dur
```
Light, airy and hopeful travelling music for open meadows in a fantasy online role-playing game with a soft East Asian touch. A plucked koto ostinato in steady eighth notes, a bright bamboo flute melody in the G major pentatonic scale, a mellow erhu answering the flute every few phrases, a warm string pad, a soft bass on every downbeat, a light frame drum and a gentle shaker in even eighths. Breezy, optimistic, wide open sky and swaying grass, relaxed but moving forward. Key: G major. Tempo: exactly 100 BPM in 4/4. Length: 2 minutes 30 seconds. Loop-friendly: strict constant tempo from the first to the last bar, no tempo changes, no ritardando, no rubato, no time-signature changes, no pauses or breaks; a steady, clearly audible pulse on every beat throughout; very short intro of at most two bars, then the main theme; clear 8-bar phrases; keep the arrangement density and loudness even from start to end, no big build-ups and no drops; no fade-out – the final bar ends cleanly on a sustained G major tonic chord on the downbeat. Instrumental only, no vocals, no lyrics, no spoken words.
```

## Wald (`wald`) – 60 BPM, a-Moll
```
Calm, mysterious enchanted forest exploration music for a fantasy online role-playing game with a subtle East Asian touch. A soft erhu sings a slow melody in the A minor pentatonic scale, a guzheng plays muted plucked eighth notes as a gentle pulse with occasional harmonics, an airy breathy low flute answers the erhu, warm low strings sustain the harmony, soft wooden percussion (temple blocks, a muffled hand drum) marks every beat, light bird-like flute ornaments appear in the distance. Peaceful but slightly melancholic, dappled light under ancient trees. Key: A minor. Tempo: exactly 60 BPM in 4/4. Length: 2 minutes 30 seconds. Loop-friendly: strict constant tempo from the first to the last bar, no tempo changes, no ritardando, no rubato, no time-signature changes, no pauses or breaks; a steady, clearly audible pulse on every beat throughout; very short intro of at most two bars, then the main theme; clear 8-bar phrases; keep the arrangement density and loudness even from start to end, no big build-ups and no drops; no fade-out – the final bar ends cleanly on a sustained A minor tonic chord on the downbeat. Instrumental only, no vocals, no lyrics, no spoken words.
```

## Schnee und Eis (`kalt`) – 80 BPM (halbes Tempo gefühlt), e-Moll
```
Cold, crystalline and lonely snowy mountain music for a fantasy online role-playing game. Celesta and glass bells play a delicate arpeggio in steady eighth notes that keeps a quiet pulse, a slow airy bamboo flute melody floats above in E minor, soft sustained high strings and a low distant drone hold the harmony, sparse koto notes ring out with long reverb, a very soft low drum marks the first beat of every bar, a subtle wind texture stays in the background. Quiet, frozen, beautiful and still, but never without pulse. Key: E minor. Tempo: exactly 80 BPM in 4/4 with a calm half-time feel. Length: 2 minutes 30 seconds. Loop-friendly: strict constant tempo from the first to the last bar, no tempo changes, no ritardando, no rubato, no time-signature changes, no pauses or breaks; a steady, clearly audible pulse on every beat throughout; very short intro of at most two bars, then the main theme; clear 8-bar phrases; keep the arrangement density and loudness even from start to end, no big build-ups and no drops; no fade-out – the final bar ends cleanly on a sustained E minor tonic chord on the downbeat. Instrumental only, no vocals, no lyrics, no spoken words.
```

## Wüste und Feuerberg (`heiss`) – 80 BPM, D-Phrygisch
```
Hot desert and volcanic wasteland exploration music for a fantasy online role-playing game. A hypnotic groove of goblet drum and frame drum in steady sixteenths, a plucked lute (oud-like) and a guzheng repeat a short ostinato in D phrygian, a smoky low double-reed melody (duduk-like) wanders above, low droning strings hold the tonic, shimmering metallic textures suggest heat haze. Mysterious, warm and adventurous, not aggressive. Key: D phrygian (tonic D). Tempo: exactly 80 BPM in 4/4. Length: 2 minutes 30 seconds. Loop-friendly: strict constant tempo from the first to the last bar, no tempo changes, no ritardando, no rubato, no time-signature changes, no pauses or breaks; a steady, clearly audible pulse on every beat throughout; very short intro of at most two bars, then the main theme; clear 8-bar phrases; keep the arrangement density and loudness even from start to end, no big build-ups and no drops; no fade-out – the final bar ends cleanly on a sustained D tonic chord on the downbeat. Instrumental only, no vocals, no lyrics, no spoken words.
```

## Moor, Ödland und Dungeons (`dunkel`) – 60 BPM, g-Moll
```
Dark, ominous dungeon and haunted swamp music for a fantasy online role-playing game. A low cello ostinato pulses softly in steady eighth notes like a slow heartbeat, a deep distant taiko drum hits on beats one and three, low string drones and quiet dissonant string clusters hold the harmony in G minor, a breathy low bamboo flute plays a sparse, sad melody, eerie metallic scrapes and distant chimes appear now and then, heavy reverb. Tense, brooding and mysterious, never loud, never silent. Key: G minor. Tempo: exactly 60 BPM in 4/4. Length: 2 minutes 30 seconds. Loop-friendly: strict constant tempo from the first to the last bar, no tempo changes, no ritardando, no rubato, no time-signature changes, no pauses or breaks; a steady, clearly audible pulse on every beat throughout; very short intro of at most two bars, then the main theme; clear 8-bar phrases; keep the arrangement density and loudness even from start to end, no big build-ups and no drops; no fade-out – the final bar ends cleanly on a sustained G minor tonic chord on the downbeat. Instrumental only, no vocals, no lyrics, no spoken words.
```

## Bosskampf (`boss`) – 140 BPM, d-Moll
```
Epic, intense boss battle music for a fantasy online role-playing game with an East Asian flavour. A full orchestra with a driving staccato string ostinato in straight eighth notes, powerful taiko and war drums on a strong 4/4 pattern, heroic brass stabs on the downbeats, a wordless choir singing sustained "ah" chords inside the orchestra (no lyrics, no solo singer), fierce erhu and bamboo flute lines above the orchestra. Dramatic, relentless, high energy from the first bar, harmonic minor with A major as the dominant. Key: D minor. Tempo: exactly 140 BPM in 4/4, straight eighths, no triplets and no swing. Length: 2 minutes. Loop-friendly: strict constant tempo from the first to the last bar, no tempo changes, no ritardando, no time-signature changes, no pauses, no breakdowns; a steady, clearly audible pulse on every beat throughout; starts immediately at full intensity without intro; clear 8-bar phrases; keep the arrangement density and loudness even from start to end; no fade-out – the final bar ends on a sustained D minor tonic chord hit on the downbeat. Instrumental only (wordless choir allowed), no lyrics, no spoken words.
```

## Turm der Verdammten (`turm`) – 120 BPM, c-Moll
Läuft in allen Ebenen des Turms (auch bei den Hütern). Die Datei im Spiel ist im Rechner komponiert und erzeugt
(siehe unten „Im Rechner erzeugt“); der Prompt ist für eine Fassung von außen.
```
Dark, heavy and relentless music for climbing a cursed tower full of the damned in a fantasy online role-playing game. Low cellos and basses hammer a driving eighth-note ostinato accented 3+3+2, a taiko ensemble plays the same accents and a deep war drum hits every downbeat, a low tolling bell sounds every second bar, a male choir sings dark sustained "oh" chords (no lyrics), heavy low brass chords and short brass stabs on the accents, an anvil strikes on beats two and four in the louder sections. A slow, menacing horn theme in C minor with a raised fourth (Hungarian minor colour), later doubled by trombones and choir; a counter-melody in the violins. A quieter middle part on a C pedal: heartbeat drum, soft dissonant choir and string clusters (minor seconds), rattling chains, then a build-up on the dominant G major with a snare roll and a rising swell back into the first bar. Ominous, massive and propulsive, never calm. Harmony mostly C minor – A flat – D flat – G major. Key: C minor. Tempo: exactly 120 BPM in 4/4, straight eighths. Length: 2 minutes. Loop-friendly: strict constant tempo from the first to the last bar, no tempo changes, no ritardando, no rubato, no time-signature changes, no pauses; a steady, clearly audible pulse on every beat throughout; very short intro of at most two bars; clear 8-bar phrases; keep the loudness within a few decibels from start to end; no fade-out – the final two bars are a snare roll and a rising swell on G major that lead into the first bar. Instrumental only (wordless choir allowed), no lyrics, no spoken words.
```

## Kharzul, Wächter der Verdammten (`kharzul`, `kharzul2`) – 150 BPM, cis-Moll
Läuft im Kampf gegen Kharzul (Ebene 11). `kharzul2` ist dasselbe Stück mit mehr Wucht für seine wahre Gestalt (ab der
Verwandlung bei 50 %); das Spiel blendet an derselben Stelle über (`MUSIC_SYNC` in `js/klang-dateien.js`). Beide Fassungen
müssen darum Takt für Takt übereinander passen: gleiches Tempo, gleiche Länge, gleiche Schleife (`schleife` in beiden
Einträgen gleich).
```
Furious final boss battle music for a fantasy online role-playing game: a demonic warden with a halberd and chains of souls. A relentless sixteenth-note ostinato of low strings on C sharp, accented 3+3+3+3+2+2 with a biting semitone neighbour note, a taiko ensemble and war drums locked to the same accents, anvils and a military snare on beats two and four, low brass blasts and a dark brass theme built on the tritone (harmony C sharp minor – D major – C sharp minor – G major – G sharp major), a large choir singing sustained "ah" chords (no lyrics), tremolo high strings. A half-time section with crushing brass chords, choir clusters and rattling chains, then a chromatic rise bar by bar back to the full theme. Brutal, dramatic, unstoppable. Key: C sharp minor. Tempo: exactly 150 BPM in 4/4, straight sixteenths. Length: 1 minute 45 seconds. Loop-friendly: strict constant tempo from the first to the last bar, no tempo changes, no ritardando, no rubato, no time-signature changes, no pauses; a steady, clearly audible pulse on every beat throughout; very short intro of at most two bars; clear 8-bar phrases; keep the loudness within a few decibels from start to end; no fade-out – the final two bars are a snare roll and brass stabs on G sharp major that lead into the first bar. Instrumental only (wordless choir allowed), no lyrics, no spoken words.
```
Zweite Fassung (`kharzul2`), mit derselben Länge und demselben Ablauf erzeugen:
```
Exactly the same piece, tempo, length, harmony and structure as before, bar for bar, but even more intense, for the boss's true form: doubled sixteenth-note drums, a war drum on every beat, an anvil on every beat, short wordless choir shouts ("ha") on the accents, trumpets doubling the theme an octave higher, a distorted, growling low brass layer on the accents and shrieking high string runs. Same loudness as the first version – the extra intensity comes from density, not volume. Instrumental only (wordless choir allowed), no lyrics, no spoken words.
```

## Prüfungs- und Turnierarena (`arena`) – 125 BPM, e-dorisch
Läuft in der Prüfungsarena (Wellen) und in der Turnierarena. Ohne Datei spielt die im Browser erzeugte Arenamusik
(160 BPM, mit den Stufen Pause/Kampf/Bosswelle).
```
Cool, energetic arena combat groove for a fantasy online role-playing game with an East Asian flavour: fighting wave after wave in front of an imagined crowd. A punchy kick drum and snare with layered hand claps, crisp sixteenth-note hi-hats and shaker, a syncopated sixteenth-note bass riff in E dorian, a plucked koto playing fast sixteenth-note arpeggios, a catchy erhu hook answered by a bamboo flute, brass stabs on the off-beat accents, taiko and tom fills every four bars, big ensemble hand claps with stadium reverb in the loudest part (no voices), a half-time break with horns and big drums before the full groove returns. Confident, driving and focused, not frantic. Harmony E minor – C – D – A major – B major. Key: E dorian. Tempo: exactly 125 BPM in 4/4, straight sixteenths, no swing. Length: 2 minutes. Loop-friendly: strict constant tempo from the first to the last bar, no tempo changes, no ritardando, no rubato, no time-signature changes, no pauses; a steady, clearly audible pulse on every beat throughout; very short intro of at most two bars; clear 8-bar phrases; keep the loudness within a few decibels from start to end; no fade-out – the final two bars are a drum fill and a rising swell that lead into the first bar. Instrumental only, no vocals, no lyrics, no spoken words.
```

## Im Rechner erzeugt: Turm, Kharzul, Arenen (seit 15.51)

`turm`, `kharzul`, `kharzul2` und `arena` stammen nicht von einem Generator, sondern sind eigene Kompositionen, die
`tools/klang-synth/musik.py` Note für Note in Python ausrechnet (Trommeln, Streicher, Blech, Chor aus Formantfiltern,
Glocke, Amboss, Koto, Erhu, Flöte; Hall als Faltung). Keine Aufnahmen, keine Samples, keine fremden Melodien.

- **Schleife:** Jedes Stück wird als geschlossene Schleife gerechnet (Ausklang und Hall des Endes laufen in den Anfang).
  Die Rohdatei `<Rohordner>/musik/<id>.wav` enthält die letzten zwei Takte als Vorspiel, die ganze Schleife und zwei
  Takte Nachlauf; A und B liegen genau auf Taktgrenzen (`schleife` im Eintrag), um A und B steht Sample für Sample
  dasselbe – die Naht von `klang-erzeugen.py` ändert dort nichts.
- **Neu bauen:** `python3 tools/klang-erzeugen.py roh turm kharzul kharzul2 arena --neu` (rechnet die Rohdateien, etwa
  eine bis drei Minuten je Stück, ohne Netz und ohne Schlüssel), dann `python3 tools/klang-erzeugen.py bauen turm
  kharzul kharzul2 arena`. Die Einträge in `tools/klang-liste.json` tragen dafür `"synth": "klang-synth/musik.py"`.
- **Ändern:** Abläufe, Melodien und Mischung stehen in `tools/klang-synth/musik.py` (je Stück eine Funktion für die
  Spuren und eine für die Mischung). Bleibt die Zahl der Takte gleich, bleibt auch `schleife` gleich.
- **Von außen ersetzen:** mit einem Prompt oben eine Fassung erzeugen, als `<Rohordner>/musik/<id>.mp3` ablegen und im
  Eintrag `synth` und `schleife` entfernen (dann sucht das Werkzeug die Schleife wie bei den anderen Stücken).

## Neue Datei einbauen

1. **Erzeugen:** Prompt in ElevenLabs Music (oder Suno) eingeben, rein instrumental, 2–3 Minuten. Mehrere Fassungen
   erzeugen und die nehmen, deren Tempo gleichmäßig bleibt und die nicht ausgeblendet wird. Als MP3 (mindestens
   192 kbit/s) oder WAV speichern.
   Mit ElevenLabs geht es auch über das Werkzeug: Prompt, `laenge_ms` (z. B. `150000`) und `"extra": {"force_instrumental": true}`
   in `tools/klang-liste.json` eintragen, dann `ELK=<Schlüssel> python3 tools/klang-erzeugen.py roh <id> --neu`.
2. **Rohdatei ablegen:** `<Rohordner>/musik/<id>.mp3` – Standard ist `~/.cache/seelenstein-klang-roh/musik/`, ein anderer
   Ordner geht mit `--roh <Ordner>` (Rohdateien gehören nicht ins Repo).
3. **Eintrag in `tools/klang-liste.json` (`musik`):** `id`, `stimmung` (dorf, feld, wald, kalt, heiss, dunkel, boss,
   arena, turm, kharzul oder kharzul2), `bpm` (Tempo aus dem Prompt; 0 nur bei Stücken ohne festen Puls), `takt` (4), `phrase` (4 Takte), `blende`
   (Überblendung an der Naht in s, etwa zwei Schläge), `lufs` (−18), `tp` (−1.5), `vbr` (2). Ein altes Feld `schleife`
   entfernen, damit neu gesucht wird. Suchbereich bei Bedarf mit `a_von`/`a_bis` (A nach dem Vorspiel) und `ende_weg`
   (so viele s vor dem Ende darf B höchstens liegen).
4. **Bauen:** `python3 tools/klang-erzeugen.py bauen <id>` (ohne Netz). Das Werkzeug bestimmt Tempo und Taktraster, zeigt
   die besten Schleifen je Länge (Ähnlichkeit vor und nach der Naht), wählt eine, bereitet die Naht vor, gleicht die
   Lautheit an und schreibt `snd/musik/<stimmung>.mp3` sowie `js/daten/klang-dateien.js` (Schleifenpunkte, Dateigröße).
   Die ausgegebenen Punkte danach als `"schleife": [A, B]` eintragen – dann baut jeder Lauf genau dieselbe Datei.
5. **Anhören:** die Naht prüfen (z. B. die letzten Sekunden vor B und die ersten nach A hintereinander) und im Spiel
   durch die Gegend laufen. Die Datei für `arena` ersetzt die im Browser erzeugte Arenamusik (deren Stufen Pause/Kampf/
   Bosswelle hat eine Datei nicht); fehlt sie, spielt wieder die erzeugte. Fehlt `turm` oder `kharzul`, spielt die
   bisherige Datei (`dunkel` bzw. `boss`, `MUSIC_FALLBACK` in `js/klang-dateien.js`).
6. **Ausliefern:** wie immer die Version im Service Worker (`sw.js`) erhöhen. Musik liegt dort in einem eigenen Speicher
   und wird nur im Hintergrund erneuert; das Spiel erkennt eine veraltete Datei an der Größe und holt die neue nach.
