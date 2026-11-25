#!/usr/bin/env python3
"""„Klage des Turms“ (seit 15.73): traurige Solo-Violine beim Betreten des Turms der Verdammten (Anweg, Halle bis zur
ersten Welle) und nach dem Sieg. Eigene Komposition – keine fremde Melodie, kein Nachbau eines bekannten Stücks.

d-Moll, 64 BPM, 32 Takte (2 Minuten, geschlossene Schleife). Aufbau:
  Takt 1      Vorspiel: Harfe, leise Celli und Bratschen, ferner Gong; Auftakt der Geige
  Takt 2–9    Thema A auf der Solo-Violine (piano), Harfe in Achteln, Streicherfläche
  Takt 10     Überleitung (Celli)
  Takt 11–18  Thema A' mit Gegenstimme der Celli, zweite Hälfte eine Oktave höher
  Takt 19–26  Höhepunkt B: Geige hoch und kräftiger, Bratschen eine Oktave tiefer mit, volle Streicher, Kontrabass,
              Gong, Paukenwirbel in Takt 21
  Takt 27–31  Thema leise wieder (A''), mit dem kleinen Seufzer Es–D (phrygische Färbung, fernöstlicher Ton)
  Takt 32     Ausklang auf D; Hall und Harfe laufen in den Anfang
Akkorde: Dm | Dm Bb Gm A Dm F Gm–A Dm | Bb | … | Bb F Gm Dm Bb C A A | Dm Bb Gm A Dm | Dm

Instrumente sind echte Aufnahmen, alle CC0 (VSCO 2 Community Edition, Versilian Studios): Solo-Violine (Arco mit
Vibrato), Violinen-, Bratschen- und Cello-Gruppe (gehalten, Vibrato), Kontrabass, Harfe, Gong, Paukenwirbel. Nur die
gebrauchten Ordner werden beim ersten Lauf geholt (≈ 390 MB), NICHT ins Repo.

Wie alle Stücke als geschlossene Schleife gerechnet (Mischer aus musik.py: was über das Ende hinausklingt, läuft vorn
weiter); die Rohdatei hat zwei Takte Vorspiel + Schleife + zwei Takte Nachlauf, die MP3 baut tools/klang-erzeugen.py.

Aufruf:
  python3 tools/klang-synth/turmklage.py [--aus <ordner>] [--samples <ordner>]   # Hörproben (MP3) zum Anhören
  python3 tools/klang-erzeugen.py roh turmklage --roh <ordner>                    # Rohdatei <roh>/musik/turmklage.wav
  python3 tools/klang-erzeugen.py bauen turmklage --roh <ordner>                  # snd/musik/turmklage.mp3 + Eintrag
Braucht: python3 mit numpy und scipy, git, ffmpeg (libmp3lame).
"""
import os
import shutil
import subprocess
import sys

import numpy as np

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
import arena_varianten as AV  # noqa: E402  (Samples lesen, Instrumente, Satz, Mischpult, Hörprobe)
import musik as MU  # noqa: E402
from musik import SR, kette, eq_spitze, eq_kuhle, _sos  # noqa: E402

KE = AV.KE
BPM = 64
TAKTE = 32
QUELLE = dict(url='https://github.com/sgossner/VSCO-2-CE', stand='440300901dfe9275fd84e0b7763af1f8443ae62e', pfade=[
    '/LICENSE', '/Readme.txt', '/Strings/Solo Violin/Arco Vib/', '/Strings/Violin Section/susVib/',
    '/Strings/Viola Section/susvib/', '/Strings/Cello Section/susvib/', '/Strings/Solo Contrabass/SusVib/', '/Strings/Harp/',
    '/Percussion/Timpani/Rolls/', '/Percussion/gongHit*'])


def hole_samples(wurzel):
    """Nur die gebrauchten Ordner (festgelegter Stand) mit git holen, .git danach löschen."""
    ziel = os.path.join(wurzel, 'vsco-klage')
    if os.path.exists(os.path.join(ziel, '.fertig')):
        return
    print('hole Samples:', QUELLE['url'], flush=True)
    tmp = ziel + '.tmp'
    shutil.rmtree(tmp, ignore_errors=True)
    os.makedirs(tmp)
    git = ['git', '-C', tmp]
    subprocess.run(git + ['init', '-q'], check=True)
    subprocess.run(git + ['remote', 'add', 'origin', QUELLE['url']], check=True)
    subprocess.run(git + ['sparse-checkout', 'set', '--no-cone'] + QUELLE['pfade'], check=True)
    subprocess.run(git + ['fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', QUELLE['stand']], check=True)
    subprocess.run(git + ['checkout', '-q', 'FETCH_HEAD'], check=True)
    shutil.rmtree(os.path.join(tmp, '.git'))
    shutil.rmtree(ziel, ignore_errors=True)
    os.rename(tmp, ziel)
    open(os.path.join(ziel, '.fertig'), 'w').write(QUELLE['stand'] + '\n')


