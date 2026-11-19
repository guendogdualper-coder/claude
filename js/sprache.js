// Sprachen (seit 13.9). Das Spiel ist auf Deutsch geschrieben; für andere Sprachen gibt es Wörterbücher
// (js/sprachen/<code>.js: deutscher Text → Übersetzung). Gewählt wird in den Einstellungen oder auf dem Startbildschirm
// (Globus oben rechts). Ohne eigene Wahl (seit 15.46) die erste Sprache des Geräts, die es gibt; sonst Englisch.
// Die Übersetzung passiert beim Anzeigen: Jeder Text im Fenster, der genau einem Eintrag entspricht, wird ersetzt.
// Zahlen werden dabei zu Platzhaltern ({0}, {1} …), damit „Stufe 12“ und „Stufe 40“ denselben Eintrag nutzen.
// Englisch übersetzt Oberfläche und Inhalte (Fertigkeiten, Monster, Gegenstände, Quests), die anderen Sprachen
// die Oberfläche und kurze Inhalte (Namen); lange Texte zeigen sie auf Englisch. Die Versionsliste bleibt deutsch.
// Abdeckung prüfen und Nachträge: docs/sprachen.md.

const LANGS = {
  de: 'Deutsch', en: 'English', fr: 'Français', es: 'Español', it: 'Italiano',
  pl: 'Polski', nl: 'Nederlands', pt: 'Português', tr: 'Türkçe',
  // seit 15.46 (Namen in der eigenen Schrift)
  id: 'Bahasa Indonesia', ru: 'Русский', vi: 'Tiếng Việt', zh: '简体中文', ja: '日本語', ko: '한국어'
};
// Sprachkennung für <html lang> (wählt bei chinesischen/japanischen Zeichen die passende Schriftform)
const I18N_HTML_LANG = { zh: 'zh-CN' };
// Schriften für Sprachen, die die eingebauten Schriften (Alegreya Sans, Marcellus SC: nur Latein) nicht abdecken:
// Systemschriften der Geräte, kein Download. Gilt für Fenster (css/style.css, :lang) und Zeichenfläche (siehe unten).
const I18N_FONTS = {
  zh: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans SC", "Source Han Sans SC", "WenQuanYi Micro Hei", "WenQuanYi Zen Hei"',
  ja: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Yu Gothic", "Meiryo", "Noto Sans CJK JP", "Noto Sans JP"',
  ko: '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans CJK KR", "Noto Sans KR", "NanumGothic"',
  // Vietnamesisch: Alegreya/Marcellus fehlen die Zeichen mit zwei Akzenten (ế, ữ …) – ganz auf Systemschriften
  vi: '"Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans"'
};
window.LANG_DATA = window.LANG_DATA || {};

const i18n = {
  lang: (() => {
    try {
      const o = JSON.parse(localStorage.getItem('seelenstein.optionen') || '{}');
      if (o.lang && LANGS[o.lang]) return o.lang;
    } catch (e) { /* privat */ }
    // ohne eigene Wahl (seit 15.46): die erste Gerätesprache, die es im Spiel gibt (deutsche Geräte bleiben deutsch),
    // sonst Englisch. „in“ ist die alte Kennung für Indonesisch, „zh-TW/HK“ bekommen ebenfalls 简体中文.
    try {
      const list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
      for (const l of list) {
        let c = String(l || '').toLowerCase().split(/[-_]/)[0];
        if (c === 'in') c = 'id';
        if (LANGS[c]) return c;
      }
    } catch (e) { /* ohne navigator */ }
    return 'en';
  })(),
  dict: null,
  cache: new Map(),
  observer: null
};

// Wörterbuch der gewählten Sprache gleich beim Laden holen (vor den übrigen Skripten)
// Fehlt in einer Sprache ein Text (lange Texte gibt es vorerst nur auf Englisch), springt Englisch ein statt Deutsch
if (i18n.lang !== 'de' && i18n.lang !== 'en') document.write('<script src="js/sprachen/en.js"><\/script>');
if (i18n.lang !== 'de') document.write(`<script src="js/sprachen/${i18n.lang}.js"><\/script>`);
document.documentElement.lang = I18N_HTML_LANG[i18n.lang] || i18n.lang;

