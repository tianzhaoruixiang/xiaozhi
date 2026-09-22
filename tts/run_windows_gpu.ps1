# 本机 sherpa-onnx：TTS = Kokoro int8 中英，ASR = SenseVoice int8。
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Repo = Split-Path -Parent $Root
$Venv = Join-Path $Root ".venv"

function Find-Python {
  $candidates = @(
    "$env:LocalAppData\Programs\Python\Python312\python.exe",
    "$env:LocalAppData\Programs\Python\Python311\python.exe",
    "C:\Python312\python.exe",
    "C:\Python311\python.exe"
  )
  foreach ($c in $candidates) {
    if (Test-Path $c) { return $c }
  }
  $cmd = Get-Command python.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}

$Py = Find-Python
if (-not $Py) {
  Write-Host "Python 3.11/3.12 not found, installing Python 3.12 via winget ..."
  winget install -e --id Python.Python.3.12 --accept-package-agreements --accept-source-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
  $Py = Find-Python
}
if (-not $Py) {
  throw "Install Python 3.12 first, then rerun this script."
}

Write-Host "Using $Py"
if (-not (Test-Path (Join-Path $Venv "Scripts\python.exe"))) {
  & $Py -m venv $Venv
}
$VenvPy = Join-Path $Venv "Scripts\python.exe"
& $VenvPy -m pip install -U pip wheel
& $VenvPy -m pip install -r (Join-Path $Root "requirements.txt")

$env:TTS_MODEL_DIR = Join-Path $Repo "data\models\vits-melo-tts-zh_en"
$env:ASR_MODEL_DIR = Join-Path $Repo "data\models\sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17"
if (-not $env:ASR_NUM_THREADS) { $env:ASR_NUM_THREADS = "6" }
if (-not $env:TTS_NUM_THREADS) { $env:TTS_NUM_THREADS = "4" }
if (-not $env:ASR_PROVIDER) { $env:ASR_PROVIDER = "cpu" }
if (-not $env:TTS_PROVIDER) { $env:TTS_PROVIDER = "cpu" }
if (-not $env:TTS_SPEAKER_ID) { $env:TTS_SPEAKER_ID = "1" }
$env:PYTHONPATH = $Root

Write-Host "Downloading TTS / ASR models if missing ..."
& $VenvPy (Join-Path $Root "download_model.py") (Join-Path $Repo "data\models")
$AsrSh = Join-Path $Root "download_asr_model.sh"
if (Get-Command bash -ErrorAction SilentlyContinue) {
  bash $AsrSh (Join-Path $Repo "data\models")
}

Set-Location $Root
Write-Host "Starting TTS/ASR http://127.0.0.1:8090 (vits-melo-tts-zh_en)"
& $VenvPy -m uvicorn server:APP --host 0.0.0.0 --port 8090 --workers 1
