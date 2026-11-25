'use strict';
// Einführung (seit 15.46): kurzer Rundgang für neue Spieler, jederzeit mit einem Tipp zu überspringen.
// - Startet von selbst, wenn man zum ersten Mal mit einem neuen Charakter (Stufe 1, ohne Erfahrung) ins Spiel kommt –
//   einmal je Gerät (localStorage INTRO.key). Wer im Konto schon einen Charakter ab Stufe INTRO.expert hat, kennt das
//   Spiel: dann nicht von selbst. Wiederholen: Hilfe (Knopf „Einführung starten“) und Einstellungen → Figur und Spiel.
// - Je Schritt wird ein Teil der Oberfläche hervorgehoben (abgedunkelter Rest mit Loch und leuchtendem Rahmen) und
//   daneben steht eine Sprechblase mit Weiter, Zurück, Fortschritt (z. B. 3 / 15) und „Überspringen“.
//   Texte für Maus/Tastatur oder Fingerbedienung (input.touchUi); Tasten aus der eigenen Belegung (tasten.js).
// - Nichts wird blockiert: Abdunklung und Rahmen lassen jeden Klick durch, das Spiel läuft weiter (auch im Kanal und
//   in der Gruppe), die Sprechblase ist klein. Ist ein Teil gerade nicht zu sehen (z. B. im zugeklappten Menü am
//   Handy), wird der nächste sichtbare aus der Liste genommen, sonst steht die Blase in der Mitte.
// - Zahlen zu Regeln kommen aus den Spieldaten (Schmied: UPGRADE_STEPS, upgradeMatStart, BLESSING; Instanzen: INST …),
//   damit der Text nach Änderungen weiter stimmt.
// Automatische Tests (navigator.webdriver) bekommen die Einführung nicht von selbst (wie beim Titel: außer mit
// localStorage „seelenstein.titelTest“ = „1“).

const INTRO = { key: 'seelenstein.einfuehrung', expert: 10, on: false, i: 0, steps: [], el: null, timer: 0, wait: 0 };

const introPc = () => !(typeof input !== 'undefined' && input.touchUi);
// Taste einer Aktion als Anzeige („I“, „Leertaste“)
const introKey = (id) => (typeof keyLabel === 'function' && typeof actionKey === 'function' ? keyLabel(actionKey(id)) : '');
const introAct = (id) => {
  const a = typeof KEY_ACTIONS !== 'undefined' ? KEY_ACTIONS.find((x) => x.id === id) : null;
  return a ? a.label : id;
};

// Schmied: ab welchem Plus ein Fehlschlag zerbrechen kann (-1 = nie), ab wann Monster-Teile nötig sind
function introSmith() {
  const steps = typeof UPGRADE_STEPS !== 'undefined' ? UPGRADE_STEPS : [];
  const breakFrom = steps.findIndex((s) => s && s.fail === 'break');
  const low = typeof upgradeMatStart === 'function' ? upgradeMatStart(0) : 6;
  let hiLevel = 0;
  let hi = low;
  if (typeof ITEM_TIERS !== 'undefined' && typeof upgradeMatStart === 'function') {
    for (let t = 0; t < ITEM_TIERS.length; t++) {
      if (upgradeMatStart(t) !== low) { hi = upgradeMatStart(t); hiLevel = ITEM_TIERS[t].level; break; }
    }
  }
  return { breakFrom, low, hi, hiLevel, max: typeof MAX_PLUS !== 'undefined' ? MAX_PLUS : 20, stone: typeof BLESSING !== 'undefined' ? BLESSING.stone : 35 };
}

