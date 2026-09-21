#!/bin/sh
# 下载 Higgs Audio V2 到 data/models
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
PROJECT="$(CDPATH= cd -- "$ROOT/.." && pwd)"
DEST="${1:-$PROJECT/data/models}"
export HF_ENDPOINT="${HF_ENDPOINT:-https://hf-mirror.com}"
PY="${PYTHON:-}"
if [ -z "$PY" ]; then
  if command -v python3 >/dev/null 2>&1; then
    PY=python3
  elif command -v python >/dev/null 2>&1; then
    PY=python
  fi
fi
if [ -z "$PY" ]; then
  echo "需要 python 才能下载 Hugging Face 模型"
  exit 1
fi
"$PY" -m pip install -q "huggingface_hub>=0.30.0" || true
exec "$PY" "$ROOT/download_model.py" "$DEST"
