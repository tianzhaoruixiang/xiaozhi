"""
本地离线神经 TTS（sherpa-onnx + MeloTTS 中英）
推理全程不访问外网；模型需在构建或挂载时准备好。
"""

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
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from asr import asr_ready, load_asr, recognize_wav

APP = FastAPI(title="xiaozhi-local-tts", version="1.0.0")

MODEL_DIR = Path(os.environ.get("TTS_MODEL_DIR", "/data/models/vits-melo-tts-zh_en"))
NUM_THREADS = int(os.environ.get("TTS_NUM_THREADS", "4"))
DEFAULT_SPEED = float(os.environ.get("TTS_SPEED", "1.02"))
DEFAULT_SID = int(os.environ.get("TTS_SPEAKER_ID", "0"))
# 句间静音秒数，模拟豆包式停顿
PAUSE_SEC = float(os.environ.get("TTS_PAUSE_SEC", "0.22"))
MAX_CHARS = int(os.environ.get("TTS_MAX_CHARS", "1200"))

_tts: Optional[sherpa_onnx.OfflineTts] = None
_lock = threading.Lock()
_sample_rate = 44100


def _model_root() -> Path:
    if (MODEL_DIR / "model.onnx").is_file():
        return MODEL_DIR
    # tar 解压常见结构
    candidates = list(MODEL_DIR.glob("**/model.onnx"))
    if candidates:
        return candidates[0].parent
    raise FileNotFoundError(
        f"未找到 TTS 模型目录（期望 {MODEL_DIR}/model.onnx）。"
        "请将模型放到项目 data/models/，或检查 /data 挂载。"
    )


def load_tts() -> sherpa_onnx.OfflineTts:
    global _tts, _sample_rate
    if _tts is not None:
        return _tts

    root = _model_root()
    model = str(root / "model.onnx")
    lexicon = str(root / "lexicon.txt")
    tokens = str(root / "tokens.txt")

    rule_parts = []
    for name in ("date.fst", "number.fst", "phone.fst"):
        p = root / name
        if p.is_file():
            rule_parts.append(str(p))
    rule_fsts = ",".join(rule_parts)

    dict_dir = ""
    if (root / "dict").is_dir():
        dict_dir = str(root / "dict")

    cfg = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            vits=sherpa_onnx.OfflineTtsVitsModelConfig(
                model=model,
                lexicon=lexicon,
                tokens=tokens,
                dict_dir=dict_dir,
            ),
            provider="cpu",
            debug=False,
            num_threads=NUM_THREADS,
        ),
        rule_fsts=rule_fsts,
        max_num_sentences=8,
    )
    if not cfg.validate():
        raise RuntimeError("TTS 配置无效，请检查模型文件是否完整")

    _tts = sherpa_onnx.OfflineTts(cfg)
    _sample_rate = _tts.sample_rate
    return _tts


def soft_normalize(text: str) -> str:
    """把书面稿整理成更口语、利于合成的文本。"""
    t = text.strip()
    t = re.sub(r"[#*`>_\[\]()（）【】]", "", t)
    t = t.replace("：", "，").replace(":", "，")
    t = t.replace("；", "。").replace(";", "。")
    t = re.sub(r"\s+", "，", t)
    # 序号口语化（必须用捕获组，避免 \\1 无效引用）
    t = re.sub(r"(^|，|。)第一[，、]?", r"\1首先，", t)
    t = re.sub(r"(^|，|。)第二[，、]?", r"\1其次，", t)
    t = re.sub(r"(^|，|。)第三[，、]?", r"\1另外，", t)
    t = re.sub(r"(^|，|。)第四[，、]?", r"\1还有，", t)
    t = re.sub(r"第([一二三四五六七八九十\d]+)[，、点]", r"其\1，", t)
    # 数字时间口语：14:00 → 十四点
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


def synthesize(text: str, speed: float, sid: int) -> tuple[np.ndarray, int]:
    engine = load_tts()
    chunks = split_chunks(soft_normalize(text))
    waves: list[np.ndarray] = []
    pause = np.zeros(int(_sample_rate * PAUSE_SEC), dtype=np.float32)
    sample_rate = _sample_rate

    with _lock:
        for i, chunk in enumerate(chunks):
            try:
                audio = engine.generate(chunk, sid=sid, speed=speed)
            except TypeError:
                gen = sherpa_onnx.GenerationConfig()
                gen.sid = sid
                gen.speed = speed
                audio = engine.generate(chunk, gen)

            samples = np.asarray(audio.samples, dtype=np.float32)
            sample_rate = int(getattr(audio, "sample_rate", sample_rate) or sample_rate)
            if samples.size == 0:
                continue
            waves.append(samples)
            if i < len(chunks) - 1 and PAUSE_SEC > 0:
                waves.append(pause)

    if not waves:
        raise RuntimeError("合成结果为空")
    return np.concatenate(waves), sample_rate


def to_wav_bytes(samples: np.ndarray, sample_rate: int) -> bytes:
    # float32 [-1,1] -> int16
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


@APP.on_event("startup")
def on_startup() -> None:
    load_tts()
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
    try:
        root = _model_root()
        ready = _tts is not None
        return JSONResponse(
            {
                "ok": ready,
                "ready": ready,
                "engine": "sherpa-onnx",
                "model": "vits-melo-tts-zh_en",
                "modelDir": str(root),
                "sampleRate": _sample_rate,
                "offline": True,
                "asr": {
                    "ready": bool(asr_info.get("ready")),
                    "engine": asr_info.get("engine"),
                    "error": asr_info.get("error"),
                },
            },
            status_code=200 if ready else 503,
        )
    except Exception as exc:  # noqa: BLE001
        return JSONResponse(
            {"ok": False, "ready": False, "error": str(exc), "asr": asr_info},
            status_code=503,
        )


@APP.post("/v1/audio/speech")
def speak(body: SpeakRequest):
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "text 不能为空")
    if len(text) > MAX_CHARS:
        raise HTTPException(400, f"文本过长，最多 {MAX_CHARS} 字")
    try:
        samples, sr = synthesize(text, speed=body.speed, sid=body.speaker_id)
        wav = to_wav_bytes(samples, sr)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, f"合成失败: {exc}") from exc
    return Response(
        content=wav,
        media_type="audio/wav",
        headers={"Cache-Control": "no-store", "X-TTS-Engine": "sherpa-onnx-melo"},
    )


# 兼容前端简短路径
@APP.post("/speak")
def speak_alias(body: SpeakRequest):
    return speak(body)
