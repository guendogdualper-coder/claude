#!/usr/bin/env python3
"""Eigene Musik für Seelenstein, ganz im Rechner erzeugt (seit 15.51): Turm der Verdammten („turm“), der Kampf gegen
Kharzul („kharzul“, ab seiner Verwandlung „kharzul2“) und die Arenen („arena“: Prüfungs- und Turnierarena). Dazu zwei
Stücke für den Feuerberg, die das Spiel im Wechsel mit „heiss“ spielt: „glut“ (treibend) und „vulkan“ (dunkel, wuchtig).

Keine Aufnahmen, keine Samples, keine fremden Melodien: Jeder Klang entsteht hier aus Schwingungen und Rauschen
(große Trommeln, Schlagzeug, Streicher, Blech, Chor aus Formantfiltern, Totenglocke, Amboss, Gong, Holzblock, Grollen,
Zupfinstrument, Erhu, Bambusflöte), alle Melodien, Harmonien und Abläufe sind eigene Kompositionen.

Jedes Stück wird als geschlossene Schleife gerechnet: Ausklang und Hall des Endes laufen in den Anfang hinein (wie
beim endlosen Abspielen), Filter, Hall und Verdichter rechnen eingeschwungen. Die Rohdatei <roh>/musik/<id>.wav
enthält die letzten zwei Takte als Vorspiel, dann die ganze Schleife und zwei Takte Nachlauf – um A und B steht also
Sample für Sample dasselbe. tools/klang-erzeugen.py baut daraus wie bei allen Stücken die MP3 (Schleife „schleife“
fest auf den Taktgrenzen, −18 LUFS, VBR q2) und trägt sie in js/daten/klang-dateien.js ein.

kharzul und kharzul2 sind dasselbe Stück (gleiches Tempo, gleiche Länge, gleiche Schleife, gleiche Grundstimmen);
kharzul2 hat mehr Wucht (doppelte Trommeln, Chor, Höllenblech, schreiende Streicher). Das Spiel blendet bei der
Verwandlung an derselben Stelle über (klang-dateien.js, MUSIC_SYNC).

glut und vulkan spielen am Feuerberg im Wechsel mit heiss (klang-dateien.js, MUSIC_REIHE): jedes Stück einmal ganz
(Vorspiel und Schleife), dann blendet das Spiel über sein Ende ins Vorspiel des nächsten. Ihre letzten zwei Takte – das
Vorspiel – sind darum Überleitungen (Wirbel und Anstieg auf H-Dur bzw. der Schlag des Ausbruchs mit Ausklang).

Aufruf:
  python3 tools/klang-synth/musik.py [turm kharzul kharzul2 arena glut vulkan] [--roh <ordner>]   # Rohdateien rechnen
  python3 tools/klang-erzeugen.py bauen turm kharzul kharzul2 arena glut vulkan [--roh <ordner>] # MP3 + klang-dateien.js
(oder beides: python3 tools/klang-erzeugen.py roh turm … – Einträge mit „synth“ in tools/klang-liste.json rufen dieses
Skript statt ElevenLabs). Rohordner wie bei klang-erzeugen.py (Standard ~/.cache/seelenstein-klang-roh), nicht im Repo.

Braucht: python3 mit numpy und scipy. Rechenzeit je Stück etwa zwei bis vier Minuten.
"""
import os
import sys
import wave

import numpy as np
import scipy.signal as sg

SR = 44100
TAU = 2 * np.pi


def mton(n):
    return 440.0 * 2.0 ** ((n - 69) / 12.0)


# --- Filter -----------------------------------------------------------------------------------------------------------
def _sos(art, f, o=2):
    ny = SR / 2
    if art == 'bp':
        return sg.butter(o, [max(15.0, f[0]), min(f[1], ny * 0.95)], 'bandpass', fs=SR, output='sos')
    return sg.butter(o, min(f, ny * 0.95), 'lowpass' if art == 'lp' else 'highpass', fs=SR, output='sos')


def tp(x, f, o=2):
    return sg.sosfilt(_sos('lp', f, o), x, axis=0)


def hp(x, f, o=2):
    return sg.sosfilt(_sos('hp', f, o), x, axis=0)


def bp(x, lo, hi, o=2):
    return sg.sosfilt(_sos('bp', (lo, hi), o), x, axis=0)


def eq_spitze(f0, db, q):
    """Glockenfilter (RBJ) als sos-Zeile."""
    A = 10 ** (db / 40)
    w = TAU * f0 / SR
    al = np.sin(w) / (2 * q)
    b = np.array([1 + al * A, -2 * np.cos(w), 1 - al * A])
    a = np.array([1 + al / A, -2 * np.cos(w), 1 - al / A])
    return np.concatenate([b / a[0], a / a[0]])[None, :]


def eq_kuhle(f0, db, hoch=False, S=0.8):
    """Kuhlenfilter (RBJ, Shelving) als sos-Zeile: tief (unter f0) bzw. hoch (über f0) um db anheben/absenken."""
    A = 10 ** (db / 40)
    w = TAU * f0 / SR
    cs, sn = np.cos(w), np.sin(w)
    al = sn / 2 * np.sqrt((A + 1 / A) * (1 / S - 1) + 2)
    q = 2 * np.sqrt(A) * al
    if hoch:
        b = [A * ((A + 1) + (A - 1) * cs + q), -2 * A * ((A - 1) + (A + 1) * cs), A * ((A + 1) + (A - 1) * cs - q)]
        a = [(A + 1) - (A - 1) * cs + q, 2 * ((A - 1) - (A + 1) * cs), (A + 1) - (A - 1) * cs - q]
    else:
        b = [A * ((A + 1) - (A - 1) * cs + q), 2 * A * ((A - 1) - (A + 1) * cs), A * ((A + 1) - (A - 1) * cs - q)]
        a = [(A + 1) + (A - 1) * cs + q, -2 * ((A - 1) + (A + 1) * cs), (A + 1) + (A - 1) * cs - q]
    b, a = np.array(b), np.array(a)
    return np.concatenate([b / a[0], a / a[0]])[None, :]


def kette(*teile):
    return np.vstack([t for t in teile])


def kreis(x, sos, vor=SR):
    """Filter auf eine Schleife, eingeschwungen: das Ende der Schleife läuft vorher einmal durch."""
    y = sg.sosfilt(sos, np.concatenate([x[-vor:], x]), axis=0)
    return y[vor:]


# --- Schwingungen -----------------------------------------------------------------------------------------------------
_TAB = {}
_NH = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128, 160, 200, 256]


def tabelle(art, nh, p):
    """Bandbegrenzte Wellenform (eine Periode, 4096 Punkte): Sägezahn bzw. Rechteck, Obertöne fallen mit 1/k^p."""
    k = (art, nh, p)
    if k not in _TAB:
        N = 4096
        x = np.arange(N) / N
        h = np.arange(1, nh + 1)
        a = 1.0 / h ** p
        if art == 'recht':
            a = np.where(h % 2 == 1, a, 0.0)
        w = (a[:, None] * np.sin(TAU * h[:, None] * x[None, :])).sum(0)
        w /= np.abs(w).max()
        _TAB[k] = np.append(w, w[0])
    return _TAB[k]


def osz(f, n, art='saege', p=1.0, ph0=0.0, oben=12500.0):
    """Wellenform mit Frequenzverlauf f (Hz, Zahl oder Feld), ohne Spiegelfrequenzen (Obertöne bis „oben“)."""
    f = np.full(n, float(f)) if np.isscalar(f) else np.asarray(f, np.float64)[:n]
    nh = max(v for v in _NH if v <= max(1, int(oben / max(20.0, float(f.max())))))
    T = tabelle(art, nh, p)
    ph = (ph0 + np.cumsum(f) / SR) % 1.0
    idx = ph * 4096
    i = idx.astype(np.int64)
    fr = idx - i
    return T[i] * (1 - fr) + T[i + 1] * fr


def sinus(f, n, ph0=0.0):
    f = np.full(n, float(f)) if np.isscalar(f) else np.asarray(f, np.float64)[:n]
    return np.sin(TAU * (ph0 + np.cumsum(f) / SR))


def huell(dauer, a=0.005, d=0.1, s=0.7, r=0.1):
    """Hüllkurve: Anstieg a (weich), Abfall d auf s, gehalten bis „dauer“, dann in r ausklingen."""
    n1 = max(2, int(dauer * SR))
    n = n1 + max(2, int(r * SR))
    t = np.arange(n) / SR
    an = np.sin(np.minimum(t / max(a, 1e-4), 1.0) * np.pi / 2) ** 2
    e = an * (s + (1 - s) * np.exp(-np.maximum(0, t - a) / max(d, 1e-4)))
    v = e[n1 - 1]
    u = (np.arange(n - n1) + 1) / (n - n1)
    e[n1:] = v * (1 - u) ** 2
    return e


def stereo(sig, pan):
    a = (pan + 1) * np.pi / 4
    return np.stack([sig * np.cos(a), sig * np.sin(a)], 1) * np.sqrt(2)


def sanft(x, k=0.7):
    """weiche Sättigung oberhalb k (darunter linear)."""
    a = np.abs(x)
    return np.where(a < k, x, np.sign(x) * (k + (1 - k) * np.tanh((a - k) / (1 - k))))


# --- Mischpult: Spuren als Schleife -------------------------------------------------------------------------------------
class Mischer:
    """Spuren (Stereo, Länge der Schleife). Alles, was über das Ende hinausklingt, läuft vorn weiter."""

    def __init__(self, n):
        self.n = n
        self.bus = {}

    def __call__(self, name, t, sig, pan=0.0, g=1.0):
        if g == 0 or sig is None:
            return
        if name not in self.bus:
            self.bus[name] = np.zeros((self.n, 2), np.float32)
        B = self.bus[name]
        s = stereo(sig, pan) * g if sig.ndim == 1 else sig * g
        i = int(round(t * SR)) % self.n
        o = 0
        while o < len(s):
            k = min(len(s) - o, self.n - i)
            B[i:i + k] += s[o:o + k]
            o += k
            i = 0


def hall_ir(rng, rt, laenge, vor=0.02, frueh=0.25):
    """Raumantwort (Stereo): Rauschen, je Band eigene Nachhallzeit (rt: <250, 250–1500, 1500–5000, >5000 Hz, s),
    weicher Einsatz, frühe Reflexionen, Vorverzögerung. Energie je Kanal 1."""
    n = int(laenge * SR)
    t = np.arange(n) / SR
    ir = np.zeros((n, 2))
    baender = [('lp', 250, 4), ('bp', (250, 1500), 2), ('bp', (1500, 5000), 2), ('hp', 5000, 4)]
    for ch in range(2):
        nz = rng.standard_normal(n)
        y = np.zeros(n)
        for (art, f, o), T60 in zip(baender, rt):
            y += sg.sosfilt(_sos(art, f, o), nz) * 10 ** (-3 * t / T60)
        y *= 1 - np.exp(-t / 0.018)
        e = np.sqrt((y ** 2).sum())
        for _ in range(8):
            d = int(rng.uniform(0.005, 0.065) * SR)
            y[d] += e * np.sqrt(frueh / 8) * rng.uniform(0.5, 1.0) * rng.choice([-1, 1])
        ir[:, ch] = y
    pre = int(vor * SR)
    ir = np.concatenate([np.zeros((pre, 2)), ir])[:n]
    return ir / np.sqrt((ir ** 2).sum(0, keepdims=True))


def kreis_falt(x, ir):
    """Faltung als Schleife (der Hall des Endes klingt in den Anfang)."""
    L = len(x)
    out = np.zeros((L, 2))
    for ch in range(2):
        z = sg.fftconvolve(x[:, ch].astype(np.float64), ir[:, ch])
        out[:, ch] = z[:L]
        o = L
        while o < len(z):
            k = min(L, len(z) - o)
            out[:k, ch] += z[o:o + k]
            o += k
    return out


def verdichter(x, schwelle=-20.0, ratio=2.0, an=0.01, ab=0.25, blk=128):
    """Sanfter Verdichter (Pegel je 3 ms, Anstieg/Rückkehr), als Schleife eingeschwungen."""
    n = len(x)
    nb = n // blk
    p = (x[:nb * blk].astype(np.float64) ** 2).mean(1).reshape(nb, blk).mean(1)
    lev = 10 * np.log10(p + 1e-12)
    gr = np.maximum(0, lev - schwelle) * (1 - 1 / ratio)
    ka = np.exp(-blk / (an * SR))
    kr = np.exp(-blk / (ab * SR))
    g = np.zeros(nb)
    v = 0.0
    for _ in range(2):
        for i in range(nb):
            z = gr[i]
            v = z + (v - z) * (ka if z > v else kr)
            g[i] = v
    gs = np.interp(np.arange(n), (np.arange(nb) + 0.5) * blk, 10 ** (-g / 20), period=n)
    return x * gs[:, None]


