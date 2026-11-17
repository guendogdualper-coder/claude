#!/usr/bin/env python3
"""Klänge und Musik für Seelenstein mit ElevenLabs erzeugen und spielfertig machen (seit 14.5).

Liste aller Klänge: tools/klang-liste.json (Prompt, Dauer, Schnitt, Rollen). Ablauf:
  1. roh   – fehlende Rohdateien bei ElevenLabs erzeugen (Schlüssel NUR aus der Umgebungsvariable ELK)
  2. bauen – Rohdateien schneiden, entrauschen (Stille vorn/hinten weg), Lautheit angleichen, als MP3 nach
             snd/sfx/<id>.mp3 bzw. snd/musik/<stimmung>.mp3 schreiben und js/daten/klang-dateien.js (Lage der Laute,
             Schleifenpunkte der Musik) neu schreiben. Musik: Schleife auf Taktgrenzen mit vorbereiteter Naht,
             −18 LUFS, MP3 VBR (Abschnitt „Musik“ unten; Prompts und Anleitung in docs/musik-prompts.md).

Aufruf:
  ELK=… python3 tools/klang-erzeugen.py            # beides: fehlende roh erzeugen, dann bauen
  python3 tools/klang-erzeugen.py bauen            # nur bauen (ohne Netz)
  ELK=… python3 tools/klang-erzeugen.py roh hieb_schwert dorf   # nur diese erzeugen (fehlende)
  … --neu                                          # vorhandene Rohdateien der genannten ids neu erzeugen
Rohdateien liegen außerhalb des Repos (Standard ~/.cache/seelenstein-klang-roh, sonst --roh <ordner>).

Braucht: python3 mit numpy und scipy, ffmpeg (libmp3lame), urllib.
"""
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

import numpy as np

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
LISTE = os.path.join(HIER, 'klang-liste.json')
SR = 44100
API = 'https://api.elevenlabs.io/v1'


# --- Ein- und Ausgabe -----------------------------------------------------------------------------------------
def lade(pfad, kanaele=1):
    """MP3 → float32 [n] (mono) oder [n, 2] (stereo) mit 44,1 kHz."""
    out = subprocess.run(['ffmpeg', '-v', 'error', '-i', pfad, '-ac', str(kanaele), '-ar', str(SR), '-f', 'f32le', '-'],
                         check=True, capture_output=True).stdout
    a = np.frombuffer(out, dtype=np.float32).copy()
    return a if kanaele == 1 else a.reshape(-1, kanaele)


def schreibe(pfad, a, kbps, kanaele=1):
    os.makedirs(os.path.dirname(pfad), exist_ok=True)
    roh = np.ascontiguousarray(a, dtype=np.float32).tobytes()
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', str(kanaele), '-i', '-',
                    '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', '-map_metadata', '-1', pfad], input=roh, check=True)


# --- Lautheit nach ITU-R BS.1770 (K-Filter) ------------------------------------------------------------------
def biquad(x, b, a):
    from scipy.signal import lfilter
    return lfilter(b, a, x, axis=0)


