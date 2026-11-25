// Werbung (seit 15.72): eine kurze Werbung gegen eine Belohnung – zuerst für die Tagesbelohnung (mit Werbung doppelt).
// werbungZeigen(grund) → Promise<boolean>: true nur, wenn die Werbung bis zum Ende lief (Abbrechen = false).
//
// Woher die Werbung kommt, der Reihe nach:
//   1. ein Werbenetz im Browser (Google „Ad Placement API“ für Spiele), sobald WERBUNG.h5Kunde eingetragen ist
//      und das Netz gerade eine Werbung hat,
//   2. sonst die eigene Werbepause mit Zähler (30 Sekunden) in zwei Fassungen, die sich abwechseln (werbungFassung):
//      „video“ – der Spiel-Trailer (video/werbung.mp4) – und „szenen“ – schnelle Szenen aus dem Spiel (die Ladebilder
//      bilder/lade-*.webp mit Kamerafahrt, Funken, Schnee, Glut und Schadenszahlen), kurze Texte, die Bossmusik des
//      Spiels und am Ende die Abschlusskarte „Folge uns auf Instagram und TikTok“ mit Knöpfen (docs/werbung-ladebilder.md).
// Werbenetze in den Apps (AdMob für iPhone/Android) brauchen ein eigenes Konto, Kennungen und ein natives Modul –
// Schritte in docs/werbung.md. Ohne Einträge zeigt das Spiel nur die eigene Werbepause; nichts wird nachgeladen.
//
// Während der Werbung ist der Spielton stumm (Klänge und Musik), danach wieder wie in den Optionen. Die eigene
// Werbepause hat ihren eigenen Ton (Video bzw. Musik), den der Lautsprecher-Knopf oben stumm schaltet (gemerkt).
// Die Belohnung zählt nur, solange die Seite sichtbar ist: Wechselt man weg, hält der Zähler an.

const WERBUNG = {
  dauer: 30, // Sekunden bis zur Belohnung (eigene Werbepause)
  video: 'video/werbung.mp4',
  bild: 'video/werbung.jpg',
  // Fassung der eigenen Werbepause: '' = im Wechsel (gemerkt im Gerät), 'video' oder 'szenen' = immer diese
  fassung: '',
  // Werbenetz im Browser – leer = aus. Nur mit eigenem, freigegebenem Konto füllen (docs/werbung.md).
  h5Kunde: '', // z. B. 'ca-pub-0000000000000000'
  h5Test: false, // true: Google zeigt Testwerbung (zum Ausprobieren)
  laeuft: false
};
const WERBUNG_KEY = { fassung: 'seelenstein.werbung.fassung', stumm: 'seelenstein.werbung.stumm' };

