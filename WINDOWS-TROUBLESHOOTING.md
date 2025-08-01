# Windows Keyboard Troubleshooting Guide

## Problemübersicht
Falls die Tastatur-Eingabe auf Windows nicht funktioniert, kann es verschiedene Ursachen haben. Diese Anleitung hilft bei der Diagnose und Lösung.

## Schnell-Diagnose

### 1. Test-Scripts ausführen
```bash
# In der App-Konsole oder CMD:
node test-windows-keyboard.js

# Oder PowerShell-Test:
powershell -ExecutionPolicy Bypass -File test-powershell.ps1

# Oder Batch-Test:
test-keyboard.bat
```

### 2. Häufige Probleme und Lösungen

#### Problem: PowerShell Execution Policy
**Symptom:** `Execution of scripts is disabled on this system`

**Lösung:**
```powershell
# Als Administrator:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine

# Oder nur für aktuellen User:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Prüfen:
Get-ExecutionPolicy
```

#### Problem: Antivirus/Windows Defender blockiert
**Symptom:** SendKeys funktioniert nicht oder wird blockiert

**Lösung:**
1. Windows Defender Echtzeitschutz temporär deaktivieren
2. App-Ordner zu Ausnahmen hinzufügen
3. PowerShell.exe zu Ausnahmen hinzufügen

#### Problem: UAC (User Account Control)
**Symptom:** Tastatur-Eingabe funktioniert nur bei eigenen Fenstern

**Lösung:**
1. App als Administrator ausführen
2. UAC-Level reduzieren (nicht empfohlen)
3. App digital signieren

#### Problem: VBScript deaktiviert
**Symptom:** `cscript` nicht gefunden oder deaktiviert

**Lösung:**
```cmd
# Windows Features prüfen:
dism /online /get-features | findstr "Script"

# Falls deaktiviert, aktivieren (als Administrator):
dism /online /enable-feature /featurename:MSRDC-Infrastructure /all
```

### 3. Erweiterte Diagnose

#### System-Information sammeln:
```powershell
# PowerShell als Administrator:
Get-ExecutionPolicy -List
[System.Environment]::OSVersion
[System.Environment]::Version
Get-WmiObject -Class Win32_OperatingSystem
```

#### .NET Framework prüfen:
```powershell
Get-ChildItem 'HKLM:SOFTWARE\Microsoft\NET Framework Setup\NDP' -Recurse |
Get-ItemProperty -Name Version -EA 0 |
Where { $_.PSChildName -match '^(?!S)\p{L}'} |
Select PSChildName, Version
```

## Verfügbare Tastatur-Methoden

### 1. VBScript (Priorität 1 - Zuverlässigste)
- Verwendet Windows Scripting Host
- Funktioniert auch bei restriktiven Sicherheitseinstellungen
- Erstellt temporäre .vbs Dateien

### 2. PowerShell SendKeys (Priorität 2)
- Verwendet System.Windows.Forms.SendKeys
- Verschiedene Execution Policy Bypasses
- Mehrere Fallback-Varianten

### 3. Clipboard + Paste (Priorität 3)
- Kopiert Text in Zwischenablage
- Sendet Ctrl+V
- Funktioniert bei langen Texten gut

### 4. Character-by-Character (Priorität 4)
- Sendet jeden Buchstaben einzeln
- Langsamer aber zuverlässiger
- Für problematische Sonderzeichen

## Manuelle Tests

### VBScript Test:
```vbscript
' test.vbs
Set objShell = CreateObject("WScript.Shell")
objShell.SendKeys "Test erfolgreich!"
```
Ausführen: `cscript //NoLogo test.vbs`

### PowerShell Test:
```powershell
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait("Test erfolgreich!")
```

## App-spezifische Einstellungen

### Debug-Modus aktivieren:
1. Electron DevTools öffnen (F12)
2. Console-Tab wählen
3. Logs beim QR-Code scannen beobachten

### Fallback-Reihenfolge:
1. robotjs (falls verfügbar)
2. Windows-Keyboard-System
   - VBScript
   - PowerShell (verschiedene Varianten)
   - Clipboard
   - Character-by-Character
3. Standard-Fallback

## Kontakt & Support

Falls alle Schritte nicht helfen:
1. Debug-Logs sammeln (F12 → Console)
2. System-Information bereitstellen
3. Test-Script-Ergebnisse dokumentieren

## Bekannte Einschränkungen

- UAC-geschützte Fenster (z.B. Administrator-Prompts)
- Vollbild-Spiele
- Gesicherte Desktop-Umgebungen
- Citrix/RDP-Umgebungen (eingeschränkt)
