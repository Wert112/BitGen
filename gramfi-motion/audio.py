"""Music + sound design for the GramFi motion piece, synthesised offline with numpy.

Reads events.json (written by render.js from the same timeline the picture uses) and writes
audio.wav (48 kHz, stereo, 16-bit). 120 BPM: beat = 0.5 s, so scene cuts at 3.0 / 22.0 / 40.5 s land on beats.
"""
import json
import sys
import wave
import numpy as np

SR = 48000
BPM = 120
BEAT = 60 / BPM
rng = np.random.default_rng(3)

ev = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "events.json"))
DUR = ev["dur"]
N = int(DUR * SR)
music = np.zeros((N, 2))
sfx = np.zeros((N, 2))


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(d):
    return np.arange(int(d * SR)) / SR


def place(buf, t0, x, gain=1.0, pan=0.0):
    i = int(round(t0 * SR))
    if i >= len(buf):
        return
    if x.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        x = np.stack([x * l, x * r], 1) * np.sqrt(2)
    j = min(len(buf), i + len(x))
    if i < 0:
        x, i = x[-i:], 0
    buf[i:j] += x[: j - i] * gain


def fft_filter(x, lo=None, hi=None, q=1.0):
    """Smooth band filter in the frequency domain (works on 1-D or 2-D arrays)."""
    n = len(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    g = np.ones_like(f)
    if hi:
        g *= 1 / np.sqrt(1 + (f / hi) ** (4 * q))
    if lo:
        g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (4 * q))
    X = np.fft.rfft(x, axis=0)
    return np.fft.irfft(X * (g[:, None] if x.ndim == 2 else g), n, axis=0)


def env(d, a=0.005, decay=0.2, sustain=0.0, rel=0.05):
    t = tt(d)
    e = np.minimum(1, t / max(a, 1e-4)) * (sustain + (1 - sustain) * np.exp(-np.maximum(0, t - a) / max(decay, 1e-4)))
    r = int(rel * SR)
    if r and r < len(e):
        e[-r:] *= np.linspace(1, 0, r)
    return e


def additive(freq, d, nh=10, tilt=1.0, hdecay=0.0, detune=0.0):
    t = tt(d)
    y = np.zeros_like(t)
    for k in range(1, nh + 1):
        if freq * k > 16000:
            break
        amp = 1 / k ** tilt
        y += amp * np.exp(-t * hdecay * k) * np.sin(2 * np.pi * freq * k * (1 + detune) * t + k)
    return y


# ------------------------------------------------------------------ instruments
def kick(g=1.0):
    t = tt(0.42)
    f = 46 + 95 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t * 7.5) + 0.25 * fft_filter(rng.standard_normal(len(t)), lo=2500) * np.exp(-t * 180)
    return y * g


def clap():
    d = 0.32
    n = rng.standard_normal(int(d * SR))
    t = tt(d)
    e = np.zeros_like(t)
    for o in (0, 0.011, 0.022):
        e += np.exp(-np.maximum(0, t - o) * 60) * (t >= o)
    e += 0.5 * np.exp(-np.maximum(0, t - 0.03) * 14) * (t >= 0.03)
    return fft_filter(n, lo=900, hi=5200) * e * 0.55


def hat(open_=False):
    d = 0.28 if open_ else 0.06
    n = fft_filter(rng.standard_normal(int(d * SR)), lo=7000)
    return n * np.exp(-tt(d) * (14 if open_ else 70)) * (0.35 if open_ else 0.28)


def pluck(m, d=0.6):
    y = additive(hz(m), d, nh=12, tilt=1.1, hdecay=3.5) * env(d, 0.003, 0.22, 0, 0.05)
    return y


def bell(m, d=1.2):
    t = tt(d)
    f = hz(m)
    mod = np.sin(2 * np.pi * f * 3.5 * t) * 1.6 * np.exp(-t * 6)
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 3.2) * env(d, 0.002, 10, 1, 0.05)


def bass(m, d):
    t = tt(d)
    f = hz(m)
    y = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    return np.tanh(1.4 * y) * env(d, 0.004, 0.18, 0.35, 0.04)


def pad_chord(ms, d):
    y = np.zeros(int(d * SR))
    for m in ms:
        for dt in (-0.004, 0.0035):
            y += additive(hz(m), d, nh=14, tilt=1.0, detune=dt)
    return y / len(ms) * env(d, 0.35, 10, 1, 0.4)


# ------------------------------------------------------------------ arrangement
PROG = [  # (pad voicing, bass root, arp notes) per 2-second bar
    ([53, 57, 60, 64, 67], 41, [65, 69, 72, 76]),   # Fmaj9
    ([57, 60, 64, 67], 45, [64, 69, 72, 76]),       # Am7
    ([60, 64, 67, 71], 48, [67, 71, 72, 76]),       # Cmaj7
    ([55, 59, 62, 64], 43, [62, 67, 71, 74]),       # G6
]
BARS = int(np.ceil(DUR / (4 * BEAT)))


