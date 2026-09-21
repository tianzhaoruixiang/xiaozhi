ARG NODE_IMAGE=node:22-bookworm-slim
ARG NGINX_IMAGE=nginx:1.27-alpine

# 外网一次性：装齐 Vite/Vue 构建依赖，内网可打成 xiaozhi-web-builder:base
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
COPY package.json ./
COPY package-lock.json* ./
# 国内镜像偶发 ECONNRESET：限并发 + 重试，失败再回退官方源
ENV NODE_OPTIONS=--dns-result-order=ipv4first
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm config set fetch-timeout 300000 \
  && npm config set maxsockets 3 \
  && install_deps() { \
       if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; \
       else npm install --no-audit --no-fund; fi; \
     } \
  && npm config set registry https://registry.npmmirror.com \
  && { install_deps || { \
       echo "npmmirror failed, falling back to npmjs.org"; \
       npm config set registry https://registry.npmjs.org; \
       install_deps; \
     }; }
COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY src ./src
COPY public ./public
RUN npm run build

# 外网一次性：nginx 底包（不含业务 dist），打成 xiaozhi-web:base
FROM ${NGINX_IMAGE} AS runtime-base
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

# 完整构建：底包 + 本轮 dist
FROM runtime-base AS app
COPY --from=builder /app/dist /usr/share/nginx/html