// Die Schritte (frisch je Start: Tasten und PC/Handy können sich ändern)
// sel: Ziele (erstes sichtbares je Gruppe; Gruppen durch Arrays), t: Titel, p: Absätze, k: Tasten [Aktion, …]
function introSteps() {
  const pc = introPc();
  const sm = introSmith();
  const dungeonMin = typeof DUNGEONS !== 'undefined' && DUNGEONS.length ? Math.min(...DUNGEONS.map((d) => d.minLevel || 1)) : 10;
  const inst = typeof INST !== 'undefined' ? INST : { level: 60, party: [1, 5], lockMin: 60 };
  const gfLevel = typeof GF !== 'undefined' ? GF.level : 30;
  const statPts = typeof STAT_POINTS_PER_LEVEL !== 'undefined' ? STAT_POINTS_PER_LEVEL : 2;
  const skillMax = typeof SKILL_POINT_MAX !== 'undefined' ? SKILL_POINT_MAX : 15;
  const S = [];
  S.push({ t: 'Willkommen in Seelenstein!', p: ['Diese kurze Einführung zeigt dir, wo was ist. Das Spiel läuft nebenher weiter.', 'Du kannst sie jederzeit überspringen und später in der Hilfe wiederholen.'] });
  if (pc) {
    S.push({ t: 'Laufen und angreifen', p: ['Laufen mit W, A, S, D oder den Pfeiltasten. Ein Klick auf den Boden läuft dorthin.', 'Halte die Angriffstaste gedrückt, dann greift deine Figur immer weiter an. Steht ein Monster in der Nähe, aber außer Reichweite, läuft sie hin. Ein Linksklick auf ein Monster greift es ebenfalls an.'], k: ['attack', 'target'] });
  } else {
    S.push({ sel: [['#btnAttack'], ['#stick', '#stickZone']], t: 'Laufen und angreifen', p: ['Berühre die linke Bildschirmhälfte und ziehe, um zu laufen.', 'Halte rechts den Angriffsknopf gedrückt, dann greift deine Figur immer weiter an. Steht ein Monster in der Nähe, aber außer Reichweite, läuft sie hin.'] });
  }
  S.push({ sel: [['#skillBar']], t: 'Fertigkeiten', p: [pc ? 'Unten in der Leiste liegen deine fünf Fertigkeiten. Ab Stufe 20 kommt die Ultimative Attacke dazu.' : 'Deine fünf Fertigkeiten liegen im Bogen um den Angriffsknopf – antippen zum Wirken. Ab Stufe 20 kommt die Ultimative Attacke dazu.', `Pro Stufe bekommst du einen Fertigkeitspunkt. Damit verbesserst du Fertigkeiten im Charakterfenster unter „Fertigkeiten“ bis Stufe ${skillMax}, danach mit Fertigkeitsbüchern aus Seelensteinen.`], k: pc ? ['skill1', 'skill2', 'skill3', 'skill4', 'skill5'] : null });
  S.push({ sel: [['#hudChar .char-main', '#hudChar'], ['#potHp'], ['#potMp']], t: 'Leben, Mana und Tränke', p: ['Oben links siehst du dein Leben (rot) und dein Mana (blau). Fertigkeiten kosten Mana.', pc ? 'Die Flaschen in der Leiste sind Tränke: Drachenblut füllt Leben, Mondtau füllt Mana. Außerhalb des Kampfes kommt Leben nur langsam zurück – neue Tränke gibt es bei Händlern in der Stadt.' : 'Tippe auf die Flaschen, um zu trinken: Drachenblut füllt Leben, Mondtau füllt Mana. Außerhalb des Kampfes kommt Leben nur langsam zurück – neue Tränke gibt es bei Händlern in der Stadt.'], k: pc ? ['potHp', 'potMp'] : null });
  S.push({ sel: [['#btnInv', '#btnMenu']], t: 'Inventar und Ausrüstung', p: ['Im Inventar legst du Ausrüstung an und ab. Ein grüner Pfeil ▲ zeigt, dass ein Teil besser ist als dein angelegtes, ein roter ▼, dass es schlechter ist.', 'Tippst du ein Teil an, siehst du jeden Wert im Vergleich: grün mehr, rot weniger.'], k: pc ? ['inv'] : null });
  S.push({ sel: [['#btnChar', '#btnMenu']], t: 'Charakter und Statuspunkte', p: [`Pro Stufe bekommst du ${statPts} Statuspunkte. Ein roter Punkt am Charakter-Knopf zeigt, dass Punkte frei sind.`, 'Verteile sie im Charakterfenster: Stärke (Angriff), Vitalität (Leben und Rüstung), Intelligenz (Mana und Fertigkeitsschaden) und Geschick (kritische Treffer, Ausweichen, Angriffstempo).'], k: pc ? ['char'] : null });
  S.push({ sel: [['#questTrack', '#btnQuests', '#btnMenu']], t: 'Aufträge', p: ['Ein Ausrufezeichen über einer Person heißt: Hier gibt es einen Auftrag – golden für Hauptmissionen, grün für Nebenmissionen. Ein Fragezeichen heißt: Du kannst etwas abgeben.', pc ? 'Dein aktueller Auftrag steht unter der Karte, ein goldener Pfeil an deiner Figur zeigt den Weg. Mit Personen sprichst du, wenn du nah bei ihnen bist.' : 'Dein aktueller Auftrag steht unter der Karte, ein goldener Pfeil an deiner Figur zeigt den Weg. Zum Sprechen nah herangehen und den Sprechen-Knopf antippen.'], k: pc ? ['interact', 'quests'] : null });
  S.push({ sel: [['.hud-map']], t: 'Karte und Reisen', p: [pc ? 'Die kleine Karte oben rechts anklicken öffnet die große Karte mit Auftragszielen, Seelensteinen und Dungeon-Eingängen.' : 'Tippe auf die kleine Karte oben rechts: Die große Karte zeigt Auftragsziele, Seelensteine und Dungeon-Eingänge.', 'In der Stadt bringt dich das Weltentor auf weitere Karten und die Wegweiserin gegen Gold an den Rand jedes Jagdgebiets. Leuchtende Teleportsteine bringen dich von Insel zu Insel.'], k: pc ? ['map'] : null });
  const smithP = [`Beim Schmied in der Stadt verbesserst du Ausrüstung bis +${sm.max} – mit Gold und Seelensplittern. Ab +${sm.low} braucht er zusätzlich Teile von Monstern${sm.hiLevel ? `, für Ausrüstung ab Stufe ${sm.hiLevel} schon ab +${sm.hi}` : ''}.`];
  if (sm.breakFrom === 0) smithP.push('Vorsicht: Jeder Fehlschlag kann den Gegenstand zerbrechen, schon ab +0. Die Erfolgschance steht beim Schmied.');
  else if (sm.breakFrom > 0) smithP.push(`Vorsicht: Ab +${sm.breakFrom} kann ein Fehlschlag den Gegenstand zerbrechen. Die Erfolgschance steht beim Schmied.`);
  if (sm.breakFrom >= 0) smithP.push(`Eine Segensschriftrolle schützt davor: Schlägt es fehl, sind nur die Kosten weg. Segensschriftrollen gibt es nur selten aus Seelensteinen ab Stufe ${sm.stone}.`);
  S.push({ t: 'Der Schmied', p: smithP });
  S.push({ sel: [['#btnLoot']], t: 'Seelensteine und Beute', p: ['Seelensteine sind große leuchtende Steine draußen im Land, auf der Karte als farbige Quadrate. Greifst du einen an, ruft er Monster herbei.', 'Zerbrochen lässt er besondere Beute fallen, zum Beispiel Fertigkeitsbücher und Seelensplitter für den Schmied. Beute wird automatisch aufgehoben – der Beutel zeigt, was du gefunden hast.'], k: pc ? ['loot'] : null });
  S.push({ sel: [['#btnSocial', '#btnMenu'], ['#btnGf']], t: 'Gruppe und Gruppenfinder', p: ['Alle im selben Kanal spielen in derselben Welt. Unter „Freunde, Gilde & Gruppe“ lädst du Mitspieler in deine Gruppe ein.', `Ab Stufe ${gfLevel} findest du über den Gruppenfinder Mitspieler für Dungeons und Endbosse.`], k: pc ? ['social', 'gf'] : null });
  S.push({ t: 'Dungeons und Instanzen', p: [`Dungeons sind Höhlen und Festungen voller Monster mit einem Boss am Ende – den ersten gibt es ab Stufe ${dungeonMin}. Die Eingänge zeigt die Karte.`, `Instanzen gibt es ab Stufe ${inst.level}: allein oder mit bis zu ${inst.party[1]} Spielern. Nach dem Betreten ist eine Instanz ${inst.lockMin} Minuten gesperrt.`] });
  S.push({ sel: [['#chatBox', '#chatOpen']], t: 'Chat', p: [pc ? 'Im Kanal schreibst du hier mit den anderen Spielern. Oben im Chat wählst du Global, Gilde oder Ort.' : 'Im Kanal schreibst du über die Sprechblase mit den anderen Spielern. Oben im Chat wählst du Global, Gilde oder Ort.'], k: pc ? ['chat'] : null });
  S.push({ sel: [['#btnOpts', '#btnMenu'], ['#btnHelp']], t: 'Einstellungen und Hilfe', p: ['Im Zahnrad stellst du Ton, Grafik, Kamera, Sprache und Tasten ein.', 'Die Hilfe erklärt alles genauer – dort startest du diese Einführung jederzeit neu.'], k: pc ? ['opts', 'help'] : null });
  S.push({ t: 'Viel Erfolg!', p: ['Sprich mit den Leuten mit Ausrufezeichen und jage die Monster vor der Stadt. Gute Jagd!'], last: true });
  return S;
}

