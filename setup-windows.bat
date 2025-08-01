@echo off
REM setup-windows.bat
REM Automatisches Setup und Check für Windows QR Scanner

title QR Scanner Pro - Windows Setup
color 0a

echo.
echo =====================================
echo   QR Scanner Pro - Windows Setup
echo =====================================
echo.

REM Administrator-Check
net session >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Administrator-Rechte vorhanden
) else (
    echo [WARNING] Keine Administrator-Rechte
    echo           Einige Features funktionieren moeglicherweise nicht
)
echo.

REM Node.js Check
echo Pruefe Node.js...
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Node.js ist installiert
    node --version
) else (
    echo [ERROR] Node.js ist nicht installiert
    echo         Bitte von https://nodejs.org herunterladen
    pause
    exit /b 1
)
echo.

REM NPM Dependencies Check
echo Pruefe NPM Dependencies...
if exist node_modules (
    echo [OK] node_modules Ordner vorhanden
) else (
    echo [INFO] Installiere Dependencies...
    npm install
    if %errorlevel% == 0 (
        echo [OK] Dependencies installiert
    ) else (
        echo [ERROR] Dependencies Installation fehlgeschlagen
        pause
        exit /b 1
    )
)
echo.

REM PowerShell Check
echo Pruefe PowerShell...
powershell -Command "Get-Host" >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] PowerShell verfuegbar
    
    REM Execution Policy Check
    for /f "tokens=*" %%i in ('powershell -Command "Get-ExecutionPolicy"') do set POLICY=%%i
    echo [INFO] Execution Policy: %POLICY%
    
    if "%POLICY%"=="Restricted" (
        echo [WARNING] PowerShell Execution Policy ist restriktiv
        echo           Moechten Sie die Policy aendern? ^(J/N^)
        choice /c JN /n /m ""
        if !errorlevel!==1 (
            echo [INFO] Aendere Execution Policy...
            powershell -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force"
            echo [OK] Execution Policy geaendert
        )
    ) else (
        echo [OK] PowerShell Execution Policy akzeptabel
    )
) else (
    echo [WARNING] PowerShell nicht verfuegbar
)
echo.

REM VBScript Check
echo Pruefe VBScript...
cscript //NoLogo //H:CScript >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] VBScript verfuegbar
) else (
    echo [WARNING] VBScript nicht verfuegbar
)
echo.

REM Windows Version
echo Pruefe Windows Version...
for /f "tokens=4-5 delims=. " %%i in ('ver') do set VERSION=%%i.%%j
echo [INFO] Windows Version: %VERSION%
echo.

REM Erstelle Desktop-Shortcut
echo Erstelle Desktop-Verknuepfung...
set DESKTOP=%USERPROFILE%\Desktop
set APPPATH=%CD%
echo @echo off > "%DESKTOP%\QR Scanner Pro.bat"
echo cd /d "%APPPATH%" >> "%DESKTOP%\QR Scanner Pro.bat"
echo npm start >> "%DESKTOP%\QR Scanner Pro.bat"
echo [OK] Desktop-Verknuepfung erstellt
echo.

REM Keyboard Test anbieten
echo Moechten Sie einen Keyboard-Test durchfuehren? ^(J/N^)
choice /c JN /n /m ""
if %errorlevel%==1 (
    echo [INFO] Fuehre Keyboard-Test durch...
    node test-windows-keyboard.js
    echo.
    echo Test abgeschlossen. Pruefen Sie die Ergebnisse oben.
    echo.
)

echo.
echo =====================================
echo          Setup abgeschlossen!
echo =====================================
echo.
echo Starten Sie die App mit: npm start
echo Oder verwenden Sie die Desktop-Verknuepfung
echo.
echo Troubleshooting: WINDOWS-TROUBLESHOOTING.md
echo.
pause
