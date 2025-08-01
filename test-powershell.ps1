# test-powershell.ps1
# PowerShell Test Script für Tastatur-Funktionalität

Write-Host "=== PowerShell Tastatur Test ===" -ForegroundColor Green
Write-Host "PowerShell Version: $($PSVersionTable.PSVersion)" -ForegroundColor Yellow
Write-Host "Execution Policy: $(Get-ExecutionPolicy)" -ForegroundColor Yellow
Write-Host "Administrator: $([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] 'Administrator')" -ForegroundColor Yellow

# Test 1: Basic Windows Forms Assembly Loading
Write-Host "`n1. Teste Windows Forms Assembly..." -ForegroundColor Cyan
try {
    Add-Type -AssemblyName System.Windows.Forms
    Write-Host "✅ System.Windows.Forms Assembly geladen" -ForegroundColor Green
} catch {
    Write-Host "❌ Assembly Loading fehlgeschlagen: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: SendKeys Class Test
Write-Host "`n2. Teste SendKeys Klasse..." -ForegroundColor Cyan
try {
    $sendKeysType = [System.Windows.Forms.SendKeys]
    Write-Host "✅ SendKeys Klasse verfügbar" -ForegroundColor Green
} catch {
    Write-Host "❌ SendKeys Klasse nicht verfügbar: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Simulation (NICHT AUSFÜHREN - nur Syntax-Check)
Write-Host "`n3. Syntax-Check für SendKeys..." -ForegroundColor Cyan
try {
    $testCommand = '[System.Windows.Forms.SendKeys]::SendWait("TEST")'
    $scriptBlock = [ScriptBlock]::Create($testCommand)
    Write-Host "✅ SendKeys Syntax korrekt" -ForegroundColor Green
    Write-Host "HINWEIS: Befehl NICHT ausgeführt um ungewollte Eingaben zu vermeiden" -ForegroundColor Yellow
} catch {
    Write-Host "❌ SendKeys Syntax fehlerhaft: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Environment Information
Write-Host "`n4. Umgebungsinformationen..." -ForegroundColor Cyan
Write-Host "OS Version: $([System.Environment]::OSVersion.Version)" -ForegroundColor White
Write-Host ".NET Version: $([System.Environment]::Version)" -ForegroundColor White
Write-Host "Machine Name: $([System.Environment]::MachineName)" -ForegroundColor White
Write-Host "User: $([System.Environment]::UserName)" -ForegroundColor White

# Test 5: Security Context
Write-Host "`n5. Sicherheitskontext..." -ForegroundColor Cyan
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal] $identity
Write-Host "User Identity: $($identity.Name)" -ForegroundColor White
Write-Host "Authentication Type: $($identity.AuthenticationType)" -ForegroundColor White
Write-Host "Is System: $($identity.IsSystem)" -ForegroundColor White

Write-Host "`n=== Test abgeschlossen ===" -ForegroundColor Green
Write-Host "Falls alle Tests erfolgreich waren, sollte die Tastatur-Eingabe funktionieren." -ForegroundColor Yellow
