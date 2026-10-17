const { contextBridge, ipcRenderer } = require('electron');

// 通过 contextBridge 暴露给渲染进程的安全 API
contextBridge.exposeInMainWorld('electronAPI', {
  /** 选择备份文件夹，返回目录路径或 null */
  chooseBackupDir: () => ipcRenderer.invoke('choose-backup-dir'),
  /** 把备份内容写入指定目录，返回保存后的完整文件路径 */
  exportBackup: (dirPath, content) => ipcRenderer.invoke('export-backup', dirPath, content),
  /** 弹出文件选择框读取备份文件，返回文件文本内容或 null */
  importBackup: () => ipcRenderer.invoke('import-backup'),
  /** 是否运行在 Electron 桌面环境 */
  isDesktop: true,

  /** 在主进程发起 HTTP 请求（绕过渲染进程 CORS 限制）。
   *  options: { method, url, headers, body, timeout } */
  http: (options) => ipcRenderer.invoke('http-request', options),

  /** 窗口控制（无边框窗口下使用自定义标题栏） */
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
});
