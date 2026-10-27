# Bild-Prompts für Seelenstein

Prompts für Bildgeneratoren (ChatGPT, Midjourney, Leonardo, Stable Diffusion). Sie sind auf Englisch, weil die meisten Generatoren damit bessere Ergebnisse liefern. Alle Prompts nutzen denselben Stil, damit Figuren und Monster zusammenpassen.

## Tipps

- **Midjourney:** `--ar 1:1 --no background, text, shadow` anhängen.
- **Stable Diffusion / Leonardo:** Negative Prompt `background, scenery, text, watermark, blurry, extra limbs`.
- **Hintergrund:** Ist er nicht ganz weiß, mit einem Freistell-Tool entfernen und als PNG mit transparentem Hintergrund speichern.
- **Pixel-Grafik statt gemaltem Stil:** „Clean hand-painted game art“ durch „detailed pixel art, 64x64 pixels“ ersetzen.
- **Ablage:** Fertige Bilder unter `assets/figuren/` (Klassen) bzw. `assets/monster/` speichern, Dateiname wie die ID im Spiel, z. B. `wolf.png`.

## Spielfiguren

Blick zum Betrachter, Schrägansicht von oben.

### Krieger (`krieger`)
```
2D game character sprite of a warrior, East Asian fantasy style. Heavy lacquered lamellar armor in deep crimson red with polished brass trim, steel helmet with a short red crest, broad single-edged sword held in the right hand, sturdy confident stance. Full body, top-down three-quarter view (camera about 45 degrees above), facing toward the viewer, idle pose. Slightly chibi proportions (large head, about one third of body height) so it reads well at small size. Clean hand-painted game art, bold dark outline, soft cel shading, warm light from the top left. Centered, isolated on a plain white background, no shadow on the ground, no text, no frame.
```

### Ninja (`ninja`)
```
2D game character sprite of a ninja assassin, East Asian fantasy style. Slim agile build, tight charcoal and dark violet clothing with leather straps, hood and face mask covering the lower face, long violet scarf, a short dagger in each hand held in reverse grip, crouched ready stance. Full body, top-down three-quarter view (camera about 45 degrees above), facing toward the viewer, idle pose. Slightly chibi proportions (large head, about one third of body height) so it reads well at small size. Clean hand-painted game art, bold dark outline, soft cel shading, warm light from the top left. Centered, isolated on a plain white background, no shadow on the ground, no text, no frame.
```

### Schamane (`schamane`)
```
2D game character sprite of a shaman, East Asian fantasy style. Flowing teal robes with gold embroidery of dragon patterns, golden headband, paper talismans hanging from the belt, holding an ornate folding fan with small golden bells, calm mystical pose with a faint turquoise glow around the hands. Full body, top-down three-quarter view (camera about 45 degrees above), facing toward the viewer, idle pose. Slightly chibi proportions (large head, about one third of body height) so it reads well at small size. Clean hand-painted game art, bold dark outline, soft cel shading, warm light from the top left. Centered, isolated on a plain white background, no shadow on the ground, no text, no frame.
```

### Nekromant (`nekromant`)
```
2D game character sprite of a necromancer, dark fantasy style with East Asian influences. Tattered hooded robe in dark moss green, bone ornaments and a small skull on each shoulder, pale face half hidden in the hood, glowing green eyes, tall twisted wooden staff with a glowing green soul orb at the top, wisps of green spirit smoke. Full body, top-down three-quarter view (camera about 45 degrees above), facing toward the viewer, idle pose. Slightly chibi proportions (large head, about one third of body height) so it reads well at small size. Clean hand-painted game art, bold dark outline, soft cel shading, warm light from the top left. Centered, isolated on a plain white background, no shadow on the ground, no text, no frame.
```

### Spritesheet für Spielfiguren (an einen Figuren-Prompt anhängen)
```
Character sprite sheet of exactly this character, same design and colors in every frame. Grid with 4 rows and 4 columns, evenly spaced, each cell the same size. Row 1: walking toward the viewer. Row 2: walking left. Row 3: walking right. Row 4: walking away from the viewer. Each row is a 4-frame walk cycle. Plain white background, no text, no labels, no grid lines.
```

## Monster

Im Spiel sind Monster von der Seite zu sehen und schauen nach rechts; nach links wird das Bild gespiegelt. Deshalb verlangen alle Monster-Prompts die Seitenansicht nach rechts.

### Wilder Hund (`hund`, Stufe 1)
```
2D game monster sprite of a scruffy wild dog, East Asian fantasy setting. Lean body with shaggy sandy-brown fur, lighter cream belly and muzzle, torn ear, thin tail, wary hunched posture, slightly bared teeth. Full body, side view facing right, seen slightly from above (three-quarter top-down). Stylized chibi proportions with a large head, more scrappy than scary. Clean hand-painted game art, bold dark outline, soft cel shading, warm light from the top left. Centered, isolated on a plain white background, no shadow on the ground, no text, no frame.
```

