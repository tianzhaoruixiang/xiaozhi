"""
本地神经 TTS：小米 k2-fsa OmniVoice（中国女性音色）+ 原 FastAPI 接口。
ASR 仍用 sherpa-onnx SenseVoice。权重挂载在 /data/models，不打进镜像。
"""

from __future__ import annotations

import io
import os
import re
import threading
import wave
from pathlib import Path
from typing import Any, Optional

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from asr import asr_ready, load_asr, recognize_wav

APP = FastAPI(title="xiaozhi-local-tts", version="3.0.0")

MODEL_ID = os.environ.get("TTS_MODEL_ID", "k2-fsa/OmniVoice")
MODEL_DIR = Path(os.environ.get("TTS_MODEL_DIR", "/data/models/OmniVoice"))
NUM_THREADS = int(os.environ.get("TTS_NUM_THREADS", "4"))
DEFAULT_SPEED = float(os.environ.get("TTS_SPEED", "1.0"))
DEFAULT_SID = int(os.environ.get("TTS_SPEAKER_ID", "0"))
PAUSE_SEC = float(os.environ.get("TTS_PAUSE_SEC", "0.22"))
MAX_CHARS = int(os.environ.get("TTS_MAX_CHARS", "1200"))
# OmniVoice Voice Design：性别/年龄等属性，无需参考音频
VOICE_PROMPT = os.environ.get("TTS_VOICE_PROMPT", "女，青年").strip()
INFERENCE_STEPS = int(os.environ.get("TTS_INFERENCE_STEPS", "16"))
DEVICE = os.environ.get("TTS_DEVICE", "auto").strip() or "auto"
SEED_RAW = os.environ.get("TTS_SEED", "").strip()
DEFAULT_SEED: Optional[int] = int(SEED_RAW) if SEED_RAW else None
LOCAL_FILES_ONLY = os.environ.get("TTS_LOCAL_FILES_ONLY", "").lower() in (
    "1",
    "true",
    "yes",
)

_tts: Any = None
_lock = threading.Lock()
_sample_rate = 24000
_load_error: Optional[str] = None


def _local_model_path() -> Optional[Path]:
    if (MODEL_DIR / "config.json").is_file():
        return MODEL_DIR
    candidates = list(MODEL_DIR.glob("**/config.json"))
    if candidates:
        return candidates[0].parent
    return None


def _device_map_and_dtype():
    import torch

    d = DEVICE.lower()
    if d in ("auto", ""):
        if torch.cuda.is_available():
            return "cuda:0", torch.float16
        return "cpu", torch.float32
    if d.startswith("cuda"):
        if torch.cuda.is_available():
            return "cuda:0" if d == "cuda" else d, torch.float16
        print("[tts] 请求 CUDA 但当前不可用，回退 CPU")
        return "cpu", torch.float32
    if d == "mps":
        return "mps", torch.float16
    return "cpu", torch.float32


def load_tts() -> Any:
    global _tts, _sample_rate, _load_error
    if _tts is not None:
        return _tts

    from omnivoice import OmniVoice

    local = _local_model_path()
    model_ref = str(local) if local is not None else MODEL_ID
    use_local_only = LOCAL_FILES_ONLY or local is not None
    device_map, dtype = _device_map_and_dtype()

    print(
        f"[tts] 加载 OmniVoice  model={model_ref} device_map={device_map} "
        f"dtype={dtype} local_files_only={use_local_only}"
    )
    try:
        os.environ.setdefault("OMP_NUM_THREADS", str(NUM_THREADS))
        kwargs: dict[str, Any] = {
            "device_map": device_map,
            "dtype": dtype,
            "load_asr": False,
        }
        if use_local_only:
            kwargs["local_files_only"] = True
        try:
            _tts = OmniVoice.from_pretrained(model_ref, **kwargs)
        except TypeError:
            kwargs.pop("local_files_only", None)
            kwargs.pop("load_asr", None)
            _tts = OmniVoice.from_pretrained(model_ref, **kwargs)
        sr = getattr(_tts, "sample_rate", None) or getattr(_tts, "sampling_rate", None)
        _sample_rate = int(sr or _sample_rate)
        _load_error = None
    except Exception as exc:  # noqa: BLE001
        _load_error = str(exc)
        raise
    return _tts


def soft_normalize(text: str) -> str:
    """把书面稿整理成更口语、利于合成的文本。"""
    t = text.strip()
    t = re.sub(r"[#*`>_\[\]()（）【】]", "", t)
    t = t.replace("：", "，").replace(":", "，")
    t = t.replace("；", "。").replace(";", "。")
    t = re.sub(r"\s+", "，", t)
    t = re.sub(r"(^|，|。)第一[，、]?", r"\1首先，", t)
    t = re.sub(r"(^|，|。)第二[，、]?", r"\1其次，", t)
    t = re.sub(r"(^|，|。)第三[，、]?", r"\1另外，", t)
    t = re.sub(r"(^|，|。)第四[，、]?", r"\1还有，", t)
    t = re.sub(r"第([一二三四五六七八九十\d]+)[，、点]", r"其\1，", t)
    t = re.sub(
        r"(\d{1,2}):(\d{2})",
        lambda m: f"{m.group(1)}点"
        + ("" if m.group(2) == "00" else f"{m.group(2)}分"),
        t,
    )
    t = re.sub(r"，{2,}", "，", t)
    t = re.sub(r"。{2,}", "。", t)
    return t.strip("，。 ")