def lufs(x):
    """Integrierte Lautheit (ITU-R BS.1770, wie tools/klang-erzeugen.py)."""
    import math
    f0, G, Q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
    K = math.tan(math.pi * f0 / SR)
    Vh = 10 ** (G / 20)
    Vb = Vh ** 0.4996667741545416
    a0 = 1 + K / Q + K * K
    b = [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0]
    a = [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
    y = sg.lfilter(b, a, x, axis=0)
    f0, Q = 38.13547087602444, 0.5003270373238773
    K = math.tan(math.pi * f0 / SR)
    a = [1, 2 * (K * K - 1) / (1 + K / Q + K * K), (1 - K / Q + K * K) / (1 + K / Q + K * K)]
    y = sg.lfilter([1, -2, 1], a, y, axis=0)
    p = (y ** 2).sum(axis=1)
    n, s = int(0.4 * SR), int(0.1 * SR)
    cs = np.concatenate([[0], np.cumsum(p)])
    st = np.arange(0, len(p) - n + 1, s)
    L = -0.691 + 10 * np.log10(np.maximum(1e-12, (cs[st + n] - cs[st]) / n))
    L = L[L > -70]
    if not len(L):
        return -70.0
    rel = -0.691 + 10 * np.log10(np.mean(10 ** ((L + 0.691) / 10))) - 10
    L = L[L > rel]
    return float(-0.691 + 10 * np.log10(np.mean(10 ** ((L + 0.691) / 10))))


# --- Instrumente --------------------------------------------------------------------------------------------------------
TROMMELN = {
    # große Trommel (Ō-daiko): tief, langer Ausklang
    'odaiko': dict(f0=47, abkl=0.85, biege=0.55, biege_t=0.025, fell=0.35, band=(70, 900), fell_t=0.05, klick=0.04, dauer=2.2, sat=1.6),
    # mittlere Fasstrommel: Kern des Rhythmus
    'taiko': dict(f0=86, abkl=0.42, biege=0.75, biege_t=0.016, fell=0.6, band=(140, 1700), fell_t=0.03, klick=0.12, dauer=1.3, sat=1.8),
    # kleine, hart gespannte Trommel (hell, kurz)
    'shime': dict(f0=360, abkl=0.075, biege=0.12, biege_t=0.01, fell=0.9, band=(900, 6500), fell_t=0.014, klick=0.45, dauer=0.35, sat=1.3,
                  moden=((1.52, 0.45, 0.6), (2.27, 0.3, 0.4))),
    'tom_h': dict(f0=172, abkl=0.22, biege=0.5, biege_t=0.015, fell=0.55, band=(250, 3500), fell_t=0.02, klick=0.15, dauer=0.8, sat=1.6),
    'tom_m': dict(f0=128, abkl=0.27, biege=0.5, biege_t=0.016, fell=0.55, band=(200, 3000), fell_t=0.022, klick=0.15, dauer=0.9, sat=1.6),
    'tom_t': dict(f0=92, abkl=0.33, biege=0.5, biege_t=0.018, fell=0.5, band=(160, 2500), fell_t=0.025, klick=0.12, dauer=1.0, sat=1.6),
    # Bassdrum (Arena): kurzer, tiefer Schlag mit Klick
    'kick': dict(f0=55, abkl=0.3, biege=2.4, biege_t=0.03, fell=0.25, band=(60, 1200), fell_t=0.012, klick=0.5, dauer=0.7, sat=2.4,
                 moden=((1.5, 0.08, 0.3),)),
}


class Klang:
    """Alle Instrumente eines Stücks (gemeinsamer Zufall, Zwischenspeicher für oft gebrauchte Töne)."""

    def __init__(self, seed):
        self.rng = np.random.default_rng(seed)
        self.cache = {}

    def r(self, a=0.0, b=1.0):
        return float(self.rng.uniform(a, b))

    def _var(self, key, n, fn):
        vs = self.cache.get(key)
        if vs is None:
            vs = [fn() for _ in range(n)]
            self.cache[key] = vs
        return vs[int(self.rng.integers(len(vs)))]

    # Trommeln: Membran mit Tonhöhenabfall, Nebenmoden, Fellschlag (Rauschen), Klick, Sättigung
    def trommel(self, art, vel=1.0, tune=1.0):
        return self._var(('tr', art, tune), 5, lambda: self._trommel(TROMMELN[art], tune)) * vel

    def _trommel(self, P, tune):
        rng = self.rng
        n = int(P.get('dauer', 1.2) * SR)
        t = np.arange(n) / SR
        f0 = P['f0'] * tune * (1 + rng.normal(0, 0.012))
        f = f0 * (1 + P.get('biege', 0.5) * np.exp(-t / P.get('biege_t', 0.02)))
        f = f * (1 - 0.06 * (1 - np.exp(-t / 0.35)))
        ph = TAU * np.cumsum(f) / SR
        ab = P.get('abkl', 0.45)
        y = np.sin(ph) * np.exp(-t / ab)
        for rr, a, k in P.get('moden', ((1.59, 0.3, 0.35), (2.14, 0.15, 0.22), (2.65, 0.08, 0.15))):
            y += a * np.sin(rr * ph + rng.uniform(0, TAU)) * np.exp(-t / (ab * k))
        if P.get('fell'):
            nz = bp(rng.standard_normal(n), *P.get('band', (120, 1400)))
            nz /= np.sqrt((nz[:int(0.05 * SR)] ** 2).mean()) + 1e-9
            y += P['fell'] * 0.35 * nz * np.exp(-t / P.get('fell_t', 0.03))
        if P.get('klick'):
            y += P['klick'] * 0.5 * hp(rng.standard_normal(n), 2500) * np.exp(-t / 0.0025)
        a = int(0.0012 * SR)
        y[:a] *= np.linspace(0, 1, a)
        s = P.get('sat', 1.5)
        y = np.tanh(s * y / np.abs(y).max()) / np.tanh(s)
        return y.astype(np.float32)

    # kleine Trommel (Marsch bzw. Arena): Fellton und Schnarrsaiten
    def snare(self, vel=1.0, art='marsch'):
        return self._var(('sn', art), 6, lambda: self._snare(art)) * vel

    def _snare(self, art):
        rng = self.rng
        n = int(0.6 * SR)
        t = np.arange(n) / SR
        f = (185 if art == 'marsch' else 175) * (1 + 0.25 * np.exp(-t / 0.01))
        ton = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.05) + 0.5 * np.sin(TAU * np.cumsum(f * 1.63) / SR) * np.exp(-t / 0.03)
        nz = bp(rng.standard_normal(n), 1300, 9500)
        nz /= np.abs(nz).max()
        schnarr = nz * np.exp(-t / (0.13 if art == 'marsch' else 0.19))
        stock = hp(rng.standard_normal(n), 4000) * np.exp(-t / 0.004)
        y = 0.55 * ton + 0.8 * schnarr + 0.12 * stock
        a = int(0.001 * SR)
        y[:a] *= np.linspace(0, 1, a)
        y = np.tanh(1.6 * y / np.abs(y).max()) / np.tanh(1.6)
        return y.astype(np.float32)

    # Händeklatschen (vier kurze Stöße, dann Ausklang)
    def klatsch(self, vel=1.0):
        return self._var(('kl',), 6, self._klatsch) * vel

    def _klatsch(self):
        rng = self.rng
        n = int(0.35 * SR)
        t = np.arange(n) / SR
        nz = bp(rng.standard_normal(n), 850, 3200)
        e = np.zeros(n)
        for o in (0, 0.0085 + rng.uniform(-0.001, 0.001), 0.018 + rng.uniform(-0.002, 0.002), 0.027):
            m = t >= o
            e[m] += np.exp(-(t[m] - o) / 0.0055)
        m = t >= 0.027
        e[m] += 0.45 * np.exp(-(t[m] - 0.027) / 0.085)
        y = nz * e
        return (y / np.abs(y).max()).astype(np.float32)

    # Becken zu/offen: sechs Rechtecke (metallisch) und Rauschen, hoch gefiltert
    def hihat(self, vel=1.0, offen=False):
        return self._var(('hh', offen), 6, lambda: self._hihat(offen)) * vel

    def _hihat(self, offen):
        rng = self.rng
        n = int((0.5 if offen else 0.12) * SR)
        t = np.arange(n) / SR
        y = np.zeros(n)
        for fr in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0):
            y += np.sign(np.sin(TAU * fr * 1.7 * t + rng.uniform(0, TAU)))
        y = 0.6 * y / 6 + 0.5 * rng.standard_normal(n)
        y = bp(y, 6500, 15000)
        y *= np.exp(-t / (0.16 if offen else 0.028))
        a = int(0.0008 * SR)
        y[:a] *= np.linspace(0, 1, a)
        return (y / np.abs(y).max()).astype(np.float32)

    def schuettel(self, vel=1.0):
        return self._var(('sh',), 6, self._schuettel) * vel

    def _schuettel(self):
        n = int(0.12 * SR)
        t = np.arange(n) / SR
        y = bp(self.rng.standard_normal(n), 4500, 12000) * np.minimum(1, t / 0.012) * np.exp(-np.maximum(0, t - 0.012) / 0.03)
        return (y / np.abs(y).max()).astype(np.float32)

    # Becken (Crash): Rauschen und viele hohe Teiltöne, lang
    def crash(self, vel=1.0, dauer=3.2):
        return self._var(('cr', dauer), 3, lambda: self._crash(dauer)) * vel

    def _crash(self, dauer):
        rng = self.rng
        n = int(dauer * SR)
        t = np.arange(n) / SR
        y = hp(rng.standard_normal(n), 2800) * 0.7
        for _ in range(40):
            y += 0.05 * np.sin(TAU * rng.uniform(2500, 11000) * t + rng.uniform(0, TAU)) * np.exp(-t / rng.uniform(0.4, 1.4))
        y += 0.5 * bp(rng.standard_normal(n), 450, 2400) * np.exp(-t / 0.25)
        y *= np.exp(-t / 1.1) * np.minimum(1, t / 0.002)
        return (y / np.abs(y).max()).astype(np.float32)

    # Amboss / Eisen: unharmonische Teiltöne
    def amboss(self, vel=1.0, f=780.0):
        return self._var(('am', f), 4, lambda: self._amboss(f)) * vel

    def _amboss(self, f):
        rng = self.rng
        n = int(1.6 * SR)
        t = np.arange(n) / SR
        y = np.zeros(n)
        for rr, a, d in ((1, 1, 0.8), (2.76, 0.6, 0.45), (5.40, 0.45, 0.28), (8.93, 0.3, 0.16), (13.34, 0.2, 0.09)):
            ff = f * rr * (1 + rng.normal(0, 0.004))
            y += a * np.sin(TAU * ff * t + rng.uniform(0, TAU)) * np.exp(-t / d)
        y += 0.6 * hp(rng.standard_normal(n), 3000) * np.exp(-t / 0.003)
        y *= np.minimum(1, t / 0.0005)
        return (y / np.abs(y).max()).astype(np.float32)

    # Totenglocke: Teiltöne einer großen Glocke (Summton, Prim, kleine Terz, Quinte, Nominal …), schwebend
    def glocke(self, nominal=262.0, vel=1.0):
        return self._var(('gl', nominal), 2, lambda: self._glocke(nominal)) * vel

    def _glocke(self, nom):
        rng = self.rng
        n = int(7.0 * SR)
        t = np.arange(n) / SR
        y = np.zeros(n)
        for rr, a, d in ((0.25, 0.55, 6.5), (0.5, 0.8, 4.5), (0.6, 0.6, 3.6), (0.75, 0.3, 2.8), (1.0, 1.0, 3.0),
                         (1.25, 0.25, 1.8), (1.5, 0.3, 1.5), (2.0, 0.22, 1.1), (2.61, 0.12, 0.7), (3.3, 0.06, 0.45)):
            for det in (-0.0012, 0.0012):
                y += 0.5 * a * np.sin(TAU * nom * rr * (1 + det) * t + rng.uniform(0, TAU)) * np.exp(-t / d)
        y += 0.25 * bp(rng.standard_normal(n), 900, 6000) * np.exp(-t / 0.012)
        y *= np.minimum(1, t / 0.002)
        return (y / np.abs(y).max()).astype(np.float32)

    # Ketten: Gerassel aus vielen kleinen Metallklicks
    def ketten(self, dauer=1.2, vel=1.0):
        rng = self.rng
        n = int((dauer + 0.4) * SR)
        y = np.zeros(n)
        k = int(dauer * 38)
        for _ in range(k):
            i = int(rng.uniform(0, dauer) * SR)
            m = int(0.06 * SR)
            tt = np.arange(m) / SR
            f = rng.uniform(1800, 7000)
            s = (np.sin(TAU * f * tt) + 0.5 * np.sin(TAU * f * 2.3 * tt)) * np.exp(-tt / rng.uniform(0.008, 0.025))
            s += 0.4 * rng.standard_normal(m) * np.exp(-tt / 0.002)
            y[i:i + m] += s[:max(0, min(m, n - i))] * rng.uniform(0.2, 1.0)
        env = np.sin(np.linspace(0, np.pi, n)) ** 0.6
        y = hp(y * env, 1200)
        return y / (np.abs(y).max() + 1e-9) * vel

    # tiefer Einschlag (fallender Sinus) für große Einsätze
    def einschlag(self, vel=1.0, f0=62.0, f1=27.0, dauer=2.0):
        n = int(dauer * SR)
        t = np.arange(n) / SR
        f = f1 + (f0 - f1) * np.exp(-t / 0.3)
        y = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t / 0.75) * np.minimum(1, t / 0.003)
        return np.tanh(1.5 * y) / np.tanh(1.5) * vel

    # anschwellendes Rauschen (Steigerung in den nächsten Teil), endet hart auf dem Ziel
    def anstieg(self, dauer, vel=1.0, ton=None):
        rng = self.rng
        n = int(dauer * SR)
        u = np.arange(n) / n
        nz = rng.standard_normal(n)
        y = np.zeros(n)
        for k, (lo, hi) in enumerate(((250, 1100), (900, 3200), (2600, 7500), (6000, 14000))):
            w = np.clip(1 - np.abs(u * 3 - k), 0, 1) if k < 3 else np.clip(u * 3 - 2, 0, 1)
            y += bp(nz, lo, hi) * (w + 0.15)
        y *= u ** 2.4
        if ton:
            f = ton * 2 ** (u * 1.0)
            y += 0.25 * osz(f, n, 'saege', 1.4) * u ** 3
        f = int(0.006 * SR)
        y[-f:] *= np.linspace(1, 0, f)
        return y / (np.abs(y).max() + 1e-9) * vel

    def rueckwaerts_becken(self, dauer, vel=1.0):
        c = self._crash(max(3.2, dauer + 0.2))
        y = c[:int(dauer * SR)][::-1].astype(np.float64)
        y *= np.linspace(0, 1, len(y)) ** 1.5
        f = int(0.004 * SR)
        y[-f:] *= np.linspace(1, 0, f)
        return y * vel

    # Streicher: mehrere leicht verstimmte Stimmen (Sägezahn), Bogengeräusch; kurz (spiccato) oder lang (Vibrato)
    def streich(self, midi, dauer, vel=1.0, stimmen=3, cent=8.0, a=0.012, d=0.09, s=0.55, r=0.07, p=1.15, vib=0.0, trem=0.0, bpm=120, cache=True):
        key = ('st', midi, round(dauer, 3), stimmen, cent, a, d, s, r, p, vib, trem)
        if cache:
            return self._var(key, 3, lambda: self._streich(midi, dauer, stimmen, cent, a, d, s, r, p, vib, trem, bpm)) * vel
        return self._streich(midi, dauer, stimmen, cent, a, d, s, r, p, vib, trem, bpm) * vel

    def _streich(self, midi, dauer, stimmen, cent, a, d, s, r, p, vib, trem, bpm):
        rng = self.rng
        f = mton(midi)
        e = huell(dauer, a, d, s, r)
        n = len(e) + int(0.008 * SR)
        out = np.zeros(n)
        for i in range(stimmen):
            c = ((i - (stimmen - 1) / 2) / max(1, (stimmen - 1) / 2)) * cent + rng.normal(0, 1.5)
            off = int(rng.uniform(0, 0.007) * SR)
            m = len(e)
            t = np.arange(m) / SR
            v = vib * np.sin(TAU * rng.uniform(5.0, 6.2) * t + rng.uniform(0, TAU)) * np.minimum(1, t / 0.35)
            y = osz(f * 2 ** ((c + v) / 1200), m, 'saege', p, rng.random())
            out[off:off + m] += y * e
        t = np.arange(n) / SR
        if trem:
            # Tremolo in Sechzehnteln (Bogenwechsel)
            q = bpm / 60 * 4
            out *= 0.5 + 0.5 * (0.5 + 0.5 * np.cos(TAU * q * t + rng.uniform(-0.3, 0.3))) ** 2.5
        out += 0.06 * bp(rng.standard_normal(n), 2200, 7000) * np.exp(-t / 0.025) * stimmen
        return (out / stimmen ** 0.5).astype(np.float32)

    # Blech: dunkle und helle Wellenform werden mit der Lautstärke überblendet (Horn/Posaune/Tuba), Einsatz von unten
    def blech(self, midi, dauer, vel=1.0, stimmen=2, cent=6.0, a=0.05, stoss=False, hell=0.85, r=0.14, p_dunkel=2.4, p_hell=1.05):
        rng = self.rng
        f = mton(midi)
        e = huell(dauer, 0.012 if stoss else a, 0.18 if stoss else 0.5, 0.55 if stoss else 0.9, r)
        n = len(e)
        t = np.arange(n) / SR
        if stoss:
            b = np.minimum(1, t / 0.02) * (0.3 + 0.7 * np.exp(-t / 0.16))
        else:
            b = np.minimum(1, t / max(a, 0.02)) ** 1.5 * (0.8 + 0.2 * np.exp(-t / 0.5))
        b = np.clip(b * hell * (0.45 + 0.55 * vel), 0, 1)
        out = np.zeros(n)
        for i in range(stimmen):
            c = ((i - (stimmen - 1) / 2) / max(1, (stimmen - 1) / 2)) * cent + rng.normal(0, 1.5)
            c = c - 35 * np.exp(-t / 0.035) + 4 * np.sin(TAU * 4.8 * t + rng.uniform(0, TAU)) * np.minimum(1, t / 0.6)
            fv = f * 2 ** (c / 1200)
            ph = rng.random()
            dk = osz(fv, n, 'saege', p_dunkel, ph)
            br = osz(fv, n, 'saege', p_hell, ph)
            out += dk * (1 - b) + 0.75 * br * b
        out *= e
        out += 0.04 * bp(rng.standard_normal(n), 1500, 5000) * np.exp(-t / 0.03) * stimmen
        return out / stimmen ** 0.5 * vel

    # Chor (Quelle): fünf Stimmen je Ton mit eigenem Vibrato; die Vokalfilter wirken später auf die ganze Spur
    def chor(self, midi, dauer, vel=1.0, stimmen=5, a=0.4, r=0.7, cent=10.0):
        rng = self.rng
        f = mton(midi)
        e = huell(dauer, a, 0.6, 0.88, r)
        n = len(e)
        t = np.arange(n) / SR
        out = np.zeros(n)
        for i in range(stimmen):
            c = ((i - (stimmen - 1) / 2) / max(1, (stimmen - 1) / 2)) * cent + rng.normal(0, 2)
            vib = 16 * np.sin(TAU * rng.uniform(4.6, 5.8) * t + rng.uniform(0, TAU)) * np.minimum(1, t / 0.5)
            drift = 5 * np.sin(TAU * rng.uniform(0.15, 0.4) * t + rng.uniform(0, TAU))
            out += osz(f * 2 ** ((c + vib + drift) / 1200), n, 'saege', 1.3, rng.random(), oben=9000)
        out += 0.5 * hp(rng.standard_normal(n), 1800)  # Atem
        return out * e / stimmen ** 0.5 * vel

    # Zupfinstrument (Koto/Guzheng): Karplus-Strong mit Bruchteil-Verzögerung (genau gestimmt)
    def zupf(self, midi, vel=1.0, nachhall=1.6, hell=0.55):
        key = ('zu', midi, nachhall, hell)
        return self._var(key, 3, lambda: self._zupf(midi, nachhall, hell)) * vel

    def _zupf(self, midi, T60, hell):
        rng = self.rng
        f = mton(midi)
        D = SR / f
        Di = int(np.floor(D - 0.5))
        mu = D - 0.5 - Di
        g = 10 ** (-3 / (f * T60))
        a = np.zeros(Di + 3)
        a[0] = 1
        a[Di] -= g * 0.5 * (1 - mu)
        a[Di + 1] -= g * 0.5
        a[Di + 2] -= g * 0.5 * mu
        n = int((T60 * 0.9 + 0.1) * SR)
        x = np.zeros(n)
        burst = rng.standard_normal(Di + 2)
        burst = sg.lfilter([hell], [1, -(1 - hell)], burst)
        k = max(1, int(0.14 * Di))
        burst[k:] -= 0.8 * burst[:-k]
        x[:len(burst)] = burst
        y = sg.lfilter([1.0], a, x)
        y = y - sg.lfilter([1], [1, -0.995], y) * 0.005
        y *= np.minimum(1, np.arange(n) / (0.0006 * SR))
        fo = int(0.15 * SR)
        y[-fo:] *= np.linspace(1, 0, fo)
        return (y / (np.abs(y).max() + 1e-9)).astype(np.float32)

    # Bass (Arena): Sinus darunter und Sägezahn mit Filterhüllkurve, etwas angezerrt
    def bass(self, midi, dauer, vel=1.0, hell=0.6):
        rng = self.rng
        f = mton(midi)
        e = huell(dauer, 0.004, 0.25, 0.75, 0.05)
        n = len(e)
        t = np.arange(n) / SR
        b = np.clip(hell * (0.25 + 0.75 * np.exp(-t / 0.09)) * (0.6 + 0.4 * vel), 0, 1)
        ph = rng.random()
        saw = osz(f, n, 'saege', 2.2, ph) * (1 - b) + 0.8 * osz(f, n, 'saege', 1.0, ph) * b
        y = 0.6 * sinus(f, n, ph) + 0.7 * saw + 0.1 * sinus(f / 2, n)
        y *= e
        return np.tanh(1.8 * y) / np.tanh(1.8) * vel

    # gestrichene Melodie (Erhu): durchgehende Linie mit Gleiten zwischen den Tönen, Vibrato, Korpusresonanzen
    def erhu(self, noten, beat, vel=1.0, glide=0.055, vib=22.0):
        return self._linie(noten, beat, vel, glide, vib, 'erhu')

    # Bambusflöte (Dizi): Grundton, wenige Obertöne, Atem
    def dizi(self, noten, beat, vel=1.0, vib=12.0):
        return self._linie(noten, beat, vel, 0.025, vib, 'dizi')

    def _linie(self, noten, beat, vel, glide, vibt, art):
        rng = self.rng
        ende = max(s + d for s, d, m in noten) * beat + 0.4
        n = int(ende * SR)
        f = np.zeros(n)
        amp = np.zeros(n)
        vibe = np.zeros(n)
        noten = sorted(noten)
        prev_f, prev_end = None, -9
        for k, (s, d, m) in enumerate(noten):
            i0 = int(s * beat * SR)
            i1 = min(n, int((s + d) * beat * SR))
            ft = mton(m)
            tt = np.arange(i1 - i0) / SR
            legato = prev_f is not None and i0 - prev_end < 0.08 * SR
            f[i0:i1] = ft * (prev_f / ft) ** np.exp(-tt / glide) if legato else ft
            dd = (i1 - i0) / SR
            # gebunden zum nächsten Ton: nur kurzer Bogen-/Atemwechsel, sonst ganz ausklingen
            weiter = k + 1 < len(noten) and noten[k + 1][0] * beat * SR - i1 < 0.08 * SR
            boden = 0.6 if weiter else 0.0
            rel = min(0.07 if weiter else 0.12, dd * 0.35)
            e = np.minimum(1, tt / (0.025 if legato else (0.05 if art == 'erhu' else 0.035)))
            e *= 0.9 + 0.1 * np.sin(np.pi * np.minimum(1, tt / max(dd, 1e-3)))  # leichtes Anschwellen
            e *= boden + (1 - boden) * np.clip((dd - tt) / rel, 0, 1) ** 0.7
            amp[i0:i1] = np.maximum(amp[i0:i1], e)
            vibe[i0:i1] = np.minimum(1, np.maximum(0, tt - 0.12) / 0.25)
            prev_f, prev_end = ft, i1
        # Lücken: Tonhöhe des letzten Tons halten
        idx = np.maximum.accumulate(np.where(f > 0, np.arange(n), 0))
        f = f[idx]
        f[f == 0] = mton(noten[0][2])
        t = np.arange(n) / SR
        vib = vibt * vibe * np.sin(TAU * (6.0 if art == 'erhu' else 5.3) * t + rng.uniform(0, TAU))
        fv = f * 2 ** ((vib + 3 * np.sin(TAU * 0.7 * t)) / 1200)
        amp = sg.lfilter([0.02], [1, -0.98], amp)  # Bogen/Atem: weiche Übergänge (≈ 1 ms)
        if art == 'erhu':
            src = osz(fv, n, 'saege', 1.0, rng.random(), oben=9000)
            y = 0.15 * src
            for lo, hi, g in ((620, 980, 1.0), (1300, 1750, 0.65), (2600, 3300, 0.3)):
                y += g * bp(src, lo, hi)
            y = tp(y, 4200)
            y += 0.03 * bp(rng.standard_normal(n), 2000, 6000) * amp
        else:
            ph = TAU * np.cumsum(fv) / SR
            y = np.sin(ph) + 0.32 * np.sin(2 * ph + 0.4) + 0.1 * np.sin(3 * ph + 1.1)
            atem = bp(rng.standard_normal(n), 1800, 5200)
            y += 0.16 * atem / (np.abs(atem).max() + 1e-9) * 3
        return y * amp * vel

    # Gong (Tamtam, Feuerberg): tiefe Grundschwingungen, die nach dem Schlag leicht absinken, darüber viele unharmonische
    # Teiltöne, die umso später aufblühen, je höher sie liegen (das typische Anschwellen nach dem Schlag), Filzschlägel
    def gong(self, vel=1.0, f0=68.0, dauer=7.0):
        return self._var(('go', f0, dauer), 2, lambda: self._gong(f0, dauer)) * vel

    def _gong(self, f0, dauer):
        rng = self.rng
        n = int(dauer * SR)
        t = np.arange(n) / SR
        y = np.zeros(n)
        for rr, a, d in ((1.0, 1.0, 3.4), (1.47, 0.6, 2.7), (2.09, 0.45, 2.2), (2.76, 0.3, 1.7), (3.51, 0.2, 1.3)):
            ff = f0 * rr * (1 + rng.normal(0, 0.003)) * (1 + 0.015 * np.exp(-t / 0.35))
            y += a * np.sin(TAU * np.cumsum(ff) / SR + rng.uniform(0, TAU)) * np.exp(-t / d)
        lo, hi = np.log(260.0), np.log(6500.0)
        for _ in range(80):
            ff = float(np.exp(rng.uniform(lo, hi)))
            k = (np.log(ff) - lo) / (hi - lo)
            an = 0.04 + 1.1 * k * rng.uniform(0.6, 1.3)
            d = rng.uniform(1.2, 3.2) * (1.25 - 0.7 * k)
            e = (1 - np.exp(-t / (an / 3))) * np.exp(-np.maximum(0, t - an) / d)
            y += 0.07 * (1 - 0.55 * k) * np.sin(TAU * ff * t + rng.uniform(0, TAU)) * e
        y += 0.45 * bp(rng.standard_normal(n), 50, 500) * np.exp(-t / 0.035)
        y *= np.minimum(1, t / 0.004)
        fo = int(0.6 * SR)
        y[-fo:] *= np.linspace(1, 0, fo) ** 2
        return (y / (np.abs(y).max() + 1e-9)).astype(np.float32)

    # Grollen des Bergs: tiefes, langsam wogendes Rauschen mit einem unruhigen Unterton (Erde und Lava in der Tiefe)
    def grollen(self, dauer, vel=1.0, hell=150.0):
        rng = self.rng
        n = int(dauer * SR)
        t = np.arange(n) / SR
        y = hp(tp(rng.standard_normal(n), hell, 4), 30, 2)
        y /= np.sqrt((y ** 2).mean()) + 1e-9
        w = np.ones(n)
        for _ in range(3):
            w *= 0.72 + 0.28 * np.sin(TAU * rng.uniform(0.08, 0.6) * t + rng.uniform(0, TAU))
        f = rng.uniform(40, 50) * (1 + 0.05 * np.sin(TAU * rng.uniform(0.05, 0.15) * t + rng.uniform(0, TAU)))
        y = 0.85 * y * w + 0.5 * np.sin(TAU * np.cumsum(f) / SR) * w ** 2
        rand = min(1.5, dauer / 3)
        y *= np.minimum(1, t / rand) * np.minimum(1, (dauer - t) / rand)
        return y * vel

    # Holzblock (Tempelblock): zwei kurze Resonanzen und ein Klick
    def holz(self, vel=1.0, f=820.0):
        return self._var(('ho', f), 4, lambda: self._holz(f)) * vel

    def _holz(self, f):
        rng = self.rng
        n = int(0.22 * SR)
        t = np.arange(n) / SR
        ff = f * (1 + rng.normal(0, 0.008))
        y = np.sin(TAU * ff * t) * np.exp(-t / 0.032) + 0.4 * np.sin(TAU * ff * 2.74 * t + rng.uniform(0, TAU)) * np.exp(-t / 0.014)
        y += 0.25 * bp(rng.standard_normal(n), 1500, 6500) * np.exp(-t / 0.0018)
        y *= np.minimum(1, t / 0.0005)
        return (y / (np.abs(y).max() + 1e-9)).astype(np.float32)


