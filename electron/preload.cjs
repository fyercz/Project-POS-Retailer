/**
 * Preload script exposing POS Desktop APIs to the frontend
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,

  // Hardware POS Printers
  getPrinters: () => ipcRenderer.invoke('pos:get-printers'),
  printSilent: (options) => ipcRenderer.invoke('pos:print-silent', options),
  openCashDrawer: () => ipcRenderer.invoke('pos:kick-cash-drawer'),

  // Window Controls
  toggleFullscreen: () => ipcRenderer.invoke('pos:toggle-fullscreen'),
  toggleKiosk: () => ipcRenderer.invoke('pos:toggle-kiosk'),
  minimize: () => ipcRenderer.invoke('pos:minimize'),
  maximize: () => ipcRenderer.invoke('pos:maximize'),
  close: () => ipcRenderer.invoke('pos:close'),
});
