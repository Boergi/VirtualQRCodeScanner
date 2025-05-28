// main.js
// Electron Main Process
const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, session } = require('electron');
const path = require('path');
const KeyboardFallback = require('./keyboard-fallback');

let robot;
let keyboardFallback = new KeyboardFallback();

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
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
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

app.whenReady().then(() => {
  // Medien-Berechtigungen setzen
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true); // Erlaube Kamera/Mikrofon Zugriff
    } else {
      callback(false);
    }
  });

  createWindow();
  // Tray icon
  tray = new Tray(nativeImage.createEmpty()); // Replace with your icon
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show', click: () => mainWindow.show() },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setToolTip('Virtual QRCode Scanner');
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
    console.log('Code empfangen:', code);
    console.log('robotjs verfügbar:', !!robot);
    
    // Kurz warten, damit der Benutzer Zeit hat, das richtige Fenster zu fokussieren
    await new Promise(resolve => setTimeout(resolve, 200));
    
    let success = false;
    let method = '';
    
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
        console.log('Code mit robotjs gesendet');
      } catch (robotError) {
        console.error('robotjs Fehler:', robotError.message);
        robot = null; // Deaktiviere robotjs für zukünftige Versuche
      }
    }
    
    // Falls robotjs nicht funktioniert, verwende Fallback
    if (!success) {
      try {
        console.log('Versuche Fallback-System...');
        await keyboardFallback.typeString(code);
        
        // Zusätzliche Tasten basierend auf Einstellungen
        if (settings.sendEnter) {
          await keyboardFallback.keyTap('enter');
        }
        if (settings.sendTab) {
          await keyboardFallback.keyTap('tab');
        }
        
        success = true;
        method = 'fallback (AppleScript)';
        console.log('Code mit Fallback-System gesendet');
      } catch (fallbackError) {
        console.error('Fallback Fehler:', fallbackError.message);
        return { 
          error: `Tastatur-Eingabe fehlgeschlagen. Robotjs: ${robot ? 'verfügbar aber fehlerhaft' : 'nicht verfügbar'}. Fallback: ${fallbackError.message}. Bitte Accessibility-Berechtigung in Systemeinstellungen prüfen.` 
        };
      }
    }
    
    return { success: true, message: `Code gesendet via ${method}` };
    
  } catch (error) {
    console.error('Unerwarteter Fehler:', error);
    return { error: error.message };
  }
});

// IPC: Get/Set settings
ipcMain.handle('get-settings', () => settings);
ipcMain.handle('set-settings', (event, newSettings) => {
  settings = { ...settings, ...newSettings };
});