// --- Darstellung ---------------------------------------------------------------------------------------------
function introEl() {
  if (INTRO.el) return INTRO.el;
  const st = document.createElement('style');
  st.textContent = `
#introDim { position: fixed; inset: 0; z-index: 8; width: 100%; height: 100%; pointer-events: none; opacity: 0; transition: opacity 0.3s ease; }
#introDim.an { opacity: 1; }
.intro-ring { position: fixed; z-index: 8; pointer-events: none; border-radius: 12px; box-shadow: 0 0 0 2px #ffd98a, 0 0 18px 4px rgba(255, 200, 100, 0.55); animation: intro-puls 1.6s ease-in-out infinite; }
@keyframes intro-puls { 50% { box-shadow: 0 0 0 2px #fff0c0, 0 0 26px 8px rgba(255, 200, 100, 0.75); } }
#introBlase { position: fixed; z-index: 95; width: min(360px, calc(100vw - 24px)); padding: 12px 14px 12px; border-radius: 12px; pointer-events: auto;
  background: linear-gradient(180deg, rgba(38, 28, 18, 0.97), rgba(20, 14, 9, 0.97)); border: 1px solid #c9a35a; color: #f6ead0;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6); font-size: 14.5px; line-height: 1.42; user-select: none; }
#introBlase.mitte { width: min(420px, calc(100vw - 24px)); }
#introBlase .ib-kopf { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
#introBlase .ib-schritt { flex: none; font-size: 12px; color: #c9a35a; font-variant-numeric: tabular-nums; }
#introBlase .ib-skip { margin-left: auto; min-height: 32px; padding: 4px 10px; border: 1px solid rgba(201, 163, 90, 0.45); border-radius: 8px; background: none; color: #e8dcc0; font: inherit; font-size: 13px; cursor: var(--zeiger-hand, pointer); }
#introBlase .ib-skip:hover { border-color: #ffd98a; color: #fff; }
#introBlase .ib-balken { height: 3px; margin-bottom: 9px; border-radius: 2px; background: rgba(255, 255, 255, 0.1); overflow: hidden; }
#introBlase .ib-balken i { display: block; height: 100%; background: linear-gradient(90deg, #b8862c, #f0cf6a); transition: width 0.25s ease; }
#introBlase h3 { margin: 0 0 6px; font-family: var(--font-display); font-weight: 400; font-size: 19px; color: #f3d389; }
#introBlase p { margin: 0 0 6px; }
#introBlase .ib-tasten { display: flex; flex-wrap: wrap; gap: 5px 10px; margin: 4px 0 6px; font-size: 13px; color: #d8c9a2; }
#introBlase .ib-tasten span { display: inline-flex; align-items: center; gap: 5px; }
#introBlase kbd { min-width: 22px; padding: 1px 6px; border-radius: 5px; border: 1px solid rgba(201, 163, 90, 0.6); background: rgba(0, 0, 0, 0.35); color: #fff3d8; font: inherit; font-size: 12.5px; text-align: center; }
#introBlase .ib-fuss { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
#introBlase .ib-fuss .btn { min-height: 40px; padding: 6px 16px; }
#introBlase .ib-pfeil { position: absolute; width: 14px; height: 14px; background: inherit; border: inherit; transform: rotate(45deg); background: #261c12; }
#introBlase[data-seite="unten"] .ib-pfeil { top: -8px; border-right: 0; border-bottom: 0; }
#introBlase[data-seite="oben"] .ib-pfeil { bottom: -8px; border-left: 0; border-top: 0; background: #16100a; }
#introBlase[data-seite="links"] .ib-pfeil { right: -8px; border-left: 0; border-bottom: 0; }
#introBlase[data-seite="rechts"] .ib-pfeil { left: -8px; border-right: 0; border-top: 0; }
#introBlase[data-seite="mitte"] .ib-pfeil { display: none; }
@media (max-height: 500px) {
  #introBlase { width: min(330px, calc(100vw - 24px)); padding: 9px 11px; font-size: 13px; line-height: 1.35; }
  #introBlase h3 { font-size: 16px; margin-bottom: 4px; }
  #introBlase .ib-balken { margin-bottom: 6px; }
  #introBlase .ib-fuss { margin-top: 4px; }
  #introBlase .ib-fuss .btn { min-height: 36px; padding: 4px 12px; }
}`;
  document.head.append(st);
  const ns = 'http://www.w3.org/2000/svg';
  const dim = document.createElementNS(ns, 'svg');
  dim.id = 'introDim';
  dim.setAttribute('aria-hidden', 'true');
  dim.innerHTML = '<defs><mask id="introMaske"><rect x="0" y="0" width="100%" height="100%" fill="#fff"/><g class="loecher"></g></mask></defs>' +
    '<rect x="0" y="0" width="100%" height="100%" fill="rgba(6,4,2,0.5)" mask="url(#introMaske)"/>';
  const blase = document.createElement('div');
  blase.id = 'introBlase';
  blase.setAttribute('role', 'dialog');
  blase.setAttribute('aria-live', 'polite');
  blase.setAttribute('aria-labelledby', 'introTitel');
  document.body.append(dim, blase);
  INTRO.el = { dim, blase, rings: [] };
  return INTRO.el;
}