// Fassung „szenen“: Zeiten in Sekunden für 30 s (bei anderer WERBUNG.dauer anteilig). Die Schnitte liegen auf den
// Schlägen der Bossmusik (ein Schlag je Sekunde, ein Takt vier Sekunden): 2 s Vorspann mit Schriftzug, acht Szenen zu
// je 3 s, ab 26 s die Abschlusskarte. Bilder: die Ladebilder (bilder/lade-<bild>.webp, 2560 × 1440) – wer die Werbung
// sieht, hat sie danach auch für das Ladebild im Speicher. zoom/x/y: Kamerafahrt (Anfang → Ende, x/y als Anteil der
// Bildgröße), fx: Wirkung über dem Bild (funken, glut, wind, treffer, beben, schnee, blueten).
const WERBUNG_SZENEN = {
  musik: 'snd/musik/boss.mp3',
  vorspann: 2,
  je: 3,
  karte: 26,
  karteBild: 'lichtwacht',
  liste: [
    { bild: 'kristallabgrund', titel: 'Kristallabgrund', unter: 'Leuchtende Tiefen', fx: 'funken', zoom: [1.22, 1.06], x: [0.03, -0.02], y: [0.02, -0.01] },
    { bild: 'lichtwacht', titel: 'Lichtwacht', unter: 'Die Krone über dem Abgrund', fx: 'funken', zoom: [1.04, 1.2], x: [-0.02, 0.02], y: [-0.03, 0.01] },
    { bild: 'feuerberg', titel: 'Feuerberg', unter: 'Lava, Glut und Drachen', fx: 'glut', zoom: [1.2, 1.05], x: [-0.03, 0.03], y: [0, -0.02] },
    { bild: 'drache', titel: 'Flieg mit deinem Drachen', unter: 'Hoch über allem', fx: 'wind', zoom: [1.06, 1.2], x: [0.04, -0.04], y: [0.01, -0.01] },
    { bild: 'arena', titel: 'Turnierarena', unter: 'Kämpfe gegen Bots – jederzeit', fx: 'treffer', zoom: [1.24, 1.08], x: [0, 0.02], y: [0.02, 0] },
    { bild: 'endboss', titel: 'Riesige Endbosse', unter: 'Nur gemeinsam zu besiegen', fx: 'beben', zoom: [1.08, 1.24], x: [0.02, -0.01], y: [0.02, -0.02] },
    { bild: 'winter', titel: 'Frostgipfel', unter: 'Eis, Schnee und Yetis', fx: 'schnee', zoom: [1.2, 1.06], x: [-0.03, 0.02], y: [-0.01, 0.01] },
    { bild: 'stadt', titel: () => `${typeof WORLD_MAPS !== 'undefined' ? WORLD_MAPS.length : 19} Städte voller Leben`, unter: 'Handeln, Gilden, Freunde', fx: 'blueten', zoom: [1.06, 1.18], x: [0.02, -0.03], y: [0.01, -0.02] }
  ]
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

// ---------- Fassung und Stummschalter der eigenen Werbepause ----------
// Im Wechsel: war es zuletzt der Trailer, kommen jetzt die Szenen und umgekehrt (beim ersten Mal zufällig). Ohne
// Speicher (privates Fenster) zufällig.
function werbungFassung() {
  if (WERBUNG.fassung === 'video' || WERBUNG.fassung === 'szenen') return WERBUNG.fassung;
  let letzte = '';
  try { letzte = localStorage.getItem(WERBUNG_KEY.fassung) || ''; } catch (e) { letzte = ''; }
  const art = letzte === 'video' ? 'szenen' : letzte === 'szenen' ? 'video' : Math.random() < 0.5 ? 'video' : 'szenen';
  try { localStorage.setItem(WERBUNG_KEY.fassung, art); } catch (e) { /* privat */ }
  return art;
}
function werbungStummGemerkt() {
  try {
    const v = localStorage.getItem(WERBUNG_KEY.stumm);
    if (v === '1' || v === '0') return v === '1';
  } catch (e) { /* privat */ }
  // ohne eigene Wahl: stumm, wenn der Spielton in den Optionen ganz aus ist
  return typeof opts !== 'undefined' && opts.volume === 0;
}
function werbungStummMerken(an) {
  try { localStorage.setItem(WERBUNG_KEY.stumm, an ? '1' : '0'); } catch (e) { /* privat */ }
}
const WERBUNG_LAUT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.6L12.5 5v14l-4.9-4.5H4z" fill="currentColor"/>' +
  '<path class="wl-an" d="M15.5 8.6a4.6 4.6 0 0 1 0 6.8M18 6.2a8 8 0 0 1 0 11.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
  '<path class="wl-aus" d="M16 9.2l5 5.6M21 9.2l-5 5.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

// ---------- Eigene Werbepause: Rahmen mit Zähler (beide Fassungen) ----------
// Der Inhalt (werbungTrailer bzw. werbungSzenen) bekommt die Fläche .werbung-bild und ein Steuerobjekt und liefert:
// start() im selben Tipp, wartet() (true = wartet auf einen Tipp, der Zähler hält an), pause()/weiter(), ton(stumm),
// tick(t) viermal je Sekunde, fertig() beim Ende des Zählers und ende() beim Schließen.
function werbungEigen(grund) {
  const art = werbungFassung();
  return new Promise((fertig) => {
    const box = document.createElement('div');
    box.id = 'werbungPause';
    box.className = 'werbung-pause werbung-' + art;
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Werbung');
    box.innerHTML =
      '<div class="werbung-rahmen">' +
      '<div class="werbung-kopf"><span class="werbung-marke">Werbung</span><span class="werbung-zaehler"></span>' +
      `<button type="button" class="werbung-ton" aria-label="Ton aus">${WERBUNG_LAUT_SVG}</button>` +
      '<button type="button" class="werbung-zu" aria-label="Schließen">✕</button></div>' +
      '<div class="werbung-bild"></div>' +
      '<div class="werbung-leiste"><i></i></div>' +
      '<div class="werbung-fuss"><span class="werbung-hinweis"></span>' +
      '<button type="button" class="btn btn-primary werbung-fertig" hidden>Belohnung abholen</button></div>' +
      '<div class="werbung-frage" hidden><p>Werbung abbrechen? Dann gibt es keine Belohnung.</p>' +
      '<div><button type="button" class="btn btn-primary" data-w="weiter">Weiter ansehen</button>' +
      '<button type="button" class="btn btn-ghost" data-w="abbrechen">Abbrechen</button></div></div>' +
      '</div>';
    document.body.appendChild(box);
    const q = (s) => box.querySelector(s);
    const zaehler = q('.werbung-zaehler');
    const leiste = q('.werbung-leiste i');
    const hinweis = q('.werbung-hinweis');
    const frage = q('.werbung-frage');
    const fertigKnopf = q('.werbung-fertig');
    const tonKnopf = q('.werbung-ton');

    let rest = WERBUNG.dauer;
    let ende = false;
    let zuletzt = performance.now();
    let stumm = werbungStummGemerkt();
    let inhalt = null;
    // Läuft die Zeit gerade? (nicht bei unsichtbarer Seite, offener Abbruch-Frage oder wenn der Inhalt auf einen Tipp wartet)
    const laeuft = () => !ende && rest > 0 && !document.hidden && frage.hidden && !(inhalt && inhalt.wartet());
    // Zeit der Werbung in Sekunden, zwischen den Zählerschritten weich weitergerechnet (für Bild und Musik)
    const zeit = () => Math.min(WERBUNG.dauer, WERBUNG.dauer - rest + (laeuft() ? Math.min(0.3, (performance.now() - zuletzt) / 1000) : 0));
    const steuer = { zeit, laeuft, stumm: () => stumm, box };
    inhalt = art === 'szenen' ? werbungSzenen(q('.werbung-bild'), steuer) : werbungTrailer(q('.werbung-bild'), steuer);

    const tonZeigen = () => {
      tonKnopf.classList.toggle('aus', stumm);
      tonKnopf.setAttribute('aria-label', stumm ? 'Ton an' : 'Ton aus');
      tonKnopf.title = stumm ? 'Ton an' : 'Ton aus';
    };
    tonKnopf.addEventListener('click', () => {
      stumm = !stumm;
      werbungStummMerken(stumm);
      tonZeigen();
      try { inhalt.ton(stumm); } catch (e) { /* egal */ }
    });
    tonZeigen();

    const aufraeumen = (ok) => {
      if (ende) return;
      ende = true;
      clearInterval(uhr);
      document.removeEventListener('visibilitychange', sichtbar);
      document.removeEventListener('keydown', taste, true);
      try { inhalt.ende(); } catch (e) { /* egal */ }
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
      try { inhalt.fertig(); } catch (e) { /* egal */ }
      try { fertigKnopf.focus({ preventScroll: true }); } catch (e) { /* egal */ }
    };
    const anzeigen = () => {
      const s = Math.ceil(rest);
      zaehler.textContent = `Belohnung in ${s} s`;
      leiste.style.width = `${Math.min(100, ((WERBUNG.dauer - rest) / WERBUNG.dauer) * 100).toFixed(1)}%`;
      hinweis.textContent = inhalt.wartet() ? 'Tippe auf ▶, um die Werbung zu starten.' : 'Bis zum Ende ansehen – dann gibt es die Belohnung.';
    };
    const uhr = setInterval(() => {
      const jetzt = performance.now();
      const dt = Math.min(1, (jetzt - zuletzt) / 1000);
      const lief = laeuft();
      zuletzt = jetzt;
      if (ende || rest <= 0) return;
      // Zähler hält an: Seite unsichtbar, Abbruch-Frage offen oder der Inhalt wartet auf den Tipp
      if (!lief) {
        if (inhalt.wartet()) anzeigen();
        return;
      }
      rest = Math.max(0, rest - dt);
      try { inhalt.tick(WERBUNG.dauer - rest); } catch (e) { /* egal */ }
      if (rest <= 0) fertigMachen();
      else anzeigen();
    }, 250);
    const sichtbar = () => {
      zuletzt = performance.now();
      if (rest <= 0) return;
      if (document.hidden) inhalt.pause();
      else if (frage.hidden) inhalt.weiter();
    };
    document.addEventListener('visibilitychange', sichtbar);

    const abbrechenFragen = () => {
      if (rest <= 0) return aufraeumen(true);
      frage.hidden = false;
      inhalt.pause();
    };
    const weiterAnsehen = () => {
      frage.hidden = true;
      zuletzt = performance.now();
      inhalt.weiter();
    };
    const taste = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (!frage.hidden) weiterAnsehen(); else abbrechenFragen();
        return;
      }
      // Enter holt die Belohnung ab – außer auf einem Link oder Knopf der Werbung (der bekommt sein Enter selbst)
      const auf = e.target && e.target.closest ? e.target.closest('#werbungPause a, #werbungPause button:not(.werbung-fertig)') : null;
      if (e.key === 'Enter' && rest <= 0 && !auf) { e.preventDefault(); e.stopPropagation(); aufraeumen(true); return; }
      // Tasten nicht ans Spiel weitergeben, solange die Werbung läuft
      e.stopPropagation();
    };
    document.addEventListener('keydown', taste, true);
    q('.werbung-zu').addEventListener('click', abbrechenFragen);
    fertigKnopf.addEventListener('click', () => aufraeumen(true));
    frage.addEventListener('click', (e) => {
      const w = e.target && e.target.getAttribute && e.target.getAttribute('data-w');
      if (w === 'abbrechen') aufraeumen(false);
      else if (w === 'weiter') weiterAnsehen();
    });

    werbungTon(true);
    anzeigen();
    // gleich im Tipp auf „Werbung ansehen“ starten (Ton erlaubt); sonst wartet ▶ auf den nächsten Tipp
    inhalt.start();
    anzeigen();
    if (typeof window.__werbungTest === 'function') {
      window.__werbungTest({ box, art, video: box.querySelector('video'), grund, rest: () => rest, zeit, inhalt });
    }
  });
}

