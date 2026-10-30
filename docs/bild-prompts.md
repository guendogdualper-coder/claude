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

### Magier (`magier`, seit 8.6)
Männlich und weiblich: indigo Mantelrobe mit hohem Stehkragen und Silberborte, spitzer Krempenhut mit Band in
Elementfarbe, Zepter mit schwebendem Kristall, Buch an der Kette; weiblich mit silbernem Zopf. Elementfarbe:
Feuer `crimson red`, Frost `royal blue`, Blitz `yellow-white with violet`, Erde `amber`.
```
Stylized 3D toon MMORPG wizard, {male|female}, indigo layered coat-robe with a stiff standing collar and silver trim, fitted sleeves with bell cuffs, tall pointed brimmed hat with a {element colour} band, short sceptre with a floating octahedral crystal, book on a belt chain; {male: straight ankle-length robe with a front slit and a short shoulder capelet | female: fitted bodice with silver lacing, A-line skirt, a long silver braid over one shoulder}. No sash, no feathers, no gold talismans, no hood, not teal. Full body, top-down three-quarter view (camera about 45 degrees above), facing toward the viewer, idle pose. Slightly chibi proportions (large head, about one third of body height). Clean hand-painted game art, bold dark outline, soft cel shading, warm light from the top left. Centered, isolated on a plain white background, no shadow on the ground, no text, no frame.
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

## Ausrüstung, Schmied und Stufenaufstieg

Seit Version 1.3 im Spiel umgesetzt. Gemeinsamer Stil für alle Gegenstands-Symbole:
```
2D game item icon, East Asian fantasy MMORPG style, single object centered, slightly angled, clean hand-painted game art, bold dark outline, soft cel shading, light from the top left, plain dark background, no text, no frame.
```

### Waffen je Klasse und Stufe (Stahl → Mondsilber → Drachengold → Seelenviolett)
```
Item icons for a warrior's swords in four quality tiers, side by side: 1. plain steel sword with dark red grip; 2. "Moon Blade" with pale silver-blue blade and blue grip; 3. "Dragon Sword" with golden blade and red dragon-scale grip; 4. "Soul Reaver" with glowing violet crystal blade and dark purple grip. Same shape language, increasing ornament and glow per tier. 2D game item icons, East Asian fantasy style, bold dark outline, soft cel shading, plain dark background, no text.
```
```
Item icons for a ninja's twin daggers in four quality tiers, side by side: plain short daggers, shadow daggers with silver-blue blades, viper fangs with golden curved blades, night blades with glowing violet edges. 2D game item icons, East Asian fantasy style, bold dark outline, soft cel shading, plain dark background, no text.
```
```
Item icons for a shaman's folding fans in four quality tiers, side by side: paper fan in teal, crane fan in blue with white crane pattern, phoenix fan in red and gold, dragon fan in violet with gold dragon. Small golden bells at the ends. 2D game item icons, East Asian fantasy style, bold dark outline, soft cel shading, plain dark background, no text.
```
```
Item icons for a necromancer's staffs in four quality tiers, side by side: bone staff with green orb, grave staff with icy blue orb, soul staff with fiery orange orb, lich king staff with glowing violet orb, each held by a dark wooden claw. 2D game item icons, dark fantasy style, bold dark outline, soft cel shading, plain dark background, no text.
```

### Rüstung, Helm und Schuhe je Stufe (Leder → Eisen → Drache → Seele)
```
Item icons for armor pieces in four quality tiers, arranged in a grid with rows for body armor, helmet and boots and columns for the tiers: brown leather, grey iron, red dragon scale with gold trim, dark violet soul armor with glowing runes. Helmets gain a crest from tier 2 and horns at tier 4. East Asian fantasy MMORPG style, 2D game item icons, bold dark outline, soft cel shading, plain dark background, evenly spaced grid, no text.
```

### Leuchten der Plus-Stufen
```
Item upgrade glow examples for a 2D fantasy MMORPG: the same sword icon shown five times with increasing aura. +0 no glow, +1 to +3 soft green glow, +4 to +6 blue glow, +7 and +8 purple glow with sparkles, +9 bright golden glow with light rays. Small "+N" number in the top right corner of each. Plain dark background, evenly spaced, bold dark outline style.
```

### Segensschriftrolle
```
2D game item icon of a blessing scroll: rolled parchment with wooden ends, red calligraphy lines and a red wax seal, faint golden holy glow. East Asian fantasy style, bold dark outline, soft cel shading, plain dark background, no text.
```

### Schmied: Amboss, Erfolg und Fehlschlag
```
2D game UI illustration of a blacksmith upgrade station in East Asian fantasy style: dark iron anvil on a stone base, a glowing weapon lying on it, a hammer mid-swing with orange sparks flying, warm forge glow from behind. Three variants side by side: forging in progress, success with golden light bursting from the item, failure with the item cracked and dark red smoke. Bold dark outline, soft cel shading, plain dark background, no text.
```

### Stufenaufstieg
```
2D game VFX of a level-up effect seen from a three-quarter top-down view: a bright pillar of white and golden light falling from the sky onto a small chibi character, three golden rings expanding on the ground, golden sparkles spiraling upward, the character glowing white. Additive glow look, sprite sheet with 6 frames from start to fade out, plain black background, evenly spaced, no text.
```

## Waffen- und Rüstungshändler (Version 1.4)

Im Dorf verkaufen Waffenhändler Goro und Rüstungshändlerin Mei Ausrüstung für Stufe 1, 5, 10 und 15. Die fünfte, legendäre Stufe (ab 22) gibt es nur als Beute.

### Waffenhändler Goro (`waffen`)
```
2D game character sprite of a burly village weapon merchant, East Asian fantasy style. Tanned skin, short black beard, red headband with loose tails, dark leather vest over a red shirt, strong bare arms, holding a polished sword, proud grin. Full body, top-down three-quarter view (camera about 45 degrees above), facing toward the viewer, idle pose. Slightly chibi proportions (large head, about one third of body height). Clean hand-painted game art, bold dark outline, soft cel shading, warm light from the top left. Centered, isolated on a plain white background, no shadow on the ground, no text, no frame.
```

### Rüstungshändlerin Mei (`ruestung`)
```
2D game character sprite of a village armor merchant woman, East Asian fantasy style. Dark hair in a high ponytail with a golden clasp, steel-blue tunic with gold cuffs, leather apron with a riveted metal plate, holding a kite shield in front of her, confident smile. Full body, top-down three-quarter view (camera about 45 degrees above), facing toward the viewer, idle pose. Slightly chibi proportions (large head, about one third of body height). Clean hand-painted game art, bold dark outline, soft cel shading, warm light from the top left. Centered, isolated on a plain white background, no shadow on the ground, no text, no frame.
```

### Waffen je Klasse (Lv 1, 5, 10, 15)
```
Item icons for four classes in a grid, rows are classes, columns are quality tiers from left to right (steel, bronze, moon silver, dragon gold). Row 1 swords: iron sword, broadsword, moon blade, dragon sword. Row 2 twin daggers: short daggers, twin daggers, shadow daggers, viper fangs. Row 3 folding fans: paper fan, pink silk fan, crane fan, phoenix fan. Row 4 staffs: bone staff with green orb, ash staff with pale orb, grave staff with icy blue orb, soul staff with fiery orb. East Asian fantasy MMORPG style, 2D game item icons, bold dark outline, soft cel shading, plain dark background, evenly spaced grid, no text.
```

### Rüstungsteile (Lv 1, 5, 10, 15): Rüstung, Helm, Schild, Schuhe, Gürtel
```
Item icons for armor pieces in a grid, rows are item types, columns are quality tiers from left to right (leather, bronze, iron, dragon). Row 1 body armor: leather vest, chain shirt, lamellar armor, red dragon-scale armor. Row 2 helmets: leather cap, bronze helmet, iron helmet with crest, dragon helmet with red crest. Row 3 shields: round wooden shield, bronze kite shield, iron kite shield, dragon shield with golden emblem. Row 4 boots: cloth shoes, leather boots, travel boots, dragon boots. Row 5 belts: cloth belt, leather belt, chain belt with studs, dragon belt with red gem pendant. East Asian fantasy MMORPG style, 2D game item icons, bold dark outline, soft cel shading, plain dark background, evenly spaced grid, no text.
```

### Händlerfenster
```
2D fantasy mobile game shop UI mockup in landscape orientation, dark lacquered wood panel with thin brass border, title with the merchant's name at the top. A vertical list of items, each row with a square item icon on the left, item name and required level in the middle, colored stat lines below the name (green for better than equipped, red for worse), price in gold and two buttons on the right ("Kaufen" and a golden "Kaufen & anlegen"). Clean readable layout, East Asian fantasy style.
```

## Grundausrüstung (Version 1.5)

Die Gegenstände der Stufe 1 geben nur Rüstung (Waffen nur Angriff), ohne Zusatzeffekte. Sie sehen deshalb schlicht aus: keine Edelsteine, keine Runen, kein Leuchten. Zusatzeffekte wie Vitalität, Intelligenz, Blocken, Lauftempo oder Regeneration gibt es erst ab Stufe 5 und sind dort an Verzierungen zu erkennen.

### Grundausrüstung als Symbole
```
Set of plain starter equipment icons for a 2D fantasy MMORPG, East Asian style, arranged in one row: simple iron sword, two plain short daggers, plain teal paper fan, plain bone staff with a dull green orb, brown leather armor, brown leather cap, round wooden shield with an iron boss, simple cloth shoes, plain cloth belt. Worn, practical and unadorned: no gems, no runes, no glow, no magic effects. 2D game item icons, bold dark outline, soft cel shading, plain dark background, evenly spaced, no text.
```

### Vergleich: Grundausrüstung und ab Stufe 5
```
Side-by-side comparison of 2D game item icons in East Asian fantasy style. Left column: plain starter items (leather armor, leather cap, wooden shield, cloth shoes, cloth belt) with no decoration and no glow. Right column: the same item types one quality level higher (chain shirt, bronze helmet, bronze kite shield, leather boots, leather belt) with small bronze rivets and trims, still without glow. Bold dark outline, soft cel shading, plain dark background, evenly spaced grid, no text.
```

## Kompaktes HUD und neue Umgebung (Version 1.6)

### Kompaktes HUD im Querformat
```
Mobile game HUD mockup in landscape orientation for a 2D fantasy MMORPG, minimal and compact, everything pushed into the screen corners so the center stays free. Top left: small translucent panel with level, name, thin red health bar and thin blue mana bar. Top right: small round minimap with brass ring, zone name and gold below, three small round icon buttons (character, bag, help) to its left. Bottom left: translucent virtual joystick. Bottom right: round red attack button with five small round skill buttons in a quarter circle and two small potion buttons. A very thin purple experience bar along the bottom edge. Dark lacquer with thin brass borders, semi-transparent panels, no clutter.
```

### Bäume
```
2D game environment sprite sheet of trees in East Asian fantasy style, seen from a three-quarter top-down view, each standing on its own: a round deciduous tree with a full crown of overlapping leaf clusters, a pink cherry blossom tree with a slightly crooked trunk, a dark green layered pine tree, a bare gnarled dead tree with twisted branches. Three size variants of each. Clean hand-painted game art, bold dark outline, soft cel shading with light from the top left, plain white background, evenly spaced, no text.
```

### Felsen je Zone
```
2D game environment sprites of boulders in a three-quarter top-down view for four regions: grey meadow stones, mossy forest rocks, warm orange sandstone, dark volcanic basalt. Faceted shapes with a lighter top face and a small crack, two or three sizes each. Clean hand-painted game art, bold dark outline, soft cel shading, plain white background, evenly spaced grid, no text.
```

### Häuser im Dorf
```
2D game environment sprite of a small East Asian village house seen from a three-quarter top-down view: large curved tiled roof with upturned eaves and a decorated ridge, dark wooden posts and beams, cream plaster walls, paper lattice windows with warm light, a dark wooden double door in the center, stone foundation, two red paper lanterns hanging at the roof corners. Four color variants of the roof: terracotta red, slate purple, moss green, deep red. Clean hand-painted game art, bold dark outline, soft cel shading, plain white background, no text.
```

### Dorfschmuck
```
2D game environment props for an East Asian fantasy village, three-quarter top-down view: stone lantern with a warm glowing light box and small roof, stone well with a wooden frame and red tiled roof, wooden barrel with iron bands, wooden crate. Clean hand-painted game art, bold dark outline, soft cel shading, plain white background, evenly spaced, no text.
```

### Bodenkacheln
```
Seamless 2D game ground tiles in a three-quarter top-down fantasy style, 32x32 pixels each, arranged in a grid: lush meadow grass with small blades and tiny flowers, darker forest floor, dirt path with jagged grass edges, grey cobblestone plaza in offset rows, calm blue water with a sandy shore and white foam line, warm desert sand with pebbles, dark cracked ash ground. Soft natural color variation, no visible grid lines, hand-painted look, no text.
```

## Statuswerte, Steuerung und Fertigkeiten (Version 1.7)

### Statuswerte im Charakterfenster
```
2D fantasy MMORPG character window UI mockup in East Asian style, dark lacquered wood panel with thin brass borders. Section "Statuswerte" with free points counter and four rows: STR (Stärke, red round badge), VIT (Vitalität, green), INT (Intelligenz, blue), DEX (Geschick, gold). Each row shows the current value, a short effect description and small "+1" and "+5" buttons. A small red notification dot on the character button when points are unspent. Clean readable layout, no clutter.
```

### Karte in der Ecke
```
Mobile game HUD detail in landscape: a small round minimap with a brass ring tucked flush into the top right corner of the screen, attached to the edge with a rounded inner corner, zone name and gold in tiny text below, three small round icon buttons (character, bag, help) directly to its left. Dark translucent lacquer style.
```

### Schwebender Steuerknüppel und Mehrfingerbedienung
```
Mobile game control scheme illustration in landscape: the left half of the screen is a touch area where a translucent virtual joystick appears wherever the thumb touches down; the right side has a large round attack button held by the right thumb while a second finger taps a round red potion button at the same time. Hand silhouettes show both thumbs in use. Simple diagram style with soft highlights, fantasy game screen faded in the background.
```

### Symbole der 20 Fertigkeiten
```
Set of 20 round skill icons for a 2D fantasy MMORPG, East Asian style, arranged in 4 rows of 5. Background color by type: red for attacks, blue for buffs, green for healing, purple for summoning and curses. Row 1 warrior: three fiery crescent slashes, circular sword whirl with arrow, flame of rage, charging arrow with speed lines, golden shield with cross. Row 2 ninja: dagger with blood drop, poison arrow with green drop, four crossed blades, violet crescent moon with eye, white feather. Row 3 shaman: paper talisman with red glyph, cone of dragon fire, golden sun halo, lightning bolt, green leaf with plus. Row 4 necromancer: green flying skull, heart with drain beam, skull with crossed bones, purple cursed eye in a rune circle, bone shield. Bold dark outline, soft gradients, glossy round frame, no text.
```

### Effekte der Fertigkeiten je Klasse
```
2D game VFX sprite sheet for four character classes, three-quarter top-down view, additive glow look, plain black background, no text. Warrior in fire and gold: triple fiery sword crescents with embers, a spinning blade tornado with dust ring, a red flame aura pillar, a charging dash with burning afterimages ending in an explosion and scorched ground, a golden protective shell. Ninja in shadow violet: a big X-shaped double slash with dark smoke, a green poison dart with toxic cloud, a storm of many small violet blade slashes, a smoke cloud of invisibility, white wind streaks. Shaman in teal and gold: a spinning paper talisman with golden chain lightning, a cone of dragon fire with smoke, a golden halo with falling feathers, multiple lightning strikes with scorched ground, a green healing rune circle with rising leaves. Necromancer in soul green and purple: a glowing green skull projectile with ghostly trail, a red life-drain beam, a green summoning pentagram with rising flames, a purple curse rune circle, orbiting bone shards around the caster.
```

### Auren aktiver Buffs
```
2D game VFX loop frames of buff auras around a small chibi character, three-quarter top-down view: rising red embers (rage), rotating golden dashed ring under the feet with gold sparkles (strong body, blessing), drifting violet smoke (stealth), white wind streaks trailing behind while running (agility), six bone shards orbiting the body (bone armor). Additive glow look, plain black background, evenly spaced, no text.
```

## Verkaufen, Monster und Boni aus Seelensteinen (Version 1.8)

### Verkaufen bei jedem Händler
```
2D fantasy MMORPG merchant window UI mockup in East Asian style, dark lacquered wood panel with thin brass borders. Upper part shows the merchant's wares, lower part a section titled "Verkaufen" with a compact grid of the player's bag items: small square item icons with colored plus value, a tiny gold coin price below each. One item is selected and glows red with a confirm label "Nochmal tippen zum Verkaufen". A short gold message line at the bottom: "Bronzehelm +2 für 106 Gold verkauft." Clean readable layout, no clutter.
```

### Bessere Monster
```
2D game monster sprite sheet in cute chibi fantasy style, three-quarter top-down view, each monster standing on its own with a soft ground shadow, ten monsters: a wild dog with bushy tail and bared fangs, a grey wolf with a thick neck mane, a black alpha wolf with a scar over the eye and glowing red eyes, a hunched goblin with a leather pouch and dagger, an orc warrior with spiked shoulder pads and a bone necklace, a desert scorpion with a glowing stinger, a bat-winged imp with bone-lined wings, a hooded dark cultist with a torn cape and glowing runes, an armored skeleton knight, a horned fire demon with claws and ember glow. Big expressive eyes with angry brows, fur strands and small details, bold dark outline, soft cel shading with light from the top left, plain white background, evenly spaced grid, no text.
```

### Materialien aus Seelensteinen
```
Set of four item icons for a 2D fantasy MMORPG, East Asian style, square with soft glow: "Verstärkung" a small blue crystal shard with a white plus sign (adds bonus 1 to 4), "Seltene Verstärkung" a larger violet crystal with five tiny stars (adds the fifth bonus), "Switcher" a round green orb with two curved arrows swirling around it (rerolls bonuses), "Sternenstein" a golden star-shaped gem with radiant rays (adds special bonus 6 and 7). Bold dark outline, glossy highlights, soft gradients, plain dark background, evenly spaced, no text.
```

### Beute fliegt automatisch zur Figur
```
2D game VFX frames, three-quarter top-down view: a destroyed purple soul stone crumbles into shards, small glowing item icons (blue crystal, green orb, golden star, a helmet) burst out in an arc and fly in curved paths with sparkling trails into a small chibi hero, each item shrinking and flashing when it arrives. Additive glow look, plain black background, no text.
```

### Boni und Verzaubern im Inventar
```
2D fantasy MMORPG item tooltip and enchant UI mockup in East Asian style, dark lacquer panel with brass border. Item "Eisenschwert +2" with base stats, then a list of five blue bonus lines (e.g. "Max. Leben +320", "Stark gegen Monster +8%", "Kritische Treffer +5%", "Angriffstempo +6%", "Lebensraub +2%") and two golden special bonus lines below a thin divider ("Fertigkeitsschaden +6%", "Schaden durch Grundangriffe +5%"). Under it a row of four material buttons with counters: blue crystal "Boni +", violet crystal "5. Bonus", green orb "Switcher", golden star "Bonus 6/7". The item frame pulses with a short blue-gold enchant shine. Clean readable layout, no clutter.
```

### Ausrüstung aus Seelensteinen bis +2
```
2D fantasy MMORPG loot illustration, three-quarter top-down view: a shattered soul stone on the ground with three floating equipment pieces above it, a helmet labeled "+0" with white glow, boots "+1" with light green glow, a sword "+2" with blue glow, small sparkles around them. Cute chibi game art style, bold dark outline, soft cel shading, plain white background.
```

## Figur und Symbole im Inventar (Version 1.9)

### Figur mit angelegter Ausrüstung
```
2D fantasy MMORPG inventory UI mockup in East Asian style, dark lacquered wood panel with thin brass borders. Section "Angelegt": on the left a tall framed portrait card with the player's small chibi character standing front-facing on a soft glowing spotlight, holding the equipped sword and shield. Next to it a 3x2 grid of square equipment slots (weapon, armor, helmet, shield, boots, belt), filled slots show the item icon with a colored plus value like "+2" or "+7" and a matching glow border. Clean readable layout, no clutter.
```

### Blasse Symbole für leere Plätze
```
Set of six faint ghost silhouette icons for empty equipment slots in a 2D fantasy MMORPG, East Asian style: sword, chest armor, helmet, round shield, pair of boots, belt with buckle. Each in pale grey at low opacity inside a dark square slot with a dashed brass border and a tiny uppercase label below (WAFFE, RÜSTUNG, HELM, SCHILD, SCHUHE, GÜRTEL). Minimal, subtle, no color.
```

## Seelensteine, Gebiete, Dorf, Aufträge und Klassenwege (Version 2.0)

### Die 14 Seelensteine (Stufe 5 bis 70)
```
2D game sprite sheet of 14 magical soul stones for a fantasy MMORPG, three-quarter top-down view, each standing on a small pile of rubble with a soft colored glow, arranged in two rows of seven, from small to large: Stone of Sorrow (grey-blue crystal spire with pale blue runes), Stone of Rage (red-brown obelisk with glowing red runes), Stone of Greed (dark green crystal cluster with golden runes), Stone of Thorns (brown spire wrapped in thorny vines, green runes), Stone of Blackness (black boulder with purple runes), Stone of Ash (grey obelisk with orange runes), Stone of Embers (dark red boulder with lava cracks), Stone of Shadows (two leaning violet spires with smoke), Stone of Frost (translucent ice crystal cluster), Stone of Silence (white marble monolith with cyan runes and floating shards), Stone of Decay (two sick green-brown spires with toxic mist), Stone of Pain (blood-red crystal spire with black runes), Stone of Flame (obsidian monolith with fire cracks), Stone of Doom (huge black monolith with golden runes and a floating crown of shards). Bold dark outline, cel shading, glowing runes, plain white background, no text.
```

### Gebiete bis Stufe 70
```
2D fantasy MMORPG world map concept in East Asian style, top-down, concentric regions around a walled village in the center: sunny meadows with cherry trees (level 1-9), dark pine forest (10-19), orange orc valley with dead trees (20-29), grey ash wasteland with dark bog water (30-39), snowy frost peaks with frozen lakes and snow-covered pines (40-49), misty undead swamp with mossy dead trees (50-59), black basalt volcano land with lava rivers in the corners (60-70). Four dirt roads lead from the village gates to the edges. Hand-painted game art, soft colors, small labels for each region.
```

### Neue Monster
```
2D game monster sprite sheet in cute chibi fantasy style, side view facing right, each with a soft ground shadow, fourteen monsters: forest spider with red markings, big brown bear, desert scorpion with glowing green stinger, orc captain with horned helmet and red cape, hellhound with flaming mane, ice wolf with glowing blue eyes, white yeti with blue face, floating frost ghost with an icicle crown, undead warrior in rusty armor with green glowing eye, swamp witch with pointed hat and skull staff, hunched ghoul with claws, lava golem with glowing cracks, fire demon with flaming hair and wings, red fire dragon with wings and horns. Big expressive angry eyes, bold dark outline, cel shading, plain white background, evenly spaced grid, no text.
```

### Dorf mit Mauer und Toren
```
2D game environment of an East Asian fantasy village seen from a three-quarter top-down view: a square village wall of cream plaster with dark wooden beams, small arrow slits and a slate-blue tiled roof cap, watchtowers with curved red roofs and red lanterns at every corner and on both sides of each gate, a red wooden gate arch with a curved roof and a golden name plate "HAYAN" over the north and south road. Inside: cobblestone plaza with a well, eight houses with curved roofs, colorful market stalls with striped awnings, stone lanterns, barrels and crates. Clean hand-painted game art, bold dark outline, soft cel shading, no text except the name plate.
```

### Neue Dorfbewohner
```
2D game character sprite sheet, cute chibi style, front view, standing pose, East Asian fantasy village people: village elder with long white beard, brown robe and a staff with a blue gem; huntress in a green tunic with bow and quiver and a red ponytail; teleport guide woman in a blue robe holding a glowing blue orb; alchemist in a purple robe with round golden glasses and potion bottles on his belt; town guard with red lamellar armor, round helmet and spear; farmer with a straw hat and hoe; small child with hair buns; old woman with grey bun and walking stick; monk in an orange robe with prayer beads. Small floating icons above some of them: scroll (quests), target (hunting), blue swirl (travel), green flask (alchemy). Bold dark outline, cel shading, plain white background, no text.
```

### Aufträge und Belohnungen
```
2D fantasy MMORPG quest window UI mockup in East Asian style, dark lacquered wood panel with thin brass borders: title "Dorfältester Bao", small line "Auftrag 3 von 20", quest name, a short story text in quotes, a goal line "15 × Wolf besiegen", and a reward list with small icons (experience, gold coins, a helmet with +1, blue crystal materials), a big golden button "Belohnung abholen". Next to it a small HUD quest tracker under a round minimap showing "Wolfsplage 12/15" and "Jagd: Wildschwein 4/20". A yellow exclamation mark floating above the elder's head in the game world. Clean readable layout, no clutter.
```

### Reisen mit der Wegweiserin
```
2D fantasy MMORPG travel window UI mockup in East Asian style: list of regions with level ranges and gold prices (Sonnenwiesen, Dunkelwald, Orktal, Ödland, Frostgipfel, Totenmoor, Feuerberg), each row with a small brass button. In the game world next to it a stone circle teleport gate with a glowing blue rune and a pillar of blue light as the hero vanishes. Dark lacquer and brass style.
```

### Zwei Wege je Klasse
```
2D fantasy MMORPG character creation UI mockup in landscape: four class cards on the left (warrior, ninja, shaman, necromancer), on the right two path cards for the selected class side by side, e.g. "Weg der Klinge – PvE · Flächenschaden" and "Weg des Leibes – PvP · Verteidigung und Kontrolle", each with a short description, below a list of five round skill icons with names and unlock levels. Dark lacquered wood, brass borders, readable fonts, no clutter.
```

### Symbole der 20 neuen Fertigkeiten
```
Set of 20 round skill icons for a 2D fantasy MMORPG, East Asian style, 4 rows of 5, background red for attacks, blue for buffs, purple for curses and summoning. Warrior: glowing sword aura in rings, shield bash with speed lines, earthquake stomp with cracks, blue mind strike with burst, war cry sound waves. Ninja: spinning twin blades, poison cloud with skull, shadow dash with afterimages, crippling blade with poison drop, shadow cloak with glowing eyes. Shaman: dragon head with golden glow, thunder cloud with three bolts, glowing spirit fist, wind ribbons binding, guardian spirit in a golden ring. Necromancer: whirl of three green souls around a skull, dark power star, bone spear, paralyzing green rune circle, blood drop sacrifice. Bold dark outline, soft gradients, glossy round frame, no text.
```

### Effekte der Buffs (2 bis 3 Minuten)
```
2D game VFX loop frames around a small chibi hero, three-quarter top-down view, additive glow, plain black background: golden sword aura with sparks running along the blade, red ember flames rising (battle rage), dark violet smoke cloak, orange dragon fire embers, cyan guardian spirit halo with soft light dots, purple-green dark power embers, red blood droplets orbiting. Each with a rotating dashed ring under the feet in the matching color.
```

### Stimmung in den Gebieten
```
2D game ambient particle overlays for six regions, three-quarter top-down fantasy game: floating pollen over sunny meadows, glowing yellow-green fireflies in a dark forest, warm dust blowing through an orange valley, grey ash and orange sparks drifting over a wasteland, snowflakes falling diagonally over snowy peaks, green will-o'-the-wisps rising from a misty swamp, glowing embers rising over a lava field. Each shown as a soft tinted screen overlay with particles, no text.
```

## Beute, Fertigkeitsbogen und Lebensbalken (Version 2.1)

### Beute-Fenster mit Rucksack
```
2D fantasy MMORPG loot window UI mockup in East Asian style, dark lacquered wood panel with thin brass borders, title "Beute". Top row: small icons with counters for gold coins, purple soul splinters, a blessing scroll, red and blue potions and four enchant materials (blue crystal, violet crystal, green swirl orb, golden star). Below a wide golden button "Rucksack öffnen (12/20)". Two columns: "Zuletzt aufgehoben" with rows of item icon, colored item name, amount "× 3" and "vor 5 s", and "Gesamt seit dem Start" with summed amounts. Clean readable layout, no clutter.
```

### Beuteanzeige unten rechts
```
Mobile game HUD detail in landscape, bottom right area next to the skill buttons: a vertical stack of small pill-shaped loot notifications sliding in from the right, each with a dark translucent background, thin brass border, a small item icon, a colored item name and a golden amount, for example "Gold × 397", "Seelensplitter × 3", "Verstärkung × 2", "Mondklinge +1 × 1". The newest entry pops briefly, older ones fade out. Next to the potions a round leather backpack button with a red counter badge.
```

### Fertigkeiten im engen Bogen um den Angriffsknopf
```
Mobile game HUD in landscape, bottom right corner: a large round red attack button with crossed silver swords, golden ring and the word "Angriff", surrounded closely by an arc of five round skill buttons with painted skill icons, each in a thin metal ring colored by type (brass for attacks, blue for buffs, green for healing, purple for curses), a glossy highlight on top, a small golden level plaque at the bottom, and a clockwise dark cooldown sweep with a bright edge and big white seconds in the middle. A skill that becomes ready flashes brightly once. To the left a vertical column of three smaller round buttons: backpack, blue potion, red potion. Dark fantasy style, readable on a phone.
```

### Schönere Lebensbalken
```
2D fantasy MMORPG HUD detail: top left player frame with a round portrait of a chibi warrior in a brass ring and a golden level badge "12", next to it a red health bar and a blue mana bar with dark frames, glossy highlight stripe, faint tick marks every 10 percent, centered white numbers, and a pale golden trailing segment that shows the damage just taken and shrinks after a short delay. When health is low, the health bar pulses with a red glow. Above monsters small rounded health bars with dark outline, gradient fill and the same golden damage trail.
```

## Neue Lebensanzeige, Lebensraub, Schwertwirbel und Grafik (Version 2.2)

### Lebens- und Manabalken
```
2D fantasy MMORPG HUD detail, top left: round portrait of a chibi warrior in a golden ring with a small golden level badge, next to it two slanted parallelogram bars with a polished brass frame: a glossy liquid red health bar with a red heart icon at its left end and a glossy blue mana bar with a blue drop icon. A soft white shine sweeps slowly across the liquid, white numbers with dark outline in the middle. When health is low the heart beats and the bar glows brighter. No golden damage trail, the bar simply shrinks. Dark lacquer style, crisp and readable on a phone.
```

### Lebensbalken über Monstern
```
2D game UI sprite sheet of small slanted health bars above monsters: dark parallelogram frame with a thin brass outline, red gradient fill with a glossy top stripe, a purple and a blue variant for soul stones, shown at full, half and almost empty. Clean, readable, plain dark background.
```

### Grüne Zahlen bei Lebensraub
```
2D game VFX frame, three-quarter top-down view: a chibi warrior hits a wolf with his sword, small green glowing particles fly from the wolf back to the warrior, above the warrior's head a bold green number "+64" with dark outline rises, next to white damage numbers above the wolf. Cute fantasy game style.
```

### Schwertwirbel mit sichtbarer Klinge
```
2D game VFX sequence, three-quarter top-down view: a chibi warrior spins on the spot while a huge glowing phantom copy of his own sword whirls around him in a flat ellipse, two full turns, with five fading afterimages of the blade behind it, a bright golden ring on the ground, sparks flying from the blade tip and dust kicked up. Variant for a ninja: two glowing daggers on opposite sides. Additive glow, cel-shaded sword sprite, plain dark background.
```

### Schwungspuren und Geisterklingen der Attacken
```
2D game VFX sprite sheet: crescent sword trails that are wide and bright at the leading edge and taper to a thin point at the tail, with a white hot core line and a soft outer glow, in fiery orange, gold, violet and white. Next to them a giant translucent phantom sword that sweeps once along each crescent with fading afterimages. Additive glow look, plain black background.
```

### Stimmungsvollere Grafik
```
2D fantasy MMORPG game screen, three-quarter top-down view of a meadow with cherry trees and a small village wall: soft blurred shadows under every character, tree and house, large soft cloud shadows drifting slowly over the grass, warm sunlight from the top left and gently darkened screen edges like a vignette, small floating pollen in the air. Cute hand-painted style, cozy and atmospheric.
```

## Buff-Symbole, Ausrüstung je Klasse, Bögen, +20 und Monster-Teile (Version 2.3)

### Buffs als Symbole mit Restzeit
```
Mobile game HUD detail, top left player frame of a 2D fantasy MMORPG: under the health and mana bars a row of small round skill icons for active buffs (golden sword aura, blue feather of agility, red flame of rage, bone shield), each icon framed by a thin golden ring that empties clockwise as the buff runs out, the remaining time in tiny bold white text below each icon ("2:45", "1:10", "9s"), a small badge with the shield amount on the bone shield, an icon blinking softly when it is about to run out. Dark lacquer style, readable on a phone.
```

### Waffen, die sich je Stufe unterscheiden
```
2D game weapon sprite sheet for a fantasy MMORPG, eight upgrade tiers per row from left to right (iron, bronze, moon, dragon, soul, ash, sky, divine), rows: one-handed swords (straight, broad, curved moon saber, serrated dragon blade with red gem, purple soul blade with runes and spiked guard, dark ash blade with glowing orange edge, white-blue sky blade with winged guard, golden divine blade with white gem), two-handed greatswords (same styles, much longer and wider), twin daggers, bows (wooden, recurved, colored limbs, gem in the grip), war fans with crane and flame motifs, temple bells on a handle with ribbons, necromancer staffs with skull, crystal and star heads, scythes with curved blades. Bold dark outline, cel shading, plain dark background, no text.
```

### Rüstung und Helm an der Figur
```
2D game character sprite sheet, cute chibi style, front view, four classes in four rows, each in eight armor tiers from left to right: warrior from brown leather and no helmet to iron plate with breastplate, crimson dragon armor with horned helmet, purple soul armor with spiked shoulders, sky-blue armor with winged helmet and golden divine armor; ninja from brown cloth to dark violet, green, crimson-black and blue outfits with colored scarf and a forehead plate mask, glowing eyes at the highest tier; shaman from plain linen robe to purple, teal, red and white-gold robes with golden trim, headband turning into a spiked crown and a halo; necromancer from grey shroud to dark robes with red, purple or golden glowing eyes and a bone crown on the hood. Bold dark outline, cel shading, plain green background, no text.
```

### Ninja mit Bogen
```
2D game action frame, three-quarter top-down view: a chibi ninja in a dark hood with a purple scarf holding a red recurve bow, shooting a white-feathered arrow with a light trail at a grey wolf far away, the wolf flinching with a hit spark. Cute fantasy game style, bold outlines, soft cel shading.
```

### Ausrüstung nur für die eigene Klasse
```
2D fantasy MMORPG inventory detail mockup in East Asian style: a selected item "Lamellenpanzer" with the line "Rüstung · Krieger · Gut · ab Stufe 10" and a red warning "Nur für Krieger. Du kannst es verkaufen." while the player is a ninja; the button "Anlegen" is greyed out, the button "Verkaufen (120 Gold)" is active. Next to it the weapon merchant window showing two lists for the ninja: "Dolche für Ninja – schnell, oft kritisch" and "Bogen für Ninja – greift aus der Ferne an", each item with attack, attack speed and crit values in green or red compared to the equipped weapon.
```

### Schmied bis +20 mit Monster-Teilen
```
2D fantasy MMORPG blacksmith window UI in East Asian style: an anvil with a glowing dagger "+8 → +9", the stats before and after, a red-to-green success bar "Erfolgschance 20 %", the costs in gold and soul splinters and an extra line with a small icon "Dazu: 1 × Banditenabzeichen (du hast 1), von: Bandit, Stufe 11", a warning "Bei Fehlschlag zerbricht der Gegenstand!", a checkbox for a blessing scroll and a big golden button "Verbessern". Item tiles show plus values in green, blue, purple, gold (+10 to +14), red (+15 to +19) and white (+20) with matching glow borders.
```

### Monster-Teile als Beute
```
Set of 24 small item icons for a 2D fantasy MMORPG, crafting materials dropped by monsters, arranged in a grid: dog tooth, grey wolf pelt, black alpha pelt, boar tusk, red bandit badge, iron arrowhead, white spider silk, brown bear claw, orc tooth, blue shaman feather, green glowing scorpion stinger, golden war banner, ogre horn, red demon horn, glowing hell ember, white ice wolf fur, snowy yeti fur, frost crystal, bag of grave dust, green witch herb, ghoul claw, glowing lava core, burning fire wing feather, red dragon scale. Bold dark outline, soft gradients, plain dark background, no text.
```

### Ausrüstung ab Stufe 30 aus hohen Gebieten
```
2D fantasy MMORPG loot moment, three-quarter top-down view: a destroyed level 20 soul stone in an orange orc valley bursting into shards, a glowing mythic chest armor and a dark ash blade with orange edge floating above it with an orange-gold glow, a small label "Mythisch · ab Stufe 30". In the background the grey ash wasteland where such gear also drops from ogres and demons. Cute chibi game art, bold outlines, warm glow.
```

## Fertigkeitsränge, Schild oder Zweihand, Schwerter, Buffs und Glitzern (Version 2.4)

### Ränge der Fertigkeiten: Erwacht, Heroisch, Legendär, Vollendet
```
2D fantasy MMORPG skill window UI mockup in East Asian style, dark lacquered wood panel with brass borders: a list of five skills with round painted icons; on the right of each row the skill level and rank in colored text: "Stufe 15/15" with a glowing violet button "Erwecken → E1", "Erwacht E5" in ice blue with a button "Buch lesen", "Heroisch H6" in violet, "Legendär L2" in gold, "Vollendet V" in crimson-gold with "Höchste Stufe". In the corner a counter "Fertigkeitsbücher: 4" with a small purple book icon. Below the window the skill buttons around the attack button with ring colors per rank (silver-blue, violet, gold, pulsing crimson-gold) and small level plaques "E5", "H6", "V".
```

### Fertigkeiten werden je Rang wuchtiger
```
2D game VFX sheet, three-quarter top-down view, the same sword skill cast four times by a chibi warrior, from left to right with growing power: rank Erwacht with an ice-blue ring burst and sparks, rank Heroisch adding a violet rune circle on the ground, rank Legendär adding a golden pillar of light and a bright flash, rank Vollendet adding a huge golden shockwave ring, crimson and gold embers rising and screen shake lines. Additive glow, plain dark background, no text.
```

### Fertigkeitsbuch
```
Small item icon for a 2D fantasy MMORPG: a thick purple leather skill book with a golden circular emblem with a cross on the cover, cream pages visible on the side, soft magical glow. Bold dark outline, cel shading, plain dark background, no text.
```

### Schild oder Zweihandwaffe
```
2D fantasy MMORPG character comparison, three-quarter top-down view, two chibi warriors side by side: the left one with a one-handed sword and a blue-silver shield raised, a bright shield flash and blue-white sparks as an enemy claw is blocked, the word "Geblockt" in pale blue above; the right one holding a huge two-handed greatsword with both hands and no shield, a small note icon showing a crossed-out shield. Cute fantasy game art, bold outlines, cel shading.
```

### Neu gezeichnete Schwerter
```
2D game weapon sprite sheet: sixteen fantasy swords in two rows (one-handed and two-handed), eight tiers each from left to right: plain iron, bronze, curved moon saber, serrated dragon blade with red gem, purple soul blade with runes and spiked guard, dark ash blade with orange edge, sky-blue blade with winged guard, golden divine blade with white gem. Each blade with a light upper bevel and a darker lower bevel, a fuller groove down the middle, a bright edge line and tip shine, ornate crossguard with curved quillons, leather-wrapped grip and a round pommel with a gem. Bold dark outline, cel shading, plain dark background, no text.
```

### Buffs, die man an der Figur erkennt
```
2D game character sheet, three-quarter top-down view, chibi heroes each showing one active buff clearly: Battle Rage with jagged red-orange lightning bolts crackling around the body and a red glow; Sword Aura with a rotating golden dashed rune circle on the ground, golden motes rising and a glowing blade; Strong Body as a translucent golden scale-pattern shell around the body; Agility with white wind ribbons swirling around the legs; Shadow Cloak as dark violet smoke around the figure; Dragon Power as a ribbon of orange fire circling like a small dragon; Blessing as a golden halo above the head; Guardian Spirit as a tiny cyan ghost orbiting; Dark Power as violet and green flames licking up at the feet; Blood Sacrifice as red blood drops orbiting with a red aura. Cute game art, additive glow effects, plain green background.
```

### Glitzern ab +8
```
2D game close-up, three-quarter top-down view: a chibi warrior whose +12 golden sword, +15 crimson armor and +20 helmet sparkle with small four-pointed twinkling stars in the color of their upgrade level (gold for +10 to +14, red for +15 to +19, white with a soft halo for +20), so other players can see the strong equipment from afar. Next to it inventory tiles with the same twinkling stars on items +8 and higher. Cute fantasy game art, bold outlines.
```

### Meldungen mittig links
```
Mobile game HUD layout in landscape: system messages like "Stein der Wut zerstört! +2.417 EP" and "Aura des Schwertes ist aktiv" stacked on the middle of the left edge in small dark translucent pills, the bottom left kept free for a future chat window marked with a dashed outline, loot notifications at the bottom right next to the skill arc. Clean dark fantasy style.
```

## Erwecken auf 17, Werte je Stufe und neue Tränke (Version 2.5)

Fertigkeiten werden mit jedem Punkt spürbar stärker, Erwecken direkt auf 17, neue Tränke.

### Erwecken auf Stufe 17
```
Mobile game HUD close-up in landscape, dark fantasy style: a round skill button with a sword aura icon and a small "17" level badge; above it a glowing light-blue round button with a bold white letter "E" pulsing with a soft blue halo, inviting to awaken the skill. Second panel: the same skill button after awakening, now with a light-blue rank ring, a "E1" badge and a burst of blue light particles, banner text "Aura des Schwertes: Erwacht" at the top. Clean game UI, bold outlines.
```

### Werte je Stufe im Charakterfenster
```
Mobile game character window, dark leather and gold fantasy style, list of skills: each row has a round skill icon, the skill name, a short description, a line with the current values in warm gold ("Angriff +29,6 % · Krit +7,4 % · Dauer 238 s") and below it the next level preview in muted text where every value that increases is highlighted in bright green ("Stufe E1: Angriff +31,5 % · Krit +7,9 % · Dauer 248 s"), with buttons "Verbessern" or a glowing purple "Erwecken → E1" on the right. Clean readable UI.
```

### Buff wird mit jeder Stufe stärker
```
2D game illustration, three-quarter top-down view, four chibi warriors in a row showing the Sword Aura buff at levels 1, 17, E1 and V: the golden rune circle on the ground grows bigger and brighter from left to right, more golden motes rise, the sword glows stronger, and at V the aura turns red-gold with flames. Small value tags under each: "+20 %", "+29,6 %", "+31,5 %", "+47,9 %". Cute fantasy game art, bold outlines, cel shading, plain green background.
```

### Drachenblut (Lebenstrank)
```
Game item icon for a 2D fantasy MMORPG: a round-bellied glass potion flask filled with glowing crimson-red liquid called "Drachenblut", short neck with a golden collar, cork sealed with dripping red wax, a golden band around the belly with a small golden heart emblem, tiny bubbles and a warm orange inner glow, white glass highlights on the left. Bold dark outline, cel shading, plain dark background, no text.
```

### Mondtau (Manatrank)
```
Game item icon for a 2D fantasy MMORPG: a faceted crystal potion bottle shaped like a gem with a pointed bottom, filled with glowing sky-blue to deep-blue liquid called "Mondtau", small white four-pointed star sparkles floating inside, silver neck and a silver crescent-moon stopper, visible cut facet lines and a cool blue halo. Bold dark outline, cel shading, plain dark background, no text.
```

### Trinken
```
2D game effect sheet, three-quarter top-down view: a chibi hero drinking a red potion with a red ring expanding at the feet and red-orange embers rising, and the same hero drinking a blue potion with a blue ring and white-blue sparkles rising. Next to it the HUD potion buttons: round dark slots with the red Drachenblut flask and the blue Mondtau crystal bottle and small counters. Cute fantasy game art, additive glow.
```

## Fertigkeiten tauschen, Bücher je Fertigkeit, Tasche mit 4 Seiten und Buffs je Rang (Version 2.6)

### Fertigkeiten per langem Drücken tauschen
```
Mobile game HUD close-up in landscape, dark fantasy style: five round skill buttons in an arc around a big red attack button; one skill button is lifted and enlarged with a bright white ring and a golden glow, a finger holds it and a dotted arrow shows it being dragged onto another slot, the other skill buttons gently wiggle; a small toast "Sichelwelle angehoben: auf einen anderen Platz ziehen oder tippen". Clean game UI, bold outlines.
```

### Fertigkeitsbücher für jede Fertigkeit
```
Game item icon set for a 2D fantasy MMORPG: twelve small leather skill books, each cover in the color of its class (crimson red for warrior, deep violet for ninja, teal for shaman, dark green for necromancer) with a golden spine band and a round golden medallion showing the painted icon of one skill (sword aura, lightning, poison cloud, skull, wind, heart, flame, dagger, eye, shield, fist, bolt), cream pages on the side, small stack counter numbers in the corner. Bold dark outline, cel shading, plain dark background, no text.
```

### Seelenstein lässt Bücher fallen
```
2D game scene, three-quarter top-down view: a shattered soul stone in a dark forest clearing releasing glowing loot that arcs toward a chibi warrior: several colored skill books of different classes, one golden-glowing book marked as the warrior's own skill, others in violet; loot notifications at the bottom right "Buch: Schattenmantel ×1", "Buch: Aura des Schwertes ×1" in gold. Cute fantasy game art, bold outlines, additive glow.
```

### Tasche mit vier Seiten und Mehrfachverkauf
```
Mobile game inventory window, dark leather and gold fantasy style: left the character doll with equipment slots, right a bag grid of 20 slots with page tabs "I 20", "II 20", "III 20", "IV 10" on top; a bar with "45 ausgewählt · 103.806 Gold" and buttons "Ganze Seite", "Nicht nutzbar", "Verkaufen", "Fertig"; selected items have an orange outline and a small orange check badge; items include stacked skill books with counters and curved swords +1. Below a hint "Verkaufen geht nur bei einem Händler im Dorf". Clean readable UI.
```

### Laufender Buff an der Fertigkeit
```
Mobile game HUD close-up: a round skill button with a sword aura icon and a purple rank ring "H1"; a bright cyan light streak runs around the button like a spinning comet ring, and a small cyan pill above it shows the remaining time "4:34"; next to it a lightning buff skill with "2:29" and a cooldown number "43" over a darkened clock wipe. Clean game UI, bold outlines, glow.
```

### Kampfrausch je Rang
```
2D game VFX sheet, three-quarter top-down view, the same chibi warrior four times with the Battle Rage buff: at level 17 only one tiny short red spark bolt flickering now and then; at rank Erwacht two short red-orange lightning bolts; at rank Legendär four long crackling bolts and a red glow; at rank Vollendet six long bolts around the whole body plus lightning striking into the ground at the feet. Additive glow, plain green background, no text.
```

### Aura des Schwertes an der Klinge
```
2D game VFX sheet, three-quarter top-down view, a chibi warrior holding a sword with the Sword Aura active at four levels: the real blade is wrapped in a glowing golden-white energy blade that extends beyond the tip, longer and wider with each rank; flame tongues rise from the blade; from rank Erwacht small sparks in the rank color (ice blue, violet, gold, crimson) spiral along the blade; a golden dashed rune circle on the ground. Additive glow, plain green background, no text.
```

## Stärkere Monster und freier Angriff (Version 2.7)

### Monster über der eigenen Stufe
```
2D fantasy MMORPG scene, three-quarter top-down view: a chibi level 20 warrior with simple iron gear standing at the edge of a scorched wasteland, facing a towering red demon marked "Lv 35" with a skull icon next to its name, its health bar barely scratched while the warrior's own red health bar is almost empty; small damage numbers "-12" on the demon and big red numbers "-240" on the warrior; behind the warrior the greener orc valley with orcs marked "Lv 21" looks much safer. Cute game art with a dangerous mood, bold outlines, cel shading.
```

### Gleiche Stufe: ein harter, fairer Kampf
```
2D fantasy MMORPG combat scene, three-quarter top-down view: a chibi warrior with a +7 glowing sword fighting a group of three orcs "Lv 21" in a rocky valley; the warrior uses a whirling sword skill with orange arcs, one orc is stunned with stars, the warrior's health bar at 60 percent, a red potion being drunk with rising embers, orange and white damage numbers. Cute game art, bold outlines, additive glow effects.
```

### Freier Angriff ohne Ziel
```
2D fantasy MMORPG character sheet, three-quarter top-down view: four chibi heroes attacking into empty space with no enemy nearby, each facing right: a warrior swinging a sword with an orange arc trail, a ninja shooting an arrow that flies straight forward, a shaman casting a teal energy orb forward with a fan, a necromancer firing a green soul bolt from a staff. Small hint text "Angriff in Blickrichtung". Cute game art, bold outlines, plain green background.
```

## Stallmeister, Pferd, Missionszeichen und Dungeons (Version 2.8)

### Hauptmission golden, Nebenmission grün
```
2D fantasy MMORPG village scene, three-quarter top-down view: three chibi quest givers, an old village elder with a white beard and a stable master with a straw hat each with a big bouncing golden exclamation mark with a warm glow above the head, and a huntress with a bow with a bright green exclamation mark above her head; in the top right corner a quest list with golden lines for main quests and green lines for side quests, each starting with a small exclamation mark. Cute game art, bold outlines, cel shading.
```

### Stallmeister Jun und sein Stall
```
2D fantasy MMORPG NPC, three-quarter top-down view: a friendly chibi stable master in a brown leather vest with a golden buckle, a wide straw hat with a red band, holding reins in one hand; next to him a saddled brown horse with a dark mane and a red saddle, stacked golden hay bales and a wooden fence, at the edge of an East Asian village with a stone wall. Cute game art, bold outlines, cel shading, plain grass background.
```

### Prüfung des Stallmeisters mit Zeitlimit
```
Mobile game HUD close-up in landscape, dark fantasy style: a quest window titled "Prüfung des Stallmeisters" with a golden "Hauptmission · ab Stufe 30" label, the goal "120 Monster ab Stufe 25 in 20 Minuten besiegen" and rewards with a horse icon; in the top right of the HUD a golden tracker line "Prüfung des Stallmeisters 60/120 · 14:22" with a ticking hourglass. Clean game UI, warm gold accents.
```

### Reiten
```
2D fantasy MMORPG character sprite sheet, side view and three-quarter view: a chibi warrior riding a brown horse with a dark mane and a saddle in the warrior's class color, four galloping frames with legs stretching and tucking, dust puffs behind the hooves, the rider holding a sword; next to it a round HUD button with a horse head icon glowing gold while riding. Cute game art, bold outlines, cel shading, plain background.
```

### Dungeon-Eingänge auf der Karte
```
2D fantasy MMORPG scene, three-quarter top-down view: a rocky stone arch cave entrance with a swirling violet portal inside beside a dirt path in a dark pine forest, the name "Spinnenhöhle" in gold below it; inset: a round minimap with small colored square markers for four dungeons (violet, orange, ice blue, fiery red). Cute game art, bold outlines, soft glow.
```

### Die vier Dungeons
```
2D fantasy MMORPG environment sheet, three-quarter top-down view, four dungeon rooms with raised walls that show a lit top and a dark front face: a purple-black spider cave with violet braziers and spider webs, an orc fortress with grey stone brick walls, flagstone floor and orange braziers, an ice grotto with bright white ice walls, blue-white floor and pale blue flames, a dragon lair with black basalt walls with glowing orange cracks and lava pools. Each room has small monsters: purple cave spiders, armored orc guards, ice golems, young fire dragons. Cute game art, bold outlines, moody lighting.
```

### Bosse
```
2D fantasy MMORPG boss sheet, three-quarter top-down view, four huge chibi bosses each standing in a pulsing aura of its color: the Spider Queen, a giant dark purple spider with golden markings and magenta eyes; Warlord Gor'thak, a massive orc in black armor with golden pauldrons, a crimson cape, bone horns and a great axe; Ice King Hrim, a towering pale blue ghost with a golden crown; the ancient dragon Vharak, a black-purple dragon with golden belly, huge wings and fiery eyes. Each with a name plate and level. Cute but menacing game art, bold outlines, cel shading.
```

### Boss-Stampfer und Bossbalken
```
2D game combat scene, three-quarter top-down view: a chibi warrior quickly running out of a large red dashed warning circle on the ground that is filling up around the Ice King boss; a wide boss health bar at the top center with the name "Lv 52 Eiskönig Hrim" and the numbers below; ice shards flying outward in all directions; three frost ghosts appearing in bursts of light as reinforcements. Cute game art, bold outlines, additive glow.
```

## Zusammen spielen (Version 2.9)

### Spiel öffnen und Code teilen
```
Mobile game window in landscape, dark leather and gold East Asian fantasy style, titled "Zusammen spielen": a big golden five-letter room code "K7QXM" in the center, below it a small share link, two buttons "Link teilen" and "Link kopieren", a player list "Kaito (du, Host)" and "Mira · Lv 38 · Schamane", and a green pill badge "Online 2/4" on the minimap frame. Clean readable UI.
```

### Zwei Freunde in derselben Welt
```
2D fantasy MMORPG scene, three-quarter top-down view in an orc valley: a chibi warrior with a glowing sword and a chibi shaman with a fan fighting a group of green orcs together, the warrior's name in blue and the friend's name "Lv 38 Mira" in green with a small green health bar under it, a white speech bubble "Ich heile dich!" above the shaman, purple "+63 EP +71 Gold" floating for both, on the minimap a white dot and a green dot side by side. Cute game art, bold outlines, cel shading.
```

### Chat
```
Mobile game HUD close-up in landscape: a chat input bar at the top center with a text field "Nachricht an alle …" and a gold "Senden" button; at the bottom left a few chat lines on dark green translucent pills, names in light green ("Mira: Lass uns den Stein zerstören!", "Kaito: Bin unterwegs!"); a round speech bubble button in the top menu next to a glowing green two-people button. Clean dark fantasy UI.
```

### Beitreten über einen Link
```
Smartphone in landscape showing a messenger chat with a link "Spiel mit mir Seelenstein! Code: K7QXM" and a preview card of the game; next to it the same phone after tapping: the game opens, a banner "Zusammen spielen · Welt von Kaito" appears over a cozy East Asian village. Clean illustration, soft colors.
```

## Server ERFOO mit zwei Kanälen (Version 3.0)

### Server-Auswahl
```
Mobile game server selection window in landscape, dark lacquered wood and brass East Asian fantasy style, titled "Server wählen": a server card "ERFOO · Testserver" with two channel rows, "Kanal 1 · 5/8 Spieler" with a glowing yellow dot and "Kanal 2 · leer" with a grey dot, each with a golden "Betreten" button; the current channel highlighted in soft green with "du bist hier"; below a list "Im Kanal" with player names and levels and buttons "Freunde einladen" and "Allein spielen". Clean, readable game UI.
```

### Kanal-Anzeige im Spiel
```
Mobile game HUD close-up: the round minimap in the top right corner with the zone name, gold and splinters, and under it a small green pill badge "ERFOO K1 · 3/8"; on the minimap three green dots for other players around a white dot. Clean dark fantasy UI.
```

### Übergabe des Kanals
```
2D fantasy illustration for a loading moment: a glowing golden channel crystal labelled "Kanal 1" passing from one chibi hero who waves goodbye and fades out to another chibi hero who catches it, small text "Der Kanal wird übernommen …", the village and monsters in the background keep moving. Cute game art, bold outlines, soft glow.
```

## Schmied mit Figur, Vergleich, Tränke S–XXL, Map 2 und 3, Dungeon-Steine (Version 3.1)

### Schmied mit Figur und Tasche
```
Mobile game blacksmith window in landscape, dark leather and gold East Asian fantasy style: on the left a framed chibi warrior doll wearing his equipment with six equipment slots around it labelled Waffe, Rüstung, Helm, Schild, Schuhe, Gürtel; in the middle the bag grid with items, each with a small green up-arrow or red down-arrow in the corner; on the right a glowing anvil with the selected sword, a label "in der Tasche", the upgrade "+0 → +1", a success chance bar and the cost in gold and soul splinters. Clean readable UI.
```

### Vergleich mit der angelegten Ausrüstung
```
Mobile game item detail card, dark fantasy style: a two-handed fire sword icon, its name and level, and below it a row of comparison chips against the currently equipped gear: green chips "▲ +30 Angriff" and red chips "▼ −19 Verteidigung", "▼ −17 % Angriffstempo", "▼ −14 % Blocken"; above the card a bag grid where better items have a bright green triangle and worse items a red triangle in the lower left corner. Clean game UI, clear color coding.
```

### Tränke in fünf Größen
```
Game item icon sheet for a 2D fantasy MMORPG: two rows of potions, top row red "Drachenblut" round-bellied flasks with wax seals, bottom row blue "Mondtau" crystal bottles with crescent stoppers, each row growing in five sizes from small to huge, every bottle with a small cream badge "S", "M", "L", "XL" and a golden badge "XXL"; the biggest bottles glow stronger. Bold dark outline, cel shading, plain dark background.
```

### Das Weltentor in Hayan
```
2D fantasy MMORPG scene, three-quarter top-down view: in an East Asian village square a large stone ring portal with golden studs and a swirling blue light inside stands next to a travel guide woman; a travel window shows "Map 1 · Hayan", "Map 2 · Schlangental (ab Stufe 30)" and "Map 3 · Donnerklamm (ab Stufe 50)" with "Reisen" buttons. Cute game art, bold outlines, soft blue glow.
```

### Map 2: Schlangental
```
2D fantasy MMORPG environment, three-quarter top-down view: a hot sandy desert with dunes, sandstone rocks, dead trees and a small oasis lake; sand vipers, rattlesnakes with rattles and king cobras with spread golden hoods slither in groups; in the distance the edge of a lush green jungle swamp where a giant green python, naga warriors with golden crowns and tridents and purple naga priestesses with glowing staves lurk. In the middle a safe oasis camp with flagstones, lanterns and a portal ring. Cute game art, bold outlines, warm light.
```

### Map 3: Donnerklamm
```
2D fantasy MMORPG environment, three-quarter top-down view: a deep grey-brown rocky canyon full of boulders with green troll warriors with red mohawks and tusks, purple feathered harpies and brown minotaurs with huge horns and a gold nose ring; further out a black basalt ridge with lava cracks where giant stone titans with glowing orange cracks, grey winged gargoyles and blue-skinned thunder giants with white beards roam. A safe camp in the middle with lanterns, braziers and a portal ring. Cute but dangerous game art, bold outlines.
```

### Seelensteine in den Dungeons
```
2D fantasy MMORPG dungeon room, three-quarter top-down view: a dark cave room with raised rock walls and violet braziers, a glowing soul stone obelisk in the middle with its name and level above it, cave spiders swarming out of it as reinforcements, a chibi warrior attacking it; small text "kommt nach 30 Sekunden wieder". Cute game art, bold outlines, moody glow.
```

## Schild nur Krieger, Beidhändig, Ultimative Attacken, Schultern und Umhang, Grafik (Version 3.2)

### Schild nur für den Krieger
```
2D fantasy MMORPG character lineup, three-quarter view, cute chibi style with bold dark outlines: a red-armored warrior holding a one-handed sword and a heater shield with a golden gem, next to him a ninja with twin daggers, a shaman with a silk fan and a necromancer with a bone staff, none of the three carrying a shield. Above the warrior a small shield icon labelled "nur Krieger". Plain warm background, cel shading.
```

### Zweihänder nur für den Weg des Leibes
```
2D fantasy MMORPG character art, cute chibi style: a broad-shouldered warrior in heavy stone-grey plate ("Weg des Leibes") holding a huge two-handed greatsword over his shoulder, no shield, dust at his feet; beside him a small UI badge "Zweihänder · nur Weg des Leibes · viel Schaden, langsam". Bold outlines, cel shading, warm light from the top left.
```

### Beidhändig: zwei Schwerter ab Stufe 30
```
2D fantasy MMORPG character art, cute chibi style: an agile warrior in crimson armor ("Weg der Klinge") wielding two glowing one-handed swords, one in each hand, mid-swing with crossed light trails; a weapon merchant behind a stall offers a scroll labelled "Beidhändigkeit · ab Stufe 30 · 20.000 Gold". Inventory slot below labelled "Nebenhand" with a sword icon. Bold outlines, dynamic pose, warm light.
```

### Ultimative Attacke: Klingenhimmel (Krieger, Weg der Klinge)
```
2D fantasy MMORPG skill effect, three-quarter top-down view: ten giant ghostly white-gold swords fall from the sky and stab into the ground in a wide circle around a chibi warrior, a golden rune circle glows on the ground, monsters are hurled back, the swords then burst in a white shockwave. Big golden title "Klingenhimmel – Ultimative Attacke". Cute game art, bold outlines, strong glow.
```

### Ultimative Attacke: Titanenzorn (Krieger, Weg des Leibes)
```
2D fantasy MMORPG skill effect, three-quarter top-down view: a chibi warrior leaps into the air and slams down with both fists, the ground cracks in glowing orange lines in all directions, rocks and dust fly, a huge shock ring knocks monsters away and stuns them with yellow stars; afterwards a stone-like aura "Titanenhaut" surrounds him. Cute game art, bold outlines, heavy screen shake feeling.
```

### Ultimative Attacke: Schattentanz (Ninja, Weg des Dolches)
```
2D fantasy MMORPG skill effect: a chibi ninja blinks from enemy to enemy in a chain of purple afterimages, crossing violet slashes appear on eight monsters at once, a dark smoke puff marks the starting point where he reappears. Title "Schattentanz". Cute game art, bold outlines, purple and white light.
```

### Ultimative Attacke: Todesmal (Ninja, Weg des Schattens)
```
2D fantasy MMORPG skill effect: a glowing blood-red X mark hovers over a large monster, the chibi ninja appears behind it out of black smoke and strikes with one long crimson slash, a red light pillar rises from the target, critical damage number. Title "Todesmal". Cute but menacing game art, bold outlines.
```

### Ultimative Attacke: Drachensturm (Schamane, Weg des Drachen)
```
2D fantasy MMORPG skill effect, top-down three-quarter view: nine burning meteors with long fiery tails crash into a golden rune circle where monsters stand, scorch marks and embers everywhere, a final dragon roar shockwave. A chibi shaman with a silk fan points at the sky. Title "Drachensturm". Cute game art, bold outlines, orange and gold light.
```

### Ultimative Attacke: Himmelssegen (Schamane, Weg der Heilung)
```
2D fantasy MMORPG skill effect: a warm golden light beam falls on a chibi shaman and heals her, a golden rune circle under her feet, at the same time slim pillars of holy light strike down on up to eight monsters around her and stun them; green heal number "+60 %". Title "Himmelssegen". Cute game art, bold outlines, soft golden glow.
```

### Ultimative Attacke: Seelenernte (Nekromant, Weg der Seelen)
```
2D fantasy MMORPG skill effect: a swirling green-white soul vortex spins around a hooded chibi necromancer and pulls all monsters toward the center, green soul beams flow from the monsters back to him and heal him, final bright green burst. Title "Seelenernte". Cute but eerie game art, bold outlines.
```

### Ultimative Attacke: Knochenkerker (Nekromant, Weg der Knochen)
```
2D fantasy MMORPG skill effect: three expanding rings of sharp pale bone spikes break out of the ground around a chibi necromancer, monsters are caught between the spikes and held in place, a dark red rune circle on the ground, green life-steal numbers rise. Title "Knochenkerker". Cute but dark game art, bold outlines.
```

### Knopf der Ultimativen Attacke
```
Mobile game HUD close-up in landscape, dark fantasy East Asian style: the round red attack button with crossed swords at the bottom right, around it five round skill buttons with brass rings, and right above the attack button a slightly larger skill button with a thick pulsing golden ring and the icon of falling swords; on another version the same button greyed with a clock overlay "2:45". Clean readable UI.
```

### Schultern und Umhang als neue Ausrüstung
```
Game item icon sheet for a 2D fantasy MMORPG: top row eight pairs of shoulder pauldrons from simple leather to bronze, iron, red dragon plates with spikes, violet soul plates with a gem, black ash plates, white-feathered sky pauldrons and golden god pauldrons; bottom row eight capes from a plain wool cape to a red dragon cape with an emblem, a violet soul cape, a blue sky cape and a golden god cape with a white gem. Bold dark outline, cel shading, plain dark background.
```

### Jedes Ausrüstungsteil an der Figur sichtbar
```
2D fantasy MMORPG character turnaround, cute chibi style, front, side and back view of the same warrior: tall iron boots with cuffs and toe caps, a leather belt with a big buckle and a pouch, spiked dragon shoulder pauldrons, a red cape with a golden hem and an emblem on the back that flutters behind him while walking, helmet with plume, chest armor, sword and shield. Bold outlines, cel shading, light from the top left, soft cast shadow to the lower right.
```

### Bessere Grafik: Schatten, Licht und Bewegung
```
2D fantasy MMORPG gameplay screenshot, three-quarter top-down view, East Asian village and forest: every character and monster casts a soft slanted shadow toward the lower right, characters are lit from the top left with a thin bright rim on their edges, an idle warrior gently breathes, a walking ninja leans forward and his cape flutters. Cute game art, bold outlines, warm afternoon light.
```

## Figur-Animationen, neues HUD, mehr Dungeons, Freunde und Gilden (Version 3.3)

### Kraftpose beim Buffen
```
2D fantasy MMORPG character animation sheet, cute chibi style with bold outlines: a warrior casting a buff in four frames – standing, throwing both arms up with the sword pointing to the sky, a small hop with golden light rings rising around the body and light streaks shooting upward, landing with dust puffs. Same for a ninja, a shaman with a fan and a necromancer with a staff, each in their class color. Plain background, cel shading.
```

### Treffer-Reaktion und Laufstaub
```
2D fantasy MMORPG character animation frames, chibi style: a warrior flinching backwards with a brief red flash on the whole body when hit by a monster claw; next to it the same warrior running with small dust puffs kicked up behind his boots and his cape fluttering. Bold outlines, light from the top left.
```

### Chat unten links und Beutel
```
Mobile game HUD close-up in landscape, dark leather fantasy style: bottom-left corner a small semi-transparent chat box with three lines ("Mira: Wer kommt mit in den Dungeon?", grey italic "Jin spielt jetzt mit.", "Kaito: Ich komme!") and a round green speech-bubble button in its corner; above it a round brass button with a loot bag icon and a red counter badge. Clean readable UI, the game world visible behind.
```

### Gold im Inventar
```
Mobile game inventory window header, dark leather and gold fantasy style: the title "Inventar" on the left and on the right a rounded pill with a stack of shiny gold coins, a big golden number "123.456" and the word "Gold", a light sheen sweeping across it. Clean UI, warm glow.
```

### Uhrzeit, Ping und Akku unter der Karte
```
Mobile game minimap corner, fantasy style: a round minimap with the zone name "Dorf Hayan" below it, then a tiny status line with a battery icon "85 %", a clock "14:32" and green signal bars "42 ms". Small, crisp, readable on a phone.
```

### Neue Dungeons
```
2D fantasy MMORPG dungeon concept sheet, three-quarter top-down view, four panels: "Banditenkeller" – a wooden cellar with barrels and the bandit lord Raku with a red plume and golden pauldrons; "Totengruft" – a purple-lit crypt with skeleton guards and the crowned skull king Morvan with a skull staff; "Schlangentempel" – a jade temple with golden trims and the giant naga queen Sseth with a trident staff; "Titanenschmiede" – a basalt forge with lava pools and the colossal stone titan king Kroth with glowing orange cracks and a crown of fire. Cute game art, bold outlines.
```

### Dungeon-Riss
```
2D fantasy MMORPG scene, three-quarter top-down view: in the middle of a sandy valley with orcs a tall flickering vertical rift opens in the air, a dark swirling vortex with a bright orange rim and sparks spiraling out, a golden banner text "Ein Dungeon-Riss öffnet sich!" and a pulsing dot on the minimap. Cute game art, bold outlines, magical glow.
```

### Freunde und Gilde
```
Mobile game social window in landscape, dark leather and gold fantasy style: tabs "Freunde" and "Gilde"; a highlighted request row "Mira möchte dein Freund sein" with "Annehmen" and "Ablehnen" buttons; the guild tab shows a green shield emblem with the letter D, the guild name "Drachenherz", "Anführer: Kaito · 2 Mitglieder", a member list with green online dots and a gold "Anführer" label, and a "Gilde gründen für 5.000 Gold" card with a name field. Clean readable UI.
```

### Gildenname über den Köpfen
```
2D fantasy MMORPG village scene, cute chibi characters: two players standing together, above their names "Lv 42 Kaito" and "Lv 35 Mira" a small colored guild tag "‹Drachenherz›" in the same green, a third player without a guild nearby. Bold outlines, warm light.
```

## Schlankes HUD, EP, Statuspunkte, Duell, Handel und Betrachten (Version 3.4)

### Schlanke Lebensanzeige ohne Fenster
```
Mobile game HUD close-up, top-left corner in landscape, fantasy style: a small round character portrait with a golden ring and a level badge "22", next to it the name "Kaito" with a soft shadow and two slim slanted bars (red health with a heart icon, blue mana with a drop icon) floating directly over the game world without any dark panel behind them; a glowing golden plus button on the portrait for free stat points. Clean, airy UI.
```

### Menüknöpfe als Münzen
```
Mobile game top menu row, dark East Asian fantasy style: six round buttons like lacquered coins with a thin brass ring and golden two-tone icons – a helmeted bust, a bag with a clasp, a globe, a shield with a heart, a speech bubble and a scroll with a question mark; the globe glows green for "online", a small red dot marks free points. Crisp, consistent icon set.
```

### EP-Leiste und EP-Zahlen
```
2D fantasy MMORPG screenshot detail: at the bottom edge a long experience bar with a brass frame, ten thin golden tick marks, a glossy violet filling with a moving sheen and a small text "1.104 / 75.382 EP (1,5 %)"; above the character a big glowing violet number "+1.104 EP" pops up while small violet sparks fly from a defeated orc to the hero, a small golden "+67 Gold" next to the orc. Cute game art, bold outlines.
```

### Statuspunkte verteilen
```
Mobile game character window, dark fantasy style: on the left a glowing violet orb with the number "11" and "Statuspunkte", on the right four colored cards – red "Stärke" with a sword icon, green "Vitalität" with a heart, blue "Intelligenz" with a crystal, gold "Geschick" with a feather – each with a big number, a thin progress bar, a line like "+12 Angriff" and a large golden "+" button plus small "+5" and "Alle" buttons. Clean, juicy UI.
```

### Spielerkarte beim Antippen
```
Mobile game UI in landscape over a village scene: after tapping another player a compact card appears at the top with his round portrait, name "Kaito", "Lv 40 · Krieger", a green health line and five icon buttons "Duell" (red with crossed swords), "Freund" (heart), "Gilde" (shield), "Handeln" (two arrows) and "Betrachten" (magnifier). Below it on the other player's screen a golden toast "Mira möchte mit dir handeln" with "Annehmen" and "Ablehnen". Clean readable UI.
```

### Duell
```
2D fantasy MMORPG scene, three-quarter top-down view: two chibi players face each other in the village square inside a large dashed red circle on the ground, golden crossed swords hover over the opponent's head, a big golden text "Kampf!" in the middle, damage numbers fly; afterwards a banner "Sieg!" for the winner while the loser kneels with a sliver of health. Cute game art, bold outlines.
```

### Handel
```
Mobile game trade window, dark leather and gold fantasy style: two panels side by side, "Dein Angebot" with item slots and a gold field "1500", and "Kaito" with a glowing +4 dagger in the first slot; both panels get a green border and "✓ bestätigt" when confirmed; below the bag grid to pick items and buttons "Handel bestätigen" and "Abbrechen". Clean readable UI.
```

### Betrachten
```
Mobile game inspect window, dark fantasy style: a framed chibi warrior doll wearing purple soul armor, helmet, shoulders and a cape, eight equipment slots around it with +5 badges, small green and red arrows comparing them to your own gear, and on the right the detail card of his sword with stats and bonuses. Clean readable UI.
```

## Vlotho, Ping, neue Symbole und Aussehen (Version 3.5)

### Die Stadt Vlotho
```
2D fantasy MMORPG town square, three-quarter top-down view, cozy East Asian inspired style: a walled town with stone gates, curved roofs, lanterns, market stalls, a well and a portal ring; a wooden sign and a golden banner text "Vlotho" floating over the square, chibi heroes and merchants walking around. Cute game art, bold outlines, warm afternoon light.
```

### Ping unter der Karte
```
Mobile game minimap corner, fantasy style: a round minimap with the town name "Vlotho", below it a tiny status line with a battery, the time "14:32" and green signal bars with "68 ms"; a second variant shows grey bars and "offline". Small, crisp, readable on a phone.
```

### Rucksack und Beutesack
```
Game UI icon pair, dark fantasy style with golden line art on round lacquered coin buttons: left a leather backpack with a flap, a front pocket and a buckle (inventory), right a brown loot sack tied with a cord with shiny gold coins spilling out (loot). Bold readable shapes, warm gold accents.
```

### Aussehen bei der Charaktererstellung
```
Mobile game character creation screen in landscape, dark leather and gold fantasy style: four class cards (warrior, ninja, shaman, necromancer), below an "Aussehen" section with a framed rotating chibi preview and rows "Frisur ‹ Lang ›", hair color swatches, skin tone swatches, "Augen ‹ Rund ›", eye color swatches, "Gesicht ‹ Kriegsbemalung ›" and a dice button "Zufällig"; on the right the class description and skills; a big golden button "Abenteuer beginnen". Clean, inviting UI.
```

### Frisuren und Gesichter
```
2D fantasy MMORPG character sheet, cute chibi style with bold outlines: the same young hero shown six times with different hairstyles – short with a tuft, top bun, long flowing hair, spiky, ponytail with a red tie, bald with a shine – in different hair colors (black, brown, blond, platinum, red, blue, silver) and skin tones, with round, narrow, happy closed or determined eyes, freckles, a scar or red war paint. Front, side and back view. Plain background, cel shading.
```

## Schmied: Schmiede-Szene und Klänge (Version 3.6)

### Hammerschlag
```
2D fantasy game forge close-up, dark background with warm orange glow: a glowing magic sword lies on a heavy iron anvil, a big steel hammer with a wooden handle strikes it, bright yellow sparks fly in all directions, the blade glows hotter with each strike. Cute game art, bold outlines, dramatic lighting.
```

### Erfolg
```
2D fantasy game upgrade success screen: a sword rises above an anvil, surrounded by rotating golden light rays, glowing in a bright color, a huge glowing number "+7" pops up below with the text "Seelenreißer ist jetzt +7", golden sparks raining down. Cute game art, bold outlines, triumphant mood.
```

### Fehlschlag und Schutz
```
2D fantasy game upgrade fail screen, two variants side by side: left a greyed-out sword on an anvil with a puff of grey smoke and the text "Fehlgeschlagen"; right the same sword wrapped in a soft blue shield of light with the text "Geschützt" and a glowing blessing scroll. Cute game art, bold outlines.
```

### Zerbrochen
```
2D fantasy game upgrade break screen: a red flash over the forge, a sword cracks along a jagged line and its two halves fly apart, red-hot shards scatter, a big red text "Zerbrochen!" with "Seelenreißer +9 ist zersprungen" below. Cute game art, bold outlines, dramatic.
```

## Einstellungen und detailliertere Figur (Version 3.7)

### Zahnrad und Einstellungen
```
Mobile game settings window in landscape, dark leather and gold fantasy style: a golden gear button in the top menu row, the open "Einstellungen" window with sections "Ton" (a green toggle switch "Klänge" and a golden volume slider "70 %"), "Grafik" (segmented buttons "Hoch / Mittel / Niedrig" and "Nah / Normal / Weit", toggles for screen shake, damage numbers and villager names), "Steuerung" (vibration toggle) and buttons "Aussehen ändern", "Server und Kanal", "Hilfe", "Zum Startbildschirm". Clean readable UI.
```

### Detailliertere Figur
```
2D fantasy MMORPG character close-up, cute chibi style with bold dark outlines and soft cel shading: a young warrior with big expressive anime eyes (white, blue iris, dark pupil, two highlights, dark upper lid line), small ears, a tiny nose, a neck shadow under the chin, a red armored tunic with a center seam, a skirt with slits and brass rivets on the belt, gloves with thumbs, trousers with knee folds and boots with dark soles and crossed laces. Front, side and back view, light from the top left.
```

### Kleidungsdetails je Klasse
```
2D fantasy MMORPG character lineup, cute chibi style: a ninja with split-toe tabi boots and crossed straps, a shaman in a teal robe with embroidered golden zigzag hem and soft cloth folds, a hooded necromancer with a faintly glowing green rune on the chest and stitched patches on the robe, each with detailed eyes and hands. Bold outlines, cel shading.
```

## Als App und Angriffe der Mitspieler (Version 3.8)

### Als App installieren
```
Mobile phone mockup in landscape: the Seelenstein start screen with a button "📲 Als App installieren" and a small help card showing the Safari share icon and "Zum Home-Bildschirm"; next to it the home screen of an iPhone with a new app icon "Seelenstein" (a glowing soul stone on a dark background). Clean, friendly style.
```

### Mitspieler kämpfen gemeinsam
```
2D fantasy MMORPG screenshot, three-quarter top-down view in a dark pine forest: two chibi players fight bandits side by side, the warrior spins with a glowing giant sword whirl while the ninja throws a green poison dart; damage numbers of both players float above the bandits, the other player's numbers in pale blue-white. Cute game art, bold outlines.
```

## Monsterstufen und aufgeräumte Anzeige oben (Version 3.9)

### Stufe und Name über jedem Monster
```
2D fantasy MMORPG screenshot, three-quarter top-down view on a grey wasteland: a pack of monsters (stone ogre, demon, hellhound, ice wolf, yeti) each with a small label above the head "Lv 32 Steinoger", "Lv 41 Eiswolf", "Lv 45 Yeti"; the level part colored by danger (grey = much weaker, white = fair, yellow = stronger, red = dangerous) and the name in soft cream, thin dark outline; a slanted red health bar under the label of a wounded monster. Cute chibi game art, bold outlines.
```

### Ziel und Bossbalken unter der Knopfleiste
```
Mobile game HUD in landscape, dark leather and gold fantasy style: top left the character box with portrait, level badge and slim red and blue bars; top right a row of round golden menu icons and the minimap; directly below the icon row in the center a wide fiery boss health bar "Lv 25 Spinnenkönigin 31.225 / 31.225", and below it a small target window "Lv 35 Dämon" with its own red bar. Nothing overlaps, clean spacing.
```

## Seelenstein in 3D – Gesamt-Prompt und Stilvorgabe (Version 4.0)

Dieser Prompt ist die Bauanleitung für die 3D-Grafik. Er beschreibt Stil, Formen, Licht, Farben und jede Gruppe von Objekten so genau, dass Bilder, 3D-Modelle (z. B. aus einem KI-Modellgenerator) und das Spiel selbst gleich aussehen. Die Teil-Prompts darunter lassen sich einzeln verwenden.

### Gesamt-Prompt
```
Stylized 3D fantasy MMORPG in the spirit of classic East-Asian online RPGs (Metin2-like world, Korean village architecture), rendered as a cozy, readable, hand-crafted toy world. Camera: three-quarter top-down view, about 55° from the ground, looking north, slightly zoomed so a character fills about one seventh of the screen height; landscape 16:9 phone screen.

