const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron,
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printDirect: (options) => ipcRenderer.invoke('print-direct', options),
  kickCashDrawer: (printer) => ipcRenderer.invoke('kick-cash-drawer', printer),
  closeApp: () => ipcRenderer.invoke('close-app'),
});
