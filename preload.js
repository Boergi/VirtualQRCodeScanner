// preload.js
// Secure IPC bridge
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  codeScanned: (code) => ipcRenderer.invoke('code-scanned', code),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (settings) => ipcRenderer.invoke('set-settings', settings)
});