def split_chunks(text: str) -> list[str]:
    parts = re.split(r"(?<=[。！？!?；;])\s*", text)
    out = [p.strip() for p in parts if p and p.strip()]
    return out or [text]


def _to_wave(audio: Any) -> np.ndarray:
    if isinstance(audio, (list, tuple)):
        audio = audio[0] if audio else np.zeros(0, dtype=np.float32)
    samples = np.asarray(audio, dtype=np.float32).reshape(-1)
    return samples


def _generate_chunk(engine: Any, text: str, instruct: str, speed: float) -> np.ndarray:
    kwargs: dict[str, Any] = {
        "text": text,
        "num_step": INFERENCE_STEPS,
        "speed": speed,
    }
    if instruct:
        kwargs["instruct"] = instruct
    try:
        audio = engine.generate(**kwargs, language_id="zh")
    except TypeError:
        audio = engine.generate(**kwargs)
    return _to_wave(audio)


def synthesize(text: str, speed: float, voice_prompt: str) -> tuple[np.ndarray, int]:
    engine = load_tts()
    chunks = split_chunks(soft_normalize(text))
    waves: list[np.ndarray] = []
    sample_rate = _sample_rate
    instruct = voice_prompt.strip()

    with _lock:
        pause = np.zeros(int(sample_rate * PAUSE_SEC), dtype=np.float32)
        for i, chunk in enumerate(chunks):
            samples = _generate_chunk(engine, chunk, instruct, speed)
            if samples.size == 0:
                continue
            waves.append(samples)
            if i < len(chunks) - 1 and PAUSE_SEC > 0:
                waves.append(pause)

    if not waves:
        raise RuntimeError("合成结果为空")
    return np.concatenate(waves), sample_rate


def to_wav_bytes(samples: np.ndarray, sample_rate: int) -> bytes:
    clipped = np.clip(samples, -1.0, 1.0)
    pcm = (clipped * 32767.0).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm.tobytes())
    return buf.getvalue()


class SpeakRequest(BaseModel):
    text: str = Field(..., min_length=1)
    speed: float = Field(DEFAULT_SPEED, ge=0.5, le=2.0)
    speaker_id: int = Field(DEFAULT_SID, ge=0, le=32)
    voice_prompt: Optional[str] = None
    seed: Optional[int] = None


@APP.on_event("startup")
def on_startup() -> None:
    try:
        load_tts()
    except Exception as exc:  # noqa: BLE001
        print(f"[tts] 启动时未加载 OmniVoice: {exc}")
    try:
        load_asr()
    except Exception as exc:  # noqa: BLE001
        print(f"[asr] 启动时未加载 ASR（可稍后挂载模型）: {exc}")


@APP.get("/asr/health")
def asr_health():
    info = asr_ready()
    from fastapi.responses import JSONResponse

    return JSONResponse(info, status_code=200 if info.get("ready") else 503)


@APP.post("/asr")
async def asr_recognize(file: UploadFile = File(...)):
    raw = await file.read()
    if not raw:
        raise HTTPException(400, "空音频")
    try:
        text = recognize_wav(raw)
    except FileNotFoundError as exc:
        raise HTTPException(503, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, f"识别失败: {exc}") from exc
    return {"ok": True, "text": text, "engine": "sherpa-onnx-sense-voice"}


@APP.get("/health")
def health():
    from fastapi.responses import JSONResponse

    asr_info = asr_ready()
    local = _local_model_path()
    ready = _tts is not None
    payload = {
        "ok": ready,
        "ready": ready,
        "engine": "omnivoice",
        "model": "OmniVoice",
        "modelId": MODEL_ID,
        "modelDir": str(local or MODEL_DIR),
        "sampleRate": _sample_rate,
        "device": DEVICE,
        "voice": VOICE_PROMPT,
        "offline": LOCAL_FILES_ONLY or local is not None,
        "error": _load_error,
        "asr": {
            "ready": bool(asr_info.get("ready")),
            "engine": asr_info.get("engine"),
            "error": asr_info.get("error"),
        },
    }
    return JSONResponse(payload, status_code=200 if ready else 503)


@APP.post("/v1/audio/speech")
def speak(body: SpeakRequest):
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "text 不能为空")
    if len(text) > MAX_CHARS:
        raise HTTPException(400, f"文本过长，最多 {MAX_CHARS} 字")
    prompt = (body.voice_prompt or VOICE_PROMPT).strip()
    try:
        samples, sr = synthesize(text, speed=body.speed, voice_prompt=prompt)
        wav = to_wav_bytes(samples, sr)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, f"合成失败: {exc}") from exc
    return Response(
        content=wav,
        media_type="audio/wav",
        headers={"Cache-Control": "no-store", "X-TTS-Engine": "omnivoice"},
    )


@APP.post("/speak")
def speak_alias(body: SpeakRequest):
    return speak(body)
