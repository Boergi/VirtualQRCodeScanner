@echo off
REM test-keyboard.bat
REM Simple Windows Keyboard Test

echo === Windows Keyboard Test ===
echo.

echo 1. Teste VBScript...
echo Set objShell = CreateObject("WScript.Shell") > temp_test.vbs
echo objShell.SendKeys "VBScript funktioniert!" >> temp_test.vbs
echo.
echo HINWEIS: VBScript-Datei erstellt (temp_test.vbs)
echo Zum Testen manuell ausführen: cscript //NoLogo temp_test.vbs
echo.

echo 2. Teste PowerShell Verfügbarkeit...
powershell -Command "Write-Host 'PowerShell ist verfügbar'" 2>nul
if %errorlevel% neq 0 (
    echo PowerShell nicht verfügbar oder deaktiviert
) else (
    echo PowerShell ist verfügbar
)
echo.

echo 3. Teste Execution Policy...
powershell -Command "Get-ExecutionPolicy" 2>nul
echo.

echo 4. Windows Version...
ver
echo.

echo 5. Administrator Check...
net session >nul 2>&1
if %errorlevel% == 0 (
    echo Administrator-Rechte: JA
) else (
    echo Administrator-Rechte: NEIN
)
echo.

echo === Test abgeschlossen ===
echo.
echo WICHTIG: temp_test.vbs wurde erstellt aber NICHT ausgeführt
echo Zum manuellen Testen in einem Texteditor ausführen: cscript //NoLogo temp_test.vbs
echo.
pause