class KlageBib(AV.Bibliothek):
    """Instrumente dieses Stücks. Solo-Violine und Harfe heißen nach der echten Tonhöhe (okt=0), die Streichergruppen
    und der Kontrabass eine Oktave tiefer (C3 = mittleres C, okt=1 wie in arena_varianten.py)."""

    def _lade(self, n):
        V = 'vsco-klage/'
        D = self.dateien
        I = AV.Instrument
        defs = {
            'geige_solo': lambda: I(n, D(V + 'Strings/Solo Violin/Arco Vib'), okt=0, vor=0.07, max_dauer=10),
            'geigen_lang': lambda: I(n, D(V + 'Strings/Violin Section/susVib'), vor=0.05, max_dauer=10),
            'violen_lang': lambda: I(n, D(V + 'Strings/Viola Section/susvib'), vor=0.05, max_dauer=10),
            'celli_lang': lambda: I(n, D(V + 'Strings/Cello Section/susvib'), vor=0.05, max_dauer=10),
            'kb_lang': lambda: I(n, D(V + 'Strings/Solo Contrabass/SusVib'), vor=0.05, max_dauer=10),
            'harfe': lambda: I(n, D(V + 'Strings/Harp'), okt=0, fenster=(0.05, 0.4), vor=0.004, max_dauer=7),
            'gong': lambda: I(n, D(V + 'Percussion', ['gongHit*']), False, vor=0.004, max_dauer=9),
            'pauke_wirbel': lambda: I(n, D(V + 'Percussion/Timpani/Rolls'), False, vor=0.004, max_dauer=8, ausgleich=False,
                                      tonmap=lambda f: AV.PAUKE[f[7]]),
        }
        print('  lade', n, flush=True)
        inst = defs[n]()
        if n == 'harfe':   # Harfe: eine Stärke für alle Töne (die Aufnahmen tragen verschiedene Namen: mp/mf/f)
            for z in inst.zonen:
                z['stufe'] = 0
            inst.stufen = [5]
        inst.rng = np.random.default_rng(abs(hash(n)) % 2 ** 32)
        return inst


# === Noten ============================================================================================================
# Akkorde je Takt (Takt 1 = Index 0); Tupel = zwei halbe Takte
AKK = ['Dm', 'Dm', 'Bb', 'Gm', 'A', 'Dm', 'F', ('Gm', 'A'), 'Dm', 'Bb',
       'Dm', 'Bb', 'Gm', 'A', 'Dm', 'F', ('Gm', 'A'), 'Dm',
       'Bb', 'F', 'Gm', 'Dm', 'Bb', 'C', 'A', 'A',
       'Dm', 'Bb', 'Gm', 'A', 'Dm', 'Dm']
# Lage der Streicherfläche (echte MIDI-Höhe): Celli, Bratschen, zwei Violinstimmen, Kontrabass
LAGE = {'Dm': (50, 57, 65, 69, 38), 'Bb': (46, 53, 62, 65, 34), 'Gm': (43, 58, 62, 67, 31), 'A': (45, 57, 61, 64, 33),
        'F': (41, 57, 60, 65, 29), 'C': (48, 55, 64, 67, 36)}
# Harfe: gebrochener Akkord in Achteln (auf, ab)
ARP = {'Dm': (50, 57, 62, 65, 69, 65, 62, 57), 'Bb': (46, 53, 58, 62, 65, 62, 58, 53), 'Gm': (43, 50, 55, 58, 62, 58, 55, 50),
       'A': (45, 52, 57, 61, 64, 61, 57, 52), 'F': (41, 48, 53, 57, 60, 57, 53, 48), 'C': (48, 55, 60, 64, 67, 64, 60, 55)}