// ---------- Fassung „video“: 30 s Trailer ----------
function werbungTrailer(flaeche, steuer) {
  flaeche.innerHTML = '<video playsinline webkit-playsinline preload="auto" disablepictureinpicture' +
    ' controlslist="nodownload nofullscreen noremoteplayback"></video>' +
    '<button type="button" class="werbung-start" hidden aria-label="Werbung starten">▶</button>' +
    '<p class="werbung-ersatz" hidden></p>';
  const video = flaeche.querySelector('video');
  const start = flaeche.querySelector('.werbung-start');
  const ersatz = flaeche.querySelector('.werbung-ersatz');
  let wartetAufTipp = false; // Video wartet auf einen Tipp (Autoplay gesperrt)
  let ohneVideo = false;
  let aus = false;
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
    if (aus || ohneVideo) return;
    let p;
    try { p = video.play(); } catch (e) { p = null; }
    if (p && typeof p.then === 'function') {
      p.then(() => { wartetAufTipp = false; start.hidden = true; }).catch(() => {
        if (ohneVideo || aus) return;
        wartetAufTipp = true;
        start.hidden = false;
      });
    }
  };
  video.addEventListener('error', zeigeErsatz);
  video.addEventListener('ended', () => { if (!aus && steuer.zeit() < WERBUNG.dauer) { video.currentTime = 0; spielen(); } });
  start.addEventListener('click', () => { video.muted = steuer.stumm(); spielen(); });
  return {
    start() {
      video.muted = steuer.stumm();
      video.poster = WERBUNG.bild;
      video.src = WERBUNG.video;
      spielen();
    },
    wartet: () => wartetAufTipp,
    pause() { if (!ohneVideo) video.pause(); },
    weiter() { if (!ohneVideo && !wartetAufTipp) spielen(); },
    ton(stumm) { video.muted = stumm; },
    tick(t) {
      if (ohneVideo && Math.floor(t / 6) !== tippNr) {
        tippNr = Math.floor(t / 6);
        ersatz.textContent = tipps[tippNr % tipps.length];
      }
    },
    fertig() { /* das Video läuft zu Ende und bleibt stehen */ },
    ende() {
      aus = true;
      try { video.pause(); video.removeAttribute('src'); video.load(); } catch (e) { /* egal */ }
    }
  };
}