def k_filter(x):
    # Koeffizienten für 44,1 kHz (aus den Formeln der Norm abgeleitet)
    import math
    f0, G, Q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
    K = math.tan(math.pi * f0 / SR)
    Vh = 10 ** (G / 20)
    Vb = Vh ** 0.4996667741545416
    a0 = 1 + K / Q + K * K
    b = [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0]
    a = [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
    y = biquad(x, b, a)
    f0, Q = 38.13547087602444, 0.5003270373238773
    K = math.tan(math.pi * f0 / SR)
    a = [1, 2 * (K * K - 1) / (1 + K / Q + K * K), (1 - K / Q + K * K) / (1 + K / Q + K * K)]
    return biquad(y, [1, -2, 1], a)


def blocklaut(x, fenster=0.4, schritt=0.1):
    """Lautheit je Block (LUFS), x mono [n] oder stereo [n, 2]."""
    y = k_filter(x)
    p = y ** 2 if y.ndim == 1 else (y ** 2).sum(axis=1)
    n = int(fenster * SR)
    s = int(schritt * SR)
    if len(p) < n:
        return np.array([-0.691 + 10 * np.log10(max(1e-12, p.mean()))])
    cs = np.concatenate([[0], np.cumsum(p)])
    st = np.arange(0, len(p) - n + 1, s)
    m = (cs[st + n] - cs[st]) / n
    return -0.691 + 10 * np.log10(np.maximum(1e-12, m))


def integriert(x):
    L = blocklaut(x)
    L = L[L > -70]
    if not len(L):
        return -70.0
    rel = -0.691 + 10 * np.log10(np.mean(10 ** ((L + 0.691) / 10))) - 10
    L = L[L > rel]
    return float(-0.691 + 10 * np.log10(np.mean(10 ** ((L + 0.691) / 10))))


def kurz_max(x):
    """größte Kurzzeit-Lautheit (Fenster 0,4 s bzw. so lang wie der Laut)."""
    return float(blocklaut(x, 0.4 if len(x) >= 0.4 * SR else len(x) / SR, 0.02).max())


def spitze(x, ueber=4):
    """angenäherte echte Spitze (4-fach überabgetastet)."""
    from scipy.signal import resample_poly
    return float(np.abs(resample_poly(x, ueber, 1, axis=0)).max())


def begrenzer(x, decke=0.89):
    """weicher Begrenzer mit 1,5 ms Vorschau: nur die Spitzen werden gezähmt, der Anschlag bleibt."""
    ax = np.abs(x) if x.ndim == 1 else np.abs(x).max(axis=1)
    g = np.minimum(1.0, decke / np.maximum(ax, 1e-9))
    vor = int(0.0015 * SR)
    from scipy.ndimage import minimum_filter1d
    g = minimum_filter1d(g, size=2 * vor + 1, mode='nearest')
    # Rückkehr weich (40 ms)
    k = np.exp(-1 / (0.04 * SR))
    out = np.empty_like(g)
    v = 1.0
    for i in range(len(g)):
        v = g[i] if g[i] < v else g[i] + (v - g[i]) * k
        out[i] = v
    return x * (out if x.ndim == 1 else out[:, None])


# --- Schnitt der Soundeffekte ---------------------------------------------------------------------------------
def huelle(x, ms=5):
    """Hüllkurve in dB: Effektivwert über 10 ms, alle ms Millisekunden."""
    n = max(1, int(ms / 1000 * SR))
    w = 2 * n
    p = np.concatenate([[0], np.cumsum(x.astype(np.float64) ** 2)])
    st = np.arange(0, max(1, len(x) - w), n)
    e = np.sqrt((p[st + w] - p[st]) / w + 1e-12)
    return 20 * np.log10(e), n


def teile(x, cfg):
    """Laute in einer Rohdatei finden (Anschläge): Pegel steigt in 30 ms um „anstieg“ dB über die Schwelle.
    Jeder Laut reicht bis zum nächsten Anschlag (höchstens „max“ s); hinten wird abgeschnitten, sobald er
    „ausklang“ dB unter seiner Spitze bleibt. teile=1: alles ab dem ersten Anschlag ist ein Laut.
    schnitte=[[a, b], …] (s): feste Schnitte statt Suche."""
    db, n = huelle(x)
    top = db.max()
    db = np.concatenate([np.full(6, -120.0), db])  # Anschlag gleich am Dateianfang erkennen
    if cfg.get('schnitte'):
        roh = [[int(a * SR / n) + 6, int(b * SR / n) + 6] for a, b in cfg['schnitte']]
    else:
        boden = top + cfg.get('schwelle', -32)
        anstieg = cfg.get('anstieg', 9)
        abstand = int(cfg.get('abstand', 0.18) * 1000 / (n * 1000 / SR))
        ons = []
        for i in range(6, len(db)):
            if db[i] < boden + 4:
                continue
            j = i - 6 + int(np.argmin(db[i - 6:i]))
            if db[i] - db[j] >= anstieg and (not ons or i - ons[-1][1] >= abstand):
                ons.append((j, i))
        if not ons:
            ons = [(int(np.argmax(db > boden)), 0)]
        starts = [o[0] for o in ons]
        if cfg.get('teile') == 1:
            starts = starts[:1]
        roh = [[s, starts[k + 1] if k + 1 < len(starts) else len(db)] for k, s in enumerate(starts)]
    out = []
    mx = cfg.get('max')
    for a, b in roh:
        if mx:
            b = min(b, a + int(mx * SR / n))
        pk = db[a:b].max() if b > a else -120
        if pk < top + cfg.get('mindest', -22):
            continue  # zu leise (Nachhall, Nebengeräusch)
        grenze = pk + cfg.get('ausklang', -40)
        ende = a + 1
        for k in range(a, b):
            if db[k] > grenze:
                ende = k
        a0 = max(0, (a - 6) * n - int(0.003 * SR))
        out.append([a0, min(len(x), (ende - 6 + 2) * n + 2 * n)])
    dmin = cfg.get('min', 0.06) * SR
    return [s for s in out if s[1] - s[0] >= dmin]


def saeubern(s, cfg):
    s = s.copy()
    lang = cfg.get('max')
    if lang and len(s) > lang * SR:
        s = s[:int(lang * SR)]
    pk = np.abs(s).max() + 1e-9

    def pegel(t):
        return 20 * np.log10(np.sqrt((t ** 2).mean()) / pk + 1e-9)
    # Ränder weich: Laute, die aus der Stille kommen, nur 1 ms (der Anschlag bleibt knackig); mitten im Laut
    # geschnittene (laut am Rand) 8 ms ein und bis 0,18 s aus, damit nichts knackt oder abgehackt endet
    a = int((0.008 if pegel(s[:int(0.004 * SR)]) > -24 else 0.001) * SR)
    s[:a] *= np.linspace(0, 1, a)
    laut_ende = pegel(s[-int(0.02 * SR):]) > -24
    f = int(min(0.18 if laut_ende else 0.06, len(s) / SR * (0.35 if laut_ende else 0.25)) * SR)
    if f > 0:
        s[-f:] *= np.linspace(1, 0, f) ** 2
    return s


def baue_sfx(e, roh, ziel):
    x = lade(roh)
    from scipy.signal import butter, sosfilt
    x = sosfilt(butter(2, e.get('hp', 35), 'highpass', fs=SR, output='sos'), x)
    seg = teile(x, e)
    if 'behalten' in e:
        seg = [seg[i] for i in e['behalten'] if i < len(seg)]
    if e.get('anzahl'):
        seg = seg[:e['anzahl']]
    ziel_l = e.get('lufs', -14.0)
    teile_out = []
    for a, b in seg:
        s = saeubern(x[a:b], e)
        g = 10 ** ((ziel_l - kurz_max(s)) / 20)
        s = begrenzer(s * min(g, 30), 0.84)
        teile_out.append(s.astype(np.float32))
    luecke = np.zeros(int(0.12 * SR), np.float32)
    clips = []
    alles = [luecke[:int(0.02 * SR)]]
    t = len(alles[0])
    for s in teile_out:
        # dritter Wert: Lage der lautesten Stelle (Aufschlag) im Laut – so kann das Spiel einen Treffer genau dort ansetzen
        db, n = huelle(s)
        clips.append([round(t / SR, 3), round(len(s) / SR, 3), round(int(np.argmax(db)) * n / SR, 3)])
        alles += [s, luecke]
        t += len(s) + len(luecke)
    schreibe(ziel, np.concatenate(alles), e.get('kbps', 64))
    return clips, teile_out


# --- Musik: Taktraster, Schleife auf Taktgrenzen, nahtlose Naht -----------------------------------------------------
# Ablauf je Stück (baue_musik), neu gefasst nach 15.46 (vorher lagen mehrere Schleifen nicht auf Taktgrenzen und
# stolperten bei jeder Wiederholung; die Dateien waren mit 96–128 kbit/s kodiert):
#   1. Taktraster: genaues Tempo (Feld „bpm“ als Vorgabe, gesucht wird ±1,5 % darum) und Lage der Schläge aus der
#      Anschlagshüllkurve. ElevenLabs hält das Tempo exakt; die Abweichung über das Stück wird mit ausgegeben.
#   2. Schleife A–B: A und B liegen auf Schlägen, B − A ist eine ganze Zahl Takte („takt“ Schläge je Takt),
#      bevorzugt ganze Phrasen („phrase“ Takte). Bewertet wird, wie gleich die Umgebung von A und B klingt
#      (Harmonie, Klangfarbe, Pegel und Rhythmusmuster je Schlag); längere Schleifen werden bevorzugt. Stücke ohne
#      festen Puls („bpm“: 0, frei schwebend) suchen Bild für Bild nach gleich klingenden Stellen.
#      „schleife“: [A, B] in s (in der Rohdatei) legt die Punkte fest, dann wird nicht gesucht (reproduzierbar).
#   3. Naht: kurz vor B geht der Körper über „blende“ s mit gleicher Leistung in das über, was vor A kommt (auf
#      wenige Samples ausgerichtet; bei ähnlichem Material mit Korrelationsausgleich, damit kein Pegelbuckel
#      entsteht); die letzten 60 ms vor B sind schon genau das Material vor A. Hinter B folgt ein Nachlauf (= Anfang
#      der Schleife). So schleift die Datei sauber, gleich ob der Browser die Kodierverzögerung der MP3 entfernt
#      (Chrome, Firefox) oder nicht (Safari, bis ≈ 50 ms): beide Schleifenpunkte verschieben sich gleich, und um B
#      herum steht dasselbe Material wie um A herum.
#   4. Lautheit der Schleife auf „lufs“ (Standard −18 LUFS), echte Spitze höchstens „tp“ (−1,5 dBTP; ein weicher
#      Begrenzer greift nur, falls nötig), Kodierung MP3 VBR in LAME-Qualität „vbr“ (2 ≈ 190 kbit/s), 44,1 kHz Stereo.
#      Danach wird die fertige Datei dekodiert und nachgemessen (Lautheit, echte Spitze, Lücke beim Dekodieren).
def spektrum(m, n, hop):
    """Betragsspektrum (Hann-Fenster) Bild für Bild, in Blöcken gerechnet (spart Speicher)."""
    from numpy.lib.stride_tricks import sliding_window_view
    w = np.hanning(n).astype(np.float32)
    v = sliding_window_view(np.ascontiguousarray(m, dtype=np.float32), n)[::hop]
    out = np.empty((len(v), n // 2 + 1), np.float32)
    for s in range(0, len(v), 1024):
        out[s:s + 1024] = np.abs(np.fft.rfft(v[s:s + 1024] * w, axis=1))
    return out


def fluss(m, hop, n=2048, glatt=0.25):
    """Anschlagshüllkurve: positiver spektraler Fluss (log), gleitender Mittelwert (glatt s) abgezogen.
    Bild i gehört zur Zeit i·hop (Fenstermitte; vorn um n/2 aufgefüllt)."""
    out = [np.zeros(n // 2 // hop)]
    prev = None
    blk = 2048 * hop
    for s in range(0, max(1, len(m) - n), blk):
        sp = np.log(spektrum(m[s:s + blk + n], n, hop)[:blk // hop] + 1e-4)
        d = np.diff(sp, axis=0, prepend=sp[:1] if prev is None else prev[None, :])
        out.append(np.maximum(0, d).sum(axis=1))
        prev = sp[-1]
    f = np.concatenate(out)
    k = max(1, int(glatt * SR / hop))
    f = f - np.convolve(f, np.ones(k) / k, mode='same')
    return np.maximum(0, f)


def taktraster(mono, bpm, hop=128):
    """Genaues Tempo und Phase des Schlagrasters. Gibt (Schlagdauer s, Phase s, BPM, Abweichung je Viertel in ms)."""
    fps = SR / hop
    o = fluss(mono, hop)
    rand = int(2 * fps)
    k = o[rand:-rand] - o[rand:-rand].mean()
    n = 1 << (2 * len(k) - 1).bit_length()
    F = np.fft.rfft(k, n)
    ac = np.fft.irfft(F * np.conj(F))[:len(k)]
    ac /= ac[0]
    idx = np.arange(len(ac))
    beste, bpm_g = -9.0, bpm
    # Kammfilter: mittlere Autokorrelation bei allen Vielfachen der Schlagdauer (bis 60 % der Länge)
    for b in np.arange(bpm * 0.985, bpm * 1.015, 0.002):
        T = 60 / b * fps
        v = np.interp(np.arange(1, int(len(ac) * 0.6 / T) + 1) * T, idx, ac).mean()
        if v > beste:
            beste, bpm_g = v, b
    T = 60 / bpm_g
    oi = np.arange(len(o))

    def phase(lo, hi):
        bp, bv = 0.0, -1.0
        for ph in np.arange(0, T, 0.001):
            v = np.interp(np.arange(lo + ph, hi, T) * fps, oi, o).mean()
            if v > bv:
                bv, bp = v, ph
        return bp
    dauer = len(mono) / SR
    ph = phase(0, dauer)
    drift = []
    for q in range(4):
        lo = q * dauer / 4
        d = (lo + phase(lo, lo + dauer / 4) - ph) % T
        drift.append(round(1000 * (d - T if d > T / 2 else d)))
    if ph > T / 2:
        ph -= T
    return T, ph, float(bpm_g), drift


def schlag_merkmale(x, beats, T, o, hop_o):
    """Je Schlag: Tonklassen (Chroma), Klangfarbe (5 Bänder), Pegel (dB) und Rhythmusmuster (Anschläge in 4 Teilen)."""
    mono = x.mean(axis=1)
    hop, n = 512, 4096
    sp = spektrum(mono, n, hop)
    f = np.fft.rfftfreq(n, 1 / SR)
    gut = (f > 60) & (f < 5000)
    pc = (np.round(12 * np.log2(f[gut] / 440)) % 12).astype(int)
    p2 = sp[:, gut] ** 2
    ch = np.stack([p2[:, pc == k].sum(axis=1) for k in range(12)], 1)
    band = np.stack([(sp[:, (f >= lo) & (f < hi)] ** 2).sum(axis=1) for lo, hi in
                     [(30, 120), (120, 400), (400, 1500), (1500, 5000), (5000, 14000)]], 1)
    fps = SR / hop
    C, Bd, L, R = [], [], [], []
    for b in beats:
        # Bild k deckt k·hop … k·hop + n ab (Mitte k·hop + n/2)
        i0 = max(0, int((b * SR - n / 2) / hop))
        i1 = max(i0 + 1, int(((b + T) * SR - n / 2) / hop))
        c = ch[i0:i1].mean(axis=0)
        C.append(c / (np.linalg.norm(c) + 1e-9))
        Bd.append(np.log(band[i0:i1].mean(axis=0) + 1e-9))
        L.append(10 * np.log10(band[i0:i1].sum(axis=1).mean() + 1e-12))
        r = [o[int((b + k * T / 4) * SR / hop_o):int((b + (k + 1) * T / 4) * SR / hop_o)].max(initial=0) for k in range(4)]
        R.append(r)
    C, Bd, L, R = np.array(C), np.array(Bd), np.array(L), np.array(R)
    Bd = (Bd - Bd.mean(0)) / (Bd.std(0) + 1e-9)
    Bd /= np.linalg.norm(Bd, axis=1, keepdims=True) + 1e-9
    R = R - R.mean(axis=1, keepdims=True)
    R /= np.linalg.norm(R, axis=1, keepdims=True) + 1e-9
    return C, Bd, L, R


def fein_ausrichten(mono, a, b, X, weit=0.015):
    """B auf wenige Samples an A ausrichten: erst der Rhythmus (±weit s, bei festem Puls 15 ms; Anschläge 4 s vor
    bis 2 s nach dem Punkt), dann die tiefen Schwingungen im Überblendbereich (±1,5 ms), damit sich Bass und
    Grundtöne nicht auslöschen."""
    from scipy.signal import butter, sosfiltfilt
    hop = 64
    w = int(weit * SR / hop)
    v = int(min(4.0, a / SR - 0.05) * SR)
    n = int(min(2.0, (len(mono) - b) / SR - 0.05) * SR) - w * hop
    ea = fluss(mono[a - v:a + n], hop)
    eb = fluss(mono[b - v - w * hop:b + n + w * hop], hop)
    sc = [float(np.dot(ea, eb[w + l:w + l + len(ea)])) for l in range(-w, w + 1)]
    k = int(np.argmax(sc))
    # nur bei einem klaren gemeinsamen Schlag verschieben (Spitze nicht am Rand, deutlich über dem Mittel);
    # bei festem Puls bleibt B so meist genau auf dem Raster
    d1 = (k - w) * hop if 0 < k < 2 * w and sc[k] >= 1.8 * np.mean(sc) else 0
    b += d1
    sos = butter(4, 300, 'lowpass', fs=SR, output='sos')
    r = int(0.0015 * SR)
    pa = sosfiltfilt(sos, mono[a - X - r:a + r])[r:-r]
    best, d2 = -9.0, 0
    for d in range(-r, r + 1):
        pb = sosfiltfilt(sos, mono[b + d - X - r:b + d + r])[r:-r]
        c = float(np.dot(pa, pb) / (np.linalg.norm(pa) * np.linalg.norm(pb) + 1e-9))
        if c > best:
            best, d2 = c, d
    return b + d2, d1 + d2


def schleife_takt(x, e, ausgabe=False):
    """Schleifenpunkte auf dem Taktraster suchen (siehe oben). Gibt (a, b in Samples, Info) zurück."""
    mono = x.mean(axis=1)
    dauer = len(mono) / SR
    T, ph, bpm, drift = taktraster(mono, e['bpm'])
    takt = e.get('takt', 4)
    phrase = e.get('phrase', 4)
    hop_o = 128
    o = fluss(mono, hop_o)
    beats = np.arange(ph if ph >= 0 else ph + T, dauer - T, T)
    C, Bd, L, R = schlag_merkmale(x, beats, T, o, hop_o)
    # Ähnlichkeit je Schlagpaar
    S = C @ C.T + 0.4 * (Bd @ Bd.T) + 0.4 * (R @ R.T) - 0.04 * np.minimum(6, np.abs(L[:, None] - L[None, :]))
    blende = e.get('blende', 2 * T)
    # Umgebung: vor der Naht die Überblendung und ein Takt, danach ein Takt (mindestens 2 s). Beide Seiten müssen
    # passen (das Schwächere zählt): vorn klingen beide Stellen gleichzeitig, hinten folgt A statt dem, was auf B folgte.
    vor = int(np.ceil((blende + takt * T) / T))
    nach = max(takt, int(np.ceil(2.0 / T)))
    kand = []
    for i in range(vor, len(beats)):
        A = beats[i]
        if A < max(e.get('a_von', 0.0), blende + 0.5) or A > e.get('a_bis', 40.0):
            continue
        for m in range(e.get('min_takte', 4), len(beats) // takt + 1):
            j = i + m * takt
            if j + nach > len(beats):
                break
            B = beats[j]
            if B < e.get('b_von', 0) or B > dauer - e.get('ende_weg', 2.0):
                continue
            sv = float(S[np.arange(i - vor, i), np.arange(j - vor, j)].mean())
            sn = float(S[np.arange(i, i + nach), np.arange(j, j + nach)].mean())
            sim = min(sv, sn)
            bonus = e.get('laenge_bonus', 0.003) * (B - A) + (0.03 if m % phrase == 0 else 0.0)
            kand.append((sim + bonus, sim, i, j, m, sv, sn))
    if not kand:
        raise RuntimeError('keine Schleife auf dem Taktraster gefunden (a_von/a_bis/ende_weg prüfen)')
    kand.sort(reverse=True)
    if ausgabe:
        gesehen = set()
        for k in kand:
            if k[4] in gesehen:
                continue
            gesehen.add(k[4])
            print(f'    A {beats[k[2]]:7.3f}s  B {beats[k[3]]:7.3f}s  {k[4]:3d} Takte  Ähnlichkeit vor {k[5]:.2f} nach {k[6]:.2f}  Wert {k[0]:.3f}')
            if len(gesehen) >= 6:
                break
    _, sim, i, j, m, _, _ = kand[0]
    a = int(round(beats[i] * SR))
    b = int(round((beats[i] + m * takt * T) * SR))
    b, d = fein_ausrichten(mono, a, b, int(blende * SR))
    info = {'bpm': round(bpm, 3), 'abweichung_ms': drift, 'takte': m, 'schlaege': m * takt, 'aehnlichkeit': round(sim, 3),
            'feinabgleich_ms': round(1000 * d / SR, 2)}
    return a, b, info


def merkmale(x, hop):
    """Je Rahmen: Tonklassen (Chroma, normiert), Klangfarbe (4 Bänder, log) und Anschlagstärke (spektraler Fluss)."""
    n = 4096
    spec = spektrum(x, n, hop)
    f = np.fft.rfftfreq(n, 1 / SR)
    gut = (f > 60) & (f < 5000)
    pc = (np.round(12 * np.log2(f[gut] / 440)) % 12).astype(int)
    ch = np.zeros((len(spec), 12), np.float32)
    for k in range(12):
        ch[:, k] = spec[:, gut][:, pc == k].sum(axis=1)
    ch /= np.linalg.norm(ch, axis=1, keepdims=True) + 1e-9
    band = np.stack([spec[:, (f > lo) & (f < hi)].sum(axis=1) for lo, hi in [(30, 150), (150, 600), (600, 2500), (2500, 9000)]], 1)
    band = np.log(band + 1e-6)
    lg = np.log(spec + 1e-4)
    flux = np.concatenate([[0], np.maximum(0, np.diff(lg, axis=0)).sum(axis=1)])
    return ch, band, flux


def fenster_diag(G, k0, k1):
    """S[i, j] = Mittel von G[i+k, j+k] für k = k0 … k1−1 (entlang der Diagonalen; außerhalb zählt 0)."""
    D = np.zeros((G.shape[0] + 1, G.shape[1] + 1), np.float64)
    for r in range(G.shape[0]):
        D[r + 1, 1:] = G[r] + D[r, :-1]
    n0, n1 = G.shape
    i = np.arange(n0)[:, None]
    j = np.arange(n1)[None, :]

    def kum(k):
        ii, jj = i + k, j + k
        ok = (ii >= 0) & (jj >= 0)
        ii, jj = np.clip(ii, -1, n0 - 1), np.clip(jj, -1, n1 - 1)
        # über den Rand hinaus: auf die Diagonale zurückgehen
        over = np.maximum(0, np.maximum(ii - (n0 - 1), jj - (n1 - 1)))
        return np.where(ok, D[ii + 1 - over, jj + 1 - over], 0.0)
    return (kum(k1 - 1) - kum(k0 - 1)) / (k1 - k0)


def schleife_frei(x, e, ausgabe=False):
    """Für Stücke ohne festen Puls: Stellen A < B suchen, deren Umgebung gleich klingt (Harmonie, Klangfarbe,
    Pegel), Bild für Bild (20 ms). Wie bei schleife_takt müssen beide Seiten passen: vor der Naht die Überblendung
    (+ 2 s), danach 3 s. Längere Schleifen werden bevorzugt."""
    mono = x.mean(axis=1)
    dt = 0.02
    hop = int(dt * SR)
    ch, band, flux = merkmale(mono, hop)
    dauer = len(mono) / SR
    blende = e.get('blende', 3.0)
    Wv, Wn = int((blende + 2.0) / dt), int(3.0 / dt)
    a_lo = max(Wv, int(max(e.get('a_von', 4), blende + 0.5) / dt))
    a_hi = int(e.get('a_bis', 25) / dt)
    b_lo, b_hi = int(e.get('b_von', 45) / dt), min(len(ch) - Wn - 1, int((dauer - e.get('ende_weg', 8)) / dt))
    A0, A1, B0, B1 = a_lo - Wv, a_hi + Wn, b_lo - Wv, b_hi + Wn
    bn = (band - band.mean(0)) / (band.std(0) + 1e-9)
    bn /= np.linalg.norm(bn, axis=1, keepdims=True) + 1e-9
    # Pegel: Summe der Bänder (dB) – große Unterschiede bestrafen
    lv = 10 * np.log10(np.exp(band).sum(axis=1) + 1e-9)
    G = (ch[A0:A1] @ ch[B0:B1].T + 0.3 * (bn[A0:A1] @ bn[B0:B1].T)
         - 0.04 * np.minimum(6, np.abs(lv[A0:A1, None] - lv[None, B0:B1]))).astype(np.float32)
    Sv = fenster_diag(G, -Wv, 0)[Wv:Wv + (a_hi - a_lo), Wv:Wv + (b_hi - b_lo)]
    Sn = fenster_diag(G, 0, Wn)[Wv:Wv + (a_hi - a_lo), Wv:Wv + (b_hi - b_lo)]
    sim = np.minimum(Sv, Sn)
    lang = (np.arange(b_lo, b_hi)[None, :] - np.arange(a_lo, a_hi)[:, None]) * dt
    S = np.where(lang >= e.get('min_laenge', 30.0), sim + e.get('laenge_bonus', 0.003) * lang, -9.0)
    if ausgabe:
        # beste Stelle je 5-s-Bereich der Schleifenlänge
        for L0 in range(int(lang.min() // 5 * 5), int(lang.max()) + 1, 5):
            msk = (lang >= L0) & (lang < L0 + 5)
            if not msk.any():
                continue
            k = np.argmax(np.where(msk, sim, -9))
            i, j = np.unravel_index(k, sim.shape)
            print(f'    {L0:3d}–{L0 + 5:3d} s: A {(a_lo + i) * dt:7.2f}s  B {(b_lo + j) * dt:7.2f}s  vor {Sv[i, j]:.2f} nach {Sn[i, j]:.2f}')
    i, j = np.unravel_index(np.argmax(S), S.shape)
    a, b = (a_lo + i) * hop, (b_lo + j) * hop
    # ohne festen Puls: leise Schläge (Handtrommel, Glocken) bis ±250 ms aufeinander legen, sonst doppeln sie sich
    b, d = fein_ausrichten(mono, a, b, int(blende * SR), e.get('rhythmus_weit', 0.25))
    info = {'bpm': 0, 'aehnlichkeit': round(float(sim[i, j]), 3), 'feinabgleich_ms': round(1000 * d / SR, 2)}
    if ausgabe:
        print(f'    gewählt: A {a / SR:7.3f}s  B {b / SR:7.3f}s  frei  Ähnlichkeit vor {Sv[i, j]:.2f} nach {Sn[i, j]:.2f}')
    return a, b, info


def naht(x, a, b, X, R=None):
    """Körper A..B; X Samples lang geht er mit gleicher Leistung in das über, was vor A kommt. Ist das Material
    ähnlich (Korrelation r > 0), wird durch √(1 + 2·r·gₐ·gₑ) geteilt, sonst gäbe es in der Mitte einen Pegelbuckel.
    Die Überblendung endet R Samples (60 ms) vor B; die letzten R Samples sind schon genau x[a−R:a]. So passt die
    Naht auch dann Sample für Sample, wenn der Browser die Kodierverzögerung nicht entfernt (Safari: bis ≈ 2300
    Samples später) – loopEnd landet dann noch im reinen A-Material."""
    R = int(0.06 * SR) if R is None else R
    body = x[a:b].astype(np.float64)
    p, q = body[-X - R:-R].copy(), x[a - X - R:a - R].astype(np.float64)
    r = max(0.0, float(np.sum(p * q) / (np.sqrt(np.sum(p * p) * np.sum(q * q)) + 1e-12)))
    th = (np.arange(X) + 0.5) / X * (np.pi / 2)
    go, gi = np.cos(th)[:, None], np.sin(th)[:, None]
    body[-X - R:-R] = (p * go + q * gi) / np.sqrt(1 + 2 * r * go * gi)
    body[-R:] = x[a - R:a]
    return body.astype(np.float32), r


def sanft_begrenzen(x, decke):
    """Weicher Begrenzer für Musik: echte Spitze (4-fach überabgetastet) je 1 ms, Vorschau und Anstieg 5 ms,
    Rückkehr 250 ms. Greift nur an Spitzen über der Decke – kein Pumpen, keine Verzerrung."""
    from scipy.signal import resample_poly
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    blk = 44
    nb = (len(x) + blk - 1) // blk
    pk = np.zeros(nb)
    stueck = blk * 20000
    for s in range(0, len(x), stueck):
        lo = max(0, s - 256)
        up = np.abs(resample_poly(x[lo:s + stueck + 256], 4, 1, axis=0)).max(axis=1)
        up = up[(s - lo) * 4:(s - lo) * 4 + min(stueck, len(x) - s) * 4]
        m = len(up) // (blk * 4)
        bl = up[:m * blk * 4].reshape(m, -1).max(axis=1)
        if len(up) > m * blk * 4:
            bl = np.append(bl, up[m * blk * 4:].max())
        pk[s // blk:s // blk + len(bl)] = bl
    g = np.minimum(1.0, decke / np.maximum(pk, 1e-9))
    if g.min() >= 1.0:
        return x, 0.0
    v = 5
    g = uniform_filter1d(minimum_filter1d(g, size=2 * v + 1, mode='nearest'), size=v + 1, mode='nearest')
    k = np.exp(-1 / 250.0)
    out = np.empty_like(g)
    s = 1.0
    for i in range(len(g)):
        s = g[i] if g[i] < s else g[i] + (s - g[i]) * k
        out[i] = s
    gs = np.interp(np.arange(len(x)) / blk, np.arange(nb) + 0.5, out)
    return (x * gs[:, None]).astype(np.float32), float(-20 * np.log10(out.min()))


def schreibe_vbr(pfad, a, q=2, kanaele=2):
    """MP3 mit variabler Bitrate (LAME-Qualität q: 0 beste … 9; 2 ≈ 190 kbit/s), mit Xing/LAME-Kopf (Länge und
    Kodierverzögerung, damit Chrome und Firefox lückenlos dekodieren), ohne ID3-Daten."""
    os.makedirs(os.path.dirname(pfad), exist_ok=True)
    roh = np.ascontiguousarray(a, dtype=np.float32).tobytes()
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', str(kanaele), '-i', '-',
                    '-c:a', 'libmp3lame', '-q:a', str(q), '-map_metadata', '-1', '-id3v2_version', '0',
                    '-write_xing', '1', pfad], input=roh, check=True)


def baue_musik(e, roh, ziel, ausgabe=False):
    x = lade(roh, 2)
    if 'schleife' in e:
        a, b = int(round(e['schleife'][0] * SR)), int(round(e['schleife'][1] * SR))
        info = {'fest': True}
        if e.get('bpm'):
            T = 60 / e['bpm']
            info.update({'bpm': e['bpm'], 'schlaege': round((b - a) / SR / T, 3), 'takte': round((b - a) / SR / T / e.get('takt', 4), 3)})
    elif e.get('bpm'):
        a, b, info = schleife_takt(x, e, ausgabe)
    else:
        a, b, info = schleife_frei(x, e, ausgabe)
    X = min(int(e.get('blende', 2.0) * SR), a - int(0.06 * SR))
    P = int(1.0 * SR)
    body, r = naht(x, a, b, X)
    info['korrelation'] = round(r, 3)
    # Vorspiel (Anfang des Stücks bis A, 50 ms eingeblendet) + Körper + Nachlauf (= Anfang der Schleife)
    vor = x[:a].copy()
    fi = int(0.05 * SR)
    vor[:fi] *= np.linspace(0, 1, fi)[:, None]
    y = np.concatenate([vor, body, x[a:a + P]])
    ziel_l = e.get('lufs', -18.0)
    decke = 10 ** (e.get('tp', -1.5) / 20)
    g = 10 ** ((ziel_l - integriert(body)) / 20)
    # Kodieren und nachmessen; MP3 hebt Spitzen etwas an – dann noch einmal mit tieferer Decke
    for runde in range(3):
        z, gr = sanft_begrenzen(y * g, decke * (0.94 if runde == 0 else 0.94 * 0.97 ** runde))
        schreibe_vbr(ziel, z, e.get('vbr', 2))
        d = lade(ziel, 2)
        tp = 20 * np.log10(spitze(d) + 1e-12)
        if tp <= e.get('tp', -1.5) + 0.05:
            break
    lz = integriert(d[a:b])
    info.update({'lufs': round(float(lz), 2), 'tp_dbtp': round(float(tp), 2), 'begrenzt_db': round(gr, 2),
                 'kbit_s': round(os.path.getsize(ziel) * 8 / (len(d) / SR) / 1000), 'luecke_samples': len(d) - len(y)})
    # bytes: Dateigröße – das Spiel erkennt daran eine veraltete Fassung aus dem Speicher (klang-dateien.js)
    return {'loop': [round(float(a) / SR, 4), round(float(b) / SR, 4)], 'dur': round(len(y) / SR, 3),
            'bytes': os.path.getsize(ziel)}, info


# --- ElevenLabs -------------------------------------------------------------------------------------------------
class Kontingent(Exception):
    pass


def anfrage(pfad, daten, ziel, zeit=300, versuche=4):
    """Bei Überlast („system_busy“, zu viele gleichzeitige Anfragen) warten und neu versuchen; bei Kontingent sofort Schluss."""
    for v in range(versuche):
        try:
            return _anfrage(pfad, daten, ziel, zeit)
        except Kontingent as k:
            if ('system_busy' in str(k) or 'concurren' in str(k)) and v < versuche - 1:
                print('  Überlast, warte …', flush=True)
                time.sleep(20 * (v + 1))
                continue
            raise


def _anfrage(pfad, daten, ziel, zeit):
    key = os.environ.get('ELK')
    if not key:
        raise SystemExit('Umgebungsvariable ELK (ElevenLabs-Schlüssel) fehlt.')
    req = urllib.request.Request(API + pfad, data=json.dumps(daten).encode(), method='POST',
                                 headers={'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'})
    try:
        with urllib.request.urlopen(req, timeout=zeit) as r:
            inhalt = r.read()
    except urllib.error.HTTPError as err:
        text = err.read().decode('utf8', 'replace')[:400]
        if err.code in (401, 402, 429) or 'quota' in text.lower() or 'credits' in text.lower():
            raise Kontingent(f'{err.code}: {text}')
        raise RuntimeError(f'{err.code}: {text}')
    if len(inhalt) < 2000:
        raise RuntimeError('Antwort zu kurz: ' + inhalt[:200].decode('utf8', 'replace'))
    os.makedirs(os.path.dirname(ziel), exist_ok=True)
    with open(ziel, 'wb') as f:
        f.write(inhalt)


def erzeuge_sfx(e, ziel):
    anfrage('/sound-generation?output_format=mp3_44100_128',
            {'text': e['prompt'], 'duration_seconds': e['dauer'], 'prompt_influence': e.get('einfluss', 0.5)}, ziel)


def erzeuge_musik(e, ziel):
    daten = {'prompt': e['prompt'], 'music_length_ms': e['laenge_ms']}
    daten.update(e.get('extra', {}))
    anfrage('/music?output_format=mp3_44100_192', daten, ziel, 600)


# --- Hauptteil ----------------------------------------------------------------------------------------------------
def main():
    args = sys.argv[1:]
    roh_dir = os.path.expanduser('~/.cache/seelenstein-klang-roh')
    if '--roh' in args:
        i = args.index('--roh')
        roh_dir = args[i + 1]
        del args[i:i + 2]
    neu = '--neu' in args
    args = [a for a in args if a != '--neu']
    schritt = 'alles'
    if args and args[0] in ('roh', 'bauen'):
        schritt = args.pop(0)
    nur = set(args)
    liste = json.load(open(LISTE, encoding='utf8'))

    if schritt in ('alles', 'roh'):
        for art, fn in (('musik', erzeuge_musik), ('sfx', erzeuge_sfx)):
            for e in liste[art]:
                if nur and e['id'] not in nur:
                    continue
                if e.get('quelle'):  # aus einer anderen Rohdatei geschnitten
                    continue
                ziel = os.path.join(roh_dir, art, e['id'] + '.mp3')
                if os.path.exists(ziel) and not neu:
                    continue
                print('erzeuge', art, e['id'], flush=True)
                try:
                    fn(e, ziel)
                except Kontingent as k:
                    print('Kontingent erschöpft – Abbruch:', k)
                    return 2
                except Exception as k:  # noqa: BLE001
                    print('  Fehler:', k)
                time.sleep(0.5)
    if schritt == 'roh':
        return 0

    daten = {'sfx': {}, 'musik': {}}
    alt = os.path.join(REPO, 'js', 'daten', 'klang-dateien.js')
    if nur and os.path.exists(alt):
        for zeile in open(alt, encoding='utf8'):
            if zeile.startswith('const SFX_FILES = '):
                daten['sfx'] = json.loads(zeile[len('const SFX_FILES = '):].rstrip().rstrip(';'))
            if zeile.startswith('const MUSIC_FILES = '):
                daten['musik'] = json.loads(zeile[len('const MUSIC_FILES = '):].rstrip().rstrip(';'))
    ids = {e['id'] for e in liste['sfx'] if not e.get('aus')}
    daten['sfx'] = {k: v for k, v in daten['sfx'].items() if k in ids}
    for e in liste['sfx']:
        if e.get('aus'):
            continue
        if nur and e['id'] not in nur:
            continue
        roh = os.path.join(roh_dir, 'sfx', (e.get('quelle') or e['id']) + '.mp3')
        if not os.path.exists(roh):
            print('fehlt (roh):', e['id'])
            continue
        clips, _ = baue_sfx(e, roh, os.path.join(REPO, 'snd', 'sfx', e['id'] + '.mp3'))
        eintrag = {'clips': clips, 'g': e.get('gruppe', 'welt')}
        if e.get('rollen'):
            eintrag['roles'] = e['rollen']
        if e.get('vol') is not None:
            eintrag['vol'] = e['vol']
        daten['sfx'][e['id']] = eintrag
        print('sfx', e['id'], len(clips), 'Teile')
    for e in liste['musik']:
        if e.get('aus') or not e.get('stimmung') or (nur and e['id'] not in nur):
            continue
        roh = os.path.join(roh_dir, 'musik', e['id'] + '.mp3')
        if not os.path.exists(roh):
            print('fehlt (roh):', e['id'])
            continue
        print('musik', e['id'], '→', e['stimmung'], flush=True)
        eintrag, info = baue_musik(e, roh, os.path.join(REPO, 'snd', 'musik', e['stimmung'] + '.mp3'), ausgabe=True)
        daten['musik'][e['stimmung']] = eintrag
        print('   ', eintrag, info, flush=True)
    kopf = ('// Von tools/klang-erzeugen.py geschrieben (nicht von Hand ändern): Lage der Laute in snd/sfx/<id>.mp3\n'
            '// ([Start, Dauer] in s, „roles“: welche Laute zu welchem Ereignis gehören) und Schleifenpunkte der Musik\n'
            '// snd/musik/<stimmung>.mp3 ([Anfang, Ende] der Schleife in s auf Taktgrenzen; davor ein Vorspiel, danach ein\n'
            '// kurzer Nachlauf; „bytes“: Dateigröße, daran erkennt das Spiel eine veraltete Fassung aus dem Speicher).\n')
    with open(alt, 'w', encoding='utf8') as f:
        f.write(kopf)
        f.write('const SFX_FILES = ' + json.dumps(daten['sfx'], separators=(',', ':')) + ';\n')
        f.write('const MUSIC_FILES = ' + json.dumps(daten['musik'], separators=(',', ':')) + ';\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
