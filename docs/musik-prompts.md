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
Läuft in der Wüste; am Feuerberg im Wechsel mit `vulkan` und `glut` (siehe unten „Feuerberg“).
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

## Klage des Turms (`turmklage`) – 64 BPM, d-Moll (seit 15.73)
Traurige Solo-Violine beim Betreten des Turms: auf dem Anweg und in der Halle bis zur ersten Welle, danach wieder
nach dem Sieg (während der Truhe und des Turm-Schmieds). In den Wellen spielt `turm`, beim Wächter `kharzul`.
Beginnt bei jedem Einsetzen am Anfang der Schleife (`MUSIC_VON_VORN`, klang-dateien.js), damit das Thema kommt; fehlt
die Datei, spielt `turm` (`MUSIC_FALLBACK`). In der Nähe des Turms und im Durchgang wird sie vorab geholt (turm.js).
Eigene Komposition, kein Nachbau eines bekannten Stücks (auch nicht „leicht verändert“): Eine bekannte Melodie bleibt
geschützt, auch wenn man einzelne Töne ändert. Gebaut aus echten Aufnahmen (CC0, VSCO 2 Community Edition):
`tools/klang-synth/turmklage.py` – Aufbau, Akkorde und Noten stehen dort im Kopf.
```
A slow, sorrowful solo violin lament for entering a cursed tower in a fantasy online role-playing game. D minor,
64 BPM. A lone, expressive violin with natural vibrato sings a long-breathed original melody over soft sustained
strings and a gently rolling harp; a distant gong at the start. The second verse rises an octave with a cello
counter-melody; the climax brings full strings, double bass and a timpani roll, then the theme returns quietly and
ends on a long held D. A faint East Asian colour from the minor second (E-flat to D sigh). No percussion grooves, no
vocals. Seamless loop of 32 bars.
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

## Feuerberg (`feuer`): Vulkan und Glut im Wechsel mit `heiss`
Am Feuerberg (Boden Basalt oder Lavaseen: Feuerberg, Titanenkamm) spielt die Stimmung `feuer` drei Stücke im Wechsel:
`vulkan` → `glut` → `heiss` (`MUSIC_REIHE` in `js/klang-dateien.js`); die Wüste bleibt bei `heiss`. Jedes Stück läuft
einmal ganz (Vorspiel und einmal die Schleife A–B), dann blendet das Spiel über sein Ende in das Vorspiel des nächsten
(gleiche Leistung, so lang wie das Vorspiel des neuen, 4–6 s) – die Schleife des neuen setzt genau am Schleifenende des
alten ein. Wer die Gegend verlässt und wiederkommt, hört das nächste Stück der Reihe von vorn; nach einer Pause (Musik
aus, Spiel im Hintergrund) läuft das Stück an seiner Stelle weiter. Fehlt eine Datei, kommt die nächste der Reihe, ohne
jede Datei die erzeugte Musik (wie `heiss`). `vulkan` und `glut` sind eigene Kompositionen, im Rechner erzeugt (siehe
„Im Rechner erzeugt“); ihre letzten zwei Takte – das Vorspiel – sind Überleitungen.

- **Vulkan (`vulkan`)** – dunkel und wuchtig, h-Moll mit phrygischem C, 84 BPM, 40 Takte (114,3 s), Leitmotiv h–c–h:
  V1 Grollen (große Trommel als Herzschlag, tiefe Streicher im Tremolo, Chor „u“, tiefe Bambusflöte, Glutfunken der
  Koto), V2 Riff im tiefen Blech mit Fasstrommeln, Koto und Chor „o“, V3 Thema in Hörnern und Posaunen mit Ambossen und
  Antworten der Flöte, V4 Glutkammer (halbes Tempo, Gong, Koto im Tremolo, die Erhu singt über G – D – e – C), V5 Ausbruch
  (Thema mit Erhu und Chor in der Oktave, Steigerung über C-Dur, im letzten Takt der Schlag des Ausbruchs mit Gong und
  Chorcluster h/c, der ins Grollen des Anfangs ausklingt).
- **Glut (`glut`)** – treibend, e-Moll fünftönig, 100 BPM, 48 Takte (115,2 s): G1 Groove (Fasstrommeln, Koto in
  rollenden Sechzehnteln, Holzblock, Funken der Flöte), G2 Thema der Erhu, G3 die Flöte ruft, die Erhu antwortet, G4 halbes
  Tempo (Gong, tiefes Blech, Männerchor, Koto im Tremolo, Erhu-Lied über a – F – e – C – H), G5 Thema mit der Flöte in der
  Oktave und Blechstößen, G6 Thema auf der Koto mit Tremolo, Flöte als Gegenstimme, Wirbel und Anstieg auf H-Dur.

Prompts für eine Fassung von außen:
```
Dark, heavy and volcanic exploration music for a mountain of glowing lava in a fantasy online role-playing game with an East Asian flavour. A deep rumbling drone and a war drum heartbeat open the piece with low tremolo strings and a breathy low bamboo flute playing a smoky original melody built on a groaning semitone (B – C – B). Then a stomping low brass riff with a taiko ensemble, a male choir singing dark sustained "oh" chords (no lyrics), a heavy horn and trombone theme in B minor with a Phrygian C, anvil strikes on beats two and four, a gong. A half-time middle part: plucked koto tremolo, soft choir, a singing erhu melody. The last part brings the theme with erhu and choir, a build-up over C major and one huge eruption hit with gong and a dissonant choir cluster that dies away into the rumble of the beginning. Powerful but steady, music to explore and fight to, not a boss battle. Key: B minor. Tempo: exactly 84 BPM in 4/4. Length: 2 minutes. Loop-friendly: strict constant tempo from the first to the last bar, no tempo changes, no ritardando, no rubato, no time-signature changes, no pauses; a steady, clearly audible pulse on every beat throughout; very short intro of at most two bars; clear 8-bar phrases; keep the loudness within a few decibels from start to end; no fade-out – the final bar is the eruption hit on B minor that rings out into the first bar. Instrumental only (wordless choir allowed), no lyrics, no spoken words.
```
```
Driving, warm and adventurous exploration music for fields of glowing embers on a fire mountain in a fantasy online role-playing game with an East Asian flavour. A taiko ensemble plays a syncopated groove with a deep drum on beats one and three, a small high drum and temple blocks in eighth notes, a plucked koto rolls in sixteenth notes, low strings pulse in eighth notes. An erhu sings an original pentatonic theme in E minor, a bamboo flute calls and the erhu answers, soft horns hold the harmony. A half-time middle part with a gong, low brass, a male choir (no lyrics) and a koto tremolo while the erhu sings over F major (a Phrygian glow). The theme returns with the flute an octave above and short brass stabs, then on the koto with long tremolo notes. Confident and moving forward, not frantic. Key: E minor. Tempo: exactly 100 BPM in 4/4. Length: 2 minutes. Loop-friendly: strict constant tempo from the first to the last bar, no tempo changes, no ritardando, no rubato, no time-signature changes, no pauses; a steady, clearly audible pulse on every beat throughout; very short intro of at most two bars; clear 8-bar phrases; keep the loudness within a few decibels from start to end; no fade-out – the final two bars are a drum fill and a rising swell on B major that lead into the first bar. Instrumental only (wordless choir allowed), no lyrics, no spoken words.
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
  Ebenso die beiden Stücke des Feuerbergs: `… roh glut vulkan --neu`, dann `… bauen glut vulkan`.
