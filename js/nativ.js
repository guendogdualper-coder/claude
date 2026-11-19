// App-Brücke (seit 13.79): Läuft Seelenstein in der iPhone/iPad-App (Capacitor, Ordner ios/), stellt Capacitor
// window.Capacitor bereit und die nativen Plugins unter Capacitor.Plugins.<Name> – ohne npm-Pakete im Spiel.
// Nur dann schaltet diese Datei ein:
//   - Haptik: navigator.vibrate (gibt es in iOS nicht) wird auf das Taptic Engine umgeleitet, dazu kurze Stöße bei
//     harten Treffern, beim Tod und beim Stufenaufstieg. Alles hängt an der Einstellung „Vibration“.
//   - Erinnerung an die Tagesbelohnung als lokale Mitteilung (freiwillig: einmal fragen, im Fenster
//     „Tagesbelohnung“ jederzeit an- und abschaltbar). Kein Server, keine Push-Nachrichten.
//   - „Freunde einladen“ auf dem Startbildschirm (iOS-Teilen-Menü) statt „Als App installieren“
//   - Links in neuen Fenstern (Wiki, Datenschutz, Regeln …) öffnen im In-App-Browser (Safari-Ansicht)
//   - Im Hintergrund (Homebutton, Anruf) Ton und Musik anhalten und den Spielstand sichern
//   - Hinweise, die in der App keinen Sinn ergeben (App installieren, Umzug auf neue Adresse), ausblenden
// Im normalen Browser (auch Safari, Android-App, PC) passiert hier nichts.

