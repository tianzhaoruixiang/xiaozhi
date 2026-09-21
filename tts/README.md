# 本地离线神经语音（TTS + ASR via sherpa-onnx）

## 能力

- **TTS**：完全离线推理，不依赖豆包云 / Edge / 浏览器系统音
- **ASR**：SenseVoice int8 离线识别，供「按住说话」（内网可用）
- CPU 可跑，适合内网 Docker
- **模型统一存放在项目根目录 `data/models/`**（不进镜像）

> 说明：浏览器「你好，小智」唤醒走 Web Speech API（Chrome/Edge 通常连厂商云端），纯内网常失败。内网请用本地 ASR。

## 目录

```
tts/
  server.py
  asr.py
  Dockerfile
  download_model.sh       # → data/models/
  download_asr_model.sh   # → data/models/

data/
  models/                 # TTS + ASR 模型（compose 挂载为 /data）
  hrbp-reports/
  runtime/
```

## 使用

```bash
# 外网机预下载模型到 data/models
bash tts/download_model.sh
bash tts/download_asr_model.sh

docker compose up --build -d
```

| 接口 | 说明 |
|------|------|
| `GET /health` | TTS 健康（含 asr.ready） |
| `POST /speak` | 合成 wav |
| `GET /asr/health` | ASR 是否就绪 |
| `POST /asr` | `multipart/form-data` 字段 `file`=wav → `{ text }` |
