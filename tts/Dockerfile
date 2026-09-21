# Higgs Audio V2（中文女声）+ sherpa-onnx ASR。
# 默认不编译 CUDA：NVIDIA 传 --build-arg TORCH_BACKEND=cu124。
# 本机 AMD 8060S 请用 Windows 宿主机 ROCm：powershell -File tts/run_windows_gpu.ps1
ARG PYTHON_IMAGE=python:3.11-slim-bookworm
ARG TORCH_BACKEND=cpu

FROM ${PYTHON_IMAGE}

WORKDIR /app

RUN set -eux; \
  unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy || true; \
  printf '%s\n' \
    'Acquire::ForceIPv4 "true";' \
    'Acquire::Retries "8";' \
    'Acquire::http::Timeout "60";' \
    'Acquire::http::Pipeline-Depth "0";' \
    'Acquire::http::Proxy "false";' \
    'Acquire::https::Proxy "false";' \
    > /etc/apt/apt.conf.d/99build; \
  rewrite() { \
    host="$1"; \
    for f in /etc/apt/sources.list \
             /etc/apt/sources.list.d/*.list \
             /etc/apt/sources.list.d/*.sources \
             /etc/apt/mirrors/*.list; do \
      [ -f "$f" ] || continue; \
      sed -i \
        -e "s|https\\?://[^/]*/debian-security|http://${host}/debian-security|g" \
        -e "s|https\\?://[^/]*/debian|http://${host}/debian|g" \
        "$f"; \
    done; \
  }; \
  ok=0; \
  for host in mirrors.tuna.tsinghua.edu.cn mirrors.ustc.edu.cn mirrors.cloud.tencent.com mirrors.aliyun.com; do \
    rewrite "$host"; \
    if apt-get update; then ok=1; break; fi; \
  done; \
  [ "$ok" = 1 ]; \
  pkgs="git ca-certificates curl ffmpeg libsndfile1 libgomp1"; \
  n=0; \
  until apt-get install -y --no-install-recommends --fix-missing -o Acquire::Retries=8 $pkgs; do \
    n=$((n+1)); \
    [ "$n" -lt 6 ]; \
    sleep 3; \
    apt-get update || true; \
  done; \
  rm -rf /var/lib/apt/lists/*

ARG TORCH_BACKEND
COPY requirements.txt ./
RUN set -eux; \
  pip_req() { \
    pip install --no-cache-dir --timeout 300 --retries 15 \
      --trusted-host mirrors.aliyun.com \
      --trusted-host pypi.tuna.tsinghua.edu.cn \
      --trusted-host pypi.org \
      --trusted-host download.pytorch.org \
      "$@"; \
  }; \
  if [ "$TORCH_BACKEND" = "cu124" ]; then \
    pip_req torch torchaudio --index-url https://download.pytorch.org/whl/cu124; \
  else \
    pip_req torch torchaudio --index-url https://download.pytorch.org/whl/cpu; \
  fi; \
  pip_req -i https://mirrors.aliyun.com/pypi/simple/ -r requirements.txt \
    || pip_req -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt \
    || pip_req -i https://pypi.org/simple -r requirements.txt

ARG HIGGS_AUDIO_REPO=https://github.com/boson-ai/higgs-audio.git
RUN set -eux; \
  unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY all_proxy || true; \
  git config --global http.version HTTP/1.1; \
  cloned=0; \
  for gh in \
    "https://ghfast.top/https://github.com/" \
    "https://kkgithub.com/" \
    "https://gitclone.com/github.com/" \
    "https://github.com/"; do \
    rm -f /root/.gitconfig; \
    git config --global http.version HTTP/1.1; \
    git config --global url."${gh}".insteadOf "https://github.com/"; \
    rm -rf /opt/higgs-audio; \
    if git clone --depth 1 "${HIGGS_AUDIO_REPO}" /opt/higgs-audio; then \
      cloned=1; \
      break; \
    fi; \
  done; \
  [ "$cloned" = 1 ]; \
  pip install --no-cache-dir --no-deps -e /opt/higgs-audio

COPY download_model.sh download_asr_model.sh download_model.py ./
RUN sed -i 's/\r$//' ./download_model.sh ./download_asr_model.sh \
  && chmod +x ./download_model.sh ./download_asr_model.sh

COPY server.py asr.py engine.py ./

ENV TTS_MODEL_DIR=/data/models/HiggsAudio-V2/generation-3B-base \
    TTS_TOKENIZER_DIR=/data/models/HiggsAudio-V2/tokenizer \
    ASR_MODEL_DIR=/data/models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17 \
    TTS_DEVICE=auto \
    TTS_SPEED=1.0 \
    TTS_VOICE_PROMPT="feminine, young Chinese woman, clear Mandarin" \
    TTS_TEMPERATURE=0.3 \
    HF_ENDPOINT=https://hf-mirror.com \
    PORT=8090

EXPOSE 8090
HEALTHCHECK --interval=20s --timeout=8s --start-period=180s --retries=12 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8090/health')"

CMD ["uvicorn", "server:APP", "--host", "0.0.0.0", "--port", "8090", "--workers", "1"]
