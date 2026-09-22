# 内网改代码后：编 dist，叠进已有底包，构建过程不访问网络。
param(
  [switch]$Save
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

function Test-Image([string]$Name) {
  $id = docker images -q $Name
  return -not [string]::IsNullOrWhiteSpace($id)
}

function Resolve-Base([string]$Preferred, [string]$Fallback) {
  if (Test-Image $Preferred) { return $Preferred }
  if (Test-Image $Fallback) {
    Write-Host "未找到 $Preferred，改用已有 $Fallback"
    return $Fallback
  }
  throw "缺少底包 $Preferred 或 $Fallback。请先在外网执行 scripts/docker-base.ps1，再 docker load。"
}

$webBase = Resolve-Base 'xiaozhi-web:base' 'xiaozhi-web:local'
$apiBase = Resolve-Base 'xiaozhi-api:base' 'xiaozhi-api:local'

$built = $false
$hostReady = (Get-Command npm -ErrorAction SilentlyContinue) `
  -and (Test-Path ./node_modules) `
  -and (Test-Path ./frontend/node_modules) `
  -and (Test-Path ./backend/node_modules)

if ($hostReady) {
  Write-Host "宿主机离线编译 dist (npm --offline)"
  $env:npm_config_offline = 'true'
  $env:npm_config_audit = 'false'
  $env:npm_config_fund = 'false'
  npm run build
  $built = $LASTEXITCODE -eq 0
  Remove-Item Env:npm_config_offline -ErrorAction SilentlyContinue
  if (-not $built) {
    Write-Host "宿主机离线编译失败，改用 builder 镜像"
  }
}

if (-not $built) {
  if (-not (Test-Image 'xiaozhi-web-builder:base')) {
    throw '无法离线编译前端：宿主机缺 node_modules，且没有 xiaozhi-web-builder:base'
  }
  if (-not (Test-Image 'xiaozhi-api-builder:base')) {
    throw '无法离线编译后端：宿主机缺 node_modules，且没有 xiaozhi-api-builder:base'
  }
  New-Item -ItemType Directory -Force -Path ./frontend/dist, ./backend/dist | Out-Null
  docker run --rm --network none `
    -v "${PWD}/frontend/src:/src/src:ro" `
    -v "${PWD}/frontend/public:/src/public:ro" `
    -v "${PWD}/frontend/index.html:/src/index.html:ro" `
    -v "${PWD}/frontend/vite.config.ts:/src/vite.config.ts:ro" `
    -v "${PWD}/frontend/tsconfig.json:/src/tsconfig.json:ro" `
    -v "${PWD}/frontend/tsconfig.app.json:/src/tsconfig.app.json:ro" `
    -v "${PWD}/frontend/tsconfig.node.json:/src/tsconfig.node.json:ro" `
    -v "${PWD}/frontend/package.json:/src/package.json:ro" `
    -v "${PWD}/frontend/dist:/out" `
    xiaozhi-web-builder:base `
    sh -c "set -e; rm -rf /tmp/app; cp -a /app /tmp/app; cp -a /src/. /tmp/app/; cd /tmp/app; npm run build; rm -rf /out/*; cp -a dist/. /out/"
  docker run --rm --network none `
    -v "${PWD}/backend/src:/src/src:ro" `
    -v "${PWD}/backend/tsconfig.json:/src/tsconfig.json:ro" `
    -v "${PWD}/backend/package.json:/src/package.json:ro" `
    -v "${PWD}/backend/dist:/out" `
    xiaozhi-api-builder:base `
    sh -c "set -e; rm -rf /tmp/app; cp -a /app /tmp/app; cp -a /src/. /tmp/app/; cd /tmp/app; npm run build; rm -rf /out/*; cp -a dist/. /out/"
}

if (-not (Test-Path ./frontend/dist/index.html)) {
  throw 'frontend/dist 未生成'
}
if (-not (Test-Path ./backend/dist/index.js)) {
  throw 'backend/dist 未生成'
}

$env:WEB_BASE_IMAGE = $webBase
$env:API_BASE_IMAGE = $apiBase
Write-Host "无网络叠包：web=$webBase api=$apiBase"
docker compose -f docker-compose.yml -f docker-compose.offline.yml build api web
if ($LASTEXITCODE -ne 0) {
  throw '离线叠包失败'
}

Write-Host "叠包完成：xiaozhi-web:local / xiaozhi-api:local"
Write-Host "启动：docker compose up -d web api"

if ($Save) {
  $out = Join-Path $PWD 'data/docker-images'
  New-Item -ItemType Directory -Force -Path $out | Out-Null
  docker save xiaozhi-api:local -o (Join-Path $out 'xiaozhi-api-local.tar')
  docker save xiaozhi-web:local -o (Join-Path $out 'xiaozhi-web-local.tar')
  Write-Host "已导出 $out\xiaozhi-api-local.tar / xiaozhi-web-local.tar"
}
