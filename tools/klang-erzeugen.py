#!/usr/bin/env python3
"""Klänge und Musik für Seelenstein mit ElevenLabs erzeugen und spielfertig machen (seit 14.5).

Liste aller Klänge: tools/klang-liste.json (Prompt, Dauer, Schnitt, Rollen). Ablauf:
  1. roh   – fehlende Rohdateien bei ElevenLabs erzeugen (Schlüssel NUR aus der Umgebungsvariable ELK)
  2. bauen – Rohdateien schneiden, entrauschen (Stille vorn/hinten weg), Lautheit angleichen, als MP3 nach
             snd/sfx/<id>.mp3 bzw. snd/musik/<id>.mp3 schreiben und js/daten/klang-dateien.js (Lage der Laute,
             Schleifenpunkte der Musik) neu schreiben.

Aufruf:
  ELK=… python3 tools/klang-erzeugen.py            # beides: fehlende roh erzeugen, dann bauen
  python3 tools/klang-erzeugen.py bauen            # nur bauen (ohne Netz)
  ELK=… python3 tools/klang-erzeugen.py roh hieb_schwert dorf   # nur diese erzeugen (fehlende)
  … --neu                                          # vorhandene Rohdateien der genannten ids neu erzeugen
Rohdateien liegen außerhalb des Repos (Standard ~/.cache/seelenstein-klang-roh, sonst --roh <ordner>).

Braucht: python3 mit numpy, ffmpeg (libmp3lame), requests oder urllib.
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


# --- Musik: Schleife suchen und nahtlos machen ------------------------------------------------------------------
def merkmale(x, hop):
    """Je Rahmen: Tonklassen (Chroma, normiert), Klangfarbe (4 Bänder, log) und Anschlagstärke (spektraler Fluss)."""
    n = 4096
    w = np.hanning(n)
    fr = np.arange(0, len(x) - n, hop)
    spec = np.abs(np.fft.rfft(np.stack([x[i:i + n] * w for i in fr]), axis=1)).astype(np.float32)
    f = np.fft.rfftfreq(n, 1 / SR)
    gut = (f > 60) & (f < 5000)
    pc = (np.round(12 * np.log2(f[gut] / 440)) % 12).astype(int)
    ch = np.zeros((len(fr), 12), np.float32)
    for k in range(12):
        ch[:, k] = spec[:, gut][:, pc == k].sum(axis=1)
    ch /= np.linalg.norm(ch, axis=1, keepdims=True) + 1e-9
    band = np.stack([spec[:, (f > lo) & (f < hi)].sum(axis=1) for lo, hi in [(30, 150), (150, 600), (600, 2500), (2500, 9000)]], 1)
    band = np.log(band + 1e-6)
    lg = np.log(spec + 1e-4)
    flux = np.concatenate([[0], np.maximum(0, np.diff(lg, axis=0)).sum(axis=1)])
    return ch, band, flux


def diag_summe(G, W):
    """S[i, j] = Summe von G[i+k, j+k] für k = -W … W (gleitend entlang der Diagonalen)."""
    from scipy.signal import fftconvolve
    return fftconvolve(G, np.eye(2 * W + 1, dtype=np.float32), mode='same')


def schleife(x, e):
    """Schleifenpunkte A < B suchen: die Umgebung von A und B soll gleich klingen (Harmonie, Klangfarbe und
    Rhythmus), dann passt die Überblendung. Danach Feinabgleich auf wenige Samples über die Wellenform."""
    mono = x.mean(axis=1)
    dt = 0.02
    hop = int(dt * SR)
    ch, band, flux = merkmale(mono, hop)
    W = int(e.get('fenster', 3.0) / dt)
    dauer = len(mono) / SR
    a_lo, a_hi = max(W, int(e.get('a_von', 4) / dt)), int(e.get('a_bis', 25) / dt)
    b_lo, b_hi = int(e.get('b_von', 45) / dt), min(len(ch) - W - 1, int((dauer - e.get('ende_weg', 8)) / dt))
    A0, A1, B0, B1 = a_lo - W, a_hi + W, b_lo - W, b_hi + W
    Gc = ch[A0:A1] @ ch[B0:B1].T
    bn = (band - band.mean(0)) / (band.std(0) + 1e-9)
    bn /= np.linalg.norm(bn, axis=1, keepdims=True) + 1e-9
    Gb = bn[A0:A1] @ bn[B0:B1].T
    fz = (flux - flux.mean()) / (flux.std() + 1e-9)
    Gf = np.outer(fz[A0:A1], fz[B0:B1]).astype(np.float32)
    n = 2 * W + 1
    S = (diag_summe(Gc, W) / n) + 0.3 * (diag_summe(Gb, W) / n) + 0.15 * np.tanh(diag_summe(Gf, W) / n)
    S = S[W:W + (a_hi - a_lo), W:W + (b_hi - b_lo)]
    # längere Schleifen leicht bevorzugen
    S = S + e.get('laenge_bonus', 0.002) * ((np.arange(b_lo, b_hi)[None, :] - np.arange(a_lo, a_hi)[:, None]) * dt)
    i, j = np.unravel_index(np.argmax(S), S.shape)
    A, B = a_lo + i, b_lo + j
    a, b = A * hop, B * hop
    # Rhythmus abgleichen (±200 ms): Anschlagshüllkurve 6 s vor bis 2 s nach dem Punkt
    b += rhythmus_versatz(mono, a, b)
    # Feinabgleich (±6 ms) über die Wellenform, damit die Schwingungen zusammenpassen
    r = int(0.006 * SR)
    L = int(0.08 * SR)
    ref = mono[a - L:a]
    bestc, off = -9.0, 0
    for d in range(-r, r + 1):
        seg = mono[b + d - L:b + d]
        c = float(np.dot(ref, seg) / (np.linalg.norm(ref) * np.linalg.norm(seg) + 1e-9))
        if c > bestc:
            bestc, off = c, d
    return a, b + off, float(S[i, j]), bestc


def anschlaege(s, hop):
    n = 2048
    w = np.hanning(n)
    fr = np.arange(0, len(s) - n, hop)
    sp = np.log(np.abs(np.fft.rfft(np.stack([s[i:i + n] * w for i in fr]), axis=1)) + 1e-4)
    fl = np.concatenate([[0], np.maximum(0, np.diff(sp, axis=0)).sum(axis=1)])
    fl -= np.convolve(fl, np.ones(40) / 40, mode='same')
    return np.maximum(0, fl)


def rhythmus_versatz(mono, a, b, vor=6.0, nach=2.0, weit=0.2):
    hop = int(0.004 * SR)
    lag = int(weit * SR / hop)
    va, na = int(min(vor, a / SR - 0.05) * SR), int(nach * SR)
    ea = anschlaege(mono[a - va:a + na], hop)
    eb = anschlaege(mono[b - va - lag * hop:b + na + lag * hop], hop)
    best, bl = -1e9, 0
    for l in range(-lag, lag + 1):
        seg = eb[lag + l:lag + l + len(ea)]
        if len(seg) < len(ea):
            continue
        c = float(np.dot(ea, seg))
        if c > best:
            best, bl = c, l
    return bl * hop


def baue_musik(e, roh, ziel):
    x = lade(roh, 2)
    if 'schleife' in e:
        a, b = int(e['schleife'][0] * SR), int(e['schleife'][1] * SR)
        guete = (None, None)
    else:
        a, b, s, c = schleife(x, e)
        guete = (round(s, 3), round(c, 3))
    X = int(e.get('blende', 2.5) * SR)
    P = int(0.6 * SR)
    X = min(X, a)
    # Körper A..B; die letzten X Samples blenden (gleiche Leistung) in das über, was vor A kommt
    body = x[a:b].copy()
    t = np.linspace(0, np.pi / 2, X)[:, None]
    body[-X:] = x[b - X:b] * np.cos(t) + x[a - X:a] * np.sin(t)
    # Vorspiel (Anfang des Stücks bis A, sanft eingeblendet) + Körper + Nachlauf (= Anfang des Körpers)
    vor = x[:a].copy()
    fi = int(0.05 * SR)
    vor[:fi] *= np.linspace(0, 1, fi)[:, None]
    nach = x[a:a + P]
    y = np.concatenate([vor, body, nach])
    g = 10 ** ((e.get('lufs', -19.0) - integriert(body)) / 20)
    y = begrenzer(y * g, 0.89)
    schreibe(ziel, y, e.get('kbps', 128), 2)
    return {'loop': [round(float(a) / SR, 4), round(float(b) / SR, 4)], 'dur': round(len(y) / SR, 3)}, guete


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
        info, guete = baue_musik(e, roh, os.path.join(REPO, 'snd', 'musik', e['stimmung'] + '.mp3'))
        daten['musik'][e['stimmung']] = info
        print('musik', e['id'], '→', e['stimmung'], info, 'Güte', guete)
    kopf = ('// Von tools/klang-erzeugen.py geschrieben (nicht von Hand ändern): Lage der Laute in snd/sfx/<id>.mp3\n'
            '// ([Start, Dauer] in s, „roles“: welche Laute zu welchem Ereignis gehören) und Schleifenpunkte der Musik\n'
            '// snd/musik/<stimmung>.mp3 ([Anfang, Ende] der Schleife in s; davor ein Vorspiel, danach ein kurzer Nachlauf).\n')
    with open(alt, 'w', encoding='utf8') as f:
        f.write(kopf)
        f.write('const SFX_FILES = ' + json.dumps(daten['sfx'], separators=(',', ':')) + ';\n')
        f.write('const MUSIC_FILES = ' + json.dumps(daten['musik'], separators=(',', ':')) + ';\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
