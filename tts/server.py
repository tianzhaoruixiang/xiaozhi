"""
本地神经 TTS：Boson Higgs Audio V2（中文女声）+ FastAPI。
ASR 仍用 sherpa-onnx SenseVoice。权重在 /data/models，不打进镜像。
"""

from __future__ import annotations

import asyncio
import io
import os
import re
import threading
import wave
from typing import Optional

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from asr import asr_ready, load_asr, recognize_wav
from engine import (
    DEFAULT_VOICE,
    device_name,
    generate,
    load_engine,
    load_error,
    model_files,
    ready,
    sample_rate,
)

APP = FastAPI(title="xiaozhi-local-tts", version="5.0.0")

DEFAULT_SPEED = float(os.environ.get("TTS_SPEED", "1.0"))
DEFAULT_SID = int(os.environ.get("TTS_SPEAKER_ID", "0"))
MAX_CHARS = int(os.environ.get("TTS_MAX_CHARS", "1200"))
VOICE_PROMPT = os.environ.get("TTS_VOICE_PROMPT", DEFAULT_VOICE).strip()
DEVICE = os.environ.get("TTS_DEVICE", "auto").strip() or "auto"

_lock = threading.Lock()


def soft_normalize(text: str) -> str:
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


def synthesize(text: str, speed: float, voice_prompt: str, seed: Optional[int]) -> tuple[np.ndarray, int]:
    with _lock:
        return generate(
            soft_normalize(text),
            instruct=voice_prompt.strip() or VOICE_PROMPT,
            speed=speed,
            seed=seed,
        )


def to_wav_bytes(samples: np.ndarray, sr: int) -> bytes:
    clipped = np.clip(samples, -1.0, 1.0)
    pcm = (clipped * 32767.0).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
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
        load_engine()
    except Exception as exc:  # noqa: BLE001
        print(f"[tts] 启动时未加载 Higgs Audio V2: {exc}")
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
        text = await asyncio.to_thread(recognize_wav, raw)
    except FileNotFoundError as exc:
        raise HTTPException(503, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, f"识别失败: {exc}") from exc
    return {"ok": True, "text": text, "engine": "sherpa-onnx-sense-voice"}


@APP.get("/health")
def health():
    from fastapi.responses import JSONResponse

    asr_info = asr_ready()
    base, codec = model_files()
    ok = ready()
    payload = {
        "ok": ok,
        "ready": ok,
        "engine": "higgs-audio-v2",
        "model": "higgs-audio-v2-generation-3B-base",
        "base": base,
        "codec": codec,
        "sampleRate": sample_rate(),
        "device": device_name() if ok else DEVICE,
        "voice": VOICE_PROMPT,
        "error": load_error(),
        "asr": {
            "ready": bool(asr_info.get("ready")),
            "engine": asr_info.get("engine"),
            "error": asr_info.get("error"),
        },
    }
    return JSONResponse(payload, status_code=200 if ok else 503)


@APP.post("/v1/audio/speech")
def speak(body: SpeakRequest):
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "text 不能为空")
    if len(text) > MAX_CHARS:
        raise HTTPException(400, f"文本过长，最多 {MAX_CHARS} 字")
    prompt = (body.voice_prompt or VOICE_PROMPT).strip()
    try:
        samples, sr = synthesize(text, speed=body.speed, voice_prompt=prompt, seed=body.seed)
        wav = to_wav_bytes(samples, sr)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, f"合成失败: {exc}") from exc
    return Response(
        content=wav,
        media_type="audio/wav",
        headers={"Cache-Control": "no-store", "X-TTS-Engine": "higgs-audio-v2"},
    )


@APP.post("/speak")
def speak_alias(body: SpeakRequest):
    return speak(body)