def section(t):
    if t < 3.0:
        return "intro"
    if t < 20.5:
        return "A"
    if t < 22.0:
        return "break"
    if t < 40.5:
        return "B"
    return "outro"


pad = np.zeros(N)
for b in range(BARS):
    t0 = b * 4 * BEAT
    if t0 >= DUR:
        break
    ch, root, arp = PROG[b % 4]
    sec = section(t0 + 0.01)
    d = min(4 * BEAT + 0.6, DUR - t0)
    if sec == "outro":
        d = DUR - t0
        ch, root, arp = PROG[0]
    pchord = pad_chord(ch, d) * (0.55 if sec in ("intro", "break", "outro") else 0.42)
    i = int(t0 * SR)
    pad[i:i + len(pchord)] += pchord[: N - i]
    for k in range(8):  # 8th-note grid inside the bar
        tb = t0 + k * BEAT / 2
        if tb >= DUR:
            break
        s = section(tb)
        if s in ("A", "B"):
            if k % 2 == 0:
                place(music, tb, kick(0.9 if s == "A" else 1.0), 0.8)
            if k in (2, 6):
                place(music, tb, clap(), 0.55, 0.05)
            if k % 2 == 1:
                place(music, tb, hat(open_=(s == "B" and k in (3, 7))), 0.75, 0.3)
            bn = root - 12 if k % 4 != 3 else root
            place(music, tb, bass(bn, BEAT / 2 * 0.95), 0.36 if s == "A" else 0.42)
            if k in (1, 3, 4, 6):
                for j, m in enumerate(ch[-3:]):
                    place(music, tb + j * 0.004, pluck(m + 12, 0.45), 0.10, -0.3 + 0.3 * j)
        if s == "B":  # 16th arp lead
            for h in range(2):
                ta = tb + h * BEAT / 4
                if ta < DUR:
                    place(music, ta, bell(arp[(k * 2 + h) % 4] + 12, 0.5), 0.05, 0.4 * np.sin(ta * 3))
        if s == "intro" and k % 2 == 0:
            place(music, tb, bell(arp[(k // 2) % 4] + 12, 1.4), 0.13, 0.5 * np.sin(tb * 2))
        if s == "break" and k % 2 == 0:
            place(music, tb, bell(arp[(k // 2) % 4] + 12, 1.0), 0.05 + 0.03 * (tb - 20.5), 0.4)

# sidechain-style duck on the pad under the kicks
duck = np.ones(N)
for b in np.arange(3.0, 40.5, BEAT):
    if 20.5 <= b < 22.0:
        continue
    i = int(b * SR)
    k = 1 - 0.55 * np.exp(-tt(BEAT) / 0.09)
    duck[i:i + len(k)] = np.minimum(duck[i:i + len(k)], k[: N - i])
pad = fft_filter(pad, lo=110, hi=1900) * duck * 0.075
music[:, 0] += pad
music[:, 1] += pad

# break: drop everything out right before the drop for a breath, build with a riser
gate = np.ones(N)
i0, i1 = int(21.78 * SR), int(22.0 * SR)
gate[i0:i1] = np.linspace(1, 0.15, i1 - i0)
music *= gate[:, None]

# outro: final chord hit at 40.5 then a gentle ring-out
place(music, 40.5, kick(1.0), 0.8)
for j, m in enumerate([65, 69, 72, 76, 79]):
    place(music, 40.5 + j * 0.03, bell(m + 12, 3.0), 0.09, -0.4 + 0.2 * j)
fade = np.ones(N)
f0 = int((DUR - 1.6) * SR)
fade[f0:] = np.linspace(1, 0, N - f0) ** 1.6
music *= fade[:, None]


# ------------------------------------------------------------------ sound design
def click():
    d = 0.06
    t = tt(d)
    y = 0.55 * np.sin(2 * np.pi * 2300 * t) * np.exp(-t * 400)
    y += 0.8 * np.sin(2 * np.pi * (240 - 900 * t) * t) * np.exp(-t * 70)
    y += 0.3 * fft_filter(rng.standard_normal(len(t)), lo=3000) * np.exp(-t * 600)
    return y


def pop():
    d = 0.12
    t = tt(d)
    f = 520 + 520 * (1 - np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 32) * 0.6


def noise_sweep(d, f_from, f_to, shape):
    n = rng.standard_normal(int(d * SR))
    bands = [fft_filter(n, lo=f * 0.6, hi=f * 1.6) for f in (300, 900, 2700, 7000)]
    t = tt(d) / d
    pos = np.clip(f_from + (f_to - f_from) * t, 0, 3)
    y = np.zeros_like(t)
    for k, b in enumerate(bands):
        y += b * np.clip(1 - np.abs(pos - k), 0, 1)
    return y * shape


def whoosh(d, up=1):
    t = tt(d) / d
    shape = np.sin(np.pi * t) ** 2
    return noise_sweep(d, 0.3, 2.6, shape) if up else noise_sweep(d, 2.6, 0.2, shape)


def swish():
    d = 0.42
    t = tt(d) / d
    return noise_sweep(d, 0.8, 2.8, np.sin(np.pi * t ** 0.6) ** 3) * 0.8


def riser(d):
    t = tt(d)
    u = t / d
    f = 180 * 2 ** (u * 2.6)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25 + np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR) * 0.12
    return (noise_sweep(d, 0.2, 3.0, u ** 2) * 0.7 + tone * u ** 2.2) * (1 - np.clip((u - 0.93) / 0.07, 0, 1))


def impact(g=1.0, d=1.6):
    t = tt(d)
    f = 34 + 70 * np.exp(-t * 9)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.6)
    hit = fft_filter(rng.standard_normal(len(t)), hi=1800) * np.exp(-t * 14) * 0.6
    return (sub + hit) * g


def chime():
    y = np.zeros(int(1.4 * SR))
    for k, m in enumerate([76, 83, 88]):
        b = bell(m, 1.2) * (0.8 if k else 1)
        i = int(k * 0.07 * SR)
        y[i:i + len(b)] += b[: len(y) - i]
    return y * 0.55


def key():
    d = 0.03
    t = tt(d)
    return fft_filter(rng.standard_normal(len(t)), lo=1500, hi=6000) * np.exp(-t * 220) * 0.9 + 0.3 * np.sin(2 * np.pi * rng.uniform(900, 1400) * t) * np.exp(-t * 300)


def ticks(d, rate=14):
    y = np.zeros(int(d * SR))
    for k in range(int(d * rate)):
        c = np.sin(2 * np.pi * 3200 * tt(0.012)) * np.exp(-tt(0.012) * 500)
        i = int(k / rate * SR)
        y[i:i + len(c)] += c * (0.5 + 0.5 * (k % 2))
    return y * 0.35


def build(d):
    y = np.zeros(int(d * SR))
    for k in range(46):
        f = 500 * 2 ** (k / 46 * 1.5)
        c = np.sin(2 * np.pi * f * tt(0.05)) * np.exp(-tt(0.05) * 90)
        i = int(k / 46 * d * 0.92 * SR)
        y[i:i + len(c)] += c[: len(y) - i]
    return y * 0.32


def sparkle():
    y = np.zeros(int(1.0 * SR))
    for k in range(18):
        b = bell(rng.choice([84, 88, 91, 93, 96]), 0.35) * rng.uniform(0.3, 0.8)
        i = int(rng.uniform(0, 0.7) * SR)
        y[i:i + len(b)] += b[: len(y) - i]
    return y * 0.25


for e in ev["events"]:
    t, ty = e["t"], e["type"]
    pan = float(rng.uniform(-0.25, 0.25))
    if ty == "click":
        place(sfx, t, click(), 0.55, pan)
    elif ty == "pop":
        place(sfx, t, pop(), 0.30, pan)
    elif ty == "whoosh":
        place(sfx, t - 0.1, whoosh(e["len"], e["up"]), 0.45)
    elif ty == "swish":
        place(sfx, t - 0.12, swish(), 0.42, -0.3)
    elif ty == "morph":
        place(sfx, t, swish(), 0.22, 0.2)
        place(sfx, t, ticks(0.7, 22), 0.5)
    elif ty == "build":
        place(sfx, t, build(e["len"]), 0.6)
    elif ty == "sparkle":
        place(sfx, t, sparkle(), 0.9)
    elif ty == "key":
        place(sfx, t, key(), 0.35, pan)
    elif ty == "riser":
        place(sfx, t, riser(e["len"]), 0.55)
    elif ty == "drop":
        place(sfx, t, impact(1.0, 1.8), 0.75)
    elif ty == "impact":
        place(sfx, t, impact(e.get("g", 0.6), 1.2), 0.55)
    elif ty == "success":
        place(sfx, t, chime(), 0.55, 0.15)
    elif ty == "tick":
        place(sfx, t, ticks(e["len"]), 0.6)
    elif ty == "logo":
        place(sfx, t, impact(0.7, 1.6), 0.5)
        place(sfx, t, chime(), 0.5)


# ------------------------------------------------------------------ reverb + master
def reverb(x, secs=1.9, wet=0.22):
    n = int(secs * SR)
    ir = rng.standard_normal((n, 2)) * np.exp(-np.arange(n) / SR / (secs / 6.9))[:, None]
    ir = fft_filter(ir, lo=200, hi=7000)
    ir /= np.sqrt((ir ** 2).sum(0))
    L = len(x) + n
    nf = 1 << (L - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, nf, axis=0) * np.fft.rfft(ir, nf, axis=0), nf, axis=0)[: len(x)]
    return x * (1 - wet) + y * wet * 2.2


mix = reverb(music, 2.2, 0.20) + reverb(sfx, 1.2, 0.16) * 0.95
mix = fft_filter(mix, lo=28)
peak = np.abs(mix).max()
mix *= 0.89 / peak  # ~ -1 dBFS peak
mix[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))[:, None]
pcm = (np.clip(mix, -1, 1) * 32767).astype("<i2")
with wave.open(sys.argv[2] if len(sys.argv) > 2 else "audio.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("ok", DUR, "s, peak", peak)
