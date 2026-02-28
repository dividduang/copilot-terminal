import { contextBridge, ipcRenderer } from 'electron';

// 暴露受控的 IPC API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
});
