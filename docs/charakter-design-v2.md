# Seelenstein – Charakter-Design 2.0 (Spielerfiguren)

Stand: Version 13.18. Dieses Dokument ist die Vorgabe für alle Spielerfiguren (Krieger, Ninja, Schamane,
Nekromant, Magier, je Mann und Frau) in 3D (`js/drei-figuren.js`, `js/drei-ausruestung.js`) und 2D
(`js/figuren.js`). Es enthält am Ende fertige Bild-Prompts, mit denen sich Konzeptbilder erzeugen lassen.

---

## 1. Was bisher nicht gepasst hat

| Problem | Ursache im Modell | Wirkung im Spiel |
|---|---|---|
| Figur wirkt klein | Kopf sehr groß (Radius 0,33), Beine kurz (0,34) – nur gut 2 Köpfe hoch | Von oben sieht man fast nur Kopf und Schultern |
| Alle wirken weiblich | Alle Figuren hatten dieselben großen Anime-Augen mit geschwungenem Lidstrich nach außen, zwei Glanzpunkte, runder Mund | Männer sehen „süß“ statt kräftig aus |
| Kein klarer Körperbau | Männer und Frauen fast gleich breit, gleicher Hals, gleiche Haltung | Geschlecht nur an Haaren und Bart erkennbar |
| Gesicht ohne Kanten | Nase ein Punkt, kein Kinn, Brauen dünn und hoch | Gesicht liest sich wie ein Kind |

## 2. Ziel-Stil

**„Stilisierter Held“** – nicht mehr Chibi, aber auch nicht realistisch. Vorbild ist der Look klassischer
Fantasy-MMOs mit leicht übertriebenen Proportionen: breite Schultern, kräftige Hände und Waffen, gut
lesbare Silhouette von schräg oben. Farben warm und satt, Umrisslinie bleibt (Toon-Stil des Spiels).

Leitsätze:
1. **Silhouette vor Detail.** Von der Spielkamera (schräg von oben, ca. 50°) muss man Klasse, Geschlecht und
   die wichtigsten Rüstungsteile (Schultern, Helm, Waffe) in einer halben Sekunde erkennen.
2. **Männer kantig, Frauen weich.** Unterschiede über Gesicht *und* Körper, nicht nur über Haare.
3. **Erwachsen.** Kein Kindchenschema bei Männern: kleine, flache Augen, schwere Brauen, Kinn, Nase.
4. **Ausrüstung trägt die Figur.** Schultern, Helm und Waffe sind die größten Formen an der Figur.

## 3. Proportionen (Zahlen für `humanoid3`)

Einheiten wie im Code (1 = eine Kachel ≈ eine Körperhöhe der alten Figur).

| Wert | alt | neu (13.18) | Ziel Phase 2 |
|---|---|---|---|
| Kopfradius `headR` Mann / Frau | 0,33 / 0,33 | 0,265 / 0,272 | 0,24 / 0,25 |
| Beinlänge `legLen` | 0,34 | 0,44 | 0,50 |
| Armlänge `armLen` | 0,31 | 0,35 | 0,40 |
| Gesamtskalierung `figScale` | 1,0 | 1,14 | 1,15 |
| Körperbau `bulk` Mann / Frau | 1,08 / 0,96 | 1,10 / 0,96 | 1,12 / 0,94 |
| Kopfhöhen gesamt | ≈ 2,2 | ≈ 2,8 | ≈ 3,5 |

Phase 2 (noch offen): Rumpf verlängern (Hals sichtbar, Taille), Schulterbreite Mann +10 %, Hüfte Frau
+6 %, Hände etwas größer. Dafür müssen Torso-, Rock- und Robenformen (`lathe3`) mitwachsen.

## 4. Gesichter

### 4.1 Mann
- **Augen:** 15 % schmaler, 28 % flacher als bisher, Iris kleiner. Ein Glanzpunkt statt zwei.
  Kein Wimpernschwung – stattdessen ein **gerades, schweres Oberlid** (dicker dunkler Balken, zur Mitte hin
  leicht gesenkt) und ein feiner Unterlidstrich in dunkler Hautfarbe.
