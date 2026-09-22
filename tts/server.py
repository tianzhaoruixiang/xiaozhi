"""
本地神经 TTS：sherpa-onnx Kokoro int8（中英）+ FastAPI。
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
    engine_id,
    generate,
    load_engine,
    load_error,
    model_files,
    ready,
    sample_rate,
)

APP = FastAPI(title="xiaozhi-local-tts", version="5.0.0")

DEFAULT_SPEED = float(os.environ.get("TTS_SPEED", "1.0"))
DEFAULT_SID = int(os.environ.get("TTS_SPEAKER_ID", "1"))
MAX_CHARS = int(os.environ.get("TTS_MAX_CHARS", "1200"))
VOICE_PROMPT = os.environ.get("TTS_VOICE_PROMPT", DEFAULT_VOICE).strip()
DEVICE = os.environ.get("TTS_DEVICE", "auto").strip() or "auto"
TTS_ENGINE = os.environ.get("TTS_ENGINE", "edge").strip().lower() or "edge"

_lock = threading.Lock()


_DIGITS = "零一二三四五六七八九"


def _zh_int(n: int) -> str:
    n = int(n)
    if n < 0:
        return str(n)
    if n < 10:
        return _DIGITS[n]
    if n < 20:
        return "十" if n == 10 else f"十{_DIGITS[n - 10]}"
    if n < 100:
        tens, ones = divmod(n, 10)
        return f"{_DIGITS[tens]}十" + (_DIGITS[ones] if ones else "")
    return str(n)


def _spoken_clock(h: int, m: int) -> str:
    hour = "两" if h % 24 == 2 else _zh_int(h % 24)
    if m == 0:
        return f"{hour}点整"
    if m < 10:
        return f"{hour}点零{_DIGITS[m]}分"
    return f"{hour}点{_zh_int(m)}分"


def soft_normalize(text: str) -> str:
    t = text.strip()
    t = re.sub(r"[#*`>_\[\]()（）【】]", "", t)
    # 必须先把 14:00 转成汉字，再把冒号改成逗号，否则会变成「14，00」读错
    t = re.sub(
        r"(\d{1,2})\s*[:：∶︰]\s*(\d{2})(?:[:：∶︰]\d{2})?",
        lambda m: _spoken_clock(int(m.group(1)), int(m.group(2))),
        t,
    )
    t = re.sub(
        r"(\d{1,2})\s*时\s*(\d{1,2})\s*分?",
        lambda m: _spoken_clock(int(m.group(1)), int(m.group(2))),
        t,
    )
    t = t.replace("：", "，").replace(":", "，")
    t = t.replace("；", "。").replace(";", "。")
    t = re.sub(r"\s+", "，", t)
    t = re.sub(r"(^|，|。)第一[，、]?", r"\1首先，", t)
    t = re.sub(r"(^|，|。)第二[，、]?", r"\1其次，", t)
    t = re.sub(r"(^|，|。)第三[，、]?", r"\1另外，", t)
    t = re.sub(r"(^|，|。)第四[，、]?", r"\1还有，", t)
    t = re.sub(r"第([一二三四五六七八九十\d]+)[，、点]", r"其\1，", t)
    t = re.sub(r"，{2,}", "，", t)
    t = re.sub(r"。{2,}", "。", t)
    return t.strip("，。 ")


def synthesize(
    text: str,
    speed: float,
    voice_prompt: str,
    seed: Optional[int],
    speaker_id: int,
) -> tuple[np.ndarray, int]:
    with _lock:
        return generate(
            soft_normalize(text),
            instruct=voice_prompt.strip() or VOICE_PROMPT,
            speed=speed,
            seed=seed,
            speaker_id=speaker_id,
        )


def to_wav_bytes(samples: np.ndarray, sr: int) -> bytes:
    clipped = np.clip(samples.astype(np.float32), -1.0, 1.0)
    peak = float(np.max(np.abs(clipped))) if clipped.size else 0.0
    if peak > 1e-4:
        clipped = np.clip(clipped * (0.89 / peak), -1.0, 1.0)
    pcm = (clipped * 32767.0).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(pcm.tobytes())
    return buf.getvalue()


class SpeakRequest(BaseModel):
    text: str = ""
    input: str = ""
    speed: float = Field(DEFAULT_SPEED, ge=0.25, le=4.0)
    speaker_id: int = Field(DEFAULT_SID, ge=0, le=102)
    voice: Optional[str] = None
    voice_prompt: Optional[str] = None
    seed: Optional[int] = None
    model: Optional[str] = None
    language: Optional[str] = None
    response_format: Optional[str] = None
    task_type: Optional[str] = None


@APP.on_event("startup")
def on_startup() -> None:
    if TTS_ENGINE != "edge":
        try:
            load_engine()
        except Exception as exc:  # noqa: BLE001
            print(f"[tts] 启动时未加载 TTS: {exc}")
    else:
        print("[tts] engine=edge-tts zh-CN-XiaoxiaoNeural")
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
    if TTS_ENGINE == "edge":
        ok = True
        base, codec = "", "edge-tts"
        engine = "edge-tts"
        sr = 24000
        device = "cloud-neural"
        voice = os.environ.get("TTS_VOICE", "zh-CN-XiaoxiaoNeural")
    else:
        base, codec = model_files()
        ok = ready()
        engine = engine_id()
        sr = sample_rate()
        device = device_name() if ok else DEVICE
        voice = VOICE_PROMPT
    payload = {
        "ok": ok,
        "ready": ok,
        "engine": engine,
        "model": engine,
        "base": base,
        "codec": codec,
        "sampleRate": sr,
        "device": device,
        "voice": voice,
        "error": load_error(),
        "asr": {
            "ready": bool(asr_info.get("ready")),
            "engine": asr_info.get("engine"),
            "error": asr_info.get("error"),
        },
    }
    return JSONResponse(payload, status_code=200 if ok else 503)


@APP.get("/v1/models")
def list_models():
    from fastapi.responses import JSONResponse

    ok = True if TTS_ENGINE == "edge" else ready()
    model_id = "edge-tts" if TTS_ENGINE == "edge" else engine_id()
    payload = {
        "object": "list",
        "data": [
            {
                "id": model_id,
                "object": "model",
                "owned_by": "local",
            }
        ],
    }
    return JSONResponse(payload, status_code=200 if ok else 503)


@APP.post("/v1/audio/speech")
async def speak(body: SpeakRequest):
    text = (body.input or body.text or "").strip()
    if not text:
        raise HTTPException(400, "text 不能为空")
    if len(text) > MAX_CHARS:
        raise HTTPException(400, f"文本过长，最多 {MAX_CHARS} 字")
    prompt = (body.voice_prompt or body.voice or VOICE_PROMPT).strip()
    speed = min(2.0, max(0.5, body.speed))
    try:
        if TTS_ENGINE == "edge":
            from edge_engine import synthesize_mp3

            mp3 = await synthesize_mp3(soft_normalize(text), voice=prompt, speed=speed)
            return Response(
                content=mp3,
                media_type="audio/mpeg",
                headers={"Cache-Control": "no-store", "X-TTS-Engine": "edge-tts"},
            )
        samples, sr = await asyncio.to_thread(
            synthesize,
            text,
            speed,
            prompt,
            body.seed,
            body.speaker_id,
        )
        wav = to_wav_bytes(samples, sr)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, f"合成失败: {exc}") from exc
    return Response(
        content=wav,
        media_type="audio/wav",
        headers={"Cache-Control": "no-store", "X-TTS-Engine": engine_id()},
    )


@APP.post("/speak")
async def speak_alias(body: SpeakRequest):
    return await speak(body)
