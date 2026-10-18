const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    frame: false,            // 无边框：使用软件自定义标题栏（适配自身 UI）
    show: false,             // 先隐藏，内容（含启动界面）就绪后再显示，杜绝原生黑框/空白闪烁
    title: '弈牌AI',
    backgroundColor: '#0f1115',
    icon: path.join(__dirname, '../assets/images/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // 内容就绪后再显示窗口（index.html 自带启动界面，加载期间不会露出黑框）
  mainWindow.once('ready-to-show', () => {
    if (!mainWindow.isDestroyed()) mainWindow.show();
  });
  // 兜底：若 3 秒内仍未触发 ready-to-show（如加载异常），强制显示，避免窗口卡死不可见
  setTimeout(() => {
    if (!mainWindow.isDestroyed() && !mainWindow.isVisible()) mainWindow.show();
  }, 3000);

  // 开发模式加载 vite dev server，生产模式加载本地文件
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
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

// ---------- HTTP 桥：在主进程发起请求，规避渲染进程 CORS ----------
// 渲染进程（含 Electron 与浏览器）直接 fetch 外部 LLM API 会被 CORS 拦截，
// 因此所有外部请求统一走主进程 Node fetch，再由 IPC 返回结果。
ipcMain.handle('http-request', async (_event, opts) => {
  const { method = 'GET', url, headers = {}, body, timeout = 15000 } = opts || {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* 非 JSON 响应（如 HTML 错误页） */ }
    return { ok: res.ok, status: res.status, statusText: res.statusText, text, data };
  } catch (err) {
    const e = new Error(err && err.message ? err.message : 'network error');
    if (err && err.name === 'AbortError') e.name = 'AbortError';
    e.message = '请求超时或网络不可达：' + e.message;
    throw e;
  } finally {
    clearTimeout(timer);
  }
});

// ---------- 窗口控制（无边框标题栏） ----------
ipcMain.on('window-minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('window-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window-close', () => { if (mainWindow) mainWindow.close(); });
ipcMain.handle('window-is-maximized', () => mainWindow ? mainWindow.isMaximized() : false);

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