### Wolf (`wolf`, Stufe 3)
```
2D game monster sprite of a grey wolf, East Asian fantasy setting. Silver-grey fur with a thick lighter neck ruff, pale belly, pointed ears, bushy tail, alert hunting stance with lowered head, amber eyes. Full body, side view facing right, seen slightly from above (three-quarter top-down). Stylized chibi proportions with a large head, menacing but readable at small size. Clean hand-painted game art, bold dark outline, soft cel shading, warm light from the top left. Centered, isolated on a plain white background, no shadow on the ground, no text, no frame.
```

### Alpha-Wolf (`alphawolf`, Stufe 6)
```
2D game monster sprite of a large alpha wolf, pack leader, East Asian fantasy setting. Bigger and more muscular than a normal wolf, dark charcoal fur with a black mane-like ruff, old scars across the muzzle, glowing red eyes, bared fangs, aggressive stance ready to pounce. Full body, side view facing right, seen slightly from above (three-quarter top-down). Stylized chibi proportions with a large head, clearly a stronger elite enemy. Clean hand-painted game art, bold dark outline, soft cel shading, warm light from the top left. Centered, isolated on a plain white background, no shadow on the ground, no text, no frame.
```

### Wildschwein (`wildschwein`, Stufe 8)
```
2D game monster sprite of a wild boar, East Asian fantasy setting. Bulky body with dark brown bristly fur, a spiky ridge of black bristles along the back, pinkish-brown snout, two curved ivory tusks, small angry eyes, short sturdy legs, head lowered to charge. Full body, side view facing right, seen slightly from above (three-quarter top-down). Stylized chibi proportions with a large head. Clean hand-painted game art, bold dark outline, soft cel shading, warm light from the top left. Centered, isolated on a plain white background, no shadow on the ground, no text, no frame.
```

### Bandit (`bandit`, Stufe 11)
```
2D game monster sprite of a forest bandit, East Asian fantasy style. Worn brown leather armor over a dark tunic, red headband with loose tails, red cloth mask over the lower face, narrow suspicious eyes, simple single-edged sword raised, sneaky aggressive stance. Full body, side view facing right, seen slightly from above (three-quarter top-down). Slightly chibi proportions (large head, about one third of body height). Clean hand-painted game art, bold dark outline, soft cel shading, warm light from the top left. Centered, isolated on a plain white background, no shadow on the ground, no text, no frame.
```

### Bandit-Schütze (`banditschuetze`, Stufe 13)
```
2D game monster sprite of a bandit archer, East Asian fantasy style. Green hooded cloak over leather armor, red cloth mask over the lower face, quiver of arrows on the back, holding a wooden short bow with an arrow nocked, crouched aiming stance. Full body, side view facing right, seen slightly from above (three-quarter top-down). Slightly chibi proportions (large head, about one third of body height). Clean hand-painted game art, bold dark outline, soft cel shading, warm light from the top left. Centered, isolated on a plain white background, no shadow on the ground, no text, no frame.
```

### Ork-Krieger (`ork`, Stufe 16)
```
2D game monster sprite of an orc warrior, fantasy style. Muscular olive-green skin, small tusks jutting from the lower jaw, heavy brow, dark leather armor with a dented iron shoulder plate, leather headband, wielding a large iron battle axe, brutish forward-leaning stance. Full body, side view facing right, seen slightly from above (three-quarter top-down). Slightly chibi proportions (large head, about one third of body height), bulkier than a human. Clean hand-painted game art, bold dark outline, soft cel shading, warm light from the top left. Centered, isolated on a plain white background, no shadow on the ground, no text, no frame.
```

### Ork-Schamane (`orkschamane`, Stufe 19)
```
2D game monster sprite of an orc shaman, fantasy style. Grey-green skin with small tusks, tattered dark teal robe, red and gold feathers in a leather headband, bone necklace, holding a crooked wooden staff topped with an animal skull and a glowing icy-blue crystal, eyes glowing blue, casting pose. Full body, side view facing right, seen slightly from above (three-quarter top-down). Slightly chibi proportions (large head, about one third of body height). Clean hand-painted game art, bold dark outline, soft cel shading, warm light from the top left. Centered, isolated on a plain white background, no shadow on the ground, no text, no frame.
```

### Steinoger (`oger`, Stufe 23)
```
2D game monster sprite of a stone ogre, fantasy style. Huge round hulking body with grey stone-like skin and cracks, big belly, small head with a single bone-white horn, small tusks, tiny dull eyes, ragged brown loincloth, dragging a massive wooden club. Full body, side view facing right, seen slightly from above (three-quarter top-down). Stylized chunky proportions, much larger than a human. Clean hand-painted game art, bold dark outline, soft cel shading, warm light from the top left. Centered, isolated on a plain white background, no shadow on the ground, no text, no frame.
```

### Dämon (`daemon`, Stufe 27)
```
2D game monster sprite of a demon, dark fantasy style. Crimson red skin, two curved black horns, glowing yellow eyes, dark leathery bat wings folded behind the back, black clawed hands and feet, dark loincloth with a bone belt, menacing hunched stance with faint ember sparks around it. Full body, side view facing right, seen slightly from above (three-quarter top-down). Slightly chibi proportions (large head, about one third of body height). Clean hand-painted game art, bold dark outline, soft cel shading, warm light from the top left. Centered, isolated on a plain white background, no shadow on the ground, no text, no frame.
```

