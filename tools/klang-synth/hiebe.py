#!/usr/bin/env python3
"""Hiebe des Klingenbogens (seit 15.52, Krieger): im Rechner erzeugt, ohne Aufnahmen, ohne ElevenLabs, ohne Netz.

Spielerwunsch nach dem Lernvideo „How to make sword swipes JUICY“: geschichtet aus
  – schnellem Luftzischen (Rauschen durch einen Bandpass, der von hoch nach tief gleitet, dazu ein tieferes „Wuu“),
  – hellem metallischem „Schhhing“ (unharmonische Teiltöne wie bei einer Stahlklinge, je zwei leicht verstimmt, dazu
    ein kurzes Schaben im Hochton),
  – beim Treffer einem tiefen, kurzen Schlag (Sub-Bass, leicht gesättigt, damit er auch auf kleinen Lautsprechern als
    Wumms ankommt) und einem knackigen Einschlag (Knacken, dumpfer Schlag, kurzes nasses Schneiden).
Je Waffenart eine Datei mit mehreren Varianten (Rollen in tools/klang-liste.json):
  hit   – Hieb mit Treffer (4 Varianten)     fin   – letzter Kombo-Schlag und kritische Treffer, wuchtiger (2)
  swing – nur Zischen und Klingen (3)
Arten: klingenhieb_schwert (Schwert, hell), klingenhieb_axt (Axt: weniger Klang, mehr Holz und Wucht),
klingenhieb_wucht (Zweihänder und Streitaxt: tief und lang; das Spiel spielt sie für die Streitaxt etwas tiefer).

Aufruf wie die anderen Rechner-Klänge über tools/klang-erzeugen.py (Einträge mit „synth“):
  python3 tools/klang-erzeugen.py roh klingenhieb_schwert klingenhieb_axt klingenhieb_wucht --neu
  python3 tools/klang-erzeugen.py bauen klingenhieb_schwert klingenhieb_axt klingenhieb_wucht
oder direkt: python3 tools/klang-synth/hiebe.py <id> --roh <ordner> (schreibt <ordner>/sfx/<id>.wav und daneben
<id>.json mit den Schnitten [Anfang, Ende] je Variante und der Lage des Anschlags in s – „bauen“ legt den Anschlag als
dritten Wert in die Lage der Laute, damit das Spiel den Treffer genau dort ansetzt). Feste Zufallszahlen: jeder Lauf ergibt
dieselben Dateien.
Lautheit, Begrenzer, Schnitt und MP3 macht „bauen“ wie bei allen Lauten (−14 LUFS je Laut, wie die alten Hiebe).
"""
import json
import os
import sys

import numpy as np
import scipy.io.wavfile as wf
from scipy.signal import butter, sosfilt

SR = 44100


# --- Bausteine -------------------------------------------------------------------------------------------------
def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo / (SR / 2), min(hi, SR / 2 - 200) / (SR / 2)], 'band', output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f / (SR / 2), 'high', output='sos'), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f / (SR / 2), 'low', output='sos'), x)


def svf_bp(x, fc, q):
    """Bandpass (Zustandsvariablen-Filter, TPT) mit gleitender Mittenfrequenz fc[n] (Hz) und Güte q."""
    y = np.zeros_like(x)
    s1 = s2 = 0.0
    k = 1.0 / q
    g_arr = np.tan(np.pi * np.clip(fc, 30, SR * 0.45) / SR)
    for n in range(len(x)):
        g = g_arr[n]
        hpv = (x[n] - (g + k) * s1 - s2) / (1 + g * k + g * g)
        bpv = g * hpv + s1
        s1 = g * hpv + bpv
        lpv = g * bpv + s2
        s2 = g * bpv + lpv
        y[n] = bpv
    return y


def norm(x):
    return x / (np.abs(x).max() + 1e-12)


