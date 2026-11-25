'use strict';
// Benachrichtigungen (Erinnerungen) ohne Server. Einstellung „Benachrichtigungen“ unter Einstellungen → „Figur und
// Spiel“, Standard: aus. Ausführlich mit allen Regeln und Plattformen: docs/push-nachrichten.md.
//
// Wo es sie gibt:
// - iPhone/iPad-App (Capacitor, Ordner ios/): lokale Mitteilungen über das Plugin LocalNotifications (seit dem ersten
//   App-Build enthalten). iOS zeigt sie auch bei geschlossener App; während man spielt, bleiben sie still
//   (foreground: false). Beim Einschalten fragt iOS einmal nach der Erlaubnis.
// - Windows-App (Electron, Ordner desktop/): Systemmeldungen über die Brücke window.seelensteinDesktop
//   (desktop/preload.js, Zeitgeber in desktop/meldungen.js), solange das Programm läuft – auch minimiert. Ältere
//   Desktop-Versionen ohne Brücke: keine Einstellung.
// - Browser und Android-App (TWA): nichts. Ohne Push-Server kann eine geschlossene Seite nichts melden, darum fehlt
//   die Einstellung dort ganz.
//
// Geplant wird lokal: bei jedem Spielstart, beim Abholen der Tagesbelohnung, beim Umschalten der Einstellung und alle
// 10 Minuten, solange gespielt wird (dann zählen „Tagesbelohnung“ und „Pause“ ab dem letzten Spielen):
//   Tagesbelohnung  abgeholt: morgen zur selben Uhrzeit · noch offen: in drei Stunden (spätestens 21 Uhr)
//   Doppel-EP       Beginn des nächsten Doppel-EP-Wochenendes (Freitag 18 Uhr, ereignisse.js)
//   Saisonende      drei Tage vor dem Ende der PvP-Saison (ereignisse.js), nur mit Rangkämpfen
//   Weltboss        ab Stufe WB.minLevel: zehn Minuten vor dem nächsten Weltboss am Abend (weltboss.js, fester Zeitplan)
//   Pause           drei Tage nach dem letzten Spielen einmal „Lange nicht gesehen!“
// Regeln: nie zwischen 22 und 9 Uhr (früh → 9 Uhr, spät → 21 Uhr desselben Tages), höchstens zwei am Tag, dazwischen
// mindestens zwei Stunden. Wer wichtiger ist, kommt zuerst (Saisonende > Doppel-EP > Tagesbelohnung > Pause > Weltboss);
// die anderen weichen um zwei oder vier Stunden aus oder entfallen. Texte in der Spielsprache (trText, js/sprachen/),
// gebaut nur aus den festen Vorlagen unten (TX) und festen Spieldaten (Name und Karte des Weltbosses) – nie aus Namen
// von Spielern, Chat oder anderen Netzdaten.
// Feste Nummern je Art (9101 …); die frühere Tageserinnerung aus js/nativ.js (7001) wird übernommen und gelöscht.