# Solo-Violine: (Schlag ab Anfang des Stücks, Dauer in Schlägen, MIDI, Ausdruck 0–1+)
D4, E4, F4, G4, A4, B4, C5, CS5, D5, ES5, E5, F5, G5, A5, B5, C6, CS6, D6, ES6, E6, F6, G6, A6 = (
    62, 64, 65, 67, 69, 70, 72, 73, 74, 75, 76, 77, 79, 81, 82, 84, 85, 86, 87, 88, 89, 91, 93)


def thema(b0, okt=0, schluss='seufzer'):
    """Thema A (acht Takte ab Schlag b0 = Takt 2). Zweite Hälfte (Takt 6–9) auf Wunsch eine Oktave höher (okt)."""
    o = 12 * okt
    n = [(b0 + 0, 1.5, D5, 0.95), (b0 + 1.5, 0.5, E5, 0.9), (b0 + 2, 1, F5, 1.0), (b0 + 3, 0.5, E5, 0.9), (b0 + 3.5, 0.5, D5, 0.85),
         (b0 + 4, 2, D5, 1.0), (b0 + 6, 0.5, C5, 0.85), (b0 + 6.5, 0.5, B4, 0.85), (b0 + 7, 1, A4, 0.9),
         (b0 + 8, 1.5, B4, 0.95), (b0 + 9.5, 0.5, A4, 0.85), (b0 + 10, 1, G4, 0.9), (b0 + 11, 1, B4, 0.95),
         (b0 + 12, 3, A4, 1.0), (b0 + 15.5, 0.5, A4 + o, 0.8),
         (b0 + 16, 1.5, D5 + o, 1.0), (b0 + 17.5, 0.5, E5 + o, 0.95), (b0 + 18, 1, F5 + o, 1.0), (b0 + 19, 1, G5 + o, 1.05),
         (b0 + 20, 2, A5 + o, 1.12), (b0 + 22, 0.5, G5 + o, 1.0), (b0 + 22.5, 0.5, F5 + o, 0.95), (b0 + 23, 1, E5 + o, 0.95),
         (b0 + 24, 1, F5 + o, 1.0), (b0 + 25, 0.5, E5 + o, 0.9), (b0 + 25.5, 0.5, D5 + o, 0.9), (b0 + 26, 1, E5 + o, 0.95),
         (b0 + 27, 1, CS5 + o, 0.95)]
    if schluss == 'seufzer':   # D – Es – D: der Seufzer mit der kleinen Sekunde
        n += [(b0 + 28, 2, D5 + o, 1.0), (b0 + 30, 0.5, ES5 + o, 0.9), (b0 + 30.5, 1.5, D5 + o, 0.85)]
    return n


GEIGE = [(3.5, 0.5, A4, 0.8)] + thema(4) + [(39.5, 0.5, A4, 0.8)] + thema(40, okt=1)
# Höhepunkt (Takt 19–26)
GEIGE += [(72, 1, F5, 1.0), (73, 2, B5, 1.1), (75, 0.5, A5, 1.0), (75.5, 0.5, G5, 0.95),
          (76, 1.5, A5, 1.05), (77.5, 0.5, F5, 0.95), (78, 2, C6, 1.15),
          (80, 1, B5, 1.05), (81, 0.5, A5, 1.0), (81.5, 0.5, G5, 1.0), (82, 2, D6, 1.25),
          (84, 1.5, D6, 1.15), (85.5, 0.5, C6, 1.05), (86, 1, A5, 1.0), (87, 1, F5, 0.95),
          (88, 1, G5, 1.0), (89, 0.5, F5, 0.95), (89.5, 0.5, ES5, 0.95), (90, 2, D5, 1.0),
          (92, 1, E5, 0.95), (93, 1, G5, 1.0), (94, 1.5, C6, 1.1), (95.5, 0.5, B5, 1.0),
          (96, 2, A5, 1.05), (98, 0.5, G5, 0.95), (98.5, 0.5, F5, 0.95), (99, 1, E5, 0.95),
          (100, 2, CS5, 0.95), (102, 1, E5, 0.95), (103, 1, A4, 0.85)]
# A'' (Takt 27–31) und Ausklang
GEIGE += [(104, 1.5, D5, 0.9), (105.5, 0.5, E5, 0.85), (106, 1, F5, 0.95), (107, 0.5, E5, 0.85), (107.5, 0.5, D5, 0.8),
          (108, 2, D5, 0.95), (110, 0.5, C5, 0.8), (110.5, 0.5, B4, 0.8), (111, 1, A4, 0.85),
          (112, 1.5, B4, 0.9), (113.5, 0.5, A4, 0.8), (114, 1, G4, 0.85), (115, 1, ES5, 0.95),
          (116, 2, D5, 0.95), (118, 2, CS5, 0.9),
          (120, 5.5, D5, 0.85)]
