# 本地神经语音（TTS = vLLM-Omni Qwen3-TTS，ASR = sherpa-onnx）

## 能力

- **TTS**：官方镜像 **`vllm/vllm-omni-rocm`** 部署 **Qwen3-TTS CustomVoice**。本机 AMD 经 Docker Desktop 的 `/dev/dxg` 进容器（不是 NVIDIA `--gpus`）。女声映射：`yuxiaoyun_v3.1` → `vivian`
- **ASR**：SenseVoice int8 离线识别，供「按住说话」/ 本地唤醒
- **权重**放在 `data/models/hf-home`（Hugging Face / 镜像缓存），不打进业务镜像

`qwen-audio-3.1-tts-flash` 是百炼托管模型名，**没有公开权重**。本地用 vLLM-Omni 跑同系列开源 checkpoint：`Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice`。

## vLLM-Omni ROCm 镜像（本机 AMD）

Docker Desktop 的 Linux VM **没有** `/dev/kfd`，NVIDIA `gpus: all` 会失败。本仓库把 GPU 按 WSL2 AMD 方式挂进容器：`/dev/dxg` + `/usr/lib/wsl/lib`。

```bash
docker compose --profile vllm-omni up -d
```

健康检查：`GET http://127.0.0.1:8091/v1/models`

试合成：

```bash
curl -X POST http://127.0.0.1:8091/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d "{\"input\":\"你好，我是智枢。\",\"voice\":\"vivian\",\"language\":\"Chinese\",\"response_format\":\"wav\"}" \
  --output /tmp/tts.wav
```

后端 `TTS_SPEECH_URL` 指向该服务（compose 内为 `http://vllm-omni:8091`）。显存不够时把 `TTS_MODEL` 改成 `Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice`。

说明：官方 `vllm-omni-rocm` 主要在 gfx942（MI300）上验证。8060S（gfx1151）能进容器，但镜像内核若不含 gfx1151，推理仍可能失败。真正的 `/dev/kfd` 直通只在原生 Linux + ROCm 驱动下才有。

本仓库开发机是 **AMD Radeon 8060S（gfx1151 / Strix Halo）**。Docker Desktop 走 NVIDIA 容器运行时，**无法把这块 iGPU 塞进 Linux 容器**（实测 `nvidia-container-cli: WSL environment detected but no adapters were found`）。因此 TTS **默认在 Windows 宿主机用 ROCm 版 PyTorch 跑 GPU**，后端容器通过 `host.docker.internal:8090` 访问。

> 说明：浏览器「你好，智枢」唤醒走 Web Speech API（Chrome/Edge 通常连厂商云端），纯内网常失败。内网请用本地 ASR。

## 目录

```
tts/
  server.py
  engine.py               # Higgs Audio V2 ServeEngine
  asr.py
  Dockerfile              # 可选：无 GPU / NVIDIA 容器
  download_model.sh
  download_model.py
  run_windows_gpu.ps1     # 本机 AMD GPU 启动入口
```

## 本机 GPU（推荐）

```powershell
# 预下载权重
python tts/download_model.py

# 安装 Python 3.12（如需要）+ AMD gfx1151 PyTorch + 启动 :8090
powershell -ExecutionPolicy Bypass -File tts/run_windows_gpu.ps1
```

另开终端：

```bash
docker compose up --build -d
```

`api` 默认 `TTS_URL=http://host.docker.internal:8090`。

健康检查：`GET http://127.0.0.1:8090/health`，应看到 `"engine": "higgs-audio-v2"` 且 `device` 含 GPU 名称。

## 容器内 TTS（无 AMD 宿主机 GPU 时）

NVIDIA 机器可加 compose profile，并构建 CUDA 版镜像：

```bash
docker compose --profile container-tts build --build-arg TORCH_BACKEND=cu124 tts
# 同时把 .env 里 TTS_URL 改成 http://tts:8090
docker compose --profile container-tts up --build -d
```

## 接口

| 接口 | 说明 |
|------|------|
| `GET /health` | TTS 健康（`engine=higgs-audio-v2`） |
| `POST /speak` | 合成 wav（可选 `voice_prompt`、`speed`） |
| `GET /asr/health` | ASR 是否就绪 |
| `POST /asr` | `multipart/form-data` 字段 `file`=wav → `{ text }` |

## 环境变量

| 变量 | 含义 | 示例 |
|------|------|------|
| `TTS_MODEL_DIR` | Higgs 3B 权重目录 | `data/models/HiggsAudio-V2/generation-3B-base` |
| `TTS_TOKENIZER_DIR` | Audio tokenizer 目录 | `data/models/HiggsAudio-V2/tokenizer` |
| `TTS_DEVICE` | `auto` / `cuda` / `cpu` | `auto` |
| `TTS_VOICE_PROMPT` | 中文女声音色描述 | `feminine, young Chinese woman, clear Mandarin` |
| `TTS_TEMPERATURE` | 采样温度（越低越稳） | `0.3` |
| `ASR_NUM_THREADS` | ASR ONNX 线程数 | `6` |
| `ASR_PROVIDER` | sherpa-onnx 推理后端 | `cpu` |
| `HF_ENDPOINT` | Hugging Face 镜像 | `https://hf-mirror.com` |
