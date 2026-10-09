import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'SaadCut Studio',
    backgroundColor: '#0d0e12',
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  const devUrl = 'http://localhost:3000';
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handler: Open local media files (Windows native file dialog)
ipcMain.handle('dialog:open-files', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Media to SaadCut Studio',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Supported Media', extensions: ['mp4', 'mov', 'webm', 'mkv', 'avi', 'mp3', 'wav', 'aac', 'png', 'jpg', 'jpeg', 'webp'] },
      { name: 'Video Files', extensions: ['mp4', 'mov', 'webm', 'mkv', 'avi'] },
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'aac', 'ogg', 'flac'] },
      { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths.map((filePath) => {
    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const isAudio = ['.mp3', '.wav', '.aac', '.ogg', '.flac'].includes(ext);
    const isImage = ['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext);

    return {
      path: filePath,
      name: path.basename(filePath),
      size: stats.size,
      type: isAudio ? 'audio' : isImage ? 'image' : 'video',
    };
  });
});

// IPC Handler: Choose destination for Project Save or Video Export
ipcMain.handle('dialog:save-file', async (_event, defaultName: string, filters: any[]) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Choose Save Destination',
    defaultPath: defaultName,
    filters: filters || [{ name: 'MP4 Video', extensions: ['mp4'] }],
  });
  return result.canceled ? null : result.filePath;
});

// IPC Handler: Open folder in Windows File Explorer
ipcMain.handle('system:open-path', async (_event, folderOrFilePath: string) => {
  if (fs.existsSync(folderOrFilePath)) {
    shell.showItemInFolder(folderOrFilePath);
    return true;
  }
  return false;
});

// IPC Handler: Direct Native FFmpeg Execution
ipcMain.handle('ffmpeg:run-native', async (event, args: string[]) => {
  return new Promise((resolve) => {
    // Detect binary: packaged bin or system ffmpeg
    const bundledPath = path.join(process.resourcesPath || app.getAppPath(), 'bin', 'ffmpeg.exe');
    const ffmpegBin = fs.existsSync(bundledPath) ? bundledPath : 'ffmpeg';

    try {
      const child = spawn(ffmpegBin, args);

      child.stderr.on('data', (data) => {
        const text = data.toString();
        event.sender.send('ffmpeg:progress', text);
      });

      child.on('close', (code) => {
        resolve({ success: code === 0, code });
      });

      child.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    } catch (err: any) {
      resolve({ success: false, error: err.message });
    }
  });
});
