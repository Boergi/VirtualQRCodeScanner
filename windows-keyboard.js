// windows-keyboard.js
// Enhanced Windows keyboard implementation with multiple approaches

const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');

const execAsync = promisify(exec);

class WindowsKeyboard {
  constructor() {
    this.tempDir = os.tmpdir();
    this.availableMethods = null;
    this.initMethods();
  }

  async initMethods() {
    console.log('🔍 Windows-Keyboard: Teste verfügbare Methoden...');
    this.availableMethods = await this.testMethods();
    console.log('✅ Verfügbare Methoden:', this.availableMethods);
  }

  async testMethods() {
    const methods = [];
    
    // Test VBScript
    try {
      await execAsync('cscript /?', { timeout: 2000 });
      methods.push('vbscript');
      console.log('✅ VBScript verfügbar');
    } catch (e) {
      console.log('❌ VBScript nicht verfügbar');
    }
    
    // Test PowerShell
    try {
      await execAsync('powershell -Command "1+1"', { timeout: 2000 });
      methods.push('powershell');
      console.log('✅ PowerShell verfügbar');
    } catch (e) {
      console.log('❌ PowerShell nicht verfügbar');
    }
    
    // Test Node.js native Win32 API (falls verfügbar)
    try {
      const { createRequire } = require('module');
      const win32 = createRequire(import.meta.url || __filename)('node-win32-api');
      methods.push('native');
      console.log('✅ Native Win32 API verfügbar');
    } catch (e) {
      console.log('❌ Native Win32 API nicht verfügbar');
    }
    
    return methods;
  }

