#!/usr/bin/env python3
"""Drei Hörproben für eine neue Arenamusik (Prüfungs- und Turnierarena), gerechnet aus echten Instrumenten-Samples.

Die Arenamusik aus tools/klang-synth/musik.py („arena“) klang zu sehr nach Synthesizer. Dieses Skript baut drei
eigene, deutlich verschiedene Kompositionen aus frei verwendbaren Aufnahmen (CC0) – der Spieler wählt danach eine aus:

  a  „Titanen“  – episch-orchestral, g-Moll, 132 BPM, 64 Takte: Streicher-Spiccato-Ostinato, Fasstrommel-Ensemble
                  (große Trommel, Pauken, Tenortrommeln), Blechstöße und Hornthema, chorartige Flächen.
  b  „Stahl“    – treibend-modern, d-Moll, 128 BPM, 64 Takte: hartes Schlagzeug (echte Snare, Becken, Klatschen),
                  Synthesizer-Bass, gedoppelte Rhythmusgitarren (gezupfte Saite + Verstärker), Blechstöße, Arpeggio,
                  Klatschen der Menge.
  c  „Kirschsturm“ – fernöstlich, A (In-Skala, phrygisch), 150 BPM, 72 Takte: Koto (Đàn tranh), Shamisen-artige
                  Zupfriffs, Shakuhachi-artige Flöte, schnelle Fasstrommeln mit Shime-Wirbel, Streicher.

Samples (nur CC0, NICHT im Repo; werden beim ersten Lauf mit git in den Sample-Ordner geholt, festgelegter Stand):
  - VSCO 2 Community Edition (Versilian Studios, Sam Gossner / Simon Dalzell), github.com/sgossner/VSCO-2-CE, CC0 1.0
  - Versilian Community Sample Library (VCSL), github.com/sgossner/VCSL, CC0 1.0
Gitarren, Bass, Arpeggio, Bassdrum-Klick und Chor sind gerechnet (Karplus-Strong, Wellenformen, Formantfilter).
Alle Melodien, Riffs, Harmonien und Abläufe sind eigene Kompositionen – keine fremde Musik.

Jedes Stück wird wie in musik.py als geschlossene Schleife gerechnet (Ausklang und Hall laufen in den Anfang), die
Rohdatei enthält zwei Takte Vorspiel + Schleife + zwei Takte Nachlauf; die MP3 baut baue_musik() aus
tools/klang-erzeugen.py (Naht, −18 LUFS, höchstens −1,5 dBTP, VBR q2) – also genau wie im Spiel.

Aufruf:
  python3 tools/klang-synth/arena_varianten.py [a b c] [--aus <ordner>] [--samples <ordner>]
    --aus      Zielordner für arena_<x>.mp3, arena_<x>_probe.mp3 (30 s: Anfang + Höhepunkt) und roh/arena_<x>.wav
               (Standard ~/.cache/seelenstein-klang-roh/arena-varianten)
    --samples  Sample-Ordner (Standard ~/.cache/seelenstein-klang-roh/samples; ≈ 0,9 GB, beim ersten Lauf
               geladen – vorübergehend braucht git noch einmal so viel Platz)
Eine gewählte Fassung später ins Spiel: Rohdatei nach <roh>/musik/arena.wav kopieren, in tools/klang-liste.json bei
„arena“ bpm und schleife (Ausgabe dieses Skripts) eintragen, dann tools/klang-erzeugen.py bauen arena.

Braucht: python3 mit numpy und scipy, git, ffmpeg (libmp3lame). Rechenzeit je Stück einige Minuten.
"""
import importlib.util
import json
import os
import shutil
import struct
import subprocess
import sys
from fractions import Fraction

import numpy as np
import scipy.signal as sg

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
import musik as MU  # noqa: E402  (gleicher Ordner: Mischpult, Hall, Verdichter, Lautheit, gerechnete Instrumente)
from musik import SR, TAU, Mischer, mton, _sos, kette, eq_spitze, eq_kuhle, kreis, kreis_falt, hall_ir, verdichter, lufs, sanft, osz, bp, hp, tp  # noqa: E402,E501

_spec = importlib.util.spec_from_file_location('klang_erzeugen', os.path.join(os.path.dirname(HIER), 'klang-erzeugen.py'))
KE = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(KE)

# === Samples ==========================================================================================================
QUELLEN = {
    'vsco': dict(url='https://github.com/sgossner/VSCO-2-CE', stand='440300901dfe9275fd84e0b7763af1f8443ae62e', pfade=[
        '/LICENSE', '/Readme.txt',
        '/Strings/Cello Section/spic/', '/Strings/Viola Section/spic/', '/Strings/Violin Section/Spic/',
        '/Strings/Cello Section/susvib/', '/Strings/Viola Section/susvib/', '/Strings/Violin Section/susVib/',
        '/Strings/Solo Contrabass/Spic/', '/Strings/Solo Contrabass/Pizz/',
        '/Brass/F Horn/stac/', '/Brass/F Horn/sus/', '/Brass/Trumpet/stac/', '/Brass/Tenor Trombone/stac/',
        '/Brass/Tenor Trombone/sus/', '/Brass/Tuba/stac/', '/Woodwinds/Flute/susNV/',
        '/Percussion/BDrumNewhit*', '/Percussion/Timpani/', '/Percussion/cymbal-crash1*', '/Percussion/susCymb1-cresc*',
        '/Percussion/gongHit*', '/Percussion/Anvil*', '/Percussion/Tamb1*']),
    'vcsl': dict(url='https://github.com/sgossner/VCSL', stand='c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e', pfade=[
        '/LICENSE', '/README.md',
        '/Chordophones/Zithers/Dan Tranh/', '/Chordophones/Composite Chordophones/Strumstick/',
        '/Idiophones/Struck Idiophones/Claps/', '/Idiophones/Struck Idiophones/Hi-Hat Cymbal/',
        '/Membranophones/Struck Membranophones/Snare Drum, Modern 1/', '/Membranophones/Struck Membranophones/Tom 1/',
        '/Membranophones/Struck Membranophones/Tom 2/',
        '/Membranophones/Struck Membranophones/Frame Drum/',
        '/Idiophones/Struck Idiophones/Woodblock/', '/Membranophones/Struck Membranophones/Legacy Toms/',
        '/Idiophones/Struck Idiophones/Shaker, Small/']),
}


def hole_samples(wurzel):
    """Sample-Sammlungen (nur die gebrauchten Ordner, festgelegter Stand) mit git holen; .git danach löschen."""
    for name, q in QUELLEN.items():
        ziel = os.path.join(wurzel, name)
        if os.path.exists(os.path.join(ziel, '.fertig')):
            continue
        print('hole Samples:', q['url'], flush=True)
        tmp = ziel + '.tmp'
        shutil.rmtree(tmp, ignore_errors=True)
        os.makedirs(tmp)
        git = ['git', '-C', tmp]
        subprocess.run(git + ['init', '-q'], check=True)
        subprocess.run(git + ['remote', 'add', 'origin', q['url']], check=True)
        subprocess.run(git + ['sparse-checkout', 'set', '--no-cone'] + q['pfade'], check=True)
        subprocess.run(git + ['fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', q['stand']], check=True)
        subprocess.run(git + ['checkout', '-q', 'FETCH_HEAD'], check=True)
        shutil.rmtree(os.path.join(tmp, '.git'))
        shutil.rmtree(ziel, ignore_errors=True)
        os.rename(tmp, ziel)
        open(os.path.join(ziel, '.fertig'), 'w').write(q['stand'] + '\n')


