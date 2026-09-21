# 直连 Docker Hub；国内若超时可覆盖 NODE_IMAGE
ARG NODE_IMAGE=node:22-bookworm-slim

# 外网一次性：含 TypeScript 的构建依赖，内网可打成 xiaozhi-api-builder:base
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
COPY package.json ./
RUN npm config set registry https://registry.npmmirror.com \
  && npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# 外网一次性：生产 node_modules + 系统依赖，打成 xiaozhi-api:base
FROM ${NODE_IMAGE} AS runtime-base
WORKDIR /app
ENV NODE_OPTIONS=--dns-result-order=ipv4first

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
  apt-get install -y --no-install-recommends git bash ca-certificates; \
  rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 10001 -s /bin/bash appuser

COPY package.json ./
# 生产层不再二次拉包（npmmirror/npmjs 易 ECONNRESET），复用 builder 已装好的依赖
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev

RUN mkdir -p /data /home/appuser/.claude /app/dist \
  && chown -R appuser:appuser /app /data /home/appuser

USER appuser
ENV HOME=/home/appuser
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]

# 完整构建：底包 + 本轮 dist
FROM runtime-base AS app
USER root
COPY --from=builder /app/dist ./dist
RUN chown -R appuser:appuser /app/dist
USER appuser
