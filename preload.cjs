const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron,
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printDirect: (options) => ipcRenderer.invoke('print-direct', options),
  closeApp: () => ipcRenderer.invoke('close-app'),
});
