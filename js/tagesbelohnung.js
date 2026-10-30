// Tagesbelohnung (seit 6.9): Wer an einem Tag spielt, holt sich einmal eine Belohnung ab.
// Sieben Tage in Folge bilden eine Reihe, jeder Tag gibt etwas Besseres, Tag 7 ist der große Preis.
// Wer einen Tag auslässt, fängt wieder bei Tag 1 an. Die Mengen wachsen mit der Stufe.

const DAILY_DAYS = [
  { name: 'Goldbeutel', icon: 'gold', reward: (L) => ({ gold: 300 + L * 80, potions: 4 }) },
  { name: 'Seelensplitter', icon: 'splinter', reward: (L) => ({ splinters: 3 + Math.floor(L / 12), potions: 4 }) },
  { name: 'Verstärkungen', icon: 'boniPlus', reward: (L) => ({ gold: 500 + L * 100, mats: { boniPlus: 2 } }) },
  // seit 10.4 keine Segensschriftrollen mehr (die geben nur noch Seelensteine ab Stufe 35)
  { name: 'Tränkekorb', icon: 'gold', reward: (L) => ({ gold: 800 + L * 120, potions: 8 }) },
  { name: 'Switcher', icon: 'switcher', reward: (L) => ({ splinters: 4 + Math.floor(L / 10), mats: { switcher: 2 } }) },
  { name: 'Schatztruhe', icon: 'gold', reward: (L) => ({ gold: 1500 + L * 250, mats: { boniPlus: 3 } }) },
  { name: 'Großer Preis', icon: 'book', reward: (L) => ({ books: 1, gold: 2000 + L * 300, mats: L >= 30 ? { boni5: 1, switcher: 2 } : { switcher: 3 } }) }
];

// Datum als Text (Gerätezeit) und Abstand zweier Tage
function dailyKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dailyGap(a, b) {
  const t = (k) => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((t(b) - t(a)) / 86400000);
}

// Stand heute: welcher Tag der Reihe dran ist und ob schon abgeholt
function dailyState(p = game.player) {
  const d = p.daily || { last: null, streak: 0 };
  const today = dailyKey();
  if (d.last === today) return { claimed: true, day: ((d.streak - 1) % 7) + 1, streak: d.streak };
  const keep = d.last && dailyGap(d.last, today) === 1;
  const streak = keep ? d.streak + 1 : 1;
  return { claimed: false, day: ((streak - 1) % 7) + 1, streak };
}

function dailyRewardFor(day, level) {
  return DAILY_DAYS[day - 1].reward(level);
}

function dailyIcon(kind) {
  if (kind === 'scroll') return scrollIconUrl();
  if (kind === 'boniPlus' || kind === 'switcher' || kind === 'boni5') return materialIconUrl(kind);
  return lootIconUrl(kind);
}

// Abholen: Tränke in der Größe zur Stufe, Splitter, dann der Rest wie bei Aufträgen
function claimDaily() {
  const p = game.player;
  const st = dailyState(p);
  if (st.claimed) return null;
  const r = dailyRewardFor(st.day, p.level);
  const rest = { ...r };
  const extra = [];
  if (r.potions) {
    const sz = potionSizeFor(p.level).id;
    for (const kind of ['hp', 'mp']) p.potions[potKey(kind, sz)] = (p.potions[potKey(kind, sz)] || 0) + r.potions;
    extra.push(`${r.potions} × ${potionInfo('hp').name} und ${potionInfo('mp').name}`);
    delete rest.potions;
  }
  if (r.splinters) {
    p.splinters += r.splinters;
    extra.push(`${r.splinters} Seelensplitter`);
    delete rest.splinters;
  }
  p.daily = { last: dailyKey(), streak: st.streak };
  if (extra.length) ui.log('Tagesbelohnung: ' + extra.join(', ') + '.', 'level');
  if (Object.keys(rest).length) giveReward(rest, 0);
  else {
    vfxLevelUp(p);
    saveGame();
  }
  ui.banner(`Tagesbelohnung · Tag ${st.day}`, DAILY_DAYS[st.day - 1].name);
  flashScreen('#ffd34d', 0.25);
  ui.updateDailyBadge();
  return st.day;
}

// Kurzer Text, was ein Tag bringt (für die Kacheln)
function dailyLines(day, level) {
  const r = dailyRewardFor(day, level);
  const out = [];
  if (r.gold) out.push(`${r.gold.toLocaleString('de-DE')} Gold`);
  if (r.splinters) out.push(`${r.splinters} Splitter`);
  if (r.potions) out.push(`${r.potions}+${r.potions} Tränke`);
  if (r.scrolls) out.push(`${r.scrolls} Segensrolle${r.scrolls > 1 ? 'n' : ''}`);
  if (r.books) out.push(`${r.books} Fertigkeitsschriftrolle${r.books > 1 ? 'n' : ''}`);
  for (const [id, n] of Object.entries(r.mats || {})) out.push(`${n} × ${MATERIALS.find((m) => m.id === id).name}`);
  return out;
}

function renderDaily() {
  const p = game.player;
  if (!p) return;
  const st = dailyState(p);
  const tiles = DAILY_DAYS.map((d, i) => {
    const day = i + 1;
    const cls = day < st.day || (st.claimed && day === st.day) ? 'done' : day === st.day ? 'today' : 'later';
    return `<div class="daily-tile ${cls}${day === 7 ? ' big' : ''}"><small>Tag ${day}</small>` +
      `<img src="${dailyIcon(d.icon)}" alt=""><strong>${d.name}</strong>` +
      `<span>${dailyLines(day, p.level).join('<br>')}</span>${cls === 'done' ? '<i class="daily-check">✓</i>' : ''}</div>`;
  }).join('');
  $('dailyBody').innerHTML =
    `<p>Jeden Tag einmal abholen. Sieben Tage in Folge geben immer bessere Belohnungen – wer einen Tag auslässt, fängt wieder bei Tag 1 an.</p>` +
    `<div class="daily-grid">${tiles}</div>` +
    (st.claimed
      ? `<p class="hint-text">Heute schon abgeholt (Reihe: ${st.streak} ${st.streak === 1 ? 'Tag' : 'Tage'}). Morgen wartet Tag ${(st.day % 7) + 1}.</p>`
      : `<button type="button" class="btn btn-primary daily-claim" id="btnDailyClaim">Tag ${st.day} abholen</button>`);
  const b = $('btnDailyClaim');
  if (b) b.addEventListener('click', () => { claimDaily(); renderDaily(); });
}
