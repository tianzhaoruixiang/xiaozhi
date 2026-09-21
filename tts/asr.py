"""本地离线 ASR（sherpa-onnx SenseVoice），供按住说话。"""

from __future__ import annotations

import io
import os
import wave
from pathlib import Path
from typing import Optional

import numpy as np
import sherpa_onnx

ASR_MODEL_DIR = Path(
    os.environ.get(
        "ASR_MODEL_DIR",
        "/data/models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17",
    )
)
NUM_THREADS = int(os.environ.get("TTS_NUM_THREADS", "4"))

_recognizer: Optional[sherpa_onnx.OfflineRecognizer] = None


def _pick_model_file(root: Path) -> Path:
    for name in ("model.int8.onnx", "model.onnx"):
        p = root / name
        if p.is_file() and p.stat().st_size > 1024 * 1024:
            return p
    raise FileNotFoundError(f"{root} 下未找到可用的 model*.onnx")


def _find_asr_root() -> Path:
    candidates: list[Path] = []
    if ASR_MODEL_DIR.exists():
        candidates.append(ASR_MODEL_DIR)
    for models in (Path("/data/models"), Path("/models")):
        if not models.exists():
            continue
        for p in models.iterdir():
            if p.is_dir() and "sense-voice" in p.name.lower():
                candidates.append(p)
        for tokens in models.glob("**/tokens.txt"):
            candidates.append(tokens.parent)

    seen: set[str] = set()
    for root in candidates:
        key = str(root.resolve()) if root.exists() else str(root)
        if key in seen:
            continue
        seen.add(key)
        try:
            _pick_model_file(root)
            if (root / "tokens.txt").is_file():
                return root
        except FileNotFoundError:
            continue

    raise FileNotFoundError(
        f"未找到 ASR 模型（期望 {ASR_MODEL_DIR}/model.int8.onnx）。"
        "请运行 tts/download_asr_model.sh 下载到 data/models/。"
    )


def load_asr() -> sherpa_onnx.OfflineRecognizer:
    global _recognizer
    if _recognizer is not None:
        return _recognizer
    root = _find_asr_root()
    model = _pick_model_file(root)
    _recognizer = sherpa_onnx.OfflineRecognizer.from_sense_voice(
        model=str(model),
        tokens=str(root / "tokens.txt"),
        num_threads=NUM_THREADS,
        language="zh",
        use_itn=True,
        debug=False,
    )
    return _recognizer


def asr_ready() -> dict:
    try:
        root = _find_asr_root()
        if _recognizer is None:
            load_asr()
        return {
            "ok": True,
            "ready": True,
            "engine": "sherpa-onnx-sense-voice",
            "modelDir": str(root),
            "modelFile": _pick_model_file(root).name,
            "offline": True,
        }
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "ready": False, "error": str(exc), "offline": True}


def _read_wav_bytes(data: bytes) -> tuple[np.ndarray, int]:
    with wave.open(io.BytesIO(data), "rb") as wf:
        channels = wf.getnchannels()
        width = wf.getsampwidth()
        rate = wf.getframerate()
        frames = wf.readframes(wf.getnframes())
    if width == 2:
        pcm = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
    elif width == 4:
        pcm = np.frombuffer(frames, dtype=np.int32).astype(np.float32) / 2147483648.0
    else:
        raise ValueError(f"不支持的采样宽度: {width}")
    if channels > 1:
        pcm = pcm.reshape(-1, channels).mean(axis=1)
    return pcm, int(rate)


def recognize_wav(data: bytes) -> str:
    samples, rate = _read_wav_bytes(data)
    if samples.size < rate * 0.2:
        return ""
    engine = load_asr()
    stream = engine.create_stream()
    stream.accept_waveform(rate, samples)
    engine.decode_stream(stream)
    text = (stream.result.text or "").strip()
    for tag in ("<|zh|>", "<|en|>", "<|ja|>", "<|ko|>", "<|yue|>", "<|nospeech|>"):
        text = text.replace(tag, "")
    return text.strip()