// Zeichenfläche (Namen über Köpfen, schwebende Texte, 3D-Beschriftungen): ctx.font nennt nur Alegreya/Marcellus und
// eine Schriftfamilie wie sans-serif – für Chinesisch, Japanisch, Koreanisch und Vietnamesisch die Systemschriften
// davor einfügen (einmal je Schriftangabe umgerechnet).
(() => {
  const add = I18N_FONTS[i18n.lang];
  const C = typeof CanvasRenderingContext2D !== 'undefined' ? CanvasRenderingContext2D.prototype : null;
  const d = C && Object.getOwnPropertyDescriptor(C, 'font');
  if (!add || !d || !d.set) return;
  const memo = new Map();
  const conv = (v) => {
    let s = String(v);
    if (i18n.lang === 'vi') s = s.replace(/"?(Alegreya Sans|Marcellus SC)"?,\s*/g, '');
    return /(sans-serif|serif|monospace|system-ui)\s*$/.test(s) ? s.replace(/(sans-serif|serif|monospace|system-ui)\s*$/, add + ', $1') : s + ', ' + add + ', sans-serif';
  };
  const fix = (v) => {
    let f = memo.get(v);
    if (f === undefined) {
      f = conv(v);
      if (memo.size > 500) memo.clear();
      memo.set(v, f);
    }
    return f;
  };
  Object.defineProperty(C, 'font', { configurable: true, enumerable: d.enumerable, get: d.get, set(v) { d.set.call(this, fix(v)); } });
  if (typeof OffscreenCanvasRenderingContext2D !== 'undefined') {
    const o = Object.getOwnPropertyDescriptor(OffscreenCanvasRenderingContext2D.prototype, 'font');
    if (o && o.set) Object.defineProperty(OffscreenCanvasRenderingContext2D.prototype, 'font', { configurable: true, enumerable: o.enumerable, get: o.get, set(v) { o.set.call(this, fix(v)); } });
  }
})();

