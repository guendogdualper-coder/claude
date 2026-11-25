// App-Brücke (seit 13.79): Läuft Seelenstein in der iPhone/iPad-App (Capacitor, Ordner ios/), stellt Capacitor
// window.Capacitor bereit und die nativen Plugins unter Capacitor.Plugins.<Name> – ohne npm-Pakete im Spiel.
// Nur dann schaltet diese Datei ein:
//   - Haptik: navigator.vibrate (gibt es in iOS nicht) wird auf das Taptic Engine umgeleitet, dazu kurze Stöße bei
//     harten Treffern, beim Tod und beim Stufenaufstieg. Alles hängt an der Einstellung „Vibration“.
//   - Benachrichtigungen (lokale Mitteilungen: Tagesbelohnung, Doppel-EP, Saisonende, Weltboss, Pause) plant
//     js/benachrichtigung.js – dort auch die Einstellung und die frühere Tageserinnerung dieser Datei.
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

  // ---------- Aussehen: App-Kennzeichen am <html>, Hinweise ausblenden ----------
  document.documentElement.classList.add('nativ-app', 'nativ-' + (typeof cap.getPlatform === 'function' ? cap.getPlatform() : 'app'));
  const css = document.createElement('style');
  css.textContent =
    '.nativ-app #installBox, .nativ-app #umzugHinweis { display: none !important; }' +
    '.nativ-einladen { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; margin-top: 6px; }';
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

  // ---------- Tagesbelohnung abgeholt: kurzer Erfolgs-Stoß ----------
  // (Die Erinnerung daran samt Frage und Schalter steckt seit den Benachrichtigungen in js/benachrichtigung.js.)
  if (hat('Haptics') && typeof window.claimDaily === 'function') {
    const original = window.claimDaily;
    window.claimDaily = function () {
      const r = original.apply(this, arguments);
      try { if (r) stoss('erfolg'); } catch (e) { /* egal */ }
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
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bereit);
  else bereit();
})();
