"""Download kokoro-int8-multi-lang-v1_1 into data/models."""

from __future__ import annotations

import sys
import tarfile
import urllib.request
from pathlib import Path

NAME = "kokoro-int8-multi-lang-v1_1"
DEFAULT_URL = (
    "https://ghfast.top/https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/"
    f"{NAME}.tar.bz2"
)
FALLBACK_URL = (
    "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/"
    f"{NAME}.tar.bz2"
)


def ready(root: Path) -> bool:
    if not (root / "tokens.txt").is_file():
        return False
    if not (root / "voices.bin").is_file():
        return False
    return any(p.suffix == ".onnx" and p.stat().st_size > 1024 * 1024 for p in root.glob("*.onnx"))


def _download(url: str, dest: Path) -> None:
    print(f"下载 {url}")
    urllib.request.urlretrieve(url, dest)


def main() -> int:
    repo = Path(__file__).resolve().parent.parent
    dest = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else repo / "data" / "models"
    dest.mkdir(parents=True, exist_ok=True)
    target = dest / NAME
    if ready(target):
        print(f"TTS 模型已存在: {target}")
        return 0
    archive = dest / f"{NAME}.tar.bz2"
    try:
        _download(DEFAULT_URL, archive)
    except Exception:
        _download(FALLBACK_URL, archive)
    with tarfile.open(archive, "r:bz2") as tf:
        tf.extractall(dest)
    if not ready(target):
        for marker in dest.rglob("voices.bin"):
            parent = marker.parent
            if parent != target and "kokoro" in parent.name.lower():
                parent.rename(target)
                break
    archive.unlink(missing_ok=True)
    if not ready(target):
        raise SystemExit(f"解压后未找到模型: {target}")
    print(f"完成: {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
