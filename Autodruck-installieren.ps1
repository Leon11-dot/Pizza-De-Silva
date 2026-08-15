
$taskName = "Pizza De Silva Autodruck"
$scriptPath = Join-Path $PSScriptRoot "PizzaDeSilva-Autodruck.ps1"

Write-Host "Installiere Autodruck..."

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

try {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
} catch {}

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Automatischer Druck angenommener Pizza-De-Silva-Bestellungen" | Out-Null

Write-Host "Fertig. Der Autodruck startet künftig beim Windows-Login."
Write-Host "WICHTIG: Im Druckskript muss noch der Supabase Admin/Service Key eingesetzt werden."
Pause
