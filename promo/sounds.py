"""Sound design for the Wateroo promo (no voice, synthesized sounds only).

Writes a 10-second 48 kHz stereo WAV whose cues match scene.html:
  0.62 / 0.84  phone buzz          0.72  notification chime
  2.75         glass picked up     3.6–4.75  gulps
  5.05         "refreshed" sparkle 5.28  glass set down
  5.45         whoosh into the app 6.0   tap on +500 ml
  6.25–7.1     glass fills (bubbles, rising)
  7.1          success arpeggio    7.45  love-note pop
  8.2          soft whoosh         8.4   logo chord + sparkles

Usage: python3 sounds.py out.wav
"""

import sys
import wave

import numpy as np

SR = 48_000
DUR = 10.0
rng = np.random.default_rng(7)
mix = np.zeros(int(SR * DUR))


def t_axis(dur):
    return np.arange(int(SR * dur)) / SR


def place(sig, at, gain=1.0):
    # Short fades at both ends so no cue starts or stops with a click.
    sig = sig.copy()
    fi, fo = min(len(sig) // 4, int(0.003 * SR)), min(len(sig) // 4, int(0.012 * SR))
    sig[:fi] *= np.linspace(0, 1, fi)
    sig[len(sig) - fo:] *= np.linspace(1, 0, fo)
    i = int(at * SR)
    end = min(len(mix), i + len(sig))
    mix[i:end] += sig[: end - i] * gain


def env(n_attack, dur, decay):
    t = t_axis(dur)
    e = np.exp(-t / decay)
    a = int(n_attack * SR)
    if a > 0:
        e[:a] *= np.linspace(0, 1, a)
    return e


def bell(freq, dur=1.0, decay=0.35, partials=((1, 1.0), (2.76, 0.35), (5.4, 0.12))):
    t = t_axis(dur)
    sig = sum(a * np.sin(2 * np.pi * freq * r * t) * np.exp(-t * r / (decay * 3)) for r, a in partials)
    return sig * env(0.004, dur, decay)


def lowpass(x, cutoff):
    """One-pole low-pass; cutoff may be an array (time-varying)."""
    cutoff = np.broadcast_to(cutoff, x.shape)
    alpha = 1 - np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += alpha[i] * (x[i] - acc)
        y[i] = acc
    return y


# --- cues -------------------------------------------------------------------

def buzz():
    t = t_axis(0.17)
    tone = sum(np.sin(2 * np.pi * 165 * k * t) / k for k in (1, 3, 5, 7))
    rattle = 0.6 + 0.4 * np.sin(2 * np.pi * 32 * t)
    e = np.minimum(1, t / 0.02) * np.minimum(1, (0.17 - t) / 0.03)
    return tone * rattle * e * 0.5


def clink():
    t = t_axis(0.5)
    sig = sum(a * np.sin(2 * np.pi * f * t + rng.random() * 6) * np.exp(-t / d)
              for f, a, d in ((2350, 1.0, 0.18), (3720, 0.6, 0.12), (5130, 0.35, 0.08), (6790, 0.2, 0.05)))
    click = rng.standard_normal(len(t)) * np.exp(-t / 0.004) * 0.4
    return (sig + click) * 0.35


def gulp(pitch=1.0):
    dur = 0.22
    t = t_axis(dur)
    f = (380 * pitch) * np.exp(-t / 0.06) + 110
    phase = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(phase) * env(0.01, dur, 0.06)
    thump = np.sin(2 * np.pi * 70 * t) * env(0.005, dur, 0.04)
    # two low-pass stages: a soft, low 'gluck' instead of a hiss
    wet = lowpass(lowpass(rng.standard_normal(len(t)), 500), 500) * env(0.005, dur, 0.03) * 5
    return (body + 0.7 * thump + wet) * 0.55


def whoosh(dur=0.5, top=5000, gain=0.35):
    t = t_axis(dur)
    shape = np.sin(np.pi * t / dur) ** 2
    cutoff = 300 + top * shape
    return lowpass(rng.standard_normal(len(t)), cutoff) * shape * gain * 3


def tap():
    t = t_axis(0.06)
    return (np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.008) + rng.standard_normal(len(t)) * np.exp(-t / 0.002) * 0.3) * 0.35


def bubble(f0):
    dur = 0.09
    t = t_axis(dur)
    f = f0 * (1 + 3.0 * t / dur)
    phase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(phase) * env(0.003, dur, 0.03) * 0.28


def pop():
    dur = 0.12
    t = t_axis(dur)
    f = 950 * np.exp(-t / 0.05) + 420
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(0.002, dur, 0.04) * 0.4


def chord(freqs, dur=1.8, decay=0.7):
    t = t_axis(dur)
    sig = sum(np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t) for f in freqs)
    e = np.minimum(1, t / 0.06) * np.exp(-t / decay)
    return sig * e * 0.12


# --- timeline -----------------------------------------------------------------

# soft room tone so the silence feels like a room
mix += lowpass(rng.standard_normal(len(mix)), 400) * 0.012

place(buzz(), 0.62)
place(buzz(), 0.84)
place(bell(1318.5, 1.2, 0.30), 0.72, 0.30)   # E6
place(bell(1975.5, 1.4, 0.35), 0.83, 0.26)   # B6

place(clink(), 2.75, 0.8)
for i, at in enumerate((3.6, 4.0, 4.4, 4.75)):
    place(gulp(1.0 - 0.06 * i), at)
for i, at in enumerate((5.02, 5.1, 5.18)):
    place(bell(2637 + 400 * i, 0.5, 0.12), at, 0.08)
place(clink(), 5.28, 0.6)

place(whoosh(0.5, 5000, 0.14), 5.35)
place(tap(), 6.0)
# filling: bubbles get denser and higher as the glass fills
pour_t = t_axis(0.95)
pour = lowpass(rng.standard_normal(len(pour_t)), 700 + 1200 * pour_t / 0.95)
pour *= np.sin(np.pi * pour_t / 0.95) ** 0.5 * 0.05
place(pour, 6.2)
at = 6.22
while at < 7.08:
    k = (at - 6.22) / 0.86
    place(bubble(420 + 900 * k + rng.uniform(-60, 60)), at, 0.8 + 0.4 * k)
    at += rng.uniform(0.025, 0.06) * (1.2 - 0.6 * k)

for i, f in enumerate((1046.5, 1318.5, 1568.0, 2093.0)):  # C6 E6 G6 C7
    place(bell(f, 1.4, 0.45), 7.1 + 0.08 * i, 0.22)
place(pop(), 7.45)
place(bell(2093.0, 0.8, 0.25), 7.5, 0.10)

place(whoosh(0.35, 2500, 0.18), 8.12)
place(chord((523.25, 659.25, 783.99, 987.77), 1.7, 0.8), 8.38)  # Cmaj7
for i in range(9):
    place(bell(rng.uniform(2600, 4600), 0.4, 0.08), 8.7 + i * 0.08 + rng.uniform(0, 0.03), 0.06)

# --- master -------------------------------------------------------------------
fade = int(0.35 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)
mix = np.tanh(mix * 1.3) / np.tanh(1.3)
mix *= 0.8 / np.max(np.abs(mix))
pcm = (mix * 32767).astype('<i2')
stereo = np.repeat(pcm[:, None], 2, axis=1)

with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(stereo.tobytes())
print('wrote', sys.argv[1])
