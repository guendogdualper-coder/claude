// Kleine Händlerfenster mit Reitern (seit 15.37): Tränke, Waffen, Rüstung, Bögen und der Lehrmeister zeigten alles
// untereinander – lange Listen in einem riesigen Fenster. Jetzt hat jedes dieser Fenster oben Reiter und zeigt immer
// nur einen Bereich; das Fenster bleibt schmal und kurz (#panelNpc.npc-klein). Der gewählte Reiter bleibt je Händler
// gemerkt, solange das Spiel läuft.
//   npcTabsHtml(key, tabs)   tabs: [{ id, label, html, badge }] – Einträge ohne html entfallen
//   npcTabsWire(body, neu)   Reiter anklickbar machen; neu() zeichnet das Fenster neu
const NPC_TAB = {};
function npcTabsHtml(key, tabs) {
  tabs = tabs.filter((t) => t && t.html);
  if (!tabs.length) return '';
  let cur = NPC_TAB[key];
  if (!tabs.some((t) => t.id === cur)) cur = NPC_TAB[key] = tabs[0].id;
  const act = tabs.find((t) => t.id === cur);
  return `<div class="npc-tabs" role="tablist">` +
    tabs.map((t) => `<button type="button" role="tab" class="npc-tab${t.id === cur ? ' on' : ''}" data-npctab="${key}|${t.id}">${t.label}${t.badge ? ` <small>${t.badge}</small>` : ''}</button>`).join('') +
    `</div><div class="npc-tab-body">${act.html}</div>`;
}
function npcTabsWire(body, neu) {
  body.querySelectorAll('[data-npctab]').forEach((b) => b.addEventListener('click', () => {
    const [key, id] = b.dataset.npctab.split('|');
    NPC_TAB[key] = id;
    neu();
  }));
  const panel = body.closest('.panel');
  if (panel) {
    panel.classList.remove('npc-wide');
    panel.classList.add('npc-klein');
  }
}
