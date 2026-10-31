// Wird vom Wiki-Bauskript (tools/wiki-bauen.js) in die laufende Spielseite geladen. Sammelt alle Inhalte aus den
// Spieldaten und zeichnet die Bilder mit den Zeichenfunktionen des Spiels. Ergebnis: { cats, entries, pages, images }.
// images: { name: dataURL } – das Bauskript speichert sie als wiki/bilder/<name>.png
window.collectWiki = async function () {
  const IMAGES = {};
  const E = [];
  const has = new Set();
  const pic = (name, url) => {
    if (!url) return null;
    IMAGES[name] = url;
    return 'bilder/' + name + '.png';
  };
  const spr = (s) => (s && s.img ? s.img.toDataURL('image/png') : null);
  const add = (e) => {
    if (has.has(e.id)) return null;
    has.add(e.id);
    E.push(e);
    return e;
  };
  const de = (n) => Math.round(n).toLocaleString('de-DE');
  const pc = (v, d = 0) => (v * 100).toFixed(d).replace('.', ',') + ' %';
  const num = (v) => String(Math.round(v * 100) / 100).replace('.', ',');
  const tbl = (head, rows) => `<table class="t"><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const mapById = (id) => WORLD_MAPS.find((m) => m.id === (id || 1)) || WORLD_MAPS[0];
  const zoneMap = (z) => z.map || (z.dungeon && z.dungeon.entry && z.dungeon.entry.map) || 1;
  const monName = (id) => (MONSTER_TYPES[id] ? MONSTER_TYPES[id].name : id);
  const portrait = (kind, id, fallback) => {
    try {
      const u = wikiPortrait3(kind, id, 256);
      if (u) return u;
    } catch (err) { /* manche Figuren haben kein 3D-Modell */ }
    return fallback ? fallback() : null;
  };

  // ============ Klassen, Fertigkeiten, Ultis ============
  const skillWhere = new Map();
  for (const cid of CLASS_ORDER) {
    const c = CLASSES[cid];
    c.paths.forEach((pt, pi) => pt.skills.forEach((sk) => {
      if (!skillWhere.has(sk.id)) skillWhere.set(sk.id, []);
      skillWhere.get(sk.id).push({ cid, pi, pt });
    }));
  }
  const ultOfPath = (pid) => ULTIMATES[pid];
  for (const cid of CLASS_ORDER) {
    const c = CLASSES[cid];
    const hero = newCharacter('Held', cid, 0);
    const img = pic('klasse-' + cid, portrait('player', hero, null));
    const weapons = (CLASS_WEAPON_KINDS[cid] || []).map((k) => WEAPON_KINDS[k].name).join(', ');
    add({
      id: 'klasse/' + cid, cat: 'klasse', name: c.name, img, sub: c.role || '', prio: 30,
      text: c.description,
      facts: [['Leben', `${c.base.hp} (+${c.perLevel.hp} je Stufe)`], ['Mana', `${c.base.mp} (+${c.perLevel.mp} je Stufe)`], ['Angriff', `${c.base.atk} (+${c.perLevel.atk} je Stufe)`],
        ['Rüstung', `${c.base.def} (+${c.perLevel.def} je Stufe)`], ['Kritisch', pc(c.base.crit)], ['Waffen', weapons], ['Grundangriff', c.basic.ranged ? `Fernkampf, Reichweite ${c.basic.range}` : 'Nahkampf'],
        ['Wege', c.paths.map((p) => p.name).join(' · ')]],
      sections: c.paths.map((pt) => ({ title: pt.name + ' – ' + (pt.role || ''), html: `<p>${pt.description || ''}</p>`, chips: pt.skills.map((s) => 'fertigkeit/' + s.id).concat(ultOfPath(pt.id) ? ['ulti/' + ultOfPath(pt.id).id] : []) }))
    });
    await tick();
  }
  const KIND = { angriff: 'Angriff', buff: 'Buff', fluch: 'Fluch', heilung: 'Heilung', 'beschwörung': 'Beschwörung' };
  for (const [sid, where] of skillWhere) {
    const { cid, pt } = where[0];
    const sk = where[0].pt.skills.find((s) => s.id === sid);
    const c = CLASSES[cid];
    let stats = [];
    try { stats = skillStats(sk, 1) || []; } catch (err) { stats = []; }
    const facts = [['Klasse', `[[klasse/${cid}|${c.name}]]`], ['Weg', where.map((w) => w.pt.name).join(', ')], ['Freigeschaltet ab', 'Stufe ' + sk.unlock], ['Art', KIND[sk.kind] || sk.kind],
      ['Mana', String(sk.mp)], ['Abklingzeit', num(sk.cooldown) + ' s']];
    if (sk.range) facts.push(['Reichweite', String(sk.range)]);
    if (sk.radius) facts.push(['Umkreis', String(sk.radius)]);
    if (sk.channel) facts.push(['Bedienung', 'gedrückt halten (kanalisieren)']);
    if (sk.aim) facts.push(['Bedienung', 'Zielort wählen']);
    for (const [k, v] of stats) facts.push([k + ' (Stufe 1)', String(v)]);
    add({
      id: 'fertigkeit/' + sid, cat: 'fertigkeit', group: c.name + ' · ' + pt.name, name: sk.name, img: pic('fertigkeit-' + sid, skillIconUrl(sk)),
      sub: `${c.name} · ${pt.name} · ab Stufe ${sk.unlock}`, text: sk.text, facts, prio: 10,
      tags: 'fertigkeit attacke skill ' + (KIND[sk.kind] || ''),
      sections: [{ title: 'Fertigkeitsbuch', html: `<p><img src="${pic('buch-' + sid, bookIconUrl(sid))}" alt="" style="width:48px;vertical-align:middle"> Mit Fertigkeitsbüchern steigerst du die Fertigkeit über die Ränge (siehe [[system/raenge|Ränge und Erwecken]]). Bücher bekommst du beim [[npc/lehrmeister|Lehrmeister]], beim [[npc/alchemist|Alchemisten]], aus Hauptquests, der Tagesbelohnung und als Fertigkeitsschriftrolle aus [[kat/stein|Seelensteinen]] ab Stufe 40.</p>` }]
    });
  }
  for (const [pid, u] of Object.entries(ULTIMATES)) {
    let cls = null;
    let path = null;
    for (const cid of CLASS_ORDER) CLASSES[cid].paths.forEach((p) => { if (p.id === pid) { cls = cid; path = p; } });
    if (!cls) continue;
    add({
      id: 'ulti/' + u.id, cat: 'fertigkeit', group: 'Ultimative Attacken', name: u.name, img: pic('ulti-' + u.id, skillIconUrl(u)), prio: 12,
      sub: `Ulti · ${CLASSES[cls].name} · ${path.name}`, text: u.text, badges: [['ULTI', 'boss']], tags: 'ultimative attacke ulti',
      facts: [['Klasse', `[[klasse/${cls}|${CLASSES[cls].name}]]`], ['Weg', path.name], ['Ab Stufe', String(u.unlock || 30)], ['Abklingzeit', '3 Minuten'], ['Werte', u.stats || '–'], ['Taste', 'Ulti-Knopf über dem Angriff · am PC Taste 6']]
    });
  }
  await tick();

  console.log('[wiki] Monster (mit 3D-Bild)');
  // ============ Monster (mit 3D-Bild) ============
  const monImg = {};
  const ids = Object.keys(MONSTER_TYPES);
  for (const id of ids) {
    monImg[id] = pic('monster-' + id, portrait('monster', id, () => spr(monsterSprite(id, 0))));
    await tick();
  }
  const dungeonOfZone = (z) => z.dungeon;
  const usedForTiers = (id) => UPGRADE_MAT_MONSTERS.map((l, t) => (l.includes(id) ? t : -1)).filter((t) => t >= 0);
  for (const id of ids) {
    const t = MONSTER_TYPES[id];
    if (id === 'raidkristall') continue;
    const st = monsterStats(t.level, t.hpMul || 1, t.atkMul || 1);
    const places = monsterPlaces(id);
    const chips = [];
    for (const z of places) {
      const d = dungeonOfZone(z);
      chips.push(d ? 'dungeon/' + d.id : z.safe ? 'karte/' + zoneMap(z) : 'gebiet/' + z.id);
    }
    const kind = t.raidBoss ? 'Endboss' : t.boss ? 'Dungeon-Boss' : t.dungeon ? 'Dungeon-Monster' : 'Monster';
    const firstMap = places.length ? mapById(zoneMap(places[0])).name : '';
    const group = t.raidBoss ? 'Endbosse' : t.boss ? 'Dungeon-Bosse' : firstMap;
    const sections = [];
    if (chips.length) sections.push({ title: 'Hier zu finden', chips });
    const drops = [];
    if (MOB_MATS[id]) drops.push(`[[teil/${id}|${MOB_MATS[id].name}]] – ${pc(MOB_MAT_CHANCE)} je Kill (${pc(SIDE_DROP)}, solange ein Wanderer dieses Teil sammeln lässt)`);
    drops.push(`Gold ${st.gold[0]}–${st.gold[1]} · ${de(st.xp)} EP`);
    if (!t.boss && !t.raidBoss) drops.push('Ausrüstung mit 2,5 % Chance, Seelensplitter und Tränke');
    if (t.boss && !t.raidBoss) drops.push('Boss-Beute: 2 Gegenstände +3 bis +6, 3–5 Monster-Teile, Boni-Plus, Switcher, mit Glück Boni-5 und Stern, Gold = Stufe × 300');
    if (t.raidBoss) drops.push('Endboss-Beute: 3 legendäre Gegenstände deiner Klasse (+0, 4 Boni), 8–12 Monster-Teile, viele Materialien (ab Stufe 30 auch Switcher 6/7), Gold = Stufe × 1.500');
    sections.push({ title: 'Beute', html: '<ul>' + drops.map((d) => `<li>${d}</li>`).join('') + '</ul>' });
    const tiers = usedForTiers(id);
    if (tiers.length && MOB_MATS[id]) sections.push({ title: 'Gebraucht beim Schmied', html: `<p>${MOB_MATS[id].name} braucht der [[npc/schmied|Schmied]] zum Aufwerten von Ausrüstung der Stufen: ${tiers.map((k) => ITEM_TIERS[k].label).join(', ')} (ab +${upgradeMatStart(tiers[0])}).</p>` });
    const quests = MAIN_QUESTS.filter((q) => q.goal.type === 'kill' && q.goal.monster === id).map((q) => 'quest/' + q.id);
    if (quests.length) sections.push({ title: 'Quests', chips: quests });
    const badges = [['Stufe ' + t.level, 'lv']];
    if (t.boss || t.raidBoss) badges.push([t.raidBoss ? 'ENDBOSS' : 'BOSS', 'boss']);
    add({
      id: 'monster/' + id, cat: 'monster', group, name: t.name, img: monImg[id], badges,
      sub: `${kind} · Stufe ${t.level}${places.length ? ' · ' + zonePlaceText(places[0]) : ''}`,
      answer: places.length ? 'Fundort: ' + places.slice(0, 2).map(zonePlaceText).join(' oder ') : '',
      facts: [['Stufe', String(t.level)], ['Leben', de(st.maxHp)], ['Angriff', de(st.atk)], ['Rüstung', de(st.def)], ['Erfahrung', de(st.xp)], ['Gold', `${st.gold[0]}–${st.gold[1]}`],
        ['Verhalten', t.aggressive ? 'greift an (bis 10 Stufen unter dir)' : 'friedlich, bis man angreift'], ['Kampf', t.ranged ? 'Fernkampf' : 'Nahkampf']],
      sections, prio: t.raidBoss ? 8 : t.boss ? 6 : 0, tags: 'monster gegner ' + kind
    });
  }
  await tick();

  console.log('[wiki] Seelensteine');
  // ============ Seelensteine ============
  for (const type of STONE_TYPES) {
    const L = type.level;
    const d = stoneDrops(type);
    const st = monsterStats(L, STONE.hpMul, 1);
    const zs = ZONES.filter((z) => (z.stones && z.stones.some((s) => s[0] === L)) || (z.dungeon && z.dungeon.stones.includes(L)));
    const MATN = Object.fromEntries(MATERIALS.map((m) => [m.id, m.name]));
    const matRows = Object.entries(d.mats || {}).map(([k, v]) => [`[[material/${k}|${MATN[k] || k}]]`, pc(v[0]), v[1] === v[2] ? String(v[1]) : `${v[1]}–${v[2]}`]);
    const extra = [];
    if (L >= SKILL_SCROLL_STONE) extra.push(`Fertigkeitsschriftrolle deiner Klasse: ${pc(0.22 + (L - 40) * 0.005, 1)}`);
    if (L >= BLESSING.stone) extra.push(`Segensschriftrolle: ${pc(d.scroll || 0)}`);
    if (d.gear) extra.push(`Ausrüstung: ${pc(d.gear)}${d.plus ? `, +${d.plus[0]} bis +${d.plus[1]}` : ''}`);
    if (d.splinters) extra.push(`Seelensplitter: ${d.splinters[0]}–${d.splinters[1]}`);
    if (d.potions) extra.push(`Tränke: ${d.potions[0]}–${d.potions[1]}`);
    add({
      id: 'stein/' + L, cat: 'stein', name: type.name, img: pic('stein-' + L, spr(stoneSprite(type))), badges: [['Stufe ' + L, 'lv']], prio: 5,
      sub: `Seelenstein Stufe ${L} · ${type.drop}`, answer: `Stufe ${L} · lässt fallen: ${type.drop}${zs.length ? ' · ' + zonePlaceText(zs[0]) : ''}`,
      text: `Seelensteine stehen in den Jagdgebieten und Dungeons. Greifst du einen an, ruft er in Wellen Monster herbei. Zerstörst du ihn, gibt es viel Erfahrung, Gold und Beute. Steine, die 15 oder mehr Stufen unter dir liegen, lassen nichts mehr fallen.`,
      facts: [['Stufe', String(L)], ['Leben', de(st.maxHp)], ['Schwerpunkt', type.drop], ['Wiederkehr', '10–15 Minuten']],
      sections: [{ title: 'Beute', html: (matRows.length ? tbl(['Material', 'Chance', 'Anzahl'], matRows) : '') + '<ul>' + extra.map((x) => `<li>${x}</li>`).join('') + '</ul>' },
        { title: 'Hier zu finden', chips: zs.map((z) => (z.dungeon ? 'dungeon/' + z.dungeon.id : 'gebiet/' + z.id)) }],
      tags: 'seelenstein metin stein buch schriftrolle'
    });
  }
  await tick();

  console.log('[wiki] Karten und Jagdgebiete');
  // ============ Karten und Jagdgebiete ============
  for (const wm of WORLD_MAPS) {
    let mimg = null;
    try {
      const [x, y, w, h] = wm.region;
      const art = buildMapArt({ key: 'wiki' + wm.id, x, y, w, h, wm, dungeon: -1 }, 2);
      const c = document.createElement('canvas');
      const k = 1100 / Math.max(art.width, art.height);
      c.width = Math.round(art.width * k);
      c.height = Math.round(art.height * k);
      const cx = c.getContext('2d');
      cx.imageSmoothingQuality = 'high';
      cx.drawImage(art, 0, 0, c.width, c.height);
      // Markierungen: Dungeon-Eingänge und das Lager
      cx.font = '700 22px sans-serif';
      cx.textAlign = 'center';
      const mark = (px, py, col, label) => {
        const mx = (px / TILE - x) / w * c.width;
        const my = (py / TILE - y) / h * c.height;
        cx.fillStyle = col;
        cx.strokeStyle = '#000';
        cx.lineWidth = 2;
        cx.beginPath();
        cx.arc(mx, my, 10, 0, Math.PI * 2);
        cx.fill();
        cx.stroke();
        cx.lineWidth = 4;
        cx.strokeText(label, mx, my - 16);
        cx.fillStyle = '#fff';
        cx.fillText(label, mx, my - 16);
      };
      for (const dg of game.world.dungeons) if (dg.entrance && mapOfTile(Math.floor(dg.entrance.x / TILE), Math.floor(dg.entrance.y / TILE)) === wm) mark(dg.entrance.x, dg.entrance.y, dg.def.raid ? '#ff5a5a' : '#c58cff', dg.def.name);
      mark(wm.cx * TILE, wm.cy * TILE, '#ffd34d', wm.id === 1 ? 'Vlotho' : 'Lager');
      mimg = c.toDataURL('image/png');
    } catch (err) { mimg = null; }
    const zones = ZONES.filter((z) => !z.dungeon && zoneMap(z) === wm.id);
    const camp = zones.find((z) => z.safe);
    const hunt = zones.filter((z) => !z.safe);
    const mons = [...new Set(hunt.flatMap((z) => (z.groups || []).map((g) => g[0])))];
    const stones = [...new Set(hunt.flatMap((z) => (z.stones || []).map((s) => s[0])))].sort((a, b) => a - b);
    const dgs = DUNGEONS.filter((d) => (d.entry.map || 1) === wm.id);
    const npcs = game.world.npcs.filter((n) => npcMapId(n) === wm.id && n.id !== 'wache' && !n.wander && n.id !== 'eingang' && n.id !== 'ausgang');
    add({
      id: 'karte/' + wm.id, cat: 'karte', group: 'Maps', name: wm.name, img: pic('karte-' + wm.id, mimg), badges: [[wm.levels, 'lv']], prio: 20,
      sub: `${wm.levels} · ${camp ? camp.name : ''}`, text: wm.text, answer: `${wm.levels}${camp ? ' · Lager/Stadt: ' + camp.name : ''}`,
      facts: [['Stufen', wm.levels], ['Weltentor', 'ab Stufe ' + wm.minLevel], ['Lager / Stadt', camp ? camp.name : '–'], ['Jagdgebiete', String(hunt.length)], ['Dungeons', String(dgs.filter((d) => !d.raid).length)]],
      sections: [
        { title: 'Karte', html: mimg ? `<img class="mapimg" src="bilder/karte-${wm.id}.png" alt="Karte ${wm.name}"><p class="dim">Gelb: Lager bzw. Stadt · Violett: Dungeon-Eingänge · Rot: Endboss-Halle</p>` : '' },
        { title: 'Jagdgebiete', chips: hunt.map((z) => 'gebiet/' + z.id) },
        { title: 'Monster', chips: mons.map((m) => 'monster/' + m) },
        { title: 'Seelensteine', chips: stones.map((s) => 'stein/' + s) },
        { title: 'Dungeons und Endboss', chips: dgs.map((d) => 'dungeon/' + d.id) },
        { title: 'NPCs im Lager', html: tbl(['Name', 'Aufgabe'], npcs.map((n) => [n.name, n.id === 'wanderer' ? `[[npc/wanderer|Wanderer]]` : `[[npc/${n.id}|${NPC_ROLE[n.id] || n.id}]]`])) }
      ],
      tags: 'karte map gebiet ' + (camp ? camp.name : '')
    });
    for (const z of hunt) {
      const zm = [...new Set((z.groups || []).map((g) => g[0]))];
      add({
        id: 'gebiet/' + z.id, cat: 'karte', group: 'Jagdgebiete', name: z.name, img: zm.length ? monImg[zm[0]] : null, badges: [[z.levels || '', 'lv']],
        sub: `${z.levels || ''} · Map ${wm.name}`, answer: `${z.levels || ''} · liegt auf der Map ${wm.name}`,
        text: `Jagdgebiet auf der Map [[karte/${wm.id}|${wm.name}]]. Je weiter du vom Lager weggehst, desto stärker werden die Monster.`,
        facts: [['Stufen', z.levels || '–'], ['Map', `[[karte/${wm.id}|${wm.name}]]`], ['Gruppen', `${(z.groupSize || [3, 4])[0]}–${(z.groupSize || [3, 4])[1]} Monster`]],
        sections: [{ title: 'Monster', chips: zm.map((m) => 'monster/' + m) }, { title: 'Seelensteine', chips: [...new Set((z.stones || []).map((s) => s[0]))].map((s) => 'stein/' + s) }],
        tags: 'jagdgebiet zone gebiet farmen'
      });
    }
    await tick();
  }

  console.log('[wiki] Dungeons und Endbosse');
  // ============ Dungeons und Endbosse ============
  for (const d of DUNGEONS) {
    const wm = mapById(d.entry.map || 1);
    const boss = MONSTER_TYPES[d.boss];
    const raid = d.raid;
    const sections = [];
    if (d.boss) sections.push({ title: raid ? 'Endboss' : 'Boss', chips: ['monster/' + d.boss] });
    if (d.mobs && d.mobs.length) sections.push({ title: 'Monster', chips: d.mobs.map((m) => 'monster/' + m) });
    if (d.stones && d.stones.length) sections.push({ title: 'Seelensteine', chips: [...new Set(d.stones)].map((s) => 'stein/' + s) });
    const text = raid
      ? `Endboss-Halle auf der Map [[karte/${wm.id}|${wm.name}]] – gedacht für eine Gruppe bis 5 Spieler. Der Endboss schützt sich mit einem Kristallschild (erst die Kristalle zerstören) und setzt die Vernichtung ein: Stell dich rechtzeitig in die grünen Lichtkreise. Beute: drei legendäre Gegenstände deiner Klasse, Monster-Teile und viele Materialien. Wiederkehr nach 15 Minuten.`
      : `Dungeon auf der Map [[karte/${wm.id}|${wm.name}]]. Der Eingang liegt außerhalb des Lagers; in den Räumen warten Monstergruppen und zwei Seelensteine, im letzten Raum der Boss (kehrt nach 10 Minuten zurück). Allein oder mit der Gruppe.`;
    add({
      id: 'dungeon/' + d.id, cat: 'dungeon', group: raid ? 'Endboss-Hallen' : 'Dungeons', name: d.name, img: d.boss ? monImg[d.boss] : null, badges: [['ab Stufe ' + d.minLevel, 'lv']].concat(raid ? [['ENDBOSS', 'boss']] : []),
      sub: `${raid ? 'Endboss' : 'Dungeon'} · ab Stufe ${d.minLevel} · Map ${wm.name}`, answer: `ab Stufe ${d.minLevel} · Eingang auf der Map ${wm.name}${boss ? ' · Boss ' + boss.name : ''}`, text,
      facts: [['Ab Stufe', String(d.minLevel)], ['Map', `[[karte/${wm.id}|${wm.name}]]`], ['Boss', boss ? `[[monster/${d.boss}|${boss.name}]] (Stufe ${boss.level})` : '–']],
      sections, prio: 8, tags: 'dungeon höhle boss raid endboss halle'
    });
  }
  await tick();

  console.log('[wiki] Ausrüstung');
  // ============ Ausrüstung ============
  const tierRange = (t) => `${ITEM_TIERS[t].level}${ITEM_TIERS[t + 1] ? '–' + (ITEM_TIERS[t + 1].level - 1) : '+'}`;
  const sources = (item) => {
    const t = item.tier;
    const out = [];
    const m = MERCHANTS.waffen.slots.includes(item.slot) ? MERCHANTS.waffen : MERCHANTS.ruestung.slots.includes(item.slot) ? MERCHANTS.ruestung : null;
    if (m && t <= 3) out.push(`${m === MERCHANTS.waffen ? '[[npc/waffen|Waffenhändler]]' : '[[npc/ruestung|Rüstungshändler]]'} für ${de(m.prices[t])} Gold`);
    out.push(`Beute von Monstern der Stufe ${tierRange(t)} (2,5 %)`);
    if (ITEM_TIERS[t].level >= 20) out.push(`Seelensteine ab Stufe ${Math.max(5, ITEM_TIERS[t].level - 10)}`);
    out.push('Bosse und Endbosse (höhere Stufen, mit Plus)');
    return out;
  };
  const slotName = Object.fromEntries(EQUIP_SLOTS.map((s) => [s.id, s.name]));
  const addItem = (slot, t, cls, kind, groupName) => {
    const item = makeItem(slot, t, 0, cls, kind);
    const nm = itemName(item);
    const id = `gegenstand/${slot}-${cls || ''}${kind ? '-' + kind : ''}-${t}`;
    const stats = sortedStats(itemStats(item, 0)).map(([k, v]) => statText(k, v));
    const src = sources(item);
    add({
      id, cat: 'gegenstand', group: groupName, name: nm, img: pic(id.replace(/\//g, '-'), itemIconUrl(item)), badges: [[ITEM_TIERS[t].label, 'lv']],
      sub: `${slotName[slot]}${cls && slot !== 'schild' ? ' · ' + CLASSES[cls].name : ''} · ab Stufe ${itemLevelReq(item)}`,
      answer: `${slotName[slot]} · ${ITEM_TIERS[t].label} · ab Stufe ${itemLevelReq(item)} · ${src[0].replace(/\[\[[^|]+\|([^\]]+)\]\]/g, '$1')}`,
      facts: [['Platz', slotName[slot]], ['Qualität', ITEM_TIERS[t].label], ['Tragen ab', 'Stufe ' + itemLevelReq(item)]].concat(cls && slot !== 'schild' ? [['Klasse', `[[klasse/${cls}|${CLASSES[cls].name}]]`]] : []).concat(kind ? [['Waffenart', WEAPON_KINDS[kind].name]] : []).concat(stats.map((s) => ['Wert (+0)', s])),
      sections: [{ title: 'So bekommst du es', html: '<ul>' + src.map((s) => `<li>${s}</li>`).join('') + '</ul>' }, { title: 'Aufwerten', html: '<p>Beim [[npc/schmied|Schmied]] von +0 bis +20 – siehe [[system/schmied|Schmied und Aufwertung]]. Boni bringst du mit [[material/boniPlus|Boni-Plus]], [[material/switcher|Switcher]] und Co. auf die Ausrüstung.</p>' }],
      tags: 'ausrüstung gegenstand item ' + slotName[slot] + (kind ? ' ' + WEAPON_KINDS[kind].name : '')
    });
  };
  for (const s of EQUIP_SLOTS) {
    for (let t = 0; t < ITEM_TIERS.length; t++) {
      if (s.id === 'waffe') {
        for (const cid of CLASS_ORDER) for (const kind of CLASS_WEAPON_KINDS[cid] || []) addItem('waffe', t, cid, kind, 'Waffen · ' + WEAPON_KINDS[kind].name);
      } else if (CLASS_SLOTS.includes(s.id)) {
        for (const cid of CLASS_ORDER) addItem(s.id, t, cid, null, s.name + ' · ' + CLASSES[cid].name);
      } else addItem(s.id, t, s.id === 'schild' ? 'krieger' : null, null, s.name);
    }
    await tick();
  }
  for (const [k, w] of Object.entries(WEAPON_KINDS)) {
    // Waffenarten als eigene Einträge für die Suche („Bogen“, „Zweihänder“)
    const item = makeItem('waffe', 4, 0, w.cls, k);
    add({
      id: 'waffenart/' + k, cat: 'gegenstand', group: 'Waffenarten', name: w.name, img: pic('waffenart-' + k, itemIconUrl(item)), prio: 6,
      sub: `Waffe für ${CLASSES[w.cls].name}${w.twoHanded ? ' · zweihändig' : ''}`, text: w.text,
      facts: [['Klasse', `[[klasse/${w.cls}|${CLASSES[w.cls].name}]]`], ['Angriff', '× ' + num(w.atkMul)], ['Angriffstempo', (w.atkSpeed >= 0 ? '+' : '−') + pc(Math.abs(w.atkSpeed))]].concat(w.ranged ? [['Kampf', 'Fernkampf']] : []).concat(w.path != null ? [['Nur Weg', CLASSES[w.cls].paths[w.path].name]] : []),
      sections: [{ title: 'Alle Stufen', chips: ITEM_TIERS.map((_, t) => `gegenstand/waffe-${w.cls}-${k}-${t}`) }], tags: 'waffe waffenart'
    });
  }

  console.log('[wiki] Materialien, Monster-Teile, Verbrauchsgüter');
  // ============ Materialien, Monster-Teile, Verbrauchsgüter ============
  const alch = Object.fromEntries(ALCHEMIST_WARES.map((w) => [w.id, w.price]));
  for (const m of MATERIALS) {
    const stones = STONE_TYPES.filter((s) => (stoneDrops(s).mats || {})[m.id]).map((s) => 'stein/' + s.level);
    const quests = MAIN_QUESTS.filter((q) => q.reward && q.reward.mats && q.reward.mats[m.id]).map((q) => 'quest/' + q.id);
    const src = [];
    if (alch[m.id]) src.push(`[[npc/alchemist|Alchemist]] für ${de(alch[m.id])} Gold`);
    if (stones.length) src.push('Seelensteine (siehe unten)');
    src.push('Bosse und Endbosse');
    if (m.id === 'boniPlus' || m.id === 'switcher') src.push('Jagdaufträge der [[npc/jaegerin|Jägerin]]');
    if (quests.length) src.push('Belohnung einiger Hauptquests');
    add({
      id: 'material/' + m.id, cat: 'material', group: 'Boni-Materialien', name: m.name, img: pic('material-' + m.id, materialIconUrl(m.id)), prio: 9,
      sub: m.tag || '', text: m.text, answer: src.map((s) => s.replace(/\[\[[^|]+\|([^\]]+)\]\]/g, '$1')).join(' · '),
      sections: [{ title: 'So bekommst du es', html: '<ul>' + src.map((s) => `<li>${s}</li>`).join('') + '</ul>' }, { title: 'Seelensteine', chips: stones }, { title: 'Quests', chips: quests.slice(0, 12) }],
      tags: 'material boni bonus ' + m.id
    });
  }
  for (const [mid, mm] of Object.entries(MOB_MATS)) {
    const tiers = usedForTiers(mid);
    add({
      id: 'teil/' + mid, cat: 'material', group: 'Monster-Teile', name: mm.name, img: pic('teil-' + mid, mobMatIconUrl(mid)),
      sub: `von ${monName(mid)} · ${pc(MOB_MAT_CHANCE)} je Kill`, answer: `fällt von ${monName(mid)} (${monsterWhere(mid)})`,
      text: `Monster-Teil vom [[monster/${mid}|${monName(mid)}]]. Der [[npc/schmied|Schmied]] braucht es zum Aufwerten.`,
      facts: [['Monster', `[[monster/${mid}|${monName(mid)}]]`], ['Fundort', monsterWhere(mid)], ['Chance', `${pc(MOB_MAT_CHANCE)} je Kill, ${pc(SIDE_DROP)} mit Wanderer-Auftrag`]].concat(tiers.length ? [['Für Ausrüstung', tiers.map((t) => ITEM_TIERS[t].label).join(', ')]] : []),
      tags: 'monster teil material schmied aufwerten farmen'
    });
  }
  add({
    id: 'material/splitter', cat: 'material', group: 'Boni-Materialien', name: 'Seelensplitter', img: pic('material-splitter', lootIconUrl('splinter')), prio: 9,
    sub: 'Zum Aufwerten beim Schmied', text: 'Seelensplitter braucht der [[npc/schmied|Schmied]] bei jedem Aufwertungsschritt (zusammen mit Gold). Sie fallen von Monstern und vor allem aus [[kat/stein|Seelensteinen]].',
    answer: 'Monster und Seelensteine · gebraucht beim Schmied', tags: 'splitter seelensplitter aufwerten'
  });
  for (const kind of ['hp', 'mp']) {
    for (const sz of POTION_SIZES) {
      const base = SHOP.find((s) => s.id === kind) || { name: kind, price: 0 };
      add({
        id: `verbrauch/${kind}-${sz.id}`, cat: 'verbrauch', group: kind === 'hp' ? 'Lebenstränke' : 'Manatränke', name: `${base.name} ${sz.id}`, img: pic(`trank-${kind}-${sz.id}`, potionIconUrl(kind, sz.id)),
        sub: `${kind === 'hp' ? '+' + de(sz.hp) + ' Leben' : '+' + de(sz.mp) + ' Mana'} · ab Stufe ${sz.level}`, answer: `[[npc/haendler|Händlerin]] · ${de(base.price * sz.price)} Gold`,
        facts: [['Wirkung', kind === 'hp' ? `+${de(sz.hp)} Leben` : `+${de(sz.mp)} Mana`], ['Preis', de(base.price * sz.price) + ' Gold'], ['Ab Stufe', String(sz.level)], ['Taste', kind === 'hp' ? 'Q' : 'E'], ['Abklingzeit', '3 s']],
        text: 'Gibt es bei der [[npc/haendler|Händlerin]] in jedem Lager. Monster und Seelensteine lassen Tränke in der passenden Größe fallen. Händler kaufen Tränke für 40 % zurück.', tags: 'trank heiltrank manatrank potion'
      });
    }
  }
  add({
    id: 'verbrauch/segen', cat: 'verbrauch', group: 'Schriftrollen', name: BLESSING.name, img: pic('segen', scrollIconUrl()), prio: 9,
    sub: 'Schützt beim Aufwerten vor dem Bruch', text: BLESSING.text + ` Nur aus [[kat/stein|Seelensteinen]] ab Stufe ${BLESSING.stone}.`,
    answer: `Seelensteine ab Stufe ${BLESSING.stone} · schützt beim Schmied vor dem Bruch`, tags: 'segen segensschriftrolle schmied bruch'
  });
  add({
    id: 'verbrauch/buch', cat: 'verbrauch', group: 'Schriftrollen', name: 'Fertigkeitsbuch / Fertigkeitsschriftrolle', img: pic('buch', lootIconUrl('book')), prio: 15,
    sub: 'Steigert Fertigkeiten über die Ränge', text: `Fertigkeitsbücher brauchst du, um Fertigkeiten nach dem Erwecken (E1) weiter zu steigern – siehe [[system/raenge|Ränge und Erwecken]].`,
    answer: 'Lehrmeister (100.000 Gold) · Alchemist (40.000 Gold, zufällig) · Seelensteine ab Stufe 40 · Hauptquests · Tagesbelohnung',
    sections: [{ title: 'So bekommst du sie', html: `<ul><li>[[npc/lehrmeister|Lehrmeister]]: gezielt jedes Buch deiner Klasse für ${de(TEACHER.bookPrice)} Gold</li><li>[[npc/alchemist|Alchemist]]: zufälliges Buch deiner Klasse für ${de(alch.book || 40000)} Gold</li><li>[[kat/stein|Seelensteine]] ab Stufe ${SKILL_SCROLL_STONE}: Fertigkeitsschriftrollen deiner Klasse</li><li>Belohnungen aus Hauptquests und der [[system/tagesbelohnung|Tagesbelohnung]]</li><li>Handel mit anderen Spielern</li></ul>` }],
    tags: 'buch bücher fertigkeitsbuch schriftrolle skill buch'
  });
  await tick();

  console.log('[wiki] NPCs');
  // ============ NPCs ============
  const ROLE_TEXT = {
    haendler: `Verkauft Lebens- und Manatränke (S bis XXL) und kauft Gegenstände an.`,
    schmied: `Wertet Ausrüstung von +0 bis +20 auf (Gold, Seelensplitter, ab +4/+6 Monster-Teile). Bis +6 sicher, ab +7 kann der Gegenstand brechen – die [[verbrauch/segen|Segensschriftrolle]] schützt.`,
    waffen: `Verkauft Waffen der ersten vier Stufen. Hier lernt der Weg der Klinge ab Stufe 30 das Kämpfen mit zwei Waffen (${de(DUAL_WIELD.price)} Gold).`,
    ruestung: `Verkauft Rüstung, Helme, Schultern, Umhänge, Schilde, Schuhe und Gürtel der ersten vier Stufen.`,
    aeltester: `Gibt dir die goldene Hauptquest der Map. Kapitel für Kapitel bis zum Finale gegen alle Endbosse.`,
    jaegerin: `Gibt Jagdaufträge: 15, 20 oder 25 Monster einer Art besiegen – Gold, Erfahrung und Boni-Plus oder Switcher.`,
    teleport: `Bringt dich gegen Gold zu den Jagdgebieten der Ringzonen (Preis = Mindeststufe × 25).`,
    alchemist: `Verkauft Materialien: ${ALCHEMIST_WARES.map((w) => `${w.id === 'book' ? 'Fertigkeitsbuch' : (MATERIALS.find((m) => m.id === w.id) || { name: w.id }).name} ${de(w.price)} Gold`).join(', ')}.`,
    stallmeister: `Gibt ab Stufe ${STABLE_QUEST.minLevel} die Pferde-Mission (${STABLE_QUEST.count} Monster in ${STABLE_QUEST.time / 60} Minuten) – Belohnung: Reitpferd. Ab Stufe 40 gibt es das Kriegsross für ${de(HORSES[2].price)} Gold.`,
    lehrmeister: `Verkauft jedes Fertigkeitsbuch deiner Klasse für ${de(TEACHER.bookPrice)} Gold, setzt Status- oder Fertigkeitspunkte zurück und wechselt deinen Weg (Kosten ab ${de(TEACHER.resetBase)} Gold, verdoppeln sich jedes Mal).`,
    lager: `Öffnet dein Lager: ${STORAGE.page * STORAGE.pages} Plätze, einmalig ${de(STORAGE.price)} Gold, gemeinsam in allen Städten.`,
    weltentor: `Bringt dich kostenlos auf jede Map, deren Mindeststufe du erreicht hast.`
  };
  const roles = {};
  for (const n of game.world.npcs) {
    if (!ROLE_TEXT[n.id]) continue;
    (roles[n.id] = roles[n.id] || []).push(n);
  }
  for (const [rid, list] of Object.entries(roles)) {
    const img = pic('npc-' + rid, portrait('npc', rid, () => spr(npcSprite(rid))));
    add({
      id: 'npc/' + rid, cat: 'npc', name: NPC_ROLE[rid], img, prio: 14, sub: `in jedem Lager · z. B. ${list[0].name}`,
      text: ROLE_TEXT[rid], answer: ROLE_TEXT[rid].replace(/\[\[[^|]+\|([^\]]+)\]\]/g, '$1'),
      sections: [{ title: 'Wo', html: tbl(['Map', 'Name'], list.map((n) => [`[[karte/${npcMapId(n)}|${mapById(npcMapId(n)).name}]]`, n.name])) }],
      tags: 'npc ' + list.map((n) => n.name).join(' ')
    });
    await tick();
  }
  const wand = game.world.npcs.filter((n) => n.id === 'wanderer');
  add({
    id: 'npc/wanderer', cat: 'npc', name: 'Wanderer', img: pic('npc-wanderer', portrait('npc', 'moench', () => spr(npcSprite('moench')))), prio: 10,
    sub: `${wand.length} Wanderer mit Nebenaufgaben`, text: `Auf jeder Map ziehen drei Wanderer umher. Sie geben Nebenaufgaben: ${SIDE_KILL} Monster besiegen oder ${SIDE_COLLECT} Monster-Teile sammeln (solange die Aufgabe läuft, fallen die Teile mit ${pc(SIDE_DROP)}). Belohnung: Gold (Monsterstufe × 45), zwei Tränke und Erfahrung.`,
    sections: [{ title: 'Alle Wanderer', html: tbl(['Name', 'Map', 'Aufgabe'], wand.map((n) => [n.name, `[[karte/${npcMapId(n)}|${mapById(npcMapId(n)).name}]]`, n.side ? `${n.side.kind === 'kill' ? 'besiegen' : 'sammeln'}: [[monster/${n.side.monster}|${monName(n.side.monster)}]]` : '–'])) }],
    tags: 'wanderer nebenaufgabe nebenquest ' + wand.map((n) => n.name).join(' ')
  });

  console.log('[wiki] Quests');
  // ============ Quests ============
  const MATN = Object.fromEntries(MATERIALS.map((m) => [m.id, m.name]));
  const rewardText = (r) => {
    const out = [];
    if (r.gold) out.push(de(r.gold) + ' Gold');
    if (r.potions) out.push(r.potions + ' Tränke');
    for (const [slot, tier, plus] of r.items || []) out.push(`${slotName[slot]} (${ITEM_TIERS[tier].label}) +${plus}`);
    for (const [k, v] of Object.entries(r.mats || {})) out.push(`${v} × [[material/${k}|${MATN[k] || k}]]`);
    if (r.books) out.push(r.books + ' Fertigkeitsbuch' + (r.books > 1 ? 'er' : ''));
    if (r.horse) out.push('ein Reitpferd');
    return out.join(' · ');
  };
  for (const q of MAIN_QUESTS) {
    const g = q.goal;
    const img = g.type === 'kill' ? monImg[g.monster] : g.type === 'stone' ? 'bilder/stein-' + g.level + '.png' : g.type === 'raids' ? monImg[RAID_BOSSES[RAID_BOSSES.length - 1]] : 'bilder/npc-aeltester.png';
    let goal = '';
    try { goal = goalText(g); } catch (err) { goal = g.type; }
    const link = g.type === 'kill' ? [`monster/${g.monster}`] : g.type === 'stone' ? [`stein/${g.level}`] : [];
    add({
      id: 'quest/' + q.id, cat: 'quest', group: `Kapitel ${q.chapter + 1} · ${q.chapterTitle} (${mapById(q.map).name})`, name: q.title, img, badges: [['Stufe ' + q.level, 'lv']],
      sub: goal, text: q.text, answer: goal,
      facts: [['Ab Stufe', String(q.level)], ['Ziel', goal], ['Map', `[[karte/${q.map}|${mapById(q.map).name}]]`], ['Belohnung', rewardText(q.reward || {})], ['Erfahrung', de(questXp(q.level, QUEST_XP[g.type] || 0.2))]],
      sections: link.length ? [{ title: 'Ziel', chips: link }] : [], tags: 'quest hauptquest auftrag mission ' + q.chapterTitle
    });
  }
  add({
    id: 'quest/stall', cat: 'quest', group: 'Besondere Missionen', name: STABLE_QUEST.title, img: 'bilder/npc-stallmeister.png', badges: [['Stufe ' + STABLE_QUEST.minLevel, 'lv']], prio: 12,
    sub: `${STABLE_QUEST.count} Monster in ${STABLE_QUEST.time / 60} Minuten · Belohnung Pferd`, text: STABLE_QUEST.text, answer: `beim Stallmeister ab Stufe ${STABLE_QUEST.minLevel} · Belohnung: Reitpferd`,
    facts: [['Ab Stufe', String(STABLE_QUEST.minLevel)], ['Ziel', `${STABLE_QUEST.count} Monster in ${STABLE_QUEST.time / 60} Minuten`], ['Belohnung', rewardText(STABLE_QUEST.reward)], ['NPC', '[[npc/stallmeister|Stallmeister]]']],
    tags: 'pferd reitpferd mission stallmeister'
  });
  await tick();

  console.log('[wiki] Systeme');
  // ============ Systeme ============
  const sys = (id, name, sub, html, img, tags) => add({ id: 'system/' + id, cat: 'system', name, sub, text: '', sections: [{ title: '', html }], img, prio: 16, tags, answer: sub });
  sys('steuerung', 'Steuerung', 'Tasten am PC und Bedienung am Handy',
    `<h3>PC</h3>${tbl(['Aktion', 'Taste'], KEY_ACTIONS.map((a) => [a.label, `<kbd>${keyLabel(a.key)}</kbd>`]).concat([['Laufen', '<kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> oder Pfeiltasten / Klick auf den Boden'], ['Fenster schließen', '<kbd>Esc</kbd>']]))}<p>Alle Tasten kannst du in den Einstellungen ändern.</p><h3>Handy</h3><p>Links der Steuerkreis zum Laufen, rechts der große Angriffsknopf (gedrückt halten greift weiter an), daneben die Fertigkeiten. Fertigkeiten mit Zielort: antippen, dann auf den Boden tippen. Kanal-Fertigkeiten (Eisstrahl, Blutsauger) gedrückt halten. Langes Drücken auf eine Fertigkeit hebt sie an, damit du sie umsortieren kannst.</p>`,
    null, 'tasten steuerung bedienung handy pc keys');
  sys('raenge', 'Ränge und Erwecken', 'Fertigkeiten bis Stufe 15, dann E1, H, L und V',
    `<p>Jede Stufe gibt einen Fertigkeitspunkt. Bis Stufe ${SKILL_POINT_MAX} steigert ein Punkt die Fertigkeit; der Punkt auf ${SKILL_POINT_MAX} erweckt sie automatisch zu <b>E1</b>. Danach steigst du mit [[verbrauch/buch|Fertigkeitsbüchern]] weiter.</p>${tbl(['Rang', 'Stufen', 'Ab Spielerstufe', 'Bücher für den Aufstieg'], SKILL_RANKS.map((r) => [`<b style="color:${r.color}">${r.name}</b>`, String(r.levels), String(r.minLevel), String(r.books)]))}<p>Jedes Buch hebt die Fertigkeit eine Stufe innerhalb des Rangs. Für den nächsten Rang brauchst du die angegebene Zahl Bücher. Höhere Ränge machen Fertigkeiten stärker und prächtiger.</p>`,
    'bilder/buch.png', 'rang erwecken erwacht heroisch legendär vollendet e1 bücher');
  sys('schmied', 'Schmied und Aufwertung', 'Von +0 bis +20 · sicher bis +6, danach Bruchgefahr',
    `<p>Beim [[npc/schmied|Schmied]] wertest du Ausrüstung auf. Jeder Schritt kostet Gold (× Stufe des Gegenstands + 1) und [[material/splitter|Seelensplitter]]. Ab +6 (bei Ausrüstung ab Stufe 30 schon ab +4) brauchst du zusätzlich [[kat/material|Monster-Teile]]. Bis +7 verlierst du bei einem Fehlschlag nur die Kosten, danach kann der Gegenstand <b>brechen</b> – außer du nutzt eine [[verbrauch/segen|Segensschriftrolle]].</p>${tbl(['Schritt', 'Chance', 'Gold (× Stufe+1)', 'Splitter', 'Bei Fehlschlag'], UPGRADE_STEPS.map((u, i) => [`+${i} → +${i + 1}`, pc(u.chance), de(u.gold), String(u.splinters), u.fail === 'break' ? '<b style="color:#f87171">bricht</b>' : 'nur Kosten weg']))}`,
    'bilder/npc-schmied.png', 'schmied aufwerten upgrade plus bruch');
  const bonusRows = Object.values(BONUS_TYPES).map((b) => [b.name, b.fmt === 'flat' ? `${b.range[0]}–${b.range[1]}` : `${pc(b.range[0], 1)}–${pc(b.range[1], 1)}`, (b.slots || []).map((s) => slotName[s] || s).join(', ')]);
  sys('boni', 'Boni auf Ausrüstung', 'Bis zu 5 normale und 2 Sonder-Boni je Gegenstand',
    `<p>Ausrüstung kann bis zu ${MAX_NORMAL_BONUS} normale Boni und ${MAX_SPECIAL_BONUS} Sonderboni tragen.</p><ul><li>[[material/boniPlus|Boni-Plus]]: fügt Boni hinzu, bis 4.</li><li>[[material/boni5|Boni-5]]: fügt den 5. Bonus hinzu (braucht genau 4).</li><li>[[material/switcher|Switcher]]: würfelt alle normalen Boni neu (Anzahl bleibt).</li><li>[[material/star|Stern]]: fügt Sonderbonus 6, dann 7 hinzu.</li><li>[[material/switch67|Switcher 6/7]]: würfelt die Sonderboni neu.</li></ul>${tbl(['Bonus', 'Bereich', 'Plätze'], bonusRows)}<h3>Sonderboni</h3>${tbl(['Bonus', 'Bereich'], Object.values(SPECIAL_BONUS_TYPES).map((b) => [b.name, b.range ? `${pc(b.range[0], 1)}–${pc(b.range[1], 1)}` : '–']))}`,
    'bilder/material-boniPlus.png', 'boni bonus switcher stern boni5');
  sys('pferde', 'Pferde', 'Reitpferd aus der Stall-Mission, Kriegsross ab Stufe 40',
    `${tbl(['Pferd', 'Tempo', 'So bekommst du es'], [[HORSES[1].name, '+' + pc(HORSES[1].speed), `[[quest/stall|Mission beim Stallmeister]] ab Stufe ${STABLE_QUEST.minLevel}`], [HORSES[2].name, '+' + pc(HORSES[2].speed), `ab Stufe ${HORSES[2].level} beim [[npc/stallmeister|Stallmeister]] für ${de(HORSES[2].price)} Gold`]])}<p>Taste <kbd>R</kbd> oder der Pferdeknopf ruft das Pferd. Angriffe und Fertigkeiten lassen dich absteigen.</p>`,
    'bilder/npc-stallmeister.png', 'pferd reiten reittier kriegsross');
  sys('gemeinschaft', 'Gruppe, Gilde, Freunde, Handel, Duell', 'Zusammen spielen',
    `<ul><li><b>Gruppe:</b> bis ${PARTY.max} Spieler, +${pc(PARTY.bonus)} Erfahrung, Verteilung gleich oder nach Stufe.</li><li><b>Gilde:</b> gründen ab Stufe ${GUILD.level} für ${de(GUILD.price)} Gold, bis ${GUILD.maxMembers} Mitglieder.</li><li><b>Freunde:</b> Spieler antippen → Freund.</li><li><b>Handel:</b> Spieler antippen → Handeln, bis ${TRADE_SLOTS} Gegenstände und Gold je Seite.</li><li><b>Duell:</b> Spieler antippen → Duell. Kampf ohne Tod, Countdown ${DUEL.countdown} s.</li></ul>`,
    null, 'gruppe party gilde freunde handel duell pvp');
  let daily = '';
  try { daily = tbl(['Tag', 'Belohnung (Beispiel Stufe 30)'], DAILY_DAYS.map((d, i) => [`${i + 1}. ${d.name}`, dailyLines(i, 30).join(' · ')])); } catch (err) { daily = ''; }
  sys('tagesbelohnung', 'Tagesbelohnung', 'Jeden Tag einloggen lohnt sich – 7 Tage im Kreis', `<p>Einmal am Tag gibt es eine Belohnung (Taste <kbd>T</kbd>). Je mehr Tage am Stück, desto besser.</p>${daily}`, null, 'tagesbelohnung daily login belohnung');
  sys('tod', 'Tod und Wiederbeleben', 'Kostenlos im Lager oder gegen Erfahrung vor Ort', `<p>Stirbst du, kannst du kostenlos im Lager der aktuellen Map aufstehen oder an Ort und Stelle (kostet 3 % der Erfahrung zur nächsten Stufe, du stehst mit halbem Leben und Mana auf und bist 3 s geschützt).</p>`, null, 'tod sterben wiederbeleben respawn');
  sys('inventar', 'Inventar und Lager', `${BAG_SIZE} Plätze im Inventar, ${STORAGE.page * STORAGE.pages} im Lager`, `<p>Das Inventar (Taste <kbd>I</kbd>) hat ${BAG_PAGES} Seiten mit je ${BAG_PAGE} Plätzen. Das [[npc/lager|Lager]] kostet einmalig ${de(STORAGE.price)} Gold und ist in allen Städten dasselbe. Verkaufen kannst du bei Händlerin, Waffen- und Rüstungshändler, Alchemist und Schmied.</p>`, null, 'inventar tasche lager verkaufen');
  sys('status', 'Statuspunkte', `${STAT_POINTS_PER_LEVEL} Statuspunkt je Stufe`, tbl(['Wert', 'Wirkung'], ATTRS.map((a) => [a.name, a.text])) + `<p>Höchstens ${MAX_ATTR} Punkte je Wert. Der [[npc/lehrmeister|Lehrmeister]] setzt sie gegen Gold zurück.</p>`, null, 'status statuspunkte stärke vitalität intelligenz geschick');
  sys('reisen', 'Reisen', 'Weltentor, Wegweiserin, Risse', `<ul><li>[[npc/weltentor|Weltentor]]: kostenlos auf jede Map, deren Mindeststufe du hast.</li><li>[[npc/teleport|Wegweiserin]]: zu den Jagdgebieten, Preis = Mindeststufe × 25 Gold.</li><li><b>Risse:</b> ab Stufe ${RIFT.minLevel} öffnen sich ab und zu Risse zu einem passenden Dungeon (5 Minuten offen).</li></ul>`, null, 'reisen teleport weltentor riss');
  sys('beidhaendig', 'Beidhändig kämpfen', `Weg der Klinge ab Stufe ${DUAL_WIELD.level}`, `<p>Krieger im Weg der Klinge lernen ab Stufe ${DUAL_WIELD.level} beim [[npc/waffen|Waffenhändler]] für ${de(DUAL_WIELD.price)} Gold den Kampf mit zwei Waffen: +${pc(DUAL_WIELD.atk)} Angriff der Zweitwaffe und schnelleres Zuschlagen.</p>`, null, 'zwei waffen beidhändig dual');

  // ============ Seiten: Erste Schritte und Fragen ============
  const pages = {
    start: {
      title: 'Erste Schritte', html: `<div class="tip">Neu in Seelenstein? So startest du am besten.</div>
      <ol>
        <li><b>Klasse wählen:</b> [[klasse/krieger|Krieger]] (robust, Nahkampf), [[klasse/ninja|Ninja]] (schnell, Dolche oder Bogen), [[klasse/schamane|Schamane]] (Drachenmagie oder Heilung), [[klasse/nekromant|Nekromant]] (Diener, Blut und Knochen) oder [[klasse/magier|Magier]] (vier Elemente). Jede Klasse hat zwei Wege.</li>
        <li><b>Steuerung lernen:</b> siehe [[system/steuerung|Steuerung]]. Taste <kbd>H</kbd> öffnet die Hilfe im Spiel.</li>
        <li><b>Hauptquest:</b> Sprich in Vlotho mit dem [[npc/aeltester|Dorfältesten]]. Der goldene Pfeil zeigt dir immer das nächste Ziel.</li>
        <li><b>Erste Monster:</b> Um Vlotho in den Sonnenwiesen leben Hunde, Wölfe und Wildschweine – siehe [[karte/1|Vlotho]].</li>
        <li><b>Tränke:</b> Bei der [[npc/haendler|Händlerin]] kaufen, mit <kbd>Q</kbd> (Leben) und <kbd>E</kbd> (Mana) trinken.</li>
        <li><b>Jeden Tag:</b> [[system/tagesbelohnung|Tagesbelohnung]] abholen, Aufträge der [[npc/jaegerin|Jägerin]] und der [[npc/wanderer|Wanderer]] machen.</li>
        <li><b>Stärker werden:</b> Bessere Ausrüstung beim [[npc/waffen|Waffen-]] und [[npc/ruestung|Rüstungshändler]], aufwerten beim [[npc/schmied|Schmied]], Boni mit [[kat/material|Materialien]].</li>
        <li><b>Ab Stufe 15:</b> [[quest/stall|Pferde-Mission]] beim Stallmeister. Fertigkeiten auf 15 werden automatisch zu E1 erweckt.</li>
        <li><b>Weiter reisen:</b> Über das [[npc/weltentor|Weltentor]] auf die nächste Map, wenn du ihre Stufe erreicht hast – siehe [[kat/karte|Karten]].</li>
        <li><b>Später:</b> [[kat/dungeon|Dungeons]], [[kat/stein|Seelensteine]], Endbosse in der Gruppe, Gilde ab Stufe 40.</li>
      </ol>
      <h3>Welche Map für welche Stufe?</h3>${tbl(['Map', 'Stufen', 'Lager'], WORLD_MAPS.slice().sort((a, b) => a.minLevel - b.minLevel).map((m) => [`[[karte/${m.id}|${m.name}]]`, m.levels, (ZONES.find((z) => z.safe && zoneMap(z) === m.id) || {}).name || '']))}`
    },
    faq: {
      title: 'Häufige Fragen', items: [
        ['Wo bekomme ich Fertigkeitsbücher?', `Beim [[npc/lehrmeister|Lehrmeister]] (jedes Buch deiner Klasse, ${de(TEACHER.bookPrice)} Gold), beim [[npc/alchemist|Alchemisten]] (zufällig, ${de(alch.book || 40000)} Gold), als Fertigkeitsschriftrolle aus [[kat/stein|Seelensteinen]] ab Stufe 40, aus Hauptquests und der Tagesbelohnung. Mehr: [[verbrauch/buch]].`],
        ['Wie bekomme ich ein Pferd?', `Ab Stufe ${STABLE_QUEST.minLevel} beim [[npc/stallmeister|Stallmeister]] die [[quest/stall|Pferde-Mission]] machen. Ab Stufe 40 gibt es dort das Kriegsross.`],
        ['Wo bekomme ich die Segensschriftrolle?', `Nur aus [[kat/stein|Seelensteinen]] ab Stufe ${BLESSING.stone}. Sie schützt beim [[npc/schmied|Schmied]] vor dem Bruch.`],
        ['Ab wann kann Ausrüstung beim Aufwerten brechen?', 'Ab dem Schritt +7 → +8. Bis dahin verlierst du bei einem Fehlschlag nur Gold und Splitter. Siehe [[system/schmied]].'],
        ['Was macht der Switcher?', 'Er würfelt alle normalen Boni eines Gegenstands neu, die Anzahl bleibt. Siehe [[material/switcher]] und [[system/boni]].'],
        ['Wo farme ich Monster-Teile für den Schmied?', 'Jedes Monster lässt mit 5 % sein Teil fallen (35 %, wenn ein Wanderer genau dieses Teil sammeln lässt). Welche Teile du brauchst, zeigt der Schmied. Liste: [[kat/material|Materialien]].'],
        ['Wie wechsle ich meinen Weg?', 'Beim [[npc/lehrmeister|Lehrmeister]] – das zählt als Fertigkeits-Zurücksetzen und kostet Gold.'],
        ['Wie komme ich auf eine andere Map?', 'Über das [[npc/weltentor|Weltentor]] in jedem Lager, sobald du die Mindeststufe der Map hast.'],
        ['Was ist ein Seelenstein?', 'Ein großer Stein in den Jagdgebieten, der beim Angreifen Monster ruft und viel Beute gibt. Siehe [[kat/stein|Seelensteine]].'],
        ['Wie gründe ich eine Gilde?', `Ab Stufe ${GUILD.level} für ${de(GUILD.price)} Gold – siehe [[system/gemeinschaft]].`],
        ['Was passiert, wenn ich sterbe?', 'Siehe [[system/tod|Tod und Wiederbeleben]].'],
        ['Wie lerne ich mit zwei Waffen zu kämpfen?', 'Nur Krieger im Weg der Klinge, ab Stufe 30 beim Waffenhändler – siehe [[system/beidhaendig]].']
      ]
    }
  };

  const cats = [
    { id: 'start', name: 'Erste Schritte', icon: '★', page: 'start', short: 'Für Anfänger', img: 'bilder/npc-aeltester.png' },
    { id: 'klasse', name: 'Klassen', icon: '⚔', img: 'bilder/klasse-krieger.png', intro: 'Fünf Klassen mit je zwei Wegen (der Magier hat vier Elemente). Jede Fertigkeit hat eine eigene Seite.' },
    { id: 'fertigkeit', name: 'Fertigkeiten', icon: '✦', img: 'bilder/fertigkeit-drachenodem.png', intro: 'Alle Fertigkeiten und Ultimativen Attacken aller Klassen.' },
    { id: 'karte', name: 'Karten und Gebiete', icon: '⛰', img: 'bilder/karte-1.png', intro: 'Alle Maps und ihre Jagdgebiete. Über das [[npc/weltentor|Weltentor]] reist du zwischen den Maps.' },
    { id: 'monster', name: 'Monster', icon: '☠', img: monImg.wolf, intro: 'Alle Monster, Dungeon-Bosse und Endbosse mit Fundort und Beute.' },
    { id: 'stein', name: 'Seelensteine', icon: '◆', img: 'bilder/stein-40.png', intro: 'Seelensteine rufen Monster und lassen viel Beute fallen – ab Stufe 30 Switcher 6/7, ab 35 Segensschriftrollen, ab 40 Fertigkeitsschriftrollen.' },
    { id: 'dungeon', name: 'Dungeons und Endbosse', icon: '♜', img: monImg.spinnenkoenigin, intro: 'Dungeons mit Boss und Endboss-Hallen für Gruppen.' },
    { id: 'gegenstand', name: 'Ausrüstung', icon: '🛡', img: 'bilder/waffenart-sword.png', intro: 'Alle Gegenstände je Platz und Stufe mit Werten und Fundorten.' },
    { id: 'material', name: 'Materialien', icon: '⬢', img: 'bilder/material-switcher.png', intro: 'Boni-Materialien, Seelensplitter und Monster-Teile für den Schmied.' },
    { id: 'verbrauch', name: 'Tränke und Schriftrollen', icon: '⚗', img: 'bilder/trank-hp-L.png', intro: 'Tränke, Segensschriftrolle und Fertigkeitsbücher.' },
    { id: 'npc', name: 'NPCs', icon: '☺', img: 'bilder/npc-haendler.png', intro: 'Wer wo steht und was er für dich tut.' },
    { id: 'quest', name: 'Quests', icon: '❖', img: 'bilder/npc-aeltester.png', intro: 'Die goldene Hauptquestreihe Kapitel für Kapitel und besondere Missionen.' },
    { id: 'system', name: 'Spielsysteme', icon: '⚙', img: 'bilder/buch.png', intro: 'Steuerung, Ränge, Schmied, Boni, Pferde, Gemeinschaft und mehr.' },
    { id: 'faq', name: 'Häufige Fragen', icon: '?', page: 'faq', short: 'Schnelle Antworten' }
  ];
  console.log('[wiki] alle Bilder als WebP');
  // die Bilder werden außerhalb als WebP gespeichert (tools/wiki-bauen.js): Verweise schon hier umstellen
  const fix = (s) => (typeof s === 'string' ? s.replace(/bilder\/([\w.-]+)\.png/g, 'bilder/$1.webp') : s);
  for (const e of E) {
    e.img = fix(e.img);
    for (const s of e.sections || []) s.html = fix(s.html);
  }
  for (const c of cats) c.img = fix(c.img);
  return { cats, entries: E, pages, images: IMAGES, version: GAME_VERSION };
};

// Rollennamen der NPCs (in jedem Lager gleich)
const NPC_ROLE = {
  haendler: 'Händlerin (Tränke)', schmied: 'Schmied', waffen: 'Waffenhändler', ruestung: 'Rüstungshändler', aeltester: 'Dorfältester',
  jaegerin: 'Jägerin', teleport: 'Wegweiserin', alchemist: 'Alchemist', stallmeister: 'Stallmeister', lehrmeister: 'Lehrmeister',
  lager: 'Lagerverwalter', weltentor: 'Weltentor', wanderer: 'Wanderer'
};
