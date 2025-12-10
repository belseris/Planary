<#
Run backend FastAPI server in foreground for debugging.

Usage:
  Open PowerShell in this folder and run:
    .\run_backend.ps1

This script starts uvicorn on 0.0.0.0:8000 so devices on the LAN can reach it.
#>

Write-Host "Starting backend (uvicorn) on 0.0.0.0:8000..." -ForegroundColor Cyan

# Change to backend directory
Set-Location $PSScriptRoot

# Ensure using the workspace python - if you use venv, activate it before running this script
$python = "python"

# Run uvicorn in the current console so logs are visible
& $python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
