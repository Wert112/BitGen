#!/usr/bin/env bash
# Full rebuild: frames (120 fps subframes) -> audio -> loudness -> MP4 1920x1080 60 fps H.264 yuv420p + AAC.
# Usage: ./build.sh [frames_dir] [out.mp4]
set -euo pipefail
cd "$(dirname "$0")"
FR=${1:-frames}
OUT=${2:-gramfi_motion.mp4}
node render.js "$FR" 120 3                     # also writes events.json (sound sync points)
python3 audio.py events.json audio_raw.wav
# two-pass loudness normalisation to -14 LUFS / -1 dBTP
M=$(ffmpeg -hide_banner -nostats -i audio_raw.wav -af loudnorm=I=-14:TP=-1.2:LRA=11:print_format=json -f null - 2>&1 | sed -n '/{/,/}/p')
get() { echo "$M" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
ffmpeg -y -hide_banner -loglevel error -i audio_raw.wav -af "loudnorm=I=-14:TP=-1.2:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true,aresample=48000" -c:a pcm_s16le audio.wav
# 180-degree shutter motion blur: average each pair of 120 fps subframes into one 60 fps frame
ffmpeg -y -hide_banner -loglevel error -framerate 120 -i "$FR/f%05d.jpg" -i audio.wav \
  -filter_complex "[0:v]tmix=frames=2:weights='1 1',select='not(mod(n\,2))',setpts=N/(60*TB),fps=60,format=yuv420p[v]" \
  -map "[v]" -map 1:a -c:v libx264 -preset slow -crf 15 -profile:v high -level 4.2 -pix_fmt yuv420p \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart "$OUT"
echo "built $OUT"
