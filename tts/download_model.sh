#!/bin/sh
# 下载 sherpa-onnx Kokoro int8 中英 TTS 到 data/models
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
PROJECT="$(CDPATH= cd -- "$ROOT/.." && pwd)"
DEST="${1:-$PROJECT/data/models}"
mkdir -p "$DEST"
NAME="kokoro-int8-multi-lang-v1_1"
URL="${TTS_MODEL_URL:-https://ghfast.top/https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/${NAME}.tar.bz2}"
ARCHIVE="$DEST/${NAME}.tar.bz2"

has_model() {
  d="$1"
  [ -f "$d/tokens.txt" ] && [ -f "$d/voices.bin" ] && ls "$d"/*.onnx >/dev/null 2>&1
}

if has_model "$DEST/$NAME"; then
  echo "TTS 模型已存在: $DEST/$NAME"
  exit 0
fi

echo "下载 $URL → $DEST"
curl -fL --http1.1 --retry 10 --retry-all-errors --retry-delay 2 \
  --continue-at - -o "$ARCHIVE" "$URL"
tar -xjf "$ARCHIVE" -C "$DEST"
if [ ! -d "$DEST/$NAME" ]; then
  found="$(find "$DEST" -maxdepth 2 -type f -name 'voices.bin' | head -n 1 || true)"
  if [ -n "$found" ]; then
    dir="$(dirname "$found")"
    mv "$dir" "$DEST/$NAME"
  fi
fi
rm -f "$ARCHIVE"
echo "完成: $DEST/$NAME"
ls -lh "$DEST/$NAME" | head
