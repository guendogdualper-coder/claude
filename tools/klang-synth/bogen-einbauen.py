import importlib.util, json, sys, numpy as np
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('ke', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'klang-erzeugen.py'))
ke = importlib.util.module_from_spec(spec); spec.loader.exec_module(ke)
import bogen
SR = ke.SR
out = {}
for name, variants, lufs in [('bogen_schuss', [dict(f0=150, whoosh=1.0), dict(f0=138, whoosh=0.9, bright=0.8), dict(f0=162, whoosh=1.1, bright=1.1)], -15.0),
                             ('bogen_schuss2', [dict(f0=145, whoosh=0.8, dur=0.36), dict(f0=156, whoosh=0.95, dur=0.38)], -15.0)]:
    teile = []
    for v in variants:
        s = bogen.shot(**v).astype(np.float64)
        g = 10 ** ((lufs - ke.kurz_max(s)) / 20)
        teile.append(ke.begrenzer(s * min(g, 30), 0.84).astype(np.float32))
    luecke = np.zeros(int(0.12 * SR), np.float32)
    alles = [luecke[:int(0.02 * SR)]]; t = len(alles[0]); clips = []
    for s in teile:
        db, n = ke.huelle(s)
        clips.append([round(t / SR, 3), round(len(s) / SR, 3), round(int(np.argmax(db)) * n / SR, 3)])
        alles += [s, luecke]; t += len(s) + len(luecke)
    ke.schreibe(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'snd', 'sfx', name + '.mp3'), np.concatenate(alles), 64)
    out[name] = clips
print(json.dumps(out))
