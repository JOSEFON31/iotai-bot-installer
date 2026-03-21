const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { checkPrerequisites } = require('./installer/prerequisites');
const { installNode } = require('./installer/node-installer');
const { runInstallSteps } = require('./installer/steps');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 860,
    height: 620,
    minWidth: 700,
    minHeight: 520,
    backgroundColor: '#0a0a1a',
    titleBarStyle: 'hiddenInset',
    frame: process.platform === 'darwin' ? false : true,
    icon: path.join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

// ── IPC Handlers ──

ipcMain.handle('check-prerequisites', async () => {
  return await checkPrerequisites();
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Installation Directory'
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('run-install', async (event, config) => {
  return await runInstallSteps(config, (step, status, message) => {
    mainWindow.webContents.send('install-progress', { step, status, message });
  });
});

ipcMain.handle('open-folder', async (event, folderPath) => {
  shell.openPath(folderPath);
});

ipcMain.handle('start-bot', async (event, installPath) => {
  const { exec } = require('child_process');
  const cmd = process.platform === 'win32'
    ? `start cmd /k "cd /d ${installPath} && npx openclaw agent"`
    : `cd ${installPath} && npx openclaw agent &`;
  exec(cmd);
  return true;
});

ipcMain.handle('get-platform', () => process.platform);

ipcMain.handle('get-home-dir', () => require('os').homedir());