# --- Hilfen für die Komposition ---------------------------------------------------------------------------------------------
def lage(pcs, lo, hi):
    """alle Töne der Tonklassen pcs zwischen lo und hi (MIDI)."""
    return [m for m in range(lo, hi + 1) if m % 12 in pcs]


def voicing(pcs, lo, hi, n):
    """n Akkordtöne, gleichmäßig über lo…hi verteilt."""
    alle = lage(pcs, lo, hi)
    if len(alle) <= n:
        return alle
    idx = np.round(np.linspace(0, len(alle) - 1, n)).astype(int)
    return [alle[i] for i in idx]


def ausgabe(M, specs, ir_sets, master):
    """Spuren mischen: je Spur Filter (Klangregelung), Hallanteil, Lautstärke; Hall je Raum als Schleife gefaltet."""
    L = M.n
    trocken = np.zeros((L, 2))
    hallsum = {k: np.zeros((L, 2)) for k in ir_sets}
    pegel = {}
    for name, sp in specs.items():
        if name not in M.bus:
            continue
        x = M.bus[name].astype(np.float64)
        if sp.get('eq') is not None:
            x = kreis(x, sp['eq'])
        if sp.get('vokal'):
            x = vokal(x, sp['vokal'])
        x *= sp.get('g', 1.0)
        pegel[name] = round(lufs(x), 1)
        trocken += x
        for raum, menge in sp.get('hall', {}).items():
            hallsum[raum] += x * menge
    misch = trocken
    for raum, ir in ir_sets.items():
        if np.abs(hallsum[raum]).max() > 0:
            misch = misch + kreis_falt(hallsum[raum], ir)
    misch = kreis(misch, master['eq'] if master.get('eq') is not None else _sos('hp', 28, 2))
    misch *= 10 ** ((-16 - lufs(misch)) / 20)
    misch = verdichter(misch, master.get('schwelle', -14), master.get('ratio', 2.0), 0.012, 0.22)
    misch /= np.abs(misch).max() + 1e-9
    misch = sanft(misch * master.get('treiben', 1.25), 0.75)
    misch = misch / (np.abs(misch).max() + 1e-9) * 0.9
    return misch.astype(np.float32), pegel


VOKALE = {
    'a': [(700, 110, 0), (1150, 120, -5), (2650, 160, -15), (3450, 200, -24)],
    'o': [(450, 90, 0), (800, 110, -6), (2650, 160, -21), (3400, 200, -28)],
    'u': [(330, 80, 0), (720, 100, -11), (2500, 160, -26)],
}


def vokal(x, v):
    y = 0.06 * kreis(x, _sos('lp', 500, 2))
    for f, bw, db in VOKALE[v]:
        y += kreis(x, _sos('bp', (f - bw / 2, f + bw / 2), 2)) * 10 ** (db / 20) * 1.8
    return y


