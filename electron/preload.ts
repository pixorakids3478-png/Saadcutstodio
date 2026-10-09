import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openMediaFiles: () => ipcRenderer.invoke('dialog:open-files'),
  saveFileDialog: (defaultName: string, filters: any[]) =>
    ipcRenderer.invoke('dialog:save-file', defaultName, filters),
  openPath: (filePath: string) => ipcRenderer.invoke('system:open-path', filePath),
  runFFmpegNative: (args: string[]) => ipcRenderer.invoke('ffmpeg:run-native', args),
  onFFmpegProgress: (callback: (data: string) => void) => {
    ipcRenderer.on('ffmpeg:progress', (_event, value) => callback(value));
  },
});