def whoosh(rng, n, t0, dur, f_hi, f_lo, peak, tail, breit=1.0, body=0.35):
    """Luftzischen ab t0 (s): breites, helles Rauschen (Schwerpunkt 3–8 kHz) – ein breiter Bandpass gleitet von f_hi nach
    f_lo, dazu ein ungefiltertes Band 1–10 kHz („Schhh“); schwillt bis peak (s) schnell an und klingt mit tail (s) aus."""
    out = np.zeros(n)
    a = int(t0 * SR)
    m = min(int(dur * SR), n - a)
    t = np.arange(m) / SR
    fc = f_lo * (f_hi / f_lo) ** (1 - np.clip(t / (peak + 2.5 * tail), 0, 1))
    air = svf_bp(rng.standard_normal(m), fc, 0.75)
    wide = lp(hp(rng.standard_normal(m), 1000, 2), 10000, 2)
    tone = svf_bp(rng.standard_normal(m), fc * 0.3, 3.0)
    env = np.where(t < peak, (t / peak) ** 1.8, np.exp(-(t - peak) / tail))
    env = env * (1 + 0.15 * np.sin(2 * np.pi * (34 + 18 * rng.random()) * t))
    out[a:a + m] = (norm(air) + breit * 0.8 * norm(wide) + body * norm(tone)) * env
    return out


# Schimmer der Klinge: unharmonische Teiltöne wie im Lernvideo gemessen (dort Linien bei ≈ 1,5 / 2,9 / 3,9 / 4,2 / 5,1 /
# 5,4 kHz, 0,3–0,6 s nachklingend) – Verhältnisse zum Grundton
SCHIMMER = [1.0, 1.93, 2.57, 2.82, 3.37, 3.61, 4.4]
SCHIMMER_AMP = [0.9, 1.0, 0.75, 0.6, 0.8, 0.65, 0.35]


def shing(rng, n, t0, f0, tau, parts=7, hell=1.0, scrape=1.0):
    """Metallisches „Schiiing“: unharmonische Teiltöne, je zwei leicht verstimmt (Schwebung 2–7 Hz, schimmernd), mit
    einem Hauch Vibrato; klingen lange nach (tau s, obere etwas kürzer). Dazu ein kurzes Schaben im Hochton."""
    out = np.zeros(n)
    a = int(t0 * SR)
    m = n - a
    t = np.arange(m) / SR
    bend = 1 + 0.018 * np.exp(-t / 0.02)
    vib = 1 + 0.0025 * np.sin(2 * np.pi * (5 + 2 * rng.random()) * t)
    sig = np.zeros(m)
    for k, (r, am) in enumerate(zip(SCHIMMER[:parts], SCHIMMER_AMP[:parts])):
        f = f0 * r * (1 + 0.006 * (rng.random() - 0.5))
        if f > 15000:
            continue
        beat = 2 + 5 * rng.random()
        tk = tau * (1 - 0.07 * k)
        ph = 2 * np.pi * np.cumsum(f * bend * vib) / SR
        ph2 = 2 * np.pi * np.cumsum((f + beat) * bend * vib) / SR
        w = am * (hell if k >= 3 else 1.0)
        sig += w * (np.sin(ph + rng.random() * 6) + 0.8 * np.sin(ph2 + rng.random() * 6)) * np.exp(-t / tk)
    sig *= np.clip(t / 0.004, 0, 1)
    scr = bp(rng.standard_normal(m), 3500, 11000, 2) * np.exp(-t / 0.035) * np.clip(t / 0.002, 0, 1)
    out[a:] = norm(sig) + 0.45 * scrape * norm(scr)
    return out


def boom(rng, n, t0, f0=(80, 38), tau=0.18, oberton=0.55):
    """Kinoartiger Einschlag: tiefer, langer Sub-Bass (gleitet von f0[0] nach f0[1]), dazu eine Oberton-Schicht um
    100–250 Hz (zweiter Ton, gesättigt), damit der Schlag auch auf Handy-Lautsprechern (unter ≈ 150 Hz stumm) ankommt."""
    out = np.zeros(n)
    a = int(t0 * SR)
    m = n - a
    t = np.arange(m) / SR
    f = f0[1] + (f0[0] - f0[1]) * np.exp(-t / 0.05)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / tau) * np.clip(t / 0.003, 0, 1)
    sub = np.tanh(1.3 * sub) / np.tanh(1.3)
    fo = 2.6 * f + 40
    ob = np.sin(2 * np.pi * np.cumsum(fo) / SR) * np.exp(-t / (tau * 0.55)) * np.clip(t / 0.002, 0, 1)
    ob = np.tanh(2.2 * ob) / np.tanh(2.2)
    ob = bp(ob, 90, 320, 2)
    out[a:] = norm(sub) + oberton * norm(ob)
    return out


