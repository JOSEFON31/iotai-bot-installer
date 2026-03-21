const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  checkPrerequisites: () => ipcRenderer.invoke('check-prerequisites'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  runInstall: (config) => ipcRenderer.invoke('run-install', config),
  openFolder: (path) => ipcRenderer.invoke('open-folder', path),
  startBot: (path) => ipcRenderer.invoke('start-bot', path),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  getHomeDir: () => ipcRenderer.invoke('get-home-dir'),
  onInstallProgress: (callback) => {
    ipcRenderer.on('install-progress', (event, data) => callback(data));
  }
});