# Gegenstimme der Celli (Takt 10–18): (Schlag, Dauer, MIDI)
CELLI = [(36, 1, 53), (37, 1, 55), (38, 1.5, 57),
         (40, 2, 53), (42, 2, 57), (44, 2, 58), (46, 1, 57), (47, 1, 55), (48, 2, 55), (50, 2, 58), (52, 2, 57), (54, 2, 61),
         (56, 2, 62), (58, 2, 60), (60, 2, 57), (62, 2, 60), (64, 2, 58), (66, 2, 57), (68, 2, 57), (70, 2, 50)]


# === Satz =============================================================================================================
def geige(S, bus, noten, vel, pan=0.06, binde=0.12, ueber=0.11, rel=0.7, laut=None):
    """Gebundene Solo-Violine: Töne ohne Pause dazwischen gehen ineinander über (Einsatz des Samples weggelassen,
    überblendet); lange Töne schwellen an und wieder leicht ab (Bogen), kurze bleiben gleich. laut(schlag) → Faktor."""
    I = S.B['geige_solo']
    b = S.beat
    for k, (s, d, m, a) in enumerate(noten):
        # gebunden nur bei anderem Ton (gleicher Ton: neuer Bogenstrich)
        vor_geb = k > 0 and abs(noten[k - 1][0] + noten[k - 1][1] - s) < 1e-6 and noten[k - 1][2] != m
        nach_geb = k + 1 < len(noten) and abs(s + d - noten[k + 1][0]) < 1e-6 and noten[k + 1][2] != m
        v = float(np.clip(vel * a * (laut(s) if laut else 1.0) * (1 + S.rng.uniform(-0.03, 0.03)), 0.05, 1.0))
        dauer = d * b
        y = I.ton(m, v, dauer, ueber if nach_geb else rel, versatz=binde if vor_geb else 0.0, cent=float(S.rng.normal(0, 3)),
                  ein=ueber if vor_geb else 0.0)
        if d >= 1.5:
            n1 = min(int(dauer * SR), len(y))
            x = np.linspace(0, 1, n1)
            e = np.ones(len(y))
            e[:n1] = 0.8 + 0.2 * np.sin(np.pi * np.clip(x * 1.25, 0, 1)) ** 0.8
            if n1 < len(y):
                e[n1:] = e[n1 - 1]
            y = y * e[:, None]
        t = s * b - (0.0 if vor_geb else I.vor) + S.j(3 if vor_geb else 6)
        S.M(bus, t, AV.stereo_lage(y, pan, 0.55))


def flaeche(S, i, akk, b0, dauer, vel, welche=('vc', 'va', 'v1', 'v2'), kb=0.0, ein=0.35, rel=1.1):
    vc, va, v1, v2, k = LAGE[akk]
    t = b0 * S.beat
    d = dauer * S.beat
    if 'vc' in welche:
        S.spiel('flaeche', 'celli_lang', t, vc, vel, d, -0.35, 0.6, rel, jit=12, ein=ein)
    if 'va' in welche:
        S.spiel('flaeche', 'violen_lang', t, va, vel * 0.95, d, 0.3, 0.6, rel, jit=12, ein=ein)
    if 'v1' in welche:
        S.spiel('flaeche', 'geigen_lang', t, v1, vel * 0.9, d, -0.15, 0.7, rel, jit=12, ein=ein)
    if 'v2' in welche:
        S.spiel('flaeche', 'geigen_lang', t, v2, vel * 0.85, d, 0.2, 0.7, rel, jit=12, ein=ein)
    if kb > 0:
        S.spiel('bass', 'kb_lang', t, k, kb, d, 0.0, 0.3, rel, jit=10, ein=ein)


def harfe_achtel(S, akk, b0, schlaege, vel, nur=None):
    ar = ARP[akk]
    for k in range(int(schlaege * 2)):
        if nur and k % nur:
            continue
        m = ar[k % 8]
        S.spiel('harfe', 'harfe', (b0 + k * 0.5) * S.beat, m, vel * (1.0 if k % 4 == 0 else 0.86), 2.6, (m - 56) / 30, 0.4, 0.8,
                jit=7, vj=0.08)


