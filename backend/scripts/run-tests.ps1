# Run tests helper for Windows PowerShell
# Usage: .\scripts\run-tests.ps1  OR  powershell -ExecutionPolicy RemoteSigned -File .\backend\scripts\run-tests.ps1

param(
    [switch]$ReinstallRequirements  # força reinstalação das dependências
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$venvPath = Join-Path $repoRoot '.venv'
$activateScript = Join-Path $venvPath 'Scripts\Activate.ps1'

Write-Host "Repo root: $repoRoot"

if (-not (Test-Path $venvPath)) {
    Write-Host "Criando virtualenv em $venvPath..."
    py -3 -m venv $venvPath
}

# Permitir execução temporária de scripts
try {
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -ErrorAction SilentlyContinue
} catch {
    Write-Warning "Falha ao ajustar ExecutionPolicy: $($_.Exception.Message)"
}

# Ativa o virtualenv
if (-Not (Test-Path $activateScript)) {
    Write-Error "Arquivo de ativação não encontrado: $activateScript"
    exit 2
}

Write-Host "Ativando virtualenv..."
. $activateScript

# Atualiza pip
Write-Host "Atualizando pip..."
python -m pip install -U pip

# Instala requirements se necessário
$reqFile = Join-Path (Join-Path $repoRoot 'backend') 'requirements.txt'
if (-not (Test-Path $reqFile)) {
    Write-Warning "requirements.txt não encontrado em $repoRoot. Pulando instalação de dependências."
} else {
    if ($ReinstallRequirements) {
        Write-Host "Reinstalando dependências (forçado)..."
        python -m pip install -r $reqFile
    } else {
        Write-Host "Instalando dependências (se necessário)..."
        python -m pip install -r $reqFile
    }
}

# Rodar pytest (executa a partir de backend/)
Push-Location (Join-Path $repoRoot 'backend')
try {
    Write-Host "Executando testes (pytest)..."
    $env:PYTHONPATH = $repoRoot
    python -m pytest tests -q
    $rc = $LASTEXITCODE
} finally {
    Pop-Location
}

exit $rc
