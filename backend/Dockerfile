# 国内网络直连 Docker Hub 易超时，使用 DaoCloud 代理拉取官方镜像
ARG NODE_IMAGE=docker.m.daocloud.io/library/node:22-bookworm-slim

# build stage
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json ./
RUN npm config set registry https://registry.npmmirror.com \
  && npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# runtime
FROM ${NODE_IMAGE}
WORKDIR /app

# 使用国内 Debian 镜像，避免 deb.debian.org 超时
RUN sed -i 's|deb.debian.org|mirrors.aliyun.com|g; s|security.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources 2>/dev/null \
  || sed -i 's|deb.debian.org|mirrors.aliyun.com|g; s|security.debian.org|mirrors.aliyun.com|g' /etc/apt/sources.list \
  && apt-get update \
  && apt-get install -y --no-install-recommends git bash ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 10001 -s /bin/bash appuser

COPY package.json ./
RUN npm config set registry https://registry.npmmirror.com \
  && npm install --omit=dev

COPY --from=build /app/dist ./dist

RUN mkdir -p /data /home/appuser/.claude \
  && chown -R appuser:appuser /app /data /home/appuser

USER appuser
ENV HOME=/home/appuser
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