def harfe_griff(S, akk, b0, vel, weit=0.22):
    """gerissener Akkord (von unten nach oben, über weit s)"""
    ar = sorted(set(ARP[akk]))
    ar = ar + [m + 12 for m in ar[-2:]]
    for k, m in enumerate(ar):
        S.spiel('harfe', 'harfe', b0 * S.beat + k * weit / len(ar), m, vel, 3.5, (m - 58) / 28, 0.4, 1.2, jit=3, vj=0.05)


def satz(B):
    S = AV.Satz(B, BPM, TAKTE, 6401)
    T = lambda takt, schlag=0.0: (takt - 1) * 4 + schlag   # noqa: E731  (Takt ab 1, Schlag ab 0 → Schlag im Stück)
    # Streicherfläche und Harfe je Takt
    for i, a in enumerate(AKK):
        takt = i + 1
        teile = [(a, 0, 4)] if isinstance(a, str) else [(a[0], 0, 2), (a[1], 2, 2)]
        for akk, ab, lang in teile:
            b0 = T(takt, ab)
            if takt == 1:          # Vorspiel: nur Celli und Bratschen, ganz leise, eingeblendet
                flaeche(S, i, akk, b0, lang, 0.22, ('vc', 'va'), ein=1.6)
                harfe_achtel(S, akk, b0, lang, 0.42)
            elif takt <= 9:        # Thema A
                flaeche(S, i, akk, b0, lang, 0.3)
                harfe_achtel(S, akk, b0, lang, 0.42)
            elif takt == 10:       # Überleitung
                flaeche(S, i, akk, b0, lang, 0.3, ('va', 'v1', 'v2'))
                harfe_achtel(S, akk, b0, lang, 0.38, nur=2)
            elif takt <= 18:       # A' mit Gegenstimme der Celli (Fläche ohne Celli), ab Takt 15 mit Kontrabass
                flaeche(S, i, akk, b0, lang, 0.34, ('va', 'v1', 'v2'), kb=0.32 if takt >= 15 else 0.0)
                harfe_achtel(S, akk, b0, lang, 0.4, nur=2)
            elif takt <= 26:       # Höhepunkt: volle Fläche, anschwellend, Kontrabass, Harfe gerissen
                st = 0.5 if takt in (19, 20, 23, 24) else 0.58 if takt in (21, 22) else 0.5
                flaeche(S, i, akk, b0, lang, st, kb=0.42, ein=0.25)
                harfe_griff(S, akk, b0, 0.5)
                harfe_achtel(S, akk, b0 + 2, 2, 0.4, nur=2)
            elif takt <= 31:       # A'' leise
                flaeche(S, i, akk, b0, lang, 0.27)
                harfe_achtel(S, akk, b0, lang, 0.38)
            else:                  # Ausklang
                flaeche(S, i, akk, b0, lang, 0.22, ein=0.4, rel=2.2)
                for k, m in enumerate((50, 57, 62, 65, 69, 74)):
                    S.spiel('harfe', 'harfe', (b0 + k * 0.5) * S.beat, m, 0.4, 3.0, (m - 58) / 28, 0.4, 1.5, jit=5)
    # Solo-Violine: Thema leise (piano), Höhepunkt kräftiger, A'' wieder leise
    def laut(s):
        if s < 56:
            return 1.0
        if s < 72:
            return 1.08
        if s < 104:
            return 1.45
        return 0.95
    geige(S, 'geige', GEIGE, 0.38, laut=laut)
    # Bratschen eine Oktave tiefer mit (Höhepunkt, Takt 19–22)
    for (s, d, m, a) in GEIGE:
        if 72 <= s < 88:
            S.spiel('celli', 'violen_lang', s * S.beat, m - 12, 0.34 * a, d * S.beat, 0.25, 0.5, 0.5, jit=8, ein=0.06)
    # Gegenstimme der Celli (Takt 10–18)
    for (s, d, m) in CELLI:
        S.spiel('celli', 'celli_lang', s * S.beat, m, 0.38, d * S.beat, -0.3, 0.5, 0.45, jit=8, ein=0.08)
    # Gong (fern, Vorspiel und Höhepunkt) und Paukenwirbel in den Gipfel (Takt 20, Schlag 2 → Takt 21)
    S.spiel('gong', 'gong', 0.0, vel=0.25, dauer=None, pan=0.1, breite=0.6, jit=0)
    S.spiel('gong', 'gong', T(19) * S.beat, vel=0.45, dauer=None, pan=-0.1, breite=0.6, jit=0)
    S.spiel('pauke', 'pauke_wirbel', T(20, 1.5) * S.beat, 50, 0.55, 2.5 * S.beat, 0.0, 0.5, 0.35, jit=0, kresc=0.12)
    return S