def impact(rng, n, t0, thump=0.6, crack=0.45, slice_=0.3, wood=False):
    """Treffer bei t0: dumpfer Schlag, Knacken, kurzes nasses Schneiden (der Boom kommt aus boom())."""
    out = np.zeros(n)
    a = int(t0 * SR)
    m = n - a
    t = np.arange(m) / SR
    th = bp(rng.standard_normal(m), 110, 650, 2) * np.exp(-t / 0.035)
    if wood:
        cr = bp(rng.standard_normal(m), 700, 3200, 2) * np.exp(-t / 0.014)
    else:
        cr = hp(rng.standard_normal(m), 1400) * np.exp(-t / 0.007)
    sl_f = 2600 * np.exp(-t / 0.05) + 500
    sl = svf_bp(rng.standard_normal(m), sl_f, 1.6) * np.exp(-t / 0.045)
    out[a:] = thump * norm(th) + crack * norm(cr) + slice_ * norm(sl)
    return out


def fade_tail(x, ms=40):
    k = int(ms / 1000 * SR)
    x[-k:] *= np.linspace(1, 0, k) ** 2
    return x


# --- Arten -----------------------------------------------------------------------------------------------------
# je Art: Luft (f_hi, f_lo, Anschwellen, Ausklang s, Breite), Schimmer (Grundton-Bereich Hz, Nachklang tau s, Teiltöne,
# Höhen, Anteil), Boom (Gleiten Hz, tau s, Oberton-Anteil, Anteil), Treffer (Anteile), Lage des Treffers (s)
ARTEN = {
    'klingenhieb_schwert': dict(seed=101, air=(7500, 2600, 0.035, 0.085, 1.0), ring=((1450, 1650), 0.24, 7, 1.0, 0.42),
                                boom=((84, 40), 0.115, 0.45, 0.85), imp=dict(thump=0.55, crack=0.5, slice_=0.35), t_imp=0.045),
    'klingenhieb_axt': dict(seed=202, air=(6000, 1800, 0.04, 0.08, 0.75), ring=((1050, 1250), 0.14, 5, 0.6, 0.24),
                            boom=((76, 38), 0.12, 0.55, 0.85), imp=dict(thump=0.85, crack=0.6, slice_=0.25, wood=True), t_imp=0.05),
    'klingenhieb_wucht': dict(seed=303, air=(5500, 1500, 0.05, 0.11, 0.9), ring=((1150, 1350), 0.26, 6, 0.85, 0.34),
                              boom=((70, 34), 0.15, 0.5, 0.9), imp=dict(thump=0.75, crack=0.5, slice_=0.28), t_imp=0.06),
}


