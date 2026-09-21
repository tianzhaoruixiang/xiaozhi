#!/bin/sh
# 下载小米 k2-fsa OmniVoice 权重到项目 data/models/OmniVoice
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
PROJECT="$(CDPATH= cd -- "$ROOT/.." && pwd)"
DEST="${1:-$PROJECT/data/models}"
TARGET="$DEST/OmniVoice"
mkdir -p "$TARGET"

if [ -f "$TARGET/config.json" ]; then
  echo "模型已存在: $TARGET"
  exit 0
fi

PY="${PYTHON:-}"
if [ -z "$PY" ]; then
  if command -v python3 >/dev/null 2>&1; then
    PY=python3
  elif command -v python >/dev/null 2>&1; then
    PY=python
  else
    echo "需要 python3 才能下载 OmniVoice。请先安装 Python，或手动将权重放到 $TARGET"
    echo "Hugging Face: https://huggingface.co/k2-fsa/OmniVoice"
    echo "ModelScope:   https://modelscope.cn/models/k2-fsa/OmniVoice"
    exit 1
  fi
fi

echo "下载 OmniVoice → $TARGET"
# 国内可设: HF_ENDPOINT=https://hf-mirror.com
"$PY" - "$TARGET" <<'PY'
import os
import sys

target = sys.argv[1]
os.makedirs(target, exist_ok=True)

def ok():
    return os.path.isfile(os.path.join(target, "config.json"))

if os.environ.get("TTS_DOWNLOAD_SOURCE", "modelscope").lower() != "hf":
    try:
        from modelscope import snapshot_download
        snapshot_download("k2-fsa/OmniVoice", local_dir=target)
        if ok():
            print("完成（ModelScope）:", target)
            raise SystemExit(0)
    except SystemExit:
        raise
    except Exception as exc:
        print("ModelScope 下载失败，改走 Hugging Face:", exc)

try:
    from huggingface_hub import snapshot_download as hf_dl
except ImportError:
    print("请先: pip install modelscope huggingface_hub")
    raise SystemExit(1)

hf_dl(
    repo_id=os.environ.get("TTS_MODEL_ID", "k2-fsa/OmniVoice"),
    local_dir=target,
)
if not ok():
    print("下载后未找到 config.json，请检查目录:", target)
    raise SystemExit(1)
print("完成（Hugging Face）:", target)
PY

ls -lh "$TARGET" | head