def schreibe_wav(pfad, a):
    os.makedirs(os.path.dirname(pfad), exist_ok=True)
    x = np.clip(a, -1, 1)
    pcm = (x * 8388607).astype(np.int32)
    b = np.zeros((len(pcm), 2, 3), np.uint8)
    for k in range(3):
        b[:, :, k] = (pcm >> (8 * k)) & 0xFF
    with wave.open(pfad, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(3)
        w.setframerate(SR)
        w.writeframes(b.tobytes())


def rohdatei(pfad, S, takt_s, vor=2, nach=2):
    """Vorspiel (letzte „vor“ Takte der Schleife) + Schleife + Nachlauf (erste „nach“ Takte); gibt [A, B] in s zurück."""
    L = len(S)
    nv = int(round(vor * takt_s * SR))
    nn = int(round(nach * takt_s * SR))
    roh = np.concatenate([S[L - nv:], S, S[:nn]])
    schreibe_wav(pfad, roh)
    return [round(nv / SR, 4), round((nv + L) / SR, 4)]


def mische(M, specs, raeume, master):
    """Spuren auf ihre Ziel-Lautheit („ziel“, LUFS solange sie spielen) bringen, dann ausgabe()."""
    for name, sp in specs.items():
        if name in M.bus and 'ziel' in sp:
            x = M.bus[name].astype(np.float64)
            if sp.get('eq') is not None:
                x = kreis(x, sp['eq'])
            if sp.get('vokal'):
                x = vokal(x, sp['vokal'])
            sp['g'] = 10 ** ((sp['ziel'] - lufs(x)) / 20)
    return ausgabe(M, specs, raeume, master)


# === Turm der Verdammten (turm): c-Moll mit übermäßiger Quarte (ungarisch Moll), 120 BPM, 56 Takte =====================
# Schwer und treibend: tiefe Streicher in Achteln mit Betonung 3+3+2, Fasstrommeln im selben Muster, eine große Trommel auf
# jeder Eins, Totenglocke, Männerchor auf „o“, Blech. Form in Achttakt-Teilen: A1 (Grund), A2 (Hornthema), B1/B2 (Chor
# „a“, Blechstöße, Geigenthema, Amboss), C (Orgelpunkt: Herzschlag, Cluster, Ketten), A3 (Thema in Horn und Posaune mit
# Chor), D (Steigerung auf der Dominante, Wirbel, Anstieg in den Anfang). Die letzten zwei Takte sind auch das Vorspiel.
TURM_AKK = {
    'Cm': (36, (0, 3, 7)), 'Ab': (44, (8, 0, 3)), 'Db': (37, (1, 5, 8)), 'G': (43, (7, 11, 2)), 'Fm': (41, (5, 8, 0)),
    'Bbm': (34, (10, 1, 5)), 'DbC': (36, (1, 5, 8)), 'Fsd': (42, (6, 9, 0, 3))
}
_TA = ['Cm', 'Cm', 'Ab', 'Ab', 'Db', 'Db', 'G', 'G']
_TB = ['Fm', 'Fm', 'Db', 'Db', 'Bbm', 'Bbm', 'G', 'G']
TURM_PLAN = [('A1', _TA), ('A2', _TA), ('B1', _TB), ('B2', _TB), ('C', ['Cm', 'DbC', 'Cm', 'DbC', 'Ab', 'Fm', 'G', 'G']), ('A3', _TA),
             ('D', ['Ab', 'Ab', 'Fsd', 'Fsd', 'G', 'G', 'G', 'G'])]
# Thema (Horn): [Beginn in Schlägen ab Teilbeginn, Dauer, MIDI]; Rhythmus 3+3+2 wie die Begleitung
TURM_THEMA = [(0, 1.5, 60), (1.5, 1.5, 63), (3, 1, 67), (4, 1.5, 66), (5.5, 1.5, 67), (7, 1, 63), (8, 3, 68), (11, 1, 67), (12, 4, 63),
              (16, 1.5, 65), (17.5, 1.5, 68), (19, 1, 73), (20, 1.5, 72), (21.5, 1.5, 68), (23, 1, 65), (24, 1.5, 67), (25.5, 1.5, 68),
              (27, 1, 71), (28, 2, 74), (30, 1, 71), (31, 1, 67)]
# Gegenthema (Geigen, Teil B)
TURM_B = [(0, 2, 72), (2, 1, 68), (3, 1, 65), (4, 1.5, 67), (5.5, 0.5, 68), (6, 1, 70), (7, 1, 72), (8, 3, 73), (11, 1, 72), (12, 4, 68),
          (16, 2, 70), (18, 1, 73), (19, 1, 77), (20, 1.5, 75), (21.5, 0.5, 73), (22, 1, 72), (23, 1, 70), (24, 3, 71), (27, 1, 72),
          (28, 2, 74), (30, 1, 71), (31, 1, 67)]


def turm():
    K = Klang(1101)
    bpm = 120
    beat = 60 / bpm
    takt = 4 * beat
    N = sum(len(p[1]) for p in TURM_PLAN)
    M = Mischer(int(round(N * takt * SR)))

    def T(b, s=0.0):
        return (b * 4 + s) * beat

    def jit(ms=4):
        return K.r(-ms, ms) / 1000

    spic = dict(stimmen=3, cent=7, a=0.007, d=0.07, s=0.42, r=0.08, p=1.1)
    for b in range(N):
        teil, akk = TURM_PLAN[b // 8]
        i = b % 8
        name = akk[i]
        bass, pcs = TURM_AKK[name]
        pb = b - i
        voll = teil in ('B1', 'B2', 'A3', 'D')
        # --- tiefe Streicher (Ostinato) ---
        if teil == 'C' and i < 4:
            for k in range(16):
                acc = 1.0 if k % 4 == 0 else (0.7 if k % 2 == 0 else 0.5)
                t = T(b, k * 0.25)
                M('ost', t + jit(), K.streich(48, 0.1, acc * 0.85, **spic), -0.3)
                M('ost', t + jit(), K.streich(36, 0.1, acc * 0.85, **spic), 0.25)
        elif teil == 'D' and i >= 6:
            for k in range(16):
                cres = 0.6 + 0.4 * ((i - 6) * 16 + k) / 32
                acc = (1.0 if k % 4 == 0 else 0.65) * cres
                t = T(b, k * 0.25)
                M('ost', t + jit(), K.streich(bass + 12 + (12 if k % 8 == 6 else 0), 0.1, acc, **spic), -0.3)
                M('ost', t + jit(), K.streich(bass, 0.1, acc, **spic), 0.25)
        else:
            muster = [0, 0, 12, 0, 0, 12, 0, 7]
            for k in range(8):
                acc = 1.0 if k in (0, 3, 6) else 0.58
                t = T(b, k * 0.5)
                M('ost', t + jit(), K.streich(bass + 12 + muster[k], 0.17, acc, **spic), -0.3)
                M('ost', t + jit(), K.streich(bass, 0.17, acc, **spic), 0.25)
                if voll and k in (0, 3, 6):
                    M('ost', t + jit(), K.streich(bass - 12, 0.2, 0.55, **spic), 0.0)
        # --- Trommeln ---
        if teil != 'C' or i % 2 == 0 or i >= 6:
            M('trom', T(b) + jit(2), K.trommel('odaiko', 1.0 if teil != 'C' else 0.8), K.r(-0.1, 0.1))
        if voll and i % 2 == 1:
            M('trom', T(b, 3.5) + jit(2), K.trommel('odaiko', 0.6), 0.1)
        if teil == 'C' and i < 6:
            M('trom', T(b, 0.75) + jit(2), K.trommel('odaiko', 0.55), -0.1)  # Herzschlag
        elif teil == 'A1':
            for s, v in ((0, 0.75), (1.5, 0.65), (3.0, 0.75)):
                M('trom', T(b, s) + jit(), K.trommel('taiko', v), -0.35)
                M('trom', T(b, s) + 0.006 + jit(), K.trommel('taiko', v * 0.8, 1.06), 0.35)
        else:
            treffer = [(0, 0.95), (1.5, 0.8), (3.0, 0.85)]
            if voll:
                treffer += [(2.75, 0.4), (3.5, 0.45)]
            if teil == 'C':
                treffer = [(0, 0.8), (1.5, 0.6), (3.0, 0.7)]
            for s, v in treffer:
                M('trom', T(b, s) + jit(), K.trommel('taiko', v), -0.35)
                M('trom', T(b, s) + 0.006 + jit(), K.trommel('taiko', v * 0.85, 1.06), 0.35)
        if teil in ('A1', 'A2', 'B1', 'B2', 'A3', 'D') and not (i == 7):
            for k in range(8 if teil != 'D' else 16):
                st = k * (0.5 if teil != 'D' else 0.25)
                v = 0.5 if (k in (0, 3, 6) and teil != 'D') or (teil == 'D' and k % 4 == 0) else 0.28
                M('shime', T(b, st) + jit(3), K.trommel('shime', v * (0.7 if teil == 'A1' else 1.0)), 0.45)
        if i == 7:
            # Wirbel der Fasstrommeln in den nächsten Teil
            for k in range(8):
                M('trom', T(b, 2 + k * 0.25) + jit(3), K.trommel('taiko', 0.45 + 0.07 * k), -0.2 if k % 2 else 0.2)
        if teil in ('B1', 'B2', 'D'):
            for s in (1.0, 3.0):
                M('metall', T(b, s) + jit(2), K.amboss(0.7), 0.3)
        elif teil == 'A3':
            M('metall', T(b, 3.0) + jit(2), K.amboss(0.6), 0.3)
        if teil in ('B2', 'A3'):
            for s, v in ((1.0, 0.3), (2.5, 0.22), (3.0, 0.35), (3.75, 0.2)):
                M('snare', T(b, s) + jit(), K.snare(v), 0.15)
        if teil in ('B1', 'B2') and i == 7:
            for k in range(8):
                M('snare', T(b, 2 + k * 0.25) + jit(), K.snare(0.3 + 0.08 * k), 0.15)
        if teil == 'D' and i >= 6:
            for k in range(32):
                M('snare', T(b, k * 0.125) + jit(2), K.snare(0.12 + 0.8 * (((i - 6) * 32 + k) / 64) ** 1.6), 0.15)
        if teil == 'C' and i == 7:
            for k in range(16):
                M('snare', T(b, k * 0.25) + jit(2), K.snare(0.1 + 0.6 * (k / 16) ** 1.5), 0.15)
        # --- Glocke, Becken, Einschläge, Ketten, Anstiege ---
        if teil in ('A1', 'A2') and i % 2 == 0 or (teil == 'C' and i % 2 == 0 and i < 6):
            M('glocke', T(b) + 0.01, K.glocke(261.6, 0.9 if teil != 'C' else 0.7), -0.15)
        if b in (0, 16, 40):
            M('becken', T(b), K.crash(1.0), 0.2)
            M('becken', T(b) + 0.01, K.crash(0.8), -0.25)
            M('tief', T(b), K.einschlag(1.0), 0)
        if b in (15, 39):
            M('fx', T(b) + takt - 1.8, K.rueckwaerts_becken(1.8, 0.8), 0)
        if b == 54:
            M('fx', T(b), K.anstieg(2 * takt, 1.0, ton=mton(43)), 0)
            M('fx', T(b) + 2 * takt - 2.4, K.rueckwaerts_becken(2.4, 0.9), 0)
        if b == 38:
            M('fx', T(b), K.anstieg(2 * takt, 0.8, ton=mton(43)), 0)
        if teil == 'C' and i in (1, 3, 4):
            M('fx', T(b, K.r(0.5, 2.5)), K.ketten(1.4, 0.8), K.r(-0.6, 0.6))
        if teil == 'D' and i == 2:
            M('fx', T(b, 1), K.ketten(1.6, 0.9), 0.5)
        # --- Chor ---
        if i % 2 == 0:
            d2 = 2 * takt - 0.15
            top = pcs + ((8,) if name == 'G' else ())
            if teil in ('A1', 'A2', 'A3'):
                for m in voicing(top, 48, 64, 4):
                    M('chor_o', T(b), K.chor(m, d2, 0.65), K.r(-0.4, 0.4))
            if teil == 'A2':
                for m in voicing(pcs, 63, 76, 3):
                    M('chor_a', T(b), K.chor(m, d2, 0.45), K.r(-0.5, 0.5))
            if teil in ('B1', 'B2'):
                for m in voicing(top, 57, 79, 5):
                    M('chor_a', T(b), K.chor(m, d2, 0.8), K.r(-0.6, 0.6))
                for m in voicing(pcs, 45, 60, 3):
                    M('chor_o', T(b), K.chor(m, d2, 0.7), K.r(-0.4, 0.4))
            if teil == 'C' and i < 6:
                for m in (60, 61, 67, 68):
                    M('chor_u', T(b), K.chor(m, d2, 0.6, a=1.2, r=1.2), K.r(-0.6, 0.6))
            if teil == 'C' and i == 6:
                for m in voicing((7, 11, 2, 8), 55, 76, 5):
                    M('chor_a', T(b), K.chor(m, d2, 0.75, a=2.5), K.r(-0.6, 0.6))
            if teil == 'D' and i < 4:
                for m in voicing(pcs, 60, 81, 5):
                    M('chor_a', T(b), K.chor(m, d2, 0.85, a=0.8), K.r(-0.6, 0.6))
                for m in voicing(pcs, 45, 60, 3):
                    M('chor_o', T(b), K.chor(m, d2, 0.75), K.r(-0.4, 0.4))
        if teil == 'D' and i == 4:
            for m in voicing((7, 11, 2, 8), 55, 81, 6):
                M('chor_a', T(b), K.chor(m, 4 * takt - 0.1, 0.9, a=3.0, r=0.3), K.r(-0.6, 0.6))
        # --- Blech ---
        if teil == 'A1' and i % 2 == 0:
            for m in voicing(pcs, 48, 60, 3):
                M('blech', T(b) + jit(), K.blech(m, 2 * takt - 0.3, 0.62, stimmen=2, a=1.0, hell=0.65), K.r(-0.3, 0.3))
            M('blech', T(b), K.blech(bass, 2 * takt - 0.3, 0.62, stimmen=2, a=1.0, hell=0.55), 0)
        if teil == 'A2' and i % 2 == 0:
            for m in voicing(pcs, 48, 60, 3):
                M('blech', T(b) + jit(), K.blech(m, 2 * takt - 0.3, 0.4, stimmen=2, a=1.2, hell=0.5), K.r(-0.3, 0.3))
        if teil in ('B1', 'B2', 'A3') or (teil == 'D' and i >= 4):
            stoesse = (0, 1.5, 3.0) if teil != 'A3' else (0,)
            if teil == 'D':
                stoesse = tuple(k * 0.5 for k in range(8)) if i < 7 else (0, 0.5, 1, 1.5, 2, 2.5)
            for s in stoesse:
                v = 0.9 if s == 0 else 0.75
                if teil == 'D':
                    v *= 0.65 + 0.35 * (i - 4) / 3
                for m in voicing(pcs, 48, 65, 4):
                    M('blech', T(b, s) + jit(), K.blech(m, 0.32, v, stimmen=2, stoss=True, hell=0.95), K.r(-0.35, 0.35))
                M('blech', T(b, s), K.blech(bass, 0.34, v, stimmen=2, stoss=True, hell=0.8), 0)
        if teil == 'C' and i % 2 == 0 and i < 6:
            for m in (48, 49):
                M('blech', T(b), K.blech(m, 2 * takt - 0.2, 0.5, stimmen=2, a=2.0, hell=0.5), K.r(-0.3, 0.3))
        if teil == 'C' and i == 6:
            for m in voicing((7, 11, 2), 43, 62, 4):
                M('blech', T(b), K.blech(m, 2 * takt - 0.1, 0.8, stimmen=2, a=3.2, hell=0.9), K.r(-0.3, 0.3))
        if teil == 'D' and i in (0, 2):
            for m in voicing(pcs, 43, 64, 5):
                M('blech', T(b), K.blech(m, 2 * takt - 0.2, 0.75, stimmen=2, a=1.5, hell=0.85), K.r(-0.3, 0.3))
        # --- hohe Streicher ---
        if i % 2 == 0 and teil in ('A2', 'C', 'A3'):
            hoch = voicing(pcs, 67, 84, 3) if teil != 'C' else [72, 73, 79]
            for m in hoch:
                M('vl', T(b), K.streich(m, 2 * takt - 0.1, 0.35 if teil != 'C' else 0.28, stimmen=4, cent=6, a=0.4, d=0.5, s=0.9, r=0.4,
                                        p=1.3, vib=8, trem=1, bpm=bpm, cache=False), K.r(-0.5, 0.5))
        if teil == 'D' and i < 6:
            ton = voicing(pcs, 67, 88, 6)
            for k in range(16):
                m = ton[min(len(ton) - 1, [0, 1, 2, 3, 4, 5, 4, 3][k % 8])]
                M('vl', T(b, k * 0.25) + jit(), K.streich(m, 0.1, 0.45 + 0.07 * i, stimmen=3, cent=6, a=0.006, d=0.06, s=0.4, r=0.06, p=1.25),
                  0.35 if k % 2 else -0.35)
    # Themen (je Teil einmal, über acht Takte)
    for pb, teil, _ in [(k * 8, TURM_PLAN[k][0], 0) for k in range(len(TURM_PLAN))]:
        if teil in ('A2', 'A3'):
            for s, d, m in TURM_THEMA:
                v = 0.8 if teil == 'A2' else 1.0
                M('horn', T(pb, s) + jit(), K.blech(m, d * beat * 0.96, v, stimmen=3, cent=7, a=0.07, hell=0.7), -0.2)
                if teil == 'A3':
                    M('horn', T(pb, s) + jit(), K.blech(m - 12, d * beat * 0.96, 0.9, stimmen=3, cent=7, a=0.06, hell=0.8), 0.25)
                    M('chor_a', T(pb, s), K.chor(m, d * beat, 0.5, a=0.12, r=0.3), 0.0)
        if teil in ('B1', 'B2'):
            for s, d, m in TURM_B:
                for okt, v, pan in ((0, 0.65, 0.3), (-12, 0.45, -0.1)) if teil == 'B1' else ((12, 0.5, 0.35), (0, 0.6, -0.2)):
                    M('vl', T(pb, s) + jit(), K.streich(m + okt, d * beat + 0.04, v, stimmen=4, cent=6, a=0.06, d=0.4, s=0.85, r=0.25, p=1.2,
                                                         vib=14, cache=False), pan)
                if teil == 'B2':
                    M('horn', T(pb, s) + jit(), K.blech(m - 12, d * beat * 0.96, 0.7, stimmen=3, cent=7, a=0.06, hell=0.65), -0.25)
    return M, takt


def turm_mix():
    raeume = {'gross': hall_ir(np.random.default_rng(7), (3.4, 2.8, 1.9, 1.0), 4.4, 0.028, 0.2),
              'raum': hall_ir(np.random.default_rng(8), (1.4, 1.2, 0.8, 0.45), 2.0, 0.008, 0.3)}
    specs = {
        'ost': dict(eq=kette(_sos('hp', 38), eq_spitze(240, 1.5, 1.0), eq_spitze(520, -3, 1.2), eq_spitze(1800, 3, 0.9), _sos('lp', 5500)),
                    ziel=-21, hall={'gross': 0.35}),
        'trom': dict(eq=kette(_sos('hp', 38), eq_spitze(300, -2, 1.0), eq_spitze(2000, 2, 1.0)), ziel=-21, hall={'raum': 0.35, 'gross': 0.25}),
        'shime': dict(eq=_sos('hp', 200), ziel=-27, hall={'raum': 0.4, 'gross': 0.3}),
        'metall': dict(eq=_sos('hp', 300), ziel=-27, hall={'gross': 0.7}),
        'glocke': dict(eq=_sos('hp', 60), ziel=-26, hall={'gross': 0.8}),
        'snare': dict(eq=_sos('hp', 150), ziel=-26, hall={'raum': 0.45, 'gross': 0.25}),
        'becken': dict(ziel=-27, hall={'gross': 0.4}),
        'tief': dict(eq=kette(_sos('lp', 140), _sos('hp', 30)), ziel=-27),
        'fx': dict(eq=_sos('hp', 150), ziel=-28, hall={'gross': 0.6}),
        'chor_o': dict(eq=_sos('hp', 110), vokal='o', ziel=-24, hall={'gross': 0.9}),
        'chor_a': dict(eq=_sos('hp', 160), vokal='a', ziel=-23, hall={'gross': 0.9}),
        'chor_u': dict(eq=_sos('hp', 160), vokal='u', ziel=-25, hall={'gross': 1.0}),
        'blech': dict(eq=kette(_sos('hp', 45), eq_spitze(320, -2.5, 1.0), eq_spitze(1400, 2.5, 1.0), _sos('lp', 6500)), ziel=-22, hall={'gross': 0.6}),
        'horn': dict(eq=kette(_sos('hp', 110), eq_spitze(1200, 2, 1.0), _sos('lp', 5500)), ziel=-20, hall={'gross': 0.7}),
        'vl': dict(eq=kette(_sos('hp', 230), eq_spitze(3200, -1, 1.0), _sos('lp', 9000)), ziel=-23, hall={'gross': 0.85}),
    }
    master = dict(eq=kette(_sos('hp', 32, 2), eq_kuhle(90, -3.5), eq_spitze(300, -2.0, 0.8), eq_spitze(1300, 2.0, 0.9),
                           eq_kuhle(2400, 4.0, hoch=True)), schwelle=-16, ratio=2.5, treiben=1.15)
    return specs, raeume, master


# === Kharzul (kharzul, kharzul2): cis-Moll, 150 BPM, 64 Takte ===========================================================
# Noch härter als der Turm: Sechzehntel-Ostinato der tiefen Streicher mit Betonung 3+3+3+3+2+2 und chromatischem
# Nachbarton, Trommeln im selben Muster, Tritonus-Harmonik (cis-Moll – D – cis-Moll – G – Gis), Höllenmotiv im Blech.
# Teile: K1 (Grund), K2 (Thema in Horn und Posaune, Männerchor), K3/K4 (A – fis – D – Gis, Chor „a“, Amboss, Gegenthema),
# K5 (halbes Tempo: Ketten, Blechschläge, Cluster), K6 (chromatisch aufsteigend, Steigerung), K7 (Thema, alles), K8
# (Gegenthema, Wirbel in den Anfang). kharzul2 (wut=True): dieselben Spuren und zusätzlich doppelte Trommeln, Chorrufe,
# Trompeten eine Oktave höher, angezerrtes Höllenblech, schreiende Geigen – nur in eigenen Spuren, damit die gemeinsamen
# Spuren in beiden Fassungen gleich bleiben.
KZ_AKK = {
    'C#m': (37, (1, 4, 8)), 'D': (38, (2, 6, 9)), 'G': (43, (7, 11, 2)), 'G#': (44, (8, 0, 3)), 'A': (33, (9, 1, 4)), 'F#m': (42, (6, 9, 1)),
    'Dm': (38, (2, 5, 9)), 'D#m': (39, (3, 6, 10)), 'Em': (40, (4, 7, 11)), 'Fm': (41, (5, 8, 0)), 'Gm': (43, (7, 10, 2))
}
_K1 = ['C#m', 'C#m', 'D', 'D', 'C#m', 'C#m', 'G', 'G#']
_K3 = ['A', 'A', 'F#m', 'F#m', 'D', 'D', 'G#', 'G#']
KZ_PLAN = [('K1', _K1), ('K2', _K1), ('K3', _K3), ('K4', _K3), ('K5', ['C#m', 'C#m', 'C#m', 'C#m', 'D', 'D', 'D', 'D']),
           ('K6', ['C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#']), ('K7', _K1), ('K8', _K3)]
KZ_THEMA = [(0, 1, 61), (1, 0.5, 56), (1.5, 0.5, 61), (2, 2, 64), (4, 1, 63), (5, 1, 64), (6, 2, 68), (8, 1.5, 69), (9.5, 0.5, 66), (10, 2, 62),
            (12, 1, 64), (13, 1, 66), (14, 1, 69), (15, 1, 68), (16, 2, 68), (18, 1, 64), (19, 1, 61), (20, 1, 63), (21, 1, 64), (22, 1, 62),
            (23, 1, 61), (24, 2, 62), (26, 1, 59), (27, 1, 55), (28, 2, 56), (30, 1, 60), (31, 1, 63)]
KZ_B = [(0, 2, 64), (2, 1, 69), (3, 1, 71), (4, 3, 73), (7, 1, 71), (8, 2, 69), (10, 1, 66), (11, 1, 69), (12, 4, 73), (16, 2, 74), (18, 1, 73),
        (19, 1, 69), (20, 1.5, 66), (21.5, 0.5, 69), (22, 2, 74), (24, 3, 72), (27, 1, 68), (28, 2, 75), (30, 1, 72), (31, 1, 68)]


def kharzul(wut=False):
    K = Klang(2203)        # gemeinsame Spuren (in beiden Fassungen gleich)
    W = Klang(2207)        # nur kharzul2
    bpm = 150
    beat = 60 / bpm
    takt = 4 * beat
    N = sum(len(p[1]) for p in KZ_PLAN)
    M = Mischer(int(round(N * takt * SR)))

    def T(b, s=0.0):
        return (b * 4 + s) * beat

    def jit(ms=3, k=K):
        return k.r(-ms, ms) / 1000

    spic = dict(stimmen=3, cent=7, a=0.005, d=0.05, s=0.4, r=0.06, p=1.05)
    akz16 = (0, 3, 6, 9, 12, 14)
    for b in range(N):
        teil, akk = KZ_PLAN[b // 8]
        i = b % 8
        name = akk[i]
        bass, pcs = KZ_AKK[name]
        voll = teil in ('K3', 'K4', 'K7', 'K8')
        # --- tiefe Streicher ---
        if teil == 'K5':
            for k in range(8):
                acc = 1.0 if k in (0, 3, 6) else 0.5
                M('ost', T(b, k * 0.5) + jit(), K.streich(bass + 12, 0.16, acc, **spic), -0.3)
                M('ost', T(b, k * 0.5) + jit(), K.streich(bass, 0.16, acc, **spic), 0.25)
        else:
            muster = [0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 12, 0, 1, 0]
            for k in range(16):
                acc = 1.0 if k in akz16 else 0.5
                if teil == 'K6':
                    acc *= 0.75 + 0.25 * i / 7
                t = T(b, k * 0.25)
                M('ost', t + jit(), K.streich(bass + 12 + muster[k], 0.085, acc, **spic), -0.3)
                M('ost', t + jit(), K.streich(bass + (muster[k] if muster[k] == 1 else 0), 0.085, acc, **spic), 0.25)
                if voll and k in (0, 6, 12):
                    M('ost', t + jit(), K.streich(bass - 12, 0.12, 0.5, **spic), 0.0)
        # --- Trommeln ---
        if teil == 'K5':
            if i % 2 == 0:
                M('trom', T(b) + jit(2), K.trommel('odaiko', 1.0), 0)
                M('trom', T(b) + 0.008, K.trommel('odaiko', 0.8, 0.93), 0.2)
            for s, v in ((2.0, 0.7), (3.0, 0.5), (3.5, 0.6)):
                M('trom', T(b, s) + jit(), K.trommel('taiko', v), -0.3)
        else:
            M('trom', T(b) + jit(2), K.trommel('odaiko', 1.0), K.r(-0.1, 0.1))
            M('trom', T(b, 2) + jit(2), K.trommel('odaiko', 0.75), K.r(-0.1, 0.1))
            for k in akz16:
                v = (0.95 if k in (0, 6, 12) else 0.7) * (1.0 if voll or teil == 'K6' else 0.85)
                M('trom', T(b, k * 0.25) + jit(), K.trommel('taiko', v), -0.35)
                M('trom', T(b, k * 0.25) + 0.006 + jit(), K.trommel('taiko', v * 0.85, 1.07), 0.35)
        if i in (3, 7) and teil != 'K5':
            for k, art in enumerate(('tom_h', 'tom_h', 'tom_m', 'tom_m', 'tom_t', 'tom_t', 'taiko', 'taiko')):
                M('trom', T(b, 2 + k * 0.25) + jit(), K.trommel(art, 0.55 + 0.06 * k), (0.5 - k * 0.14))
        if teil != 'K5':
            for k in range(16):
                v = (0.5 if k in akz16 else 0.22) * (1.0 if voll or teil == 'K6' else 0.7)
                M('shime', T(b, k * 0.25) + jit(2), K.trommel('shime', v), 0.45)
        if voll:
            for s in (1.0, 3.0):
                M('metall', T(b, s) + jit(2), K.amboss(0.75, 700), 0.3)
                M('snare', T(b, s) + jit(2), K.snare(0.55), 0.1)
        if teil == 'K5' and i % 2 == 1:
            M('metall', T(b, K.r(1.0, 3.0)), K.amboss(0.5, 560), K.r(-0.6, 0.6))
        if teil == 'K6' and i == 7:
            for k in range(16):
                M('snare', T(b, k * 0.25) + jit(2), K.snare(0.2 + 0.7 * (k / 15) ** 1.5), 0.1)
        if teil == 'K8' and i >= 6:
            for k in range(32 if i == 7 else 16):
                st = k * (0.125 if i == 7 else 0.25)
                M('snare', T(b, st) + jit(2), K.snare(0.25 + 0.6 * ((i - 6) * 0.5 + st / 8)), 0.1)
        if b in (0, 16, 32, 48):
            M('becken', T(b), K.crash(1.0), 0.25)
            M('becken', T(b) + 0.012, K.crash(0.8), -0.3)
            M('tief', T(b), K.einschlag(1.0, 60, 25), 0)
        if b in (15, 31, 47):
            M('fx', T(b) + takt - 1.5, K.rueckwaerts_becken(1.5, 0.8), 0)
        if b == 62:
            M('fx', T(b), K.anstieg(2 * takt, 1.0, ton=mton(44)), 0)
        if b == 46:
            M('fx', T(b), K.anstieg(2 * takt, 0.9, ton=mton(43)), 0)
        if teil == 'K5' and i in (1, 3, 5, 7):
            M('fx', T(b, K.r(0.0, 2.0)), K.ketten(1.3, 0.9), K.r(-0.6, 0.6))
        # --- Chor ---
        if teil == 'K6':
            for m in voicing(pcs, 55, 76, 4):
                M('chor_a', T(b), K.chor(m, takt - 0.05, 0.75 + 0.03 * i, a=0.25, r=0.3), K.r(-0.6, 0.6))
            for m in voicing(pcs, 43, 57, 2):
                M('chor_o', T(b), K.chor(m, takt - 0.05, 0.7, a=0.25, r=0.3), K.r(-0.4, 0.4))
        elif i % 2 == 0:
            d2 = 2 * takt - 0.1
            if teil in ('K1', 'K2', 'K7'):
                for m in voicing(pcs, 45, 62, 4):
                    M('chor_o', T(b), K.chor(m, d2, 0.6 if teil == 'K1' else 0.7), K.r(-0.4, 0.4))
            if teil in ('K3', 'K4', 'K7', 'K8'):
                for m in voicing(pcs + ((2,) if name == 'C#m' else ()), 58, 80, 5):
                    M('chor_a', T(b), K.chor(m, d2, 0.8), K.r(-0.6, 0.6))
            if teil == 'K5':
                cl = (61, 62, 68, 69) if name == 'C#m' else (62, 63, 69, 70)
                for m in cl:
                    M('chor_u', T(b), K.chor(m, d2, 0.7, a=0.9, r=1.0), K.r(-0.6, 0.6))
        # --- Blech ---
        if teil == 'K1':
            for s in ((0, 3.5) if i % 2 else (0,)):
                for m in voicing(pcs, 44, 61, 4):
                    M('blech', T(b, s) + jit(), K.blech(m, 0.3, 0.85, stimmen=2, stoss=True, hell=0.95), K.r(-0.35, 0.35))
                M('blech', T(b, s), K.blech(bass, 0.32, 0.85, stimmen=2, stoss=True, hell=0.8), 0)
        if voll or teil == 'K2':
            for s in ((0, 1.5, 3.0) if voll else (0,)):
                for m in voicing(pcs, 44, 63, 4):
                    M('blech', T(b, s) + jit(), K.blech(m, 0.28, 0.9 if s == 0 else 0.75, stimmen=2, stoss=True, hell=1.0), K.r(-0.35, 0.35))
                M('blech', T(b, s), K.blech(bass, 0.3, 0.9, stimmen=2, stoss=True, hell=0.85), 0)
        if teil == 'K5' and i % 2 == 0:
            cl = voicing(pcs, 37, 61, 5) + ([50] if name == 'C#m' else [51])
            for m in cl:
                M('blech', T(b) + jit(), K.blech(m, 2 * takt - 0.3, 1.0, stimmen=3, a=0.05, hell=1.0, r=0.6), K.r(-0.35, 0.35))
        if teil == 'K6':
            for m in voicing(pcs, 44, 66, 5):
                M('blech', T(b) + jit(), K.blech(m, takt - 0.08, 0.6 + 0.05 * i, stimmen=2, a=0.3, hell=0.9), K.r(-0.35, 0.35))
        if teil == 'K8' and i >= 6:
            for k in range(8):
                v = 0.6 + 0.4 * ((i - 6) * 8 + k) / 16
                for m in voicing(pcs, 44, 66, 4):
                    M('blech', T(b, k * 0.5) + jit(), K.blech(m, 0.22, v, stimmen=2, stoss=True, hell=1.0), K.r(-0.35, 0.35))
        # --- hohe Streicher ---
        if teil in ('K3', 'K7') and i % 2 == 0:
            for m in voicing(pcs, 68, 86, 3):
                M('vl', T(b), K.streich(m, 2 * takt - 0.1, 0.4, stimmen=4, cent=6, a=0.2, d=0.5, s=0.9, r=0.3, p=1.25, vib=8, trem=1, bpm=bpm,
                                        cache=False), K.r(-0.5, 0.5))
        if teil == 'K6':
            ton = voicing(pcs, 64, 88, 6)
            for k in range(16):
                m = ton[min(len(ton) - 1, [0, 1, 2, 3, 4, 5, 4, 3, 2, 3, 4, 5, 4, 3, 2, 1][k])]
                M('vl', T(b, k * 0.25) + jit(), K.streich(m, 0.085, 0.5 + 0.05 * i, stimmen=3, cent=6, a=0.004, d=0.05, s=0.4, r=0.05, p=1.2),
                  0.35 if k % 2 else -0.35)
        if teil == 'K5' and i % 2 == 0:
            for m in ((73, 74, 80) if name == 'C#m' else (74, 75, 81)):
                M('vl', T(b), K.streich(m, 2 * takt - 0.1, 0.3, stimmen=4, cent=10, a=0.6, d=0.5, s=0.9, r=0.5, p=1.3, vib=6, trem=1, bpm=bpm,
                                        cache=False), K.r(-0.5, 0.5))

        # === nur kharzul2: mehr Wucht ===
        if not wut:
            continue
        # doppelte Trommeln: Sechzehntel der Fasstrommeln, große Trommel auf jedem Schlag
        if teil != 'K5':
            for k in range(16):
                if k in akz16:
                    continue
                M('trom2', T(b, k * 0.25) + jit(k=W), W.trommel('taiko', 0.4 if k % 2 else 0.5, 1.12), W.r(-0.5, 0.5))
            for s in (1, 3):
                M('trom2', T(b, s) + jit(2, W), W.trommel('odaiko', 0.8), 0)
        else:
            for k in range(8):
                M('trom2', T(b, k * 0.5) + jit(k=W), W.trommel('taiko', 0.55 if k % 2 else 0.8), W.r(-0.5, 0.5))
            M('trom2', T(b, 1) + jit(2, W), W.trommel('odaiko', 0.8), 0)
        for s in (1.0, 3.0) if not voll else (0.0, 2.0):
            M('snare2', T(b, s) + jit(2, W), W.snare(0.6), -0.1)
        for k in range(16):
            M('shime2', T(b, k * 0.25) + jit(2, W), W.trommel('shime', 0.45 if k in akz16 else 0.2, 1.15), -0.45)
        if voll or teil in ('K1', 'K2', 'K6'):
            for s in range(4):
                M('metall2', T(b, s) + jit(2, W), W.amboss(0.6 if s % 2 else 0.8, 930), -0.3)
        if i == 0 or (voll and i == 4):
            M('becken2', T(b), W.crash(0.8), -0.35)
        # Höllenblech: tiefes angezerrtes Ostinato auf den Betonungen
        for k in akz16:
            dd = 0.24 if k < 12 else 0.18
            M('hoelle', T(b, k * 0.25) + jit(2, W), W.blech(bass - 12, dd, 1.0, stimmen=3, cent=14, stoss=True, hell=1.0, p_hell=0.9), 0.0)
            M('hoelle', T(b, k * 0.25) + jit(2, W), W.blech(bass, dd, 0.8, stimmen=3, cent=14, stoss=True, hell=1.0, p_hell=0.9), 0.0)
        # Chorrufe auf den Betonungen (kurz, „ha“)
        if teil not in ('K5', 'K6'):
            for k in (0, 6, 12):
                for m in voicing(pcs, 55, 72, 3):
                    M('chor2', T(b, k * 0.25), W.chor(m, 0.2, 0.9, stimmen=4, a=0.02, r=0.12), W.r(-0.5, 0.5))
        else:
            for m in voicing(pcs, 64, 84, 3):
                M('chor2', T(b), W.chor(m, takt - 0.05, 0.8, stimmen=4, a=0.15, r=0.3), W.r(-0.5, 0.5))
        # schreiende Geigen: hohe Sechzehntel-Läufe bzw. Cluster mit Tremolo
        if voll or teil in ('K1', 'K2'):
            ton = voicing(pcs, 76, 93, 5)
            for k in range(16):
                m = ton[min(len(ton) - 1, [0, 1, 2, 3, 4, 3, 2, 1][k % 8])]
                M('vl2', T(b, k * 0.25) + jit(k=W), W.streich(m, 0.08, 0.5, stimmen=3, cent=7, a=0.004, d=0.05, s=0.45, r=0.05, p=1.15),
                  0.4 if k % 2 else -0.4)
        elif i % 2 == 0:
            for m in (85, 86, 91):
                M('vl2', T(b), W.streich(m, 2 * takt - 0.1, 0.4, stimmen=4, cent=12, a=0.3, d=0.5, s=0.9, r=0.4, p=1.2, vib=10, trem=1, bpm=bpm,
                                         cache=False), W.r(-0.5, 0.5))
    # Themen
    for q in range(len(KZ_PLAN)):
        teil = KZ_PLAN[q][0]
        pb = q * 8
        if teil in ('K2', 'K7'):
            for s, d, m in KZ_THEMA:
                M('horn', T(pb, s) + jit(), K.blech(m, d * beat * 0.95, 0.95, stimmen=3, cent=7, a=0.04, hell=0.85), -0.2)
                M('horn', T(pb, s) + jit(), K.blech(m - 12, d * beat * 0.95, 0.9, stimmen=3, cent=7, a=0.04, hell=0.85), 0.25)
                if teil == 'K7':
                    M('chor_a', T(pb, s), K.chor(m + 12, d * beat, 0.45, a=0.08, r=0.25), 0.0)
                if wut:
                    M('trp', T(pb, s) + jit(k=W), W.blech(m + 12, d * beat * 0.95, 1.0, stimmen=3, cent=6, a=0.03, hell=1.0, p_hell=0.95), 0.1)
                    M('chor2', T(pb, s), W.chor(m + 12, d * beat, 0.7, stimmen=4, a=0.06, r=0.2), 0.0)
        if teil in ('K4', 'K8'):
            for s, d, m in KZ_B:
                M('horn', T(pb, s) + jit(), K.blech(m - 12, d * beat * 0.95, 0.9, stimmen=3, cent=7, a=0.04, hell=0.8), -0.2)
                M('vl', T(pb, s) + jit(), K.streich(m + 12, d * beat + 0.03, 0.6, stimmen=4, cent=6, a=0.04, d=0.4, s=0.85, r=0.2, p=1.2, vib=14,
                                                    cache=False), 0.3)
                M('vl', T(pb, s) + jit(), K.streich(m, d * beat + 0.03, 0.55, stimmen=4, cent=6, a=0.04, d=0.4, s=0.85, r=0.2, p=1.2, vib=14,
                                                    cache=False), -0.25)
                if wut:
                    M('trp', T(pb, s) + jit(k=W), W.blech(m, d * beat * 0.95, 1.0, stimmen=3, cent=6, a=0.03, hell=1.0, p_hell=0.95), 0.1)
    return M, takt


def kharzul_mix(wut=False):
    raeume = {'gross': hall_ir(np.random.default_rng(17), (3.0, 2.5, 1.7, 0.9), 4.0, 0.022, 0.2),
              'raum': hall_ir(np.random.default_rng(18), (1.3, 1.1, 0.75, 0.4), 1.8, 0.007, 0.3)}
    specs = {
        'ost': dict(eq=kette(_sos('hp', 38), eq_spitze(240, 1.5, 1.0), eq_spitze(520, -3, 1.2), eq_spitze(1800, 3, 0.9), _sos('lp', 6000)),
                    ziel=-21, hall={'gross': 0.3}),
        'trom': dict(eq=kette(_sos('hp', 38), eq_spitze(300, -2, 1.0), eq_spitze(2000, 2, 1.0)), ziel=-20.5, hall={'raum': 0.35, 'gross': 0.2}),
        'shime': dict(eq=_sos('hp', 200), ziel=-27, hall={'raum': 0.4, 'gross': 0.25}),
        'metall': dict(eq=_sos('hp', 300), ziel=-27, hall={'gross': 0.6}),
        'snare': dict(eq=_sos('hp', 150), ziel=-25, hall={'raum': 0.45, 'gross': 0.25}),
        'becken': dict(ziel=-27, hall={'gross': 0.4}),
        'tief': dict(eq=kette(_sos('lp', 140), _sos('hp', 30)), ziel=-27),
        'fx': dict(eq=_sos('hp', 150), ziel=-28, hall={'gross': 0.6}),
        'chor_o': dict(eq=_sos('hp', 110), vokal='o', ziel=-24, hall={'gross': 0.9}),
        'chor_a': dict(eq=_sos('hp', 160), vokal='a', ziel=-23, hall={'gross': 0.9}),
        'chor_u': dict(eq=_sos('hp', 160), vokal='u', ziel=-27, hall={'gross': 1.0}),
        'blech': dict(eq=kette(_sos('hp', 45), eq_spitze(320, -2.5, 1.0), eq_spitze(1400, 2.5, 1.0), _sos('lp', 7000)), ziel=-21.5, hall={'gross': 0.55}),
        'horn': dict(eq=kette(_sos('hp', 110), eq_spitze(1200, 2, 1.0), _sos('lp', 6000)), ziel=-20.5, hall={'gross': 0.65}),
        'vl': dict(eq=kette(_sos('hp', 230), eq_spitze(3200, -1, 1.0), _sos('lp', 9000)), ziel=-23, hall={'gross': 0.8}),
    }
    if wut:
        specs.update({
            'trom2': dict(eq=kette(_sos('hp', 45), eq_spitze(2500, 2, 1.0)), ziel=-24, hall={'raum': 0.35, 'gross': 0.2}),
            'shime2': dict(eq=_sos('hp', 250), ziel=-28, hall={'raum': 0.4}),
            'snare2': dict(eq=_sos('hp', 150), ziel=-26, hall={'raum': 0.45, 'gross': 0.25}),
            'metall2': dict(eq=_sos('hp', 400), ziel=-28, hall={'gross': 0.5}),
            'becken2': dict(ziel=-29, hall={'gross': 0.4}),
            'hoelle': dict(eq=kette(_sos('hp', 35), eq_spitze(800, 3, 0.8), _sos('lp', 3500)), ziel=-24, hall={'gross': 0.3}),
            'chor2': dict(eq=_sos('hp', 180), vokal='a', ziel=-24, hall={'gross': 0.8}),
            'trp': dict(eq=kette(_sos('hp', 200), eq_spitze(2000, 2, 1.0), _sos('lp', 8000)), ziel=-22, hall={'gross': 0.6}),
            'vl2': dict(eq=kette(_sos('hp', 400), _sos('lp', 10000)), ziel=-26, hall={'gross': 0.7}),
        })
    master = dict(eq=kette(_sos('hp', 32, 2), eq_kuhle(90, -3.5), eq_spitze(300, -2.0, 0.8), eq_spitze(1300, 2.0, 0.9),
                           eq_kuhle(2400, 4.0, hoch=True)), schwelle=-16, ratio=2.5, treiben=1.2)
    return specs, raeume, master


# === Arenen (arena): e-dorisch, 125 BPM, 56 Takte ========================================================================
# Kampf-Groove statt Orchester-Wucht: Bassdrum und Snare mit Handklatschen, Sechzehntel-Becken und Schüttelrohr,
# synkopierter Bass, ein Zupfinstrument (Koto) in Sechzehnteln, darüber ein eingängiges Erhu-Motiv, Bambusflöte,
# Blechstöße auf den Synkopen, Fasstrommeln und Toms als Arena-Wucht. Teile: R1 (Groove), R2 (Erhu-Motiv), R3 (Flöte,
# Blech), R4 (halbes Tempo: Hörner, Trommeln, Anstieg), R5 (alles, Motiv mit Flöte in der Oktave, Klatschen der
# Menge), R6 (Motiv im Blech), R7 (Trommeln und Groove, Anstieg in den Anfang).
AR_AKK = {'Em': (40, (4, 7, 11)), 'C': (36, (0, 4, 7)), 'D': (38, (2, 6, 9)), 'A': (45, (9, 1, 4)), 'B': (35, (11, 3, 6))}
_R1 = ['Em', 'Em', 'C', 'D', 'Em', 'Em', 'A', 'B']
AR_PLAN = [('R1', _R1), ('R2', _R1), ('R3', ['C', 'C', 'D', 'D', 'Em', 'Em', 'A', 'B']), ('R4', ['Em', 'Em', 'C', 'C', 'D', 'D', 'B', 'B']),
           ('R5', _R1), ('R6', _R1), ('R7', _R1)]
AR_MOTIV = [(0, 0.75, 71), (0.75, 0.75, 74), (1.5, 0.5, 76), (2, 1, 76), (3, 0.5, 74), (3.5, 0.5, 71), (4, 1.5, 69), (5.5, 0.5, 71), (6, 2, 67),
            (8, 0.75, 67), (8.75, 0.75, 69), (9.5, 0.5, 71), (10, 1, 76), (11, 1, 74), (12, 1.5, 78), (13.5, 0.5, 76), (14, 1, 74), (15, 1, 69),
            (16, 0.75, 71), (16.75, 0.75, 74), (17.5, 0.5, 76), (18, 1, 79), (19, 0.5, 78), (19.5, 0.5, 76), (20, 1.5, 74), (21.5, 0.5, 76),
            (22, 2, 71), (24, 0.75, 73), (24.75, 0.75, 76), (25.5, 0.5, 78), (26, 1, 81), (27, 0.5, 79), (27.5, 0.5, 78), (28, 2, 78), (30, 1, 75),
            (31, 1, 71)]
AR_FLOETE = [(0, 0.75, 72), (0.75, 0.75, 76), (1.5, 0.5, 79), (2, 2, 76), (4, 1, 74), (5, 1, 72), (6, 2, 71), (8, 0.75, 74), (8.75, 0.75, 78),
             (9.5, 0.5, 81), (10, 2, 78), (12, 1, 76), (13, 1, 74), (14, 2, 73), (16, 1.5, 76), (17.5, 0.5, 74), (18, 1, 71), (19, 1, 74),
             (20, 3, 76), (23, 1, 79), (24, 1.5, 78), (25.5, 0.5, 76), (26, 1, 73), (27, 1, 76), (28, 2, 75), (30, 1, 78), (31, 1, 83)]
# Bass: (Sechzehntel, Länge in Sechzehnteln, Abstand zum Grundton); Moll bzw. Dur, gerader/ungerader Takt
AR_BASS = {
    ('m', 0): [(0, 2, 0), (3, 1, 0), (6, 2, 12), (8, 2, 0), (11, 1, 10), (12, 2, 0), (14, 1, 3), (15, 1, 5)],
    ('m', 1): [(0, 2, 0), (3, 1, 0), (6, 2, 7), (8, 1, 0), (10, 2, 10), (12, 1, 7), (13, 1, 5), (14, 2, 3)],
    ('d', 0): [(0, 2, 0), (3, 1, 0), (6, 2, 12), (8, 2, 0), (11, 1, 7), (12, 2, 0), (14, 1, 7), (15, 1, 12)],
    ('d', 1): [(0, 2, 0), (3, 1, 0), (6, 2, 7), (8, 1, 0), (10, 2, 12), (12, 1, 7), (13, 1, 4), (14, 2, 7)],
}
AR_ZUPF = {'m': [0, 7, 12, 7, 15, 7, 12, 7, 0, 7, 12, 14, 15, 14, 12, 7], 'd': [0, 7, 12, 7, 16, 7, 12, 7, 0, 7, 12, 14, 16, 14, 12, 7]}


def arena():
    K = Klang(3301)
    bpm = 125
    beat = 60 / bpm
    takt = 4 * beat
    s16 = beat / 4
    N = sum(len(p[1]) for p in AR_PLAN)
    M = Mischer(int(round(N * takt * SR)))

    def T(b, st=0.0):
        """Takt b, Sechzehntel st"""
        return (b * 16 + st) * s16

    def jit(ms=3):
        return K.r(-ms, ms) / 1000

    for b in range(N):
        teil, akk = AR_PLAN[b // 8]
        i = b % 8
        name = akk[i]
        bass, pcs = AR_AKK[name]
        dur = 'd' if name != 'Em' else 'm'
        halb = teil == 'R4'
        aufbau = teil == 'R4' and i >= 6
        # --- Schlagzeug ---
        kick = [0, 6, 8, 14] if not halb else [0, 10]
        if teil == 'R7':
            kick = [0, 6, 8, 11, 14]
        if aufbau:
            kick = [0, 4, 8, 12] if i == 6 else [0, 2, 4, 6, 8, 10, 12, 14]
        for st in kick:
            M('kick', T(b, st), K.trommel('kick', 1.0 if st in (0, 8) else 0.85), 0)
        sn = [4, 12] if not halb else [8]
        for st in sn:
            M('snare', T(b, st) + jit(2), K.snare(0.9, 'arena'), 0.05)
            if teil != 'R1':
                M('klatsch', T(b, st) + 0.004 + jit(2), K.klatsch(0.8), -0.1)
        if not halb and i % 2 == 1:
            M('snare', T(b, 15) + jit(2), K.snare(0.25, 'arena'), 0.05)
            M('snare', T(b, 7) + jit(2), K.snare(0.18, 'arena'), 0.05)
        if aufbau:
            for k in range(8 if i == 6 else 16):
                st = k * (2 if i == 6 else 1)
                M('snare', T(b, st) + jit(2), K.snare(0.25 + 0.6 * ((i - 6) * 16 + st) / 32, 'arena'), 0.05)
        if teil in ('R5', 'R6'):
            for st in (4, 12):
                for q in range(5):
                    M('menge', T(b, st) + K.r(-0.012, 0.016), K.klatsch(K.r(0.5, 0.9)), K.r(-0.8, 0.8))
        hv = [0.45, 0.2, 0.75, 0.25]
        for st in range(16):
            if halb and st % 2:
                continue
            if st == 14 and i % 2 == 1 and not halb:
                M('hats', T(b, st) + jit(2), K.hihat(0.8, offen=True), 0.35)
                continue
            M('hats', T(b, st) + jit(2), K.hihat(hv[st % 4] * (0.7 if halb else 1.0)), 0.35)
        if teil in ('R2', 'R3', 'R5', 'R6'):
            for st in range(16):
                M('shaker', T(b, st) + jit(4), K.schuettel(0.6 if st % 2 else 0.35), -0.45)
        # Fasstrommeln, Toms
        if teil == 'R1' and i % 2 == 0:
            M('trom', T(b), K.trommel('taiko', 0.7), -0.2)
        if halb:
            M('trom', T(b), K.trommel('odaiko', 0.9), 0)
            for st, v in ((0, 0.9), (6, 0.75), (12, 0.8), (14, 0.5)):
                M('trom', T(b, st) + jit(), K.trommel('taiko', v), -0.35)
                M('trom', T(b, st) + 0.006 + jit(), K.trommel('taiko', v * 0.85, 1.06), 0.35)
        if teil in ('R5', 'R6'):
            for st in (0, 10):
                M('trom', T(b, st) + jit(), K.trommel('taiko', 0.8), -0.3)
        if teil == 'R7':
            for st, v in ((0, 0.9), (3, 0.6), (6, 0.75), (10, 0.7), (12, 0.6)):
                M('trom', T(b, st) + jit(), K.trommel('taiko', v), -0.35)
                M('trom', T(b, st) + 0.005 + jit(), K.trommel('tom_t', v * 0.7), 0.35)
        if i in (3, 7) and not halb:
            for k, art in enumerate(('tom_h', 'tom_h', 'tom_m', 'tom_t')):
                M('trom', T(b, 12 + k) + jit(), K.trommel(art, 0.6 + 0.1 * k), 0.4 - 0.25 * k)
        # Becken, Anstiege, Einschläge
        if b in (0, 16, 32, 48):
            M('becken', T(b), K.crash(1.0), 0.3)
            M('tief', T(b), K.einschlag(0.9, 70, 32, 1.5), 0)
        if b in (8, 24, 40):
            M('becken', T(b), K.crash(0.6), -0.3)
        if b in (15, 47):
            M('fx', T(b) + takt - 1.4, K.rueckwaerts_becken(1.4, 0.8), 0)
        if b in (30, 54):
            M('fx', T(b), K.anstieg(2 * takt, 1.0, ton=mton(47)), 0)
        # --- Bass ---
        if halb and not aufbau:
            for st in (0, 8):
                M('bass', T(b, st), K.bass(bass, 7 * s16, 0.85, hell=0.4), 0)
        else:
            for st, ln, off in AR_BASS[(dur, i % 2)]:
                o = 4 if (dur == 'd' and off == 3) else off
                M('bass', T(b, st) + jit(1), K.bass(bass + o, ln * s16 * 0.9, 1.0 if st in (0, 8) else 0.8, hell=0.65), 0)
        # --- Zupfinstrument ---
        if teil != 'R4' or i < 6:
            base = 48 + bass % 12 if bass % 12 >= 4 else 60 + bass % 12 - 12
            for st in range(16):
                acc = 1.0 if st in (0, 3, 6, 8, 11, 14) else 0.6
                if halb:
                    acc *= 0.8
                m = base + AR_ZUPF[dur][st]
                M('zupf', T(b, st) + jit(2), K.zupf(m, acc, nachhall=1.1, hell=0.6), 0.35 if st % 2 else -0.15)
        # --- Blechstöße ---
        if teil in ('R3', 'R5', 'R6'):
            stoss = [(0, 0.95), (6, 0.7)] if i % 2 == 0 else [(0, 0.8), (14, 0.85)]
            for st, v in stoss:
                for m in voicing(pcs, 52, 69, 4):
                    M('blech', T(b, st) + jit(), K.blech(m, 0.26, v, stimmen=2, stoss=True, hell=1.0), K.r(-0.4, 0.4))
                M('blech', T(b, st), K.blech(bass + 12, 0.28, v, stimmen=2, stoss=True, hell=0.85), 0)
        if teil == 'R7' and i % 2 == 1:
            for m in voicing(pcs, 52, 69, 4):
                M('blech', T(b, 14) + jit(), K.blech(m, 0.24, 0.8, stimmen=2, stoss=True, hell=1.0), K.r(-0.4, 0.4))
        # --- Hörner (halbes Tempo) ---
        if halb and i % 2 == 0:
            for m in voicing(pcs, 47, 66, 4):
                M('horn', T(b) + jit(), K.blech(m, 2 * takt - 0.25, 0.9, stimmen=3, cent=7, a=0.12, hell=0.85), K.r(-0.35, 0.35))
        # --- Streicher-Fläche ---
        if teil in ('R3', 'R5', 'R6') and i % 2 == 0 or teil == 'R4':
            dd = (2 * takt if teil != 'R4' else takt) - 0.1
            for m in voicing(pcs, 52, 71, 4):
                M('pad', T(b), K.streich(m, dd, 0.4, stimmen=4, cent=7, a=0.25, d=0.5, s=0.9, r=0.3, p=1.25, vib=8, trem=1 if halb else 0,
                                         bpm=bpm, cache=False), K.r(-0.5, 0.5))
    # Melodien
    for q in range(len(AR_PLAN)):
        teil = AR_PLAN[q][0]
        pb = q * 8
        t0 = T(pb)
        if teil in ('R2', 'R5'):
            M('erhu', t0, K.erhu(AR_MOTIV, beat, 1.0), -0.1)
        if teil == 'R5':
            M('dizi', t0, K.dizi([(s, d, m + 12) for s, d, m in AR_MOTIV], beat, 0.75), 0.25)
        if teil == 'R3':
            M('dizi', t0, K.dizi(AR_FLOETE, beat, 0.9), 0.2)
        if teil == 'R6':
            M('erhu', t0, K.erhu(AR_MOTIV, beat, 0.9), -0.15)
            for s, d, m in AR_MOTIV:
                M('horn', t0 + s * beat + jit(), K.blech(m - 12, d * beat * 0.95, 0.85, stimmen=3, cent=7, a=0.03, hell=0.9), 0.15)
    return M, takt


def arena_mix():
    raeume = {'arena': hall_ir(np.random.default_rng(27), (2.3, 2.0, 1.5, 0.8), 3.2, 0.03, 0.25),
              'raum': hall_ir(np.random.default_rng(28), (0.9, 0.8, 0.6, 0.35), 1.3, 0.006, 0.35)}
    specs = {
        'kick': dict(eq=kette(_sos('hp', 38), eq_spitze(100, 1.5, 0.9), eq_spitze(350, -3, 1.0), eq_spitze(3500, 3, 1.0)), ziel=-20, hall={'raum': 0.15}),
        'snare': dict(eq=kette(_sos('hp', 120), eq_spitze(220, 2, 1.0), eq_spitze(4500, 2, 0.9)), ziel=-22, hall={'raum': 0.35, 'arena': 0.25}),
        'klatsch': dict(eq=_sos('hp', 300), ziel=-25, hall={'raum': 0.3, 'arena': 0.35}),
        'menge': dict(eq=_sos('hp', 300), ziel=-27, hall={'arena': 0.9}),
        'hats': dict(eq=_sos('hp', 5000), ziel=-28, hall={'raum': 0.2}),
        'shaker': dict(eq=_sos('hp', 3000), ziel=-31, hall={'raum': 0.3}),
        'trom': dict(eq=kette(_sos('hp', 40), eq_spitze(300, -2, 1.0), eq_spitze(2000, 2, 1.0)), ziel=-23, hall={'raum': 0.3, 'arena': 0.3}),
        'becken': dict(ziel=-27, hall={'arena': 0.4}),
        'tief': dict(eq=kette(_sos('lp', 150), _sos('hp', 30)), ziel=-27),
        'fx': dict(eq=_sos('hp', 150), ziel=-28, hall={'arena': 0.5}),
        'bass': dict(eq=kette(_sos('hp', 35), eq_spitze(110, 1.5, 1.0), eq_spitze(900, 2, 1.0), _sos('lp', 5000)), ziel=-20.5, hall={'raum': 0.05}),
        'zupf': dict(eq=kette(_sos('hp', 140), eq_spitze(400, 2, 1.2), eq_spitze(2500, 2, 1.0)), ziel=-22.5, hall={'arena': 0.35, 'raum': 0.2}),
        'erhu': dict(eq=kette(_sos('hp', 180), _sos('lp', 7000)), ziel=-20.5, hall={'arena': 0.45}),
        'dizi': dict(eq=kette(_sos('hp', 250), _sos('lp', 9000)), ziel=-23, hall={'arena': 0.5}),
        'blech': dict(eq=kette(_sos('hp', 110), eq_spitze(1400, 2.5, 1.0), _sos('lp', 7500)), ziel=-23, hall={'arena': 0.4}),
        'horn': dict(eq=kette(_sos('hp', 90), eq_spitze(1200, 2, 1.0), _sos('lp', 6000)), ziel=-22, hall={'arena': 0.6}),
        'pad': dict(eq=kette(_sos('hp', 160), _sos('lp', 6000)), ziel=-25.5, hall={'arena': 0.7}),
    }
    master = dict(eq=kette(_sos('hp', 32, 2), eq_kuhle(75, -4.0), eq_spitze(330, 2.0, 0.7), eq_kuhle(3000, 1.0, hoch=True)),
                  schwelle=-16, ratio=2.2, treiben=1.2)
    return specs, raeume, master


# === Feuerberg: Glut (glut) und Vulkan (vulkan) ==========================================================================
# Zwei Stücke für den Feuerberg (Basalt und Lavaseen), die das Spiel im Wechsel mit dem bisherigen Stück der heißen
# Gegenden spielt (Reihe vulkan → glut → heiss, MUSIC_REIHE in js/klang-dateien.js). Glühende Lava, Hitze, ein Berg, der
# arbeitet – mit dem fernöstlichen Klang des Spiels (Erhu, Bambusflöte, Koto), großen Trommeln, tiefem Blech und Chor.
# Musik zum Farmen: treibend, aber nicht so dicht wie Boss- oder Arenamusik.

def akkord_lauf(akk, i):
    """Takte, die der Akkord ab Takt i liegt (0, wenn er schon im Takt davor lag)."""
    if i > 0 and akk[i - 1] == akk[i]:
        return 0
    n = 1
    while i + n < len(akk) and akk[i + n] == akk[i]:
        n += 1
    return n


def tremolo(M, K, spur, t, midi, dauer, beat, vel=0.5, pan=0.0, dichte=8, nachhall=0.55, hell=0.6):
    """Tremolo eines Zupfinstruments (wie die Pipa): „dichte“ Anschläge je Schlag, weich an- und abschwellend."""
    n = max(1, int(round(dauer / beat * dichte)))
    for k in range(n):
        u = k / max(1, n - 1)
        v = vel * (0.72 + 0.28 * np.sin(np.pi * u)) * (1.0 if k % 2 == 0 else 0.82)
        M(spur, t + k * beat / dichte + K.r(-0.004, 0.004), K.zupf(midi, v, nachhall=nachhall, hell=hell), pan)


# --- Glut (glut): e-Moll fünftönig, 100 BPM, 48 Takte (115,2 s) ----------------------------------------------------------
# Fasstrommeln im Muster 3+3, große Trommel auf 1 und 3, kleine Trommel und Holzblock in Achteln, eine Koto in rollenden
# Sechzehnteln, tiefe Streicher in Achteln; darüber singt die Erhu ein fünftöniges Thema. Teile: G1 (Groove, Funken der
# Flöte), G2 (Thema der Erhu, leise Hörner), G3 (die Flöte ruft, die Erhu antwortet: C – D – h – a – G – D – C – H),
# G4 (halbes Tempo: Gong, tiefes Blech und Männerchor, Koto im Tremolo, die Erhu singt ein Lied über a – F – e – C – H,
# das F-Dur ist der phrygische Glutschimmer), G5 (Thema mit der Flöte eine Oktave darüber, Blechstöße, Chor), G6 (das
# Thema auf der Koto, lange Töne im Tremolo, die Flöte als Gegenstimme; Wirbel und Anstieg auf H-Dur in den Anfang).
# Die letzten zwei Takte sind auch das Vorspiel.
GL_AKK = {'Em': (40, (4, 7, 11)), 'C': (36, (0, 4, 7)), 'D': (38, (2, 6, 9)), 'G': (43, (7, 11, 2)), 'Am': (45, (9, 0, 4)),
          'Bm': (35, (11, 2, 6)), 'B': (35, (11, 3, 6)), 'F': (41, (5, 9, 0))}
_GA = ['Em', 'C', 'Em', 'D', 'G', 'D', 'Am', 'Em']
GL_PLAN = [('G1', ['Em', 'Em', 'C', 'C', 'Am', 'Am', 'B', 'B']), ('G2', _GA), ('G3', ['C', 'D', 'Bm', 'Am', 'G', 'D', 'C', 'B']),
           ('G4', ['Am', 'Am', 'F', 'F', 'Em', 'Em', 'C', 'B']), ('G5', _GA), ('G6', _GA[:7] + ['B'])]
# Thema (Erhu): [Beginn in Schlägen ab Teilbeginn, Dauer, MIDI]
GL_THEMA = [(0, 0.75, 64), (0.75, 0.75, 67), (1.5, 0.5, 69), (2, 2, 71), (4, 0.5, 74), (4.5, 0.5, 71), (5, 1, 69), (6, 1, 67), (7, 1, 69),
            (8, 0.75, 64), (8.75, 0.75, 67), (9.5, 0.5, 69), (10, 1, 74), (11, 1, 71), (12, 3, 69), (15, 0.5, 67), (15.5, 0.5, 69),
            (16, 0.75, 71), (16.75, 0.75, 74), (17.5, 0.5, 76), (18, 2, 79), (20, 0.5, 81), (20.5, 0.5, 79), (21, 1, 76), (22, 1, 74),
            (23, 1, 76), (24, 1, 74), (25, 0.5, 71), (25.5, 0.5, 69), (26, 1.5, 71), (27.5, 0.5, 67), (28, 4, 64)]
# Teil G3: die Flöte ruft (Takte 1–2, 5–6), die Erhu antwortet (3–4, 7–8)
GL_RUF = [(0, 1, 79), (1, 0.5, 81), (1.5, 0.5, 79), (2, 1, 76), (3, 1, 74), (4, 1.5, 76), (5.5, 0.5, 79), (6, 2, 81),
          (16, 1, 83), (17, 0.5, 81), (17.5, 0.5, 79), (18, 1, 81), (19, 1, 79), (20, 1.5, 78), (21.5, 0.5, 76), (22, 2, 74)]
GL_ANTWORT = [(8, 1, 71), (9, 1, 74), (10, 1.5, 78), (11.5, 0.5, 76), (12, 2, 76), (14, 1, 72), (15, 1, 69),
              (24, 1, 76), (25, 1, 74), (26, 1, 72), (27, 1, 71), (28, 4, 75)]
# Teil G4: Lied der Erhu im halben Tempo
GL_LIED = [(0, 3, 76), (3, 1, 74), (4, 2, 72), (6, 2, 69), (8, 3, 72), (11, 1, 74), (12, 4, 76), (16, 2, 79), (18, 1, 78), (19, 1, 76),
           (20, 3, 71), (23, 1, 74), (24, 2, 76), (26, 2, 79), (28, 3, 78), (31, 1, 75)]
# Teil G1: Funken (kurze Läufe der Flöte); Teil G6: Gegenstimme der Flöte (lange Töne, eine Oktave höher gespielt)
GL_FUNKEN = [(10, 0.25, 76), (10.25, 0.25, 79), (10.5, 0.25, 81), (10.75, 0.25, 83), (11, 1.5, 84),
             (26, 0.25, 75), (26.25, 0.25, 78), (26.5, 0.25, 81), (26.75, 0.25, 83), (27, 1.5, 87)]
GL_GEGEN = [(0, 4, 71), (4, 3, 72), (7, 1, 71), (8, 4, 67), (12, 4, 69), (16, 3, 71), (19, 1, 74), (20, 4, 69), (24, 4, 72), (28, 4, 75)]
# tiefe Streicher (Achtel, Abstand zum Grundton der oberen Stimme), Fasstrommeln und Koto (Sechzehntel, Akkordton)
GL_OST = [0, 0, 12, 0, 0, 12, 7, 12]
GL_TAIKO = [(0, 0.95), (3, 0.6), (6, 0.8), (10, 0.65), (12, 0.85)]
GL_KOTO = [(0, 0), (2, 2), (3, 1), (6, 3), (8, 0), (10, 2), (11, 1), (14, 4)]


def glut():
    K = Klang(4401)
    TA, TB = 0.958, 1.14  # Fasstrommeln auf e-Moll gestimmt: E2 und G2 (das Paar)
    bpm = 100
    beat = 60 / bpm
    takt = 4 * beat
    s16 = beat / 4
    N = sum(len(p[1]) for p in GL_PLAN)
    M = Mischer(int(round(N * takt * SR)))

    def T(b, st=0.0):
        """Takt b, Sechzehntel st"""
        return (b * 16 + st) * s16

    def jit(ms=4):
        return K.r(-ms, ms) / 1000

    spic = dict(stimmen=3, cent=7, a=0.007, d=0.07, s=0.42, r=0.08, p=1.1)
    for b in range(N):
        teil, akk = GL_PLAN[b // 8]
        i = b % 8
        name = akk[i]
        bass, pcs = GL_AKK[name]
        L = akkord_lauf(akk, i)
        halb = teil == 'G4'
        voll = teil in ('G3', 'G5')
        # --- tiefe Streicher ---
        if not halb:
            for k in range(8):
                acc = 1.0 if k in (0, 4) else 0.75 if k in (3, 6) else 0.55
                t = T(b, 2 * k)
                M('ost', t + jit(), K.streich(bass + 12 + GL_OST[k], 0.17, acc, **spic), -0.3)
                M('ost', t + jit(), K.streich(bass, 0.17, acc, **spic), 0.25)
        else:
            for m, pan in ((bass, 0.25), (bass + 12, -0.3)):
                M('ost', T(b), K.streich(m, takt - 0.06, 0.45, stimmen=4, cent=6, a=0.12, d=0.5, s=0.85, r=0.15, p=1.2, vib=4, trem=1,
                                         bpm=bpm, cache=False), pan)
        # --- Trommeln ---
        if not halb:
            M('trom', T(b) + jit(2), K.trommel('odaiko', 1.0 if voll else 0.85), K.r(-0.1, 0.1))
            M('trom', T(b, 8) + jit(2), K.trommel('odaiko', 0.65), K.r(-0.1, 0.1))
            if i % 2 == 1 and i != 7:
                M('trom', T(b, 14) + jit(2), K.trommel('odaiko', 0.45), 0.1)
            for st, v in GL_TAIKO:
                if i == 7 and st >= 8:
                    continue  # Platz für den Wirbel
                v *= 0.92 if teil == 'G1' else 1.0
                M('trom', T(b, st) + jit(), K.trommel('taiko', v, TA), -0.35)
                M('trom', T(b, st) + 0.006 + jit(), K.trommel('taiko', v * 0.85, TB), 0.35)
            for st in range(0, 16, 2):
                v = (0.45 if st in (4, 12) else 0.24) * (0.9 if teil == 'G1' else 1.0)
                M('shime', T(b, st) + jit(3), K.trommel('shime', v), 0.45)
                if voll:
                    M('shime', T(b, st + 1) + jit(3), K.trommel('shime', 0.12), 0.45)
            if teil in ('G1', 'G3', 'G6'):
                for st, f in ((2, 1050), (6, 820), (10, 1050), (14, 820)):
                    M('holz', T(b, st) + jit(3), K.holz(0.5 if f < 900 else 0.38, f), -0.4 if f > 900 else -0.2)
            if i == 3:
                for k, art in enumerate(('tom_h', 'tom_h', 'tom_m', 'tom_t')):
                    M('trom', T(b, 12 + k) + jit(), K.trommel(art, 0.5 + 0.08 * k, TA if art == 'taiko' else 1.0), 0.4 - 0.25 * k)
            if i == 7:
                # Wirbel in den nächsten Teil (am Ende der Schleife länger und kräftiger)
                ab = 4 if b == N - 1 else 8
                for k in range(16 - ab):
                    art = ('taiko', 'tom_h', 'taiko', 'tom_m', 'taiko', 'tom_t')[k % 6] if k < 15 - ab else 'odaiko'
                    v = 0.45 + 0.5 * k / (15 - ab)
                    M('trom', T(b, ab + k) + jit(), K.trommel(art, v, TA if art == 'taiko' else 1.0), 0.4 - 0.8 * k / (15 - ab))
        else:
            # halbes Tempo: große Trommel auf 1, Fasstrommeln auf 3, zum Ende ein Wirbel
            M('trom', T(b) + jit(2), K.trommel('odaiko', 0.95), 0)
            M('trom', T(b, 8) + jit(), K.trommel('taiko', 0.8, TA), -0.35)
            M('trom', T(b, 8) + 0.006 + jit(), K.trommel('taiko', 0.7, TB), 0.35)
            if i in (1, 3, 5):
                M('trom', T(b, 14) + jit(2), K.trommel('odaiko', 0.45), 0.1)
            if i == 3:
                for k, art in enumerate(('tom_m', 'tom_m', 'tom_t', 'tom_t')):
                    M('trom', T(b, 12 + k) + jit(), K.trommel(art, 0.4 + 0.07 * k, TA if art == 'taiko' else 1.0), 0.3 - 0.2 * k)
            if i == 6:
                for k in range(8):
                    M('trom', T(b, 2 * k) + jit(), K.trommel('taiko', 0.3 + 0.04 * k, TA), -0.3 if k % 2 else 0.3)
            if i == 7:
                for k in range(16):
                    art = 'taiko' if k < 12 else ('tom_h', 'tom_m', 'tom_t', 'odaiko')[k - 12]
                    M('trom', T(b, k) + jit(), K.trommel(art, 0.4 + 0.55 * k / 15, TA if art == 'taiko' else 1.0), -0.35 if k % 2 else 0.35)
                    M('shime', T(b, k) + jit(2), K.trommel('shime', 0.15 + 0.3 * k / 15), 0.45)
        # --- Becken, Gong, Einschläge, Anstiege ---
        if b in (0, 32):
            M('becken', T(b), K.crash(1.0 if b == 32 else 0.75), 0.25)
            M('tief', T(b), K.einschlag(1.0 if b == 32 else 0.7, 62, 30, 1.8), 0)
        if b in (8, 16, 40):
            M('becken', T(b), K.crash(0.55), -0.25)
        if b == 24:
            M('gong', T(b), K.gong(1.0), -0.15)
            M('tief', T(b), K.einschlag(0.8, 55, 28, 2.2), 0)
        if b == 15:
            M('fx', T(b) + takt - 1.6, K.rueckwaerts_becken(1.6, 0.7), 0)
        if b in (30, 46):
            M('fx', T(b), K.anstieg(2 * takt, 0.85 if b == 30 else 1.0, ton=mton(47)), 0)
        if b == N - 1:
            M('fx', T(b) + takt - 1.8, K.rueckwaerts_becken(1.8, 0.8), 0)
        # --- Koto (unter der Melodie, wenn Erhu oder Flöte singen) ---
        tones = lage(pcs, 62, 90) if teil == 'G1' else lage(pcs, 50, 80)
        if teil in ('G1', 'G2', 'G5'):
            for st, s in GL_KOTO:
                acc = (1.0 if st in (0, 3, 6, 8) else 0.7) * (1.0 if teil == 'G1' else 0.85)
                M('zupf', T(b, st) + jit(2), K.zupf(tones[s], acc, nachhall=1.2, hell=0.55), 0.35 if st % 4 else -0.2)
        if teil == 'G3':
            for k, s in enumerate((1, 3, 2, 4, 1, 3, 2, 5)):
                M('zupf', T(b, 2 * k) + jit(2), K.zupf(tones[s], 0.9 if k % 2 == 0 else 0.65, nachhall=1.3, hell=0.55), 0.3 if k % 2 else -0.25)
        if halb:
            oben = voicing(pcs, 64, 81, 4)
            for h, s in ((0, -1), (8, -2)):
                tremolo(M, K, 'zupf', T(b, h), oben[s], 2 * beat - 0.05, beat, 0.42 + 0.04 * (i % 4), 0.3)
        # --- Blech ---
        if teil in ('G2', 'G3', 'G6') and L:
            for m in voicing(pcs, 52, 64, 3):
                M('blech', T(b) + jit(), K.blech(m, L * takt - 0.3, 0.4, stimmen=2, a=0.9, hell=0.45), K.r(-0.3, 0.3))
        if teil == 'G3':
            for m in voicing(pcs, 52, 67, 4):
                M('blech', T(b) + jit(), K.blech(m, 0.3, 0.6, stimmen=2, stoss=True, hell=0.9), K.r(-0.35, 0.35))
        if halb:
            for m in voicing(pcs, 40, 59, 4):
                M('tiefblech', T(b) + jit(), K.blech(m, takt - 0.1, 0.6, stimmen=2, a=0.6, hell=0.5, r=0.3), K.r(-0.3, 0.3))
        if teil == 'G5':
            for st, v in ((0, 0.9), (6, 0.65), (10, 0.75)):
                if i == 7 and st > 0:
                    continue
                for m in voicing(pcs, 52, 69, 4):
                    M('blech', T(b, st) + jit(), K.blech(m, 0.3, v, stimmen=2, stoss=True, hell=0.95), K.r(-0.35, 0.35))
                M('blech', T(b, st), K.blech(bass + 12, 0.32, v, stimmen=2, stoss=True, hell=0.8), 0)
        # --- Chor ---
        if halb and L:
            for m in voicing(pcs, 45, 62, 4):
                M('chor_o', T(b), K.chor(m, L * takt - 0.15, 0.6), K.r(-0.4, 0.4))
            if i >= 4:
                for m in voicing(pcs, 60, 76, 3):
                    M('chor_a', T(b), K.chor(m, L * takt - 0.15, 0.4), K.r(-0.5, 0.5))
        if teil == 'G5':
            for m in voicing(pcs, 57, 76, 4):
                M('chor_a', T(b), K.chor(m, takt - 0.1, 0.6, a=0.3, r=0.5), K.r(-0.6, 0.6))
        # --- hohe Streicher ---
        if L and teil in ('G1', 'G3', 'G5', 'G6'):
            for m in voicing(pcs, 67, 84, 3):
                M('vl', T(b), K.streich(m, L * takt - 0.1, 0.26 if teil == 'G1' else 0.32, stimmen=4, cent=6, a=0.3, d=0.5, s=0.9, r=0.35, p=1.3, vib=8,
                                        trem=1 if teil == 'G5' else 0, bpm=bpm, cache=False), K.r(-0.5, 0.5))
        if L and halb:
            for m in voicing(pcs, 60, 79, 4):
                M('vl', T(b), K.streich(m, L * takt - 0.1, 0.27, stimmen=4, cent=6, a=0.6, d=0.6, s=0.9, r=0.5, p=1.3, vib=10,
                                        cache=False), K.r(-0.5, 0.5))
    # Melodien (je Teil einmal, über acht Takte)
    for q in range(len(GL_PLAN)):
        teil = GL_PLAN[q][0]
        t0 = T(q * 8)
        if teil == 'G1':
            M('dizi', t0, K.dizi(GL_FUNKEN, beat, 0.7), 0.25)
        if teil == 'G2':
            M('erhu', t0, K.erhu(GL_THEMA, beat, 0.9), -0.1)
        if teil == 'G3':
            M('dizi', t0, K.dizi(GL_RUF, beat, 0.85), 0.25)
            M('erhu', t0, K.erhu(GL_ANTWORT, beat, 0.9), -0.15)
        if teil == 'G4':
            M('erhu', t0, K.erhu(GL_LIED, beat, 0.8, vib=26), -0.05)
        if teil == 'G5':
            M('erhu', t0, K.erhu(GL_THEMA, beat, 1.0), -0.1)
            M('dizi', t0, K.dizi([(s, d, m + 12) for s, d, m in GL_THEMA], beat, 0.55), 0.25)
        if teil == 'G6':
            # Thema auf der Koto: kurze Töne gezupft, lange im Tremolo
            for s, d, m in GL_THEMA:
                if d >= 1.5:
                    tremolo(M, K, 'zupf', t0 + s * beat, m, d * beat - 0.05, beat, 0.7, 0.1)
                else:
                    M('zupf', t0 + s * beat + jit(2), K.zupf(m, 0.95, nachhall=1.4, hell=0.6), 0.1)
            M('dizi', t0, K.dizi([(s, d, m + 12) for s, d, m in GL_GEGEN], beat, 0.55), 0.3)
    return M, takt


def glut_mix():
    raeume = {'gross': hall_ir(np.random.default_rng(47), (2.6, 2.2, 1.6, 0.8), 3.4, 0.024, 0.22),
              'raum': hall_ir(np.random.default_rng(48), (1.1, 0.95, 0.7, 0.4), 1.6, 0.007, 0.3)}
    specs = {
        'ost': dict(eq=kette(_sos('hp', 38), eq_spitze(240, 1.5, 1.0), eq_spitze(520, -3, 1.2), eq_spitze(1800, 2, 0.9), _sos('lp', 5500)),
                    ziel=-22, hall={'gross': 0.3}),
        'trom': dict(eq=kette(_sos('hp', 38), eq_spitze(300, -2, 1.0), eq_spitze(2000, 2, 1.0)), ziel=-20.5, hall={'raum': 0.35, 'gross': 0.2}),
        'shime': dict(eq=_sos('hp', 200), ziel=-28, hall={'raum': 0.4, 'gross': 0.2}),
        'holz': dict(eq=_sos('hp', 400), ziel=-29, hall={'raum': 0.45, 'gross': 0.2}),
        'zupf': dict(eq=kette(_sos('hp', 140), eq_spitze(400, 2, 1.2), eq_spitze(2500, 2, 1.0)), ziel=-22.5, hall={'gross': 0.35, 'raum': 0.2}),
        'erhu': dict(eq=kette(_sos('hp', 180), _sos('lp', 7000)), ziel=-20, hall={'gross': 0.45}),
        'dizi': dict(eq=kette(_sos('hp', 250), _sos('lp', 9000)), ziel=-22.5, hall={'gross': 0.5}),
        'blech': dict(eq=kette(_sos('hp', 45), eq_spitze(320, -2.5, 1.0), eq_spitze(1400, 2.5, 1.0), _sos('lp', 6500)), ziel=-23.5, hall={'gross': 0.55}),
        'tiefblech': dict(eq=kette(_sos('hp', 40), eq_spitze(320, -2.5, 1.0), eq_spitze(1200, 2, 1.0), _sos('lp', 5500)), ziel=-24.5, hall={'gross': 0.6}),
        'chor_o': dict(eq=_sos('hp', 110), vokal='o', ziel=-25.5, hall={'gross': 0.9}),
        'chor_a': dict(eq=_sos('hp', 160), vokal='a', ziel=-24, hall={'gross': 0.9}),
        'vl': dict(eq=kette(_sos('hp', 230), eq_spitze(3200, -1, 1.0), _sos('lp', 9000)), ziel=-25, hall={'gross': 0.8}),
        'becken': dict(ziel=-27, hall={'gross': 0.4}),
        'gong': dict(eq=_sos('hp', 40), ziel=-25, hall={'gross': 0.6}),
        'tief': dict(eq=kette(_sos('lp', 140), _sos('hp', 30)), ziel=-27),
        'fx': dict(eq=_sos('hp', 150), ziel=-28, hall={'gross': 0.6}),
    }
    master = dict(eq=kette(_sos('hp', 32, 2), eq_kuhle(90, -3.0), eq_spitze(300, -1.5, 0.8), eq_spitze(1300, 1.5, 0.9),
                           eq_kuhle(2400, 3.0, hoch=True)), schwelle=-16, ratio=2.3, treiben=1.15)
    return specs, raeume, master


# --- Vulkan (vulkan): h-Moll mit phrygischem C, 84 BPM, 40 Takte (114,3 s) -----------------------------------------------
# Dunkler und wuchtiger: tiefes Blech, Männerchor, Gong, die Ambosse der Schmiede und das Grollen des Bergs. Leitmotiv
# ist sein Stöhnen h – c – h (kleine Sekunde), in Flöte, Thema, Riff und Koto. Teile: V1 (Grollen: Herzschlag der großen
# Trommel, tiefe Streicher im Tremolo, Chor „u“, die Bambusflöte tief und rauchig), V2 (der Berg setzt sich in Gang:
# Riff im tiefen Blech, Fasstrommeln, Koto, Chor „o“), V3 (Thema in Hörnern und Posaunen, die Flöte antwortet,
# Ambosse), V4 (Glutkammer: halbes Tempo, Gong, Koto im Tremolo, Chor „u“, die Erhu singt fünftönig über G – D – e – C),
# V5 (Ausbruch: Thema mit Erhu und Chor in der Oktave, alles; im vorletzten Takt die Steigerung über C-Dur, im letzten der
# Schlag des Ausbruchs mit Gong und Chorcluster h/c, der in das Grollen des Anfangs ausklingt).
# Die letzten zwei Takte sind auch das Vorspiel.
VK_AKK = {'Bm': (35, (11, 2, 6)), 'C': (36, (0, 4, 7)), 'G': (43, (7, 11, 2)), 'Em': (40, (4, 7, 11)), 'F#': (42, (6, 10, 1)),
          'D/F#': (42, (2, 6, 9))}
_V1 = ['Bm', 'Bm', 'C', 'Bm', 'G', 'Em', 'C', 'F#']
_V3 = ['Bm', 'G', 'Em', 'F#', 'Bm', 'G', 'C', 'Bm']
VK_PLAN = [('V1', _V1), ('V2', _V1), ('V3', _V3), ('V4', ['G', 'D/F#', 'Em', 'C', 'G', 'D/F#', 'C', 'F#']), ('V5', _V3)]
# Thema (Hörner, Posaunen eine Oktave tiefer; im Ausbruch die Erhu eine Oktave höher)
VK_THEMA = [(0, 2, 59), (2, 1, 60), (3, 1, 59), (4, 1.5, 67), (5.5, 0.5, 66), (6, 1, 64), (7, 1, 62), (8, 1.5, 64), (9.5, 0.5, 66),
            (10, 1, 67), (11, 1, 64), (12, 4, 66), (16, 2, 59), (18, 1, 60), (19, 1, 59), (20, 1.5, 71), (21.5, 0.5, 69), (22, 1, 67),
            (23, 1, 66), (24, 1, 64), (25, 1, 67), (26, 2, 72), (28, 4, 71)]
# V1: die Bambusflöte, tief und rauchig; V3: ihre Antworten, wenn das Blech hält
VK_RAUCH = [(1, 1, 71), (2, 0.5, 72), (2.5, 1.5, 71), (4, 1, 66), (5, 0.5, 67), (5.5, 2.5, 64), (9, 1, 72), (10, 0.5, 71), (10.5, 1.5, 67),
            (12, 1, 64), (13, 1, 66), (14, 2, 71), (17, 1, 74), (18, 0.5, 76), (18.5, 1.5, 74), (20, 1, 71), (21, 0.5, 72), (21.5, 2.5, 67),
            (25, 1, 76), (26, 0.5, 79), (26.5, 1.5, 76), (28, 1, 73), (29, 1, 70), (30, 2, 66)]
VK_ANTWORT = [(13, 0.5, 78), (13.5, 0.5, 79), (14, 0.5, 78), (14.5, 0.5, 76), (15, 1, 73), (29, 0.5, 83), (29.5, 0.5, 84), (30, 2, 83)]
# V4: Lied der Erhu in der Glutkammer
VK_KLAGE = [(0, 1.5, 74), (1.5, 0.5, 76), (2, 2, 79), (4, 1, 78), (5, 1, 76), (6, 2, 74), (8, 1.5, 71), (9.5, 0.5, 74), (10, 1, 76),
            (11, 1, 79), (12, 3, 76), (15, 1, 72), (16, 1.5, 74), (17.5, 0.5, 76), (18, 2, 83), (20, 1, 81), (21, 1, 78), (22, 2, 76),
            (24, 1, 79), (25, 1, 76), (26, 2, 71), (28, 2, 70), (30, 2, 73)]
# Riff im tiefen Blech: (Schlag, Dauer in Schlägen, Nachbarton?, Stärke); Nachbarton je Akkord (Halbtöne)
VK_RIFF = [(0, 1.25, 0, 1.0), (1.5, 0.5, 0, 0.7), (2.5, 0.5, 0, 0.6), (3, 0.5, 1, 0.8), (3.5, 0.5, 0, 0.6)]
VK_NACHBAR = {'Bm': 1, 'C': -1, 'G': 2, 'Em': 2, 'F#': 1, 'D/F#': 1}
VK_TAIKO = [(0, 1.0), (3, 0.5), (6, 0.8), (8, 0.9), (11, 0.5), (14, 0.65)]


def vulkan():
    K = Klang(4501)
    TA, TB = 1.0756, 0.8535  # Fasstrommeln auf h-Moll gestimmt: Fis2 und D2 (das Paar)
    bpm = 84
    beat = 60 / bpm
    takt = 4 * beat
    s16 = beat / 4
    N = sum(len(p[1]) for p in VK_PLAN)
    M = Mischer(int(round(N * takt * SR)))

    def T(b, st=0.0):
        """Takt b, Sechzehntel st"""
        return (b * 16 + st) * s16

    def jit(ms=4):
        return K.r(-ms, ms) / 1000

    spic = dict(stimmen=3, cent=8, a=0.008, d=0.08, s=0.45, r=0.09, p=1.1)
    for b in range(N):
        teil, akk = VK_PLAN[b // 8]
        i = b % 8
        name = akk[i]
        bass, pcs = VK_AKK[name]
        L = akkord_lauf(akk, i)
        nb = VK_NACHBAR[name]
        wucht = teil in ('V3', 'V5')
        ausbruch = b == N - 1
        steig = teil == 'V5' and i == 6
        # --- tiefe Streicher ---
        if teil in ('V1', 'V4'):
            if L:
                for m, pan in ((bass, 0.25), (bass + 12, -0.3)):
                    M('ost', T(b), K.streich(m, L * takt - 0.06, 0.6 if teil == 'V1' else 0.48, stimmen=4, cent=7, a=0.25, d=0.5, s=0.9, r=0.25, p=1.2, vib=4,
                                             trem=1 if teil == 'V1' else 0, bpm=bpm, cache=False), pan)
        elif ausbruch:
            for m, pan in ((bass, 0.25), (bass + 12, -0.3)):
                M('ost', T(b), K.streich(m, takt - 0.1, 1.0, stimmen=4, cent=9, a=0.01, d=0.5, s=0.35, r=0.6, p=1.1, vib=3, cache=False), pan)
        else:
            for k in range(8):
                acc = 1.0 if k in (0, 3) else 0.6 if k in (5, 6) else 0.45
                if steig:
                    acc = 0.55 + 0.45 * k / 7
                t = T(b, 2 * k)
                M('ost', t + jit(), K.streich(bass + 12, 0.2, acc, **spic), -0.3)
                M('ost', t + jit(), K.streich(bass, 0.2, acc, **spic), 0.25)
        # --- Trommeln ---
        if teil == 'V1':
            M('trom', T(b) + jit(2), K.trommel('odaiko', 0.9), 0)
            M('trom', T(b, 3) + jit(2), K.trommel('odaiko', 0.5), 0.1)
            M('trom', T(b, 8) + jit(), K.trommel('taiko', 0.4 + 0.05 * i, TA), -0.3)
            M('trom', T(b, 8) + 0.006 + jit(), K.trommel('taiko', 0.35 + 0.045 * i, TB), 0.3)
            if i % 2 == 1:
                M('trom', T(b, 14) + jit(), K.trommel('taiko', 0.3 + 0.04 * i, TA), 0.2)
            if i == 7:
                for k in range(8):
                    M('trom', T(b, 8 + k) + jit(), K.trommel(('taiko', 'tom_t')[k % 2], 0.4 + 0.07 * k), 0.3 - 0.08 * k)
        elif teil == 'V4':
            M('trom', T(b) + jit(2), K.trommel('odaiko', 0.9 if i % 2 == 0 else 0.6), 0)
            if i % 2 == 1:
                M('trom', T(b, 8) + jit(), K.trommel('taiko', 0.6, TA), -0.35)
                M('trom', T(b, 8) + 0.006 + jit(), K.trommel('taiko', 0.5, TB), 0.35)
            if i == 3:
                for k, art in enumerate(('tom_m', 'tom_m', 'tom_t', 'tom_t')):
                    M('trom', T(b, 12 + k) + jit(), K.trommel(art, 0.35 + 0.07 * k, TA if art == 'taiko' else 1.0), 0.3 - 0.2 * k)
            if i == 6:
                for k in range(8):
                    M('trom', T(b, 2 * k) + jit(), K.trommel('taiko', 0.3 + 0.05 * k, TA), -0.3 if k % 2 else 0.3)
            if i == 7:
                for k in range(16):
                    art = 'taiko' if k < 12 else ('tom_h', 'tom_m', 'tom_t', 'odaiko')[k - 12]
                    M('trom', T(b, k) + jit(), K.trommel(art, 0.4 + 0.55 * k / 15, TA if art == 'taiko' else 1.0), -0.35 if k % 2 else 0.35)
        elif ausbruch:
            # der Schlag des Ausbruchs, danach nur noch ein Nachbeben
            M('trom', T(b), K.trommel('odaiko', 1.0), -0.1)
            M('trom', T(b) + 0.012, K.trommel('odaiko', 0.95, 0.9), 0.15)
            M('trom', T(b) + 0.006, K.trommel('taiko', 1.0, TA), 0)
            M('trom', T(b, 10) + jit(2), K.trommel('odaiko', 0.4), 0)
        else:
            M('trom', T(b) + jit(2), K.trommel('odaiko', 1.0), K.r(-0.1, 0.1))
            M('trom', T(b, 8) + jit(2), K.trommel('odaiko', 0.75), K.r(-0.1, 0.1))
            if teil == 'V5' and not steig:
                M('trom', T(b, 12) + jit(2), K.trommel('odaiko', 0.55), 0.1)
            elif teil == 'V3' and i % 2 == 1:
                M('trom', T(b, 14) + jit(2), K.trommel('odaiko', 0.5), 0.1)
            fill = i in (3, 7) or steig
            for st, v in VK_TAIKO:
                if fill and st >= 8:
                    continue
                v *= 0.85 if teil == 'V2' else 1.0
                M('trom', T(b, st) + jit(), K.trommel('taiko', v, TA), -0.35)
                M('trom', T(b, st) + 0.006 + jit(), K.trommel('taiko', v * 0.85, TB), 0.35)
            for st in range(0, 16, 2):
                M('shime', T(b, st) + jit(3), K.trommel('shime', (0.4 if st in (4, 12) else 0.2) * (0.8 if teil == 'V2' else 1.0)), 0.45)
            if wucht and not steig:
                for st, f, v in ((4, 700, 0.7), (12, 560, 0.6)):
                    M('metall', T(b, st) + jit(2), K.amboss(v, f), 0.3 if f > 600 else -0.3)
            if teil == 'V5' and not steig:
                M('snare', T(b, 12) + jit(2), K.snare(0.5), 0.1)
            if i in (3, 7):
                for k in range(8):
                    art = ('taiko', 'tom_h', 'taiko', 'tom_m', 'taiko', 'tom_t', 'taiko', 'odaiko')[k]
                    M('trom', T(b, 8 + k) + jit(), K.trommel(art, 0.5 + 0.06 * k, TA if art == 'taiko' else 1.0), 0.4 - 0.1 * k)
            if steig:
                # Steigerung in den Ausbruch: Wirbel der kleinen Trommel, Fasstrommeln in Achteln, zuletzt Toms
                for k in range(16):
                    M('snare', T(b, k) + jit(2), K.snare(0.2 + 0.65 * (k / 15) ** 1.4), 0.1)
                for k in range(8):
                    art = 'taiko' if k < 6 else ('tom_m', 'tom_t')[k - 6]
                    M('trom', T(b, 8 + k) + jit(), K.trommel(art, 0.55 + 0.06 * k, TA if art == 'taiko' else 1.0), -0.35 if k % 2 else 0.35)
        # --- Becken, Gong, Einschläge, Anstiege ---
        if b in (16, 32):
            M('becken', T(b), K.crash(1.0), 0.25)
            M('becken', T(b) + 0.01, K.crash(0.7), -0.3)
            M('tief', T(b), K.einschlag(1.0, 60, 26, 2.2), 0)
        if b == 8:
            M('becken', T(b), K.crash(0.5), -0.2)
            M('tief', T(b), K.einschlag(0.75, 58, 26, 2.2), 0)
        if b == 24:
            M('gong', T(b) + 0.01, K.gong(0.9), -0.2)
        if ausbruch:
            M('gong', T(b), K.gong(1.0), 0.15)
            M('becken', T(b), K.crash(1.0, 4.0), 0.3)
            M('becken', T(b) + 0.012, K.crash(0.9, 4.0), -0.3)
            M('tief', T(b), K.einschlag(1.0, 64, 24, 3.0), 0)
        if b in (15, 31):
            M('fx', T(b) + takt - 1.6, K.rueckwaerts_becken(1.6, 0.75), 0)
        if b == 30:
            M('fx', T(b), K.anstieg(2 * takt, 0.85, ton=mton(42)), 0)
        if steig:
            M('fx', T(b), K.anstieg(takt, 1.0, ton=mton(47)), 0)
            M('fx', T(b) + takt - 2.0, K.rueckwaerts_becken(2.0, 0.85), 0)
        # --- Grollen des Bergs (zwei unabhängige, links und rechts) ---
        if i % 4 == 0 and not ausbruch:
            st = {'V1': 0.6, 'V2': 0.45, 'V3': 0.35, 'V4': 0.6, 'V5': 0.35}[teil]
            for pan in (-0.6, 0.6):
                M('grollen', T(b), K.grollen(4 * takt + 1.5, st), pan)
        if ausbruch:
            for pan in (-0.6, 0.6):
                M('grollen', T(b), K.grollen(3 * takt, 1.4), pan)
        # --- Koto ---
        r = 59 + ((pcs[0] - 59) % 12)
        terz = (pcs[1] - pcs[0]) % 12
        if teil in ('V2', 'V3', 'V5') and not ausbruch and not steig:
            # im Thema eine Oktave über den Hörnern
            hoch = 12 if teil == 'V3' else 0
            for k, o in enumerate((0, 7, 12, 12 + nb, 12, 7, terz, 7)):
                acc = (1.0 if k in (0, 3) else 0.65) * {'V2': 1.0, 'V3': 0.8, 'V5': 0.75}[teil]
                M('zupf', T(b, 2 * k) + jit(2), K.zupf(r + o + hoch, acc, nachhall=1.0, hell=0.5), 0.35 if k % 2 else -0.25)
        if teil == 'V1':
            # Glutfunken: zwei leise, hohe Töne je Takt (Quinte, dann der Nachbarton über der Oktave)
            for st, o, v in ((8, 19, 0.75), (14, 24 + nb, 0.6)):
                M('zupf', T(b, st) + jit(2), K.zupf(r + o, v, nachhall=1.6, hell=0.5), 0.4 if st == 8 else -0.4)
        if teil == 'V4':
            oben = voicing(pcs, 64, 83, 4)
            for h, s in ((0, -1), (8, -2)):
                tremolo(M, K, 'zupf', T(b, h), oben[s], 2 * beat - 0.05, beat, 0.45, 0.3)
        # --- Chor ---
        if L and not ausbruch:
            d = L * takt - 0.15
            if teil == 'V1':
                for m in voicing(pcs, 47, 62, 3):
                    M('chor_u', T(b), K.chor(m, d, 0.9, a=1.2, r=1.0), K.r(-0.5, 0.5))
            if teil in ('V2', 'V3'):
                for m in voicing(pcs, 43, 60, 4):
                    M('chor_o', T(b), K.chor(m, d, 0.65), K.r(-0.4, 0.4))
            if teil == 'V3' and i >= 4:
                for m in voicing(pcs, 59, 74, 3):
                    M('chor_a', T(b), K.chor(m, d, 0.5), K.r(-0.5, 0.5))
            if teil == 'V4':
                for m in voicing(pcs, 50, 67, 4):
                    M('chor_u', T(b), K.chor(m, d, 0.45, a=0.8), K.r(-0.5, 0.5))
                if i >= 4:
                    for m in voicing(pcs, 62, 76, 3):
                        M('chor_a', T(b), K.chor(m, d, 0.45), K.r(-0.5, 0.5))
            if teil == 'V5':
                for m in voicing(pcs, 43, 60, 3):
                    M('chor_o', T(b), K.chor(m, d, 0.7), K.r(-0.4, 0.4))
                for m in voicing(pcs, 59, 79, 5):
                    M('chor_a', T(b), K.chor(m, d, 0.75 if not steig else 0.85, a=0.3 if not steig else 1.2), K.r(-0.6, 0.6))
        if ausbruch:
            # Schrei des Bergs: Chorcluster h/c, der langsam verklingt
            for m in (47, 54, 59, 60, 66, 71, 72):
                M('chor_a', T(b), K.chor(m, takt * 0.8, 0.85, a=0.03, r=1.6), K.r(-0.6, 0.6))
        # --- Blech ---
        if teil == 'V1' and L and i >= 4:
            for m in voicing(pcs, 35, 52, 3):
                M('blech', T(b) + jit(), K.blech(m, L * takt - 0.2, 0.45, stimmen=2, a=1.2, hell=0.4, r=0.4), K.r(-0.3, 0.3))
        if teil in ('V2', 'V3', 'V5') and not ausbruch and not steig:
            for s, dd, o, v in VK_RIFF:
                m = bass + (nb if o else 0)
                vv = v * (1.0 if teil == 'V2' else 0.8)
                M('riff', T(b, 4 * s) + jit(), K.blech(m, dd * beat * 0.9, vv, stimmen=3, cent=10, stoss=True, hell=0.9), 0)
                if teil == 'V2':
                    M('riff', T(b, 4 * s) + jit(), K.blech(m + 12, dd * beat * 0.9, vv * 0.85, stimmen=2, cent=8, stoss=True, hell=0.85), 0.15)
        if teil == 'V4' and L:
            for m in voicing(pcs, 40, 59, 4):
                M('blech', T(b) + jit(), K.blech(m, L * takt - 0.15, 0.42, stimmen=2, a=1.0, hell=0.5, r=0.35), K.r(-0.3, 0.3))
        if teil == 'V5' and not ausbruch and not steig:
            for m in voicing(pcs, 47, 64, 4):
                M('blech', T(b) + jit(), K.blech(m, 0.32, 0.9, stimmen=2, stoss=True, hell=0.95), K.r(-0.35, 0.35))
        if steig:
            for k in range(8):
                v = 0.55 + 0.45 * k / 7
                for m in voicing(pcs, 47, 64, 4):
                    M('blech', T(b, 2 * k) + jit(), K.blech(m, 0.22, v, stimmen=2, stoss=True, hell=1.0), K.r(-0.35, 0.35))
                M('blech', T(b, 2 * k), K.blech(bass, 0.24, v, stimmen=2, stoss=True, hell=0.85), 0)
        if ausbruch:
            for m in (35, 47, 54, 59, 60):
                M('blech', T(b) + jit(2), K.blech(m, 1.4, 1.0, stimmen=3, cent=12, stoss=True, hell=1.0, r=0.8), K.r(-0.3, 0.3))
        # --- hohe Streicher ---
        if L and teil == 'V1' and i >= 2:
            for m in voicing(pcs, 71, 86, 2):
                M('vl', T(b), K.streich(m, L * takt - 0.1, 0.3, stimmen=4, cent=7, a=0.6, d=0.5, s=0.9, r=0.4, p=1.35, vib=6, trem=1,
                                        bpm=bpm, cache=False), K.r(-0.5, 0.5))
        if L and wucht and not ausbruch:
            for m in voicing(pcs, 66, 83, 3):
                M('vl', T(b), K.streich(m, L * takt - 0.1, 0.3, stimmen=4, cent=6, a=0.3, d=0.5, s=0.9, r=0.35, p=1.3, vib=8, trem=1,
                                        bpm=bpm, cache=False), K.r(-0.5, 0.5))
        if L and teil == 'V4':
            for m in voicing(pcs, 62, 79, 4):
                M('vl', T(b), K.streich(m, L * takt - 0.1, 0.26, stimmen=4, cent=6, a=0.6, d=0.6, s=0.9, r=0.5, p=1.3, vib=10,
                                        cache=False), K.r(-0.5, 0.5))
    # Melodien und Thema (je Teil einmal, über acht Takte)
    for q in range(len(VK_PLAN)):
        teil = VK_PLAN[q][0]
        t0 = T(q * 8)
        if teil == 'V1':
            M('dizi', t0, K.dizi(VK_RAUCH, beat, 1.0, vib=10), 0.15)
        if teil in ('V3', 'V5'):
            v = 0.85 if teil == 'V3' else 1.0
            for s, d, m in VK_THEMA:
                M('horn', t0 + s * beat + jit(), K.blech(m, d * beat * 0.96, v, stimmen=3, cent=7, a=0.06, hell=0.75), -0.2)
                M('horn', t0 + s * beat + jit(), K.blech(m - 12, d * beat * 0.96, v * 0.9, stimmen=3, cent=7, a=0.05, hell=0.8), 0.25)
                if teil == 'V5':
                    M('chor_a', t0 + s * beat, K.chor(m + 12, d * beat, 0.45, a=0.1, r=0.3), 0.0)
            if teil == 'V3':
                M('dizi', t0, K.dizi(VK_ANTWORT, beat, 0.8), 0.3)
            else:
                M('erhu', t0, K.erhu([(s, d, m + 12) for s, d, m in VK_THEMA], beat, 0.95), -0.1)
        if teil == 'V4':
            M('erhu', t0, K.erhu(VK_KLAGE, beat, 0.95, vib=26), -0.05)
    return M, takt


def vulkan_mix():
    raeume = {'gross': hall_ir(np.random.default_rng(57), (3.6, 3.0, 2.0, 1.0), 4.6, 0.03, 0.2),
              'raum': hall_ir(np.random.default_rng(58), (1.4, 1.2, 0.8, 0.45), 2.0, 0.008, 0.3)}
    specs = {
        'ost': dict(eq=kette(_sos('hp', 32), eq_spitze(240, 1.5, 1.0), eq_spitze(520, -3, 1.2), eq_spitze(1800, 2, 0.9), _sos('lp', 5000)),
                    ziel=-22, hall={'gross': 0.35}),
        'trom': dict(eq=kette(_sos('hp', 36), eq_spitze(300, -2, 1.0), eq_spitze(2000, 2, 1.0)), ziel=-20.5, hall={'raum': 0.35, 'gross': 0.25}),
        'shime': dict(eq=_sos('hp', 200), ziel=-29, hall={'raum': 0.4, 'gross': 0.25}),
        'metall': dict(eq=_sos('hp', 300), ziel=-27.5, hall={'gross': 0.65}),
        'snare': dict(eq=_sos('hp', 150), ziel=-27, hall={'raum': 0.45, 'gross': 0.3}),
        'zupf': dict(eq=kette(_sos('hp', 120), eq_spitze(400, 2, 1.2), eq_spitze(2500, 1.5, 1.0)), ziel=-24, hall={'gross': 0.4, 'raum': 0.2}),
        'erhu': dict(eq=kette(_sos('hp', 180), _sos('lp', 7000)), ziel=-20.5, hall={'gross': 0.5}),
        'dizi': dict(eq=kette(_sos('hp', 200), _sos('lp', 8000)), ziel=-22, hall={'gross': 0.6}),
        'riff': dict(eq=kette(_sos('hp', 35), eq_spitze(800, 2.5, 0.8), _sos('lp', 4500)), ziel=-22, hall={'gross': 0.3}),
        'blech': dict(eq=kette(_sos('hp', 40), eq_spitze(320, -2.5, 1.0), eq_spitze(1400, 2.5, 1.0), _sos('lp', 6500)), ziel=-23, hall={'gross': 0.6}),
        'horn': dict(eq=kette(_sos('hp', 90), eq_spitze(1200, 2, 1.0), _sos('lp', 5500)), ziel=-20.5, hall={'gross': 0.7}),
        'chor_o': dict(eq=_sos('hp', 100), vokal='o', ziel=-23.5, hall={'gross': 0.9}),
        'chor_a': dict(eq=_sos('hp', 160), vokal='a', ziel=-24, hall={'gross': 0.9}),
        'chor_u': dict(eq=_sos('hp', 100), vokal='u', ziel=-25, hall={'gross': 1.0}),
        'vl': dict(eq=kette(_sos('hp', 230), eq_spitze(3200, -1, 1.0), _sos('lp', 9000)), ziel=-25, hall={'gross': 0.85}),
        'grollen': dict(eq=kette(_sos('hp', 32), _sos('lp', 300)), ziel=-27.5, hall={'gross': 0.25}),
        'gong': dict(eq=_sos('hp', 40), ziel=-24, hall={'gross': 0.6}),
        'becken': dict(ziel=-27, hall={'gross': 0.45}),
        'tief': dict(eq=kette(_sos('lp', 140), _sos('hp', 28)), ziel=-26),
        'fx': dict(eq=_sos('hp', 150), ziel=-28, hall={'gross': 0.6}),
    }
    master = dict(eq=kette(_sos('hp', 30, 2), eq_kuhle(85, -2.5), eq_spitze(300, -2.0, 0.8), eq_spitze(1300, 2.0, 0.9),
                           eq_kuhle(2400, 3.5, hoch=True)), schwelle=-16, ratio=2.5, treiben=1.2)
    return specs, raeume, master


STUECKE = {
    'turm': (turm, turm_mix),
    'kharzul': (kharzul, kharzul_mix),
    'kharzul2': (lambda: kharzul(True), lambda: kharzul_mix(True)),
    'arena': (arena, arena_mix),
    'glut': (glut, glut_mix),
    'vulkan': (vulkan, vulkan_mix),
}


def main():
    args = sys.argv[1:]
    roh_dir = os.path.expanduser('~/.cache/seelenstein-klang-roh')
    if '--roh' in args:
        i = args.index('--roh')
        roh_dir = args[i + 1]
        del args[i:i + 2]
    zw = None
    if '--zwischen' in args:  # nur zum Abstimmen: gerechnete Spuren zwischenspeichern und wiederverwenden
        i = args.index('--zwischen')
        zw = args[i + 1]
        del args[i:i + 2]
    ids = args or list(STUECKE)
    for k in ids:
        if k not in STUECKE:
            raise SystemExit(f'unbekannt: {k} (bekannt: {", ".join(STUECKE)})')
    for k in ids:
        print('rechne', k, flush=True)
        spuren, mix = STUECKE[k]
        npz = zw and os.path.join(zw, k + '.npz')
        if npz and os.path.exists(npz):
            z = np.load(npz)
            M = Mischer(len(z[[n for n in z.files if n != '_takt'][0]]))
            M.bus = {n: z[n] for n in z.files if n != '_takt'}
            takt = float(z['_takt'][0, 0])
        else:
            M, takt = spuren()
            if npz:
                os.makedirs(zw, exist_ok=True)
                np.savez(npz, _takt=np.full((1, 2), takt), **M.bus)
        S, pegel = mische(M, *mix())
        ab = rohdatei(os.path.join(roh_dir, 'musik', k + '.wav'), S, takt)
        print(f'  {len(S) / SR:.2f} s Schleife, Takt {takt:.4f} s, schleife {ab}, Lautheit {lufs(S):.1f} LUFS', flush=True)
        print('  Spuren (LUFS solo):', pegel, flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