SHAPES – everything has soft, smooth, rounded edges: no sharp polygon corners, every box is bevelled with a visible rounded edge (bevel about 15–25 % of the thickness), spheres and cylinders are smooth and high-segment, roofs are curved with upturned eaves, rocks are rounded pebble-like blobs, trees have soft round or layered conical crowns. Mid-poly look with smooth shading, never faceted. Silhouettes are clean and readable from far away.

CHARACTERS – chibi proportions: head about 40 % of the body height, big friendly anime eyes (dark pupil, colored iris, two white highlights, thin upper lid line), small nose, rosy cheeks, short limbs with rounded hands and boots. Every outfit piece is a separate soft shape: tunic, belt with buckle, shoulder pads, cape, boots, helmet. Equipment tier is visible through color and trim: leather brown, bronze, iron grey-blue, dragon red with gold, soul purple with glowing runes, ash black with ember-orange cracks, sky white-blue with glowing feathers, god gold with white light.

OUTLINE AND SHADING – thin dark-brown outline (#1a1210) around every object, like a cel-shaded cartoon; soft three- to four-step toon shading with a smooth falloff instead of hard bands; a warm rim light from the sun side; ambient occlusion under arms, roofs and tree crowns; soft round contact shadows plus real cast shadows from a warm afternoon sun in the south-east.

LIGHT AND COLOR – warm, saturated but not neon. Sky light pale blue from above, bounce light from the ground. Each region has its own mood: Sonnenwiesen sunny green with flowers and pollen, Dunkelwald deep green with fireflies and blue fog, Orktal dusty ochre, Ödland grey-brown ash, Frostgipfel white-blue snow with sparkling ice, Totenmoor murky green with will-o'-wisps, Feuerberg black basalt with glowing lava rivers and embers, Schlangental golden sand with oases, Donnerklamm grey canyon with storm-blue light. Dungeons are dark caves lit by colored braziers.

MATERIALS – plaster walls cream, dark timber posts, glazed roof tiles in red, teal, plum and moss green, polished metal with a soft highlight, cloth with soft folds, water translucent blue-green with gentle waves and a bright shoreline foam, lava glowing orange with dark crust, ice glossy pale blue.

MOOD – friendly, adventurous, clean. No horror gore, no realism, no photo textures, no noisy details. Everything looks like a beautifully painted miniature diorama that is fun to explore on a phone.
```

### Figuren der vier Klassen
```
Character sheet, stylized 3D chibi fantasy heroes, smooth rounded shapes, thin dark outline, soft toon shading, front / side / back view, T-pose and idle pose:
1) Krieger – sturdy young warrior, leather-and-plate tunic with rounded shoulder pads, red crest helmet, round shield on the back arm, one-handed sword or (path "Weg des Leibes") a broad two-handed greatsword; cape flowing behind.
2) Ninja – slim agile fighter, dark wrapped outfit with a long scarf, hood, split-toe boots with crossed straps, twin daggers or a recurve bow, quiver on the back.
3) Schamane – calm healer in a flowing teal robe with golden zigzag hem, headband with a feather, a folding fan or a ritual bell, glowing turquoise orbs around the hands.
4) Nekromant – mysterious mage in a hooded dark robe with stitched patches, pale skin, a glowing green rune on the chest, a skull staff with a glowing orb or a large scythe, small green soul sparks rising.
Customizable: hairstyle (short, bun, long, spiky, ponytail, bald), hair color, skin tone, eye shape and color, face marks (freckles, scar, war paint).
```

### Ausrüstung in acht Stufen
```
Equipment progression sheet for one stylized 3D chibi warrior, 8 columns from weakest to strongest, same pose: Leder (worn brown leather), Bronze (warm bronze with copper rivets), Eisen (cool iron with blue cloth), Drache (crimson scales, gold trim, small horns on the helmet), Seele (deep purple with softly glowing violet runes), Asche (charcoal black plates with ember-orange cracks), Himmel (white-blue enamel with glowing feather ornaments), Götter (radiant gold with white light and a halo of sparkles). Matching sword, shoulder pads, belt, boots and cape in each column. Weapons from +4 glow in green, +7 blue, +10 purple, +15 gold, +20 white. Smooth bevelled shapes, thin dark outline, soft toon shading.
```

### Monsterfamilien
```
Monster lineup, stylized 3D chibi fantasy creatures, rounded friendly-but-dangerous shapes, thin dark outline, soft toon shading, each with expressive glowing eyes, on a neutral grey background with a level tag above each head:
Beasts on four legs – wild dog, grey wolf, black alpha wolf with red eyes and a scar, bristly boar with tusks, brown bear, hellhound with a burning mane, frost wolf with icy fur, red fire drake with horns and a spiked ridge.
Humanoids – bandit with a red scarf mask and a short sword, bandit archer in green, green orc warrior with tusks and a spiked pauldron and an axe, orc shaman with feathers and a skull staff, orc captain with golden armor and a red cape, undead warrior with bone-white skin, swamp witch, harpy with purple wings, demon with horns, bat wings and a tail, gargoyle of grey stone.
Brutes – stone ogre with a single horn and a club, white furry yeti, ghoul, lava golem with glowing cracks, troll warrior, minotaur with big horns, stone titan, thunder giant with blue lightning cracks, ice golem.
Others – forest spider, cave spider, poison spider, giant spider queen with a golden mark; desert scorpion; ghost-like frost spirit with a crown; sand viper, rattlesnake, king cobra with a hood, giant python; naga warrior and naga priestess with a snake body and armored human torso.
Bosses are two to three times larger, with a pulsing colored aura on the ground.
```

### Welt und Gebiete
```
Stylized 3D fantasy landscape diorama, three-quarter top-down view, smooth rounded shapes, soft toon shading, warm sunlight with long soft shadows:
the walled village Vlotho in the center – square palisade/stone wall with four corner towers, two gate arches with red roofs, a cobblestone plaza with a well, market stalls with striped awnings, paper lanterns, cream plaster houses with dark timber posts and curved glazed-tile roofs with upturned corners, barrels, crates, training targets, herb garden, a stable with a horse and hay bales.
Around it the regions: flower meadows with cherry blossom trees, a dark pine forest, an ochre orc valley with rocks, a grey ash wasteland with dead trees, snowy frost peaks with frozen lakes, a misty swamp with bog pools, a volcano with glowing lava rivers. Four dirt roads lead from the village gates to the edges; small wooden bridges cross rivers. Ground types blend softly into each other, no visible tile grid. Water has gentle animated waves and light foam at the shore.
```

### Dungeons
```
Stylized 3D dungeon interior, top-down three-quarter view: rough rounded cave walls with soft bevels, flagstone or rock floor, five rooms connected by wide corridors, colored fire braziers (blue, green, violet, orange) casting warm pools of light, glowing portal ring at the entrance, a large boss arena with cracks in the floor. Soft toon shading, thin outlines, dark mood but readable.
```

### Seelensteine, Portale und Effekte
```
Stylized 3D magical props: soul stones as tall rounded obelisks, spires, twin pillars, boulders and crystal clusters made of dark stone with glowing carved runes (blue, red, gold, green, violet, orange), floating sparks around them; a world gate as a stone ring with a swirling blue portal; dungeon entrances as rock arches with a glowing colored veil; random rifts as cracks in the air with purple light.
Combat effects: bright slash arcs following the weapon, spinning sword whirl rings, shockwaves on the ground, arrows with light trails, fan wind gusts, green poison clouds, purple curses, lightning chains, healing light pillars, level-up golden column of light. Soft glow, additive light, never covering the characters completely.
```

## Qualitäts-Überarbeitung der Figuren und Monster (Version 4.1)

Ausführliche Vorgabe für die zweite Stufe der 3D-Grafik. Sie beschreibt Figuren, Gesichter, Haare, Kleidung, Ausrüstung je Stufe, Waffen und jede Monsterfamilie bis ins Detail, dazu Licht und Material. Alle Teile bleiben weich gerundet und im Chibi-Stil; mehr Details heißt mehr klar lesbare Formen, nicht mehr Rauschen.

### Gesamt-Prompt Figuren und Monster
```
High-quality stylized 3D chibi characters for a cozy East-Asian fantasy MMORPG, game-ready, seen from a three-quarter top-down camera (about 50° from the ground). Proportions: head about 38 % of the total height, slightly wider than tall, big expressive anime eyes, small nose and mouth, short neck, compact torso with a defined chest and narrower waist, rounded shoulders, short arms with soft mitten hands and a visible thumb, short legs with knees and chunky boots with a darker sole and a turned-down cuff.

