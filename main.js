// main.js
// Electron Main Process
const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, session, systemPreferences } = require('electron');
const path = require('path');
const KeyboardFallback = require('./keyboard-fallback');

let robot;
let keyboardFallback = new KeyboardFallback();
let windowsKeyboard = null;

// Windows-spezifisches Keyboard-System laden
if (process.platform === 'win32') {
  try {
    const WindowsKeyboard = require('./windows-keyboard');
    windowsKeyboard = new WindowsKeyboard();
    console.log('Windows-Keyboard-System geladen');
  } catch (e) {
    console.warn('Windows-Keyboard-System konnte nicht geladen werden:', e.message);
  }
}

try {
  robot = require('robotjs');
  console.log('robotjs erfolgreich geladen');
  console.log('Screen size:', robot.getScreenSize());
} catch (e) {
  console.error('robotjs konnte nicht geladen werden:', e.message);
  console.log('Verwende Fallback-Tastatur-System');
  robot = null;
}

let mainWindow;
let tray = null;
let settings = { sendEnter: true, sendTab: false };

function createWindow() {
  // Icon-Pfad definieren (passend für das Betriebssystem)
  let iconPath;
  if (process.platform === 'win32') {
    iconPath = path.join(__dirname, 'icons', 'icon.ico'); // Windows ICO
  } else if (process.platform === 'darwin') {
    iconPath = path.join(__dirname, 'icons', 'icon.icns'); // macOS ICNS
  } else {
    iconPath = path.join(__dirname, 'icons', 'icon-256x256.png'); // Linux PNG
  }

  mainWindow = new BrowserWindow({
    width: 400,
    height: 700,
    icon: iconPath, // App-Icon hinzufügen
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      allowRunningInsecureContent: true
    }
  });
  mainWindow.loadFile('index.html');
  mainWindow.on('minimize', function (event) {
    event.preventDefault();
    mainWindow.hide();
  });
}