### Seelenstein (`seelenstein`)
```
2D game object sprite of a cursed soul stone, East Asian fantasy style. A tall jagged monolith of dark purple-grey rock, glowing violet runes carved into its surface, cracks leaking violet light, faint purple mist swirling at its base, ominous and magical. Full object, seen slightly from above (three-quarter top-down). Clean hand-painted game art, bold dark outline, soft cel shading, warm light from the top left. Centered, isolated on a plain white background, no shadow on the ground, no text, no frame.
```

### Spritesheet für Monster (an einen Monster-Prompt anhängen)
```
Monster sprite sheet of exactly this creature, same design and colors in every frame, side view facing right. Grid with 2 rows and 4 columns, evenly spaced, each cell the same size. Row 1: 4-frame walk cycle. Row 2: 4-frame attack animation. Plain white background, no text, no labels, no grid lines.
```

## Verbündete und Dorfbewohner

### Skelett-Diener (`skelett`)
```
2D game character sprite of a summoned skeleton warrior, dark fantasy style. Bleached bone body, ribcage and skull with small glowing green eye lights, holding a rusty short sword, loyal guarding stance. Full body, side view facing right, seen slightly from above (three-quarter top-down). Slightly chibi proportions (large skull, about one third of body height). Clean hand-painted game art, bold dark outline, soft cel shading, warm light from the top left. Centered, isolated on a plain white background, no shadow on the ground, no text, no frame.
```

### Händlerin Ayla (`haendler`)
```
2D game character sprite of a friendly village merchant woman, East Asian fantasy style. Long purple robe with wide sleeves and gold trim, cream apron, gold scarf, auburn hair tied in a bun with a golden hairpin, warm smile, holding a small coin pouch. Full body, top-down three-quarter view (camera about 45 degrees above), facing toward the viewer, idle pose. Slightly chibi proportions (large head, about one third of body height). Clean hand-painted game art, bold dark outline, soft cel shading, warm light from the top left. Centered, isolated on a plain white background, no shadow on the ground, no text, no frame.
```

### Schmied Doran (`schmied`)
```
2D game character sprite of a burly village blacksmith, East Asian fantasy style. Bald head, thick brown beard, strong bare arms, rolled-up linen shirt under a heavy leather apron, holding a smithing hammer, proud friendly stance. Full body, top-down three-quarter view (camera about 45 degrees above), facing toward the viewer, idle pose. Slightly chibi proportions (large head, about one third of body height). Clean hand-painted game art, bold dark outline, soft cel shading, warm light from the top left. Centered, isolated on a plain white background, no shadow on the ground, no text, no frame.
```

## Querformat, Schadenszahlen und Angriffe

Diese Prompts beschreiben das Aussehen, das seit Version 1.2 direkt im Spiel umgesetzt ist. Mit einem Bildgenerator lassen sich daraus Vorlagen oder echte Grafiken erzeugen.

### Handy-Oberfläche im Querformat
```
Mobile game UI mockup in landscape orientation, 2D fantasy MMORPG with East Asian style. Dark lacquered wood panels with thin brass borders. Top left: character portrait panel with name, level, red health bar and blue mana bar. Top right: round minimap with brass ring and zone name below. Bottom left: translucent virtual joystick. Bottom right: large round red attack button, five round skill buttons arranged in a quarter circle around it, two round potion buttons (red and blue) beside them. Thin purple experience bar along the very bottom edge. Clean readable layout, game world visible in the middle, no text other than labels.
```

### Schadenszahlen
```
Floating damage number style sheet for a 2D fantasy action game. Large bold rounded numbers with a thick dark outline. Normal hits: warm white. Critical hits: much larger, golden yellow to orange gradient with an orange glow and a slight tilt, popping out. Damage taken by the player: red. Healing: green. Experience gain: soft violet. Plain dark background, numbers only, no other text.
```

### Schwungspuren und Treffer
```
2D game VFX sprite sheet, slash and impact effects for a fantasy action game. Row 1: crescent sword swoosh trails in 4 frames, bright white core fading into warm gold. Row 2: X-shaped double dagger slashes in violet. Row 3: 360-degree spinning sword whirl ring with dust. Row 4: hit impact star bursts with sparks, normal (white) and critical (gold, larger). Additive glow look, clean shapes, transparent or plain black background, evenly spaced grid, no text.
```

### Magie und Geschosse
```
2D game VFX sprite sheet for magic attacks in East Asian fantasy style. Row 1: teal wind crescent projectile. Row 2: spinning paper talisman with golden glow and a chain lightning arc. Row 3: cone of dragon fire with embers. Row 4: lightning bolt strike from the sky with a blue shockwave ring. Row 5: green soul orb with long glowing trail and a red life-drain beam. Row 6: purple curse rune circle on the ground. Additive glow look, plain black background, evenly spaced grid, no text.
```
