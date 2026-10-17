const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    title: '弈牌AI',
    icon: path.join(__dirname, '../assets/images/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // 开发模式加载 vite dev server，生产模式加载本地文件
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// ---------- 备份/还原 IPC ----------
ipcMain.handle('choose-backup-dir', async () => {
  const result = await dialog.showOpenDialog({
    title: '选择备份文件夹',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('export-backup', async (_event, dirPath, content) => {
  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `landlord-ai-backup-${stamp}.json`;
  const fullPath = path.join(dirPath, fileName);
  fs.writeFileSync(fullPath, content, 'utf-8');
  return fullPath;
});

ipcMain.handle('import-backup', async () => {
  const result = await dialog.showOpenDialog({
    title: '选择备份文件',
    filters: [{ name: 'JSON 备份', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return fs.readFileSync(result.filePaths[0], 'utf-8');
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
