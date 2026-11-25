#!/usr/bin/env node
// Bestenliste nachtragen: trägt alle Charaktere aus den Konten in die Bestenliste ein, die dort noch fehlen –
// auch von Spielern, die gerade nicht spielen oder sich lange nicht angemeldet haben.
//
// Warum: Das Spiel schreibt den Eintrag eines Charakters selbst, aber erst wenn sein Besitzer angemeldet spielt
// (js/bestenliste.js rankSync). Wer seit dem Einspielen der Regeln nicht mehr da war, stünde sonst nicht in der Liste.
// Dieses Werkzeug liest mit dem Dienstkonto des Firebase-Projekts alle Konten (konten/<uid>) und legt die fehlenden
// Einträge an (rangliste/<uid>_<platz>). Einträge, die schon da sind, bleiben unberührt (das Spiel hält sie aktuell).
//
// Aufruf (läuft auch über GitHub Actions, .github/workflows/bestenliste.yml):
//   FIREBASE_DIENSTKONTO='<Inhalt der JSON-Datei des Dienstkontos>' node tools/bestenliste-nachtragen.js [--probe] [--alle]
//     --probe  nur zählen, nichts schreiben
//     --alle   auch vorhandene Einträge neu schreiben (sonst nur fehlende)
// Das Dienstkonto ist ein Geheimnis: nur als GitHub-Secret oder lokal als Umgebungsvariable, nie im Repository.
// Anleitung: docs/konten-einrichten.md, Abschnitt „Bestenliste nachtragen“.

'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PROBE = process.argv.includes('--probe');
const ALLE = process.argv.includes('--alle');
// wie im Spiel (js/bestenliste.js RANK, docs/firebase-regeln.json)
const KLASSEN = ['krieger', 'ninja', 'schamane', 'nekromant', 'magier'];
const MAX_STUFE = 80;
const MAX_RP = 50000;
const NAME_MAX = 16;

function lies(datei, muster, was) {
  const m = fs.readFileSync(path.join(ROOT, datei), 'utf8').match(muster);
  if (!m) throw new Error(`${was} nicht gefunden in ${datei}`);
  return m[1];
}
// Kennung des offiziellen Starts: Konten ohne sie tragen noch Charaktere von vorher (die gelten nicht mehr)
const NEUSTART_ID = lies('js/neustart.js', /const NEUSTART_ID = '([^']+)'/, 'NEUSTART_ID');
const DB = (process.env.BESTENLISTE_DB_URL || lies('js/konto-config.js', /^\s*databaseURL: '([^']+)'/m, 'databaseURL')).replace(/\/$/, '');

const b64 = (x) => Buffer.from(x).toString('base64url');

// Zugangsschlüssel für das Dienstkonto holen (OAuth 2, JWT mit RS256)
async function zugang(konto) {
  const jetzt = Math.floor(Date.now() / 1000);
  const kopf = b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const inhalt = b64(JSON.stringify({
    iss: konto.client_email,
    scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/firebase.database',
    aud: konto.token_uri, iat: jetzt, exp: jetzt + 3600
  }));
  const sig = crypto.createSign('RSA-SHA256').update(kopf + '.' + inhalt).sign(konto.private_key).toString('base64url');
  const r = await fetch(konto.token_uri, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + kopf + '.' + inhalt + '.' + sig
  });
  if (!r.ok) throw new Error('Anmeldung des Dienstkontos abgelehnt (' + r.status + ')');
  const d = await r.json();
  if (!d.access_token) throw new Error('Anmeldung des Dienstkontos ohne Schlüssel');
  return d.access_token;
}

async function db(methode, pfad, token, body) {
  const r = await fetch(`${DB}/${pfad}`, {
    method: methode, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`${methode} ${pfad.split('?')[0]} fehlgeschlagen (${r.status})`);
  return r.json();
}

// Eintrag aus einem Spielstand (wie rankEntryOf im Spiel; ohne Ausrüstungslevel – das trägt das Spiel selbst nach)
function eintrag(sv) {
  if (!sv || typeof sv !== 'object' || sv.deleted || !KLASSEN.includes(sv.classId) || typeof sv.name !== 'string' || !sv.name.trim()) return null;
  const level = Math.max(1, Math.min(MAX_STUFE, Math.floor(Number(sv.level) || 1)));
  const rp = Math.min(MAX_RP, Math.max(0, Math.round((sv.pvp && Number(sv.pvp.pts)) || 0)));
  const e = { name: sv.name.trim().slice(0, NAME_MAX), cls: sv.classId, level, xp: Math.max(0, Math.floor(Number(sv.xp) || 0)), rp, at: { '.sv': 'timestamp' } };
  if (Number.isInteger(sv.path) && sv.path >= 0 && sv.path <= 9) e.path = sv.path;
  if (sv.faction === 'licht' || sv.faction === 'schatten') e.seite = sv.faction === 'schatten' ? 's' : 'l';
  return e;
}

(async () => {
  const roh = process.env.FIREBASE_DIENSTKONTO;
  if (!roh || !roh.trim()) {
    console.log('Kein Dienstkonto hinterlegt (FIREBASE_DIENSTKONTO) – nichts zu tun.');
    return;
  }
  let konto;
  try { konto = JSON.parse(roh); } catch (e) { throw new Error('FIREBASE_DIENSTKONTO ist kein gültiges JSON'); }
  if (!konto.client_email || !konto.private_key || !konto.token_uri) throw new Error('Im Dienstkonto fehlen client_email, private_key oder token_uri');
  const token = await zugang(konto);

  const uids = Object.keys((await db('GET', 'konten.json?shallow=true', token)) || {});
  const da = new Set(Object.keys((await db('GET', 'rangliste.json?shallow=true', token)) || {}));
  const z = { konten: uids.length, alt: 0, leer: 0, charaktere: 0, schonDa: 0, neu: 0, kaputt: 0 };
  const patch = {};
  for (const uid of uids) {
    // Kennungen mit Zeichen, die in einem Schlüssel nichts zu suchen haben, auslassen
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) { z.kaputt++; continue; }
    const d = await db('GET', `konten/${uid}.json`, token);
    if (!d || !d.slots) { z.leer++; continue; }
    if (d.launch !== NEUSTART_ID) { z.alt++; continue; }
    for (const [k, text] of Object.entries(d.slots)) {
      if (!/^\d$/.test(k) || typeof text !== 'string') continue;
      let sv = null;
      try { sv = JSON.parse(text); } catch (e) { z.kaputt++; continue; }
      const e = eintrag(sv);
      if (!e) continue;
      z.charaktere++;
      const id = `${uid}_${k}`;
      if (da.has(id) && !ALLE) { z.schonDa++; continue; }
      patch[`rangliste/${id}`] = e;
      z.neu++;
    }
  }
  const keys = Object.keys(patch);
  if (!PROBE) {
    for (let i = 0; i < keys.length; i += 200) {
      const teil = {};
      for (const k of keys.slice(i, i + 200)) teil[k] = patch[k];
      await db('PATCH', '.json', token, teil);
    }
  }
  console.log(`Konten: ${z.konten} (vor dem Start, nicht übernommen: ${z.alt}; ohne Spielstand: ${z.leer})`);
  console.log(`Charaktere: ${z.charaktere}, schon in der Liste: ${z.schonDa}, ${PROBE ? 'würden eingetragen' : 'eingetragen'}: ${z.neu}` + (z.kaputt ? `, nicht lesbar: ${z.kaputt}` : ''));
})().catch((e) => {
  console.error('Fehler: ' + e.message);
  process.exit(1);
});
