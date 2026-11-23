// Werbung (seit 15.72): eine kurze Werbung gegen eine Belohnung – zuerst für die Tagesbelohnung (mit Werbung doppelt).
// werbungZeigen(grund) → Promise<boolean>: true nur, wenn die Werbung bis zum Ende lief (Abbrechen = false).
//
// Woher die Werbung kommt, der Reihe nach:
//   1. ein Werbenetz im Browser (Google „Ad Placement API“ für Spiele), sobald WERBUNG.h5Kunde eingetragen ist
//      und das Netz gerade eine Werbung hat,
//   2. sonst die eigene Werbepause: 30 Sekunden Spiel-Trailer (video/werbung.mp4) mit Zähler.
// Werbenetze in den Apps (AdMob für iPhone/Android) brauchen ein eigenes Konto, Kennungen und ein natives Modul –
// Schritte in docs/werbung.md. Ohne Einträge zeigt das Spiel nur die eigene Werbepause; nichts wird nachgeladen.
//
// Während der Werbung ist der Spielton stumm (Klänge und Musik), danach wieder wie in den Optionen.
// Die Belohnung zählt nur, solange die Seite sichtbar ist: Wechselt man weg, hält der Zähler an.

const WERBUNG = {
  dauer: 30, // Sekunden bis zur Belohnung (eigene Werbepause)
  video: 'video/werbung.mp4',
  bild: 'video/werbung.jpg',
  // Werbenetz im Browser – leer = aus. Nur mit eigenem, freigegebenem Konto füllen (docs/werbung.md).
  h5Kunde: '', // z. B. 'ca-pub-0000000000000000'
  h5Test: false, // true: Google zeigt Testwerbung (zum Ausprobieren)
  laeuft: false
};

// ---------- Spielton stumm / wieder an ----------
function werbungTon(aus) {
  try {
    if (typeof sfx === 'undefined' || !sfx.ctx || !sfx.master) return;
    if (!aus) {
      sfx.applyVolume();
      return;
    }
    const t = sfx.ctx.currentTime;
    for (const g of [sfx.master.gain, sfx.music.gain]) {
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.setTargetAtTime(0, t, 0.06);
    }
  } catch (e) { /* ohne Ton */ }
}

// ---------- Werbenetz im Browser (Ad Placement API) ----------
let werbungH5Bereit = null;
function werbungH5Laden() {
  if (!WERBUNG.h5Kunde) return Promise.resolve(false);
  if (werbungH5Bereit) return werbungH5Bereit;
  werbungH5Bereit = new Promise((fertig) => {
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adBreak = window.adConfig = function (o) { window.adsbygoogle.push(o); };
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(WERBUNG.h5Kunde);
      s.setAttribute('data-ad-client', WERBUNG.h5Kunde);
      if (WERBUNG.h5Test) s.setAttribute('data-adbreak-test', 'on');
      s.crossOrigin = 'anonymous';
      s.onload = () => {
        try { window.adConfig({ preloadAdBreaks: 'on', sound: 'on' }); } catch (e) { /* egal */ }
        fertig(true);
      };
      s.onerror = () => fertig(false);
      document.head.appendChild(s);
    } catch (e) {
      fertig(false);
    }
  });
  return werbungH5Bereit;
}
// Ergebnis: 'gesehen', 'abgebrochen' oder 'keine' (kein Netz, keine Werbung da → eigene Werbepause)
function werbungH5(grund) {
  return werbungH5Laden().then((ok) => new Promise((fertig) => {
    if (!ok || typeof window.adBreak !== 'function') return fertig('keine');
    let gezeigt = false;
    let gesehen = false;
    let ende = false;
    const schluss = (r) => { if (!ende) { ende = true; werbungTon(false); fertig(r); } };
    // Sicherheitsnetz: meldet sich das Netz gar nicht, nach 8 s die eigene Werbepause
    const uhr = setTimeout(() => { if (!gezeigt) schluss('keine'); }, 8000);
    try {
      window.adBreak({
        type: 'reward',
        name: String(grund || 'belohnung'),
        beforeAd: () => { gezeigt = true; werbungTon(true); },
        afterAd: () => werbungTon(false),
        beforeReward: (zeigen) => { gezeigt = true; zeigen(); },
        adViewed: () => { gesehen = true; },
        adDismissed: () => { gesehen = false; },
        adBreakDone: () => {
          clearTimeout(uhr);
          schluss(gezeigt ? (gesehen ? 'gesehen' : 'abgebrochen') : 'keine');
        }
      });
    } catch (e) {
      clearTimeout(uhr);
      schluss('keine');
    }
  }));
}

