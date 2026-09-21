# 外网执行一次：打出前后端底包与构建镜像，再 docker save 进内网。
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

docker build --target runtime-base -t xiaozhi-web:base ./frontend
docker build --target builder -t xiaozhi-web-builder:base ./frontend
docker build --target app -t xiaozhi-web:local ./frontend

docker build --target runtime-base -t xiaozhi-api:base ./backend
docker build --target builder -t xiaozhi-api-builder:base ./backend
docker build --target app -t xiaozhi-api:local ./backend

Write-Host "已生成："
Write-Host "  xiaozhi-web:base / xiaozhi-web-builder:base / xiaozhi-web:local"
Write-Host "  xiaozhi-api:base / xiaozhi-api-builder:base / xiaozhi-api:local"
Write-Host "导出示例：docker save xiaozhi-web:base xiaozhi-web-builder:base xiaozhi-api:base xiaozhi-api-builder:base xiaozhi-web:local xiaozhi-api:local -o xiaozhi-web-api-images.tar"
