# 本机 AMD GPU（Radeon 8060S / WSL2 dxg）用 vLLM-Omni 跑 Qwen3-TTS CustomVoice 女声。
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Repo = Split-Path -Parent $Root
Set-Location $Repo

New-Item -ItemType Directory -Force -Path (Join-Path $Repo "data\models\hf-home") | Out-Null

if (-not $env:TTS_MODEL) { $env:TTS_MODEL = "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice" }
if (-not $env:HF_ENDPOINT) { $env:HF_ENDPOINT = "https://hf-mirror.com" }
if (-not $env:VLLM_OMNI_PORT) { $env:VLLM_OMNI_PORT = "8091" }

$mirrors = @(
  "docker.m.daocloud.io/vllm/vllm-omni-rocm:v0.28.0",
  "docker.1ms.run/vllm/vllm-omni-rocm:v0.28.0"
)
$canonical = "vllm/vllm-omni-rocm:v0.28.0"
$pulled = $false
foreach ($img in $mirrors) {
  Write-Host "Pulling $img ..."
  docker pull $img
  if ($LASTEXITCODE -eq 0) {
    docker tag $img $canonical
    if (-not $env:VLLM_OMNI_IMAGE) { $env:VLLM_OMNI_IMAGE = $img }
    $pulled = $true
    break
  }
}
if (-not $pulled) { throw "国内镜像源拉取失败，请检查网络后重试。" }

Write-Host "Starting vLLM-Omni Qwen3-TTS on GPU: $($env:TTS_MODEL)"
docker compose --profile vllm-omni up -d vllm-omni
docker compose --profile vllm-omni logs -f --tail 80 vllm-omni
