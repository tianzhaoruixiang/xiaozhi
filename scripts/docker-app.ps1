# 内网改代码后：编 dist，叠进已有底包，不访问 npm/apt。
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

function Test-Image([string]$Name) {
  docker image inspect $Name 1>$null 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw "缺少镜像 $Name"
  }
}

Test-Image 'xiaozhi-web:base'
Test-Image 'xiaozhi-api:base'

$built = $false
if (Get-Command npm -ErrorAction SilentlyContinue) {
  npm run build
  $built = $LASTEXITCODE -eq 0
}

if (-not $built) {
  Test-Image 'xiaozhi-web-builder:base'
  Test-Image 'xiaozhi-api-builder:base'
  New-Item -ItemType Directory -Force -Path ./frontend/dist, ./backend/dist | Out-Null
  docker run --rm `
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
  docker run --rm `
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

docker compose -f docker-compose.yml -f docker-compose.offline.yml build api web
Write-Host "叠包完成：xiaozhi-web:local / xiaozhi-api:local"
Write-Host "启动：docker compose up -d web api"
