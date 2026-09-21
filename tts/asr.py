"""本地离线 ASR（sherpa-onnx SenseVoice），供按住说话 / 语音唤醒。"""

from __future__ import annotations

import io
import os
import re
import threading
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
NUM_THREADS = int(
    os.environ.get("ASR_NUM_THREADS")
    or os.environ.get("TTS_NUM_THREADS", "6")
)
PROVIDER = os.environ.get("ASR_PROVIDER", "cpu").strip() or "cpu"

_recognizer: Optional[sherpa_onnx.OfflineRecognizer] = None
_decode_lock = threading.Lock()

# SenseVoice 会把语种 / 情绪 / 事件标签拼进文本
_SV_TAG = re.compile(r"<\|[^|>]+\|>")
_SV_KNOWN_TAGS = (
    "<|zh|>",
    "<|en|>",
    "<|ja|>",
    "<|ko|>",
    "<|yue|>",
    "<|nospeech|>",
    "<|Speech|>",
    "<|BGM|>",
    "<|NEUTRAL|>",
    "<|HAPPY|>",
    "<|SAD|>",
    "<|ANGRY|>",
    "<|FEARFUL|>",
    "<|DISGUSTED|>",
    "<|SURPRISED|>",
)


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
    kwargs = dict(
        model=str(model),
        tokens=str(root / "tokens.txt"),
        num_threads=max(1, NUM_THREADS),
        language="zh",
        use_itn=True,
        debug=False,
    )
    # 旧版 sherpa-onnx 可能没有 provider 参数
    try:
        _recognizer = sherpa_onnx.OfflineRecognizer.from_sense_voice(
            **kwargs, provider=PROVIDER
        )
    except TypeError:
        _recognizer = sherpa_onnx.OfflineRecognizer.from_sense_voice(**kwargs)
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
            "numThreads": NUM_THREADS,
            "provider": PROVIDER,
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


def _resample_linear(samples: np.ndarray, src_rate: int, dst_rate: int) -> np.ndarray:
    if src_rate == dst_rate or samples.size == 0:
        return samples
    duration = samples.size / float(src_rate)
    new_len = max(1, int(round(duration * dst_rate)))
    x_old = np.linspace(0.0, duration, num=samples.size, endpoint=False)
    x_new = np.linspace(0.0, duration, num=new_len, endpoint=False)
    return np.interp(x_new, x_old, samples).astype(np.float32)


def _trim_silence(samples: np.ndarray, rate: int, thresh: float = 0.01, pad_ms: int = 160) -> np.ndarray:
    if samples.size < rate * 0.2:
        return samples
    frame = max(1, int(rate * 0.02))
    n = (samples.size // frame) * frame
    if n < frame:
        return samples
    energy = np.sqrt(np.mean(samples[:n].reshape(-1, frame) ** 2, axis=1))
    voiced = np.flatnonzero(energy > thresh)
    if voiced.size == 0:
        return samples
    pad = int(rate * pad_ms / 1000)
    start = max(0, int(voiced[0]) * frame - pad)
    end = min(samples.size, (int(voiced[-1]) + 1) * frame + pad)
    return samples[start:end]


def _peak_normalize(samples: np.ndarray, target: float = 0.9, max_gain: float = 4.0) -> np.ndarray:
    peak = float(np.max(np.abs(samples))) if samples.size else 0.0
    if peak < 1e-4:
        return samples
    gain = min(target / peak, max_gain)
    if gain <= 1.05:
        return samples
    return (samples * gain).astype(np.float32)


# 「你好智枢」常被听成知识 / 指数 / 芝士 等，句首纠正便于唤醒
_WAKE_FIX = re.compile(
    r"^(你好|您好|嗨|嘿)([啊呀]?)[，,\s]*(知识|指数|芝士|智数|之数|之书|知书|只书|纸书|直书|智叔|枝枢)"
)


def _clean_text(text: str) -> str:
    for tag in _SV_KNOWN_TAGS:
        text = text.replace(tag, "")
    text = _SV_TAG.sub("", text)
    text = text.strip()
    text = _WAKE_FIX.sub(r"\1\2智枢", text, count=1)
    return text.strip()


def recognize_wav(data: bytes) -> str:
    samples, rate = _read_wav_bytes(data)
    if samples.size < rate * 0.15:
        return ""
    samples = _resample_linear(samples, rate, 16000)
    rate = 16000
    samples = _peak_normalize(samples)
    samples = _trim_silence(samples, rate)
    if samples.size < rate * 0.15:
        return ""
    engine = load_asr()
    with _decode_lock:
        stream = engine.create_stream()
        stream.accept_waveform(rate, samples)
        engine.decode_stream(stream)
        text = (stream.result.text or "").strip()
    return _clean_text(text)
