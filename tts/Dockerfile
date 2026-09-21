# 默认 python 3.11 slim（本机已缓存）。CUDA 版 torch 从阿里云 wheel 安装。
ARG PYTHON_IMAGE=python:3.11-slim-bookworm
ARG TORCH_WHEEL=https://mirrors.aliyun.com/pytorch-wheels/cu124/torch-2.5.1%2Bcu124-cp311-cp311-linux_x86_64.whl
ARG TORCHAUDIO_WHEEL=https://mirrors.aliyun.com/pytorch-wheels/cu124/torchaudio-2.5.1%2Bcu124-cp311-cp311-linux_x86_64.whl

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
ARG TORCH_WHEEL=https://mirrors.aliyun.com/pytorch-wheels/cu124/torch-2.5.1%2Bcu124-cp311-cp311-linux_x86_64.whl
ARG TORCHAUDIO_WHEEL=https://mirrors.aliyun.com/pytorch-wheels/cu124/torchaudio-2.5.1%2Bcu124-cp311-cp311-linux_x86_64.whl

RUN set +e; \
  set -x; \
  fetch_whl() { \
    url="$1"; dest="$2"; \
    i=0; \
    while [ "$i" -lt 8 ]; do \
      curl -fL --retry 20 --retry-all-errors --retry-delay 3 -C - --connect-timeout 30 -o "$dest" "$url"; \
      cr=$?; \
      python -c "import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); raise SystemExit(1 if z.testzip() else 0)" "$dest"; \
      pr=$?; \
      if [ "$cr" -eq 0 ] && [ "$pr" -eq 0 ]; then return 0; fi; \
      i=$((i+1)); \
      rm -f "$dest"; \
      sleep 3; \
    done; \
    return 1; \
  }; \
  if ls /opt/wheels/*.whl >/dev/null 2>&1; then \
    python -c "import glob,zipfile,sys; \
ps=glob.glob('/opt/wheels/*.whl'); \
assert ps, 'no wheels'; \
[zipfile.ZipFile(p).testzip() or True for p in ps]" \
      && pip install --no-cache-dir /opt/wheels/*.whl; \
    inst=$?; \
  else \
    inst=1; \
  fi; \
  if [ "$inst" -ne 0 ]; then \
    fetch_whl "${TORCH_WHEEL}" /tmp/torch.whl || exit 1; \
    fetch_whl "${TORCHAUDIO_WHEEL}" /tmp/torchaudio.whl || exit 1; \
    pip install --no-cache-dir /tmp/torch.whl /tmp/torchaudio.whl || exit 1; \
    rm -f /tmp/torch.whl /tmp/torchaudio.whl; \
  fi; \
  set -e; \
  pip_req() { \
    pip install --no-cache-dir --timeout 300 --retries 15 \
      --trusted-host mirrors.aliyun.com \
      --trusted-host pypi.tuna.tsinghua.edu.cn \
      --trusted-host pypi.org \
      "$@"; \
  }; \
  pip_req -i https://mirrors.aliyun.com/pypi/simple/ -r requirements.txt \
    || pip_req -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt \
    || pip_req -i https://pypi.org/simple -r requirements.txt

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