(function nativApp() {
  'use strict';
  const cap = window.Capacitor;
  if (!cap || typeof cap.isNativePlatform !== 'function' || !cap.isNativePlatform()) return;
  const P = cap.Plugins || {};
  const hat = (name) => !!P[name] && (typeof cap.isPluginAvailable !== 'function' || cap.isPluginAvailable(name));
  const leise = (pr) => { if (pr && typeof pr.catch === 'function') pr.catch(() => {}); };

  // Englisch, sobald eine andere Sprache als Deutsch gewählt ist (die Wörterbücher kennen diese Texte nicht)
  const deutsch = () => typeof i18n === 'undefined' || !i18n.lang || i18n.lang === 'de';
  const tx = (de, en) => (deutsch() ? de : en);

  // Eigene Einstellungen der App (nur dieses Gerät)
  const KEY = 'seelenstein.nativ';
  const stand = (() => {
    try { return { erinnerung: null, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { return { erinnerung: null }; }
  })();
  const sichern = () => { try { localStorage.setItem(KEY, JSON.stringify(stand)); } catch (e) { /* privat */ } };

  // ---------- Aussehen: App-Kennzeichen am <html>, Hinweise ausblenden ----------
  document.documentElement.classList.add('nativ-app', 'nativ-' + (typeof cap.getPlatform === 'function' ? cap.getPlatform() : 'app'));
  const css = document.createElement('style');
  css.textContent =
    '.nativ-app #installBox, .nativ-app #umzugHinweis { display: none !important; }' +
    '.nativ-einladen { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; margin-top: 6px; }' +
    '.nativ-erinnerung { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; margin: 10px 0 0; }' +
    '.nativ-frage { position: fixed; inset: 0; z-index: 100000; display: flex; align-items: center; justify-content: center;' +
    ' background: rgba(0,0,0,.55); padding: 16px; }' +
    '.nativ-frage > div { max-width: 440px; background: #1d1810; color: #f3e3b5; border: 1px solid #c9a24a; border-radius: 12px;' +
    ' padding: 16px 18px; box-shadow: 0 8px 30px rgba(0,0,0,.6); font: 15px/1.45 system-ui, sans-serif; }' +
    '.nativ-frage h3 { margin: 0 0 6px; font-size: 18px; color: #f1d58a; }' +
    '.nativ-frage .knoepfe { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; margin-top: 12px; }';
  (document.head || document.documentElement).appendChild(css);

  // ---------- Haptik ----------
  const vibrationErlaubt = () => typeof opts === 'undefined' || opts.vibrate !== false;
  let letzterStoss = 0;
  function stoss(art) {
    if (!hat('Haptics') || !vibrationErlaubt()) return;
    const H = P.Haptics;
    if (art === 'erfolg') leise(H.notification({ type: 'SUCCESS' }));
    else if (art === 'fehler') leise(H.notification({ type: 'ERROR' }));
    else leise(H.impact({ style: art === 'schwer' ? 'HEAVY' : art === 'mittel' ? 'MEDIUM' : 'LIGHT' }));
  }
  // navigator.vibrate(ms | [an, aus, an, …]) → kurze Stöße. Das Spiel fragt vorher selbst opts.vibrate ab (buzz()).
  if (hat('Haptics') && typeof navigator.vibrate !== 'function') {
    const vibrate = function (muster) {
      const teile = Array.isArray(muster) ? muster : [muster];
      let t = 0;
      teile.forEach((ms, i) => {
        ms = Math.max(0, Number(ms) || 0);
        if (i % 2 === 0 && ms > 0) {
          const art = ms >= 90 ? 'schwer' : ms >= 35 ? 'mittel' : 'leicht';
          if (t === 0) stoss(art); else setTimeout(() => stoss(art), t);
        }
        t += ms;
      });
      return true;
    };
    try { Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true, writable: true }); } catch (e) { /* egal */ }
  }

  // Harte Treffer (ab 8 % des Lebens), Tod und Stufenaufstieg. Die Spielfunktionen bleiben unverändert, sie werden
  // nur umhüllt: vorher/nachher vergleichen.
  if (typeof window.damagePlayer === 'function') {
    const original = window.damagePlayer;
    window.damagePlayer = function () {
      const p = typeof game !== 'undefined' ? game.player : null;
      const vorher = p ? p.hp : 0;
      const warTot = p ? !!p.dead : false;
      const r = original.apply(this, arguments);
      try {
        if (p && !warTot) {
          if (p.dead) stoss('fehler');
          else {
            const max = (game.stats && game.stats.maxHp) || p.maxHp || 100;
            const anteil = (vorher - p.hp) / max;
            const jetzt = Date.now();
            if (anteil >= 0.08 && jetzt - letzterStoss > 250) {
              letzterStoss = jetzt;
              stoss(anteil >= 0.25 ? 'schwer' : 'mittel');
            }
          }
        }
      } catch (e) { /* nie das Spiel stören */ }
      return r;
    };
  }
  if (typeof window.gainXp === 'function') {
    const original = window.gainXp;
    window.gainXp = function () {
      const p = typeof game !== 'undefined' ? game.player : null;
      const vorher = p ? p.level : 0;
      const r = original.apply(this, arguments);
      try { if (p && p.level > vorher) stoss('erfolg'); } catch (e) { /* egal */ }
      return r;
    };
  }

  // ---------- Erinnerung an die Tagesbelohnung (lokale Mitteilung) ----------
  const ERINNERUNG_ID = 7001;
  const LN = () => (hat('LocalNotifications') ? P.LocalNotifications : null);

  // 24 Stunden nach dem Abholen, aber nicht nachts: vor 9 Uhr → 9 Uhr, ab 21 Uhr → 20 Uhr (immer am nächsten Kalendertag,
  // die Belohnung gibt es ab Mitternacht neu)
  function erinnerungsZeit(ab = new Date()) {
    const z = new Date(ab.getTime() + 24 * 3600 * 1000);
    if (z.getHours() < 9) z.setHours(9, 0, 0, 0);
    else if (z.getHours() >= 21) z.setHours(20, 0, 0, 0);
    return z;
  }

  function erinnerungAbbrechen() {
    const ln = LN();
    if (ln) leise(ln.cancel({ notifications: [{ id: ERINNERUNG_ID }] }));
  }

  function erinnerungPlanen() {
    const ln = LN();
    if (!ln || stand.erinnerung !== true) return;
    leise(ln.cancel({ notifications: [{ id: ERINNERUNG_ID }] }).catch(() => {}).then(() => ln.schedule({
      notifications: [{
        id: ERINNERUNG_ID,
        title: 'Seelenstein',
        body: tx('Deine Tagesbelohnung wartet! Hol sie dir, bevor deine Reihe abreißt.',
          'Your daily reward is waiting! Claim it before your streak breaks.'),
        schedule: { at: erinnerungsZeit(), allowWhileIdle: true }
      }]
    })));
  }

  // Ein- oder ausschalten. Beim Einschalten fragt iOS einmal nach der Erlaubnis für Mitteilungen.
  function erinnerungSetzen(an) {
    const ln = LN();
    if (!ln) return Promise.resolve(false);
    if (!an) {
      stand.erinnerung = false;
      sichern();
      erinnerungAbbrechen();
      return Promise.resolve(false);
    }
    return ln.requestPermissions().then((r) => {
      const ok = r && r.display === 'granted';
      stand.erinnerung = ok;
      sichern();
      if (ok) erinnerungPlanen();
      else if (typeof ui !== 'undefined' && ui.log) {
        ui.log(tx('Mitteilungen sind aus. Einschalten: iPhone-Einstellungen → Seelenstein → Mitteilungen.',
          'Notifications are off. Turn them on in Settings → Seelenstein → Notifications.'), 'info');
      }
      return ok;
    }).catch(() => false);
  }

  // Nach dem ersten Abholen in der App einmal fragen (nicht beim Start – erst wenn man weiß, worum es geht)
  function frageErinnerung() {
    if (stand.erinnerung !== null || document.querySelector('.nativ-frage')) return;
    const box = document.createElement('div');
    box.className = 'nativ-frage';
    box.setAttribute('role', 'dialog');
    box.innerHTML = '<div><h3></h3><p></p><div class="knoepfe">' +
      '<button type="button" class="btn btn-ghost" data-a="nein"></button>' +
      '<button type="button" class="btn btn-primary" data-a="ja"></button></div></div>';
    box.querySelector('h3').textContent = tx('Erinnerung an die Tagesbelohnung?', 'Daily reward reminder?');
    box.querySelector('p').textContent = tx(
      'Seelenstein kann dich morgen mit einer Mitteilung erinnern, damit deine Reihe nicht abreißt. Einmal am Tag, ' +
      'jederzeit im Fenster „Tagesbelohnung“ abschaltbar.',
      'Seelenstein can remind you tomorrow with a notification so your streak continues. Once a day, ' +
      'you can turn it off any time in the “Daily reward” window.');
    box.querySelector('[data-a="nein"]').textContent = tx('Nein, danke', 'No, thanks');
    box.querySelector('[data-a="ja"]').textContent = tx('Ja, erinnern', 'Yes, remind me');
    box.addEventListener('click', (e) => {
      const a = e.target && e.target.getAttribute && e.target.getAttribute('data-a');
      if (!a) return;
      box.remove();
      erinnerungSetzen(a === 'ja').then(() => {
        const fenster = document.getElementById('panelDaily');
        if (fenster && !fenster.hidden && typeof window.renderDaily === 'function') window.renderDaily();
      });
    });
    document.body.appendChild(box);
  }

  if (LN() && typeof window.claimDaily === 'function') {
    const original = window.claimDaily;
    window.claimDaily = function () {
      const r = original.apply(this, arguments);
      try {
        if (r) {
          stoss('erfolg');
          if (stand.erinnerung === true) erinnerungPlanen();
          else if (stand.erinnerung === null) setTimeout(frageErinnerung, 1200);
        }
      } catch (e) { /* egal */ }
      return r;
    };
  }

  // Schalter im Fenster „Tagesbelohnung“
  if (LN() && typeof window.renderDaily === 'function') {
    const original = window.renderDaily;
    window.renderDaily = function () {
      const r = original.apply(this, arguments);
      try {
        const body = document.getElementById('dailyBody');
        if (body && !body.querySelector('.nativ-erinnerung')) {
          const zeile = document.createElement('p');
          zeile.className = 'nativ-erinnerung hint-text';
          const an = stand.erinnerung === true;
          zeile.innerHTML = '<span></span><button type="button" class="btn btn-ghost"></button>';
          zeile.querySelector('span').textContent = tx('🔔 Tägliche Erinnerung (Mitteilung): ', '🔔 Daily reminder (notification): ') +
            (an ? tx('an', 'on') : tx('aus', 'off'));
          zeile.querySelector('button').textContent = an ? tx('Ausschalten', 'Turn off') : tx('Einschalten', 'Turn on');
          zeile.querySelector('button').addEventListener('click', () => {
            erinnerungSetzen(!an).then(() => window.renderDaily());
          });
          body.appendChild(zeile);
        }
      } catch (e) { /* egal */ }
      return r;
    };
  }

  // ---------- Freunde einladen (Teilen-Menü) ----------
  function einladenKnopf() {
    if (!hat('Share') || document.getElementById('nativEinladen')) return;
    const install = document.getElementById('installBox');
    if (!install || !install.parentNode) return;
    const box = document.createElement('div');
    box.className = 'nativ-einladen';
    box.innerHTML = '<button id="nativEinladen" class="btn btn-ghost" type="button"></button>';
    const knopf = box.querySelector('button');
    knopf.textContent = tx('📨 Freunde einladen', '📨 Invite friends');
    knopf.addEventListener('click', () => {
      leise(P.Share.share({
        title: 'Seelenstein',
        text: tx('Spiel mit mir Seelenstein – ein kostenloses 3D-Rollenspiel mit Gilden, Dungeons und Endbossen:',
          'Play Seelenstein with me – a free 3D RPG with guilds, dungeons and bosses:'),
        url: 'https://seelenstein.online/',
        dialogTitle: tx('Freunde einladen', 'Invite friends')
      }));
    });
    install.parentNode.insertBefore(box, install);
  }

  // ---------- Links in neuen Fenstern → In-App-Browser ----------
  if (hat('Browser')) {
    document.addEventListener('click', (e) => {
      const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || e.defaultPrevented) return;
      let url;
      try { url = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return; // mailto: usw. macht iOS selbst
      const fremd = url.host !== location.host;
      if (a.target !== '_blank' && !fremd) return;
      e.preventDefault();
      leise(P.Browser.open({ url: url.href, toolbarColor: '#12100C', presentationStyle: 'fullscreen' }));
    }, true);
  }

  // ---------- Hintergrund: Ton aus, Spielstand sichern ----------
  function tonPause(an) {
    try {
      if (typeof sfx === 'undefined' || !sfx.ctx) return;
      if (an) leise(sfx.ctx.suspend());
      else if (!document.hidden && sfx.ctx.state !== 'running') leise(sfx.ctx.resume());
    } catch (e) { /* egal */ }
  }
  if (hat('App')) {
    leise(P.App.addListener('appStateChange', (st) => {
      const aktiv = !!(st && st.isActive);
      tonPause(!aktiv);
      if (!aktiv) {
        try { if (typeof game !== 'undefined' && game.running && typeof saveGame === 'function') saveGame(); } catch (e) { /* egal */ }
      } else {
        // iOS meldet die Fenstergröße nach der Rückkehr manchmal zu spät: wie nach dem Drehen nachmessen
        try { if (typeof resizeSoon === 'function') resizeSoon(); } catch (e) { /* egal */ }
      }
    }));
  }

  // ---------- Start ----------
  function bereit() {
    einladenKnopf();
    if (hat('SplashScreen')) leise(P.SplashScreen.hide({ fadeOutDuration: 250 }));
    if (hat('StatusBar')) leise(P.StatusBar.hide());
    // war die Erinnerung an, aber iOS-Mitteilungen wurden inzwischen in den Einstellungen abgeschaltet: merken
    const ln = LN();
    if (ln && stand.erinnerung === true) {
      leise(ln.checkPermissions().then((r) => {
        if (r && r.display === 'denied') { stand.erinnerung = false; sichern(); }
      }));
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bereit);
  else bereit();
})();