  // Enhanced text escaping for different methods
  escapeText(text, method = 'powershell') {
    switch (method) {
      case 'vbscript':
        return text.replace(/"/g, '""');
      case 'powershell':
        return text
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '""')
          .replace(/'/g, "''")
          .replace(/\{/g, '{{}')
          .replace(/\}/g, '{}}')
          .replace(/\+/g, '{+}')
          .replace(/\^/g, '{^}')
          .replace(/~/g, '{~}')
          .replace(/\(/g, '{(}')
          .replace(/\)/g, '{)}')
          .replace(/\[/g, '{[}')
          .replace(/\]/g, '{]}');
      default:
        return text;
    }
  }

  // Method 1: VBScript (most reliable on Windows)
  async typeStringVBScript(text) {
    const escapedText = this.escapeText(text, 'vbscript');
    
    const vbsScript = `Set objShell = CreateObject("WScript.Shell")
objShell.SendKeys "${escapedText}"`;
    
    const tempFile = path.join(this.tempDir, `sendkeys_${Date.now()}.vbs`);
    fs.writeFileSync(tempFile, vbsScript, 'utf8');
    
    try {
      await execAsync(`cscript //NoLogo "${tempFile}"`, { timeout: 5000 });
      console.log('✅ VBScript sendKeys erfolgreich');
    } finally {
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }

  // Method 2: Enhanced PowerShell with execution policy bypass
  async typeStringPowerShell(text) {
    const escapedText = this.escapeText(text, 'powershell');
    
    // Multiple PowerShell approaches
    const commands = [
      // Bypass execution policy
      `powershell -ExecutionPolicy Bypass -WindowStyle Hidden -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escapedText}')"`,
      
      // Unrestricted execution policy  
      `powershell -ExecutionPolicy Unrestricted -WindowStyle Hidden -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escapedText}')"`,
      
      // Direct command without execution policy
      `powershell -WindowStyle Hidden -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escapedText}')"`,
      
      // Using -NoProfile to avoid profile restrictions
      `powershell -NoProfile -WindowStyle Hidden -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escapedText}')"`
    ];
    
    let lastError = null;
    
    for (const command of commands) {
      try {
        console.log('PowerShell Versuch:', command.substring(0, 100) + '...');
        await execAsync(command, { timeout: 5000 });
        console.log('✅ PowerShell sendKeys erfolgreich');
        return;
      } catch (error) {
        lastError = error;
        console.warn('PowerShell Versuch fehlgeschlagen:', error.message);
      }
    }
    
    throw lastError;
  }

  // Method 3: Direct character-by-character input using Windows API simulation
  async typeStringDirect(text) {
    // Simulate typing character by character with minimal delays
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const vbsScript = `Set objShell = CreateObject("WScript.Shell")
objShell.SendKeys "${this.escapeText(char, 'vbscript')}"`;
      
      const tempFile = path.join(this.tempDir, `sendkey_${Date.now()}_${i}.vbs`);
      fs.writeFileSync(tempFile, vbsScript, 'utf8');
      
      try {
        await execAsync(`cscript //NoLogo "${tempFile}"`, { timeout: 2000 });
        // Small delay between characters for better reliability
        await new Promise(resolve => setTimeout(resolve, 10));
      } finally {
        if (fs.existsSync(tempFile)) {
          try {
            fs.unlinkSync(tempFile);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      }
    }
    console.log('✅ Direct character input erfolgreich');
  }

  // Method 4: Clipboard + Paste approach
  async typeStringClipboard(text) {
    // Copy to clipboard and paste using Ctrl+V
    const vbsScript = `Set objShell = CreateObject("WScript.Shell")
Set objHTML = CreateObject("htmlfile")
objHTML.ParentWindow.ClipboardData.SetData "text", "${this.escapeText(text, 'vbscript')}"
objShell.SendKeys "^v"`;
    
    const tempFile = path.join(this.tempDir, `clipboard_${Date.now()}.vbs`);
    fs.writeFileSync(tempFile, vbsScript, 'utf8');
    
    try {
      await execAsync(`cscript //NoLogo "${tempFile}"`, { timeout: 5000 });
      console.log('✅ Clipboard paste erfolgreich');
    } finally {
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }

  // Main typing method with intelligent fallback selection
  async typeString(text) {
    if (!text || text.length === 0) {
      throw new Error('Kein Text zum Senden');
    }

    console.log(`Windows-Keyboard: Sende Text "${text}" (Länge: ${text.length})`);
    
    // Ensure methods are tested
    if (!this.availableMethods) {
      await this.initMethods();
    }
    
    // Select methods based on availability and text characteristics
    const methods = [];
    
    if (this.availableMethods.includes('vbscript')) {
      if (text.length < 100) {
        methods.push({ name: 'VBScript Direct', fn: () => this.typeStringVBScript(text) });
      }
      methods.push({ name: 'VBScript Character-by-Character', fn: () => this.typeStringDirect(text) });
      methods.push({ name: 'VBScript Clipboard', fn: () => this.typeStringClipboard(text) });
    }
    
    if (this.availableMethods.includes('powershell')) {
      methods.push({ name: 'PowerShell Enhanced', fn: () => this.typeStringPowerShell(text) });
    }

    if (methods.length === 0) {
      throw new Error('Keine verfügbaren Windows-Tastatur-Methoden gefunden');
    }

    let lastError = null;
    
    for (let i = 0; i < methods.length; i++) {
      const method = methods[i];
      try {
        console.log(`Versuche ${method.name}...`);
        await method.fn();
        console.log(`✅ ${method.name} erfolgreich`);
        return true;
      } catch (error) {
        lastError = error;
        console.warn(`❌ ${method.name} fehlgeschlagen:`, error.message);
        
        // Bei erstem Fehler kurz warten
        if (i < methods.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }
    
    throw new Error(`Alle Windows-Tastatur-Methoden fehlgeschlagen. Letzte Fehlermeldung: ${lastError.message}`);
  }

  // Enhanced key tap with multiple methods
  async keyTap(key) {
    const keyMap = {
      'enter': '{ENTER}',
      'return': '{ENTER}',
      'tab': '{TAB}',
      'space': ' ',
      'escape': '{ESC}',
      'esc': '{ESC}',
      'backspace': '{BACKSPACE}',
      'delete': '{DELETE}'
    };

    const keyCode = keyMap[key.toLowerCase()] || key;
    
    // Ensure methods are tested
    if (!this.availableMethods) {
      await this.initMethods();
    }
    
    // Try VBScript first, then PowerShell
    if (this.availableMethods.includes('vbscript')) {
      try {
        const vbsScript = `Set objShell = CreateObject("WScript.Shell")
objShell.SendKeys "${keyCode}"`;
        
        const tempFile = path.join(this.tempDir, `key_${Date.now()}.vbs`);
        fs.writeFileSync(tempFile, vbsScript, 'utf8');
        
        await execAsync(`cscript //NoLogo "${tempFile}"`, { timeout: 3000 });
        
        if (fs.existsSync(tempFile)) {
          try {
            fs.unlinkSync(tempFile);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
        
        console.log(`✅ Taste '${key}' mit VBScript gesendet`);
        return true;
      } catch (error) {
        console.warn(`❌ VBScript Taste '${key}' fehlgeschlagen:`, error.message);
      }
    }
    
    // Fallback to PowerShell
    if (this.availableMethods.includes('powershell')) {
      try {
        const command = `powershell -ExecutionPolicy Bypass -WindowStyle Hidden -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${keyCode}')"`;
        await execAsync(command, { timeout: 3000 });
        console.log(`✅ Taste '${key}' mit PowerShell gesendet`);
        return true;
      } catch (error) {
        console.error(`❌ PowerShell Taste '${key}' fehlgeschlagen:`, error.message);
        throw error;
      }
    }
    
    throw new Error(`Keine verfügbaren Methoden für Taste '${key}'`);
  }
}

module.exports = WindowsKeyboard;
