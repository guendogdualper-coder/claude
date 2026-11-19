// Seelenstein-Wiki: Anzeige und Suche. Alle Inhalte stehen in daten.js (WIKI), gebaut von tools/wiki-bauen.js
// aus den Spieldaten. Adressen: #  (Start) · #kat/<kategorie> · #<kategorie>/<id> (Eintrag) · #seite/<id>
(function () {
  const W = window.WIKI;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const byId = new Map(W.entries.map((e) => [e.id, e]));
  const catOf = new Map(W.cats.map((c) => [c.id, c]));
  const img = (src, alt = '') => (src ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy">` : '');

  // --- Suche: Text je Eintrag einmal vorbereiten (klein, Umlaute auch als ae/oe/ue/ss) ---
  const norm = (s) => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/<[^>]+>/g, ' ').replace(/[^a-z0-9+ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  for (const e of W.entries) {
    e._n = norm(e.name);
    e._s = norm([e.sub, e.tags, e.group, catOf.get(e.cat)?.name].join(' '));
    e._t = norm([e.text, (e.facts || []).map((f) => f.join(' ')).join(' ')].join(' '));
  }
  function search(q) {
    const words = norm(q).split(' ').filter(Boolean);
    if (!words.length) return [];
    const out = [];
    for (const e of W.entries) {
      let score = 0;
      let ok = true;
      for (const w of words) {
        let s = 0;
        if (e._n === w) s = 120;
        else if (e._n.startsWith(w)) s = 80;
        else if (e._n.includes(w)) s = 55;
        else if (e._s.includes(w)) s = 25;
        else if (e._t.includes(w)) s = 8;
        if (!s) { ok = false; break; }
        score += s;
      }
      if (ok) out.push([score + (e.prio || 0), e]);
    }
    out.sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name));
    return out.slice(0, 40).map((x) => x[1]);
  }
  const mark = (text, q) => {
    let h = esc(text);
    for (const w of q.split(/\s+/).filter((x) => x.length > 1)) {
      const re = new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
      h = h.replace(re, '<mark>$1</mark>');
    }
    return h;
  };

  // --- Bausteine ---
  const badges = (e) => (e.badges || []).map(([t, c]) => `<span class="badge ${c || ''}">${esc(t)}</span>`).join('');
  const card = (e) => `<a class="card" href="#${esc(e.id)}"><span class="ci">${img(e.img, e.name)}</span><span><b>${esc(e.name)}${badges(e)}</b><small>${esc(e.sub || '')}</small></span></a>`;
  const chip = (id) => {
    const e = byId.get(id);
    if (!e) return '';
    return `<a class="chip" href="#${esc(e.id)}">${img(e.img, e.name)}<span>${esc(e.name)}</span></a>`;
  };
  // [[id]] oder [[id|Text]] im Text wird zum Verweis
  const links = (html) => String(html || '').replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, id, t) => {
    const e = byId.get(id);
    return e ? `<a href="#${esc(id)}">${esc(t || e.name)}</a>` : esc(t || id);
  });

  // --- Ansichten ---
  function viewHome() {
    const cats = W.cats.filter((c) => !c.hidden).map((c) => {
      const n = W.entries.filter((e) => e.cat === c.id).length;
      return `<a class="card" href="#${c.page ? 'seite/' + c.page : 'kat/' + c.id}"><span class="ci">${c.img ? img(c.img, c.name) : `<span style="font-size:34px">${c.icon}</span>`}</span><span><b>${esc(c.name)}</b><small>${c.page ? esc(c.short || '') : n + ' Einträge'}</small></span></a>`;
    }).join('');
    const faq = (W.pages.faq || {}).items || [];
    return `<div class="hero">${img(W.hero, '')}<div class="ht"><h1>Seelenstein-Wiki</h1><p>Alles über das Spiel an einem Ort: Klassen, Fertigkeiten, Karten, Monster, Seelensteine, Ausrüstung, Schmied, NPCs und Quests – mit Bildern direkt aus dem Spiel. Tippe oben einfach, was du suchst.</p></div></div>
      <h2 class="sec">Kategorien</h2><div class="grid">${cats}</div>
      <h2 class="sec">Häufige Fragen</h2><div class="faq">${faq.slice(0, 8).map(faqItem).join('')}</div>
      <p><a href="#seite/faq">Alle Fragen und Antworten →</a></p>`;
  }
  const faqItem = ([q, a]) => `<details><summary>${esc(q)}</summary><div>${links(a)}</div></details>`;
  function viewCat(id) {
    const c = catOf.get(id);
    if (!c) return viewHome();
    const list = W.entries.filter((e) => e.cat === id);
    const groups = new Map();
    for (const e of list) {
      const g = e.group || '';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(e);
    }
    let html = `<h2 class="sec">${esc(c.name)}</h2>${c.intro ? `<p class="dtext">${links(c.intro)}</p>` : ''}`;
    for (const [g, es] of groups) {
      if (g) html += `<h3>${esc(g)}</h3>`;
      html += `<div class="grid">${es.map(card).join('')}</div>`;
    }
    return html;
  }
  function viewEntry(e) {
    const c = catOf.get(e.cat);
    const facts = (e.facts || []).map(([k, v]) => `<div class="fact"><span>${esc(k)}</span><b>${links(v)}</b></div>`).join('');
    const secs = (e.sections || []).map((s) => `<h3>${esc(s.title)}</h3>${s.chips ? `<div class="chips">${s.chips.map(chip).join('')}</div>` : ''}${s.html ? links(s.html) : ''}`).join('');
    return `<a class="back" href="#kat/${esc(e.cat)}">← ${esc(c ? c.name : 'Zurück')}</a>
      <div class="detail"><div class="dh"><span class="di">${img(e.img, e.name)}</span><div><div class="dc">${esc(c ? c.name : '')}${e.group ? ' · ' + esc(e.group) : ''}</div><h1>${esc(e.name)}${badges(e)}</h1>${e.sub ? `<div class="ds">${esc(e.sub)}</div>` : ''}</div></div>
      ${e.text ? `<div class="dtext">${links(e.text)}</div>` : ''}${facts ? `<div class="facts">${facts}</div>` : ''}${secs}</div>`;
  }
  function viewPage(id) {
    const p = W.pages[id];
    if (!p) return viewHome();
    let html = `<h2 class="sec">${esc(p.title)}</h2>`;
    if (p.html) html += links(p.html);
    if (p.items) html += `<div class="faq">${p.items.map(faqItem).join('')}</div>`;
    return html;
  }

  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    let html;
    let active = '';
    if (!h) html = viewHome();
    else if (h.startsWith('kat/')) { active = h.slice(4); html = viewCat(active); }
    else if (h.startsWith('seite/')) { active = 'seite:' + h.slice(6); html = viewPage(h.slice(6)); }
    else if (byId.has(h)) { const e = byId.get(h); active = e.cat; html = viewEntry(e); }
    else html = viewHome();
    $('#main').innerHTML = html;
    document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('on', a.dataset.k === active));
    const e = byId.get(h);
    document.title = (e ? e.name + ' – ' : '') + 'Seelenstein-Wiki';
    window.scrollTo(0, 0);
  }

  // --- Navigation links ---
  $('#nav').innerHTML = `<a href="#" data-k=""><span class="ni">⌂</span>Start</a>` + W.cats.filter((c) => !c.hidden).map((c) => {
    const n = W.entries.filter((e) => e.cat === c.id).length;
    const k = c.page ? 'seite:' + c.page : c.id;
    return `<a href="#${c.page ? 'seite/' + c.page : 'kat/' + c.id}" data-k="${esc(k)}"><span class="ni">${c.icon}</span>${esc(c.name)}${c.page ? '' : `<span class="nc">${n}</span>`}</a>`;
  }).join('');
  $('#foot').textContent = `Stand: Spielversion ${W.version} · gebaut am ${W.built} · ${W.entries.length} Einträge`;

  // --- Suche mit Trefferliste ---
  const box = $('#q');
  const res = $('#results');
  let sel = -1;
  let hits = [];
  function showHits() {
    const q = box.value.trim();
    hits = search(q);
    sel = -1;
    if (!q) { res.classList.remove('on'); return; }
    res.innerHTML = hits.length ? hits.map((e, i) => {
      const c = catOf.get(e.cat);
      return `<a class="res" data-i="${i}" href="#${esc(e.id)}"><span class="ri">${img(e.img, e.name)}</span><span><b>${mark(e.name, q)}</b><span class="rc">${esc(c ? c.name : '')}</span><span class="rs">${mark(e.answer || e.sub || '', q)}</span></span></a>`;
    }).join('') : `<div class="noresult">Nichts gefunden für „${esc(q)}“. Versuch ein anderes Wort, zum Beispiel „Buch“, „Pferd“ oder einen Monsternamen.</div>`;
    res.classList.add('on');
  }
  box.addEventListener('input', showHits);
  box.addEventListener('focus', showHits);
  box.addEventListener('keydown', (ev) => {
    const items = res.querySelectorAll('.res');
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      sel = Math.max(0, Math.min(items.length - 1, sel + (ev.key === 'ArrowDown' ? 1 : -1)));
      items.forEach((it, i) => it.classList.toggle('sel', i === sel));
      items[sel]?.scrollIntoView({ block: 'nearest' });
    } else if (ev.key === 'Enter') {
      const e = hits[Math.max(0, sel)];
      if (e) { location.hash = e.id; res.classList.remove('on'); box.blur(); }
    } else if (ev.key === 'Escape') {
      res.classList.remove('on');
      box.blur();
    }
  });
  document.addEventListener('click', (ev) => {
    if (!ev.target.closest('.search')) res.classList.remove('on');
    if (ev.target.closest('.res')) res.classList.remove('on');
  });
  // Taste „/“ springt in die Suche
  document.addEventListener('keydown', (ev) => {
    if (ev.key === '/' && document.activeElement !== box) { ev.preventDefault(); box.focus(); }
  });
  window.addEventListener('hashchange', route);
  route();
})();
