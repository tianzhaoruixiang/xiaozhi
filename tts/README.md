# 本地神经语音（TTS = OmniVoice，ASR = sherpa-onnx）

## 能力

- **TTS**：小米 k2-fsa **OmniVoice**（官方 id：`k2-fsa/OmniVoice`），默认用 Voice Design 合成**中国女性**音色（`女，青年`），不依赖豆包云 / Edge / 浏览器系统音
- **ASR**：SenseVoice int8 离线识别，供「按住说话」
- **模型统一存放在项目根目录 `data/models/`**（不进镜像）

OmniVoice 约 0.8B，支持 600+ 语种。官方建议 Python ≥ 3.10、PyTorch ≥ 2.4；有 NVIDIA GPU 时用 `float16`，CPU 走 `float32`（会慢一些）。

> 说明：浏览器「你好，小智」唤醒走 Web Speech API（Chrome/Edge 通常连厂商云端），纯内网常失败。内网请用本地 ASR。

## 目录

```
tts/
  server.py
  asr.py
  Dockerfile
  download_model.sh       # OmniVoice → data/models/OmniVoice
  download_asr_model.sh   # SenseVoice → data/models/

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

国内下载 TTS 权重默认走 ModelScope。若改走 Hugging Face：

```bash
# Linux / macOS / Git Bash
export TTS_DOWNLOAD_SOURCE=hf
export HF_ENDPOINT=https://hf-mirror.com   # 可选镜像
bash tts/download_model.sh
```

有 NVIDIA GPU 时，构建 CUDA 版 TTS 镜像：

```bash
docker compose build tts \
  --build-arg PYTHON_IMAGE=pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime \
  --build-arg TORCH_WHEEL=https://mirrors.aliyun.com/pytorch-wheels/cu124/torch-2.5.1%2Bcu124-cp311-cp311-linux_x86_64.whl \
  --build-arg TORCHAUDIO_WHEEL=https://mirrors.aliyun.com/pytorch-wheels/cu124/torchaudio-2.5.1%2Bcu124-cp311-cp311-linux_x86_64.whl
```

并在 `docker-compose.yml` 的 `tts` 服务加上 GPU（宿主机需 nvidia-container-toolkit），例如：

```yaml
gpus: all
environment:
  TTS_DEVICE: cuda
```

本地不经过 Docker、直接跑服务：

```bash
cd tts
pip install torch torchaudio   # 有 GPU 请装 CUDA 版
pip install -r requirements.txt
# 先 bash download_model.sh && bash download_asr_model.sh
set TTS_MODEL_DIR=../data/models/OmniVoice
set ASR_MODEL_DIR=../data/models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17
uvicorn server:APP --host 127.0.0.1 --port 8090
```

后端默认 `TTS_URL=http://127.0.0.1:8090`。

| 接口 | 说明 |
|------|------|
| `GET /health` | TTS 健康（`engine=omnivoice`，`model=OmniVoice`，含 asr.ready） |
| `POST /speak` | 合成 wav（可选 `voice_prompt`、`speed`） |
| `GET /asr/health` | ASR 是否就绪 |
| `POST /asr` | `multipart/form-data` 字段 `file`=wav → `{ text }` |

## 环境变量

| 变量 | 含义 | 示例 |
|------|------|------|
| `TTS_MODEL_ID` | Hugging Face 仓库 id | `k2-fsa/OmniVoice` |
| `TTS_MODEL_DIR` | 本地权重目录（有 `config.json` 则优先离线加载） | `/data/models/OmniVoice` |
| `HF_HOME` | Hugging Face 缓存 | `/data/models/.hf` |
| `TTS_DEVICE` | `auto` / `cuda` / `cpu` | `auto` |
| `TTS_VOICE_PROMPT` | OmniVoice Voice Design 属性 | `女，青年` |
| `TTS_INFERENCE_STEPS` | 扩散步数（16 更快，32 更稳） | `16` |
| `TTS_SPEED` | 语速（交给模型，>1 更快） | `1.0` |
| `TTS_LOCAL_FILES_ONLY` | 禁止联网拉权重 | `true` |