// ---------- Eigene Werbepause: 30 s Trailer ----------
function werbungEigen(grund) {
  return new Promise((fertig) => {
    const box = document.createElement('div');
    box.id = 'werbungPause';
    box.className = 'werbung-pause';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Werbung');
    box.innerHTML =
      '<div class="werbung-rahmen">' +
      '<div class="werbung-kopf"><span class="werbung-marke">Werbung</span><span class="werbung-zaehler"></span>' +
      '<button type="button" class="werbung-zu" aria-label="Schließen">✕</button></div>' +
      '<div class="werbung-bild"><video playsinline webkit-playsinline preload="auto" disablepictureinpicture' +
      ' controlslist="nodownload nofullscreen noremoteplayback"></video>' +
      '<button type="button" class="werbung-start" hidden>▶</button>' +
      '<p class="werbung-ersatz" hidden></p></div>' +
      '<div class="werbung-leiste"><i></i></div>' +
      '<div class="werbung-fuss"><span class="werbung-hinweis"></span>' +
      '<button type="button" class="btn btn-primary werbung-fertig" hidden>Belohnung abholen</button></div>' +
      '<div class="werbung-frage" hidden><p>Werbung abbrechen? Dann gibt es keine Belohnung.</p>' +
      '<div><button type="button" class="btn btn-primary" data-w="weiter">Weiter ansehen</button>' +
      '<button type="button" class="btn btn-ghost" data-w="abbrechen">Abbrechen</button></div></div>' +
      '</div>';
    document.body.appendChild(box);
    const q = (s) => box.querySelector(s);
    const video = q('video');
    const zaehler = q('.werbung-zaehler');
    const leiste = q('.werbung-leiste i');
    const hinweis = q('.werbung-hinweis');
    const start = q('.werbung-start');
    const ersatz = q('.werbung-ersatz');
    const frage = q('.werbung-frage');
    const fertigKnopf = q('.werbung-fertig');

    let rest = WERBUNG.dauer;
    let wartetAufTipp = false; // Video wartet auf einen Tipp (Autoplay gesperrt)
    let ohneVideo = false;
    let ende = false;
    let zuletzt = performance.now();

    // Ersatz, wenn das Video nicht lädt (offline): Spieltipps im Wechsel, Zähler läuft trotzdem
    const tipps = [
      'Seelensteine zerschlagen bringt Bücher, Verstärkungen und mit Glück epische Teile.',
      'Sieben Tage in Folge abholen: Tag 7 bringt die Heldentruhe.',
      'Ab Stufe 60 trägt dich ein Drache über Hindernisse.',
      'Gemeinsam jagt es sich leichter: Gruppen teilen die Erfahrung.',
      'Im Turm der Verdammten warten ab Stufe 80 die stärksten Gegner.'
    ];
    let tippNr = 0;
    const zeigeErsatz = () => {
      if (ohneVideo) return;
      ohneVideo = true;
      wartetAufTipp = false;
      start.hidden = true;
      video.hidden = true;
      ersatz.hidden = false;
      ersatz.textContent = tipps[0];
    };

    const spielen = () => {
      let p;
      try { p = video.play(); } catch (e) { p = null; }
      if (p && typeof p.then === 'function') {
        p.then(() => { wartetAufTipp = false; start.hidden = true; }).catch(() => {
          if (ohneVideo) return;
          wartetAufTipp = true;
          start.hidden = false;
        });
      }
    };
    video.addEventListener('error', zeigeErsatz);
    video.addEventListener('ended', () => { if (!ende && rest > 0) { video.currentTime = 0; spielen(); } });
    start.addEventListener('click', () => { video.muted = false; spielen(); });

    const aufraeumen = (ok) => {
      if (ende) return;
      ende = true;
      clearInterval(uhr);
      document.removeEventListener('visibilitychange', sichtbar);
      document.removeEventListener('keydown', taste, true);
      try { video.pause(); video.removeAttribute('src'); video.load(); } catch (e) { /* egal */ }
      box.remove();
      werbungTon(false);
      fertig(ok);
    };
    const fertigMachen = () => {
      rest = 0;
      zaehler.textContent = 'Belohnung freigeschaltet';
      leiste.style.width = '100%';
      hinweis.textContent = '';
      fertigKnopf.hidden = false;
      frage.hidden = true;
      box.classList.add('fertig');
      try { fertigKnopf.focus(); } catch (e) { /* egal */ }
    };
    const anzeigen = () => {
      const s = Math.ceil(rest);
      zaehler.textContent = `Belohnung in ${s} s`;
      leiste.style.width = `${Math.min(100, ((WERBUNG.dauer - rest) / WERBUNG.dauer) * 100).toFixed(1)}%`;
      hinweis.textContent = wartetAufTipp ? 'Tippe auf ▶, um die Werbung zu starten.' : 'Bis zum Ende ansehen – dann gibt es die Belohnung.';
    };
    const uhr = setInterval(() => {
      const jetzt = performance.now();
      const dt = Math.min(1, (jetzt - zuletzt) / 1000);
      zuletzt = jetzt;
      if (ende || rest <= 0) return;
      // Zähler hält an: Seite unsichtbar, Abbruch-Frage offen oder Video wartet auf den Tipp
      if (document.hidden || !frage.hidden || wartetAufTipp) return;
      rest = Math.max(0, rest - dt);
      if (ohneVideo && Math.floor((WERBUNG.dauer - rest) / 6) !== tippNr) {
        tippNr = Math.floor((WERBUNG.dauer - rest) / 6);
        ersatz.textContent = tipps[tippNr % tipps.length];
      }
      if (rest <= 0) fertigMachen();
      else anzeigen();
    }, 250);
    const sichtbar = () => {
      zuletzt = performance.now();
      if (ohneVideo || rest <= 0) return;
      if (document.hidden) video.pause();
      else if (frage.hidden && !wartetAufTipp) spielen();
    };
    document.addEventListener('visibilitychange', sichtbar);

    const abbrechenFragen = () => {
      if (rest <= 0) return aufraeumen(true);
      frage.hidden = false;
      if (!ohneVideo) video.pause();
    };
    const taste = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (!frage.hidden) { frage.hidden = true; zuletzt = performance.now(); if (!ohneVideo) spielen(); } else abbrechenFragen();
        return;
      }
      if (e.key === 'Enter' && rest <= 0) { e.preventDefault(); e.stopPropagation(); aufraeumen(true); return; }
      // Tasten nicht ans Spiel weitergeben, solange die Werbung läuft
      e.stopPropagation();
    };
    document.addEventListener('keydown', taste, true);
    q('.werbung-zu').addEventListener('click', abbrechenFragen);
    fertigKnopf.addEventListener('click', () => aufraeumen(true));
    frage.addEventListener('click', (e) => {
      const w = e.target && e.target.getAttribute && e.target.getAttribute('data-w');
      if (w === 'abbrechen') aufraeumen(false);
      else if (w === 'weiter') {
        frage.hidden = true;
        zuletzt = performance.now();
        if (!ohneVideo) spielen();
      }
    });

    werbungTon(true);
    video.poster = WERBUNG.bild;
    video.src = WERBUNG.video;
    anzeigen();
    // gleich im Tipp auf „Werbung ansehen“ starten (mit Ton erlaubt); sonst wartet ▶ auf den nächsten Tipp
    spielen();
    if (typeof window.__werbungTest === 'function') window.__werbungTest({ box, video, grund, rest: () => rest });
  });
}

