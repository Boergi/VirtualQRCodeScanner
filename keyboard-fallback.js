// keyboard-fallback.js
// Alternative Tastatur-Eingabe für macOS wenn robotjs nicht funktioniert

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class KeyboardFallback {
  constructor() {
    this.isWindows = process.platform === 'win32';
    this.isMacOS = process.platform === 'darwin';
  }

  async typeString(text) {
    if (this.isMacOS) {
      return await this.typeStringMacOS(text);
    } else if (this.isWindows) {
      return await this.typeStringWindows(text);
    } else {
      throw new Error('Unsupported platform');
    }
  }

  async typeStringMacOS(text) {
    // Escape special characters for AppleScript
    const escapedText = text.replace(/"/g, '\\"').replace(/\\/g, '\\\\');
    
    const appleScript = `
      tell application "System Events"
        keystroke "${escapedText}"
      end tell
    `;
    
    try {
      await execAsync(`osascript -e '${appleScript}'`);
      return true;
    } catch (error) {
      console.error('AppleScript Fehler:', error.message);
      throw error;
    }
  }

  async typeStringWindows(text) {
    // PowerShell implementation for Windows
    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait("${text}")
    `;
    
    try {
      await execAsync(`powershell -Command "${psScript}"`);
      return true;
    } catch (error) {
      console.error('PowerShell Fehler:', error.message);
      throw error;
    }
  }

  async keyTap(key) {
    if (this.isMacOS) {
      return await this.keyTapMacOS(key);
    } else if (this.isWindows) {
      return await this.keyTapWindows(key);
    } else {
      throw new Error('Unsupported platform');
    }
  }

  async keyTapMacOS(key) {
    let appleScriptKey;
    switch (key.toLowerCase()) {
      case 'enter':
      case 'return':
        appleScriptKey = 'return';
        break;
      case 'tab':
        appleScriptKey = 'tab';
        break;
      case 'space':
        appleScriptKey = 'space';
        break;
      default:
        appleScriptKey = key;
    }

    const appleScript = `
      tell application "System Events"
        key code (ASCII number of "${appleScriptKey}")
      end tell
    `;

    // Für bekannte Tasten verwenden wir spezielle Codes
    let script;
    if (key.toLowerCase() === 'enter' || key.toLowerCase() === 'return') {
      script = `tell application "System Events" to keystroke return`;
    } else if (key.toLowerCase() === 'tab') {
      script = `tell application "System Events" to keystroke tab`;
    } else {
      script = `tell application "System Events" to keystroke "${key}"`;
    }

    try {
      await execAsync(`osascript -e '${script}'`);
      return true;
    } catch (error) {
      console.error('AppleScript keyTap Fehler:', error.message);
      throw error;
    }
  }

  async keyTapWindows(key) {
    let psKey;
    switch (key.toLowerCase()) {
      case 'enter':
      case 'return':
        psKey = '{ENTER}';
        break;
      case 'tab':
        psKey = '{TAB}';
        break;
      case 'space':
        psKey = ' ';
        break;
      default:
        psKey = `{${key.toUpperCase()}}`;
    }

    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms
      [System.Windows.Forms.SendKeys]::SendWait("${psKey}")
    `;

    try {
      await execAsync(`powershell -Command "${psScript}"`);
      return true;
    } catch (error) {
      console.error('PowerShell keyTap Fehler:', error.message);
      throw error;
    }
  }
}

module.exports = KeyboardFallback;
