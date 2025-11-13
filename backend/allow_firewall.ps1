<#
Add a temporary Windows Firewall rule to allow inbound TCP 8000 (for testing only).

Usage (run as Administrator):
  .\allow_firewall.ps1 -Action Add
  .\allow_firewall.ps1 -Action Remove

Examples:
  # Add rule
  .\allow_firewall.ps1 -Action Add

  # Remove rule
  .\allow_firewall.ps1 -Action Remove
#>

param(
    [ValidateSet('Add','Remove')]
    [string]$Action = 'Add'
)

$ruleName = 'Allow Uvicorn 8000'

if ($Action -eq 'Add') {
    Write-Host "Adding firewall rule '$ruleName' (TCP 8000) ..." -ForegroundColor Yellow
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow -Profile Private -ErrorAction Stop
    Write-Host "Rule added." -ForegroundColor Green
} else {
    Write-Host "Removing firewall rule '$ruleName' ..." -ForegroundColor Yellow
    Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    Write-Host "Rule removed (if it existed)." -ForegroundColor Green
}