- **Brauen:** dick (0,085 × Kopfradius), gerade, tief direkt über dem Auge, innen leicht gesenkt
  („ernster Blick“).
- **Nase:** sichtbarer Nasenrücken (längliche Form) plus kräftigere Spitze.
- **Mund:** kurzer gerader Strich, kein Lächeln, keine Lippenfarbe.
- **Kinn/Kiefer:** Kiefer 16 % breiter, ohne Bart ein angedeutetes Kinn.
- **Wangen:** keine Röte.
- Bart (Auswahl bei der Erstellung) bleibt und verstärkt den Unterschied.

### 4.2 Frau
- Große Augen mit geschwungenem Lidstrich, Wimpernschwung und unterem Lidstrich (wie bisher – das ist der
  gewünschte Kontrast zum Mann).
- Feine, gebogene Brauen, kleine Nase, Lippen in Rosé, leichte Wangenröte, Ohrringe.
- Körper schmaler (0,96), Taille durch Torso-Form „torsoF“.

### 4.3 Augenfarben, Narben, Bemalung
Unverändert aus der Charaktererstellung (Augenfarbe, Sommersprossen, Narbe, Kriegsbemalung).

## 5. Klassen-Silhouetten

| Klasse | Mann | Frau | Erkennungsmerkmal von oben |
|---|---|---|---|
| Krieger | Breit, schwere Platte, Fellkragen, große Schulterpanzer | Schlanker Plattenpanzer, Zopf | Massige Schultern, großes Schwert/Axt |
| Ninja | Drahtig, eng anliegendes Leder, Maske | Schlank, Pferdeschwanz | Zwei Dolche, Schal, Maske |
| Schamane | Kräftig, Robe mit Schärpe, Fächer/Glocke | Robe, Dutt, Haarschmuck | Weite Ärmel, Fächer |
| Nekromant | Hager, zerschlissene Robe, Schädel-Schulter | Hager, Kapuze | Knochen-Schulter, grünes Glühen |
| Magier | Schultercape, Stehkragen, Bart | Spitzhut, Zopf vorn | Hut/Kragen, Stab, Elementlicht |

## 6. Ausrüstung an der Figur

- **Schultern** (seit 13.17): 1,7-fach, heller Rand, Grat, Nieten, Schienen über dem Oberarm.
- **Helm**: soll die Kopfform ändern (Kamm, Hörner, Visier) – nicht nur die Farbe.
- **Waffe**: mindestens so lang wie der Unterarm plus Hand; Glühen ab +8.
- **Umhang**: weht, Futter in Kontrastfarbe.

## 7. Haltung und Bewegung

- Stand: Füße schulterbreit, Brust raus, Waffe locker gesenkt (Mann), Gewicht auf einem Bein (Frau).
- Laufen: Arme gegengleich, Oberkörper leicht nach vorn; Ninja schneller, geduckter.
- Angriff: Ausholen über die Schulter, deutlicher Nachschwung.

## 8. 2D-Figuren (`js/figuren.js`)

Die 2D-Sprites folgen denselben Regeln: Männer mit Strichaugen und Balkenbrauen, Frauen mit großen Augen.
Schultern 1,35-fach (seit 13.17). Phase 2: Sprite-Kopf kleiner, Körper länger.

---

## 9. Bild-Prompts für Konzeptbilder

Diese Prompts beschreiben **eigene** Figuren für Seelenstein. Sie nennen bewusst kein anderes Spiel und
keine Marke. Für jedes Bild: Hintergrund neutral grau, ganze Figur, Vorder- und Seitenansicht
(„turnaround sheet“), damit man die Formen in 3D nachbauen kann.

### 9.1 Grundprompt (Stil, für alle Figuren voranstellen)

```
Stylized fantasy MMORPG character concept sheet, full body, front view and 3/4 view side by side,
neutral grey background, clean cel-shaded rendering with soft dark outline, warm saturated colors,
heroic proportions about 3.5 heads tall, broad readable silhouette for a top-down game camera,
large expressive shoulder armor, chunky hands and weapons, East-Asian inspired fantasy setting
(lanterns, lacquered wood, jade, bronze), no text, no logo, no watermark
```