FACE: eyes with white sclera, a large colored iris with a darker outer ring and lighter lower half, a dark pupil, two white catch-lights (big upper, small lower), a thick dark upper lash line that curves down at the outer corner, thin eyebrows that show the mood (calm, cheerful, determined, angry), rosy cheek blush, a tiny smiling mouth line. Face marks: freckles, a scar across the cheek, red war paint stripes.

HAIR: never a smooth helmet. Hair is built from many soft tapered locks: a fringe of five to seven locks over the forehead, side locks framing the cheeks, fuller locks at the back, plus a glossy lighter highlight lying flat on the crown of the head. Styles: short, bun, long flowing, spiky, ponytail, bald. Hair color natural or fantasy, always with a lighter highlight.

CLOTHING: layered and readable – collar, sleeves with cuffs, a tunic with front and back cloth flaps that swing while walking, belt with buckle and pouch, trousers with knee pads, boots with straps. Fabric has soft folds, metal has a small bright highlight, leather is matte.

CLASSES: Krieger in lamellar plate armor (rows of overlapping plates), layered round pauldrons with metal rims, a kabuto-style helmet with brim, cheek guards and a crest plume, sword and round shield or a broad greatsword. Ninja in a dark wrapped outfit, hood with long tails, face mask, a long scarf with two trailing ends, wrapped forearms, shin guards, twin daggers or a recurve bow and quiver. Schamane in a flowing robe with a layered collar, very wide sleeves with golden cuffs, a sash with hanging paper talismans, bead necklace, headband with feathers, folding fan or ritual bell with ribbons. Nekromant in a hooded robe with a tattered zigzag hem, bone pauldrons shaped like small skulls, a skull at the belt, a glowing rune on the chest, a skull staff with a glowing orb or a large curved scythe.

