"""Download Higgs Audio V2 weights into data/models/HiggsAudio-V2."""

from __future__ import annotations

import os
import sys
from pathlib import Path

os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
os.environ.setdefault("HF_ENDPOINT", os.environ.get("HF_ENDPOINT", "https://hf-mirror.com"))

from huggingface_hub import snapshot_download


def ready(path: Path) -> bool:
    if not (path / "config.json").is_file():
        return False
    for pat in ("*.safetensors", "*.bin", "*.pt"):
        if next(path.rglob(pat), None) is not None:
            return True
    return False


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    dest = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else root / "data" / "models"
    os.environ.setdefault("HF_HOME", str(dest / "hf-home"))
    target = dest / "HiggsAudio-V2"
    jobs = [
        (
            os.environ.get("TTS_MODEL_ID", "bosonai/higgs-audio-v2-generation-3B-base"),
            target / "generation-3B-base",
        ),
        (
            os.environ.get("TTS_TOKENIZER_ID", "bosonai/higgs-audio-v2-tokenizer"),
            target / "tokenizer",
        ),
        (
            os.environ.get("TTS_WHISPER_ID", "openai/whisper-large-v3-turbo"),
            target / "whisper-large-v3-turbo",
        ),
    ]
    if ready(jobs[0][1]) and ready(jobs[1][1]):
        print(f"模型已存在: {target}")
        return 0
    for repo, local in jobs:
        print(f"snapshot {repo} -> {local}")
        snapshot_download(
            repo_id=repo,
            local_dir=str(local),
            local_dir_use_symlinks=False,
            resume_download=True,
        )
    print("完成")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