### 9.2 Gesichts-Sheet (Mann und Frau im Vergleich)

```
[Grundprompt], head and shoulders expression sheet of a male and a female hero of the same class,
male: small narrow eyes with heavy straight upper eyelids, thick straight low eyebrows, defined nose
bridge, square jaw, small firm mouth, short stubble optional, no blush, adult rugged look;
female: larger almond eyes with lashes and winged eyeliner, thin arched eyebrows, small nose,
soft rose lips, light blush, earrings; both clearly adult, three expressions each: neutral, determined, shout
```

### 9.3 Krieger

```
[Grundprompt], male warrior, broad muscular build, crimson tunic under layered steel plate armor,
huge rounded pauldrons with raised ridge, rivets and three overlapping lames over the upper arm,
fur collar, wide leather belt with bronze buckle, armored boots, holding a long single-edged sword,
determined stern face with thick eyebrows and short beard
```
```
[Grundprompt], female warrior, athletic build, fitted steel breastplate over crimson tunic,
elegant pauldrons with gold trim, braid hanging behind the shoulder, armored skirt plates,
holding sword and round shield, confident expression
```

### 9.4 Ninja

```
[Grundprompt], male ninja, lean wiry build, dark fitted leather armor with crossed chest straps,
long red scarf, cloth face mask covering mouth and nose, small leather shoulder guards,
one curved dagger in each hand held in reverse grip, crouched ready stance, sharp narrow eyes
```
```
[Grundprompt], female ninja, slim agile build, dark purple leather armor, high ponytail,
half mask, twin curved daggers, light shoulder guards with stitching, dynamic stance
```

### 9.5 Schamane

```
[Grundprompt], male shaman, sturdy build, layered robe in teal and cream with red sash,
wide sleeves with gold trim, padded cloth pauldrons with tassels, wooden prayer beads,
holding a large painted war fan, calm strong face, topknot
```
```
[Grundprompt], female shaman, graceful build, flowing robe with gold embroidery, hair bun with ornaments,
holding a bronze ritual bell, gentle confident expression
```

### 9.6 Nekromant

```
[Grundprompt], male necromancer, gaunt tall build, tattered dark green robe, skull pauldron on one
shoulder with bone lames below, glowing green runes on the hem, bone belt, holding a scythe,
hollow-cheeked stern face, long dark hair
```
```
[Grundprompt], female necromancer, slender build, hooded dark robe with torn edges, bone shoulder piece,
glowing green eyes, holding a bone staff, mysterious calm expression
```

### 9.7 Magier

```
[Grundprompt], male mage, tall build, deep blue robe with high stiff collar and short shoulder cape
with silver trim, full grey beard, holding a long staff with a floating element crystal,
wise intense eyes under heavy brows
```
```
[Grundprompt], female mage, slender build, wide-brimmed pointed hat, braid over the front shoulder,
violet robe with silver embroidery, holding a staff with swirling arcane light, focused expression
```

### 9.8 Negativ-Prompt (falls das Werkzeug ihn unterstützt)

```
chibi, oversized head, baby face, big round eyes on male characters, blush on male characters,
childlike proportions, tiny legs, realistic photo, gore, text, watermark, logo, extra fingers
```

---

## 10. Umsetzung und Prüfliste

**Phase 1 (13.18, umgesetzt):**
- [x] Figur 14 % größer, Kopf kleiner, Beine und Arme länger
- [x] Männergesicht: schmale Augen ohne Wimpernschwung, gerades Oberlid, dicke Brauen, Nase mit Rücken,
      gerader Mund, Kinn
- [x] Frauengesicht unverändert weich (Kontrast)

**Phase 2 (nach Rückmeldung):**
- [ ] Rumpf länger, sichtbarer Hals, Schulterbreite Mann +10 %
- [ ] Hände größer, Stand- und Laufhaltung je Geschlecht
- [ ] 2D-Sprites mit denselben Proportionen
- [ ] Helme, die die Kopfform verändern

Prüfen nach jeder Änderung: Spielkamera (normal, Schulterblick), Charakterwahl, Inventarfigur, Pferd,
alle fünf Klassen × Mann/Frau, mit und ohne Helm.