// ---------- Fassung „szenen“: Szenen aus dem Spiel mit Abschlusskarte ----------
// Gezeichnet wird auf einer Zeichenfläche (Bild mit Kamerafahrt, Wirkung, Blitz beim Schnitt, Abdunkeln am Rand); die
// Texte liegen als HTML darüber (scharf und übersetzbar), die Abschlusskarte ebenso (antippbare Knöpfe). Alles hängt an
// der Zeit der Werbung (steuer.zeit): Hält der Zähler an, steht auch das Bild – Teilchen und Zahlen sind aus der Zeit
// berechnet, nicht fortgeschrieben. Fehlt ein Bild (offline, noch nicht geladen), bleibt ein dunkler Verlauf.
function werbungSzenen(flaeche, steuer) {
  const S = WERBUNG_SZENEN;
  const k30 = WERBUNG.dauer / 30;
  const T_VOR = S.vorspann * k30;
  const T_JE = S.je * k30;
  const T_KARTE = S.karte * k30;
  const profil = (k) => (typeof sozialUrl === 'function' && sozialUrl(k)) ||
    (k === 'tiktok' ? 'https://www.tiktok.com/@seelenstein.online' : 'https://www.instagram.com/seelenstein.online/');
  const name = '@' + ((profil('tiktok').match(/@([^/?#]+)/) || [0, 'seelenstein.online'])[1]);
  // eigene Zeichen der Knöpfe: die vorhandenen aus dem Spiel (sozial-freischalten.js), mit eigener Verlaufs-Kennung
  const zeichen = (k) => (typeof SOZIAL_GLYPHE !== 'undefined' && SOZIAL_GLYPHE[k] ? SOZIAL_GLYPHE[k].replace(/sozIgVerlauf/g, 'wsIgVerlauf') : '');
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const knopf = (k, label) => `<a class="ws-knopf ws-${k}" href="${esc(profil(k))}" target="_blank" rel="noopener" data-sozial-werbung="${k}">` +
    `${zeichen(k)}<span class="no-tr">${label}</span></a>`;
  flaeche.innerHTML =
    '<canvas class="ws-leinwand" aria-hidden="true"></canvas>' +
    '<div class="ws-logo"><b class="no-tr">Seelenstein</b><span>Das Abenteuer wartet</span></div>' +
    '<div class="ws-text"><b></b><span></span></div>' +
    '<div class="ws-karte" hidden><div class="ws-karte-in">' +
    '<div class="ws-karte-logo no-tr">Seelenstein</div>' +
    '<div class="ws-karte-titel">Folge uns auf Instagram und TikTok</div>' +
    `<div class="ws-karte-name no-tr">${esc(name)}</div>` +
    `<div class="ws-knoepfe">${knopf('instagram', 'Instagram')}${knopf('tiktok', 'TikTok')}</div>` +
    '<div class="ws-karte-unter">Clips, Neuigkeiten und Updates</div>' +
    '</div></div>';
  const cv = flaeche.querySelector('canvas');
  const ctx = cv.getContext('2d');
  const logo = flaeche.querySelector('.ws-logo');
  const text = flaeche.querySelector('.ws-text');
  const titel = text.querySelector('b');
  const unter = text.querySelector('span');
  const karte = flaeche.querySelector('.ws-karte');
  const ruhig = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();

  // Profil öffnen: wie die Knöpfe an der Tasche (zählt dort auch für Seite III und IV), in den Apps über den Weg für
  // fremde Seiten (externOeffnen), sonst ein neuer Tab
  karte.querySelectorAll('[data-sozial-werbung]').forEach((a) => a.addEventListener('click', (e) => {
    const k = a.getAttribute('data-sozial-werbung');
    const url = profil(k);
    e.preventDefault();
    e.stopPropagation();
    a.classList.add('getippt');
    try {
      if (typeof sozialFolgen === 'function' && typeof sozialUrl === 'function' && sozialUrl(k)) sozialFolgen(k);
      else if (typeof externOeffnen === 'function') externOeffnen(url);
      else window.open(url, '_blank', 'noopener');
    } catch (x) {
      try { window.open(url, '_blank', 'noopener'); } catch (y) { /* Popup blockiert */ }
    }
  }));

  // Bilder: alle gleich zu Beginn anfordern (der Reihe nach, das erste zuerst)
  const bilder = new Map();
  const bildHolen = (n) => {
    if (!n || bilder.has(n)) return;
    const im = new Image();
    const b = { im, ok: false };
    bilder.set(n, b);
    im.decoding = 'async';
    im.onload = () => {
      const fertigBild = () => { b.ok = true; };
      if (typeof im.decode === 'function') im.decode().then(fertigBild, fertigBild);
      else fertigBild();
    };
    im.src = `bilder/lade-${n}.webp`;
  };
  // Musik über den Klang des Spiels (Web Audio, an der stummen Spiel-Lautstärke vorbei)
  const musik = werbungMusik(S.musik, steuer);

  // ----- Ablauf -----
  // Teil zur Zeit t: Vorspann, Szene i oder Abschlusskarte; seit = Sekunden im Teil, d = Dauer des Teils
  const teilBei = (t) => {
    if (t < T_VOR) return { art: 'vor', i: -1, seit: t, d: T_VOR };
    if (t < T_KARTE) {
      const i = Math.min(S.liste.length - 1, Math.floor((t - T_VOR) / T_JE));
      return { art: 'szene', i, seit: t - T_VOR - i * T_JE, d: T_JE };
    }
    return { art: 'karte', i: S.liste.length, seit: t - T_KARTE, d: Math.max(0.1, WERBUNG.dauer - T_KARTE) };
  };
  const glatt = (x) => { const v = Math.max(0, Math.min(1, x)); return v * v * (3 - 2 * v); };
  const raus = (x) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
  const zuf = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

  // ----- Zeichnen -----
  let W = 0;
  let H = 0;
  let pr = 1;
  let messen = true; // Größe neu messen (am Anfang und nach einer Größenänderung des Fensters)
  const neuMessen = () => { messen = true; };
  window.addEventListener('resize', neuMessen);
  const groesse = () => {
    if (!messen) return false;
    const r = flaeche.getBoundingClientRect();
    messen = r.width < 10; // noch ohne Größe (gleich nach dem Einhängen): beim nächsten Bild noch einmal
    pr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(2, Math.round(Math.min(1920, r.width * pr)));
    const h = Math.max(2, Math.round(w * 9 / 16));
    if (w !== W || h !== H) {
      W = cv.width = w;
      H = cv.height = h;
      return true;
    }
    return false;
  };
  // Bild mit Kamerafahrt (k = 0 … 1 durch die Szene), punch = kurzes Hineinzoomen beim Schnitt
  const bildZeichnen = (n, k, sz, punch, hell) => {
    const b = bilder.get(n);
    if (!b || !b.ok) {
      const g = ctx.createRadialGradient(W * 0.5, H * 0.45, H * 0.1, W * 0.5, H * 0.5, W * 0.7);
      g.addColorStop(0, '#3a2a58');
      g.addColorStop(1, '#0c0814');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      return;
    }
    const e = glatt(k);
    const z = (sz.zoom[0] + (sz.zoom[1] - sz.zoom[0]) * e) * (1 + punch);
    const im = b.im;
    const s = Math.max(W / im.naturalWidth, H / im.naturalHeight) * z;
    const dw = im.naturalWidth * s;
    const dh = im.naturalHeight * s;
    // Verschiebung höchstens so weit, dass kein Rand sichtbar wird
    const mx = Math.max(0, (dw - W) / 2);
    const my = Math.max(0, (dh - H) / 2);
    const ox = Math.max(-mx, Math.min(mx, (sz.x[0] + (sz.x[1] - sz.x[0]) * e) * W));
    const oy = Math.max(-my, Math.min(my, (sz.y[0] + (sz.y[1] - sz.y[0]) * e) * H));
    ctx.globalAlpha = hell == null ? 1 : hell;
    ctx.drawImage(im, (W - dw) / 2 + ox, (H - dh) / 2 + oy, dw, dh);
    ctx.globalAlpha = 1;
  };
  // Teilchen der Szene (aus der Zeit berechnet)
  const funken = (seit, farben, n, steig) => {
    ctx.globalCompositeOperation = 'lighter';
    for (let j = 0; j < n; j++) {
      const x = zuf(j * 3.1) * W;
      const y = ((zuf(j * 5.7) - seit * steig * (0.4 + zuf(j) * 0.6)) % 1 + 1) % 1 * H;
      const r = (0.004 + zuf(j * 9.3) * 0.008) * H;
      const a = 0.35 + 0.65 * Math.abs(Math.sin(seit * (2 + zuf(j * 2.2) * 4) + j));
      ctx.globalAlpha = a;
      ctx.fillStyle = farben[j % farben.length];
      ctx.beginPath();
      // vierzackiger Stern
      ctx.moveTo(x, y - r * 2.6);
      ctx.lineTo(x + r * 0.5, y - r * 0.5);
      ctx.lineTo(x + r * 2.6, y);
      ctx.lineTo(x + r * 0.5, y + r * 0.5);
      ctx.lineTo(x, y + r * 2.6);
      ctx.lineTo(x - r * 0.5, y + r * 0.5);
      ctx.lineTo(x - r * 2.6, y);
      ctx.lineTo(x - r * 0.5, y - r * 0.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };
  const glut = (seit) => {
    const g = ctx.createLinearGradient(0, H, 0, H * 0.55);
    g.addColorStop(0, 'rgba(255, 90, 20, 0.28)');
    g.addColorStop(1, 'rgba(255, 90, 20, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);
    ctx.globalCompositeOperation = 'lighter';
    for (let j = 0; j < 70; j++) {
      const sp = 0.18 + zuf(j * 4.1) * 0.35;
      const y = (1.05 - ((zuf(j * 7.3) + seit * sp) % 1.1)) * H;
      const x = (zuf(j * 1.9) + Math.sin(seit * 1.6 + j) * 0.012) * W;
      const r = (0.002 + zuf(j * 3.3) * 0.004) * H;
      ctx.globalAlpha = 0.5 + 0.5 * zuf(j * 8.8);
      ctx.fillStyle = j % 3 ? '#ff9a3a' : '#ffd36a';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };
  const schnee = (seit) => {
    ctx.fillStyle = '#ffffff';
    for (let j = 0; j < 110; j++) {
      const nah = zuf(j * 2.7);
      const sp = 0.08 + nah * 0.22;
      const y = ((zuf(j * 6.1) + seit * sp) % 1) * H;
      const x = ((zuf(j * 3.9) - seit * sp * 0.35 + Math.sin(seit * 1.3 + j) * 0.01) % 1 + 1) % 1 * W;
      ctx.globalAlpha = 0.35 + nah * 0.55;
      ctx.beginPath();
      ctx.arc(x, y, (0.0015 + nah * 0.0045) * H, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  const wind = (seit) => {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#ffffff';
    for (let j = 0; j < 26; j++) {
      const y = zuf(j * 5.3) * H;
      const len = (0.08 + zuf(j * 2.1) * 0.18) * W;
      const x = W * 1.2 - ((zuf(j * 7.7) + seit * (0.9 + zuf(j) * 0.8)) % 1.4) * W * 1.3;
      ctx.globalAlpha = 0.08 + zuf(j * 4.4) * 0.16;
      ctx.lineWidth = Math.max(1, (0.001 + zuf(j * 6.6) * 0.002) * H);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };
  const blueten = (seit) => {
    for (let j = 0; j < 34; j++) {
      const sp = 0.05 + zuf(j * 3.7) * 0.08;
      const y = ((zuf(j * 2.3) + seit * sp) % 1) * H;
      const x = ((zuf(j * 8.1) + seit * sp * 0.8 + Math.sin(seit * 1.1 + j) * 0.02) % 1) * W;
      const r = (0.004 + zuf(j * 5.9) * 0.005) * H;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(seit * (1 + zuf(j) * 2) + j);
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = j % 2 ? '#ffc4dc' : '#ffe2ee';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.6, r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };
  // Schadenszahlen wie im Spiel: springen auf, steigen und verblassen (Zeitpunkte je Szene fest)
  const zahlen = (seit, gross, nr) => {
    const fs = Math.round(H * (gross ? 0.075 : 0.06));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (let j = 0; j < 5; j++) {
      const a = (seit - (0.25 + j * 0.55) * k30) / k30;
      if (a < 0 || a > 0.9) continue;
      const krit = j % 2 === 1;
      const x = (0.3 + zuf(nr * 10 + j) * 0.4) * W;
      const y = (0.3 + zuf(nr * 10 + j + 0.5) * 0.25) * H - a * H * 0.12;
      const sc = (a < 0.12 ? 1.7 - a * 5.8 : 1) * (krit ? 1.3 : 1);
      ctx.globalAlpha = a > 0.6 ? Math.max(0, 1 - (a - 0.6) / 0.3) : 1;
      // Lichtstoß am Trefferpunkt
      if (a < 0.25) {
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(x, y + fs * 0.6, 0, x, y + fs * 0.6, fs * 2.2 * (0.6 + a * 3));
        g.addColorStop(0, krit ? 'rgba(255, 170, 60, 0.9)' : 'rgba(255, 230, 150, 0.7)');
        g.addColorStop(1, 'rgba(255, 140, 40, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - fs * 3, y - fs * 2.5, fs * 6, fs * 6);
        ctx.globalCompositeOperation = 'source-over';
      }
      const v = Math.round((gross ? 18000 : 6000) + zuf(nr * 7 + j * 3) * (gross ? 60000 : 24000)) * (krit ? 2 : 1);
      ctx.font = `800 ${Math.round(fs * sc)}px "Alegreya Sans", system-ui, sans-serif`;
      ctx.lineWidth = Math.max(2, fs * sc * 0.14);
      ctx.strokeStyle = 'rgba(30, 10, 0, 0.9)';
      const txt = v.toLocaleString('de-DE');
      ctx.strokeText(txt, x, y);
      ctx.fillStyle = krit ? '#ffb02a' : '#ffe48a';
      ctx.fillText(txt, x, y);
    }
    ctx.globalAlpha = 1;
  };
  const rand = (staerke) => {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
    g.addColorStop(0, 'rgba(0, 0, 0, 0)');
    g.addColorStop(1, `rgba(0, 0, 0, ${staerke})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // unten dunkler, damit der Text gut lesbar ist
    const u = ctx.createLinearGradient(0, H, 0, H * 0.6);
    u.addColorStop(0, 'rgba(6, 4, 10, 0.62)');
    u.addColorStop(1, 'rgba(6, 4, 10, 0)');
    ctx.fillStyle = u;
    ctx.fillRect(0, H * 0.6, W, H * 0.4);
  };
  const blitz = (a, farbe) => {
    if (a <= 0) return;
    ctx.globalAlpha = Math.min(1, a);
    ctx.fillStyle = farbe || '#fff6e0';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  };

  // ----- Texte und Karte (nur bei Wechsel des Teils anfassen) -----
  let teilAlt = '';
  const textSetzen = (tl) => {
    const key = tl.art + tl.i;
    if (key === teilAlt) return;
    teilAlt = key;
    if (tl.art === 'szene') {
      const sz = S.liste[tl.i];
      titel.textContent = typeof sz.titel === 'function' ? sz.titel() : sz.titel;
      unter.textContent = sz.unter;
    }
    logo.hidden = tl.art !== 'vor';
    text.hidden = tl.art !== 'szene';
    karte.hidden = tl.art !== 'karte';
    flaeche.classList.toggle('ws-schluss', tl.art === 'karte');
  };
  const stil = (el, a, x, y, s) => {
    const o = a.toFixed(3);
    const tr = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${s.toFixed(3)})`;
    if (el.__o !== o) { el.style.opacity = o; el.__o = o; }
    if (el.__t !== tr) { el.style.transform = tr; el.__t = tr; }
  };

  let tAlt = -1;
  let rafId = 0;
  let aus = false;
  const bild = () => {
    if (aus) return;
    rafId = requestAnimationFrame(bild);
    const neu = groesse();
    const t = steuer.zeit();
    if (!neu && Math.abs(t - tAlt) < 1e-4) return;
    tAlt = t;
    const tl = teilBei(t);
    textSetzen(tl);
    const k = tl.seit / tl.d;
    ctx.save();
    ctx.fillStyle = '#07050b';
    ctx.fillRect(0, 0, W, H);
    if (tl.art === 'vor') {
      // Vorspann: erstes Bild dunkel und weit, Schriftzug zoomt heran, goldener Staub
      bildZeichnen(S.liste[0].bild, k * 0.35, S.liste[0], 0.12 * (1 - glatt(k)), 0.45);
      rand(0.7);
      funken(tl.seit, ['#ffd98a', '#ffe9b8', '#c8a8ff'], 40, 0.06);
      const e = raus(tl.seit / (0.7 * k30));
      stil(logo, Math.min(1, e) * (k > 0.88 ? Math.max(0, 1 - (k - 0.88) / 0.12) : 1), 0, (1 - e) * 10, 1.18 - 0.18 * e);
      blitz(1 - tl.seit / (0.35 * k30), '#000000');
    } else if (tl.art === 'szene') {
      const sz = S.liste[tl.i];
      const punch = ruhig ? 0 : 0.06 * Math.max(0, 1 - tl.seit / (0.35 * k30));
      let dx = 0;
      let dy = 0;
      if (sz.fx === 'beben' && !ruhig) {
        // Beben beim Schnitt und noch einmal in der Mitte
        const b1 = Math.max(0, 1 - tl.seit / (0.45 * k30));
        const b2 = Math.max(0, 1 - Math.abs(tl.seit - 1.4 * k30) / (0.3 * k30));
        const st = (b1 + b2 * 0.7) * H * 0.012;
        dx = Math.sin(t * 91) * st;
        dy = Math.cos(t * 77) * st;
      }
      ctx.translate(dx, dy);
      bildZeichnen(sz.bild, k, sz, punch);
      ctx.translate(-dx, -dy);
      if (sz.fx === 'funken') funken(tl.seit, ['#c9b8ff', '#9fe0ff', '#ffffff'], 46, 0.05);
      else if (sz.fx === 'glut') glut(tl.seit);
      else if (sz.fx === 'wind') wind(tl.seit);
      else if (sz.fx === 'schnee') schnee(tl.seit);
      else if (sz.fx === 'blueten') blueten(tl.seit);
      else if (sz.fx === 'treffer') zahlen(tl.seit, false, tl.i);
      else if (sz.fx === 'beben') {
        const p = 0.18 + 0.12 * Math.sin(tl.seit * 6);
        const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.65);
        g.addColorStop(0, 'rgba(120, 0, 0, 0)');
        g.addColorStop(1, `rgba(120, 0, 0, ${p.toFixed(3)})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        zahlen(tl.seit, true, tl.i);
      }
      rand(0.5);
      // Text: gleitet von links herein, verschwindet kurz vor dem Schnitt
      const ein = raus((tl.seit - 0.08 * k30) / (0.4 * k30));
      const weg = Math.max(0, (tl.seit - (tl.d - 0.25 * k30)) / (0.25 * k30));
      stil(titel, ein * (1 - weg), (1 - ein) * -40 - weg * 20, 0, 1);
      const ein2 = raus((tl.seit - 0.22 * k30) / (0.4 * k30));
      stil(unter, ein2 * (1 - weg), (1 - ein2) * -30 - weg * 20, 0, 1);
      if (!ruhig) blitz(0.55 * (1 - tl.seit / (0.18 * k30)));
    } else {
      // Abschlusskarte: dunkles Bild mit Funken, die Karte schwebt herein
      bildZeichnen(S.karteBild, Math.min(1, tl.seit / 6), { zoom: [1.1, 1.18], x: [0, 0], y: [0, 0] }, 0, 0.55);
      funken(tl.seit, ['#ffd98a', '#c9b8ff', '#9fe0ff'], 50, 0.04);
      rand(0.75);
      const e = raus(tl.seit / (0.5 * k30));
      stil(karte, e, 0, (1 - e) * 16, 0.94 + 0.06 * e);
      if (!ruhig) blitz(0.7 * (1 - tl.seit / (0.25 * k30)));
    }
    ctx.restore();
  };

  return {
    start() {
      // das erste Bild zuerst, die anderen gleich danach (Reihenfolge der Szenen)
      for (const sz of S.liste) bildHolen(sz.bild);
      bildHolen(S.karteBild);
      musik.start();
      rafId = requestAnimationFrame(bild);
    },
    // für Tests: Musik, geladene Bilder, aktueller Teil
    zustand: () => ({ musik: musik.zustand(), bilder: [...bilder.entries()].filter(([, b]) => b.ok).map(([n]) => n), teil: teilAlt, karte: !karte.hidden }),
    wartet: () => false,
    pause() { musik.pause(); },
    weiter() { musik.weiter(); },
    ton(stumm) { musik.ton(stumm); },
    tick() { musik.tick(); },
    fertig() { musik.ausblenden(3); },
    ende() {
      aus = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', neuMessen);
      musik.ende();
      for (const b of bilder.values()) b.im.onload = null;
      bilder.clear();
    }
  };
}

// Musik der Werbung (Fassung „szenen“): Datei holen und dekodieren wie die Spielmusik (sndFetch/sndDecode,
// klang-dateien.js), dann über den Audio-Kontext des Spiels abspielen – mit eigenem Lautstärkeregler direkt am Ausgang,
// denn Klänge und Musik des Spiels sind während der Werbung stumm (werbungTon). Gespielt wird ab der Stelle, die zur Zeit
// der Werbung passt (Schnitte auf dem Takt); Pause, Stumm und Ausblenden über diesen Regler. Ohne Ton (kein Kontext,
// Datei fehlt) läuft die Werbung still weiter.
function werbungMusik(url, steuer) {
  const M = { ctx: null, gain: null, buf: null, src: null, aus: false, laut: 0.7, weg: false, durch: false, starts: 0, halts: 0, endet: 0 };
  const ziel = () => (steuer.stumm() || M.weg ? 0 : M.laut);
  const regeln = (v, zeitK) => {
    if (!M.gain) return;
    const t = M.ctx.currentTime;
    const g = M.gain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.setTargetAtTime(v, t, zeitK || 0.05);
  };
  const halt = () => {
    if (!M.src) return;
    M.halts++;
    const s = M.src;
    M.src = null;
    // kurz ausblenden statt hart abschneiden (kein Knacken)
    try {
      const t = M.ctx.currentTime;
      M.gain.gain.cancelScheduledValues(t);
      M.gain.gain.setValueAtTime(M.gain.gain.value, t);
      M.gain.gain.setTargetAtTime(0, t, 0.012);
      s.stop(t + 0.06);
    } catch (e) {
      try { s.stop(); } catch (x) { /* schon aus */ }
    }
    s.onended = () => { try { s.disconnect(); } catch (e) { /* egal */ } };
  };
  const los = () => {
    if (M.aus || M.src || !M.buf || !M.ctx || M.weg || M.durch || !steuer.laeuft()) return;
    const ab = Math.min(Math.max(0, M.buf.duration - 0.05), steuer.zeit());
    if (ab >= M.buf.duration - 0.06) return;
    try {
      if (M.ctx.state === 'suspended' && M.ctx.resume) M.ctx.resume().catch(() => {});
      const s = M.ctx.createBufferSource();
      s.buffer = M.buf;
      s.connect(M.gain);
      M.gain.gain.cancelScheduledValues(M.ctx.currentTime);
      M.gain.gain.setValueAtTime(0, M.ctx.currentTime);
      s.start(0, ab);
      M.starts++;
      // zu Ende gespielt (die Werbezeit lief langsamer, etwa auf einem ausgelasteten Gerät): nicht von vorn beginnen
      s.onended = () => { if (M.src === s) { M.src = null; M.endet++; M.durch = true; } };
      M.src = s;
      regeln(ziel(), 0.04);
    } catch (e) { M.fehler = String(e && e.message || e); M.src = null; }
  };
  return {
    start() {
      try {
        const ctx = typeof sfx !== 'undefined' && typeof sfx.graph === 'function' ? sfx.graph() : null;
        if (!ctx) return;
        M.ctx = ctx;
        if (ctx.state === 'suspended' && ctx.resume) ctx.resume().catch(() => {});
        M.gain = ctx.createGain();
        M.gain.gain.value = 0;
        M.gain.connect(ctx.destination);
        const holen = typeof sndFetch === 'function' ? sndFetch(url) : fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))));
        const dek = typeof sfxFiles !== 'undefined' && sfxFiles.decoder ? sfxFiles.decoder() : ctx;
        holen.then((ab) => (typeof sndDecode === 'function' ? sndDecode(dek, ab) : ctx.decodeAudioData(ab))).then((buf) => {
          if (M.aus) return;
          M.buf = buf;
          los();
        }).catch(() => { /* ohne Musik */ });
      } catch (e) { /* ohne Ton */ }
    },
    // viermal je Sekunde: läuft die Werbung und die Musik noch nicht (Datei kam später), jetzt einsetzen
    tick() { if (!M.src) los(); },
    pause() { halt(); },
    weiter() { los(); },
    ton() { regeln(ziel(), 0.05); },
    // nach dem Zähler sanft ausblenden und dann anhalten
    ausblenden(sek) {
      M.weg = true;
      regeln(0, (sek || 3) / 4);
      setTimeout(halt, (sek || 3) * 1000 + 200);
    },
    ende() {
      M.aus = true;
      halt();
      try { if (M.gain) M.gain.disconnect(); } catch (e) { /* egal */ }
      M.buf = null;
    },
    // für Tests: geladen, spielt, Zustand des Audio-Kontexts, wie oft gestartet, angehalten und zu Ende gespielt
    zustand: () => ({ geladen: !!M.buf, spielt: !!M.src, ctx: M.ctx ? M.ctx.state : '', starts: M.starts, halts: M.halts, endet: M.endet, fehler: M.fehler || '' })
  };
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
    '.werbung-zu, .werbung-ton { width: 38px; height: 38px; flex: none; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.25);' +
    ' background: rgba(0, 0, 0, 0.45); color: #fff; font-size: 18px; cursor: pointer; }' +
    '.werbung-ton { display: inline-flex; align-items: center; justify-content: center; padding: 0; }' +
    '.werbung-ton svg { width: 20px; height: 20px; }' +
    '.werbung-ton .wl-aus, .werbung-ton.aus .wl-an { display: none; }' +
    '.werbung-ton.aus .wl-aus { display: inline; }' +
    '.werbung-ton.aus { color: #ffb4a0; border-color: rgba(255, 180, 160, 0.45); }' +
    '.werbung-bild { position: relative; aspect-ratio: 16 / 9; border-radius: 8px; overflow: hidden; background: #000;' +
    ' container-type: inline-size; box-shadow: 0 0 0 1px rgba(255, 211, 77, 0.25), 0 10px 40px rgba(0, 0, 0, 0.6); }' +
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
    ' background: rgba(6, 4, 10, 0.85); border-radius: 8px; color: #f3e6c4; text-align: center; padding: 16px; z-index: 3; }' +
    '.werbung-frage[hidden], .werbung-start[hidden], .werbung-ersatz[hidden], .werbung-fertig[hidden], .werbung-bild video[hidden] { display: none; }' +
    '.werbung-frage div { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }' +
    // Fassung „szenen“: Zeichenfläche, Schriftzug, Text unten links, Abschlusskarte (Schriftgrößen mit der Breite der Fläche)
    '.ws-leinwand { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }' +
    '.ws-logo { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.3em;' +
    ' pointer-events: none; text-align: center; opacity: 0; }' +
    '.ws-logo b { font-family: var(--font-display, serif); font-weight: 400; font-size: 46px; font-size: clamp(28px, 9cqw, 92px); line-height: 1;' +
    ' letter-spacing: 0.06em; color: #ffe7a6; text-shadow: 0 0 22px rgba(255, 196, 80, 0.55), 0 3px 0 #5a3a10, 0 8px 26px rgba(0, 0, 0, 0.85); }' +
    '.ws-logo span { font-size: 14px; font-size: clamp(11px, 2.3cqw, 22px); font-weight: 700; letter-spacing: 0.24em; text-transform: uppercase;' +
    ' color: #f3e6c4; text-shadow: 0 2px 8px #000; }' +
    '.ws-text { position: absolute; left: 4.5%; right: 22%; bottom: 8%; display: flex; flex-direction: column; align-items: flex-start; gap: 0.35em;' +
    ' pointer-events: none; }' +
    '.ws-text b { font-family: var(--font-display, serif); font-weight: 400; font-size: 28px; font-size: clamp(18px, 5.6cqw, 56px); line-height: 1.05;' +
    ' color: #fff4d6; padding-left: 0.4em; border-left: 0.13em solid #ffc94a; opacity: 0;' +
    ' text-shadow: 0 2px 0 rgba(0, 0, 0, 0.55), 0 4px 18px rgba(0, 0, 0, 0.9); }' +
    '.ws-text span { font-size: 13px; font-size: clamp(10px, 2.2cqw, 22px); font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;' +
    ' color: #ffd98a; padding-left: 0.95em; opacity: 0; text-shadow: 0 2px 8px #000, 0 0 2px #000; }' +
    '.ws-karte { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 3%; opacity: 0; }' +
    '.ws-karte-in { display: flex; flex-direction: column; align-items: center; gap: 0.5em; max-width: 94%; padding: 1em 1.6em; text-align: center;' +
    ' font-size: 14px; font-size: clamp(10px, 2.3cqw, 21px); border-radius: 14px; background: rgba(14, 10, 22, 0.64);' +
    ' border: 1px solid rgba(255, 211, 77, 0.38); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6), inset 0 0 30px rgba(160, 120, 255, 0.14);' +
    ' -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }' +
    '.ws-karte-logo { font-family: var(--font-display, serif); font-size: 1.35em; letter-spacing: 0.08em; color: #ffe7a6;' +
    ' text-shadow: 0 0 14px rgba(255, 196, 80, 0.5); }' +
    '.ws-karte-titel { font-family: var(--font-display, serif); font-size: 1.6em; line-height: 1.15; color: #fff4d6; text-shadow: 0 2px 10px #000; }' +
    '.ws-karte-name { font-size: 1.2em; font-weight: 800; letter-spacing: 0.02em; color: #ffd34d; }' +
    '.ws-knoepfe { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.7em; margin-top: 0.15em; }' +
    '.ws-knopf { display: inline-flex; align-items: center; gap: 0.5em; min-height: 40px; padding: 0.3em 1.1em 0.3em 0.35em; border-radius: 999px;' +
    ' border: 1px solid rgba(255, 255, 255, 0.3); color: #fff; font-size: 1.1em; font-weight: 800; text-decoration: none; cursor: pointer;' +
    ' box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45); }' +
    '.ws-knopf svg { width: 1.9em; height: 1.9em; min-width: 28px; min-height: 28px; flex: none; border-radius: 0.5em; }' +
    '.ws-instagram { background: linear-gradient(135deg, #4a2160, #6a1f3c); }' +
    '.ws-tiktok { background: linear-gradient(135deg, #12181e, #3a1226); }' +
    '.ws-knopf:hover, .ws-knopf:focus-visible { border-color: #ffd34d; outline: none; filter: brightness(1.12); }' +
    '.ws-knopf.getippt { box-shadow: 0 0 0 2px rgba(157, 255, 154, 0.65), 0 4px 14px rgba(0, 0, 0, 0.45); }' +
    '.ws-karte-unter { font-size: 0.9em; color: #cdbf9f; }' +
    '.ws-logo[hidden], .ws-text[hidden], .ws-karte[hidden] { display: none; }';
  (document.head || document.documentElement).appendChild(css);
})();
