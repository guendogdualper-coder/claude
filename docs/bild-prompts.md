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