EQUIPMENT TIERS (color and ornament, same shapes): Leder brown and stitched, Bronze warm with copper rivets, Eisen cool grey-blue with blue cloth, Drache crimson scales with gold trim and small horns, Seele deep purple with violet glowing runes, Asche charcoal plates with ember-orange glowing cracks, Himmel white-blue enamel with glowing feather ornaments, Götter radiant gold with white light. Weapons: blades with a darker fuller groove and a light bevelled edge, ornate guards, wrapped grips, glowing pommel gems from tier Seele, glow aura from +4 (green, blue, purple, gold, red, white).

MONSTERS (same chibi charm, but dangerous): 
Wolves and dogs with a deep chest and slim hips, a tapered muzzle with a black nose, pointed ears with a light inner side, fur tufts on cheeks, chest and tail, slanted angry eyes with a bright iris, visible fangs. Bears bulky with round ears and a short muzzle. Boars with a flat snout disc, tusks and a bristly back ridge. Dragons with a long neck, horned head and jaw, membrane wings with finger bones, a spiked tail and striped belly scales.
Spiders with a big patterned abdomen, a small head with a cluster of glowing eyes, fangs and long jointed legs with knees above the body. Scorpions with segmented armor plates, two pincers and a curled segmented tail with a glowing stinger.
Snakes as one smooth continuous body with alternating band pattern, a shaped head with jaw, slit eyes and a forked tongue; cobras with a wide hood; nagas with an armored humanoid torso, crown and trident or staff.
Humanoid monsters: bandits with hood and red cloth mask, orcs with green skin, heavy brow, underbite tusks and pointed ears, spiked pauldrons and axes, undead with bone-white skin and glowing eyes, witches with a pointed hat, demons and gargoyles with horns, bat wings and tails, brutes (ogre, yeti, troll, ghoul) with huge hands and a round belly, golems built from rock chunks with glowing lava or ice cracks, ghosts as floating hooded spirits with a tattered glowing hem.
Bosses are larger with more ornament (crowns, golden armor) and a pulsing aura ring on the ground.