const introVisible = (el) => {
  if (!el || el.closest('[hidden]')) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 4 || r.height < 4 || r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) return null;
  const cs = getComputedStyle(el);
  if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return null;
  return r;
};
// Rechtecke der Ziele eines Schritts (je Gruppe das erste sichtbare)
function introRects(step, used) {
  const out = [];
  for (const group of step.sel || []) {
    for (const s of group) {
      const r = introVisible(document.querySelector(s));
      if (r) {
        out.push(r);
        if (used) used.push(s);
        break;
      }
    }
  }
  return out;
}

function introRender() {
  const E = introEl();
  const step = INTRO.steps[INTRO.i];
  if (!step) return;
  const n = INTRO.steps.length;
  const keys = (step.k || []).filter((id) => introKey(id) && introKey(id) !== '–');
  // Steht der Knopf im zugeklappten Menü (Handy), zeigt der Rahmen auf das Menü – dazu ein Satz, wo er liegt
  const used = [];
  introRects(step, used);
  const viaMenu = used[0] === '#btnMenu';
  const esc = typeof escapeHtml === 'function' ? escapeHtml : (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  E.blase.innerHTML = '<span class="ib-pfeil" aria-hidden="true"></span>' +
    `<div class="ib-kopf"><span class="ib-schritt">${INTRO.i + 1} / ${n}</span><button type="button" class="ib-skip" data-ib="skip">Überspringen</button></div>` +
    `<div class="ib-balken" aria-hidden="true"><i style="width:${Math.round(((INTRO.i + 1) / n) * 100)}%"></i></div>` +
    `<h3 id="introTitel">${esc(step.t)}</h3>` + step.p.map((x) => `<p>${esc(x)}</p>`).join('') +
    (viaMenu ? '<p>Den Knopf dafür findest du im Menü (☰).</p>' : '') +
    (keys.length ? `<div class="ib-tasten">${keys.map((id) => `<span><kbd>${esc(introKey(id))}</kbd><span>${esc(introAct(id))}</span></span>`).join('')}</div>` : '') +
    `<div class="ib-fuss">${INTRO.i > 0 ? '<button type="button" class="btn btn-ghost" data-ib="back">Zurück</button>' : ''}` +
    `<button type="button" class="btn btn-primary" data-ib="next">${step.last ? 'Los geht’s' : 'Weiter'}</button></div>`;
  E.blase.querySelectorAll('[data-ib]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const k = b.dataset.ib;
    if (k === 'skip') introEnd();
    else if (k === 'back') introGo(INTRO.i - 1);
    else if (step.last) introEnd();
    else introGo(INTRO.i + 1);
  }));
  introPlace();
}