// ---------- Einstieg ----------
function werbungZeigen(grund) {
  if (WERBUNG.laeuft) return Promise.resolve(false);
  WERBUNG.laeuft = true;
  const schluss = (ok) => { WERBUNG.laeuft = false; return !!ok; };
  // Ohne Werbenetz gleich die eigene Werbepause – im selben Tipp, damit das Video mit Ton starten darf
  if (!WERBUNG.h5Kunde) return werbungEigen(grund).then(schluss, () => schluss(false));
  return werbungH5(grund)
    .then((r) => (r === 'keine' ? werbungEigen(grund) : r === 'gesehen'))
    .then(schluss, () => schluss(false));
}

(function werbungCss() {
  const css = document.createElement('style');
  css.textContent =
    '.werbung-pause { position: fixed; inset: 0; z-index: 2147483000; display: flex; align-items: center; justify-content: center;' +
    ' background: rgba(6, 4, 10, 0.92); padding: max(8px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right))' +
    ' max(8px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left)); }' +
    '.werbung-rahmen { position: relative; width: min(960px, 100%, calc((100dvh - 110px) * 16 / 9)); min-width: min(320px, 100%);' +
    ' display: flex; flex-direction: column; gap: 6px; }' +
    '.werbung-kopf { display: flex; align-items: center; gap: 10px; color: #f3e6c4; font-size: 14px; }' +
    '.werbung-marke { padding: 2px 8px; border-radius: 4px; background: #ffd34d; color: #2a1a04; font-weight: 800; font-size: 12px;' +
    ' letter-spacing: 0.04em; text-transform: uppercase; }' +
    '.werbung-zaehler { flex: 1; font-weight: 700; }' +
    '.werbung-zu { width: 38px; height: 38px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.25); background: rgba(0, 0, 0, 0.45);' +
    ' color: #fff; font-size: 18px; cursor: pointer; }' +
    '.werbung-bild { position: relative; aspect-ratio: 16 / 9; border-radius: 8px; overflow: hidden; background: #000;' +
    ' box-shadow: 0 0 0 1px rgba(255, 211, 77, 0.25), 0 10px 40px rgba(0, 0, 0, 0.6); }' +
    '.werbung-bild video { width: 100%; height: 100%; display: block; object-fit: contain; background: #000; }' +
    '.werbung-start { position: absolute; inset: 0; margin: auto; width: 84px; height: 84px; border-radius: 50%; border: 2px solid #ffd34d;' +
    ' background: rgba(0, 0, 0, 0.55); color: #ffd34d; font-size: 34px; cursor: pointer; }' +
    '.werbung-ersatz { position: absolute; inset: 0; margin: 0; display: flex; align-items: center; justify-content: center; padding: 24px;' +
    ' text-align: center; font-size: clamp(15px, 3.2vw, 24px); color: #ffe9a8; background: radial-gradient(circle at 50% 40%, #3a2350, #0c0814 70%); }' +
    '.werbung-leiste { height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.12); overflow: hidden; }' +
    '.werbung-leiste i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #ffb03a, #ffd34d); transition: width 0.25s linear; }' +
    '.werbung-fuss { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 38px; color: #cdbf9f; font-size: 13px; }' +
    '.werbung-pause.fertig .werbung-zaehler { color: #9dff9a; }' +
    '.werbung-frage { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;' +
    ' background: rgba(6, 4, 10, 0.85); border-radius: 8px; color: #f3e6c4; text-align: center; padding: 16px; }' +
    '.werbung-frage[hidden], .werbung-start[hidden], .werbung-ersatz[hidden], .werbung-fertig[hidden], .werbung-bild video[hidden] { display: none; }' +
    '.werbung-frage div { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }';
  (document.head || document.documentElement).appendChild(css);
})();