const I18N_NUM = /\d+(?:[.,]\d+)*/g;
// Nachschlagen eines bereinigten Textes (ohne Rand): genau, mit Zahlen als Platzhaltern, Wort vor Zahl, Rolle vor Name
function trLookup(d, t) {
  if (!t) return undefined;
  let hit = d[t];
  if (hit !== undefined) return hit;
  if (/\d/.test(t)) {
    const nums = [];
    const key = t.replace(I18N_NUM, (m) => { nums.push(m); return '{' + (nums.length - 1) + '}'; });
    const tpl = d[key];
    if (tpl !== undefined) return tpl.replace(/\{(\d+)\}/g, (_, i) => (nums[i] !== undefined ? nums[i] : ''));
    // Wort vor einer Zahl („Stufe 1/15“) oder Zahl vor Wörtern („12 × Wolf“)
    const m = t.match(/^(.*?[A-Za-zÄÖÜäöüß.:)])\s+([+−-]?\d.*)$/);
    // (seit 15.46 nur, wenn hinter der Zahl kein Text mehr kommt: „du hast 0 · von Steintitan …“ ist kein „du hast {0}“)
    if (m && d[m[1]] !== undefined && !/[A-Za-zÄÖÜäöüß]{2}/.test(m[2])) return d[m[1]] + ' ' + m[2];
    const n = t.match(/^([+−-]?[\d.,%/×]+\s*[×x]?\s*)([A-Za-zÄÖÜäöüß].*)$/);
    if (n && d[n[2]] !== undefined) return n[1] + d[n[2]];
  }
  // Rolle vor einem Namen („Waffenhändler Goro“): nur die Rolle übersetzen, der Name bleibt
  // (seit 15.46 nur, wenn danach wirklich ein Name steht: ein oder zwei großgeschriebene Wörter, kein Satz wie „Keine Ausrüstung in der Tasche“)
  const sp = t.indexOf(' ');
  if (sp > 0 && d[t.slice(0, sp)] !== undefined && /^[A-ZÄÖÜ][^\s]*( [A-ZÄÖÜ][^\s]*)?$/.test(t.slice(sp + 1))) return d[t.slice(0, sp)] + t.slice(sp);
  return undefined;
}
// Zeichen am Rand, die nicht zum Text gehören (Trenner, Klammern, Anführungszeichen, Symbole wie 📍 – seit 15.46 alle)
const I18N_EDGE = /^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u;
// Ein Textstück übersetzen (undefined, wenn es keinen Eintrag gibt): genau, ohne Zeichen am Rand („ · Lauftempo“,
// „(Dungeon)“, „📍 Sonnenwiesen“) und seit 15.46 „Name (Zusatz)“ in zwei Teilen („Rotfuchs (Stufe 5)“)
function trOne(d, t) {
  let hit = trLookup(d, t);
  if (hit !== undefined) return hit;
  const m = t.match(I18N_EDGE);
  if (m && m[2] && (m[1] || m[3])) {
    hit = trLookup(d, m[2]);
    // (Abkürzungen wie „Min.“ behalten ihren Punkt als Punkt)
    if (hit !== undefined) return m[1] + hit + (m[3][0] === '.' && /(^|[^\p{L}])\p{L}{1,4}$/u.test(m[2]) ? m[3] : i18nTail(hit, m[3]));
  }
  const k = t.match(/^(.+?) \(([^()]+)\)([.:]?)$/);
  if (k) {
    const a = trOne(d, k[1]);
    const b = /[A-Za-zÄÖÜäöüß]{2}/.test(k[2]) ? trOne(d, k[2]) : k[2];
    if (a !== undefined && b !== undefined) return a + ' (' + b + ')' + k[3];
  }
  // „Bezeichnung: Text“ in zwei Teilen, wenn es beide gibt („Tipp: Mit zwei Fingern …“ im Ladebild, seit 15.46;
  // seit 15.52 bis 40 Zeichen, damit auch lange Bossnamen wie „Kharzul, Wächter der Verdammten“ passen)
  const lb = t.match(/^([^:]{2,40}): (.+)$/);
  if (lb) {
    const a = trLookup(d, lb[1]);
    let b = a !== undefined ? trOne(d, lb[2]) : undefined;
    // Aufzählung nach der Bezeichnung („Schwerpunkt: Angriff, Ausweichen, Lauftempo“)
    if (a !== undefined && b === undefined && lb[2].includes(', ')) {
      const l = lb[2].split(', ').map((x) => trOne(d, x));
      if (!l.includes(undefined)) b = l.join(i18nTail(a, ':') === ':' ? ', ' : '、');
    }
    if (b !== undefined) return a + (i18nTail(a, ':') === ':' ? ': ' : '：') + b;
  }
  // Name vor einer Meldung („Goro hat die Gruppe verlassen.“, seit 15.46): der Name bleibt (Monsternamen übersetzt), der Rest wird übersetzt
  const nm = t.match(/^([A-ZÄÖÜ][^\s]*(?: [A-ZÄÖÜ][^\s]*){0,2}) ([a-zäöüß].*)$/);
  if (nm && !I18N_NOT_NAME.test(nm[1])) {
    const r = nm[2].match(I18N_EDGE);
    hit = trLookup(d, nm[2]);
    if (hit === undefined && r && r[2] && r[3] && !r[1]) { hit = trLookup(d, r[2]); if (hit !== undefined) hit += i18nTail(hit, r[3]); }
    if (hit !== undefined) return (trLookup(d, nm[1]) || nm[1]) + ' ' + hit;
  }
  return undefined;
}
// Satzzeichen am Ende nach chinesischem/japanischem Text in voller Breite („胜利！“ statt „胜利!“)
function i18nTail(hit, tail) {
  return /[\u3040-\u30ff\u3400-\u9fff]$/.test(hit) ? tail.replace(/^\./, '。').replace(/^!/, '！').replace(/^\?/, '？').replace(/^:/, '：') : tail;
}
const I18N_NOT_NAME = /^(Du|Er|Sie|Es|Ihr|Wir|Ich|Man|Das|Der|Die|Den|Dem|Des|Dein|Deine|Ein|Eine|Kein|Keine|Im|In|Am|Auf|Mit|Für|Bei|Von|Zu|Nur|Noch|Jetzt|Hier|Dieser|Diese|Dieses|Jeder|Jede|Alle)\b/;
function trText(s) {
  const d = i18n.dict;
  if (!d || !s) return s;
  const c = i18n.cache.get(s);
  if (c !== undefined) return c;
  const t = s.replace(/\s+/g, ' ').trim();
  // eigene Sprache zuerst, Englisch nur als Rückfall (seit 15.46: sonst gewänne z. B. „Sieg!“ aus en.js gegen „Sieg“
  // im eigenen Wörterbuch, weil der genaue Schlüssel vor dem ohne Satzzeichen gefunden wird)
  const own = i18n.lang !== 'en' && window.LANG_DATA[i18n.lang];
  const one = (x) => { const h = own ? trOne(own, x) : undefined; return h !== undefined ? h : trOne(d, x); };
  let hit = t && own ? trOne(own, t) : undefined;
  // „Chat · Tippe …“: alle Teile in der eigenen Sprache gehen vor der ganzen Zeile auf Englisch (Namen ohne Eintrag,
  // auch nicht in en.js, bleiben stehen: „Kapitel 3 · Kazehana“)
  if (hit === undefined && own && t.includes(' · ')) {
    let mine = 0;
    const p = t.split(' · ').map((x) => {
      if (!/[A-Za-zÄÖÜäöüß]{2}/.test(x)) return x;
      const h = trOne(own, x);
      if (h !== undefined) { mine++; return h; }
      const e = trOne(d, x);
      return e === undefined || e === x ? x : undefined;
    });
    if (mine && !p.includes(undefined)) hit = p.join(' · ');
  }
  if (hit === undefined && t) hit = trOne(d, t);
  let out = s;
  if (hit !== undefined) out = s.replace(s.trim(), hit);
  // zusammengesetzte Zeilen („Dolch · Ninja · Selten · ab Stufe 15“): Teil für Teil (seit 13.10)
  else if (t.includes(' · ')) {
    let any = false;
    const parts = t.split(' · ').map((x) => {
      const h = one(x);
      if (h !== undefined) any = true;
      return h !== undefined ? h : x;
    });
    if (any) out = s.replace(s.trim(), parts.join(' · '));
  }
  if (i18n.cache.size > 20000) i18n.cache.clear();
  i18n.cache.set(s, out);
  return out;
}