def variante(cfg, rolle, i):
    """Ein Laut; zurück: (Klang, Lage des Anschlags in s – Treffer bzw. Höhepunkt des Zischens)."""
    rng = np.random.default_rng(cfg['seed'] * 100 + {'hit': 0, 'fin': 30, 'swing': 60}[rolle] + i)
    fin = rolle == 'fin'
    hit = rolle != 'swing'
    f_hi, f_lo, a_peak, a_tail, breit = cfg['air']
    (r_lo, r_hi), r_tau, parts, hell, r_amp = cfg['ring']
    (b_hi, b_lo), b_tau, b_ob, b_amp = cfg['boom']
    t_imp = cfg['t_imp'] * (1.15 if fin else 1)
    jit = lambda s: 1 + s * (rng.random() * 2 - 1)  # noqa: E731
    dur = (1.25 if fin else 0.95) if hit else 0.7
    n = int(dur * SR)
    x = np.zeros(n)
    # Wusch: setzt kurz vor dem Treffer ein, breit und hell; Finisher länger, dazu ein tiefer zweiter Zug
    pk = a_peak * (1.2 if fin else 1) * jit(0.1)
    x += 0.62 * whoosh(rng, n, max(0.0, t_imp - pk) if hit else 0.0, 0.6, f_hi * jit(0.08), f_lo * jit(0.1),
                       pk, a_tail * (1.3 if fin else 1) * jit(0.1), breit)
    if fin:
        x += 0.3 * whoosh(rng, n, 0.0, 0.7, f_hi * 0.5, f_lo * 0.5, pk * 1.4, a_tail * 1.6, 0.5, body=0.8)
    # Schimmer der Klinge: setzt mit dem Treffer ein (ohne Treffer am Höhepunkt des Zischens) und klingt lange nach
    f0 = r_lo + (r_hi - r_lo) * rng.random()
    t_ring = t_imp if hit else a_peak
    x += r_amp * (1.15 if fin else 1) * (1.0 if hit else 0.8) * shing(rng, n, t_ring, f0 * (0.94 if fin else 1),
                                                                       r_tau * (1.2 if fin else 1) * jit(0.12), parts, hell, scrape=1.0 if hit else 0.7)
    if hit:
        # Boom: die lauteste Schicht, beim Finisher tiefer und länger
        x += b_amp * (1.2 if fin else 1) * boom(rng, n, t_imp, (b_hi * jit(0.05) * (0.92 if fin else 1), b_lo * jit(0.05) * (0.88 if fin else 1)),
                                                b_tau * (1.35 if fin else 1) * jit(0.08), b_ob)
        imp = dict(cfg['imp'])
        if fin:
            imp.update(thump=imp['thump'] * 1.2, crack=imp['crack'] * 1.15)
        x += 0.8 * impact(rng, n, t_imp, **imp)
    x = lp(hp(x, 28, 2), 16000, 2)
    # sanft sättigen (wie ein Bus-Kompressor): Spitzen gerundet, der Laut dichter – sonst müsste der Begrenzer beim Bauen
    # viel wegnehmen und der Einschlag verlöre seinen Biss
    x = norm(x)
    x = np.tanh(2.2 * x) / np.tanh(2.2)
    return fade_tail(x * 0.8, 80), (t_imp if hit else a_peak)


def erzeuge(ident, roh):
    cfg = ARTEN[ident]
    teile = []
    for rolle, k in (('hit', 4), ('fin', 2), ('swing', 3)):
        for i in range(k):
            teile.append(variante(cfg, rolle, i))
    luecke = np.zeros(int(0.3 * SR))
    alles = [luecke]
    schnitte = []
    spitzen = []
    t = len(luecke)
    for s, an in teile:
        schnitte.append([round((t - int(0.004 * SR)) / SR, 4), round((t + len(s) + int(0.02 * SR)) / SR, 4)])
        spitzen.append(round(t / SR + an, 4))
        alles += [s, luecke]
        t += len(s) + len(luecke)
    os.makedirs(os.path.join(roh, 'sfx'), exist_ok=True)
    ziel = os.path.join(roh, 'sfx', ident + '.wav')
    wf.write(ziel, SR, np.concatenate(alles).astype(np.float32))
    with open(os.path.join(roh, 'sfx', ident + '.json'), 'w', encoding='utf8') as f:
        json.dump({'schnitte': schnitte, 'spitzen': spitzen}, f)
    print('geschrieben', ziel, len(teile), 'Laute')


def main():
    args = sys.argv[1:]
    roh = os.path.expanduser('~/.cache/seelenstein-klang-roh')
    if '--roh' in args:
        i = args.index('--roh')
        roh = args[i + 1]
        del args[i:i + 2]
    ids = args or list(ARTEN)
    for ident in ids:
        if ident not in ARTEN:
            print('unbekannt:', ident)
            return 1
        erzeuge(ident, roh)
    return 0


if __name__ == '__main__':
    sys.exit(main())
