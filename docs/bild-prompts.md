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
2D fantasy MMORPG skill window UI mockup in East Asian style, dark lacquered wood panel with brass borders: a list of five skills with round painted icons; on the right of each row the skill level and rank in colored text: "Stufe 17/17" with a glowing violet button "Erwecken → E1", "Erwacht E5" in ice blue with a button "Buch lesen", "Heroisch H6" in violet, "Legendär L2" in gold, "Vollendet V" in crimson-gold with "Höchste Stufe". In the corner a counter "Fertigkeitsbücher: 4" with a small purple book icon. Below the window the skill buttons around the attack button with ring colors per rank (silver-blue, violet, gold, pulsing crimson-gold) and small level plaques "E5", "H6", "V".
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
Mobile game HUD close-up in landscape, dark fantasy style: five round skill buttons in an arc around a big red attack button; one skill button is lifted and enlarged with a bright white ring and a golden glow, a finger holds it and a dotted arrow shows it being dragged onto another slot, the other skill buttons gently wiggle; a small toast "Dreifachschlag angehoben: auf einen anderen Platz ziehen oder tippen". Clean game UI, bold outlines.
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
