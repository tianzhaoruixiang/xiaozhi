# 运行时数据目录

本目录挂载进所有容器，**模型与运行产物统一放这里**，不打进镜像。

```
data/
  models/           # Kokoro / SenseVoice；Qwen3-TTS 权重缓存在 models/hf-home
  hrbp-reports/     # 上报 HRBP 的 Markdown 存档
  runtime/          # 进程运行时写入（HOME 等）
```

## 预置模型

```bash
python tts/download_model.py
bash tts/download_asr_model.sh
```

默认下载到 `data/models/`。也可显式指定：

```bash
bash tts/download_model.sh data/models
bash tts/download_asr_model.sh data/models
```

## Docker

`docker-compose.yml` 将 `./data` 挂载为容器内 `/data`：

| 服务 | 路径 |
|------|------|
| tts | `/data/models/...` |
| api | `/data/hrbp-reports`、`/data/runtime` |