app.whenReady().then(async () => {
  // Explizite macOS Kamera-Berechtigung anfordern
  if (process.platform === 'darwin') {
    try {
      // Anfrage an macOS System für Kamera-Zugriff
      const { systemPreferences } = require('electron');
      
      // Prüfe, ob Berechtigung bereits erteilt wurde
      const cameraStatus = systemPreferences.getMediaAccessStatus('camera');
      console.log('Aktueller Kamera-Status:', cameraStatus);
      
      if (cameraStatus === 'not-determined') {
        console.log('Frage Kamera-Berechtigung an...');
        const granted = await systemPreferences.askForMediaAccess('camera');
        console.log('Kamera-Berechtigung erteilt:', granted);
        
        if (!granted) {
          console.warn('Kamera-Berechtigung verweigert. App funktioniert möglicherweise nicht korrekt.');
        }
      } else if (cameraStatus === 'denied') {
        console.warn('Kamera-Berechtigung wurde verweigert. Benutzer muss diese in Systemeinstellungen aktivieren.');
      } else if (cameraStatus === 'granted') {
        console.log('Kamera-Berechtigung bereits erteilt.');
      }
    } catch (error) {
      console.error('Fehler beim Anfordern der Kamera-Berechtigung:', error);
    }
  }

  // Medien-Berechtigungen für Electron Webview handhaben
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log('Electron Berechtigung angefragt:', permission);
    if (permission === 'media' || permission === 'camera') {
      // Für Media-Permissions immer erlauben (System-Level wird separat gehandhabt)
      callback(true);
    } else {
      callback(false);
    }
  });

  // Permission Check Handler für bereits erteilte Berechtigungen
  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    console.log('Electron Berechtigung geprüft:', permission, details);
    if (permission === 'media' || permission === 'camera') {
      return true;
    }
    return false;
  });

  createWindow();
  
  // Tray icon mit korrektem App-Icon
  let trayIconPath;
  if (process.platform === 'darwin') {
    trayIconPath = path.join(__dirname, 'icons', 'icon-32x32.png'); // macOS Tray bevorzugt kleinere Icons
  } else {
    trayIconPath = path.join(__dirname, 'icons', 'icon-32x32.png'); // Windows/Linux
  }
  
  tray = new Tray(trayIconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'QR Scanner anzeigen', click: () => mainWindow.show() },
    { label: 'Beenden', click: () => app.quit() }
  ]);
  tray.setToolTip('QR Scanner Pro - Virtueller QR-Code Scanner');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => mainWindow.show());
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC: Receive scanned code from renderer
ipcMain.handle('code-scanned', async (event, code) => {
  try {
    console.log('=== CODE SCANNED DEBUG ===');
    console.log('Code empfangen:', code);
    console.log('Platform:', process.platform);
    console.log('robotjs verfügbar:', !!robot);
    console.log('windowsKeyboard verfügbar:', !!windowsKeyboard);
    console.log('keyboardFallback verfügbar:', !!keyboardFallback);
    
    // Kurz warten, damit der Benutzer Zeit hat, das richtige Fenster zu fokussieren
    console.log('Warte 1 Sekunde für Fenster-Focus...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let success = false;
    let method = '';
    let errorDetails = [];
    
    // Versuche zuerst robotjs
    if (robot) {
      try {
        console.log('Versuche robotjs...');
        robot.typeString(code);
        
        // Zusätzliche Tasten basierend auf Einstellungen
        if (settings.sendEnter) {
          robot.keyTap('enter');
        }
        if (settings.sendTab) {
          robot.keyTap('tab');
        }
        
        success = true;
        method = 'robotjs';
        console.log('✅ Code mit robotjs gesendet');
      } catch (robotError) {
        console.error('❌ robotjs Fehler:', robotError.message);
        errorDetails.push(`robotjs: ${robotError.message}`);
        robot = null; // Deaktiviere robotjs für zukünftige Versuche
      }
    } else {
      console.log('robotjs nicht verfügbar oder bereits deaktiviert');
      errorDetails.push('robotjs: nicht verfügbar');
    }
    
    // Falls robotjs nicht funktioniert, verwende plattformspezifisches Fallback
    if (!success) {
      try {
        console.log('Versuche Fallback-System...');
        
        if (process.platform === 'win32' && windowsKeyboard) {
          // Windows-spezifisches System verwenden
          console.log('🖥️  Verwende Windows-Keyboard-System...');
          console.log('📝 Text zu senden:', JSON.stringify(code));
          console.log('⚙️  Einstellungen:', { sendEnter: settings.sendEnter, sendTab: settings.sendTab });
          
          // Teste verfügbare Methoden falls noch nicht geschehen
          if (!windowsKeyboard.availableMethods) {
            console.log('🔍 Initialisiere Windows-Keyboard-Methoden...');
            await windowsKeyboard.initMethods();
          }
          
          await windowsKeyboard.typeString(code);
          console.log('✅ Text erfolgreich gesendet, sende zusätzliche Tasten...');
          
          // Zusätzliche Tasten basierend auf Einstellungen
          if (settings.sendEnter) {
            console.log('📤 Sende Enter...');
            await windowsKeyboard.keyTap('enter');
            console.log('✅ Enter gesendet');
          }
          if (settings.sendTab) {
            console.log('📤 Sende Tab...');
            await windowsKeyboard.keyTap('tab');
            console.log('✅ Tab gesendet');
          }
          
          success = true;
          method = 'Windows-Keyboard-System (Enhanced)';
          console.log('🎉 Code mit Windows-Keyboard-System vollständig gesendet');
        } else {
          // Fallback für andere Plattformen (macOS, Linux)
          console.log('Verwende Standard-Fallback-System...');
          await keyboardFallback.typeString(code);
          
          // Zusätzliche Tasten basierend auf Einstellungen
          if (settings.sendEnter) {
            await keyboardFallback.keyTap('enter');
          }
          if (settings.sendTab) {
            await keyboardFallback.keyTap('tab');
          }
          
          success = true;
          method = 'Fallback-System (AppleScript/Linux)';
          console.log('✅ Code mit Standard-Fallback-System gesendet');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback Fehler:', fallbackError.message);
        console.error('❌ Fallback Stack:', fallbackError.stack);
        errorDetails.push(`Fallback: ${fallbackError.message}`);
        
        // Erweiterte Windows-spezifische Hilfe
        let platformSpecificHelp = '';
        if (process.platform === 'win32') {
          platformSpecificHelp = `
🔧 Windows-Troubleshooting-Schritte:
1. App als Administrator ausführen
2. PowerShell Execution Policy prüfen: Get-ExecutionPolicy
3. Windows Defender/Antivirus-Software temporär deaktivieren
4. Test-Scripts ausführen: node test-windows-keyboard.js
5. VBScript-Support prüfen: cscript /?
6. .NET Framework Version prüfen
7. Windows-Sicherheitsrichtlinien für SendKeys prüfen

💡 Mögliche Ursachen:
- Restrictive Execution Policy (PowerShell)
- Antivirus-Software blockiert Tastatur-Simulation
- Windows-Sicherheitsrichtlinien verhindern SendKeys
- UAC (User Account Control) Einschränkungen
- Fehlende .NET Framework Komponenten
          `.trim();
        } else {
          platformSpecificHelp = 'Bitte Accessibility-Berechtigung in Systemeinstellungen prüfen.';
        }
        
        return { 
          error: `Tastatur-Eingabe fehlgeschlagen. Details: ${errorDetails.join(', ')}. ${platformSpecificHelp}`,
          errorDetails: errorDetails,
          platform: process.platform,
          troubleshooting: platformSpecificHelp
        };
      }
    }
    
    console.log('🎉 === ERFOLG ===');
    console.log(`📋 Code "${code}" erfolgreich gesendet`);
    console.log(`🔧 Methode: ${method}`);
    console.log(`⚙️  Zusätzliche Tasten: Enter=${settings.sendEnter}, Tab=${settings.sendTab}`);
    
    return { 
      success: true, 
      message: `Code "${code}" gesendet via ${method}`,
      method: method,
      code: code,
      timestamp: new Date().toISOString(),
      platform: process.platform
    };
    
  } catch (error) {
    console.error('❌ Unerwarteter Fehler:', error);
    console.error('❌ Stack:', error.stack);
    return { 
      error: error.message,
      stack: error.stack,
      platform: process.platform
    };
  }
});

// IPC: Get/Set settings
ipcMain.handle('get-settings', () => settings);
ipcMain.handle('set-settings', (event, newSettings) => {
  settings = { ...settings, ...newSettings };
});

// IPC: Check camera permission status (macOS only)
ipcMain.handle('check-camera-permission', async () => {
  if (process.platform === 'darwin') {
    try {
      const status = systemPreferences.getMediaAccessStatus('camera');
      return { status, platform: 'darwin' };
    } catch (error) {
      console.error('Fehler beim Prüfen der Kamera-Berechtigung:', error);
      return { status: 'unknown', platform: 'darwin', error: error.message };
    }
  }
  return { status: 'not-applicable', platform: process.platform };
});

// IPC: Request camera permission (macOS only)
ipcMain.handle('request-camera-permission', async () => {
  if (process.platform === 'darwin') {
    try {
      const granted = await systemPreferences.askForMediaAccess('camera');
      return { granted, platform: 'darwin' };
    } catch (error) {
      console.error('Fehler beim Anfordern der Kamera-Berechtigung:', error);
      return { granted: false, platform: 'darwin', error: error.message };
    }
  }
  return { granted: true, platform: process.platform }; // Auf anderen Plattformen annehmen, dass es funktioniert
});