(function benachrichtigungen() {
  // ---------- Texte (deutsch; Übersetzungen in den Wörterbüchern) ----------
  const TX = {
    name: 'Benachrichtigungen',
    hinweis: 'Erinnerungen an die Tagesbelohnung, Doppel-EP-Wochenenden, das Ende der PvP-Saison, Weltbosse und nach ein paar Tagen Pause. Höchstens zwei am Tag, nie nachts und nicht, während du spielst. Geplant wird nur auf diesem Gerät, ohne Server.',
    desktop: 'Die Windows-App meldet sich, solange sie läuft – auch minimiert.',
    verweigert: 'Mitteilungen sind in den Geräte-Einstellungen ausgeschaltet: Einstellungen → Seelenstein → Mitteilungen.',
    naechste: 'Als Nächstes',
    frageTitel: 'Benachrichtigungen einschalten?',
    frageText: 'Seelenstein kann dich an die Tagesbelohnung, Doppel-EP-Wochenenden und Weltbosse erinnern – höchstens zweimal am Tag und nie nachts. Abschalten kannst du das jederzeit in den Einstellungen unter „Figur und Spiel“.',
    nein: 'Nein, danke',
    ja: 'Ja, erinnern',
    an: 'Benachrichtigungen sind an',
    aus: 'Benachrichtigungen sind aus',
    tag: 'Deine Tagesbelohnung ist wieder bereit!',
    tag7: 'Deine Tagesbelohnung ist wieder bereit – heute wartet die Heldentruhe!',
    tagOffen: 'Deine heutige Tagesbelohnung wartet noch auf dich!',
    saisonTitel: 'Die PvP-Saison endet in drei Tagen',
    saisonText: 'Jetzt noch Rangkämpfe bestreiten – am Saisonende zählt deine beste Rangstufe.',
    pauseTitel: 'Lange nicht gesehen!',
    pauseText: 'Deine Abenteuer und deine Tagesbelohnung warten auf dich.'
  };
  // Namen der Arten in der Liste „Als Nächstes“ (bis auf „pause“ schon in den Wörterbüchern)
  const ART_NAME = { tag: 'Tagesbelohnung', ep: 'Doppel-EP-Wochenende', saison: 'Saisonende', boss: 'Weltboss', pause: TX.pauseTitel };

  const IDS = { tag: 9101, ep: 9102, saison: 9103, boss: 9104, pause: 9106 };
  const ALT_ID = 7001; // frühere Erinnerung an die Tagesbelohnung (js/nativ.js)
  const ALLE = [ALT_ID, ...Object.values(IDS)];
  const REGEL = {
    morgen: 9, nacht: 22, spaet: 21, // erlaubt 9:00–21:59; zu spät → 21 Uhr desselben Tages
    proTag: 2, abstand: 2 * 3600e3, vorlauf: 2 * 60e3,
    offen: 3 * 3600e3, // Tagesbelohnung noch nicht abgeholt: so viel später erinnern
    pause: 3, saisonVor: 3, bossVor: 10 * 60e3, bossAbend: 17,
    takt: 10 * 60e3
  };
  const tx = (s) => (typeof trText === 'function' ? trText(s) : s);
  const leise = (pr) => (pr && typeof pr.then === 'function' ? pr.then((x) => x, () => undefined) : Promise.resolve(pr));

  // ---------- Zeit ----------
  const tagKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  // gleicher Kalendertag (plus tage) zur Uhrzeit h:m, Ortszeit (auch über die Zeitumstellung richtig)
  const um = (t, h, m = 0, tage = 0) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + tage, h, m, 0, 0).getTime(); };
  const tagsueberOk = (t) => { const h = new Date(t).getHours(); return h >= REGEL.morgen && h < REGEL.nacht; };
  // nachts nie: vor 9 Uhr → 9 Uhr, ab 22 Uhr → 21 Uhr (beides am selben Tag)
  function tagsueber(t) {
    const h = new Date(t).getHours();
    if (h < REGEL.morgen) return um(t, REGEL.morgen);
    if (h >= REGEL.nacht) return um(t, REGEL.spaet);
    return t;
  }
  // Ausweichzeiten am selben Tag: t, +2 h, −2 h, +4 h, −4 h (nur tagsüber)
  function ausweichen(t) {
    const out = [];
    for (const d of [0, 2, -2, 4, -4]) {
      const z = t + d * 3600e3;
      if (tagKey(z) === tagKey(t) && tagsueberOk(z)) out.push(z);
    }
    return out;
  }
  // dieselbe Uhrzeit wie jetzt, tage später
  const gleicheZeit = (jetzt, tage) => { const d = new Date(jetzt); return um(jetzt, d.getHours(), d.getMinutes(), tage); };

  // ---------- Plan: welche Erinnerung wann (rein rechnerisch, ohne Plattform) ----------
  // jetzt: Zeitpunkt (ms), p: Spieler (level, daily, pvp), vorher: Zeiten früherer Pläne, die schon fällig waren (zählen
  // für „zwei am Tag“ und den Abstand mit). Ergebnis: [{ id, art, at, title, body }] nach Zeit sortiert.
  function planen(jetzt, p, vorher) {
    const k = [];
    if (p && typeof dailyKey === 'function') {
      const d = p.daily || {};
      const abgeholt = d.last === dailyKey(new Date(jetzt));
      let zeit, text;
      if (abgeholt) {
        zeit = tagsueber(gleicheZeit(jetzt, 1));
        text = ((d.streak | 0) % 7) + 1 === 7 ? TX.tag7 : TX.tag;
      } else {
        zeit = tagsueber(Math.min(jetzt + REGEL.offen, um(jetzt, REGEL.spaet)));
        text = TX.tagOffen;
        // heute zu spät dafür: morgen zur selben Uhrzeit (dann gibt es wieder eine neue)
        if (zeit < jetzt + 30 * 60e3) { zeit = tagsueber(gleicheZeit(jetzt, 1)); text = TX.tag; }
      }
      k.push({ id: IDS.tag, art: 'tag', prio: 3, zeiten: ausweichen(zeit), titel: 'Tagesbelohnung', text });
    }
    if (typeof evEpNaechstes === 'function') {
      const w = evEpNaechstes(jetzt);
      if (w && w.from - jetzt < 40 * 864e5) {
        k.push({ id: IDS.ep, art: 'ep', prio: 4, zeiten: [tagsueber(w.from)], titel: 'Doppel-EP-Wochenende!', text: 'Doppelte Erfahrung bis Sonntag 24 Uhr' });
      }
    }
    const A = p && p.pvp;
    if (A && (A.w | 0) + (A.l | 0) > 0 && typeof evSaison === 'function') {
      const S = evSaison(jetzt);
      k.push({ id: IDS.saison, art: 'saison', prio: 5, zeiten: [tagsueber(S.until - REGEL.saisonVor * 864e5)], titel: TX.saisonTitel, text: TX.saisonText });
    }
    if (p && typeof wbEvent === 'function' && typeof WB !== 'undefined' && (p.level | 0) >= WB.minLevel) {
      const boss = weltbossKandidat(jetzt);
      if (boss) k.push(boss);
    }
    k.push({ id: IDS.pause, art: 'pause', prio: 2, zeiten: ausweichen(tagsueber(gleicheZeit(jetzt, REGEL.pause))), titel: TX.pauseTitel, text: TX.pauseText });

    // Auswahl: Wichtigste zuerst, höchstens zwei am Tag, mindestens zwei Stunden Abstand, nur tagsüber und in der Zukunft
    k.sort((a, b) => b.prio - a.prio);
    const plan = [];
    const jeTag = new Map();
    const frueher = (Array.isArray(vorher) ? vorher : []).filter((t) => Number.isFinite(t) && t <= jetzt);
    for (const t of frueher) jeTag.set(tagKey(t), (jeTag.get(tagKey(t)) || 0) + 1);
    for (const c of k) {
      for (const o of c.zeiten) {
        // eine Zeit (Zahl) oder { z, text } mit eigenem Text (Weltboss: jede Zeit ein anderer Boss)
        const z = typeof o === 'number' ? o : o.z;
        if (!(z > jetzt + REGEL.vorlauf) || !tagsueberOk(z)) continue;
        const tag = tagKey(z);
        if ((jeTag.get(tag) || 0) >= REGEL.proTag) continue;
        if (plan.some((x) => Math.abs(x.at - z) < REGEL.abstand) || frueher.some((t) => Math.abs(t - z) < REGEL.abstand)) continue;
        plan.push({ id: c.id, art: c.art, at: z, title: tx(c.titel), body: tx((typeof o === 'object' && o.text) || c.text) });
        jeTag.set(tag, (jeTag.get(tag) || 0) + 1);
        break;
      }
    }
    return plan.sort((a, b) => a.at - b.at);
  }

  // Weltboss: der nächste Abend (Meldung ab 17 Uhr), ausweichen auf frühere Weltbosse desselben Tages (ab 12 Uhr)
  function weltbossKandidat(jetzt) {
    const erstes = wbEvent(jetzt);
    let wahl = null;
    const alle = [];
    for (let i = 0; i < 24; i++) {
      const e = wbEvent(erstes.start + i * WB.every);
      const z = e.start - REGEL.bossVor;
      if (!(z > jetzt + REGEL.vorlauf) || !tagsueberOk(z)) continue;
      alle.push({ e, z });
      if (!wahl && new Date(z).getHours() >= REGEL.bossAbend) wahl = { e, z };
    }
    if (!wahl) return null;
    const tag = tagKey(wahl.z);
    const wahlen = [wahl, ...alle.filter((x) => x !== wahl && tagKey(x.z) === tag && x.z < wahl.z && new Date(x.z).getHours() >= 12)
      .sort((a, b) => b.z - a.z)];
    // Text je Zeit: Name des Bosses · Karte (der Zeitplan wechselt Boss und Karte mit jedem Erscheinen). Nur aus den
    // festen Spieldaten (die vier Weltbosse aus WB.types, Kartennamen aus WORLD_MAPS), nie aus Netz- oder Spielerdaten;
    // passt etwas nicht, bleibt es beim festen „Weltboss“.
    const text = (e) => {
      const fest = (s) => (typeof s === 'string' && s.length <= 60 && !/[<>]/.test(s) ? s : '');
      const typ = Object.values(WB.types || {}).includes(e.type) && typeof MONSTER_TYPES !== 'undefined' ? MONSTER_TYPES[e.type] : null;
      const karte = typeof wbMapName === 'function' ? fest(wbMapName(e.map)) : '';
      const name = typ ? fest(typ.name) : '';
      return name ? [name, karte].filter(Boolean).join(' · ') : '';
    };
    return { id: IDS.boss, art: 'boss', prio: 1, zeiten: wahlen.map((x) => ({ z: x.z, text: text(x.e) })),
      titel: `Weltboss in ${Math.round(REGEL.bossVor / 60000)} Min.`, text: 'Weltboss' };
  }

  // ---------- Ratgeber (auf allen Plattformen, nur deutsch) ----------
  if (typeof RATGEBER_WISSEN !== 'undefined' && Array.isArray(RATGEBER_WISSEN)) {
    RATGEBER_WISSEN.push({
      c: 'einstellungen',
      q: 'Kann mich das Spiel erinnern (Benachrichtigungen)?',
      a: () => {
        const wb = typeof WB !== 'undefined' ? WB.minLevel : 75;
        const ab = typeof EV !== 'undefined' ? EV.ep.ab : 18;
        return 'Ja, in der <b>iPhone/iPad-App</b> und in der <b>Windows-App</b>: Einstellungen → „Figur und Spiel“ → ' +
          '<b>Benachrichtigungen</b> einschalten (Standard: aus; das iPhone fragt dabei einmal nach der Erlaubnis). Dann erinnert ' +
          'dich Seelenstein an die <b>Tagesbelohnung</b> (am nächsten Tag etwa zu der Uhrzeit, zu der du zuletzt gespielt hast), ' +
          `an den Beginn jedes <b>Doppel-EP-Wochenendes</b> (Freitag ${ab} Uhr), ${REGEL.saisonVor} Tage vor dem <b>Ende der PvP-Saison</b> ` +
          `(wenn du schon Rangkämpfe hattest), ab Stufe ${wb} an den nächsten <b>Weltboss</b> am Abend (${Math.round(REGEL.bossVor / 60000)} Minuten vorher) ` +
          `und nach ${REGEL.pause} Tagen Pause einmal mit einem freundlichen Gruß. Höchstens ${REGEL.proTag} am Tag, nie zwischen ` +
          `${REGEL.nacht} und ${REGEL.morgen} Uhr und nicht, während du spielst. Geplant wird nur auf deinem Gerät, ohne Server; ` +
          'Ausschalten löscht alle geplanten. Die Windows-App meldet sich, solange sie läuft (auch minimiert). ' +
          '<b>Im Browser und in der Android-App</b> gibt es keine Benachrichtigungen – dafür bräuchte das Spiel einen eigenen Push-Server.';
      },
      k: 'benachrichtigung benachrichtigungen mitteilung mitteilungen erinnerung erinnerungen erinnern push nachricht nachrichten notification iphone ipad windows app tagesbelohnung weltboss doppel ep wochenende saison pause'
    });
  }

  // ---------- Plattform ----------
  const cap = window.Capacitor;
  const nativ = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  const LN = nativ && cap.Plugins && cap.Plugins.LocalNotifications &&
    (typeof cap.isPluginAvailable !== 'function' || cap.isPluginAvailable('LocalNotifications')) ? cap.Plugins.LocalNotifications : null;
  const dtb = !LN && window.seelensteinDesktop && window.seelensteinDesktop.benachrichtigungen;
  const DESKTOP = dtb && typeof dtb.planen === 'function' ? dtb : null;
  const ZIEL = LN ? 'app' : DESKTOP ? 'desktop' : null;

  // Für Tests und Fehlersuche (im Browser nur die reine Rechnung)
  const api = { ziel: ZIEL, planen, IDS, REGEL, TX, plan: () => [] };
  window.BENACHRICHTIGUNG = api;
  if (!ZIEL) return;

  // ---------- Einstellung (nur dieses Gerät) ----------
  const KEY = 'seelenstein.benachrichtigungen';
  const stand = (() => {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    if (s && typeof s === 'object') {
      return { an: s.an === true, gefragt: s.gefragt === true, verweigert: false, geplant: Array.isArray(s.geplant) ? s.geplant.filter(Number.isFinite).slice(-12) : [] };
    }
    // erster Start mit dieser Datei: die frühere Tageserinnerung der iPhone-App übernehmen (js/nativ.js)
    const neu = { an: false, gefragt: false, verweigert: false, geplant: [] };
    try {
      const alt = JSON.parse(localStorage.getItem('seelenstein.nativ') || '{}');
      if (alt && alt.erinnerung === true) { neu.an = true; neu.gefragt = true; }
      else if (alt && alt.erinnerung === false) neu.gefragt = true;
    } catch (e) { /* ohne */ }
    try { localStorage.setItem(KEY, JSON.stringify({ an: neu.an, gefragt: neu.gefragt })); } catch (e) { /* privat */ }
    return neu;
  })();
  // geplant: Zeiten des zuletzt geplanten (damit schon gesendete heute bei „zwei am Tag“ mitzählen)
  const sichern = () => { try { localStorage.setItem(KEY, JSON.stringify({ an: stand.an, gefragt: stand.gefragt, geplant: stand.geplant })); } catch (e) { /* privat */ } };
  let letzterPlan = [];
  api.stand = stand;
  api.plan = () => letzterPlan.slice();

  // ---------- An die Plattform geben ----------
  function anwenden(plan) {
    if (LN) {
      // Gleiche Nummer ersetzt die alte Meldung; gelöscht werden nur Nummern, die nicht mehr im Plan stehen
      // (iOS löscht im Hintergrund – nie dieselbe Nummer löschen und gleich neu planen)
      const weg = ALLE.filter((id) => !plan.some((n) => n.id === id)).map((id) => ({ id }));
      const auf = [];
      if (weg.length) auf.push(leise(LN.cancel({ notifications: weg })));
      if (plan.length) {
        auf.push(leise(LN.schedule({
          notifications: plan.map((n) => ({
            id: n.id, title: n.title, body: n.body,
            schedule: { at: new Date(n.at), allowWhileIdle: true },
            foreground: false, silent: true, // während man spielt nichts einblenden (silent: ältere Plugin-Fassungen)
            extra: { art: n.art }
          }))
        })));
      }
      return Promise.all(auf);
    }
    return leise(DESKTOP.planen(plan.map((n) => ({ id: n.id, at: n.at, title: n.title, body: n.body }))));
  }
  function loeschen() {
    letzterPlan = [];
    if (LN) return leise(LN.cancel({ notifications: ALLE.map((id) => ({ id })) }));
    return leise(typeof DESKTOP.loeschen === 'function' ? DESKTOP.loeschen() : DESKTOP.planen([]));
  }

  const spielerJetzt = () => (typeof game !== 'undefined' && game.running && game.player ? game.player : null);
  const fingerabdruck = (p) => {
    const d = p.daily || {};
    const A = p.pvp || {};
    return [d.last, typeof dailyKey === 'function' ? dailyKey() : '', (p.level | 0) >= (typeof WB !== 'undefined' ? WB.minLevel : 75), (A.w | 0) + (A.l | 0) > 0].join('|');
  };
  const lauf = { spieler: null, letzt: undefined, fp: '', geplant: 0 };

  async function planJetzt() {
    const p = spielerJetzt();
    if (!stand.an || !p) return letzterPlan;
    if (LN) {
      let recht = '';
      try { const r = await LN.checkPermissions(); recht = r && r.display; } catch (e) { /* weiter */ }
      stand.verweigert = recht === 'denied';
      // noch nie gefragt (z. B. App neu installiert): nicht überraschend fragen – Schalter wieder aus
      if (recht === 'prompt') { stand.an = false; sichern(); }
      if (recht === 'denied' || recht === 'prompt') { letzterPlan = []; auffrischen(); return letzterPlan; }
    }
    const jetzt = Date.now();
    // was ein früherer Plan heute schon gemeldet haben kann (fällig, höchstens einen Tag alt)
    const vorher = stand.geplant.filter((t) => t <= jetzt && jetzt - t < 864e5);
    letzterPlan = planen(jetzt, p, vorher);
    stand.geplant = vorher.concat(letzterPlan.map((n) => n.at));
    sichern();
    lauf.geplant = jetzt;
    lauf.fp = fingerabdruck(p);
    await anwenden(letzterPlan);
    auffrischen();
    return letzterPlan;
  }
  let planTimer = 0;
  function neuPlanen() {
    clearTimeout(planTimer);
    planTimer = setTimeout(() => { planJetzt().catch(() => {}); }, 250);
  }
  api.neuPlanen = planJetzt;

  // Ein- oder ausschalten. Ein: iOS fragt nach der Erlaubnis (einmal; wer „Nicht erlauben“ gewählt hat, muss es in
  // den iPhone-Einstellungen ändern). Aus: alle geplanten Erinnerungen löschen.
  async function setzen(an) {
    stand.gefragt = true;
    if (!an) {
      stand.an = false;
      stand.verweigert = false;
      stand.geplant = [];
      sichern();
      await loeschen();
      log(TX.aus, 'info');
      auffrischen();
      return false;
    }
    let ok = false;
    try {
      if (LN) { const r = await LN.requestPermissions(); ok = !!r && r.display === 'granted'; }
      else ok = typeof DESKTOP.unterstuetzt === 'function' ? !!(await DESKTOP.unterstuetzt()) : true;
    } catch (e) { ok = false; }
    stand.an = ok;
    stand.verweigert = !ok && !!LN;
    sichern();
    if (ok) {
      log(TX.an, 'success');
      await planJetzt();
    } else log(LN ? TX.verweigert : TX.aus, 'warn');
    auffrischen();
    return ok;
  }
  api.setzen = setzen;
  const log = (t, art) => { if (typeof ui !== 'undefined' && ui.log) ui.log(t, art); };

  // ---------- Takt: Spielstart, Abholen, Stufe, Rangkämpfe, alle 10 Minuten ----------
  // Automatisch nur, solange gespielt wird (am PC: Fenster vorn), damit „morgen zur selben Uhrzeit“ und „drei Tage
  // Pause“ nicht weiterwandern, während die Windows-App minimiert läuft.
  const aktiv = () => document.visibilityState === 'visible' && (ZIEL !== 'desktop' || typeof document.hasFocus !== 'function' || document.hasFocus());
  function takt() {
    const p = spielerJetzt();
    if (!p) { lauf.spieler = null; return; }
    const d = p.daily || {};
    const heute = typeof dailyKey === 'function' ? dailyKey() : '';
    const neu = p !== lauf.spieler;
    // gerade abgeholt (dieselbe Figur, vorher nicht heute): einmal fragen, ob erinnert werden soll
    if (!neu && d.last === heute && lauf.letzt !== heute && !stand.an && !stand.gefragt) setTimeout(frage, 1200);
    lauf.spieler = p;
    lauf.letzt = d.last;
    if (neu) {
      // Spielstart: alte Erinnerungen aus der Mitteilungszentrale nehmen, dann neu planen
      if (LN && typeof LN.removeAllDeliveredNotifications === 'function') leise(LN.removeAllDeliveredNotifications());
      if (stand.an) neuPlanen();
      return;
    }
    if (stand.an && aktiv() && (fingerabdruck(p) !== lauf.fp || Date.now() - lauf.geplant >= REGEL.takt)) neuPlanen();
  }
  setInterval(() => { try { takt(); } catch (e) { /* nächster Takt */ } }, 5000);
  const zurueck = () => { if (stand.an && spielerJetzt() && aktiv()) neuPlanen(); };
  document.addEventListener('visibilitychange', zurueck);
  window.addEventListener('focus', zurueck);

  // ---------- Aussehen ----------
  const css = document.createElement('style');
  css.textContent =
    '.push-plan{padding:2px 0 4px}.push-plan small{font-size:11.5px;color:var(--muted)}' +
    '.push-plan ul{margin:2px 0 0;padding-left:18px;font-size:12px;color:var(--muted)}.push-plan b{color:#f3e3b5;font-weight:600}' +
    '.opt-text small.push-warn{color:#ffb070}' +
    '.push-tag{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;margin:10px 0 0}' +
    '.push-frage{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);padding:16px}' +
    '.push-frage>div{max-width:440px;background:#1d1810;color:#f3e3b5;border:1px solid #c9a24a;border-radius:12px;padding:16px 18px;' +
    'box-shadow:0 8px 30px rgba(0,0,0,.6);font:15px/1.45 system-ui,sans-serif}' +
    '.push-frage h3{margin:0 0 6px;font-size:18px;color:#f1d58a}' +
    '.push-knoepfe{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:12px}';
  (document.head || document.documentElement).appendChild(css);

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const sprache = () => {
    const l = typeof i18n !== 'undefined' && i18n.lang ? i18n.lang : 'de';
    return (typeof I18N_HTML_LANG !== 'undefined' && I18N_HTML_LANG[l]) || l;
  };
  function datum(t) {
    try { return new Date(t).toLocaleString(sprache(), { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return new Date(t).toLocaleString(); }
  }

  // ---------- Einstellungen → „Figur und Spiel“ ----------
  function abschnittHtml() {
    const liste = stand.an && letzterPlan.length
      ? `<div class="push-plan"><small>${esc(TX.naechste)}</small><ul class="no-tr">` +
        letzterPlan.slice(0, 5).map((n) => `<li><b>${esc(datum(n.at))}</b> · ${esc(tx(ART_NAME[n.art] || n.title))}</li>`).join('') + '</ul></div>'
      : '';
    return `<section class="opt-group push-opt" id="optPush"><div class="opt-row"><div class="opt-text"><strong>${esc(TX.name)}</strong>` +
      `<small>${esc(TX.hinweis)}</small>` + (ZIEL === 'desktop' ? `<small>${esc(TX.desktop)}</small>` : '') +
      (stand.verweigert ? `<small class="push-warn">${esc(TX.verweigert)}</small>` : '') +
      `</div><button type="button" class="opt-switch${stand.an ? ' on' : ''}" id="optPushSw" role="switch" aria-checked="${stand.an}" aria-label="${esc(TX.name)}"><i></i></button></div>` +
      liste + '</section>';
  }
  function verdrahten() {
    const b = document.getElementById('optPushSw');
    if (!b || b.dataset.push) return;
    b.dataset.push = '1';
    b.addEventListener('click', () => {
      b.disabled = true;
      setzen(!stand.an).finally(auffrischen);
    });
  }
  function einstellungEinfuegen() {
    const pane = document.querySelector('#optsBody .opt-pane[data-tab="spiel"]');
    if (!pane || pane.querySelector('#optPush')) return;
    const sw = pane.querySelector('[data-sw="dmeter"]');
    const nach = (sw && sw.closest('.opt-group')) || pane.querySelector('.opt-group:not(.quit-group)');
    if (nach) nach.insertAdjacentHTML('afterend', abschnittHtml());
    else pane.insertAdjacentHTML('afterbegin', abschnittHtml());
    verdrahten();
    // war die Erlaubnis inzwischen in den iPhone-Einstellungen entzogen: gleich zeigen
    if (LN && stand.an) {
      leise(LN.checkPermissions()).then((r) => {
        const v = !!r && r.display === 'denied';
        if (v !== stand.verweigert) { stand.verweigert = v; auffrischen(); }
      });
    }
  }
  if (typeof options !== 'undefined' && options && typeof options.render === 'function') {
    const render = options.render;
    options.render = function () {
      const r = render.apply(this, arguments);
      try { einstellungEinfuegen(); } catch (e) { /* die Einstellungen gehen auch ohne */ }
      return r;
    };
  }

  // ---------- Fenster „Tagesbelohnung“: Zeile mit Schalter ----------
  function tageszeile() {
    const body = document.getElementById('dailyBody');
    if (!body || body.querySelector('.push-tag')) return;
    const z = document.createElement('p');
    z.className = 'push-tag hint-text';
    z.innerHTML = '<span></span><button type="button" class="btn btn-ghost"></button>';
    z.querySelector('span').textContent = '🔔 ' + (stand.an ? TX.an : TX.aus);
    const b = z.querySelector('button');
    b.textContent = stand.an ? 'Ausschalten' : 'Einschalten';
    b.addEventListener('click', () => { b.disabled = true; setzen(!stand.an); });
    body.appendChild(z);
  }
  if (typeof window.renderDaily === 'function') {
    const original = window.renderDaily;
    window.renderDaily = function () {
      const r = original.apply(this, arguments);
      try { tageszeile(); } catch (e) { /* egal */ }
      return r;
    };
  }

  // offene Einstellungen und das Fenster „Tagesbelohnung“ zeigen den neuen Stand
  function auffrischen() {
    const alt = document.getElementById('optPush');
    if (alt) {
      alt.insertAdjacentHTML('afterend', abschnittHtml());
      alt.remove();
      verdrahten();
    }
    const zeile = document.querySelector('#dailyBody .push-tag');
    if (zeile) { zeile.remove(); tageszeile(); }
  }

  // ---------- Einmal fragen (nach dem ersten Abholen der Tagesbelohnung) ----------
  function frage() {
    if (stand.an || stand.gefragt || document.querySelector('.push-frage') || !spielerJetzt()) return;
    stand.gefragt = true;
    sichern();
    const box = document.createElement('div');
    box.className = 'push-frage';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.innerHTML = '<div><h3></h3><p></p><div class="push-knoepfe">' +
      '<button type="button" class="btn btn-ghost" data-a="nein"></button>' +
      '<button type="button" class="btn btn-primary" data-a="ja"></button></div></div>';
    box.querySelector('h3').textContent = TX.frageTitel;
    box.querySelector('p').textContent = TX.frageText;
    box.querySelector('[data-a="nein"]').textContent = TX.nein;
    box.querySelector('[data-a="ja"]').textContent = TX.ja;
    box.addEventListener('click', (e) => {
      const k = e.target && e.target.closest ? e.target.closest('[data-a]') : null;
      if (!k) return;
      box.remove();
      if (k.dataset.a === 'ja') setzen(true);
    });
    document.body.appendChild(box);
  }
  api.frage = frage;
})();
