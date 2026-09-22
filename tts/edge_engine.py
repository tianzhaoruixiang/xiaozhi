"""微软神经女声（edge-tts），不落大模型权重。"""

from __future__ import annotations

import asyncio
import os

DEFAULT_VOICE = os.environ.get("TTS_VOICE", "zh-CN-XiaoxiaoNeural").strip() or "zh-CN-XiaoxiaoNeural"

_VOICE_ALIAS = {
    "zh": DEFAULT_VOICE,
    "cn": DEFAULT_VOICE,
    "zh-female": "zh-CN-XiaoxiaoNeural",
    "xiaoxiao": "zh-CN-XiaoxiaoNeural",
    "xiaoyi": "zh-CN-XiaoyiNeural",
    "xiaoxuan": "zh-CN-XiaoxuanNeural",
    "xiaorou": "zh-CN-XiaorouNeural",
    "en": "en-US-JennyNeural",
}


def resolve_voice(name: str | None) -> str:
    key = (name or "").strip()
    if not key:
        return DEFAULT_VOICE
    mapped = _VOICE_ALIAS.get(key.lower())
    return mapped or key


def speed_to_rate(speed: float) -> str:
    pct = int(round((float(speed) - 1.0) * 100))
    pct = max(-50, min(100, pct))
    return f"{pct:+d}%"


async def synthesize_mp3(text: str, *, voice: str | None = None, speed: float = 1.0) -> bytes:
    import edge_tts

    communicate = edge_tts.Communicate(
        text.strip(),
        resolve_voice(voice),
        rate=speed_to_rate(speed),
    )
    chunks: list[bytes] = []
    async for item in communicate.stream():
        if item["type"] == "audio":
            chunks.append(item["data"])
    audio = b"".join(chunks)
    if len(audio) < 80:
        raise RuntimeError("edge-tts 音频为空，可能被网络拦截")
    return audio


def synthesize_mp3_sync(text: str, *, voice: str | None = None, speed: float = 1.0) -> bytes:
    return asyncio.run(synthesize_mp3(text, voice=voice, speed=speed))
