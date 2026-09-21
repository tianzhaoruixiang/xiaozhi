#!/bin/sh
# 下载 SenseVoice int8 离线 ASR 到项目 data/models（约 155MB，内网推荐）
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
PROJECT="$(CDPATH= cd -- "$ROOT/.." && pwd)"
DEST="${1:-$PROJECT/data/models}"
mkdir -p "$DEST"
NAME="sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17"
# 兼容：若已有 float32 目录也算就绪
ALT="sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17"
URL="${ASR_MODEL_URL:-https://ghfast.top/https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/${NAME}.tar.bz2}"
ARCHIVE="$DEST/${NAME}.tar.bz2"

has_model() {
  d="$1"
  [ -f "$d/model.int8.onnx" ] || [ -f "$d/model.onnx" ]
}

if has_model "$DEST/$NAME" || has_model "$DEST/$ALT"; then
  echo "ASR 模型已存在: $DEST"
  exit 0
fi

echo "下载 $URL → $DEST"
curl -fL --http1.1 --retry 10 --retry-all-errors --retry-delay 2 \
  --continue-at - -o "$ARCHIVE" "$URL"
tar -xjf "$ARCHIVE" -C "$DEST"
if [ ! -d "$DEST/$NAME" ]; then
  found="$(find "$DEST" -maxdepth 2 -type f \( -name model.int8.onnx -o -name model.onnx \) | head -n 1)"
  if [ -n "$found" ]; then
    dir="$(dirname "$found")"
    mv "$dir" "$DEST/$NAME"
  fi
fi
rm -f "$ARCHIVE"
echo "完成: $DEST/$NAME"
ls -lh "$DEST/$NAME" | head