RENDERING: thin dark-brown outline, soft three-band toon shading with cool blue-violet shadow tint instead of grey, a warm rim light on the sun side and a cool rim on the edges, small toon specular highlights on metal and eyes, gentle ambient occlusion under heads, arms, hems and in the hair, soft contact shadow under every character. Clean, cute, premium mobile-game quality.
```

### Charakterbogen (Vorlage zum Nachbauen)
```
Turnaround sheet of one stylized 3D chibi hero (Krieger, tier Drache): front, three-quarter, side and back view plus a close-up of the face and hair. Show the lamellar plate rows, the layered pauldrons with gold rims, the kabuto helmet with crest and small horns, the cape with lining and gold trim at the hem, belt pouch, boots with cuff and darker sole, and the sword with fuller, curved guard and glowing pommel. Annotate colors as swatches. Soft toon shading, thin dark outline, white background.
```

### Monsterbogen
```
Lineup sheet of stylized 3D chibi fantasy monsters on a light grey background, each in three-quarter view with a level tag: grey wolf, black alpha wolf with scar and red eyes, bristly boar, brown bear, forest spider with patterned abdomen and glowing eye cluster, desert scorpion with glowing stinger, green orc warrior with tusks and spiked pauldron, bandit with hood and red mask, undead warrior with glowing eyes, king cobra with hood, naga warrior with trident, red fire drake with membrane wings, lava golem made of rock chunks with glowing cracks, frost ghost with tattered glowing hem and crown. Smooth rounded shapes, toon shading with cool shadows, rim light, thin outline.
```

## Schadenszahlen und Chat-Kanäle (Version 4.2)

### Schadenszahlen
```
Mobile MMORPG combat UI detail: small floating damage numbers in a bold rounded fantasy font with a thin dark outline, rising diagonally to the upper right of the hit monster or hero so the characters stay fully visible. White for normal hits, golden with a soft orange glow and slightly larger for critical hits, red for damage taken, green for healing, small gold-colored loot text. Clean, readable at phone size, never covering faces.
```

### Chat-Kanäle
```
Compact semi-transparent chat window for a landscape mobile MMORPG, bottom left corner, dark wood-brown glass with a thin brass border. At the top three small pill tabs: "Global" (gold when active), "Gilde" (leaf green when active), "Ort" (sky blue when active); an inactive tab with new messages shows a tiny red dot. Messages in the global view carry small colored tags [Gilde] and [Ort]. The input bar above has the same three channel pills next to the text field and a golden "Senden" button. Readable, cozy East-Asian fantasy style.
```

## Seelensteine als Ei und klar unterscheidbare Klassen (Version 4.3)

### Seelenstein
```
Stylized 3D soul stone for a cozy East-Asian fantasy MMORPG, seen from a three-quarter top-down camera: a large blunt, smooth egg (taller than wide, wider at the bottom, softly rounded top) resting in a cradle of three to four curved stone claws on a low round carved pedestal with a glowing rune ring and a few pebbles. Branching glowing veins in the stone's color run from the bottom up over the shell, a glowing rune eye sits on the front, a thin halo surrounds the shell and a ring of small floating rune shards slowly circles above. When damaged, bright cracks open at 75, 50 and 25 percent health; at zero the shell bursts into glowing shards. Variants: slim tall egg (Trauer, Dornen, Pein), squat egg (Glut, Schwärze), twin fused eggs (Schatten, Fäulnis), gold-banded egg with a crown of spikes (Untergang); accents thorns, lava pool, ice spikes, crystal shards, smoke. Soft toon shading, thin dark outline, premium mobile-game quality.
```

### Klassen-Gesamt-Prompt
```
Four clearly distinct chibi hero classes for a stylized 3D fantasy MMORPG, readable from a top-down three-quarter camera at phone size. Each class has its own silhouette, materials and weapons; equipment tiers change color and ornaments, never the class identity.

KRIEGER (warrior / barbarian): broad sturdy build, heavy metal plate everywhere – a domed cuirass with a center ridge and rivets, three-layered round pauldrons with metal rims and spikes from the dragon tier, plate tassets hanging over a cloth skirt, plate greaves with knee cops and spikes, gauntlets, a wide leather belt with a big buckle and a boss. Barbaric touches: a thick fur collar under the pauldrons, fur cuffs over the boots, leather wraps around arms and legs on low tiers. Kabuto-style helmet with crest plume and horns. Weapons: sword and round shield, one-handed bearded axe with back spike (with shield), huge two-handed double-bladed battle axe, greatsword. Colors per tier: leather brown, bronze, iron grey-blue, crimson dragon scale with gold, violet soul plate with glowing runes, charcoal ash plate with ember cracks, white-blue sky enamel, radiant gold.

NINJA (assassin): slim agile build, only cloth and leather, no metal plates: wrapped dark tunic, wide hakama trousers tied at the shins with white cloth wraps, split-toe tabi boots, crossed leather chest straps carrying three kunai, a thigh holster, small stitched leather shoulder caps, wrapped forearms, a hood with long tails, a face mask and a long trailing scarf. Weapons: twin daggers or a recurve bow with quiver.

SCHAMANE (mystic): flowing layered robe with golden hem, very wide sleeves with golden cuffs, a cloth shoulder mantle with tassels and red beads, sash with paper talismans, bead necklace, feather headband. Weapons: folding fan or ritual bell with ribbons. No armor plates.

NEKROMANT (necromancer): hooded tattered robe with a zigzag hem, skull shoulder pieces with glowing eye sockets and bone spikes, a skull at the belt, a glowing chest rune, glowing eyes in dark sockets under the hood. Weapons: skull staff with glowing orb or a large curved scythe.