// Abdunklung mit Löchern, Rahmen und Lage der Blase (läuft alle 250 ms nach: Fenster drehen, HUD verschoben)
function introPlace() {
  if (!INTRO.on || !INTRO.el) return;
  const E = INTRO.el;
  const step = INTRO.steps[INTRO.i];
  const rects = introRects(step).map((r) => ({ x: r.left - 6, y: r.top - 6, w: r.width + 12, h: r.height + 12 }));
  const holes = E.dim.querySelector('.loecher');
  holes.innerHTML = rects.map((r) => `<rect x="${r.x.toFixed(1)}" y="${r.y.toFixed(1)}" width="${r.w.toFixed(1)}" height="${r.h.toFixed(1)}" rx="12" fill="#000"/>`).join('');
  E.dim.classList.toggle('an', rects.length > 0);
  while (E.rings.length < rects.length) {
    const d = document.createElement('div');
    d.className = 'intro-ring';
    document.body.append(d);
    E.rings.push(d);
  }
  E.rings.forEach((d, k) => {
    const r = rects[k];
    d.hidden = !r;
    if (r) Object.assign(d.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
  });
  const B = E.blase;
  const bw = B.offsetWidth;
  const bh = B.offsetHeight;
  const W = innerWidth;
  const H = innerHeight;
  const m = 12;
  let side = 'mitte';
  let x = (W - bw) / 2;
  let y = (H - bh) / 2;
  let ax = 0;
  let ay = 0;
  B.classList.toggle('mitte', !rects.length);
  if (rects.length) {
    const r = rects[0];
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const room = { unten: H - (r.y + r.h), oben: r.y, rechts: W - (r.x + r.w), links: r.x };
    const fitsV = (s) => room[s] >= bh + m + 10;
    const fitsH = (s) => room[s] >= bw + m + 10;
    if (fitsV('unten') && room.unten >= room.oben) side = 'unten';
    else if (fitsV('oben')) side = 'oben';
    else if (fitsV('unten')) side = 'unten';
    else if (fitsH('links') && room.links >= room.rechts) side = 'links';
    else if (fitsH('rechts')) side = 'rechts';
    else if (fitsH('links')) side = 'links';
    if (side === 'unten' || side === 'oben') {
      x = Math.max(m, Math.min(W - bw - m, cx - bw / 2));
      y = side === 'unten' ? r.y + r.h + 10 : r.y - bh - 10;
      ax = Math.max(14, Math.min(bw - 28, cx - x - 7));
    } else if (side === 'links' || side === 'rechts') {
      x = side === 'links' ? r.x - bw - 10 : r.x + r.w + 10;
      y = Math.max(m, Math.min(H - bh - m, cy - bh / 2));
      ay = Math.max(14, Math.min(bh - 28, cy - y - 7));
    }
  }
  B.dataset.seite = side;
  B.style.left = Math.round(x) + 'px';
  B.style.top = Math.round(Math.max(m, Math.min(H - bh - m, y))) + 'px';
  const pf = B.querySelector('.ib-pfeil');
  if (pf) {
    pf.style.left = side === 'unten' || side === 'oben' ? ax + 'px' : '';
    pf.style.top = side === 'links' || side === 'rechts' ? ay + 'px' : '';
  }
}

function introGo(i) {
  INTRO.i = Math.max(0, Math.min(INTRO.steps.length - 1, i));
  introRender();
}

// manual: aus Hilfe oder Einstellungen (sonst der Start mit einem neuen Charakter)
function introStart(manual) {
  if (typeof game === 'undefined' || !game.running || !game.player) return;
  clearInterval(INTRO.wait);
  try { localStorage.setItem(INTRO.key, '1'); } catch (e) { /* privat */ }
  INTRO.steps = introSteps();
  INTRO.i = 0;
  INTRO.on = true;
  introEl();
  INTRO.el.blase.hidden = false;
  INTRO.el.dim.hidden = false;
  clearInterval(INTRO.timer);
  INTRO.timer = setInterval(introPlace, 250);
  introRender();
  if (manual) introPlace();
}

function introEnd() {
  INTRO.on = false;
  clearInterval(INTRO.timer);
  clearInterval(INTRO.wait);
  const E = INTRO.el;
  if (!E) return;
  E.blase.hidden = true;
  E.blase.innerHTML = '';
  E.dim.classList.remove('an');
  E.dim.hidden = true;
  for (const d of E.rings) d.remove();
  E.rings = [];
}

// Von selbst: erster Eintritt mit einem neuen Charakter, einmal je Gerät, nicht für erfahrene Konten
function introAuto() {
  if (INTRO.on || (typeof WAECHTER !== 'undefined' && WAECHTER)) return;
  try {
    if (localStorage.getItem(INTRO.key) === '1') return;
    if (navigator.webdriver && localStorage.getItem('seelenstein.titelTest') !== '1') return;
  } catch (e) { return; }
  const p = game.player;
  if (!p || p.level !== 1 || p.xp > 0) return;
  try {
    if (typeof listSaves === 'function' && listSaves().some((sv) => sv && sv.level >= INTRO.expert)) return;
  } catch (e) { /* ohne Liste wie neu */ }
  // warten, bis das Ladebild weg ist und keine Nachfrage und kein Fenster offen (Seite wählen, Passwort, Tagesbelohnung …),
  // dann kurz durchatmen
  // Reihenfolge: Die Tagesbelohnung öffnet sich 1,5 s nach dem Eintritt von selbst (oberflaeche.js, enterGame) – darum
  // frühestens nach 3 s schauen, sonst kämen beide gleichzeitig. Ist sie offen, wartet die Einführung, bis sie zu ist.
  let calm = 0;
  let ticks = 0;
  clearInterval(INTRO.wait);
  INTRO.wait = setInterval(() => {
    if (!game.running || game.player !== p) { clearInterval(INTRO.wait); return; }
    ticks++;
    // auch erst, wenn kein Fenster offen ist (z. B. die Tagesbelohnung, die neue Figuren gleich zu Beginn sehen)
    const busy = (typeof MAPLOAD !== 'undefined' && MAPLOAD.on) || document.getElementById('ssDialog') || (typeof portraitQuery !== 'undefined' && portraitQuery.matches) ||
      (typeof ui !== 'undefined' && ui.anyPanelOpen && ui.anyPanelOpen());
    calm = busy ? 0 : calm + 1;
    if (calm >= 6 && ticks >= 12) introStart(false);
  }, 250);
}

if (typeof startGame === 'function') {
  const _introStartGame = startGame;
  // eslint-disable-next-line no-global-assign
  startGame = function (save, slot) {
    const r = _introStartGame.apply(this, arguments);
    try { if (game.running) introAuto(); } catch (e) { /* Einführung ist nur ein Zusatz */ }
    return r;
  };
}

// Knopf in der Hilfe
(function introHelpButton() {
  const help = document.querySelector('#panelHelp .help-wiki');
  if (!help) return;
  const p = document.createElement('p');
  p.className = 'help-wiki help-intro';
  p.innerHTML = '<button type="button" class="btn btn-ghost" id="btnIntro">🧭 Einführung starten</button> <span>Kurzer Rundgang: wo was ist, was der Schmied macht und mehr.</span>';
  help.after(p);
  p.querySelector('button').addEventListener('click', () => {
    if (typeof ui !== 'undefined') ui.closePanels();
    introStart(true);
  });
})();