def mix():
    specs = {
        'geige': dict(eq=kette(_sos('hp', 190), eq_spitze(2600, 1.5, 1.0), eq_kuhle(7500, -2.0, hoch=True)), ziel=-19.5,
                      hall={'saal': 0.42}),
        'flaeche': dict(eq=kette(_sos('hp', 70), eq_spitze(300, -1.5, 1.0), _sos('lp', 8000)), ziel=-24.5, hall={'saal': 0.6}),
        'celli': dict(eq=kette(_sos('hp', 55), eq_spitze(250, -2, 1.0)), ziel=-24.5, hall={'saal': 0.42}),
        'bass': dict(eq=kette(_sos('hp', 32)), ziel=-28, hall={'saal': 0.25}),
        'harfe': dict(eq=kette(_sos('hp', 110), eq_spitze(2500, 1, 1.0)), ziel=-24.5, hall={'saal': 0.5}, breite=0.85),
        'pauke': dict(eq=kette(_sos('hp', 35)), ziel=-28, hall={'saal': 0.45}),
        'gong': dict(eq=kette(_sos('hp', 50)), ziel=-30.5, hall={'saal': 0.6}),
    }
    raeume = {'saal': MU.hall_ir(np.random.default_rng(6402), (3.4, 3.0, 2.2, 1.2), 4.6, 0.03, 0.22)}
    master = dict(eq=kette(_sos('hp', 30, 2), eq_kuhle(9000, -1.5, hoch=True)), hall_eq=kette(_sos('hp', 160, 2)), schwelle=-17,
                  ratio=1.5, treiben=1.05)
    return specs, raeume, master


def rechne(proben):
    hole_samples(proben)
    S = satz(KlageBib(proben))
    X, pegel = AV.mischen(S.M, *mix())
    print('  Spuren (LUFS solo):', pegel, flush=True)
    return S, X


def main():
    args = sys.argv[1:]
    aus = os.path.expanduser('~/.cache/seelenstein-klang-roh/turmklage')
    proben = os.path.expanduser('~/.cache/seelenstein-klang-roh/samples')
    roh_dir = None
    for opt in ('--aus', '--samples', '--roh'):
        if opt in args:
            i = args.index(opt)
            val = args[i + 1]
            del args[i:i + 2]
            if opt == '--aus':
                aus = val
            elif opt == '--samples':
                proben = val
            else:
                roh_dir = val
    S, X = rechne(proben)
    if roh_dir:   # Aufruf durch tools/klang-erzeugen.py („turmklage --roh <ordner>“)
        os.makedirs(os.path.join(roh_dir, 'musik'), exist_ok=True)
        ab = MU.rohdatei(os.path.join(roh_dir, 'musik', 'turmklage.wav'), X, S.takt)
        print('  schleife', ab, flush=True)
        return 0
    os.makedirs(os.path.join(aus, 'roh'), exist_ok=True)
    roh = os.path.join(aus, 'roh', 'turmklage.wav')
    ab = MU.rohdatei(roh, X, S.takt)
    e = {'id': 'turmklage', 'lufs': -19, 'tp': -1.5, 'vbr': 2, 'bpm': BPM, 'takt': 4, 'blende': 0.5, 'schleife': ab}
    ziel = os.path.join(aus, 'turmklage.mp3')
    eintrag, info = KE.baue_musik(e, roh, ziel)
    print('  ', eintrag, info, flush=True)
    # Hörproben: das ganze Stück einmal ab dem Anfang der Schleife (mit Ausklang), und 30 s (Anfang + Höhepunkt)
    d = KE.lade(ziel, 2)
    a, b = eintrag['loop']
    voll = np.concatenate([d[int(a * SR):int(b * SR)], d[int(b * SR):int(b * SR) + int(4 * SR)]]).astype(np.float64)
    fo = int(4 * SR)
    voll[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 2
    KE.schreibe_vbr(os.path.join(aus, 'turmklage_ganz.mp3'), voll.astype(np.float32), 2)
    AV.hoerprobe(ziel, eintrag, S.takt, 18, os.path.join(aus, 'turmklage_probe.mp3'))
    print('  fertig:', aus, flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
