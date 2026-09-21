# 直连 Docker Hub；国内若超时可覆盖：
#   docker compose build --build-arg PYTHON_IMAGE=<mirror>/library/python:3.11-slim-bookworm
ARG PYTHON_IMAGE=python:3.11-slim-bookworm

FROM ${PYTHON_IMAGE}

WORKDIR /app

# 国内 apt，构建期可联网；运行期模型从 /data/models 挂载，完全离线
RUN sed -i 's|deb.debian.org|mirrors.aliyun.com|g; s|security.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null \
  || sed -i 's|deb.debian.org|mirrors.aliyun.com|g; s|security.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates bzip2 \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -i https://mirrors.aliyun.com/pypi/simple/ -r requirements.txt

COPY download_model.sh download_asr_model.sh ./
RUN sed -i 's/\r$//' ./download_model.sh ./download_asr_model.sh \
  && chmod +x ./download_model.sh ./download_asr_model.sh

COPY server.py asr.py ./

# 模型不进镜像，运行时挂载项目 data/ → /data
ENV TTS_MODEL_DIR=/data/models/vits-melo-tts-zh_en \
    ASR_MODEL_DIR=/data/models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17 \
    TTS_NUM_THREADS=4 \
    TTS_SPEED=0.92 \
    TTS_PAUSE_SEC=0.32 \
    PORT=8090

EXPOSE 8090
HEALTHCHECK --interval=20s --timeout=5s --start-period=40s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8090/health')"

CMD ["uvicorn", "server:APP", "--host", "0.0.0.0", "--port", "8090", "--workers", "1"]