- **Ändern:** Abläufe, Melodien und Mischung stehen in `tools/klang-synth/musik.py` (je Stück eine Funktion für die
  Spuren und eine für die Mischung). Bleibt die Zahl der Takte gleich, bleibt auch `schleife` gleich.
- **Von außen ersetzen:** mit einem Prompt oben eine Fassung erzeugen, als `<Rohordner>/musik/<id>.mp3` ablegen und im
  Eintrag `synth` und `schleife` entfernen (dann sucht das Werkzeug die Schleife wie bei den anderen Stücken).

## Arena-Hörproben aus echten Instrumenten-Samples (`tools/klang-synth/arena_varianten.py`)

Die gerechnete Arenamusik klang zu synthetisch. `tools/klang-synth/arena_varianten.py` baut darum drei neue, eigene
Kompositionen überwiegend aus Aufnahmen echter Instrumente, zum Auswählen. **Gewählt (seit 15.52 im Spiel als
`snd/musik/arena.mp3`): a „Titanen“** (`GEWAEHLT` im Skript; `tools/klang-erzeugen.py` ruft es für den Eintrag `arena`
mit `arena --roh <ordner>` auf und bekommt die Rohdatei `<roh>/musik/arena.wav`).

- **a „Titanen“** – episch-orchestral, g-Moll, 132 BPM, 64 Takte (116 s): Spiccato-Ostinato der Celli/Bratschen/Geigen
  (3+3+2), Fasstrommel-Ensemble aus großer Trommel, Tenortrommeln, tief gestimmten Toms und Pauken, Posaunen-/Tuba-
  und Trompetenstöße, Hornthema, zweites Thema in Geigen und Hörnern, chorartige Flächen.
