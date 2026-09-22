# 本地神经语音（Kokoro 女声 + SenseVoice ASR）

默认 **Kokoro int8 中文女声**（`zf_018` / sid=12）。权重已在 `data/models/`，不拉 vLLM 镜像。

```powershell
powershell -ExecutionPolicy Bypass -File tts/run_windows_gpu.ps1
```

健康检查：`GET http://127.0.0.1:8090/health`。后端 `TTS_SPEECH_URL=http://127.0.0.1:8090`。

## 能力

- **TTS**：sherpa-onnx **Kokoro**（`kokoro-int8-multi-lang-v1_1`），int8 量化。默认中文女声 `zf_018`（sid=12）
- **ASR**：SenseVoice int8 离线识别
- 权重放在 `data/models/`，不打进镜像

## 本机启动

```powershell
powershell -ExecutionPolicy Bypass -File tts/run_windows_gpu.ps1
```

健康检查：`GET http://127.0.0.1:8090/health`，应看到 `"engine": "kokoro-int8-multi-lang-v1_1"`。

```bash
curl -X POST http://127.0.0.1:8090/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d "{\"input\":\"你好，我是智枢。\",\"speaker_id\":12,\"response_format\":\"wav\"}" \
  --output tts.wav
```

后端 `TTS_SPEECH_URL` 与 `TTS_URL` 都指向 `http://127.0.0.1:8090`。

手动下载：

```bash
python tts/download_model.py
bash tts/download_asr_model.sh
```

## 说话人（节选）

| sid | 名称 |
|-----|------|
| 12 | zf_018（中文女声，默认，比 zf_001 自然） |
| 48 | zf_xiaoyi |
| 45 | zf_xiaobei |
| 49 | zm_yunjian（中文男声） |
| 0 | 英文默认 |

## 环境变量

| 变量 | 含义 | 示例 |
|------|------|------|
| `TTS_MODEL_DIR` | Kokoro 目录 | `data/models/kokoro-int8-multi-lang-v1_1` |
| `TTS_SPEAKER_ID` | 说话人 | `47` |
| `TTS_NUM_THREADS` | TTS 线程 | `4` |
| `ASR_MODEL_DIR` | SenseVoice 目录 | `data/models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17` |
| `ASR_NUM_THREADS` | ASR 线程 | `6` |
