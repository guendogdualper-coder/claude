// Questfenster (seit 13.8, Taste L): alle Aufträge auf einen Blick, getrennt nach Hauptquests und Nebenquests.
// Hauptquests (Kapitel der Ältesten, Mission des Stallmeisters) lassen sich nicht abbrechen.
// Nebenquests (Wanderer, Jägerin, Nachtwanderer) lassen sich abbrechen; der Auftraggeber bietet sie danach neu an.
// Weitere Nebenquest-Quellen tragen sich in SIDE_QUEST_SOURCES ein (z. B. die Nachtquests in tag-nacht.js).

const SIDE_QUEST_SOURCES = [];

const questWin = { tab: 'main' };

// Hauptquests: der laufende (oder nächste) Kapitelauftrag und die Mission des Stallmeisters
function mainQuestEntries() {
  const q = questState();
  const out = [];
  const main = currentMainQuest();
  if (main) {
    const inChapter = MAIN_QUESTS.filter((x) => x.chapter === main.chapter);
    const step = inChapter.indexOf(main) + 1;
    const talk = main.goal.type === 'talk';
    out.push({
      key: 'main', title: main.title, sub: `${main.chapterTitle} · Auftrag ${step} von ${inChapter.length} · ab Stufe ${main.level}`,
      text: main.text,
      goal: q.accepted ? goalText(main.goal) : `Beim Ältesten annehmen: ${elderPlace(questGiverMap(main, q))}`,
      have: q.accepted && !talk ? q.progress : 0, need: q.accepted && !talk ? main.goal.count : 0,
      where: q.accepted ? (talk ? `${mapName(main.goal.map)} · über das Weltentor` : goalWhere(main.goal)) : mapName(questGiverMap(main, q)),
      active: q.accepted, xp: questXp(main.level, talk ? QUEST_XP.talk : QUEST_XP[main.goal.type] || 0.25)
    });
  }
  const st = q.stable;
  if (st && (st.state === 'active' || st.state === 'done')) {
    const left = Math.max(0, Math.ceil(st.deadline - game.player.playTime));
    out.push({
      key: 'stable', title: STABLE_QUEST.title, sub: 'Mission des Stallmeisters' + (st.state === 'active' ? ` · noch ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : ''),
      goal: `${STABLE_QUEST.count} Monster ab Stufe ${STABLE_QUEST.minLevel} besiegen`,
      have: st.state === 'done' ? STABLE_QUEST.count : st.progress, need: STABLE_QUEST.count, where: 'jedes Gebiet ab Stufe ' + STABLE_QUEST.minLevel, active: true, xp: questXp(STABLE_QUEST.level, 0.8)
    });
  }
  return out;
}

// Nebenquests: Wanderer, Jägerin und alles, was sich in SIDE_QUEST_SOURCES einträgt
function sideQuestEntries() {
  const q = questState();
  const out = [];
  if (q.side) {
    for (const n of allWanderers()) {
      if (!q.side[n.key] || q.side[n.key].state !== 'active') continue;
      const s = q.side[n.key];
      const mon = sideMon(n, s);
      const t = MONSTER_TYPES[mon];
      out.push({
        key: 'side:' + n.key, title: n.name, sub: `Wanderer · ${mapName(npcMapId(n))}`,
        goal: n.side.kind === 'collect' ? `${sideCount(n, s)} × ${MOB_MATS[mon].name} bringen` : `${sideCount(n, s)} × ${t.name} besiegen`,
        have: sideHave(n, s), need: sideCount(n, s), where: monsterWhere(mon), active: true, xp: sideQuestXp(t.level),
        abandon: () => { s.state = 'open'; s.progress = 0; }
      });
    }
  }
  if (q.hunt) {
    const h = q.hunt;
    out.push({
      key: 'hunt', title: 'Jagd: ' + MONSTER_TYPES[h.monster].name, sub: 'Jägerin',
      goal: `${h.count} × ${MONSTER_TYPES[h.monster].name} besiegen`, have: h.progress, need: h.count, where: monsterWhere(h.monster), active: true, xp: sideQuestXp(h.level),
      abandon: () => { q.hunt = null; q.offers = null; }
    });
  }
  for (const src of SIDE_QUEST_SOURCES) out.push(...src());
  return out;
}

function questCounts() {
  const q = questState();
  const sideDoneCount = Object.values(q.side || {}).reduce((n, s) => n + (s.times || 0), 0) + (q.hunts || 0) + (q.nightDone || 0);
  return { mainDone: q.main || 0, mainTotal: MAIN_QUESTS.length, sideDone: sideDoneCount };
}

function renderQuestWindow() {
  const body = $('questBody');
  if (!body || !game.player) return;
  const mains = mainQuestEntries();
  const sides = sideQuestEntries();
  const c = questCounts();
  const tracked = typeof guide !== 'undefined' && guide.entry ? guide.entry.key : '';
  const list = questWin.tab === 'main' ? mains : sides;
  const card = (e) => {
    const done = e.need > 0 && e.have >= e.need;
    const pct = e.need ? Math.min(100, (e.have / e.need) * 100) : 0;
    return `<li class="qw-q ${questWin.tab}${done ? ' done' : ''}${e.key === tracked ? ' tracked' : ''}">` +
      `<div class="qw-top"><b>${e.title}</b><small>${e.sub || ''}</small></div>` +
      (e.text ? `<p class="qw-text">${e.text}</p>` : '') +
      `<span class="qw-goal">${done ? 'Erfüllt – zurück zum Auftraggeber' : e.goal}</span>` +
      (e.need ? `<span class="ql-bar"><i style="width:${pct}%"></i><em>${Math.min(e.have, e.need)}/${e.need}</em></span>` : '') +
      (e.where && !done ? `<span class="qw-where">📍 ${e.where}</span>` : '') +
      // Belohnung in Erfahrung (seit 13.11 auch bei Nebenquests sichtbar)
      (e.xp ? `<span class="qw-xp">Belohnung: ${e.xp.toLocaleString('de-DE')} EP</span>` : '') +
      `<div class="qw-btns">` +
      (e.active && !e.noTrack ? `<button type="button" class="mini-btn" data-qtrack="${e.key}">${e.key === tracked ? 'Wird verfolgt' : 'Verfolgen'}</button>` : '') +
      (e.abandon ? `<button type="button" class="mini-btn danger" data-qdrop="${e.key}">Abbrechen</button>` : questWin.tab === 'main' ? '<small class="qw-lock">Hauptquest · nicht abbrechbar</small>' : '') +
      `</div></li>`;
  };
  body.innerHTML =
    `<div class="qw-tabs" role="tablist">` +
    `<button type="button" role="tab" class="qw-tab main${questWin.tab === 'main' ? ' on' : ''}" data-qtab="main">Hauptquests <span>${mains.filter((e) => e.active).length}</span></button>` +
    `<button type="button" role="tab" class="qw-tab side${questWin.tab === 'side' ? ' on' : ''}" data-qtab="side">Nebenquests <span>${sides.length}</span></button>` +
    `</div>` +
    `<p class="qw-stats">Hauptquests erledigt: <b>${c.mainDone} / ${c.mainTotal}</b> · Nebenquests erledigt: <b>${c.sideDone}</b></p>` +
    (list.length ? `<ul class="qw-list">${list.map(card).join('')}</ul>`
      : `<p class="qw-empty">${questWin.tab === 'main' ? 'Alle Hauptquests sind erledigt.' : 'Keine Nebenquest angenommen. Wanderer draußen auf den Maps, die Jägerin und nachts die Nachtwanderer vergeben welche.'}</p>`);
  body.querySelectorAll('[data-qtab]').forEach((b) => b.addEventListener('click', () => {
    questWin.tab = b.dataset.qtab;
    renderQuestWindow();
  }));
  body.querySelectorAll('[data-qtrack]').forEach((b) => b.addEventListener('click', () => {
    guide.pick = b.dataset.qtrack;
    ui.renderQuestTrack();
    renderQuestWindow();
  }));
  body.querySelectorAll('[data-qdrop]').forEach((b) => b.addEventListener('click', () => {
    const e = sides.find((x) => x.key === b.dataset.qdrop);
    if (!e || !e.abandon) return;
    if (b.dataset.sure !== '1') {
      b.dataset.sure = '1';
      b.textContent = 'Wirklich abbrechen?';
      return;
    }
    e.abandon();
    if (guide.pick === e.key) guide.pick = null;
    ui.log(`Nebenquest „${e.title}“ abgebrochen.`, 'info');
    saveGame();
    ui.renderQuestTrack();
    renderQuestWindow();
  }));
}