def lies_wav(p):
    """WAV (PCM 16/24 bit, mono/stereo, 44,1/48 kHz) → float32 [n, 2] mit 44,1 kHz."""
    with open(p, 'rb') as h:
        d = h.read()
    pos, fmt, daten = 12, None, None
    while pos + 8 <= len(d):
        cid = d[pos:pos + 4]
        size = struct.unpack('<I', d[pos + 4:pos + 8])[0]
        if cid == b'fmt ':
            tag, ch, sr = struct.unpack('<HHI', d[pos + 8:pos + 16])
            bits = struct.unpack('<H', d[pos + 22:pos + 24])[0]
            fmt = (tag, ch, sr, bits)
        elif cid == b'data':
            daten = d[pos + 8:pos + 8 + size]
        pos += 8 + size + (size & 1)
    tag, ch, sr, bits = fmt
    if bits == 16:
        x = np.frombuffer(daten[:len(daten) // 2 * 2], '<i2').astype(np.float32) / 32768
    elif bits == 24:
        b = np.frombuffer(daten[:len(daten) // 3 * 3], np.uint8).reshape(-1, 3).astype(np.int32)
        v = b[:, 0] | (b[:, 1] << 8) | (b[:, 2] << 16)
        x = (np.where(v >= 1 << 23, v - (1 << 24), v)).astype(np.float32) / 8388608
    else:
        raise ValueError(f'{p}: {bits} bit')
    x = x[:len(x) // ch * ch].reshape(-1, ch)
    if ch == 1:
        x = np.repeat(x, 2, axis=1)
    if sr != SR:
        f = Fraction(SR, sr)
        x = sg.resample_poly(x, f.numerator, f.denominator, axis=0).astype(np.float32)
    return x - x.mean(0, keepdims=True)


PAUKE = {'1': 41.45, '2': 46.75, '3': 49.46, '4': 52.4, '5': 54.58}
NOTEN = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
DYN = {'ppp': 1, 'pp': 2, 'p': 3, 'mp': 4, 'mf': 5, 'f': 6, 'ff': 7, 'fff': 8}


def _name_note(f):
    import re
    m = re.search(r'(?<![A-Za-z])([A-Ga-g])(#?)(-?\d)(?=_)', f)
    return None if not m else 12 * (int(m.group(3)) + 1) + NOTEN[m.group(1).upper()] + (1 if m.group(2) else 0)


def _name_dyn(f):
    import re
    m = re.search(r'_(?:v|vl)(\d+)', f)
    if m:
        return int(m.group(1))
    for t in reversed(re.split(r'[_\-. ]', f.lower())):
        t2 = t.rstrip('0123456789')
        if t2 in DYN:
            return DYN[t2]
    return 1


def _grundton(m, sr=SR, nn=None, fenster=(0.12, 0.7)):
    """Tonhöhe in MIDI (Bruchteil): Oktave aus dem Dateinamen (VSCO/VCSL zählen eine Oktave tiefer), Feinstimmung aus
    den ersten Teiltönen im Fenster nach dem Einsatz."""
    a, b = int(fenster[0] * sr), int(fenster[1] * sr)
    w = m[a:b] if len(m) > a + 4096 else m[:8192]
    n = len(w)
    N = 1 << int(np.ceil(np.log2(n * 4)))
    S = np.abs(np.fft.rfft(w * np.hanning(n), N)) ** 0.5
    fr = np.fft.rfftfreq(N, 1 / sr)
    f = mton(nn)
    est = []
    for h in range(1, 5):
        lo, hi = np.searchsorted(fr, h * f * 0.97), np.searchsorted(fr, h * f * 1.03)
        if hi - lo < 3:
            continue
        i = lo + int(np.argmax(S[lo:hi]))
        if 0 < i < len(S) - 1:
            y0, y1, y2 = np.log(S[i - 1] + 1e-9), np.log(S[i] + 1e-9), np.log(S[i + 1] + 1e-9)
            d = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2 + 1e-12)
            est.append(((fr[i] + d * (fr[1] - fr[0])) / h, S[i]))
    if not est:
        return float(nn)
    fe = sum(e * g for e, g in est) / sum(g for e, g in est)
    c = float(np.clip(1200 * np.log2(fe / f), -60, 60))
    return nn + c / 100


class Instrument:
    """Ein Instrument aus Samples: Zonen (Tonhöhe, Stärke, Wechselschlag), Auswahl, Tonhöhenverschiebung (Umrechnen
    der Abtastrate), Länge und Ausklang. Stereo bleibt erhalten (natürliche Sitzordnung der Aufnahme)."""

    def __init__(self, name, dateien, tonhoehe=True, okt=1, fenster=(0.12, 0.7), vor=0.0, max_dauer=6.0, ausgleich=True,
                 schwelle_db=-34.0, rng=None, tonmap=None):
        self.name = name
        self.tonhoehe = tonhoehe or tonmap is not None
        self.vor = vor
        self.rng = rng or np.random.default_rng(len(name))
        self.zonen = []
        self.cache = {}
        self.zaehler = {}
        for p in sorted(dateien):
            x = lies_wav(p)
            env = np.abs(x).max(1)
            pk = env.max() + 1e-9
            on = int(np.argmax(env > pk * 10 ** (schwelle_db / 20)))
            on = max(0, on - int(0.002 * SR))
            x = x[on:on + int(max_dauer * SR)]
            fo = min(len(x) // 4, int(0.04 * SR))
            x[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 2
            fn = os.path.basename(p)
            midi = None
            if tonmap is not None:
                midi = tonmap(fn)
            elif tonhoehe:
                nn = _name_note(fn)
                if nn is None:
                    continue
                midi = _grundton(x.mean(1), nn=nn + 12 * okt, fenster=fenster)
            # Pegel: lautestes 50-ms-Stück in der ersten Sekunde (gleich für kurze und langsam einsetzende Töne)
            k = int(0.05 * SR)
            q = (x[:int(1.0 * SR)].astype(np.float64) ** 2).mean(1)
            q = q[:len(q) // k * k].reshape(-1, k).mean(1) if len(q) >= k else np.array([q.mean()])
            pegel = 10 * np.log10(q.max() + 1e-12)
            self.zonen.append(dict(x=x, midi=midi, dyn=_name_dyn(fn), pegel=pegel, datei=fn))
        if not self.zonen:
            raise SystemExit(f'{name}: keine Samples gefunden')
        stufen = sorted({z['dyn'] for z in self.zonen})
        self.stufen = stufen
        for s in stufen:
            zs = [z for z in self.zonen if z['dyn'] == s]
            med = float(np.median([z['pegel'] for z in zs]))
            for z in zs:
                z['stufe'] = stufen.index(s)
                z['g'] = 10 ** (np.clip(med - z['pegel'], -6, 6) / 20) if ausgleich else 1.0
        # Gesamtpegel: lauteste Stufe ≈ −12 dBFS Effektivwert im Einsatz
        top = [z for z in self.zonen if z['stufe'] == len(stufen) - 1]
        ref = float(np.median([z['pegel'] for z in top]))
        self.norm = 10 ** ((-12 - ref) / 20)

    def waehle(self, midi, vel):
        L = len(self.stufen)
        st = int(np.clip(round(vel * L - 0.5), 0, L - 1))
        zs = [z for z in self.zonen if z['stufe'] == st] or self.zonen
        if self.tonhoehe:
            d = np.array([abs(z['midi'] - midi) for z in zs])
            best = d.min()
            zs = [z for z, dd in zip(zs, d) if dd <= best + 0.6]
        key = (st, round(midi, 1) if self.tonhoehe else 0)
        i = self.zaehler.get(key, int(self.rng.integers(len(zs))))
        self.zaehler[key] = i + 1
        return zs[i % len(zs)], st

    def _verschoben(self, z, semi):
        key = (id(z), round(semi * 100))
        y = self.cache.get(key)
        if y is None:
            if abs(semi) < 0.005:
                y = z['x']
            else:
                f = Fraction(2 ** (semi / 12)).limit_denominator(400)
                y = sg.resample_poly(z['x'], f.denominator, f.numerator, axis=0).astype(np.float32)
            self.cache[key] = y
        return y

    def ton(self, midi=60, vel=0.8, dauer=None, rel=0.15, versatz=0.0, cent=0.0, ein=0.0):
        """Ein Ton (Stereo): midi (Bruchteil erlaubt), vel 0–1 (Stufe + feine Lautstärke), dauer (s, None = ganz),
        rel (Ausklang nach dauer), versatz (s vom Sample-Anfang weglassen, für gebundene Töne), ein (Einblenden, s)."""
        z, st = self.waehle(midi, vel)
        semi = (midi - z['midi'] + cent / 100) if self.tonhoehe else cent / 100
        y = self._verschoben(z, semi)
        y = y[int(versatz * SR):]
        if dauer is not None:
            n1 = int(dauer * SR)
            nr = int(rel * SR)
            y = y[:n1 + nr].copy()
            if len(y) > n1 and nr > 0:
                k = len(y) - n1
                y[n1:] *= np.cos(np.linspace(0, np.pi / 2, k))[:, None] ** 2
        else:
            y = y.copy()
        if ein > 0:
            k = min(len(y), int(ein * SR))
            y[:k] *= np.sin(np.linspace(0, np.pi / 2, k))[:, None] ** 2
        L = len(self.stufen)
        fein = np.clip(vel * L - st, 0, 1)
        return y * (z['g'] * self.norm * (0.72 + 0.28 * fein))


def stereo_lage(y, pan=0.0, breite=1.0):
    """Stereo-Signal verschieben (pan −1…1) und Breite ändern (0 = mono, 1 = wie aufgenommen); Mono → Stereo."""
    if y.ndim == 1:
        y = np.stack([y, y], 1)
    m = (y[:, 0] + y[:, 1]) * 0.5
    s = (y[:, 0] - y[:, 1]) * 0.5 * breite
    a = (pan + 1) * np.pi / 4
    return np.stack([(m + s) * np.cos(a), (m - s) * np.sin(a)], 1) * np.sqrt(2)


class Bibliothek:
    """Lädt Instrumente bei Bedarf (gleiche Instrumente teilen sich die Variante)."""

    def __init__(self, wurzel):
        self.w = wurzel
        self.inst = {}

    def pfad(self, *teile):
        return os.path.join(self.w, *teile)

    def dateien(self, ordner, muster=None, ohne=None):
        import fnmatch
        d = self.pfad(*ordner.split('/'))
        fs = [os.path.join(d, f) for f in sorted(os.listdir(d)) if f.lower().endswith('.wav')]
        if muster:
            fs = [f for f in fs if any(fnmatch.fnmatch(os.path.basename(f), m) for m in muster)]
        if ohne:
            fs = [f for f in fs if not any(fnmatch.fnmatch(os.path.basename(f), m) for m in ohne)]
        return fs

    def __getitem__(self, name):
        if name not in self.inst:
            self.inst[name] = self._lade(name)
        return self.inst[name]

    def _lade(self, n):
        V, C = 'vsco/', 'vcsl/'
        D = self.dateien
        rng = np.random.default_rng(abs(hash(n)) % 2 ** 32)
        defs = {
            # Streicher
            'celli_spic': lambda: Instrument(n, D(V + 'Strings/Cello Section/spic'), fenster=(0.03, 0.25), vor=0.012, max_dauer=1.6),
            'violen_spic': lambda: Instrument(n, D(V + 'Strings/Viola Section/spic'), fenster=(0.03, 0.25), vor=0.012, max_dauer=1.6),
            'geigen_spic': lambda: Instrument(n, D(V + 'Strings/Violin Section/Spic'), fenster=(0.03, 0.25), vor=0.012, max_dauer=1.6),
            'kb_spic': lambda: Instrument(n, D(V + 'Strings/Solo Contrabass/Spic'), fenster=(0.03, 0.3), vor=0.012, max_dauer=1.6),
            'kb_pizz': lambda: Instrument(n, D(V + 'Strings/Solo Contrabass/Pizz'), fenster=(0.05, 0.4), vor=0.006, max_dauer=2.5),
            'celli_lang': lambda: Instrument(n, D(V + 'Strings/Cello Section/susvib'), vor=0.05, max_dauer=9),
            'violen_lang': lambda: Instrument(n, D(V + 'Strings/Viola Section/susvib'), vor=0.05, max_dauer=9),
            'geigen_lang': lambda: Instrument(n, D(V + 'Strings/Violin Section/susVib'), vor=0.05, max_dauer=9),
            # Blech, Holz
            'horn_lang': lambda: Instrument(n, D(V + 'Brass/F Horn/sus'), vor=0.03, max_dauer=8),
            'horn_stoss': lambda: Instrument(n, D(V + 'Brass/F Horn/stac'), fenster=(0.03, 0.25), vor=0.01, max_dauer=1.5),
            'trompete_stoss': lambda: Instrument(n, D(V + 'Brass/Trumpet/stac'), fenster=(0.03, 0.25), vor=0.008, max_dauer=1.5),
            'posaune_stoss': lambda: Instrument(n, D(V + 'Brass/Tenor Trombone/stac'), fenster=(0.03, 0.25), vor=0.01, max_dauer=1.5),
            'posaune_lang': lambda: Instrument(n, D(V + 'Brass/Tenor Trombone/sus'), vor=0.03, max_dauer=8),
            'tuba_stoss': lambda: Instrument(n, D(V + 'Brass/Tuba/stac'), fenster=(0.03, 0.3), vor=0.012, max_dauer=1.8),
            'floete': lambda: Instrument(n, D(V + 'Woodwinds/Flute/susNV'), vor=0.03, max_dauer=8),
            # Zupfinstrumente
            'koto': lambda: Instrument(n, D(C + 'Chordophones/Zithers/Dan Tranh/Normal'), fenster=(0.25, 1.0), vor=0.003, max_dauer=4),
            'zupf': lambda: Instrument(n, D(C + 'Chordophones/Composite Chordophones/Strumstick/Finger'), fenster=(0.15, 0.8), vor=0.003,
                                       max_dauer=2.5),
            # Schlagwerk (ohne Tonhöhe)
            'grosse_tr': lambda: Instrument(n, D(V + 'Percussion', ['BDrumNewhit*']), False, vor=0.004, max_dauer=3),
            'pauke': lambda: Instrument(n, D(V + 'Percussion/Timpani', ['Timpani*Hit*']), False, vor=0.004, max_dauer=3.5,
                                        tonmap=lambda f: PAUKE[f[7]]),
            'pauke_wirbel': lambda: Instrument(n, D(V + 'Percussion/Timpani/Rolls'), False, vor=0.004, max_dauer=8, ausgleich=False,
                                               tonmap=lambda f: PAUKE[f[7]]),
            'tenor_tief': lambda: Instrument(n, D(C + 'Membranophones/Struck Membranophones/Legacy Toms/tenor_lower'), False, vor=0.002,
                                             max_dauer=1.5),
            'tenor_hoch': lambda: Instrument(n, D(C + 'Membranophones/Struck Membranophones/Legacy Toms/tenor_higher'), False, vor=0.002,
                                             max_dauer=1.2),
            'tom_h': lambda: Instrument(n, D(C + 'Membranophones/Struck Membranophones/Tom 1/Stick', ['*HitS*']), False, vor=0.002, max_dauer=1.5),
            'tom_t': lambda: Instrument(n, D(C + 'Membranophones/Struck Membranophones/Tom 2/Stick', ['*HitS*']), False, vor=0.002, max_dauer=1.5),
            'tom_hm': lambda: Instrument(n, D(C + 'Membranophones/Struck Membranophones/Tom 1/Mallet', ['*HitM*']), False, vor=0.002,
                                         max_dauer=1.5),
            'tom_tm': lambda: Instrument(n, D(C + 'Membranophones/Struck Membranophones/Tom 2/Mallet', ['*HitM*']), False, vor=0.002,
                                         max_dauer=1.8),
            'rahmen_l': lambda: Instrument(n, D(C + 'Membranophones/Struck Membranophones/Frame Drum', ['HDrumL_Hit_*']), False, vor=0.002,
                                           max_dauer=1.5),
            'rahmen_s': lambda: Instrument(n, D(C + 'Membranophones/Struck Membranophones/Frame Drum', ['HDrumS_Hit_*', 'HDrumS_HitMuted*']),
                                           False, vor=0.002, max_dauer=1.0),
            'snare': lambda: Instrument(n, D(C + 'Membranophones/Struck Membranophones/Snare Drum, Modern 1', ['*HitSN*']), False,
                                        vor=0.002, max_dauer=1.2),
            'snare_ohne': lambda: Instrument(n, D(C + 'Membranophones/Struck Membranophones/Snare Drum, Modern 1', ['*HitNS*']), False,
                                             vor=0.002, max_dauer=0.8),
            'snare_wirbel': lambda: Instrument(n, D(C + 'Membranophones/Struck Membranophones/Snare Drum, Modern 1', ['*rollSN*']), False,
                                               vor=0.002, max_dauer=8),
            'klatsch': lambda: Instrument(n, D(C + 'Idiophones/Struck Idiophones/Claps'), False, vor=0.001, max_dauer=0.6, schwelle_db=-30),
            'hh_zu': lambda: Instrument(n, D(C + 'Idiophones/Struck Idiophones/Hi-Hat Cymbal', ['HiHat_HitC_*']), False,
                                        vor=0.001, max_dauer=0.4),
            'hh_auf': lambda: Instrument(n, D(C + 'Idiophones/Struck Idiophones/Hi-Hat Cymbal', ['HiHat_HitO_*', 'HiHat_HitLoose*']), False,
                                         vor=0.001, max_dauer=1.2),
            'schuettel': lambda: Instrument(n, D(C + 'Idiophones/Struck Idiophones/Shaker, Small', ['Mid_ShakerDouble*', 'Mid_ShakerHigh*']),
                                            False, vor=0.004, max_dauer=0.4),
            'becken': lambda: Instrument(n, D(V + 'Percussion', ['cymbal-crash1_*']), False, vor=0.002, max_dauer=6),
            'becken_an': lambda: Instrument(n, D(V + 'Percussion', ['susCymb1-cresc*']), False, max_dauer=8, schwelle_db=-60),
            'gong': lambda: Instrument(n, D(V + 'Percussion', ['gongHit*']), False, vor=0.004, max_dauer=8),
            'amboss': lambda: Instrument(n, D(V + 'Percussion', ['Anvil*']), False, vor=0.001, max_dauer=2),
            'tamb': lambda: Instrument(n, D(V + 'Percussion', ['Tamb1-Hit*']), False, vor=0.002, max_dauer=1),
            'holz': lambda: Instrument(n, D(C + 'Idiophones/Struck Idiophones/Woodblock', ['wood_click_*']), False, vor=0.001, max_dauer=0.5),
        }
        print('  lade', n, flush=True)
        inst = defs[n]()
        inst.rng = rng
        return inst


# === Gerechnete Ergänzungen ============================================================================================
def ks_saite(f, dauer, T60=1.5, hell=0.5, daempf=0.0, rng=None, rel=0.03):
    """Gezupfte Saite (Karplus-Strong mit Bruchteil-Verzögerung): hell = Anschlag (0 weich … 1 hart, Plektrum),
    daempf = Handballen (0 offen … 1 stark gedämpft: kurzer, dumpfer Ton). Bricht nach dauer in rel ab."""
    rng = rng or np.random.default_rng()
    D = SR / f
    Di = int(np.floor(D - 0.5))
    mu = D - 0.5 - Di
    T = T60 * (1 - 0.85 * daempf)
    g = 10 ** (-3 / (f * T))
    # Verlustfilter: Mittelwert aus drei Abtastwerten (gedämpft) bzw. zwei (offen)
    w = 0.5 * daempf
    a = np.zeros(Di + 4)
    a[0] = 1
    taps = [(Di, (1 - w) * 0.5 * (1 - mu)), (Di + 1, (1 - w) * 0.5 + w / 3), (Di + 2, (1 - w) * 0.5 * mu + w / 3), (Di + 3, w / 3)]
    for i, c in taps:
        a[i] -= g * c
    n = int((dauer + rel) * SR)
    x = np.zeros(n)
    burst = rng.standard_normal(Di + 2)
    h = np.clip(hell * (1 - 0.6 * daempf), 0.05, 1)
    burst = sg.lfilter([h], [1, -(1 - h)], burst)
    k = max(1, int(0.18 * Di))  # Anschlagpunkt (Kammfilter)
    burst[k:] -= 0.85 * burst[:-k]
    x[:len(burst)] = burst
    y = sg.lfilter([1.0], a, x)
    y -= sg.lfilter([0.002], [1, -0.998], y)  # Gleichanteil
    t = np.arange(n) / SR
    e = np.ones(n)
    n1 = int(dauer * SR)
    if n1 < n:
        e[n1:] = np.cos(np.linspace(0, np.pi / 2, n - n1)) ** 2
    y *= e * np.minimum(1, t / 0.0005)
    return y / (np.abs(y).max() + 1e-9)


def powerchord(grund, dauer, vel, daempf, rng, quinte=True, oktave=True, versatz=0.004):
    """Quint-Griff auf der Gitarre (Grundton, Quinte, Oktave), leicht nacheinander angeschlagen."""
    toene = [grund] + ([grund + 7] if quinte else []) + ([grund + 12] if oktave else [])
    n = int((dauer + 0.05) * SR) + int(versatz * 3 * SR)
    y = np.zeros(n)
    for i, m in enumerate(toene):
        o = int(i * versatz * SR * rng.uniform(0.7, 1.3))
        s = ks_saite(mton(m) * 2 ** (rng.normal(0, 3) / 1200), dauer - o / SR, T60=2.5, hell=0.75 + 0.2 * vel, daempf=daempf, rng=rng,
                     rel=0.04)
        y[o:o + len(s)] += s * (1.0 if i == 0 else 0.85)
    return y * vel


def verstaerker(x, gain=18.0, sym=0.12):
    """Verzerrer + Box (für die Gitarren-Spuren, Stereo-Bus): Bässe vorher straffen, Mitten anheben, asymmetrisch
    sättigen, danach Lautsprecherbox (Bassbuckel, Mittenkerbe, Präsenz, steiler Abfall über 5 kHz)."""
    pre = kette(_sos('hp', 70, 2), eq_spitze(700, 3, 0.7), _sos('lp', 7000, 2))
    y = kreis(x, pre) * gain
    y = np.tanh(y + sym) - np.tanh(sym)
    y = 0.7 * y + 0.3 * np.tanh(2.5 * y)
    box = kette(_sos('hp', 65, 2), eq_kuhle(220, 5), eq_spitze(120, 3, 1.0), eq_spitze(500, -3, 1.2), eq_spitze(2300, 2, 1.0), _sos('lp', 5200, 4),
                eq_spitze(3800, 2, 2.0))
    return kreis(y, box)


def synbass(midi, dauer, vel=1.0, hell=0.7, rng=None, rel=0.04):
    """Synthesizer-Bass: zwei Sägezähne (leicht verstimmt) mit „Filter“-Hüllkurve (Überblendung hell → dunkel),
    Unterton als Rechteck/Sinus, angezerrt."""
    rng = rng or np.random.default_rng()
    f = mton(midi)
    n = int((dauer + rel) * SR)
    t = np.arange(n) / SR
    e = MU.huell(dauer, 0.003, 0.2, 0.8, rel)[:n]
    if len(e) < n:
        e = np.pad(e, (0, n - len(e)))
    b = np.clip(hell * (0.2 + 0.8 * np.exp(-t / 0.07)) * (0.6 + 0.4 * vel), 0, 1)
    y = np.zeros(n)
    for c in (-6, 6):
        ph = rng.random()
        fv = f * 2 ** (c / 1200)
        y += osz(fv, n, 'saege', 2.6, ph) * (1 - b) + 0.85 * osz(fv, n, 'saege', 1.0, ph) * b
    y = 0.55 * y + 0.3 * MU.sinus(f, n) + 0.22 * osz(f, n, 'recht', 2.0)
    y *= e
    return np.tanh(1.6 * y) / np.tanh(1.6) * vel


def synlinie(noten, beat, vel=1.0, glide=0.04, vib=14.0, stimmen=3, cent=9.0, hell=0.8, rng=None):
    """Synthesizer-Melodie (gebunden, mit Gleiten und verzögertem Vibrato), mehrere verstimmte Sägezähne."""
    rng = rng or np.random.default_rng()
    noten = sorted(noten)
    ende = max(s + d for s, d, m in noten) * beat + 0.3
    n = int(ende * SR)
    f = np.zeros(n)
    amp = np.zeros(n)
    vibe = np.zeros(n)
    prev_f, prev_end = None, -99
    for k, (s, d, m) in enumerate(noten):
        i0 = int(s * beat * SR)
        i1 = min(n, int((s + d) * beat * SR))
        ft = mton(m)
        tt = np.arange(i1 - i0) / SR
        legato = prev_f is not None and i0 - prev_end < 0.02 * SR
        f[i0:i1] = ft * (prev_f / ft) ** np.exp(-tt / glide) if legato else ft
        weiter = k + 1 < len(noten) and noten[k + 1][0] * beat * SR - i1 < 0.02 * SR
        dd = (i1 - i0) / SR
        r = min(0.05, dd * 0.3)
        e = np.minimum(1, tt / (0.004 if not legato else 0.001))
        if not weiter:
            e *= np.clip((dd - tt) / r, 0, 1)
        e *= 0.85 + 0.15 * np.exp(-tt / 0.15)
        amp[i0:i1] = np.maximum(amp[i0:i1], e)
        vibe[i0:i1] = np.clip((tt - 0.25) / 0.3, 0, 1)
        prev_f, prev_end = ft, i1
    idx = np.maximum.accumulate(np.where(f > 0, np.arange(n), 0))
    f = f[idx]
    f[f == 0] = mton(noten[0][2])
    t = np.arange(n) / SR
    fv = f * 2 ** (vib * vibe * np.sin(TAU * 5.6 * t) / 1200)
    y = np.zeros((n, 2))
    for i in range(stimmen):
        c = ((i - (stimmen - 1) / 2) / max(1, (stimmen - 1) / 2)) * cent
        s = osz(fv * 2 ** (c / 1200), n, 'saege', 1.0 + 0.6 * (1 - hell), rng.random(), oben=11000)
        pan = (i - (stimmen - 1) / 2) / max(1, (stimmen - 1) / 2) * 0.6
        y += stereo_lage(s, pan)
    amp = sg.lfilter([0.05], [1, -0.95], amp)
    return y * amp[:, None] * vel / stimmen ** 0.5


def zupfsynth(midi, vel=1.0, dauer=0.2, rng=None):
    """Synthesizer-Zupfton fürs Arpeggio: Sägezahn + Rechteck, schnell dunkler werdend, kurz."""
    rng = rng or np.random.default_rng()
    f = mton(midi)
    n = int((dauer + 0.25) * SR)
    t = np.arange(n) / SR
    b = np.exp(-t / 0.05)
    ph = rng.random()
    y = (osz(f, n, 'saege', 2.4, ph) * (1 - b) + osz(f, n, 'saege', 1.0, ph) * b) + 0.4 * osz(f * 1.003, n, 'recht', 1.6, ph)
    y *= np.exp(-t / 0.16) * np.minimum(1, t / 0.002)
    return y * vel


def tonhoehen_kurve(y, cents):
    """Sample mit wechselnder Tonhöhe lesen (cents je Ausgabe-Sample, z. B. Vibrato, Anblasen von unten)."""
    r = 2 ** (np.asarray(cents) / 1200)
    pos = np.concatenate([[0], np.cumsum(r)[:-1]])
    pos = pos[pos < len(y) - 1]
    out = np.stack([np.interp(pos, np.arange(len(y)), y[:, c]) for c in range(y.shape[1])], 1)
    return out.astype(np.float32)


# === Mischpult =========================================================================================================
def ducken(x, steuer, tiefe_db=4.0, an=0.004, ab=0.18):
    """Pumpen: x wird leiser, wenn das Steuersignal (z. B. Bassdrum) laut ist (als Schleife)."""
    e = np.abs(steuer).max(1) if steuer.ndim == 2 else np.abs(steuer)
    blk = 64
    nb = len(e) // blk
    p = e[:nb * blk].reshape(nb, blk).max(1)
    p = p / (p.max() + 1e-9)
    ka, kr = np.exp(-blk / (an * SR)), np.exp(-blk / (ab * SR))
    v = 0.0
    g = np.zeros(nb)
    for _ in range(2):
        for i in range(nb):
            z = p[i]
            v = z + (v - z) * (ka if z > v else kr)
            g[i] = v
    gs = np.interp(np.arange(len(x)), (np.arange(nb) + 0.5) * blk, 10 ** (-tiefe_db * g / 20), period=len(x))
    return x * gs[:, None]


def echo(x, links, rechts, rueck=0.35, anteil=0.3, tp_f=4500):
    """Pingpong-Echo als Schleife (Zeiten in s), Wiederholungen dunkler werdend."""
    L = len(x)
    y = np.zeros_like(x, dtype=np.float64)
    m = x.mean(1)
    dl, dr = int(links * SR), int(rechts * SR)
    s = tp(m, tp_f)
    g = 1.0
    for k in range(6):
        y[:, 0] += np.roll(s, dl + k * (dl + dr)) * g
        y[:, 1] += np.roll(s, dl + dr + k * (dl + dr)) * g * 0.9
        g *= rueck
    return x + anteil * y


BUS_HOOK = None   # zum Abstimmen: Funktion, die die bearbeiteten Spuren sieht


def mischen(M, specs, raeume, master):
    """Spuren bearbeiten (fx → Klangregelung → Bus-Verdichter → Breite), auf Ziel-Lautheit bringen (solange sie
    spielen), Pumpen, Hallanteile; Hall je Raum als Schleife gefaltet; Summe: Klangregelung, Verdichter, weiche
    Sättigung. Ergebnis Spitze 0,9 (die Endlautheit setzt baue_musik)."""
    L = M.n
    bearbeitet = {}
    pegel = {}
    for name, sp in specs.items():
        if name not in M.bus:
            continue
        x = M.bus[name].astype(np.float64)
        if sp.get('fx'):
            x = sp['fx'](x)
        if sp.get('eq') is not None:
            x = kreis(x, sp['eq'])
        if sp.get('vokal'):
            x = MU.vokal(x, sp['vokal'])
        if sp.get('verd'):
            thr, ratio = sp['verd'][:2]
            lv = lufs(x)
            x = verdichter(x, lv + thr, ratio, *(sp['verd'][2:] or (0.005, 0.12)))
        if sp.get('breite') is not None:
            m = x.mean(1, keepdims=True)
            x = m + (x - m) * sp['breite']
        if sp.get('lage') is not None:   # mono → Lage (nach dem Verzerrer, sonst gleicht der die Seiten an)
            x = stereo_lage(x.mean(1), sp['lage'])
        if 'ziel' in sp:
            x *= 10 ** ((sp['ziel'] - lufs(x)) / 20)
        bearbeitet[name] = x
    for name, sp in specs.items():
        if name in bearbeitet and sp.get('duck'):
            quelle, tiefe = sp['duck'][:2]
            if quelle in M.bus:
                bearbeitet[name] = ducken(bearbeitet[name], M.bus[quelle], tiefe, *(sp['duck'][2:] or ()))
    if BUS_HOOK:
        BUS_HOOK(bearbeitet)
    trocken = np.zeros((L, 2))
    hallsum = {k: np.zeros((L, 2)) for k in raeume}
    for name, x in bearbeitet.items():
        sp = specs[name]
        pegel[name] = round(lufs(x), 1)
        trocken += x
        for raum, menge in sp.get('hall', {}).items():
            hallsum[raum] += x * menge
    misch = trocken
    for raum, ir in raeume.items():
        if np.abs(hallsum[raum]).max() > 0:
            h = kreis_falt(hallsum[raum], ir)
            misch = misch + kreis(h, master.get('hall_eq', _sos('hp', 180, 2)))
    misch = kreis(misch, master['eq'] if master.get('eq') is not None else _sos('hp', 28, 2))
    misch *= 10 ** ((-16 - lufs(misch)) / 20)
    misch = verdichter(misch, master.get('schwelle', -14), master.get('ratio', 2.0), 0.015, 0.25)
    if master.get('schwelle2'):
        misch = verdichter(misch, master['schwelle2'], master.get('ratio2', 3.0), 0.003, 0.08)
    misch /= np.abs(misch).max() + 1e-9
    misch = sanft(misch * master.get('treiben', 1.2), 0.8)
    misch = misch / (np.abs(misch).max() + 1e-9) * 0.9
    return misch.astype(np.float32), pegel


# === Werkzeug für die Sätze ============================================================================================
class Satz:
    """Ein Stück: Tempo, Takte, Mischpult (Schleife), Samples, gerechnete Instrumente, Menschliches (Zeit, Stärke)."""

    def __init__(self, B, bpm, takte, seed):
        self.B = B
        self.bpm = bpm
        self.beat = 60 / bpm
        self.takt = 4 * self.beat
        self.s16 = self.beat / 4
        self.N = takte
        self.M = Mischer(int(round(takte * self.takt * SR)))
        self.rng = np.random.default_rng(seed)
        self.K = MU.Klang(seed)

    def T(self, b, st=0.0):
        return (b * 16 + st) * self.s16

    def j(self, ms):
        return float(self.rng.uniform(-ms, ms)) / 1000

    def r(self, a=0.0, b=1.0):
        return float(self.rng.uniform(a, b))

    def spiel(self, bus, inst, t, midi=60, vel=0.8, dauer=None, pan=0.0, breite=1.0, rel=0.15, jit=4.0, vj=0.06, cent=0.0, g=1.0,
              versatz=0.0, ein=0.0, kresc=None):
        I = self.B[inst]
        v = float(np.clip(vel * (1 + self.rng.uniform(-vj, vj)), 0.01, 1.0))
        c = cent + (self.rng.normal(0, 2.5) if I.tonhoehe else 0.0)
        y = I.ton(midi, v, dauer, rel, versatz=versatz, cent=c, ein=ein)
        if kresc is not None:
            n1 = int((dauer or len(y) / SR) * SR)
            e = np.ones(len(y))
            e[:n1] = kresc + (1 - kresc) * np.linspace(0, 1, min(n1, len(y))) ** 2
            y = y * e[:, None]
        self.M(bus, t - (0 if versatz else I.vor) + self.j(jit), stereo_lage(y, pan, breite) * g)

    def anschwellen(self, bus, t_ziel, dauer, vel=0.9, pan=0.0):
        """Beckenwirbel (Aufnahme) so legen, dass sein Höhepunkt auf t_ziel fällt; danach kurz abgedämpft."""
        I = self.B['becken_an']
        z = min(I.zonen, key=lambda z: abs(int(np.argmax(np.abs(z['x']).max(1))) / SR - dauer))
        x = z['x']
        pk = int(np.argmax(sg.convolve(np.abs(x).max(1), np.ones(441) / 441, 'same')))
        y = x[:pk + int(0.12 * SR)].copy()
        k = int(0.12 * SR)
        y[-k:] *= np.linspace(1, 0, k)[:, None] ** 2
        self.M(bus, t_ziel - pk / SR, stereo_lage(y * z['g'] * I.norm * vel, pan, 1.0))

    def linie(self, bus, inst, noten, t0, vel=0.8, pan=0.0, breite=1.0, rel=0.35, binde=0.09, ueber=0.06, transp=0, g=1.0, jit=6.0,
              ):
        """Gebundene Melodie aus langen Samples: gebundene Töne überblenden (Einsatz des Samples weggelassen)."""
        b = self.beat
        for k, (s, d, m) in enumerate(noten):
            vor_geb = k > 0 and abs(noten[k - 1][0] + noten[k - 1][1] - s) < 1e-6
            nach_geb = k + 1 < len(noten) and abs(s + d - noten[k + 1][0]) < 1e-6
            v = vel * (1.0 + 0.06 * min(d, 3) / 3)
            dauer = d * b
            if vor_geb:
                self.spiel(bus, inst, t0 + s * b, m + transp, v, dauer, pan, breite, ueber if nach_geb else rel, jit=jit / 2, vj=0.03,
                           g=g, versatz=binde, ein=ueber)
            else:
                self.spiel(bus, inst, t0 + s * b, m + transp, v, dauer, pan, breite, ueber if nach_geb else rel, jit=jit, vj=0.03, g=g)

    def rueckwaerts(self, bus, t_ziel, dauer, vel=0.8, pan=0.0):
        """echtes Becken rückwärts, endet auf t_ziel"""
        I = self.B['becken']
        z = I.zonen[int(self.rng.integers(len(I.zonen)))]
        y = z['x'][:int(dauer * SR)][::-1].copy()
        y *= np.linspace(0, 1, len(y))[:, None] ** 1.5
        k = int(0.004 * SR)
        y[-k:] *= np.linspace(1, 0, k)[:, None]
        self.M(bus, t_ziel - len(y) / SR, stereo_lage(y * z['g'] * I.norm * vel, pan, 1.0))

    def menge(self, bus, t, n=18, vel=0.8):
        """Klatschen vieler Leute: n Aufnahmen mit eigener Zeit, Tonhöhe, Lage und Stärke"""
        for _ in range(n):
            self.spiel(bus, 'klatsch', t + float(self.rng.normal(0.004, 0.011)), vel=vel * self.r(0.5, 1.0), pan=self.r(-0.95, 0.95),
                       breite=0.3, jit=0, vj=0, cent=float(np.round(self.rng.normal(0, 120) / 25) * 25), g=0.35)

    def chor(self, bus, t, pcs, lo, hi, n, dauer, vel=0.6, a=0.35, r=0.8, pan_breite=0.6):
        for k, m in enumerate(MU.voicing(pcs, lo, hi, n)):
            pan = (k / max(1, n - 1) * 2 - 1) * pan_breite
            self.M(bus, t + self.j(10), self.K.chor(m, dauer, vel, stimmen=5, a=a, r=r), pan)


def wurzel_in(pc, lo):
    """kleinste Note mit Tonklasse pc ab lo"""
    return lo + (pc - lo) % 12


def raeume_std(seed, saal=(2.6, 2.3, 1.7, 0.9), saal_s=3.4, vor=0.028):
    return {'saal': hall_ir(np.random.default_rng(seed), saal, saal_s, vor, 0.25),
            'raum': hall_ir(np.random.default_rng(seed + 1), (0.8, 0.7, 0.55, 0.35), 1.2, 0.006, 0.35)}


# === a: „Titanen“ – episch-orchestral, g-Moll, 132 BPM, 64 Takte ======================================================
# Teile (je 8 Takte): A1 Aufmarsch (Ostinato, Trommeln, tiefe Blechstöße) · A2 Hornthema · A3 Steigerung (Trompeten,
# Chor, Wirbel) · A4 Höhepunkt (Thema in Geigen und Hörnern) · A5 Trommel-Zwischenspiel (Gong, tiefe Posaunen, Chor „o“,
# Anstieg) · A6 zweites Thema (Geigen, Hörner, Fanfaren) · A7 Thema in Posaunen und Hörnern · A8 Aufmarsch mit Blech,
# Trommelwirbel in den Anfang.
A_AKK = {'Gm': (7, (7, 10, 2)), 'Eb': (3, (3, 7, 10)), 'Cm': (0, (0, 3, 7)), 'D': (2, (2, 6, 9)), 'F': (5, (5, 9, 0)),
         'Bb': (10, (10, 2, 5)), 'Ab': (8, (8, 0, 3))}
_A_GRUND = ['Gm', 'Gm', 'Eb', 'Eb', 'Cm', 'Cm', 'D', 'D']
A_PLAN = [('A1', _A_GRUND), ('A2', _A_GRUND), ('A3', ['Eb', 'F', 'Gm', 'Gm', 'Eb', 'F', 'D', 'D']), ('A4', _A_GRUND),
          ('A5', ['Cm', 'Cm', 'Gm', 'Gm', 'Ab', 'Ab', 'D', 'D']), ('A6', ['Gm', 'Eb', 'Bb', 'F', 'Cm', 'Eb', 'D', 'D']), ('A7', _A_GRUND),
          ('A8', _A_GRUND)]
A_THEMA = [(0, 1.5, 62), (1.5, 0.5, 67), (2, 1, 70), (3, 1, 69), (4, 1.5, 67), (5.5, 0.5, 70), (6, 2, 74),
           (8, 1.5, 75), (9.5, 0.5, 74), (10, 1, 70), (11, 1, 67), (12, 2, 72), (14, 1, 70), (15, 1, 67),
           (16, 1.5, 72), (17.5, 0.5, 70), (18, 1, 67), (19, 1, 70), (20, 1.5, 72), (21.5, 0.5, 74), (22, 2, 75),
           (24, 1.5, 74), (25.5, 0.5, 72), (26, 1, 69), (27, 1, 66), (28, 3, 69), (31, 1, 66)]
A_THEMA2 = [(0, 1, 70), (1, 1, 74), (2, 2, 79), (4, 1.5, 79), (5.5, 0.5, 77), (6, 2, 75), (8, 1, 74), (9, 1, 77), (10, 2, 82),
            (12, 3, 81), (15, 1, 77), (16, 1, 79), (17, 1, 75), (18, 2, 72), (20, 1, 70), (21, 1, 75), (22, 2, 79),
            (24, 3, 78), (27, 1, 74), (28, 2, 81), (30, 1, 78), (31, 1, 74)]
A_GEGEN = [(0, 8, 62), (8, 8, 67), (16, 8, 67), (24, 8, 66)]   # Hörner/Posaunen unter dem Thema (A4)
A_GEGEN2 = [(0, 8, 58), (8, 8, 58), (16, 8, 60), (24, 8, 57)]
# Ostinato (Sechzehntel, Abstand zum Grundton, Betonung): 3+3+2 | 3+3+2
A_OST = [(0, 1), (0, 0), (0, 0), (7, 1), (0, 0), (0, 0), (12, 1), (0, 0), (0, 1), (0, 0), (0, 0), (7, 1), (0, 0), (0, 0), (None, 1), (7, 0)]
A_BETONT = (0, 3, 6, 8, 11, 14)
A_TIEF = {'Gm': 43, 'Eb': 39, 'Cm': 36, 'D': 38, 'F': 41, 'Bb': 46, 'Ab': 44}   # Grundton der Celli


def variante_a(B):
    S = Satz(B, 132, 64, 4101)
    T, M = S.T, S.M
    for b in range(S.N):
        teil, akk = A_PLAN[b // 8]
        i = b % 8
        name = akk[i]
        pc, pcs = A_AKK[name]
        moll = name.endswith('m')
        groot = A_TIEF[name]
        kb = groot - 12 if groot - 12 >= 28 else groot
        voll = teil in ('A4', 'A6', 'A7')
        auf = (teil in ('A3', 'A5') and i >= 6) or (teil == 'A8' and i >= 6)
        # --- Streicher-Ostinato ---
        if teil != 'A5' or i < 6:
            for st, (iv, ak) in enumerate(A_OST):
                if iv is None:
                    iv = 10 if moll else 12
                if teil == 'A5' and st not in A_BETONT:
                    continue
                v = 0.92 if ak else 0.42
                if st == 0:
                    v = 1.0
                S.spiel('celli', 'celli_spic', T(b, st), groot + iv, v, pan=0.45, breite=0.95, jit=4)
                if teil not in ('A1',) or i >= 4:
                    S.spiel('violen', 'violen_spic', T(b, st), groot + 12 + iv, v * 0.95, pan=0.1, breite=0.95, jit=4)
                if ak and teil != 'A5':
                    S.spiel('kb', 'kb_spic', T(b, st), kb + (0 if iv in (0, 12) else iv % 12), v, pan=0.55, breite=0.75, jit=3)
            if teil in ('A2', 'A3', 'A4', 'A6', 'A7', 'A8') and not (teil == 'A2' and i < 4):
                vr = wurzel_in(pc, 60)
                fig = [7, 3 if moll else 4, 0, 3 if moll else 4] * 2 + [12, 7, 3 if moll else 4, 7] * 2
                for st, iv in enumerate(fig):
                    S.spiel('geigen', 'geigen_spic', T(b, st), vr + iv, 0.85 if st % 4 == 0 else 0.45, pan=-0.55, breite=0.95, jit=4)
        else:
            # Anstieg: Celli und Violen im Tremolo-artigen Sechzehntel-Wirbel auf dem Grundton, crescendo
            for st in range(16):
                v = 0.4 + 0.6 * ((i - 6) * 16 + st) / 32
                S.spiel('celli', 'celli_spic', T(b, st), groot + 12, v, pan=0.45, breite=0.95)
                S.spiel('violen', 'violen_spic', T(b, st), groot + 19, v, pan=0.1, breite=0.95)
        # --- Trommeln ---
        gross = [0, 10] if teil != 'A5' else [0, 6, 10]
        if voll:
            gross = [0, 8, 10]
        for st in gross:
            S.spiel('trommeln', 'grosse_tr', T(b, st), vel=1.0 if st == 0 else 0.8, dauer=0.55, rel=0.35, pan=0.0, breite=1.0, jit=3)
            M('tief', T(b, st), S.K.trommel('odaiko', 0.9 if st == 0 else 0.7), 0)
        mitte = list(A_BETONT)
        if teil == 'A5':
            mitte = [0, 2, 3, 6, 8, 10, 11, 14] if i % 2 == 0 else [0, 3, 6, 8, 9, 10, 11, 12, 13, 14, 15]
        for st in mitte:
            v = 0.95 if st in (0, 8) else 0.75
            S.spiel('trommeln', 'tenor_tief', T(b, st), vel=v, pan=-0.3, breite=1.05, jit=4)
            S.spiel('trommeln', 'tom_tm', T(b, st), vel=v * 0.9, pan=0.3, breite=1.05, jit=4, cent=-400)
        if voll or teil in ('A3', 'A5', 'A8'):
            for st in range(16):
                if st in A_BETONT:
                    continue
                S.spiel('trommeln_h', 'tenor_hoch', T(b, st), vel=0.35 + 0.15 * (st % 2 == 0), pan=0.45, breite=0.75, jit=5)
        if voll:
            for st in (4, 12):
                S.spiel('snare', 'snare', T(b, st), vel=0.75, pan=0.05, breite=1.05, jit=3)
        # Pauke auf der Eins (Grundton, so nah wie möglich an den Kesseln)
        pm = wurzel_in(pc, 43)
        S.spiel('pauke', 'pauke', T(b, 0), pm, 0.95 if i % 2 == 0 else 0.7, pan=-0.15, breite=1.05, jit=2)
        if voll and i % 2 == 1:
            S.spiel('pauke', 'pauke', T(b, 14), pm, 0.75, pan=-0.15, breite=1.05)
        # Fills alle vier Takte
        if i in (3, 7) and not auf:
            for k, st in enumerate((12, 13, 14, 15)):
                S.spiel('trommeln_h', 'tom_hm' if k < 2 else 'tom_tm', T(b, st), vel=0.6 + 0.1 * k, pan=0.4 - 0.25 * k, breite=1.05)
        if auf:
            for st in range(16):
                v = 0.35 + 0.65 * ((i - 6) * 16 + st) / 32
                S.spiel('trommeln_h', 'tenor_hoch', T(b, st), vel=v, pan=0.3, breite=0.75, jit=3)
                if i == 7 and st >= 8:
                    S.spiel('trommeln', 'tenor_tief', T(b, st), vel=v, pan=-0.3, breite=0.75, jit=3)
            if i == 6:
                S.anschwellen('becken', T(b + 2), 2 * S.takt, 0.9)
                S.spiel('snare', 'snare_wirbel', T(b, 0), vel=0.6, dauer=2 * S.takt - 0.05, rel=0.02, pan=0.05, jit=0, kresc=0.15)
                S.spiel('pauke', 'pauke_wirbel', T(b, 0), wurzel_in(pc, 43), 0.9, dauer=2 * S.takt - 0.05, rel=0.02, jit=0, kresc=0.2)
        # Becken, Gong
        if b in (8, 24, 40, 48) or (b == 0):
            S.spiel('becken', 'becken', T(b, 0), vel=0.85 if b in (0, 24, 40) else 0.6, pan=0.35, jit=0)
        if b == 32:
            S.spiel('becken', 'gong', T(b, 0), vel=0.9, pan=-0.2, jit=0)
            M('tief', T(b, 0), S.K.einschlag(0.9, 62, 30, 2.5), 0)
        # --- Blech ---
        tief = MU.voicing(pcs, 43, 60, 3)
        if teil in ('A1', 'A8', 'A2'):
            if i % 2 == 0:
                for m in tief:
                    S.spiel('blech_tief', 'posaune_stoss', T(b, 0), m, 0.9, pan=0.25, breite=1.05)
                S.spiel('blech_tief', 'tuba_stoss', T(b, 0), wurzel_in(pc, 31), 0.9, pan=0.3, breite=0.75)
            else:
                for st in (0, 3, 6):
                    for m in tief[1:]:
                        S.spiel('blech_tief', 'posaune_stoss', T(b, st), m, 0.75 if st else 0.85, pan=0.25, breite=1.05)
        if teil in ('A3', 'A4', 'A6', 'A7', 'A8') and not auf:
            hoch = MU.voicing(pcs, 62, 77, 3)
            stoesse = [(0, 1.0), (3, 0.8), (6, 0.85)] if i % 2 == 0 else [(0, 0.9), (3, 0.75), (6, 0.8), (11, 0.75), (14, 0.85)]
            if teil in ('A4', 'A6'):
                stoesse = [(0, 0.9), (14, 0.75)] if i % 2 == 0 else [(6, 0.7), (14, 0.8)]
            for st, v in stoesse:
                for m in hoch:
                    S.spiel('trompeten', 'trompete_stoss', T(b, st), m, v, pan=-0.2, breite=1.05, jit=5)
                for m in MU.voicing(pcs, 48, 62, 3):
                    S.spiel('blech_tief', 'posaune_stoss', T(b, st), m, v * 0.9, pan=0.25, breite=1.05, jit=5)
                S.spiel('blech_tief', 'horn_stoss', T(b, st), wurzel_in(pc, 55), v * 0.8, pan=-0.05, breite=1.05, jit=5)
        if teil == 'A3' and i % 2 == 0 and not auf:
            for m in MU.voicing(pcs, 53, 69, 4):
                S.spiel('hoerner', 'horn_lang', T(b, 0), m, 0.7, dauer=2 * S.takt - 0.1, rel=0.3, pan=-0.1, breite=1.05)
        if teil == 'A5' and i % 2 == 0 and i < 6:
            for m in MU.voicing(pcs, 40, 58, 4):
                S.spiel('blech_tief', 'posaune_lang', T(b, 0), m, 0.75, dauer=2 * S.takt - 0.1, rel=0.4, pan=0.25, breite=1.05)
        # --- Streicher-Flächen, Chor ---
        if teil in ('A3', 'A4', 'A6', 'A7') and i % 2 == 0 and not auf:
            S.chor('chor', T(b), pcs, 55, 74, 4, 2 * S.takt - 0.2, 0.7)
        if teil == 'A5' and i % 2 == 0 and i < 6:
            S.chor('chor', T(b), pcs, 48, 67, 4, 2 * S.takt - 0.2, 0.7)
        if teil in ('A5',) and i % 2 == 0 and i < 6:
            for m in MU.voicing(pcs, 55, 72, 3):
                S.spiel('flaeche', 'violen_lang', T(b, 0), m, 0.6, dauer=2 * S.takt - 0.1, rel=0.5, pan=0.1, breite=1.0)
        if teil in ('A6', 'A7') and i % 2 == 0:
            for m in MU.voicing(pcs, 55, 67, 2):
                S.spiel('flaeche', 'violen_lang', T(b, 0), m, 0.55, dauer=2 * S.takt - 0.1, rel=0.5, pan=0.1, breite=1.0)
    # --- Melodien ---
    for q, (teil, akk) in enumerate(A_PLAN):
        t0 = T(q * 8)
        if teil == 'A2':
            S.linie('hoerner', 'horn_lang', A_THEMA, t0, 0.85, pan=-0.1, breite=1.05)
        if teil == 'A4':
            S.linie('hoerner', 'horn_lang', A_THEMA, t0, 0.95, pan=-0.1, breite=1.05)
            S.linie('melodie', 'geigen_lang', A_THEMA, t0, 0.9, pan=-0.35, breite=1.0, transp=12)
            S.linie('blech_tief', 'posaune_lang', A_GEGEN, t0, 0.7, pan=0.25, breite=1.05, transp=-12)
            S.linie('blech_tief', 'posaune_lang', A_GEGEN2, t0, 0.7, pan=0.3, breite=1.05, transp=-12)
        if teil == 'A6':
            S.linie('melodie', 'geigen_lang', A_THEMA2, t0, 0.9, pan=-0.35, breite=1.0)
            S.linie('hoerner', 'horn_lang', A_THEMA2, t0, 0.9, pan=-0.1, breite=1.05, transp=-12)
        if teil == 'A7':
            S.linie('blech_tief', 'posaune_lang', A_THEMA, t0, 0.95, pan=0.2, breite=1.05, transp=-12)
            S.linie('hoerner', 'horn_lang', A_THEMA, t0, 0.85, pan=-0.1, breite=1.05)
    return S, 24   # Höhepunkt für die Hörprobe: Takt 24 (A4)


def mix_a():
    raeume = raeume_std(41, saal=(1.9, 2.2, 1.7, 0.9))
    specs = {
        'celli': dict(eq=kette(_sos('hp', 55), eq_spitze(220, -3, 0.9), eq_spitze(3000, 2, 1.0)), ziel=-21, hall={'saal': 0.25, 'raum': 0.15}),
        'violen': dict(eq=kette(_sos('hp', 150), eq_spitze(350, -3, 1.0), eq_spitze(3500, 1.5, 1.0)), ziel=-24, hall={'saal': 0.3, 'raum': 0.15}),
        'geigen': dict(eq=kette(_sos('hp', 250), eq_spitze(4000, 2, 1.0), eq_kuhle(8000, 2, hoch=True)), ziel=-25, hall={'saal': 0.35}),
        'kb': dict(eq=kette(_sos('hp', 36), eq_spitze(80, 1.5, 1.0), eq_spitze(250, -3, 1.0), _sos('lp', 2500)), ziel=-25, hall={'saal': 0.12}),
        'trommeln': dict(eq=kette(_sos('hp', 45), eq_spitze(350, -4, 0.9), eq_spitze(2500, 2.5, 1.0)), ziel=-20, verd=(-6, 2.5, 0.003, 0.1),
                         hall={'saal': 0.25, 'raum': 0.3}),
        'trommeln_h': dict(eq=kette(_sos('hp', 120), eq_spitze(400, -2, 1.0), eq_spitze(3500, 2, 1.0)), ziel=-25.5, hall={'saal': 0.25, 'raum': 0.3}),
        'snare': dict(eq=kette(_sos('hp', 150), eq_spitze(5000, 2.5, 1.0)), ziel=-25.5, hall={'saal': 0.35}),
        'tief': dict(eq=kette(_sos('lp', 110), _sos('hp', 40, 4)), ziel=-30),
        'pauke': dict(eq=kette(_sos('hp', 40), eq_spitze(300, -3, 1.0)), ziel=-24.5, hall={'saal': 0.35}),
        'becken': dict(eq=kette(_sos('hp', 400), eq_kuhle(9000, 2, hoch=True)), ziel=-26, hall={'saal': 0.45}),
        'blech_tief': dict(eq=kette(_sos('hp', 60), eq_spitze(260, -3, 1.0), eq_spitze(1300, 0.5, 1.0)), ziel=-22, hall={'saal': 0.4}),
        'trompeten': dict(eq=kette(_sos('hp', 180), eq_spitze(2500, 1.5, 1.0), _sos('lp', 12000)), ziel=-23.5, hall={'saal': 0.45}),
        'hoerner': dict(eq=kette(_sos('hp', 100), eq_spitze(320, -2.5, 1.0), eq_spitze(1500, 0.5, 1.0)), ziel=-20.5, hall={'saal': 0.5}),
        'melodie': dict(eq=kette(_sos('hp', 220), eq_spitze(3500, 2, 1.0), eq_kuhle(8000, 2, hoch=True)), ziel=-21.5, hall={'saal': 0.5}),
        'flaeche': dict(eq=kette(_sos('hp', 200), _sos('lp', 9000)), ziel=-27, hall={'saal': 0.6}),
        'chor': dict(eq=kette(_sos('hp', 220), _sos('lp', 7000)), vokal='a', ziel=-27, hall={'saal': 0.8}),
    }
    master = dict(eq=kette(_sos('hp', 32, 2), eq_kuhle(45, -3.5), eq_kuhle(120, 1.5), eq_spitze(300, -2.0, 0.8), eq_spitze(1000, -1.5, 0.9),
                           eq_kuhle(5000, 2.5, hoch=True), eq_kuhle(9000, 1.5, hoch=True)),
                  hall_eq=kette(_sos('hp', 200, 2), eq_spitze(400, -2, 1.0)), schwelle=-15, ratio=2.0, treiben=1.2)
    return specs, raeume, master


# === b: „Stahl“ – treibend-modern, d-Moll, 128 BPM, 64 Takte =========================================================
# Teile: B1 Auftakt (Schlagzeug, Bass, Arpeggio, erste Gitarrenschläge) · B2 Riff (Gitarren links/rechts, Bass im
# Riff, Klatschen der Menge) · B3/B4 Refrain (Synthesizer-Melodie, Blechantworten, Hörner) · B5 halbes Tempo (Flächen,
# große Toms, Menge, Anstieg) · B6 Riff unter dem Refrain · B7 Riff mit Celli, Blech-Ruf und -Antwort, Arpeggio ·
# B8 Riff, Schlagzeug-Fill in den Anfang.
B_AKK = {'Dm': (2, (2, 5, 9)), 'Bb': (10, (10, 2, 5)), 'C': (0, (0, 4, 7)), 'A': (9, (9, 1, 4)), 'Gm': (7, (7, 10, 2)), 'F': (5, (5, 9, 0))}
B_GIT = {'Dm': 38, 'Bb': 46, 'C': 48, 'A': 45, 'Gm': 43, 'F': 41}   # Grundton der Quint-Griffe (Gitarre, Drop-D)
_B_RIFF = ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Bb', 'A']
_B_REF = ['Bb', 'C', 'Dm', 'Dm', 'Bb', 'C', 'A', 'A']
B_PLAN = [('B1', _B_RIFF), ('B2', _B_RIFF), ('B3', _B_REF), ('B4', _B_REF), ('B5', ['Gm', 'Gm', 'Bb', 'Bb', 'Dm', 'Dm', 'A', 'A']),
          ('B6', _B_REF), ('B7', _B_RIFF), ('B8', _B_RIFF)]
# Riff: (Sechzehntel, Art c = Quint-Griff / m = gedämpfter Grundton, Abstand zum Grundton, Länge in Sechzehnteln)
B_RIFF = {
    'moll1': [(0, 'c', 0, 3), (3, 'c', 3, 3), (6, 'c', 0, 2), (8, 'm', 0, 1), (9, 'm', 0, 1), (10, 'c', 5, 2), (12, 'm', 0, 1), (13, 'c', 3, 1),
              (14, 'c', 2, 2)],
    'moll2': [(0, 'c', 0, 3), (3, 'c', 3, 3), (6, 'c', 0, 2), (8, 'm', 0, 1), (9, 'm', 0, 1), (10, 'c', 7, 2), (12, 'c', 8, 2), (14, 'c', 7, 1),
              (15, 'm', 0, 1)],
    'dur': [(0, 'c', 0, 4), (4, 'm', 0, 1), (5, 'm', 0, 1), (6, 'c', 0, 2), (8, 'm', 0, 1), (9, 'm', 0, 1), (10, 'm', 0, 1), (11, 'c', 0, 2),
            (13, 'm', 0, 1), (14, 'c', 2, 2)],
    'schluss': [(0, 'c', 0, 4), (4, 'm', 0, 1), (5, 'm', 0, 1), (6, 'c', 0, 2), (8, 'm', 0, 1), (9, 'm', 0, 1), (10, 'm', 0, 1), (11, 'c', 0, 1),
                (12, 'm', 0, 1), (13, 'm', 0, 1), (14, 'c', 0, 1), (15, 'c', 1, 1)],
}
B_HOOK = [(0, 0.75, 74), (0.75, 0.75, 77), (1.5, 0.5, 79), (2, 1.5, 81), (3.5, 0.5, 79),
          (4, 0.75, 79), (4.75, 0.75, 77), (5.5, 0.5, 76), (6, 2, 72),
          (8, 0.75, 74), (8.75, 0.75, 77), (9.5, 0.5, 81), (10, 2, 79), (12, 3, 77),
          (16, 0.75, 74), (16.75, 0.75, 77), (17.5, 0.5, 79), (18, 1.5, 82), (19.5, 0.5, 81),
          (20, 0.75, 79), (20.75, 0.75, 77), (21.5, 0.5, 79), (22, 1.5, 84), (23.5, 0.5, 81),
          (24, 2, 81), (26, 1, 79), (27, 1, 76), (28, 3, 73), (31, 1, 76)]


def variante_b(B):
    S = Satz(B, 128, 64, 5202)
    T, M, K = S.T, S.M, S.K
    rngL, rngR = np.random.default_rng(71), np.random.default_rng(72)
    for b in range(S.N):
        teil, akk = B_PLAN[b // 8]
        i = b % 8
        name = akk[i]
        pc, pcs = B_AKK[name]
        moll = name.endswith('m')
        g0 = B_GIT[name]
        riff = B_RIFF['moll1' if i % 2 == 0 else 'moll2'] if moll else B_RIFF['schluss' if i == 7 else 'dur']
        halb = teil == 'B5'
        auf = teil == 'B5' and i >= 6
        riffig = teil in ('B2', 'B6', 'B7', 'B8') or (teil == 'B1' and i >= 4)
        refrain = teil in ('B3', 'B4')
        # --- Gitarren ---
        if riffig and not (teil == 'B1' and i < 6):
            for st, art, iv, ln in riff:
                dauer = ln * S.s16 * (0.92 if art == 'c' else 0.7)
                for bus, rg, pan in (('git_l', rngL, 0.0), ('git_r', rngR, 0.0)):
                    t = T(b, st) + float(rg.uniform(-0.006, 0.006))
                    if art == 'c':
                        y = powerchord(g0 + iv, dauer, 0.95, 0.15, rg)
                    else:
                        y = ks_saite(mton(g0) * 2 ** (rg.normal(0, 3) / 1200), dauer, 2.0, 0.6, 0.85, rg, 0.02) * 0.8
                    M(bus, t, y, pan)
        elif teil == 'B1' and i >= 4:
            for bus, rg, pan in (('git_l', rngL, 0.0), ('git_r', rngR, 0.0)):
                M(bus, T(b) + float(rg.uniform(-0.005, 0.005)), powerchord(g0, S.takt * 0.9, 0.8, 0.0, rg), pan)
        elif refrain or teil == 'B6':
            # Refrain: Quint-Griffe klingen (halbe Noten), dazwischen gedämpfte Achtel
            for bus, rg, pan in (('git_l', rngL, 0.0), ('git_r', rngR, 0.0)):
                for st, ln in ((0, 6), (6, 4), (10, 6)):
                    M(bus, T(b, st) + float(rg.uniform(-0.006, 0.006)), powerchord(g0, ln * S.s16 * 0.95, 0.95, 0.0, rg), pan)
        elif halb and not auf:
            if i % 2 == 0:
                for bus, rg, pan in (('git_l', rngL, 0.0), ('git_r', rngR, 0.0)):
                    M(bus, T(b) + float(rg.uniform(-0.004, 0.004)), powerchord(g0, 2 * S.takt - 0.1, 0.9, 0.0, rg), pan)
        elif auf:
            for bus, rg, pan in (('git_l', rngL, 0.0), ('git_r', rngR, 0.0)):
                for st in range(0, 16, 2 if i == 6 else 1):
                    y = ks_saite(mton(g0) * 2 ** (rg.normal(0, 3) / 1200), S.s16 * 0.8, 2.0, 0.6, 0.85, rg, 0.02)
                    M(bus, T(b, st) + float(rg.uniform(-0.005, 0.005)), y * (0.5 + 0.5 * ((i - 6) * 16 + st) / 32), pan)
        if teil == 'B7':
            for st, art, iv, ln in riff:
                if art == 'c':
                    S.spiel('celli', 'celli_spic', T(b, st), g0 + iv + 12, 0.9, pan=0.25, breite=0.9)
        # --- Bass ---
        bg = g0 - 12
        if riffig or (teil == 'B1'):
            ev = riff if riffig else [(st, 'm', 0, 2) for st in range(0, 16, 2)]
            for st, art, iv, ln in ev:
                M('bass', T(b, st), synbass(bg + (iv if art == 'c' else 0), ln * S.s16 * 0.9, 1.0 if art == 'c' else 0.8,
                                            0.8 if art == 'c' else 0.55, S.rng), 0)
        elif refrain or teil == 'B6':
            for st in range(0, 16, 2):
                M('bass', T(b, st), synbass(bg + (12 if st in (6, 14) else 0), S.s16 * 1.8, 0.95 if st % 4 == 0 else 0.8, 0.7, S.rng), 0)
        elif halb and not auf:
            M('bass', T(b), synbass(bg, S.takt - 0.05, 1.0, 0.45, S.rng), 0)
        elif auf:
            for st in range(0, 16, 2 if i == 6 else 1):
                M('bass', T(b, st), synbass(bg, S.s16 * 0.8, 0.9, 0.6, S.rng), 0)
        # --- Schlagzeug ---
        if halb and not auf:
            kicks, snares = [0, 10], [8]
        elif riffig:
            kicks = sorted({st for st, art, iv, ln in riff if art == 'c'} | {0})
            snares = [4, 12]
        else:
            kicks, snares = [0, 6, 8, 11] if i % 2 == 0 else [0, 3, 6, 8, 14], [4, 12]
        if teil == 'B1' and i < 4:
            kicks = [0, 6, 8]
        if auf:
            kicks = [0, 4, 8, 12] if i == 6 else [0, 2, 4, 6, 8, 10, 12, 14]
            snares = []
            for k in range(8 if i == 6 else 16):
                st = k * (2 if i == 6 else 1)
                S.spiel('snare', 'snare', T(b, st), vel=0.3 + 0.65 * ((i - 6) * 16 + st) / 32, pan=0.05, breite=0.8, jit=2)
        for st in kicks:
            M('kick', T(b, st) + S.j(1), K.trommel('kick', 1.0 if st in (0, 8) else 0.85), 0)
            S.spiel('kick', 'grosse_tr', T(b, st), vel=0.5, dauer=0.16, rel=0.05, breite=0.3, jit=1, g=0.6)
        for st in snares:
            S.spiel('snare', 'snare', T(b, st), vel=0.95, pan=0.05, breite=0.8, jit=2)
            S.spiel('klatsch', 'klatsch', T(b, st) + 0.003, vel=0.85, pan=-0.05, breite=0.8, jit=3)
        if not halb and not auf and teil != 'B1':
            for st in (7, 15) if i % 2 else (15,):
                S.spiel('snare', 'snare', T(b, st), vel=0.25, pan=0.05, breite=0.8, jit=3)
        # Becken
        if not auf:
            if halb:
                for st in (0, 4, 8, 12):
                    S.spiel('hats', 'hh_zu', T(b, st), vel=0.6, pan=0.35, breite=0.6, jit=3)
            elif refrain or teil == 'B6':
                for st in range(16):
                    if st % 4 == 2:
                        S.spiel('hats', 'hh_auf', T(b, st), vel=0.7, pan=0.35, breite=0.7, jit=3, dauer=S.s16 * 1.7, rel=0.05)
                    else:
                        S.spiel('hats', 'hh_zu', T(b, st), vel=0.8 if st % 4 == 0 else 0.45, pan=0.35, breite=0.6, jit=3)
            else:
                for st in range(16):
                    if teil == 'B1' and i < 4 and st % 2:
                        continue
                    S.spiel('hats', 'hh_zu', T(b, st), vel=(0.85, 0.35, 0.6, 0.4)[st % 4], pan=0.35, breite=0.6, jit=3)
            if teil in ('B2', 'B4', 'B6', 'B8', 'B7'):
                for st in range(0, 16, 2):
                    S.spiel('hats', 'schuettel', T(b, st + 1), vel=0.6, pan=-0.5, breite=0.5, jit=5)
        if refrain or teil == 'B6':
            for st in (4, 12):
                S.spiel('hats', 'tamb', T(b, st), vel=0.7, pan=-0.4, breite=0.6, jit=3)
        if b % 8 == 0 or (b % 4 == 0 and teil in ('B4', 'B6')):
            S.spiel('becken', 'becken', T(b), vel=0.9 if b % 8 == 0 else 0.7, pan=0.3 if b % 16 else -0.3, jit=0)
            if b % 8 == 0 and teil not in ('B1', 'B5'):
                M('tief', T(b), K.einschlag(0.8, 70, 34, 1.4), 0)
        # Fills
        if i == 7 and not auf:
            for k, (st, inst) in enumerate(((8, 'tom_h'), (10, 'tom_h'), (11, 'tom_t'), (12, 'tom_t'), (13, 'tom_t'), (14, 'snare'), (15, 'snare'))):
                S.spiel('toms', inst, T(b, st), vel=0.7 + 0.04 * k, pan=0.4 - 0.12 * k, breite=0.7, jit=3)
        if halb and not auf:
            for st in (0, 6, 10) if i % 2 == 0 else (0, 3, 6, 12, 14):
                S.spiel('toms', 'tom_tm', T(b, st), vel=0.85, pan=-0.2, breite=0.8, cent=-300)
        if auf and i == 7:
            S.anschwellen('becken', T(b + 1), S.takt, 0.9)
            M('fx', T(b - 1), K.anstieg(2 * S.takt, 1.0, ton=mton(50)), 0)
        if teil in ('B2', 'B6') and i == 7:
            S.rueckwaerts('becken', T(b + 1), 1.6)
        # Klatschen der Menge (auf 2 und 4)
        if (teil == 'B2' and i >= 4) or teil in ('B4', 'B5', 'B6', 'B8') and not auf:
            for st in (4, 12):
                S.menge('menge', T(b, st), 18 if teil != 'B5' else 26)
        # --- Arpeggio ---
        if teil in ('B1', 'B5', 'B7') and not auf:
            r0 = wurzel_in(pc, 62)
            terz = 3 if moll else 4
            fig = [0, 7, 12, terz + 12, 12, 7, terz, 7] * 2
            for st, iv in enumerate(fig):
                M('arp', T(b, st), zupfsynth(r0 + iv, 0.85 if st % 4 == 0 else 0.6, S.s16, S.rng), 0.3 if st % 2 else -0.3)
        # --- Blech ---
        if refrain or teil == 'B6':
            if i in (3, 7):
                for st in (8, 11, 14):
                    for m in MU.voicing(pcs, 62, 76, 3):
                        S.spiel('blech', 'trompete_stoss', T(b, st), m, 0.95, pan=-0.25, breite=0.8, jit=4)
                    for m in MU.voicing(pcs, 46, 60, 3):
                        S.spiel('blech', 'posaune_stoss', T(b, st), m, 0.95, pan=0.25, breite=0.8, jit=4)
        if teil == 'B7':
            ruf = [(0, 0.95), (3, 0.85), (6, 0.9)] if i % 2 == 0 else [(8, 0.8), (11, 0.8), (14, 0.95)]
            for st, v in ruf:
                lage = (62, 76) if i % 2 == 0 else (55, 69)
                for m in MU.voicing(pcs, *lage, 3):
                    S.spiel('blech', 'trompete_stoss' if i % 2 == 0 else 'horn_stoss', T(b, st), m, v, pan=-0.25 if i % 2 == 0 else 0.2,
                            breite=0.8, jit=4)
                for m in MU.voicing(pcs, 46, 60, 2):
                    S.spiel('blech', 'posaune_stoss', T(b, st), m, v * 0.9, pan=0.25, breite=0.8, jit=4)
        # --- Flächen (halbes Tempo) ---
        if halb and not auf and i % 2 == 0:
            for m in MU.voicing(pcs, 50, 69, 4):
                S.spiel('flaeche', 'violen_lang' if m >= 52 else 'celli_lang', T(b), m, 0.7, dauer=2 * S.takt - 0.1, rel=0.5, pan=0.0, breite=1.0)
    # --- Melodie ---
    for q, (teil, akk) in enumerate(B_PLAN):
        t0 = T(q * 8)
        if teil in ('B3', 'B4', 'B6'):
            M('lead', t0, synlinie(B_HOOK, S.beat, 0.9 if teil != 'B3' else 0.8, rng=S.rng))
        if teil in ('B3', 'B6'):
            S.linie('geigen', 'geigen_lang', B_HOOK, t0, 0.85, pan=-0.2, breite=0.9, binde=0.07)
        if teil in ('B4', 'B6'):
            S.linie('hoerner', 'horn_lang', B_HOOK, t0, 0.85, pan=0.1, breite=0.9, transp=-12, binde=0.07)
    return S, 40   # Höhepunkt: Takt 40 (B6)


def mix_b():
    raeume = {'halle': hall_ir(np.random.default_rng(52), (1.6, 1.9, 1.5, 0.8), 2.8, 0.025, 0.3),
              'raum': hall_ir(np.random.default_rng(53), (0.6, 0.55, 0.45, 0.3), 0.9, 0.005, 0.4),
              'stadion': hall_ir(np.random.default_rng(54), (2.2, 2.6, 2.0, 1.1), 3.6, 0.06, 0.2)}
    git = kette(eq_spitze(1500, -2, 0.8), eq_spitze(3000, 1, 1.0))
    specs = {
        'kick': dict(eq=kette(_sos('hp', 42, 4), eq_spitze(50, -3, 1.0), eq_spitze(110, 3, 1.0), eq_spitze(350, -5, 1.0), eq_spitze(4000, 3, 1.0)),
                     ziel=-21.5,
                     verd=(-4, 3, 0.002, 0.08), hall={'raum': 0.08}),
        'snare': dict(eq=kette(_sos('hp', 120), eq_spitze(200, 2, 1.0), eq_spitze(900, -2, 1.0), eq_spitze(5000, 3, 1.0)), ziel=-21,
                      verd=(-5, 3, 0.002, 0.1), hall={'raum': 0.3, 'halle': 0.2}),
        'klatsch': dict(eq=kette(_sos('hp', 400), eq_spitze(2000, 2, 1.0)), ziel=-25, hall={'raum': 0.3, 'halle': 0.25}),
        'menge': dict(eq=kette(_sos('hp', 350), _sos('lp', 9000)), ziel=-26.5, hall={'stadion': 0.9}, breite=1.3),
        'hats': dict(eq=kette(_sos('hp', 400), eq_kuhle(11000, -3, hoch=True)), ziel=-28.5, hall={'raum': 0.2}),
        'toms': dict(eq=kette(_sos('hp', 60), eq_spitze(400, -3, 1.0), eq_spitze(4000, 2, 1.0)), ziel=-22, hall={'raum': 0.3, 'halle': 0.2}),
        'becken': dict(eq=kette(_sos('hp', 400), eq_kuhle(9000, 1.5, hoch=True)), ziel=-26, hall={'halle': 0.3}),
        'tief': dict(eq=kette(_sos('lp', 120), _sos('hp', 38, 4)), ziel=-29),
        'fx': dict(eq=_sos('hp', 200), ziel=-28, hall={'halle': 0.4}),
        'bass': dict(eq=kette(_sos('hp', 38, 4), eq_kuhle(60, -2), eq_spitze(120, 3, 0.9), eq_spitze(250, -1.5, 1.0), eq_spitze(1200, 2, 1.0),
                               _sos('lp', 6000)),
                     ziel=-21.5, duck=('kick', 4.0, 0.003, 0.12)),
        'git_l': dict(fx=verstaerker, eq=git, ziel=-20, lage=-0.8, hall={'raum': 0.12, 'halle': 0.08}, duck=('kick', 1.5, 0.003, 0.1)),
        'git_r': dict(fx=verstaerker, eq=git, ziel=-20, lage=0.8, hall={'raum': 0.12, 'halle': 0.08}, duck=('kick', 1.5, 0.003, 0.1)),
        'celli': dict(fx=lambda x: verstaerker(x, 4.0, 0.05), eq=kette(_sos('hp', 90), eq_spitze(300, -2, 1.0)), ziel=-25, hall={'halle': 0.2}),
        'arp': dict(fx=lambda x: echo(x, 3 * 60 / 128 / 4, 3 * 60 / 128 / 4, 0.4, 0.45), eq=kette(_sos('hp', 250), _sos('lp', 7000)), ziel=-27,
                    hall={'halle': 0.35}, duck=('kick', 5.0, 0.003, 0.15)),
        'blech': dict(eq=kette(_sos('hp', 120), eq_spitze(300, -2, 1.0), eq_spitze(2500, 2, 1.0)), ziel=-22.5, hall={'halle': 0.35}),
        'hoerner': dict(eq=kette(_sos('hp', 100), eq_spitze(320, -2, 1.0)), ziel=-25, hall={'halle': 0.45}),
        'geigen': dict(eq=kette(_sos('hp', 250), eq_spitze(3500, 1.5, 1.0)), ziel=-24, hall={'halle': 0.45}),
        'lead': dict(eq=kette(_sos('hp', 200), eq_spitze(1800, 2, 1.0), _sos('lp', 9000)), ziel=-22.5, hall={'halle': 0.4},
                     fx=lambda x: echo(x, 60 / 128 * 0.75, 60 / 128 * 0.75, 0.3, 0.2)),
        'flaeche': dict(eq=kette(_sos('hp', 180), _sos('lp', 9000)), ziel=-25, hall={'halle': 0.5}, duck=('kick', 4.0, 0.003, 0.2)),
    }
    master = dict(eq=kette(_sos('hp', 30, 2), eq_kuhle(45, -3), eq_spitze(62, -3, 1.0), eq_spitze(125, 1.5, 1.0), eq_spitze(300, -1.0, 0.8),
                           eq_spitze(3200, -1.5, 0.9), eq_kuhle(9000, -3, hoch=True)),
                  hall_eq=kette(_sos('hp', 220, 2), eq_spitze(450, -2, 1.0)), schwelle=-15, ratio=2.2, treiben=1.6)
    return specs, raeume, master


# === c: „Kirschsturm“ – fernöstlich, A (In-Skala A–B♭–D–E–F), 150 BPM, 72 Takte ======================================
# Teile: C1 Trommeln und Koto · C2 Shamisen-Riff · C3 Flötenthema (gebogene Töne, Atem) · C4 Tutti (Thema in den Geigen)
# · C5 Koto-Läufe, leichtere Trommeln, Flöte antwortet · C6 Trommel-Pause (Ruf und Antwort, Gong, Anstieg) · C7 zweites
# Thema (Geigen, Flöte, Hörner) · C8 Zwiegespräch Shamisen–Koto · C9 Riff, Trommelwirbel in den Anfang.
C_AKK = {'Am': (9, (9, 0, 4)), 'F': (5, (5, 9, 0)), 'G': (7, (7, 11, 2)), 'Bb': (10, (10, 2, 5)), 'Dm': (2, (2, 5, 9)), 'E': (4, (4, 8, 11))}
_C1 = ['Am', 'Am', 'F', 'G', 'Am', 'Am', 'Bb', 'Bb']
C_PLAN = [('C1', _C1), ('C2', _C1), ('C3', _C1), ('C4', _C1), ('C5', ['Dm', 'Dm', 'Am', 'Am', 'Bb', 'Bb', 'E', 'E']),
          ('C6', ['Am'] * 6 + ['E', 'E']), ('C7', ['F', 'G', 'Am', 'Am', 'Dm', 'Bb', 'E', 'E']), ('C8', _C1), ('C9', _C1)]
C_KOTO = {'Am': [57, 64, 69, 70, 69, 64, 62, 64], 'F': [53, 60, 65, 69, 70, 69, 65, 60], 'G': [55, 62, 67, 69, 74, 69, 67, 62],
          'Bb': [58, 65, 70, 74, 76, 74, 70, 65], 'Dm': [50, 57, 62, 64, 65, 64, 62, 57], 'E': [52, 59, 64, 65, 71, 65, 64, 59]}
C_SKALA = [m for m in range(45, 90) if m % 12 in (9, 10, 2, 4, 5)]   # In-Skala auf A
# Shamisen-Riff (zwei Takte): (Sechzehntel, Ton, Länge in Sechzehnteln, Rutscher)
C_RIFF = [[(0, 57, 2, 1), (2, 57, 1, 0), (3, 64, 1, 0), (4, 65, 2, 1), (6, 64, 1, 0), (7, 62, 1, 0), (8, 64, 2, 0), (10, 57, 2, 0), (12, 58, 1, 1),
           (13, 57, 1, 0), (14, 52, 2, 0)],
          [(0, 57, 2, 1), (2, 57, 1, 0), (3, 64, 1, 0), (4, 69, 2, 1), (6, 70, 1, 0), (7, 69, 1, 0), (8, 65, 2, 0), (10, 64, 1, 0), (11, 62, 1, 0),
           (12, 64, 3, 1), (15, 62, 1, 0)]]
C_THEMA = [(0, 1.5, 76), (1.5, 0.5, 77), (2, 2, 76), (4, 1, 74), (5, 1, 70), (6, 2, 69), (8, 1.5, 74), (9.5, 0.5, 76), (10, 1, 77), (11, 1, 81),
           (12, 2, 79), (14, 1, 77), (15, 1, 76), (16, 1.5, 76), (17.5, 0.5, 77), (18, 1, 81), (19, 1, 82), (20, 3, 81), (23, 1, 77),
           (24, 1.5, 77), (25.5, 0.5, 76), (26, 1, 74), (27, 1, 70), (28, 4, 69)]
C_THEMA2 = [(0, 1, 72), (1, 1, 77), (2, 2, 81), (4, 1.5, 79), (5.5, 0.5, 77), (6, 2, 74), (8, 1, 76), (9, 1, 81), (10, 2, 84), (12, 3, 82),
            (15, 1, 81), (16, 1.5, 77), (17.5, 0.5, 76), (18, 2, 74), (20, 1, 70), (21, 1, 74), (22, 2, 77), (24, 3, 76), (27, 1, 77), (28, 4, 76)]
C_ANTWORT = [(2, 1, 69), (3, 1, 70), (4, 2, 74), (6, 2, 69)]   # Flöte antwortet in C5 (je 2 Takte)


def shakuhachi(S, bus, noten, t0, vel=0.8, transp=0, pan=0.0):
    """Flöten-Samples als Shakuhachi: Töne von unten angeblasen (Phrasenanfang, Sprünge), spätes, breites Vibrato,
    Atemgeräusch; gebundene Töne überblenden."""
    I = S.B['floete']
    b = S.beat
    for k, (s, d, m) in enumerate(noten):
        m = m + transp
        vor_geb = k > 0 and abs(noten[k - 1][0] + noten[k - 1][1] - s) < 1e-6
        nach_geb = k + 1 < len(noten) and abs(s + d - noten[k + 1][0]) < 1e-6
        sprung = not vor_geb or abs(noten[k - 1][2] + transp - m) >= 3
        dauer = d * b
        rel = 0.05 if nach_geb else 0.25
        y = I.ton(m, vel * (0.95 + 0.1 * S.r()), dauer, rel, versatz=0.08 if vor_geb else 0.0, ein=0.05 if vor_geb else 0.0,
                  cent=float(S.rng.normal(0, 4)))
        n = len(y)
        t = np.arange(n) / SR
        c = np.zeros(n)
        if sprung:
            c += -110 * np.exp(-t / 0.07)          # von unten angeblasen
        if dauer > 0.5:
            c += 28 * np.clip((t - 0.35) / 0.4, 0, 1) * np.sin(TAU * 5.2 * t + S.r(0, TAU))
        if nach_geb is False and dauer > 0.6:
            c += -40 * np.clip((t - dauer + 0.15) / 0.2, 0, 1) ** 2   # Ende leicht abfallend
        y = tonhoehen_kurve(y, c)
        n = len(y)
        e = np.abs(y).max(1)
        e = sg.lfilter([0.01], [1, -0.99], e)
        atem = bp(S.rng.standard_normal(n), 1200, 6000) * (0.12 * e + 0.25 * e * np.exp(-np.arange(n) / SR / 0.06))
        y = y + np.stack([atem, atem * 0.8], 1) * 3.0
        S.M(bus, t0 + s * b - (0 if vor_geb else I.vor) + S.j(6), stereo_lage(y, pan, 0.6))


def shamisen(S, t, m, vel, dauer, rutsch, pan=0.0):
    """Gezupfte Saite (Strumstick) + Anschlag des Plektrums auf dem Fell (Holzklick) + leichtes Schnarren; manche Töne
    rutschen von unten in den Ton."""
    I = S.B['zupf']
    y = I.ton(m, vel, dauer, 0.04, cent=float(S.rng.normal(0, 4)))
    if rutsch:
        n = len(y)
        y = tonhoehen_kurve(y, -100 * np.exp(-np.arange(n) / SR / 0.035))
    # Schnarren (Sawari): obere Anteile leicht verzerrt
    h = hp(y, 1500)
    y = y + 0.25 * np.tanh(4 * h) / 4
    S.M('shami', t - I.vor + S.j(3), stereo_lage(y, pan, 0.5))
    S.spiel('shami', 'holz', t, vel=0.35 * vel, dauer=0.04, rel=0.02, pan=pan, breite=0.3, jit=1, g=0.5, cent=500)


def variante_c(B):
    S = Satz(B, 150, 72, 6303)
    T, M, K = S.T, S.M, S.K
    for b in range(S.N):
        teil, akk = C_PLAN[b // 8]
        i = b % 8
        name = akk[i]
        pc, pcs = C_AKK[name]
        voll = teil in ('C4', 'C7', 'C9')
        auf = (teil == 'C6' and i >= 6) or (teil == 'C9' and i >= 7)
        brk = teil == 'C6' and i < 6
        # --- Trommeln ---
        if brk:
            ruf = [0, 3, 6, 8] if i % 2 == 0 else [0, 2, 4, 6, 8, 10, 11, 12, 13, 14, 15]
            for st in ruf:
                v = 1.0 if st in (0, 8) else 0.8
                S.spiel('taiko', 'grosse_tr' if st in (0, 8) else 'tom_tm', T(b, st), vel=v, cent=0 if st in (0, 8) else -500, pan=-0.2 if i % 2 else 0.2,
                        breite=0.8, dauer=0.8, rel=0.4)
                S.spiel('taiko', 'tenor_tief', T(b, st), vel=v * 0.85, pan=0.25 if i % 2 else -0.25, breite=0.7)
                if st in (0, 8):
                    M('tief', T(b, st), K.trommel('odaiko', 0.9), 0)
            for st in range(0, 16, 4):
                S.spiel('shime', 'rahmen_s', T(b, st + 2), vel=0.5, pan=0.4, breite=0.5)
        elif not auf:
            gross = [0, 10] if teil in ('C1', 'C5', 'C8') else [0, 6, 10]
            if voll:
                gross = [0, 3, 6, 10, 12] if i % 2 else [0, 6, 10]
            for st in gross:
                S.spiel('taiko', 'grosse_tr', T(b, st), vel=1.0 if st == 0 else 0.8, dauer=0.5, rel=0.3, pan=0.0, breite=0.8, jit=3)
                M('tief', T(b, st), K.trommel('odaiko', 0.9 if st == 0 else 0.7), 0)
            if teil != 'C5':
                mitte = [0, 4, 6, 7, 8, 12, 14, 15] if i % 2 == 0 else [0, 4, 6, 8, 10, 11, 12, 14]
                for st in mitte:
                    v = 0.9 if st % 4 == 0 else 0.65
                    S.spiel('taiko', 'tom_tm', T(b, st), vel=v, pan=-0.3, breite=0.7, cent=-500, jit=4)
                    if voll or teil in ('C2', 'C9'):
                        S.spiel('taiko', 'tenor_tief', T(b, st), vel=v * 0.85, pan=0.3, breite=0.7, jit=4)
            # Shime: Achtel, im Tutti Sechzehntel
            schritt = 1 if (voll or teil in ('C3', 'C8')) else 2
            for st in range(0, 16, schritt):
                v = 0.8 if st % 4 == 0 else (0.55 if st % 2 == 0 else 0.35)
                S.spiel('shime', 'snare_ohne', T(b, st), vel=v, pan=0.35, breite=0.5, cent=500, jit=3)
            if teil == 'C5':
                for st in range(0, 16, 2):
                    S.spiel('shime', 'rahmen_l' if st % 8 == 0 else 'rahmen_s', T(b, st), vel=0.8 if st % 8 == 0 else 0.5, pan=-0.3, breite=0.6)
            # Hyoshigi-Klack und Glöckchen (Amboss, hoch)
            if i % 2 == 0:
                S.spiel('holz', 'holz', T(b, 0), vel=0.8, pan=-0.45, breite=0.4, jit=1)
            if voll or teil in ('C8',):
                for st in (2, 6, 10, 14):
                    S.spiel('holz', 'amboss', T(b, st), vel=0.3, pan=0.5, breite=0.4, cent=700, dauer=0.25, rel=0.1, g=0.6)
        if auf:
            for st in range(16):
                v = 0.35 + 0.65 * (((i - 6) if teil == 'C6' else 0) * 16 + st) / (32 if teil == 'C6' else 16)
                S.spiel('shime', 'snare_ohne', T(b, st), vel=v, pan=0.35, breite=0.5, cent=500, jit=2)
                if st % 2 == 0 or i == 7:
                    S.spiel('taiko', 'tom_tm', T(b, st), vel=v, pan=-0.3, breite=0.7, cent=-500, jit=2)
            if i == 7:
                S.anschwellen('becken', T(b + 1), S.takt * (2 if teil == 'C6' else 1), 0.8)
            if teil == 'C6' and i == 6:
                M('fx', T(b), K.anstieg(2 * S.takt, 0.8, ton=mton(45)), 0)
        if i in (3,) and not brk and not auf and teil not in ('C5',):
            for k, st in enumerate((12, 13, 14, 15)):
                S.spiel('taiko', 'tom_hm', T(b, st), vel=0.6 + 0.1 * k, pan=0.3 - 0.2 * k, breite=0.6, cent=-300)
        if b in (0, 40):
            S.spiel('becken', 'gong', T(b), vel=0.85, pan=-0.2, jit=0)
            M('tief', T(b), K.einschlag(0.9, 60, 30, 2.5), 0)
        if b in (24, 48, 56) or (b % 4 == 0 and teil == 'C7'):
            S.spiel('becken', 'becken', T(b), vel=0.75, pan=0.3, jit=0)
        # --- Bass (Kontrabass gezupft, im Tutti Celli-Achtel) ---
        r = wurzel_in(pc, 33)
        if not brk:
            for st in ((0, 6, 8, 14) if not voll else (0, 3, 6, 8, 11, 14)):
                S.spiel('bass', 'kb_pizz', T(b, st), r + (12 if st == 6 else 0), 0.95 if st in (0, 8) else 0.75, pan=0.1, breite=0.6)
        else:
            S.spiel('bass', 'kb_pizz', T(b, 0), 33, 1.0, pan=0.1, breite=0.6)
        if voll and not auf:
            for st in range(0, 16, 2):
                S.spiel('celli', 'celli_spic', T(b, st), wurzel_in(pc, 45) + (12 if st in (6, 14) else 0), 0.85 if st % 4 == 0 else 0.55, pan=0.35,
                        breite=0.9)
        # --- Koto ---
        if teil in ('C1', 'C2', 'C3', 'C4', 'C7', 'C9') and not auf:
            for k, m in enumerate(C_KOTO[name]):
                S.spiel('koto', 'koto', T(b, 2 * k), m, 0.85 if k % 4 == 0 else 0.6, pan=-0.35, breite=0.7, jit=5, rel=0.3,
                        dauer=None if k % 4 == 0 else 1.2)
        if teil == 'C5' or (teil == 'C8' and i % 4 >= 2):
            # Läufe in Sechzehnteln: auf und ab durch die In-Skala, je Takt eigener Startton
            st0 = C_SKALA.index(min(C_SKALA, key=lambda m: abs(m - (60 + pc % 12))))
            richtung = 1 if i % 2 == 0 else -1
            for st in range(16):
                k = st if st < 8 else 15 - st
                m = C_SKALA[int(np.clip(st0 + richtung * k, 0, len(C_SKALA) - 1))]
                S.spiel('koto', 'koto', T(b, st), m, 0.8 if st % 4 == 0 else 0.55, pan=-0.35, breite=0.7, jit=4, dauer=0.5, rel=0.4)
        # --- Shamisen ---
        if teil in ('C2', 'C3', 'C4', 'C9') or (teil == 'C8' and i % 4 < 2) or (teil == 'C7' and i % 2 == 1):
            for st, m, ln, ru in C_RIFF[i % 2]:
                shamisen(S, T(b, st), m, 0.95 if st in (0, 4, 8, 12) else 0.75, ln * S.s16 * 0.9, ru, pan=0.3)
        if brk:
            for st in ((14, 15) if i % 2 == 0 else ()):
                shamisen(S, T(b, st), 57 if st == 14 else 64, 0.9, S.s16 * 0.9, 0, pan=0.3)
            if i % 2 == 1:
                for st in (0, 3, 6):
                    shamisen(S, T(b, st), 57 + (0, 7, 12)[(st // 3) % 3], 1.0, S.s16 * 2, 1, pan=0.3)
        # --- Flächen, Blech ---
        if teil in ('C2', 'C3', 'C4', 'C7', 'C8') and i % 2 == 0 and not auf:
            for m in MU.voicing(pcs, 52, 72, 4):
                S.spiel('flaeche', 'violen_lang' if m >= 50 else 'celli_lang', T(b), m, 0.6, dauer=2 * S.takt - 0.1, rel=0.5, pan=0.0, breite=1.0)
        if teil == 'C7' and i % 2 == 0:
            for m in MU.voicing(pcs, 45, 62, 3):
                S.spiel('hoerner', 'horn_lang', T(b), m, 0.75, dauer=2 * S.takt - 0.1, rel=0.4, pan=-0.15, breite=0.8)
        if brk and i % 2 == 0:
            for m in (33, 45, 52):
                S.spiel('hoerner', 'posaune_lang', T(b), m + 12 if m < 40 else m, 0.7, dauer=2 * S.takt - 0.2, rel=0.6, pan=0.1, breite=0.8)
    # --- Melodien ---
    for q, (teil, akk) in enumerate(C_PLAN):
        t0 = T(q * 8)
        if teil == 'C3':
            shakuhachi(S, 'floete', C_THEMA, t0, 0.85, transp=-12, pan=-0.1)
        if teil == 'C4':
            S.linie('melodie', 'geigen_lang', C_THEMA, t0, 0.85, pan=-0.3, breite=0.9)
            shakuhachi(S, 'floete', C_THEMA, t0, 0.8, transp=-12, pan=0.1)
        if teil == 'C5':
            for p in range(4):
                shakuhachi(S, 'floete', C_ANTWORT, t0 + p * 2 * S.takt, 0.75, transp=0 if p % 2 == 0 else -2, pan=0.15)
        if teil == 'C7':
            S.linie('melodie', 'geigen_lang', C_THEMA2, t0, 0.9, pan=-0.3, breite=0.9)
            shakuhachi(S, 'floete', C_THEMA2, t0, 0.8, transp=-12, pan=0.1)
    return S, 48   # Höhepunkt: Takt 48 (C7)


def mix_c():
    raeume = {'halle': hall_ir(np.random.default_rng(63), (1.8, 2.1, 1.7, 0.9), 3.2, 0.03, 0.25),
              'raum': hall_ir(np.random.default_rng(64), (0.7, 0.6, 0.5, 0.3), 1.0, 0.006, 0.35)}
    specs = {
        'taiko': dict(eq=kette(_sos('hp', 45), eq_spitze(350, -4, 0.9), eq_spitze(2500, 2.5, 1.0)), ziel=-20, verd=(-6, 2.5, 0.003, 0.1),
                      hall={'halle': 0.25, 'raum': 0.3}),
        'tief': dict(eq=kette(_sos('lp', 110), _sos('hp', 40, 4)), ziel=-30),
        'shime': dict(eq=kette(_sos('hp', 250), eq_spitze(600, -2, 1.0), eq_spitze(4000, 2, 1.0)), ziel=-25.5, hall={'raum': 0.3, 'halle': 0.15}),
        'holz': dict(eq=kette(_sos('hp', 400)), ziel=-29, hall={'halle': 0.3}),
        'becken': dict(eq=kette(_sos('hp', 300)), ziel=-27, hall={'halle': 0.4}),
        'fx': dict(eq=_sos('hp', 200), ziel=-29, hall={'halle': 0.4}),
        'bass': dict(eq=kette(_sos('hp', 38), eq_spitze(90, 2, 1.0), eq_spitze(250, -2, 1.0)), ziel=-22, hall={'halle': 0.12}),
        'celli': dict(eq=kette(_sos('hp', 70), eq_spitze(250, -3, 1.0), eq_spitze(3000, 1.5, 1.0)), ziel=-24.5, hall={'halle': 0.25}),
        'koto': dict(eq=kette(_sos('hp', 130), eq_spitze(300, -2, 1.0), eq_spitze(3000, 2, 1.0)), ziel=-22, hall={'halle': 0.35, 'raum': 0.1}),
        'shami': dict(eq=kette(_sos('hp', 140), eq_spitze(350, -2, 1.0), eq_spitze(2200, 2, 1.0), _sos('lp', 10000)), ziel=-21.5,
                      verd=(-4, 2, 0.002, 0.08), hall={'halle': 0.25, 'raum': 0.15}),
        'floete': dict(eq=kette(_sos('hp', 200), eq_spitze(1500, 1, 1.0), _sos('lp', 9000)), ziel=-21, hall={'halle': 0.5}),
        'melodie': dict(eq=kette(_sos('hp', 220), eq_spitze(3500, 1.5, 1.0), eq_kuhle(8000, 1.5, hoch=True)), ziel=-22, hall={'halle': 0.5}),
        'flaeche': dict(eq=kette(_sos('hp', 180), _sos('lp', 8000)), ziel=-27, hall={'halle': 0.6}),
        'hoerner': dict(eq=kette(_sos('hp', 90), eq_spitze(320, -2, 1.0)), ziel=-25, hall={'halle': 0.5}),
    }
    master = dict(eq=kette(_sos('hp', 30, 2), eq_kuhle(45, -3.5), eq_spitze(300, -1.5, 0.8), eq_kuhle(4000, 1.0, hoch=True),
                           eq_kuhle(9000, -2.5, hoch=True)),
                  hall_eq=kette(_sos('hp', 200, 2), eq_spitze(400, -2, 1.0)), schwelle=-15, ratio=2.0, treiben=1.25)
    return specs, raeume, master


# === Bauen ============================================================================================================
def hoerprobe(mp3, eintrag, takt, hoehe_takt, ziel, laenge=30.0):
    """30 s zum Anhören: Anfang (ab einem Takt vor der Schleife) und Höhepunkt, weich überblendet, am Ende ausgeblendet."""
    d = KE.lade(mp3, 2)
    a = eintrag['loop'][0]
    t1 = max(0.0, a - takt)
    n1 = int(round(4 * takt * SR)) if 4 * takt < 15 else int(round(round(14 / takt) * takt * SR))
    t2 = a + hoehe_takt * takt
    x = int(0.5 * SR)
    teil1 = d[int(t1 * SR):int(t1 * SR) + n1 + x].astype(np.float64)
    rest = int(laenge * SR) - n1
    teil2 = d[int(t2 * SR) - x:int(t2 * SR) + rest].astype(np.float64)
    th = np.linspace(0, np.pi / 2, x)[:, None]
    y = np.concatenate([teil1[:-x], teil1[-x:] * np.cos(th) + teil2[:x] * np.sin(th), teil2[x:]])
    fo = int(2.0 * SR)
    y[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 2
    KE.schreibe_vbr(ziel, y.astype(np.float32), 2)


VARIANTEN = {}


def baue(k, B, aus):
    spuren, mix, titel = VARIANTEN[k]
    print(f'rechne arena_{k} ({titel})', flush=True)
    S, hoehe = spuren(B)
    X, pegel = mischen(S.M, *mix())
    print('  Spuren (LUFS solo):', pegel, flush=True)
    roh = os.path.join(aus, 'roh', f'arena_{k}.wav')
    MU.rohdatei(roh, X, S.takt)
    nv = int(round(2 * S.takt * SR))   # wie rohdatei(), aber genauer gerundet (sonst liegt A bei krummem Tempo 1 Sample daneben)
    ab = [round(nv / SR, 6), round((nv + len(X)) / SR, 6)]
    e = {'id': f'arena_{k}', 'lufs': -18, 'tp': -1.5, 'vbr': 2, 'bpm': S.bpm, 'takt': 4, 'blende': 0.5, 'schleife': ab}
    ziel = os.path.join(aus, f'arena_{k}.mp3')
    eintrag, info = KE.baue_musik(e, roh, ziel)
    hoerprobe(ziel, eintrag, S.takt, hoehe, os.path.join(aus, f'arena_{k}_probe.mp3'))
    print(f'  {S.bpm} BPM, {S.N} Takte, Schleife {len(X) / SR:.2f} s, schleife {ab}', flush=True)
    print('  ', eintrag, info, flush=True)
    return dict(id=k, titel=titel, bpm=S.bpm, takte=S.N, schleife=ab, datei=ziel, eintrag=eintrag, info=info)


def main():
    args = sys.argv[1:]
    aus = os.path.expanduser('~/.cache/seelenstein-klang-roh/arena-varianten')
    proben = os.path.expanduser('~/.cache/seelenstein-klang-roh/samples')
    for opt in ('--aus', '--samples'):
        if opt in args:
            i = args.index(opt)
            if opt == '--aus':
                aus = args[i + 1]
            else:
                proben = args[i + 1]
            del args[i:i + 2]
    # Aufruf durch tools/klang-erzeugen.py („arena --roh <ordner>“): die gewählte Fassung als Rohdatei musik/arena.wav
    roh = None
    if '--roh' in args:
        i = args.index('--roh')
        roh = args[i + 1]
        del args[i:i + 2]
    args = [GEWAEHLT if k == 'arena' else k for k in args]
    ids = args or sorted(VARIANTEN)
    for k in ids:
        if k not in VARIANTEN:
            raise SystemExit(f'unbekannt: {k} (bekannt: {", ".join(sorted(VARIANTEN))})')
    hole_samples(proben)
    import gc
    ergebnis = []
    for k in ids:   # je Stück eine frische Bibliothek: die Zwischenspeicher der Instrumente brauchen viel Speicher
        ergebnis.append(baue(k, Bibliothek(proben), aus))
        gc.collect()
    pfad = os.path.join(aus, 'varianten.json')
    alt = []
    if os.path.exists(pfad):
        alt = [e for e in json.load(open(pfad, encoding='utf8')) if e['id'] not in ids]
    with open(pfad, 'w', encoding='utf8') as f:
        json.dump(sorted(alt + ergebnis, key=lambda e: e['id']), f, ensure_ascii=False, indent=1)
    if roh and GEWAEHLT in ids:
        import shutil
        os.makedirs(os.path.join(roh, 'musik'), exist_ok=True)
        shutil.copyfile(os.path.join(aus, 'roh', f'arena_{GEWAEHLT}.wav'), os.path.join(roh, 'musik', 'arena.wav'))
    return 0


# Im Spiel (seit 15.52): „Titanen“ – vom Spieler aus den drei Hörproben gewählt
GEWAEHLT = 'a'


VARIANTEN.update({'a': (variante_a, mix_a, 'Titanen – episch-orchestral'), 'b': (variante_b, mix_b, 'Stahl – treibend-modern'),
                  'c': (variante_c, mix_c, 'Kirschsturm – fernöstlich')})

if __name__ == '__main__':
    sys.exit(main())
