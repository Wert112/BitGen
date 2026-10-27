"""Music + sound design for the GramFi motion piece.

Music is the supplied track (assets/music.mp3), cut on its 140 BPM phrase grid to fit the edit;
UI sound design (clicks, swishes, pops, chimes) is synthesised with numpy from events.json, which
render.js writes from the same timeline the picture uses. Output: audio.wav, 48 kHz stereo 16-bit.
Usage: python3 audio.py events.json audio.wav [track.mp3]
"""
import json
import sys
import wave
import numpy as np

SR = 48000
rng = np.random.default_rng(3)

ev = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "events.json"))
DUR = ev["dur"]
N = int(DUR * SR)
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


# ------------------------------------------------------------------ music: the supplied track, cut on its phrase grid
# Track: 140 BPM, its drop at 84.04 s. v7 (83 s):
# Video 0..75.429 s  <- track 42.897..118.326 s (one continuous take; the drop lands at video 41.143 s = the phone landing)
# Video 75.429..end  <- track 125.183 s onward (skips 4 bars to the track's own ending under the finale)
# Both splice points sit on 4-bar boundaries, the start on an 8-bar phrase.
import subprocess
TRACK = sys.argv[3] if len(sys.argv) > 3 else "assets/music.mp3"
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", TRACK, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
trk = np.frombuffer(raw, "<f4").reshape(-1, 2).astype(float)
SPLIT = 176 * 60 / 140  # 75.429 s
A0, B0 = 42.897, 125.183
def cut(a, n):
    i = int(round(a * SR)); x = trk[i:i + n]
    return np.vstack([x, np.zeros((n - len(x), 2))]) if len(x) < n else x
nA = int(round(SPLIT * SR)); XF = int(0.06 * SR)
music = cut(A0, nA + XF)
tail = cut(B0 - XF / SR, N - nA + XF)
fadeA = np.cos(np.linspace(0, np.pi / 2, XF))[:, None]; fadeB = np.sin(np.linspace(0, np.pi / 2, XF))[:, None]
out = np.zeros((N, 2)); out[:nA] = music[:nA]
out[nA - XF // 2:nA + XF // 2] = music[nA - XF // 2:nA + XF // 2] * fadeA + tail[:XF] * fadeB
out[nA + XF // 2:] = tail[XF:XF + N - nA - XF // 2]
# intro: the track "opens" from a dark low-passed version to full range over the first 5.1 s
intro_end = 12 * 60 / 140
lp = fft_filter(out, hi=700)
w = np.clip(np.arange(N) / SR / intro_end, 0, 1)[:, None] ** 1.5
out = lp * (1 - w) + out * w
out *= np.clip(np.arange(N) / SR / 0.6, 0, 1)[:, None]          # fade in
fade = np.ones(N); f0 = int((DUR - 1.2) * SR); fade[f0:] = np.linspace(1, 0, N - f0) ** 1.5
music = out * fade[:, None] * 0.82

# ------------------------------------------------------------------ sound design
def bell(m, d=1.2):
    t = tt(d)
    f = hz(m)
    mod = np.sin(2 * np.pi * f * 3.5 * t) * 1.6 * np.exp(-t * 6)
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 3.2) * env(d, 0.002, 10, 1, 0.05)


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
    elif ty == "tap":
        place(sfx, t, fft_filter(click(), hi=3500), 0.5, pan)
    elif ty == "confirm":
        place(sfx, t, chime(), 0.55, 0.15)
    elif ty == "land":
        place(sfx, t, impact(0.8, 1.3), 0.4)
    elif ty == "blip":
        bt = tt(0.18)
        place(sfx, t, np.sin(2 * np.pi * 1320 * bt) * np.exp(-bt * 28) * 0.35, 1.0, float(np.sin(t * 7) * 0.6))
    elif ty == "rumble":
        d = e["len"]; n = fft_filter(rng.standard_normal(int(d * SR)), lo=300, hi=2500)
        sh = np.sin(np.pi * np.clip(tt(d) / d, 0, 1)) ** 1.5
        place(sfx, t, n * sh * 0.25, 1.0)
        for k in range(26):  # murmur of incoming messages
            place(sfx, t + rng.uniform(0, d - .2), pop() * rng.uniform(.2, .5), 0.35, float(rng.uniform(-.8, .8)))
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
        place(sfx, t, impact(0.8, 1.4), 0.45)
    elif ty == "notify":
        place(sfx, t, chime(), 0.6, 0.2)
        place(sfx, t + 0.18, chime(), 0.35, -0.2)
    elif ty == "impact":
        place(sfx, t, impact(e.get("g", 0.6), 1.2), 0.55)
    elif ty == "success":
        place(sfx, t, chime(), 0.55, 0.15)
    elif ty == "tick":
        place(sfx, t, ticks(e["len"]), 0.6)
    elif ty == "logo":
        place(sfx, t, impact(0.6, 1.4), 0.35)
        place(sfx, t, chime(), 0.45)


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


mix = music + reverb(sfx, 1.2, 0.16) * 0.8
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