- **b „Stahl“** – treibend-modern, d-Moll, 128 BPM, 64 Takte (120 s): echte Snare, Becken, Toms und Klatschen, Bassdrum
  und Synthesizer-Bass mit Pumpen, gedoppelte Rhythmusgitarren links/rechts, Refrain-Melodie (Synthesizer mit Geigen
  bzw. Hörnern gedoppelt), Blechantworten, Arpeggio, Klatschen der Menge mit Stadionhall.
- **c „Kirschsturm“** – fernöstlich, A-In-Skala (A–B♭–D–E–F), 150 BPM, 72 Takte (115 s): Koto (Đàn-tranh-Aufnahmen),
  Shamisen-artiges Zupfriff (Strumstick + Holzklick, Rutscher), Shakuhachi-artige Flöte (von unten angeblasen, Atem),
  schnelle Fasstrommeln mit Shime-Wirbel, Streicher, Gong.

**Samples (nur CC0, nicht im Repo):** VSCO 2 Community Edition (Versilian Studios; Sam Gossner, Simon Dalzell –
github.com/sgossner/VSCO-2-CE, Stand `4403009`, Lizenz CC0 1.0) für Streicher, Blech, Flöte, große Trommel, Pauken,
Becken, Gong, Amboss, Tamburin; Versilian Community Sample Library (github.com/sgossner/VCSL, Stand `c1ea7bc`, Lizenz
CC0 1.0) für Đàn tranh, Strumstick, Snare, Toms, Tenortrommeln, Rahmentrommeln, Hi-Hat, Klatschen, Schüttelrohr,
Holzblock (beide Sammlungen: „CC0 1.0 Universal“ in ihrer LICENSE-Datei). Die Readme von VSCO bittet zusätzlich (ohne
Lizenzpflicht), die Samples nicht als solche zu verkaufen und Versilian Studios zu nennen – ins Spiel kommen nur fertig
gemischte Stücke. Gerechnet sind nur Gitarren (Karplus-Strong + Verstärker/Box), Synthesizer-Bass, -Melodie und
-Arpeggio, der Kick-Körper, der Chor (Formantfilter) und Anstiege. Melodien, Riffs, Harmonien und Abläufe sind eigene
Kompositionen.

**Erzeugen:** `python3 tools/klang-synth/arena_varianten.py [a b c] [--aus <ordner>] [--samples <ordner>]` holt die
Samples beim ersten Lauf mit git (nur die gebrauchten Ordner, festgelegter Stand, ≈ 0,9 GB, Standard
`~/.cache/seelenstein-klang-roh/samples`) und schreibt je Stück `arena_<x>.mp3` (spielfertig wie `snd/musik/*.mp3`:
Schleife auf Taktgrenzen, −18 LUFS, ≤ −1,5 dBTP, VBR q2 – gebaut mit `baue_musik()` aus `klang-erzeugen.py`),
`arena_<x>_probe.mp3` (30 s: Anfang + Höhepunkt), die Rohdatei `roh/arena_<x>.wav` und `varianten.json` (Schleife,
Lautheit). Je Stück einige Minuten und bis zu 4 GB Arbeitsspeicher.

**Übernehmen (nach der Wahl):** Rohdatei als `<Rohordner>/musik/arena.wav` ablegen, im Eintrag `arena` in
`tools/klang-liste.json` `bpm` und `schleife` aus `varianten.json` eintragen, dann `python3 tools/klang-erzeugen.py
bauen arena` und die Version in `sw.js` erhöhen.

## Neue Datei einbauen

1. **Erzeugen:** Prompt in ElevenLabs Music (oder Suno) eingeben, rein instrumental, 2–3 Minuten. Mehrere Fassungen
   erzeugen und die nehmen, deren Tempo gleichmäßig bleibt und die nicht ausgeblendet wird. Als MP3 (mindestens
   192 kbit/s) oder WAV speichern.
   Mit ElevenLabs geht es auch über das Werkzeug: Prompt, `laenge_ms` (z. B. `150000`) und `"extra": {"force_instrumental": true}`
   in `tools/klang-liste.json` eintragen, dann `ELK=<Schlüssel> python3 tools/klang-erzeugen.py roh <id> --neu`.
2. **Rohdatei ablegen:** `<Rohordner>/musik/<id>.mp3` – Standard ist `~/.cache/seelenstein-klang-roh/musik/`, ein anderer
   Ordner geht mit `--roh <Ordner>` (Rohdateien gehören nicht ins Repo).
3. **Eintrag in `tools/klang-liste.json` (`musik`):** `id`, `stimmung` (dorf, feld, wald, kalt, heiss, dunkel, boss,
   arena, turm, kharzul, kharzul2, glut oder vulkan; die beiden letzten spielt der Feuerberg im Wechsel mit heiss), `bpm` (Tempo aus dem Prompt; 0 nur bei Stücken ohne festen Puls), `takt` (4), `phrase` (4 Takte), `blende`
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
