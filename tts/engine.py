"""本地 sherpa-onnx TTS：默认 Kokoro int8（中英），CPU 友好。"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

import numpy as np
import sherpa_onnx

_REPO_ROOT = Path(__file__).resolve().parent.parent
_MODELS = _REPO_ROOT / "data" / "models"
DEFAULT_TTS_NAME = "kokoro-int8-multi-lang-v1_1"
ENGINE_ID = "kokoro-int8-multi-lang-v1_1"
DEFAULT_VOICE = os.environ.get("TTS_VOICE_PROMPT", "zf_001").strip() or "zf_001"
NUM_THREADS = int(os.environ.get("TTS_NUM_THREADS", "4"))
PROVIDER = os.environ.get("TTS_PROVIDER", os.environ.get("ASR_PROVIDER", "cpu")).strip() or "cpu"
# Kokoro v1.1：3 = zf_001（中文女声）；0 = 英文
DEFAULT_SID = int(os.environ.get("TTS_SPEAKER_ID", "3"))

_VOICE_SID = {
    "zh": 3,
    "cn": 3,
    "zf_xiaoxiao": 3,
    "zf_xiaoyi": 3,
    "zf_xiaobei": 3,
    "zf_xiaoni": 3,
    "zf_001": 3,
    "en": 0,
}

_engine: Optional[sherpa_onnx.OfflineTts] = None
_sample_rate = 24000
_load_error: Optional[str] = None
_model_root: Optional[Path] = None
_model_file: Optional[Path] = None
_backend: str = "kokoro"


def _onnx_candidates(root: Path) -> list[Path]:
    names = ("model.int8.onnx", "model.onnx", "model-steps-3.onnx", f"{root.name}.onnx")
    found: list[Path] = []
    seen: set[str] = set()
    for name in names:
        p = root / name
        if p.is_file() and p.stat().st_size > 1024 * 1024:
            key = str(p.resolve())
            if key not in seen:
                seen.add(key)
                found.append(p)
    for p in sorted(root.glob("*.onnx")):
        if p.stat().st_size <= 1024 * 1024:
            continue
        key = str(p.resolve())
        if key not in seen:
            seen.add(key)
            found.append(p)
    return found


def _is_tts_root(root: Path) -> bool:
    if not root.is_dir():
        return False
    if "sense-voice" in root.name.lower():
        return False
    if not (root / "tokens.txt").is_file():
        return False
    return bool(_onnx_candidates(root))


def _find_tts_root() -> Path:
    raw = os.environ.get("TTS_MODEL_DIR", "").strip()
    candidates: list[Path] = []
    if raw:
        candidates.append(Path(raw))
    preferred = ("kokoro-int8-multi-lang-v1_1", "kokoro-multi-lang-v1_1", "kokoro-multi-lang-v1_0")
    for base in (_MODELS, Path("/data/models")):
        for name in preferred:
            candidates.append(base / name)
        if base.is_dir():
            for p in base.iterdir():
                if p.is_dir() and "kokoro" in p.name.lower():
                    candidates.append(p)

    seen: set[str] = set()
    for root in candidates:
        key = str(root.resolve()) if root.exists() else str(root)
        if key in seen:
            continue
        seen.add(key)
        if _is_tts_root(root):
            return root

    raise FileNotFoundError(
        f"未找到 TTS 模型（期望 {_MODELS / DEFAULT_TTS_NAME}）。"
        "请运行 tts/download_model.sh 或 tts/run_windows_gpu.ps1。"
    )


def _rule_fsts(root: Path) -> str:
    names = (
        "phone-zh.fst",
        "date-zh.fst",
        "number-zh.fst",
        "phone.fst",
        "date.fst",
        "number.fst",
        "new_heteronym.fst",
    )
    found = [str(root / n) for n in names if (root / n).is_file()]
    return ",".join(found)


def _kokoro_lexicon(root: Path) -> str:
    parts = []
    for name in ("lexicon-zh.txt", "lexicon-us-en.txt", "lexicon.txt"):
        p = root / name
        if p.is_file():
            parts.append(str(p))
    return ",".join(parts)


def _is_kokoro(root: Path) -> bool:
    return (root / "voices.bin").is_file() or "kokoro" in root.name.lower()


def _kokoro_config(root: Path, onnx: Path) -> sherpa_onnx.OfflineTtsKokoroModelConfig:
    tokens = root / "tokens.txt"
    voices = root / "voices.bin"
    data_dir = root / "espeak-ng-data"
    dict_dir = root / "dict"
    kwargs: dict = {
        "model": str(onnx),
        "voices": str(voices),
        "tokens": str(tokens),
        "data_dir": str(data_dir) if data_dir.is_dir() else "",
        "lexicon": _kokoro_lexicon(root),
    }
    if dict_dir.is_dir():
        kwargs["dict_dir"] = str(dict_dir)
    return sherpa_onnx.OfflineTtsKokoroModelConfig(**kwargs)


def _vits_config(root: Path, onnx: Path) -> sherpa_onnx.OfflineTtsVitsModelConfig:
    lexicon = root / "lexicon.txt"
    tokens = root / "tokens.txt"
    data_dir = root / "espeak-ng-data"
    dict_dir = root / "dict"
    kwargs: dict = {
        "model": str(onnx),
        "tokens": str(tokens),
        "lexicon": str(lexicon) if lexicon.is_file() else "",
        "data_dir": str(data_dir) if data_dir.is_dir() else "",
    }
    if dict_dir.is_dir():
        kwargs["dict_dir"] = str(dict_dir)
    try:
        return sherpa_onnx.OfflineTtsVitsModelConfig(**kwargs)
    except TypeError:
        kwargs.pop("dict_dir", None)
        return sherpa_onnx.OfflineTtsVitsModelConfig(**kwargs)


def load_engine() -> sherpa_onnx.OfflineTts:
    global _engine, _sample_rate, _load_error, _model_root, _model_file, _backend
    if _engine is not None:
        return _engine
    root = _find_tts_root()
    onnx = _onnx_candidates(root)[0]
    if _is_kokoro(root):
        _backend = "kokoro"
        model = sherpa_onnx.OfflineTtsModelConfig(
            kokoro=_kokoro_config(root, onnx),
            num_threads=max(1, NUM_THREADS),
            debug=False,
            provider=PROVIDER,
        )
    else:
        _backend = "vits"
        model = sherpa_onnx.OfflineTtsModelConfig(
            vits=_vits_config(root, onnx),
            num_threads=max(1, NUM_THREADS),
            debug=False,
            provider=PROVIDER,
        )
    cfg = sherpa_onnx.OfflineTtsConfig(
        model=model,
        rule_fsts=_rule_fsts(root),
        max_num_sentences=1,
    )
    if not cfg.validate():
        raise RuntimeError(f"TTS 配置无效: {root}")
    _engine = sherpa_onnx.OfflineTts(cfg)
    _sample_rate = int(_engine.sample_rate)
    _model_root = root
    _model_file = onnx
    _load_error = None
    print(f"[tts] {ENGINE_ID} 已加载 {onnx} sr={_sample_rate} provider={PROVIDER} backend={_backend}")
    return _engine


def ready() -> bool:
    global _load_error
    try:
        load_engine()
        return _engine is not None
    except Exception as exc:  # noqa: BLE001
        _load_error = str(exc)
        return False


def load_error() -> Optional[str]:
    return _load_error


def sample_rate() -> int:
    return _sample_rate


def device_name() -> str:
    return PROVIDER


def engine_id() -> str:
    if _model_root:
        return _model_root.name
    return ENGINE_ID


def model_files() -> tuple[str, str]:
    root = str(_model_root) if _model_root else ""
    onnx = _model_file.name if _model_file else ""
    return root, onnx


def _resolve_sid(
    *,
    instruct: Optional[str],
    language: Optional[str],
    speaker_id: Optional[int],
) -> int:
    if language and language.lower().startswith("en"):
        return 0
    key = (instruct or "").strip().lower()
    if key in _VOICE_SID:
        return _VOICE_SID[key]
    if speaker_id is None:
        return DEFAULT_SID
    sid = int(speaker_id)
    if _backend == "kokoro" and sid in (0, 1):
        return 0 if sid == 0 else DEFAULT_SID
    return sid


def generate(
    text: str,
    *,
    instruct: Optional[str] = None,
    speed: float = 1.0,
    seed: Optional[int] = None,
    language: Optional[str] = None,
    speaker_id: Optional[int] = None,
) -> tuple[np.ndarray, int]:
    _ = seed
    engine = load_engine()
    sid = _resolve_sid(instruct=instruct, language=language, speaker_id=speaker_id)
    audio = engine.generate(text.strip(), sid=sid, speed=float(speed))
    if audio is None or getattr(audio, "samples", None) is None:
        raise RuntimeError("合成结果为空")
    wav = np.asarray(audio.samples, dtype=np.float32).reshape(-1)
    sr = int(getattr(audio, "sample_rate", None) or _sample_rate)
    if wav.size == 0:
        raise RuntimeError("合成结果为空")
    return wav, sr
