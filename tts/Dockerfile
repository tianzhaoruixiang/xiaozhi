# 默认 python 3.11 slim。本机无 NVIDIA 时用 CPU torch（最快能跑）。
# NVIDIA 机器：docker compose build tts --build-arg TTS_TORCH=cuda --build-arg INSTALL_NVIDIA_LIBS=1
ARG PYTHON_IMAGE=python:3.11-slim-bookworm

FROM ${PYTHON_IMAGE}

WORKDIR /app

RUN set -eux; \
  printf '%s\n' \
    'Acquire::ForceIPv4 "true";' \
    'Acquire::Retries "5";' \
    'Acquire::http::Timeout "30";' \
    'Acquire::http::Pipeline-Depth "0";' \
    > /etc/apt/apt.conf.d/99build; \
  rewrite() { \
    host="$1"; \
    for f in /etc/apt/sources.list \
             /etc/apt/sources.list.d/*.list \
             /etc/apt/sources.list.d/*.sources \
             /etc/apt/mirrors/*.list; do \
      [ -f "$f" ] || continue; \
      sed -i \
        -e "s|https\\?://deb.debian.org|http://${host}|g" \
        -e "s|https\\?://security.debian.org|http://${host}|g" \
        -e "s|https\\?://archive.ubuntu.com|http://${host}|g" \
        -e "s|https\\?://security.ubuntu.com|http://${host}|g" \
        -e "s|https\\?://mirrors.aliyun.com|http://${host}|g" \
        -e "s|https\\?://mirrors.cloud.tencent.com|http://${host}|g" \
        -e "s|https\\?://mirrors.ustc.edu.cn|http://${host}|g" \
        -e "s|https\\?://mirrors.tuna.tsinghua.edu.cn|http://${host}|g" \
        "$f"; \
    done; \
  }; \
  ok=0; \
  for host in mirrors.aliyun.com mirrors.cloud.tencent.com mirrors.ustc.edu.cn mirrors.tuna.tsinghua.edu.cn; do \
    rewrite "$host"; \
    if apt-get update; then ok=1; break; fi; \
  done; \
  [ "$ok" = 1 ]; \
  apt-get install -y --no-install-recommends curl ca-certificates git libsndfile1 ffmpeg; \
  rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
COPY .wheels /opt/wheels

ARG TTS_TORCH=cpu
ARG INSTALL_NVIDIA_LIBS=0
ARG TORCH_CUDA_WHEEL=https://mirrors.aliyun.com/pytorch-wheels/cu124/torch-2.5.1%2Bcu124-cp311-cp311-linux_x86_64.whl
ARG TORCHAUDIO_CUDA_WHEEL=https://mirrors.aliyun.com/pytorch-wheels/cu124/torchaudio-2.5.1%2Bcu124-cp311-cp311-linux_x86_64.whl
ARG TORCH_CPU_WHEEL=https://mirrors.aliyun.com/pytorch-wheels/cpu/torch-2.5.1%2Bcpu-cp311-cp311-linux_x86_64.whl
ARG TORCHAUDIO_CPU_WHEEL=https://mirrors.aliyun.com/pytorch-wheels/cpu/torchaudio-2.5.1%2Bcpu-cp311-cp311-linux_x86_64.whl

RUN set -eux; \
  fetch_whl() { \
    url="$1"; dest="$2"; \
    i=0; \
    while [ "$i" -lt 8 ]; do \
      if curl -fL --retry 20 --retry-all-errors --retry-delay 3 -C - --connect-timeout 30 -o "$dest" "$url" \
        && python -c "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); raise SystemExit(1 if z.testzip() else 0)" "$dest"; then \
        return 0; \
      fi; \
      i=$((i+1)); \
      rm -f "$dest"; \
      sleep 3; \
    done; \
    return 1; \
  }; \
  pip_base() { \
    pip install --no-cache-dir --timeout 300 --retries 15 \
      --trusted-host mirrors.aliyun.com \
      --trusted-host pypi.tuna.tsinghua.edu.cn \
      --trusted-host pypi.org \
      -i https://mirrors.aliyun.com/pypi/simple/ \
      "$@"; \
  }; \
  strip_nvidia_requires() { \
    python - <<'PY'
from pathlib import Path
root = Path("/usr/local/lib/python3.11/site-packages")
for meta in list(root.glob("torch*.dist-info/METADATA")) + list(root.glob("triton*.dist-info/METADATA")):
    lines = []
    for line in meta.read_text(encoding="utf-8").splitlines(True):
        low = line.lower()
        if line.startswith("Requires-Dist:") and "nvidia-" in low:
            continue
        lines.append(line)
    meta.write_text("".join(lines), encoding="utf-8")
PY
  }; \
  install_pair() { \
    torch_whl="$1"; audio_whl="$2"; \
    pip_base --no-deps "$torch_whl" "$audio_whl"; \
  }; \
  flavor="${TTS_TORCH}"; \
  if [ "$flavor" = "cuda" ]; then \
    if ls /opt/wheels/torch-2.5.1+cu124*.whl >/dev/null 2>&1 && ls /opt/wheels/torchaudio-2.5.1+cu124*.whl >/dev/null 2>&1; then \
      install_pair /opt/wheels/torch-2.5.1+cu124*.whl /opt/wheels/torchaudio-2.5.1+cu124*.whl; \
    else \
      fetch_whl "${TORCH_CUDA_WHEEL}" /tmp/torch.whl; \
      fetch_whl "${TORCHAUDIO_CUDA_WHEEL}" /tmp/torchaudio.whl; \
      install_pair /tmp/torch.whl /tmp/torchaudio.whl; \
      rm -f /tmp/torch.whl /tmp/torchaudio.whl; \
    fi; \
  else \
    if ls /opt/wheels/torch-2.5.1+cpu*.whl >/dev/null 2>&1 && ls /opt/wheels/torchaudio-2.5.1+cpu*.whl >/dev/null 2>&1; then \
      install_pair /opt/wheels/torch-2.5.1+cpu*.whl /opt/wheels/torchaudio-2.5.1+cpu*.whl; \
    else \
      fetch_whl "${TORCH_CPU_WHEEL}" /tmp/torch.whl; \
      fetch_whl "${TORCHAUDIO_CPU_WHEEL}" /tmp/torchaudio.whl; \
      install_pair /tmp/torch.whl /tmp/torchaudio.whl; \
      rm -f /tmp/torch.whl /tmp/torchaudio.whl; \
    fi; \
  fi; \
  pip_base filelock "typing-extensions>=4.8.0" networkx jinja2 fsspec "sympy==1.13.1" mpmath MarkupSafe; \
  if [ "$flavor" = "cuda" ] && [ "${INSTALL_NVIDIA_LIBS}" = "1" ]; then \
    pip_base nvidia-cuda-runtime-cu12==12.4.127 nvidia-cuda-nvrtc-cu12==12.4.127 nvidia-nvtx-cu12==12.4.127 \
      nvidia-cuda-cupti-cu12==12.4.127 nvidia-cudnn-cu12==9.1.0.70 nvidia-cublas-cu12==12.4.5.8 \
      nvidia-cufft-cu12==11.2.1.3 nvidia-curand-cu12==10.3.5.147 nvidia-cusolver-cu12==11.6.1.9 \
      nvidia-cusparse-cu12==12.3.1.170 nvidia-nccl-cu12==2.21.5 nvidia-nvjitlink-cu12==12.4.127; \
  else \
    strip_nvidia_requires; \
  fi; \
  if ! python -c "import torch, torchaudio; print('torch', torch.__version__, 'cuda', torch.cuda.is_available())"; then \
    echo "[tts] CUDA torch 无法 import，改装 CPU wheel"; \
    fetch_whl "${TORCH_CPU_WHEEL}" /tmp/torch.whl; \
    fetch_whl "${TORCHAUDIO_CPU_WHEEL}" /tmp/torchaudio.whl; \
    install_pair /tmp/torch.whl /tmp/torchaudio.whl; \
    rm -f /tmp/torch.whl /tmp/torchaudio.whl; \
    strip_nvidia_requires; \
    python -c "import torch, torchaudio; print('torch', torch.__version__, 'cuda', torch.cuda.is_available())"; \
  fi; \
  pip_req() { \
    pip install --no-cache-dir --timeout 300 --retries 15 \
      --trusted-host mirrors.aliyun.com \
      --trusted-host pypi.tuna.tsinghua.edu.cn \
      --trusted-host pypi.org \
      "$@"; \
  }; \
  pip_req -i https://mirrors.aliyun.com/pypi/simple/ -r requirements.txt \
    || pip_req -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt \
    || pip_req -i https://pypi.org/simple -r requirements.txt; \
  python -c "import torch, fastapi, omnivoice; print('ok', torch.__version__)"

COPY download_model.sh download_asr_model.sh ./
RUN sed -i 's/\r$//' ./download_model.sh ./download_asr_model.sh \
  && chmod +x ./download_model.sh ./download_asr_model.sh

COPY server.py asr.py ./

ENV TTS_MODEL_ID=k2-fsa/OmniVoice \
    TTS_MODEL_DIR=/data/models/OmniVoice \
    HF_HOME=/data/models/.hf \
    ASR_MODEL_DIR=/data/models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17 \
    TTS_NUM_THREADS=4 \
    TTS_SPEED=1.0 \
    TTS_PAUSE_SEC=0.22 \
    TTS_DEVICE=cuda \
    TTS_INFERENCE_STEPS=16 \
    TTS_VOICE_PROMPT=女，青年 \
    PORT=8090

EXPOSE 8090
HEALTHCHECK --interval=20s --timeout=5s --start-period=180s --retries=8 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8090/health')"

CMD ["uvicorn", "server:APP", "--host", "0.0.0.0", "--port", "8090", "--workers", "1"]
