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
});