const I18N_ATTRS = ['title', 'aria-label', 'placeholder'];
function trNode(n) {
  const v = trText(n.data);
  if (v !== n.data) n.data = v;
}
function trAttrs(el) {
  for (const a of I18N_ATTRS) {
    const v = el.getAttribute(a);
    if (!v) continue;
    const t = trText(v);
    if (t !== v) el.setAttribute(a, t);
  }
}
function trTree(root) {
  if (root.nodeType === 3) {
    trNode(root);
    return;
  }
  if (root.nodeType !== 1 || root.tagName === 'SCRIPT' || root.tagName === 'STYLE') return;
  trAttrs(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n;
  while ((n = w.nextNode())) {
    if (n.nodeType === 3) {
      const p = n.parentElement;
      if (p && (p.tagName === 'SCRIPT' || p.tagName === 'STYLE' || p.closest('.no-tr'))) continue;
      trNode(n);
    } else trAttrs(n);
  }
}

function i18nStart() {
  document.documentElement.lang = I18N_HTML_LANG[i18n.lang] || i18n.lang;
  const own = window.LANG_DATA[i18n.lang];
  i18n.dict = own ? (i18n.lang === 'en' ? own : Object.assign({}, window.LANG_DATA.en || {}, own)) : null;
  if (!i18n.dict) return;
  trTree(document.body);
  i18n.observer = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'characterData') trNode(m.target);
      else if (m.type === 'attributes') trAttrs(m.target);
      else for (const n of m.addedNodes) {
        if (n.parentElement && n.parentElement.closest('.no-tr')) continue;
        trTree(n);
      }
    }
  });
  i18n.observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: I18N_ATTRS });
}

function setLang(code) {
  if (!LANGS[code] || code === i18n.lang) return;
  try {
    const o = JSON.parse(localStorage.getItem('seelenstein.optionen') || '{}');
    o.lang = code;
    localStorage.setItem('seelenstein.optionen', JSON.stringify(o));
  } catch (e) { /* privat */ }
  if (typeof game !== 'undefined' && game.running && typeof saveGame === 'function') saveGame();
  location.reload();
}

// Auswahl auf dem Startbildschirm (oben rechts in der Karte)
function langPickerHtml() {
  return `<label class="lang-pick no-tr"><span aria-hidden="true">🌐</span><select id="langSelect" aria-label="Sprache / Language">` +
    Object.entries(LANGS).map(([k, v]) => `<option value="${k}"${k === i18n.lang ? ' selected' : ''}>${v}</option>`).join('') + '</select></label>';
}
document.addEventListener('DOMContentLoaded', () => {
  const head = document.querySelector('#startScreen .start-head');
  if (head) {
    head.insertAdjacentHTML('afterbegin', langPickerHtml());
    document.getElementById('langSelect').addEventListener('change', (e) => setLang(e.target.value));
  }
  i18nStart();
});
