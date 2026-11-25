# Seit 14.12: Bogenschuss ohne ElevenLabs, synthetisch (die erzeugte Aufnahme klang dumpf und verwaschen).
# Einbauen: python3 tools/klang-synth/bogen-einbauen.py (schreibt snd/sfx/bogen_schuss*.mp3 und gibt die Clips für js/daten/klang-dateien.js aus).
# klang-erzeugen.py würde beim Neubau die alte Aufnahme zurückholen – danach dieses Skript erneut laufen lassen.
# Bogenschuss synthetisch: Sehnenschlag (gedämpfte Saite + Holzklopfen) und kurzes Pfeilzischen
import numpy as np, scipy.signal as sg, scipy.io.wavfile as wf, json, sys
SR = 44100
rng = np.random.default_rng(7)

def bandnoise(n, lo, hi, order=2):
    b, a = sg.butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band')
    return sg.lfilter(b, a, rng.standard_normal(n))

def env(n, att, dec, shape=1.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(att, 1e-4)) * np.exp(-np.maximum(0, t - att) / dec) ** shape
    return e

def shot(f0=150, whoosh=1.0, dur=0.42, bright=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    # 1) Sehne: Grundton fällt leicht ab (Saite entspannt sich), Obertöne klingen schneller aus
    f = f0 * (1 + 0.18 * np.exp(-t / 0.015))
    ph = 2 * np.pi * np.cumsum(f) / SR
    string = (np.sin(ph) * env(n, 0.001, 0.07) + 0.45 * np.sin(2 * ph + 0.3) * env(n, 0.001, 0.04)
              + 0.25 * np.sin(3.02 * ph) * env(n, 0.001, 0.025) + 0.12 * np.sin(4.1 * ph) * env(n, 0.001, 0.015))
    out += 0.75 * string
    # 2) Schlag der Sehne gegen den Armschutz / Holz: kurzer, tiefer Klopfer
    thump = bandnoise(n, 120, 900, 2) * env(n, 0.0008, 0.018)
    out += 0.9 * thump / (np.abs(thump).max() + 1e-9)
    # 3) heller Klick beim Loslassen
    click = bandnoise(n, 2500, 7000, 2) * env(n, 0.0003, 0.004)
    out += 0.35 * bright * click / (np.abs(click).max() + 1e-9)
    # 4) Pfeil zischt davon: Rauschen, Bandmitte fällt (entfernt sich), leiser werdend
    m = int(0.32 * SR)
    st = int(0.012 * SR)
    seg = np.zeros(m)
    w = rng.standard_normal(m)
    # zeitvariabler Bandpass über Blöcke
    blk = 512
    zi = None
    for i in range(0, m, blk):
        fc = 3200 - 1900 * (i / m)
        b, a = sg.butter(2, [max(200, fc * 0.55) / (SR / 2), min(SR / 2 - 100, fc * 1.5) / (SR / 2)], 'band')
        seg[i:i + blk] = sg.lfilter(b, a, w[i:i + blk])
    seg *= env(m, 0.025, 0.09)
    seg /= np.abs(seg).max() + 1e-9
    out[st:st + m] += 0.42 * whoosh * seg[: n - st]
    # sanft ausblenden, normalisieren
    fade = int(0.04 * SR)
    out[-fade:] *= np.linspace(1, 0, fade)
    return out / (np.abs(out).max() + 1e-9) * 0.89

def build(name, variants):
    gap = int(0.14 * SR)
    lead = int(0.02 * SR)
    parts = [np.zeros(lead)]
    clips = []
    pos = 0.02
    for v in variants:
        s = shot(**v)
        peak = float(np.argmax(np.abs(s)) / SR)
        clips.append([round(pos, 3), round(len(s) / SR, 3), round(peak, 3)])
        parts += [s, np.zeros(gap)]
        pos += len(s) / SR + 0.14
    audio = np.concatenate(parts)
    wf.write(name + '.wav', SR, (audio * 32767).astype(np.int16))
    return clips

if __name__ == '__main__':
  c1 = build('bogen_schuss', [dict(f0=150, whoosh=1.0), dict(f0=138, whoosh=0.9, bright=0.8), dict(f0=162, whoosh=1.1, bright=1.1)])
  c2 = build('bogen_schuss2', [dict(f0=145, whoosh=0.8, dur=0.36), dict(f0=156, whoosh=0.95, dur=0.38)])
  json.dump({'bogen_schuss': c1, 'bogen_schuss2': c2}, open('clips.json', 'w'))
  print(c1, c2)
