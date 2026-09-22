# sherpa-onnx：TTS = Kokoro int8，ASR = SenseVoice。权重挂载 /data/models，不打进镜像。
ARG PYTHON_IMAGE=python:3.11-slim-bookworm

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
  pkgs="ca-certificates curl libsndfile1 libgomp1 bzip2"; \
  n=0; \
  until apt-get install -y --no-install-recommends --fix-missing -o Acquire::Retries=8 $pkgs; do \
    n=$((n+1)); \
    [ "$n" -lt 6 ]; \
    sleep 3; \
    apt-get update || true; \
  done; \
  rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN set -eux; \
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

COPY download_model.sh download_asr_model.sh download_model.py ./
RUN sed -i 's/\r$//' ./download_model.sh ./download_asr_model.sh \
  && chmod +x ./download_model.sh ./download_asr_model.sh

COPY server.py asr.py engine.py ./

ENV TTS_MODEL_DIR=/data/models/kokoro-int8-multi-lang-v1_1 \
    ASR_MODEL_DIR=/data/models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17 \
    TTS_PROVIDER=cpu \
    TTS_SPEAKER_ID=3 \
    TTS_SPEED=1.0 \
    PORT=8090

EXPOSE 8090
HEALTHCHECK --interval=20s --timeout=8s --start-period=60s --retries=12 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8090/health')"

CMD ["uvicorn", "server:APP", "--host", "0.0.0.0", "--port", "8090", "--workers", "1"]
