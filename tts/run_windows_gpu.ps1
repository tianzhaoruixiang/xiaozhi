# Higgs Audio V2 on AMD Radeon 8060S (gfx1151) via Windows ROCm PyTorch.
# Docker Desktop cannot pass this iGPU into Linux containers (no NVIDIA runtime / no /dev/kfd).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Repo = Split-Path -Parent $Root
$Venv = Join-Path $Root ".venv"
$Py = $null

function Find-Python {
  $cmds = @(
    @{ File = "python.exe"; Args = @("-c", "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')") }
  )
  $candidates = @(
    "$env:LocalAppData\Programs\Python\Python312\python.exe",
    "$env:LocalAppData\Programs\Python\Python311\python.exe",
    "C:\Python312\python.exe",
    "C:\Python311\python.exe"
  )
  foreach ($c in $candidates) {
    if (Test-Path $c) { return $c }
  }
  return $null
}

$Py = Find-Python
if (-not $Py) {
  Write-Host "未找到 Python 3.11/3.12，正在用 winget 安装 Python 3.12 ..."
  winget install -e --id Python.Python.3.12 --accept-package-agreements --accept-source-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
  $Py = Find-Python
}
if (-not $Py) {
  throw "请先安装 Python 3.12（AMD ROCm 轮子需要 3.11/3.12），然后重新运行本脚本。"
}

Write-Host "使用 $Py"
if (-not (Test-Path (Join-Path $Venv "Scripts\python.exe"))) {
  & $Py -m venv $Venv
}
$VenvPy = Join-Path $Venv "Scripts\python.exe"
& $VenvPy -m pip install -U pip wheel

Write-Host "安装 AMD gfx1151 ROCm PyTorch ..."
& $VenvPy -m pip install --index-url https://repo.amd.com/rocm/whl-multi-arch/ `
  "torch[device-gfx1151]==2.12.0+rocm7.14.0" `
  "torchaudio==2.11.0+rocm7.14.0"

& $VenvPy -m pip install -r (Join-Path $Root "requirements.txt")

$Higgs = Join-Path $Root ".deps\higgs-audio"
if (-not (Test-Path (Join-Path $Higgs "setup.py"))) {
  New-Item -ItemType Directory -Force -Path (Join-Path $Root ".deps") | Out-Null
  $cloned = $false
  foreach ($prefix in @(
      "https://ghfast.top/https://github.com/boson-ai/higgs-audio.git",
      "https://github.com/boson-ai/higgs-audio.git"
    )) {
    git clone --depth 1 $prefix $Higgs
    if ($LASTEXITCODE -eq 0) { $cloned = $true; break }
    if (Test-Path $Higgs) { Remove-Item -Recurse -Force $Higgs }
  }
  if (-not $cloned) { throw "克隆 higgs-audio 失败" }
}
& $VenvPy -m pip install --no-deps -e $Higgs

$env:HF_ENDPOINT = $(if ($env:HF_ENDPOINT) { $env:HF_ENDPOINT } else { "https://hf-mirror.com" })
$env:TTS_MODEL_DIR = Join-Path $Repo "data\models\HiggsAudio-V2\generation-3B-base"
$env:TTS_TOKENIZER_DIR = Join-Path $Repo "data\models\HiggsAudio-V2\tokenizer"
$env:ASR_MODEL_DIR = Join-Path $Repo "data\models\sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17"
if (-not $env:ASR_NUM_THREADS) { $env:ASR_NUM_THREADS = "6" }
if (-not $env:ASR_PROVIDER) { $env:ASR_PROVIDER = "cpu" }
$env:TTS_DEVICE = "auto"
$env:TTS_VOICE_PROMPT = "feminine, young Chinese woman, clear Mandarin"
$env:PYTHONPATH = $Root

Write-Host "下载权重（若已存在会跳过）..."
& $VenvPy (Join-Path $Root "download_model.py") (Join-Path $Repo "data\models")

Write-Host "检测 GPU ..."
& $VenvPy -c "import torch; print('cuda', torch.cuda.is_available(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else '')"

Set-Location $Root
Write-Host "启动 TTS http://127.0.0.1:8090 （Higgs Audio V2 / 中文女声 / GPU）"
& $VenvPy -m uvicorn server:APP --host 0.0.0.0 --port 8090 --workers 1