Style: soft toon shading with cool shadows, rim light, small metal highlights, thin dark outline, cute but heroic proportions.
```

### Waffenbogen Krieger
```
Weapon sheet for a stylized fantasy warrior, eight tiers each: one-handed bearded axe (wrapped haft, back spike from tier 3, glowing gem from tier 5), two-handed double-bladed battle axe (long haft, top spike, glowing edge runes on high tiers), sword with fuller and ornate guard, greatsword. Tier colors: iron, bronze, steel, dragon gold, soul violet, ember ash, sky white-blue, radiant gold. Clean toon shading, white background.
```

## Männlich und weiblich, Auftragsliste und Fundorte (Version 4.4)

### Klassen in beiden Geschlechtern
```
Character sheet of four stylized 3D chibi fantasy classes, each shown as a male and a female version side by side in matching gear: Krieger in plate armor with fur collar (male broader with thick brows and short spiky hair, female slimmer waist with long hair or a braid out of the helmet), Ninja in cloth and leather with hood and mask (female with a braid hanging out of the hood and long lashes), Schamane in a flowing robe with cloth mantle (male short hair, female with bun and red lips), Nekromant in a hooded tattered robe with skull pauldrons (female with a pale braid). Same proportions and readable silhouettes, big expressive eyes, female faces with longer lashes and soft blush, male faces with stronger brows and no blush. Soft toon shading, thin dark outline, white background.
```

### Auftragsliste
```
Compact quest tracker for a landscape mobile MMORPG UI on the right side next to the minimap: dark translucent wood-brown panel with brass border, header "Aufträge" with a count and a fold arrow. Each quest: a golden (main) or green (side) exclamation mark and title, a thin progress bar with "3/10", and a small blue location line with a pin icon "Sonnenwiesen · Map Vlotho". Clean, readable at phone size.
```

### Schmied-Teile mit Fundort
```
Blacksmith upgrade materials UI: a row of small material chips (wolf fur, orc tooth, frost crystal) with counts; tapping one opens a dark tooltip with a brass border: "Wolfspelz: fällt von Wolf (Stufe 3). Fundort: Sonnenwiesen · Map Vlotho". Cozy East-Asian fantasy style.
```

## Große Maps mit Städten und Weltportalen (Version 4.5)

### Weltkarte
```
Illustrated world map for a cozy East-Asian fantasy MMORPG, three separate regions shown as parchment map panels that are not connected by land. Map 1 "Vlotho": a large walled city with curved roofs in the center, concentric regions around it getting more dangerous outward – green Sonnenwiesen with cherry trees (level 1–9), dark pine Dunkelwald (10–19), dusty Orktal (20–29), grey Ödland (30–39), snowy Frostgipfel (40–49), misty Totenmoor (50–59) and the volcanic Feuerberg in the corners (60–70); four roads from the city gates to the edge, dungeon entrances beside the roads. Map 2 "Schlangental": the desert oasis city Sahra in the middle with palms, sandstone houses and a glowing world gate, a snake desert around it (30–39) and a swampy naga jungle outside (40–50). Map 3 "Donnerklamm": the stone fortress city Klammfeste in a canyon, troll and minotaur cliffs around it (50–61), the lava ridge of the titans outside (62–75). In every map a glowing stone world portal sits in the top-left and bottom-right area, with arrows showing travel to the other maps. Soul stones marked as small glowing eggs, stronger toward the edges. Hand-painted, warm colors, clear labels.
```

### Stadt in Map 2 und 3
```
Top-down three-quarter view of a small fantasy town plaza for a mobile MMORPG: paved square with a well in the center, a glowing ring-shaped world gate at the north side, market stalls, braziers and lanterns, four houses in the corners (sandstone with ochre roofs in the oasis city Sahra; dark stone with slate roofs in the fortress Klammfeste), friendly merchants, a blacksmith with an anvil and an alchemist with potions. Safe, cozy, readable, soft toon shading.
```

### Weltportal
```
Ancient stone portal ring standing on a small round paved clearing in the wilderness, filled with swirling blue light, small golden studs around the ring, faint runes on the ground; a sign shows the destination map. Stylized 3D toon look, thin dark outline.
```

## Duellarena (Version 4.6)

```
Dueling arena for a stylized 3D fantasy MMORPG seen from a three-quarter top-down camera: a large circle on the grass marked by a glowing red ring, from which a translucent red wall of light rises about two character heights, brightest at the ground and fading upward, with bright vertical streaks drifting up; ten dark stone posts with glowing red crystal tips stand around the ring; the ground inside is faintly tinted red toward the edge. Two chibi heroes face each other in the middle, crossed golden swords float above the opponent. The wall grows out of the ground during a 3-2-1 countdown. Dramatic but readable, soft toon shading.
```

## Schulterblick und PC-Grafik „Ultra“ (Version 4.7)

### Schulterblick (Kamera hinter der Figur)
```
Gameplay screenshot of a stylized 3D chibi fantasy MMORPG in landscape 16:9, third-person over-the-shoulder camera: the camera sits low behind the hero (about 30° above the ground, a few meters back) and looks forward across the scene, so the hero is seen from behind in the lower middle of the screen and the world stretches far into the distance. In front: a cozy East-Asian village plaza with cobblestones, a wooden well, market stalls with striped awnings, lanterns, curved tiled roofs and a red gate in the background; friendly villagers with name tags. Gentle depth fog toward the horizon, soft afternoon sun, long soft shadows, thin dark outlines, smooth toon shading. HUD in warm gold and dark brown frames: portrait with HP/MP bars top left, round menu buttons top right, round minimap in the corner, chat box bottom left, virtual joystick, big round attack button and skill buttons bottom right.
```

### Schulterblick im Kampf
```
Third-person over-the-shoulder view of a chibi hero standing in a sunny meadow full of flowers, a pack of grey wolves charging toward the camera from the distance, a glowing red soul-stone egg with cracks pulsing on the right, trees with round crowns and pink cherry trees in the background, a dirt path winding into the horizon. Dynamic but readable composition, depth fog, soft toon shading, thin outline, warm golden light, mobile MMORPG HUD.
```

### PC-Grafik „Ultra“
```
High-end PC version of a stylized 3D toon fantasy MMORPG, 2560×1440, same art style as the mobile version but richer: crisp full-resolution rendering, sharp anisotropic ground textures with visible grass blades and stone gaps, large high-resolution soft shadows from every tree, house and character, a wider view distance with more of the landscape visible, layered atmospheric fog, drifting clouds and many small particles (pollen, fireflies, embers). Clean, polished, no realism, still cozy and readable.
```

### Einstellungs-Fenster „Grafik“
```
Settings panel UI for a fantasy mobile/PC game, dark brown wood frame with gold trim, parchment-toned text: section "Grafik" with buttons "Niedrig / Mittel / Hoch / Ultra" (Ultra highlighted, small note "PC erkannt"), section "Kamera" with buttons "Weit / Normal / Nah / Schulterblick" (Schulterblick highlighted, small hint "Wischen dreht die Kamera, Mausrad zoomt"), toggles for shadows, clouds and particles. Rounded buttons, soft glow on the selected option, clean readable layout.
```

## Prompt-Sammlung für alles (Stand Version 4.7)

Alle Prompts in einer Liste, damit man jedes Bild des Spiels im gleichen Stil erzeugen kann. Jeder Prompt beginnt mit der Stilvorgabe:

```
STYLE: stylized 3D toy-like fantasy MMORPG in the spirit of classic East-Asian online RPGs (Metin2-like), chibi proportions, smooth rounded mid-poly shapes, thin dark-brown outline, soft 3–4 step toon shading, warm afternoon sun, soft cast shadows, saturated but not neon colors, clean readable silhouettes, no realism, no gore.
```

### Welt und Regionen
```
[STYLE] Map 1 "Vlotho": the walled starting city in the middle of a huge land, rings of regions around it: Sonnenwiesen (green meadow, flowers, cherry trees, level 1–9), Dunkelwald (deep pine forest, blue fog, fireflies, 10–19), Orktal (dusty ochre canyon with orc camps, 20–29), Ödland (grey ash plains, dead trees, 30–39), Frostgipfel (snow, ice crystals, 40–49), Totenmoor (murky swamp, will-o'-wisps, 50–59), Feuerberg (black basalt, lava rivers, embers, 60–70). Bird's-eye diorama view.
```
```
[STYLE] Map 2 "Schlangental": golden desert with dunes, sandstone ruins and oases with palms around the oasis city Sahra, a humid naga jungle with lianas and turquoise pools at the outer edge.
```
```
[STYLE] Map 3 "Donnerklamm": deep grey canyon with storm-blue light, stone bridges, troll caves and minotaur cliffs around the fortress city Klammfeste, a glowing lava ridge of the titans at the outer edge, lightning in the clouds.
```

### Städte und Gebäude
```
[STYLE] Korean-style fantasy town: cream plaster houses with dark timber, curved roofs with glazed red/teal/plum tiles and upturned eaves, red torii-like gate with guards, cobblestone plaza with a well, market stalls with striped awnings, stone lanterns, barrels, hay bales, archery target, a glowing ring-shaped world gate.
```
```
[STYLE] Town NPC lineup, each with a small icon above the head: Waffenhändler (sword sign), Rüstungshändlerin (shield sign), Schmied with anvil and hammer, Alchemistin with a green potion, Dorfältester with a scroll and exclamation mark, Wegweiserin, Händlerin, Jägerin with bow, Torwache with spear, Weltentor keeper.
```

### Klassen (männlich und weiblich)
```
[STYLE] Character sheet: Krieger and Kriegerin – sturdy, leather-and-plate tunic, rounded shoulder pads, red crest helmet, one-handed sword with round shield, or a two-handed greatsword / great axe; male with broad shoulders and short hair, female with a long braid and slimmer silhouette. Front, side and back view.
```
```
[STYLE] Character sheet: Ninja (male and female) – slim, dark wrapped outfit, long red scarf, hood, twin daggers or recurve bow with quiver; female with a high ponytail.
```
```
[STYLE] Character sheet: Schamane and Schamanin – flowing teal robe with golden zigzag hem, feather headband, folding fan or ritual bell, glowing turquoise orbs.
```
```
[STYLE] Character sheet: Nekromant and Nekromantin – hooded dark robe with stitched patches, pale skin, glowing green chest rune, skull staff or scythe, small green soul sparks.
```
```
[STYLE] Equipment tiers on the same warrior: leather brown, bronze, iron blue-grey, dragon red-gold, soul purple with runes, ash black with ember cracks, sky white-blue with feathers, god gold with white light; upgrade level +0 to +9 shown by growing glow on the weapon.
```

### Monster und Bosse
```
[STYLE] Monster sheet, low-level: wild dog, grey wolf, alpha wolf, boar, giant spider, bandit, goblin – cute but dangerous, red eyes when aggressive, level tag above the head.
```
```
[STYLE] Monster sheet, mid-level: orc warrior with axe, orc shaman, skeleton, ghoul, ice golem, frost wolf, swamp troll, will-o'-wisp, desert snake, scorpion, naga with trident.
```
```
[STYLE] Monster sheet, high-level: rock golem with glowing cracks, minotaur with a huge axe, storm troll, lava titan, fire demon, black dragon; bosses twice the size with a golden crown-shaped glow ring on the ground.
```

### Seelensteine
```
[STYLE] Soul stone as a large glowing egg on a small rock base, cracked shell with light shining through the cracks, colored by level (green, blue, purple, red, gold), runes circling around it, monsters spawning from it in waves, shards flying when it breaks; health bar and name "Stein der Wut" above it.
```

### Dungeons
```
[STYLE] Dungeon cave interior: dark rock walls, colored braziers (blue, green, red), stone bridges over glowing water, treasure chest, boss arena with a rune circle, entrance as a carved stone archway in the wild.
```

### Gegenstände und Symbole
```
[STYLE] Item icon set on dark round slots with gold rim: swords, greatswords, axes, great axes, daggers, bows, fans, bells, staffs, scythes, helmets, armor, shields, boots, rings, amulets, red HP potion, blue MP potion, upgrade stone, soul shard, gold coins, quest scroll, mount whistle.
```
```
[STYLE] Skill icon set, round with colored rim: fire slash, dash arrow, sword aura, whirlwind, triple claw strike, healing wave, shadow step, poison dagger, skeleton summon, soul drain, ultimate skill with golden frame (locked until level 30).
```

### Reittiere
```
[STYLE] Mount sheet: brown horse with saddle, white war horse with armor, black wolf mount, red battle tiger, golden lion; chibi rider sitting on top, soft dust clouds at the hooves.
```

### Kampf, Effekte und Duell
```
[STYLE] Combat effects: orange sword arc, blue magic burst, green poison cloud, damage numbers floating up to the right of the target (white normal, yellow critical with "!"), level-up golden light pillar, loot sparkle on the ground.
```
```
[STYLE] Duel arena: big circle with a glowing red ring and a translucent red light wall rising during the 3-2-1 countdown, stone posts with glowing red tips, two heroes facing each other, crossed golden swords above the opponent.
```

### Oberfläche (HUD und Fenster)
```
[STYLE] Mobile MMORPG HUD, landscape: portrait with level badge, red HP and blue MP bars top left; six round brown-gold menu buttons top right (character, bag, world, guild, quests, settings); round minimap with region name, gold, shards, battery, clock and ping; chat box with tabs Global / Gilde / Ort bottom left; floating joystick; big red attack button, five skill buttons and potion buttons bottom right; thin XP bar at the bottom.
```
```
[STYLE] Game windows: character sheet with equipment slots around the hero, inventory grid, blacksmith upgrade window with success chance, quest log on the right side, guild window, map window with three map tabs and portals, settings with graphics and camera options.
```

### App-Symbol und Ladebildschirm
```
[STYLE] App icon: a glowing purple soul-stone egg with golden cracks on a dark round background, small crossed swords behind it, title "Seelenstein" in a carved golden fantasy font, readable at small size.
```
```
[STYLE] Loading screen, landscape: four chibi heroes (Krieger, Ninja, Schamane, Nekromant) standing on a hill at sunset, a huge glowing soul stone in the valley below, the walled city Vlotho in the distance, title "Seelenstein" in gold.
```

## Schlanke Handy-Anzeige (Version 4.8)

```
Mobile MMORPG gameplay screenshot in landscape (iPhone, 19.5:9), stylized 3D toon fantasy world filling almost the whole screen, with a minimal, compact HUD pushed into the corners: top left a small round portrait with level badge and two thin HP/MP bars; top right a tiny round minimap with only the region name below it and a row of six small round brown-gold menu buttons beside it; bottom left a small translucent chat box with tabs Global / Gilde / Ort and a small loot-bag button above it; bottom right a big red attack button tucked deep into the corner with five small round skill buttons in a tight arc around it and two small potion buttons; a very thin XP line along the bottom edge. Clock, battery, ping and gold are hidden and only appear in a small dropdown under the minimap when tapped. Clean, unobtrusive, lots of free view of the game world.
```

## Anzeige bis an den Rand (Version 4.9)

```
Mobile MMORPG screenshot on a modern iPhone in landscape with the Dynamic Island on the left edge: the stylized 3D toon game world fills the whole screen edge to edge; HUD elements hug the screen corners – on the free right side the tiny round minimap sits in the top-right corner and the big red attack button with its tight arc of skill buttons sits deep in the bottom-right corner just inside the rounded screen corner; on the island side the portrait and the small chat box keep a little more distance. System messages like "ERFOO · Kanal 1: Du bist online" appear as grey italic lines inside the chat box instead of floating over the game. A thin XP line spans almost the full bottom edge. Clean, minimal, lots of free view.
```

## Meldungen im Chat (Version 5.0)

```
Close-up of the small translucent chat box in the bottom-left corner of a mobile fantasy MMORPG HUD, dark brown glass with a thin gold border, tabs "Global", "Gilde", "Ort" on top and a round speech-bubble button on the right; inside, system messages as short lines: a golden bold line "Stein der Wut zerstört! +1.250 EP.", a soft red line "Keine Mondtau mehr.", a grey italic line "ERFOO · Kanal 1: Du bist online.", and a player message "Mira: hi!". Above the hero in the game world a floating golden "+1.250 EP" number. The rest of the screen is free game view.
```

## Tarnung und Neustart (Version 5.1)

### Tarnung im Kampf
```
Stylized 3D chibi ninja in a dark wrapped outfit with a long scarf, half-transparent like smoke, striking a wolf from behind with twin daggers; dark grey-purple shadow wisps and small dots rising from the body, a faint purple ring on the ground, the wolf looking around confused. Soft toon shading, thin dark outline, sunny meadow background.
```

### Neustart-Fenster
```
Mobile fantasy MMORPG death dialog in the center of the screen, dark brown wooden panel with a thin gold rim, title "Du wurdest besiegt" in red-orange carved fantasy letters, a short line of text, two large buttons side by side: left a grey stone button "Hier neu starten" with a small line "−1.855 EP · halbes Leben", right a golden button "In der Stadt neu starten" with "kein EP-Verlust". Behind it the village plaza, slightly dimmed.
```

## Tarnung im Weg des Dolches (Version 5.2)

```
Skill icon for a mobile fantasy MMORPG, round slot with a purple rim: a hooded ninja silhouette dissolving into dark grey-purple smoke, one glowing white eye slit, a small dagger glint at the edge; stylized, soft toon shading, thin dark outline, readable at small size.
```
```
Stylized 3D chibi ninja with twin daggers fading into transparent shadow smoke, creeping behind a grey wolf in a sunny meadow, then reappearing in a burst of purple sparks with a huge critical stab (big golden damage number with "!"); thin dark outline, soft toon shading.
```

## Hauptwert im Charakterfenster (Version 5.3)

```
Character attribute panel of a fantasy mobile MMORPG: a glowing purple orb on the left with the number of free stat points, four cards for Stärke (red, sword icon), Vitalität (green, heart icon), Intelligenz (blue, crystal icon) and Geschick (gold, feather icon), each with a value, a thin progress bar and round golden "+" buttons; the class main stat card carries a small golden badge "Hauptwert" and lists "+1,5 % Fertigkeitsschaden · +1 % Angriffsschaden · +1 % Buff-Stärke". Dark brown wood frame with gold trim, clean readable layout.
```

## Gruppen und PC-Anzeige (Version 5.4)

### Gruppe im Spiel
```
Mobile fantasy MMORPG screenshot: three chibi heroes of different classes (warrior, ninja, shaman) fighting a pack of wolves together in a sunny meadow; in the top-left HUD under the player's portrait and HP/MP bars a compact party list with two small dark rows, each showing a name, level and a thin red HP bar, a tiny golden crown next to the leader. Floating golden "+1.467 EP" above the highest-level hero and "+733 EP" above the lowest. Soft toon shading, thin dark outline.
```

### Gruppenfenster
```
Fantasy game window "Freunde, Gilde & Gruppe" with three tabs, the tab "Gruppe 3" selected: member rows with green online dots, names, class and level, a golden "Anführer" tag, "Entfernen" buttons, a "Gruppe verlassen" button; below a section "Erfahrung verteilen" with two large selectable cards "Gleich verteilen" and "Höhere Stufe bekommt mehr" (the second one glowing gold); a list of channel players with "In Gruppe einladen" buttons. Dark brown wood frame with gold trim.
```

### PC-Lebensanzeige
```
Desktop version of the same MMORPG HUD at 1920×1080: in the top-left corner a larger round portrait with a level badge and two wide, thick HP and MP bars with numbers, a red heart and blue drop icon in front of the bars; clean, readable, more spacious than on mobile.
```

## PC-Anzeige mit Gruppe und Aufträgen (Version 5.5)

```
Desktop MMORPG HUD at 1920×1080, stylized 3D toon fantasy world: top-left a large portrait with level badge, the player name and wide HP/MP bars, directly below a party list of two larger dark rows ("Mira  Lv 24", "Shaolin  Lv 31") with names flush left and thick red HP bars; top-right the round minimap with region name, gold and status, and directly under it on the right edge a wider quest panel "Aufträge" with golden main quest and green hunt quest, larger text, progress bars and location hints; bottom-right a vertical column of menu buttons, bottom center the skill bar with potions. Clean, readable, spacious.
```

## Maus und Vollbild am PC (Version 5.6)

```
Desktop fantasy MMORPG in fullscreen, no browser bars visible: a stylized 3D toon world fills the whole monitor; a golden mouse cursor shaped like a small gauntlet clicks on the grass and a thin golden ring pulses where the hero will walk; another click on a wolf shows a red target ring under it while the hero swings his sword. Settings window in the corner with a glowing toggle "Vollbild" switched on. Soft toon shading, thin dark outlines.
```

## Gruppe auf der Karte und härtere Monster (Version 5.7)

### Gruppenmitglied im Spiel
```
Stylized 3D chibi MMORPG scene: a party member ninja next to the player, above her head a large glowing bright-green name "Lv 24 Mira" with a thick dark outline and a wide green health bar below it; another non-party player nearby with a smaller pale name. Sunny meadow, soft toon shading, thin dark outlines.
```

### Minikarte mit Gruppe
```
Round fantasy minimap with parchment-green terrain and a brass rim: the player as a white dot in the center, a party member as a large bright-green dot with a pulsing green glow ring, another party member outside the view shown as a green triangle arrow on the edge pointing toward them, other players as small light-blue dots, soul stones as small colored squares.
```

### Starke Monster
```
Stylized 3D toon fantasy: a hulking high-level storm troll with glowing runes and heavy stone armor towering over a well-equipped chibi warrior in shining +9 dragon armor with sparkling weapon; health bars above both show a long, hard fight. Dramatic but readable, thin dark outlines.
```

## Gemeinsam in den Dungeon (Version 5.8)

```
Mobile fantasy MMORPG screenshot: at the top center a small dark invitation card with a gold rim reading "Kaito geht in die Spinnenhöhle. Mitkommen?" with buttons "Annehmen" and "Ablehnen"; in the background two chibi heroes (warrior and ninja) appearing together in a purple-lit spider cave next to a glowing violet portal ring, giant spiders lurking in the shadows. Stylized 3D toon look, thin dark outlines.
```
```
A dangerous high-level monster pack (three armored orc brutes with glowing eyes) overwhelming a chibi hero in basic leather gear, big red damage numbers flying, the hero's health bar almost empty; next to it the same pack being held off by a hero in shining upgraded dragon armor. Stylized 3D toon, readable, dramatic.
```

## Boni mit Höchstwerten (Version 5.9)

```
Item tooltip of a fantasy MMORPG on dark parchment with a gold frame: "Drachenklinge +9", base attack in large numbers, five bonus lines in light blue ("Stark gegen Monster +10 %" marked with a small "max" badge, "Kritische Treffer +8 %", "Angriffswert +38", "Geschick +8", "Angriffstempo +12 %"), two golden special lines ("Fertigkeitsschaden +10 %", "Normaler Schaden +9 %"), each value with a thin bar showing how close it is to its maximum. Clean, readable game UI.
```

## Sofortiger Tod der Monster (Version 6.0)

```
Stylized 3D chibi MMORPG combat moment: a hero's sword strike lands on a grey wolf whose health bar drops from a sliver to empty, the wolf instantly bursts into a puff of dust and pale sparks with a golden "+EP" number rising, a second player in the background attacking the next wolf. Crisp, snappy feeling, soft toon shading, thin dark outlines.
```

## Helle Riss-Dungeons und gemeinsame Risse (Version 6.1)

### Riss-Dungeon (heller)
```
Inside a dungeon reached through a dimensional rift in a stylized 3D toon fantasy MMORPG: a wide cave hall with lavender-grey rock walls, softly but clearly lit – bright cool-white light from above, glowing violet crystals and warm braziers along the walls so the floor, monsters and loot are easy to read; light purple mist only in the far distance; a glowing violet rift portal behind the heroes; undead grave guardians with name tags, a soul stone egg on a rune circle. Readable, inviting, not gloomy, thin dark outlines, soft toon shading.
```

### Riss für die Gruppe
```
Mobile MMORPG minimap and world view: a flickering violet dungeon rift in a meadow, marked on the round minimap with a pulsing purple dot for all three party members (green dots), a small chat line "Bei Kaito hat sich ein Riss in die Totengruft geöffnet". The party walks toward the rift together. Stylized 3D toon look.
```

### Update-Hinweis
```
Small dark game notification bar with a golden rim at the top center of a mobile fantasy MMORPG: text "Der Host spielt schon Version 6.1. Bitte neu laden." and a glowing golden button "Jetzt neu laden". Clean, readable.
```

## Eigene Maps statt Ringe (Version 6.2)

### Weltkarte mit getrennten Maps
```
Illustrated world map overview for a cozy East-Asian fantasy MMORPG, drawn like an atlas page on aged parchment: nine separate island-like map panels floating apart from each other, connected only by thin glowing blue teleport lines between their central camps – Vlotho (walled city with green Sonnenwiesen meadows and cherry trees, level 1–9), Dunkelwald (dark pine forest, 10–19), Orktal (dusty ochre canyon with orc camps, 20–29), Ödland (grey ash plain, 30–39), Schlangental (desert oasis city with naga jungle, 30–50), Frostgipfel (snowy peaks, 40–49), Totenmoor (misty swamp, 50–59), Donnerklamm (storm canyon fortress, 50–75), Feuerberg (black basalt with lava rivers, 60–70). Each panel has a small safe camp in the center with a ring-shaped world gate, a rocky border, dungeon entrances marked with colored arches. Clear labels and level ranges, hand-painted, warm colors.
```

### Lager mit Weltentor
```
Top-down three-quarter view of a small safe camp in the middle of a dark pine forest map in a stylized 3D toon MMORPG: a square cobblestone plaza, a glowing white-blue ring-shaped world gate at the north edge, two warm braziers, a wooden well, a merchant stall with a red-and-white awning and a friendly trader, barrels and crates, four lanterns at the corners; dense pine trees and spiders lurking just outside the plaza. Cozy, readable, thin dark outlines.
```

### Weltentor-Fenster
```
Fantasy game travel window "Weltentor" in dark wood with gold trim: a list of map cards sorted by level – Vlotho (Stufe 1–9), Dunkelwald (10–19), Orktal (20–29), Ödland (30–39), Schlangental (30–50), Frostgipfel (40–49), Totenmoor (50–59), Donnerklamm (50–75), Feuerberg (60–70) – each with a short description and a button "Reisen", "Du bist hier" or a greyed "ab Stufe 40". Clean, readable.
```

### Ausgewogener Kampf
```
Stylized 3D chibi MMORPG combat comparison in three panels: a level-40 hero fighting a same-level frost yeti in a fair, tense fight with a half-empty health bar; the same hero barely surviving against a level-50 monster while drinking a glowing red potion; and fleeing from a towering level-60 lava golem whose single hit takes a third of the health bar. Thin dark outlines, soft toon shading, readable UI numbers.
```

## Ninja-Fertigkeiten und volle Lager (Version 6.3)

### Hinterhalt aus der Tarnung
```
Stylized 3D toon MMORPG action shot: a half-transparent ninja in dark violet leather and a hood, just stepping out of stealth in a puff of grey-violet smoke directly behind a large forest troll; twin daggers drive into the troll's back with a huge violet-white X slash, a golden "Hinterhalt!" text and a big critical damage number above. A faint smoky streak shows where the ninja vanished a moment ago. Thin dark outlines, soft cel shading, dramatic but readable.
```

### Blitzangriff
```
Stylized 3D toon MMORPG skill effect: a ninja vanishes on the left in a burst of dark smoke and an after-image silhouette, a thin pale-blue lightning streak crosses the ground, and in the same instant the ninja appears behind an orc warrior on the right, slashing with a bright blue-white crescent and a small lightning bolt striking the orc, who is briefly stunned with stars above the head. Fast, crisp, readable from a phone screen.
```

### Schattendoppelgänger (Ultimative Attacke)
```
Epic ultimate attack in a stylized 3D toon MMORPG: six translucent dark-violet shadow clones of the same ninja (same outfit and daggers, glowing pale lilac eyes) stand in a perfect circle around a huge lava golem on a glowing violet rune sigil; all six dash inward at the same moment and stab together, violet slash arcs crossing in the center. In the second beat the real ninja appears behind the golem and finishes with a giant white-violet cross slash and a shockwave ring. Particles of smoke and sparks, screen-wide violet flash, readable composition.
```

### Fertigkeitssymbole
```
Set of three round fantasy skill icons in a hand-painted toon style with thick dark outlines: (1) "Hinterhalt" – a white dagger pointing down with a drop of red, violet background; (2) "Blitzangriff" – a faded ninja silhouette on the left, a white-blue lightning zigzag, a dagger on the right; (3) "Schattendoppelgänger" – six small dark-violet ninja silhouettes in a ring around a red target with a white X, golden ultimate frame.
```

### Lager mit allen Leuten
```
Top-down three-quarter view of a small safe camp in the middle of a snowy mountain map, stylized 3D toon MMORPG: a square cobblestone plaza with a glowing blue ring-shaped world gate at the north edge, flanked by the camp elder (white beard, staff, golden exclamation mark above the head, quest board beside him) and a guide woman with a glowing orb; on the west side a blacksmith at an anvil and a weapon trader, on the east side a potion merchant at a stall and an armor trader with a shield; in the south a stable master next to hay bales, a huntress with a bow (green exclamation mark) and an alchemist in a violet robe. Braziers, a well, lanterns at the corners, pine trees and yetis outside. Cozy, readable, every person clearly visible.
```

## Große Maps, 3D-Fertigkeiten und Ränge (Version 6.4)

### Weltkarte mit neun gleich großen Maps
```
Illustrated world atlas page for a cozy East-Asian fantasy MMORPG on aged parchment: nine equally sized wide rectangular map panels (each 300 × 120 tiles, landscape format), Vlotho with its walled city and green Sonnenwiesen on the left, the other eight arranged in two columns of four to the right – Dunkelwald (pine forest), Orktal (ochre canyon), Ödland (ash plain), Schlangental (desert oasis city with jungle at both ends), Frostgipfel (snowy peaks), Totenmoor (misty swamp), Donnerklamm (storm canyon fortress), Feuerberg (basalt and lava). Every panel has a small safe camp in the center with a glowing ring gate, roads to the four edges, monster groups spread evenly, dungeon arches near the roads. Thin blue teleport lines between the camps, clear labels and level ranges.
```

### Fertigkeiten in 3D
```
Stylized 3D toon MMORPG combat, three-quarter view: a warrior spins with a greatsword and a glowing golden shockwave ring expands across the ground with a short translucent wall of light rising from it; a shaman calls six jagged white-blue lightning bolts that strike from the sky down to the ground with bright ground flashes; a ninja's slash hangs in the air as a curved glowing crescent with real depth, bending toward the camera. Additive glow, soft bloom, crisp thin dark outlines on the characters, readable on a phone screen.
```

### Rangstufen einer Fertigkeit (normal, E, H, L, V)
```
Five-panel comparison of the same sword-whirl skill in a stylized 3D toon MMORPG, getting more spectacular from left to right: (1) normal – a plain golden shockwave ring; (2) Erwacht E – an extra pale-blue outer ring, a glowing rune circle under the hero and light-blue sparks; (3) Heroisch H – violet rings, rising swirling rings around the hero and violet cross-slashes on every hit; (4) Legendär L – golden rune circle rotating on the ground, a pillar of light, a lightning bolt and tiny arcs of lightning on the enemies; (5) Vollendet V – an orange-red sky beam, a wall of glowing embers rising from the ring, fiery sparks and a strong screen shake. Labels "1–17", "E", "H", "L", "V" under each panel.
```

### Schmied mit Fundort-Hinweis
```
Fantasy MMORPG blacksmith window in dark wood and brass: the anvil with a glowing sword, the success chance bar, the cost line "Dazu: 3 × Spinnenseide (du hast 1)" with a small tooltip bubble floating in front of the window that says "Spinnenseide: fällt von Höhlenspinne (Stufe 18). Fundort: Dunkelwald · Spinnenhöhle", a checked box "Segensschriftrolle verwenden" and the big golden button "Verbessern" directly below, no long material list. Clean, readable.
```

## Endbosse, Monster-Schmuck und Wanderer (Version 6.5)

### Endboss-Tor
```
Huge dark stone gate in a stylized 3D toon MMORPG, standing on a snowy plain just south of a walled camp: two tall black stone pillars with glowing ice-blue runes and flaming braziers on top, an arch with a horned skull keystone, a swirling vortex portal inside, wide stone steps and a glowing rune circle on the ground. A golden floating label "Endboss: Frostriese Ymir". Dramatic, readable from a phone screen.
```

### Endboss-Kampf für fünf Spieler
```
Epic raid boss fight in a stylized 3D toon MMORPG: a gigantic frost giant (four times the size of the heroes) with a crown of golden horns, glowing eyes and a double rune ring under his feet, in a round icy stone hall lit by blue braziers. Five chibi heroes around him: a warrior tank in front with a shield, a shaman healer casting green light, three damage dealers with swords, daggers and fire magic. Red warning circles on the floor where meteors are about to strike, one meteor falling from the sky, a huge boss health bar at the top. Dynamic composition, glowing effects.
```

### Monster mit Schmuck je Gebiet
```
Lineup of stylized 3D toon MMORPG monsters, more detailed and menacing than before: a frost wolf with ice crystal spikes along its back and glowing blue eyes, a hellhound with glowing ember spikes and a fiery maw, an orc captain with bone trophies, shoulder spikes and a chest plate, a forest spider with thorny back and a glowing marking, a lava golem with glowing crystals growing from its shoulders, a ghost wrapped in floating chains with soul lights, elite monsters with a glowing ring on the ground. Thin dark outlines, soft cel shading.
```

### Wanderer mit Nebenaufgabe
```
A lone huntress with a bow standing next to a small campfire in a snowy landscape, a green exclamation mark floating above her head, talking to a chibi hero. A quest window shows "Ich brauche 6 × Yetifell" with the item icon and rewards. Stylized 3D toon MMORPG look.
```

### Beute am Boden
```
Close-up of loot dropping from a defeated yeti in a stylized 3D toon MMORPG: three items bounce onto the snow – a white fur pelt with the label "Yetifell ×2", a violet soul splinter "Seelensplitter ×3", a red potion "Drachenblut (L)" – each with a soft colored glow on the ground, a moment later they fly to the hero.
```

### Lager mit Mauer
```
Top-down three-quarter view of a small fortified camp on a snowy map in a stylized 3D toon MMORPG: a square stone wall with four gates on the roads and red-roofed towers at the corners and beside each gate, inside the plaza the world gate, merchants, blacksmith, elder, huntress and stable master. Outside only a few pine trees, snowy stumps and ice crystals, a frost wolf pack in the distance.
```

### Großer Dungeon-Riss
```
A large jagged rift hanging in the air above a grey ash plain in a stylized 3D toon MMORPG: a frame of black stone shards around a swirling violet vortex, glowing cracks spreading on the ground, floating rock fragments circling it, a small label below "Totengruft · 4:31". Mysterious and dangerous.
```

## Härtere Endbosse, Element-Effekte und Nebelrand (Version 6.6)

### Endboss-Sprung und Helfer
```
Stylized 3D toon MMORPG raid scene: a huge horned demon lord leaps high into the air toward one hero, a red warning circle with a glowing X under the targeted hero, while small hellhound minions burst out of fiery pillars around the arena; one defeated minion leaves a red potion and violet soul splinters glowing on the ground. Five heroes scatter, dramatic red lighting, readable on a phone.
```

### Elemente der Fertigkeiten
```
Grid of eight stylized 3D toon MMORPG skill effects, each clearly different: steel-blue sparks flying from a sword whirl; jagged rocks erupting from the ground around a warrior; a roaring orange flame column with embers; dark violet smoke and orbiting shadow orbs around a ninja; blue-white lightning sparks with a bolt from the sky; a swirling green-white wind column; a golden column of light with floating golden orbs around a shaman; white bone spikes bursting from the ground around a necromancer. Additive glow, soft cel shading.
```

### Nebel am Kartenrand
```
Top-down three-quarter view of the northern edge of a grey ash plain map in a stylized 3D toon MMORPG: a row of dark boulders marks the border, behind it the world fades into soft grey-violet mist – nothing of the next map is visible. A lone hero stands near the edge, a few dead trees and bones scattered around.
```

### Tränke mit Abklingzeit
```
Close-up of a mobile MMORPG action bar: a red potion button and a blue potion button, the red one dimmed by a dark circular cooldown sweep with a large "2" in the middle, the blue one ready and glowing. Clean, readable game UI.
```

## Monster neu und sichtbare Angriffe (Version 6.7)

Der ausführliche Katalog mit Design, Skizze, Ruhe, Bewegung, Ausholen, Schlag, Treffer/Tod und einem Prompt für jedes einzelne Monster steht in `docs/monster-prompts.md`.

### Ausholen und Zuschlagen
```
Animation sheet for a stylized 3D toon MMORPG, elevated three-quarter top-down camera, four rows: a grey wolf backs off with its head up and jaws wide open, then lunges and snaps (two glowing jaw arcs close over the target); a wild boar lowers its head and scrapes the ground with a front hoof, then charges and tosses its tusks upward (dust cloud, upward slash); a brown bear rears up on its hind legs with both paws raised, then crashes down with a paw swipe (three claw marks); a stone ogre raises both fists above its head, then slams the ground (shockwave ring, rock shards). Each wind-up frame shows a faint red warning glow on the monster.
```

### Echter Keiler
```
Concept turnaround of a wild boar for a stylized 3D toon MMORPG: low wedge-shaped body, high bristly withers with a dark mane ridge, long wedge head angled down ending in a flat pink-grey snout disc, small deep-set eyes, upright hairy pointed ears, upward-curving ivory lower tusks, thin legs with cloven black hooves, thin tail with a tuft, dark grey-brown grizzled coat (#4e3a2c). Side, front and top views plus idle, scrape, charge and tusk-toss poses. Clearly a pig, not a bear.
```

### Neue Tiere je Map
```
Lineup of thirteen stylized 3D toon MMORPG animals on a neutral ground, each with real anatomy and readable silhouette from above: red fox with white-tipped bushy tail; red deer stag with branching antlers; thorn boar with mossy back and green thorns; lynx with black ear tufts and stubby tail; spotted hyena with sloped back and dark mane; desert jackal with black saddle and big ears; huge black ash warg with glowing orange eyes; polar bear; black shadow panther with glowing yellow eyes; woolly mammoth with shaggy coat, trunk and curved tusks; grey-green moor wolf with glowing green eyes; thunder ibex with huge ridged horns and blue sparks; ember cat with glowing orange stripes and tail tip.
```

## Kanäle und belebte Maps (Version 6.8)

### Kanal-Auswahl
```
Mobile MMORPG server selection panel in dark fantasy style: server "ERFOO" with two channel rows, "Kanal 1 – 2/8 Spieler" with a glowing orange dot and a "Betreten" button, "Kanal 2 – leer · du eröffnest ihn" with a calm green dot. Clean readable UI on a phone in landscape.
```

### Belebte Wiese
```
Elevated three-quarter top-down view of a sunny meadow map in a stylized 3D toon MMORPG: several packs of wild dogs and grey wolves, a family of wild boars rooting in the grass, a red fox trotting, a red deer stag with antlers at the forest edge, two glowing soul stones in the distance; few trees, lots of open grass, a lone hero in the middle. Lively but readable on a phone.
```

## Tagesbelohnung, Schamane und Dauerangriff (Version 6.9)

### Tagesbelohnung
```
Mobile MMORPG daily login reward window in dark fantasy style: seven reward tiles in a row labelled "Tag 1" to "Tag 7" – gold pouch, violet soul splinters, blue enhancement crystals, a blessing scroll, green switcher gems, an open treasure chest, and a big glowing violet tile with a skill book and rare crystals for day 7. Days 1–2 dimmed with green check marks, day 3 glowing golden and pulsing, a large golden button "Tag 3 abholen" below. Readable on a phone in landscape.
```

### Glutlotus
```
Stylized 3D toon MMORPG skill effect, elevated three-quarter view: a shaman in teal robes with a fan points at a group of bandits; under them a huge glowing orange-gold rune circle opens like a lotus, eight flame petals burst out of the ground in a ring, a bright fire column rises in the middle, embers and sparks fly, scorched ground. Additive glow, cel shading.
```

### Drachenwirbel
```
Stylized 3D toon MMORPG skill effect: a ghostly fire dragon spirals three times around a shaman, leaving a glowing orange-gold ring trail at waist height; enemies all around are hit, the final loop releases a fire shockwave and a short flame column, bandits are knocked outward. Rune circle on the ground, sparks, warm light.
```

### Dauerangriff am Handy
```
Close-up of a mobile game attack button held down by a thumb, glowing ring pulsing around it, the hero in the background attacking repeatedly with motion trails. Clean readable mobile UI.
```

## Zusammenspielen im Mobilfunk (Version 7.0)

### Umweg-Verbindung
```
Simple friendly infographic in a fantasy game style: two smartphones on mobile data, each behind a small castle wall labelled "Anbieter"; a dashed direct arrow between them breaks with a red cross, while a glowing golden path arcs over the walls through two floating message towers labelled "HiveMQ" and "EMQX" and connects both phones; a small badge "K1 · 2/8 · Umweg" under a minimap. Clean, readable on a phone.
```

## Glutdrache und Feuerhagel (Version 7.1)

So sind die beiden Angriffe im Spiel gebaut; die Prompts dienen als Vorlage für noch flüssigere Animationen.

### Glutdrache – Ablauf (0,3–0,7 s Flug, dann Explosion)
1. **Wirken (0–0,1 s):** Der Schamane reißt den Fächer nach vorn, an der Hand dreht sich ein goldener Runenkreis, Funken steigen auf.
2. **Flug:** Aus dem Fächer schießt der Drache: zuerst der Kopf, der Leib zieht in einem flachen S hinterher (drei Wellen, die zum Ziel hin abklingen) und steigt dabei in einem Bogen auf und ab. Der Schwanz wird dünner und dunkelrot, zum Hals hin dick und golden; von den Rückenzacken lösen sich Glutfunken.
3. **Einschlag:** Der Kopf taucht ins Ziel, eine Feuersäule schießt hoch, glühende Zacken brechen im Kreis aus dem Boden, Rauch und eine Brandspur bleiben 3 Sekunden.
```
Animation sheet, stylized 3D toon MMORPG, elevated three-quarter top-down view, 6 frames: a shaman in teal robes flicks a golden fan; a serpentine fire dragon bursts out – horned head with open jaws, glowing white eyes, long whiskers trailing back, a body of overlapping glowing segments from gold at the neck to deep red at the thin tail, small golden spikes along the back, embers dripping off; it flies in a low S-curve arc toward a group of enemies, then dives into them and explodes into a fire column, a ring shockwave and glowing shards. Additive glow, smooth motion trail, readable on a phone.
```

### Feuerhagel – Ablauf (etwa 1,6 s)
1. **Warnung (0–0,1 s):** Über dem Zielgebiet erscheint ein großer, langsam drehender Feuer-Runenkreis.
2. **Hagel:** Zehn glühende Brocken stürzen nacheinander schräg vom Himmel (alle 0,11 s einer; der erste genau in die Mitte), jeder mit kurzem Glutschweif, rotierend; am Boden wächst ihr Schatten, bis sie aufschlagen.
3. **Einschläge:** Je Einschlag ein kleiner Glutring, Funken, Brandfleck; der letzte Einschlag lässt den Boden stärker beben.
```
Stylized 3D toon MMORPG skill effect, elevated three-quarter view: over a group of monsters a large slowly rotating orange rune circle glows on the ground; ten glowing meteors with short fiery tails fall diagonally from the sky one after another, each casting a growing glow on the ground before impact; impacts burst into small ring shockwaves, sparks and scorch marks; warm orange light, ash in the air, readable on a phone.
```

## Feuerhagel länger (Version 7.2)
```
Stylized 3D toon MMORPG skill effect, elevated three-quarter view, no rune circle on the ground: for three seconds a steady rain of 22 glowing meteors with short fiery tails falls diagonally from a darkening sky onto a group of monsters, one after another; each casts a growing orange glow on the ground before it hits and bursts into a small ring shockwave, sparks and a scorch mark. Smooth, continuous, readable on a phone.
```

## Neue Pferde (Version 7.3)

### Reitpferd
```
Concept turnaround, stylized 3D toon MMORPG: a chestnut riding horse with real horse anatomy – deep chest, high withers, rounded croup, arched neck, wedge-shaped head with nostrils and pricked ears, white blaze and two white socks, dark flowing mane falling to both sides, long high-set tail; leather bridle with gold bit rings, a saddle blanket in the rider's class color with gold border, brown saddle with pommel and cantle, steel stirrups. Side, front and top views, plus gallop cycle with the neck nodding and the tail streaming back.
```

### Kriegsross
```
Concept turnaround, stylized 3D toon MMORPG: a black war horse with glowing orange eyes, steel chanfron with a golden horn spike on the forehead, overlapping steel neck plates, a rounded steel chest plate with golden rim and glowing gem, red caparison panels with gold trim along the flanks, red cloth over the croup, red plume on the head, heavy feathering above the hooves; menacing but elegant, readable from an elevated top-down camera. Include a gallop cycle with mane and tail flowing.
```

## Konten und Charakterauswahl (Version 7.4)

### Startbildschirm mit Konto
```
Fantasy MMORPG title screen UI for a mobile landscape game, dark night-blue stone panel with thin gold filigree border, small "Konto" header with a glowing soul-stone gem icon, two compact input fields (account name, password) with dark inset style and gold focus glow, two buttons side by side: "Anmelden" (gold, primary) and "Registrieren" (dark with gold outline), a small green status line "angemeldet als alper · abgeglichen"; clean, readable at phone size, no clutter, stylized toon look matching a top-down 3D fantasy game.
```

### Charakterauswahl mit vier Plätzen
```
Character select screen for a stylized fantasy MMORPG, four slot cards in a row (two by two on narrow phones): each filled card shows a small class emblem (warrior axe, ninja dagger, shaman talisman, necromancer skull) in the class color, the character name in bold, "Stufe 12 · Schamane", map name and last played time, a gold "Spielen" button and a small red trash icon; the last played card has a soft gold glow; an empty card is a dashed gold outline with a big "+" and "Neuer Charakter"; dark blue parchment background with gold trim, compact and readable on a phone in landscape.
```

## Blitzdrache, Blizzard und Ansturm (Version 7.7)

### Blitzdrache
```
Stylized 3D toon MMORPG spell VFX, top-down three-quarter view: a serpentine lightning dragon made of crackling electric-blue energy – white-hot head with horns, open jaws and long whiskers, body of overlapping glowing segments shading from pale cyan at the neck to deep cobalt at the tail, small sparks jumping off the body; it arcs from the shaman's hand to the target and discharges in a burst of forked lightning bolts, blue ground cracks and bright sparks. Clean silhouettes, readable on a phone screen.
```

### Blizzard mit Zielkreis
```
Stylized 3D toon MMORPG area spell, top-down: a ground-targeted blizzard – first a dashed pale-blue aiming circle with slowly turning rune ring; then inside the circle a frosty ground patch, a blue rune circle, wind-blown snowflakes drifting diagonally and sharp icicles falling at an angle and shattering into ice shards; enemies inside get a light frost tint. Medium radius, cold palette of white, ice blue and cobalt, readable at small size.
```

### Ansturm der Dungeon-Monster
```
Game animation reference, stylized 3D toon monsters (cave spider, orc berserker, ice golem): a short crouch with an orange warning ring at the feet, then a fast low sprint toward the player with a dust trail, ending in a lunging strike; three key poses side by side for each monster.
```

## Karte und Menü oben rechts (Version 7.8)

### Runde Minikarte
```
Mobile MMORPG HUD element, stylized fantasy: a round minimap set in a polished brass ring with a thin dark inner rim and a small "N" medallion at the top, the map inside slightly darker toward the edge like a lens, the player shown as a cream-white arrow pointing in the walking direction with a soft glow, quest givers as small gold and green diamonds, soul stones as glowing gems; below it a small dark ribbon with the zone name in gold serif letters. Crisp at 84 px on a phone screen, no clutter.
```

### Menüknöpfe
```
Row of round HUD buttons for a mobile fantasy MMORPG, each like a lacquered dark-brown coin with a brass ring and a gold line icon (helmet for character, backpack, horse head, globe for server, shield with heart for friends and guild, gift box for daily reward, speech bubble, book with question mark, gear); generous spacing between the coins so they are easy to tap with a thumb, subtle press animation, readable at 36 px.
```

### Ninja-Tarnung aus drei Blickwinkeln
```
Three-panel concept, stylized 3D toon MMORPG: the same stealthed ninja seen by himself (semi-transparent with a faint purple shimmer and his name faded), by a party member (same semi-transparent look with a green party name), and by a stranger (nothing visible at all – only the empty ground and grass). Top-down three-quarter camera.
```

## Grafik auf dem nächsten Level (Version 7.9)

Die ausführliche Bauanleitung für Licht, Schatten, Figur, jedes Ausrüstungsteil in jeder Stufe,
Monster, Boden, Gras und Wasser steht in `docs/grafik-prompts.md` (Grafik-Bibel). Hier die Prompts,
mit denen die neuen Formen entworfen wurden.

### Acht Stufen nebeneinander (Silhouette statt Farbe)
```
Character sheet, stylized 3D toon MMORPG (chibi proportions, big head, thick dark outlines, three-band cel shading), the same warrior shown eight times side by side in armor tiers: leather vest with cross lacing and leather cap with ear flaps; bronze helmet with nose guard and narrow red comb over chain mail; iron kabuto with a big silver crescent crest over lamellar plates; red dragon helmet with curved horns, jaw guards and a spiked ridge, dragon head on the chest; violet soul helmet with a closed visor, glowing eye slit and a crown of crystals, a crystal floating in front of the chest; black ash helmet with a crown of jagged obsidian spikes and glowing seams; white sky helmet with large feather wings and feather tassets; golden god helmet with a tall crest, red plume and sun disc. Every tier must be recognizable by its silhouette alone, top-down three-quarter camera.
```

### Kopfbedeckungen der vier Klassen
```
Sprite reference sheet, 4 rows × 8 columns of chibi head-and-shoulders busts in stylized 3D toon style: warrior helmets (leather cap to golden sun helmet), ninja hoods and masks (cloth hood, leather headband, moon plate with long hood tails, cobra hood with fangs, night mask with glowing lines, red oni mask with small horns, star mask with forehead star, golden fox mask with ears), shaman headwear (headband with feathers, silk cap with ribbons, white crane crest, phoenix flame crown, dragon crown with horns and pearl, ember crown with floating sparks, cloud crown with small wings, golden diadem with a sun halo), necromancer hoods (torn hood, ash band, bone skull helmet with jaw, green soul flame on the hood tip, crown of bone thorns, long black horns, starry hood, golden skull with a halo). Readable at 80 px.
```

### Waffen je Stufe
```
Weapon tier sheet for a stylized 3D toon MMORPG, eight swords from plain to divine: straight iron blade with a simple cross guard; broad leaf blade with bronze guard and round ends; curved moon blade with a crescent guard; dragon sword with a saw-toothed back, wing-shaped guard and a claw gripping a red stone; soul blade with a glowing violet fuller, thorn-ring guard and a floating crystal pommel; jagged obsidian blade with an ember core; slim pale sky blade with feather wings and a star pommel; broad golden blade with a sun-disc guard and glowing edges. Below: matching axes, bows (dragon-head tips, feathered limbs, sun at the grip), fans (crane feathers, phoenix flames, cloud puffs) and necromancer staffs and scythes (skull, thorn crown, obsidian spikes, star, sun).
```

### Schilde
```
Eight warrior shields in stylized 3D toon style: round plank shield with iron bands and boss; bronze shield with two raised rings and a pointed boss; almond-shaped iron kite shield with a silver crescent; red dragon shield with a dragon head relief and spikes around the rim; violet soul shield with a floating glowing rune circle; black ash shield with a jagged rim and glowing cracks; white sky shield with feather wings on both sides; golden sun shield with rays reaching past the rim.
```

## Attacken und Zustände (Version 8.0)

Alle Attacken jeder Klasse – Grundangriffe, beide Wege, Buffs, Ultimates – stehen mit Merkmal und
Prompt in `docs/grafik-prompts.md`, Abschnitt 9.

### Zustände am Ziel
```
Status effect icons in 3D for a stylized toon MMORPG, top-down three-quarter view, five bandits side by side: stunned – three small yellow stars circling the head; slowed – a frosty ring with ice crystals at the feet; burning – small flame tongues on shoulders and head with embers rising; poisoned – green bubbles floating up; cursed – a glowing rune circle hovering above the head in the curse colour (violet, orange, green or turquoise). Clear and readable at phone size.
```

### Neue Merkmale einzelner Fertigkeiten
```
Four skill moments in stylized 3D toon style, top-down three-quarter view: a golden round shield imprint flashing in front of a warrior (shield bash); a dark thundercloud with flickering light above an enemy, bolts striking down (thunderstorm); skeletal bone hands bursting from a green glowing ground and grabbing an enemy's legs (crippling curse); the ground cracking open with bone spikes and green smoke as two skeletons rise (raise dead).
```

## Neue Krieger-Attacken (Version 8.3)

Drei Krieger-Attacken sind neu: Sichelwelle (statt Dreifachschlag), Sprungschlag (statt Sturmangriff) und
Felsenfaust (statt Schildstoß). Merkmale und Werte stehen in `docs/grafik-prompts.md`, Abschnitt 9.3 und 9.4.

### Sichelwelle
```
Stylized 3D toon MMORPG, top-down three-quarter camera, a warrior in plate armour performs CRESCENT WAVE: frame 1 a wide white cross slash in a 140° arc, frame 2 a short hop with the sword raised over the head, frame 3 the blade rammed into the ground with a white impact flash, a star crack and steel sparks, frame 4 an upright blue-white crescent of light (tilted 40° forward) racing away across the grass, leaving a soft light trail and a dark furrow; bandits on its path are knocked back. Clean shapes, readable at phone size, no text.
```

### Sprungschlag
```
Stylized 3D toon MMORPG, top-down three-quarter camera, a warrior performs LEAP SLAM in four frames: a short crouch with dust at the feet, a high arc forward with wind streaks and the sword held over the head with both hands, a hard fall, then the landing: the ground is pressed in like soft earth – a shallow bowl in the colour of the grass and soil, a ring of chunky brown earth clods pushed up around the rim, a few clods tumbling outward, dust and dark cracks, absolutely no fire and no explosion; three bandits at the rim are dazed with small yellow stars circling their heads. Clean shapes, readable at phone size, no text.
```

### Felsenfaust
```
Stylized 3D toon MMORPG, top-down three-quarter camera, a warrior performs ROCK FIST: he hops and punches the ground with the left fist, a dark crack with small rock spikes races in a straight line to a bandit, then with an uppercut motion a hexagonal stone pillar with a chunky rock fist on top bursts out of the ground right under the bandit and throws him into the air, stone wedges break open in a ring around the pillar and a thin golden light glows in the gap. Earthy sand and grey-brown rock colours, clean shapes, readable at phone size, no text.
```

### Krater im Detail
```
Close-up game asset render, stylized 3D toon: a landing crater on a grass meadow two seconds before it fades – a shallow round depression slightly darker than the grass, its rim made of 12 faceted low-poly earth clods in warm brown tones, six smaller clods outside, thin dark cracks radiating, a light dust haze. Matching soft toon shading, top-down three-quarter view, no characters, no text.
```

## Schönere Welt (Version 8.4)

Regeln, Tabellen und die Konzept-Prompts für Kartenrand, Portale, Schmuck und Köpfe stehen in
`docs/grafik-prompts.md` (5.1, 6.4, 6.5, 6.6 und Abschnitt 8). Hier die Einzelbilder.

### Kartenrand je Gebiet
```
Six panels, stylized 3D toon MMORPG, top-down three-quarter camera, each showing where a walkable area ends in a tall layered backdrop with no grey: a blossom hedge of rounded green crowns with pink blossom clusters; a wall of overlapping dark pines; a jungle wall with lianas, fan leaves and red flowers; layered sandstone cliffs with mesas behind; ash cliffs with rock needles, dead trees and glowing orange veins; ice cliffs with snow caps, icicles and snowy pines; weeping willows with hanging moss and a mist band; basalt columns with glowing seams. Soft gradient horizon, thick outlines only on the front row.
```

### Riss je Dungeon
```
Eight rift portals side by side, stylized 3D toon, top-down three-quarter view, each an upright oval ring of smooth rounded rune stones on a small earth mound with roots, filled with a swirling vortex in three tone bands with a bright eye: violet with spider webs and egg sacs; orange sandstone with iron bands, tusks and a red banner; icy blue with snow caps and icicles; red basalt with lava seams and embers; amber mossy fieldstone with ropes and a lantern; violet grave stone with a skull keystone and chains; teal jade with gold trims, a coiled stone snake and vines; golden iron stone with rivets and an anvil keystone. No spikes, soft shapes.
```

### Dungeon-Tor
```
Stylized 3D toon dungeon gate, top-down three-quarter view: a round two-step stone dais with worn steps, two columns with a slight bulge and moss on the capitals, an arch of seven individual wedge stones with a keystone carrying a spider emblem, ivy hanging down, braziers on the dais, the arch filled with a softly swirling violet vortex, a glowing rune circle on the dais floor.
```

### Banditen-Varianten
```
Three bandits in a row, stylized 3D chibi toon MMORPG, thick outlines: a brown hood with a soft rolled hem, a tip at the back and a cowl, a red mask tied at the neck, a dark fringe and a ponytail with a gold tie; a red bandana with two fluttering tails, a black mask, messy chestnut hair and a scar; an open hood, a red neckerchief and a full dark beard. Brown, green and grey eyes, hair made of chunky strands with a shine band.
```

### Schmuck nah
```
Close-up sheet of ground props, stylized 3D toon, top-down three-quarter view on grass: a bush of five leafy puffs with red berries and small leaves at the rim; a fly agaric cluster; a stump with growth rings, roots and a hand axe stuck in it; a hollow mossy log with bracket fungi; a jungle plant with big drooping leaves and an orange flower; an ox skull with horns half in sand; crossed bones with a small skull; a fallen forked branch with a stone; an icy blue faceted crystal cluster; a snow drift with rocks and dry grass.
```

## Der Magier (Version 8.6)

Die fünfte Klasse: ein westlicher Gelehrtenmagier mit vier Element-Wegen (Feuer, Frost, Blitz, Erde). Tabellen,
Abgrenzung zum Schamanen und die Effekt-Prompts je Weg stehen in `docs/grafik-prompts.md` (3, 4.4a, 4.5, 4.11,
Abschnitt 8 „Magier-Sets“ und 9.12–9.15). Hier die Einzelbilder. Grundregel für alles: Dreiecks-Siegel statt Kreis,
flach am Boden nach außen oder aus dem Boden aufsteigend, nichts fällt vom Himmel, keine Drachen.

### Zepter je Stufe
```
Eight short magic sceptres side by side, stylized 3D toon game assets, top-down three-quarter view: a forked wooden branch holding a small crystal; a dark lacquered shaft with a silver band cage; a crescent-moon cage; a bundle of three small crystals; two crossed rings slowly turning; a hexagonal sigil plate with a glowing ember core; an astrolabe with star spikes; a golden halo with three floating crystals. In the centre of every cage floats a stretched octahedral crystal (shown in crimson, royal blue, yellow-white and amber variants). Silver cuffs, clean shapes, readable at phone size, no text.
```

### Spitzhüte je Stufe
```
Eight wizard hats in a row, stylized 3D toon game assets, top-down three-quarter view: soft grey-blue hat with a bent-back tip; stiff indigo hat with a silver band and an element stone; tall hat with a glowing rune band; hat whose tip ends in a floating crystal; arcane hat with a glowing brim and a small triangle sigil floating above the tip; charred black hat with glowing ember holes and a smoke wisp; night-blue hat with star dots, a rolled tip and one orbiting star; a silver circlet with three floating crystals instead of a hat. Clean shapes, thick outlines, no text.
```

### Eingefroren
```
Status effect close-up, stylized 3D toon MMORPG, top-down three-quarter view: three enemies (a bandit, a wolf, an orc) frozen mid-motion inside translucent royal-blue hexagonal ice blocks with white edges and two glossy highlight streaks, a hexagonal frost pattern on the ground; next to them one block shattering into glittering white shards. A boss beside them is only slowed with a frosty ring at its feet, no ice block. No snow falling, no sky effects.
```

### Symbole der 24 Magier-Fertigkeiten (je 256×256)
Muster: `Game skill icon, 64×64, painterly toon, dark vignette, {Motiv}, {Elementpalette}, Western arcane mage magic, flat ground-level effect, no dragons, no sky.` Hintergrund wie im Spiel: Angriff rotbraun, Buff blau, Ultimate gold.

Feuer (crimson red and white-hot, #e8362a, #a0102e, #fff1c8):
- Feuernova: `Game skill icon, 64×64, painterly toon, dark vignette, a flat ring of upright crimson flame tongues around a pair of boots standing on a small glowing upward-triangle sigil, the ring racing outward over the ground, crimson and white-hot palette, Western arcane mage magic, flat ground-level effect, no dragons, no sky.`
- Feuerball: `Game skill icon, 64×64, painterly toon, dark vignette, a white-hot fireball wrapped in two thin crossing sigil rings flying to the upper right with a trail of embers, crimson and white-hot palette, Western arcane mage magic, no dragons, no sky.`
- Flammenschritt: `Game skill icon, 64×64, painterly toon, dark vignette, a dark mage silhouette with a pointed hat inside a tall crimson flame column, glowing burning footprints leading away, crimson and white-hot palette, Western arcane mage magic, no dragons, no sky.`
- Glutherz: `Game skill icon, 64×64, painterly toon, dark blue vignette, a glowing ember crystal floating above an open palm, soft crimson glow, crimson and white-hot palette, Western arcane mage magic, no dragons.`
- Flammenkreis: `Game skill icon, 64×64, painterly toon, dark vignette, a glowing upward-triangle sigil on the ground surrounded by a circular wall of crimson flames leaning inward toward the centre, crimson and white-hot palette, Western arcane mage magic, flat ground-level effect, no dragons, no sky.`
- Inferno (Ultimate): `Game skill icon, 64×64, painterly toon, golden frame, three concentric crimson flame rings on the ground, the outer ones darker, white-hot centre, crimson and white-hot palette, Western arcane mage magic, flat ground-level effect, no dragons, no meteors.`

Frost (royal blue with cyan-white highlights, #3a7bff, #1a3fb0, #eafcff):
- Frostnova: `Game skill icon, 64×64, painterly toon, dark vignette, a flat royal-blue hexagonal frost plate with twelve ice needles shooting outward like a starburst, royal blue and cyan-white palette, Western arcane mage magic, flat ground-level effect, no snowstorm, no sky.`
- Eisstrahl (seit 9.6): `Game skill icon, 64×64, painterly toon, dark vignette, an open palm firing a wide, channeled beam of ice diagonally upward, white-hot core with swirling frost streaks, frost crystals growing along its edges, royal blue and cyan-white palette, Western arcane mage magic, no sky.`
- Eisschritt: `Game skill icon, 64×64, painterly toon, dark vignette, a crystalline ice statue of a wizard with a pointed hat, a frost glide path with small hexagons leading away, speed lines, royal blue and cyan-white palette, Western arcane mage magic, no sky.`
- Frostpanzer: `Game skill icon, 64×64, painterly toon, dark blue vignette, an indigo robed torso with four thin hexagonal ice plates orbiting at chest height, royal blue and cyan-white palette, Western arcane mage magic.`
- Kristallgrab: `Game skill icon, 64×64, painterly toon, dark vignette, five tall ice crystals growing in a hexagon out of a glowing downward-triangle sigil on the ground, royal blue and cyan-white palette, Western arcane mage magic, no falling icicles, no sky.`
- Eiszeit (Ultimate): `Game skill icon, 64×64, painterly toon, golden frame, a hexagonal glacier plate with crystal spires at the rim and an enemy frozen inside a translucent hexagonal ice block, royal blue and cyan-white palette, Western arcane mage magic, no snowstorm.`

Blitz (yellow-white with violet edges, #ffe94a, #ffffff, #8a5aff):
- Blitznova: `Game skill icon, 64×64, painterly toon, dark vignette, jagged yellow-white ground lightning crawling outward from a small wizard figure along a flat violet ring, yellow-white and violet palette, Western arcane mage magic, flat ground-level effect, no clouds, no bolts from the sky.`
- Kettenblitz: `Game skill icon, 64×64, painterly toon, dark vignette, a zigzag lightning bolt jumping over three glowing nodes, a small violet spark pair at each node, yellow-white and violet palette, Western arcane mage magic, no clouds, no sky.`
- Blitzschritt: `Game skill icon, 64×64, painterly toon, dark vignette, a faded wizard afterimage turning into a horizontal lightning streak with a scorched line below, yellow-white and violet palette, Western arcane mage magic, no sky.`
- Statische Ladung: `Game skill icon, 64×64, painterly toon, dark blue vignette, the hem of an indigo robe crackling with small white and violet sparks, yellow-white and violet palette, Western arcane mage magic.`
- Kugelblitz: `Game skill icon, 64×64, painterly toon, dark vignette, a crackling ball of lightning rising low above a triangle sigil with a bar, three horizontal arcs striking outward, yellow-white and violet palette, Western arcane mage magic, no clouds, no sky.`
- Donnerkrone (Ultimate): `Game skill icon, 64×64, painterly toon, golden frame, a crown of yellow-white lightning spikes above an indigo hat brim, two horizontal arcs leaving the sides, yellow-white and violet palette, Western arcane mage magic, no clouds, no sky.`

Erde (dark basalt with glowing amber, #3e3532, #f0a830, #ffd98a):
- Erdnova: `Game skill icon, 64×64, painterly toon, dark vignette, six black basalt shards with amber veins flung outward horizontally from a glowing amber centre, amber cracks on the ground, basalt and amber palette, Western arcane mage magic, flat ground-level effect, no rock pillar, no sand.`
- Steingeschoss: `Game skill icon, 64×64, painterly toon, dark vignette, a dark basalt boulder with a glowing amber core flying to the right with speed lines, basalt and amber palette, Western arcane mage magic, no sand.`
- Erdsprung: `Game skill icon, 64×64, painterly toon, dark vignette, a wizard with a pointed hat rising out of a glowing amber fissure in the ground, small basalt shards flying, basalt and amber palette, Western arcane mage magic, no crater, no sand.`
- Basalthaut: `Game skill icon, 64×64, painterly toon, dark blue vignette, an indigo robed torso covered by dark basalt plates with glowing amber seams on both shoulders and the chest, basalt and amber palette, Western arcane mage magic.`
- Schwerkraftsiegel: `Game skill icon, 64×64, painterly toon, dark vignette, an amber spiral on a downward-triangle sigil pulling three basalt boulders inward, basalt and amber palette, Western arcane mage magic, flat ground-level effect, no sky.`
- Weltenbruch (Ultimate): `Game skill icon, 64×64, painterly toon, golden frame, a ring of seven basalt monoliths with amber veins tilting inward around a glowing crack, basalt and amber palette, Western arcane mage magic, no rock pillar, no sand.`

## Karte und Wegweiser (Version 8.8)

Regeln und Zeichen stehen in `docs/grafik-prompts.md`, Abschnitt 6.7. Hier die Einzelbilder.

### Große Karte
```
In-game world map screen of a stylized 3D toon fantasy MMORPG, landscape phone format: a wide painted parchment-style map inside a thin brass frame showing a green meadow region with soft blended ground colours, a pale winding dirt road crossing it, small blue ponds with tiny white wave arcs, round tree crowns with dark outlines and a light highlight, grey round rocks, a small walled village in the centre with coloured roof rectangles. On top: small red dots for monsters, larger orange dots for bosses, coloured squares for soul stones, a bright cream arrow for the player with the word "Du", a large green dot with a pulsing ring for a party member, a purple dot for a guild member, light blue dots for other players, golden and green exclamation and question marks above quest givers, a golden map pin with a dashed golden line from the player. Elegant serif zone names with level ranges, a dark header bar with the region name, a small legend row at the bottom. Clean, readable, nothing pixelated.
```

### Minikarte
```
Round minimap HUD element of a stylized 3D toon fantasy MMORPG, top-right corner: a circular painted map inside a brass ring with a small "N" north marker, soft blended grass, a pale path, round tree crowns, tiny red dots for monsters, a golden exclamation mark above a quest giver, a cream player arrow in the centre with a warm glow, a golden triangle on the rim pointing towards the quest target, a green triangle on the rim for a party member outside the view. Crisp at phone size, no pixel blocks.
```

### Goldener Wegpfeil
```
Gameplay close-up, stylized 3D toon MMORPG, top-down three-quarter view: a chibi warrior on a green meadow with a big golden arrow lying on the ground beside him pointing to the upper right, the arrow with a white-to-amber gradient, a dark outline and a soft golden glow, two smaller golden chevrons running in the same direction; small text next to it reads "Wolf · 47 m". In the distance a small golden downward arrow floats above a wolf. Clean shapes, readable on a phone.
```

### Auftragszeichen
```
Set of quest markers for a stylized 3D toon MMORPG, each floating above a villager's head: a golden exclamation mark (new main quest), a green exclamation mark (new side quest), a golden question mark (main quest ready to hand in), a green question mark (side quest ready to hand in). Thick dark outline, soft glow in the same colour, gentle bob, readable from far away, no text.
```

## Inventar und Lager (Version 9.1)

### Lagerverwalter
```
Villager character for a stylized 3D toon fantasy MMORPG, chibi proportions, top-down three-quarter view: a sturdy storekeeper with short brown hair and a short brown beard, brown work jacket with rolled sleeves, a light canvas apron, a ring of brass keys on the belt, holding a small wooden chest with a brass lock. Friendly, readable at phone size, thick dark outlines, no text.
```

### Inventarfenster
```
Mobile game inventory window, dark leather and brass fantasy style, landscape phone format: on the left a framed 3D character portrait standing fully inside the frame (helmet, shoulders, weapon and cape all visible, nothing cut off), next to it a 3 × 3 equipment grid; on the right the bag with three rows of ten square item slots, page tabs I–IV, gold counter at the top. Clean, readable, nothing squeezed.
```

### Lagerfenster
```
Mobile game storage window, dark wood and brass fantasy style: upper part a storage chest grid with three rows of ten slots and page tabs I–VI, lower part the player's bag with the same grid and a button "store whole page"; a few items, stacked skill books with a count number. Clean, readable at phone size.
```

## Schlaganimationen (Version 9.3)

Grundregeln, Tabelle je Waffe und der große Prompt stehen in `docs/grafik-prompts.md`, Abschnitt 8b.

### Einzelbild Schwertkombo
```
Four-panel key pose strip, stylized 3D chibi warrior with sword and round shield, top-down three-quarter view: anticipation with the sword raised high behind the right shoulder and the shield forward, impact with a diagonal slash across the body and the front foot stepping in, follow-through with the blade low on the left and the hips turned, recovery back to a ready stance. Crimson smear trail on impact, thick outlines, toon shading, no text.
```

## Strom der Elemente – Symbol (seit 9.7)

- Strom der Elemente: `Game skill icon, round, painterly toon, dark indigo vignette, a wide water beam shooting diagonally upward, wrapped by three spirals – yellow lightning, orange flame tongues and tumbling rocks – with glowing cracks in the ground below, gold ring frame, no text.`

## Totenruf – Symbol (seit 10.0)

- Totenruf: `Game skill icon, round, painterly toon, dark violet vignette, a tilted gravestone with a glowing green cross on a dirt mound, a pale ghostly wolf head with glowing cyan eyes rising from it with a misty tail, green soul light, gold ring frame, no text.`

