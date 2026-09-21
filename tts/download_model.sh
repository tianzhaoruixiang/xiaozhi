#!/bin/sh
# 在可联网环境下载 TTS 模型到项目 data/models
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
PROJECT="$(CDPATH= cd -- "$ROOT/.." && pwd)"
DEST="${1:-$PROJECT/data/models}"
mkdir -p "$DEST"
# 默认走 ghfast 加速；可覆盖 TTS_MODEL_URL
URL="${TTS_MODEL_URL:-https://ghfast.top/https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-melo-tts-zh_en.tar.bz2}"
ARCHIVE="$DEST/vits-melo-tts-zh_en.tar.bz2"

if [ -f "$DEST/vits-melo-tts-zh_en/model.onnx" ]; then
  echo "模型已存在: $DEST/vits-melo-tts-zh_en"
  exit 0
fi

echo "下载 $URL → $DEST"
# HTTP/1.1 + 断点续传，缓解 GitHub 中途断流
curl -fL --http1.1 --retry 10 --retry-all-errors --retry-delay 2 \
  --continue-at - -o "$ARCHIVE" "$URL"

tar -xjf "$ARCHIVE" -C "$DEST"
if [ ! -d "$DEST/vits-melo-tts-zh_en" ]; then
  found="$(find "$DEST" -maxdepth 2 -type f -name model.onnx | head -n 1)"
  if [ -n "$found" ]; then
    dir="$(dirname "$found")"
    mv "$dir" "$DEST/vits-melo-tts-zh_en"
  fi
fi
rm -f "$ARCHIVE"
echo "完成: $DEST/vits-melo-tts-zh_en"
ls -lh "$DEST/vits-melo-tts-zh_en" | head
