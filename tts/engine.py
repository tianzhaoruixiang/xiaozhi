"""Higgs Audio V2（3B）本地推理：优先 CUDA/ROCm GPU，中文女声。"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

import numpy as np

_REPO_ROOT = Path(__file__).resolve().parent.parent
_HOST_MODELS = _REPO_ROOT / "data" / "models" / "HiggsAudio-V2"
os.environ.setdefault("HF_HOME", str(_REPO_ROOT / "data" / "models" / "hf-home"))
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
os.environ.setdefault("HF_ENDPOINT", os.environ.get("HF_ENDPOINT", "https://hf-mirror.com"))


def _default_dir(env_name: str, *parts: str) -> Path:
    raw = os.environ.get(env_name, "").strip()
    if raw:
        return Path(raw)
    host = _HOST_MODELS.joinpath(*parts)
    if host.is_dir():
        return host
    return Path("/data/models/HiggsAudio-V2").joinpath(*parts)


MODEL_DIR = _default_dir("TTS_MODEL_DIR", "generation-3B-base")
TOKENIZER_DIR = _default_dir("TTS_TOKENIZER_DIR", "tokenizer")
MODEL_ID = os.environ.get("TTS_MODEL_ID", "bosonai/higgs-audio-v2-generation-3B-base")
TOKENIZER_ID = os.environ.get("TTS_TOKENIZER_ID", "bosonai/higgs-audio-v2-tokenizer")
DEVICE_PREF = os.environ.get("TTS_DEVICE", "auto").strip() or "auto"
DEFAULT_VOICE = os.environ.get(
    "TTS_VOICE_PROMPT",
    "feminine, young Chinese woman, clear Mandarin",
).strip()
TEMPERATURE = float(os.environ.get("TTS_TEMPERATURE", "0.3"))
TOP_P = float(os.environ.get("TTS_TOP_P", "0.95"))
TOP_K = int(os.environ.get("TTS_TOP_K", "50"))
SEED_RAW = os.environ.get("TTS_SEED", "").strip()
DEFAULT_SEED: Optional[int] = int(SEED_RAW) if SEED_RAW else 12345
REF_AUDIO = os.environ.get("TTS_REF_AUDIO", "").strip()
REF_TEXT = os.environ.get("TTS_REF_TEXT", "").strip()

_engine = None
_device_name = "cpu"
_dtype_name = "float32"
_load_error: Optional[str] = None
_sample_rate = 24000

_ZH_PUNCT = {
    "，": ", ",
    "。": ".",
    "：": ":",
    "；": ";",
    "？": "?",
    "！": "!",
    "（": "(",
    "）": ")",
    "【": "[",
    "】": "]",
    "《": "<",
    "》": ">",
    "“": '"',
    "”": '"',
    "‘": "'",
    "’": "'",
    "、": ",",
    "—": "-",
    "…": "...",
    "·": ".",
    "「": '"',
    "」": '"',
    "『": '"',
    "』": '"',
}


def higgs_punct(text: str) -> str:
    for zh, en in _ZH_PUNCT.items():
        text = text.replace(zh, en)
    return text


def _resolve_pretrained(path: Path, repo_id: str) -> str:
    if path.is_dir() and (path / "config.json").is_file():
        return str(path)
    return repo_id


def _pick_device():
    import torch

    pref = DEVICE_PREF.lower()
    if pref in ("cpu", "none"):
        return "cpu"
    if pref not in ("auto", "gpu", "cuda", "rocm", "hip") and pref:
        if pref.startswith("cuda") and torch.cuda.is_available():
            return pref
        if pref in ("dml", "directml"):
            import torch_directml

            return torch_directml.device()
        return pref
    if torch.cuda.is_available():
        # 用 cuda:0，跳过 Higgs 仅在 device=="cuda" 时的 CUDA Graph 捕获（AMD ROCm 更稳）
        return "cuda:0"
    try:
        import torch_directml

        return torch_directml.device()
    except Exception:
        return "cpu"


def _pick_dtype(device) -> "object":
    import torch

    name = str(device)
    if name.startswith("cuda"):
        if torch.cuda.is_bf16_supported():
            return torch.bfloat16
        return torch.float16
    return torch.float32


def load_engine():
    global _engine, _device_name, _dtype_name, _load_error, _sample_rate
    if _engine is not None:
        return _engine

    import torch
    from boson_multimodal.serve.serve_engine import HiggsAudioServeEngine

    os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
    device = _pick_device()
    dtype = _pick_dtype(device)
    model_path = _resolve_pretrained(MODEL_DIR, MODEL_ID)
    tok_path = _resolve_pretrained(TOKENIZER_DIR, TOKENIZER_ID)

    try:
        engine = HiggsAudioServeEngine(
            model_path,
            tok_path,
            device=str(device),
            torch_dtype=dtype,
            kv_cache_lengths=[1024, 2048, 4096],
        )

        def _prepare_kv_caches(self) -> None:
            caches = getattr(self, "kv_caches", None)
            if not caches:
                return
            for kv_cache in caches.values():
                kv_cache.reset()

        HiggsAudioServeEngine._prepare_kv_caches = _prepare_kv_caches
        if not str(device).startswith("cuda"):
            engine.kv_caches = None
        _engine = engine
        _device_name = str(device)
        if str(device).startswith("cuda"):
            _device_name = f"cuda:0 ({torch.cuda.get_device_name(0)})"
        _dtype_name = str(dtype).replace("torch.", "")
        _sample_rate = int(engine.audio_tokenizer.sampling_rate)
        _load_error = None
        print(
            f"[tts] Higgs Audio V2 已加载 model={model_path} tokenizer={tok_path} "
            f"device={_device_name} dtype={_dtype_name} voice={DEFAULT_VOICE}"
        )
        return _engine
    except Exception as exc:  # noqa: BLE001
        _load_error = str(exc)
        raise


def ready() -> bool:
    return _engine is not None


def load_error() -> Optional[str]:
    return _load_error


def sample_rate() -> int:
    return _sample_rate


def device_name() -> str:
    return _device_name


def model_files() -> tuple[str, str]:
    return (
        _resolve_pretrained(MODEL_DIR, MODEL_ID),
        _resolve_pretrained(TOKENIZER_DIR, TOKENIZER_ID),
    )


def _scene_prompt(voice_prompt: str) -> str:
    desc = (voice_prompt or DEFAULT_VOICE).strip() or DEFAULT_VOICE
    return (
        "Generate audio following instruction.\n\n"
        "<|scene_desc_start|>\n"
        "Audio is recorded from a quiet room.\n"
        f"SPEAKER0: {desc}\n"
        "<|scene_desc_end|>"
    )


def _max_new_tokens(text: str) -> int:
    # 中文约 4～6 字/秒，音频 tokenizer 约 25 Hz，留余量
    return int(min(4096, max(256, len(text) * 8 + 160)))


def generate(
    text: str,
    *,
    instruct: Optional[str] = None,
    speed: float = 1.0,
    seed: Optional[int] = None,
    language: Optional[str] = None,
) -> tuple[np.ndarray, int]:
    _ = language
    load_engine()
    assert _engine is not None

    from boson_multimodal.data_types import AudioContent, ChatMLSample, Message

    prompt_text = higgs_punct(text.strip())
    messages = [
        Message(role="system", content=_scene_prompt(instruct or DEFAULT_VOICE)),
    ]
    ref_path = Path(REF_AUDIO) if REF_AUDIO else None
    if ref_path and ref_path.is_file():
        messages.append(
            Message(role="user", content=REF_TEXT or prompt_text[:80]),
        )
        messages.append(
            Message(role="assistant", content=AudioContent(audio_url=str(ref_path))),
        )
    messages.append(Message(role="user", content=prompt_text))

    output = _engine.generate(
        chat_ml_sample=ChatMLSample(messages=messages),
        max_new_tokens=_max_new_tokens(prompt_text),
        temperature=TEMPERATURE,
        top_p=TOP_P,
        top_k=TOP_K,
        force_audio_gen=True,
        seed=seed if seed is not None else DEFAULT_SEED,
        stop_strings=["<|end_of_text|>", "<|eot_id|>"],
    )
    samples = output.audio
    sr = int(output.sampling_rate or _sample_rate)
    if samples is None or getattr(samples, "size", 0) == 0:
        raise RuntimeError("合成结果为空")
    wav = np.asarray(samples, dtype=np.float32).reshape(-1)
    if abs(speed - 1.0) > 0.03:
        try:
            import librosa

            wav = librosa.effects.time_stretch(wav, rate=float(speed))
        except Exception:
            pass
    return wav, sr
